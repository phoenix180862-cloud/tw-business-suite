        function BaustellenAppAdmin({ kunde, onBack }) {
            const [tab, setTab] = useState('kunde');
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
            const [published, setPublished] = useState(false);

            // ── Init Firebase on mount ──
            useEffect(function() {
                var s = window.FirebaseService.getStoredConfig();
                if (s && s.apiKey) {
                    var ok = window.FirebaseService.init(s);
                    if (ok) { setFbOk(true); doLogin(); }
                }
            }, []);

            // ── Echtzeit-Listener ──
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

            // ── Check ob aktueller Kunde bereits published ──
            useEffect(function() {
                if (!kunde || !projects.length) { setPublished(false); return; }
                var kid = kunde.id || kunde._driveFolderId || kunde.name;
                var found = projects.some(function(p) { return p.id === kid; });
                setPublished(found);
            }, [kunde, projects]);

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
                    if (ok) { setFbOk(true); addLog('Verbunden: ' + fbConfig.projectId); await doLogin(); setTab('kunde'); }
                    else { alert('Verbindung fehlgeschlagen -- Config prüfen.'); }
                } catch(e) { alert('Fehler: ' + e.message); }
                setBusy(false);
            }
            async function handleDisconnect() {
                if (!confirm('Firebase trennen?')) return;
                localStorage.removeItem('tw_firebase_config'); window.location.reload();
            }

            // ── KUNDE HOCHLADEN ──
            async function handlePublishKunde() {
                if (!kunde) return;
                setBusy(true);
                var kid = kunde.id || kunde._driveFolderId || kunde.name || 'kunde_' + Date.now();
                addLog('Veröffentliche: ' + (kunde.name || kid));
                try {
                    await window.FirebaseService.publishProject(kid, {
                        bauherr: kunde.auftraggeber || kunde.name || '',
                        name: kunde.name || '',
                        baustelle: kunde.name || '',
                        adresse: kunde.adresse || kunde._kundenDaten && kunde._kundenDaten.adresse || '',
                        planer: kunde._kundenDaten && kunde._kundenDaten.architekt || '',
                        bauleitung: kunde._kundenDaten && kunde._kundenDaten.bauleitung || ''
                    });
                    addLog('✅ Erfolgreich: ' + (kunde.name || kid));
                    setPublished(true);
                    await reload();
                } catch(e) { addLog('❌ Fehler: ' + e.message); alert('Fehler: ' + e.message); }
                setBusy(false);
            }
            async function handleUnpublishKunde() {
                if (!kunde) return;
                var kid = kunde.id || kunde._driveFolderId || kunde.name;
                if (!confirm('Baustelle "' + (kunde.name||'') + '" aus der App entfernen?')) return;
                setBusy(true);
                try {
                    await window.FirebaseService.unpublishProject(kid);
                    addLog('Entfernt: ' + kid); setPublished(false); await reload();
                } catch(e) { addLog('Fehler: ' + e.message); }
                setBusy(false);
            }
            async function handleApprove(uid, name) {
                await window.FirebaseService.approveUser(uid); addLog('✅ Freigegeben: ' + (name||uid.substring(0,8)));
            }
            async function handleReject(uid, name) {
                if (!confirm('"' + (name||'') + '" ablehnen?')) return;
                await window.FirebaseService.rejectUser(uid); addLog('❌ Abgelehnt: ' + (name||uid.substring(0,8)));
            }
            async function handleUnpublishProject(id) {
                if (!confirm('Projekt entfernen?')) return;
                await window.FirebaseService.unpublishProject(id); addLog('Entfernt: ' + id); await reload();
            }
            async function handleSync() {
                setBusy(true); addLog('Sync...'); await reload();
                addLog('Fertig -- ' + syncStatus.projects + ' Projekte, ' + syncStatus.users + ' User'); setBusy(false);
            }

            // ════════════════════════ RENDER ════════════════════════

            // ── OFFLINE: Config eingeben ──
            var offlineHint = (
                <div className="ba-offline-hint">
                    <div className="ba-offline-icon">{'\uD83D\uDD0C'}</div>
                    <div className="ba-offline-text">Firebase nicht verbunden</div>
                    <button className="ba-btn blu" onClick={function(){ setTab('config'); }}>→ Konfiguration</button>
                </div>
            );

            // ── TAB: Aktueller Kunde ──
            var kundeTab = !fbOk ? offlineHint : (
                <div>
                    {kunde ? (
                        <div>
                            <div className="ba-kunde-banner">
                                <div className="ba-kunde-icon">{'\uD83D\uDCC1'}</div>
                                <div className="ba-kunde-info">
                                    <div className="ba-kb-name">{kunde.name || 'Kunde'}</div>
                                    <div className="ba-kb-meta">
                                        {kunde.auftraggeber ? 'AG: ' + kunde.auftraggeber + ' · ' : ''}
                                        {kunde.dateien ? kunde.dateien + ' Dateien' : ''}
                                    </div>
                                </div>
                                {published
                                    ? <span className="ba-badge on"><span className="ba-dot on"></span> Live</span>
                                    : <span className="ba-badge off"><span className="ba-dot off"></span> Offline</span>
                                }
                            </div>
                            {!published ? (
                                <div className="ba-card">
                                    <div className="ba-card-title">🚀 An Baustellen-App senden</div>
                                    <p className="ba-card-desc">
                                        Kundendaten werden an Firebase {'\u00FC'}bertragen. Deine Mitarbeiter k{'\u00F6'}nnen
                                        diese Baustelle dann in der mobilen App sehen.
                                    </p>
                                    <button className="ba-btn grn" onClick={handlePublishKunde} disabled={busy}
                                        style={{width:'100%', padding:'14px', fontSize:'15px'}}>
                                        {busy ? '⏳ Wird hochgeladen...' : '📱 Jetzt hochladen'}
                                    </button>
                                </div>
                            ) : (
                                <div className="ba-card success-border">
                                    <div className="ba-card-title success-text">{'\u2705'} Baustelle ist live</div>
                                    <p className="ba-card-desc">
                                        Diese Baustelle ist für deine Mitarbeiter in der App sichtbar.
                                    </p>
                                    <button className="ba-btn out" onClick={handleUnpublishKunde} disabled={busy}>
                                        Aus App entfernen
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="ba-empty-state-lg">
                            <div className="ba-empty-icon">{'\uD83D\uDCC1'}</div>
                            <div className="ba-empty-text">Kein Kunde ausgew{'\u00E4'}hlt</div>
                        </div>
                    )}

                    {/* Bereits veröffentlichte Projekte */}
                    <div className="ba-card" style={{marginTop:'14px'}}>
                        <div className="ba-card-title">{'\uD83D\uDCC1'} Alle Baustellen in der App ({projects.length})</div>
                        {projects.length === 0 ? (
                            <div className="ba-empty-state">{'\u2705'} Noch keine Baustellen ver{'\u00F6'}ffentlicht</div>
                        ) : projects.map(function(proj) {
                            var m = proj.meta || {};
                            return (
                                <div key={proj.id} className="ba-row">
                                    <div className="ba-row-flex">
                                        <div className="ba-name">{m.baustelle || proj.id}</div>
                                        <div className="ba-detail">Bauherr: {m.bauherr||'–'} · {m.status||'aktiv'}</div>
                                    </div>
                                    <button className="ba-btn out" style={{fontSize:'11px', padding:'5px 10px'}} onClick={function(){ handleUnpublishProject(proj.id); }}>✕</button>
                                </div>
                            );
                        })}
                        <button className="ba-btn gry" onClick={reload} style={{marginTop:'10px', width:'100%'}}>🔄 Aktualisieren</button>
                    </div>
                </div>
            );

            // ── TAB: Mitarbeiter ──
            var teamTab = !fbOk ? offlineHint : (
                <div>
                    <div className="ba-card">
                        <div className="ba-card-title">
                            ⏳ Wartende Freigaben
                            {users.pending.length > 0 && <span className="ba-pending-badge">{users.pending.length}</span>}
                        </div>
                        {users.pending.length === 0 ? (
                            <div className="ba-empty-state">{'\u2705'} Keine wartenden Anfragen</div>
                        ) : users.pending.map(function(u) {
                            var p = u.profile || {};
                            var name = p.name || ((p.vorname||'') + ' ' + (p.nachname||'')).trim() || 'Unbekannt';
                            return (
                                <div key={u.uid} className="ba-row">
                                    <div className="ba-row-flex">
                                        <div className="ba-name">{name}</div>
                                        <div className="ba-detail">{p.telefon||p.tel||''} {'\u00B7'} {p.email||''} {'\u00B7'} {u.language||'de'}</div>
                                    </div>
                                    <div className="ba-actions-row">
                                        <button className="ba-btn grn" onClick={function(){ handleApprove(u.uid, name); }}>✅</button>
                                        <button className="ba-btn red" onClick={function(){ handleReject(u.uid, name); }}>❌</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="ba-card">
                        <div className="ba-card-title">👥 Aktive Mitarbeiter ({users.approved.length})</div>
                        {users.approved.length === 0 ? (
                            <div className="ba-empty-state">Noch keine Mitarbeiter</div>
                        ) : users.approved.map(function(u) {
                            var p = u.profile || {};
                            return (
                                <div key={u.uid} className="ba-row">
                                    <div className="ba-row-flex">
                                        <div className="ba-name">
                                            {p.name || 'Mitarbeiter'}
                                            {u.role === 'admin' && <span className="ba-admin-tag">ADMIN</span>}
                                        </div>
                                        <div className="ba-detail">Sprache: {u.language||'de'} · ✅ Aktiv</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );

            // ── TAB: Sync ──
            var syncTab = !fbOk ? offlineHint : (
                <div>
                    <div className="ba-card">
                        <div className="ba-card-title">📊 Status</div>
                        <div className="ba-stats">
                            <div className="ba-stat"><div className="ba-stat-val">{syncStatus.projects}</div><div className="ba-stat-lbl">Projekte</div></div>
                            <div className="ba-stat"><div className="ba-stat-val">{syncStatus.users}</div><div className="ba-stat-lbl">Benutzer</div></div>
                            <div className="ba-stat"><div className="ba-stat-val" style={{fontSize:'15px'}}>{syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleTimeString('de-DE') : '\u2013'}</div><div className="ba-stat-lbl">Letzter Sync</div></div>
                            <div className="ba-stat"><div className="ba-stat-val" style={{color:'var(--success)'}}>{'\uD83D\uDFE2'}</div><div className="ba-stat-lbl">Firebase</div></div>
                        </div>
                        <button className="ba-btn blu" onClick={handleSync} disabled={busy} style={{marginTop:'14px', width:'100%'}}>
                            {busy ? '⏳ Sync...' : '🔄 Jetzt synchronisieren'}
                        </button>
                    </div>
                    <div className="ba-card">
                        <div className="ba-card-title">📋 Protokoll</div>
                        <div className="ba-log">
                            {log.length === 0 ? <div className="ba-empty-state">Noch keine Eintr{'\u00E4'}ge</div>
                            : log.map(function(e,i) { return <div key={i} className="ba-log-entry"><span className="ba-log-time">[{e.time}]</span> {e.msg}</div>; })}
                        </div>
                    </div>
                </div>
            );

            // ── TAB: Config ──
            var configTab = (
                <div>
                    <div className="ba-card">
                        <div className="ba-card-title">🔧 Firebase Konfiguration</div>
                        <p className="ba-config-desc">
                            Zugangsdaten aus deiner Firebase Console eintragen.<br/>
                            <strong>Projekt:</strong> einkaufsliste-98199 (gleich wie Einkaufsliste-App)
                        </p>
                        {[
                            { k:'apiKey', l:'API Key *', p:'AIzaSy...' },
                            { k:'projectId', l:'Project ID *', p:'einkaufsliste-98199' },
                            { k:'databaseURL', l:'Database URL *', p:'https://einkaufsliste-98199-default-rtdb.europe-west1.firebasedatabase.app' },
                            { k:'authDomain', l:'Auth Domain', p:'einkaufsliste-98199.firebaseapp.com' },
                            { k:'storageBucket', l:'Storage Bucket', p:'einkaufsliste-98199.appspot.com' },
                            { k:'appId', l:'App ID', p:'1:123:web:abc...' },
                        ].map(function(f) {
                            return (
                                <div key={f.k} className="ba-field">
                                    <label>{f.l}</label>
                                    <input value={fbConfig[f.k]||''} placeholder={f.p}
                                        onChange={function(e) { var v=e.target.value; setFbConfig(function(prev){ var n=Object.assign({},prev); n[f.k]=v; return n; }); }} />
                                </div>
                            );
                        })}
                        <div className="ba-btn-row">
                            <button className="ba-btn blu" onClick={handleConnect} disabled={busy || !fbConfig.apiKey || !fbConfig.projectId}>
                                {busy ? '⏳...' : '🔗 Verbinden'}
                            </button>
                            {fbOk && <button className="ba-btn out" onClick={handleDisconnect}>🔌 Trennen</button>}
                        </div>
                    </div>
                    {fbOk && (
                        <div className="ba-card success-border">
                            <div className="ba-card-title"><span className="ba-dot on ba-connected-indicator"></span> Verbunden mit {fbConfig.projectId}</div>
                        </div>
                    )}
                </div>
            );

            return (
                <div className="page-container ba-page">
                    {/* Header */}
                    <div className="ba-page-header">
                        <button onClick={onBack} className="ba-back-btn">{'\u2190'}</button>
                        <div style={{flex:1}}>
                            <div className="ba-page-title">
                                {'\uD83D\uDCF1'} Baustellen-App
                            </div>
                        </div>
                        <span className={'ba-badge ' + (fbOk ? 'on' : 'off')}>
                            <span className={'ba-dot ' + (fbOk ? 'on' : 'off')}></span>
                            {fbOk ? 'Online' : 'Offline'}
                        </span>
                    </div>

                    {/* Tabs */}
                    <div className="ba-tabs">
                        <button className={'ba-tab' + (tab==='kunde' ? ' active' : '')} onClick={function(){ setTab('kunde'); }}>
                            📁 Baustelle
                        </button>
                        <button className={'ba-tab' + (tab==='team' ? ' active' : '')} onClick={function(){ setTab('team'); }}>
                            {'\uD83D\uDC65'} Team {users.pending.length > 0 && <span className="ba-tab-badge">{users.pending.length}</span>}
                        </button>
                        <button className={'ba-tab' + (tab==='sync' ? ' active' : '')} onClick={function(){ setTab('sync'); }}>📊 Sync</button>
                        <button className={'ba-tab' + (tab==='config' ? ' active' : '')} onClick={function(){ setTab('config'); }}>🔧</button>
                    </div>

                    {tab === 'kunde' && kundeTab}
                    {tab === 'team' && teamTab}
                    {tab === 'sync' && syncTab}
                    {tab === 'config' && configTab}
                </div>
            );
        }

        function StubModul({ name, icon, color, onBack }) {
            return (
                <div className="page-container stub-page">
                    <div className="stub-icon">{icon}</div>
                    <div className="stub-name" style={{color: color}}>{name}</div>
                    <div className="stub-desc">
                        Dieses Modul wird in einer kommenden Version freigeschaltet.
                        Die Grundstruktur ist vorbereitet -- stay tuned! {'\uD83D\uDE80'}
                    </div>
                    <button onClick={onBack} className="stub-back-btn" style={{background: color}}>
                        {'\u2190'} Zur{'\u00FC'}ck zur Modulwahl
                    </button>
                </div>
            );
        }

