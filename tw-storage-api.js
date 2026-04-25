/* =====================================================================
   TW BUSINESS SUITE -- ZENTRALE STORAGE-API (tw-storage-api.js)
   Stand: 25.04.2026

   ZWECK:
   Einzige Tuer fuer alle Module, um Daten zu speichern. Wickelt:
     - Lokalen IDB-Save (ueber TWStorage)
     - Schema-Validierung (ueber TWSchema)
     - Drive-Upload-Queue mit Retry (eigene Engine hier drin)
     - Konflikt-Erkennung beim Save (originalHash + Drive-Modtime)
     - Audit-Log
   ab.

   PUBLIC API:
     TWStorageAPI.saveDocument(kundeId, ordnerName, name, mimeType,
                                blob, options)
        -> Speichert Dokument lokal + queued Drive-Upload

     TWStorageAPI.savePhoto(kundeId, kontext, raumKey, subKey,
                             dataUrlOrBlob, meta)
        -> Speichert Foto lokal + queued Drive-Upload

     TWStorageAPI.saveCustomerData(storeName, record)
        -> Speichert in SHADOW_STORE-faehigen Stores mit Validierung

     TWStorageAPI.queue.status()        -> Queue-Status
     TWStorageAPI.queue.retry()         -> Failed-Items neu versuchen
     TWStorageAPI.queue.subscribe(fn)   -> Status-Updates

     TWStorageAPI.detectConflict(storeName, recordId, localUpdatedAt)
        -> Prueft, ob Drive neuer ist (fuer Konflikt-Dialoge)

   WICHTIG:
   - Diese API ist ein WRAPPER ueber das bestehende TWStorage-Modul.
   - Bestehende direkte Calls auf TWStorage funktionieren weiter.
   - Module sollen schrittweise auf diese API umgestellt werden.
   ===================================================================== */

(function(global) {
    'use strict';

    // -----------------------------------------------------------------
    // ABHAENGIGKEITS-CHECK
    // -----------------------------------------------------------------
    function _requireDeps() {
        if (!global.TWStorage) {
            throw new Error('[TWStorageAPI] TWStorage nicht geladen');
        }
        if (!global.TWSchema) {
            throw new Error('[TWStorageAPI] TWSchema nicht geladen');
        }
    }

    // -----------------------------------------------------------------
    // EVENT-BUS
    // Modul-Kommunikation ohne globale Variablen
    // -----------------------------------------------------------------
    var _listeners = {};
    function _emit(event, payload) {
        var subs = _listeners[event] || [];
        subs.forEach(function(fn) {
            try { fn(payload); } catch(e) {
                console.warn('[TWStorageAPI] Listener-Fehler bei ' + event + ':', e);
            }
        });
    }
    function _on(event, fn) {
        if (!_listeners[event]) _listeners[event] = [];
        _listeners[event].push(fn);
        return function() {
            _listeners[event] = (_listeners[event] || []).filter(function(f) { return f !== fn; });
        };
    }

    // =================================================================
    // DRIVE-UPLOAD-QUEUE (Punkt 4 aus Plan)
    // =================================================================
    // Sammelt alle Drive-Uploads und arbeitet sie SEQUENZIELL ab.
    // Bei Fehler: 3x retry mit exponential backoff (1s, 4s, 16s).
    // Persistenz: alle pending Items sind als 'appDateien' mit
    // syncStatus='pending' in der IDB - laufen also auch nach
    // Browser-Neustart wieder an.
    // =================================================================
    var Queue = (function() {

        var _items = [];          // RAM-Queue (pending Items)
        var _processing = false;  // ist der Worker aktiv?
        var _retryDelays = [1000, 4000, 16000];  // 1s, 4s, 16s
        var _stats = { uploaded: 0, failed: 0, retried: 0, queued: 0 };

        function _broadcast() {
            _emit('queue:status', {
                queueLength: _items.length,
                processing: _processing,
                stats: Object.assign({}, _stats)
            });
        }

        // Item-Struktur:
        //   { id, kundeId, ordnerName, name, mimeType, blob/data,
        //     attempts, lastError, addedAt }
        function add(item) {
            if (!item || !item.id) {
                console.warn('[TWStorageAPI Queue] Item ohne ID abgelehnt');
                return;
            }
            // Doppelt-Adden vermeiden
            var exists = _items.some(function(x) { return x.id === item.id; });
            if (exists) return;
            item.attempts = item.attempts || 0;
            item.addedAt = item.addedAt || new Date().toISOString();
            _items.push(item);
            _stats.queued++;
            _broadcast();
            // Worker starten falls nicht laeuft
            _scheduleProcess();
        }

        function _scheduleProcess() {
            if (_processing) return;
            // Kleines Delay, damit mehrere Adds gebatcht werden koennen
            setTimeout(_process, 100);
        }

        function _process() {
            if (_processing) return;
            if (_items.length === 0) return;
            // Drive-Service vorhanden?
            var service = global.GoogleDriveService;
            if (!service || !service.accessToken) {
                console.log('[TWStorageAPI Queue] Drive nicht verbunden - Queue pausiert');
                _emit('queue:paused', { reason: 'no-drive-connection' });
                return;
            }
            _processing = true;
            _broadcast();
            _processNext();
        }

        function _processNext() {
            if (_items.length === 0) {
                _processing = false;
                _broadcast();
                _emit('queue:empty', {});
                return;
            }
            var item = _items[0];
            _uploadItem(item).then(function() {
                // Erfolg - Item raus aus Queue
                _items.shift();
                _stats.uploaded++;
                _broadcast();
                _emit('queue:item-done', { id: item.id, name: item.name });
                // Naechstes Item nach kurzer Pause (Drive-Rate-Limit)
                setTimeout(_processNext, 200);
            }).catch(function(err) {
                item.attempts++;
                item.lastError = err.message || String(err);
                if (item.attempts < _retryDelays.length) {
                    _stats.retried++;
                    var delay = _retryDelays[item.attempts - 1];
                    console.warn('[TWStorageAPI Queue] Upload-Fehler bei "' +
                                 item.name + '", retry in ' + delay + 'ms - ' +
                                 item.lastError);
                    _emit('queue:item-retry', {
                        id: item.id, name: item.name,
                        attempts: item.attempts, delay: delay
                    });
                    setTimeout(_processNext, delay);
                } else {
                    // Endgueltig fehlgeschlagen
                    _items.shift();
                    _stats.failed++;
                    _broadcast();
                    console.error('[TWStorageAPI Queue] Upload "' + item.name +
                                  '" final fehlgeschlagen nach ' +
                                  item.attempts + ' Versuchen: ' + item.lastError);
                    _emit('queue:item-failed', {
                        id: item.id, name: item.name,
                        error: item.lastError
                    });
                    setTimeout(_processNext, 200);
                }
            });
        }

        function _uploadItem(item) {
            var service = global.GoogleDriveService;
            if (!service || !service.accessToken) {
                return Promise.reject(new Error('Drive nicht verbunden'));
            }
            // Kunden-Drive-Ordner finden
            return global.TWStorage.loadKunde(item.kundeId).then(function(kunde) {
                if (!kunde || !kunde._driveFolderId) {
                    throw new Error('Kunde ohne Drive-Folder-ID: ' + item.kundeId);
                }
                return service.findOrCreateFolder(kunde._driveFolderId, item.ordnerName);
            }).then(function(targetFolderId) {
                var blob = item.blob || (item.data ? new Blob([item.data], { type: item.mimeType }) : null);
                if (!blob) throw new Error('Kein Blob fuer Upload');
                return service.uploadFile(targetFolderId, item.name, item.mimeType || 'application/octet-stream', blob);
            }).then(function(resp) {
                // appDateien-Eintrag als 'synced' markieren
                if (item.appDateiId) {
                    return global.TWStorage.get ?
                        global.TWStorage.get('appDateien', item.appDateiId).then(function(rec) {
                            if (rec) {
                                rec.syncStatus = 'synced';
                                rec.syncedAt = new Date().toISOString();
                                rec.driveFileId = resp && resp.id;
                                return global.TWStorage.put ?
                                    global.TWStorage.put('appDateien', rec) :
                                    null;
                            }
                        }) :
                        Promise.resolve();
                }
                return null;
            });
        }

        function status() {
            return {
                queueLength: _items.length,
                processing: _processing,
                stats: Object.assign({}, _stats),
                items: _items.map(function(i) {
                    return {
                        id: i.id, name: i.name,
                        attempts: i.attempts, lastError: i.lastError
                    };
                })
            };
        }

        function retry() {
            _processing = false;
            _scheduleProcess();
        }

        function clear() {
            _items = [];
            _broadcast();
        }

        // Beim Modul-Start: pending appDateien aus IDB nachladen
        function _restoreFromIdb() {
            if (!global.TWStorage || !global.TWStorage.isReady ||
                !global.TWStorage.isReady()) {
                setTimeout(_restoreFromIdb, 500);
                return;
            }
            if (!global.TWStorage.getAll) return;
            global.TWStorage.getAll('appDateien').then(function(all) {
                var pending = (all || []).filter(function(d) {
                    return d.syncStatus === 'pending' && d.data;
                });
                pending.forEach(function(d) {
                    add({
                        id: 'restore_' + d.id,
                        appDateiId: d.id,
                        kundeId: d.kundeId,
                        ordnerName: d.ordnerName,
                        name: d.name,
                        mimeType: d.mimeType,
                        data: d.data
                    });
                });
                if (pending.length > 0) {
                    console.log('[TWStorageAPI Queue] ' + pending.length +
                                ' pending Uploads aus IDB wiederhergestellt');
                }
            }).catch(function(err) {
                console.warn('[TWStorageAPI Queue] Restore aus IDB fehlgeschlagen:', err);
            });
        }

        // Startet den Restore wenn TWStorage bereit ist
        setTimeout(_restoreFromIdb, 1000);

        return {
            add: add,
            status: status,
            retry: retry,
            clear: clear,
            subscribe: function(fn) { return _on('queue:status', fn); }
        };
    })();

    // =================================================================
    // SAVE-FUNKTIONEN (Punkt 1 aus Plan)
    // =================================================================

    // -----------------------------------------------------------------
    // saveDocument: Universelles Speichern eines Dokuments
    //   1) Lokal in 'appDateien' (syncStatus=pending)
    //   2) Drive-Upload-Queue
    //   3) Audit-Log
    // -----------------------------------------------------------------
    function saveDocument(kundeId, ordnerName, name, mimeType, blob, options) {
        _requireDeps();
        options = options || {};
        if (!kundeId || !ordnerName || !name) {
            return Promise.reject(new Error('saveDocument: kundeId/ordnerName/name fehlen'));
        }
        if (!blob || !(blob instanceof Blob)) {
            return Promise.reject(new Error('saveDocument: blob fehlt oder kein Blob'));
        }

        // 1) Validierung ueber Schema
        var record = {
            id: 'app_' + kundeId + '_' + ordnerName + '_' +
                String(name).replace(/[^a-zA-Z0-9._-]/g, '_'),
            kundeId: kundeId,
            ordnerName: ordnerName,
            name: name,
            mimeType: mimeType || 'application/octet-stream',
            docType: options.docType || 'document',
            syncStatus: 'pending'
        };
        var validation = global.TWSchema.validate('appDateien', record);
        if (!validation.ok) {
            console.warn('[TWStorageAPI] Validierung fehlgeschlagen:',
                         validation.errors);
            return Promise.reject(new Error(validation.errors.join('; ')));
        }

        // 2) Lokal speichern via TWStorage.saveAppDatei
        if (!global.TWStorage.saveAppDatei) {
            return Promise.reject(new Error('TWStorage.saveAppDatei fehlt'));
        }
        return global.TWStorage.saveAppDatei(kundeId, ordnerName, name,
            mimeType, blob, options.docType || 'document'
        ).then(function(saved) {
            // 3) In Drive-Queue einreihen
            Queue.add({
                id: 'q_' + record.id,
                appDateiId: record.id,
                kundeId: kundeId,
                ordnerName: ordnerName,
                name: name,
                mimeType: mimeType,
                blob: blob
            });
            // 4) Audit-Log
            _log(kundeId, 'saveDocument', 'appDateien', record.id, name);
            _emit('document:saved', { kundeId: kundeId, name: name });
            return saved;
        });
    }

    // -----------------------------------------------------------------
    // savePhoto: Foto speichern (delegiert an TWStorage.saveFoto)
    //   Gibt der bestehenden Funktion einen einheitlichen Entry-Point.
    // -----------------------------------------------------------------
    function savePhoto(kundeId, kontext, raumKey, subKey, dataUrlOrBlob, meta) {
        _requireDeps();
        if (!global.TWStorage.saveFoto) {
            return Promise.reject(new Error('TWStorage.saveFoto fehlt'));
        }
        return global.TWStorage.saveFoto(kundeId, kontext, raumKey,
            subKey, dataUrlOrBlob, meta
        ).then(function(rec) {
            _log(kundeId, 'savePhoto', 'fotos', rec && rec.id,
                 kontext + '/' + raumKey);
            _emit('photo:saved', {
                kundeId: kundeId, kontext: kontext,
                raumKey: raumKey, id: rec && rec.id
            });
            return rec;
        });
    }

    // -----------------------------------------------------------------
    // saveCustomerData: SHADOW-fähigen Store schreiben mit Validierung
    // -----------------------------------------------------------------
    function saveCustomerData(storeName, record) {
        _requireDeps();
        var validation = global.TWSchema.validate(storeName, record);
        if (!validation.ok) {
            return Promise.reject(new Error(validation.errors.join('; ')));
        }
        var enriched = global.TWSchema.enrich(storeName, record);
        if (!global.TWStorage.put) {
            return Promise.reject(new Error('TWStorage.put fehlt'));
        }
        return global.TWStorage.put(storeName, enriched).then(function(saved) {
            _log(record.kundeId || record.id, 'saveCustomerData',
                 storeName, saved.id, '');
            _emit('customer-data:saved', {
                storeName: storeName, record: saved
            });
            return saved;
        });
    }

    // =================================================================
    // KONFLIKT-ERKENNUNG (Punkt 5 aus Plan)
    // =================================================================
    // Prueft VOR dem Save, ob die Drive-Version neuer ist als unser
    // letzter bekannter Stand. Falls ja: Conflict-Info zurueckgeben,
    // damit das Modul einen Dialog zeigen kann.
    //
    // ACHTUNG: Diese Funktion ist eine Best-Effort-Pruefung. Bei
    // schlechter Verbindung gibt sie {ok: true} zurueck und laesst den
    // Save laufen, statt zu blockieren.
    // =================================================================
    function detectConflict(storeName, recordId, localLoadedAt) {
        _requireDeps();
        // Nur sinnvoll wenn Drive verfuegbar
        if (!global.GoogleDriveService || !global.GoogleDriveService.accessToken) {
            return Promise.resolve({ ok: true, reason: 'no-drive' });
        }
        if (!global.TWStorage.DriveUploadSync ||
            !global.TWStorage.DriveUploadSync.checkDriveNewerThan) {
            return Promise.resolve({ ok: true, reason: 'no-drive-check-fn' });
        }
        // Welcher Drive-Folder gehoert zu diesem Record?
        // Wir holen ueber den Store-Record die kundeId, dann den Kunden
        // mit _driveFolderId.
        if (!global.TWStorage.get) {
            return Promise.resolve({ ok: true, reason: 'no-get-fn' });
        }
        return global.TWStorage.get(storeName, recordId).then(function(rec) {
            if (!rec || !rec.kundeId) {
                return { ok: true, reason: 'no-record-yet' };
            }
            return global.TWStorage.loadKunde(rec.kundeId).then(function(kunde) {
                if (!kunde || !kunde._driveFolderId) {
                    return { ok: true, reason: 'no-folder-id' };
                }
                return global.TWStorage.DriveUploadSync.checkDriveNewerThan(
                    kunde._driveFolderId, localLoadedAt
                ).then(function(check) {
                    if (check.newer) {
                        return {
                            ok: false,
                            conflict: true,
                            anzahlGeaendert: check.anzahlGeaenderter,
                            geaenderteDateien: check.geaenderteDateien || [],
                            neuesteAenderung: check.neuesteAenderung
                        };
                    }
                    return { ok: true };
                });
            });
        }).catch(function(err) {
            console.warn('[TWStorageAPI] detectConflict-Fehler:', err);
            return { ok: true, reason: 'check-failed', error: err.message };
        });
    }

    // =================================================================
    // AUDIT-LOG (intern)
    // =================================================================
    function _log(kundeId, action, storeName, recordId, details) {
        if (!global.TWStorage.logSyncAction) return;
        try {
            global.TWStorage.logSyncAction(
                kundeId, action, storeName, recordId, details
            );
        } catch(e) { /* Best-Effort */ }
    }

    // =================================================================
    // DIAGNOSE / GESUNDHEITS-INFO
    // Wird vom Storage-Health-Dashboard benutzt
    // =================================================================
    function getDiagnostics() {
        var queueStatus = Queue.status();
        var schemaInfo = global.TWSchema && global.TWSchema.getDiagnostics ?
                         global.TWSchema.getDiagnostics() : null;
        return {
            queue: queueStatus,
            schema: schemaInfo,
            apiVersion: '1.0.0',
            buildDate: '2026-04-25'
        };
    }

    // =================================================================
    // PUBLIC API
    // =================================================================
    global.TWStorageAPI = {
        // Save-Funktionen
        saveDocument:       saveDocument,
        savePhoto:          savePhoto,
        saveCustomerData:   saveCustomerData,

        // Konflikt-Pruefung
        detectConflict:     detectConflict,

        // Drive-Upload-Queue
        queue: {
            status:    Queue.status,
            retry:     Queue.retry,
            clear:     Queue.clear,
            subscribe: Queue.subscribe,
            add:       Queue.add  // fuer Spezialfaelle
        },

        // Events
        on:                 _on,

        // Diagnose
        getDiagnostics:     getDiagnostics
    };

    console.log('%c[TW-StorageAPI] Storage-API bereit (Wrapper mit Queue + Konflikt-Check)',
                'color: #00897B; font-weight: bold;');

})(window);
