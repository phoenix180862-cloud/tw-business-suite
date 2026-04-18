        // ═══════════════════════════════════════════════════════
        // BAUSTELLEN-APP-MODUL — Haupt-Container
        // ═══════════════════════════════════════════════════════
        // Etappe 2: Startseite mit drei blauen Buttons
        //           BAUSTELLEN - TEAM - SYNC
        // subpage-State routet zwischen Startseite und den 3 Unterseiten.
        // Die obere NavHeader-Leiste wird global von tw-app.jsx gerendert
        // und ist nicht Teil dieser Komponente.
        function BaustellenAppAdmin({ kunde, onBack }) {
            const [subpage, setSubpage] = useState('start');
            const [fbOk, setFbOk] = useState(false);
            const [fbConfig, setFbConfig] = useState(function() {
                var s = window.FirebaseService.getStoredConfig();
                return s || {
                    apiKey:'AIzaSyBUHOr2dM2H-sUnhNODoVSerM224vPsC_E',
                    authDomain:'einkaufsliste-98199.firebaseapp.com',
                    databaseURL:'https://einkaufsliste-98199-default-rtdb.europe-west1.firebasedatabase.app',
                    projectId:'einkaufsliste-98199',
                    storageBucket:'einkaufsliste-98199.firebasestorage.app',
                    messagingSenderId:'411877213047',
                    appId:'1:411877213047:web:f04e3b9b98a8d97120d772'
                };
            });
            const [users, setUsers] = useState({ pending:[], approved:[] });
            const [projects, setProjects] = useState([]);
            const [syncStatus, setSyncStatus] = useState({ projects:0, users:0, lastSync:null });
            const [log, setLog] = useState([]);
            const [busy, setBusy] = useState(false);

            // ── Init Firebase on mount ──
            useEffect(function() {
                var s = window.FirebaseService.getStoredConfig();
                if (s && s.apiKey) {
                    var ok = window.FirebaseService.init(s);
                    if (ok) { setFbOk(true); doLogin(); }
                }
            }, []);

            // ── Echtzeit-Listener: User-Freigaben ──
            useEffect(function() {
                if (!fbOk) return;
                var unsub = window.FirebaseService.onUsersChange(function(d) { setUsers(d); });
                return unsub;
            }, [fbOk]);

            // ── Projekte laden ──
            useEffect(function() {
                if (!fbOk) return;
                reload();
            }, [fbOk]);

            function addLog(m) {
                var t = new Date().toLocaleTimeString('de-DE');
                setLog(function(p) { return [{ time:t, msg:m }].concat(p).slice(0,50); });
            }
            async function doLogin() {
                try { await window.FirebaseService.signInAdmin(); addLog('Admin angemeldet'); }
                catch(e) { addLog('Login-Fehler: ' + e.message); }
            }
            async function reload() {
                try {
                    var p = await window.FirebaseService.getProjects(); setProjects(p);
                    var s = await window.FirebaseService.getSyncStatus(); setSyncStatus(s);
                } catch(e) { addLog('Laden fehlgeschlagen: ' + e.message); }
            }
            async function handleConnect() {
                setBusy(true);
                try {
                    var ok = window.FirebaseService.init(fbConfig);
                    if (ok) { setFbOk(true); addLog('Verbunden: ' + fbConfig.projectId); await doLogin(); }
                    else { alert('Verbindung fehlgeschlagen -- Config pruefen.'); }
                } catch(e) { alert('Fehler: ' + e.message); }
                setBusy(false);
            }
            async function handleDisconnect() {
                if (!confirm('Firebase trennen?')) return;
                localStorage.removeItem('tw_firebase_config'); window.location.reload();
            }
            async function handleApprove(uid, name) {
                await window.FirebaseService.approveUser(uid); addLog('OK Freigegeben: ' + (name||uid.substring(0,8)));
            }
            async function handleReject(uid, name) {
                if (!confirm('"' + (name||'') + '" ablehnen?')) return;
                await window.FirebaseService.rejectUser(uid); addLog('X Abgelehnt: ' + (name||uid.substring(0,8)));
            }
            async function handleSync() {
                setBusy(true); addLog('Sync...'); await reload();
                addLog('Fertig -- ' + syncStatus.projects + ' Projekte, ' + syncStatus.users + ' User'); setBusy(false);
            }

            // ════════════════════════════════════════════════════
            // SUBPAGE-ROUTING
            // ════════════════════════════════════════════════════
            if (subpage === 'baustellen') {
                return <StagingBereich kunde={kunde} onBack={function(){ setSubpage('start'); }} />;
            }
            if (subpage === 'team') {
                return <TeamVerwaltung
                    fbOk={fbOk}
                    users={users}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onBack={function(){ setSubpage('start'); }}
                />;
            }
            if (subpage === 'sync') {
                return <SynchronisationsBereich
                    fbOk={fbOk}
                    fbConfig={fbConfig}
                    setFbConfig={setFbConfig}
                    syncStatus={syncStatus}
                    log={log}
                    busy={busy}
                    projects={projects}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onSync={handleSync}
                    onBack={function(){ setSubpage('start'); }}
                />;
            }

            // ════════════════════════════════════════════════════
            // STARTSEITE: 3 grosse blaue Buttons
            // ════════════════════════════════════════════════════
            return <BaustellenAppStartseite
                kunde={kunde}
                fbOk={fbOk}
                pendingCount={users.pending.length}
                onBaustellen={function(){ setSubpage('baustellen'); }}
                onTeam={function(){ setSubpage('team'); }}
                onSync={function(){ setSubpage('sync'); }}
                onBack={onBack}
            />;
        }

        // ═══════════════════════════════════════════════════════
        // STARTSEITE des Baustellen-App-Moduls
        // Drei blaue Modus-Karten: BAUSTELLEN - TEAM - SYNC
        // Design: identischer Gradient wie Modulwahl-Kacheln
        // ═══════════════════════════════════════════════════════
        function BaustellenAppStartseite({ kunde, fbOk, pendingCount, onBaustellen, onTeam, onSync, onBack }) {
            var cards = [
                {
                    id: 'baustellen',
                    icon: '🏗️',
                    title: 'Baustellen',
                    desc: 'Staging-Bereich verwalten: Zeichnungen, Bilder und Stunden fuer die Mitarbeiter-App bereitstellen.',
                    onClick: onBaustellen,
                    badge: null
                },
                {
                    id: 'team',
                    icon: '👥',
                    title: 'Team',
                    desc: 'Mitarbeiter-Freigaben, Geraeteverwaltung und Zugangsberechtigungen fuer die Baustellen-App.',
                    onClick: onTeam,
                    badge: pendingCount > 0 ? String(pendingCount) : null
                },
                {
                    id: 'sync',
                    icon: '🔄',
                    title: 'Sync',
                    desc: 'Synchronisation mit dem Firebase-Backend, Projekte verwalten und Live-Protokoll.',
                    onClick: onSync,
                    badge: null
                }
            ];

            return (
                <div className="page-container" style={{
                    padding: '16px',
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* ── Modul-Header: Zurueck-Button + Titel + Status ── */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '18px'
                    }}>
                        <button onClick={onBack} style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: '22px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            touchAction: 'manipulation'
                        }}>←</button>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '18px',
                                fontWeight: 600,
                                letterSpacing: '1.5px',
                                textTransform: 'uppercase',
                                color: 'var(--text-primary)'
                            }}>
                                📱 Baustellen-App
                            </div>
                            <div style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                marginTop: '2px'
                            }}>
                                {kunde ? kunde.name : 'Kein Kunde ausgewaehlt'}
                            </div>
                        </div>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontFamily: 'Oswald, sans-serif',
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            background: fbOk ? 'rgba(39,174,96,0.15)' : 'rgba(196,30,30,0.15)',
                            color: fbOk ? 'var(--success)' : 'var(--accent-red)',
                            border: '1px solid ' + (fbOk ? 'rgba(39,174,96,0.3)' : 'rgba(196,30,30,0.3)')
                        }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: fbOk ? 'var(--success)' : 'var(--accent-red)'
                            }}></span>
                            {fbOk ? 'Online' : 'Offline'}
                        </span>
                    </div>

                    {/* ── Info-Panel oben ── */}
                    <div style={{
                        padding: '14px 16px',
                        marginBottom: '20px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(30,136,229,0.08)',
                        border: '1px solid rgba(30,136,229,0.2)',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        color: 'var(--text-light)'
                    }}>
                        <div style={{
                            fontFamily: "'Oswald', sans-serif",
                            fontSize: '13px',
                            fontWeight: 600,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            color: '#4da6ff',
                            marginBottom: '4px'
                        }}>
                            Bereich waehlen
                        </div>
                        Hier verwalten Sie die Verbindung zur mobilen Baustellen-App Ihrer Mitarbeiter.
                    </div>

                    {/* ── Die 3 blauen Modus-Karten ── */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        flex: 1
                    }}>
                        {cards.map(function(c) {
                            return (
                                <button
                                    key={c.id}
                                    onClick={c.onClick}
                                    style={{
                                        width: '100%',
                                        padding: '22px 20px',
                                        borderRadius: 'var(--radius-lg)',
                                        border: '1px solid transparent',
                                        cursor: 'pointer',
                                        background: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '16px',
                                        textAlign: 'left',
                                        boxShadow: '0 6px 20px rgba(30,136,229,0.30)',
                                        transition: 'all 0.25s ease',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        touchAction: 'manipulation'
                                    }}
                                    onMouseDown={function(e) {
                                        e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                                    }}
                                    onMouseUp={function(e) {
                                        e.currentTarget.style.transform = '';
                                    }}
                                    onMouseLeave={function(e) {
                                        e.currentTarget.style.transform = '';
                                    }}
                                >
                                    <span style={{ fontSize: '36px', marginTop: '2px', lineHeight: 1 }}>{c.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '18px',
                                            fontWeight: 600,
                                            marginBottom: '6px',
                                            fontFamily: "'Oswald', sans-serif",
                                            textTransform: 'uppercase',
                                            letterSpacing: '1.5px'
                                        }}>
                                            {c.title}
                                        </div>
                                        <div style={{
                                            fontSize: '12.5px',
                                            opacity: 0.92,
                                            lineHeight: '1.5',
                                            fontFamily: "'Source Sans 3', sans-serif"
                                        }}>
                                            {c.desc}
                                        </div>
                                    </div>
                                    <span style={{
                                        fontSize: '22px',
                                        opacity: 0.75,
                                        marginTop: '6px'
                                    }}>→</span>

                                    {c.badge && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            background: 'var(--accent-orange)',
                                            color: '#fff',
                                            padding: '3px 10px',
                                            borderRadius: '0 var(--radius-lg) 0 10px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            letterSpacing: '0.5px',
                                            fontFamily: "'Oswald', sans-serif"
                                        }}>
                                            {c.badge}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // UNTERSEITE 1: Staging-Bereich (Baustellen-Button)
        // Etappe 3: 3-Ebenen-Navigation
        //   Ebene 1: Baustellen-Liste mit Status-Indikator + Suche
        //   Ebene 2: 4 Ordner-Kacheln pro Baustelle (Zeichnungen,
        //            Baustellen-App, Bilder, Stunden)
        //   Ebene 3: Read-only Ordner-Browser mit Breadcrumbs
        // Upload/Delete kommt in Etappe 4/5.
        // ═══════════════════════════════════════════════════════
        function StagingBereich({ kunde, onBack }) {
            // ── Navigations-State ──
            // view: 'liste' | 'detail' | 'browser'
            const [view, setView] = useState('liste');
            const [activeBaustelle, setActiveBaustelle] = useState(null);
            const [activeUnterordner, setActiveUnterordner] = useState(null);

            // ── Daten-State fuer die Liste ──
            const [baustellen, setBaustellen] = useState([]);
            const [stagingStatus, setStagingStatus] = useState({});
            const [listeLaedt, setListeLaedt] = useState(false);
            const [listeFehler, setListeFehler] = useState(null);
            const [suche, setSuche] = useState('');
            const [filter, setFilter] = useState('alle'); // 'alle' | 'bereitgestellt' | 'offen'

            // ── Baustellen-Liste laden ──
            async function ladeBaustellen() {
                setListeLaedt(true);
                setListeFehler(null);
                try {
                    if (!window.GoogleDriveService) {
                        throw new Error('Google Drive nicht geladen');
                    }
                    var kunden = await window.GoogleDriveService.listKundenOrdner();
                    setBaustellen(kunden || []);
                    // Status pro Baustelle parallel pruefen (TWStaging aus Etappe 1)
                    if (window.TWStaging) {
                        var statusMap = {};
                        await Promise.all((kunden || []).map(async function(k) {
                            try {
                                var s = await window.TWStaging.isStagingBereitgestellt(k.name);
                                statusMap[k.name] = s || false;
                            } catch (e) {
                                statusMap[k.name] = false;
                            }
                        }));
                        setStagingStatus(statusMap);
                    }
                } catch (e) {
                    setListeFehler(e.message || String(e));
                }
                setListeLaedt(false);
            }

            // ── Initial laden wenn Liste angezeigt ──
            useEffect(function() {
                if (view === 'liste' && baustellen.length === 0 && !listeLaedt && !listeFehler) {
                    ladeBaustellen();
                }
            }, [view]);

            // ── Wenn Kunde vorausgewaehlt: direkt Detail oeffnen ──
            useEffect(function() {
                if (kunde && !activeBaustelle && view === 'liste' && baustellen.length > 0) {
                    var found = baustellen.find(function(b) { return b.name === kunde.name; });
                    if (found) {
                        setActiveBaustelle(found);
                        setView('detail');
                    }
                }
            }, [kunde, baustellen]);

            // ── Gefilterte Liste ──
            var gefiltert = baustellen.filter(function(b) {
                if (suche && b.name.toLowerCase().indexOf(suche.toLowerCase()) === -1) return false;
                var s = stagingStatus[b.name];
                var bereit = !!(s && s.vorhanden);
                if (filter === 'bereitgestellt' && !bereit) return false;
                if (filter === 'offen' && bereit) return false;
                return true;
            });

            // ── EBENE 2: Detail-Ansicht einer Baustelle ──
            if (view === 'detail' && activeBaustelle) {
                return <StagingDetail
                    baustelle={activeBaustelle}
                    stagingStatus={stagingStatus[activeBaustelle.name]}
                    onBack={function(){
                        setActiveBaustelle(null);
                        setView('liste');
                        // Status neu laden fuer diese Baustelle
                        if (window.TWStaging) {
                            window.TWStaging.isStagingBereitgestellt(activeBaustelle.name).then(function(s) {
                                setStagingStatus(function(prev) {
                                    var n = Object.assign({}, prev);
                                    n[activeBaustelle.name] = s || false;
                                    return n;
                                });
                            }).catch(function(){});
                        }
                    }}
                    onOpenUnterordner={function(sub) {
                        setActiveUnterordner(sub);
                        setView('browser');
                    }}
                />;
            }

            // ── EBENE 3: Ordner-Browser ──
            if (view === 'browser' && activeBaustelle && activeUnterordner) {
                return <StagingOrdnerBrowser
                    baustelle={activeBaustelle}
                    unterordner={activeUnterordner}
                    onBack={function(){
                        setActiveUnterordner(null);
                        setView('detail');
                    }}
                />;
            }

            // ── EBENE 1: Baustellen-Liste ──
            return (
                <div className="page-container" style={{
                    padding: '16px',
                    minHeight: '100vh'
                }}>
                    <UnterseitenHeader
                        icon="🏗️"
                        titel="Staging-Bereich"
                        untertitel="Baustellen fuer Mitarbeiter-Geraete bereitstellen"
                        onBack={onBack}
                    />

                    {/* Suchfeld */}
                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                        <span style={{
                            position: 'absolute',
                            left: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '16px',
                            opacity: 0.6,
                            pointerEvents: 'none'
                        }}>🔍</span>
                        <input
                            type="text"
                            value={suche}
                            onChange={function(e){ setSuche(e.target.value); }}
                            placeholder="Baustelle suchen..."
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 40px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-white)',
                                fontSize: '15px',
                                fontFamily: "'Source Sans 3', sans-serif",
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Filter-Pills */}
                    <div style={{
                        display: 'flex',
                        gap: '6px',
                        marginBottom: '14px'
                    }}>
                        {[
                            { id: 'alle', label: 'Alle', count: baustellen.length },
                            { id: 'bereitgestellt', label: 'Bereitgestellt', count: Object.values(stagingStatus).filter(function(s){ return s && s.vorhanden; }).length },
                            { id: 'offen', label: 'Offen', count: baustellen.length - Object.values(stagingStatus).filter(function(s){ return s && s.vorhanden; }).length }
                        ].map(function(f) {
                            var aktiv = filter === f.id;
                            return (
                                <button
                                    key={f.id}
                                    onClick={function(){ setFilter(f.id); }}
                                    style={{
                                        flex: 1,
                                        padding: '8px 6px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid ' + (aktiv ? 'var(--accent-blue)' : 'var(--border-color)'),
                                        background: aktiv ? 'rgba(77,166,255,0.15)' : 'var(--bg-secondary)',
                                        color: aktiv ? 'var(--accent-blue)' : 'var(--text-light)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        fontFamily: "'Oswald', sans-serif",
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    {f.label} <span style={{ opacity: 0.7 }}>({f.count})</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Refresh-Button */}
                    <button
                        onClick={ladeBaustellen}
                        disabled={listeLaedt}
                        style={{
                            width: '100%',
                            padding: '10px',
                            marginBottom: '14px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-light)',
                            fontSize: '12px',
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 500,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            cursor: listeLaedt ? 'not-allowed' : 'pointer',
                            opacity: listeLaedt ? 0.5 : 1,
                            touchAction: 'manipulation'
                        }}
                    >
                        {listeLaedt ? '⏳ Laedt...' : '🔄 Aktualisieren'}
                    </button>

                    {/* Fehler-Anzeige */}
                    {listeFehler && (
                        <div style={{
                            padding: '12px 14px',
                            marginBottom: '14px',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(196,30,30,0.1)',
                            border: '1px solid rgba(196,30,30,0.3)',
                            color: 'var(--accent-red)',
                            fontSize: '13px',
                            lineHeight: 1.5
                        }}>
                            <strong>Fehler beim Laden:</strong><br/>
                            {listeFehler}
                        </div>
                    )}

                    {/* Liste oder Leer-Hinweis */}
                    {listeLaedt && baustellen.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: 'var(--text-muted)'
                        }}>
                            <div style={{ fontSize: '36px', opacity: 0.4, marginBottom: '10px' }}>⏳</div>
                            <div style={{ fontSize: '13px' }}>Baustellen werden geladen...</div>
                        </div>
                    ) : gefiltert.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: 'var(--text-muted)',
                            fontSize: '13px'
                        }}>
                            {suche ? 'Keine Treffer fuer "' + suche + '"' : 'Keine Baustellen in dieser Kategorie'}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {gefiltert.map(function(b) {
                                var status = stagingStatus[b.name];
                                var bereit = !!(status && status.vorhanden);
                                var vollstaendig = !!(status && status.vollstaendig);
                                return (
                                    <button
                                        key={b.id}
                                        onClick={function(){
                                            setActiveBaustelle(b);
                                            setView('detail');
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '14px 16px',
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border-color)',
                                            borderLeft: '4px solid ' + (bereit ? (vollstaendig ? 'var(--success)' : 'var(--accent-orange)') : 'var(--text-muted)'),
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--text-primary)',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            touchAction: 'manipulation'
                                        }}
                                    >
                                        <div style={{
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: '50%',
                                            background: bereit ? (vollstaendig ? 'var(--success)' : 'var(--accent-orange)') : 'var(--text-muted)',
                                            flexShrink: 0,
                                            boxShadow: bereit ? '0 0 8px ' + (vollstaendig ? 'rgba(39,174,96,0.5)' : 'rgba(230,126,34,0.5)') : 'none'
                                        }}></div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                fontFamily: "'Oswald', sans-serif",
                                                letterSpacing: '0.5px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>{b.name}</div>
                                            <div style={{
                                                fontSize: '11px',
                                                color: 'var(--text-muted)',
                                                marginTop: '3px'
                                            }}>
                                                {bereit ? (vollstaendig ? 'Staging bereitgestellt' : 'Staging unvollstaendig') : 'Nicht bereitgestellt'}
                                                {' · '}
                                                {b.letzteAenderung || ''}
                                            </div>
                                        </div>
                                        <span style={{
                                            fontSize: '18px',
                                            color: 'var(--text-muted)',
                                            flexShrink: 0
                                        }}>›</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // STAGING-DETAIL: 4 Ordner-Kacheln einer Baustelle
        // Zeigt den Staging-Status + erlaubt Anlegen wenn nicht vorhanden
        // ═══════════════════════════════════════════════════════
        function StagingDetail({ baustelle, stagingStatus, onBack, onOpenUnterordner }) {
            const [info, setInfo] = useState(null);
            const [laedt, setLaedt] = useState(false);
            const [fehler, setFehler] = useState(null);
            const [anlegeBusy, setAnlegeBusy] = useState(false);

            var bereit = !!(stagingStatus && stagingStatus.vorhanden);

            async function ladeInfo() {
                if (!bereit || !window.TWStaging) return;
                setLaedt(true);
                setFehler(null);
                try {
                    var i = await window.TWStaging.getStagingInfo(baustelle.name);
                    setInfo(i);
                } catch (e) {
                    setFehler(e.message || String(e));
                }
                setLaedt(false);
            }

            useEffect(function() {
                ladeInfo();
            }, [baustelle.name, bereit]);

            async function handleStagingAnlegen() {
                if (!window.TWStaging) {
                    alert('TWStaging-Service nicht verfuegbar');
                    return;
                }
                setAnlegeBusy(true);
                try {
                    await window.TWStaging.createStagingBaustelle(baustelle.name);
                    // Info neu laden
                    await ladeInfo();
                    alert('Staging-Bereich fuer "' + baustelle.name + '" erfolgreich angelegt.');
                } catch (e) {
                    alert('Fehler beim Anlegen:\n\n' + (e.message || String(e)));
                }
                setAnlegeBusy(false);
            }

            // ── Die 4 Standard-Unterordner (aus STAGING_CONFIG) ──
            var cfg = window.STAGING_CONFIG || {};
            var unterordnerListe = (cfg.SUBFOLDERS || ['Zeichnungen', 'Baustellen-App', 'Bilder', 'Stunden']).map(function(name) {
                var icon = '📁';
                var farbe = '#1E88E5';
                if (name === 'Zeichnungen')    { icon = '📐'; farbe = '#2ecc71'; }
                if (name === 'Baustellen-App') { icon = '📱'; farbe = '#3498db'; }
                if (name === 'Bilder')         { icon = '📸'; farbe = '#9b59b6'; }
                if (name === 'Stunden')        { icon = '⏱️'; farbe = '#e67e22'; }
                var daten = info && info.unterordner ? info.unterordner[name] : null;
                return {
                    name: name,
                    icon: icon,
                    farbe: farbe,
                    daten: daten,
                    permission: (cfg.SUBFOLDER_PERMISSIONS || {})[name] || 'readonly'
                };
            });

            return (
                <div className="page-container" style={{
                    padding: '16px',
                    minHeight: '100vh'
                }}>
                    <UnterseitenHeader
                        icon="📁"
                        titel={baustelle.name}
                        untertitel={bereit ? 'Staging-Bereich' : 'Noch nicht bereitgestellt'}
                        onBack={onBack}
                    />

                    {/* Nicht bereitgestellt → Anlege-Button */}
                    {!bereit && (
                        <div style={{
                            padding: '28px 20px',
                            textAlign: 'center',
                            background: 'rgba(230,126,34,0.08)',
                            border: '1px solid rgba(230,126,34,0.25)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '16px'
                        }}>
                            <div style={{ fontSize: '44px', marginBottom: '14px' }}>🚧</div>
                            <div style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '15px',
                                fontWeight: 600,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                color: 'var(--text-light)',
                                marginBottom: '8px'
                            }}>
                                Staging noch nicht angelegt
                            </div>
                            <div style={{
                                fontSize: '13px',
                                color: 'var(--text-muted)',
                                lineHeight: 1.6,
                                marginBottom: '18px'
                            }}>
                                Legt einen neuen Ordner <strong>Baustellen-App-Staging/{baustelle.name}</strong> an
                                mit den vier Unterordnern.
                                Der Original-Kundenordner bleibt dabei unveraendert.
                            </div>
                            <button
                                onClick={handleStagingAnlegen}
                                disabled={anlegeBusy}
                                style={{
                                    padding: '14px 28px',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    background: anlegeBusy
                                        ? 'var(--bg-secondary)'
                                        : 'linear-gradient(135deg, var(--accent-orange), var(--accent-orange-light))',
                                    color: '#fff',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    letterSpacing: '1.2px',
                                    textTransform: 'uppercase',
                                    cursor: anlegeBusy ? 'not-allowed' : 'pointer',
                                    boxShadow: anlegeBusy ? 'none' : 'var(--shadow-md)',
                                    touchAction: 'manipulation'
                                }}
                            >
                                {anlegeBusy ? '⏳ Lege an...' : '✚ Staging anlegen'}
                            </button>
                        </div>
                    )}

                    {/* Unvollstaendig-Hinweis */}
                    {bereit && stagingStatus && !stagingStatus.vollstaendig && (
                        <div style={{
                            padding: '10px 14px',
                            marginBottom: '14px',
                            background: 'rgba(230,126,34,0.1)',
                            border: '1px solid rgba(230,126,34,0.3)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            color: 'var(--accent-orange)',
                            lineHeight: 1.5
                        }}>
                            ⚠️ Einige Unterordner fehlen: {(stagingStatus.fehlendeUnterordner || []).join(', ')}.
                            Neu anlegen vervollstaendigt sie.
                            <button
                                onClick={handleStagingAnlegen}
                                disabled={anlegeBusy}
                                style={{
                                    marginTop: '8px',
                                    padding: '6px 14px',
                                    background: 'var(--accent-orange)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '11px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    touchAction: 'manipulation'
                                }}
                            >
                                {anlegeBusy ? '⏳...' : 'Vervollstaendigen'}
                            </button>
                        </div>
                    )}

                    {/* Ladezustand */}
                    {laedt && (
                        <div style={{
                            textAlign: 'center',
                            padding: '24px',
                            color: 'var(--text-muted)',
                            fontSize: '13px'
                        }}>
                            ⏳ Ordner-Info wird geladen...
                        </div>
                    )}

                    {/* Fehler */}
                    {fehler && (
                        <div style={{
                            padding: '12px 14px',
                            marginBottom: '14px',
                            background: 'rgba(196,30,30,0.1)',
                            border: '1px solid rgba(196,30,30,0.3)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--accent-red)',
                            fontSize: '13px'
                        }}>
                            <strong>Fehler:</strong> {fehler}
                        </div>
                    )}

                    {/* 4 Ordner-Kacheln */}
                    {bereit && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px'
                        }}>
                            {unterordnerListe.map(function(u) {
                                var daten = u.daten;
                                var vorhanden = !!daten;
                                var anzahl = daten ? daten.anzahlDateien : 0;
                                var groesse = daten ? formatiereGroesse(daten.groesseBytes) : '–';
                                var letzte = daten && daten.letzteAenderung
                                    ? new Date(daten.letzteAenderung).toLocaleDateString('de-DE')
                                    : '–';
                                return (
                                    <button
                                        key={u.name}
                                        onClick={function(){
                                            if (vorhanden) {
                                                onOpenUnterordner(u);
                                            }
                                        }}
                                        disabled={!vorhanden}
                                        style={{
                                            padding: '16px 12px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-color)',
                                            background: vorhanden ? 'var(--bg-card)' : 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            cursor: vorhanden ? 'pointer' : 'not-allowed',
                                            opacity: vorhanden ? 1 : 0.5,
                                            textAlign: 'center',
                                            transition: 'all 0.2s',
                                            touchAction: 'manipulation',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <span style={{ fontSize: '32px', color: u.farbe }}>{u.icon}</span>
                                        <div style={{
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            fontFamily: "'Oswald', sans-serif",
                                            letterSpacing: '0.5px',
                                            textTransform: 'uppercase'
                                        }}>{u.name}</div>
                                        <div style={{
                                            fontSize: '11px',
                                            color: 'var(--text-muted)',
                                            lineHeight: 1.4
                                        }}>
                                            <div><strong style={{ color: 'var(--text-light)' }}>{anzahl}</strong> Datei{anzahl !== 1 ? 'en' : ''}</div>
                                            <div>{groesse}</div>
                                            <div style={{ fontSize: '10px', marginTop: '2px' }}>{letzte}</div>
                                        </div>
                                        <div style={{
                                            marginTop: '4px',
                                            fontSize: '9px',
                                            padding: '2px 8px',
                                            background: u.permission === 'upload' ? 'rgba(39,174,96,0.15)' : 'rgba(77,166,255,0.15)',
                                            color: u.permission === 'upload' ? 'var(--success)' : 'var(--accent-blue)',
                                            borderRadius: '4px',
                                            fontFamily: "'Oswald', sans-serif",
                                            fontWeight: 600,
                                            letterSpacing: '0.5px',
                                            textTransform: 'uppercase'
                                        }}>
                                            {u.permission === 'upload' ? 'MA: Upload' : 'MA: nur lesen'}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // ORDNER-BROWSER (read-only in Etappe 3)
        // Breadcrumbs-Navigation, Dateiliste mit Typ/Groesse,
        // Klick auf Datei = Vorschau im Drive-Tab
        // ═══════════════════════════════════════════════════════
        function StagingOrdnerBrowser({ baustelle, unterordner, onBack }) {
            // ── Navigations-Stack (Breadcrumbs) ──
            const [pfad, setPfad] = useState([{ id: unterordner.daten.id, name: unterordner.name }]);
            const [inhalt, setInhalt] = useState({ folders: [], files: [] });
            const [laedt, setLaedt] = useState(false);
            const [fehler, setFehler] = useState(null);
            // ── Etappe 4: Nachlade-Dialog ──
            const [dialogOffen, setDialogOffen] = useState(false);

            // ── Aktueller Ordner = letztes Element im Pfad ──
            var aktuell = pfad[pfad.length - 1];

            async function ladeInhalt() {
                setLaedt(true);
                setFehler(null);
                try {
                    if (!window.GoogleDriveService) {
                        throw new Error('Google Drive nicht geladen');
                    }
                    // Nur direkte Kinder des aktuellen Ordners auflisten
                    var ergebnis = await ladeDirekteKinder(aktuell.id);
                    setInhalt(ergebnis);
                } catch (e) {
                    setFehler(e.message || String(e));
                }
                setLaedt(false);
            }

            useEffect(function() {
                ladeInhalt();
            }, [aktuell.id]);

            function handleFolderClick(f) {
                setPfad(pfad.concat([{ id: f.id, name: f.name }]));
            }

            function handleBreadcrumbClick(index) {
                setPfad(pfad.slice(0, index + 1));
            }

            function handleDateiOeffnen(f) {
                // Drive-Vorschau in neuem Tab oeffnen (Pattern aus OrdnerBrowser v2)
                var url = 'https://drive.google.com/file/d/' + f.id + '/view';
                window.open(url, '_blank');
            }

            // ── Etappe 4: Nach erfolgreichem Kopieren Liste neu laden ──
            function handleDialogFertig() {
                setDialogOffen(false);
                ladeInhalt();
            }

            return (
                <div className="page-container" style={{
                    padding: '16px',
                    minHeight: '100vh'
                }}>
                    <UnterseitenHeader
                        icon={unterordner.icon}
                        titel={unterordner.name}
                        untertitel={baustelle.name}
                        onBack={onBack}
                    />

                    {/* Breadcrumbs */}
                    {pfad.length > 1 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '4px',
                            padding: '10px 12px',
                            marginBottom: '14px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            fontFamily: "'Source Sans 3', sans-serif"
                        }}>
                            {pfad.map(function(p, i) {
                                var letztes = i === pfad.length - 1;
                                return (
                                    <React.Fragment key={p.id}>
                                        {i > 0 && <span style={{ color: 'var(--text-muted)' }}>›</span>}
                                        {letztes ? (
                                            <span style={{
                                                color: 'var(--accent-blue)',
                                                fontWeight: 600
                                            }}>{p.name}</span>
                                        ) : (
                                            <button
                                                onClick={function(){ handleBreadcrumbClick(i); }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--text-light)',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    padding: '2px 4px',
                                                    textDecoration: 'underline',
                                                    touchAction: 'manipulation'
                                                }}
                                            >{p.name}</button>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}

                    {/* Aus Original nachladen — Etappe 4 */}
                    <button
                        onClick={function(){ setDialogOffen(true); }}
                        style={{
                            width: '100%',
                            padding: '14px 16px',
                            marginBottom: '14px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: 'linear-gradient(135deg, var(--accent-orange) 0%, var(--accent-orange-light) 100%)',
                            color: '#fff',
                            fontFamily: "'Oswald', sans-serif",
                            fontSize: '14px',
                            fontWeight: 600,
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(230,126,34,0.30)',
                            transition: 'all 0.25s ease',
                            touchAction: 'manipulation',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>📥</span>
                        <span>Aus Original nachladen</span>
                    </button>

                    {/* Info-Hinweis: Nur Ansicht (fuer Handy-Sicht) */}
                    <div style={{
                        padding: '10px 14px',
                        marginBottom: '14px',
                        background: 'rgba(77,166,255,0.08)',
                        border: '1px solid rgba(77,166,255,0.2)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        color: 'var(--text-light)',
                        lineHeight: 1.5
                    }}>
                        📖 <strong>Nur Ansicht</strong> — Dateien koennen geoeffnet werden. Mitarbeiter
                        sehen nur diesen Ordner, niemals die Original-Kundenakte.
                    </div>

                    {/* Ladezustand */}
                    {laedt && (
                        <div style={{
                            textAlign: 'center',
                            padding: '30px',
                            color: 'var(--text-muted)',
                            fontSize: '13px'
                        }}>
                            ⏳ Inhalte werden geladen...
                        </div>
                    )}

                    {/* Fehler */}
                    {fehler && (
                        <div style={{
                            padding: '12px 14px',
                            marginBottom: '14px',
                            background: 'rgba(196,30,30,0.1)',
                            border: '1px solid rgba(196,30,30,0.3)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--accent-red)',
                            fontSize: '13px'
                        }}>
                            <strong>Fehler:</strong> {fehler}
                        </div>
                    )}

                    {/* Leer */}
                    {!laedt && !fehler && inhalt.folders.length === 0 && inhalt.files.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: 'var(--text-muted)'
                        }}>
                            <div style={{ fontSize: '44px', opacity: 0.4, marginBottom: '12px' }}>📂</div>
                            <div style={{ fontSize: '13px' }}>Dieser Ordner ist leer</div>
                            <div style={{ fontSize: '11px', marginTop: '6px' }}>
                                Oben "Aus Original nachladen" antippen, um Dateien zu kopieren
                            </div>
                        </div>
                    )}

                    {/* Unterordner */}
                    {inhalt.folders.length > 0 && (
                        <div style={{ marginBottom: '14px' }}>
                            <div style={{
                                fontSize: '11px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                color: 'var(--text-muted)',
                                marginBottom: '8px',
                                paddingLeft: '4px'
                            }}>
                                Ordner ({inhalt.folders.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {inhalt.folders.map(function(f) {
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={function(){ handleFolderClick(f); }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 12px',
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-sm)',
                                                color: 'var(--text-primary)',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                touchAction: 'manipulation'
                                            }}
                                        >
                                            <span style={{ fontSize: '18px' }}>📁</span>
                                            <span style={{
                                                flex: 1,
                                                fontSize: '13px',
                                                fontFamily: "'Source Sans 3', sans-serif",
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>{f.name}</span>
                                            <span style={{ color: 'var(--text-muted)' }}>›</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Dateien */}
                    {inhalt.files.length > 0 && (
                        <div>
                            <div style={{
                                fontSize: '11px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                color: 'var(--text-muted)',
                                marginBottom: '8px',
                                paddingLeft: '4px'
                            }}>
                                Dateien ({inhalt.files.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {inhalt.files.map(function(f) {
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={function(){ handleDateiOeffnen(f); }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 12px',
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-sm)',
                                                color: 'var(--text-primary)',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                touchAction: 'manipulation'
                                            }}
                                        >
                                            <span style={{ fontSize: '18px' }}>{dateiIcon(f.name, f.mimeType)}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: '13px',
                                                    fontFamily: "'Source Sans 3', sans-serif",
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>{f.name}</div>
                                                <div style={{
                                                    fontSize: '10.5px',
                                                    color: 'var(--text-muted)',
                                                    marginTop: '1px'
                                                }}>
                                                    {formatiereGroesse(parseInt(f.size, 10) || 0)}
                                                    {f.modifiedTime ? ' · ' + new Date(f.modifiedTime).toLocaleDateString('de-DE') : ''}
                                                </div>
                                            </div>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>↗</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Etappe 4: Nachlade-Dialog */}
                    {dialogOffen && (
                        <NachladenDialog
                            baustelle={baustelle}
                            zielOrdnerId={aktuell.id}
                            zielOrdnerName={aktuell.name}
                            onSchliessen={function(){ setDialogOffen(false); }}
                            onFertig={handleDialogFertig}
                        />
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // NACHLADE-DIALOG (Etappe 4)
        // Zeigt alle 10 Original-Kundenordner + ihre Dateien,
        // erlaubt Multi-Select und kopiert via files.copy ins Staging.
        // 3 Phasen:
        //   1. Ordnerwahl — zeigt Liste der Original-Ordner
        //   2. Dateiwahl  — zeigt Dateien des gewaehlten Ordners, Multi-Select
        //   3. Fortschritt — Kopier-Fortschrittsbalken und Ergebnis-Log
        // ═══════════════════════════════════════════════════════
        function NachladenDialog({ baustelle, zielOrdnerId, zielOrdnerName, onSchliessen, onFertig }) {
            // phase: 'ordnerwahl' | 'dateiwahl' | 'kopiert' | 'fertig'
            const [phase, setPhase] = useState('ordnerwahl');
            const [originaleOrdner, setOriginaleOrdner] = useState([]);
            const [ordnerLaedt, setOrdnerLaedt] = useState(false);
            const [ordnerFehler, setOrdnerFehler] = useState(null);
            const [aktivOrdner, setAktivOrdner] = useState(null);
            const [dateien, setDateien] = useState([]);
            const [dateienLaedt, setDateienLaedt] = useState(false);
            const [dateienFehler, setDateienFehler] = useState(null);
            const [ausgewaehlt, setAusgewaehlt] = useState({}); // {fileId: true}
            const [suche, setSuche] = useState('');
            const [konfliktStrategie, setKonfliktStrategie] = useState('fragen'); // 'fragen' | 'ueberspringen' | 'ueberschreiben' | 'umbenennen'
            const [kopierFortschritt, setKopierFortschritt] = useState({ current: 0, total: 0, aktuelleDatei: null });
            const [kopierErgebnisse, setKopierErgebnisse] = useState([]);

            // ── Original-Kundenordner laden (10 Ordner) ──
            async function ladeOriginaleOrdner() {
                setOrdnerLaedt(true);
                setOrdnerFehler(null);
                try {
                    if (!baustelle.id) {
                        throw new Error('Kein Baustellen-Ordner-ID vorhanden');
                    }
                    var ordner = await window.TWStaging.listOriginaleKundenOrdner(baustelle.id);
                    setOriginaleOrdner(ordner || []);
                } catch (e) {
                    setOrdnerFehler(e.message || String(e));
                }
                setOrdnerLaedt(false);
            }

            useEffect(function() {
                ladeOriginaleOrdner();
            }, [baustelle.id]);

            // ── Dateien eines Original-Ordners laden ──
            async function ladeDateien(ordner) {
                setAktivOrdner(ordner);
                setPhase('dateiwahl');
                setAusgewaehlt({});
                setSuche('');
                setDateienLaedt(true);
                setDateienFehler(null);
                try {
                    var list = await window.TWStaging.listDateienInOrdner(ordner.id);
                    // Nur Dateien zeigen, keine Unterordner (in Etappe 4 erstmal flach)
                    var nurDateien = (list || []).filter(function(f) {
                        return f.mimeType !== 'application/vnd.google-apps.folder';
                    });
                    setDateien(nurDateien);
                } catch (e) {
                    setDateienFehler(e.message || String(e));
                }
                setDateienLaedt(false);
            }

            // ── Checkbox toggeln ──
            function toggleDatei(id) {
                setAusgewaehlt(function(prev) {
                    var neu = Object.assign({}, prev);
                    if (neu[id]) delete neu[id]; else neu[id] = true;
                    return neu;
                });
            }

            function alleWaehlen() {
                var neu = {};
                dateienGefiltert.forEach(function(f) { neu[f.id] = true; });
                setAusgewaehlt(neu);
            }
            function keineWaehlen() {
                setAusgewaehlt({});
            }

            // ── Gefilterte Dateiliste ──
            var dateienGefiltert = dateien.filter(function(f) {
                if (!suche) return true;
                return f.name.toLowerCase().indexOf(suche.toLowerCase()) !== -1;
            });

            var anzahlAusgewaehlt = Object.keys(ausgewaehlt).length;
            var ausgewaehlteDateien = dateien.filter(function(f) { return ausgewaehlt[f.id]; });
            var gesamtGroesse = ausgewaehlteDateien.reduce(function(sum, f) {
                return sum + (parseInt(f.size, 10) || 0);
            }, 0);
            var grosseDateien = ausgewaehlteDateien.filter(function(f) {
                return (parseInt(f.size, 10) || 0) > (window.STAGING_CONFIG.WARN_COPY_SIZE_MB * 1024 * 1024);
            });

            // ── Kopier-Vorgang starten ──
            async function handleKopieren() {
                if (anzahlAusgewaehlt === 0) return;

                // Grosse Dateien warnen
                if (grosseDateien.length > 0) {
                    var ok = confirm(
                        grosseDateien.length + ' Datei(en) sind groesser als ' + window.STAGING_CONFIG.WARN_COPY_SIZE_MB + ' MB.\n\n' +
                        'Das Kopieren kann laenger dauern. Trotzdem starten?'
                    );
                    if (!ok) return;
                }

                // Konflikt-Strategie klaeren falls 'fragen'
                var strategie = konfliktStrategie;
                if (strategie === 'fragen') {
                    // Vorab pruefen, ob es Konflikte gibt
                    var konflikte = [];
                    for (var i = 0; i < ausgewaehlteDateien.length; i++) {
                        var d = ausgewaehlteDateien[i];
                        var k = await window.TWStaging.findDateiImOrdner(zielOrdnerId, d.name);
                        if (k) konflikte.push(d.name);
                    }
                    if (konflikte.length > 0) {
                        var antwort = prompt(
                            konflikte.length + ' Datei(en) existieren bereits:\n' +
                            konflikte.slice(0, 5).join('\n') +
                            (konflikte.length > 5 ? '\n... und ' + (konflikte.length - 5) + ' weitere' : '') +
                            '\n\nStrategie:\n' +
                            '1 = Ueberspringen (nur neue kopieren)\n' +
                            '2 = Ueberschreiben (alte ersetzen)\n' +
                            '3 = Umbenennen (beide behalten)\n\n' +
                            'Zahl 1-3 eingeben:',
                            '1'
                        );
                        if (antwort === null) return;
                        if (antwort === '1') strategie = 'ueberspringen';
                        else if (antwort === '2') strategie = 'ueberschreiben';
                        else if (antwort === '3') strategie = 'umbenennen';
                        else { alert('Ungueltige Eingabe. Vorgang abgebrochen.'); return; }
                    } else {
                        strategie = 'ueberspringen'; // Fallback ohne Konflikte
                    }
                }

                setPhase('kopiert');
                setKopierFortschritt({ current: 0, total: ausgewaehlteDateien.length, aktuelleDatei: null });
                setKopierErgebnisse([]);

                var dateiIds = ausgewaehlteDateien.map(function(f) { return f.id; });
                var ergebnisse = await window.TWStaging.copyMultipleFiles(
                    dateiIds,
                    zielOrdnerId,
                    { onConflict: strategie },
                    function(current, total, name, result) {
                        setKopierFortschritt({ current: current, total: total, aktuelleDatei: name });
                        if (result) {
                            setKopierErgebnisse(function(prev) { return prev.concat([result]); });
                        }
                    }
                );
                setPhase('fertig');
                setKopierErgebnisse(ergebnisse.map(function(r) {
                    if (r.ok) return r.ergebnis;
                    return { status: 'fehler', fehler: r.fehler };
                }));
            }

            // ─── RENDER ─────────────────────────────────────────
            return (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.75)',
                    zIndex: 300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                }} onClick={function(e) {
                    // Schliessen bei Klick auf Overlay (nicht auf Modal)
                    if (e.target === e.currentTarget && phase !== 'kopiert') {
                        onSchliessen();
                    }
                }}>
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        width: '100%',
                        maxWidth: '520px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-lg)'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <span style={{ fontSize: '24px' }}>📥</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-primary)'
                                }}>
                                    Aus Original nachladen
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    marginTop: '2px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    → {zielOrdnerName}
                                </div>
                            </div>
                            {phase !== 'kopiert' && (
                                <button onClick={onSchliessen} style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '22px',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    touchAction: 'manipulation'
                                }}>✕</button>
                            )}
                        </div>

                        {/* Body: scrollbar */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '16px 20px'
                        }}>
                            {phase === 'ordnerwahl' && (
                                <PhaseOrdnerwahl
                                    ordner={originaleOrdner}
                                    laedt={ordnerLaedt}
                                    fehler={ordnerFehler}
                                    onWaehlen={ladeDateien}
                                />
                            )}
                            {phase === 'dateiwahl' && (
                                <PhaseDateiwahl
                                    ordner={aktivOrdner}
                                    dateien={dateienGefiltert}
                                    alleDateien={dateien}
                                    laedt={dateienLaedt}
                                    fehler={dateienFehler}
                                    suche={suche}
                                    setSuche={setSuche}
                                    ausgewaehlt={ausgewaehlt}
                                    toggleDatei={toggleDatei}
                                    alleWaehlen={alleWaehlen}
                                    keineWaehlen={keineWaehlen}
                                    konfliktStrategie={konfliktStrategie}
                                    setKonfliktStrategie={setKonfliktStrategie}
                                />
                            )}
                            {phase === 'kopiert' && (
                                <PhaseFortschritt
                                    fortschritt={kopierFortschritt}
                                    ergebnisse={kopierErgebnisse}
                                />
                            )}
                            {phase === 'fertig' && (
                                <PhaseFertig ergebnisse={kopierErgebnisse} />
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '14px 20px',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'var(--bg-tertiary)'
                        }}>
                            {phase === 'ordnerwahl' && (
                                <button onClick={onSchliessen} style={dialogBtnStyle('secondary')}>
                                    Abbrechen
                                </button>
                            )}
                            {phase === 'dateiwahl' && (
                                <React.Fragment>
                                    <button onClick={function(){ setPhase('ordnerwahl'); }} style={dialogBtnStyle('secondary')}>
                                        ← Zurueck
                                    </button>
                                    <div style={{ flex: 1, textAlign: 'center' }}>
                                        {anzahlAusgewaehlt > 0 && (
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {anzahlAusgewaehlt} Datei{anzahlAusgewaehlt !== 1 ? 'en' : ''} · {formatiereGroesse(gesamtGroesse)}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleKopieren}
                                        disabled={anzahlAusgewaehlt === 0}
                                        style={dialogBtnStyle(anzahlAusgewaehlt > 0 ? 'primary' : 'disabled')}
                                    >
                                        📋 Kopieren
                                    </button>
                                </React.Fragment>
                            )}
                            {phase === 'kopiert' && (
                                <div style={{ flex: 1, textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                                    Bitte nicht schliessen...
                                </div>
                            )}
                            {phase === 'fertig' && (
                                <button onClick={onFertig} style={Object.assign({}, dialogBtnStyle('primary'), { width: '100%' })}>
                                    ✓ Fertig
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // ─── NACHLADE-DIALOG: PHASE 1 — ORDNERWAHL ───────────────
        function PhaseOrdnerwahl({ ordner, laedt, fehler, onWaehlen }) {
            if (laedt) {
                return (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        ⏳ Original-Ordner werden geladen...
                    </div>
                );
            }
            if (fehler) {
                return (
                    <div style={{
                        padding: '12px 14px',
                        background: 'rgba(196,30,30,0.1)',
                        border: '1px solid rgba(196,30,30,0.3)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--accent-red)',
                        fontSize: '13px'
                    }}>
                        <strong>Fehler:</strong> {fehler}
                    </div>
                );
            }
            if (ordner.length === 0) {
                return (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Keine Original-Ordner gefunden.
                    </div>
                );
            }
            return (
                <div>
                    <div style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        marginBottom: '12px',
                        lineHeight: 1.5
                    }}>
                        Aus welchem Original-Ordner sollen Dateien kopiert werden?
                        Die Originale bleiben unveraendert, es wird nur eine Kopie angelegt.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {ordner.map(function(o) {
                            return (
                                <button
                                    key={o.id}
                                    onClick={function(){ onWaehlen(o); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 14px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--text-primary)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    <span style={{ fontSize: '20px' }}>{ordnerIcon(o.name)}</span>
                                    <span style={{
                                        flex: 1,
                                        fontSize: '13px',
                                        fontFamily: "'Source Sans 3', sans-serif",
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>{o.name}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>›</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // ─── NACHLADE-DIALOG: PHASE 2 — DATEIWAHL ────────────────
        function PhaseDateiwahl({ ordner, dateien, alleDateien, laedt, fehler, suche, setSuche, ausgewaehlt, toggleDatei, alleWaehlen, keineWaehlen, konfliktStrategie, setKonfliktStrategie }) {
            var anzahl = Object.keys(ausgewaehlt).length;
            return (
                <div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                        padding: '8px 10px',
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px'
                    }}>
                        <span style={{ fontSize: '16px' }}>{ordnerIcon(ordner.name)}</span>
                        <span style={{
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            color: 'var(--text-light)',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>{ordner.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{alleDateien.length} Dateien</span>
                    </div>

                    {/* Suche */}
                    <input
                        type="text"
                        value={suche}
                        onChange={function(e){ setSuche(e.target.value); }}
                        placeholder="In Dateien suchen..."
                        style={{
                            width: '100%',
                            padding: '9px 12px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-white)',
                            fontSize: '13px',
                            marginBottom: '10px',
                            boxSizing: 'border-box',
                            outline: 'none'
                        }}
                    />

                    {/* Select All / None */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                        <button onClick={alleWaehlen} style={dialogBtnStyle('tiny')}>Alle waehlen</button>
                        <button onClick={keineWaehlen} style={dialogBtnStyle('tiny')} disabled={anzahl === 0}>Leeren</button>
                        <div style={{ flex: 1 }}></div>
                        <div style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            alignSelf: 'center',
                            fontFamily: "'Oswald', sans-serif"
                        }}>
                            {anzahl}/{alleDateien.length} gewaehlt
                        </div>
                    </div>

                    {/* Dateiliste */}
                    {laedt ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                            ⏳ Dateien werden geladen...
                        </div>
                    ) : fehler ? (
                        <div style={{
                            padding: '10px 12px',
                            background: 'rgba(196,30,30,0.1)',
                            border: '1px solid rgba(196,30,30,0.3)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--accent-red)',
                            fontSize: '12px'
                        }}>
                            {fehler}
                        </div>
                    ) : dateien.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            {suche ? 'Keine Treffer' : 'Ordner ist leer'}
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            maxHeight: '280px',
                            overflowY: 'auto',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px'
                        }}>
                            {dateien.map(function(f) {
                                var gewaehlt = !!ausgewaehlt[f.id];
                                var groesseBytes = parseInt(f.size, 10) || 0;
                                var gross = groesseBytes > (window.STAGING_CONFIG.WARN_COPY_SIZE_MB * 1024 * 1024);
                                return (
                                    <label
                                        key={f.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '7px 10px',
                                            background: gewaehlt ? 'rgba(77,166,255,0.12)' : 'transparent',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={gewaehlt}
                                            onChange={function(){ toggleDatei(f.id); }}
                                            style={{
                                                width: '18px',
                                                height: '18px',
                                                cursor: 'pointer',
                                                accentColor: '#1E88E5',
                                                flexShrink: 0
                                            }}
                                        />
                                        <span style={{ fontSize: '15px', flexShrink: 0 }}>{dateiIcon(f.name, f.mimeType)}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '12.5px',
                                                color: 'var(--text-primary)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>{f.name}</div>
                                            <div style={{
                                                fontSize: '10px',
                                                color: gross ? 'var(--accent-orange)' : 'var(--text-muted)',
                                                marginTop: '1px'
                                            }}>
                                                {formatiereGroesse(groesseBytes)}
                                                {gross && <span> · gross</span>}
                                                {f.modifiedTime ? ' · ' + new Date(f.modifiedTime).toLocaleDateString('de-DE') : ''}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    {/* Konflikt-Strategie */}
                    <div style={{ marginTop: '14px' }}>
                        <div style={{
                            fontSize: '11px',
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 600,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                            marginBottom: '6px'
                        }}>
                            Bei Namenskonflikt
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {[
                                { id: 'fragen', label: 'Nachfragen' },
                                { id: 'ueberspringen', label: 'Ueberspringen' },
                                { id: 'ueberschreiben', label: 'Ueberschreiben' },
                                { id: 'umbenennen', label: 'Umbenennen' }
                            ].map(function(opt) {
                                var aktiv = konfliktStrategie === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={function(){ setKonfliktStrategie(opt.id); }}
                                        style={{
                                            flex: 1,
                                            padding: '7px 4px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid ' + (aktiv ? 'var(--accent-blue)' : 'var(--border-color)'),
                                            background: aktiv ? 'rgba(77,166,255,0.15)' : 'var(--bg-card)',
                                            color: aktiv ? 'var(--accent-blue)' : 'var(--text-light)',
                                            fontSize: '10.5px',
                                            fontFamily: "'Oswald', sans-serif",
                                            fontWeight: 500,
                                            letterSpacing: '0.3px',
                                            cursor: 'pointer',
                                            touchAction: 'manipulation'
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        // ─── NACHLADE-DIALOG: PHASE 3 — FORTSCHRITT ──────────────
        function PhaseFortschritt({ fortschritt, ergebnisse }) {
            var prozent = fortschritt.total > 0
                ? Math.round((fortschritt.current / fortschritt.total) * 100)
                : 0;
            return (
                <div>
                    <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📋</div>
                        <div style={{
                            fontFamily: "'Oswald', sans-serif",
                            fontSize: '15px',
                            fontWeight: 600,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            color: 'var(--text-light)'
                        }}>
                            Dateien werden kopiert
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                            {fortschritt.current} / {fortschritt.total}
                        </div>
                    </div>

                    {/* Fortschrittsbalken */}
                    <div style={{
                        width: '100%',
                        height: '10px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '5px',
                        overflow: 'hidden',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            height: '100%',
                            width: prozent + '%',
                            background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-orange))',
                            transition: 'width 0.3s ease',
                            borderRadius: '5px'
                        }}></div>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        {prozent}%
                    </div>

                    {/* Ergebnis-Log */}
                    <div style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px'
                    }}>
                        {ergebnisse.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '12px' }}>
                                Bereitet vor...
                            </div>
                        ) : ergebnisse.map(function(r, i) {
                            var icon = r.status === 'kopiert' ? '✓' : r.status === 'uebersprungen' ? '⊘' : '✗';
                            var farbe = r.status === 'kopiert' ? 'var(--success)' :
                                         r.status === 'uebersprungen' ? 'var(--text-muted)' :
                                         'var(--accent-red)';
                            return (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '4px 0',
                                    fontSize: '11.5px',
                                    fontFamily: "'Source Sans 3', sans-serif",
                                    borderBottom: '1px solid var(--border-color)'
                                }}>
                                    <span style={{ color: farbe, fontWeight: 700, width: '14px', flexShrink: 0 }}>{icon}</span>
                                    <span style={{
                                        flex: 1,
                                        color: 'var(--text-light)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>{r.name || r.fehler || '?'}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // ─── NACHLADE-DIALOG: PHASE 4 — FERTIG ───────────────────
        function PhaseFertig({ ergebnisse }) {
            var kopiert = ergebnisse.filter(function(r) { return r.status === 'kopiert'; }).length;
            var uebersprungen = ergebnisse.filter(function(r) { return r.status === 'uebersprungen'; }).length;
            var fehler = ergebnisse.filter(function(r) { return r.status === 'fehler'; }).length;
            return (
                <div>
                    <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                        <div style={{ fontSize: '56px', marginBottom: '10px' }}>
                            {fehler === 0 ? '✅' : '⚠️'}
                        </div>
                        <div style={{
                            fontFamily: "'Oswald', sans-serif",
                            fontSize: '16px',
                            fontWeight: 600,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            color: fehler === 0 ? 'var(--success)' : 'var(--accent-orange)'
                        }}>
                            {fehler === 0 ? 'Kopieren abgeschlossen' : 'Mit Fehlern beendet'}
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '8px',
                        marginBottom: '14px'
                    }}>
                        <div style={{
                            padding: '10px',
                            background: 'rgba(39,174,96,0.1)',
                            border: '1px solid rgba(39,174,96,0.3)',
                            borderRadius: 'var(--radius-sm)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)' }}>{kopiert}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kopiert</div>
                        </div>
                        <div style={{
                            padding: '10px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-light)' }}>{uebersprungen}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Uebersprungen</div>
                        </div>
                        <div style={{
                            padding: '10px',
                            background: fehler > 0 ? 'rgba(196,30,30,0.1)' : 'var(--bg-card)',
                            border: '1px solid ' + (fehler > 0 ? 'rgba(196,30,30,0.3)' : 'var(--border-color)'),
                            borderRadius: 'var(--radius-sm)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: fehler > 0 ? 'var(--accent-red)' : 'var(--text-light)' }}>{fehler}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fehler</div>
                        </div>
                    </div>

                    {/* Fehler-Details */}
                    {fehler > 0 && (
                        <div style={{
                            padding: '10px 12px',
                            background: 'rgba(196,30,30,0.05)',
                            border: '1px solid rgba(196,30,30,0.2)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            color: 'var(--text-light)',
                            lineHeight: 1.5
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--accent-red)' }}>
                                Fehler-Details:
                            </div>
                            {ergebnisse.filter(function(r) { return r.status === 'fehler'; }).slice(0, 5).map(function(r, i) {
                                return <div key={i} style={{ marginTop: '2px' }}>• {r.fehler}</div>;
                            })}
                        </div>
                    )}
                </div>
            );
        }

        // ── Icon-Mapping fuer Original-Ordner ──
        function ordnerIcon(name) {
            var n = (name || '').toLowerCase();
            if (n.indexOf('zeichn') !== -1 || n.indexOf('plan') !== -1) return '📐';
            if (n.indexOf('bild') !== -1 || n.indexOf('foto') !== -1) return '📸';
            if (n.indexOf('stunden') !== -1 || n.indexOf('rapport') !== -1) return '⏱️';
            if (n.indexOf('rechnung') !== -1) return '💰';
            if (n.indexOf('angebot') !== -1 || n.indexOf('nachtr') !== -1 || n.indexOf('lv') !== -1) return '📑';
            if (n.indexOf('schriftv') !== -1 || n.indexOf('mail') !== -1) return '✉️';
            if (n.indexOf('lieferant') !== -1 || n.indexOf('material') !== -1) return '🏗️';
            if (n.indexOf('aufma') !== -1) return '📏';
            if (n.indexOf('kunden-daten') !== -1 || n.indexOf('kundendaten') !== -1) return '👤';
            if (n.indexOf('baustellenausw') !== -1 || n.indexOf('auswert') !== -1) return '📋';
            if (n.indexOf('baustellen-app') !== -1) return '📱';
            return '📁';
        }

        // ── Style-Helfer fuer Dialog-Buttons ──
        function dialogBtnStyle(variant) {
            var base = {
                padding: '9px 16px',
                borderRadius: 'var(--radius-sm)',
                fontFamily: "'Oswald', sans-serif",
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                touchAction: 'manipulation',
                transition: 'all 0.2s'
            };
            if (variant === 'primary') {
                return Object.assign(base, {
                    background: 'linear-gradient(135deg, var(--accent-orange), var(--accent-orange-light))',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(230,126,34,0.25)'
                });
            }
            if (variant === 'secondary') {
                return Object.assign(base, {
                    background: 'var(--bg-card)',
                    color: 'var(--text-light)',
                    border: '1px solid var(--border-color)'
                });
            }
            if (variant === 'tiny') {
                return Object.assign(base, {
                    padding: '6px 10px',
                    fontSize: '10.5px',
                    background: 'var(--bg-card)',
                    color: 'var(--text-light)',
                    border: '1px solid var(--border-color)'
                });
            }
            if (variant === 'disabled') {
                return Object.assign(base, {
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    cursor: 'not-allowed',
                    opacity: 0.5
                });
            }
            return base;
        }

        // ═══════════════════════════════════════════════════════
        // HILFSFUNKTIONEN fuer Staging-Browser
        // ═══════════════════════════════════════════════════════

        // ── Direkte Kinder eines Drive-Ordners laden ──
        // (im Gegensatz zu listFolderContents laedt dies KEINE Unterordner-
        //  inhalte rekursiv — wir wollen echte Breadcrumb-Navigation)
        async function ladeDirekteKinder(folderId) {
            if (!window.gapi || !window.gapi.client || !window.gapi.client.drive) {
                throw new Error('Google Drive API nicht initialisiert');
            }
            var q = "'" + folderId + "' in parents and trashed=false";
            var res = await window.gapi.client.drive.files.list({
                q: q,
                fields: 'files(id, name, mimeType, size, modifiedTime)',
                orderBy: 'folder,name',
                pageSize: 500,
                spaces: 'drive'
            });
            var files = (res && res.result && res.result.files) || [];
            var folders = [];
            var fileListe = [];
            files.forEach(function(f) {
                if (f.mimeType === 'application/vnd.google-apps.folder') {
                    folders.push(f);
                } else {
                    fileListe.push(f);
                }
            });
            return { folders: folders, files: fileListe };
        }

        // ── Byte-Anzahl in lesbares Format ──
        function formatiereGroesse(bytes) {
            if (!bytes || bytes === 0) return '0 B';
            var units = ['B', 'KB', 'MB', 'GB'];
            var i = 0;
            var v = bytes;
            while (v >= 1024 && i < units.length - 1) {
                v = v / 1024;
                i++;
            }
            return (v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)) + ' ' + units[i];
        }

        // ── Datei-Icon basierend auf Typ/Endung ──
        function dateiIcon(name, mimeType) {
            var n = (name || '').toLowerCase();
            var m = (mimeType || '').toLowerCase();
            if (m.indexOf('pdf') !== -1 || n.endsWith('.pdf')) return '📕';
            if (m.indexOf('image') !== -1 || n.match(/\.(jpg|jpeg|png|gif|webp|heic)$/)) return '🖼️';
            if (m.indexOf('spreadsheet') !== -1 || n.match(/\.(xlsx?|csv|ods)$/)) return '📊';
            if (m.indexOf('document') !== -1 || n.match(/\.(docx?|odt|rtf)$/)) return '📄';
            if (m.indexOf('video') !== -1 || n.match(/\.(mp4|mov|avi|webm)$/)) return '🎬';
            if (m.indexOf('audio') !== -1 || n.match(/\.(mp3|wav|m4a|ogg)$/)) return '🎵';
            if (n.match(/\.(zip|rar|7z|tar|gz)$/)) return '🗜️';
            if (n.match(/\.(dwg|dxf)$/)) return '📐';
            return '📎';
        }

        // ═══════════════════════════════════════════════════════
        // UNTERSEITE 2: Geraete- und Team-Verwaltung
        // Recycling der bisherigen Team-Logik aus altem teamTab
        // ═══════════════════════════════════════════════════════
        function TeamVerwaltung({ fbOk, users, onApprove, onReject, onBack }) {
            var content;
            if (!fbOk) {
                content = (
                    <div style={{ textAlign:'center', padding:'40px 16px', color:'var(--text-muted)' }}>
                        <div style={{ fontSize:'48px', opacity:0.4, marginBottom:'12px' }}>🔌</div>
                        <div style={{ fontSize:'13px', marginBottom:'6px' }}>Firebase nicht verbunden</div>
                        <div style={{ fontSize:'12px' }}>Im Sync-Bereich verbinden, dann sind Team-Freigaben verfuegbar.</div>
                    </div>
                );
            } else {
                content = (
                    <div>
                        <div className="ba-card">
                            <div className="ba-card-title">
                                ⏳ Wartende Freigaben
                                {users.pending.length > 0 && (
                                    <span style={{
                                        background:'var(--accent-orange)', color:'#fff',
                                        borderRadius:'10px', padding:'1px 8px',
                                        fontSize:'11px', fontWeight:700, marginLeft:'6px'
                                    }}>{users.pending.length}</span>
                                )}
                            </div>
                            {users.pending.length === 0 ? (
                                <div style={{ textAlign:'center', padding:'16px', color:'var(--text-muted)', fontSize:'13px' }}>
                                    Keine wartenden Anfragen
                                </div>
                            ) : users.pending.map(function(u) {
                                var p = u.profile || {};
                                var name = p.name || ((p.vorname||'') + ' ' + (p.nachname||'')).trim() || 'Unbekannt';
                                return (
                                    <div key={u.uid} className="ba-row">
                                        <div style={{ flex:1 }}>
                                            <div className="ba-name">{name}</div>
                                            <div className="ba-detail">{p.telefon||p.tel||''} · {p.email||''} · {u.language||'de'}</div>
                                        </div>
                                        <div style={{ display:'flex', gap:'6px' }}>
                                            <button className="ba-btn grn" onClick={function(){ onApprove(u.uid, name); }}>✓</button>
                                            <button className="ba-btn red" onClick={function(){ onReject(u.uid, name); }}>✗</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="ba-card">
                            <div className="ba-card-title">👥 Aktive Mitarbeiter ({users.approved.length})</div>
                            {users.approved.length === 0 ? (
                                <div style={{ textAlign:'center', padding:'16px', color:'var(--text-muted)', fontSize:'13px' }}>
                                    Noch keine Mitarbeiter
                                </div>
                            ) : users.approved.map(function(u) {
                                var p = u.profile || {};
                                return (
                                    <div key={u.uid} className="ba-row">
                                        <div style={{ flex:1 }}>
                                            <div className="ba-name">
                                                {p.name || 'Mitarbeiter'}
                                                {u.role === 'admin' && (
                                                    <span style={{
                                                        marginLeft:'6px', fontSize:'10px',
                                                        background:'var(--accent-blue)', color:'#fff',
                                                        padding:'1px 6px', borderRadius:'6px'
                                                    }}>ADMIN</span>
                                                )}
                                            </div>
                                            <div className="ba-detail">Sprache: {u.language||'de'} · Aktiv</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }

            return (
                <div className="page-container" style={{ padding:'16px', minHeight:'100vh' }}>
                    <UnterseitenHeader
                        icon="👥"
                        titel="Geraeteverwaltung"
                        untertitel="Mitarbeiter und Zugangsberechtigungen"
                        onBack={onBack}
                    />
                    {content}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // UNTERSEITE 3: Synchronisation (Sync + Config)
        // Recycling der bisherigen Sync- und Config-Tabs
        // ═══════════════════════════════════════════════════════
        function SynchronisationsBereich({ fbOk, fbConfig, setFbConfig, syncStatus, log, busy, projects, onConnect, onDisconnect, onSync, onBack }) {
            var syncPanel = !fbOk ? null : (
                <div>
                    <div className="ba-card">
                        <div className="ba-card-title">📊 Status</div>
                        <div className="ba-stats">
                            <div className="ba-stat">
                                <div className="ba-stat-val">{syncStatus.projects}</div>
                                <div className="ba-stat-lbl">Projekte</div>
                            </div>
                            <div className="ba-stat">
                                <div className="ba-stat-val">{syncStatus.users}</div>
                                <div className="ba-stat-lbl">Benutzer</div>
                            </div>
                            <div className="ba-stat">
                                <div className="ba-stat-val" style={{ fontSize:'15px' }}>
                                    {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleTimeString('de-DE') : '-'}
                                </div>
                                <div className="ba-stat-lbl">Letzter Sync</div>
                            </div>
                            <div className="ba-stat">
                                <div className="ba-stat-val" style={{ color:'var(--success)' }}>●</div>
                                <div className="ba-stat-lbl">Firebase</div>
                            </div>
                        </div>
                        <button className="ba-btn blu" onClick={onSync} disabled={busy}
                            style={{ marginTop:'14px', width:'100%' }}>
                            {busy ? '⏳ Sync...' : '🔄 Jetzt synchronisieren'}
                        </button>
                    </div>
                    <div className="ba-card">
                        <div className="ba-card-title">📋 Protokoll</div>
                        <div className="ba-log">
                            {log.length === 0 ? (
                                <div style={{ color:'var(--text-muted)', textAlign:'center', padding:'8px' }}>
                                    Noch keine Eintraege
                                </div>
                            ) : log.map(function(e,i) {
                                return (
                                    <div key={i} style={{
                                        padding:'3px 0',
                                        borderBottom:'1px solid var(--border-color)',
                                        color:'var(--text-muted)'
                                    }}>
                                        <span style={{ color:'var(--accent-blue)' }}>[{e.time}]</span> {e.msg}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );

            var configFields = [
                { k:'apiKey', l:'API Key *', p:'AIzaSy...' },
                { k:'projectId', l:'Project ID *', p:'einkaufsliste-98199' },
                { k:'databaseURL', l:'Database URL *', p:'https://...firebasedatabase.app' },
                { k:'authDomain', l:'Auth Domain', p:'...firebaseapp.com' },
                { k:'storageBucket', l:'Storage Bucket', p:'...appspot.com' },
                { k:'appId', l:'App ID', p:'1:123:web:abc...' }
            ];
            var configPanel = (
                <div className="ba-card">
                    <div className="ba-card-title">🔧 Firebase Konfiguration</div>
                    <p style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'14px', lineHeight:'1.5' }}>
                        Zugangsdaten aus der Firebase Console eintragen.
                    </p>
                    {configFields.map(function(f) {
                        return (
                            <div key={f.k} className="ba-field">
                                <label>{f.l}</label>
                                <input
                                    type="text"
                                    value={fbConfig[f.k] || ''}
                                    placeholder={f.p}
                                    onChange={function(e) {
                                        var v = e.target.value;
                                        setFbConfig(function(prev) {
                                            var n = Object.assign({}, prev);
                                            n[f.k] = v;
                                            return n;
                                        });
                                    }}
                                />
                            </div>
                        );
                    })}
                    <div style={{ display:'flex', gap:'8px', marginTop:'16px' }}>
                        <button className="ba-btn blu" onClick={onConnect}
                            disabled={busy || !fbConfig.apiKey || !fbConfig.projectId}>
                            {busy ? '⏳...' : (fbOk ? '🔗 Neu verbinden' : '🔗 Verbinden')}
                        </button>
                        {fbOk && <button className="ba-btn out" onClick={onDisconnect}>🔌 Trennen</button>}
                    </div>
                </div>
            );

            return (
                <div className="page-container" style={{ padding:'16px', minHeight:'100vh' }}>
                    <UnterseitenHeader
                        icon="🔄"
                        titel="Synchronisation"
                        untertitel={fbOk ? 'Verbunden mit ' + fbConfig.projectId : 'Nicht verbunden'}
                        onBack={onBack}
                    />
                    {syncPanel}
                    {configPanel}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // GEMEINSAMER HEADER fuer die Unterseiten
        // Zurueck-Button (rot, Standard) + Icon + Titel + Untertitel
        // ═══════════════════════════════════════════════════════
        function UnterseitenHeader({ icon, titel, untertitel, onBack }) {
            return (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '18px',
                    paddingBottom: '14px',
                    borderBottom: '1px solid var(--border-color)'
                }}>
                    <button onClick={onBack} style={{
                        padding: '10px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: 'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        fontFamily: "'Oswald', sans-serif",
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        boxShadow: '0 4px 15px rgba(196,30,30,0.3)',
                        transition: 'all 0.25s ease',
                        touchAction: 'manipulation',
                        flexShrink: 0
                    }}>
                        ← Zurueck
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontFamily: "'Oswald', sans-serif",
                            fontSize: '18px',
                            fontWeight: 600,
                            letterSpacing: '1.2px',
                            textTransform: 'uppercase',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '22px' }}>{icon}</span>
                            <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>{titel}</span>
                        </div>
                        {untertitel && (
                            <div style={{
                                fontSize: '11.5px',
                                color: 'var(--text-muted)',
                                marginTop: '2px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {untertitel}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // STUB-MODUL (wird noch von anderen Stellen referenziert)
        // ═══════════════════════════════════════════════════════
        function StubModul({ name, icon, color, onBack }) {
            return (
                <div className="page-container" style={{padding:'20px 16px', minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
                    <div style={{fontSize:'64px', marginBottom:'16px'}}>{icon}</div>
                    <div style={{fontSize:'20px', fontWeight:'700', color: color, marginBottom:'8px'}}>{name}</div>
                    <div style={{fontSize:'14px', color:'var(--text-muted)', textAlign:'center', lineHeight:'1.6', maxWidth:'300px', marginBottom:'24px'}}>
                        Dieses Modul wird in einer kommenden Version freigeschaltet.
                        Die Grundstruktur ist vorbereitet -- stay tuned! 🚀
                    </div>
                    <button onClick={onBack} style={{padding:'12px 32px', background: color, color:'white', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:'600', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
                        ← Zurueck zur Modulwahl
                    </button>
                </div>
            );
        }

