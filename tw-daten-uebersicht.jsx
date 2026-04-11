        /* DatenUebersicht v4 — kunde._importResult als Fallback */
        function DatenUebersicht({ kunde, importResult, onSave, onBack, onWeiterZuModulen, onGoToOrdner }) {
            var ir = importResult || (kunde && kunde._importResult) || {};
            var kd = ir.kundendaten || {};
            var stamm = (ir.stammdaten || (kunde && kunde._stammdaten) || {});
            var [activeTab, setActiveTab] = useState('stammdaten');
            var [editMode, setEditMode] = useState(false);
            var [savedMsg, setSavedMsg] = useState('');
            var bauherr = stamm.bauherr || {};
            var bauleiter = stamm.bauleiter || {};
            var architekt = stamm.architekt || {};
            var objekt = stamm.objektdaten || {};
            var [stammFelder, setStammFelder] = useState({
                projekt: stamm.projekt || kd.projekt || '',
                bauherr_firma: bauherr.firma || kd.auftraggeber || '',
                bauherr_strasse: bauherr.strasse || kd.auftraggeber_strasse || '',
                bauherr_plzOrt: (bauherr.plzOrt || ((bauherr.plz || '') + ' ' + (bauherr.ort || '')).trim()) || '',
                bauherr_ansprechpartner: bauherr.ansprechpartner || kd.auftraggeber_ansprechpartner || '',
                bauherr_telefon: bauherr.telefon || kd.auftraggeber_telefon || '',
                bauherr_email: bauherr.email || kd.auftraggeber_email || '',
                bauleiter_firma: bauleiter.firma || bauleiter.name || kd.bauleitung || '',
                bauleiter_telefon: bauleiter.telefon || kd.bauleitung_telefon || '',
                bauleiter_email: bauleiter.email || kd.bauleitung_email || '',
                architekt_buero: architekt.buero || kd.architekt || '',
                architekt_bearbeiter: architekt.projektbearbeiter || kd.architekt_bearbeiter || '',
                architekt_telefon: architekt.telefon || kd.architekt_telefon || '',
                architekt_email: architekt.emailInhaber || architekt.emailBearbeiter || kd.architekt_email || '',
                objekt_bauvorhaben: objekt.bauvorhaben || kd.baumassnahme || '',
                objekt_baustelle: objekt.baustelleStrasse || kd.adresse || '',
                objekt_plzOrt: objekt.baustellePlzOrt || kd.plzOrt || '',
                objekt_gewerk: objekt.gewerk || kd.gewerk || 'Fliesenarbeiten',
                objekt_auftragsdatum: objekt.auftragsdatum || kd.auftragsdatum || '',
                objekt_netto: objekt.auftragssummeNetto || kd.auftragssummeNetto || '',
                objekt_brutto: objekt.auftragssummeBrutto || kd.auftragssummeBrutto || '',
            });
            var allPos = (ir.positionen || (kunde && kunde._lvPositionen) || []);
            var [positionen, setPositionen] = useState(allPos.map(function(p, idx) {
                return { _idx: idx, pos: p.pos || '', bez: p.bez || '', einheit: p.einheit || 'm\u00b2', menge: p.menge || 0, einzelpreis: p.einzelpreis || 0, kategorie: p.kategorie || '', _istNachtrag: p._istNachtrag || false };
            }));
            var allRaeume = (ir.raeume || (kunde && kunde._raeume) || []);
            var [raeume, setRaeume] = useState(allRaeume.map(function(r, idx) {
                return { _idx: idx, nr: r.nr || '', bez: r.bez || '', geschoss: r.geschoss || '', flaeche: r.flaeche || 0, umfang: r.umfang || 0, bemerkung: r.bemerkung || '' };
            }));
            var tap = function(fn) { return { onTouchEnd: function(e){ e.preventDefault(); e.stopPropagation(); fn(); }, onClick: function(){ fn(); } }; };
            var touchBase = { WebkitTapHighlightColor:'rgba(30,136,229,0.2)', touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none' };
            var fmtZahl = function(n) { var num = parseFloat(n) || 0; return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
            var fmtEuro = function(n) { var num = parseFloat(n) || 0; return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac'; };

            // CRUD
            var updateStammFeld = function(key, val) { setStammFelder(function(prev) { var n = Object.assign({}, prev); n[key] = val; return n; }); };
            var updatePosition = function(idx, field, val) { setPositionen(function(prev) { var n = prev.slice(); n[idx] = Object.assign({}, n[idx]); n[idx][field] = val; return n; }); };
            var addPosition = function() { setPositionen(function(prev) { return prev.concat([{ _idx: prev.length, pos: '', bez: '', einheit: 'm\u00b2', menge: 0, einzelpreis: 0, kategorie: '', _istNachtrag: false }]); }); };
            var removePosition = function(idx) { if (!confirm('Position ' + (positionen[idx].pos || idx+1) + ' loeschen?')) return; setPositionen(function(prev) { return prev.filter(function(_, i) { return i !== idx; }); }); };
            var updateRaum = function(idx, field, val) { setRaeume(function(prev) { var n = prev.slice(); n[idx] = Object.assign({}, n[idx]); n[idx][field] = val; return n; }); };
            var addRaum = function() { setRaeume(function(prev) { return prev.concat([{ _idx: prev.length, nr: '', bez: '', geschoss: 'EG', flaeche: 0, umfang: 0, bemerkung: '' }]); }); };
            var removeRaum = function(idx) { if (!confirm('Raum ' + (raeume[idx].nr || idx+1) + ' loeschen?')) return; setRaeume(function(prev) { return prev.filter(function(_, i) { return i !== idx; }); }); };

            // Speichern OHNE Navigation
            var handleSave = function() {
                setEditMode(false);
                if (onSave) { onSave({ stammFelder: stammFelder, positionen: positionen, raeume: raeume }); }
                setSavedMsg('Daten gespeichert und in Module geladen!');
                setTimeout(function() { setSavedMsg(''); setActiveTab('stammdaten'); }, 2000);
            };

            // ── Spracheingabe (globaler Service) ──
            var activeMic = useSpeech();
            var startSpeech = function(fieldKey, callback) {
                TWSpeechService.start(fieldKey, callback);
            };

            // ── Zahl-Input: type=text, beim Focus leeren wenn 0, beim Blur formatieren ──
            var zahlInput = function(value, onChange, extra) {
                return React.createElement('input', Object.assign({
                    type: 'text',
                    inputMode: 'decimal',
                    defaultValue: (parseFloat(value) || 0) === 0 ? '' : fmtZahl(value),
                    onFocus: function(e) {
                        var v = parseFloat(value) || 0;
                        if (v === 0) { e.target.value = ''; }
                        else { e.target.value = String(v).replace('.', ','); }
                        setTimeout(function() { try { e.target.select(); } catch(x){} }, 50);
                    },
                    onBlur: function(e) {
                        var parsed = parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0;
                        e.target.value = parsed === 0 ? '' : fmtZahl(parsed);
                        onChange(parsed);
                    },
                    style: Object.assign({ width:'100%', padding:'4px', borderRadius:'4px', border:'1px solid var(--accent-blue)', background:'var(--bg-tertiary)', fontSize:'11px', textAlign:'right', color:'var(--text-primary)', boxSizing:'border-box' }, extra || {})
                }));
            };

            var tabs = [
                { id: 'stammdaten', label: 'Kundendaten', icon: '\uD83D\uDCCB', count: null },
                { id: 'positionen', label: 'Positionen', icon: '\uD83D\uDCCE', count: positionen.length },
                { id: 'raeume', label: 'Raeume', icon: '\uD83C\uDFE0', count: raeume.length }
            ];
            var inputStyle = function(extra) { return Object.assign({ width:'100%', padding:'8px 10px', borderRadius:'8px', fontSize:'13px', color:'var(--text-primary)', boxSizing:'border-box', background: editMode ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', border: editMode ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)', opacity: editMode ? 1 : 0.8 }, extra || {}); };

            // ── Stammdaten-Sektion mit Sprache ──
            var sectionCard = function(icon, title, fields) {
                return (
                    <div className="du-section-card">
                        <div className="du-section-title">
                            <span className="du-section-icon">{icon}</span> {title}
                        </div>
                        <div className="du-section-grid">
                            {fields.map(function(f) { return (
                                <div key={f[0]}>
                                    <MicLabel fieldKey={'du_' + f[0]} label={f[1]} />
                                    <div className="du-field-row">
                                        <MicInput fieldKey={'du_' + f[0]} value={stammFelder[f[0]] || ''} readOnly={!editMode} onChange={function(e){ updateStammFeld(f[0], e.target.value); }} style={inputStyle({flex:1})} />
                                        {editMode && (
                                            <MicButton fieldKey={'du_' + f[0]} size="normal" onResult={function(text){ updateStammFeld(f[0], (stammFelder[f[0]] || '') + (stammFelder[f[0]] ? ' ' : '') + text); }} />
                                        )}
                                    </div>
                                </div>
                            ); })}
                        </div>
                    </div>
                );
            };
            var cellEdit = function(val, onChange, extra) { return <input value={val} onChange={onChange} style={Object.assign({width:'100%', padding:'4px', borderRadius:'4px', border:'1px solid var(--accent-blue)', background:'var(--bg-tertiary)', fontSize:'11px', color:'var(--text-primary)', boxSizing:'border-box'}, extra || {})} />; };

            return (
                <div className="du-page">
                    <div className="du-header">
                        <div className="du-header-title">{stammFelder.bauherr_firma || (kunde && kunde.name) || 'Kundendaten'}</div>
                        <div className="du-header-subtitle">{stammFelder.objekt_bauvorhaben || 'Projekt'}</div>
                    </div>
                    {savedMsg && (<div className="du-saved-msg">{savedMsg}</div>)}
                    <div className="du-tab-bar">
                        {tabs.map(function(tab) { var isActive = activeTab === tab.id; return (
                            <button key={tab.id} {...tap(function(){ setActiveTab(tab.id); })} className={'du-tab ' + (isActive ? 'active' : 'inactive')}>
                                <span className="du-tab-icon">{tab.icon}</span>
                                {tab.label}{tab.count !== null && <span className="du-tab-count">({tab.count})</span>}
                            </button>
                        ); })}
                    </div>
                    <div className="du-edit-row">
                        {!editMode ? (
                            <button {...tap(function(){ setEditMode(true); })} className="du-edit-btn start">Bearbeitung beginnen</button>
                        ) : (
                            <button {...tap(handleSave)} className="du-edit-btn save">Bearbeitung beenden & Daten in Module laden</button>
                        )}
                    </div>

                    {activeTab === 'stammdaten' && (
                        <div>
                            {sectionCard('\uD83C\uDFE2', 'Bauherr / Auftraggeber', [['bauherr_firma','Firma / Name'],['bauherr_strasse','Strasse'],['bauherr_plzOrt','PLZ / Ort'],['bauherr_ansprechpartner','Ansprechpartner'],['bauherr_telefon','Telefon'],['bauherr_email','E-Mail']])}
                            {sectionCard('\uD83D\uDC77', 'Bauleitung', [['bauleiter_firma','Firma / Name'],['bauleiter_telefon','Telefon'],['bauleiter_email','E-Mail']])}
                            {sectionCard('\uD83D\uDCD0', 'Architekt / Planer', [['architekt_buero','Buero / Firma'],['architekt_bearbeiter','Projektbearbeiter'],['architekt_telefon','Telefon'],['architekt_email','E-Mail']])}
                            {sectionCard('\uD83C\uDFD7', 'Objektdaten', [['objekt_bauvorhaben','Bauvorhaben'],['objekt_baustelle','Baustellenadresse'],['objekt_plzOrt','PLZ / Ort'],['objekt_gewerk','Gewerk'],['objekt_auftragsdatum','Auftragsdatum'],['objekt_netto','Auftragssumme netto'],['objekt_brutto','Auftragssumme brutto']])}
                        </div>
                    )}

                    {activeTab === 'positionen' && (
                        <div className="du-table-wrap">
                            <div className="du-table-inner">
                                <div className="du-table-header positionen">
                                    <div>Pos-Nr.</div><div className="du-cell-right">Menge</div><div className="du-cell-center">Einh.</div><div>Leistungsbeschreibung</div><div className="du-cell-right">EP netto</div><div className="du-cell-right">GP netto</div>
                                </div>
                                {positionen.map(function(p, idx) {
                                    var gp = Math.round((p.menge || 0) * (p.einzelpreis || 0) * 100) / 100;
                                    return (
                                        <div key={idx} style={{display:'grid', gridTemplateColumns: editMode ? '58px 60px 42px 1fr 78px 88px 28px' : '58px 60px 42px 1fr 78px 88px', gap:'4px', padding:'5px 8px', fontSize:'12px', alignItems:'center', background: p._istNachtrag ? 'rgba(230,126,34,0.06)' : (idx % 2 === 0 ? 'var(--bg-secondary)' : 'transparent'), borderBottom:'1px solid var(--border-color)', borderLeft: p._istNachtrag ? '3px solid #e67e22' : '3px solid transparent'}}>
                                            {editMode ? cellEdit(p.pos, function(e){updatePosition(idx,'pos',e.target.value);}, {fontWeight:'700'}) : <div className="du-cell-bold" style={{color: p._istNachtrag ? 'var(--accent-orange)' : 'var(--text-primary)'}}>{p.pos}</div>}
                                            {editMode ? zahlInput(p.menge, function(v){updatePosition(idx,'menge',v);}) : <div className="du-cell-right" style={{fontSize:'11px'}}>{fmtZahl(p.menge)}</div>}
                                            {editMode ? cellEdit(p.einheit, function(e){updatePosition(idx,'einheit',e.target.value);}, {textAlign:'center', fontSize:'10px'}) : <div className="du-cell-center" style={{fontSize:'10px', color:'var(--text-muted)'}}>{p.einheit}</div>}
                                            {editMode ? (
                                                <div style={{display:'flex', gap:'2px'}}>
                                                    <input value={p.bez} onChange={function(e){updatePosition(idx,'bez',e.target.value);}} style={{flex:1, padding:'4px', borderRadius:'4px', border:'1px solid var(--accent-blue)', background:'var(--bg-tertiary)', fontSize:'11px', color:'var(--text-primary)', boxSizing:'border-box'}} />
                                                    <MicButton fieldKey={'pos_bez_' + idx} size="small" onResult={function(text){ updatePosition(idx, 'bez', (p.bez ? p.bez + ' ' : '') + text); }} />
                                                </div>
                                            ) : <div className="du-cell-text" title={p.bez}>{p.bez}</div>}
                                            {editMode ? zahlInput(p.einzelpreis, function(v){updatePosition(idx,'einzelpreis',v);}) : <div className="du-cell-mono">{fmtEuro(p.einzelpreis)}</div>}
                                            <div className="du-cell-mono-bold">{fmtEuro(gp)}</div>
                                            {editMode && <button {...tap(function(){removePosition(idx);})} className="du-remove-btn">X</button>}
                                        </div>
                                    );
                                })}
                                {positionen.length > 0 && (
                                    <div className="du-table-footer positionen">
                                        <div></div><div></div><div></div><div className="du-cell-right du-cell-muted">SUMME NETTO:</div><div></div>
                                        <div className="du-cell-mono-bold" style={{fontSize:'13px'}}>{fmtEuro(positionen.reduce(function(s,p){return s+Math.round((p.menge||0)*(p.einzelpreis||0)*100)/100;},0))}</div>
                                    </div>
                                )}
                            </div>
                            {editMode && <button {...tap(addPosition)} className="du-add-btn">+ Neue Position</button>}
                            {positionen.length === 0 && <div className="du-empty-state"><div className="du-empty-icon">{'\uD83D\uDCCE'}</div><div>Keine Positionen</div></div>}
                        </div>
                    )}

                    {activeTab === 'raeume' && (
                        <div className="du-table-wrap">
                            <div className="du-table-inner raeume">
                                <div className="du-table-header raeume">
                                    <div>Raum-Nr.</div><div>Bezeichnung</div><div className="du-cell-center">Gesch.</div><div className="du-cell-right">Flaeche</div><div className="du-cell-right">Umfang</div>
                                </div>
                                {raeume.map(function(r, idx) { return (
                                    <div key={idx} style={{display:'grid', gridTemplateColumns: editMode ? '70px 1fr 50px 70px 70px 28px' : '70px 1fr 50px 70px 70px', gap:'4px', padding:'5px 8px', fontSize:'12px', alignItems:'center', background: idx % 2 === 0 ? 'var(--bg-secondary)' : 'transparent', borderBottom:'1px solid var(--border-color)'}}>
                                        {editMode ? cellEdit(r.nr, function(e){updateRaum(idx,'nr',e.target.value);}, {fontWeight:'700'}) : <div className="du-cell-bold">{r.nr}</div>}
                                        {editMode ? (
                                            <div style={{display:'flex', gap:'2px'}}>
                                                <input value={r.bez} onChange={function(e){updateRaum(idx,'bez',e.target.value);}} style={{flex:1, padding:'4px', borderRadius:'4px', border:'1px solid var(--accent-blue)', background:'var(--bg-tertiary)', fontSize:'11px', color:'var(--text-primary)', boxSizing:'border-box'}} />
                                                <MicButton fieldKey={'raum_bez_' + idx} size="small" onResult={function(text){ updateRaum(idx, 'bez', (r.bez ? r.bez + ' ' : '') + text); }} />
                                            </div>
                                        ) : <div className="du-cell-text">{r.bez}</div>}
                                        {editMode ? cellEdit(r.geschoss, function(e){updateRaum(idx,'geschoss',e.target.value);}, {textAlign:'center', fontSize:'10px'}) : <div className="du-cell-center du-cell-muted" style={{fontSize:'10px'}}>{r.geschoss}</div>}
                                        {editMode ? zahlInput(r.flaeche, function(v){updateRaum(idx,'flaeche',v);}) : <div className="du-cell-right" style={{fontSize:'11px'}}>{fmtZahl(r.flaeche)} m\u00b2</div>}
                                        {editMode ? zahlInput(r.umfang, function(v){updateRaum(idx,'umfang',v);}) : <div className="du-cell-right" style={{fontSize:'11px'}}>{fmtZahl(r.umfang)} m</div>}
                                        {editMode && <button {...tap(function(){removeRaum(idx);})} className="du-remove-btn">X</button>}
                                    </div>
                                ); })}
                                {raeume.length > 0 && (
                                    <div className="du-table-footer raeume">
                                        <div></div><div className="du-cell-right du-cell-muted">GESAMT:</div><div></div>
                                        <div className="du-cell-right">{fmtZahl(raeume.reduce(function(s,r){return s+(r.flaeche||0);},0))} m\u00b2</div>
                                        <div className="du-cell-right">{fmtZahl(raeume.reduce(function(s,r){return s+(r.umfang||0);},0))} m</div>
                                    </div>
                                )}
                            </div>
                            {editMode && <button {...tap(addRaum)} className="du-add-btn raum">+ Neuer Raum</button>}
                            {raeume.length === 0 && <div className="du-empty-state"><div className="du-empty-icon">{'\uD83C\uDFE0'}</div><div>Keine Raeume</div></div>}
                        </div>
                    )}

                    <div className="du-footer">
                        <div className="du-footer-row top">
                            {onGoToOrdner && kunde && (kunde._driveFolderId || kunde.id) && (
                                <button {...tap(function(){ onGoToOrdner(); })} className="du-footer-btn small">{'\uD83D\uDCC1'} Ordner</button>
                            )}
                        </div>
                        <div className="du-footer-row">
                            <button {...tap(function(){ if(onBack) onBack(); })} className="du-footer-btn back">{'\u2190'} Zurueck</button>
                            <button {...tap(function(){ if(onWeiterZuModulen) onWeiterZuModulen(); })} className="du-footer-btn main">{'\uD83D\uDCDA'} Weiter zur Modulauswahl</button>
                        </div>
                    </div>
                </div>
            );
        }
