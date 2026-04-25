/* =====================================================================
   TW BUSINESS SUITE -- SCHEMA-REGISTRY (tw-schema.js)
   Stand: 25.04.2026

   ZWECK:
   Zentrale Stelle, an der die Felder aller IndexedDB-Stores definiert
   sind. Erlaubt:
     - Validierung von Records VOR dem Save (Pflichtfelder, Typen)
     - DB-Migrations-Steuerung anhand der Schema-Versionen
     - Klare Doku, welcher Store welche Felder hat
     - Auto-Anreicherung mit Defaults (z.B. updatedAt)

   NUTZUNG:
     window.TWSchema.validate('fotos', record)   -> {ok: bool, errors: []}
     window.TWSchema.enrich('fotos', record)     -> record mit Defaults
     window.TWSchema.getSchema('fotos')          -> Schema-Definition
     window.TWSchema.listStores()                -> alle Store-Namen

   WICHTIG: Dieses Schema ist DEKLARATIV. Es ersetzt nicht die Logik in
   tw-storage.js, sondern macht sie verlaesslicher.
   ===================================================================== */

(function(global) {
    'use strict';

    // -----------------------------------------------------------------
    // SCHEMA-DEFINITIONEN
    // -----------------------------------------------------------------
    // Jedes Schema hat:
    //   - keyPath:  Primaerschluessel-Feld
    //   - required: Pflichtfelder beim Save
    //   - optional: optionale Felder
    //   - indices:  Felder die als IndexedDB-Index angelegt werden
    //   - version:  Schema-Version (steigt bei Aenderungen)
    //   - notes:    Freitext fuer Doku
    // -----------------------------------------------------------------
    var SCHEMAS = {

        kunden: {
            keyPath: 'id',
            required: ['id'],
            optional: ['name', 'bauvorhaben', '_driveFolderId', 'updatedAt',
                       'ag_email', 'bl_email', 'arch_email', 'adresse'],
            indices: ['name', 'updatedAt'],
            version: 1,
            notes: 'Kundenstammdaten. id ist meist die Drive-Folder-ID.'
        },

        aufmass: {
            keyPath: 'id',
            required: ['id', 'kundeId'],
            optional: ['raumKey', 'wandMasse', 'tueren', 'fenster',
                       'sonstigeBauteile', 'positionen', 'updatedAt'],
            indices: ['kundeId', 'updatedAt'],
            version: 1,
            notes: 'Aufmass-Datensaetze pro Raum.'
        },

        rechnungen: {
            keyPath: 'id',
            required: ['id', 'kundeId'],
            optional: ['rechnungNr', 'rechnungsTyp', 'positionen', 'summe',
                       'updatedAt', 'driveFileId'],
            indices: ['kundeId', 'updatedAt'],
            version: 1,
            notes: 'Rechnungsdaten. driveFileId verweist auf das PDF in Drive.'
        },

        raeume: {
            keyPath: 'id',
            required: ['id', 'kundeId'],
            optional: ['name', 'nr', 'bezeichnung', 'positionen', 'updatedAt'],
            indices: ['kundeId', 'updatedAt'],
            version: 1,
            notes: 'Raeume eines Kunden.'
        },

        gesamtlisten: {
            keyPath: 'id',
            required: ['id', 'kundeId'],
            optional: ['positionen', 'updatedAt'],
            indices: ['kundeId', 'updatedAt'],
            version: 1,
            notes: 'Komplette Positionsliste pro Kunde. id == kundeId.'
        },

        positionen: {
            keyPath: 'id',
            required: ['id', 'kundeId'],
            optional: ['posNr', 'menge', 'einheit', 'beschreibung',
                       'einzelpreis', 'gesamtpreis', 'updatedAt'],
            indices: ['kundeId', 'updatedAt'],
            version: 1,
            notes: 'Einzelpositionen, frei zuordenbar.'
        },

        positionsListen: {
            keyPath: 'id',
            required: ['id', 'kundeId'],
            optional: ['bezeichner', 'raumKey', 'positionen', 'updatedAt'],
            indices: ['kundeId', 'bezeichner', 'updatedAt'],
            version: 1,
            notes: 'Wiederverwendbare Positionslisten je Raumtyp.'
        },

        schriftverkehr: {
            keyPath: 'id',
            required: ['id', 'kundeId'],
            optional: ['docId', 'betreff', 'empfaenger', 'datum',
                       'kanal', 'pdfBlob', 'driveFileId', 'updatedAt'],
            indices: ['kundeId', 'updatedAt'],
            version: 1,
            notes: 'Briefe und Mails. driveFileId verweist auf Drive-PDF.'
        },

        kiAkten: {
            keyPath: 'id',
            required: ['id', 'kundeId'],
            optional: ['positionen', 'nachtraege', 'fristen',
                       'warnhinweise', 'quellen', 'updatedAt'],
            indices: ['kundeId', 'updatedAt'],
            version: 1,
            notes: 'KI-Analyse-Ergebnisse je Kunde. id == kundeId.'
        },

        driveCache: {
            keyPath: 'id',
            required: ['id', 'type'],
            optional: ['data', 'updatedAt'],
            indices: ['type', 'updatedAt'],
            version: 1,
            notes: 'Gecachte Drive-Inhalte (Importresult etc.)'
        },

        appState: {
            keyPath: 'key',
            required: ['key'],
            optional: ['value', 'updatedAt'],
            indices: [],
            version: 1,
            notes: 'Generischer App-State (lastKundeId, lastSync_*, etc.)'
        },

        meta: {
            keyPath: 'key',
            required: ['key'],
            optional: ['value', 'timestamp', 'updatedAt'],
            indices: [],
            version: 1,
            notes: 'DB-Metadaten (Schema-Version, Init-Marker etc.)'
        },

        driveOrdner: {
            keyPath: 'id',
            required: ['id', 'kundeId'],
            optional: ['name', 'parentId', 'updatedAt'],
            indices: ['kundeId', 'parentId', 'updatedAt'],
            version: 1,
            notes: 'Gespiegelte Drive-Ordnerstruktur (lokal).'
        },

        driveDateien: {
            keyPath: 'id',
            required: ['id', 'kundeId'],
            optional: ['ordnerId', 'name', 'mimeType', 'fileType',
                       'blob', 'size', 'modifiedTime', 'updatedAt'],
            indices: ['kundeId', 'ordnerId', 'fileType', 'updatedAt'],
            version: 1,
            notes: 'Heruntergeladene Drive-Dateien als Blobs (Cache).'
        },

        appDateien: {
            keyPath: 'id',
            required: ['id', 'kundeId', 'ordnerName', 'name'],
            optional: ['mimeType', 'data', 'docType', 'syncStatus',
                       'syncedAt', 'deviceId', 'updatedAt'],
            indices: ['kundeId', 'ordnerName', 'docType', 'updatedAt', 'deviceId'],
            version: 1,
            notes: 'Von der App erzeugte Dateien (PDFs, Snapshots). syncStatus: pending|synced|error.'
        },

        syncLog: {
            keyPath: 'id',
            required: ['id', 'kundeId', 'action'],
            optional: ['storeName', 'recordId', 'details', 'deviceId',
                       'timestamp', 'syncedAt', 'updatedAt'],
            indices: ['kundeId', 'action', 'deviceId', 'syncedAt', 'updatedAt'],
            version: 1,
            notes: 'Audit-Trail aller Schreiboperationen.'
        },

        wip: {
            keyPath: 'id',
            required: ['id', 'kundeId', 'modulName'],
            optional: ['moduleState', 'page', 'meta', 'savedAt',
                       'deviceId', 'updatedAt'],
            indices: ['kundeId', 'modulName', 'savedAt', 'deviceId'],
            version: 1,
            notes: 'Work-in-Progress / Autosave. id == "wip_" + kundeId + "_" + modulName.'
        },

        ausgangsbuch: {
            keyPath: 'id',
            required: ['id', 'kundeId'],
            optional: ['nr', 'datum', 'empfaenger', 'betreff',
                       'status', 'updatedAt'],
            indices: ['kundeId', 'status', 'datum', 'updatedAt'],
            version: 1,
            notes: 'Ausgangsbuch-Eintraege.'
        },

        fotos: {
            keyPath: 'id',
            required: ['id', 'kundeId', 'kontext'],
            optional: ['raumKey', 'subKey', 'blob', 'meta', 'size',
                       'driveUploaded', 'driveFileId', 'createdAt',
                       'updatedAt'],
            indices: ['kundeId', 'kontext', 'raumKey', 'driveUploaded',
                      'createdAt', 'updatedAt'],
            version: 2,
            notes: 'Foto-Store (Blobs). v2 ergaenzt Kontext-Index.'
        }
    };

    // -----------------------------------------------------------------
    // HILFSFUNKTIONEN
    // -----------------------------------------------------------------
    function getSchema(storeName) {
        return SCHEMAS[storeName] || null;
    }

    function listStores() {
        return Object.keys(SCHEMAS);
    }

    // -----------------------------------------------------------------
    // VALIDATOR
    // Prueft, ob alle Pflichtfelder gesetzt sind.
    // Liefert {ok: bool, errors: [string]} zurueck.
    // -----------------------------------------------------------------
    function validate(storeName, record) {
        var schema = SCHEMAS[storeName];
        if (!schema) {
            return { ok: false, errors: ['Unbekannter Store: ' + storeName] };
        }
        if (!record || typeof record !== 'object') {
            return { ok: false, errors: ['Record fehlt oder ist kein Objekt'] };
        }
        var errors = [];
        for (var i = 0; i < schema.required.length; i++) {
            var field = schema.required[i];
            var v = record[field];
            // null und undefined und leerer String gelten als fehlend
            if (v === undefined || v === null || v === '') {
                errors.push('Pflichtfeld "' + field + '" fehlt in Store "' + storeName + '"');
            }
        }
        return { ok: errors.length === 0, errors: errors };
    }

    // -----------------------------------------------------------------
    // ENRICH
    // Reichert einen Record mit Defaults an (updatedAt etc.).
    // -----------------------------------------------------------------
    function enrich(storeName, record) {
        var schema = SCHEMAS[storeName];
        if (!schema || !record) return record;
        var out = Object.assign({}, record);
        if (schema.optional.indexOf('updatedAt') >= 0 && !out.updatedAt) {
            out.updatedAt = new Date().toISOString();
        }
        if (schema.optional.indexOf('createdAt') >= 0 && !out.createdAt) {
            out.createdAt = new Date().toISOString();
        }
        return out;
    }

    // -----------------------------------------------------------------
    // SCHEMA-VERSION-VERGLEICH
    // Liefert eine Liste aller Stores, deren Version sich seit
    // einem bestimmten Stand aendern soll. Wird vom DB-Migrator genutzt.
    // -----------------------------------------------------------------
    function getStoresAtVersion(targetVersion) {
        var result = [];
        Object.keys(SCHEMAS).forEach(function(name) {
            if (SCHEMAS[name].version === targetVersion) {
                result.push(name);
            }
        });
        return result;
    }

    // -----------------------------------------------------------------
    // DIAGNOSE
    // Zaehlt alle Schemas, durchschnittliche Felderzahl, Indices etc.
    // Wird vom Storage-Health-Dashboard genutzt.
    // -----------------------------------------------------------------
    function getDiagnostics() {
        var stores = Object.keys(SCHEMAS);
        var totalRequired = 0, totalOptional = 0, totalIndices = 0;
        stores.forEach(function(s) {
            totalRequired += SCHEMAS[s].required.length;
            totalOptional += SCHEMAS[s].optional.length;
            totalIndices  += SCHEMAS[s].indices.length;
        });
        return {
            storeCount: stores.length,
            totalRequiredFields: totalRequired,
            totalOptionalFields: totalOptional,
            totalIndices: totalIndices,
            stores: stores
        };
    }

    // -----------------------------------------------------------------
    // PUBLIC API
    // -----------------------------------------------------------------
    global.TWSchema = {
        getSchema:          getSchema,
        listStores:         listStores,
        validate:           validate,
        enrich:             enrich,
        getStoresAtVersion: getStoresAtVersion,
        getDiagnostics:     getDiagnostics,
        SCHEMAS:            SCHEMAS  // read-only Zugriff fuer Doku
    };

    console.log('%c[TW-Schema] Schema-Registry bereit (' +
                Object.keys(SCHEMAS).length + ' Stores)',
                'color: #1976D2; font-weight: bold;');

})(window);
