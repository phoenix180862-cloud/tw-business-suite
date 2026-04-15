        function RechnungsAusgangsbuch({ kunde, onBack }) {
            var AB_KEY = 'tw_ausgangsbuch';
            var SETTINGS_KEY = 'tw_ausgangsbuch_settings';

            var [eintraege, setEintraege] = useState([]);
            var [showSettings, setShowSettings] = useState(false);
            var [showAnalyse, setShowAnalyse] = useState(false);
            var [editId, setEditId] = useState(null);
            var [editData, setEditData] = useState({});
            var [filterStatus, setFilterStatus] = useState('alle');
            var [filterMonat, setFilterMonat] = useState('alle');
            var [suchText, setSuchText] = useState('');
            var [sortField, setSortField] = useState('datum');
            var [sortDir, setSortDir] = useState('desc');
            var [showDruckansicht, setShowDruckansicht] = useState(false);
            var [settings, setSettings] = useState({
                standardMwst: 19,
                standardZahlungsziel: 30,
                standardSkonto: 2,
                standardSkontoTage: 10,
                alarmTageVorher: 3,
                firmenname: 'Thomas Willwacher Fliesenlegermeister e.K.',
                steuernummer: '',
                ustIdNr: '',
                basiszinssatz: 1.27,
                basiszinssatzStand: '2026-01-01'
            });

            // ══ Basiszinssatz-Tabelle (halbjaehrlich aktualisiert) ══
            var BASISZINS = [
                { ab: '2026-01-01', satz: 1.27 },
                { ab: '2025-07-01', satz: 2.27 },
                { ab: '2025-01-01', satz: 2.27 },
                { ab: '2024-07-01', satz: 3.37 },
                { ab: '2024-01-01', satz: 3.62 }
            ];
            var getBasiszins = function(datum) {
                var d = datum || new Date().toISOString().split('T')[0];
                for (var i = 0; i < BASISZINS.length; i++) { if (d >= BASISZINS[i].ab) return BASISZINS[i].satz; }
                return 1.27;
            };

            // ══ Laden ══
            useEffect(function() {
                try {
                    var data = JSON.parse(localStorage.getItem(AB_KEY) || '[]');
                    setEintraege(data);
                    var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
                    if (s) setSettings(function(prev) { return Object.assign({}, prev, s); });
                } catch(e) {}
            }, []);

            // ══ Speichern ══
            var saveEintraege = function(newData) {
                setEintraege(newData);
                localStorage.setItem(AB_KEY, JSON.stringify(newData));
            };
            var saveSettings = function(newS) {
                setSettings(newS);
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(newS));
            };

            // ══ Formatierung ══
            var fmt = function(v) { return (parseFloat(v) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
            var fmtDatum = function(d) {
                if (!d) return '--';
                var p = d.split('-');
                return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d;
            };
            var today = new Date().toISOString().split('T')[0];

            // ══ Status-Definitionen ══
            var STATUS = {
                offen:        { label: 'Offen',         farbe: '#f39c12', bg: 'rgba(243,156,18,0.12)' },
                teilbezahlt:  { label: 'Teilbezahlt',   farbe: '#e67e22', bg: 'rgba(230,126,34,0.12)' },
                bezahlt:      { label: 'Bezahlt',       farbe: '#27ae60', bg: 'rgba(39,174,96,0.12)' },
                ueberfaellig: { label: 'Ueberfaellig',  farbe: '#e74c3c', bg: 'rgba(231,76,60,0.12)' },
                gemahnt:      { label: 'Gemahnt',       farbe: '#c0392b', bg: 'rgba(192,57,43,0.12)' },
                inkasso:      { label: 'Inkasso',       farbe: '#8e44ad', bg: 'rgba(142,68,173,0.12)' },
                storniert:    { label: 'Storniert',     farbe: '#7f8c8d', bg: 'rgba(127,140,141,0.12)' },
                gutschrift:   { label: 'Gutschrift',    farbe: '#2980b9', bg: 'rgba(41,128,185,0.12)' }
            };
            var MAHNSTUFEN = {
                0: { label: '--', farbe: 'var(--text-muted)' },
                1: { label: 'Erinnerung', farbe: '#f39c12' },
                2: { label: '1. Mahnung', farbe: '#e67e22' },
                3: { label: '2. Mahnung', farbe: '#e74c3c' },
                4: { label: 'Inkasso', farbe: '#8e44ad' }
            };

            // ══ Tage-Berechnung ══
            var getDaysInfo = function(entry) {
                if (!entry.faelligkeitsDatum && !entry.zahlungszielDatum) return null;
                if (entry.status === 'bezahlt' || entry.status === 'storniert' || entry.status === 'gutschrift') return null;
                var zielStr = entry.faelligkeitsDatum || entry.zahlungszielDatum;
                var ziel = new Date(zielStr);
                var now = new Date(today);
                var diff = Math.round((ziel - now) / (1000 * 60 * 60 * 24));
                return { days: diff, overdue: diff < 0, warning: diff >= 0 && diff <= settings.alarmTageVorher };
            };

            // ══ Verzugszinsen ══
            var berechneVerzugszinsen = function(entry) {
                if (entry.status === 'bezahlt' || entry.status === 'storniert') return 0;
                var faellig = new Date(entry.faelligkeitsDatum || entry.zahlungszielDatum);
                var heute = new Date();
                var verzugsTage = Math.max(0, Math.round((heute - faellig) / (1000*60*60*24)));
                if (verzugsTage <= 0) return 0;
                var istVerbraucher = entry.kundeTyp === 'b2c';
                var zinssatz = getBasiszins(entry.faelligkeitsDatum) + (istVerbraucher ? 5.0 : 9.0);
                var offenerBetrag = entry.restbetrag || entry.bruttoBetrag || 0;
                return Math.round(offenerBetrag * (zinssatz / 100) * verzugsTage / 365 * 100) / 100;
            };

            // ══ Verfuegbare Monate ══
            var verfuegbareMonate = React.useMemo(function() {
                var ms = {};
                eintraege.forEach(function(e) {
                    var m = (e.datum || '').substring(0, 7);
                    if (m) ms[m] = true;
                });
                return Object.keys(ms).sort().reverse();
            }, [eintraege]);

            // ══ Filter + Sort ══
            var filtered = eintraege.filter(function(e) {
                if (filterStatus !== 'alle') {
                    if (filterStatus === 'ueberfaellig') {
                        var info = getDaysInfo(e);
                        if (!info || !info.overdue) return false;
                    } else if (e.status !== filterStatus) return false;
                }
                if (filterMonat !== 'alle') {
                    if (!(e.datum || '').startsWith(filterMonat)) return false;
                }
                if (suchText) {
                    var s = suchText.toLowerCase();
                    var haystack = ((e.dokumentNr || e.rechnungsNr || '') + ' ' + (e.kundeName || e.kunde || '') + ' ' + (e.bauvorhaben || '')).toLowerCase();
                    if (haystack.indexOf(s) === -1) return false;
                }
                return true;
            });
            filtered.sort(function(a, b) {
                var va = a[sortField] || '', vb = b[sortField] || '';
                if (sortField === 'nettoBetrag' || sortField === 'bruttoBetrag') {
                    va = parseFloat(va) || 0; vb = parseFloat(vb) || 0;
                }
                if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va;
                return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
            });

            // ══ Statistiken ══
            var stats = React.useMemo(function() {
                var offen = 0, offenCount = 0, bezahlt = 0, bezahltCount = 0, ueberfaelligCount = 0, gesamtNetto = 0, gesamtBrutto = 0, gesamtMwst = 0;
                eintraege.forEach(function(e) {
                    if (e.status === 'storniert' || e.status === 'gutschrift') return;
                    gesamtNetto += (e.nettoBetrag || 0);
                    gesamtMwst += (e.mwstBetrag || 0);
                    gesamtBrutto += (e.bruttoBetrag || 0);
                    if (e.status === 'bezahlt') { bezahlt += (e.bruttoBetrag || 0); bezahltCount++; }
                    if (e.status === 'offen' || e.status === 'teilbezahlt' || e.status === 'gemahnt' || e.status === 'ueberfaellig' || e.status === 'inkasso') {
                        offen += (e.restbetrag != null ? e.restbetrag : e.bruttoBetrag || 0); offenCount++;
                    }
                    var di = getDaysInfo(e);
                    if (di && di.overdue) ueberfaelligCount++;
                });
                return { offen: offen, offenCount: offenCount, bezahlt: bezahlt, bezahltCount: bezahltCount, ueberfaelligCount: ueberfaelligCount, gesamtNetto: gesamtNetto, gesamtBrutto: gesamtBrutto, gesamtMwst: gesamtMwst };
            }, [eintraege]);

            // ══ Monats-Summen fuer Druckansicht ══
            var monatsSummen = React.useMemo(function() {
                var sum = { netto: 0, mwst: 0, brutto: 0, count: 0 };
                filtered.forEach(function(e) {
                    if (e.status !== 'storniert' && e.status !== 'gutschrift') {
                        sum.netto += (e.nettoBetrag || 0);
                        sum.mwst += (e.mwstBetrag || 0);
                        sum.brutto += (e.bruttoBetrag || 0);
                        sum.count++;
                    }
                });
                return sum;
            }, [filtered]);

            // ══ Sortierung ══
            var handleSort = function(field) {
                if (sortField === field) { setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }
                else { setSortField(field); setSortDir('asc'); }
            };
            var sortIcon = function(field) {
                if (sortField !== field) return ' \u2195';
                return sortDir === 'asc' ? ' \u2191' : ' \u2193';
            };

            // ══ Aktionen ══
            var startEdit = function(entry) { setEditId(entry.id); setEditData(Object.assign({}, entry)); };
            var saveEdit = function() {
                var d = Object.assign({}, editData);
                // Auto-Berechnung MwSt + Brutto
                if (d.nettoBetrag && d.mwstSatz) {
                    d.mwstBetrag = Math.round((d.nettoBetrag * d.mwstSatz / 100) * 100) / 100;
                    d.bruttoBetrag = Math.round((d.nettoBetrag + d.mwstBetrag) * 100) / 100;
                }
                // Faelligkeit berechnen
                if (d.datum && d.zahlungszielTage) {
                    var dd = new Date(d.datum);
                    dd.setDate(dd.getDate() + parseInt(d.zahlungszielTage));
                    d.faelligkeitsDatum = dd.toISOString().split('T')[0];
                }
                // Restbetrag
                d.restbetrag = d.bruttoBetrag - (d.zahlungsSumme || 0);
                if (d.restbetrag <= 0 && d.zahlungsSumme > 0) d.status = 'bezahlt';
                d.geaendertAm = new Date().toISOString();
                var updated = eintraege.map(function(e) { return e.id === editId ? d : e; });
                saveEintraege(updated);
                setEditId(null); setEditData({});
            };
            var cancelEdit = function() { setEditId(null); setEditData({}); };

            var deleteEntry = function(id) {
                if (!confirm('Eintrag wirklich loeschen? (GoBD: Stornierung ist empfohlen statt Loeschung)')) return;
                saveEintraege(eintraege.filter(function(e) { return e.id !== id; }));
            };

            var changeStatus = function(id, newStatus) {
                var updated = eintraege.map(function(e) {
                    if (e.id !== id) return e;
                    var upd = Object.assign({}, e, { status: newStatus, geaendertAm: new Date().toISOString() });
                    if (newStatus === 'bezahlt' && !upd.zahlungsDatum) upd.zahlungsDatum = today;
                    if (newStatus === 'bezahlt') { upd.zahlungsSumme = upd.bruttoBetrag; upd.restbetrag = 0; }
                    if (newStatus === 'gemahnt') upd.mahnStufe = Math.min((upd.mahnStufe || 0) + 1, 4);
                    return upd;
                });
                saveEintraege(updated);
            };

            var addManualEntry = function() {
                var lfdNr = eintraege.length + 1;
                var newEntry = {
                    id: 'RE_' + Date.now(),
                    lfdNr: lfdNr,
                    dokumentNr: '', rechnungsNr: '',
                    dokumentTyp: 'einzel', dokumentLabel: 'Rechnung',
                    typ: 'Rechnung',
                    datum: today, leistungsdatum: '',
                    kundeName: kunde ? (kunde.auftraggeber || kunde.name || '') : '',
                    kunde: kunde ? (kunde.auftraggeber || kunde.name || '') : '',
                    kundeTyp: 'b2b',
                    bauvorhaben: kunde ? (kunde.adresse || kunde.baumassnahme || '') : '',
                    auftragsnummer: '',
                    nettoBetrag: 0, mwstSatz: settings.standardMwst, mwstBetrag: 0, bruttoBetrag: 0,
                    zahlungszielTage: settings.standardZahlungsziel,
                    faelligkeitsDatum: '',
                    skontoProzent: settings.standardSkonto,
                    skontoTage: settings.standardSkontoTage,
                    status: 'offen',
                    mahnStufe: 0,
                    zahlungsDatum: null, zahlungsSumme: 0, restbetrag: 0,
                    notiz: '',
                    erstelltAm: new Date().toISOString(),
                    geaendertAm: new Date().toISOString()
                };
                var updated = [newEntry].concat(eintraege);
                saveEintraege(updated);
                startEdit(newEntry);
            };

            // ══ Drucken ══
            var handleDrucken = function() {
                setShowDruckansicht(true);
                setTimeout(function() { window.print(); }, 300);
            };

            // ══ EDIT-FORMULAR (Modal) ══
            var renderEditForm = function() {
                var d = editData;
                var set = function(key, val) {
                    setEditData(function(prev) {
                        var n = Object.assign({}, prev);
                        n[key] = val;
                        // Auto-Berechnung bei Aenderung von Netto oder MwSt
                        if (key === 'nettoBetrag' || key === 'mwstSatz') {
                            var netto = key === 'nettoBetrag' ? parseFloat(val) || 0 : (n.nettoBetrag || 0);
                            var satz = key === 'mwstSatz' ? parseFloat(val) || 0 : (n.mwstSatz || 19);
                            n.mwstBetrag = Math.round(netto * satz / 100 * 100) / 100;
                            n.bruttoBetrag = Math.round((netto + n.mwstBetrag) * 100) / 100;
                        }
                        // Faelligkeit bei Datum/Zahlungsziel-Aenderung
                        if (key === 'datum' || key === 'zahlungszielTage') {
                            var dat = key === 'datum' ? val : n.datum;
                            var tage = key === 'zahlungszielTage' ? parseInt(val) || 30 : parseInt(n.zahlungszielTage) || 30;
                            if (dat) {
                                var dd = new Date(dat);
                                dd.setDate(dd.getDate() + tage);
                                n.faelligkeitsDatum = dd.toISOString().split('T')[0];
                            }
                        }
                        return n;
                    });
                };
                var iStyle = { width:'100%', padding:'8px 10px', background:'var(--bg-tertiary)', border:'1px solid var(--border-subtle)', borderRadius:'8px', color:'var(--text-primary)', fontSize:'13px', boxSizing:'border-box' };
                var fields = [
                    { key:'dokumentNr', label:'Rechnungsnummer', type:'text' },
                    { key:'dokumentLabel', label:'Typ (z.B. 2. Abschlagsrechnung)', type:'text' },
                    { key:'datum', label:'Rechnungsdatum', type:'date' },
                    { key:'leistungsdatum', label:'Leistungsdatum/-zeitraum', type:'text' },
                    { key:'kundeName', label:'Kunde', type:'text' },
                    { key:'kundeTyp', label:'Kundentyp', type:'select', options: [
                        { v:'b2b', l:'B2B (Unternehmer)' }, { v:'b2c', l:'B2C (Privatkunde)' }, { v:'b2g', l:'B2G (Oeffentl. Auftraggeber)' }
                    ]},
                    { key:'bauvorhaben', label:'Objekt / Bauvorhaben', type:'text' },
                    { key:'auftragsnummer', label:'Auftragsnummer / Kostenstelle', type:'text' },
                    { key:'nettoBetrag', label:'Nettobetrag (EUR)', type:'text', isNum:true },
                    { key:'mwstSatz', label:'MwSt-Satz (%)', type:'text', isNum:true },
                    { key:'mwstBetrag', label:'MwSt-Betrag (EUR) — auto', type:'text', isNum:true, disabled:true },
                    { key:'bruttoBetrag', label:'Bruttobetrag (EUR) — auto', type:'text', isNum:true, disabled:true },
                    { key:'zahlungszielTage', label:'Zahlungsziel (Tage)', type:'text', isNum:true },
                    { key:'faelligkeitsDatum', label:'Faelligkeitsdatum — auto', type:'date', disabled:true },
                    { key:'skontoProzent', label:'Skonto (%)', type:'text', isNum:true },
                    { key:'skontoTage', label:'Skonto-Frist (Tage)', type:'text', isNum:true },
                    { key:'status', label:'Status', type:'select', options: Object.keys(STATUS).map(function(k) { return { v:k, l:STATUS[k].label }; }) },
                    { key:'mahnStufe', label:'Mahnstufe', type:'select', options: [0,1,2,3,4].map(function(i) { return { v:i, l:MAHNSTUFEN[i].label }; }) },
                    { key:'zahlungsDatum', label:'Zahlung eingegangen am', type:'date' },
                    { key:'zahlungsSumme', label:'Gezahlter Betrag (EUR)', type:'text', isNum:true },
                    { key:'notiz', label:'Bemerkung / Notiz', type:'text' }
                ];

                return (
                    <div className="modal-overlay" style={{zIndex:4000}} onClick={cancelEdit}>
                        <div style={{width:'95%', maxWidth:'560px', maxHeight:'90vh', overflow:'auto', background:'var(--bg-primary)', borderRadius:'16px', padding:'20px', boxSizing:'border-box'}} onClick={function(e) { e.stopPropagation(); }}>
                            <div style={{fontWeight:'700', fontSize:'16px', marginBottom:'16px', fontFamily:'Oswald', textTransform:'uppercase', letterSpacing:'1px', color:'var(--text-primary)'}}>Eintrag bearbeiten</div>
                            {fields.map(function(f) {
                                if (f.type === 'select') {
                                    return (
                                        <div key={f.key} style={{marginBottom:'8px'}}>
                                            <label style={{fontSize:'10px', color:'var(--text-muted)', display:'block', marginBottom:'2px'}}>{f.label}</label>
                                            <select value={d[f.key] != null ? d[f.key] : ''} onChange={function(e) { set(f.key, f.isNum ? parseInt(e.target.value) : e.target.value); }} style={iStyle}>
                                                {f.options.map(function(o) { return <option key={o.v} value={o.v}>{o.l}</option>; })}
                                            </select>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={f.key} style={{marginBottom:'8px'}}>
                                        <label style={{fontSize:'10px', color: f.disabled ? 'var(--accent-blue)' : 'var(--text-muted)', display:'block', marginBottom:'2px'}}>{f.label}</label>
                                        <input type={f.type} inputMode={f.isNum ? 'decimal' : undefined}
                                            value={d[f.key] != null ? d[f.key] : ''} disabled={f.disabled}
                                            onChange={function(e) { set(f.key, f.isNum ? parseFloat(e.target.value) || 0 : e.target.value); }}
                                            style={Object.assign({}, iStyle, f.disabled ? {opacity:0.7, fontWeight:'600', color:'var(--accent-blue)'} : {})} />
                                    </div>
                                );
                            })}
                            <div style={{display:'flex', gap:'8px', marginTop:'16px'}}>
                                <button onClick={saveEdit} style={{flex:1, padding:'12px', background:'var(--success)', color:'white', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'700', cursor:'pointer', fontFamily:'Oswald', textTransform:'uppercase', letterSpacing:'1px'}}>Speichern</button>
                                <button onClick={cancelEdit} style={{flex:1, padding:'12px', background:'var(--bg-tertiary)', color:'var(--text-secondary)', border:'1px solid var(--border-subtle)', borderRadius:'10px', fontSize:'14px', cursor:'pointer'}}>Abbrechen</button>
                            </div>
                        </div>
                    </div>
                );
            };

            // ══ ANALYSE-PANEL ══
            var renderAnalyse = function() {
                var monatsUmsaetze = {};
                eintraege.forEach(function(e) {
                    if (e.status === 'storniert') return;
                    var monat = (e.datum || '').substring(0, 7);
                    if (!monat) return;
                    if (!monatsUmsaetze[monat]) monatsUmsaetze[monat] = { netto:0, mwst:0, brutto:0, count:0, bezahlt:0, offen:0 };
                    monatsUmsaetze[monat].netto += (e.nettoBetrag || 0);
                    monatsUmsaetze[monat].mwst += (e.mwstBetrag || 0);
                    monatsUmsaetze[monat].brutto += (e.bruttoBetrag || 0);
                    monatsUmsaetze[monat].count++;
                    if (e.status === 'bezahlt') monatsUmsaetze[monat].bezahlt += (e.bruttoBetrag || 0);
                    else monatsUmsaetze[monat].offen += (e.bruttoBetrag || 0);
                });
                var monate = Object.keys(monatsUmsaetze).sort().reverse();
                var monatsnamen = ['', 'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

                return (
                    <div style={{padding:'16px', background:'var(--bg-secondary)', borderRadius:'12px', marginBottom:'12px'}}>
                        <div style={{fontWeight:'700', fontSize:'14px', marginBottom:'12px', fontFamily:'Oswald', textTransform:'uppercase', letterSpacing:'1px'}}>Umsatzanalyse</div>
                        <div style={{overflowX:'auto'}}>
                            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'12px'}}>
                                <thead>
                                    <tr style={{borderBottom:'2px solid var(--border-subtle)'}}>
                                        <th style={{textAlign:'left', padding:'6px 8px', fontWeight:'700', color:'var(--text-muted)', fontSize:'10px', textTransform:'uppercase'}}>Monat</th>
                                        <th style={{textAlign:'center', padding:'6px 4px', fontWeight:'700', color:'var(--text-muted)', fontSize:'10px'}}>Anz.</th>
                                        <th style={{textAlign:'right', padding:'6px 8px', fontWeight:'700', color:'var(--text-muted)', fontSize:'10px'}}>Netto</th>
                                        <th style={{textAlign:'right', padding:'6px 8px', fontWeight:'700', color:'var(--text-muted)', fontSize:'10px'}}>MwSt</th>
                                        <th style={{textAlign:'right', padding:'6px 8px', fontWeight:'700', color:'var(--text-muted)', fontSize:'10px'}}>Brutto</th>
                                        <th style={{textAlign:'right', padding:'6px 8px', fontWeight:'700', color:'var(--success)', fontSize:'10px'}}>Bezahlt</th>
                                        <th style={{textAlign:'right', padding:'6px 8px', fontWeight:'700', color:'var(--accent-orange)', fontSize:'10px'}}>Offen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monate.map(function(m) {
                                        var d = monatsUmsaetze[m];
                                        var parts = m.split('-');
                                        var label = monatsnamen[parseInt(parts[1])] + ' ' + parts[0];
                                        return (
                                            <tr key={m} style={{borderBottom:'1px solid var(--border-subtle)'}}>
                                                <td style={{padding:'6px 8px', fontWeight:'600'}}>{label}</td>
                                                <td style={{padding:'6px 4px', textAlign:'center'}}>{d.count}</td>
                                                <td style={{padding:'6px 8px', textAlign:'right', fontFamily:'monospace'}}>{fmt(d.netto)}</td>
                                                <td style={{padding:'6px 8px', textAlign:'right', fontFamily:'monospace', color:'var(--text-muted)'}}>{fmt(d.mwst)}</td>
                                                <td style={{padding:'6px 8px', textAlign:'right', fontFamily:'monospace', fontWeight:'600'}}>{fmt(d.brutto)}</td>
                                                <td style={{padding:'6px 8px', textAlign:'right', fontFamily:'monospace', color:'var(--success)'}}>{fmt(d.bezahlt)}</td>
                                                <td style={{padding:'6px 8px', textAlign:'right', fontFamily:'monospace', color: d.offen > 0 ? 'var(--accent-orange)' : 'var(--text-muted)'}}>{fmt(d.offen)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            };

            // ══ EINSTELLUNGEN ══
            var renderSettings = function() {
                var s = Object.assign({}, settings);
                var upd = function(key, val) { var n = Object.assign({}, s); n[key] = val; saveSettings(n); };
                var iStyle = { width:'100%', padding:'8px 10px', background:'var(--bg-tertiary)', border:'1px solid var(--border-subtle)', borderRadius:'8px', color:'var(--text-primary)', fontSize:'13px', boxSizing:'border-box' };
                var flds = [
                    { k:'standardZahlungsziel', l:'Standard-Zahlungsziel (Tage)', num:true },
                    { k:'standardMwst', l:'Standard MwSt-Satz (%)', num:true },
                    { k:'standardSkonto', l:'Standard Skonto (%)', num:true },
                    { k:'standardSkontoTage', l:'Standard Skonto-Frist (Tage)', num:true },
                    { k:'alarmTageVorher', l:'Alarm X Tage vor Faelligkeit', num:true },
                    { k:'steuernummer', l:'Steuernummer', num:false },
                    { k:'ustIdNr', l:'USt-IdNr.', num:false },
                    { k:'basiszinssatz', l:'Aktueller Basiszinssatz (%)', num:true }
                ];
                return (
                    <div style={{padding:'16px', background:'var(--bg-secondary)', borderRadius:'12px', marginBottom:'12px'}}>
                        <div style={{fontWeight:'700', fontSize:'14px', marginBottom:'12px', fontFamily:'Oswald', textTransform:'uppercase', letterSpacing:'1px'}}>Einstellungen</div>
                        {flds.map(function(f) {
                            return (
                                <div key={f.k} style={{marginBottom:'8px'}}>
                                    <label style={{fontSize:'10px', color:'var(--text-muted)', display:'block', marginBottom:'2px'}}>{f.l}</label>
                                    <input type="text" inputMode={f.num ? 'decimal' : undefined} value={settings[f.k] || ''}
                                        onChange={function(e) { upd(f.k, f.num ? parseFloat(e.target.value) || 0 : e.target.value); }} style={iStyle} />
                                </div>
                            );
                        })}
                    </div>
                );
            };

            // ══ STATUS-BADGE ══
            var StatusBadge = function(props) {
                var st = STATUS[props.status] || STATUS.offen;
                return <span style={{padding:'2px 8px', borderRadius:'6px', fontSize:'10px', fontWeight:'700', background:st.bg, color:st.farbe, whiteSpace:'nowrap'}}>{st.label}</span>;
            };

            // ══ HAUPTANSICHT (Tabelle) ══
            var thStyle = {
                padding:'8px 6px', fontWeight:'700', fontSize:'10px', textTransform:'uppercase',
                letterSpacing:'0.5px', color:'var(--text-muted)', borderBottom:'2px solid var(--border-subtle)',
                position:'sticky', top:0, background:'var(--bg-primary)', cursor:'pointer',
                userSelect:'none', whiteSpace:'nowrap', zIndex:2
            };
            var tdStyle = { padding:'7px 6px', fontSize:'11px', borderBottom:'1px solid var(--border-subtle)', verticalAlign:'top' };

            return (
                <div className="page-container" style={{padding:'12px 10px', minHeight:'100vh'}}>
                    {/* ══ HEADER ══ */}
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px'}} className="no-print">
                        <button onClick={onBack} style={{background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'var(--text-primary)', padding:'4px'}}>&#8592;</button>
                        <div style={{flex:1}}>
                            <div style={{fontSize:'16px', fontWeight:'700', color:'var(--text-primary)', fontFamily:'Oswald', textTransform:'uppercase', letterSpacing:'1px'}}>Rechnungsausgangsbuch</div>
                            <div style={{fontSize:'11px', color:'var(--text-muted)'}}>{eintraege.length} Eintraege  |  {fmt(stats.offen)} EUR offen  |  {stats.ueberfaelligCount > 0 ? stats.ueberfaelligCount + ' ueberfaellig!' : 'keine ueberfaellig'}</div>
                        </div>
                        <button onClick={handleDrucken} style={{padding:'6px 10px', background:'var(--bg-tertiary)', color:'var(--text-secondary)', border:'none', borderRadius:'8px', fontSize:'18px', cursor:'pointer'}} title="Drucken">&#128424;</button>
                        <button onClick={function() { setShowAnalyse(!showAnalyse); setShowSettings(false); }} style={{padding:'6px 10px', background: showAnalyse ? 'var(--accent-blue)' : 'var(--bg-tertiary)', color: showAnalyse ? 'white' : 'var(--text-secondary)', border:'none', borderRadius:'8px', fontSize:'18px', cursor:'pointer'}} title="Analyse">&#128202;</button>
                        <button onClick={function() { setShowSettings(!showSettings); setShowAnalyse(false); }} style={{padding:'6px 10px', background: showSettings ? 'var(--accent-blue)' : 'var(--bg-tertiary)', color: showSettings ? 'white' : 'var(--text-secondary)', border:'none', borderRadius:'8px', fontSize:'18px', cursor:'pointer'}} title="Einstellungen">&#9881;</button>
                    </div>

                    {/* ══ ALARM-BANNER ══ */}
                    {stats.ueberfaelligCount > 0 && (
                        <div className="no-print" style={{padding:'10px 14px', marginBottom:'10px', background:'rgba(231,76,60,0.12)', border:'1px solid rgba(231,76,60,0.3)', borderRadius:'10px', display:'flex', alignItems:'center', gap:'10px', cursor:'pointer'}}
                            onClick={function() { setFilterStatus('ueberfaellig'); }}>
                            <span style={{fontSize:'18px'}}>&#128680;</span>
                            <div>
                                <div style={{fontWeight:'700', fontSize:'13px', color:'#e74c3c'}}>{stats.ueberfaelligCount} ueberfaellige Rechnung{stats.ueberfaelligCount > 1 ? 'en' : ''}!</div>
                                <div style={{fontSize:'10px', color:'var(--text-muted)'}}>Zahlungsziel ueberschritten — Klicken zum Filtern</div>
                            </div>
                        </div>
                    )}

                    {/* ══ STATISTIK-KARTEN ══ */}
                    <div className="no-print" style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'6px', marginBottom:'10px'}}>
                        {[
                            { label:'Offen', val:stats.offenCount, color:'#f39c12' },
                            { label:'Ausstehend', val:fmt(stats.offen) + ' EUR', color:'#e74c3c', small:true },
                            { label:'Bezahlt', val:fmt(stats.bezahlt) + ' EUR', color:'#27ae60', small:true },
                            { label:'Gesamt Netto', val:fmt(stats.gesamtNetto) + ' EUR', color:'#1E88E5', small:true }
                        ].map(function(c, i) {
                            return (
                                <div key={i} style={{padding:'8px 6px', background:'var(--bg-secondary)', borderRadius:'10px', textAlign:'center'}}>
                                    <div style={{fontSize: c.small ? '12px' : '18px', fontWeight:'700', color:c.color, fontFamily:'monospace'}}>{c.val}</div>
                                    <div style={{fontSize:'9px', color:'var(--text-muted)', marginTop:'2px'}}>{c.label}</div>
                                </div>
                            );
                        })}
                    </div>

                    {showSettings && renderSettings()}
                    {showAnalyse && renderAnalyse()}

                    {/* ══ FILTER-LEISTE ══ */}
                    <div className="no-print" style={{display:'flex', gap:'4px', marginBottom:'8px', flexWrap:'wrap', alignItems:'center'}}>
                        {['alle', 'offen', 'ueberfaellig', 'teilbezahlt', 'gemahnt', 'bezahlt', 'storniert'].map(function(f) {
                            var label = f === 'ueberfaellig' ? 'Ueberfaellig' : f === 'alle' ? 'Alle' : (STATUS[f] ? STATUS[f].label : f);
                            return <button key={f} onClick={function() { setFilterStatus(f); }}
                                style={{padding:'4px 8px', border:'none', borderRadius:'6px', fontSize:'10px', fontWeight:'600', cursor:'pointer',
                                    background: filterStatus === f ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                                    color: filterStatus === f ? 'white' : 'var(--text-muted)'}}>{label}</button>;
                        })}
                        <select value={filterMonat} onChange={function(e) { setFilterMonat(e.target.value); }}
                            style={{padding:'4px 8px', border:'1px solid var(--border-subtle)', borderRadius:'6px', fontSize:'10px', background:'var(--bg-tertiary)', color:'var(--text-primary)', cursor:'pointer'}}>
                            <option value="alle">Alle Monate</option>
                            {verfuegbareMonate.map(function(m) {
                                var p = m.split('-'); var mn = ['','Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
                                return <option key={m} value={m}>{mn[parseInt(p[1])]} {p[0]}</option>;
                            })}
                        </select>
                        <input type="text" placeholder="Suche..." value={suchText} onChange={function(e) { setSuchText(e.target.value); }}
                            style={{padding:'4px 8px', border:'1px solid var(--border-subtle)', borderRadius:'6px', fontSize:'10px', background:'var(--bg-tertiary)', color:'var(--text-primary)', flex:1, minWidth:'80px'}} />
                        <button onClick={addManualEntry} style={{padding:'4px 10px', background:'var(--success)', color:'white', border:'none', borderRadius:'6px', fontSize:'10px', fontWeight:'700', cursor:'pointer', whiteSpace:'nowrap'}}>+ Neu</button>
                    </div>

                    {/* ══ DRUCK-HEADER (nur beim Drucken sichtbar) ══ */}
                    <div className="print-only" style={{display:'none', marginBottom:'16px', textAlign:'center'}}>
                        <div style={{fontSize:'16px', fontWeight:'700'}}>Rechnungsausgangsbuch</div>
                        <div style={{fontSize:'12px'}}>{settings.firmenname}</div>
                        {settings.steuernummer && <div style={{fontSize:'10px'}}>St.-Nr.: {settings.steuernummer}</div>}
                        <div style={{fontSize:'10px', marginTop:'4px'}}>
                            {filterMonat !== 'alle' ? 'Monat: ' + filterMonat : 'Alle Zeitraeume'} | Erstellt: {fmtDatum(today)} | {filtered.length} Eintraege
                        </div>
                    </div>

                    {/* ══ HAUPTTABELLE ══ */}
                    <div style={{overflowX:'auto', WebkitOverflowScrolling:'touch'}}>
                        <table className="ab-table" style={{width:'100%', borderCollapse:'collapse', minWidth:'900px'}}>
                            <thead>
                                <tr>
                                    <th style={Object.assign({}, thStyle, {width:'30px', textAlign:'center'})} onClick={function() { handleSort('lfdNr'); }}>Nr.{sortIcon('lfdNr')}</th>
                                    <th style={Object.assign({}, thStyle, {width:'90px'})} onClick={function() { handleSort('datum'); }}>Datum{sortIcon('datum')}</th>
                                    <th style={Object.assign({}, thStyle, {width:'100px'})} onClick={function() { handleSort('dokumentNr'); }}>RE-Nr.{sortIcon('dokumentNr')}</th>
                                    <th style={Object.assign({}, thStyle, {minWidth:'120px'})} onClick={function() { handleSort('kundeName'); }}>Kunde{sortIcon('kundeName')}</th>
                                    <th style={Object.assign({}, thStyle, {minWidth:'100px'})}>Objekt</th>
                                    <th style={Object.assign({}, thStyle, {width:'80px', textAlign:'right'})} onClick={function() { handleSort('nettoBetrag'); }}>Netto{sortIcon('nettoBetrag')}</th>
                                    <th style={Object.assign({}, thStyle, {width:'50px', textAlign:'right'})}>MwSt</th>
                                    <th style={Object.assign({}, thStyle, {width:'85px', textAlign:'right'})} onClick={function() { handleSort('bruttoBetrag'); }}>Brutto{sortIcon('bruttoBetrag')}</th>
                                    <th style={Object.assign({}, thStyle, {width:'75px', textAlign:'center'})}>Zahlungsziel</th>
                                    <th style={Object.assign({}, thStyle, {width:'65px', textAlign:'center'})}>Status</th>
                                    <th style={Object.assign({}, thStyle, {width:'65px', textAlign:'center'})}>Mahnung</th>
                                    <th style={Object.assign({}, thStyle, {width:'60px', textAlign:'center'})} className="no-print">Aktion</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && (
                                    <tr><td colSpan="12" style={{padding:'30px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px'}}>
                                        {eintraege.length === 0 ? 'Noch keine Eintraege. Erstelle eine Rechnung im Rechnungsmodul oder klicke + Neu.' : 'Keine Eintraege fuer diesen Filter.'}
                                    </td></tr>
                                )}
                                {filtered.map(function(entry, idx) {
                                    var daysInfo = getDaysInfo(entry);
                                    var isOverdue = daysInfo && daysInfo.overdue;
                                    var isWarning = daysInfo && daysInfo.warning;
                                    var rowBg = isOverdue ? 'rgba(231,76,60,0.06)' : isWarning ? 'rgba(243,156,18,0.04)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)');
                                    var mahnstufe = MAHNSTUFEN[entry.mahnStufe || 0] || MAHNSTUFEN[0];
                                    var verzug = isOverdue ? berechneVerzugszinsen(entry) : 0;
                                    var kundenName = entry.kundeName || entry.kunde || '--';
                                    var reNr = entry.dokumentNr || entry.rechnungsNr || '--';

                                    return (
                                        <tr key={entry.id} style={{background:rowBg}}>
                                            <td style={Object.assign({}, tdStyle, {textAlign:'center', color:'var(--text-muted)', fontSize:'10px'})}>{entry.lfdNr || idx + 1}</td>
                                            <td style={Object.assign({}, tdStyle, {whiteSpace:'nowrap'})}>
                                                <div style={{fontWeight:'600'}}>{fmtDatum(entry.datum)}</div>
                                                {entry.dokumentLabel && <div style={{fontSize:'9px', color:'var(--text-muted)'}}>{entry.dokumentLabel}</div>}
                                            </td>
                                            <td style={Object.assign({}, tdStyle, {fontWeight:'700', color:'var(--accent-blue)'})}>{reNr}</td>
                                            <td style={tdStyle}>
                                                <div style={{fontWeight:'600', fontSize:'11px'}}>{kundenName.length > 25 ? kundenName.substring(0, 25) + '...' : kundenName}</div>
                                                {entry.kundeTyp && <div style={{fontSize:'9px', color:'var(--text-muted)'}}>{entry.kundeTyp === 'b2b' ? 'Unternehmer' : entry.kundeTyp === 'b2c' ? 'Privat' : 'Oeffentl.'}</div>}
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{fontSize:'10px', color:'var(--text-secondary)'}}>{(entry.bauvorhaben || '--').substring(0, 30)}</div>
                                                {entry.auftragsnummer && <div style={{fontSize:'9px', color:'var(--text-muted)'}}>Auftr: {entry.auftragsnummer}</div>}
                                            </td>
                                            <td style={Object.assign({}, tdStyle, {textAlign:'right', fontFamily:'monospace', fontWeight:'600'})}>{fmt(entry.nettoBetrag)}</td>
                                            <td style={Object.assign({}, tdStyle, {textAlign:'right', fontFamily:'monospace', fontSize:'10px', color:'var(--text-muted)'})}>{entry.mwstSatz || 19}%</td>
                                            <td style={Object.assign({}, tdStyle, {textAlign:'right', fontFamily:'monospace', fontWeight:'700'})}>{fmt(entry.bruttoBetrag)}</td>
                                            <td style={Object.assign({}, tdStyle, {textAlign:'center'})}>
                                                <div style={{fontSize:'10px', fontWeight: isOverdue ? '700' : '400', color: isOverdue ? '#e74c3c' : isWarning ? '#f39c12' : 'var(--text-secondary)'}}>
                                                    {fmtDatum(entry.faelligkeitsDatum || entry.zahlungszielDatum)}
                                                </div>
                                                {daysInfo && (
                                                    <div style={{fontSize:'9px', fontWeight:'700', color: isOverdue ? '#e74c3c' : '#f39c12'}}>
                                                        {isOverdue ? Math.abs(daysInfo.days) + 'T ueberfaellig' : daysInfo.warning ? 'in ' + daysInfo.days + 'T' : ''}
                                                    </div>
                                                )}
                                                {verzug > 0 && <div style={{fontSize:'8px', color:'#c0392b'}}>Zinsen: {fmt(verzug)}</div>}
                                            </td>
                                            <td style={Object.assign({}, tdStyle, {textAlign:'center'})}><StatusBadge status={entry.status} /></td>
                                            <td style={Object.assign({}, tdStyle, {textAlign:'center'})}>
                                                {(entry.mahnStufe || 0) > 0 ? (
                                                    <span style={{fontSize:'10px', fontWeight:'700', color:mahnstufe.farbe}}>{mahnstufe.label}</span>
                                                ) : (
                                                    <span style={{fontSize:'10px', color:'var(--text-muted)'}}>--</span>
                                                )}
                                            </td>
                                            <td style={Object.assign({}, tdStyle, {textAlign:'center'})} className="no-print">
                                                <div style={{display:'flex', gap:'3px', justifyContent:'center', flexWrap:'wrap'}}>
                                                    {(entry.status === 'offen' || entry.status === 'teilbezahlt') && (
                                                        <button onClick={function() { changeStatus(entry.id, 'bezahlt'); }}
                                                            style={{padding:'2px 5px', background:'rgba(46,204,113,0.15)', color:'#27ae60', border:'none', borderRadius:'4px', fontSize:'9px', fontWeight:'600', cursor:'pointer'}} title="Als bezahlt markieren">&#10003;</button>
                                                    )}
                                                    {isOverdue && entry.status !== 'bezahlt' && (
                                                        <button onClick={function() { changeStatus(entry.id, 'gemahnt'); }}
                                                            style={{padding:'2px 5px', background:'rgba(231,76,60,0.15)', color:'#e74c3c', border:'none', borderRadius:'4px', fontSize:'9px', fontWeight:'600', cursor:'pointer'}} title="Mahnstufe erhoehen">M</button>
                                                    )}
                                                    <button onClick={function() { startEdit(entry); }}
                                                        style={{padding:'2px 5px', background:'var(--bg-tertiary)', color:'var(--text-muted)', border:'none', borderRadius:'4px', fontSize:'9px', cursor:'pointer'}} title="Bearbeiten">&#9998;</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {/* ══ SUMMENZEILE ══ */}
                            {filtered.length > 0 && (
                                <tfoot>
                                    <tr style={{borderTop:'2px solid var(--border-subtle)', fontWeight:'700'}}>
                                        <td colSpan="5" style={{padding:'8px 6px', fontSize:'11px', textAlign:'right', color:'var(--text-secondary)'}}>
                                            Summe ({monatsSummen.count} Rechnungen):
                                        </td>
                                        <td style={{padding:'8px 6px', textAlign:'right', fontFamily:'monospace', fontSize:'12px', color:'var(--text-primary)'}}>{fmt(monatsSummen.netto)}</td>
                                        <td style={{padding:'8px 6px', textAlign:'right', fontFamily:'monospace', fontSize:'10px', color:'var(--text-muted)'}}></td>
                                        <td style={{padding:'8px 6px', textAlign:'right', fontFamily:'monospace', fontSize:'12px', fontWeight:'700', color:'var(--text-primary)'}}>{fmt(monatsSummen.brutto)}</td>
                                        <td colSpan="4"></td>
                                    </tr>
                                    <tr>
                                        <td colSpan="5" style={{padding:'4px 6px', fontSize:'10px', textAlign:'right', color:'var(--text-muted)'}}>
                                            davon MwSt:
                                        </td>
                                        <td colSpan="2"></td>
                                        <td style={{padding:'4px 6px', textAlign:'right', fontFamily:'monospace', fontSize:'10px', color:'var(--text-muted)'}}>{fmt(monatsSummen.mwst)}</td>
                                        <td colSpan="4"></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* ══ DRUCK-FUSSNOTE (nur beim Drucken) ══ */}
                    <div className="print-only" style={{display:'none', marginTop:'20px', paddingTop:'10px', borderTop:'1px solid #ccc', fontSize:'9px', color:'#666'}}>
                        <div>{settings.firmenname} | {settings.steuernummer ? 'St.-Nr.: ' + settings.steuernummer : ''} {settings.ustIdNr ? '| USt-IdNr.: ' + settings.ustIdNr : ''}</div>
                        <div>Basiszinssatz: {getBasiszins(today)}% (Stand {settings.basiszinssatzStand || today}) | Verzugszins B2B: {(getBasiszins(today) + 9).toFixed(2)}% | Verzugszins B2C: {(getBasiszins(today) + 5).toFixed(2)}%</div>
                        <div style={{marginTop:'4px'}}>Dieses Ausgangsbuch wurde elektronisch erstellt. Aufbewahrungsfrist: 10 Jahre (HGB/AO). GoBD-konform gefuehrt.</div>
                    </div>

                    {/* ══ DRUCK-STYLES ══ */}
                    <style dangerouslySetInnerHTML={{__html: `
                        @media print {
                            body { background: white !important; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                            .no-print { display: none !important; }
                            .print-only { display: block !important; }
                            .page-container { padding: 0 !important; min-height: auto !important; background: white !important; }
                            .ab-table { min-width: auto !important; font-size: 9px !important; }
                            .ab-table th { position: static !important; background: #f5f5f5 !important; color: #333 !important; border-bottom: 2px solid #333 !important; font-size: 8px !important; padding: 4px 3px !important; }
                            .ab-table td { color: #222 !important; border-bottom: 1px solid #ccc !important; padding: 3px 3px !important; font-size: 9px !important; }
                            .ab-table tfoot td { border-top: 2px solid #333 !important; color: #222 !important; }
                            .ab-table tr { background: transparent !important; }
                            .ab-table tr:nth-child(even) { background: #f9f9f9 !important; }
                            @page { margin: 10mm 8mm; size: landscape; }
                        }
                    `}} />

                    {/* ══ Edit Modal ══ */}
                    {editId && renderEditForm()}
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           BAUSTELLEN-APP ADMIN -- Firebase-Anbindung
           Kunden an Baustellen-App pushen, Mitarbeiter freigeben
           ═══════════════════════════════════════════ */
