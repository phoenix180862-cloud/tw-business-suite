/* =====================================================================
   TW BUSINESS SUITE -- LOKALER SPEICHER (tw-storage.js)
   IndexedDB-basierter Persistenz-Layer fuer Offline-Faehigkeit
   
   FEATURES:
   - Grosser lokaler Speicher (IndexedDB: hunderte MB moeglich)
   - Alle Kundendaten, Aufmasse, Rechnungen persistent
   - Automatische Speicherung bei jeder Aenderung
   - Offline-Zugriff auf bereits geladene Daten
   - Daten koennen NUR durch die App geloescht werden
   - Geraete-unabhaengig (jedes Geraet hat eigenen Speicher)
   - DRIVE-SYNC: Komplette Ordnerstruktur + Dateien offline verfuegbar
   - SPEICHER-RESERVIERUNG: Bis zu 1 GB pro Kunde moeglich
   ===================================================================== */

(function(global) {
    'use strict';

    var DB_NAME = 'TWBusinessSuite';
    var DB_VERSION = 7;
    var _db = null;
    var _ready = false;
    var _readyCallbacks = [];

    // ---- Geraete-ID (einmalig pro Geraet) ----
    var _deviceId = localStorage.getItem('tw_device_id');
    if (!_deviceId) {
        _deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
        localStorage.setItem('tw_device_id', _deviceId);
    }

    // ---- Konfiguration ----
    var CONFIG = {
        // Speicher pro Kunde (Ziel: 500 MB - 1 GB)
        MAX_BYTES_PER_KUNDE: 1 * 1024 * 1024 * 1024,  // 1 GB
        WARN_BYTES_PER_KUNDE: 500 * 1024 * 1024,       // 500 MB Warnung

        // Datei-Groessen-Limits
        MAX_FILE_SIZE_MB: 50,          // Dateien groesser als 50 MB werden uebersprungen
        SKIP_IMAGE_EXTENSIONS: [],
        
        SYNC_FILE_TYPES: ['.pdf', '.xlsx', '.xls', '.docx', '.doc', '.txt', '.csv', '.xml', '.json', '.rtf', '.odt', '.ods', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp', '.heic', '.heif', '.svg'],
        
        // Google Docs MIME-Types die exportiert werden
        GOOGLE_EXPORT_TYPES: {
            'application/vnd.google-apps.document': { exportAs: 'application/pdf', ext: '.pdf' },
            'application/vnd.google-apps.spreadsheet': { exportAs: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: '.xlsx' },
            'application/vnd.google-apps.presentation': { exportAs: 'application/pdf', ext: '.pdf' }
        }
    };

    // ---- SHADOW-SYNC-STORES (Multi-Geraete-Sync fuer Rohdaten) ----
    // Diese Stores erhalten bei jedem Save einen JSON-Snapshot im
    // Drive-Ordner "Kunden-Daten" unter _sync_<storeName>.json.
    // Beim Kunden-Oeffnen auf einem anderen Geraet wird der Snapshot
    // heruntergeladen und der lokale Store rehydriert.
    var SHADOW_STORES = ['kunden', 'raeume', 'aufmass', 'positionen', 'positionsListen'];
    var _shadowDebounce = {};  // Key: kundeId__storeName -> setTimeout handle

    // ---- Store-Definitionen ----
    var STORES = {
        kunden:         { keyPath: 'id', indices: ['name', 'updatedAt'] },
        aufmass:        { keyPath: 'id', indices: ['kundeId', 'updatedAt'] },
        rechnungen:     { keyPath: 'id', indices: ['kundeId', 'updatedAt'] },
        raeume:         { keyPath: 'id', indices: ['kundeId', 'updatedAt'] },
        gesamtlisten:   { keyPath: 'id', indices: ['kundeId', 'updatedAt'] },
        positionen:     { keyPath: 'id', indices: ['kundeId', 'updatedAt'] },
        schriftverkehr: { keyPath: 'id', indices: ['kundeId', 'updatedAt'] },
        kiAkten:        { keyPath: 'id', indices: ['kundeId', 'updatedAt'] },
        driveCache:     { keyPath: 'id', indices: ['type', 'updatedAt'] },
        appState:       { keyPath: 'key' },
        meta:           { keyPath: 'key' },
        driveOrdner:    { keyPath: 'id', indices: ['kundeId', 'parentId', 'updatedAt'] },
        driveDateien:   { keyPath: 'id', indices: ['kundeId', 'ordnerId', 'fileType', 'updatedAt'] },
        appDateien:     { keyPath: 'id', indices: ['kundeId', 'ordnerName', 'docType', 'updatedAt', 'deviceId'] },
        syncLog:        { keyPath: 'id', indices: ['kundeId', 'action', 'deviceId', 'syncedAt', 'updatedAt'] },
        wip:            { keyPath: 'id', indices: ['kundeId', 'modulName', 'savedAt', 'deviceId'] },
        ausgangsbuch:   { keyPath: 'id', indices: ['kundeId', 'status', 'datum', 'updatedAt'] },
        fotos:          { keyPath: 'id', indices: ['kundeId', 'kontext', 'raumKey', 'driveUploaded', 'createdAt', 'updatedAt'] },
        positionsListen: { keyPath: 'id', indices: ['kundeId', 'bezeichner', 'updatedAt'] }
    };

    // ================================================================
    // DATENBANK INITIALISIERUNG
    // ================================================================
    function initDB() {
        return new Promise(function(resolve, reject) {
            if (_db) { resolve(_db); return; }
            var request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = function(event) {
                console.error('[TW-Storage] IndexedDB Fehler:', event.target.error);
                reject(event.target.error);
            };
            request.onupgradeneeded = function(event) {
                var db = event.target.result;
                console.log('[TW-Storage] Datenbank-Upgrade von v' + event.oldVersion + ' auf v' + event.newVersion);
                Object.keys(STORES).forEach(function(storeName) {
                    var cfg = STORES[storeName];
                    if (!db.objectStoreNames.contains(storeName)) {
                        var store = db.createObjectStore(storeName, { keyPath: cfg.keyPath });
                        if (cfg.indices) {
                            cfg.indices.forEach(function(idx) {
                                try { store.createIndex(idx, idx, { unique: false }); }
                                catch(e) { /* Index existiert bereits */ }
                            });
                        }
                        console.log('[TW-Storage] Store erstellt: ' + storeName);
                    }
                });
            };
            request.onsuccess = function(event) {
                _db = event.target.result;
                _ready = true;
                console.log('%c[TW-Storage] IndexedDB bereit (' + DB_NAME + ' v' + DB_VERSION + ')', 'color: #2ecc71; font-weight: bold;');
                putItem('meta', { key: 'initialized', value: true, timestamp: new Date().toISOString() });
                _readyCallbacks.forEach(function(cb) { try { cb(); } catch(e) {} });
                _readyCallbacks = [];
                resolve(_db);
            };
        });
    }

    // ================================================================
    // GENERISCHE CRUD-OPERATIONEN
    // ================================================================
    function getTransaction(storeName, mode) {
        if (!_db) throw new Error('[TW-Storage] Datenbank nicht initialisiert');
        return _db.transaction([storeName], mode || 'readonly');
    }

    function putItem(storeName, item) {
        return new Promise(function(resolve, reject) {
            try {
                var tx = getTransaction(storeName, 'readwrite');
                var store = tx.objectStore(storeName);
                if (!item.updatedAt) item.updatedAt = new Date().toISOString();
                var request = store.put(item);
                request.onsuccess = function() {
                    // Post-Save-Hook: Shadow-Sync triggern wenn Store in der Liste
                    try {
                        if (SHADOW_STORES.indexOf(storeName) >= 0 && item && item.kundeId) {
                            scheduleShadowSync(item.kundeId, storeName);
                        }
                    } catch(e) { /* Shadow-Sync ist best-effort */ }
                    resolve(item);
                };
                request.onerror = function(e) { reject(e.target.error); };
            } catch(e) { reject(e); }
        });
    }

    function getItem(storeName, id) {
        return new Promise(function(resolve, reject) {
            try {
                var tx = getTransaction(storeName, 'readonly');
                var store = tx.objectStore(storeName);
                var request = store.get(id);
                request.onsuccess = function() { resolve(request.result || null); };
                request.onerror = function(e) { reject(e.target.error); };
            } catch(e) { reject(e); }
        });
    }

    function getAllItems(storeName) {
        return new Promise(function(resolve, reject) {
            try {
                var tx = getTransaction(storeName, 'readonly');
                var store = tx.objectStore(storeName);
                var request = store.getAll();
                request.onsuccess = function() { resolve(request.result || []); };
                request.onerror = function(e) { reject(e.target.error); };
            } catch(e) { reject(e); }
        });
    }

    function getByIndex(storeName, indexName, value) {
        return new Promise(function(resolve, reject) {
            try {
                var tx = getTransaction(storeName, 'readonly');
                var store = tx.objectStore(storeName);
                var index = store.index(indexName);
                var request = index.getAll(value);
                request.onsuccess = function() { resolve(request.result || []); };
                request.onerror = function(e) { reject(e.target.error); };
            } catch(e) { reject(e); }
        });
    }

    function deleteItem(storeName, id) {
        return new Promise(function(resolve, reject) {
            try {
                var tx = getTransaction(storeName, 'readwrite');
                var store = tx.objectStore(storeName);
                var request = store.delete(id);
                request.onsuccess = function() { resolve(true); };
                request.onerror = function(e) { reject(e.target.error); };
            } catch(e) { reject(e); }
        });
    }

    function clearStore(storeName) {
        return new Promise(function(resolve, reject) {
            try {
                var tx = getTransaction(storeName, 'readwrite');
                var store = tx.objectStore(storeName);
                var request = store.clear();
                request.onsuccess = function() { resolve(true); };
                request.onerror = function(e) { reject(e.target.error); };
            } catch(e) { reject(e); }
        });
    }

    function putBatch(storeName, items) {
        return new Promise(function(resolve, reject) {
            try {
                var tx = getTransaction(storeName, 'readwrite');
                var store = tx.objectStore(storeName);
                var now = new Date().toISOString();
                items.forEach(function(item) {
                    if (!item.updatedAt) item.updatedAt = now;
                    store.put(item);
                });
                tx.oncomplete = function() {
                    // Post-Save-Hook: Shadow-Sync triggern fuer alle betroffenen Kunden
                    try {
                        if (SHADOW_STORES.indexOf(storeName) >= 0) {
                            var kundenIds = {};
                            items.forEach(function(it) {
                                if (it && it.kundeId) kundenIds[it.kundeId] = true;
                            });
                            Object.keys(kundenIds).forEach(function(kid) {
                                scheduleShadowSync(kid, storeName);
                            });
                        }
                    } catch(e) { /* Shadow-Sync ist best-effort */ }
                    resolve(items.length);
                };
                tx.onerror = function(e) { reject(e.target.error); };
            } catch(e) { reject(e); }
        });
    }

    // ================================================================
    // KOMFORT-FUNKTIONEN FUER DIE APP
    // ================================================================
    function saveKunde(kunde) {
        if (!kunde) return Promise.reject('Kein Kunde angegeben');
        var id = kunde._driveFolderId || kunde.id || kunde.name || (global.TW ? TW.Utils.generateId() : Date.now().toString(36));
        var record = Object.assign({}, kunde, { id: id, updatedAt: new Date().toISOString() });
        return putItem('kunden', record);
    }
    function loadKunde(kundeId) { return getItem('kunden', kundeId); }
    function listKunden() {
        return getAllItems('kunden').then(function(kunden) {
            return kunden.sort(function(a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
        });
    }
    function saveGesamtliste(kundeId, gesamtliste) {
        return putItem('gesamtlisten', { id: kundeId, kundeId: kundeId, positionen: gesamtliste, updatedAt: new Date().toISOString() });
    }
    function loadGesamtliste(kundeId) {
        return getItem('gesamtlisten', kundeId).then(function(r) { return r ? r.positionen : null; });
    }
    function saveRaum(kundeId, raum) {
        var id = kundeId + '_' + (raum.raumId || raum.name || Date.now().toString(36));
        return putItem('raeume', Object.assign({}, raum, { id: id, kundeId: kundeId, updatedAt: new Date().toISOString() }));
    }
    function loadRaeume(kundeId) { return getByIndex('raeume', 'kundeId', kundeId); }
    function saveRechnung(kundeId, rechnung) {
        var id = kundeId + '_' + (rechnung.rechnungNr || Date.now().toString(36));
        return putItem('rechnungen', Object.assign({}, rechnung, { id: id, kundeId: kundeId, updatedAt: new Date().toISOString() }));
    }
    function loadRechnungen(kundeId) { return getByIndex('rechnungen', 'kundeId', kundeId); }
    function saveKiAkte(kundeId, kiAkte) {
        return putItem('kiAkten', Object.assign({}, kiAkte, { id: kundeId, kundeId: kundeId, updatedAt: new Date().toISOString() }));
    }
    function loadKiAkte(kundeId) { return getItem('kiAkten', kundeId); }
    function saveSchriftverkehr(kundeId, dokument) {
        var id = kundeId + '_' + (dokument.docId || Date.now().toString(36));
        return putItem('schriftverkehr', Object.assign({}, dokument, { id: id, kundeId: kundeId, updatedAt: new Date().toISOString() }));
    }
    function loadSchriftverkehr(kundeId) { return getByIndex('schriftverkehr', 'kundeId', kundeId); }
    function saveAppState(key, value) {
        return putItem('appState', { key: key, value: value, updatedAt: new Date().toISOString() });
    }
    function loadAppState(key) {
        return getItem('appState', key).then(function(r) { return r ? r.value : null; });
    }
    function cacheDriveData(type, id, data) {
        return putItem('driveCache', { id: type + '_' + id, type: type, data: data, updatedAt: new Date().toISOString() });
    }
    function loadDriveCache(type, id) {
        return getItem('driveCache', type + '_' + id).then(function(r) { return r ? r.data : null; });
    }

    // ================================================================
    // BEARBEITUNGSSTAND (WIP) — Mittendrin aufhoeren und spaeter weitermachen
    // ================================================================
    function saveWip(kundeId, modulName, moduleState, page, meta) {
        var id = 'wip_' + kundeId + '_' + modulName;
        var record = {
            id: id,
            kundeId: kundeId,
            modulName: modulName,
            deviceId: _deviceId,
            savedAt: new Date().toISOString(),
            version: 1,
            page: page || null,
            moduleState: moduleState,
            meta: meta || {},
            updatedAt: new Date().toISOString()
        };
        return putItem('wip', record).then(function() {
            logSyncAction(kundeId, 'wip_save', modulName, id, (meta && meta.beschreibung) || '');
            return record;
        });
    }

    function loadWip(kundeId, modulName) {
        var id = 'wip_' + kundeId + '_' + modulName;
        return getItem('wip', id).then(function(record) {
            if (!record) return null;
            return {
                id: record.id,
                kundeId: record.kundeId,
                modulName: record.modulName,
                moduleState: record.moduleState,
                page: record.page,
                meta: record.meta,
                savedAt: record.savedAt,
                deviceId: record.deviceId
            };
        });
    }

    function deleteWip(kundeId, modulName) {
        var id = 'wip_' + kundeId + '_' + modulName;
        return deleteItem('wip', id).then(function() {
            logSyncAction(kundeId, 'wip_delete', modulName, id, '');
            return true;
        });
    }

    function listWips(kundeId) {
        return getByIndex('wip', 'kundeId', kundeId).then(function(records) {
            return records.map(function(r) {
                return {
                    id: r.id,
                    modulName: r.modulName,
                    page: r.page,
                    savedAt: r.savedAt,
                    meta: r.meta,
                    deviceId: r.deviceId
                };
            }).sort(function(a, b) { return (b.savedAt || '').localeCompare(a.savedAt || ''); });
        });
    }

    function hasWip(kundeId, modulName) {
        var id = 'wip_' + kundeId + '_' + modulName;
        return getItem('wip', id).then(function(record) {
            return !!record;
        });
    }

    // ================================================================
    // FOTO-STORE — Bilder als Blobs in IndexedDB (persistent, effizient)
    // ================================================================
    //
    // Architektur-Gedanke: Fotos werden NICHT mehr als Base64 im React-State
    // gehalten, sondern als Blobs in einem dedizierten Store. Der Aufmass-
    // Datensatz enthaelt nur noch die Foto-ID als Referenz. Das spart ~33%
    // Speicher gegenueber Base64 und macht Multi-Geraete-Sync moeglich.
    //
    // Foto-ID-Schema:
    //   foto_<kundeId>_<kontext>_<raumKey>_<wandId>_<timestamp>
    // Beispiel:
    //   foto_abc123_phase_rohzustand_bad-1_wand-nord_1713275400000
    //
    // Felder im Foto-Record:
    //   id           — eindeutige Foto-ID
    //   kundeId      — zugeordneter Kunde
    //   kontext      — 'phase' | 'objekt' | 'wand' | 'ki' | 'sonstige'
    //   raumKey      — Raum-Identifier (z.B. Raumname oder Raum-ID)
    //   subKey       — spezifischer Key innerhalb des Kontexts (z.B. Wand-ID, Phase)
    //   blob         — das eigentliche Bild (JPEG-Blob)
    //   meta         — Zeitstempel, Markierungen, Zuschnitt-Info, Phase, etc.
    //   driveUploaded— 0/1: bereits in Drive hochgeladen?
    //   driveFileId  — Drive-Datei-ID nach Upload (fuer spaetere Aktualisierung)
    //   createdAt    — wann aufgenommen
    //   updatedAt    — letzte Aenderung (z.B. bei Markierungen)
    // ================================================================

    // Hilfs-Funktion: Ein Bild auf vernuenftige Baustellen-Groesse komprimieren
    // (max 1920px lange Kante, JPEG Qualitaet 0.85 — spart ~70-90% vs. Original)
    function compressImageToBlob(dataUrlOrBlob, maxEdge, quality) {
        maxEdge = maxEdge || 1920;
        quality = (typeof quality === 'number') ? quality : 0.85;
        return new Promise(function(resolve, reject) {
            var img = new Image();
            var blobUrl = null; // Fuer revokeObjectURL nach Load
            var cleanup = function() {
                if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch(e) {} blobUrl = null; }
            };
            img.onload = function() {
                try {
                    var w = img.naturalWidth || img.width;
                    var h = img.naturalHeight || img.height;
                    var scale = 1;
                    if (w > maxEdge || h > maxEdge) {
                        scale = (w > h) ? (maxEdge / w) : (maxEdge / h);
                    }
                    var cw = Math.round(w * scale);
                    var ch = Math.round(h * scale);
                    var canvas = document.createElement('canvas');
                    canvas.width = cw;
                    canvas.height = ch;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, cw, ch);
                    cleanup();
                    canvas.toBlob(function(blob) {
                        if (blob) resolve(blob);
                        else reject(new Error('Canvas.toBlob fehlgeschlagen'));
                    }, 'image/jpeg', quality);
                } catch(e) { cleanup(); reject(e); }
            };
            img.onerror = function() { cleanup(); reject(new Error('Bild konnte nicht geladen werden')); };
            if (typeof dataUrlOrBlob === 'string') {
                img.src = dataUrlOrBlob;
            } else if (dataUrlOrBlob instanceof Blob) {
                blobUrl = URL.createObjectURL(dataUrlOrBlob);
                img.src = blobUrl;
            } else {
                reject(new Error('Ungueltiger Bild-Input'));
            }
        });
    }

    // ============================================================
    // NEU (Block A / Baustellen-Stabilitaet):
    // compressFileToDataUrl — liest ein File direkt ein, komprimiert
    // es ONLINE (max. 1920 px Kante, JPEG Q0.85) und gibt eine kleine
    // Data-URL zurueck. Verwendung in allen Foto-Upload-Handlern,
    // damit im React-State nie rohe 10-15 MB Handy-Fotos landen.
    // Groessen-Check: Dateien > MAX_INPUT_BYTES werden abgelehnt,
    // damit der Browser beim Parsen nicht kippt.
    // ============================================================
    var MAX_INPUT_BYTES = 25 * 1024 * 1024; // 25 MB Handy-Foto Cap
    function compressFileToDataUrl(file, maxEdge, quality) {
        return new Promise(function(resolve, reject) {
            if (!file) { reject(new Error('Keine Datei uebergeben')); return; }
            if (file.size && file.size > MAX_INPUT_BYTES) {
                reject(new Error('Foto zu grosz (' + Math.round(file.size/1024/1024) + ' MB, max. 25 MB).'));
                return;
            }
            compressImageToBlob(file, maxEdge || 1920, (typeof quality === 'number') ? quality : 0.85)
                .then(function(blob) {
                    return blobToDataURL(blob).then(function(dataUrl) {
                        resolve({ dataUrl: dataUrl, blob: blob, size: blob.size });
                    });
                })
                .catch(function(e) { reject(e); });
        });
    }

    // Blob → Data-URL (fuer die Anzeige im <img src=...>)
    function blobToDataURL(blob) {
        return new Promise(function(resolve, reject) {
            var r = new FileReader();
            r.onload = function() { resolve(r.result); };
            r.onerror = function() { reject(r.error); };
            r.readAsDataURL(blob);
        });
    }

    // Eindeutige Foto-ID erzeugen
    function makeFotoId(kundeId, kontext, raumKey, subKey) {
        var safe = function(s) { return String(s || 'x').replace(/[^a-zA-Z0-9_-]/g, '_'); };
        return 'foto_' + safe(kundeId) + '_' + safe(kontext) + '_' +
               safe(raumKey) + '_' + safe(subKey) + '_' + Date.now() +
               '_' + Math.random().toString(36).substr(2, 5);
    }

    // ═══ BLOCK D / FIX D1 — Auto-Cleanup bei voller IndexedDB ═══
    // Wenn putItem fuer ein Foto scheitert wegen QuotaExceededError,
    // loeschen wir die aeltesten bereits nach Drive hochgeladenen Fotos
    // (driveUploaded=1) — die sind im Drive-Archiv sicher und belegen
    // nur noch lokal Platz. Dann versuchen wir den Save erneut.
    //
    // Sicherheit: NIEMALS ungeladene Fotos loeschen (driveUploaded=0),
    // denn die sind NUR lokal vorhanden. Die bleiben auf jeden Fall.
    //
    // Rueckgabe: Anzahl der geloeschten Fotos, 0 wenn nichts entfernt wurde.
    function cleanupUploadedFotosForSpace(targetBytes) {
        return getAllItems('fotos').then(function(alle) {
            // Nur bereits hochgeladene Fotos nach Alter sortiert (aelteste zuerst)
            var uploaded = alle.filter(function(f) { return f.driveUploaded === 1; });
            uploaded.sort(function(a, b) {
                var ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
                var tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
                return ta - tb;
            });
            var freed = 0;
            var count = 0;
            var chain = Promise.resolve();
            // Mindestens 5x die Zielgroesse freimachen — gibt Puffer fuer
            // mehrere weitere Fotos, spart Hektik-Cleanups
            var wanted = Math.max(targetBytes * 5, 10 * 1024 * 1024); // min 10 MB
            uploaded.forEach(function(rec) {
                if (freed >= wanted) return;
                chain = chain.then(function() {
                    return deleteItem('fotos', rec.id).then(function() {
                        freed += rec.size || 0;
                        count++;
                    }).catch(function(){ /* ignore */ });
                });
            });
            return chain.then(function() {
                if (count > 0) console.log('[TW-Storage] Auto-Cleanup: ' + count + ' Drive-gesicherte Fotos geloescht, ' + Math.round(freed/1024/1024*10)/10 + ' MB frei.');
                return { geloescht: count, freigabeBytes: freed };
            });
        });
    }

    // Foto speichern (komprimiert, als Blob)
    // fotoInput: Base64-DataURL, Blob oder File
    // Rueckgabe: {id, dataUrl} — die dataUrl zur sofortigen Anzeige im State
    function saveFoto(kundeId, kontext, raumKey, subKey, fotoInput, meta) {
        if (!kundeId) return Promise.reject(new Error('kundeId fehlt'));
        var id = (meta && meta.id) || makeFotoId(kundeId, kontext, raumKey, subKey);
        return compressImageToBlob(fotoInput, 1920, 0.85).then(function(blob) {
            var record = {
                id: id,
                kundeId: String(kundeId),
                kontext: kontext || 'sonstige',
                raumKey: raumKey || '',
                subKey: subKey || '',
                blob: blob,
                size: blob.size,
                mimeType: 'image/jpeg',
                meta: meta || {},
                driveUploaded: 0,
                driveFileId: null,
                createdAt: (meta && meta.createdAt) || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            // BLOCK D / FIX D1 — Quota-Save mit Auto-Cleanup-Retry
            var tryPut = function() {
                return putItem('fotos', record).then(function() {
                    logSyncAction(kundeId, 'foto_save', kontext + '/' + raumKey + '/' + subKey, id, '');
                    return blobToDataURL(blob).then(function(dataUrl) {
                        return { id: id, dataUrl: dataUrl, size: blob.size };
                    });
                });
            };
            return tryPut().catch(function(err) {
                // Quota-Fehler? Dann Cleanup + einmal neu versuchen.
                var isQuota = err && (
                    err.name === 'QuotaExceededError' ||
                    err.code === 22 || err.code === 1014 ||
                    (err.message && /quota/i.test(err.message))
                );
                if (!isQuota) throw err;
                console.warn('[TW-Storage] Quota ueberschritten beim Foto-Save, starte Auto-Cleanup');
                return cleanupUploadedFotosForSpace(blob.size).then(function(res) {
                    if (res.geloescht === 0) {
                        // Nichts zum Aufraeumen vorhanden — klarer Fehler
                        throw new Error('Lokaler Speicher voll und kein Drive-gesichertes Foto zum Loeschen vorhanden. Bitte Fotos manuell bereinigen.');
                    }
                    return tryPut();
                });
            });
        });
    }

    // Foto-Metadaten aktualisieren (z.B. nach Zuschneiden oder Markieren)
    // Wenn ein neuer Blob/DataURL mitgegeben wird, wird das Bild ersetzt.
    function updateFoto(fotoId, patch, neuesBild) {
        return getItem('fotos', fotoId).then(function(rec) {
            if (!rec) return null;
            if (patch && patch.meta) rec.meta = Object.assign({}, rec.meta || {}, patch.meta);
            if (patch && patch.subKey) rec.subKey = patch.subKey;
            rec.updatedAt = new Date().toISOString();
            rec.driveUploaded = 0; // bei Aenderung erneut hochladen
            var pre = Promise.resolve(null);
            if (neuesBild) {
                pre = compressImageToBlob(neuesBild, 1920, 0.85).then(function(blob) {
                    rec.blob = blob;
                    rec.size = blob.size;
                });
            }
            return pre.then(function() {
                return putItem('fotos', rec).then(function() {
                    logSyncAction(rec.kundeId, 'foto_update', rec.kontext, rec.id, '');
                    return blobToDataURL(rec.blob).then(function(dataUrl) {
                        return { id: rec.id, dataUrl: dataUrl, size: rec.size };
                    });
                });
            });
        });
    }

    // Foto als DataURL laden (zur Anzeige)
    function loadFotoAsDataURL(fotoId) {
        return getItem('fotos', fotoId).then(function(rec) {
            if (!rec || !rec.blob) return null;
            return blobToDataURL(rec.blob).then(function(dataUrl) {
                return { id: rec.id, dataUrl: dataUrl, meta: rec.meta || {}, kontext: rec.kontext, raumKey: rec.raumKey, subKey: rec.subKey, driveUploaded: rec.driveUploaded };
            });
        });
    }

    // Alle Fotos eines Kunden auflisten (ohne Blobs, nur Metadaten)
    function listFotosByKunde(kundeId) {
        return getByIndex('fotos', 'kundeId', String(kundeId)).then(function(records) {
            return records.map(function(r) {
                return {
                    id: r.id, kontext: r.kontext, raumKey: r.raumKey, subKey: r.subKey,
                    size: r.size, meta: r.meta || {}, driveUploaded: r.driveUploaded,
                    driveFileId: r.driveFileId, createdAt: r.createdAt, updatedAt: r.updatedAt
                };
            });
        });
    }

    // Alle Fotos eines Kunden mit DataURLs laden (fuer Anzeige im UI)
    // WARNUNG: Teuer bei vielen Fotos -- bevorzugt loadFotosByIdsAsDataURLs
    // verwenden, wenn moeglich.
    function loadFotosByKundeAsDataURLs(kundeId) {
        return getByIndex('fotos', 'kundeId', String(kundeId)).then(function(records) {
            return Promise.all(records.map(function(r) {
                return blobToDataURL(r.blob).then(function(dataUrl) {
                    return {
                        id: r.id, dataUrl: dataUrl, kontext: r.kontext, raumKey: r.raumKey,
                        subKey: r.subKey, meta: r.meta || {}, size: r.size,
                        driveUploaded: r.driveUploaded, driveFileId: r.driveFileId,
                        createdAt: r.createdAt, updatedAt: r.updatedAt
                    };
                });
            }));
        });
    }

    // Foto loeschen
    function deleteFoto(fotoId) {
        return getItem('fotos', fotoId).then(function(rec) {
            if (!rec) return false;
            return deleteItem('fotos', fotoId).then(function() {
                logSyncAction(rec.kundeId, 'foto_delete', rec.kontext, fotoId, '');
                return true;
            });
        });
    }

    // BLOCK-B2-FIX (24.04.2026): Gezielt nur SPEZIFISCHE Fotos als DataURL laden.
    // Das verhindert, dass alle 100+ Fotos eines Kunden in den Heap gezogen werden,
    // obwohl nur ein Raumblatt mit evtl. 10-20 Fotos angezeigt wird.
    //
    // ids: Array von Foto-IDs (strings) die geladen werden sollen
    // Rueckgabe: Array von {id, dataUrl, kontext, raumKey, subKey, ...} fuer NUR diese IDs
    function loadFotosByIdsAsDataURLs(ids) {
        if (!Array.isArray(ids) || !ids.length) return Promise.resolve([]);
        // Einzelne getItem-Aufrufe, kein "alle Fotos in den Heap"
        var promises = ids.map(function(id) {
            return getItem('fotos', id).then(function(r) {
                if (!r || !r.blob) return null;
                return blobToDataURL(r.blob).then(function(dataUrl) {
                    return {
                        id: r.id, dataUrl: dataUrl, kontext: r.kontext, raumKey: r.raumKey,
                        subKey: r.subKey, meta: r.meta || {}, size: r.size,
                        driveUploaded: r.driveUploaded
                    };
                });
            }).catch(function() { return null; });
        });
        return Promise.all(promises).then(function(results) {
            return results.filter(function(r) { return r !== null; });
        });
    }

    // MEMORY-KRITISCHER FIX (24.04.2026): Blob-URLs statt Base64-DataURLs.
    //
    // Base64-DataURL: "data:image/jpeg;base64,/9j/4AAQSk..." (komplettes Bild im String)
    //  -> 1 Foto mit 3 MB Blob wird ~4 MB String. Bei 30 Fotos im State: 120 MB.
    //  -> Jeder React-Render kopiert die Strings. Heap schwillt an.
    //
    // Blob-URL: "blob:https://xyz.github.io/abc-123-def" (nur ~60 Byte Pointer)
    //  -> Der Browser haelt den Blob im Hintergrund, zeigt ihn bei <img src=...> live an.
    //  -> Bei 30 Fotos: nur 1.8 KB Pointer statt 120 MB Strings. ~99% weniger Heap.
    //
    // Rueckgabe: Array mit {id, blobUrl (statt dataUrl), ...}.
    // WICHTIG: Wenn die Fotos nicht mehr gebraucht werden, muss URL.revokeObjectURL
    // aufgerufen werden! Sonst bleiben die Blobs im Browser-Memory haengen.
    function loadFotosByIdsAsBlobURLs(ids) {
        if (!Array.isArray(ids) || !ids.length) return Promise.resolve([]);
        var promises = ids.map(function(id) {
            return getItem('fotos', id).then(function(r) {
                if (!r || !r.blob) return null;
                var blobUrl = URL.createObjectURL(r.blob);
                return {
                    id: r.id,
                    blobUrl: blobUrl,
                    dataUrl: blobUrl, // Kompatibilitaets-Alias fuer vorhandenen Code
                    kontext: r.kontext, raumKey: r.raumKey, subKey: r.subKey,
                    meta: r.meta || {}, size: r.size,
                    driveUploaded: r.driveUploaded
                };
            }).catch(function() { return null; });
        });
        return Promise.all(promises).then(function(results) {
            return results.filter(function(r) { return r !== null; });
        });
    }

    // Nicht hochgeladene Fotos eines Kunden ermitteln (fuer Hintergrund-Drive-Sync)
    function getUnuploadedFotos(kundeId) {
        return getByIndex('fotos', 'kundeId', String(kundeId)).then(function(records) {
            return records.filter(function(r) { return !r.driveUploaded; });
        });
    }

    // Markiere Foto als hochgeladen (nach erfolgreichem Drive-Upload)
    function markFotoAsUploaded(fotoId, driveFileId) {
        return getItem('fotos', fotoId).then(function(rec) {
            if (!rec) return null;
            rec.driveUploaded = 1;
            rec.driveFileId = driveFileId || null;
            rec.updatedAt = new Date().toISOString();
            return putItem('fotos', rec);
        });
    }

    // ================================================================
    // FOTO-DRIVE-SYNC — automatischer Hintergrund-Upload
    // ================================================================
    //
    // Zweck: Sobald Internet verfuegbar ist, werden alle noch nicht
    // hochgeladenen Fotos eines Kunden still im Hintergrund nach Google
    // Drive geschoben. Dabei wird pro Kunde der existierende "Bilder"-
    // Ordner verwendet (oder angelegt, falls noch nicht vorhanden).
    //
    // Merkmale:
    //   - Nur WIRKLICH neue/geaenderte Fotos werden hochgeladen
    //     (driveUploaded=0 → nach Upload driveUploaded=1)
    //   - Upload laeuft sequenziell (nicht parallel) — das ist bei
    //     schwachem Baustellenfunk stabiler als Parallel-Uploads
    //   - Bricht ein Upload ab (z.B. Funkloch), wird der naechste
    //     Lauf das Foto erneut versuchen
    //   - Dateiname-Schema: <kontext>_<raumKey>_<subKey>_<createdAt>.jpg
    //     z.B. "phase_rohzustand_Bad_Wand-Nord_2026-04-16T18-30.jpg"
    //   - Broadcast ueber Event 'fotosync:progress' fuer UI-Indikator
    //
    // Aufruf von aussen:
    //   TWStorage.FotoSync.syncKunde(kundeId, kundeDriveOrdnerId)
    //   TWStorage.FotoSync.onProgress(callback)
    // ================================================================

    var FotoSync = (function() {
        var _listeners = [];
        var _running = false;
        var _currentKundeId = null;

        function _broadcast(info) {
            _listeners.forEach(function(cb) { try { cb(info); } catch(e) {} });
        }

        function onProgress(cb) {
            if (typeof cb !== 'function') return function(){};
            _listeners.push(cb);
            return function() {
                _listeners = _listeners.filter(function(f) { return f !== cb; });
            };
        }

        function _makeDateiName(rec) {
            var safe = function(s) { return String(s || '').replace(/[^a-zA-Z0-9_-]/g, '_').substr(0, 40); };
            var ts = (rec.createdAt || new Date().toISOString()).replace(/[:.]/g, '-').substr(0, 19);
            return safe(rec.kontext) + '_' + safe(rec.raumKey) + '_' + safe(rec.subKey) + '_' + ts + '.jpg';
        }

        // ETAPPE 5: Slug fuer Drive-Ordnernamen (Umlaute ersetzt, Leerzeichen -> Bindestrich)
        function _slugify(s) {
            if (!s) return '';
            return String(s)
                .replace(/\u00e4/g, 'ae').replace(/\u00f6/g, 'oe').replace(/\u00fc/g, 'ue')
                .replace(/\u00c4/g, 'Ae').replace(/\u00d6/g, 'Oe').replace(/\u00dc/g, 'Ue')
                .replace(/\u00df/g, 'ss')
                .replace(/[^a-zA-Z0-9_\- ]/g, '')
                .trim()
                .replace(/\s+/g, '-')
                .substr(0, 60);
        }

        // ETAPPE 5: Unterordner-Name pro Raumblatt -- "Raumblatt_<Slug(raumKey)>"
        // Falls raumKey leer/unbekannt: "_unsortiert" als Fallback.
        function _getUnterordnerName(rec) {
            if (!rec || !rec.raumKey) return '_unsortiert';
            var slug = _slugify(rec.raumKey);
            if (!slug) return '_unsortiert';
            // rec.meta.raumblattNr kann falls vorhanden fuer Sortierung genutzt werden
            if (rec && rec.meta && rec.meta.raumblattNr) {
                var nr = String(rec.meta.raumblattNr).replace(/[^0-9]/g, '');
                if (nr) {
                    if (nr.length === 1) nr = '0' + nr;
                    return 'Raumblatt-' + nr + '_' + slug;
                }
            }
            return 'Raumblatt_' + slug;
        }

        // ETAPPE 5: Upload eines Fotos in den passenden Raumblatt-Unterordner
        // Nutzt einen Cache (ordnerCache) fuer die Ordner-IDs, damit nicht pro
        // Foto eine Drive-API-Abfrage kommt.
        function _uploadOne(rec, bilderOrdnerId, driveService, ordnerCache) {
            var dateiName = _makeDateiName(rec);
            var unterordnerName = _getUnterordnerName(rec);
            // Cache-Key ist der Unterordnername (eindeutig pro Kunde/Sync)
            var cached = ordnerCache && ordnerCache[unterordnerName];
            var ordnerPromise = cached
                ? Promise.resolve(cached)
                : driveService.findOrCreateFolder(bilderOrdnerId, unterordnerName).then(function(id) {
                    if (ordnerCache) ordnerCache[unterordnerName] = id;
                    return id;
                });
            return ordnerPromise.then(function(zielOrdnerId) {
                return driveService.uploadFile(zielOrdnerId, dateiName, 'image/jpeg', rec.blob)
                    .then(function(resp) {
                        return markFotoAsUploaded(rec.id, resp && resp.id).then(function() {
                            return { id: rec.id, driveFileId: resp && resp.id, name: dateiName, ordner: unterordnerName };
                        });
                    });
            });
        }

        // ETAPPE 5: Meta-JSON pro Raumblatt-Unterordner schreiben/aktualisieren.
        // Enthaelt Rekonstruktions-Info (Phasen, Wand-Zuordnung, Markierungen usw.)
        // aus den IndexedDB-Records -- kein neues Datenmodell, nur Export des
        // bestehenden meta-Feldes.
        function _writeMetaJson(kundeId, bilderOrdnerId, unterordnerName, unterordnerId, driveService) {
            var raumKey = unterordnerName.replace(/^Raumblatt[-_]?\d*_?/, '') || unterordnerName;
            return getByIndex('fotos', 'kundeId', String(kundeId)).then(function(allRecs) {
                if (!allRecs || allRecs.length === 0) return null;
                // Nur Fotos dieses Raumblatts filtern
                var myRecs = allRecs.filter(function(r) { return _getUnterordnerName(r) === unterordnerName; });
                if (myRecs.length === 0) return null;
                var metaObj = {
                    raumblattUnterordner: unterordnerName,
                    raumKey: myRecs[0].raumKey || raumKey,
                    lastSaved: new Date().toISOString(),
                    fotoCount: myRecs.length,
                    fotos: myRecs.map(function(r) {
                        return {
                            id: r.id,
                            filename: _makeDateiName(r),
                            kontext: r.kontext,
                            subKey: r.subKey,
                            phase: (r.meta && r.meta.phase) || null,
                            wandId: (r.meta && r.meta.wandId) || null,
                            marked: (r.meta && r.meta.marked) || false,
                            crop: (r.meta && r.meta.crop) || null,
                            markierungen: (r.meta && r.meta.markierungen) || null,
                            tileParams: (r.meta && r.meta.tileParams) || null,
                            analyseErgebnis: (r.meta && r.meta.analyseErgebnis) || null,
                            aufgenommen: (r.meta && r.meta.aufgenommen) || r.createdAt,
                            size: r.size,
                            driveFileId: r.driveFileId || null
                        };
                    })
                };
                var jsonBlob = new Blob([JSON.stringify(metaObj, null, 2)], { type: 'application/json' });
                // Alte Meta loeschen (falls existiert), dann neue hochladen -- "Last-Write-Wins"
                return driveService.listFiles(unterordnerId).then(function(files) {
                    var alteMeta = (files || []).filter(function(f) { return f.name === 'raumblatt-meta.json'; });
                    var delChain = Promise.resolve();
                    alteMeta.forEach(function(f) {
                        delChain = delChain.then(function() {
                            return driveService.deleteFile(f.id).catch(function(e) {
                                console.warn('[FotoSync Meta] Alte meta.json konnte nicht geloescht werden:', e.message);
                            });
                        });
                    });
                    return delChain.then(function() {
                        return driveService.uploadFile(unterordnerId, 'raumblatt-meta.json', 'application/json', jsonBlob);
                    });
                });
            });
        }

        // Haupt-Funktion: Alle nicht hochgeladenen Fotos eines Kunden
        // nach Drive synchronisieren. Sequenziell, fehlertolerant.
        function syncKunde(kundeId, kundeDriveOrdnerId) {
            if (!kundeId) return Promise.reject(new Error('kundeId fehlt'));
            if (!kundeDriveOrdnerId) return Promise.reject(new Error('Drive-Ordner-ID fehlt'));
            if (!window.GoogleDriveService || !window.GoogleDriveService.accessToken) {
                return Promise.reject(new Error('Google Drive nicht verbunden'));
            }
            if (_running && _currentKundeId === kundeId) {
                return Promise.resolve({ skipped: true, reason: 'bereits-laufend' });
            }
            _running = true;
            _currentKundeId = kundeId;

            var drv = window.GoogleDriveService;
            var bilderOrdnerName = (window.DRIVE_ORDNER && window.DRIVE_ORDNER.bilder) || 'Bilder';

            _broadcast({ phase: 'start', kundeId: kundeId });

            // 1) Bilder-Ordner finden oder erstellen
            return drv.findOrCreateFolder(kundeDriveOrdnerId, bilderOrdnerName).then(function(bo) {
                var bilderOrdnerId = (bo && (bo.id || bo)) || bo;
                // ETAPPE 5: Cache fuer Unterordner-IDs -- wird waehrend des Uploads gefuellt
                var ordnerCache = {};
                // 2) Nicht hochgeladene Fotos holen
                return getUnuploadedFotos(kundeId).then(function(fotos) {
                    if (!fotos || fotos.length === 0) {
                        _broadcast({ phase: 'idle', kundeId: kundeId, total: 0 });
                        return { uploaded: 0, total: 0, ordnerCache: ordnerCache, bilderOrdnerId: bilderOrdnerId };
                    }
                    _broadcast({ phase: 'uploading', kundeId: kundeId, total: fotos.length, done: 0 });
                    // 3) Sequenziell in Raumblatt-Unterordner hochladen
                    var done = 0, errors = 0;
                    var chain = Promise.resolve();
                    fotos.forEach(function(rec, idx) {
                        chain = chain.then(function() {
                            return _uploadOne(rec, bilderOrdnerId, drv, ordnerCache)
                                .then(function() {
                                    done++;
                                    _broadcast({ phase: 'uploading', kundeId: kundeId, total: fotos.length, done: done, current: rec.id });
                                })
                                .catch(function(err) {
                                    errors++;
                                    console.warn('[FotoSync] Upload fehlgeschlagen fuer', rec.id, err.message);
                                    // Bei Funkloch oder Token-Ablauf: Abbruch des gesamten Laufs
                                    if (err.message && (err.message.indexOf('401') >= 0 || err.message.indexOf('403') >= 0)) {
                                        throw err;
                                    }
                                });
                        });
                    });
                    return chain.then(function() {
                        return { uploaded: done, errors: errors, total: fotos.length, ordnerCache: ordnerCache, bilderOrdnerId: bilderOrdnerId };
                    });
                });
            }).then(function(result) {
                // ETAPPE 5: Nach erfolgreichem Upload pro Unterordner ein raumblatt-meta.json schreiben
                var metaChain = Promise.resolve();
                var cache = result.ordnerCache || {};
                var bilderOrdnerId = result.bilderOrdnerId;
                Object.keys(cache).forEach(function(unterordnerName) {
                    metaChain = metaChain.then(function() {
                        return _writeMetaJson(kundeId, bilderOrdnerId, unterordnerName, cache[unterordnerName], drv)
                            .catch(function(err) {
                                console.warn('[FotoSync Meta] Schreiben fehlgeschlagen fuer', unterordnerName, err.message);
                            });
                    });
                });
                return metaChain.then(function() { return result; });
            }).then(function(result) {
                _running = false;
                _currentKundeId = null;
                _broadcast({ phase: 'done', kundeId: kundeId, result: result });
                return result;
            }).catch(function(err) {
                _running = false;
                _currentKundeId = null;
                _broadcast({ phase: 'error', kundeId: kundeId, error: err.message });
                throw err;
            });
        }

        // ETAPPE 5: Einmalige Migration -- verschiebt Fotos, die flach im Bilder-Ordner
        // liegen, in ihren Raumblatt-Unterordner. Fotos ohne identifizierbares Raumblatt
        // wandern in "_unsortiert". Nutzt Drive-Move (nur Metadaten, keine Datenuebertragung).
        //
        // Trigger: einmalig pro Kunde. Flag in localStorage unter
        // 'tw_foto_migration_done_' + kundeId. Sollte nach Token-Error trotzdem
        // fortgesetzt werden koennen -- daher erst nach komplettem Durchlauf das Flag setzen.
        function migrateAltFotos(kundeId, kundeDriveOrdnerId) {
            if (!kundeId || !kundeDriveOrdnerId) return Promise.reject(new Error('kundeId/driveOrdnerId fehlt'));
            if (!window.GoogleDriveService || !window.GoogleDriveService.accessToken) {
                return Promise.reject(new Error('Google Drive nicht verbunden'));
            }
            var flagKey = 'tw_foto_migration_done_' + kundeId;
            try {
                if (localStorage.getItem(flagKey) === '1') {
                    return Promise.resolve({ skipped: true, reason: 'schon-migriert' });
                }
            } catch(e) {}

            var drv = window.GoogleDriveService;
            var bilderOrdnerName = (window.DRIVE_ORDNER && window.DRIVE_ORDNER.bilder) || 'Bilder';

            _broadcast({ phase: 'migration-start', kundeId: kundeId });

            return drv.findFolder(kundeDriveOrdnerId, bilderOrdnerName).then(function(bilderOrdnerId) {
                if (!bilderOrdnerId) {
                    // Kein Bilder-Ordner -> nichts zu migrieren
                    try { localStorage.setItem(flagKey, '1'); } catch(_) {}
                    _broadcast({ phase: 'migration-done', kundeId: kundeId, moved: 0, total: 0 });
                    return { moved: 0, total: 0, skipped: true };
                }
                // Alle Dateien FLACH im Bilder-Ordner auflisten (nicht in Unterordnern)
                return drv.listFiles(bilderOrdnerId, 'image/jpeg').then(function(flacheDateien) {
                    var kandidaten = (flacheDateien || []).filter(function(f) {
                        // Unterordner ausschliessen (listFiles mit mimeType-Filter gibt nur Bilder,
                        // aber zur Sicherheit)
                        return f && f.mimeType !== 'application/vnd.google-apps.folder';
                    });
                    if (kandidaten.length === 0) {
                        try { localStorage.setItem(flagKey, '1'); } catch(_) {}
                        _broadcast({ phase: 'migration-done', kundeId: kundeId, moved: 0, total: 0 });
                        return { moved: 0, total: 0 };
                    }
                    _broadcast({ phase: 'migration-scanning', kundeId: kundeId, total: kandidaten.length });

                    // Fuer jede flache Datei: raumKey aus Dateiname rekonstruieren,
                    // Zielordner bestimmen, verschieben.
                    var ordnerCache = {};
                    var done = 0, errors = 0;
                    var chain = Promise.resolve();

                    kandidaten.forEach(function(datei) {
                        chain = chain.then(function() {
                            // Dateinamen parsen -> raumKey ermitteln
                            var parsed = parseFotoDateiName(datei.name);
                            var fakeRec = {
                                raumKey: (parsed && parsed.raumKey) || null,
                                meta: {}
                            };
                            var unterordnerName = _getUnterordnerName(fakeRec);
                            var cached = ordnerCache[unterordnerName];
                            var ordnerPromise = cached
                                ? Promise.resolve(cached)
                                : drv.findOrCreateFolder(bilderOrdnerId, unterordnerName).then(function(id) {
                                    ordnerCache[unterordnerName] = id;
                                    return id;
                                });
                            return ordnerPromise.then(function(zielOrdnerId) {
                                return drv.moveFile(datei.id, zielOrdnerId, bilderOrdnerId);
                            }).then(function() {
                                done++;
                                _broadcast({ phase: 'migration-moving', kundeId: kundeId, total: kandidaten.length, done: done, current: datei.name, ziel: unterordnerName });
                            }).catch(function(err) {
                                errors++;
                                console.warn('[FotoSync Migration] Move fehlgeschlagen fuer', datei.name, err.message);
                                if (err.message && (err.message.indexOf('401') >= 0 || err.message.indexOf('403') >= 0)) {
                                    throw err;
                                }
                            });
                        });
                    });

                    return chain.then(function() {
                        // Nur bei Erfolg ohne Token-Error das Flag setzen
                        try { localStorage.setItem(flagKey, '1'); } catch(_) {}
                        _broadcast({ phase: 'migration-done', kundeId: kundeId, moved: done, total: kandidaten.length, errors: errors });
                        return { moved: done, total: kandidaten.length, errors: errors };
                    });
                });
            }).catch(function(err) {
                _broadcast({ phase: 'migration-error', kundeId: kundeId, error: err.message });
                throw err;
            });
        }

        function isRunning() { return _running; }
        function getCurrentKundeId() { return _currentKundeId; }

        // Parst den Dateinamen einer im Bilder-Ordner hochgeladenen Datei zurueck
        // zu den Ursprungs-Metadaten. Format (siehe _makeDateiName):
        //   <kontext>_<raumKey>_<subKey>_<YYYY-MM-DDTHH-MM-SS>.jpg
        // Gibt null zurueck, wenn der Name nicht dem Muster folgt.
        function parseFotoDateiName(name) {
            if (!name) return null;
            var base = name.replace(/\.jpe?g$/i, '');
            var parts = base.split('_');
            if (parts.length < 4) return null;
            var tsPart = parts[parts.length - 1];
            // Timestamp-Form: 2025-04-17T14-32-18 -> ISO rekonstruieren
            var tsMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})$/.exec(tsPart);
            if (!tsMatch) return null;
            var iso = tsMatch[1] + 'T' + tsMatch[2] + ':' + tsMatch[3] + ':' + tsMatch[4];
            var subKey = parts[parts.length - 2];
            var raumKey = parts[parts.length - 3];
            var kontext = parts.slice(0, parts.length - 3).join('_');
            return { kontext: kontext, raumKey: raumKey, subKey: subKey, createdAt: iso };
        }

        // Download-Sync: holt Fotos aus dem Drive-Bilder-Ordner, die lokal
        // noch nicht vorhanden sind, und speichert sie in IndexedDB mit den
        // aus dem Dateinamen parsed Metadaten. Multi-Geraete-Szenario:
        //   - Handy macht Fotos -> FotoSync.syncKunde uploadet -> Drive
        //   - Tablet/PC oeffnet Akte -> diese Funktion zieht sie runter
        // Idempotent: bereits lokal vorhandene Drive-IDs werden uebersprungen.
        function downloadMissingFotos(kundeId, kundeDriveOrdnerId) {
            if (!kundeId) return Promise.reject(new Error('kundeId fehlt'));
            if (!kundeDriveOrdnerId) return Promise.reject(new Error('Drive-Ordner-ID fehlt'));
            if (!window.GoogleDriveService || !window.GoogleDriveService.accessToken) {
                return Promise.reject(new Error('Google Drive nicht verbunden'));
            }
            var drv = window.GoogleDriveService;
            var bilderOrdnerName = (window.DRIVE_ORDNER && window.DRIVE_ORDNER.bilder) || 'Bilder';

            _broadcast({ phase: 'download-start', kundeId: kundeId });

            // 1) Bilder-Ordner finden (falls nicht vorhanden: nichts zu tun)
            return drv.listFolderContents(kundeDriveOrdnerId).then(function(contents) {
                var bilderOrdner = (contents.folders || []).find(function(f) {
                    return (f.name || '').toLowerCase() === bilderOrdnerName.toLowerCase();
                });
                if (!bilderOrdner) {
                    _broadcast({ phase: 'download-done', kundeId: kundeId, downloaded: 0, total: 0, skipped: 0 });
                    return { downloaded: 0, total: 0, skipped: 0 };
                }
                // 2) Alle Dateien im Bilder-Ordner listen
                return drv.listFolderContents(bilderOrdner.id).then(function(sub) {
                    var alleDateien = (sub.files || []).concat(sub.pdfs || []);
                    // Nur Bilddateien
                    var bildDateien = alleDateien.filter(function(d) {
                        var n = (d.name || '').toLowerCase();
                        return n.endsWith('.jpg') || n.endsWith('.jpeg') ||
                               (d.mimeType && d.mimeType.indexOf('image') >= 0);
                    });
                    if (bildDateien.length === 0) {
                        _broadcast({ phase: 'download-done', kundeId: kundeId, downloaded: 0, total: 0, skipped: 0 });
                        return { downloaded: 0, total: 0, skipped: 0 };
                    }
                    // 3) Bereits lokal vorhandene Drive-IDs ermitteln (idempotent)
                    return getByIndex('fotos', 'kundeId', kundeId).then(function(lokale) {
                        var bekannteDriveIds = {};
                        lokale.forEach(function(r) { if (r.driveFileId) bekannteDriveIds[r.driveFileId] = true; });
                        var zuLaden = bildDateien.filter(function(d) { return !bekannteDriveIds[d.id]; });
                        if (zuLaden.length === 0) {
                            _broadcast({ phase: 'download-done', kundeId: kundeId, downloaded: 0, total: bildDateien.length, skipped: bildDateien.length });
                            return { downloaded: 0, total: bildDateien.length, skipped: bildDateien.length };
                        }
                        _broadcast({ phase: 'downloading', kundeId: kundeId, total: zuLaden.length, done: 0 });
                        // 4) Sequenziell downloaden und lokal speichern
                        var done = 0, errors = 0;
                        var chain = Promise.resolve();
                        zuLaden.forEach(function(datei) {
                            chain = chain.then(function() {
                                return drv.downloadFile(datei.id).then(function(blob) {
                                    var parsed = parseFotoDateiName(datei.name) || { kontext: 'sonstige', raumKey: '', subKey: '', createdAt: datei.modifiedTime || new Date().toISOString() };
                                    // Direkt als Record speichern (ohne compressImageToBlob -- kommt ja schon komprimiert)
                                    var id = 'foto_drive_' + datei.id;
                                    var record = {
                                        id: id,
                                        kundeId: String(kundeId),
                                        kontext: parsed.kontext || 'sonstige',
                                        raumKey: parsed.raumKey || '',
                                        subKey: parsed.subKey || '',
                                        blob: blob,
                                        size: blob.size,
                                        mimeType: blob.type || 'image/jpeg',
                                        meta: { source: 'drive-download', driveName: datei.name },
                                        driveUploaded: 1,
                                        driveFileId: datei.id,
                                        createdAt: parsed.createdAt,
                                        updatedAt: new Date().toISOString()
                                    };
                                    return putItem('fotos', record).then(function() {
                                        done++;
                                        _broadcast({ phase: 'downloading', kundeId: kundeId, total: zuLaden.length, done: done, current: datei.name });
                                    });
                                }).catch(function(err) {
                                    errors++;
                                    console.warn('[FotoSync Download] Fehler bei', datei.name, err.message);
                                });
                            });
                        });
                        return chain.then(function() {
                            _broadcast({ phase: 'download-done', kundeId: kundeId, downloaded: done, total: zuLaden.length, errors: errors, skipped: bildDateien.length - zuLaden.length });
                            return { downloaded: done, total: zuLaden.length, errors: errors, skipped: bildDateien.length - zuLaden.length };
                        });
                    });
                });
            });
        }

        return {
            syncKunde: syncKunde,
            downloadMissingFotos: downloadMissingFotos,
            parseFotoDateiName: parseFotoDateiName,
            onProgress: onProgress,
            isRunning: isRunning,
            getCurrentKundeId: getCurrentKundeId,
            // ETAPPE 5: Migration und Unterordner-Helpers oeffentlich
            migrateAltFotos: migrateAltFotos,
            getUnterordnerName: _getUnterordnerName,
            slugify: _slugify
        };
    })();


    function saveAusgangsbuchEintrag(eintrag) {
        if (!eintrag || !eintrag.id) return Promise.reject('Kein Eintrag oder ID');
        eintrag.updatedAt = new Date().toISOString();
        return putItem('ausgangsbuch', eintrag);
    }

    function loadAusgangsbuch(kundeId) {
        if (kundeId) {
            return getByIndex('ausgangsbuch', 'kundeId', kundeId).then(function(records) {
                return records.sort(function(a, b) { return (b.datum || '').localeCompare(a.datum || ''); });
            });
        }
        return getAllItems('ausgangsbuch').then(function(records) {
            return records.sort(function(a, b) { return (b.datum || '').localeCompare(a.datum || ''); });
        });
    }

    function deleteAusgangsbuchEintrag(id) {
        return deleteItem('ausgangsbuch', id);
    }

    function migrateAusgangsbuchFromLocalStorage() {
        try {
            var lsData = localStorage.getItem('tw_ausgangsbuch');
            if (!lsData) return Promise.resolve({ migrated: 0 });
            var eintraege = JSON.parse(lsData);
            if (!Array.isArray(eintraege) || eintraege.length === 0) return Promise.resolve({ migrated: 0 });
            console.log('[TW-Storage] Migriere ' + eintraege.length + ' Ausgangsbuch-Eintraege von localStorage nach IndexedDB...');
            var now = new Date().toISOString();
            eintraege.forEach(function(e) {
                if (!e.updatedAt) e.updatedAt = now;
                if (!e.datum) e.datum = now.split('T')[0];
            });
            return putBatch('ausgangsbuch', eintraege).then(function(count) {
                localStorage.removeItem('tw_ausgangsbuch');
                console.log('%c[TW-Storage] Ausgangsbuch-Migration abgeschlossen: ' + count + ' Eintraege', 'color: #2ecc71; font-weight: bold;');
                return { migrated: count };
            });
        } catch(e) {
            console.warn('[TW-Storage] Ausgangsbuch-Migration fehlgeschlagen:', e);
            return Promise.resolve({ migrated: 0, error: e.message });
        }
    }

    // ================================================================
    // DRIVE-SYNC: Ordnerstruktur + Dateien offline verfuegbar
    // ================================================================

    function shouldSyncFile(fileName, mimeType, sizeBytes) {
        if (!fileName) return false;
        var nameLower = fileName.toLowerCase();
        // Bilder werden jetzt mitgesynct
        // Zu grosse Dateien ausschliessen
        if (sizeBytes && sizeBytes > CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) return false;
        // Google-native Docs werden exportiert (immer erlaubt)
        if (mimeType && CONFIG.GOOGLE_EXPORT_TYPES[mimeType]) return true;
        // Explizit erlaubte Dateitypen
        for (var j = 0; j < CONFIG.SYNC_FILE_TYPES.length; j++) {
            if (nameLower.endsWith(CONFIG.SYNC_FILE_TYPES[j])) return true;
        }
        // Video/Audio ausschliessen
        if (mimeType) {
            if (mimeType.indexOf('video/') === 0) return false;
            if (mimeType.indexOf('audio/') === 0) return false;
        }
        return true;
    }

    function saveOrdnerStruktur(kundeId, ordner) {
        return putItem('driveOrdner', {
            id: ordner.id,
            kundeId: kundeId,
            parentId: ordner.parentId || kundeId,
            name: ordner.name,
            driveId: ordner.driveId || ordner.id,
            path: ordner.path || '/' + ordner.name,
            fileCount: ordner.fileCount || 0,
            syncedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    function saveDatei(kundeId, ordnerId, dateiInfo, blobData) {
        return new Promise(function(resolve, reject) {
            function doSave(arrayBuf) {
                var record = {
                    id: dateiInfo.id || (kundeId + '_' + ordnerId + '_' + dateiInfo.name),
                    kundeId: kundeId,
                    ordnerId: ordnerId,
                    name: dateiInfo.name,
                    driveId: dateiInfo.driveId || dateiInfo.id,
                    mimeType: dateiInfo.mimeType || 'application/octet-stream',
                    fileType: dateiInfo.fileType || 'sonstige',
                    sizeBytes: arrayBuf ? arrayBuf.byteLength : 0,
                    data: arrayBuf,
                    originalSize: dateiInfo.size || null,
                    syncedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                putItem('driveDateien', record).then(resolve).catch(reject);
            }
            if (blobData instanceof Blob) {
                var reader = new FileReader();
                reader.onload = function() { doSave(reader.result); };
                reader.onerror = function() { reject(reader.error); };
                reader.readAsArrayBuffer(blobData);
            } else {
                doSave(blobData);
            }
        });
    }

    function loadDatei(dateiId) {
        return getItem('driveDateien', dateiId).then(function(record) {
            if (!record || !record.data) return null;
            return {
                name: record.name,
                mimeType: record.mimeType,
                fileType: record.fileType,
                sizeBytes: record.sizeBytes,
                blob: new Blob([record.data], { type: record.mimeType }),
                syncedAt: record.syncedAt
            };
        });
    }

    function loadDateienByOrdner(ordnerId) {
        return getByIndex('driveDateien', 'ordnerId', ordnerId).then(function(records) {
            return records.map(function(r) {
                return { id: r.id, name: r.name, mimeType: r.mimeType, fileType: r.fileType,
                         sizeBytes: r.sizeBytes, driveId: r.driveId, syncedAt: r.syncedAt, hasData: !!(r.data) };
            });
        });
    }

    function loadOrdnerStruktur(kundeId) {
        return getByIndex('driveOrdner', 'kundeId', kundeId).then(function(ordner) {
            return ordner.sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
        });
    }

    function getKundeStorageSize(kundeId) {
        return getByIndex('driveDateien', 'kundeId', kundeId).then(function(dateien) {
            var totalBytes = 0, fileCount = 0;
            dateien.forEach(function(d) { if (d.sizeBytes) totalBytes += d.sizeBytes; fileCount++; });
            return {
                totalBytes: totalBytes,
                totalMB: Math.round(totalBytes / (1024 * 1024) * 100) / 100,
                fileCount: fileCount,
                limitMB: Math.round(CONFIG.MAX_BYTES_PER_KUNDE / (1024 * 1024)),
                percentUsed: CONFIG.MAX_BYTES_PER_KUNDE > 0 ? Math.round(totalBytes / CONFIG.MAX_BYTES_PER_KUNDE * 10000) / 100 : 0
            };
        });
    }

    // ================================================================
    // DRIVE-SYNC ENGINE
    // ================================================================
    var _syncInProgress = {};
    var PARALLEL_DOWNLOADS = 4;  // Gleichzeitige Downloads (Google API vertraegt 4-6)
    var PARALLEL_FOLDER_SCANS = 3;  // Gleichzeitige Ordner-Scans

    var DriveSync = {
        syncKundenOrdner: async function(kundeId, driveFolderId, onProgress) {
            if (_syncInProgress[kundeId]) {
                console.warn('[DriveSync] Sync bereits aktiv fuer:', kundeId);
                return { status: 'already_running' };
            }
            _syncInProgress[kundeId] = true;
            var service = global.GoogleDriveService;
            if (!service || !service.accessToken) {
                _syncInProgress[kundeId] = false;
                throw new Error('Google Drive nicht verbunden');
            }

            var stats = {
                ordnerGesamt: 0, ordnerSynced: 0,
                dateienGesamt: 0, dateienSynced: 0, dateienSkipped: 0,
                bytesGesamt: 0, fehler: [], startTime: Date.now()
            };

            var notify = function(msg, phase) {
                if (onProgress) {
                    onProgress({
                        message: msg, phase: phase || 'sync', stats: Object.assign({}, stats),
                        percent: stats.dateienGesamt > 0
                            ? Math.round((stats.dateienSynced + stats.dateienSkipped) / stats.dateienGesamt * 100) : 0
                    });
                }
            };

            try {
                notify('Ordnerstruktur wird gescannt...', 'scan');

                // 1. TURBO-SCAN: Paralleler rekursiver Ordner-Scan
                var structure = await this._scanFolderParallel(service, driveFolderId, kundeId, '/', null);
                stats.ordnerGesamt = structure.allFolders.length;
                stats.dateienGesamt = structure.allFiles.length;
                notify(stats.ordnerGesamt + ' Ordner, ' + stats.dateienGesamt + ' Dateien gefunden', 'scan');

                // 2. Ordnerstruktur speichern (parallel in Batches)
                var folderBatches = this._createBatches(structure.allFolders, 10);
                for (var bi = 0; bi < folderBatches.length; bi++) {
                    await Promise.all(folderBatches[bi].map(function(f) {
                        return saveOrdnerStruktur(kundeId, f);
                    }));
                    stats.ordnerSynced += folderBatches[bi].length;
                }
                notify('Ordner gespeichert. Filtere Dateien...', 'filter');

                // 3. Dateien filtern + Speicher-Budget pruefen
                var currentSize = await getKundeStorageSize(kundeId);
                var remainingBytes = CONFIG.MAX_BYTES_PER_KUNDE - currentSize.totalBytes;

                var downloadQueue = [];
                var skipChecks = [];

                // Vorab-Filter: Sync-wuerdige Dateien bestimmen
                for (var fi = 0; fi < structure.allFiles.length; fi++) {
                    var fileInfo = structure.allFiles[fi];
                    var sizeBytes = fileInfo.sizeBytes || 0;

                    if (!shouldSyncFile(fileInfo.name, fileInfo.mimeType, sizeBytes)) {
                        stats.dateienSkipped++;
                        continue;
                    }
                    if (sizeBytes > 0 && sizeBytes > remainingBytes) {
                        stats.dateienSkipped++;
                        stats.fehler.push({ file: fileInfo.name, error: 'Speicherlimit' });
                        continue;
                    }
                    skipChecks.push(fileInfo);
                }

                // Cache-Check parallel (existierende Dateien pruefen)
                notify('Pruefe ' + skipChecks.length + ' Dateien auf Aktualitaet...', 'filter');
                var cacheCheckBatches = this._createBatches(skipChecks, 20);
                for (var ci = 0; ci < cacheCheckBatches.length; ci++) {
                    var checkResults = await Promise.all(cacheCheckBatches[ci].map(function(fInfo) {
                        return getItem('driveDateien', fInfo.id).then(function(existing) {
                            if (existing && existing.syncedAt && fInfo.modifiedTime) {
                                if (new Date(existing.syncedAt) >= new Date(fInfo.modifiedTime)) {
                                    return { skip: true, file: fInfo };
                                }
                            }
                            return { skip: false, file: fInfo };
                        });
                    }));
                    checkResults.forEach(function(r) {
                        if (r.skip) { stats.dateienSkipped++; }
                        else { downloadQueue.push(r.file); }
                    });
                }

                notify(downloadQueue.length + ' Dateien werden heruntergeladen (' + PARALLEL_DOWNLOADS + 'x parallel)...', 'download');

                // 4. TURBO-DOWNLOAD: Parallele Downloads in Batches
                var self = this;
                var dlBatches = this._createBatches(downloadQueue, PARALLEL_DOWNLOADS);

                for (var dbi = 0; dbi < dlBatches.length; dbi++) {
                    var batch = dlBatches[dbi];
                    var batchNum = dbi + 1;
                    var totalBatches = dlBatches.length;

                    notify('Batch ' + batchNum + '/' + totalBatches + ' (' + batch.map(function(f){return f.name;}).join(', ').substring(0,60) + '...)', 'download');

                    var batchResults = await Promise.allSettled(batch.map(function(fInfo) {
                        return self._downloadAndSave(service, kundeId, fInfo);
                    }));

                    // Ergebnisse auswerten
                    batchResults.forEach(function(result, idx) {
                        if (result.status === 'fulfilled' && result.value) {
                            stats.dateienSynced++;
                            stats.bytesGesamt += result.value.size || 0;
                            remainingBytes -= result.value.size || 0;
                        } else {
                            stats.dateienSkipped++;
                            var errMsg = result.reason ? result.reason.message : 'Unbekannter Fehler';
                            stats.fehler.push({ file: batch[idx].name, error: errMsg });
                        }
                    });

                    // Fortschritt nach jedem Batch
                    notify(stats.dateienSynced + ' von ' + downloadQueue.length + ' geladen (' +
                        Math.round(stats.bytesGesamt / 1024 / 1024 * 10) / 10 + ' MB)', 'download');
                }

                // 5. Sync-Meta speichern
                var durationMs = Date.now() - stats.startTime;
                await putItem('meta', {
                    key: 'sync_' + kundeId,
                    value: { kundeId: kundeId, driveFolderId: driveFolderId, syncedAt: new Date().toISOString(), stats: stats, durationMs: durationMs },
                    updatedAt: new Date().toISOString()
                });

                var durationSec = Math.round(durationMs / 1000);
                notify('Fertig! ' + stats.dateienSynced + ' Dateien (' +
                    Math.round(stats.bytesGesamt / 1024 / 1024 * 10) / 10 + ' MB) in ' + durationSec + 's', 'done');

                _syncInProgress[kundeId] = false;
                return { status: 'ok', stats: stats, durationMs: durationMs };
            } catch(err) {
                _syncInProgress[kundeId] = false;
                console.error('[DriveSync] Fehler:', err);
                throw err;
            }
        },

        // Einzelne Datei herunterladen und speichern (fuer parallele Ausfuehrung)
        _downloadAndSave: async function(service, kundeId, fileInfo) {
            var blob = null;
            if (fileInfo.mimeType && CONFIG.GOOGLE_EXPORT_TYPES[fileInfo.mimeType]) {
                var exportInfo = CONFIG.GOOGLE_EXPORT_TYPES[fileInfo.mimeType];
                blob = await this._exportGoogleFile(service, fileInfo.driveId, exportInfo.exportAs);
                fileInfo.name = fileInfo.name + exportInfo.ext;
                fileInfo.mimeType = exportInfo.exportAs;
            } else {
                blob = await service.downloadFile(fileInfo.driveId);
            }
            if (blob) {
                await saveDatei(kundeId, fileInfo.ordnerId, fileInfo, blob);
                return { size: blob.size || 0 };
            }
            return { size: 0 };
        },

        // Paralleler Ordner-Scanner (scannt Unterordner gleichzeitig)
        _scanFolderParallel: async function(service, folderId, kundeId, path, parentId) {
            var allFolders = [];
            var allFiles = [];
            var query = "'" + folderId + "' in parents and trashed=false";
            var url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) +
                '&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=name&pageSize=500';
            var data = await service._fetchJSON(url);
            var items = data.files || [];

            var subFolders = [];
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item.mimeType === 'application/vnd.google-apps.folder') {
                    var folderRecord = {
                        id: item.id, driveId: item.id, name: item.name,
                        parentId: parentId || kundeId, path: path + item.name + '/', fileCount: 0
                    };
                    allFolders.push(folderRecord);
                    subFolders.push({ record: folderRecord, driveId: item.id, path: path + item.name + '/' });
                } else {
                    allFiles.push({
                        id: kundeId + '_' + (parentId || folderId) + '_' + item.name,
                        driveId: item.id, name: item.name, mimeType: item.mimeType,
                        sizeBytes: item.size ? parseInt(item.size, 10) : 0,
                        modifiedTime: item.modifiedTime,
                        ordnerId: parentId || folderId,
                        fileType: service._getFileType ? service._getFileType(item.mimeType, item.name) : 'sonstige',
                        path: path + item.name
                    });
                }
            }

            // Unterordner PARALLEL scannen (in Batches von PARALLEL_FOLDER_SCANS)
            if (subFolders.length > 0) {
                var self = this;
                var folderBatches = this._createBatches(subFolders, PARALLEL_FOLDER_SCANS);
                for (var bi = 0; bi < folderBatches.length; bi++) {
                    var batchResults = await Promise.all(folderBatches[bi].map(function(sf) {
                        return self._scanFolderParallel(service, sf.driveId, kundeId, sf.path, sf.record.id);
                    }));
                    batchResults.forEach(function(subResult, idx) {
                        allFolders = allFolders.concat(subResult.allFolders);
                        allFiles = allFiles.concat(subResult.allFiles);
                        folderBatches[bi][idx].record.fileCount = subResult.allFiles.length;
                    });
                }
            }

            return { allFolders: allFolders, allFiles: allFiles };
        },

        // Helper: Array in Batches aufteilen
        _createBatches: function(arr, batchSize) {
            var batches = [];
            for (var i = 0; i < arr.length; i += batchSize) {
                batches.push(arr.slice(i, i + batchSize));
            }
            return batches;
        },

        _exportGoogleFile: async function(service, fileId, exportMimeType) {
            var resp = await service._fetch(
                'https://www.googleapis.com/drive/v3/files/' + fileId + '/export?mimeType=' + encodeURIComponent(exportMimeType)
            );
            return resp.blob();
        },

        getSyncStatus: async function(kundeId) {
            var meta = await getItem('meta', 'sync_' + kundeId);
            var storage = await getKundeStorageSize(kundeId);
            var ordner = await loadOrdnerStruktur(kundeId);
            return {
                synced: !!(meta && meta.value),
                lastSync: meta && meta.value ? meta.value.syncedAt : null,
                stats: meta && meta.value ? meta.value.stats : null,
                storage: storage, ordnerCount: ordner.length,
                isRunning: !!_syncInProgress[kundeId]
            };
        },

        isOfflineAvailable: async function(kundeId) {
            var meta = await getItem('meta', 'sync_' + kundeId);
            return !!(meta && meta.value && meta.value.syncedAt);
        }
    };

    // ================================================================
    // OFFLINE-ORDNER-BROWSER
    // ================================================================
    var OfflineBrowser = {
        getRootFolders: function(kundeId) {
            return getByIndex('driveOrdner', 'kundeId', kundeId).then(function(alle) {
                return alle.filter(function(o) { return o.parentId === kundeId; })
                    .sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
            });
        },
        getSubFolders: function(parentId) {
            return getByIndex('driveOrdner', 'parentId', parentId).then(function(ordner) {
                return ordner.sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
            });
        },
        getFiles: function(ordnerId) { return loadDateienByOrdner(ordnerId); },
        openFile: function(dateiId) {
            return loadDatei(dateiId).then(function(result) {
                if (!result || !result.blob) return null;
                return { name: result.name, mimeType: result.mimeType, url: URL.createObjectURL(result.blob), blob: result.blob };
            });
        },
        getFullTree: async function(kundeId) {
            var allOrdner = await getByIndex('driveOrdner', 'kundeId', kundeId);
            var allDateien = await getByIndex('driveDateien', 'kundeId', kundeId);
            var dateienByOrdner = {};
            allDateien.forEach(function(d) {
                if (!dateienByOrdner[d.ordnerId]) dateienByOrdner[d.ordnerId] = [];
                dateienByOrdner[d.ordnerId].push({
                    id: d.id, name: d.name, mimeType: d.mimeType,
                    fileType: d.fileType, sizeBytes: d.sizeBytes, syncedAt: d.syncedAt
                });
            });
            function buildNode(ordner) {
                return {
                    id: ordner.id, name: ordner.name, path: ordner.path,
                    files: dateienByOrdner[ordner.id] || [],
                    subfolders: allOrdner
                        .filter(function(o) { return o.parentId === ordner.id; })
                        .map(buildNode)
                        .sort(function(a, b) { return a.name.localeCompare(b.name); })
                };
            }
            var rootOrdner = allOrdner.filter(function(o) { return o.parentId === kundeId; });
            return rootOrdner.map(buildNode).sort(function(a, b) { return a.name.localeCompare(b.name); });
        }
    };

    // ================================================================
    // SPEICHER-INFO & VERWALTUNG
    // ================================================================
    function getStorageInfo() {
        if (navigator.storage && navigator.storage.estimate) {
            return navigator.storage.estimate().then(function(estimate) {
                return {
                    usage: estimate.usage || 0, quota: estimate.quota || 0,
                    usageMB: Math.round((estimate.usage || 0) / (1024 * 1024) * 100) / 100,
                    quotaMB: Math.round((estimate.quota || 0) / (1024 * 1024)),
                    quotaGB: Math.round((estimate.quota || 0) / (1024 * 1024 * 1024) * 100) / 100,
                    percentUsed: estimate.quota ? Math.round((estimate.usage / estimate.quota) * 10000) / 100 : 0
                };
            });
        }
        return Promise.resolve({ usage: 0, quota: 0, usageMB: 0, quotaMB: 0, quotaGB: 0, percentUsed: 0 });
    }

    function requestPersistentStorage() {
        var promises = [];
        if (navigator.storage && navigator.storage.persist) {
            promises.push(navigator.storage.persist().then(function(granted) {
                if (granted) {
                    console.log('%c[TW-Storage] Persistenter Speicher genehmigt!', 'color: #2ecc71; font-weight: bold;');
                } else {
                    console.warn('[TW-Storage] Persistenter Speicher abgelehnt.');
                }
                return granted;
            }));
        }
        promises.push(getStorageInfo().then(function(info) {
            console.log('%c[TW-Storage] Verfuegbarer Speicher: ' + info.quotaGB + ' GB (' + info.quotaMB + ' MB)',
                'color: #3498db; font-weight: bold;');
            console.log('[TW-Storage] Aktuell genutzt: ' + info.usageMB + ' MB (' + info.percentUsed + '%)');
            if (info.quotaMB < 500) {
                console.warn('[TW-Storage] WARNUNG: Weniger als 500 MB verfuegbar.');
            }
            return info;
        }));
        return Promise.all(promises);
    }

    function getRecordCounts() {
        var counts = {};
        var promises = Object.keys(STORES).map(function(storeName) {
            return new Promise(function(resolve) {
                try {
                    var tx = getTransaction(storeName, 'readonly');
                    var store = tx.objectStore(storeName);
                    var request = store.count();
                    request.onsuccess = function() { counts[storeName] = request.result; resolve(); };
                    request.onerror = function() { counts[storeName] = 0; resolve(); };
                } catch(e) { counts[storeName] = 0; resolve(); }
            });
        });
        return Promise.all(promises).then(function() { return counts; });
    }

    function clearAllData() {
        var promises = Object.keys(STORES).map(function(storeName) { return clearStore(storeName); });
        return Promise.all(promises).then(function() {
            console.log('%c[TW-Storage] Alle Daten geloescht!', 'color: #e74c3c; font-weight: bold;');
            return true;
        });
    }

    function deleteKundeData(kundeId) {
        var storesWithKundeId = ['aufmass', 'rechnungen', 'raeume', 'gesamtlisten',
            'positionen', 'schriftverkehr', 'kiAkten', 'driveOrdner', 'driveDateien', 'appDateien', 'syncLog', 'wip', 'ausgangsbuch', 'positionsListen'];
        var promises = storesWithKundeId.map(function(storeName) {
            return getByIndex(storeName, 'kundeId', kundeId).then(function(items) {
                return Promise.all(items.map(function(item) { return deleteItem(storeName, item.id); }));
            }).catch(function() { return Promise.resolve(); });
        });
        promises.push(deleteItem('kunden', kundeId));
        promises.push(deleteItem('meta', 'sync_' + kundeId));
        return Promise.all(promises).then(function() {
            console.log('[TW-Storage] Kundendaten komplett geloescht: ' + kundeId);
            return true;
        });
    }


    // ================================================================
    // APP-DATEIEN: In der App erstellte Dokumente speichern
    // (Rechnungen, Aufmasse, Schriftverkehr -> im Ordner-Browser sichtbar)
    // ================================================================

    function saveAppDatei(kundeId, ordnerName, dateiName, mimeType, blobData, docType) {
        var id = 'app_' + kundeId + '_' + ordnerName + '_' + dateiName.replace(/[^a-zA-Z0-9._-]/g, '_');
        return new Promise(function(resolve, reject) {
            function doSave(arrayBuf) {
                var record = {
                    id: id, kundeId: kundeId,
                    ordnerName: ordnerName,
                    name: dateiName,
                    mimeType: mimeType || 'application/octet-stream',
                    docType: docType || 'sonstige',
                    fileType: mimeType === 'application/pdf' ? 'pdf'
                        : (mimeType && mimeType.indexOf('spreadsheet') >= 0) ? 'xlsx'
                        : (mimeType && mimeType.indexOf('html') >= 0) ? 'html' : 'sonstige',
                    sizeBytes: arrayBuf ? arrayBuf.byteLength : 0,
                    data: arrayBuf,
                    deviceId: _deviceId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    syncStatus: 'pending'
                };
                putItem('appDateien', record).then(function(saved) {
                    logSyncAction(kundeId, 'create', 'appDateien', id, dateiName);
                    resolve(saved);
                }).catch(reject);
            }
            if (blobData instanceof Blob) {
                var reader = new FileReader();
                reader.onload = function() { doSave(reader.result); };
                reader.onerror = function() { reject(reader.error); };
                reader.readAsArrayBuffer(blobData);
            } else { doSave(blobData); }
        });
    }

    function loadAppDateien(kundeId) {
        return getByIndex('appDateien', 'kundeId', kundeId).then(function(records) {
            return records.map(function(r) {
                return { id: r.id, name: r.name, mimeType: r.mimeType, fileType: r.fileType,
                    docType: r.docType, ordnerName: r.ordnerName, sizeBytes: r.sizeBytes,
                    syncedAt: r.updatedAt, hasData: !!(r.data), deviceId: r.deviceId,
                    syncStatus: r.syncStatus, isAppCreated: true };
            });
        });
    }

    function openAppDatei(dateiId) {
        return getItem('appDateien', dateiId).then(function(record) {
            if (!record || !record.data) return null;
            return { name: record.name, mimeType: record.mimeType,
                url: URL.createObjectURL(new Blob([record.data], { type: record.mimeType })),
                blob: new Blob([record.data], { type: record.mimeType }) };
        });
    }

    function getAppDateienByOrdner(kundeId) {
        return loadAppDateien(kundeId).then(function(dateien) {
            var byOrdner = {};
            dateien.forEach(function(d) {
                if (!byOrdner[d.ordnerName]) byOrdner[d.ordnerName] = [];
                byOrdner[d.ordnerName].push(d);
            });
            return byOrdner;
        });
    }


    // ================================================================
    // SYNC-FRAMEWORK: Multi-Geraete-Synchronisation
    // ================================================================
    // Jede Aenderung wird mit deviceId + Timestamp geloggt.
    // Sync-Strategie:
    //   1. "Last-Write-Wins" fuer einfache Daten
    //   2. "Merge" fuer additive Daten (neue Raeume, Rechnungen)
    //   3. "Conflict-Flag" bei gleichzeitiger Bearbeitung

    function logSyncAction(kundeId, action, storeName, recordId, details) {
        return putItem('syncLog', {
            id: 'log_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
            kundeId: kundeId, action: action, storeName: storeName,
            recordId: recordId, details: details || '',
            deviceId: _deviceId, timestamp: new Date().toISOString(),
            syncedAt: null, updatedAt: new Date().toISOString()
        }).catch(function(e) { console.warn('[TW-Sync] Log:', e); });
    }

    function getUnsyncedChanges(kundeId) {
        return getByIndex('syncLog', 'kundeId', kundeId).then(function(logs) {
            return logs.filter(function(l) { return !l.syncedAt; })
                .sort(function(a, b) { return a.timestamp.localeCompare(b.timestamp); });
        });
    }

    function markAsSynced(logIds) {
        var now = new Date().toISOString();
        return Promise.all(logIds.map(function(id) {
            return getItem('syncLog', id).then(function(e) {
                if (e) { e.syncedAt = now; return putItem('syncLog', e); }
            });
        }));
    }

    var DriveUploadSync = {
        // Vor-Sync-Check: Pruefe ob Drive seit unserem letzten Sync neuer geworden ist
        // (z.B. weil ein Kollege parallel etwas geaendert hat).
        // Liefert {newer: bool, neuesteAenderung: ISO-String, anzahlGeaenderter: int}
        checkDriveNewerThan: async function(driveFolderId, sinceIsoString) {
            var service = global.GoogleDriveService;
            if (!service || !service.accessToken) throw new Error('Google Drive nicht verbunden');
            if (!sinceIsoString) {
                return { newer: false, neuesteAenderung: null, anzahlGeaenderter: 0 };
            }
            try {
                // 1. Kunden-Ordner direkt durchsuchen
                var query1 = "'" + driveFolderId + "' in parents and trashed=false";
                var data1 = await service._fetchJSON(
                    'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query1) +
                    '&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime desc&pageSize=200'
                );
                var directItems = data1.files || [];

                // 2. Alle Unterordner ermitteln und deren Inhalte ebenfalls pruefen
                var subFolders = directItems.filter(function(f) {
                    return f.mimeType === 'application/vnd.google-apps.folder';
                });
                var allFiles = directItems.filter(function(f) {
                    return f.mimeType !== 'application/vnd.google-apps.folder';
                });
                for (var i = 0; i < subFolders.length; i++) {
                    var query2 = "'" + subFolders[i].id + "' in parents and trashed=false";
                    var data2 = await service._fetchJSON(
                        'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query2) +
                        '&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime desc&pageSize=200'
                    );
                    var sub = (data2.files || []).filter(function(f) {
                        return f.mimeType !== 'application/vnd.google-apps.folder';
                    });
                    allFiles = allFiles.concat(sub);
                }

                var sinceMs = new Date(sinceIsoString).getTime();
                var neuere = allFiles.filter(function(f) {
                    if (!f.modifiedTime) return false;
                    return new Date(f.modifiedTime).getTime() > sinceMs;
                });
                neuere.sort(function(a, b) { return b.modifiedTime.localeCompare(a.modifiedTime); });
                return {
                    newer: neuere.length > 0,
                    neuesteAenderung: neuere.length > 0 ? neuere[0].modifiedTime : null,
                    anzahlGeaenderter: neuere.length,
                    geaenderteDateien: neuere.slice(0, 10).map(function(f){ return f.name; })
                };
            } catch(err) {
                console.warn('[TW-Sync] Vor-Sync-Check fehlgeschlagen:', err);
                // Im Fehlerfall: lieber synchronisieren lassen, statt blockieren
                return { newer: false, neuesteAenderung: null, anzahlGeaenderter: 0, error: err.message };
            }
        },

        uploadAppDateien: async function(kundeId, driveFolderId, onProgress) {
            var service = global.GoogleDriveService;
            if (!service || !service.accessToken) throw new Error('Google Drive nicht verbunden');
            var appDateien = await getByIndex('appDateien', 'kundeId', kundeId);
            var pending = appDateien.filter(function(d) { return d.syncStatus === 'pending' && d.data; });
            if (pending.length === 0) {
                if (onProgress) onProgress({ message: 'Alles synchronisiert.', percent: 100 });
                return { uploaded: 0 };
            }
            var uploaded = 0, errors = [];
            for (var i = 0; i < pending.length; i++) {
                var datei = pending[i];
                if (onProgress) onProgress({ message: (i+1)+'/'+pending.length+': '+datei.name, percent: Math.round(i/pending.length*100) });
                try {
                    var targetFolderId = await service.findOrCreateFolder(driveFolderId, datei.ordnerName);
                    var blob = new Blob([datei.data], { type: datei.mimeType });
                    await service.uploadFile(targetFolderId, datei.name, datei.mimeType, blob);
                    datei.syncStatus = 'synced'; datei.syncedAt = new Date().toISOString();
                    await putItem('appDateien', datei);
                    uploaded++;
                } catch(err) { errors.push({ file: datei.name, error: err.message }); }
            }
            if (onProgress) onProgress({ message: uploaded+'/'+pending.length+' hochgeladen', percent: 100 });
            // Sync-Zeitstempel speichern
            await saveAppState('lastSync_' + kundeId, new Date().toISOString());
            return { uploaded: uploaded, errors: errors, total: pending.length };
        },
        getUploadStatus: async function(kundeId) {
            var all = await getByIndex('appDateien', 'kundeId', kundeId);
            var pend = all.filter(function(d) { return d.syncStatus === 'pending'; });
            return { total: all.length, pending: pend.length, synced: all.length - pend.length,
                pendingFiles: pend.map(function(d) { return { name: d.name, ordner: d.ordnerName }; }) };
        },

        // Pruefe pro Kunde, ob ungesyncte Aenderungen vorliegen (App-Dateien ODER Foto-Uploads)
        hasUnsyncedChanges: async function(kundeId) {
            try {
                var appDateien = await getByIndex('appDateien', 'kundeId', kundeId);
                var pendDateien = appDateien.filter(function(d) { return d.syncStatus === 'pending'; });
                if (pendDateien.length > 0) return { has: true, count: pendDateien.length, type: 'appDateien' };
                // Auch ungeladene Fotos pruefen
                var fotos = await getByIndex('fotos', 'kundeId', kundeId);
                var pendFotos = fotos.filter(function(f) { return !f.uploadedAt; });
                if (pendFotos.length > 0) return { has: true, count: pendFotos.length, type: 'fotos' };
                return { has: false, count: 0 };
            } catch(err) {
                console.warn('[TW-Sync] hasUnsyncedChanges Fehler:', err);
                return { has: false, count: 0, error: err.message };
            }
        },

        // GLOBAL: Pruefe alle Kunden auf ungesyncte Aenderungen
        // Wird beim ExitGuard verwendet
        hasAnyUnsyncedChanges: async function() {
            try {
                var alleAppDateien = await getAllItems('appDateien');
                var pendAppDateien = alleAppDateien.filter(function(d) { return d.syncStatus === 'pending'; });
                if (pendAppDateien.length > 0) {
                    // Eindeutige Kunden-IDs
                    var kundenIds = {};
                    pendAppDateien.forEach(function(d) { if (d.kundeId) kundenIds[d.kundeId] = true; });
                    return { has: true, count: pendAppDateien.length, kundenAnzahl: Object.keys(kundenIds).length };
                }
                var alleFotos = await getAllItems('fotos');
                var pendFotos = alleFotos.filter(function(f) { return !f.uploadedAt; });
                if (pendFotos.length > 0) {
                    var kundenIds2 = {};
                    pendFotos.forEach(function(f) { if (f.kundeId) kundenIds2[f.kundeId] = true; });
                    return { has: true, count: pendFotos.length, kundenAnzahl: Object.keys(kundenIds2).length };
                }
                return { has: false, count: 0 };
            } catch(err) {
                console.warn('[TW-Sync] hasAnyUnsyncedChanges Fehler:', err);
                return { has: false, count: 0, error: err.message };
            }
        },

        getLastSyncTime: async function(kundeId) {
            var ts = await loadAppState('lastSync_' + kundeId);
            return ts || null;
        }
    };


    // ================================================================
    // SHADOW-SYNC-ENGINE — Multi-Geraete-Sync fuer Rohdaten-Stores
    // ================================================================
    // Prinzip:
    // 1. Jeder SAVE in SHADOW_STORES triggert debounced (2.5s) einen
    //    JSON-Snapshot des Store-Inhalts fuer diesen Kunden. Der Snapshot
    //    wird als appDatei mit syncStatus='pending' lokal abgelegt.
    // 2. Der bestehende Sync-Button laedt die pending appDateien nach
    //    Drive hoch (inkl. Snapshots).
    // 3. Am anderen Geraet zieht hydrateAllShadowsForKunde() die neuen
    //    Snapshots direkt aus Drive und rehydriert die lokalen Stores.
    // 4. Konfliktvermeidung: lokale pending-Snapshots werden NICHT
    //    ueberschrieben, und es wird pro Store + Kunde ein
    //    lastShadowLoad-Timestamp in appState gepflegt.
    // ================================================================

    function _shadowFileName(storeName) {
        return '_sync_' + storeName + '.json';
    }

    function _shadowAppDateiId(kundeId, storeName) {
        // Muss mit saveAppDatei-Schema uebereinstimmen
        var fileName = _shadowFileName(storeName);
        return 'app_' + kundeId + '_Kunden-Daten_' + fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    // Liest alle Records eines Stores fuer einen Kunden, baut JSON und
    // legt ihn als pending appDatei ab.
    function _writeShadowLocal(kundeId, storeName) {
        if (!kundeId || !storeName) return Promise.resolve(null);
        var fetcher;
        if (storeName === 'kunden') {
            fetcher = getItem('kunden', kundeId).then(function(r) { return r ? [r] : []; });
        } else {
            fetcher = getByIndex(storeName, 'kundeId', kundeId);
        }
        return fetcher.then(function(records) {
            var payload = {
                schemaVersion: 1,
                storeName: storeName,
                kundeId: kundeId,
                snapshotAt: new Date().toISOString(),
                deviceId: _deviceId,
                recordCount: records.length,
                records: records
            };
            var json = JSON.stringify(payload);
            var blob = new Blob([json], { type: 'application/json' });
            var fileName = _shadowFileName(storeName);
            return saveAppDatei(kundeId, 'Kunden-Daten', fileName, 'application/json', blob, 'sync_snapshot');
        }).catch(function(err) {
            console.warn('[ShadowSync] _writeShadowLocal Fehler (' + storeName + '):', err);
            return null;
        });
    }

    // Debounced: sammelt viele Aenderungen in 2.5s-Fenstern
    function scheduleShadowSync(kundeId, storeName, delayMs) {
        if (!kundeId || !storeName) return;
        if (SHADOW_STORES.indexOf(storeName) < 0) return;
        var key = kundeId + '__' + storeName;
        if (_shadowDebounce[key]) clearTimeout(_shadowDebounce[key]);
        _shadowDebounce[key] = setTimeout(function() {
            delete _shadowDebounce[key];
            _writeShadowLocal(kundeId, storeName);
        }, typeof delayMs === 'number' ? delayMs : 2500);
    }

    // Sofort-Variante (fuer Shutdown oder manuellen Flush)
    function flushShadowSync(kundeId, storeName) {
        var key = kundeId + '__' + storeName;
        if (_shadowDebounce[key]) {
            clearTimeout(_shadowDebounce[key]);
            delete _shadowDebounce[key];
        }
        return _writeShadowLocal(kundeId, storeName);
    }

    // Alle pendingen Shadow-Debounces sofort flushen (z.B. vor Sync-Button)
    function flushAllPendingShadows() {
        var promises = [];
        Object.keys(_shadowDebounce).forEach(function(key) {
            var parts = key.split('__');
            var kundeId = parts[0];
            var storeName = parts[1];
            clearTimeout(_shadowDebounce[key]);
            delete _shadowDebounce[key];
            promises.push(_writeShadowLocal(kundeId, storeName));
        });
        return Promise.all(promises);
    }

    // Laedt EIN Shadow-File aus Drive und rehydriert den lokalen Store.
    // Rueckgabe: { hydrated, reason, count?, snapshotAt? }
    async function _hydrateOneShadow(kundeId, driveFolderId, storeName) {
        var service = global.GoogleDriveService;
        if (!service || !service.accessToken) {
            return { hydrated: false, reason: 'drive_offline' };
        }
        var fileName = _shadowFileName(storeName);
        try {
            // Kunden-Daten-Unterordner suchen/anlegen
            var kundenDatenId = await service.findOrCreateFolder(driveFolderId, 'Kunden-Daten');
            // Nach _sync_<store>.json im Kunden-Daten-Ordner suchen
            var q = "'" + kundenDatenId + "' in parents and name='" + fileName + "' and trashed=false";
            var res = await service._fetchJSON(
                'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) +
                '&fields=files(id,name,modifiedTime)&pageSize=5'
            );
            var files = (res && res.files) || [];
            if (files.length === 0) return { hydrated: false, reason: 'no_remote' };
            var remote = files[0];

            // Schutz 1: Ist der Drive-Snapshot neuer als unser letzter Hydrate?
            var lastKey = 'shadowLoaded_' + kundeId + '_' + storeName;
            var lastLoadedAt = await loadAppState(lastKey);
            if (lastLoadedAt && remote.modifiedTime && remote.modifiedTime <= lastLoadedAt) {
                return { hydrated: false, reason: 'up_to_date' };
            }

            // Schutz 2: Haben wir lokal pendinge Aenderungen die noch nicht auf Drive sind?
            // Dann NICHT hydraten, sonst wuerden wir ungesynchte Aenderungen verlieren.
            var localShadowId = _shadowAppDateiId(kundeId, storeName);
            var localShadow = await getItem('appDateien', localShadowId);
            if (localShadow && localShadow.syncStatus === 'pending') {
                return { hydrated: false, reason: 'local_pending' };
            }

            // Download + Parse
            var blob = await service.downloadFile(remote.id);
            var text;
            if (blob && typeof blob.text === 'function') {
                text = await blob.text();
            } else {
                text = await new Promise(function(resolve, reject) {
                    var fr = new FileReader();
                    fr.onload = function() { resolve(fr.result); };
                    fr.onerror = function() { reject(fr.error); };
                    fr.readAsText(blob);
                });
            }
            var payload = JSON.parse(text);
            if (!payload || !Array.isArray(payload.records)) {
                return { hydrated: false, reason: 'bad_payload' };
            }

            // Rehydrate: alten Kunde-Ausschnitt loeschen, neuen schreiben
            // WICHTIG: Wir rufen deleteItem/putBatch so auf, dass der Shadow-Hook
            // NICHT rekursiv triggert (sonst Endlosschleife).
            // Trick: Wir schreiben direkt ueber eine Transaktion ohne Hook.
            await _rehydrateStore(storeName, kundeId, payload.records);

            // Timestamp merken (als Drive-ModifiedTime, nicht als lokale Zeit!)
            await saveAppState(lastKey, remote.modifiedTime || new Date().toISOString());

            return {
                hydrated: true,
                count: payload.records.length,
                snapshotAt: payload.snapshotAt,
                remoteModifiedTime: remote.modifiedTime
            };
        } catch(err) {
            console.warn('[ShadowHydrate] Fehler ' + storeName + ':', err);
            return { hydrated: false, reason: 'error', error: err.message };
        }
    }

    // Schreibt Records in Store OHNE Shadow-Hook auszuloesen (sonst Loop)
    function _rehydrateStore(storeName, kundeId, records) {
        return new Promise(function(resolve, reject) {
            try {
                var tx = getTransaction(storeName, 'readwrite');
                var store = tx.objectStore(storeName);
                // 1. Alte Records fuer diesen Kunden loeschen
                if (storeName === 'kunden') {
                    // Single-Record: ueberschreiben reicht
                } else {
                    try {
                        var idx = store.index('kundeId');
                        var cursorReq = idx.openCursor(IDBKeyRange.only(kundeId));
                        cursorReq.onsuccess = function(e) {
                            var cursor = e.target.result;
                            if (cursor) {
                                cursor.delete();
                                cursor.continue();
                            }
                        };
                    } catch(e) { /* Index existiert nicht -> kein Cleanup */ }
                }
                // 2. Neue Records schreiben (nach Cleanup in gleicher Transaktion)
                var now = new Date().toISOString();
                records.forEach(function(item) {
                    if (item && typeof item === 'object') {
                        if (!item.updatedAt) item.updatedAt = now;
                        try { store.put(item); } catch(e) { /* skip malformed */ }
                    }
                });
                tx.oncomplete = function() { resolve(records.length); };
                tx.onerror = function(e) { reject(e.target.error); };
            } catch(e) { reject(e); }
        });
    }

    // Haupt-Einstiegspunkt: Hydrate ALLE Shadow-Stores fuer einen Kunden
    async function hydrateAllShadowsForKunde(kundeId, driveFolderId, onProgress) {
        if (!kundeId || !driveFolderId) {
            return { ok: false, reason: 'missing_ids', results: [] };
        }
        var service = global.GoogleDriveService;
        if (!service || !service.accessToken) {
            return { ok: false, reason: 'drive_offline', results: [] };
        }
        var results = [];
        for (var i = 0; i < SHADOW_STORES.length; i++) {
            var storeName = SHADOW_STORES[i];
            if (onProgress) {
                try {
                    onProgress({
                        store: storeName,
                        current: i + 1,
                        total: SHADOW_STORES.length,
                        phase: 'hydrate'
                    });
                } catch(e) {}
            }
            var res = await _hydrateOneShadow(kundeId, driveFolderId, storeName);
            results.push({ store: storeName, result: res });
        }
        var hydratedCount = results.filter(function(r) { return r.result && r.result.hydrated; }).length;
        return { ok: true, results: results, hydratedStores: hydratedCount };
    }

    // Public ShadowSync-API
    var ShadowSync = {
        STORES: SHADOW_STORES,
        schedule: scheduleShadowSync,
        flush: flushShadowSync,
        flushAll: flushAllPendingShadows,
        hydrateForKunde: hydrateAllShadowsForKunde,
        hydrateOne: _hydrateOneShadow
    };


    // ================================================================
    // EVENT-BUS INTEGRATION
    // ================================================================
    function setupEventListeners() {
        if (!global.TW || !global.TW.on) { setTimeout(setupEventListeners, 500); return; }
        TW.on('kunde:selected', function(data) {
            if (data && data.kunde) saveKunde(data.kunde).catch(function() {});
        });
        TW.on('kunde:updated', function(data) {
            if (data && data.kunde) saveKunde(data.kunde).catch(function() {});
        });
        TW.on('state:currentPage', function(data) {
            if (data && data.value) saveAppState('lastPage', data.value);
        });
        console.log('[TW-Storage] Event-Listener aktiv');
    }

    // ================================================================
    // EXPORT
    // ================================================================
    // ================================================================
    // POSITIONS-LISTEN-BIBLIOTHEK (Paket C)
    // Vorbereitete Positionslisten zu Raeumen oder als reine Vorlagen
    // ================================================================

    function savePositionsListe(listenObj) {
        // Erwartet: { id?, kundeId, bezeichner, raumIds: [], positionen: [] }
        if (!listenObj.id) {
            listenObj.id = 'pl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
            listenObj.erstelltAm = new Date().toISOString();
        }
        listenObj.updatedAt = new Date().toISOString();
        listenObj.raumIds = listenObj.raumIds || [];
        listenObj.positionen = listenObj.positionen || [];
        return putItem('positionsListen', listenObj);
    }

    function loadPositionsListenByKunde(kundeId) {
        return getByIndex('positionsListen', 'kundeId', kundeId).then(function(items) {
            // Nach Aenderungsdatum absteigend sortieren (neueste zuerst)
            return items.sort(function(a, b) {
                return (b.updatedAt || '').localeCompare(a.updatedAt || '');
            });
        });
    }

    function loadPositionsListenByRaum(kundeId, raumId) {
        return loadPositionsListenByKunde(kundeId).then(function(items) {
            return items.filter(function(l) {
                return l.raumIds && l.raumIds.indexOf(raumId) >= 0;
            });
        });
    }

    function deletePositionsListe(listenId) {
        return deleteItem('positionsListen', listenId);
    }

    // Liefert ein Set (als Object) von raumIds, die mindestens eine vorbereitete Liste haben
    function getRaeumeMitVorbereiteterListe(kundeId) {
        return loadPositionsListenByKunde(kundeId).then(function(items) {
            var raumSet = {};
            items.forEach(function(l) {
                (l.raumIds || []).forEach(function(rid) { raumSet[rid] = true; });
            });
            return raumSet;
        });
    }

    global.TWStorage = {
        init: initDB,
        isReady: function() { return _ready; },
        onReady: function(cb) { if (_ready) { cb(); } else { _readyCallbacks.push(cb); } },
        put: putItem, get: getItem, getAll: getAllItems, getByIndex: getByIndex,
        delete: deleteItem, clear: clearStore, putBatch: putBatch,
        saveKunde: saveKunde, loadKunde: loadKunde, listKunden: listKunden,
        saveGesamtliste: saveGesamtliste, loadGesamtliste: loadGesamtliste,
        saveRaum: saveRaum, loadRaeume: loadRaeume,
        saveRechnung: saveRechnung, loadRechnungen: loadRechnungen,
        saveKiAkte: saveKiAkte, loadKiAkte: loadKiAkte,
        saveSchriftverkehr: saveSchriftverkehr, loadSchriftverkehr: loadSchriftverkehr,
        saveAppState: saveAppState, loadAppState: loadAppState,
        cacheDriveData: cacheDriveData, loadDriveCache: loadDriveCache,
        DriveSync: DriveSync,
        saveOrdnerStruktur: saveOrdnerStruktur, saveDatei: saveDatei,
        loadDatei: loadDatei, loadDateienByOrdner: loadDateienByOrdner,
        loadOrdnerStruktur: loadOrdnerStruktur, getKundeStorageSize: getKundeStorageSize,
        shouldSyncFile: shouldSyncFile,
        OfflineBrowser: OfflineBrowser,
        // App-Dateien (in der App erstellte Dokumente)
        saveAppDatei: saveAppDatei, loadAppDateien: loadAppDateien,
        openAppDatei: openAppDatei, getAppDateienByOrdner: getAppDateienByOrdner,
        // Sync-Framework
        DriveUploadSync: DriveUploadSync,
        logSyncAction: logSyncAction, getUnsyncedChanges: getUnsyncedChanges, markAsSynced: markAsSynced,
        // Bearbeitungsstand (WIP)
        saveWip: saveWip, loadWip: loadWip, deleteWip: deleteWip, listWips: listWips, hasWip: hasWip,
        // Foto-Store (Blobs, persistent, Multi-Geraete-faehig)
        saveFoto: saveFoto, updateFoto: updateFoto,
        loadFotoAsDataURL: loadFotoAsDataURL,
        listFotosByKunde: listFotosByKunde,
        loadFotosByKundeAsDataURLs: loadFotosByKundeAsDataURLs,
        loadFotosByIdsAsDataURLs: loadFotosByIdsAsDataURLs,
        loadFotosByIdsAsBlobURLs: loadFotosByIdsAsBlobURLs,
        deleteFoto: deleteFoto,
        getUnuploadedFotos: getUnuploadedFotos,
        markFotoAsUploaded: markFotoAsUploaded,
        // BLOCK D / FIX D1 — Cleanup-Helper fuer voll gelaufenen Speicher
        cleanupUploadedFotosForSpace: cleanupUploadedFotosForSpace,
        FotoSync: FotoSync,
        compressImageToBlob: compressImageToBlob,
        compressFileToDataUrl: compressFileToDataUrl,
        blobToDataURL: blobToDataURL,
        // Ausgangsbuch (IndexedDB statt localStorage)
        saveAusgangsbuchEintrag: saveAusgangsbuchEintrag, loadAusgangsbuch: loadAusgangsbuch,
        deleteAusgangsbuchEintrag: deleteAusgangsbuchEintrag, migrateAusgangsbuchFromLocalStorage: migrateAusgangsbuchFromLocalStorage,
        deviceId: _deviceId,
        getStorageInfo: getStorageInfo, requestPersistentStorage: requestPersistentStorage,
        getRecordCounts: getRecordCounts, clearAllData: clearAllData, deleteKundeData: deleteKundeData,
        // Positions-Listen-Bibliothek (Paket C)
        savePositionsListe: savePositionsListe,
        loadPositionsListenByKunde: loadPositionsListenByKunde,
        loadPositionsListenByRaum: loadPositionsListenByRaum,
        deletePositionsListe: deletePositionsListe,
        getRaeumeMitVorbereiteterListe: getRaeumeMitVorbereiteterListe,
        // Shadow-Sync (Multi-Geraete-Sync fuer Rohdaten-Stores)
        ShadowSync: ShadowSync,
        scheduleShadowSync: scheduleShadowSync,
        flushShadowSync: flushShadowSync,
        flushAllPendingShadows: flushAllPendingShadows,
        hydrateAllShadowsForKunde: hydrateAllShadowsForKunde,
        setupEventListeners: setupEventListeners,
        CONFIG: CONFIG, DB_NAME: DB_NAME, DB_VERSION: DB_VERSION, STORES: STORES
    };

    // AUTO-INIT
    initDB().then(function() {
        requestPersistentStorage();
        setupEventListeners();
        // Einmalige Migration: Ausgangsbuch von localStorage nach IndexedDB
        migrateAusgangsbuchFromLocalStorage().then(function(result) {
            if (result.migrated > 0) {
                console.log('%c[TW-Storage] Ausgangsbuch erfolgreich migriert: ' + result.migrated + ' Eintraege', 'color: #27ae60; font-weight: bold;');
            }
        });
    }).catch(function(e) {
        console.error('[TW-Storage] Initialisierung fehlgeschlagen:', e);
    });

    console.log('%c[TW-Storage] Modul geladen (mit Drive-Sync & Offline-Browser)', 'color: #1E88E5; font-weight: bold;');

})(window);
