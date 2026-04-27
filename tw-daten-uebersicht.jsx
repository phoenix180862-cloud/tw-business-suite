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
            // Positionen: bevorzugt aus _masterPositionen lesen (Trennung Daten <-> Aufmass)
            // Fallback: importResult.positionen, dann kunde._lvPositionen
            // NEU 27.04.2026: aufmasscode-Feld wird mitgefuehrt (vom User selbst eingetragen,
            // erlaubt spaetere Zuordnung von Aufmasz-Werten zur richtigen LV-Position).
            var allPos = (kunde && kunde._masterPositionen) || (ir.positionen) || (kunde && kunde._lvPositionen) || [];
            var [positionen, setPositionen] = useState(allPos.map(function(p, idx) {
                return { _idx: idx, pos: p.pos || '', aufmasscode: p.aufmasscode || '', bez: p.bez || '', einheit: p.einheit || 'm\u00b2', menge: p.menge || 0, einzelpreis: p.einzelpreis || 0, kategorie: p.kategorie || '', _istNachtrag: p._istNachtrag || false };
            }));
            // Raeume: bevorzugt aus _masterRaeume lesen
            var allRaeume = (kunde && kunde._masterRaeume) || (ir.raeume) || (kunde && kunde._raeume) || [];
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
            var addPosition = function() { setPositionen(function(prev) { return prev.concat([{ _idx: prev.length, pos: '', aufmasscode: '', bez: '', einheit: 'm\u00b2', menge: 0, einzelpreis: 0, kategorie: '', _istNachtrag: false }]); }); };
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

            // ── AUTO-SAVE: Speichere automatisch bei Tab-Wechsel oder Unmount ──
            // Damit der User nicht mehr bewusst auf "Bearbeitung beenden" klicken muss.
            // Schreibt in den selben Slot wie handleSave, aber OHNE UI-Effekt (kein Modus-Wechsel, keine Meldung).
            var autoSaveSilent = React.useRef(null);
            autoSaveSilent.current = function() {
                if (!editMode) return; // Nur speichern, wenn ueberhaupt bearbeitet wurde
                if (onSave) {
                    try {
                        onSave({ stammFelder: stammFelder, positionen: positionen, raeume: raeume, _autoSave: true });
                        console.log('[DatenUebersicht] Auto-Save ausgeloest');
                    } catch(e) { console.warn('[DatenUebersicht] Auto-Save Fehler:', e); }
                }
            };

            // Auto-Save bei Tab-Wechsel
            useEffect(function() {
                return function() {
                    // Cleanup beim Tab-Wechsel: aktuelle Daten silently speichern
                    if (autoSaveSilent.current) autoSaveSilent.current();
                };
            }, [activeTab]);

            // Auto-Save beim Unmount der gesamten Komponente
            useEffect(function() {
                return function() {
                    if (autoSaveSilent.current) autoSaveSilent.current();
                };
            }, []);

            // ── Spracheingabe (globaler Service) ──
            var activeMic = useSpeech();
            var startSpeech = function(fieldKey, callback) {
                TWSpeechService.start(fieldKey, callback);
            };

            // ── Zahl-Input: type=text, beim Focus leeren wenn 0, beim Blur formatieren ──
            // VERGROESSERT 27.04.2026: padding/fontSize stark erhoeht damit auch 4-5-stellige
            // Zahlen mit Nachkommastellen vollstaendig sichtbar bleiben (vorher abgeschnitten).
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
                    style: Object.assign({ width:'100%', padding:'9px 8px', borderRadius:'6px', border:'1px solid var(--accent-blue)', background:'var(--bg-tertiary)', fontSize:'14px', fontWeight:'600', textAlign:'right', color:'var(--text-primary)', boxSizing:'border-box', fontFamily:'monospace', minHeight:'34px' }, extra || {})
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
                    <div style={{background:'var(--bg-secondary)', borderRadius:'14px', padding:'16px', marginBottom:'12px', border:'1px solid var(--border-color)'}}>
                        <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)', marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px'}}>
                            <span style={{fontSize:'18px'}}>{icon}</span> {title}
                        </div>
                        <div style={{display:'grid', gap:'8px'}}>
                            {fields.map(function(f) { return (
                                <div key={f[0]}>
                                    <MicLabel fieldKey={'du_' + f[0]} label={f[1]} />
                                    <div style={{display:'flex', gap:'4px'}}>
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
            // VERGROESSERT 27.04.2026: padding/fontSize hoch fuer bessere Lesbarkeit
            var cellEdit = function(val, onChange, extra) { return <input value={val} onChange={onChange} style={Object.assign({width:'100%', padding:'9px 8px', borderRadius:'6px', border:'1px solid var(--accent-blue)', background:'var(--bg-tertiary)', fontSize:'14px', color:'var(--text-primary)', boxSizing:'border-box', minHeight:'34px'}, extra || {})} />; };

            return (
                <div style={{padding:'12px 16px', minHeight:'100vh', background:'var(--bg-primary)', paddingBottom:'180px'}}>
                    <div style={{textAlign:'center', marginBottom:'16px'}}>
                        <div style={{fontSize:'18px', fontWeight:'800', color:'var(--text-primary)'}}>{stammFelder.bauherr_firma || (kunde && kunde.name) || 'Kundendaten'}</div>
                        <div style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'4px'}}>{stammFelder.objekt_bauvorhaben || 'Projekt'}</div>
                    </div>
                    {savedMsg && (<div style={{padding:'10px 16px', background:'rgba(30,136,229,0.12)', border:'1px solid rgba(30,136,229,0.3)', borderRadius:'10px', marginBottom:'12px', fontSize:'13px', color:'#1E88E5', fontWeight:'600', textAlign:'center'}}>{savedMsg}</div>)}
                    {/* ETAPPE 3: 4 Buttons in EINER Reihe (3 Tabs + Bearbeiten-Button), alle blau, gleiche Breite */}
                    <div style={{display:'flex', gap:'4px', marginBottom:'16px', background:'var(--bg-secondary)', borderRadius:'12px', padding:'4px'}}>
                        {tabs.map(function(tab) { var isActive = activeTab === tab.id; return (
                            <button key={tab.id} {...tap(function(){ setActiveTab(tab.id); })} style={Object.assign({ flex:1, padding:'10px 4px', borderRadius:'10px', border: isActive ? '1px solid rgba(255,255,255,0.25)' : 'none', cursor:'pointer', background: isActive ? 'linear-gradient(135deg, #42a5f5, #1E88E5)' : 'linear-gradient(135deg, #1E88E5, #1565C0)', color:'white', fontSize:'11px', fontWeight:'700', textAlign:'center', transition:'all 0.15s ease', boxShadow: isActive ? '0 0 12px rgba(30,136,229,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' : '0 2px 6px rgba(30,136,229,0.2)', opacity: isActive ? 1 : 0.75, textShadow: isActive ? '0 0 6px rgba(255,255,255,0.5)' : '0 1px 2px rgba(0,0,0,0.3)', transform: isActive ? 'scale(1.02)' : 'scale(1)' }, touchBase)}>
                                <span style={{fontSize:'15px', display:'block', marginBottom:'2px'}}>{tab.icon}</span>
                                {tab.label}{tab.count !== null && <span style={{marginLeft:'3px', fontSize:'9px', opacity:0.8}}>({tab.count})</span>}
                            </button>
                        ); })}
                        {/* 4. Button: Bearbeiten / Beenden - gleiche Breite wie die Tab-Buttons */}
                        <button {...tap(function(){ if (!editMode) { setEditMode(true); } else { handleSave(); } })}
                            title={!editMode ? 'Bearbeitung beginnen' : 'Bearbeitung beenden und Daten in Module laden'}
                            style={Object.assign({ flex:1, padding:'10px 4px', borderRadius:'10px', border: editMode ? '1px solid rgba(230,126,34,0.6)' : 'none', cursor:'pointer', background: editMode ? 'linear-gradient(135deg, #f39c12, #e67e22)' : 'linear-gradient(135deg, #1E88E5, #1565C0)', color:'white', fontSize:'11px', fontWeight:'700', textAlign:'center', transition:'all 0.15s ease', boxShadow: editMode ? '0 0 12px rgba(230,126,34,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' : '0 2px 6px rgba(30,136,229,0.2)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }, touchBase)}>
                            <span style={{fontSize:'15px', display:'block', marginBottom:'2px'}}>{editMode ? '\uD83D\uDCBE' : '\u270E'}</span>
                            {editMode ? 'Beenden' : 'Bearbeiten'}
                        </button>
                    </div>
                    {editMode && (
                        <div style={{padding:'8px 12px', marginBottom:'12px', background:'rgba(46,204,113,0.10)', border:'1px solid rgba(46,204,113,0.25)', borderRadius:'8px', fontSize:'11px', color:'#27ae60', textAlign:'center', fontStyle:'italic'}}>
                            {'\uD83D\uDCBE'} Auto-Save aktiv: Aenderungen werden automatisch gespeichert beim Tab-Wechsel oder Verlassen der Seite.
                        </div>
                    )}

                    {activeTab === 'stammdaten' && (
                        <div>
                            {sectionCard('\uD83C\uDFE2', 'Bauherr / Auftraggeber', [['bauherr_firma','Firma / Name'],['bauherr_strasse','Strasse'],['bauherr_plzOrt','PLZ / Ort'],['bauherr_ansprechpartner','Ansprechpartner'],['bauherr_telefon','Telefon'],['bauherr_email','E-Mail']])}
                            {sectionCard('\uD83D\uDC77', 'Bauleitung', [['bauleiter_firma','Firma / Name'],['bauleiter_telefon','Telefon'],['bauleiter_email','E-Mail']])}
                            {sectionCard('\uD83D\uDCD0', 'Architekt / Planer', [['architekt_buero','Buero / Firma'],['architekt_bearbeiter','Projektbearbeiter'],['architekt_telefon','Telefon'],['architekt_email','E-Mail']])}
                            {sectionCard('\uD83C\uDFD7', 'Objektdaten', [['objekt_bauvorhaben','Bauvorhaben'],['objekt_baustelle','Baustellenadresse'],['objekt_plzOrt','PLZ / Ort'],['objekt_gewerk','Gewerk'],['objekt_auftragsdatum','Auftragsdatum'],['objekt_netto','Auftragssumme netto'],['objekt_brutto','Auftragssumme brutto']])}
                        </div>
                    )}

                    {activeTab === 'positionen' && (
                        <div style={{overflowX:'auto'}}>
                            <div style={{minWidth: editMode ? '720px' : '610px'}}>
                                <div style={{display:'grid', gridTemplateColumns: editMode ? '70px 90px 110px 55px 1fr 120px 105px 32px' : '60px 70px 80px 45px 1fr 95px 95px', gap:'4px', padding:'8px 8px', fontSize:'10px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'2px solid var(--border-color)', marginBottom:'4px'}}>
                                    <div>Pos-Nr.</div>
                                    <div title="Code zur Zuordnung der Aufmasz-Werte zu dieser Position" style={{color:'var(--accent-blue)'}}>Code</div>
                                    <div style={{textAlign:'right'}}>Menge</div>
                                    <div style={{textAlign:'center'}}>Einh.</div>
                                    <div>Leistungsbeschreibung</div>
                                    <div style={{textAlign:'right'}}>EP netto</div>
                                    <div style={{textAlign:'right'}}>GP netto</div>
                                    {editMode && <div></div>}
                                </div>
                                {positionen.map(function(p, idx) {
                                    var gp = Math.round((p.menge || 0) * (p.einzelpreis || 0) * 100) / 100;
                                    return (
                                        <div key={idx} style={{display:'grid', gridTemplateColumns: editMode ? '70px 90px 110px 55px 1fr 120px 105px 32px' : '60px 70px 80px 45px 1fr 95px 95px', gap:'4px', padding: editMode ? '7px 8px' : '5px 8px', fontSize:'12px', alignItems:'center', background: p._istNachtrag ? 'rgba(230,126,34,0.06)' : (idx % 2 === 0 ? 'var(--bg-secondary)' : 'transparent'), borderBottom:'1px solid var(--border-color)', borderLeft: p._istNachtrag ? '3px solid #e67e22' : '3px solid transparent'}}>
                                            {editMode ? cellEdit(p.pos, function(e){updatePosition(idx,'pos',e.target.value);}, {fontWeight:'700'}) : <div style={{fontWeight:'700', fontSize:'11px', color: p._istNachtrag ? '#e67e22' : 'var(--text-primary)'}}>{p.pos}</div>}
                                            {editMode
                                                ? cellEdit(p.aufmasscode || '', function(e){updatePosition(idx,'aufmasscode',e.target.value);}, {fontFamily:'monospace', fontWeight:'700', color:'var(--accent-blue)', textAlign:'center'})
                                                : <div style={{fontFamily:'monospace', fontWeight:'700', fontSize:'12px', color: (p.aufmasscode ? 'var(--accent-blue)' : 'var(--text-muted)'), textAlign:'center', letterSpacing:'0.5px'}}>{p.aufmasscode || '\u2014'}</div>
                                            }
                                            {editMode ? zahlInput(p.menge, function(v){updatePosition(idx,'menge',v);}) : <div style={{textAlign:'right', fontSize:'11px'}}>{fmtZahl(p.menge)}</div>}
                                            {editMode ? cellEdit(p.einheit, function(e){updatePosition(idx,'einheit',e.target.value);}, {textAlign:'center', fontSize:'12px', padding:'9px 4px'}) : <div style={{textAlign:'center', fontSize:'10px', color:'var(--text-muted)'}}>{p.einheit}</div>}
                                            {editMode ? (
                                                <div style={{display:'flex', gap:'2px'}}>
                                                    <input value={p.bez} onChange={function(e){updatePosition(idx,'bez',e.target.value);}} style={{flex:1, padding:'9px 8px', borderRadius:'6px', border:'1px solid var(--accent-blue)', background:'var(--bg-tertiary)', fontSize:'13px', color:'var(--text-primary)', boxSizing:'border-box', minHeight:'34px'}} />
                                                    <MicButton fieldKey={'pos_bez_' + idx} size="small" onResult={function(text){ updatePosition(idx, 'bez', (p.bez ? p.bez + ' ' : '') + text); }} />
                                                </div>
                                            ) : <div style={{fontSize:'11px', lineHeight:'1.3', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={p.bez}>{p.bez}</div>}
                                            {editMode ? zahlInput(p.einzelpreis, function(v){updatePosition(idx,'einzelpreis',v);}) : <div style={{textAlign:'right', fontSize:'11px', fontFamily:'monospace'}}>{fmtEuro(p.einzelpreis)}</div>}
                                            <div style={{textAlign:'right', fontSize: editMode ? '12px' : '11px', fontWeight:'600', fontFamily:'monospace'}}>{fmtEuro(gp)}</div>
                                            {editMode && <button {...tap(function(){removePosition(idx);})} style={Object.assign({width:'28px',height:'28px',borderRadius:'50%',border:'none',background:'rgba(231,76,60,0.15)',color:'#e74c3c',fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0},touchBase)}>X</button>}
                                        </div>
                                    );
                                })}
                                {positionen.length > 0 && (
                                    <div style={{display:'grid', gridTemplateColumns: editMode ? '70px 90px 110px 55px 1fr 120px 105px 32px' : '60px 70px 80px 45px 1fr 95px 95px', gap:'4px', padding:'8px', fontSize:'12px', fontWeight:'700', borderTop:'2px solid var(--border-color)', marginTop:'4px'}}>
                                        <div></div><div></div><div></div><div></div><div style={{textAlign:'right', color:'var(--text-muted)'}}>SUMME NETTO:</div><div></div>
                                        <div style={{textAlign:'right', fontFamily:'monospace', fontSize:'13px'}}>{fmtEuro(positionen.reduce(function(s,p){return s+Math.round((p.menge||0)*(p.einzelpreis||0)*100)/100;},0))}</div>
                                        {editMode && <div></div>}
                                    </div>
                                )}
                            </div>
                            {editMode && <button {...tap(addPosition)} style={Object.assign({width:'100%',padding:'10px',borderRadius:'10px',border:'2px dashed var(--accent-red)',background:'rgba(196,30,30,0.05)',color:'var(--accent-red-light)',fontSize:'13px',fontWeight:'700',cursor:'pointer',marginTop:'8px'},touchBase)}>+ Neue Position</button>}
                            {positionen.length === 0 && <div style={{textAlign:'center',padding:'40px 20px',color:'var(--text-muted)'}}><div style={{fontSize:'36px',marginBottom:'8px'}}>{'\uD83D\uDCCE'}</div><div>Keine Positionen</div></div>}
                        </div>
                    )}

                    {activeTab === 'raeume' && (
                        <div style={{overflowX:'auto'}}>
                            <div style={{minWidth:'420px'}}>
                                <div style={{display:'grid', gridTemplateColumns:'70px 1fr 50px 70px 70px', gap:'4px', padding:'6px 8px', fontSize:'10px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'2px solid var(--border-color)', marginBottom:'4px'}}>
                                    <div>Raum-Nr.</div><div>Bezeichnung</div><div style={{textAlign:'center'}}>Gesch.</div><div style={{textAlign:'right'}}>Flaeche</div><div style={{textAlign:'right'}}>Umfang</div>
                                </div>
                                {raeume.map(function(r, idx) { return (
                                    <div key={idx} style={{display:'grid', gridTemplateColumns: editMode ? '70px 1fr 50px 70px 70px 28px' : '70px 1fr 50px 70px 70px', gap:'4px', padding:'5px 8px', fontSize:'12px', alignItems:'center', background: idx % 2 === 0 ? 'var(--bg-secondary)' : 'transparent', borderBottom:'1px solid var(--border-color)'}}>
                                        {editMode ? cellEdit(r.nr, function(e){updateRaum(idx,'nr',e.target.value);}, {fontWeight:'700'}) : <div style={{fontWeight:'700', fontSize:'11px'}}>{r.nr}</div>}
                                        {editMode ? (
                                            <div style={{display:'flex', gap:'2px'}}>
                                                <input value={r.bez} onChange={function(e){updateRaum(idx,'bez',e.target.value);}} style={{flex:1, padding:'4px', borderRadius:'4px', border:'1px solid var(--accent-blue)', background:'var(--bg-tertiary)', fontSize:'11px', color:'var(--text-primary)', boxSizing:'border-box'}} />
                                                <MicButton fieldKey={'raum_bez_' + idx} size="small" onResult={function(text){ updateRaum(idx, 'bez', (r.bez ? r.bez + ' ' : '') + text); }} />
                                            </div>
                                        ) : <div style={{fontSize:'11px'}}>{r.bez}</div>}
                                        {editMode ? cellEdit(r.geschoss, function(e){updateRaum(idx,'geschoss',e.target.value);}, {textAlign:'center', fontSize:'10px'}) : <div style={{textAlign:'center', fontSize:'10px', color:'var(--text-muted)'}}>{r.geschoss}</div>}
                                        {editMode ? zahlInput(r.flaeche, function(v){updateRaum(idx,'flaeche',v);}) : <div style={{textAlign:'right', fontSize:'11px'}}>{fmtZahl(r.flaeche)} m\u00b2</div>}
                                        {editMode ? zahlInput(r.umfang, function(v){updateRaum(idx,'umfang',v);}) : <div style={{textAlign:'right', fontSize:'11px'}}>{fmtZahl(r.umfang)} m</div>}
                                        {editMode && <button {...tap(function(){removeRaum(idx);})} style={Object.assign({width:'24px',height:'24px',borderRadius:'50%',border:'none',background:'rgba(231,76,60,0.15)',color:'#e74c3c',fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0},touchBase)}>X</button>}
                                    </div>
                                ); })}
                                {raeume.length > 0 && (
                                    <div style={{display:'grid', gridTemplateColumns:'70px 1fr 50px 70px 70px', gap:'4px', padding:'8px', fontSize:'12px', fontWeight:'700', borderTop:'2px solid var(--border-color)', marginTop:'4px'}}>
                                        <div></div><div style={{textAlign:'right', color:'var(--text-muted)'}}>GESAMT:</div><div></div>
                                        <div style={{textAlign:'right'}}>{fmtZahl(raeume.reduce(function(s,r){return s+(r.flaeche||0);},0))} m\u00b2</div>
                                        <div style={{textAlign:'right'}}>{fmtZahl(raeume.reduce(function(s,r){return s+(r.umfang||0);},0))} m</div>
                                    </div>
                                )}
                            </div>
                            {editMode && <button {...tap(addRaum)} style={Object.assign({width:'100%',padding:'10px',borderRadius:'10px',border:'2px dashed var(--accent-red)',background:'rgba(196,30,30,0.05)',color:'var(--accent-red-light)',fontSize:'13px',fontWeight:'700',cursor:'pointer',marginTop:'8px'},touchBase)}>+ Neuer Raum</button>}
                            {raeume.length === 0 && <div style={{textAlign:'center',padding:'40px 20px',color:'var(--text-muted)'}}><div style={{fontSize:'36px',marginBottom:'8px'}}>{'\uD83C\uDFE0'}</div><div>Keine Raeume</div></div>}
                        </div>
                    )}

                    <div style={{position:'fixed', bottom:0, left:0, right:0, padding:'12px 16px 20px', background:'linear-gradient(transparent, var(--bg-primary) 20%)', zIndex:100}}>
                        <div style={{display:'flex', gap:'6px', maxWidth:'500px', margin:'0 auto'}}>
                            <button {...tap(function(){ if(onBack) onBack(); })} style={Object.assign({flex:'0 0 auto', padding:'12px 16px', borderRadius:'var(--radius-md)', border:'none', cursor:'pointer', background:'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))', color:'#fff', fontSize:'13px', fontWeight:'600', boxShadow:'0 4px 15px rgba(196,30,30,0.3)', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'1px', transition:'all 0.25s ease'},touchBase)}>{'\u2190'} Zurueck</button>
                        </div>
                    </div>
                </div>
            );
        }
