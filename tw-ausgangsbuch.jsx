        function RechnungsAusgangsbuch({ kunde, onBack }) {
            var AB_KEY = 'tw_ausgangsbuch';
            var SETTINGS_KEY = 'tw_ausgangsbuch_settings';

            const [eintraege, setEintraege] = useState([]);
            const [ansicht, setAnsicht] = useState('liste'); // 'liste' | 'analyse' | 'einstellungen'
            const [editId, setEditId] = useState(null);
            const [editData, setEditData] = useState({});
            const [filterStatus, setFilterStatus] = useState('alle');
            const [suchtext, setSuchtext] = useState('');
            const [sortField, setSortField] = useState('datum');
            const [sortDir, setSortDir] = useState('desc');
            const [showZahlungDialog, setShowZahlungDialog] = useState(false);
            const [zahlungEintragId, setZahlungEintragId] = useState(null);
            const [zahlungData, setZahlungData] = useState({ datum: '', betrag: '', art: 'ueberweisung', referenz: '', mitSkonto: false });
            const [showMahnDialog, setShowMahnDialog] = useState(false);
            const [mahnEintragId, setMahnEintragId] = useState(null);
            const [settings, setSettings] = useState({
                standardMwst: 19,
                standardZahlungsziel: 30,
                standardSkonto: 2,
                standardSkontoTage: 10,
                standardSicherheitseinbehalt: 5,
                alarmTageVorher: 3,
                mahnfrist1_tage: 10,
                mahnfrist2_tage: 10,
                mahnfrist3_tage: 7,
                mahnpauschaleB2B: 40.00,
                basiszinssatzAktuell: 1.27,
                basiszinssatzStand: '2026-01-01',
                firmenname: 'Thomas Willwacher Fliesenlegermeister e.K.',
                bankname: 'Westerwald Bank eG',
                iban: 'DE12 5739 1800 0000 0000 00',
                bic: 'GENODE51WW1',
                steuernummer: '30/220/1234/5'
            });

            // Basiszinssatz-Tabelle (halbjaehrlich aktualisiert)
            var BASISZINSSATZ_TABELLE = [
                { ab: '2026-01-01', satz: 1.27 },
                { ab: '2025-07-01', satz: 2.27 },
                { ab: '2025-01-01', satz: 2.27 },
                { ab: '2024-07-01', satz: 3.37 },
                { ab: '2024-01-01', satz: 3.62 }
            ];

            var getBasiszinssatz = function(datum) {
                var d = datum || new Date().toISOString().split('T')[0];
                for (var i = 0; i < BASISZINSSATZ_TABELLE.length; i++) {
                    if (d >= BASISZINSSATZ_TABELLE[i].ab) return BASISZINSSATZ_TABELLE[i].satz;
                }
                return 1.27;
            };

            var getVerzugszinssatz = function(datum, istVerbraucher) {
                var basis = getBasiszinssatz(datum);
                return basis + (istVerbraucher ? 5.0 : 9.0);
            };

            var berechneVerzugszinsen = function(eintrag) {
                if (eintrag.status === 'bezahlt' || eintrag.status === 'storniert') return 0;
                var faellig = new Date(eintrag.faelligkeitsDatum || eintrag.zahlungszielDatum);
                if (!faellig || isNaN(faellig.getTime())) return 0;
                var heute = new Date();
                var verzugsTage = Math.max(0, Math.round((heute - faellig) / (1000*60*60*24)));
                if (verzugsTage <= 0) return 0;
                var istVerbraucher = eintrag.kundeTyp === 'b2c';
                var zinssatz = getVerzugszinssatz(eintrag.faelligkeitsDatum || eintrag.zahlungszielDatum, istVerbraucher);
                var offenerBetrag = eintrag.restbetrag || eintrag.forderungBrutto || eintrag.bruttoBetrag || 0;
                var zinsen = offenerBetrag * (zinssatz / 100) * verzugsTage / 365;
                return Math.round(zinsen * 100) / 100;
            };

            // Zahlungskonditionen
            var ZAHLUNGSKONDITIONEN = [
                { id: 'standard_handwerk', name: 'Standard Handwerk', zahlungszielTage: 30, skontoProzent: 2, skontoTage: 10, sicherheitseinbehaltProzent: 5 },
                { id: 'sofort_faellig', name: 'Sofort faellig', zahlungszielTage: 0, skontoProzent: 0, skontoTage: 0, sicherheitseinbehaltProzent: 0 },
                { id: 'schnellzahler', name: 'Schnellzahler (14T)', zahlungszielTage: 14, skontoProzent: 3, skontoTage: 7, sicherheitseinbehaltProzent: 0 },
                { id: 'oeffentlicher_ag', name: 'Oeffentl. Auftraggeber', zahlungszielTage: 30, skontoProzent: 2, skontoTage: 14, sicherheitseinbehaltProzent: 5 },
                { id: 'generalunternehmer', name: 'Generalunternehmer', zahlungszielTage: 45, skontoProzent: 2, skontoTage: 14, sicherheitseinbehaltProzent: 5 },
                { id: 'privatkunde_bar', name: 'Privatkunde (bar)', zahlungszielTage: 14, skontoProzent: 0, skontoTage: 0, sicherheitseinbehaltProzent: 0 }
            ];

            // Status-Konfiguration
            var STATUS = {
                offen:        { label: 'Offen',         farbe: '#f39c12', icon: '\u23f3' },
                teilbezahlt:  { label: 'Teilbezahlt',   farbe: '#e67e22', icon: '\u26a0' },
                bezahlt:      { label: 'Bezahlt',       farbe: '#27ae60', icon: '\u2713' },
                ueberfaellig: { label: 'Ueberfaellig',  farbe: '#e74c3c', icon: '\u2757' },
                gemahnt:      { label: 'Gemahnt',       farbe: '#c0392b', icon: '\u26a0' },
                inkasso:      { label: 'Inkasso',       farbe: '#8e44ad', icon: '\ud83d\udcce' },
                storniert:    { label: 'Storniert',     farbe: '#95a5a6', icon: '\u2715' },
                gutschrift:   { label: 'Gutschrift',    farbe: '#3498db', icon: '\u21a9' }
            };

            // Laden
            useEffect(function() {
                try {
                    var data = JSON.parse(localStorage.getItem(AB_KEY) || '[]');
                    // Auto-Update: Ueberfaelligkeits-Check
                    var today = new Date().toISOString().split('T')[0];
                    var updated = data.map(function(e) {
                        if (e.status === 'offen' && e.faelligkeitsDatum && e.faelligkeitsDatum < today) {
                            return Object.assign({}, e, { status: 'ueberfaellig' });
                        }
                        return e;
                    });
                    setEintraege(updated);
                    if (JSON.stringify(data) !== JSON.stringify(updated)) {
                        localStorage.setItem(AB_KEY, JSON.stringify(updated));
                    }
                    var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
                    if (s) setSettings(Object.assign({}, settings, s));
                } catch(e) { console.warn('Ausgangsbuch laden fehlgeschlagen:', e); }
            }, []);

            // Speichern
            var saveEintraege = function(newData) {
                setEintraege(newData);
                try { localStorage.setItem(AB_KEY, JSON.stringify(newData)); } catch(e) {}
            };
            var saveSettings = function(newSettings) {
                setSettings(newSettings);
                try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings)); } catch(e) {}
            };

            // Formatierung
            var fmt = function(v) { return (parseFloat(v) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
            var today = new Date().toISOString().split('T')[0];

            // Tage-Info
            var getDaysInfo = function(entry) {
                if (!entry.faelligkeitsDatum || entry.status === 'bezahlt' || entry.status === 'storniert' || entry.status === 'gutschrift') return null;
                var ziel = new Date(entry.faelligkeitsDatum);
                var now = new Date(today);
                var diff = Math.round((ziel - now) / (1000 * 60 * 60 * 24));
                return { days: diff, overdue: diff < 0, warning: diff >= 0 && diff <= settings.alarmTageVorher };
            };

            // Filter + Suche + Sort
            var filtered = eintraege.filter(function(e) {
                if (filterStatus !== 'alle') {
                    if (filterStatus === 'ueberfaellig') {
                        var info = getDaysInfo(e);
                        return (info && info.overdue) || e.status === 'ueberfaellig';
                    }
                    if (e.status !== filterStatus) return false;
                }
                if (suchtext) {
                    var s = suchtext.toLowerCase();
                    var fields = [e.dokumentNr, e.rechnungsNr, e.kundeName, e.kunde, e.bauvorhaben, e.dokumentLabel, e.typ].join(' ').toLowerCase();
                    if (fields.indexOf(s) === -1) return false;
                }
                return true;
            });
            filtered.sort(function(a, b) {
                var va = a[sortField] || '', vb = b[sortField] || '';
                if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
                return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
            });

            // Statistiken
            var stats = {
                ueberfaellig: eintraege.filter(function(e) { var i = getDaysInfo(e); return (i && i.overdue) || e.status === 'ueberfaellig'; }).length,
                offen: eintraege.filter(function(e) { return e.status === 'offen' || e.status === 'ueberfaellig' || e.status === 'teilbezahlt'; }).length,
                summeOffen: eintraege.filter(function(e) { return e.status === 'offen' || e.status === 'ueberfaellig' || e.status === 'teilbezahlt'; }).reduce(function(s,e) { return s + (e.restbetrag || e.bruttoBetrag || 0); }, 0),
                summeBezahlt: eintraege.filter(function(e) { return e.status === 'bezahlt'; }).reduce(function(s,e) { return s + (e.bruttoBetrag || 0); }, 0),
                gesamtJahr: eintraege.filter(function(e) { return e.status !== 'storniert' && (e.datum || '').startsWith(new Date().getFullYear().toString()); }).reduce(function(s,e) { return s + (e.nettoBetrag || 0); }, 0)
            };

            // === Aktionen ===
            var changeStatus = function(id, newStatus) {
                var updated = eintraege.map(function(e) {
                    if (e.id !== id) return e;
                    var upd = Object.assign({}, e, { status: newStatus, geaendertAm: new Date().toISOString() });
                    if (newStatus === 'bezahlt' && !upd.zahlungen) upd.zahlungen = [];
                    return upd;
                });
                saveEintraege(updated);
            };

            var deleteEntry = function(id) {
                if (!confirm('Eintrag wirklich stornieren?\n(GoBD: Stornierung statt Loeschung)')) return;
                changeStatus(id, 'storniert');
            };

            var startEdit = function(entry) {
                setEditId(entry.id);
                setEditData(Object.assign({}, entry));
            };
            var saveEdit = function() {
                var updated = eintraege.map(function(e) { return e.id === editId ? Object.assign({}, editData, { geaendertAm: new Date().toISOString() }) : e; });
                saveEintraege(updated);
                setEditId(null); setEditData({});
            };

            // Zahlungseingang buchen
            var openZahlungDialog = function(entry) {
                var skontoAktiv = entry.skontoFrist && entry.skontoFrist >= today;
                setZahlungEintragId(entry.id);
                setZahlungData({
                    datum: today,
                    betrag: skontoAktiv ? String(entry.forderungMitSkonto || entry.bruttoBetrag || 0) : String(entry.forderungBrutto || entry.restbetrag || entry.bruttoBetrag || 0),
                    art: 'ueberweisung',
                    referenz: '',
                    mitSkonto: skontoAktiv
                });
                setShowZahlungDialog(true);
            };

            var bucheZahlung = function() {
                var betrag = parseFloat(zahlungData.betrag) || 0;
                if (betrag <= 0) { alert('Bitte Betrag eingeben.'); return; }
                var updated = eintraege.map(function(e) {
                    if (e.id !== zahlungEintragId) return e;
                    var upd = Object.assign({}, e);
                    if (!upd.zahlungen) upd.zahlungen = [];
                    upd.zahlungen = upd.zahlungen.concat([{
                        id: 'ZE_' + Date.now(), datum: zahlungData.datum,
                        betrag: betrag, art: zahlungData.art,
                        referenz: zahlungData.referenz, mitSkonto: zahlungData.mitSkonto
                    }]);
                    upd.zahlungsSumme = upd.zahlungen.reduce(function(s, z) { return s + (z.betrag || 0); }, 0);
                    var forderung = upd.forderungBrutto || upd.bruttoBetrag || 0;
                    upd.restbetrag = Math.max(0, forderung - upd.zahlungsSumme);
                    upd.status = upd.restbetrag <= 0.01 ? 'bezahlt' : 'teilbezahlt';
                    upd.geaendertAm = new Date().toISOString();
                    return upd;
                });
                saveEintraege(updated);
                setShowZahlungDialog(false);
            };

            // Manueller Eintrag
            var addManualEntry = function() {
                var newEntry = {
                    id: 'RE_' + Date.now(), lfdNr: eintraege.length + 1,
                    dokumentNr: '', dokumentTyp: 'einzel', dokumentLabel: 'Rechnung',
                    datum: today, kundeName: kunde ? (kunde.auftraggeber || kunde.name || '') : '',
                    kundeId: kunde ? (kunde._driveFolderId || kunde.id || '') : '',
                    kundeTyp: 'b2b', bauvorhaben: kunde ? (kunde.adresse || '') : '',
                    nettoBetrag: 0, mwstSatz: settings.standardMwst, mwstBetrag: 0, bruttoBetrag: 0,
                    zahlungszielTage: settings.standardZahlungsziel,
                    faelligkeitsDatum: '', skontoProzent: settings.standardSkonto,
                    skontoTage: settings.standardSkontoTage, forderungBrutto: 0,
                    zahlungen: [], zahlungsSumme: 0, restbetrag: 0,
                    status: 'offen', mahnStufe: 0, notiz: '',
                    erstelltAm: new Date().toISOString(), geaendertAm: new Date().toISOString()
                };
                saveEintraege([newEntry].concat(eintraege));
                startEdit(newEntry);
            };

            // DATEV-Export (CSV)
            var exportDATEV = function() {
                var csv = 'Umsatz;Soll/Haben;Konto;Gegenkonto;BU-Schluessel;Belegdatum;Belegfeld;Buchungstext;Skonto\n';
                eintraege.forEach(function(e) {
                    if (e.status === 'storniert') return;
                    var brutto = (e.bruttoBetrag || 0).toFixed(2).replace('.', ',');
                    var datum = (e.datum || '').split('-').reverse().join('');
                    csv += brutto + ';S;1400;8400;9;' + datum + ';' + (e.dokumentNr || e.rechnungsNr || '') + ';' + (e.kundeName || e.kunde || '') + ' ' + (e.dokumentLabel || e.typ || '') + ';' + ((e.skontoProzent || 0) > 0 ? (e.skontoProzent + '%/' + e.skontoTage + 'T') : '') + '\n';
                });
                var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a'); a.href = url; a.download = 'Ausgangsbuch_DATEV_' + today.replace(/-/g, '') + '.csv';
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            };

            // Styles
            var labelStyle = {fontSize:'11px', color:'var(--text-muted)', display:'block', marginBottom:'3px', fontFamily:'Source Sans 3, sans-serif'};
            var inputStyle = {width:'100%', padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'14px', color:'var(--text-white)', boxSizing:'border-box', fontFamily:'Source Sans 3, sans-serif'};

            // === HAUPTANSICHT ===
            return (
                <div className="page-container" style={{padding:'16px', minHeight:'100vh', paddingBottom:'20px'}}>
                    {/* Header */}
                    <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px'}}>
                        <button onClick={onBack} style={{padding:'10px 16px', borderRadius:'var(--radius-md)', border:'none', background:'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))', color:'#fff', cursor:'pointer', fontSize:'12px', fontWeight:'600', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.8px', boxShadow:'0 4px 15px rgba(196, 30, 30, 0.3)', touchAction:'manipulation'}}>{'\u2190'} Zurueck</button>
                        <div style={{flex:1}}>
                            <div style={{fontSize:'17px', fontWeight:'700', color:'var(--text-white)', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Ausgangsbuch</div>
                            <div style={{fontSize:'11px', color:'var(--text-muted)'}}>{eintraege.length} Eintraege {'\u00b7'} {fmt(stats.summeOffen)} {'\u20ac'} offen</div>
                        </div>
                        <button onClick={exportDATEV} style={{padding:'6px 10px', background:'var(--bg-tertiary)', color:'var(--text-secondary)', border:'1px solid var(--border-color)', borderRadius:'8px', fontSize:'10px', fontWeight:'600', cursor:'pointer', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', touchAction:'manipulation'}}>DATEV</button>
                    </div>

                    {/* Alarm-Banner */}
                    {stats.ueberfaellig > 0 && (
                        <div onClick={function(){ setFilterStatus('ueberfaellig'); }}
                            style={{padding:'12px 16px', marginBottom:'12px', background:'rgba(231,76,60,0.12)', border:'1px solid rgba(231,76,60,0.3)', borderRadius:'var(--radius-md)', display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', touchAction:'manipulation'}}>
                            <span style={{fontSize:'20px'}}>{'\ud83d\udea8'}</span>
                            <div>
                                <div style={{fontWeight:'700', fontSize:'13px', color:'var(--accent-red-light)'}}>{stats.ueberfaellig} ueberfaellige Rechnung{stats.ueberfaellig > 1 ? 'en' : ''}!</div>
                                <div style={{fontSize:'11px', color:'var(--text-muted)'}}>Zahlungsziel ueberschritten {'\u2014'} Klicken zum Filtern</div>
                            </div>
                        </div>
                    )}

                    {/* Statistik-Karten */}
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'6px', marginBottom:'12px'}}>
                        <div style={{padding:'10px 6px', background:'var(--bg-secondary)', borderRadius:'10px', textAlign:'center', border:'1px solid var(--border-color)'}}>
                            <div style={{fontSize:'20px', fontWeight:'700', color:'var(--accent-orange-light)', fontFamily:'Oswald, sans-serif'}}>{stats.offen}</div>
                            <div style={{fontSize:'9px', color:'var(--text-muted)', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Offen</div>
                        </div>
                        <div style={{padding:'10px 6px', background:'var(--bg-secondary)', borderRadius:'10px', textAlign:'center', border:'1px solid var(--border-color)'}}>
                            <div style={{fontSize:'13px', fontWeight:'700', color:'var(--accent-red-light)', fontFamily:'Oswald, sans-serif'}}>{fmt(stats.summeOffen)}{'\u20ac'}</div>
                            <div style={{fontSize:'9px', color:'var(--text-muted)', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Ausstehend</div>
                        </div>
                        <div style={{padding:'10px 6px', background:'var(--bg-secondary)', borderRadius:'10px', textAlign:'center', border:'1px solid var(--border-color)'}}>
                            <div style={{fontSize:'13px', fontWeight:'700', color:'var(--success)', fontFamily:'Oswald, sans-serif'}}>{fmt(stats.summeBezahlt)}{'\u20ac'}</div>
                            <div style={{fontSize:'9px', color:'var(--text-muted)', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Bezahlt</div>
                        </div>
                        <div style={{padding:'10px 6px', background:'var(--bg-secondary)', borderRadius:'10px', textAlign:'center', border:'1px solid var(--border-color)'}}>
                            <div style={{fontSize:'13px', fontWeight:'700', color:'var(--accent-blue)', fontFamily:'Oswald, sans-serif'}}>{fmt(stats.gesamtJahr)}{'\u20ac'}</div>
                            <div style={{fontSize:'9px', color:'var(--text-muted)', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Jahr netto</div>
                        </div>
                    </div>

                    {/* Tab-Navigation */}
                    <div style={{display:'flex', gap:0, background:'var(--bg-secondary)', borderRadius:'12px', padding:'3px', marginBottom:'12px'}}>
                        {[{id:'liste', label:'Liste'}, {id:'analyse', label:'Analyse'}, {id:'einstellungen', label:'Einstellungen'}].map(function(tab) {
                            var aktiv = ansicht === tab.id;
                            return (
                                <button key={tab.id} onClick={function(){ setAnsicht(tab.id); }}
                                    style={{flex:1, padding:'9px 8px', borderRadius:'10px', border:'none', cursor:'pointer',
                                        background: aktiv ? 'var(--accent-blue)' : 'transparent',
                                        color: aktiv ? '#fff' : 'var(--text-muted)',
                                        fontFamily:'Oswald, sans-serif', fontSize:'11px', fontWeight: aktiv ? '600' : '500',
                                        textTransform:'uppercase', letterSpacing:'0.8px', touchAction:'manipulation',
                                        transition:'all 0.2s ease'}}>{tab.label}</button>
                            );
                        })}
                    </div>

                    {/* === LISTENANSICHT === */}
                    {ansicht === 'liste' && (
                        <div>
                            {/* Suchfeld */}
                            <input type="text" value={suchtext} onChange={function(e){ setSuchtext(e.target.value); }}
                                placeholder="RE-Nr., Kunde, Bauvorhaben suchen..."
                                style={{width:'100%', padding:'12px 16px', background:'var(--bg-card)', border:'2px solid var(--border-color)', borderRadius:'var(--radius-md)', fontSize:'14px', color:'var(--text-white)', boxSizing:'border-box', marginBottom:'10px', fontFamily:'Source Sans 3, sans-serif'}} />

                            {/* Filter-Tabs */}
                            <div style={{display:'flex', gap:'4px', marginBottom:'10px', flexWrap:'wrap', alignItems:'center'}}>
                                {['alle', 'offen', 'ueberfaellig', 'teilbezahlt', 'bezahlt', 'gemahnt', 'storniert'].map(function(f) {
                                    var label = f === 'alle' ? 'Alle' : (STATUS[f] ? STATUS[f].label : f);
                                    var aktiv = filterStatus === f;
                                    return (
                                        <button key={f} onClick={function() { setFilterStatus(f); }}
                                            style={{padding:'5px 10px', border:'none', borderRadius:'var(--radius-sm)', fontSize:'11px', fontWeight:'600', cursor:'pointer', touchAction:'manipulation',
                                                background: aktiv ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                                                color: aktiv ? 'white' : 'var(--text-muted)',
                                                fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.3px'}}>{label}</button>
                                    );
                                })}
                                <button onClick={addManualEntry} style={{marginLeft:'auto', padding:'5px 12px', background:'var(--success)', color:'white', border:'none', borderRadius:'var(--radius-sm)', fontSize:'11px', fontWeight:'700', cursor:'pointer', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px', touchAction:'manipulation'}}>+ Neu</button>
                            </div>

                            {/* Rechnungsliste */}
                            <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                                {filtered.length === 0 && (
                                    <div style={{textAlign:'center', padding:'30px', color:'var(--text-muted)', fontSize:'13px', background:'var(--bg-secondary)', borderRadius:'var(--radius-md)'}}>
                                        {eintraege.length === 0 ? 'Noch keine Rechnungen im Ausgangsbuch.\nErstelle eine Rechnung im Rechnungsmodul \u2014 sie wird automatisch hier gespeichert!' : 'Keine Eintraege fuer diesen Filter.'}
                                    </div>
                                )}
                                {filtered.map(function(entry) {
                                    var daysInfo = getDaysInfo(entry);
                                    var isOverdue = daysInfo && daysInfo.overdue;
                                    var isWarning = daysInfo && daysInfo.warning;
                                    var statusCfg = STATUS[entry.status] || STATUS.offen;
                                    var verzugszinsen = berechneVerzugszinsen(entry);
                                    var dokumentNr = entry.dokumentNr || entry.rechnungsNr || '\u2013';
                                    var kundeName = entry.kundeName || entry.kunde || '';
                                    var typLabel = entry.dokumentLabel || entry.typ || '';

                                    return (
                                        <div key={entry.id} style={{
                                            padding:'12px 14px', borderRadius:'var(--radius-md)',
                                            border:'1px solid ' + (isOverdue ? '#e74c3c' : isWarning ? '#f39c12' : 'var(--border-color)'),
                                            background: isOverdue ? 'rgba(231,76,60,0.06)' : isWarning ? 'rgba(243,156,18,0.06)' : 'var(--bg-secondary)',
                                            transition:'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'}}>
                                            {/* Zeile 1: Nr + Status */}
                                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px'}}>
                                                <div style={{fontWeight:'700', fontSize:'14px', color:'var(--accent-blue)', fontFamily:'Oswald, sans-serif'}}>{dokumentNr}</div>
                                                <div style={{display:'flex', gap:'4px', alignItems:'center'}}>
                                                    {isOverdue && <span style={{fontSize:'10px', color:'#e74c3c', fontWeight:'700'}}>{Math.abs(daysInfo.days)}T ueberfaellig!</span>}
                                                    {isWarning && !isOverdue && <span style={{fontSize:'10px', color:'#f39c12', fontWeight:'700'}}>Faellig in {daysInfo.days}T</span>}
                                                    <span style={{padding:'2px 8px', borderRadius:'6px', fontSize:'10px', fontWeight:'700',
                                                        background: statusCfg.farbe + '22', color: statusCfg.farbe,
                                                        fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.3px'}}>{statusCfg.label}</span>
                                                </div>
                                            </div>
                                            {/* Zeile 2: Typ + Kunde + Betrag */}
                                            <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'3px'}}>
                                                <span style={{color:'var(--text-secondary)'}}>{typLabel} {'\u00b7'} {kundeName.substring(0, 30)}</span>
                                                <span style={{fontWeight:'700', color:'var(--text-primary)', fontFamily:'Source Sans 3, sans-serif'}}>{fmt(entry.bruttoBetrag)} {'\u20ac'}</span>
                                            </div>
                                            {/* Zeile 3: Datum + Faelligkeit */}
                                            <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px', color:'var(--text-muted)', marginBottom:'2px'}}>
                                                <span>Datum: {entry.datum || '\u2013'}{entry.bauvorhaben ? ' \u00b7 ' + entry.bauvorhaben.substring(0, 25) : ''}</span>
                                                <span>Faellig: {entry.faelligkeitsDatum || entry.zahlungszielDatum || '\u2013'}</span>
                                            </div>
                                            {/* Zeile 3b: Verzugszinsen + Restbetrag */}
                                            {(verzugszinsen > 0 || (entry.restbetrag > 0 && entry.restbetrag < entry.bruttoBetrag)) && (
                                                <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px', marginBottom:'2px'}}>
                                                    {verzugszinsen > 0 && <span style={{color:'#e74c3c', fontWeight:'600'}}>Verzugszinsen: {fmt(verzugszinsen)} {'\u20ac'}</span>}
                                                    {entry.restbetrag > 0 && entry.restbetrag < (entry.bruttoBetrag || 0) && <span style={{color:'var(--accent-orange)', fontWeight:'600'}}>Rest: {fmt(entry.restbetrag)} {'\u20ac'}</span>}
                                                </div>
                                            )}
                                            {/* Zeile 4: Aktionen */}
                                            <div style={{display:'flex', gap:'4px', marginTop:'6px', flexWrap:'wrap'}}>
                                                {(entry.status === 'offen' || entry.status === 'ueberfaellig' || entry.status === 'teilbezahlt') && (
                                                    <button onClick={function(){ openZahlungDialog(entry); }}
                                                        style={{padding:'5px 10px', background:'rgba(39,174,96,0.15)', color:'#27ae60', border:'none', borderRadius:'6px', fontSize:'10px', fontWeight:'700', cursor:'pointer', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.3px', touchAction:'manipulation'}}>
                                                        {'\u20ac'} Zahlung
                                                    </button>
                                                )}
                                                {(entry.status === 'ueberfaellig' || entry.status === 'gemahnt') && (
                                                    <button onClick={function(){ alert('Mahnung wird vorbereitet fuer: ' + dokumentNr); }}
                                                        style={{padding:'5px 10px', background:'rgba(231,76,60,0.15)', color:'#e74c3c', border:'none', borderRadius:'6px', fontSize:'10px', fontWeight:'700', cursor:'pointer', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.3px', touchAction:'manipulation'}}>
                                                        Mahnung
                                                    </button>
                                                )}
                                                <button onClick={function(){ startEdit(entry); }}
                                                    style={{padding:'5px 10px', background:'var(--bg-tertiary)', color:'var(--accent-blue)', border:'1px solid var(--border-color)', borderRadius:'6px', fontSize:'10px', fontWeight:'600', cursor:'pointer', touchAction:'manipulation'}}>
                                                    Bearbeiten
                                                </button>
                                                {entry.status !== 'storniert' && (
                                                    <button onClick={function(){ deleteEntry(entry.id); }}
                                                        style={{padding:'5px 10px', background:'var(--bg-tertiary)', color:'#e74c3c', border:'1px solid var(--border-color)', borderRadius:'6px', fontSize:'10px', cursor:'pointer', touchAction:'manipulation'}}>
                                                        Storno
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* === ANALYSE === */}
                    {ansicht === 'analyse' && (
                        <div>
                            {/* Jahresueberblick */}
                            <div style={{padding:'16px', background:'linear-gradient(135deg, rgba(30,136,229,0.1), rgba(39,174,96,0.1))', borderRadius:'12px', marginBottom:'16px', textAlign:'center', border:'1px solid var(--border-color)'}}>
                                <div style={{fontSize:'11px', color:'var(--text-muted)', letterSpacing:'1px', textTransform:'uppercase', fontFamily:'Oswald, sans-serif'}}>Jahresumsatz {new Date().getFullYear()} (netto)</div>
                                <div style={{fontSize:'28px', fontWeight:'700', color:'var(--success)', marginTop:'4px', fontFamily:'Oswald, sans-serif'}}>{fmt(stats.gesamtJahr)} {'\u20ac'}</div>
                            </div>

                            {/* Basiszinssatz-Info */}
                            <div style={{padding:'12px', background:'var(--bg-secondary)', borderRadius:'var(--radius-md)', marginBottom:'14px', border:'1px solid var(--border-color)'}}>
                                <div style={{fontSize:'12px', fontWeight:'700', color:'var(--text-secondary)', marginBottom:'6px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Aktuelle Zinssaetze</div>
                                <div style={{fontSize:'12px', color:'var(--text-primary)', lineHeight:'1.8'}}>
                                    <div>Basiszinssatz (ab 01.01.2026): <strong>{getBasiszinssatz(today)}%</strong></div>
                                    <div>Verzugszins B2C (Verbraucher): <strong style={{color:'var(--accent-orange)'}}>{getVerzugszinssatz(today, true).toFixed(2)}% p.a.</strong></div>
                                    <div>Verzugszins B2B (Unternehmer): <strong style={{color:'var(--accent-red-light)'}}>{getVerzugszinssatz(today, false).toFixed(2)}% p.a.</strong></div>
                                    <div>Mahnpauschale B2B: <strong>40,00 {'\u20ac'}</strong></div>
                                </div>
                            </div>

                            {/* Monatsumsaetze */}
                            <div style={{padding:'12px', background:'var(--bg-secondary)', borderRadius:'var(--radius-md)', marginBottom:'14px', border:'1px solid var(--border-color)'}}>
                                <div style={{fontSize:'12px', fontWeight:'700', color:'var(--text-secondary)', marginBottom:'10px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Monatsumsaetze (brutto)</div>
                                {(function() {
                                    var monatsUmsaetze = {};
                                    eintraege.forEach(function(e) {
                                        if (e.status === 'storniert') return;
                                        var monat = (e.datum || '').substring(0, 7);
                                        if (!monat) return;
                                        if (!monatsUmsaetze[monat]) monatsUmsaetze[monat] = { brutto: 0, count: 0, bezahlt: 0 };
                                        monatsUmsaetze[monat].brutto += (e.bruttoBetrag || 0);
                                        monatsUmsaetze[monat].count++;
                                        if (e.status === 'bezahlt') monatsUmsaetze[monat].bezahlt += (e.bruttoBetrag || 0);
                                    });
                                    var monate = Object.keys(monatsUmsaetze).sort().reverse().slice(0, 12);
                                    var maxBrutto = Math.max.apply(null, monate.map(function(m) { return monatsUmsaetze[m].brutto; }).concat([1]));
                                    var monatsnamen = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
                                    if (monate.length === 0) return <div style={{textAlign:'center', padding:'20px', color:'var(--text-muted)', fontSize:'12px'}}>Noch keine Daten vorhanden.</div>;
                                    return monate.map(function(m) {
                                        var d = monatsUmsaetze[m];
                                        var pct = maxBrutto > 0 ? (d.brutto / maxBrutto * 100) : 0;
                                        var parts = m.split('-');
                                        var label = monatsnamen[parseInt(parts[1])] + ' ' + parts[0];
                                        return (
                                            <div key={m} style={{marginBottom:'8px'}}>
                                                <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', color:'var(--text-secondary)', marginBottom:'2px'}}>
                                                    <span>{label} ({d.count} RE)</span>
                                                    <span style={{fontWeight:'700'}}>{fmt(d.brutto)} {'\u20ac'}</span>
                                                </div>
                                                <div style={{height:'14px', background:'var(--bg-tertiary)', borderRadius:'7px', overflow:'hidden'}}>
                                                    <div style={{height:'100%', width:pct + '%', borderRadius:'7px', background:'linear-gradient(90deg, #1E88E5, #27ae60)', transition:'width 0.3s'}} />
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* Forderungsalterung (Aging Report) */}
                            <div style={{padding:'12px', background:'var(--bg-secondary)', borderRadius:'var(--radius-md)', border:'1px solid var(--border-color)'}}>
                                <div style={{fontSize:'12px', fontWeight:'700', color:'var(--text-secondary)', marginBottom:'10px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Forderungsalterung</div>
                                {(function() {
                                    var buckets = { 'Nicht faellig': 0, '1-15 Tage': 0, '16-30 Tage': 0, '31-60 Tage': 0, '61-90 Tage': 0, '>90 Tage': 0 };
                                    eintraege.forEach(function(e) {
                                        if (e.status === 'bezahlt' || e.status === 'storniert' || e.status === 'gutschrift') return;
                                        var di = getDaysInfo(e);
                                        if (!di) return;
                                        var d = -di.days; // positive = ueberfaellig
                                        if (d <= 0) buckets['Nicht faellig'] += (e.restbetrag || e.bruttoBetrag || 0);
                                        else if (d <= 15) buckets['1-15 Tage'] += (e.restbetrag || e.bruttoBetrag || 0);
                                        else if (d <= 30) buckets['16-30 Tage'] += (e.restbetrag || e.bruttoBetrag || 0);
                                        else if (d <= 60) buckets['31-60 Tage'] += (e.restbetrag || e.bruttoBetrag || 0);
                                        else if (d <= 90) buckets['61-90 Tage'] += (e.restbetrag || e.bruttoBetrag || 0);
                                        else buckets['>90 Tage'] += (e.restbetrag || e.bruttoBetrag || 0);
                                    });
                                    var colors = ['#27ae60', '#f39c12', '#e67e22', '#e74c3c', '#c0392b', '#8e44ad'];
                                    return Object.keys(buckets).map(function(key, idx) {
                                        return (
                                            <div key={key} style={{display:'flex', justifyContent:'space-between', padding:'6px 8px', borderBottom:'1px solid var(--border-color)', fontSize:'12px', alignItems:'center'}}>
                                                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                                    <div style={{width:'8px', height:'8px', borderRadius:'50%', background:colors[idx]}} />
                                                    <span style={{color:'var(--text-secondary)'}}>{key}</span>
                                                </div>
                                                <span style={{fontWeight:'700', color: buckets[key] > 0 ? colors[idx] : 'var(--text-muted)'}}>{fmt(buckets[key])} {'\u20ac'}</span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    )}

                    {/* === EINSTELLUNGEN === */}
                    {ansicht === 'einstellungen' && (
                        <div>
                            <div style={{padding:'14px', background:'var(--bg-secondary)', borderRadius:'var(--radius-md)', marginBottom:'14px', border:'1px solid var(--border-color)'}}>
                                <div style={{fontSize:'13px', fontWeight:'700', color:'var(--text-white)', marginBottom:'12px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Zahlungskonditionen</div>
                                {[
                                    { key: 'standardZahlungsziel', label: 'Standard-Zahlungsziel (Tage)' },
                                    { key: 'standardMwst', label: 'Standard MwSt-Satz (%)' },
                                    { key: 'standardSkonto', label: 'Standard Skonto (%)' },
                                    { key: 'standardSkontoTage', label: 'Standard Skonto-Frist (Tage)' },
                                    { key: 'standardSicherheitseinbehalt', label: 'Standard Sicherheitseinbehalt (%)' }
                                ].map(function(field) {
                                    return (
                                        <div key={field.key} style={{marginBottom:'10px'}}>
                                            <label style={labelStyle}>{field.label}</label>
                                            <input type="text" inputMode="numeric" value={settings[field.key] || ''} onChange={function(e) {
                                                var n = Object.assign({}, settings); n[field.key] = parseFloat(e.target.value) || 0; saveSettings(n);
                                            }} style={inputStyle} />
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{padding:'14px', background:'var(--bg-secondary)', borderRadius:'var(--radius-md)', marginBottom:'14px', border:'1px solid var(--border-color)'}}>
                                <div style={{fontSize:'13px', fontWeight:'700', color:'var(--text-white)', marginBottom:'12px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Mahnwesen</div>
                                {[
                                    { key: 'alarmTageVorher', label: 'Alarm X Tage vor Zahlungsziel' },
                                    { key: 'mahnfrist1_tage', label: 'Zahlungserinnerung nach (Tage)' },
                                    { key: 'mahnfrist2_tage', label: '1. Mahnung nach (Tage)' },
                                    { key: 'mahnfrist3_tage', label: 'Letzte Mahnung nach (Tage)' },
                                    { key: 'mahnpauschaleB2B', label: 'Mahnpauschale B2B (EUR)' }
                                ].map(function(field) {
                                    return (
                                        <div key={field.key} style={{marginBottom:'10px'}}>
                                            <label style={labelStyle}>{field.label}</label>
                                            <input type="text" inputMode="numeric" value={settings[field.key] || ''} onChange={function(e) {
                                                var n = Object.assign({}, settings); n[field.key] = parseFloat(e.target.value) || 0; saveSettings(n);
                                            }} style={inputStyle} />
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{padding:'14px', background:'var(--bg-secondary)', borderRadius:'var(--radius-md)', border:'1px solid var(--border-color)'}}>
                                <div style={{fontSize:'13px', fontWeight:'700', color:'var(--text-white)', marginBottom:'12px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Bankdaten</div>
                                {[
                                    { key: 'bankname', label: 'Bankname' },
                                    { key: 'iban', label: 'IBAN' },
                                    { key: 'bic', label: 'BIC' },
                                    { key: 'steuernummer', label: 'Steuernummer' }
                                ].map(function(field) {
                                    return (
                                        <div key={field.key} style={{marginBottom:'10px'}}>
                                            <label style={labelStyle}>{field.label}</label>
                                            <input type="text" value={settings[field.key] || ''} onChange={function(e) {
                                                var n = Object.assign({}, settings); n[field.key] = e.target.value; saveSettings(n);
                                            }} style={inputStyle} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* === ZAHLUNGSEINGANG MODAL === */}
                    {showZahlungDialog && (
                        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}
                            onClick={function(){ setShowZahlungDialog(false); }}>
                            <div onClick={function(e){e.stopPropagation();}} style={{background:'var(--bg-secondary)', borderRadius:'var(--radius-lg)', padding:'28px 24px', maxWidth:'380px', width:'100%', boxShadow:'var(--shadow-lg)', animation:'scaleIn 0.3s ease-out'}}>
                                <div style={{fontSize:'18px', fontWeight:'600', color:'var(--text-white)', marginBottom:'16px', fontFamily:'Oswald, sans-serif'}}>Zahlungseingang buchen</div>
                                <div style={{marginBottom:'10px'}}>
                                    <label style={labelStyle}>Zahlungsdatum</label>
                                    <input type="date" value={zahlungData.datum} onChange={function(e){ setZahlungData(Object.assign({}, zahlungData, {datum:e.target.value})); }} style={inputStyle} />
                                </div>
                                <div style={{marginBottom:'10px'}}>
                                    <label style={labelStyle}>Betrag ({'\u20ac'})</label>
                                    <input type="text" inputMode="decimal" value={zahlungData.betrag} onChange={function(e){ setZahlungData(Object.assign({}, zahlungData, {betrag:e.target.value})); }} style={inputStyle} />
                                </div>
                                <div style={{marginBottom:'10px'}}>
                                    <label style={labelStyle}>Zahlungsart</label>
                                    <select value={zahlungData.art} onChange={function(e){ setZahlungData(Object.assign({}, zahlungData, {art:e.target.value})); }} style={inputStyle}>
                                        <option value="ueberweisung">Ueberweisung</option>
                                        <option value="bar">Barzahlung</option>
                                        <option value="scheck">Scheck</option>
                                        <option value="sepa">SEPA-Lastschrift</option>
                                        <option value="paypal">PayPal</option>
                                        <option value="sonstige">Sonstige</option>
                                    </select>
                                </div>
                                <div style={{marginBottom:'10px'}}>
                                    <label style={labelStyle}>Referenz / Verwendungszweck</label>
                                    <input type="text" value={zahlungData.referenz} onChange={function(e){ setZahlungData(Object.assign({}, zahlungData, {referenz:e.target.value})); }} placeholder="z.B. SEPA-Ref" style={inputStyle} />
                                </div>
                                <div style={{marginBottom:'14px'}}>
                                    <label style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'12px', color:'var(--text-secondary)', cursor:'pointer'}}>
                                        <input type="checkbox" checked={zahlungData.mitSkonto} onChange={function(e){ setZahlungData(Object.assign({}, zahlungData, {mitSkonto:e.target.checked})); }} />
                                        Skonto genutzt
                                    </label>
                                </div>
                                <div style={{display:'flex', gap:'8px'}}>
                                    <button onClick={function(){ setShowZahlungDialog(false); }}
                                        style={{flex:1, padding:'12px', background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', color:'var(--text-muted)', fontSize:'13px', cursor:'pointer', fontFamily:'Oswald, sans-serif', touchAction:'manipulation'}}>Abbrechen</button>
                                    <button onClick={bucheZahlung}
                                        style={{flex:2, padding:'12px', background:'var(--success)', color:'white', border:'none', borderRadius:'var(--radius-md)', fontSize:'14px', fontWeight:'700', cursor:'pointer', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px', touchAction:'manipulation'}}>Zahlung buchen</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === EDIT MODAL === */}
                    {editId && (
                        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}
                            onClick={function(){ setEditId(null); setEditData({}); }}>
                            <div onClick={function(e){e.stopPropagation();}} style={{width:'95%', maxWidth:'500px', maxHeight:'90vh', overflow:'auto', background:'var(--bg-secondary)', borderRadius:'var(--radius-lg)', padding:'24px', boxShadow:'var(--shadow-lg)'}}>
                                <div style={{fontSize:'18px', fontWeight:'600', color:'var(--text-white)', marginBottom:'16px', fontFamily:'Oswald, sans-serif'}}>Eintrag bearbeiten</div>
                                {[
                                    { key: 'dokumentNr', label: 'Dokumentnummer', type: 'text', fallback: 'rechnungsNr' },
                                    { key: 'dokumentLabel', label: 'Dokumenttyp', type: 'text', fallback: 'typ' },
                                    { key: 'datum', label: 'Datum', type: 'date' },
                                    { key: 'kundeName', label: 'Kunde', type: 'text', fallback: 'kunde' },
                                    { key: 'bauvorhaben', label: 'Bauvorhaben', type: 'text' },
                                    { key: 'nettoBetrag', label: 'Netto (EUR)', type: 'numeric' },
                                    { key: 'mwstSatz', label: 'MwSt (%)', type: 'numeric' },
                                    { key: 'bruttoBetrag', label: 'Brutto (EUR)', type: 'numeric' },
                                    { key: 'faelligkeitsDatum', label: 'Faelligkeit', type: 'date', fallback: 'zahlungszielDatum' },
                                    { key: 'status', label: 'Status', type: 'select', options: Object.keys(STATUS) },
                                    { key: 'notiz', label: 'Notiz', type: 'text' }
                                ].map(function(f) {
                                    var val = editData[f.key] != null ? editData[f.key] : (f.fallback ? editData[f.fallback] : '');
                                    var set = function(v) { setEditData(function(prev) { var n = Object.assign({}, prev); n[f.key] = v; if (f.fallback) n[f.fallback] = v; return n; }); };
                                    if (f.type === 'select') {
                                        return (
                                            <div key={f.key} style={{marginBottom:'8px'}}>
                                                <label style={labelStyle}>{f.label}</label>
                                                <select value={val || ''} onChange={function(e){ set(e.target.value); }} style={inputStyle}>
                                                    {f.options.map(function(o) { return <option key={o} value={o}>{STATUS[o] ? STATUS[o].label : o}</option>; })}
                                                </select>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={f.key} style={{marginBottom:'8px'}}>
                                            <label style={labelStyle}>{f.label}</label>
                                            <input type={f.type === 'numeric' ? 'text' : f.type} inputMode={f.type === 'numeric' ? 'decimal' : undefined}
                                                value={val != null ? val : ''} onChange={function(e){ set(f.type === 'numeric' ? parseFloat(e.target.value) || 0 : e.target.value); }}
                                                style={inputStyle} />
                                        </div>
                                    );
                                })}
                                <div style={{display:'flex', gap:'8px', marginTop:'16px'}}>
                                    <button onClick={saveEdit} style={{flex:1, padding:'12px', background:'var(--success)', color:'white', border:'none', borderRadius:'var(--radius-md)', fontSize:'14px', fontWeight:'700', cursor:'pointer', fontFamily:'Oswald, sans-serif', touchAction:'manipulation'}}>Speichern</button>
                                    <button onClick={function(){ setEditId(null); setEditData({}); }} style={{flex:1, padding:'12px', background:'var(--bg-card)', color:'var(--text-secondary)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', fontSize:'13px', cursor:'pointer', touchAction:'manipulation'}}>Abbrechen</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }
