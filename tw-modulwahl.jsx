        function ModulWahl({ kunde, onSelectModul, ordnerAnalyseMeta, onDatenBearbeiten, onOrdnerBrowser }) {
            const module = [
                { id: 'aufmass', icon: '\uD83D\uDCD0', name: 'Aufma\u00df', desc: 'VOB-konforme Aufma\u00df-Erfassung', color: '#1E88E5', ready: true },
                { id: 'rechnung', icon: '\uD83D\uDCB6', name: 'Rechnungen', desc: 'Abschlags- & Schlussrechnungen', color: '#27ae60', ready: true },
                { id: 'ausgangsbuch', icon: '\uD83D\uDCD2', name: 'Ausgangsbuch', desc: 'Rechnungsausgangsbuch & Analysen', color: '#e67e22', ready: true },
                { id: 'schriftverkehr', icon: '\u2709\uFE0F', name: 'Schriftverkehr', desc: 'Briefe, E-Mails, Korrespondenz', color: '#8e44ad', ready: true },
                { id: 'baustelle', icon: '\uD83D\uDCF1', name: 'Baustellen-App', desc: 'Admin-Panel f\u00fcr Mitarbeiter', color: '#e74c3c', ready: true },
            ];
            return (
                <div className="page-container" style={{padding:'20px 16px', minHeight:'100vh'}}>
                    <div style={{textAlign:'center', marginBottom:'20px'}}>
                        <FirmenLogo size="small" />
                        <div style={{marginTop:'12px', fontSize:'15px', fontWeight:'700', color:'var(--text-primary)'}}>
                            {kunde ? kunde.name : 'Kunde'}
                        </div>
                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'4px', letterSpacing:'1.5px', textTransform:'uppercase'}}>
                            Modul w\u00e4hlen
                        </div>
                    </div>

                    {/* Schnellzugriff: Daten bearbeiten + Ordner durchsuchen */}
                    <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
                        {onDatenBearbeiten && (
                            <button onClick={onDatenBearbeiten} style={{flex:1, padding:'10px', borderRadius:'10px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', cursor:'pointer', fontSize:'12px', fontWeight:'600', color:'var(--text-secondary)', touchAction:'manipulation'}}>
                                {'\uD83D\uDCCB'} Kundendaten
                            </button>
                        )}
                        {onOrdnerBrowser && kunde && (kunde._driveFolderId || kunde.id) && (
                            <button onClick={onOrdnerBrowser} style={{flex:1, padding:'10px', borderRadius:'10px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', cursor:'pointer', fontSize:'12px', fontWeight:'600', color:'var(--text-secondary)', touchAction:'manipulation'}}>
                                {'\uD83D\uDCC1'} Ordner durchsuchen
                            </button>
                        )}
                    </div>

                    {/* Modul-Kacheln */}
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                        {module.map(function(m) {
                            return (
                                <button key={m.id} onClick={function() { if (m.ready) onSelectModul(m.id); }}
                                    style={{
                                        padding:'20px 14px', borderRadius:'16px', border:'none', cursor: m.ready ? 'pointer' : 'default',
                                        background: m.ready ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                                        opacity: m.ready ? 1 : 0.5,
                                        display:'flex', flexDirection:'column', alignItems:'center', gap:'8px',
                                        boxShadow: m.ready ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                                        transition:'transform 0.15s, box-shadow 0.15s',
                                        position:'relative'
                                    }}>
                                    <span style={{fontSize:'32px'}}>{m.icon}</span>
                                    <span style={{fontSize:'14px', fontWeight:'700', color: m.ready ? m.color : 'var(--text-muted)'}}>{m.name}</span>
                                    <span style={{fontSize:'10px', color:'var(--text-muted)', textAlign:'center', lineHeight:'1.3'}}>{m.desc}</span>
                                    {!m.ready && (
                                        <span style={{position:'absolute', top:'8px', right:'8px', fontSize:'9px', background:'rgba(231,76,60,0.15)', color:'#e74c3c', padding:'2px 6px', borderRadius:'6px', fontWeight:'600'}}>
                                            BALD
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           KI-ANALYSE OVERLAY -- Fortschrittsanzeige
           ═══════════════════════════════════════════ */
        function KiAnalyseOverlay({ progress, currentDoc, totalDocs, details }) {
            var pct = totalDocs > 0 ? Math.round((currentDoc / totalDocs) * 100) : 0;
            return (
                <div className="modal-overlay" style={{zIndex:5000, background:'rgba(10,15,25,0.95)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <div style={{width:'90%', maxWidth:'400px', textAlign:'center', color:'white'}}>
                        <div style={{fontSize:'48px', marginBottom:'16px'}}>🤖</div>
                        <div style={{fontSize:'18px', fontWeight:'700', marginBottom:'8px'}}>KI-Analyse läuft...</div>

                        {/* Fortschrittsbalken */}
                        <div style={{width:'100%', height:'8px', background:'rgba(255,255,255,0.1)', borderRadius:'4px', overflow:'hidden', marginBottom:'12px'}}>
                            <div style={{width: pct + '%', height:'100%', background:'linear-gradient(90deg, #1E88E5, #8e44ad)', borderRadius:'4px', transition:'width 0.5s ease'}}></div>
                        </div>
                        <div style={{fontSize:'14px', color:'rgba(255,255,255,0.7)', marginBottom:'16px'}}>
                            {progress || ('Dokument ' + currentDoc + ' von ' + totalDocs + ' wird analysiert')}
                        </div>
                        <div style={{fontSize:'13px', fontWeight:'600', marginBottom:'12px'}}>{pct}%</div>

                        {/* Detail-Liste */}
                        {details && details.length > 0 && (
                            <div style={{textAlign:'left', fontSize:'12px', lineHeight:'1.8'}}>
                                {details.map(function(d, i) {
                                    return (
                                        <div key={i} style={{color: d.done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)'}}>
                                            {d.done ? '✅' : '⏳'} {d.text}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           KI-AKTE ANSICHT -- Zentrale Analyseergebnisse
           ═══════════════════════════════════════════ */
        function KiAkteView({ kiAkte, kunde, onClose, onNeuAnalyse }) {
            const [activeTab, setActiveTab] = useState('positionen');
            if (!kiAkte || !kiAkte.meta) {
                return (
                    <div className="modal-overlay" style={{zIndex:4000}}>
                        <div style={{width:'95%', maxWidth:'700px', background:'var(--bg-primary)', borderRadius:'16px', padding:'24px', textAlign:'center'}}>
                            <div style={{fontSize:'48px', marginBottom:'12px'}}>🤖</div>
                            <div style={{fontSize:'16px', fontWeight:'700', marginBottom:'8px'}}>Keine KI-Akte vorhanden</div>
                            <div style={{fontSize:'13px', color:'var(--text-muted)', marginBottom:'20px'}}>
                                Öffne den Kunden über "Kunde NEU" um eine KI-Analyse durchzuführen.
                            </div>
                            <button onClick={onClose} style={{padding:'10px 24px', background:'var(--accent-blue)', color:'white', border:'none', borderRadius:'10px', fontSize:'14px', cursor:'pointer'}}>
                                Schließen
                            </button>
                        </div>
                    </div>
                );
            }

            var pos = kiAkte.positionen || [];
            var nachtr = kiAkte.nachtraege || [];
            var fristen = kiAkte.fristen || [];
            var warnungen = kiAkte.warnhinweise || [];
            var vertrag = kiAkte.vertrag || {};
            var quellen = kiAkte.quelldokumente || [];

            var tabs = [
                { id: 'positionen', label: '📋 Positionen (' + pos.length + ')' },
                { id: 'nachtraege', label: '📑 Nachträge (' + nachtr.length + ')' },
                { id: 'fristen', label: '📅 Fristen (' + fristen.length + ')' },
                { id: 'warnungen', label: '⚠ Hinweise (' + warnungen.length + ')' },
                { id: 'quellen', label: '📄 Quellen (' + quellen.length + ')' },
            ];

            return (
                <div className="modal-overlay" style={{zIndex:4000}}>
                    <div style={{width:'95%', maxWidth:'750px', maxHeight:'92vh', background:'var(--bg-primary)', borderRadius:'16px', overflow:'hidden', display:'flex', flexDirection:'column'}}>
                        {/* Header */}
                        <div style={{padding:'16px 20px', borderBottom:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:'12px'}}>
                            <span style={{fontSize:'24px'}}>🤖</span>
                            <div style={{flex:1}}>
                                <div style={{fontSize:'16px', fontWeight:'700'}}>KI-Akte: {kunde ? kunde.name : ''}</div>
                                <div style={{fontSize:'11px', color:'var(--text-muted)'}}>
                                    Analysiert: {kiAkte.meta.analyseZeitpunkt ? new Date(kiAkte.meta.analyseZeitpunkt).toLocaleString('de-DE') : '–'} · {kiAkte.meta.anzahlDokumente || 0} Dokumente
                                </div>
                            </div>
                            <button onClick={onClose} style={{background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'var(--text-muted)'}}>✕</button>
                        </div>

                        {/* Schnellübersicht-Karten */}
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', padding:'12px 16px'}}>
                            <div style={{padding:'10px', borderRadius:'10px', background:'rgba(39,174,96,0.1)', border:'1px solid rgba(39,174,96,0.2)'}}>
                                <div style={{fontSize:'11px', color:'#27ae60', fontWeight:'600'}}>AUFTRAGSSUMME</div>
                                <div style={{fontSize:'16px', fontWeight:'700', color:'var(--text-primary)'}}>{vertrag.auftragssumme ? Number(vertrag.auftragssumme).toLocaleString('de-DE', {style:'currency', currency:'EUR'}) : '–'}</div>
                            </div>
                            <div style={{padding:'10px', borderRadius:'10px', background:'rgba(30,136,229,0.1)', border:'1px solid rgba(30,136,229,0.2)'}}>
                                <div style={{fontSize:'11px', color:'#1E88E5', fontWeight:'600'}}>POSITIONEN</div>
                                <div style={{fontSize:'16px', fontWeight:'700', color:'var(--text-primary)'}}>{pos.length}</div>
                            </div>
                            <div style={{padding:'10px', borderRadius:'10px', background:'rgba(230,126,34,0.1)', border:'1px solid rgba(230,126,34,0.2)'}}>
                                <div style={{fontSize:'11px', color:'#e67e22', fontWeight:'600'}}>OFFENE NACHTRÄGE</div>
                                <div style={{fontSize:'16px', fontWeight:'700', color:'var(--text-primary)'}}>{nachtr.filter(function(n){return n.status !== 'beauftragt';}).length}</div>
                            </div>
                            <div style={{padding:'10px', borderRadius:'10px', background: warnungen.length > 0 ? 'rgba(231,76,60,0.1)' : 'rgba(127,140,141,0.1)', border: '1px solid ' + (warnungen.length > 0 ? 'rgba(231,76,60,0.2)' : 'rgba(127,140,141,0.2)')}}>
                                <div style={{fontSize:'11px', color: warnungen.length > 0 ? '#e74c3c' : '#7f8c8d', fontWeight:'600'}}>⚠ WARNUNGEN</div>
                                <div style={{fontSize:'16px', fontWeight:'700', color:'var(--text-primary)'}}>{warnungen.length}</div>
                            </div>
                        </div>

                        {/* Tab-Leiste */}
                        <div style={{display:'flex', gap:'4px', padding:'0 16px', overflowX:'auto', borderBottom:'1px solid var(--border-color)'}}>
                            {tabs.map(function(t) {
                                return (
                                    <button key={t.id} onClick={function(){setActiveTab(t.id);}}
                                        style={{
                                            padding:'8px 12px', fontSize:'11px', fontWeight:'600', cursor:'pointer',
                                            border:'none', background:'none', whiteSpace:'nowrap',
                                            color: activeTab === t.id ? 'var(--accent-blue)' : 'var(--text-muted)',
                                            borderBottom: activeTab === t.id ? '2px solid var(--accent-blue)' : '2px solid transparent'
                                        }}>
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab-Inhalt */}
                        <div style={{flex:1, overflow:'auto', padding:'12px 16px'}}>
                            {activeTab === 'positionen' && (
                                <div>
                                    {pos.length === 0 ? (
                                        <div style={{textAlign:'center', padding:'30px', color:'var(--text-muted)'}}>Keine Positionen erkannt</div>
                                    ) : pos.map(function(p, i) {
                                        return (
                                            <div key={i} style={{padding:'10px 12px', borderBottom:'1px solid var(--border-color)', fontSize:'13px'}}>
                                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                    <span style={{fontWeight:'700', color:'var(--accent-blue)', minWidth:'70px'}}>{p.posNr || ('Pos.' + (i+1))}</span>
                                                    <span style={{flex:1, marginLeft:'8px'}}>{p.titel || p.bezeichnung || '–'}</span>
                                                    <span style={{fontWeight:'600', minWidth:'60px', textAlign:'right'}}>{p.menge ? Number(p.menge).toLocaleString('de-DE') : '–'}</span>
                                                    <span style={{color:'var(--text-muted)', minWidth:'30px', textAlign:'right', fontSize:'11px'}}>{p.einheit || ''}</span>
                                                </div>
                                                {p.besonderheiten && <div style={{fontSize:'11px', color:'#e67e22', marginTop:'4px'}}>ℹ {p.besonderheiten}</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {activeTab === 'nachtraege' && (
                                <div>
                                    {nachtr.length === 0 ? (
                                        <div style={{textAlign:'center', padding:'30px', color:'var(--text-muted)'}}>Keine Nachträge erkannt</div>
                                    ) : nachtr.map(function(n, i) {
                                        var statusColor = n.status === 'beauftragt' ? '#27ae60' : n.status === 'angeboten' ? '#e67e22' : '#e74c3c';
                                        return (
                                            <div key={i} style={{padding:'12px', borderBottom:'1px solid var(--border-color)'}}>
                                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                    <span style={{fontWeight:'700'}}>{n.nachtragNr || ('N' + (i+1))}: {n.bezeichnung || '–'}</span>
                                                    <span style={{fontSize:'12px', padding:'2px 8px', borderRadius:'6px', background: statusColor + '22', color: statusColor, fontWeight:'600'}}>
                                                        {n.status || 'offen'}
                                                    </span>
                                                </div>
                                                {n.summe && <div style={{fontSize:'13px', fontWeight:'600', marginTop:'4px'}}>{Number(n.summe).toLocaleString('de-DE', {style:'currency', currency:'EUR'})}</div>}
                                                {n.grund && <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'2px'}}>{n.grund}</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {activeTab === 'fristen' && (
                                <div>
                                    {fristen.length === 0 ? (
                                        <div style={{textAlign:'center', padding:'30px', color:'var(--text-muted)'}}>Keine Fristen erkannt</div>
                                    ) : fristen.map(function(f, i) {
                                        var daysLeft = f.datum ? Math.ceil((new Date(f.datum) - new Date()) / 86400000) : null;
                                        var fColor = daysLeft !== null ? (daysLeft < 14 ? '#e74c3c' : daysLeft < 30 ? '#e67e22' : daysLeft < 180 ? '#27ae60' : '#95a5a6') : '#95a5a6';
                                        return (
                                            <div key={i} style={{padding:'10px 12px', borderBottom:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:'10px'}}>
                                                <span style={{width:'10px', height:'10px', borderRadius:'50%', background: fColor, flexShrink:0}}></span>
                                                <div style={{flex:1}}>
                                                    <div style={{fontSize:'13px', fontWeight:'600'}}>{f.bezeichnung || '–'}</div>
                                                    <div style={{fontSize:'11px', color:'var(--text-muted)'}}>{f.datum || '–'} {f.typ ? '(' + f.typ + ')' : ''}</div>
                                                </div>
                                                {daysLeft !== null && <span style={{fontSize:'12px', fontWeight:'700', color: fColor}}>{daysLeft > 0 ? daysLeft + ' Tage' : 'ÜBERFÄLLIG'}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {activeTab === 'warnungen' && (
                                <div>
                                    {warnungen.length === 0 ? (
                                        <div style={{textAlign:'center', padding:'30px', color:'var(--text-muted)'}}>Keine Warnhinweise</div>
                                    ) : warnungen.map(function(w, i) {
                                        return (
                                            <div key={i} style={{padding:'10px 12px', borderBottom:'1px solid var(--border-color)', fontSize:'13px', display:'flex', gap:'8px'}}>
                                                <span>⚠</span>
                                                <span>{typeof w === 'string' ? w : w.text || JSON.stringify(w)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {activeTab === 'quellen' && (
                                <div>
                                    {quellen.length === 0 ? (
                                        <div style={{textAlign:'center', padding:'30px', color:'var(--text-muted)'}}>Keine Quelldokumente</div>
                                    ) : quellen.map(function(q, i) {
                                        return (
                                            <div key={i} style={{padding:'10px 12px', borderBottom:'1px solid var(--border-color)', fontSize:'13px'}}>
                                                <div style={{fontWeight:'600'}}>📄 {q.dateiname || ('Dokument ' + (i+1))}</div>
                                                <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'2px'}}>{q.dokumentTyp || '–'} · {q.zusammenfassung || ''}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer mit Neu-Analyse */}
                        <div style={{padding:'12px 16px', borderTop:'1px solid var(--border-color)', display:'flex', gap:'8px'}}>
                            <button onClick={onNeuAnalyse} style={{flex:1, padding:'10px', background:'rgba(231,76,60,0.1)', color:'#e74c3c', border:'1px solid rgba(231,76,60,0.2)', borderRadius:'10px', fontSize:'12px', fontWeight:'600', cursor:'pointer'}}>
                                🔄 KI-Analyse neu starten
                            </button>
                            <button onClick={onClose} style={{flex:1, padding:'10px', background:'var(--accent-blue)', color:'white', border:'none', borderRadius:'10px', fontSize:'12px', fontWeight:'600', cursor:'pointer'}}>
                                Schließen
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           KI-ORDNERANALYSE -- UI-Komponenten
           ═══════════════════════════════════════════ */

        // ── Kundenübersicht: Alle Kunden mit ihren Analysen ──
        function OrdnerAnalyseUebersicht({ kunde, onStartAnalyse, onReanalyzeOrdner, onOpenDetail, onBack, refreshKey }) {
            const [meta, setMeta] = useState(null);
            const [analysen, setAnalysen] = useState([]);
            const [crossRef, setCrossRef] = useState(null);
            const [loading, setLoading] = useState(true);
            const [showCrossRefDetail, setShowCrossRefDetail] = useState(false);

            // Lade Daten -- refreshKey erzwingt Neuladen nach Analyse
            useEffect(function() {
                if (!kunde) return;
                setLoading(true);
                var kundenId = kunde._driveFolderId || kunde.id || kunde.name;
                Promise.all([
                    window.OrdnerAnalyseDB.getMeta(kundenId),
                    window.OrdnerAnalyseDB.getAllOrdnerAnalysen(kundenId),
                    window.OrdnerAnalyseDB.getCrossRef(kundenId)
                ]).then(function(results) {
                    setMeta(results[0]);
                    setAnalysen(results[1]);
                    setCrossRef(results[2]);
                    setLoading(false);
                }).catch(function() { setLoading(false); });
            }, [kunde, refreshKey]);

            if (loading) return React.createElement('div', {className:'page-container', style:{padding:'40px', textAlign:'center'}}, '⏳ Lade Analysedaten...');

            var cfg = ORDNER_ANALYSE_CONFIG.ORDNER;
            var kundenId = kunde ? (kunde._driveFolderId || kunde.id || kunde.name) : '';

            // Qualitäts-Score berechnen
            var completedAnalysen = analysen.filter(function(a) { return a.status === 'completed'; });
            var avgQuality = completedAnalysen.length > 0 ? Math.round(completedAnalysen.reduce(function(s,a) { return s + (a.ergebnis && a.ergebnis.vollstaendigkeit ? 85 : 70); }, 0) / completedAnalysen.length) : 0;
            var gesamtFehler = crossRef && crossRef.zusammenfassung ? crossRef.zusammenfassung.gesamtFehler : 0;

            return (
                <div className="page-container" style={{padding:'20px 16px', minHeight:'100vh'}}>
                    {/* Header */}
                    <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px'}}>
                        <button onClick={onBack} style={{background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'var(--text-primary)', padding:'4px'}}>←</button>
                        <div>
                            <div style={{fontSize:'16px', fontWeight:'700', color:'var(--text-primary)'}}>🤖 KI-Ordneranalyse</div>
                            <div style={{fontSize:'11px', color:'var(--text-muted)', letterSpacing:'1px', textTransform:'uppercase'}}>{kunde ? kunde.name : ''}</div>
                        </div>
                    </div>

                    {/* Status-Banner */}
                    {meta && meta.status === 'completed' ? (
                        <div style={{padding:'14px 16px', marginBottom:'16px', background:'linear-gradient(135deg, rgba(46,204,113,0.12) 0%, rgba(30,136,229,0.12) 100%)', border:'1px solid rgba(46,204,113,0.3)', borderRadius:'12px'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <div>
                                    <div style={{fontWeight:'700', fontSize:'13px', color:'var(--success)'}}>✅ Analyse abgeschlossen</div>
                                    <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'2px'}}>
                                        {meta.ordnerAnalysiert || 0}/{meta.ordnerGefunden || 0} Ordner · {meta.gesamtDokumente || 0} Dokumente · {gesamtFehler > 0 ? '⚠ ' + gesamtFehler + ' Unstimmigkeiten' : '✓ Keine Unstimmigkeiten'}
                                    </div>
                                </div>
                                <div style={{textAlign:'right'}}>
                                    <div style={{fontSize:'20px', fontWeight:'700', color: avgQuality >= 80 ? 'var(--success)' : avgQuality >= 60 ? '#f39c12' : '#e74c3c'}}>{avgQuality}%</div>
                                    <div style={{fontSize:'9px', color:'var(--text-muted)'}}>Qualität</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{padding:'14px 16px', marginBottom:'16px', background:'rgba(231,76,60,0.08)', border:'1px solid rgba(231,76,60,0.2)', borderRadius:'12px', textAlign:'center'}}>
                            <div style={{fontSize:'13px', fontWeight:'600', color:'#e74c3c', marginBottom:'8px'}}>Noch keine Ordneranalyse durchgeführt</div>
                            <button onClick={function() { onStartAnalyse(kundenId); }} style={{
                                padding:'10px 20px', background:'linear-gradient(135deg, #1E88E5 0%, #8e44ad 100%)',
                                color:'white', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'700', cursor:'pointer'
                            }}>🚀 Ordneranalyse starten</button>
                        </div>
                    )}

                    {/* Ordner-Karten -- ALLE analysierten Ordner anzeigen */}
                    <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                        {/* Erst konfigurierte Ordner (01-08) */}
                        {['01','02','03','04','05','06','07','08'].map(function(nr) {
                            var ordnerCfg = cfg[nr];
                            var analyse = analysen.find(function(a) { return a.ordnerNr === nr; });
                            var status = analyse ? analyse.status : 'pending';
                            var statusIcon = status === 'completed' ? '✅' : status === 'error' ? '❌' : status === 'running' ? '⏳' : '⬜';
                            var docsCount = analyse ? (analyse.dokumenteAnalysiert || 0) : 0;

                            var summary = '';
                            if (analyse && analyse.ergebnis) {
                                var e = analyse.ergebnis;
                                if (e.lvPositionen) summary = e.lvPositionen.length + ' LV-Pos.';
                                if (e.nachtraege && e.nachtraege.length > 0) summary += (summary ? ' · ' : '') + e.nachtraege.length + ' Nachträge';
                                if (e.geschosse) summary = (e.zusammenfassung ? e.zusammenfassung.fliesenRaeume || 0 : 0) + ' Räume';
                                if (e.stundenZusammenfassung) summary = (e.stundenZusammenfassung.gesamtStunden || 0) + ' Stunden';
                                if (e.rechnungen) summary = e.rechnungen.length + ' Rechnungen';
                                if (e.fliesen) summary = (e.fliesen.length || 0) + ' Fliesen · ' + (e.zubehoer ? e.zubehoer.length : 0) + ' Zubehör';
                                if (e.aufmassPositionen) summary = e.aufmassPositionen.length + ' Aufmaß-Pos.';
                                if (e.kontaktdaten) summary = ((e.kontaktdaten.neuGefunden||[]).length) + ' Kontakte';
                            }

                            return (
                                <button key={nr} onClick={function() { if (analyse) onOpenDetail(nr); else if (onReanalyzeOrdner) onReanalyzeOrdner(nr); }}
                                    style={{width:'100%', padding:'12px 14px', borderRadius:'12px', border:'1px solid var(--border-subtle)',
                                        background:'var(--bg-secondary)', display:'flex', alignItems:'center', gap:'12px',
                                        cursor:'pointer', opacity: 1, textAlign:'left', WebkitTapHighlightColor:'rgba(30,136,229,0.2)', touchAction:'manipulation'}}>
                                    <span style={{fontSize:'24px'}}>{ordnerCfg.icon}</span>
                                    <div style={{flex:1, minWidth:0}}>
                                        <div style={{fontSize:'13px', fontWeight:'700', color: ordnerCfg.color}}>
                                            {nr} {ordnerCfg.name}
                                            {ordnerCfg.kritisch && <span style={{fontSize:'9px', background:'rgba(231,76,60,0.15)', color:'#e74c3c', padding:'1px 5px', borderRadius:'4px', marginLeft:'6px', fontWeight:'600'}}>KRITISCH</span>}
                                        </div>
                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'2px'}}>
                                            {status === 'completed' ? (docsCount + ' Dok. · ' + (summary || 'Analysiert')) : status === 'error' ? 'Fehler bei Analyse' : 'Nicht analysiert'}
                                        </div>
                                    </div>
                                    <span style={{fontSize:'16px'}}>{statusIcon}</span>
                                </button>
                            );
                        })}

                        {/* Zusätzliche (generische) Ordner die nicht den Standard-Typen zugeordnet werden konnten */}
                        {analysen.filter(function(a) { return a.ordnerNr && (a.ordnerNr.indexOf('99') === 0 || a.ordnerNr.indexOf('00') === 0); }).map(function(analyse) {
                            var status = analyse.status || 'pending';
                            var statusIcon = status === 'completed' ? '✅' : status === 'error' ? '❌' : '⏳';
                            var docsCount = analyse.dokumenteAnalysiert || 0;
                            var summary = '';
                            if (analyse.ergebnis) {
                                var e = analyse.ergebnis;
                                if (e.lvPositionen && e.lvPositionen.length > 0) summary += e.lvPositionen.length + ' Pos.';
                                if (e.personen) summary += (summary ? ' · ' : '') + 'Kontakte';
                                if (e.raeume && e.raeume.length > 0) summary += (summary ? ' · ' : '') + e.raeume.length + ' Räume';
                            }
                            return (
                                <button key={analyse.ordnerNr} onClick={function() { onOpenDetail(analyse.ordnerNr); }}
                                    style={{width:'100%', padding:'12px 14px', borderRadius:'12px', border:'1px solid rgba(127,140,141,0.3)',
                                        background:'var(--bg-secondary)', display:'flex', alignItems:'center', gap:'12px',
                                        cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'rgba(30,136,229,0.2)', touchAction:'manipulation'}}>
                                    <span style={{fontSize:'24px'}}>📂</span>
                                    <div style={{flex:1, minWidth:0}}>
                                        <div style={{fontSize:'13px', fontWeight:'700', color:'#7f8c8d'}}>{analyse.ordnerName || ('Ordner ' + analyse.ordnerNr)}</div>
                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'2px'}}>
                                            {status === 'completed' ? (docsCount + ' Dok. · ' + (summary || 'Analysiert')) : 'Fehler'}
                                        </div>
                                    </div>
                                    <span style={{fontSize:'16px'}}>{statusIcon}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Cross-Referencing Zusammenfassung */}
                    {crossRef && crossRef.zusammenfassung && (
                        <div style={{marginTop:'16px', padding:'14px 16px', background:'var(--bg-secondary)', borderRadius:'12px', border:'1px solid var(--border-subtle)'}}>
                            <div onClick={function() { setShowCrossRefDetail(!showCrossRefDetail); }} style={{fontWeight:'700', fontSize:'13px', marginBottom:'8px', color:'var(--text-primary)', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span>📊 Cross-Referencing</span>
                                <span style={{fontSize:'11px', color:'var(--text-muted)'}}>{showCrossRefDetail ? '▲ Zuklappen' : '▼ Details'}</span>
                            </div>
                            <div style={{fontSize:'11px', color:'var(--text-secondary)', lineHeight:'1.8'}}>
                                ✅ {crossRef.zusammenfassung.exaktGleich || 0} Positionen exakt gleich{' · '}
                                {(crossRef.zusammenfassung.abweichungen || 0) + (crossRef.zusammenfassung.nurInOrdner01 || 0) + (crossRef.zusammenfassung.nurInOrdner02 || 0) > 0
                                    ? '🔴 ' + ((crossRef.zusammenfassung.abweichungen || 0) + (crossRef.zusammenfassung.nurInOrdner01 || 0) + (crossRef.zusammenfassung.nurInOrdner02 || 0)) + ' Unstimmigkeiten'
                                    : '✅ Keine Unstimmigkeiten'}
                            </div>
                            {showCrossRefDetail && (
                                <div style={{marginTop:'10px', borderTop:'1px solid var(--border-subtle)', paddingTop:'10px'}}>
                                    {crossRef.zusammenfassung.nurPosNrAnders > 0 && <div style={{fontSize:'11px', color:'#f39c12', marginBottom:'4px'}}>⚠️ {crossRef.zusammenfassung.nurPosNrAnders} Positionen -- nur Positionsnummer anders</div>}
                                    {crossRef.zusammenfassung.abweichungen > 0 && <div style={{fontSize:'11px', color:'#e74c3c', marginBottom:'4px'}}>🔴 {crossRef.zusammenfassung.abweichungen} Positionen mit Daten-Abweichungen</div>}
                                    {crossRef.zusammenfassung.nurInOrdner01 > 0 && <div style={{fontSize:'11px', color:'#e74c3c', marginBottom:'4px'}}>🔴 {crossRef.zusammenfassung.nurInOrdner01} Positionen nur in Baustellenauswertung</div>}
                                    {crossRef.zusammenfassung.nurInOrdner02 > 0 && <div style={{fontSize:'11px', color:'#e74c3c', marginBottom:'4px'}}>🔴 {crossRef.zusammenfassung.nurInOrdner02} Positionen nur im LV</div>}
                                    {crossRef.zusammenfassung.mengenAbweichungenKritisch > 0 && <div style={{fontSize:'11px', color:'#e74c3c', marginBottom:'4px'}}>🔴 {crossRef.zusammenfassung.mengenAbweichungenKritisch} kritische Mengenabweichungen (Aufmaß ↔ LV)</div>}
                                    {/* Positionsvergleich-Tabelle */}
                                    {crossRef.positionsVergleich && crossRef.positionsVergleich.filter(function(v) { return v.status !== 'match'; }).length > 0 && (
                                        <div style={{marginTop:'8px', maxHeight:'200px', overflow:'auto', borderRadius:'8px', border:'1px solid var(--border-subtle)'}}>
                                            {crossRef.positionsVergleich.filter(function(v) { return v.status !== 'match'; }).map(function(v, i) {
                                                var icon = v.status === 'abweichung' ? '⚠️' : v.status === 'posNr_abweichung' ? '🔄' : v.status === 'nur_in_ordner01' ? '📋' : v.status === 'nur_in_ordner02' ? '📑' : '❓';
                                                var label = v.status === 'abweichung' ? 'Abweichung' : v.status === 'posNr_abweichung' ? 'Pos-Nr. anders' : v.status === 'nur_in_ordner01' ? 'Nur in Baustellen.' : v.status === 'nur_in_ordner02' ? 'Nur in LV' : v.status;
                                                return React.createElement('div', { key: i, style: { padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)', fontSize: '11px', display: 'flex', gap: '8px', alignItems: 'center' } },
                                                    React.createElement('span', null, icon),
                                                    React.createElement('span', { style: { fontWeight: '600', minWidth: '60px' } }, v.posNr || v.posNr02 || '–'),
                                                    React.createElement('span', { style: { color: 'var(--text-muted)', flex: 1 } }, label),
                                                    v.abweichungen && v.abweichungen.length > 0 && React.createElement('span', { style: { color: '#e74c3c', fontSize: '10px' } }, v.abweichungen.map(function(a) { return a.feld; }).join(', '))
                                                );
                                            })}
                                        </div>
                                    )}
                                    {/* Mengenvergleich */}
                                    {crossRef.mengenVergleich && crossRef.mengenVergleich.length > 0 && (
                                        <div style={{marginTop:'8px'}}>
                                            <div style={{fontSize:'11px', fontWeight:'700', marginBottom:'4px'}}>📏 Mengenvergleich (Aufmaß ↔ LV)</div>
                                            {crossRef.mengenVergleich.filter(function(v) { return v.bewertung !== 'im_rahmen'; }).map(function(v, i) {
                                                var col = v.bewertung === 'kritisch' ? '#e74c3c' : '#f39c12';
                                                return React.createElement('div', { key: i, style: { fontSize: '10px', padding: '3px 0', color: col } },
                                                    'Pos ' + v.posNr + ': LV ' + v.lvMenge + ' ' + (v.einheit || '') + ' ↔ Aufmaß ' + (v.aufmassMenge || 0).toFixed(2) + ' (' + (v.differenzProzent > 0 ? '+' : '') + v.differenzProzent.toFixed(1) + '%)'
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Aktionen */}
                    {meta && meta.status === 'completed' && (
                        <div style={{marginTop:'16px', display:'flex', gap:'8px'}}>
                            <button onClick={function() { onStartAnalyse(kundenId); }} style={{
                                flex:1, padding:'10px', background:'var(--bg-tertiary)', color:'var(--text-secondary)', border:'1px solid var(--border-subtle)',
                                borderRadius:'10px', fontSize:'12px', fontWeight:'600', cursor:'pointer'
                            }}>🔄 Alle neu analysieren</button>
                        </div>
                    )}
                </div>
            );
        }

        // ── Ordneranalyse-Fortschritt (Overlay) ──
        function OrdnerAnalyseProgress({ progress, onClose }) {
            var pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
            if (progress.phase === 'crossref') pct = 90;
            if (progress.phase === 'done') pct = 100;
            if (progress.phase === 'start') pct = 5;
            return (
                <div className="modal-overlay" style={{zIndex:5000}}>
                    <div style={{width:'90%', maxWidth:'500px', background:'var(--bg-primary)', borderRadius:'16px', padding:'28px', textAlign:'center'}}>
                        <div style={{fontSize:'48px', marginBottom:'12px', animation: progress.phase === 'done' ? 'none' : 'spin 2s linear infinite'}}>{progress.phase === 'done' ? '✅' : '🤖'}</div>
                        <div style={{fontSize:'16px', fontWeight:'700', marginBottom:'4px', color:'var(--text-primary)'}}>
                            {progress.phase === 'done' ? 'Analyse abgeschlossen!' : 'KI-Ordneranalyse läuft...'}
                        </div>

                        {/* Große Prozentanzeige */}
                        <div style={{fontSize:'36px', fontWeight:'700', color:'var(--accent-blue)', marginBottom:'8px', fontFamily:'monospace'}}>
                            {pct}%
                        </div>

                        <div style={{fontSize:'13px', color:'var(--accent-blue)', marginBottom:'16px', minHeight:'20px'}}>
                            {progress.message || 'Vorbereitung...'}
                        </div>
                        {progress.total > 0 && (
                            <div style={{marginBottom:'16px'}}>
                                <div style={{height:'8px', background:'var(--bg-tertiary)', borderRadius:'4px', overflow:'hidden', border:'1px solid var(--border-color)'}}>
                                    <div style={{
                                        height:'100%', borderRadius:'4px', transition:'width 0.5s ease-out',
                                        background:'linear-gradient(90deg, #1E88E5, #8e44ad, #27ae60)',
                                        width: pct + '%'
                                    }} />
                                </div>
                                <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'4px'}}>
                                    Ordner {progress.current || 0} von {progress.total || 0}
                                </div>
                            </div>
                        )}
                        {progress.phase === 'done' && (
                            <button onClick={onClose} style={{padding:'12px 28px', background:'var(--success)', color:'white', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'700', cursor:'pointer', marginTop:'8px', touchAction:'manipulation', WebkitTapHighlightColor:'rgba(30,136,229,0.2)'}}>
                                🚀 Ergebnis anzeigen
                            </button>
                        )}
                        {progress.phase !== 'done' && (
                            <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'8px', opacity:0.6}}>
                                Bitte nicht schließen
                            </div>
                        )}
                        <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
                    </div>
                </div>
            );
        }

        // ── Ordner-Detail-Ansicht ──
        function OrdnerAnalyseDetail({ kunde, ordnerNr, onBack, onReanalyze, refreshKey }) {
            const [analyse, setAnalyse] = useState(null);
            const [loading, setLoading] = useState(true);

            useEffect(function() {
                if (!kunde || !ordnerNr) return;
                setLoading(true);
                var kundenId = kunde._driveFolderId || kunde.id || kunde.name;
                window.OrdnerAnalyseDB.getOrdnerAnalyse(kundenId, ordnerNr).then(function(data) {
                    setAnalyse(data);
                    setLoading(false);
                }).catch(function() { setLoading(false); });
            }, [kunde, ordnerNr, refreshKey]);

            if (loading) return React.createElement('div', {className:'page-container', style:{padding:'40px', textAlign:'center'}}, '⏳ Lade...');
            if (!analyse) return React.createElement('div', {className:'page-container', style:{padding:'40px', textAlign:'center'}}, '❌ Keine Daten');

            var cfg = ORDNER_ANALYSE_CONFIG.ORDNER[ordnerNr];
            var ergebnis = analyse.ergebnis || {};

            // Dynamischer Content je nach Ordner
            var renderContent = function() {
                // LV-Positionen (01, 02)
                var positionen = ergebnis.lvPositionen || ergebnis.aufmassPositionen || [];
                if (positionen.length > 0) {
                    return React.createElement('div', null,
                        React.createElement('div', {style:{fontWeight:'700', fontSize:'13px', marginBottom:'8px', color:'var(--text-primary)'}}, '📋 ' + positionen.length + ' Positionen'),
                        React.createElement('div', {style:{maxHeight:'400px', overflowY:'auto', borderRadius:'8px', border:'1px solid var(--border-subtle)'}},
                            positionen.map(function(pos, idx) {
                                return React.createElement('div', {key:idx, style:{padding:'8px 12px', borderBottom:'1px solid var(--border-subtle)', fontSize:'12px'}},
                                    React.createElement('div', {style:{display:'flex', justifyContent:'space-between'}},
                                        React.createElement('span', {style:{fontWeight:'700', color:'var(--accent-blue)'}}, pos.posNr || pos.positionsnummer || ('Pos ' + (idx+1))),
                                        React.createElement('span', {style:{color:'var(--text-muted)'}}, (pos.menge || pos.mengeGesamt || '–') + ' ' + (pos.einheit || ''))
                                    ),
                                    React.createElement('div', {style:{color:'var(--text-secondary)', marginTop:'2px', lineHeight:'1.4'}}, (pos.leistung || pos.kurztext || '').substring(0, 120)),
                                    pos.epPreis != null && React.createElement('div', {style:{color:'var(--success)', fontSize:'11px', marginTop:'2px'}}, 'EP: ' + pos.epPreis + ' € · GP: ' + (pos.gesamtPreis || '–') + ' €')
                                );
                            })
                        )
                    );
                }

                // Personen (01)
                if (ergebnis.personen) {
                    var personenItems = [];
                    ['bauherr','bauherrVertreter','architekt','bauleitung'].forEach(function(rolle) {
                        var p = ergebnis.personen[rolle];
                        if (p && p.name) personenItems.push(React.createElement('div', {key:rolle, style:{padding:'6px 0', borderBottom:'1px solid var(--border-subtle)', fontSize:'12px'}},
                            React.createElement('span', {style:{fontWeight:'600', textTransform:'capitalize'}}, rolle + ': '),
                            React.createElement('span', {style:{color:'var(--text-secondary)'}}, p.name + (p.firma ? ' (' + p.firma + ')' : ''))
                        ));
                    });
                    if (personenItems.length > 0) return React.createElement('div', null,
                        React.createElement('div', {style:{fontWeight:'700', fontSize:'13px', marginBottom:'8px'}}, '👥 Personen'),
                        personenItems
                    );
                }

                // Räume (03)
                if (ergebnis.geschosse) {
                    var allRaeume = [];
                    (ergebnis.geschosse || []).forEach(function(g) { (g.raeume || []).forEach(function(r) { allRaeume.push(Object.assign({geschoss: g.geschoss}, r)); }); });
                    return React.createElement('div', null,
                        React.createElement('div', {style:{fontWeight:'700', fontSize:'13px', marginBottom:'8px'}}, '🏠 ' + allRaeume.length + ' Räume erkannt'),
                        allRaeume.slice(0, 20).map(function(r, i) {
                            return React.createElement('div', {key:i, style:{padding:'6px 10px', borderBottom:'1px solid var(--border-subtle)', fontSize:'12px', display:'flex', justifyContent:'space-between'}},
                                React.createElement('span', null, (r.raumNr || '') + ' ' + (r.raumBezeichnung || '')),
                                React.createElement('span', {style:{color:'var(--text-muted)'}}, r.geschoss + (r.masse ? ' · ' + (r.masse.bodenflaeche_m2 || '?') + ' m²' : ''))
                            );
                        })
                    );
                }

                // Rechnungen (06)
                if (ergebnis.rechnungen) {
                    return React.createElement('div', null,
                        React.createElement('div', {style:{fontWeight:'700', fontSize:'13px', marginBottom:'8px'}}, '💰 ' + ergebnis.rechnungen.length + ' Rechnungen'),
                        ergebnis.rechnungen.map(function(r, i) {
                            return React.createElement('div', {key:i, style:{padding:'6px 10px', borderBottom:'1px solid var(--border-subtle)', fontSize:'12px', display:'flex', justifyContent:'space-between'}},
                                React.createElement('span', null, r.rechnungsNr + ' (' + (r.rechnungsTyp || '') + ')'),
                                React.createElement('span', {style:{color: r.zahlungsStatus === 'bezahlt' ? 'var(--success)' : '#e74c3c', fontWeight:'600'}}, (r.bruttoBetrag || r.nettoBetrag || 0).toLocaleString('de-DE') + ' €')
                            );
                        })
                    );
                }

                // Fallback: JSON anzeigen
                return React.createElement('pre', {style:{fontSize:'10px', color:'var(--text-muted)', overflow:'auto', maxHeight:'400px', whiteSpace:'pre-wrap'}}, JSON.stringify(ergebnis, null, 2));
            };

            return (
                <div className="page-container" style={{padding:'20px 16px', minHeight:'100vh'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px'}}>
                        <button onClick={onBack} style={{background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'var(--text-primary)'}}>←</button>
                        <div style={{flex:1}}>
                            <div style={{fontSize:'16px', fontWeight:'700', color: cfg.color}}>{cfg.icon} {ordnerNr} {cfg.name}</div>
                            <div style={{fontSize:'11px', color:'var(--text-muted)'}}>
                                {analyse.dokumenteAnalysiert || 0} Dokumente · {analyse.analyseDauer ? Math.round(analyse.analyseDauer) + 's' : '–'}
                            </div>
                        </div>
                        {onReanalyze && (
                            <button onClick={function() { onReanalyze(ordnerNr); }} style={{padding:'6px 12px', background:'var(--bg-tertiary)', color:'var(--text-secondary)', border:'1px solid var(--border-subtle)', borderRadius:'8px', fontSize:'11px', fontWeight:'600', cursor:'pointer'}}>🔄 Neu</button>
                        )}
                    </div>

                    {/* Warnhinweise */}
                    {ergebnis.warnhinweise && ergebnis.warnhinweise.length > 0 && (
                        <div style={{padding:'10px 14px', marginBottom:'12px', background:'rgba(243,156,18,0.1)', border:'1px solid rgba(243,156,18,0.25)', borderRadius:'10px'}}>
                            <div style={{fontWeight:'700', fontSize:'12px', color:'#f39c12', marginBottom:'4px'}}>⚠ Warnhinweise</div>
                            {ergebnis.warnhinweise.map(function(w, i) {
                                return React.createElement('div', {key:i, style:{fontSize:'11px', color:'var(--text-secondary)', paddingLeft:'8px', marginTop:'3px'}}, '• ' + w);
                            })}
                        </div>
                    )}

                    {/* Hauptinhalt */}
                    {renderContent()}
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           RECHNUNGSMODUL -- VOB-konforme Rechnungen
           §14 UStG konform · Abschlag/Schluss/Nachtrag/Stundenlohn/Einzelrechnung
           ═══════════════════════════════════════════ */
