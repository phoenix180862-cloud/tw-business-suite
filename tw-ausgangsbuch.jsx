        function RechnungsAusgangsbuch({ kunde, onBack }) {
            const AB_KEY = 'tw_ausgangsbuch';
            const SETTINGS_KEY = 'tw_ausgangsbuch_settings';

            const [eintraege, setEintraege] = useState([]);
            const [showSettings, setShowSettings] = useState(false);
            const [showAnalyse, setShowAnalyse] = useState(false);
            const [editId, setEditId] = useState(null);
            const [editData, setEditData] = useState({});
            const [filterStatus, setFilterStatus] = useState('alle'); // 'alle' | 'offen' | 'bezahlt' | 'ueberfaellig' | 'gemahnt' | 'storniert'
            const [sortField, setSortField] = useState('datum');
            const [sortDir, setSortDir] = useState('desc');
            const [settings, setSettings] = useState({
                standardMwst: 19,
                standardZahlungsziel: 30,
                standardSkonto: 2,
                standardSkontoTage: 10,
                alarmTageVorher: 3,
                firmenname: 'Thomas Willwacher Fliesenlegermeister e.K.'
            });

            // Laden
            useEffect(function() {
                try {
                    var data = JSON.parse(localStorage.getItem(AB_KEY) || '[]');
                    setEintraege(data);
                    var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
                    if (s) setSettings(s);
                } catch(e) {}
            }, []);

            // Speichern
            var saveEintraege = function(newData) {
                setEintraege(newData);
                localStorage.setItem(AB_KEY, JSON.stringify(newData));
            };
            var saveSettings = function(newSettings) {
                setSettings(newSettings);
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
            };

            // Formatierung
            var fmt = function(v) { return (parseFloat(v) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
            var today = new Date().toISOString().split('T')[0];

            // Alarm-Check: Tage bis/seit Zahlungsziel
            var getDaysInfo = function(entry) {
                if (!entry.zahlungszielDatum || entry.status === 'bezahlt' || entry.status === 'storniert') return null;
                var ziel = new Date(entry.zahlungszielDatum);
                var now = new Date(today);
                var diff = Math.round((ziel - now) / (1000 * 60 * 60 * 24));
                return { days: diff, overdue: diff < 0, warning: diff >= 0 && diff <= settings.alarmTageVorher };
            };

            // Filter + Sort
            var filtered = eintraege.filter(function(e) {
                if (filterStatus === 'alle') return true;
                if (filterStatus === 'ueberfaellig') {
                    var info = getDaysInfo(e);
                    return info && info.overdue;
                }
                return e.status === filterStatus;
            });
            filtered.sort(function(a, b) {
                var va = a[sortField] || '', vb = b[sortField] || '';
                if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va;
                return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
            });

            // Statistiken
            var ueberfaelligeCount = eintraege.filter(function(e) { var i = getDaysInfo(e); return i && i.overdue; }).length;
            var offeneCount = eintraege.filter(function(e) { return e.status === 'offen'; }).length;
            var gesamtOffen = eintraege.filter(function(e) { return e.status === 'offen'; }).reduce(function(s,e) { return s + (e.bruttoBetrag || 0); }, 0);
            var gesamtBezahlt = eintraege.filter(function(e) { return e.status === 'bezahlt'; }).reduce(function(s,e) { return s + (e.bruttoBetrag || 0); }, 0);

            // ── Eintrag bearbeiten ──
            var startEdit = function(entry) {
                setEditId(entry.id);
                setEditData(Object.assign({}, entry));
            };
            var saveEdit = function() {
                var updated = eintraege.map(function(e) { return e.id === editId ? Object.assign({}, editData) : e; });
                saveEintraege(updated);
                setEditId(null);
                setEditData({});
            };
            var cancelEdit = function() { setEditId(null); setEditData({}); };

            // ── Eintrag löschen ──
            var deleteEntry = function(id) {
                if (!confirm('Rechnung wirklich aus dem Ausgangsbuch löschen?')) return;
                saveEintraege(eintraege.filter(function(e) { return e.id !== id; }));
            };

            // ── Status ändern ──
            var changeStatus = function(id, newStatus) {
                var updated = eintraege.map(function(e) {
                    if (e.id !== id) return e;
                    var upd = Object.assign({}, e, { status: newStatus });
                    if (newStatus === 'bezahlt' && !upd.zahlungsDatum) upd.zahlungsDatum = today;
                    if (newStatus === 'bezahlt' && !upd.zahlungsBetrag) upd.zahlungsBetrag = upd.bruttoBetrag;
                    return upd;
                });
                saveEintraege(updated);
            };

            // ── Manueller Eintrag ──
            var addManualEntry = function() {
                var newEntry = {
                    id: 'RE_' + Date.now(),
                    rechnungsNr: '',
                    typ: 'Rechnung',
                    datum: today,
                    kunde: kunde ? (kunde.auftraggeber || kunde.name || '') : '',
                    bauvorhaben: kunde ? (kunde.adresse || kunde.baumassnahme || '') : '',
                    nettoBetrag: 0,
                    mwstBetrag: 0,
                    mwstSatz: settings.standardMwst,
                    bruttoBetrag: 0,
                    zahlungszielTage: settings.standardZahlungsziel,
                    zahlungszielDatum: '',
                    zahlbetrag: 0,
                    status: 'offen',
                    zahlungsDatum: null,
                    notiz: '',
                    erstelltAm: new Date().toISOString()
                };
                var updated = [newEntry, ...eintraege];
                saveEintraege(updated);
                startEdit(newEntry);
            };

            // ═══ UMSATZANALYSE ═══
            var renderAnalyse = function() {
                // Nach Monat gruppieren
                var monatsUmsaetze = {};
                eintraege.forEach(function(e) {
                    if (e.status === 'storniert') return;
                    var monat = (e.datum || '').substring(0, 7); // YYYY-MM
                    if (!monat) return;
                    if (!monatsUmsaetze[monat]) monatsUmsaetze[monat] = { netto: 0, brutto: 0, count: 0, bezahlt: 0 };
                    monatsUmsaetze[monat].netto += (e.nettoBetrag || 0);
                    monatsUmsaetze[monat].brutto += (e.bruttoBetrag || 0);
                    monatsUmsaetze[monat].count++;
                    if (e.status === 'bezahlt') monatsUmsaetze[monat].bezahlt += (e.bruttoBetrag || 0);
                });
                var monate = Object.keys(monatsUmsaetze).sort().reverse();
                var maxBrutto = Math.max.apply(null, monate.map(function(m) { return monatsUmsaetze[m].brutto; }).concat([1]));

                // Quartale
                var quartale = {};
                monate.forEach(function(m) {
                    var parts = m.split('-');
                    var q = 'Q' + Math.ceil(parseInt(parts[1]) / 3) + '/' + parts[0];
                    if (!quartale[q]) quartale[q] = { netto: 0, brutto: 0, count: 0 };
                    quartale[q].netto += monatsUmsaetze[m].netto;
                    quartale[q].brutto += monatsUmsaetze[m].brutto;
                    quartale[q].count += monatsUmsaetze[m].count;
                });

                var jahresGesamt = eintraege.filter(function(e) {
                    return e.status !== 'storniert' && (e.datum || '').startsWith(new Date().getFullYear().toString());
                }).reduce(function(s,e) { return s + (e.nettoBetrag || 0); }, 0);

                var monatsnamen = ['', 'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

                return React.createElement('div', { style: { padding: '16px' } },
                    // Jahresübersicht
                    React.createElement('div', { style: { padding: '14px', background: 'linear-gradient(135deg, rgba(30,136,229,0.1), rgba(46,204,113,0.1))', borderRadius: '12px', marginBottom: '16px', textAlign: 'center' } },
                        React.createElement('div', { style: { fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' } }, 'Jahresumsatz ' + new Date().getFullYear() + ' (netto)'),
                        React.createElement('div', { style: { fontSize: '28px', fontWeight: '700', color: 'var(--success)', marginTop: '4px' } }, fmt(jahresGesamt) + ' €')
                    ),
                    // Monats-Balkendiagramm
                    React.createElement('div', { style: { fontWeight: '700', fontSize: '13px', marginBottom: '8px' } }, '📊 Monatsumsätze (brutto)'),
                    monate.slice(0, 12).map(function(m) {
                        var d = monatsUmsaetze[m];
                        var pct = maxBrutto > 0 ? (d.brutto / maxBrutto * 100) : 0;
                        var parts = m.split('-');
                        var label = monatsnamen[parseInt(parts[1])] + ' ' + parts[0];
                        return React.createElement('div', { key: m, style: { marginBottom: '6px' } },
                            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' } },
                                React.createElement('span', null, label + ' (' + d.count + ' RE)'),
                                React.createElement('span', { style: { fontWeight: '700' } }, fmt(d.brutto) + ' €')
                            ),
                            React.createElement('div', { style: { height: '14px', background: 'var(--bg-tertiary)', borderRadius: '7px', overflow: 'hidden' } },
                                React.createElement('div', { style: { height: '100%', width: pct + '%', borderRadius: '7px', background: 'linear-gradient(90deg, #1E88E5, #27ae60)', transition: 'width 0.3s' } })
                            )
                        );
                    }),
                    // Quartale
                    Object.keys(quartale).length > 0 && React.createElement('div', { style: { marginTop: '16px' } },
                        React.createElement('div', { style: { fontWeight: '700', fontSize: '13px', marginBottom: '8px' } }, '📈 Quartalsumsätze'),
                        Object.keys(quartale).sort().reverse().map(function(q) {
                            return React.createElement('div', { key: q, style: { display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px' } },
                                React.createElement('span', { style: { fontWeight: '600' } }, q + ' (' + quartale[q].count + ' RE)'),
                                React.createElement('span', null, 'Netto: ' + fmt(quartale[q].netto) + ' € · Brutto: ' + fmt(quartale[q].brutto) + ' €')
                            );
                        })
                    )
                );
            };

            // ═══ EINSTELLUNGEN ═══
            var renderSettings = function() {
                var s = Object.assign({}, settings);
                var update = function(key, val) { var n = Object.assign({}, s); n[key] = val; saveSettings(n); };
                var iStyle = { width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' };
                return React.createElement('div', { style: { padding: '16px' } },
                    React.createElement('div', { style: { fontWeight: '700', fontSize: '14px', marginBottom: '12px' } }, '⚙️ Einstellungen'),
                    [
                        { key: 'standardZahlungsziel', label: 'Standard-Zahlungsziel (Tage)', type: 'number' },
                        { key: 'standardMwst', label: 'Standard MwSt-Satz (%)', type: 'number' },
                        { key: 'standardSkonto', label: 'Standard Skonto (%)', type: 'number' },
                        { key: 'standardSkontoTage', label: 'Standard Skonto-Frist (Tage)', type: 'number' },
                        { key: 'alarmTageVorher', label: 'Alarm X Tage vor Zahlungsziel', type: 'number' },
                    ].map(function(field) {
                        return React.createElement('div', { key: field.key, style: { marginBottom: '10px' } },
                            React.createElement('label', { style: { fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' } }, field.label),
                            React.createElement('input', {
                                type: field.type, value: settings[field.key] || '',
                                onChange: function(e) { update(field.key, field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value); },
                                style: iStyle
                            })
                        );
                    })
                );
            };

            // ═══ STATUS-FARBEN ═══
            var statusColors = { offen: '#f39c12', bezahlt: '#27ae60', gemahnt: '#e74c3c', storniert: '#7f8c8d' };
            var statusLabels = { offen: 'Offen', bezahlt: 'Bezahlt', gemahnt: 'Gemahnt', storniert: 'Storniert' };

            // ═══ EDIT-FORMULAR ═══
            var renderEditForm = function() {
                var d = editData;
                var set = function(key, val) { setEditData(function(prev) { var n = Object.assign({}, prev); n[key] = val; return n; }); };
                var iStyle = { width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' };
                return React.createElement('div', { className: 'modal-overlay', style: { zIndex: 4000 } },
                    React.createElement('div', { style: { width: '95%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', background: 'var(--bg-primary)', borderRadius: '16px', padding: '20px' } },
                        React.createElement('div', { style: { fontWeight: '700', fontSize: '15px', marginBottom: '16px' } }, '✏️ Eintrag bearbeiten'),
                        [
                            { key: 'rechnungsNr', label: 'Rechnungsnummer', type: 'text' },
                            { key: 'typ', label: 'Rechnungstyp', type: 'text' },
                            { key: 'datum', label: 'Rechnungsdatum', type: 'date' },
                            { key: 'kunde', label: 'Kunde', type: 'text' },
                            { key: 'bauvorhaben', label: 'Bauvorhaben', type: 'text' },
                            { key: 'nettoBetrag', label: 'Netto (€)', type: 'number' },
                            { key: 'mwstSatz', label: 'MwSt (%)', type: 'number' },
                            { key: 'bruttoBetrag', label: 'Brutto (€)', type: 'number' },
                            { key: 'zahlungszielTage', label: 'Zahlungsziel (Tage)', type: 'number' },
                            { key: 'zahlungszielDatum', label: 'Zahlungsziel Datum', type: 'date' },
                            { key: 'status', label: 'Status', type: 'select', options: ['offen', 'bezahlt', 'gemahnt', 'storniert'] },
                            { key: 'zahlungsDatum', label: 'Zahlung eingegangen am', type: 'date' },
                            { key: 'zahlungsBetrag', label: 'Zahlungsbetrag (€)', type: 'number' },
                            { key: 'notiz', label: 'Notiz', type: 'text' },
                        ].map(function(f) {
                            if (f.type === 'select') {
                                return React.createElement('div', { key: f.key, style: { marginBottom: '8px' } },
                                    React.createElement('label', { style: { fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' } }, f.label),
                                    React.createElement('select', { value: d[f.key] || '', onChange: function(e) { set(f.key, e.target.value); }, style: iStyle },
                                        f.options.map(function(o) { return React.createElement('option', { key: o, value: o }, statusLabels[o] || o); })
                                    )
                                );
                            }
                            return React.createElement('div', { key: f.key, style: { marginBottom: '8px' } },
                                React.createElement('label', { style: { fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' } }, f.label),
                                React.createElement('input', {
                                    type: f.type, value: d[f.key] != null ? d[f.key] : '',
                                    onChange: function(e) { set(f.key, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value); },
                                    style: iStyle
                                })
                            );
                        }),
                        React.createElement('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } },
                            React.createElement('button', { onClick: saveEdit, style: { flex: 1, padding: '10px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' } }, '💾 Speichern'),
                            React.createElement('button', { onClick: cancelEdit, style: { flex: 1, padding: '10px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' } }, 'Abbrechen')
                        )
                    )
                );
            };

            // ═══ HAUPTANSICHT ═══
            return (
                <div className="page-container" style={{padding:'16px', minHeight:'100vh'}}>
                    {/* Header */}
                    <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px'}}>
                        <button onClick={onBack} style={{background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'var(--text-primary)'}}>←</button>
                        <div style={{flex:1}}>
                            <div style={{fontSize:'16px', fontWeight:'700', color:'var(--text-primary)'}}>📒 Rechnungsausgangsbuch</div>
                            <div style={{fontSize:'11px', color:'var(--text-muted)'}}>{eintraege.length} Einträge · {fmt(gesamtOffen)} € offen</div>
                        </div>
                        <button onClick={function() { setShowAnalyse(!showAnalyse); setShowSettings(false); }} style={{padding:'6px 10px', background: showAnalyse ? 'var(--accent-blue)' : 'var(--bg-tertiary)', color: showAnalyse ? 'white' : 'var(--text-secondary)', border:'none', borderRadius:'8px', fontSize:'11px', fontWeight:'600', cursor:'pointer'}}>📊</button>
                        <button onClick={function() { setShowSettings(!showSettings); setShowAnalyse(false); }} style={{padding:'6px 10px', background: showSettings ? 'var(--accent-blue)' : 'var(--bg-tertiary)', color: showSettings ? 'white' : 'var(--text-secondary)', border:'none', borderRadius:'8px', fontSize:'11px', fontWeight:'600', cursor:'pointer'}}>⚙️</button>
                    </div>

                    {/* Alarm-Banner */}
                    {ueberfaelligeCount > 0 && (
                        <div style={{padding:'10px 14px', marginBottom:'12px', background:'rgba(231,76,60,0.12)', border:'1px solid rgba(231,76,60,0.3)', borderRadius:'10px', display:'flex', alignItems:'center', gap:'10px', cursor:'pointer'}}
                            onClick={function() { setFilterStatus('ueberfaellig'); }}>
                            <span style={{fontSize:'20px'}}>🚨</span>
                            <div>
                                <div style={{fontWeight:'700', fontSize:'13px', color:'var(--accent-red-light)'}}>{ueberfaelligeCount} überfällige Rechnung{ueberfaelligeCount > 1 ? 'en' : ''}!</div>
                                <div style={{fontSize:'11px', color:'var(--text-muted)'}}>Zahlungsziel überschritten -- Klicken zum Filtern</div>
                            </div>
                        </div>
                    )}

                    {/* Statistik-Karten */}
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px', marginBottom:'12px'}}>
                        <div style={{padding:'8px', background:'var(--bg-secondary)', borderRadius:'10px', textAlign:'center'}}>
                            <div style={{fontSize:'18px', fontWeight:'700', color:'var(--accent-orange-light)'}}>{offeneCount}</div>
                            <div style={{fontSize:'9px', color:'var(--text-muted)'}}>Offen</div>
                        </div>
                        <div style={{padding:'8px', background:'var(--bg-secondary)', borderRadius:'10px', textAlign:'center'}}>
                            <div style={{fontSize:'14px', fontWeight:'700', color:'var(--accent-red-light)'}}>{fmt(gesamtOffen)}€</div>
                            <div style={{fontSize:'9px', color:'var(--text-muted)'}}>Ausstehend</div>
                        </div>
                        <div style={{padding:'8px', background:'var(--bg-secondary)', borderRadius:'10px', textAlign:'center'}}>
                            <div style={{fontSize:'14px', fontWeight:'700', color:'var(--success)'}}>{fmt(gesamtBezahlt)}€</div>
                            <div style={{fontSize:'9px', color:'var(--text-muted)'}}>Bezahlt</div>
                        </div>
                    </div>

                    {/* Settings / Analyse Panel */}
                    {showSettings && renderSettings()}
                    {showAnalyse && renderAnalyse()}

                    {/* Filter-Tabs + Neuer Eintrag */}
                    <div style={{display:'flex', gap:'4px', marginBottom:'10px', flexWrap:'wrap', alignItems:'center'}}>
                        {['alle', 'offen', 'ueberfaellig', 'bezahlt', 'gemahnt', 'storniert'].map(function(f) {
                            var label = f === 'ueberfaellig' ? '⚠ Überfällig' : f === 'alle' ? 'Alle' : (statusLabels[f] || f);
                            return React.createElement('button', {
                                key: f, onClick: function() { setFilterStatus(f); },
                                style: {
                                    padding: '4px 10px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                                    background: filterStatus === f ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                                    color: filterStatus === f ? 'white' : 'var(--text-muted)'
                                }
                            }, label);
                        })}
                        <button onClick={addManualEntry} style={{marginLeft:'auto', padding:'4px 10px', background:'var(--success)', color:'white', border:'none', borderRadius:'6px', fontSize:'11px', fontWeight:'700', cursor:'pointer'}}>+ Neu</button>
                    </div>

                    {/* Rechnungsliste */}
                    <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                        {filtered.length === 0 && (
                            <div style={{textAlign:'center', padding:'30px', color:'var(--text-muted)', fontSize:'13px'}}>
                                {eintraege.length === 0 ? 'Noch keine Rechnungen im Ausgangsbuch.\nErstelle eine Rechnung im Rechnungsmodul -- sie wird automatisch hier gespeichert!' : 'Keine Einträge für diesen Filter.'}
                            </div>
                        )}
                        {filtered.map(function(entry) {
                            var daysInfo = getDaysInfo(entry);
                            var isOverdue = daysInfo && daysInfo.overdue;
                            var isWarning = daysInfo && daysInfo.warning;
                            var borderColor = isOverdue ? '#e74c3c' : isWarning ? '#f39c12' : 'var(--border-subtle)';

                            return React.createElement('div', {
                                key: entry.id,
                                style: {
                                    padding: '10px 12px', borderRadius: '10px', border: '1px solid ' + borderColor,
                                    background: isOverdue ? 'rgba(231,76,60,0.06)' : isWarning ? 'rgba(243,156,18,0.06)' : 'var(--bg-secondary)',
                                    position: 'relative'
                                }
                            },
                                // Zeile 1: Nr + Typ + Status
                                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } },
                                    React.createElement('div', { style: { fontWeight: '700', fontSize: '13px', color: 'var(--accent-blue)' } }, entry.rechnungsNr || '–'),
                                    React.createElement('div', { style: { display: 'flex', gap: '4px', alignItems: 'center' } },
                                        isOverdue && React.createElement('span', { style: { fontSize: '10px', color: '#e74c3c', fontWeight: '700' } }, Math.abs(daysInfo.days) + 'T überfällig!'),
                                        isWarning && React.createElement('span', { style: { fontSize: '10px', color: '#f39c12', fontWeight: '700' } }, 'Fällig in ' + daysInfo.days + 'T'),
                                        React.createElement('span', { style: {
                                            padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                                            background: (statusColors[entry.status] || '#999') + '22', color: statusColors[entry.status] || '#999'
                                        } }, statusLabels[entry.status] || entry.status)
                                    )
                                ),
                                // Zeile 2: Kunde + Betrag
                                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' } },
                                    React.createElement('span', { style: { color: 'var(--text-secondary)' } }, (entry.typ || '') + ' · ' + (entry.kunde || '').substring(0, 30)),
                                    React.createElement('span', { style: { fontWeight: '700', color: 'var(--text-primary)' } }, fmt(entry.bruttoBetrag) + ' €')
                                ),
                                // Zeile 3: Datum + Zahlungsziel
                                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' } },
                                    React.createElement('span', null, 'Datum: ' + (entry.datum || '–') + (entry.bauvorhaben ? ' · ' + entry.bauvorhaben.substring(0, 25) : '')),
                                    React.createElement('span', null, 'Ziel: ' + (entry.zahlungszielDatum || '–'))
                                ),
                                // Zeile 4: Aktionen
                                React.createElement('div', { style: { display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' } },
                                    entry.status === 'offen' && React.createElement('button', {
                                        onClick: function() { changeStatus(entry.id, 'bezahlt'); },
                                        style: { padding: '3px 8px', background: 'rgba(46,204,113,0.15)', color: '#27ae60', border: 'none', borderRadius: '5px', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }
                                    }, '✓ Bezahlt'),
                                    entry.status === 'offen' && isOverdue && React.createElement('button', {
                                        onClick: function() { changeStatus(entry.id, 'gemahnt'); },
                                        style: { padding: '3px 8px', background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: 'none', borderRadius: '5px', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }
                                    }, '⚠ Gemahnt'),
                                    React.createElement('button', {
                                        onClick: function() { startEdit(entry); },
                                        style: { padding: '3px 8px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: 'none', borderRadius: '5px', fontSize: '10px', cursor: 'pointer' }
                                    }, '✏️'),
                                    React.createElement('button', {
                                        onClick: function() { deleteEntry(entry.id); },
                                        style: { padding: '3px 8px', background: 'var(--bg-tertiary)', color: '#e74c3c', border: 'none', borderRadius: '5px', fontSize: '10px', cursor: 'pointer' }
                                    }, '🗑️')
                                )
                            );
                        })}
                    </div>

                    {/* Edit Modal */}
                    {editId && renderEditForm()}
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           BAUSTELLEN-APP ADMIN -- Firebase-Anbindung
           Kunden an Baustellen-App pushen, Mitarbeiter freigeben
           ═══════════════════════════════════════════ */
