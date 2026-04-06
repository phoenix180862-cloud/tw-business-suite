/* ═══════════════════════════════════════════════════════════════
   TW BUSINESS SUITE — INTERFACES (tw-interfaces.js)
   Datenstrukturen und Schemas für alle Module
   
   Die "Verfassung" der App: Solange sich alle Module an diese
   Strukturen halten, passen sie zusammen wie Fliesen im Raster.
   ═══════════════════════════════════════════════════════════════ */

(function(global) {
    'use strict';

    // ─── KUNDE / PROJEKT ─────────────────────────────────────
    
    var KundeSchema = {
        // Minimal-Felder die jedes Modul erwarten kann
        name: '',                  // Projektname / Kundenname
        _driveFolderId: null,      // Google Drive Ordner-ID
        _source: '',               // 'drive' | 'manuell' | 'import'
        _analyseStatus: '',        // 'neu' | 'analysiert' | 'angelegt'
        _savedAt: null,            // ISO Timestamp

        // Kundenstammdaten (aus KI-Analyse Block A)
        auftraggeber: '',
        ag_ansprech: '',
        ag_strasse: '',
        ag_plz: '',
        ag_ort: '',
        ag_telefon: '',
        ag_fax: '',
        ag_email: '',

        // Vertreter Auftraggeber
        ag_vertreter: '',
        ag_vertreter_name: '',
        ag_vertreter_telefon: '',
        ag_vertreter_email: '',

        // Architekt / Planer
        architekt: '',
        arch_ansprech: '',
        arch_strasse: '',
        arch_plz: '',
        arch_ort: '',
        arch_telefon: '',
        arch_fax: '',
        arch_email: '',

        // Bauleitung
        bauleitung: '',
        bl_name: '',
        bl_strasse: '',
        bl_plz: '',
        bl_ort: '',
        bl_telefon: '',
        bl_mobil: '',
        bl_email: '',

        // Bauvorhaben
        bauvorhaben: '',
        bv_adresse: '',
        vergabenummer: '',

        // Ordner-Struktur
        folders: []               // [{ name, id, files: [{ name, id, type }] }]
    };


    // ─── LV-POSITION ─────────────────────────────────────────
    // Kernstruktur die von Aufmaß, Rechnung und Kalkulation genutzt wird

    var PositionSchema = {
        posNr: '',                // z.B. '01.02.030'
        titel: '',                // Kurzbezeichnung
        kurztext: '',             // Detailtext
        menge: 0,                 // Soll-Menge
        einheit: '',              // m², m, Stk, psch
        einzelpreis: null,        // EP netto
        gesamtpreis: null,        // GP netto
        besonderheiten: '',       // Großformat, etc.
        tags: [],                 // ['boden', 'wand', 'abdichtung', ...]
        _quelle: ''               // 'ki-analyse' | 'manuell' | 'import'
    };


    // ─── RAUM ────────────────────────────────────────────────
    // Raumstruktur für Aufmaß und Raumzuordnung

    var RaumSchema = {
        raumNr: '',               // z.B. 'R01'
        bezeichnung: '',          // z.B. 'Bad EG'
        geschoss: '',             // z.B. 'EG', '1.OG'
        bemerkung: '',            // Freitext
        flaechen: {
            boden: 0,
            wand: 0,
            decke: 0
        }
    };


    // ─── KI-AKTE ─────────────────────────────────────────────
    // Konsolidierte Analyseergebnisse (zentrale Datenbasis)

    var KiAkteSchema = {
        meta: {
            analyseZeitpunkt: null,
            anzahlDokumente: 0,
            status: 'pending',     // 'pending' | 'running' | 'completed' | 'error'
            modell: ''             // Gemini-Modell
        },
        positionen: [],            // [PositionSchema]
        raeume: [],                // [RaumSchema]
        zeichnungen: [],           // [{ datei, typ, ordner }]
        nachtraege: [],
        vertrag: {},
        fristen: [],
        warnhinweise: [],
        quelldokumente: []
    };


    // ─── RECHNUNG ────────────────────────────────────────────

    var RechnungSchema = {
        rechnungsNr: '',
        datum: '',
        leistungszeitraum: '',
        typ: '',                   // 'abschlag' | 'schluss' | 'teilschluss'
        positionen: [],            // [{ posNr, bezeichnung, menge, einheit, ep, gp }]
        nettoSumme: 0,
        mwstSatz: 19,
        mwstBetrag: 0,
        bruttoSumme: 0,
        skontoProzent: 0,
        skontoTage: 0,
        zahlungszielTage: 30,
        format: 'pdf'              // 'pdf' | 'zugferd' | 'xrechnung'
    };


    // ─── IMPORT-RESULT ───────────────────────────────────────
    // Standard-Ergebnis das die KI-Analyse zurückgibt

    var ImportResultSchema = {
        positionen: [],            // [PositionSchema]
        raeume: [],                // [RaumSchema]
        zeichnungen: [],
        kundendaten: {},           // KundeSchema-Subset
        quelle: '',                // 'ki-analyse' | 'ordneranalyse' | 'manuell' | 'import'
        quellenInfo: []
    };


    // ─── SCHEMA-VALIDIERUNG ──────────────────────────────────

    function validateAgainstSchema(data, schema, schemaName) {
        var warnings = [];
        Object.keys(schema).forEach(function(key) {
            if (data[key] === undefined) {
                warnings.push('[' + schemaName + '] Fehlendes Feld: ' + key);
            }
        });
        if (warnings.length > 0) {
            console.warn('[TW Interfaces] Schema-Warnung:', warnings);
        }
        return warnings.length === 0;
    }

    // Leeres Objekt nach Schema erstellen
    function createFromSchema(schema) {
        return JSON.parse(JSON.stringify(schema));
    }


    // ─── EXPORT ──────────────────────────────────────────────

    global.TW = global.TW || {};
    global.TW.Schemas = {
        Kunde: KundeSchema,
        Position: PositionSchema,
        Raum: RaumSchema,
        KiAkte: KiAkteSchema,
        Rechnung: RechnungSchema,
        ImportResult: ImportResultSchema,

        validate: validateAgainstSchema,
        create: createFromSchema
    };

    console.log('%c[TW Business Suite] Interfaces geladen', 'color: #27ae60; font-weight: bold;');

})(window);
