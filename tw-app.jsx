        function App() {
            // Pages: 'start' | 'kundenModus' | 'auswahl' | 'akte' | 'geladen' | 'datenUebersicht' | 'modulwahl' | 'manuellEingabe' | 'raumerkennung' | 'raumblatt' | 'rechnung' | 'ausgangsbuch' | 'schriftverkehr' | 'baustelle' | 'ordnerAnalyse' | 'ordnerAnalyseDetail'
            const [page, setPage] = useState('start');
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
                }, 200); // Kurze Verzögerung damit DOM gerendert ist
                return function() { clearTimeout(timer); };
            }, [page, showGesamtliste, showAuth]);

            // ── 2. Enter-Navigation: Enter = nächstes Eingabefeld auf der aktuellen Seite ──
            useEffect(function() {
                var handleGlobalEnter = function(e) {
                    if (e.key !== 'Enter') return;
                    // Wenn ein Komponenten-Handler das Event bereits behandelt hat → überspringen
                    if (e.defaultPrevented) return;

                    var el = e.target;
                    var tag = el.tagName;

                    // Nur für Eingabefelder (nicht Textareas = Mehrzeiler, nicht Buttons)
                    if (tag === 'TEXTAREA') return;
                    if (tag === 'BUTTON') return;

                    // ── FALL A: Wir sind in einem Eingabefeld (INPUT/SELECT) ──
                    if (tag === 'INPUT' || tag === 'SELECT') {
                        // Checkboxen, Radios, File-Inputs → ignorieren
                        if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'file') return;

                        e.preventDefault();

                        // Container bestimmen: Modal → Seite → Root
                        var container = el.closest('.modal-overlay') || el.closest('.modal') || el.closest('.manual-raum-card') || el.closest('.page-container') || document.getElementById('root');
                        if (!container) return;

                        // Alle sichtbaren, nicht-deaktivierten Eingabefelder im Container sammeln
                        var allInputs = [];
                        var candidates = container.querySelectorAll(
                            'input:not([disabled]):not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([readonly]),' +
                            'textarea:not([disabled]):not([readonly]),' +
                            'select:not([disabled])'
                        );
                        for (var i = 0; i < candidates.length; i++) {
                            // Nur sichtbare Elemente (offsetParent !== null für sichtbare, ODER in fixed/sticky Position)
                            if (candidates[i].offsetParent !== null || candidates[i].offsetWidth > 0) {
                                allInputs.push(candidates[i]);
                            }
                        }

                        var idx = allInputs.indexOf(el);
                        if (idx >= 0 && idx < allInputs.length - 1) {
                            // Nächstes Feld fokussieren
                            allInputs[idx + 1].focus();
                            if (allInputs[idx + 1].select) allInputs[idx + 1].select();
                        } else {
                            // Letztes Feld → Aktion je nach Seite
                            el.blur();
                            switch(page) {
                                case 'akte':
                                    if (!loading) handleLoadAkte();
                                    break;
                                case 'geladen':
                                    handleStartAufmass();
                                    break;
                            }
                        }
                        return;
                    }

                    // ── FALL B: Kein Eingabefeld fokussiert → Seiten-Aktion auslösen ──
                    switch(page) {
                        case 'start':
                            if (!showAuth) { e.preventDefault(); handleKundeNeu(); }
                            break;
                        case 'geladen':
                            e.preventDefault();
                            navigateTo('modulwahl');
                            break;
                    }
                };
                window.addEventListener('keydown', handleGlobalEnter);
                return function() { window.removeEventListener('keydown', handleGlobalEnter); };
            });

            const navigateTo = useCallback((newPage) => {
                setPage(newPage);
                setHistory(prev => {
                    const newHistory = [...prev.slice(0, historyIdx + 1), newPage];
                    setHistoryIdx(newHistory.length - 1);
                    return newHistory;
                });
            }, [historyIdx]);

            // Globale Navigation für Module (z.B. Gesamtliste → Modulwahl)
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
                // Alle 3 Modi laden zuerst die Kundenliste aus Google Drive
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
                            pos: p.pos, bez: p.bez, einheit: p.einheit, menge: p.menge,
                            einzelpreis: p.einzelpreis, bereich: p.bereich || '', kategorie: p.kategorie || '',
                            tags: p.tags || [], _epPreis: p.einzelpreis || null, _gpPreis: (p.menge * p.einzelpreis) || null,
                            _istNachtrag: p._istNachtrag || false
                        };
                    });
                    LV_POSITIONEN[kundeId] = lvPos;
                    kunde._lvPositionen = lvPos;
                    kunde._lvPositionenKey = kundeId;
                }

                // Raeume aktualisieren
                if (result.raeume) {
                    kunde._raeume = result.raeume;
                    kunde.raeume = result.raeume;
                }

                // ImportResult IMMER aktualisieren (auch wenn nur Positionen geaendert)
                var updatedKd = {};
                if (result.stammFelder) {
                    var sf = result.stammFelder;
                    kunde.auftraggeber = sf.bauherr_firma || kunde.auftraggeber;
                    kunde.adresse = sf.objekt_baustelle || kunde.adresse;
                    kunde.baumassnahme = sf.objekt_bauvorhaben || kunde.baumassnahme;
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
                        bez: p.leistung,
                        einheit: p.einheit || 'm²',
                        menge: p.menge || 0,
                        einzelpreis: p.ep || 0,
                        bereich: '',
                        kategorie: '',
                        tags: [],
                        _epPreis: p.ep || null,
                        _gpPreis: p.gp || null
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
                    name: data.kundenName + (data.bauvorhaben ? ' – ' + data.bauvorhaben : ''),
                    auftraggeber: data.kundenName,
                    adresse: data.bauvorhaben || '',
                    _fullyLoaded: true,
                    _manuellerKunde: true,
                    _lvPositionen: lvPosFormatted,
                    _raeume: raeumeFormatted,
                    _lvPositionenKey: kundeId,
                    _gespeichertAm: new Date().toLocaleString('de-DE'),
                    raeume: raeumeFormatted
                };

                // LV-Positionen in globales Objekt injizieren
                LV_POSITIONEN[kundeId] = lvPosFormatted;

                // ImportResult erstellen (für Rechnung/Module)
                var impResult = {
                    positionen: lvPosFormatted,
                    raeume: raeumeFormatted,
                    kundendaten: {
                        auftraggeber: data.kundenName,
                        adresse: data.bauvorhaben || '',
                        baumassnahme: data.bauvorhaben || ''
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

                // Google Drive verbinden falls nötig
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

                    // 2. KI-Ordneranalyse starten
                    setLoadProgress('🤖 KI-Ordneranalyse läuft...');
                    window._kiDisabled = false;

                    var result = await window.OrdnerAnalyseEngine.analyzeKundeForApp(
                        enriched,
                        function(p) { if (p && p.message) setLoadProgress('🔄 ' + p.message); }
                    );
                    setOrdnerAnalyseMeta(result.meta || null);

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
                        ag_telefon: kd.ag_telefon || enriched.ag_telefon || '',
                        ag_fax: kd.ag_fax || enriched.ag_fax || '',
                        ag_email: kd.ag_email || enriched.ag_email || '',
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

                    // 5. Lokal speichern (überschreibt alte Daten)
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

                    setLoadProgress('✅ Update-Analyse abgeschlossen! ' + (result.positionen || []).length + ' Positionen erkannt.');
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
                        handleStartAufmass(); // → raumerkennung (NICHT zurück zu geladen!)
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
                            ag_telefon: kd.ag_telefon || prev.ag_telefon || '',
                            ag_email: kd.ag_email || prev.ag_email || '',
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

                // ═══ MODUS: GESPEICHERTE DATEN LADEN (Excel-Listen aus Kunden-Daten Ordner) ═══
                if (kundeMode === 'gespeichert') {
                    setLoading(true);
                    setLoadProgress('📂 Lade Kundendaten...');
                    navigateTo('akte');
                    try {
                        var service = window.GoogleDriveService;
                        if (service && service.accessToken && kunde.id) {
                            // 1. Ordnerinhalt laden
                            const contents = await service.listFolderContents(kunde.id);

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
                                _driveFolderId: kunde.id,
                                _loadFromKundendaten: true,
                            };

                            if (kundendatenFolder && kundendatenFolder.files && kundendatenFolder.files.length > 0) {
                                setLoadProgress('📥 Lade ' + kundendatenFolder.files.length + ' Dateien aus Kunden-Daten...');

                                // 3. Excel-Dateien herunterladen
                                var geladene = [];
                                for (var di = 0; di < kundendatenFolder.files.length; di++) {
                                    var file = kundendatenFolder.files[di];
                                    setLoadProgress('📥 ' + (di+1) + '/' + kundendatenFolder.files.length + ': ' + file.name);
                                    try {
                                        var blob = await service.downloadFile(file.id);
                                        geladene.push({ name: file.name, blob: blob, folder: 'Kunden-Daten' });
                                    } catch(dlErr) {
                                        console.error('Download-Fehler:', file.name, dlErr);
                                        geladene.push({ name: file.name, error: dlErr.message });
                                    }
                                }

                                var erfolgreich = geladene.filter(function(d){ return !d.error; });
                                setLoadProgress('📊 ' + erfolgreich.length + ' Dateien geladen — Parser startet...');

                                // 4. ═══ EXCEL-PARSER: 3 Listen deterministisch parsen ═══
                                if (parser && erfolgreich.length > 0) {
                                    var parseResult = await parser.parseAlleListenAsync(erfolgreich, function(msg) {
                                        setLoadProgress(msg);
                                    });

                                    console.log('═══ KundenDatenParser Ergebnis ═══');
                                    console.log('  Stammdaten:', parseResult.stammdaten ? 'JA' : 'NEIN');
                                    console.log('  Positionen:', parseResult.positionen.length);
                                    console.log('  Nachtraege:', parseResult.nachtraege.length);
                                    console.log('  Raeume:', parseResult.raeume.length);
                                    console.log('  Fehler:', parseResult.meta.fehler);

                                    // 5. Import-Result erstellen (App-kompatibles Format)
                                    var impResult = parser.ergebnisZuImportResult(parseResult);

                                    // 6. Daten in App-State injizieren
                                    var kundeId = kunde.id || 'gespeichert_' + Date.now();
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

                                    // 8. Lokal speichern fuer spaetere Verwendung
                                    var localKey2 = 'aufmass_kunde_' + kundeId;
                                    try {
                                        var toSave = Object.assign({}, enriched);
                                        delete toSave.folders;
                                        delete toSave.files;
                                        localStorage.setItem(localKey2, JSON.stringify(toSave));
                                        console.log('✅ Kunde lokal gespeichert:', localKey2);
                                    } catch(saveErr) {
                                        console.warn('LocalStorage Speicherfehler:', saveErr);
                                    }

                                    setLoadProgress('✅ ' + impResult.positionen.length + ' Positionen + ' + impResult.raeume.length + ' Räume geladen!');
                                } else {
                                    setLoadProgress('⚠ Parser nicht verfügbar oder keine Dateien.');
                                    enriched._fullyLoaded = true;
                                }
                            } else {
                                setLoadProgress('⚠ Kein "Kunden-Daten" Ordner gefunden in: ' + kunde.name);
                                enriched._fullyLoaded = false;
                            }

                            setSelectedKunde(enriched);
                        }
                    } catch(err) {
                        console.error('Kundendaten laden:', err);
                        setLoadProgress('❌ Fehler: ' + err.message);
                    }
                    setLoading(false);
                    // Kurz warten damit User die Erfolgsmeldung sieht
                    await new Promise(function(r){ setTimeout(r, 1200); });
                    setKundeMode('analysiert'); // Ab jetzt wie angelegter Kunde behandeln
                    navigateTo('datenUebersicht'); // Erst Daten pruefen, dann Module!
                    return;
                }

                // ═══ MODUS: MANUELL ANLEGEN ═══
                if (kundeMode === 'manuell') {
                    // Kunde ausgewählt, jetzt manuelles Eingabeformular
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

                // ═══ FALLBACK: Alte "analysiert" Logik für Kompatibilität ═══
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

                        // Ordner-Filter anwenden: nur ausgewählte Ordner an Engine übergeben
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

                    // Kundendaten + Räume + Zeichnungen in Kunde mergen
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

                    setLoadProgress('✅ Analyse abgeschlossen!');
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
                            ag_adresse: kd.ag_adresse || '', ag_telefon: kd.ag_telefon || '', ag_email: kd.ag_email || '',
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

                // ═══ ALLE Einstellungen für nächsten Raum übernehmen ═══
                const m = (roomResult && roomResult.masse) || {};
                const rState = (roomResult && roomResult.raumState) || {};
                // Wandmaße: aus raumState.wandMasse ODER aus masse.laenge/breite aufbauen
                var savedWaende = (rState.wandMasse || []).map(function(w) { return { id: w.id, l: w.l }; });
                // Prüfe ob Wände TATSÄCHLICH Werte haben (nicht nur leere Einträge)
                var waendeHaveValues = savedWaende.some(function(w) { return w.l && parseMass(w.l) > 0; });
                // WENN wandMasse leer/ohne Werte ABER Länge/Breite vorhanden → 4 Wände generieren
                if (!waendeHaveValues && (m.laenge || m.breite)) {
                    savedWaende = [
                        { id: 'A', l: m.laenge || '' },
                        { id: 'B', l: m.breite || '' },
                        { id: 'C', l: m.laenge || '' },
                        { id: 'D', l: m.breite || '' }
                    ];
                }
                setLastRaumData({
                    // ── Höhen aus dem Raumblatt ──
                    hoehe: parseMass(m.hoehe) || (selectedRaum && selectedRaum.fliesenhoehe) || 0,
                    raumhoehe: parseMass(m.raumhoehe) || (selectedRaum && selectedRaum.raumhoehe) || 0,
                    abdichtungshoehe: parseMass(m.abdichtungshoehe) || 0,
                    sockelhoehe: parseMass(m.sockelhoehe) || 0,
                    // ── Wände (KRITISCH für Baugleich-Raum!) ──
                    waende: savedWaende,
                    // ── Komplette Masse (für Länge/Breite Übernahme) ──
                    masse: { laenge: m.laenge || '', breite: m.breite || '', hoehe: m.hoehe || '', raumhoehe: m.raumhoehe || '', abdichtungshoehe: m.abdichtungshoehe || '', sockelhoehe: m.sockelhoehe || '', bodenManual: m.bodenManual || '' },
                    // ── Abzüge/Einbauten für Baugleich ──
                    abzuege: ((roomResult && roomResult.raumState) && (roomResult && roomResult.raumState).abzuege) || [],
                    material: (selectedRaum && selectedRaum.material) || '',
                    // ── Schalter (Toggle-States) ──
                    fliesenUmlaufend: (roomResult && roomResult.fliesenUmlaufend) !== undefined ? roomResult.fliesenUmlaufend : true,
                    abdichtungUmlaufend: (roomResult && roomResult.abdichtungUmlaufend) !== undefined ? roomResult.abdichtungUmlaufend : true,
                    fliesenDeckenhoch: (roomResult && roomResult.fliesenDeckenhoch) || false,
                    abdichtungDeckenhoch: (roomResult && roomResult.abdichtungDeckenhoch) || false,
                    bodenPlusTuerlaibung: (roomResult && roomResult.bodenPlusTuerlaibung) || false,
                    // ── Tür/Fenster/Sonstige-Defaults (Schalter für Laibungen, Gefliest, Abgedichtet) ──
                    tuerDefaults: (roomResult && roomResult.tuerDefaults) || null,
                    fensterDefaults: (roomResult && roomResult.fensterDefaults) || null,
                    sonstigeDefaults: (roomResult && roomResult.sonstigeDefaults) || null,
                    // ── Komplette Einträge für Vorladung im nächsten Raum ──
                    tuerenEntries: (roomResult && roomResult.tuerenEntries) || null,
                    fensterEntries: (roomResult && roomResult.fensterEntries) || null,
                    // ── PosCards mit manuellen Eingaben (Stück, manuelle Mengen etc.) ──
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
                setShowGesamtliste(true);
            };

            // ═══ Raum aus Gesamtliste wieder bearbeiten ═══
            const handleOpenRoomFromGesamtliste = (roomIdx, room) => {
                if (!room.raumState) {
                    alert('⚠ Raumdaten nicht vollständig gespeichert. Raum kann nicht erneut geöffnet werden.');
                    return;
                }
                // Raum aus Gesamtliste entfernen (wird nach Fertigstellung neu hinzugefügt)
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

            const renderPage = () => {
                switch(page) {
                    case 'start':
                        return <Startseite onKundenauswahl={handleKundenauswahl} onKundeNeu={handleKundeNeu} onKundeAnalysiert={handleKundeAnalysiert} onKundeManuell={handleKundeManuell} onDriveStatusChange={function(status){ setDriveStatus(status); if(status === 'online') setIsDriveMode(true); }} />;
                    case 'kundenModus':
                        return <KundenModusWahl onSelectModus={handleSelectModus} onBack={function(){ navigateTo('start'); }} connections={startConnections} />;
                    case 'manuellEingabe':
                        return <ManuelleEingabe onFertig={handleManuellFertig} onBack={function(){ navigateTo('kundenModus'); }} kunde={selectedKunde} />;
                    case 'auswahl':
                        return <Kundenauswahl onSelect={handleSelectKunde} loading={loading} kunden={isDriveMode ? driveKunden : null} onUpdateKunde={handleUpdateKunde} kundeMode={kundeMode} onBack={function(){ navigateTo('kundenModus'); }} />;
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
                        return <ModulWahl kunde={selectedKunde} onSelectModul={handleSelectModul} ordnerAnalyseMeta={ordnerAnalyseMeta} onDatenBearbeiten={function(){ navigateTo('datenUebersicht'); }} />;
                    case 'datenUebersicht':
                        return <DatenUebersicht
                            kunde={selectedKunde}
                            importResult={importResult}
                            onSave={handleDatenUebersichtSave}
                            onBack={function(){ navigateTo('modulwahl'); }}
                            onWeiterZuModulen={function(){ navigateTo('modulwahl'); }}
                        />;
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
                        return <RechnungsModul kunde={selectedKunde} importResult={importResult} gesamtliste={gesamtliste} aufmassGespeichert={aufmassGespeichert} onBack={() => navigateTo('modulwahl')} />;
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

            return (
                <React.Fragment>
                    <NavHeader
                        page={page}
                        onBack={goBack}
                        onForward={goForward}
                        canBack={historyIdx > 0}
                        canForward={historyIdx < history.length - 1}
                    />

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
                </React.Fragment>
            );
        }

        /* ═══════════════════════════════════════════
           MOUNT
           ═══════════════════════════════════════════ */
