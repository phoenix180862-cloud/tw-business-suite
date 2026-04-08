        /* ═══════════════════════════════════════════
           DATEN-UEBERSICHT — 3 Bearbeitungsseiten
           Stammdaten | Positionen | Raeume
           v2: Einzeilig, Zahlenformat, korrekter Flow
           ═══════════════════════════════════════════ */
        function DatenUebersicht({ kunde, importResult, onSave, onBack, onWeiterZuModulen }) {
            var ir = importResult || {};
            var kd = ir.kundendaten || {};
            var stamm = (ir.stammdaten || (kunde && kunde._stammdaten) || {});
            var [activeTab, setActiveTab] = useState('stammdaten');
            var [editMode, setEditMode] = useState(false);
            var [saveMsg, setSaveMsg] = useState('');
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
            var updateStammFeld = function(key, val) { setStammFelder(function(prev) { var n = Object.assign({}, prev); n[key] = val; return n; }); };
            var updatePosition = function(idx, field, val) { setPositionen(function(prev) { var n = prev.slice(); n[idx] = Object.assign({}, n[idx]); n[idx][field] = val; return n; }); };
            var addPosition = function() { setPositionen(function(prev) { return prev.concat([{ _idx: prev.length, pos: '', bez: '', einheit: 'm\u00b2', menge: 0, einzelpreis: 0, kategorie: '', _istNachtrag: false }]); }); };
            var removePosition = function(idx) { if (!confirm('Position ' + (positionen[idx].pos || idx+1) + ' wirklich loeschen?')) return; setPositionen(function(prev) { return prev.filter(function(_, i) { return i !== idx; }); }); };
            var updateRaum = function(idx, field, val) { setRaeume(function(prev) { var n = prev.slice(); n[idx] = Object.assign({}, n[idx]); n[idx][field] = val; return n; }); };
            var addRaum = function() { setRaeume(function(prev) { return prev.concat([{ _idx: prev.length, nr: '', bez: '', geschoss: 'EG', flaeche: 0, umfang: 0, bemerkung: '' }]); }); };
            var removeRaum = function(idx) { if (!confirm('Raum ' + (raeume[idx].nr || idx+1) + ' wirklich loeschen?')) return; setRaeume(function(prev) { return prev.filter(function(_, i) { return i !== idx; }); }); };

            // ── Spracheingabe ──
            var [sprachAktiv, setSprachAktiv] = useState(false);
            var [sprachTarget, setSprachTarget] = useState(null); // z.B. 'stamm_bauherr_firma' oder 'pos_3_bez'
            var startSpeech = function(targetId, callback) {
                if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    alert('Spracheingabe wird von diesem Browser nicht unterst\u00fctzt. Bitte Chrome verwenden.');
                    return;
                }
                var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
                var recognition = new SpeechRec();
                recognition.lang = 'de-DE';
                recognition.continuous = false;
                recognition.interimResults = false;
                setSprachAktiv(true);
                setSprachTarget(targetId);
                recognition.onresult = function(event) {
                    var text = event.results[0][0].transcript;
                    setSprachAktiv(false);
                    setSprachTarget(null);
                    if (callback) callback(text);
                };
                recognition.onerror = function(event) {
                    console.warn('Spracheingabe Fehler:', event.error);
                    setSprachAktiv(false);
                    setSprachTarget(null);
                };
                recognition.onend = function() {
                    setSprachAktiv(false);
                    setSprachTarget(null);
                };
                recognition.start();
            };
            var micBtnStyle = function(targetId) {
                var isActive = sprachAktiv && sprachTarget === targetId;
                return Object.assign({
                    padding:'3px 6px', background: isActive ? 'rgba(231,76,60,0.15)' : 'rgba(30,136,229,0.08)',
                    color: isActive ? '#e74c3c' : 'var(--accent-blue)',
                    border:'1px solid ' + (isActive ? 'rgba(231,76,60,0.3)' : 'rgba(30,136,229,0.15)'),
                    borderRadius:'6px', cursor:'pointer', fontSize:'13px', lineHeight:1,
                    minWidth:'30px', minHeight:'30px', display:'inline-flex', alignItems:'center', justifyContent:'center',
                    animation: isActive ? 'pulse 1s infinite' : 'none'
                }, touchBase);
            };

            // Zahlenformat: 2 Nachkommastellen, deutsches Format
            var fmtZahl = function(val) {
                var num = parseFloat(val) || 0;
                return num.toFixed(2).replace('.', ',');
            };
            var fmtEuro = function(val) {
                var num = parseFloat(val) || 0;
                return num.toFixed(2).replace('.', ',') + ' \u20ac';
            };

            // Speichern: Daten in Module uebertragen, aber auf Seite BLEIBEN
            var handleSave = function() {
                setEditMode(false);
                if (onSave) {
                    onSave({ stammFelder: stammFelder, positionen: positionen, raeume: raeume });
                }
                setSaveMsg('Daten gespeichert und in Module uebertragen!');
                setTimeout(function() { setSaveMsg(''); }, 3000);
            };

            var tabs = [
                { id: 'stammdaten', label: 'Kundendaten', icon: '\uD83D\uDCCB', count: null },
                { id: 'positionen', label: 'Positionen', icon: '\uD83D\uDCCE', count: positionen.length },
                { id: 'raeume', label: 'Raeume', icon: '\uD83C\uDFE0', count: raeume.length }
            ];
            var inputStyle = function(extra) { return Object.assign({ width:'100%', padding:'8px 10px', borderRadius:'8px', fontSize:'13px', color:'var(--text-primary)', boxSizing:'border-box', background: editMode ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', border: editMode ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)', opacity: editMode ? 1 : 0.8 }, extra || {}); };
            var inputSmall = function(extra) { return inputStyle(Object.assign({ padding:'6px 6px', fontSize:'12px', textAlign:'right' }, extra || {})); };

            var sectionCard = function(icon, title, fields) {
                return (
                    <div style={{background:'var(--bg-secondary)', borderRadius:'14px', padding:'16px', marginBottom:'12px', border:'1px solid var(--border-color)'}}>
                        <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)', marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px'}}>
                            <span style={{fontSize:'18px'}}>{icon}</span> {title}
                        </div>
                        <div style={{display:'grid', gap:'8px'}}>
                            {fields.map(function(f) { return (
                                <div key={f[0]}>
                                    <label style={{fontSize:'11px', color:'var(--text-muted)', display:'block', marginBottom:'3px'}}>{f[1]}</label>
                                    <div style={{display:'flex', gap:'4px', alignItems:'center'}}>
                                        <input value={stammFelder[f[0]] || ''} readOnly={!editMode} onChange={function(e){ updateStammFeld(f[0], e.target.value); }} style={inputStyle({flex:1})} />
                                        {editMode && (
                                            <button {...tap(function(){ var feldKey = f[0]; var vorher = stammFelder[feldKey] || ''; startSpeech('stamm_' + feldKey, function(text){ updateStammFeld(feldKey, vorher ? vorher + ' ' + text : text); }); })}
                                                style={micBtnStyle('stamm_' + f[0])}>
                                                {sprachAktiv && sprachTarget === 'stamm_' + f[0] ? '\uD83D\uDD34' : '\uD83C\uDFA4'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ); })}
                        </div>
                    </div>
                );
            };

            return (
                <div style={{padding:'12px 16px', minHeight:'100vh', background:'var(--bg-primary)', paddingBottom:'180px'}}>
                    {/* Header */}
                    <div style={{textAlign:'center', marginBottom:'16px'}}>
                        <div style={{fontSize:'18px', fontWeight:'800', color:'var(--text-primary)'}}>{stammFelder.bauherr_firma || (kunde && kunde.name) || 'Kundendaten'}</div>
                        <div style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'4px'}}>{stammFelder.objekt_bauvorhaben || 'Projekt'}</div>
                    </div>

                    {/* Tab-Navigation */}
                    <div style={{display:'flex', gap:'4px', marginBottom:'12px', background:'var(--bg-secondary)', borderRadius:'12px', padding:'4px'}}>
                        {tabs.map(function(tab) { var isActive = activeTab === tab.id; return (
                            <button key={tab.id} {...tap(function(){ setActiveTab(tab.id); })} style={Object.assign({ flex:1, padding:'10px 8px', borderRadius:'10px', border:'none', cursor:'pointer', background: isActive ? 'var(--accent-blue)' : 'transparent', color: isActive ? 'white' : 'var(--text-muted)', fontSize:'12px', fontWeight:'700', textAlign:'center', transition:'all 0.15s ease' }, touchBase)}>
                                <span style={{fontSize:'16px', display:'block', marginBottom:'2px'}}>{tab.icon}</span>
                                {tab.label}{tab.count !== null && <span style={{marginLeft:'4px', fontSize:'10px', opacity:0.8}}>({tab.count})</span>}
                            </button>
                        ); })}
                    </div>

                    {/* Bearbeitungs-Buttons */}
                    <div style={{display:'flex', gap:'8px', marginBottom:'12px'}}>
                        {!editMode ? (
                            <button {...tap(function(){ setEditMode(true); setSaveMsg(''); })} style={Object.assign({ flex:1, padding:'14px', borderRadius:'12px', border:'none', cursor:'pointer', background:'linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)', color:'white', fontSize:'14px', fontWeight:'700', boxShadow:'0 4px 12px rgba(30,136,229,0.3)' }, touchBase)}>
                                Bearbeitung beginnen
                            </button>
                        ) : (
                            <button {...tap(handleSave)} style={Object.assign({ flex:1, padding:'14px', borderRadius:'12px', border:'none', cursor:'pointer', background:'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)', color:'white', fontSize:'14px', fontWeight:'700', boxShadow:'0 4px 12px rgba(39,174,96,0.3)' }, touchBase)}>
                                Bearbeitung beenden & Daten in Module laden
                            </button>
                        )}
                    </div>

                    {/* Speicher-Bestaetigung */}
                    {saveMsg && (
                        <div style={{padding:'10px 16px', background:'rgba(39,174,96,0.1)', border:'1px solid rgba(39,174,96,0.3)', borderRadius:'10px', color:'#27ae60', fontSize:'13px', fontWeight:'600', textAlign:'center', marginBottom:'12px'}}>
                            {saveMsg}
                        </div>
                    )}

                    {/* ═══ TAB: KUNDENSTAMMDATEN ═══ */}
                    {activeTab === 'stammdaten' && (
                        <div>
                            {sectionCard('\uD83C\uDFE2', 'Bauherr / Auftraggeber', [['bauherr_firma','Firma / Name'],['bauherr_strasse','Strasse'],['bauherr_plzOrt','PLZ / Ort'],['bauherr_ansprechpartner','Ansprechpartner'],['bauherr_telefon','Telefon'],['bauherr_email','E-Mail']])}
                            {sectionCard('\uD83D\uDC77', 'Bauleitung', [['bauleiter_firma','Firma / Name'],['bauleiter_telefon','Telefon'],['bauleiter_email','E-Mail']])}
                            {sectionCard('\uD83D\uDCD0', 'Architekt / Planer', [['architekt_buero','Buero / Firma'],['architekt_bearbeiter','Projektbearbeiter'],['architekt_telefon','Telefon'],['architekt_email','E-Mail']])}
                            {sectionCard('\uD83C\uDFD7', 'Objektdaten', [['objekt_bauvorhaben','Bauvorhaben'],['objekt_baustelle','Baustellenadresse'],['objekt_plzOrt','PLZ / Ort'],['objekt_gewerk','Gewerk'],['objekt_auftragsdatum','Auftragsdatum'],['objekt_netto','Auftragssumme netto'],['objekt_brutto','Auftragssumme brutto']])}
                        </div>
                    )}

                    {/* ═══ TAB: POSITIONEN (einzeilig, kompakt) ═══ */}
                    {activeTab === 'positionen' && (
                        <div>
                            {/* Tabellen-Header */}
                            <div style={{display:'grid', gridTemplateColumns:'55px 55px 40px 1fr 75px 80px', gap:'4px', padding:'6px 8px', marginBottom:'4px', fontSize:'10px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px'}}>
                                <div>Pos-Nr.</div>
                                <div style={{textAlign:'right'}}>Menge</div>
                                <div style={{textAlign:'center'}}>Einh.</div>
                                <div>Leistungsbeschreibung</div>
                                <div style={{textAlign:'right'}}>EP (\u20ac)</div>
                                <div style={{textAlign:'right'}}>GP (\u20ac)</div>
                            </div>

                            {/* Positions-Zeilen */}
                            {positionen.map(function(p, idx) {
                                var gp = (p.menge || 0) * (p.einzelpreis || 0);
                                return (
                                    <div key={idx} style={{
                                        display:'grid', gridTemplateColumns: editMode ? '55px 55px 40px 1fr 75px 80px 28px' : '55px 55px 40px 1fr 75px 80px',
                                        gap:'4px', padding:'6px 8px', marginBottom:'2px', alignItems:'center',
                                        background: p._istNachtrag ? 'rgba(230,126,34,0.06)' : (idx % 2 === 0 ? 'var(--bg-secondary)' : 'transparent'),
                                        borderRadius:'6px', fontSize:'12px',
                                        borderLeft: p._istNachtrag ? '3px solid #e67e22' : 'none'
                                    }}>
                                        {editMode ? (
                                            <input value={p.pos} onChange={function(e){ updatePosition(idx, 'pos', e.target.value); }} style={inputSmall({fontWeight:'700', textAlign:'left'})} />
                                        ) : (
                                            <div style={{fontWeight:'700', fontSize:'12px', color: p._istNachtrag ? '#e67e22' : 'var(--text-primary)'}}>{p.pos}</div>
                                        )}
                                        {editMode ? (
                                            <input type="number" step="0.01" value={p.menge} onChange={function(e){ updatePosition(idx, 'menge', parseFloat(e.target.value) || 0); }} style={inputSmall()} />
                                        ) : (
                                            <div style={{textAlign:'right', fontFamily:'var(--font-mono, monospace)'}}>{fmtZahl(p.menge)}</div>
                                        )}
                                        {editMode ? (
                                            <input value={p.einheit} onChange={function(e){ updatePosition(idx, 'einheit', e.target.value); }} style={inputSmall({textAlign:'center'})} />
                                        ) : (
                                            <div style={{textAlign:'center', color:'var(--text-muted)'}}>{p.einheit}</div>
                                        )}
                                        {editMode ? (
                                            <div style={{display:'flex', gap:'3px', alignItems:'center'}}>
                                                <input value={p.bez} onChange={function(e){ updatePosition(idx, 'bez', e.target.value); }} style={inputSmall({textAlign:'left', fontSize:'11px', flex:1})} />
                                                <button {...tap(function(){ var ii = idx; var vorher = p.bez || ''; startSpeech('pos_' + ii + '_bez', function(text){ updatePosition(ii, 'bez', vorher ? vorher + ' ' + text : text); }); })}
                                                    style={micBtnStyle('pos_' + idx + '_bez')}>
                                                    {sprachAktiv && sprachTarget === 'pos_' + idx + '_bez' ? '\uD83D\uDD34' : '\uD83C\uDFA4'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{fontSize:'11px', color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={p.bez}>{p.bez}</div>
                                        )}
                                        {editMode ? (
                                            <input type="number" step="0.01" value={p.einzelpreis} onChange={function(e){ updatePosition(idx, 'einzelpreis', parseFloat(e.target.value) || 0); }} style={inputSmall()} />
                                        ) : (
                                            <div style={{textAlign:'right', fontFamily:'var(--font-mono, monospace)'}}>{fmtEuro(p.einzelpreis)}</div>
                                        )}
                                        <div style={{textAlign:'right', fontWeight:'600', fontFamily:'var(--font-mono, monospace)', color:'var(--text-primary)'}}>
                                            {fmtEuro(gp)}
                                        </div>
                                        {editMode && (
                                            <button {...tap(function(){ removePosition(idx); })} style={Object.assign({ width:'24px', height:'24px', borderRadius:'50%', border:'none', background:'rgba(231,76,60,0.1)', color:'#e74c3c', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }, touchBase)}>X</button>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Summenzeile */}
                            {positionen.length > 0 && (
                                <div style={{display:'grid', gridTemplateColumns:'55px 55px 40px 1fr 75px 80px', gap:'4px', padding:'8px 8px', marginTop:'4px', borderTop:'2px solid var(--border-color)', fontSize:'13px', fontWeight:'700'}}>
                                    <div></div><div></div><div></div>
                                    <div style={{textAlign:'right', color:'var(--text-secondary)'}}>Summe netto:</div>
                                    <div></div>
                                    <div style={{textAlign:'right', fontFamily:'var(--font-mono, monospace)', color:'var(--text-primary)'}}>
                                        {fmtEuro(positionen.reduce(function(s, p) { return s + (p.menge || 0) * (p.einzelpreis || 0); }, 0))}
                                    </div>
                                </div>
                            )}

                            {/* Hinzufuegen */}
                            {editMode && (
                                <button {...tap(addPosition)} style={Object.assign({ width:'100%', padding:'10px', borderRadius:'10px', border:'2px dashed var(--accent-blue)', background:'rgba(30,136,229,0.05)', color:'var(--accent-blue)', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginTop:'8px' }, touchBase)}>+ Neue Position</button>
                            )}

                            {positionen.length === 0 && ( <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-muted)'}}><div style={{fontSize:'36px', marginBottom:'8px'}}>{'\uD83D\uDCCE'}</div><div>Keine Positionen vorhanden</div></div> )}
                        </div>
                    )}

                    {/* ═══ TAB: RAEUME (einzeilig, kompakt) ═══ */}
                    {activeTab === 'raeume' && (
                        <div>
                            {/* Tabellen-Header */}
                            <div style={{display:'grid', gridTemplateColumns:'65px 50px 55px 55px 1fr', gap:'4px', padding:'6px 8px', marginBottom:'4px', fontSize:'10px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px'}}>
                                <div>Raum-Nr.</div>
                                <div style={{textAlign:'center'}}>Geschoss</div>
                                <div style={{textAlign:'right'}}>Fl. (m\u00b2)</div>
                                <div style={{textAlign:'right'}}>Umf. (m)</div>
                                <div>Bezeichnung / Bemerkung</div>
                            </div>

                            {/* Raum-Zeilen */}
                            {raeume.map(function(r, idx) {
                                return (
                                    <div key={idx} style={{
                                        display:'grid', gridTemplateColumns: editMode ? '65px 50px 55px 55px 1fr 28px' : '65px 50px 55px 55px 1fr',
                                        gap:'4px', padding:'6px 8px', marginBottom:'2px', alignItems:'center',
                                        background: idx % 2 === 0 ? 'var(--bg-secondary)' : 'transparent',
                                        borderRadius:'6px', fontSize:'12px'
                                    }}>
                                        {editMode ? (
                                            <input value={r.nr} onChange={function(e){ updateRaum(idx, 'nr', e.target.value); }} style={inputSmall({fontWeight:'700', textAlign:'left'})} />
                                        ) : (
                                            <div style={{fontWeight:'700', fontSize:'12px'}}>{r.nr}</div>
                                        )}
                                        {editMode ? (
                                            <input value={r.geschoss} onChange={function(e){ updateRaum(idx, 'geschoss', e.target.value); }} style={inputSmall({textAlign:'center'})} />
                                        ) : (
                                            <div style={{textAlign:'center', color:'var(--text-muted)', fontSize:'11px'}}>{r.geschoss}</div>
                                        )}
                                        {editMode ? (
                                            <input type="number" step="0.01" value={r.flaeche} onChange={function(e){ updateRaum(idx, 'flaeche', parseFloat(e.target.value) || 0); }} style={inputSmall()} />
                                        ) : (
                                            <div style={{textAlign:'right', fontFamily:'var(--font-mono, monospace)'}}>{fmtZahl(r.flaeche)}</div>
                                        )}
                                        {editMode ? (
                                            <input type="number" step="0.01" value={r.umfang} onChange={function(e){ updateRaum(idx, 'umfang', parseFloat(e.target.value) || 0); }} style={inputSmall()} />
                                        ) : (
                                            <div style={{textAlign:'right', fontFamily:'var(--font-mono, monospace)'}}>{fmtZahl(r.umfang)}</div>
                                        )}
                                        {editMode ? (
                                            <div style={{display:'flex', flexDirection:'column', gap:'2px'}}>
                                                <div style={{display:'flex', gap:'3px', alignItems:'center'}}>
                                                    <input value={r.bez} onChange={function(e){ updateRaum(idx, 'bez', e.target.value); }} placeholder="Bezeichnung" style={inputSmall({textAlign:'left', fontSize:'12px', fontWeight:'600', flex:1})} />
                                                    <button {...tap(function(){ var ii = idx; var vorher = r.bez || ''; startSpeech('raum_' + ii + '_bez', function(text){ updateRaum(ii, 'bez', vorher ? vorher + ' ' + text : text); }); })}
                                                        style={micBtnStyle('raum_' + idx + '_bez')}>
                                                        {sprachAktiv && sprachTarget === 'raum_' + idx + '_bez' ? '\uD83D\uDD34' : '\uD83C\uDFA4'}
                                                    </button>
                                                </div>
                                                <div style={{display:'flex', gap:'3px', alignItems:'center'}}>
                                                    <input value={r.bemerkung} onChange={function(e){ updateRaum(idx, 'bemerkung', e.target.value); }} placeholder="Bemerkung / Details eingeben..." style={inputSmall({textAlign:'left', fontSize:'10px', flex:1})} />
                                                    <button {...tap(function(){ var ii = idx; var prevBem = r.bemerkung || ''; startSpeech('raum_' + ii + '_bem', function(text){ updateRaum(ii, 'bemerkung', prevBem ? prevBem + ' ' + text : text); }); })}
                                                        style={micBtnStyle('raum_' + idx + '_bem')}>
                                                        {sprachAktiv && sprachTarget === 'raum_' + idx + '_bem' ? '\uD83D\uDD34' : '\uD83C\uDFA4'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div style={{fontSize:'12px', fontWeight:'600', color:'var(--text-primary)'}}>{r.bez}</div>
                                                {r.bemerkung && <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'1px', lineHeight:'1.3'}} title={r.bemerkung}>{r.bemerkung.length > 80 ? r.bemerkung.substring(0, 80) + '...' : r.bemerkung}</div>}
                                            </div>
                                        )}
                                        {editMode && (
                                            <button {...tap(function(){ removeRaum(idx); })} style={Object.assign({ width:'24px', height:'24px', borderRadius:'50%', border:'none', background:'rgba(231,76,60,0.1)', color:'#e74c3c', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }, touchBase)}>X</button>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Summenzeile */}
                            {raeume.length > 0 && (
                                <div style={{display:'grid', gridTemplateColumns:'65px 50px 55px 55px 1fr', gap:'4px', padding:'8px 8px', marginTop:'4px', borderTop:'2px solid var(--border-color)', fontSize:'12px', fontWeight:'700'}}>
                                    <div></div><div></div>
                                    <div style={{textAlign:'right', fontFamily:'var(--font-mono, monospace)'}}>
                                        {fmtZahl(raeume.reduce(function(s, r) { return s + (r.flaeche || 0); }, 0))}
                                    </div>
                                    <div style={{textAlign:'right', fontFamily:'var(--font-mono, monospace)'}}>
                                        {fmtZahl(raeume.reduce(function(s, r) { return s + (r.umfang || 0); }, 0))}
                                    </div>
                                    <div style={{color:'var(--text-secondary)'}}>Gesamt ({raeume.length} Raeume)</div>
                                </div>
                            )}

                            {/* Hinzufuegen */}
                            {editMode && (
                                <button {...tap(addRaum)} style={Object.assign({ width:'100%', padding:'10px', borderRadius:'10px', border:'2px dashed #27ae60', background:'rgba(39,174,96,0.05)', color:'#27ae60', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginTop:'8px' }, touchBase)}>+ Neuer Raum</button>
                            )}

                            {raeume.length === 0 && ( <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-muted)'}}><div style={{fontSize:'36px', marginBottom:'8px'}}>{'\uD83C\uDFE0'}</div><div>Keine Raeume vorhanden</div></div> )}
                        </div>
                    )}

                    {/* ═══ NAVIGATION UNTEN (fest) ═══ */}
                    <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:'12px 16px 20px', background:'linear-gradient(transparent, var(--bg-primary) 20%)', zIndex:100 }}>
                        <div style={{display:'flex', gap:'8px', maxWidth:'600px', margin:'0 auto'}}>
                            <button {...tap(function(){ if (onBack) onBack(); })} style={Object.assign({ flex:'0 0 auto', padding:'12px 16px', borderRadius:'12px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-muted)', fontSize:'13px', fontWeight:'600', cursor:'pointer' }, touchBase)}>
                                Zurueck
                            </button>
                            {!editMode && (
                                <button {...tap(function(){ if (onWeiterZuModulen) onWeiterZuModulen(); })} style={Object.assign({ flex:1, padding:'12px', borderRadius:'12px', border:'none', cursor:'pointer', background:'linear-gradient(135deg, #e67e22 0%, #d35400 100%)', color:'white', fontSize:'13px', fontWeight:'700', boxShadow:'0 4px 12px rgba(230,126,34,0.3)' }, touchBase)}>
                                    Weiter zur Modulauswahl
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }
