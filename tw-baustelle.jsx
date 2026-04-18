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
                <div style={{textAlign:'center', padding:'30px 16px', color:'var(--text-muted)'}}>
                    <div style={{fontSize:'40px', opacity:0.5, marginBottom:'10px'}}>🔌</div>
                    <div style={{fontSize:'13px', marginBottom:'12px'}}>Firebase nicht verbunden</div>
                    <button className="ba-btn blu" onClick={function(){ setTab('config'); }}>→ Konfiguration</button>
                </div>
            );

            // ── TAB: Aktueller Kunde ──
            var kundeTab = !fbOk ? offlineHint : (
                <div>
                    {kunde ? (
                        <div>
                            <div className="ba-kunde-banner">
                                <div style={{fontSize:'32px'}}>📁</div>
                                <div style={{flex:1}}>
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
                                    <p style={{fontSize:'13px', color:'var(--text-muted)', lineHeight:'1.5', marginBottom:'14px'}}>
                                        Kundendaten werden an Firebase übertragen. Deine Mitarbeiter können
                                        diese Baustelle dann in der mobilen App sehen.
                                    </p>
                                    <button className="ba-btn grn" onClick={handlePublishKunde} disabled={busy}
                                        style={{width:'100%', padding:'14px', fontSize:'15px'}}>
                                        {busy ? '⏳ Wird hochgeladen...' : '📱 Jetzt hochladen'}
                                    </button>
                                </div>
                            ) : (
                                <div className="ba-card" style={{borderColor:'rgba(39,174,96,0.3)'}}>
                                    <div className="ba-card-title" style={{color:'var(--success)'}}>✅ Baustelle ist live</div>
                                    <p style={{fontSize:'13px', color:'var(--text-muted)', lineHeight:'1.5', marginBottom:'14px'}}>
                                        Diese Baustelle ist für deine Mitarbeiter in der App sichtbar.
                                    </p>
                                    <button className="ba-btn out" onClick={handleUnpublishKunde} disabled={busy}>
                                        Aus App entfernen
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{textAlign:'center', padding:'30px', color:'var(--text-muted)'}}>
                            <div style={{fontSize:'40px', marginBottom:'10px'}}>📁</div>
                            <div style={{fontSize:'13px'}}>Kein Kunde ausgewählt</div>
                        </div>
                    )}

                    {/* Bereits veroeffentlichte Projekte */}
                    <div className="ba-card" style={{marginTop:'14px'}}>
                        <div className="ba-card-title">📁 Alle Baustellen in der App ({projects.length})</div>
                        {projects.length === 0 ? (
                            <div style={{textAlign:'center', padding:'16px', color:'var(--text-muted)', fontSize:'13px'}}>Noch keine Baustellen veröffentlicht</div>
                        ) : projects.map(function(proj) {
                            var m = proj.meta || {};
                            return (
                                <div key={proj.id} className="ba-row">
                                    <div style={{flex:1}}>
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
                            {users.pending.length > 0 && <span style={{background:'var(--accent-orange)', color:'#fff', borderRadius:'10px', padding:'1px 8px', fontSize:'11px', fontWeight:'700', marginLeft:'4px'}}>{users.pending.length}</span>}
                        </div>
                        {users.pending.length === 0 ? (
                            <div style={{textAlign:'center', padding:'16px', color:'var(--text-muted)', fontSize:'13px'}}>✅ Keine wartenden Anfragen</div>
                        ) : users.pending.map(function(u) {
                            var p = u.profile || {};
                            var name = p.name || ((p.vorname||'') + ' ' + (p.nachname||'')).trim() || 'Unbekannt';
                            return (
                                <div key={u.uid} className="ba-row">
                                    <div style={{flex:1}}>
                                        <div className="ba-name">{name}</div>
                                        <div className="ba-detail">{p.telefon||p.tel||''} · {p.email||''} · {u.language||'de'}</div>
                                    </div>
                                    <div style={{display:'flex', gap:'6px'}}>
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
                            <div style={{textAlign:'center', padding:'16px', color:'var(--text-muted)', fontSize:'13px'}}>Noch keine Mitarbeiter</div>
                        ) : users.approved.map(function(u) {
                            var p = u.profile || {};
                            return (
                                <div key={u.uid} className="ba-row">
                                    <div style={{flex:1}}>
                                        <div className="ba-name">
                                            {p.name || 'Mitarbeiter'}
                                            {u.role === 'admin' && <span style={{marginLeft:'6px', fontSize:'10px', background:'var(--accent-blue)', color:'#fff', padding:'1px 6px', borderRadius:'6px'}}>ADMIN</span>}
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
                            <div className="ba-stat"><div className="ba-stat-val" style={{fontSize:'15px'}}>{syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleTimeString('de-DE') : '–'}</div><div className="ba-stat-lbl">Letzter Sync</div></div>
                            <div className="ba-stat"><div className="ba-stat-val" style={{color:'var(--success)'}}>🟢</div><div className="ba-stat-lbl">Firebase</div></div>
                        </div>
                        <button className="ba-btn blu" onClick={handleSync} disabled={busy} style={{marginTop:'14px', width:'100%'}}>
                            {busy ? '⏳ Sync...' : '🔄 Jetzt synchronisieren'}
                        </button>
                    </div>
                    <div className="ba-card">
                        <div className="ba-card-title">📋 Protokoll</div>
                        <div className="ba-log">
                            {log.length === 0 ? <div style={{color:'var(--text-muted)', textAlign:'center', padding:'8px'}}>Noch keine Einträge</div>
                            : log.map(function(e,i) { return <div key={i} style={{padding:'3px 0', borderBottom:'1px solid var(--border-color)', color:'var(--text-muted)'}}><span style={{color:'var(--accent-blue)'}}>[{e.time}]</span> {e.msg}</div>; })}
                        </div>
                    </div>
                </div>
            );

            // ── TAB: Config ──
            var configTab = (
                <div>
                    <div className="ba-card">
                        <div className="ba-card-title">🔧 Firebase Konfiguration</div>
                        <p style={{fontSize:'12px', color:'var(--text-muted)', marginBottom:'14px', lineHeight:'1.5'}}>
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
                        <div style={{display:'flex', gap:'8px', marginTop:'16px'}}>
                            <button className="ba-btn blu" onClick={handleConnect} disabled={busy || !fbConfig.apiKey || !fbConfig.projectId}>
                                {busy ? '⏳...' : '🔗 Verbinden'}
                            </button>
                            {fbOk && <button className="ba-btn out" onClick={handleDisconnect}>🔌 Trennen</button>}
                        </div>
                    </div>
                    {fbOk && (
                        <div className="ba-card" style={{borderColor:'rgba(39,174,96,0.3)'}}>
                            <div className="ba-card-title"><span className="ba-dot on" style={{marginRight:'4px'}}></span> Verbunden mit {fbConfig.projectId}</div>
                        </div>
                    )}
                </div>
            );

            return (
                <div className="page-container" style={{padding:'16px', minHeight:'100vh'}}>
                    {/* Header */}
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px'}}>
                        <button onClick={onBack} style={{background:'none', border:'none', color:'var(--text-secondary)', fontSize:'22px', cursor:'pointer', padding:'4px'}}>←</button>
                        <div style={{flex:1}}>
                            <div style={{fontFamily:"'Oswald',sans-serif", fontSize:'18px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--text-primary)'}}>
                                📱 Baustellen-App
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
                            👥 Team {users.pending.length > 0 && <span style={{marginLeft:'3px', background:'var(--accent-orange)', color:'#fff', borderRadius:'6px', padding:'0 5px', fontSize:'9px'}}>{users.pending.length}</span>}
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
                <div className="page-container" style={{padding:'20px 16px', minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
                    <div style={{fontSize:'64px', marginBottom:'16px'}}>{icon}</div>
                    <div style={{fontSize:'20px', fontWeight:'700', color: color, marginBottom:'8px'}}>{name}</div>
                    <div style={{fontSize:'14px', color:'var(--text-muted)', textAlign:'center', lineHeight:'1.6', maxWidth:'300px', marginBottom:'24px'}}>
                        Dieses Modul wird in einer kommenden Version freigeschaltet.
                        Die Grundstruktur ist vorbereitet -- stay tuned! 🚀
                    </div>
                    <button onClick={onBack} style={{padding:'12px 32px', background: color, color:'white', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:'600', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
                        ← Zurück zur Modulwahl
                    </button>
                </div>
            );
        }

