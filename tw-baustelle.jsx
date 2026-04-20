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
            // ─ Etappe 4.1, Baustein 7 ─
            if (subpage === 'hauptkalender') {
                return <HauptkalenderView
                    onBack={function(){ setSubpage('start'); }}
                />;
            }

            // ════════════════════════════════════════════════════
            // STARTSEITE: 4 grosse blaue Buttons (Etappe 4.1, Baustein 7)
            // ════════════════════════════════════════════════════
            return <BaustellenAppStartseite
                kunde={kunde}
                fbOk={fbOk}
                pendingCount={users.pending.length}
                onBaustellen={function(){ setSubpage('baustellen'); }}
                onTeam={function(){ setSubpage('team'); }}
                onSync={function(){ setSubpage('sync'); }}
                onHauptkalender={function(){ setSubpage('hauptkalender'); }}
                onBack={onBack}
            />;
        }

        // ═══════════════════════════════════════════════════════
        // STARTSEITE des Baustellen-App-Moduls
        // Drei blaue Modus-Karten: BAUSTELLEN - TEAM - SYNC
        // Design: identischer Gradient wie Modulwahl-Kacheln
        // ═══════════════════════════════════════════════════════
        function BaustellenAppStartseite({ kunde, fbOk, pendingCount, onBaustellen, onTeam, onSync, onHauptkalender, onBack }) {
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
                },
                {
                    // ─ Etappe 4.1, Baustein 7 ─
                    // Buero-Aggregat aller Mitarbeiter-Kalender + horizontale Baustellen-Balken
                    id: 'hauptkalender',
                    icon: '📅',
                    title: 'Hauptkalender',
                    desc: 'Alle Mitarbeiter-Anwesenheiten + geplante Baustellen-Zeitraeume in einer Matrix. Tages-Klick oeffnet Eintragungs-Modal.',
                    onClick: onHauptkalender,
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
            // ── Navigations-State (Etappe 4.1: bis zu 6 Ebenen) ──
            // view: 'liste' | 'detail' | 'ordnerEbene' | 'browser'
            //     | 'nachrichten-ma-liste' | 'nachrichten-ma-detail'
            //   liste                  = Kunden-Liste mit Status
            //   detail                 = 2 Ordner-Kacheln pro Baustelle (BAUSTELLEN-DATEN, NACHRICHTEN)
            //   ordnerEbene            = 5 bzw. 2 Sub-Kacheln, je nach gewaehltem Ordner
            //   browser                = Datei-Browser im Sub-Unterordner
            //   nachrichten-ma-liste   = Mitarbeiter-Liste (nach Klick auf Sub-Kachel "Kalender" oder "Chat")
            //   nachrichten-ma-detail  = Pro-MA-Detail (Kalender-UI od. Chat-UI; Bausteine 5+6)
            const [view, setView] = useState('liste');
            const [activeBaustelle, setActiveBaustelle] = useState(null);
            const [activeOrdner, setActiveOrdner] = useState(null);          // 'baustellen-daten' | 'nachrichten'
            const [activeUnterordner, setActiveUnterordner] = useState(null);
            const [nachrichtenModus, setNachrichtenModus] = useState(null);  // 'kalender' | 'chat'
            const [activeMa, setActiveMa] = useState(null);                  // {id, name, sprache, rolle, ...}

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

            // ── EBENE 2: Detail-Ansicht einer Baustelle (2 Ordner-Kacheln, Etappe 4.1) ──
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
                    onOpenOrdner={function(ordnerId) {
                        setActiveOrdner(ordnerId);
                        setView('ordnerEbene');
                    }}
                />;
            }

            // ── EBENE 3: Ordner-Ebene (5 bzw. 2 Sub-Kacheln, Etappe 4.1) ──
            if (view === 'ordnerEbene' && activeBaustelle && activeOrdner) {
                return <StagingOrdnerEbene
                    baustelle={activeBaustelle}
                    stagingStatus={stagingStatus[activeBaustelle.name]}
                    ordnerId={activeOrdner}
                    onBack={function(){
                        setActiveOrdner(null);
                        setView('detail');
                    }}
                    onOpenUnterordner={function(sub) {
                        setActiveUnterordner(sub);
                        setView('browser');
                    }}
                    onOpenNachrichtenModus={function(modus) {
                        // modus = 'kalender' | 'chat'  -- oeffnet Mitarbeiter-Liste
                        setNachrichtenModus(modus);
                        setView('nachrichten-ma-liste');
                    }}
                />;
            }

            // ── EBENE 4: Ordner-Browser ──
            if (view === 'browser' && activeBaustelle && activeUnterordner) {
                return <StagingOrdnerBrowser
                    baustelle={activeBaustelle}
                    unterordner={activeUnterordner}
                    onBack={function(){
                        setActiveUnterordner(null);
                        setView('ordnerEbene');
                    }}
                />;
            }

            // ── EBENE 4 (Nachrichten-Zweig): Mitarbeiter-Liste ──
            if (view === 'nachrichten-ma-liste' && activeBaustelle && nachrichtenModus) {
                return <NachrichtenMitarbeiterListe
                    baustelle={activeBaustelle}
                    modus={nachrichtenModus}
                    onBack={function(){
                        setNachrichtenModus(null);
                        setView('ordnerEbene');
                    }}
                    onSelectMa={function(ma) {
                        setActiveMa(ma);
                        setView('nachrichten-ma-detail');
                    }}
                />;
            }

            // ── EBENE 5 (Nachrichten-Zweig): MA-Detail (Kalender od. Chat) ──
            if (view === 'nachrichten-ma-detail' && activeMa && nachrichtenModus) {
                return <NachrichtenMaDetail
                    ma={activeMa}
                    modus={nachrichtenModus}
                    baustelle={activeBaustelle}
                    onBack={function(){
                        setActiveMa(null);
                        setView('nachrichten-ma-liste');
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
        // ═══════════════════════════════════════════════════════
        // STAGING-DETAIL (Etappe 4.1)
        // ────────────────────────────────────────────────────────
        // Zeigt 2 grosse Ordner-Kacheln pro Baustelle:
        //   * BAUSTELLEN-DATEN  (Zeichnungen, Anweisungen, Baustellendaten,
        //                        Fotos, Stunden -- 5 Sub-Kacheln in EBENE 3)
        //   * NACHRICHTEN       (Kalender, Chat -- 2 Sub-Kacheln in EBENE 3)
        // Sub-Kacheln werden in StagingOrdnerEbene gerendert.
        // ═══════════════════════════════════════════════════════
        function StagingDetail({ baustelle, stagingStatus, onBack, onOpenOrdner }) {
            const [info, setInfo] = useState(null);
            const [laedt, setLaedt] = useState(false);
            const [fehler, setFehler] = useState(null);
            const [anlegeBusy, setAnlegeBusy] = useState(false);
            // ─ Etappe 4.1, Baustein 8 ─
            const [migrationPlan, setMigrationPlan]   = useState(null);   // {migrationNoetig, geplant, konflikte}
            const [migrationBusy, setMigrationBusy]   = useState(false);
            const [migrationStatus, setMigrationStatus] = useState(null); // {aktuell, gesamt, name, neu, status}

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

            // Migrations-Plan bei jedem ladeInfo zusaetzlich pruefen
            async function pruefeMigration() {
                if (!bereit || !window.TWStaging || !window.TWStaging.pruefeStagingMigration) return;
                try {
                    var p = await window.TWStaging.pruefeStagingMigration(baustelle.name);
                    setMigrationPlan(p);
                } catch(e) {
                    console.warn('pruefeStagingMigration:', e);
                }
            }

            useEffect(function() {
                ladeInfo();
                pruefeMigration();
            }, [baustelle.name, bereit]);

            async function handleStagingAnlegen() {
                if (!window.TWStaging) {
                    alert('TWStaging-Service nicht verfuegbar');
                    return;
                }
                setAnlegeBusy(true);
                try {
                    await window.TWStaging.createStagingBaustelle(baustelle.name);
                    await ladeInfo();
                    await pruefeMigration();
                    alert('Staging-Bereich fuer "' + baustelle.name + '" erfolgreich angelegt.');
                } catch (e) {
                    alert('Fehler beim Anlegen:\n\n' + (e.message || String(e)));
                }
                setAnlegeBusy(false);
            }

            // ── Migrations-Handler (Baustein 8) ──
            async function handleMigrationStarten() {
                if (!migrationPlan || !migrationPlan.geplant || migrationPlan.geplant.length === 0) {
                    alert('Nichts zu migrieren.');
                    return;
                }
                var liste = migrationPlan.geplant
                    .map(function(g){ return '   • "' + g.altName + '"  ➜  "' + g.neuName + '"'; })
                    .join('\n');
                var nachricht = 'Drive-Ordner physisch umbenennen?\n\n' + liste +
                    '\n\nNach der Migration sind die Ordner auch im Google-Drive-Webinterface unter den neuen Namen sichtbar. Diese Aktion ist nicht ohne Weiteres umkehrbar.';
                if (!confirm(nachricht)) return;

                setMigrationBusy(true);
                setMigrationStatus(null);
                try {
                    var ergebnis = await window.TWStaging.fuehreStagingMigrationAus(baustelle.name, {
                        onProgress: function(s) { setMigrationStatus(s); }
                    });
                    var summary = '✓ Migration abgeschlossen.\n\n' +
                        'Umbenannt: ' + ergebnis.umbenannt + '\n' +
                        'Fehler:    ' + ergebnis.fehler.length + '\n' +
                        'Konflikte (uebersprungen): ' + ergebnis.uebersprungen;
                    if (ergebnis.fehler.length > 0) {
                        summary += '\n\nFehler-Details:\n' + ergebnis.fehler
                            .map(function(f){ return '  • ' + f.altName + ' -> ' + f.neuName + ': ' + f.fehler; })
                            .join('\n');
                    }
                    if (ergebnis.konflikte.length > 0) {
                        summary += '\n\nKonflikte (alt UND neu existieren -- bitte manuell in Drive aufloesen):\n' +
                            ergebnis.konflikte
                                .map(function(k){ return '  • "' + k.altName + '" und "' + k.neuName + '"'; })
                                .join('\n');
                    }
                    alert(summary);
                    // Frisch laden
                    await ladeInfo();
                    await pruefeMigration();
                } catch(e) {
                    alert('Migration fehlgeschlagen:\n\n' + (e.message || e));
                } finally {
                    setMigrationBusy(false);
                    setMigrationStatus(null);
                }
            }

            // ── Aggregierte Counts aus den Drive-Unterordnern (Etappe 4.1, Baustein 2) ──
            // info.unterordner verwendet seit Baustein 2 die OFFIZIELLEN Namen als Keys
            // (Aliase werden in TWStaging.getStagingInfo aufgeloest). Die alten Namen
            // bleiben hier in der Liste als Defense-in-Depth, falls Daten noch unter
            // alten Keys reinkommen.
            function summiere(unterordnerNamen) {
                if (!info || !info.unterordner) return { anzahl: 0, groesse: 0 };
                var sum = { anzahl: 0, groesse: 0 };
                unterordnerNamen.forEach(function(n) {
                    var d = info.unterordner[n];
                    if (d) {
                        sum.anzahl  += (d.anzahlDateien  || 0);
                        sum.groesse += (d.groesseBytes   || 0);
                    }
                });
                return sum;
            }

            // Drive-Ordner, die zu BAUSTELLEN-DATEN gehoeren (offizielle Namen + alte als Fallback)
            var bdSum = summiere(['Zeichnungen', 'Anweisungen', 'Baustellendaten', 'Fotos', 'Stunden',
                                   'Baustellen-App', 'Bilder']);

            // Die 2 grossen Ordner-Kacheln
            var ordnerKacheln = [
                {
                    id: 'baustellen-daten',
                    icon: '🏗️',
                    title: 'Baustellen-Daten',
                    subtitle: '5 Unterordner: Zeichnungen, Anweisungen, Baustellendaten, Fotos, Stunden',
                    counterLabel: bdSum.anzahl + ' Datei' + (bdSum.anzahl !== 1 ? 'en' : '') +
                                  (bdSum.groesse > 0 ? ' (' + formatiereGroesse(bdSum.groesse) + ')' : ''),
                    enabled: bereit
                },
                {
                    id: 'nachrichten',
                    icon: '💬',
                    title: 'Nachrichten',
                    subtitle: '2 Unterordner: Kalender, Chat',
                    counterLabel: 'Kommt in Baustein 4-6',
                    enabled: bereit
                }
            ];

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
                                mit den vorgesehenen Unterordnern.
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

                    {/* ── Migrations-Banner (Etappe 4.1, Baustein 8) ── */}
                    {bereit && migrationPlan && migrationPlan.migrationNoetig && (
                        <div style={{
                            padding: '12px 14px',
                            marginBottom: '14px',
                            background: 'rgba(155,89,182,0.10)',
                            border: '1px solid rgba(155,89,182,0.4)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            color: '#cba0d8',
                            lineHeight: 1.5
                        }}>
                            <div style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '12px',
                                fontWeight: 600,
                                letterSpacing: '0.6px',
                                textTransform: 'uppercase',
                                color: '#bf80d6',
                                marginBottom: '4px'
                            }}>
                                🔄 Drive-Migration verfuegbar
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                Diese Baustelle hat noch alte Drive-Ordnernamen, die seit Etappe 4.1 umbenannt werden sollten:
                            </div>
                            <ul style={{ margin: '0 0 8px 18px', padding: 0 }}>
                                {migrationPlan.geplant.map(function(g) {
                                    return <li key={g.altName}>
                                        <code style={{ background: 'rgba(0,0,0,0.25)', padding: '1px 6px', borderRadius: '3px' }}>{g.altName}</code>
                                        {' '}➜{' '}
                                        <code style={{ background: 'rgba(0,0,0,0.25)', padding: '1px 6px', borderRadius: '3px' }}>{g.neuName}</code>
                                    </li>;
                                })}
                                {migrationPlan.konflikte.map(function(k) {
                                    return <li key={'k-'+k.altName} style={{ color: 'var(--accent-orange)', marginTop: '2px' }}>
                                        ⚠ Konflikt: <code>{k.altName}</code> UND <code>{k.neuName}</code> existieren -- manuell in Drive aufloesen
                                    </li>;
                                })}
                            </ul>
                            {migrationStatus && (
                                <div style={{
                                    marginTop: '6px',
                                    padding: '6px 10px',
                                    background: 'rgba(0,0,0,0.25)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                    color: 'var(--text-light)'
                                }}>
                                    [{migrationStatus.aktuell}/{migrationStatus.gesamt}] {migrationStatus.name} ➜ {migrationStatus.neu}
                                    {migrationStatus.status === 'ok' && ' ✓'}
                                    {migrationStatus.status === 'fehler' && ' ❌ ' + (migrationStatus.fehler || '')}
                                    {migrationStatus.status === 'aktiv' && ' ⏳'}
                                </div>
                            )}
                            <button
                                onClick={handleMigrationStarten}
                                disabled={migrationBusy || migrationPlan.geplant.length === 0}
                                style={{
                                    marginTop: '8px',
                                    padding: '8px 18px',
                                    background: (migrationBusy || migrationPlan.geplant.length === 0)
                                        ? 'var(--bg-secondary)'
                                        : 'linear-gradient(135deg, #9b59b6, #8e44ad)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '12px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    letterSpacing: '0.6px',
                                    textTransform: 'uppercase',
                                    cursor: (migrationBusy || migrationPlan.geplant.length === 0) ? 'not-allowed' : 'pointer',
                                    boxShadow: (migrationBusy || migrationPlan.geplant.length === 0)
                                        ? 'none' : '0 4px 14px rgba(155,89,182,0.30)',
                                    touchAction: 'manipulation',
                                    opacity: (migrationBusy || migrationPlan.geplant.length === 0) ? 0.6 : 1
                                }}>
                                {migrationBusy ? '⏳ Migriere...' : '🔄 Drive-Ordner umbenennen'}
                            </button>
                            {migrationPlan.geplant.length === 0 && migrationPlan.konflikte.length > 0 && (
                                <div style={{ marginTop: '6px', fontSize: '10.5px', opacity: 0.8 }}>
                                    Nur Konflikte vorhanden -- bitte zuerst manuell in Drive aufloesen.
                                </div>
                            )}
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

                    {/* ── Die 2 grossen Ordner-Kacheln (Etappe 4.1) ── */}
                    {bereit && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            marginTop: '6px'
                        }}>
                            {ordnerKacheln.map(function(c) {
                                return (
                                    <button
                                        key={c.id}
                                        onClick={function(){ if (c.enabled) onOpenOrdner(c.id); }}
                                        disabled={!c.enabled}
                                        style={{
                                            width: '100%',
                                            padding: '24px 22px',
                                            borderRadius: 'var(--radius-lg)',
                                            border: '1px solid transparent',
                                            cursor: c.enabled ? 'pointer' : 'not-allowed',
                                            background: c.enabled
                                                ? 'linear-gradient(135deg, #1E88E5, #1565C0)'
                                                : 'var(--bg-secondary)',
                                            color: '#fff',
                                            opacity: c.enabled ? 1 : 0.5,
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '18px',
                                            textAlign: 'left',
                                            boxShadow: c.enabled
                                                ? '0 6px 20px rgba(30,136,229,0.30)'
                                                : 'none',
                                            transition: 'all 0.25s ease',
                                            touchAction: 'manipulation'
                                        }}
                                        onMouseDown={function(e) {
                                            if (!c.enabled) return;
                                            e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                                        }}
                                        onMouseUp={function(e) {
                                            e.currentTarget.style.transform = '';
                                        }}
                                        onMouseLeave={function(e) {
                                            e.currentTarget.style.transform = '';
                                        }}
                                    >
                                        <span style={{ fontSize: '40px', marginTop: '2px', lineHeight: 1 }}>{c.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontSize: '19px',
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
                                                fontFamily: "'Source Sans 3', sans-serif",
                                                marginBottom: '8px'
                                            }}>
                                                {c.subtitle}
                                            </div>
                                            <div style={{
                                                fontSize: '11px',
                                                opacity: 0.78,
                                                fontFamily: "'Source Sans 3', sans-serif",
                                                fontStyle: 'italic'
                                            }}>
                                                {c.counterLabel}
                                            </div>
                                        </div>
                                        <span style={{
                                            fontSize: '24px',
                                            opacity: 0.75,
                                            marginTop: '8px'
                                        }}>→</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // STAGING-ORDNER-EBENE (Etappe 4.1, neue Zwischenebene)
        // ────────────────────────────────────────────────────────
        // Zeigt die Sub-Kacheln eines der 2 Ordner aus StagingDetail:
        //   ordnerId === 'baustellen-daten' -> 5 Sub-Kacheln
        //     (Zeichnungen, Anweisungen, Baustellendaten, Fotos, Stunden)
        //   ordnerId === 'nachrichten'      -> 2 Sub-Kacheln
        //     (Kalender, Chat)
        //
        // Die Sub-Kacheln fuer "Baustellen-Daten" sind heute bereits
        // klickbar -- sie oeffnen den bestehenden StagingOrdnerBrowser
        // mit den noch-vorhandenen Drive-Ordnern (alte Namen werden
        // tolerant zugeordnet, bis Baustein 8 die Drive-Migration macht).
        // Die Sub-Kacheln fuer "Nachrichten" sind Stubs (Baustein 5+6).
        // ═══════════════════════════════════════════════════════
        function StagingOrdnerEbene({ baustelle, stagingStatus, ordnerId, onBack, onOpenUnterordner, onOpenNachrichtenModus }) {
            const [info, setInfo] = useState(null);
            const [laedt, setLaedt] = useState(false);
            const [fehler, setFehler] = useState(null);

            var bereit = !!(stagingStatus && stagingStatus.vorhanden);

            useEffect(function() {
                if (!bereit || !window.TWStaging) return;
                setLaedt(true);
                window.TWStaging.getStagingInfo(baustelle.name)
                    .then(function(i) { setInfo(i); setLaedt(false); })
                    .catch(function(e) { setFehler(e.message || String(e)); setLaedt(false); });
            }, [baustelle.name, bereit]);

            // ── Sub-Kachel-Definition je nach gewaehltem Ordner ──
            // Etappe 4.1, Baustein 2: TWStaging.getStagingInfo loest Aliase bereits
            // serverseitig auf, daher reicht hier die Suche unter dem offiziellen Namen.
            // Die Liste in findeDriveOrdner enthaelt zusaetzlich alte Namen als
            // Defense-in-Depth, falls jemand alte Daten direkt durchschiebt.
            function findeDriveOrdner(uiNamen) {
                if (!info || !info.unterordner) return null;
                for (var i = 0; i < uiNamen.length; i++) {
                    var d = info.unterordner[uiNamen[i]];
                    if (d) return { name: uiNamen[i], daten: d };
                }
                return null;
            }

            var subKacheln = [];
            if (ordnerId === 'baustellen-daten') {
                subKacheln = [
                    {
                        ui: 'Zeichnungen',
                        icon: '📐', farbe: '#2ecc71',
                        permission: 'readonly',
                        drive: findeDriveOrdner(['Zeichnungen']),
                        stub: false
                    },
                    {
                        ui: 'Anweisungen',
                        icon: '📋', farbe: '#3498db',
                        permission: 'readonly',
                        // Defense-in-Depth: Falls TWStaging-Lookup mal nicht greift,
                        // findet die Suche auch alte "Baustellen-App"-Daten.
                        drive: findeDriveOrdner(['Anweisungen', 'Baustellen-App']),
                        stub: false
                    },
                    {
                        ui: 'Baustellendaten',
                        icon: '🏷️', farbe: '#16a085',
                        permission: 'readonly',
                        drive: findeDriveOrdner(['Baustellendaten']),
                        stub: false
                    },
                    {
                        ui: 'Fotos',
                        icon: '📸', farbe: '#9b59b6',
                        permission: 'upload',
                        drive: findeDriveOrdner(['Fotos', 'Bilder']),
                        stub: false
                    },
                    {
                        ui: 'Stunden',
                        icon: '⏱️', farbe: '#e67e22',
                        permission: 'upload',
                        drive: findeDriveOrdner(['Stunden']),
                        stub: false
                    }
                ];
            } else if (ordnerId === 'nachrichten') {
                subKacheln = [
                    {
                        ui: 'Kalender',
                        nachrichtenModus: 'kalender',
                        icon: '📅', farbe: '#1E88E5',
                        permission: 'readonly',
                        drive: null,
                        stub: false,
                        info: 'Mitarbeiter-Liste -> persoenlicher Jahres-Kalender'
                    },
                    {
                        ui: 'Chat',
                        nachrichtenModus: 'chat',
                        icon: '💬', farbe: '#27ae60',
                        permission: 'upload',
                        drive: null,
                        stub: false,
                        info: 'Mitarbeiter-Liste -> 1:1-Chat mit dem MA'
                    }
                ];
            }

            var ordnerTitel = ordnerId === 'baustellen-daten'
                ? 'Baustellen-Daten'
                : ordnerId === 'nachrichten'
                    ? 'Nachrichten'
                    : 'Ordner';

            return (
                <div className="page-container" style={{
                    padding: '16px',
                    minHeight: '100vh'
                }}>
                    <UnterseitenHeader
                        icon={ordnerId === 'baustellen-daten' ? '🏗️' : '💬'}
                        titel={ordnerTitel}
                        untertitel={baustelle.name}
                        onBack={onBack}
                    />

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

                    {/* Sub-Kachel-Grid: 2 Spalten (auch bei 5 Eintraegen) */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px'
                    }}>
                        {subKacheln.map(function(k, idx) {
                            var hatDrive            = !!(k.drive && k.drive.daten);
                            var istNachrichtenKachel = !!k.nachrichtenModus;
                            var klickbar            = (hatDrive && !k.stub) || istNachrichtenKachel;
                            var anzahl    = hatDrive ? (k.drive.daten.anzahlDateien || 0) : 0;
                            var groesse   = hatDrive ? formatiereGroesse(k.drive.daten.groesseBytes) : '–';
                            var letzte    = hatDrive && k.drive.daten.letzteAenderung
                                ? new Date(k.drive.daten.letzteAenderung).toLocaleDateString('de-DE')
                                : '–';
                            return (
                                <button
                                    key={k.ui + '-' + idx}
                                    onClick={function(){
                                        if (!klickbar) return;
                                        if (istNachrichtenKachel) {
                                            // ── Etappe 4.1, Baustein 4 ──
                                            // Klick auf "Kalender" oder "Chat" oeffnet die Mitarbeiter-Liste
                                            if (typeof onOpenNachrichtenModus === 'function') {
                                                onOpenNachrichtenModus(k.nachrichtenModus);
                                            }
                                        } else if (hatDrive) {
                                            // StagingOrdnerBrowser erwartet ein Objekt {name, daten, permission, ...}
                                            onOpenUnterordner({
                                                name: k.drive.name,    // tatsaechlicher Drive-Name
                                                uiName: k.ui,          // Anzeige-Name (Etappe 4.1)
                                                icon: k.icon,
                                                farbe: k.farbe,
                                                daten: k.drive.daten,
                                                permission: k.permission
                                            });
                                        }
                                    }}
                                    disabled={!klickbar}
                                    style={{
                                        padding: '16px 12px',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        background: klickbar ? 'var(--bg-card)' : 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        cursor: klickbar ? 'pointer' : 'not-allowed',
                                        opacity: klickbar ? 1 : 0.55,
                                        textAlign: 'center',
                                        transition: 'all 0.2s',
                                        touchAction: 'manipulation',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '6px',
                                        minHeight: '150px'
                                    }}
                                >
                                    <span style={{ fontSize: '32px', color: k.farbe }}>{k.icon}</span>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        fontFamily: "'Oswald', sans-serif",
                                        letterSpacing: '0.5px',
                                        textTransform: 'uppercase'
                                    }}>{k.ui}</div>

                                    {istNachrichtenKachel ? (
                                        <div style={{
                                            fontSize: '10.5px',
                                            color: 'var(--text-muted)',
                                            lineHeight: 1.4,
                                            padding: '4px 6px'
                                        }}>
                                            {k.info}
                                        </div>
                                    ) : k.stub ? (
                                        <div style={{
                                            fontSize: '10.5px',
                                            color: 'var(--text-muted)',
                                            lineHeight: 1.4,
                                            fontStyle: 'italic',
                                            padding: '4px 6px'
                                        }}>
                                            {k.stubText}
                                        </div>
                                    ) : (
                                        <div style={{
                                            fontSize: '11px',
                                            color: 'var(--text-muted)',
                                            lineHeight: 1.4
                                        }}>
                                            <div><strong style={{ color: 'var(--text-light)' }}>{anzahl}</strong> Datei{anzahl !== 1 ? 'en' : ''}</div>
                                            <div>{groesse}</div>
                                            <div style={{ fontSize: '10px', marginTop: '2px' }}>{letzte}</div>
                                        </div>
                                    )}

                                    <div style={{
                                        marginTop: '4px',
                                        fontSize: '9px',
                                        padding: '2px 8px',
                                        background: k.permission === 'upload' ? 'rgba(39,174,96,0.15)' : 'rgba(77,166,255,0.15)',
                                        color: k.permission === 'upload' ? 'var(--success)' : 'var(--accent-blue)',
                                        borderRadius: '4px',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: '0.5px',
                                        textTransform: 'uppercase'
                                    }}>
                                        {k.permission === 'upload' ? 'MA: Upload' : 'MA: nur lesen'}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Hinweis-Footer fuer Nachrichten -- Update Baustein 4 */}
                    {ordnerId === 'nachrichten' && (
                        <div style={{
                            marginTop: '20px',
                            padding: '12px 14px',
                            background: 'rgba(30,136,229,0.08)',
                            border: '1px solid rgba(30,136,229,0.2)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            color: 'var(--text-light)',
                            lineHeight: 1.5
                        }}>
                            ℹ️ Kalender und Chat sind pro Mitarbeiter (baustellen-uebergreifend). Klick auf eine Kachel oeffnet die Mitarbeiter-Liste. Detail-Ansichten (Kalender-Eintragungen, Chat-Senden) folgen in Bausteinen 5 und 6.
                        </div>
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // NACHRICHTEN-MITARBEITER-LISTE (Etappe 4.1, Baustein 4)
        // ────────────────────────────────────────────────────────
        // Wird aus StagingOrdnerEbene aufgerufen, wenn der User auf die Sub-Kachel
        // "Kalender" oder "Chat" tippt. Zeigt die Liste aller MAs (aus Firebase
        // /mitarbeiter/, gemerged mit window.MITARBEITER_LISTE als Grundstock).
        //
        // Beim ersten Oeffnen wird ensureMitarbeiterStammdaten() aufgerufen, damit
        // die MAs aus der lokalen Liste in Firebase landen (idempotent, wirkt nur
        // einmal). Das laedt 7 MAs in /mitarbeiter/ und legt /kalender/{id}/_meta
        // sowie /chats/{id}/_meta an.
        //
        // Klick auf einen MA -> ruft onSelectMa(ma), das oeffnet den Detail-View
        // (Kalender oder Chat, je nach modus).
        // ═══════════════════════════════════════════════════════
        function NachrichtenMitarbeiterListe({ baustelle, modus, onBack, onSelectMa }) {
            const [maListe, setMaListe] = useState([]);
            const [dringendCounts, setDringendCounts] = useState({});  // { maId: count }
            const [suche, setSuche] = useState('');
            const [filter, setFilter] = useState('aktiv');             // 'alle' | 'aktiv' | 'ausgeschieden'
            const [laedt, setLaedt] = useState(true);
            const [stammdatenInfo, setStammdatenInfo] = useState(null); // {angelegt, vorhanden}

            // ── Helper: MA-Liste aus Grundstock + Firebase mergen ──
            // Grundstock liefert lokal verfuegbare Eintraege (offline-faehig),
            // Firebase liefert die "Wahrheit" mit Sprache/Status.
            function mergeMaListe(firebaseListe) {
                var grundstock = window.MITARBEITER_LISTE || [];
                var idMap = {};
                // Erst Grundstock einsetzen
                grundstock.forEach(function(g) {
                    if (g && g.id) {
                        idMap[g.id] = {
                            id: g.id,
                            name: g.name,
                            rolle: g.rolle || 'Fliesenleger',
                            sprache: 'de',
                            status: 'aktiv',
                            quelle: 'grundstock'
                        };
                    }
                });
                // Dann Firebase druebersetzen (Wahrheit)
                (firebaseListe || []).forEach(function(f) {
                    if (f && f.id) {
                        idMap[f.id] = Object.assign(idMap[f.id] || {}, f, { quelle: 'firebase' });
                    }
                });
                var arr = [];
                for (var k in idMap) { if (idMap.hasOwnProperty(k)) arr.push(idMap[k]); }
                // Aktive zuerst, dann alphabetisch
                arr.sort(function(a, b) {
                    if ((a.status || 'aktiv') !== (b.status || 'aktiv')) {
                        return (a.status || 'aktiv') === 'aktiv' ? -1 : 1;
                    }
                    return (a.name || '').localeCompare(b.name || '');
                });
                return arr;
            }

            // ── Stammdaten-Pflege beim ersten Oeffnen (idempotent) ──
            useEffect(function() {
                var aktiv = true;
                if (window.FirebaseService && window.FirebaseService.ensureMitarbeiterStammdaten) {
                    window.FirebaseService.ensureMitarbeiterStammdaten()
                        .then(function(r) { if (aktiv) setStammdatenInfo(r); })
                        .catch(function(e) { console.warn('ensureMitarbeiterStammdaten:', e); });
                }
                return function(){ aktiv = false; };
            }, []);

            // ── Live-Listener fuer MA-Liste ──
            useEffect(function() {
                if (!window.FirebaseService || !window.FirebaseService.subscribeMitarbeiter) {
                    // Offline-Fallback: nur Grundstock
                    setMaListe(mergeMaListe([]));
                    setLaedt(false);
                    return function(){};
                }
                var unsub = window.FirebaseService.subscribeMitarbeiter(function(fbListe) {
                    setMaListe(mergeMaListe(fbListe));
                    setLaedt(false);
                });
                return unsub;
            }, []);

            // ── Live-Listener fuer Dringend-Counts (Chat-Modus) ──
            useEffect(function() {
                if (modus !== 'chat') return function(){};
                if (!window.FirebaseService || !window.FirebaseService.subscribeAlleChatsDringendCount) return function(){};
                var unsub = window.FirebaseService.subscribeAlleChatsDringendCount(function(map) {
                    setDringendCounts(map || {});
                });
                return unsub;
            }, [modus]);

            // ── Gefilterte und gesuchte Liste ──
            var gefiltert = maListe.filter(function(m) {
                if (suche) {
                    var s = suche.toLowerCase();
                    if ((m.name || '').toLowerCase().indexOf(s) === -1
                        && (m.rolle || '').toLowerCase().indexOf(s) === -1) return false;
                }
                var status = m.status || 'aktiv';
                if (filter === 'aktiv' && status !== 'aktiv') return false;
                if (filter === 'ausgeschieden' && status !== 'ausgeschieden') return false;
                return true;
            });

            var modusIcon  = modus === 'chat' ? '💬' : '📅';
            var modusLabel = modus === 'chat' ? 'Chat'      : 'Kalender';
            var modusUntertitel = modus === 'chat'
                ? 'Mitarbeiter waehlen fuer 1:1-Chat'
                : 'Mitarbeiter waehlen fuer Jahres-Kalender';

            // ── Sprach-Anzeige (Flagge + Code) ──
            function spracheBadge(code) {
                var c = (code || 'de').toLowerCase();
                var flaggen = { de:'🇩🇪', en:'🇬🇧', ru:'🇷🇺', tr:'🇹🇷', cs:'🇨🇿', sk:'🇸🇰', es:'🇪🇸', pl:'🇵🇱' };
                return (flaggen[c] || '🏳️') + ' ' + c.toUpperCase();
            }

            return (
                <div className="page-container" style={{ padding: '16px', minHeight: '100vh' }}>
                    <UnterseitenHeader
                        icon={modusIcon}
                        titel={modusLabel}
                        untertitel={modusUntertitel}
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
                            inputMode="search"
                            placeholder="Mitarbeiter suchen..."
                            value={suche}
                            onChange={function(e){ setSuche(e.target.value); }}
                            style={{
                                width: '100%',
                                padding: '11px 14px 11px 40px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                fontFamily: "'Source Sans 3', sans-serif",
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Filter-Tabs (aktiv/ausgeschieden/alle) */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                        {[
                            { id: 'aktiv',         label: 'Aktiv' },
                            { id: 'ausgeschieden', label: 'Ausgeschieden' },
                            { id: 'alle',          label: 'Alle' }
                        ].map(function(f) {
                            var aktiv = filter === f.id;
                            return (
                                <button
                                    key={f.id}
                                    onClick={function(){ setFilter(f.id); }}
                                    style={{
                                        padding: '7px 14px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid ' + (aktiv ? 'var(--accent-blue)' : 'var(--border-color)'),
                                        background: aktiv ? 'rgba(30,136,229,0.15)' : 'transparent',
                                        color: aktiv ? '#fff' : 'var(--text-secondary)',
                                        fontSize: '12px',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: '0.5px',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Stammdaten-Info (einmaliger Hinweis nach Migration) */}
                    {stammdatenInfo && stammdatenInfo.angelegt > 0 && (
                        <div style={{
                            padding: '10px 14px',
                            marginBottom: '12px',
                            background: 'rgba(39,174,96,0.1)',
                            border: '1px solid rgba(39,174,96,0.3)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            color: 'var(--success)'
                        }}>
                            ✓ {stammdatenInfo.angelegt} Mitarbeiter aus Grundstock in Firebase angelegt
                            {stammdatenInfo.vorhanden > 0 ? ', ' + stammdatenInfo.vorhanden + ' bereits vorhanden' : ''}.
                        </div>
                    )}

                    {/* Ladezustand */}
                    {laedt && (
                        <div style={{
                            textAlign: 'center',
                            padding: '32px 16px',
                            color: 'var(--text-muted)',
                            fontSize: '13px'
                        }}>
                            ⏳ Mitarbeiter werden geladen...
                        </div>
                    )}

                    {/* Leere Liste */}
                    {!laedt && gefiltert.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 16px',
                            color: 'var(--text-muted)',
                            fontSize: '13px'
                        }}>
                            <div style={{ fontSize: '38px', marginBottom: '10px' }}>👥</div>
                            {suche ? 'Keine Treffer fuer "' + suche + '"' : 'Keine Mitarbeiter im Filter "' + filter + '"'}
                        </div>
                    )}

                    {/* MA-Liste (gestapelte Karten) */}
                    {!laedt && gefiltert.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {gefiltert.map(function(m) {
                                var dringendCount = dringendCounts[m.id] || 0;
                                var status = m.status || 'aktiv';
                                var ausgeschieden = status === 'ausgeschieden';
                                return (
                                    <button
                                        key={m.id}
                                        onClick={function(){ onSelectMa(m); }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '14px',
                                            padding: '14px 16px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-card)',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s',
                                            touchAction: 'manipulation',
                                            opacity: ausgeschieden ? 0.6 : 1,
                                            position: 'relative'
                                        }}
                                    >
                                        {/* Avatar / Initialen */}
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '15px',
                                            fontWeight: 700,
                                            fontFamily: "'Oswald', sans-serif",
                                            flexShrink: 0
                                        }}>
                                            {(m.name || '?').substring(0, 2).toUpperCase()}
                                        </div>

                                        {/* Name + Rolle + Sprache + Status */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '15px',
                                                fontWeight: 600,
                                                fontFamily: "'Oswald', sans-serif",
                                                letterSpacing: '0.4px',
                                                marginBottom: '3px'
                                            }}>
                                                {m.name}
                                            </div>
                                            <div style={{
                                                fontSize: '11.5px',
                                                color: 'var(--text-muted)',
                                                display: 'flex',
                                                gap: '10px',
                                                flexWrap: 'wrap'
                                            }}>
                                                <span>{m.rolle || 'Fliesenleger'}</span>
                                                <span>·</span>
                                                <span>{spracheBadge(m.sprache)}</span>
                                                {ausgeschieden && (
                                                    <React.Fragment>
                                                        <span>·</span>
                                                        <span style={{ color: 'var(--accent-orange)' }}>ausgeschieden</span>
                                                    </React.Fragment>
                                                )}
                                            </div>
                                        </div>

                                        {/* Pfeil rechts */}
                                        <span style={{
                                            fontSize: '20px',
                                            opacity: 0.5,
                                            color: 'var(--text-muted)'
                                        }}>→</span>

                                        {/* Dringend-Badge (nur Chat) */}
                                        {modus === 'chat' && dringendCount > 0 && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '6px',
                                                right: '6px',
                                                background: 'var(--accent-red)',
                                                color: '#fff',
                                                borderRadius: '10px',
                                                padding: '2px 8px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                fontFamily: "'Oswald', sans-serif",
                                                letterSpacing: '0.3px'
                                            }}>
                                                {dringendCount} neu
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer-Info: Kontext der gewaehlten Baustelle */}
                    {baustelle && (
                        <div style={{
                            marginTop: '20px',
                            fontSize: '10.5px',
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                            opacity: 0.7,
                            fontFamily: "'Source Sans 3', sans-serif"
                        }}>
                            Kontext: Baustelle "{baustelle.name}" — Kalender und Chat sind baustellen-uebergreifend pro Mitarbeiter.
                        </div>
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // NACHRICHTEN-MA-DETAIL (Etappe 4.1, Baustein 4 -- STUB)
        // ────────────────────────────────────────────────────────
        // Container-Komponente, die je nach modus den Kalender (Baustein 5)
        // oder den Chat (Baustein 6) eines Mitarbeiters anzeigt.
        // In Baustein 4 zeigt sie einen Platzhalter mit MA-Karte und Hinweis,
        // welcher Baustein die Detail-UI freischaltet.
        // ═══════════════════════════════════════════════════════
        function NachrichtenMaDetail({ ma, modus, baustelle, onBack }) {
            // ── Etappe 4.1, Baustein 5+6 ──
            // modus='kalender' -> echte Kalender-UI (Baustein 5)
            // modus='chat'     -> echte Chat-UI    (Baustein 6)
            if (modus === 'kalender') {
                return <MaKalenderJahresAnsicht
                    ma={ma}
                    baustelle={baustelle}
                    onBack={onBack}
                />;
            }
            if (modus === 'chat') {
                return <MaChatThread
                    ma={ma}
                    baustelle={baustelle}
                    onBack={onBack}
                />;
            }
            return <NachrichtenMaDetailStub
                ma={ma}
                modus={modus}
                baustelle={baustelle}
                onBack={onBack}
            />;
        }

        // ═══════════════════════════════════════════════════════
        // STUB-Container fuer Modi, die noch kein UI haben (z.B. Chat in
        // Baustein 4-5; wird in Baustein 6 ueberschrieben/ersetzt).
        // ═══════════════════════════════════════════════════════
        function NachrichtenMaDetailStub({ ma, modus, baustelle, onBack }) {
            var modusIcon  = modus === 'chat' ? '💬' : '📅';
            var modusLabel = modus === 'chat' ? 'Chat mit ' + ma.name : 'Kalender von ' + ma.name;
            var bausteinName = modus === 'chat' ? 'Baustein 6 (Chat-UI)' : 'Baustein 5 (Kalender-UI)';

            function spracheBadge(code) {
                var c = (code || 'de').toLowerCase();
                var flaggen = { de:'🇩🇪', en:'🇬🇧', ru:'🇷🇺', tr:'🇹🇷', cs:'🇨🇿', sk:'🇸🇰', es:'🇪🇸', pl:'🇵🇱' };
                return (flaggen[c] || '🏳️') + ' ' + c.toUpperCase();
            }

            return (
                <div className="page-container" style={{ padding: '16px', minHeight: '100vh' }}>
                    <UnterseitenHeader
                        icon={modusIcon}
                        titel={modusLabel}
                        untertitel={(ma.rolle || 'Fliesenleger') + ' · ' + spracheBadge(ma.sprache)}
                        onBack={onBack}
                    />

                    {/* MA-Visitenkarte */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '18px 20px',
                        marginBottom: '18px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            fontWeight: 700,
                            fontFamily: "'Oswald', sans-serif",
                            flexShrink: 0
                        }}>
                            {(ma.name || '?').substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: '17px',
                                fontWeight: 600,
                                fontFamily: "'Oswald', sans-serif",
                                letterSpacing: '0.5px',
                                marginBottom: '5px'
                            }}>
                                {ma.name}
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                gap: '10px',
                                flexWrap: 'wrap'
                            }}>
                                <span>{ma.rolle || 'Fliesenleger'}</span>
                                <span>·</span>
                                <span>{spracheBadge(ma.sprache)}</span>
                                <span>·</span>
                                <span>Status: {ma.status || 'aktiv'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stub-Info-Panel */}
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        background: 'rgba(30,136,229,0.06)',
                        border: '1px dashed rgba(30,136,229,0.3)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        <div style={{ fontSize: '52px', marginBottom: '14px' }}>{modusIcon}</div>
                        <div style={{
                            fontFamily: "'Oswald', sans-serif",
                            fontSize: '15px',
                            fontWeight: 600,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            color: 'var(--text-light)',
                            marginBottom: '10px'
                        }}>
                            {modusLabel}
                        </div>
                        <div style={{
                            fontSize: '13px',
                            color: 'var(--text-muted)',
                            lineHeight: 1.6,
                            maxWidth: '420px',
                            margin: '0 auto'
                        }}>
                            Die Detail-UI wird in <strong>{bausteinName}</strong> freigeschaltet.
                            Die Datenschicht (Firebase /{modus === 'chat' ? 'chats' : 'kalender'}/{ma.id}/) ist
                            seit Baustein 3 produktiv -- der naechste Schritt fuellt das visuelle Front-End.
                        </div>

                        {/* Diagnostik: zeigt, dass die Datenschicht erreichbar ist */}
                        {modus === 'kalender' && (
                            <KalenderDiagnostik maId={ma.id} />
                        )}
                        {modus === 'chat' && (
                            <ChatDiagnostik maId={ma.id} />
                        )}
                    </div>

                    {baustelle && (
                        <div style={{
                            marginTop: '20px',
                            fontSize: '10.5px',
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                            opacity: 0.7,
                            fontFamily: "'Source Sans 3', sans-serif"
                        }}>
                            Aufgerufen aus Baustelle "{baustelle.name}" -- Daten sind baustellen-uebergreifend.
                        </div>
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // KALENDER-UI (Etappe 4.1, Baustein 5)
        // ────────────────────────────────────────────────────────
        // 3-Jahres-Sicht (laufendes Jahr + 2 Folgejahre) mit Monats-Grid und
        // Tages-Modal. Andockstelle fuer FirebaseService.setKalenderEintrag /
        // subscribeKalenderJahr aus Baustein 3.
        //
        // Status-System:
        //   anwesend (gruen)  -- Pflichtfelder Stunden + Baustelle
        //   urlaub (gelb)
        //   krank (rot)
        //   frei (grau)       -- vorbelegt fuer Sa/So
        //
        // Ein Eintrag wird beim Speichern via setKalenderEintrag persistiert,
        // das gesamte Jahr wird via subscribeKalenderJahr live aktualisiert.
        // ═══════════════════════════════════════════════════════

        // ── Konstanten fuer Kalender-Rendering ──
        var KALENDER_WOCHENTAGE   = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
        var KALENDER_MONATSNAMEN  = ['Januar','Februar','Maerz','April','Mai','Juni',
                                     'Juli','August','September','Oktober','November','Dezember'];
        var KALENDER_MONATSKURZ   = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

        // ── Status-Definitionen (Single Source of Truth) ──
        var KALENDER_STATUS = {
            anwesend: { glyph: '✓', kurz: 'A',  farbe: '#27ae60', label: 'anwesend' },
            urlaub:   { glyph: 'U', kurz: 'U',  farbe: '#f39c12', label: 'Urlaub' },
            krank:    { glyph: 'K', kurz: 'K',  farbe: '#c41e1e', label: 'krank' },
            frei:     { glyph: '–', kurz: '–',  farbe: '#7a8a9e', label: 'frei' }
        };

        // ── Hilfsfunktionen Datums-Mathe ──
        function kalDatumZuString(d) {
            // Date -> 'YYYY-MM-DD' (lokal, NICHT UTC -- wichtig fuer Tagesgrenzen)
            var y = d.getFullYear();
            var m = String(d.getMonth() + 1).padStart(2, '0');
            var t = String(d.getDate()).padStart(2, '0');
            return y + '-' + m + '-' + t;
        }
        function kalIstWochenende(d) {
            var dow = d.getDay();   // 0=So, 6=Sa
            return dow === 0 || dow === 6;
        }
        function kalIstHeute(d) {
            var h = new Date();
            return d.getDate() === h.getDate()
                && d.getMonth() === h.getMonth()
                && d.getFullYear() === h.getFullYear();
        }
        function kalErsterWochentagDesMonats(jahr, monat) {
            // ISO-Wochentag (Mo=0 .. So=6) -- wir starten Wochen mit Montag
            var d = new Date(jahr, monat, 1);
            var jsDow = d.getDay();          // 0=So, 1=Mo, ..., 6=Sa
            return (jsDow + 6) % 7;          // 0=Mo, ..., 6=So
        }
        function kalTageImMonat(jahr, monat) {
            return new Date(jahr, monat + 1, 0).getDate();
        }
        function kalFormatTagesUeberschrift(d) {
            var wochentage = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
            return wochentage[d.getDay()] + ', ' + d.getDate() + '. ' +
                   KALENDER_MONATSNAMEN[d.getMonth()] + ' ' + d.getFullYear();
        }

        // ═══════════════════════════════════════════════════════
        // MA-KALENDER (3-Jahres-Sicht, Monats-Grid)
        // ═══════════════════════════════════════════════════════
        function MaKalenderJahresAnsicht({ ma, baustelle, onBack }) {
            var heute = new Date();
            const [aktivesJahr, setAktivesJahr]     = useState(heute.getFullYear());
            const [aktiverMonat, setAktiverMonat]   = useState(heute.getMonth());
            const [eintraege, setEintraege]         = useState({});  // { 'YYYY-MM-DD': eintrag }
            const [baustellenListe, setBaustellenListe] = useState([]); // [{name, id}, ...]
            const [aktiverTag, setAktiverTag]       = useState(null);   // 'YYYY-MM-DD' oder null
            const [laedt, setLaedt]                 = useState(true);

            var jahre = [heute.getFullYear(), heute.getFullYear() + 1, heute.getFullYear() + 2];

            // ── Live-Listener auf Kalender-Eintragungen des aktiven Jahres ──
            useEffect(function() {
                if (!window.FirebaseService || !window.FirebaseService.subscribeKalenderJahr) return function(){};
                setLaedt(true);
                var unsub = window.FirebaseService.subscribeKalenderJahr(ma.id, aktivesJahr, function(map) {
                    setEintraege(map || {});
                    setLaedt(false);
                });
                return unsub;
            }, [ma.id, aktivesJahr]);

            // ── Baustellen-Liste fuer Dropdown im Tages-Modal ──
            useEffect(function() {
                if (!window.GoogleDriveService || !window.GoogleDriveService.listKundenOrdner) return;
                window.GoogleDriveService.listKundenOrdner()
                    .then(function(liste) {
                        setBaustellenListe((liste || []).map(function(k) {
                            return { id: k.id, name: k.name };
                        }));
                    })
                    .catch(function(e) { console.warn('Baustellen-Liste:', e); });
            }, []);

            // ── Speicher-Handler ──
            async function handleTagSpeichern(datum, daten) {
                if (!window.FirebaseService || !window.FirebaseService.setKalenderEintrag) {
                    alert('Firebase nicht verbunden');
                    return;
                }
                try {
                    await window.FirebaseService.setKalenderEintrag(ma.id, datum, Object.assign({
                        eingetragen_von: 'buero'  // Master-App = Buero schreibt im Namen des MA
                    }, daten));
                    setAktiverTag(null);
                } catch(e) {
                    alert('Speichern fehlgeschlagen: ' + (e.message || e));
                }
            }
            async function handleTagLoeschen(datum) {
                if (!window.FirebaseService || !window.FirebaseService.deleteKalenderEintrag) return;
                if (!confirm('Eintrag fuer ' + datum + ' wirklich loeschen?')) return;
                try {
                    await window.FirebaseService.deleteKalenderEintrag(ma.id, datum);
                    setAktiverTag(null);
                } catch(e) {
                    alert('Loeschen fehlgeschlagen: ' + (e.message || e));
                }
            }

            function spracheBadge(code) {
                var c = (code || 'de').toLowerCase();
                var flaggen = { de:'🇩🇪', en:'🇬🇧', ru:'🇷🇺', tr:'🇹🇷', cs:'🇨🇿', sk:'🇸🇰', es:'🇪🇸', pl:'🇵🇱' };
                return (flaggen[c] || '🏳️') + ' ' + c.toUpperCase();
            }

            // ── Monats-Grid berechnen ──
            var ersterTagOffset = kalErsterWochentagDesMonats(aktivesJahr, aktiverMonat);
            var tageImMonat     = kalTageImMonat(aktivesJahr, aktiverMonat);
            var totalZellen     = Math.ceil((ersterTagOffset + tageImMonat) / 7) * 7;
            var zellen = [];
            for (var i = 0; i < totalZellen; i++) {
                var tagNum = i - ersterTagOffset + 1;
                if (tagNum < 1 || tagNum > tageImMonat) {
                    zellen.push({ leer: true, key: 'leer-' + i });
                } else {
                    var d = new Date(aktivesJahr, aktiverMonat, tagNum);
                    var datStr = kalDatumZuString(d);
                    zellen.push({
                        leer: false,
                        datum: datStr,
                        date: d,
                        tagNum: tagNum,
                        wochenende: kalIstWochenende(d),
                        heute: kalIstHeute(d),
                        eintrag: eintraege[datStr],
                        key: datStr
                    });
                }
            }

            // ── Statistik fuer aktiven Monat ──
            var statistik = { anwesend: 0, urlaub: 0, krank: 0, frei: 0 };
            zellen.forEach(function(z) {
                if (!z.leer && z.eintrag && z.eintrag.status) {
                    statistik[z.eintrag.status] = (statistik[z.eintrag.status] || 0) + 1;
                }
            });

            return (
                <div className="page-container" style={{ padding: '14px', minHeight: '100vh' }}>
                    <UnterseitenHeader
                        icon="📅"
                        titel={'Kalender ' + ma.name}
                        untertitel={(ma.rolle || 'Fliesenleger') + ' · ' + spracheBadge(ma.sprache)}
                        onBack={onBack}
                    />

                    {/* ── Jahres-Auswahl (3 Buttons) ── */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                        {jahre.map(function(j) {
                            var aktiv = j === aktivesJahr;
                            return (
                                <button
                                    key={j}
                                    onClick={function(){ setAktivesJahr(j); }}
                                    style={{
                                        flex: 1,
                                        padding: '9px 6px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid ' + (aktiv ? 'var(--accent-blue)' : 'var(--border-color)'),
                                        background: aktiv ? 'rgba(30,136,229,0.18)' : 'transparent',
                                        color: aktiv ? '#fff' : 'var(--text-secondary)',
                                        fontSize: '14px',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: '0.5px',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation'
                                    }}
                                >{j}</button>
                            );
                        })}
                    </div>

                    {/* ── Monats-Auswahl (12 Buttons + Heute) ── */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: '4px',
                        marginBottom: '10px'
                    }}>
                        {KALENDER_MONATSKURZ.map(function(m, idx) {
                            var aktiv = idx === aktiverMonat;
                            var istHeuteMonat = idx === heute.getMonth() && aktivesJahr === heute.getFullYear();
                            return (
                                <button
                                    key={m}
                                    onClick={function(){ setAktiverMonat(idx); }}
                                    style={{
                                        padding: '7px 2px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid ' + (aktiv ? 'var(--accent-blue)' : (istHeuteMonat ? 'rgba(30,136,229,0.4)' : 'var(--border-color)')),
                                        background: aktiv ? 'rgba(30,136,229,0.18)' : 'transparent',
                                        color: aktiv ? '#fff' : 'var(--text-secondary)',
                                        fontSize: '11.5px',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: '0.3px',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation'
                                    }}
                                >{m}</button>
                            );
                        })}
                    </div>

                    {/* ── Heute-Button (springt zurueck zum heutigen Tag) ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{
                            fontSize: '15px',
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            color: 'var(--text-light)'
                        }}>
                            {KALENDER_MONATSNAMEN[aktiverMonat]} {aktivesJahr}
                        </div>
                        <button
                            onClick={function(){
                                setAktivesJahr(heute.getFullYear());
                                setAktiverMonat(heute.getMonth());
                            }}
                            style={{
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                touchAction: 'manipulation'
                            }}
                        >Heute</button>
                    </div>

                    {/* ── Wochentag-Header ── */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '3px',
                        marginBottom: '4px'
                    }}>
                        {KALENDER_WOCHENTAGE.map(function(w, idx) {
                            return (
                                <div key={w} style={{
                                    textAlign: 'center',
                                    fontSize: '10.5px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    color: idx >= 5 ? 'var(--text-muted)' : 'var(--text-secondary)',
                                    letterSpacing: '0.3px',
                                    padding: '4px 0'
                                }}>{w}</div>
                            );
                        })}
                    </div>

                    {/* ── Monats-Grid (Tageszellen) ── */}
                    {laedt && (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            ⏳ Lade Eintragungen...
                        </div>
                    )}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '3px'
                    }}>
                        {zellen.map(function(z) {
                            if (z.leer) {
                                return <div key={z.key} style={{ minHeight: '48px' }}></div>;
                            }
                            var status = z.eintrag && z.eintrag.status ? z.eintrag.status : null;
                            // Wochenende ohne Eintrag = visuell als 'frei' (aber kein DB-Eintrag)
                            var defStatus = z.wochenende ? KALENDER_STATUS.frei : null;
                            var statusDef = status ? KALENDER_STATUS[status] : defStatus;
                            return (
                                <button
                                    key={z.key}
                                    onClick={function(){ setAktiverTag(z.datum); }}
                                    style={{
                                        minHeight: '48px',
                                        padding: '4px 2px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: z.heute
                                            ? '2px solid var(--accent-blue)'
                                            : '1px solid var(--border-color)',
                                        background: status
                                            ? statusDef.farbe + '22'  // Hex mit Alpha
                                            : (z.wochenende ? 'rgba(0,0,0,0.18)' : 'var(--bg-card)'),
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        touchAction: 'manipulation',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '1px',
                                        position: 'relative'
                                    }}
                                >
                                    <span style={{
                                        fontSize: '12.5px',
                                        fontWeight: z.heute ? 700 : 500,
                                        fontFamily: "'Oswald', sans-serif",
                                        color: z.heute ? 'var(--accent-blue)' : 'var(--text-light)'
                                    }}>{z.tagNum}</span>
                                    {statusDef && (
                                        <span style={{
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            color: statusDef.farbe,
                                            lineHeight: 1
                                        }}>{statusDef.glyph}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Statistik-Footer ── */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-around',
                        marginTop: '16px',
                        padding: '10px 8px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        {Object.keys(KALENDER_STATUS).map(function(s) {
                            var def = KALENDER_STATUS[s];
                            var anzahl = statistik[s] || 0;
                            return (
                                <div key={s} style={{ textAlign: 'center', flex: 1 }}>
                                    <div style={{
                                        fontSize: '18px',
                                        fontWeight: 700,
                                        color: def.farbe,
                                        fontFamily: "'Oswald', sans-serif"
                                    }}>{anzahl}</div>
                                    <div style={{
                                        fontSize: '9.5px',
                                        color: 'var(--text-muted)',
                                        fontFamily: "'Oswald', sans-serif",
                                        letterSpacing: '0.4px',
                                        textTransform: 'uppercase'
                                    }}>{def.label}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Legende ── */}
                    <div style={{
                        marginTop: '10px',
                        fontSize: '10.5px',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        opacity: 0.75,
                        lineHeight: 1.5
                    }}>
                        Tippen Sie auf einen Tag, um den Status zu setzen oder zu aendern.
                        Sa/So sind als "frei" voreingestellt.
                        {baustelle && (
                            <div style={{ marginTop: '4px' }}>
                                Aufgerufen aus Baustelle "{baustelle.name}"
                            </div>
                        )}
                    </div>

                    {/* ── Tages-Modal ── */}
                    {aktiverTag && (
                        <KalenderTagesModal
                            datum={aktiverTag}
                            ma={ma}
                            eintrag={eintraege[aktiverTag]}
                            baustellenListe={baustellenListe}
                            kontextBaustelle={baustelle}
                            onSchliessen={function(){ setAktiverTag(null); }}
                            onSpeichern={function(daten){ handleTagSpeichern(aktiverTag, daten); }}
                            onLoeschen={function(){ handleTagLoeschen(aktiverTag); }}
                        />
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // KALENDER-TAGES-MODAL (Etappe 4.1, Baustein 5)
        // ────────────────────────────────────────────────────────
        // Bottom-Sheet-Style-Modal, das beim Tap auf einen Kalender-Tag
        // erscheint. Felder gemaess Skill 4.1 Abschnitt 5.4.3:
        //   Status (Pflicht), Stunden (nur bei "anwesend"), Baustelle (nur bei
        //   "anwesend"), Sonderheiten (Freitext, optional).
        // Audio-Diktat ist in Baustein 5 noch NICHT enthalten -- kommt spaeter.
        // ═══════════════════════════════════════════════════════
        function KalenderTagesModal({ datum, ma, eintrag, baustellenListe, kontextBaustelle,
                                      onSchliessen, onSpeichern, onLoeschen }) {
            var existierend = !!eintrag;
            var dateObj = new Date(datum + 'T12:00:00');  // Mittag, um Zeitzonen-Sprung zu vermeiden
            var defStatus = eintrag && eintrag.status
                ? eintrag.status
                : (kalIstWochenende(dateObj) ? 'frei' : 'anwesend');

            const [status, setStatus]               = useState(defStatus);
            const [stunden, setStunden]             = useState(
                eintrag && eintrag.stunden != null ? String(eintrag.stunden).replace('.', ',') : ''
            );
            const [baustelleId, setBaustelleId]     = useState(
                eintrag && eintrag.baustelle_id ? eintrag.baustelle_id
                : (kontextBaustelle ? kontextBaustelle.id : '')
            );
            const [sonderheiten, setSonderheiten]   = useState(
                eintrag && eintrag.sonderheiten ? eintrag.sonderheiten : ''
            );
            const [busy, setBusy]                   = useState(false);

            function handleSpeichern() {
                // Validierung
                if (!status) { alert('Bitte Status waehlen.'); return; }
                if (status === 'anwesend') {
                    if (!stunden || stunden.trim() === '') {
                        alert('Bitte Stundenzahl eintragen.'); return;
                    }
                }
                // Stunden parsen (Komma oder Punkt)
                var stundenZahl = null;
                if (status === 'anwesend' && stunden) {
                    var bereinigt = stunden.replace(',', '.').replace(/[^0-9.]/g, '');
                    stundenZahl = parseFloat(bereinigt);
                    if (isNaN(stundenZahl) || stundenZahl < 0 || stundenZahl > 24) {
                        alert('Stundenzahl muss zwischen 0 und 24 liegen.'); return;
                    }
                }
                var daten = {
                    status: status,
                    stunden: stundenZahl,
                    baustelle_id: status === 'anwesend' ? (baustelleId || '') : '',
                    sonderheiten: (sonderheiten || '').trim()
                };
                setBusy(true);
                Promise.resolve(onSpeichern(daten)).finally(function(){ setBusy(false); });
            }

            return (
                <div
                    onClick={busy ? undefined : onSchliessen}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                        padding: '0'
                    }}>
                    <div
                        onClick={function(e){ e.stopPropagation(); }}
                        style={{
                            width: '100%',
                            maxWidth: '500px',
                            background: 'var(--bg-primary)',
                            borderTop: '2px solid var(--accent-blue)',
                            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                            boxShadow: '0 -8px 30px rgba(0,0,0,0.5)',
                            padding: '20px',
                            maxHeight: '92vh',
                            overflowY: 'auto'
                        }}>
                        {/* Modal-Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '16px'
                        }}>
                            <div>
                                <div style={{
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: '17px',
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    color: 'var(--text-light)'
                                }}>{kalFormatTagesUeberschrift(dateObj)}</div>
                                <div style={{
                                    fontSize: '11.5px',
                                    color: 'var(--text-muted)',
                                    marginTop: '2px'
                                }}>{ma.name} · {existierend ? 'Bestehender Eintrag' : 'Neuer Eintrag'}</div>
                            </div>
                            <button
                                onClick={onSchliessen}
                                disabled={busy}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '24px',
                                    cursor: busy ? 'not-allowed' : 'pointer',
                                    padding: '0 6px'
                                }}>×</button>
                        </div>

                        {/* Status-Auswahl (Buttons statt Radios -- besser tappbar) */}
                        <div style={{ marginBottom: '14px' }}>
                            <div style={{
                                fontSize: '11px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '0.6px',
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary)',
                                marginBottom: '6px'
                            }}>Status</div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '6px'
                            }}>
                                {Object.keys(KALENDER_STATUS).map(function(s) {
                                    var def = KALENDER_STATUS[s];
                                    var aktiv = status === s;
                                    return (
                                        <button
                                            key={s}
                                            onClick={function(){ setStatus(s); }}
                                            style={{
                                                padding: '12px 4px',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '2px solid ' + (aktiv ? def.farbe : 'var(--border-color)'),
                                                background: aktiv ? def.farbe + '22' : 'var(--bg-card)',
                                                color: aktiv ? def.farbe : 'var(--text-secondary)',
                                                fontSize: '12px',
                                                fontFamily: "'Oswald', sans-serif",
                                                fontWeight: 600,
                                                letterSpacing: '0.4px',
                                                cursor: 'pointer',
                                                touchAction: 'manipulation',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <span style={{ fontSize: '18px', fontWeight: 700 }}>{def.glyph}</span>
                                            {def.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Stunden + Baustelle (nur bei anwesend) */}
                        {status === 'anwesend' && (
                            <React.Fragment>
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{
                                        fontSize: '11px',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: '0.6px',
                                        textTransform: 'uppercase',
                                        color: 'var(--text-secondary)',
                                        marginBottom: '6px'
                                    }}>Stunden</div>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="z.B. 8,5"
                                        value={stunden}
                                        onChange={function(e){ setStunden(e.target.value); }}
                                        style={{
                                            width: '100%',
                                            padding: '11px 14px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '15px',
                                            fontFamily: "'Source Sans 3', sans-serif",
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{
                                        fontSize: '11px',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: '0.6px',
                                        textTransform: 'uppercase',
                                        color: 'var(--text-secondary)',
                                        marginBottom: '6px'
                                    }}>Baustelle</div>
                                    <select
                                        value={baustelleId}
                                        onChange={function(e){ setBaustelleId(e.target.value); }}
                                        style={{
                                            width: '100%',
                                            padding: '11px 14px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            fontFamily: "'Source Sans 3', sans-serif",
                                            boxSizing: 'border-box'
                                        }}>
                                        <option value="">— Keine Baustelle ausgewaehlt —</option>
                                        {baustellenListe.map(function(b) {
                                            return <option key={b.id} value={b.id}>{b.name}</option>;
                                        })}
                                    </select>
                                </div>
                            </React.Fragment>
                        )}

                        {/* Sonderheiten (immer sichtbar, optional) */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{
                                fontSize: '11px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '0.6px',
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary)',
                                marginBottom: '6px'
                            }}>Sonderheiten / Bemerkung (optional)</div>
                            <textarea
                                rows={3}
                                placeholder="z.B. Estrich war noch nicht trocken, Verzoegerung 1h"
                                value={sonderheiten}
                                onChange={function(e){ setSonderheiten(e.target.value); }}
                                style={{
                                    width: '100%',
                                    padding: '11px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    fontFamily: "'Source Sans 3', sans-serif",
                                    boxSizing: 'border-box',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        {/* Buttons: Loeschen (links, nur bei existierend) | Abbrechen | Speichern */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {existierend && (
                                <button
                                    onClick={onLoeschen}
                                    disabled={busy}
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid rgba(196,30,30,0.4)',
                                        background: 'transparent',
                                        color: 'var(--accent-red)',
                                        fontSize: '12px',
                                        fontFamily: "'Oswald', sans-serif",
                                        fontWeight: 600,
                                        letterSpacing: '0.5px',
                                        textTransform: 'uppercase',
                                        cursor: busy ? 'not-allowed' : 'pointer',
                                        touchAction: 'manipulation'
                                    }}
                                >🗑 Loeschen</button>
                            )}
                            <button
                                onClick={onSchliessen}
                                disabled={busy}
                                style={{
                                    flex: existierend ? 1 : 1,
                                    padding: '12px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    fontSize: '13px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase',
                                    cursor: busy ? 'not-allowed' : 'pointer',
                                    touchAction: 'manipulation'
                                }}>Abbrechen</button>
                            <button
                                onClick={handleSpeichern}
                                disabled={busy}
                                style={{
                                    flex: 2,
                                    padding: '12px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    background: busy
                                        ? 'var(--bg-secondary)'
                                        : 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    letterSpacing: '0.7px',
                                    textTransform: 'uppercase',
                                    cursor: busy ? 'not-allowed' : 'pointer',
                                    boxShadow: busy ? 'none' : '0 4px 14px rgba(30,136,229,0.30)',
                                    touchAction: 'manipulation'
                                }}>{busy ? '⏳...' : 'Speichern'}</button>
                        </div>
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // CHAT-UI (Etappe 4.1, Baustein 6)
        // ────────────────────────────────────────────────────────
        // WhatsApp-artiger Chat-Thread zwischen Buero und einem MA. Live ueber
        // FirebaseService.subscribeChat (aus Baustein 3). Nachrichten vom Buero
        // landen rechts (blau), MA-Nachrichten links (grau). Pro Nachricht wird
        // der Original-Text in der Sprache des Absenders angezeigt; bei MA-
        // Nachrichten erscheint zusaetzlich eine ausklappbare deutsche
        // Uebersetzung (sofern text_uebersetzt.de von der Cloud Function
        // gefuellt wurde -- ist aktuell ein Stub).
        //
        // Senden-Modi:
        //   Standard: blauer Button "Senden"
        //   Dringend: roter Button mit 🔔, setzt dringend:true im Firebase-
        //             Eintrag. Loest auf MA-Handy ein Push-Signal aus
        //             (FCM-Cloud-Function -- nicht Teil dieser App).
        //
        // Beim Oeffnen werden alle ungelesenen Nachrichten VOM MA automatisch
        // als gelesen markiert (Buero hat sie ja gerade gesehen).
        // ═══════════════════════════════════════════════════════

        function MaChatThread({ ma, baustelle, onBack }) {
            const [nachrichten, setNachrichten]   = useState([]);
            const [eingabe, setEingabe]           = useState('');
            const [busy, setBusy]                 = useState(false);
            const [zeigeOriginal, setZeigeOriginal] = useState({});  // { nachrichtId: bool }
            const scrollRef = React.useRef(null);

            function spracheBadge(code) {
                var c = (code || 'de').toLowerCase();
                var flaggen = { de:'🇩🇪', en:'🇬🇧', ru:'🇷🇺', tr:'🇹🇷', cs:'🇨🇿', sk:'🇸🇰', es:'🇪🇸', pl:'🇵🇱' };
                return (flaggen[c] || '🏳️') + ' ' + c.toUpperCase();
            }

            // ── Live-Listener auf den Chat-Verlauf ──
            useEffect(function() {
                if (!window.FirebaseService || !window.FirebaseService.subscribeChat) return function(){};
                var unsub = window.FirebaseService.subscribeChat(ma.id, function(liste) {
                    setNachrichten(liste);
                    // Auto-Markierung: alle vom MA gesendeten, noch nicht gelesenen Nachrichten
                    // werden hier (Buero) sofort als gelesen markiert (fire-and-forget).
                    liste.forEach(function(n) {
                        if (n.von === 'ma' && !n.gelesen && window.FirebaseService.markiereChatAlsGelesen) {
                            window.FirebaseService.markiereChatAlsGelesen(ma.id, n.id)
                                .catch(function(e){ console.warn('Markieren als gelesen:', e); });
                        }
                    });
                });
                return unsub;
            }, [ma.id]);

            // ── Auto-Scroll zum Ende, wenn neue Nachricht eintrifft ──
            useEffect(function() {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, [nachrichten.length]);

            // ── Senden-Handler (Standard oder Dringend) ──
            async function handleSenden(dringend) {
                var text = (eingabe || '').trim();
                if (!text) return;
                if (!window.FirebaseService || !window.FirebaseService.sendChatNachricht) {
                    alert('Firebase nicht verbunden. Nachricht kann nicht gesendet werden.');
                    return;
                }
                setBusy(true);
                try {
                    await window.FirebaseService.sendChatNachricht(ma.id, {
                        von: 'buero',
                        absender_name: 'Thomas',
                        text_original: text,
                        sprache_original: 'de',
                        dringend: !!dringend
                    });
                    setEingabe('');
                } catch(e) {
                    alert('Senden fehlgeschlagen: ' + (e.message || e));
                } finally {
                    setBusy(false);
                }
            }

            // ── Datums-/Zeit-Formatierer fuer Nachrichten-Header ──
            function formatZeit(ts) {
                if (!ts) return '';
                var d = new Date(ts);
                return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
            }
            function formatDatumKurz(ts) {
                if (!ts) return '';
                var d = new Date(ts);
                var heute = new Date();
                var gestern = new Date(); gestern.setDate(gestern.getDate() - 1);
                var istHeute   = d.toDateString() === heute.toDateString();
                var istGestern = d.toDateString() === gestern.toDateString();
                if (istHeute) return 'Heute';
                if (istGestern) return 'Gestern';
                return d.getDate() + '. ' + KALENDER_MONATSNAMEN[d.getMonth()] + ' ' + d.getFullYear();
            }

            // ── Datums-Trenner einfuegen (z.B. "Heute", "Gestern", "12. Mai 2026") ──
            function gruppiereNachDatum(liste) {
                var ergebnis = [];
                var letztesDatum = null;
                liste.forEach(function(n) {
                    if (!n.timestamp) return;
                    var d = new Date(n.timestamp);
                    var datStr = d.toDateString();
                    if (datStr !== letztesDatum) {
                        ergebnis.push({ trenner: true, label: formatDatumKurz(n.timestamp), key: 'tr-' + datStr });
                        letztesDatum = datStr;
                    }
                    ergebnis.push({ trenner: false, nachricht: n, key: n.id });
                });
                return ergebnis;
            }

            var elemente = gruppiereNachDatum(nachrichten);

            return (
                <div className="page-container" style={{
                    padding: '14px',
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <UnterseitenHeader
                        icon="💬"
                        titel={'Chat mit ' + ma.name}
                        untertitel={(ma.rolle || 'Fliesenleger') + ' · ' + spracheBadge(ma.sprache)}
                        onBack={onBack}
                    />

                    {/* ── MA-Visitenkarte (kompakt) ── */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        marginBottom: '10px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: 700,
                            fontFamily: "'Oswald', sans-serif",
                            flexShrink: 0
                        }}>
                            {(ma.name || '?').substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                fontFamily: "'Oswald', sans-serif",
                                letterSpacing: '0.4px'
                            }}>{ma.name}</div>
                            <div style={{
                                fontSize: '10.5px',
                                color: 'var(--text-muted)'
                            }}>{ma.rolle || 'Fliesenleger'} · spricht {spracheBadge(ma.sprache)}</div>
                        </div>
                        <span style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            fontFamily: "'Oswald', sans-serif",
                            letterSpacing: '0.3px',
                            textTransform: 'uppercase'
                        }}>{nachrichten.length} Nachr.</span>
                    </div>

                    {/* ── Chat-Verlauf (scrollbar) ── */}
                    <div
                        ref={scrollRef}
                        style={{
                            flex: 1,
                            minHeight: '300px',
                            maxHeight: 'calc(100vh - 360px)',
                            overflowY: 'auto',
                            padding: '12px 6px',
                            background: 'rgba(0,0,0,0.15)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                        }}>
                        {/* Empty-State */}
                        {nachrichten.length === 0 && (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px 16px',
                                color: 'var(--text-muted)',
                                fontSize: '12.5px'
                            }}>
                                <div style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.6 }}>💬</div>
                                Noch keine Nachrichten in diesem Chat.
                                <br/>
                                Schreibe unten die erste Nachricht.
                            </div>
                        )}

                        {elemente.map(function(e) {
                            // ── Datums-Trenner ──
                            if (e.trenner) {
                                return (
                                    <div key={e.key} style={{
                                        textAlign: 'center',
                                        margin: '10px 0 4px',
                                        fontSize: '10px',
                                        color: 'var(--text-muted)',
                                        fontFamily: "'Oswald', sans-serif",
                                        letterSpacing: '0.6px',
                                        textTransform: 'uppercase',
                                        opacity: 0.75
                                    }}>
                                        <span style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            padding: '3px 12px',
                                            borderRadius: '10px'
                                        }}>{e.label}</span>
                                    </div>
                                );
                            }

                            // ── Nachricht-Blase ──
                            var n = e.nachricht;
                            var istBuero    = n.von === 'buero';
                            var istDringend = !!n.dringend;
                            var hatUebersetzung = !!(n.text_uebersetzt && n.text_uebersetzt.de);
                            var zeigt   = !!zeigeOriginal[n.id];
                            // Anzeige: bei Buero-Nachricht zeigt das Buero das DE-Original
                            //          bei MA-Nachricht zeigt das Buero die DE-Uebersetzung (falls vorhanden),
                            //                                            sonst das Original (in MA-Sprache)
                            var primaererText, sekundaererText;
                            if (istBuero) {
                                primaererText  = n.text_original;
                                sekundaererText = null;  // Buero schreibt DE -- keine Sekundaer-Anzeige noetig
                            } else {
                                if (hatUebersetzung) {
                                    primaererText  = zeigt ? n.text_original : n.text_uebersetzt.de;
                                    sekundaererText = zeigt ? n.text_uebersetzt.de : n.text_original;
                                } else {
                                    primaererText  = n.text_original;
                                    sekundaererText = null;
                                }
                            }

                            return (
                                <div key={e.key} style={{
                                    display: 'flex',
                                    justifyContent: istBuero ? 'flex-end' : 'flex-start',
                                    padding: '0 6px'
                                }}>
                                    <div style={{
                                        maxWidth: '78%',
                                        padding: '9px 13px',
                                        borderRadius: istBuero
                                            ? '14px 14px 4px 14px'
                                            : '14px 14px 14px 4px',
                                        background: istBuero
                                            ? 'linear-gradient(135deg, #1E88E5, #1565C0)'
                                            : 'var(--bg-card)',
                                        color: istBuero ? '#fff' : 'var(--text-primary)',
                                        border: istDringend
                                            ? '2px solid var(--accent-red)'
                                            : (istBuero ? '1px solid transparent' : '1px solid var(--border-color)'),
                                        boxShadow: istDringend
                                            ? '0 0 12px rgba(196,30,30,0.35)'
                                            : 'var(--shadow-sm)',
                                        position: 'relative'
                                    }}>
                                        {/* Dringend-Badge */}
                                        {istDringend && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '-9px',
                                                left: istBuero ? 'auto' : '8px',
                                                right: istBuero ? '8px' : 'auto',
                                                background: 'var(--accent-red)',
                                                color: '#fff',
                                                fontSize: '9px',
                                                fontWeight: 700,
                                                fontFamily: "'Oswald', sans-serif",
                                                letterSpacing: '0.4px',
                                                padding: '2px 7px',
                                                borderRadius: '8px',
                                                textTransform: 'uppercase'
                                            }}>🔔 Dringend</div>
                                        )}

                                        {/* Absender-Zeile (klein, oben) */}
                                        <div style={{
                                            fontSize: '10px',
                                            opacity: 0.75,
                                            marginBottom: '3px',
                                            fontFamily: "'Oswald', sans-serif",
                                            fontWeight: 600,
                                            letterSpacing: '0.3px'
                                        }}>
                                            {istBuero ? (n.absender_name || 'Buero') : (n.absender_name || ma.name)}
                                            {!istBuero && n.sprache_original && (
                                                <span style={{ marginLeft: '6px', opacity: 0.7 }}>
                                                    {spracheBadge(n.sprache_original)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Primaerer Text */}
                                        <div style={{
                                            fontSize: '13.5px',
                                            lineHeight: 1.5,
                                            wordBreak: 'break-word',
                                            whiteSpace: 'pre-wrap',
                                            fontFamily: "'Source Sans 3', sans-serif"
                                        }}>{primaererText}</div>

                                        {/* Toggle "Original anzeigen" -- nur bei MA-Nachrichten mit Uebersetzung */}
                                        {!istBuero && hatUebersetzung && (
                                            <button
                                                onClick={function(){
                                                    setZeigeOriginal(function(prev){
                                                        var n2 = Object.assign({}, prev);
                                                        n2[n.id] = !prev[n.id];
                                                        return n2;
                                                    });
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--accent-blue)',
                                                    fontSize: '10.5px',
                                                    cursor: 'pointer',
                                                    padding: '4px 0 0',
                                                    fontFamily: "'Oswald', sans-serif",
                                                    letterSpacing: '0.3px',
                                                    textDecoration: 'underline',
                                                    touchAction: 'manipulation'
                                                }}>
                                                {zeigt ? 'DE-Uebersetzung anzeigen' : 'Original anzeigen'}
                                            </button>
                                        )}

                                        {/* Sekundaerer Text (nur bei MA-Nachrichten, klein darunter) */}
                                        {sekundaererText && (
                                            <div style={{
                                                fontSize: '11px',
                                                opacity: 0.65,
                                                marginTop: '5px',
                                                fontStyle: 'italic',
                                                lineHeight: 1.4,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word'
                                            }}>{sekundaererText}</div>
                                        )}

                                        {/* Zeitstempel + Status */}
                                        <div style={{
                                            fontSize: '9.5px',
                                            opacity: 0.65,
                                            marginTop: '4px',
                                            textAlign: istBuero ? 'right' : 'left',
                                            fontFamily: "'Source Sans 3', sans-serif"
                                        }}>
                                            {formatZeit(n.timestamp)}
                                            {istBuero && (
                                                <span style={{ marginLeft: '4px' }}>
                                                    {n.gelesen ? '✓✓' : '✓'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Eingabe-Bereich ── */}
                    <div style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        <textarea
                            placeholder="Nachricht an Buero -> MA..."
                            value={eingabe}
                            onChange={function(e){ setEingabe(e.target.value); }}
                            disabled={busy}
                            rows={2}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                fontFamily: "'Source Sans 3', sans-serif",
                                boxSizing: 'border-box',
                                resize: 'vertical',
                                marginBottom: '8px'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={function(){ handleSenden(false); }}
                                disabled={busy || !eingabe.trim()}
                                style={{
                                    flex: 2,
                                    padding: '12px 14px',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    background: (busy || !eingabe.trim())
                                        ? 'var(--bg-secondary)'
                                        : 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    letterSpacing: '0.7px',
                                    textTransform: 'uppercase',
                                    cursor: (busy || !eingabe.trim()) ? 'not-allowed' : 'pointer',
                                    boxShadow: (busy || !eingabe.trim())
                                        ? 'none'
                                        : '0 4px 14px rgba(30,136,229,0.30)',
                                    touchAction: 'manipulation',
                                    opacity: (busy || !eingabe.trim()) ? 0.6 : 1
                                }}>
                                {busy ? '⏳ Sende...' : '➤ Senden'}
                            </button>
                            <button
                                onClick={function(){
                                    if (!eingabe.trim()) return;
                                    if (!confirm('Diese Nachricht als DRINGEND markieren?\nLoest auf MA-Handy ein Push-Signal aus.')) return;
                                    handleSenden(true);
                                }}
                                disabled={busy || !eingabe.trim()}
                                title="Dringend senden -- loest Push-Signal auf MA-Handy aus"
                                style={{
                                    flex: 1,
                                    padding: '12px 10px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '2px solid var(--accent-red)',
                                    background: (busy || !eingabe.trim()) ? 'transparent' : 'rgba(196,30,30,0.12)',
                                    color: 'var(--accent-red)',
                                    fontSize: '12px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 700,
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase',
                                    cursor: (busy || !eingabe.trim()) ? 'not-allowed' : 'pointer',
                                    touchAction: 'manipulation',
                                    opacity: (busy || !eingabe.trim()) ? 0.5 : 1
                                }}>
                                🔔 Dringend
                            </button>
                        </div>

                        {/* Hinweis-Footer */}
                        <div style={{
                            marginTop: '8px',
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            opacity: 0.7,
                            lineHeight: 1.4,
                            textAlign: 'center'
                        }}>
                            Uebersetzung in MA-Sprache erfolgt durch Cloud Function (Stub).
                            "Dringend" loest Push auf MA-Handy aus (FCM, Stub).
                        </div>
                    </div>
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // HAUPTKALENDER (Etappe 4.1, Baustein 7)
        // ────────────────────────────────────────────────────────
        // Buero-Aggregat: Matrix mit allen aktiven Mitarbeitern als Zeilen
        // und Tagen des aktuellen Monats als Spalten. Jede Zelle zeigt den
        // Status-Glyph aus /kalender/{maId}/{jahr}/{datum}/. Am unteren Rand
        // jeder Zelle erscheinen farbige Streifen fuer geplante Baustellen
        // (aus /baustellen_planung/, gefiltert nach mitarbeiter-Map).
        //
        // Klick auf eine Tageszelle oeffnet das KalenderTagesModal aus
        // Baustein 5 -- das Buero darf eintragen / aendern (Audit-Feld
        // eingetragen_von='buero'). Klick auf "+ Baustelle" oeffnet den
        // Planungs-Dialog (BaustellenPlanungDialog).
        //
        // Layout: Auf breitem Screen ist die ganze Matrix sichtbar; auf
        // schmalem Screen scrollt der Container horizontal. Die linke
        // MA-Spalte ist sticky (bleibt beim Scrollen sichtbar).
        // ═══════════════════════════════════════════════════════

        function HauptkalenderView({ onBack }) {
            var heute = new Date();
            const [aktivesJahr, setAktivesJahr]   = useState(heute.getFullYear());
            const [aktiverMonat, setAktiverMonat] = useState(heute.getMonth());
            const [mitarbeiter, setMitarbeiter]   = useState([]);
            const [alleKalender, setAlleKalender] = useState({});  // {maId: {jahr: {datum: eintrag}}}
            const [planungen, setPlanungen]       = useState([]);  // [{baustelle_id, zeitraum_id, von, bis, mitarbeiter, farbe}]
            const [baustellenListe, setBaustellenListe] = useState([]);
            const [modal, setModal]               = useState(null);          // {ma, datum} oder null
            const [planungDialogOffen, setPlanungDialogOffen] = useState(false);
            const [zellenLayer, setZellenLayer]   = useState(null);  // {date, planungen} fuer "+N weitere"-Layer

            // ── Live-Listener ──
            useEffect(function() {
                if (!window.FirebaseService) return function(){};
                var unsubs = [];
                if (window.FirebaseService.subscribeMitarbeiter) {
                    unsubs.push(window.FirebaseService.subscribeMitarbeiter(setMitarbeiter));
                }
                if (window.FirebaseService.subscribeAlleKalender) {
                    unsubs.push(window.FirebaseService.subscribeAlleKalender(setAlleKalender));
                }
                if (window.FirebaseService.subscribeBaustellenPlanungen) {
                    unsubs.push(window.FirebaseService.subscribeBaustellenPlanungen(setPlanungen));
                }
                // Stammdaten sicherstellen (falls Hauptkalender VOR dem Nachrichten-Modul aufgerufen wird)
                if (window.FirebaseService.ensureMitarbeiterStammdaten) {
                    window.FirebaseService.ensureMitarbeiterStammdaten()
                        .catch(function(e){ console.warn('ensureMitarbeiterStammdaten:', e); });
                }
                return function() { unsubs.forEach(function(u){ try { u(); } catch(e){} }); };
            }, []);

            // ── Baustellen-Liste fuer Dropdown ──
            useEffect(function() {
                if (!window.GoogleDriveService || !window.GoogleDriveService.listKundenOrdner) return;
                window.GoogleDriveService.listKundenOrdner()
                    .then(function(liste) {
                        setBaustellenListe((liste || []).map(function(k) {
                            return { id: k.id, name: k.name };
                        }));
                    })
                    .catch(function(e){ console.warn('Baustellen-Liste:', e); });
            }, []);

            // ── Aktive Mitarbeiter (gemerged mit Grundstock) ──
            function mergeMaListe(firebaseListe) {
                var grundstock = window.MITARBEITER_LISTE || [];
                var idMap = {};
                grundstock.forEach(function(g) {
                    if (g && g.id) {
                        idMap[g.id] = { id: g.id, name: g.name, rolle: g.rolle || 'Fliesenleger',
                                        sprache: 'de', status: 'aktiv' };
                    }
                });
                (firebaseListe || []).forEach(function(f) {
                    if (f && f.id) idMap[f.id] = Object.assign(idMap[f.id] || {}, f);
                });
                var arr = [];
                for (var k in idMap) {
                    if (idMap.hasOwnProperty(k) && idMap[k].status !== 'ausgeschieden') arr.push(idMap[k]);
                }
                arr.sort(function(a,b){ return (a.name || '').localeCompare(b.name || ''); });
                return arr;
            }
            var aktiveMa = mergeMaListe(mitarbeiter);

            // ── Tage des aktuellen Monats berechnen ──
            var anzahlTage = kalTageImMonat(aktivesJahr, aktiverMonat);
            var tage = [];
            for (var t = 1; t <= anzahlTage; t++) {
                var d = new Date(aktivesJahr, aktiverMonat, t);
                tage.push({
                    tag: t,
                    date: d,
                    datum: kalDatumZuString(d),
                    wochentag: KALENDER_WOCHENTAGE[(d.getDay() + 6) % 7],
                    wochenende: kalIstWochenende(d),
                    heute: kalIstHeute(d)
                });
            }

            // ── Helper: Eintrag fuer (ma, datum) holen ──
            function eintragFuer(maId, datum) {
                var jahr = datum.substring(0, 4);
                var maKal = alleKalender[maId];
                if (!maKal) return null;
                var jahrKal = maKal[jahr];
                if (!jahrKal) return null;
                // Meta-Knoten ueberspringen
                if (datum === '_meta') return null;
                return jahrKal[datum] || null;
            }

            // ── Helper: Aktive Planungen fuer (ma, datum) ──
            function planungenFuer(maId, datum) {
                var ts = new Date(datum + 'T12:00:00').getTime();
                return planungen.filter(function(p) {
                    if (!p.mitarbeiter || !p.mitarbeiter[maId]) return false;
                    return p.von <= ts && p.bis >= ts;
                });
            }

            // ── Helper: Konflikt erkennen (MA an einem Tag auf >1 Baustelle geplant) ──
            function konfliktFuer(maId, datum) {
                return planungenFuer(maId, datum).length > 1;
            }

            // ── Speicher-Handler fuer Tages-Modal ──
            async function handleTagSpeichern(maId, datum, daten) {
                if (!window.FirebaseService || !window.FirebaseService.setKalenderEintrag) {
                    alert('Firebase nicht verbunden'); return;
                }
                try {
                    await window.FirebaseService.setKalenderEintrag(maId, datum, Object.assign({
                        eingetragen_von: 'buero'
                    }, daten));
                    setModal(null);
                } catch(e) {
                    alert('Speichern fehlgeschlagen: ' + (e.message || e));
                }
            }
            async function handleTagLoeschen(maId, datum) {
                if (!window.FirebaseService || !window.FirebaseService.deleteKalenderEintrag) return;
                if (!confirm('Eintrag fuer ' + datum + ' wirklich loeschen?')) return;
                try {
                    await window.FirebaseService.deleteKalenderEintrag(maId, datum);
                    setModal(null);
                } catch(e) {
                    alert('Loeschen fehlgeschlagen: ' + (e.message || e));
                }
            }

            // ── Baustellen-Planung speichern ──
            async function handlePlanungSpeichern(daten) {
                if (!window.FirebaseService || !window.FirebaseService.addBaustellenPlanung) {
                    alert('Firebase nicht verbunden'); return;
                }
                try {
                    await window.FirebaseService.addBaustellenPlanung(daten.baustelleId, {
                        von: daten.von,
                        bis: daten.bis,
                        farbe: daten.farbe,
                        beschreibung: daten.beschreibung,
                        mitarbeiter: daten.mitarbeiter
                    });
                    setPlanungDialogOffen(false);
                } catch(e) {
                    alert('Planung speichern fehlgeschlagen: ' + (e.message || e));
                }
            }
            async function handlePlanungLoeschen(p) {
                if (!confirm('Planung "' + (p.beschreibung || 'ohne Bezeichnung') + '" loeschen?')) return;
                try {
                    await window.FirebaseService.deleteBaustellenPlanung(p.baustelle_id, p.zeitraum_id);
                } catch(e) {
                    alert('Loeschen fehlgeschlagen: ' + (e.message || e));
                }
            }

            // ── Layout-Konstanten ──
            var SPALTEN_BREITE = 38;   // px pro Tag
            var MA_SPALTE      = 110;  // px Breite linke Spalte
            var ZELLEN_HOEHE   = 56;   // px hoch genug fuer Status-Glyph + Bars

            return (
                <div className="page-container" style={{ padding: '14px', minHeight: '100vh' }}>
                    <UnterseitenHeader
                        icon="📅"
                        titel="Hauptkalender"
                        untertitel="Buero-Aggregat aller Mitarbeiter + Baustellen-Planung"
                        onBack={onBack}
                    />

                    {/* ── Toolbar: Monat-/Jahr-Auswahl + Heute + Planung ── */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        marginBottom: '12px'
                    }}>
                        <button
                            onClick={function(){
                                if (aktiverMonat === 0) {
                                    setAktiverMonat(11);
                                    setAktivesJahr(aktivesJahr - 1);
                                } else {
                                    setAktiverMonat(aktiverMonat - 1);
                                }
                            }}
                            style={{
                                padding: '8px 14px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                fontSize: '15px',
                                cursor: 'pointer',
                                touchAction: 'manipulation'
                            }}>◀</button>
                        <div style={{
                            flex: 1,
                            textAlign: 'center',
                            fontSize: '17px',
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 600,
                            letterSpacing: '0.7px',
                            color: 'var(--text-light)',
                            minWidth: '180px'
                        }}>
                            {KALENDER_MONATSNAMEN[aktiverMonat]} {aktivesJahr}
                        </div>
                        <button
                            onClick={function(){
                                if (aktiverMonat === 11) {
                                    setAktiverMonat(0);
                                    setAktivesJahr(aktivesJahr + 1);
                                } else {
                                    setAktiverMonat(aktiverMonat + 1);
                                }
                            }}
                            style={{
                                padding: '8px 14px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                fontSize: '15px',
                                cursor: 'pointer',
                                touchAction: 'manipulation'
                            }}>▶</button>
                        <button
                            onClick={function(){
                                setAktivesJahr(heute.getFullYear());
                                setAktiverMonat(heute.getMonth());
                            }}
                            style={{
                                padding: '8px 14px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                touchAction: 'manipulation'
                            }}>Heute</button>
                        <button
                            onClick={function(){ setPlanungDialogOffen(true); }}
                            style={{
                                padding: '9px 16px',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                background: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                color: '#fff',
                                fontSize: '12px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '0.7px',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(30,136,229,0.30)',
                                touchAction: 'manipulation'
                            }}>＋ Baustelle planen</button>
                    </div>

                    {/* ── Lade-Hinweis wenn keine MAs ── */}
                    {aktiveMa.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 16px',
                            color: 'var(--text-muted)',
                            fontSize: '13px'
                        }}>
                            <div style={{ fontSize: '38px', marginBottom: '10px' }}>👥</div>
                            Keine aktiven Mitarbeiter geladen.
                            <br/>
                            Pruefen Sie Firebase-Verbindung und Mitarbeiter-Liste.
                        </div>
                    )}

                    {/* ── Matrix-Container (horizontal scrollbar) ── */}
                    {aktiveMa.length > 0 && (
                        <div style={{
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            overflowX: 'auto',
                            overflowY: 'visible',
                            background: 'var(--bg-card)',
                            position: 'relative'
                        }}>
                            {/* Header-Zeile (Tage) */}
                            <div style={{
                                display: 'flex',
                                position: 'sticky',
                                top: 0,
                                background: 'var(--bg-secondary)',
                                borderBottom: '1px solid var(--border-color)',
                                zIndex: 2
                            }}>
                                {/* Linke Ecke (MA-Header) */}
                                <div style={{
                                    width: MA_SPALTE + 'px',
                                    minWidth: MA_SPALTE + 'px',
                                    flexShrink: 0,
                                    padding: '10px 8px',
                                    borderRight: '1px solid var(--border-color)',
                                    fontSize: '11px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-secondary)',
                                    position: 'sticky',
                                    left: 0,
                                    background: 'var(--bg-secondary)',
                                    zIndex: 3
                                }}>Mitarbeiter</div>

                                {/* Tag-Spalten */}
                                {tage.map(function(t) {
                                    return (
                                        <div key={'h-'+t.tag} style={{
                                            width: SPALTEN_BREITE + 'px',
                                            minWidth: SPALTEN_BREITE + 'px',
                                            flexShrink: 0,
                                            padding: '6px 0 4px',
                                            textAlign: 'center',
                                            borderRight: '1px solid rgba(0,0,0,0.15)',
                                            background: t.heute
                                                ? 'rgba(30,136,229,0.18)'
                                                : (t.wochenende ? 'rgba(0,0,0,0.18)' : 'transparent')
                                        }}>
                                            <div style={{
                                                fontSize: '9.5px',
                                                color: 'var(--text-muted)',
                                                fontFamily: "'Oswald', sans-serif",
                                                letterSpacing: '0.3px',
                                                lineHeight: 1
                                            }}>{t.wochentag}</div>
                                            <div style={{
                                                fontSize: '13px',
                                                fontWeight: t.heute ? 700 : 500,
                                                color: t.heute ? 'var(--accent-blue)' : 'var(--text-light)',
                                                fontFamily: "'Oswald', sans-serif",
                                                marginTop: '2px',
                                                lineHeight: 1
                                            }}>{t.tag}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* MA-Zeilen */}
                            {aktiveMa.map(function(ma) {
                                return (
                                    <div key={'r-'+ma.id} style={{
                                        display: 'flex',
                                        borderBottom: '1px solid rgba(0,0,0,0.15)'
                                    }}>
                                        {/* Linke MA-Spalte (sticky) */}
                                        <div style={{
                                            width: MA_SPALTE + 'px',
                                            minWidth: MA_SPALTE + 'px',
                                            flexShrink: 0,
                                            padding: '8px 10px',
                                            borderRight: '1px solid var(--border-color)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            position: 'sticky',
                                            left: 0,
                                            background: 'var(--bg-card)',
                                            zIndex: 1,
                                            minHeight: ZELLEN_HOEHE + 'px'
                                        }}>
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                                color: '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                fontFamily: "'Oswald', sans-serif",
                                                flexShrink: 0
                                            }}>{(ma.name || '?').substring(0, 2).toUpperCase()}</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    fontFamily: "'Oswald', sans-serif",
                                                    letterSpacing: '0.3px',
                                                    color: 'var(--text-light)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>{ma.name}</div>
                                                <div style={{
                                                    fontSize: '9.5px',
                                                    color: 'var(--text-muted)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>{ma.rolle || 'Fliesenleger'}</div>
                                            </div>
                                        </div>

                                        {/* Tag-Zellen */}
                                        {tage.map(function(t) {
                                            var eintrag    = eintragFuer(ma.id, t.datum);
                                            var maPlanungen = planungenFuer(ma.id, t.datum);
                                            var konflikt   = maPlanungen.length > 1;
                                            var status     = eintrag && eintrag.status ? eintrag.status : null;
                                            // Wochenende ohne Eintrag = visuell als 'frei'
                                            var defStatus  = t.wochenende ? KALENDER_STATUS.frei : null;
                                            var statusDef  = status ? KALENDER_STATUS[status] : defStatus;

                                            return (
                                                <button
                                                    key={'c-'+ma.id+'-'+t.tag}
                                                    onClick={function(){ setModal({ ma: ma, datum: t.datum }); }}
                                                    style={{
                                                        width: SPALTEN_BREITE + 'px',
                                                        minWidth: SPALTEN_BREITE + 'px',
                                                        flexShrink: 0,
                                                        minHeight: ZELLEN_HOEHE + 'px',
                                                        padding: '4px 2px 0',
                                                        border: 'none',
                                                        borderRight: '1px solid rgba(0,0,0,0.15)',
                                                        background: status
                                                            ? statusDef.farbe + '22'
                                                            : (t.heute
                                                                ? 'rgba(30,136,229,0.10)'
                                                                : (t.wochenende ? 'rgba(0,0,0,0.18)' : 'transparent')),
                                                        cursor: 'pointer',
                                                        touchAction: 'manipulation',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        position: 'relative'
                                                    }}
                                                    title={(eintrag && eintrag.sonderheiten) ? eintrag.sonderheiten : ''}
                                                >
                                                    {/* Status-Glyph oben */}
                                                    <span style={{
                                                        fontSize: '15px',
                                                        fontWeight: 700,
                                                        color: statusDef ? statusDef.farbe : 'var(--text-muted)',
                                                        lineHeight: 1
                                                    }}>{statusDef ? statusDef.glyph : '·'}</span>

                                                    {/* Stunden-Hinweis (kleiner) */}
                                                    {status === 'anwesend' && eintrag && eintrag.stunden && (
                                                        <span style={{
                                                            fontSize: '8.5px',
                                                            color: 'var(--text-muted)',
                                                            fontFamily: "'Oswald', sans-serif",
                                                            marginTop: '1px'
                                                        }}>{String(eintrag.stunden).replace('.', ',')}h</span>
                                                    )}

                                                    {/* Konflikt-Indikator */}
                                                    {konflikt && (
                                                        <span style={{
                                                            position: 'absolute',
                                                            top: '2px',
                                                            right: '2px',
                                                            fontSize: '10px',
                                                            color: 'var(--accent-red)'
                                                        }} title="Konflikt: mehrere Baustellen">⚠</span>
                                                    )}

                                                    {/* Baustellen-Bars unten (max 3) */}
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '1px',
                                                        width: '100%',
                                                        marginTop: 'auto',
                                                        paddingBottom: '2px'
                                                    }}>
                                                        {maPlanungen.slice(0, 3).map(function(p) {
                                                            return (
                                                                <div key={'b-'+p.zeitraum_id} style={{
                                                                    height: '3px',
                                                                    width: '100%',
                                                                    background: p.farbe || '#1E88E5',
                                                                    borderRadius: '1px'
                                                                }}></div>
                                                            );
                                                        })}
                                                        {maPlanungen.length > 3 && (
                                                            <div style={{
                                                                fontSize: '7.5px',
                                                                color: 'var(--text-muted)',
                                                                lineHeight: 1
                                                            }}>+{maPlanungen.length - 3}</div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Geplante Baustellen-Liste (unter der Matrix) ── */}
                    {planungen.length > 0 && (
                        <div style={{ marginTop: '14px' }}>
                            <div style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '12px',
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary)',
                                marginBottom: '6px'
                            }}>Geplante Baustellen-Zeitraeume</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {planungen.map(function(p) {
                                    var b = baustellenListe.find(function(bs){ return bs.id === p.baustelle_id; });
                                    var bezeichnung = (b ? b.name : 'Baustelle ' + p.baustelle_id);
                                    var maAnzahl = p.mitarbeiter ? Object.keys(p.mitarbeiter).filter(function(k){ return p.mitarbeiter[k]; }).length : 0;
                                    var von = new Date(p.von).toLocaleDateString('de-DE');
                                    var bis = new Date(p.bis).toLocaleDateString('de-DE');
                                    return (
                                        <div key={p.zeitraum_id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '8px 12px',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border-color)',
                                            fontSize: '12px'
                                        }}>
                                            <div style={{
                                                width: '12px', height: '12px',
                                                borderRadius: '3px',
                                                background: p.farbe || '#1E88E5',
                                                flexShrink: 0
                                            }}></div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-light)' }}>
                                                    {bezeichnung}
                                                    {p.beschreibung && (
                                                        <span style={{
                                                            fontWeight: 400,
                                                            color: 'var(--text-muted)',
                                                            marginLeft: '6px'
                                                        }}>— {p.beschreibung}</span>
                                                    )}
                                                </div>
                                                <div style={{
                                                    fontSize: '10.5px',
                                                    color: 'var(--text-muted)',
                                                    marginTop: '2px'
                                                }}>{von} – {bis} · {maAnzahl} MA</div>
                                            </div>
                                            <button
                                                onClick={function(){ handlePlanungLoeschen(p); }}
                                                title="Planung loeschen"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--accent-red)',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    padding: '4px 6px'
                                                }}>🗑</button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Legende ── */}
                    <div style={{
                        marginTop: '12px',
                        padding: '10px 12px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        lineHeight: 1.6
                    }}>
                        <strong style={{ color: 'var(--text-light)' }}>Legende:</strong>
                        {' '}<span style={{ color: KALENDER_STATUS.anwesend.farbe, fontWeight: 700 }}>✓</span> anwesend
                        {' · '}<span style={{ color: KALENDER_STATUS.urlaub.farbe, fontWeight: 700 }}>U</span> Urlaub
                        {' · '}<span style={{ color: KALENDER_STATUS.krank.farbe, fontWeight: 700 }}>K</span> krank
                        {' · '}<span style={{ color: KALENDER_STATUS.frei.farbe, fontWeight: 700 }}>–</span> frei
                        {' · '}<span style={{ color: 'var(--accent-red)' }}>⚠</span> Konflikt
                        {' · Farbige Streifen unten = geplante Baustelle. '}
                        Tippen Sie auf eine Tageszelle, um den Eintrag des MA zu aendern.
                    </div>

                    {/* ── Tages-Modal (wiederverwendet aus Baustein 5) ── */}
                    {modal && (
                        <KalenderTagesModal
                            datum={modal.datum}
                            ma={modal.ma}
                            eintrag={eintragFuer(modal.ma.id, modal.datum)}
                            baustellenListe={baustellenListe}
                            kontextBaustelle={null}
                            onSchliessen={function(){ setModal(null); }}
                            onSpeichern={function(daten){ handleTagSpeichern(modal.ma.id, modal.datum, daten); }}
                            onLoeschen={function(){ handleTagLoeschen(modal.ma.id, modal.datum); }}
                        />
                    )}

                    {/* ── Baustellen-Planung-Dialog ── */}
                    {planungDialogOffen && (
                        <BaustellenPlanungDialog
                            mitarbeiter={aktiveMa}
                            baustellenListe={baustellenListe}
                            standardJahr={aktivesJahr}
                            standardMonat={aktiverMonat}
                            onSchliessen={function(){ setPlanungDialogOffen(false); }}
                            onSpeichern={handlePlanungSpeichern}
                        />
                    )}
                </div>
            );
        }

        // ═══════════════════════════════════════════════════════
        // BAUSTELLEN-PLANUNG-DIALOG (Etappe 4.1, Baustein 7)
        // ────────────────────────────────────────────────────────
        // Dialog zum Anlegen einer neuen Baustellen-Planung. Felder:
        //   - Baustelle (Dropdown aus GoogleDrive-Kunden)
        //   - Zeitraum (von/bis als YYYY-MM-DD)
        //   - Beteiligte Mitarbeiter (Multi-Select)
        //   - Farbe (Picker mit 8 vordefinierten Farben)
        //   - Beschreibung (optional)
        // Speichern -> handlePlanungSpeichern -> FirebaseService.addBaustellenPlanung
        // ═══════════════════════════════════════════════════════

        var PLANUNG_FARBEN = [
            '#1E88E5', '#27ae60', '#e67e22', '#9b59b6',
            '#16a085', '#c41e1e', '#f39c12', '#7f8c8d'
        ];

        function BaustellenPlanungDialog({ mitarbeiter, baustellenListe, standardJahr, standardMonat,
                                            onSchliessen, onSpeichern }) {
            // Default-Zeitraum: erster bis zehnter Tag des aktiven Monats
            var defVon = new Date(standardJahr, standardMonat, 1);
            var defBis = new Date(standardJahr, standardMonat, 10);
            const [baustelleId, setBaustelleId]   = useState('');
            const [vonDatum, setVonDatum]         = useState(kalDatumZuString(defVon));
            const [bisDatum, setBisDatum]         = useState(kalDatumZuString(defBis));
            const [farbe, setFarbe]               = useState(PLANUNG_FARBEN[0]);
            const [beschreibung, setBeschreibung] = useState('');
            const [maGewaehlt, setMaGewaehlt]     = useState({});  // {maId: true}
            const [busy, setBusy]                 = useState(false);

            function toggleMa(id) {
                setMaGewaehlt(function(prev) {
                    var next = Object.assign({}, prev);
                    if (next[id]) delete next[id]; else next[id] = true;
                    return next;
                });
            }
            function alleAuswaehlen() {
                var alle = {};
                mitarbeiter.forEach(function(m){ alle[m.id] = true; });
                setMaGewaehlt(alle);
            }
            function keineAuswaehlen() { setMaGewaehlt({}); }

            function handleSpeichern() {
                if (!baustelleId) { alert('Bitte Baustelle waehlen.'); return; }
                if (!vonDatum || !bisDatum) { alert('Bitte Zeitraum eintragen.'); return; }
                if (!/^\d{4}-\d{2}-\d{2}$/.test(vonDatum)) { alert('Von-Datum: YYYY-MM-DD'); return; }
                if (!/^\d{4}-\d{2}-\d{2}$/.test(bisDatum)) { alert('Bis-Datum: YYYY-MM-DD'); return; }
                var vonTs = new Date(vonDatum + 'T00:00:00').getTime();
                var bisTs = new Date(bisDatum + 'T23:59:59').getTime();
                if (bisTs < vonTs) { alert('Bis-Datum darf nicht vor Von-Datum liegen.'); return; }
                var maList = Object.keys(maGewaehlt).filter(function(k){ return maGewaehlt[k]; });
                if (maList.length === 0) { alert('Bitte mindestens 1 Mitarbeiter waehlen.'); return; }
                setBusy(true);
                Promise.resolve(onSpeichern({
                    baustelleId: baustelleId,
                    von: vonTs,
                    bis: bisTs,
                    farbe: farbe,
                    beschreibung: (beschreibung || '').trim(),
                    mitarbeiter: maList
                })).finally(function(){ setBusy(false); });
            }

            return (
                <div
                    onClick={busy ? undefined : onSchliessen}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '16px'
                    }}>
                    <div
                        onClick={function(e){ e.stopPropagation(); }}
                        style={{
                            width: '100%',
                            maxWidth: '520px',
                            maxHeight: '92vh',
                            overflowY: 'auto',
                            background: 'var(--bg-primary)',
                            border: '2px solid var(--accent-blue)',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                            padding: '20px'
                        }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '18px'
                        }}>
                            <div style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: '17px',
                                fontWeight: 600,
                                letterSpacing: '0.7px',
                                textTransform: 'uppercase',
                                color: 'var(--text-light)'
                            }}>＋ Baustelle planen</div>
                            <button onClick={onSchliessen} disabled={busy} style={{
                                background: 'none', border: 'none', color: 'var(--text-muted)',
                                fontSize: '24px', cursor: busy ? 'not-allowed' : 'pointer', padding: '0 6px'
                            }}>×</button>
                        </div>

                        {/* Baustelle */}
                        <div style={{ marginBottom: '14px' }}>
                            <div style={{
                                fontSize: '11px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary)',
                                marginBottom: '6px'
                            }}>Baustelle</div>
                            <select
                                value={baustelleId}
                                onChange={function(e){ setBaustelleId(e.target.value); }}
                                style={{
                                    width: '100%',
                                    padding: '11px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    boxSizing: 'border-box'
                                }}>
                                <option value="">— Baustelle waehlen —</option>
                                {baustellenListe.map(function(b) {
                                    return <option key={b.id} value={b.id}>{b.name}</option>;
                                })}
                            </select>
                        </div>

                        {/* Zeitraum */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: '11px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '6px'
                                }}>Von</div>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="YYYY-MM-DD"
                                    value={vonDatum}
                                    onChange={function(e){ setVonDatum(e.target.value); }}
                                    style={{
                                        width: '100%',
                                        padding: '11px 14px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '14px',
                                        fontFamily: 'monospace',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: '11px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '6px'
                                }}>Bis (inklusiv)</div>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="YYYY-MM-DD"
                                    value={bisDatum}
                                    onChange={function(e){ setBisDatum(e.target.value); }}
                                    style={{
                                        width: '100%',
                                        padding: '11px 14px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '14px',
                                        fontFamily: 'monospace',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Farb-Auswahl */}
                        <div style={{ marginBottom: '14px' }}>
                            <div style={{
                                fontSize: '11px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary)',
                                marginBottom: '6px'
                            }}>Farbe</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {PLANUNG_FARBEN.map(function(f) {
                                    var aktiv = farbe === f;
                                    return (
                                        <button
                                            key={f}
                                            onClick={function(){ setFarbe(f); }}
                                            title={f}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                border: aktiv ? '3px solid #fff' : '1px solid var(--border-color)',
                                                background: f,
                                                cursor: 'pointer',
                                                touchAction: 'manipulation',
                                                boxShadow: aktiv ? '0 0 0 2px ' + f : 'none'
                                            }}></button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Mitarbeiter-Auswahl */}
                        <div style={{ marginBottom: '14px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '6px'
                            }}>
                                <div style={{
                                    fontSize: '11px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-secondary)'
                                }}>Mitarbeiter ({Object.keys(maGewaehlt).filter(function(k){return maGewaehlt[k];}).length})</div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={alleAuswaehlen} style={{
                                        padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-color)', background: 'transparent',
                                        color: 'var(--text-muted)', fontSize: '10px',
                                        fontFamily: "'Oswald', sans-serif", letterSpacing: '0.3px',
                                        textTransform: 'uppercase', cursor: 'pointer'
                                    }}>Alle</button>
                                    <button onClick={keineAuswaehlen} style={{
                                        padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-color)', background: 'transparent',
                                        color: 'var(--text-muted)', fontSize: '10px',
                                        fontFamily: "'Oswald', sans-serif", letterSpacing: '0.3px',
                                        textTransform: 'uppercase', cursor: 'pointer'
                                    }}>Keine</button>
                                </div>
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '5px',
                                maxHeight: '160px',
                                overflowY: 'auto',
                                padding: '6px',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-secondary)'
                            }}>
                                {mitarbeiter.map(function(m) {
                                    var aktiv = !!maGewaehlt[m.id];
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={function(){ toggleMa(m.id); }}
                                            style={{
                                                padding: '7px 10px',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid ' + (aktiv ? 'var(--accent-blue)' : 'var(--border-color)'),
                                                background: aktiv ? 'rgba(30,136,229,0.20)' : 'var(--bg-card)',
                                                color: aktiv ? '#fff' : 'var(--text-secondary)',
                                                fontSize: '11.5px',
                                                fontFamily: "'Oswald', sans-serif",
                                                fontWeight: 600,
                                                letterSpacing: '0.3px',
                                                cursor: 'pointer',
                                                touchAction: 'manipulation',
                                                textAlign: 'left',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                            <span style={{
                                                width: '14px', height: '14px',
                                                borderRadius: '3px',
                                                border: '1px solid ' + (aktiv ? 'var(--accent-blue)' : 'var(--border-color)'),
                                                background: aktiv ? 'var(--accent-blue)' : 'transparent',
                                                color: '#fff',
                                                fontSize: '10px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>{aktiv ? '✓' : ''}</span>
                                            {m.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Beschreibung */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{
                                fontSize: '11px',
                                fontFamily: "'Oswald', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary)',
                                marginBottom: '6px'
                            }}>Beschreibung (optional)</div>
                            <input
                                type="text"
                                placeholder="z.B. Phase 1 Rohbau, Fliesen Bad EG"
                                value={beschreibung}
                                onChange={function(e){ setBeschreibung(e.target.value); }}
                                style={{
                                    width: '100%',
                                    padding: '11px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={onSchliessen}
                                disabled={busy}
                                style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    fontSize: '13px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase',
                                    cursor: busy ? 'not-allowed' : 'pointer',
                                    touchAction: 'manipulation'
                                }}>Abbrechen</button>
                            <button
                                onClick={handleSpeichern}
                                disabled={busy}
                                style={{
                                    flex: 2,
                                    padding: '12px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    background: busy ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #1E88E5, #1565C0)',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontFamily: "'Oswald', sans-serif",
                                    fontWeight: 600,
                                    letterSpacing: '0.7px',
                                    textTransform: 'uppercase',
                                    cursor: busy ? 'not-allowed' : 'pointer',
                                    boxShadow: busy ? 'none' : '0 4px 14px rgba(30,136,229,0.30)',
                                    touchAction: 'manipulation'
                                }}>{busy ? '⏳ Speichere...' : 'Planung speichern'}</button>
                        </div>
                    </div>
                </div>
            );
        }

        // ── Diagnostik-Komponenten (zeigen, dass Baustein-3-API erreichbar ist) ──
        function KalenderDiagnostik({ maId }) {
            const [info, setInfo] = useState({ loading: true });
            useEffect(function() {
                if (!window.FirebaseService || !window.FirebaseService.loadKalenderJahr) return;
                var jahr = new Date().getFullYear();
                window.FirebaseService.loadKalenderJahr(maId, jahr)
                    .then(function(map) {
                        var anzahl = Object.keys(map).length;
                        setInfo({ loading: false, jahr: jahr, eintraege: anzahl });
                    })
                    .catch(function(e) { setInfo({ loading: false, fehler: e.message }); });
            }, [maId]);
            return (
                <div style={{
                    marginTop: '20px',
                    padding: '10px 14px',
                    background: 'rgba(0,0,0,0.15)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                    textAlign: 'left',
                    maxWidth: '420px',
                    margin: '20px auto 0'
                }}>
                    <strong>Datenschicht-Diagnostik:</strong><br/>
                    {info.loading && '⏳ Lade Kalender ' + new Date().getFullYear() + '...'}
                    {info.fehler && '❌ ' + info.fehler}
                    {info.eintraege !== undefined && (
                        '✓ Knoten /kalender/' + maId + '/' + info.jahr + '/ erreichbar — ' +
                        info.eintraege + ' Eintraege'
                    )}
                </div>
            );
        }

        function ChatDiagnostik({ maId }) {
            const [info, setInfo] = useState({ loading: true });
            useEffect(function() {
                if (!window.FirebaseService || !window.FirebaseService.loadChat) return;
                window.FirebaseService.loadChat(maId, 5)
                    .then(function(liste) {
                        setInfo({ loading: false, anzahl: liste.length });
                    })
                    .catch(function(e) { setInfo({ loading: false, fehler: e.message }); });
            }, [maId]);
            return (
                <div style={{
                    marginTop: '20px',
                    padding: '10px 14px',
                    background: 'rgba(0,0,0,0.15)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                    textAlign: 'left',
                    maxWidth: '420px',
                    margin: '20px auto 0'
                }}>
                    <strong>Datenschicht-Diagnostik:</strong><br/>
                    {info.loading && '⏳ Lade Chat-Verlauf...'}
                    {info.fehler && '❌ ' + info.fehler}
                    {info.anzahl !== undefined && (
                        '✓ Knoten /chats/' + maId + '/ erreichbar — ' +
                        info.anzahl + ' Nachrichten gefunden'
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
                        titel={unterordner.uiName || unterordner.name}
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

                        {/* Gueltigkeits-Dauer */}
                        <div style={{ marginBottom:'14px' }}>
                            <label style={{
                                display:'block', fontSize:'11px', fontFamily:"'Oswald', sans-serif",
                                fontWeight:600, letterSpacing:'1px', textTransform:'uppercase',
                                color:'var(--text-muted)', marginBottom:'6px'
                            }}>Gueltig fuer (Tage)</label>
                            <div style={{ display:'flex', gap:'6px' }}>
                                {['1','3','7','14','30'].map(function(n) {
                                    var aktiv = gueltigTage === n;
                                    return (
                                        <button
                                            key={n}
                                            onClick={function(){ setGueltigTage(n); }}
                                            style={{
                                                flex:1, padding:'8px 0',
                                                background: aktiv ? 'linear-gradient(135deg, #1E88E5, #1565C0)' : 'var(--bg-secondary)',
                                                color: aktiv ? '#fff' : 'var(--text-primary)',
                                                border: '1px solid ' + (aktiv ? '#1565C0' : 'var(--border-color)'),
                                                borderRadius:'var(--radius-sm)',
                                                fontSize:'13px', fontWeight: aktiv ? 600 : 400,
                                                cursor:'pointer', touchAction:'manipulation'
                                            }}>{n}</button>
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

