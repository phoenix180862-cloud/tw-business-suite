        function ModulWahl({ kunde, onSelectModul, ordnerAnalyseMeta, onDatenBearbeiten, onOrdnerBrowser }) {
            const module = [
                { id: 'aufmass', icon: '\uD83D\uDCD0', name: 'Aufma\u00df', desc: 'VOB-konforme Aufma\u00df-Erfassung', color: '#1E88E5', ready: true },
                { id: 'rechnung', icon: '\uD83D\uDCB6', name: 'Rechnungen', desc: 'Abschlags- & Schlussrechnungen', color: '#27ae60', ready: true },
                { id: 'ausgangsbuch', icon: '\uD83D\uDCD2', name: 'Ausgangsbuch', desc: 'Rechnungsausgangsbuch & Analysen', color: '#e67e22', ready: true },
                { id: 'schriftverkehr', icon: '\u2709\uFE0F', name: 'Schriftverkehr', desc: 'Briefe, E-Mails, Korrespondenz', color: '#8e44ad', ready: true },
                { id: 'baustelle', icon: '\uD83D\uDCF1', name: 'Baustellen-App', desc: 'Admin-Panel f\u00fcr Mitarbeiter', color: '#e74c3c', ready: true },
            ];
            return (
                <div className="page-container mw-page">
                    <div className="mw-header">
                        <FirmenLogo size="small" />
                        <div className="mw-header-title">
                            {kunde ? kunde.name : 'Kunde'}
                        </div>
                        <div className="mw-header-subtitle">
                            Modul w{'\u00e4'}hlen
                        </div>
                    </div>

                    {/* Schnellzugriff-Navigation */}
                    <div className="mw-quick-row">
                        {onDatenBearbeiten && (
                            <button onClick={onDatenBearbeiten} className="mw-quick-btn">
                                {'\uD83D\uDCCB'} Kundendaten
                            </button>
                        )}
                        {onOrdnerBrowser && kunde && (kunde._driveFolderId || kunde.id) && (
                            <button onClick={onOrdnerBrowser} className="mw-quick-btn">
                                {'\uD83D\uDCC1'} Ordner
                            </button>
                        )}
                    </div>

                    {/* Modul-Kacheln */}
                    <div className="mw-grid">
                        {module.map(function(m) {
                            return (
                                <button key={m.id} onClick={function() { if (m.ready) onSelectModul(m.id); }}
                                    className={'mw-modul-btn' + (m.ready ? '' : ' disabled')}>
                                    <span className="mw-modul-icon">{m.icon}</span>
                                    <span className="mw-modul-name" style={{color: m.ready ? m.color : 'var(--text-muted)'}}>{m.name}</span>
                                    <span className="mw-modul-desc">{m.desc}</span>
                                    {!m.ready && (
                                        <span className="mw-bald-tag">BALD</span>
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
                    <div className="ki-overlay-content">
                        <div className="ki-overlay-icon">{'\uD83E\uDD16'}</div>
                        <div className="ki-overlay-title">KI-Analyse l{'\u00E4'}uft...</div>

                        {/* Fortschrittsbalken */}
                        <div className="ki-progress-track">
                            <div className="ki-progress-fill" style={{width: pct + '%'}}></div>
                        </div>
                        <div className="ki-progress-text">
                            {progress || ('Dokument ' + currentDoc + ' von ' + totalDocs + ' wird analysiert')}
                        </div>
                        <div className="ki-progress-pct">{pct}%</div>

                        {/* Detail-Liste */}
                        {details && details.length > 0 && (
                            <div className="ki-detail-list">
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
                            <div style={{fontSize:'48px', marginBottom:'12px'}}>{'\uD83E\uDD16'}</div>
                            <div style={{fontSize:'16px', fontWeight:'700', marginBottom:'8px'}}>Keine KI-Akte vorhanden</div>
                            <div style={{fontSize:'13px', color:'var(--text-muted)', marginBottom:'20px'}}>
                                {'\u00D6'}ffne den Kunden {'\u00FC'}ber "Kunde NEU" um eine KI-Analyse durchzuf{'\u00FC'}hren.
                            </div>
                            <button onClick={onClose} className="ki-akte-btn close" style={{flex:'none', padding:'10px 24px'}}>
                                Schlie{'\u00DF'}en
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
                    <div className="ki-akte-modal">
                        {/* Header */}
                        <div className="ki-akte-header">
                            <span className="ki-akte-header-icon">{'\uD83E\uDD16'}</span>
                            <div className="ki-akte-header-info">
                                <div className="ki-akte-header-title">KI-Akte: {kunde ? kunde.name : ''}</div>
                                <div className="ki-akte-header-meta">
                                    Analysiert: {kiAkte.meta.analyseZeitpunkt ? new Date(kiAkte.meta.analyseZeitpunkt).toLocaleString('de-DE') : '\u2013'} {'\u00B7'} {kiAkte.meta.anzahlDokumente || 0} Dokumente
                                </div>
                            </div>
                            <button onClick={onClose} className="ki-akte-close">{'\u2715'}</button>
                        </div>

                        {/* Schnellübersicht-Karten */}
                        <div className="ki-akte-stats">
                            <div className="ki-stat-card success">
                                <div className="ki-stat-label success">AUFTRAGSSUMME</div>
                                <div className="ki-stat-value">{vertrag.auftragssumme ? Number(vertrag.auftragssumme).toLocaleString('de-DE', {style:'currency', currency:'EUR'}) : '\u2013'}</div>
                            </div>
                            <div className="ki-stat-card info">
                                <div className="ki-stat-label info">POSITIONEN</div>
                                <div className="ki-stat-value">{pos.length}</div>
                            </div>
                            <div className="ki-stat-card warn">
                                <div className="ki-stat-label warn">OFFENE NACHTR{'\u00C4'}GE</div>
                                <div className="ki-stat-value">{nachtr.filter(function(n){return n.status !== 'beauftragt';}).length}</div>
                            </div>
                            <div className={'ki-stat-card ' + (warnungen.length > 0 ? 'danger' : 'neutral')}>
                                <div className={'ki-stat-label ' + (warnungen.length > 0 ? 'danger' : 'neutral')}>{'\u26A0'} WARNUNGEN</div>
                                <div className="ki-stat-value">{warnungen.length}</div>
                            </div>
                        </div>

                        {/* Tab-Leiste */}
                        <div className="ki-tab-bar">
                            {tabs.map(function(t) {
                                return (
                                    <button key={t.id} onClick={function(){setActiveTab(t.id);}}
                                        className={'ki-tab' + (activeTab === t.id ? ' active' : '')}>
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab-Inhalt */}
                        <div className="ki-tab-content">
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
                                                {p.besonderheiten && <div style={{fontSize:'11px', color:'var(--accent-orange)', marginTop:'4px'}}>ℹ {p.besonderheiten}</div>}
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
                        <div className="ki-akte-footer">
                            <button onClick={onNeuAnalyse} className="ki-akte-btn reanalyse">
                                {'\uD83D\uDD04'} KI-Analyse neu starten
                            </button>
                            <button onClick={onClose} className="ki-akte-btn close">
                                Schlie{'\u00DF'}en
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
                <div className="page-container mw-page">
                    {/* Header */}
                    <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px'}}>
                        <button onClick={onBack} className="oa-back-btn">{'\u2190'}</button>
                        <div>
                            <div className="oa-page-title">{'\uD83E\uDD16'} KI-Ordneranalyse</div>
                            <div className="oa-page-subtitle">{kunde ? kunde.name : ''}</div>
                        </div>
                    </div>

                    {/* Status-Banner */}
                    {meta && meta.status === 'completed' ? (
                        <div className="oa-status-banner success">
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <div>
                                    <div style={{fontWeight:'700', fontSize:'13px', color:'var(--success)'}}>{'\u2705'} Analyse abgeschlossen</div>
                                    <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'2px'}}>
                                        {meta.ordnerAnalysiert || 0}/{meta.ordnerGefunden || 0} Ordner {'\u00B7'} {meta.gesamtDokumente || 0} Dokumente {'\u00B7'} {gesamtFehler > 0 ? '\u26A0 ' + gesamtFehler + ' Unstimmigkeiten' : '\u2713 Keine Unstimmigkeiten'}
                                    </div>
                                </div>
                                <div style={{textAlign:'right'}}>
                                    <div style={{fontSize:'20px', fontWeight:'700', color: avgQuality >= 80 ? 'var(--success)' : avgQuality >= 60 ? 'var(--accent-orange-light)' : 'var(--accent-red-light)'}}>{avgQuality}%</div>
                                    <div style={{fontSize:'9px', color:'var(--text-muted)'}}>Qualit{'\u00E4'}t</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="oa-status-banner empty">
                            <div style={{fontSize:'13px', fontWeight:'600', color:'var(--accent-red-light)', marginBottom:'8px'}}>Noch keine Ordneranalyse durchgef{'\u00FC'}hrt</div>
                            <button onClick={function() { onStartAnalyse(kundenId); }} className="oa-start-btn">{'\uD83D\uDE80'} Ordneranalyse starten</button>
                        </div>
                    )}

                    {/* Ordner-Karten -- ALLE analysierten Ordner anzeigen */}
                    <div className="oa-ordner-list">
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
                                    className="oa-ordner-btn">
                                    <span className="oa-ordner-icon">{ordnerCfg.icon}</span>
                                    <div className="oa-ordner-info">
                                        <div className="oa-ordner-name" style={{color: ordnerCfg.color}}>
                                            {nr} {ordnerCfg.name}
                                            {ordnerCfg.kritisch && <span className="oa-kritisch-tag">KRITISCH</span>}
                                        </div>
                                        <div className="oa-ordner-meta">
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
                                        <div style={{fontSize:'13px', fontWeight:'700', color:'var(--text-muted)'}}>{analyse.ordnerName || ('Ordner ' + analyse.ordnerNr)}</div>
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
                                    {crossRef.zusammenfassung.nurPosNrAnders > 0 && <div style={{fontSize:'11px', color:'var(--accent-orange-light)', marginBottom:'4px'}}>⚠️ {crossRef.zusammenfassung.nurPosNrAnders} Positionen -- nur Positionsnummer anders</div>}
                                    {crossRef.zusammenfassung.abweichungen > 0 && <div style={{fontSize:'11px', color:'var(--accent-red-light)', marginBottom:'4px'}}>🔴 {crossRef.zusammenfassung.abweichungen} Positionen mit Daten-Abweichungen</div>}
                                    {crossRef.zusammenfassung.nurInOrdner01 > 0 && <div style={{fontSize:'11px', color:'var(--accent-red-light)', marginBottom:'4px'}}>🔴 {crossRef.zusammenfassung.nurInOrdner01} Positionen nur in Baustellenauswertung</div>}
                                    {crossRef.zusammenfassung.nurInOrdner02 > 0 && <div style={{fontSize:'11px', color:'var(--accent-red-light)', marginBottom:'4px'}}>🔴 {crossRef.zusammenfassung.nurInOrdner02} Positionen nur im LV</div>}
                                    {crossRef.zusammenfassung.mengenAbweichungenKritisch > 0 && <div style={{fontSize:'11px', color:'var(--accent-red-light)', marginBottom:'4px'}}>🔴 {crossRef.zusammenfassung.mengenAbweichungenKritisch} kritische Mengenabweichungen (Aufmaß ↔ LV)</div>}
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
                    <div className="oa-progress-modal">
                        <div style={{fontSize:'48px', marginBottom:'12px', animation: progress.phase === 'done' ? 'none' : 'spin 2s linear infinite'}}>{progress.phase === 'done' ? '\u2705' : '\uD83E\uDD16'}</div>
                        <div style={{fontSize:'16px', fontWeight:'700', marginBottom:'4px', color:'var(--text-primary)'}}>
                            {progress.phase === 'done' ? 'Analyse abgeschlossen!' : 'KI-Ordneranalyse l\u00E4uft...'}
                        </div>

                        <div className="oa-progress-pct">{pct}%</div>

                        <div style={{fontSize:'13px', color:'var(--accent-blue)', marginBottom:'16px', minHeight:'20px'}}>
                            {progress.message || 'Vorbereitung...'}
                        </div>
                        {progress.total > 0 && (
                            <div style={{marginBottom:'16px'}}>
                                <div className="oa-progress-bar">
                                    <div className="oa-progress-fill" style={{width: pct + '%'}} />
                                </div>
                                <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'4px'}}>
                                    Ordner {progress.current || 0} von {progress.total || 0}
                                </div>
                            </div>
                        )}
                        {progress.phase === 'done' && (
                            <button onClick={onClose} className="oa-result-btn">
                                {'\uD83D\uDE80'} Ergebnis anzeigen
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
                <div className="page-container mw-page">
                    <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px'}}>
                        <button onClick={onBack} className="oa-back-btn">{'\u2190'}</button>
                        <div style={{flex:1}}>
                            <div style={{fontSize:'16px', fontWeight:'700', color: cfg.color}}>{cfg.icon} {ordnerNr} {cfg.name}</div>
                            <div style={{fontSize:'11px', color:'var(--text-muted)'}}>
                                {analyse.dokumenteAnalysiert || 0} Dokumente {'\u00B7'} {analyse.analyseDauer ? Math.round(analyse.analyseDauer) + 's' : '\u2013'}
                            </div>
                        </div>
                        {onReanalyze && (
                            <button onClick={function() { onReanalyze(ordnerNr); }} className="oa-reanalyse-btn">{'\uD83D\uDD04'} Neu</button>
                        )}
                    </div>

                    {/* Warnhinweise */}
                    {ergebnis.warnhinweise && ergebnis.warnhinweise.length > 0 && (
                        <div style={{padding:'10px 14px', marginBottom:'12px', background:'rgba(243,156,18,0.1)', border:'1px solid rgba(243,156,18,0.25)', borderRadius:'10px'}}>
                            <div style={{fontWeight:'700', fontSize:'12px', color:'var(--accent-orange-light)', marginBottom:'4px'}}>⚠ Warnhinweise</div>
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
