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

        // ── Exporte ──
        window.TWStaging = {
            ensureRootFolder: ensureRootFolder,
            createStagingBaustelle: createStagingBaustelle,
            listStagingBaustellen: listStagingBaustellen,
            isStagingBereitgestellt: isStagingBereitgestellt,
            getStagingSubfolder: getStagingSubfolder,
            getStagingInfo: getStagingInfo,
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
            kopierePdfInOrdner: kopierePdfInOrdner
        };

    })();
