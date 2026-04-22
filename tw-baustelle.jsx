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
            // ── Etappe 6: Einladungen ──
            const [invitations, setInvitations] = useState([]);
            // ── Etappe 8: Audit-Log ──
            const [auditLog, setAuditLog] = useState([]);

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

            // ── Etappe 6: Echtzeit-Listener fuer Einladungen ──
            useEffect(function() {
                if (!fbOk) return;
                var unsub = window.FirebaseService.onInvitationsChange(function(list) {
                    setInvitations(list);
                });
                return unsub;
            }, [fbOk]);

            // ── Etappe 8: Echtzeit-Listener fuer Audit-Log + 90-Tage-Cleanup ──
            useEffect(function() {
                if (!fbOk) return;
                // Cleanup: Eintraege aelter als 90 Tage entfernen (fire-and-forget)
                window.FirebaseService.cleanupOldAuditEvents(90).then(function(r) {
                    if (r.geloescht > 0) {
                        console.log('[Audit-Cleanup] ' + r.geloescht + ' alte Eintraege entfernt');
                    }
                });
                var unsub = window.FirebaseService.onAuditLogChange(function(list) {
                    setAuditLog(list);
                }, 200);
                return unsub;
            }, [fbOk]);

            // ── ETAPPE 4.1 B3: Einmaliger Stammdaten-Seed ──
            // Beim ersten Firebase-Login (oder falls neue MA zur MITARBEITER_LISTE
            // hinzugekommen sind) werden fehlende Stammdaten nach /mitarbeiter/
            // geschrieben. Funktion ist idempotent — existierende Eintraege bleiben
            // unveraendert. Kritisch, damit die MA-App ueberhaupt Stammdaten findet.
            useEffect(function() {
                if (!fbOk) return;
                if (typeof window.FirebaseService.ensureMitarbeiterStammdaten !== 'function') return;
                window.FirebaseService.ensureMitarbeiterStammdaten().then(function(r) {
                    if (r && r.neu > 0) {
                        console.log('[B3-Seed] ' + r.neu + ' neue Mitarbeiter-Stammdaten in Firebase angelegt (von ' + r.geprueft + ' geprueft)');
                    }
                }).catch(function(e) {
                    console.warn('[B3-Seed] Stammdaten-Seed fehlgeschlagen:', e && e.message || e);
                });
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
                await window.FirebaseService.approveUser(uid);
                await window.FirebaseService.logAuditEvent('device_approved', { uid: uid, name: name || '' });
                addLog('OK Freigegeben: ' + (name||uid.substring(0,8)));
            }
            async function handleReject(uid, name) {
                if (!confirm('"' + (name||'') + '" ablehnen?')) return;
                await window.FirebaseService.rejectUser(uid);
                await window.FirebaseService.logAuditEvent('device_rejected', { uid: uid, name: name || '' });
                addLog('X Abgelehnt: ' + (name||uid.substring(0,8)));
            }
            async function handleSync() {
                setBusy(true); addLog('Sync...'); await reload();
                addLog('Fertig -- ' + syncStatus.projects + ' Projekte, ' + syncStatus.users + ' User'); setBusy(false);
            }

            // ── Etappe 6: Einladungen ──
            async function handleCreateInvitation(data) {
                try {
                    var result = await window.FirebaseService.createInvitation(data);
                    await window.FirebaseService.logAuditEvent('invitation_created', {
                        mitarbeiter: data.mitarbeiter,
                        code: result.code,
                        gueltigBis: data.gueltigBis
                    });
                    addLog('Einladung erstellt: ' + data.mitarbeiter + ' (Code ' + result.code + ')');
                    return result;
                } catch(e) {
                    addLog('Einladung fehlgeschlagen: ' + e.message);
                    throw e;
                }
            }
            async function handleWiderrufeInvitation(code, mitarbeiter) {
                if (!confirm('Einladung fuer "' + (mitarbeiter||'?') + '" widerrufen?\n\nDer Code ist danach ungueltig.')) return;
                try {
                    await window.FirebaseService.widerrufeInvitation(code);
                    await window.FirebaseService.logAuditEvent('invitation_revoked', {
                        code: code,
                        mitarbeiter: mitarbeiter || ''
                    });
                    addLog('Einladung widerrufen: ' + code);
                } catch(e) {
                    alert('Widerruf fehlgeschlagen: ' + e.message);
                }
            }
            async function handleDeleteInvitation(code, mitarbeiter) {
                if (!confirm('Einladung fuer "' + (mitarbeiter||'?') + '" endgueltig loeschen?')) return;
                try {
                    await window.FirebaseService.deleteInvitation(code);
                    await window.FirebaseService.logAuditEvent('invitation_deleted', {
                        code: code,
                        mitarbeiter: mitarbeiter || ''
                    });
                    addLog('Einladung geloescht: ' + code);
                } catch(e) {
                    alert('Loeschen fehlgeschlagen: ' + e.message);
                }
            }

            // ── Etappe 8: Geraete-Aktionen (Sperren / Freigeben / Entfernen) ──
            async function handleLockDevice(uid, name) {
                if (!confirm('Geraet "' + (name||'?') + '" sperren?\n\nDer Mitarbeiter verliert sofort den Zugriff, das Geraet bleibt aber registriert.')) return;
                try {
                    await window.FirebaseService.lockDevice(uid);
                    await window.FirebaseService.logAuditEvent('device_locked', { uid: uid, name: name || '' });
                    addLog('Geraet gesperrt: ' + (name || uid.substring(0,8)));
                } catch(e) {
                    alert('Sperren fehlgeschlagen: ' + e.message);
                }
            }
            async function handleUnlockDevice(uid, name) {
                try {
                    await window.FirebaseService.unlockDevice(uid);
                    await window.FirebaseService.logAuditEvent('device_unlocked', { uid: uid, name: name || '' });
                    addLog('Geraet entsperrt: ' + (name || uid.substring(0,8)));
                } catch(e) {
                    alert('Entsperren fehlgeschlagen: ' + e.message);
                }
            }
            async function handleRemoveDevice(uid, name) {
                if (!confirm('Geraet "' + (name||'?') + '" endgueltig entfernen?\n\nDer Mitarbeiter braucht eine neue Einladung um sich wieder anzumelden.')) return;
                try {
                    await window.FirebaseService.removeDevice(uid);
                    await window.FirebaseService.logAuditEvent('device_removed', { uid: uid, name: name || '' });
                    addLog('Geraet entfernt: ' + (name || uid.substring(0,8)));
                } catch(e) {
                    alert('Entfernen fehlgeschlagen: ' + e.message);
                }
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
                    invitations={invitations}
                    auditLog={auditLog}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onCreateInvitation={handleCreateInvitation}
                    onWiderrufeInvitation={handleWiderrufeInvitation}
                    onDeleteInvitation={handleDeleteInvitation}
                    onLockDevice={handleLockDevice}
                    onUnlockDevice={handleUnlockDevice}
                    onRemoveDevice={handleRemoveDevice}
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
                    auditLog={auditLog}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onSync={handleSync}
                    onBack={function(){ setSubpage('start'); }}
                />;
            }
            if (subpage === 'hauptkalender') {
                return <HauptkalenderView
                    onBack={function(){ setSubpage('start'); }}
                />;
            }
            if (subpage === 'freigaben') {
                return <FreigabenHub
                    onBack={function(){ setSubpage('start'); }}
                />;
            }

            // ════════════════════════════════════════════════════
            // STARTSEITE: 5 grosse blaue Buttons (Etappe 4.1 B9)
            // ════════════════════════════════════════════════════
            return <BaustellenAppStartseite
                kunde={kunde}
                fbOk={fbOk}
                pendingCount={users.pending.length}
                onBaustellen={function(){ setSubpage('baustellen'); }}
                onTeam={function(){ setSubpage('team'); }}
                onSync={function(){ setSubpage('sync'); }}
                onHauptkalender={function(){ setSubpage('hauptkalender'); }}
                onFreigaben={function(){ setSubpage('freigaben'); }}
                onBack={onBack}
            />;
        }

        // ═══════════════════════════════════════════════════════
        // STARTSEITE des Baustellen-App-Moduls
        // Fuenf blaue Modus-Karten (flex-column):
        //   BAUSTELLEN - TEAM - SYNC - HAUPTKALENDER - FREIGABEN
        // HAUPTKALENDER kam in B7 dazu, FREIGABEN in B9.
        // ═══════════════════════════════════════════════════════
        function BaustellenAppStartseite({ kunde, fbOk, pendingCount, onBaustellen, onTeam, onSync, onHauptkalender, onFreigaben, onBack }) {
            // Wartende Foto-Freigaben zaehlen (Live-Listener, fuer Badge)
            const [fotoPending, setFotoPending] = useState(0);
            useEffect(function(){
                if (!fbOk || !window.FirebaseService || !window.FirebaseService.subscribeFotoFreigaben) return;
                var unsub = window.FirebaseService.subscribeFotoFreigaben(function(data){
                    var n = 0;
                    for (var k in data) {
                        if (data.hasOwnProperty(k)) {
                            if (data[k] && data[k].status === 'wartend') n++;
                        }
                    }
                    setFotoPending(n);
                });
                return unsub;
            }, [fbOk]);

            var cards = [
                {
                    id: 'baustellen',
                    icon: '🏗️',
                    title: 'Baustellen',
                    desc: 'Staging-Bereich verwalten: Zeichnungen, Anweisungen, Fotos und Stunden fuer die Mitarbeiter-App bereitstellen.',
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
                },
                {
                    id: 'hauptkalender',
                    icon: '📆',
                    title: 'Hauptkalender',
                    desc: 'Uebersicht aller Mitarbeiter-Anwesenheiten und geplanter Baustellen-Zeitraeume auf einen Blick.',
                    onClick: onHauptkalender,
                    badge: null
                },
                {
                    id: 'freigaben',
                    icon: '✅',
                    title: 'Freigaben',
                    desc: 'Review-Queue: Fotos der Mitarbeiter pruefen und in die Kunden-Ordner freigeben oder ablehnen.',
                    onClick: onFreigaben,
                    badge: fotoPending > 0 ? String(fotoPending) : null
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

            // ── Etappe 4.1 Baustein 1: 2-Ordner-Modell ──
            // subView: 'hauptordner' | 'baustellen-daten' | 'nachrichten'
            //   hauptordner    = 2 grosse Kacheln (BAUSTELLEN-DATEN + NACHRICHTEN)
            //   baustellen-daten = die bisherigen 4 Sub-Ordner (Migration auf 5 in B2)
            //   nachrichten    = Kalender + Chat pro MA (Platzhalter bis B4-B6)
            const [subView, setSubView] = useState('hauptordner');

            function handleBack() {
                // Rueckwaerts-Navigation: in Sub-Views erst auf hauptordner, dann raus
                if (subView !== 'hauptordner') {
                    setSubView('hauptordner');
                } else {
                    onBack();
                }
            }

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

            // ── Die 5 Standard-Unterordner (aus STAGING_CONFIG, Etappe 4.1 B2) ──
            // Anweisungen ersetzt "Baustellen-App", Fotos ersetzt "Bilder",
            // Baustellendaten ist neu. Alias-Logik in tw-staging.js — Legacy-Ordner
            // werden automatisch unter dem neuen Namen angezeigt.
            var cfg = window.STAGING_CONFIG || {};
            var unterordnerListe = (cfg.SUBFOLDERS || ['Zeichnungen', 'Anweisungen', 'Baustellendaten', 'Fotos', 'Stunden']).map(function(name) {
                var icon = '📁';
                var farbe = '#1E88E5';
                if (name === 'Zeichnungen')     { icon = '📐'; farbe = '#2ecc71'; }
                if (name === 'Anweisungen')     { icon = '📋'; farbe = '#3498db'; }
                if (name === 'Baustellendaten') { icon = '📊'; farbe = '#1E88E5'; }
                if (name === 'Fotos')           { icon = '📸'; farbe = '#e91e63'; }
                if (name === 'Stunden')         { icon = '⏱️'; farbe = '#e67e22'; }
                var daten = info && info.unterordner ? info.unterordner[name] : null;
                return {
                    name: name,
                    icon: icon,
                    farbe: farbe,
                    daten: daten,
                    permission: (cfg.SUBFOLDER_PERMISSIONS || {})[name] || 'readonly',
                    legacyName: daten && daten.legacyName ? daten.legacyName : null
                };
            });

            return (
                <div className="page-container" style={{
                    padding: '16px',
                    minHeight: '100vh'
                }}>
                    <UnterseitenHeader
                        icon={subView === 'nachrichten' ? '💬' : (subView === 'baustellen-daten' ? '📂' : '📁')}
                        titel={baustelle.name}
                        untertitel={
                            !bereit ? 'Noch nicht bereitgestellt' :
                            subView === 'baustellen-daten' ? 'Baustellen-Daten' :
                            subView === 'nachrichten' ? 'Nachrichten (Kalender & Chat)' :
                            'Staging-Bereich'
                        }
                        onBack={handleBack}
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
                                mit den fuenf Unterordnern.
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

                    {/* ═══════════════════════════════════════════════════════ */}
                    {/* ETAPPE 4.1 BAUSTEIN 1 — HAUPTORDNER-ANSICHT             */}
                    {/* ETAPPE 4.1 B8: Massen-Migration-Banner             */}
                    {/* Nur sichtbar wenn Legacy-Ordner entdeckt wurden.    */}
                    {bereit && subView === 'hauptordner' && (function(){
                        var legacyListe = unterordnerListe.filter(function(x){ return !!x.legacyName; });
                        if (legacyListe.length === 0) return null;
                        return (
                            <div style={{
                                marginBottom: '12px',
                                padding: '12px 14px',
                                background: 'rgba(230,126,34,0.10)',
                                border: '1px solid rgba(230,126,34,0.40)',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ fontSize: '22px' }}>⚠</div>
                                <div style={{ flex: 1, minWidth: '180px' }}>
                                    <div style={{
                                        fontSize: '12px',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: '0.5px',
                                        color: 'var(--accent-orange)',
                                        textTransform: 'uppercase'
                                    }}>
                                        {legacyListe.length} Ordner mit Legacy-Namen
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: 'var(--text-muted)',
                                        marginTop: '2px'
                                    }}>
                                        {legacyListe.map(function(x){ return '"' + x.legacyName + '" → "' + x.name + '"'; }).join(', ')}
                                    </div>
                                </div>
                                <button
                                    onClick={function(){
                                        var liste = legacyListe.map(function(x){ return '  "' + x.legacyName + '" → "' + x.name + '"'; }).join('\n');
                                        if (!confirm('Alle Legacy-Ordner auf Drive umbenennen?\n\n' + liste + '\n\nInhalt und Rechte bleiben unveraendert. Danach laedt die Seite automatisch neu.')) return;
                                        if (!window.TWStaging || !window.TWStaging.migriereLegacyOrdner) {
                                            alert('Migrations-API nicht verfuegbar. Seite neu laden.');
                                            return;
                                        }
                                        window.TWStaging.migriereLegacyOrdner(baustelle.name, function(phase, detail){
                                            console.log('[B8-Migrate]', phase, detail);
                                        })
                                        .then(function(erg){
                                            var msg = '✓ Migration abgeschlossen\n\n';
                                            msg += 'Umbenannt: ' + erg.migriert.length + '\n';
                                            msg += 'Uebersprungen: ' + erg.uebersprungen.length + '\n';
                                            msg += 'Fehler: ' + erg.fehler.length;
                                            if (erg.fehler.length > 0) {
                                                msg += '\n\nFehler-Details:\n' + erg.fehler.map(function(f){ return '- ' + f.name + ': ' + f.fehler; }).join('\n');
                                            }
                                            alert(msg);
                                            window.location.reload();
                                        })
                                        .catch(function(err){
                                            alert('Fehler waehrend Migration:\n' + (err && err.message || err));
                                        });
                                    }}
                                    style={{
                                        padding: '8px 14px',
                                        background: 'linear-gradient(135deg, #e67e22, #d35400)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        letterSpacing: '0.5px',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation',
                                        boxShadow: '0 2px 8px rgba(230,126,34,0.30)'
                                    }}
                                >✓ Alle umbenennen</button>
                            </div>
                        );
                    })()}

                    {/* ═══════════════════════════════════════════════════════ */}
                    {/* Zwei grosse Kacheln: BAUSTELLEN-DATEN + NACHRICHTEN     */}
                    {/* ═══════════════════════════════════════════════════════ */}
                    {bereit && subView === 'hauptordner' && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '14px',
                            marginTop: '4px'
                        }}>
                            {/* Kachel 1: BAUSTELLEN-DATEN */}
                            <button
                                onClick={function(){ setSubView('baustellen-daten'); }}
                                style={{
                                    padding: '28px 14px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid rgba(30,136,229,0.35)',
                                    background: 'linear-gradient(135deg, rgba(30,136,229,0.15), rgba(21,101,192,0.08))',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'all 0.2s',
                                    touchAction: 'manipulation',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '10px',
                                    minHeight: '160px',
                                    boxShadow: '0 4px 12px rgba(30,136,229,0.15)'
                                }}
                            >
                                <span style={{ fontSize: '52px', color: '#1E88E5' }}>📂</span>
                                <div style={{
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    fontFamily: "'Oswald', sans-serif",
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-primary)'
                                }}>Baustellen-Daten</div>
                                <div style={{
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    lineHeight: 1.45,
                                    padding: '0 4px'
                                }}>
                                    Zeichnungen · Anweisungen · Baustellendaten · Fotos · Stunden
                                </div>
                            </button>

                            {/* Kachel 2: NACHRICHTEN */}
                            <button
                                onClick={function(){ setSubView('nachrichten'); }}
                                style={{
                                    padding: '28px 14px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid rgba(39,174,96,0.35)',
                                    background: 'linear-gradient(135deg, rgba(39,174,96,0.15), rgba(31,139,76,0.08))',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'all 0.2s',
                                    touchAction: 'manipulation',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '10px',
                                    minHeight: '160px',
                                    boxShadow: '0 4px 12px rgba(39,174,96,0.15)'
                                }}
                            >
                                <span style={{ fontSize: '52px', color: '#27ae60' }}>💬</span>
                                <div style={{
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    fontFamily: "'Oswald', sans-serif",
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-primary)'
                                }}>Nachrichten</div>
                                <div style={{
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    lineHeight: 1.45,
                                    padding: '0 4px'
                                }}>
                                    Kalender & Chat pro Mitarbeiter
                                </div>
                            </button>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════ */}
                    {/* ETAPPE 4.1 BAUSTEIN 4 — NACHRICHTEN-BEREICH             */}
                    {/* Eigener Router (Liste ↔ Detail). Kalender und Chat als  */}
                    {/* Sub-Tabs, mit Platzhaltern bis B5/B6.                   */}
                    {/* ═══════════════════════════════════════════════════════ */}
                    {subView === 'nachrichten' && (
                        <NachrichtenBereich baustelleName={baustelle.name} />
                    )}

                    {/* 4 Ordner-Kacheln (nur in subView='baustellen-daten' sichtbar) */}
                    {bereit && subView === 'baustellen-daten' && (
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
                                        {/* ETAPPE 4.1 B2/B8: Legacy-Alias-Hinweis + Umbenennen-Button */}
                                        {u.legacyName && (
                                            <div
                                                onClick={function(e){
                                                    e.stopPropagation();
                                                    if (!confirm('Drive-Ordner "' + u.legacyName + '" in "' + u.name + '" umbenennen?\n\nDies wirkt sich nur auf den Drive-Ordnernamen aus. Inhalt und Zugriffsrechte bleiben unveraendert.')) return;
                                                    if (!window.TWStaging || !window.TWStaging.umbenennenOrdner) {
                                                        alert('Migrations-API nicht verfuegbar. Seite neu laden.');
                                                        return;
                                                    }
                                                    window.TWStaging.umbenennenOrdner(u.daten.id, u.name)
                                                        .then(function(){
                                                            alert('✓ Umbenennen erfolgreich:\n"' + u.legacyName + '" → "' + u.name + '"');
                                                            window.location.reload();
                                                        })
                                                        .catch(function(err){
                                                            alert('Fehler beim Umbenennen:\n' + (err && err.message || err));
                                                        });
                                                }}
                                                title={'Drive-Ordner "' + u.legacyName + '" → "' + u.name + '" umbenennen (Klick)'}
                                                style={{
                                                    marginTop: '3px',
                                                    fontSize: '8px',
                                                    padding: '2px 6px',
                                                    background: 'rgba(230,126,34,0.15)',
                                                    color: 'var(--accent-orange)',
                                                    border: '1px solid rgba(230,126,34,0.35)',
                                                    borderRadius: '3px',
                                                    fontFamily: "'Oswald', sans-serif",
                                                    fontWeight: 600,
                                                    letterSpacing: '0.3px',
                                                    cursor: 'pointer',
                                                    touchAction: 'manipulation'
                                                }}>
                                                ⚠ "{u.legacyName}" → umbenennen
                                            </div>
                                        )}
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
            // ── Etappe 5: Upload & Delete ──
            const [uploadDialogOffen, setUploadDialogOffen] = useState(false);
            const [uploadDateien, setUploadDateien] = useState([]); // File[] aus Input/Drop
            const [dragActive, setDragActive] = useState(false);
            const [loeschenDatei, setLoeschenDatei] = useState(null); // {id, name} oder null

            // ── Upload-Berechtigung (nur in Bilder/Stunden-Ordner) ──
            var darfUpload = unterordner.permission === 'upload';

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

            // ── Etappe 7: Auto-Sync nach Dateiaenderungen (fire-and-forget) ──
            // Versucht Firebase-Sync im Hintergrund. Fehler werden geloggt, aber
            // nicht an den Nutzer eskaliert — die Drive-Aktion war bereits erfolgreich.
            async function autoSyncZuFirebase() {
                if (!baustelle || !baustelle.name) return;
                if (!window.FirebaseService || !window.FirebaseService.db) return;
                try {
                    var pid = baustelle.id || baustelle.name;
                    var erg = await window.TWStaging.syncStagingNachFirebase(baustelle.name, pid);
                    console.log('[Auto-Sync] OK fuer', baustelle.name);
                    // Etappe 9: Auch Auto-Syncs ins Audit-Log
                    if (window.FirebaseService.logAuditEvent) {
                        window.FirebaseService.logAuditEvent('sync_completed', {
                            baustelle: baustelle.name,
                            gesamt: erg.gesamt || 0,
                            auto: true
                        });
                    }
                } catch (e) {
                    console.warn('[Auto-Sync] fehlgeschlagen fuer', baustelle.name, e);
                    if (window.FirebaseService.logAuditEvent) {
                        window.FirebaseService.logAuditEvent('sync_failed', {
                            baustelle: baustelle.name,
                            fehler: e.message || String(e),
                            auto: true
                        });
                    }
                }
            }

            // ── Etappe 4: Nach erfolgreichem Kopieren Liste neu laden + Auto-Sync ──
            function handleDialogFertig() {
                setDialogOffen(false);
                ladeInhalt();
                autoSyncZuFirebase();
            }

            // ── Etappe 5: Datei-Input Change ──
            function handleFileInputChange(e) {
                var files = Array.from(e.target.files || []);
                if (files.length === 0) return;
                setUploadDateien(files);
                setUploadDialogOffen(true);
                // Input zuruecksetzen, damit dieselbe Datei erneut gewaehlt werden kann
                e.target.value = '';
            }

            // ── Etappe 5: Drag & Drop Handler ──
            function handleDragOver(e) {
                e.preventDefault();
                e.stopPropagation();
                if (!darfUpload) return;
                setDragActive(true);
            }
            function handleDragLeave(e) {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
            }
            function handleDrop(e) {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
                if (!darfUpload) return;
                var files = Array.from(e.dataTransfer.files || []);
                if (files.length === 0) return;
                setUploadDateien(files);
                setUploadDialogOffen(true);
            }

            // ── Etappe 5: Upload-Dialog Fertig-Callback + Auto-Sync (Etappe 7) ──
            function handleUploadFertig() {
                setUploadDialogOffen(false);
                setUploadDateien([]);
                ladeInhalt();
                autoSyncZuFirebase();
            }

            // ── Etappe 5: Loeschen-Dialog oeffnen ──
            function handleLoeschenStart(f, e) {
                if (e) { e.stopPropagation(); }
                setLoeschenDatei({ id: f.id, name: f.name });
            }

            // ── Etappe 5: Loeschen bestaetigt (permanent: true/false) + Auto-Sync (Etappe 7) ──
            async function handleLoeschenBestaetigt(permanent) {
                var ziel = loeschenDatei;
                setLoeschenDatei(null);
                if (!ziel) return;
                try {
                    await window.TWStaging.deleteDateiAusStaging(ziel.id, permanent);
                    ladeInhalt();
                    autoSyncZuFirebase();
                } catch (e) {
                    alert('Loeschen fehlgeschlagen: ' + (e.message || e));
                }
            }

            return (
                <div
                    className="page-container"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
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
                            marginBottom: '10px',
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

                    {/* Etappe 5: Upload-Button (nur in Bilder/Stunden-Ordnern) */}
                    {darfUpload && (
                        <React.Fragment>
                            <input
                                type="file"
                                id="staging-file-input"
                                multiple
                                style={{ display: 'none' }}
                                onChange={handleFileInputChange}
                            />
                            <button
                                onClick={function(){
                                    var el = document.getElementById('staging-file-input');
                                    if (el) el.click();
                                }}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    marginBottom: '14px',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #2e9b4a 0%, #43b85e 100%)',
                                    color: '#fff',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    letterSpacing: '1.5px',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(46,155,74,0.30)',
                                    transition: 'all 0.25s ease',
                                    touchAction: 'manipulation',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                            >
                                <span style={{ fontSize: '20px' }}>📤</span>
                                <span>Datei hochladen</span>
                            </button>
                        </React.Fragment>
                    )}

                    {/* Info-Hinweis: Nur Ansicht vs. Upload erlaubt */}
                    {darfUpload ? (
                        <div style={{
                            padding: '10px 14px',
                            marginBottom: '14px',
                            background: 'rgba(46,155,74,0.10)',
                            border: '1px solid rgba(46,155,74,0.25)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            color: 'var(--text-light)',
                            lineHeight: 1.5
                        }}>
                            ✍️ <strong>Mitarbeiter duerfen hier hochladen und loeschen</strong> —
                            Dateien landen nur im Staging, die Original-Kundenakte bleibt unberuehrt.
                            Dateien koennen per Klick auf das Papierkorb-Symbol entfernt werden.
                        </div>
                    ) : (
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
                    )}

                    {/* Etappe 5: Drag & Drop Overlay (nur sichtbar wenn aktiv) */}
                    {darfUpload && dragActive && (
                        <div style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(46,155,74,0.20)',
                            border: '4px dashed #2e9b4a',
                            zIndex: 9998,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none'
                        }}>
                            <div style={{
                                background: '#fff',
                                padding: '24px 32px',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                                textAlign: 'center',
                                color: '#2e9b4a'
                            }}>
                                <div style={{ fontSize: '40px', marginBottom: '8px' }}>📤</div>
                                <div style={{
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    letterSpacing: '1px'
                                }}>Dateien hier ablegen</div>
                            </div>
                        </div>
                    )}

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
                                {darfUpload
                                    ? 'Oben "Datei hochladen" antippen oder Dateien per Drag & Drop ablegen'
                                    : 'Oben "Aus Original nachladen" antippen, um Dateien zu kopieren'}
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
                                        <div
                                            key={f.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '0',
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-sm)',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <button
                                                onClick={function(){ handleDateiOeffnen(f); }}
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '10px 12px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--text-primary)',
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    touchAction: 'manipulation',
                                                    minWidth: 0
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
                                            {darfUpload && (
                                                <button
                                                    onClick={function(e){ handleLoeschenStart(f, e); }}
                                                    title="Datei loeschen"
                                                    style={{
                                                        width: '44px',
                                                        height: '44px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        borderLeft: '1px solid var(--border-color)',
                                                        color: 'var(--accent-red)',
                                                        fontSize: '18px',
                                                        cursor: 'pointer',
                                                        touchAction: 'manipulation',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
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

                    {/* Etappe 5: Upload-Dialog */}
                    {uploadDialogOffen && (
                        <UploadDialog
                            dateien={uploadDateien}
                            zielOrdnerId={aktuell.id}
                            zielOrdnerName={aktuell.name}
                            onSchliessen={function(){
                                setUploadDialogOffen(false);
                                setUploadDateien([]);
                            }}
                            onFertig={handleUploadFertig}
                        />
                    )}

                    {/* Etappe 5: Loeschen-Dialog */}
                    {loeschenDatei && (
                        <LoeschenDialog
                            datei={loeschenDatei}
                            onAbbrechen={function(){ setLoeschenDatei(null); }}
                            onBestaetigt={handleLoeschenBestaetigt}
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
        function TeamVerwaltung({ fbOk, users, invitations, auditLog, onApprove, onReject, onCreateInvitation, onWiderrufeInvitation, onDeleteInvitation, onLockDevice, onUnlockDevice, onRemoveDevice, onBack }) {
            const [neueEinladungOffen, setNeueEinladungOffen] = useState(false);
            const [showQRCode, setShowQRCode] = useState(null); // Einladungs-Code, fuer den QR gezeigt wird

            var content;
            if (!fbOk) {
                content = (
                    <div style={{ textAlign:'center', padding:'40px 16px', color:'var(--text-muted)' }}>
                        <div style={{ fontSize:'48px', opacity:0.4, marginBottom:'12px' }}>🔌</div>
                        <div style={{ fontSize:'13px', marginBottom:'6px' }}>Firebase nicht verbunden</div>
                        <div style={{ fontSize:'12px' }}>Im Sync-Bereich verbinden, dann sind Team-Freigaben und Einladungen verfuegbar.</div>
                    </div>
                );
            } else {
                // Einladungen nach Status gruppieren
                var nowMs = Date.now();
                var offeneEinladungen = invitations.filter(function(i){
                    if (i.status !== 'offen') return false;
                    if (i.gueltigBis && new Date(i.gueltigBis).getTime() < nowMs) return false;
                    return true;
                });
                var abgelaufene = invitations.filter(function(i){
                    if (i.status !== 'offen') return false;
                    return i.gueltigBis && new Date(i.gueltigBis).getTime() < nowMs;
                });
                var eingeloeste = invitations.filter(function(i){ return i.status === 'eingeloest'; });
                var widerrufene = invitations.filter(function(i){ return i.status === 'widerrufen'; });

                content = (
                    <div>
                        {/* ── Einladungs-Button ── */}
                        <button
                            onClick={function(){ setNeueEinladungOffen(true); }}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                marginBottom: '14px',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                color: '#fff',
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '14px',
                                fontWeight: 600,
                                letterSpacing: '1.5px',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(30,136,229,0.30)',
                                transition: 'all 0.25s ease',
                                touchAction: 'manipulation',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            <span style={{ fontSize: '20px' }}>➕</span>
                            <span>Neue Einladung erstellen</span>
                        </button>

                        {/* ── Offene Einladungen ── */}
                        <div className="ba-card">
                            <div className="ba-card-title">
                                📨 Offene Einladungen
                                {offeneEinladungen.length > 0 && (
                                    <span style={{
                                        background:'var(--accent-orange)', color:'#fff',
                                        borderRadius:'10px', padding:'1px 8px',
                                        fontSize:'11px', fontWeight:700, marginLeft:'6px'
                                    }}>{offeneEinladungen.length}</span>
                                )}
                            </div>
                            {offeneEinladungen.length === 0 ? (
                                <div style={{ textAlign:'center', padding:'16px', color:'var(--text-muted)', fontSize:'13px' }}>
                                    Keine offenen Einladungen
                                </div>
                            ) : offeneEinladungen.map(function(inv) {
                                var gueltig = inv.gueltigBis ? new Date(inv.gueltigBis).toLocaleDateString('de-DE') : '—';
                                return (
                                    <div key={inv.code} className="ba-row">
                                        <div style={{ flex:1 }}>
                                            <div className="ba-name">
                                                {inv.mitarbeiter}
                                                <span style={{
                                                    marginLeft:'6px', fontSize:'10px',
                                                    background:'var(--bg-secondary)', color:'var(--text-primary)',
                                                    padding:'1px 6px', borderRadius:'6px',
                                                    fontFamily:"'Courier New', monospace", letterSpacing:'1px'
                                                }}>{inv.code}</span>
                                            </div>
                                            <div className="ba-detail">
                                                PIN: <span style={{ fontFamily:"'Courier New', monospace", fontWeight:600 }}>{inv.pin}</span>
                                                {' · Gueltig bis: ' + gueltig}
                                            </div>
                                        </div>
                                        <div style={{ display:'flex', gap:'6px' }}>
                                            <button
                                                className="ba-btn"
                                                style={{ background:'var(--accent-blue)', color:'#fff' }}
                                                onClick={function(){ setShowQRCode(inv); }}
                                                title="QR-Code anzeigen"
                                            >📱</button>
                                            <button
                                                className="ba-btn red"
                                                onClick={function(){ onWiderrufeInvitation(inv.code, inv.mitarbeiter); }}
                                                title="Einladung widerrufen"
                                            >✗</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Wartende Freigaben (Geraete-Registrierung) ── */}
                        {users.pending.length > 0 && (
                            <div className="ba-card">
                                <div className="ba-card-title">
                                    ⏳ Wartende Geraete-Freigaben
                                    <span style={{
                                        background:'var(--accent-orange)', color:'#fff',
                                        borderRadius:'10px', padding:'1px 8px',
                                        fontSize:'11px', fontWeight:700, marginLeft:'6px'
                                    }}>{users.pending.length}</span>
                                </div>
                                {users.pending.map(function(u) {
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
                        )}

                        {/* ── Aktive Geraete ── */}
                        <div className="ba-card">
                            <div className="ba-card-title">👥 Aktive Geraete ({users.approved.length})</div>
                            {users.approved.length === 0 ? (
                                <div style={{ textAlign:'center', padding:'16px', color:'var(--text-muted)', fontSize:'13px' }}>
                                    Noch keine aktiven Geraete
                                </div>
                            ) : users.approved.map(function(u) {
                                var p = u.profile || {};
                                var istAdmin = u.role === 'admin';
                                var istGesperrt = u.locked === true;
                                return (
                                    <div key={u.uid} className="ba-row" style={{
                                        opacity: istGesperrt ? 0.6 : 1
                                    }}>
                                        <div style={{ flex:1, minWidth:0 }}>
                                            <div className="ba-name">
                                                {p.name || 'Mitarbeiter'}
                                                {istAdmin && (
                                                    <span style={{
                                                        marginLeft:'6px', fontSize:'10px',
                                                        background:'var(--accent-blue)', color:'#fff',
                                                        padding:'1px 6px', borderRadius:'6px'
                                                    }}>ADMIN</span>
                                                )}
                                                {istGesperrt && (
                                                    <span style={{
                                                        marginLeft:'6px', fontSize:'10px',
                                                        background:'rgba(196,30,30,0.2)', color:'var(--accent-red)',
                                                        padding:'1px 6px', borderRadius:'6px',
                                                        fontFamily:"'Oswald', sans-serif", fontWeight:600, letterSpacing:'0.5px'
                                                    }}>GESPERRT</span>
                                                )}
                                            </div>
                                            <div className="ba-detail">
                                                {(p.geraeteTyp || p.deviceType || 'Geraet')} · Sprache: {u.language||'de'}
                                                {u.lastLogin && (' · Letzter Login: ' + new Date(u.lastLogin).toLocaleString('de-DE'))}
                                            </div>
                                        </div>
                                        {!istAdmin && (
                                            <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                                                {istGesperrt ? (
                                                    <button
                                                        className="ba-btn grn"
                                                        onClick={function(){ onUnlockDevice(u.uid, p.name); }}
                                                        title="Geraet entsperren"
                                                    >🔓</button>
                                                ) : (
                                                    <button
                                                        className="ba-btn"
                                                        style={{ background:'var(--accent-orange)', color:'#fff' }}
                                                        onClick={function(){ onLockDevice(u.uid, p.name); }}
                                                        title="Geraet sperren"
                                                    >🔒</button>
                                                )}
                                                <button
                                                    className="ba-btn red"
                                                    onClick={function(){ onRemoveDevice(u.uid, p.name); }}
                                                    title="Geraet endgueltig entfernen"
                                                >🗑️</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Etappe 8: Audit-Log ── */}
                        <AuditLogPanel auditLog={auditLog} />

                        {/* ── Archiv: Eingeloeste und widerrufene Einladungen ── */}
                        {(eingeloeste.length > 0 || widerrufene.length > 0 || abgelaufene.length > 0) && (
                            <div className="ba-card">
                                <div className="ba-card-title">🗂️ Archiv ({eingeloeste.length + widerrufene.length + abgelaufene.length})</div>
                                {eingeloeste.map(function(inv) {
                                    return (
                                        <div key={inv.code} className="ba-row" style={{ opacity:0.7 }}>
                                            <div style={{ flex:1 }}>
                                                <div className="ba-name">
                                                    ✓ {inv.mitarbeiter}
                                                    <span style={{
                                                        marginLeft:'6px', fontSize:'10px',
                                                        background:'rgba(46,155,74,0.2)', color:'#2e9b4a',
                                                        padding:'1px 6px', borderRadius:'6px'
                                                    }}>EINGELOEST</span>
                                                </div>
                                                <div className="ba-detail">Code {inv.code} · Geraet: {inv.geraetName || '—'}</div>
                                            </div>
                                            <button className="ba-btn red" onClick={function(){ onDeleteInvitation(inv.code, inv.mitarbeiter); }}>🗑️</button>
                                        </div>
                                    );
                                })}
                                {widerrufene.map(function(inv) {
                                    return (
                                        <div key={inv.code} className="ba-row" style={{ opacity:0.6 }}>
                                            <div style={{ flex:1 }}>
                                                <div className="ba-name">
                                                    ✗ {inv.mitarbeiter}
                                                    <span style={{
                                                        marginLeft:'6px', fontSize:'10px',
                                                        background:'rgba(196,30,30,0.2)', color:'var(--accent-red)',
                                                        padding:'1px 6px', borderRadius:'6px'
                                                    }}>WIDERRUFEN</span>
                                                </div>
                                                <div className="ba-detail">Code {inv.code}</div>
                                            </div>
                                            <button className="ba-btn red" onClick={function(){ onDeleteInvitation(inv.code, inv.mitarbeiter); }}>🗑️</button>
                                        </div>
                                    );
                                })}
                                {abgelaufene.map(function(inv) {
                                    return (
                                        <div key={inv.code} className="ba-row" style={{ opacity:0.6 }}>
                                            <div style={{ flex:1 }}>
                                                <div className="ba-name">
                                                    ⏰ {inv.mitarbeiter}
                                                    <span style={{
                                                        marginLeft:'6px', fontSize:'10px',
                                                        background:'rgba(230,126,34,0.2)', color:'var(--accent-orange)',
                                                        padding:'1px 6px', borderRadius:'6px'
                                                    }}>ABGELAUFEN</span>
                                                </div>
                                                <div className="ba-detail">Code {inv.code}</div>
                                            </div>
                                            <button className="ba-btn red" onClick={function(){ onDeleteInvitation(inv.code, inv.mitarbeiter); }}>🗑️</button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            }

            return (
                <div className="page-container" style={{ padding:'16px', minHeight:'100vh' }}>
                    <UnterseitenHeader
                        icon="👥"
                        titel="Geraeteverwaltung"
                        untertitel="Einladungen und aktive Geraete"
                        onBack={onBack}
                    />
                    {content}

                    {/* Neue-Einladung-Dialog */}
                    {neueEinladungOffen && (
                        <NeueEinladungDialog
                            onSchliessen={function(){ setNeueEinladungOffen(false); }}
                            onErstellen={async function(data) {
                                var result = await onCreateInvitation(data);
                                setNeueEinladungOffen(false);
                                setShowQRCode(result);
                            }}
                        />
                    )}

                    {/* QR-Code-Dialog */}
                    {showQRCode && (
                        <QRCodeDialog
                            einladung={showQRCode}
                            onSchliessen={function(){ setShowQRCode(null); }}
                        />
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // AUDIT-LOG-PANEL (Etappe 8)
        // Zeigt die letzten Geraete-/Einladungs-Events in einer
        // chronologischen Liste. 90 Tage Aufbewahrung (auto-cleanup).
        // ═══════════════════════════════════════════════════════
        function AuditLogPanel({ auditLog }) {
            const [alleSichtbar, setAlleSichtbar] = useState(false);

            var events = auditLog || [];
            // Wenn nicht alle angezeigt werden, nur die letzten 10
            var anzuzeigen = alleSichtbar ? events : events.slice(0, 10);

            // Event-Typ → Label + Icon + Farbe
            function eventInfo(e) {
                var actionType = e.actionType || 'unknown';
                var mapping = {
                    'invitation_created': { icon: '➕', label: 'Einladung erstellt',    color: 'var(--accent-blue)' },
                    'invitation_revoked': { icon: '✗',  label: 'Einladung widerrufen',  color: 'var(--accent-red)' },
                    'invitation_deleted': { icon: '🗑️', label: 'Einladung geloescht',   color: 'var(--text-muted)' },
                    'device_approved':    { icon: '✓',  label: 'Geraet freigegeben',    color: '#2e9b4a' },
                    'device_rejected':    { icon: '✗',  label: 'Geraete-Anfrage abgelehnt', color: 'var(--accent-red)' },
                    'device_locked':      { icon: '🔒', label: 'Geraet gesperrt',       color: 'var(--accent-orange)' },
                    'device_unlocked':    { icon: '🔓', label: 'Geraet entsperrt',      color: '#2e9b4a' },
                    'device_removed':     { icon: '🗑️', label: 'Geraet entfernt',       color: 'var(--accent-red)' },
                    'sync_completed':     { icon: '🔄', label: 'Sync erfolgreich',      color: '#2e9b4a' },
                    'sync_failed':        { icon: '⚠️', label: 'Sync fehlgeschlagen',   color: 'var(--accent-red)' }
                };
                return mapping[actionType] || { icon: '•', label: actionType, color: 'var(--text-muted)' };
            }

            // Event-Details in kurzen Text wandeln
            function eventDetailText(e) {
                var d = e.details || {};
                var parts = [];
                if (d.mitarbeiter) parts.push(d.mitarbeiter);
                if (d.name) parts.push(d.name);
                if (d.code) parts.push('Code ' + d.code);
                if (d.baustelle) parts.push('🏗️ ' + d.baustelle);
                if (d.gesamt !== undefined) parts.push(d.gesamt + ' Dateien');
                if (d.auto) parts.push('auto');
                return parts.join(' · ');
            }

            function formatiereZeit(ts) {
                if (!ts) return '';
                var d = new Date(ts);
                var heute = new Date();
                heute.setHours(0,0,0,0);
                var eventTag = new Date(ts);
                eventTag.setHours(0,0,0,0);
                var istHeute = eventTag.getTime() === heute.getTime();
                var istGestern = (heute.getTime() - eventTag.getTime()) === 24*60*60*1000;
                var zeit = d.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
                if (istHeute)   return 'Heute ' + zeit;
                if (istGestern) return 'Gestern ' + zeit;
                return d.toLocaleDateString('de-DE') + ' ' + zeit;
            }

            return (
                <div className="ba-card">
                    <div className="ba-card-title">
                        📋 Audit-Log
                        <span style={{
                            marginLeft:'6px', fontSize:'10px',
                            color:'var(--text-muted)', fontWeight:400
                        }}>({events.length} · 90 Tage)</span>
                    </div>

                    {events.length === 0 ? (
                        <div style={{ textAlign:'center', padding:'16px', color:'var(--text-muted)', fontSize:'13px' }}>
                            Noch keine Aktivitaeten aufgezeichnet
                        </div>
                    ) : (
                        <div>
                            {anzuzeigen.map(function(e) {
                                var info = eventInfo(e);
                                var detail = eventDetailText(e);
                                return (
                                    <div key={e.id} style={{
                                        display:'flex', alignItems:'flex-start', gap:'10px',
                                        padding:'8px 4px',
                                        borderBottom:'1px solid var(--border-color)'
                                    }}>
                                        <span style={{
                                            fontSize:'16px', flexShrink:0, width:'22px', textAlign:'center',
                                            color: info.color
                                        }}>{info.icon}</span>
                                        <div style={{ flex:1, minWidth:0 }}>
                                            <div style={{
                                                fontSize:'13px', fontWeight:500,
                                                color:'var(--text-primary)',
                                                fontFamily:"'Source Sans 3', sans-serif"
                                            }}>{info.label}</div>
                                            {detail && (
                                                <div style={{
                                                    fontSize:'11px', color:'var(--text-light)',
                                                    marginTop:'1px',
                                                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
                                                }}>{detail}</div>
                                            )}
                                        </div>
                                        <span style={{
                                            fontSize:'10.5px', color:'var(--text-muted)',
                                            flexShrink:0, whiteSpace:'nowrap'
                                        }}>{formatiereZeit(e.timestamp)}</span>
                                    </div>
                                );
                            })}

                            {events.length > 10 && (
                                <button
                                    onClick={function(){ setAlleSichtbar(!alleSichtbar); }}
                                    style={{
                                        width:'100%', padding:'10px',
                                        marginTop:'8px',
                                        background:'var(--bg-secondary)',
                                        color:'var(--text-primary)',
                                        border:'1px solid var(--border-color)',
                                        borderRadius:'var(--radius-sm)',
                                        fontSize:'12px', fontFamily:"'Oswald', sans-serif",
                                        fontWeight:600, letterSpacing:'0.5px',
                                        cursor:'pointer', touchAction:'manipulation'
                                    }}>
                                    {alleSichtbar
                                        ? 'Weniger anzeigen'
                                        : 'Alle ' + events.length + ' Eintraege anzeigen'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // DIALOG: Neue Einladung erstellen (Etappe 6)
        // ═══════════════════════════════════════════════════════
        function NeueEinladungDialog({ onSchliessen, onErstellen }) {
            // Grundstock (lokal) + Firebase-Mitarbeiter werden gemerged
            const [mitarbeiter, setMitarbeiter] = useState(function(){
                return window.MITARBEITER_LISTE ? window.MITARBEITER_LISTE.slice() : [];
            });
            const [gewaehlt, setGewaehlt] = useState(function(){
                var initial = window.MITARBEITER_LISTE && window.MITARBEITER_LISTE[0];
                return initial ? initial.name : '';
            });
            const [gueltigTage, setGueltigTage] = useState('7');
            const [busy, setBusy] = useState(false);

            // ── Neu-Anlegen-Bereich ──
            const [neuOffen, setNeuOffen] = useState(false);
            const [neuName, setNeuName] = useState('');
            const [neuRolle, setNeuRolle] = useState('Fliesenleger');
            const [neuBusy, setNeuBusy] = useState(false);

            // Firebase-Mitarbeiter live dazumergen
            useEffect(function(){
                if (!window.FirebaseService || !window.FirebaseService.subscribeMitarbeiter) return;
                var unsubscribe = window.FirebaseService.subscribeMitarbeiter(function(fbArr){
                    var grundstock = window.MITARBEITER_LISTE || [];
                    var merged = grundstock.slice();
                    var seen = {};
                    grundstock.forEach(function(m){ seen[m.id] = true; });
                    fbArr.forEach(function(m){
                        if (!seen[m.id]) { merged.push(m); seen[m.id] = true; }
                    });
                    // Alphabetisch sortieren fuer Uebersichtlichkeit
                    merged.sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });
                    setMitarbeiter(merged);
                });
                return function(){
                    try { if (typeof unsubscribe === 'function') unsubscribe(); } catch(e) {}
                };
            }, []);

            // PIN wird beim Oeffnen des Dialogs einmal erzeugt und bleibt bis zum Erstellen
            const [pin] = useState(function() {
                var p = '';
                for (var i=0; i<6; i++) p += Math.floor(Math.random()*10);
                return p;
            });

            async function handleErstellen() {
                if (!gewaehlt) { alert('Bitte Mitarbeiter auswaehlen.'); return; }
                setBusy(true);
                try {
                    var tage = parseInt(gueltigTage, 10) || 7;
                    var gueltigBis = new Date(Date.now() + tage*24*60*60*1000).toISOString();
                    await onErstellen({
                        mitarbeiter: gewaehlt,
                        pin: pin,
                        gueltigBis: gueltigBis
                    });
                } catch(e) {
                    alert('Fehler: ' + (e.message || e));
                    setBusy(false);
                }
            }

            async function handleNeuAnlegen() {
                var name = (neuName || '').trim();
                if (!name) { alert('Bitte Name eingeben.'); return; }
                if (!neuRolle) { alert('Bitte Rolle waehlen.'); return; }
                if (!window.FirebaseService || !window.FirebaseService.addMitarbeiter) {
                    alert('Firebase nicht verbunden. Mitarbeiter kann nicht angelegt werden.');
                    return;
                }
                setNeuBusy(true);
                try {
                    var ergebnis = await window.FirebaseService.addMitarbeiter(name, neuRolle);
                    // Neu angelegten Mitarbeiter direkt auswaehlen.
                    // Der subscribeMitarbeiter-Listener aktualisiert die Liste von selbst.
                    setGewaehlt(ergebnis.name);
                    setNeuName('');
                    setNeuRolle('Fliesenleger');
                    setNeuOffen(false);
                } catch(e) {
                    alert('Fehler beim Anlegen: ' + (e.message || e));
                } finally {
                    setNeuBusy(false);
                }
            }

            return (
                <div
                    onClick={busy ? undefined : onSchliessen}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px'
                    }}>
                    <div
                        onClick={function(e){ e.stopPropagation(); }}
                        style={{
                            width: '100%',
                            maxWidth: '460px',
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius-md)',
                            padding: '22px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                            maxHeight: '90vh',
                            overflow: 'auto'
                        }}>
                        <div style={{
                            display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px',
                            paddingBottom:'12px', borderBottom:'1px solid var(--border-color)'
                        }}>
                            <span style={{ fontSize:'24px' }}>➕</span>
                            <div style={{
                                fontFamily:"'Oswald', sans-serif", fontSize:'16px', fontWeight:600,
                                letterSpacing:'1px', textTransform:'uppercase', color:'var(--text-primary)'
                            }}>Neue Einladung</div>
                        </div>

                        {/* Mitarbeiter-Auswahl */}
                        <div style={{ marginBottom:'14px' }}>
                            <label style={{
                                display:'block', fontSize:'11px', fontFamily:"'Oswald', sans-serif",
                                fontWeight:600, letterSpacing:'1px', textTransform:'uppercase',
                                color:'var(--text-muted)', marginBottom:'6px'
                            }}>Mitarbeiter</label>
                            <select
                                value={gewaehlt}
                                onChange={function(e){ setGewaehlt(e.target.value); }}
                                style={{
                                    width:'100%', padding:'10px 12px',
                                    background:'var(--bg-secondary)', color:'var(--text-primary)',
                                    border:'1px solid var(--border-color)', borderRadius:'var(--radius-sm)',
                                    fontSize:'14px', fontFamily:"'Source Sans 3', sans-serif"
                                }}>
                                {mitarbeiter.map(function(m) {
                                    return <option key={m.id} value={m.name}>{m.name} ({m.rolle})</option>;
                                })}
                            </select>

                            {/* Neu-Anlegen-Toggle */}
                            {!neuOffen && (
                                <button
                                    onClick={function(){ setNeuOffen(true); }}
                                    style={{
                                        marginTop:'8px',
                                        width:'100%',
                                        padding:'8px 12px',
                                        background:'transparent',
                                        color:'var(--accent-blue)',
                                        border:'1px dashed rgba(30,136,229,0.45)',
                                        borderRadius:'var(--radius-sm)',
                                        fontSize:'13px',
                                        fontFamily:"'Source Sans 3', sans-serif",
                                        fontWeight:600,
                                        cursor:'pointer',
                                        touchAction:'manipulation'
                                    }}>
                                    ➕ Neuer Mitarbeiter anlegen
                                </button>
                            )}

                            {/* Neu-Anlegen-Bereich (eingeklappt) */}
                            {neuOffen && (
                                <div style={{
                                    marginTop:'10px',
                                    padding:'12px',
                                    background:'rgba(30,136,229,0.08)',
                                    border:'1px solid rgba(30,136,229,0.25)',
                                    borderRadius:'var(--radius-sm)'
                                }}>
                                    <div style={{
                                        fontSize:'11px', fontFamily:"'Oswald', sans-serif",
                                        fontWeight:600, letterSpacing:'1px', textTransform:'uppercase',
                                        color:'var(--accent-blue)', marginBottom:'10px',
                                        display:'flex', alignItems:'center', justifyContent:'space-between'
                                    }}>
                                        <span>Neuer Mitarbeiter</span>
                                        <button
                                            onClick={function(){
                                                setNeuOffen(false);
                                                setNeuName('');
                                                setNeuRolle('Fliesenleger');
                                            }}
                                            style={{
                                                background:'transparent', border:'none', cursor:'pointer',
                                                color:'var(--text-muted)', fontSize:'16px', padding:'0 4px'
                                            }}
                                            title="Abbrechen">✗</button>
                                    </div>

                                    {/* Name */}
                                    <div style={{ marginBottom:'10px' }}>
                                        <label style={{
                                            display:'block', fontSize:'10px', fontFamily:"'Oswald', sans-serif",
                                            fontWeight:600, letterSpacing:'1px', textTransform:'uppercase',
                                            color:'var(--text-muted)', marginBottom:'4px'
                                        }}>Name</label>
                                        {(typeof MicInput !== 'undefined') ? (
                                            <MicInput
                                                value={neuName}
                                                onChange={function(e){ setNeuName(e && e.target ? e.target.value : ''); }}
                                                placeholder="z. B. Mehmet"
                                                style={{
                                                    width:'100%', padding:'9px 12px',
                                                    background:'var(--bg-secondary)', color:'var(--text-primary)',
                                                    border:'1px solid var(--border-color)', borderRadius:'var(--radius-sm)',
                                                    fontSize:'14px', fontFamily:"'Source Sans 3', sans-serif"
                                                }}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={neuName}
                                                onChange={function(e){ setNeuName(e.target.value); }}
                                                placeholder="z. B. Mehmet"
                                                style={{
                                                    width:'100%', padding:'9px 12px', boxSizing:'border-box',
                                                    background:'var(--bg-secondary)', color:'var(--text-primary)',
                                                    border:'1px solid var(--border-color)', borderRadius:'var(--radius-sm)',
                                                    fontSize:'14px', fontFamily:"'Source Sans 3', sans-serif"
                                                }}
                                            />
                                        )}
                                    </div>

                                    {/* Rolle */}
                                    <div style={{ marginBottom:'10px' }}>
                                        <label style={{
                                            display:'block', fontSize:'10px', fontFamily:"'Oswald', sans-serif",
                                            fontWeight:600, letterSpacing:'1px', textTransform:'uppercase',
                                            color:'var(--text-muted)', marginBottom:'4px'
                                        }}>Rolle</label>
                                        <div style={{ display:'flex', gap:'6px' }}>
                                            {['Fliesenleger','Helfer','Azubi'].map(function(r){
                                                var aktiv = neuRolle === r;
                                                return (
                                                    <button
                                                        key={r}
                                                        onClick={function(){ setNeuRolle(r); }}
                                                        style={{
                                                            flex:1, padding:'8px 0',
                                                            background: aktiv ? 'linear-gradient(135deg, #1E88E5, #1565C0)' : 'var(--bg-secondary)',
                                                            color: aktiv ? '#fff' : 'var(--text-primary)',
                                                            border: '1px solid ' + (aktiv ? '#1565C0' : 'var(--border-color)'),
                                                            borderRadius:'var(--radius-sm)',
                                                            fontSize:'12px', fontWeight: aktiv ? 600 : 400,
                                                            cursor:'pointer', touchAction:'manipulation'
                                                        }}>{r}</button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Anlegen-Button */}
                                    <button
                                        onClick={handleNeuAnlegen}
                                        disabled={neuBusy || !(typeof neuName === 'string' && neuName.trim())}
                                        style={{
                                            width:'100%', padding:'10px',
                                            background: (neuBusy || !(typeof neuName === 'string' && neuName.trim()))
                                                ? 'var(--bg-secondary)'
                                                : 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                            color:'#fff',
                                            border:'none', borderRadius:'var(--radius-sm)',
                                            fontFamily:"'Oswald', sans-serif", fontSize:'13px',
                                            fontWeight:600, letterSpacing:'1px', textTransform:'uppercase',
                                            cursor: (neuBusy || !(typeof neuName === 'string' && neuName.trim())) ? 'default' : 'pointer',
                                            opacity: (neuBusy || !(typeof neuName === 'string' && neuName.trim())) ? 0.5 : 1,
                                            touchAction:'manipulation'
                                        }}>
                                        {neuBusy ? 'Wird angelegt...' : 'Anlegen & uebernehmen'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Gueltigkeits-Dauer — 22.04.2026: erweitert um 6/12 Monate */}
                        <div style={{ marginBottom:'14px' }}>
                            <label style={{
                                display:'block', fontSize:'11px', fontFamily:"'Oswald', sans-serif",
                                fontWeight:600, letterSpacing:'1px', textTransform:'uppercase',
                                color:'var(--text-muted)', marginBottom:'6px'
                            }}>Gueltig fuer (Tage / Monate)</label>
                            <div style={{ display:'flex', gap:'4px' }}>
                                {[
                                    { wert:'1',   label:'1' },
                                    { wert:'3',   label:'3' },
                                    { wert:'7',   label:'7' },
                                    { wert:'14',  label:'14' },
                                    { wert:'30',  label:'30' },
                                    { wert:'180', label:'6M' },
                                    { wert:'365', label:'12M' }
                                ].map(function(opt) {
                                    var aktiv = gueltigTage === opt.wert;
                                    return (
                                        <button
                                            key={opt.wert}
                                            onClick={function(){ setGueltigTage(opt.wert); }}
                                            style={{
                                                flex:1, padding:'8px 0',
                                                background: aktiv ? 'linear-gradient(135deg, #1E88E5, #1565C0)' : 'var(--bg-secondary)',
                                                color: aktiv ? '#fff' : 'var(--text-primary)',
                                                border: '1px solid ' + (aktiv ? '#1565C0' : 'var(--border-color)'),
                                                borderRadius:'var(--radius-sm)',
                                                fontSize:'12px', fontWeight: aktiv ? 600 : 400,
                                                cursor:'pointer', touchAction:'manipulation'
                                            }}>{opt.label}</button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* PIN-Vorschau */}
                        <div style={{
                            padding:'14px', marginBottom:'16px',
                            background:'rgba(30,136,229,0.10)',
                            border:'1px solid rgba(30,136,229,0.25)',
                            borderRadius:'var(--radius-sm)',
                            textAlign:'center'
                        }}>
                            <div style={{
                                fontSize:'11px', fontFamily:"'Oswald', sans-serif",
                                fontWeight:600, letterSpacing:'1px', textTransform:'uppercase',
                                color:'var(--text-muted)', marginBottom:'6px'
                            }}>6-stellige PIN</div>
                            <div style={{
                                fontFamily:"'Courier New', monospace",
                                fontSize:'28px', fontWeight:700,
                                letterSpacing:'6px',
                                color:'var(--accent-blue)'
                            }}>{pin}</div>
                            <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'6px' }}>
                                Diese PIN gilt nur fuer diese Einladung.
                            </div>
                        </div>

                        {/* Info */}
                        <div style={{
                            padding:'10px 12px', marginBottom:'16px',
                            background:'rgba(77,166,255,0.08)',
                            border:'1px solid rgba(77,166,255,0.2)',
                            borderRadius:'var(--radius-sm)',
                            fontSize:'12px', color:'var(--text-light)', lineHeight:1.5
                        }}>
                            📱 Nach Klick auf "Erstellen" bekommst du einen QR-Code,
                            den der Mitarbeiter auf seinem Handy scannt. Mit PIN meldet
                            er das Geraet dann an.
                        </div>

                        {/* Buttons */}
                        <div style={{ display:'flex', gap:'8px' }}>
                            <button
                                onClick={onSchliessen}
                                disabled={busy}
                                style={{
                                    flex:1, padding:'12px',
                                    background:'var(--bg-secondary)',
                                    color:'var(--text-primary)',
                                    border:'1px solid var(--border-color)',
                                    borderRadius:'var(--radius-sm)',
                                    fontSize:'13px', fontFamily:"'Oswald', sans-serif",
                                    fontWeight:600, letterSpacing:'1px', textTransform:'uppercase',
                                    cursor: busy ? 'not-allowed' : 'pointer',
                                    opacity: busy ? 0.5 : 1,
                                    touchAction:'manipulation'
                                }}>Abbrechen</button>
                            <button
                                onClick={handleErstellen}
                                disabled={busy || !gewaehlt}
                                style={{
                                    flex:1, padding:'12px',
                                    background: busy ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                    color:'#fff',
                                    border:'none',
                                    borderRadius:'var(--radius-sm)',
                                    fontSize:'13px', fontFamily:"'Oswald', sans-serif",
                                    fontWeight:600, letterSpacing:'1px', textTransform:'uppercase',
                                    cursor: busy ? 'wait' : 'pointer',
                                    boxShadow: busy ? 'none' : '0 4px 15px rgba(30,136,229,0.30)',
                                    touchAction:'manipulation'
                                }}>{busy ? 'Erstellt...' : 'Erstellen'}</button>
                        </div>
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // DIALOG: QR-Code anzeigen (Etappe 6)
        // Zeigt Einladungs-QR-Code + PIN zum Scannen auf dem MA-Handy.
        // ═══════════════════════════════════════════════════════
        function QRCodeDialog({ einladung, onSchliessen }) {
            const qrRef = React.useRef(null);

            // Payload fuer QR: Code + optional URL zur MA-App
            // Format: { code, pin } als JSON-String (MA-App parst das)
            var payload = JSON.stringify({
                code: einladung.code,
                mitarbeiter: einladung.mitarbeiter,
                v: 1
            });

            useEffect(function() {
                if (!qrRef.current) return;
                if (!window.QRCode) return;
                // Alten QR entfernen (React-StrictMode kann useEffect doppelt triggern)
                qrRef.current.innerHTML = '';
                try {
                    new window.QRCode(qrRef.current, {
                        text: payload,
                        width: 240,
                        height: 240,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: window.QRCode.CorrectLevel.M
                    });
                } catch(e) {
                    qrRef.current.innerHTML = '<div style="color:red;padding:20px">QR-Code-Fehler: '+e.message+'</div>';
                }
            }, [payload]);

            var gueltig = einladung.gueltigBis ? new Date(einladung.gueltigBis).toLocaleDateString('de-DE') : '—';

            return (
                <div
                    onClick={onSchliessen}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.75)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px'
                    }}>
                    <div
                        onClick={function(e){ e.stopPropagation(); }}
                        style={{
                            width: '100%',
                            maxWidth: '380px',
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius-md)',
                            padding: '22px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                        }}>
                        <div style={{
                            fontFamily:"'Oswald', sans-serif", fontSize:'14px', fontWeight:600,
                            letterSpacing:'1px', textTransform:'uppercase',
                            color:'var(--text-primary)', textAlign:'center', marginBottom:'4px'
                        }}>Einladung fuer</div>
                        <div style={{
                            fontSize:'18px', fontWeight:700, textAlign:'center',
                            color:'var(--accent-blue)', marginBottom:'14px'
                        }}>{einladung.mitarbeiter}</div>

                        {/* QR-Code */}
                        <div style={{
                            background:'#fff', padding:'16px', borderRadius:'var(--radius-sm)',
                            display:'flex', justifyContent:'center', marginBottom:'14px'
                        }}>
                            <div ref={qrRef} />
                        </div>

                        {/* Code + PIN */}
                        <div style={{
                            background:'var(--bg-secondary)',
                            borderRadius:'var(--radius-sm)', padding:'12px',
                            marginBottom:'14px'
                        }}>
                            <div style={{
                                display:'flex', justifyContent:'space-between',
                                alignItems:'center', marginBottom:'8px'
                            }}>
                                <span style={{ fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px' }}>Code</span>
                                <span style={{
                                    fontFamily:"'Courier New', monospace", fontSize:'18px',
                                    fontWeight:700, letterSpacing:'3px', color:'var(--text-primary)'
                                }}>{einladung.code}</span>
                            </div>
                            <div style={{
                                display:'flex', justifyContent:'space-between', alignItems:'center'
                            }}>
                                <span style={{ fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px' }}>PIN</span>
                                <span style={{
                                    fontFamily:"'Courier New', monospace", fontSize:'18px',
                                    fontWeight:700, letterSpacing:'3px', color:'var(--accent-blue)'
                                }}>{einladung.pin}</span>
                            </div>
                            <div style={{
                                marginTop:'8px', paddingTop:'8px',
                                borderTop:'1px solid var(--border-color)',
                                fontSize:'11px', color:'var(--text-muted)', textAlign:'center'
                            }}>Gueltig bis {gueltig}</div>
                        </div>

                        {/* Hinweis */}
                        <div style={{
                            padding:'10px 12px', marginBottom:'14px',
                            background:'rgba(46,155,74,0.10)',
                            border:'1px solid rgba(46,155,74,0.25)',
                            borderRadius:'var(--radius-sm)',
                            fontSize:'12px', color:'var(--text-light)', lineHeight:1.5
                        }}>
                            📱 <strong>So geht's:</strong><br/>
                            1. Mitarbeiter-Handy oeffnet die MA-App<br/>
                            2. QR-Code scannen<br/>
                            3. PIN eingeben<br/>
                            4. Du bekommst die Geraete-Freigabe in "Wartende Freigaben"
                        </div>

                        {/* Schliessen */}
                        <button
                            onClick={onSchliessen}
                            style={{
                                width:'100%', padding:'12px',
                                background:'linear-gradient(135deg, #1E88E5, #1565C0)',
                                color:'#fff', border:'none',
                                borderRadius:'var(--radius-sm)',
                                fontSize:'13px', fontFamily:"'Oswald', sans-serif",
                                fontWeight:600, letterSpacing:'1px', textTransform:'uppercase',
                                cursor:'pointer',
                                boxShadow:'0 4px 15px rgba(30,136,229,0.30)',
                                touchAction:'manipulation'
                            }}>Schliessen</button>
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // UNTERSEITE 3: Synchronisation (Sync + Config)
        // Recycling der bisherigen Sync- und Config-Tabs
        // ═══════════════════════════════════════════════════════
        function SynchronisationsBereich({ fbOk, fbConfig, setFbConfig, syncStatus, log, busy, projects, onConnect, onDisconnect, onSync, onBack, auditLog }) {
            // Etappe 9: Aus Tabs wird eine einspaltige Ansicht mit Erweitert-Toggle
            const [erweitertOffen, setErweitertOffen] = useState(false);

            // ── Etappe 9: Kacheldaten aus Audit-Log berechnen ──
            var ts24h = Date.now() - 24*60*60*1000;
            var syncEvents = (auditLog || []).filter(function(e) {
                return e.actionType === 'sync_completed' || e.actionType === 'sync_failed';
            });
            var letzterSync = syncEvents.length > 0 ? syncEvents[0] : null;
            var fehlerLetzte24h = syncEvents.filter(function(e) {
                return e.actionType === 'sync_failed' && (e.timestamp || 0) > ts24h;
            }).length;

            // Relativ-Zeit formatieren: "vor 5 Min", "vor 2 Std", "vor 3 Tagen"
            function relativZeit(ts) {
                if (!ts) return '—';
                var diff = Date.now() - ts;
                var sek = Math.floor(diff / 1000);
                var min = Math.floor(sek / 60);
                var std = Math.floor(min / 60);
                var tage = Math.floor(std / 24);
                if (sek < 60)  return 'gerade eben';
                if (min < 60)  return 'vor ' + min + ' Min';
                if (std < 24)  return 'vor ' + std + ' Std';
                if (tage < 30) return 'vor ' + tage + ' Tag' + (tage === 1 ? '' : 'en');
                return new Date(ts).toLocaleDateString('de-DE');
            }

            // ── Firebase-Config-Formular (im Erweitert-Bereich) ──
            var configFields = [
                { k:'apiKey', l:'API Key *', p:'AIzaSy...' },
                { k:'projectId', l:'Project ID *', p:'einkaufsliste-98199' },
                { k:'databaseURL', l:'Database URL *', p:'https://...firebasedatabase.app' },
                { k:'authDomain', l:'Auth Domain', p:'...firebaseapp.com' },
                { k:'storageBucket', l:'Storage Bucket', p:'...appspot.com' },
                { k:'appId', l:'App ID', p:'1:123:web:abc...' }
            ];

            return (
                <div className="page-container" style={{ padding:'16px', minHeight:'100vh' }}>
                    <UnterseitenHeader
                        icon="🔄"
                        titel="Synchronisation"
                        untertitel={fbOk ? 'Verbunden mit ' + fbConfig.projectId : 'Nicht verbunden'}
                        onBack={onBack}
                    />

                    {/* ═══ Kein Firebase: Direkt zum Config ═══ */}
                    {!fbOk && (
                        <div>
                            <div style={{
                                padding:'16px', marginBottom:'14px',
                                background:'rgba(230,126,34,0.10)',
                                border:'1px solid rgba(230,126,34,0.25)',
                                borderRadius:'var(--radius-md)',
                                color:'var(--text-primary)', textAlign:'center'
                            }}>
                                <div style={{ fontSize:'32px', marginBottom:'8px' }}>🔌</div>
                                <div style={{
                                    fontFamily:"'Oswald', sans-serif", fontSize:'14px',
                                    fontWeight:600, letterSpacing:'1px', textTransform:'uppercase',
                                    marginBottom:'4px'
                                }}>Firebase nicht verbunden</div>
                                <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>
                                    Unter "Erweitert" die Zugangsdaten eintragen und verbinden.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ Verbunden: Kachel-Dashboard + Staging-Sync ═══ */}
                    {fbOk && (
                        <div>
                            {/* 3 Status-Kacheln */}
                            <div style={{
                                display:'grid',
                                gridTemplateColumns:'repeat(3, 1fr)',
                                gap:'8px',
                                marginBottom:'14px'
                            }}>
                                {/* Letzter Sync */}
                                <div style={{
                                    padding:'14px 10px',
                                    background: letzterSync && letzterSync.actionType === 'sync_completed'
                                        ? 'linear-gradient(135deg, rgba(46,155,74,0.15), rgba(46,155,74,0.05))'
                                        : 'var(--bg-card)',
                                    border:'1px solid ' + (letzterSync && letzterSync.actionType === 'sync_completed' ? 'rgba(46,155,74,0.3)' : 'var(--border-color)'),
                                    borderRadius:'var(--radius-md)',
                                    textAlign:'center'
                                }}>
                                    <div style={{ fontSize:'22px', marginBottom:'4px' }}>🔄</div>
                                    <div style={{
                                        fontSize:'11px', color:'var(--text-muted)',
                                        fontFamily:"'Oswald', sans-serif",
                                        fontWeight:600, letterSpacing:'0.5px',
                                        textTransform:'uppercase', marginBottom:'3px'
                                    }}>Letzter Sync</div>
                                    <div style={{
                                        fontSize:'12px', fontWeight:600,
                                        color: letzterSync ? 'var(--text-primary)' : 'var(--text-muted)',
                                        fontFamily:"'Source Sans 3', sans-serif",
                                        lineHeight:1.3
                                    }}>
                                        {letzterSync ? relativZeit(letzterSync.timestamp) : 'Noch nicht'}
                                    </div>
                                </div>

                                {/* Projekte gesamt */}
                                <div style={{
                                    padding:'14px 10px',
                                    background:'var(--bg-card)',
                                    border:'1px solid var(--border-color)',
                                    borderRadius:'var(--radius-md)',
                                    textAlign:'center'
                                }}>
                                    <div style={{ fontSize:'22px', marginBottom:'4px' }}>📂</div>
                                    <div style={{
                                        fontSize:'11px', color:'var(--text-muted)',
                                        fontFamily:"'Oswald', sans-serif",
                                        fontWeight:600, letterSpacing:'0.5px',
                                        textTransform:'uppercase', marginBottom:'3px'
                                    }}>Baustellen</div>
                                    <div style={{
                                        fontSize:'18px', fontWeight:700,
                                        color:'var(--text-primary)',
                                        fontFamily:"'Source Sans 3', sans-serif"
                                    }}>{syncStatus.projects || 0}</div>
                                </div>

                                {/* Fehler 24h */}
                                <div style={{
                                    padding:'14px 10px',
                                    background: fehlerLetzte24h > 0
                                        ? 'linear-gradient(135deg, rgba(196,30,30,0.15), rgba(196,30,30,0.05))'
                                        : 'var(--bg-card)',
                                    border:'1px solid ' + (fehlerLetzte24h > 0 ? 'rgba(196,30,30,0.3)' : 'var(--border-color)'),
                                    borderRadius:'var(--radius-md)',
                                    textAlign:'center'
                                }}>
                                    <div style={{ fontSize:'22px', marginBottom:'4px' }}>
                                        {fehlerLetzte24h > 0 ? '⚠️' : '✓'}
                                    </div>
                                    <div style={{
                                        fontSize:'11px', color:'var(--text-muted)',
                                        fontFamily:"'Oswald', sans-serif",
                                        fontWeight:600, letterSpacing:'0.5px',
                                        textTransform:'uppercase', marginBottom:'3px'
                                    }}>Fehler 24h</div>
                                    <div style={{
                                        fontSize:'18px', fontWeight:700,
                                        color: fehlerLetzte24h > 0 ? 'var(--accent-red)' : '#2e9b4a',
                                        fontFamily:"'Source Sans 3', sans-serif"
                                    }}>{fehlerLetzte24h}</div>
                                </div>
                            </div>

                            {/* Staging-Sync-Panel mit Reparieren-Buttons bei Fehlern */}
                            <StagingSyncPanel fbOk={fbOk} fbConfig={fbConfig} auditLog={auditLog} />
                        </div>
                    )}

                    {/* ═══ Erweitert-Toggle ═══ */}
                    <button
                        onClick={function(){ setErweitertOffen(!erweitertOffen); }}
                        style={{
                            width:'100%', marginTop:'20px', padding:'12px',
                            background:'var(--bg-secondary)',
                            color:'var(--text-light)',
                            border:'1px solid var(--border-color)',
                            borderRadius:'var(--radius-sm)',
                            fontSize:'12px', fontFamily:"'Oswald', sans-serif",
                            fontWeight:600, letterSpacing:'1px', textTransform:'uppercase',
                            cursor:'pointer', touchAction:'manipulation',
                            display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
                        }}>
                        <span style={{ transform: erweitertOffen ? 'rotate(90deg)' : 'rotate(0deg)', transition:'transform 0.2s' }}>▶</span>
                        <span>⚙️ Erweitert</span>
                    </button>

                    {erweitertOffen && (
                        <div style={{ marginTop:'12px' }}>
                            {/* Firebase-Config */}
                            <div className="ba-card">
                                <div className="ba-card-title">🔧 Firebase Konfiguration</div>
                                <p style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'14px', lineHeight:'1.5' }}>
                                    Zugangsdaten aus der Firebase Console eintragen.
                                    {fbOk && <span style={{ color:'#2e9b4a', fontWeight:600 }}> Verbunden.</span>}
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

                            {/* Manuelles Sync */}
                            {fbOk && (
                                <div className="ba-card">
                                    <div className="ba-card-title">🔁 Projekte neu laden</div>
                                    <p style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'12px', lineHeight:1.5 }}>
                                        Laedt die Projekt- und Benutzer-Statistik aus Firebase neu.
                                    </p>
                                    <button className="ba-btn blu" onClick={onSync} disabled={busy}
                                        style={{ width:'100%' }}>
                                        {busy ? '⏳ Lade...' : '🔄 Statistik neu laden'}
                                    </button>
                                </div>
                            )}

                            {/* Protokoll */}
                            {fbOk && log.length > 0 && (
                                <div className="ba-card">
                                    <div className="ba-card-title">📋 Sitzungs-Protokoll</div>
                                    <div className="ba-log">
                                        {log.map(function(e,i) {
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
                            )}
                        </div>
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // STAGING-SYNC-PANEL (Etappe 7)
        // Zeigt alle Staging-Baustellen und erlaubt manuelles Firebase-Sync.
        // ═══════════════════════════════════════════════════════
        function StagingSyncPanel({ fbOk, fbConfig, auditLog }) {
            const [baustellen, setBaustellen] = useState([]);
            const [ladeFehler, setLadeFehler] = useState(null);
            const [laedt, setLaedt] = useState(false);
            const [syncStatus, setSyncStatus] = useState({}); // { baustelleName: {running, ergebnis, fehler} }
            const [allesLaeuft, setAllesLaeuft] = useState(false);

            // ── Etappe 9: Map "Baustelle → letzter Sync-Audit-Event" ──
            // Damit koennen wir bei Baustellen, die in der letzten Zeit fehlerhaft waren,
            // einen "Reparieren"-Button anzeigen.
            var auditPerBaustelle = {};
            (auditLog || []).forEach(function(e) {
                if (e.actionType !== 'sync_completed' && e.actionType !== 'sync_failed') return;
                var b = e.details && e.details.baustelle;
                if (!b) return;
                // Nur den ersten Eintrag pro Baustelle behalten (auditLog ist neu->alt sortiert)
                if (!auditPerBaustelle[b]) auditPerBaustelle[b] = e;
            });

            async function ladeBaustellen() {
                setLaedt(true);
                setLadeFehler(null);
                try {
                    if (!window.TWStaging) throw new Error('Staging-API nicht geladen');
                    var list = await window.TWStaging.listStagingBaustellen();
                    setBaustellen(list || []);
                } catch (e) {
                    setLadeFehler(e.message || String(e));
                }
                setLaedt(false);
            }

            useEffect(function() {
                if (fbOk) ladeBaustellen();
            }, [fbOk]);

            async function syncEine(b) {
                var name = b.name;
                setSyncStatus(function(prev) {
                    var n = Object.assign({}, prev);
                    n[name] = { running: true };
                    return n;
                });
                try {
                    var pid = b.id || name;
                    var erg = await window.TWStaging.syncStagingNachFirebase(name, pid);
                    setSyncStatus(function(prev) {
                        var n = Object.assign({}, prev);
                        n[name] = { running: false, ergebnis: erg, zeit: new Date() };
                        return n;
                    });
                    // Etappe 9: Audit-Event fuer erfolgreichen Sync
                    if (window.FirebaseService && window.FirebaseService.logAuditEvent) {
                        window.FirebaseService.logAuditEvent('sync_completed', {
                            baustelle: name,
                            gesamt: erg.gesamt || 0,
                            unterordner: Object.keys(erg.unterordner || {}).length
                        });
                    }
                } catch (e) {
                    setSyncStatus(function(prev) {
                        var n = Object.assign({}, prev);
                        n[name] = { running: false, fehler: e.message || String(e), zeit: new Date() };
                        return n;
                    });
                    // Etappe 9: Audit-Event fuer fehlgeschlagenen Sync
                    if (window.FirebaseService && window.FirebaseService.logAuditEvent) {
                        window.FirebaseService.logAuditEvent('sync_failed', {
                            baustelle: name,
                            fehler: e.message || String(e)
                        });
                    }
                }
            }

            async function syncAlle() {
                if (baustellen.length === 0) return;
                setAllesLaeuft(true);
                for (var i = 0; i < baustellen.length; i++) {
                    await syncEine(baustellen[i]);
                }
                setAllesLaeuft(false);
            }

            if (!fbOk) {
                return (
                    <div style={{ textAlign:'center', padding:'30px 16px', color:'var(--text-muted)', fontSize:'13px' }}>
                        <div style={{ fontSize:'40px', opacity:0.3, marginBottom:'10px' }}>🔌</div>
                        Firebase ist nicht verbunden.<br/>
                        Siehe Tab "Config".
                    </div>
                );
            }

            return (
                <div>
                    {/* Info */}
                    <div style={{
                        padding:'10px 14px', marginBottom:'12px',
                        background:'rgba(77,166,255,0.08)',
                        border:'1px solid rgba(77,166,255,0.2)',
                        borderRadius:'var(--radius-sm)',
                        fontSize:'12px', color:'var(--text-light)', lineHeight:1.5
                    }}>
                        📂 <strong>Staging-Sync</strong> — repliziert Datei-Metadaten von Drive nach Firebase,
                        damit die Mitarbeiter-App sie sehen kann. Dateien bleiben in Drive, die MA-App
                        laedt sie direkt von dort.
                    </div>

                    {/* Sync-Alle-Button */}
                    <button
                        onClick={syncAlle}
                        disabled={allesLaeuft || baustellen.length === 0}
                        style={{
                            width:'100%', padding:'14px 16px', marginBottom:'14px',
                            borderRadius:'var(--radius-md)', border:'none',
                            background: allesLaeuft ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #1E88E5, #1565C0)',
                            color: allesLaeuft ? 'var(--text-muted)' : '#fff',
                            fontFamily:"'Oswald', sans-serif", fontSize:'14px', fontWeight:600,
                            letterSpacing:'1.5px', textTransform:'uppercase',
                            cursor: allesLaeuft ? 'wait' : 'pointer',
                            boxShadow: allesLaeuft ? 'none' : '0 4px 15px rgba(30,136,229,0.30)',
                            touchAction:'manipulation',
                            display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'
                        }}>
                        <span style={{ fontSize:'20px' }}>{allesLaeuft ? '⏳' : '🔄'}</span>
                        <span>{allesLaeuft ? 'Synchronisiert...' : 'Alle Baustellen synchronisieren'}</span>
                    </button>

                    {/* Fehler beim Laden */}
                    {ladeFehler && (
                        <div style={{
                            padding:'12px 14px', marginBottom:'12px',
                            background:'rgba(196,30,30,0.1)',
                            border:'1px solid rgba(196,30,30,0.3)',
                            borderRadius:'var(--radius-md)',
                            color:'var(--accent-red)', fontSize:'13px'
                        }}>
                            <strong>Fehler:</strong> {ladeFehler}
                        </div>
                    )}

                    {/* Laden */}
                    {laedt && (
                        <div style={{ textAlign:'center', padding:'20px', color:'var(--text-muted)', fontSize:'13px' }}>
                            ⏳ Baustellen werden geladen...
                        </div>
                    )}

                    {/* Leer */}
                    {!laedt && baustellen.length === 0 && !ladeFehler && (
                        <div style={{ textAlign:'center', padding:'30px 16px', color:'var(--text-muted)' }}>
                            <div style={{ fontSize:'40px', opacity:0.3, marginBottom:'10px' }}>📂</div>
                            <div style={{ fontSize:'13px' }}>Noch keine Staging-Baustellen</div>
                            <div style={{ fontSize:'11px', marginTop:'4px' }}>
                                Erst im Baustellen-Bereich eine Staging-Umgebung anlegen.
                            </div>
                        </div>
                    )}

                    {/* Baustellen-Liste */}
                    {!laedt && baustellen.length > 0 && (
                        <div>
                            <div style={{
                                fontSize:'11px', fontFamily:"'Oswald', sans-serif",
                                fontWeight:600, letterSpacing:'1px', textTransform:'uppercase',
                                color:'var(--text-muted)', marginBottom:'8px', paddingLeft:'4px'
                            }}>
                                Baustellen ({baustellen.length})
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                                {baustellen.map(function(b) {
                                    var status = syncStatus[b.name] || {};

                                    // Etappe 9: Audit-Info fuer diese Baustelle (falls keine Session-Aktion gelaufen ist)
                                    var audit = auditPerBaustelle[b.name];
                                    var historischFehler = audit && audit.actionType === 'sync_failed';
                                    var zeigeReparieren = historischFehler && !status.ergebnis && !status.running;

                                    var statusBadge = null;
                                    if (status.running) {
                                        statusBadge = <span style={{
                                            fontSize:'10px', padding:'2px 8px',
                                            background:'rgba(30,136,229,0.20)', color:'var(--accent-blue)',
                                            borderRadius:'6px', fontFamily:"'Oswald', sans-serif",
                                            fontWeight:600, letterSpacing:'0.5px'
                                        }}>⏳ SYNCT...</span>;
                                    } else if (status.fehler) {
                                        statusBadge = <span style={{
                                            fontSize:'10px', padding:'2px 8px',
                                            background:'rgba(196,30,30,0.20)', color:'var(--accent-red)',
                                            borderRadius:'6px', fontFamily:"'Oswald', sans-serif",
                                            fontWeight:600, letterSpacing:'0.5px'
                                        }}>✗ FEHLER</span>;
                                    } else if (status.ergebnis) {
                                        statusBadge = <span style={{
                                            fontSize:'10px', padding:'2px 8px',
                                            background:'rgba(46,155,74,0.20)', color:'#2e9b4a',
                                            borderRadius:'6px', fontFamily:"'Oswald', sans-serif",
                                            fontWeight:600, letterSpacing:'0.5px'
                                        }}>✓ {status.ergebnis.gesamt} DATEIEN</span>;
                                    } else if (historischFehler) {
                                        statusBadge = <span style={{
                                            fontSize:'10px', padding:'2px 8px',
                                            background:'rgba(230,126,34,0.20)', color:'var(--accent-orange)',
                                            borderRadius:'6px', fontFamily:"'Oswald', sans-serif",
                                            fontWeight:600, letterSpacing:'0.5px'
                                        }}>⚠ FEHLERHAFT</span>;
                                    } else if (audit && audit.actionType === 'sync_completed') {
                                        statusBadge = <span style={{
                                            fontSize:'10px', padding:'2px 8px',
                                            background:'rgba(46,155,74,0.15)', color:'#2e9b4a',
                                            borderRadius:'6px', fontFamily:"'Oswald', sans-serif",
                                            fontWeight:600, letterSpacing:'0.5px'
                                        }}>✓ SYNCHRON</span>;
                                    }

                                    return (
                                        <div key={b.id || b.name} style={{
                                            padding:'12px',
                                            background: zeigeReparieren
                                                ? 'linear-gradient(135deg, rgba(230,126,34,0.08), rgba(230,126,34,0.02))'
                                                : 'var(--bg-card)',
                                            border:'1px solid ' + (zeigeReparieren ? 'rgba(230,126,34,0.30)' : 'var(--border-color)'),
                                            borderRadius:'var(--radius-sm)'
                                        }}>
                                            <div style={{
                                                display:'flex', justifyContent:'space-between',
                                                alignItems:'center', marginBottom:'6px'
                                            }}>
                                                <div style={{
                                                    flex:1, minWidth:0, fontSize:'13px', fontWeight:600,
                                                    fontFamily:"'Source Sans 3', sans-serif",
                                                    color:'var(--text-primary)',
                                                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
                                                }}>📂 {b.name}</div>
                                                {statusBadge}
                                            </div>
                                            {status.zeit && (
                                                <div style={{ fontSize:'10px', color:'var(--text-muted)', marginBottom:'8px' }}>
                                                    Letzter Sync: {new Date(status.zeit).toLocaleTimeString('de-DE')}
                                                </div>
                                            )}
                                            {!status.zeit && audit && audit.timestamp && (
                                                <div style={{ fontSize:'10px', color:'var(--text-muted)', marginBottom:'8px' }}>
                                                    Letzter Sync: {new Date(audit.timestamp).toLocaleString('de-DE', {
                                                        day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'
                                                    })}
                                                </div>
                                            )}
                                            {status.fehler && (
                                                <div style={{
                                                    fontSize:'11px', color:'var(--accent-red)',
                                                    marginBottom:'8px', lineHeight:1.4
                                                }}>{status.fehler}</div>
                                            )}
                                            {!status.fehler && historischFehler && audit.details && audit.details.fehler && (
                                                <div style={{
                                                    fontSize:'11px', color:'var(--accent-orange)',
                                                    marginBottom:'8px', lineHeight:1.4
                                                }}>Letzter Versuch: {audit.details.fehler}</div>
                                            )}
                                            <button
                                                onClick={function(){ syncEine(b); }}
                                                disabled={status.running || allesLaeuft}
                                                style={{
                                                    width:'100%', padding:'8px',
                                                    background: zeigeReparieren
                                                        ? 'linear-gradient(135deg, var(--accent-orange), var(--accent-orange-light))'
                                                        : 'var(--bg-secondary)',
                                                    color: zeigeReparieren ? '#fff' : 'var(--text-primary)',
                                                    border: zeigeReparieren ? 'none' : '1px solid var(--border-color)',
                                                    borderRadius:'var(--radius-sm)',
                                                    fontSize:'12px', fontFamily:"'Oswald', sans-serif",
                                                    fontWeight:600, letterSpacing:'0.5px',
                                                    cursor: (status.running || allesLaeuft) ? 'wait' : 'pointer',
                                                    opacity: (status.running || allesLaeuft) ? 0.5 : 1,
                                                    boxShadow: zeigeReparieren ? '0 2px 8px rgba(230,126,34,0.25)' : 'none',
                                                    touchAction:'manipulation'
                                                }}>
                                                {status.running
                                                    ? '⏳ Synct...'
                                                    : (zeigeReparieren
                                                        ? '🔧 Reparieren (erneut syncen)'
                                                        : '🔄 Diese Baustelle syncen')}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
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
        // UPLOAD-DIALOG (Etappe 5)
        // Zeigt die ausgewaehlten Dateien, warnt bei >50 MB,
        // laedt sie einzeln hoch und zeigt Fortschritt.
        // Phasen:
        //   'vorschau'    — Datei-Liste + Warnungen, User bestaetigt
        //   'hochladen'   — Upload laeuft, Progress je Datei
        //   'fertig'      — Ergebnis-Zusammenfassung
        // ═══════════════════════════════════════════════════════
        function UploadDialog({ dateien, zielOrdnerId, zielOrdnerName, onSchliessen, onFertig }) {
            const [phase, setPhase] = useState('vorschau');
            const [fortschritt, setFortschritt] = useState({ current: 0, total: dateien.length, fileName: null, pct: 0 });
            const [ergebnisse, setErgebnisse] = useState([]);

            var warnSchwelleBytes = (window.STAGING_CONFIG && window.STAGING_CONFIG.WARN_COPY_SIZE_MB || 50) * 1024 * 1024;
            var gesamtGroesse = dateien.reduce(function(sum, f){ return sum + (f.size || 0); }, 0);
            var grosseDateien = dateien.filter(function(f){ return (f.size || 0) > warnSchwelleBytes; });

            async function starteUpload() {
                setPhase('hochladen');
                var res = await window.TWStaging.uploadMultipleFiles(
                    dateien,
                    zielOrdnerId,
                    { onConflict: 'umbenennen' },
                    function(current, total, fileName, pct, result) {
                        setFortschritt({ current: current, total: total, fileName: fileName, pct: pct });
                    }
                );
                setErgebnisse(res);
                setPhase('fertig');
            }

            var erfolge = ergebnisse.filter(function(r){ return r.ok; }).length;
            var fehler = ergebnisse.filter(function(r){ return !r.ok; }).length;

            return (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
                }}
                onClick={phase !== 'hochladen' ? onSchliessen : undefined}>
                    <div
                        onClick={function(e){ e.stopPropagation(); }}
                        style={{
                            width: '100%',
                            maxWidth: '560px',
                            maxHeight: '88vh',
                            background: 'var(--bg-card)',
                            borderTopLeftRadius: 'var(--radius-md)',
                            borderTopRightRadius: 'var(--radius-md)',
                            padding: '20px',
                            overflow: 'auto',
                            boxShadow: '0 -8px 30px rgba(0,0,0,0.4)'
                        }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '16px',
                            paddingBottom: '12px',
                            borderBottom: '1px solid var(--border-color)'
                        }}>
                            <span style={{ fontSize: '24px' }}>📤</span>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-primary)'
                                }}>Dateien hochladen</div>
                                <div style={{
                                    fontSize: '11.5px',
                                    color: 'var(--text-muted)',
                                    marginTop: '2px'
                                }}>nach: {zielOrdnerName}</div>
                            </div>
                        </div>

                        {/* PHASE: VORSCHAU */}
                        {phase === 'vorschau' && (
                            <React.Fragment>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                    {dateien.length} Datei{dateien.length !== 1 ? 'en' : ''} · {formatiereGroesse(gesamtGroesse)} gesamt
                                </div>

                                {/* Warnung bei grossen Dateien */}
                                {grosseDateien.length > 0 && (
                                    <div style={{
                                        padding: '10px 14px',
                                        marginBottom: '12px',
                                        background: 'rgba(230,126,34,0.10)',
                                        border: '1px solid rgba(230,126,34,0.30)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '12px',
                                        color: 'var(--text-light)',
                                        lineHeight: 1.5
                                    }}>
                                        ⚠️ <strong>Grosse Datei{grosseDateien.length !== 1 ? 'en' : ''}</strong> —
                                        {grosseDateien.length} Datei{grosseDateien.length !== 1 ? 'en' : ''} ueber {window.STAGING_CONFIG.WARN_COPY_SIZE_MB} MB.
                                        Der Upload kann einige Minuten dauern. Bitte App nicht schliessen.
                                    </div>
                                )}

                                {/* Datei-Liste */}
                                <div style={{
                                    maxHeight: '40vh',
                                    overflow: 'auto',
                                    marginBottom: '14px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)'
                                }}>
                                    {dateien.map(function(f, i) {
                                        var zuGross = (f.size || 0) > warnSchwelleBytes;
                                        return (
                                            <div key={i} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '8px 12px',
                                                borderBottom: i < dateien.length - 1 ? '1px solid var(--border-color)' : 'none'
                                            }}>
                                                <span style={{ fontSize: '16px' }}>{dateiIcon(f.name, f.type)}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: '13px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>{f.name}</div>
                                                    <div style={{
                                                        fontSize: '10.5px',
                                                        color: zuGross ? 'var(--accent-orange)' : 'var(--text-muted)',
                                                        marginTop: '1px'
                                                    }}>
                                                        {formatiereGroesse(f.size || 0)}
                                                        {zuGross ? ' · gross' : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Buttons */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={onSchliessen}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 'var(--radius-md)',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))',
                                            color: '#fff',
                                            fontFamily: "'Oswald', sans-serif",
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            letterSpacing: '1px',
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                            touchAction: 'manipulation'
                                        }}
                                    >Abbrechen</button>
                                    <button
                                        onClick={starteUpload}
                                        style={{
                                            flex: 2,
                                            padding: '12px',
                                            borderRadius: 'var(--radius-md)',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #2e9b4a 0%, #43b85e 100%)',
                                            color: '#fff',
                                            fontFamily: "'Oswald', sans-serif",
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            letterSpacing: '1px',
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                            touchAction: 'manipulation',
                                            boxShadow: '0 4px 15px rgba(46,155,74,0.30)'
                                        }}
                                    >Upload starten</button>
                                </div>
                            </React.Fragment>
                        )}

                        {/* PHASE: HOCHLADEN */}
                        {phase === 'hochladen' && (
                            <React.Fragment>
                                <div style={{
                                    fontSize: '12px',
                                    color: 'var(--text-muted)',
                                    marginBottom: '10px'
                                }}>
                                    Datei {Math.min(fortschritt.current + 1, fortschritt.total)} von {fortschritt.total}
                                </div>

                                {fortschritt.fileName && (
                                    <div style={{
                                        padding: '12px 14px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-sm)',
                                        marginBottom: '14px'
                                    }}>
                                        <div style={{
                                            fontSize: '13px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            marginBottom: '8px'
                                        }}>{fortschritt.fileName}</div>
                                        {/* Progress-Bar innerhalb der aktuellen Datei */}
                                        <div style={{
                                            height: '8px',
                                            background: 'var(--border-color)',
                                            borderRadius: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                height: '100%',
                                                width: fortschritt.pct + '%',
                                                background: 'linear-gradient(90deg, #2e9b4a, #43b85e)',
                                                transition: 'width 0.2s ease'
                                            }}/>
                                        </div>
                                        <div style={{
                                            fontSize: '11px',
                                            color: 'var(--text-muted)',
                                            marginTop: '6px',
                                            textAlign: 'right'
                                        }}>{fortschritt.pct}%</div>
                                    </div>
                                )}

                                {/* Gesamt-Fortschritt */}
                                <div style={{
                                    height: '6px',
                                    background: 'var(--border-color)',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: (fortschritt.total > 0 ? Math.round((fortschritt.current / fortschritt.total) * 100) : 0) + '%',
                                        background: 'var(--accent-blue)',
                                        transition: 'width 0.3s ease'
                                    }}/>
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    textAlign: 'center'
                                }}>Upload laeuft — bitte nicht schliessen</div>
                            </React.Fragment>
                        )}

                        {/* PHASE: FERTIG */}
                        {phase === 'fertig' && (
                            <React.Fragment>
                                <div style={{
                                    display: 'flex',
                                    gap: '8px',
                                    marginBottom: '14px'
                                }}>
                                    <div style={{
                                        flex: 1,
                                        padding: '14px',
                                        background: 'rgba(46,155,74,0.12)',
                                        border: '1px solid rgba(46,155,74,0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '22px', fontWeight: 700, color: '#2e9b4a' }}>{erfolge}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>hochgeladen</div>
                                    </div>
                                    {fehler > 0 && (
                                        <div style={{
                                            flex: 1,
                                            padding: '14px',
                                            background: 'rgba(196,30,30,0.12)',
                                            border: '1px solid rgba(196,30,30,0.3)',
                                            borderRadius: 'var(--radius-sm)',
                                            textAlign: 'center'
                                        }}>
                                            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-red)' }}>{fehler}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Fehler</div>
                                        </div>
                                    )}
                                </div>

                                {/* Fehler-Details */}
                                {fehler > 0 && (
                                    <div style={{
                                        maxHeight: '30vh',
                                        overflow: 'auto',
                                        marginBottom: '14px',
                                        padding: '10px',
                                        background: 'rgba(196,30,30,0.06)',
                                        border: '1px solid rgba(196,30,30,0.2)',
                                        borderRadius: 'var(--radius-sm)'
                                    }}>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-red)', marginBottom: '6px' }}>
                                            Fehlgeschlagene Dateien:
                                        </div>
                                        {ergebnisse.filter(function(r){ return !r.ok; }).map(function(r, i){
                                            return (
                                                <div key={i} style={{
                                                    fontSize: '11px',
                                                    color: 'var(--text-light)',
                                                    marginBottom: '4px'
                                                }}>
                                                    <strong>{r.name}:</strong> {r.fehler}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <button
                                    onClick={onFertig}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: 'var(--radius-md)',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                        color: '#fff',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        letterSpacing: '1px',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation',
                                        boxShadow: '0 4px 15px rgba(30,136,229,0.30)'
                                    }}
                                >Fertig</button>
                            </React.Fragment>
                        )}
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // LOESCHEN-DIALOG (Etappe 5)
        // Zwei Optionen:
        //   - In Papierkorb (30 Tage wiederherstellbar)
        //   - Permanent loeschen (nicht wiederherstellbar)
        // ═══════════════════════════════════════════════════════
        function LoeschenDialog({ datei, onAbbrechen, onBestaetigt }) {
            const [busy, setBusy] = useState(false);

            async function handleClick(permanent) {
                if (busy) return;
                setBusy(true);
                try {
                    await onBestaetigt(permanent);
                } finally {
                    setBusy(false);
                }
            }

            return (
                <div
                    onClick={busy ? undefined : onAbbrechen}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px'
                    }}>
                    <div
                        onClick={function(e){ e.stopPropagation(); }}
                        style={{
                            width: '100%',
                            maxWidth: '420px',
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius-md)',
                            padding: '22px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
                        }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '14px'
                        }}>
                            <span style={{ fontSize: '28px' }}>🗑️</span>
                            <div style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '16px',
                                fontWeight: 600,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                color: 'var(--text-primary)'
                            }}>Datei loeschen?</div>
                        </div>

                        <div style={{
                            padding: '10px 12px',
                            background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '14px',
                            fontSize: '13px',
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {datei.name}
                        </div>

                        <div style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            lineHeight: 1.5,
                            marginBottom: '16px'
                        }}>
                            Waehle wie die Datei geloescht werden soll:
                        </div>

                        {/* Option 1: Papierkorb */}
                        <button
                            onClick={function(){ handleClick(false); }}
                            disabled={busy}
                            style={{
                                width: '100%',
                                padding: '14px',
                                marginBottom: '10px',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: busy ? 'var(--border-color)' : 'linear-gradient(135deg, var(--accent-orange) 0%, var(--accent-orange-light) 100%)',
                                color: '#fff',
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '13px',
                                fontWeight: 600,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                cursor: busy ? 'default' : 'pointer',
                                touchAction: 'manipulation',
                                boxShadow: busy ? 'none' : '0 4px 15px rgba(230,126,34,0.30)',
                                textAlign: 'left',
                                display: 'block'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '18px' }}>♻️</span>
                                <div>
                                    <div>In Papierkorb</div>
                                    <div style={{
                                        fontSize: '10.5px',
                                        fontWeight: 400,
                                        letterSpacing: '0.3px',
                                        textTransform: 'none',
                                        opacity: 0.9,
                                        marginTop: '2px'
                                    }}>30 Tage wiederherstellbar (empfohlen)</div>
                                </div>
                            </div>
                        </button>

                        {/* Option 2: Permanent */}
                        <button
                            onClick={function(){ handleClick(true); }}
                            disabled={busy}
                            style={{
                                width: '100%',
                                padding: '14px',
                                marginBottom: '14px',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: busy ? 'var(--border-color)' : 'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))',
                                color: '#fff',
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '13px',
                                fontWeight: 600,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                cursor: busy ? 'default' : 'pointer',
                                touchAction: 'manipulation',
                                boxShadow: busy ? 'none' : '0 4px 15px rgba(196,30,30,0.30)',
                                textAlign: 'left',
                                display: 'block'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '18px' }}>⚠️</span>
                                <div>
                                    <div>Permanent loeschen</div>
                                    <div style={{
                                        fontSize: '10.5px',
                                        fontWeight: 400,
                                        letterSpacing: '0.3px',
                                        textTransform: 'none',
                                        opacity: 0.9,
                                        marginTop: '2px'
                                    }}>Nicht wiederherstellbar</div>
                                </div>
                            </div>
                        </button>

                        {/* Abbrechen */}
                        <button
                            onClick={onAbbrechen}
                            disabled={busy}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '12px',
                                fontWeight: 500,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                cursor: busy ? 'default' : 'pointer',
                                touchAction: 'manipulation',
                                opacity: busy ? 0.5 : 1
                            }}
                        >Abbrechen</button>
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

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 4 — NACHRICHTEN-BEREICH
        // Mini-Router zwischen Mitarbeiter-Liste und MA-Detail.
        // Wird von StagingDetail in subView='nachrichten' gerendert.
        // ═══════════════════════════════════════════════════════
        function NachrichtenBereich({ baustelleName }) {
            const [view, setView] = useState('liste'); // 'liste' | 'detail'
            const [aktiverMa, setAktiverMa] = useState(null);

            if (view === 'detail' && aktiverMa) {
                return <NachrichtenMaDetail
                    mitarbeiter={aktiverMa}
                    onBack={function() {
                        setView('liste');
                        setAktiverMa(null);
                    }}
                />;
            }
            return <NachrichtenMitarbeiterListe
                baustelleName={baustelleName}
                onSelectMa={function(ma) {
                    setAktiverMa(ma);
                    setView('detail');
                }}
            />;
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 4 — MITARBEITER-LISTE
        // Live-Liste aller Mitarbeiter (Merge aus MITARBEITER_LISTE
        // und /mitarbeiter/ in Firebase), mit:
        //   - Ungelesen-Badge (MA-Nachrichten mit gelesen=false)
        //   - Letzte Chat-Vorschau (gekuerzt)
        //   - Sprachen-Kuerzel
        //   - Geraete-Indikator (wieviele Geraete hat der MA?)
        // ═══════════════════════════════════════════════════════
        function NachrichtenMitarbeiterListe({ baustelleName, onSelectMa }) {
            const [mitarbeiter, setMitarbeiter] = useState(function(){
                return window.MITARBEITER_LISTE || [];
            });
            const [chatsData, setChatsData] = useState({});

            // Mitarbeiter live: Grundstock + Firebase mergen
            useEffect(function() {
                if (!window.FirebaseService || !window.FirebaseService.subscribeMitarbeiter) return;
                var grundstock = window.MITARBEITER_LISTE || [];
                var unsub = window.FirebaseService.subscribeMitarbeiter(function(fbArr) {
                    var merged = {};
                    grundstock.forEach(function(m){ if (m && m.id) merged[m.id] = m; });
                    (fbArr || []).forEach(function(m){
                        if (m && m.id) {
                            // Firebase-Daten haben Vorrang, aber Grundstock-Daten nachmergen (falls Firebase unvollstaendig)
                            merged[m.id] = Object.assign({}, merged[m.id] || {}, m);
                        }
                    });
                    var arr = [];
                    for (var k in merged) { if (merged.hasOwnProperty(k)) arr.push(merged[k]); }
                    arr.sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });
                    setMitarbeiter(arr);
                });
                return unsub;
            }, []);

            // Alle Chats live
            useEffect(function() {
                if (!window.FirebaseService || !window.FirebaseService.subscribeAlleChats) return;
                var unsub = window.FirebaseService.subscribeAlleChats(function(data) {
                    setChatsData(data || {});
                });
                return unsub;
            }, []);

            // Helper: ungelesene MA-Nachrichten zaehlen
            function ungeleseneAnzahl(maId) {
                var thread = chatsData[maId];
                if (!thread) return 0;
                var n = 0;
                for (var k in thread) {
                    if (thread.hasOwnProperty(k)) {
                        var m = thread[k];
                        if (m && m.von === 'ma' && !m.gelesen) n++;
                    }
                }
                return n;
            }

            // Helper: letzte Nachricht fuer Vorschau
            function letzteNachricht(maId) {
                var thread = chatsData[maId];
                if (!thread) return null;
                var arr = [];
                for (var k in thread) {
                    if (thread.hasOwnProperty(k)) arr.push(thread[k]);
                }
                if (arr.length === 0) return null;
                arr.sort(function(a,b){ return (b.timestamp||0) - (a.timestamp||0); });
                return arr[0];
            }

            function formatZeitRelativ(ts) {
                if (!ts) return '';
                var diff = Date.now() - ts;
                var min = Math.floor(diff / 60000);
                var std = Math.floor(min / 60);
                var tage = Math.floor(std / 24);
                if (min < 1) return 'jetzt';
                if (min < 60) return 'vor ' + min + ' Min';
                if (std < 24) return 'vor ' + std + ' Std';
                if (tage < 7) return 'vor ' + tage + ' Tag' + (tage === 1 ? '' : 'en');
                return new Date(ts).toLocaleDateString('de-DE');
            }

            function spracheKuerzel(code) {
                var map = { de:'🇩🇪 DE', en:'🇬🇧 EN', ru:'🇷🇺 RU', tr:'🇹🇷 TR',
                            cs:'🇨🇿 CS', es:'🇪🇸 ES', pl:'🇵🇱 PL', ro:'🇷🇴 RO', uk:'🇺🇦 UK' };
                return map[code] || ('🏳 ' + (code || 'de').toUpperCase());
            }

            var ohneMa = mitarbeiter.length === 0;

            return (
                <div style={{ marginTop: '12px' }}>
                    {/* Intro-Zeile */}
                    <div style={{
                        padding: '10px 12px',
                        marginBottom: '14px',
                        background: 'rgba(39,174,96,0.08)',
                        border: '1px solid rgba(39,174,96,0.25)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                            💬 Chats & Kalender sind <strong>pro Mitarbeiter</strong>, nicht pro Baustelle
                        </div>
                        <div style={{
                            fontSize: '11px',
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 600,
                            color: 'var(--success)',
                            whiteSpace: 'nowrap'
                        }}>
                            {mitarbeiter.length} MA
                        </div>
                    </div>

                    {ohneMa ? (
                        <div style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            fontSize: '13px'
                        }}>
                            Keine Mitarbeiter in der Stammliste. Ueber TEAM → "Neue Einladung" anlegen.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {mitarbeiter.map(function(ma) {
                                var anzUngel = ungeleseneAnzahl(ma.id);
                                var letzte = letzteNachricht(ma.id);
                                var geraete = ma.geraete_uuids ? Object.keys(ma.geraete_uuids).length : 0;

                                return (
                                    <button
                                        key={ma.id}
                                        onClick={function(){ onSelectMa(ma); }}
                                        style={{
                                            padding: '12px 14px',
                                            background: anzUngel > 0 ? 'rgba(39,174,96,0.10)' : 'var(--bg-card)',
                                            border: '1px solid ' + (anzUngel > 0 ? 'rgba(39,174,96,0.35)' : 'var(--border-color)'),
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            touchAction: 'manipulation',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            position: 'relative',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        {/* Kopfzeile: Name + Ungelesen-Badge */}
                                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                            <span style={{
                                                fontFamily: "'Oswald', sans-serif",
                                                fontSize: '15px',
                                                fontWeight: 600,
                                                letterSpacing: '0.5px',
                                                flex: 1
                                            }}>{ma.name || ma.id}</span>
                                            {anzUngel > 0 && (
                                                <span style={{
                                                    minWidth: '22px',
                                                    height: '22px',
                                                    padding: '0 7px',
                                                    background: 'var(--success)',
                                                    color: '#fff',
                                                    borderRadius: '11px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>{anzUngel}</span>
                                            )}
                                            <span style={{ color:'var(--text-muted)', fontSize:'18px' }}>›</span>
                                        </div>

                                        {/* Meta-Zeile: Rolle + Sprache + Geraete */}
                                        <div style={{
                                            display:'flex',
                                            alignItems:'center',
                                            gap:'10px',
                                            fontSize:'11px',
                                            color:'var(--text-muted)'
                                        }}>
                                            <span>{ma.rolle || 'Fliesenleger'}</span>
                                            <span style={{ color:'var(--border-color)' }}>·</span>
                                            <span>{spracheKuerzel(ma.sprache)}</span>
                                            {geraete > 0 && (
                                                <React.Fragment>
                                                    <span style={{ color:'var(--border-color)' }}>·</span>
                                                    <span>📱 {geraete}</span>
                                                </React.Fragment>
                                            )}
                                            {ma.status && ma.status !== 'aktiv' && (
                                                <React.Fragment>
                                                    <span style={{ color:'var(--border-color)' }}>·</span>
                                                    <span style={{ color: 'var(--accent-orange)' }}>
                                                        {ma.status === 'urlaub' ? '🏖️ Urlaub' :
                                                         ma.status === 'inaktiv' ? '⏸️ inaktiv' :
                                                         ma.status}
                                                    </span>
                                                </React.Fragment>
                                            )}
                                        </div>

                                        {/* Vorschau letzte Nachricht */}
                                        {letzte && (
                                            <div style={{
                                                marginTop: '2px',
                                                fontSize: '12px',
                                                color: 'var(--text-light)',
                                                display: 'flex',
                                                alignItems: 'baseline',
                                                gap: '6px'
                                            }}>
                                                <span style={{
                                                    fontWeight: 600,
                                                    color: letzte.von === 'ma' ? 'var(--success)' : 'var(--text-muted)',
                                                    fontSize: '10px',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {letzte.von === 'ma' ? '↙' : '↗'}
                                                </span>
                                                <span style={{
                                                    flex: 1,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {letzte.dringend ? '🔔 ' : ''}
                                                    {letzte.text_original || ''}
                                                </span>
                                                <span style={{
                                                    fontSize: '10px',
                                                    color: 'var(--text-muted)',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {formatZeitRelativ(letzte.timestamp)}
                                                </span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 4 — MA-DETAIL (Dispatcher)
        // Sub-Header mit Back-Link zur Liste + MA-Info.
        // Tab-Switcher "Kalender" | "Chat" — jeweils Platzhalter,
        // echte UI kommt in Baustein 5 (Kalender) und 6 (Chat).
        // ═══════════════════════════════════════════════════════
        function NachrichtenMaDetail({ mitarbeiter, onBack }) {
            const [tab, setTab] = useState('chat'); // 'kalender' | 'chat'

            var ma = mitarbeiter || {};
            var spracheMap = { de:'Deutsch', en:'Englisch', ru:'Russisch', tr:'Tuerkisch',
                               cs:'Tschechisch', es:'Spanisch', pl:'Polnisch',
                               ro:'Rumaenisch', uk:'Ukrainisch' };
            var spracheName = spracheMap[ma.sprache] || (ma.sprache || 'Deutsch');

            return (
                <div style={{ marginTop: '12px' }}>
                    {/* Sub-Header: Back-Link + MA-Info */}
                    <div style={{
                        padding: '12px 14px',
                        marginBottom: '14px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <button
                            onClick={onBack}
                            style={{
                                padding: '6px 12px',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                cursor: 'pointer',
                                touchAction: 'manipulation',
                                whiteSpace: 'nowrap'
                            }}
                        >← Liste</button>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '15px',
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                color: 'var(--text-primary)'
                            }}>{ma.name || ma.id || '?'}</div>
                            <div style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                marginTop: '2px'
                            }}>
                                {(ma.rolle || 'Fliesenleger') + ' · ' + spracheName}
                                {ma.status && ma.status !== 'aktiv' && ' · ' + ma.status}
                            </div>
                        </div>
                    </div>

                    {/* Tab-Switcher */}
                    <div style={{
                        display: 'flex',
                        gap: '6px',
                        marginBottom: '14px'
                    }}>
                        <button
                            onClick={function(){ setTab('kalender'); }}
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                background: tab === 'kalender'
                                    ? 'linear-gradient(135deg, #1E88E5, #1565C0)'
                                    : 'var(--bg-secondary)',
                                color: tab === 'kalender' ? '#fff' : 'var(--text-primary)',
                                border: '1px solid ' + (tab === 'kalender' ? '#1565C0' : 'var(--border-color)'),
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '13px',
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                cursor: 'pointer',
                                touchAction: 'manipulation',
                                boxShadow: tab === 'kalender' ? '0 2px 8px rgba(30,136,229,0.30)' : 'none'
                            }}
                        >📅 Kalender</button>
                        <button
                            onClick={function(){ setTab('chat'); }}
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                background: tab === 'chat'
                                    ? 'linear-gradient(135deg, #1E88E5, #1565C0)'
                                    : 'var(--bg-secondary)',
                                color: tab === 'chat' ? '#fff' : 'var(--text-primary)',
                                border: '1px solid ' + (tab === 'chat' ? '#1565C0' : 'var(--border-color)'),
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '13px',
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                cursor: 'pointer',
                                touchAction: 'manipulation',
                                boxShadow: tab === 'chat' ? '0 2px 8px rgba(30,136,229,0.30)' : 'none'
                            }}
                        >💬 Chat</button>
                    </div>

                    {/* Body — Kalender echt (B5), Chat Platzhalter bis B6 */}
                    {tab === 'kalender' && (
                        <MaKalenderJahresAnsicht mitarbeiter={ma} />
                    )}

                    {tab === 'chat' && (
                        <MaChatThread mitarbeiter={ma} />
                    )}
                </div>
            );
        }


        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 5 — KALENDER-JAHRES-ANSICHT
        // Monatsansicht mit Navigation ueber drei Jahre.
        // Pro Tag: Status-Glyphe (✓ anwesend, U urlaub, K krank, — frei)
        // plus Stunden-Zahl wenn anwesend, plus farbiger Hintergrund
        // wenn der MA an diesem Tag einer Baustellen-Planung zugeordnet ist.
        // Tap auf Tag oeffnet KalenderTagesModal zum Bearbeiten.
        // ═══════════════════════════════════════════════════════
        function MaKalenderJahresAnsicht({ mitarbeiter }) {
            var heute = new Date();
            const [jahr, setJahr] = useState(heute.getFullYear());
            const [monat, setMonat] = useState(heute.getMonth()); // 0-11
            const [kalenderDaten, setKalenderDaten] = useState({}); // {jahr: {datum: eintrag}}
            const [planungen, setPlanungen] = useState({}); // {baustelleId: {zeitraumId: {...}}}
            const [showModal, setShowModal] = useState(false);
            const [modalDatum, setModalDatum] = useState(null);

            var maId = mitarbeiter ? mitarbeiter.id : null;

            // Live-Listener: alle Kalender-Jahre des MA
            useEffect(function() {
                if (!maId) return;
                if (!window.FirebaseService || !window.FirebaseService.subscribeKalenderAlleJahre) return;
                var unsub = window.FirebaseService.subscribeKalenderAlleJahre(maId, function(data) {
                    setKalenderDaten(data || {});
                });
                return unsub;
            }, [maId]);

            // Live-Listener: alle Baustellen-Planungen
            useEffect(function() {
                if (!window.FirebaseService || !window.FirebaseService.subscribeBaustellenPlanungen) return;
                var unsub = window.FirebaseService.subscribeBaustellenPlanungen(function(data) {
                    setPlanungen(data || {});
                });
                return unsub;
            }, []);

            function getEintrag(datumStr) {
                var jahrStr = datumStr.substring(0, 4);
                return (kalenderDaten[jahrStr] && kalenderDaten[jahrStr][datumStr]) || null;
            }

            // Fuer ein Datum: alle Planungen finden, bei denen der MA dabei ist
            function getPlanungenAn(datumStr) {
                if (!maId) return [];
                var ts = new Date(datumStr + 'T12:00:00').getTime();
                var result = [];
                for (var baustelleId in planungen) {
                    if (!planungen.hasOwnProperty(baustelleId)) continue;
                    var zeitraeume = planungen[baustelleId] || {};
                    for (var zId in zeitraeume) {
                        if (!zeitraeume.hasOwnProperty(zId)) continue;
                        var z = zeitraeume[zId];
                        if (!z || !z.mitarbeiter || !z.mitarbeiter[maId]) continue;
                        if (z.von <= ts && z.bis >= ts) {
                            result.push({
                                baustelleId: baustelleId,
                                farbe: z.farbe || '#1E88E5',
                                beschreibung: z.beschreibung || ''
                            });
                        }
                    }
                }
                return result;
            }

            // Bekannte Baustellen-IDs sammeln (fuer Autosuggest im Modal)
            function bekannteBaustellen() {
                var set = {};
                // aus Planungen
                for (var bId in planungen) {
                    if (planungen.hasOwnProperty(bId)) set[bId] = true;
                }
                // aus bestehenden Eintraegen
                for (var y in kalenderDaten) {
                    if (!kalenderDaten.hasOwnProperty(y)) continue;
                    for (var d in kalenderDaten[y]) {
                        if (!kalenderDaten[y].hasOwnProperty(d)) continue;
                        var e = kalenderDaten[y][d];
                        if (e && e.baustelle_id) set[e.baustelle_id] = true;
                    }
                }
                return Object.keys(set);
            }

            function prevMonat() {
                if (monat === 0) { setMonat(11); setJahr(jahr - 1); }
                else setMonat(monat - 1);
            }
            function nextMonat() {
                if (monat === 11) { setMonat(0); setJahr(jahr + 1); }
                else setMonat(monat + 1);
            }
            function goHeute() {
                setJahr(heute.getFullYear());
                setMonat(heute.getMonth());
            }

            function handleTagClick(datumStr) {
                setModalDatum(datumStr);
                setShowModal(true);
            }

            // Grid-Zellen aufbauen — Woche startet am Montag
            var firstDay = new Date(jahr, monat, 1);
            var lastDay = new Date(jahr, monat + 1, 0);
            var daysInMonth = lastDay.getDate();
            var firstDayWeekday = firstDay.getDay(); // 0=Sonntag
            var leadingEmpty = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;

            var cells = [];
            for (var i = 0; i < leadingEmpty; i++) cells.push({ empty: true });
            for (var d = 1; d <= daysInMonth; d++) {
                var mm = String(monat + 1);
                if (mm.length < 2) mm = '0' + mm;
                var dd = String(d);
                if (dd.length < 2) dd = '0' + dd;
                var datumStr = jahr + '-' + mm + '-' + dd;
                cells.push({
                    empty: false,
                    day: d,
                    datum: datumStr,
                    eintrag: getEintrag(datumStr),
                    planungen: getPlanungenAn(datumStr),
                    istHeute: (
                        heute.getFullYear() === jahr &&
                        heute.getMonth() === monat &&
                        heute.getDate() === d
                    )
                });
            }
            while (cells.length % 7 !== 0) cells.push({ empty: true });

            var monatsnamen = [
                'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
                'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
            ];

            function statusGlyphe(status) {
                if (status === 'anwesend') return '✓';
                if (status === 'urlaub')   return 'U';
                if (status === 'krank')    return 'K';
                if (status === 'frei')     return '—';
                return '';
            }
            function statusFarbe(status) {
                if (status === 'anwesend') return 'var(--success)';
                if (status === 'urlaub')   return '#3498db';
                if (status === 'krank')    return 'var(--accent-red)';
                if (status === 'frei')     return 'var(--text-muted)';
                return 'var(--text-muted)';
            }

            return (
                <div style={{ marginTop: '6px' }}>
                    {/* Jahr-Navigation */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '10px'
                    }}>
                        <button
                            onClick={function(){ setJahr(jahr - 1); }}
                            disabled={jahr <= heute.getFullYear() - 1}
                            style={{
                                padding: '6px 10px',
                                background: 'var(--bg-secondary)',
                                color: jahr <= heute.getFullYear() - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                fontFamily: "'Oswald', sans-serif",
                                cursor: jahr <= heute.getFullYear() - 1 ? 'not-allowed' : 'pointer',
                                opacity: jahr <= heute.getFullYear() - 1 ? 0.4 : 1
                            }}
                        >◂ {jahr - 1}</button>
                        <button
                            onClick={goHeute}
                            style={{
                                flex: 1,
                                padding: '8px 10px',
                                background: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '14px',
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(30,136,229,0.30)'
                            }}
                        >📅 Heute · {jahr}</button>
                        <button
                            onClick={function(){ setJahr(jahr + 1); }}
                            disabled={jahr >= heute.getFullYear() + 2}
                            style={{
                                padding: '6px 10px',
                                background: 'var(--bg-secondary)',
                                color: jahr >= heute.getFullYear() + 2 ? 'var(--text-muted)' : 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                fontFamily: "'Oswald', sans-serif",
                                cursor: jahr >= heute.getFullYear() + 2 ? 'not-allowed' : 'pointer',
                                opacity: jahr >= heute.getFullYear() + 2 ? 0.4 : 1
                            }}
                        >{jahr + 1} ▸</button>
                    </div>

                    {/* Monats-Navigation */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '10px',
                        padding: '8px 10px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)'
                    }}>
                        <button
                            onClick={prevMonat}
                            style={{
                                padding: '4px 10px',
                                background: 'none',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >◂</button>
                        <div style={{
                            flex: 1,
                            textAlign: 'center',
                            fontFamily: "'Oswald', sans-serif",
                            fontSize: '14px',
                            fontWeight: 600,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            color: 'var(--text-primary)'
                        }}>{monatsnamen[monat]}</div>
                        <button
                            onClick={nextMonat}
                            style={{
                                padding: '4px 10px',
                                background: 'none',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >▸</button>
                    </div>

                    {/* Wochentag-Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '2px',
                        marginBottom: '2px'
                    }}>
                        {['Mo','Di','Mi','Do','Fr','Sa','So'].map(function(w, idx) {
                            return (
                                <div key={w} style={{
                                    textAlign: 'center',
                                    padding: '4px 0',
                                    fontSize: '10px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    color: (idx >= 5) ? 'var(--accent-red)' : 'var(--text-muted)',
                                    letterSpacing: '0.5px'
                                }}>{w}</div>
                            );
                        })}
                    </div>

                    {/* Monats-Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '2px'
                    }}>
                        {cells.map(function(c, idx) {
                            if (c.empty) {
                                return <div key={'e-'+idx} style={{ aspectRatio: '1/1.1' }} />;
                            }
                            var eintrag = c.eintrag;
                            var plns = c.planungen || [];
                            var hatPlanung = plns.length > 0;
                            var planungsFarbe = hatPlanung ? plns[0].farbe : null;
                            var wochentag = new Date(c.datum + 'T12:00:00').getDay();
                            var istWochenende = (wochentag === 0 || wochentag === 6);

                            var bg = 'var(--bg-card)';
                            if (hatPlanung) {
                                // Planungs-Farbe als leichter Overlay
                                bg = planungsFarbe + '22'; // 13% Alpha
                            } else if (istWochenende) {
                                bg = 'rgba(196,30,30,0.04)';
                            }

                            var border = '1px solid var(--border-color)';
                            if (c.istHeute) {
                                border = '2px solid #1E88E5';
                            } else if (hatPlanung) {
                                border = '1px solid ' + planungsFarbe + '77';
                            }

                            return (
                                <button
                                    key={c.datum}
                                    onClick={function(){ handleTagClick(c.datum); }}
                                    title={c.datum + (plns.length > 0 ? ' · ' + plns.map(function(p){ return p.baustelleId; }).join(', ') : '')}
                                    style={{
                                        aspectRatio: '1/1.1',
                                        padding: '3px 2px',
                                        background: bg,
                                        border: border,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        color: 'var(--text-primary)',
                                        position: 'relative',
                                        minHeight: '38px'
                                    }}
                                >
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: c.istHeute ? 700 : 500,
                                        color: c.istHeute ? '#1E88E5' : (istWochenende ? 'var(--accent-red)' : 'var(--text-muted)')
                                    }}>{c.day}</span>

                                    {eintrag ? (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0px'
                                        }}>
                                            <span style={{
                                                fontSize: '14px',
                                                fontWeight: 700,
                                                lineHeight: 1,
                                                color: statusFarbe(eintrag.status)
                                            }}>{statusGlyphe(eintrag.status)}</span>
                                            {eintrag.status === 'anwesend' && eintrag.stunden ? (
                                                <span style={{
                                                    fontSize: '8px',
                                                    color: 'var(--text-muted)',
                                                    lineHeight: 1,
                                                    marginTop: '1px'
                                                }}>{eintrag.stunden}h</span>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '10px', color: 'transparent' }}>·</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legende */}
                    <div style={{
                        marginTop: '12px',
                        padding: '8px 10px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '10px',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        justifyContent: 'center'
                    }}>
                        <span><strong style={{color:'var(--success)'}}>✓</strong> anwesend</span>
                        <span><strong style={{color:'#3498db'}}>U</strong> Urlaub</span>
                        <span><strong style={{color:'var(--accent-red)'}}>K</strong> krank</span>
                        <span><strong style={{color:'var(--text-muted)'}}>—</strong> frei</span>
                        <span style={{opacity:0.7}}>· Farbiger Rahmen = Baustellen-Planung</span>
                    </div>

                    {/* Tages-Modal */}
                    {showModal && modalDatum && (
                        <KalenderTagesModal
                            mitarbeiter={mitarbeiter}
                            datum={modalDatum}
                            bestehender={getEintrag(modalDatum)}
                            aktivePlanungen={getPlanungenAn(modalDatum)}
                            baustellenVorschlaege={bekannteBaustellen()}
                            onSpeichern={function(eintrag) {
                                if (!maId) { setShowModal(false); return; }
                                window.FirebaseService.schreibeKalenderEintrag(maId, modalDatum, eintrag)
                                    .then(function(){ setShowModal(false); })
                                    .catch(function(e){ alert('Fehler beim Speichern:\n' + (e && e.message || e)); });
                            }}
                            onLoeschen={function() {
                                if (!maId) { setShowModal(false); return; }
                                if (!confirm('Kalender-Eintrag fuer ' + modalDatum + ' loeschen?')) return;
                                window.FirebaseService.loescheKalenderEintrag(maId, modalDatum)
                                    .then(function(){ setShowModal(false); })
                                    .catch(function(e){ alert('Fehler beim Loeschen:\n' + (e && e.message || e)); });
                            }}
                            onSchliessen={function(){ setShowModal(false); }}
                        />
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 5 — TAGES-MODAL (Kalender-Eintrag)
        // Overlay-Modal zum Anlegen/Editieren/Loeschen eines Eintrags.
        // Status-Buttons + Stunden-Eingabe (nur bei "anwesend") + Baustelle
        // mit Datalist-Autosuggest + Sonderheiten-Textarea.
        // ESC und Klick auf Overlay schliessen das Modal.
        // ═══════════════════════════════════════════════════════
        function KalenderTagesModal({ mitarbeiter, datum, bestehender, aktivePlanungen, baustellenVorschlaege, onSpeichern, onLoeschen, onSchliessen }) {
            const [status, setStatus] = useState(function(){
                return (bestehender && bestehender.status) || 'anwesend';
            });
            const [stunden, setStunden] = useState(function(){
                if (bestehender && typeof bestehender.stunden === 'number') return String(bestehender.stunden);
                return '8';
            });
            const [baustelleId, setBaustelleId] = useState(function(){
                if (bestehender && bestehender.baustelle_id) return bestehender.baustelle_id;
                // Auto-fill wenn es genau eine aktive Planung gibt
                if (aktivePlanungen && aktivePlanungen.length === 1) return aktivePlanungen[0].baustelleId;
                return '';
            });
            const [sonderheiten, setSonderheiten] = useState(function(){
                return (bestehender && bestehender.sonderheiten) || '';
            });
            const [busy, setBusy] = useState(false);

            // ESC-Handler
            useEffect(function(){
                function onKey(e) {
                    if (e.key === 'Escape') onSchliessen();
                }
                window.addEventListener('keydown', onKey);
                return function(){ window.removeEventListener('keydown', onKey); };
            }, []);

            function formatDatum(datumStr) {
                try {
                    var d = new Date(datumStr + 'T12:00:00');
                    var wt = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
                    return wt[d.getDay()] + ', ' + d.toLocaleDateString('de-DE');
                } catch (e) {
                    return datumStr;
                }
            }

            function handleSpeichern() {
                var eintrag = {
                    status: status,
                    eingetragen_von: 'buero'
                };
                if (status === 'anwesend') {
                    var st = parseFloat(String(stunden).replace(',', '.'));
                    if (!isNaN(st) && st > 0) eintrag.stunden = st;
                    var bid = baustelleId.trim();
                    if (bid) eintrag.baustelle_id = bid;
                }
                var sh = sonderheiten.trim();
                if (sh) eintrag.sonderheiten = sh;
                setBusy(true);
                onSpeichern(eintrag);
            }

            var statusButtons = [
                { id: 'anwesend', label: '✓ Anwesend',  farbe: 'var(--success)',      bg: 'rgba(39,174,96,0.15)' },
                { id: 'urlaub',   label: '🏖 Urlaub',    farbe: '#3498db',              bg: 'rgba(52,152,219,0.15)' },
                { id: 'krank',    label: '🤒 Krank',     farbe: 'var(--accent-red)',   bg: 'rgba(196,30,30,0.15)' },
                { id: 'frei',     label: '— Frei',       farbe: 'var(--text-muted)',   bg: 'rgba(128,128,128,0.15)' }
            ];

            return (
                <div
                    onClick={onSchliessen}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        padding: '40px 12px 20px',
                        overflowY: 'auto'
                    }}
                >
                    <div
                        onClick={function(e){ e.stopPropagation(); }}
                        style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            width: '100%',
                            maxWidth: '440px',
                            padding: '18px',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.4)'
                        }}
                    >
                        {/* Kopfzeile */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '14px',
                            gap: '10px'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-primary)'
                                }}>
                                    {formatDatum(datum)}
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    marginTop: '3px'
                                }}>
                                    {mitarbeiter && mitarbeiter.name ? mitarbeiter.name : 'Mitarbeiter'}
                                    {bestehender && bestehender.eingetragen_von === 'ma' && (
                                        <span style={{ marginLeft: '6px', color: '#3498db' }}>· vom MA eingetragen</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onSchliessen}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '22px',
                                    cursor: 'pointer',
                                    padding: '0 4px',
                                    lineHeight: 1
                                }}
                            >×</button>
                        </div>

                        {/* Status-Buttons */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '6px',
                            marginBottom: '14px'
                        }}>
                            {statusButtons.map(function(sb) {
                                var aktiv = status === sb.id;
                                return (
                                    <button
                                        key={sb.id}
                                        onClick={function(){ setStatus(sb.id); }}
                                        style={{
                                            padding: '10px 8px',
                                            background: aktiv ? sb.bg : 'var(--bg-secondary)',
                                            color: aktiv ? sb.farbe : 'var(--text-primary)',
                                            border: '1px solid ' + (aktiv ? sb.farbe : 'var(--border-color)'),
                                            borderRadius: 'var(--radius-sm)',
                                            fontFamily: "'Oswald', sans-serif",
                                            fontSize: '13px',
                                            fontWeight: aktiv ? 700 : 500,
                                            letterSpacing: '0.5px',
                                            cursor: 'pointer',
                                            touchAction: 'manipulation'
                                        }}
                                    >{sb.label}</button>
                                );
                            })}
                        </div>

                        {/* Stunden + Baustelle nur bei "anwesend" */}
                        {status === 'anwesend' && (
                            <React.Fragment>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '11px',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: '1px',
                                        textTransform: 'uppercase',
                                        color: 'var(--text-muted)',
                                        marginBottom: '5px'
                                    }}>Stunden</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={stunden}
                                        onChange={function(e){ setStunden(e.target.value); }}
                                        placeholder="z.B. 8 oder 7,5"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '11px',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: '1px',
                                        textTransform: 'uppercase',
                                        color: 'var(--text-muted)',
                                        marginBottom: '5px'
                                    }}>Baustelle-ID (optional)</label>
                                    <input
                                        type="text"
                                        list="b5-baustellen-vorschlaege"
                                        value={baustelleId}
                                        onChange={function(e){ setBaustelleId(e.target.value); }}
                                        placeholder="z.B. meyer-bad"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '14px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <datalist id="b5-baustellen-vorschlaege">
                                        {(baustellenVorschlaege || []).map(function(b) {
                                            return <option key={b} value={b} />;
                                        })}
                                    </datalist>
                                    {aktivePlanungen && aktivePlanungen.length > 0 && (
                                        <div style={{
                                            marginTop: '5px',
                                            fontSize: '10px',
                                            color: 'var(--text-muted)'
                                        }}>
                                            💡 Aktive Planung(en) fuer diesen Tag: {aktivePlanungen.map(function(p){ return p.baustelleId; }).join(', ')}
                                        </div>
                                    )}
                                </div>
                            </React.Fragment>
                        )}

                        {/* Sonderheiten — immer sichtbar */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '11px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                color: 'var(--text-muted)',
                                marginBottom: '5px'
                            }}>Sonderheiten / Notiz</label>
                            <textarea
                                value={sonderheiten}
                                onChange={function(e){ setSonderheiten(e.target.value); }}
                                placeholder="optional — z.B. Estrich noch feucht, vorzeitig Feierabend..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '13px',
                                    resize: 'vertical',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {/* Aktions-Buttons */}
                        <div style={{
                            display: 'flex',
                            gap: '6px'
                        }}>
                            <button
                                onClick={onSchliessen}
                                disabled={busy}
                                style={{
                                    padding: '10px 14px',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    cursor: busy ? 'not-allowed' : 'pointer',
                                    opacity: busy ? 0.5 : 1,
                                    touchAction: 'manipulation'
                                }}
                            >Abbrechen</button>
                            {bestehender && (
                                <button
                                    onClick={onLoeschen}
                                    disabled={busy}
                                    style={{
                                        padding: '10px 14px',
                                        background: 'rgba(196,30,30,0.15)',
                                        color: 'var(--accent-red)',
                                        border: '1px solid rgba(196,30,30,0.35)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        letterSpacing: '0.5px',
                                        cursor: busy ? 'not-allowed' : 'pointer',
                                        opacity: busy ? 0.5 : 1,
                                        touchAction: 'manipulation'
                                    }}
                                >🗑 Loeschen</button>
                            )}
                            <button
                                onClick={handleSpeichern}
                                disabled={busy}
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    background: busy ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                    color: busy ? 'var(--text-muted)' : '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    cursor: busy ? 'not-allowed' : 'pointer',
                                    touchAction: 'manipulation',
                                    boxShadow: busy ? 'none' : '0 2px 8px rgba(30,136,229,0.30)'
                                }}
                            >{busy ? '⏳...' : '✓ Speichern'}</button>
                        </div>
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 6 — CHAT-THREAD (Buero-Seite)
        // Bidirektionaler Chat Buero <-> Mitarbeiter.
        // Live-Listener auf /chats/{maId}/. Eingabezeile mit
        // Standard- und Dringend-Senden. Auto-Mark-as-Read fuer
        // empfangene MA-Nachrichten. Doppel-Check-Anzeige fuer
        // gesendete Buero-Nachrichten. Datum-Trenner und Zeitstempel.
        // ═══════════════════════════════════════════════════════
        function MaChatThread({ mitarbeiter }) {
            const [nachrichten, setNachrichten] = useState([]);
            const [text, setText] = useState('');
            const [dringend, setDringend] = useState(false);
            const [busy, setBusy] = useState(false);
            const [sendeFehler, setSendeFehler] = useState(null);
            const scrollRef = useRef(null);
            const textareaRef = useRef(null);

            var maId = mitarbeiter ? mitarbeiter.id : null;
            var maSprache = (mitarbeiter && mitarbeiter.sprache) || 'de';

            // Live-Listener fuer Chat-Thread
            useEffect(function() {
                if (!maId) return;
                if (!window.FirebaseService || !window.FirebaseService.subscribeChat) return;
                var unsub = window.FirebaseService.subscribeChat(maId, function(arr) {
                    setNachrichten(arr || []);
                });
                return unsub;
            }, [maId]);

            // Auto-Scroll zu neuester Nachricht
            useEffect(function() {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, [nachrichten.length]);

            // Auto-Mark-as-Read: Wenn der Chat geoeffnet ist, markiere alle
            // ungelesenen MA-Nachrichten nach 1,2s als gelesen.
            useEffect(function() {
                if (!maId || nachrichten.length === 0) return;
                if (!window.FirebaseService || !window.FirebaseService.markiereNachrichtGelesen) return;
                var ungeleseneMa = nachrichten.filter(function(n) {
                    return n && n.von === 'ma' && !n.gelesen;
                });
                if (ungeleseneMa.length === 0) return;

                var timer = setTimeout(function() {
                    ungeleseneMa.forEach(function(n) {
                        if (n._id) {
                            window.FirebaseService.markiereNachrichtGelesen(maId, n._id).catch(function(e){
                                console.warn('[Chat] Mark-as-read fehlgeschlagen:', e);
                            });
                        }
                    });
                }, 1200);
                return function(){ clearTimeout(timer); };
            }, [maId, nachrichten]);

            function handleSenden() {
                if (!maId) return;
                var t = (text || '').trim();
                if (!t) return;
                if (!window.FirebaseService || !window.FirebaseService.sendeChatNachricht) {
                    setSendeFehler('Firebase nicht verfuegbar');
                    return;
                }
                setBusy(true);
                setSendeFehler(null);
                window.FirebaseService.sendeChatNachricht(maId, t, 'de', 'Thomas', dringend)
                    .then(function() {
                        setText('');
                        setDringend(false);
                        setBusy(false);
                        // Fokus zurueck ins Eingabefeld
                        setTimeout(function(){
                            if (textareaRef.current) textareaRef.current.focus();
                        }, 50);
                    })
                    .catch(function(e) {
                        setSendeFehler(e && e.message ? e.message : 'Senden fehlgeschlagen');
                        setBusy(false);
                    });
            }

            function handleKeyDown(e) {
                // Enter = Senden, Shift+Enter = Zeilenumbruch
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSenden();
                }
            }

            // Nachrichten nach Datum gruppieren fuer Datum-Trenner
            function gruppiereNachDatum(arr) {
                var groups = [];
                var letzterTag = null;
                arr.forEach(function(n) {
                    if (!n || !n.timestamp) return;
                    var d = new Date(n.timestamp);
                    var tagKey = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
                    if (tagKey !== letzterTag) {
                        groups.push({ trenner: true, datum: d, key: 'tag-' + tagKey });
                        letzterTag = tagKey;
                    }
                    groups.push({ trenner: false, nachricht: n, key: 'n-' + (n._id || n.timestamp) });
                });
                return groups;
            }

            function formatDatumTrenner(d) {
                var heute = new Date();
                if (d.getFullYear() === heute.getFullYear() &&
                    d.getMonth() === heute.getMonth() &&
                    d.getDate() === heute.getDate()) return 'Heute';
                var gestern = new Date(heute.getTime() - 86400000);
                if (d.getFullYear() === gestern.getFullYear() &&
                    d.getMonth() === gestern.getMonth() &&
                    d.getDate() === gestern.getDate()) return 'Gestern';
                var wt = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
                return wt[d.getDay()] + ', ' + d.toLocaleDateString('de-DE');
            }

            var gruppiert = gruppiereNachDatum(nachrichten);

            return (
                <div style={{
                    marginTop: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    height: 'calc(100vh - 260px)',
                    minHeight: '360px',
                    maxHeight: '70vh'
                }}>
                    {/* Scrollbarer Nachrichten-Bereich */}
                    <div
                        ref={scrollRef}
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '10px 4px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                        }}
                    >
                        {gruppiert.length === 0 ? (
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column',
                                gap: '8px',
                                color: 'var(--text-muted)',
                                fontSize: '13px',
                                textAlign: 'center',
                                padding: '40px 20px'
                            }}>
                                <div style={{ fontSize: '38px', opacity: 0.6 }}>💬</div>
                                <div>Noch keine Nachrichten mit {mitarbeiter && mitarbeiter.name ? mitarbeiter.name : 'diesem Mitarbeiter'}.</div>
                                <div style={{ fontSize: '11px', opacity: 0.7 }}>
                                    Schreib die erste unten ins Eingabefeld.
                                </div>
                            </div>
                        ) : gruppiert.map(function(g) {
                            if (g.trenner) {
                                return (
                                    <div key={g.key} style={{
                                        textAlign: 'center',
                                        margin: '8px 0 4px'
                                    }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '3px 10px',
                                            background: 'var(--bg-card)',
                                            color: 'var(--text-muted)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '10px',
                                            fontSize: '10px',
                                            fontFamily: "'Oswald', sans-serif",
                                            fontWeight: 600,
                                            letterSpacing: '0.5px',
                                            textTransform: 'uppercase'
                                        }}>{formatDatumTrenner(g.datum)}</span>
                                    </div>
                                );
                            }
                            return (
                                <ChatBubble
                                    key={g.key}
                                    nachricht={g.nachricht}
                                    maSprache={maSprache}
                                />
                            );
                        })}
                    </div>

                    {/* Fehler-Banner */}
                    {sendeFehler && (
                        <div style={{
                            padding: '8px 12px',
                            marginBottom: '8px',
                            background: 'rgba(196,30,30,0.10)',
                            border: '1px solid rgba(196,30,30,0.30)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--accent-red)',
                            fontSize: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span>⚠ {sendeFehler}</span>
                            <button
                                onClick={function(){ setSendeFehler(null); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--accent-red)',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >×</button>
                        </div>
                    )}

                    {/* Eingabe-Bereich */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}>
                        {/* Dringend-Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={function(){ setDringend(!dringend); }}
                                style={{
                                    padding: '5px 10px',
                                    background: dringend ? 'rgba(196,30,30,0.15)' : 'var(--bg-secondary)',
                                    color: dringend ? 'var(--accent-red)' : 'var(--text-muted)',
                                    border: '1px solid ' + (dringend ? 'rgba(196,30,30,0.40)' : 'var(--border-color)'),
                                    borderRadius: 'var(--radius-sm)',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    cursor: 'pointer',
                                    touchAction: 'manipulation'
                                }}
                            >
                                {dringend ? '🔔 Dringend AN' : '🔕 Dringend'}
                            </button>
                            {dringend && (
                                <span style={{
                                    fontSize: '10px',
                                    color: 'var(--accent-red)',
                                    fontStyle: 'italic'
                                }}>
                                    loest Push-Benachrichtigung auf dem MA-Handy aus
                                </span>
                            )}
                        </div>

                        {/* Textarea + Senden-Button */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>
                            <textarea
                                ref={textareaRef}
                                value={text}
                                onChange={function(e){ setText(e.target.value); }}
                                onKeyDown={handleKeyDown}
                                placeholder="Nachricht an Mitarbeiter ... (Enter = Senden)"
                                rows={2}
                                disabled={busy}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid ' + (dringend ? 'rgba(196,30,30,0.40)' : 'var(--border-color)'),
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '14px',
                                    resize: 'vertical',
                                    minHeight: '48px',
                                    maxHeight: '160px',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    opacity: busy ? 0.6 : 1
                                }}
                            />
                            <button
                                onClick={handleSenden}
                                disabled={busy || !(text && text.trim())}
                                title="Enter = Senden, Shift+Enter = neue Zeile"
                                style={{
                                    padding: '0 16px',
                                    background: busy ? 'var(--bg-secondary)' :
                                                !(text && text.trim()) ? 'var(--bg-secondary)' :
                                                dringend ? 'linear-gradient(135deg, #c41e1e, #8b0000)' :
                                                'linear-gradient(135deg, #1E88E5, #1565C0)',
                                    color: !(text && text.trim()) || busy ? 'var(--text-muted)' : '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '18px',
                                    fontWeight: 600,
                                    cursor: (busy || !(text && text.trim())) ? 'not-allowed' : 'pointer',
                                    touchAction: 'manipulation',
                                    boxShadow: (busy || !(text && text.trim())) ? 'none' :
                                                dringend ? '0 2px 8px rgba(196,30,30,0.30)' :
                                                '0 2px 8px rgba(30,136,229,0.30)',
                                    minWidth: '56px'
                                }}
                            >
                                {busy ? '⏳' : dringend ? '🔔' : '➤'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 6 — CHAT-BUBBLE
        // Einzelne Nachricht als Bubble. Links grau fuer MA-Nachrichten,
        // rechts blau fuer Buero-Nachrichten. Doppel-Check-Anzeige fuer
        // gesendete Buero-Nachrichten (grau = gesendet, gruen = vom MA
        // gelesen). Dringend-Nachrichten mit rotem Rahmen und Glocke.
        // ═══════════════════════════════════════════════════════
        function ChatBubble({ nachricht, maSprache }) {
            const [zeigeOriginal, setZeigeOriginal] = useState(false);
            var n = nachricht || {};
            var istBuero = n.von === 'buero';
            var istDringend = !!n.dringend;

            function zeitFormat(ts) {
                if (!ts) return '';
                var d = new Date(ts);
                var h = String(d.getHours()).padStart(2, '0');
                var m = String(d.getMinutes()).padStart(2, '0');
                return h + ':' + m;
            }

            // Text-Auswahl: Wenn MA kein Deutsch spricht und Uebersetzung vorhanden, zeigen wir Deutsch
            // Buero-Nachrichten sind immer auf Deutsch (text_original)
            var zeigeText = n.text_original || '';
            var hatUebersetzung = false;
            if (!istBuero && n.sprache_original && n.sprache_original !== 'de' && n.text_uebersetzt) {
                var deText = n.text_uebersetzt.de;
                if (deText) {
                    zeigeText = zeigeOriginal ? (n.text_original || '') : deText;
                    hatUebersetzung = true;
                }
            }

            var bubbleBg, bubbleBorder, textFarbe;
            if (istBuero) {
                bubbleBg = istDringend ? 'rgba(196,30,30,0.12)' : 'rgba(30,136,229,0.15)';
                bubbleBorder = istDringend ? '2px solid rgba(196,30,30,0.55)' : '1px solid rgba(30,136,229,0.30)';
                textFarbe = 'var(--text-primary)';
            } else {
                bubbleBg = istDringend ? 'rgba(196,30,30,0.08)' : 'var(--bg-card)';
                bubbleBorder = istDringend ? '2px solid rgba(196,30,30,0.55)' : '1px solid var(--border-color)';
                textFarbe = 'var(--text-primary)';
            }

            return (
                <div style={{
                    display: 'flex',
                    justifyContent: istBuero ? 'flex-end' : 'flex-start',
                    padding: '0 4px'
                }}>
                    <div style={{
                        maxWidth: '80%',
                        minWidth: '60px',
                        padding: '8px 10px',
                        background: bubbleBg,
                        border: bubbleBorder,
                        borderRadius: istBuero ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        color: textFarbe,
                        position: 'relative'
                    }}>
                        {/* Dringend-Badge */}
                        {istDringend && (
                            <div style={{
                                fontSize: '10px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 700,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                color: 'var(--accent-red)',
                                marginBottom: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>🔔 Dringend</div>
                        )}

                        {/* Absender-Name (nur bei MA — Buero-Nachrichten sind eh rechts) */}
                        {!istBuero && n.absender_name && (
                            <div style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: 'var(--success)',
                                marginBottom: '2px'
                            }}>{n.absender_name}</div>
                        )}

                        {/* Text */}
                        <div style={{
                            fontSize: '13px',
                            lineHeight: 1.4,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}>{zeigeText}</div>

                        {/* Uebersetzungs-Toggle (nur bei MA mit Uebersetzung) */}
                        {hatUebersetzung && (
                            <button
                                onClick={function(){ setZeigeOriginal(!zeigeOriginal); }}
                                style={{
                                    marginTop: '3px',
                                    padding: '0',
                                    background: 'none',
                                    color: 'var(--accent-blue)',
                                    border: 'none',
                                    fontSize: '10px',
                                    fontStyle: 'italic',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    opacity: 0.8
                                }}
                            >
                                {zeigeOriginal ? '← Uebersetzung' : 'Original (' + (n.sprache_original || '?').toUpperCase() + ')'}
                            </button>
                        )}

                        {/* Footer: Zeit + Doppel-Check */}
                        <div style={{
                            marginTop: '3px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '4px',
                            fontSize: '9px',
                            color: 'var(--text-muted)'
                        }}>
                            <span>{zeitFormat(n.timestamp)}</span>
                            {istBuero && (
                                <span
                                    title={n.gelesen ? 'vom Mitarbeiter gelesen' : 'gesendet, noch nicht gelesen'}
                                    style={{
                                        color: n.gelesen ? 'var(--success)' : 'var(--text-muted)',
                                        fontSize: '11px',
                                        lineHeight: 1
                                    }}
                                >
                                    {n.gelesen ? '✓✓' : '✓'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 7 — HAUPTKALENDER (Buero-Aggregation)
        // Wochenansicht mit Gantt-Balken fuer Baustellen-Planungen
        // oben und Mitarbeiter-Zeilen mit Status-Glyphen darunter.
        // Datenquellen: subscribeMitarbeiter, subscribeKalenderAll,
        // subscribeBaustellenPlanungen.
        // "Neue Planung" oeffnet BaustellenPlanungDialog.
        // ═══════════════════════════════════════════════════════
        function HauptkalenderView({ onBack }) {
            const heute = new Date();
            // wochenStart ist immer ein Montag
            const [wochenStart, setWochenStart] = useState(function(){
                var d = new Date(heute);
                d.setHours(0, 0, 0, 0);
                var wt = d.getDay(); // 0=So, 1=Mo
                var shift = wt === 0 ? -6 : 1 - wt;
                d.setDate(d.getDate() + shift);
                return d;
            });
            const [mitarbeiter, setMitarbeiter] = useState(function(){
                return window.MITARBEITER_LISTE || [];
            });
            const [kalenderAll, setKalenderAll] = useState({});
            const [planungen, setPlanungen] = useState({});
            const [dialogOffen, setDialogOffen] = useState(false);
            const [dialogPlanung, setDialogPlanung] = useState(null);

            // MA-Liste: Grundstock + Firebase mergen
            useEffect(function() {
                if (!window.FirebaseService || !window.FirebaseService.subscribeMitarbeiter) return;
                var grundstock = window.MITARBEITER_LISTE || [];
                var unsub = window.FirebaseService.subscribeMitarbeiter(function(fbArr) {
                    var merged = {};
                    grundstock.forEach(function(m){ if (m && m.id) merged[m.id] = m; });
                    (fbArr || []).forEach(function(m){
                        if (m && m.id) merged[m.id] = Object.assign({}, merged[m.id] || {}, m);
                    });
                    var arr = [];
                    for (var k in merged) { if (merged.hasOwnProperty(k)) arr.push(merged[k]); }
                    arr.sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });
                    setMitarbeiter(arr);
                });
                return unsub;
            }, []);

            // Kalender-Daten aller MA live
            useEffect(function() {
                if (!window.FirebaseService || !window.FirebaseService.subscribeKalenderAll) return;
                var unsub = window.FirebaseService.subscribeKalenderAll(function(data) {
                    setKalenderAll(data || {});
                });
                return unsub;
            }, []);

            // Planungen live
            useEffect(function() {
                if (!window.FirebaseService || !window.FirebaseService.subscribeBaustellenPlanungen) return;
                var unsub = window.FirebaseService.subscribeBaustellenPlanungen(function(data) {
                    setPlanungen(data || {});
                });
                return unsub;
            }, []);

            // 7 Tage der Woche generieren
            function getWochenTage() {
                var tage = [];
                for (var i = 0; i < 7; i++) {
                    var d = new Date(wochenStart);
                    d.setDate(d.getDate() + i);
                    var mm = String(d.getMonth() + 1);
                    if (mm.length < 2) mm = '0' + mm;
                    var dd = String(d.getDate());
                    if (dd.length < 2) dd = '0' + dd;
                    tage.push({
                        datum: d.getFullYear() + '-' + mm + '-' + dd,
                        day: d.getDate(),
                        weekday: ['So','Mo','Di','Mi','Do','Fr','Sa'][d.getDay()],
                        istWochenende: (d.getDay() === 0 || d.getDay() === 6),
                        istHeute: (
                            d.getFullYear() === heute.getFullYear() &&
                            d.getMonth() === heute.getMonth() &&
                            d.getDate() === heute.getDate()
                        ),
                        tsMitternacht: d.getTime()
                    });
                }
                return tage;
            }

            var tage = getWochenTage();
            var wochenStartMs = tage[0].tsMitternacht;
            var wochenEndeMs = tage[6].tsMitternacht + 86400000 - 1; // Ende Sonntag

            // Eintrag fuer MA an einem Datum
            function getEintrag(maId, datumStr) {
                var jahrStr = datumStr.substring(0, 4);
                var kal = kalenderAll[maId];
                if (!kal || !kal[jahrStr]) return null;
                return kal[jahrStr][datumStr] || null;
            }

            // Aktive Planung fuer MA an einem Datum (nur erste Treffer)
            function getPlanungFuer(maId, datumStr) {
                if (!maId) return null;
                var ts = new Date(datumStr + 'T12:00:00').getTime();
                for (var bId in planungen) {
                    if (!planungen.hasOwnProperty(bId)) continue;
                    var zeitraeume = planungen[bId] || {};
                    for (var zId in zeitraeume) {
                        if (!zeitraeume.hasOwnProperty(zId)) continue;
                        var z = zeitraeume[zId];
                        if (!z || !z.mitarbeiter || !z.mitarbeiter[maId]) continue;
                        if (z.von <= ts && z.bis >= ts) {
                            return { baustelleId: bId, zeitraumId: zId, farbe: z.farbe || '#1E88E5' };
                        }
                    }
                }
                return null;
            }

            // Alle Planungs-Balken, die in der sichtbaren Woche enthalten sind
            function getWochenBalken() {
                var balken = [];
                for (var bId in planungen) {
                    if (!planungen.hasOwnProperty(bId)) continue;
                    var zeitraeume = planungen[bId] || {};
                    for (var zId in zeitraeume) {
                        if (!zeitraeume.hasOwnProperty(zId)) continue;
                        var z = zeitraeume[zId];
                        if (!z || typeof z.von !== 'number' || typeof z.bis !== 'number') continue;
                        // Schneidet der Zeitraum die aktuelle Woche?
                        if (z.bis < wochenStartMs || z.von > wochenEndeMs) continue;
                        // Spalten-Start und -Ende berechnen (Spalte 2 bis 8, Spalte 1 ist Label)
                        var startIdx = 0;
                        for (var i = 0; i < 7; i++) {
                            if (tage[i].tsMitternacht + 86400000 > z.von) { startIdx = i; break; }
                            if (i === 6) startIdx = 7;
                        }
                        var endeIdx = 6;
                        for (var j = 6; j >= 0; j--) {
                            if (tage[j].tsMitternacht <= z.bis) { endeIdx = j; break; }
                            if (j === 0) endeIdx = -1;
                        }
                        if (startIdx > endeIdx) continue;
                        balken.push({
                            baustelleId: bId,
                            zeitraumId: zId,
                            von: z.von,
                            bis: z.bis,
                            farbe: z.farbe || '#1E88E5',
                            beschreibung: z.beschreibung || '',
                            mitarbeiter: z.mitarbeiter || {},
                            startCol: startIdx + 2,  // Grid-Spalte 2-8
                            endCol: endeIdx + 3       // Grid-Spalte 3-9 (exclusive)
                        });
                    }
                }
                // nach Baustellen-ID sortieren (stable order)
                balken.sort(function(a,b){ return a.baustelleId.localeCompare(b.baustelleId); });
                return balken;
            }

            function statusGlyphe(s) {
                if (s === 'anwesend') return '✓';
                if (s === 'urlaub')   return 'U';
                if (s === 'krank')    return 'K';
                if (s === 'frei')     return '—';
                return '';
            }
            function statusFarbe(s) {
                if (s === 'anwesend') return 'var(--success)';
                if (s === 'urlaub')   return '#3498db';
                if (s === 'krank')    return 'var(--accent-red)';
                if (s === 'frei')     return 'var(--text-muted)';
                return 'var(--text-muted)';
            }

            function prevWoche() {
                var d = new Date(wochenStart);
                d.setDate(d.getDate() - 7);
                setWochenStart(d);
            }
            function nextWoche() {
                var d = new Date(wochenStart);
                d.setDate(d.getDate() + 7);
                setWochenStart(d);
            }
            function goHeute() {
                var d = new Date();
                d.setHours(0, 0, 0, 0);
                var wt = d.getDay();
                var shift = wt === 0 ? -6 : 1 - wt;
                d.setDate(d.getDate() + shift);
                setWochenStart(d);
            }

            var balken = getWochenBalken();

            function formatDate(d) {
                return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
            }
            var wochenEndeDisplay = new Date(tage[6].tsMitternacht);

            return (
                <div className="page-container" style={{
                    padding: '16px',
                    minHeight: '100vh'
                }}>
                    <UnterseitenHeader
                        icon="📆"
                        titel="Hauptkalender"
                        untertitel="Alle Mitarbeiter + geplante Baustellen-Zeitraeume"
                        onBack={onBack}
                    />

                    {/* Woche-Navigation */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '10px',
                        padding: '8px 10px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)'
                    }}>
                        <button
                            onClick={prevWoche}
                            style={{
                                padding: '6px 12px',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >◂</button>
                        <div style={{
                            flex: 1,
                            textAlign: 'center',
                            fontFamily: "'Oswald', sans-serif",
                            fontSize: '13px',
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            color: 'var(--text-primary)'
                        }}>
                            {formatDate(wochenStart)} – {formatDate(wochenEndeDisplay)}
                        </div>
                        <button
                            onClick={goHeute}
                            style={{
                                padding: '6px 12px',
                                background: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '12px',
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                boxShadow: '0 2px 8px rgba(30,136,229,0.30)'
                            }}
                        >Heute</button>
                        <button
                            onClick={nextWoche}
                            style={{
                                padding: '6px 12px',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >▸</button>
                    </div>

                    {/* Neue Planung */}
                    <div style={{ marginBottom: '10px' }}>
                        <button
                            onClick={function(){
                                setDialogPlanung(null);
                                setDialogOffen(true);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                background: 'rgba(30,136,229,0.10)',
                                color: 'var(--accent-blue)',
                                border: '1px dashed rgba(30,136,229,0.40)',
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '12px',
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                cursor: 'pointer',
                                touchAction: 'manipulation'
                            }}
                        >➕ Neue Baustellen-Planung anlegen</button>
                    </div>

                    {/* Gantt-Grid: Tage-Header + Balken-Zeilen + MA-Zeilen */}
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px',
                        overflowX: 'auto'
                    }}>
                        {/* Spalten: 1 fuer Label, 7 fuer Tage */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '100px repeat(7, minmax(36px, 1fr))',
                            gap: '2px',
                            minWidth: '340px'
                        }}>
                            {/* Header-Zeile: Wochentag + Datum */}
                            <div style={{
                                gridColumn: '1 / 2',
                                padding: '4px 6px',
                                fontSize: '9px',
                                color: 'var(--text-muted)',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '0.5px'
                            }}>BAUSTELLEN</div>
                            {tage.map(function(t) {
                                return (
                                    <div key={'hd-'+t.datum} style={{
                                        textAlign: 'center',
                                        padding: '3px 0',
                                        fontSize: '10px',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: '0.5px',
                                        color: t.istHeute ? '#1E88E5' : (t.istWochenende ? 'var(--accent-red)' : 'var(--text-muted)'),
                                        borderRadius: '3px',
                                        background: t.istHeute ? 'rgba(30,136,229,0.10)' : 'transparent'
                                    }}>
                                        <div>{t.weekday}</div>
                                        <div style={{ fontSize: '9px', fontWeight: 400 }}>{t.day}</div>
                                    </div>
                                );
                            })}

                            {/* Balken-Zeilen */}
                            {balken.length === 0 ? (
                                <div style={{
                                    gridColumn: '1 / 9',
                                    padding: '8px',
                                    fontSize: '10px',
                                    color: 'var(--text-muted)',
                                    fontStyle: 'italic',
                                    textAlign: 'center'
                                }}>keine Baustellen-Planungen in dieser Woche</div>
                            ) : balken.map(function(b, idx) {
                                var anzMa = Object.keys(b.mitarbeiter).length;
                                return (
                                    <React.Fragment key={'b-'+b.zeitraumId}>
                                        <div style={{
                                            gridColumn: '1 / 2',
                                            padding: '2px 4px',
                                            fontSize: '10px',
                                            color: 'var(--text-light)',
                                            fontFamily: "'Oswald', sans-serif",
                                            fontWeight: 600,
                                            letterSpacing: '0.3px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }} title={b.baustelleId + (b.beschreibung ? ' · ' + b.beschreibung : '')}>
                                            {b.baustelleId}
                                        </div>
                                        <button
                                            onClick={function(){
                                                setDialogPlanung(Object.assign({}, b, {
                                                    _key: b.baustelleId + '/' + b.zeitraumId
                                                }));
                                                setDialogOffen(true);
                                            }}
                                            style={{
                                                gridColumn: b.startCol + ' / ' + b.endCol,
                                                padding: '3px 6px',
                                                background: b.farbe,
                                                border: 'none',
                                                borderRadius: '3px',
                                                color: '#fff',
                                                fontSize: '9px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                touchAction: 'manipulation',
                                                textAlign: 'left',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                            }}
                                            title={b.baustelleId + ' · ' + new Date(b.von).toLocaleDateString('de-DE') + '–' + new Date(b.bis).toLocaleDateString('de-DE') + ' · ' + anzMa + ' MA'}
                                        >{anzMa} MA</button>
                                    </React.Fragment>
                                );
                            })}

                            {/* Trenner */}
                            <div style={{
                                gridColumn: '1 / 9',
                                height: '1px',
                                background: 'var(--border-color)',
                                marginTop: '6px',
                                marginBottom: '6px'
                            }} />

                            {/* MA-Zeilen */}
                            {mitarbeiter.length === 0 ? (
                                <div style={{
                                    gridColumn: '1 / 9',
                                    padding: '8px',
                                    fontSize: '10px',
                                    color: 'var(--text-muted)',
                                    fontStyle: 'italic',
                                    textAlign: 'center'
                                }}>keine Mitarbeiter in der Stammliste</div>
                            ) : mitarbeiter.map(function(ma) {
                                return (
                                    <React.Fragment key={'ma-'+ma.id}>
                                        <div style={{
                                            gridColumn: '1 / 2',
                                            padding: '6px 4px',
                                            fontSize: '11px',
                                            fontFamily: "'Oswald', sans-serif",
                                            fontWeight: 600,
                                            letterSpacing: '0.3px',
                                            color: 'var(--text-primary)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            borderBottom: '1px solid var(--border-color)'
                                        }} title={ma.name + ' · ' + (ma.rolle || '')}>
                                            {ma.name || ma.id}
                                        </div>
                                        {tage.map(function(t) {
                                            var eintrag = getEintrag(ma.id, t.datum);
                                            var planung = getPlanungFuer(ma.id, t.datum);
                                            var bg = t.istWochenende ? 'rgba(196,30,30,0.04)' : 'transparent';
                                            if (planung) {
                                                // Planungs-Farbe als leichter Tint
                                                bg = planung.farbe + '22';
                                            }
                                            return (
                                                <div key={'z-'+ma.id+'-'+t.datum} style={{
                                                    padding: '6px 2px',
                                                    fontSize: '13px',
                                                    fontWeight: 700,
                                                    textAlign: 'center',
                                                    color: eintrag ? statusFarbe(eintrag.status) : 'transparent',
                                                    background: bg,
                                                    border: t.istHeute ? '1px solid #1E88E5' : '1px solid transparent',
                                                    borderRadius: '3px',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }} title={t.datum + (eintrag ? ' · ' + eintrag.status + (eintrag.stunden ? ' ' + eintrag.stunden + 'h' : '') : '')}>
                                                    {eintrag ? statusGlyphe(eintrag.status) : '·'}
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* Legende */}
                    <div style={{
                        marginTop: '10px',
                        padding: '8px 10px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '10px',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        justifyContent: 'center'
                    }}>
                        <span><strong style={{color:'var(--success)'}}>✓</strong> anwesend</span>
                        <span><strong style={{color:'#3498db'}}>U</strong> Urlaub</span>
                        <span><strong style={{color:'var(--accent-red)'}}>K</strong> krank</span>
                        <span><strong style={{color:'var(--text-muted)'}}>—</strong> frei</span>
                        <span style={{opacity:0.7}}>· Balken = Baustellen-Planung · Klick auf Balken = bearbeiten</span>
                    </div>

                    {/* Dialog */}
                    {dialogOffen && (
                        <BaustellenPlanungDialog
                            mitarbeiterListe={mitarbeiter}
                            bestehend={dialogPlanung}
                            bekannteIds={Object.keys(planungen)}
                            onSpeichern={function(data) {
                                var bId = data.baustelleId;
                                var zId = (dialogPlanung && dialogPlanung.zeitraumId) || ('zt-' + Date.now());
                                window.FirebaseService.schreibeBaustellenPlanung(bId, zId, data)
                                    .then(function(){ setDialogOffen(false); })
                                    .catch(function(e){ alert('Fehler beim Speichern:\n' + (e && e.message || e)); });
                            }}
                            onLoeschen={function() {
                                if (!dialogPlanung) { setDialogOffen(false); return; }
                                if (!confirm('Planung "' + dialogPlanung.baustelleId + '" endgueltig loeschen?')) return;
                                window.FirebaseService.loescheBaustellenPlanung(dialogPlanung.baustelleId, dialogPlanung.zeitraumId)
                                    .then(function(){ setDialogOffen(false); })
                                    .catch(function(e){ alert('Fehler beim Loeschen:\n' + (e && e.message || e)); });
                            }}
                            onSchliessen={function(){ setDialogOffen(false); }}
                        />
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 7 — BAUSTELLEN-PLANUNG-DIALOG
        // Overlay zum Anlegen/Bearbeiten/Loeschen einer Planung.
        // Felder: Baustelle-ID (Autosuggest), Von, Bis, Farbe-Presets,
        // Beschreibung, Mitarbeiter-Auswahl als Checkboxen.
        // ═══════════════════════════════════════════════════════
        function BaustellenPlanungDialog({ mitarbeiterListe, bestehend, bekannteIds, onSpeichern, onLoeschen, onSchliessen }) {
            function tsToDateStr(ts) {
                var d = new Date(ts);
                var mm = String(d.getMonth() + 1);
                if (mm.length < 2) mm = '0' + mm;
                var dd = String(d.getDate());
                if (dd.length < 2) dd = '0' + dd;
                return d.getFullYear() + '-' + mm + '-' + dd;
            }

            const heute = new Date();
            const [baustelleId, setBaustelleId] = useState(function(){
                return (bestehend && bestehend.baustelleId) || '';
            });
            const [vonStr, setVonStr] = useState(function(){
                if (bestehend && bestehend.von) return tsToDateStr(bestehend.von);
                return tsToDateStr(heute.getTime());
            });
            const [bisStr, setBisStr] = useState(function(){
                if (bestehend && bestehend.bis) return tsToDateStr(bestehend.bis);
                var in7 = new Date(heute.getTime() + 7 * 86400000);
                return tsToDateStr(in7.getTime());
            });
            const [farbe, setFarbe] = useState(function(){
                return (bestehend && bestehend.farbe) || '#1E88E5';
            });
            const [beschreibung, setBeschreibung] = useState(function(){
                return (bestehend && bestehend.beschreibung) || '';
            });
            const [zugeordnet, setZugeordnet] = useState(function(){
                if (bestehend && bestehend.mitarbeiter) return Object.assign({}, bestehend.mitarbeiter);
                return {};
            });
            const [busy, setBusy] = useState(false);

            useEffect(function(){
                function onKey(e) { if (e.key === 'Escape') onSchliessen(); }
                window.addEventListener('keydown', onKey);
                return function(){ window.removeEventListener('keydown', onKey); };
            }, []);

            function toggleMa(id) {
                var next = Object.assign({}, zugeordnet);
                if (next[id]) delete next[id];
                else next[id] = true;
                setZugeordnet(next);
            }

            function handleSpeichern() {
                var bId = (baustelleId || '').trim();
                if (!bId) { alert('Baustellen-ID fehlt.'); return; }
                if (!/^\d{4}-\d{2}-\d{2}$/.test(vonStr) || !/^\d{4}-\d{2}-\d{2}$/.test(bisStr)) {
                    alert('Von/Bis-Datum ist ungueltig.'); return;
                }
                var von = new Date(vonStr + 'T00:00:00').getTime();
                var bis = new Date(bisStr + 'T23:59:59').getTime();
                if (isNaN(von) || isNaN(bis)) { alert('Datum ungueltig.'); return; }
                if (bis < von) { alert('Bis-Datum liegt vor Von-Datum.'); return; }
                var anzahlMa = Object.keys(zugeordnet).length;
                if (anzahlMa === 0) {
                    if (!confirm('Keine Mitarbeiter zugeordnet. Trotzdem speichern?')) return;
                }
                setBusy(true);
                onSpeichern({
                    baustelleId: bId,
                    von: von,
                    bis: bis,
                    farbe: farbe,
                    beschreibung: (beschreibung || '').trim(),
                    mitarbeiter: zugeordnet
                });
            }

            var farbPresets = [
                { val: '#1E88E5', label: 'Blau' },
                { val: '#27ae60', label: 'Gruen' },
                { val: '#e67e22', label: 'Orange' },
                { val: '#c41e1e', label: 'Rot' },
                { val: '#9b59b6', label: 'Lila' },
                { val: '#e91e63', label: 'Pink' },
                { val: '#16a085', label: 'Teal' },
                { val: '#7f8c8d', label: 'Grau' }
            ];

            return (
                <div
                    onClick={onSchliessen}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        padding: '40px 12px 20px',
                        overflowY: 'auto'
                    }}
                >
                    <div
                        onClick={function(e){ e.stopPropagation(); }}
                        style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            width: '100%',
                            maxWidth: '500px',
                            padding: '18px',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.4)'
                        }}
                    >
                        {/* Kopfzeile */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '14px',
                            gap: '10px'
                        }}>
                            <div style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '15px',
                                fontWeight: 600,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                color: 'var(--text-primary)'
                            }}>
                                {bestehend ? 'Planung bearbeiten' : 'Neue Planung'}
                            </div>
                            <button
                                onClick={onSchliessen}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '22px',
                                    cursor: 'pointer',
                                    padding: '0 4px',
                                    lineHeight: 1
                                }}
                            >×</button>
                        </div>

                        {/* Baustelle-ID */}
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '11px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                color: 'var(--text-muted)',
                                marginBottom: '5px'
                            }}>Baustelle-ID *</label>
                            <input
                                type="text"
                                list="b7-baustellen-ids"
                                value={baustelleId}
                                onChange={function(e){ setBaustelleId(e.target.value); }}
                                disabled={!!bestehend}
                                placeholder="z.B. meyer-bad"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    background: bestehend ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '14px',
                                    boxSizing: 'border-box',
                                    opacity: bestehend ? 0.75 : 1
                                }}
                            />
                            <datalist id="b7-baustellen-ids">
                                {(bekannteIds || []).map(function(b){ return <option key={b} value={b} />; })}
                            </datalist>
                            {bestehend && (
                                <div style={{ marginTop: '3px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                    ID kann nicht geaendert werden. Fuer andere Baustelle neue Planung anlegen.
                                </div>
                            )}
                        </div>

                        {/* Von / Bis */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                            marginBottom: '12px'
                        }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '11px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-muted)',
                                    marginBottom: '5px'
                                }}>Von *</label>
                                <input
                                    type="date"
                                    value={vonStr}
                                    onChange={function(e){ setVonStr(e.target.value); }}
                                    style={{
                                        width: '100%',
                                        padding: '9px 10px',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '13px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '11px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-muted)',
                                    marginBottom: '5px'
                                }}>Bis *</label>
                                <input
                                    type="date"
                                    value={bisStr}
                                    onChange={function(e){ setBisStr(e.target.value); }}
                                    style={{
                                        width: '100%',
                                        padding: '9px 10px',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '13px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Farbe-Presets */}
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '11px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                color: 'var(--text-muted)',
                                marginBottom: '5px'
                            }}>Farbe</label>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                {farbPresets.map(function(f) {
                                    var aktiv = farbe === f.val;
                                    return (
                                        <button
                                            key={f.val}
                                            onClick={function(){ setFarbe(f.val); }}
                                            title={f.label}
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                background: f.val,
                                                border: aktiv ? '3px solid var(--text-primary)' : '1px solid var(--border-color)',
                                                borderRadius: '50%',
                                                cursor: 'pointer',
                                                touchAction: 'manipulation',
                                                boxShadow: aktiv ? '0 2px 8px ' + f.val + '99' : 'none',
                                                padding: 0
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Beschreibung */}
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '11px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                color: 'var(--text-muted)',
                                marginBottom: '5px'
                            }}>Beschreibung (optional)</label>
                            <input
                                type="text"
                                value={beschreibung}
                                onChange={function(e){ setBeschreibung(e.target.value); }}
                                placeholder="z.B. Fliesenarbeiten Bad EG"
                                style={{
                                    width: '100%',
                                    padding: '9px 10px',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* Mitarbeiter-Multiselect */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '11px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                color: 'var(--text-muted)',
                                marginBottom: '5px'
                            }}>Mitarbeiter zuordnen ({Object.keys(zugeordnet).length} von {(mitarbeiterListe || []).length})</label>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '5px',
                                maxHeight: '180px',
                                overflowY: 'auto',
                                padding: '5px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)'
                            }}>
                                {(mitarbeiterListe || []).map(function(ma) {
                                    var aktiv = !!zugeordnet[ma.id];
                                    return (
                                        <button
                                            key={ma.id}
                                            onClick={function(){ toggleMa(ma.id); }}
                                            style={{
                                                padding: '7px 8px',
                                                background: aktiv ? 'rgba(30,136,229,0.15)' : 'var(--bg-card)',
                                                color: 'var(--text-primary)',
                                                border: '1px solid ' + (aktiv ? 'rgba(30,136,229,0.50)' : 'var(--border-color)'),
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '12px',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                touchAction: 'manipulation',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <span style={{
                                                display: 'inline-block',
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '3px',
                                                border: '1px solid ' + (aktiv ? '#1E88E5' : 'var(--border-color)'),
                                                background: aktiv ? '#1E88E5' : 'transparent',
                                                color: '#fff',
                                                fontSize: '10px',
                                                textAlign: 'center',
                                                lineHeight: '14px'
                                            }}>{aktiv ? '✓' : ''}</span>
                                            <span style={{
                                                flex: 1,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>{ma.name || ma.id}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Aktions-Buttons */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                                onClick={onSchliessen}
                                disabled={busy}
                                style={{
                                    padding: '10px 14px',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    cursor: busy ? 'not-allowed' : 'pointer',
                                    opacity: busy ? 0.5 : 1,
                                    touchAction: 'manipulation'
                                }}
                            >Abbrechen</button>
                            {bestehend && (
                                <button
                                    onClick={onLoeschen}
                                    disabled={busy}
                                    style={{
                                        padding: '10px 14px',
                                        background: 'rgba(196,30,30,0.15)',
                                        color: 'var(--accent-red)',
                                        border: '1px solid rgba(196,30,30,0.35)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        letterSpacing: '0.5px',
                                        cursor: busy ? 'not-allowed' : 'pointer',
                                        opacity: busy ? 0.5 : 1,
                                        touchAction: 'manipulation'
                                    }}
                                >🗑 Loeschen</button>
                            )}
                            <button
                                onClick={handleSpeichern}
                                disabled={busy}
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    background: busy ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                    color: busy ? 'var(--text-muted)' : '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    cursor: busy ? 'not-allowed' : 'pointer',
                                    touchAction: 'manipulation',
                                    boxShadow: busy ? 'none' : '0 2px 8px rgba(30,136,229,0.30)'
                                }}
                            >{busy ? '⏳...' : '✓ Speichern'}</button>
                        </div>
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 9 — FREIGABEN-HUB
        // Top-Level-Seite fuer alle Foto-Reviews. Zeigt Queue wartender
        // Fotos mit Thumbnail, Metadaten, Freigeben/Ablehnen-Buttons.
        // Filter: Alle/Wartend/Freigegeben/Abgelehnt. Baustellen-Filter.
        // Spaeter (B10) kommt ein Tab fuer Stunden-Freigaben dazu.
        // ═══════════════════════════════════════════════════════
        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 B9 → B10 REFACTOR
        // FotoFreigabenTab ist der Foto-Teil innerhalb des FreigabenHub.
        // Enthaelt keinen UnterseitenHeader mehr — der Header + die
        // Tab-Auswahl sitzt im uebergeordneten FreigabenHub.
        // ═══════════════════════════════════════════════════════
        function FotoFreigabenTab() {
            const [freigaben, setFreigaben] = useState({});
            const [filterStatus, setFilterStatus] = useState('wartend');
            const [filterBaustelle, setFilterBaustelle] = useState('alle');
            const [ablehnDialog, setAblehnDialog] = useState(null); // {fotoId, eintrag}
            const [busyIds, setBusyIds] = useState({});

            // Live-Listener auf alle Foto-Freigaben
            useEffect(function(){
                if (!window.FirebaseService || !window.FirebaseService.subscribeFotoFreigaben) return;
                var unsub = window.FirebaseService.subscribeFotoFreigaben(function(data){
                    setFreigaben(data || {});
                });
                return unsub;
            }, []);

            // Zu Array konvertieren, sortieren
            var liste = [];
            for (var id in freigaben) {
                if (freigaben.hasOwnProperty(id)) {
                    liste.push(Object.assign({ _id: id }, freigaben[id]));
                }
            }
            // Neueste zuerst
            liste.sort(function(a, b) {
                return (b.hochgeladen_am || 0) - (a.hochgeladen_am || 0);
            });

            // Zaehler
            var anzahlWartend = 0, anzahlFrei = 0, anzahlAbgl = 0;
            liste.forEach(function(f){
                if (f.status === 'wartend') anzahlWartend++;
                else if (f.status === 'freigegeben') anzahlFrei++;
                else if (f.status === 'abgelehnt') anzahlAbgl++;
            });

            // Baustellen aus allen Eintraegen sammeln
            var baustellenSet = {};
            liste.forEach(function(f){
                if (f.baustelle_id) baustellenSet[f.baustelle_id] = true;
            });
            var baustellenListe = Object.keys(baustellenSet).sort();

            // Filter anwenden
            var gefiltert = liste.filter(function(f){
                if (filterStatus !== 'alle' && f.status !== filterStatus) return false;
                if (filterBaustelle !== 'alle' && f.baustelle_id !== filterBaustelle) return false;
                return true;
            });

            function setBusy(id, val) {
                setBusyIds(function(prev){
                    var n = Object.assign({}, prev);
                    if (val) n[id] = true;
                    else delete n[id];
                    return n;
                });
            }

            function handleFreigeben(fotoId, eintrag) {
                if (!window.TWStaging || !window.FirebaseService) return;
                if (busyIds[fotoId]) return;
                if (!eintrag.baustelle_id) {
                    alert('Fehler: baustelle_id fehlt im Eintrag.');
                    return;
                }
                if (!eintrag.staging_file_id) {
                    alert('Fehler: staging_file_id fehlt im Eintrag.');
                    return;
                }
                setBusy(fotoId, true);
                // 1) Kunden-Bilder-Ordner finden
                window.TWStaging.findeKundenBilderOrdner(eintrag.baustelle_id)
                    .then(function(bilderOrdner){
                        // 2) Foto in Kunden-Ordner kopieren
                        return window.TWStaging.kopiereFotoInKundenOrdner(
                            eintrag.staging_file_id,
                            bilderOrdner.id,
                            eintrag.dateiname || null
                        );
                    })
                    .then(function(neueDatei){
                        // 3) Status in Firebase aktualisieren
                        return window.FirebaseService.markiereFotoFreigegeben(
                            fotoId, neueDatei.id, 'Thomas'
                        );
                    })
                    .then(function(){
                        setBusy(fotoId, false);
                    })
                    .catch(function(err){
                        setBusy(fotoId, false);
                        alert('Fehler bei Freigabe:\n' + (err && err.message || err));
                    });
            }

            function handleAblehnen(fotoId, eintrag) {
                setAblehnDialog({ fotoId: fotoId, eintrag: eintrag });
            }

            function handleAblehnBestaetigt(grund) {
                if (!ablehnDialog) return;
                var fotoId = ablehnDialog.fotoId;
                var eintrag = ablehnDialog.eintrag;
                setBusy(fotoId, true);
                setAblehnDialog(null);

                // 1) Firebase-Status
                window.FirebaseService.markiereFotoAbgelehnt(fotoId, grund, 'Thomas')
                    .then(function(){
                        // 2) Chat-Nachricht an MA (best effort)
                        if (eintrag.ma_id && window.FirebaseService.sendeChatNachricht) {
                            var text = '📸 Foto abgelehnt';
                            if (eintrag.dateiname) text += ' ("' + eintrag.dateiname + '")';
                            text += ':\n\n' + grund + '\n\nBitte neues Foto hochladen.';
                            return window.FirebaseService.sendeChatNachricht(
                                eintrag.ma_id, text, 'de', 'Thomas', false
                            ).catch(function(e){
                                console.warn('Chat-Nachricht fehlgeschlagen:', e);
                            });
                        }
                    })
                    .then(function(){
                        setBusy(fotoId, false);
                    })
                    .catch(function(err){
                        setBusy(fotoId, false);
                        alert('Fehler bei Ablehnung:\n' + (err && err.message || err));
                    });
            }

            return (
                <div>
                    {/* Status-Filter */}
                    <div style={{
                        display: 'flex',
                        gap: '5px',
                        marginBottom: '10px',
                        flexWrap: 'wrap'
                    }}>
                        {[
                            { key: 'wartend',     label: '🕐 Wartend',     count: anzahlWartend },
                            { key: 'freigegeben', label: '✓ Freigegeben',  count: anzahlFrei },
                            { key: 'abgelehnt',   label: '✗ Abgelehnt',    count: anzahlAbgl },
                            { key: 'alle',        label: 'Alle',           count: liste.length }
                        ].map(function(f){
                            var aktiv = filterStatus === f.key;
                            return (
                                <button
                                    key={f.key}
                                    onClick={function(){ setFilterStatus(f.key); }}
                                    style={{
                                        padding: '7px 11px',
                                        background: aktiv ? 'linear-gradient(135deg, #1E88E5, #1565C0)' : 'var(--bg-secondary)',
                                        color: aktiv ? '#fff' : 'var(--text-primary)',
                                        border: '1px solid ' + (aktiv ? '#1565C0' : 'var(--border-color)'),
                                        borderRadius: 'var(--radius-sm)',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontSize: '11px',
                                        fontWeight: aktiv ? 700 : 500,
                                        letterSpacing: '0.3px',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation',
                                        boxShadow: aktiv ? '0 2px 8px rgba(30,136,229,0.30)' : 'none'
                                    }}
                                >{f.label} ({f.count})</button>
                            );
                        })}
                    </div>

                    {/* Baustellen-Filter */}
                    {baustellenListe.length > 1 && (
                        <div style={{ marginBottom: '12px' }}>
                            <select
                                value={filterBaustelle}
                                onChange={function(e){ setFilterBaustelle(e.target.value); }}
                                style={{
                                    width: '100%',
                                    padding: '9px 10px',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '13px'
                                }}
                            >
                                <option value="alle">Alle Baustellen</option>
                                {baustellenListe.map(function(b){
                                    return <option key={b} value={b}>{b}</option>;
                                })}
                            </select>
                        </div>
                    )}

                    {/* Foto-Queue */}
                    {gefiltert.length === 0 ? (
                        <div style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            background: 'var(--bg-secondary)',
                            border: '1px dashed var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-muted)'
                        }}>
                            <div style={{ fontSize: '42px', opacity: 0.5, marginBottom: '8px' }}>📸</div>
                            <div style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '13px',
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                marginBottom: '6px'
                            }}>
                                {filterStatus === 'wartend' ? 'Keine wartenden Fotos' :
                                 filterStatus === 'freigegeben' ? 'Keine freigegebenen Fotos' :
                                 filterStatus === 'abgelehnt' ? 'Keine abgelehnten Fotos' :
                                 'Keine Eintraege'}
                            </div>
                            <div style={{ fontSize: '11px', maxWidth: '340px', margin: '0 auto', lineHeight: 1.5 }}>
                                Neue Fotos erscheinen hier sobald ein Mitarbeiter welche in der Baustellen-App hochlaedt.
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {gefiltert.map(function(f){
                                return (
                                    <FotoReviewKarte
                                        key={f._id}
                                        eintrag={f}
                                        busy={!!busyIds[f._id]}
                                        onFreigeben={function(){ handleFreigeben(f._id, f); }}
                                        onAblehnen={function(){ handleAblehnen(f._id, f); }}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Ablehn-Dialog */}
                    {ablehnDialog && (
                        <AblehnDialog
                            eintrag={ablehnDialog.eintrag}
                            onBestaetigen={handleAblehnBestaetigt}
                            onSchliessen={function(){ setAblehnDialog(null); }}
                        />
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 9 — FOTO-REVIEW-KARTE
        // Einzelnes Foto als Karte mit Thumbnail, Metadaten und
        // Aktions-Buttons je nach Status.
        // ═══════════════════════════════════════════════════════
        function FotoReviewKarte({ eintrag, busy, onFreigeben, onAblehnen }) {
            const [thumbUrl, setThumbUrl] = useState(null);
            const [metaLoaded, setMetaLoaded] = useState(false);

            // Thumbnail nachladen (Drive liefert diesen Link dynamisch)
            useEffect(function(){
                if (metaLoaded) return;
                if (!eintrag.staging_file_id) { setMetaLoaded(true); return; }
                if (!window.TWStaging || !window.TWStaging.getFotoMetadaten) { setMetaLoaded(true); return; }
                window.TWStaging.getFotoMetadaten(eintrag.staging_file_id)
                    .then(function(meta){
                        if (meta && meta.thumbnailLink) setThumbUrl(meta.thumbnailLink);
                        setMetaLoaded(true);
                    })
                    .catch(function(){ setMetaLoaded(true); });
            }, [eintrag.staging_file_id]);

            var hochgeladenText = '';
            if (eintrag.hochgeladen_am) {
                try {
                    var d = new Date(eintrag.hochgeladen_am);
                    hochgeladenText = d.toLocaleDateString('de-DE') + ' ' +
                        String(d.getHours()).padStart(2,'0') + ':' +
                        String(d.getMinutes()).padStart(2,'0');
                } catch (e) { hochgeladenText = String(eintrag.hochgeladen_am); }
            }

            var statusFarbe = {
                wartend:     'var(--accent-orange)',
                freigegeben: 'var(--success)',
                abgelehnt:   'var(--accent-red)'
            }[eintrag.status] || 'var(--text-muted)';

            var statusBg = {
                wartend:     'rgba(230,126,34,0.10)',
                freigegeben: 'rgba(39,174,96,0.10)',
                abgelehnt:   'rgba(196,30,30,0.10)'
            }[eintrag.status] || 'var(--bg-secondary)';

            var statusLabel = {
                wartend:     '🕐 Wartend',
                freigegeben: '✓ Freigegeben',
                abgelehnt:   '✗ Abgelehnt'
            }[eintrag.status] || eintrag.status;

            return (
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '10px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    alignItems: 'stretch'
                }}>
                    {/* Thumbnail */}
                    <div style={{
                        width: '96px',
                        minWidth: '96px',
                        height: '96px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                    }}>
                        {thumbUrl ? (
                            <img
                                src={thumbUrl}
                                alt={eintrag.dateiname || 'Foto'}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />
                        ) : (
                            <span style={{
                                fontSize: '36px',
                                color: 'var(--text-muted)',
                                opacity: 0.5
                            }}>📸</span>
                        )}
                    </div>

                    {/* Metadaten + Aktions */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        minWidth: 0
                    }}>
                        {/* Status-Badge */}
                        <div style={{
                            display: 'inline-flex',
                            alignSelf: 'flex-start',
                            fontSize: '9px',
                            padding: '2px 7px',
                            background: statusBg,
                            color: statusFarbe,
                            border: '1px solid ' + statusFarbe + '55',
                            borderRadius: '3px',
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase'
                        }}>{statusLabel}</div>

                        {/* Dateiname */}
                        <div style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            fontFamily: "'Oswald', sans-serif",
                            letterSpacing: '0.3px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>{eintrag.dateiname || eintrag.staging_file_id || '(ohne Name)'}</div>

                        {/* Metadaten-Zeilen */}
                        <div style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            lineHeight: 1.4
                        }}>
                            <div>🏗️ {eintrag.baustelle_id || '–'}{eintrag.raum ? ' · ' + eintrag.raum : ''}</div>
                            <div>👤 {eintrag.ma_id || '–'}{eintrag.phase ? ' · ' + eintrag.phase : ''}</div>
                            <div>🕐 {hochgeladenText || '–'}</div>
                            {eintrag.status === 'abgelehnt' && eintrag.abgelehnt_grund && (
                                <div style={{ color: 'var(--accent-red)', marginTop: '3px', fontStyle: 'italic' }}>
                                    Grund: {eintrag.abgelehnt_grund}
                                </div>
                            )}
                        </div>

                        {/* Aktions nur bei wartend */}
                        {eintrag.status === 'wartend' && (
                            <div style={{ display: 'flex', gap: '5px', marginTop: 'auto' }}>
                                <button
                                    onClick={onFreigeben}
                                    disabled={busy}
                                    style={{
                                        flex: 1,
                                        padding: '7px 10px',
                                        background: busy ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #27ae60, #219a52)',
                                        color: busy ? 'var(--text-muted)' : '#fff',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        letterSpacing: '0.3px',
                                        cursor: busy ? 'not-allowed' : 'pointer',
                                        touchAction: 'manipulation',
                                        boxShadow: busy ? 'none' : '0 2px 6px rgba(39,174,96,0.30)'
                                    }}
                                >{busy ? '⏳...' : '✓ Freigeben'}</button>
                                <button
                                    onClick={onAblehnen}
                                    disabled={busy}
                                    style={{
                                        flex: 1,
                                        padding: '7px 10px',
                                        background: busy ? 'var(--bg-secondary)' : 'rgba(196,30,30,0.15)',
                                        color: busy ? 'var(--text-muted)' : 'var(--accent-red)',
                                        border: '1px solid ' + (busy ? 'var(--border-color)' : 'rgba(196,30,30,0.40)'),
                                        borderRadius: 'var(--radius-sm)',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        letterSpacing: '0.3px',
                                        cursor: busy ? 'not-allowed' : 'pointer',
                                        touchAction: 'manipulation'
                                    }}
                                >✗ Ablehnen</button>
                            </div>
                        )}

                        {/* Info bei freigegeben/abgelehnt */}
                        {eintrag.status === 'freigegeben' && eintrag.freigegeben_am && (
                            <div style={{ fontSize: '10px', color: 'var(--success)', marginTop: 'auto', fontStyle: 'italic' }}>
                                Freigegeben am {new Date(eintrag.freigegeben_am).toLocaleDateString('de-DE')}
                            </div>
                        )}
                        {eintrag.status === 'abgelehnt' && eintrag.abgelehnt_am && (
                            <div style={{ fontSize: '10px', color: 'var(--accent-red)', marginTop: 'auto', fontStyle: 'italic' }}>
                                Abgelehnt am {new Date(eintrag.abgelehnt_am).toLocaleDateString('de-DE')}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 9 — ABLEHN-DIALOG
        // Overlay-Dialog fuer den Ablehnungsgrund. Text wird an den
        // MA per Chat-Nachricht gesendet.
        // ═══════════════════════════════════════════════════════
        function AblehnDialog({ eintrag, onBestaetigen, onSchliessen }) {
            const [grund, setGrund] = useState('');

            useEffect(function(){
                function onKey(e) { if (e.key === 'Escape') onSchliessen(); }
                window.addEventListener('keydown', onKey);
                return function(){ window.removeEventListener('keydown', onKey); };
            }, []);

            // Vorschlaege fuer haeufige Grunde
            var vorschlaege = [
                'Foto unscharf, bitte neu aufnehmen.',
                'Falscher Raum — bitte richtigen Raum fotografieren.',
                'Belichtung zu dunkel, bitte mit mehr Licht nochmal machen.',
                'Ausschnitt passt nicht — bitte groesseren Bereich zeigen.'
            ];

            return (
                <div
                    onClick={onSchliessen}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        padding: '40px 12px 20px',
                        overflowY: 'auto'
                    }}
                >
                    <div
                        onClick={function(e){ e.stopPropagation(); }}
                        style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            width: '100%',
                            maxWidth: '460px',
                            padding: '18px',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.4)'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '12px',
                            gap: '10px'
                        }}>
                            <div>
                                <div style={{
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    color: 'var(--accent-red)'
                                }}>Foto ablehnen</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                                    Der Mitarbeiter bekommt automatisch eine Chat-Nachricht.
                                </div>
                            </div>
                            <button
                                onClick={onSchliessen}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '22px',
                                    cursor: 'pointer',
                                    padding: '0 4px',
                                    lineHeight: 1
                                }}
                            >×</button>
                        </div>

                        {/* Grund-Textarea */}
                        <label style={{
                            display: 'block',
                            fontSize: '11px',
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 600,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                            marginBottom: '5px'
                        }}>Ablehnungs-Grund *</label>
                        <textarea
                            value={grund}
                            onChange={function(e){ setGrund(e.target.value); }}
                            placeholder="z.B. Foto unscharf, bitte Wand neu aufnehmen."
                            rows={3}
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px',
                                boxSizing: 'border-box',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                marginBottom: '10px'
                            }}
                        />

                        {/* Schnell-Vorschlaege */}
                        <div style={{ marginBottom: '14px' }}>
                            <div style={{
                                fontSize: '10px',
                                color: 'var(--text-muted)',
                                marginBottom: '4px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '0.5px'
                            }}>HAEUFIGE GRUENDE (Klick zum Uebernehmen):</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {vorschlaege.map(function(v, idx){
                                    return (
                                        <button
                                            key={idx}
                                            onClick={function(){ setGrund(v); }}
                                            style={{
                                                padding: '6px 10px',
                                                background: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '11px',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                touchAction: 'manipulation'
                                            }}
                                        >{v}</button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Aktions */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                                onClick={onSchliessen}
                                style={{
                                    padding: '10px 14px',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    cursor: 'pointer',
                                    touchAction: 'manipulation'
                                }}
                            >Abbrechen</button>
                            <button
                                onClick={function(){
                                    var g = (grund || '').trim();
                                    if (!g) { alert('Bitte Grund eingeben.'); return; }
                                    onBestaetigen(g);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    background: 'linear-gradient(135deg, #c41e1e, #8b0000)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    cursor: 'pointer',
                                    touchAction: 'manipulation',
                                    boxShadow: '0 2px 8px rgba(196,30,30,0.30)'
                                }}
                            >✗ Ablehnen & MA benachrichtigen</button>
                        </div>
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 10 — NEUER FREIGABEN-HUB (Tab-Container)
        // Enthaelt zwei Tabs: 📸 Fotos (aus B9) und ⏱ Stunden (neu).
        // Pro Tab wird die Anzahl wartender Eintraege als Badge angezeigt.
        // ═══════════════════════════════════════════════════════
        function FreigabenHub({ onBack }) {
            const [tab, setTab] = useState('fotos');
            const [fotoPending, setFotoPending] = useState(0);
            const [stundenPending, setStundenPending] = useState(0);

            // Live-Zaehlung fuer Badges
            useEffect(function(){
                if (!window.FirebaseService || !window.FirebaseService.subscribeFotoFreigaben) return;
                var unsub = window.FirebaseService.subscribeFotoFreigaben(function(data){
                    var n = 0;
                    for (var k in data) {
                        if (data.hasOwnProperty(k) && data[k] && data[k].status === 'wartend') n++;
                    }
                    setFotoPending(n);
                });
                return unsub;
            }, []);

            useEffect(function(){
                if (!window.FirebaseService || !window.FirebaseService.subscribeStundenFreigaben) return;
                var unsub = window.FirebaseService.subscribeStundenFreigaben(function(data){
                    var n = 0;
                    for (var k in data) {
                        if (data.hasOwnProperty(k) && data[k] && data[k].status === 'wartend') n++;
                    }
                    setStundenPending(n);
                });
                return unsub;
            }, []);

            function renderTab(key, icon, label, pending) {
                var aktiv = tab === key;
                return (
                    <button
                        key={key}
                        onClick={function(){ setTab(key); }}
                        style={{
                            flex: 1,
                            padding: '12px 10px',
                            background: aktiv ? 'linear-gradient(135deg, #1E88E5, #1565C0)' : 'var(--bg-secondary)',
                            color: aktiv ? '#fff' : 'var(--text-primary)',
                            border: '1px solid ' + (aktiv ? '#1565C0' : 'var(--border-color)'),
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: "'Oswald', sans-serif",
                            fontSize: '13px',
                            fontWeight: aktiv ? 700 : 500,
                            letterSpacing: '0.5px',
                            cursor: 'pointer',
                            touchAction: 'manipulation',
                            boxShadow: aktiv ? '0 2px 8px rgba(30,136,229,0.30)' : 'none',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>{icon} {label}</span>
                        {pending > 0 && (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '20px',
                                height: '20px',
                                padding: '0 6px',
                                background: aktiv ? '#fff' : 'var(--accent-orange)',
                                color: aktiv ? '#1565C0' : '#fff',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: 700
                            }}>{pending}</span>
                        )}
                    </button>
                );
            }

            return (
                <div className="page-container" style={{
                    padding: '16px',
                    minHeight: '100vh'
                }}>
                    <UnterseitenHeader
                        icon="✅"
                        titel="Freigaben"
                        untertitel="Fotos und Stunden pruefen und freigeben"
                        onBack={onBack}
                    />

                    {/* Tab-Auswahl */}
                    <div style={{
                        display: 'flex',
                        gap: '6px',
                        marginBottom: '14px'
                    }}>
                        {renderTab('fotos',   '📸', 'Fotos',   fotoPending)}
                        {renderTab('stunden', '⏱',  'Stunden', stundenPending)}
                    </div>

                    {tab === 'fotos' && <FotoFreigabenTab />}
                    {tab === 'stunden' && <StundenFreigabenTab />}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 10 — STUNDEN-FREIGABEN-TAB
        // Analog zu FotoFreigabenTab, aber fuer PDF-Stundenzettel.
        // Freigabe: PDF wird in Kunden-Stundennachweis UND
        // Lohnbuchhaltung-{YYYY-MM} kopiert (duale Archivierung).
        // ═══════════════════════════════════════════════════════
        function StundenFreigabenTab() {
            const [freigaben, setFreigaben] = useState({});
            const [filterStatus, setFilterStatus] = useState('wartend');
            const [filterBaustelle, setFilterBaustelle] = useState('alle');
            const [filterMa, setFilterMa] = useState('alle');
            const [freigebenDialog, setFreigebenDialog] = useState(null); // {pdfId, eintrag}
            const [ablehnDialog, setAblehnDialog] = useState(null); // {pdfId, eintrag}
            const [busyIds, setBusyIds] = useState({});

            useEffect(function(){
                if (!window.FirebaseService || !window.FirebaseService.subscribeStundenFreigaben) return;
                var unsub = window.FirebaseService.subscribeStundenFreigaben(function(data){
                    setFreigaben(data || {});
                });
                return unsub;
            }, []);

            var liste = [];
            for (var id in freigaben) {
                if (freigaben.hasOwnProperty(id)) {
                    liste.push(Object.assign({ _id: id }, freigaben[id]));
                }
            }
            liste.sort(function(a, b) {
                return (b.hochgeladen_am || 0) - (a.hochgeladen_am || 0);
            });

            var anzahlWartend = 0, anzahlFrei = 0, anzahlAbgl = 0;
            liste.forEach(function(f){
                if (f.status === 'wartend') anzahlWartend++;
                else if (f.status === 'freigegeben') anzahlFrei++;
                else if (f.status === 'abgelehnt') anzahlAbgl++;
            });

            var baustellenSet = {}, maSet = {};
            liste.forEach(function(f){
                if (f.baustelle_id) baustellenSet[f.baustelle_id] = true;
                if (f.ma_id) maSet[f.ma_id] = true;
            });
            var baustellenListe = Object.keys(baustellenSet).sort();
            var maListe = Object.keys(maSet).sort();

            var gefiltert = liste.filter(function(f){
                if (filterStatus !== 'alle' && f.status !== filterStatus) return false;
                if (filterBaustelle !== 'alle' && f.baustelle_id !== filterBaustelle) return false;
                if (filterMa !== 'alle' && f.ma_id !== filterMa) return false;
                return true;
            });

            function setBusy(id, val) {
                setBusyIds(function(prev){
                    var n = Object.assign({}, prev);
                    if (val) n[id] = true;
                    else delete n[id];
                    return n;
                });
            }

            function handleFreigebenClick(pdfId, eintrag) {
                setFreigebenDialog({ pdfId: pdfId, eintrag: eintrag });
            }

            function handleFreigebenBestaetigt(anmerkung) {
                if (!freigebenDialog) return;
                var pdfId = freigebenDialog.pdfId;
                var eintrag = freigebenDialog.eintrag;
                setFreigebenDialog(null);

                if (!eintrag.baustelle_id) { alert('Fehler: baustelle_id fehlt.'); return; }
                if (!eintrag.staging_file_id) { alert('Fehler: staging_file_id fehlt.'); return; }

                // Monat bestimmen fuer Lohn-Ordner
                var monat = eintrag.monat;
                if (!monat || !/^\d{4}-\d{2}$/.test(monat)) {
                    var d = new Date(eintrag.hochgeladen_am || Date.now());
                    var m = String(d.getMonth() + 1); if (m.length < 2) m = '0' + m;
                    monat = d.getFullYear() + '-' + m;
                }

                setBusy(pdfId, true);

                // Parallel: Kunden-Stundennachweis-Ordner + Lohn-Monats-Ordner beschaffen
                var kundenKopie = null;
                var lohnKopie = null;

                Promise.all([
                    window.TWStaging.findeKundenStundenOrdner(eintrag.baustelle_id),
                    window.TWStaging.ensureLohnMonatsOrdner(monat)
                ])
                .then(function(result){
                    var kundenOrdner = result[0];
                    var lohnOrdner = result[1];
                    // Sequentiell kopieren
                    return window.TWStaging.kopierePdfInOrdner(
                        eintrag.staging_file_id, kundenOrdner.id, eintrag.dateiname || null
                    ).then(function(k){
                        kundenKopie = k;
                        // Lohn-Dateiname: {maId}_{baustelle}_{monat}.pdf (eindeutiger)
                        var lohnName = null;
                        if (eintrag.ma_id && eintrag.baustelle_id) {
                            lohnName = eintrag.ma_id + '_' + eintrag.baustelle_id + '_' + monat + '.pdf';
                        }
                        return window.TWStaging.kopierePdfInOrdner(
                            eintrag.staging_file_id, lohnOrdner.id, lohnName
                        );
                    });
                })
                .then(function(l){
                    lohnKopie = l;
                    return window.FirebaseService.markiereStundenFreigegeben(
                        pdfId,
                        kundenKopie ? kundenKopie.id : null,
                        lohnKopie ? lohnKopie.id : null,
                        'Thomas',
                        anmerkung
                    );
                })
                .then(function(){
                    setBusy(pdfId, false);
                })
                .catch(function(err){
                    setBusy(pdfId, false);
                    alert('Fehler bei Freigabe:\n' + (err && err.message || err));
                });
            }

            function handleAblehnen(pdfId, eintrag) {
                setAblehnDialog({ pdfId: pdfId, eintrag: eintrag });
            }

            function handleAblehnBestaetigt(grund) {
                if (!ablehnDialog) return;
                var pdfId = ablehnDialog.pdfId;
                var eintrag = ablehnDialog.eintrag;
                setBusy(pdfId, true);
                setAblehnDialog(null);
                window.FirebaseService.markiereStundenAbgelehnt(pdfId, grund, 'Thomas')
                    .then(function(){
                        if (eintrag.ma_id && window.FirebaseService.sendeChatNachricht) {
                            var text = '⏱ Stundenzettel abgelehnt';
                            if (eintrag.dateiname) text += ' ("' + eintrag.dateiname + '")';
                            text += ':\n\n' + grund + '\n\nBitte korrigierten Stundenzettel hochladen.';
                            return window.FirebaseService.sendeChatNachricht(
                                eintrag.ma_id, text, 'de', 'Thomas', false
                            ).catch(function(e){ console.warn('Chat-Nachricht fehlgeschlagen:', e); });
                        }
                    })
                    .then(function(){ setBusy(pdfId, false); })
                    .catch(function(err){
                        setBusy(pdfId, false);
                        alert('Fehler bei Ablehnung:\n' + (err && err.message || err));
                    });
            }

            return (
                <div>
                    {/* Status-Filter */}
                    <div style={{
                        display: 'flex',
                        gap: '5px',
                        marginBottom: '10px',
                        flexWrap: 'wrap'
                    }}>
                        {[
                            { key: 'wartend',     label: '🕐 Wartend',     count: anzahlWartend },
                            { key: 'freigegeben', label: '✓ Freigegeben',  count: anzahlFrei },
                            { key: 'abgelehnt',   label: '✗ Abgelehnt',    count: anzahlAbgl },
                            { key: 'alle',        label: 'Alle',           count: liste.length }
                        ].map(function(f){
                            var aktiv = filterStatus === f.key;
                            return (
                                <button
                                    key={f.key}
                                    onClick={function(){ setFilterStatus(f.key); }}
                                    style={{
                                        padding: '7px 11px',
                                        background: aktiv ? 'linear-gradient(135deg, #1E88E5, #1565C0)' : 'var(--bg-secondary)',
                                        color: aktiv ? '#fff' : 'var(--text-primary)',
                                        border: '1px solid ' + (aktiv ? '#1565C0' : 'var(--border-color)'),
                                        borderRadius: 'var(--radius-sm)',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontSize: '11px',
                                        fontWeight: aktiv ? 700 : 500,
                                        letterSpacing: '0.3px',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation',
                                        boxShadow: aktiv ? '0 2px 8px rgba(30,136,229,0.30)' : 'none'
                                    }}
                                >{f.label} ({f.count})</button>
                            );
                        })}
                    </div>

                    {/* Zusatz-Filter: Baustelle + MA */}
                    {(baustellenListe.length > 1 || maListe.length > 1) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                            {baustellenListe.length > 1 && (
                                <select
                                    value={filterBaustelle}
                                    onChange={function(e){ setFilterBaustelle(e.target.value); }}
                                    style={{
                                        padding: '9px 10px',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '12px'
                                    }}
                                >
                                    <option value="alle">Alle Baustellen</option>
                                    {baustellenListe.map(function(b){ return <option key={b} value={b}>{b}</option>; })}
                                </select>
                            )}
                            {maListe.length > 1 && (
                                <select
                                    value={filterMa}
                                    onChange={function(e){ setFilterMa(e.target.value); }}
                                    style={{
                                        padding: '9px 10px',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '12px'
                                    }}
                                >
                                    <option value="alle">Alle Mitarbeiter</option>
                                    {maListe.map(function(m){ return <option key={m} value={m}>{m}</option>; })}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Queue */}
                    {gefiltert.length === 0 ? (
                        <div style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            background: 'var(--bg-secondary)',
                            border: '1px dashed var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-muted)'
                        }}>
                            <div style={{ fontSize: '42px', opacity: 0.5, marginBottom: '8px' }}>⏱</div>
                            <div style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '13px',
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                marginBottom: '6px'
                            }}>
                                {filterStatus === 'wartend' ? 'Keine wartenden Stundenzettel' :
                                 filterStatus === 'freigegeben' ? 'Keine freigegebenen Stundenzettel' :
                                 filterStatus === 'abgelehnt' ? 'Keine abgelehnten Stundenzettel' :
                                 'Keine Eintraege'}
                            </div>
                            <div style={{ fontSize: '11px', maxWidth: '340px', margin: '0 auto', lineHeight: 1.5 }}>
                                Stundenzettel erscheinen hier sobald ein Mitarbeiter ein PDF in der Baustellen-App hochlaedt.
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {gefiltert.map(function(f){
                                return (
                                    <StundenReviewKarte
                                        key={f._id}
                                        eintrag={f}
                                        busy={!!busyIds[f._id]}
                                        onFreigeben={function(){ handleFreigebenClick(f._id, f); }}
                                        onAblehnen={function(){ handleAblehnen(f._id, f); }}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Freigeben-Dialog (mit optionaler Anmerkung) */}
                    {freigebenDialog && (
                        <StundenFreigebenDialog
                            eintrag={freigebenDialog.eintrag}
                            onBestaetigen={handleFreigebenBestaetigt}
                            onSchliessen={function(){ setFreigebenDialog(null); }}
                        />
                    )}

                    {/* Ablehn-Dialog (wiederverwendet AblehnDialog aus B9) */}
                    {ablehnDialog && (
                        <AblehnDialog
                            eintrag={ablehnDialog.eintrag}
                            onBestaetigen={handleAblehnBestaetigt}
                            onSchliessen={function(){ setAblehnDialog(null); }}
                        />
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 10 — STUNDEN-REVIEW-KARTE
        // Einzelner Stundenzettel mit PDF-Icon, Metadaten (MA, Monat,
        // Stunden-Summe, Baustelle) und Aktions-Buttons.
        // ═══════════════════════════════════════════════════════
        function StundenReviewKarte({ eintrag, busy, onFreigeben, onAblehnen }) {
            var hochgeladenText = '';
            if (eintrag.hochgeladen_am) {
                try {
                    var d = new Date(eintrag.hochgeladen_am);
                    hochgeladenText = d.toLocaleDateString('de-DE') + ' ' +
                        String(d.getHours()).padStart(2,'0') + ':' +
                        String(d.getMinutes()).padStart(2,'0');
                } catch (e) { hochgeladenText = String(eintrag.hochgeladen_am); }
            }

            var statusFarbe = {
                wartend:     'var(--accent-orange)',
                freigegeben: 'var(--success)',
                abgelehnt:   'var(--accent-red)'
            }[eintrag.status] || 'var(--text-muted)';

            var statusBg = {
                wartend:     'rgba(230,126,34,0.10)',
                freigegeben: 'rgba(39,174,96,0.10)',
                abgelehnt:   'rgba(196,30,30,0.10)'
            }[eintrag.status] || 'var(--bg-secondary)';

            var statusLabel = {
                wartend:     '🕐 Wartend',
                freigegeben: '✓ Freigegeben',
                abgelehnt:   '✗ Abgelehnt'
            }[eintrag.status] || eintrag.status;

            return (
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '10px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    alignItems: 'stretch'
                }}>
                    {/* PDF-Icon-Kachel */}
                    <div style={{
                        width: '88px',
                        minWidth: '88px',
                        height: '96px',
                        background: 'linear-gradient(135deg, rgba(230,126,34,0.12), rgba(230,126,34,0.04))',
                        border: '1px solid rgba(230,126,34,0.35)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: '4px',
                        color: 'var(--accent-orange)'
                    }}>
                        <span style={{ fontSize: '32px' }}>📄</span>
                        <div style={{
                            fontSize: '9px',
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 700,
                            letterSpacing: '1px'
                        }}>PDF</div>
                    </div>

                    {/* Metadaten + Aktionen */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        minWidth: 0
                    }}>
                        <div style={{
                            display: 'inline-flex',
                            alignSelf: 'flex-start',
                            fontSize: '9px',
                            padding: '2px 7px',
                            background: statusBg,
                            color: statusFarbe,
                            border: '1px solid ' + statusFarbe + '55',
                            borderRadius: '3px',
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase'
                        }}>{statusLabel}</div>

                        <div style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            fontFamily: "'Oswald', sans-serif",
                            letterSpacing: '0.3px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>{eintrag.dateiname || eintrag.staging_file_id || '(ohne Name)'}</div>

                        <div style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            lineHeight: 1.4
                        }}>
                            <div>👤 {eintrag.ma_id || '–'}{eintrag.monat ? ' · ' + eintrag.monat : ''}</div>
                            <div>🏗️ {eintrag.baustelle_id || '–'}</div>
                            {(typeof eintrag.stunden_summe === 'number') && (
                                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                    ⏱ {eintrag.stunden_summe} Stunden gesamt
                                </div>
                            )}
                            {eintrag.zeitraum_von && eintrag.zeitraum_bis && (
                                <div>📅 {eintrag.zeitraum_von} – {eintrag.zeitraum_bis}</div>
                            )}
                            {eintrag.material_liste && (
                                <div style={{ marginTop: '3px', fontStyle: 'italic' }}>
                                    🧱 {eintrag.material_liste}
                                </div>
                            )}
                            <div>🕐 Upload: {hochgeladenText || '–'}</div>
                            {eintrag.status === 'freigegeben' && eintrag.anmerkung_buero && (
                                <div style={{ marginTop: '3px', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                                    💬 Anmerkung: {eintrag.anmerkung_buero}
                                </div>
                            )}
                            {eintrag.status === 'abgelehnt' && eintrag.abgelehnt_grund && (
                                <div style={{ color: 'var(--accent-red)', marginTop: '3px', fontStyle: 'italic' }}>
                                    Grund: {eintrag.abgelehnt_grund}
                                </div>
                            )}
                        </div>

                        {eintrag.status === 'wartend' && (
                            <div style={{ display: 'flex', gap: '5px', marginTop: 'auto' }}>
                                <button
                                    onClick={onFreigeben}
                                    disabled={busy}
                                    style={{
                                        flex: 1,
                                        padding: '7px 10px',
                                        background: busy ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #27ae60, #219a52)',
                                        color: busy ? 'var(--text-muted)' : '#fff',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        letterSpacing: '0.3px',
                                        cursor: busy ? 'not-allowed' : 'pointer',
                                        touchAction: 'manipulation',
                                        boxShadow: busy ? 'none' : '0 2px 6px rgba(39,174,96,0.30)'
                                    }}
                                >{busy ? '⏳...' : '✓ Freigeben'}</button>
                                <button
                                    onClick={onAblehnen}
                                    disabled={busy}
                                    style={{
                                        flex: 1,
                                        padding: '7px 10px',
                                        background: busy ? 'var(--bg-secondary)' : 'rgba(196,30,30,0.15)',
                                        color: busy ? 'var(--text-muted)' : 'var(--accent-red)',
                                        border: '1px solid ' + (busy ? 'var(--border-color)' : 'rgba(196,30,30,0.40)'),
                                        borderRadius: 'var(--radius-sm)',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        letterSpacing: '0.3px',
                                        cursor: busy ? 'not-allowed' : 'pointer',
                                        touchAction: 'manipulation'
                                    }}
                                >✗ Ablehnen</button>
                            </div>
                        )}

                        {eintrag.status === 'freigegeben' && eintrag.freigegeben_am && (
                            <div style={{ fontSize: '10px', color: 'var(--success)', marginTop: 'auto', fontStyle: 'italic' }}>
                                Freigegeben am {new Date(eintrag.freigegeben_am).toLocaleDateString('de-DE')}
                                {eintrag.kunden_file_id && eintrag.lohn_file_id && ' · in Kunden + Lohn kopiert'}
                            </div>
                        )}
                        {eintrag.status === 'abgelehnt' && eintrag.abgelehnt_am && (
                            <div style={{ fontSize: '10px', color: 'var(--accent-red)', marginTop: 'auto', fontStyle: 'italic' }}>
                                Abgelehnt am {new Date(eintrag.abgelehnt_am).toLocaleDateString('de-DE')}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 BAUSTEIN 10 — STUNDEN-FREIGEBEN-DIALOG
        // Overlay beim Freigeben. Optional kann Thomas eine Anmerkung
        // hinzufuegen, die im Firebase-Eintrag vermerkt wird (und
        // bei Rueckfrage sichtbar bleibt).
        // ═══════════════════════════════════════════════════════
        function StundenFreigebenDialog({ eintrag, onBestaetigen, onSchliessen }) {
            const [anmerkung, setAnmerkung] = useState('');

            useEffect(function(){
                function onKey(e) { if (e.key === 'Escape') onSchliessen(); }
                window.addEventListener('keydown', onKey);
                return function(){ window.removeEventListener('keydown', onKey); };
            }, []);

            return (
                <div
                    onClick={onSchliessen}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        padding: '40px 12px 20px',
                        overflowY: 'auto'
                    }}
                >
                    <div
                        onClick={function(e){ e.stopPropagation(); }}
                        style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            width: '100%',
                            maxWidth: '460px',
                            padding: '18px',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.4)'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '12px',
                            gap: '10px'
                        }}>
                            <div>
                                <div style={{
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    color: 'var(--success)'
                                }}>Stundenzettel freigeben</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.4 }}>
                                    Das PDF wird in den Kunden-Stundennachweis<br/>UND in die Lohnbuchhaltung kopiert.
                                </div>
                            </div>
                            <button
                                onClick={onSchliessen}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '22px',
                                    cursor: 'pointer',
                                    padding: '0 4px',
                                    lineHeight: 1
                                }}
                            >×</button>
                        </div>

                        {/* Infotabelle */}
                        <div style={{
                            padding: '10px 12px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            marginBottom: '14px',
                            lineHeight: 1.6
                        }}>
                            <div>👤 <strong style={{color:'var(--text-primary)'}}>{eintrag.ma_id || '–'}</strong></div>
                            <div>🏗️ <strong style={{color:'var(--text-primary)'}}>{eintrag.baustelle_id || '–'}</strong></div>
                            {eintrag.monat && <div>📅 Monat: <strong style={{color:'var(--text-primary)'}}>{eintrag.monat}</strong></div>}
                            {(typeof eintrag.stunden_summe === 'number') && (
                                <div>⏱ Stunden: <strong style={{color:'var(--text-primary)'}}>{eintrag.stunden_summe}</strong></div>
                            )}
                            <div>📄 <strong style={{color:'var(--text-primary)'}}>{eintrag.dateiname || '(ohne Name)'}</strong></div>
                        </div>

                        <label style={{
                            display: 'block',
                            fontSize: '11px',
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 600,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                            marginBottom: '5px'
                        }}>Anmerkung (optional)</label>
                        <textarea
                            value={anmerkung}
                            onChange={function(e){ setAnmerkung(e.target.value); }}
                            placeholder="z.B. Stunde am 15.04. manuell korrigiert von 8h auf 7,5h."
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px',
                                boxSizing: 'border-box',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                marginBottom: '14px'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                                onClick={onSchliessen}
                                style={{
                                    padding: '10px 14px',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    cursor: 'pointer',
                                    touchAction: 'manipulation'
                                }}
                            >Abbrechen</button>
                            <button
                                onClick={function(){ onBestaetigen((anmerkung || '').trim()); }}
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    background: 'linear-gradient(135deg, #27ae60, #219a52)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    cursor: 'pointer',
                                    touchAction: 'manipulation',
                                    boxShadow: '0 2px 8px rgba(39,174,96,0.30)'
                                }}
                            >✓ Freigeben &amp; kopieren</button>
                        </div>
                    </div>
                </div>
            );
        }

