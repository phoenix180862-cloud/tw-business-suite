    // ═══════════════════════════════════════════════════════
    // TW STAGING SERVICE — Baustellen-App-Staging-Verwaltung
    // ═══════════════════════════════════════════════════════
    // Verwaltet den separaten "Baustellen-App-Staging"-Bereich auf Google Drive.
    // Siehe STAGING_CONFIG in tw-infrastructure.js fuer die Grundprinzipien.
    //
    // Oeffentliche API:
    //   TWStaging.ensureRootFolder()            → Ordner-ID des Staging-Roots (legt bei Bedarf an)
    //   TWStaging.createStagingBaustelle(name)  → legt Baustellen-Staging + 4 Unterordner an
    //   TWStaging.listStagingBaustellen()       → listet alle vorhandenen Staging-Baustellen
    //   TWStaging.isStagingBereitgestellt(name) → prueft, ob ein Staging-Baustellenordner existiert
    //   TWStaging.getStagingSubfolder(name,sub) → liefert die Drive-ID eines Unterordners
    //   TWStaging.getStagingInfo(name)          → Info-Paket (Ordner-IDs, Datei-Zaehler, letzte Aenderung)
    //
    // Alle Funktionen geben Promises zurueck und nutzen die bereits initialisierte
    // gapi-Client-Instanz (Drive v3). Wenn gapi noch nicht initialisiert ist,
    // wirft jede Funktion einen sprechenden Fehler.
    // ═══════════════════════════════════════════════════════

    (function() {
        'use strict';

        // ── Hilfsfunktion: gapi-Drive-Client pruefen ──
        function assertDriveReady() {
            if (typeof gapi === 'undefined' || !gapi.client || !gapi.client.drive) {
                throw new Error('Google Drive API noch nicht initialisiert. Bitte zuerst bei Google Drive anmelden.');
            }
        }

        // ── Hilfsfunktion: Ordner im Drive suchen (genau ein Elternteil) ──
        async function findFolderByName(name, parentId) {
            assertDriveReady();
            var safeName = (name || '').replace(/'/g, "\\'");
            var q = "name='" + safeName + "' and mimeType='application/vnd.google-apps.folder' and trashed=false";
            if (parentId) {
                q += " and '" + parentId + "' in parents";
            }
            var res = await gapi.client.drive.files.list({
                q: q,
                fields: 'files(id, name, modifiedTime)',
                pageSize: 10,
                spaces: 'drive'
            });
            var files = (res && res.result && res.result.files) || [];
            return files.length > 0 ? files[0] : null;
        }

        // ── Hilfsfunktion: Ordner anlegen ──
        async function createFolder(name, parentId) {
            assertDriveReady();
            var meta = {
                name: name,
                mimeType: 'application/vnd.google-apps.folder'
            };
            if (parentId) {
                meta.parents = [parentId];
            }
            var res = await gapi.client.drive.files.create({
                resource: meta,
                fields: 'id, name, modifiedTime'
            });
            return res.result;
        }

        // ── Hilfsfunktion: Ordner finden ODER neu anlegen ──
        async function findOrCreateFolder(name, parentId) {
            var existing = await findFolderByName(name, parentId);
            if (existing) return existing;
            return await createFolder(name, parentId);
        }

        // ── Hilfsfunktion: Unterordner eines Elterns auflisten ──
        async function listChildFolders(parentId) {
            assertDriveReady();
            var q = "'" + parentId + "' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false";
            var res = await gapi.client.drive.files.list({
                q: q,
                fields: 'files(id, name, modifiedTime)',
                pageSize: 200,
                orderBy: 'name',
                spaces: 'drive'
            });
            return (res && res.result && res.result.files) || [];
        }

        // ── Hilfsfunktion: Dateien eines Ordners zaehlen + letzte Aenderung ermitteln ──
        async function getFolderStats(folderId) {
            assertDriveReady();
            try {
                var q = "'" + folderId + "' in parents and trashed=false";
                var res = await gapi.client.drive.files.list({
                    q: q,
                    fields: 'files(id, modifiedTime, size, mimeType)',
                    pageSize: 1000,
                    spaces: 'drive'
                });
                var files = (res && res.result && res.result.files) || [];
                var neueste = null;
                var gesamtGroesse = 0;
                files.forEach(function(f) {
                    if (f.modifiedTime && (!neueste || f.modifiedTime > neueste)) {
                        neueste = f.modifiedTime;
                    }
                    if (f.size) {
                        gesamtGroesse += parseInt(f.size, 10) || 0;
                    }
                });
                return {
                    anzahlDateien: files.length,
                    letzteAenderung: neueste,
                    groesseBytes: gesamtGroesse
                };
            } catch (e) {
                console.warn('getFolderStats Fehler:', e);
                return { anzahlDateien: 0, letzteAenderung: null, groesseBytes: 0 };
            }
        }

        // ═══════════════════════════════════════════════════════
        // OEFFENTLICHE API
        // ═══════════════════════════════════════════════════════

        // ── Staging-Root-Ordner sicherstellen ──
        async function ensureRootFolder() {
            assertDriveReady();
            var cfg = window.STAGING_CONFIG;
            if (!cfg) throw new Error('STAGING_CONFIG nicht verfuegbar');

            // 1. Falls ID im localStorage gecached: pruefen ob noch gueltig
            if (cfg.ROOT_FOLDER_ID) {
                try {
                    var check = await gapi.client.drive.files.get({
                        fileId: cfg.ROOT_FOLDER_ID,
                        fields: 'id, name, trashed'
                    });
                    if (check && check.result && !check.result.trashed) {
                        return cfg.ROOT_FOLDER_ID;
                    }
                } catch (e) {
                    // ID ungueltig → neu suchen
                    console.warn('Gecachte Staging-Root-ID ungueltig, suche neu:', e.message);
                }
            }

            // 2. Per Namen suchen (auf Root-Ebene, ohne Eltern-Einschraenkung)
            var found = await findFolderByName(cfg.ROOT_FOLDER_NAME, null);
            if (found) {
                cfg.ROOT_FOLDER_ID = found.id;
                try { localStorage.setItem('staging_root_folder_id', found.id); } catch(_){}
                return found.id;
            }

            // 3. Nicht gefunden → neu anlegen
            var created = await createFolder(cfg.ROOT_FOLDER_NAME, null);
            cfg.ROOT_FOLDER_ID = created.id;
            try { localStorage.setItem('staging_root_folder_id', created.id); } catch(_){}
            return created.id;
        }

        // ── Staging-Baustelle anlegen (inkl. 5 Unterordner, Etappe 4.1 B2) ──
        async function createStagingBaustelle(baustelleName) {
            assertDriveReady();
            if (!baustelleName || typeof baustelleName !== 'string') {
                throw new Error('createStagingBaustelle: baustelleName fehlt');
            }
            var cfg = window.STAGING_CONFIG;
            if (!cfg) throw new Error('STAGING_CONFIG nicht verfuegbar');

            // 1. Root sicherstellen
            var rootId = await ensureRootFolder();

            // 2. Baustellen-Ordner finden oder anlegen
            var baustelleOrdner = await findOrCreateFolder(baustelleName, rootId);

            // 3. ETAPPE 4.1 B2: Existierende Ordner auflisten + Alias-Map vorbereiten
            //    So vermeiden wir, bei einer Legacy-Baustelle (mit "Bilder" und "Baustellen-App")
            //    zusaetzlich noch "Fotos" und "Anweisungen" anzulegen → waere Duplikat.
            var existingChildren = await listChildFolders(baustelleOrdner.id);
            var existingByName = {};
            existingChildren.forEach(function(c){ existingByName[c.name] = c; });
            var aliases = cfg.SUBFOLDER_ALIASES || {};
            var aliasRev = {};
            Object.keys(aliases).forEach(function(oldName) {
                var targetName = aliases[oldName];
                if (!aliasRev[targetName]) aliasRev[targetName] = [];
                aliasRev[targetName].push(oldName);
            });

            // 4. Unterordner finden/anlegen — Legacy-Namen werden bevorzugt wiederverwendet
            var subIds = {};
            for (var i = 0; i < cfg.SUBFOLDERS.length; i++) {
                var subName = cfg.SUBFOLDERS[i];
                // Fall A: Ordner unter dem neuen Namen existiert schon → nehmen
                if (existingByName[subName]) {
                    subIds[subName] = existingByName[subName].id;
                    continue;
                }
                // Fall B: Legacy-Ordner existiert → Drive-ID wiederverwenden, nicht neu anlegen
                var legacyHit = null;
                var altNames = aliasRev[subName] || [];
                for (var k = 0; k < altNames.length; k++) {
                    if (existingByName[altNames[k]]) {
                        legacyHit = existingByName[altNames[k]];
                        break;
                    }
                }
                if (legacyHit) {
                    subIds[subName] = legacyHit.id;
                    continue;
                }
                // Fall C: weder noch → neu anlegen unter dem neuen Namen
                var sub = await findOrCreateFolder(subName, baustelleOrdner.id);
                subIds[subName] = sub.id;
            }

            return {
                baustelleName: baustelleName,
                baustelleOrdnerId: baustelleOrdner.id,
                rootOrdnerId: rootId,
                unterordner: subIds
            };
        }

        // ── Alle Staging-Baustellen auflisten ──
        async function listStagingBaustellen() {
            assertDriveReady();
            var rootId;
            try {
                rootId = await ensureRootFolder();
            } catch (e) {
                console.warn('listStagingBaustellen: Root nicht verfuegbar:', e.message);
                return [];
            }
            var children = await listChildFolders(rootId);
            return children.map(function(c) {
                return {
                    name: c.name,
                    id: c.id,
                    modifiedTime: c.modifiedTime
                };
            });
        }

        // ── Pruefen, ob eine Baustelle schon ein Staging hat ──
        async function isStagingBereitgestellt(baustelleName) {
            assertDriveReady();
            if (!baustelleName) return false;
            var rootId;
            try {
                rootId = await ensureRootFolder();
            } catch (e) {
                return false;
            }
            var found = await findFolderByName(baustelleName, rootId);
            if (!found) return false;

            // Zusaetzliche Qualitaetspruefung: alle Unterordner vorhanden?
            // ETAPPE 4.1 B2: Alias-Check — Legacy-Ordnernamen zaehlen als vorhanden
            var cfg = window.STAGING_CONFIG;
            var children = await listChildFolders(found.id);
            var childNames = children.map(function(c){ return c.name; });

            // Invers-Map aufbauen: Zielname → [Liste der Legacy-Namen]
            var aliases = (cfg && cfg.SUBFOLDER_ALIASES) || {};
            var aliasRev = {};
            Object.keys(aliases).forEach(function(oldName) {
                var targetName = aliases[oldName];
                if (!aliasRev[targetName]) aliasRev[targetName] = [];
                aliasRev[targetName].push(oldName);
            });

            var fehlende = (cfg.SUBFOLDERS || []).filter(function(s) {
                // Ziel-Name direkt gefunden?
                if (childNames.indexOf(s) !== -1) return false;
                // Fallback: einer der Legacy-Namen vorhanden?
                var altNames = aliasRev[s] || [];
                for (var k = 0; k < altNames.length; k++) {
                    if (childNames.indexOf(altNames[k]) !== -1) return false;
                }
                return true;
            });
            return {
                vorhanden: true,
                vollstaendig: fehlende.length === 0,
                fehlendeUnterordner: fehlende,
                baustelleOrdnerId: found.id
            };
        }

        // ── Drive-ID eines Staging-Unterordners liefern ──
        async function getStagingSubfolder(baustelleName, subfolderName) {
            assertDriveReady();
            var rootId = await ensureRootFolder();
            var bst = await findFolderByName(baustelleName, rootId);
            if (!bst) return null;
            var sub = await findFolderByName(subfolderName, bst.id);
            return sub ? sub.id : null;
        }

        // ── Reichhaltige Info-Daten fuer UI-Anzeige ──
        async function getStagingInfo(baustelleName) {
            assertDriveReady();
            var rootId = await ensureRootFolder();
            var bst = await findFolderByName(baustelleName, rootId);
            if (!bst) return null;

            var cfg = window.STAGING_CONFIG;
            var info = {
                baustelleName: baustelleName,
                baustelleOrdnerId: bst.id,
                modifiedTime: bst.modifiedTime,
                unterordner: {}
            };

            // ETAPPE 4.1 B2: Invers-Map der Legacy-Aliases
            //   aliasRev[Zielname] = [alte Namen die als Fallback dienen]
            var aliases = (cfg && cfg.SUBFOLDER_ALIASES) || {};
            var aliasRev = {};
            Object.keys(aliases).forEach(function(oldName) {
                var targetName = aliases[oldName];
                if (!aliasRev[targetName]) aliasRev[targetName] = [];
                aliasRev[targetName].push(oldName);
            });

            for (var i = 0; i < cfg.SUBFOLDERS.length; i++) {
                var subName = cfg.SUBFOLDERS[i];
                var sub = await findFolderByName(subName, bst.id);
                var aliasTreffer = null; // merken, unter welchem Legacy-Namen gefunden

                // ETAPPE 4.1 B2: Alias-Fallback — wenn Zielname nicht existiert,
                // Legacy-Namen probieren (z.B. "Bilder" statt "Fotos")
                if (!sub) {
                    var altNames = aliasRev[subName] || [];
                    for (var k = 0; k < altNames.length; k++) {
                        sub = await findFolderByName(altNames[k], bst.id);
                        if (sub) { aliasTreffer = altNames[k]; break; }
                    }
                }

                if (sub) {
                    var stats = await getFolderStats(sub.id);
                    info.unterordner[subName] = {
                        id: sub.id,
                        anzahlDateien: stats.anzahlDateien,
                        letzteAenderung: stats.letzteAenderung,
                        groesseBytes: stats.groesseBytes,
                        permission: (cfg.SUBFOLDER_PERMISSIONS && cfg.SUBFOLDER_PERMISSIONS[subName]) || 'readonly',
                        legacyName: aliasTreffer   // null wenn Zielname direkt gefunden, sonst der alte Name
                    };
                } else {
                    info.unterordner[subName] = null;
                }
            }
            return info;
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4: COPY-API "Aus Original nachladen"
        // ═══════════════════════════════════════════════════════

        // ── Originale Kundenordner-Struktur auflisten (alle 10 Ordner) ──
        // Liefert: [{name, id, anzahlDateien, groesseBytes, letzteAenderung}, ...]
        async function listOriginaleKundenOrdner(kundenOrdnerId) {
            assertDriveReady();
            if (!kundenOrdnerId) throw new Error('Kein Kundenordner-ID uebergeben');
            return await listChildFolders(kundenOrdnerId);
        }

        // ── Dateien eines Originalordners auflisten (direkte Kinder) ──
        async function listDateienInOrdner(ordnerId) {
            assertDriveReady();
            var q = "'" + ordnerId + "' in parents and trashed=false";
            var res = await gapi.client.drive.files.list({
                q: q,
                fields: 'files(id, name, mimeType, size, modifiedTime, parents)',
                orderBy: 'folder,name',
                pageSize: 500,
                spaces: 'drive'
            });
            return (res && res.result && res.result.files) || [];
        }

        // ── Existiert eine Datei mit diesem Namen schon im Zielordner? ──
        async function findDateiImOrdner(ordnerId, dateiName) {
            assertDriveReady();
            var safeName = (dateiName || '').replace(/'/g, "\\'");
            var q = "name='" + safeName + "' and '" + ordnerId + "' in parents and trashed=false";
            var res = await gapi.client.drive.files.list({
                q: q,
                fields: 'files(id, name, mimeType, size)',
                pageSize: 5,
                spaces: 'drive'
            });
            var files = (res && res.result && res.result.files) || [];
            return files.length > 0 ? files[0] : null;
        }

        // ── Eine einzelne Datei via Drive API kopieren (files.copy) ──
        // Originaldatei bleibt unveraendert — es wird eine Kopie im Zielordner angelegt.
        // onConflict: 'ueberspringen' | 'ueberschreiben' | 'umbenennen'
        async function copyFile(dateiId, zielOrdnerId, options) {
            assertDriveReady();
            options = options || {};
            var onConflict = options.onConflict || 'ueberspringen';
            var neuerName = options.neuerName || null;

            // Original-Metadaten holen fuer Namen
            var meta = await gapi.client.drive.files.get({
                fileId: dateiId,
                fields: 'id, name, mimeType, size'
            });
            var origName = meta.result.name;
            var zielName = neuerName || origName;

            // Konflikt-Pruefung
            var konflikt = await findDateiImOrdner(zielOrdnerId, zielName);
            if (konflikt) {
                if (onConflict === 'ueberspringen') {
                    return { status: 'uebersprungen', reason: 'exists', fileId: null, name: zielName };
                }
                if (onConflict === 'ueberschreiben') {
                    // Bestehende Datei in Papierkorb verschieben
                    await gapi.client.drive.files.update({
                        fileId: konflikt.id,
                        resource: { trashed: true }
                    });
                }
                if (onConflict === 'umbenennen') {
                    // Zeitstempel anhaengen, um Konflikt zu vermeiden
                    var ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                    var punktIndex = zielName.lastIndexOf('.');
                    if (punktIndex > 0) {
                        zielName = zielName.substring(0, punktIndex) + ' (' + ts + ')' + zielName.substring(punktIndex);
                    } else {
                        zielName = zielName + ' (' + ts + ')';
                    }
                }
            }

            // files.copy ausfuehren
            var res = await gapi.client.drive.files.copy({
                fileId: dateiId,
                resource: {
                    name: zielName,
                    parents: [zielOrdnerId]
                },
                fields: 'id, name, size, modifiedTime'
            });

            return {
                status: 'kopiert',
                fileId: res.result.id,
                name: res.result.name,
                size: res.result.size,
                modifiedTime: res.result.modifiedTime
            };
        }

        // ── Mehrere Dateien mit Fortschrittsmeldung kopieren ──
        // onProgress: function(current, total, fileName, result)
        async function copyMultipleFiles(dateiIdListe, zielOrdnerId, options, onProgress) {
            options = options || {};
            onProgress = onProgress || function(){};
            var total = dateiIdListe.length;
            var ergebnisse = [];
            for (var i = 0; i < total; i++) {
                var dateiId = dateiIdListe[i];
                onProgress(i, total, null, null);
                try {
                    var r = await copyFile(dateiId, zielOrdnerId, options);
                    ergebnisse.push({ dateiId: dateiId, ok: true, ergebnis: r });
                    onProgress(i + 1, total, r.name, r);
                } catch (e) {
                    ergebnisse.push({
                        dateiId: dateiId,
                        ok: false,
                        fehler: e.message || String(e)
                    });
                    onProgress(i + 1, total, null, { status: 'fehler', fehler: e.message });
                }
            }
            return ergebnisse;
        }

        // ═══════════════════════════════════════════════════════════
        // ETAPPE 5: UPLOAD & DELETE
        // ═══════════════════════════════════════════════════════════

        // ── Einzelne Datei in einen Staging-Ordner hochladen ──
        // zielOrdnerId: Drive-Ordner-ID (z.B. Staging-Unterordner "Bilder")
        // file:         File-Objekt (aus <input type="file"> oder Drag&Drop)
        // options:      { onProgress: fn(prozent), onConflict: 'ueberschreiben'|'umbenennen'|'ueberspringen' }
        // Rueckgabe:    { status, fileId, name, size, modifiedTime }
        async function uploadFileToStaging(zielOrdnerId, file, options) {
            assertDriveReady();
            if (!zielOrdnerId) throw new Error('zielOrdnerId fehlt');
            if (!file) throw new Error('Keine Datei uebergeben');
            options = options || {};
            var onProgress = options.onProgress || function(){};
            var onConflict = options.onConflict || 'umbenennen';

            var zielName = file.name;

            // ── Konflikt-Pruefung (gleicher Name bereits im Zielordner?) ──
            var konflikt = await findDateiImOrdner(zielOrdnerId, zielName);
            if (konflikt) {
                if (onConflict === 'ueberspringen') {
                    return { status: 'uebersprungen', reason: 'exists', fileId: null, name: zielName };
                }
                if (onConflict === 'ueberschreiben') {
                    // Bestehende Datei in Drive-Papierkorb verschieben
                    await gapi.client.drive.files.update({
                        fileId: konflikt.id,
                        resource: { trashed: true }
                    });
                }
                if (onConflict === 'umbenennen') {
                    // Zeitstempel anhaengen (Pattern wie copyFile)
                    var ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                    var punktIndex = zielName.lastIndexOf('.');
                    if (punktIndex > 0) {
                        zielName = zielName.substring(0, punktIndex) + ' (' + ts + ')' + zielName.substring(punktIndex);
                    } else {
                        zielName = zielName + ' (' + ts + ')';
                    }
                }
            }

            // ── Multipart-Upload via XHR (damit wir onProgress bekommen) ──
            // Ohne XHR haetten wir mit gapi.client keinen echten Progress,
            // weil gapi.client den Body komplett puffert.
            var metadata = {
                name: zielName,
                parents: [zielOrdnerId]
            };

            var boundary = '-------TWStagingBoundary' + Date.now();
            var delimiter = '\r\n--' + boundary + '\r\n';
            var closeDelim = '\r\n--' + boundary + '--';

            // Datei als ArrayBuffer lesen (damit wir sie in den Multipart-Body packen koennen)
            var arrayBuffer = await new Promise(function(resolve, reject) {
                var reader = new FileReader();
                reader.onload = function(){ resolve(reader.result); };
                reader.onerror = function(){ reject(new Error('Konnte Datei nicht lesen')); };
                reader.readAsArrayBuffer(file);
            });

            var mimeType = file.type || 'application/octet-stream';

            var metaPart = delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata);
            var filePartHeader = delimiter +
                'Content-Type: ' + mimeType + '\r\n' +
                'Content-Transfer-Encoding: binary\r\n\r\n';

            var metaBlob = new Blob([metaPart + filePartHeader], { type: 'text/plain' });
            var closeBlob = new Blob([closeDelim], { type: 'text/plain' });
            var body = new Blob([metaBlob, arrayBuffer, closeBlob], { type: 'multipart/related; boundary=' + boundary });

            // Access-Token aus gapi holen
            var token = gapi.client.getToken();
            if (!token || !token.access_token) {
                throw new Error('Kein gueltiges Access-Token. Bitte neu anmelden.');
            }

            var result = await new Promise(function(resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,modifiedTime');
                xhr.setRequestHeader('Authorization', 'Bearer ' + token.access_token);
                xhr.setRequestHeader('Content-Type', 'multipart/related; boundary=' + boundary);

                xhr.upload.onprogress = function(ev) {
                    if (ev.lengthComputable) {
                        var pct = Math.round((ev.loaded / ev.total) * 100);
                        try { onProgress(pct); } catch(e){}
                    }
                };
                xhr.onload = function() {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            resolve(JSON.parse(xhr.responseText));
                        } catch(e) {
                            reject(new Error('Antwort konnte nicht gelesen werden: ' + e.message));
                        }
                    } else {
                        reject(new Error('Upload fehlgeschlagen (HTTP ' + xhr.status + '): ' + xhr.responseText));
                    }
                };
                xhr.onerror = function() { reject(new Error('Netzwerk-Fehler beim Upload')); };
                xhr.send(body);
            });

            return {
                status: 'hochgeladen',
                fileId: result.id,
                name: result.name,
                size: result.size,
                modifiedTime: result.modifiedTime
            };
        }

        // ── Mehrere Dateien hintereinander hochladen, mit Fortschrittsmeldung pro Datei ──
        // onProgress: function(current, total, fileName, prozentInnerhalbDerDatei, result)
        async function uploadMultipleFiles(fileListe, zielOrdnerId, options, onProgress) {
            options = options || {};
            onProgress = onProgress || function(){};
            var total = fileListe.length;
            var ergebnisse = [];
            for (var i = 0; i < total; i++) {
                var file = fileListe[i];
                onProgress(i, total, file.name, 0, null);
                try {
                    var r = await uploadFileToStaging(zielOrdnerId, file, {
                        onConflict: options.onConflict,
                        onProgress: function(pct) {
                            onProgress(i, total, file.name, pct, null);
                        }
                    });
                    ergebnisse.push({ name: file.name, ok: true, ergebnis: r });
                    onProgress(i + 1, total, file.name, 100, r);
                } catch (e) {
                    ergebnisse.push({
                        name: file.name,
                        ok: false,
                        fehler: e.message || String(e)
                    });
                    onProgress(i + 1, total, file.name, 0, { status: 'fehler', fehler: e.message });
                }
            }
            return ergebnisse;
        }

        // ── Datei loeschen (Papierkorb oder permanent) ──
        // fileId:     Drive-File-ID
        // permanent:  true = echtes Delete, false = nur Papierkorb (30 Tage wiederherstellbar)
        // Rueckgabe:  { deleted: true, permanent: boolean }
        async function deleteDateiAusStaging(fileId, permanent) {
            assertDriveReady();
            if (!fileId) throw new Error('fileId fehlt');
            if (permanent) {
                // Echtes Loeschen — nicht wiederherstellbar
                await gapi.client.drive.files.delete({ fileId: fileId });
                return { deleted: true, permanent: true };
            }
            // Papierkorb — bleibt 30 Tage wiederherstellbar
            await gapi.client.drive.files.update({
                fileId: fileId,
                resource: { trashed: true }
            });
            return { deleted: true, permanent: false };
        }

        // ═══════════════════════════════════════════════════════════
        // ETAPPE 7: Firebase-Sync der Staging-Daten
        // ═══════════════════════════════════════════════════════════

        // ── Eine einzelne Baustelle vom Drive-Staging nach Firebase replizieren ──
        // Liest alle 4 Unterordner und schreibt pro Datei einen Metadaten-Eintrag
        // nach projects/{projectId}/staging/{unterordner}/{fileId}
        // baustelleName: z.B. 'Mueller, Max'
        // projectId:     Firebase-Projekt-Schluessel (kann abweichen vom Drive-Name)
        // onProgress:    optional function(schritt, details)
        async function syncStagingNachFirebase(baustelleName, projectId, onProgress) {
            if (!window.FirebaseService || !window.FirebaseService.db) {
                throw new Error('Firebase nicht verbunden');
            }
            if (!baustelleName) throw new Error('baustelleName fehlt');
            if (!projectId)     throw new Error('projectId fehlt');
            onProgress = onProgress || function(){};

            onProgress('start', { baustelle: baustelleName });

            // 1. Staging-Info holen (4 Unterordner mit Drive-IDs)
            var info = await getStagingInfo(baustelleName);
            if (!info || !info.unterordner) {
                throw new Error('Staging nicht vorhanden fuer ' + baustelleName);
            }

            var gesamtDateien = 0;
            var syncErgebnis = {
                baustelle: baustelleName,
                projectId: projectId,
                unterordner: {},
                gesamt: 0,
                fehler: []
            };

            // 2. Fuer jeden der 5 Unterordner Dateien listen und nach Firebase schreiben
            // ETAPPE 4.1 B2: Fallback-Liste mit neuen Namen (Alias-Auflösung erfolgt schon in getStagingInfo)
            var subfolderNames = window.STAGING_CONFIG.SUBFOLDERS || ['Zeichnungen','Anweisungen','Baustellendaten','Fotos','Stunden'];
            var permissions = window.STAGING_CONFIG.SUBFOLDER_PERMISSIONS || {};

            for (var i = 0; i < subfolderNames.length; i++) {
                var subname = subfolderNames[i];
                var subInfo = info.unterordner[subname];
                if (!subInfo || !subInfo.id) {
                    onProgress('unterordner-fehlt', { name: subname });
                    continue;
                }

                onProgress('unterordner', { name: subname });

                try {
                    // Alle Dateien des Unterordners auflisten
                    var dateien = await listDateienInOrdner(subInfo.id);

                    // Firebase-Map aufbauen: { fileId: metadata }
                    var fbMap = {};
                    for (var j = 0; j < dateien.length; j++) {
                        var d = dateien[j];
                        fbMap[d.id] = {
                            name: d.name || '',
                            mimeType: d.mimeType || '',
                            size: parseInt(d.size, 10) || 0,
                            modifiedTime: d.modifiedTime || null,
                            driveUrl: 'https://drive.google.com/file/d/' + d.id + '/view',
                            permission: permissions[subname] || 'readonly'
                        };
                    }

                    // In Firebase schreiben (Set ueberschreibt den Unterordner — Drive ist Quelle der Wahrheit)
                    var pfad = 'projects/' + projectId + '/staging/' + subname;
                    await window.FirebaseService.db.ref(pfad).set(fbMap);

                    syncErgebnis.unterordner[subname] = {
                        ok: true,
                        anzahl: dateien.length
                    };
                    gesamtDateien += dateien.length;

                    onProgress('unterordner-ok', { name: subname, anzahl: dateien.length });
                } catch (e) {
                    syncErgebnis.unterordner[subname] = {
                        ok: false,
                        fehler: e.message || String(e)
                    };
                    syncErgebnis.fehler.push({ unterordner: subname, fehler: e.message });
                    onProgress('unterordner-fehler', { name: subname, fehler: e.message });
                }
            }

            syncErgebnis.gesamt = gesamtDateien;

            // 3. Timestamp setzen
            try {
                await window.FirebaseService.db.ref('projects/' + projectId + '/lastStagingSync')
                    .set(firebase.database.ServerValue.TIMESTAMP);
            } catch (e) {
                // Zeitstempel-Fehler ist nicht kritisch
                console.warn('Timestamp-Fehler:', e);
            }

            onProgress('fertig', syncErgebnis);
            return syncErgebnis;
        }

        // ── Alle gestagten Baustellen nach Firebase syncen ──
        // Nimmt die Liste der Staging-Baustellen und syncchronisiert jede einzeln.
        // kundenMap: Objekt { baustelleName: projectId } um Drive-Namen auf Firebase-Projekt-Keys zu mappen
        //            (falls leer: baustelleName wird als projectId verwendet)
        async function syncAlleStagings(kundenMap, onProgress) {
            kundenMap = kundenMap || {};
            onProgress = onProgress || function(){};

            var baustellen = await listStagingBaustellen();
            var alleErgebnisse = [];

            for (var i = 0; i < baustellen.length; i++) {
                var b = baustellen[i];
                var pid = kundenMap[b.name] || b.name;
                onProgress('baustelle-start', { index: i, total: baustellen.length, name: b.name });
                try {
                    var erg = await syncStagingNachFirebase(b.name, pid, function(step, det){
                        onProgress('step', { baustelle: b.name, step: step, details: det });
                    });
                    alleErgebnisse.push({ ok: true, baustelle: b.name, ergebnis: erg });
                } catch (e) {
                    alleErgebnisse.push({
                        ok: false,
                        baustelle: b.name,
                        fehler: e.message || String(e)
                    });
                }
            }

            onProgress('alle-fertig', { anzahl: alleErgebnisse.length });
            return alleErgebnisse;
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 B8: DRIVE-MIGRATION LEGACY-ORDNER
        // Benennt Legacy-Ordnernamen auf Drive um, sodass das
        // Alias-System nicht mehr gebraucht wird.
        // ═══════════════════════════════════════════════════════

        // Low-Level: Einen einzelnen Ordner umbenennen via drive.files.update
        async function umbenennenOrdner(fileId, neuerName) {
            if (!fileId || !neuerName) throw new Error('fileId und neuerName erforderlich');
            assertDriveReady();
            var res = await gapi.client.drive.files.update({
                fileId: fileId,
                resource: { name: neuerName }
            });
            return res.result;
        }

        // High-Level: Scannt eine Staging-Baustelle, findet alle Legacy-Ordner
        // und benennt sie in die neuen Zielnamen um.
        // Rueckgabe: {migriert: [...], uebersprungen: [...], fehler: [...]}
        async function migriereLegacyOrdner(baustelleName, onProgress) {
            if (!baustelleName) throw new Error('baustelleName erforderlich');
            onProgress = onProgress || function(){};

            var info = await getStagingInfo(baustelleName);
            if (!info || !info.unterordner) {
                return { migriert: [], uebersprungen: [], fehler: [{ reason: 'Staging nicht vorhanden' }] };
            }

            var migriert = [];
            var uebersprungen = [];
            var fehler = [];

            // cfg.SUBFOLDERS sind die Zielnamen, info.unterordner[name].legacyName
            // enthaelt den aktuellen Drive-Namen wenn er vom Zielnamen abweicht.
            var cfg = window.STAGING_CONFIG || {};
            var zielnamen = cfg.SUBFOLDERS || ['Zeichnungen', 'Anweisungen', 'Baustellendaten', 'Fotos', 'Stunden'];

            for (var i = 0; i < zielnamen.length; i++) {
                var ziel = zielnamen[i];
                var sub = info.unterordner[ziel];
                if (!sub) {
                    uebersprungen.push({ name: ziel, reason: 'Ordner fehlt' });
                    continue;
                }
                if (!sub.legacyName) {
                    uebersprungen.push({ name: ziel, reason: 'bereits korrekt benannt' });
                    continue;
                }
                onProgress('migriere', { von: sub.legacyName, zu: ziel });
                try {
                    await umbenennenOrdner(sub.id, ziel);
                    migriert.push({ von: sub.legacyName, zu: ziel, id: sub.id });
                    onProgress('ok', { von: sub.legacyName, zu: ziel });
                } catch (e) {
                    fehler.push({ name: ziel, legacy: sub.legacyName, fehler: (e && e.message) || String(e) });
                    onProgress('fehler', { name: ziel, fehler: (e && e.message) || String(e) });
                }
            }

            return { migriert: migriert, uebersprungen: uebersprungen, fehler: fehler };
        }

        // Batch: Alle Staging-Baustellen durchlaufen und alle Legacy-Ordner umbenennen
        async function migriereAlleLegacyOrdner(onProgress) {
            onProgress = onProgress || function(){};
            var baustellen = await listStagingBaustellen();
            var gesamt = { baustellenMigriert: 0, ordnerMigriert: 0, fehler: [] };
            for (var i = 0; i < baustellen.length; i++) {
                var b = baustellen[i];
                onProgress('baustelle', { name: b.name, index: i + 1, gesamt: baustellen.length });
                try {
                    var erg = await migriereLegacyOrdner(b.name, function(phase, detail) {
                        onProgress('sub-' + phase, Object.assign({ baustelle: b.name }, detail));
                    });
                    if (erg.migriert.length > 0) {
                        gesamt.baustellenMigriert++;
                        gesamt.ordnerMigriert += erg.migriert.length;
                    }
                    if (erg.fehler.length > 0) {
                        erg.fehler.forEach(function(f){
                            gesamt.fehler.push(Object.assign({ baustelle: b.name }, f));
                        });
                    }
                } catch (e) {
                    gesamt.fehler.push({ baustelle: b.name, fehler: (e && e.message) || String(e) });
                    onProgress('baustelle-fehler', { baustelle: b.name, fehler: (e && e.message) || String(e) });
                }
            }
            onProgress('fertig', gesamt);
            return gesamt;
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 B9: FOTO-REVIEW DRIVE-HELFER
        // Funktionen, um im Buero-Review-Modul Thumbnails zu holen,
        // den Kunden-Bilder-Ordner aufzufinden und ein Foto aus dem
        // Staging in den Kunden-Ordner zu kopieren.
        // ═══════════════════════════════════════════════════════

        // Metadaten eines einzelnen Fotos: Thumbnail-Link + Grundinfos.
        // Rueckgabe: {id, name, thumbnailLink, webContentLink, size, mimeType, modifiedTime}
        async function getFotoMetadaten(fileId) {
            assertDriveReady();
            if (!fileId) throw new Error('fileId fehlt');
            var res = await gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'id, name, thumbnailLink, webContentLink, webViewLink, size, mimeType, modifiedTime'
            });
            return res.result;
        }

        // Fotos im Staging-Fotos-Ordner einer Baustelle listen.
        // Liefert alle Bild-Dateien mit Thumbnail-Links.
        async function listeStagingFotos(baustelleName) {
            assertDriveReady();
            var info = await getStagingInfo(baustelleName);
            if (!info || !info.unterordner) return [];
            var fotosOrdner = info.unterordner['Fotos'];
            if (!fotosOrdner) return [];
            var q = "'" + fotosOrdner.id + "' in parents and trashed=false and mimeType contains 'image/'";
            var res = await gapi.client.drive.files.list({
                q: q,
                fields: 'files(id, name, thumbnailLink, size, mimeType, modifiedTime, createdTime)',
                pageSize: 200,
                orderBy: 'modifiedTime desc'
            });
            return res.result.files || [];
        }

        // Kunden-Bilder-Ordner auffinden. Bildet den Standard-Baustellen-Ordner
        // auf dem Drive ab. Sucht in "Baustellen neu/{kundenname}/Bilder".
        // Fallback: erster passender "Bilder"-Unterordner im Baustellenverzeichnis.
        async function findeKundenBilderOrdner(kundenName) {
            assertDriveReady();
            if (!kundenName) throw new Error('kundenName fehlt');

            // 1. Baustellen-neu-Wurzel finden
            var wurzelName = (window.DRIVE_ORDNER && window.DRIVE_ORDNER.BAUSTELLEN_WURZEL) || 'Baustellen neu';
            var wurzel = await findFolderByName(wurzelName, null);
            if (!wurzel) throw new Error('Wurzel "' + wurzelName + '" nicht gefunden');

            // 2. Kunden-Ordner in der Wurzel suchen (tolerant: wenn exakter Name nicht trifft,
            //    dann case-insensitive Teilstring-Match in der Wurzel-Liste)
            var kundenOrdner = await findFolderByName(kundenName, wurzel.id);
            if (!kundenOrdner) {
                // Tolerant: Liste der Kinder holen und per Teilstring
                var liste = await gapi.client.drive.files.list({
                    q: "'" + wurzel.id + "' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
                    fields: 'files(id, name)',
                    pageSize: 1000
                });
                var kids = liste.result.files || [];
                var needle = kundenName.toLowerCase();
                for (var i = 0; i < kids.length; i++) {
                    if (kids[i].name.toLowerCase().indexOf(needle) !== -1) {
                        kundenOrdner = kids[i];
                        break;
                    }
                }
            }
            if (!kundenOrdner) throw new Error('Kunden-Ordner "' + kundenName + '" nicht gefunden');

            // 3. Bilder-Unterordner im Kundenordner
            var bilder = await findFolderByName('Bilder', kundenOrdner.id);
            if (!bilder) throw new Error('"Bilder"-Unterordner im Kundenordner "' + kundenName + '" nicht gefunden');
            return bilder;
        }

        // Foto aus Staging in Kunden-Bilder-Ordner kopieren (gibt neue ID zurueck).
        // Staging-Original bleibt erhalten bis zum naechsten Cleanup.
        async function kopiereFotoInKundenOrdner(stagingFileId, kundenOrdnerId, neuerName) {
            assertDriveReady();
            if (!stagingFileId || !kundenOrdnerId) throw new Error('stagingFileId und kundenOrdnerId erforderlich');
            var resource = { parents: [kundenOrdnerId] };
            if (neuerName) resource.name = neuerName;
            var res = await gapi.client.drive.files.copy({
                fileId: stagingFileId,
                resource: resource,
                fields: 'id, name, webViewLink'
            });
            return res.result;
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE 4.1 B10: STUNDEN-REVIEW DRIVE-HELFER
        // PDFs im Staging-Stunden-Ordner einer Baustelle listen und
        // bei Freigabe in zwei Ziele kopieren: Kunden-Stundennachweis
        // und zentraler Lohnbuchhaltungs-Ordner (Monats-Archiv).
        // ═══════════════════════════════════════════════════════

        // Stunden-PDFs im Staging-Stunden-Ordner einer Baustelle listen
        async function listeStagingStunden(baustelleName) {
            assertDriveReady();
            var info = await getStagingInfo(baustelleName);
            if (!info || !info.unterordner) return [];
            var stundenOrdner = info.unterordner['Stunden'];
            if (!stundenOrdner) return [];
            var q = "'" + stundenOrdner.id + "' in parents and trashed=false";
            var res = await gapi.client.drive.files.list({
                q: q,
                fields: 'files(id, name, size, mimeType, modifiedTime, createdTime, webViewLink)',
                pageSize: 200,
                orderBy: 'modifiedTime desc'
            });
            return res.result.files || [];
        }

        // Kunden-Stundennachweis-Ordner finden (analog zu findeKundenBilderOrdner)
        async function findeKundenStundenOrdner(kundenName) {
            assertDriveReady();
            if (!kundenName) throw new Error('kundenName fehlt');
            var wurzelName = (window.DRIVE_ORDNER && window.DRIVE_ORDNER.BAUSTELLEN_WURZEL) || 'Baustellen neu';
            var wurzel = await findFolderByName(wurzelName, null);
            if (!wurzel) throw new Error('Wurzel "' + wurzelName + '" nicht gefunden');
            var kundenOrdner = await findFolderByName(kundenName, wurzel.id);
            if (!kundenOrdner) {
                var liste = await gapi.client.drive.files.list({
                    q: "'" + wurzel.id + "' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
                    fields: 'files(id, name)',
                    pageSize: 1000
                });
                var kids = liste.result.files || [];
                var needle = kundenName.toLowerCase();
                for (var i = 0; i < kids.length; i++) {
                    if (kids[i].name.toLowerCase().indexOf(needle) !== -1) {
                        kundenOrdner = kids[i];
                        break;
                    }
                }
            }
            if (!kundenOrdner) throw new Error('Kunden-Ordner "' + kundenName + '" nicht gefunden');
            var stundenName = (window.DRIVE_ORDNER && window.DRIVE_ORDNER.stundennachweis) || 'Stundennachweis';
            var stunden = await findFolderByName(stundenName, kundenOrdner.id);
            if (!stunden) throw new Error('"' + stundenName + '"-Unterordner im Kundenordner "' + kundenName + '" nicht gefunden');
            return stunden;
        }

        // Lohn-Monats-Ordner sicherstellen (anlegen falls nicht vorhanden).
        // Struktur: (Root) / Lohnbuchhaltung / {YYYY-MM}/
        async function ensureLohnMonatsOrdner(monat) {
            assertDriveReady();
            if (!monat || !/^\d{4}-\d{2}$/.test(monat)) throw new Error('monat muss YYYY-MM sein');
            var lohnName = (window.DRIVE_ORDNER && window.DRIVE_ORDNER.LOHN_WURZEL) || 'Lohnbuchhaltung';
            var lohnWurzel = await findFolderByName(lohnName, null);
            if (!lohnWurzel) {
                // Anlegen im Root
                var res = await gapi.client.drive.files.create({
                    resource: {
                        name: lohnName,
                        mimeType: 'application/vnd.google-apps.folder'
                    },
                    fields: 'id, name'
                });
                lohnWurzel = res.result;
            }
            var monatsOrdner = await findFolderByName(monat, lohnWurzel.id);
            if (!monatsOrdner) {
                var res2 = await gapi.client.drive.files.create({
                    resource: {
                        name: monat,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [lohnWurzel.id]
                    },
                    fields: 'id, name'
                });
                monatsOrdner = res2.result;
            }
            return monatsOrdner;
        }

        // Generische Copy-in-Zielordner-Funktion (fuer PDFs)
        async function kopierePdfInOrdner(stagingFileId, zielOrdnerId, neuerName) {
            assertDriveReady();
            if (!stagingFileId || !zielOrdnerId) throw new Error('stagingFileId und zielOrdnerId erforderlich');
            var resource = { parents: [zielOrdnerId] };
            if (neuerName) resource.name = neuerName;
            var res = await gapi.client.drive.files.copy({
                fileId: stagingFileId,
                resource: resource,
                fields: 'id, name, webViewLink'
            });
            return res.result;
        }

        // ═══════════════════════════════════════════════════════
        // ETAPPE F: STAGING -> ORIGINAL SAMMEL-SYNC
        // Ein-Tuer-Prinzip — manueller Tor-Schritt zwischen
        // Mitarbeiter-Uploads (Staging) und Kundenakte (Original).
        //
        // Skill SKILL-baustellenapp-umbau Etappe F + Konzept-PDF Kapitel 7.1-7.3:
        //   - Staging/Fotos   ->  Original/Bilder
        //   - Staging/Stunden ->  Original/Stundennachweis
        //   - Vorschau, Checkboxen pro Datei
        //   - Kollisions-Erkennung mit 3-Wege-Strategie
        //
        // Andere Staging-Subfolder (Zeichnungen/Anweisungen/Baustellendaten)
        // sind read-only fuer Mitarbeiter — fuer die gibt es keine Rueckrichtung.
        // ═══════════════════════════════════════════════════════
        var STAGING_ZU_ORIGINAL_MAP = {
            'Fotos':   { zielName: 'Bilder',         finder: findeKundenBilderOrdner,  lister: listeStagingFotos   },
            'Stunden': { zielName: 'Stundennachweis', finder: findeKundenStundenOrdner, lister: listeStagingStunden }
        };

        // Analysiert eine Baustelle: listet alle Mitarbeiter-Uploads (Fotos+Stunden),
        // findet pro Kategorie den Original-Ziel-Ordner und prueft Namens-Kollisionen.
        // Liefert eine flache Item-Liste, die direkt in den UI-Dialog gerendert wird.
        async function analysiereStagingNachOriginal(baustelleName) {
            assertDriveReady();
            if (!baustelleName) throw new Error('baustelleName fehlt');
            var ergebnis = {
                baustelle: baustelleName,
                items: [],         // ein Eintrag pro Staging-Datei
                kategorienFehler: [] // wenn Ziel-Ordner nicht gefunden o.ae.
            };

            for (var subfolderName in STAGING_ZU_ORIGINAL_MAP) {
                if (!STAGING_ZU_ORIGINAL_MAP.hasOwnProperty(subfolderName)) continue;
                var mapping = STAGING_ZU_ORIGINAL_MAP[subfolderName];

                // 1) Staging-Dateien dieser Kategorie listen
                var stagingDateien = [];
                try {
                    stagingDateien = await mapping.lister(baustelleName);
                } catch (e) {
                    // Subfolder existiert nicht oder API-Fehler — ueberspringen, aber merken
                    ergebnis.kategorienFehler.push({
                        kategorie: subfolderName,
                        fehler: 'Staging-Ordner nicht lesbar: ' + (e.message || String(e))
                    });
                    continue;
                }
                if (!stagingDateien || stagingDateien.length === 0) continue;

                // 2) Ziel-Ordner im Original-Kundenordner finden
                var zielOrdner;
                try {
                    zielOrdner = await mapping.finder(baustelleName);
                } catch (e) {
                    ergebnis.kategorienFehler.push({
                        kategorie: subfolderName,
                        fehler: 'Ziel-Ordner "' + mapping.zielName + '" nicht gefunden: ' + (e.message || String(e)),
                        anzahlDateien: stagingDateien.length
                    });
                    continue;
                }

                // 3) Ziel-Inhalt einlesen fuer Kollisions-Pruefung
                var zielDateien = [];
                try {
                    zielDateien = await listDateienInOrdner(zielOrdner.id);
                } catch (e) {
                    // Wenn Ziel-Liste nicht ladbar, nehmen wir an: keine Kollisionen (Default sicher)
                    zielDateien = [];
                }
                var zielMap = {};
                zielDateien.forEach(function(d){
                    if (d && d.name) zielMap[d.name.toLowerCase()] = d;
                });

                // 4) Items zusammenbauen
                for (var i = 0; i < stagingDateien.length; i++) {
                    var s = stagingDateien[i];
                    var kollision = zielMap[(s.name || '').toLowerCase()];
                    // Smarte Erkennung: gleicher Name + gleiche Groesse = Doppel-Upload
                    var istDoppelUpload = false;
                    if (kollision && kollision.size && s.size && String(kollision.size) === String(s.size)) {
                        istDoppelUpload = true;
                    }
                    ergebnis.items.push({
                        kategorie: subfolderName,                  // 'Fotos' | 'Stunden'
                        stagingFile: {
                            id: s.id,
                            name: s.name,
                            size: s.size || 0,
                            mimeType: s.mimeType || '',
                            modifiedTime: s.modifiedTime || '',
                            thumbnailLink: s.thumbnailLink || ''
                        },
                        zielOrdner: { id: zielOrdner.id, name: zielOrdner.name, kategorieZielName: mapping.zielName },
                        kollision: !!kollision,
                        kollisionFile: kollision ? {
                            id: kollision.id,
                            name: kollision.name,
                            size: kollision.size || 0,
                            modifiedTime: kollision.modifiedTime || ''
                        } : null,
                        istDoppelUpload: istDoppelUpload
                    });
                }
            }

            return ergebnis;
        }

        // Uebertraegt eine Auswahl von Items mit individueller Strategie pro Item.
        // strategie pro Item: 'kopieren' | 'umbenennen' | 'ueberschreiben' | 'ignorieren'
        //   - kopieren:      ohne Kollision direkt; mit Kollision faellt zurueck auf 'umbenennen'
        //   - umbenennen:    bei Kollision wird die neue Datei mit Zeitstempel-Suffix kopiert
        //   - ueberschreiben: bestehende Datei in Papierkorb, neue Datei mit Originalnamen
        //   - ignorieren:    Datei wird nicht angefasst
        // onProgress(index, total, currentName, lastResult)
        async function uebertrageStagingNachOriginal(itemsMitStrategie, onProgress) {
            assertDriveReady();
            onProgress = onProgress || function(){};
            var ergebnisse = {
                erfolgreich: 0,
                uebersprungen: 0,
                fehler: 0,
                details: []   // [{ name, status, neuerName?, fehler? }]
            };

            for (var i = 0; i < itemsMitStrategie.length; i++) {
                var item = itemsMitStrategie[i];
                var strategie = item.strategie || 'kopieren';
                var dateiName = (item.stagingFile && item.stagingFile.name) || '?';
                onProgress(i, itemsMitStrategie.length, dateiName, null);

                // Ignorieren -> uebersprungen, kein API-Call
                if (strategie === 'ignorieren' || strategie === 'ueberspringen') {
                    ergebnisse.uebersprungen++;
                    var detail = { name: dateiName, kategorie: item.kategorie, status: 'uebersprungen' };
                    ergebnisse.details.push(detail);
                    onProgress(i + 1, itemsMitStrategie.length, dateiName, detail);
                    continue;
                }

                // Konflikt-Strategie an copyFile uebersetzen
                var copyOpt = { onConflict: 'umbenennen' };
                if (strategie === 'ueberschreiben') copyOpt.onConflict = 'ueberschreiben';
                else if (strategie === 'umbenennen') copyOpt.onConflict = 'umbenennen';
                else if (strategie === 'kopieren') {
                    copyOpt.onConflict = item.kollision ? 'umbenennen' : 'umbenennen';
                }

                try {
                    var r = await copyFile(item.stagingFile.id, item.zielOrdner.id, copyOpt);
                    ergebnisse.erfolgreich++;
                    var detailOk = {
                        name: dateiName,
                        kategorie: item.kategorie,
                        status: 'kopiert',
                        neuerName: r && r.name && r.name !== dateiName ? r.name : null,
                        zielOrdner: item.zielOrdner.name
                    };
                    ergebnisse.details.push(detailOk);
                    onProgress(i + 1, itemsMitStrategie.length, dateiName, detailOk);
                } catch (e) {
                    ergebnisse.fehler++;
                    var detailErr = {
                        name: dateiName,
                        kategorie: item.kategorie,
                        status: 'fehler',
                        fehler: e.message || String(e)
                    };
                    ergebnisse.details.push(detailErr);
                    onProgress(i + 1, itemsMitStrategie.length, dateiName, detailErr);
                }
            }

            return ergebnisse;
        }

        // Sammel-Variante: alle bereitgestellten Baustellen analysieren.
        // Liefert ein Map {baustelleName: analysiereResult}, plus globalen Aggregat.
        async function analysiereAlleStagingsNachOriginal(onProgress) {
            assertDriveReady();
            onProgress = onProgress || function(){};
            var alle = await listStagingBaustellen();
            var map = {};
            var aggregatItems = 0;
            for (var i = 0; i < alle.length; i++) {
                var b = alle[i];
                onProgress(i, alle.length, b.name);
                try {
                    var erg = await analysiereStagingNachOriginal(b.name);
                    map[b.name] = erg;
                    aggregatItems += erg.items.length;
                } catch (e) {
                    map[b.name] = { baustelle: b.name, items: [], kategorienFehler: [{ kategorie: '*', fehler: e.message || String(e) }] };
                }
            }
            onProgress(alle.length, alle.length, null);
            return { proBaustelle: map, aggregatItems: aggregatItems };
        }

        // ── Exporte ──
        // ─────────────────────────────────────────────────────────
        // INHALTS-DIAGNOSE (Fix 01.05.2026)
        // ─────────────────────────────────────────────────────────
        // Liefert pro Subordner einen Vergleich Drive vs. Firebase, um zu
        // verstehen, ob der Sync ueberhaupt durchgelaufen ist und ob die
        // Daten dort liegen, wo die MA-App sie erwartet.
        async function pruefeStagingInhalte(baustelleName, projectId, slug) {
            var ergebnis = {
                baustelle: baustelleName,
                slug: slug || '',
                driveId: projectId || '',
                subordner: {},
                subtrees: {
                    aktive: [],     // Top-Level-Keys unter aktive_baustellen/{slug}/
                    projects: []    // Top-Level-Keys unter projects/{driveId}/
                },
                raeume: {
                    // Auftrag 01.05.2026: Excel ↔ Firebase Raumliste-Bilanz
                    excel_count: 0,
                    excel_datei: null,    // { name, parentName }
                    firebase_count: 0,
                    firebase_sample: [],  // Erste 3 Raeume mit allen Feldern (Inspektor)
                    firebase_pfad: '',    // Voller Firebase-Pfad fuer Tablet-Vergleich
                    headers: [],          // Erkannte Header-Zeile (fuer Diagnose)
                    sample: [],           // Erste 8 Zeilen als Array-of-Arrays
                    headerZeile: -1,      // Index der erkannten Header-Zeile (0-basiert)
                    totalRows: 0,
                    parser_version: null, // Versions-Marker des Parsers (fuer Cache-Diagnose)
                    fehler: null
                },
                fehler: []
            };

            // 1. Drive-Inhalte sammeln
            try {
                var info = await getStagingInfo(baustelleName);
                var subfolderNames = (window.STAGING_CONFIG && window.STAGING_CONFIG.SUBFOLDERS)
                    || ['Zeichnungen','Anweisungen','Baustellendaten','Fotos','Stunden'];
                for (var i = 0; i < subfolderNames.length; i++) {
                    var subname = subfolderNames[i];
                    ergebnis.subordner[subname] = {
                        drive_count: 0, drive_files: [],
                        fb_projects_count: 0,
                        fb_aktive_count: 0,
                        fehlt_in_drive: false
                    };
                    var sub = info && info.unterordner && info.unterordner[subname];
                    if (!sub || !sub.id) {
                        ergebnis.subordner[subname].fehlt_in_drive = true;
                        continue;
                    }
                    try {
                        var dateien = await listDateienInOrdner(sub.id);
                        ergebnis.subordner[subname].drive_count = dateien.length;
                        ergebnis.subordner[subname].drive_files = dateien.slice(0, 10).map(function(d){
                            return { name: d.name, id: d.id };
                        });
                    } catch (eDateien) {
                        ergebnis.fehler.push({ subname: subname, quelle: 'drive', fehler: eDateien.message });
                    }
                }
            } catch (eInfo) {
                ergebnis.fehler.push({ subname: '*', quelle: 'drive_info', fehler: eInfo.message });
            }

            // 2. Firebase: projects/{driveId}/staging/{subname}
            if (projectId && window.FirebaseService && window.FirebaseService.db) {
                try {
                    var snap1 = await window.FirebaseService.db
                        .ref('projects/' + projectId + '/staging').once('value');
                    var data1 = snap1.val() || {};
                    Object.keys(ergebnis.subordner).forEach(function(subname){
                        var sub = data1[subname] || {};
                        ergebnis.subordner[subname].fb_projects_count = Object.keys(sub).length;
                    });
                } catch (eFb1) {
                    ergebnis.fehler.push({ subname: '*', quelle: 'fb_projects', fehler: eFb1.message });
                }

                // 3. Firebase: aktive_baustellen/{slug}/dateien/{subname}
                if (slug) {
                    try {
                        var snap2 = await window.FirebaseService.db
                            .ref('aktive_baustellen/' + slug + '/dateien').once('value');
                        var data2 = snap2.val() || {};
                        Object.keys(ergebnis.subordner).forEach(function(subname){
                            var sub = data2[subname] || {};
                            ergebnis.subordner[subname].fb_aktive_count = Object.keys(sub).length;
                        });
                    } catch (eFb2) {
                        ergebnis.fehler.push({ subname: '*', quelle: 'fb_aktive', fehler: eFb2.message });
                    }
                }

                // 4. Subtree-Listing: alle Top-Level-Knoten unter beiden Pfaden
                //    Damit sehen wir, ob die MA-App einen unbekannten Knoten schreibt/liest.
                if (slug) {
                    try {
                        var snap3 = await window.FirebaseService.db
                            .ref('aktive_baustellen/' + slug).once('value');
                        var d3 = snap3.val() || {};
                        ergebnis.subtrees.aktive = Object.keys(d3).map(function(k){
                            var v = d3[k];
                            var typ = typeof v;
                            var anzahl = (v && typ === 'object') ? Object.keys(v).length : 0;
                            return { key: k, typ: typ, anzahl: anzahl };
                        });
                    } catch (eSt1) {
                        ergebnis.fehler.push({ subname: '*', quelle: 'subtree_aktive', fehler: eSt1.message });
                    }
                }
                if (projectId) {
                    try {
                        var snap4 = await window.FirebaseService.db
                            .ref('projects/' + projectId).once('value');
                        var d4 = snap4.val() || {};
                        ergebnis.subtrees.projects = Object.keys(d4).map(function(k){
                            var v = d4[k];
                            var typ = typeof v;
                            var anzahl = (v && typ === 'object') ? Object.keys(v).length : 0;
                            return { key: k, typ: typ, anzahl: anzahl };
                        });
                    } catch (eSt2) {
                        ergebnis.fehler.push({ subname: '*', quelle: 'subtree_projects', fehler: eSt2.message });
                    }
                }
            }

            // 5. Auftrag 01.05.2026: Raeume-Bilanz Excel ↔ Firebase
            try {
                if (projectId) {
                    var excelMeta = await findeRaumlisteExcel(projectId);
                    if (excelMeta) {
                        ergebnis.raeume.excel_datei = {
                            name: excelMeta.name,
                            parentName: excelMeta.parentName
                        };
                        // Schnell-Parse fuer Zaehlung + Header-Anzeige
                        try {
                            var parsedDiag = await _ladeUndParseRaumliste(excelMeta.id);
                            ergebnis.raeume.headers = (parsedDiag && parsedDiag.headers) || [];
                            ergebnis.raeume.sample = (parsedDiag && parsedDiag.debug && parsedDiag.debug.ersteZeilen) || [];
                            ergebnis.raeume.headerZeile = (parsedDiag && parsedDiag.debug && parsedDiag.debug.headerZeile);
                            ergebnis.raeume.totalRows = (parsedDiag && parsedDiag.debug && parsedDiag.debug.totalRows) || 0;
                            ergebnis.raeume.parser_version = (parsedDiag && parsedDiag.debug && parsedDiag.debug.parser_version) || 'unbekannt';
                            if (parsedDiag && parsedDiag.debug && parsedDiag.debug.warnung) {
                                ergebnis.raeume.fehler = parsedDiag.debug.warnung;
                            }
                            // Nur Zeilen mit Bezeichnung (in irgendeinem Alias) zaehlen
                            var rows = (parsedDiag && parsedDiag.rows) || [];
                            var valid = 0;
                            for (var ri = 0; ri < rows.length; ri++) {
                                var bz = _zelle(rows[ri], [
                                    'Bezeichnung', 'Raumbezeichnung', 'Raumname', 'Raum-Name', 'Raum',
                                    'Name', 'Beschreibung', 'Raumbeschreibung',
                                    'bezeichnung', 'raumbezeichnung', 'raumname', 'raum', 'name', 'beschreibung'
                                ]);
                                if (bz) valid++;
                            }
                            ergebnis.raeume.excel_count = valid;
                        } catch (eParse) {
                            ergebnis.raeume.fehler = 'Excel-Parse: ' + eParse.message;
                        }
                    }
                }
                if (slug && window.FirebaseService && window.FirebaseService.db) {
                    var snapR = await window.FirebaseService.db
                        .ref('aktive_baustellen/' + slug + '/raeume').once('value');
                    var dataR = snapR.val() || {};
                    var keysR = Object.keys(dataR);
                    ergebnis.raeume.firebase_count = keysR.length;
                    // Inspektor: erste 3 Raeume mit allen Feldern fuer 1:1-Vergleich mit Tablet
                    var sampleFB = [];
                    for (var ki = 0; ki < Math.min(3, keysR.length); ki++) {
                        sampleFB.push({ key: keysR[ki], data: dataR[keysR[ki]] });
                    }
                    ergebnis.raeume.firebase_sample = sampleFB;
                    ergebnis.raeume.firebase_pfad = 'aktive_baustellen/' + slug + '/raeume';
                }
            } catch (eRaeume) {
                ergebnis.raeume.fehler = (eRaeume && eRaeume.message) || String(eRaeume);
            }

            return ergebnis;
        }

        // ─────────────────────────────────────────────────────────
        // QUAD-PATH-SYNC (Fix 01.05.2026, Iteration 2)
        // ─────────────────────────────────────────────────────────
        // Erweiterung von syncStagingNachFirebase: schreibt zusaetzlich an
        // 3 weitere plausible Lese-Pfade der MA-App. Insgesamt werden also
        // VIER Pfade pro Datei beschrieben:
        //   1. projects/{driveId}/staging/{subname}/{fileId}      (Original)
        //   2. aktive_baustellen/{slug}/dateien/{subname}/{fileId} (NEU)
        //   3. projects/{slug}/staging/{subname}/{fileId}          (NEU - slug statt driveId)
        //   4. aktive_baustellen/{slug}/staging/{subname}/{fileId} (NEU - 'staging' statt 'dateien')
        async function syncStagingDualPath(baustelleName, projectId, slug) {
            // Erst der bestehende Sync zum projects/{driveId}/-Pfad
            var ergebnis = await syncStagingNachFirebase(baustelleName, projectId);

            if (!window.FirebaseService || !window.FirebaseService.db) return ergebnis;
            if (!slug) return ergebnis;

            try {
                var info = await getStagingInfo(baustelleName);
                var subfolderNames = (window.STAGING_CONFIG && window.STAGING_CONFIG.SUBFOLDERS)
                    || ['Zeichnungen','Anweisungen','Baustellendaten','Fotos','Stunden'];
                var permissions = (window.STAGING_CONFIG && window.STAGING_CONFIG.SUBFOLDER_PERMISSIONS) || {};
                ergebnis.dual_path = {
                    pfade: [
                        'aktive_baustellen/'+slug+'/dateien/{subname}/',
                        'projects/'+slug+'/staging/{subname}/',
                        'aktive_baustellen/'+slug+'/staging/{subname}/'
                    ],
                    unterordner: {}
                };

                for (var i = 0; i < subfolderNames.length; i++) {
                    var subname = subfolderNames[i];
                    var subInfo = info && info.unterordner && info.unterordner[subname];
                    if (!subInfo || !subInfo.id) continue;
                    try {
                        var dateien = await listDateienInOrdner(subInfo.id);
                        var fbMap = {};
                        for (var j = 0; j < dateien.length; j++) {
                            var d = dateien[j];
                            fbMap[d.id] = {
                                name: d.name || '',
                                mimeType: d.mimeType || '',
                                size: parseInt(d.size, 10) || 0,
                                modifiedTime: d.modifiedTime || null,
                                driveUrl: 'https://drive.google.com/file/d/' + d.id + '/view',
                                permission: permissions[subname] || 'readonly'
                            };
                        }
                        // Schreibe die SAME Map an alle 3 zusaetzlichen Pfade parallel
                        var pfadA = 'aktive_baustellen/' + slug + '/dateien/' + subname;
                        var pfadB = 'projects/' + slug + '/staging/' + subname;
                        var pfadC = 'aktive_baustellen/' + slug + '/staging/' + subname;
                        await Promise.all([
                            window.FirebaseService.db.ref(pfadA).set(fbMap),
                            window.FirebaseService.db.ref(pfadB).set(fbMap),
                            window.FirebaseService.db.ref(pfadC).set(fbMap)
                        ]);
                        ergebnis.dual_path.unterordner[subname] = {
                            ok: true, anzahl: dateien.length
                        };
                    } catch (eSub) {
                        ergebnis.dual_path.unterordner[subname] = {
                            ok: false, fehler: eSub.message
                        };
                    }
                }
            } catch (e) {
                ergebnis.dual_path = { fehler: e.message };
            }

            return ergebnis;
        }

        // ═══════════════════════════════════════════════════════
        // RAEUME-PUSH AUS EXCEL (Auftrag 01.05.2026)
        // ═══════════════════════════════════════════════════════
        // Liest die Datei "Liste3_Raumliste_*.xlsx" aus dem Staging-Drive-
        // Ordner einer Baustelle (oder aus deren direkten Unterordnern),
        // parst sie mit SheetJS und pusht die Raumliste nach Firebase
        // unter aktive_baustellen/{slug}/raeume/. Ueberschreibt komplett —
        // Raeume die NICHT mehr in der Excel sind, werden in Firebase
        // geloescht (gewollt, damit keine Karteileichen entstehen).
        // Vom Mitarbeiter selbst angelegte Raeume liegen in einem anderen
        // Knoten und sind davon nicht betroffen.
        // ═══════════════════════════════════════════════════════

        // ── Hilfsfunktion: Excel-Zelle aus Zeile holen, mehrere Header-Varianten ──
        function _zelle(row, varianten) {
            for (var i = 0; i < varianten.length; i++) {
                var key = varianten[i];
                if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
                    return String(row[key]).trim();
                }
                // Case-insensitive Match als Fallback
                var lc = key.toLowerCase();
                var keys = Object.keys(row);
                for (var j = 0; j < keys.length; j++) {
                    if (keys[j].toLowerCase() === lc) {
                        var v = row[keys[j]];
                        if (v !== undefined && v !== null && String(v).trim() !== '') {
                            return String(v).trim();
                        }
                    }
                }
            }
            return '';
        }

        // ── Hilfsfunktion: "Ja"/"true"/"x"/"1" → true; "Nein"/"false"/leer → false ──
        function _zellenBoolean(s) {
            if (!s) return null;
            var v = String(s).trim().toLowerCase();
            if (v === '' || v === '-' || v === '—') return null;
            if (v === 'ja' || v === 'yes' || v === 'true' || v === 'x' || v === '1' || v === 'wahr') return true;
            if (v === 'nein' || v === 'no' || v === 'false' || v === '0' || v === 'falsch') return false;
            return null;
        }

        // ── Hilfsfunktion: Geschoss normalisieren ──
        function _normGeschoss(s) {
            if (!s) return 'EG';
            var v = String(s).trim().toUpperCase();
            if (['KG','EG','OG','DG','UG'].indexOf(v) !== -1) return v === 'UG' ? 'KG' : v;
            // Spezialfaelle
            if (/KELLER|UNTERGESCHOSS/i.test(s)) return 'KG';
            if (/ERDGESCHOSS/i.test(s)) return 'EG';
            if (/DACHGESCHOSS/i.test(s)) return 'DG';
            if (/OBERGESCHOSS/i.test(s)) return 'OG';
            // Erstes Vorkommen 1.OG, 2.OG etc → OG
            if (/OG/i.test(s)) return 'OG';
            return 'EG';
        }

        // ── Hilfsfunktion: stabiler Slug aus bezeichnung+nummer ──
        function _raumSlug(bezeichnung, nummer, fallbackIdx) {
            var src = (bezeichnung || '') + ' ' + (nummer || '');
            var slug = src.toLowerCase()
                .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
                .replace(/[^a-z0-9]+/g,'-')
                .replace(/^-+|-+$/g,'')
                .slice(0, 80);
            if (!slug) slug = 'raum-' + (fallbackIdx + 1);
            return slug;
        }

        // ── Sucht Liste3_Raumliste*.xlsx im Staging-Ordner + 1-Ebene-Subfolders ──
        // Returns: { id, name, modifiedTime, parentName } oder null
        async function findeRaumlisteExcel(stagingFolderId) {
            assertDriveReady();
            if (!stagingFolderId) return null;

            // 1. Direkt im Staging-Ordner suchen
            var topQ = "'" + stagingFolderId + "' in parents and trashed=false and name contains 'Liste3_Raumliste'";
            var topRes = await gapi.client.drive.files.list({
                q: topQ,
                fields: 'files(id, name, mimeType, size, modifiedTime, parents)',
                orderBy: 'modifiedTime desc',
                pageSize: 50,
                spaces: 'drive'
            });
            var topFiles = (topRes && topRes.result && topRes.result.files) || [];
            var direkt = topFiles.filter(function(f){
                var n = String(f.name || '');
                return /\.xlsx$/i.test(n) && /^Liste3_Raumliste/i.test(n);
            });
            if (direkt.length > 0) {
                return { id: direkt[0].id, name: direkt[0].name, modifiedTime: direkt[0].modifiedTime, parentName: '(Wurzel)' };
            }

            // 2. In direkten Unterordnern suchen
            var subFolders = await listChildFolders(stagingFolderId);
            for (var i = 0; i < subFolders.length; i++) {
                var sub = subFolders[i];
                try {
                    var subQ = "'" + sub.id + "' in parents and trashed=false and name contains 'Liste3_Raumliste'";
                    var subRes = await gapi.client.drive.files.list({
                        q: subQ,
                        fields: 'files(id, name, mimeType, size, modifiedTime)',
                        orderBy: 'modifiedTime desc',
                        pageSize: 50,
                        spaces: 'drive'
                    });
                    var subFiles = (subRes && subRes.result && subRes.result.files) || [];
                    var match = subFiles.filter(function(f){
                        var n = String(f.name || '');
                        return /\.xlsx$/i.test(n) && /^Liste3_Raumliste/i.test(n);
                    });
                    if (match.length > 0) {
                        return { id: match[0].id, name: match[0].name, modifiedTime: match[0].modifiedTime, parentName: sub.name };
                    }
                } catch (e) {
                    // Subordner unzugaenglich — weitersuchen
                }
            }
            return null;
        }

        // ── Excel runterladen und parsen — robust gegen Titel-Vorspann ──
        // Returns: { rows: [{header: wert, ...}], headers: [...], debug: {...} }
        var PARSER_VERSION = 'v3-2026-05-01';
        async function _ladeUndParseRaumliste(fileId) {
            if (typeof XLSX === 'undefined') {
                throw new Error('SheetJS (XLSX) nicht geladen');
            }
            if (!window.GoogleDriveService || !window.GoogleDriveService.downloadFile) {
                throw new Error('GoogleDriveService.downloadFile nicht verfuegbar');
            }
            var blob = await window.GoogleDriveService.downloadFile(fileId);
            var buffer = await blob.arrayBuffer();
            var workbook = XLSX.read(buffer, { type: 'array' });
            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('Excel hat keine Sheets');
            }
            var firstSheet = workbook.Sheets[workbook.SheetNames[0]];

            // Array-of-Arrays Mode — Zeilen als Arrays statt Objekte.
            // Damit erkennen wir die Header-Zeile selbst und ueberspringen
            // einen evtl. vorhandenen Titel/Vorspann (bei NotebookLM-Exports
            // typisch).
            var aoa = XLSX.utils.sheet_to_json(firstSheet, {
                header: 1, defval: '', blankrows: false, raw: false
            });
            if (!aoa || aoa.length === 0) {
                return { rows: [], headers: [], debug: { totalRows: 0, ersteZeilen: [] } };
            }

            // Heuristisch Header-Zeile in den ersten 10 Zeilen finden:
            // Die Zeile mit dem hoechsten Score an Header-Schluesselwoertern gewinnt.
            var headerKandidaten = [
                'raum', 'bezeichnung', 'beschreibung', 'name',
                'nummer', 'pos', 'geschoss', 'etage', 'stock', 'ebene',
                'flaeche', 'fläche', 'flache', 'm²', 'm2', 'qm',
                'fliesen', 'wand', 'boden', 'decke'
            ];
            var headerIdx = -1;
            var maxScore = 0;
            var maxSearchRows = Math.min(10, aoa.length);
            for (var i = 0; i < maxSearchRows; i++) {
                var zeile = aoa[i] || [];
                var score = 0;
                var nichtLeer = 0;
                for (var j = 0; j < zeile.length; j++) {
                    var raw = String(zeile[j] || '').trim();
                    if (!raw) continue;
                    nichtLeer++;
                    var z = raw.toLowerCase().replace(/[\s\-_.()]+/g, '');
                    if (z.length < 2 || z.length > 40) continue;
                    for (var k = 0; k < headerKandidaten.length; k++) {
                        if (z.indexOf(headerKandidaten[k].replace(/[\s\-_.()]+/g, '')) !== -1) {
                            score++;
                            break;
                        }
                    }
                }
                // Bevorzuge Zeilen mit mind. 1 Header-Treffer UND mind. 3 nicht-leeren Zellen.
                // (Lockerer als zuvor — eine Zeile mit "Raum-Nr." allein und 5 weiteren
                // Spalten ist sehr wahrscheinlich der echte Header, auch wenn nur 1 Wort matcht.)
                if (score >= 1 && nichtLeer >= 3 && score > maxScore) {
                    maxScore = score;
                    headerIdx = i;
                }
            }

            // Sample-Zeilen fuer Diagnose
            var sample = aoa.slice(0, Math.min(8, aoa.length)).map(function(r){
                return (r || []).slice(0, 10).map(function(v){ return String(v == null ? '' : v); });
            });

            if (headerIdx === -1) {
                // Fallback: keine Header-Zeile erkannt — gib Roh-Sample zurueck
                return {
                    rows: [],
                    headers: [],
                    debug: {
                        parser_version: PARSER_VERSION,
                        totalRows: aoa.length,
                        headerZeile: -1,
                        headerScore: 0,
                        ersteZeilen: sample,
                        warnung: 'Keine Header-Zeile erkannt (kein "Raum"/"Bezeichnung"/"Nr" gefunden)'
                    }
                };
            }

            var headers = (aoa[headerIdx] || []).map(function(h){
                return String(h == null ? '' : h).trim();
            });
            var rows = [];
            for (var r = headerIdx + 1; r < aoa.length; r++) {
                var rowArr = aoa[r] || [];
                var rowObj = {};
                var hasContent = false;
                for (var c = 0; c < headers.length; c++) {
                    var key = headers[c];
                    if (!key) continue;
                    var val = rowArr[c];
                    if (val !== undefined && val !== null && String(val).trim() !== '') {
                        hasContent = true;
                    }
                    rowObj[key] = val !== undefined && val !== null ? val : '';
                }
                if (hasContent) rows.push(rowObj);
            }

            return {
                rows: rows,
                headers: headers,
                debug: {
                    parser_version: PARSER_VERSION,
                    totalRows: aoa.length,
                    headerZeile: headerIdx,
                    headerScore: maxScore,
                    ersteZeilen: sample
                }
            };
        }

        // ── Excel-Zeile → Firebase-Raum-Objekt ──
        function _excelZeileZuRaum(row, idx) {
            var bezeichnung = _zelle(row, [
                'Bezeichnung', 'Raumbezeichnung', 'Raumname', 'Raum-Name', 'Raum',
                'Name', 'Beschreibung', 'Raumbeschreibung',
                'bezeichnung', 'raumbezeichnung', 'raumname', 'raum', 'name', 'beschreibung'
            ]);
            if (!bezeichnung) return null; // Zeile ohne Bezeichnung ignorieren

            var raumNr = _zelle(row, [
                'Raum-Nr.', 'Raum-Nr', 'Raum Nr.', 'Raum Nr', 'RaumNr',
                'Pos.', 'Pos', 'Pos.-Nr.', 'Pos.-Nr', 'Pos-Nr',
                'Nr.', 'Nr', 'Nummer',
                'raum-nr', 'raum-nr.', 'pos', 'pos.', 'nr', 'nr.', 'nummer'
            ]);
            var geschossRaw = _zelle(row, [
                'Geschoss', 'Etage', 'Stock', 'Ebene',
                'geschoss', 'etage', 'stock', 'ebene'
            ]);
            var wandzahlStr = _zelle(row, [
                'Wände', 'Anzahl Wände', 'Waende', 'Anzahl Waende', 'Wandzahl',
                'wandzahl', 'wände', 'waende'
            ]);
            var bodenStr = _zelle(row, [
                'Boden', 'Hat Boden', 'hatBoden', 'boden'
            ]);
            var deckeStr = _zelle(row, [
                'Decke', 'Hat Decke', 'hatDecke', 'decke'
            ]);
            var fliesenStr = _zelle(row, [
                'Fliesenarbeiten', 'Fliesen', 'Fliesenleger',
                'fliesenarbeiten', 'fliesen'
            ]);

            // Defaults laut Auftrag
            var wandzahl = parseInt(wandzahlStr, 10);
            if (!wandzahl || isNaN(wandzahl) || wandzahl < 3 || wandzahl > 12) wandzahl = 4;

            // hatBoden: explizite Spalte hat Vorrang, sonst aus Fliesenarbeiten ableiten,
            // sonst Default true (laut Auftrag)
            var bodenExpl = _zellenBoolean(bodenStr);
            var fliesenExpl = _zellenBoolean(fliesenStr);
            var hatBoden;
            if (bodenExpl !== null) {
                hatBoden = bodenExpl;
            } else if (fliesenExpl !== null) {
                hatBoden = fliesenExpl;
            } else {
                hatBoden = true;
            }

            // hatDecke: Default false
            var deckeExpl = _zellenBoolean(deckeStr);
            var hatDecke = (deckeExpl !== null) ? deckeExpl : false;

            var geschoss = _normGeschoss(geschossRaw);
            var slug = _raumSlug(bezeichnung, raumNr, idx);

            return {
                id: slug,
                bezeichnung: bezeichnung,
                nummer: raumNr || '',
                geschoss: geschoss,
                wandzahl: wandzahl,
                hatBoden: !!hatBoden,
                hatDecke: !!hatDecke,
                erstellt_am: Date.now(),
                erstellt_von: 'master-app'
            };
        }

        // ── Hauptfunktion: Excel finden, parsen, nach Firebase pushen ──
        // Returns: {
        //   gefunden: bool,
        //   datei: { name, parentName, modifiedTime } | null,
        //   raeume_excel: number,        // Zeilen aus Excel uebernommen
        //   raeume_firebase_vorher: number,
        //   raeume_firebase_nachher: number,
        //   geloescht: number,           // Anzahl entfernter Karteileichen
        //   uebersprungen: number,       // Zeilen ohne Bezeichnung
        //   fehler: string | null
        // }
        async function pushRaeumeAusExcel(baustelleName, projectId, slug) {
            var ergebnis = {
                gefunden: false,
                datei: null,
                raeume_excel: 0,
                raeume_firebase_vorher: 0,
                raeume_firebase_nachher: 0,
                geloescht: 0,
                uebersprungen: 0,
                headers: [],
                debug: null,
                fehler: null
            };

            try {
                if (!projectId) throw new Error('Drive-Folder-ID (projectId) fehlt');
                if (!slug) throw new Error('Baustellen-Slug fehlt');
                if (!window.FirebaseService || !window.FirebaseService.pushRaeumeListe) {
                    throw new Error('FirebaseService.pushRaeumeListe nicht verfuegbar');
                }

                // Vorher-Stand merken (fuer Diff-Anzeige)
                try {
                    var vorher = await window.FirebaseService.getRaeume(slug);
                    ergebnis.raeume_firebase_vorher = Object.keys(vorher || {}).length;
                } catch (eVor) {
                    // Nicht kritisch — Vorher-Stand bleibt 0
                }

                // 1. Excel finden
                var excel = await findeRaumlisteExcel(projectId);
                if (!excel) {
                    ergebnis.fehler = null; // kein Fehler — Datei existiert einfach nicht
                    return ergebnis;
                }
                ergebnis.gefunden = true;
                ergebnis.datei = {
                    name: excel.name,
                    parentName: excel.parentName,
                    modifiedTime: excel.modifiedTime
                };

                // 2. Parsen
                var parsed = await _ladeUndParseRaumliste(excel.id);
                var rows = (parsed && parsed.rows) || [];
                ergebnis.headers = (parsed && parsed.headers) || [];
                ergebnis.debug = (parsed && parsed.debug) || null;

                if (!rows || rows.length === 0) {
                    var grund = '';
                    if (parsed && parsed.debug && parsed.debug.warnung) {
                        grund = parsed.debug.warnung;
                    } else if (parsed && parsed.headers && parsed.headers.length > 0) {
                        grund = 'Header gefunden (' + parsed.headers.join(', ') + '), aber keine Datenzeilen';
                    } else {
                        grund = 'Keine Daten in Excel';
                    }
                    ergebnis.fehler = 'Excel "' + excel.name + '": ' + grund;
                    return ergebnis;
                }

                // 3. Mappen
                var raeume = [];
                var seenIds = {};
                for (var i = 0; i < rows.length; i++) {
                    var raum = _excelZeileZuRaum(rows[i], i);
                    if (!raum) {
                        ergebnis.uebersprungen++;
                        continue;
                    }
                    // Duplikat-Schutz: gleiche ID → letzter gewinnt
                    if (seenIds[raum.id]) {
                        // Slug eindeutig machen
                        raum.id = raum.id + '-' + i;
                    }
                    seenIds[raum.id] = true;
                    raeume.push(raum);
                }
                ergebnis.raeume_excel = raeume.length;

                // 4. Pushen — ueberschreibt Knoten komplett (Karteileichen verschwinden)
                var anzahl = await window.FirebaseService.pushRaeumeListe(slug, raeume);
                ergebnis.raeume_firebase_nachher = anzahl;
                ergebnis.geloescht = Math.max(0,
                    ergebnis.raeume_firebase_vorher - ergebnis.raeume_firebase_nachher
                );

                // 5. Audit
                try {
                    if (window.FirebaseService.logAuditEvent) {
                        await window.FirebaseService.logAuditEvent('raeume_excel_push', {
                            baustelle: baustelleName,
                            slug: slug,
                            datei: excel.name,
                            parent: excel.parentName,
                            excel: ergebnis.raeume_excel,
                            firebase: ergebnis.raeume_firebase_nachher,
                            uebersprungen: ergebnis.uebersprungen
                        });
                    }
                } catch(_) {}

                return ergebnis;
            } catch (e) {
                ergebnis.fehler = (e && e.message) || String(e);
                console.warn('[pushRaeumeAusExcel] Fehler:', ergebnis.fehler);
                return ergebnis;
            }
        }

        // ────────────────────────────────────────────────────────────────

        window.TWStaging = {
            ensureRootFolder: ensureRootFolder,
            createStagingBaustelle: createStagingBaustelle,
            listStagingBaustellen: listStagingBaustellen,
            isStagingBereitgestellt: isStagingBereitgestellt,
            getStagingSubfolder: getStagingSubfolder,
            getStagingInfo: getStagingInfo,
            // Fix 01.05.2026: Inhalts-Diagnose + Dual-Path-Sync
            pruefeStagingInhalte: pruefeStagingInhalte,
            syncStagingDualPath: syncStagingDualPath,
            // Etappe 4: Copy-API
            listOriginaleKundenOrdner: listOriginaleKundenOrdner,
            listDateienInOrdner: listDateienInOrdner,
            findDateiImOrdner: findDateiImOrdner,
            copyFile: copyFile,
            copyMultipleFiles: copyMultipleFiles,
            // Etappe 5: Upload & Delete
            uploadFileToStaging: uploadFileToStaging,
            uploadMultipleFiles: uploadMultipleFiles,
            deleteDateiAusStaging: deleteDateiAusStaging,
            // Etappe 7: Firebase-Sync
            syncStagingNachFirebase: syncStagingNachFirebase,
            syncAlleStagings: syncAlleStagings,
            // Etappe 4.1 B8: Drive-Migration
            umbenennenOrdner: umbenennenOrdner,
            migriereLegacyOrdner: migriereLegacyOrdner,
            migriereAlleLegacyOrdner: migriereAlleLegacyOrdner,
            // Etappe 4.1 B9: Foto-Review-Drive-Helfer
            getFotoMetadaten: getFotoMetadaten,
            listeStagingFotos: listeStagingFotos,
            findeKundenBilderOrdner: findeKundenBilderOrdner,
            kopiereFotoInKundenOrdner: kopiereFotoInKundenOrdner,
            // Etappe 4.1 B10: Stunden-Review-Drive-Helfer
            listeStagingStunden: listeStagingStunden,
            findeKundenStundenOrdner: findeKundenStundenOrdner,
            ensureLohnMonatsOrdner: ensureLohnMonatsOrdner,
            kopierePdfInOrdner: kopierePdfInOrdner,
            // Etappe F: Staging -> Original Sammel-Sync
            analysiereStagingNachOriginal: analysiereStagingNachOriginal,
            uebertrageStagingNachOriginal: uebertrageStagingNachOriginal,
            analysiereAlleStagingsNachOriginal: analysiereAlleStagingsNachOriginal,
            // Auftrag 01.05.2026: Excel-Raumliste -> Firebase
            findeRaumlisteExcel: findeRaumlisteExcel,
            pushRaeumeAusExcel: pushRaeumeAusExcel
        };

    })();
