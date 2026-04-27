        // ═══════════════════════════════════════════════════════════
        // FOTO-SYNC STATUS-INDIKATOR (Phase 2)
        // ═══════════════════════════════════════════════════════════
        // Zeigt neben dem Auto-Save-Indikator an, ob Fotos gerade nach
        // Drive hochgeladen werden. Nur sichtbar, wenn tatsaechlich
        // ein Upload laeuft oder gerade beendet wurde.
        // ═══════════════════════════════════════════════════════════
        function FotoSyncIndicator(props) {
            const s = props && props.status;
            if (!s) return null;
            var label, bg, tip;
            if (s.indexOf('uploading:') === 0) {
                var parts = s.substring(10).split('/');
                label = 'Upload ' + parts[0] + '/' + parts[1];
                bg = 'linear-gradient(135deg, #3498db, #2980b9)';
                tip = 'Fotos werden nach Google Drive hochgeladen';
            } else if (s.indexOf('done:') === 0) {
                label = 'Wolke OK';
                bg = 'linear-gradient(135deg, #27ae60, #1e8449)';
                tip = s.substring(5) + ' Foto(s) erfolgreich hochgeladen';
            } else if (s === 'error') {
                label = 'Wolke!';
                bg = 'linear-gradient(135deg, #e74c3c, #c0392b)';
                tip = 'Upload-Fehler — wird spaeter automatisch wiederholt';
            } else {
                return null;
            }
            return (
                <div title={tip}
                    style={{flex:1, padding:'8px 1px', borderRadius:'var(--radius-sm)', border:'none', background:bg, color:'#fff', fontSize:'9px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.3px', textShadow:'0 1px 2px rgba(0,0,0,0.3)', userSelect:'none'}}>
                    {label}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════════
        // AUTO-SAVE STATUS-INDIKATOR
        // ═══════════════════════════════════════════════════════════
        // Kleine Komponente in der Navigationsleiste, die dem Benutzer
        // jederzeit auf einen Blick zeigt, ob seine letzten Aenderungen
        // gesichert sind. Ersetzt den frueheren roten "Speich."-Button.
        // Farben: grau=idle, orange=pending/saving, gruen=saved, rot=error.
        // ═══════════════════════════════════════════════════════════
        function AutoSaveStatusIndicator() {
            const [status, setStatus] = useState('idle');
            const [lastSavedAt, setLastSavedAt] = useState(null);
            const [, forceTick] = useState(0);

            useEffect(function() {
                if (!window.TW || !window.TW.AutoSave) return;
                var unsub = window.TW.AutoSave.onStatusChange(function(s, at) {
                    setStatus(s);
                    if (at) setLastSavedAt(at);
                });
                // Ticker alle 20 s damit "vor X Sek." aktualisiert wird
                var tick = setInterval(function() { forceTick(function(v){ return v+1; }); }, 20000);
                return function() { if (unsub) unsub(); clearInterval(tick); };
            }, []);

            var label, bg, tip;
            if (status === 'saving' || status === 'pending') {
                label = 'Speichert';
                bg = 'linear-gradient(135deg, #f39c12, #e67e22)';
                tip = 'Aenderungen werden im Hintergrund gesichert';
            } else if (status === 'error') {
                label = 'Fehler';
                bg = 'linear-gradient(135deg, #e74c3c, #c0392b)';
                tip = 'Letzter Speicherversuch ist fehlgeschlagen';
            } else if (lastSavedAt) {
                var secs = Math.max(0, Math.floor((Date.now() - (new Date(lastSavedAt)).getTime())/1000));
                var t = secs < 60 ? (secs + 's') : (Math.floor(secs/60) + 'm');
                label = 'OK ' + t;
                bg = 'linear-gradient(135deg, #27ae60, #1e8449)';
                tip = 'Alle Aenderungen sind lokal gesichert (vor ' + t + ')';
            } else {
                label = 'Auto';
                bg = 'linear-gradient(135deg, #7f8c8d, #555)';
                tip = 'Auto-Speichern aktiv — alle Aenderungen werden automatisch gesichert';
            }

            return (
                <div title={tip}
                    style={{flex:'0 0 auto', padding:'6px 10px', minWidth:'52px', borderRadius:'var(--radius-sm)', border:'none', background:bg, color:'#fff', fontSize:'11px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.3px', textShadow:'0 1px 2px rgba(0,0,0,0.3)', userSelect:'none', whiteSpace:'nowrap'}}>
                    {label}
                </div>
            );
        }

        // ═══ BLOCK D / FIX D2 — Speicher-Anzeige ═══
        // Zeigt Nutzung der IndexedDB in Prozent & absolut.
        // Klickbar: Modal mit Details + Cleanup-Button.
        // Farbe: gruen < 70 %, gelb 70-89 %, rot ab 90 %.
        // Refreshed sich alle 60 s.
        function StorageIndicator() {
            const [info, setInfo] = useState(null);
            const [modalOpen, setModalOpen] = useState(false);
            const [cleaning, setCleaning] = useState(false);

            const refreshInfo = React.useCallback(function() {
                if (!window.TWStorage || !window.TWStorage.getStorageInfo) return;
                window.TWStorage.getStorageInfo().then(function(x) { setInfo(x); }).catch(function(){});
            }, []);

            useEffect(function() {
                refreshInfo();
                var iv = setInterval(refreshInfo, 60000); // alle 60 s
                return function() { clearInterval(iv); };
            }, [refreshInfo]);

            if (!info) return null;

            var pct = info.percentUsed || 0;
            var label, bg, tip;
            if (pct >= 90) {
                label = 'Voll ' + Math.round(pct) + '%';
                bg = 'linear-gradient(135deg, #e74c3c, #c0392b)';
                tip = 'WARNUNG: Lokaler Speicher fast voll (' + info.usageMB + ' / ' + info.quotaMB + ' MB). Klicken zum Aufraeumen.';
            } else if (pct >= 70) {
                label = Math.round(pct) + '%';
                bg = 'linear-gradient(135deg, #f39c12, #e67e22)';
                tip = 'Lokaler Speicher: ' + info.usageMB + ' von ' + info.quotaMB + ' MB (' + Math.round(pct) + '%). Klicken fuer Details.';
            } else {
                label = Math.round(pct) + '%';
                bg = 'linear-gradient(135deg, #3498db, #2980b9)';
                tip = 'Lokaler Speicher: ' + info.usageMB + ' von ' + info.quotaMB + ' MB (' + Math.round(pct) + '%). Klicken fuer Details.';
            }

            const handleCleanup = function() {
                if (!window.TWStorage || !window.TWStorage.cleanupUploadedFotosForSpace) return;
                if (!confirm('Drive-gesicherte Fotos aus dem lokalen Cache entfernen, um Platz zu schaffen?\n\nDie Originale bleiben sicher im Google Drive-Archiv.')) return;
                setCleaning(true);
                window.TWStorage.cleanupUploadedFotosForSpace(50 * 1024 * 1024).then(function(res) {
                    setCleaning(false);
                    refreshInfo();
                    alert('Aufgeraeumt: ' + (res.geloescht || 0) + ' Fotos entfernt, ' + Math.round((res.freigabeBytes || 0)/1024/1024*10)/10 + ' MB frei.');
                }).catch(function(e) {
                    setCleaning(false);
                    alert('Cleanup-Fehler: ' + e.message);
                });
            };

            return (
                <React.Fragment>
                    <div title={tip}
                        onClick={function(){ setModalOpen(true); refreshInfo(); }}
                        style={{flex:'0 0 auto', padding:'6px 10px', minWidth:'48px', borderRadius:'var(--radius-sm)', border:'none', background:bg, color:'#fff', fontSize:'11px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.3px', textShadow:'0 1px 2px rgba(0,0,0,0.3)', userSelect:'none', whiteSpace:'nowrap', cursor:'pointer'}}>
                        {'\uD83D\uDCBE'} {label}
                    </div>
                    {modalOpen && (
                        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.65)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}}
                            onClick={function(){ setModalOpen(false); }}>
                            <div onClick={function(e){ e.stopPropagation(); }}
                                style={{maxWidth:'380px', width:'100%', background:'var(--bg-primary)', border:'1px solid var(--border-subtle)', borderRadius:'14px', padding:'18px', fontFamily:'Source Sans 3, sans-serif'}}>
                                <div style={{fontFamily:'Oswald, sans-serif', fontWeight:700, fontSize:'16px', textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-white)', marginBottom:'14px'}}>
                                    {'\uD83D\uDCBE'} Lokaler Speicher
                                </div>
                                <div style={{fontSize:'13px', lineHeight:1.5, color:'var(--text-primary)', marginBottom:'12px'}}>
                                    <div>Belegt: <strong>{info.usageMB} MB</strong></div>
                                    <div>Verfuegbar: <strong>{info.quotaMB} MB</strong> ({info.quotaGB} GB)</div>
                                    <div>Auslastung: <strong>{Math.round(pct * 10) / 10} %</strong></div>
                                </div>
                                <div style={{height:'12px', background:'var(--bg-tertiary)', borderRadius:'6px', overflow:'hidden', marginBottom:'14px'}}>
                                    <div style={{height:'100%', width:Math.min(100, pct) + '%', background:bg, transition:'width 0.3s'}} />
                                </div>
                                <div style={{fontSize:'11px', color:'var(--text-muted)', marginBottom:'14px', lineHeight:1.5}}>
                                    Lokale Fotos werden nach erfolgreichem Drive-Upload als "gesichert" markiert. Diese koennen bei Bedarf entfernt werden, um Platz zu schaffen — die Originale bleiben im Google Drive-Archiv.
                                </div>
                                <div style={{display:'flex', gap:'8px'}}>
                                    <button onClick={handleCleanup} disabled={cleaning}
                                        style={{flex:1, padding:'10px', borderRadius:'8px', border:'none', cursor: cleaning ? 'wait' : 'pointer',
                                            background: cleaning ? '#7f8c8d' : 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                            boxShadow: cleaning ? 'none' : '0 3px 10px rgba(30,136,229,0.3)',
                                            color:'#fff', fontSize:'12px', fontWeight:700, fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>
                                        {cleaning ? 'Raeume auf...' : 'Aufraeumen'}
                                    </button>
                                    <button onClick={function(){ setModalOpen(false); }}
                                        style={{flex:1, padding:'10px', borderRadius:'8px', border:'1px solid var(--border-subtle)', background:'transparent', color:'var(--text-primary)', fontSize:'12px', fontWeight:700, fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px', cursor:'pointer'}}>
                                        Schliessen
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </React.Fragment>
            );
        }


        function App() {
            // Pages: 'start' | 'kundenModus' | 'auswahl' | 'akte' | 'geladen' | 'datenUebersicht' | 'modulwahl' | 'manuellEingabe' | 'raumerkennung' | 'raumblatt' | 'rechnung' | 'ausgangsbuch' | 'schriftverkehr' | 'baustelle' | 'ordnerAnalyse' | 'ordnerAnalyseDetail' | 'ordnerBrowser' | 'lokalKundenListe' | 'lokalOrdnerBrowser'
            const [page, setPage] = useState('start');
            // HOTFIX 25.04.2026: Wenn das Pos-Auswahl-Modal in tw-aufmass.jsx offen ist, kann
            // es JSX-Elemente in die globale App-Toolbar einspeisen (ueber window.__twSetPosModalToolbar).
            // So ist alles in EINER Leiste, die Dropdowns AUFMASS/BEARBEITEN bleiben frei.
            const [posModalToolbar, setPosModalToolbar] = useState(null);
            useEffect(function(){ window.__twSetPosModalToolbar = setPosModalToolbar; }, []);
            const [driveStatus, setDriveStatus] = useState('offline');
            const [showAuth, setShowAuth] = useState(false);
            const [loading, setLoading] = useState(false);
            const [selectedKunde, setSelectedKunde] = useState(null);
            const [selectedRaum, setSelectedRaum] = useState(null);
            const [selectedPositions, setSelectedPositions] = useState([]);
            const [fertigeRaeume, setFertigeRaeume] = useState([]);
            const [lastRaumData, setLastRaumData] = useState(null);
            const [gesamtliste, setGesamtliste] = useState([]);
            const [showGesamtliste, setShowGesamtliste] = useState(false);
            const [aufmassGespeichert, setAufmassGespeichert] = useState(false);
            const [rechnungsVorwahl, setRechnungsVorwahl] = useState(null);
            const [history, setHistory] = useState(['start']);
            const [historyIdx, setHistoryIdx] = useState(0);
            // ── Google Drive State ──
            const [driveKunden, setDriveKunden] = useState([]);
            const [isDriveMode, setIsDriveMode] = useState(false);
            const [loadProgress, setLoadProgress] = useState('');
            const [importResult, setImportResult] = useState(null);
            const [kundeMode, setKundeMode] = useState('neu'); // 'neu' | 'analysiert' | 'manuell'
            const [analyseConfig, setAnalyseConfig] = useState(null);
            // ── NEU: Verbindungsstatus von Startseite ──
            const [startConnections, setStartConnections] = useState({ geminiConnected: false, driveConnected: false });
            // ── KI-Ordneranalyse State ──
            const [ordnerAnalyseMeta, setOrdnerAnalyseMeta] = useState(null);
            const [ordnerAnalyseProgress, setOrdnerAnalyseProgress] = useState({ phase: '', message: '', current: 0, total: 0 });
            const [isOrdnerAnalyseRunning, setIsOrdnerAnalyseRunning] = useState(false);
            const [selectedOrdnerNr, setSelectedOrdnerNr] = useState(null);

            // ── Akte & Speichern (WIP) ──
            const [showAkteModal, setShowAkteModal] = useState(false);
            const [akteData, setAkteData] = useState({ wips: [], appDateien: [] });
            const [akteSaveToast, setAkteSaveToast] = useState(null);

            // ── Storage-Health-Dashboard (Punkt 6 aus Architektur-Plan, 25.04.2026) ──
            const [showStorageHealth, setShowStorageHealth] = useState(false);

            // ── Aufmass-Vorlage (Speichern/Laden via Drive) ──
            // vorlageBusy: { action: 'save'|'list'|'load', message: '...' } waehrend I/O
            const [vorlageBusy, setVorlageBusy] = useState(null);
            // vorlageToast: Erfolgsmeldung nach Speichern/Laden
            const [vorlageToast, setVorlageToast] = useState(null);
            // vorlageList: Array mit Drive-Vorlagen; null = Modal geschlossen, [] = leer (geoeffnet)
            const [vorlageList, setVorlageList] = useState(null);
            // kundeOpenDialog: { kunde } wenn Dialog "Normal / Vorlage laden" sichtbar, sonst null
            const [kundeOpenDialog, setKundeOpenDialog] = useState(null);

            var PAGE_TO_MODUL = {
                'raumerkennung': 'aufmass', 'raumblatt': 'aufmass',
                'rechnung': 'rechnung', 'ausgangsbuch': 'ausgangsbuch',
                'schriftverkehr': 'schriftverkehr', 'baustelle': 'baustelle'
            };
            var MODUL_ICONS = {
                'aufmass': '\uD83D\uDCD0', 'rechnung': '\uD83D\uDCB6',
                'schriftverkehr': '\u2709\uFE0F', 'ausgangsbuch': '\uD83D\uDCD2',
                'baustelle': '\uD83D\uDCF1'
            };
            var MODUL_LABELS = {
                'aufmass': 'Aufma\u00df', 'rechnung': 'Rechnung',
                'schriftverkehr': 'Schriftverkehr', 'ausgangsbuch': 'Ausgangsbuch',
                'baustelle': 'Baustelle'
            };
            var MODUL_PAGES = {
                'aufmass': 'raumerkennung', 'rechnung': 'rechnung',
                'schriftverkehr': 'schriftverkehr', 'ausgangsbuch': 'ausgangsbuch',
                'baustelle': 'baustelle'
            };

            /* ══════════════════════════════════════════════════
               LOKALER SPEICHER (TWStorage / IndexedDB)
               Automatische Persistenz aller Arbeitsdaten
               ══════════════════════════════════════════════════ */

            // ── Beim App-Start: Letzten Arbeitsstand wiederherstellen ──
            // ══════════════════════════════════════════════════════════
            // APP-START: IMMER Startseite (Aenderung 25.04.2026)
            // ══════════════════════════════════════════════════════════
            // Frueher wurde beim App-Start automatisch der zuletzt aktive
            // Kunde wiederhergestellt. Das fuehrte dazu, dass die App
            // mitten in Aufmass / Rechnung / etc. landete statt auf der
            // Startseite. Auf ausdruecklichen Wunsch von Thomas (25.04.2026)
            // entfernt: Beim App-Neustart kommt IMMER zuerst die Startseite.
            //
            // Das Akte-Resume-System bleibt davon UNBERUEHRT: Sobald der
            // User einen Kunden aus der Kundenauswahl oeffnet, wird der
            // letzte Bearbeitungsstand fuer DIESEN Kunden weiterhin
            // automatisch wiederhergestellt (siehe Auto-Restore-Effect
            // weiter unten, der auf [selectedKunde] reagiert).
            //
            // 'lastKundeId' wird weiterhin geschrieben (fuer Caching/
            // Statistik), aber beim Start nicht mehr automatisch geladen.
            // ══════════════════════════════════════════════════════════
            useEffect(function() {
                console.log('[TW-Storage] App-Start: Startseite wird angezeigt (kein Auto-Restore beim Mount).');
            }, []);

            // ── Auto-Save: Kunde bei jeder Aenderung speichern ──
            useEffect(function() {
                if (!selectedKunde || !window.TWStorage || !window.TWStorage.isReady()) return;
                var kundeId = selectedKunde._driveFolderId || selectedKunde.id || selectedKunde.name;
                if (!kundeId) return;

                // Debounce: 500ms warten
                var timer = setTimeout(function() {
                    TWStorage.saveKunde(selectedKunde).then(function() {
                        TWStorage.saveAppState('lastKundeId', kundeId);
                    }).catch(function(e) {
                        console.warn('[TW-Storage] Auto-Save Kunde fehlgeschlagen:', e);
                    });
                }, 500);
                return function() { clearTimeout(timer); };
            }, [selectedKunde]);

            // ── Auto-Save: Gesamtliste bei jeder Aenderung speichern ──
            useEffect(function() {
                if (!gesamtliste || gesamtliste.length === 0 || !selectedKunde) return;
                if (!window.TWStorage || !window.TWStorage.isReady()) return;
                var kundeId = selectedKunde._driveFolderId || selectedKunde.id || selectedKunde.name;
                if (!kundeId) return;

                var timer = setTimeout(function() {
                    TWStorage.saveGesamtliste(kundeId, gesamtliste).then(function() {
                        console.log('[TW-Storage] Gesamtliste gespeichert:', gesamtliste.length, 'Positionen');
                    }).catch(function(e) {
                        console.warn('[TW-Storage] Auto-Save Gesamtliste fehlgeschlagen:', e);
                    });
                }, 800);
                return function() { clearTimeout(timer); };
            }, [gesamtliste, selectedKunde]);

            // ── Auto-Save: ImportResult speichern ──
            useEffect(function() {
                if (!importResult || !selectedKunde) return;
                if (!window.TWStorage || !window.TWStorage.isReady()) return;
                var kundeId = selectedKunde._driveFolderId || selectedKunde.id || selectedKunde.name;
                if (!kundeId) return;

                var timer = setTimeout(function() {
                    TWStorage.put('driveCache', {
                        id: 'importResult_' + kundeId,
                        type: 'importResult',
                        data: importResult,
                        updatedAt: new Date().toISOString()
                    }).catch(function(e) {
                        console.warn('[TW-Storage] Auto-Save ImportResult fehlgeschlagen:', e);
                    });
                }, 800);
                return function() { clearTimeout(timer); };
            }, [importResult, selectedKunde]);

            /* ══════════════════════════════════════════════════
               GLOBALER AUTO-FOCUS & ENTER-NAVIGATION
               ══════════════════════════════════════════════════ */

            // ── 1. Auto-Focus: Bei Seitenwechsel erstes Eingabefeld fokussieren ──
            useEffect(function() {
                var timer = setTimeout(function() {
                    // Container finden (Modal hat Vorrang, sonst Seite)
                    var container = document.querySelector('.modal-overlay') || document.querySelector('.page-container') || document.getElementById('root');
                    if (!container) return;
                    // Erstes sichtbares, nicht-deaktiviertes Eingabefeld finden
                    var firstInput = container.querySelector(
                        'input:not([disabled]):not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([readonly]),' +
                        'textarea:not([disabled]):not([readonly]),' +
                        'select:not([disabled])'
                    );
                    if (firstInput && firstInput.offsetParent !== null) {
                        firstInput.focus();
                        if (firstInput.select) firstInput.select();
                    }
                }, 200); // Kurze Verzoegerung damit DOM gerendert ist
                return function() { clearTimeout(timer); };
            }, [page, showGesamtliste, showAuth]);

            // ── 2. Enter-Navigation: Enter = naechstes Eingabefeld auf der aktuellen Seite ──
            // KRITISCHER FIX (25.04.2026): Vorher OHNE Dep-Array — der Effekt lief
            // bei JEDEM Re-Render der App-Komponente und registrierte ein neues
            // handleGlobalEnter mit page/handleKundeNeu/handleStartAufmass etc. in
            // der Closure. Pro Render fielen dafuer KB bis MB an, GC kam nicht hinterher.
            // Loesung: Effekt einmal beim Mount, Werte ueber Ref.
            const globalEnterStateRef = useRef({});
            useEffect(function() {
                var handleGlobalEnter = function(e) {
                    if (e.key !== 'Enter') return;
                    if (e.defaultPrevented) return;

                    var el = e.target;
                    var tag = el.tagName;

                    if (tag === 'TEXTAREA') return;
                    if (tag === 'BUTTON') return;

                    var s = globalEnterStateRef.current;

                    // ── FALL A: Wir sind in einem Eingabefeld (INPUT/SELECT) ──
                    if (tag === 'INPUT' || tag === 'SELECT') {
                        if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'file') return;

                        e.preventDefault();

                        var container = el.closest('.modal-overlay') || el.closest('.modal') || el.closest('.manual-raum-card') || el.closest('.page-container') || document.getElementById('root');
                        if (!container) return;

                        var allInputs = [];
                        var candidates = container.querySelectorAll(
                            'input:not([disabled]):not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([readonly]),' +
                            'textarea:not([disabled]):not([readonly]),' +
                            'select:not([disabled])'
                        );
                        for (var i = 0; i < candidates.length; i++) {
                            if (candidates[i].offsetParent !== null || candidates[i].offsetWidth > 0) {
                                allInputs.push(candidates[i]);
                            }
                        }

                        var idx = allInputs.indexOf(el);
                        if (idx >= 0 && idx < allInputs.length - 1) {
                            allInputs[idx + 1].focus();
                            if (allInputs[idx + 1].select) allInputs[idx + 1].select();
                        } else {
                            el.blur();
                            switch(s.page) {
                                case 'akte':
                                    if (!s.loading && s.handleLoadAkte) s.handleLoadAkte();
                                    break;
                                case 'geladen':
                                    if (s.handleStartAufmass) s.handleStartAufmass();
                                    break;
                            }
                        }
                        return;
                    }

                    // ── FALL B: Kein Eingabefeld fokussiert → Seiten-Aktion ausloesen ──
                    switch(s.page) {
                        case 'start':
                            if (!s.showAuth && s.handleKundeNeu) { e.preventDefault(); s.handleKundeNeu(); }
                            break;
                        case 'geladen':
                            e.preventDefault();
                            if (s.navigateTo) s.navigateTo('modulwahl');
                            break;
                    }
                };
                window.addEventListener('keydown', handleGlobalEnter);
                return function() { window.removeEventListener('keydown', handleGlobalEnter); };
            }, []);  // ← einmal beim Mount

            const navigateTo = useCallback((newPage) => {
                // ── Aufmasz-Verlassen-Schutz (Skill 8.5) ──
                // Wenn der User aus dem Aufmasz-Modul rausnavigiert und ungespeicherte
                // Aenderungen vorhanden sind, Confirm einfordern. Das Aufmasz-Modul
                // setzt window.__aufmassDirty = function() { return hasUnsavedChanges; }
                // beim Mounten und raeumt es beim Unmount auf.
                var fromAufmass = (page === 'raumerkennung' || page === 'raumblatt');
                var leavingAufmass = fromAufmass && (newPage !== 'raumerkennung' && newPage !== 'raumblatt');
                var aufmassDirtyCheck = (typeof window.__aufmassDirty === 'function')
                    ? !!window.__aufmassDirty()
                    : !!window.__aufmassDirty;
                if (leavingAufmass && aufmassDirtyCheck) {
                    var ok = window.confirm(
                        'Im Aufmass gibt es ungespeicherte Aenderungen.\n\n' +
                        'Wenn du jetzt navigierst, koennten Daten verloren gehen.\n\n' +
                        'Trotzdem weiter? (Abbrechen = im Aufmass bleiben)'
                    );
                    if (!ok) return;
                }
                setPage(newPage);
                setHistory(prev => {
                    const newHistory = [...prev.slice(0, historyIdx + 1), newPage];
                    setHistoryIdx(newHistory.length - 1);
                    return newHistory;
                });
            }, [historyIdx, page]);

            // Globale Navigation fuer Module (z.B. Gesamtliste → Modulwahl)
            window._navigateToModulwahl = () => navigateTo('modulwahl');

            const goBack = () => {
                if (historyIdx > 0) {
                    const newIdx = historyIdx - 1;
                    setHistoryIdx(newIdx);
                    setPage(history[newIdx]);
                }
            };

            const goForward = () => {
                if (historyIdx < history.length - 1) {
                    const newIdx = historyIdx + 1;
                    setHistoryIdx(newIdx);
                    setPage(history[newIdx]);
                }
            };

            // ── NEU: Zwei getrennte Kunden-Handler ──
            // ── NEU: Kundenauswahl von Startseite (Gemini/Drive bereits verbunden) ──
            const handleKundenauswahl = (connections) => {
                setStartConnections(connections || {});
                if (connections && connections.driveConnected) {
                    setIsDriveMode(true);
                    setDriveStatus('online'); // StatusBar aktualisieren!
                }
                if (connections && connections.geminiConnected) {
                    window._kiDisabled = false;
                }
                navigateTo('kundenModus');
            };

            // ── Modus-Auswahl: KI-Analyse / Gespeicherte Daten / Manuell ──
            const handleSelectModus = async (modus) => {
                setKundeMode(modus);
                // Manuell: DIREKT zu den 3 Listen, KEINE Kundenauswahl
                if (modus === 'manuell') {
                    setIsDriveMode(false);
                    setDriveStatus('offline');
                    navigateTo('manuellEingabe');
                    return;
                }
                // Lokal gespeicherte Kundendaten: Offline-Liste aus IndexedDB laden,
                // KEINEN Drive-Roundtrip. Ideal fuer Baustelle ohne Internet.
                if (modus === 'lokalGespeichert') {
                    setIsDriveMode(false);
                    setDriveStatus('offline');
                    navigateTo('lokalKundenListe');
                    return;
                }
                // Alle anderen Modi laden zuerst die Kundenliste aus Google Drive
                if (isDriveMode || (startConnections && startConnections.driveConnected)) {
                    setLoading(true);
                    setLoadProgress('Lade Baustellen aus Google Drive...');
                    try {
                        var service = window.GoogleDriveService;
                        if (service && service.accessToken) {
                            const folders = await service.listKundenOrdner();
                            setDriveKunden(folders);
                            setIsDriveMode(true);
                            setDriveStatus('online');
                        }
                    } catch(err) {
                        console.error('Drive Kunden laden:', err);
                        alert('Fehler beim Laden der Baustellen:\n' + err.message);
                    }
                    setLoading(false);
                    setLoadProgress('');
                }
                navigateTo('auswahl');
            };

            const handleKundeNeu = () => {
                setKundeMode('neu');
                setShowAuth(true);
            };

            // ═══════════════════════════════════════════
            // AUFMASS-VORLAGE: Speichern, Auflisten, Laden
            // Workflow:
            //  1. Speichern: Aktuelle Aufmass-Daten werden als JSON zusammengestellt
            //     und in den "Kunden-Daten"-Ordner auf Google Drive hochgeladen.
            //     Dateiname: "Aufmass Vorlage vom DD.MM.YYYY HH-MM.json"
            //  2. Auflisten: Alle "Aufmass Vorlage"-Dateien im Kunden-Daten-Ordner
            //     werden von Drive geholt und als Liste praesentiert.
            //  3. Laden: Ausgewaehlte Vorlage wird heruntergeladen, JSON geparst,
            //     LV_POSITIONEN, Raeume, importResult etc. in States/IndexedDB geschrieben.
            // ═══════════════════════════════════════════

            // Baut das Vorlage-JSON aus dem aktuellen Kunden-Zustand
            const buildAufmassVorlage = async (kunde) => {
                if (!kunde) throw new Error('Kein Kunde aktiv');
                var kundeId = kunde._driveFolderId || kunde.id;
                if (!kundeId) throw new Error('Kunde hat keine ID');

                var storage = window.TWStorage;
                var gesamtliste = null, raeume = [], aufmassItems = [], positionsListen = [];
                if (storage) {
                    try { gesamtliste = await storage.loadGesamtliste(kundeId); } catch(e) {}
                    try { raeume = (await storage.getByIndex('raeume', 'kundeId', kundeId)) || []; } catch(e) {}
                    try { aufmassItems = (await storage.getByIndex('aufmass', 'kundeId', kundeId)) || []; } catch(e) {}
                    try { positionsListen = (await storage.loadPositionsListenByKunde(kundeId)) || []; } catch(e) {}
                }

                // Kunden-Stammdaten bereinigen (keine Drive-Files/Folders, keine Fotos)
                var kundeClean = Object.assign({}, kunde);
                delete kundeClean.folders;
                delete kundeClean.files;
                delete kundeClean.dateien;

                return {
                    version: '1.0',
                    type: 'aufmass-vorlage',
                    createdAt: new Date().toISOString(),
                    createdBy: 'TW Business Suite',
                    kundeId: kundeId,
                    kundeName: kunde.name || kunde.auftraggeber || '',
                    kundeBaumassnahme: kunde.baumassnahme || '',
                    // Kern-Daten
                    kunde: kundeClean,
                    lvPositionen: (typeof LV_POSITIONEN !== 'undefined') ? (LV_POSITIONEN[kundeId] || []) : [],
                    gesamtliste: gesamtliste || null,
                    raeume: raeume,
                    aufmassItems: aufmassItems,
                    positionsListen: positionsListen,
                    importResult: kunde._importResult || importResult || null,
                };
            };

            // Vorlage zu Drive hochladen
            const saveAufmassVorlage = async () => {
                if (!selectedKunde) {
                    alert('Bitte zuerst einen Kunden laden.');
                    return;
                }
                var service = window.GoogleDriveService;
                if (!service || !service.accessToken) {
                    alert('Google Drive ist nicht verbunden.\nBitte zuerst mit Drive verbinden.');
                    return;
                }
                var kundeDriveId = selectedKunde._driveFolderId || selectedKunde.id;
                if (!kundeDriveId) {
                    alert('Dieser Kunde hat keinen Google-Drive-Ordner.');
                    return;
                }

                setVorlageBusy({ action: 'save', message: 'Aufmass-Vorlage wird erstellt...' });
                try {
                    // 1. Vorlage-JSON bauen
                    var vorlage = await buildAufmassVorlage(selectedKunde);
                    setVorlageBusy({ action: 'save', message: 'Kunden-Daten-Ordner wird gesucht...' });

                    // 2. Kunden-Daten-Ordner finden oder erstellen
                    var kundenDatenOrdnerId = await service.findOrCreateFolder(kundeDriveId, 'Kunden-Daten');

                    // 3. Dateiname mit Datum + Uhrzeit
                    var now = new Date();
                    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
                    var dateStr = pad(now.getDate()) + '.' + pad(now.getMonth() + 1) + '.' + now.getFullYear()
                                + ' ' + pad(now.getHours()) + '-' + pad(now.getMinutes());
                    var fileName = 'Aufmass Vorlage vom ' + dateStr + '.json';

                    setVorlageBusy({ action: 'save', message: 'Hochladen nach Google Drive...' });

                    // 4. Upload
                    var blob = new Blob([JSON.stringify(vorlage, null, 2)], { type: 'application/json' });
                    var result = await service.uploadFile(kundenDatenOrdnerId, fileName, 'application/json', blob);

                    setVorlageBusy(null);
                    setVorlageToast({ type: 'success', message: '✓ Vorlage gespeichert: ' + fileName });
                    setTimeout(function(){ setVorlageToast(null); }, 4000);
                } catch(err) {
                    console.error('[Vorlage speichern]', err);
                    setVorlageBusy(null);
                    alert('Fehler beim Speichern der Vorlage:\n' + (err.message || err));
                }
            };

            // Alle Vorlagen im Kunden-Daten-Ordner auflisten
            const listAufmassVorlagen = async (kunde) => {
                if (!kunde) throw new Error('Kein Kunde');
                var service = window.GoogleDriveService;
                if (!service || !service.accessToken) throw new Error('Drive nicht verbunden');
                var kundeDriveId = kunde._driveFolderId || kunde.id;
                if (!kundeDriveId) throw new Error('Kunde hat keinen Drive-Ordner');

                // Kunden-Daten-Ordner suchen (bereits existierende find-Logik)
                var contents = await service.listFolderContents(kundeDriveId);
                var kundenDatenOrdner = (contents.folders || []).find(function(f) {
                    var n = (f.name || '').toLowerCase();
                    return n.indexOf('kunden-daten') >= 0 || n === 'kundendaten' || n === 'kunden_daten';
                });
                if (!kundenDatenOrdner) return [];

                // Dateien listen und filtern
                var subContents = await service.listFolderContents(kundenDatenOrdner.id);
                var allFiles = (subContents.files || []).concat(subContents.pdfs || []);
                var vorlagen = allFiles.filter(function(f) {
                    var n = (f.name || '').toLowerCase();
                    // Akzeptiert "aufmass vorlage", "aufmass vorlage", auch mit Bindestrich
                    return (n.indexOf('aufmass vorlage') >= 0 || n.indexOf('aufmaß vorlage') >= 0 || n.indexOf('aufmass-vorlage') >= 0)
                        && n.endsWith('.json');
                });

                // Nach Datum sortieren: neueste zuerst
                vorlagen.sort(function(a, b) {
                    var ta = new Date(a.modifiedTime || a.createdTime || 0).getTime();
                    var tb = new Date(b.modifiedTime || b.createdTime || 0).getTime();
                    return tb - ta;
                });

                return vorlagen;
            };

            // Vorlage-Datei herunterladen, JSON parsen und in die App laden
            const loadAufmassVorlage = async (kunde, vorlageFile) => {
                var service = window.GoogleDriveService;
                if (!service || !service.accessToken) throw new Error('Drive nicht verbunden');

                setVorlageBusy({ action: 'load', message: 'Vorlage wird heruntergeladen...' });

                // 1. Datei herunterladen
                var blob = await service.downloadFile(vorlageFile.id);
                var text = await blob.text();
                var vorlage;
                try { vorlage = JSON.parse(text); }
                catch(e) { throw new Error('Vorlage-Datei ist kein gueltiges JSON.'); }

                if (vorlage.type !== 'aufmass-vorlage') {
                    throw new Error('Datei ist keine Aufmass-Vorlage (type="' + (vorlage.type || 'unbekannt') + '")');
                }

                setVorlageBusy({ action: 'load', message: 'Daten werden eingespielt...' });

                var kundeId = kunde._driveFolderId || kunde.id;
                var storage = window.TWStorage;

                // 2. LV_POSITIONEN setzen
                if (vorlage.lvPositionen && vorlage.lvPositionen.length) {
                    LV_POSITIONEN[kundeId] = vorlage.lvPositionen;
                }

                // 3. In IndexedDB speichern, damit offline weiter verfuegbar
                if (storage) {
                    try {
                        if (vorlage.gesamtliste) await storage.saveGesamtliste(kundeId, vorlage.gesamtliste);
                    } catch(e) { console.warn('[Vorlage] gesamtliste save:', e); }
                    try {
                        if (vorlage.raeume && vorlage.raeume.length) {
                            for (var i = 0; i < vorlage.raeume.length; i++) {
                                await storage.saveRaum(kundeId, vorlage.raeume[i]);
                            }
                        }
                    } catch(e) { console.warn('[Vorlage] raeume save:', e); }
                    try {
                        if (vorlage.aufmassItems && vorlage.aufmassItems.length) {
                            for (var j = 0; j < vorlage.aufmassItems.length; j++) {
                                await storage.put('aufmass', vorlage.aufmassItems[j]);
                            }
                        }
                    } catch(e) { console.warn('[Vorlage] aufmass save:', e); }
                    try {
                        if (vorlage.positionsListen && vorlage.positionsListen.length) {
                            for (var k = 0; k < vorlage.positionsListen.length; k++) {
                                await storage.savePositionsListe(vorlage.positionsListen[k]);
                            }
                        }
                    } catch(e) { console.warn('[Vorlage] positionsListen save:', e); }
                }

                // 4. importResult setzen
                if (vorlage.importResult) setImportResult(vorlage.importResult);

                // 5. selectedKunde anreichern
                var enriched = Object.assign({}, kunde, vorlage.kunde || {}, {
                    _driveFolderId: kundeId,
                    _lvPositionen: vorlage.lvPositionen,
                    _importResult: vorlage.importResult,
                    _fullyLoaded: true,
                    _fromVorlage: true,
                    _vorlageGeladenAt: new Date().toISOString(),
                    _vorlageName: vorlageFile.name,
                });
                setSelectedKunde(enriched);
                setKundeMode('gespeichertKomplett');

                setVorlageBusy(null);
                setVorlageToast({ type: 'success', message: '✓ Vorlage geladen: ' + vorlageFile.name });
                setTimeout(function(){ setVorlageToast(null); }, 4000);
            };

            // Button-Handler: "Vorlage laden" (oeffnet Drive-Vorlagen-Liste)
            const openVorlagenListe = async () => {
                if (!selectedKunde) {
                    alert('Bitte zuerst einen Kunden laden.');
                    return;
                }
                var service = window.GoogleDriveService;
                if (!service || !service.accessToken) {
                    alert('Google Drive ist nicht verbunden.\nVorlagen werden auf Drive gespeichert und koennen ohne Drive-Verbindung nicht geladen werden.');
                    return;
                }
                setVorlageBusy({ action: 'list', message: 'Vorlagen werden auf Google Drive gesucht...' });
                try {
                    var list = await listAufmassVorlagen(selectedKunde);
                    setVorlageBusy(null);
                    setVorlageList(list);
                } catch(err) {
                    console.error('[Vorlagen listen]', err);
                    setVorlageBusy(null);
                    alert('Fehler beim Suchen der Vorlagen:\n' + (err.message || err));
                }
            };

            // Eine Vorlage aus der Liste auswaehlen und laden
            const handleVorlageAuswaehlen = async (vorlageFile) => {
                if (!selectedKunde) return;
                setVorlageList(null); // Modal schliessen
                try {
                    await loadAufmassVorlage(selectedKunde, vorlageFile);
                    // Nach erfolgreichem Laden zur Modulwahl
                    navigateTo('modulwahl');
                } catch(err) {
                    console.error('[Vorlage laden]', err);
                    setVorlageBusy(null);
                    alert('Fehler beim Laden der Vorlage:\n' + (err.message || err));
                }
            };

            // Sichtbarkeit der Vorlage-Buttons (oberhalb der Schnellnavi):
            // Nur auf Seiten, wo Speichern/Laden Sinn macht und ein Kunde geladen ist.
            const showVorlageBar = (
                selectedKunde && (selectedKunde._driveFolderId || selectedKunde.id)
                && ['modulwahl', 'raumerkennung', 'raumblatt', 'akte', 'geladen', 'datenUebersicht', 'auswahl', 'lokalOrdnerBrowser', 'ordnerBrowser'].indexOf(page) >= 0
            );

            const handleKundeAnalysiert = () => {
                setKundeMode('analysiert');
                setIsDriveMode(false);
                setDriveStatus('offline');
                navigateTo('auswahl');
            };

            // ── NEU: Manueller Kunden-Handler ──
            const handleKundeManuell = () => {
                setKundeMode('manuell');
                setIsDriveMode(false);
                setDriveStatus('offline');
                navigateTo('manuellEingabe');
            };

            // ── NEU: Daten-Uebersicht: Bearbeitete Daten in Module uebertragen ──
            const handleDatenUebersichtSave = (result) => {
                if (!result) return;
                var kunde = selectedKunde || {};
                var kundeId = kunde.id || kunde._driveFolderId || kunde._lvPositionenKey || 'edit_' + Date.now();

                // Positionen aktualisieren
                if (result.positionen) {
                    var lvPos = result.positionen.map(function(p) {
                        return {
                            pos: p.pos, aufmasscode: p.aufmasscode || '', bez: p.bez, einheit: p.einheit, menge: p.menge,
                            einzelpreis: p.einzelpreis, bereich: p.bereich || '', kategorie: p.kategorie || '',
                            tags: p.tags || [], _epPreis: p.einzelpreis || null, _gpPreis: (p.menge * p.einzelpreis) || null,
                            _istNachtrag: p._istNachtrag || false
                        };
                    });
                    LV_POSITIONEN[kundeId] = lvPos;
                    kunde._lvPositionen = lvPos;
                    // MASTER-LISTE: Trennung Daten <-> Aufmass
                    // Diese Kopie ist die "Quelle der Wahrheit" der Daten-Liste
                    // und wird NIEMALS vom Aufmass-Modul ueberschrieben.
                    kunde._masterPositionen = JSON.parse(JSON.stringify(lvPos));
                    kunde._lvPositionenKey = kundeId;
                }

                // Raeume aktualisieren
                if (result.raeume) {
                    kunde._raeume = result.raeume;
                    kunde.raeume = result.raeume;
                    // MASTER-LISTE fuer Raeume
                    kunde._masterRaeume = JSON.parse(JSON.stringify(result.raeume));
                }

                // ImportResult IMMER aktualisieren (auch wenn nur Positionen geaendert)
                var updatedKd = {};
                if (result.stammFelder) {
                    var sf = result.stammFelder;
                    kunde.auftraggeber = sf.bauherr_firma || kunde.auftraggeber;
                    kunde.adresse = sf.objekt_baustelle || kunde.adresse;
                    kunde.baumassnahme = sf.objekt_bauvorhaben || kunde.baumassnahme;
                    kunde.auftraggeber_strasse = sf.bauherr_strasse || kunde.auftraggeber_strasse || '';
                    kunde.auftraggeber_plzOrt = sf.bauherr_plzOrt || kunde.auftraggeber_plzOrt || '';
                    kunde.auftraggeber_ansprechpartner = sf.bauherr_ansprechpartner || kunde.auftraggeber_ansprechpartner || '';
                    kunde.ag_email = sf.bauherr_email || kunde.ag_email || '';
                    kunde.ag_telefon = sf.bauherr_telefon || kunde.ag_telefon || '';
                    updatedKd = {
                        auftraggeber: sf.bauherr_firma || '',
                        auftraggeber_strasse: sf.bauherr_strasse || '',
                        auftraggeber_plzOrt: sf.bauherr_plzOrt || '',
                        auftraggeber_ansprechpartner: sf.bauherr_ansprechpartner || '',
                        auftraggeber_telefon: sf.bauherr_telefon || '',
                        auftraggeber_email: sf.bauherr_email || '',
                        bauleitung: sf.bauleiter_firma || '',
                        bauleitung_telefon: sf.bauleiter_telefon || '',
                        bauleitung_email: sf.bauleiter_email || '',
                        architekt: sf.architekt_buero || '',
                        architekt_telefon: sf.architekt_telefon || '',
                        architekt_email: sf.architekt_email || '',
                        adresse: sf.objekt_baustelle || '',
                        plzOrt: sf.objekt_plzOrt || '',
                        baumassnahme: sf.objekt_bauvorhaben || '',
                        gewerk: sf.objekt_gewerk || '',
                        auftragsdatum: sf.objekt_auftragsdatum || '',
                        auftragssummeNetto: sf.objekt_netto || '',
                        auftragssummeBrutto: sf.objekt_brutto || '',
                        projekt: sf.projekt || ''
                    };
                } else {
                    updatedKd = (importResult && importResult.kundendaten) || {};
                }

                var newIR = Object.assign({}, importResult || {}, {
                    positionen: result.positionen || (importResult && importResult.positionen) || [],
                    raeume: result.raeume || (importResult && importResult.raeume) || [],
                    kundendaten: updatedKd
                });
                setImportResult(newIR);
                kunde._importResult = newIR;

                // Lokal speichern
                var localKey = 'aufmass_kunde_' + kundeId;
                try {
                    var toSave = Object.assign({}, kunde);
                    delete toSave.folders;
                    delete toSave.files;
                    toSave._bearbeitetAm = new Date().toLocaleString('de-DE');
                    localStorage.setItem(localKey, JSON.stringify(toSave));
                    console.log('Daten-Uebersicht gespeichert:', localKey);
                } catch(e) { console.warn('Speicherfehler:', e); }

                setSelectedKunde(Object.assign({}, kunde));
                // NICHT navigieren — User bleibt auf DatenUebersicht!
            };

            // ── NEU: Manuelle Eingabe fertiggestellt ──
            const handleManuellFertig = (data) => {
                // Kunde-Objekt aufbauen (kompatibel mit analysiertem Kunden)
                var kundeId = 'manuell_' + Date.now();
                var lvPosFormatted = data.positionen.map(function(p) {
                    return {
                        pos: p.posNr,
                        aufmasscode: p.aufmasscode || '',
                        bez: p.leistung,
                        einheit: p.einheit || 'm\u00b2',
                        menge: p.menge || 0,
                        einzelpreis: p.ep || 0,
                        bereich: '',
                        kategorie: '',
                        tags: [],
                        _epPreis: p.ep || null,
                        _gpPreis: p.gp || null,
                        _istNachtrag: p._istNachtrag || false
                    };
                });

                var raeumeFormatted = data.raeume.map(function(r) {
                    return {
                        nr: r.raumNr || '',
                        bez: r.bezeichnung || '',
                        geschoss: (r.geschoss || '').toUpperCase(),
                        bemerkung: r.bemerkung || '',
                        quelle: 'manuell',
                        fliesenhoehe: 0,
                        raumhoehe: 0,
                        waende: [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}]
                    };
                });

                var kundeObj = {
                    id: kundeId,
                    name: data.kundenName + (data.bauvorhaben ? ' \u2013 ' + data.bauvorhaben : ''),
                    auftraggeber: data.kundenName,
                    adresse: data.bauvorhaben || '',
                    _fullyLoaded: true,
                    _manuellerKunde: true,
                    _lvPositionen: lvPosFormatted,
                    _raeume: raeumeFormatted,
                    _lvPositionenKey: kundeId,
                    _gespeichertAm: new Date().toLocaleString('de-DE'),
                    raeume: raeumeFormatted,
                    _stammFelder: data._stammFelder || null
                };

                // LV-Positionen in globales Objekt injizieren
                LV_POSITIONEN[kundeId] = lvPosFormatted;

                // ImportResult erstellen (fuer Rechnung/Module)
                var stammF = data._stammFelder || {};
                var impResult = {
                    positionen: lvPosFormatted,
                    raeume: raeumeFormatted,
                    kundendaten: {
                        auftraggeber: data.kundenName,
                        adresse: data.bauvorhaben || '',
                        baumassnahme: data.bauvorhaben || '',
                        bauleitung: data.bauleitung || '',
                        bauleitung_telefon: data.bl_telefon || '',
                        bauleitung_email: data.bl_email || '',
                        architekt: data.architekt || '',
                        architekt_telefon: data.arch_telefon || '',
                        architekt_email: data.arch_email || '',
                        auftraggeber_strasse: stammF.bauherr_strasse || '',
                        auftraggeber_plzOrt: stammF.bauherr_plzOrt || '',
                        auftraggeber_ansprechpartner: stammF.bauherr_ansprechpartner || '',
                        auftraggeber_telefon: data.ag_telefon || stammF.bauherr_telefon || '',
                        auftraggeber_email: data.ag_email || stammF.bauherr_email || ''
                    },
                    stammdaten: {
                        projekt: stammF.objekt_projektnr || '',
                        bauherr: { firma: stammF.bauherr_firma || data.kundenName, ansprechpartner: stammF.bauherr_ansprechpartner || '', strasse: stammF.bauherr_strasse || '', plz: (stammF.bauherr_plzOrt || '').split(' ')[0] || '', ort: (stammF.bauherr_plzOrt || '').split(' ').slice(1).join(' ') || '', telefon: stammF.bauherr_telefon || '', email: stammF.bauherr_email || '' },
                        bauleiter: { name: stammF.bauleiter_name || data.bauleitung || '', firma: stammF.bauleiter_firma || '', telefon: stammF.bauleiter_telefon || data.bl_telefon || '', email: stammF.bauleiter_email || data.bl_email || '' },
                        architekt: { buero: stammF.architekt_buero || data.architekt || '', projektbearbeiter: stammF.architekt_name || '', telefon: stammF.architekt_telefon || data.arch_telefon || '', emailInhaber: stammF.architekt_email || data.arch_email || '' },
                        objektdaten: { bauvorhaben: stammF.objekt_bauvorhaben || data.bauvorhaben || '', baustelleStrasse: stammF.objekt_strasse || '', baustellePlzOrt: stammF.objekt_plzOrt || '', gewerk: 'Fliesenarbeiten', auftragsdatum: stammF.objekt_auftragsdatum || '' }
                    }
                };
                setImportResult(impResult);

                // Lokal speichern (wie analysierter Kunde)
                var localKey = 'aufmass_kunde_' + kundeId;
                var toSave = Object.assign({}, kundeObj);
                toSave._importResult = impResult;
                try {
                    localStorage.setItem(localKey, JSON.stringify(toSave));
                    console.log('✅ Manueller Kunde gespeichert:', localKey);
                } catch(saveErr) {
                    console.warn('Speicherfehler:', saveErr);
                }

                setSelectedKunde(kundeObj);
                setKundeMode('analysiert'); // Ab jetzt wie ein angelegter Kunde behandeln
                navigateTo('modulwahl'); // Direkt zur Modulauswahl!
            };

            // ── UPDATE-ANALYSE: Kunde aus Drive neu laden + KI-Analyse ──
            const handleUpdateKunde = async (kunde) => {
                if (!kunde._driveFolderId) {
                    alert('Kein Google Drive Ordner verknüpft. Bitte zuerst über "Kunde NEU" verbinden.');
                    return;
                }

                // Google Drive verbinden falls noetig
                var service = window.GoogleDriveService;
                if (!service.accessToken) {
                    try {
                        await service.init();
                        await service.requestAuth();
                        setDriveStatus('online');
                    } catch(authErr) {
                        alert('Google Drive Verbindung fehlgeschlagen.\nBitte zuerst über "Kunde NEU" mit Google Drive verbinden.');
                        return;
                    }
                }

                setLoading(true);
                setSelectedKunde(kunde);
                setLoadProgress('🔄 Update-Analyse: Ordnerinhalt wird geladen...');
                navigateTo('akte');

                try {
                    // 1. Aktuelle Dateien aus Google Drive laden
                    const contents = await service.listFolderContents(kunde._driveFolderId);
                    var enriched = {
                        ...kunde,
                        folders: contents.folders,
                        files: contents.files,
                        dateien: contents.files.length + contents.folders.reduce((s, f) => s + f.files.length, 0),
                        _driveFolderId: kunde._driveFolderId,
                    };
                    setSelectedKunde(enriched);

                    // 2. KI-Ordneranalyse - DEAKTIVIERT (April 2026)
                    // Die OrdnerAnalyseEngine analysierte zuvor alle 10 Kundenordner
                    // und verursachte unnoetige KI-Kosten. Die KI-Grundriss-Funktion im
                    // Aufmass-Modul arbeitet unabhaengig davon und sucht gezielt NUR im
                    // Zeichnungsordner. Kundendaten kommen jetzt ausschliesslich aus
                    // dem "Kunden-Daten"-Ordner (siehe KundenDatenParser).
                    setLoadProgress('📂 Kundendaten werden geladen...');
                    window._kiDisabled = false;

                    var result = { positionen: [], kundendaten: {}, vertrag: {}, meta: null };
                    setOrdnerAnalyseMeta(null);

                    // 3. Positionen in LV_POSITIONEN injizieren
                    if (result.positionen && result.positionen.length > 0) {
                        var kundeKey = kunde._driveFolderId || kunde.id || 'drive_update';
                        LV_POSITIONEN[kundeKey] = result.positionen;
                    }

                    // 4. Kundendaten mergen
                    var kd = result.kundendaten || {};
                    var vt = result.vertrag || kd.vertrag || {};
                    var fullyLoaded = Object.assign({}, enriched, {
                        auftraggeber: kd.auftraggeber || enriched.auftraggeber || kunde.name,
                        adresse: kd.adresse || kd.baumassnahme || enriched.adresse || '',
                        baumassnahme: kd.baumassnahme || enriched.baumassnahme || '',
                        bauleitung: kd.bauleitung || enriched.bauleitung || '',
                        bl_adresse: kd.bl_adresse || enriched.bl_adresse || '',
                        bl_telefon: kd.bl_telefon || enriched.bl_telefon || '',
                        bl_fax: kd.bl_fax || enriched.bl_fax || '',
                        bl_email: kd.bl_email || enriched.bl_email || '',
                        architekt: kd.architekt || enriched.architekt || '',
                        arch_adresse: kd.arch_adresse || enriched.arch_adresse || '',
                        arch_telefon: kd.arch_telefon || enriched.arch_telefon || '',
                        arch_fax: kd.arch_fax || enriched.arch_fax || '',
                        arch_email: kd.arch_email || enriched.arch_email || '',
                        ag_adresse: kd.ag_adresse || kd.adresse || enriched.ag_adresse || '',
                        ag_telefon: kd.ag_telefon || kd.auftraggeber_telefon || enriched.ag_telefon || '',
                        ag_fax: kd.ag_fax || enriched.ag_fax || '',
                        ag_email: kd.ag_email || kd.auftraggeber_email || enriched.ag_email || '',
                        auftraggeber_strasse: kd.auftraggeber_strasse || enriched.auftraggeber_strasse || '',
                        auftraggeber_plzOrt: kd.auftraggeber_plzOrt || enriched.auftraggeber_plzOrt || '',
                        auftraggeber_ansprechpartner: kd.auftraggeber_ansprechpartner || enriched.auftraggeber_ansprechpartner || '',
                        vertrag: vt,
                        raeume: (result.raeume || []).map(function(r, idx) {
                            if (typeof r === 'string') {
                                return { id: 'update_' + idx, nr: String(idx + 1), bez: r,
                                    geschoss: (r.match(/EG|OG|KG|DG|UG/i) || [''])[0].toUpperCase(),
                                    fliesenhoehe: 0, raumhoehe: 0,
                                    waende: [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}]
                                };
                            }
                            return Object.assign({ id: 'update_' + idx }, r, { nr: r.nr || String(idx + 1) });
                        }),
                        zeichnungen: result.zeichnungen || [],
                        _importResult: result,
                        _lvPositionenKey: kunde._driveFolderId,
                        _fullyLoaded: true,
                    });
                    setSelectedKunde(fullyLoaded);
                    setImportResult(result);
                    setIsDriveMode(true);

                    // 5. Lokal speichern (ueberschreibt alte Daten)
                    try {
                        var localKey = 'aufmass_kunde_' + (kunde._driveFolderId || kunde.id || kunde.name || 'unknown');
                        var toSave = Object.assign({}, fullyLoaded);
                        delete toSave.folders;
                        delete toSave.files;
                        toSave._lvPositionen = result.positionen || [];
                        toSave._gespeichertAm = new Date().toLocaleString('de-DE');
                        toSave._updateAnalyse = true;
                        toSave._letzteUpdateAnalyse = new Date().toISOString();
                        localStorage.setItem(localKey, JSON.stringify(toSave));
                        console.log('Update-Analyse gespeichert:', localKey);
                    } catch(saveErr) {
                        console.warn('Speichern fehlgeschlagen:', saveErr.message);
                    }

                    // IndexedDB Persistenz
                    if (window.TWStorage && window.TWStorage.isReady()) {
                        var kid = kunde._driveFolderId || kunde.id || kunde.name;
                        TWStorage.saveKunde(fullyLoaded).catch(function(){});
                        if (result) TWStorage.put('driveCache', { id: 'importResult_' + kid, type: 'importResult', data: result, updatedAt: new Date().toISOString() }).catch(function(){});
                        TWStorage.saveAppState('lastKundeId', kid);

                        // Drive-Sync: Ordnerstruktur + Dateien im Hintergrund herunterladen
                        if (kunde._driveFolderId) {
                            TWStorage.DriveSync.syncKundenOrdner(kid, kunde._driveFolderId, function(info) {
                                console.log('[DriveSync] ' + info.message);
                            }).catch(function(e) { console.warn('[DriveSync]', e.message); });
                        }
                    }
                    navigateTo('geladen'); // Ergebnis anzeigen!

                } catch(err) {
                    console.error('Update-Analyse Fehler:', err);
                    setLoadProgress('❌ Fehler: ' + err.message);
                }
                setLoading(false);
            };

            // ── NEU: Modul-Auswahl Handler ──
            const handleSelectModul = (modulId) => {
                switch(modulId) {
                    case 'aufmass':
                        handleStartAufmass(); // → raumerkennung (NICHT zurueck zu geladen!)
                        break;
                    case 'rechnung':
                        navigateTo('rechnung');
                        break;
                    case 'ausgangsbuch':
                        navigateTo('ausgangsbuch');
                        break;
                    case 'schriftverkehr':
                        navigateTo('schriftverkehr');
                        break;
                    case 'baustelle':
                        navigateTo('baustelle');
                        break;
                    case 'ordnerAnalyse':
                        navigateTo('ordnerAnalyse');
                        break;
                    default:
                        break;
                }
            };

            // ── Ordneranalyse starten (mit Progress-Overlay) ──
            const handleStartOrdnerAnalyse = async () => {
                if (!selectedKunde || !selectedKunde._driveFolderId) {
                    alert('Kein Google Drive Ordner verknüpft. Bitte über "Kunde NEU" verbinden.');
                    return;
                }
                var service = window.GoogleDriveService;
                if (!service.accessToken) {
                    try { await service.init(); await service.requestAuth(); } catch(authErr) { alert('Google Drive Verbindung fehlgeschlagen.'); return; }
                }
                setIsOrdnerAnalyseRunning(true);
                setOrdnerAnalyseProgress({ phase: 'start', message: 'Ordnerstruktur wird geladen...', current: 0, total: 0 });
                try {
                    var result = await window.OrdnerAnalyseEngine.analyzeKundeForApp(
                        selectedKunde,
                        function(p) { setOrdnerAnalyseProgress(p || {}); }
                    );
                    setOrdnerAnalyseMeta(result.meta || null);

                    // ═══ Ergebnisse in die App mergen ═══
                    if (result.positionen && result.positionen.length > 0) {
                        var kundeKey = selectedKunde._driveFolderId || selectedKunde.id;
                        if (typeof LV_POSITIONEN !== 'undefined') LV_POSITIONEN[kundeKey] = result.positionen;
                    }
                    setImportResult(result);

                    // Kundendaten anreichern
                    var kd = result.kundendaten || {};
                    var vt = result.vertrag || {};
                    setSelectedKunde(function(prev) {
                        return Object.assign({}, prev, {
                            auftraggeber: kd.auftraggeber || prev.auftraggeber || '',
                            adresse: kd.adresse || prev.adresse || '',
                            baumassnahme: kd.baumassnahme || prev.baumassnahme || '',
                            bauleitung: kd.bauleitung || prev.bauleitung || '',
                            bl_telefon: kd.bl_telefon || prev.bl_telefon || '',
                            bl_email: kd.bl_email || prev.bl_email || '',
                            architekt: kd.architekt || prev.architekt || '',
                            arch_telefon: kd.arch_telefon || prev.arch_telefon || '',
                            arch_email: kd.arch_email || prev.arch_email || '',
                            ag_adresse: kd.ag_adresse || prev.ag_adresse || '',
                            ag_telefon: kd.ag_telefon || kd.auftraggeber_telefon || prev.ag_telefon || '',
                            ag_email: kd.ag_email || kd.auftraggeber_email || prev.ag_email || '',
                            auftraggeber_strasse: kd.auftraggeber_strasse || prev.auftraggeber_strasse || '',
                            auftraggeber_plzOrt: kd.auftraggeber_plzOrt || prev.auftraggeber_plzOrt || '',
                            auftraggeber_ansprechpartner: kd.auftraggeber_ansprechpartner || prev.auftraggeber_ansprechpartner || '',
                            vertrag: vt.auftraggeber ? vt : (prev.vertrag || {}),
                            raeume: result.raeume && result.raeume.length > 0 ? result.raeume.map(function(r, idx) {
                                return Object.assign({ id: 'oa_' + idx }, r, { nr: r.nr || String(idx + 1) });
                            }) : prev.raeume || [],
                            _importResult: result,
                            _lvPositionenKey: selectedKunde._driveFolderId || selectedKunde.id,
                            _ordnerAnalyseCompleted: true,
                        });
                    });

                    // Lokal speichern
                    try {
                        var localKey = 'aufmass_kunde_' + (selectedKunde._driveFolderId || selectedKunde.id || selectedKunde.name || 'unknown');
                        var toSave = Object.assign({}, selectedKunde);
                        delete toSave.folders; delete toSave.files;
                        toSave._lvPositionen = result.positionen || [];
                        toSave._gespeichertAm = new Date().toLocaleString('de-DE');
                        toSave._ordnerAnalyseCompleted = true;
                        localStorage.setItem(localKey, JSON.stringify(toSave));
                    } catch(saveErr) { console.warn('Speichern fehlgeschlagen:', saveErr.message); }

                    setOrdnerAnalyseProgress({ phase: 'done', message: '✅ Ordneranalyse abgeschlossen! ' + (result.positionen || []).length + ' Positionen · ' + (result.raeume || []).length + ' Räume · ' + ((result.crossRef && result.crossRef.zusammenfassung) ? result.crossRef.zusammenfassung.gesamtFehler || 0 : 0) + ' Unstimmigkeiten', current: 8, total: 8 });
                } catch(err) {
                    console.error('Ordneranalyse Fehler:', err);
                    setOrdnerAnalyseProgress({ phase: 'done', message: '❌ Fehler: ' + err.message, current: 0, total: 0 });
                }
            };

            // ── Einzelnen Ordner neu analysieren ──
            const handleReanalyzeOrdner = async (ordnerNr) => {
                if (!selectedKunde || !selectedKunde._driveFolderId) return;
                var service = window.GoogleDriveService;
                if (!service.accessToken) {
                    try { await service.init(); await service.requestAuth(); } catch(e) { alert('Drive-Verbindung fehlgeschlagen.'); return; }
                }
                setIsOrdnerAnalyseRunning(true);
                setOrdnerAnalyseProgress({ phase: 'analyse', message: 'Ordner ' + ordnerNr + ' wird neu analysiert...', current: 1, total: 1 });
                try {
                    var kundenId = selectedKunde._driveFolderId || selectedKunde.id || selectedKunde.name;
                    var contents = await service.listFolderContents(selectedKunde._driveFolderId);
                    var folders = contents.folders || [];
                    var targetFolder = folders.find(function(f) { return window.OrdnerAnalyseEngine.mapDriveFolderToOrdner(f.name) === ordnerNr; });
                    if (!targetFolder) { alert('Ordner ' + ordnerNr + ' nicht in Google Drive gefunden.'); setIsOrdnerAnalyseRunning(false); return; }
                    await window.OrdnerAnalyseEngine.analyzeOrdner(kundenId, ordnerNr, targetFolder.files || [], function(msg) {
                        setOrdnerAnalyseProgress({ phase: 'analyse', message: msg, current: 1, total: 1 });
                    });
                    // Cross-Ref aktualisieren
                    setOrdnerAnalyseProgress({ phase: 'crossref', message: 'Cross-Referencing wird aktualisiert...', current: 1, total: 1 });
                    await window.OrdnerAnalyseEngine.runCrossReferencing(kundenId);
                    var newMeta = await window.OrdnerAnalyseDB.getMeta(kundenId);
                    setOrdnerAnalyseMeta(newMeta);
                    setOrdnerAnalyseProgress({ phase: 'done', message: '✅ Ordner ' + ordnerNr + ' neu analysiert!', current: 1, total: 1 });
                } catch(err) {
                    console.error('Einzelordner-Analyse Fehler:', err);
                    setOrdnerAnalyseProgress({ phase: 'done', message: '❌ Fehler: ' + err.message, current: 0, total: 0 });
                }
            };

            // ── NEU: Ordneranalyse Meta laden wenn Kunde wechselt ──
            useEffect(function() {
                if (!selectedKunde) return;
                var kundenId = selectedKunde._driveFolderId || selectedKunde.id || selectedKunde.name;
                window.OrdnerAnalyseDB.getMeta(kundenId).then(function(m) {
                    setOrdnerAnalyseMeta(m);
                }).catch(function() {});
            }, [selectedKunde]);

            const handleAuth = async (authResult) => {
                setShowAuth(false);
                setDriveStatus('connecting');
                setLoading(true);
                navigateTo('auswahl');

                if (authResult && !authResult.demo) {
                    // Echte Google Drive Verbindung
                    try {
                        setIsDriveMode(true);
                        const folders = await window.GoogleDriveService.listKundenOrdner();
                        setDriveKunden(folders);
                        setDriveStatus('online');
                    } catch (err) {
                        console.error('Drive Fehler:', err);
                        alert('Google Drive Fehler:\n\n' + err.message + '\n\nPrüfe in der Google Cloud Console:\n1. "Datenzugriff" → Google Drive API Scope hinzufügen\n2. Deine E-Mail als Testnutzer eintragen\n3. Autorisierte JavaScript-Quellen korrekt');
                        setDriveStatus('online');
                        // Fallback auf Demo
                        setIsDriveMode(false);
                    }
                } else {
                    // Demo-Modus
                    setIsDriveMode(false);
                    setDriveStatus('online');
                }
                setLoading(false);
            };

            const handleSelectKunde = async (kunde) => {
                setSelectedKunde(kunde);

                var localKey = 'aufmass_kunde_' + (kunde.id || kunde.name || 'unknown');

                // ═══ MODUS: KUNDENDATEN KOMPLETT LADEN (Ordner + 3 Listen parsen) ═══
                if (kundeMode === 'gespeichert' || kundeMode === 'gespeichertKomplett') {
                    setLoading(true);
                    setLoadProgress('Pruefe lokalen Speicher...');
                    navigateTo('akte');

                    var driveFolderIdEarly = kunde.id || kunde._driveFolderId || null;

                    // ─── PHASE 1: Cache-Check — wurde dieser Kunde schon mal komplett geladen? ───
                    var cachedKunde = null;
                    if (driveFolderIdEarly && window.TWStorage && window.TWStorage.isReady()) {
                        try {
                            cachedKunde = await window.TWStorage.loadKunde(driveFolderIdEarly);
                        } catch(e) { console.warn('[Cache-Check]', e); }
                    }

                    // ─── PHASE 2a: Cache-Hit → Lokal laden + Drive-Diff im Hintergrund ───
                    if (cachedKunde && cachedKunde._fullyLoaded && cachedKunde._lvPositionen && cachedKunde._raeume) {
                        console.log('[Kundenladen] Cache-Hit fuer', kunde.name, '- nutze lokale Daten');
                        setLoadProgress('Lokale Daten gefunden - lade ohne Internet...');

                        // Lokale Daten direkt verwenden
                        var kundeId = driveFolderIdEarly;
                        LV_POSITIONEN[kundeId] = cachedKunde._lvPositionen;
                        if (cachedKunde._importResult) setImportResult(cachedKunde._importResult);

                        var enrichedFromCache = Object.assign({}, kunde, cachedKunde, {
                            _driveFolderId: driveFolderIdEarly,
                            _loadFromKundendaten: true,
                            _fromCache: true,
                        });
                        setSelectedKunde(enrichedFromCache);
                        setLoadProgress(cachedKunde._lvPositionen.length + ' Positionen + ' + cachedKunde._raeume.length + ' Raeume aus lokalem Speicher');

                        // Drive-Diff im Hintergrund (asynchron, blockiert UI nicht)
                        var service = window.GoogleDriveService;
                        if (service && service.accessToken && driveFolderIdEarly) {
                            (async function() {
                                try {
                                    var lastSync = await window.TWStorage.DriveUploadSync.getLastSyncTime(driveFolderIdEarly);
                                    var driveCheck = await window.TWStorage.DriveUploadSync.checkDriveNewerThan(driveFolderIdEarly, lastSync);
                                    if (driveCheck.newer) {
                                        console.log('[Hintergrund-Sync] Drive hat ' + driveCheck.anzahlGeaenderter + ' neuere Dateien');
                                        // Wenn Kollege parallel gearbeitet hat: User informieren
                                        var msg = '\u26A0\uFE0F Es gibt ' + driveCheck.anzahlGeaenderter + ' neuere Datei(en) auf Drive fuer diesen Kunden.\n\n' +
                                                  'Vermutlich hat ein Kollege parallel gearbeitet.\n\n' +
                                                  'Beispiel:\n  - ' + (driveCheck.geaenderteDateien || []).slice(0, 3).join('\n  - ') + '\n\n' +
                                                  'Jetzt komplett neu von Drive laden? (Bestehende lokale Aenderungen koennten ueberschrieben werden.)';
                                        if (confirm(msg)) {
                                            // Hard-Refresh: Cache leeren, dann normal laden
                                            cachedKunde = null;
                                            window.location.reload();
                                        }
                                    } else {
                                        // Drive ist gleich oder aelter als lokal - alles ok
                                        TWStorage.DriveSync.syncKundenOrdner(driveFolderIdEarly, driveFolderIdEarly, function(info) {
                                            console.log('[Hintergrund-Sync] ' + info.message);
                                        }).catch(function(e) { console.warn('[Hintergrund-Sync]', e.message); });
                                    }
                                } catch(e) { console.warn('[Hintergrund-Diff]', e); }
                            })();
                        }

                        setLoading(false);
                        await new Promise(function(r){ setTimeout(r, 800); });
                        setKundeMode('analysiert');
                        navigateTo('datenUebersicht');
                        return;
                    }

                    // ─── PHASE 2b: Cache-Miss → Erst-Laden komplett von Drive ───
                    setLoadProgress('Erstes Laden - alles von Google Drive holen...');
                    try {
                        var service = window.GoogleDriveService;
                        // Drive-Folder-ID aus allen moeglichen Quellen ermitteln
                        var driveFolderId = kunde.id || kunde._driveFolderId || null;
                        if (service && service.accessToken && driveFolderId) {
                            // 1. Ordnerinhalt FRISCH von Google Drive laden (KEIN Cache!)
                            setLoadProgress('Lade Ordnerstruktur von Google Drive...');
                            const contents = await service.listFolderContents(driveFolderId);

                            // 2. "Kunden-Daten" Unterordner finden (mit/ohne Bindestrich)
                            var parser = window.KundenDatenParser;
                            var kundendatenFolder = null;
                            if (parser) {
                                kundendatenFolder = (contents.folders || []).find(function(f) {
                                    return parser.isKundenDatenFolder(f.name);
                                });
                            }
                            if (!kundendatenFolder) {
                                // Fallback: alte Schreibweise
                                kundendatenFolder = (contents.folders || []).find(function(f) {
                                    return f.name.toLowerCase().indexOf('kundendaten') >= 0 || f.name.toLowerCase().indexOf('kunden-daten') >= 0;
                                });
                            }

                            var enriched = {
                                ...kunde,
                                auftraggeber: kunde.name,
                                adresse: '',
                                folders: contents.folders,
                                files: contents.files,
                                dateien: contents.files.length + contents.folders.reduce(function(s, f) { return s + (f.files || []).length; }, 0),
                                _driveFolderId: driveFolderId,
                                _loadFromKundendaten: true,
                            };

                            if (kundendatenFolder && kundendatenFolder.files && kundendatenFolder.files.length > 0) {
                                setLoadProgress('Lade ' + kundendatenFolder.files.length + ' Dateien aus Kunden-Daten...');

                                // 3. Excel-Dateien herunterladen
                                var geladene = [];
                                for (var di = 0; di < kundendatenFolder.files.length; di++) {
                                    var file = kundendatenFolder.files[di];
                                    setLoadProgress((di+1) + '/' + kundendatenFolder.files.length + ': ' + file.name);
                                    try {
                                        var blob = await service.downloadFile(file.id);
                                        geladene.push({ name: file.name, blob: blob, folder: 'Kunden-Daten' });
                                    } catch(dlErr) {
                                        console.error('Download-Fehler:', file.name, dlErr);
                                        geladene.push({ name: file.name, error: dlErr.message });
                                    }
                                }

                                var erfolgreich = geladene.filter(function(d){ return !d.error; });
                                setLoadProgress(erfolgreich.length + ' Dateien geladen - Parser startet...');

                                // 4. EXCEL-PARSER: 3 Listen deterministisch parsen
                                if (parser && erfolgreich.length > 0) {
                                    var parseResult = await parser.parseAlleListenAsync(erfolgreich, function(msg) {
                                        setLoadProgress(msg);
                                    });

                                    console.log('=== KundenDatenParser Ergebnis ===');
                                    console.log('  Stammdaten:', parseResult.stammdaten ? 'JA' : 'NEIN');
                                    console.log('  Positionen:', parseResult.positionen.length);
                                    console.log('  Nachtraege:', parseResult.nachtraege.length);
                                    console.log('  Raeume:', parseResult.raeume.length);
                                    console.log('  Fehler:', parseResult.meta.fehler);

                                    // 5. Import-Result erstellen (App-kompatibles Format)
                                    var impResult = parser.ergebnisZuImportResult(parseResult);

                                    // 6. Daten in App-State injizieren
                                    var kundeId = driveFolderId || 'gespeichert_' + Date.now();
                                    LV_POSITIONEN[kundeId] = impResult.positionen;
                                    setImportResult(impResult);

                                    // 7. Kunde-Objekt mit allen Daten anreichern
                                    var kd = impResult.kundendaten || {};
                                    enriched.auftraggeber = kd.auftraggeber || kunde.name;
                                    enriched.adresse = kd.adresse || '';
                                    enriched.baumassnahme = kd.baumassnahme || '';
                                    enriched._fullyLoaded = true;
                                    enriched._lvPositionen = impResult.positionen;
                                    enriched._raeume = impResult.raeume;
                                    enriched._lvPositionenKey = kundeId;
                                    enriched._nachtraege = impResult.nachtraege;
                                    enriched._stammdaten = parseResult.stammdaten;
                                    enriched._importResult = impResult;
                                    enriched._gespeichertAm = new Date().toLocaleString('de-DE');
                                    enriched._parseQuelle = 'kunden-daten-parser';
                                    enriched.raeume = impResult.raeume;
                                    // MASTER-LISTEN initialisieren (Trennung Daten <-> Aufmass)
                                    enriched._masterPositionen = JSON.parse(JSON.stringify(impResult.positionen || []));
                                    enriched._masterRaeume = JSON.parse(JSON.stringify(impResult.raeume || []));

                                    // 8. Lokal speichern fuer spaetere Verwendung
                                    var localKey2 = 'aufmass_kunde_' + kundeId;
                                    try {
                                        var toSave = Object.assign({}, enriched);
                                        delete toSave.folders;
                                        delete toSave.files;
                                        localStorage.setItem(localKey2, JSON.stringify(toSave));
                                        console.log('Kunde lokal gespeichert:', localKey2);
                                    } catch(saveErr) {
                                        console.warn('LocalStorage Speicherfehler:', saveErr);
                                    }

                                    // 8b. IndexedDB-Speicher
                                    if (window.TWStorage && window.TWStorage.isReady()) {
                                        TWStorage.saveKunde(enriched).catch(function(e) { console.warn('TWStorage Kunde:', e); });
                                        if (impResult) {
                                            TWStorage.put('driveCache', { id: 'importResult_' + kundeId, type: 'importResult', data: impResult, updatedAt: new Date().toISOString() }).catch(function(){});
                                        }
                                        if (impResult.positionen) {
                                            TWStorage.saveGesamtliste(kundeId, impResult.positionen).catch(function(){});
                                        }
                                        TWStorage.saveAppState('lastKundeId', kundeId);
                                        console.log('[TW-Storage] Kundendaten in IndexedDB gespeichert');

                                        // Drive-Sync im Hintergrund
                                        if (driveFolderId) {
                                            TWStorage.DriveSync.syncKundenOrdner(kundeId, driveFolderId, function(info) {
                                                console.log('[DriveSync] ' + info.message);
                                            }).then(function(result) {
                                                console.log('[DriveSync] Sync abgeschlossen:', result.stats.dateienSynced, 'Dateien');
                                            }).catch(function(e) {
                                                console.warn('[DriveSync] Sync-Fehler:', e.message);
                                            });
                                        }
                                    }

                                    setLoadProgress(impResult.positionen.length + ' Positionen + ' + impResult.raeume.length + ' Raeume geladen!');
                                } else {
                                    setLoadProgress('Parser nicht verfuegbar oder keine Dateien.');
                                    enriched._fullyLoaded = true;
                                }
                            } else {
                                setLoadProgress('Kein "Kunden-Daten" Ordner gefunden in: ' + kunde.name);
                                enriched._fullyLoaded = false;
                            }

                            setSelectedKunde(enriched);
                        }
                    } catch(err) {
                        console.error('Kundendaten laden:', err);
                        setLoadProgress('Fehler: ' + err.message);
                    }
                    setLoading(false);
                    // Kurz warten damit User die Erfolgsmeldung sieht
                    await new Promise(function(r){ setTimeout(r, 1200); });
                    setKundeMode('analysiert');
                    navigateTo('datenUebersicht');
                    return;
                }

                // ═══ MODUS: MANUELL ANLEGEN ═══
                if (kundeMode === 'manuell') {
                    // Kunde ausgewaehlt, jetzt manuelles Eingabeformular
                    setSelectedKunde({
                        ...kunde,
                        _driveFolderId: kunde.id,
                        auftraggeber: kunde.name,
                    });
                    navigateTo('manuellEingabe');
                    return;
                }

                // ═══ MODUS: KI-ANALYSE ═══
                if (kundeMode === 'ki' || kundeMode === 'neu') {
                    // Ordnerstruktur laden → analyseConfig zeigen
                    if (isDriveMode && kunde.id && !kunde.files) {
                        setLoading(true);
                        setLoadProgress('📂 Ordnerinhalt wird geladen...');
                        navigateTo('akte');
                        try {
                            const contents = await window.GoogleDriveService.listFolderContents(kunde.id);
                            var enrichedKi = {
                                ...kunde,
                                auftraggeber: kunde.name,
                                adresse: '',
                                folders: contents.folders,
                                files: contents.files,
                                dateien: contents.files.length + contents.folders.reduce(function(s, f) { return s + (f.files || []).length; }, 0),
                                _driveFolderId: kunde.id,
                            };
                            setSelectedKunde(enrichedKi);
                            setLoading(false);
                            setLoadProgress('');
                            navigateTo('analyseConfig');
                            return;
                        } catch (err) {
                            console.error('Ordner laden:', err);
                            setLoadProgress('Fehler: ' + err.message);
                        }
                        setLoading(false);
                    }
                    return;
                }

                // ═══ FALLBACK: Alte "analysiert" Logik fuer Kompatibilitaet ═══
                if (kundeMode === 'analysiert') {
                    try {
                        var cached = localStorage.getItem(localKey);
                        if (cached) {
                            var cachedData = JSON.parse(cached);
                            if (cachedData._lvPositionen && cachedData._lvPositionen.length > 0) {
                                var kundeKeyC = kunde.id || 'cached_import';
                                LV_POSITIONEN[kundeKeyC] = cachedData._lvPositionen;
                                cachedData._lvPositionenKey = kundeKeyC;
                            }
                            if (cachedData._importResult) setImportResult(cachedData._importResult);
                            cachedData._fullyLoaded = true;
                            setSelectedKunde(cachedData);
                            setLoadProgress('');
                            setLoading(false);
                            navigateTo('geladen');
                            return;
                        } else {
                            alert('Keine lokal gespeicherten Daten für diesen Kunden.');
                            navigateTo('start');
                            return;
                        }
                    } catch(cacheErr) {
                        console.warn('Cache-Fehler:', cacheErr);
                    }
                }

                // ═══ AUS DRIVE LADEN (Legacy) ═══
                if (isDriveMode && kunde.id && !kunde.files) {
                    setLoading(true);
                    setLoadProgress('📂 Ordnerinhalt wird geladen...');
                    navigateTo('akte');
                    try {
                        const contents = await window.GoogleDriveService.listFolderContents(kunde.id);
                        var enrichedL = {
                            ...kunde,
                            auftraggeber: kunde.name,
                            adresse: '',
                            folders: contents.folders,
                            files: contents.files,
                            dateien: contents.files.length + contents.folders.reduce(function(s, f) { return s + (f.files || []).length; }, 0),
                            _driveFolderId: kunde.id,
                        };
                        setSelectedKunde(enrichedL);
                        setLoading(false);
                        setLoadProgress('');
                        navigateTo('analyseConfig');
                        return;
                    } catch (err) {
                        console.error('Ordner laden:', err);
                        setLoadProgress('Fehler: ' + err.message);
                    }
                    setLoading(false);
                }
            };

            // ═══ ANALYSE: Wird bei Bedarf aufgerufen (z.B. Update oder Nachladen) ═══
            const handleLoadAkteWithConfig = async (config) => {
                var kunde = selectedKunde;
                if (!kunde) {
                    alert('Kein Kunde ausgewählt. Bitte zuerst einen Kunden laden.');
                    return;
                }

                console.log('🤖 handleLoadAkteWithConfig gestartet', { hasDriveId: !!kunde._driveFolderId, kiDisabled: window._kiDisabled, config: config });
                setLoading(true);
                setLoadProgress('🤖 Daten werden aus Google Drive geladen...');

                try {
                    var result;

                    if (kunde._driveFolderId && !window._kiDisabled) {
                        // ═══ KI-PFAD: OrdnerAnalyseEngine mit Gemini (ordner-spezifische Prompts) ═══
                        console.log('🤖 Starte OrdnerAnalyseEngine für', kunde.name, 'Config:', config);
                        setLoadProgress('🤖 KI-Ordneranalyse wird gestartet...');

                        // Ordner-Filter anwenden: nur ausgewaehlte Ordner an Engine uebergeben
                        var kundeForAnalysis = Object.assign({}, kunde);
                        if (config.mode === 'ordner' && config.selectedFolders && config.selectedFolders.length > 0) {
                            kundeForAnalysis.folders = (kunde.folders || []).filter(function(f) {
                                return config.selectedFolders.indexOf(f.name) >= 0;
                            });
                            console.log('🔍 Gefilterte Ordner:', kundeForAnalysis.folders.map(function(f) { return f.name; }));
                        }
                        if (!config.includeRootFiles) {
                            kundeForAnalysis.files = [];
                        }

                        var analyseResult = await window.OrdnerAnalyseEngine.analyzeKundeForApp(
                            kundeForAnalysis,
                            function(p) {
                                if (p && p.message) setLoadProgress('🤖 ' + p.message);
                                else if (typeof p === 'string') setLoadProgress('🤖 ' + p);
                            }
                        );
                        setOrdnerAnalyseMeta(analyseResult.meta || null);

                        // Ergebnis in FileProcessor-kompatibles Format konvertieren
                        result = {
                            positionen: analyseResult.positionen || [],
                            kundendaten: analyseResult.kundendaten || {},
                            raeume: analyseResult.raeume || [],
                            zeichnungen: analyseResult.zeichnungen || [],
                            quellenInfo: analyseResult.quelldokumente || [],
                            vertrag: analyseResult.vertrag || {},
                            quelle: 'ordneranalyse',
                            _ordnerAnalysen: analyseResult._ordnerAnalysen || {},
                        };
                        console.log('✅ OrdnerAnalyse abgeschlossen:', (result.positionen || []).length, 'Positionen,', Object.keys(analyseResult._ordnerAnalysen || {}).length, 'Ordner analysiert');

                    } else if (kunde._driveFolderId) {
                        // ═══ FALLBACK: FileProcessor ohne KI (nur Regex/Offline) ═══
                        console.log('📥 Starte FileProcessor (ohne KI) für', kunde.name);
                        result = await window.FileProcessor.processKundenAkte(
                            kunde,
                            function(msg) { setLoadProgress('📥 ' + msg); },
                            config
                        );
                        console.log('✅ FileProcessor abgeschlossen:', (result.positionen || []).length, 'Positionen');
                    } else {
                        console.warn('⚠️ Kein Drive-Ordner -- keine Analyse möglich');
                        result = { positionen: [], kundendaten: {}, raeume: [], zeichnungen: [], quellenInfo: [], vertrag: {} };
                    }

                    // KI-Status beibehalten (wird vom aufrufenden Button gesteuert)
                    // window._kiDisabled bleibt wie vom Caller gesetzt

                    // Positionen in LV_POSITIONEN injizieren
                    if (result.positionen && result.positionen.length > 0) {
                        var kundeKey = kunde._driveFolderId || kunde.id || 'drive_import';
                        LV_POSITIONEN[kundeKey] = result.positionen;
                    }

                    // Kundendaten + Raeume + Zeichnungen in Kunde mergen
                    var kd = result.kundendaten || {};
                    var vt = result.vertrag || kd.vertrag || {};
                    var fullyLoaded = Object.assign({}, kunde, {
                        auftraggeber: kd.auftraggeber || kunde.auftraggeber || kunde.name,
                        adresse: kd.adresse || kd.baumassnahme || kunde.adresse || '',
                        baumassnahme: kd.baumassnahme || '',
                        bauleitung: kd.bauleitung || '',
                        bl_adresse: kd.bl_adresse || '',
                        bl_telefon: kd.bl_telefon || '',
                        bl_fax: kd.bl_fax || '',
                        bl_email: kd.bl_email || '',
                        architekt: kd.architekt || '',
                        arch_adresse: kd.arch_adresse || '',
                        arch_telefon: kd.arch_telefon || '',
                        arch_fax: kd.arch_fax || '',
                        arch_email: kd.arch_email || '',
                        ag_adresse: kd.ag_adresse || kd.adresse || '',
                        ag_telefon: kd.ag_telefon || '',
                        ag_fax: kd.ag_fax || '',
                        ag_email: kd.ag_email || '',
                        vertrag: vt,
                        raeume: (result.raeume || []).map(function(r, idx) {
                            if (typeof r === 'string') {
                                return {
                                    id: 'import_' + idx, nr: String(idx + 1), bez: r,
                                    geschoss: (r.match(/EG|OG|KG|DG|UG/i) || [''])[0].toUpperCase(),
                                    fliesenhoehe: 0, raumhoehe: 0,
                                    waende: [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}]
                                };
                            }
                            return Object.assign({ id: 'import_' + idx }, r, { nr: r.nr || String(idx + 1) });
                        }),
                        zeichnungen: result.zeichnungen || [],
                        _importResult: result,
                        _lvPositionenKey: kunde._driveFolderId || kunde.id,
                        _fullyLoaded: true,
                        _analyseConfig: config,
                    });
                    setSelectedKunde(fullyLoaded);
                    setImportResult(result);

                    // ═══ LOKAL SPEICHERN ═══
                    try {
                        var localKey = 'aufmass_kunde_' + (kunde._driveFolderId || kunde.id || kunde.name || 'unknown');
                        var toSave = Object.assign({}, fullyLoaded);
                        delete toSave.folders;
                        delete toSave.files;
                        toSave._lvPositionen = result.positionen || [];
                        toSave._gespeichertAm = new Date().toLocaleString('de-DE');
                        localStorage.setItem(localKey, JSON.stringify(toSave));
                        console.log('Kundendaten lokal gespeichert:', localKey);
                    } catch(saveErr) {
                        console.warn('Lokales Speichern fehlgeschlagen:', saveErr.message);
                    }

                    // IndexedDB Persistenz
                    if (window.TWStorage && window.TWStorage.isReady()) {
                        var kid2 = kunde._driveFolderId || kunde.id || kunde.name;
                        TWStorage.saveKunde(fullyLoaded).catch(function(){});
                        if (result) TWStorage.put('driveCache', { id: 'importResult_' + kid2, type: 'importResult', data: result, updatedAt: new Date().toISOString() }).catch(function(){});
                        if (result.positionen) TWStorage.saveGesamtliste(kid2, result.positionen).catch(function(){});
                        TWStorage.saveAppState('lastKundeId', kid2);

                        // Drive-Sync: Ordnerstruktur + Dateien im Hintergrund herunterladen
                        if (kunde._driveFolderId) {
                            TWStorage.DriveSync.syncKundenOrdner(kid2, kunde._driveFolderId, function(info) {
                                console.log('[DriveSync] ' + info.message);
                            }).catch(function(e) { console.warn('[DriveSync]', e.message); });
                        }
                    }
                    // NICHT mehr navigateTo('geladen') -- bleiben auf analyseConfig!

                } catch (err) {
                    console.error('Analyse Fehler:', err);
                    setLoadProgress('❌ Fehler: ' + err.message);
                }
                setLoading(false);
            };

            const handleLoadAkte = async () => {
                // ═══ Daten wurden bereits in handleSelectKunde geladen! ═══
                if (selectedKunde && selectedKunde._fullyLoaded) {
                    navigateTo('geladen');
                    return;
                }

                // ═══ DEMO-MODUS oder Daten noch nicht geladen ═══
                setLoading(true);
                if (!isDriveMode) {
                    setLoadProgress('Daten werden geladen...');
                    await new Promise(function(resolve) { setTimeout(resolve, 300); });
                } else if (selectedKunde && selectedKunde._driveFolderId && !selectedKunde._fullyLoaded) {
                    // Sicherheits-Fallback: FileProcessor nachladen
                    setLoadProgress('🤖 KI-Analyse wird nachgeladen...');
                    try {
                        var result = await window.FileProcessor.processKundenAkte(
                            selectedKunde,
                            function(msg) { setLoadProgress('🤖 ' + msg); }
                        );
                        if (result.positionen && result.positionen.length > 0) {
                            var kundeKey = selectedKunde._driveFolderId || selectedKunde.id;
                            LV_POSITIONEN[kundeKey] = result.positionen;
                        }
                        var kd = result.kundendaten || {};
                        var updatedKunde = Object.assign({}, selectedKunde, {
                            auftraggeber: kd.auftraggeber || selectedKunde.auftraggeber || selectedKunde.name,
                            adresse: kd.adresse || kd.baumassnahme || selectedKunde.adresse || '',
                            bauleitung: kd.bauleitung || selectedKunde.bauleitung || '',
                            bl_telefon: kd.bl_telefon || '', bl_email: kd.bl_email || '',
                            architekt: kd.architekt || selectedKunde.architekt || '',
                            arch_telefon: kd.arch_telefon || '', arch_email: kd.arch_email || '',
                            ag_adresse: kd.ag_adresse || '', ag_telefon: kd.ag_telefon || kd.auftraggeber_telefon || '', ag_email: kd.ag_email || kd.auftraggeber_email || '',
                            auftraggeber_strasse: kd.auftraggeber_strasse || selectedKunde.auftraggeber_strasse || '',
                            auftraggeber_plzOrt: kd.auftraggeber_plzOrt || selectedKunde.auftraggeber_plzOrt || '',
                            auftraggeber_ansprechpartner: kd.auftraggeber_ansprechpartner || selectedKunde.auftraggeber_ansprechpartner || '',
                            raeume: (result.raeume || []).map(function(r, idx) {
                                if (typeof r === 'string') return { id: 'import_' + idx, nr: String(idx+1), bez: r, geschoss: '', fliesenhoehe: 0, raumhoehe: 0, waende: [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}] };
                                return Object.assign({ id: 'import_' + idx }, r, { nr: r.nr || String(idx+1) });
                            }),
                            zeichnungen: result.zeichnungen || [],
                            _importResult: result,
                            _lvPositionenKey: selectedKunde._driveFolderId || selectedKunde.id,
                            _fullyLoaded: true,
                        });
                        setSelectedKunde(updatedKunde);
                        setImportResult(result);
                    } catch (err) {
                        console.error('Nachladen fehlgeschlagen:', err);
                        setImportResult({ fehler: [{ datei: 'Import', fehler: err.message }], positionen: [], quellenInfo: [] });
                    }
                }
                setLoading(false);
                navigateTo('geladen');
            };

            const handleStartAufmass = () => {
                setGesamtliste([]);
                setFertigeRaeume([]);
                setLastRaumData(null);
                setAufmassGespeichert(false);
                navigateTo('raumerkennung');
            };

            const handleSelectRaum = (raum, positions) => {
                setSelectedRaum(raum);
                setSelectedPositions(positions || []);
                navigateTo('raumblatt');
            };

            const handleFinishRaum = (raumNr, roomResult) => {
                if (raumNr) setFertigeRaeume(prev => [...prev, raumNr]);

                // Gesamtliste: Raum mit allen Positionen und Ergebnissen speichern
                if ((roomResult && roomResult.positionen)) {
                    setGesamtliste(prev => [...prev, {
                        raumName: roomResult.raumName || raumNr || 'Raum',
                        raumNr: raumNr || '',
                        positionen: roomResult.positionen,
                        raumState: roomResult.raumState || null,
                        timestamp: new Date().toISOString()
                    }]);
                }

                // ═══ ALLE Einstellungen fuer naechsten Raum uebernehmen ═══
                const m = (roomResult && roomResult.masse) || {};
                const rState = (roomResult && roomResult.raumState) || {};
                // Wandmasse: aus raumState.wandMasse ODER aus masse.laenge/breite aufbauen
                var savedWaende = (rState.wandMasse || []).map(function(w) { return { id: w.id, l: w.l }; });
                // Pruefe ob Waende TATSAeCHLICH Werte haben (nicht nur leere Eintraege)
                var waendeHaveValues = savedWaende.some(function(w) { return w.l && parseMass(w.l) > 0; });
                // WENN wandMasse leer/ohne Werte ABER Laenge/Breite vorhanden → 4 Waende generieren
                if (!waendeHaveValues && (m.laenge || m.breite)) {
                    savedWaende = [
                        { id: 'A', l: m.laenge || '' },
                        { id: 'B', l: m.breite || '' },
                        { id: 'C', l: m.laenge || '' },
                        { id: 'D', l: m.breite || '' }
                    ];
                }
                setLastRaumData({
                    // ── Hoehen aus dem Raumblatt ──
                    hoehe: parseMass(m.hoehe) || (selectedRaum && selectedRaum.fliesenhoehe) || 0,
                    raumhoehe: parseMass(m.raumhoehe) || (selectedRaum && selectedRaum.raumhoehe) || 0,
                    abdichtungshoehe: parseMass(m.abdichtungshoehe) || 0,
                    sockelhoehe: parseMass(m.sockelhoehe) || 0,
                    // ── Waende (KRITISCH fuer Baugleich-Raum!) ──
                    waende: savedWaende,
                    // ── Komplette Masse (fuer Laenge/Breite Uebernahme) ──
                    masse: { laenge: m.laenge || '', breite: m.breite || '', hoehe: m.hoehe || '', raumhoehe: m.raumhoehe || '', abdichtungshoehe: m.abdichtungshoehe || '', sockelhoehe: m.sockelhoehe || '', bodenManual: m.bodenManual || '' },
                    // ── Abzuege/Einbauten fuer Baugleich ──
                    abzuege: ((roomResult && roomResult.raumState) && (roomResult && roomResult.raumState).abzuege) || [],
                    material: (selectedRaum && selectedRaum.material) || '',
                    // ── Schalter (Toggle-States) ──
                    fliesenUmlaufend: (roomResult && roomResult.fliesenUmlaufend) !== undefined ? roomResult.fliesenUmlaufend : true,
                    abdichtungUmlaufend: (roomResult && roomResult.abdichtungUmlaufend) !== undefined ? roomResult.abdichtungUmlaufend : true,
                    fliesenDeckenhoch: (roomResult && roomResult.fliesenDeckenhoch) || false,
                    abdichtungDeckenhoch: (roomResult && roomResult.abdichtungDeckenhoch) || false,
                    bodenPlusTuerlaibung: (roomResult && roomResult.bodenPlusTuerlaibung) || false,
                    // ── Tuer/Fenster/Sonstige-Defaults (Schalter fuer Laibungen, Gefliest, Abgedichtet) ──
                    tuerDefaults: (roomResult && roomResult.tuerDefaults) || null,
                    fensterDefaults: (roomResult && roomResult.fensterDefaults) || null,
                    sonstigeDefaults: (roomResult && roomResult.sonstigeDefaults) || null,
                    // ── Komplette Eintraege fuer Vorladung im naechsten Raum ──
                    tuerenEntries: (roomResult && roomResult.tuerenEntries) || null,
                    fensterEntries: (roomResult && roomResult.fensterEntries) || null,
                    // ── PosCards mit manuellen Eingaben (Stueck, manuelle Mengen etc.) ──
                    posCardsData: (roomResult && roomResult.raumState && roomResult.raumState.posCards) || null,
                    // ── Positionen (welche LV-Positionen sind aktiv) ──
                    positionen: selectedPositions || [],
                    // ── Meta ──
                    geschoss: (selectedRaum && selectedRaum.geschoss) || '',
                    timestamp: new Date().toISOString()
                });

                navigateTo('raumerkennung');
            };

            const handleAufmassBeenden = () => {
                setAufmassGespeichert(true);
                setShowGesamtliste(false);
                setRechnungsVorwahl('aufmass');
                navigateTo('rechnung');
            };

            // ═══ Raum aus Gesamtliste wieder bearbeiten ═══
            const handleOpenRoomFromGesamtliste = (roomIdx, room) => {
                if (!room.raumState) {
                    alert('⚠ Raumdaten nicht vollständig gespeichert. Raum kann nicht erneut geöffnet werden.');
                    return;
                }
                // Raum aus Gesamtliste entfernen (wird nach Fertigstellung neu hinzugefuegt)
                setGesamtliste(prev => prev.filter((_, i) => i !== roomIdx));
                // Aus fertigeRaeume entfernen, damit er wieder bearbeitbar ist
                if (room.raumNr) setFertigeRaeume(prev => prev.filter(nr => nr !== room.raumNr));
                // Raum-Objekt mit gespeichertem State aufbauen
                const reEditRaum = {
                    nr: room.raumNr || room.raumName,
                    name: room.raumName,
                    reEditState: room.raumState,
                    // Basis-Zeichnungsdaten (falls vorhanden) beibehalten
                    waende: (room.raumState.wandMasse && room.raumState.wandMasse.length) > 4 ? room.raumState.wandMasse.map((w,i) => ({id:i, l: parseMass(w.l)})) : [],
                    fliesenhoehe: parseMass((room.raumState.masse && room.raumState.masse.hoehe)) || 0,
                    raumhoehe: parseMass((room.raumState.masse && room.raumState.masse.raumhoehe)) || 0,
                    abdichtungshoehe: parseMass((room.raumState.masse && room.raumState.masse.abdichtungshoehe)) || 0,
                };
                setSelectedRaum(reEditRaum);
                setSelectedPositions(room.raumState.posCards || []);
                setShowGesamtliste(false);
                setAufmassGespeichert(false);
                navigateTo('raumblatt');
            };

            const handleBackToRaumerkennung = () => {
                navigateTo('raumerkennung');
            };

            /* ══════════════════════════════════════════════════
               AKTE & SPEICHERN — Bearbeitungsstand (WIP)
               ══════════════════════════════════════════════════ */

            // ══════════════════════════════════════════════════════════
            // ZENTRALE SPEICHER-FUNKTION (leise, ohne Popups)
            //
            // Sammelt den aktuellen Zustand des aktiven Moduls und
            // schreibt ihn via TWStorage.saveWip in die lokale IndexedDB.
            // Wird sowohl vom alten Akten-Opener (manuell) als auch vom
            // AutoSaveManager (automatisch via Debounce + Visibility)
            // aufgerufen.
            // ══════════════════════════════════════════════════════════
            var _collectAndSaveWip = function(opts) {
                if (!selectedKunde) return Promise.resolve(null);
                var kundeId = selectedKunde._driveFolderId || selectedKunde.id || selectedKunde.name;
                var modulName = PAGE_TO_MODUL[page];
                if (!modulName) return Promise.resolve(null);
                if (!window.TWStorage || !window.TWStorage.isReady()) return Promise.resolve(null);

                // State vom aktiven Modul einsammeln via Event-Bus
                var stateData = null;
                if (window.TW && window.TW.emit) {
                    TW.emit('wip:collectState', {
                        modulName: modulName,
                        callback: function(data) { stateData = data; }
                    });
                }

                // Fallback: Basis-Daten aus App-State
                if (!stateData) {
                    stateData = {
                        moduleState: {
                            gesamtliste: gesamtliste || [],
                            importResult: importResult || null,
                            fertigeRaeume: fertigeRaeume || [],
                            selectedPositions: selectedPositions || [],
                            aufmassGespeichert: aufmassGespeichert,
                            lastPage: page
                        },
                        meta: {
                            beschreibung: (MODUL_LABELS[modulName] || modulName) + ' (Auto-Save)',
                            icon: MODUL_ICONS[modulName] || '\uD83D\uDCBE',
                            autoSaved: true
                        }
                    };
                }

                // ETAPPE 4: Manueller Snapshot mit benanntem Label -- ueberschreibt beschreibung/meta
                if (opts && opts.customLabel) {
                    stateData.meta = Object.assign({}, stateData.meta, {
                        beschreibung: opts.customLabel,
                        autoSaved: false,
                        manuellGespeichert: true,
                        manuellTs: Date.now()
                    });
                }

                return TWStorage.saveWip(kundeId, modulName, stateData.moduleState, page, stateData.meta);
            };

            // AutoSaveManager mit dieser Funktion verdrahten
            // KRITISCHER FIX (25.04.2026): Vorher OHNE Dep-Array — bei JEDEM Render
            // wurde eine neue Closure mit allen App-States in den AutoSaveManager
            // geschrieben. Heap-waechst-pro-Sekunde (~25 MB/s im Aufmass-Modul).
            // Loesung: setSaveFunction nur EINMAL registrieren, Aufruf geht ueber
            // Ref auf die aktuelle _collectAndSaveWip-Funktion.
            const collectSaveRef = useRef();
            collectSaveRef.current = _collectAndSaveWip;
            useEffect(function() {
                if (window.TW && window.TW.AutoSave) {
                    window.TW.AutoSave.setSaveFunction(function(payload) {
                        var fn = collectSaveRef.current;
                        return fn ? fn() : Promise.resolve(null);
                    });
                }
            }, []);  // ← nur einmal beim Mount

            // Auto-Save-Trigger: Bei JEDER relevanten State-Aenderung wird
            // der Debounce-Timer neu gestartet (nach 1.5 s Ruhe wird gespeichert).
            useEffect(function() {
                if (!selectedKunde) return;
                var modulName = PAGE_TO_MODUL[page];
                if (!modulName) return;
                if (!window.TW || !window.TW.AutoSave) return;
                window.TW.AutoSave.markDirty({ ts: Date.now() });
            }, [gesamtliste, importResult, fertigeRaeume, selectedPositions, aufmassGespeichert, selectedKunde, page]);

            // ── "Speichern"-Handler (manueller Trigger — falls doch jemand klickt) ──
            // Der rote Button ist entfernt, aber der Handler bleibt fuer
            // andere Module (z.B. Akten-Dialog) verfuegbar. Keine Popups mehr.
            window._akteSpeichernHandler = function() {
                return _collectAndSaveWip();
            };

            // ETAPPE 4: Manueller Snapshot-Handler mit benanntem Label
            // Wird vom globalen "Bearbeiten"-Dropdown (Speichern-Eintrag) aufgerufen.
            window._manuellSpeichernHandler = function(customLabel) {
                return _collectAndSaveWip({ customLabel: customLabel });
            };

            // ── "Akte"-Button Handler ──
            window._akteOeffnenHandler = function() {
                if (!selectedKunde) { alert('Bitte zuerst einen Kunden w\u00e4hlen.'); return; }
                var kundeId = selectedKunde._driveFolderId || selectedKunde.id || selectedKunde.name;
                if (!window.TWStorage || !window.TWStorage.isReady()) { alert('Speicher nicht bereit.'); return; }

                Promise.all([
                    TWStorage.listWips(kundeId),
                    TWStorage.loadAppDateien(kundeId)
                ]).then(function(results) {
                    setAkteData({ wips: results[0] || [], appDateien: results[1] || [] });
                    setShowAkteModal(true);
                }).catch(function(err) {
                    console.warn('Akte laden:', err);
                    setAkteData({ wips: [], appDateien: [] });
                    setShowAkteModal(true);
                });
            };

            // ── Storage-Health-Dashboard Handler ──
            // (Punkt 6 aus Architektur-Plan, 25.04.2026)
            // Aufruf von ueberall: window._openStorageHealth()
            window._openStorageHealth = function() {
                setShowStorageHealth(true);
            };

            // ── WIP wiederherstellen (aus Akte heraus) ──
            // WICHTIG: listWips() liefert aus Performance-Gruenden NUR Metadaten
            // ohne moduleState. Daher muss hier erst der volle Record nachgeladen
            // werden, bevor der State wiederhergestellt werden kann.
            var handleWipRestore = function(wipMeta) {
                if (!wipMeta || !wipMeta.modulName) return;
                if (!selectedKunde) return;
                if (!window.TWStorage || !window.TWStorage.isReady()) return;
                var kundeId = selectedKunde._driveFolderId || selectedKunde.id || selectedKunde.name;

                // Modal sofort schliessen + Auto-Save fuer den Restore-Moment unterdruecken
                setShowAkteModal(false);
                if (window.TW && window.TW.AutoSave) {
                    window.TW.AutoSave.suppress(true);
                    setTimeout(function(){ if (window.TW && window.TW.AutoSave) window.TW.AutoSave.suppress(false); }, 1500);
                }

                TWStorage.loadWip(kundeId, wipMeta.modulName).then(function(wip) {
                    if (!wip || !wip.moduleState) {
                        alert('Der gespeicherte Stand konnte nicht geladen werden.');
                        return;
                    }
                    var targetPage = wip.page || MODUL_PAGES[wip.modulName] || 'modulwahl';

                    // Aufmass-spezifisch: Basis-State wiederherstellen
                    if (wip.modulName === 'aufmass' && wip.moduleState) {
                        if (wip.moduleState.gesamtliste) setGesamtliste(wip.moduleState.gesamtliste);
                        if (wip.moduleState.fertigeRaeume) setFertigeRaeume(wip.moduleState.fertigeRaeume);
                        if (wip.moduleState.selectedPositions) setSelectedPositions(wip.moduleState.selectedPositions);
                        if (wip.moduleState.aufmassGespeichert) setAufmassGespeichert(wip.moduleState.aufmassGespeichert);
                    }

                    navigateTo(targetPage);

                    // Nach Navigation: WIP-State ins Modul injizieren via Event-Bus
                    setTimeout(function() {
                        if (window.TW && window.TW.emit) {
                            TW.emit('wip:restoreState', {
                                modulName: wip.modulName,
                                moduleState: wip.moduleState
                            });
                        }
                    }, 300);
                }).catch(function(err) {
                    console.warn('[Akte] WIP laden fehlgeschlagen:', err);
                    alert('Der gespeicherte Stand konnte nicht geladen werden: ' + (err.message || 'Unbekannter Fehler'));
                });
            };

            // ══════════════════════════════════════════════════════════
            // AUTO-WIEDERHERSTELLUNG beim Kundenwechsel
            // ══════════════════════════════════════════════════════════
            // Sobald ein Kunde ausgewaehlt wird, pruefen wir still, ob es
            // einen unbeendeten Bearbeitungsstand gibt. Wenn ja, wird er
            // automatisch wiederhergestellt — ohne Popup, ohne Nachfrage.
            // Der Benutzer landet exakt auf der Seite, wo er zuletzt war,
            // mit allen eingegebenen Daten. Waehrend des Restores wird der
            // Auto-Save kurz unterdrueckt, damit keine Endlosschleife
            // entsteht.
            // ══════════════════════════════════════════════════════════
            const [autoRestoreToast, setAutoRestoreToast] = useState(null);
            const _lastRestoredKundeId = React.useRef(null);

            useEffect(function() {
                if (!selectedKunde) return;
                var kundeId = selectedKunde._driveFolderId || selectedKunde.id || selectedKunde.name;
                if (!kundeId) return;
                if (_lastRestoredKundeId.current === kundeId) return; // schon geprueft
                if (!window.TWStorage || !window.TWStorage.isReady()) return;

                _lastRestoredKundeId.current = kundeId;

                TWStorage.listWips(kundeId).then(function(wips) {
                    if (!wips || wips.length === 0) return;
                    // Neuesten WIP nehmen (listWips sortiert bereits absteigend)
                    var latest = wips[0];
                    if (!latest || !latest.id) return;
                    // Vollstaendigen WIP-Datensatz mit moduleState laden
                    return TWStorage.loadWip(kundeId, latest.modulName).then(function(wip) {
                        if (!wip || !wip.moduleState) return;
                        // Waehrend des Restores Auto-Save unterdruecken
                        if (window.TW && window.TW.AutoSave) {
                            window.TW.AutoSave.suppress(true);
                            setTimeout(function() {
                                window.TW.AutoSave.suppress(false);
                            }, 2000);
                        }
                        handleWipRestore(wip);
                        // Freundlicher Hinweis
                        var savedDate = new Date(latest.savedAt);
                        var dStr = savedDate.toLocaleString('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
                        setAutoRestoreToast('Letzter Bearbeitungsstand vom ' + dStr + ' wiederhergestellt');
                        setTimeout(function() { setAutoRestoreToast(null); }, 5000);
                    });
                }).catch(function(e) {
                    console.warn('[Auto-Restore] Fehler:', e);
                });
            }, [selectedKunde]);

            // ══════════════════════════════════════════════════════════
            // PHASE 2: AUTO-DRIVE-SYNC FUER FOTOS
            // ══════════════════════════════════════════════════════════
            // Sobald Internet da ist UND ein Kunde aktiv ist UND Google
            // Drive verbunden ist, werden alle noch nicht hochgeladenen
            // Fotos des Kunden im Hintergrund nach Drive synchronisiert.
            // Ausgeloest wird das durch drei Trigger:
            //   1. Beim Kundenwechsel (nach Auto-Wiederherstellung)
            //   2. Beim Online-Event (vom offline->online Wechsel)
            //   3. Periodisch alle 3 Minuten, solange Kunde offen ist
            // ══════════════════════════════════════════════════════════
            const [fotoSyncStatus, setFotoSyncStatus] = useState(null);

            // ETAPPE 7: Modul-spezifische Bearbeiten-Dropdown-Eintraege.
            // Module (z.B. Raumerkennung, Raumblatt) registrieren beim Mount ihre
            // Aktionen via window._setModuleActions(arr) ODER window._registerSeitenAktionen(seite, arr).
            // Das globale Bearbeiten-Dropdown nimmt sie mit auf.
            const [moduleActions, setModuleActions] = useState([]);
            // Aktuell registrierte Seite (fuer korrektes Unregister)
            const moduleActionsSeiteRef = useRef(null);
            useEffect(function() {
                // Altes Pattern: direktes Array setzen
                window._setModuleActions = function(arr) {
                    moduleActionsSeiteRef.current = null;
                    setModuleActions(Array.isArray(arr) ? arr : []);
                };
                // Neues Pattern (Etappe 8): Seiten-spezifische Aktionen mit type:'submenu' Support
                window._registerSeitenAktionen = function(seite, aktionen) {
                    moduleActionsSeiteRef.current = seite || null;
                    setModuleActions(Array.isArray(aktionen) ? aktionen : []);
                };
                // Cleanup beim Modulwechsel: Nur entfernen wenn die aufrufende Seite noch registriert ist
                // (verhindert dass ein neu gemountetes Modul sein gerade registriertes Dropdown sofort wieder leert)
                window._unregisterSeitenAktionen = function(seite) {
                    if (!seite || moduleActionsSeiteRef.current === seite) {
                        moduleActionsSeiteRef.current = null;
                        setModuleActions([]);
                    }
                };
                // Primaer-Aktion (gruener Button rechts) -- fuer spaetere Verwendung reserviert
                window._registerPrimaerAktion = function(seite, aktion) {
                    // Aktuell noch nicht als separater Button umgesetzt -- ignorieren
                };
                window._unregisterPrimaerAktion = function(seite) {
                    // Counterpart zum Register -- aktuell no-op
                };
                return function() {
                    window._setModuleActions = null;
                    window._registerSeitenAktionen = null;
                    window._unregisterSeitenAktionen = null;
                    window._registerPrimaerAktion = null;
                    window._unregisterPrimaerAktion = null;
                };
            }, []);

            // ══════════════════════════════════════════════════════════
            // GLOBALER DRINGLICHKEITS-ALARM (Baustellen-App Nachrichten)
            // Hoert auf ALLE Chats und triggert Sound + Notification wenn
            // eine neue dringende MA-Nachricht eingeht.
            //
            // Logik:
            //   - Referenz-Timestamp im localStorage ('tw_dringend_seen_ts')
            //   - Nur Nachrichten mit timestamp > seen_ts + dringend + von 'ma' + !gelesen alarmen
            //   - Bei Alarm: Sound (Web Audio API), Browser-Notification, Toast
            //   - seen_ts wird nach jedem Scan aktualisiert
            //   - Wartet bis Firebase verfuegbar ist (polling, max. 60s)
            // ══════════════════════════════════════════════════════════
            useEffect(function() {
                // DEBUG: via URL ?noAlarm=1 abschaltbar
                if (window.__twDebugFlags && window.__twDebugFlags.noAlarm) {
                    console.log('[TW] Alarm-Listener deaktiviert (Debug-Flag)');
                    return;
                }
                var unsubAlarm = null;
                var pollTimer = null;
                var pollCount = 0;
                var audioCtx = null;

                // Web Audio API: kurzer Alarm-Beep ohne externe Datei
                var playAlarmSound = function() {
                    try {
                        if (!audioCtx) {
                            var AC = window.AudioContext || window.webkitAudioContext;
                            if (!AC) return;
                            audioCtx = new AC();
                        }
                        if (audioCtx.state === 'suspended') { try { audioCtx.resume(); } catch(e) {} }
                        // Drei schnelle Pieptoene (880Hz -> 988Hz -> 1175Hz) fuer klares Alarm-Muster
                        var now = audioCtx.currentTime;
                        [[880, 0.00], [988, 0.15], [1175, 0.30]].forEach(function(pair) {
                            var osc = audioCtx.createOscillator();
                            var gain = audioCtx.createGain();
                            osc.type = 'sine';
                            osc.frequency.value = pair[0];
                            gain.gain.setValueAtTime(0.0001, now + pair[1]);
                            gain.gain.exponentialRampToValueAtTime(0.25, now + pair[1] + 0.02);
                            gain.gain.exponentialRampToValueAtTime(0.0001, now + pair[1] + 0.13);
                            osc.connect(gain); gain.connect(audioCtx.destination);
                            osc.start(now + pair[1]);
                            osc.stop(now + pair[1] + 0.14);
                        });
                    } catch(e) { console.warn('Alarm-Sound Fehler:', e); }
                };

                // Browser-Notification (falls erlaubt)
                var showNotification = function(absenderName, text) {
                    try {
                        if (!('Notification' in window)) return;
                        if (Notification.permission === 'granted') {
                            new Notification('🔔 Dringende Nachricht von ' + (absenderName || 'Mitarbeiter'), {
                                body: (text || '').substring(0, 140),
                                tag: 'tw-dringend',
                                requireInteraction: true
                            });
                        } else if (Notification.permission !== 'denied') {
                            Notification.requestPermission();
                        }
                    } catch(e) {}
                };

                var handleChatData = function(data) {
                    if (!data) return;
                    var seenTs = parseInt(localStorage.getItem('tw_dringend_seen_ts') || '0', 10) || 0;
                    var maxTs = seenTs;
                    var neueDringende = [];
                    for (var maId in data) {
                        if (!data.hasOwnProperty(maId)) continue;
                        var thread = data[maId];
                        for (var nk in thread) {
                            if (!thread.hasOwnProperty(nk)) continue;
                            var n = thread[nk];
                            if (!n || !n.timestamp) continue;
                            if (n.timestamp > maxTs) maxTs = n.timestamp;
                            if (n.dringend && n.von === 'ma' && !n.gelesen && n.timestamp > seenTs) {
                                neueDringende.push({ maId: maId, nachricht: n });
                            }
                        }
                    }
                    if (neueDringende.length > 0) {
                        var erste = neueDringende[0];
                        var absender = erste.nachricht.absender_name || erste.nachricht.absender || 'Mitarbeiter';
                        var text = erste.nachricht.text_original || erste.nachricht.text || '';
                        playAlarmSound();
                        showNotification(absender, text);
                        if (window._showToast) {
                            var msg = neueDringende.length === 1
                                ? '🔔 Dringend von ' + absender + ': ' + text.substring(0, 80)
                                : '🔔 ' + neueDringende.length + ' dringende Nachrichten eingegangen';
                            window._showToast(msg, 'error');
                        }
                    }
                    // Scan-Marker aktualisieren, damit derselbe Alarm nicht mehrfach feuert
                    if (maxTs > seenTs) {
                        try { localStorage.setItem('tw_dringend_seen_ts', String(maxTs)); } catch(e) {}
                    }
                };

                var startListener = function() {
                    if (!window.FirebaseService || !window.FirebaseService.db || !window.FirebaseService.subscribeAlleChats) {
                        return false;
                    }
                    try {
                        unsubAlarm = window.FirebaseService.subscribeAlleChats(handleChatData);
                        // Browser-Notification-Permission proaktiv anfragen
                        if ('Notification' in window && Notification.permission === 'default') {
                            Notification.requestPermission();
                        }
                        return true;
                    } catch(e) {
                        console.warn('Alarm-Listener konnte nicht starten:', e);
                        return false;
                    }
                };

                // Sofort probieren, dann alle 2 Sekunden bis Firebase ready (max. 60 Sek.)
                if (!startListener()) {
                    pollTimer = setInterval(function() {
                        pollCount++;
                        if (startListener() || pollCount > 30) {
                            clearInterval(pollTimer);
                            pollTimer = null;
                        }
                    }, 2000);
                }

                return function() {
                    if (unsubAlarm) { try { unsubAlarm(); } catch(e) {} }
                    if (pollTimer) clearInterval(pollTimer);
                    if (audioCtx) { try { audioCtx.close(); } catch(e) {} }
                };
            }, []);

            var _startFotoSync = React.useCallback(function() {
                if (window.__twDebugFlags && window.__twDebugFlags.noSync) return;
                if (!selectedKunde) return;
                if (!navigator.onLine) return;
                if (!window.TWStorage || !window.TWStorage.FotoSync) return;
                if (!window.GoogleDriveService || !window.GoogleDriveService.accessToken) return;
                var kundeId = selectedKunde._driveFolderId || selectedKunde.id || selectedKunde.name;
                var driveOrdnerId = selectedKunde._driveFolderId;
                if (!driveOrdnerId) return; // ohne Kundenordner-ID kein Upload

                // ETAPPE 5: Erst einmalig die flache Bilder-Struktur in Raumblatt-Unterordner migrieren,
                // dann regulaerer Upload-Lauf (der selbst nun in Unterordner uploadet).
                var migrateFn = window.TWStorage.FotoSync.migrateAltFotos;
                var runSync = function() {
                    return window.TWStorage.FotoSync.syncKunde(kundeId, driveOrdnerId);
                };
                var pre = migrateFn
                    ? migrateFn(kundeId, driveOrdnerId).catch(function(e) {
                        console.warn('[FotoMigration] Lauf uebersprungen:', e.message);
                    })
                    : Promise.resolve();
                pre.then(runSync).catch(function(e) {
                    console.warn('[FotoSync] Lauf abgebrochen:', e.message);
                });
            }, [selectedKunde]);

            // Progress-Subscription (setzt den Status fuer den UI-Indikator)
            useEffect(function() {
                if (!window.TWStorage || !window.TWStorage.FotoSync) return;
                var unsub = window.TWStorage.FotoSync.onProgress(function(info) {
                    if (!info) return;
                    if (info.phase === 'uploading') {
                        setFotoSyncStatus('uploading:' + (info.done || 0) + '/' + (info.total || 0));
                    } else if (info.phase === 'downloading') {
                        setFotoSyncStatus('downloading:' + (info.done || 0) + '/' + (info.total || 0));
                    } else if (info.phase === 'migration-scanning' || info.phase === 'migration-moving') {
                        // ETAPPE 5: Migrations-Status als eigene Anzeige
                        setFotoSyncStatus('migration:' + (info.done || 0) + '/' + (info.total || 0));
                    } else if (info.phase === 'migration-done') {
                        if ((info.moved || 0) > 0) {
                            setFotoSyncStatus('migration-done:' + info.moved);
                            if (window._showToast) window._showToast(info.moved + ' Alt-Fotos in Raumblatt-Ordner migriert', 'success');
                            setTimeout(function() { setFotoSyncStatus(null); }, 4000);
                        } else {
                            setFotoSyncStatus(null);
                        }
                    } else if (info.phase === 'done') {
                        var r = info.result || {};
                        if (r.uploaded > 0) {
                            setFotoSyncStatus('done:' + r.uploaded);
                            setTimeout(function() { setFotoSyncStatus(null); }, 4000);
                        } else {
                            setFotoSyncStatus(null);
                        }
                    } else if (info.phase === 'download-done') {
                        if ((info.downloaded || 0) > 0) {
                            setFotoSyncStatus('download-done:' + info.downloaded);
                            setTimeout(function() { setFotoSyncStatus(null); }, 4500);
                        } else {
                            setFotoSyncStatus(null);
                        }
                    } else if (info.phase === 'error' || info.phase === 'migration-error') {
                        setFotoSyncStatus('error');
                        setTimeout(function() { setFotoSyncStatus(null); }, 5000);
                    } else if (info.phase === 'idle') {
                        setFotoSyncStatus(null);
                    }
                });
                return function() { if (unsub) unsub(); };
            }, []);

            // Trigger 1: Beim Kundenwechsel (mit Verzoegerung, damit
            // die Wiederherstellung zuerst laeuft)
            useEffect(function() {
                if (!selectedKunde) return;
                var t = setTimeout(function() { _startFotoSync(); }, 3000);
                return function() { clearTimeout(t); };
            }, [selectedKunde, _startFotoSync]);

            // Trigger 2: Online-Wechsel
            useEffect(function() {
                var onOnline = function() {
                    console.log('[TW] Online erkannt — starte FotoSync');
                    setTimeout(function() { _startFotoSync(); }, 1500);
                };
                window.addEventListener('online', onOnline);
                return function() { window.removeEventListener('online', onOnline); };
            }, [_startFotoSync]);

            // Trigger 3: Periodisch alle 3 Minuten
            useEffect(function() {
                if (!selectedKunde) return;
                var iv = setInterval(function() { _startFotoSync(); }, 3 * 60 * 1000);
                return function() { clearInterval(iv); };
            }, [selectedKunde, _startFotoSync]);

            // ══════════════════════════════════════════════════════════
            // FOTO-DOWNLOAD-SYNC (Multi-Geraete-Szenario)
            // Handy macht Fotos -> Drive. Tablet/PC oeffnet Akte ->
            // diese Funktion zieht fehlende Fotos aus Drive runter.
            // Idempotent: bereits lokale Drive-IDs werden uebersprungen.
            // ══════════════════════════════════════════════════════════
            var _startFotoDownloadSync = React.useCallback(function() {
                if (window.__twDebugFlags && window.__twDebugFlags.noSync) return;
                if (!selectedKunde) return;
                if (!navigator.onLine) return;
                if (!window.TWStorage || !window.TWStorage.FotoSync || !window.TWStorage.FotoSync.downloadMissingFotos) return;
                if (!window.GoogleDriveService || !window.GoogleDriveService.accessToken) return;
                var kundeId = selectedKunde._driveFolderId || selectedKunde.id || selectedKunde.name;
                var driveOrdnerId = selectedKunde._driveFolderId;
                if (!driveOrdnerId) return;
                window.TWStorage.FotoSync.downloadMissingFotos(kundeId, driveOrdnerId).then(function(result) {
                    if (result && result.downloaded > 0) {
                        console.log('[FotoDownloadSync] ' + result.downloaded + ' Foto(s) von Drive geladen.');
                    }
                }).catch(function(e) {
                    console.warn('[FotoDownloadSync] Lauf abgebrochen:', e.message);
                });
            }, [selectedKunde]);

            // Trigger: Beim Kundenwechsel (5s nach Upload-Sync, damit Kollisionen vermieden werden)
            useEffect(function() {
                if (!selectedKunde) return;
                var t = setTimeout(function() { _startFotoDownloadSync(); }, 5000);
                return function() { clearTimeout(t); };
            }, [selectedKunde, _startFotoDownloadSync]);

            // Trigger: Online-Wechsel -> nach Upload noch Download pruefen
            useEffect(function() {
                var onOnline = function() {
                    setTimeout(function() { _startFotoDownloadSync(); }, 4000);
                };
                window.addEventListener('online', onOnline);
                return function() { window.removeEventListener('online', onOnline); };
            }, [_startFotoDownloadSync]);

            // Trigger: Periodisch alle 5 Minuten (versetzt zum Upload-Sync)
            useEffect(function() {
                if (!selectedKunde) return;
                var iv = setInterval(function() { _startFotoDownloadSync(); }, 5 * 60 * 1000);
                return function() { clearInterval(iv); };
            }, [selectedKunde, _startFotoDownloadSync]);

            // ── App-Datei oeffnen (PDF, HTML etc.) ──
            var handleOpenAppDatei = function(dateiId) {
                if (!window.TWStorage) return;
                TWStorage.openAppDatei(dateiId).then(function(result) {
                    if (result && result.url) {
                        window.open(result.url, '_blank');
                        // BLOCK B / FIX B1 — Blob-URL freigeben nach 60s
                        // (Tab ist dann geoeffnet und hat den Blob referenziert).
                        setTimeout(function(){ try{ URL.revokeObjectURL(result.url); }catch(e){} }, 60000);
                    }
                });
            };

            const renderPage = () => {
                switch(page) {
                    case 'start':
                        return <Startseite onKundenauswahl={handleKundenauswahl} onKundeNeu={handleKundeNeu} onKundeAnalysiert={handleKundeAnalysiert} onKundeManuell={handleKundeManuell} onDriveStatusChange={function(status){ setDriveStatus(status); if(status === 'online') setIsDriveMode(true); }} />;
                    case 'kundenModus':
                        return <KundenModusWahl onSelectModus={handleSelectModus} onBack={function(){ navigateTo('start'); }} connections={startConnections} />;
                    case 'manuellEingabe':
                        return <ManuelleEingabe onFertig={handleManuellFertig} onBack={function(){ navigateTo('kundenModus'); }} kunde={selectedKunde} />;
                    case 'auswahl':
                        return <Kundenauswahl onSelect={handleSelectKunde} loading={loading} kunden={isDriveMode ? driveKunden : null} onUpdateKunde={handleUpdateKunde} kundeMode={kundeMode} onBack={function(){ navigateTo('kundenModus'); }} onGoToModulwahl={selectedKunde ? function(){ navigateTo('modulwahl'); } : null} onGoToDaten={selectedKunde ? function(){ navigateTo('datenUebersicht'); } : null} onGoToOrdner={selectedKunde && (selectedKunde._driveFolderId || selectedKunde.id) ? function(){ navigateTo(isDriveMode ? 'ordnerBrowser' : 'lokalOrdnerBrowser'); } : null} />;
                    case 'akte':
                        return <KundenAkte
                            kunde={selectedKunde}
                            onLoad={handleLoadAkte}
                            loading={loading}
                            loadProgress={loadProgress}
                        />;
                    case 'analyseConfig':
                        return <AnalyseKonfiguration
                            kunde={selectedKunde}
                            loading={loading}
                            loadProgress={loadProgress}
                            importResult={importResult}
                            onStart={function(config) {
                                console.log('🔵 KI-Analyse geklickt, Config:', config);
                                try {
                                    window._kiDisabled = false; // KI AKTIV!
                                    window._analyseAbbrechen = false;
                                    setImportResult(null); // Reset Ergebnis
                                    setAnalyseConfig(config);
                                    handleLoadAkteWithConfig(config);
                                } catch(startErr) {
                                    console.error('❌ Analyse-Start Fehler:', startErr);
                                    alert('Fehler beim Start der Analyse:\n' + startErr.message);
                                }
                            }}
                            onDatenLaden={async function(config) {
                                console.log('📥 NUR Daten laden (keine Analyse!), Config:', config);
                                setImportResult(null);
                                setLoading(true);
                                setLoadProgress('📂 Verbinde mit Google Drive...');

                                try {
                                    var kunde = selectedKunde;
                                    if (!kunde || !kunde._driveFolderId) {
                                        alert('Kein Google Drive Ordner vorhanden.');
                                        setLoading(false);
                                        return;
                                    }

                                    // Ordner filtern
                                    var folders = kunde.folders || [];
                                    var sel = config.selectedFolders;
                                    if (config.mode === 'ordner' && sel && sel.length > 0) {
                                        folders = folders.filter(function(f) { return sel.indexOf(f.name) >= 0; });
                                    }

                                    var totalDateien = folders.reduce(function(s, f) { return s + (f.files || []).length; }, 0);
                                    var geladen = 0;
                                    var geladeneDateien = [];

                                    setLoadProgress('📥 ' + totalDateien + ' Dateien in ' + folders.length + ' Ordnern werden heruntergeladen...');

                                    for (var fi = 0; fi < folders.length; fi++) {
                                        var folder = folders[fi];
                                        var files = folder.files || [];
                                        for (var di = 0; di < files.length; di++) {
                                            var file = files[di];
                                            geladen++;
                                            setLoadProgress('📥 ' + geladen + '/' + totalDateien + ': ' + file.name);

                                            try {
                                                // Datei herunterladen
                                                var blob = await window.GoogleDriveService.downloadFile(file.id);
                                                geladeneDateien.push({
                                                    name: file.name,
                                                    type: file.type,
                                                    folder: folder.name,
                                                    size: blob.size,
                                                    blob: blob
                                                });
                                            } catch(dlErr) {
                                                console.warn('Download-Fehler:', file.name, dlErr.message);
                                                geladeneDateien.push({ name: file.name, folder: folder.name, error: dlErr.message });
                                            }
                                        }
                                    }

                                    // Lokal speichern (Metadaten)
                                    var localKey = 'aufmass_kunde_' + (kunde._driveFolderId || kunde.id || 'unknown');
                                    try {
                                        var existingData = {};
                                        try { existingData = JSON.parse(localStorage.getItem(localKey) || '{}'); } catch(e) {}
                                        existingData.name = kunde.name;
                                        existingData._datenGeladen = true;
                                        existingData._datenGeladenAm = new Date().toLocaleString('de-DE');
                                        existingData._geladeneOrdner = folders.map(function(f) { return f.name; });
                                        existingData._geladeneDateien = geladen;
                                        localStorage.setItem(localKey, JSON.stringify(existingData));
                                    } catch(e) { console.warn('Speichern:', e); }

                                    var fehler = geladeneDateien.filter(function(d) { return d.error; }).length;
                                    setLoadProgress('✅ ' + (geladen - fehler) + ' von ' + totalDateien + ' Dateien erfolgreich heruntergeladen!' + (fehler > 0 ? ' (' + fehler + ' Fehler)' : ''));

                                    // Ergebnis setzen (nur Download-Info, keine Analyse)
                                    setImportResult({
                                        positionen: [],
                                        raeume: [],
                                        zeichnungen: [],
                                        quelle: 'nur-download',
                                        quellenInfo: geladeneDateien.map(function(d) { return { datei: d.name, ordner: d.folder, typ: d.error ? 'fehler' : 'geladen' }; }),
                                        _nurDownload: true,
                                        _geladeneDateien: geladen,
                                        _fehler: fehler
                                    });

                                } catch(err) {
                                    console.error('Daten-Laden Fehler:', err);
                                    setLoadProgress('❌ Fehler: ' + err.message);
                                }
                                setLoading(false);
                            }}
                            onAbbrechen={function() {
                                console.log('⛔ Analyse-Abbruch angefordert');
                                window._analyseAbbrechen = true;
                                window._kiDisabled = true;
                            }}
                            onWeiterZuModulen={function() { navigateTo('modulwahl'); }}
                            onBack={function(){ navigateTo('auswahl'); }}
                        />;
                    case 'modulwahl':
                        return <ModulWahl kunde={selectedKunde} onSelectModul={handleSelectModul} ordnerAnalyseMeta={ordnerAnalyseMeta} onDatenBearbeiten={function(){ navigateTo('datenUebersicht'); }} onOrdnerBrowser={function(){ navigateTo(isDriveMode ? 'ordnerBrowser' : 'lokalOrdnerBrowser'); }} />;
                    case 'datenUebersicht':
                        return <DatenUebersicht
                            kunde={selectedKunde}
                            importResult={importResult}
                            onSave={handleDatenUebersichtSave}
                            onBack={function(){ navigateTo('modulwahl'); }}
                            onWeiterZuModulen={function(){ navigateTo('modulwahl'); }}
                            onGoToOrdner={selectedKunde && (selectedKunde._driveFolderId || selectedKunde.id) ? function(){ navigateTo(isDriveMode ? 'ordnerBrowser' : 'lokalOrdnerBrowser'); } : null}
                        />;
                    case 'ordnerBrowser':
                        return <OrdnerBrowser kunde={selectedKunde} onBack={function(){ navigateTo('modulwahl'); }} onGoToDaten={function(){ navigateTo('datenUebersicht'); }} onGoToModulwahl={function(){ navigateTo('modulwahl'); }} />;
                    case 'lokalKundenListe':
                        return <LokaleKundenListe
                            onBack={function(){ navigateTo('kundenModus'); }}
                            onSelectKunde={function(k){
                                // Klick auf lokalen Kunden oeffnet Auswahl-Dialog:
                                // "Normal aufrufen" oder "Aufmass-Vorlage laden".
                                setKundeOpenDialog({ kunde: k });
                            }} />;
                    case 'lokalOrdnerBrowser':
                        return <LokalerOrdnerBrowser
                            kunde={selectedKunde}
                            onBack={function(){ navigateTo(selectedKunde && selectedKunde._fullyLoaded ? 'modulwahl' : 'lokalKundenListe'); }} />;
                    case 'ordnerAnalyse':
                        return <OrdnerAnalyseUebersicht
                            kunde={selectedKunde}
                            onStartAnalyse={handleStartOrdnerAnalyse}
                            onReanalyzeOrdner={handleReanalyzeOrdner}
                            onOpenDetail={function(nr) { setSelectedOrdnerNr(nr); navigateTo('ordnerAnalyseDetail'); }}
                            onBack={function() { navigateTo('modulwahl'); }}
                            refreshKey={ordnerAnalyseMeta ? ordnerAnalyseMeta.abschlussZeitpunkt || '' : ''}
                        />;
                    case 'ordnerAnalyseDetail':
                        return <OrdnerAnalyseDetail
                            kunde={selectedKunde}
                            ordnerNr={selectedOrdnerNr}
                            onBack={function() { navigateTo('ordnerAnalyse'); }}
                            onReanalyze={handleReanalyzeOrdner}
                            refreshKey={ordnerAnalyseMeta ? ordnerAnalyseMeta.abschlussZeitpunkt || '' : ''}
                        />;
                    case 'geladen':
                        return <AkteGeladen kunde={selectedKunde} onStartAufmass={handleStartAufmass} importResult={importResult} onWeiter={function(){ navigateTo('modulwahl'); }} />;
                    case 'raumerkennung':
                        return <Raumerkennung kunde={selectedKunde} onSelectRaum={handleSelectRaum} fertigeRaeume={fertigeRaeume} lastRaumData={lastRaumData} gesamtliste={gesamtliste} onShowGesamtliste={() => setShowGesamtliste(true)} />;
                    case 'raumblatt':
                        return <Raumblatt kunde={selectedKunde} raum={selectedRaum} onFinishRaum={handleFinishRaum} onBack={handleBackToRaumerkennung} selectedPositions={selectedPositions} lastRaumData={lastRaumData} gesamtliste={gesamtliste} onShowGesamtliste={() => setShowGesamtliste(true)} onAufmassBeenden={handleAufmassBeenden} />;
                    case 'rechnung':
                        return <RechnungsModul kunde={selectedKunde} importResult={importResult} gesamtliste={gesamtliste} aufmassGespeichert={aufmassGespeichert} vorwahlTyp={rechnungsVorwahl} onVorwahlUsed={function(){setRechnungsVorwahl(null);}} onBack={() => navigateTo('modulwahl')} />;
                    case 'ausgangsbuch':
                        return <RechnungsAusgangsbuch kunde={selectedKunde} onBack={() => navigateTo('modulwahl')} />;
                    case 'schriftverkehr':
                        return <SchriftverkehrModul kunde={selectedKunde} onBack={() => navigateTo('modulwahl')} />;
                    case 'baustelle':
                        return <BaustellenAppAdmin kunde={selectedKunde} onBack={() => navigateTo('modulwahl')} />;
                    default:
                        return <Startseite onKundenauswahl={handleKundenauswahl} onKundeNeu={handleKundeNeu} onKundeAnalysiert={handleKundeAnalysiert} onKundeManuell={handleKundeManuell} onDriveStatusChange={function(status){ setDriveStatus(status); if(status === 'online') setIsDriveMode(true); }} />;
                }
            };

            // ── Diagnose: Render-Counter pro Komponente ──
            // ── State-Ref fuer den globalen Enter-Handler synchron halten ──
            globalEnterStateRef.current = {
                page: page,
                showAuth: showAuth,
                loading: loading,
                handleKundeNeu: handleKundeNeu,
                handleStartAufmass: handleStartAufmass,
                handleLoadAkte: handleLoadAkte,
                navigateTo: navigateTo
            };

            return (
                <React.Fragment>
                    {/* PHASE-3 (26.04.2026): Auf der Startseite KEIN NavHeader und KEINE
                        globale Toolbar mehr — der schwarze Querbalken hatte das Logo verdeckt
                        (siehe Foto vom 26.04.2026 18:02). Stattdessen schweben die 4 Status-
                        Indikatoren als kompakte Pills oben rechts, ohne den Logo-Bereich zu beruehren. */}
                    {page !== 'start' && (
                        <NavHeader
                            page={page}
                            onBack={goBack}
                            onForward={goForward}
                            canBack={historyIdx > 0}
                            canForward={historyIdx < history.length - 1}
                        />
                    )}

                    {/* Floating Status-Indicators NUR auf der Startseite (oben rechts).
                        AutoSave / FotoSync / Storage / Memory bleiben sichtbar, damit man
                        Sync-Status auch auf der Startseite ueberblickt — ohne breiten Balken. */}
                    {page === 'start' && (
                        <div style={{
                            position:'fixed',
                            top:'10px',
                            right:'10px',
                            display:'flex',
                            alignItems:'center',
                            gap:'6px',
                            padding:'6px 8px',
                            background:'rgba(20,28,40,0.78)',
                            border:'1px solid rgba(255,255,255,0.08)',
                            borderRadius:'14px',
                            backdropFilter:'blur(8px)',
                            zIndex:500,
                            boxShadow:'0 4px 14px rgba(0,0,0,0.35)'
                        }}>
                            <AutoSaveStatusIndicator />
                            <FotoSyncIndicator status={fotoSyncStatus} />
                            <StorageIndicator />
                            <MemoryBadge />
                        </div>
                    )}

                    {/* ETAPPE 7: Die frueheren roten "Aufmass Vorlage speichern/laden"-Buttons
                        sind jetzt als Eintraege im Bearbeiten-Dropdown verfuegbar (nur auf
                        Aufmass-Seiten). Siehe Block direkt darunter. */}

                    {/* ETAPPE 7: Einheitliche Top-Leiste. Aufmass-Vorlage-Buttons sind jetzt
                        als Eintraege im Bearbeiten-Dropdown (nicht mehr als eigene rote Leiste).
                        NavDropdown-Farbe (blau/rot) abhaengig von der aktuellen Seite. */}
                    {page !== 'start' && (
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px', padding:'8px 10px', background:'var(--bg-primary)', borderBottom:'1px solid var(--border-color)', position:'sticky', top:'60px', zIndex:350, flexWrap:'wrap'}}>
                            {/* Linke Gruppe: NavDropdown + ggf. Bearbeiten-Dropdown */}
                            <div style={{display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
                                <NavDropdown
                                    currentMode={(function() {
                                        if (page === 'start') return 'Stadtseite';
                                        if (page === 'kundenModus') return 'Kunden';
                                        if (page === 'auswahl' || page === 'akte' || page === 'analyseConfig') return 'Baustellen';
                                        if (page === 'datenUebersicht') return 'Daten';
                                        if (page === 'ordnerBrowser' || page === 'lokalOrdnerBrowser' || page === 'ordnerAnalyse' || page === 'ordnerAnalyseDetail') return 'Ordner';
                                        if (page === 'modulwahl') return 'Modulauswahl';
                                        if (page === 'raumerkennung') return 'Aufmass';
                                        if (page === 'raumblatt') return 'Raumblatt';
                                        if (page === 'rechnung') return 'Rechnung';
                                        if (page === 'ausgangsbuch') return 'Ausgangsbuch';
                                        if (page === 'schriftverkehr') return 'Schriftverkehr';
                                        if (page === 'baustelle') return 'Baustellen-App';
                                        if (page === 'manuellEingabe') return 'Kundendaten';
                                        if (page === 'lokalKundenListe') return 'Kunden';
                                        return 'Navigation';
                                    })()}
                                    targets={[
                                        { id:'start',   label:'Stadtseite',    handler: function(){ navigateTo('start'); } },
                                        { id:'kunden',  label:'Kunden',        handler: function(){ navigateTo('kundenModus'); } },
                                        { id:'baustell',label:'Baustellen',    handler: function(){ navigateTo('auswahl'); } },
                                        { id:'daten',   label:'Daten',         handler: function(){ navigateTo('datenUebersicht'); }, disabled: !selectedKunde },
                                        { id:'ordner',  label:'Ordner',        handler: function(){ navigateTo(isDriveMode ? 'ordnerBrowser' : 'lokalOrdnerBrowser'); }, disabled: !(selectedKunde && (selectedKunde._driveFolderId || selectedKunde.id)) },
                                        { id:'module',  label:'Module',        handler: function(){ navigateTo('modulwahl'); }, disabled: !selectedKunde },
                                        { id:'foto',    label:'Foto',          handler: function(){
                                            if (!selectedKunde) return;
                                            if (page === 'raumblatt') {
                                                if (window._fotoTabHandler) window._fotoTabHandler();
                                            } else {
                                                if (!selectedRaum) {
                                                    var direktRaum = {
                                                        nr: '', geschoss: 'EG', bez: '', quelle: 'Foto-Direktzugriff',
                                                        waende: [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}],
                                                        hoehe: 0, fliesenhoehe: 0, raumhoehe: 0,
                                                        abdichtungshoehe: 0, sockelhoehe: 0,
                                                        fliesenUmlaufend: true, abdichtungUmlaufend: true, manuell: true
                                                    };
                                                    setSelectedRaum(direktRaum);
                                                    setSelectedPositions([]);
                                                }
                                                navigateTo('raumblatt');
                                                setTimeout(function() { if (window._fotoTabHandler) window._fotoTabHandler(); }, 300);
                                            }
                                        }, disabled: !selectedKunde },
                                        { id:'akte',    label:'Akte',          handler: function(){ if (window._akteOeffnenHandler) window._akteOeffnenHandler(); } },
                                    ]}
                                />
                                {/* ETAPPE 4+7: Bearbeiten-Dropdown mit Speichern, Akten, (falls Aufmass) Vorlage, (falls vorhanden) Modul-Aktionen */}
                                {(function() {
                                    var bearbeitungsSeiten = ['raumblatt','rechnung','schriftverkehr','ausgangsbuch','datenUebersicht','manuellEingabe','baustelle','raumerkennung'];
                                    if (bearbeitungsSeiten.indexOf(page) < 0) return null;
                                    var dokumentTyp = (function() {
                                        if (page === 'raumblatt' || page === 'raumerkennung') return 'Aufmass';
                                        if (page === 'rechnung') return 'Rechnung';
                                        if (page === 'schriftverkehr') return 'Schriftverkehr';
                                        if (page === 'ausgangsbuch') return 'Ausgangsbuch';
                                        if (page === 'datenUebersicht' || page === 'manuellEingabe') return 'Kundendaten';
                                        if (page === 'baustelle') return 'Baustellen-App';
                                        return 'Dokument';
                                    })();
                                    var pad = function(n) { return n < 10 ? '0'+n : ''+n; };
                                    var bauLabel = function() {
                                        var kurzbez = selectedKunde ? ((selectedKunde.name || selectedKunde.auftraggeber || 'Allgemein').split(' \u2013 ')[0].slice(0, 30)) : 'Allgemein';
                                        var j = new Date();
                                        var datumStr = pad(j.getDate()) + '.' + pad(j.getMonth()+1) + '.' + j.getFullYear() + ' ' + pad(j.getHours()) + ':' + pad(j.getMinutes());
                                        return dokumentTyp + ' \u2014 ' + kurzbez + ' \u2014 ' + datumStr;
                                    };
                                    // Aufmass-Seiten bekommen die Vorlage-Eintraege im Bearbeiten-Dropdown
                                    var istAufmassSeite = (page === 'raumerkennung' || page === 'raumblatt');
                                    var vorlageEntries = istAufmassSeite ? [
                                        { id:'vorlage-save', label:'Aufmass-Vorlage speichern', icon:'\uD83D\uDCE4',
                                            handler: function() { if (typeof saveAufmassVorlage === 'function') saveAufmassVorlage(); },
                                            disabled: !!vorlageBusy
                                        },
                                        { id:'vorlage-load', label:'Aufmass-Vorlage laden', icon:'\uD83D\uDCE5',
                                            handler: function() { if (typeof openVorlagenListe === 'function') openVorlagenListe(); },
                                            disabled: !!vorlageBusy
                                        }
                                    ] : [];
                                    // Alle Bearbeiten-Dropdowns sind rot (Thomas-Wunsch, Default seit Etappe 7)
                                    return (
                                        <AktionDropdown
                                            label="Bearbeiten"
                                            align="left"
                                            actions={[
                                                { id:'speichern', label:'Speichern', icon:'\uD83D\uDCBE',
                                                    handler: function() {
                                                        if (!window._manuellSpeichernHandler) {
                                                            if (window._showToast) window._showToast('Manuelles Speichern auf dieser Seite nicht verfuegbar', 'info');
                                                            return;
                                                        }
                                                        var label = bauLabel();
                                                        try {
                                                            var p = window._manuellSpeichernHandler(label);
                                                            if (p && typeof p.then === 'function') {
                                                                p.then(function(){ if (window._showToast) window._showToast('Gespeichert: ' + label, 'success'); })
                                                                 .catch(function(err){ if (window._showToast) window._showToast('Speicher-Fehler: ' + (err && err.message || err), 'error'); });
                                                            } else {
                                                                if (window._showToast) window._showToast('Gespeichert: ' + label, 'success');
                                                            }
                                                        } catch(e) {
                                                            if (window._showToast) window._showToast('Speicher-Fehler: ' + e.message, 'error');
                                                        }
                                                    },
                                                    disabled: !selectedKunde
                                                },
                                                { id:'akten', label:'Akten', icon:'\uD83D\uDCC1',
                                                    handler: function() {
                                                        if (window._akteOeffnenHandler) window._akteOeffnenHandler();
                                                        else if (window._showToast) window._showToast('Akten-Funktion nicht verfuegbar', 'info');
                                                    },
                                                    disabled: !selectedKunde
                                                }
                                            ].concat(vorlageEntries).concat(moduleActions)}
                                        />
                                    );
                                })()}
                            </div>
                            {/* HOTFIX 25.04.2026: Mittlerer Bereich fuer kontextabhaengige Aktionen.
                                Aktuell: Aktions-Buttons aus dem Pos-Auswahl-Modal (tw-aufmass.jsx),
                                wenn dieses offen ist. So gibt es nur EINE Toolbar, und die Dropdowns
                                AUFMASS/BEARBEITEN klappen ohne Ueberlagerung auf. */}
                            {posModalToolbar && (
                                <div style={{display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap'}}>
                                    {posModalToolbar}
                                </div>
                            )}
                            {/* Rechte Gruppe: AutoSave + FotoSync + Speicher + Memory-Badge - kompakt in der Ecke */}
                            {/* Memory-Badge (Etappe B, 25.04.2026): zeigt Queue-Status und oeffnet bei Klick das Storage-Health-Dashboard */}
                            <div style={{display:'flex', alignItems:'center', gap:'6px', marginLeft:'auto'}}>
                                <AutoSaveStatusIndicator />
                                <FotoSyncIndicator status={fotoSyncStatus} />
                                <StorageIndicator />
                                <MemoryBadge />
                            </div>
                        </div>
                    )}

                    {/* ═══ GLOBALER KUNDENNAME — sichtbar auf allen Bearbeitungsseiten ═══ */}
                    {selectedKunde && page !== 'start' && page !== 'kundenModus' && (
                        <div style={{padding:'8px 16px', background:'rgba(30,136,229,0.08)', borderBottom:'1px solid rgba(30,136,229,0.15)', display:'flex', alignItems:'center', gap:'10px'}}>
                            <span style={{fontSize:'18px'}}>{'\uD83C\uDFD7\uFE0F'}</span>
                            <div style={{fontSize:'18px', fontWeight:'700', color:'var(--accent-blue)', fontFamily:'Oswald, sans-serif', letterSpacing:'0.5px', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                {(selectedKunde.name || selectedKunde.auftraggeber || 'Kunde').split(' \u2013 ')[0]}
                            </div>
                        </div>
                    )}

                    {renderPage()}

                    {showAuth && (
                        <AuthModal
                            onAuth={handleAuth}
                            onCancel={() => setShowAuth(false)}
                        />
                    )}

                    {showGesamtliste && (
                        <div className="modal-overlay" style={{zIndex:3000}}>
                            <div style={{width:'100%', maxWidth:'700px', maxHeight:'95vh', overflow:'auto', background:'var(--bg-primary)', borderRadius:'16px', margin:'10px', padding:'4px'}}>
                                <Gesamtliste
                                    gesamtliste={gesamtliste}
                                    setGesamtliste={setGesamtliste}
                                    kunde={selectedKunde}
                                    onClose={() => setShowGesamtliste(false)}
                                    onOpenRaumblatt={handleOpenRoomFromGesamtliste}
                                    onAufmassEndgueltig={() => setAufmassGespeichert(true)}
                                    aufmassGespeichert={aufmassGespeichert}
                                    isDriveMode={isDriveMode}
                                />
                            </div>
                        </div>
                    )}

                    <StatusBar driveStatus={driveStatus} activeProject={
                        (page === 'raumblatt' || page === 'raumerkennung') && selectedKunde
                            ? selectedKunde.name.split(' – ')[0]
                            : null
                    } />

                    {/* ═══ AKTE MODAL ═══ */}
                    {showAkteModal && (
                        <div className="modal-overlay" style={{zIndex:3500}} onClick={function(e){ if(e.target === e.currentTarget) setShowAkteModal(false); }}>
                            <div style={{width:'100%', maxWidth:'500px', maxHeight:'90vh', overflow:'auto', background:'var(--bg-primary)', borderRadius:'16px', margin:'16px', padding:'20px'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
                                    <div style={{fontFamily:'Oswald, sans-serif', fontSize:'18px', fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'1px'}}>
                                        Akte {selectedKunde ? '- ' + (selectedKunde.name || '').split(' \u2013 ')[0].substring(0,25) : ''}
                                    </div>
                                    <button onClick={function(){ setShowAkteModal(false); }}
                                        style={{width:'36px', height:'36px', borderRadius:'50%', border:'none', background:'var(--bg-secondary)', cursor:'pointer', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)'}}>
                                        {'\u2715'}
                                    </button>
                                </div>

                                <div style={{fontSize:'11px', color:'var(--text-muted)', marginBottom:'16px', padding:'8px 12px', background:'var(--bg-secondary)', borderRadius:'8px'}}>
                                    {'Nur lokal erstellte Dokumente \u2014 keine Google Drive Originale'}
                                </div>

                                {/* ═══ DRIVE-SYNC im Akte-Modal ═══ */}
                                {/* Pro-Kunde Drive-Sync direkt aus der Akte heraus.
                                    Bei Klick wird gegen die selben TWStorage-APIs synchronisiert,
                                    danach laedt der Akte-Inhalt automatisch frisch nach. */}
                                {selectedKunde && (
                                    <div style={{marginBottom:'16px'}}>
                                        <KundenSyncButton
                                            kunde={selectedKunde}
                                            compact={true}
                                            onSyncComplete={function() {
                                                // Akte-Inhalt nach Sync neu laden
                                                if (window._akteOeffnenHandler) {
                                                    setTimeout(function() { window._akteOeffnenHandler(); }, 300);
                                                }
                                            }}
                                        />
                                    </div>
                                )}

                                {/* WIP-Eintraege (Bearbeitungsstaende) */}
                                {akteData.wips && akteData.wips.length > 0 && (
                                    <div style={{marginBottom:'16px'}}>
                                        <div style={{fontSize:'12px', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px', fontFamily:'Oswald, sans-serif'}}>
                                            {'Bearbeitungsst\u00e4nde'}
                                        </div>
                                        {akteData.wips.map(function(wip) {
                                            return (
                                                <button key={wip.id} onClick={function(){ handleWipRestore(wip); }}
                                                    style={{width:'100%', textAlign:'left', padding:'12px 14px', marginBottom:'6px', borderRadius:'10px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', transition:'all 0.15s ease'}}>
                                                    <span style={{fontSize:'24px'}}>{(wip.meta && wip.meta.icon) || MODUL_ICONS[wip.modulName] || '\uD83D\uDCBE'}</span>
                                                    <div style={{flex:1, minWidth:0}}>
                                                        <div style={{fontSize:'14px', fontWeight:600, color:'var(--text-primary)', fontFamily:'Oswald, sans-serif'}}>
                                                            {MODUL_LABELS[wip.modulName] || wip.modulName}
                                                        </div>
                                                        <div style={{fontSize:'12px', color:'var(--text-secondary)', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                                            {(wip.meta && wip.meta.beschreibung) || 'Gespeicherter Stand'}
                                                        </div>
                                                    </div>
                                                    <div style={{textAlign:'right', flexShrink:0}}>
                                                        <div style={{fontSize:'11px', color:'var(--text-muted)'}}>
                                                            {wip.savedAt ? new Date(wip.savedAt).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'}) : ''}
                                                        </div>
                                                        <div style={{fontSize:'10px', color:'var(--text-muted)'}}>
                                                            {wip.savedAt ? new Date(wip.savedAt).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}) : ''}
                                                        </div>
                                                    </div>
                                                    <span style={{color:'var(--accent-blue)', fontSize:'12px', fontWeight:700, flexShrink:0}}>{'\u25B6'}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* App-Dateien (fertige Dokumente) */}
                                {akteData.appDateien && akteData.appDateien.length > 0 && (
                                    <div style={{marginBottom:'16px'}}>
                                        <div style={{fontSize:'12px', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px', fontFamily:'Oswald, sans-serif'}}>
                                            Erstellte Dokumente
                                        </div>
                                        {akteData.appDateien.map(function(datei) {
                                            var icon = datei.fileType === 'pdf' ? '\uD83D\uDCC4' : datei.fileType === 'xlsx' ? '\uD83D\uDCCA' : datei.mimeType && datei.mimeType.indexOf('html') >= 0 ? '\uD83C\uDF10' : '\uD83D\uDCC1';
                                            return (
                                                <button key={datei.id} onClick={function(){ handleOpenAppDatei(datei.id); }}
                                                    style={{width:'100%', textAlign:'left', padding:'10px 14px', marginBottom:'4px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', transition:'all 0.15s ease'}}>
                                                    <span style={{fontSize:'18px'}}>{icon}</span>
                                                    <div style={{flex:1, minWidth:0}}>
                                                        <div style={{fontSize:'13px', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                                            {datei.name}
                                                        </div>
                                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>
                                                            {datei.ordnerName || ''} {datei.sizeBytes ? '\u00b7 ' + Math.round(datei.sizeBytes / 1024) + ' KB' : ''}
                                                        </div>
                                                    </div>
                                                    <span style={{fontSize:'11px', color:'var(--text-muted)', flexShrink:0}}>
                                                        {datei.syncedAt ? new Date(datei.syncedAt).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'}) : ''}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Leer-Zustand */}
                                {(!akteData.wips || akteData.wips.length === 0) && (!akteData.appDateien || akteData.appDateien.length === 0) && (
                                    <div style={{textAlign:'center', padding:'30px 20px', color:'var(--text-muted)'}}>
                                        <div style={{fontSize:'36px', marginBottom:'12px'}}>{'\uD83D\uDCC2'}</div>
                                        <div style={{fontSize:'14px', fontWeight:600}}>Noch keine lokalen Dokumente</div>
                                        <div style={{fontSize:'12px', marginTop:'6px'}}>
                                            {'Erstelle ein Aufma\u00df, eine Rechnung oder einen Brief \u2014 der aktuelle Bearbeitungsstand wird automatisch gesichert und erscheint hier.'}
                                        </div>
                                    </div>
                                )}

                                <button onClick={function(){ setShowAkteModal(false); }}
                                    style={{width:'100%', padding:'12px', marginTop:'8px', borderRadius:'10px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', cursor:'pointer', fontFamily:'Oswald, sans-serif', fontSize:'13px', fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.5px'}}>
                                    {'Schlie\u00dfen'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ SPEICHERN TOAST ═══ */}
                    {akteSaveToast && (
                        <div style={{position:'fixed', bottom:'80px', left:'50%', transform:'translateX(-50%)', zIndex:9999, background:'#27ae60', color:'#fff', padding:'10px 24px', borderRadius:'12px', fontFamily:'Oswald, sans-serif', fontSize:'14px', fontWeight:700, boxShadow:'0 4px 16px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', gap:'8px', animation:'fadeIn 0.2s ease'}}>
                            <span style={{fontSize:'18px'}}>\u2713</span> {akteSaveToast}
                        </div>
                    )}

                    {/* Storage-Health-Dashboard (Punkt 6 aus Architektur-Plan, 25.04.2026)
                        Aufruf: window._openStorageHealth() von ueberall */}
                    <StorageHealthDashboard
                        open={showStorageHealth}
                        onClose={function(){ setShowStorageHealth(false); }}
                    />

                    {/* Konflikt-Dialog-Host (Etappe D, 25.04.2026)
                        Stellt window._showKonfliktDialog(info, callback) global bereit */}
                    <KonfliktDialogHost />

                    {/* ═══ AUTO-WIEDERHERSTELLUNG TOAST ═══ */}
                    {autoRestoreToast && (
                        <div style={{position:'fixed', bottom:'130px', left:'50%', transform:'translateX(-50%)', zIndex:9999, background:'linear-gradient(135deg, #1E88E5, #1565C0)', color:'#fff', padding:'12px 28px', borderRadius:'12px', fontFamily:'Oswald, sans-serif', fontSize:'13px', fontWeight:600, boxShadow:'0 4px 16px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', gap:'10px', maxWidth:'90vw', textAlign:'center'}}>
                            <span style={{fontSize:'18px'}}>\u21BA</span> {autoRestoreToast}
                        </div>
                    )}

                    {/* KI-Ordneranalyse Fortschritts-Overlay */}
                    {isOrdnerAnalyseRunning && (
                        <OrdnerAnalyseProgress
                            progress={ordnerAnalyseProgress}
                            onClose={function() {
                                setIsOrdnerAnalyseRunning(false);
                                // Meta refreshen
                                if (selectedKunde) {
                                    var kid = selectedKunde._driveFolderId || selectedKunde.id || selectedKunde.name;
                                    window.OrdnerAnalyseDB.getMeta(kid).then(function(m) { setOrdnerAnalyseMeta(m); }).catch(function() {});
                                }
                                navigateTo('ordnerAnalyse');
                            }}
                        />
                    )}
                    {/* ═══ VORLAGE: Busy-Overlay ═══ */}
                    {vorlageBusy && (
                        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.65)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
                            <div style={{background:'var(--bg-secondary)', padding:'28px 36px', borderRadius:'14px', border:'1px solid var(--border-color)', textAlign:'center', maxWidth:'400px'}}>
                                <div style={{fontSize:'32px', marginBottom:'10px'}}>
                                    {vorlageBusy.action === 'save' ? '\uD83D\uDCE4' : (vorlageBusy.action === 'list' ? '\uD83D\uDD0D' : '\uD83D\uDCE5')}
                                </div>
                                <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)', marginBottom:'8px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase'}}>
                                    Aufmass-Vorlage
                                </div>
                                <div style={{fontSize:'12px', color:'var(--text-muted)'}}>{vorlageBusy.message}</div>
                            </div>
                        </div>
                    )}

                    {/* ═══ VORLAGE: Erfolgs-Toast ═══ */}
                    {vorlageToast && (
                        <div style={{position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)', background:'#27ae60', color:'#fff', padding:'12px 20px', borderRadius:'12px', fontSize:'13px', fontWeight:'600', zIndex:9998, boxShadow:'0 6px 20px rgba(39,174,96,0.4)', maxWidth:'90vw'}}>
                            {vorlageToast.message}
                        </div>
                    )}

                    {/* ═══ VORLAGE: Kunde-Open-Dialog (Normal / Vorlage laden) ═══ */}
                    {kundeOpenDialog && (
                        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.65)', zIndex:9997, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}
                             onClick={function(){ setKundeOpenDialog(null); }}>
                            <div onClick={function(e){ e.stopPropagation(); }}
                                 style={{background:'var(--bg-secondary)', padding:'24px', borderRadius:'16px', border:'1px solid var(--border-color)', maxWidth:'440px', width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}>
                                <div style={{fontSize:'12px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px', fontFamily:'Oswald, sans-serif', marginBottom:'6px'}}>
                                    Kunde oeffnen
                                </div>
                                <div style={{fontSize:'20px', fontWeight:'700', color:'var(--text-primary)', marginBottom:'4px', overflow:'hidden', textOverflow:'ellipsis'}}>
                                    {(kundeOpenDialog.kunde && (kundeOpenDialog.kunde.name || kundeOpenDialog.kunde.auftraggeber)) || 'Kunde'}
                                </div>
                                {kundeOpenDialog.kunde && kundeOpenDialog.kunde.baumassnahme && (
                                    <div style={{fontSize:'12px', color:'var(--text-muted)', marginBottom:'18px'}}>
                                        {kundeOpenDialog.kunde.baumassnahme}
                                    </div>
                                )}
                                <div style={{fontSize:'13px', color:'var(--text-muted)', marginBottom:'18px', lineHeight:'1.5'}}>
                                    Wie moechtest du diesen Kunden oeffnen?
                                </div>

                                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                                    {/* Button 1: Normal */}
                                    <button onClick={async function(){
                                        var k = kundeOpenDialog.kunde;
                                        setKundeOpenDialog(null);
                                        var kundeId = k.id || k._driveFolderId;
                                        if (!kundeId || !window.TWStorage) { alert('Kunde kann nicht geladen werden.'); return; }
                                        setLoading(true); setLoadProgress('Lokale Kundendaten werden geladen...');
                                        try {
                                            var cached = null;
                                            try { cached = await window.TWStorage.loadKunde(kundeId); } catch(e) {}
                                            var kundeData = cached || k;
                                            if (kundeData._lvPositionen && kundeData._lvPositionen.length > 0) {
                                                LV_POSITIONEN[kundeId] = kundeData._lvPositionen;
                                            } else {
                                                try { var gl = await window.TWStorage.loadGesamtliste(kundeId); if (gl && gl.length > 0) LV_POSITIONEN[kundeId] = gl; } catch(e) {}
                                            }
                                            if (kundeData._importResult) setImportResult(kundeData._importResult);
                                            else { try { var ir = await window.TWStorage.loadDriveCache('importResult', 'importResult_' + kundeId); if (ir && ir.data) setImportResult(ir.data); } catch(e) {} }
                                            var enriched = Object.assign({}, k, kundeData, {
                                                _driveFolderId: kundeId, _loadFromKundendaten: true, _fromCache: true, _fullyLoaded: true,
                                            });
                                            setSelectedKunde(enriched);
                                            setKundeMode('gespeichertKomplett');
                                            setIsDriveMode(false); setDriveStatus('offline');
                                            setLoading(false); setLoadProgress('');
                                            navigateTo('modulwahl');
                                        } catch(err) { setLoading(false); setLoadProgress(''); alert('Fehler: ' + (err.message || err)); }
                                    }}
                                        style={{padding:'14px 18px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg, #1E88E5, #1565C0)', color:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:'700', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px', display:'flex', alignItems:'center', gap:'12px', boxShadow:'0 4px 15px rgba(30,136,229,0.3)'}}>
                                        <span style={{fontSize:'24px'}}>{'\uD83D\uDCC2'}</span>
                                        <span style={{flex:1, textAlign:'left'}}>
                                            <div>Normal aufrufen</div>
                                            <div style={{fontSize:'10px', opacity:0.8, letterSpacing:'0', textTransform:'none', fontWeight:'500', marginTop:'2px'}}>Kunde mit lokalen Daten oeffnen</div>
                                        </span>
                                    </button>
                                    {/* Button 2: Vorlage laden */}
                                    <button onClick={async function(){
                                        var k = kundeOpenDialog.kunde;
                                        setKundeOpenDialog(null);
                                        setSelectedKunde(k);
                                        var service = window.GoogleDriveService;
                                        if (!service || !service.accessToken) {
                                            alert('Google Drive ist nicht verbunden.\nVorlagen koennen ohne Drive nicht geladen werden.');
                                            return;
                                        }
                                        setVorlageBusy({ action: 'list', message: 'Vorlagen auf Drive werden gesucht...' });
                                        try {
                                            var list = await listAufmassVorlagen(k);
                                            setVorlageBusy(null);
                                            setVorlageList(list);
                                        } catch(err) {
                                            setVorlageBusy(null);
                                            alert('Fehler beim Suchen der Vorlagen:\n' + (err.message || err));
                                        }
                                    }}
                                        style={{padding:'14px 18px', borderRadius:'12px', border:'none', background:'linear-gradient(135deg, #1E88E5, #1565C0)', color:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:'700', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px', display:'flex', alignItems:'center', gap:'12px', boxShadow:'0 4px 15px rgba(30,136,229,0.3)'}}>
                                        <span style={{fontSize:'24px'}}>{'\uD83D\uDCE5'}</span>
                                        <span style={{flex:1, textAlign:'left'}}>
                                            <div>Aufmass-Vorlage laden</div>
                                            <div style={{fontSize:'10px', opacity:0.8, letterSpacing:'0', textTransform:'none', fontWeight:'500', marginTop:'2px'}}>Vorbereitete Vorlage aus Google Drive</div>
                                        </span>
                                    </button>
                                    {/* Abbrechen */}
                                    <button onClick={function(){ setKundeOpenDialog(null); }}
                                        style={{padding:'10px', borderRadius:'10px', border:'1px solid var(--border-color)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:'12px', fontWeight:'600', marginTop:'4px'}}>
                                        Abbrechen
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ VORLAGE: Liste der verfuegbaren Vorlagen ═══ */}
                    {vorlageList !== null && (
                        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:9997, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}
                             onClick={function(){ setVorlageList(null); }}>
                            <div onClick={function(e){ e.stopPropagation(); }}
                                 style={{background:'var(--bg-secondary)', padding:'20px', borderRadius:'16px', border:'1px solid var(--border-color)', maxWidth:'520px', width:'100%', maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}>
                                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px'}}>
                                    <div>
                                        <div style={{fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px', fontFamily:'Oswald, sans-serif', marginBottom:'2px'}}>
                                            Verfuegbare Vorlagen
                                        </div>
                                        <div style={{fontSize:'16px', fontWeight:'700', color:'var(--text-primary)'}}>
                                            {(selectedKunde && (selectedKunde.name || selectedKunde.auftraggeber)) || 'Kunde'}
                                        </div>
                                    </div>
                                    <button onClick={function(){ setVorlageList(null); }}
                                        style={{padding:'6px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', background:'var(--bg-primary)', color:'var(--text-muted)', cursor:'pointer', fontSize:'13px'}}>
                                        {'\u2715'}
                                    </button>
                                </div>

                                {vorlageList.length === 0 ? (
                                    <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-muted)', fontSize:'13px', lineHeight:'1.6'}}>
                                        <div style={{fontSize:'40px', marginBottom:'12px', opacity:0.4}}>{'\uD83D\uDCC2'}</div>
                                        Keine Vorlagen fuer diesen Kunden vorhanden.
                                        <br />
                                        <span style={{fontSize:'11px', opacity:0.7}}>Speichere zuerst eine Vorlage mit dem roten "Aufmass Vorlage speichern"-Button.</span>
                                    </div>
                                ) : (
                                    <div style={{overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:'8px', paddingRight:'4px'}}>
                                        {vorlageList.map(function(v) {
                                            var datStr = '';
                                            try {
                                                var d = new Date(v.modifiedTime || v.createdTime);
                                                var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
                                                datStr = pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
                                            } catch(e) {}

                                            return (
                                                <button key={v.id} onClick={function(){ handleVorlageAuswaehlen(v); }}
                                                    style={{padding:'14px', borderRadius:'12px', border:'1px solid var(--border-color)', background:'var(--bg-primary)', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:'12px', touchAction:'manipulation'}}>
                                                    <span style={{fontSize:'26px', flexShrink:0}}>{'\uD83D\uDCC4'}</span>
                                                    <div style={{flex:1, minWidth:0}}>
                                                        <div style={{fontSize:'13px', fontWeight:'700', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                                            {v.name}
                                                        </div>
                                                        {datStr && (
                                                            <div style={{fontSize:'11px', color:'var(--accent-blue)', marginTop:'3px', fontFamily:'Oswald, sans-serif', letterSpacing:'0.3px'}}>
                                                                {'\uD83D\uDD52'} {datStr}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span style={{fontSize:'11px', padding:'6px 10px', borderRadius:'var(--radius-sm)', background:'var(--accent-blue)', color:'#fff', fontWeight:'700', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px', flexShrink:0}}>
                                                        Laden
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </React.Fragment>
            );
        }

        /* ═══════════════════════════════════════════
           MOUNT
           ═══════════════════════════════════════════ */
