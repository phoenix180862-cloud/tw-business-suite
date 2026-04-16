/* ═══════════════════════════════════════════════════════════════
   TW BUSINESS SUITE — CORE (tw-core.js)
   Event-Bus, State-Manager, Shared Utilities
   
   Dieses Modul wird VOR allen anderen geladen und stellt die
   zentrale Kommunikationsschicht bereit.
   ═══════════════════════════════════════════════════════════════ */

(function(global) {
    'use strict';

    // ─── EVENT-BUS ───────────────────────────────────────────
    // Module kommunizieren NUR über Events — kein Modul kennt ein anderes direkt.
    // Beispiel: TW.emit('projekt:selected', { kunde: {...} })
    //           TW.on('projekt:selected', (data) => { ... })
    
    var _listeners = {};

    var EventBus = {
        on: function(event, callback) {
            if (!_listeners[event]) _listeners[event] = [];
            _listeners[event].push(callback);
            return function() {
                _listeners[event] = _listeners[event].filter(function(cb) { return cb !== callback; });
            };
        },

        off: function(event, callback) {
            if (!_listeners[event]) return;
            _listeners[event] = _listeners[event].filter(function(cb) { return cb !== callback; });
        },

        emit: function(event, data) {
            if (!_listeners[event]) return;
            _listeners[event].forEach(function(cb) {
                try { cb(data); }
                catch(e) { console.error('[TW Event-Bus] Fehler in Handler für "' + event + '":', e); }
            });
        },

        // Debug: alle registrierten Events anzeigen
        debug: function() {
            console.group('[TW Event-Bus] Registrierte Events:');
            Object.keys(_listeners).forEach(function(event) {
                console.log(event + ': ' + _listeners[event].length + ' Listener');
            });
            console.groupEnd();
        }
    };

    // ─── STANDARD-EVENTS ─────────────────────────────────────
    // Dokumentation der Events, die Module nutzen können:
    //
    // Navigation:
    //   'page:navigate'      → { page: 'modulwahl', from: 'start' }
    //   'page:back'          → {}
    //
    // Kunde/Projekt:
    //   'kunde:selected'     → { kunde: {...}, mode: 'neu'|'analysiert'|'manuell' }
    //   'kunde:updated'      → { kunde: {...} }
    //   'kunde:cleared'      → {}
    //
    // KI-Analyse:
    //   'ki:start'           → { config: {...} }
    //   'ki:progress'        → { percent: 50, message: '...', currentFile: '...' }
    //   'ki:complete'        → { result: {...} }
    //   'ki:error'           → { error: '...' }
    //
    // Module:
    //   'modul:selected'     → { modulId: 'aufmass'|'rechnung'|... }
    //   'modul:data'         → { modulId: '...', data: {...} }
    //   'modul:saved'        → { modulId: '...', result: {...} }
    //
    // Drive:
    //   'drive:connected'    → { status: 'online' }
    //   'drive:disconnected' → {}
    //   'drive:file-saved'   → { path: '...', fileName: '...' }


    // ─── STATE-MANAGER ───────────────────────────────────────
    // Zentraler App-State, auf den alle Module zugreifen können.
    // Änderungen lösen automatisch Events aus.

    var _state = {
        currentPage: 'start',
        selectedKunde: null,
        importResult: null,
        kiAkte: null,
        driveStatus: 'offline',
        isDriveMode: false,
        gesamtliste: [],
        aufmassGespeichert: false,
        ordnerAnalyseMeta: null
    };

    var State = {
        get: function(key) {
            if (key) return _state[key];
            return Object.assign({}, _state);
        },

        set: function(key, value) {
            var old = _state[key];
            _state[key] = value;
            EventBus.emit('state:changed', { key: key, value: value, oldValue: old });
            EventBus.emit('state:' + key, { value: value, oldValue: old });
        },

        // Mehrere Werte gleichzeitig setzen (ein Event)
        merge: function(updates) {
            Object.keys(updates).forEach(function(key) {
                _state[key] = updates[key];
            });
            EventBus.emit('state:changed', { updates: updates });
        }
    };


    // ─── MODUL-REGISTRY ──────────────────────────────────────
    // Module registrieren sich hier, damit die App weiß welche verfügbar sind.

    var _modules = {};

    var ModuleRegistry = {
        register: function(moduleId, moduleConfig) {
            _modules[moduleId] = Object.assign({
                id: moduleId,
                name: moduleId,
                icon: '📦',
                desc: '',
                color: '#888',
                ready: false,
                component: null
            }, moduleConfig);
            console.log('[TW] Modul registriert: ' + moduleId);
            EventBus.emit('module:registered', { moduleId: moduleId, config: _modules[moduleId] });
        },

        get: function(moduleId) {
            return _modules[moduleId] || null;
        },

        getAll: function() {
            return Object.keys(_modules).map(function(id) { return _modules[id]; });
        },

        getComponent: function(moduleId) {
            var mod = _modules[moduleId];
            return mod ? mod.component : null;
        }
    };


    // ─── SHARED UTILITIES ────────────────────────────────────

    var Utils = {
        // Datum formatieren (DE)
        formatDate: function(date) {
            if (!date) return '–';
            var d = new Date(date);
            return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        },

        // Zahl formatieren (DE)
        formatNumber: function(num, decimals) {
            if (num === null || num === undefined || isNaN(num)) return '–';
            return Number(num).toLocaleString('de-DE', {
                minimumFractionDigits: decimals || 2,
                maximumFractionDigits: decimals || 2
            });
        },

        // Währung formatieren
        formatCurrency: function(num) {
            if (num === null || num === undefined || isNaN(num)) return '–';
            return Number(num).toLocaleString('de-DE', {
                style: 'currency',
                currency: 'EUR'
            });
        },

        // Eindeutige ID generieren
        generateId: function() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        },

        // localStorage sicher lesen/schreiben
        storage: {
            get: function(key, defaultValue) {
                try {
                    var val = localStorage.getItem(key);
                    return val ? JSON.parse(val) : (defaultValue || null);
                } catch(e) { return defaultValue || null; }
            },
            set: function(key, value) {
                try { localStorage.setItem(key, JSON.stringify(value)); }
                catch(e) { console.warn('[TW] Storage voll:', e); }
            },
            remove: function(key) {
                try { localStorage.removeItem(key); }
                catch(e) {}
            }
        },

        // Debounce
        debounce: function(fn, delay) {
            var timer;
            return function() {
                var args = arguments;
                var ctx = this;
                clearTimeout(timer);
                timer = setTimeout(function() { fn.apply(ctx, args); }, delay || 300);
            };
        }
    };


    // ─── FIRMENSTAMMDATEN ────────────────────────────────────
    // Zentral gespeichert, von allen Modulen lesbar

    var Firma = {
        name: 'Thomas Willwacher Fliesenlegermeister e.K.',
        inhaber: 'Thomas Willwacher',
        strasse: 'Flurweg 14a',
        plz: '56472',
        ort: 'Nisterau',
        telefon: '',
        fax: '',
        email: '',
        web: '',
        steuernummer: '',
        ustIdNr: '',
        finanzamt: '',
        bankName: '',
        iban: '',
        bic: '',
        handelsregister: '',
        
        // Firmendaten aus localStorage laden (falls konfiguriert)
        load: function() {
            var saved = Utils.storage.get('tw_firmenstamm');
            if (saved) Object.assign(this, saved);
            return this;
        },
        
        save: function() {
            Utils.storage.set('tw_firmenstamm', {
                name: this.name,
                inhaber: this.inhaber,
                strasse: this.strasse,
                plz: this.plz,
                ort: this.ort,
                telefon: this.telefon,
                fax: this.fax,
                email: this.email,
                web: this.web,
                steuernummer: this.steuernummer,
                ustIdNr: this.ustIdNr,
                finanzamt: this.finanzamt,
                bankName: this.bankName,
                iban: this.iban,
                bic: this.bic,
                handelsregister: this.handelsregister
            });
        }
    };
    Firma.load();


    // ─── EXIT GUARD ─────────────────────────────────────────
    // Verhindert versehentliches Schliessen der App (Zurueck-Taste, Tab schliessen, etc.)
    // Zeigt einen Sicherheitsdialog mit 2 Optionen:
    //   1. Zurueck zur Bearbeitung
    //   2. App endgueltig schliessen

    var ExitGuard = {
        _active: false,
        _overlay: null,

        activate: function() {
            if (this._active) return;
            this._active = true;

            // Browser beforeunload Event (Tab/Fenster schliessen)
            window.addEventListener('beforeunload', this._handleBeforeUnload);

            // Zurueck-Taste (Browser-History) abfangen
            // Wir pushen einen Dummy-State und fangen popstate ab
            this._pushGuardState();
            window.addEventListener('popstate', this._handlePopState);

            console.log('[TW ExitGuard] Aktiviert');
        },

        deactivate: function() {
            this._active = false;
            window.removeEventListener('beforeunload', this._handleBeforeUnload);
            window.removeEventListener('popstate', this._handlePopState);
            if (this._overlay) {
                document.body.removeChild(this._overlay);
                this._overlay = null;
            }
            console.log('[TW ExitGuard] Deaktiviert');
        },

        _pushGuardState: function() {
            if (window.history && window.history.pushState) {
                window.history.pushState({ twExitGuard: true }, '', window.location.href);
            }
        },

        _handleBeforeUnload: function(e) {
            // Standard-Browser-Warnung
            e.preventDefault();
            e.returnValue = 'Achtung: Nicht gespeicherte Daten gehen verloren!';
            return e.returnValue;
        },

        _handlePopState: function(e) {
            // Zurueck-Taste abgefangen -> Sicherheitsdialog zeigen
            ExitGuard._pushGuardState(); // Guard-State erneuern
            ExitGuard.showExitDialog();
        },

        showExitDialog: function() {
            if (this._overlay) return; // Schon offen

            var overlay = document.createElement('div');
            overlay.id = 'tw-exit-guard-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;' +
                'background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;' +
                'animation:twExitFadeIn 0.2s ease;';

            var dialog = document.createElement('div');
            dialog.style.cssText = 'background:linear-gradient(135deg,#1a2332 0%,#243447 100%);' +
                'border-radius:20px;padding:36px 32px;max-width:420px;width:90%;text-align:center;' +
                'box-shadow:0 25px 60px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.08);' +
                'border:1px solid rgba(255,165,0,0.3);';

            // Icon
            var icon = document.createElement('div');
            icon.style.cssText = 'font-size:52px;margin-bottom:16px;';
            icon.textContent = '\u26A0\uFE0F';
            dialog.appendChild(icon);

            // Titel
            var title = document.createElement('div');
            title.style.cssText = 'font-family:Oswald,sans-serif;font-size:22px;font-weight:600;' +
                'color:#ffffff;margin-bottom:12px;letter-spacing:0.5px;';
            title.textContent = 'App verlassen?';
            dialog.appendChild(title);

            // Text
            var text = document.createElement('div');
            text.style.cssText = 'font-family:"Source Sans 3",sans-serif;font-size:15px;' +
                'color:rgba(255,255,255,0.7);margin-bottom:28px;line-height:1.5;';
            text.textContent = 'Nicht gespeicherte Daten k\u00F6nnten verloren gehen. M\u00F6chten Sie die App wirklich beenden?';
            dialog.appendChild(text);

            // Button-Container
            var btnBox = document.createElement('div');
            btnBox.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

            // Zurueck-Button (primaer)
            var btnBack = document.createElement('button');
            btnBack.style.cssText = 'padding:14px 24px;border:none;border-radius:12px;cursor:pointer;' +
                'font-family:Oswald,sans-serif;font-size:17px;font-weight:600;letter-spacing:0.5px;' +
                'background:linear-gradient(135deg,#1E88E5,#1565C0);color:#fff;' +
                'box-shadow:0 4px 15px rgba(30,136,229,0.4);transition:all 0.2s;';
            btnBack.textContent = '\u2190  Zur\u00FCck zur Bearbeitung';
            btnBack.onclick = function() {
                ExitGuard._closeDialog();
            };
            btnBox.appendChild(btnBack);

            // Beenden-Button (sekundaer, gefaehrlich)
            var btnExit = document.createElement('button');
            btnExit.style.cssText = 'padding:12px 24px;border:1px solid rgba(231,76,60,0.4);' +
                'border-radius:12px;cursor:pointer;font-family:Oswald,sans-serif;font-size:15px;' +
                'font-weight:500;letter-spacing:0.3px;background:rgba(231,76,60,0.15);' +
                'color:#e74c3c;transition:all 0.2s;';
            btnExit.textContent = 'App beenden';
            btnExit.onclick = function() {
                ExitGuard.deactivate();
                // Versuche Tab/Fenster zu schliessen
                window.close();
                // Falls window.close() nicht funktioniert (Browser-Beschraenkung):
                // Leere Seite zeigen
                setTimeout(function() {
                    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;' +
                        'height:100vh;background:#0d1520;color:rgba(255,255,255,0.5);font-family:Oswald,sans-serif;' +
                        'font-size:20px;text-align:center;padding:20px;">' +
                        '<div>TW Business Suite wurde beendet.<br><br>' +
                        '<span style="font-size:14px;color:rgba(255,255,255,0.3);">Sie k\u00F6nnen diesen Tab jetzt schlie\u00DFen.</span></div></div>';
                }, 200);
            };
            btnBox.appendChild(btnExit);

            dialog.appendChild(btnBox);
            overlay.appendChild(dialog);

            // Style-Animation injizieren
            if (!document.getElementById('tw-exit-guard-styles')) {
                var style = document.createElement('style');
                style.id = 'tw-exit-guard-styles';
                style.textContent = '@keyframes twExitFadeIn{from{opacity:0}to{opacity:1}}';
                document.head.appendChild(style);
            }

            document.body.appendChild(overlay);
            this._overlay = overlay;

            // ESC = zurueck
            this._escHandler = function(e) {
                if (e.key === 'Escape') ExitGuard._closeDialog();
            };
            window.addEventListener('keydown', this._escHandler);
        },

        _closeDialog: function() {
            if (this._overlay) {
                document.body.removeChild(this._overlay);
                this._overlay = null;
            }
            if (this._escHandler) {
                window.removeEventListener('keydown', this._escHandler);
                this._escHandler = null;
            }
        }
    };


    // ─── EXPORT ──────────────────────────────────────────────
    // Alles über das globale TW-Objekt verfügbar

    // ================================================================
    // AUTO-SAVE MANAGER
    // ================================================================
    //
    // Zweck: Automatisches, unsichtbares Speichern in IndexedDB. Kombiniert
    // Debounce (warten bis Benutzer fertig ist) mit Visibility-Rettungsring
    // (synchroner Flush beim Wegwischen der App auf Mobilgeraeten) und
    // Status-Broadcast (fuer UI-Indikator mit Zustaenden idle/pending/
    // saving/saved/error).
    // ================================================================

    var AutoSaveManager = {
        _timer: null,
        _delay: 1500,          // Standard: 1.5 Sek. nach letzter Aenderung speichern
        _pendingPayload: null, // Was beim naechsten Flush gespeichert wird
        _saveFn: null,         // Die Funktion, die wirklich speichert (async)
        _lastStatus: 'idle',
        _listeners: [],
        _activated: false,
        _lastSavedAt: null,
        _suppressed: false,    // temporaer deaktiviert (z.B. waehrend Kundenwechsel)

        // Registriert die eigentliche Speicher-Funktion. payload -> Promise.
        // Wird einmal zentral in tw-app.jsx gesetzt.
        setSaveFunction: function(fn) {
            this._saveFn = fn;
        },

        setDelay: function(ms) { this._delay = Math.max(300, ms|0); },

        // Markiert Aenderungen als "muss gespeichert werden".
        // Der payload-Parameter ist frei gestaltbar (JSON-serialisierbar).
        markDirty: function(payload) {
            if (this._suppressed) return;
            this._pendingPayload = payload;
            this._broadcast('pending');
            if (this._timer) clearTimeout(this._timer);
            var self = this;
            this._timer = setTimeout(function() { self.flush(); }, this._delay);
        },

        // Speichert jetzt sofort (bypasst den Debounce). Gibt Promise zurueck.
        flush: function() {
            var self = this;
            if (this._timer) { clearTimeout(this._timer); this._timer = null; }
            if (!this._pendingPayload) return Promise.resolve(null);
            if (!this._saveFn) return Promise.resolve(null);

            var payload = this._pendingPayload;
            this._pendingPayload = null;
            this._broadcast('saving');
            try {
                var result = this._saveFn(payload);
                if (result && typeof result.then === 'function') {
                    return result.then(function(v) {
                        self._lastSavedAt = new Date();
                        self._broadcast('saved');
                        return v;
                    }).catch(function(e) {
                        console.warn('[AutoSave] Fehler:', e);
                        self._broadcast('error');
                        throw e;
                    });
                }
                this._lastSavedAt = new Date();
                this._broadcast('saved');
                return Promise.resolve(result);
            } catch(e) {
                console.warn('[AutoSave] Sofort-Fehler:', e);
                this._broadcast('error');
                return Promise.reject(e);
            }
        },

        // Synchroner Flush fuer kritische Momente (pagehide, visibilitychange→hidden).
        // Nutzt navigator.sendBeacon nicht, sondern verlaesst sich darauf dass
        // IndexedDB-Writes vom Browser auch nach Tab-Close weiterlaufen.
        flushSync: function() {
            if (this._timer) { clearTimeout(this._timer); this._timer = null; }
            if (!this._pendingPayload || !this._saveFn) return;
            try {
                // IndexedDB-Writes werden vom Browser garantiert — auch wenn
                // der Tab sofort danach schliesst. Wir feuern ab und gut.
                this._saveFn(this._pendingPayload);
                this._pendingPayload = null;
                this._broadcast('saved');
            } catch(e) { /* still */ }
        },

        // Status-Abo (z.B. fuer UI-Indikator in der Navigation)
        onStatusChange: function(cb) {
            if (typeof cb !== 'function') return function(){};
            this._listeners.push(cb);
            // initialen Status direkt liefern
            try { cb(this._lastStatus, this._lastSavedAt); } catch(e) {}
            var self = this;
            return function() {
                self._listeners = self._listeners.filter(function(f) { return f !== cb; });
            };
        },

        suppress: function(flag) { this._suppressed = !!flag; },

        getStatus: function() {
            return { status: this._lastStatus, lastSavedAt: this._lastSavedAt };
        },

        _broadcast: function(status) {
            this._lastStatus = status;
            var at = this._lastSavedAt;
            this._listeners.forEach(function(cb) {
                try { cb(status, at); } catch(e) {}
            });
        },

        // Visibility-Rettungsring aktivieren
        activate: function() {
            if (this._activated) return;
            this._activated = true;
            var self = this;

            // Bei jedem Wegwischen / App-Wechsel / Bildschirm-Sperre sofort speichern
            document.addEventListener('visibilitychange', function() {
                if (document.visibilityState === 'hidden') {
                    self.flushSync();
                }
            });

            // Safari Mobile: pagehide ist zuverlaessiger als beforeunload
            window.addEventListener('pagehide', function() { self.flushSync(); });

            // Fallback: auch bei klassischem Tab-Close speichern
            window.addEventListener('beforeunload', function() { self.flushSync(); });

            console.log('[TW AutoSave] Rettungsring aktiv (visibilitychange + pagehide)');
        }
    };


    // ─── EXPORT ──────────────────────────────────────────────
    // Alles über das globale TW-Objekt verfügbar

    global.TW = {
        // Event-Bus
        on: EventBus.on,
        off: EventBus.off,
        emit: EventBus.emit,
        debugEvents: EventBus.debug,

        // State
        State: State,

        // Module
        Modules: ModuleRegistry,

        // Utilities
        Utils: Utils,

        // Firmendaten
        Firma: Firma,

        // ExitGuard (bestehender Dialog fuer Zurueck-Taste / Tab-Close)
        ExitGuard: ExitGuard,

        // Auto-Save Manager (neue Speicher-Automatik)
        AutoSave: AutoSaveManager,

        // Version
        VERSION: '2.2.0',
        BUILD: 'modular'
    };

    // ExitGuard + AutoSaveManager sofort aktivieren
    function _activateGuards() {
        ExitGuard.activate();
        AutoSaveManager.activate();
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        _activateGuards();
    } else {
        document.addEventListener('DOMContentLoaded', _activateGuards);
    }

    console.log('%c[TW Business Suite] Core v' + global.TW.VERSION + ' geladen', 'color: #1E88E5; font-weight: bold;');

})(window);
