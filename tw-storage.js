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
    var DB_VERSION = 3;
    var _db = null;
    var _ready = false;
    var _readyCallbacks = [];

    // ---- Konfiguration ----
    var CONFIG = {
        // Speicher pro Kunde (Ziel: 500 MB - 1 GB)
        MAX_BYTES_PER_KUNDE: 1 * 1024 * 1024 * 1024,  // 1 GB
        WARN_BYTES_PER_KUNDE: 500 * 1024 * 1024,       // 500 MB Warnung

        // Datei-Groessen-Limits
        MAX_FILE_SIZE_MB: 50,          // Dateien groesser als 50 MB werden uebersprungen
        SKIP_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp', '.heic', '.heif', '.svg', '.ico', '.raw', '.cr2', '.nef'],
        
        // Erlaubte Dateitypen fuer Sync
        SYNC_FILE_TYPES: ['.pdf', '.xlsx', '.xls', '.docx', '.doc', '.txt', '.csv', '.xml', '.json', '.rtf', '.odt', '.ods'],
        
        // Google Docs MIME-Types die exportiert werden
        GOOGLE_EXPORT_TYPES: {
            'application/vnd.google-apps.document': { exportAs: 'application/pdf', ext: '.pdf' },
            'application/vnd.google-apps.spreadsheet': { exportAs: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: '.xlsx' },
            'application/vnd.google-apps.presentation': { exportAs: 'application/pdf', ext: '.pdf' }
        }
    };

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
        driveDateien:   { keyPath: 'id', indices: ['kundeId', 'ordnerId', 'fileType', 'updatedAt'] }
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
                request.onsuccess = function() { resolve(item); };
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
                tx.oncomplete = function() { resolve(items.length); };
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
    // DRIVE-SYNC: Ordnerstruktur + Dateien offline verfuegbar
    // ================================================================

    function shouldSyncFile(fileName, mimeType, sizeBytes) {
        if (!fileName) return false;
        var nameLower = fileName.toLowerCase();
        // Bilder ausschliessen
        for (var i = 0; i < CONFIG.SKIP_IMAGE_EXTENSIONS.length; i++) {
            if (nameLower.endsWith(CONFIG.SKIP_IMAGE_EXTENSIONS[i])) return false;
        }
        if (mimeType && mimeType.indexOf('image/') === 0) return false;
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
                notify('Ordnerstruktur wird geladen...', 'scan');

                // 1. Komplette Ordnerstruktur scannen (rekursiv)
                var structure = await this._scanFolderRecursive(service, driveFolderId, kundeId, '/', null);
                stats.ordnerGesamt = structure.allFolders.length;
                stats.dateienGesamt = structure.allFiles.length;
                notify('Gefunden: ' + stats.ordnerGesamt + ' Ordner, ' + stats.dateienGesamt + ' Dateien', 'scan');

                // 2. Ordnerstruktur speichern
                for (var oi = 0; oi < structure.allFolders.length; oi++) {
                    await saveOrdnerStruktur(kundeId, structure.allFolders[oi]);
                    stats.ordnerSynced++;
                }
                notify('Ordnerstruktur gespeichert. Lade Dateien...', 'download');

                // 3. Speicher-Budget pruefen
                var currentSize = await getKundeStorageSize(kundeId);
                var remainingBytes = CONFIG.MAX_BYTES_PER_KUNDE - currentSize.totalBytes;

                // 4. Dateien herunterladen
                for (var fi = 0; fi < structure.allFiles.length; fi++) {
                    var fileInfo = structure.allFiles[fi];
                    var sizeBytes = fileInfo.sizeBytes || 0;

                    if (!shouldSyncFile(fileInfo.name, fileInfo.mimeType, sizeBytes)) {
                        stats.dateienSkipped++;
                        continue;
                    }
                    if (sizeBytes > 0 && sizeBytes > remainingBytes) {
                        stats.dateienSkipped++;
                        stats.fehler.push({ file: fileInfo.name, error: 'Speicherlimit erreicht' });
                        continue;
                    }

                    // Pruefen ob bereits aktuell gecached
                    var existingFile = await getItem('driveDateien', fileInfo.id);
                    if (existingFile && existingFile.syncedAt && fileInfo.modifiedTime) {
                        if (new Date(existingFile.syncedAt) >= new Date(fileInfo.modifiedTime)) {
                            stats.dateienSkipped++;
                            continue;
                        }
                    }

                    notify((stats.dateienSynced + 1) + '/' + stats.dateienGesamt + ': ' + fileInfo.name, 'download');

                    try {
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
                            var blobSize = blob.size || 0;
                            stats.bytesGesamt += blobSize;
                            remainingBytes -= blobSize;
                            stats.dateienSynced++;
                        }
                    } catch(dlErr) {
                        stats.fehler.push({ file: fileInfo.name, error: dlErr.message });
                        stats.dateienSkipped++;
                        console.warn('[DriveSync] Download-Fehler:', fileInfo.name, dlErr);
                    }
                }

                // 5. Sync-Meta speichern
                await putItem('meta', {
                    key: 'sync_' + kundeId,
                    value: { kundeId: kundeId, driveFolderId: driveFolderId, syncedAt: new Date().toISOString(), stats: stats, durationMs: Date.now() - stats.startTime },
                    updatedAt: new Date().toISOString()
                });

                notify('Sync abgeschlossen! ' + stats.dateienSynced + ' Dateien (' +
                    Math.round(stats.bytesGesamt / 1024 / 1024 * 10) / 10 + ' MB)', 'done');

                _syncInProgress[kundeId] = false;
                return { status: 'ok', stats: stats };
            } catch(err) {
                _syncInProgress[kundeId] = false;
                console.error('[DriveSync] Fehler:', err);
                throw err;
            }
        },

        _scanFolderRecursive: async function(service, folderId, kundeId, path, parentId) {
            var allFolders = [];
            var allFiles = [];
            var query = "'" + folderId + "' in parents and trashed=false";
            var url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) +
                '&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=name&pageSize=500';
            var data = await service._fetchJSON(url);
            var items = data.files || [];

            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item.mimeType === 'application/vnd.google-apps.folder') {
                    var folderRecord = {
                        id: item.id, driveId: item.id, name: item.name,
                        parentId: parentId || kundeId, path: path + item.name + '/', fileCount: 0
                    };
                    allFolders.push(folderRecord);
                    var subResult = await this._scanFolderRecursive(service, item.id, kundeId, path + item.name + '/', item.id);
                    allFolders = allFolders.concat(subResult.allFolders);
                    allFiles = allFiles.concat(subResult.allFiles);
                    folderRecord.fileCount = subResult.allFiles.length;
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
            return { allFolders: allFolders, allFiles: allFiles };
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
            'positionen', 'schriftverkehr', 'kiAkten', 'driveOrdner', 'driveDateien'];
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
        getStorageInfo: getStorageInfo, requestPersistentStorage: requestPersistentStorage,
        getRecordCounts: getRecordCounts, clearAllData: clearAllData, deleteKundeData: deleteKundeData,
        setupEventListeners: setupEventListeners,
        CONFIG: CONFIG, DB_NAME: DB_NAME, DB_VERSION: DB_VERSION, STORES: STORES
    };

    // AUTO-INIT
    initDB().then(function() {
        requestPersistentStorage();
        setupEventListeners();
    }).catch(function(e) {
        console.error('[TW-Storage] Initialisierung fehlgeschlagen:', e);
    });

    console.log('%c[TW-Storage] Modul geladen (mit Drive-Sync & Offline-Browser)', 'color: #1E88E5; font-weight: bold;');

})(window);
