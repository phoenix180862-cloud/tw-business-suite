        function Startseite({ onKundeNeu, onKundeAnalysiert, onKundeManuell, onKundenauswahl, onDriveStatusChange }) {
            // ── State ──
            const [geminiConnected, setGeminiConnected] = useState(false);
            const [driveConnected, setDriveConnected] = useState(false);
            const [showKiSettings, setShowKiSettings] = useState(false);
            const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');
            const [geminiStatus, setGeminiStatus] = useState(geminiKey ? 'saved' : 'none');
            const [showKey, setShowKey] = useState(false);
            const [geminiModelPref, setGeminiModelPref] = useState(localStorage.getItem('gemini_model_pref') || 'pro');
            const [currentTime, setCurrentTime] = useState(new Date());
            const [driveConnecting, setDriveConnecting] = useState(false);

            // ── Uhr aktualisieren ──
            useEffect(function() {
                var timer = setInterval(function() { setCurrentTime(new Date()); }, 1000);
                return function() { clearInterval(timer); };
            }, []);

            // ── Gemini Check bei Mount ──
            useEffect(function() {
                var key = localStorage.getItem('gemini_api_key');
                if (key) {
                    setGeminiConnected(true);
                    setGeminiStatus('saved');
                    GEMINI_CONFIG.API_KEY = key;
                }
                // Drive Check
                if (window.GoogleDriveService && window.GoogleDriveService.accessToken) {
                    setDriveConnected(true);
                    if (onDriveStatusChange) onDriveStatusChange('online');
                }
            }, []);

            var testGeminiKey = async function() {
                if (!geminiKey) return;
                setGeminiStatus('testing');
                var modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
                for (var mi = 0; mi < modelsToTry.length; mi++) {
                    try {
                        var testModel = modelsToTry[mi];
                        var res = await fetch(
                            GEMINI_CONFIG.BASE_URL + '/models/' + testModel + ':generateContent?key=' + geminiKey,
                            { method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ contents: [{ parts: [{ text: 'Sage nur: OK' }] }] }) }
                        );
                        if (res.ok) {
                            GEMINI_CONFIG.MODEL = testModel;
                            setGeminiStatus('ok');
                            setGeminiConnected(true);
                            localStorage.setItem('gemini_api_key', geminiKey);
                            localStorage.setItem('gemini_model', testModel);
                            GEMINI_CONFIG.API_KEY = geminiKey;
                            window._kiDisabled = false;
                            return;
                        }
                    } catch(e) {}
                }
                setGeminiStatus('error');
            };

            var saveGeminiKey = function() {
                localStorage.setItem('gemini_api_key', geminiKey);
                GEMINI_CONFIG.API_KEY = geminiKey;
                window._kiDisabled = false;
                setGeminiStatus('saved');
                setGeminiConnected(true);
            };

            var handleConnectDrive = async function() {
                setDriveConnecting(true);
                if (onDriveStatusChange) onDriveStatusChange('connecting');
                try {
                    var service = window.GoogleDriveService;
                    if (!service.accessToken) {
                        await service.init();
                        await service.requestAuth();
                    }
                    setDriveConnected(true);
                    setDriveConnecting(false);
                    if (onDriveStatusChange) onDriveStatusChange('online');
                } catch(err) {
                    console.error('Drive Fehler:', err);
                    alert('Google Drive Verbindung fehlgeschlagen:\n' + err.message);
                    setDriveConnecting(false);
                    if (onDriveStatusChange) onDriveStatusChange('offline');
                }
            };

            var handleKundenauswahlClick = function() {
                if (!geminiConnected && !driveConnected) {
                    alert('Bitte zuerst Google Gemini KI und/oder Google Drive verbinden!');
                    return;
                }
                if (onKundenauswahl) {
                    onKundenauswahl({ geminiConnected: geminiConnected, driveConnected: driveConnected });
                }
            };

            // ── Datum/Uhrzeit formatieren ──
            var tage = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
            var monate = ['Januar','Februar','M\u00e4rz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
            var tag = tage[currentTime.getDay()];
            var datum = currentTime.getDate() + '. ' + monate[currentTime.getMonth()] + ' ' + currentTime.getFullYear();
            var stunden = String(currentTime.getHours()).padStart(2,'0');
            var minuten = String(currentTime.getMinutes()).padStart(2,'0');
            var sekunden = String(currentTime.getSeconds()).padStart(2,'0');

            return (
                <div className="startseite" style={{position:'relative', overflow:'hidden', minHeight:'100vh'}}>
                    {/* ═══ FIRMEN-HEADER ═══ */}
                    <div className="logo-section">
                        <FirmenLogo size="large" />
                        <div className="logo-address">
                            Flurweg 14a · 56472 Nisterau · Tel. 02661-63101
                        </div>
                        <div style={{marginTop:'8px', fontSize:'13px', fontWeight:'700', color:'var(--accent-blue)', letterSpacing:'2px', textTransform:'uppercase'}}>
                            Business Suite
                        </div>
                    </div>

                    {/* ═══ UHR & DATUM — Premium Design (GROSS) ═══ */}
                    <div style={{
                        margin:'0 20px 20px', padding:'24px 20px',
                        background:'linear-gradient(135deg, rgba(15,25,35,0.95) 0%, rgba(20,40,70,0.9) 100%)',
                        borderRadius:'20px', textAlign:'center', position:'relative', overflow:'hidden',
                        border:'1px solid rgba(77,166,255,0.2)',
                        boxShadow:'0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
                    }}>
                        {/* Dekorative Elemente */}
                        <div style={{position:'absolute', top:'-20px', right:'-20px', width:'120px', height:'120px', background:'radial-gradient(circle, rgba(77,166,255,0.15) 0%, transparent 70%)', borderRadius:'50%'}} />
                        <div style={{position:'absolute', bottom:'-15px', left:'-15px', width:'80px', height:'80px', background:'radial-gradient(circle, rgba(46,204,113,0.1) 0%, transparent 70%)', borderRadius:'50%'}} />
                        
                        {/* Tag */}
                        <div style={{fontSize:'12px', fontWeight:'600', color:'rgba(77,166,255,0.7)', letterSpacing:'5px', textTransform:'uppercase', marginBottom:'8px'}}>
                            {tag}
                        </div>
                        
                        {/* Uhrzeit — GROSS */}
                        <div style={{
                            fontSize:'64px', fontWeight:'200', color:'#ffffff', letterSpacing:'6px',
                            fontFamily:'"SF Pro Display", "Helvetica Neue", system-ui, sans-serif',
                            lineHeight:'1', marginBottom:'10px', position:'relative'
                        }}>
                            <span style={{fontWeight:'300'}}>{stunden}</span>
                            <span className="tw-clock-pulse" style={{color:'var(--accent-blue)', fontWeight:'100'}}>:</span>
                            <span style={{fontWeight:'300'}}>{minuten}</span>
                            <span style={{fontSize:'28px', fontWeight:'200', color:'rgba(255,255,255,0.35)', marginLeft:'4px', verticalAlign:'super'}}>{sekunden}</span>
                        </div>
                        
                        {/* Datum */}
                        <div style={{fontSize:'16px', fontWeight:'500', color:'rgba(255,255,255,0.6)', letterSpacing:'1.5px'}}>
                            {datum}
                        </div>
                        
                        {/* Trennlinie */}
                        <div style={{margin:'14px auto 0', width:'60px', height:'2px', background:'linear-gradient(90deg, transparent, rgba(77,166,255,0.4), transparent)', borderRadius:'1px'}} />
                    </div>

                    {/* ═══ VERBINDUNGS-BUTTONS (nebeneinander, kompakt) ═══ */}
                    <div style={{padding:'0 20px', marginBottom:'10px', width:'100%', maxWidth:'500px'}}>
                        <div style={{display:'flex', gap:'8px', marginBottom:'10px'}}>
                            {/* -- Gemini KI -- */}
                            <button
                                onTouchEnd={function(e){ e.preventDefault(); setShowKiSettings(!showKiSettings); }}
                                onClick={function(){ setShowKiSettings(!showKiSettings); }}
                                style={{
                                    flex:1, padding:'10px 8px', borderRadius:'var(--radius-md)', border:'none', cursor:'pointer',
                                    background: geminiConnected
                                        ? 'var(--success)'
                                        : 'linear-gradient(135deg, #8e44ad 0%, #6c3483 100%)',
                                    color:'#fff', position:'relative',
                                    display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                                    boxShadow: geminiConnected ? '0 3px 12px rgba(39,174,96,0.3)' : '0 3px 12px rgba(142,68,173,0.3)',
                                    transition:'all 0.2s ease',
                                    fontFamily:'Oswald, sans-serif',
                            }}>
                                <span style={{fontSize:'16px'}}>{geminiConnected ? '\u2705' : '\uD83E\uDD16'}</span>
                                <span style={{fontSize:'11px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px'}}>
                                    Gemini KI
                                </span>
                                {geminiConnected && <span style={{position:'absolute', top:'4px', right:'4px', width:'6px', height:'6px', borderRadius:'50%', background:'#2ecc71', boxShadow:'0 0 6px rgba(46,204,113,0.5)'}} />}
                            </button>

                            {/* -- Google Drive -- */}
                            <button disabled={driveConnecting}
                                onTouchEnd={function(e){ e.preventDefault(); if(!driveConnected && !driveConnecting) handleConnectDrive(); }}
                                onClick={function(){ if(!driveConnected && !driveConnecting) handleConnectDrive(); }}
                                style={{
                                    flex:1, padding:'10px 8px', borderRadius:'var(--radius-md)', border:'none', cursor: driveConnecting ? 'wait' : 'pointer',
                                    background: driveConnected
                                        ? 'var(--success)'
                                        : driveConnecting
                                            ? 'var(--accent-orange)'
                                            : 'var(--accent-blue)',
                                    color:'#fff', position:'relative',
                                    display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                                    boxShadow: driveConnected ? '0 3px 12px rgba(39,174,96,0.3)' : '0 3px 12px rgba(77,166,255,0.3)',
                                    transition:'all 0.2s ease',
                                    fontFamily:'Oswald, sans-serif',
                                    opacity: driveConnecting ? 0.7 : 1,
                            }}>
                                <span style={{fontSize:'16px'}}>{driveConnected ? '\u2705' : driveConnecting ? '\u23F3' : '\uD83D\uDCC2'}</span>
                                <span style={{fontSize:'11px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px'}}>
                                    {driveConnected ? 'Google Drive' : driveConnecting ? 'Verbinde...' : 'Google Drive'}
                                </span>
                                {driveConnected && <span style={{position:'absolute', top:'4px', right:'4px', width:'6px', height:'6px', borderRadius:'50%', background:'#2ecc71', boxShadow:'0 0 6px rgba(46,204,113,0.5)'}} />}
                            </button>
                        </div>

                        {/* -- KUNDENAUSWAHL Button (Hauptaktion = ROT!) -- */}
                        <button
                            disabled={!geminiConnected && !driveConnected}
                            onTouchEnd={function(e){ e.preventDefault(); handleKundenauswahlClick(); }}
                            onClick={function(){ handleKundenauswahlClick(); }}
                            style={{
                                width:'100%', padding:'16px 24px', borderRadius:'var(--radius-md)', border:'none',
                                cursor: (!geminiConnected && !driveConnected) ? 'not-allowed' : 'pointer',
                                background: (geminiConnected || driveConnected)
                                    ? 'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))'
                                    : 'var(--bg-tertiary)',
                                opacity: (!geminiConnected && !driveConnected) ? 0.4 : 1,
                                color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
                                boxShadow: (geminiConnected || driveConnected) ? '0 4px 15px rgba(196, 30, 30, 0.3)' : 'none',
                                transition:'all 0.25s ease',
                                fontFamily:'Oswald, sans-serif',
                        }}>
                            <span style={{fontSize:'22px'}}>{'\uD83D\uDC77'}</span>
                            <span style={{fontSize:'16px', fontWeight:'600', letterSpacing:'1px', textTransform:'uppercase'}}>Kundenauswahl</span>
                        </button>

                        {(!geminiConnected && !driveConnected) && (
                            <div style={{fontSize:'10px', color:'var(--text-muted)', textAlign:'center', padding:'4px 0', fontStyle:'italic'}}>
                                Bitte zuerst Gemini KI und/oder Google Drive verbinden
                            </div>
                        )}

                        {/* Speicher leeren Button */}
                        <div style={{textAlign:'center', marginTop:'12px'}}>
                            <button
                                onTouchEnd={function(e){
                                    e.preventDefault();
                                    if (confirm('Lokalen Speicher komplett leeren?\n\nAlle gespeicherten Kundendaten, Cache-Eintraege und Sitzungsdaten werden geloescht.\n\nDie Daten auf Google Drive bleiben erhalten und koennen jederzeit neu geladen werden.\n\nFortfahren?')) {
                                        try {
                                            // 1. localStorage komplett leeren
                                            var keysToRemove = [];
                                            for (var i = 0; i < localStorage.length; i++) {
                                                var k = localStorage.key(i);
                                                if (k && k.indexOf('aufmass_kunde_') === 0) keysToRemove.push(k);
                                            }
                                            keysToRemove.forEach(function(k) { localStorage.removeItem(k); });
                                            // Auch App-State Keys entfernen
                                            localStorage.removeItem('lastKundeId');
                                            localStorage.removeItem('tw_app_state');

                                            // 2. IndexedDB leeren (TWStorage)
                                            if (window.TWStorage && window.TWStorage.isReady()) {
                                                TWStorage.clearAllData().then(function() {
                                                    console.log('[Reset] IndexedDB geleert');
                                                }).catch(function(e) {
                                                    console.warn('[Reset] IndexedDB Fehler:', e);
                                                    // Fallback: Datenbank loeschen
                                                    indexedDB.deleteDatabase('TWBusinessSuite');
                                                });
                                            } else {
                                                // Direkt Datenbank loeschen
                                                indexedDB.deleteDatabase('TWBusinessSuite');
                                            }

                                            // 3. OrdnerAnalyseDB leeren
                                            if (window.OrdnerAnalyseDB && window.OrdnerAnalyseDB.clear) {
                                                window.OrdnerAnalyseDB.clear().catch(function(){});
                                            }
                                            indexedDB.deleteDatabase('TWOrdnerAnalyse');

                                            var count = keysToRemove.length;
                                            alert('Speicher geleert!\n\n' + count + ' Kunden-Eintraege aus localStorage entfernt.\nIndexedDB zurueckgesetzt.\n\nDie Seite wird jetzt neu geladen.');
                                            window.location.reload();
                                        } catch(resetErr) {
                                            alert('Fehler beim Zuruecksetzen:\n' + resetErr.message);
                                        }
                                    }
                                }}
                                onClick={function(){
                                    if (confirm('Lokalen Speicher komplett leeren?\n\nAlle gespeicherten Kundendaten, Cache-Eintraege und Sitzungsdaten werden geloescht.\n\nDie Daten auf Google Drive bleiben erhalten und koennen jederzeit neu geladen werden.\n\nFortfahren?')) {
                                        try {
                                            var keysToRemove = [];
                                            for (var i = 0; i < localStorage.length; i++) {
                                                var k = localStorage.key(i);
                                                if (k && k.indexOf('aufmass_kunde_') === 0) keysToRemove.push(k);
                                            }
                                            keysToRemove.forEach(function(k) { localStorage.removeItem(k); });
                                            localStorage.removeItem('lastKundeId');
                                            localStorage.removeItem('tw_app_state');
                                            if (window.TWStorage && window.TWStorage.isReady()) {
                                                TWStorage.clearAllData().then(function() { console.log('[Reset] IndexedDB geleert'); }).catch(function() { indexedDB.deleteDatabase('TWBusinessSuite'); });
                                            } else {
                                                indexedDB.deleteDatabase('TWBusinessSuite');
                                            }
                                            if (window.OrdnerAnalyseDB && window.OrdnerAnalyseDB.clear) { window.OrdnerAnalyseDB.clear().catch(function(){}); }
                                            indexedDB.deleteDatabase('TWOrdnerAnalyse');
                                            var count = keysToRemove.length;
                                            alert('Speicher geleert!\n\n' + count + ' Kunden-Eintraege aus localStorage entfernt.\nIndexedDB zurueckgesetzt.\n\nDie Seite wird jetzt neu geladen.');
                                            window.location.reload();
                                        } catch(resetErr) {
                                            alert('Fehler beim Zuruecksetzen:\n' + resetErr.message);
                                        }
                                    }
                                }}
                                style={{
                                    padding:'6px 16px', borderRadius:'var(--radius-sm)',
                                    border:'1px solid rgba(196,30,30,0.3)', background:'rgba(196,30,30,0.08)',
                                    color:'var(--accent-red-light)', cursor:'pointer', fontSize:'11px', fontWeight:'600',
                                    fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px',
                                    transition:'all 0.2s ease',
                                }}>
                                {'\uD83D\uDDD1\uFE0F'} Lokalen Speicher leeren
                            </button>
                        </div>
                    </div>

                    {/* ═══ GEMINI SETTINGS (ausklappbar) ═══ */}
                    {showKiSettings && (
                        <div style={{margin:'0 20px 16px', padding:'16px', background:'var(--bg-secondary)', borderRadius:'16px', border:'1px solid var(--border-color)'}}>
                            <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)', marginBottom:'10px'}}>Gemini API Konfiguration</div>
                            <div style={{display:'flex', gap:'8px', marginBottom:'8px'}}>
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={geminiKey}
                                    onChange={function(e){ setGeminiKey(e.target.value); }}
                                    placeholder="Gemini API Key eingeben..."
                                    style={{flex:1, padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', background:'var(--bg-primary)', fontSize:'13px', color:'var(--text-white)', fontFamily:'Source Sans 3, sans-serif', outline:'none'}}
                                />
                                <button onClick={function(){ setShowKey(!showKey); }} style={{padding:'10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', background:'var(--bg-card)', cursor:'pointer', fontSize:'16px', color:'var(--text-light)', transition:'all 0.2s ease'}}>
                                    {showKey ? '\uD83D\uDE48' : '\uD83D\uDC41'}
                                </button>
                            </div>
                            <div style={{display:'flex', gap:'8px'}}>
                                <button onClick={saveGeminiKey} style={{flex:1, padding:'10px', borderRadius:'var(--radius-sm)', border:'none', background:'var(--accent-blue)', color:'#fff', fontWeight:'600', cursor:'pointer', fontSize:'12px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px', transition:'all 0.2s ease'}}>
                                    Speichern
                                </button>
                                <button onClick={testGeminiKey} style={{flex:1, padding:'10px', borderRadius:'var(--radius-sm)', border:'none', background:'linear-gradient(135deg, #8e44ad, #6c3483)', color:'#fff', fontWeight:'600', cursor:'pointer', fontSize:'12px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px', transition:'all 0.2s ease'}}>
                                    Testen
                                </button>
                            </div>
                            {geminiStatus === 'testing' && <div style={{marginTop:'8px', fontSize:'12px', color:'#f39c12', textAlign:'center'}}>Verbindung wird getestet...</div>}
                            {geminiStatus === 'ok' && <div style={{marginTop:'8px', fontSize:'12px', color:'#2ecc71', textAlign:'center'}}>Gemini verbunden! Modell: {GEMINI_CONFIG.MODEL}</div>}
                            {geminiStatus === 'error' && <div style={{marginTop:'8px', fontSize:'12px', color:'#e74c3c', textAlign:'center'}}>Verbindung fehlgeschlagen</div>}

                            {/* Modellauswahl */}
                            <div style={{marginTop:'12px', paddingTop:'10px', borderTop:'1px solid var(--border-color)'}}>
                                <div style={{fontSize:'11px', fontWeight:'500', color:'var(--text-muted)', marginBottom:'6px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'1.5px'}}>KI-Modell</div>
                                <div style={{display:'flex', gap:'4px'}}>
                                    {Object.keys(GEMINI_CONFIG.MODELS || {}).map(function(key) {
                                        var m = GEMINI_CONFIG.MODELS[key];
                                        var isActive = geminiModelPref === key;
                                        return (
                                            <button key={key} onClick={function() {
                                                setGeminiModelPref(key);
                                                localStorage.setItem('gemini_model_pref', key);
                                            }} style={{
                                                flex:1, padding:'8px 4px', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'10px', fontWeight:'600', textAlign:'center',
                                                fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px',
                                                background: isActive ? (m.color || 'var(--accent-blue)') + '18' : 'var(--bg-primary)',
                                                border: isActive ? '2px solid ' + (m.color || 'var(--accent-blue)') : '1px solid var(--border-color)',
                                                color: isActive ? (m.color || 'var(--accent-blue)') : 'var(--text-muted)',
                                                transition:'all 0.2s ease',
                                            }}>
                                                {m.icon || ''} {(m.name || key).replace('Gemini ', '')}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Gmail-Absender */}
                            <div style={{marginTop:'12px', paddingTop:'10px', borderTop:'1px solid var(--border-color)'}}>
                                <div style={{fontSize:'12px', fontWeight:'700', color:'var(--text-muted)', marginBottom:'6px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'1px', fontSize:'11px'}}>Gmail-Absender</div>
                                <input
                                    type="email"
                                    value={localStorage.getItem('gmail_absender') || 'phoenix180862@gmail.com'}
                                    onChange={function(e){ localStorage.setItem('gmail_absender', e.target.value); if(typeof GMAIL_CONFIG !== 'undefined') GMAIL_CONFIG.ABSENDER_EMAIL = e.target.value; }}
                                    placeholder="meine@gmail.com"
                                    style={{width:'100%', padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', background:'var(--bg-primary)', fontSize:'13px', color:'var(--text-white)', boxSizing:'border-box', fontFamily:'Source Sans 3, sans-serif', outline:'none'}}
                                />
                            </div>
                        </div>
                    )}

                    {/* ═══ FLIESENLEGER ANIMATION — grosser SVG Charakter ═══ */}
                    <div style={{position:'relative', height:'120px', marginTop:'auto', width:'100%', overflow:'hidden'}}>
                        {/* Boden */}
                        <div style={{position:'absolute', bottom:'2px', left:0, right:0, height:'3px', background:'linear-gradient(90deg, transparent 5%, rgba(149,165,166,0.6) 20%, rgba(149,165,166,0.6) 80%, transparent 95%)', borderRadius:'2px'}} />
                        
                        {/* Fliesenleger SVG */}
                        <div className="tw-walker" style={{position:'absolute', bottom:'5px'}}>
                            <svg width="80" height="110" viewBox="0 0 80 110" xmlns="http://www.w3.org/2000/svg" style={{overflow:'visible', filter:'drop-shadow(2px 3px 4px rgba(0,0,0,0.4))'}}>
                                {/* === HELM === */}
                                <ellipse cx="40" cy="12" rx="14" ry="9" fill="#f1c40f">
                                    <animate attributeName="cy" values="12;10;12" dur="0.5s" repeatCount="indefinite" />
                                </ellipse>
                                <rect x="26" y="10" width="28" height="5" rx="2.5" fill="#e67e22">
                                    <animate attributeName="y" values="10;8;10" dur="0.5s" repeatCount="indefinite" />
                                </rect>
                                {/* Helm-Schild */}
                                <rect x="28" y="15" width="24" height="3" rx="1.5" fill="#d4ac0d" opacity="0.6">
                                    <animate attributeName="y" values="15;13;15" dur="0.5s" repeatCount="indefinite" />
                                </rect>
                                
                                {/* === KOPF === */}
                                <circle cx="40" cy="24" r="10" fill="#fad7a0">
                                    <animate attributeName="cy" values="24;22;24" dur="0.5s" repeatCount="indefinite" />
                                </circle>
                                {/* Augen */}
                                <ellipse cx="36" cy="22" rx="1.8" ry="2" fill="#2c3e50">
                                    <animate attributeName="cy" values="22;20;22" dur="0.5s" repeatCount="indefinite" />
                                </ellipse>
                                <ellipse cx="44" cy="22" rx="1.8" ry="2" fill="#2c3e50">
                                    <animate attributeName="cy" values="22;20;22" dur="0.5s" repeatCount="indefinite" />
                                </ellipse>
                                {/* Augenbrauen */}
                                <line x1="33" y1="19" x2="38" y2="18" stroke="#8B4513" strokeWidth="1.2" strokeLinecap="round">
                                    <animate attributeName="y1" values="19;17;19" dur="0.5s" repeatCount="indefinite" />
                                    <animate attributeName="y2" values="18;16;18" dur="0.5s" repeatCount="indefinite" />
                                </line>
                                <line x1="42" y1="18" x2="47" y2="19" stroke="#8B4513" strokeWidth="1.2" strokeLinecap="round">
                                    <animate attributeName="y1" values="18;16;18" dur="0.5s" repeatCount="indefinite" />
                                    <animate attributeName="y2" values="19;17;19" dur="0.5s" repeatCount="indefinite" />
                                </line>
                                {/* Laecheln */}
                                <path d="M35 28 Q40 32 45 28" stroke="#c0392b" strokeWidth="1.2" fill="none" strokeLinecap="round">
                                    <animate attributeName="d" values="M35 28 Q40 32 45 28;M35 26 Q40 30 45 26;M35 28 Q40 32 45 28" dur="0.5s" repeatCount="indefinite" />
                                </path>
                                {/* Nase */}
                                <ellipse cx="40" cy="25" rx="1.5" ry="1" fill="#e8c292">
                                    <animate attributeName="cy" values="25;23;25" dur="0.5s" repeatCount="indefinite" />
                                </ellipse>
                                
                                {/* === KOERPER === */}
                                <g>
                                    <animate attributeName="opacity" values="1" dur="0.5s" repeatCount="indefinite" />
                                    {/* Blaue Arbeitsjacke */}
                                    <rect x="28" y="34" width="24" height="26" rx="4" fill="#2471a3">
                                        <animate attributeName="y" values="34;32;34" dur="0.5s" repeatCount="indefinite" />
                                    </rect>
                                    {/* Warnweste - 2 Streifen */}
                                    <rect x="28" y="38" width="24" height="4" rx="1" fill="#f39c12" opacity="0.8">
                                        <animate attributeName="y" values="38;36;38" dur="0.5s" repeatCount="indefinite" />
                                    </rect>
                                    <rect x="28" y="48" width="24" height="4" rx="1" fill="#f39c12" opacity="0.6">
                                        <animate attributeName="y" values="48;46;48" dur="0.5s" repeatCount="indefinite" />
                                    </rect>
                                    {/* Reissverschluss */}
                                    <line x1="40" y1="34" x2="40" y2="58" stroke="#1a5276" strokeWidth="1.5">
                                        <animate attributeName="y1" values="34;32;34" dur="0.5s" repeatCount="indefinite" />
                                        <animate attributeName="y2" values="58;56;58" dur="0.5s" repeatCount="indefinite" />
                                    </line>
                                </g>
                                
                                {/* === LINKER ARM + KELLE === */}
                                <g>
                                    <animateTransform attributeName="transform" type="rotate" values="25,30,38;-25,30,38;25,30,38" dur="0.5s" repeatCount="indefinite" />
                                    {/* Oberarm */}
                                    <rect x="14" y="36" width="16" height="7" rx="3.5" fill="#2471a3" />
                                    {/* Unterarm */}
                                    <rect x="8" y="36" width="10" height="6" rx="3" fill="#fad7a0" />
                                    {/* Kelle - Griff */}
                                    <rect x="2" y="37" width="8" height="3" rx="1.5" fill="#7f8c8d" />
                                    {/* Kelle - Blatt */}
                                    <path d="M-2 35 L4 33 L4 41 L-2 39 Z" fill="#95a5a6" />
                                </g>
                                
                                {/* === RECHTER ARM === */}
                                <g>
                                    <animateTransform attributeName="transform" type="rotate" values="-25,50,38;25,50,38;-25,50,38" dur="0.5s" repeatCount="indefinite" />
                                    {/* Oberarm */}
                                    <rect x="50" y="36" width="16" height="7" rx="3.5" fill="#2471a3" />
                                    {/* Hand */}
                                    <circle cx="64" cy="39" r="3.5" fill="#fad7a0" />
                                </g>
                                
                                {/* === FLIESE UNTER RECHTEM ARM === */}
                                <g>
                                    <animateTransform attributeName="transform" type="translate" values="0,0;0,-2;0,0" dur="0.5s" repeatCount="indefinite" />
                                    <rect x="60" y="42" width="14" height="14" rx="2" fill="#ecf0f1" stroke="#bdc3c7" strokeWidth="1" />
                                    {/* Fliesenmuster */}
                                    <line x1="67" y1="42" x2="67" y2="56" stroke="#d5d8dc" strokeWidth="0.5" />
                                    <line x1="60" y1="49" x2="74" y2="49" stroke="#d5d8dc" strokeWidth="0.5" />
                                    {/* Zweite Fliese dahinter */}
                                    <rect x="63" y="45" width="14" height="14" rx="2" fill="#d5dbdb" stroke="#bdc3c7" strokeWidth="0.6" opacity="0.5" />
                                </g>
                                
                                {/* === LINKES BEIN === */}
                                <g>
                                    <animateTransform attributeName="transform" type="rotate" values="30,35,60;-30,35,60;30,35,60" dur="0.5s" repeatCount="indefinite" />
                                    {/* Hose */}
                                    <rect x="31" y="58" width="8" height="26" rx="3" fill="#2c3e50" />
                                    {/* Knie-Highlight */}
                                    <rect x="31" y="68" width="8" height="4" rx="2" fill="#34495e" />
                                    {/* Schuh */}
                                    <rect x="28" y="82" width="14" height="6" rx="3" fill="#784212" />
                                    <rect x="28" y="82" width="14" height="3" rx="1.5" fill="#8B5A2B" />
                                    {/* Sohle */}
                                    <rect x="27" y="86" width="16" height="2.5" rx="1" fill="#4a2c0a" />
                                </g>
                                
                                {/* === RECHTES BEIN === */}
                                <g>
                                    <animateTransform attributeName="transform" type="rotate" values="-30,45,60;30,45,60;-30,45,60" dur="0.5s" repeatCount="indefinite" />
                                    {/* Hose */}
                                    <rect x="41" y="58" width="8" height="26" rx="3" fill="#34495e" />
                                    {/* Knie-Highlight */}
                                    <rect x="41" y="68" width="8" height="4" rx="2" fill="#3d566e" />
                                    {/* Schuh */}
                                    <rect x="38" y="82" width="14" height="6" rx="3" fill="#784212" />
                                    <rect x="38" y="82" width="14" height="3" rx="1.5" fill="#8B5A2B" />
                                    {/* Sohle */}
                                    <rect x="37" y="86" width="16" height="2.5" rx="1" fill="#4a2c0a" />
                                </g>
                            </svg>
                        </div>
                        
                        {/* Gelegte Fliesen hinter ihm */}
                        <div className="tw-tiles-laid" style={{position:'absolute', bottom:'5px', display:'flex', gap:'3px', alignItems:'flex-end'}}>
                            <span style={{display:'inline-block', width:'14px', height:'14px', background:'rgba(77,166,255,0.45)', border:'1px solid rgba(77,166,255,0.3)', borderRadius:'2px'}} />
                            <span style={{display:'inline-block', width:'14px', height:'14px', background:'rgba(77,166,255,0.35)', border:'1px solid rgba(77,166,255,0.2)', borderRadius:'2px'}} />
                            <span style={{display:'inline-block', width:'14px', height:'14px', background:'rgba(77,166,255,0.25)', border:'1px solid rgba(77,166,255,0.15)', borderRadius:'2px'}} />
                            <span style={{display:'inline-block', width:'14px', height:'14px', background:'rgba(77,166,255,0.15)', border:'1px solid rgba(77,166,255,0.08)', borderRadius:'2px'}} />
                            <span style={{display:'inline-block', width:'14px', height:'14px', background:'rgba(77,166,255,0.08)', border:'1px solid rgba(77,166,255,0.04)', borderRadius:'2px'}} />
                        </div>
                    </div>

                    {/* ═══ CSS Animations ═══ */}
                    <style dangerouslySetInnerHTML={{__html: '\n.tw-clock-pulse { animation: twClockPulse 1s ease-in-out infinite; }\n@keyframes twClockPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }\n.tw-walker { animation: twWalk 14s linear infinite; }\n@keyframes twWalk { 0% { left: -90px; } 100% { left: calc(100% + 90px); } }\n.tw-tiles-laid { animation: twTilesLaid 14s linear infinite; }\n@keyframes twTilesLaid { 0% { left: -160px; } 100% { left: calc(100% - 10px); } }\n'}} />
                </div>
            )
        }
        /* ═══════════════════════════════════════════
           KUNDEN-MODUS-WAHL — Wie soll der Kunde bearbeitet werden?
           ═══════════════════════════════════════════ */
        function KundenModusWahl({ onSelectModus, onBack, connections }) {
            var modi = [
                {
                    id: 'gespeichertKomplett',
                    icon: '\uD83D\uDCE5',
                    title: 'Kundendaten laden',
                    desc: 'Alle Ordner und Dokumente vom Kunden werden komplett geladen. Die 3 Listen (Stammdaten, Positionen, Raeume) werden automatisch aus dem Kunden-Daten Ordner uebertragen.',
                    color: '#1E88E5',
                    gradient: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                    shadow: 'rgba(30,136,229,0.30)',
                    badge: 'EMPFOHLEN',
                    disabled: !(connections && connections.driveConnected),
                    disabledHint: 'Google Drive verbinden',
                },
                {
                    id: 'manuell',
                    icon: '\uD83D\uDCDD',
                    title: 'Manuell anlegen',
                    desc: 'Kundendaten, Positionslisten und Raumlisten werden manuell eingegeben oder hochgeladen.',
                    color: '#1E88E5',
                    gradient: 'linear-gradient(135deg, #1E88E5, #1565C0)',
                    shadow: 'rgba(30,136,229,0.30)',
                    badge: null,
                    disabled: false,
                    disabledHint: null,
                },
            ];

            return (
                <div style={{padding:'20px', minHeight:'100vh', background:'var(--bg-primary)'}}>
                    {/* Header */}
                    <div style={{textAlign:'center', marginBottom:'28px'}}>
                        <div style={{fontSize:'36px', marginBottom:'8px'}}>&#x1F477;</div>
                        <div style={{fontSize:'22px', fontWeight:'700', color:'var(--text-primary)', letterSpacing:'2px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase'}}>
                            Kundenauswahl
                        </div>
                        <div style={{fontSize:'13px', color:'var(--text-muted)', marginTop:'8px', lineHeight:'1.5', fontFamily:'Source Sans 3, sans-serif'}}>
                            Wie moechtest du den Kunden bearbeiten?
                        </div>
                    </div>

                    {/* Modus-Karten */}
                    <div style={{display:'flex', flexDirection:'column', gap:'14px', maxWidth:'500px', margin:'0 auto'}}>
                        {modi.map(function(m) {
                            return (
                                <button key={m.id}
                                    disabled={m.disabled}
                                    onTouchEnd={function(e){ if(!m.disabled){ e.preventDefault(); onSelectModus(m.id); } }}
                                    onClick={function(){ if(!m.disabled) onSelectModus(m.id); }}
                                    style={{
                                        width:'100%', padding:'20px', borderRadius:'var(--radius-lg)', border:'1px solid ' + (m.disabled ? 'var(--border-color)' : 'transparent'),
                                        cursor: m.disabled ? 'not-allowed' : 'pointer',
                                        background: m.disabled ? 'var(--bg-secondary)' : m.gradient, color: m.disabled ? 'var(--text-muted)' : '#fff',
                                        display:'flex', alignItems:'flex-start', gap:'16px', textAlign:'left',
                                        boxShadow: m.disabled ? 'none' : '0 6px 20px ' + m.shadow,
                                        opacity: m.disabled ? 0.4 : 1,
                                        transition:'all 0.25s ease',
                                        position:'relative', overflow:'hidden',
                                    }}
                                >
                                    {/* Badge */}
                                    {m.badge && !m.disabled && (
                                        <div style={{position:'absolute', top:'0', right:'0', background:'rgba(255,255,255,0.2)', padding:'3px 10px', borderRadius:'0 var(--radius-lg) 0 10px', fontSize:'9px', fontWeight:'700', letterSpacing:'1px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase'}}>
                                            {m.badge}
                                        </div>
                                    )}
                                    <span style={{fontSize:'32px', marginTop:'2px'}}>{m.icon}</span>
                                    <div style={{flex:1}}>
                                        <div style={{fontSize:'16px', fontWeight:'600', marginBottom:'4px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>{m.title}</div>
                                        <div style={{fontSize:'12px', opacity: m.disabled ? 0.7 : 0.9, lineHeight:'1.5', fontFamily:'Source Sans 3, sans-serif'}}>{m.desc}</div>
                                        {m.disabled && m.disabledHint && (
                                            <div style={{fontSize:'10px', marginTop:'6px', padding:'3px 8px', background:'rgba(30,136,229,0.12)', borderRadius:'var(--radius-sm)', display:'inline-block', color:'#1E88E5', fontWeight:'600', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>
                                                {'\u26A0'} {m.disabledHint}
                                            </div>
                                        )}
                                    </div>
                                    {!m.disabled && <span style={{fontSize:'20px', opacity:0.7, marginTop:'4px'}}>{'\u2192'}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Zurueck-Button = Primaer (ROT) */}
                    <div style={{textAlign:'center', marginTop:'28px'}}>
                        <button
                            onTouchEnd={function(e){ e.preventDefault(); onBack(); }}
                            onClick={onBack}
                            style={{
                                padding:'12px 32px', borderRadius:'var(--radius-md)', border:'none',
                                background:'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))', color:'#fff', cursor:'pointer',
                                fontSize:'14px', fontWeight:'600', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'1px',
                                boxShadow:'0 4px 15px rgba(196, 30, 30, 0.3)',
                                transition:'all 0.25s ease',
                        }}>
                            {'\u2190'} Zurueck
                        </button>
                    </div>
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           MANUELLE EINGABE -- LV-Positionen & Räume
           ═══════════════════════════════════════════ */
        /* ManuelleEingabe v4 — Identische 3 Listen wie DatenUebersicht + PDF-Export */
        function ManuelleEingabe({ onFertig, onBack, kunde }) {
            var [activeTab, setActiveTab] = useState('stammdaten');
            var [pdfStatus, setPdfStatus] = useState('');
            var [uploadStatus, setUploadStatus] = useState('');

            // ── Stammdaten (identisch mit DatenUebersicht) ──
            var [stammFelder, setStammFelder] = useState({
                bauherr_firma: '', bauherr_strasse: '', bauherr_plzOrt: '',
                bauherr_ansprechpartner: '', bauherr_telefon: '', bauherr_fax: '',
                bauherr_mobil: '', bauherr_email: '', bauherr_website: '',
                bauleiter_name: '', bauleiter_firma: '', bauleiter_strasse: '',
                bauleiter_plzOrt: '', bauleiter_telefon: '', bauleiter_mobil: '',
                bauleiter_fax: '', bauleiter_email: '',
                architekt_name: '', architekt_buero: '', architekt_strasse: '',
                architekt_plzOrt: '', architekt_telefon: '', architekt_mobil: '',
                architekt_fax: '', architekt_email: '',
                objekt_bauvorhaben: '', objekt_strasse: '', objekt_plzOrt: '',
                objekt_projektnr: '', objekt_vergabenr: '', objekt_auftragsnr: '',
                objekt_vergabeart: '', objekt_auftragsdatum: '',
                objekt_ausfuehrung_von: '', objekt_ausfuehrung_bis: '', objekt_abnahmedatum: ''
            });

            // ── LV-Positionen (identisch mit DatenUebersicht) ──
            var [positionen, setPositionen] = useState([]);
            var [nachtraege, setNachtraege] = useState([]);
            var [showPosForm, setShowPosForm] = useState(false);
            var [showNachtragForm, setShowNachtragForm] = useState(false);
            var [editPosIdx, setEditPosIdx] = useState(null);
            var [editNachtragIdx, setEditNachtragIdx] = useState(null);
            var [posForm, setPosForm] = useState({ posNr:'', menge:'', einheit:'m\u00b2', leistung:'', ep:'', gp:'' });
            var [nachtragForm, setNachtragForm] = useState({ posNr:'', menge:'', einheit:'m\u00b2', leistung:'', ep:'', gp:'', nachtragTitel:'' });

            // ── Raeume (identisch mit DatenUebersicht) ──
            var [raeume, setRaeume] = useState([]);
            var [showRaumForm, setShowRaumForm] = useState(false);
            var [editRaumIdx, setEditRaumIdx] = useState(null);
            var [raumForm, setRaumForm] = useState({ raumNr:'', bezeichnung:'', geschoss:'EG', flaeche:'', fliesenarbeiten:'Ja' });

            // ── Touch Helper ──
            var tap = function(fn) { return { onTouchEnd: function(e){ e.preventDefault(); e.stopPropagation(); fn(); }, onClick: function(){ fn(); } }; };
            var touchBase = { WebkitTapHighlightColor:'rgba(30,136,229,0.2)', touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none' };

            // ── Formatierung ──
            var fmtZahl = function(n) { var num = parseFloat(n) || 0; return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
            var fmtEuro = function(n) { var num = parseFloat(n) || 0; return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac'; };

            // ── Einheiten ──
            var einheiten = ['m\u00b2', 'm', 'Stk', 'psch', 'lfm', 'kg', 'l', 'Satz', 'Std'];

            // ── Geschosse ──
            var geschosse = ['KG', 'EG', 'OG', '1.OG', '2.OG', 'DG'];

            // ── Styles ──
            var inputStyle = { width:'100%', padding:'8px 10px', borderRadius:'8px', border:'1px solid var(--accent-blue)', background:'var(--bg-tertiary)', fontSize:'13px', color:'var(--text-primary)', boxSizing:'border-box' };
            var labelStyle = { fontSize:'11px', fontWeight:'700', color:'var(--text-muted)', marginBottom:'4px', display:'block', textTransform:'uppercase', letterSpacing:'0.5px' };

            // ═══ STAMMDATEN CRUD ═══
            var updateStammFeld = function(key, val) { setStammFelder(function(prev) { var n = Object.assign({}, prev); n[key] = val; return n; }); };

            // ═══ POSITIONEN CRUD ═══
            var resetPosForm = function() { setPosForm({ posNr:'', menge:'', einheit:'m\u00b2', leistung:'', ep:'', gp:'' }); setEditPosIdx(null); setShowPosForm(false); };
            var handleSavePos = function() {
                if (!posForm.posNr || !posForm.leistung) { alert('Bitte mindestens Pos.-Nr. und Leistungsbeschreibung eingeben.'); return; }
                var newPos = { posNr: posForm.posNr.trim(), menge: parseFloat(posForm.menge) || 0, einheit: posForm.einheit || 'm\u00b2', leistung: posForm.leistung.trim(), ep: parseFloat(posForm.ep) || 0, gp: parseFloat(posForm.gp) || 0 };
                if (newPos.ep > 0 && newPos.menge > 0 && newPos.gp === 0) { newPos.gp = Math.round(newPos.ep * newPos.menge * 100) / 100; }
                if (editPosIdx !== null) { setPositionen(function(prev) { var c = prev.slice(); c[editPosIdx] = newPos; return c; }); }
                else { setPositionen(function(prev) { return prev.concat([newPos]); }); }
                resetPosForm();
            };
            var handleEditPos = function(idx) { var p = positionen[idx]; setPosForm({ posNr: p.posNr, menge: String(p.menge || ''), einheit: p.einheit || 'm\u00b2', leistung: p.leistung, ep: String(p.ep || ''), gp: String(p.gp || '') }); setEditPosIdx(idx); setShowPosForm(true); };
            var handleDeletePos = function(idx) { if (confirm('Position "' + positionen[idx].posNr + '" loeschen?')) { setPositionen(function(prev) { return prev.filter(function(_, i) { return i !== idx; }); }); } };

            // ═══ NACHTRAEGE CRUD ═══
            var resetNachtragForm = function() { setNachtragForm({ posNr:'', menge:'', einheit:'m\u00b2', leistung:'', ep:'', gp:'', nachtragTitel:'' }); setEditNachtragIdx(null); setShowNachtragForm(false); };
            var handleSaveNachtrag = function() {
                if (!nachtragForm.posNr || !nachtragForm.leistung) { alert('Bitte mindestens Pos.-Nr. und Leistungsbeschreibung eingeben.'); return; }
                var newN = { posNr: nachtragForm.posNr.trim(), menge: parseFloat(nachtragForm.menge) || 0, einheit: nachtragForm.einheit || 'm\u00b2', leistung: nachtragForm.leistung.trim(), ep: parseFloat(nachtragForm.ep) || 0, gp: parseFloat(nachtragForm.gp) || 0, nachtragTitel: nachtragForm.nachtragTitel.trim() };
                if (newN.ep > 0 && newN.menge > 0 && newN.gp === 0) { newN.gp = Math.round(newN.ep * newN.menge * 100) / 100; }
                if (editNachtragIdx !== null) { setNachtraege(function(prev) { var c = prev.slice(); c[editNachtragIdx] = newN; return c; }); }
                else { setNachtraege(function(prev) { return prev.concat([newN]); }); }
                resetNachtragForm();
            };
            var handleEditNachtrag = function(idx) { var n = nachtraege[idx]; setNachtragForm({ posNr: n.posNr, menge: String(n.menge || ''), einheit: n.einheit || 'm\u00b2', leistung: n.leistung, ep: String(n.ep || ''), gp: String(n.gp || ''), nachtragTitel: n.nachtragTitel || '' }); setEditNachtragIdx(idx); setShowNachtragForm(true); };
            var handleDeleteNachtrag = function(idx) { if (confirm('Nachtrag "' + nachtraege[idx].posNr + '" loeschen?')) { setNachtraege(function(prev) { return prev.filter(function(_, i) { return i !== idx; }); }); } };

            // ═══ RAEUME CRUD ═══
            var resetRaumForm = function() { setRaumForm({ raumNr:'', bezeichnung:'', geschoss:'EG', flaeche:'', fliesenarbeiten:'Ja' }); setEditRaumIdx(null); setShowRaumForm(false); };
            var handleSaveRaum = function() {
                if (!raumForm.bezeichnung) { alert('Bitte mindestens eine Raumbezeichnung eingeben.'); return; }
                var newR = { raumNr: raumForm.raumNr.trim(), bezeichnung: raumForm.bezeichnung.trim(), geschoss: raumForm.geschoss || 'EG', flaeche: parseFloat(raumForm.flaeche) || 0, fliesenarbeiten: raumForm.fliesenarbeiten || 'Ja' };
                if (editRaumIdx !== null) { setRaeume(function(prev) { var c = prev.slice(); c[editRaumIdx] = newR; return c; }); }
                else { setRaeume(function(prev) { return prev.concat([newR]); }); }
                resetRaumForm();
            };
            var handleEditRaum = function(idx) { var r = raeume[idx]; setRaumForm({ raumNr: r.raumNr, bezeichnung: r.bezeichnung, geschoss: r.geschoss || 'EG', flaeche: String(r.flaeche || ''), fliesenarbeiten: r.fliesenarbeiten || 'Ja' }); setEditRaumIdx(idx); setShowRaumForm(true); };
            var handleDeleteRaum = function(idx) { if (confirm('Raum "' + raeume[idx].bezeichnung + '" loeschen?')) { setRaeume(function(prev) { return prev.filter(function(_, i) { return i !== idx; }); }); } };

            // ═══ DATEI-UPLOAD (CSV / Excel) ═══
            var handleFileUpload = function(e, targetType) {
                var file = e.target.files[0];
                if (!file) return;
                var ext = file.name.split('.').pop().toLowerCase();
                setUploadStatus('Wird verarbeitet...');

                // ── Stammdaten Import: Key-Value-Paare aus Excel/CSV ──
                if (targetType === 'stammdaten') {
                    var processStammRows = function(rows, headers) {
                        // Mapping: Header-Texte (case-insensitive) → stammFelder-Keys
                        var fieldMap = {
                            'firma': 'bauherr_firma', 'name': 'bauherr_firma', 'bauherr': 'bauherr_firma', 'auftraggeber': 'bauherr_firma', 'kunde': 'bauherr_firma',
                            'ansprechpartner': 'bauherr_ansprechpartner', 'ansprech': 'bauherr_ansprechpartner',
                            'strasse': 'bauherr_strasse', 'str': 'bauherr_strasse', 'adresse': 'bauherr_strasse',
                            'plz': 'bauherr_plzOrt', 'ort': 'bauherr_plzOrt', 'plz/ort': 'bauherr_plzOrt', 'plz ort': 'bauherr_plzOrt',
                            'telefon': 'bauherr_telefon', 'tel': 'bauherr_telefon', 'fon': 'bauherr_telefon',
                            'fax': 'bauherr_fax',
                            'mobil': 'bauherr_mobil', 'handy': 'bauherr_mobil',
                            'email': 'bauherr_email', 'e-mail': 'bauherr_email', 'mail': 'bauherr_email',
                            'website': 'bauherr_website', 'web': 'bauherr_website', 'homepage': 'bauherr_website',
                            'bauleiter': 'bauleiter_name', 'bauleiter name': 'bauleiter_name', 'bl name': 'bauleiter_name',
                            'bauleiter firma': 'bauleiter_firma', 'bl firma': 'bauleiter_firma', 'dienststelle': 'bauleiter_firma',
                            'bauleiter strasse': 'bauleiter_strasse', 'bl strasse': 'bauleiter_strasse',
                            'bauleiter plz': 'bauleiter_plzOrt', 'bl plz': 'bauleiter_plzOrt', 'bauleiter ort': 'bauleiter_plzOrt',
                            'bauleiter telefon': 'bauleiter_telefon', 'bl telefon': 'bauleiter_telefon', 'bl tel': 'bauleiter_telefon',
                            'bauleiter mobil': 'bauleiter_mobil', 'bl mobil': 'bauleiter_mobil',
                            'bauleiter email': 'bauleiter_email', 'bl email': 'bauleiter_email', 'bl e-mail': 'bauleiter_email',
                            'architekt': 'architekt_name', 'architekt name': 'architekt_name', 'planer': 'architekt_name',
                            'architekt buero': 'architekt_buero', 'architekturbuero': 'architekt_buero', 'arch buero': 'architekt_buero',
                            'architekt strasse': 'architekt_strasse', 'arch strasse': 'architekt_strasse',
                            'architekt plz': 'architekt_plzOrt', 'arch plz': 'architekt_plzOrt', 'architekt ort': 'architekt_plzOrt',
                            'architekt telefon': 'architekt_telefon', 'arch telefon': 'architekt_telefon', 'arch tel': 'architekt_telefon',
                            'architekt mobil': 'architekt_mobil', 'arch mobil': 'architekt_mobil',
                            'architekt email': 'architekt_email', 'arch email': 'architekt_email', 'arch e-mail': 'architekt_email',
                            'bauvorhaben': 'objekt_bauvorhaben', 'projekt': 'objekt_bauvorhaben', 'objekt': 'objekt_bauvorhaben', 'baumassnahme': 'objekt_bauvorhaben',
                            'baustelle': 'objekt_strasse', 'baustelle strasse': 'objekt_strasse', 'objekt strasse': 'objekt_strasse',
                            'baustelle plz': 'objekt_plzOrt', 'objekt plz': 'objekt_plzOrt', 'baustelle ort': 'objekt_plzOrt',
                            'projektnummer': 'objekt_projektnr', 'projekt nr': 'objekt_projektnr', 'projektnr': 'objekt_projektnr',
                            'vergabenummer': 'objekt_vergabenr', 'vergabe nr': 'objekt_vergabenr', 'vergabenr': 'objekt_vergabenr',
                            'auftragsnummer': 'objekt_auftragsnr', 'auftrags nr': 'objekt_auftragsnr', 'auftragsnr': 'objekt_auftragsnr',
                            'vergabeart': 'objekt_vergabeart',
                            'auftragsdatum': 'objekt_auftragsdatum', 'datum': 'objekt_auftragsdatum',
                            'ausfuehrung von': 'objekt_ausfuehrung_von', 'beginn': 'objekt_ausfuehrung_von',
                            'ausfuehrung bis': 'objekt_ausfuehrung_bis', 'ende': 'objekt_ausfuehrung_bis',
                            'abnahmedatum': 'objekt_abnahmedatum', 'abnahme': 'objekt_abnahmedatum'
                        };
                        var count = 0;
                        var newStamm = Object.assign({}, stammFelder);

                        if (headers && headers.length >= 2) {
                            // Format A: Tabellarisch mit Headern — Spalte 1 = Feld, Spalte 2 = Wert
                            // ODER: Header-Zeile mit Spaltennamen
                            var h0 = String(headers[0] || '').toLowerCase().trim();
                            var h1 = String(headers[1] || '').toLowerCase().trim();
                            var isKeyValue = (h0.indexOf('feld') >= 0 || h0.indexOf('bezeichnung') >= 0 || h0.indexOf('key') >= 0) && (h1.indexOf('wert') >= 0 || h1.indexOf('value') >= 0 || h1.indexOf('inhalt') >= 0);

                            if (isKeyValue) {
                                // Format B: Spalte A = Feldname, Spalte B = Wert
                                for (var i = 0; i < rows.length; i++) {
                                    var r = rows[i];
                                    if (!r || r.length < 2) continue;
                                    var key = String(r[0] || '').toLowerCase().trim().replace(/[_\-:]/g, ' ').replace(/\s+/g, ' ');
                                    var val = String(r[1] || '').trim();
                                    if (!key || !val) continue;
                                    // Exakter Match
                                    if (fieldMap[key]) { newStamm[fieldMap[key]] = val; count++; continue; }
                                    // Teilmatch
                                    var matched = false;
                                    Object.keys(fieldMap).forEach(function(fk) {
                                        if (!matched && key.indexOf(fk) >= 0) { newStamm[fieldMap[fk]] = val; count++; matched = true; }
                                    });
                                }
                            } else {
                                // Format C: Header-Zeile enthält Feldnamen, erste Datenzeile die Werte
                                var firstRow = rows[0] || [];
                                for (var ci = 0; ci < headers.length; ci++) {
                                    var hdr = String(headers[ci] || '').toLowerCase().trim().replace(/[_\-:]/g, ' ').replace(/\s+/g, ' ');
                                    var cellVal = String(firstRow[ci] || '').trim();
                                    if (!hdr || !cellVal) continue;
                                    if (fieldMap[hdr]) { newStamm[fieldMap[hdr]] = cellVal; count++; continue; }
                                    Object.keys(fieldMap).forEach(function(fk) {
                                        if (hdr.indexOf(fk) >= 0) { newStamm[fieldMap[fk]] = cellVal; count++; }
                                    });
                                }
                            }
                        } else {
                            // Format D: Nur 2 Spalten, kein Header erkannt — Key/Value direkt
                            for (var j = 0; j < rows.length; j++) {
                                var rr = rows[j];
                                if (!rr || rr.length < 2) continue;
                                var k = String(rr[0] || '').toLowerCase().trim().replace(/[_\-:]/g, ' ').replace(/\s+/g, ' ');
                                var v = String(rr[1] || '').trim();
                                if (!k || !v) continue;
                                if (fieldMap[k]) { newStamm[fieldMap[k]] = v; count++; continue; }
                                Object.keys(fieldMap).forEach(function(fk) {
                                    if (k.indexOf(fk) >= 0) { newStamm[fieldMap[fk]] = v; count++; }
                                });
                            }
                        }

                        if (count > 0) {
                            setStammFelder(newStamm);
                            setUploadStatus(count + ' Stammdaten-Felder importiert');
                            setActiveTab('stammdaten');
                        } else {
                            setUploadStatus('Keine Stammdaten erkannt. Erwarte: Spalte A = Feldname, Spalte B = Wert');
                        }
                    };

                    if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
                        var readerS = new FileReader();
                        readerS.onload = function(ev) {
                            try {
                                var text = ev.target.result;
                                var lines = text.split(/\r?\n/).filter(function(l) { return l.trim().length > 0; });
                                var sep = text.indexOf('\t') >= 0 ? '\t' : (text.indexOf(';') >= 0 ? ';' : ',');
                                var allRows = lines.map(function(l) { return l.split(sep).map(function(c) { return c.replace(/^"|"$/g, '').trim(); }); });
                                processStammRows(allRows.slice(1), allRows[0] || []);
                            } catch(err) { setUploadStatus('Fehler: ' + err.message); }
                        };
                        readerS.readAsText(file);
                    } else if (ext === 'xlsx' || ext === 'xls') {
                        var readerS2 = new FileReader();
                        readerS2.onload = function(ev) {
                            try {
                                if (typeof XLSX === 'undefined') { setUploadStatus('SheetJS nicht verfuegbar'); return; }
                                var workbook = XLSX.read(ev.target.result, { type: 'array' });
                                var sheet = workbook.Sheets[workbook.SheetNames[0]];
                                var rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                                if (rows.length < 2) { setUploadStatus('Leere Datei'); return; }
                                processStammRows(rows.slice(1), rows[0] || []);
                            } catch(err) { setUploadStatus('Excel-Fehler: ' + err.message); }
                        };
                        readerS2.readAsArrayBuffer(file);
                    } else { setUploadStatus('Format nicht unterstuetzt (CSV, XLSX, XLS)'); }
                    e.target.value = '';
                    return;
                }

                var processRows = function(rows, isRaumFile) {
                    if (targetType === 'positionen' || (!targetType && !isRaumFile)) {
                        var imported = [];
                        for (var i = 0; i < rows.length; i++) {
                            var r = rows[i];
                            if (!r || r.length < 2) continue;
                            imported.push({ posNr: String(r[0] || ''), menge: parseFloat(r[1]) || 0, einheit: String(r[2] || 'm\u00b2'), leistung: String(r[3] || ''), ep: parseFloat(r[4]) || 0, gp: parseFloat(r[5]) || 0 });
                        }
                        if (imported.length > 0) { setPositionen(function(prev) { return prev.concat(imported); }); setUploadStatus(imported.length + ' Positionen importiert'); setActiveTab('positionen'); }
                        else { setUploadStatus('Keine Daten erkannt'); }
                    } else {
                        var importedR = [];
                        for (var j = 0; j < rows.length; j++) {
                            var rr = rows[j];
                            if (!rr || rr.length < 2) continue;
                            importedR.push({ raumNr: String(rr[0] || ''), bezeichnung: String(rr[1] || ''), geschoss: String(rr[2] || 'EG').toUpperCase(), flaeche: parseFloat(rr[3]) || 0, fliesenarbeiten: String(rr[4] || 'Ja') });
                        }
                        if (importedR.length > 0) { setRaeume(function(prev) { return prev.concat(importedR); }); setUploadStatus(importedR.length + ' Raeume importiert'); setActiveTab('raeume'); }
                        else { setUploadStatus('Keine Daten erkannt'); }
                    }
                };

                if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
                    var reader = new FileReader();
                    reader.onload = function(ev) {
                        try {
                            var text = ev.target.result;
                            var lines = text.split(/\r?\n/).filter(function(l) { return l.trim().length > 0; });
                            var sep = text.indexOf('\t') >= 0 ? '\t' : (text.indexOf(';') >= 0 ? ';' : ',');
                            var header = lines[0].toLowerCase();
                            var isRaum = header.indexOf('raum') >= 0 && header.indexOf('geschoss') >= 0;
                            var dataRows = [];
                            for (var i = 1; i < lines.length; i++) { dataRows.push(lines[i].split(sep).map(function(c) { return c.replace(/^"|"$/g, '').trim(); })); }
                            processRows(dataRows, isRaum);
                        } catch(err) { setUploadStatus('Fehler: ' + err.message); }
                    };
                    reader.readAsText(file);
                } else if (ext === 'xlsx' || ext === 'xls') {
                    var reader2 = new FileReader();
                    reader2.onload = function(ev) {
                        try {
                            if (typeof XLSX === 'undefined') { setUploadStatus('SheetJS nicht verfuegbar'); return; }
                            var workbook = XLSX.read(ev.target.result, { type: 'array' });
                            var sheet = workbook.Sheets[workbook.SheetNames[0]];
                            var rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                            if (rows.length < 2) { setUploadStatus('Leere Datei'); return; }
                            var header = (rows[0] || []).map(function(h) { return String(h || '').toLowerCase(); });
                            var isRaum = header.some(function(h) { return h.indexOf('raum') >= 0; }) && header.some(function(h) { return h.indexOf('geschoss') >= 0; });
                            processRows(rows.slice(1), isRaum);
                        } catch(err) { setUploadStatus('Excel-Fehler: ' + err.message); }
                    };
                    reader2.readAsArrayBuffer(file);
                } else { setUploadStatus('Format nicht unterstuetzt'); }
                e.target.value = '';
            };

            // ── Spracheingabe (globaler Service) ──
            var activeMic = useSpeech();

            // ═══ SUMMEN ═══
            var gpSummeLV = positionen.reduce(function(s, p) { return s + (p.gp || (p.ep * p.menge) || 0); }, 0);
            var gpSummeNachtraege = nachtraege.reduce(function(s, n) { return s + (n.gp || (n.ep * n.menge) || 0); }, 0);
            var gpGesamtNetto = gpSummeLV + gpSummeNachtraege;
            var mwst = Math.round(gpGesamtNetto * 0.19 * 100) / 100;
            var gesamtBrutto = Math.round((gpGesamtNetto + mwst) * 100) / 100;

            // ═══ PDF GENERIERUNG (clientseitig mit jsPDF) ═══
            var handlePdfExport = function() {
                setPdfStatus('PDF wird erstellt...');
                try {
                    if (typeof window.jspdf === 'undefined' && typeof jspdf === 'undefined') {
                        // jsPDF nachladen
                        var script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                        script.onload = function() { generatePdf(); };
                        script.onerror = function() { setPdfStatus('jsPDF konnte nicht geladen werden'); };
                        document.head.appendChild(script);
                    } else {
                        generatePdf();
                    }
                } catch(err) { setPdfStatus('Fehler: ' + err.message); }
            };

            var generatePdf = function() {
                try {
                    var jsPDF = (window.jspdf && window.jspdf.jsPDF) || jspdf.jsPDF;
                    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                    var pageW = 210; var marginL = 15; var marginR = 15; var contentW = pageW - marginL - marginR;
                    var y = 0;

                    var addHeader = function(titel) {
                        doc.setFillColor(250, 250, 248);
                        doc.rect(0, 0, pageW, 297, 'F');
                        // Firmenname
                        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 17, 17);
                        doc.text('Thomas Willwacher Fliesenlegermeister e.K.', marginL, 15);
                        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(85, 85, 85);
                        doc.text('Flurweg 14a \u00b7 56472 Nisterau', marginL, 20);
                        // Trennlinie
                        doc.setDrawColor(192, 57, 43); doc.setLineWidth(0.8);
                        doc.line(marginL, 24, pageW - marginR, 24);
                        // Titel
                        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(192, 57, 43);
                        doc.text(titel, marginL, 32);
                        // Kunde + Datum
                        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(85, 85, 85);
                        var kundeName = stammFelder.bauherr_firma || 'Unbekannt';
                        doc.text('Kunde: ' + kundeName, marginL, 38);
                        doc.text('Datum: ' + new Date().toLocaleDateString('de-DE'), pageW - marginR - 40, 38);
                        return 44;
                    };

                    var addFooter = function(pageNum) {
                        doc.setDrawColor(85, 85, 85); doc.setLineWidth(0.3);
                        doc.line(marginL, 282, pageW - marginR, 282);
                        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(85, 85, 85);
                        doc.text('Thomas Willwacher Fliesenlegermeister e.K. | Flurweg 14a | 56472 Nisterau', marginL, 286);
                        doc.text('Seite ' + pageNum, pageW - marginR - 15, 286);
                    };

                    var checkPage = function(neededH, currentY, pageNum, titel) {
                        if (currentY + neededH > 278) {
                            addFooter(pageNum);
                            doc.addPage();
                            pageNum++;
                            currentY = addHeader(titel);
                        }
                        return { y: currentY, page: pageNum };
                    };

                    // ════════════════════════════════════════════
                    // SEITE 1: KUNDENSTAMMDATEN
                    // ════════════════════════════════════════════
                    var page = 1;
                    y = addHeader('KUNDENSTAMMDATEN');

                    var addStammBlock = function(blockTitle, fields) {
                        var check = checkPage(8 + fields.length * 5.5, y, page, 'KUNDENSTAMMDATEN');
                        y = check.y; page = check.page;
                        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(192, 57, 43);
                        doc.text(blockTitle, marginL, y); y += 1;
                        doc.setDrawColor(192, 57, 43); doc.setLineWidth(0.3);
                        doc.line(marginL, y, marginL + contentW * 0.5, y); y += 4;
                        doc.setFontSize(8); doc.setTextColor(17, 17, 17);
                        for (var i = 0; i < fields.length; i++) {
                            doc.setFont('helvetica', 'normal'); doc.setTextColor(85, 85, 85);
                            doc.text(fields[i][0], marginL, y);
                            doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 17, 17);
                            doc.text(fields[i][1] || '\u2014', marginL + 50, y);
                            y += 5.5;
                        }
                        y += 4;
                    };

                    addStammBlock('BAUHERR / AUFTRAGGEBER', [
                        ['Firma/Name', stammFelder.bauherr_firma], ['Ansprechpartner', stammFelder.bauherr_ansprechpartner],
                        ['Strasse', stammFelder.bauherr_strasse], ['PLZ / Ort', stammFelder.bauherr_plzOrt],
                        ['Telefon', stammFelder.bauherr_telefon], ['Fax', stammFelder.bauherr_fax],
                        ['Mobil', stammFelder.bauherr_mobil], ['E-Mail', stammFelder.bauherr_email]
                    ]);
                    addStammBlock('BAULEITER', [
                        ['Name', stammFelder.bauleiter_name], ['Firma/Dienststelle', stammFelder.bauleiter_firma],
                        ['Strasse', stammFelder.bauleiter_strasse], ['PLZ / Ort', stammFelder.bauleiter_plzOrt],
                        ['Telefon', stammFelder.bauleiter_telefon], ['Mobil', stammFelder.bauleiter_mobil],
                        ['E-Mail', stammFelder.bauleiter_email]
                    ]);
                    addStammBlock('ARCHITEKT / PLANER', [
                        ['Name', stammFelder.architekt_name], ['Buero/Firma', stammFelder.architekt_buero],
                        ['Strasse', stammFelder.architekt_strasse], ['PLZ / Ort', stammFelder.architekt_plzOrt],
                        ['Telefon', stammFelder.architekt_telefon], ['Mobil', stammFelder.architekt_mobil],
                        ['E-Mail', stammFelder.architekt_email]
                    ]);
                    addStammBlock('OBJEKTDATEN', [
                        ['Bauvorhaben', stammFelder.objekt_bauvorhaben], ['Baustelle', stammFelder.objekt_strasse],
                        ['PLZ / Ort', stammFelder.objekt_plzOrt], ['Projektnummer', stammFelder.objekt_projektnr],
                        ['Vergabenummer', stammFelder.objekt_vergabenr], ['Auftragsnummer', stammFelder.objekt_auftragsnr],
                        ['Vergabeart', stammFelder.objekt_vergabeart], ['Auftragsdatum', stammFelder.objekt_auftragsdatum],
                        ['Ausfuehrung von', stammFelder.objekt_ausfuehrung_von], ['Ausfuehrung bis', stammFelder.objekt_ausfuehrung_bis],
                        ['Abnahmedatum', stammFelder.objekt_abnahmedatum]
                    ]);
                    addFooter(page);

                    // ════════════════════════════════════════════
                    // SEITE 2+: LV-POSITIONEN + NACHTRAEGE
                    // ════════════════════════════════════════════
                    doc.addPage(); page++;
                    y = addHeader('LV-POSITIONSLISTE + NACHTRAEGE');

                    // Spaltenbreiten: PosNr(12%) Menge(10%) Einheit(6%) Beschreibung(44%) EP(14%) GP(14%)
                    var colX = [marginL, marginL+21, marginL+39, marginL+49, marginL+128, marginL+153];
                    var colW = [21, 18, 10, 79, 25, 27];

                    // Tabellenkopf
                    var drawTableHeader = function() {
                        doc.setFillColor(240, 240, 240);
                        doc.rect(marginL, y - 3.5, contentW, 5.5, 'F');
                        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 17, 17);
                        doc.text('Pos.-Nr.', colX[0] + 1, y);
                        doc.text('Menge', colX[1] + colW[1] - 1, y, { align: 'right' });
                        doc.text('Einh.', colX[2] + colW[2]/2, y, { align: 'center' });
                        doc.text('Leistungsbeschreibung', colX[3] + 1, y);
                        doc.text('EP (netto)', colX[4] + colW[4] - 1, y, { align: 'right' });
                        doc.text('GP (netto)', colX[5] + colW[5] - 1, y, { align: 'right' });
                        y += 4;
                    };
                    drawTableHeader();

                    // Positionen
                    var drawPosRow = function(p, isNachtrag) {
                        var check = checkPage(7, y, page, 'LV-POSITIONSLISTE + NACHTRAEGE');
                        y = check.y; page = check.page;
                        var gp = p.gp || Math.round((p.menge || 0) * (p.ep || 0) * 100) / 100;
                        // Abwechselnde Zeilen
                        if (!isNachtrag) {
                            doc.setFillColor(250, 250, 250);
                        } else {
                            doc.setFillColor(255, 248, 240);
                        }
                        doc.rect(marginL, y - 3, contentW, 5, 'F');
                        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(17, 17, 17);
                        doc.text(String(p.posNr || ''), colX[0] + 1, y);
                        doc.text(fmtZahl(p.menge), colX[1] + colW[1] - 1, y, { align: 'right' });
                        doc.setFontSize(6);
                        doc.text(p.einheit || '', colX[2] + colW[2]/2, y, { align: 'center' });
                        doc.setFontSize(7);
                        // Beschreibung kuerzen wenn noetig
                        var beschr = p.leistung || '';
                        if (beschr.length > 85) beschr = beschr.substring(0, 82) + '...';
                        doc.text(beschr, colX[3] + 1, y);
                        doc.text(p.ep > 0 ? fmtZahl(p.ep) : '\u2014', colX[4] + colW[4] - 1, y, { align: 'right' });
                        doc.text(gp > 0 ? fmtZahl(gp) : '\u2014', colX[5] + colW[5] - 1, y, { align: 'right' });
                        y += 5;
                    };

                    for (var pi = 0; pi < positionen.length; pi++) { drawPosRow(positionen[pi], false); }

                    // Zwischensumme LV
                    if (positionen.length > 0) {
                        var chk1 = checkPage(8, y, page, 'LV-POSITIONSLISTE + NACHTRAEGE'); y = chk1.y; page = chk1.page;
                        doc.setDrawColor(17, 17, 17); doc.setLineWidth(0.5);
                        doc.line(colX[4], y - 1, colX[5] + colW[5], y - 1);
                        y += 2;
                        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
                        doc.text('Zwischensumme LV-Positionen (netto)', colX[3] + 1, y);
                        doc.text(fmtZahl(gpSummeLV), colX[5] + colW[5] - 1, y, { align: 'right' });
                        y += 6;
                    }

                    // Nachtraege
                    if (nachtraege.length > 0) {
                        var chk2 = checkPage(10, y, page, 'LV-POSITIONSLISTE + NACHTRAEGE'); y = chk2.y; page = chk2.page;
                        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(230, 126, 34);
                        doc.text('\u25bc NACHTRAEGE \u25bc', marginL, y); y += 5;
                        doc.setTextColor(17, 17, 17);
                        drawTableHeader();
                        var lastNTitle = '';
                        for (var ni = 0; ni < nachtraege.length; ni++) {
                            if (nachtraege[ni].nachtragTitel && nachtraege[ni].nachtragTitel !== lastNTitle) {
                                lastNTitle = nachtraege[ni].nachtragTitel;
                                var chkN = checkPage(7, y, page, 'LV-POSITIONSLISTE + NACHTRAEGE'); y = chkN.y; page = chkN.page;
                                doc.setFillColor(255, 235, 205); doc.rect(marginL, y - 3, contentW, 5, 'F');
                                doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(230, 126, 34);
                                doc.text(lastNTitle, marginL + 1, y); y += 5;
                                doc.setTextColor(17, 17, 17);
                            }
                            drawPosRow(nachtraege[ni], true);
                        }
                        // Zwischensumme Nachtraege
                        var chk3 = checkPage(8, y, page, 'LV-POSITIONSLISTE + NACHTRAEGE'); y = chk3.y; page = chk3.page;
                        doc.setDrawColor(230, 126, 34); doc.setLineWidth(0.5);
                        doc.line(colX[4], y - 1, colX[5] + colW[5], y - 1);
                        y += 2;
                        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(230, 126, 34);
                        doc.text('Zwischensumme Nachtraege (netto)', colX[3] + 1, y);
                        doc.text(fmtZahl(gpSummeNachtraege), colX[5] + colW[5] - 1, y, { align: 'right' });
                        y += 6;
                    }

                    // Gesamtsummen
                    var chk4 = checkPage(18, y, page, 'LV-POSITIONSLISTE + NACHTRAEGE'); y = chk4.y; page = chk4.page;
                    doc.setDrawColor(17, 17, 17); doc.setLineWidth(1);
                    doc.line(marginL, y, pageW - marginR, y); y += 5;
                    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 17, 17);
                    doc.text('Gesamt Netto (LV + Nachtraege)', marginL, y);
                    doc.text(fmtZahl(gpGesamtNetto), colX[5] + colW[5] - 1, y, { align: 'right' }); y += 5;
                    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
                    doc.text('zzgl. MwSt. 19%', marginL, y);
                    doc.text(fmtZahl(mwst), colX[5] + colW[5] - 1, y, { align: 'right' }); y += 5;
                    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
                    doc.text('Gesamt Brutto', marginL, y);
                    doc.text(fmtZahl(gesamtBrutto), colX[5] + colW[5] - 1, y, { align: 'right' });
                    addFooter(page);

                    // ════════════════════════════════════════════
                    // SEITE 3+: RAUMLISTE
                    // ════════════════════════════════════════════
                    doc.addPage(); page++;
                    y = addHeader('RAUMLISTE');

                    // Raeume nach Geschoss gruppieren
                    var geschossOrder = { 'KG': 0, 'EG': 1, 'OG': 2, '1.OG': 3, '2.OG': 4, 'DG': 5 };
                    var sortedRaeume = raeume.slice().sort(function(a, b) {
                        var gA = geschossOrder[a.geschoss] !== undefined ? geschossOrder[a.geschoss] : 99;
                        var gB = geschossOrder[b.geschoss] !== undefined ? geschossOrder[b.geschoss] : 99;
                        if (gA !== gB) return gA - gB;
                        return (a.raumNr || '').localeCompare(b.raumNr || '');
                    });

                    // Raumliste Header
                    var rColX = [marginL, marginL + 27, marginL + 90, marginL + 117, marginL + 145];
                    var drawRaumHeader = function() {
                        doc.setFillColor(240, 240, 240);
                        doc.rect(marginL, y - 3.5, contentW, 5.5, 'F');
                        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 17, 17);
                        doc.text('Raum-Nr.', rColX[0] + 1, y);
                        doc.text('Bezeichnung', rColX[1] + 1, y);
                        doc.text('Geschoss', rColX[2] + 1, y);
                        doc.text('Flaeche (m\u00b2)', rColX[3] + 1, y);
                        doc.text('Fliesen', rColX[4] + 1, y);
                        y += 4;
                    };
                    drawRaumHeader();

                    var lastGeschoss = '';
                    for (var ri = 0; ri < sortedRaeume.length; ri++) {
                        var rm = sortedRaeume[ri];
                        // Geschoss-Gruppenueberschrift
                        if (rm.geschoss !== lastGeschoss) {
                            lastGeschoss = rm.geschoss;
                            var chkR = checkPage(10, y, page, 'RAUMLISTE'); y = chkR.y; page = chkR.page;
                            doc.setFillColor(230, 230, 230); doc.rect(marginL, y - 3, contentW, 5, 'F');
                            doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 17, 17);
                            var geschossLabel = rm.geschoss === 'KG' ? 'KELLERGESCHOSS' : rm.geschoss === 'EG' ? 'ERDGESCHOSS' : rm.geschoss === 'OG' ? 'OBERGESCHOSS' : rm.geschoss === 'DG' ? 'DACHGESCHOSS' : rm.geschoss;
                            doc.text(geschossLabel, marginL + 2, y); y += 5;
                        }
                        var chkR2 = checkPage(6, y, page, 'RAUMLISTE'); y = chkR2.y; page = chkR2.page;
                        // Zeilenhintergrund
                        if (rm.fliesenarbeiten === 'Ja') { doc.setFillColor(232, 245, 233); }
                        else { doc.setFillColor(250, 250, 250); }
                        doc.rect(marginL, y - 3, contentW, 5, 'F');
                        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(17, 17, 17);
                        doc.text(rm.raumNr || '', rColX[0] + 1, y);
                        doc.text(rm.bezeichnung || '', rColX[1] + 1, y);
                        doc.text(rm.geschoss || '', rColX[2] + 1, y);
                        doc.text(rm.flaeche > 0 ? fmtZahl(rm.flaeche) : '\u2014', rColX[3] + 1, y);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(rm.fliesenarbeiten === 'Ja' ? 39 : 17, rm.fliesenarbeiten === 'Ja' ? 174 : 17, rm.fliesenarbeiten === 'Ja' ? 96 : 17);
                        doc.text(rm.fliesenarbeiten || '\u2014', rColX[4] + 1, y);
                        y += 5;
                    }

                    // Hinweis
                    y += 4;
                    doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(85, 85, 85);
                    doc.text('Hinweis: Flaechen bitte aus Aufmass ergaenzen.', marginL, y);
                    addFooter(page);

                    // PDF speichern
                    var kundeName = (stammFelder.bauherr_firma || 'Kunde').replace(/[^a-zA-Z0-9\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df _-]/g, '');
                    doc.save('Kundenlisten_' + kundeName + '_' + new Date().toISOString().slice(0,10) + '.pdf');
                    setPdfStatus('PDF erfolgreich erstellt und heruntergeladen!');
                    setTimeout(function() { setPdfStatus(''); }, 4000);
                } catch(err) {
                    setPdfStatus('PDF-Fehler: ' + err.message);
                    console.error('PDF-Fehler:', err);
                }
            };

            // ═══ FERTIGSTELLEN (Weiter zur Modulauswahl) ═══
            var handleFertig = function() {
                if (!stammFelder.bauherr_firma.trim()) { alert('Bitte mindestens den Kundennamen (Bauherr) eingeben.'); return; }
                if (positionen.length === 0 && raeume.length === 0) { alert('Bitte mindestens eine Position oder einen Raum eintragen.'); return; }
                // Alle Positionen + Nachtraege zusammenfuehren
                var allPos = positionen.concat(nachtraege.map(function(n) { return Object.assign({}, n, { _istNachtrag: true }); }));
                onFertig({
                    kundenName: stammFelder.bauherr_firma.trim(),
                    bauvorhaben: stammFelder.objekt_bauvorhaben.trim(),
                    positionen: allPos.map(function(p) { return { posNr: p.posNr, menge: p.menge, einheit: p.einheit, leistung: p.leistung, ep: p.ep, gp: p.gp || Math.round((p.menge||0)*(p.ep||0)*100)/100, _istNachtrag: p._istNachtrag || false }; }),
                    raeume: raeume.map(function(r) { return { raumNr: r.raumNr, bezeichnung: r.bezeichnung, geschoss: r.geschoss, bemerkung: r.fliesenarbeiten === 'Ja' ? 'Fliesenarbeiten' : '' }; }),
                    // Erweiterte Stammdaten
                    bauleitung: stammFelder.bauleiter_name || stammFelder.bauleiter_firma || '',
                    bl_telefon: stammFelder.bauleiter_telefon || '',
                    bl_email: stammFelder.bauleiter_email || '',
                    architekt: stammFelder.architekt_name || stammFelder.architekt_buero || '',
                    arch_telefon: stammFelder.architekt_telefon || '',
                    arch_email: stammFelder.architekt_email || '',
                    ag_adresse: (stammFelder.bauherr_strasse + ', ' + stammFelder.bauherr_plzOrt).trim().replace(/^,\s*|,\s*$/g, ''),
                    ag_telefon: stammFelder.bauherr_telefon || '',
                    ag_email: stammFelder.bauherr_email || '',
                    _driveFolderId: (kunde && kunde._driveFolderId) || null,
                    _stammFelder: stammFelder
                });
            };

            // ═══ TABS ═══
            var tabs = [
                { id: 'stammdaten', label: 'Kundendaten', icon: '\uD83D\uDCCB', count: null },
                { id: 'positionen', label: 'Positionen', icon: '\uD83D\uDCCE', count: positionen.length + nachtraege.length },
                { id: 'raeume', label: 'Raeume', icon: '\uD83C\uDFE0', count: raeume.length }
            ];

            // ═══ SECTION CARD (fuer Stammdaten) ═══
            var sectionCard = function(icon, title, fields) {
                return (
                    <div style={{background:'var(--bg-secondary)', borderRadius:'14px', padding:'16px', marginBottom:'12px', border:'1px solid var(--border-color)'}}>
                        <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)', marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px'}}>
                            <span style={{fontSize:'18px'}}>{icon}</span> {title}
                        </div>
                        <div style={{display:'grid', gap:'8px'}}>
                            {fields.map(function(f) {
                                return (
                                <div key={f[0]}>
                                    <MicLabel fieldKey={'me_' + f[0]} label={f[1]} />
                                    <div style={{display:'flex', gap:'4px'}}>
                                        <MicInput fieldKey={'me_' + f[0]} value={stammFelder[f[0]] || ''} onChange={function(e){ updateStammFeld(f[0], e.target.value); }} style={Object.assign({}, inputStyle, {flex:1})} placeholder={f[2] || ''} />
                                        <MicButton fieldKey={'me_' + f[0]} size="normal" onResult={function(text){ updateStammFeld(f[0], (stammFelder[f[0]] || '') + (stammFelder[f[0]] ? ' ' : '') + text); }} />
                                    </div>
                                </div>
                            ); })}
                        </div>
                    </div>
                );
            };

            // ═══ POS-FORMULAR (shared zwischen Positionen + Nachtraege) ═══
            var renderPosFormular = function(form, setForm, onSave, onCancel, editIdx, isNachtrag) {
                return (
                    <div style={{background:'var(--bg-secondary)', borderRadius:'14px', padding:'16px', marginBottom:'16px', border: isNachtrag ? '2px solid #e67e22' : '2px solid var(--accent-blue)', boxShadow: isNachtrag ? '0 4px 20px rgba(230,126,34,0.15)' : '0 4px 20px rgba(30,136,229,0.15)'}}>
                        <div style={{fontSize:'13px', fontWeight:'700', color: isNachtrag ? '#e67e22' : 'var(--accent-blue)', marginBottom:'12px'}}>
                            {editIdx !== null ? 'Bearbeiten' : (isNachtrag ? 'Neuer Nachtrag' : 'Neue Position')}
                        </div>
                        {isNachtrag && (
                            <div style={{marginBottom:'10px'}}>
                                <MicLabel fieldKey="me_nachtragTitel" label="Nachtrag-Titel" />
                                <div style={{display:'flex', gap:'4px'}}>
                                    <MicInput fieldKey="me_nachtragTitel" type="text" value={form.nachtragTitel || ''} onChange={function(e){ setForm(Object.assign({}, form, {nachtragTitel: e.target.value})); }} placeholder="z.B. Nachtrag vom 20.03.2025" style={Object.assign({}, inputStyle, {flex:1})} />
                                    <MicButton fieldKey="me_nachtragTitel" size="normal" onResult={function(text){ setForm(Object.assign({}, form, {nachtragTitel: (form.nachtragTitel || '') + (form.nachtragTitel ? ' ' : '') + text})); }} />
                                </div>
                            </div>
                        )}
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                            <div>
                                <label style={labelStyle}>Pos.-Nr. *</label>
                                <input type="text" value={form.posNr} onChange={function(e){ setForm(Object.assign({}, form, {posNr: e.target.value})); }} placeholder={isNachtrag ? 'N1' : '1'} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Menge</label>
                                <input type="number" inputMode="decimal" step="0.01" value={form.menge} onChange={function(e){ setForm(Object.assign({}, form, {menge: e.target.value})); }} placeholder="0.00" style={inputStyle} />
                            </div>
                        </div>
                        <div style={{marginTop:'10px'}}>
                            <label style={labelStyle}>Einheit</label>
                            <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                                {einheiten.map(function(eh) {
                                    var isActive = form.einheit === eh;
                                    return <button key={eh} {...tap(function(){ setForm(Object.assign({}, form, {einheit: eh})); })} style={Object.assign({}, touchBase, {
                                        padding:'8px 14px', borderRadius:'8px', border: isActive ? '2px solid ' + (isNachtrag ? '#e67e22' : 'var(--accent-blue)') : '1px solid var(--border-color)',
                                        background: isActive ? (isNachtrag ? 'rgba(230,126,34,0.1)' : 'rgba(30,136,229,0.1)') : 'var(--bg-tertiary)',
                                        color: isActive ? (isNachtrag ? '#e67e22' : 'var(--accent-blue)') : 'var(--text-muted)',
                                        cursor:'pointer', fontSize:'13px', fontWeight:'600', minHeight:'40px'
                                    })}>{eh}</button>;
                                })}
                            </div>
                        </div>
                        <div style={{marginTop:'10px'}}>
                            <MicLabel fieldKey="me_leistung" label="Leistungsbeschreibung *" />
                            <div style={{display:'flex', gap:'4px', alignItems:'flex-start'}}>
                                <MicInput fieldKey="me_leistung" multiline={true} value={form.leistung} onChange={function(e){ setForm(Object.assign({}, form, {leistung: e.target.value})); }}
                                    placeholder="z.B. Bodenfliesen 30x60 liefern und verlegen" rows={3}
                                    style={Object.assign({}, inputStyle, {flex:1, resize:'vertical', fontFamily:'inherit'})} />
                                <MicButton fieldKey="me_leistung" size="normal" onResult={function(text){ setForm(Object.assign({}, form, {leistung: (form.leistung || '') + (form.leistung ? ' ' : '') + text})); }} />
                            </div>
                        </div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'10px'}}>
                            <div>
                                <label style={labelStyle}>EP netto</label>
                                <input type="number" inputMode="decimal" step="0.01" value={form.ep} onChange={function(e){ setForm(Object.assign({}, form, {ep: e.target.value})); }} placeholder="0.00" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>GP netto</label>
                                <input type="number" inputMode="decimal" step="0.01" value={form.gp} onChange={function(e){ setForm(Object.assign({}, form, {gp: e.target.value})); }}
                                    placeholder={form.ep && form.menge ? String(Math.round(parseFloat(form.ep || 0) * parseFloat(form.menge || 0) * 100) / 100) : '0.00'} style={inputStyle} />
                            </div>
                        </div>
                        <div style={{display:'flex', gap:'8px', marginTop:'14px'}}>
                            <button {...tap(onSave)} style={Object.assign({}, touchBase, {
                                flex:1, padding:'14px', borderRadius:'10px', border:'none', cursor:'pointer',
                                background: isNachtrag ? '#e67e22' : 'var(--accent-blue)', color:'white', fontSize:'15px', fontWeight:'700', minHeight:'50px'
                            })}>{editIdx !== null ? 'Speichern' : 'Hinzufuegen'}</button>
                            <button {...tap(onCancel)} style={Object.assign({}, touchBase, {
                                padding:'14px 18px', borderRadius:'10px', border:'1px solid var(--border-color)',
                                background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:'14px', minHeight:'50px'
                            })}>Abbrechen</button>
                        </div>
                    </div>
                );
            };

            // ═══ RENDER ═══

            return (
                <div style={{padding:'12px 16px', minHeight:'100vh', background:'var(--bg-primary)', paddingBottom:'200px'}}>
                    {/* HEADER */}
                    <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px'}}>
                        <button {...tap(onBack)} style={Object.assign({}, touchBase, {background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'var(--text-secondary)', padding:'8px 12px', minHeight:'44px', minWidth:'44px'})}>
                            \u2190
                        </button>
                        <div>
                            <div style={{fontSize:'18px', fontWeight:'800', color:'var(--text-primary)'}}>Manuell Kunde anlegen</div>
                            <div style={{fontSize:'12px', color:'var(--text-muted)'}}>3 Listen: Kundendaten \u00b7 LV-Positionen \u00b7 Raumliste</div>
                        </div>
                    </div>

                    {/* STATUS MESSAGES */}
                    {pdfStatus && (
                        <div style={{padding:'10px 16px', background: pdfStatus.indexOf('erfolgreich') >= 0 ? 'rgba(39,174,96,0.12)' : pdfStatus.indexOf('Fehler') >= 0 ? 'rgba(231,76,60,0.12)' : 'rgba(30,136,229,0.12)', border:'1px solid ' + (pdfStatus.indexOf('erfolgreich') >= 0 ? 'rgba(39,174,96,0.3)' : pdfStatus.indexOf('Fehler') >= 0 ? 'rgba(231,76,60,0.3)' : 'rgba(30,136,229,0.3)'), borderRadius:'10px', marginBottom:'12px', fontSize:'13px', fontWeight:'600', textAlign:'center', color: pdfStatus.indexOf('erfolgreich') >= 0 ? '#27ae60' : pdfStatus.indexOf('Fehler') >= 0 ? '#e74c3c' : 'var(--accent-blue)'}}>
                            {pdfStatus}
                        </div>
                    )}
                    {uploadStatus && (
                        <div style={{padding:'8px 16px', background:'rgba(30,136,229,0.08)', borderRadius:'8px', marginBottom:'8px', fontSize:'12px', fontWeight:'600', color:'var(--accent-blue)', textAlign:'center'}}>
                            {uploadStatus}
                        </div>
                    )}

                    {/* TABS */}
                    <div style={{display:'flex', gap:'4px', marginBottom:'12px', background:'var(--bg-secondary)', borderRadius:'12px', padding:'4px'}}>
                        {tabs.map(function(tab) { var isActive = activeTab === tab.id; return (
                            <button key={tab.id} {...tap(function(){ setActiveTab(tab.id); })} style={Object.assign({ flex:1, padding:'10px 8px', borderRadius:'10px', border:'none', cursor:'pointer', background: isActive ? 'var(--accent-blue)' : 'transparent', color: isActive ? 'white' : 'var(--text-muted)', fontSize:'12px', fontWeight:'700', textAlign:'center', transition:'all 0.15s ease' }, touchBase)}>
                                <span style={{fontSize:'16px', display:'block', marginBottom:'2px'}}>{tab.icon}</span>
                                {tab.label}{tab.count !== null && <span style={{marginLeft:'4px', fontSize:'10px', opacity:0.8}}>({tab.count})</span>}
                            </button>
                        ); })}
                    </div>

                    {/* ═══════════════════════════════════════════ */}
                    {/* TAB: KUNDENSTAMMDATEN                      */}
                    {/* ═══════════════════════════════════════════ */}
                    {activeTab === 'stammdaten' && (
                        <div>
                            {/* Upload Stammdaten */}
                            <div style={{marginBottom:'12px'}}>
                                <label style={Object.assign({}, touchBase, {
                                    display:'block', width:'100%', padding:'10px', borderRadius:'10px', border:'1px dashed var(--border-color)',
                                    background:'var(--bg-tertiary)', cursor:'pointer', textAlign:'center', fontSize:'12px', color:'var(--text-muted)', boxSizing:'border-box'
                                })}>
                                    {'\uD83D\uDCCB'} Kundenstammdaten importieren (CSV/XLSX)
                                    <input type="file" accept=".csv,.tsv,.xlsx,.xls" onChange={function(e){ handleFileUpload(e, 'stammdaten'); }} style={{display:'none'}} />
                                </label>
                                <div style={{fontSize:'10px', color:'var(--text-muted)', textAlign:'center', marginTop:'4px', lineHeight:'1.4'}}>
                                    Format: Spalte A = Feldname (z.B. Firma, Strasse, Telefon), Spalte B = Wert
                                </div>
                            </div>
                            {sectionCard('\uD83C\uDFE2', 'Bauherr / Auftraggeber', [
                                ['bauherr_firma', 'Firma / Name *', 'z.B. Kurhotel Haus Klement'],
                                ['bauherr_ansprechpartner', 'Ansprechpartner', 'Herr/Frau Nachname'],
                                ['bauherr_strasse', 'Strasse', 'Musterstrasse 1'],
                                ['bauherr_plzOrt', 'PLZ / Ort', '12345 Musterstadt'],
                                ['bauherr_telefon', 'Telefon', '0123 / 456789'],
                                ['bauherr_fax', 'Fax', ''],
                                ['bauherr_mobil', 'Mobil', '0170 1234567'],
                                ['bauherr_email', 'E-Mail', 'email@beispiel.de'],
                                ['bauherr_website', 'Website', 'www.beispiel.de']
                            ])}
                            {sectionCard('\uD83D\uDC77', 'Bauleiter', [
                                ['bauleiter_name', 'Name', 'Dipl.-Ing. Mustermann'],
                                ['bauleiter_firma', 'Firma / Dienststelle', 'Architekturbuero XY'],
                                ['bauleiter_strasse', 'Strasse', ''],
                                ['bauleiter_plzOrt', 'PLZ / Ort', ''],
                                ['bauleiter_telefon', 'Telefon', ''],
                                ['bauleiter_mobil', 'Mobil', ''],
                                ['bauleiter_email', 'E-Mail', '']
                            ])}
                            {sectionCard('\uD83D\uDCD0', 'Architekt / Planer', [
                                ['architekt_name', 'Name', ''],
                                ['architekt_buero', 'Buero / Firma', ''],
                                ['architekt_strasse', 'Strasse', ''],
                                ['architekt_plzOrt', 'PLZ / Ort', ''],
                                ['architekt_telefon', 'Telefon', ''],
                                ['architekt_mobil', 'Mobil', ''],
                                ['architekt_email', 'E-Mail', '']
                            ])}
                            {sectionCard('\uD83C\uDFD7', 'Objektdaten', [
                                ['objekt_bauvorhaben', 'Bauvorhaben', 'Sanierung EFH...'],
                                ['objekt_strasse', 'Baustelle - Strasse', ''],
                                ['objekt_plzOrt', 'Baustelle - PLZ / Ort', ''],
                                ['objekt_projektnr', 'Projektnummer', ''],
                                ['objekt_vergabenr', 'Vergabenummer', ''],
                                ['objekt_auftragsnr', 'Auftragsnummer', ''],
                                ['objekt_vergabeart', 'Vergabeart', ''],
                                ['objekt_auftragsdatum', 'Auftragsdatum', 'TT.MM.JJJJ'],
                                ['objekt_ausfuehrung_von', 'Ausfuehrungsfrist von', ''],
                                ['objekt_ausfuehrung_bis', 'Ausfuehrungsfrist bis', ''],
                                ['objekt_abnahmedatum', 'Abnahmedatum', '']
                            ])}
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════ */}
                    {/* TAB: LV-POSITIONEN + NACHTRAEGE            */}
                    {/* ═══════════════════════════════════════════ */}
                    {activeTab === 'positionen' && (
                        <div>
                            {/* Upload */}
                            <div style={{marginBottom:'12px'}}>
                                <label style={Object.assign({}, touchBase, {
                                    display:'block', width:'100%', padding:'10px', borderRadius:'10px', border:'1px dashed var(--border-color)',
                                    background:'var(--bg-tertiary)', cursor:'pointer', textAlign:'center', fontSize:'12px', color:'var(--text-muted)', boxSizing:'border-box'
                                })}>
                                    Positionsliste importieren (CSV/XLSX)
                                    <input type="file" accept=".csv,.tsv,.xlsx,.xls" onChange={function(e){ handleFileUpload(e, 'positionen'); }} style={{display:'none'}} />
                                </label>
                            </div>

                            {/* LV-Positionen */}
                            <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)', marginBottom:'8px', display:'flex', alignItems:'center', gap:'8px'}}>
                                <span style={{color:'var(--accent-blue)'}}>\u25B6</span> LV-Positionen ({positionen.length})
                            </div>
                            <button {...tap(function(){ resetPosForm(); setShowPosForm(true); })} style={Object.assign({}, touchBase, {
                                width:'100%', padding:'12px', borderRadius:'10px', border:'2px dashed var(--accent-blue)',
                                background:'rgba(30,136,229,0.05)', color:'var(--accent-blue)', cursor:'pointer',
                                fontSize:'14px', fontWeight:'700', marginBottom:'12px', minHeight:'48px'
                            })}>+ Neue LV-Position</button>

                            {showPosForm && renderPosFormular(posForm, setPosForm, handleSavePos, resetPosForm, editPosIdx, false)}

                            {/* Positionsliste */}
                            {positionen.length > 0 && (
                                <div style={{background:'var(--bg-secondary)', borderRadius:'14px', border:'1px solid var(--border-color)', overflow:'hidden', marginBottom:'12px'}}>
                                    <div style={{overflowX:'auto'}}>
                                        <div style={{minWidth:'520px'}}>
                                            <div style={{display:'grid', gridTemplateColumns:'50px 50px 36px 1fr 65px 75px', gap:'4px', padding:'6px 8px', fontSize:'10px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', borderBottom:'2px solid var(--border-color)'}}>
                                                <div>Pos-Nr.</div><div style={{textAlign:'right'}}>Menge</div><div style={{textAlign:'center'}}>Einh.</div><div>Beschreibung</div><div style={{textAlign:'right'}}>EP</div><div style={{textAlign:'right'}}>GP</div>
                                            </div>
                                            {positionen.map(function(p, idx) {
                                                var gp = p.gp || Math.round((p.menge||0)*(p.ep||0)*100)/100;
                                                return (
                                                    <div key={idx} style={{display:'grid', gridTemplateColumns:'50px 50px 36px 1fr 65px 75px', gap:'4px', padding:'5px 8px', fontSize:'11px', alignItems:'center', background: idx % 2 === 0 ? 'var(--bg-secondary)' : 'transparent', borderBottom:'1px solid var(--border-color)'}}>
                                                        <div style={{fontWeight:'700', fontSize:'11px'}}>{p.posNr}</div>
                                                        <div style={{textAlign:'right'}}>{fmtZahl(p.menge)}</div>
                                                        <div style={{textAlign:'center', fontSize:'10px', color:'var(--text-muted)'}}>{p.einheit}</div>
                                                        <div style={{fontSize:'10px', lineHeight:'1.3', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={p.leistung}>{p.leistung}</div>
                                                        <div style={{textAlign:'right', fontFamily:'monospace', fontSize:'10px'}}>{fmtEuro(p.ep)}</div>
                                                        <div style={{textAlign:'right', fontFamily:'monospace', fontSize:'10px', fontWeight:'600'}}>{fmtEuro(gp)}</div>
                                                    </div>
                                                );
                                            })}
                                            {/* Zwischensumme */}
                                            <div style={{display:'grid', gridTemplateColumns:'50px 50px 36px 1fr 65px 75px', gap:'4px', padding:'8px', fontWeight:'700', borderTop:'2px solid var(--border-color)'}}>
                                                <div></div><div></div><div></div><div style={{textAlign:'right', fontSize:'11px', color:'var(--text-muted)'}}>Zwischensumme LV:</div><div></div>
                                                <div style={{textAlign:'right', fontFamily:'monospace', fontSize:'12px'}}>{fmtEuro(gpSummeLV)}</div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Bearbeiten/Loeschen pro Zeile */}
                                    <div style={{padding:'8px', display:'flex', gap:'4px', flexWrap:'wrap'}}>
                                        {positionen.map(function(p, idx) {
                                            return (
                                                <div key={idx} style={{display:'flex', gap:'4px', alignItems:'center', background:'var(--bg-tertiary)', borderRadius:'8px', padding:'4px 8px'}}>
                                                    <span style={{fontSize:'10px', fontWeight:'700', color:'var(--accent-blue)'}}>{p.posNr}</span>
                                                    <button {...tap(function(){ handleEditPos(idx); })} style={Object.assign({}, touchBase, {padding:'4px 8px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'transparent', cursor:'pointer', fontSize:'12px'})}>&#9998;</button>
                                                    <button {...tap(function(){ handleDeletePos(idx); })} style={Object.assign({}, touchBase, {padding:'4px 8px', borderRadius:'6px', border:'1px solid rgba(231,76,60,0.3)', background:'transparent', cursor:'pointer', fontSize:'12px', color:'#e74c3c'})}>&#10005;</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* NACHTRAEGE */}
                            <div style={{fontSize:'14px', fontWeight:'700', color:'#e67e22', marginBottom:'8px', marginTop:'16px', display:'flex', alignItems:'center', gap:'8px'}}>
                                <span>\u25BC</span> Nachtraege ({nachtraege.length})
                            </div>
                            <button {...tap(function(){ resetNachtragForm(); setShowNachtragForm(true); })} style={Object.assign({}, touchBase, {
                                width:'100%', padding:'12px', borderRadius:'10px', border:'2px dashed #e67e22',
                                background:'rgba(230,126,34,0.05)', color:'#e67e22', cursor:'pointer',
                                fontSize:'14px', fontWeight:'700', marginBottom:'12px', minHeight:'48px'
                            })}>+ Neuer Nachtrag</button>

                            {showNachtragForm && renderPosFormular(nachtragForm, setNachtragForm, handleSaveNachtrag, resetNachtragForm, editNachtragIdx, true)}

                            {/* Nachtragsliste */}
                            {nachtraege.length > 0 && (
                                <div style={{background:'var(--bg-secondary)', borderRadius:'14px', border:'2px solid rgba(230,126,34,0.3)', overflow:'hidden', marginBottom:'12px'}}>
                                    <div style={{overflowX:'auto'}}>
                                        <div style={{minWidth:'520px'}}>
                                            <div style={{display:'grid', gridTemplateColumns:'50px 50px 36px 1fr 65px 75px', gap:'4px', padding:'6px 8px', fontSize:'10px', fontWeight:'700', color:'#e67e22', textTransform:'uppercase', borderBottom:'2px solid rgba(230,126,34,0.3)'}}>
                                                <div>Pos-Nr.</div><div style={{textAlign:'right'}}>Menge</div><div style={{textAlign:'center'}}>Einh.</div><div>Beschreibung</div><div style={{textAlign:'right'}}>EP</div><div style={{textAlign:'right'}}>GP</div>
                                            </div>
                                            {nachtraege.map(function(n, idx) {
                                                var gp = n.gp || Math.round((n.menge||0)*(n.ep||0)*100)/100;
                                                return (
                                                    <div key={idx}>
                                                        {n.nachtragTitel && (idx === 0 || nachtraege[idx-1].nachtragTitel !== n.nachtragTitel) && (
                                                            <div style={{padding:'5px 8px', background:'rgba(230,126,34,0.08)', fontSize:'11px', fontWeight:'700', color:'#e67e22', borderBottom:'1px solid rgba(230,126,34,0.2)'}}>
                                                                {n.nachtragTitel}
                                                            </div>
                                                        )}
                                                        <div style={{display:'grid', gridTemplateColumns:'50px 50px 36px 1fr 65px 75px', gap:'4px', padding:'5px 8px', fontSize:'11px', alignItems:'center', background:'rgba(230,126,34,0.03)', borderBottom:'1px solid var(--border-color)', borderLeft:'3px solid #e67e22'}}>
                                                            <div style={{fontWeight:'700', color:'#e67e22'}}>{n.posNr}</div>
                                                            <div style={{textAlign:'right'}}>{fmtZahl(n.menge)}</div>
                                                            <div style={{textAlign:'center', fontSize:'10px', color:'var(--text-muted)'}}>{n.einheit}</div>
                                                            <div style={{fontSize:'10px', lineHeight:'1.3', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={n.leistung}>{n.leistung}</div>
                                                            <div style={{textAlign:'right', fontFamily:'monospace', fontSize:'10px'}}>{fmtEuro(n.ep)}</div>
                                                            <div style={{textAlign:'right', fontFamily:'monospace', fontSize:'10px', fontWeight:'600'}}>{fmtEuro(gp)}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div style={{display:'grid', gridTemplateColumns:'50px 50px 36px 1fr 65px 75px', gap:'4px', padding:'8px', fontWeight:'700', borderTop:'2px solid rgba(230,126,34,0.3)'}}>
                                                <div></div><div></div><div></div><div style={{textAlign:'right', fontSize:'11px', color:'#e67e22'}}>Zwischensumme Nachtraege:</div><div></div>
                                                <div style={{textAlign:'right', fontFamily:'monospace', fontSize:'12px', color:'#e67e22'}}>{fmtEuro(gpSummeNachtraege)}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{padding:'8px', display:'flex', gap:'4px', flexWrap:'wrap'}}>
                                        {nachtraege.map(function(n, idx) {
                                            return (
                                                <div key={idx} style={{display:'flex', gap:'4px', alignItems:'center', background:'rgba(230,126,34,0.06)', borderRadius:'8px', padding:'4px 8px'}}>
                                                    <span style={{fontSize:'10px', fontWeight:'700', color:'#e67e22'}}>{n.posNr}</span>
                                                    <button {...tap(function(){ handleEditNachtrag(idx); })} style={Object.assign({}, touchBase, {padding:'4px 8px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'transparent', cursor:'pointer', fontSize:'12px'})}>&#9998;</button>
                                                    <button {...tap(function(){ handleDeleteNachtrag(idx); })} style={Object.assign({}, touchBase, {padding:'4px 8px', borderRadius:'6px', border:'1px solid rgba(231,76,60,0.3)', background:'transparent', cursor:'pointer', fontSize:'12px', color:'#e74c3c'})}>&#10005;</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* GESAMTUEBERSICHT */}
                            {(positionen.length > 0 || nachtraege.length > 0) && (
                                <div style={{background:'var(--bg-secondary)', borderRadius:'14px', padding:'16px', border:'2px solid var(--border-color)', marginTop:'16px'}}>
                                    <div style={{fontSize:'13px', fontWeight:'700', color:'var(--text-primary)', marginBottom:'10px'}}>GESAMTUEBERSICHT</div>
                                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'4px'}}>
                                        <span>Gesamt Netto (LV + Nachtraege)</span>
                                        <span style={{fontWeight:'700', fontFamily:'monospace'}}>{fmtEuro(gpGesamtNetto)}</span>
                                    </div>
                                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', color:'var(--text-muted)', marginBottom:'4px'}}>
                                        <span>zzgl. MwSt. 19%</span>
                                        <span style={{fontFamily:'monospace'}}>{fmtEuro(mwst)}</span>
                                    </div>
                                    <div style={{borderTop:'2px solid var(--text-primary)', paddingTop:'6px', display:'flex', justifyContent:'space-between', fontSize:'15px', fontWeight:'800'}}>
                                        <span>Gesamt Brutto</span>
                                        <span style={{fontFamily:'monospace', color:'var(--accent-blue)'}}>{fmtEuro(gesamtBrutto)}</span>
                                    </div>
                                </div>
                            )}

                            {positionen.length === 0 && nachtraege.length === 0 && (
                                <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-muted)'}}>
                                    <div style={{fontSize:'36px', marginBottom:'8px'}}>{'\uD83D\uDCCE'}</div>
                                    <div>Noch keine Positionen. Fuege deine erste LV-Position oder einen Nachtrag hinzu.</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════ */}
                    {/* TAB: RAUMLISTE                             */}
                    {/* ═══════════════════════════════════════════ */}
                    {activeTab === 'raeume' && (
                        <div>
                            {/* Upload */}
                            <div style={{marginBottom:'12px'}}>
                                <label style={Object.assign({}, touchBase, {
                                    display:'block', width:'100%', padding:'10px', borderRadius:'10px', border:'1px dashed var(--border-color)',
                                    background:'var(--bg-tertiary)', cursor:'pointer', textAlign:'center', fontSize:'12px', color:'var(--text-muted)', boxSizing:'border-box'
                                })}>
                                    Raumliste importieren (CSV/XLSX)
                                    <input type="file" accept=".csv,.tsv,.xlsx,.xls" onChange={function(e){ handleFileUpload(e, 'raeume'); }} style={{display:'none'}} />
                                </label>
                            </div>

                            <button {...tap(function(){ resetRaumForm(); setShowRaumForm(true); })} style={Object.assign({}, touchBase, {
                                width:'100%', padding:'12px', borderRadius:'10px', border:'2px dashed #27ae60',
                                background:'rgba(39,174,96,0.05)', color:'#27ae60', cursor:'pointer',
                                fontSize:'14px', fontWeight:'700', marginBottom:'12px', minHeight:'48px'
                            })}>+ Neuer Raum</button>

                            {/* Raum-Formular */}
                            {showRaumForm && (
                                <div style={{background:'var(--bg-secondary)', borderRadius:'14px', padding:'16px', marginBottom:'16px', border:'2px solid #27ae60', boxShadow:'0 4px 20px rgba(39,174,96,0.15)'}}>
                                    <div style={{fontSize:'13px', fontWeight:'700', color:'#27ae60', marginBottom:'12px'}}>
                                        {editRaumIdx !== null ? 'Raum bearbeiten' : 'Neuer Raum'}
                                    </div>
                                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                                        <div>
                                            <label style={labelStyle}>Raum-Nr.</label>
                                            <input type="text" value={raumForm.raumNr} onChange={function(e){ setRaumForm(Object.assign({}, raumForm, {raumNr: e.target.value})); }} placeholder="z.B. E10, KG-WC" style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Flaeche (m2)</label>
                                            <input type="number" inputMode="decimal" step="0.01" value={raumForm.flaeche} onChange={function(e){ setRaumForm(Object.assign({}, raumForm, {flaeche: e.target.value})); }} placeholder="0.00" style={inputStyle} />
                                        </div>
                                    </div>
                                    <div style={{marginTop:'10px'}}>
                                        <MicLabel fieldKey="me_raumBez" label="Bezeichnung *" />
                                        <div style={{display:'flex', gap:'4px'}}>
                                            <MicInput fieldKey="me_raumBez" type="text" value={raumForm.bezeichnung} onChange={function(e){ setRaumForm(Object.assign({}, raumForm, {bezeichnung: e.target.value})); }}
                                                placeholder="z.B. Bad, Kueche, Flur, WC" style={Object.assign({}, inputStyle, {flex:1})} />
                                            <MicButton fieldKey="me_raumBez" size="normal" onResult={function(text){ setRaumForm(Object.assign({}, raumForm, {bezeichnung: (raumForm.bezeichnung || '') + (raumForm.bezeichnung ? ' ' : '') + text})); }} />
                                        </div>
                                    </div>
                                    <div style={{marginTop:'10px'}}>
                                        <label style={labelStyle}>Geschoss</label>
                                        <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                                            {geschosse.map(function(g) {
                                                var isActive = raumForm.geschoss === g;
                                                return <button key={g} {...tap(function(){ setRaumForm(Object.assign({}, raumForm, {geschoss: g})); })} style={Object.assign({}, touchBase, {
                                                    padding:'8px 14px', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer', minHeight:'40px',
                                                    border: isActive ? '2px solid #27ae60' : '1px solid var(--border-color)',
                                                    background: isActive ? 'rgba(39,174,96,0.1)' : 'var(--bg-tertiary)',
                                                    color: isActive ? '#27ae60' : 'var(--text-muted)'
                                                })}>{g}</button>;
                                            })}
                                        </div>
                                    </div>
                                    <div style={{marginTop:'10px'}}>
                                        <label style={labelStyle}>Fliesenarbeiten</label>
                                        <div style={{display:'flex', gap:'8px'}}>
                                            {['Ja', 'Nein'].map(function(opt) {
                                                var isActive = raumForm.fliesenarbeiten === opt;
                                                return <button key={opt} {...tap(function(){ setRaumForm(Object.assign({}, raumForm, {fliesenarbeiten: opt})); })} style={Object.assign({}, touchBase, {
                                                    flex:1, padding:'10px', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer', minHeight:'44px',
                                                    border: isActive ? '2px solid ' + (opt === 'Ja' ? '#27ae60' : '#e74c3c') : '1px solid var(--border-color)',
                                                    background: isActive ? (opt === 'Ja' ? 'rgba(39,174,96,0.1)' : 'rgba(231,76,60,0.1)') : 'var(--bg-tertiary)',
                                                    color: isActive ? (opt === 'Ja' ? '#27ae60' : '#e74c3c') : 'var(--text-muted)'
                                                })}>{opt}</button>;
                                            })}
                                        </div>
                                    </div>
                                    <div style={{display:'flex', gap:'8px', marginTop:'14px'}}>
                                        <button {...tap(handleSaveRaum)} style={Object.assign({}, touchBase, {
                                            flex:1, padding:'14px', borderRadius:'10px', border:'none', cursor:'pointer',
                                            background:'#27ae60', color:'white', fontSize:'15px', fontWeight:'700', minHeight:'50px'
                                        })}>{editRaumIdx !== null ? 'Speichern' : 'Hinzufuegen'}</button>
                                        <button {...tap(resetRaumForm)} style={Object.assign({}, touchBase, {
                                            padding:'14px 18px', borderRadius:'10px', border:'1px solid var(--border-color)',
                                            background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:'14px', minHeight:'50px'
                                        })}>Abbrechen</button>
                                    </div>
                                </div>
                            )}

                            {/* Raumliste Tabelle */}
                            {raeume.length > 0 && (
                                <div style={{background:'var(--bg-secondary)', borderRadius:'14px', border:'1px solid var(--border-color)', overflow:'hidden'}}>
                                    <div style={{overflowX:'auto'}}>
                                        <div style={{minWidth:'420px'}}>
                                            <div style={{display:'grid', gridTemplateColumns:'65px 1fr 55px 65px 60px', gap:'4px', padding:'6px 8px', fontSize:'10px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', borderBottom:'2px solid var(--border-color)'}}>
                                                <div>Raum-Nr.</div><div>Bezeichnung</div><div style={{textAlign:'center'}}>Gesch.</div><div style={{textAlign:'right'}}>Flaeche</div><div style={{textAlign:'center'}}>Fliesen</div>
                                            </div>
                                            {(function() {
                                                var sorted = raeume.slice().sort(function(a, b) {
                                                    var gO = { 'KG': 0, 'EG': 1, 'OG': 2, '1.OG': 3, '2.OG': 4, 'DG': 5 };
                                                    var gA = gO[a.geschoss] !== undefined ? gO[a.geschoss] : 99;
                                                    var gB = gO[b.geschoss] !== undefined ? gO[b.geschoss] : 99;
                                                    if (gA !== gB) return gA - gB;
                                                    return (a.raumNr || '').localeCompare(b.raumNr || '');
                                                });
                                                var lastG = '';
                                                var elements = [];
                                                for (var i = 0; i < sorted.length; i++) {
                                                    var rm = sorted[i];
                                                    var origIdx = raeume.indexOf(rm);
                                                    if (rm.geschoss !== lastG) {
                                                        lastG = rm.geschoss;
                                                        var gLabel = rm.geschoss === 'KG' ? 'KELLERGESCHOSS' : rm.geschoss === 'EG' ? 'ERDGESCHOSS' : rm.geschoss === 'OG' ? 'OBERGESCHOSS' : rm.geschoss === 'DG' ? 'DACHGESCHOSS' : rm.geschoss;
                                                        elements.push(
                                                            <div key={'g-' + lastG} style={{gridColumn:'1/-1', padding:'6px 8px', background:'var(--bg-tertiary)', fontWeight:'700', fontSize:'11px', color:'var(--text-primary)', borderBottom:'1px solid var(--border-color)'}}>
                                                                {gLabel}
                                                            </div>
                                                        );
                                                    }
                                                    elements.push(
                                                        <div key={'r-' + i} style={{display:'grid', gridTemplateColumns:'65px 1fr 55px 65px 60px', gap:'4px', padding:'5px 8px', fontSize:'11px', alignItems:'center', background: rm.fliesenarbeiten === 'Ja' ? 'rgba(39,174,96,0.04)' : 'transparent', borderBottom:'1px solid var(--border-color)'}}>
                                                            <div style={{fontWeight:'700'}}>{rm.raumNr}</div>
                                                            <div>{rm.bezeichnung}</div>
                                                            <div style={{textAlign:'center', fontSize:'10px', color:'var(--text-muted)'}}>{rm.geschoss}</div>
                                                            <div style={{textAlign:'right'}}>{rm.flaeche > 0 ? fmtZahl(rm.flaeche) : '\u2014'}</div>
                                                            <div style={{textAlign:'center', fontWeight:'700', color: rm.fliesenarbeiten === 'Ja' ? '#27ae60' : 'var(--text-muted)'}}>{rm.fliesenarbeiten}</div>
                                                        </div>
                                                    );
                                                }
                                                return elements;
                                            })()}
                                        </div>
                                    </div>
                                    {/* Bearbeiten/Loeschen */}
                                    <div style={{padding:'8px', display:'flex', gap:'4px', flexWrap:'wrap'}}>
                                        {raeume.map(function(r, idx) {
                                            return (
                                                <div key={idx} style={{display:'flex', gap:'4px', alignItems:'center', background:'rgba(39,174,96,0.06)', borderRadius:'8px', padding:'4px 8px'}}>
                                                    <span style={{fontSize:'10px', fontWeight:'700', color:'#27ae60'}}>{r.raumNr || r.bezeichnung}</span>
                                                    <button {...tap(function(){ handleEditRaum(idx); })} style={Object.assign({}, touchBase, {padding:'4px 8px', borderRadius:'6px', border:'1px solid var(--border-color)', background:'transparent', cursor:'pointer', fontSize:'12px'})}>&#9998;</button>
                                                    <button {...tap(function(){ handleDeleteRaum(idx); })} style={Object.assign({}, touchBase, {padding:'4px 8px', borderRadius:'6px', border:'1px solid rgba(231,76,60,0.3)', background:'transparent', cursor:'pointer', fontSize:'12px', color:'#e74c3c'})}>&#10005;</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {raeume.length === 0 && !showRaumForm && (
                                <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-muted)'}}>
                                    <div style={{fontSize:'36px', marginBottom:'8px'}}>{'\uD83C\uDFE0'}</div>
                                    <div>Noch keine Raeume. Fuege deinen ersten Raum hinzu oder importiere eine Liste.</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ BOTTOM BUTTONS (FIXED) ═══ */}
                    <div style={{position:'fixed', bottom:0, left:0, right:0, padding:'12px 16px 20px', background:'linear-gradient(transparent, var(--bg-primary) 20%)', zIndex:100}}>
                        <div style={{maxWidth:'600px', margin:'0 auto'}}>
                            {/* Zusammenfassung */}
                            {(positionen.length > 0 || raeume.length > 0 || nachtraege.length > 0) && (
                                <div style={{background:'rgba(39,174,96,0.08)', borderRadius:'10px', padding:'8px 12px', marginBottom:'8px', fontSize:'11px', color:'var(--text-secondary)', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'4px'}}>
                                    <span>{positionen.length} Pos. + {nachtraege.length} Nachtr. + {raeume.length} Raeume</span>
                                    {gpGesamtNetto > 0 && <span style={{fontWeight:'700', color:'var(--accent-blue)'}}>{fmtEuro(gesamtBrutto)} brutto</span>}
                                </div>
                            )}
                            <div style={{display:'flex', gap:'8px'}}>
                                <button {...tap(handlePdfExport)} disabled={positionen.length === 0 && raeume.length === 0 && nachtraege.length === 0} style={Object.assign({}, touchBase, {
                                    flex:'0 0 auto', padding:'12px 16px', borderRadius:'12px', border:'2px solid #c0392b', cursor:'pointer',
                                    background: (positionen.length === 0 && raeume.length === 0 && nachtraege.length === 0) ? 'var(--bg-tertiary)' : 'rgba(192,57,43,0.08)',
                                    color: (positionen.length === 0 && raeume.length === 0 && nachtraege.length === 0) ? 'var(--text-muted)' : '#c0392b',
                                    fontSize:'13px', fontWeight:'700'
                                })}>
                                    PDF
                                </button>
                                <button {...tap(handleFertig)} disabled={!stammFelder.bauherr_firma.trim() || (positionen.length === 0 && raeume.length === 0)} style={Object.assign({}, touchBase, {
                                    flex:1, padding:'12px', borderRadius:'12px', border:'none', cursor:'pointer',
                                    background: (!stammFelder.bauherr_firma.trim() || (positionen.length === 0 && raeume.length === 0)) ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)',
                                    color: (!stammFelder.bauherr_firma.trim() || (positionen.length === 0 && raeume.length === 0)) ? 'var(--text-muted)' : 'white',
                                    fontSize:'14px', fontWeight:'700', boxShadow: (!stammFelder.bauherr_firma.trim() || (positionen.length === 0 && raeume.length === 0)) ? 'none' : '0 4px 12px rgba(39,174,96,0.3)'
                                })}>
                                    Speichern & Weiter zur Modulauswahl
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }


        /* ═══════════════════════════════════════════
           ANALYSE-KONFIGURATION -- Ordner-Auswahl
           ═══════════════════════════════════════════ */
        function AnalyseKonfiguration({ kunde, onStart, onDatenLaden, onAbbrechen, onWeiterZuModulen, onBack, loading, loadProgress, importResult }) {
            const [selectedFolders, setSelectedFolders] = useState({});
            const [includeRootFiles, setIncludeRootFiles] = useState(true);
            const [kiModelPref, setKiModelPref] = useState(localStorage.getItem('gemini_model_pref') || 'pro');
            const [syncStatus, setSyncStatus] = useState('');
            const [expandedFolders, setExpandedFolders] = useState({});
            const [previewFile, setPreviewFile] = useState(null);
            const [previewLoading, setPreviewLoading] = useState(false);
            const [previewUrl, setPreviewUrl] = useState(null);
            const [vorabAkteMode, setVorabAkteMode] = useState(false);
            const [vorabAkteFile, setVorabAkteFile] = useState(null);
            const [vorabAkteLoading, setVorabAkteLoading] = useState(false);

            // Ordner aufklappen/zuklappen
            var toggleExpand = function(folderName, e) {
                if (e) e.stopPropagation();
                setExpandedFolders(function(prev) {
                    var n = Object.assign({}, prev);
                    n[folderName] = !n[folderName];
                    return n;
                });
            };

            // Datei öffnen/Vorschau
            var handleOpenFile = async function(file, e) {
                if (e) e.stopPropagation();
                if (!file || !file.id) {
                    alert('Datei-ID nicht vorhanden. Bitte erst Daten laden.');
                    return;
                }
                try {
                    setPreviewLoading(true);
                    setPreviewFile(file);

                    // Google Drive Vorschau-URL generieren
                    var fileType = (file.name || '').toLowerCase();
                    if (fileType.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
                        // Bild: Thumbnail von Drive laden
                        var url = 'https://drive.google.com/thumbnail?id=' + file.id + '&sz=w800';
                        setPreviewUrl(url);
                    } else if (fileType.match(/\.(pdf|docx|doc|xlsx|xls|csv|pptx|ppt|txt)$/)) {
                        // PDF, Office, Text: Google Drive native Vorschau (funktioniert zuverlässig für alle Typen)
                        var url = 'https://drive.google.com/file/d/' + file.id + '/preview';
                        setPreviewUrl(url);
                    } else {
                        // Sonstige: Direkt in Google Drive öffnen (neuer Tab)
                        window.open('https://drive.google.com/file/d/' + file.id + '/view', '_blank');
                        setPreviewFile(null);
                    }
                } catch(err) {
                    console.error('Datei-Vorschau Fehler:', err);
                    alert('Fehler beim Öffnen: ' + err.message);
                    setPreviewFile(null);
                }
                setPreviewLoading(false);
            };

            // Datei-Icon basierend auf Dateiname
            var getFileIcon = function(name) {
                var n = (name || '').toLowerCase();
                if (n.match(/\.pdf$/)) return '📕';
                if (n.match(/\.(xlsx|xls|csv)$/)) return '📊';
                if (n.match(/\.(docx|doc)$/)) return '📝';
                if (n.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return '🖼️';
                if (n.match(/\.(dwg|dxf)$/)) return '📐';
                if (n.match(/\.(zip|rar|7z)$/)) return '📦';
                if (n.match(/\.(msg|eml)$/)) return '✉️';
                return '📄';
            };

            // Dateigröße formatieren
            var formatSize = function(bytes) {
                if (!bytes) return '';
                if (bytes < 1024) return bytes + ' B';
                if (bytes < 1024*1024) return (bytes/1024).toFixed(0) + ' KB';
                return (bytes/(1024*1024)).toFixed(1) + ' MB';
            };

            // Ordner aus dem Kunden-Objekt
            var folders = (kunde.folders || []);
            var rootFiles = (kunde.files || []);

            // Standard-Ordner (ORDNER_ANALYSE_CONFIG) für Anzeige
            var standardOrdner = ORDNER_ANALYSE_CONFIG.ORDNER;

            var toggleFolder = function(name) {
                setSelectedFolders(function(prev) {
                    var n = Object.assign({}, prev);
                    n[name] = !n[name];
                    return n;
                });
            };

            var selectAll = function() {
                var n = {};
                folders.forEach(function(f) { n[f.name] = true; });
                setSelectedFolders(n);
            };

            var deselectAll = function() {
                setSelectedFolders({});
            };

            var allSelected = folders.length > 0 && folders.every(function(f) { return !!selectedFolders[f.name]; });

            var selectedCount = Object.values(selectedFolders).filter(Boolean).length;
            var totalFiles = folders.reduce(function(s, f) { return s + (f.files || []).length; }, 0) + rootFiles.length;
            var selectedFiles = 0;
            folders.forEach(function(f) {
                if (selectedFolders[f.name]) selectedFiles += (f.files || []).length;
            });
            if (includeRootFiles) selectedFiles += rootFiles.length;

            // Ordner-Icons
            var getOrdnerIcon = function(name) {
                var lower = name.toLowerCase();
                if (lower.match(/vertrag|auswertung|01/)) return '📋';
                if (lower.match(/lv|leistung|angebot|nachtrag|02/)) return '📑';
                if (lower.match(/plan|zeichnung|03/)) return '📐';
                if (lower.match(/nachtrag|stunden|04/)) return '⏱️';
                if (lower.match(/schrift|mail|05/)) return '✉️';
                if (lower.match(/aufma|abrechnung|06/)) return '📏';
                if (lower.match(/rechnung|konto|07/)) return '💰';
                if (lower.match(/lieferant|material|08/)) return '🏗️';
                return '📁';
            };

            // ── Daten aus ausgewählten Ordnern laden (ruft echte Drive-Lade-Logik auf) ──
            var handleDatenLaden = function() {
                window._kiDisabled = true; // KI deaktivieren -- nur Daten laden, keine KI-Analyse
                if (selectedCount === 0 && !includeRootFiles) {
                    // Alle Ordner laden
                    if (onDatenLaden) {
                        onDatenLaden({ mode: 'komplett', selectedFolders: null, includeRootFiles: true });
                    } else {
                        onStart({ mode: 'komplett', selectedFolders: null, includeRootFiles: true });
                    }
                } else {
                    var sel = [];
                    Object.keys(selectedFolders).forEach(function(k) {
                        if (selectedFolders[k]) sel.push(k);
                    });
                    if (sel.length === 0 && !includeRootFiles) {
                        alert('Bitte mindestens einen Ordner auswählen!');
                        return;
                    }
                    if (onDatenLaden) {
                        onDatenLaden({ mode: 'ordner', selectedFolders: sel, includeRootFiles: includeRootFiles });
                    } else {
                        onStart({ mode: 'ordner', selectedFolders: sel, includeRootFiles: includeRootFiles });
                    }
                }
            };

            // ── KI-Analyse starten (ruft echte Analyse-Logik auf) ──
            var handleAnalyse = function() {
                window._kiDisabled = false; // KI aktivieren!
                if (selectedCount === 0 && !includeRootFiles) {
                    // Alle Ordner analysieren
                    onStart({ mode: 'komplett', selectedFolders: null, includeRootFiles: true });
                } else {
                    var sel = [];
                    Object.keys(selectedFolders).forEach(function(k) {
                        if (selectedFolders[k]) sel.push(k);
                    });
                    if (sel.length === 0 && !includeRootFiles) {
                        alert('Bitte mindestens einen Ordner auswählen!');
                        return;
                    }
                    onStart({ mode: 'ordner', selectedFolders: sel, includeRootFiles: includeRootFiles });
                }
            };

            // ── Offline → Online Sync (lokale Daten → Google Drive) ──
            var handleSync = async function() {
                setSyncStatus('Synchronisiere...');
                try {
                    if (!window.GoogleDriveService.isConnected()) {
                        setSyncStatus('⚠ Keine Google Drive Verbindung. Bitte erst verbinden.');
                        return;
                    }
                    if (!kunde._driveFolderId) {
                        setSyncStatus('⚠ Kein Drive-Ordner für diesen Kunden.');
                        return;
                    }

                    // Lokale Kundendaten finden
                    var localKey = 'aufmass_kunde_' + (kunde._driveFolderId || kunde.id || kunde.name || '').replace(/[^a-zA-Z0-9]/g, '_');
                    var localData = localStorage.getItem(localKey);

                    if (!localData) {
                        // Auch nach alternativem Key suchen
                        var keys = Object.keys(localStorage).filter(function(k) { return k.indexOf('aufmass_kunde_') === 0; });
                        for (var ki = 0; ki < keys.length; ki++) {
                            try {
                                var d = JSON.parse(localStorage.getItem(keys[ki]));
                                if (d && d.name === kunde.name) { localData = localStorage.getItem(keys[ki]); break; }
                            } catch(e) {}
                        }
                    }

                    if (localData) {
                        setSyncStatus('📤 Lade lokale Daten hoch...');
                        var parsed = JSON.parse(localData);

                        // JSON-Backup nach Drive hochladen
                        var syncOrdnerId = await window.GoogleDriveService.findOrCreateFolder(kunde._driveFolderId, (window.DRIVE_ORDNER && window.DRIVE_ORDNER.aufmass) || 'Aufma\u00df');
                        var datumStr = new Date().toISOString().split('T')[0];
                        var jsonBlob = new Blob([JSON.stringify(parsed, null, 2)], {type: 'application/json'});
                        await window.GoogleDriveService.uploadFile(syncOrdnerId, 'Offline_Sync_' + datumStr + '.json', 'application/json', jsonBlob);

                        setSyncStatus('✅ Sync abgeschlossen -- Daten in Drive hochgeladen!');
                    } else {
                        setSyncStatus('ℹ Keine lokalen Offline-Daten für diesen Kunden vorhanden.');
                    }
                } catch(e) {
                    setSyncStatus('❌ Sync-Fehler: ' + e.message);
                    console.error('Sync-Fehler:', e);
                }
            };

            return (
                <div className="page-container" style={{padding:'16px', minHeight:'100vh'}}>
                    {/* Header */}
                    <div style={{textAlign:'center', marginBottom:'16px'}}>
                        <div style={{fontSize:'11px', color:'var(--accent-blue)', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'4px', fontWeight:'600'}}>
                            Analyseseite
                        </div>
                        <div style={{fontSize:'17px', fontWeight:'700', color:'#ffffff'}}>{kunde.name}</div>
                        <div style={{fontSize:'12px', color:'var(--text-secondary)', marginTop:'4px'}}>{totalFiles} Dateien in {folders.length} Ordnern</div>
                    </div>

                    {/* ═══ ORDNER-AUSWAHL + AKTIONS-BUTTONS ═══ */}
                    <div style={{display:'flex', gap:'12px', marginBottom:'14px', flexWrap:'wrap'}}>

                        {/* Linke Spalte: Ordner-Liste */}
                        <div style={{flex:'1 1 280px', background:'var(--bg-secondary)', borderRadius:'12px', padding:'12px', border:'1px solid var(--border-color)'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                                <div style={{fontSize:'13px', fontWeight:'700', color:'#ffffff'}}>📂 Ordner auswählen</div>
                                <button onClick={allSelected ? deselectAll : selectAll} style={{fontSize:'11px', color:'#4da6ff', background:'none', border:'none', cursor:'pointer', fontWeight:'700'}}>
                                    {allSelected ? '✕ Keine' : '☑ Alle'}
                                </button>
                            </div>

                            {folders.map(function(folder) {
                                var fileCount = (folder.files || []).length;
                                var isSelected = !!selectedFolders[folder.name];
                                var isExpanded = !!expandedFolders[folder.name];
                                var folderFiles = folder.files || [];
                                return (
                                    <div key={folder.name} style={{marginBottom:'3px'}}>
                                        {/* Ordner-Zeile */}
                                        <div style={{display:'flex', alignItems:'center', gap:'6px', padding:'8px',
                                            borderRadius: isExpanded ? '8px 8px 0 0' : '8px', cursor:'pointer',
                                            background: isSelected ? 'rgba(39,174,96,0.08)' : 'transparent',
                                            border: isSelected ? '1px solid rgba(39,174,96,0.3)' : '1px solid transparent',
                                            borderBottom: isExpanded ? '1px solid var(--border-color)' : (isSelected ? '1px solid rgba(39,174,96,0.3)' : '1px solid transparent'),
                                            transition:'all 0.2s'}}>
                                            {/* Checkbox -- toggelt Auswahl */}
                                            <span onClick={function(e){ e.stopPropagation(); toggleFolder(folder.name); }}
                                                style={{fontSize:'16px', width:'20px', textAlign:'center', cursor:'pointer'}}>
                                                {isSelected ? '✅' : '⬜'}
                                            </span>
                                            {/* Aufklapp-Pfeil + Ordner-Info -- toggelt Expand */}
                                            <div onClick={function(){ toggleExpand(folder.name); }}
                                                style={{flex:1, display:'flex', alignItems:'center', gap:'6px', minWidth:0, cursor:'pointer'}}>
                                                <span style={{fontSize:'12px', color:'var(--text-muted)', transition:'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display:'inline-block', width:'14px', textAlign:'center'}}>▶</span>
                                                <span style={{fontSize:'16px'}}>{getOrdnerIcon(folder.name)}</span>
                                                <div style={{flex:1, minWidth:0}}>
                                                    <div style={{fontSize:'12px', fontWeight:'600', color: isSelected ? '#4ade80' : '#d8e2ee', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{folder.name}</div>
                                                    <div style={{fontSize:'10px', color:'var(--text-secondary)'}}>{fileCount} Dateien</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dateiliste (aufgeklappt) */}
                                        {isExpanded && folderFiles.length > 0 && (
                                            <div style={{
                                                background: isSelected ? 'rgba(39,174,96,0.03)' : 'var(--bg-tertiary)',
                                                borderRadius:'0 0 8px 8px',
                                                border: isSelected ? '1px solid rgba(39,174,96,0.3)' : '1px solid var(--border-color)',
                                                borderTop:'none',
                                                padding:'4px 0',
                                                maxHeight:'280px', overflowY:'auto'
                                            }}>
                                                {folderFiles.map(function(file, fi) {
                                                    return (
                                                        <div key={fi} style={{
                                                            display:'flex', alignItems:'center', gap:'6px',
                                                            padding:'6px 10px 6px 36px',
                                                            fontSize:'11px', color:'#c8d6e5',
                                                            borderBottom: fi < folderFiles.length - 1 ? '1px solid rgba(128,128,128,0.08)' : 'none',
                                                            cursor:'pointer',
                                                            transition:'background 0.15s'
                                                        }}
                                                        onMouseEnter={function(e){ e.currentTarget.style.background= vorabAkteMode ? 'rgba(233,30,99,0.1)' : 'rgba(30,136,229,0.06)'; }}
                                                        onMouseLeave={function(e){ e.currentTarget.style.background='transparent'; }}
                                                        onClick={function(e){
                                                            if (vorabAkteMode) {
                                                                e.stopPropagation();
                                                                setVorabAkteFile(Object.assign({}, file, { _folderName: folder.name }));
                                                            } else {
                                                                handleOpenFile(file, e);
                                                            }
                                                        }}>
                                                            <span style={{fontSize:'13px', flexShrink:0}}>{getFileIcon(file.name)}</span>
                                                            <div style={{flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:'500',
                                                                color: vorabAkteFile && vorabAkteFile.id === file.id ? '#E91E63' : 'inherit'}}>
                                                                {file.name}
                                                            </div>
                                                            {file.size && (
                                                                <span style={{fontSize:'9px', color:'var(--text-muted)', flexShrink:0}}>{formatSize(file.size)}</span>
                                                            )}
                                                            <span style={{fontSize:'9px', flexShrink:0, fontWeight:'700', opacity:0.7,
                                                                color: vorabAkteMode ? '#E91E63' : 'var(--accent-blue)'}}>
                                                                {vorabAkteMode ? (vorabAkteFile && vorabAkteFile.id === file.id ? '✓ Gewählt' : 'Wählen') : 'Öffnen'}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {isExpanded && folderFiles.length === 0 && (
                                            <div style={{
                                                background:'var(--bg-tertiary)', borderRadius:'0 0 8px 8px',
                                                border:'1px solid var(--border-color)', borderTop:'none',
                                                padding:'12px 16px', fontSize:'11px', color:'var(--text-muted)', textAlign:'center', fontStyle:'italic'
                                            }}>
                                                Keine Dateien in diesem Ordner
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Root-Dateien */}
                            {rootFiles.length > 0 && (
                                <div style={{marginTop:'4px'}}>
                                    <div onClick={function(){ setIncludeRootFiles(!includeRootFiles); }}
                                        style={{display:'flex', alignItems:'center', gap:'6px', padding:'8px',
                                            borderRadius: expandedFolders['__root__'] ? '8px 8px 0 0' : '8px', cursor:'pointer',
                                            background: includeRootFiles ? 'rgba(39,174,96,0.08)' : 'transparent',
                                            border: includeRootFiles ? '1px solid rgba(39,174,96,0.3)' : '1px solid transparent',
                                            borderTop:'1px solid var(--border-color)'}}>
                                        <span style={{fontSize:'16px', width:'20px', textAlign:'center'}}>
                                            {includeRootFiles ? '✅' : '⬜'}
                                        </span>
                                        <div onClick={function(e){ e.stopPropagation(); toggleExpand('__root__'); }}
                                            style={{flex:1, display:'flex', alignItems:'center', gap:'6px', cursor:'pointer'}}>
                                            <span style={{fontSize:'12px', color:'var(--text-muted)', transition:'transform 0.2s', transform: expandedFolders['__root__'] ? 'rotate(90deg)' : 'rotate(0deg)', display:'inline-block', width:'14px', textAlign:'center'}}>▶</span>
                                            <span style={{fontSize:'16px'}}>📄</span>
                                            <div style={{flex:1}}>
                                                <div style={{fontSize:'12px', fontWeight:'600', color: includeRootFiles ? '#27ae60' : 'var(--text-primary)'}}>Dateien im Hauptordner</div>
                                                <div style={{fontSize:'10px', color:'var(--text-muted)'}}>{rootFiles.length} Dateien</div>
                                            </div>
                                        </div>
                                    </div>
                                    {expandedFolders['__root__'] && (
                                        <div style={{
                                            background:'var(--bg-tertiary)', borderRadius:'0 0 8px 8px',
                                            border:'1px solid var(--border-color)', borderTop:'none',
                                            padding:'4px 0', maxHeight:'200px', overflowY:'auto'
                                        }}>
                                            {rootFiles.map(function(file, fi) {
                                                return (
                                                    <div key={fi} style={{
                                                        display:'flex', alignItems:'center', gap:'6px',
                                                        padding:'6px 10px 6px 36px',
                                                        fontSize:'11px', color:'#c8d6e5',
                                                        borderBottom: fi < rootFiles.length - 1 ? '1px solid rgba(128,128,128,0.08)' : 'none',
                                                        cursor:'pointer', transition:'background 0.15s'
                                                    }}
                                                    onMouseEnter={function(e){ e.currentTarget.style.background= vorabAkteMode ? 'rgba(233,30,99,0.1)' : 'rgba(30,136,229,0.06)'; }}
                                                    onMouseLeave={function(e){ e.currentTarget.style.background='transparent'; }}
                                                    onClick={function(e){
                                                        if (vorabAkteMode) {
                                                            e.stopPropagation();
                                                            setVorabAkteFile(Object.assign({}, file, { _folderName: 'Hauptordner' }));
                                                        } else {
                                                            handleOpenFile(file, e);
                                                        }
                                                    }}>
                                                        <span style={{fontSize:'13px', flexShrink:0}}>{getFileIcon(file.name)}</span>
                                                        <div style={{flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:'500',
                                                            color: vorabAkteFile && vorabAkteFile.id === file.id ? '#E91E63' : 'inherit'}}>
                                                            {file.name}
                                                        </div>
                                                        {file.size && (
                                                            <span style={{fontSize:'9px', color:'var(--text-muted)', flexShrink:0}}>{formatSize(file.size)}</span>
                                                        )}
                                                        <span style={{fontSize:'9px', flexShrink:0, fontWeight:'700', opacity:0.7,
                                                            color: vorabAkteMode ? '#E91E63' : 'var(--accent-blue)'}}>
                                                            {vorabAkteMode ? (vorabAkteFile && vorabAkteFile.id === file.id ? '✓ Gewählt' : 'Wählen') : 'Öffnen'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Info */}
                            <div style={{marginTop:'8px', fontSize:'11px', color:'var(--text-muted)', textAlign:'center'}}>
                                {selectedCount > 0 ? selectedCount + ' Ordner ausgewählt (' + selectedFiles + ' Dateien)' : 'Ordner auswählen oder auf ▶ tippen zum Aufklappen'}
                            </div>
                        </div>

                        {/* Rechte Spalte: Aktions-Buttons */}
                        <div style={{flex:'1 1 220px', display:'flex', flexDirection:'column', gap:'10px'}}>

                            {/* Button 1: Daten laden + synchronisieren */}
                            <button onClick={handleDatenLaden}
                                style={{padding:'16px', borderRadius:'12px', border:'none', cursor:'pointer',
                                    background:'linear-gradient(135deg, #27ae60 0%, #1E8449 100%)',
                                    color:'white', fontSize:'14px', fontWeight:'700', textAlign:'center',
                                    boxShadow:'0 4px 12px rgba(39,174,96,0.3)'}}>
                                📥 Daten aus Ordnern laden + synchronisieren
                                <div style={{fontSize:'10px', fontWeight:'400', marginTop:'4px', opacity:0.8}}>
                                    {selectedCount > 0 ? 'Nur ausgewählte Ordner (' + selectedCount + ')' : 'Alle Ordner'}
                                </div>
                            </button>

                            {/* Button 2: Akte wählen und KI-Analyse starten */}
                            <button onClick={handleAnalyse}
                                style={{padding:'16px', borderRadius:'12px', border:'none', cursor:'pointer',
                                    background:'linear-gradient(135deg, #8e44ad 0%, #6C3483 100%)',
                                    color:'white', fontSize:'14px', fontWeight:'700', textAlign:'center',
                                    boxShadow:'0 4px 12px rgba(142,68,173,0.3)'}}>
                                🤖 Akte wählen und KI-Analyse starten
                                <div style={{fontSize:'10px', fontWeight:'400', marginTop:'4px', opacity:0.8}}>
                                    {selectedCount > 0 ? 'Nur ausgewählte Ordner' : 'Komplette Akte'}
                                </div>
                            </button>

                            {/* KI-Modell Auswahl */}
                            <div style={{background:'var(--bg-secondary)', borderRadius:'10px', padding:'10px', border:'1px solid var(--border-color)'}}>
                                <div style={{fontSize:'11px', fontWeight:'700', color:'#d0daea', marginBottom:'6px'}}>🧠 KI-Modell</div>
                                <div style={{display:'flex', gap:'4px'}}>
                                    {Object.keys(GEMINI_CONFIG.MODELS).map(function(key) {
                                        var m = GEMINI_CONFIG.MODELS[key];
                                        var isActive = kiModelPref === key;
                                        return (
                                            <button key={key} onClick={function(){
                                                localStorage.setItem('gemini_model_pref', key);
                                                setKiModelPref(key);
                                            }} style={{
                                                flex:1, padding:'8px 4px', borderRadius:'8px', cursor:'pointer', fontSize:'10px', fontWeight:'700', textAlign:'center',
                                                background: isActive ? m.color + '18' : 'var(--bg-tertiary)',
                                                border: isActive ? '2px solid ' + m.color : '1px solid var(--border-color)',
                                                color: isActive ? m.color : 'var(--text-muted)',
                                                transition:'all 0.2s'
                                            }}>
                                                <span style={{fontSize:'14px', display:'block', marginBottom:'2px'}}>{m.icon}</span>
                                                {m.name.replace('Gemini ', '')}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══ BAUSTELLENAUSWERTUNG / VORAB-AKTE ═══ */}
                    <div style={{background:'linear-gradient(135deg, rgba(233,30,99,0.08) 0%, rgba(156,39,176,0.08) 100%)', borderRadius:'12px', padding:'14px', border:'1px solid rgba(233,30,99,0.2)', marginBottom:'12px'}}>
                        <div style={{fontSize:'13px', fontWeight:'700', color:'#ffffff', marginBottom:'6px'}}>
                            📊 Baustellenauswertung / Vorab-Akte
                        </div>
                        <div style={{fontSize:'11px', color:'var(--text-secondary)', marginBottom:'10px', lineHeight:'1.5'}}>
                            {vorabAkteMode
                                ? 'Ordner aufklappen und eine Datei antippen, die als Vorab-Akte geladen werden soll.'
                                : 'Voranalysierte Akte aus einem beliebigen Ordner laden. Positionen, Preise und Kontaktdaten werden direkt in die Module übertragen.'}
                        </div>

                        {!vorabAkteMode ? (
                            /* ── Button: Vorab-Akte-Modus aktivieren -- Ordner aufklappen ── */
                            <button onClick={function() {
                                if (folders.length === 0) {
                                    alert('Keine Ordner vorhanden. Bitte erst Kundendaten über \"Kunde NEU\" laden.');
                                    return;
                                }
                                // Alle Ordner aufklappen
                                var expanded = {};
                                folders.forEach(function(f) { expanded[f.name] = true; });
                                setExpandedFolders(expanded);
                                setVorabAkteMode(true);
                                setVorabAkteFile(null);
                            }} style={{
                                padding:'12px 20px', borderRadius:'10px', border:'none', cursor:'pointer',
                                background:'linear-gradient(135deg, #E91E63 0%, #9C27B0 100%)',
                                color:'white', fontSize:'13px', fontWeight:'700',
                                boxShadow:'0 3px 10px rgba(233,30,99,0.3)'}}>
                                📋 Vorab-Akte laden und in Module übertragen
                            </button>
                        ) : (
                            /* ── Vorab-Akte Auswahl-Modus aktiv ── */
                            <div>
                                {vorabAkteFile ? (
                                    /* Datei ausgewählt -- Bestätigung */
                                    <div style={{background:'rgba(39,174,96,0.1)', borderRadius:'10px', padding:'12px', border:'1px solid rgba(39,174,96,0.3)', marginBottom:'10px'}}>
                                        <div style={{fontSize:'12px', fontWeight:'700', color:'#27ae60', marginBottom:'6px'}}>✅ Ausgewählte Datei:</div>
                                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                            <span style={{fontSize:'18px'}}>{getFileIcon(vorabAkteFile.name)}</span>
                                            <div style={{flex:1, minWidth:0}}>
                                                <div style={{fontSize:'12px', fontWeight:'600', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{vorabAkteFile.name}</div>
                                                <div style={{fontSize:'10px', color:'var(--text-muted)'}}>{vorabAkteFile._folderName || ''}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{background:'rgba(30,136,229,0.08)', borderRadius:'10px', padding:'10px', border:'1px solid rgba(30,136,229,0.2)', marginBottom:'10px'}}>
                                        <div style={{fontSize:'12px', color:'var(--accent-blue)', fontWeight:'600', textAlign:'center'}}>
                                            👆 Bitte Datei aus den aufgeklappten Ordnern oben wählen
                                        </div>
                                    </div>
                                )}

                                <div style={{display:'flex', gap:'8px'}}>
                                    {vorabAkteFile && (
                                        <button onClick={async function() {
                                            setVorabAkteLoading(true);
                                            try {
                                                // WICHTIG: KI explizit deaktivieren -- nur Daten laden!
                                                window._kiDisabled = true;
                                                var file = vorabAkteFile;
                                                var folderName = file._folderName || '';
                                                var matchFolder = folders.find(function(f) { return f.name === folderName; });
                                                if (matchFolder && onDatenLaden) {
                                                    // Nur den Ordner laden in dem die Datei liegt -- OHNE KI
                                                    onDatenLaden({ mode: 'ordner', selectedFolders: [matchFolder.name], includeRootFiles: false, vorabAkte: true, vorabAkteFileId: file.id, vorabAkteFileName: file.name });
                                                } else if (onDatenLaden) {
                                                    // Alle Ordner laden -- OHNE KI
                                                    onDatenLaden({ mode: 'komplett', selectedFolders: null, includeRootFiles: false, vorabAkte: true, vorabAkteFileId: file.id, vorabAkteFileName: file.name });
                                                } else {
                                                    alert('Daten-Laden Funktion nicht verfügbar.');
                                                }
                                                setVorabAkteMode(false);
                                                setVorabAkteFile(null);
                                            } catch(err) {
                                                alert('Fehler: ' + err.message);
                                            }
                                            setVorabAkteLoading(false);
                                        }} style={{
                                            flex:1, padding:'12px', borderRadius:'10px', border:'none', cursor:'pointer',
                                            background:'linear-gradient(135deg, #27ae60 0%, #1E8449 100%)',
                                            color:'white', fontSize:'13px', fontWeight:'700',
                                            opacity: vorabAkteLoading ? 0.6 : 1,
                                            boxShadow:'0 3px 10px rgba(39,174,96,0.3)'}}>
                                            {vorabAkteLoading ? '⏳ Wird geladen...' : '🚀 Akte laden & übertragen'}
                                        </button>
                                    )}
                                    <button onClick={function() {
                                        setVorabAkteMode(false);
                                        setVorabAkteFile(null);
                                    }} style={{
                                        padding:'12px 16px', borderRadius:'10px', border:'1px solid rgba(231,76,60,0.3)',
                                        cursor:'pointer', background:'rgba(231,76,60,0.06)',
                                        color:'#ff6b6b', fontSize:'12px', fontWeight:'700'}}>
                                        ✕ Abbrechen
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══ OFFLINE → ONLINE SYNC ═══ */}
                    <div style={{background:'rgba(243,156,18,0.08)', borderRadius:'12px', padding:'14px', border:'1px solid rgba(243,156,18,0.2)', marginBottom:'14px'}}>
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                            <div>
                                <div style={{fontSize:'13px', fontWeight:'700', color:'#ffffff'}}>
                                    🔄 Offline → Online Sync
                                </div>
                                <div style={{fontSize:'11px', color:'var(--text-secondary)', marginTop:'4px'}}>
                                    Auf der Baustelle erfasste Daten zurück nach Google Drive laden
                                </div>
                            </div>
                            <button onClick={handleSync} style={{
                                padding:'10px 16px', borderRadius:'10px', border:'none', cursor:'pointer',
                                background:'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                                color:'white', fontSize:'12px', fontWeight:'700', whiteSpace:'nowrap',
                                boxShadow:'0 3px 8px rgba(243,156,18,0.25)'}}>
                                🔄 Sync starten
                            </button>
                        </div>
                        {syncStatus && (
                            <div style={{marginTop:'8px', fontSize:'11px', color: syncStatus.includes('✓') ? '#27ae60' : 'var(--text-muted)', fontWeight:'600'}}>
                                {syncStatus}
                            </div>
                        )}
                    </div>

                    {/* ═══ FORTSCHRITT & ERGEBNIS ═══ */}
                    {(loading || loadProgress) && (
                        <div style={{background: loadProgress && loadProgress.includes('✅') ? 'rgba(39,174,96,0.08)' : loadProgress && loadProgress.includes('❌') ? 'rgba(231,76,60,0.08)' : loadProgress && loadProgress.includes('⛔') ? 'rgba(243,156,18,0.08)' : 'rgba(30,136,229,0.08)',
                            borderRadius:'12px', padding:'14px', border: loadProgress && loadProgress.includes('✅') ? '1px solid rgba(39,174,96,0.2)' : loadProgress && loadProgress.includes('⛔') ? '1px solid rgba(243,156,18,0.2)' : '1px solid rgba(30,136,229,0.15)', marginBottom:'12px'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px'}}>
                                <div style={{fontSize:'13px', fontWeight:'700', color: loadProgress && loadProgress.includes('✅') ? '#27ae60' : loadProgress && loadProgress.includes('❌') ? '#e74c3c' : loadProgress && loadProgress.includes('⛔') ? '#f39c12' : 'var(--accent-blue)'}}>
                                    {loading ? '⏳ Verarbeitung läuft...' : loadProgress && loadProgress.includes('✅') ? '✅ Abgeschlossen!' : loadProgress && loadProgress.includes('⛔') ? '⛔ Abgebrochen' : loadProgress && loadProgress.includes('❌') ? '❌ Fehler' : 'Status'}
                                </div>
                                {loading && onAbbrechen && (
                                    <button onClick={onAbbrechen}
                                        style={{padding:'6px 14px', borderRadius:'8px', border:'1px solid rgba(231,76,60,0.3)',
                                            background:'rgba(231,76,60,0.08)', color:'#e74c3c', fontSize:'11px', fontWeight:'700', cursor:'pointer'}}>
                                        ⛔ Abbrechen
                                    </button>
                                )}
                            </div>
                            <div style={{fontSize:'12px', color:'#c8d6e5', lineHeight:'1.6'}}>
                                {loadProgress || 'Bitte warten...'}
                            </div>
                            {loading && (
                                <div style={{marginTop:'10px', height:'4px', background:'rgba(30,136,229,0.15)', borderRadius:'2px', overflow:'hidden'}}>
                                    <div style={{height:'100%', background:'linear-gradient(90deg, #1E88E5, #8e44ad)', borderRadius:'2px', animation:'loading 1.5s infinite', width:'40%'}}></div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ ERGEBNIS-ZUSAMMENFASSUNG ═══ */}
                    {importResult && !loading && (
                        <div style={{background:'rgba(39,174,96,0.06)', borderRadius:'12px', padding:'14px', border:'1px solid rgba(39,174,96,0.2)', marginBottom:'12px'}}>
                            <div style={{fontSize:'13px', fontWeight:'700', color:'#27ae60', marginBottom:'10px'}}>
                                {importResult._nurDownload ? '📥 Download-Ergebnis' : '📊 Analyse-Ergebnis'}
                            </div>

                            {importResult._nurDownload ? (
                                /* ── NUR DOWNLOAD: Zusammenfassung + Dateiliste ── */
                                <div>
                                    <div style={{background:'rgba(39,174,96,0.1)', borderRadius:'8px', padding:'14px', textAlign:'center', marginBottom:'8px'}}>
                                        <div style={{fontSize:'28px', fontWeight:'700', color:'#27ae60'}}>{importResult._geladeneDateien || 0}</div>
                                        <div style={{fontSize:'12px', color:'var(--text-muted)'}}>Dateien heruntergeladen</div>
                                        {importResult._fehler > 0 && (
                                            <div style={{fontSize:'11px', color:'#e74c3c', marginTop:'4px'}}>{importResult._fehler} Fehler</div>
                                        )}
                                    </div>
                                    {/* Dateiliste nach Ordner gruppiert */}
                                    {importResult.quellenInfo && importResult.quellenInfo.length > 0 && (
                                        <div style={{marginTop:'8px'}}>
                                            <div onClick={function(){ toggleExpand('__download_result__'); }}
                                                style={{display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', padding:'6px 0'}}>
                                                <span style={{fontSize:'11px', color:'var(--text-muted)', transition:'transform 0.2s', transform: expandedFolders['__download_result__'] ? 'rotate(90deg)' : 'rotate(0deg)', display:'inline-block'}}>▶</span>
                                                <span style={{fontSize:'11px', fontWeight:'600', color:'var(--text-secondary)'}}>📋 Dateiliste anzeigen ({importResult.quellenInfo.length} Dateien)</span>
                                            </div>
                                            {expandedFolders['__download_result__'] && (
                                                <div style={{background:'var(--bg-tertiary)', borderRadius:'8px', border:'1px solid var(--border-color)', padding:'6px 0', maxHeight:'250px', overflowY:'auto', marginTop:'4px'}}>
                                                    {importResult.quellenInfo.map(function(q, qi) {
                                                        return (
                                                            <div key={qi} style={{display:'flex', alignItems:'center', gap:'6px', padding:'5px 10px', fontSize:'11px',
                                                                borderBottom: qi < importResult.quellenInfo.length - 1 ? '1px solid rgba(128,128,128,0.06)' : 'none'}}>
                                                                <span>{q.typ === 'fehler' ? '❌' : '✅'}</span>
                                                                <span style={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: q.typ === 'fehler' ? '#e74c3c' : 'var(--text-secondary)'}}>{q.datei}</span>
                                                                <span style={{fontSize:'9px', color:'var(--text-muted)', flexShrink:0}}>{q.ordner}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div style={{fontSize:'11px', color:'var(--text-muted)', textAlign:'center', marginTop:'8px'}}>
                                        Daten lokal gespeichert. Jetzt KI-Analyse starten oder manuell weiterarbeiten.
                                    </div>
                                </div>
                            ) : (
                                /* ── ANALYSE-ERGEBNIS: Vollständige Zusammenfassung ── */
                                <div>
                                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
                                        <div style={{background:'rgba(30,136,229,0.08)', borderRadius:'8px', padding:'10px', textAlign:'center'}}>
                                            <div style={{fontSize:'20px', fontWeight:'700', color:'var(--accent-blue)'}}>{(importResult.positionen || []).length}</div>
                                            <div style={{fontSize:'10px', color:'var(--text-muted)'}}>LV-Positionen</div>
                                        </div>
                                        <div style={{background:'rgba(39,174,96,0.08)', borderRadius:'8px', padding:'10px', textAlign:'center'}}>
                                            <div style={{fontSize:'20px', fontWeight:'700', color:'#27ae60'}}>{(importResult.raeume || []).length}</div>
                                            <div style={{fontSize:'10px', color:'var(--text-muted)'}}>Räume erkannt</div>
                                        </div>
                                        <div style={{background:'rgba(142,68,173,0.08)', borderRadius:'8px', padding:'10px', textAlign:'center'}}>
                                            <div style={{fontSize:'20px', fontWeight:'700', color:'#8e44ad'}}>{(importResult.zeichnungen || []).length}</div>
                                            <div style={{fontSize:'10px', color:'var(--text-muted)'}}>Zeichnungen</div>
                                        </div>
                                        <div style={{background:'rgba(243,156,18,0.08)', borderRadius:'8px', padding:'10px', textAlign:'center'}}>
                                            <div style={{fontSize:'20px', fontWeight:'700', color:'#f39c12'}}>{importResult.quelle || 'Auto'}</div>
                                            <div style={{fontSize:'10px', color:'var(--text-muted)'}}>Erkennungsmethode</div>
                                        </div>
                                    </div>
                                    {importResult.kundendaten && importResult.kundendaten.auftraggeber && (
                                        <div style={{marginTop:'10px', fontSize:'11px', color:'var(--text-secondary)', lineHeight:'1.6'}}>
                                            <strong>Auftraggeber:</strong> {importResult.kundendaten.auftraggeber}<br/>
                                            {importResult.kundendaten.bauleitung && <span><strong>Bauleitung:</strong> {importResult.kundendaten.bauleitung}<br/></span>}
                                            {importResult.kundendaten.architekt && <span><strong>Architekt:</strong> {importResult.kundendaten.architekt}<br/></span>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ WEITER ZUR MODULWAHL ═══ */}
                    {importResult && !loading && onWeiterZuModulen && (
                        <button onClick={onWeiterZuModulen}
                            style={{width:'100%', padding:'18px', borderRadius:'14px', border:'none', cursor:'pointer',
                                fontSize:'16px', fontWeight:'700', color:'white',
                                background:'linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)',
                                boxShadow:'0 4px 16px rgba(30,136,229,0.35)',
                                marginBottom:'12px', minHeight:'56px'}}>
                            📐 Weiter zur Modulwahl →
                        </button>
                    )}

                    {/* ═══ MANUELL WEITERARBEITEN (bei Abbruch/Fehler/ohne Analyse) ═══ */}
                    {!loading && !importResult && kunde._driveFolderId && onWeiterZuModulen && (
                        <button onClick={onWeiterZuModulen}
                            style={{width:'100%', padding:'14px', borderRadius:'12px', border:'1px solid rgba(243,156,18,0.3)',
                                cursor:'pointer', fontSize:'13px', fontWeight:'700',
                                color:'#f39c12', background:'rgba(243,156,18,0.06)',
                                marginBottom:'12px'}}>
                            ✏️ Manuell weiterarbeiten (ohne Analyse)
                        </button>
                    )}

                    {/* ═══ ZURÜCK-BUTTON ═══ */}
                    <div style={{paddingBottom:'20px'}}>
                        <button onTouchEnd={function(e){ e.preventDefault(); onBack(); }} onClick={onBack}
                            style={{padding:'12px 20px', borderRadius:'10px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', cursor:'pointer', fontSize:'12px', fontWeight:'600', color:'var(--text-muted)'}}>
                            ← Zurück zur Kundenauswahl
                        </button>
                    </div>

                    {/* ═══ DATEI-VORSCHAU MODAL ═══ */}
                    {previewFile && previewUrl && (
                        <div className="modal-overlay" style={{zIndex:6000, background:'rgba(10,15,25,0.95)', display:'flex', alignItems:'center', justifyContent:'center'}}
                            onClick={function(){ setPreviewFile(null); setPreviewUrl(null); }}>
                            <div style={{width:'95%', maxWidth:'900px', height:'90vh', background:'var(--bg-primary)', borderRadius:'16px', overflow:'hidden', display:'flex', flexDirection:'column'}}
                                onClick={function(e){ e.stopPropagation(); }}>
                                {/* Modal Header */}
                                <div style={{padding:'12px 16px', borderBottom:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:'10px', flexShrink:0}}>
                                    <span style={{fontSize:'20px'}}>{getFileIcon(previewFile.name)}</span>
                                    <div style={{flex:1, minWidth:0}}>
                                        <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{previewFile.name}</div>
                                        <div style={{fontSize:'10px', color:'var(--text-muted)'}}>
                                            {previewFile.folderName || ''}{previewFile.size ? ' · ' + formatSize(previewFile.size) : ''}
                                        </div>
                                    </div>
                                    <button onClick={function(){ window.open('https://drive.google.com/file/d/' + previewFile.id + '/view', '_blank'); }}
                                        style={{padding:'6px 12px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', cursor:'pointer', fontSize:'11px', fontWeight:'600', color:'var(--accent-blue)', flexShrink:0}}>
                                        ↗ In Drive öffnen
                                    </button>
                                    <button onClick={function(){ setPreviewFile(null); setPreviewUrl(null); }}
                                        style={{background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'var(--text-muted)', flexShrink:0, padding:'4px 8px'}}>✕</button>
                                </div>
                                {/* Iframe-Vorschau */}
                                <div style={{flex:1, position:'relative'}}>
                                    {previewLoading && (
                                        <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)', zIndex:1}}>
                                            <div style={{textAlign:'center'}}>
                                                <div style={{fontSize:'32px', marginBottom:'8px'}}>⏳</div>
                                                <div style={{fontSize:'13px', color:'var(--text-muted)'}}>Datei wird geladen...</div>
                                            </div>
                                        </div>
                                    )}
                                    {(previewFile.name || '').toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/) ? (
                                        <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px', overflow:'auto'}}>
                                            <img src={previewUrl} style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain', borderRadius:'8px'}}
                                                onError={function(e){ e.target.style.display='none'; }}
                                                alt={previewFile.name} />
                                        </div>
                                    ) : (
                                        <iframe src={previewUrl} style={{width:'100%', height:'100%', border:'none'}}
                                            onLoad={function(){ setPreviewLoading(false); }}
                                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                            title={'Vorschau: ' + previewFile.name} />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           KUNDENAUSWAHL PAGE
           ═══════════════════════════════════════════ */
        function Kundenauswahl({ onSelect, loading, kunden, onUpdateKunde, kundeMode, onBack, onGoToModulwahl, onGoToDaten, onGoToOrdner }) {
            const [searchTerm, setSearchTerm] = useState('');
            const [updatingId, setUpdatingId] = useState(null);
            const inputRef = React.useRef(null);

            // Modus-Info
            var modusInfo = {
                ki: { icon: '\uD83E\uDD16', label: 'KI-Analyse', color: '#1E88E5' },
                gespeichert: { icon: '\uD83D\uDCE5', label: 'Kundendaten laden', color: '#2980b9' },
                gespeichertKomplett: { icon: '\uD83D\uDCE5', label: 'Kundendaten laden', color: '#2980b9' },
                manuell: { icon: '\uD83D\uDCDD', label: 'Manuell anlegen', color: '#e67e22' },
            };
            var activeModus = modusInfo[kundeMode] || modusInfo.ki;

            // Datenquelle: 1. Drive-Kunden  2. Lokal gespeicherte Kunden  3. Leer
            const gespeicherte = getGespeicherteKunden();
            const dataSource = kunden && kunden.length > 0 ? kunden : (gespeicherte.length > 0 ? gespeicherte : []);
            const sortedKunden = [...dataSource].sort((a, b) => a.name.localeCompare(b.name, 'de'));

            const filtered = sortedKunden.filter(k =>
                k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (k.adresse || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (k.auftraggeber || '').toLowerCase().includes(searchTerm.toLowerCase())
            );

            const highlightText = (text, term) => {
                if (!term) return text;
                const idx = text.toLowerCase().indexOf(term.toLowerCase());
                if (idx === -1) return text;
                return (
                    <React.Fragment>
                        {text.slice(0, idx)}
                        <span className="highlight">{text.slice(idx, idx + term.length)}</span>
                        {text.slice(idx + term.length)}
                    </React.Fragment>
                );
            };

            if (loading) {
                return (
                    <div className="page-container">
                        <div className="loading-container">
                            <div className="spinner"></div>
                            <div className="loading-text">Baustellen-Ordner wird geladen...</div>
                        </div>
                    </div>
                );
            }

            return (
                <div className="page-container">
                    {/* Modus-Banner + Zurueck */}
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px'}}>
                        {onBack && (
                            <button onClick={onBack} style={{padding:'10px 16px', borderRadius:'var(--radius-md)', border:'none', background:'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))', color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:'600', whiteSpace:'nowrap', boxShadow:'0 4px 15px rgba(196,30,30,0.3)', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.8px', transition:'all 0.25s ease'}}>
                                {'\u2190'} Zurueck
                            </button>
                        )}
                        <div style={{flex:1, display:'flex', alignItems:'center', gap:'8px', padding:'8px 14px', borderRadius:'var(--radius-md)', background: activeModus.color + '12', border:'1px solid ' + activeModus.color + '30'}}>
                            <span style={{fontSize:'16px'}}>{activeModus.icon}</span>
                            <span style={{fontSize:'11px', fontWeight:'600', color: activeModus.color, fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.8px'}}>Modus: {activeModus.label}</span>
                        </div>
                    </div>

                    <div className="breadcrumb">
                        <span>Google Drive</span>
                        <span>\u203A</span>
                        <span className="breadcrumb-active">Baustellen neu</span>
                    </div>
                    <div className="page-title">Baustellen-Ordner</div>
                    <div className="page-subtitle">{dataSource.length} Kundenprojekte verfügbar{kunden && kunden.length > 0 ? ' (Google Drive)' : ' (Demo)'}</div>

                    <div className="search-container">
                        <input
                            ref={inputRef}
                            className="search-input"
                            type="text"
                            placeholder="Baustelle suchen..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && filtered.length > 0) {
                                    onSelect(filtered[0]);
                                }
                            }}
                            autoComplete="off"
                        />
                        <span className="search-icon">🔍</span>
                        <button
                            className={`search-clear ${searchTerm ? 'visible' : ''}`}
                            onClick={() => { setSearchTerm(''); inputRef.current.focus(); }}
                        >
                            ✕
                        </button>
                        <span className={`search-count ${searchTerm ? 'has-filter' : ''}`}>
                            {filtered.length} / {dataSource.length}
                        </span>
                    </div>

                    {dataSource.length === 0 && !searchTerm ? (
                        <div style={{textAlign:'center', padding:'30px 20px', color:'var(--text-muted)'}}>
                            <div style={{fontSize:'40px', marginBottom:'12px'}}>📂</div>
                            <div style={{fontSize:'15px', fontWeight:'700', color:'var(--text-secondary)', marginBottom:'8px'}}>Noch keine Baustellen vorhanden</div>
                            <div style={{fontSize:'12px', lineHeight:'1.6'}}>
                                Verwende <strong>"Kunde NEU"</strong> auf der Startseite, um eine Baustelle aus Google Drive zu laden und mit der KI zu analysieren.<br/><br/>
                                Analysierte Kunden werden automatisch lokal gespeichert und erscheinen dann hier.
                            </div>
                        </div>
                    ) : filtered.length > 0 ? (
                        <div className="folder-list">
                            {filtered.map((kunde, idx) => (
                                <div
                                    key={kunde.id || kunde.name}
                                    className="folder-item"
                                    style={{ animationDelay: `${idx * 0.06}s`, position:'relative' }}
                                >
                                    <div style={{display:'flex', alignItems:'center', flex:1, gap:'10px', cursor:'pointer'}} onClick={() => onSelect(kunde)}>
                                        <span className="folder-icon">📁</span>
                                        <div className="folder-info">
                                            <div className="folder-name">
                                                {highlightText(kunde.name, searchTerm)}
                                            </div>
                                            <div className="folder-meta">
                                                {kunde._gespeichertAm ? ('💾 ' + kunde._gespeichertAm + ' · ') : ''}
                                                {kunde.dateien ? (kunde.dateien + ' Dateien') : ''}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Update-Button -- Drive-Akten neu laden + KI-Analyse */}
                                    {onUpdateKunde && kunde._driveFolderId && (
                                        <button
                                            onClick={function(e) {
                                                e.stopPropagation();
                                                setUpdatingId(kunde.id || kunde.name);
                                                onUpdateKunde(kunde);
                                            }}
                                            disabled={updatingId === (kunde.id || kunde.name)}
                                            style={{
                                                padding:'6px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', cursor:'pointer',
                                                background: updatingId === (kunde.id || kunde.name) ? 'rgba(142,68,173,0.12)' : 'var(--bg-card)',
                                                color: updatingId === (kunde.id || kunde.name) ? '#8e44ad' : 'var(--accent-blue)',
                                                fontSize:'11px', fontWeight:'600', whiteSpace:'nowrap',
                                                display:'flex', alignItems:'center', gap:'4px', minWidth:'fit-content',
                                                fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px',
                                                transition:'all 0.2s ease',
                                            }}
                                            title="Akten von Google Drive neu laden und KI-Analyse aktualisieren"
                                        >
                                            {updatingId === (kunde.id || kunde.name) ? '⏳' : '🔄'} Update
                                        </button>
                                    )}
                                    <span className="folder-arrow" style={{cursor:'pointer'}} onClick={() => onSelect(kunde)}>›</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-results">
                            <div className="no-results-icon">🔎</div>
                            <div className="no-results-text">
                                Keine Baustelle gefunden für „{searchTerm}"
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           KUNDEN-AKTE PAGE (Preview before loading)
           ═══════════════════════════════════════════ */
        function KundenAkte({ kunde, onLoad, onBack, loading, loadProgress }) {
            const [edits, setEdits] = useState({});
            const [extraNotes, setExtraNotes] = useState({ ag: [], bl: [], arch: [] });
            const [selectedFolders, setSelectedFolders] = useState(() => {
                return (kunde.folders || []).reduce((acc, f, i) => ({ ...acc, [i]: true }), {});
            });

            const handleEdit = (field, value) => {
                setEdits(prev => ({ ...prev, [field]: value }));
            };

            const getVal = useCallback((field, original) => {
                if (edits[field] !== undefined) return edits[field];
                return original || '';
            }, [edits]);

            // Inline helper to render contact fields
            const renderContactField = (icon, label, field, original) => {
                const val = getVal(field, original);
                const isMissing = !original;
                return (
                    <div style={{display:'flex', alignItems:'center', gap:'8px', padding:'4px 0', fontSize:'13px'}} key={field}>
                        <span style={{fontSize:'14px'}}>{icon}</span>
                        {isMissing ? (
                            <input
                                style={{flex:1, background:'var(--bg-tertiary)', border:'1px solid var(--border-color)', borderRadius:'6px', padding:'6px 10px', fontSize:'13px', color:'var(--text-primary)'}}
                                type="text"
                                placeholder={label + ' nachtragen...'}
                                value={val}
                                onChange={e => handleEdit(field, e.target.value)}
                            />
                        ) : (
                            <span style={{color:'var(--text-secondary)'}}>{val}</span>
                        )}
                    </div>
                );
            };

            if (loading) {
                // ── Fortschritt parsen ──
                var progressPct = 0;
                var progressPhase = '';
                var fileMatch = loadProgress ? loadProgress.match(/(\d+)\/(\d+)/) : null;
                if (fileMatch) {
                    progressPct = Math.round((parseInt(fileMatch[1]) / parseInt(fileMatch[2])) * 90);
                }
                if (loadProgress) {
                    if (loadProgress.indexOf('Ordnerinhalt') >= 0) { progressPct = 5; progressPhase = 'Ordner laden'; }
                    else if (loadProgress.indexOf('Verarbeite') >= 0) progressPhase = 'Dateien scannen';
                    else if (loadProgress.indexOf('KI-Analyse') >= 0 || loadProgress.indexOf('KI analysiert') >= 0) progressPhase = 'KI denkt nach...';
                    else if (loadProgress.indexOf('Räume') >= 0) progressPhase = 'Räume erkennen';
                    else if (loadProgress.indexOf('Positionen') >= 0) progressPhase = 'Positionen zählen';
                    else if (loadProgress.indexOf('✅') >= 0 || loadProgress.indexOf('abgeschlossen') >= 0) { progressPct = 100; progressPhase = 'Fertig!'; }
                    else if (loadProgress.indexOf('gestartet') >= 0) { progressPct = 3; progressPhase = 'Aufwärmen...'; }
                    else if (loadProgress.indexOf('Lade') >= 0) progressPhase = 'PDF wird geladen';
                }

                // ── Wechselnde lustige Sprüche (alle 3 Sekunden) ──
                var funMessages = [
                    '🧱 Die KI verlegt gerade virtuelle Fliesen...',
                    '📐 Maße werden mit Lasergenauigkeit geprüft...',
                    '🤖 Gemini liest schneller als jeder Polier...',
                    '☕ Zeit für einen Kaffee -- die KI macht das schon!',
                    '🔍 Jede Position wird unter die Lupe genommen...',
                    '📋 Das LV wird Zeile für Zeile durchgekämmt...',
                    '🏗️ Baustellendaten werden zusammengetragen...',
                    '💡 Wussten Sie? Thomas W. verlegt schneller als jede KI!',
                    '🎯 Positionsnummern werden wie Perlen aufgereiht...',
                    '🧮 EP × Menge = GP... die KI rechnet mit!',
                    '📊 Mengen, Einheiten, Preise -- alles wird erfasst!',
                    '✨ Die KI sortiert Daten wie Fliesen im Halbverband...',
                    '🗂️ Ordner für Ordner wird durchforstet...',
                    '🏆 Diese KI hat schon tausende LVs gelesen...',
                    '🔮 Die KI sieht Positionen, wo andere nur Text sehen...',
                    '🎭 Fliesenleger und KI -- ein unschlagbares Team!',
                    '🍕 Fliesen sind wie Pizza -- die Größe entscheidet!',
                    '🦾 Die KI liest PDFs schneller als Sie "Fugenkreuz" sagen...',
                    '🧩 Jede Position ist ein Puzzleteil des Projekts...',
                    '⚡ 200 Positionen? Kein Problem für Gemini!',
                    '🎪 Willkommen in der magischen Welt der LV-Analyse...',
                    '🏋️ Diese KI stemmt auch die dicksten Leistungsverzeichnisse!',
                    '🎵 Position für Position... wie Musik in den Ohren eines Bauleiters!',
                    '🌟 Fun Fact: Die längste Fuge der Welt ist 12 km lang!',
                    '🧊 Kühlen Kopf bewahren -- die KI schwitzt nicht!',
                    '🎩 Abrakadabra -- aus PDF wird Klartext!',
                    '📱 TW Business Suite -- wo Handwerk auf Hightech trifft!',
                    '🚀 Bald fertig -- dann können Sie loslegen!',
                    '🎓 Diese KI hat in VOB/C promoviert (fast)...',
                    '🦸 Fliesenleger-Superheld activated!',
                ];
                var msgIdx = Math.floor(Date.now() / 3000) % funMessages.length;

                // ── Fliesen-Animations-Pattern ──
                var tiles = [];
                var tileCount = Math.min(Math.max(Math.floor(progressPct / 5), 1), 20);
                for (var ti = 0; ti < 20; ti++) {
                    tiles.push(ti < tileCount);
                }

                return (
                    <div className="page-container" style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'85vh', padding:'20px'}}>

                        {/* Animiertes Fliesen-Muster */}
                        <div style={{display:'grid', gridTemplateColumns:'repeat(10, 22px)', gap:'3px', marginBottom:'20px'}}>
                            {tiles.map(function(filled, idx) {
                                return React.createElement('div', {
                                    key: idx,
                                    style: {
                                        width: '22px', height: '22px', borderRadius: '3px',
                                        background: filled
                                            ? 'linear-gradient(135deg, #1E88E5 0%, #8e44ad 100%)'
                                            : 'var(--bg-tertiary)',
                                        border: '1px solid ' + (filled ? 'rgba(30,136,229,0.5)' : 'var(--border-color)'),
                                        transition: 'all 0.5s ease',
                                        opacity: filled ? 1 : 0.3,
                                        animation: filled ? 'tileAppear 0.3s ease-out' : 'none',
                                    }
                                });
                            })}
                        </div>

                        {/* Emoji-Animation -- wechselt je nach Phase */}
                        <div style={{fontSize:'42px', marginBottom:'8px', animation:'bounce 1.5s ease-in-out infinite'}}>
                            {progressPct >= 100 ? '🎉' : progressPct > 80 ? '🏆' : progressPct > 60 ? '🤖' : progressPct > 40 ? '📋' : progressPct > 20 ? '🔍' : '🚀'}
                        </div>

                        <div style={{fontSize:'16px', fontWeight:'700', color:'var(--text-primary)', marginBottom:'6px'}}>
                            {progressPct >= 100 ? 'Analyse abgeschlossen! 🎉' : progressPct > 60 ? 'KI liest das LV...' : progressPct > 30 ? 'Dokumente werden analysiert...' : 'KI-Analyse läuft'}
                        </div>

                        {/* Große Prozent-Anzeige */}
                        <div style={{fontSize:'38px', fontWeight:'700', color:'var(--accent-blue)', marginBottom:'12px', fontFamily:'monospace', textShadow:'0 0 20px rgba(30,136,229,0.3)'}}>
                            {progressPct > 0 ? progressPct + '%' : '...'}
                        </div>

                        {/* Fortschrittsbalken */}
                        <div style={{width:'85%', maxWidth:'320px', height:'10px', background:'var(--bg-tertiary)', borderRadius:'5px', overflow:'hidden', marginBottom:'14px', border:'1px solid var(--border-color)'}}>
                            <div style={{
                                width: Math.max(progressPct, 3) + '%', height:'100%',
                                background:'linear-gradient(90deg, #1E88E5, #8e44ad, #27ae60)',
                                borderRadius:'5px', transition:'width 0.8s ease-out',
                                boxShadow:'0 0 8px rgba(30,136,229,0.5)'
                            }}></div>
                        </div>

                        {/* Phase */}
                        {progressPhase && (
                            <div style={{fontSize:'13px', fontWeight:'700', color:'var(--accent-blue)', marginBottom:'8px'}}>
                                {progressPhase}
                            </div>
                        )}

                        {/* Detail-Nachricht */}
                        <div style={{fontSize:'12px', color:'var(--text-muted)', textAlign:'center', maxWidth:'300px', lineHeight:'1.5', minHeight:'20px'}}>
                            {loadProgress ? loadProgress.replace(/^🤖\s*/, '') : ''}
                        </div>

                        {/* Lustiger wechselnder Spruch */}
                        <div style={{marginTop:'20px', padding:'12px 20px', background:'rgba(30,136,229,0.06)', borderRadius:'12px', border:'1px solid rgba(30,136,229,0.12)', maxWidth:'320px'}}>
                            <div style={{fontSize:'13px', color:'var(--accent-blue)', textAlign:'center', fontStyle:'italic', lineHeight:'1.5', transition:'opacity 0.3s'}}>
                                {funMessages[msgIdx]}
                            </div>
                        </div>

                        {/* Bitte-nicht-schließen */}
                        <div style={{marginTop:'12px', fontSize:'10px', color:'var(--text-muted)', opacity:0.5}}>
                            Bitte nicht schließen -- Thomas' KI arbeitet hart! 💪
                        </div>

                        {/* Mini-Baustellen-Laufband */}
                        <div style={{marginTop:'16px', width:'100%', maxWidth:'320px', overflow:'hidden', height:'24px', position:'relative'}}>
                            <div style={{
                                display:'flex', gap:'16px', fontSize:'18px',
                                animation:'scrollBanner 8s linear infinite', whiteSpace:'nowrap',
                                position:'absolute', left:'0'
                            }}>
                                <span>🧱</span><span>🧱</span><span>🏗️</span><span>🧱</span><span>📐</span><span>🧱</span><span>🧱</span><span>🤖</span><span>🧱</span><span>🧱</span><span>☕</span><span>🧱</span><span>🧱</span><span>📋</span><span>🧱</span><span>🧱</span><span>💎</span><span>🧱</span>
                                <span>🧱</span><span>🧱</span><span>🏗️</span><span>🧱</span><span>📐</span><span>🧱</span><span>🧱</span><span>🤖</span><span>🧱</span><span>🧱</span><span>☕</span><span>🧱</span><span>🧱</span><span>📋</span><span>🧱</span><span>🧱</span><span>💎</span><span>🧱</span>
                            </div>
                        </div>

                        <style>{`
                            @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
                            @keyframes tileAppear { 0%{transform:scale(0) rotate(45deg);opacity:0} 100%{transform:scale(1) rotate(0);opacity:1} }
                            @keyframes scrollBanner { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
                            @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
                        `}</style>
                    </div>
                );
            }

            // Dateien-Zusammenfassung berechnen
            var totalFiles = 0;
            var totalSize = 0;
            var fileTypes = { pdf: 0, xlsx: 0, img: 0, other: 0 };
            (kunde.folders || []).forEach(function(f) {
                f.files.forEach(function(file) {
                    totalFiles++;
                    totalSize += parseFloat(file.size || 0);
                    if (file.type === 'pdf') fileTypes.pdf++;
                    else if (file.type === 'xlsx') fileTypes.xlsx++;
                    else if (file.type === 'img') fileTypes.img++;
                    else fileTypes.other++;
                });
            });

            return (
                <div className="page-container" style={{padding:'16px', minHeight:'100vh'}}>
                    {/* Header */}
                    <div style={{textAlign:'center', marginBottom:'16px'}}>
                        <div style={{fontSize:'11px', color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'4px'}}>
                            TW Business Suite
                        </div>
                        <div style={{fontSize:'18px', fontWeight:'700', color:'var(--text-primary)'}}>{kunde.name}</div>
                        {kunde.adresse && <div style={{fontSize:'13px', color:'var(--text-muted)', marginTop:'4px'}}>📍 {kunde.adresse}</div>}
                    </div>

                    {/* Projektdaten-Karte */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'14px', padding:'16px', marginBottom:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                        <div style={{fontSize:'13px', fontWeight:'700', marginBottom:'12px', color:'var(--accent-blue)'}}>📋 Projektdaten</div>

                        {/* Auftraggeber */}
                        <div style={{marginBottom:'10px'}}>
                            <div style={{fontSize:'10px', textTransform:'uppercase', letterSpacing:'1px', color:'var(--text-muted)', marginBottom:'2px'}}>Auftraggeber</div>
                            <div style={{fontWeight:'600', fontSize:'14px'}}>{kunde.auftraggeber || kunde.name || '–'}</div>
                            {renderContactField("📍", "Adresse", "ag_adresse", kunde.ag_adresse)}
                            {renderContactField("📞", "Telefon", "ag_telefon", kunde.ag_telefon)}
                            {renderContactField("✉️", "E-Mail", "ag_email", kunde.ag_email)}
                        </div>

                        {/* Bauleitung */}
                        {(kunde.bauleitung || true) && (
                            <div style={{marginBottom:'10px', paddingTop:'10px', borderTop:'1px solid var(--border-color)'}}>
                                <div style={{fontSize:'10px', textTransform:'uppercase', letterSpacing:'1px', color:'var(--text-muted)', marginBottom:'2px'}}>Bauleitung</div>
                                <div style={{fontWeight:'600', fontSize:'14px'}}>{kunde.bauleitung || '–'}</div>
                                {renderContactField("📞", "Telefon", "bl_telefon", kunde.bl_telefon)}
                                {renderContactField("✉️", "E-Mail", "bl_email", kunde.bl_email)}
                            </div>
                        )}

                        {/* Architekt */}
                        {(kunde.architekt || true) && (
                            <div style={{paddingTop:'10px', borderTop:'1px solid var(--border-color)'}}>
                                <div style={{fontSize:'10px', textTransform:'uppercase', letterSpacing:'1px', color:'var(--text-muted)', marginBottom:'2px'}}>Architekt / Planer</div>
                                <div style={{fontWeight:'600', fontSize:'14px'}}>{kunde.architekt || '–'}</div>
                                {renderContactField("📞", "Telefon", "arch_telefon", kunde.arch_telefon)}
                                {renderContactField("✉️", "E-Mail", "arch_email", kunde.arch_email)}
                            </div>
                        )}
                    </div>

                    {/* Dokumente-Übersicht */}
                    {kunde.folders && kunde.folders.length > 0 && (
                        <div style={{background:'var(--bg-secondary)', borderRadius:'14px', padding:'16px', marginBottom:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                            <div style={{fontSize:'13px', fontWeight:'700', marginBottom:'12px', color:'var(--accent-blue)'}}>📂 Dokumente im Kundenordner</div>

                            {/* Zusammenfassung */}
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'14px'}}>
                                <div style={{textAlign:'center', padding:'8px', background:'var(--bg-tertiary)', borderRadius:'8px'}}>
                                    <div style={{fontSize:'18px', fontWeight:'700', color:'var(--accent-blue)'}}>{totalFiles}</div>
                                    <div style={{fontSize:'10px', color:'var(--text-muted)'}}>Dateien</div>
                                </div>
                                <div style={{textAlign:'center', padding:'8px', background:'var(--bg-tertiary)', borderRadius:'8px'}}>
                                    <div style={{fontSize:'18px', fontWeight:'700', color:'var(--accent-blue)'}}>{(kunde.folders || []).length}</div>
                                    <div style={{fontSize:'10px', color:'var(--text-muted)'}}>Ordner</div>
                                </div>
                                <div style={{textAlign:'center', padding:'8px', background:'var(--bg-tertiary)', borderRadius:'8px'}}>
                                    <div style={{fontSize:'18px', fontWeight:'700', color:'var(--accent-blue)'}}>{totalSize.toFixed(1)}</div>
                                    <div style={{fontSize:'10px', color:'var(--text-muted)'}}>MB</div>
                                </div>
                            </div>

                            {/* Dateiliste nach Typ */}
                            {(kunde.folders || []).map(function(folder, fi) {
                                return (
                                    <div key={fi} style={{marginBottom:'8px'}}>
                                        <div style={{fontSize:'12px', fontWeight:'600', color:'var(--text-secondary)', padding:'4px 0', display:'flex', alignItems:'center', gap:'6px'}}>
                                            <span>📁</span> {folder.name}
                                            <span style={{fontSize:'10px', color:'var(--text-muted)', marginLeft:'auto'}}>{folder.files.length} Dateien</span>
                                        </div>
                                        {folder.files.map(function(file, ffi) {
                                            var icon = file.type === 'pdf' ? '📄' : file.type === 'xlsx' ? '📊' : file.type === 'img' ? '🖼️' : '📎';
                                            return (
                                                <div key={ffi} style={{fontSize:'12px', color:'var(--text-muted)', padding:'3px 0 3px 20px', display:'flex', gap:'6px', alignItems:'center'}}>
                                                    <span>{icon}</span>
                                                    <span style={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{file.name}</span>
                                                    <span style={{fontSize:'10px', opacity:0.6}}>{file.size} MB</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Weiter-Button */}
                    <button onClick={onLoad} style={{
                        width:'100%', padding:'14px', borderRadius:'12px', border:'none', cursor:'pointer',
                        background:'linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)',
                        color:'white', fontSize:'15px', fontWeight:'700',
                        boxShadow:'0 4px 12px rgba(30,136,229,0.3)',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
                    }}>
                        📥 Daten laden & zur Modulwahl
                    </button>
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           AKTE GELADEN – SUCCESS PAGE
           ═══════════════════════════════════════════ */
        function AkteGeladen({ kunde, onStartAufmass, importResult, onWeiter }) {
            var ir = importResult || {};
            var pos = ir.positionen || [];
            var posCount = pos.length;
            var zeichnCount = (ir.zeichnungen || []).length;
            var quellenInfo = ir.quellenInfo || [];
            var fehler = ir.fehler || [];
            var hasImport = !!importResult;
            var nachtraege = ir.nachtraege || [];
            var raeume = (kunde && kunde.raeume) ? kunde.raeume : (ir.raeume || []);

            // Erkennungsmethode bestimmen
            var quelle = '';
            quellenInfo.forEach(function(q) {
                if (q.typ === 'lv' && q.quelle) quelle = q.quelle;
            });
            // OrdnerAnalyse: Wenn quellenInfo ordner-basiert ist
            var isOrdnerAnalyse = quellenInfo.some(function(q) { return q.ordner; });
            if (isOrdnerAnalyse && !quelle) quelle = 'ordneranalyse';

            const [showPositionen, setShowPositionen] = useState(false);
            const [showNachtraege, setShowNachtraege] = useState(false);

            return (
                <div className="page-container" style={{padding:'16px', minHeight:'100vh'}}>
                    {/* Header */}
                    <div style={{textAlign:'center', marginBottom:'20px'}}>
                        <div style={{fontSize:'42px', marginBottom:'8px'}}>{fehler.length > 0 && posCount === 0 ? '⚠️' : '✅'}</div>
                        <div style={{fontSize:'18px', fontWeight:'700', color:'var(--text-primary)', marginBottom:'4px'}}>
                            {hasImport ? 'KI-Analyse abgeschlossen!' : 'Kundenakte geladen!'}
                        </div>
                        <div style={{fontSize:'13px', color:'var(--text-muted)', lineHeight:'1.5'}}>
                            {kunde ? kunde.name : ''}
                        </div>
                    </div>

                    {/* Ergebnis-Dashboard */}
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'16px'}}>
                        <div style={{padding:'12px', borderRadius:'12px', background:'rgba(30,136,229,0.1)', border:'1px solid rgba(30,136,229,0.2)', textAlign:'center'}}>
                            <div style={{fontSize:'22px', fontWeight:'700', color:'#1E88E5'}}>{posCount}</div>
                            <div style={{fontSize:'10px', color:'var(--text-muted)', fontWeight:'600'}}>LV-POSITIONEN</div>
                        </div>
                        <div style={{padding:'12px', borderRadius:'12px', background:'rgba(39,174,96,0.1)', border:'1px solid rgba(39,174,96,0.2)', textAlign:'center'}}>
                            <div style={{fontSize:'22px', fontWeight:'700', color:'#27ae60'}}>{raeume.length}</div>
                            <div style={{fontSize:'10px', color:'var(--text-muted)', fontWeight:'600'}}>RÄUME ERKANNT</div>
                        </div>
                        <div style={{padding:'12px', borderRadius:'12px', background:'rgba(142,68,173,0.1)', border:'1px solid rgba(142,68,173,0.2)', textAlign:'center'}}>
                            <div style={{fontSize:'22px', fontWeight:'700', color:'#8e44ad'}}>{nachtraege.length}</div>
                            <div style={{fontSize:'10px', color:'var(--text-muted)', fontWeight:'600'}}>NACHTRÄGE</div>
                        </div>
                        <div style={{padding:'12px', borderRadius:'12px', background:'rgba(230,126,34,0.1)', border:'1px solid rgba(230,126,34,0.2)', textAlign:'center'}}>
                            <div style={{fontSize:'22px', fontWeight:'700', color:'#e67e22'}}>{quellenInfo.length}</div>
                            <div style={{fontSize:'10px', color:'var(--text-muted)', fontWeight:'600'}}>ORDNER ANALYSIERT</div>
                        </div>
                    </div>

                    {/* Erkennungsmethode */}
                    <div style={{padding:'10px 14px', borderRadius:'10px', background:'var(--bg-secondary)', marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px', fontSize:'13px'}}>
                        <span>🤖</span>
                        <span style={{fontWeight:'600'}}>Erkennungsmethode:</span>
                        <span style={{color:'var(--text-muted)'}}>
                            {isOrdnerAnalyse ? 'KI-Ordneranalyse (Gemini)' : quelle === 'ki' ? 'KI-Analyse' : quelle === 'ki-text' ? 'KI Text-Analyse' : quelle === 'regex' ? 'Regex (Offline)' : quelle || 'Automatisch'}
                        </span>
                    </div>

                    {/* LV-Positionen aufklappbar */}
                    {posCount > 0 && (
                        <div style={{background:'var(--bg-secondary)', borderRadius:'14px', marginBottom:'12px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                            <button onClick={function(){setShowPositionen(!showPositionen);}} style={{
                                width:'100%', padding:'14px 16px', border:'none', cursor:'pointer',
                                background:'none', display:'flex', alignItems:'center', gap:'8px',
                                fontSize:'13px', fontWeight:'700', color:'var(--accent-blue)', textAlign:'left'
                            }}>
                                <span>📋</span>
                                <span style={{flex:1}}>Erkannte LV-Positionen ({posCount})</span>
                                <span style={{fontSize:'16px', transition:'transform 0.2s', transform: showPositionen ? 'rotate(180deg)' : 'rotate(0)'}}>{showPositionen ? '▲' : '▼'}</span>
                            </button>
                            {showPositionen && (
                                <div style={{borderTop:'1px solid var(--border-color)', maxHeight:'300px', overflow:'auto'}}>
                                    {pos.map(function(p, i) {
                                        return (
                                            <div key={i} style={{padding:'8px 16px', borderBottom:'1px solid var(--border-color)', fontSize:'12px', display:'flex', gap:'8px', alignItems:'center'}}>
                                                <span style={{fontWeight:'700', color:'var(--accent-blue)', minWidth:'55px', fontSize:'11px'}}>{p.pos || p.posNr || ('Pos.' + (i+1))}</span>
                                                <span style={{flex:1, color:'var(--text-primary)'}}>{p.bez || p.titel || '–'}</span>
                                                <span style={{fontWeight:'600', minWidth:'50px', textAlign:'right'}}>{p.menge ? Number(p.menge).toLocaleString('de-DE') : ''}</span>
                                                <span style={{color:'var(--text-muted)', minWidth:'25px', fontSize:'10px'}}>{p.einheit || ''}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Nachträge aufklappbar */}
                    {nachtraege.length > 0 && (
                        <div style={{background:'var(--bg-secondary)', borderRadius:'14px', marginBottom:'12px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                            <button onClick={function(){setShowNachtraege(!showNachtraege);}} style={{
                                width:'100%', padding:'14px 16px', border:'none', cursor:'pointer',
                                background:'none', display:'flex', alignItems:'center', gap:'8px',
                                fontSize:'13px', fontWeight:'700', color:'#8e44ad', textAlign:'left'
                            }}>
                                <span>📑</span>
                                <span style={{flex:1}}>Erkannte Nachträge ({nachtraege.length})</span>
                                <span style={{fontSize:'16px', transition:'transform 0.2s', transform: showNachtraege ? 'rotate(180deg)' : 'rotate(0)'}}>{showNachtraege ? '▲' : '▼'}</span>
                            </button>
                            {showNachtraege && (
                                <div style={{borderTop:'1px solid var(--border-color)', maxHeight:'200px', overflow:'auto'}}>
                                    {nachtraege.map(function(n, ni) {
                                        var statusColor = n.status === 'beauftragt' ? '#27ae60' : n.status === 'abgelehnt' ? '#e74c3c' : '#f39c12';
                                        return (
                                            <div key={ni} style={{padding:'8px 16px', borderBottom:'1px solid var(--border-color)', fontSize:'12px', display:'flex', gap:'8px', alignItems:'center'}}>
                                                <span style={{width:'8px', height:'8px', borderRadius:'50%', background:statusColor, flexShrink:0}}></span>
                                                <span style={{fontWeight:'700', minWidth:'30px'}}>{n.nachtragNr || ('N' + (ni+1))}</span>
                                                <span style={{flex:1, color:'var(--text-primary)'}}>{n.bezeichnung || n.leistung || '–'}</span>
                                                {n.summe && <span style={{fontWeight:'600', color:statusColor}}>{Number(n.summe).toLocaleString('de-DE')} €</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Verarbeitete Ordner/Dateien */}
                    {quellenInfo.length > 0 && (
                        <div style={{background:'var(--bg-secondary)', borderRadius:'14px', padding:'14px 16px', marginBottom:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                            <div style={{fontSize:'12px', fontWeight:'700', marginBottom:'8px', color:'var(--text-secondary)'}}>
                                {isOrdnerAnalyse ? '📂 Analysierte Ordner' : '📄 Verarbeitete Dateien'}
                            </div>
                            {quellenInfo.map(function(q, qi) {
                                return (
                                    <div key={qi} style={{fontSize:'12px', color:'var(--text-muted)', padding:'3px 0', display:'flex', gap:'6px', alignItems:'center'}}>
                                        <span>{q.ordner ? '📁' : q.typ === 'lv' ? '📄' : q.typ === 'excel' ? '📊' : '🖼️'}</span>
                                        <span style={{flex:1}}>{q.name || q.datei || ('Ordner ' + (q.ordner || ''))}</span>
                                        {q.dokumente && <span style={{fontSize:'10px', color:'var(--accent-blue)', fontWeight:'600'}}>{q.dokumente} Dok.</span>}
                                        {q.positionen && <span style={{fontSize:'10px', color:'var(--accent-blue)', fontWeight:'600'}}>{q.positionen} Pos.</span>}
                                        {q.quelle && <span style={{fontSize:'9px', padding:'1px 5px', background:'rgba(30,136,229,0.1)', borderRadius:'4px', color:'var(--accent-blue)'}}>{q.quelle}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Fehler */}
                    {fehler.length > 0 && (
                        <div style={{background:'rgba(231,76,60,0.08)', borderRadius:'14px', padding:'14px 16px', marginBottom:'12px', border:'1px solid rgba(231,76,60,0.2)'}}>
                            <div style={{fontSize:'12px', fontWeight:'700', color:'#e74c3c', marginBottom:'6px'}}>⚠ Fehler bei {fehler.length} Datei(en)</div>
                            {fehler.map(function(f, fi) {
                                return (
                                    <div key={fi} style={{fontSize:'11px', color:'#e74c3c', padding:'2px 0'}}>
                                        {f.datei}: {f.fehler}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Projektdaten-Zusammenfassung */}
                    {kunde && (kunde.auftraggeber || kunde.bauleitung || kunde.architekt) && (
                        <div style={{background:'var(--bg-secondary)', borderRadius:'14px', padding:'14px 16px', marginBottom:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                            <div style={{fontSize:'12px', fontWeight:'700', marginBottom:'8px', color:'var(--text-secondary)'}}>📋 Erkannte Projektdaten</div>
                            {kunde.auftraggeber && <div style={{fontSize:'13px', padding:'3px 0'}}>👤 <strong>Auftraggeber:</strong> {kunde.auftraggeber}</div>}
                            {kunde.adresse && <div style={{fontSize:'13px', padding:'3px 0', color:'var(--text-muted)'}}>📍 {kunde.adresse}</div>}
                            {kunde.bauleitung && <div style={{fontSize:'13px', padding:'3px 0'}}>🏗️ <strong>Bauleitung:</strong> {kunde.bauleitung}</div>}
                            {kunde.architekt && <div style={{fontSize:'13px', padding:'3px 0'}}>📐 <strong>Architekt:</strong> {kunde.architekt}</div>}
                            {kunde.baumassnahme && <div style={{fontSize:'13px', padding:'3px 0', color:'var(--text-muted)'}}>🏠 {kunde.baumassnahme}</div>}
                        </div>
                    )}

                    {/* PRIMARY: Weiter zur Modulauswahl */}
                    {onWeiter && (
                        <button onClick={onWeiter} style={{
                            width:'100%', padding:'16px', borderRadius:'12px', border:'none', cursor:'pointer',
                            background:'linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)',
                            color:'white', fontSize:'16px', fontWeight:'700',
                            boxShadow:'0 4px 12px rgba(30,136,229,0.3)',
                            display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                            marginBottom:'10px'
                        }}>
                            🚀 Weiter zur Modulauswahl
                        </button>
                    )}

                    {/* SECONDARY: Direkt Aufmass starten */}
                    <button onClick={onStartAufmass} style={{
                        width:'100%', padding:'12px', borderRadius:'12px', border:'1px solid rgba(30,136,229,0.3)', cursor:'pointer',
                        background:'transparent',
                        color:'var(--accent-blue)', fontSize:'13px', fontWeight:'600',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
                    }}>
                        📐 Direkt Aufmass starten
                    </button>
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           RAUMERKENNUNG COMPONENT (mit Positionsauswahl)
           ═══════════════════════════════════════════ */
        function Raumerkennung({ kunde, onSelectRaum, fertigeRaeume, lastRaumData, gesamtliste, onShowGesamtliste }) {
            const [showManual, setShowManual] = useState(false);
            const [manualNr, setManualNr] = useState('');
            const [manualGeschoss, setManualGeschoss] = useState('');
            const [manualBez, setManualBez] = useState('');
            const [customGeschoss, setCustomGeschoss] = useState('');
            const [showCustomGeschoss, setShowCustomGeschoss] = useState(false);
            const [geschossListe, setGeschossListe] = useState(['KG', 'EG', 'OG', '1.OG', '2.OG', 'DG']);
            const [manualWaende, setManualWaende] = useState([
                { id: 'A', l: '' }, { id: 'B', l: '' }, { id: 'C', l: '' }, { id: 'D', l: '' }
            ]);
            const [manualHoehe, setManualHoehe] = useState('');
            const [manualRaumhoehe, setManualRaumhoehe] = useState('');
            const [manualAbdichtungshoehe, setManualAbdichtungshoehe] = useState('');
            const [manualSockelhoehe, setManualSockelhoehe] = useState('');
            const [manualFliesenUmlaufend, setManualFliesenUmlaufend] = useState(true);
            const [manualAbdichtungUmlaufend, setManualAbdichtungUmlaufend] = useState(true);
            const nrRef = useRef(null);

            // ── Globaler Enter-Key Handler für Raumerkennung ──
            useEffect(() => {
                const handleEnter = (e) => {
                    if (e.key !== 'Enter') return;
                    if (e.target.tagName === 'TEXTAREA') return;

                    // ── Positionsauswahl-Modal: Enter = Weiter zum Raumblatt ──
                    if (showPosModal && activeRaum && selectedPositions.length > 0) {
                        e.preventDefault();
                        handleWeiterZumRaumblatt();
                        return;
                    }

                    // ── Baugleich-Dialog: Enter = Submit ──
                    if (showBaugleich && bgNr) {
                        // Falls im Input, erst zum nächsten springen
                        if (e.target.tagName === 'INPUT') {
                            const modal = e.target.closest('.modal');
                            if (modal) {
                                const inputs = [...modal.querySelectorAll('input')];
                                const idx = inputs.indexOf(e.target);
                                if (idx >= 0 && idx < inputs.length - 1) {
                                    e.preventDefault();
                                    inputs[idx + 1].focus();
                                    inputs[idx + 1].select();
                                    return;
                                }
                            }
                        }
                        // Letztes Feld oder kein Input → Submit
                        e.preventDefault();
                        const submitBtn = document.querySelector('.modal .modal-btn.primary:not([disabled])');
                        if (submitBtn) submitBtn.click();
                        return;
                    }

                    // ── Manueller Raum-Dialog: Enter durch alle Felder navigieren ──
                    if (showManual && e.target.tagName === 'INPUT') {
                        const card = e.target.closest('.manual-raum-card');
                        if (card) {
                            const allInputs = [...card.querySelectorAll('input[type="text"], input[type="number"], input[inputMode="decimal"]')];
                            const idx = allInputs.indexOf(e.target);
                            if (idx >= 0 && idx < allInputs.length - 1) {
                                e.preventDefault();
                                allInputs[idx + 1].focus();
                                allInputs[idx + 1].select();
                                return;
                            }
                            // Letztes Feld → Submit wenn Raumnummer vorhanden
                            if (manualNr) {
                                e.preventDefault();
                                handleManualSubmit();
                                return;
                            }
                        }
                    }

                    // ── Duplikat-Modal: Enter = Erste Option wählen ──
                    if (showDupModal) {
                        e.preventDefault();
                        return;
                    }
                };
                window.addEventListener('keydown', handleEnter);
                return () => window.removeEventListener('keydown', handleEnter);
            });

            // Raumauswahl State
            const [activeRaum, setActiveRaum] = useState(null);
            const [showPosModal, setShowPosModal] = useState(false);
            const [selectedPositions, setSelectedPositions] = useState([]);
            const [showDupModal, setShowDupModal] = useState(null);

            // Manuelle Position State
            const [showManualPos, setShowManualPos] = useState(false);
            const [manualPosNr, setManualPosNr] = useState('');
            const [manualPosBez, setManualPosBez] = useState('');
            const [manualPosEinheit, setManualPosEinheit] = useState('m²');
            const [manualPosMenge, setManualPosMenge] = useState('');
            const [manualPosBereich, setManualPosBereich] = useState('Manuell');
            const [manuellePositionen, setManuellePositionen] = useState([]);
            const [hiddenLvPositionen, setHiddenLvPositionen] = useState([]);
            const [showHiddenPos, setShowHiddenPos] = useState(false);

            // Baugleich-Dialog State
            const [showBaugleich, setShowBaugleich] = useState(false);
            const [bgNr, setBgNr] = useState('');
            const [bgBez, setBgBez] = useState('');
            const [bgGeschoss, setBgGeschoss] = useState('');
            const [bgSonstiges, setBgSonstiges] = useState('');
            const [showBgCustomGeschoss, setShowBgCustomGeschoss] = useState(false);
            const [bgCustomGeschoss, setBgCustomGeschoss] = useState('');

            const addBgGeschoss = () => {
                if (bgCustomGeschoss && !geschossListe.includes(bgCustomGeschoss)) {
                    setGeschossListe(prev => [...prev, bgCustomGeschoss]);
                    setBgGeschoss(bgCustomGeschoss);
                    setBgCustomGeschoss('');
                    setShowBgCustomGeschoss(false);
                }
            };

            const erkannteRaeume = kunde.raeume || [];
            const lvPositionen = LV_POSITIONEN[kunde._lvPositionenKey] || LV_POSITIONEN[kunde._driveFolderId] || LV_POSITIONEN[kunde.id] || [];
            const duplicates = findDuplicatePositions(lvPositionen);

            // ═══ Auto-Fill: Wenn Vorraum-Daten existieren, Höhen-Felder automatisch vorausfüllen ═══
            useEffect(() => {
                if (!lastRaumData) return;
                if (lastRaumData.hoehe) setManualHoehe(formatMass(lastRaumData.hoehe));
                if (lastRaumData.raumhoehe) setManualRaumhoehe(formatMass(lastRaumData.raumhoehe));
                if (lastRaumData.abdichtungshoehe) setManualAbdichtungshoehe(formatMass(lastRaumData.abdichtungshoehe));
                if (lastRaumData.sockelhoehe) setManualSockelhoehe(formatMass(lastRaumData.sockelhoehe));
                if (lastRaumData.fliesenUmlaufend !== undefined) setManualFliesenUmlaufend(lastRaumData.fliesenUmlaufend);
                if (lastRaumData.abdichtungUmlaufend !== undefined) setManualAbdichtungUmlaufend(lastRaumData.abdichtungUmlaufend);
                if (lastRaumData.geschoss) setManualGeschoss(lastRaumData.geschoss);
            }, []);  // Nur einmal beim Mount

            const addGeschoss = () => {
                if (customGeschoss && !geschossListe.includes(customGeschoss)) {
                    setGeschossListe(prev => [...prev, customGeschoss]);
                    setManualGeschoss(customGeschoss);
                    setCustomGeschoss('');
                    setShowCustomGeschoss(false);
                }
            };

            const addWand = () => {
                const nextId = String.fromCharCode(65 + manualWaende.length);
                setManualWaende(prev => [...prev, { id: nextId, l: '' }]);
            };

            const removeWand = (idx) => {
                if (manualWaende.length <= 2) return;
                setManualWaende(prev => {
                    const newW = prev.filter((_, i) => i !== idx);
                    return newW.map((w, i) => ({ ...w, id: String.fromCharCode(65 + i) }));
                });
            };

            const updateWandL = (idx, val) => {
                setManualWaende(prev => prev.map((w, i) => i === idx ? { ...w, l: val } : w));
            };

            const formatWandOnBlur = (idx) => {
                setManualWaende(prev => prev.map((w, i) => {
                    if (i !== idx) return w;
                    const v = w.l;
                    if (v && !isNaN(parseFloat(String(v).replace(',','.')))) {
                        return { ...w, l: formatMass(v) };
                    }
                    return w;
                }));
            };

            const handleCopyLastRoom = () => {
                if (!lastRaumData) return;
                // Nur Einstellungen kopieren, NICHT Wände (die sind raumspezifisch)
                if (lastRaumData.hoehe) setManualHoehe(formatMass(lastRaumData.hoehe));
                if (lastRaumData.raumhoehe) setManualRaumhoehe(formatMass(lastRaumData.raumhoehe));
                if (lastRaumData.abdichtungshoehe) setManualAbdichtungshoehe(formatMass(lastRaumData.abdichtungshoehe));
                if (lastRaumData.sockelhoehe) setManualSockelhoehe(formatMass(lastRaumData.sockelhoehe));
                if (lastRaumData.fliesenUmlaufend !== undefined) setManualFliesenUmlaufend(lastRaumData.fliesenUmlaufend);
                if (lastRaumData.abdichtungUmlaufend !== undefined) setManualAbdichtungUmlaufend(lastRaumData.abdichtungUmlaufend);
                if (lastRaumData.geschoss) setManualGeschoss(lastRaumData.geschoss);
            };

            // ═══ Einstellungen vom Vorraum auf erkannten Raum übernehmen ═══
            // PRIORITÄT: Raummaße (Wände, Türen, Fenster) → aus ZEICHNUNG des neuen Raums
            //            Einstellungen (Höhen, Schalter, Defaults) → aus VORRAUM (lastRaumData)
            const handleCopyToRecognized = (raum) => {
                if (!lastRaumData) return raum;
                const updated = { ...raum };
                
                // ── Wände: IMMER vom neuen Raum (aus Zeichnung) behalten! ──
                // raum.waende wird NICHT überschrieben!
                
                // ── Höhen: Zeichnung hat Vorrang, sonst vom Vorraum ──
                if (!raum.fliesenhoehe && lastRaumData.hoehe) updated.fliesenhoehe = lastRaumData.hoehe;
                if (!raum.raumhoehe && lastRaumData.raumhoehe) updated.raumhoehe = lastRaumData.raumhoehe;
                
                // ── Abdichtung + Sockel: NIE in Zeichnung → IMMER vom Vorraum ──
                if (lastRaumData.abdichtungshoehe) updated.abdichtungshoehe = lastRaumData.abdichtungshoehe;
                if (lastRaumData.sockelhoehe) updated.sockelhoehe = lastRaumData.sockelhoehe;
                
                // ── Alle Schalter: IMMER vom Vorraum ──
                if (lastRaumData.fliesenUmlaufend !== undefined) updated.fliesenUmlaufend = lastRaumData.fliesenUmlaufend;
                if (lastRaumData.abdichtungUmlaufend !== undefined) updated.abdichtungUmlaufend = lastRaumData.abdichtungUmlaufend;
                if (lastRaumData.fliesenDeckenhoch !== undefined) updated.fliesenDeckenhoch = lastRaumData.fliesenDeckenhoch;
                if (lastRaumData.abdichtungDeckenhoch !== undefined) updated.abdichtungDeckenhoch = lastRaumData.abdichtungDeckenhoch;
                if (lastRaumData.bodenPlusTuerlaibung !== undefined) updated.bodenPlusTuerlaibung = lastRaumData.bodenPlusTuerlaibung;
                
                // ── Tür/Fenster/Sonstige-Defaults: IMMER vom Vorraum ──
                if (lastRaumData.tuerDefaults) updated.tuerDefaults = lastRaumData.tuerDefaults;
                if (lastRaumData.fensterDefaults) updated.fensterDefaults = lastRaumData.fensterDefaults;
                if (lastRaumData.sonstigeDefaults) updated.sonstigeDefaults = lastRaumData.sonstigeDefaults;
                // ── Komplette Einträge für Vorladung ──
                if (lastRaumData.tuerenEntries) updated.tuerenEntries = lastRaumData.tuerenEntries;
                if (lastRaumData.fensterEntries) updated.fensterEntries = lastRaumData.fensterEntries;
                
                return updated;
            };

            const handleManualSubmit = () => {
                if (!manualNr) return;
                const filledWaende = manualWaende.filter(w => w.l);
                const manualRaum = {
                    nr: manualNr,
                    geschoss: manualGeschoss || 'EG',
                    bez: manualBez || 'Raum ' + manualNr,
                    quelle: 'Manuelle Eingabe',
                    waende: filledWaende.map(w => ({ id: w.id, l: parseMass(w.l) })),
                    hoehe: parseMass(manualHoehe),
                    fliesenhoehe: parseMass(manualHoehe),
                    raumhoehe: parseMass(manualRaumhoehe),
                    abdichtungshoehe: parseMass(manualAbdichtungshoehe),
                    sockelhoehe: parseMass(manualSockelhoehe),
                    fliesenUmlaufend: manualFliesenUmlaufend,
                    abdichtungUmlaufend: manualAbdichtungUmlaufend,
                    fliesenDeckenhoch: (lastRaumData && lastRaumData.fliesenDeckenhoch) || false,
                    abdichtungDeckenhoch: (lastRaumData && lastRaumData.abdichtungDeckenhoch) || false,
                    bodenPlusTuerlaibung: (lastRaumData && lastRaumData.bodenPlusTuerlaibung) || false,
                    tuerDefaults: (lastRaumData && lastRaumData.tuerDefaults) || null,
                    fensterDefaults: (lastRaumData && lastRaumData.fensterDefaults) || null,
                    sonstigeDefaults: (lastRaumData && lastRaumData.sonstigeDefaults) || null,
                    tuerenEntries: (lastRaumData && lastRaumData.tuerenEntries) || null,
                    fensterEntries: (lastRaumData && lastRaumData.fensterEntries) || null,
                    abzuege: [],
                    material: '',
                    manuell: filledWaende.length === 0,
                };
                setActiveRaum(manualRaum);
                // Positionen vom Vorraum vorauswählen (wenn vorhanden)
                if ((lastRaumData && lastRaumData.positionen) && lastRaumData.positionen.length > 0) {
                    setSelectedPositions([...lastRaumData.positionen]);
                } else {
                    setSelectedPositions([]);
                }
                setShowPosModal(true);
            };

            const resetManual = () => {
                setShowManual(false);
                setManualNr(''); setManualBez(''); setManualGeschoss(''); setManualHoehe('');
                setManualRaumhoehe(''); setManualAbdichtungshoehe(''); setManualSockelhoehe('');
                setManualFliesenUmlaufend(true); setManualAbdichtungUmlaufend(true);
                setManualWaende([{ id: 'A', l: '' }, { id: 'B', l: '' }, { id: 'C', l: '' }, { id: 'D', l: '' }]);
            };

            const isDone = (nr) => fertigeRaeume.includes(nr);

            // Raum auswählen → Positionsauswahl öffnen
            const handleRaumClick = (raum) => {
                if (isDone(raum.nr)) return;
                // ═══ Einstellungen vom Vorraum übernehmen (wenn vorhanden) ═══
                const preparedRaum = lastRaumData ? handleCopyToRecognized(raum) : raum;
                setActiveRaum(preparedRaum);
                // Positionen vom Vorraum vorauswählen (wenn vorhanden)
                if ((lastRaumData && lastRaumData.positionen) && lastRaumData.positionen.length > 0) {
                    setSelectedPositions([...lastRaumData.positionen]);
                } else {
                    setSelectedPositions([]);
                }
                setShowPosModal(true);
            };

            // Position togglen - MUSS IMMER funktionieren
            const togglePosition = (pos) => {
                const isManuell = pos.manuell;
                const alreadySelected = selectedPositions.find(p => p.pos === pos.pos && (isManuell ? p.manuell : !p.manuell));
                if (alreadySelected) {
                    // Abwählen (nicht löschen!)
                    setSelectedPositions(prev => prev.filter(p => !(p.pos === pos.pos && (isManuell ? p.manuell : !p.manuell))));
                } else {
                    // Auswählen - sofort hinzufügen
                    setSelectedPositions(prev => [...prev, pos]);
                    // Wenn Duplikat (nur LV): zusätzlich Hinweis-Dialog zeigen (nicht blockierend)
                    if (!isManuell && duplicates[pos.pos] && duplicates[pos.pos].length > 0) {
                        setShowDupModal({ pos, duplicates: [pos, ...duplicates[pos.pos]] });
                    }
                }
            };

            // Duplikat-Auswahl: tausche die gewählte Position gegen die alternative Pos-Nr
            const confirmDuplicate = (chosenPos) => {
                setSelectedPositions(prev => {
                    // Entferne alle Duplikate dieser Bezeichnung, füge die gewählte ein
                    const dupGroup = [showDupModal.pos, ...showDupModal.duplicates].map(d => d.pos);
                    const filtered = prev.filter(p => !dupGroup.includes(p.pos));
                    return [...filtered, chosenPos];
                });
                setShowDupModal(null);
            };

            // Manuelle Position hinzufügen
            const addManualPosition = () => {
                if (!manualPosNr.trim() || !manualPosBez.trim()) return;
                const newPos = {
                    pos: manualPosNr.trim(),
                    bez: manualPosBez.trim(),
                    einheit: manualPosEinheit,
                    menge: manualPosMenge ? parseFloat(manualPosMenge.replace(',', '.')) : 0,
                    bereich: manualPosBereich || 'Manuell',
                    kategorie: 'manuell',
                    tags: ['manuell'],
                    manuell: true
                };
                // Dauerhaft in die manuelle Positionsliste aufnehmen
                setManuellePositionen(prev => [...prev, newPos]);
                // Direkt in die Auswahl übernehmen (vorausgewählt)
                setSelectedPositions(prev => [...prev, newPos]);
                // Formular zurücksetzen
                setManualPosNr('');
                setManualPosBez('');
                setManualPosEinheit('m²');
                setManualPosMenge('');
                setManualPosBereich('Manuell');
                setShowManualPos(false);
            };

            // Manuelle Position dauerhaft löschen
            const deleteManualPosition = (posNr) => {
                setManuellePositionen(prev => prev.filter(p => p.pos !== posNr));
                setSelectedPositions(prev => prev.filter(p => !(p.manuell && p.pos === posNr)));
            };

            // LV-Position ausblenden (entfernen aus der Liste, aber wiederherstellbar)
            const hideLvPosition = (posNr) => {
                setHiddenLvPositionen(prev => prev.includes(posNr) ? prev : [...prev, posNr]);
                setSelectedPositions(prev => prev.filter(p => !(p.pos === posNr && !p.manuell)));
            };

            // LV-Position wiederherstellen
            const restoreLvPosition = (posNr) => {
                setHiddenLvPositionen(prev => prev.filter(nr => nr !== posNr));
            };

            // Weiter zum Raumblatt
            const handleWeiterZumRaumblatt = () => {
                if (!activeRaum || selectedPositions.length === 0) return;
                // Lernfunktion: merke Zuordnung
                learnFromSelection(activeRaum, selectedPositions);
                setShowPosModal(false);
                onSelectRaum(activeRaum, selectedPositions);
            };

            // Sortierte Positionen für aktiven Raum
            const sortedPositions = activeRaum ? sortPositionenForRaum(lvPositionen, activeRaum) : [];
            const empfohlene = sortedPositions.filter(p => p.empfohlen && !hiddenLvPositionen.includes(p.pos));
            const sonstige = sortedPositions.filter(p => !p.empfohlen && !hiddenLvPositionen.includes(p.pos));
            const hiddenPositions = sortedPositions.filter(p => hiddenLvPositionen.includes(p.pos));

            const grouped = {};
            erkannteRaeume.forEach(r => {
                const g = r.geschoss || 'Sonstige';
                if (!grouped[g]) grouped[g] = [];
                grouped[g].push(r);
            });

            return (
                <div className="page-container">
                    <div className="breadcrumb">
                        <span>{kunde.name.split(' – ')[0]}</span>
                        <span>›</span>
                        <span className="breadcrumb-active">Raumerkennung</span>
                    </div>

                    <div className="page-title">Raumerkennung</div>
                    <div className="page-subtitle">Räume aus Zeichnungen, LV und Raumbuch ermittelt</div>

                    {erkannteRaeume.length > 0 && (
                        <div className="raumerkennung-info">
                            <span style={{fontSize:'18px'}}>🔍</span>
                            <span><strong>{erkannteRaeume.length} Räume</strong> erkannt – Raum antippen → Positionen auswählen → Aufmass starten</span>
                        </div>
                    )}

                    {/* Direkt Aufmass starten */}
                    <div style={{padding:'0 0 16px 0'}}>
                        <button
                            onClick={function() {
                                var direktRaum = {
                                    nr: '',
                                    geschoss: (lastRaumData && lastRaumData.geschoss) || 'EG',
                                    bez: '',
                                    quelle: 'Direkt',
                                    waende: [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}],
                                    hoehe: (lastRaumData && lastRaumData.hoehe) || 0,
                                    fliesenhoehe: (lastRaumData && lastRaumData.hoehe) || 0,
                                    raumhoehe: (lastRaumData && lastRaumData.raumhoehe) || 0,
                                    abdichtungshoehe: (lastRaumData && lastRaumData.abdichtungshoehe) || 0,
                                    sockelhoehe: (lastRaumData && lastRaumData.sockelhoehe) || 0,
                                    fliesenUmlaufend: true,
                                    abdichtungUmlaufend: true,
                                    manuell: true,
                                };
                                onSelectRaum(direktRaum, []);
                            }}
                            style={{
                                width:'100%', padding:'16px 20px', borderRadius:'14px', border:'none', cursor:'pointer',
                                background:'linear-gradient(135deg, #1E88E5, #1565C0)',
                                color:'white', fontSize:'15px', fontWeight:'700',
                                boxShadow:'0 4px 16px rgba(30,136,229,0.35)',
                                display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
                                fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px',
                            }}>
                            {'\uD83D\uDCD0'} Aufmass direkt starten
                        </button>
                        <div style={{fontSize:'11px', color:'var(--text-muted)', textAlign:'center', marginTop:'6px'}}>
                            Ohne Raumauswahl und Positionsauswahl
                        </div>
                    </div>

                    {Object.entries(grouped).map(([geschoss, raeume]) => (
                        <React.Fragment key={geschoss}>
                            <div className="raum-list-header">🏢 {geschoss}</div>
                            {raeume.map((raum, idx) => (
                                <div key={raum.nr} className={`raum-list-item ${isDone(raum.nr) ? 'done' : ''}`}
                                    style={{ animationDelay: `${idx * 0.05}s` }}
                                    onClick={() => handleRaumClick(raum)}>
                                    <span className="raum-list-nr">{raum.nr}</span>
                                    <div className="raum-list-info">
                                        <div className="raum-list-bez">{isDone(raum.nr) && '✅ '}{raum.bez}</div>
                                        <div className="raum-list-meta">
                                            <span className="raum-list-tag">📐 {raum.waende.length} Wände</span>
                                            {raum.material && <span className="raum-list-tag">🧱 {raum.material.split('+')[0].trim()}</span>}
                                            <span className="raum-list-tag">📄 {raum.quelle}</span>
                                        </div>
                                    </div>
                                    <span className="raum-list-arrow">{isDone(raum.nr) ? '✓' : '›'}</span>
                                </div>
                            ))}
                        </React.Fragment>
                    ))}

                    {/* Manueller Raum */}
                    <div style={{marginTop:'20px'}}>
                        <div className="raum-list-header">✏️ Raum manuell eingeben</div>
                        <div className={`manual-raum-card ${showManual ? 'expanded' : ''}`}
                             onClick={() => !showManual && setShowManual(true)}>
                            {!showManual ? (
                                <div className="manual-raum-collapsed">
                                    <span style={{fontSize:'22px'}}>＋</span>
                                    Raum nicht erkannt? Hier manuell eingeben
                                </div>
                            ) : (
                                <React.Fragment>
                                    <div className="manual-raum-collapsed" style={{justifyContent:'flex-start', marginBottom:'4px'}}>
                                        <span style={{fontSize:'18px'}}>✏️</span> Neuen Raum anlegen
                                    </div>
                                    <div className="manual-raum-fields">

                                        {/* Maße vom letzten Raum übernehmen */}
                                        {lastRaumData && (
                                            <button className="copy-masse-btn" onClick={handleCopyLastRoom}>
                                                🔄 Maße vom letzten Raum übernehmen
                                            </button>
                                        )}

                                        {/* Raumnummer + Bezeichnung */}
                                        <div className="manual-raum-row">
                                            <div className="manual-raum-field">
                                                <span className="manual-raum-label">Raumnummer *</span>
                                                <input ref={nrRef} className="manual-raum-input" placeholder="z.B. 0.07"
                                                    value={manualNr} onChange={e => setManualNr(e.target.value)}
                                                    autoFocus />
                                            </div>
                                            <div className="manual-raum-field">
                                                <MicLabel fieldKey="aufm_raumBez" label="Bezeichnung" />
                                                <div style={{display:'flex', gap:'3px', alignItems:'center'}}>
                                                    <MicInput fieldKey="aufm_raumBez" className="manual-raum-input bez-input" placeholder="z.B. Abstellraum"
                                                        value={manualBez} onChange={e => setManualBez(e.target.value)}
                                                        style={{flex:1}} />
                                                    <MicButton fieldKey="aufm_raumBez" size="small" onResult={function(t){ setManualBez((manualBez||'') + (manualBez?' ':'') + t); }} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Geschoss */}
                                        <div className="manual-raum-field">
                                            <span className="manual-raum-label">Geschoss</span>
                                            <div className="geschoss-btns">
                                                {geschossListe.map(g => (
                                                    <button key={g} className={`geschoss-btn ${manualGeschoss === g ? 'active' : ''}`}
                                                        onClick={() => setManualGeschoss(g)}>{g}</button>
                                                ))}
                                                {!showCustomGeschoss ? (
                                                    <button className="geschoss-btn" style={{borderStyle:'dashed', color:'var(--accent-orange)', borderColor:'var(--accent-orange)'}}
                                                        onClick={() => setShowCustomGeschoss(true)}>＋</button>
                                                ) : (
                                                    <div style={{display:'flex', gap:'4px', alignItems:'center'}}>
                                                        <input className="manual-raum-input" style={{width:'80px', padding:'7px 8px', fontSize:'13px'}}
                                                            placeholder="z.B. 3.OG" value={customGeschoss} onChange={e => setCustomGeschoss(e.target.value)}
                                                            autoFocus />
                                                        <button className="geschoss-btn" style={{color:'var(--success)', borderColor:'var(--success)', padding:'7px 10px'}}
                                                            onClick={addGeschoss}>✓</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Wandmaße */}
                                        <div className="manual-raum-field">
                                            <span className="manual-raum-label">Wandmaße</span>
                                            {manualWaende.map((w, idx) => (
                                                <div key={idx} style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px'}}>
                                                    <span style={{fontFamily:'Oswald', fontWeight:700, color:'var(--accent-orange)',
                                                        width:'28px', height:'28px', background:'rgba(230,126,34,0.12)', borderRadius:'50%',
                                                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', flexShrink:0}}>
                                                        {w.id}
                                                    </span>
                                                    <div className="masse-input-wrap" style={{flex:1}}>
                                                        <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000" style={{fontSize:'15px'}}
                                                            value={w.l} onChange={e => updateWandL(idx, e.target.value)}
                                                            onBlur={() => formatWandOnBlur(idx)}
                                                            />
                                                        <span className="masse-unit">m</span>
                                                    </div>
                                                    {manualWaende.length > 2 && (
                                                        <button className="contact-remove-btn" onClick={() => removeWand(idx)} style={{marginTop:0}}>✕</button>
                                                    )}
                                                </div>
                                            ))}
                                            <button className="add-abzug-btn" onClick={addWand} style={{marginTop:'2px'}}>＋ Wand hinzufügen</button>
                                        </div>

                                        {/* Raumhöhe */}
                                        <div className="manual-raum-field" style={{maxWidth:'180px'}}>
                                            <span className="manual-raum-label">Raumhöhe</span>
                                            <div className="masse-input-wrap">
                                                <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000" style={{fontSize:'15px'}}
                                                    value={manualRaumhoehe} onChange={e => setManualRaumhoehe(e.target.value)}
                                                    onBlur={() => { if (manualRaumhoehe && !isNaN(parseMass(manualRaumhoehe))) setManualRaumhoehe(formatMass(manualRaumhoehe)); }}
                                                    />
                                                <span className="masse-unit">m</span>
                                            </div>
                                        </div>

                                        {/* Fliesenhöhe + Umlaufend */}
                                        <div className="manual-raum-field">
                                            <span className="manual-raum-label">Fliesenhöhe</span>
                                            <div style={{display:'flex', alignItems:'flex-end', gap:'16px', flexWrap:'wrap'}}>
                                                <div className="masse-input-wrap" style={{maxWidth:'150px'}}>
                                                    <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000" style={{fontSize:'15px'}}
                                                        value={manualHoehe} onChange={e => setManualHoehe(e.target.value)}
                                                        onBlur={() => { if (manualHoehe && !isNaN(parseMass(manualHoehe))) setManualHoehe(formatMass(manualHoehe)); }}
                                                        />
                                                    <span className="masse-unit">m</span>
                                                </div>
                                                <div className="umlaufend-group">
                                                    <span className="umlaufend-label">Umlaufend</span>
                                                    <div className="ja-nein-btns">
                                                        <button className={`ja-nein-btn ${manualFliesenUmlaufend ? 'active ja' : ''}`}
                                                            onClick={() => setManualFliesenUmlaufend(true)}>Ja</button>
                                                        <button className={`ja-nein-btn ${!manualFliesenUmlaufend ? 'active nein' : ''}`}
                                                            onClick={() => setManualFliesenUmlaufend(false)}>Nein</button>
                                                    </div>
                                                </div>
                                            </div>
                                            {!manualFliesenUmlaufend && (
                                                <div className="umlaufend-hint">
                                                    ⚠ Nicht umlaufend → manuellen Rechenweg im Raumblatt verwenden
                                                </div>
                                            )}
                                        </div>

                                        {/* Abdichtungshöhe + Umlaufend */}
                                        <div className="manual-raum-field">
                                            <span className="manual-raum-label">Abdichtungshöhe</span>
                                            <div style={{display:'flex', alignItems:'flex-end', gap:'16px', flexWrap:'wrap'}}>
                                                <div className="masse-input-wrap" style={{maxWidth:'150px'}}>
                                                    <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000" style={{fontSize:'15px'}}
                                                        value={manualAbdichtungshoehe} onChange={e => setManualAbdichtungshoehe(e.target.value)}
                                                        onBlur={() => { if (manualAbdichtungshoehe && !isNaN(parseMass(manualAbdichtungshoehe))) setManualAbdichtungshoehe(formatMass(manualAbdichtungshoehe)); }}
                                                        />
                                                    <span className="masse-unit">m</span>
                                                </div>
                                                <div className="umlaufend-group">
                                                    <span className="umlaufend-label">Umlaufend</span>
                                                    <div className="ja-nein-btns">
                                                        <button className={`ja-nein-btn ${manualAbdichtungUmlaufend ? 'active ja' : ''}`}
                                                            onClick={() => setManualAbdichtungUmlaufend(true)}>Ja</button>
                                                        <button className={`ja-nein-btn ${!manualAbdichtungUmlaufend ? 'active nein' : ''}`}
                                                            onClick={() => setManualAbdichtungUmlaufend(false)}>Nein</button>
                                                    </div>
                                                </div>
                                            </div>
                                            {!manualAbdichtungUmlaufend && (
                                                <div className="umlaufend-hint">
                                                    ⚠ Nicht umlaufend → manuellen Rechenweg in der Abdichtungs-Position verwenden
                                                </div>
                                            )}
                                        </div>

                                        <div className="modal-btn-group">
                                            <button className="modal-btn secondary" onClick={resetManual}>Abbrechen</button>
                                            <button className="manual-raum-submit" disabled={!manualNr} onClick={handleManualSubmit}>
                                                📋 Positionen auswählen ▶
                                            </button>
                                        </div>
                                    </div>
                                </React.Fragment>
                            )}
                        </div>
                    </div>

                    {/* ═══ MAßE VOM VORRAUM ÜBERNEHMEN ═══ */}
                    {lastRaumData && (
                        <div style={{marginTop:'16px'}}>
                            <div className="raum-list-header">🔄 Maße vom Vorraum übernehmen</div>
                            <div style={{
                                background:'var(--bg-card)', border:'2px solid var(--success)',
                                borderRadius:'var(--radius-md)', padding:'16px', cursor:'pointer',
                                transition:'all 0.3s'
                            }}
                            onClick={() => {
                                setBgNr('');
                                setBgBez('');
                                setBgGeschoss(lastRaumData.geschoss || '');
                                setBgSonstiges('');
                                setShowBaugleich(true);
                            }}>
                                <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px'}}>
                                    <span style={{fontSize:'28px'}}>📋</span>
                                    <div>
                                        <div style={{fontFamily:'Oswald', fontSize:'16px', fontWeight:600, color:'var(--success)', letterSpacing:'0.5px'}}>
                                            Baugleichen Raum anlegen
                                        </div>
                                        <div style={{fontSize:'13px', color:'var(--text-light)', marginTop:'2px', lineHeight:'1.4'}}>
                                            Alle Maße vom zuletzt bearbeiteten Raum werden automatisch übernommen.
                                            Ideal für Serienbäder, gleiche Stationszimmer etc.
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    display:'flex', flexWrap:'wrap', gap:'6px', padding:'10px 12px',
                                    background:'rgba(39,174,96,0.06)', borderRadius:'var(--radius-sm)',
                                    border:'1px solid rgba(39,174,96,0.15)'
                                }}>
                                    <span style={{fontSize:'12px', color:'var(--text-muted)', width:'100%', marginBottom:'4px'}}>Vorraum-Daten:</span>
                                    {lastRaumData.waende && lastRaumData.waende.map(w => (
                                        <span key={w.id} style={{
                                            fontSize:'12px', padding:'3px 8px', borderRadius:'4px',
                                            background:'rgba(230,126,34,0.1)', color:'var(--accent-orange)', fontWeight:600
                                        }}>
                                            {w.id}: {fmtDe(w.l)} m
                                        </span>
                                    ))}
                                    {lastRaumData.hoehe > 0 && (
                                        <span style={{
                                            fontSize:'12px', padding:'3px 8px', borderRadius:'4px',
                                            background:'rgba(39,174,96,0.1)', color:'var(--success)', fontWeight:600
                                        }}>
                                            Höhe: {fmtDe(lastRaumData.hoehe)} m
                                        </span>
                                    )}
                                    {lastRaumData.geschoss && (
                                        <span style={{
                                            fontSize:'12px', padding:'3px 8px', borderRadius:'4px',
                                            background:'rgba(255,255,255,0.06)', color:'var(--text-light)'
                                        }}>
                                            {lastRaumData.geschoss}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ BAUGLEICH-DIALOG ═══ */}
                    {showBaugleich && lastRaumData && (
                        <div className="modal-overlay" onClick={() => setShowBaugleich(false)}>
                            <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:'420px'}}>
                                <div className="modal-title" style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                    <span style={{fontSize:'24px'}}>📋</span>
                                    Baugleichen Raum anlegen
                                </div>
                                <div style={{fontSize:'13px', color:'var(--text-light)', marginBottom:'20px', lineHeight:'1.5'}}>
                                    Alle Maße werden vom Vorraum übernommen. Bitte gib Raumnummer und Bezeichnung ein.
                                </div>

                                {/* Raumnummer */}
                                <div className="manual-raum-field" style={{marginBottom:'12px'}}>
                                    <span className="manual-raum-label">Raumnummer *</span>
                                    <input className="manual-raum-input" placeholder="z.B. A.04 oder 1.03"
                                        value={bgNr} onChange={e => setBgNr(e.target.value)}
                                        autoFocus />
                                </div>

                                {/* Bezeichnung */}
                                <div className="manual-raum-field" style={{marginBottom:'12px'}}>
                                    <MicLabel fieldKey="bg_raumBez" label="Raumbezeichnung" />
                                    <div style={{display:'flex', gap:'3px', alignItems:'center'}}>
                                        <MicInput fieldKey="bg_raumBez" className="manual-raum-input bg-bez-input" placeholder="z.B. Bad Zimmer 104"
                                            value={bgBez} onChange={e => setBgBez(e.target.value)}
                                            style={{flex:1}} />
                                        <MicButton fieldKey="bg_raumBez" size="small" onResult={function(t){ setBgBez((bgBez||'') + (bgBez?' ':'') + t); }} />
                                    </div>
                                </div>

                                {/* Geschoss */}
                                <div className="manual-raum-field" style={{marginBottom:'12px'}}>
                                    <span className="manual-raum-label">Geschoss</span>
                                    <div className="geschoss-btns">
                                        {geschossListe.map(g => (
                                            <button key={g} className={`geschoss-btn ${bgGeschoss === g ? 'active' : ''}`}
                                                onClick={() => setBgGeschoss(g)}>{g}</button>
                                        ))}
                                        {!showBgCustomGeschoss ? (
                                            <button className="geschoss-btn" style={{borderStyle:'dashed', color:'var(--accent-orange)', borderColor:'var(--accent-orange)'}}
                                                onClick={() => setShowBgCustomGeschoss(true)}>＋</button>
                                        ) : (
                                            <div style={{display:'flex', gap:'4px', alignItems:'center'}}>
                                                <input className="manual-raum-input" style={{width:'80px', padding:'7px 8px', fontSize:'13px'}}
                                                    placeholder="z.B. 3.OG" value={bgCustomGeschoss} onChange={e => setBgCustomGeschoss(e.target.value)}
                                                    autoFocus />
                                                <button className="geschoss-btn" style={{color:'var(--success)', borderColor:'var(--success)', padding:'7px 10px'}}
                                                    onClick={addBgGeschoss}>✓</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Sonstiges */}
                                <div className="manual-raum-field" style={{marginBottom:'16px'}}>
                                    <MicLabel fieldKey="bg_sonst" label="Sonstiges / Anmerkungen" />
                                    <div style={{display:'flex', gap:'4px', alignItems:'flex-start'}}>
                                        <textarea className="bg-sonst-input" placeholder="z.B. abweichende Türbreite, anderer Bodenbelag..."
                                            value={bgSonstiges} onChange={e => setBgSonstiges(e.target.value)}
                                            rows={3}
                                            style={{
                                            width:'100%', padding:'10px 12px', background:'var(--bg-primary)',
                                            border:'1px solid var(--border-color)', borderRadius:'var(--radius-sm)',
                                            color:'var(--text-white)', fontFamily:'Source Sans 3, sans-serif',
                                            fontSize:'14px', resize:'vertical', outline:'none',
                                            transition:'border-color 0.2s'
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'var(--accent-orange)'}
                                        onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                                    />
                                        <MicButton fieldKey="bg_sonst" size="normal" onResult={function(t){ setBgSonstiges((bgSonstiges||'') + (bgSonstiges?' ':'') + t); }} />
                                    </div>
                                </div>

                                {/* Übernommene Maße anzeigen */}
                                <div style={{
                                    padding:'10px 12px', background:'rgba(39,174,96,0.06)',
                                    borderRadius:'var(--radius-sm)', border:'1px solid rgba(39,174,96,0.15)',
                                    marginBottom:'20px'
                                }}>
                                    <div style={{fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'6px'}}>
                                        Übernommene Maße vom Vorraum
                                    </div>
                                    <div style={{display:'flex', flexWrap:'wrap', gap:'6px'}}>
                                        {lastRaumData.waende && lastRaumData.waende.map(w => (
                                            <span key={w.id} style={{
                                                fontSize:'12px', padding:'3px 8px', borderRadius:'4px',
                                                background:'rgba(230,126,34,0.1)', color:'var(--accent-orange)', fontWeight:600
                                            }}>
                                                {w.id}: {fmtDe(w.l)} m
                                            </span>
                                        ))}
                                        {lastRaumData.hoehe > 0 && (
                                            <span style={{
                                                fontSize:'12px', padding:'3px 8px', borderRadius:'4px',
                                                background:'rgba(39,174,96,0.1)', color:'var(--success)', fontWeight:600
                                            }}>
                                                Höhe: {fmtDe(lastRaumData.hoehe)} m
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="modal-btn-group">
                                    <button className="modal-btn secondary" onClick={() => setShowBaugleich(false)}>Abbrechen</button>
                                    <button className="modal-btn primary" style={{opacity: bgNr ? 1 : 0.4}}
                                        disabled={!bgNr}
                                        onClick={() => {
                                            const baugleichRaum = {
                                                nr: bgNr,
                                                geschoss: bgGeschoss || lastRaumData.geschoss || 'EG',
                                                bez: bgBez || 'Raum ' + bgNr,
                                                quelle: 'Baugleich (Vorraum)',
                                                waende: (lastRaumData.waende || [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}]).map(w => ({ id: w.id, l: w.l })),
                                                hoehe: lastRaumData.hoehe,
                                                fliesenhoehe: lastRaumData.hoehe,
                                                raumhoehe: lastRaumData.raumhoehe || lastRaumData.hoehe || 0,
                                                abdichtungshoehe: lastRaumData.abdichtungshoehe || 0,
                                                sockelhoehe: lastRaumData.sockelhoehe || 0,
                                                fliesenUmlaufend: lastRaumData.fliesenUmlaufend !== undefined ? lastRaumData.fliesenUmlaufend : true,
                                                abdichtungUmlaufend: lastRaumData.abdichtungUmlaufend !== undefined ? lastRaumData.abdichtungUmlaufend : true,
                                                fliesenDeckenhoch: lastRaumData.fliesenDeckenhoch || false,
                                                abdichtungDeckenhoch: lastRaumData.abdichtungDeckenhoch || false,
                                                bodenPlusTuerlaibung: lastRaumData.bodenPlusTuerlaibung || false,
                                                abzuege: (lastRaumData.abzuege || []).map(function(a) { return Object.assign({}, a, { id: Date.now() + Math.random() }); }),
                                                material: lastRaumData.material || '',
                                                sonstiges: bgSonstiges,
                                                tuerDefaults: lastRaumData.tuerDefaults || null,
                                                fensterDefaults: lastRaumData.fensterDefaults || null,
                                                sonstigeDefaults: lastRaumData.sonstigeDefaults || null,
                                                tuerenEntries: lastRaumData.tuerenEntries || null,
                                                fensterEntries: lastRaumData.fensterEntries || null,
                                                // Komplette Masse für Länge/Breite/Höhen-Übernahme
                                                _masse: lastRaumData.masse || null,
                                            };
                                            setShowBaugleich(false);
                                            setActiveRaum(baugleichRaum);
                                            setSelectedPositions(lastRaumData.positionen || []);
                                            setShowPosModal(true);
                                        }}>
                                        📋 Positionen auswählen ▶
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ POSITIONSAUSWAHL MODAL ═══ */}
                    {showPosModal && activeRaum && (
                        <div className="pos-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowPosModal(false); setActiveRaum(null); } }}>
                            <div className="pos-modal-header">
                                <div>
                                    <div className="pos-modal-title">📋 Positionen für {activeRaum.bez} ({activeRaum.nr})</div>
                                    <div style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'2px'}}>
                                        {selectedPositions.length} Position{selectedPositions.length !== 1 ? 'en' : ''} ausgewählt
                                    </div>
                                </div>
                                <button className="pos-modal-close" onClick={() => { setShowPosModal(false); setActiveRaum(null); }}>✕</button>
                            </div>

                            <div className="pos-modal-body">
                                {/* Empfohlene Positionen */}
                                {empfohlene.length > 0 && (
                                    <React.Fragment>
                                        <div className="pos-section-label">⭐ Empfohlen für diesen Raum</div>
                                        {empfohlene.map(pos => {
                                            const isSelected = selectedPositions.find(p => p.pos === pos.pos && !p.manuell);
                                            return (
                                                <div key={pos.pos} className={`pos-item ${isSelected ? 'selected' : ''}`}
                                                    style={{alignItems:'center'}}>
                                                    <div style={{display:'flex', flex:1, alignItems:'flex-start', gap:'12px', cursor:'pointer', minWidth:0}}
                                                        onClick={() => togglePosition(pos)}>
                                                        <div className={`pos-item-check`}>{isSelected ? '✓' : ''}</div>
                                                        <div className="pos-item-content">
                                                            <div>
                                                                <span className="pos-item-nr">Pos. {pos.pos}</span>
                                                                <span className="pos-item-bez">{pos.bez}</span>
                                                            </div>
                                                            <div className="pos-item-meta">
                                                                <span className="pos-item-badge empfohlen">⭐ Empfohlen</span>
                                                                <span className="pos-item-badge bereich">{pos.bereich}</span>
                                                                <span>{pos.einheit}</span>
                                                                {duplicates[pos.pos] && <span className="pos-item-badge" style={{background:'rgba(230,126,34,0.15)', color:'var(--accent-orange)'}}>⚠ Mehrfach im LV</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => hideLvPosition(pos.pos)}
                                                        style={{flexShrink:0, background:'rgba(231,76,60,0.08)', border:'1px solid rgba(231,76,60,0.2)',
                                                            borderRadius:'6px', padding:'6px 10px', cursor:'pointer', color:'#e74c3c',
                                                            fontSize:'14px', lineHeight:1}}
                                                        title="Position aus Liste entfernen">🗑️</button>
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                )}

                                {/* Sonstige Positionen */}
                                {sonstige.length > 0 && (
                                    <React.Fragment>
                                        <div className="pos-section-label">📄 Weitere Positionen im LV</div>
                                        {sonstige.map(pos => {
                                            const isSelected = selectedPositions.find(p => p.pos === pos.pos && !p.manuell);
                                            return (
                                                <div key={pos.pos} className={`pos-item ${isSelected ? 'selected' : ''}`}
                                                    style={{alignItems:'center'}}>
                                                    <div style={{display:'flex', flex:1, alignItems:'flex-start', gap:'12px', cursor:'pointer', minWidth:0}}
                                                        onClick={() => togglePosition(pos)}>
                                                        <div className={`pos-item-check`}>{isSelected ? '✓' : ''}</div>
                                                        <div className="pos-item-content">
                                                            <div>
                                                                <span className="pos-item-nr">Pos. {pos.pos}</span>
                                                                <span className="pos-item-bez">{pos.bez}</span>
                                                            </div>
                                                            <div className="pos-item-meta">
                                                                <span className="pos-item-badge bereich">{pos.bereich}</span>
                                                                <span>{pos.einheit}</span>
                                                                {duplicates[pos.pos] && <span className="pos-item-badge" style={{background:'rgba(230,126,34,0.15)', color:'var(--accent-orange)'}}>⚠ Mehrfach im LV</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => hideLvPosition(pos.pos)}
                                                        style={{flexShrink:0, background:'rgba(231,76,60,0.08)', border:'1px solid rgba(231,76,60,0.2)',
                                                            borderRadius:'6px', padding:'6px 10px', cursor:'pointer', color:'#e74c3c',
                                                            fontSize:'14px', lineHeight:1}}
                                                        title="Position aus Liste entfernen">🗑️</button>
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                )}

                                {/* ═══ MANUELL HINZUGEFÜGTE POSITIONEN ═══ */}
                                {manuellePositionen.length > 0 && (
                                    <React.Fragment>
                                        <div className="pos-section-label">✏️ Manuell hinzugefügt</div>
                                        {manuellePositionen.map(pos => {
                                            const isSelected = selectedPositions.find(p => p.pos === pos.pos && p.manuell);
                                            return (
                                                <div key={'man-' + pos.pos} className={`pos-item ${isSelected ? 'selected' : ''}`}
                                                    style={{alignItems:'center'}}>
                                                    <div style={{display:'flex', flex:1, alignItems:'flex-start', gap:'12px', cursor:'pointer', minWidth:0}}
                                                        onClick={() => togglePosition(pos)}>
                                                        <div className="pos-item-check">{isSelected ? '✓' : ''}</div>
                                                        <div className="pos-item-content">
                                                            <div>
                                                                <span className="pos-item-nr">Pos. {pos.pos}</span>
                                                                <span className="pos-item-bez">{pos.bez}</span>
                                                            </div>
                                                            <div className="pos-item-meta">
                                                                <span className="pos-item-badge" style={{background:'rgba(39,174,96,0.15)', color:'var(--accent-green)'}}>✏️ Manuell</span>
                                                                <span className="pos-item-badge bereich">{pos.bereich}</span>
                                                                <span>{pos.einheit}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => deleteManualPosition(pos.pos)}
                                                        style={{flexShrink:0, background:'rgba(231,76,60,0.08)', border:'1px solid rgba(231,76,60,0.2)',
                                                            borderRadius:'6px', padding:'6px 10px', cursor:'pointer', color:'#e74c3c',
                                                            fontSize:'14px', lineHeight:1}}
                                                        title="Position dauerhaft löschen">🗑️</button>
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                )}

                                {/* ═══ MANUELLE POSITION HINZUFÜGEN ═══ */}
                                {!showManualPos ? (
                                    <div className="manual-pos-toggle" onClick={() => setShowManualPos(true)}>
                                        <span style={{fontSize:'18px'}}>＋</span>
                                        <span>Position manuell hinzufügen</span>
                                    </div>
                                ) : (
                                    <div className="manual-pos-form">
                                        <div className="manual-pos-form-title">
                                            <span>✏️</span> Neue Position manuell anlegen
                                        </div>
                                        <div className="manual-pos-row">
                                            <div className="manual-pos-field small">
                                                <label>Pos.-Nr.</label>
                                                <input type="text" placeholder="z.B. 9.01"
                                                    value={manualPosNr}
                                                    onChange={e => setManualPosNr(e.target.value)} />
                                            </div>
                                            <div className="manual-pos-field">
                                                <MicLabel fieldKey="aufm_posBez" label="Bezeichnung" />
                                                <div style={{display:'flex', gap:'3px', alignItems:'center'}}>
                                                    <MicInput fieldKey="aufm_posBez" type="text" placeholder="z.B. Zusatzleistung XY"
                                                        value={manualPosBez}
                                                        onChange={e => setManualPosBez(e.target.value)} style={{flex:1}} />
                                                    <MicButton fieldKey="aufm_posBez" size="small" onResult={function(t){ setManualPosBez((manualPosBez||'') + (manualPosBez?' ':'') + t); }} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="manual-pos-row">
                                            <div className="manual-pos-field small">
                                                <label>Einheit</label>
                                                <select value={manualPosEinheit}
                                                    onChange={e => setManualPosEinheit(e.target.value)}>
                                                    <option value="m²">m²</option>
                                                    <option value="m">m</option>
                                                    <option value="Stk">Stk</option>
                                                    <option value="psch">psch</option>
                                                    <option value="kg">kg</option>
                                                    <option value="l">l</option>
                                                </select>
                                            </div>
                                            <div className="manual-pos-field small">
                                                <label>Menge (LV)</label>
                                                <input type="text" placeholder="0,00"
                                                    value={manualPosMenge}
                                                    onChange={e => setManualPosMenge(e.target.value)} />
                                            </div>
                                            <div className="manual-pos-field">
                                                <label>Bereich</label>
                                                <input type="text" placeholder="z.B. Nachtrag"
                                                    value={manualPosBereich}
                                                    onChange={e => setManualPosBereich(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="manual-pos-actions">
                                            <button className="manual-pos-add"
                                                disabled={!manualPosNr.trim() || !manualPosBez.trim()}
                                                onClick={addManualPosition}>
                                                ✓ Position hinzufügen
                                            </button>
                                            <button className="manual-pos-cancel"
                                                onClick={() => { setShowManualPos(false); setManualPosNr(''); setManualPosBez(''); setManualPosMenge(''); setManualPosBereich('Manuell'); }}>
                                                Abbrechen
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* ═══ ENTFERNTE POSITIONEN (WIEDERHERSTELLBAR) ═══ */}
                                {hiddenPositions.length > 0 && (
                                    <React.Fragment>
                                        <div className="manual-pos-toggle"
                                            style={{background: showHiddenPos ? 'rgba(231,76,60,0.06)' : 'rgba(150,150,150,0.06)',
                                                borderColor: showHiddenPos ? 'rgba(231,76,60,0.3)' : 'rgba(150,150,150,0.25)',
                                                color: 'var(--text-muted)'}}
                                            onClick={() => setShowHiddenPos(!showHiddenPos)}>
                                            <span style={{fontSize:'14px'}}>{showHiddenPos ? '▼' : '▶'}</span>
                                            <span>🗑️ {hiddenPositions.length} entfernte Position{hiddenPositions.length !== 1 ? 'en' : ''}</span>
                                        </div>
                                        {showHiddenPos && hiddenPositions.map(pos => (
                                            <div key={'hid-' + pos.pos} className="pos-item"
                                                style={{opacity:0.5, background:'rgba(150,150,150,0.04)', alignItems:'center'}}>
                                                <div style={{display:'flex', flex:1, alignItems:'flex-start', gap:'12px', minWidth:0}}>
                                                    <div className="pos-item-check" style={{color:'#e74c3c', borderColor:'#e74c3c'}}>✕</div>
                                                    <div className="pos-item-content">
                                                        <div>
                                                            <span className="pos-item-nr" style={{textDecoration:'line-through'}}>Pos. {pos.pos}</span>
                                                            <span className="pos-item-bez" style={{textDecoration:'line-through'}}>{pos.bez}</span>
                                                        </div>
                                                        <div className="pos-item-meta">
                                                            <span className="pos-item-badge bereich">{pos.bereich}</span>
                                                            <span>{pos.einheit}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => restoreLvPosition(pos.pos)}
                                                    style={{flexShrink:0, background:'rgba(39,174,96,0.1)', border:'1px solid rgba(39,174,96,0.3)',
                                                        borderRadius:'6px', padding:'6px 12px', cursor:'pointer', color:'var(--accent-green)',
                                                        fontSize:'12px', fontWeight:600, lineHeight:1}}
                                                    title="Position wiederherstellen">↩ Zurück</button>
                                            </div>
                                        ))}
                                    </React.Fragment>
                                )}
                            </div>

                            <div className="pos-modal-footer" style={{flexDirection:'column', gap:'8px'}}>
                                {!lastRaumData ? (
                                    /* ═══ ERSTER RAUM → "Beginn des Aufmasses" ═══ */
                                    <button className="modal-btn primary" style={{width:'100%', padding:'14px 20px', fontSize:'15px', opacity: selectedPositions.length === 0 ? 0.4 : 1}}
                                        disabled={selectedPositions.length === 0}
                                        onClick={handleWeiterZumRaumblatt}>
                                        <span style={{display:'block', fontWeight:700}}>🏗️ Beginn des Aufmasses</span>
                                        <span style={{display:'block', fontSize:'12px', opacity:0.85, marginTop:'3px'}}>
                                            {selectedPositions.length > 0
                                                ? `${selectedPositions.length} Position${selectedPositions.length > 1 ? 'en' : ''} – Raumblatt öffnen`
                                                : 'Positionen auswählen'}
                                        </span>
                                    </button>
                                ) : (
                                    /* ═══ FOLGERÄUME → "Positionen Raumblatt" + Übernahme-Info ═══ */
                                    <button className="modal-btn primary" style={{width:'100%', padding:'14px 20px', fontSize:'15px', opacity: selectedPositions.length === 0 ? 0.4 : 1}}
                                        disabled={selectedPositions.length === 0}
                                        onClick={handleWeiterZumRaumblatt}>
                                        <span style={{display:'block', fontWeight:700}}>📋 Positionen Raumblatt</span>
                                        <span style={{display:'block', fontSize:'12px', opacity:0.85, marginTop:'3px'}}>
                                            {selectedPositions.length > 0
                                                ? `${selectedPositions.length} Position${selectedPositions.length > 1 ? 'en' : ''} – Raumblatt öffnen`
                                                : 'Positionen auswählen'}
                                        </span>
                                        <span style={{display:'block', fontSize:'10px', color:'rgba(255,255,255,0.6)', marginTop:'2px'}}>
                                            ✓ Einstellungen vom Vorraum übernommen
                                        </span>
                                    </button>
                                )}

                                {/* ═══ NEU: AUFMASS DIREKT STARTEN ═══
                                     Gleiche Funktion wie auf der Raumerkennung-Seite.
                                     Springt OHNE Raumauswahl und OHNE Positionsauswahl direkt ins Raumblatt. */}
                                <button
                                    onClick={function() {
                                        var direktRaum = {
                                            nr: '',
                                            geschoss: (lastRaumData && lastRaumData.geschoss) || 'EG',
                                            bez: '',
                                            quelle: 'Direkt',
                                            waende: [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}],
                                            hoehe: (lastRaumData && lastRaumData.hoehe) || 0,
                                            fliesenhoehe: (lastRaumData && lastRaumData.hoehe) || 0,
                                            raumhoehe: (lastRaumData && lastRaumData.raumhoehe) || 0,
                                            abdichtungshoehe: (lastRaumData && lastRaumData.abdichtungshoehe) || 0,
                                            sockelhoehe: (lastRaumData && lastRaumData.sockelhoehe) || 0,
                                            fliesenUmlaufend: true,
                                            abdichtungUmlaufend: true,
                                            manuell: true,
                                        };
                                        setShowPosModal(false);
                                        setActiveRaum(null);
                                        onSelectRaum(direktRaum, []);
                                    }}
                                    style={{
                                        width:'100%', padding:'16px 20px', borderRadius:'14px', border:'none', cursor:'pointer',
                                        background:'linear-gradient(135deg, #1E88E5, #1565C0)',
                                        color:'white', fontSize:'15px', fontWeight:'700',
                                        boxShadow:'0 4px 16px rgba(30,136,229,0.35)',
                                        display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
                                        fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px',
                                    }}>
                                    {'\uD83D\uDCD0'} Aufmass direkt starten
                                </button>
                                <div style={{fontSize:'11px', color:'var(--text-muted)', textAlign:'center', marginTop:'-2px'}}>
                                    Ohne Raumauswahl und Positionsauswahl
                                </div>

                                <button className="modal-btn secondary" style={{width:'100%'}} onClick={() => { setShowPosModal(false); setActiveRaum(null); }}>
                                    Abbrechen
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ DUPLIKAT-AUSWAHL MODAL ═══ */}
                    {showDupModal && (
                        <div className="modal-overlay" onClick={() => setShowDupModal(null)}>
                            <div className="dup-modal" onClick={e => e.stopPropagation()}>
                                <div className="modal-title" style={{marginBottom:'4px'}}>⚠️ Position mehrfach im LV</div>
                                <div style={{fontSize:'14px', color:'var(--text-light)', marginBottom:'16px', lineHeight:'1.5'}}>
                                    <strong>„{showDupModal.pos.bez}"</strong> existiert mit verschiedenen Positionsnummern für unterschiedliche Bereiche.
                                    Welche Positionsnummer soll verwendet werden?
                                </div>
                                {showDupModal.duplicates.map(dup => (
                                    <div key={dup.pos} className="dup-option" onClick={() => confirmDuplicate(dup)}>
                                        <span style={{fontFamily:'Oswald', fontWeight:700, color:'var(--accent-orange)', fontSize:'16px', minWidth:'50px'}}>
                                            {dup.pos}
                                        </span>
                                        <div>
                                            <div style={{fontSize:'14px', color:'var(--text-white)', fontWeight:500}}>{dup.bez}</div>
                                            <div style={{fontSize:'12px', color:'var(--text-muted)'}}>Bereich: {dup.bereich} · {dup.einheit} · Menge: {fmtDe(dup.menge)}</div>
                                        </div>
                                    </div>
                                ))}
                                <button className="modal-btn secondary" style={{width:'100%', marginTop:'12px'}} onClick={() => setShowDupModal(null)}>
                                    Abbrechen
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Gesamtliste-Button (wenn Räume fertiggestellt) */}
                    {gesamtliste && gesamtliste.length > 0 && (
                        <div style={{padding:'16px'}}>
                            <button className="raum-action-btn" style={{width:'100%'}} onClick={onShowGesamtliste}>
                                <span className="btn-icon">📋</span>
                                <span className="btn-text">
                                    Übersicht der Gesamtliste
                                    <span className="btn-sub">{gesamtliste.length} {gesamtliste.length === 1 ? 'Raum' : 'Räume'} fertiggestellt</span>
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           RAUMBLATT COMPONENT (mit Positions-Karten)
           ═══════════════════════════════════════════ */
        function Raumblatt({ kunde, raum, onFinishRaum, onBack, selectedPositions: initPositions, lastRaumData, gesamtliste, onShowGesamtliste, onAufmassBeenden }) {
            const hasData = raum && !raum.manuell && raum.waende && raum.waende.length > 0;
            const reEdit = (raum && raum.reEditState) || null;

            // Alle LV-Positionen des Kunden (fuer Farb-Zuordnung Dropdown)
            var allLvPos = LV_POSITIONEN[kunde._lvPositionenKey] || LV_POSITIONEN[kunde._driveFolderId] || LV_POSITIONEN[kunde.id] || [];

            // ── Globaler Enter-Key Handler für ALLE Eingabefelder im Raumblatt ──
            React.useEffect(() => {
                const inputSelector = 'input:not([disabled]):not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([readonly]),textarea:not([disabled]):not([readonly]),select:not([disabled])';
                const handleEnterNav = (e) => {
                    if (e.key !== 'Enter') return;
                    if (e.defaultPrevented) return; // Bereits von anderem Handler behandelt
                    const el = e.target;
                    if (el.tagName === 'TEXTAREA') return; // Mehrzeiler: kein Enter-Nav
                    if (el.tagName !== 'INPUT' && el.tagName !== 'SELECT') return;
                    if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'file') return;
                    // Finde Container: Modal > Oeffnung > Masse-Section > Raumblatt
                    const container = el.closest('.modal-overlay') || el.closest('.modal') || el.closest('.oeffnung-body') || el.closest('.rw-modal-body') || el.closest('.masse-section') || el.closest('.raumblatt-content') || el.closest('.page-container');
                    if (!container) return;
                    const allInputs = [...container.querySelectorAll(inputSelector)].filter(inp => inp.offsetParent !== null || inp.offsetWidth > 0);
                    const idx = allInputs.indexOf(el);
                    if (idx >= 0 && allInputs[idx + 1]) {
                        e.preventDefault();
                        allInputs[idx + 1].focus();
                        if (allInputs[idx + 1].select) allInputs[idx + 1].select();
                    } else {
                        e.preventDefault();
                        el.blur();
                    }
                };
                document.addEventListener('keydown', handleEnterNav);
                return () => document.removeEventListener('keydown', handleEnterNav);
            }, []);

            const [raumName, setRaumName] = useState((raum && raum.name) || (raum ? `${raum.bez || ''} (${raum.geschoss || ''})` : ''));
            const [fotos, setFotos] = useState([]);
            const [fotoSectionOpen, setFotoSectionOpen] = useState(true);
            const [fotoDetailId, setFotoDetailId] = useState(null);
            const fotoInputRef = React.useRef(null);
            const fotoTargetWand = React.useRef(null);
            const [laserActive, setLaserActive] = useState(false);
            // ── Fotoanalyse-Raumblatt State ──
            const [fotoAnalyse, setFotoAnalyse] = useState(null);
            const fotoAnalyseInputRef = React.useRef(null);

            // ── 3-Phasen Fotodokumentation (Seite 2) ──
            const FOTO_PHASEN = [
                { key: 'rohzustand', label: 'Rohzustand', subtitle: 'Vor Arbeitsbeginn', nr: 1, color: 'var(--accent-orange)' },
                { key: 'vorarbeiten', label: 'Nach Vorarbeiten', subtitle: 'Abdichtung / Grundierung', nr: 2, color: 'var(--accent-blue)' },
                { key: 'fertigstellung', label: 'Fertigstellung', subtitle: 'Nach Fliesenarbeiten', nr: 3, color: 'var(--success)' }
            ];
            const [phasenFotos, setPhasenFotos] = useState(() => {
                if (reEdit && reEdit.phasenFotos) return reEdit.phasenFotos;
                const initial = {};
                FOTO_PHASEN.forEach(phase => { initial[phase.key] = {}; });
                return initial;
            });
            const [fotoContext, setFotoContext] = useState(null);
            const fotoInputRef2 = React.useRef(null);
            const [analyseRunning, setAnalyseRunning] = useState(false);
            const [analyseProgress, setAnalyseProgress] = useState({ current: 0, total: 0, wandId: '' });
            const [kiErgebnisse, setKiErgebnisse] = useState(
                reEdit && reEdit.kiErgebnisse ? reEdit.kiErgebnisse : {
                    loecher: 0, wandanschluesse: 0, innenecken: 0, aussenecken: 0,
                    aussenecken_lfm: 0, wandeinschluesse: 0, wandflaeche_m2: 0,
                    sanitaerObjekte: [], installationen: [],
                    abdichtungsflaeche_m2: 0, dichtungsbaender_lfm: 0, gefliesteFlaeche_m2: 0,
                    farbErgebnisse: {},
                    details: []
                }
            );
            const [expandedPhases, setExpandedPhases] = useState({ rohzustand: true, vorarbeiten: false, fertigstellung: false });

            // Objekt-Fotos: 20 Foto-Slots fuer allgemeine Gebaeude-Dokumentation
            const [objektFotos, setObjektFotos] = useState(function() {
                if (reEdit && reEdit.objektFotos) return reEdit.objektFotos;
                return Array.from({length: 20}, function(_, i) { return { nr: i + 1, image: null, croppedImage: null, marked: false, zeit: '' }; });
            });
            const [objektArchivListe, setObjektArchivListe] = useState([]);
            const [showArchivModal, setShowArchivModal] = useState(false);
            const [archivLaden, setArchivLaden] = useState(false);
            const [archivViewFotos, setArchivViewFotos] = useState(null);
            const objektFotoInputRef = React.useRef(null);
            const objektFotoTarget = React.useRef(null);

            // Fullscreen Foto-Viewer (fuer beide Seiten)
            const [fullscreenImg, setFullscreenImg] = useState(null);
            const [fullscreenZoom, setFullscreenZoom] = useState(1);
            const [fullscreenPan, setFullscreenPan] = useState({x:0, y:0});

            const [objektExpandedPhases, setObjektExpandedPhases] = useState({ rohzustand: true, vorarbeiten: false, fertigstellung: false });
            const [fotoModus, setFotoModus] = useState('waende');

            // Aktive Foto-Daten (Waende-Modus nutzt diese, Objekt hat eigene UI)
            var aktFotos = phasenFotos;
            var setAktFotos = setPhasenFotos;
            var aktExpanded = expandedPhases;
            var setAktExpanded = setExpandedPhases;
            const [cropState, setCropState] = useState(null);
            const cropCanvasRef = React.useRef(null);
            const cropImageRef = React.useRef(null);

            // ── Markierungsfarben und Farb-Zuordnung ──
            const MARKIERUNGS_FARBEN = [
                { id: 'rot',     hex: '#e63535', name: 'Rot' },
                { id: 'blau',    hex: '#1e88e5', name: 'Blau' },
                { id: 'gruen',   hex: '#2ecc71', name: 'Gruen' },
                { id: 'gelb',    hex: '#f1c40f', name: 'Gelb' },
                { id: 'lila',    hex: '#9b59b6', name: 'Lila' },
                { id: 'orange',  hex: '#e67e22', name: 'Orange' }
            ];

            const [farbZuordnung, setFarbZuordnung] = useState(() => {
                if (reEdit && reEdit.farbZuordnung) return reEdit.farbZuordnung;
                return {
                    rohzustand: [
                        { farbe: 'rot',    position: '', beschreibung: 'Bodenflaeche', einheit: 'm2' },
                        { farbe: 'blau',   position: '', beschreibung: 'Wandflaeche', einheit: 'm2' },
                        { farbe: 'gruen',  position: '', beschreibung: 'Sockel / Borduere', einheit: 'lfm' },
                        { farbe: 'gelb',   position: '', beschreibung: 'Tuer- / Fensterlaibung', einheit: 'lfm' }
                    ],
                    vorarbeiten: [
                        { farbe: 'blau',  position: '', beschreibung: 'Wand-Abdichtungsflaeche', einheit: 'm2' },
                        { farbe: 'gruen', position: '', beschreibung: 'Dichtungsband (Ecken)', einheit: 'lfm' },
                        { farbe: 'gelb',  position: '', beschreibung: 'Innen-/Aussenecken', einheit: 'Stk' },
                        { farbe: 'lila',  position: '', beschreibung: 'Dichtungsmanschetten', einheit: 'Stk' }
                    ],
                    fertigstellung: [
                        { farbe: 'rot',    position: '', beschreibung: 'Geflieste Wandflaeche', einheit: 'm2' },
                        { farbe: 'blau',   position: '', beschreibung: 'Installationsloecher', einheit: 'Stk' },
                        { farbe: 'gruen',  position: '', beschreibung: 'Dehnungsfugen', einheit: 'lfm' },
                        { farbe: 'gelb',   position: '', beschreibung: 'Schienen', einheit: 'lfm' },
                        { farbe: 'lila',   position: '', beschreibung: 'Ablagen', einheit: 'lfm' },
                        { farbe: 'orange', position: '', beschreibung: 'Laibungen', einheit: 'lfm' }
                    ]
                };
            });
            const [farbPopupOpen, setFarbPopupOpen] = useState(null);

            // ── Vollbild-Editor State ──
            const [fullscreenEdit, setFullscreenEdit] = useState({
                active: false, phase: null, wandId: null, image: null,
                editMode: 'crop', drawColor: '#e63535', drawWidth: 4,
                drawings: [], currentDraw: null,
                cropRect: null, cropDragging: false, cropCorner: null
            });
            const fullscreenCanvasRef = React.useRef(null);
            const fullscreenImgRef = React.useRef(null);

            // ── Vollbild-Editor oeffnen ──
            const openFullscreenEdit = (phase, wandId) => {
                const foto = aktFotos[phase] && aktFotos[phase][wandId];
                if (!foto) return;
                // Zoom zuruecksetzen (verhindert Zoom-Falle)
                try {
                    var vp = document.querySelector('meta[name="viewport"]');
                    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
                    document.body.style.overflow = 'hidden';
                    document.body.style.touchAction = 'none';
                    window.scrollTo(0, 0);
                } catch(e) {}
                setFullscreenEdit({
                    active: true, phase: phase, wandId: wandId,
                    image: foto.croppedImage || foto.image, editMode: 'crop',
                    originalImage: foto.image,
                    drawColor: '#e63535', drawWidth: 4,
                    drawings: foto.drawings || [], currentDraw: null,
                    cropRect: null, cropDragging: false, cropCorner: null
                });
            };

            // ── Vollbild-Editor schliessen (Zoom wiederherstellen) ──
            const closeFullscreenEdit = () => {
                try {
                    var vp = document.querySelector('meta[name="viewport"]');
                    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1');
                    document.body.style.overflow = '';
                    document.body.style.touchAction = '';
                } catch(e) {}
                setFullscreenEdit(p => ({...p, active: false}));
            };

            // ── Vollbild-Editor speichern ──
            const saveFullscreenEdit = () => {
                const fs = fullscreenEdit;
                if (!fs.active || !fs.phase || !fs.wandId) return;

                // Crop-Rect normalisieren (negative Breite/Hoehe korrigieren)
                var normCrop = null;
                if (fs.cropRect && fs.cropRect.w !== 0 && fs.cropRect.h !== 0) {
                    var cr = fs.cropRect;
                    normCrop = {
                        x: cr.w < 0 ? cr.x + cr.w : cr.x,
                        y: cr.h < 0 ? cr.y + cr.h : cr.y,
                        w: Math.abs(cr.w),
                        h: Math.abs(cr.h)
                    };
                    // Sicherheit: Werte auf 0-1 begrenzen
                    normCrop.x = Math.max(0, Math.min(1, normCrop.x));
                    normCrop.y = Math.max(0, Math.min(1, normCrop.y));
                    normCrop.w = Math.min(normCrop.w, 1 - normCrop.x);
                    normCrop.h = Math.min(normCrop.h, 1 - normCrop.y);
                }

                var sourceImage = fs.image || fs.originalImage;

                // Crop + Zeichnungen anwenden
                if ((normCrop || fs.drawings.length > 0) && sourceImage) {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        var sx = 0, sy = 0, sw = img.width, sh = img.height;

                        if (normCrop) {
                            sx = normCrop.x * img.width;
                            sy = normCrop.y * img.height;
                            sw = normCrop.w * img.width;
                            sh = normCrop.h * img.height;
                        }
                        canvas.width = Math.max(1, Math.round(sw));
                        canvas.height = Math.max(1, Math.round(sh));
                        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

                        // Zeichnungen aufs Canvas malen
                        if (fs.drawings.length > 0) {
                            fs.drawings.forEach(d => {
                                if (!d.points || d.points.length < 2) return;
                                ctx.strokeStyle = d.color || '#e63535';
                                ctx.lineWidth = (d.width || 4) * (canvas.width / 1000);
                                ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                                ctx.beginPath();
                                if (normCrop) {
                                    ctx.moveTo((d.points[0].x - normCrop.x) / normCrop.w * canvas.width, (d.points[0].y - normCrop.y) / normCrop.h * canvas.height);
                                    for (var pi = 1; pi < d.points.length; pi++) {
                                        ctx.lineTo((d.points[pi].x - normCrop.x) / normCrop.w * canvas.width, (d.points[pi].y - normCrop.y) / normCrop.h * canvas.height);
                                    }
                                } else {
                                    ctx.moveTo(d.points[0].x * canvas.width, d.points[0].y * canvas.height);
                                    for (var pi2 = 1; pi2 < d.points.length; pi2++) {
                                        ctx.lineTo(d.points[pi2].x * canvas.width, d.points[pi2].y * canvas.height);
                                    }
                                }
                                ctx.stroke();
                            });
                        }

                        const editedImage = canvas.toDataURL('image/jpeg', 0.85);
                        setAktFotos(prev => {
                            const updated = {...prev};
                            if (updated[fs.phase] && updated[fs.phase][fs.wandId]) {
                                var existing = updated[fs.phase][fs.wandId];
                                // Original-Bild als Backup behalten (Versionshistorie)
                                var history = existing.imageHistory || [];
                                if (existing.image && history.indexOf(existing.image) === -1) {
                                    history = history.concat([existing.image]);
                                }
                                if (existing.croppedImage && history.indexOf(existing.croppedImage) === -1) {
                                    history = history.concat([existing.croppedImage]);
                                }
                                updated[fs.phase] = {...updated[fs.phase],
                                    [fs.wandId]: {
                                        ...existing,
                                        croppedImage: editedImage,
                                        drawings: fs.drawings,
                                        imageHistory: history
                                    }
                                };
                            }
                            return updated;
                        });
                        closeFullscreenEdit();
                    };
                    img.src = sourceImage;
                } else {
                    // Nur Drawings-State speichern (kein Bild-Export noetig)
                    setAktFotos(prev => {
                        const updated = {...prev};
                        if (updated[fs.phase] && updated[fs.phase][fs.wandId]) {
                            updated[fs.phase] = {...updated[fs.phase],
                                [fs.wandId]: {...updated[fs.phase][fs.wandId], drawings: fs.drawings}
                            };
                        }
                        return updated;
                    });
                    closeFullscreenEdit();
                }
            };

            const [masse, setMasse] = useState(() => {
                // ═══ RE-EDIT aus Gesamtliste: Gespeicherte Maße direkt übernehmen ═══
                if (reEdit && reEdit.masse) return { ...reEdit.masse };
                // ═══ BAUGLEICH: _masse direkt vom Vorraum übernehmen ═══
                if (raum && raum._masse) {
                    return {
                        laenge: raum._masse.laenge || '',
                        breite: raum._masse.breite || '',
                        hoehe: raum._masse.hoehe || '',
                        raumhoehe: raum._masse.raumhoehe || '',
                        abdichtungshoehe: raum._masse.abdichtungshoehe || '',
                        sockelhoehe: raum._masse.sockelhoehe || '',
                        bodenManual: raum._masse.bodenManual || '',
                    };
                }
                if (raum) {
                    // Wände mit TATSÄCHLICHEN Werten vorhanden?
                    var waendeHaveValues = raum.waende && raum.waende.length > 0 && raum.waende.some(function(w) { return w.l && parseMass(w.l) > 0; });
                    if (hasData && waendeHaveValues && raum.waende.length === 4) {
                        return {
                            laenge: formatMass(raum.waende[0].l), breite: formatMass(raum.waende[1].l),
                            hoehe: formatMass(raum.fliesenhoehe || raum.hoehe || ''),
                            raumhoehe: formatMass(raum.raumhoehe || raum.hoehe || ''),
                            abdichtungshoehe: raum.abdichtungshoehe ? formatMass(raum.abdichtungshoehe) : '',
                            sockelhoehe: raum.sockelhoehe ? formatMass(raum.sockelhoehe) : '',
                            bodenManual: raum.bodenManual ? formatMass(raum.bodenManual) : '',
                        };
                    }
                    // Fallback: Höhen aus Raum oder lastRaumData, Länge/Breite aus lastRaumData.masse
                    var fallbackMasse = (raum && raum._masse) || (lastRaumData && lastRaumData.masse) || {};
                    return {
                        laenge: (waendeHaveValues && raum.waende.length > 0) ? formatMass(raum.waende[0].l) : (fallbackMasse.laenge || ''),
                        breite: (waendeHaveValues && raum.waende.length > 1) ? formatMass(raum.waende[1].l) : (fallbackMasse.breite || ''),
                        hoehe: raum.fliesenhoehe ? formatMass(raum.fliesenhoehe) : (raum.hoehe ? formatMass(raum.hoehe) : (fallbackMasse.hoehe || '')),
                        raumhoehe: raum.raumhoehe ? formatMass(raum.raumhoehe) : (raum.hoehe ? formatMass(raum.hoehe) : (fallbackMasse.raumhoehe || '')),
                        abdichtungshoehe: raum.abdichtungshoehe ? formatMass(raum.abdichtungshoehe) : (fallbackMasse.abdichtungshoehe || ''),
                        sockelhoehe: raum.sockelhoehe ? formatMass(raum.sockelhoehe) : (fallbackMasse.sockelhoehe || ''),
                        bodenManual: raum.bodenManual ? formatMass(raum.bodenManual) : (fallbackMasse.bodenManual || ''),
                    };
                }
                return { laenge: '', breite: '', hoehe: '', raumhoehe: '', abdichtungshoehe: '', sockelhoehe: '', bodenManual: '' };
            });
            const [fliesenUmlaufend, setFliesenUmlaufend] = useState(reEdit ? reEdit.fliesenUmlaufend : (raum && raum.fliesenUmlaufend !== undefined ? raum.fliesenUmlaufend : true));
            const [abdichtungUmlaufend, setAbdichtungUmlaufend] = useState(reEdit ? reEdit.abdichtungUmlaufend : (raum && raum.abdichtungUmlaufend !== undefined ? raum.abdichtungUmlaufend : true));
            const [fliesenDeckenhoch, setFliesenDeckenhoch] = useState(() => {
                if (reEdit) return reEdit.fliesenDeckenhoch || false;
                if (raum && raum.fliesenDeckenhoch !== undefined) return raum.fliesenDeckenhoch;
                if (raum && raum.fliesenhoehe && raum.raumhoehe && raum.fliesenhoehe === raum.raumhoehe) return true;
                return false;
            });
            const [abdichtungDeckenhoch, setAbdichtungDeckenhoch] = useState(() => {
                if (reEdit) return reEdit.abdichtungDeckenhoch || false;
                if (raum && raum.abdichtungDeckenhoch !== undefined) return raum.abdichtungDeckenhoch;
                return false;
            });
            const [bodenPlusTuerlaibung, setBodenPlusTuerlaibung] = useState(reEdit ? reEdit.bodenPlusTuerlaibung || false : ((raum && raum.bodenPlusTuerlaibung) || false));
            // ── Raumblatt 4-Seiten Tab-Navigation ──
            const [rbTab, setRbTab] = useState(0); // 0=Grundriss, 1=Fotos, 2=Oeffnungen, 3=Positionen
            const [posFilter, setPosFilter] = useState('alle'); // 'alle', 'berechnet', 'leer', 'manuell'
            const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
            const [kiFotoErgebnisse, setKiFotoErgebnisse] = useState(null);

            // ── NEU: Akten-Management States ──
            const [aktePopupOpen, setAktePopupOpen] = useState(false);
            const [akteOrdner, setAkteOrdner] = useState([]);
            const [akteSelectedOrdner, setAkteSelectedOrdner] = useState(null);
            const [akteLoading, setAkteLoading] = useState(false);
            const [saveStatus, setSaveStatus] = useState('idle');

            // ── NEU: Wand-Verwaltung States ──
            const [wandAnzahl, setWandAnzahl] = useState(4);
            const [wandAnzahlPopupOpen, setWandAnzahlPopupOpen] = useState(false);
            const [masseKopieren, setMasseKopieren] = useState(false);

            // ── NEU: Handskizze erweiterte States ──
            const [zeichnenAktiv, setZeichnenAktiv] = useState(false);
            const [loeschModus, setLoeschModus] = useState(null);
            const [loeschMenuOpen, setLoeschMenuOpen] = useState(false);
            const [stiftEmpfindlichkeit, setStiftEmpfindlichkeit] = useState(5);
            const [empfindlichkeitPopupOpen, setEmpfindlichkeitPopupOpen] = useState(false);
            const [spracheAktiv, setSpracheAktiv] = useState(false);
            const [speechRecognitionInst, setSpeechRecognitionInst] = useState(null);

            const handleTabChange = (tabIdx) => {
                setRbTab(tabIdx);
                if (tabIdx === 1) setFotoModus('waende');
                else if (tabIdx === 4) setFotoModus('objekt');
                const page = document.querySelector('.page-container');
                if (page) page.scrollTo({ top: 0, behavior: 'smooth' });
            };

            // ── Tastatur-Navigation: Strg+1/2/3/4 fuer Tab-Wechsel ──
            useEffect(() => {
                const handleKeyNav = (e) => {
                    if (e.ctrlKey && e.key >= '1' && e.key <= '5') {
                        e.preventDefault();
                        handleTabChange(parseInt(e.key) - 1);
                    }
                };
                document.addEventListener('keydown', handleKeyNav);
                return () => document.removeEventListener('keydown', handleKeyNav);
            }, []);

            // ── Ungespeicherte-Aenderungen Tracking ──
            useEffect(() => {
                setHasUnsavedChanges(true);
            }, [masse, wandMasse, tueren, fenster, abzuege, posCards, posRechenwegEdits, phasenFotos, objektFotos]);

            // ── Edit-Modus fuer Rechenweg-Schritte (Stift-Button) ──
            const [posRechenwegEdits, setPosRechenwegEdits] = useState((reEdit && reEdit.posRechenwegEdits) || {}); // {posNr: [{id, label, formel, sign}]}
            const [wandMasse, setWandMasse] = useState(() => {
                if (reEdit && reEdit.wandMasse) return reEdit.wandMasse.map(w => ({...w}));
                if (hasData) {
                    return raum.waende.map(w => ({ id: w.id, l: formatMass(w.l) }));
                }
                // Auch manuell eingegebene Wände übernehmen (z.B. aus Raumerkennung)
                if (raum && raum.waende && raum.waende.length > 0) {
                    return raum.waende.map(w => ({ id: w.id, l: formatMass(w.l) }));
                }
                // WICHTIG: KEINE Wandmaße aus Vorraum übernehmen!
                // Neuer Raum beginnt immer mit leeren Wandmaßen
                return [];
            });
            const [abzuege, setAbzuege] = useState(() => {
                // ═══ RE-EDIT: Gespeicherte Daten direkt übernehmen ═══
                if (reEdit && reEdit.abzuege) return reEdit.abzuege.map(a => ({...a}));
                // 1. Aus Zeichnungsdaten (erkannter Raum mit sonstigen Abzügen)
                if (hasData && raum.abzuege) {
                    const zeichnungsSonstige = raum.abzuege.filter(a => a.typ === 'sonstige');
                    if (zeichnungsSonstige.length > 0) {
                        return zeichnungsSonstige.map((a, i) => ({
                            ...a, id: Date.now() + i,
                            breite: formatMass(a.b || a.breite || ''), hoehe: formatMass(a.h || a.hoehe || ''),
                            name: a.bez || a.name || '', vorzeichen: a.vorzeichen || 'minus'
                        }));
                    }
                }
                // 2. Aus Raum-Objekt (Baugleich) oder Vorraum übernehmen
                const sonstDef = (raum && raum.sonstigeDefaults) || (lastRaumData && lastRaumData.sonstigeDefaults);
                if (sonstDef && sonstDef.length > 0) {
                    return sonstDef.map((a, i) => ({
                        ...a, id: Date.now() + 500 + i
                    }));
                }
                return [];
            });

            // ── Türen (eigener State, aufklappbar, editierbar) ──
            // Defaults: 1. Raum-Objekt (via handleCopyToRecognized) → 2. lastRaumData → 3. Standard
            const tuerDef = (raum && raum.tuerDefaults) || (lastRaumData && lastRaumData.tuerDefaults) || {
                breite: '', hoehe: '', tiefe: '', hatLaibung: false,
                dauerelastisch: false, leibungWandGefliest: false, leibungBodenGefliest: true,
                sturzGefliest: false, leibungWandAbgedichtet: false, leibungBodenAbgedichtet: true, sturzAbgedichtet: false
            };
            const [tueren, setTueren] = useState(() => {
                // ═══ RE-EDIT: Gespeicherte Daten direkt übernehmen ═══
                if (reEdit && reEdit.tueren) return reEdit.tueren.map(t => ({...t}));
                // 1. Aus Zeichnungsdaten (erkannter Raum mit Abzügen)
                if (hasData && raum.abzuege) {
                    const zeichnungsTueren = raum.abzuege.filter(a => a.typ === 'tuer');
                    if (zeichnungsTueren.length > 0) {
                        return zeichnungsTueren.map((a, i) => ({
                            id: Date.now() + 100 + i, name: a.bez || 'Tür ' + (i+1),
                            breite: formatMass(a.b || ''), hoehe: formatMass(a.h || ''),
                            tiefe: formatMass(a.tiefe || ''), hatLaibung: !!(a.tiefe && parseMass(String(a.tiefe)) > 0),
                            dauerelastisch: tuerDef.dauerelastisch,
                            leibungWandGefliest: tuerDef.leibungWandGefliest,
                            leibungBodenGefliest: tuerDef.leibungBodenGefliest,
                            sturzGefliest: tuerDef.sturzGefliest,
                            leibungWandAbgedichtet: tuerDef.leibungWandAbgedichtet,
                            leibungBodenAbgedichtet: tuerDef.leibungBodenAbgedichtet,
                            sturzAbgedichtet: tuerDef.sturzAbgedichtet,
                            expanded: false
                        }));
                    }
                }
                // 2. Aus Vorraum-Entries (komplette Tür-Einträge übernehmen)
                const entries = (raum && raum.tuerenEntries) || (lastRaumData && lastRaumData.tuerenEntries);
                if (entries && entries.length > 0) {
                    return entries.map((t, i) => ({
                        ...t, id: Date.now() + 100 + i, expanded: false
                    }));
                }
                return [];
            });

            // ── Fenster (eigener State, aufklappbar, editierbar) ──
            // Defaults: 1. Raum-Objekt (via handleCopyToRecognized) → 2. lastRaumData → 3. Standard
            const fensterDef = (raum && raum.fensterDefaults) || (lastRaumData && lastRaumData.fensterDefaults) || {
                breite: '', hoehe: '', tiefe: '', bruestung: '', hatLaibung: false, bodengleich: false,
                leibungWandGefliest: true, fensterbankGefliest: true, sturzGefliest: false,
                leibungWandAbgedichtet: true, fensterbankAbgedichtet: true, sturzAbgedichtet: false
            };
            const [fenster, setFenster] = useState(() => {
                // ═══ RE-EDIT: Gespeicherte Daten direkt übernehmen ═══
                if (reEdit && reEdit.fenster) return reEdit.fenster.map(f => ({...f}));
                // 1. Aus Zeichnungsdaten (erkannter Raum mit Fenster-Abzügen)
                if (hasData && raum.abzuege) {
                    const zeichnungsFenster = raum.abzuege.filter(a => a.typ === 'fenster');
                    if (zeichnungsFenster.length > 0) {
                        return zeichnungsFenster.map((a, i) => ({
                            id: Date.now() + 200 + i, name: a.bez || 'Fenster ' + (i+1),
                            breite: formatMass(a.b || ''), hoehe: formatMass(a.h || ''),
                            tiefe: formatMass(a.tiefe || ''), hatLaibung: !!(a.tiefe && parseMass(String(a.tiefe)) > 0),
                            bruestung: '', bodengleich: false,
                            leibungWandGefliest: fensterDef.leibungWandGefliest,
                            fensterbankGefliest: fensterDef.fensterbankGefliest,
                            sturzGefliest: fensterDef.sturzGefliest,
                            leibungWandAbgedichtet: fensterDef.leibungWandAbgedichtet,
                            fensterbankAbgedichtet: fensterDef.fensterbankAbgedichtet,
                            sturzAbgedichtet: fensterDef.sturzAbgedichtet,
                            expanded: false
                        }));
                    }
                }
                // 2. Aus Vorraum-Entries (komplette Fenster-Einträge übernehmen)
                const entries = (raum && raum.fensterEntries) || (lastRaumData && lastRaumData.fensterEntries);
                if (entries && entries.length > 0) {
                    return entries.map((f, i) => ({
                        ...f, id: Date.now() + 200 + i, expanded: false
                    }));
                }
                return [];
            });

            const [showAbzugModal, setShowAbzugModal] = useState(false);
            const [editAbzugId, setEditAbzugId] = useState(null);
            const [lastAddedTuerId, setLastAddedTuerId] = useState(null);
            const [lastAddedFensterId, setLastAddedFensterId] = useState(null);
            const [fensterUebernehmen, setFensterUebernehmen] = useState(reEdit ? (reEdit.fensterUebernehmen !== false) : true);
            const [sonstigeUebernehmen, setSonstigeUebernehmen] = useState(reEdit ? (reEdit.sonstigeUebernehmen !== false) : true);

            // ═══ Effektive Arrays: Bei "Nein" → Daten gespeichert aber NICHT berechnet ═══
            const calcFenster = fensterUebernehmen ? fenster : [];
            const calcAbzuege = sonstigeUebernehmen ? abzuege : [];

            const [lastAddedWandIdx, setLastAddedWandIdx] = useState(null);
            const [dinTuerOpen, setDinTuerOpen] = useState(null); // t.id of open DIN picker

            const DIN_TUER_GROESSEN = [
                { b: '0,635', h: '2,010', label: '0,635 × 2,010' },
                { b: '0,760', h: '2,010', label: '0,760 × 2,010' },
                { b: '0,885', h: '2,010', label: '0,885 × 2,010' },
                { b: '1,010', h: '2,010', label: '1,010 × 2,010' },
                { b: '1,260', h: '2,010', label: '1,260 × 2,010' },
                { b: '0,635', h: '2,135', label: '0,635 × 2,135' },
                { b: '0,760', h: '2,135', label: '0,760 × 2,135' },
                { b: '0,885', h: '2,135', label: '0,885 × 2,135' },
                { b: '1,010', h: '2,135', label: '1,010 × 2,135' },
                { b: '1,260', h: '2,135', label: '1,260 × 2,135' },
                { b: '0,885', h: '2,260', label: '0,885 × 2,260' },
                { b: '1,010', h: '2,260', label: '1,010 × 2,260' },
                { b: '1,260', h: '2,260', label: '1,260 × 2,260' },
            ];
            const [abzugForm, setAbzugForm] = useState({ name: '', breite: '', hoehe: '', tiefe: '', posZuordnung: {}, manualRW: null });
            const [showAbzugRWModal, setShowAbzugRWModal] = useState(false);
            const [abzugRWZeilen, setAbzugRWZeilen] = useState([{ id: Date.now(), text: '', vorzeichen: 'plus' }]);
            const [abzugPosRWTarget, setAbzugPosRWTarget] = useState(null); // {posNr, vorzeichen} für pos-spezifischen RW
            const [isDrawMode, setIsDrawMode] = useState(false);
            const canvasRef = React.useRef(null);

            // ── Grundriss-Modus und Handskizze ──
            const [grundrissModus, setGrundrissModus] = useState('manual'); // 'ki', 'manual', 'skizze'

            // ── KI-Grundrisserkennung State ──
            const [kiGrundrissState, setKiGrundrissState] = useState({
                status: 'idle',
                statusText: '',
                pdfs: [],
                selectedPdf: null,
                kiResult: null,
                errorMsg: '',
                progress: 0
            });

            // ── KI-Grundriss: NUR im Zeichnungsordner nach PDFs suchen ──
            const startKiGrundriss = async () => {
                if (!kunde || !kunde._driveFolderId) {
                    alert('Kein Google Drive Ordner verknuepft. Bitte zuerst Kundenakte laden.');
                    return;
                }
                if (!window.GoogleDriveService || !window.GoogleDriveService.accessToken) {
                    alert('Google Drive nicht verbunden. Bitte zuerst auf der Startseite verbinden.');
                    return;
                }
                var geminiKey = (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.API_KEY) || localStorage.getItem('gemini_api_key') || '';
                if (!geminiKey) {
                    alert('Gemini API-Key nicht konfiguriert. Bitte auf der Startseite verbinden.');
                    return;
                }

                var raumNr = (raum && raum.nr) || '';
                var raumBez = (raum && raum.bez) || raumName || '';
                var geschoss = (raum && raum.geschoss) || '';

                if (!raumNr && !raumBez) {
                    alert('Bitte zuerst Raumnummer oder Bezeichnung eingeben.');
                    return;
                }

                setKiGrundrissState(function(p) { return Object.assign({}, p, { status: 'suche-pdfs', statusText: 'Suche Zeichnungsordner...', progress: 10 }); });

                try {
                    var driveService = window.GoogleDriveService;

                    // ══ SCHRITT 1: NUR den Zeichnungsordner (03_...) finden ══
                    var folderContents = await driveService.listFolderContents(kunde._driveFolderId);
                    var zeichnungsOrdner = null;

                    // Unterordner durchsuchen - NUR 03_Zeichnungen/Plaene
                    var alleFolders = folderContents.folders || [];
                    for (var fi = 0; fi < alleFolders.length; fi++) {
                        var folderName = (alleFolders[fi].name || '').toLowerCase();
                        if (folderName.indexOf('03') >= 0 ||
                            folderName.indexOf('zeichn') >= 0 ||
                            folderName.indexOf('plaen') >= 0 ||
                            folderName.indexOf('plan') >= 0 ||
                            folderName.indexOf('grundriss') >= 0) {
                            zeichnungsOrdner = alleFolders[fi];
                            break;
                        }
                    }

                    // ══ KEIN ZEICHNUNGSORDNER → SOFORT ABBRECHEN ══
                    if (!zeichnungsOrdner) {
                        setKiGrundrissState(function(p) { return Object.assign({}, p, {
                            status: 'keine-pdfs',
                            statusText: 'Kein Zeichnungsordner gefunden',
                            errorMsg: 'Im Kundenordner wurde kein Ordner fuer Zeichnungen gefunden (z.B. "03_Plaene", "Zeichnungen"). Bitte Zeichnungen hochladen oder manuell fortfahren.',
                            progress: 100
                        }); });
                        return;
                    }

                    setKiGrundrissState(function(p) { return Object.assign({}, p, { statusText: 'Suche PDFs in "' + zeichnungsOrdner.name + '"...', progress: 20 }); });

                    // ══ SCHRITT 2: NUR PDFs im Zeichnungsordner finden ══
                    var subContents = await driveService.listFolderContents(zeichnungsOrdner.id);
                    var pdfFiles = [];
                    var alleDateien = (subContents.files || []).concat(subContents.pdfs || []);
                    for (var di = 0; di < alleDateien.length; di++) {
                        var datei = alleDateien[di];
                        var isPdf = (datei.mimeType && datei.mimeType.indexOf('pdf') >= 0) ||
                                    (datei.name && datei.name.toLowerCase().endsWith('.pdf'));
                        if (isPdf) {
                            pdfFiles.push({ id: datei.id, name: datei.name, ordner: zeichnungsOrdner.name });
                        }
                    }

                    // ══ KEINE PDFs IM ZEICHNUNGSORDNER → SOFORT ABBRECHEN ══
                    if (pdfFiles.length === 0) {
                        setKiGrundrissState(function(p) { return Object.assign({}, p, {
                            status: 'keine-pdfs',
                            statusText: 'Keine PDF-Zeichnungen gefunden',
                            errorMsg: 'Im Ordner "' + zeichnungsOrdner.name + '" wurden keine PDF-Dateien gefunden. Bitte Zeichnungen als PDF hochladen oder manuell fortfahren.',
                            progress: 100
                        }); });
                        return;
                    }

                    // ══ SCHRITT 3: PDFs analysieren ══
                    setKiGrundrissState(function(p) { return Object.assign({}, p, {
                        pdfs: pdfFiles,
                        status: 'analyse',
                        statusText: pdfFiles.length + ' PDF(s) in "' + zeichnungsOrdner.name + '" gefunden, starte KI-Analyse...',
                        progress: 30
                    }); });

                    var proModelId = (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.MODELS && GEMINI_CONFIG.MODELS['pro']) ? GEMINI_CONFIG.MODELS['pro'].id : 'gemini-2.5-pro';
                    var flashModelId = (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.MODELS && GEMINI_CONFIG.MODELS['flash']) ? GEMINI_CONFIG.MODELS['flash'].id : 'gemini-2.5-flash';

                    for (var pi = 0; pi < pdfFiles.length; pi++) {
                        var pdf = pdfFiles[pi];
                        setKiGrundrissState(function(p) { return Object.assign({}, p, {
                            statusText: 'Analysiere: ' + pdf.name + ' (' + (pi+1) + '/' + pdfFiles.length + ')',
                            progress: 30 + Math.round((pi / pdfFiles.length) * 60)
                        }); });

                        try {
                            var pdfBlob = await driveService.downloadFile(pdf.id);
                            var pdfBase64 = await new Promise(function(resolve, reject) {
                                var reader = new FileReader();
                                reader.onload = function() { resolve(reader.result.split(',')[1]); };
                                reader.onerror = function() { reject(new Error('PDF lesen fehlgeschlagen')); };
                                reader.readAsDataURL(pdfBlob);
                            });

                            var kiPrompt = 'Du bist ein Experte fuer Bauzeichnungen und Grundriss-Erkennung fuer Fliesenlegerarbeiten (DIN 18352).\n\nSuche in dieser PDF-Zeichnung nach dem folgenden Raum:\n- Raumnummer: "' + (raumNr || 'nicht angegeben') + '"\n- Raumbezeichnung: "' + (raumBez || 'nicht angegeben') + '"\n- Geschoss: "' + (geschoss || 'nicht angegeben') + '"\n\nWenn du den Raum findest:\n1. Lies ALLE Wandlaengen ab (in mm UND m)\n2. Erkenne die Raumform (Rechteck oder Polygon)\n3. Zaehle alle Waende und gib ihnen IDs (A, B, C, D...)\n4. Erkenne Tueren und Fenster mit Position und Maszen\n5. Lies den Massstab ab\n6. Erkenne die Raumhoehe falls angegeben\n\nAntworte NUR als JSON ohne Markdown-Backticks:\n{"gefunden":true,"raumNr":"","raumName":"","geschoss":"","massstab":"1:50","raumForm":"rechteck","anzahlWaende":4,"waende":[{"id":"A","laenge_mm":3450,"laenge_m":3.450,"richtung_grad":0}],"tueren":[{"wandId":"A","breite_mm":885,"hoehe_mm":2100,"position_von_links_mm":500}],"fenster":[{"wandId":"C","breite_mm":1200,"hoehe_mm":1400,"bruestung_mm":600,"position_von_links_mm":800}],"masze":{"raumhoehe_mm":2600,"bodenflaeche_m2":0,"laengsteWand_mm":0},"grundrissPolygon":[{"x":0,"y":0},{"x":3450,"y":0},{"x":3450,"y":2100},{"x":0,"y":2100}],"hinweise":[],"confidence":{"raumGefunden":0.9,"masseGenauigkeit":0.8}}\n\nWenn der Raum NICHT gefunden wird:\n{"gefunden":false,"hinweise":["Raum nicht gefunden"],"alternativeRaeume":["0.02 WC","0.03 Flur"]}';

                            // Pro versuchen, bei 429 auf Flash fallen
                            var rawText = null;
                            var modelsForGrundriss = [proModelId, flashModelId];
                            for (var mgi = 0; mgi < modelsForGrundriss.length; mgi++) {
                                try {
                                    if (typeof window.callGeminiAPI === 'function') {
                                        rawText = await window.callGeminiAPI(
                                            [{ content: kiPrompt }], 8192,
                                            { model: modelsForGrundriss[mgi], files: [{ mimeType: 'application/pdf', base64Data: pdfBase64 }], jsonMode: true }
                                        );
                                    }
                                    if (rawText) break;
                                } catch(modelErr) {
                                    console.warn('[TW KI-Grundriss] ' + modelsForGrundriss[mgi] + ' fehlgeschlagen:', modelErr.message);
                                    if (mgi === 0) await new Promise(function(r) { setTimeout(r, 2000); });
                                }
                            }

                            if (!rawText) continue;

                            rawText = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                            var kiResult = JSON.parse(rawText);

                            if (kiResult.gefunden) {
                                setKiGrundrissState(function(p) { return Object.assign({}, p, {
                                    status: 'gefunden',
                                    statusText: 'Raum ' + (raumNr || raumBez) + ' erkannt!',
                                    kiResult: kiResult,
                                    selectedPdf: pdf.name,
                                    progress: 100
                                }); });
                                applyKiGrundrissToRaumblatt(kiResult);
                                return;
                            }
                        } catch(pdfErr) {
                            console.warn('PDF-Analyse Fehler bei ' + pdf.name + ':', pdfErr);
                        }
                    }

                    // Raum in keiner PDF gefunden
                    setKiGrundrissState(function(p) { return Object.assign({}, p, {
                        status: 'nicht-gefunden',
                        statusText: 'Raum nicht gefunden',
                        errorMsg: 'Der Raum "' + (raumNr || '') + ' ' + (raumBez || '') + '" konnte in keiner der ' + pdfFiles.length + ' PDF-Zeichnung(en) im Ordner "' + zeichnungsOrdner.name + '" gefunden werden.',
                        progress: 100
                    }); });

                } catch(err) {
                    console.error('KI-Grundriss Fehler:', err);
                    setKiGrundrissState(function(p) { return Object.assign({}, p, {
                        status: 'fehler',
                        statusText: 'Fehler bei der KI-Analyse',
                        errorMsg: err.message,
                        progress: 0
                    }); });
                }
            };

            // ── KI-Ergebnis in Raumblatt-State uebernehmen ──
            const applyKiGrundrissToRaumblatt = (kiResult) => {
                if (!kiResult || !kiResult.waende) return;

                var isPolygon = kiResult.raumForm === 'polygon' || kiResult.anzahlWaende > 4;

                if (isPolygon && kiResult.waende.length > 4) {
                    setRaumFormTyp('polygon');
                    setIsMultiWall(true);
                    setWandMasse(kiResult.waende.map(function(w) {
                        return { id: w.id, l: String((w.laenge_m || 0).toFixed(3)).replace('.', ',') };
                    }));
                } else {
                    setRaumFormTyp('rechteck');
                    setIsMultiWall(false);
                    var sortiert = kiResult.waende.slice().sort(function(a, b) { return (b.laenge_mm || 0) - (a.laenge_mm || 0); });
                    setMasse(function(prev) {
                        return Object.assign({}, prev, {
                            laenge: String((sortiert[0] ? sortiert[0].laenge_m : 0).toFixed(3)).replace('.', ','),
                            breite: String((sortiert[1] ? sortiert[1].laenge_m : 0).toFixed(3)).replace('.', ','),
                            raumhoehe: kiResult.masze && kiResult.masze.raumhoehe_mm
                                ? String((kiResult.masze.raumhoehe_mm / 1000).toFixed(3)).replace('.', ',')
                                : prev.raumhoehe
                        });
                    });
                }

                if (kiResult.tueren && kiResult.tueren.length > 0) {
                    setTueren(function(prev) {
                        return kiResult.tueren.map(function(t, i) {
                            return {
                                id: 'ki_t_' + i,
                                wandId: t.wandId || 'A',
                                breite: t.breite_mm ? String(t.breite_mm) : '885',
                                hoehe: t.hoehe_mm ? String(t.hoehe_mm) : '2100',
                                expanded: false,
                                quelle: 'ki-grundriss'
                            };
                        });
                    });
                }
                if (kiResult.fenster && kiResult.fenster.length > 0) {
                    setFenster(function(prev) {
                        return kiResult.fenster.map(function(f, i) {
                            return {
                                id: 'ki_f_' + i,
                                wandId: f.wandId || 'C',
                                breite: f.breite_mm ? String(f.breite_mm) : '1200',
                                hoehe: f.hoehe_mm ? String(f.hoehe_mm) : '1400',
                                bruestung: f.bruestung_mm ? String(f.bruestung_mm) : '600',
                                expanded: false,
                                quelle: 'ki-grundriss'
                            };
                        });
                    });
                }

                console.log('[TW KI-Grundriss] Ergebnis angewendet:', kiResult);
            };

            const [skizze, setSkizze] = useState({
                mode: 'draw', paths: [], currentPath: null,
                labels: [], currentLabel: null,
                processedSvg: null, erkannteWaende: [], erkannteLabels: [],
                gridSize: 20, penColor: '#b8c4d4', penWidth: 3,
                labelColor: '#e74c3c', labelWidth: 4, undoStack: []
            });
            const skizzeCanvasRef = React.useRef(null);
            const skizzeLabelTimeout = React.useRef(null);

            // Positions-Karten State
            const [posCards, setPosCards] = useState(() => {
                // ═══ RE-EDIT: Gespeicherte posCards direkt übernehmen ═══
                if (reEdit && reEdit.posCards && reEdit.posCards.length > 0) {
                    return reEdit.posCards.map(p => ({...p, expanded: false}));
                }
                // Vorraum-posCards für manuelle Einträge (Stück, manualMenge etc.)
                var vorraumPosCards = (lastRaumData && lastRaumData.posCardsData) || [];
                return (initPositions || []).map(p => {
                    // Prüfe ob diese Position im Vorraum manuelle Daten hatte
                    var vorraum = vorraumPosCards.find(function(vp) { return vp.pos === p.pos; });
                    return {
                        ...p,
                        expanded: false,
                        notizen: (vorraum && vorraum.notizen) || '',
                        manualMenge: (vorraum && vorraum.manualMenge) || '',
                        manualRechenweg: (vorraum && vorraum.manualRechenweg) || [],
                        manualErgebnis: (vorraum && vorraum.manualErgebnis) || 0,
                        hasManualRW: (vorraum && vorraum.hasManualRW) || false,
                    };
                });
            });
            const [expandedPos, setExpandedPos] = useState(null);

            // ── Manueller Rechenweg Modal ──
            const [rwModalPos, setRwModalPos] = useState(null); // pos.pos oder null
            const [rwModalZeilen, setRwModalZeilen] = useState([]);

            // ═══ LASER DISTO – Tastatur-Modus ═══
            // Enter/Tab vom DISTO → Wert formatieren + nächstes Feld
            useEffect(() => {
                if (!laserActive) return;

                // ── Wenn Feld Fokus bekommt: alles markieren → DISTO überschreibt ──
                const focusHandler = (e) => {
                    const el = e.target;
                    if (!el || !el.classList.contains('masse-input')) return;
                    setTimeout(() => el.select(), 10);
                };

                // ── Enter/Tab: Wert bereinigen, formatieren, weiter ──
                const keyHandler = (e) => {
                    if (e.key !== 'Enter' && e.key !== 'Tab') return;
                    const el = e.target;
                    if (!el || !el.classList.contains('masse-input')) return;

                    e.preventDefault();
                    e.stopPropagation();

                    let raw = el.value || '';
                    if (raw.trim()) {
                        // Einheit entfernen (m, mm, cm, ft, in, Leerzeichen)
                        raw = raw.replace(/[mMcCfFtTiInN\s]/g, '').trim();
                        const formatted = formatMass(raw);
                        const fieldKey = el.dataset ? el.dataset.laserField : null;
                        if (fieldKey) {
                            setMasse(prev => ({...prev, [fieldKey]: formatted}));
                        }
                        el.classList.add('laser-field-highlight');
                        setTimeout(() => el.classList.remove('laser-field-highlight'), 600);
                    }

                    // Nächstes Feld -- erst .masse-input im Container, dann beliebiges sichtbares Input
                    const container = el.closest('.masse-section') || el.closest('.raumblatt-content') || el.closest('.page-container');
                    if (container) {
                        const masseInputs = [...container.querySelectorAll('.masse-input')];
                        const idx = masseInputs.indexOf(el);
                        if (idx >= 0 && masseInputs[idx + 1]) {
                            setTimeout(() => {
                                masseInputs[idx + 1].focus();
                                masseInputs[idx + 1].select();
                            }, 50);
                        } else {
                            // Letztes Masse-Feld: zum nächsten beliebigen sichtbaren Input springen
                            const allSelector = 'input:not([disabled]):not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([readonly]),select:not([disabled])';
                            const allInputs = [...container.querySelectorAll(allSelector)].filter(inp => inp.offsetParent !== null || inp.offsetWidth > 0);
                            const globalIdx = allInputs.indexOf(el);
                            if (globalIdx >= 0 && allInputs[globalIdx + 1]) {
                                setTimeout(() => {
                                    allInputs[globalIdx + 1].focus();
                                    if (allInputs[globalIdx + 1].select) allInputs[globalIdx + 1].select();
                                }, 50);
                            } else {
                                el.blur();
                            }
                        }
                    }
                };

                document.addEventListener('focus', focusHandler, true);
                document.addEventListener('keydown', keyHandler, true);
                return () => {
                    document.removeEventListener('focus', focusHandler, true);
                    document.removeEventListener('keydown', keyHandler, true);
                };
            }, [laserActive]);

            useEffect(() => {
                return () => { LaserManager.deactivate(); };
            }, []);

            const toggleLaser = () => {
                if (laserActive) {
                    LaserManager.deactivate();
                    setLaserActive(false);
                } else {
                    LaserManager.activate();
                    setLaserActive(true);
                    setTimeout(() => {
                        const first = document.querySelector('.masse-input[data-laser-field="laenge"]');
                        if (first) { first.focus(); first.select(); }
                    }, 200);
                }
            };

            const openRWModal = (pos) => {
                // Lade bestehende manuelle Zeilen oder starte mit einer leeren
                const existing = pos.manualRechenweg.length > 0
                    ? pos.manualRechenweg.map(z => ({...z}))
                    : [{ id: Date.now(), text: '', vorzeichen: 'plus' }];
                setRwModalZeilen(existing);
                setRwModalPos(pos.pos);
            };

            const addRWModalZeile = () => {
                setRwModalZeilen(prev => [...prev, { id: Date.now(), text: '', vorzeichen: 'plus' }]);
            };

            const updateRWModalZeile = (zeileId, field, value) => {
                setRwModalZeilen(prev => prev.map(z => z.id === zeileId ? {...z, [field]: value} : z));
            };

            const removeRWModalZeile = (zeileId) => {
                setRwModalZeilen(prev => prev.filter(z => z.id !== zeileId));
            };

            // ── Mathematischer Ausdruck-Parser (Klammern, +, -, *, /) ──
            const evalMathExpr = (expr) => {
                try {
                    // Sicherheit: nur Zahlen, Operatoren, Klammern, Leerzeichen, Punkt
                    if (!/^[0-9+\-*/().eE\s]+$/.test(expr)) return NaN;
                    // Leere Klammern oder ungültige Ausdrücke abfangen
                    if (/\(\s*\)/.test(expr)) return NaN;
                    const fn = new Function('return (' + expr + ')');
                    const result = fn();
                    return typeof result === 'number' && isFinite(result) ? result : NaN;
                } catch(e) { return NaN; }
            };

            // Bereitet Text für die Auswertung vor: Labels entfernen, Komma→Punkt, ×→*
            const prepareCalcText = (text) => {
                if (!text || !text.trim()) return '';
                let clean = text.trim();
                // Label vor Doppelpunkt entfernen: "Wand A: 3,45 × 2,10" → "3,45 × 2,10"
                clean = clean.replace(/^[^0-9(]*:\s*/, '');
                // Führende Nicht-Zahlen/Klammern entfernen
                clean = clean.replace(/^[^0-9(.\-]+/, '');
                // Komma → Punkt (Dezimal)
                clean = clean.replace(/,/g, '.');
                // Alle Multiplikationszeichen → *
                clean = clean.replace(/[×✕⋅·xX]/g, '*');
                // Leerzeichen zwischen Zahlen → * (implizite Multiplikation)
                clean = clean.replace(/(\d)\s+(\d)/g, '$1*$2');
                clean = clean.replace(/(\))\s*(\()/g, '$1*$2');
                clean = clean.replace(/(\d)\s*(\()/g, '$1*$2');
                clean = clean.replace(/(\))\s*(\d)/g, '$1*$2');
                // Restliche Leerzeichen entfernen
                clean = clean.replace(/\s/g, '');
                return clean;
            };

            const parseRWZeile = (text) => {
                const expr = prepareCalcText(text);
                if (!expr) return 0;
                const result = evalMathExpr(expr);
                return isNaN(result) ? 0 : result;
            };

            const calcRWModalSumme = () => {
                return rwModalZeilen.reduce((sum, z) => {
                    const val = parseRWZeile(z.text);
                    return z.vorzeichen === 'minus' ? sum - val : sum + val;
                }, 0);
            };

            // Fertigstellen: Überträgt Rechenweg + Ergebnis in die Position
            const fertigstellenRW = () => {
                if (!rwModalPos) return;
                const ergebnis = Math.max(0, calcRWModalSumme());
                setPosCards(prev => prev.map(p => {
                    if (p.pos !== rwModalPos) return p;
                    return {
                        ...p,
                        manualRechenweg: rwModalZeilen.filter(z => z.text.trim()),
                        manualErgebnis: ergebnis,
                        hasManualRW: true,
                        manualMenge: '', // Reset Direkteingabe
                    };
                }));
                setRwModalPos(null);
                setRwModalZeilen([]);
            };

            // Manuellen RW zurücksetzen → zurück zu Auto
            const resetManualRW = (posNr) => {
                setPosCards(prev => prev.map(p => {
                    if (p.pos !== posNr) return p;
                    return { ...p, manualRechenweg: [], manualErgebnis: 0, hasManualRW: false };
                }));
            };

            // ═══════════════════════════════════════════════
            // VOB/C DIN 18352 – Berechnungslogik (KOMPLETT)
            // ═══════════════════════════════════════════════
            // VOB-konforme Rundung: 2 Dezimalstellen bei Flächen/Längen
            const vobRound = (val) => Math.round(val * 100) / 100;

            const L = parseMass((wandMasse[0] && wandMasse[0].l) || masse.laenge);
            const B = parseMass((wandMasse[1] && wandMasse[1].l) || masse.breite);
            const RH = parseMass(masse.raumhoehe); // Raumhöhe
            const H = fliesenDeckenhoch ? RH : parseMass(masse.hoehe); // Fliesenhöhe (bei Raumhoch = Raumhöhe)
            const AH = abdichtungDeckenhoch ? RH : parseMass(masse.abdichtungshoehe); // Abdichtungshöhe (bei Raumhoch = Raumhöhe)
            const SH = parseMass(masse.sockelhoehe); // Sockelhöhe
            const BM = parseMass(masse.bodenManual); // Manuell eingegebene Bodenfläche
            const isMultiWall = hasData && raum.waende.length > 4;
            const perimeter = wandMasse.reduce((s, w) => s + parseMass(w.l), 0);
            const wandflaeche = vobRound(H > 0 ? (isMultiWall ? perimeter * H : 2 * (L + B) * H) : 0);

            // ── Bodenfläche: Manual > Auto ──
            // Bei Mehrecken MUSS Bodenfläche manuell eingegeben werden
            // Bei Rechteck: L × B (kann manuell überschrieben werden)
            const bodenAuto = isMultiWall ? 0 : vobRound(L * B);
            const bodenflaeche = BM > 0 ? vobRound(BM) : bodenAuto;
            const bodenIstManuell = BM > 0;

            // ── Deckenfläche = gleich Bodenfläche (VOB: gleiche Regeln) ──
            const deckenflaeche = bodenflaeche;

            // ── Schichten-Regel DIN 18352 ──
            // Wenn Wandbekleidung > halbe Raumhöhe aber < volle Raumhöhe:
            // → volle Schichthöhe abrechnen (Ausnahme: Raumhoch oder festgelegtes Maß)
            const schichtenRegelAktiv = H > 0 && RH > 0 && H < RH && H > (RH / 2);
            // Hinweis: Die Schichten-Regel zeigt nur einen Info-Hinweis im Rechenweg,
            // die eigentliche Höhe H bleibt wie eingegeben (der Nutzer kann sie manuell anpassen)

            // Abdichtung Wandfläche (mit Abdichtungshöhe statt Fliesenhöhe)
            const abdichtungWandflaeche = vobRound(AH > 0 ? (isMultiWall ? perimeter * AH : 2 * (L + B) * AH) : 0);

            // Hat eine Abdichtungs-Position? (Abdichtungshöhe anzeigen)
            const hatWandabdichtung = posCards.some(p => {
                if (p.kategorie === 'abdichtung') return true;
                const bezLower = (p.bez || '').toLowerCase();
                if (bezLower.includes('abdichtung') || bezLower.includes('verbundabdichtung')) return true;
                return false;
            });

            // Tür-Bodenlaibungsfläche (Breite × Tiefe pro Tür)
            const tuerBodenLaibung = tueren.reduce((s, t) => {
                const bVal = parseMass(t.breite); const tVal = parseMass(t.tiefe);
                return s + (t.hatLaibung && tVal > 0 ? bVal * tVal : 0);
            }, 0);

            // Alle Öffnungen in einheitliche VOB-Struktur bringen
            const alleOeffnungen = [
                ...tueren.map(t => {
                    const bVal = parseMass(t.breite); const hVal = parseMass(t.hoehe); const tVal = parseMass(t.tiefe);
                    const tuerHoeherAlsFliese = hVal > H && H > 0;

                    // ── REGEL 1: Tür höher als Fliesenhöhe ──
                    // Wenn Türhöhe > Fliesenhöhe → nicht volle Fläche abziehen!
                    // Stattdessen: Türbreite vom Umfang abziehen (Wandfläche = (Umfang - Breite) × Fliesenhöhe)
                    let flaeche, abzugMethode;
                    if (tuerHoeherAlsFliese) {
                        // Abzug = Türbreite × Fliesenhöhe (nur gefliester Bereich)
                        flaeche = bVal * H;
                        abzugMethode = 'umfang'; // Türbreite wird vom Umfang abgezogen
                    } else {
                        flaeche = bVal * hVal;
                        abzugMethode = 'flaeche'; // Normale Flächenberechnung
                    }

                    // ── Laibungsberechnung mit Schaltern ──
                    // WICHTIG: laibFlaeche = NUR Wand-bezogene Laibungen (Wand + Sturz)
                    // laibBodenFlaeche = NUR Boden-bezogene Laibungen (Breite × Tiefe)
                    // Boden-Leibungen werden AUSSCHLIESSLICH zur Bodenfläche gerechnet!
                    let laibFlaeche = 0;
                    let laibBodenFlaeche = 0;
                    if (t.hatLaibung && tVal > 0) {
                        let laibWand = 0, laibBoden = 0, laibSturz = 0;
                        // Leibung Wand (2 Seiten): Höhe × Tiefe × 2
                        if (t.leibungWandGefliest) {
                            // Bei Tür höher als Fliese: Laibungshöhe = Fliesenhöhe (nicht Türhöhe!)
                            const laibH = tuerHoeherAlsFliese ? H : hVal;
                            laibWand = 2 * laibH * tVal;
                        }
                        // Leibung Boden: Breite × Tiefe → geht NUR zur Bodenfläche!
                        if (t.leibungBodenGefliest) {
                            laibBoden = bVal * tVal;
                        }
                        // Türsturz: Breite × Tiefe (nur wenn Tür NICHT höher als Fliese)
                        if (t.sturzGefliest && !tuerHoeherAlsFliese) {
                            laibSturz = bVal * tVal;
                        }
                        // Wandfläche bekommt NUR Wand-Laibung + Sturz (NICHT Boden!)
                        laibFlaeche = laibWand + laibSturz;
                        // Bodenfläche bekommt NUR Boden-Laibung
                        laibBodenFlaeche = laibBoden;
                    }

                    // ── Laibung Abdichtung (separate Berechnung) ──
                    let laibAbdichtung = 0;
                    if (t.hatLaibung && tVal > 0) {
                        const tuerHoeherAlsAbd = hVal > AH && AH > 0;
                        if (t.leibungWandAbgedichtet) {
                            const laibAH = tuerHoeherAlsAbd ? AH : hVal;
                            laibAbdichtung += 2 * laibAH * tVal;
                        }
                        if (t.leibungBodenAbgedichtet) laibAbdichtung += bVal * tVal;
                        if (t.sturzAbgedichtet && !tuerHoeherAlsAbd) laibAbdichtung += bVal * tVal;
                    }

                    return { ...t, typ: 'tuer', bVal, hVal, tVal, flaeche, laibFlaeche, laibBodenFlaeche, laibAbdichtung,
                        abzugMethode, tuerHoeherAlsFliese,
                        vobWand: flaeche <= 0.1 ? 'uebermessen' : 'abzug',
                        vobBoden: 'uebermessen', // VOB: Türen am Boden NIE abziehen
                        vobSockel: bVal <= 1.0 ? 'uebermessen' : 'abzug',
                        vobDecke: 'uebermessen' // Türen berühren Decke nicht
                    };
                }),
                ...calcFenster.map(f => {
                    const bVal = parseMass(f.breite); const hVal = parseMass(f.hoehe); const tVal = parseMass(f.tiefe);
                    const brVal = parseMass(f.bruestung);
                    const gesamtHoehe = brVal + hVal; // Brüstung + Fensterhöhe
                    const fensterHoeherAlsFliese = gesamtHoehe > H && H > 0;

                    // ── REGEL 2: Fenster-Gesamtmaß höher als Fliesenhöhe ──
                    // Wenn Brüstung + Fensterhöhe > Fliesenhöhe → reduzierter Abzug
                    // Effektive Fensterhöhe = Fensterhöhe - (Gesamtmaß - Fliesenhöhe)
                    let flaeche, effektiveHoehe;
                    if (fensterHoeherAlsFliese) {
                        effektiveHoehe = Math.max(0, hVal - (gesamtHoehe - H));
                        flaeche = effektiveHoehe * bVal;
                    } else {
                        effektiveHoehe = hVal;
                        flaeche = bVal * hVal;
                    }

                    // ── Laibungsberechnung mit Schaltern ──
                    let laibFlaeche = 0;
                    if (f.hatLaibung && tVal > 0) {
                        let laibWand = 0, laibBank = 0, laibSturz = 0;
                        // Leibung Wand (2 Seiten): effektive Höhe × Tiefe × 2
                        if (f.leibungWandGefliest) {
                            const laibH = fensterHoeherAlsFliese ? effektiveHoehe : hVal;
                            laibWand = 2 * laibH * tVal;
                        }
                        // Fensterbank: Breite × Tiefe
                        if (f.fensterbankGefliest) {
                            laibBank = bVal * tVal;
                        }
                        // Fenstersturz: Breite × Tiefe (nur wenn Fenster NICHT höher als Fliese)
                        if (f.sturzGefliest && !fensterHoeherAlsFliese) {
                            laibSturz = bVal * tVal;
                        }
                        laibFlaeche = laibWand + laibBank + laibSturz;
                    }

                    // ── Laibung Abdichtung (separate Berechnung) ──
                    let laibAbdichtung = 0;
                    if (f.hatLaibung && tVal > 0) {
                        const fensterHoeherAlsAbd = (brVal + hVal) > AH && AH > 0;
                        const effHAbd = fensterHoeherAlsAbd ? Math.max(0, hVal - ((brVal + hVal) - AH)) : hVal;
                        if (f.leibungWandAbgedichtet) laibAbdichtung += 2 * effHAbd * tVal;
                        if (f.fensterbankAbgedichtet) laibAbdichtung += bVal * tVal;
                        if (f.sturzAbgedichtet && !fensterHoeherAlsAbd) laibAbdichtung += bVal * tVal;
                    }

                    return { ...f, typ: 'fenster', bVal, hVal, tVal, brVal, flaeche, laibFlaeche, laibBodenFlaeche: 0, laibAbdichtung,
                        gesamtHoehe, effektiveHoehe, fensterHoeherAlsFliese,
                        vobWand: flaeche <= 0.1 ? 'uebermessen' : 'abzug',
                        vobBoden: 'uebermessen', // VOB: Fenster am Boden NIE abziehen
                        vobSockel: 'irrelevant', // Fenster berühren Sockel nicht
                        vobDecke: 'uebermessen' // Fenster berühren Decke nicht
                    };
                })
            ];

            // Sonstige Abzüge/Zurechnungen – NEUE LOGIK: positionsspezifisch
            // Für die Gesamtberechnung brauchen wir pro Position die relevanten Sonstigen
            const getSonstigeForPosition = (posNr) => {
                return calcAbzuege.map(a => {
                    const zuordnung = a.posZuordnung ? a.posZuordnung[posNr] : null;
                    if (!zuordnung) return null; // Nicht zugeordnet → ignorieren

                    const istPlus = zuordnung.vorzeichen === 'plus';
                    let flaeche = 0;

                    // Prio 1: Positions-spezifischer manueller Rechenweg
                    if (zuordnung.manualRW && zuordnung.manualRW.ergebnis !== undefined) {
                        flaeche = Math.abs(zuordnung.manualRW.ergebnis);
                        return { ...a, typ: 'sonstige', flaeche, laibFlaeche: 0,
                            hasManualRW: true, posManualRW: zuordnung.manualRW,
                            vobVorzeichen: istPlus ? 'zurechnung' : 'abzug'
                        };
                    }

                    // Prio 2: Globaler manueller Rechenweg des Bauteils
                    if (a.manualRW && a.manualRW.ergebnis !== undefined) {
                        flaeche = Math.abs(a.manualRW.ergebnis);
                        return { ...a, typ: 'sonstige', flaeche, laibFlaeche: 0,
                            hasManualRW: true,
                            vobVorzeichen: istPlus ? 'zurechnung' : 'abzug'
                        };
                    }

                    // Prio 3: B × H × T Standardberechnung
                    const bVal = parseMass(a.breite); const hVal = parseMass(a.hoehe); const tVal = parseMass(a.tiefe || '');
                    flaeche = tVal > 0 ? bVal * hVal * tVal : bVal * hVal;
                    // VOB: Nischen werden IMMER gesondert gerechnet (unabhängig von Größe)
                    const istNische = (a.name || '').toLowerCase().includes('nische');
                    return { ...a, typ: 'sonstige', bVal, hVal, tVal, flaeche, laibFlaeche: 0,
                        hasManualRW: false, istNische,
                        vobVorzeichen: istPlus ? 'zurechnung' : 'abzug'
                    };
                }).filter(Boolean);
            };

            // Legacy-Kompatibilität: sonstigeItems für VOB-Tags-Anzeige (alle mit irgendeiner Zuordnung)
            const sonstigeItems = calcAbzuege.flatMap(a => {
                const zuordnungen = a.posZuordnung || {};
                if (Object.keys(zuordnungen).length === 0) return [];
                // Nimm die erste Zuordnung als Repräsentant
                const firstKey = Object.keys(zuordnungen)[0];
                const firstZ = zuordnungen[firstKey];
                const istPlus = firstZ.vorzeichen === 'plus';
                const bVal = parseMass(a.breite); const hVal = parseMass(a.hoehe); const tVal = parseMass(a.tiefe || '');
                let flaeche = 0;
                if (firstZ.manualRW && firstZ.manualRW.ergebnis !== undefined) {
                    flaeche = Math.abs(firstZ.manualRW.ergebnis);
                } else if (a.manualRW && a.manualRW.ergebnis !== undefined) {
                    flaeche = Math.abs(a.manualRW.ergebnis);
                } else {
                    flaeche = tVal > 0 ? bVal * hVal * tVal : bVal * hVal;
                }
                return [{ ...a, typ: 'sonstige', bVal, hVal, tVal, flaeche, laibFlaeche: 0,
                    vobWand: istPlus ? 'zurechnung' : 'abzug',
                    vobBoden: istPlus ? 'zurechnung' : 'abzug',
                    vobSockel: 'irrelevant'
                }];
            });

            // Alles zusammen für VOB-Tags-Anzeige
            const vobAbzuege = [...alleOeffnungen, ...sonstigeItems];

            // ── WAND-Berechnung (VOB) ──
            const wandAbzugItems = alleOeffnungen.filter(a => a.vobWand === 'abzug');
            const wandUebermessen = alleOeffnungen.filter(a => a.vobWand === 'uebermessen');
            // Tür-Laibungen nur zur Wand rechnen wenn bodenPlusTuerlaibung NICHT aktiv
            const wandLaibungen = alleOeffnungen.filter(a => {
                if (a.laibFlaeche <= 0) return false;
                // Wenn Boden+Türlaibung aktiv: Tür-Laibungen NICHT zur Wand, nur Fenster-Laibungen
                if (bodenPlusTuerlaibung && a.typ === 'tuer') return false;
                return true;
            });
            // Sonstige pro Kategorie dynamisch berechnen (für Standardwerte ohne pos-spezifisch)
            const getWandSonstige = (posNr) => {
                const items = getSonstigeForPosition(posNr);
                return {
                    abzug: items.filter(a => a.vobVorzeichen === 'abzug'),
                    zurech: items.filter(a => a.vobVorzeichen === 'zurechnung'),
                };
            };
            // Fallback für allgemeine Wand/Boden-Berechnung (erste passende Position)
            const wandPosNr = (posCards.find(p => p.kategorie === 'wand') && posCards.find(p => p.kategorie === 'wand').pos) || '';
            const wandSonst = getWandSonstige(wandPosNr);
            const wandSonstAbzug = wandSonst.abzug;
            const wandSonstZurech = wandSonst.zurech;
            const wandAbzugTotal = vobRound(wandAbzugItems.reduce((s, a) => s + a.flaeche, 0) + wandSonstAbzug.reduce((s, a) => s + a.flaeche, 0));
            const wandZurechnungTotal = vobRound(wandLaibungen.reduce((s, a) => s + a.laibFlaeche, 0) + wandSonstZurech.reduce((s, a) => s + a.flaeche, 0));
            const wandErgebnis = vobRound(Math.max(0, wandflaeche - wandAbzugTotal + wandZurechnungTotal));

            // ── BODEN-Berechnung (VOB) ──
            // VOB/C DIN 18352: Bei Bodenflächen KEIN Abzug für Türen/Fenster!
            const bodenPosNr = (posCards.find(p => p.kategorie === 'boden') && posCards.find(p => p.kategorie === 'boden').pos) || '';
            const bodenSonst = getWandSonstige(bodenPosNr);
            const bodenSonstAbzug = bodenSonst.abzug;
            const bodenSonstZurech = bodenSonst.zurech;
            // Boden-Laibungsfläche: Wenn Leibung-Boden-Buttons (grün) aktiv → direkt zur Bodenfläche
            const bodenLaibungTotal = vobRound(alleOeffnungen.reduce((s, a) => s + (a.laibBodenFlaeche || 0), 0));
            // bodenPlusTuerlaibung-Toggle NUR wenn keine leibungBoden-Buttons aktiv (Legacy-Kompatibilität)
            const tuerBodenExtra = (bodenPlusTuerlaibung && bodenLaibungTotal === 0) ? tuerBodenLaibung : 0;
            const bodenBasis = vobRound(bodenflaeche + bodenLaibungTotal + tuerBodenExtra);
            const bodenErgebnis = vobRound(Math.max(0, bodenBasis - bodenSonstAbzug.reduce((s, a) => s + a.flaeche, 0) + bodenSonstZurech.reduce((s, a) => s + a.flaeche, 0)));

            // ── DECKE-Berechnung (VOB – gleiche Regeln wie Boden) ──
            const deckeBasis = vobRound(deckenflaeche);
            const deckeErgebnis = vobRound(Math.max(0, deckeBasis));

            // ── SOCKEL-Berechnung (VOB) ──
            // VOB/C: Unterbrechungen ≤1,0 m übermessen
            const sockelGesamt = vobRound(isMultiWall ? perimeter : 2 * (L + B));
            const sockelAbzugItems = alleOeffnungen.filter(a => a.vobSockel === 'abzug');
            const sockelUebermessen = alleOeffnungen.filter(a => a.vobSockel === 'uebermessen');
            const sockelAbzugTotal = vobRound(sockelAbzugItems.reduce((s, a) => s + a.bVal, 0));
            const sockelErgebnis = vobRound(Math.max(0, sockelGesamt - sockelAbzugTotal));

            // ── Kategorien-Mapping für VOB-Berechnung ──
            // Bestimmt welche Grundberechnung für eine Position verwendet wird
            const getVobBasis = (pos) => {
                const kat = pos.kategorie;
                const bezLow = (pos.bez || '').toLowerCase();
                const tags = pos.tags || [];
                // Verfugung: gleiche Regeln wie zugehörige Flächenart
                if (kat === 'verfugung' || bezLow.includes('verfugung')) {
                    if (tags.includes('boden') || bezLow.includes('boden')) return 'boden';
                    if (tags.includes('wand') || bezLow.includes('wand')) return 'wand';
                    return 'wand'; // Default
                }
                // Estrich/Entkopplung: Boden-Regeln
                if (kat === 'estrich' || kat === 'entkopplung' || bezLow.includes('estrich') || bezLow.includes('entkopplung')) return 'boden';
                // Decke
                if (kat === 'decke' || bezLow.includes('decke') || bezLow.includes('deckenfliese')) return 'decke';
                // Fensterbank
                if (kat === 'fensterbank' || bezLow.includes('fensterbank')) return 'fensterbank';
                return kat; // Default: eigene Kategorie
            };

            // ── Rechenweg-Generator (VOB-konform) ──
            const buildRechenweg = (pos) => {
                const steps = [];
                const kat = pos.kategorie;
                const isAbdWand = kat === 'abdichtung' && (pos.tags && pos.tags.includes('wand'));
                const isAbdBoden = kat === 'abdichtung' && (pos.tags && pos.tags.includes('boden'));

                // ── WAND (Fliesen) ──
                if (kat === 'wand') {
                    const posSonst = getSonstigeForPosition(pos.pos);
                    const posSonstAbzug = posSonst.filter(a => a.vobVorzeichen === 'abzug');
                    const posSonstZurech = posSonst.filter(a => a.vobVorzeichen === 'zurechnung');
                    // ── Schichten-Regel DIN 18352 ──
                    if (schichtenRegelAktiv) {
                        steps.push({ label: '📐 Schichten-Regel', formel: `Fliesenhöhe ${fmtDe(H)}m > halbe Raumhöhe (${fmtDe(RH/2)}m) → ggf. volle Schichthöhe abrechenbar`, ergebnis: 'Hinweis', type: 'vob-info' });
                    }
                    if (isMultiWall) {
                        const wandDetails = wandMasse.map(w => `${fmtDe(parseMass(w.l))}`).join(' + ');
                        steps.push({ label: 'Umfang (Σ Wände)', formel: wandDetails, ergebnis: fmtDe(perimeter) + ' m' });
                        steps.push({ label: 'Wandfläche', formel: `${fmtDe(perimeter)} × ${fmtDe(H)}`, ergebnis: fmtDe(wandflaeche) + ' m²' });
                    } else {
                        steps.push({ label: 'Wandfläche', formel: `2 × (${fmtDe(L)} + ${fmtDe(B)}) × ${fmtDe(H)}`, ergebnis: fmtDe(wandflaeche) + ' m²' });
                    }
                    wandAbzugItems.forEach(a => {
                        if (a.typ === 'tuer' && a.tuerHoeherAlsFliese) {
                            steps.push({ label: `− ${a.name} (${fmtDe(a.bVal)}×${fmtDe(H)} ⚠Tür>${fmtDe(H)}m)`, formel: `Türhöhe ${fmtDe(a.hVal)} > Fliesenhöhe → ${fmtDe(a.bVal)}×${fmtDe(H)}`, ergebnis: '−' + fmtDe(a.flaeche) + ' m²', type: 'abzug' });
                        } else if (a.typ === 'fenster' && a.fensterHoeherAlsFliese) {
                            steps.push({ label: `− ${a.name} (${fmtDe(a.bVal)}×${fmtDe(a.effektiveHoehe)})`, formel: `Gesamt ${fmtDe(a.gesamtHoehe)} > ${fmtDe(H)} → eff.H=${fmtDe(a.effektiveHoehe)}`, ergebnis: '−' + fmtDe(a.flaeche) + ' m²', type: 'abzug' });
                        } else {
                            steps.push({ label: `− ${a.name} (${fmtDe(a.bVal)}×${fmtDe(a.hVal)})`, formel: `${fmtDe(a.flaeche)} m²`, ergebnis: '−' + fmtDe(a.flaeche) + ' m²', type: 'abzug' });
                        }
                    });
                    wandUebermessen.forEach(a => {
                        steps.push({ label: `⊘ ${a.name} (${fmtDe(a.bVal)}×${fmtDe(a.hVal)}=${fmtDe(a.bVal * a.hVal)} m²)`, formel: 'VOB: ≤0,1 m² → übermessen', ergebnis: '0,000 m²', type: 'vob-info' });
                    });
                    wandLaibungen.forEach(a => {
                        if (a.typ === 'tuer') {
                            const laibH = a.tuerHoeherAlsFliese ? H : a.hVal;
                            const parts = [];
                            if (a.leibungWandGefliest) parts.push(`2×${fmtDe(laibH)}×${fmtDe(a.tVal)}`);
                            // Leibung Boden wird NICHT zur Wand gerechnet (nur zum Boden!)
                            if (a.sturzGefliest && !a.tuerHoeherAlsFliese) parts.push(`${fmtDe(a.bVal)}×${fmtDe(a.tVal)}(Sturz)`);
                            const formelStr = parts.join(' + ') || '--';
                            steps.push({ label: `+ Laibung ${a.name}`, formel: formelStr, ergebnis: '+' + fmtDe(a.laibFlaeche) + ' m²', type: 'zurechnung' });
                        } else if (a.typ === 'fenster') {
                            const laibH = a.fensterHoeherAlsFliese ? a.effektiveHoehe : a.hVal;
                            const parts = [];
                            if (a.leibungWandGefliest) parts.push(`2×${fmtDe(laibH)}×${fmtDe(a.tVal)}`);
                            if (a.fensterbankGefliest) parts.push(`${fmtDe(a.bVal)}×${fmtDe(a.tVal)}(Bank)`);
                            if (a.sturzGefliest && !a.fensterHoeherAlsFliese) parts.push(`${fmtDe(a.bVal)}×${fmtDe(a.tVal)}(Sturz)`);
                            const formelStr = parts.join(' + ') || '--';
                            steps.push({ label: `+ Laibung ${a.name}`, formel: formelStr, ergebnis: '+' + fmtDe(a.laibFlaeche) + ' m²', type: 'zurechnung' });
                        } else {
                            steps.push({ label: `+ Laibung ${a.name}`, formel: `(2×${fmtDe(a.hVal)}+${fmtDe(a.bVal)})×${fmtDe(a.tVal)}`, ergebnis: '+' + fmtDe(a.laibFlaeche) + ' m²', type: 'zurechnung' });
                        }
                    });
                    posSonstAbzug.forEach(a => {
                        const formel = a.hasManualRW ? '✏️ manuell' : (a.tVal > 0 ? `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}×${fmtDe(a.tVal)}` : `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}`);
                        steps.push({ label: `− ${a.name}`, formel, ergebnis: '−' + fmtDe(a.flaeche) + ' m²', type: 'abzug' });
                    });
                    posSonstZurech.forEach(a => {
                        const formel = a.hasManualRW ? '✏️ manuell' : (a.tVal > 0 ? `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}×${fmtDe(a.tVal)}` : `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}`);
                        steps.push({ label: `+ ${a.name}`, formel, ergebnis: '+' + fmtDe(a.flaeche) + ' m²', type: 'zurechnung' });
                    });
                    const posWandAbzug = wandAbzugItems.reduce((s, a) => s + a.flaeche, 0) + posSonstAbzug.reduce((s, a) => s + a.flaeche, 0);
                    const posWandZurech = wandLaibungen.reduce((s, a) => s + a.laibFlaeche, 0) + posSonstZurech.reduce((s, a) => s + a.flaeche, 0);
                    const posWandErg = Math.max(0, wandflaeche - posWandAbzug + posWandZurech);
                    steps.push({ label: 'ERGEBNIS', formel: '', ergebnis: fmtDe(posWandErg) + ' m²', type: 'total' });

                // ── ABDICHTUNG WAND (eigene Höhe!) ──
                } else if (isAbdWand) {
                    const posSonst = getSonstigeForPosition(pos.pos);
                    const posSonstAbzug = posSonst.filter(a => a.vobVorzeichen === 'abzug');
                    const posSonstZurech = posSonst.filter(a => a.vobVorzeichen === 'zurechnung');
                    const useH = AH > 0 ? AH : H;
                    const useFlaeche = AH > 0 ? abdichtungWandflaeche : wandflaeche;
                    if (isMultiWall) {
                        steps.push({ label: 'Umfang (Σ Wände)', formel: wandMasse.map(w => fmtDe(parseMass(w.l))).join(' + '), ergebnis: fmtDe(perimeter) + ' m' });
                        steps.push({ label: 'Abdichtung Wandfläche', formel: `${fmtDe(perimeter)} × ${fmtDe(useH)} (Abdichtungshöhe)`, ergebnis: fmtDe(useFlaeche) + ' m²' });
                    } else {
                        steps.push({ label: 'Abdichtung Wandfläche', formel: `2 × (${fmtDe(L)} + ${fmtDe(B)}) × ${fmtDe(useH)}${AH > 0 ? ' (Abdichtungshöhe)' : ''}`, ergebnis: fmtDe(useFlaeche) + ' m²' });
                    }
                    // ── Abzüge mit Höhenüberschreitungs-Logik (gleich wie Wand!) ──
                    let abdAbzugTotal = 0;
                    let abdZurechTotal = 0;
                    wandAbzugItems.forEach(a => {
                        // Tür: Prüfe ob Türhöhe > Abdichtungshöhe
                        if (a.typ === 'tuer') {
                            const tuerHoeherAlsAbd = a.hVal > useH;
                            const abdFlaeche = tuerHoeherAlsAbd ? a.bVal * useH : a.bVal * a.hVal;
                            abdAbzugTotal += abdFlaeche;
                            if (tuerHoeherAlsAbd) {
                                steps.push({ label: `− ${a.name} (${fmtDe(a.bVal)}×${fmtDe(useH)} ⚠Tür>${fmtDe(useH)}m)`, formel: `Türhöhe ${fmtDe(a.hVal)} > Abdichtungshöhe`, ergebnis: '−' + fmtDe(abdFlaeche) + ' m²', type: 'abzug' });
                            } else {
                                steps.push({ label: `− ${a.name} (${fmtDe(a.bVal)}×${fmtDe(a.hVal)})`, formel: '', ergebnis: '−' + fmtDe(abdFlaeche) + ' m²', type: 'abzug' });
                            }
                        // Fenster: Prüfe ob Brüstung+Fensterhöhe > Abdichtungshöhe
                        } else if (a.typ === 'fenster') {
                            const brH = a.brVal || 0;
                            const gesamtH = brH + a.hVal;
                            const fensterHoeherAlsAbd = gesamtH > useH && useH > 0;
                            const effH = fensterHoeherAlsAbd ? Math.max(0, a.hVal - (gesamtH - useH)) : a.hVal;
                            const abdFlaeche = effH * a.bVal;
                            abdAbzugTotal += abdFlaeche;
                            if (fensterHoeherAlsAbd) {
                                steps.push({ label: `− ${a.name} (${fmtDe(a.bVal)}×${fmtDe(effH)})`, formel: `Gesamt ${fmtDe(gesamtH)} > ${fmtDe(useH)} → eff.H=${fmtDe(effH)}`, ergebnis: '−' + fmtDe(abdFlaeche) + ' m²', type: 'abzug' });
                            } else {
                                steps.push({ label: `− ${a.name} (${fmtDe(a.bVal)}×${fmtDe(a.hVal)})`, formel: '', ergebnis: '−' + fmtDe(abdFlaeche) + ' m²', type: 'abzug' });
                            }
                        } else {
                            abdAbzugTotal += a.flaeche;
                            steps.push({ label: `− ${a.name} (${fmtDe(a.bVal)}×${fmtDe(a.hVal)})`, formel: '', ergebnis: '−' + fmtDe(a.flaeche) + ' m²', type: 'abzug' });
                        }
                    });
                    wandUebermessen.forEach(a => {
                        steps.push({ label: `⊘ ${a.name} (${fmtDe(a.bVal * a.hVal)} m²)`, formel: 'VOB: ≤0,1 m² → übermessen', ergebnis: '0,000 m²', type: 'vob-info' });
                    });
                    // ── Laibungen mit Abdichtungs-Schaltern ──
                    wandLaibungen.forEach(a => {
                        if (a.typ === 'tuer') {
                            const laibAbd = a.laibAbdichtung || 0;
                            if (laibAbd > 0) {
                                const tuerHoeherAlsAbd = a.hVal > useH;
                                const laibAH = tuerHoeherAlsAbd ? useH : a.hVal;
                                const parts = [];
                                if (a.leibungWandAbgedichtet) parts.push(`2×${fmtDe(laibAH)}×${fmtDe(a.tVal)}`);
                                if (a.leibungBodenAbgedichtet) parts.push(`${fmtDe(a.bVal)}×${fmtDe(a.tVal)}`);
                                if (a.sturzAbgedichtet && !tuerHoeherAlsAbd) parts.push(`${fmtDe(a.bVal)}×${fmtDe(a.tVal)}(Sturz)`);
                                steps.push({ label: `+ Laibung ${a.name} (Abd.)`, formel: parts.join(' + ') || '--', ergebnis: '+' + fmtDe(laibAbd) + ' m²', type: 'zurechnung' });
                                abdZurechTotal += laibAbd;
                            }
                        } else if (a.typ === 'fenster') {
                            const laibAbd = a.laibAbdichtung || 0;
                            if (laibAbd > 0) {
                                const brH = a.brVal || 0;
                                const fensterHoeherAlsAbd = (brH + a.hVal) > useH && useH > 0;
                                const effHAbd = fensterHoeherAlsAbd ? Math.max(0, a.hVal - ((brH + a.hVal) - useH)) : a.hVal;
                                const parts = [];
                                if (a.leibungWandAbgedichtet) parts.push(`2×${fmtDe(effHAbd)}×${fmtDe(a.tVal)}`);
                                if (a.fensterbankAbgedichtet) parts.push(`${fmtDe(a.bVal)}×${fmtDe(a.tVal)}(Bank)`);
                                if (a.sturzAbgedichtet && !fensterHoeherAlsAbd) parts.push(`${fmtDe(a.bVal)}×${fmtDe(a.tVal)}(Sturz)`);
                                steps.push({ label: `+ Laibung ${a.name} (Abd.)`, formel: parts.join(' + ') || '--', ergebnis: '+' + fmtDe(laibAbd) + ' m²', type: 'zurechnung' });
                                abdZurechTotal += laibAbd;
                            }
                        } else {
                            abdZurechTotal += a.laibFlaeche;
                            steps.push({ label: `+ Laibung ${a.name}`, formel: `(2×${fmtDe(a.hVal)}+${fmtDe(a.bVal)})×${fmtDe(a.tVal)}`, ergebnis: '+' + fmtDe(a.laibFlaeche) + ' m²', type: 'zurechnung' });
                        }
                    });
                    posSonstAbzug.forEach(a => {
                        const formel = a.hasManualRW ? '✏️ manuell' : (a.tVal > 0 ? `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}×${fmtDe(a.tVal)}` : `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}`);
                        steps.push({ label: `− ${a.name}`, formel, ergebnis: '−' + fmtDe(a.flaeche) + ' m²', type: 'abzug' });
                        abdAbzugTotal += a.flaeche;
                    });
                    posSonstZurech.forEach(a => {
                        const formel = a.hasManualRW ? '✏️ manuell' : (a.tVal > 0 ? `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}×${fmtDe(a.tVal)}` : `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}`);
                        steps.push({ label: `+ ${a.name}`, formel, ergebnis: '+' + fmtDe(a.flaeche) + ' m²', type: 'zurechnung' });
                        abdZurechTotal += a.flaeche;
                    });
                    const posAbdErg = Math.max(0, useFlaeche - abdAbzugTotal + abdZurechTotal);
                    steps.push({ label: 'ERGEBNIS', formel: '', ergebnis: fmtDe(posAbdErg) + ' m²', type: 'total' });

                // ── BODEN ──
                } else if (kat === 'boden' || isAbdBoden) {
                    const posSonst = getSonstigeForPosition(pos.pos);
                    const posSonstAbzug = posSonst.filter(a => a.vobVorzeichen === 'abzug');
                    const posSonstZurech = posSonst.filter(a => a.vobVorzeichen === 'zurechnung');
                    if (bodenIstManuell) {
                        steps.push({ label: 'Bodenfläche (manuell)', formel: `eingegeben: ${fmtDe(BM)}`, ergebnis: fmtDe(bodenflaeche) + ' m²' });
                    } else if (isMultiWall) {
                        steps.push({ label: '⚠ Bodenfläche', formel: 'Mehreckraum – bitte manuell eingeben!', ergebnis: '0,00 m²' });
                    } else {
                        steps.push({ label: 'Bodenfläche', formel: `${fmtDe(L)} × ${fmtDe(B)}`, ergebnis: fmtDe(bodenflaeche) + ' m²' });
                    }
                    if (tueren.length > 0 || calcFenster.length > 0) {
                        steps.push({ label: '⊘ Türen/Fenster', formel: 'VOB/C: Kein Abzug bei Bodenflächen', ergebnis: '0,000 m²', type: 'vob-info' });
                    }
                    // Boden-Leibungen aus grünen "Leibung Boden"-Buttons
                    alleOeffnungen.forEach(a => {
                        if ((a.laibBodenFlaeche || 0) > 0) {
                            steps.push({ label: `+ Leibung Boden ${a.name}`, formel: `${fmtDe(a.bVal)} × ${fmtDe(a.tVal)}`, ergebnis: '+' + fmtDe(a.laibBodenFlaeche) + ' m²', type: 'zurechnung' });
                        }
                    });
                    // Legacy: bodenPlusTuerlaibung-Toggle (nur wenn keine Leibung-Boden-Buttons aktiv)
                    if (tuerBodenExtra > 0) {
                        steps.push({ label: '+ Türlaibung Boden', formel: 'Breite × Tiefe je Tür', ergebnis: '+' + fmtDe(tuerBodenLaibung) + ' m²', type: 'zurechnung' });
                    }
                    posSonstAbzug.forEach(a => {
                        const formel = a.hasManualRW ? '✏️ manuell' : (a.tVal > 0 ? `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}×${fmtDe(a.tVal)}` : `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}`);
                        steps.push({ label: `− ${a.name}`, formel, ergebnis: '−' + fmtDe(a.flaeche) + ' m²', type: 'abzug' });
                    });
                    posSonstZurech.forEach(a => {
                        const formel = a.hasManualRW ? '✏️ manuell' : (a.tVal > 0 ? `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}×${fmtDe(a.tVal)}` : `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}`);
                        steps.push({ label: `+ ${a.name}`, formel, ergebnis: '+' + fmtDe(a.flaeche) + ' m²', type: 'zurechnung' });
                    });
                    const posBodenAbzug = posSonstAbzug.reduce((s, a) => s + a.flaeche, 0);
                    const posBodenZurech = posSonstZurech.reduce((s, a) => s + a.flaeche, 0);
                    const posBodenErg = Math.max(0, bodenBasis - posBodenAbzug + posBodenZurech);
                    steps.push({ label: 'ERGEBNIS', formel: '', ergebnis: fmtDe(posBodenErg) + ' m²', type: 'total' });

                } else if (kat === 'sockel') {
                    if (isMultiWall) {
                        steps.push({ label: 'Umfang (Σ Wände)', formel: wandMasse.map(w => fmtDe(parseMass(w.l))).join(' + '), ergebnis: fmtDe(sockelGesamt) + ' m' });
                    } else {
                        steps.push({ label: 'Umfang', formel: `2 × (${fmtDe(L)} + ${fmtDe(B)})`, ergebnis: fmtDe(sockelGesamt) + ' m' });
                    }
                    sockelAbzugItems.forEach(a => {
                        steps.push({ label: `− ${a.name} (Breite ${fmtDe(a.bVal)} m)`, formel: 'Breite > 1,0 m → Abzug', ergebnis: '−' + fmtDe(a.bVal) + ' m', type: 'abzug' });
                    });
                    sockelUebermessen.forEach(a => {
                        steps.push({ label: `⊘ ${a.name} (Breite ${fmtDe(a.bVal)} m)`, formel: 'VOB: ≤1,0 m → übermessen', ergebnis: '0,00 m', type: 'vob-info' });
                    });
                    steps.push({ label: 'ERGEBNIS', formel: '', ergebnis: fmtDe(sockelErgebnis) + ' m', type: 'total' });

                } else if (kat === 'silikon') {
                    // ── DEHNUNGSFUGEN / DAUERELASTISCHE FUGEN ──
                    // Umlaufend Boden + senkrechte Innenecken + Fenster/Tür-Anschlussfugen
                    const umfang = isMultiWall ? perimeter : 2 * (L + B);
                    const useH = H > 0 ? H : SH; // Fliesenhöhe, ggf. Sockelhöhe
                    // Raumecken zählen (NUR Raum-Innenecken, NICHT Fenster!)
                    const raumEcken = isMultiWall ? wandMasse.length : 4;

                    if (isMultiWall) {
                        const wandDetails = wandMasse.map(w => fmtDe(parseMass(w.l))).join(' + ');
                        steps.push({ label: 'Boden umlaufend', formel: wandDetails, ergebnis: fmtDe(umfang) + ' m', value: umfang, sign: 1 });
                    } else {
                        steps.push({ label: 'Boden umlaufend', formel: `${fmtDe(L)}+${fmtDe(B)}+${fmtDe(L)}+${fmtDe(B)}`, ergebnis: fmtDe(umfang) + ' m', value: umfang, sign: 1 });
                    }
                    if (raumEcken > 0 && useH > 0) {
                        const eckenWert = raumEcken * useH;
                        steps.push({ label: `Innenecken`, formel: `${raumEcken}×${fmtDe(useH)}`, ergebnis: fmtDe(eckenWert) + ' m', value: eckenWert, sign: 1 });
                    }
                    // Fenster-Anschlussfugen (immer) – JEDE Komponente einzeln
                    calcFenster.forEach(f => {
                        const fB = parseMass(f.breite); const fH = parseMass(f.hoehe); const fT = parseMass(f.tiefe);
                        if (fH > 0) {
                            steps.push({ label: `${f.name} Höhe ×2`, formel: `${fmtDe(fH)}×2`, ergebnis: fmtDe(fH * 2) + ' m', value: fH * 2, sign: 1 });
                        }
                        if (fB > 0) {
                            steps.push({ label: `${f.name} Bank`, formel: `${fmtDe(fB)}`, ergebnis: fmtDe(fB) + ' m', value: fB, sign: 1 });
                        }
                        if (fT > 0) {
                            steps.push({ label: `${f.name} Tiefe ×2`, formel: `${fmtDe(fT)}×2`, ergebnis: fmtDe(fT * 2) + ' m', value: fT * 2, sign: 1 });
                        }
                    });
                    // Tür-Anschlussfugen (NUR wenn dauerelastisch/Stahlzarge) – JEDE Komponente einzeln
                    tueren.filter(t => t.dauerelastisch).forEach(t => {
                        const tH = parseMass(t.hoehe); const tT = parseMass(t.tiefe);
                        const effH = (tH > useH && useH > 0) ? useH : tH;
                        if (effH > 0) {
                            steps.push({ label: `${t.name} Höhe ×2 (Stahlzarge)`, formel: `${fmtDe(effH)}×2`, ergebnis: fmtDe(effH * 2) + ' m', value: effH * 2, sign: 1 });
                        }
                        if (tT > 0) {
                            steps.push({ label: `${t.name} Tiefe ×2 (Stahlzarge)`, formel: `${fmtDe(tT)}×2`, ergebnis: fmtDe(tT * 2) + ' m', value: tT * 2, sign: 1 });
                        }
                    });
                    // Türen ohne dauerelastisch → Info
                    tueren.filter(t => !t.dauerelastisch).forEach(t => {
                        steps.push({ label: `⊘ ${t.name}`, formel: 'Keine Stahlzarge → keine Dehnungsfuge', ergebnis: '0,00 m', type: 'vob-info', value: 0, sign: 0 });
                    });
                    const silikonTotal = steps.filter(s => s.sign).reduce((s, st) => s + (st.value || 0) * (st.sign || 0), 0);
                    steps.push({ label: 'ERGEBNIS', formel: '', ergebnis: fmtDe(silikonTotal) + ' m', type: 'total', value: silikonTotal });

                } else if (kat === 'dichtband' || kat === 'manschette' || (kat === 'abdichtung' && (pos.tags && pos.tags.includes('dichtband'))) || (kat === 'abdichtung' && (pos.tags && pos.tags.includes('manschette')))) {
                    if (pos.einheit === 'm') {
                        // ── DICHTBAND (m) ──
                        // Gleiche Struktur wie Dehnungsfugen, aber mit Abdichtungshöhe + ALLE Türen
                        const umfang = isMultiWall ? perimeter : 2 * (L + B);
                        const useAH = AH > 0 ? AH : H;
                        // NUR Raum-Innenecken (NICHT Fenster!)
                        const raumEcken = isMultiWall ? wandMasse.length : 4;

                        if (isMultiWall) {
                            steps.push({ label: 'Boden umlaufend', formel: wandMasse.map(w => fmtDe(parseMass(w.l))).join('+'), ergebnis: fmtDe(umfang) + ' m', value: umfang, sign: 1 });
                        } else {
                            steps.push({ label: 'Boden umlaufend', formel: `${fmtDe(L)}+${fmtDe(B)}+${fmtDe(L)}+${fmtDe(B)}`, ergebnis: fmtDe(umfang) + ' m', value: umfang, sign: 1 });
                        }
                        if (raumEcken > 0 && useAH > 0) {
                            const eckenWert = raumEcken * useAH;
                            steps.push({ label: `Innenecken`, formel: `${raumEcken}×${fmtDe(useAH)}${AH > 0 ? ' (Abd.höhe)' : ''}`, ergebnis: fmtDe(eckenWert) + ' m', value: eckenWert, sign: 1 });
                        }
                        // Fenster-Anschlussfugen – NUR Bank + Tiefe×2 (Höhe über Innenecken abgedeckt)
                        calcFenster.forEach(f => {
                            const fB = parseMass(f.breite); const fT = parseMass(f.tiefe);
                            if (fB > 0) {
                                steps.push({ label: `${f.name} Bank`, formel: `${fmtDe(fB)}`, ergebnis: fmtDe(fB) + ' m', value: fB, sign: 1 });
                            }
                            if (fT > 0) {
                                steps.push({ label: `${f.name} Tiefe ×2`, formel: `${fmtDe(fT)}×2`, ergebnis: fmtDe(fT * 2) + ' m', value: fT * 2, sign: 1 });
                            }
                        });
                        // Tür-Anschlussfugen – ALLE Türen – NUR Tiefe×2
                        tueren.forEach(t => {
                            const tT = parseMass(t.tiefe);
                            if (tT > 0) {
                                steps.push({ label: `${t.name} Tiefe ×2`, formel: `${fmtDe(tT)}×2`, ergebnis: fmtDe(tT * 2) + ' m', value: tT * 2, sign: 1 });
                            }
                        });
                        const dichtbandTotal = steps.filter(s => s.sign).reduce((s, st) => s + (st.value || 0) * (st.sign || 0), 0);
                        steps.push({ label: 'ERGEBNIS', formel: '', ergebnis: fmtDe(dichtbandTotal) + ' m', type: 'total', value: dichtbandTotal });

                    } else if (pos.einheit === 'Stk' || pos.einheit === 'Stück' || pos.einheit === 'St') {
                        // ── DICHTBAND ECKEN (Stk) oder DICHTMANSCHETTEN ──
                        const bezLow = (pos.bez || '').toLowerCase();
                        const istEcke = bezLow.includes('ecke') || bezLow.includes('innenecke') || bezLow.includes('außenecke') || bezLow.includes('aussenecke');
                        if (istEcke || (kat !== 'manschette' && !bezLow.includes('manschette') && !bezLow.includes('durchführung'))) {
                            // Dichtband Innen-/Außenecken automatisch zählen
                            const raumInnenecken = isMultiWall ? wandMasse.length : 4;
                            steps.push({ label: 'Raum-Innenecken', formel: `${raumInnenecken} Stk (Boden-Wand)`, ergebnis: raumInnenecken + ' Stk', value: raumInnenecken, sign: 1 });
                            tueren.forEach(t => {
                                if (t.hatLaibung && parseMass(t.tiefe) > 0) {
                                    steps.push({ label: `Außenecken ${t.name} (Boden)`, formel: '2 Stk', ergebnis: '2 Stk', value: 2, sign: 1 });
                                }
                            });
                            calcFenster.forEach(f => {
                                if (f.hatLaibung && parseMass(f.tiefe) > 0) {
                                    steps.push({ label: `Außenecken ${f.name} (Bank)`, formel: '2 Stk', ergebnis: '2 Stk', value: 2, sign: 1 });
                                    steps.push({ label: `Innenecken ${f.name} (Bank)`, formel: '2 Stk', ergebnis: '2 Stk', value: 2, sign: 1 });
                                }
                            });
                            const eckenTotal = steps.filter(s => s.sign).reduce((s, st) => s + (st.value || 0) * (st.sign || 0), 0);
                            steps.push({ label: 'ERGEBNIS', formel: '', ergebnis: eckenTotal + ' Stk', type: 'total', value: eckenTotal });
                        } else {
                            // Dichtmanschetten → manuell
                            steps.push({ label: 'Dichtmanschetten', formel: 'Anzahl manuell eintragen', ergebnis: '--', value: 0, sign: 0 });
                        }
                    }

                } else if (kat === 'schiene') {
                    // ── ECKSCHUTZSCHIENEN / JOLLY-PROFILE ──
                    // Alle Außenkanten an gefliesten Laibungen
                    calcFenster.forEach(f => {
                        if (f.hatLaibung && parseMass(f.tiefe) > 0) {
                            const fH = parseMass(f.hoehe); const fB = parseMass(f.breite);
                            if (f.leibungWandGefliest && fH > 0) {
                                steps.push({ label: `${f.name} Laibung L`, formel: `Höhe ${fmtDe(fH)}`, ergebnis: fmtDe(fH) + ' m', value: fH, sign: 1 });
                                steps.push({ label: `${f.name} Laibung R`, formel: `Höhe ${fmtDe(fH)}`, ergebnis: fmtDe(fH) + ' m', value: fH, sign: 1 });
                            }
                            if (f.fensterbankGefliest && fB > 0) {
                                steps.push({ label: `${f.name} Fensterbank`, formel: `Breite ${fmtDe(fB)}`, ergebnis: fmtDe(fB) + ' m', value: fB, sign: 1 });
                            }
                        }
                    });
                    tueren.forEach(t => {
                        if (t.hatLaibung && parseMass(t.tiefe) > 0) {
                            const tH = parseMass(t.hoehe); const effH = (tH > H && H > 0) ? H : tH;
                            if (t.leibungWandGefliest && effH > 0) {
                                steps.push({ label: `${t.name} Laibung L`, formel: `Höhe ${fmtDe(effH)}`, ergebnis: fmtDe(effH) + ' m', value: effH, sign: 1 });
                                steps.push({ label: `${t.name} Laibung R`, formel: `Höhe ${fmtDe(effH)}`, ergebnis: fmtDe(effH) + ' m', value: effH, sign: 1 });
                            }
                            if (t.sturzGefliest && !t.tuerHoeherAlsFliese) {
                                const tB = parseMass(t.breite);
                                if (tB > 0) {
                                    steps.push({ label: `${t.name} Sturz`, formel: `Breite ${fmtDe(tB)}`, ergebnis: fmtDe(tB) + ' m', value: tB, sign: 1 });
                                }
                            }
                        }
                    });
                    if (steps.length === 0) {
                        steps.push({ label: 'Eckschutzschienen', formel: 'Keine Laibungen erkannt – manuell eingeben', ergebnis: '--', value: 0, sign: 0 });
                    }
                    const schieneTotal = steps.filter(s => s.sign).reduce((s, st) => s + (st.value || 0) * (st.sign || 0), 0);
                    steps.push({ label: 'ERGEBNIS', formel: '', ergebnis: fmtDe(schieneTotal) + ' m', type: 'total', value: schieneTotal });

                // ── DECKE (gleiche Regeln wie Boden) ──
                } else if (kat === 'decke' || (pos.bez || '').toLowerCase().includes('decke')) {
                    const posSonst = getSonstigeForPosition(pos.pos);
                    const posSonstAbzug = posSonst.filter(a => a.vobVorzeichen === 'abzug');
                    const posSonstZurech = posSonst.filter(a => a.vobVorzeichen === 'zurechnung');
                    if (bodenIstManuell) {
                        steps.push({ label: 'Deckenfläche (= Bodenfläche, manuell)', formel: `eingegeben: ${fmtDe(BM)}`, ergebnis: fmtDe(deckenflaeche) + ' m²' });
                    } else if (isMultiWall) {
                        steps.push({ label: '⚠ Deckenfläche', formel: 'Mehreckraum – Bodenfläche manuell eingeben!', ergebnis: '0,00 m²' });
                    } else {
                        steps.push({ label: 'Deckenfläche', formel: `${fmtDe(L)} × ${fmtDe(B)}`, ergebnis: fmtDe(deckenflaeche) + ' m²' });
                    }
                    if (tueren.length > 0 || calcFenster.length > 0) {
                        steps.push({ label: '⊘ Türen/Fenster', formel: 'VOB/C: Kein Abzug bei Deckenflächen', ergebnis: '0,00 m²', type: 'vob-info' });
                    }
                    posSonstAbzug.forEach(a => {
                        const formel = a.hasManualRW ? '✏️ manuell' : (a.tVal > 0 ? `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}×${fmtDe(a.tVal)}` : `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}`);
                        steps.push({ label: `− ${a.name}`, formel, ergebnis: '−' + fmtDe(a.flaeche) + ' m²', type: 'abzug' });
                    });
                    posSonstZurech.forEach(a => {
                        const formel = a.hasManualRW ? '✏️ manuell' : (a.tVal > 0 ? `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}×${fmtDe(a.tVal)}` : `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}`);
                        steps.push({ label: `+ ${a.name}`, formel, ergebnis: '+' + fmtDe(a.flaeche) + ' m²', type: 'zurechnung' });
                    });
                    const deckeAbz = posSonstAbzug.reduce((s, a) => s + a.flaeche, 0);
                    const deckeZur = posSonstZurech.reduce((s, a) => s + a.flaeche, 0);
                    const deckeErg = vobRound(Math.max(0, deckeBasis - deckeAbz + deckeZur));
                    steps.push({ label: 'ERGEBNIS', formel: '', ergebnis: fmtDe(deckeErg) + ' m²', type: 'total' });

                // ── VERFUGUNG (folgt Wand- oder Boden-Regeln) ──
                } else if (kat === 'verfugung' || (pos.bez || '').toLowerCase().includes('verfugung')) {
                    const vBasis = getVobBasis(pos);
                    const posSonst = getSonstigeForPosition(pos.pos);
                    const posSonstAbzug = posSonst.filter(a => a.vobVorzeichen === 'abzug');
                    const posSonstZurech = posSonst.filter(a => a.vobVorzeichen === 'zurechnung');

                    if (vBasis === 'boden') {
                        // Verfugung Boden = gleiche Regeln wie Bodenfliesen
                        steps.push({ label: 'Verfugung = Bodenfläche', formel: 'VOB/C: gleiche Regeln wie Bodenfliesen', ergebnis: '', type: 'vob-info' });
                        if (bodenIstManuell) {
                            steps.push({ label: 'Bodenfläche (manuell)', formel: `${fmtDe(BM)}`, ergebnis: fmtDe(bodenflaeche) + ' m²' });
                        } else if (!isMultiWall) {
                            steps.push({ label: 'Bodenfläche', formel: `${fmtDe(L)} × ${fmtDe(B)}`, ergebnis: fmtDe(bodenflaeche) + ' m²' });
                        }
                        if (tueren.length > 0) {
                            steps.push({ label: '⊘ Türen/Fenster', formel: 'VOB/C: Kein Abzug bei Bodenflächen', ergebnis: '0,00 m²', type: 'vob-info' });
                        }
                        const posBodenErg = vobRound(Math.max(0, bodenBasis - posSonstAbzug.reduce((s, a) => s + a.flaeche, 0) + posSonstZurech.reduce((s, a) => s + a.flaeche, 0)));
                        steps.push({ label: 'ERGEBNIS', formel: '', ergebnis: fmtDe(posBodenErg) + ' m²', type: 'total' });
                    } else {
                        // Verfugung Wand = gleiche Regeln wie Wandfliesen
                        steps.push({ label: 'Verfugung = Wandfläche', formel: 'VOB/C: gleiche Regeln wie Wandfliesen', ergebnis: '', type: 'vob-info' });
                        if (isMultiWall) {
                            steps.push({ label: 'Wandfläche', formel: `${fmtDe(perimeter)} × ${fmtDe(H)}`, ergebnis: fmtDe(wandflaeche) + ' m²' });
                        } else {
                            steps.push({ label: 'Wandfläche', formel: `2 × (${fmtDe(L)} + ${fmtDe(B)}) × ${fmtDe(H)}`, ergebnis: fmtDe(wandflaeche) + ' m²' });
                        }
                        wandAbzugItems.forEach(a => {
                            steps.push({ label: `− ${a.name}`, formel: `${fmtDe(a.flaeche)} m²`, ergebnis: '−' + fmtDe(a.flaeche) + ' m²', type: 'abzug' });
                        });
                        wandUebermessen.forEach(a => {
                            steps.push({ label: `⊘ ${a.name} (${fmtDe(a.bVal*a.hVal)} m²)`, formel: 'VOB: ≤0,1 m² → übermessen', ergebnis: '0,00 m²', type: 'vob-info' });
                        });
                        wandLaibungen.forEach(a => {
                            steps.push({ label: `+ Laibung ${a.name}`, formel: '', ergebnis: '+' + fmtDe(a.laibFlaeche) + ' m²', type: 'zurechnung' });
                        });
                        const posWandAbz = wandAbzugItems.reduce((s, a) => s + a.flaeche, 0) + posSonstAbzug.reduce((s, a) => s + a.flaeche, 0);
                        const posWandZur = wandLaibungen.reduce((s, a) => s + a.laibFlaeche, 0) + posSonstZurech.reduce((s, a) => s + a.flaeche, 0);
                        steps.push({ label: 'ERGEBNIS', formel: '', ergebnis: fmtDe(vobRound(Math.max(0, wandflaeche - posWandAbz + posWandZur))) + ' m²', type: 'total' });
                    }

                // ── ESTRICH / ENTKOPPLUNG (gleiche Regeln wie Boden) ──
                } else if (kat === 'estrich' || kat === 'entkopplung' || (pos.bez || '').toLowerCase().includes('estrich') || (pos.bez || '').toLowerCase().includes('entkopplung')) {
                    const posSonst = getSonstigeForPosition(pos.pos);
                    const posSonstAbzug = posSonst.filter(a => a.vobVorzeichen === 'abzug');
                    const posSonstZurech = posSonst.filter(a => a.vobVorzeichen === 'zurechnung');
                    const typLabel = (pos.bez || '').toLowerCase().includes('estrich') ? 'Estrich' : 'Entkopplung';
                    steps.push({ label: `${typLabel} = Bodenfläche`, formel: 'VOB/C DIN 18352: gleiche Regeln wie Bodenfliesen', ergebnis: '', type: 'vob-info' });
                    if (bodenIstManuell) {
                        steps.push({ label: 'Bodenfläche (manuell)', formel: `${fmtDe(BM)}`, ergebnis: fmtDe(bodenflaeche) + ' m²' });
                    } else if (!isMultiWall) {
                        steps.push({ label: 'Bodenfläche', formel: `${fmtDe(L)} × ${fmtDe(B)}`, ergebnis: fmtDe(bodenflaeche) + ' m²' });
                    }
                    if (tueren.length > 0) {
                        steps.push({ label: '⊘ Türen/Fenster', formel: 'VOB/C: Kein Abzug bei Bodenflächen', ergebnis: '0,00 m²', type: 'vob-info' });
                    }
                    posSonstAbzug.forEach(a => {
                        const formel = a.hasManualRW ? '✏️ manuell' : `${fmtDe(a.bVal)}×${fmtDe(a.hVal)}`;
                        steps.push({ label: `− ${a.name}`, formel, ergebnis: '−' + fmtDe(a.flaeche) + ' m²', type: 'abzug' });
                    });
                    const posBodenErg = vobRound(Math.max(0, bodenBasis - posSonstAbzug.reduce((s, a) => s + a.flaeche, 0) + posSonstZurech.reduce((s, a) => s + a.flaeche, 0)));
                    steps.push({ label: 'ERGEBNIS', formel: '', ergebnis: fmtDe(posBodenErg) + ' m²', type: 'total' });

                // ── FENSTERBANK (Stück oder m²) ──
                } else if (kat === 'fensterbank' || (pos.bez || '').toLowerCase().includes('fensterbank')) {
                    if (pos.einheit === 'Stk' || pos.einheit === 'St' || pos.einheit === 'Stück') {
                        calcFenster.forEach(f => {
                            steps.push({ label: `${f.name}`, formel: '1 Stück', ergebnis: '1 Stk', value: 1, sign: 1 });
                        });
                        if (calcFenster.length === 0) {
                            steps.push({ label: 'Keine Fenster erfasst', formel: 'Manuell eingeben', ergebnis: '0 Stk' });
                        }
                        steps.push({ label: 'ERGEBNIS', formel: '', ergebnis: calcFenster.length + ' Stk', type: 'total', value: calcFenster.length });
                    } else {
                        // m² Fensterbank
                        calcFenster.forEach(f => {
                            const fB = parseMass(f.breite); const fT = parseMass(f.tiefe);
                            if (fB > 0 && fT > 0) {
                                steps.push({ label: `${f.name}`, formel: `${fmtDe(fB)} × ${fmtDe(fT)}`, ergebnis: fmtDe(vobRound(fB * fT)) + ' m²', value: fB * fT, sign: 1 });
                            }
                        });
                        const fbTotal = vobRound(calcFenster.reduce((s, f) => s + parseMass(f.breite) * parseMass(f.tiefe), 0));
                        steps.push({ label: 'ERGEBNIS', formel: '', ergebnis: fmtDe(fbTotal) + ' m²', type: 'total', value: fbTotal });
                    }
                }

                return steps;
            };

            // ── Post-Processing: value/sign für Edit-Modus zu jedem Schritt ──
            const enrichRechenweg = (steps) => {
                return steps.map(step => {
                    if (step.value !== undefined) return step; // Already has value
                    // Parse value from ergebnis string
                    const ergStr = (step.ergebnis || '').replace(/[^\d,.\-−]/g, '').replace('−','-').replace(',', '.');
                    const val = parseFloat(ergStr) || 0;
                    let sign = 1;
                    if (step.type === 'total') sign = 0; // Total wird berechnet
                    else if (step.type === 'abzug') sign = -1;
                    else if (step.type === 'zurechnung') sign = 1;
                    else if (step.type === 'vob-info') sign = 0;
                    else if ((step.ergebnis || '').startsWith('−') || (step.ergebnis || '').startsWith('-')) sign = -1;
                    return { ...step, value: Math.abs(val), sign };
                });
            };

            // Automatische Berechnung pro Position (VOB-konform, positionsspezifisch)
            const calcPositionResult = (pos) => {
                // 1. Prio: Fertiggestellter manueller Rechenweg
                if (pos.hasManualRW && pos.manualErgebnis > 0) {
                    return pos.manualErgebnis;
                }
                // 2. Prio: Direkt eingetippter Wert
                const manual = parseMass(pos.manualMenge);
                if (manual > 0) return manual;

                // 3. Prio: Bearbeiteter Rechenweg (Stift-Modus)
                const rechenwegEdit = posRechenwegEdits[pos.pos];
                if (rechenwegEdit && rechenwegEdit.length > 0) {
                    let total = 0;
                    rechenwegEdit.forEach(step => {
                        const val = parseFormel(step.formel);
                        total += val * (step.sign || 1);
                    });
                    return Math.max(0, total);
                }

                const posSonst = getSonstigeForPosition(pos.pos);
                const posSonstAbzugSum = posSonst.filter(a => a.vobVorzeichen === 'abzug').reduce((s, a) => s + a.flaeche, 0);
                const posSonstZurechSum = posSonst.filter(a => a.vobVorzeichen === 'zurechnung').reduce((s, a) => s + a.flaeche, 0);

                switch(pos.kategorie) {
                    case 'wand': {
                        const wAbzug = wandAbzugItems.reduce((s, a) => s + a.flaeche, 0) + posSonstAbzugSum;
                        const wZurech = wandLaibungen.reduce((s, a) => s + a.laibFlaeche, 0) + posSonstZurechSum;
                        return vobRound(Math.max(0, wandflaeche - wAbzug + wZurech));
                    }
                    case 'boden':
                        return vobRound(Math.max(0, bodenBasis - posSonstAbzugSum + posSonstZurechSum));
                    case 'decke':
                        return vobRound(Math.max(0, deckeBasis - posSonstAbzugSum + posSonstZurechSum));
                    case 'verfugung': {
                        // Verfugung folgt gleichen Regeln wie zugehörige Fläche
                        const vBasis = getVobBasis(pos);
                        if (vBasis === 'boden') return vobRound(Math.max(0, bodenBasis - posSonstAbzugSum + posSonstZurechSum));
                        // Wand-Verfugung
                        const wAbzug = wandAbzugItems.reduce((s, a) => s + a.flaeche, 0) + posSonstAbzugSum;
                        const wZurech = wandLaibungen.reduce((s, a) => s + a.laibFlaeche, 0) + posSonstZurechSum;
                        return vobRound(Math.max(0, wandflaeche - wAbzug + wZurech));
                    }
                    case 'estrich':
                    case 'entkopplung':
                        // VOB: Gleiche Regeln wie Boden – kein Tür/Fenster-Abzug
                        return vobRound(Math.max(0, bodenBasis - posSonstAbzugSum + posSonstZurechSum));
                    case 'fensterbank':
                        // Fensterbänke: Stück = Anzahl Fenster, oder m² = Σ(Breite × Tiefe)
                        if (pos.einheit === 'Stk' || pos.einheit === 'St' || pos.einheit === 'Stück') {
                            return calcFenster.length;
                        }
                        return vobRound(calcFenster.reduce((s, f) => s + parseMass(f.breite) * parseMass(f.tiefe), 0));
                    case 'sockel':
                        return sockelErgebnis;
                    case 'abdichtung':
                        if ((pos.tags && pos.tags.includes('boden'))) return vobRound(Math.max(0, bodenBasis - posSonstAbzugSum + posSonstZurechSum));
                        if ((pos.tags && pos.tags.includes('wand'))) {
                            const useH = AH > 0 ? AH : H;
                            const useFlaeche = AH > 0 ? abdichtungWandflaeche : wandflaeche;
                            // Abzüge mit Höhenüberschreitungs-Logik für Abdichtung
                            let aAbzug = 0;
                            wandAbzugItems.forEach(a => {
                                if (a.typ === 'tuer') {
                                    aAbzug += (a.hVal > useH) ? a.bVal * useH : a.bVal * a.hVal;
                                } else if (a.typ === 'fenster') {
                                    const brH = a.brVal || 0;
                                    const gesamtH = brH + a.hVal;
                                    const effH = (gesamtH > useH && useH > 0) ? Math.max(0, a.hVal - (gesamtH - useH)) : a.hVal;
                                    aAbzug += effH * a.bVal;
                                } else {
                                    aAbzug += a.flaeche;
                                }
                            });
                            aAbzug += posSonstAbzugSum;
                            // Laibungen mit Abdichtungs-Schaltern
                            let aZurech = 0;
                            wandLaibungen.forEach(a => {
                                if (a.typ === 'tuer' || a.typ === 'fenster') {
                                    aZurech += a.laibAbdichtung || 0;
                                } else {
                                    aZurech += a.laibFlaeche;
                                }
                            });
                            aZurech += posSonstZurechSum;
                            return vobRound(Math.max(0, useFlaeche - aAbzug + aZurech));
                        }
                        if ((pos.tags && pos.tags.includes('dichtband')) && pos.einheit === 'm') {
                            const umf = isMultiWall ? perimeter : 2 * (L + B);
                            const useAH = AH > 0 ? AH : H;
                            const raumEck = isMultiWall ? wandMasse.length : 4;
                            let db = umf + raumEck * useAH;
                            calcFenster.forEach(f => { db += parseMass(f.breite) + parseMass(f.tiefe)*2; });
                            tueren.forEach(t => { db += parseMass(t.tiefe)*2; });
                            return vobRound(db);
                        }
                        if ((pos.tags && pos.tags.includes('dichtband')) && (pos.einheit === 'Stk' || pos.einheit === 'St')) {
                            // Dichtband Ecken
                            let ecken = isMultiWall ? wandMasse.length : 4;
                            tueren.forEach(t => { if (t.hatLaibung && parseMass(t.tiefe) > 0) ecken += 2; });
                            calcFenster.forEach(f => { if (f.hatLaibung && parseMass(f.tiefe) > 0) ecken += 4; });
                            return ecken;
                        }
                        if ((pos.tags && pos.tags.includes('manschette'))) return 0;
                        return 0;
                    case 'silikon': {
                        // Auto-Berechnung (NUR Raum-Innenecken!)
                        const umf = isMultiWall ? perimeter : 2 * (L + B);
                        const useH = H > 0 ? H : SH;
                        const raumEck = isMultiWall ? wandMasse.length : 4;
                        let sil = umf + raumEck * useH;
                        calcFenster.forEach(f => {
                            sil += parseMass(f.breite) + parseMass(f.tiefe) * 2 + parseMass(f.hoehe) * 2;
                        });
                        tueren.filter(t => t.dauerelastisch).forEach(t => {
                            const tH = parseMass(t.hoehe); const effH = (tH > useH && useH > 0) ? useH : tH;
                            sil += effH * 2 + parseMass(t.tiefe) * 2;
                        });
                        return vobRound(sil);
                    }
                    case 'dichtband': {
                        if (pos.einheit === 'm') {
                            const umf = isMultiWall ? perimeter : 2 * (L + B);
                            const useAH = AH > 0 ? AH : H;
                            const raumEck = isMultiWall ? wandMasse.length : 4;
                            let db = umf + raumEck * useAH;
                            calcFenster.forEach(f => {
                                db += parseMass(f.breite) + parseMass(f.tiefe) * 2;
                            });
                            tueren.forEach(t => {
                                db += parseMass(t.tiefe) * 2;
                            });
                            return vobRound(db);
                        }
                        // Stück (Ecken)
                        const raumEck = isMultiWall ? wandMasse.length : 4;
                        let ecken = raumEck;
                        tueren.forEach(t => { if (t.hatLaibung && parseMass(t.tiefe) > 0) ecken += 2; });
                        calcFenster.forEach(f => { if (f.hatLaibung && parseMass(f.tiefe) > 0) ecken += 4; });
                        return ecken;
                    }
                    case 'manschette':
                        return 0;
                    case 'schiene': {
                        let sch = 0;
                        calcFenster.forEach(f => {
                            if (f.hatLaibung && parseMass(f.tiefe) > 0) {
                                if (f.leibungWandGefliest) sch += parseMass(f.hoehe) * 2;
                                if (f.fensterbankGefliest) sch += parseMass(f.breite);
                            }
                        });
                        tueren.forEach(t => {
                            if (t.hatLaibung && parseMass(t.tiefe) > 0) {
                                const tH = parseMass(t.hoehe); const effH = (tH > H && H > 0) ? H : tH;
                                if (t.leibungWandGefliest) sch += effH * 2;
                                if (t.sturzGefliest) sch += parseMass(t.breite);
                            }
                        });
                        return sch;
                    }
                    default:
                        return 0;
                }
            };

            // ── KI-Foto-Ergebnis Vorschlaege fuer Positions-Karten ──
            const getKiSuggestion = (pos) => {
                if (!kiFotoErgebnisse || !kiFotoErgebnisse.transferred) return null;
                const kat = pos.kategorie;
                const tags = pos.tags || [];
                if ((kat === 'abdichtung' && !tags.includes('boden')) || kat === 'wandabdichtung') {
                    if (kiFotoErgebnisse.abdichtungsflaeche_m2 > 0) {
                        return { label: 'KI-Fotoanalyse: Abdichtungsflaeche', wert: kiFotoErgebnisse.abdichtungsflaeche_m2, einheit: 'm2' };
                    }
                }
                if (kat === 'dichtungsband' || kat === 'abdichtung_ecke') {
                    if (kiFotoErgebnisse.dichtungsbaender_lfm > 0) {
                        return { label: 'KI-Fotoanalyse: Dichtungsbaender', wert: kiFotoErgebnisse.dichtungsbaender_lfm, einheit: 'lfm' };
                    }
                }
                if (kat === 'wand' || kat === 'wandfliesen') {
                    if (kiFotoErgebnisse.gefliesteFlaeche_m2 > 0) {
                        return { label: 'KI-Fotoanalyse: Geflieste Flaeche', wert: kiFotoErgebnisse.gefliesteFlaeche_m2, einheit: 'm2' };
                    }
                }
                if (kat === 'kernbohrung' || kat === 'durchbruch') {
                    if (kiFotoErgebnisse.loecher > 0) {
                        return { label: 'KI-Fotoanalyse: Durchbrueche', wert: kiFotoErgebnisse.loecher, einheit: 'Stk' };
                    }
                }
                if (kat === 'silikon' || kat === 'anschluss' || kat === 'profil') {
                    if (kiFotoErgebnisse.wandanschluesse > 0) {
                        return { label: 'KI-Fotoanalyse: Wandanschluesse', wert: kiFotoErgebnisse.wandanschluesse, einheit: 'Stk' };
                    }
                }
                return null;
            };

            const applyKiSuggestion = (pos, kiSugg) => {
                setPosCards(prev => prev.map(p => {
                    if (p.pos !== pos.pos) return p;
                    return { ...p, manualMenge: String(kiSugg.wert).replace('.', ',') };
                }));
            };

            // ── Positions-Filter fuer Seite 4 ──
            const filteredPosCards = posCards.filter(pos => {
                if (posFilter === 'alle') return true;
                const result = calcPositionResult(pos);
                if (posFilter === 'berechnet') return result > 0;
                if (posFilter === 'leer') return result === 0;
                if (posFilter === 'manuell') return pos.hasManualRW || pos.manualMenge;
                return true;
            });

            // ── Tab-Status Indikatoren ──
            const getTabStatus = (tabIdx) => {
                switch(tabIdx) {
                    case 0: return (parseMass((wandMasse[0] && wandMasse[0].l) || '') > 0 || parseMass(masse.hoehe) > 0) ? 'complete' : 'empty';
                    case 1: {
                        const totalPhotos = FOTO_PHASEN.reduce((sum, p) => sum + countPhasePhotos(p.key), 0);
                        if (kiErgebnisse.details && kiErgebnisse.details.length > 0) return 'complete';
                        if (totalPhotos > 0) return 'partial';
                        return 'empty';
                    }
                    case 2: return (tueren.length > 0 || fenster.length > 0) ? 'complete' : 'empty';
                    case 3: {
                        const berechnet = posCards.filter(p => calcPositionResult(p) > 0).length;
                        if (berechnet === posCards.length && posCards.length > 0) return 'complete';
                        if (berechnet > 0) return 'partial';
                        return 'empty';
                    }
                    default: return 'empty';
                }
            };

            // ── Validierte Fertigstellung ──
            const handleFinishRaumValidated = (callback) => {
                const leerePositionen = posCards.filter(p => calcPositionResult(p) === 0);
                if (leerePositionen.length > 0) {
                    const names = leerePositionen.map(p => 'Pos. ' + p.pos).join(', ');
                    if (!confirm('Folgende Positionen haben Ergebnis 0:\n' + names +
                        '\n\nDiese werden NICHT in die Gesamtliste/Rechnung uebernommen.\n\nTrotzdem fortfahren?')) {
                        return;
                    }
                }
                setHasUnsavedChanges(false);
                callback();
            };

            // ── Schnellzugriff Handler ──
            const handleOpenKundendaten = () => {
                if (window.TW && window.TW.EventBus) {
                    window.TW.EventBus.emit('navigation:datenUebersicht', {
                        kundeId: kunde.id || kunde._driveFolderId
                    });
                }
            };

            const handleOpenOrdner = () => {
                if (kunde._driveFolderId && window.open) {
                    window.open('https://drive.google.com/drive/folders/' + kunde._driveFolderId, '_blank');
                }
            };

            // ══════════════════════════════════════════════════════
            // ── NEU: Akten-Management Handler (Skill Punkt 2+3) ──
            // ══════════════════════════════════════════════════════

            var handleAkteSpeichern = async function() {
                setSaveStatus('saving');
                try {
                    var service = window.GoogleDriveService;
                    if (!service || !service.accessToken) {
                        alert('Google Drive nicht verbunden. Bitte zuerst verbinden.');
                        setSaveStatus('error');
                        setTimeout(function() { setSaveStatus('idle'); }, 3000);
                        return;
                    }
                    if (typeof XLSX === 'undefined') {
                        alert('SheetJS nicht geladen. Excel-Export nicht moeglich.');
                        setSaveStatus('error');
                        return;
                    }
                    var wb = XLSX.utils.book_new();
                    var raumRows = [
                        { Feld: 'Raum', Wert: raumName },
                        { Feld: 'Laenge', Wert: masse.laenge },
                        { Feld: 'Breite', Wert: masse.breite },
                        { Feld: 'Hoehe', Wert: masse.hoehe },
                        { Feld: 'Raumhoehe', Wert: masse.raumhoehe },
                        { Feld: 'Abdichtungshoehe', Wert: masse.abdichtungshoehe },
                        { Feld: 'Sockelhoehe', Wert: masse.sockelhoehe },
                        { Feld: 'Wandanzahl', Wert: wandAnzahl }
                    ];
                    wandMasse.forEach(function(w) {
                        raumRows.push({ Feld: 'Wand ' + w.id, Wert: w.l || '' });
                    });
                    var ws1 = XLSX.utils.json_to_sheet(raumRows);
                    XLSX.utils.book_append_sheet(wb, ws1, 'Raumdaten');
                    var posRows = posCards.map(function(p) {
                        return { Position: p.nr || p.pos, Bezeichnung: p.bezeichnung || p.bez, Einheit: p.einheit, Ergebnis: calcPositionResult(p) };
                    });
                    if (posRows.length > 0) {
                        var ws2 = XLSX.utils.json_to_sheet(posRows);
                        XLSX.utils.book_append_sheet(wb, ws2, 'Positionen');
                    }
                    var xlsxData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                    var kundeName = (kunde && kunde.name) || 'Unbekannt';
                    var now = new Date();
                    var dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
                    var timeStr = String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0');
                    var fileName = kundeName.replace(/[^a-zA-Z0-9]/g, '_') + '_Aufmass_' + dateStr + '_' + timeStr + '.xlsx';
                    var kundeOrdnerId = kunde && kunde._driveFolderId;
                    if (kundeOrdnerId) {
                        var aufmassOrdner = await service.findOrCreateFolder('Aufmass', kundeOrdnerId);
                        var ordnerId = aufmassOrdner.id || aufmassOrdner;
                        var blob = new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                        await service.uploadFile(blob, fileName, ordnerId);
                    } else {
                        var blob2 = new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                        var url = URL.createObjectURL(blob2);
                        var a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
                        URL.revokeObjectURL(url);
                    }
                    setSaveStatus('saved');
                    setTimeout(function() { setSaveStatus('idle'); }, 3000);
                } catch (err) {
                    console.error('Akte speichern fehlgeschlagen:', err);
                    setSaveStatus('error');
                    setTimeout(function() { setSaveStatus('idle'); }, 4000);
                }
            };

            var loadBearbeiteteAkten = async function() {
                setAkteLoading(true);
                try {
                    var service = window.GoogleDriveService;
                    if (!service || !service.accessToken || !(kunde && kunde._driveFolderId)) {
                        setAkteOrdner([]);
                        setAkteLoading(false);
                        return;
                    }
                    var modulOrdner = ['Aufmass', 'Rechnung', 'Schriftverkehr', 'Ausgangsbuch', 'Baustelle'];
                    var ergebnis = [];
                    for (var oi = 0; oi < modulOrdner.length; oi++) {
                        try {
                            var ordnerName = modulOrdner[oi];
                            var ordner = await service.findFolder(ordnerName, kunde._driveFolderId);
                            if (ordner) {
                                var files = await service.listFiles(ordner.id || ordner, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                                if (files && files.length > 0) {
                                    ergebnis.push({
                                        name: ordnerName, id: ordner.id || ordner, modul: ordnerName.toLowerCase(),
                                        files: files.map(function(f) { return { id: f.id, name: f.name, modifiedTime: f.modifiedTime, size: f.size }; })
                                    });
                                }
                            }
                        } catch(e) { /* Ordner existiert nicht */ }
                    }
                    setAkteOrdner(ergebnis);
                } catch(e) { console.error('Akten laden fehlgeschlagen:', e); setAkteOrdner([]); }
                setAkteLoading(false);
            };

            var handleAkteOeffnen = async function(ordner, file) {
                try {
                    var service = window.GoogleDriveService;
                    var xlsxData = await service.downloadFile(file.id);
                    var wb = XLSX.read(xlsxData, { type: 'array' });
                    var ws = wb.Sheets[wb.SheetNames[0]];
                    var jsonData = XLSX.utils.sheet_to_json(ws);
                    jsonData.forEach(function(row) {
                        if (row.Feld === 'Raum') setRaumName(row.Wert || '');
                        if (row.Feld === 'Laenge') setMasse(function(p) { return {...p, laenge: row.Wert || ''}; });
                        if (row.Feld === 'Breite') setMasse(function(p) { return {...p, breite: row.Wert || ''}; });
                        if (row.Feld === 'Hoehe') setMasse(function(p) { return {...p, hoehe: row.Wert || ''}; });
                        if (row.Feld === 'Raumhoehe') setMasse(function(p) { return {...p, raumhoehe: row.Wert || ''}; });
                        if (row.Feld === 'Abdichtungshoehe') setMasse(function(p) { return {...p, abdichtungshoehe: row.Wert || ''}; });
                        if (row.Feld === 'Sockelhoehe') setMasse(function(p) { return {...p, sockelhoehe: row.Wert || ''}; });
                    });
                    setAktePopupOpen(false);
                    setAkteSelectedOrdner(null);
                } catch(e) {
                    console.error('Akte oeffnen fehlgeschlagen:', e);
                    alert('Fehler beim Oeffnen der Akte: ' + e.message);
                }
            };

            // ══════════════════════════════════════════════════════
            // ── NEU: Wandanzahl + Masse kopieren (Skill Punkt 4) ──
            // ══════════════════════════════════════════════════════

            var handleWandAnzahlChange = function(neueAnzahl) {
                var n = parseInt(neueAnzahl) || 4;
                if (n < 3) n = 3;
                if (n > 12) n = 12;
                setWandAnzahl(n);
                var buchstaben = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                var neueWandMasse = [];
                for (var i = 0; i < n; i++) {
                    neueWandMasse.push({
                        id: buchstaben[i],
                        l: (wandMasse[i] && wandMasse[i].l) || '',
                    });
                }
                setWandMasse(neueWandMasse);
                setWandAnzahlPopupOpen(false);
            };

            var handleWandMassChangeNew = function(idx, value) {
                var neueWandMasse = wandMasse.map(function(w) { return {...w}; });
                neueWandMasse[idx] = { ...neueWandMasse[idx], l: value };
                if (masseKopieren) {
                    if (idx === 0 && neueWandMasse.length > 2) {
                        neueWandMasse[2] = { ...neueWandMasse[2], l: value };
                    }
                    if (idx === 1 && neueWandMasse.length > 3) {
                        neueWandMasse[3] = { ...neueWandMasse[3], l: value };
                    }
                }
                setWandMasse(neueWandMasse);
                // Sync mit masse.laenge/breite fuer Grundriss-Berechnung
                if (idx === 0) setMasse(function(p) { return {...p, laenge: value}; });
                if (idx === 1) setMasse(function(p) { return {...p, breite: value}; });
            };

            // ══════════════════════════════════════════════════════
            // ── NEU: Spracheingabe (Skill Punkt 5.6) ──
            // ══════════════════════════════════════════════════════

            var startSpracheingabe = function() {
                var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SR) { alert('Spracheingabe wird von diesem Browser nicht unterstuetzt.'); return; }
                var recognition = new SR();
                recognition.lang = 'de-DE';
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.onresult = function(event) {
                    var result = event.results[event.results.length - 1];
                    if (result.isFinal) {
                        var text = result[0].transcript.trim();
                        var zahlenMatch = text.match(/(\d+[\.,]?\d*)/);
                        if (zahlenMatch) {
                            var focusedInput = document.activeElement;
                            if (focusedInput && (focusedInput.classList.contains('masse-input') || focusedInput.tagName === 'INPUT')) {
                                var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                                setter.call(focusedInput, zahlenMatch[1].replace(',', '.'));
                                focusedInput.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        }
                    }
                };
                recognition.onerror = function() { setSpracheAktiv(false); };
                recognition.start();
                setSpeechRecognitionInst(recognition);
                setSpracheAktiv(true);
            };
            var stopSpracheingabe = function() {
                if (speechRecognitionInst) { speechRecognitionInst.stop(); }
                setSpracheAktiv(false);
            };

            // ── Window-Handler fuer Haupt-Nav Akte-Buttons ──
            useEffect(function() {
                window._akteOeffnenHandler = function() { setAktePopupOpen(true); loadBearbeiteteAkten(); };
                window._akteSpeichernHandler = handleAkteSpeichern;
                window._fotoTabHandler = function() { handleTabChange(1); };
                return function() { delete window._akteOeffnenHandler; delete window._akteSpeichernHandler; delete window._fotoTabHandler; };
            }, []);

            // ── 3-Phasen Foto-Handler ──
            const getWallIds = () => {
                if (wandMasse && wandMasse.length > 0) {
                    return wandMasse.map(w => w.id);
                }
                if (raum && raum.waende && raum.waende.length > 0) {
                    return raum.waende.map(w => w.id);
                }
                return ['A', 'B', 'C', 'D'];
            };

            const countPhasePhotos = (phaseKey) => {
                const phaseData = aktFotos[phaseKey] || {};
                return Object.keys(phaseData).length;
            };

            const handlePhotoCapture = (phase, wandId) => {
                setFotoContext({ phase, wandId });
                if (fotoInputRef2.current) { fotoInputRef2.current.value = ''; fotoInputRef2.current.click(); }
            };

            const handlePhotoFileChange = (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file || !fotoContext) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    setAktFotos(prev => {
                        const updated = { ...prev };
                        updated[fotoContext.phase] = {
                            ...updated[fotoContext.phase],
                            [fotoContext.wandId]: {
                                image: ev.target.result, croppedImage: null,
                                zeit: new Date().toLocaleTimeString('de-DE'),
                                aiAnalysis: null, marked: false
                            }
                        };
                        return updated;
                    });
                    setFotoContext(null);
                };
                reader.readAsDataURL(file);
            };

            const handlePhotoDelete = (phaseKey, wandId) => {
                if (!confirm('Foto loeschen?')) return;
                setAktFotos(prev => {
                    const updated = { ...prev };
                    const phaseData = { ...updated[phaseKey] };
                    delete phaseData[wandId];
                    updated[phaseKey] = phaseData;
                    return updated;
                });
            };

            const togglePhotoMark = (phaseKey, wandId) => {
                setAktFotos(prev => {
                    const updated = { ...prev };
                    const foto = updated[phaseKey][wandId];
                    if (foto) {
                        updated[phaseKey] = { ...updated[phaseKey],
                            [wandId]: { ...foto, marked: !foto.marked }
                        };
                    }
                    return updated;
                });
            };

            const getMarkedFotos = () => {
                const marked = [];
                FOTO_PHASEN.forEach(phase => {
                    const phaseData = aktFotos[phase.key] || {};
                    Object.entries(phaseData).forEach(([wandId, foto]) => {
                        if (foto && foto.marked && (foto.croppedImage || foto.image)) {
                            marked.push({ phase: phase.key, wandId, foto });
                        }
                    });
                });
                return marked;
            };

            const markAllPhotos = (markState) => {
                setAktFotos(prev => {
                    const updated = {};
                    FOTO_PHASEN.forEach(phase => {
                        updated[phase.key] = {};
                        const phaseData = prev[phase.key] || {};
                        Object.entries(phaseData).forEach(([wandId, foto]) => {
                            updated[phase.key][wandId] = { ...foto, marked: markState };
                        });
                    });
                    return updated;
                });
            };

            // ── Foto-Crop-Tool ──
            const openCropModal = (phase, wandId) => {
                const foto = aktFotos[phase] && aktFotos[phase][wandId];
                if (!foto || !foto.image) return;
                setCropState({
                    phase, wandId, image: foto.image,
                    cropRect: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }, // Relative coords 0-1
                    dragging: false, dragCorner: null, dragStart: null
                });
            };

            const cropGetPos = (e, canvas) => {
                const rect = canvas.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                return {
                    x: (clientX - rect.left) / rect.width,
                    y: (clientY - rect.top) / rect.height
                };
            };

            const cropFindCorner = (pos, cropRect) => {
                const corners = [
                    { key: 'tl', x: cropRect.x, y: cropRect.y },
                    { key: 'tr', x: cropRect.x + cropRect.w, y: cropRect.y },
                    { key: 'bl', x: cropRect.x, y: cropRect.y + cropRect.h },
                    { key: 'br', x: cropRect.x + cropRect.w, y: cropRect.y + cropRect.h }
                ];
                const threshold = 0.05;
                for (const c of corners) {
                    if (Math.abs(pos.x - c.x) < threshold && Math.abs(pos.y - c.y) < threshold) return c.key;
                }
                // Check if inside rect -> move entire rect
                if (pos.x > cropRect.x && pos.x < cropRect.x + cropRect.w &&
                    pos.y > cropRect.y && pos.y < cropRect.y + cropRect.h) return 'move';
                return null;
            };

            const handleCropStart = (e) => {
                e.preventDefault();
                const canvas = cropCanvasRef.current;
                if (!canvas || !cropState) return;
                const pos = cropGetPos(e, canvas);
                const corner = cropFindCorner(pos, cropState.cropRect);
                if (corner) {
                    setCropState(prev => ({...prev, dragging: true, dragCorner: corner, dragStart: pos}));
                }
            };

            const handleCropMove = (e) => {
                if (!cropState || !cropState.dragging) return;
                e.preventDefault();
                const canvas = cropCanvasRef.current;
                if (!canvas) return;
                const pos = cropGetPos(e, canvas);
                const dx = pos.x - cropState.dragStart.x;
                const dy = pos.y - cropState.dragStart.y;
                setCropState(prev => {
                    let r = {...prev.cropRect};
                    const corner = prev.dragCorner;
                    if (corner === 'move') {
                        r.x = Math.max(0, Math.min(1 - r.w, r.x + dx));
                        r.y = Math.max(0, Math.min(1 - r.h, r.y + dy));
                    } else if (corner === 'tl') {
                        const newX = Math.max(0, r.x + dx);
                        const newY = Math.max(0, r.y + dy);
                        r.w = r.w - (newX - r.x); r.h = r.h - (newY - r.y);
                        r.x = newX; r.y = newY;
                    } else if (corner === 'tr') {
                        r.w = Math.min(1 - r.x, r.w + dx);
                        const newY = Math.max(0, r.y + dy);
                        r.h = r.h - (newY - r.y); r.y = newY;
                    } else if (corner === 'bl') {
                        const newX = Math.max(0, r.x + dx);
                        r.w = r.w - (newX - r.x); r.x = newX;
                        r.h = Math.min(1 - r.y, r.h + dy);
                    } else if (corner === 'br') {
                        r.w = Math.min(1 - r.x, r.w + dx);
                        r.h = Math.min(1 - r.y, r.h + dy);
                    }
                    r.w = Math.max(0.05, r.w); r.h = Math.max(0.05, r.h);
                    return {...prev, cropRect: r, dragStart: pos};
                });
            };

            const handleCropEnd = () => {
                if (!cropState) return;
                setCropState(prev => ({...prev, dragging: false, dragCorner: null}));
            };

            const applyCrop = () => {
                if (!cropState) return;
                const img = cropImageRef.current;
                if (!img) return;
                const r = cropState.cropRect;
                const canvas = document.createElement('canvas');
                const sx = r.x * img.naturalWidth;
                const sy = r.y * img.naturalHeight;
                const sw = r.w * img.naturalWidth;
                const sh = r.h * img.naturalHeight;
                canvas.width = Math.max(1, Math.round(sw));
                canvas.height = Math.max(1, Math.round(sh));
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
                const croppedImage = canvas.toDataURL('image/jpeg', 0.85);
                // Save cropped image
                setAktFotos(prev => {
                    const updated = {...prev};
                    if (updated[cropState.phase] && updated[cropState.phase][cropState.wandId]) {
                        updated[cropState.phase] = {...updated[cropState.phase],
                            [cropState.wandId]: {...updated[cropState.phase][cropState.wandId], croppedImage}
                        };
                    }
                    return updated;
                });
                setCropState(null);
            };

            // === PHASENSPEZIFISCHE KI-FOTO-PROMPTS (Gemini Pro) ===
            const getPhasePrompt = (phase, stufe) => {
                const raumInfo = 'Raummasze: Laenge=' + (masse.laenge||'?') + 'm, Breite=' + (masse.breite||'?') + 'm, Hoehe=' + (masse.hoehe||'?') + 'm.';

                if (phase === 'rohzustand') {
                    return 'Du bist ein Experte fuer Fliesenlegerarbeiten (DIN 18352). Analysiere dieses Foto vom ROHZUSTAND eines Raumes (vor Arbeitsbeginn). ' + raumInfo + ' Erkenne OHNE Markierungen: 1) Wandflaeche schaetzen (grob, +-10%) 2) Innenecken PRAEZISE zaehlen (einspringend, konkav) - JEDE Ecke zaehlen, auch an Nischen und Vorwaenden! 3) Aussenecken PRAEZISE zaehlen (vorspringend, konvex) - inkl. Fensterleibungen, Vorwandinstallationen, Nischen! 4) Meter Aussenecken schaetzen (Gesamtlaenge aller Aussenecken in lfm) 5) Wandeinschluesse (Nischen, Vorwand-Elemente, Stuetzen) 6) Installationsloecher (Steckdosen, Rohrdurchfuehrungen, Sanitaeranschluesse) 7) Sanitaer-Objekte erkennen (WC, Waschbecken, Dusche, Badewanne). Antworte NUR als JSON: {"wandflaeche_m2":0,"innenecken":0,"aussenecken":0,"aussenecken_lfm":0,"wandeinschluesse":0,"loecher":0,"wandanschluesse":0,"objekte":[{"typ":"","anzahl":0}],"zusammenfassung":""}';
                }
                if (phase === 'vorarbeiten') {
                    return 'Du bist ein Experte fuer Fliesenlegerarbeiten und Abdichtung (DIN 18534). Analysiere dieses Foto NACH VORARBEITEN (Abdichtung/Grundierung). ' + raumInfo + ' Der Nutzer hat farbige Markierungen auf dem Foto angebracht. Erkenne die markierten Bereiche und berechne: BLAU markiert = Wand-Abdichtungsflaeche in m2, GRUEN markiert = Dichtungsband-Laenge an Innen-/Aussenecken in lfm, GELB markiert = Stueckzahl Innen-/Aussenecken (zaehle einzelne Ecken), LILA markiert = Dichtungsmanschetten (Stueckzahl). Falls keine Farbmarkierungen sichtbar: erkenne automatisch Abdichtungsflaechen, Dichtungsbaender und Manschetten. Antworte NUR als JSON: {"farbErgebnisse":{"blau_m2":{"farbe":"blau","beschreibung":"Wand-Abdichtungsflaeche","wert":0,"einheit":"m2"},"gruen_lfm":{"farbe":"gruen","beschreibung":"Dichtungsband Ecken","wert":0,"einheit":"lfm"},"gelb_Stk":{"farbe":"gelb","beschreibung":"Innen-/Aussenecken","wert":0,"einheit":"Stk"},"lila_Stk":{"farbe":"lila","beschreibung":"Dichtungsmanschetten","wert":0,"einheit":"Stk"}},"innenecken":0,"aussenecken":0,"zusammenfassung":""}';
                }
                if (phase === 'fertigstellung') {
                    return 'Du bist ein Experte fuer Fliesenlegerarbeiten (DIN 18352). Analysiere dieses Foto der FERTIGSTELLUNG (nach Fliesenverlegung). ' + raumInfo + ' Der Nutzer hat farbige Markierungen auf dem Foto angebracht. Erkenne die markierten Bereiche und berechne: ROT markiert = Geflieste Wandflaeche in m2, BLAU markiert = Installationsloecher (Stueckzahl), GRUEN markiert = Dehnungsfugen in lfm, GELB markiert = Schienen/Profile in lfm, LILA markiert = Ablagen in lfm, ORANGE markiert = Laibungen in lfm. Falls keine Farbmarkierungen sichtbar: erkenne automatisch die geflieste Flaeche, Loecher, Fugen und Profile. Antworte NUR als JSON: {"farbErgebnisse":{"rot_m2":{"farbe":"rot","beschreibung":"Geflieste Wandflaeche","wert":0,"einheit":"m2"},"blau_Stk":{"farbe":"blau","beschreibung":"Installationsloecher","wert":0,"einheit":"Stk"},"gruen_lfm":{"farbe":"gruen","beschreibung":"Dehnungsfugen","wert":0,"einheit":"lfm"},"gelb_lfm":{"farbe":"gelb","beschreibung":"Schienen","wert":0,"einheit":"lfm"},"lila_lfm":{"farbe":"lila","beschreibung":"Ablagen","wert":0,"einheit":"lfm"},"orange_lfm":{"farbe":"orange","beschreibung":"Laibungen","wert":0,"einheit":"lfm"}},"loecher":0,"zusammenfassung":""}';
                }
                if (stufe === 'klein') {
                    return 'Analysiere dieses Bild einer Wand/Boden. ' + raumInfo + ' Zaehle praezise: loecher, wandanschluesse, innenecken (auch an Nischen!), aussenecken (auch Fensterleibungen!). Erkenne Sanitaer-Objekte. Antworte NUR als JSON: {"loecher":0,"wandanschluesse":0,"innenecken":0,"aussenecken":0,"objekte":[{"typ":"","anzahl":0}],"zusammenfassung":""}';
                }
                return 'Analysiere dieses Bild einer Wand/Boden. ' + raumInfo + ' Zaehle: loecher, wandanschluesse, innenecken, aussenecken, Sanitaer-Objekte. ZUSAETZLICH schaetze: abdichtung (flaeche_m2, dichtungsbaender_lfm), geflieste_flaeche_m2. Antworte NUR als JSON: {"loecher":0,"wandanschluesse":0,"innenecken":0,"aussenecken":0,"objekte":[{"typ":"","anzahl":0}],"abdichtung":{"flaeche_m2":0,"dichtungsbaender_lfm":0},"geflieste_flaeche_m2":0,"zusammenfassung":""}';
            };

            const runKiAnalyse = async (stufe) => {
                const marked = getMarkedFotos();
                if (marked.length === 0) { alert('Keine Fotos markiert! Markiere Fotos mit dem Haekchen oben rechts.'); return; }
                var geminiApiKey = (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.API_KEY) || localStorage.getItem('gemini_api_key') || '';
                if (!geminiApiKey) {
                    alert('Gemini API-Key nicht konfiguriert. Bitte zuerst auf der Startseite verbinden.'); return;
                }
                setAnalyseRunning(true);
                setAnalyseProgress({ current: 0, total: marked.length, wandId: '' });
                const results = [];
                var proModelId = (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.MODELS && GEMINI_CONFIG.MODELS['pro']) ? GEMINI_CONFIG.MODELS['pro'].id : 'gemini-2.5-pro';

                for (let i = 0; i < marked.length; i++) {
                    const m = marked[i];
                    setAnalyseProgress({ current: i + 1, total: marked.length, wandId: m.wandId });
                    try {
                        const imgData = (m.foto.croppedImage || m.foto.image).split(',')[1];
                        const prompt = getPhasePrompt(m.phase, stufe);

                        var rawText = null;
                        if (typeof window.callGeminiAPI === 'function') {
                            rawText = await window.callGeminiAPI(
                                [{ content: prompt }], 4096,
                                { model: proModelId, files: [{ mimeType: 'image/jpeg', base64Data: imgData }], jsonMode: true }
                            );
                        }
                        if (!rawText) {
                            var baseUrl = (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.BASE_URL) || 'https://generativelanguage.googleapis.com/v1beta';
                            const resp = await fetch(baseUrl + '/models/' + proModelId + ':generateContent?key=' + geminiApiKey, {
                                method: 'POST', headers: {'Content-Type':'application/json'},
                                body: JSON.stringify({
                                    contents: [{ parts: [
                                        { inline_data: { mime_type: 'image/jpeg', data: imgData } },
                                        { text: prompt }
                                    ]}],
                                    generationConfig: { temperature: 0.1, maxOutputTokens: 4096, responseMimeType: 'application/json' }
                                })
                            });
                            const data = await resp.json();
                            rawText = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '{}';
                        }
                        rawText = (rawText || '{}').replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                        const parsed = JSON.parse(rawText);
                        parsed._phase = m.phase;
                        results.push(parsed);
                        setAktFotos(prev => {
                            const updated = { ...prev };
                            if (updated[m.phase] && updated[m.phase][m.wandId]) {
                                updated[m.phase] = { ...updated[m.phase],
                                    [m.wandId]: { ...updated[m.phase][m.wandId], aiAnalysis: parsed }
                                };
                            }
                            return updated;
                        });
                    } catch(err) {
                        console.error('KI-Analyse Fehler Wand ' + m.wandId + ':', err);
                        results.push({ _phase: m.phase, loecher: 0, wandanschluesse: 0, innenecken: 0, aussenecken: 0, zusammenfassung: 'Fehler: ' + err.message });
                    }
                }
                const agg = {
                    loecher: 0, wandanschluesse: 0, innenecken: 0, aussenecken: 0,
                    aussenecken_lfm: 0, wandeinschluesse: 0, wandflaeche_m2: 0,
                    sanitaerObjekte: [], installationen: [],
                    abdichtungsflaeche_m2: 0, dichtungsbaender_lfm: 0, gefliesteFlaeche_m2: 0,
                    farbErgebnisse: {}, details: results
                };
                results.forEach(r => {
                    agg.loecher += (r.loecher || 0);
                    agg.wandanschluesse += (r.wandanschluesse || 0);
                    agg.innenecken += (r.innenecken || 0);
                    agg.aussenecken += (r.aussenecken || 0);
                    agg.aussenecken_lfm += (r.aussenecken_lfm || 0);
                    agg.wandeinschluesse += (r.wandeinschluesse || 0);
                    agg.wandflaeche_m2 += (r.wandflaeche_m2 || 0);
                    if (r.objekte) {
                        r.objekte.forEach(obj => {
                            const existing = agg.sanitaerObjekte.find(s => s.typ === obj.typ);
                            if (existing) existing.anzahl += obj.anzahl;
                            else agg.sanitaerObjekte.push({ ...obj });
                        });
                    }
                    if (r.abdichtung) {
                        agg.abdichtungsflaeche_m2 += (r.abdichtung.flaeche_m2 || 0);
                        agg.dichtungsbaender_lfm += (r.abdichtung.dichtungsbaender_lfm || 0);
                    }
                    if (r.geflieste_flaeche_m2) { agg.gefliesteFlaeche_m2 += r.geflieste_flaeche_m2; }
                    if (r.farbErgebnisse) {
                        Object.keys(r.farbErgebnisse).forEach(fKey => {
                            var fe = r.farbErgebnisse[fKey];
                            if (!agg.farbErgebnisse[fKey]) { agg.farbErgebnisse[fKey] = Object.assign({}, fe); }
                            else { agg.farbErgebnisse[fKey].wert = (agg.farbErgebnisse[fKey].wert || 0) + (fe.wert || 0); }
                        });
                    }
                });
                setKiErgebnisse(agg);
                setAnalyseRunning(false);
                console.log('[TW KI] Analyse abgeschlossen:', agg);
            };

            const transferKiErgebnisseToPositions = () => {
                setKiFotoErgebnisse({
                    ...kiErgebnisse, timestamp: Date.now(), transferred: true
                });
                handleTabChange(3);
            };

            const handleFoto = (wandId) => {
                fotoTargetWand.current = wandId || 'extra_' + Date.now();
                if (fotoInputRef.current) {
                    fotoInputRef.current.value = '';
                    fotoInputRef.current.click();
                }
            };

            const handleFotoCapture = (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const base64 = ev.target.result;
                    const wandId = fotoTargetWand.current || 'extra_' + Date.now();
                    const existing = fotos.find(f => f.wandId === wandId);
                    if (existing) {
                        setFotos(prev => prev.map(f => f.wandId === wandId
                            ? { ...f, image: base64, zeit: new Date().toLocaleTimeString('de-DE'), aiAnalysis: null }
                            : f
                        ));
                    } else {
                        const label = wandId.startsWith('extra_') ? 'Sonstiges ' + (fotos.filter(f => f.wandId.startsWith('extra_')).length + 1) : 'Wand ' + wandId;
                        setFotos(prev => [...prev, {
                            id: Date.now(),
                            wandId: wandId,
                            label: label,
                            image: base64,
                            zeit: new Date().toLocaleTimeString('de-DE'),
                            aiAnalysis: null
                        }]);
                    }
                };
                reader.readAsDataURL(file);
            };

            const handleFotoDelete = (wandId) => {
                setFotos(prev => prev.filter(f => f.wandId !== wandId));
            };

            const handleAiAnalyze = async (wandId) => {
                const foto = fotos.find(f => f.wandId === wandId);
                if (!foto || !foto.image) return;
                // Set analyzing state
                setFotos(prev => prev.map(f => f.wandId === wandId
                    ? { ...f, aiAnalysis: { analyzing: true, objects: [], summary: '', error: null } }
                    : f
                ));
                try {
                    const base64Data = foto.image.split(',')[1];
                    const mediaType = foto.image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
                    const raumInfo = raumName || (raum && raum.bez) || 'Raum';
                    const wandInfo = foto.label || 'Wand';
                    const apiText = await window.callAnthropicAPI([{
                                role: 'user',
                                content: [
                                    {
                                        type: 'image',
                                        source: { type: 'base64', media_type: mediaType, data: base64Data }
                                    },
                                    {
                                        type: 'text',
                                        text: 'Du bist ein Baustellen-Experte fuer Fliesenarbeiten. Analysiere dieses Foto einer Wand/Fläche (' + wandInfo + ' in ' + raumInfo + '). Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Backticks), exakt in diesem Format:\n{"objects":[{"type":"Name","count":Anzahl,"icon":"emoji","details":"Kurze Beschreibung"}],"summary":"Zusammenfassung in 1-2 Saetzen","wandanschluesse":Anzahl,"ecken":Anzahl}\n\nErkenne und zaehle folgende Elemente:\n- Tueren (Typ: Stahlzarge, Holzzarge, etc. + geschaetzte Masse)\n- Fenster (geschaetzte Masse)\n- Wandanschluesse / Anschlussfugen\n- Innenecken und Aussenecken\n- Vorhandene Fliesen oder Wandbelaege\n- Sanitaer-Objekte (Waschbecken, WC, Dusche, Badewanne)\n- Installationen (Steckdosen, Schalter, Rohre, Leitungen)\n- Nischen, Vorspruenge, Absaetze\n- Sockelleisten oder Abdichtungen\nWenn etwas nicht sichtbar ist, lasse es weg. Sei praezise bei Massen (schaetze in Meter).'
                                    }
                                ]
                            }], 1000);
                    if (!apiText) throw new Error('KI nicht verfügbar');
                    const cleaned = apiText.replace(/```json|```/g, '').trim();
                    const parsed = JSON.parse(cleaned);
                    setFotos(prev => prev.map(f => f.wandId === wandId
                        ? { ...f, aiAnalysis: {
                            analyzing: false,
                            objects: parsed.objects || [],
                            summary: parsed.summary || '',
                            wandanschluesse: parsed.wandanschluesse || 0,
                            ecken: parsed.ecken || 0,
                            error: null
                        }}
                        : f
                    ));
                } catch (err) {
                    console.error('AI Analysis Error:', err);
                    setFotos(prev => prev.map(f => f.wandId === wandId
                        ? { ...f, aiAnalysis: { analyzing: false, objects: [], summary: '', error: 'Analyse fehlgeschlagen: ' + err.message } }
                        : f
                    ));
                }
            };

            const handleAiAnalyzeAll = async () => {
                const fotosWithImages = fotos.filter(f => f.image && (!f.aiAnalysis || !f.aiAnalysis.objects || f.aiAnalysis.objects.length === 0));
                for (const foto of fotosWithImages) {
                    await handleAiAnalyze(foto.wandId);
                }
            };

            const addAbzug = () => {
                if (editAbzugId) {
                    // ── EDIT-Modus: bestehenden Eintrag aktualisieren ──
                    setAbzuege(prev => prev.map(a => a.id === editAbzugId ? { ...abzugForm, typ: 'sonstige', id: editAbzugId } : a));
                    setEditAbzugId(null);
                } else {
                    // ── NEU-Modus: neuen Eintrag hinzufügen ──
                    const newAbzug = { ...abzugForm, typ: 'sonstige', id: Date.now() };
                    setAbzuege(prev => [...prev, newAbzug]);
                }
                setAbzugForm({ name: '', breite: '', hoehe: '', tiefe: '', posZuordnung: {}, manualRW: null });
                setShowAbzugModal(false);
            };

            const openEditAbzug = (a) => {
                setAbzugForm({
                    name: a.name || '', breite: a.breite || '', hoehe: a.hoehe || '', tiefe: a.tiefe || '',
                    posZuordnung: a.posZuordnung || {}, manualRW: a.manualRW || null
                });
                setEditAbzugId(a.id);
                setShowAbzugModal(true);
            };

            // ── Sonstige: Manuelle Eingabe Rechenweg ──
            const openAbzugRW = () => {
                setAbzugRWZeilen([{ id: Date.now(), text: '', vorzeichen: 'plus' }]);
                setShowAbzugRWModal(true);
            };
            const addAbzugRWZeile = () => setAbzugRWZeilen(prev => [...prev, { id: Date.now(), text: '', vorzeichen: 'plus' }]);
            const removeAbzugRWZeile = (id) => setAbzugRWZeilen(prev => prev.length > 1 ? prev.filter(z => z.id !== id) : prev);
            const updateAbzugRWZeile = (id, field, val) => setAbzugRWZeilen(prev => prev.map(z => z.id === id ? {...z, [field]: val} : z));

            const parseAbzugRWZeile = (text) => {
                const expr = prepareCalcText(text);
                if (!expr) return 0;
                const result = evalMathExpr(expr);
                return isNaN(result) ? 0 : result;
            };

            const abzugRWSumme = abzugRWZeilen.reduce((sum, z) => {
                const val = parseAbzugRWZeile(z.text);
                return sum + (z.vorzeichen === 'minus' ? -val : val);
            }, 0);

            const finishAbzugRW = () => {
                const rwData = { zeilen: abzugRWZeilen.filter(z => z.text.trim()), ergebnis: abzugRWSumme };
                if (abzugPosRWTarget) {
                    // Positions-spezifischer Rechenweg
                    const { posNr, vorzeichen } = abzugPosRWTarget;

                    // Flächen-Kategorie bestimmen (boden oder wand)
                    const targetPos = posCards.find(p => p.pos === posNr);
                    const targetTags = (targetPos && targetPos.tags) || [];
                    const istBoden = targetTags.includes('boden');
                    const istWand = targetTags.includes('wand');

                    setAbzugForm(prev => {
                        const newZuordnung = { ...prev.posZuordnung };
                        // Ziel-Position setzen
                        newZuordnung[posNr] = { vorzeichen, manualRW: rwData };

                        // Auto-Propagation: gleichen RW auf alle zugeordneten Positionen
                        // der selben Flächenkategorie übertragen
                        if (istBoden || istWand) {
                            const tag = istBoden ? 'boden' : 'wand';
                            posCards.forEach(p => {
                                if (p.pos === posNr) return; // Ziel überspringen
                                const pTags = p.tags || [];
                                if (!pTags.includes(tag)) return; // andere Kategorie
                                // Nur wenn diese Position bereits zugeordnet ist
                                if (newZuordnung[p.pos]) {
                                    newZuordnung[p.pos] = {
                                        ...newZuordnung[p.pos],
                                        manualRW: rwData
                                    };
                                }
                            });
                        }

                        return { ...prev, posZuordnung: newZuordnung };
                    });
                    setAbzugPosRWTarget(null);
                } else {
                    // Globaler Rechenweg für das Bauteil selbst
                    setAbzugForm(prev => ({...prev, manualRW: rwData, breite: '', hoehe: '', tiefe: '' }));
                }
                setShowAbzugRWModal(false);
            };

            const removeAbzug = (id) => {
                setAbzuege(prev => prev.filter(a => a.id !== id));
            };

            // ── Türen-Management ──
            const addTuer = () => {
                const newId = Date.now();
                // Vorlage: erste Tür im aktuellen Raum (falls vorhanden), sonst tuerDef vom Vorraum
                const vorlage = tueren.length > 0 ? tueren[0] : tuerDef;
                setTueren(prev => [...prev, {
                    id: newId, name: `Tür ${prev.length + 1}`,
                    breite: vorlage.breite || '', hoehe: vorlage.hoehe || '', tiefe: vorlage.tiefe || '',
                    hatLaibung: vorlage.hatLaibung || false,
                    dauerelastisch: vorlage.dauerelastisch,
                    leibungWandGefliest: vorlage.leibungWandGefliest,
                    leibungBodenGefliest: vorlage.leibungBodenGefliest,
                    sturzGefliest: vorlage.sturzGefliest,
                    leibungWandAbgedichtet: vorlage.leibungWandAbgedichtet,
                    leibungBodenAbgedichtet: vorlage.leibungBodenAbgedichtet,
                    sturzAbgedichtet: vorlage.sturzAbgedichtet,
                    expanded: true
                }]);
                setLastAddedTuerId(newId);
            };
            const updateTuer = (id, field, value) => {
                setTueren(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
            };
            const removeTuer = (id) => {
                setTueren(prev => prev.filter(t => t.id !== id));
            };

            // ── Fenster-Management ──
            const addFenster = () => {
                const newId = Date.now();
                const vorlage = fenster.length > 0 ? fenster[0] : fensterDef;
                setFenster(prev => [...prev, {
                    id: newId, name: `Fenster ${prev.length + 1}`,
                    breite: vorlage.breite || '', hoehe: vorlage.hoehe || '', tiefe: vorlage.tiefe || '',
                    hatLaibung: vorlage.hatLaibung || false,
                    bruestung: vorlage.bruestung || '', bodengleich: vorlage.bodengleich || false,
                    leibungWandGefliest: vorlage.leibungWandGefliest,
                    fensterbankGefliest: vorlage.fensterbankGefliest,
                    sturzGefliest: vorlage.sturzGefliest,
                    leibungWandAbgedichtet: vorlage.leibungWandAbgedichtet,
                    fensterbankAbgedichtet: vorlage.fensterbankAbgedichtet,
                    sturzAbgedichtet: vorlage.sturzAbgedichtet,
                    expanded: true
                }]);
                setLastAddedFensterId(newId);
            };
            const updateFenster = (id, field, value) => {
                setFenster(prev => prev.map(f => {
                    if (f.id !== id) return f;
                    const updated = { ...f, [field]: value };
                    // Bodengleich → Brüstungshöhe automatisch auf 0
                    if (field === 'bodengleich' && value === true) {
                        updated.bruestung = '0,00';
                    }
                    return updated;
                }));
            };
            const removeFenster = (id) => {
                setFenster(prev => prev.filter(f => f.id !== id));
            };

            const addWand = () => {
                const nextId = String.fromCharCode(65 + wandMasse.length);
                setWandMasse(prev => [...prev, { id: nextId, l: '' }]);
                setLastAddedWandIdx(wandMasse.length);
            };

            const updateWand = (idx, val) => {
                setWandMasse(prev => prev.map((w, i) => i === idx ? { ...w, l: val } : w));
            };

            const removeWand = (idx) => {
                setWandMasse(prev => prev.filter((_, i) => i !== idx));
            };

            const updatePosCard = (posNr, field, value) => {
                setPosCards(prev => prev.map(p => p.pos === posNr ? { ...p, [field]: value } : p));
            };

            const removePosCard = (posNr) => {
                setPosCards(prev => prev.filter(p => p.pos !== posNr));
            };

            const toggleExpand = (posNr) => {
                setExpandedPos(prev => prev === posNr ? null : posNr);
            };

            // Canvas drawing
            // ── Auto-Sync: Wenn Fenster/Türen/Raummaße sich ändern, aktive Edits aktualisieren ──
            const getFingerprint = () => {
                const f = fenster.map(f => `${f.id}|${f.breite}|${f.hoehe}|${f.tiefe}|${f.hatLaibung}|${f.leibungWandGefliest}|${f.fensterbankGefliest}`).join(',');
                const t = tueren.map(t => `${t.id}|${t.breite}|${t.hoehe}|${t.tiefe}|${t.hatLaibung}|${t.dauerelastisch}|${t.leibungWandGefliest}`).join(',');
                const m = `${masse.laenge}|${masse.breite}|${masse.hoehe}|${masse.abdichtungshoehe}|${masse.sockelhoehe}|${masse.bodenManual}`;
                const w = wandMasse.map(w => w.l).join(',');
                return f + '||' + t + '||' + m + '||' + w + '||' + fensterUebernehmen + '||' + sonstigeUebernehmen;
            };
            const prevFingerprint = useRef(getFingerprint());

            useEffect(() => {
                const newFingerprint = getFingerprint();
                if (newFingerprint === prevFingerprint.current) return;
                prevFingerprint.current = newFingerprint;

                // Refresh all active edits
                setPosRechenwegEdits(prev => {
                    const posKeys = Object.keys(prev);
                    if (posKeys.length === 0) return prev;

                    const updated = {...prev};
                    let anyChanged = false;

                    posKeys.forEach(posNr => {
                        const pos = posCards.find(p => p.pos === posNr);
                        if (!pos) return;
                        const kat = pos.kategorie;
                        // Alle Kategorien die von Raummaßen/Öffnungen abhängen
                        if (!['wand','boden','sockel','silikon','dichtband','schiene','abdichtung','decke','verfugung','estrich','entkopplung','fensterbank'].includes(kat)) return;

                        // Auto-Steps komplett neu generieren
                        const autoSteps = enrichRechenweg(buildRechenweg(pos))
                            .filter(st => st.type !== 'total' && st.sign !== 0);
                        const currentEdits = prev[posNr] || [];

                        // Neu aufbauen: Auto-Steps als Basis, User-Änderungen beibehalten wo möglich
                        const autoLabels = new Set(autoSteps.map(st => st.label));
                        const editByLabel = {};
                        currentEdits.forEach(e => { editByLabel[e.label] = e; });

                        const merged = [];
                        // 1) Alle aktuellen Auto-Steps durchgehen
                        autoSteps.forEach((st, i) => {
                            const existing = editByLabel[st.label];
                            if (existing) {
                                // Step existiert in Edits → Formel beibehalten wenn User sie geändert hat
                                merged.push(existing);
                                delete editByLabel[st.label]; // verbraucht
                            } else {
                                // Neuer Auto-Step → hinzufügen
                                merged.push({
                                    id: 'sync_' + Date.now() + '_' + i,
                                    label: st.label,
                                    formel: st.formel || fmtDe(st.value || 0),
                                    sign: st.sign || 1
                                });
                            }
                        });
                        // 2) Manuelle Zeilen (User-hinzugefügt) beibehalten
                        Object.values(editByLabel).forEach(e => {
                            if (e.label && !autoLabels.has(e.label)) {
                                merged.push(e); // User-eigene Zeile
                            }
                            // Else: Zeile gehört zu gelöschtem Fenster/Tür → wird entfernt
                        });

                        if (JSON.stringify(merged) !== JSON.stringify(currentEdits)) {
                            updated[posNr] = merged;
                            anyChanged = true;
                        }
                    });

                    return anyChanged ? updated : prev;
                });
            }, [fenster, tueren, masse, wandMasse]);

            useEffect(() => {
                if (isDrawMode && canvasRef.current) {
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d');
                    let drawing = false;
                    const startDraw = (e) => { drawing = true; const r = canvas.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top); };
                    const draw = (e) => { if (!drawing) return; const r = canvas.getBoundingClientRect(); ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 2; ctx.stroke(); };
                    const stopDraw = () => { drawing = false; };
                    canvas.addEventListener('mousedown', startDraw);
                    canvas.addEventListener('mousemove', draw);
                    canvas.addEventListener('mouseup', stopDraw);
                    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e.touches[0]); });
                    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); });
                    canvas.addEventListener('touchend', stopDraw);
                    return () => {
                        canvas.removeEventListener('mousedown', startDraw);
                        canvas.removeEventListener('mousemove', draw);
                        canvas.removeEventListener('mouseup', stopDraw);
                    };
                }
            }, [isDrawMode]);

            // ── Handskizze Canvas-Handler ──
            const skizzeGetPos = (e) => {
                const canvas = skizzeCanvasRef.current;
                if (!canvas) return {x:0,y:0};
                const rect = canvas.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                return {
                    x: (clientX - rect.left) * (canvas.width / rect.width),
                    y: (clientY - rect.top) * (canvas.height / rect.height)
                };
            };
            const skizzeSnap = (pos) => ({
                x: Math.round(pos.x / skizze.gridSize) * skizze.gridSize,
                y: Math.round(pos.y / skizze.gridSize) * skizze.gridSize
            });

            const skizzeDrawGrid = (ctx, w, h, gs) => {
                ctx.fillStyle = '#1a2332';
                ctx.fillRect(0, 0, w, h);
                ctx.strokeStyle = 'rgba(100,140,180,0.12)';
                ctx.lineWidth = 0.5;
                for (let x = 0; x <= w; x += gs) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
                for (let y = 0; y <= h; y += gs) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
                ctx.strokeStyle = 'rgba(100,140,180,0.25)';
                ctx.lineWidth = 1;
                for (let x = 0; x <= w; x += gs*5) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
                for (let y = 0; y <= h; y += gs*5) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
            };

            const skizzeRedraw = React.useCallback(() => {
                const canvas = skizzeCanvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                skizzeDrawGrid(ctx, canvas.width, canvas.height, skizze.gridSize);
                // Saved paths
                skizze.paths.forEach(path => {
                    ctx.strokeStyle = path.color; ctx.lineWidth = path.width;
                    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                    ctx.beginPath();
                    path.points.forEach((p,i) => { if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
                    ctx.stroke();
                });
                // Current path
                if (skizze.currentPath) {
                    ctx.strokeStyle = skizze.currentPath.color; ctx.lineWidth = skizze.currentPath.width;
                    ctx.lineCap = 'round'; ctx.beginPath();
                    skizze.currentPath.points.forEach((p,i) => { if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
                    ctx.stroke();
                }
                // Saved labels (red)
                skizze.labels.forEach(label => {
                    label.strokes.forEach(stroke => {
                        ctx.strokeStyle = skizze.labelColor; ctx.lineWidth = skizze.labelWidth;
                        ctx.lineCap = 'round'; ctx.beginPath();
                        stroke.points.forEach((p,i) => { if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
                        ctx.stroke();
                    });
                });
                // Current label
                if (skizze.currentLabel) {
                    skizze.currentLabel.strokes.forEach(stroke => {
                        ctx.strokeStyle = skizze.labelColor; ctx.lineWidth = skizze.labelWidth;
                        ctx.lineCap = 'round'; ctx.beginPath();
                        stroke.points.forEach((p,i) => { if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
                        ctx.stroke();
                    });
                }
            }, [skizze]);

            useEffect(() => { if (grundrissModus === 'skizze') skizzeRedraw(); }, [skizze, grundrissModus]);

            const handleSkizzeStart = (e) => {
                if (!zeichnenAktiv) return; // Zeichnen muss aktiviert sein!
                e.preventDefault();
                // Empfindlichkeits-Filter
                var pressure = e.pressure || 0.5;
                var minPressure = stiftEmpfindlichkeit / 20;
                if (pressure < minPressure) return;
                const pos = skizzeSnap(skizzeGetPos(e));
                setSkizze(prev => ({...prev, currentPath: { points: [pos], color: prev.penColor, width: prev.penWidth }}));
            };
            const handleSkizzeMove = (e) => {
                if (!zeichnenAktiv) return;
                if (!skizze.currentPath) return;
                e.preventDefault();
                const pos = skizzeGetPos(e);
                // Mindest-Bewegungsdistanz
                var lastPt = skizze.currentPath.points[skizze.currentPath.points.length - 1];
                var minDist = 11 - stiftEmpfindlichkeit;
                var dx = pos.x - lastPt.x;
                var dy = pos.y - lastPt.y;
                if (Math.sqrt(dx*dx + dy*dy) < minDist) return;
                setSkizze(prev => ({...prev, currentPath: {...prev.currentPath, points: [...prev.currentPath.points, pos]}}));
            };
            const handleSkizzeEnd = () => {
                if (!zeichnenAktiv) return;
                if (!skizze.currentPath) return;
                const path = {...skizze.currentPath};
                const last = path.points[path.points.length - 1];
                path.points[path.points.length - 1] = skizzeSnap(last);
                setSkizze(prev => ({...prev, paths: [...prev.paths, path], currentPath: null,
                    undoStack: [...prev.undoStack, { type:'path', index: prev.paths.length }]}));
            };

            const handleLabelStart = (e) => {
                e.preventDefault();
                if (skizzeLabelTimeout.current) { clearTimeout(skizzeLabelTimeout.current); skizzeLabelTimeout.current = null; }
                const pos = skizzeGetPos(e);
                if (skizze.currentLabel) {
                    // Continue same label with new stroke
                    setSkizze(prev => {
                        const label = {...prev.currentLabel};
                        label.strokes = [...label.strokes, { points: [pos] }];
                        return {...prev, currentLabel: label};
                    });
                } else {
                    setSkizze(prev => ({...prev, currentLabel: { x: pos.x, y: pos.y, strokes: [{ points: [pos] }] }}));
                }
            };
            const handleLabelMove = (e) => {
                if (!skizze.currentLabel) return;
                e.preventDefault();
                const pos = skizzeGetPos(e);
                setSkizze(prev => {
                    const label = {...prev.currentLabel};
                    const lastStroke = {...label.strokes[label.strokes.length - 1]};
                    lastStroke.points = [...lastStroke.points, pos];
                    label.strokes = [...label.strokes.slice(0, -1), lastStroke];
                    return {...prev, currentLabel: label};
                });
            };
            const handleLabelEnd = () => {
                if (!skizze.currentLabel) return;
                skizzeLabelTimeout.current = setTimeout(() => {
                    setSkizze(prev => ({...prev, labels: [...prev.labels, prev.currentLabel], currentLabel: null,
                        undoStack: [...prev.undoStack, { type:'label', index: prev.labels.length }]}));
                }, 800);
            };

            const handleSkizzeUndo = () => {
                if (skizze.undoStack.length === 0) return;
                const last = skizze.undoStack[skizze.undoStack.length - 1];
                setSkizze(prev => {
                    const newStack = prev.undoStack.slice(0, -1);
                    if (last.type === 'path') return {...prev, paths: prev.paths.slice(0, -1), undoStack: newStack};
                    if (last.type === 'label') return {...prev, labels: prev.labels.slice(0, -1), undoStack: newStack};
                    return {...prev, undoStack: newStack};
                });
            };

            const generateSvgFromKiResult = (result) => {
                const sW = 500, sH = 400, pad = 50;
                const dW = sW - 2*pad, dH = sH - 2*pad;
                const pts = result.waende.map(w => ({
                    x1: pad + (w.startPunkt.x_prozent/100)*dW, y1: pad + (w.startPunkt.y_prozent/100)*dH,
                    x2: pad + (w.endPunkt.x_prozent/100)*dW, y2: pad + (w.endPunkt.y_prozent/100)*dH, id: w.id
                }));
                let svg = '<svg viewBox="0 0 '+sW+' '+sH+'" xmlns="http://www.w3.org/2000/svg">';
                pts.forEach(p => {
                    svg += '<line x1="'+p.x1+'" y1="'+p.y1+'" x2="'+p.x2+'" y2="'+p.y2+'" stroke="#b8c4d4" stroke-width="3" stroke-linecap="round"/>';
                    const mx = (p.x1+p.x2)/2, my = (p.y1+p.y2)/2;
                    const dx = p.x2-p.x1, dy = p.y2-p.y1, len = Math.sqrt(dx*dx+dy*dy)||1;
                    const nx = -dy/len*15, ny = dx/len*15;
                    svg += '<text x="'+(mx+nx)+'" y="'+(my+ny)+'" text-anchor="middle" fill="#e67e22" font-size="14" font-weight="700" font-family="Oswald">'+p.id+'</text>';
                });
                if (result.tueren) result.tueren.forEach(t => {
                    const w = pts.find(p => p.id === t.wandId); if(!w) return;
                    const pos = t.position_prozent/100;
                    const tx = w.x1+(w.x2-w.x1)*pos, ty = w.y1+(w.y2-w.y1)*pos;
                    svg += '<circle cx="'+tx+'" cy="'+ty+'" r="6" fill="none" stroke="#e63535" stroke-width="2"/>';
                });
                if (result.fenster) result.fenster.forEach(f => {
                    const w = pts.find(p => p.id === f.wandId); if(!w) return;
                    const pos = f.position_prozent/100;
                    const fx = w.x1+(w.x2-w.x1)*pos, fy = w.y1+(w.y2-w.y1)*pos;
                    svg += '<line x1="'+(fx-8)+'" y1="'+fy+'" x2="'+(fx+8)+'" y2="'+fy+'" stroke="#3498db" stroke-width="3"/>';
                });
                svg += '</svg>';
                return svg;
            };

            const applySkizzeToState = (result) => {
                const isRect = result.raumForm === 'rechteck' && result.waende.length <= 4;
                if (!isRect) {
                    setWandMasse(result.waende.map(w => ({ id: w.id, l: '' })));
                }
                if (result.tueren && result.tueren.length > 0) {
                    setTueren(prev => [...prev, ...result.tueren.map((t,i) => ({
                        id: Date.now()+100+i, name: 'Tuer '+(i+1)+' (Wand '+t.wandId+')',
                        breite:'', hoehe:'', tiefe:'', expanded:false, hatLaibung:true,
                        sturzGefliest:false, sturzAbgedichtet:false, quelle:'skizze'
                    }))]);
                }
                if (result.fenster && result.fenster.length > 0) {
                    setFenster(prev => [...prev, ...result.fenster.map((f,i) => ({
                        id: Date.now()+200+i, name: 'Fenster '+(i+1)+' (Wand '+f.wandId+')',
                        breite:'', hoehe:'', tiefe:'', leibungWandGefliest:true, fensterbankGefliest:true,
                        sturzGefliest:false, expanded:false, quelle:'skizze'
                    }))]);
                }
            };

            const handleSkizzeVerarbeiten = async () => {
                setSkizze(p => ({...p, mode:'processing'}));
                const canvas = skizzeCanvasRef.current;
                if (!canvas) { setSkizze(p => ({...p, mode:'draw'})); return; }
                const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
                var skizzeApiKey = (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.API_KEY) || localStorage.getItem('gemini_api_key') || '';
                if (!skizzeApiKey) {
                    alert('Gemini API-Key nicht konfiguriert.'); setSkizze(p => ({...p, mode:'draw'})); return;
                }
                const prompt = 'Du bist ein Experte fuer Grundriss-Erkennung aus Handskizzen. AUFGABE: Analysiere diese handgezeichnete Raumskizze auf Millimeterpapier. 1. BEGRADIGE die Linien: Erkenne die gezeichneten Waende als gerade Linien. 2. ERKENNE DIE BESCHRIFTUNG: Waende sind handschriftlich beschriftet in ROT (A,B,C,D bei 4 Waenden oder 1,2,3,4... bei mehr). Waende sind in GRAU gezeichnet. 3. ERKENNE DETAILS: Tueren, Fenster falls gezeichnet. ANTWORTE NUR als JSON: {"waende_erkannt":true,"anzahl_waende":4,"beschriftungstyp":"buchstaben","waende":[{"id":"A","startPunkt":{"x_prozent":0,"y_prozent":0},"endPunkt":{"x_prozent":100,"y_prozent":0},"laenge_relativ":1.0,"richtung":"horizontal"}],"tueren":[{"wandId":"A","position_prozent":50,"breite_relativ":0.3}],"fenster":[{"wandId":"B","position_prozent":40,"breite_relativ":0.4}],"raumForm":"rechteck","hinweise":[]}';
                var skizzeBaseUrl = (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.BASE_URL) || 'https://generativelanguage.googleapis.com/v1beta';

                // Modelle: Pro zuerst, dann Flash als Fallback bei 429
                var modelsToTry = [
                    (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.MODELS && GEMINI_CONFIG.MODELS['pro']) ? GEMINI_CONFIG.MODELS['pro'].id : 'gemini-2.5-pro',
                    (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.MODELS && GEMINI_CONFIG.MODELS['flash']) ? GEMINI_CONFIG.MODELS['flash'].id : 'gemini-2.5-flash'
                ];

                var lastError = null;
                for (var mi = 0; mi < modelsToTry.length; mi++) {
                    var currentModel = modelsToTry[mi];
                    // Bis zu 2 Versuche pro Modell (mit Wartezeit bei 429)
                    for (var attempt = 0; attempt < 2; attempt++) {
                        try {
                            console.log('[TW Skizze] Versuch ' + (attempt+1) + ' mit Modell: ' + currentModel);
                            const res = await fetch(skizzeBaseUrl + '/models/' + currentModel + ':generateContent?key=' + skizzeApiKey, {
                                method:'POST', headers:{'Content-Type':'application/json'},
                                body: JSON.stringify({ contents: [{ parts: [
                                    { inlineData: { mimeType:'image/png', data: imageBase64 } },
                                    { text: prompt }
                                ]}],
                                generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
                                })
                            });

                            if (res.status === 429) {
                                console.warn('[TW Skizze] Rate-Limit (429) bei ' + currentModel);
                                lastError = new Error('Rate-Limit bei ' + currentModel);
                                if (attempt === 0) {
                                    // Erster 429: 3 Sekunden warten und nochmal versuchen
                                    await new Promise(function(r) { setTimeout(r, 3000); });
                                    continue;
                                }
                                // Zweiter 429: zum naechsten Modell wechseln
                                break;
                            }

                            if (!res.ok) throw new Error('API Fehler: ' + res.status);

                            const data = await res.json();
                            const text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '{}';
                            const result = JSON.parse(text.replace(/```json|```/g, '').trim());
                            if (result.waende_erkannt && result.waende && result.waende.length > 0) {
                                const svg = generateSvgFromKiResult(result);
                                setSkizze(p => ({...p, mode:'done', processedSvg: svg,
                                    erkannteWaende: result.waende,
                                    erkannteLabels: result.waende.map(w => ({ text: w.id, zuordnung: 'wand_' + result.waende.indexOf(w) }))
                                }));
                                applySkizzeToState(result);
                                console.log('[TW Skizze] Erfolg mit Modell: ' + currentModel);
                                return; // Erfolg!
                            } else {
                                setSkizze(p => ({...p, mode:'draw'}));
                                alert('Grundriss konnte nicht erkannt werden. Bitte deutlicher zeichnen und Waende beschriften.');
                                return;
                            }
                        } catch(err) {
                            lastError = err;
                            console.warn('[TW Skizze] Fehler bei ' + currentModel + ' Versuch ' + (attempt+1) + ':', err.message);
                        }
                    }
                }
                // Alle Versuche fehlgeschlagen
                console.error('Skizze KI Fehler (alle Modelle):', lastError);
                setSkizze(p => ({...p, mode:'draw'}));
                alert('KI-Verarbeitung fehlgeschlagen: ' + (lastError ? lastError.message : 'Unbekannter Fehler') + '\n\nTipp: Warte 30 Sekunden und versuche es erneut (Gemini Rate-Limit).');
            };

            // SVG Grundriss
            const svgW = 340; const svgH = 280;
            const drawGrundriss = () => {
                if (isMultiWall && wandMasse.length > 0) {
                    const walls = wandMasse.map(w => parseMass(w.l));
                    const n = walls.length;
                    if (n < 3) return null;
                    const cx = svgW / 2; const cy = svgH / 2;
                    const maxR = Math.min(svgW, svgH) * 0.38;
                    const points = [];
                    const angleStep = (2 * Math.PI) / n;
                    for (let i = 0; i < n; i++) {
                        const angle = -Math.PI/2 + i * angleStep;
                        points.push({ x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle) });
                    }
                    const pointStr = points.map(p => `${p.x},${p.y}`).join(' ');
                    return (
                        <React.Fragment>
                            <polygon points={pointStr} fill="rgba(230,126,34,0.06)" stroke="#e67e22" strokeWidth="2.5"/>
                            {points.map((p, i) => {
                                const next = points[(i + 1) % n];
                                const mx = (p.x + next.x) / 2;
                                const my = (p.y + next.y) / 2;
                                const dx = next.x - p.x; const dy = next.y - p.y;
                                const len = Math.sqrt(dx*dx + dy*dy);
                                const nx = -dy / len * 16; const ny = dx / len * 16;
                                return (
                                    <React.Fragment key={i}>
                                        <circle cx={mx + nx} cy={my + ny} r="11" fill="#e67e22" />
                                        <text x={mx + nx} y={my + ny + 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">
                                            {(wandMasse[i] && wandMasse[i].id) || String.fromCharCode(65 + i)}
                                        </text>
                                        {walls[i] > 0 && (
                                            <text x={mx + nx * 2.2} y={my + ny * 2.2 + 4} textAnchor="middle" fill="#b8c4d4" fontSize="10">
                                                {fmtDe(walls[i])}m
                                            </text>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            <text x={cx} y={cy + 5} textAnchor="middle" fill="#b8c4d4" fontSize="13" fontWeight="500">
                                {raumName || (raum && raum.bez) || 'Raum'}
                            </text>
                        </React.Fragment>
                    );
                }
                if (L <= 0 && B <= 0) return null;
                const rW = 240; const rH = B > 0 && L > 0 ? Math.min(Math.max((B/L) * rW, 80), 200) : 150;
                const rX = (svgW - rW) / 2; const rY = (svgH - rH) / 2;
                return (
                    <React.Fragment>
                        <rect x={rX} y={rY} width={rW} height={rH} fill="rgba(230,126,34,0.06)" stroke="#e67e22" strokeWidth="2.5" rx="2"/>
                        {[{x:rX+rW/2,y:rY-8,id:'A'},{x:rX+rW+12,y:rY+rH/2,id:'B'},{x:rX+rW/2,y:rY+rH+16,id:'C'},{x:rX-12,y:rY+rH/2,id:'D'}].map(w => (
                            <React.Fragment key={w.id}>
                                <circle cx={w.x} cy={w.y} r="11" fill="#e67e22"/>
                                <text x={w.x} y={w.y+4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">{w.id}</text>
                            </React.Fragment>
                        ))}
                        {L > 0 && <text x={svgW/2} y={rY+rH+34} textAnchor="middle" fill="#e67e22" fontSize="14" fontWeight="600">{fmtDe(L)} m</text>}
                        {B > 0 && <text x={rX-28} y={rY+rH/2+4} textAnchor="middle" fill="#e67e22" fontSize="14" fontWeight="600"
                            transform={`rotate(-90,${rX-28},${rY+rH/2})`}>{fmtDe(B)} m</text>}
                        {abzuege.map((a, i) => {
                            if (a.typ === 'tuer') {
                                const tx = rX + 20 + i * 40;
                                return <React.Fragment key={a.id}>
                                    <line x1={tx} y1={rY+rH-1} x2={tx+22} y2={rY+rH-1} stroke="#e63535" strokeWidth="3.5"/>
                                    <text x={tx+11} y={rY+rH-6} textAnchor="middle" fill="#e63535" fontSize="10" fontWeight="600">T</text>
                                </React.Fragment>;
                            }
                            if (a.typ === 'fenster') {
                                const fy = rY + 15 + i * 30;
                                return <React.Fragment key={a.id}>
                                    <line x1={rX+rW-1} y1={fy} x2={rX+rW-1} y2={fy+22} stroke="#3498db" strokeWidth="3.5"/>
                                    <text x={rX+rW-10} y={fy+14} textAnchor="middle" fill="#3498db" fontSize="10" fontWeight="600">F</text>
                                </React.Fragment>;
                            }
                            return null;
                        })}
                        <text x={svgW/2} y={rY+rH/2+5} textAnchor="middle" fill="#b8c4d4" fontSize="14" fontWeight="500">
                            {raumName || (raum && raum.bez) || 'Raum'}
                        </text>
                    </React.Fragment>
                );
            };

            return (
                <div className="page-container">
                    <div className="breadcrumb">
                        <span>{kunde.name.split(' – ')[0]}</span>
                        <span>›</span>
                        <span style={{cursor:'pointer', color:'var(--text-light)'}} onClick={() => {
                            if (hasUnsavedChanges) {
                                if (!confirm('Es gibt ungespeicherte Aenderungen.\nWirklich zurueck?')) return;
                            }
                            onBack();
                        }}>Raumerkennung</span>
                        <span>›</span>
                        <span className="breadcrumb-active">Raumblatt {(raum && raum.nr) || ''}</span>
                    </div>

                    {/* Raumbezeichnung */}
                    <div className="raum-header">
                        <span className="raum-nummer">{(raum && raum.nr) || '--'}</span>
                        <MicInput fieldKey="rb_raumName" className="raum-name-input" type="text" placeholder="Raumbezeichnung eingeben..."
                            value={raumName} onChange={e => setRaumName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                            style={{flex:1}}
                            autoFocus={!hasData} />
                        <MicButton fieldKey="rb_raumName" size="small" onResult={function(t){ setRaumName((raumName||'') + (raumName?' ':'') + t); }} />
                    </div>

                    {/* Material-Info */}
                    {(raum && raum.material) && (
                        <div className="raumerkennung-info" style={{background:'rgba(230,126,34,0.06)', borderColor:'rgba(230,126,34,0.2)', color:'var(--accent-orange)', marginBottom:'12px'}}>
                            <span style={{fontSize:'16px'}}>🧱</span>
                            <span>{raum.material}</span>
                        </div>
                    )}

                    {/* ═══ STICKY WRAPPER fuer beide Leisten ═══ */}
                    <div style={{position:'sticky', top:'95px', zIndex:98, background:'var(--bg-primary)', paddingBottom:'4px', borderBottom:'1px solid var(--border-subtle)'}}>

                    {/* ═══ LEISTE 2: ROTE AKTIONS-NAVIGATION (Zurueck, Gesamtliste, Raum fertig, Aufmass beenden) ═══ */}
                    <div className="rb-nav-red" style={{
                        display:'flex', gap:'3px', padding:'4px 0', marginBottom:'2px'
                    }}>
                        {onBack && (
                            <button className="rb-nav-btn rb-nav-red-btn" onClick={onBack}>Zurueck</button>
                        )}
                        {onShowGesamtliste && (
                            <button className="rb-nav-btn rb-nav-red-btn" onClick={function() { onShowGesamtliste(); }}>Gesamtliste</button>
                        )}
                        {onFinishRaum && (
                            <button className="rb-nav-btn rb-nav-red-btn" onClick={function() { handleTabChange(3); }}>Raum fertig</button>
                        )}
                        {onAufmassBeenden && (
                            <button className="rb-nav-btn rb-nav-red-btn" onClick={onAufmassBeenden}>Aufmass beenden</button>
                        )}
                    </div>

                    {/* ═══ LEISTE 3: BLAUE TAB-NAVIGATION (6 Buttons in 1 Reihe) ═══ */}
                    <div className="rb-nav-blue" style={{
                        display:'flex', gap:'3px', padding:'4px 0'
                    }}>
                        {[
                            {id: 0, label: 'Grundriss'},
                            {id: 1, label: 'Fotos - Waende'},
                            {id: 4, label: 'Fotos Objekt'},
                            {id: 2, label: 'Oeffnungen'},
                            {id: 3, label: 'Pos. (' + posCards.filter(function(p) { return calcPositionResult(p) > 0; }).length + '/' + posCards.length + ')'}
                        ].map(function(tab) {
                            return (
                                <button key={tab.id}
                                    className={'rb-nav-btn rb-nav-blue-btn' + (rbTab === tab.id ? ' active' : '')}
                                    onClick={function() { handleTabChange(tab.id); }}>
                                    {tab.label}
                                </button>
                            );
                        })}
                        <button className="rb-nav-btn rb-nav-blue-btn"
                            onClick={function() { setWandAnzahlPopupOpen(true); }}>
                            Waende: {wandAnzahl}
                        </button>
                        <button className={'rb-nav-btn rb-nav-blue-btn' + (masseKopieren ? ' active' : '')}
                            onClick={function() { setMasseKopieren(!masseKopieren); }}>
                            Masse kop. {masseKopieren ? 'JA' : 'NEIN'}
                        </button>
                    </div>
                    </div>{/* Ende Sticky Wrapper */}

                    {/* Save-Status Toast */}
                    {saveStatus !== 'idle' && (
                        <div style={{
                            textAlign:'center', padding:'8px', marginBottom:'6px', borderRadius:'8px', fontSize:'12px', fontWeight:600,
                            background: saveStatus === 'saving' ? 'rgba(77,166,255,0.12)' : saveStatus === 'saved' ? 'rgba(39,174,96,0.12)' : 'rgba(196,30,30,0.12)',
                            color: saveStatus === 'saving' ? 'var(--accent-blue)' : saveStatus === 'saved' ? '#27ae60' : 'var(--accent-red-light)',
                            border: '1px solid ' + (saveStatus === 'saving' ? 'rgba(77,166,255,0.25)' : saveStatus === 'saved' ? 'rgba(39,174,96,0.25)' : 'rgba(196,30,30,0.25)')
                        }}>
                            {saveStatus === 'saving' && 'Speichert auf Google Drive...'}
                            {saveStatus === 'saved' && 'Akte gespeichert!'}
                            {saveStatus === 'error' && 'Fehler beim Speichern!'}
                        </div>
                    )}

                    {/* ═══ POPUP: Bearbeitete Akte oeffnen (Skill Punkt 3) ═══ */}
                    {aktePopupOpen && (
                        <div className="modal-overlay" onClick={function() { setAktePopupOpen(false); setAkteSelectedOrdner(null); }}>
                            <div className="modal-content" onClick={function(e) { e.stopPropagation(); }}
                                style={{maxWidth:'500px', maxHeight:'80vh', overflow:'auto'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
                                    <h3 style={{fontFamily:'Oswald', fontSize:'18px', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:'var(--text-white)', margin:0}}>
                                        Bearbeitete Akten
                                    </h3>
                                    <button style={{background:'none', border:'none', color:'var(--text-muted)', fontSize:'20px', cursor:'pointer'}}
                                        onClick={function() { setAktePopupOpen(false); setAkteSelectedOrdner(null); }}>&#10005;</button>
                                </div>
                                {akteLoading ? (
                                    <div style={{padding:'40px', textAlign:'center', color:'var(--text-muted)'}}>Lade Akten...</div>
                                ) : akteOrdner.length === 0 ? (
                                    <div style={{padding:'40px', textAlign:'center', color:'var(--text-muted)'}}>Keine bearbeiteten Akten gefunden.</div>
                                ) : !akteSelectedOrdner ? (
                                    <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                                        {akteOrdner.map(function(ordner, i) {
                                            return (<button key={i} style={{cursor:'pointer', textAlign:'left', padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'10px'}}
                                                onClick={function() { setAkteSelectedOrdner(ordner); }}>
                                                <div>
                                                    <div style={{fontFamily:'Oswald', fontSize:'16px', fontWeight:600, color:'var(--text-white)'}}>{ordner.name}</div>
                                                    <div style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'4px'}}>{ordner.files.length} Dokument{ordner.files.length !== 1 ? 'e' : ''}</div>
                                                </div>
                                                <span style={{color:'var(--text-muted)', fontSize:'18px'}}>&#8594;</span>
                                            </button>);
                                        })}
                                    </div>
                                ) : (
                                    <div>
                                        <button style={{marginBottom:'12px', padding:'8px 16px', background:'var(--bg-tertiary)', border:'none', borderRadius:'8px', color:'var(--text-light)', cursor:'pointer', fontFamily:'Oswald', fontSize:'13px', fontWeight:600}}
                                            onClick={function() { setAkteSelectedOrdner(null); }}>&#8592; Zurueck</button>
                                        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                                            {akteSelectedOrdner.files.map(function(file, i) {
                                                return (<button key={i} style={{cursor:'pointer', textAlign:'left', padding:'12px', background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'10px'}}
                                                    onClick={function() { handleAkteOeffnen(akteSelectedOrdner, file); }}>
                                                    <div style={{fontFamily:'Oswald', fontSize:'14px', fontWeight:600, color:'var(--text-white)'}}>{file.name}</div>
                                                    <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'4px'}}>Zuletzt: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString('de-DE') : '--'}</div>
                                                </button>);
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══ POPUP: Wandanzahl (Skill Punkt 4.5) ═══ */}
                    {wandAnzahlPopupOpen && (
                        <div className="modal-overlay" onClick={function() { setWandAnzahlPopupOpen(false); }}>
                            <div className="modal-content" onClick={function(e) { e.stopPropagation(); }}
                                style={{maxWidth:'320px', padding:'24px'}}>
                                <h3 style={{fontFamily:'Oswald', fontSize:'18px', fontWeight:700, textTransform:'uppercase', color:'var(--text-white)', marginBottom:'16px', textAlign:'center'}}>
                                    Anzahl der Waende
                                </h3>
                                <div className="masse-input-wrap" style={{marginBottom:'16px'}}>
                                    <input className="masse-input" type="text" inputMode="numeric" value={wandAnzahl}
                                        onChange={function(e) { var v = e.target.value.replace(/[^0-9]/g, ''); setWandAnzahl(v === '' ? '' : parseInt(v) || 4); }}
                                        style={{textAlign:'center', fontSize:'24px', fontWeight:700}} />
                                </div>
                                <div style={{fontSize:'12px', color:'var(--text-muted)', textAlign:'center', marginBottom:'16px'}}>
                                    {wandAnzahl} Waende = {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, Math.min(wandAnzahl, 26)).split('').join(', ')}
                                </div>
                                <button style={{width:'100%', padding:'12px', border:'none', borderRadius:'10px', background:'var(--accent-blue)', color:'white', fontFamily:'Oswald', fontSize:'14px', fontWeight:700, cursor:'pointer'}}
                                    onClick={function() { handleWandAnzahlChange(wandAnzahl); }}>
                                    Uebernehmen
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ POPUP: Stift-Empfindlichkeit (Skill Punkt 5.5) ═══ */}
                    {empfindlichkeitPopupOpen && (
                        <div className="modal-overlay" onClick={function() { setEmpfindlichkeitPopupOpen(false); }}>
                            <div className="modal-content" onClick={function(e) { e.stopPropagation(); }}
                                style={{maxWidth:'320px', padding:'24px'}}>
                                <h3 style={{fontFamily:'Oswald', fontSize:'18px', fontWeight:700, textTransform:'uppercase', color:'var(--text-white)', marginBottom:'16px', textAlign:'center'}}>
                                    Stift-Empfindlichkeit
                                </h3>
                                <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px'}}>
                                    <span style={{color:'var(--text-muted)', fontSize:'12px'}}>Gering</span>
                                    <input type="range" min="1" max="10" value={stiftEmpfindlichkeit}
                                        onChange={function(e) { setStiftEmpfindlichkeit(parseInt(e.target.value)); }}
                                        style={{flex:1, accentColor:'var(--accent-blue)'}} />
                                    <span style={{color:'var(--text-muted)', fontSize:'12px'}}>Hoch</span>
                                </div>
                                <div style={{textAlign:'center', fontFamily:'Oswald', fontSize:'24px', fontWeight:700, color:'var(--accent-blue)', marginBottom:'16px'}}>
                                    {stiftEmpfindlichkeit}
                                </div>
                                <button style={{width:'100%', padding:'12px', border:'none', borderRadius:'10px', background:'var(--accent-blue)', color:'white', fontFamily:'Oswald', fontSize:'14px', fontWeight:700, cursor:'pointer'}}
                                    onClick={function() { setEmpfindlichkeitPopupOpen(false); }}>
                                    Uebernehmen
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ TAB 0: GRUNDRISS & RAUMMASZE ═══ */}
                    {rbTab === 0 && (<React.Fragment>

                    {/* Grundriss */}
                    {/* 3er-Modus-Toggle fuer Grundriss — STICKY */}
                    <div style={{
                        position:'sticky', top:'170px', zIndex:97, background:'var(--bg-primary)', paddingTop:'4px', paddingBottom:'4px'
                    }}>
                    <div style={{
                        display:'flex', gap:'4px',
                        background:'var(--bg-tertiary)', borderRadius:'12px', padding:'4px'
                    }}>
                        <button className={'ja-nein-btn ' + (grundrissModus === 'manual' ? 'active ja' : '')}
                            onClick={() => setGrundrissModus('manual')}
                            style={{flex:1, padding:'8px 6px', fontSize:'11px'}}>
                            Manuell
                        </button>
                        <button className={'ja-nein-btn ' + (grundrissModus === 'skizze' ? 'active ja' : '')}
                            onClick={() => setGrundrissModus('skizze')}
                            style={{flex:1, padding:'8px 6px', fontSize:'11px', background: grundrissModus === 'skizze' ? '#e67e22' : undefined}}>
                            Handskizze
                        </button>
                        <button className={'ja-nein-btn ' + (grundrissModus === 'ki' ? 'active ja' : '')}
                            onClick={() => setGrundrissModus('ki')}
                            style={{flex:1, padding:'8px 6px', fontSize:'11px'}}>
                            KI-Grundriss
                        </button>
                    </div>
                    </div>{/* Ende Sticky Modus-Toggle */}

                    <div className="grundriss-card">
                        {/* === MANUELL: Bestehender SVG-Grundriss === */}
                        {grundrissModus === 'manual' && (
                            <React.Fragment>
                                <div className="grundriss-card-title" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span>📐 Grundriss</span>
                                    {(raum && raum.manuell) && (
                                        <button style={{fontSize:'12px', padding:'4px 10px', background:'rgba(230,126,34,0.1)', border:'1px solid var(--accent-orange)', borderRadius:'4px', color:'var(--accent-orange)', cursor:'pointer'}}
                                            onClick={() => setIsDrawMode(!isDrawMode)}>
                                            {isDrawMode ? 'Fertig' : 'Freihand zeichnen'}
                                        </button>
                                    )}
                                </div>
                                {isDrawMode ? (
                                    <canvas ref={canvasRef} width="340" height="280"
                                        style={{width:'100%', maxWidth:'600px', height:'auto', minHeight:'280px', margin:'0 auto', display:'block', background:'rgba(255,255,255,0.02)', border:'1px solid var(--border-color)', borderRadius:'6px', touchAction:'none', cursor:'crosshair'}} />
                                ) : (
                                    <svg className="grundriss-svg" viewBox={`0 0 ${svgW} ${svgH}`} style={{width:'100%', maxWidth:'600px', minHeight:'260px', margin:'0 auto', display:'block'}}>
                                        {drawGrundriss()}
                                        {!hasData && L <= 0 && (
                                            <text x={svgW/2} y={svgH/2} textAnchor="middle" fill="#7a8a9e" fontSize="13">
                                                Masze eingeben fuer Darstellung
                                            </text>
                                        )}
                                    </svg>
                                )}
                            </React.Fragment>
                        )}

                        {/* === HANDSKIZZE: Millimeterpapier-Canvas === */}
                        {grundrissModus === 'skizze' && (
                            <React.Fragment>
                                <div className="grundriss-card-title">
                                    <span>Handskizze</span>
                                </div>
                                {/* ═══ NEUE HANDSKIZZE TOOLBAR (1 Reihe, BLAU, 6 Buttons proportional) — STICKY ═══ */}
                                <div style={{
                                    display:'flex', gap:'3px', margin:'0 0 8px', padding:'4px',
                                    background:'var(--bg-tertiary)', borderRadius:'10px',
                                    position:'sticky', top:'210px', zIndex:96
                                }}>
                                    <button className={'rb-nav-btn rb-nav-blue-btn' + (zeichnenAktiv ? ' active' : '')}
                                        style={{fontSize:'10px', minHeight:'32px', padding:'5px 4px'}}
                                        onClick={function() {
                                            setZeichnenAktiv(!zeichnenAktiv);
                                            if (!zeichnenAktiv) setSkizze(function(p) { return {...p, mode:'draw'}; });
                                        }}>
                                        {zeichnenAktiv ? 'Zeichn. AUS' : 'Zeichn. EIN'}
                                    </button>
                                    <button className={'rb-nav-btn rb-nav-blue-btn' + (skizze.mode === 'label' ? ' active' : '')}
                                        style={{fontSize:'10px', minHeight:'32px', padding:'5px 4px'}}
                                        onClick={function() {
                                            setZeichnenAktiv(true);
                                            setSkizze(function(p) { return {...p, mode: p.mode === 'label' ? 'draw' : 'label'}; });
                                        }}>
                                        Beschriften
                                    </button>
                                    <div style={{position:'relative', flex:1}}>
                                        <button className="rb-nav-btn rb-nav-blue-btn"
                                            style={{fontSize:'10px', minHeight:'32px', padding:'5px 4px', width:'100%'}}
                                            onClick={function() { setLoeschMenuOpen(!loeschMenuOpen); }}>
                                            Loeschen
                                        </button>
                                        {loeschMenuOpen && (
                                            <div style={{
                                                position:'absolute', top:'100%', left:0, zIndex:200, marginTop:'2px',
                                                background:'var(--bg-card)', border:'1px solid var(--border-color)',
                                                borderRadius:'10px', padding:'6px', minWidth:'180px',
                                                boxShadow:'0 8px 24px rgba(0,0,0,0.4)'
                                            }}>
                                                <button className="rb-nav-btn rb-nav-blue-btn" style={{width:'100%', marginBottom:'4px', fontSize:'11px', minHeight:'34px'}}
                                                    onClick={function() { setLoeschModus('radiergummi'); setLoeschMenuOpen(false); }}>
                                                    Radiergummi
                                                </button>
                                                <button className="rb-nav-btn rb-nav-blue-btn" style={{width:'100%', marginBottom:'4px', fontSize:'11px', minHeight:'34px'}}
                                                    onClick={function() { handleSkizzeUndo(); setLoeschMenuOpen(false); }}>
                                                    Letzte Aktion rueckgaengig
                                                </button>
                                                <button className="rb-nav-btn" style={{width:'100%', fontSize:'11px', minHeight:'34px',
                                                    background:'rgba(196,30,30,0.15)', color:'var(--accent-red-light)'}}
                                                    onClick={function() {
                                                        if (confirm('Gesamte Zeichnung unwiderruflich loeschen?')) {
                                                            setSkizze(function(p) { return {...p, paths:[], labels:[], currentPath:null, currentLabel:null, processedSvg:null, erkannteWaende:[], erkannteLabels:[], undoStack:[]}; });
                                                        }
                                                        setLoeschMenuOpen(false);
                                                    }}>
                                                    Alles loeschen
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <button className="rb-nav-btn rb-nav-blue-btn"
                                        style={{fontSize:'10px', minHeight:'32px', padding:'5px 4px'}}
                                        onClick={function() { setEmpfindlichkeitPopupOpen(true); }}>
                                        Empf. ({stiftEmpfindlichkeit})
                                    </button>
                                    <button className={'rb-nav-btn rb-nav-blue-btn' + (spracheAktiv ? ' active' : '')}
                                        style={{fontSize:'10px', minHeight:'32px', padding:'5px 4px'}}
                                        onClick={function() { spracheAktiv ? stopSpracheingabe() : startSpracheingabe(); }}>
                                        {spracheAktiv ? 'Sprache STOP' : 'Sprache'}
                                    </button>
                                </div>

                                {/* Canvas */}
                                <div style={{width:'100%', aspectRatio:'4/3', borderRadius:'12px',
                                    border:'1px solid var(--border-subtle)', overflow:'hidden', position:'relative', background:'#1a2332'}}>
                                    {skizze.mode !== 'done' ? (
                                        <React.Fragment>
                                            <canvas ref={skizzeCanvasRef} width={600} height={450}
                                                style={{width:'100%', height:'100%', touchAction:'none',
                                                    cursor: skizze.mode === 'label' ? 'text' : 'crosshair'}}
                                                onMouseDown={skizze.mode === 'draw' ? handleSkizzeStart : handleLabelStart}
                                                onMouseMove={skizze.mode === 'draw' ? handleSkizzeMove : handleLabelMove}
                                                onMouseUp={skizze.mode === 'draw' ? handleSkizzeEnd : handleLabelEnd}
                                                onTouchStart={skizze.mode === 'draw' ? handleSkizzeStart : handleLabelStart}
                                                onTouchMove={skizze.mode === 'draw' ? handleSkizzeMove : handleLabelMove}
                                                onTouchEnd={skizze.mode === 'draw' ? handleSkizzeEnd : handleLabelEnd}
                                            />
                                            <div style={{position:'absolute', bottom:'8px', left:'50%', transform:'translateX(-50%)',
                                                fontSize:'11px', color:'var(--text-muted)', background:'rgba(0,0,0,0.5)',
                                                padding:'4px 12px', borderRadius:'8px', pointerEvents:'none'}}>
                                                {skizze.mode === 'draw'
                                                    ? 'Waende zeichnen (grau)'
                                                    : 'Buchstaben/Zahlen an die Waende schreiben (rot)'}
                                            </div>
                                        </React.Fragment>
                                    ) : (
                                        <div dangerouslySetInnerHTML={{__html: skizze.processedSvg}}
                                            style={{width:'100%', height:'100%', padding:'10px'}} />
                                    )}
                                </div>

                                {/* KI-Button */}
                                {skizze.mode !== 'done' && skizze.mode !== 'processing' && (
                                    <button style={{
                                        width:'100%', padding:'12px', marginTop:'8px',
                                        background: (skizze.paths.length > 0 && skizze.labels.length > 0) ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                                        color: (skizze.paths.length > 0 && skizze.labels.length > 0) ? 'white' : 'var(--text-muted)',
                                        border:'none', borderRadius:'12px', fontFamily:'Oswald', fontSize:'14px', fontWeight:700,
                                        cursor: (skizze.paths.length > 0 && skizze.labels.length > 0) ? 'pointer' : 'default'
                                    }} disabled={skizze.paths.length === 0 || skizze.labels.length === 0}
                                        onClick={handleSkizzeVerarbeiten}>
                                        🧠 KI: Begradigen und Erkennen
                                    </button>
                                )}
                                {skizze.mode === 'processing' && (
                                    <div style={{textAlign:'center', padding:'16px', color:'var(--accent-blue)'}}>
                                        KI analysiert Ihre Skizze...
                                    </div>
                                )}
                                {skizze.mode === 'done' && (
                                    <button style={{
                                        width:'100%', padding:'10px', marginTop:'8px',
                                        background:'rgba(230,126,34,0.1)', border:'1px solid rgba(230,126,34,0.3)',
                                        borderRadius:'10px', color:'var(--accent-orange)',
                                        fontFamily:'Oswald', fontSize:'13px', fontWeight:600, cursor:'pointer'
                                    }} onClick={() => setSkizze(p => ({...p, mode:'draw', processedSvg:null}))}>
                                        Skizze nochmal bearbeiten
                                    </button>
                                )}
                                {/* Info-Text */}
                                <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'6px', textAlign:'center'}}>
                                    {skizze.paths.length} {skizze.paths.length === 1 ? 'Wand' : 'Waende'} gezeichnet, {skizze.labels.length} {skizze.labels.length === 1 ? 'Beschriftung' : 'Beschriftungen'}
                                </div>
                            </React.Fragment>
                        )}

                        {/* === KI-GRUNDRISS: Funktionale Implementierung === */}
                        {grundrissModus === 'ki' && (
                            <div style={{padding:'16px'}}>
                                {/* Status: idle */}
                                {kiGrundrissState.status === 'idle' && (
                                    <div style={{textAlign:'center'}}>
                                        <div style={{fontSize:'36px', marginBottom:'8px'}}>{'\uD83E\uDDE0'}</div>
                                        <div style={{fontSize:'14px', fontWeight:700, color:'var(--text-white)', marginBottom:'6px'}}>
                                            KI-Grundrisserkennung
                                        </div>
                                        <div style={{fontSize:'12px', color:'var(--text-muted)', lineHeight:'1.5', marginBottom:'16px'}}>
                                            Gemini Pro durchsucht die Zeichnungen im Kundenordner und erkennt den Raum automatisch.
                                        </div>
                                        <button className="raum-action-btn" onClick={startKiGrundriss}
                                            style={{width:'100%', justifyContent:'center'}}>
                                            <span className="btn-icon">{'\uD83D\uDD0D'}</span>
                                            <span className="btn-text">
                                                KI-Grundriss starten
                                                <span className="btn-sub">Sucht Raum {(raum && raum.nr) || raumName || '?'} in PDF-Zeichnungen</span>
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {/* Status: suche-pdfs oder analyse */}
                                {(kiGrundrissState.status === 'suche-pdfs' || kiGrundrissState.status === 'analyse') && (
                                    <div style={{textAlign:'center'}}>
                                        <div style={{fontSize:'36px', marginBottom:'8px', animation:'pulse 1.5s infinite'}}>{'\uD83E\uDDE0'}</div>
                                        <div style={{fontSize:'14px', fontWeight:600, color:'var(--accent-blue)', marginBottom:'6px'}}>
                                            {kiGrundrissState.statusText}
                                        </div>
                                        <div style={{
                                            height:'6px', background:'var(--bg-tertiary)', borderRadius:'3px',
                                            marginTop:'12px', overflow:'hidden'
                                        }}>
                                            <div style={{
                                                height:'100%', background:'var(--accent-blue)', borderRadius:'3px',
                                                width: kiGrundrissState.progress + '%', transition:'width 0.5s'
                                            }} />
                                        </div>
                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'8px'}}>
                                            {kiGrundrissState.pdfs.length > 0 ? kiGrundrissState.pdfs.length + ' PDFs gefunden' : 'Ordner wird durchsucht...'}
                                        </div>
                                    </div>
                                )}

                                {/* Status: gefunden */}
                                {kiGrundrissState.status === 'gefunden' && kiGrundrissState.kiResult && (
                                    <div>
                                        <div style={{
                                            padding:'12px', background:'rgba(39,174,96,0.08)',
                                            border:'1px solid rgba(39,174,96,0.25)', borderRadius:'12px', marginBottom:'12px'
                                        }}>
                                            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px'}}>
                                                <span style={{fontSize:'20px'}}>{'\u2705'}</span>
                                                <span style={{fontFamily:'Oswald', fontWeight:700, fontSize:'14px', color:'var(--success)'}}>
                                                    {kiGrundrissState.statusText}
                                                </span>
                                            </div>
                                            <div style={{fontSize:'11px', color:'var(--text-muted)'}}>
                                                Quelle: {kiGrundrissState.selectedPdf || 'PDF'}
                                                {kiGrundrissState.kiResult.massstab ? (' | Massstab: ' + kiGrundrissState.kiResult.massstab) : ''}
                                            </div>
                                        </div>

                                        {kiGrundrissState.kiResult.waende && (
                                            <div style={{marginBottom:'10px'}}>
                                                <div style={{fontSize:'11px', fontWeight:600, color:'var(--accent-blue)',
                                                    textTransform:'uppercase', marginBottom:'6px'}}>
                                                    {kiGrundrissState.kiResult.waende.length} Waende erkannt
                                                </div>
                                                {kiGrundrissState.kiResult.waende.map(function(w, wi) {
                                                    return (
                                                        <div key={wi} style={{
                                                            display:'flex', alignItems:'center', gap:'8px',
                                                            padding:'6px 10px', background:'var(--bg-tertiary)',
                                                            borderRadius:'8px', marginBottom:'3px',
                                                            border:'1px solid var(--border-subtle)'
                                                        }}>
                                                            <span style={{
                                                                width:'22px', height:'22px', borderRadius:'50%',
                                                                background:'rgba(230,126,34,0.15)', color:'var(--accent-orange)',
                                                                display:'flex', alignItems:'center', justifyContent:'center',
                                                                fontFamily:'Oswald', fontWeight:700, fontSize:'11px'
                                                            }}>{w.id}</span>
                                                            <span style={{flex:1, fontSize:'12px', color:'var(--text-secondary)'}}>
                                                                Wand {w.id}
                                                            </span>
                                                            <span style={{fontFamily:'Oswald', fontWeight:700, fontSize:'14px', color:'var(--text-primary)'}}>
                                                                {w.laenge_m ? (String(w.laenge_m.toFixed(3)).replace('.', ',')) : '?'} m
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {kiGrundrissState.kiResult.hinweise && kiGrundrissState.kiResult.hinweise.length > 0 && (
                                            <div style={{fontSize:'11px', color:'var(--text-muted)', padding:'8px',
                                                background:'rgba(30,136,229,0.05)', borderRadius:'8px', marginBottom:'10px'}}>
                                                {kiGrundrissState.kiResult.hinweise.map(function(h, hi) {
                                                    return <div key={hi}>{'\u2139\uFE0F'} {h}</div>;
                                                })}
                                            </div>
                                        )}

                                        <div style={{display:'flex', gap:'6px'}}>
                                            <button className="raum-action-btn finish" onClick={function() { setGrundrissModus('manual'); }}
                                                style={{flex:1}}>
                                                <span className="btn-icon">{'\uD83D\uDCD0'}</span>
                                                <span className="btn-text">
                                                    Zum Grundriss
                                                    <span className="btn-sub">Masze pruefen und anpassen</span>
                                                </span>
                                            </button>
                                            <button className="ja-nein-btn" onClick={function() {
                                                setKiGrundrissState({ status:'idle', statusText:'', pdfs:[], selectedPdf:null, kiResult:null, errorMsg:'', progress:0 });
                                            }} style={{padding:'8px 12px', fontSize:'11px'}}>
                                                Neu
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Status: nicht-gefunden */}
                                {kiGrundrissState.status === 'nicht-gefunden' && (
                                    <div style={{textAlign:'center'}}>
                                        <div style={{fontSize:'36px', marginBottom:'8px'}}>{'\u274C'}</div>
                                        <div style={{fontSize:'14px', fontWeight:600, color:'var(--text-white)', marginBottom:'6px'}}>
                                            {kiGrundrissState.statusText}
                                        </div>
                                        <div style={{fontSize:'12px', color:'var(--text-muted)', marginBottom:'16px'}}>
                                            {kiGrundrissState.errorMsg}
                                        </div>
                                        <button className="raum-action-btn" onClick={function() {
                                            setKiGrundrissState({ status:'idle', statusText:'', pdfs:[], selectedPdf:null, kiResult:null, errorMsg:'', progress:0 });
                                        }} style={{width:'100%', justifyContent:'center'}}>
                                            <span className="btn-icon">{'\uD83D\uDD04'}</span>
                                            <span className="btn-text">Erneut versuchen</span>
                                        </button>
                                    </div>
                                )}

                                {/* Status: keine-pdfs */}
                                {kiGrundrissState.status === 'keine-pdfs' && (
                                    <div style={{textAlign:'center'}}>
                                        <div style={{fontSize:'36px', marginBottom:'8px'}}>{'\uD83D\uDCC2'}</div>
                                        <div style={{fontSize:'14px', fontWeight:600, color:'var(--accent-orange)', marginBottom:'6px'}}>
                                            {kiGrundrissState.statusText}
                                        </div>
                                        <div style={{fontSize:'12px', color:'var(--text-muted)', marginBottom:'16px', lineHeight:'1.5'}}>
                                            {kiGrundrissState.errorMsg}
                                        </div>
                                        <button className="raum-action-btn" onClick={function() {
                                            setGrundrissModus('manual');
                                            setKiGrundrissState({ status:'idle', statusText:'', pdfs:[], selectedPdf:null, kiResult:null, errorMsg:'', progress:0 });
                                        }} style={{width:'100%', justifyContent:'center'}}>
                                            <span className="btn-icon">{'\uD83D\uDCD0'}</span>
                                            <span className="btn-text">
                                                Manuell fortfahren
                                                <span className="btn-sub">Masze von Hand eingeben</span>
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {/* Status: fehler (technisch) */}
                                {kiGrundrissState.status === 'fehler' && (
                                    <div style={{textAlign:'center'}}>
                                        <div style={{fontSize:'36px', marginBottom:'8px'}}>{'\u26A0\uFE0F'}</div>
                                        <div style={{fontSize:'14px', fontWeight:600, color:'#e74c3c', marginBottom:'6px'}}>
                                            {kiGrundrissState.statusText}
                                        </div>
                                        <div style={{fontSize:'12px', color:'var(--text-muted)', marginBottom:'16px'}}>
                                            {kiGrundrissState.errorMsg}
                                        </div>
                                        <button className="raum-action-btn" onClick={function() {
                                            setKiGrundrissState({ status:'idle', statusText:'', pdfs:[], selectedPdf:null, kiResult:null, errorMsg:'', progress:0 });
                                        }} style={{width:'100%', justifyContent:'center'}}>
                                            <span className="btn-icon">{'\uD83D\uDD04'}</span>
                                            <span className="btn-text">Erneut versuchen</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Fotos & KI → jetzt auf Tab 2 (Fotos) */}
                    {(fotos.length > 0 || Object.values(aktFotos).some(p => Object.keys(p).length > 0)) && (
                        <div style={{
                            padding:'10px 14px', marginBottom:'10px',
                            background:'rgba(30,136,229,0.06)', border:'1px solid rgba(30,136,229,0.15)',
                            borderRadius:'10px', display:'flex', alignItems:'center', gap:'10px', cursor:'pointer'
                        }} onClick={() => handleTabChange(1)}>
                            <span style={{fontSize:'20px'}}>📸</span>
                            <div style={{flex:1}}>
                                <div style={{fontSize:'12px', fontWeight:600, color:'var(--text-primary)'}}>Fotos & KI-Analyse</div>
                                <div style={{fontSize:'11px', color:'var(--text-muted)'}}>Zum Fotos-Tab wechseln</div>
                            </div>
                            <span style={{color:'var(--accent-blue)', fontSize:'14px'}}>▶</span>
                        </div>
                    )}

                    {/* Hidden file inputs (behalten fuer Rueckwaertskompatibilitaet) */}
                    <input type="file" accept="image/*" capture="environment" ref={fotoAnalyseInputRef}
                        style={{display:'none'}} onChange={e => {
                            var file = e.target.files && e.target.files[0];
                            if (!file || !fotoAnalyse) return;
                            var reader = new FileReader();
                            reader.onload = function(ev) {
                                setFotoAnalyse(prev => ({...prev, photo: ev.target.result, step: prev.mode === 'fertig' ? 'analyse' : 'referenz' }));
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                        }} />
                    <input type="file" accept="image/*" capture="environment" ref={fotoInputRef}
                        style={{display:'none'}} onChange={handleFotoCapture} />

                    {/* ═══ LASER DISTO Bluetooth-Tastatur ═══ */}
                    <div className="laser-bar">
                        <button className={`laser-btn ${laserActive ? 'active' : ''}`}
                            onClick={toggleLaser}>
                            <span className="laser-pulse"></span>
                            <span>{laserActive ? '🔴 Laser aktiv' : '📡 Laser DISTO'}</span>
                        </button>
                        <div className={`laser-status ${laserActive ? 'connected' : 'disconnected'}`}
                            style={{fontSize:'11px', lineHeight:'1.3', whiteSpace:'normal'}}>
                            {laserActive
                                ? '✓ Messen → Wert landet im Feld → springt weiter'
                                : 'DISTO per Bluetooth koppeln, Modus: Text'}
                        </div>
                    </div>

                    {/* Maßeingabe */}
                    <div className="masse-section">
                        <div className="masse-section-title">📏 Raummaße</div>
                        {!isMultiWall ? (
                            <React.Fragment>
                                <div className="masse-grid">
                                    <div className="masse-field">
                                        <span className="masse-label">Raumhöhe</span>
                                        <div className="masse-input-wrap">
                                            <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000"
                                                data-laser-field="raumhoehe" value={masse.raumhoehe} onChange={e => setMasse(p => ({...p, raumhoehe: e.target.value}))}
                                                onBlur={handleBlurFormat(setMasse, 'raumhoehe')}
                                                />
                                            <span className="masse-unit">m</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Fliesenhöhe + Raumhoch + Umlaufend */}
                                <div className="masse-hoehe-row">
                                    <div className="masse-field" style={{flex:1}}>
                                        <span className="masse-label">Fliesenhöhe</span>
                                        <div className="masse-input-wrap">
                                            <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000"
                                                data-laser-field="hoehe" value={fliesenDeckenhoch ? masse.raumhoehe : masse.hoehe}
                                                onChange={e => { if (!fliesenDeckenhoch) setMasse(p => ({...p, hoehe: e.target.value})); }}
                                                onBlur={() => { if (!fliesenDeckenhoch) handleBlurFormat(setMasse, 'hoehe')({ target: { value: masse.hoehe } }); }}
                                                disabled={fliesenDeckenhoch}
                                                style={fliesenDeckenhoch ? {opacity:0.6, background:'rgba(39,174,96,0.05)'} : {}}
                                                />
                                            <span className="masse-unit">m</span>
                                        </div>
                                    </div>
                                    <div className="umlaufend-group">
                                        <span className="umlaufend-label">Raumhoch</span>
                                        <div className="ja-nein-btns">
                                            <button className={`ja-nein-btn ${fliesenDeckenhoch ? 'active ja' : ''}`}
                                                onClick={() => setFliesenDeckenhoch(true)}>Ja</button>
                                            <button className={`ja-nein-btn ${!fliesenDeckenhoch ? 'active nein' : ''}`}
                                                onClick={() => setFliesenDeckenhoch(false)}>Nein</button>
                                        </div>
                                    </div>
                                    <div className="umlaufend-group">
                                        <span className="umlaufend-label">Umlaufend</span>
                                        <div className="ja-nein-btns">
                                            <button className={`ja-nein-btn ${fliesenUmlaufend ? 'active ja' : ''}`}
                                                onClick={() => setFliesenUmlaufend(true)}>Ja</button>
                                            <button className={`ja-nein-btn ${!fliesenUmlaufend ? 'active nein' : ''}`}
                                                onClick={() => setFliesenUmlaufend(false)}>Nein</button>
                                        </div>
                                    </div>
                                </div>
                                {fliesenDeckenhoch && (
                                    <div className="umlaufend-hint" style={{background:'rgba(39,174,96,0.06)', borderColor:'rgba(39,174,96,0.2)', color:'var(--success)'}}>
                                        ✓ Raumhoch – Fliesenhöhe = Raumhöhe ({masse.raumhoehe || '--'} m)
                                    </div>
                                )}
                                {!fliesenUmlaufend && (
                                    <div className="umlaufend-hint">
                                        ⚠ Nicht umlaufend → manuellen Rechenweg in der Position verwenden
                                    </div>
                                )}

                                {/* Abdichtungshoehe + Raumhoch + Umlaufend (IMMER sichtbar!) */}
                                {(true) && (
                                    <div className="masse-hoehe-row">
                                        <div className="masse-field" style={{flex:1}}>
                                            <span className="masse-label">Abdichtungshöhe</span>
                                            <div className="masse-input-wrap">
                                                <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000"
                                                    data-laser-field="abdichtungshoehe" value={abdichtungDeckenhoch ? masse.raumhoehe : masse.abdichtungshoehe}
                                                    onChange={e => { if (!abdichtungDeckenhoch) setMasse(p => ({...p, abdichtungshoehe: e.target.value})); }}
                                                    onBlur={() => { if (!abdichtungDeckenhoch) handleBlurFormat(setMasse, 'abdichtungshoehe')({ target: { value: masse.abdichtungshoehe } }); }}
                                                    disabled={abdichtungDeckenhoch}
                                                    style={abdichtungDeckenhoch ? {opacity:0.6, background:'rgba(39,174,96,0.05)'} : {}}
                                                    />
                                                <span className="masse-unit">m</span>
                                            </div>
                                        </div>
                                        <div className="umlaufend-group">
                                            <span className="umlaufend-label">Raumhoch</span>
                                            <div className="ja-nein-btns">
                                                <button className={`ja-nein-btn ${abdichtungDeckenhoch ? 'active ja' : ''}`}
                                                    onClick={() => setAbdichtungDeckenhoch(true)}>Ja</button>
                                                <button className={`ja-nein-btn ${!abdichtungDeckenhoch ? 'active nein' : ''}`}
                                                    onClick={() => setAbdichtungDeckenhoch(false)}>Nein</button>
                                            </div>
                                        </div>
                                        <div className="umlaufend-group">
                                            <span className="umlaufend-label">Umlaufend</span>
                                            <div className="ja-nein-btns">
                                                <button className={`ja-nein-btn ${abdichtungUmlaufend ? 'active ja' : ''}`}
                                                    onClick={() => setAbdichtungUmlaufend(true)}>Ja</button>
                                                <button className={`ja-nein-btn ${!abdichtungUmlaufend ? 'active nein' : ''}`}
                                                    onClick={() => setAbdichtungUmlaufend(false)}>Nein</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {hatWandabdichtung && abdichtungDeckenhoch && (
                                    <div className="umlaufend-hint" style={{background:'rgba(39,174,96,0.06)', borderColor:'rgba(39,174,96,0.2)', color:'var(--success)'}}>
                                        ✓ Raumhoch – Abdichtungshöhe = Raumhöhe ({masse.raumhoehe || '--'} m)
                                    </div>
                                )}
                                {hatWandabdichtung && !abdichtungUmlaufend && (
                                    <div className="umlaufend-hint">
                                        ⚠ Nicht umlaufend → manuellen Rechenweg in der Abdichtungs-Position verwenden
                                    </div>
                                )}

                                {/* Sockelhöhe */}
                                {posCards.some(p => p.kategorie === 'sockel' || p.kategorie === 'silikon') && (
                                    <div className="masse-hoehe-row" style={{marginTop:'10px'}}>
                                        <div className="masse-field" style={{flex:1}}>
                                            <span className="masse-label">Sockelhöhe</span>
                                            <div className="masse-input-wrap">
                                                <input className="masse-input" type="text" inputMode="decimal" placeholder="z.B. 0,100"
                                                    data-laser-field="sockelhoehe" value={masse.sockelhoehe}
                                                    onChange={e => setMasse(p => ({...p, sockelhoehe: e.target.value}))}
                                                    onBlur={handleBlurFormat(setMasse, 'sockelhoehe')}
                                                    />
                                                <span className="masse-unit">m</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Bodenfläche + Türlaibung */}
                                {tueren.some(t => t.hatLaibung && parseMass(t.tiefe) > 0) && (
                                    <div style={{marginTop:'10px'}}>
                                        <button className={`bodengleich-btn ${bodenPlusTuerlaibung ? 'active' : ''}`}
                                            onClick={() => setBodenPlusTuerlaibung(!bodenPlusTuerlaibung)}
                                            style={{fontSize:'12px', padding:'8px 14px'}}>
                                            {bodenPlusTuerlaibung ? '✓ ' : ''}Bodenfläche + Türlaibung
                                            {bodenPlusTuerlaibung && tuerBodenLaibung > 0 && (
                                                <span style={{marginLeft:'8px', fontFamily:'Oswald', fontWeight:600}}>(+{fmtDe(tuerBodenLaibung)} m²)</span>
                                            )}
                                        </button>
                                    </div>
                                )}
                                {/* Bodenfläche manuell überschreiben (optional bei Rechteckraum) */}
                                {posCards.some(p => ['boden','estrich','entkopplung','decke'].includes(p.kategorie) || (p.tags || []).includes('boden')) && (
                                    <div style={{marginTop:'8px'}}>
                                        <div className="masse-field" style={{flex:1}}>
                                            <span className="masse-label" style={{fontSize:'10px', color:'var(--text-muted)'}}>
                                                Bodenfläche überschreiben (optional)
                                            </span>
                                            <div className="masse-input-wrap">
                                                <input className="masse-input" type="text" inputMode="decimal"
                                                    placeholder={`Auto: ${fmtDe(bodenAuto)} m²`}
                                                    value={masse.bodenManual}
                                                    onChange={e => setMasse(p => ({...p, bodenManual: e.target.value}))}
                                                    onBlur={handleBlurFormat(setMasse, 'bodenManual')}
                                                    style={masse.bodenManual ? {borderColor:'var(--accent-orange)', background:'rgba(230,126,34,0.04)'} : {}}
                                                    />
                                                <span className="masse-unit">m²</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        ) : (
                            <React.Fragment>
                                <div style={{marginBottom:'10px', fontSize:'12px', color:'var(--text-muted)'}}>
                                    Raum mit {wandMasse.length} Ecken – jede Wand einzeln:
                                </div>
                                {wandMasse.map((w, idx) => (
                                    <div key={idx} style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px'}}>
                                        <span style={{fontFamily:'Oswald', fontWeight:700, color:'var(--accent-orange)', width:'28px', height:'28px', background:'rgba(230,126,34,0.12)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', flexShrink:0}}>
                                            {w.id}
                                        </span>
                                        <div className="masse-input-wrap" style={{flex:1}}>
                                            <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000"
                                                value={w.l} onChange={e => updateWand(idx, e.target.value)}
                                                onBlur={() => {
                                                    setWandMasse(prev => prev.map((ww, i) => {
                                                        if (i !== idx) return ww;
                                                        if (ww.l && !isNaN(parseMass(ww.l))) return {...ww, l: formatMass(ww.l)};
                                                        return ww;
                                                    }));
                                                }}
                                                autoFocus={idx === lastAddedWandIdx}
                                                onFocus={() => { if (idx === lastAddedWandIdx) setLastAddedWandIdx(null); }}
                                                />
                                            <span className="masse-unit">m</span>
                                        </div>
                                        <button className="contact-remove-btn" onClick={() => removeWand(idx)} style={{marginTop:0}}>✕</button>
                                        <button onClick={() => setFotoAnalyse({ wandIdx: idx, mode: null, step: 'modus', tileParams: { tileWidth: '', tileHeight: '', groutWidth: '3', pattern: 'kreuzfuge' }, photo: null, result: null, refPoints: { p1: null, p2: null }, refMass: '', measurePoints: { p1: null, p2: null }, kiModel: localStorage.getItem('gemini_model_pref') || 'pro' })}
                                            style={{width:'26px', height:'26px', borderRadius:'50%', border:'none', background:'rgba(30,136,229,0.12)', color:'var(--accent-blue)', fontSize:'13px', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center'}}
                                            title="Fotoanalyse">📷</button>
                                    </div>
                                ))}
                                <button className="add-abzug-btn" onClick={addWand} style={{marginBottom:'10px'}}>＋ Wand hinzufügen</button>
                                <div className="masse-grid">
                                    <div className="masse-field">
                                        <span className="masse-label">Raumhöhe</span>
                                        <div className="masse-input-wrap">
                                            <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000"
                                                data-laser-field="raumhoehe" value={masse.raumhoehe} onChange={e => setMasse(p => ({...p, raumhoehe: e.target.value}))}
                                                onBlur={handleBlurFormat(setMasse, 'raumhoehe')}
                                                />
                                            <span className="masse-unit">m</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Fliesenhöhe + Raumhoch + Umlaufend */}
                                <div className="masse-hoehe-row">
                                    <div className="masse-field" style={{flex:1}}>
                                        <span className="masse-label">Fliesenhöhe</span>
                                        <div className="masse-input-wrap">
                                            <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000"
                                                data-laser-field="hoehe" value={fliesenDeckenhoch ? masse.raumhoehe : masse.hoehe}
                                                onChange={e => { if (!fliesenDeckenhoch) setMasse(p => ({...p, hoehe: e.target.value})); }}
                                                onBlur={() => { if (!fliesenDeckenhoch) handleBlurFormat(setMasse, 'hoehe')({ target: { value: masse.hoehe } }); }}
                                                disabled={fliesenDeckenhoch}
                                                style={fliesenDeckenhoch ? {opacity:0.6, background:'rgba(39,174,96,0.05)'} : {}}
                                                />
                                            <span className="masse-unit">m</span>
                                        </div>
                                    </div>
                                    <div className="umlaufend-group">
                                        <span className="umlaufend-label">Raumhoch</span>
                                        <div className="ja-nein-btns">
                                            <button className={`ja-nein-btn ${fliesenDeckenhoch ? 'active ja' : ''}`}
                                                onClick={() => setFliesenDeckenhoch(true)}>Ja</button>
                                            <button className={`ja-nein-btn ${!fliesenDeckenhoch ? 'active nein' : ''}`}
                                                onClick={() => setFliesenDeckenhoch(false)}>Nein</button>
                                        </div>
                                    </div>
                                    <div className="umlaufend-group">
                                        <span className="umlaufend-label">Umlaufend</span>
                                        <div className="ja-nein-btns">
                                            <button className={`ja-nein-btn ${fliesenUmlaufend ? 'active ja' : ''}`}
                                                onClick={() => setFliesenUmlaufend(true)}>Ja</button>
                                            <button className={`ja-nein-btn ${!fliesenUmlaufend ? 'active nein' : ''}`}
                                                onClick={() => setFliesenUmlaufend(false)}>Nein</button>
                                        </div>
                                    </div>
                                </div>
                                {fliesenDeckenhoch && (
                                    <div className="umlaufend-hint" style={{background:'rgba(39,174,96,0.06)', borderColor:'rgba(39,174,96,0.2)', color:'var(--success)'}}>
                                        ✓ Raumhoch – Fliesenhöhe = Raumhöhe ({masse.raumhoehe || '--'} m)
                                    </div>
                                )}
                                {!fliesenUmlaufend && (
                                    <div className="umlaufend-hint">⚠ Nicht umlaufend → manuellen Rechenweg verwenden</div>
                                )}
                                {hatWandabdichtung && (
                                    <div className="masse-hoehe-row">
                                        <div className="masse-field" style={{flex:1}}>
                                            <span className="masse-label">Abdichtungshöhe</span>
                                            <div className="masse-input-wrap">
                                                <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000"
                                                    data-laser-field="abdichtungshoehe" value={abdichtungDeckenhoch ? masse.raumhoehe : masse.abdichtungshoehe}
                                                    onChange={e => { if (!abdichtungDeckenhoch) setMasse(p => ({...p, abdichtungshoehe: e.target.value})); }}
                                                    onBlur={() => { if (!abdichtungDeckenhoch) handleBlurFormat(setMasse, 'abdichtungshoehe')({ target: { value: masse.abdichtungshoehe } }); }}
                                                    disabled={abdichtungDeckenhoch}
                                                    style={abdichtungDeckenhoch ? {opacity:0.6, background:'rgba(39,174,96,0.05)'} : {}}
                                                    />
                                                <span className="masse-unit">m</span>
                                            </div>
                                        </div>
                                        <div className="umlaufend-group">
                                            <span className="umlaufend-label">Raumhoch</span>
                                            <div className="ja-nein-btns">
                                                <button className={`ja-nein-btn ${abdichtungDeckenhoch ? 'active ja' : ''}`}
                                                    onClick={() => setAbdichtungDeckenhoch(true)}>Ja</button>
                                                <button className={`ja-nein-btn ${!abdichtungDeckenhoch ? 'active nein' : ''}`}
                                                    onClick={() => setAbdichtungDeckenhoch(false)}>Nein</button>
                                            </div>
                                        </div>
                                        <div className="umlaufend-group">
                                            <span className="umlaufend-label">Umlaufend</span>
                                            <div className="ja-nein-btns">
                                                <button className={`ja-nein-btn ${abdichtungUmlaufend ? 'active ja' : ''}`}
                                                    onClick={() => setAbdichtungUmlaufend(true)}>Ja</button>
                                                <button className={`ja-nein-btn ${!abdichtungUmlaufend ? 'active nein' : ''}`}
                                                    onClick={() => setAbdichtungUmlaufend(false)}>Nein</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {hatWandabdichtung && abdichtungDeckenhoch && (
                                    <div className="umlaufend-hint" style={{background:'rgba(39,174,96,0.06)', borderColor:'rgba(39,174,96,0.2)', color:'var(--success)'}}>
                                        ✓ Raumhoch – Abdichtungshöhe = Raumhöhe ({masse.raumhoehe || '--'} m)
                                    </div>
                                )}
                                {hatWandabdichtung && !abdichtungUmlaufend && (
                                    <div className="umlaufend-hint">⚠ Nicht umlaufend → manuellen Rechenweg verwenden</div>
                                )}
                                {/* Sockelhöhe (Multi-Wand) */}
                                {posCards.some(p => p.kategorie === 'sockel' || p.kategorie === 'silikon') && (
                                    <div className="masse-hoehe-row" style={{marginTop:'10px'}}>
                                        <div className="masse-field" style={{flex:1}}>
                                            <span className="masse-label">Sockelhöhe</span>
                                            <div className="masse-input-wrap">
                                                <input className="masse-input" type="text" inputMode="decimal" placeholder="z.B. 0,100"
                                                    data-laser-field="sockelhoehe" value={masse.sockelhoehe}
                                                    onChange={e => setMasse(p => ({...p, sockelhoehe: e.target.value}))}
                                                    onBlur={handleBlurFormat(setMasse, 'sockelhoehe')}
                                                    />
                                                <span className="masse-unit">m</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* Bodenfläche manuell (Multi-Wand - PFLICHT!) */}
                                {posCards.some(p => ['boden','abdichtung','estrich','entkopplung','decke','verfugung'].includes(p.kategorie) || (p.tags || []).includes('boden')) && (
                                    <div className="masse-hoehe-row" style={{marginTop:'10px'}}>
                                        <div className="masse-field" style={{flex:1}}>
                                            <span className="masse-label" style={{color: !masse.bodenManual ? 'var(--accent-red-light)' : 'var(--success)', fontWeight:700}}>
                                                📐 Bodenfläche {!masse.bodenManual && '(PFLICHT!)'}
                                            </span>
                                            <div className="masse-input-wrap">
                                                <input className="masse-input" type="text" inputMode="decimal"
                                                    placeholder="Fläche aus Teilflächen berechnen"
                                                    value={masse.bodenManual}
                                                    onChange={e => setMasse(p => ({...p, bodenManual: e.target.value}))}
                                                    onBlur={handleBlurFormat(setMasse, 'bodenManual')}
                                                    style={!masse.bodenManual ? {borderColor:'var(--accent-red-light)', background:'rgba(231,76,60,0.04)'} : {borderColor:'var(--success)', background:'rgba(39,174,96,0.04)'}}
                                                    />
                                                <span className="masse-unit">m²</span>
                                            </div>
                                            <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'3px'}}>
                                                Mehreckraum: Summe der Teilflächen eingeben (z.B. Rechteck 1 + Rechteck 2)
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        )}
                    </div>

                    {/* ═══ DYNAMISCHE WAND-EINGABEFELDER (basierend auf wandAnzahl) ═══ */}
                    <div className="masse-section" style={{marginTop:'8px'}}>
                        <div className="masse-section-title">Wandmasse ({wandAnzahl} Waende)</div>
                        <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                            {wandMasse.slice(0, wandAnzahl).map(function(wand, idx) {
                                return (
                                    <div key={wand.id || idx} style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                        <span style={{
                                            fontFamily:'Oswald', fontWeight:700, fontSize:'14px',
                                            color:'var(--accent-blue)', minWidth:'55px'
                                        }}>
                                            Wand {wand.id || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[idx]}
                                        </span>
                                        <div className="masse-input-wrap" style={{flex:1}}>
                                            <input className="masse-input" type="text" inputMode="decimal"
                                                placeholder="Laenge in m"
                                                data-laser-field={'wand_' + idx}
                                                value={wand.l || ''}
                                                onChange={function(e) { handleWandMassChangeNew(idx, e.target.value); }}
                                                onBlur={function() {
                                                    setWandMasse(function(prev) {
                                                        return prev.map(function(ww, i) {
                                                            if (i !== idx) return ww;
                                                            if (ww.l && !isNaN(parseMass(ww.l))) return {...ww, l: formatMass(ww.l)};
                                                            return ww;
                                                        });
                                                    });
                                                }}
                                            />
                                            <span className="masse-unit">m</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {masseKopieren && (
                            <div style={{fontSize:'10px', color:'var(--accent-blue)', marginTop:'6px', fontStyle:'italic'}}>
                                Masse kopieren aktiv: A &#8594; C, B &#8594; D
                            </div>
                        )}
                    </div>

                    </React.Fragment>)}
                    {/* ═══ TAB 1: FOTOS & KI-ERKENNUNG ═══ */}
                    {rbTab === 1 && (
                        <div>
                            {/* Hidden file input fuer Phasen-Fotos */}
                            <input type="file" accept="image/*" capture="environment"
                                ref={fotoInputRef2} style={{display:'none'}}
                                onChange={handlePhotoFileChange} />

                            <div className="foto-phasen-container">
                                {FOTO_PHASEN.map(phase => {
                                    const wallIds = getWallIds();
                                    const photoCount = countPhasePhotos(phase.key);
                                    const isExpanded = aktExpanded[phase.key];
                                    return (
                                        <div key={phase.key} className="foto-phase">
                                            <div className="foto-phase-header"
                                                onClick={() => setAktExpanded(prev => ({...prev, [phase.key]: !prev[phase.key]}))}>
                                                <div style={{display:'flex', alignItems:'center', gap:'8px', flex:1}}>
                                                    <span className="phase-nummer" style={{
                                                        background: phase.color.replace(')', ',0.15)').replace('var(', 'rgba(').replace('--accent-orange', '230,126,34').replace('--accent-blue', '30,136,229').replace('--success', '39,174,96'),
                                                        color: phase.color === 'var(--accent-orange)' ? '#e67e22' : phase.color === 'var(--accent-blue)' ? '#1e88e5' : '#27ae60',
                                                        width:'26px', height:'26px', borderRadius:'50%',
                                                        display:'flex', alignItems:'center', justifyContent:'center',
                                                        fontFamily:'Oswald', fontWeight:700, fontSize:'13px'
                                                    }}>{phase.nr}</span>
                                                    <div>
                                                        <div className="foto-phase-title" style={{
                                                            fontFamily:'Oswald', fontWeight:600, fontSize:'13px',
                                                            textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-primary)'
                                                        }}>{phase.label}</div>
                                                        <div style={{fontSize:'11px', color:'var(--text-muted)'}}>{phase.subtitle}</div>
                                                    </div>
                                                </div>
                                                <span style={{
                                                    fontSize:'11px', padding:'2px 8px', borderRadius:'10px',
                                                    background: photoCount > 0 ? 'rgba(39,174,96,0.12)' : 'rgba(255,255,255,0.06)',
                                                    color: photoCount > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight:600
                                                }}>{photoCount}/{wallIds.length}</span>
                                                {/* Bearbeiten + Farben Buttons */}
                                                {photoCount > 0 && (
                                                    <React.Fragment>
                                                        <button onClick={(e) => {
                                                            e.stopPropagation();
                                                            var markedInPhase = Object.entries(aktFotos[phase.key] || {}).find(function(entry) { return entry[1] && entry[1].marked; });
                                                            if (markedInPhase) { openFullscreenEdit(phase.key, markedInPhase[0]); }
                                                            else {
                                                                var firstPhoto = Object.entries(aktFotos[phase.key] || {}).find(function(entry) { return entry[1] && entry[1].image; });
                                                                if (firstPhoto) openFullscreenEdit(phase.key, firstPhoto[0]);
                                                            }
                                                        }} style={{
                                                            padding:'6px 14px', borderRadius:'8px', border:'none', cursor:'pointer',
                                                            background:'rgba(231,76,60,0.15)', color:'#e74c3c',
                                                            fontSize:'12px', fontWeight:700, fontFamily:'Oswald',
                                                            textTransform:'uppercase', letterSpacing:'0.3px',
                                                            minHeight:'32px'
                                                        }}>Bearbeiten</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setFarbPopupOpen(phase.key); }} style={{
                                                            padding:'6px 14px', borderRadius:'8px', border:'none', cursor:'pointer',
                                                            background:'rgba(231,76,60,0.15)', color:'#e74c3c',
                                                            fontSize:'12px', fontWeight:700, fontFamily:'Oswald',
                                                            textTransform:'uppercase', letterSpacing:'0.3px',
                                                            minHeight:'32px'
                                                        }}>{'\uD83C\uDFA8'} Farben</button>
                                                    </React.Fragment>
                                                )}
                                                <span style={{fontSize:'20px', marginLeft:'8px', transition:'transform 0.2s',
                                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)'}}>
                                                    {isExpanded ? '\u25B2' : '\u25BC'}
                                                </span>
                                            </div>
                                            {isExpanded && (
                                                <div style={{padding:'10px'}}>
                                                    <div className="foto-phase-grid" style={{
                                                        display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(80px, 1fr))', gap:'8px'
                                                    }}>
                                                        {wallIds.map(wandId => {
                                                            const foto = aktFotos[phase.key] && aktFotos[phase.key][wandId];
                                                            return (
                                                                <div key={wandId} className={'foto-wand-slot' + (foto ? ' has-photo' : '') + (foto && foto.marked ? ' marked' : '')}
                                                                    style={{
                                                                        position:'relative', aspectRatio:'3/4', borderRadius:'10px',
                                                                        border: foto && foto.marked ? '2px solid var(--accent-blue)' : foto ? '2px solid var(--border-subtle)' : '2px dashed var(--border-subtle)',
                                                                        overflow:'hidden', display:'flex', flexDirection:'column',
                                                                        alignItems:'center', justifyContent:'center',
                                                                        background:'var(--bg-tertiary)', cursor:'pointer',
                                                                        boxShadow: foto && foto.marked ? '0 0 0 2px rgba(30,136,229,0.25)' : 'none'
                                                                    }}
                                                                    onClick={() => { if (!foto) handlePhotoCapture(phase.key, wandId); }}>
                                                                    {/* Wand-Label */}
                                                                    <span style={{
                                                                        position:'absolute', top:'4px', left:'4px', width:'22px', height:'22px',
                                                                        borderRadius:'50%', background:'rgba(230,126,34,0.9)', color:'white',
                                                                        fontFamily:'Oswald', fontSize:'11px', fontWeight:700,
                                                                        display:'flex', alignItems:'center', justifyContent:'center', zIndex:2
                                                                    }}>{wandId}</span>

                                                                    {foto ? (
                                                                        <React.Fragment>
                                                                            <img src={foto.croppedImage || foto.image}
                                                                                onClick={function() { setFullscreenImg({image: foto.croppedImage || foto.image, label: 'Wand ' + wandId + ' - ' + phase.label}); }}
                                                                                style={{width:'100%', height:'100%', objectFit:'cover', cursor:'pointer'}} />
                                                                            {/* Mark-Button */}
                                                                            <button onClick={(e) => { e.stopPropagation(); togglePhotoMark(phase.key, wandId); }}
                                                                                style={{
                                                                                    position:'absolute', top:'4px', right:'4px', width:'24px', height:'24px',
                                                                                    borderRadius:'6px', border:'none', cursor:'pointer', zIndex:2,
                                                                                    background: foto.marked ? 'var(--accent-blue)' : 'rgba(0,0,0,0.5)',
                                                                                    color:'white', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center'
                                                                                }}>
                                                                                {foto.marked ? '\u2713' : '\u25CB'}
                                                                            </button>
                                                                            {/* KI-Badge */}
                                                                            {foto.aiAnalysis && (
                                                                                <span style={{
                                                                                    position:'absolute', bottom:'4px', right:'4px', fontSize:'10px',
                                                                                    padding:'2px 5px', borderRadius:'4px',
                                                                                    background:'rgba(39,174,96,0.9)', color:'white', fontWeight:600
                                                                                }}>KI</span>
                                                                            )}
                                                                            {/* Crop-Badge */}
                                                                            {foto.croppedImage && (
                                                                                <span style={{
                                                                                    position:'absolute', bottom: foto.aiAnalysis ? '18px' : '4px', right:'4px', fontSize:'9px',
                                                                                    padding:'2px 5px', borderRadius:'4px',
                                                                                    background:'rgba(30,136,229,0.9)', color:'white', fontWeight:600
                                                                                }}>CROP</span>
                                                                            )}
                                                                            {/* Actions */}
                                                                            <div style={{
                                                                                position:'absolute', bottom:0, left:0, right:0, display:'flex',
                                                                                background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)'
                                                                            }}>
                                                                                <button onClick={(e) => { e.stopPropagation(); openCropModal(phase.key, wandId); }}
                                                                                    style={{flex:1, padding:'5px', border:'none', background:'transparent', color:'#3498db', fontSize:'12px', cursor:'pointer'}}>
                                                                                    Crop
                                                                                </button>
                                                                                <button onClick={(e) => { e.stopPropagation(); handlePhotoCapture(phase.key, wandId); }}
                                                                                    style={{flex:1, padding:'5px', border:'none', background:'transparent', color:'white', fontSize:'12px', cursor:'pointer'}}>
                                                                                    Neu
                                                                                </button>
                                                                                <button onClick={(e) => { e.stopPropagation(); handlePhotoDelete(phase.key, wandId); }}
                                                                                    style={{flex:1, padding:'5px', border:'none', background:'transparent', color:'#e74c3c', fontSize:'12px', cursor:'pointer'}}>
                                                                                    X
                                                                                </button>
                                                                            </div>
                                                                            {/* Zeit */}
                                                                            {foto.zeit && (
                                                                                <span style={{
                                                                                    position:'absolute', bottom:'22px', left:'4px', fontSize:'9px',
                                                                                    padding:'1px 4px', borderRadius:'3px',
                                                                                    background:'rgba(0,0,0,0.5)', color:'rgba(255,255,255,0.7)'
                                                                                }}>{foto.zeit}</span>
                                                                            )}
                                                                        </React.Fragment>
                                                                    ) : (
                                                                        <div style={{textAlign:'center', color:'var(--text-muted)'}}>
                                                                            <div style={{fontSize:'24px', marginBottom:'4px'}}>📷</div>
                                                                            <div style={{fontSize:'10px'}}>Foto</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ═══ ANALYSE-BEREICH ═══ */}
                            <div style={{marginTop:'14px'}}>
                                {/* Markierungs-Steuerung */}
                                <div style={{display:'flex', gap:'6px', marginBottom:'10px'}}>
                                    <button className="ja-nein-btn" onClick={() => markAllPhotos(true)}
                                        style={{flex:1, padding:'6px', fontSize:'11px'}}>
                                        Alle markieren
                                    </button>
                                    <button className="ja-nein-btn" onClick={() => markAllPhotos(false)}
                                        style={{flex:1, padding:'6px', fontSize:'11px'}}>
                                        Alle abwaehlen
                                    </button>
                                </div>

                                {/* Analyse-Buttons */}
                                <div style={{display:'flex', gap:'8px', marginBottom:'12px'}}>
                                    <button className="raum-action-btn" disabled={analyseRunning || getMarkedFotos().length === 0}
                                        onClick={() => runKiAnalyse('klein')}
                                        style={{flex:1, opacity: (analyseRunning || getMarkedFotos().length === 0) ? 0.5 : 1}}>
                                        <span className="btn-icon">🔍</span>
                                        <span className="btn-text">
                                            Kleine Analyse
                                            <span className="btn-sub">Zaehlungen (Loecher, Ecken, Anschluesse)</span>
                                        </span>
                                    </button>
                                    <button className="raum-action-btn" disabled={analyseRunning || getMarkedFotos().length === 0}
                                        onClick={() => runKiAnalyse('gross')}
                                        style={{flex:1, opacity: (analyseRunning || getMarkedFotos().length === 0) ? 0.5 : 1}}>
                                        <span className="btn-icon">🧠</span>
                                        <span className="btn-text">
                                            Grosse Analyse
                                            <span className="btn-sub">+ Flaechenberechnung</span>
                                        </span>
                                    </button>
                                </div>

                                {/* Fortschrittsanzeige */}
                                {analyseRunning && (
                                    <div style={{
                                        padding:'12px', background:'rgba(30,136,229,0.06)',
                                        border:'1px solid rgba(30,136,229,0.2)', borderRadius:'10px',
                                        marginBottom:'12px', textAlign:'center'
                                    }}>
                                        <div style={{fontSize:'13px', color:'var(--accent-blue)', fontWeight:600, marginBottom:'6px'}}>
                                            KI analysiert Wand {analyseProgress.wandId}...
                                        </div>
                                        <div style={{fontSize:'12px', color:'var(--text-muted)'}}>
                                            {analyseProgress.current} von {analyseProgress.total} Fotos
                                        </div>
                                        <div style={{
                                            height:'4px', background:'var(--bg-tertiary)', borderRadius:'2px', marginTop:'8px', overflow:'hidden'
                                        }}>
                                            <div style={{
                                                height:'100%', background:'var(--accent-blue)', borderRadius:'2px',
                                                width: (analyseProgress.total > 0 ? (analyseProgress.current / analyseProgress.total * 100) : 0) + '%',
                                                transition:'width 0.3s'
                                            }} />
                                        </div>
                                    </div>
                                )}

                                {/* KI-Ergebnisse */}
                                {kiErgebnisse.details && kiErgebnisse.details.length > 0 && !analyseRunning && (
                                    <div style={{
                                        background:'var(--bg-secondary)', borderRadius:'14px',
                                        border:'1px solid var(--border-subtle)', padding:'14px', marginBottom:'12px'
                                    }}>
                                        <div style={{
                                            fontFamily:'Oswald', fontWeight:600, fontSize:'14px',
                                            textTransform:'uppercase', letterSpacing:'0.5px',
                                            color:'var(--text-primary)', marginBottom:'10px'
                                        }}>KI-Ergebnisse</div>

                                        {/* 4er-Grid Zaehlungen */}
                                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'10px'}}>
                                            {[
                                                {label:'Durchbrueche', val: kiErgebnisse.loecher, icon:'\uD83D\uDD73\uFE0F'},
                                                {label:'Wandanschluesse', val: kiErgebnisse.wandanschluesse, icon:'\uD83D\uDCCF'},
                                                {label:'Innenecken', val: kiErgebnisse.innenecken, icon:'\u25E3'},
                                                {label:'Aussenecken', val: kiErgebnisse.aussenecken, icon:'\u25E2'}
                                            ].concat(
                                                kiErgebnisse.wandflaeche_m2 > 0 ? [{label:'Wandflaeche', val: fmtDe(kiErgebnisse.wandflaeche_m2) + ' m\u00B2', icon:'\uD83D\uDCD0'}] : [],
                                                kiErgebnisse.aussenecken_lfm > 0 ? [{label:'Aussenecken lfm', val: fmtDe(kiErgebnisse.aussenecken_lfm) + ' lfm', icon:'\uD83D\uDCCF'}] : [],
                                                kiErgebnisse.wandeinschluesse > 0 ? [{label:'Wandeinschluesse', val: kiErgebnisse.wandeinschluesse, icon:'\uD83E\uDDF1'}] : []
                                            ).map(item => (
                                                <div key={item.label} style={{
                                                    display:'flex', justifyContent:'space-between', alignItems:'center',
                                                    padding:'8px 10px', background:'var(--bg-tertiary)',
                                                    borderRadius:'8px', border:'1px solid var(--border-subtle)'
                                                }}>
                                                    <span style={{fontSize:'12px', color:'var(--text-secondary)'}}>
                                                        {item.icon} {item.label}
                                                    </span>
                                                    <span style={{fontFamily:'Oswald', fontWeight:700, fontSize:'16px', color:'var(--text-primary)'}}>
                                                        {item.val}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Flaechen (nur bei grosser Analyse) */}
                                        {(kiErgebnisse.abdichtungsflaeche_m2 > 0 || kiErgebnisse.gefliesteFlaeche_m2 > 0) && (
                                            <div style={{
                                                padding:'10px', background:'rgba(30,136,229,0.06)',
                                                border:'1px solid rgba(30,136,229,0.15)', borderRadius:'8px', marginBottom:'10px'
                                            }}>
                                                <div style={{fontSize:'11px', color:'var(--accent-blue)', fontWeight:600, marginBottom:'6px', textTransform:'uppercase'}}>
                                                    Flaechenberechnung
                                                </div>
                                                {kiErgebnisse.gefliesteFlaeche_m2 > 0 && (
                                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                                                        <span style={{fontSize:'12px', color:'var(--text-secondary)'}}>Geflieste Flaeche</span>
                                                        <span style={{fontFamily:'Oswald', fontWeight:700, color:'var(--accent-blue)'}}>
                                                            {fmtDe(kiErgebnisse.gefliesteFlaeche_m2)} m2
                                                        </span>
                                                    </div>
                                                )}
                                                {kiErgebnisse.abdichtungsflaeche_m2 > 0 && (
                                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                                                        <span style={{fontSize:'12px', color:'var(--text-secondary)'}}>Abdichtungsflaeche</span>
                                                        <span style={{fontFamily:'Oswald', fontWeight:700, color:'var(--accent-blue)'}}>
                                                            {fmtDe(kiErgebnisse.abdichtungsflaeche_m2)} m2
                                                        </span>
                                                    </div>
                                                )}
                                                {kiErgebnisse.dichtungsbaender_lfm > 0 && (
                                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                                        <span style={{fontSize:'12px', color:'var(--text-secondary)'}}>Dichtungsbaender</span>
                                                        <span style={{fontFamily:'Oswald', fontWeight:700, color:'var(--accent-blue)'}}>
                                                            {fmtDe(kiErgebnisse.dichtungsbaender_lfm)} lfm
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Erkannte Objekte */}
                                        {kiErgebnisse.sanitaerObjekte && kiErgebnisse.sanitaerObjekte.length > 0 && (
                                            <div style={{display:'flex', flexWrap:'wrap', gap:'4px', marginBottom:'10px'}}>
                                                {kiErgebnisse.sanitaerObjekte.map((obj, i) => (
                                                    <span key={i} style={{
                                                        fontSize:'11px', padding:'3px 8px', borderRadius:'10px',
                                                        background:'rgba(39,174,96,0.1)', color:'var(--success)',
                                                        border:'1px solid rgba(39,174,96,0.2)', fontWeight:600
                                                    }}>{obj.typ} ({obj.anzahl}x)</span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Farb-basierte Ergebnisse */}
                                        {kiErgebnisse.farbErgebnisse && Object.keys(kiErgebnisse.farbErgebnisse).length > 0 && (
                                            <div style={{marginBottom:'10px'}}>
                                                <div style={{fontSize:'11px', fontWeight:600, color:'var(--accent-blue)',
                                                    textTransform:'uppercase', marginBottom:'6px', letterSpacing:'0.5px'}}>
                                                    Markierungs-Ergebnisse
                                                </div>
                                                {Object.values(kiErgebnisse.farbErgebnisse).map((fe, idx) => {
                                                    var farbHex = {'rot':'#e63535','blau':'#1e88e5','gruen':'#2ecc71','gelb':'#f1c40f','lila':'#9b59b6','orange':'#e67e22'}[fe.farbe] || '#888';
                                                    return (
                                                        <div key={idx} style={{
                                                            display:'flex', alignItems:'center', gap:'8px',
                                                            padding:'8px 10px', background:'var(--bg-tertiary)',
                                                            borderRadius:'8px', border:'1px solid var(--border-subtle)',
                                                            marginBottom:'4px'
                                                        }}>
                                                            <div style={{
                                                                width:'14px', height:'14px', borderRadius:'50%',
                                                                background: farbHex, flexShrink:0
                                                            }} />
                                                            <span style={{flex:1, fontSize:'11px', color:'var(--text-secondary)'}}>
                                                                {fe.beschreibung}
                                                            </span>
                                                            <span style={{fontFamily:'Oswald', fontWeight:700, fontSize:'14px', color:'var(--text-primary)'}}>
                                                                {typeof fe.wert === 'number' ? fmtDe(fe.wert) : fe.wert}
                                                            </span>
                                                            <span style={{fontSize:'10px', color:'var(--text-muted)'}}>
                                                                {fe.einheit}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Transfer-Button */}
                                        <button className="raum-action-btn finish" onClick={transferKiErgebnisseToPositions}
                                            style={{width:'100%'}}>
                                            <span className="btn-icon">📋</span>
                                            <span className="btn-text">
                                                Ergebnisse in Positionen uebertragen
                                                <span className="btn-sub">Wechselt zu Tab Positionen</span>
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {/* Info: Markierte Fotos */}
                                <div style={{fontSize:'11px', color:'var(--text-muted)', textAlign:'center'}}>
                                    {getMarkedFotos().length} {getMarkedFotos().length === 1 ? 'Foto' : 'Fotos'} markiert fuer KI-Analyse
                                </div>
                            </div>

                            {/* ═══ CROP-MODAL ═══ */}
                            {cropState && (
                                <div className="modal-overlay" style={{zIndex:5000}} onClick={() => setCropState(null)}>
                                    <div style={{
                                        width:'95%', maxWidth:'520px', background:'var(--bg-primary)',
                                        borderRadius:'16px', padding:'16px', maxHeight:'92vh', overflow:'auto'
                                    }} onClick={e => e.stopPropagation()}>
                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
                                            <div>
                                                <div style={{fontSize:'11px', color:'var(--accent-blue)', textTransform:'uppercase', letterSpacing:'1px', fontWeight:600}}>
                                                    Foto zuschneiden
                                                </div>
                                                <div style={{fontSize:'14px', fontWeight:700, color:'var(--text-white)', marginTop:'2px'}}>
                                                    Wand {cropState.wandId} - Ecke zu Ecke
                                                </div>
                                            </div>
                                            <button style={{background:'none', border:'none', color:'var(--text-muted)', fontSize:'24px', cursor:'pointer'}}
                                                onClick={() => setCropState(null)}>X</button>
                                        </div>

                                        {/* Crop Canvas Area */}
                                        <div style={{position:'relative', width:'100%', borderRadius:'10px', overflow:'hidden', border:'1px solid var(--border-subtle)', touchAction:'none'}}>
                                            <img ref={cropImageRef} src={cropState.image}
                                                style={{width:'100%', display:'block', userSelect:'none', pointerEvents:'none'}}
                                                draggable="false" />
                                            {/* Overlay Canvas fuer Crop-Rechteck */}
                                            <div style={{position:'absolute', top:0, left:0, right:0, bottom:0}}
                                                onMouseDown={handleCropStart}
                                                onMouseMove={handleCropMove}
                                                onMouseUp={handleCropEnd}
                                                onTouchStart={handleCropStart}
                                                onTouchMove={handleCropMove}
                                                onTouchEnd={handleCropEnd}>
                                                {/* Abdunkelung ausserhalb */}
                                                <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, pointerEvents:'none'}}>
                                                    {/* Top */}
                                                    <div style={{position:'absolute', top:0, left:0, right:0,
                                                        height: (cropState.cropRect.y * 100) + '%',
                                                        background:'rgba(0,0,0,0.55)'}} />
                                                    {/* Bottom */}
                                                    <div style={{position:'absolute', bottom:0, left:0, right:0,
                                                        height: ((1 - cropState.cropRect.y - cropState.cropRect.h) * 100) + '%',
                                                        background:'rgba(0,0,0,0.55)'}} />
                                                    {/* Left */}
                                                    <div style={{position:'absolute',
                                                        top: (cropState.cropRect.y * 100) + '%',
                                                        left:0,
                                                        width: (cropState.cropRect.x * 100) + '%',
                                                        height: (cropState.cropRect.h * 100) + '%',
                                                        background:'rgba(0,0,0,0.55)'}} />
                                                    {/* Right */}
                                                    <div style={{position:'absolute',
                                                        top: (cropState.cropRect.y * 100) + '%',
                                                        right:0,
                                                        width: ((1 - cropState.cropRect.x - cropState.cropRect.w) * 100) + '%',
                                                        height: (cropState.cropRect.h * 100) + '%',
                                                        background:'rgba(0,0,0,0.55)'}} />
                                                    {/* Border */}
                                                    <div style={{position:'absolute',
                                                        top: (cropState.cropRect.y * 100) + '%',
                                                        left: (cropState.cropRect.x * 100) + '%',
                                                        width: (cropState.cropRect.w * 100) + '%',
                                                        height: (cropState.cropRect.h * 100) + '%',
                                                        border:'2px solid var(--accent-blue)',
                                                        boxShadow:'0 0 0 1px rgba(30,136,229,0.3)'}} />
                                                    {/* Corner handles */}
                                                    {[
                                                        {x: cropState.cropRect.x, y: cropState.cropRect.y},
                                                        {x: cropState.cropRect.x + cropState.cropRect.w, y: cropState.cropRect.y},
                                                        {x: cropState.cropRect.x, y: cropState.cropRect.y + cropState.cropRect.h},
                                                        {x: cropState.cropRect.x + cropState.cropRect.w, y: cropState.cropRect.y + cropState.cropRect.h}
                                                    ].map((c, i) => (
                                                        <div key={i} style={{
                                                            position:'absolute',
                                                            left: (c.x * 100) + '%', top: (c.y * 100) + '%',
                                                            width:'16px', height:'16px', marginLeft:'-8px', marginTop:'-8px',
                                                            borderRadius:'50%', background:'var(--accent-blue)',
                                                            border:'2px solid white', boxShadow:'0 2px 6px rgba(0,0,0,0.4)'
                                                        }} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'8px', textAlign:'center'}}>
                                            Ziehe die Ecken oder verschiebe das Rechteck - nur der markierte Bereich wird verwendet
                                        </div>

                                        <div style={{display:'flex', gap:'8px', marginTop:'12px'}}>
                                            <button className="modal-btn secondary" onClick={() => setCropState(null)} style={{flex:1}}>
                                                Abbrechen
                                            </button>
                                            <button className="modal-btn primary" onClick={applyCrop} style={{flex:1}}>
                                                Zuschnitt speichern
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ═══ VOLLBILD-EDITOR ═══ */}
                            {fullscreenEdit.active && (
                                <div style={{
                                    position:'fixed', top:0, left:0, right:0, bottom:0,
                                    zIndex:10000, background:'rgba(0,0,0,0.95)',
                                    display:'flex', flexDirection:'column',
                                    touchAction:'manipulation', overscrollBehavior:'none'
                                }}>
                                    {/* Obere Toolbar */}
                                    <div style={{
                                        display:'flex', alignItems:'center', gap:'6px',
                                        padding:'10px 14px', background:'rgba(0,0,0,0.8)',
                                        borderBottom:'1px solid rgba(255,255,255,0.1)', flexShrink:0,
                                        zIndex:10001
                                    }}>
                                        <button onClick={closeFullscreenEdit} style={{
                                            background:'none', border:'none', color:'white',
                                            fontSize:'16px', cursor:'pointer', padding:'8px', minHeight:'40px'
                                        }}>{'\u2190'} Zurueck</button>
                                        <div style={{flex:1, textAlign:'center', fontFamily:'Oswald', fontSize:'14px', color:'white', textTransform:'uppercase'}}>
                                            Wand {fullscreenEdit.wandId} — {FOTO_PHASEN.find(p => p.key === fullscreenEdit.phase)?.label || ''}
                                        </div>
                                        <button onClick={saveFullscreenEdit} style={{
                                            background:'rgba(231,76,60,0.9)', border:'none', color:'white',
                                            fontSize:'14px', cursor:'pointer', padding:'8px 18px', borderRadius:'8px',
                                            fontFamily:'Oswald', fontWeight:700, textTransform:'uppercase', minHeight:'40px'
                                        }}>Speichern</button>
                                    </div>

                                    {/* Modus-Toggle */}
                                    <div style={{
                                        display:'flex', gap:'4px', padding:'6px 12px',
                                        background:'rgba(0,0,0,0.6)', flexShrink:0
                                    }}>
                                        <button onClick={() => setFullscreenEdit(p => ({...p, editMode:'crop'}))} style={{
                                            flex:1, padding:'6px', borderRadius:'6px', border:'none', cursor:'pointer',
                                            fontSize:'11px', fontWeight:600,
                                            background: fullscreenEdit.editMode === 'crop' ? 'rgba(30,136,229,0.3)' : 'rgba(255,255,255,0.08)',
                                            color: fullscreenEdit.editMode === 'crop' ? '#1e88e5' : '#aaa'
                                        }}>{'\u2702\uFE0F'} Zuschneiden</button>
                                        <button onClick={() => setFullscreenEdit(p => ({...p, editMode:'draw'}))} style={{
                                            flex:1, padding:'6px', borderRadius:'6px', border:'none', cursor:'pointer',
                                            fontSize:'11px', fontWeight:600,
                                            background: fullscreenEdit.editMode === 'draw' ? 'rgba(231,76,60,0.3)' : 'rgba(255,255,255,0.08)',
                                            color: fullscreenEdit.editMode === 'draw' ? '#e74c3c' : '#aaa'
                                        }}>{'\u270F\uFE0F'} Markieren</button>
                                    </div>

                                    {/* Farb-Palette (nur im Markieren-Modus) */}
                                    {fullscreenEdit.editMode === 'draw' && (
                                        <div style={{
                                            display:'flex', gap:'6px', padding:'6px 12px',
                                            background:'rgba(0,0,0,0.5)', alignItems:'center', flexShrink:0
                                        }}>
                                            {MARKIERUNGS_FARBEN.map(f => (
                                                <button key={f.id} onClick={() => setFullscreenEdit(p => ({...p, drawColor: f.hex}))} style={{
                                                    width:'30px', height:'30px', borderRadius:'50%', border:'3px solid',
                                                    borderColor: fullscreenEdit.drawColor === f.hex ? 'white' : 'transparent',
                                                    background: f.hex, cursor:'pointer',
                                                    boxShadow: fullscreenEdit.drawColor === f.hex ? '0 0 8px ' + f.hex : 'none'
                                                }} />
                                            ))}
                                            <div style={{width:'1px', height:'24px', background:'rgba(255,255,255,0.2)', margin:'0 4px'}} />
                                            {[2, 4, 8, 12].map(w => (
                                                <button key={w} onClick={() => setFullscreenEdit(p => ({...p, drawWidth: w}))} style={{
                                                    width:'28px', height:'28px', borderRadius:'50%', border:'none', cursor:'pointer',
                                                    background: fullscreenEdit.drawWidth === w ? 'rgba(255,255,255,0.25)' : 'transparent',
                                                    display:'flex', alignItems:'center', justifyContent:'center'
                                                }}>
                                                    <div style={{
                                                        width: Math.max(4, w) + 'px', height: Math.max(4, w) + 'px',
                                                        borderRadius:'50%', background:'white'
                                                    }} />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Bild-Bereich (Vollbild) */}
                                    <div style={{flex:1, position:'relative', overflow:'hidden', touchAction:'none'}}
                                        onMouseDown={(e) => {
                                            var rect = e.currentTarget.getBoundingClientRect();
                                            var px = (e.clientX - rect.left) / rect.width;
                                            var py = (e.clientY - rect.top) / rect.height;
                                            if (fullscreenEdit.editMode === 'draw') {
                                                setFullscreenEdit(p => ({...p, currentDraw: {points:[{x:px,y:py}], color:p.drawColor, width:p.drawWidth}}));
                                            } else if (fullscreenEdit.editMode === 'crop') {
                                                setFullscreenEdit(p => ({...p, cropRect: {x:px, y:py, w:0, h:0}, cropDragging:true}));
                                            }
                                        }}
                                        onMouseMove={(e) => {
                                            var rect = e.currentTarget.getBoundingClientRect();
                                            var px = (e.clientX - rect.left) / rect.width;
                                            var py = (e.clientY - rect.top) / rect.height;
                                            if (fullscreenEdit.editMode === 'draw' && fullscreenEdit.currentDraw) {
                                                setFullscreenEdit(p => ({...p, currentDraw: {...p.currentDraw, points: [...p.currentDraw.points, {x:px,y:py}]}}));
                                            } else if (fullscreenEdit.editMode === 'crop' && fullscreenEdit.cropDragging) {
                                                setFullscreenEdit(p => ({...p, cropRect: {...p.cropRect, w: px - p.cropRect.x, h: py - p.cropRect.y}}));
                                            }
                                        }}
                                        onMouseUp={() => {
                                            if (fullscreenEdit.currentDraw && fullscreenEdit.currentDraw.points.length > 1) {
                                                setFullscreenEdit(p => ({...p, drawings: [...p.drawings, p.currentDraw], currentDraw:null}));
                                            } else { setFullscreenEdit(p => ({...p, currentDraw:null, cropDragging:false})); }
                                        }}
                                        onTouchStart={(e) => {
                                            e.preventDefault();
                                            var t = e.touches[0]; var rect = e.currentTarget.getBoundingClientRect();
                                            var px = (t.clientX - rect.left) / rect.width;
                                            var py = (t.clientY - rect.top) / rect.height;
                                            if (fullscreenEdit.editMode === 'draw') {
                                                setFullscreenEdit(p => ({...p, currentDraw: {points:[{x:px,y:py}], color:p.drawColor, width:p.drawWidth}}));
                                            } else if (fullscreenEdit.editMode === 'crop') {
                                                setFullscreenEdit(p => ({...p, cropRect: {x:px, y:py, w:0, h:0}, cropDragging:true}));
                                            }
                                        }}
                                        onTouchMove={(e) => {
                                            e.preventDefault();
                                            var t = e.touches[0]; var rect = e.currentTarget.getBoundingClientRect();
                                            var px = (t.clientX - rect.left) / rect.width;
                                            var py = (t.clientY - rect.top) / rect.height;
                                            if (fullscreenEdit.editMode === 'draw' && fullscreenEdit.currentDraw) {
                                                setFullscreenEdit(p => ({...p, currentDraw: {...p.currentDraw, points: [...p.currentDraw.points, {x:px,y:py}]}}));
                                            } else if (fullscreenEdit.editMode === 'crop' && fullscreenEdit.cropDragging) {
                                                setFullscreenEdit(p => ({...p, cropRect: {...p.cropRect, w: px - p.cropRect.x, h: py - p.cropRect.y}}));
                                            }
                                        }}
                                        onTouchEnd={() => {
                                            if (fullscreenEdit.currentDraw && fullscreenEdit.currentDraw.points.length > 1) {
                                                setFullscreenEdit(p => ({...p, drawings: [...p.drawings, p.currentDraw], currentDraw:null}));
                                            } else { setFullscreenEdit(p => ({...p, currentDraw:null, cropDragging:false})); }
                                        }}
                                    >
                                        {fullscreenEdit.image && (
                                            <img src={fullscreenEdit.image} style={{width:'100%', height:'100%', objectFit:'contain', pointerEvents:'none'}} />
                                        )}
                                        {/* Zeichnungen als SVG-Overlay */}
                                        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none'}}>
                                            {fullscreenEdit.drawings.map((d, di) => (
                                                d.points && d.points.length > 1 ? (
                                                    <polyline key={di}
                                                        points={d.points.map(p => Math.round(p.x*1000)+','+Math.round(p.y*1000)).join(' ')}
                                                        fill="none" stroke={d.color} strokeWidth={d.width * 2} strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                                                ) : null
                                            ))}
                                            {fullscreenEdit.currentDraw && fullscreenEdit.currentDraw.points.length > 1 && (
                                                <polyline
                                                    points={fullscreenEdit.currentDraw.points.map(p => Math.round(p.x*1000)+','+Math.round(p.y*1000)).join(' ')}
                                                    fill="none" stroke={fullscreenEdit.currentDraw.color} strokeWidth={fullscreenEdit.currentDraw.width * 2}
                                                    strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                                            )}
                                            {/* Crop-Rechteck */}
                                            {fullscreenEdit.editMode === 'crop' && fullscreenEdit.cropRect && fullscreenEdit.cropRect.w !== 0 && (
                                                <React.Fragment>
                                                    <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.5)" />
                                                    <rect
                                                        x={(Math.min(fullscreenEdit.cropRect.x, fullscreenEdit.cropRect.x + fullscreenEdit.cropRect.w)*100)+'%'}
                                                        y={(Math.min(fullscreenEdit.cropRect.y, fullscreenEdit.cropRect.y + fullscreenEdit.cropRect.h)*100)+'%'}
                                                        width={(Math.abs(fullscreenEdit.cropRect.w)*100)+'%'}
                                                        height={(Math.abs(fullscreenEdit.cropRect.h)*100)+'%'}
                                                        fill="transparent" stroke="#1e88e5" strokeWidth="2" />
                                                </React.Fragment>
                                            )}
                                        </svg>
                                    </div>

                                    {/* Untere Toolbar */}
                                    <div style={{
                                        display:'flex', gap:'6px', padding:'8px 12px',
                                        background:'rgba(0,0,0,0.8)', borderTop:'1px solid rgba(255,255,255,0.1)', flexShrink:0
                                    }}>
                                        {fullscreenEdit.drawings.length > 0 && (
                                            <button onClick={() => setFullscreenEdit(p => ({...p, drawings: p.drawings.slice(0,-1)}))} style={{
                                                flex:1, padding:'8px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.2)',
                                                background:'transparent', color:'white', fontSize:'11px', cursor:'pointer'
                                            }}>Rueckgaengig</button>
                                        )}
                                        {fullscreenEdit.cropRect && (
                                            <button onClick={() => setFullscreenEdit(p => ({...p, cropRect:null}))} style={{
                                                flex:1, padding:'8px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.2)',
                                                background:'transparent', color:'white', fontSize:'11px', cursor:'pointer'
                                            }}>Crop zuruecksetzen</button>
                                        )}
                                        <button onClick={saveFullscreenEdit} style={{
                                            flex:2, padding:'10px', borderRadius:'8px', border:'none',
                                            background:'rgba(231,76,60,0.9)', color:'white', fontSize:'13px',
                                            cursor:'pointer', fontFamily:'Oswald', fontWeight:700, textTransform:'uppercase'
                                        }}>Speichern</button>
                                    </div>
                                </div>
                            )}

                            {/* ═══ FARB-ZUORDNUNGS-POPUP ═══ */}
                            {farbPopupOpen && (
                                <div className="modal-overlay" style={{zIndex:9000}} onClick={() => setFarbPopupOpen(null)}>
                                    <div onClick={e => e.stopPropagation()} style={{
                                        maxWidth:'500px', width:'94%', maxHeight:'85vh', overflow:'auto',
                                        borderRadius:'20px', padding:'20px',
                                        background:'var(--bg-primary)', border:'1px solid var(--border-subtle)'
                                    }}>
                                        <div style={{
                                            fontFamily:'Oswald', fontWeight:700, fontSize:'16px',
                                            textTransform:'uppercase', letterSpacing:'0.5px',
                                            color:'var(--text-primary)', marginBottom:'16px',
                                            display:'flex', alignItems:'center', gap:'8px'
                                        }}>
                                            <span style={{fontSize:'20px'}}>{'\uD83C\uDFA8'}</span>
                                            Farb-Zuordnung: {FOTO_PHASEN.find(p => p.key === farbPopupOpen)?.label || ''}
                                        </div>

                                        <div style={{
                                            fontSize:'12px', color:'var(--text-secondary)', lineHeight:1.5,
                                            marginBottom:'16px', padding:'10px',
                                            background:'rgba(30,136,229,0.06)', borderRadius:'10px',
                                            border:'1px solid rgba(30,136,229,0.15)'
                                        }}>
                                            Ordne jede Markierungsfarbe einer Position zu. Die KI erkennt die markierten Bereiche und berechnet das Ergebnis in der zugeordneten Einheit.
                                        </div>

                                        {(farbZuordnung[farbPopupOpen] || []).map((zuordnung, idx) => {
                                            var farbObj = MARKIERUNGS_FARBEN.find(f => f.id === zuordnung.farbe);
                                            return (
                                                <div key={idx} style={{
                                                    display:'flex', alignItems:'center', gap:'8px',
                                                    marginBottom:'10px', padding:'10px',
                                                    background:'var(--bg-tertiary)', borderRadius:'12px',
                                                    border:'1px solid var(--border-subtle)'
                                                }}>
                                                    <div style={{
                                                        width:'28px', height:'28px', borderRadius:'50%',
                                                        background: farbObj ? farbObj.hex : '#888',
                                                        flexShrink:0, border:'2px solid rgba(255,255,255,0.2)'
                                                    }} />
                                                    <div style={{flex:1, minWidth:0}}>
                                                        <input type="text" value={zuordnung.beschreibung} onChange={e => {
                                                            setFarbZuordnung(prev => {
                                                                var updated = Object.assign({}, prev);
                                                                var arr = (updated[farbPopupOpen] || []).slice();
                                                                arr[idx] = Object.assign({}, arr[idx], {beschreibung: e.target.value});
                                                                updated[farbPopupOpen] = arr;
                                                                return updated;
                                                            });
                                                        }} placeholder="Beschreibung eingeben" style={{
                                                            width:'100%', padding:'6px 8px', marginBottom:'4px',
                                                            background:'var(--bg-primary)', border:'1px solid var(--border-subtle)',
                                                            borderRadius:'8px', color:'var(--text-primary)', fontSize:'12px', fontWeight:600
                                                        }} />
                                                        <select value={zuordnung.position} onChange={function(e) {
                                                            var val = e.target.value;
                                                            var found = null;
                                                            for (var ai = 0; ai < allLvPos.length; ai++) { if (allLvPos[ai].pos === val) { found = allLvPos[ai]; break; } }
                                                            if (!found) { for (var bi = 0; bi < posCards.length; bi++) { if (posCards[bi].pos === val) { found = posCards[bi]; break; } } }
                                                            setFarbZuordnung(function(prev) {
                                                                var updated = Object.assign({}, prev);
                                                                var arr = (updated[farbPopupOpen] || []).slice();
                                                                var changes = {position: val};
                                                                if (found && (found.bez || found.titel)) { changes.beschreibung = found.bez || found.titel; }
                                                                if (found && found.einheit) { changes.einheit = found.einheit === 'm\u00b2' ? 'm2' : (found.einheit || 'm2'); }
                                                                arr[idx] = Object.assign({}, arr[idx], changes);
                                                                updated[farbPopupOpen] = arr;
                                                                return updated;
                                                            });
                                                        }} style={{
                                                            width:'100%', padding:'6px 8px',
                                                            background:'var(--bg-primary)', border:'1px solid var(--border-subtle)',
                                                            borderRadius:'8px', color:'var(--text-primary)', fontSize:'12px'
                                                        }}>
                                                            <option value="">-- Position waehlen --</option>
                                                            {posCards.map(function(p) { return (
                                                                <option key={'pc-' + p.pos} value={p.pos}>{p.pos} - {(p.bez || 'Position').substring(0, 50)}</option>
                                                            ); })}
                                                            {allLvPos.filter(function(lp) { return !posCards.some(function(pc) { return pc.pos === lp.pos; }); }).map(function(p) { return (
                                                                <option key={'lv-' + p.pos} value={p.pos}>{p.pos} - {(p.bez || p.titel || 'Position').substring(0, 50)}</option>
                                                            ); })}
                                                        </select>
                                                    </div>
                                                    <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', flexShrink:0}}>
                                                        <select value={zuordnung.einheit} onChange={e => {
                                                            setFarbZuordnung(prev => {
                                                                var updated = Object.assign({}, prev);
                                                                var arr = (updated[farbPopupOpen] || []).slice();
                                                                arr[idx] = Object.assign({}, arr[idx], {einheit: e.target.value});
                                                                updated[farbPopupOpen] = arr;
                                                                return updated;
                                                            });
                                                        }} style={{
                                                            padding:'3px 6px', borderRadius:'6px',
                                                            background:'var(--bg-primary)', border:'1px solid var(--border-subtle)',
                                                            fontSize:'11px', color:'var(--text-primary)', fontWeight:600
                                                        }}>
                                                            <option value="m2">m2</option>
                                                            <option value="lfm">lfm</option>
                                                            <option value="Stk">Stk</option>
                                                            <option value="psch">psch</option>
                                                        </select>
                                                        <button onClick={() => {
                                                            setFarbZuordnung(prev => {
                                                                var updated = Object.assign({}, prev);
                                                                var arr = (updated[farbPopupOpen] || []).slice();
                                                                arr.splice(idx, 1);
                                                                updated[farbPopupOpen] = arr;
                                                                return updated;
                                                            });
                                                        }} style={{
                                                            width:'24px', height:'24px', borderRadius:'50%', border:'none',
                                                            background:'rgba(196,30,30,0.15)', color:'#e74c3c',
                                                            fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'
                                                        }}>{'\u2715'}</button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Farbe hinzufuegen Button */}
                                        {(() => {
                                            var usedFarben = (farbZuordnung[farbPopupOpen] || []).map(z => z.farbe);
                                            var verfuegbar = MARKIERUNGS_FARBEN.filter(f => usedFarben.indexOf(f.id) === -1);
                                            if (verfuegbar.length === 0) return null;
                                            return (
                                                <button onClick={() => {
                                                    setFarbZuordnung(prev => {
                                                        var updated = Object.assign({}, prev);
                                                        var arr = (updated[farbPopupOpen] || []).slice();
                                                        arr.push({ farbe: verfuegbar[0].id, position: '', beschreibung: '', einheit: 'm2' });
                                                        updated[farbPopupOpen] = arr;
                                                        return updated;
                                                    });
                                                }} style={{
                                                    width:'100%', padding:'10px', marginTop:'6px', borderRadius:'10px',
                                                    border:'2px dashed var(--border-subtle)', cursor:'pointer',
                                                    background:'transparent', color:'var(--text-secondary)',
                                                    fontFamily:'Oswald', fontWeight:600, fontSize:'12px',
                                                    textTransform:'uppercase', letterSpacing:'0.5px',
                                                    display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
                                                }}>
                                                    <span style={{fontSize:'16px'}}>+</span> Farbe hinzufuegen ({verfuegbar.length} verfuegbar)
                                                </button>
                                            );
                                        })()}

                                        <button onClick={() => setFarbPopupOpen(null)} style={{
                                            width:'100%', padding:'12px', marginTop:'10px', borderRadius:'12px',
                                            border:'none', cursor:'pointer', fontFamily:'Oswald', fontWeight:700,
                                            fontSize:'14px', textTransform:'uppercase',
                                            background:'var(--accent-blue)', color:'white'
                                        }}>Fertig</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ FULLSCREEN FOTO-VIEWER (fuer beide Seiten) ═══ */}
                    {fullscreenImg && (
                        <div style={{
                            position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:10000,
                            background:'rgba(0,0,0,0.95)', display:'flex', alignItems:'center', justifyContent:'center',
                            touchAction:'none'
                        }} onClick={function() { setFullscreenImg(null); setFullscreenZoom(1); setFullscreenPan({x:0,y:0}); }}>
                            <div style={{position:'absolute', top:'10px', right:'10px', zIndex:10001, display:'flex', gap:'8px'}}>
                                <button onClick={function(e) { e.stopPropagation(); setFullscreenZoom(function(z) { return Math.min(z + 0.5, 5); }); }}
                                    style={{width:'44px', height:'44px', borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.15)', color:'white', fontSize:'22px', cursor:'pointer'}}>+</button>
                                <button onClick={function(e) { e.stopPropagation(); setFullscreenZoom(function(z) { return Math.max(z - 0.5, 0.5); }); setFullscreenPan({x:0,y:0}); }}
                                    style={{width:'44px', height:'44px', borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.15)', color:'white', fontSize:'22px', cursor:'pointer'}}>-</button>
                                <button onClick={function(e) { e.stopPropagation(); setFullscreenImg(null); setFullscreenZoom(1); setFullscreenPan({x:0,y:0}); }}
                                    style={{width:'44px', height:'44px', borderRadius:'50%', border:'none', background:'rgba(231,76,60,0.6)', color:'white', fontSize:'20px', cursor:'pointer'}}>{'\u2715'}</button>
                            </div>
                            {fullscreenImg.label && (
                                <div style={{position:'absolute', top:'14px', left:'14px', color:'white', fontSize:'14px', fontFamily:'Oswald', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', textShadow:'0 2px 4px rgba(0,0,0,0.5)'}}>
                                    {fullscreenImg.label}
                                </div>
                            )}
                            <div style={{overflow:'hidden', width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}
                                onClick={function(e) { e.stopPropagation(); }}>
                                <img src={fullscreenImg.image} style={{
                                    maxWidth: fullscreenZoom === 1 ? '95%' : 'none', maxHeight: fullscreenZoom === 1 ? '90vh' : 'none',
                                    width: fullscreenZoom > 1 ? (fullscreenZoom * 100) + '%' : 'auto',
                                    transform: 'translate(' + fullscreenPan.x + 'px, ' + fullscreenPan.y + 'px)',
                                    transition: 'transform 0.1s ease', objectFit:'contain', borderRadius:'4px'
                                }}
                                onTouchStart={function(e) {
                                    if (fullscreenZoom <= 1) return;
                                    var touch = e.touches[0];
                                    window._fsPanStart = {x: touch.clientX - fullscreenPan.x, y: touch.clientY - fullscreenPan.y};
                                }}
                                onTouchMove={function(e) {
                                    if (fullscreenZoom <= 1 || !window._fsPanStart) return;
                                    e.preventDefault();
                                    var touch = e.touches[0];
                                    setFullscreenPan({x: touch.clientX - window._fsPanStart.x, y: touch.clientY - window._fsPanStart.y});
                                }}
                                onDoubleClick={function() { setFullscreenZoom(function(z) { return z >= 2 ? 1 : z + 1; }); setFullscreenPan({x:0,y:0}); }}
                                />
                            </div>
                            <div style={{position:'absolute', bottom:'16px', left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.5)', fontSize:'11px', fontFamily:'Oswald', letterSpacing:'1px'}}>
                                ZOOM: {Math.round(fullscreenZoom * 100)}% — Doppeltippen zum Zoomen
                            </div>
                        </div>
                    )}

                    {/* ═══ TAB 4: OBJEKT-FOTOS (20 Slots) ═══ */}
                    {rbTab === 4 && (
                        <div style={{padding:'0 4px'}}>
                            {/* Hidden file input */}
                            <input type="file" accept="image/*" capture="environment"
                                ref={objektFotoInputRef} style={{display:'none'}}
                                onChange={function(e) {
                                    var file = e.target.files && e.target.files[0];
                                    var nr = objektFotoTarget.current;
                                    if (!file || nr === null) return;
                                    var reader = new FileReader();
                                    reader.onload = function(ev) {
                                        setObjektFotos(function(prev) {
                                            return prev.map(function(slot) {
                                                if (slot.nr === nr) return Object.assign({}, slot, {
                                                    image: ev.target.result, croppedImage: null,
                                                    zeit: new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit', second:'2-digit'}),
                                                    marked: false
                                                });
                                                return slot;
                                            });
                                        });
                                        objektFotoTarget.current = null;
                                    };
                                    reader.readAsDataURL(file);
                                }} />

                            {/* Modus-Header */}
                            <div style={{
                                padding:'10px 14px', marginBottom:'10px', borderRadius:'10px',
                                background:'rgba(142,68,173,0.1)', border:'1px solid rgba(142,68,173,0.25)',
                                display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', fontWeight:600,
                                color:'#8e44ad', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'
                            }}>
                                <span style={{fontSize:'18px'}}>{'\uD83C\uDFE2'}</span>
                                Objekt-Dokumentation — {objektFotos.filter(function(s) { return s.image; }).length}/20 Fotos
                            </div>

                            {/* Archiv-Buttons */}
                            <div style={{display:'flex', gap:'6px', marginBottom:'12px'}}>
                                <button onClick={function() {
                                    var mitBild = objektFotos.filter(function(s) { return s.image; });
                                    if (mitBild.length === 0) { alert('Keine Fotos zum Archivieren vorhanden.'); return; }
                                    if (!confirm(mitBild.length + ' Fotos auf Google Drive archivieren?\n\nDie Fotos werden im Ordner \"Bilder\" gespeichert und hier geloescht.')) return;
                                    var svc = window.GoogleDriveService;
                                    if (!svc || !svc.accessToken) { alert('Google Drive nicht verbunden.'); return; }
                                    var driveId = kunde._driveFolderId || kunde.id;
                                    if (!driveId) { alert('Kein Kundenordner vorhanden.'); return; }
                                    (async function() {
                                        try {
                                            var folders = await svc._fetchJSON('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent("'" + driveId + "' in parents and name='Bilder' and mimeType='application/vnd.google-apps.folder' and trashed=false") + '&fields=files(id,name)');
                                            var bilderFolder = (folders.files && folders.files[0]) ? folders.files[0].id : null;
                                            if (!bilderFolder) {
                                                var created = await svc._fetchJSON('https://www.googleapis.com/drive/v3/files', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:'Bilder', mimeType:'application/vnd.google-apps.folder', parents:[driveId]})});
                                                bilderFolder = created.id;
                                            }
                                            var ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                                            var archivF = await svc._fetchJSON('https://www.googleapis.com/drive/v3/files', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:'Archiv_' + ts, mimeType:'application/vnd.google-apps.folder', parents:[bilderFolder]})});
                                            for (var fi = 0; fi < mitBild.length; fi++) {
                                                var foto = mitBild[fi];
                                                var imgData = (foto.croppedImage || foto.image);
                                                var blob = await fetch(imgData).then(function(r) { return r.blob(); });
                                                var metadata = JSON.stringify({name: 'Foto_' + String(foto.nr).padStart(2, '0') + '.jpg', parents: [archivF.id]});
                                                var formData = new FormData();
                                                formData.append('metadata', new Blob([metadata], {type:'application/json'}));
                                                formData.append('file', blob);
                                                await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {method:'POST', headers:{'Authorization':'Bearer ' + svc.accessToken}, body:formData});
                                            }
                                            setObjektFotos(Array.from({length: 20}, function(_, i) { return { nr: i + 1, image: null, croppedImage: null, marked: false, zeit: '' }; }));
                                            alert(mitBild.length + ' Fotos erfolgreich archiviert!');
                                        } catch(err) { alert('Archivierung fehlgeschlagen: ' + err.message); }
                                    })();
                                }} style={{
                                    flex:1, padding:'12px', borderRadius:'10px', border:'none', cursor:'pointer',
                                    background:'linear-gradient(135deg, #8e44ad, #6c3483)', color:'white',
                                    fontSize:'12px', fontWeight:700, fontFamily:'Oswald, sans-serif',
                                    textTransform:'uppercase', letterSpacing:'0.5px',
                                    boxShadow:'0 3px 10px rgba(142,68,173,0.3)'
                                }}>
                                    {'\uD83D\uDCE4'} Fotos archivieren
                                </button>
                                <button onClick={function() {
                                    var svc = window.GoogleDriveService;
                                    if (!svc || !svc.accessToken) { alert('Google Drive nicht verbunden.'); return; }
                                    var driveId = kunde._driveFolderId || kunde.id;
                                    if (!driveId) { alert('Kein Kundenordner.'); return; }
                                    setArchivLaden(true); setShowArchivModal(true);
                                    (async function() {
                                        try {
                                            var folders = await svc._fetchJSON('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent("'" + driveId + "' in parents and name='Bilder' and mimeType='application/vnd.google-apps.folder' and trashed=false") + '&fields=files(id,name)');
                                            var bilderFolder = (folders.files && folders.files[0]) ? folders.files[0].id : null;
                                            if (!bilderFolder) { setObjektArchivListe([]); setArchivLaden(false); return; }
                                            var archivs = await svc._fetchJSON('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent("'" + bilderFolder + "' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false") + '&fields=files(id,name,createdTime)&orderBy=createdTime desc');
                                            setObjektArchivListe((archivs.files || []).map(function(f) { return {id: f.id, name: f.name, datum: f.createdTime ? new Date(f.createdTime).toLocaleDateString('de-DE') : ''}; }));
                                        } catch(err) { setObjektArchivListe([]); }
                                        setArchivLaden(false);
                                    })();
                                }} style={{
                                    flex:1, padding:'12px', borderRadius:'10px', border:'2px solid #8e44ad', cursor:'pointer',
                                    background:'rgba(142,68,173,0.08)', color:'#8e44ad',
                                    fontSize:'12px', fontWeight:700, fontFamily:'Oswald, sans-serif',
                                    textTransform:'uppercase', letterSpacing:'0.5px'
                                }}>
                                    {'\uD83D\uDCC2'} Archivierte Fotos
                                </button>
                            </div>

                            {/* 20 Foto-Slots Grid */}
                            <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'6px'}}>
                                {(archivViewFotos || objektFotos).map(function(slot) {
                                    var hasImage = !!(slot.image || slot.croppedImage);
                                    var displayImg = slot.croppedImage || slot.image;
                                    var isArchiv = !!archivViewFotos;
                                    return (
                                        <div key={slot.nr} style={{
                                            borderRadius:'10px', border: hasImage ? '2px solid rgba(142,68,173,0.4)' : '2px dashed rgba(142,68,173,0.2)',
                                            background: hasImage ? 'var(--bg-secondary)' : 'rgba(142,68,173,0.04)',
                                            overflow:'hidden', position:'relative', aspectRatio:'1'
                                        }}>
                                            {/* Nummer-Badge */}
                                            <div style={{
                                                position:'absolute', top:'4px', left:'4px', zIndex:2,
                                                width:'22px', height:'22px', borderRadius:'50%',
                                                background: hasImage ? '#8e44ad' : 'rgba(142,68,173,0.2)',
                                                color:'white', fontSize:'11px', fontWeight:700,
                                                display:'flex', alignItems:'center', justifyContent:'center',
                                                fontFamily:'Oswald'
                                            }}>{slot.nr}</div>

                                            {hasImage ? (
                                                <React.Fragment>
                                                    <img src={displayImg} style={{width:'100%', height:'100%', objectFit:'cover', cursor:'pointer'}}
                                                        onClick={function() { setFullscreenImg({image: displayImg, label: 'Foto ' + slot.nr + (slot.zeit ? ' - ' + slot.zeit : '')}); }} />
                                                    {!isArchiv && (
                                                        <React.Fragment>
                                                            <div style={{position:'absolute', bottom:'2px', left:'4px', fontSize:'9px', color:'white', textShadow:'0 1px 3px rgba(0,0,0,0.8)'}}>{slot.zeit}</div>
                                                            <button onClick={function(e) { e.stopPropagation();
                                                                if (!confirm('Foto ' + slot.nr + ' loeschen?')) return;
                                                                setObjektFotos(function(prev) { return prev.map(function(s) { return s.nr === slot.nr ? Object.assign({}, s, {image:null, croppedImage:null, zeit:'', marked:false}) : s; }); });
                                                            }} style={{
                                                                position:'absolute', top:'3px', right:'3px', width:'20px', height:'20px',
                                                                borderRadius:'50%', border:'none', background:'rgba(231,76,60,0.7)',
                                                                color:'white', fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3
                                                            }}>{'\u2715'}</button>
                                                        </React.Fragment>
                                                    )}
                                                </React.Fragment>
                                            ) : (
                                                <div onClick={function() {
                                                    if (isArchiv) return;
                                                    objektFotoTarget.current = slot.nr;
                                                    if (objektFotoInputRef.current) { objektFotoInputRef.current.value = ''; objektFotoInputRef.current.click(); }
                                                }} style={{
                                                    width:'100%', height:'100%', display:'flex', flexDirection:'column',
                                                    alignItems:'center', justifyContent:'center', cursor: isArchiv ? 'default' : 'pointer',
                                                    color:'rgba(142,68,173,0.3)', gap:'4px'
                                                }}>
                                                    <span style={{fontSize:'24px'}}>{'\uD83D\uDCF7'}</span>
                                                    <span style={{fontSize:'9px', fontWeight:600}}>Foto</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Archiv-View Header */}
                            {archivViewFotos && (
                                <button onClick={function() { setArchivViewFotos(null); }} style={{
                                    width:'100%', padding:'12px', marginTop:'10px', borderRadius:'10px',
                                    border:'2px solid #8e44ad', background:'rgba(142,68,173,0.08)',
                                    color:'#8e44ad', cursor:'pointer', fontFamily:'Oswald', fontWeight:700,
                                    fontSize:'13px', textTransform:'uppercase'
                                }}>{'\u2190'} Zurueck zu aktuellen Fotos</button>
                            )}

                            {/* Archiv-Auswahl Modal */}
                            {showArchivModal && (
                                <div className="modal-overlay" style={{zIndex:9500}} onClick={function() { setShowArchivModal(false); }}>
                                    <div onClick={function(e) { e.stopPropagation(); }} style={{
                                        maxWidth:'420px', width:'92%', maxHeight:'80vh', overflow:'auto',
                                        borderRadius:'20px', padding:'20px',
                                        background:'var(--bg-primary)', border:'1px solid var(--border-subtle)'
                                    }}>
                                        <div style={{fontFamily:'Oswald', fontWeight:700, fontSize:'16px', textTransform:'uppercase', letterSpacing:'0.5px', color:'#8e44ad', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px'}}>
                                            <span style={{fontSize:'20px'}}>{'\uD83D\uDCC2'}</span> Archivierte Fotos
                                        </div>
                                        {archivLaden && <div style={{textAlign:'center', padding:'30px', color:'var(--text-muted)'}}>Lade Archive...</div>}
                                        {!archivLaden && objektArchivListe.length === 0 && <div style={{textAlign:'center', padding:'30px', color:'var(--text-muted)'}}>Keine archivierten Fotos vorhanden.</div>}
                                        {!archivLaden && objektArchivListe.map(function(archiv) {
                                            return (
                                                <button key={archiv.id} onClick={function() {
                                                    setShowArchivModal(false);
                                                    var svc = window.GoogleDriveService;
                                                    (async function() {
                                                        try {
                                                            var files = await svc._fetchJSON('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent("'" + archiv.id + "' in parents and trashed=false") + '&fields=files(id,name,mimeType)&orderBy=name');
                                                            var imgFiles = (files.files || []).filter(function(f) { return f.mimeType && f.mimeType.indexOf('image') >= 0; });
                                                            var loaded = [];
                                                            for (var li = 0; li < Math.min(imgFiles.length, 20); li++) {
                                                                try {
                                                                    var resp = await fetch('https://www.googleapis.com/drive/v3/files/' + imgFiles[li].id + '?alt=media', {headers:{'Authorization':'Bearer ' + svc.accessToken}});
                                                                    var blob = await resp.blob();
                                                                    var dataUrl = await new Promise(function(res) { var r = new FileReader(); r.onload = function() { res(r.result); }; r.readAsDataURL(blob); });
                                                                    loaded.push({nr: li + 1, image: dataUrl, croppedImage: null, marked: false, zeit: archiv.datum});
                                                                } catch(e) { loaded.push({nr: li + 1, image: null, croppedImage: null, marked: false, zeit: ''}); }
                                                            }
                                                            while (loaded.length < 20) { loaded.push({nr: loaded.length + 1, image: null, croppedImage: null, marked: false, zeit: ''}); }
                                                            setArchivViewFotos(loaded);
                                                        } catch(err) { alert('Fehler beim Laden: ' + err.message); }
                                                    })();
                                                }} style={{
                                                    display:'flex', alignItems:'center', gap:'12px', width:'100%', padding:'14px',
                                                    marginBottom:'6px', borderRadius:'12px', border:'1px solid rgba(142,68,173,0.2)',
                                                    background:'rgba(142,68,173,0.05)', cursor:'pointer', textAlign:'left'
                                                }}>
                                                    <span style={{fontSize:'24px'}}>{'\uD83D\uDCC1'}</span>
                                                    <div style={{flex:1}}>
                                                        <div style={{fontSize:'14px', fontWeight:700, color:'var(--text-primary)'}}>{archiv.name}</div>
                                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'2px'}}>{archiv.datum}</div>
                                                    </div>
                                                    <span style={{color:'var(--text-muted)'}}>{'\u203A'}</span>
                                                </button>
                                            );
                                        })}
                                        <button onClick={function() { setShowArchivModal(false); }} style={{
                                            width:'100%', padding:'12px', marginTop:'8px', borderRadius:'10px',
                                            border:'none', background:'var(--bg-secondary)', color:'var(--text-secondary)',
                                            cursor:'pointer', fontFamily:'Oswald', fontWeight:600, fontSize:'13px', textTransform:'uppercase'
                                        }}>Schliessen</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ TAB 2: OEFFNUNGEN ═══ */}
                    {rbTab === 2 && (<React.Fragment>

                    {/* ═══ TUEREN (eigene Sektion, aufklappbar) ═══ */}
                    <div className="masse-section">
                        <div className="masse-section-title">🚪 Türen ({tueren.length})</div>
                        {tueren.map(t => {
                            const bVal = parseMass(t.breite); const hVal = parseMass(t.hoehe);
                            const fl = bVal * hVal;
                            return (
                                <div key={t.id} className={`oeffnung-card ${t.expanded ? 'expanded' : ''}`}>
                                    <div className="oeffnung-header" onClick={() => updateTuer(t.id, 'expanded', !t.expanded)}>
                                        <span className="oeffnung-icon">🚪</span>
                                        <div className="oeffnung-title">{t.name}</div>
                                        {fl > 0 && <span className="oeffnung-result">{fmtDe(fl)} m²</span>}
                                        <span className="pos-card-arrow">{t.expanded ? '▲' : '▼'}</span>
                                    </div>
                                    {t.expanded && (
                                        <div className="oeffnung-body">
                                            <div className="masse-field" style={{marginBottom:'8px'}}>
                                                <span className="masse-label">Bezeichnung</span>
                                                <input className="masse-input" type="text" value={t.name}
                                                    onChange={e => updateTuer(t.id, 'name', e.target.value)} />
                                            </div>
                                            {/* Anzahl-Multiplikator */}
                                            <div className="masse-field" style={{marginBottom:'8px'}}>
                                                <span className="masse-label">Anzahl (gleiche Türen)</span>
                                                <div className="masse-input-wrap">
                                                    <input className="masse-input" type="number" min="1" step="1"
                                                        value={t.anzahl || 1}
                                                        onChange={e => updateTuer(t.id, 'anzahl', parseInt(e.target.value) || 1)}
                                                        style={{textAlign:'center', fontWeight:'700', color:'var(--accent-blue)'}} />
                                                    <span className="masse-unit">Stk</span>
                                                </div>
                                            </div>
                                            {/* DIN Tür-Größen Button */}
                                            <div style={{marginBottom:'10px'}}>
                                                <button className="din-tuer-btn" onClick={() => setDinTuerOpen(dinTuerOpen === t.id ? null : t.id)}>
                                                    📐 DIN Tür-Größen
                                                </button>
                                            </div>
                                            <div className="masse-grid">
                                                <div className="masse-field">
                                                    <span className="masse-label">Breite (m)</span>
                                                    <div className="masse-input-wrap">
                                                        <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000"
                                                            value={t.breite} onChange={e => updateTuer(t.id, 'breite', e.target.value)}
                                                            onBlur={() => { if (t.breite) updateTuer(t.id, 'breite', formatMass(t.breite)); }}
                                                            autoFocus={t.id === lastAddedTuerId}
                                                            onFocus={() => { if (t.id === lastAddedTuerId) setLastAddedTuerId(null); }}
                                                            />
                                                        <span className="masse-unit">m</span>
                                                    </div>
                                                </div>
                                                <div className="masse-field">
                                                    <span className="masse-label">Höhe (m)</span>
                                                    <div className="masse-input-wrap">
                                                        <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000"
                                                            value={t.hoehe} onChange={e => updateTuer(t.id, 'hoehe', e.target.value)}
                                                            onBlur={() => { if (t.hoehe) updateTuer(t.id, 'hoehe', formatMass(t.hoehe)); }} />
                                                        <span className="masse-unit">m</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Laibung */}
                                            <div className="oeffnung-toggle" style={{marginTop:'10px'}}>
                                                <label className="toggle-row">
                                                    <span>Laibung</span>
                                                    <div className={`toggle-switch ${t.hatLaibung ? 'active' : ''}`}
                                                        onClick={() => updateTuer(t.id, 'hatLaibung', !t.hatLaibung)}>
                                                        <div className="toggle-knob" />
                                                    </div>
                                                </label>
                                                {t.hatLaibung && (
                                                    <div className="masse-field" style={{marginTop:'8px'}}>
                                                        <span className="masse-label">Laibungstiefe (m)</span>
                                                        <div className="masse-input-wrap">
                                                            <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000"
                                                                value={t.tiefe} onChange={e => updateTuer(t.id, 'tiefe', e.target.value)}
                                                                onBlur={() => { if (t.tiefe) updateTuer(t.id, 'tiefe', formatMass(t.tiefe)); }}
                                                                autoFocus={!t.tiefe} />
                                                            <span className="masse-unit">m</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Neue Schalter: Gefliest ── */}
                                            {t.hatLaibung && (
                                                <div style={{marginTop:'10px', padding:'10px', background:'rgba(230,126,34,0.04)', borderRadius:'var(--radius-sm)', border:'1px solid rgba(230,126,34,0.12)'}}>
                                                    <div style={{fontSize:'11px', color:'var(--accent-orange)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px'}}>🧱 Gefliest</div>
                                                    <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                                                        <div className="umlaufend-group" style={{flex:'1 1 auto', minWidth:'90px'}}>
                                                            <span className="umlaufend-label">Leibung Wand</span>
                                                            <div className="ja-nein-btns">
                                                                <button className={`ja-nein-btn ${t.leibungWandGefliest ? 'active ja' : ''}`}
                                                                    onClick={() => updateTuer(t.id, 'leibungWandGefliest', true)}>Ja</button>
                                                                <button className={`ja-nein-btn ${!t.leibungWandGefliest ? 'active nein' : ''}`}
                                                                    onClick={() => updateTuer(t.id, 'leibungWandGefliest', false)}>Nein</button>
                                                            </div>
                                                        </div>
                                                        <div className="umlaufend-group" style={{flex:'1 1 auto', minWidth:'90px'}}>
                                                            <span className="umlaufend-label">Leibung Boden</span>
                                                            <div className="ja-nein-btns">
                                                                <button className={`ja-nein-btn ${t.leibungBodenGefliest ? 'active ja' : ''}`}
                                                                    onClick={() => updateTuer(t.id, 'leibungBodenGefliest', true)}>Ja</button>
                                                                <button className={`ja-nein-btn ${!t.leibungBodenGefliest ? 'active nein' : ''}`}
                                                                    onClick={() => updateTuer(t.id, 'leibungBodenGefliest', false)}>Nein</button>
                                                            </div>
                                                        </div>
                                                        <div className="umlaufend-group" style={{flex:'1 1 auto', minWidth:'90px'}}>
                                                            <span className="umlaufend-label">Türsturz</span>
                                                            <div className="ja-nein-btns">
                                                                <button className={`ja-nein-btn ${t.sturzGefliest ? 'active ja' : ''}`}
                                                                    onClick={() => updateTuer(t.id, 'sturzGefliest', true)}>Ja</button>
                                                                <button className={`ja-nein-btn ${!t.sturzGefliest ? 'active nein' : ''}`}
                                                                    onClick={() => updateTuer(t.id, 'sturzGefliest', false)}>Nein</button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Abdichtung (nur wenn Abdichtungs-Position vorhanden) */}
                                                    {hatWandabdichtung && (
                                                        <React.Fragment>
                                                            <div style={{fontSize:'11px', color:'var(--accent-blue)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginTop:'10px', marginBottom:'8px'}}>💧 Abgedichtet</div>
                                                            <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                                                                <div className="umlaufend-group" style={{flex:'1 1 auto', minWidth:'90px'}}>
                                                                    <span className="umlaufend-label">Leibung Wand</span>
                                                                    <div className="ja-nein-btns">
                                                                        <button className={`ja-nein-btn ${t.leibungWandAbgedichtet ? 'active ja' : ''}`}
                                                                            onClick={() => updateTuer(t.id, 'leibungWandAbgedichtet', true)}>Ja</button>
                                                                        <button className={`ja-nein-btn ${!t.leibungWandAbgedichtet ? 'active nein' : ''}`}
                                                                            onClick={() => updateTuer(t.id, 'leibungWandAbgedichtet', false)}>Nein</button>
                                                                    </div>
                                                                </div>
                                                                <div className="umlaufend-group" style={{flex:'1 1 auto', minWidth:'90px'}}>
                                                                    <span className="umlaufend-label">Leibung Boden</span>
                                                                    <div className="ja-nein-btns">
                                                                        <button className={`ja-nein-btn ${t.leibungBodenAbgedichtet ? 'active ja' : ''}`}
                                                                            onClick={() => updateTuer(t.id, 'leibungBodenAbgedichtet', true)}>Ja</button>
                                                                        <button className={`ja-nein-btn ${!t.leibungBodenAbgedichtet ? 'active nein' : ''}`}
                                                                            onClick={() => updateTuer(t.id, 'leibungBodenAbgedichtet', false)}>Nein</button>
                                                                    </div>
                                                                </div>
                                                                <div className="umlaufend-group" style={{flex:'1 1 auto', minWidth:'90px'}}>
                                                                    <span className="umlaufend-label">Türsturz</span>
                                                                    <div className="ja-nein-btns">
                                                                        <button className={`ja-nein-btn ${t.sturzAbgedichtet ? 'active ja' : ''}`}
                                                                            onClick={() => updateTuer(t.id, 'sturzAbgedichtet', true)}>Ja</button>
                                                                        <button className={`ja-nein-btn ${!t.sturzAbgedichtet ? 'active nein' : ''}`}
                                                                            onClick={() => updateTuer(t.id, 'sturzAbgedichtet', false)}>Nein</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </React.Fragment>
                                                    )}
                                                </div>
                                            )}

                                            {/* ── Dauerelastisch versiegelt ── */}
                                            <div style={{marginTop:'10px'}}>
                                                <div className="umlaufend-group">
                                                    <span className="umlaufend-label">Dauerelastisch versiegelt (Stahlzarge)</span>
                                                    <div className="ja-nein-btns">
                                                        <button className={`ja-nein-btn ${t.dauerelastisch ? 'active ja' : ''}`}
                                                            onClick={() => updateTuer(t.id, 'dauerelastisch', true)}>Ja</button>
                                                        <button className={`ja-nein-btn ${!t.dauerelastisch ? 'active nein' : ''}`}
                                                            onClick={() => updateTuer(t.id, 'dauerelastisch', false)}>Nein</button>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* VOB-Tags */}
                                            <div style={{display:'flex', gap:'4px', flexWrap:'wrap', marginTop:'10px'}}>
                                                {hVal > H && H > 0 ? (
                                                    <span className="vob-tag abzug" style={{background:'rgba(230,126,34,0.12)', borderColor:'var(--accent-orange)', color:'var(--accent-orange)'}}>
                                                        ⚠ Tür {fmtDe(hVal)}m &gt; Fliese {fmtDe(H)}m → −{fmtDe(bVal * H)} m²
                                                    </span>
                                                ) : (
                                                    <span className={`vob-tag ${fl > 0.1 ? 'abzug' : 'ueber'}`}>
                                                        Wand: {fl > 0.1 ? `−${fmtDe(fl)} m²` : '⊘ überm.'}
                                                    </span>
                                                )}
                                                <span className="vob-tag ueber">Boden: ⊘ kein Abzug</span>
                                                <span className={`vob-tag ${bVal > 1.0 ? 'abzug' : 'ueber'}`}>
                                                    Sockel: {bVal > 1.0 ? `−${fmtDe(bVal)} m` : '⊘ überm.'}
                                                </span>
                                            </div>
                                            <button className="contact-remove-btn" onClick={() => removeTuer(t.id)}
                                                style={{marginTop:'10px', width:'100%', textAlign:'center', padding:'8px', color:'#e74c3c'}}>
                                                🗑 Tür entfernen
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <button className="add-abzug-btn" onClick={addTuer}>＋ Tür hinzufügen</button>
                    </div>

                    {/* ═══ FENSTER (eigene Sektion, aufklappbar) ═══ */}
                    <div className="masse-section">
                        <div className="masse-section-title" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <span>🪟 Fenster ({fenster.length})</span>
                            <div className="fenster-uebernehmen-toggle">
                                <span className="fenster-uebernehmen-label">Fenster</span>
                                <button className={`fenster-jn-btn ${fensterUebernehmen ? 'active' : ''}`}
                                    onClick={() => setFensterUebernehmen(true)}>Ja</button>
                                <button className={`fenster-jn-btn ${!fensterUebernehmen ? 'active nein' : ''}`}
                                    onClick={() => setFensterUebernehmen(false)}>Nein</button>
                            </div>
                        </div>
                        {fensterUebernehmen ? (<React.Fragment>
                        {fenster.map(f => {
                            const bVal = parseMass(f.breite); const hVal = parseMass(f.hoehe);
                            const fl = bVal * hVal;
                            return (
                                <div key={f.id} className={`oeffnung-card ${f.expanded ? 'expanded' : ''}`}>
                                    <div className="oeffnung-header" onClick={() => updateFenster(f.id, 'expanded', !f.expanded)}>
                                        <span className="oeffnung-icon">🪟</span>
                                        <div className="oeffnung-title">{f.name}</div>
                                        {fl > 0 && <span className="oeffnung-result">{fmtDe(fl)} m²</span>}
                                        <span className="pos-card-arrow">{f.expanded ? '▲' : '▼'}</span>
                                    </div>
                                    {f.expanded && (
                                        <div className="oeffnung-body">
                                            <div className="masse-field" style={{marginBottom:'8px'}}>
                                                <span className="masse-label">Bezeichnung</span>
                                                <input className="masse-input" type="text" value={f.name}
                                                    onChange={e => updateFenster(f.id, 'name', e.target.value)} />
                                            </div>
                                            {/* Anzahl-Multiplikator */}
                                            <div className="masse-field" style={{marginBottom:'8px'}}>
                                                <span className="masse-label">Anzahl (gleiche Fenster)</span>
                                                <div className="masse-input-wrap">
                                                    <input className="masse-input" type="number" min="1" step="1"
                                                        value={f.anzahl || 1}
                                                        onChange={e => updateFenster(f.id, 'anzahl', parseInt(e.target.value) || 1)}
                                                        style={{textAlign:'center', fontWeight:'700', color:'var(--accent-blue)'}} />
                                                    <span className="masse-unit">Stk</span>
                                                </div>
                                            </div>
                                            <div className="masse-grid">
                                                <div className="masse-field">
                                                    <span className="masse-label">Breite (m)</span>
                                                    <div className="masse-input-wrap">
                                                        <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000"
                                                            value={f.breite} onChange={e => updateFenster(f.id, 'breite', e.target.value)}
                                                            onBlur={() => { if (f.breite) updateFenster(f.id, 'breite', formatMass(f.breite)); }}
                                                            autoFocus={f.id === lastAddedFensterId}
                                                            onFocus={() => { if (f.id === lastAddedFensterId) setLastAddedFensterId(null); }} />
                                                        <span className="masse-unit">m</span>
                                                    </div>
                                                </div>
                                                <div className="masse-field">
                                                    <span className="masse-label">Höhe (m)</span>
                                                    <div className="masse-input-wrap">
                                                        <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000"
                                                            value={f.hoehe} onChange={e => updateFenster(f.id, 'hoehe', e.target.value)}
                                                            onBlur={() => { if (f.hoehe) updateFenster(f.id, 'hoehe', formatMass(f.hoehe)); }} />
                                                        <span className="masse-unit">m</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Brüstungshöhe + Bodengleich */}
                                            <div className="masse-grid" style={{marginTop:'8px'}}>
                                                <div className="masse-field">
                                                    <span className="masse-label">Brüstungshöhe (m)</span>
                                                    <div className="masse-input-wrap">
                                                        <input className="masse-input" type="text" inputMode="decimal"
                                                            placeholder={f.bodengleich ? '0,00' : '0,00'}
                                                            value={f.bruestung}
                                                            disabled={f.bodengleich}
                                                            style={f.bodengleich ? {opacity:0.5} : {}}
                                                            onChange={e => updateFenster(f.id, 'bruestung', e.target.value)}
                                                            onBlur={() => { if (f.bruestung) updateFenster(f.id, 'bruestung', formatMass(f.bruestung)); }} />
                                                        <span className="masse-unit">m</span>
                                                    </div>
                                                </div>
                                                <div className="masse-field" style={{display:'flex', alignItems:'flex-end'}}>
                                                    <button className={`bodengleich-btn ${f.bodengleich ? 'active' : ''}`}
                                                        onClick={() => updateFenster(f.id, 'bodengleich', !f.bodengleich)}>
                                                        {f.bodengleich ? '✓ ' : ''}Bodengleich
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Laibung */}
                                            <div className="oeffnung-toggle" style={{marginTop:'10px'}}>
                                                <label className="toggle-row">
                                                    <span>Laibung</span>
                                                    <div className={`toggle-switch ${f.hatLaibung ? 'active' : ''}`}
                                                        onClick={() => updateFenster(f.id, 'hatLaibung', !f.hatLaibung)}>
                                                        <div className="toggle-knob" />
                                                    </div>
                                                </label>
                                                {f.hatLaibung && (
                                                    <div className="masse-field" style={{marginTop:'8px'}}>
                                                        <span className="masse-label">Laibungstiefe (m)</span>
                                                        <div className="masse-input-wrap">
                                                            <input className="masse-input" type="text" inputMode="decimal" placeholder="0,000"
                                                                value={f.tiefe} onChange={e => updateFenster(f.id, 'tiefe', e.target.value)}
                                                                onBlur={() => { if (f.tiefe) updateFenster(f.id, 'tiefe', formatMass(f.tiefe)); }}
                                                                autoFocus={!f.tiefe} />
                                                            <span className="masse-unit">m</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Neue Schalter: Gefliest ── */}
                                            {f.hatLaibung && (
                                                <div style={{marginTop:'10px', padding:'10px', background:'rgba(230,126,34,0.04)', borderRadius:'var(--radius-sm)', border:'1px solid rgba(230,126,34,0.12)'}}>
                                                    <div style={{fontSize:'11px', color:'var(--accent-orange)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px'}}>🧱 Gefliest</div>
                                                    <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                                                        <div className="umlaufend-group" style={{flex:'1 1 auto', minWidth:'90px'}}>
                                                            <span className="umlaufend-label">Leibung Wand</span>
                                                            <div className="ja-nein-btns">
                                                                <button className={`ja-nein-btn ${f.leibungWandGefliest ? 'active ja' : ''}`}
                                                                    onClick={() => updateFenster(f.id, 'leibungWandGefliest', true)}>Ja</button>
                                                                <button className={`ja-nein-btn ${!f.leibungWandGefliest ? 'active nein' : ''}`}
                                                                    onClick={() => updateFenster(f.id, 'leibungWandGefliest', false)}>Nein</button>
                                                            </div>
                                                        </div>
                                                        <div className="umlaufend-group" style={{flex:'1 1 auto', minWidth:'90px'}}>
                                                            <span className="umlaufend-label">Fensterbank</span>
                                                            <div className="ja-nein-btns">
                                                                <button className={`ja-nein-btn ${f.fensterbankGefliest ? 'active ja' : ''}`}
                                                                    onClick={() => updateFenster(f.id, 'fensterbankGefliest', true)}>Ja</button>
                                                                <button className={`ja-nein-btn ${!f.fensterbankGefliest ? 'active nein' : ''}`}
                                                                    onClick={() => updateFenster(f.id, 'fensterbankGefliest', false)}>Nein</button>
                                                            </div>
                                                        </div>
                                                        <div className="umlaufend-group" style={{flex:'1 1 auto', minWidth:'90px'}}>
                                                            <span className="umlaufend-label">Fenstersturz</span>
                                                            <div className="ja-nein-btns">
                                                                <button className={`ja-nein-btn ${f.sturzGefliest ? 'active ja' : ''}`}
                                                                    onClick={() => updateFenster(f.id, 'sturzGefliest', true)}>Ja</button>
                                                                <button className={`ja-nein-btn ${!f.sturzGefliest ? 'active nein' : ''}`}
                                                                    onClick={() => updateFenster(f.id, 'sturzGefliest', false)}>Nein</button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Abdichtung (nur wenn Abdichtungs-Position vorhanden) */}
                                                    {hatWandabdichtung && (
                                                        <React.Fragment>
                                                            <div style={{fontSize:'11px', color:'var(--accent-blue)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginTop:'10px', marginBottom:'8px'}}>💧 Abgedichtet</div>
                                                            <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                                                                <div className="umlaufend-group" style={{flex:'1 1 auto', minWidth:'90px'}}>
                                                                    <span className="umlaufend-label">Leibung Wand</span>
                                                                    <div className="ja-nein-btns">
                                                                        <button className={`ja-nein-btn ${f.leibungWandAbgedichtet ? 'active ja' : ''}`}
                                                                            onClick={() => updateFenster(f.id, 'leibungWandAbgedichtet', true)}>Ja</button>
                                                                        <button className={`ja-nein-btn ${!f.leibungWandAbgedichtet ? 'active nein' : ''}`}
                                                                            onClick={() => updateFenster(f.id, 'leibungWandAbgedichtet', false)}>Nein</button>
                                                                    </div>
                                                                </div>
                                                                <div className="umlaufend-group" style={{flex:'1 1 auto', minWidth:'90px'}}>
                                                                    <span className="umlaufend-label">Fensterbank</span>
                                                                    <div className="ja-nein-btns">
                                                                        <button className={`ja-nein-btn ${f.fensterbankAbgedichtet ? 'active ja' : ''}`}
                                                                            onClick={() => updateFenster(f.id, 'fensterbankAbgedichtet', true)}>Ja</button>
                                                                        <button className={`ja-nein-btn ${!f.fensterbankAbgedichtet ? 'active nein' : ''}`}
                                                                            onClick={() => updateFenster(f.id, 'fensterbankAbgedichtet', false)}>Nein</button>
                                                                    </div>
                                                                </div>
                                                                <div className="umlaufend-group" style={{flex:'1 1 auto', minWidth:'90px'}}>
                                                                    <span className="umlaufend-label">Fenstersturz</span>
                                                                    <div className="ja-nein-btns">
                                                                        <button className={`ja-nein-btn ${f.sturzAbgedichtet ? 'active ja' : ''}`}
                                                                            onClick={() => updateFenster(f.id, 'sturzAbgedichtet', true)}>Ja</button>
                                                                        <button className={`ja-nein-btn ${!f.sturzAbgedichtet ? 'active nein' : ''}`}
                                                                            onClick={() => updateFenster(f.id, 'sturzAbgedichtet', false)}>Nein</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </React.Fragment>
                                                    )}
                                                </div>
                                            )}
                                            {/* VOB-Tags */}
                                            {(() => {
                                                const brH = parseMass(f.bruestung);
                                                const gesamt = brH + hVal;
                                                const hoeherAlsFliese = gesamt > H && H > 0;
                                                const effH = hoeherAlsFliese ? Math.max(0, hVal - (gesamt - H)) : hVal;
                                                const effFl = effH * bVal;
                                                return (
                                                    <div style={{display:'flex', gap:'4px', flexWrap:'wrap', marginTop:'10px'}}>
                                                        {hoeherAlsFliese ? (
                                                            <span className="vob-tag abzug" style={{background:'rgba(230,126,34,0.12)', borderColor:'var(--accent-orange)', color:'var(--accent-orange)'}}>
                                                                ⚠ Gesamt {fmtDe(gesamt)}m &gt; Fliese {fmtDe(H)}m → −{fmtDe(effFl)} m²
                                                            </span>
                                                        ) : (
                                                            <span className={`vob-tag ${fl > 0.1 ? 'abzug' : 'ueber'}`}>
                                                                Wand: {fl > 0.1 ? `−${fmtDe(fl)} m²` : '⊘ überm.'}
                                                            </span>
                                                        )}
                                                        <span className="vob-tag ueber">Boden: ⊘ kein Abzug</span>
                                                    </div>
                                                );
                                            })()}
                                            <button className="contact-remove-btn" onClick={() => removeFenster(f.id)}
                                                style={{marginTop:'10px', width:'100%', textAlign:'center', padding:'8px', color:'#e74c3c'}}>
                                                🗑 Fenster entfernen
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <button className="add-abzug-btn" onClick={addFenster}>＋ Fenster hinzufügen</button>
                        </React.Fragment>) : (
                            <div style={{padding:'12px 16px', color:'var(--text-muted)', fontSize:'12px', fontStyle:'italic', textAlign:'center', background:'rgba(231,76,60,0.06)', borderRadius:'8px', margin:'8px 0'}}>
                                🔒 Fenster deaktiviert – {fenster.length} Einträge gespeichert, nicht in Berechnung
                            </div>
                        )}
                    </div>

                    {/* ═══ SONSTIGE ABZÜGE/ZURECHNUNGEN ═══ */}
                    <div className="masse-section">
                        <div className="masse-section-title" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <span>➖➕ Sonstige Bauteile ({abzuege.length})</span>
                            <div className="fenster-uebernehmen-toggle">
                                <span className="fenster-uebernehmen-label">Sonstige Bauteile</span>
                                <button className={`fenster-jn-btn ${sonstigeUebernehmen ? 'active' : ''}`}
                                    onClick={() => setSonstigeUebernehmen(true)}>Ja</button>
                                <button className={`fenster-jn-btn ${!sonstigeUebernehmen ? 'active nein' : ''}`}
                                    onClick={() => setSonstigeUebernehmen(false)}>Nein</button>
                            </div>
                        </div>
                        {sonstigeUebernehmen ? (<React.Fragment>
                        {abzuege.map(a => {
                            const bVal = parseMass(a.breite); const hVal = parseMass(a.hoehe); const tVal = parseMass(a.tiefe || '');
                            const fl = a.manualRW ? Math.abs(a.manualRW.ergebnis) : (tVal > 0 ? bVal * hVal * tVal : bVal * hVal);
                            const zuordnungen = a.posZuordnung || {};
                            const zuordKeys = Object.keys(zuordnungen);
                            const plusPosNr = zuordKeys.filter(k => zuordnungen[k].vorzeichen === 'plus');
                            const minusPosNr = zuordKeys.filter(k => zuordnungen[k].vorzeichen === 'minus');
                            return (
                                <div className="abzug-item" key={a.id} style={{flexDirection:'column', alignItems:'stretch', gap:'6px'}}>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                        <span style={{fontSize:'18px'}}>🔧</span>
                                        <div className="abzug-info" style={{flex:1}}>
                                            <div className="abzug-name">{a.name || 'Sonstige'}</div>
                                            {fl > 0 && <div className="abzug-masse" style={{fontSize:'11px'}}>Standardmaß: {fmtDe(fl)} m²</div>}
                                        </div>
                                        <button style={{background:'none', border:'1px solid var(--accent-orange)', borderRadius:'5px', color:'var(--accent-orange)', fontSize:'13px', padding:'4px 10px', cursor:'pointer', fontWeight:600, marginRight:'4px'}}
                                            onClick={() => openEditAbzug(a)}>✏️</button>
                                        <button className="contact-remove-btn" onClick={() => removeAbzug(a.id)} style={{marginTop:0}}>✕</button>
                                    </div>
                                    {zuordKeys.length > 0 && (
                                        <div style={{display:'flex', flexWrap:'wrap', gap:'4px', paddingLeft:'28px'}}>
                                            {plusPosNr.map(nr => {
                                                const rw = zuordnungen[nr].manualRW;
                                                const wert = rw ? fmtDe(Math.abs(rw.ergebnis)) : (fl > 0 ? fmtDe(fl) : '--');
                                                return (
                                                    <span key={nr} style={{fontSize:'11px', padding:'2px 6px', borderRadius:'3px',
                                                        background:'rgba(39,174,96,0.12)', color:'#27ae60', fontWeight:600}}>
                                                        +{wert} → Pos.{nr}
                                                    </span>
                                                );
                                            })}
                                            {minusPosNr.map(nr => {
                                                const rw = zuordnungen[nr].manualRW;
                                                const wert = rw ? fmtDe(Math.abs(rw.ergebnis)) : (fl > 0 ? fmtDe(fl) : '--');
                                                return (
                                                    <span key={nr} style={{fontSize:'11px', padding:'2px 6px', borderRadius:'3px',
                                                        background:'rgba(231,76,60,0.12)', color:'#e74c3c', fontWeight:600}}>
                                                        −{wert} → Pos.{nr}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <button className="add-abzug-btn" onClick={() => { setEditAbzugId(null); setAbzugForm({ name: '', breite: '', hoehe: '', tiefe: '', posZuordnung: {}, manualRW: null }); setShowAbzugModal(true); }}>
                            ＋ Sonstiges Bauteil hinzufügen
                        </button>
                        </React.Fragment>) : (
                            <div style={{padding:'12px 16px', color:'var(--text-muted)', fontSize:'12px', fontStyle:'italic', textAlign:'center', background:'rgba(231,76,60,0.06)', borderRadius:'8px', margin:'8px 0'}}>
                                🔒 Sonstige Bauteile deaktiviert – {abzuege.length} Einträge gespeichert, nicht in Berechnung
                            </div>
                        )}
                    </div>

                    </React.Fragment>)}

                    {/* ═══ TAB 3: POSITIONEN ═══ */}
                    {rbTab === 3 && (<React.Fragment>

                    {/* Positions-Schnellfilter (bei > 5 Positionen) */}
                    {posCards.length > 5 && (
                        <div style={{
                            display:'flex', gap:'4px', marginBottom:'10px',
                            background:'var(--bg-tertiary)', borderRadius:'8px',
                            padding:'3px', fontSize:'11px'
                        }}>
                            {[
                                {key:'alle', label:'Alle (' + posCards.length + ')'},
                                {key:'berechnet', label:'Berechnet'},
                                {key:'leer', label:'Offen'},
                                {key:'manuell', label:'Manuell'}
                            ].map(f => (
                                <button key={f.key}
                                    className={'ja-nein-btn ' + (posFilter === f.key ? 'active ja' : '')}
                                    onClick={() => setPosFilter(f.key)}
                                    style={{flex:1, padding:'5px 4px', fontSize:'10px'}}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ═══════════════════════════════════════
                       POSITIONS-KARTEN (aus Raumerkennung uebernommen)
                       ═══════════════════════════════════════ */}
                    <div className="masse-section">
                        <div className="masse-section-title">📋 Positionen ({posCards.length})</div>
                        {posCards.length === 0 && (
                            <div style={{fontSize:'13px', color:'var(--text-muted)', fontStyle:'italic', padding:'12px 0'}}>
                                Keine Positionen ausgewaehlt - zurueck zur Raumerkennung um Positionen zuzuweisen.
                            </div>
                        )}
                        {filteredPosCards.map(pos => {
                            const isExpanded = expandedPos === pos.pos;
                            const result = calcPositionResult(pos);
                            const hasResult = result > 0;
                            return (
                                <div key={pos.pos} className={`pos-card ${isExpanded ? 'expanded' : ''}`}>
                                    <div className="pos-card-header" onClick={() => toggleExpand(pos.pos)}>
                                        <span className="pos-card-nr">{pos.pos}</span>
                                        <div className="pos-card-bez">{pos.bez}</div>
                                        {hasResult && <span className="pos-card-result">{fmtDe(result)} {pos.einheit}</span>}
                                        <button onClick={function(e) { e.stopPropagation(); removePosCard(pos.pos); }}
                                            style={{background:'none', border:'none', color:'#e74c3c', fontSize:'14px', cursor:'pointer', padding:'4px 6px', marginLeft:'4px', opacity:0.6}}
                                            title="Position entfernen">🗑️</button>
                                        <span className="pos-card-arrow">{isExpanded ? '▲' : '▼'}</span>
                                    </div>
                                    {isExpanded && (
                                        <div className="pos-card-body">
                                            {/* ═══ VOB/C RECHENWEG (immer sichtbar) ═══ */}
                                            {!pos.hasManualRW ? (() => {
                                                const rawSteps = buildRechenweg(pos);
                                                const rwSteps = enrichRechenweg(rawSteps);
                                                const einh = pos.einheit || 'm²';
                                                const editSteps = posRechenwegEdits[pos.pos];
                                                const isEditMode = !!editSteps;

                                                // Stift aktivieren: Auto-Schritte in editierbares Format konvertieren
                                                const activateEdit = () => {
                                                    const editable = rwSteps
                                                        .filter(st => st.type !== 'total' && st.sign !== 0)
                                                        .map((st, i) => {
                                                            // Formel evaluierbar machen
                                                            let formelText = st.formel || '';
                                                            let cleanF = formelText.replace(/,/g, '.').replace(/×/g, '*').replace(/[^0-9+\-*/.() ]/g, '');
                                                            let isEval = false;
                                                            try { const r = new Function('return ' + cleanF)(); isEval = typeof r === 'number' && !isNaN(r) && cleanF.trim().length > 0; } catch(e) {}
                                                            if (!isEval) formelText = fmtDe(st.value || 0);
                                                            return { id: 'step_' + i, label: st.label || '', formel: formelText, sign: st.sign || 1 };
                                                        });
                                                    setPosRechenwegEdits(p => ({...p, [pos.pos]: editable}));
                                                };

                                                // Editierten Rechenweg: Ergebnis berechnen
                                                let editTotal = 0;
                                                if (editSteps) {
                                                    editSteps.forEach(st => {
                                                        editTotal += parseFormel(st.formel) * (st.sign || 1);
                                                    });
                                                    editTotal = Math.max(0, editTotal);
                                                }

                                                return (<React.Fragment>
                                                {/* ── Stift-Toolbar ── */}
                                                <div className={`rw-edit-toolbar ${isEditMode ? 'active' : ''}`}>
                                                    <button className={`rw-edit-toggle ${isEditMode ? 'active' : ''}`}
                                                        onClick={e => { e.stopPropagation(); if (!isEditMode) activateEdit(); else setPosRechenwegEdits(p => { const n={...p}; delete n[pos.pos]; return n; }); }}>
                                                        <span className="stift-icon">✏️</span>
                                                        {isEditMode ? 'Bearbeitung aktiv' : 'Rechenweg bearbeiten'}
                                                    </button>
                                                    {isEditMode && (
                                                        <button className="rw-edit-reset-btn"
                                                            onClick={() => setPosRechenwegEdits(p => { const n={...p}; delete n[pos.pos]; return n; })}>
                                                            ↺ Zurück zu Auto
                                                        </button>
                                                    )}
                                                </div>

                                                {isEditMode ? (
                                                    /* ── EDIT-MODUS: Rechenweg bearbeiten ── */
                                                    <div className="rechenweg-container" style={{borderLeftColor:'var(--accent-orange)'}}>
                                                        <div className="rechenweg-header">
                                                            <span className="rechenweg-badge" style={{background:'rgba(230,126,34,0.12)', color:'var(--accent-orange)'}}>✏️ Rechenweg bearbeiten</span>
                                                            <span style={{fontSize:'11px', color:'var(--text-muted)'}}>{(pos.kategorie && pos.kategorie.toUpperCase()) || '--'}</span>
                                                        </div>
                                                        {editSteps.map((step, idx) => {
                                                            const stepVal = parseFormel(step.formel);
                                                            const stepResult = stepVal * (step.sign || 1);
                                                            return (
                                                            <div key={step.id} className={`rechenweg-step ${step.sign < 0 ? 'abzug' : ''}`} style={{display:'flex', flexDirection:'column', gap:'4px', padding:'6px 0'}}>
                                                                <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                                                                    {/* Vorzeichen-Toggle */}
                                                                    <button style={{
                                                                        width:'26px', height:'26px', borderRadius:'4px', border:'1px solid var(--border-color)',
                                                                        background: step.sign < 0 ? 'rgba(231,76,60,0.15)' : 'rgba(39,174,96,0.15)',
                                                                        color: step.sign < 0 ? 'var(--accent-red)' : '#27ae60',
                                                                        cursor:'pointer', fontWeight:700, fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
                                                                    }} onClick={() => {
                                                                        const newSteps = [...editSteps];
                                                                        newSteps[idx] = {...step, sign: step.sign < 0 ? 1 : -1};
                                                                        setPosRechenwegEdits(p => ({...p, [pos.pos]: newSteps}));
                                                                    }}>{step.sign < 0 ? '−' : '+'}</button>
                                                                    {/* Label */}
                                                                    <input type="text" value={step.label}
                                                                        style={{flex:1, background:'var(--bg-primary)', border:'1px solid var(--border-color)', borderRadius:'4px',
                                                                            color:'var(--text-white)', fontFamily:'Oswald', fontSize:'12px', padding:'4px 8px', outline:'none', minWidth:0}}
                                                                        placeholder="Bezeichnung..."
                                                                        onChange={e => {
                                                                            const newSteps = [...editSteps];
                                                                            newSteps[idx] = {...step, label: e.target.value};
                                                                            setPosRechenwegEdits(p => ({...p, [pos.pos]: newSteps}));
                                                                        }} />
                                                                    {/* Löschen */}
                                                                    <button style={{width:'26px', height:'26px', borderRadius:'4px', border:'1px solid var(--border-color)',
                                                                        background:'rgba(231,76,60,0.08)', color:'var(--accent-red)', cursor:'pointer', fontSize:'14px',
                                                                        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}
                                                                        onClick={() => {
                                                                            const newSteps = editSteps.filter((_, i) => i !== idx);
                                                                            setPosRechenwegEdits(p => ({...p, [pos.pos]: newSteps}));
                                                                        }}>✕</button>
                                                                </div>
                                                                <div style={{display:'flex', alignItems:'center', gap:'6px', paddingLeft:'32px'}}>
                                                                    {/* Formel-Eingabe */}
                                                                    <input type="text" value={step.formel}
                                                                        style={{flex:1, background:'var(--bg-primary)', border:'1px solid var(--accent-orange)', borderRadius:'4px',
                                                                            color:'var(--text-white)', fontFamily:'Oswald', fontWeight:600, fontSize:'13px', padding:'4px 8px', outline:'none', minWidth:0}}
                                                                        placeholder="z.B. 3,45+2,10 oder 4*1,95"
                                                                        onChange={e => {
                                                                            const newSteps = [...editSteps];
                                                                            newSteps[idx] = {...step, formel: e.target.value};
                                                                            setPosRechenwegEdits(p => ({...p, [pos.pos]: newSteps}));
                                                                        }} />
                                                                    {/* Berechnetes Ergebnis */}
                                                                    <span style={{fontFamily:'Oswald', fontWeight:600, fontSize:'13px', minWidth:'70px', textAlign:'right',
                                                                        color: step.sign < 0 ? 'var(--accent-red)' : 'var(--text-white)'}}>
                                                                        {step.sign < 0 ? '−' : ''}{fmtDe(stepVal)} {einh}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            );
                                                        })}
                                                        {/* Zeile hinzufügen */}
                                                        <button style={{
                                                            width:'100%', padding:'8px', marginTop:'6px', border:'1px dashed var(--accent-orange)',
                                                            borderRadius:'6px', background:'rgba(230,126,34,0.05)', color:'var(--accent-orange)',
                                                            cursor:'pointer', fontFamily:'Oswald', fontWeight:500, fontSize:'13px'
                                                        }} onClick={() => {
                                                            const newId = 'step_' + Date.now();
                                                            setPosRechenwegEdits(p => ({...p, [pos.pos]: [...(p[pos.pos]||[]), {id: newId, label: '', formel: '', sign: 1}]}));
                                                        }}>+ Zeile hinzufügen</button>
                                                        {/* ERGEBNIS */}
                                                        <div className="rechenweg-step total" style={{marginTop:'8px'}}>
                                                            <div className="rechenweg-step-label">ERGEBNIS</div>
                                                            <div className="rechenweg-step-ergebnis total">{fmtDe(editTotal)} {einh}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* ── AUTO-MODUS: Normaler Rechenweg ── */
                                                    <div className="rechenweg-container">
                                                        <div className="rechenweg-header">
                                                            <span className="rechenweg-badge">VOB/C DIN 18352</span>
                                                            <span style={{fontSize:'11px', color:'var(--text-muted)'}}>{(pos.kategorie && pos.kategorie.toUpperCase()) || '--'}</span>
                                                        </div>
                                                        {rwSteps.map((step, idx) => (
                                                            <div key={idx} className={`rechenweg-step ${step.type || ''}`}>
                                                                <div className="rechenweg-step-label">{step.label}</div>
                                                                {step.formel && <div className="rechenweg-step-formel">{step.formel}</div>}
                                                                <div className={`rechenweg-step-ergebnis ${step.type || ''}`}>{step.ergebnis}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                </React.Fragment>);
                                            })() : (
                                                /* Manueller Rechenweg wurde fertiggestellt → anzeigen */
                                                <div className="rechenweg-container manual">
                                                    <div className="rechenweg-header">
                                                        <span className="rechenweg-badge" style={{background:'rgba(39,174,96,0.12)', color:'#27ae60'}}>✏️ Manueller Rechenweg</span>
                                                        <button style={{fontSize:'11px', color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline'}}
                                                            onClick={() => resetManualRW(pos.pos)}>
                                                            Zurück zu Auto
                                                        </button>
                                                    </div>
                                                    {pos.manualRechenweg.map(z => {
                                                        const val = parseRWZeile(z.text);
                                                        return (
                                                            <div key={z.id} className={`rechenweg-step ${z.vorzeichen === 'minus' ? 'abzug' : ''}`}>
                                                                <div className="rechenweg-step-label">
                                                                    {z.vorzeichen === 'minus' ? '− ' : '+ '}{z.text}
                                                                </div>
                                                                <div className={`rechenweg-step-ergebnis ${z.vorzeichen === 'minus' ? 'abzug' : ''}`}>
                                                                    {z.vorzeichen === 'minus' ? '−' : ''}{fmtDe(val)} {pos.einheit}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="rechenweg-step total">
                                                        <div className="rechenweg-step-label">ERGEBNIS</div>
                                                        <div className="rechenweg-step-ergebnis total">{fmtDe(pos.manualErgebnis)} {pos.einheit}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* KI-Foto-Vorschlag (wenn vorhanden) */}
                                            {(() => {
                                                const kiSugg = getKiSuggestion(pos);
                                                if (!kiSugg) return null;
                                                return (
                                                    <div style={{
                                                        margin:'8px 0', padding:'8px 12px',
                                                        background:'rgba(30,136,229,0.06)',
                                                        border:'1px solid rgba(30,136,229,0.2)',
                                                        borderRadius:'8px', fontSize:'12px'
                                                    }}>
                                                        <div style={{
                                                            display:'flex', justifyContent:'space-between',
                                                            alignItems:'center'
                                                        }}>
                                                            <span style={{color:'var(--accent-blue)'}}>
                                                                {kiSugg.label}
                                                            </span>
                                                            <span style={{
                                                                fontFamily:'Oswald', fontWeight:700,
                                                                color:'var(--accent-blue)'
                                                            }}>
                                                                {fmtDe(kiSugg.wert)} {kiSugg.einheit}
                                                            </span>
                                                        </div>
                                                        <button style={{
                                                            marginTop:'6px', width:'100%', padding:'6px',
                                                            background:'rgba(30,136,229,0.1)',
                                                            border:'1px solid rgba(30,136,229,0.3)',
                                                            borderRadius:'6px', color:'var(--accent-blue)',
                                                            fontSize:'11px', fontWeight:600, cursor:'pointer'
                                                        }} onClick={() => applyKiSuggestion(pos, kiSugg)}>
                                                            Uebernehmen als manuelles Ergebnis
                                                        </button>
                                                    </div>
                                                );
                                            })()}

                                            {/* Button: Manuell bearbeiten - oeffnet Modal */}
                                            <button className="rw-manual-btn" onClick={() => openRWModal(pos)}>
                                                ✏️ {pos.hasManualRW ? 'Rechenweg bearbeiten' : 'Manuellen Rechenweg eingeben'}
                                            </button>

                                            {/* Notizen */}
                                            <div className="masse-field" style={{marginTop:'8px'}}>
                                                <span className="masse-label">Notizen</span>
                                                <textarea
                                                    style={{
                                                        width:'100%', padding:'8px 10px', background:'var(--bg-primary)',
                                                        border:'1px solid var(--border-color)', borderRadius:'var(--radius-sm)',
                                                        color:'var(--text-white)', fontFamily:'Source Sans 3, sans-serif',
                                                        fontSize:'13px', resize:'vertical', minHeight:'36px', outline:'none'
                                                    }}
                                                    placeholder="Notizen zu dieser Position..."
                                                    value={pos.notizen}
                                                    onChange={e => updatePosCard(pos.pos, 'notizen', e.target.value)}
                                                />
                                            </div>

                                            {/* Ergebnis-Zusammenfassung */}
                                            <div className="berechnung-total" style={{marginTop:'8px'}}>
                                                <span className="berechnung-total-label">Pos. {pos.pos}</span>
                                                <span className="berechnung-total-wert">
                                                    {pos.hasManualRW && <span style={{fontSize:'10px', color:'#27ae60', marginRight:'6px'}}>✏️</span>}
                                                    {fmtDe(result)} {pos.einheit}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Gesamtübersicht */}
                    {posCards.length > 0 && (
                        <div className="berechnung-card">
                            <div className="masse-section-title">🧮 Raum-Zusammenfassung</div>
                            {posCards.map(pos => {
                                const result = calcPositionResult(pos);
                                const isManual = pos.hasManualRW && pos.manualRechenweg.length > 0;
                                return (
                                    <div className="zusammenfassung-pos" key={pos.pos}>
                                        <div className="berechnung-row">
                                            <div>
                                                <div className="berechnung-label">
                                                    Pos. {pos.pos}
                                                    {isManual && <span className="rw-source-tag manual">✏️ Manuell</span>}
                                                    {!isManual && result > 0 && <span className="rw-source-tag auto">🤖 VOB</span>}
                                                </div>
                                                <div className="berechnung-formel">{pos.bez}</div>
                                            </div>
                                            <span className="berechnung-wert">{fmtDe(result)} {pos.einheit}</span>
                                        </div>
                                        {isManual && (
                                            <div className="zusammenfassung-rw">
                                                {pos.manualRechenweg.map(z => {
                                                    const val = parseRWZeile(z.text);
                                                    if (val === 0) return null;
                                                    return (
                                                        <div key={z.id} className="zusammenfassung-rw-zeile">
                                                            <span className="zusammenfassung-rw-bez">
                                                                {z.vorzeichen === 'minus' ? '− ' : '+ '}{z.text}
                                                            </span>
                                                            <span className={`zusammenfassung-rw-erg ${z.vorzeichen}`}>
                                                                {z.vorzeichen === 'minus' ? '−' : ''}{fmtDe(val)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Action Buttons */}
                    {/* ═══ ACTION BUTTONS ═══ */}
                    <div className="raum-action-grid">
                        {/* Raumblatt fertigstellen */}
                        <button className="raum-action-btn finish" onClick={() => handleFinishRaumValidated(() => {
                            // Alle Einstellungen sammeln
                            const tuerenEntries = tueren.length > 0 ? tueren.map(t => ({...t})) : null;
                            const tuerDefaults = tueren.length > 0 ? {
                                breite: tueren[0].breite || "", hoehe: tueren[0].hoehe || "", tiefe: tueren[0].tiefe || "",
                                hatLaibung: tueren[0].hatLaibung || false,
                                dauerelastisch: tueren[0].dauerelastisch,
                                leibungWandGefliest: tueren[0].leibungWandGefliest,
                                leibungBodenGefliest: tueren[0].leibungBodenGefliest,
                                sturzGefliest: tueren[0].sturzGefliest,
                                leibungWandAbgedichtet: tueren[0].leibungWandAbgedichtet,
                                leibungBodenAbgedichtet: tueren[0].leibungBodenAbgedichtet,
                                sturzAbgedichtet: tueren[0].sturzAbgedichtet,
                            } : null;
                            const fensterDefaults = (fensterUebernehmen && fenster.length > 0) ? {
                                breite: fenster[0].breite || "", hoehe: fenster[0].hoehe || "", tiefe: fenster[0].tiefe || "",
                                bruestung: fenster[0].bruestung || "", hatLaibung: fenster[0].hatLaibung || false, bodengleich: fenster[0].bodengleich || false,
                                leibungWandGefliest: fenster[0].leibungWandGefliest,
                                fensterbankGefliest: fenster[0].fensterbankGefliest,
                                sturzGefliest: fenster[0].sturzGefliest,
                                leibungWandAbgedichtet: fenster[0].leibungWandAbgedichtet,
                                fensterbankAbgedichtet: fenster[0].fensterbankAbgedichtet,
                                sturzAbgedichtet: fenster[0].sturzAbgedichtet,
                            } : null;
                            const fensterEntries = (fensterUebernehmen && fenster.length > 0) ? fenster.map(f => ({...f})) : null;
                            const sonstigeDefaults = (sonstigeUebernehmen && abzuege.length > 0) ? abzuege.map(a => ({...a})) : null;
                            // Alle Positionen mit Ergebnissen sammeln
                            const positionenMitErgebnis = posCards.map(pos => {
                                const rawSteps = buildRechenweg(pos);
                                const rwSteps = enrichRechenweg(rawSteps);
                                const editSteps = posRechenwegEdits[pos.pos] || null;
                                return {
                                    pos: pos.pos, bez: pos.bez, einheit: pos.einheit,
                                    kategorie: pos.kategorie,
                                    ergebnis: calcPositionResult(pos),
                                    rechenwegSteps: rwSteps,
                                    hasManualRW: pos.hasManualRW || false,
                                    manualRechenweg: pos.manualRechenweg || [],
                                    manualErgebnis: pos.manualErgebnis || 0,
                                    manualMenge: pos.manualMenge || '',
                                    posRechenwegEdit: editSteps,
                                    tags: pos.tags || []
                                };
                            });
                            // Kompletten Raumzustand für spätere Bearbeitung speichern
                            const raumState = {
                                masse: { ...masse }, wandMasse: wandMasse.map(w => ({...w})),
                                tueren: tueren.map(t => ({...t})), fenster: fenster.map(f => ({...f})),
                                abzuege: abzuege.map(a => ({...a})), posCards: posCards.map(p => ({...p})),
                                posRechenwegEdits: {...posRechenwegEdits},
                                fliesenUmlaufend, abdichtungUmlaufend, fliesenDeckenhoch, abdichtungDeckenhoch,
                                bodenPlusTuerlaibung, fensterUebernehmen, sonstigeUebernehmen,
                                raumhoehe: masse.raumhoehe,
                                phasenFotos: phasenFotos, objektFotos: objektFotos,
                                kiErgebnisse: kiErgebnisse,
                                kiFotoErgebnisse: kiFotoErgebnisse
                            };
                            const raumName = (raum && raum.name) || (raum && raum.nr) || 'Raum';
                            onFinishRaum((raum && raum.nr), {
                                raumName,
                                positionen: positionenMitErgebnis,
                                raumState,
                                masse: { ...masse },
                                tuerDefaults, fensterDefaults, sonstigeDefaults,
                                tuerenEntries, fensterEntries,
                                fliesenUmlaufend, abdichtungUmlaufend,
                                fliesenDeckenhoch, abdichtungDeckenhoch,
                                bodenPlusTuerlaibung
                            });
                        })}>
                            <span className="btn-icon">✅</span>
                            <span className="btn-text">
                                Raumblatt fertiggestellt
                                <span className="btn-sub">Aufmass vom Raumblatt erstellt und abgespeichert - Naechster Raum</span>
                            </span>
                        </button>

                        {/* Gesamtliste anzeigen */}
                        <button className="raum-action-btn" onClick={onShowGesamtliste}>
                            <span className="btn-icon">📋</span>
                            <span className="btn-text">
                                Übersicht der Gesamtliste
                                <span className="btn-sub">{(gesamtliste || []).length} {(gesamtliste || []).length === 1 ? 'Raum' : 'Räume'} fertiggestellt</span>
                            </span>
                        </button>

                        {/* Aufmass fertigstellen (gesamt) */}
                        <button className="raum-action-btn complete" onClick={() => handleFinishRaumValidated(() => {
                            // Erst aktuellen Raum fertigstellen
                            const tuerenEntries = tueren.length > 0 ? tueren.map(t => ({...t})) : null;
                            const tuerDefaults = tueren.length > 0 ? {
                                breite: tueren[0].breite || "", hoehe: tueren[0].hoehe || "", tiefe: tueren[0].tiefe || "",
                                hatLaibung: tueren[0].hatLaibung || false,
                                dauerelastisch: tueren[0].dauerelastisch,
                                leibungWandGefliest: tueren[0].leibungWandGefliest,
                                leibungBodenGefliest: tueren[0].leibungBodenGefliest,
                                sturzGefliest: tueren[0].sturzGefliest,
                                leibungWandAbgedichtet: tueren[0].leibungWandAbgedichtet,
                                leibungBodenAbgedichtet: tueren[0].leibungBodenAbgedichtet,
                                sturzAbgedichtet: tueren[0].sturzAbgedichtet,
                            } : null;
                            const fensterDefaults = (fensterUebernehmen && fenster.length > 0) ? {
                                breite: fenster[0].breite || "", hoehe: fenster[0].hoehe || "", tiefe: fenster[0].tiefe || "",
                                bruestung: fenster[0].bruestung || "", hatLaibung: fenster[0].hatLaibung || false, bodengleich: fenster[0].bodengleich || false,
                                leibungWandGefliest: fenster[0].leibungWandGefliest,
                                fensterbankGefliest: fenster[0].fensterbankGefliest,
                                sturzGefliest: fenster[0].sturzGefliest,
                                leibungWandAbgedichtet: fenster[0].leibungWandAbgedichtet,
                                fensterbankAbgedichtet: fenster[0].fensterbankAbgedichtet,
                                sturzAbgedichtet: fenster[0].sturzAbgedichtet,
                            } : null;
                            const fensterEntries = (fensterUebernehmen && fenster.length > 0) ? fenster.map(f => ({...f})) : null;
                            const sonstigeDefaults = (sonstigeUebernehmen && abzuege.length > 0) ? abzuege.map(a => ({...a})) : null;
                            const positionenMitErgebnis = posCards.map(pos => {
                                const rawSteps = buildRechenweg(pos);
                                const rwSteps = enrichRechenweg(rawSteps);
                                const editSteps = posRechenwegEdits[pos.pos] || null;
                                return {
                                    pos: pos.pos, bez: pos.bez, einheit: pos.einheit,
                                    kategorie: pos.kategorie,
                                    ergebnis: calcPositionResult(pos),
                                    rechenwegSteps: rwSteps,
                                    hasManualRW: pos.hasManualRW || false,
                                    manualRechenweg: pos.manualRechenweg || [],
                                    manualErgebnis: pos.manualErgebnis || 0,
                                    manualMenge: pos.manualMenge || '',
                                    posRechenwegEdit: editSteps,
                                    tags: pos.tags || []
                                };
                            });
                            const raumState = {
                                masse: { ...masse }, wandMasse: wandMasse.map(w => ({...w})),
                                tueren: tueren.map(t => ({...t})), fenster: fenster.map(f => ({...f})),
                                abzuege: abzuege.map(a => ({...a})), posCards: posCards.map(p => ({...p})),
                                posRechenwegEdits: {...posRechenwegEdits},
                                fliesenUmlaufend, abdichtungUmlaufend, fliesenDeckenhoch, abdichtungDeckenhoch,
                                bodenPlusTuerlaibung, fensterUebernehmen, sonstigeUebernehmen,
                                raumhoehe: masse.raumhoehe,
                                phasenFotos: phasenFotos, objektFotos: objektFotos,
                                kiErgebnisse: kiErgebnisse,
                                kiFotoErgebnisse: kiFotoErgebnisse
                            };
                            const raumName = (raum && raum.name) || (raum && raum.nr) || 'Raum';
                            // Aktuellen Raum speichern UND dann Aufmass beenden
                            onFinishRaum((raum && raum.nr), {
                                raumName,
                                positionen: positionenMitErgebnis,
                                raumState,
                                masse: { ...masse },
                                tuerDefaults, fensterDefaults, sonstigeDefaults,
                                tuerenEntries, fensterEntries,
                                fliesenUmlaufend, abdichtungUmlaufend,
                                fliesenDeckenhoch, abdichtungDeckenhoch,
                                bodenPlusTuerlaibung
                            });
                            // Aufmass beenden wird nach dem State-Update ausgelöst
                            setTimeout(() => onAufmassBeenden && onAufmassBeenden(), 100);
                        })}>
                            <span className="btn-icon">📦</span>
                            <span className="btn-text">
                                Aufmass fertigstellen
                                <span className="btn-sub">Letztes Raumblatt speichern - Weiter zum Rechnungsmodul</span>
                            </span>
                        </button>

                        {/* Zurueck */}
                        <button className="raum-action-btn" onClick={() => {
                            if (hasUnsavedChanges) {
                                if (!confirm('Es gibt ungespeicherte Aenderungen im Raumblatt.\n\nWirklich zurueck zur Raumerkennung?')) return;
                            }
                            onBack();
                        }} style={{color:'var(--text-muted)'}}>
                            <span className="btn-icon">◀</span>
                            <span className="btn-text">Zurueck zur Raumerkennung</span>
                        </button>
                    </div>

                    </React.Fragment>)}

                    {/* ═══ MODALS (ausserhalb der Tabs, immer verfuegbar) ═══ */}

                    {/* ═══ MANUELLER RECHENWEG MODAL (Vollbild) ═══ */}
                    {rwModalPos && (() => {
                        const modalPosCard = posCards.find(p => p.pos === rwModalPos);
                        const modalSumme = calcRWModalSumme();
                        return (
                            <div className="modal-overlay" style={{zIndex:2000}}>
                                <div className="rw-modal">
                                    <div className="rw-modal-header">
                                        <div>
                                            <div style={{fontSize:'11px', color:'var(--accent-orange)', textTransform:'uppercase', letterSpacing:'1px', fontWeight:600}}>Manueller Rechenweg</div>
                                            <div style={{fontSize:'16px', fontWeight:700, color:'var(--text-white)', marginTop:'2px'}}>
                                                Pos. {rwModalPos} -- {(modalPosCard && modalPosCard.bez) || ''}
                                            </div>
                                        </div>
                                        <button style={{background:'none', border:'none', color:'var(--text-muted)', fontSize:'24px', cursor:'pointer'}}
                                            onClick={() => { setRwModalPos(null); setRwModalZeilen([]); }}>✕</button>
                                    </div>

                                    <div className="rw-modal-body">
                                        {rwModalZeilen.map((z, idx) => {
                                            const val = parseRWZeile(z.text);
                                            return (
                                                <div key={z.id} className="rw-modal-zeile">
                                                    <div className="rw-modal-zeile-row">
                                                        <button className={`rw-vz-btn ${z.vorzeichen}`}
                                                            onClick={() => updateRWModalZeile(z.id, 'vorzeichen', z.vorzeichen === 'plus' ? 'minus' : 'plus')}>
                                                            {z.vorzeichen === 'plus' ? '+' : '−'}
                                                        </button>
                                                        <input className="rw-modal-input" type="text"
                                                            placeholder="z.B. Wand A: 3,450 × 2,100"
                                                            value={z.text}
                                                            onChange={e => updateRWModalZeile(z.id, 'text', e.target.value)}
                                                            autoFocus={idx === rwModalZeilen.length - 1} />
                                                        <div className="rw-modal-zeile-erg">
                                                            {val > 0 ? (
                                                                <span className={z.vorzeichen === 'minus' ? 'minus' : 'plus'}>
                                                                    {z.vorzeichen === 'minus' ? '−' : ''}{fmtDe(val)}
                                                                </span>
                                                            ) : <span style={{color:'var(--text-muted)'}}>--</span>}
                                                        </div>
                                                        <button className="rw-remove-btn" onClick={() => removeRWModalZeile(z.id)}>✕</button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <button className="rw-add-btn" onClick={addRWModalZeile} style={{marginTop:'8px'}}>
                                            ＋ Zeile hinzufügen
                                        </button>
                                    </div>

                                    {/* Summe & Fertigstellen */}
                                    <div className="rw-modal-footer">
                                        <div className="rw-modal-summe">
                                            <span>Ergebnis:</span>
                                            <span className="rw-modal-summe-wert">
                                                {fmtDe(Math.max(0, modalSumme))} {(modalPosCard && modalPosCard.einheit) || ''}
                                            </span>
                                        </div>
                                        <button className="rw-modal-fertig-btn" onClick={fertigstellenRW}
                                            disabled={rwModalZeilen.filter(z => z.text.trim()).length === 0}>
                                            ✅ Fertigstellen
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ═══ SONSTIGES BAUTEIL MODAL (nur + / −) ═══ */}
                    {showAbzugModal && (
                        <div className="modal-overlay" onClick={() => { setShowAbzugModal(false); setEditAbzugId(null); }}>
                            <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:'92vw', width:'440px'}}>
                                <div className="modal-title">{editAbzugId ? '✏️ Bauteil bearbeiten' : 'Sonstiges Bauteil'}</div>
                                <div className="abzug-modal-fields">
                                    {/* Bezeichnung */}
                                    <div className="abzug-modal-field">
                                        <span className="abzug-modal-label">Bezeichnung</span>
                                        <input className="abzug-modal-input" placeholder="z.B. Vormauerung, Nische..."
                                            value={abzugForm.name} onChange={e => setAbzugForm(p => ({...p, name: e.target.value}))} autoFocus />
                                    </div>

                                    {/* Globale Maße (Standard für alle Positionen) */}
                                    {!abzugForm.manualRW ? (
                                        <React.Fragment>
                                            <div className="abzug-modal-field" style={{marginTop:'4px'}}>
                                                <span className="abzug-modal-label" style={{fontSize:'11px', color:'var(--text-muted)'}}>Maße (Standard – kann pro Position überschrieben werden)</span>
                                            </div>
                                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px'}}>
                                                <div className="abzug-modal-field">
                                                    <span className="abzug-modal-label">Breite (m)</span>
                                                    <input className="abzug-modal-input" type="text" inputMode="decimal" placeholder="0,000"
                                                        value={abzugForm.breite} onChange={e => setAbzugForm(p => ({...p, breite: e.target.value}))}
                                                        onBlur={handleBlurFormat(setAbzugForm, 'breite')} />
                                                </div>
                                                <div className="abzug-modal-field">
                                                    <span className="abzug-modal-label">Höhe (m)</span>
                                                    <input className="abzug-modal-input" type="text" inputMode="decimal" placeholder="0,000"
                                                        value={abzugForm.hoehe} onChange={e => setAbzugForm(p => ({...p, hoehe: e.target.value}))}
                                                        onBlur={handleBlurFormat(setAbzugForm, 'hoehe')} />
                                                </div>
                                                <div className="abzug-modal-field">
                                                    <span className="abzug-modal-label">Tiefe/Länge</span>
                                                    <input className="abzug-modal-input" type="text" inputMode="decimal" placeholder="0,000"
                                                        value={abzugForm.tiefe} onChange={e => setAbzugForm(p => ({...p, tiefe: e.target.value}))}
                                                        onBlur={handleBlurFormat(setAbzugForm, 'tiefe')} />
                                                </div>
                                            </div>
                                            {(parseMass(abzugForm.breite) > 0 && parseMass(abzugForm.hoehe) > 0) && (
                                                <div style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'6px', textAlign:'right'}}>
                                                    = {fmtDe(parseMass(abzugForm.breite) * parseMass(abzugForm.hoehe) * (parseMass(abzugForm.tiefe) > 0 ? parseMass(abzugForm.tiefe) : 1))} m²
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ) : (
                                        <div style={{background:'var(--bg-card)', borderRadius:'8px', padding:'10px', margin:'8px 0', border:'1px solid var(--accent-orange)'}}>
                                            <div style={{fontSize:'12px', color:'var(--accent-orange)', fontWeight:600, marginBottom:'6px'}}>✏️ Globaler manueller Rechenweg</div>
                                            {abzugForm.manualRW.zeilen.map(z => (
                                                <div key={z.id} style={{fontSize:'13px', color:'var(--text-light)', marginBottom:'2px'}}>
                                                    {z.vorzeichen === 'minus' ? '− ' : '+ '}{z.text}
                                                </div>
                                            ))}
                                            <div style={{fontWeight:700, color:'var(--text-white)', marginTop:'6px', fontSize:'14px', borderTop:'1px solid var(--border-color)', paddingTop:'6px'}}>
                                                = {fmtDe(Math.abs(abzugForm.manualRW.ergebnis))} m²
                                            </div>
                                            <button style={{marginTop:'8px', fontSize:'12px', color:'var(--accent-orange)', background:'none', border:'none', cursor:'pointer', padding:0, textDecoration:'underline'}}
                                                onClick={() => setAbzugForm(prev => ({...prev, manualRW: null}))}>Zurück zu Maßeingabe</button>
                                        </div>
                                    )}
                                    {!abzugForm.manualRW && (
                                        <button className="modal-btn secondary" onClick={() => { setAbzugPosRWTarget(null); openAbzugRW(); }}
                                            style={{width:'100%', borderColor:'var(--accent-orange)', color:'var(--accent-orange)', marginTop:'8px', fontSize:'13px'}}>
                                            ✏️ Globaler manueller Rechenweg
                                        </button>
                                    )}

                                    {/* ══ POSITIONSZUORDNUNG ══ */}
                                    <div style={{marginTop:'16px', borderTop:'1px solid var(--border-color)', paddingTop:'12px'}}>
                                        <div style={{fontSize:'13px', fontFamily:'Oswald', fontWeight:600, color:'var(--text-white)', marginBottom:'4px', letterSpacing:'0.5px'}}>
                                            Zuordnung zu Positionen
                                        </div>
                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginBottom:'10px', lineHeight:'1.4'}}>
                                            Tippe ＋ für Zurechnung oder − für Abzug. Tippe ✏️ für eigenen Rechenweg pro Position.
                                        </div>
                                        <div className="pos-zuordnung-list">
                                            {posCards.map(pos => {
                                                const zuord = abzugForm.posZuordnung[pos.pos];
                                                const isPlus = zuord && zuord.vorzeichen === 'plus';
                                                const isMinus = zuord && zuord.vorzeichen === 'minus';
                                                const hasRW = zuord && zuord.manualRW;
                                                const rwWert = hasRW ? Math.abs(zuord.manualRW.ergebnis) : 0;
                                                return (
                                                    <div key={pos.pos} className={`pos-zuordnung-item ${isPlus ? 'selected-plus' : ''} ${isMinus ? 'selected-minus' : ''}`}>
                                                        {/* Plus Button */}
                                                        <button className={`pos-zuordnung-check ${isPlus ? 'plus' : ''}`}
                                                            style={{cursor:'pointer', background: isPlus ? 'rgba(39,174,96,0.15)' : 'transparent'}}
                                                            onClick={() => {
                                                                setAbzugForm(prev => {
                                                                    const newZ = { ...prev.posZuordnung };
                                                                    if (isPlus) { delete newZ[pos.pos]; }
                                                                    else { newZ[pos.pos] = { vorzeichen: 'plus', manualRW: (newZ[pos.pos] && newZ[pos.pos].manualRW) || null }; }
                                                                    return { ...prev, posZuordnung: newZ };
                                                                });
                                                            }}>
                                                            {isPlus ? '＋' : ''}
                                                        </button>
                                                        {/* Minus Button */}
                                                        <button className={`pos-zuordnung-check ${isMinus ? 'minus' : ''}`}
                                                            style={{cursor:'pointer', background: isMinus ? 'rgba(231,76,60,0.15)' : 'transparent'}}
                                                            onClick={() => {
                                                                setAbzugForm(prev => {
                                                                    const newZ = { ...prev.posZuordnung };
                                                                    if (isMinus) { delete newZ[pos.pos]; }
                                                                    else { newZ[pos.pos] = { vorzeichen: 'minus', manualRW: (newZ[pos.pos] && newZ[pos.pos].manualRW) || null }; }
                                                                    return { ...prev, posZuordnung: newZ };
                                                                });
                                                            }}>
                                                            {isMinus ? '−' : ''}
                                                        </button>
                                                        {/* Info */}
                                                        <div className="pos-zuordnung-info">
                                                            <span className="pos-zuordnung-nr">Pos. {pos.pos}</span>
                                                            <div className="pos-zuordnung-bez">{pos.bez}</div>
                                                        </div>
                                                        {/* Manueller RW Button (nur wenn zugeordnet) */}
                                                        {zuord && (
                                                            <button className={`pos-zuordnung-rw-btn ${hasRW ? 'has-rw' : ''}`}
                                                                onClick={() => {
                                                                    setAbzugPosRWTarget({ posNr: pos.pos, vorzeichen: zuord.vorzeichen });
                                                                    if (hasRW && zuord.manualRW.zeilen) {
                                                                        setAbzugRWZeilen(zuord.manualRW.zeilen.map(z => ({...z})));
                                                                    } else {
                                                                        setAbzugRWZeilen([{ id: Date.now(), text: '', vorzeichen: 'plus' }]);
                                                                    }
                                                                    setShowAbzugRWModal(true);
                                                                }}>
                                                                {hasRW ? `✏️ ${fmtDe(rwWert)}` : '✏️'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div style={{display:'flex', gap:'8px', marginTop:'12px'}}>
                                    <button className="modal-btn secondary" onClick={() => { setShowAbzugModal(false); setEditAbzugId(null); setAbzugForm({ name: '', breite: '', hoehe: '', tiefe: '', posZuordnung: {}, manualRW: null }); }} style={{flex:1}}>Abbrechen</button>
                                    <button className="modal-btn primary" onClick={addAbzug} style={{flex:1}}
                                        disabled={Object.keys(abzugForm.posZuordnung).length === 0}
                                        >{editAbzugId ? '💾 Speichern' : 'Hinzufügen'} ({Object.keys(abzugForm.posZuordnung).length} Pos.)</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Modal: Manueller Rechenweg für Sonstige ── */}
                    {/* ═══ DIN TÜR-GRÖSSEN MODAL ═══ */}
                    {dinTuerOpen && (() => {
                        const targetTuer = tueren.find(t => t.id === dinTuerOpen);
                        if (!targetTuer) return null;
                        const selectDin = (d) => {
                            updateTuer(dinTuerOpen, 'breite', d.b);
                            updateTuer(dinTuerOpen, 'hoehe', d.h);
                            setDinTuerOpen(null);
                        };
                        return (
                            <div className="din-tuer-overlay" onClick={() => setDinTuerOpen(null)}>
                                <div className="din-tuer-modal" onClick={e => e.stopPropagation()}>
                                    <div className="din-tuer-modal-header">
                                        <span>📐 DIN Tür-Größen (B × H)</span>
                                        <button className="din-tuer-modal-close" onClick={() => setDinTuerOpen(null)}>✕</button>
                                    </div>
                                    <div className="din-tuer-modal-body">
                                        {['2,010', '2,135', '2,260'].map(hoehe => (
                                            <div key={hoehe} className="din-tuer-dropdown-section">
                                                <div className="din-tuer-dropdown-section-title">Höhe {hoehe} m</div>
                                                {DIN_TUER_GROESSEN.filter(d => d.h === hoehe).map((d, i) => (
                                                    <button key={i} className="din-tuer-option" onClick={() => selectDin(d)}>
                                                        <span className="din-tuer-option-label">{d.label}</span>
                                                        <span className="din-tuer-option-arrow">→</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {showAbzugRWModal && (
                        <div className="rw-modal">
                            <div className="rw-modal-header">
                                <button className="rw-modal-close" onClick={() => setShowAbzugRWModal(false)}>✕</button>
                                <span>Manueller Rechenweg – {abzugForm.name || 'Sonstiges'}</span>
                            </div>
                            <div className="rw-modal-body">
                                {abzugRWZeilen.map((z, idx) => (
                                    <div key={z.id} className="rw-modal-zeile">
                                        <button className={`rw-vz-btn ${z.vorzeichen === 'plus' ? 'plus' : 'minus'}`}
                                            onClick={() => updateAbzugRWZeile(z.id, 'vorzeichen', z.vorzeichen === 'plus' ? 'minus' : 'plus')}>
                                            {z.vorzeichen === 'plus' ? '+' : '−'}
                                        </button>
                                        <input className="rw-modal-input" type="text" placeholder="z.B. 2,500 × 1,200"
                                            value={z.text} onChange={e => updateAbzugRWZeile(z.id, 'text', e.target.value)}
                                            autoFocus={idx === 0 && !z.text} />
                                        <span className="rw-modal-zeile-erg">
                                            {parseAbzugRWZeile(z.text) > 0 ? `= ${fmtDe(parseAbzugRWZeile(z.text))}` : ''}
                                        </span>
                                        {abzugRWZeilen.length > 1 && (
                                            <button style={{background:'none', border:'none', color:'var(--accent-red)', fontSize:'16px', cursor:'pointer', padding:'4px'}}
                                                onClick={() => removeAbzugRWZeile(z.id)}>✕</button>
                                        )}
                                    </div>
                                ))}
                                <button className="add-abzug-btn" onClick={addAbzugRWZeile} style={{marginTop:'8px'}}>＋ Zeile hinzufügen</button>
                            </div>
                            <div className="rw-modal-footer">
                                <div className="rw-modal-summe">
                                    <span>Summe:</span>
                                    <span className="rw-modal-summe-wert">{fmtDe(Math.abs(abzugRWSumme))} m²</span>
                                </div>
                                <button className="rw-modal-fertig-btn" onClick={finishAbzugRW}>✅ Übernehmen</button>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           MAIN APP
           ═══════════════════════════════════════════ */
        /* ═══════════════════════════════════════════
           GESAMTLISTE – Übersicht aller Räume
           ═══════════════════════════════════════════ */
        function Gesamtliste({ gesamtliste, setGesamtliste, kunde, onClose, onOpenRaumblatt, onAufmassEndgueltig, aufmassGespeichert, isDriveMode }) {
            const [expandedRooms, setExpandedRooms] = useState(() => gesamtliste.map((_, i) => i)); // Alle Räume offen
            const [expandedPos, setExpandedPos] = useState({}); // {roomIdx-posIdx: true}
            const [editingPos, setEditingPos] = useState(null); // 'ri-pi' string
            const [editValue, setEditValue] = useState('');
            const [exportInProgress, setExportInProgress] = useState(false);
            const [driveUploadStatus, setDriveUploadStatus] = useState(null); // null | 'uploading' | 'success' | 'error'
            const [driveUploadResults, setDriveUploadResults] = useState([]);

            const toggleRoom = (ri) => {
                setExpandedRooms(prev => prev.includes(ri) ? prev.filter(i => i !== ri) : [...prev, ri]);
            };
            const togglePos = (key) => {
                setExpandedPos(prev => ({...prev, [key]: !prev[key]}));
            };
            const startEdit = (ri, pi, currentVal) => {
                setEditingPos(`${ri}-${pi}`);
                setEditValue(fmtDe(currentVal));
            };
            const saveEdit = (ri, pi) => {
                const newVal = parseMass(editValue);
                if (newVal >= 0) {
                    setGesamtliste(prev => {
                        const updated = [...prev];
                        const room = {...updated[ri], positionen: [...updated[ri].positionen]};
                        room.positionen[pi] = {...room.positionen[pi], ergebnis: newVal, editedInGesamtliste: true};
                        updated[ri] = room;
                        return updated;
                    });
                }
                setEditingPos(null);
            };
            const cancelEdit = () => { setEditingPos(null); };

            // ═══ EDITIERBARER RECHENWEG ═══
            const [editingRW, setEditingRW] = useState(null);

            const parseRWVal = (text) => {
                if (!text) return 0;
                const cleaned = String(text).replace(/×/g, '*').replace(/,/g, '.').replace(/[^0-9.+\-*/() ]/g, '');
                try { return eval(cleaned) || 0; } catch(e) { return parseMass(text); }
            };

            const startRWEdit = (ri, pi, pos) => {
                let steps = [];
                const isManual = pos.hasManualRW && pos.manualRechenweg && pos.manualRechenweg.length > 0;
                if (isManual) {
                    steps = pos.manualRechenweg.map(z => {
                        const val = parseRWVal(z.text);
                        return { sign: z.vorzeichen === 'minus' ? -1 : 1, label: z.text, formel: '', ergebnis: fmtDe(val) };
                    });
                } else if (pos.rechenwegSteps && pos.rechenwegSteps.length > 0) {
                    steps = pos.rechenwegSteps.filter(st => st.type !== 'total' && st.type !== 'vob-info').map(st => {
                        const ergStr = (st.ergebnis || '').replace(/[^0-9,.\-]/g, '').replace(',', '.');
                        const val = Math.abs(parseFloat(ergStr) || 0);
                        return { sign: st.type === 'abzug' ? -1 : 1, label: (st.label || '').replace(/^[−+] /, ''), formel: st.formel || '', ergebnis: fmtDe(val) };
                    });
                }
                if (steps.length === 0) steps = [{ sign: 1, label: '', formel: '', ergebnis: fmtDe(pos.ergebnis || 0) }];
                setEditingRW({ ri, pi, steps, einheit: pos.einheit });
            };
            const updateStep = (idx, field, value) => {
                setEditingRW(prev => {
                    const steps = [...prev.steps];
                    steps[idx] = { ...steps[idx], [field]: value };
                    if (field === 'formel') { const v = parseRWVal(value); if (v > 0) steps[idx].ergebnis = fmtDe(v); }
                    return { ...prev, steps };
                });
            };
            const toggleSign = (idx) => {
                setEditingRW(prev => { const steps = [...prev.steps]; steps[idx] = { ...steps[idx], sign: steps[idx].sign === 1 ? -1 : 1 }; return { ...prev, steps }; });
            };
            const addStep = () => { setEditingRW(prev => ({ ...prev, steps: [...prev.steps, { sign: 1, label: '', formel: '', ergebnis: '0,000' }] })); };
            const removeStep = (idx) => { setEditingRW(prev => prev.steps.length <= 1 ? prev : { ...prev, steps: prev.steps.filter((_, i) => i !== idx) }); };
            const calcEditTotal = (steps) => { let t = 0; (steps || []).forEach(st => { t += parseMass(st.ergebnis) * (st.sign || 1); }); return Math.max(0, t); };
            const saveRWEdit = () => {
                if (!editingRW) return;
                const { ri, pi, steps } = editingRW;
                const newTotal = calcEditTotal(steps);
                setGesamtliste(prev => {
                    const updated = [...prev]; const room = { ...updated[ri], positionen: [...updated[ri].positionen] };
                    room.positionen[pi] = { ...room.positionen[pi], ergebnis: newTotal, editedInGesamtliste: true,
                        rechenwegSteps: steps.map(st => ({ label: (st.sign === -1 ? '− ' : '+ ') + st.label, formel: st.formel, ergebnis: (st.sign === -1 ? '−' : '') + st.ergebnis, type: st.sign === -1 ? 'abzug' : 'zurechnung' })).concat([{ label: 'ERGEBNIS', formel: '', ergebnis: fmtDe(newTotal), type: 'total' }]),
                        hasManualRW: false, editedRechenwegSteps: steps };
                    updated[ri] = room; return updated;
                });
                setEditingRW(null);
            };
            const cancelRWEdit = () => { setEditingRW(null); };

            // ═══ GESAMTMASSEN pro Position über alle Räume ═══
            const positionsSummary = {};
            gesamtliste.forEach((room, ri) => {
                (room.positionen || []).forEach(pos => {
                    if (!positionsSummary[pos.pos]) {
                        positionsSummary[pos.pos] = { pos: pos.pos, bez: pos.bez, einheit: pos.einheit, total: 0, rooms: [] };
                    }
                    if (pos.ergebnis > 0) {
                        positionsSummary[pos.pos].total += pos.ergebnis;
                        positionsSummary[pos.pos].rooms.push({ raum: room.raumName, erg: pos.ergebnis });
                    }
                });
            });
            const sortedPositions = Object.values(positionsSummary).filter(p => p.total > 0);

            // ═══ EXPORT: PDF + Excel generieren ═══
            const handleExport = async () => {
                setExportInProgress(true);
                try {
                    var kundenName = (kunde && kunde.name) || 'Kunde';
                    var safeName = kundenName.replace(/[^a-zA-Z0-9 ]/g, '').replace(/ +/g, '_').substring(0, 30);
                    var datum = new Date().toLocaleDateString('de-DE');
                    var datumFile = new Date().toISOString().split('T')[0];
                    var raumNamen = gesamtliste.map(function(r) { return r.raumName; });

                    // ══════════════════════════════════════
                    // EXCEL
                    // ══════════════════════════════════════
                    try {
                    if (typeof XLSX !== 'undefined') {
                        var wb = XLSX.utils.book_new();
                        var gHead = ['Pos.', 'Bezeichnung', 'Einheit', 'GESAMT'];
                        raumNamen.forEach(function(rn) { gHead.push(rn); });
                        var gRows = [['AUFMASS - ' + kundenName], ['Datum: ' + datum, '', '', 'Raeume: ' + gesamtliste.length], [], gHead];
                        sortedPositions.forEach(function(p) {
                            var row = [p.pos, p.bez, p.einheit, Number(p.total.toFixed(3))];
                            raumNamen.forEach(function(rn) {
                                var f = p.rooms.find(function(r) { return r.raum === rn; });
                                row.push(f ? Number(f.erg.toFixed(3)) : '');
                            });
                            gRows.push(row);
                        });
                        var ws1 = XLSX.utils.aoa_to_sheet(gRows);
                        ws1['!cols'] = [{wch:10}, {wch:48}, {wch:8}, {wch:14}].concat(raumNamen.map(function() { return {wch:14}; }));
                        XLSX.utils.book_append_sheet(wb, ws1, 'Gesamtmassen');
                        gesamtliste.forEach(function(room, ri) {
                            var rNr = String(ri + 1).padStart(2, '0');
                            var rRows = [['RAUMBLATT ' + rNr + ': ' + room.raumName], ['Kunde: ' + kundenName, '', '', 'Datum: ' + datum], [], ['Position', '+/-', 'Bezeichnung', 'Formel', 'Ergebnis']];
                            (room.positionen || []).filter(function(p) { return p.ergebnis > 0; }).forEach(function(pos) {
                                rRows.push(['Pos. ' + pos.pos, '', pos.bez, pos.einheit, Number(pos.ergebnis.toFixed(3))]);
                                var isM = pos.hasManualRW && pos.manualRechenweg && pos.manualRechenweg.length > 0;
                                if (isM) { pos.manualRechenweg.forEach(function(z) { rRows.push(['', z.vorzeichen === 'minus' ? '-' : '+', z.text, '', '']); }); }
                                else if (pos.rechenwegSteps && pos.rechenwegSteps.length > 0) { pos.rechenwegSteps.forEach(function(st) { if (st.type !== 'vob-info') rRows.push(['', st.type === 'abzug' ? '-' : '+', st.label || '', st.formel || '', st.ergebnis || '']); }); }
                                rRows.push([]);
                            });
                            rRows.push([]); rRows.push(['ZUSAMMENFASSUNG']); rRows.push(['Pos.', '', 'Bezeichnung', 'Einheit', 'Menge']);
                            (room.positionen || []).filter(function(p) { return p.ergebnis > 0; }).forEach(function(p) { rRows.push(['Pos. ' + p.pos, '', p.bez, p.einheit, Number(p.ergebnis.toFixed(3))]); });
                            var sn = (rNr + ' ' + room.raumName).substring(0, 31).replace(/[\\\/\?\*\[\]:]/g, '');
                            var wsR = XLSX.utils.aoa_to_sheet(rRows);
                            wsR['!cols'] = [{wch:14}, {wch:4}, {wch:44}, {wch:36}, {wch:14}];
                            XLSX.utils.book_append_sheet(wb, wsR, sn);
                        });
                        XLSX.writeFile(wb, 'Aufmass_' + datumFile + '_' + safeName + '.xlsx');
                        // Excel-Blob für Drive-Upload erzeugen
                        var xlsxData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                        var excelBlob = new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    }
                    } catch(xlErr) { console.error('Excel:', xlErr); }

                    // ══════════════════════════════════════
                    // PDF: EINE DATEI MIT ALLEM
                    // Keine Position darf ueber Seitenumbruch laufen!
                    // ══════════════════════════════════════
                    try {
                    var jspdfLib = window.jspdf;
                    if (jspdfLib) {
                        var jsPDF = jspdfLib.jsPDF;
                        var pdf = new jsPDF('p', 'mm', 'a4');
                        var PAGE_BOTTOM = 275; // Max Y bevor Seitenumbruch (Platz fuer Fusszeile)
                        var PAGE_TOP = 40; // Y nach Header auf neuer Seite

                        // ── Header-Funktion (fuer jede Seite ausser Deckblatt) ──
                        var drawH = function(t) {
                            pdf.setDrawColor(196,30,30); pdf.setLineWidth(1.5); pdf.line(14,12,196,12);
                            pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.setTextColor(196,30,30);
                            pdf.text('Thomas Willwacher', 14, 17);
                            pdf.setTextColor(40,40,40); pdf.text('Fliesenlegermeister e.K.', 55, 17);
                            pdf.setFont('helvetica','normal'); pdf.setFontSize(7); pdf.setTextColor(130,130,130);
                            pdf.text('Flurweg 14a, 56472 Nisterau | Tel. 02661-63101', 196, 17, {align:'right'});
                            pdf.setDrawColor(200,200,200); pdf.setLineWidth(0.3); pdf.line(14, 19.5, 196, 19.5);
                            pdf.setFont('helvetica','bold'); pdf.setFontSize(13); pdf.setTextColor(30,30,30);
                            pdf.text(fitText(t, 180), 14, 27);
                            pdf.setFont('helvetica','normal'); pdf.setFontSize(8); pdf.setTextColor(80,80,80);
                            pdf.text(fitText(kundenName + '  |  ' + datum, 180), 14, 32);
                        };

                        // ── Hilfsfunktion: Neue Seite wenn noetig ──
                        var ensureSpace = function(currentY, needed, headerTitle) {
                            if (currentY + needed > PAGE_BOTTOM) {
                                pdf.addPage();
                                drawH(headerTitle);
                                return PAGE_TOP;
                            }
                            return currentY;
                        };

                        // ── Hilfsfunktion: Text auf maxWidth kuerzen ──
                        var fitText = function(text, maxWidthMm) {
                            if (!text) return '';
                            text = String(text);
                            var w = pdf.getTextWidth(text);
                            if (w <= maxWidthMm) return text;
                            var t = text;
                            while (t.length > 1 && pdf.getTextWidth(t + '..') > maxWidthMm) {
                                t = t.substring(0, t.length - 1);
                            }
                            return t + '..';
                        };

                        // ═══════════════════════════════════
                        // DECKBLATT
                        // ═══════════════════════════════════
                        pdf.setDrawColor(196,30,30); pdf.setLineWidth(1.5); pdf.line(14, 40, 196, 40);
                        pdf.setFont('helvetica','bold'); pdf.setFontSize(28); pdf.setTextColor(30,30,30);
                        pdf.text('AUFMASS', 105, 62, {align:'center'});
                        pdf.setFontSize(14); pdf.setTextColor(196,30,30);
                        pdf.text(fitText(kundenName, 150), 105, 75, {align:'center'});
                        pdf.setLineWidth(0.5); pdf.line(50, 80, 160, 80);
                        var dy = 95;
                        var deckblattRows = [
                            ['Auftraggeber', (kunde && kunde.auftraggeber) || ''],
                            ['Baustelle', (kunde && kunde.adresse) || ''],
                            ['Bauleitung', (kunde && kunde.bauleitung) || ''],
                            ['Architekt', (kunde && kunde.architekt) || ''],
                            ['Datum', datum],
                            ['Raeume', String(gesamtliste.length)],
                            ['Positionen', String(sortedPositions.length)]
                        ];
                        deckblattRows.forEach(function(r) {
                            pdf.setFont('helvetica','normal'); pdf.setFontSize(10); pdf.setTextColor(120,120,120);
                            pdf.text(r[0] + ':', 40, dy);
                            pdf.setFont('helvetica','bold'); pdf.setTextColor(30,30,30);
                            pdf.text(fitText(r[1], 109), 85, dy);
                            dy += 7;
                        });
                        // Fusszeile Deckblatt
                        pdf.setDrawColor(196,30,30); pdf.setLineWidth(0.8); pdf.line(14, 250, 196, 250);
                        pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.setTextColor(196,30,30);
                        pdf.text('Thomas Willwacher', 14, 257);
                        pdf.setTextColor(30,30,30); pdf.text('Fliesenlegermeister e.K.', 55, 257);
                        pdf.setFont('helvetica','normal'); pdf.setFontSize(8); pdf.setTextColor(100,100,100);
                        pdf.text('Flurweg 14a, 56472 Nisterau  |  Tel. 02661-63101  |  0170-2024161', 14, 263);

                        // ═══════════════════════════════════
                        // GESAMTMASSEN-UEBERSICHT
                        // ═══════════════════════════════════
                        pdf.addPage(); drawH('Gesamtmassen - Uebersicht');
                        var gy = PAGE_TOP;

                        sortedPositions.forEach(function(p) {
                            // Hoehe fuer diese Position vorab berechnen:
                            // Header (7mm) + Raeume (je 3.5mm) + Abstand (3mm)
                            var posBlockHeight = 7 + (p.rooms.length * 3.5) + 3;

                            // Passt der Block komplett auf die aktuelle Seite?
                            gy = ensureSpace(gy, posBlockHeight, 'Gesamtmassen - Uebersicht (Forts.)');

                            // Positions-Header
                            pdf.setFillColor(244,244,244); pdf.rect(14, gy - 3, 182, 7, 'F');
                            pdf.setFillColor(196,30,30); pdf.rect(14, gy - 3, 2, 7, 'F');
                            pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.setTextColor(196,30,30);
                            pdf.text('Pos. ' + p.pos, 19, gy + 1);
                            pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5); pdf.setTextColor(60,60,60);
                            pdf.text(fitText(p.bez, 120), 38, gy + 1);
                            pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.setTextColor(196,30,30);
                            pdf.text(fmtDe(p.total) + ' ' + p.einheit, 194, gy + 1, {align:'right'});
                            gy += 7;

                            // Raum-Zeilen
                            pdf.setFont('helvetica','normal'); pdf.setFontSize(7);
                            p.rooms.forEach(function(r) {
                                pdf.setTextColor(130,130,130); pdf.text(r.raum, 24, gy);
                                pdf.setTextColor(60,60,60); pdf.text(fmtDe(r.erg) + ' ' + p.einheit, 130, gy, {align:'right'});
                                gy += 3.5;
                            });
                            gy += 3;
                        });

                        // ═══════════════════════════════════
                        // RAUMBLAETTER
                        // ═══════════════════════════════════
                        gesamtliste.forEach(function(room, ri) {
                            pdf.addPage();
                            var rNr = String(ri + 1).padStart(2, '0');
                            var raumTitle = 'Raumblatt ' + rNr + ': ' + room.raumName;
                            drawH(raumTitle);
                            pdf.setDrawColor(196,30,30); pdf.setLineWidth(0.5); pdf.line(14, 35, 196, 35);
                            var ry = 42;

                            var posE = (room.positionen || []).filter(function(p) { return p.ergebnis > 0; });

                            posE.forEach(function(pos) {
                                // ── Hoehe des gesamten Positions-Blocks vorab berechnen ──
                                var posHeader = 16; // Positions-Kopf
                                var rwHeader = 4;   // Rechenweg-Spaltenheader
                                var rwHeight = 0;   // Rechenweg-Zeilen

                                var isM = pos.hasManualRW && pos.manualRechenweg && pos.manualRechenweg.length > 0;
                                if (isM) {
                                    rwHeight = (pos.manualRechenweg || []).length * 5;
                                } else if (pos.rechenwegSteps && pos.rechenwegSteps.length > 0) {
                                    rwHeight = pos.rechenwegSteps.filter(function(st) {
                                        return st.type !== 'vob-info' && st.type !== 'total';
                                    }).length * 5;
                                }

                                var ergebnisBlock = 15; // Ergebnis-Linie + Text + Abstand
                                var totalBlockHeight = posHeader + rwHeader + rwHeight + ergebnisBlock;

                                // ── Entscheidung: Passt der Block auf die aktuelle Seite? ──
                                var freshPageSpace = PAGE_BOTTOM - PAGE_TOP; // ~235mm

                                if (totalBlockHeight <= freshPageSpace && ry + totalBlockHeight > PAGE_BOTTOM) {
                                    // Block passt auf eine frische Seite, aber nicht mehr auf aktuelle → neue Seite
                                    pdf.addPage();
                                    drawH(raumTitle + ' (Forts.)');
                                    ry = PAGE_TOP;
                                } else if (totalBlockHeight > freshPageSpace && ry > PAGE_TOP + 30) {
                                    // Block ist sehr gross (passt nie auf eine Seite) UND wir sind nicht am Anfang
                                    // → neue Seite starten, dann mit Seitenumbruch innerhalb
                                    pdf.addPage();
                                    drawH(raumTitle + ' (Forts.)');
                                    ry = PAGE_TOP;
                                }

                                // ── Positions-Kopf zeichnen ──
                                pdf.setFillColor(244,244,244); pdf.rect(14, ry - 3, 182, 13, 'F');
                                pdf.setFillColor(196,30,30); pdf.rect(14, ry - 3, 2.5, 13, 'F');
                                pdf.setFont('helvetica','bold'); pdf.setFontSize(11); pdf.setTextColor(196,30,30);
                                pdf.text('Pos. ' + pos.pos, 19, ry + 1);
                                pdf.setFont('helvetica','normal'); pdf.setFontSize(8); pdf.setTextColor(60,60,60);
                                pdf.text(fitText(pos.bez, 173), 19, ry + 6);
                                pdf.setFont('helvetica','bold'); pdf.setFontSize(12); pdf.setTextColor(196,30,30);
                                pdf.text(fmtDe(pos.ergebnis) + ' ' + pos.einheit, 194, ry + 1, {align:'right'});
                                ry += posHeader;

                                // ── Rechenweg-Header ──
                                pdf.setFont('helvetica','normal'); pdf.setFontSize(6.5); pdf.setTextColor(170,170,170);
                                pdf.text('+/-', 17, ry);
                                pdf.text('Bezeichnung', 24, ry);
                                pdf.text('Formel', 92, ry);
                                pdf.text('Ergebnis', 194, ry, {align:'right'});
                                pdf.setDrawColor(220,220,220); pdf.setLineWidth(0.2); pdf.line(16, ry + 1, 194, ry + 1);
                                ry += rwHeader;

                                // ── Rechenweg-Zeilen ──
                                var drawRWZeile = function(isAbzug, label, formel, ergebnis) {
                                    // Seitenumbruch NUR bei sehr langen Rechenwegen
                                    if (ry + 5 > PAGE_BOTTOM) {
                                        pdf.addPage();
                                        drawH(raumTitle + ' (Forts.)');
                                        ry = PAGE_TOP;
                                    }
                                    if (isAbzug) {
                                        pdf.setFillColor(249,236,235); pdf.rect(16, ry - 2, 178, 5, 'F');
                                    } else {
                                        pdf.setFillColor(234,247,239); pdf.rect(16, ry - 2, 178, 5, 'F');
                                    }
                                    pdf.setFont('helvetica','bold'); pdf.setFontSize(9);
                                    pdf.setTextColor(isAbzug ? 180 : 39, isAbzug ? 40 : 130, isAbzug ? 40 : 72);
                                    pdf.text(isAbzug ? '-' : '+', 18, ry);
                                    // Label: x=24 bis x=88 (vor Formel-Spalte) = max 64mm
                                    pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5); pdf.setTextColor(60,60,60);
                                    pdf.text(fitText(label || '', 64), 24, ry);
                                    // Formel: x=92 bis x=165 (vor Ergebnis) = max 73mm
                                    if (formel) {
                                        pdf.setFont('courier','normal'); pdf.setFontSize(7); pdf.setTextColor(100,100,100);
                                        pdf.text(fitText(formel, 73), 92, ry);
                                    }
                                    // Ergebnis: rechtsbündig x=194, max 28mm
                                    if (ergebnis) {
                                        pdf.setFont('helvetica','bold'); pdf.setFontSize(7.5);
                                        pdf.setTextColor(isAbzug ? 180 : 50, isAbzug ? 40 : 50, isAbzug ? 40 : 50);
                                        pdf.text(fitText(ergebnis, 28), 194, ry, {align:'right'});
                                    }
                                    pdf.setDrawColor(240,240,240); pdf.setLineWidth(0.1); pdf.line(24, ry + 1.5, 194, ry + 1.5);
                                    ry += 5;
                                };

                                if (isM) {
                                    (pos.manualRechenweg || []).forEach(function(z) {
                                        drawRWZeile(z.vorzeichen === 'minus', z.text, '', '');
                                    });
                                } else if (pos.rechenwegSteps && pos.rechenwegSteps.length > 0) {
                                    pos.rechenwegSteps.forEach(function(st) {
                                        if (st.type === 'vob-info' || st.type === 'total') return;
                                        drawRWZeile(st.type === 'abzug', st.label, st.formel, st.ergebnis);
                                    });
                                }

                                // ── Ergebnis-Block ──
                                // Sicherheit: Ergebnis nie allein auf neuer Seite ohne Kontext
                                if (ry + 10 > PAGE_BOTTOM) {
                                    pdf.addPage();
                                    drawH(raumTitle + ' (Forts.)');
                                    ry = PAGE_TOP;
                                }
                                ry += 1;
                                pdf.setDrawColor(196,30,30); pdf.setLineWidth(0.6); pdf.line(110, ry, 194, ry);
                                ry += 4;
                                pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.setTextColor(30,30,30);
                                pdf.text('ERGEBNIS:', 112, ry);
                                pdf.setTextColor(196,30,30);
                                pdf.text(fmtDe(pos.ergebnis) + ' ' + pos.einheit, 194, ry, {align:'right'});
                                pdf.setLineWidth(0.6); pdf.line(110, ry + 2, 194, ry + 2);
                                ry += 10;
                            });

                            // ── Zusammenfassung pro Raum ──
                            var summaryHeight = 14 + (posE.length * 5.5) + 5; // Header + Zeilen + Puffer
                            ry = ensureSpace(ry, Math.min(summaryHeight, 60), raumTitle + ' - Zusammenfassung');

                            ry += 2;
                            pdf.setDrawColor(196,30,30); pdf.setLineWidth(0.8); pdf.line(14, ry, 196, ry);
                            ry += 5;
                            pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.setTextColor(30,30,30);
                            pdf.text('Zusammenfassung: ' + room.raumName, 14, ry);
                            ry += 7;

                            // Tabellen-Header
                            pdf.setFillColor(196,30,30); pdf.rect(14, ry - 3, 182, 7, 'F');
                            pdf.setFont('helvetica','bold'); pdf.setFontSize(8); pdf.setTextColor(255,255,255);
                            pdf.text('Pos.', 16, ry + 1);
                            pdf.text('Bezeichnung', 30, ry + 1);
                            pdf.text('Einheit', 145, ry + 1);
                            pdf.text('Menge', 194, ry + 1, {align:'right'});
                            ry += 7;

                            // Zusammenfassung-Zeilen
                            posE.forEach(function(p, pi) {
                                if (ry + 5.5 > PAGE_BOTTOM) {
                                    pdf.addPage();
                                    drawH(raumTitle + ' - Zusammenfassung (Forts.)');
                                    ry = PAGE_TOP;
                                }
                                if (pi % 2 === 0) {
                                    pdf.setFillColor(245,245,245); pdf.rect(14, ry - 2.5, 182, 5.5, 'F');
                                }
                                pdf.setFont('helvetica','bold'); pdf.setFontSize(8); pdf.setTextColor(196,30,30);
                                pdf.text(p.pos, 16, ry);
                                pdf.setFont('helvetica','normal'); pdf.setTextColor(50,50,50);
                                pdf.text(fitText(p.bez, 112), 30, ry);
                                pdf.setTextColor(100,100,100); pdf.text(p.einheit, 145, ry);
                                pdf.setFont('helvetica','bold'); pdf.setTextColor(196,30,30);
                                pdf.text(fmtDe(p.ergebnis), 194, ry, {align:'right'});
                                ry += 5.5;
                            });
                        });

                        // ═══════════════════════════════════
                        // Seitenzahlen auf allen Seiten
                        // ═══════════════════════════════════
                        var tp = pdf.internal.getNumberOfPages();
                        for (var pg = 1; pg <= tp; pg++) {
                            pdf.setPage(pg);
                            pdf.setFont('helvetica','normal'); pdf.setFontSize(7); pdf.setTextColor(160,160,160);
                            pdf.text('Seite ' + pg + ' von ' + tp, 196, 287, {align:'right'});
                            if (pg > 1) {
                                pdf.text(fitText(kundenName, 85), 14, 287);
                                pdf.text(datum, 105, 287, {align:'center'});
                            }
                        }

                        pdf.save('Aufmass_Komplett_' + datumFile + '_' + safeName + '.pdf');
                        // PDF-Blob fuer Drive-Upload erzeugen
                        var pdfBlob = pdf.output('blob');
                    }
                    } catch(pdfErr) { console.error('PDF:', pdfErr); alert('PDF Fehler: ' + pdfErr.message); }

                    // ══════════════════════════════════════
                    // GOOGLE DRIVE UPLOAD
                    // ══════════════════════════════════════
                    if (isDriveMode && kunde && kunde._driveFolderId && window.GoogleDriveService.isConnected()) {
                        try {
                            setDriveUploadStatus('uploading');
                            var uploadResults = await window.GoogleDriveService.exportToCustomerFolder(
                                kunde._driveFolderId,
                                typeof pdfBlob !== 'undefined' ? pdfBlob : null,
                                typeof excelBlob !== 'undefined' ? excelBlob : null,
                                kundenName
                            );
                            setDriveUploadResults(uploadResults);
                            setDriveUploadStatus('success');
                        } catch (driveErr) {
                            console.error('Drive Upload:', driveErr);
                            setDriveUploadStatus('error');
                        }
                    }

                    if (onAufmassEndgueltig) onAufmassEndgueltig();
                } catch(e) { console.error('Export:',e); alert('Export-Fehler: '+e.message); }
                setExportInProgress(false);
            };

            return (
                <div className="page-container gl-page">
                    {/* ═══ HEADER ═══ */}
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                        <div>
                            <h2 style={{margin:0, fontSize:'20px', color:'var(--text-white)'}}>📋 Gesamtliste – Aufmass</h2>
                            <div style={{fontSize:'13px', color:'var(--text-muted)', marginTop:'4px'}}>
                                {gesamtliste.length} {gesamtliste.length === 1 ? 'Raum' : 'Räume'} aufgemessen
                                {kunde && ` -- ${kunde.name || ''}`}
                            </div>
                        </div>
                        <button className="gl-room-btn" onClick={onClose}>✕ Schließen</button>
                    </div>

                    {gesamtliste.length === 0 ? (
                        <div className="gl-empty">Noch keine Räume fertiggestellt.</div>
                    ) : (<React.Fragment>
                        {/* ═══ RÄUME MIT POSITIONEN UND RECHENWEGEN ═══ */}
                        {gesamtliste.map((room, ri) => {
                            const isExpanded = expandedRooms.includes(ri);
                            const posWithErg = (room.positionen || []).filter(p => p.ergebnis > 0);
                            return (
                            <div key={ri} className="gl-room">
                                <div className="gl-room-header" onClick={() => toggleRoom(ri)}>
                                    <div>
                                        <span className="gl-room-name">📐 {room.raumName}</span>
                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'2px'}}>
                                            {posWithErg.length} Positionen · {room.timestamp ? new Date(room.timestamp).toLocaleDateString('de-DE') : ''}
                                        </div>
                                    </div>
                                    <span className="gl-room-count">{isExpanded ? '▲' : '▼'}</span>
                                </div>

                                {isExpanded && (<React.Fragment>
                                    <div className="gl-room-body">
                                        {/* Positionen als Karten */}
                                        {posWithErg.map((pos, pi) => {
                                            const realPi = (room.positionen || []).indexOf(pos);
                                            const posKey = `${ri}-${realPi}`;
                                            const isPosExpanded = expandedPos[posKey] !== false; // Default offen
                                            const isEditing = editingPos === posKey;
                                            const isManual = pos.hasManualRW && pos.manualRechenweg && pos.manualRechenweg.length > 0;
                                            const hasEditedRW = !!pos.posRechenwegEdit;

                                            return (
                                            <div key={posKey} className="gl-pos-card">
                                                <div className="gl-pos-header" onClick={() => togglePos(posKey)}>
                                                    <span className="gl-pos-nr">Pos. {pos.pos}</span>
                                                    <span className="gl-pos-bez">{pos.bez}</span>
                                                    {isEditing ? (
                                                        <div onClick={e => e.stopPropagation()} style={{display:'flex', gap:'4px', alignItems:'center'}}>
                                                            <input className="gl-pos-erg-edit" value={editValue}
                                                                autoFocus
                                                                onChange={e => setEditValue(e.target.value)}
                                                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(ri, realPi); if (e.key === 'Escape') cancelEdit(); }} />
                                                            <button style={{background:'#27ae60', border:'none', borderRadius:'4px', color:'#fff', padding:'4px 8px', cursor:'pointer', fontSize:'12px', fontWeight:700}}
                                                                onClick={() => saveEdit(ri, realPi)}>✓</button>
                                                            <button style={{background:'none', border:'1px solid var(--border-color)', borderRadius:'4px', color:'var(--text-muted)', padding:'4px 8px', cursor:'pointer', fontSize:'12px'}}
                                                                onClick={cancelEdit}>✕</button>
                                                        </div>
                                                    ) : (
                                                        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                                                            <span className="gl-pos-erg" style={pos.editedInGesamtliste ? {color:'var(--accent-orange)'} : {}}>
                                                                {fmtDe(pos.ergebnis)} {pos.einheit}
                                                            </span>
                                                            <button style={{background:'none', border:'1px solid var(--border-color)', borderRadius:'4px', color:'var(--text-muted)', padding:'3px 6px', cursor:'pointer', fontSize:'11px'}}
                                                                onClick={e => { e.stopPropagation(); startEdit(ri, realPi, pos.ergebnis); }}
                                                                title="Ergebnis bearbeiten">✏️</button>
                                                        </div>
                                                    )}
                                                    <span style={{marginLeft:'8px', color:'var(--text-muted)', fontSize:'12px'}}>{isPosExpanded ? '▲' : '▼'}</span>
                                                </div>

                                                {/* ═══ RECHENWEG ═══ */}
                                                {isPosExpanded && (() => {
                                                    const isCurrentlyEditing = editingRW && editingRW.ri === ri && editingRW.pi === realPi;
                                                    return isCurrentlyEditing ? (
                                                    <div className="gl-pos-body">
                                                        <div style={{fontSize:'11px', color:'var(--accent-orange)', marginBottom:'8px', fontWeight:600}}>✏️ Rechenweg bearbeiten</div>
                                                        {editingRW.steps.map((st, si) => (
                                                            <div key={si} className="gl-rw-edit-row">
                                                                <div className={`gl-rw-edit-sign ${st.sign===1?'plus':'minus'}`} onClick={() => toggleSign(si)}>{st.sign===1?'+':'−'}</div>
                                                                <input className="gl-rw-edit-input label" value={st.label} onChange={e => updateStep(si,'label',e.target.value)} placeholder="Bezeichnung" />
                                                                <input className="gl-rw-edit-input formel" value={st.formel} onChange={e => updateStep(si,'formel',e.target.value)} placeholder="Formel" />
                                                                <input className="gl-rw-edit-input ergebnis" value={st.ergebnis} onChange={e => updateStep(si,'ergebnis',e.target.value)}
                                                                    onBlur={() => { const v = parseMass(st.ergebnis); if(v>=0) updateStep(si,'ergebnis',fmtDe(v)); }} placeholder="0,000" />
                                                                <button className="gl-rw-edit-del" onClick={() => removeStep(si)}>✕</button>
                                                            </div>
                                                        ))}
                                                        <button className="gl-rw-add-btn" onClick={addStep}>+ Zeile hinzufügen</button>
                                                        <div className="gl-rw-edit-total">
                                                            <span style={{fontWeight:700, color:'var(--accent-orange)', fontSize:'14px'}}>ERGEBNIS</span>
                                                            <span style={{fontWeight:700, color:'var(--accent-orange)', fontSize:'16px'}}>{fmtDe(calcEditTotal(editingRW.steps))} {pos.einheit}</span>
                                                        </div>
                                                        <div style={{display:'flex', gap:'6px', marginTop:'8px', justifyContent:'flex-end'}}>
                                                            <button style={{padding:'5px 14px', border:'1px solid var(--border-color)', borderRadius:'5px', background:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'12px'}} onClick={cancelRWEdit}>Abbrechen</button>
                                                            <button style={{padding:'5px 14px', border:'none', borderRadius:'5px', background:'#27ae60', color:'#fff', cursor:'pointer', fontWeight:600, fontSize:'12px'}} onClick={saveRWEdit}>✓ Speichern</button>
                                                        </div>
                                                    </div>
                                                    ) : (
                                                    <div className="gl-pos-body">
                                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginBottom:'6px', display:'flex', gap:'6px', alignItems:'center'}}>
                                                            <span style={{padding:'1px 6px', borderRadius:'3px', background:'rgba(230,126,34,0.1)', color:'var(--accent-orange)', fontSize:'10px', fontWeight:600}}>
                                                                {(pos.kategorie && pos.kategorie.toUpperCase()) || '--'}
                                                            </span>
                                                            {isManual && <span style={{padding:'1px 6px', borderRadius:'3px', background:'rgba(155,89,182,0.12)', color:'#9b59b6', fontSize:'10px', fontWeight:600}}>✏️ Manuell</span>}
                                                            {hasEditedRW && <span style={{padding:'1px 6px', borderRadius:'3px', background:'rgba(230,126,34,0.12)', color:'var(--accent-orange)', fontSize:'10px', fontWeight:600}}>✏️ Bearbeitet</span>}
                                                            {pos.editedInGesamtliste && <span style={{padding:'1px 6px', borderRadius:'3px', background:'rgba(39,174,96,0.12)', color:'#27ae60', fontSize:'10px', fontWeight:600}}>📋 Gesamtliste</span>}
                                                        </div>
                                                        {isManual ? (
                                                            <div>
                                                                {pos.manualRechenweg.map((z, zi) => {
                                                                    const val = parseMass(z.text ? z.text.replace(/[^0-9, .\-+*/() ]/g, '') : '');
                                                                    return (<div key={zi} className={`gl-rw-step ${z.vorzeichen === 'minus' ? 'abzug' : 'zurechnung'}`}>
                                                                        <span className="gl-rw-label">{z.vorzeichen === 'minus' ? '−' : '+'}</span>
                                                                        <span className="gl-rw-formel">{z.text}</span>
                                                                        <span className="gl-rw-erg">{val ? fmtDe(val) : ''}</span>
                                                                    </div>);
                                                                })}
                                                                <div className="gl-rw-step total"><span className="gl-rw-label">ERGEBNIS</span><span className="gl-rw-formel"></span><span className="gl-rw-erg">{fmtDe(pos.ergebnis)} {pos.einheit}</span></div>
                                                            </div>
                                                        ) : pos.rechenwegSteps && pos.rechenwegSteps.length > 0 ? (
                                                            <div>{pos.rechenwegSteps.map((st, si) => (
                                                                <div key={si} className={`gl-rw-step ${st.type || ''}`}>
                                                                    <span className="gl-rw-label">{st.label || ''}</span>
                                                                    <span className="gl-rw-formel">{st.formel || ''}</span>
                                                                    <span className="gl-rw-erg">{st.ergebnis || ''}</span>
                                                                </div>
                                                            ))}</div>
                                                        ) : (
                                                            <div style={{fontSize:'12px', color:'var(--text-muted)', fontStyle:'italic'}}>Kein Rechenweg verfügbar</div>
                                                        )}
                                                        <button style={{width:'100%', marginTop:'10px', padding:'8px', border:'1px dashed var(--accent-orange)', borderRadius:'6px', background:'rgba(230,126,34,0.06)', color:'var(--accent-orange)', fontFamily:'Oswald', fontSize:'12px', fontWeight:600, cursor:'pointer'}}
                                                            onClick={e => { e.stopPropagation(); startRWEdit(ri, realPi, pos); }}>
                                                            ✏️ Rechenweg bearbeiten
                                                        </button>
                                                    </div>
                                                    );
                                                })()}
                                            </div>
                                            );
                                        })}
                                    </div>

                                    {/* Raum-Aktions-Buttons */}
                                    <div className="gl-room-actions">
                                        {onOpenRaumblatt && room.raumState && (
                                            <button className="gl-room-btn" onClick={() => onOpenRaumblatt(ri, room)}>
                                                📝 Raumblatt öffnen & bearbeiten
                                            </button>
                                        )}
                                    </div>
                                </React.Fragment>)}
                            </div>
                            );
                        })}

                        {/* ═══ GESAMTMASSEN ═══ */}
                        <div className="gl-gesamt-section">
                            <div className="gl-gesamt-header">
                                <h3>Σ Gesamtmassen pro Position</h3>
                                <span style={{fontSize:'12px', color:'var(--text-muted)'}}>{sortedPositions.length} Positionen</span>
                            </div>
                            {sortedPositions.map((pos, pi) => (
                                <div key={pi}>
                                    <div className="gl-gesamt-row">
                                        <span className="gl-gesamt-pos">{pos.pos}</span>
                                        <span className="gl-gesamt-bez">{pos.bez}</span>
                                        <span className="gl-gesamt-total">{fmtDe(pos.total)} {pos.einheit}</span>
                                    </div>
                                    <div className="gl-gesamt-rooms">
                                        {pos.rooms.map((r, j) => (
                                            <span key={j} className="gl-gesamt-room-tag">
                                                {r.raum}: {fmtDe(r.erg)} {pos.einheit}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ═══ EXPORT BUTTON ═══ */}
                        <button className="gl-export-btn" onClick={handleExport} disabled={exportInProgress}>
                            {exportInProgress
                                ? (driveUploadStatus === 'uploading' ? '⏳ Upload auf Google Drive...' : '⏳ Export läuft...')
                                : '📦 Aufmass endgültig fertigstellen'}
                            <div style={{fontSize:'11px', fontWeight:400, marginTop:'4px', opacity:0.8}}>
                                PDF + Excel erstellen · {gesamtliste.length} Raumblätter{isDriveMode ? ' · Upload auf Google Drive' : ''} · Gesamtmassen
                            </div>
                        </button>

                        {aufmassGespeichert && (
                            <div style={{textAlign:'center', padding:'14px', marginTop:'12px', background:'rgba(39,174,96,0.1)', borderRadius:'10px', border:'1px solid rgba(39,174,96,0.3)'}}>
                                <div style={{color:'#27ae60', fontWeight:700, fontSize:'14px'}}>✅ Export erfolgreich!</div>
                                <div style={{color:'var(--text-muted)', fontSize:'12px', marginTop:'4px'}}>PDF- und Excel-Dateien wurden lokal heruntergeladen</div>
                            </div>
                        )}

                        {/* Google Drive Upload Status */}
                        {driveUploadStatus === 'success' && (
                            <div style={{textAlign:'center', padding:'14px', marginTop:'8px', background:'rgba(39,174,96,0.08)', borderRadius:'10px', border:'1px solid rgba(39,174,96,0.25)'}}>
                                <div style={{color:'#27ae60', fontWeight:700, fontSize:'14px'}}>☁️ Google Drive – Gespeichert!</div>
                                <div style={{color:'var(--text-muted)', fontSize:'12px', marginTop:'4px'}}>
                                    Dateien im Kundenordner unter "Aufmass" abgelegt
                                </div>
                                {driveUploadResults.map(function(r, i) {
                                    return React.createElement('div', { key: i, style: {fontSize:'11px', color:'var(--text-light)', marginTop:'3px'} },
                                        (r.type === 'pdf' ? '📄 ' : '📊 ') + r.name
                                    );
                                })}
                            </div>
                        )}
                        {driveUploadStatus === 'error' && (
                            <div style={{textAlign:'center', padding:'14px', marginTop:'8px', background:'rgba(196,30,30,0.08)', borderRadius:'10px', border:'1px solid rgba(196,30,30,0.25)'}}>
                                <div style={{color:'var(--accent-red-light)', fontWeight:700, fontSize:'14px'}}>⚠️ Google Drive Upload fehlgeschlagen</div>
                                <div style={{color:'var(--text-muted)', fontSize:'12px', marginTop:'4px'}}>Lokale Dateien wurden trotzdem heruntergeladen.</div>
                            </div>
                        )}

                        {/* Zurück zur Bearbeitung */}
                        <button className="gl-back-btn" onClick={onClose}>
                            ◀ Zurück zur Bearbeitung
                            <div style={{fontSize:'11px', fontWeight:400, marginTop:'2px'}}>
                                Aufmass weiter bearbeiten · Räume hinzufügen · Werte ändern
                            </div>
                        </button>

                        {/* Zurück zur Modulwahl (nach Fertigstellung) */}
                        {aufmassGespeichert && (
                            <button className="gl-back-btn" onClick={function() { if (onClose) onClose(); setTimeout(function() { window._navigateToModulwahl && window._navigateToModulwahl(); }, 100); }}
                                style={{background:'linear-gradient(135deg, #27ae60, #1e8449)', color:'white', border:'none', marginTop:'8px'}}>
                                🏠 Zurück zur Modulwahl
                                <div style={{fontSize:'11px', fontWeight:400, marginTop:'2px', color:'rgba(255,255,255,0.8)'}}>
                                    Rechnung · Kalkulation · Schriftverkehr
                                </div>
                            </button>
                        )}
                    </React.Fragment>)}
                </div>
            );
        }
