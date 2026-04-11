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

                return React.createElement('div', { className: 'ab-analyse-panel' },
                    // Jahresuebersicht
                    React.createElement('div', { className: 'ab-jahres-card' },
                        React.createElement('div', { className: 'ab-jahres-label' }, 'Jahresumsatz ' + new Date().getFullYear() + ' (netto)'),
                        React.createElement('div', { className: 'ab-jahres-value' }, fmt(jahresGesamt) + ' \u20AC')
                    ),
                    // Monats-Balkendiagramm
                    React.createElement('div', { className: 'ab-analyse-section-title' }, '\uD83D\uDCCA Monatsumsaetze (brutto)'),
                    monate.slice(0, 12).map(function(m) {
                        var d = monatsUmsaetze[m];
                        var pct = maxBrutto > 0 ? (d.brutto / maxBrutto * 100) : 0;
                        var parts = m.split('-');
                        var label = monatsnamen[parseInt(parts[1])] + ' ' + parts[0];
                        return React.createElement('div', { key: m, className: 'ab-bar-row' },
                            React.createElement('div', { className: 'ab-bar-header' },
                                React.createElement('span', null, label + ' (' + d.count + ' RE)'),
                                React.createElement('span', null, fmt(d.brutto) + ' \u20AC')
                            ),
                            React.createElement('div', { className: 'ab-bar-track' },
                                React.createElement('div', { className: 'ab-bar-fill', style: { width: pct + '%' } })
                            )
                        );
                    }),
                    // Quartale
                    Object.keys(quartale).length > 0 && React.createElement('div', { style: { marginTop: '16px' } },
                        React.createElement('div', { className: 'ab-analyse-section-title' }, '\uD83D\uDCC8 Quartalsumsaetze'),
                        Object.keys(quartale).sort().reverse().map(function(q) {
                            return React.createElement('div', { key: q, className: 'ab-quartal-row' },
                                React.createElement('span', null, q + ' (' + quartale[q].count + ' RE)'),
                                React.createElement('span', null, 'Netto: ' + fmt(quartale[q].netto) + ' \u20AC \u00B7 Brutto: ' + fmt(quartale[q].brutto) + ' \u20AC')
                            );
                        })
                    )
                );
            };

            // ═══ EINSTELLUNGEN ═══
            var renderSettings = function() {
                var s = Object.assign({}, settings);
                var update = function(key, val) { var n = Object.assign({}, s); n[key] = val; saveSettings(n); };
                var iStyle = { width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' };
                return React.createElement('div', { className: 'ab-settings-panel' },
                    React.createElement('div', { className: 'ab-settings-title' }, '\u2699\uFE0F Einstellungen'),
                    [
                        { key: 'standardZahlungsziel', label: 'Standard-Zahlungsziel (Tage)', type: 'number' },
                        { key: 'standardMwst', label: 'Standard MwSt-Satz (%)', type: 'number' },
                        { key: 'standardSkonto', label: 'Standard Skonto (%)', type: 'number' },
                        { key: 'standardSkontoTage', label: 'Standard Skonto-Frist (Tage)', type: 'number' },
                        { key: 'alarmTageVorher', label: 'Alarm X Tage vor Zahlungsziel', type: 'number' },
                    ].map(function(field) {
                        return React.createElement('div', { key: field.key, className: 'ab-settings-field' },
                            React.createElement('label', { className: 'ab-settings-label' }, field.label),
                            React.createElement('input', {
                                type: field.type, value: settings[field.key] || '',
                                onChange: function(e) { update(field.key, field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value); },
                                className: 'ab-edit-input'
                            })
                        );
                    })
                );
            };

            // ═══ STATUS-FARBEN ═══
            var statusColors = { offen: '#f39c12', bezahlt: '#27ae60', gemahnt: '#e63535', storniert: '#7f8c8d' };
            var statusLabels = { offen: 'Offen', bezahlt: 'Bezahlt', gemahnt: 'Gemahnt', storniert: 'Storniert' };

            // ═══ EDIT-FORMULAR ═══
            var renderEditForm = function() {
                var d = editData;
                var set = function(key, val) { setEditData(function(prev) { var n = Object.assign({}, prev); n[key] = val; return n; }); };
                var iStyle = { width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' };
                return React.createElement('div', { className: 'modal-overlay', style: { zIndex: 4000 } },
                    React.createElement('div', { className: 'ab-edit-modal' },
                        React.createElement('div', { className: 'ab-edit-title' }, '\u270F\uFE0F Eintrag bearbeiten'),
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
                                return React.createElement('div', { key: f.key, className: 'ab-edit-field' },
                                    React.createElement('label', { className: 'ab-edit-label' }, f.label),
                                    React.createElement('select', { value: d[f.key] || '', onChange: function(e) { set(f.key, e.target.value); }, className: 'ab-edit-input' },
                                        f.options.map(function(o) { return React.createElement('option', { key: o, value: o }, statusLabels[o] || o); })
                                    )
                                );
                            }
                            return React.createElement('div', { key: f.key, className: 'ab-edit-field' },
                                React.createElement('label', { className: 'ab-edit-label' }, f.label),
                                React.createElement('input', {
                                    type: f.type, value: d[f.key] != null ? d[f.key] : '',
                                    onChange: function(e) { set(f.key, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value); },
                                    className: 'ab-edit-input'
                                })
                            );
                        }),
                        React.createElement('div', { className: 'ab-edit-actions' },
                            React.createElement('button', { onClick: saveEdit, className: 'ab-save-btn' }, '\uD83D\uDCBE Speichern'),
                            React.createElement('button', { onClick: cancelEdit, className: 'ab-cancel-btn' }, 'Abbrechen')
                        )
                    )
                );
            };

            // ═══ HAUPTANSICHT ═══
            return (
                <div className="page-container ab-page">
                    {/* Header */}
                    <div className="ab-header">
                        <button onClick={onBack} className="ab-back-btn">{'\u2190'}</button>
                        <div className="ab-header-info">
                            <div className="ab-header-title">{'\uD83D\uDCD2'} Rechnungsausgangsbuch</div>
                            <div className="ab-header-subtitle">{eintraege.length} Eintr\u00E4ge {'\u00B7'} {fmt(gesamtOffen)} {'\u20AC'} offen</div>
                        </div>
                        <button onClick={function() { setShowAnalyse(!showAnalyse); setShowSettings(false); }} className={'ab-toggle-btn ' + (showAnalyse ? 'active' : 'inactive')}>{'\uD83D\uDCCA'}</button>
                        <button onClick={function() { setShowSettings(!showSettings); setShowAnalyse(false); }} className={'ab-toggle-btn ' + (showSettings ? 'active' : 'inactive')}>{'\u2699\uFE0F'}</button>
                    </div>

                    {/* Alarm-Banner */}
                    {ueberfaelligeCount > 0 && (
                        <div className="ab-alarm-banner"
                            onClick={function() { setFilterStatus('ueberfaellig'); }}>
                            <span className="ab-alarm-icon">{'\uD83D\uDEA8'}</span>
                            <div>
                                <div className="ab-alarm-title">{ueberfaelligeCount} {'\u00FC'}berf{'\u00E4'}llige Rechnung{ueberfaelligeCount > 1 ? 'en' : ''}!</div>
                                <div className="ab-alarm-subtitle">Zahlungsziel {'\u00FC'}berschritten -- Klicken zum Filtern</div>
                            </div>
                        </div>
                    )}

                    {/* Statistik-Karten */}
                    <div className="ab-stats-grid">
                        <div className="ab-stat-card">
                            <div className="ab-stat-value warn">{offeneCount}</div>
                            <div className="ab-stat-label">Offen</div>
                        </div>
                        <div className="ab-stat-card">
                            <div className="ab-stat-value danger">{fmt(gesamtOffen)}{'\u20AC'}</div>
                            <div className="ab-stat-label">Ausstehend</div>
                        </div>
                        <div className="ab-stat-card">
                            <div className="ab-stat-value success">{fmt(gesamtBezahlt)}{'\u20AC'}</div>
                            <div className="ab-stat-label">Bezahlt</div>
                        </div>
                    </div>

                    {/* Settings / Analyse Panel */}
                    {showSettings && renderSettings()}
                    {showAnalyse && renderAnalyse()}

                    {/* Filter-Tabs + Neuer Eintrag */}
                    <div className="ab-filter-row">
                        {['alle', 'offen', 'ueberfaellig', 'bezahlt', 'gemahnt', 'storniert'].map(function(f) {
                            var label = f === 'ueberfaellig' ? '\u26A0 \u00DCberf\u00E4llig' : f === 'alle' ? 'Alle' : (statusLabels[f] || f);
                            return React.createElement('button', {
                                key: f, onClick: function() { setFilterStatus(f); },
                                className: 'ab-filter-btn ' + (filterStatus === f ? 'active' : 'inactive')
                            }, label);
                        })}
                        <button onClick={addManualEntry} className="ab-add-btn">+ Neu</button>
                    </div>

                    {/* Rechnungsliste */}
                    <div className="ab-entry-list">
                        {filtered.length === 0 && (
                            <div className="ab-empty">
                                {eintraege.length === 0 ? 'Noch keine Rechnungen im Ausgangsbuch.\nErstelle eine Rechnung im Rechnungsmodul -- sie wird automatisch hier gespeichert!' : 'Keine Eintr\u00E4ge f\u00FCr diesen Filter.'}
                            </div>
                        )}
                        {filtered.map(function(entry) {
                            var daysInfo = getDaysInfo(entry);
                            var isOverdue = daysInfo && daysInfo.overdue;
                            var isWarning = daysInfo && daysInfo.warning;
                            var cardClass = 'ab-entry-card' + (isOverdue ? ' overdue' : isWarning ? ' warning' : '');

                            return React.createElement('div', {
                                key: entry.id,
                                className: cardClass
                            },
                                // Zeile 1: Nr + Typ + Status
                                React.createElement('div', { className: 'ab-entry-row', style: { marginBottom: '4px' } },
                                    React.createElement('div', { className: 'ab-entry-nr' }, entry.rechnungsNr || '\u2013'),
                                    React.createElement('div', { className: 'ab-entry-status-area' },
                                        isOverdue && React.createElement('span', { className: 'ab-overdue-tag' }, Math.abs(daysInfo.days) + 'T \u00FCberf\u00E4llig!'),
                                        isWarning && React.createElement('span', { className: 'ab-warning-tag' }, 'F\u00E4llig in ' + daysInfo.days + 'T'),
                                        React.createElement('span', { className: 'ab-status-badge', style: {
                                            background: (statusColors[entry.status] || '#999') + '22', color: statusColors[entry.status] || '#999'
                                        } }, statusLabels[entry.status] || entry.status)
                                    )
                                ),
                                // Zeile 2: Kunde + Betrag
                                React.createElement('div', { className: 'ab-entry-detail' },
                                    React.createElement('span', { className: 'ab-entry-kunde' }, (entry.typ || '') + ' \u00B7 ' + (entry.kunde || '').substring(0, 30)),
                                    React.createElement('span', { className: 'ab-entry-betrag' }, fmt(entry.bruttoBetrag) + ' \u20AC')
                                ),
                                // Zeile 3: Datum + Zahlungsziel
                                React.createElement('div', { className: 'ab-entry-meta' },
                                    React.createElement('span', null, 'Datum: ' + (entry.datum || '\u2013') + (entry.bauvorhaben ? ' \u00B7 ' + entry.bauvorhaben.substring(0, 25) : '')),
                                    React.createElement('span', null, 'Ziel: ' + (entry.zahlungszielDatum || '\u2013'))
                                ),
                                // Zeile 4: Aktionen
                                React.createElement('div', { className: 'ab-entry-actions' },
                                    entry.status === 'offen' && React.createElement('button', {
                                        onClick: function() { changeStatus(entry.id, 'bezahlt'); },
                                        className: 'ab-action-btn pay'
                                    }, '\u2713 Bezahlt'),
                                    entry.status === 'offen' && isOverdue && React.createElement('button', {
                                        onClick: function() { changeStatus(entry.id, 'gemahnt'); },
                                        className: 'ab-action-btn remind'
                                    }, '\u26A0 Gemahnt'),
                                    React.createElement('button', {
                                        onClick: function() { startEdit(entry); },
                                        className: 'ab-action-btn edit'
                                    }, '\u270F\uFE0F'),
                                    React.createElement('button', {
                                        onClick: function() { deleteEntry(entry.id); },
                                        className: 'ab-action-btn delete'
                                    }, '\uD83D\uDDD1\uFE0F')
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
