        /* ═══════════════════════════════════════════
           DATEN-UEBERSICHT — 3 Bearbeitungsseiten
           Stammdaten | Positionen | Raeume
           ═══════════════════════════════════════════ */
        function DatenUebersicht({ kunde, importResult, onSave, onBack, onWeiterZuModulen }) {
            var ir = importResult || {};
            var kd = ir.kundendaten || {};
            var stamm = (ir.stammdaten || (kunde && kunde._stammdaten) || {});
            var [activeTab, setActiveTab] = useState('stammdaten');
            var [editMode, setEditMode] = useState(false);
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
            var handleSaveAndContinue = function() { setEditMode(false); if (onSave) { onSave({ stammFelder: stammFelder, positionen: positionen, raeume: raeume }); } };
            var tabs = [
                { id: 'stammdaten', label: 'Kundendaten', icon: '\uD83D\uDCCB', count: null },
                { id: 'positionen', label: 'Positionen', icon: '\uD83D\uDCCE', count: positionen.length },
                { id: 'raeume', label: 'Raeume', icon: '\uD83C\uDFE0', count: raeume.length }
            ];
            var inputStyle = function(extra) { return Object.assign({ width:'100%', padding:'10px 12px', borderRadius:'10px', fontSize:'14px', color:'var(--text-primary)', boxSizing:'border-box', background: editMode ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', border: editMode ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)', opacity: editMode ? 1 : 0.8 }, extra || {}); };
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
                                    <input value={stammFelder[f[0]] || ''} readOnly={!editMode} onChange={function(e){ updateStammFeld(f[0], e.target.value); }} style={inputStyle()} />
                                </div>
                            ); })}
                        </div>
                    </div>
                );
            };

            return (
                <div style={{padding:'12px 16px', minHeight:'100vh', background:'var(--bg-primary)', paddingBottom:'160px'}}>
                    <div style={{textAlign:'center', marginBottom:'16px'}}>
                        <div style={{fontSize:'18px', fontWeight:'800', color:'var(--text-primary)'}}>{stammFelder.bauherr_firma || (kunde && kunde.name) || 'Kundendaten'}</div>
                        <div style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'4px'}}>{stammFelder.objekt_bauvorhaben || 'Projekt'}</div>
                    </div>
                    <div style={{display:'flex', gap:'4px', marginBottom:'16px', background:'var(--bg-secondary)', borderRadius:'12px', padding:'4px'}}>
                        {tabs.map(function(tab) { var isActive = activeTab === tab.id; return (
                            <button key={tab.id} {...tap(function(){ setActiveTab(tab.id); })} style={Object.assign({ flex:1, padding:'10px 8px', borderRadius:'10px', border:'none', cursor:'pointer', background: isActive ? 'var(--accent-blue)' : 'transparent', color: isActive ? 'white' : 'var(--text-muted)', fontSize:'12px', fontWeight:'700', textAlign:'center', transition:'all 0.15s ease' }, touchBase)}>
                                <span style={{fontSize:'16px', display:'block', marginBottom:'2px'}}>{tab.icon}</span>
                                {tab.label}{tab.count !== null && <span style={{marginLeft:'4px', fontSize:'10px', opacity:0.8}}>({tab.count})</span>}
                            </button>
                        ); })}
                    </div>
                    <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
                        {!editMode ? (
                            <button {...tap(function(){ setEditMode(true); })} style={Object.assign({ flex:1, padding:'14px', borderRadius:'12px', border:'none', cursor:'pointer', background:'linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)', color:'white', fontSize:'14px', fontWeight:'700', boxShadow:'0 4px 12px rgba(30,136,229,0.3)' }, touchBase)}>
                                Bearbeitung beginnen
                            </button>
                        ) : (
                            <button {...tap(handleSaveAndContinue)} style={Object.assign({ flex:1, padding:'14px', borderRadius:'12px', border:'none', cursor:'pointer', background:'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)', color:'white', fontSize:'14px', fontWeight:'700', boxShadow:'0 4px 12px rgba(39,174,96,0.3)' }, touchBase)}>
                                Bearbeitung beenden & Daten in Module laden
                            </button>
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
                        <div>
                            {editMode && ( <button {...tap(addPosition)} style={Object.assign({ width:'100%', padding:'12px', borderRadius:'12px', border:'2px dashed var(--accent-blue)', background:'rgba(30,136,229,0.05)', color:'var(--accent-blue)', fontSize:'14px', fontWeight:'700', cursor:'pointer', marginBottom:'12px' }, touchBase)}>+ Neue Position</button> )}
                            {positionen.map(function(p, idx) { return (
                                <div key={idx} style={{ background: p._istNachtrag ? 'rgba(230,126,34,0.06)' : 'var(--bg-secondary)', borderRadius:'12px', padding:'12px', marginBottom:'8px', border: p._istNachtrag ? '1px solid rgba(230,126,34,0.2)' : '1px solid var(--border-color)', position:'relative' }}>
                                    {editMode && ( <button {...tap(function(){ removePosition(idx); })} style={Object.assign({ position:'absolute', top:'8px', right:'8px', width:'28px', height:'28px', borderRadius:'50%', border:'none', background:'rgba(231,76,60,0.1)', color:'#e74c3c', fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }, touchBase)}>X</button> )}
                                    {p._istNachtrag && ( <span style={{fontSize:'9px', fontWeight:'700', color:'#e67e22', background:'rgba(230,126,34,0.12)', padding:'2px 8px', borderRadius:'6px', display:'inline-block', marginBottom:'6px'}}>NACHTRAG</span> )}
                                    <div style={{display:'grid', gridTemplateColumns:'80px 1fr', gap:'6px'}}>
                                        <div><label style={{fontSize:'10px', color:'var(--text-muted)'}}>Pos-Nr.</label><input value={p.pos} readOnly={!editMode} onChange={function(e){ updatePosition(idx, 'pos', e.target.value); }} style={inputStyle({fontSize:'13px', fontWeight:'700'})} /></div>
                                        <div><label style={{fontSize:'10px', color:'var(--text-muted)'}}>Leistung</label><input value={p.bez} readOnly={!editMode} onChange={function(e){ updatePosition(idx, 'bez', e.target.value); }} style={inputStyle({fontSize:'12px'})} /></div>
                                    </div>
                                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px', marginTop:'6px'}}>
                                        <div><label style={{fontSize:'10px', color:'var(--text-muted)'}}>Menge</label><input type="number" value={p.menge} readOnly={!editMode} onChange={function(e){ updatePosition(idx, 'menge', parseFloat(e.target.value) || 0); }} style={inputStyle({fontSize:'13px', textAlign:'right'})} /></div>
                                        <div><label style={{fontSize:'10px', color:'var(--text-muted)'}}>Einheit</label><input value={p.einheit} readOnly={!editMode} onChange={function(e){ updatePosition(idx, 'einheit', e.target.value); }} style={inputStyle({fontSize:'13px', textAlign:'center'})} /></div>
                                        <div><label style={{fontSize:'10px', color:'var(--text-muted)'}}>EP netto</label><input type="number" step="0.01" value={p.einzelpreis} readOnly={!editMode} onChange={function(e){ updatePosition(idx, 'einzelpreis', parseFloat(e.target.value) || 0); }} style={inputStyle({fontSize:'13px', textAlign:'right'})} /></div>
                                    </div>
                                </div>
                            ); })}
                            {positionen.length === 0 && ( <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-muted)'}}><div style={{fontSize:'36px', marginBottom:'8px'}}>{'\uD83D\uDCCE'}</div><div>Keine Positionen vorhanden</div></div> )}
                        </div>
                    )}

                    {activeTab === 'raeume' && (
                        <div>
                            {editMode && ( <button {...tap(addRaum)} style={Object.assign({ width:'100%', padding:'12px', borderRadius:'12px', border:'2px dashed #27ae60', background:'rgba(39,174,96,0.05)', color:'#27ae60', fontSize:'14px', fontWeight:'700', cursor:'pointer', marginBottom:'12px' }, touchBase)}>+ Neuer Raum</button> )}
                            {raeume.map(function(r, idx) { return (
                                <div key={idx} style={{ background:'var(--bg-secondary)', borderRadius:'12px', padding:'12px', marginBottom:'8px', border:'1px solid var(--border-color)', position:'relative' }}>
                                    {editMode && ( <button {...tap(function(){ removeRaum(idx); })} style={Object.assign({ position:'absolute', top:'8px', right:'8px', width:'28px', height:'28px', borderRadius:'50%', border:'none', background:'rgba(231,76,60,0.1)', color:'#e74c3c', fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }, touchBase)}>X</button> )}
                                    <div style={{display:'grid', gridTemplateColumns:'80px 1fr 60px', gap:'6px'}}>
                                        <div><label style={{fontSize:'10px', color:'var(--text-muted)'}}>Raum-Nr.</label><input value={r.nr} readOnly={!editMode} onChange={function(e){ updateRaum(idx, 'nr', e.target.value); }} style={inputStyle({fontSize:'13px', fontWeight:'700'})} /></div>
                                        <div><label style={{fontSize:'10px', color:'var(--text-muted)'}}>Bezeichnung</label><input value={r.bez} readOnly={!editMode} onChange={function(e){ updateRaum(idx, 'bez', e.target.value); }} style={inputStyle({fontSize:'13px'})} /></div>
                                        <div><label style={{fontSize:'10px', color:'var(--text-muted)'}}>Geschoss</label><input value={r.geschoss} readOnly={!editMode} onChange={function(e){ updateRaum(idx, 'geschoss', e.target.value); }} style={inputStyle({fontSize:'13px', textAlign:'center'})} /></div>
                                    </div>
                                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginTop:'6px'}}>
                                        <div><label style={{fontSize:'10px', color:'var(--text-muted)'}}>Flaeche (m2)</label><input type="number" step="0.01" value={r.flaeche} readOnly={!editMode} onChange={function(e){ updateRaum(idx, 'flaeche', parseFloat(e.target.value) || 0); }} style={inputStyle({fontSize:'13px', textAlign:'right'})} /></div>
                                        <div><label style={{fontSize:'10px', color:'var(--text-muted)'}}>Umfang (m)</label><input type="number" step="0.01" value={r.umfang} readOnly={!editMode} onChange={function(e){ updateRaum(idx, 'umfang', parseFloat(e.target.value) || 0); }} style={inputStyle({fontSize:'13px', textAlign:'right'})} /></div>
                                    </div>
                                    <div style={{marginTop:'6px'}}><label style={{fontSize:'10px', color:'var(--text-muted)'}}>Bemerkung</label><input value={r.bemerkung} readOnly={!editMode} onChange={function(e){ updateRaum(idx, 'bemerkung', e.target.value); }} style={inputStyle({fontSize:'11px'})} /></div>
                                </div>
                            ); })}
                            {raeume.length === 0 && ( <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-muted)'}}><div style={{fontSize:'36px', marginBottom:'8px'}}>{'\uD83C\uDFE0'}</div><div>Keine Raeume vorhanden</div></div> )}
                        </div>
                    )}

                    <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:'12px 16px 20px', background:'linear-gradient(transparent, var(--bg-primary) 20%)', zIndex:100 }}>
                        <div style={{display:'flex', gap:'8px', maxWidth:'500px', margin:'0 auto'}}>
                            <button {...tap(function(){ if (onBack) onBack(); })} style={Object.assign({ flex:'0 0 auto', padding:'12px 16px', borderRadius:'12px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-muted)', fontSize:'13px', fontWeight:'600', cursor:'pointer' }, touchBase)}>Zurueck</button>
                            <button {...tap(function(){ if (editMode) { handleSaveAndContinue(); } else if (onWeiterZuModulen) { onWeiterZuModulen(); } })} style={Object.assign({ flex:1, padding:'12px', borderRadius:'12px', border:'none', cursor:'pointer', background: editMode ? 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)' : 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)', color:'white', fontSize:'13px', fontWeight:'700', boxShadow: editMode ? '0 4px 12px rgba(39,174,96,0.3)' : '0 4px 12px rgba(230,126,34,0.3)' }, touchBase)}>
                                {editMode ? 'Speichern & Module laden' : 'Weiter zur Modulwahl'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
