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

        // ── Staging-Baustelle anlegen (inkl. 4 Unterordner) ──
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

            // 3. 4 Unterordner finden oder anlegen
            var subIds = {};
            for (var i = 0; i < cfg.SUBFOLDERS.length; i++) {
                var subName = cfg.SUBFOLDERS[i];
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

            // Zusaetzliche Qualitaetspruefung: alle 4 Unterordner vorhanden?
            var cfg = window.STAGING_CONFIG;
            var children = await listChildFolders(found.id);
            var childNames = children.map(function(c){ return c.name; });
            var fehlende = (cfg.SUBFOLDERS || []).filter(function(s) {
                return childNames.indexOf(s) === -1;
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

            for (var i = 0; i < cfg.SUBFOLDERS.length; i++) {
                var subName = cfg.SUBFOLDERS[i];
                var sub = await findFolderByName(subName, bst.id);
                if (sub) {
                    var stats = await getFolderStats(sub.id);
                    info.unterordner[subName] = {
                        id: sub.id,
                        anzahlDateien: stats.anzahlDateien,
                        letzteAenderung: stats.letzteAenderung,
                        groesseBytes: stats.groesseBytes,
                        permission: (cfg.SUBFOLDER_PERMISSIONS && cfg.SUBFOLDER_PERMISSIONS[subName]) || 'readonly'
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
            copyMultipleFiles: copyMultipleFiles
        };

    })();
