    // ═══════════════════════════════════════════════════════
    // TW STAGING SERVICE — Baustellen-App-Staging-Verwaltung
    // ═══════════════════════════════════════════════════════
    // Verwaltet den separaten "Baustellen-App-Staging"-Bereich auf Google Drive.
    // Siehe STAGING_CONFIG in tw-infrastructure.js fuer die Grundprinzipien.
    //
    // Oeffentliche API:
    //   TWStaging.ensureRootFolder()            → Ordner-ID des Staging-Roots (legt bei Bedarf an)
    //   TWStaging.createStagingBaustelle(name)  → legt Baustellen-Staging + 5 Unterordner an
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

        // ── Hilfsfunktion: Ordner unter offiziellem Namen ODER unter Aliasen finden ──
        // ─ Etappe 4.1, Baustein 2 ─
        // Sucht zuerst unter dem offiziellen Namen. Wenn nicht gefunden, werden
        // alle in STAGING_CONFIG.SUBFOLDER_ALIASES[name] hinterlegten alten
        // Drive-Namen durchprobiert. Liefert das gefundene Ordner-Objekt oder null.
        // Verhindert, dass beim Anlegen / Vervollstaendigen doppelte Ordner
        // entstehen, solange die Drive-Migration (Baustein 8) noch nicht lief.
        async function findFolderByNameOrAlias(name, parentId) {
            // 1. Zuerst nach dem offiziellen Namen suchen
            var direct = await findFolderByName(name, parentId);
            if (direct) return direct;
            // 2. Wenn nicht gefunden: Alias-Liste durchgehen
            var cfg = window.STAGING_CONFIG;
            var aliases = (cfg && cfg.SUBFOLDER_ALIASES && cfg.SUBFOLDER_ALIASES[name]) || [];
            for (var i = 0; i < aliases.length; i++) {
                var hit = await findFolderByName(aliases[i], parentId);
                if (hit) return hit;
            }
            return null;
        }

        // ── Hilfsfunktion: Ordner finden (offiziell+Alias), sonst neu anlegen ──
        // ─ Etappe 4.1, Baustein 2 ─
        // Wenn weder offizieller Name noch Alias existiert, wird der Ordner
        // unter dem OFFIZIELLEN Namen neu angelegt.
        async function findOrCreateFolderWithAlias(name, parentId) {
            var existing = await findFolderByNameOrAlias(name, parentId);
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

        // ── Staging-Baustelle anlegen (inkl. 5 Unterordner, Etappe 4.1) ──
        // Etappe 4.1, Baustein 2:
        // Verwendet findOrCreateFolderWithAlias, damit BESTEHENDE Drive-Ordner
        // unter alten Namen (z.B. "Bilder", "Baustellen-App") als gueltig anerkannt
        // werden und NICHT doppelt angelegt werden. Neue Ordner entstehen unter
        // den OFFIZIELLEN Namen aus STAGING_CONFIG.SUBFOLDERS.
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

            // 3. Sub-Ordner finden (offiziell ODER unter Alias) oder anlegen
            var subIds = {};
            for (var i = 0; i < cfg.SUBFOLDERS.length; i++) {
                var subName = cfg.SUBFOLDERS[i];
                var sub = await findOrCreateFolderWithAlias(subName, baustelleOrdner.id);
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
        // Etappe 4.1, Baustein 2: Aliase werden bei der Vollstaendigkeitspruefung
        // mit beruecksichtigt -- bestehende "Bilder"-Ordner gelten als "Fotos" usw.
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

            // Vollstaendigkeitspruefung: alle Sub-Ordner vorhanden (offizielle Namen ODER Aliase)?
            var cfg = window.STAGING_CONFIG;
            var children = await listChildFolders(found.id);
            var childNames = children.map(function(c){ return c.name; });
            var fehlende = (cfg.SUBFOLDERS || []).filter(function(s) {
                if (childNames.indexOf(s) !== -1) return false;
                // Alias-Toleranz: existiert ein alter Name, der diesem Sub zugeordnet ist?
                var aliases = (cfg.SUBFOLDER_ALIASES && cfg.SUBFOLDER_ALIASES[s]) || [];
                for (var i = 0; i < aliases.length; i++) {
                    if (childNames.indexOf(aliases[i]) !== -1) return false;
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
        // Etappe 4.1, Baustein 2: Suchstring kann offiziell ODER Alias sein --
        // wenn der Aufrufer nach "Fotos" fragt, findet die Funktion auch "Bilder".
        async function getStagingSubfolder(baustelleName, subfolderName) {
            assertDriveReady();
            var rootId = await ensureRootFolder();
            var bst = await findFolderByName(baustelleName, rootId);
            if (!bst) return null;
            var sub = await findFolderByNameOrAlias(subfolderName, bst.id);
            return sub ? sub.id : null;
        }

        // ── Reichhaltige Info-Daten fuer UI-Anzeige ──
        // Etappe 4.1, Baustein 2: Lookup pro Sub-Ordner geht ueber Aliase. Die
        // info.unterordner-Map verwendet die OFFIZIELLEN Namen als Keys, auch
        // wenn die Daten physisch unter einem alten Namen liegen.
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
                var sub = await findFolderByNameOrAlias(subName, bst.id);
                if (sub) {
                    var stats = await getFolderStats(sub.id);
                    info.unterordner[subName] = {
                        id: sub.id,
                        driveName: sub.name,                  // tatsaechlicher Drive-Name (kann Alias sein)
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
        // ETAPPE 4.1, BAUSTEIN 8 — Drive-Migrations-API
        // ────────────────────────────────────────────────────────
        // Benennt physisch die alten Drive-Ordnernamen um, damit die UI-
        // Wahrheit (offizielle Namen aus STAGING_CONFIG.SUBFOLDERS) und die
        // Drive-Wahrheit endgueltig zusammenfallen. Bis Baustein 8 lebt die
        // App in der Alias-Welt -- ab jetzt ist alles physisch sauber.
        //
        // Mapping (aus STAGING_CONFIG.SUBFOLDER_ALIASES abgeleitet):
        //   "Bilder"         -> "Fotos"
        //   "Baustellen-App" -> "Anweisungen"
        //
        // Vorgehen pro Baustelle:
        //   1. listChildFolders -> aktuelle Sub-Ordner ermitteln
        //   2. Pro Alias pruefen: Existiert der alte Ordner UND der neue Ordner
        //      noch nicht? -> Umbenennen via files.update({name: 'NeuerName'})
        //   3. Existiert sowohl alt als auch neu (Konflikt)? -> Skip mit
        //      Warnung -- Thomas muss manuell entscheiden
        //
        // Idempotent: laeuft beliebig oft ohne Schaden (skipt bereits
        // umbenannte Ordner).
        // ═══════════════════════════════════════════════════════

        // ── Hilfsfunktion: Drive-Ordner umbenennen ──
        async function renameFolder(folderId, neuerName) {
            assertDriveReady();
            await gapi.client.drive.files.update({
                fileId: folderId,
                resource: { name: neuerName }
            });
        }

        // ── Hilfsfunktion: Liste der zu migrierenden Aliase berechnen ──
        // Geht durch SUBFOLDER_ALIASES aus STAGING_CONFIG und liefert eine flache
        // Liste { altName, neuName } -- ungerichtetes Mapping.
        function getMigrationsRegeln() {
            var cfg = window.STAGING_CONFIG;
            if (!cfg || !cfg.SUBFOLDER_ALIASES) return [];
            var regeln = [];
            for (var neuName in cfg.SUBFOLDER_ALIASES) {
                if (!cfg.SUBFOLDER_ALIASES.hasOwnProperty(neuName)) continue;
                var aliases = cfg.SUBFOLDER_ALIASES[neuName] || [];
                aliases.forEach(function(alt) {
                    regeln.push({ altName: alt, neuName: neuName });
                });
            }
            return regeln;
        }

        // ── PUBLIC: Pruefen, ob Migration fuer eine Baustelle noetig ist ──
        // Liefert: { migrationNoetig: bool, geplant: [{altName, neuName, folderId}],
        //            konflikte: [{altName, neuName}] }
        async function pruefeStagingMigration(baustelleName) {
            assertDriveReady();
            if (!baustelleName) return { migrationNoetig: false, geplant: [], konflikte: [] };
            var rootId;
            try { rootId = await ensureRootFolder(); }
            catch(e) { return { migrationNoetig: false, geplant: [], konflikte: [], fehler: e.message }; }
            var bst = await findFolderByName(baustelleName, rootId);
            if (!bst) return { migrationNoetig: false, geplant: [], konflikte: [] };

            var children = await listChildFolders(bst.id);
            var nachName = {};
            children.forEach(function(c){ nachName[c.name] = c; });

            var regeln = getMigrationsRegeln();
            var geplant = [];
            var konflikte = [];
            regeln.forEach(function(r) {
                var alt = nachName[r.altName];
                var neu = nachName[r.neuName];
                if (alt && !neu) {
                    geplant.push({ altName: r.altName, neuName: r.neuName, folderId: alt.id });
                } else if (alt && neu) {
                    konflikte.push({
                        altName: r.altName,
                        neuName: r.neuName,
                        altFolderId: alt.id,
                        neuFolderId: neu.id
                    });
                }
                // Fall: alt fehlt, neu vorhanden = bereits migriert (kein Eintrag)
                // Fall: beide fehlen = nichts zu tun (kein Eintrag)
            });

            return {
                migrationNoetig: geplant.length > 0 || konflikte.length > 0,
                geplant: geplant,
                konflikte: konflikte,
                baustelleOrdnerId: bst.id
            };
        }

        // ── PUBLIC: Migration ausfuehren ──
        // Benennt die im Plan stehenden Ordner physisch um. Konflikte werden
        // NICHT angetastet -- der Aufrufer muss vorher pruefen und ggf. eine
        // Konflikt-Aufloesung anbieten (z.B. manuelles Verschieben in Drive).
        // onProgress(stand) wird nach jedem Rename aufgerufen mit:
        //   { aktuell: 1, gesamt: 3, name: 'Bilder', neu: 'Fotos', ok: true }
        async function fuehreStagingMigrationAus(baustelleName, options) {
            assertDriveReady();
            options = options || {};
            var onProgress = options.onProgress || function(){};
            var plan = await pruefeStagingMigration(baustelleName);
            if (!plan.migrationNoetig) {
                return { umbenannt: 0, fehler: [], uebersprungen: 0, konflikte: plan.konflikte };
            }

            var ergebnisse = [];
            var fehler = [];
            for (var i = 0; i < plan.geplant.length; i++) {
                var r = plan.geplant[i];
                onProgress({
                    aktuell: i + 1,
                    gesamt: plan.geplant.length,
                    name: r.altName,
                    neu: r.neuName,
                    status: 'aktiv'
                });
                try {
                    await renameFolder(r.folderId, r.neuName);
                    ergebnisse.push(r);
                    onProgress({
                        aktuell: i + 1,
                        gesamt: plan.geplant.length,
                        name: r.altName,
                        neu: r.neuName,
                        status: 'ok'
                    });
                } catch(e) {
                    fehler.push({ altName: r.altName, neuName: r.neuName, fehler: e.message || String(e) });
                    onProgress({
                        aktuell: i + 1,
                        gesamt: plan.geplant.length,
                        name: r.altName,
                        neu: r.neuName,
                        status: 'fehler',
                        fehler: e.message
                    });
                }
            }
            return {
                umbenannt: ergebnisse.length,
                fehler: fehler,
                uebersprungen: plan.konflikte.length,
                konflikte: plan.konflikte,
                ergebnisse: ergebnisse
            };
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
        // Liest alle 5 Unterordner und schreibt pro Datei einen Metadaten-Eintrag
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

            // 1. Staging-Info holen (5 Unterordner mit Drive-IDs)
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
            var subfolderNames = window.STAGING_CONFIG.SUBFOLDERS
                || ['Zeichnungen','Anweisungen','Baustellendaten','Fotos','Stunden'];
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
            // Etappe 4.1, Baustein 8: Drive-Migration (alte Ordnernamen umbenennen)
            pruefeStagingMigration: pruefeStagingMigration,
            fuehreStagingMigrationAus: fuehreStagingMigrationAus
        };

    })();
