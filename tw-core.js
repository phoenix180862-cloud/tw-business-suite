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

        // Version
        VERSION: '2.1.0',
        BUILD: 'modular'
    };

    console.log('%c[TW Business Suite] Core v' + global.TW.VERSION + ' geladen', 'color: #1E88E5; font-weight: bold;');

})(window);
