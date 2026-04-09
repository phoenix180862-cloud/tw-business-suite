    // ═══════════════════════════════════════════════════════════════
    // TW BUSINESS SUITE — KUNDEN-DATEN PARSER
    // Deterministischer Excel-Parser fuer die 3 vorbereiteten Listen
    // Pfad: Google Drive > Baustellen neu > [Kunde] > Kunden-Daten
    // Listen: 1) Kundenstammdaten, 2) LV-Positionen, 3) Raumliste
    // KEINE KI erforderlich — 100% regelbasiert
    // ═══════════════════════════════════════════════════════════════

    window.KundenDatenParser = {

        // ── Ordnername-Erkennung (Case-insensitive, mit/ohne Bindestrich) ──
        FOLDER_PATTERNS: ['kunden-daten', 'kundendaten', 'kunden_daten'],

        isKundenDatenFolder: function(folderName) {
            var lower = (folderName || '').toLowerCase().trim();
            for (var i = 0; i < this.FOLDER_PATTERNS.length; i++) {
                if (lower.indexOf(this.FOLDER_PATTERNS[i]) >= 0) return true;
            }
            return false;
        },

        // ── Datei-Typ anhand des Dateinamens erkennen ──
        classifyFile: function(fileName) {
            var lower = (fileName || '').toLowerCase();
            if (lower.indexOf('liste1') >= 0 || lower.indexOf('kundenstamm') >= 0) return 'stammdaten';
            if (lower.indexOf('liste2') >= 0 || lower.indexOf('lv-position') >= 0 || lower.indexOf('lv_position') >= 0) return 'positionen';
            if (lower.indexOf('liste3') >= 0 || lower.indexOf('raumliste') >= 0 || lower.indexOf('raum') >= 0) return 'raeume';
            return 'unbekannt';
        },

        // ══════════════════════════════════════════════════
        // HAUPTFUNKTION: Alle 3 Listen parsen
        // Input: Array von { name, blob } Objekten
        // Output: Strukturiertes Ergebnis fuer alle Module
        // ══════════════════════════════════════════════════
        parseAlleListenAsync: function(dateien, onProgress) {
            var self = this;
            return new Promise(function(resolve) {
                var ergebnis = {
                    stammdaten: null,
                    positionen: [],
                    nachtraege: [],
                    raeume: [],
                    meta: {
                        parseZeitpunkt: new Date().toISOString(),
                        dateienGeladen: dateien.length,
                        dateienGeparst: 0,
                        fehler: [],
                        quelle: 'kunden-daten-parser'
                    }
                };

                var pending = dateien.length;
                if (pending === 0) { resolve(ergebnis); return; }

                dateien.forEach(function(datei, idx) {
                    if (datei.error || !datei.blob) {
                        ergebnis.meta.fehler.push(datei.name + ': ' + (datei.error || 'Kein Blob'));
                        pending--;
                        if (pending === 0) resolve(ergebnis);
                        return;
                    }

                    var typ = self.classifyFile(datei.name);
                    if (onProgress) onProgress('Parse ' + (idx+1) + '/' + dateien.length + ': ' + datei.name + ' (' + typ + ')');

                    var reader = new FileReader();
                    reader.onload = function(e) {
                        try {
                            var data = new Uint8Array(e.target.result);
                            var workbook = XLSX.read(data, { type: 'array' });

                            if (typ === 'stammdaten') {
                                ergebnis.stammdaten = self.parseStammdaten(workbook);
                                ergebnis.meta.dateienGeparst++;
                            } else if (typ === 'positionen') {
                                var posResult = self.parsePositionen(workbook);
                                ergebnis.positionen = posResult.positionen;
                                ergebnis.nachtraege = posResult.nachtraege;
                                ergebnis.meta.dateienGeparst++;
                                ergebnis.meta.gesamtNetto = posResult.gesamtNetto;
                                ergebnis.meta.originalLvNetto = posResult.originalLvNetto;
                                ergebnis.meta.nachtraegeNetto = posResult.nachtraegeNetto;
                            } else if (typ === 'raeume') {
                                ergebnis.raeume = self.parseRaeume(workbook);
                                ergebnis.meta.dateienGeparst++;
                            } else {
                                ergebnis.meta.fehler.push(datei.name + ': Typ nicht erkannt');
                            }
                        } catch(err) {
                            console.error('Parse-Fehler bei ' + datei.name + ':', err);
                            ergebnis.meta.fehler.push(datei.name + ': ' + err.message);
                        }
                        pending--;
                        if (pending === 0) resolve(ergebnis);
                    };
                    reader.onerror = function() {
                        ergebnis.meta.fehler.push(datei.name + ': Lesefehler');
                        pending--;
                        if (pending === 0) resolve(ergebnis);
                    };
                    reader.readAsArrayBuffer(datei.blob);
                });
            });
        },

        // ══════════════════════════════════════════════════
        // LISTE 1: KUNDENSTAMMDATEN
        // Format: Key-Value Paare in Spalte A+B
        // Sektionen: Bauherr, Bauleiter, Architekt, Objektdaten, Planungsbeteiligte
        // ══════════════════════════════════════════════════
        parseStammdaten: function(workbook) {
            var sheet = workbook.Sheets[workbook.SheetNames[0]];
            var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            var result = {
                projekt: '',
                bauherr: { firma: '', vertreter: '', referat: '', strasse: '', plz: '', ort: '', ansprechpartner: '', telefon: '', mobil: '', fax: '', email: '' },
                bauleiter: { name: '', firma: '', referat: '', strasse: '', plzOrt: '', telefon: '', mobil: '', fax: '', email: '', weitereAnsprechpartner: [] },
                architekt: { buero: '', inhaber: '', projektbearbeiter: '', strasse: '', plz: '', ort: '', telefon: '', mobil: '', fax: '', emailInhaber: '', emailBearbeiter: '' },
                objektdaten: { bauvorhaben: '', gewerk: '', baustelleStrasse: '', baustellePlzOrt: '', projektNr: '', vergabeNr: '', auftragsNr: '', vergabeart: '', auftragsdatum: '', ausfuehrungsbeginn: '', ausfuehrungsende: '', abnahmedatum: '', auftragssummeNetto: '', mwst: '', auftragssummeBrutto: '', nachlass: '', zahlungsbedingungen: '' },
                planungsbeteiligte: []
            };

            var sektion = '';
            for (var i = 0; i < rows.length; i++) {
                var key = String(rows[i][0] || '').trim();
                var val = String(rows[i][1] || '').trim();
                var keyLower = key.toLowerCase();

                // Projekt-Zeile
                if (keyLower.indexOf('projekt:') === 0) {
                    result.projekt = key.replace(/^projekt:\s*/i, '');
                    continue;
                }

                // Sektions-Header erkennen (beide Formate: mit/ohne BLOCK-Prefix, mit/ohne Unicode-Pfeile)
                var cleanKey = keyLower.replace(/^.*block\s*\d+\s*:\s*/i, '').replace(/^[^a-z]*/i, '').trim();
                if (cleanKey.match(/auftraggeber|bauherr/)) { sektion = 'bauherr'; continue; }
                if (cleanKey.match(/bauleitung|bauleiter|bau.berwachung|bauaufsicht/)) { sektion = 'bauleiter'; continue; }
                if (cleanKey.match(/architekt|planer/) && !val) { sektion = 'architekt'; continue; }
                if (cleanKey.match(/auftragnehmer.*willwacher|willwacher.*auftragnehmer/i)) { sektion = 'auftragnehmer'; continue; }
                if (cleanKey.match(/objektdaten|projektdaten|projektkennzahlen/)) { sektion = 'objektdaten'; continue; }
                if (cleanKey.match(/ausf.hrungsfrist|vertragskonditionen/)) { sektion = 'objektdaten'; continue; }
                if (cleanKey.match(/auftragssumm|zahlungsbedingungen/) && !val) { sektion = 'objektdaten'; continue; }
                if (cleanKey.match(/leistungsumfang/)) { sektion = 'leistungsumfang'; continue; }
                if (cleanKey.match(/materialangebot/)) { sektion = 'material'; continue; }
                if (cleanKey.match(/weitere planungsbeteiligte|rechts.*nachpr|nachpr.fstelle/)) { sektion = 'planungsbeteiligte'; continue; }

                if (!val) continue;

                // Je nach Sektion zuordnen
                if (sektion === 'bauherr') {
                    if (keyLower.match(/^firma|^name/)) result.bauherr.firma = val;
                    else if (keyLower.match(/vertreten/)) result.bauherr.vertreter = val;
                    else if (keyLower.match(/referat/)) result.bauherr.referat = val;
                    else if (keyLower.match(/stra/) && !keyLower.match(/plz/)) result.bauherr.strasse = val;
                    else if (keyLower.match(/plz.*ort/)) { result.bauherr.plzOrt = val; var parts = val.match(/^(\d+)\s+(.+)/); if (parts) { result.bauherr.plz = parts[1]; result.bauherr.ort = parts[2]; } }
                    else if (keyLower === 'plz') result.bauherr.plz = val;
                    else if (keyLower === 'ort') result.bauherr.ort = val;
                    else if (keyLower.match(/ansprechpartner/)) result.bauherr.ansprechpartner = val;
                    else if (keyLower.match(/telefon/)) result.bauherr.telefon = val;
                    else if (keyLower.match(/mobil/)) result.bauherr.mobil = val;
                    else if (keyLower.match(/fax/)) result.bauherr.fax = val;
                    else if (keyLower.match(/e-?mail/)) result.bauherr.email = val;
                    else if (keyLower.match(/leitweg/)) result.bauherr.leitwegId = val;
                }
                else if (sektion === 'bauleiter') {
                    if (keyLower === 'name' || keyLower.match(/^firma.*name/)) {
                        if (!result.bauleiter.firma) result.bauleiter.firma = val;
                        else if (!result.bauleiter.name) result.bauleiter.name = val;
                    }
                    else if (keyLower.match(/^funktion/)) result.bauleiter.funktion = val;
                    else if (keyLower.match(/firma|dienststelle/) && !keyLower.match(/^firma.*name/)) result.bauleiter.firma = val;
                    else if (keyLower.match(/referat/)) result.bauleiter.referat = val;
                    else if (keyLower.match(/stra/)) result.bauleiter.strasse = val;
                    else if (keyLower.match(/plz/)) result.bauleiter.plzOrt = val;
                    else if (keyLower.match(/ansprechpartner/)) result.bauleiter.name = val;
                    else if (keyLower.match(/telefon/)) result.bauleiter.telefon = val;
                    else if (keyLower.match(/mobil/)) result.bauleiter.mobil = val;
                    else if (keyLower.match(/fax/)) result.bauleiter.fax = val;
                    else if (keyLower.match(/e-?mail/)) result.bauleiter.email = val;
                    else if (keyLower.match(/weitere/)) result.bauleiter.weitereAnsprechpartner.push(val);
                }
                else if (sektion === 'architekt') {
                    if (keyLower.match(/b.ro|firma/)) result.architekt.buero = val;
                    else if (keyLower.match(/inhaber/)) result.architekt.inhaber = val;
                    else if (keyLower.match(/projektbearbeiter/)) result.architekt.projektbearbeiter = val;
                    else if (keyLower.match(/stra/)) result.architekt.strasse = val;
                    else if (keyLower === 'plz') result.architekt.plz = val;
                    else if (keyLower === 'ort') result.architekt.ort = val;
                    else if (keyLower.match(/telefon.*b.ro|b.ro.*telefon/)) result.architekt.telefon = val;
                    else if (keyLower.match(/telefon/) && !result.architekt.telefon) result.architekt.telefon = val;
                    else if (keyLower.match(/mobil/)) result.architekt.mobil = val;
                    else if (keyLower.match(/fax/)) result.architekt.fax = val;
                    else if (keyLower.match(/e-?mail/) && keyLower.match(/hessel|inhaber/)) result.architekt.emailInhaber = val;
                    else if (keyLower.match(/e-?mail/) && keyLower.match(/winandy|bearbeiter/)) result.architekt.emailBearbeiter = val;
                    else if (keyLower.match(/e-?mail/) && !result.architekt.emailInhaber) result.architekt.emailInhaber = val;
                    else if (keyLower.match(/e-?mail/) && !result.architekt.emailBearbeiter) result.architekt.emailBearbeiter = val;
                }
                else if (sektion === 'objektdaten') {
                    if (keyLower.match(/bauvorhaben|bezeichnung/)) result.objektdaten.bauvorhaben = val;
                    else if (keyLower === 'gewerk' || keyLower.match(/leistungsart/)) result.objektdaten.gewerk = val;
                    else if (keyLower.match(/baustellenadresse.*stra|baustellenstra/)) result.objektdaten.baustelleStrasse = val;
                    else if (keyLower.match(/baustelle.*plz|plz.*ort.*baustelle/)) result.objektdaten.baustellePlzOrt = val;
                    else if (keyLower.match(/projekt-?nr/)) result.objektdaten.projektNr = val;
                    else if (keyLower.match(/vergabe-?nr|vergabenummer/)) result.objektdaten.vergabeNr = val;
                    else if (keyLower.match(/auftrags-?nr|auftrags.*nummer|ma.nahmen.*nummer/)) result.objektdaten.auftragsNr = val;
                    else if (keyLower.match(/vergabeart/)) result.objektdaten.vergabeart = val;
                    else if (keyLower.match(/auftragsdatum/)) result.objektdaten.auftragsdatum = val;
                    else if (keyLower.match(/ausf.hrungsbeginn/)) result.objektdaten.ausfuehrungsbeginn = val;
                    else if (keyLower.match(/ausf.hrungsende|fertigstellung/)) result.objektdaten.ausfuehrungsende = val;
                    else if (keyLower.match(/abnahme/)) result.objektdaten.abnahmedatum = val;
                    else if (keyLower.match(/angebots.*summe.*netto|auftragssumme.*netto/)) result.objektdaten.auftragssummeNetto = val;
                    else if (keyLower.match(/angebots.*summe.*brutto|auftragssumme.*brutto/)) result.objektdaten.auftragssummeBrutto = val;
                    else if (keyLower.match(/mwst|mehrwert/)) result.objektdaten.mwst = val;
                    else if (keyLower.match(/nachlass|preisnachlass/)) result.objektdaten.nachlass = val;
                    else if (keyLower.match(/zahlungs/)) result.objektdaten.zahlungsbedingungen = val;
                    else if (keyLower.match(/gew.hrleistung/)) result.objektdaten.gewaehrleistung = val;
                    else if (keyLower.match(/objekt/) && !result.objektdaten.bauvorhaben) result.objektdaten.bauvorhaben = val;
                }
                else if (sektion === 'planungsbeteiligte') {
                    if (val) result.planungsbeteiligte.push({ rolle: key, details: val });
                }
            }

            console.log('Stammdaten geparst:', result);
            return result;
        },

        // ══════════════════════════════════════════════════
        // LISTE 2: LV-POSITIONEN + NACHTRAEGE
        // Format: 6 Spalten (Pos-Nr, Menge, Einheit, Beschreibung, EP, GP)
        // Header in Zeile 7, Daten ab Zeile 8
        // Bloecke: Original-LV (1.xx, 2.xx, 3.xx) + Nachtraege (N1, N2, ...)
        // ══════════════════════════════════════════════════
        parsePositionen: function(workbook) {
            var sheet = workbook.Sheets[workbook.SheetNames[0]];
            var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            var positionen = [];
            var nachtraege = [];
            var aktuellerTitel = '';
            var istNachtrag = false;
            var nachtragBlock = '';
            var originalLvNetto = 0;
            var nachtraegeNetto = 0;

            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var colA = String(row[0] || '').trim();
                var colB = row[1];
                var colC = String(row[2] || '').trim();
                var colD = String(row[3] || '').trim();
                var colE = row[4];
                var colF = row[5];

                // Header-Zeile ueberspringen
                if (colA === 'Pos.-Nr.' || colA === 'Pos-Nr.') continue;

                // Nachtrags-Marker erkennen
                if (colA.indexOf('NACHTR') >= 0 || colA.indexOf('Nachtr') >= 0 || colA.indexOf('nachtr') >= 0) {
                    istNachtrag = true;
                    continue;
                }

                // Block-Header / Nachtrag-Header erkennen
                if (colA.match(/^Nachtrag\s+\d/i)) {
                    istNachtrag = true;
                    nachtragBlock = colA;
                    continue;
                }

                // Titel-Zeilen erkennen (z.B. "Titel 1 - Bodenfliesen")
                if (colA.match(/^Titel\s+\d/i)) {
                    aktuellerTitel = colA;
                    continue;
                }

                // Zwischensummen und Uebersichtszeilen ueberspringen
                if (colA.match(/^Zwischensumme|^ZWISCHENSUMME|^GESAMT|^zzgl|^Original-LV|^Nachtr.ge netto/i)) {
                    // Aber Gesamtwerte extrahieren
                    if (colA.match(/ZWISCHENSUMME ORIGINAL-LV/i) && colF) {
                        originalLvNetto = parseFloat(colF) || 0;
                    }
                    if (colA.match(/ZWISCHENSUMME ALLE NACHTR/i) && colF) {
                        nachtraegeNetto = parseFloat(colF) || 0;
                    }
                    continue;
                }

                // Block-1 Header ueberspringen
                if (colA.match(/^.+BLOCK\s+\d/i)) continue;

                // Leere Zeilen / reine Text-Zeilen ueberspringen
                if (!colA || colB === '' || colB === undefined || colB === null) continue;
                if (typeof colB !== 'number' && !String(colB).match(/^[\d.,]+$/)) continue;

                // ═══ POSITION GEFUNDEN ═══
                var menge = typeof colB === 'number' ? colB : parseFloat(String(colB).replace(',', '.')) || 0;
                // EP: Nur numerische Werte, Formeln (=...) ignorieren
                var epRaw = colE;
                var ep = 0;
                if (typeof epRaw === 'number') { ep = epRaw; }
                else if (epRaw && typeof epRaw === 'string' && epRaw.charAt(0) !== '=') { ep = parseFloat(epRaw.replace(',', '.')) || 0; }
                // GP: Nur numerische Werte, Formeln ignorieren, sonst berechnen
                var gpRaw = colF;
                var gp = 0;
                if (typeof gpRaw === 'number') { gp = gpRaw; }
                else if (gpRaw && typeof gpRaw === 'string' && gpRaw.charAt(0) !== '=') { gp = parseFloat(gpRaw.replace(',', '.')) || 0; }
                if (gp === 0 && ep > 0 && menge > 0) { gp = Math.round(menge * ep * 100) / 100; }

                var pos = {
                    pos: colA,
                    bez: colD,
                    einheit: colC || 'm\u00b2',
                    menge: menge,
                    einzelpreis: ep,
                    gesamtpreis: gp,
                    titel: aktuellerTitel,
                    bereich: '',
                    kategorie: '',
                    tags: [],
                    _epPreis: ep || null,
                    _gpPreis: gp || null
                };

                // Auto-Kategorisierung
                var bezLower = colD.toLowerCase();
                if (bezLower.match(/boden/)) pos.kategorie = 'Boden';
                else if (bezLower.match(/wand/)) pos.kategorie = 'Wand';
                else if (bezLower.match(/sockel/)) pos.kategorie = 'Sockel';
                else if (bezLower.match(/abdicht/)) pos.kategorie = 'Abdichtung';
                else if (bezLower.match(/profil|schiene|dilex/i)) pos.kategorie = 'Profile';
                else if (bezLower.match(/fuge|silikon/)) pos.kategorie = 'Fugen';
                else if (bezLower.match(/spiegel/)) pos.kategorie = 'Spiegel';
                else if (bezLower.match(/heiz/)) pos.kategorie = 'Heizung';
                else if (bezLower.match(/reinstreif|matte/)) pos.kategorie = 'Sonderbauteile';
                else if (bezLower.match(/stundenlohn|facharbeiter|bauhelfer/)) pos.kategorie = 'Stundenlohn';
                else if (bezLower.match(/reserve/)) pos.kategorie = 'Reserve';
                else if (bezLower.match(/zulage/)) pos.kategorie = 'Zulage';
                else if (bezLower.match(/dichtband/)) pos.kategorie = 'Abdichtung';

                // Tags generieren
                if (bezLower.match(/gro.format|60.60|60x60/)) pos.tags.push('Grossformat');
                if (bezLower.match(/r10|r9|r11/i)) pos.tags.push(bezLower.match(/r10/i) ? 'R10' : bezLower.match(/r9/i) ? 'R9' : 'R11');
                if (bezLower.match(/din\s*18534|din\s*18352/i)) pos.tags.push('DIN-Norm');
                if (bezLower.match(/edelstahl/i)) pos.tags.push('Edelstahl');
                if (bezLower.match(/agrob|buchtal|gepadi/i)) pos.tags.push('Markenfliese');

                if (istNachtrag || colA.match(/^N\d/)) {
                    pos.istNachtrag = true;
                    pos.nachtragBlock = nachtragBlock;
                    nachtraege.push(pos);
                } else {
                    positionen.push(pos);
                }
            }

            var gesamtNetto = originalLvNetto + nachtraegeNetto;
            console.log('LV-Positionen geparst:', positionen.length, 'Original +', nachtraege.length, 'Nachtraege, Gesamt:', gesamtNetto, 'EUR');

            return {
                positionen: positionen,
                nachtraege: nachtraege,
                originalLvNetto: originalLvNetto,
                nachtraegeNetto: nachtraegeNetto,
                gesamtNetto: gesamtNetto
            };
        },

        // ══════════════════════════════════════════════════
        // LISTE 3: RAUMLISTE
        // Format: 6 Spalten (Raum-Nr, Bezeichnung, Geschoss, Flaeche, Fliesen, Bemerkung)
        // Header in Zeile 7, Daten ab Zeile 8
        // ══════════════════════════════════════════════════
        parseRaeume: function(workbook) {
            var sheet = workbook.Sheets[workbook.SheetNames[0]];
            var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            var raeume = [];
            var aktuellerBereich = '';

            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var colA = String(row[0] || '').trim();
                var colB = String(row[1] || '').trim();
                var colC = String(row[2] || '').trim();
                var colD = row[3];
                var colE = String(row[4] || '').trim();
                var colF = String(row[5] || '').trim();

                // Header ueberspringen (Zeile 7 oder 8)
                if (colA === 'Raum-Nr.' || colA === 'Raum-Nr') continue;
                // Firmen-Header ueberspringen
                if (colA.match(/^Thomas Willwacher|^Flurweg|^RAUMLISTE|^Projekt:|^Objekt:/i)) continue;
                // Legende/Hinweise ueberspringen
                if (colA.match(/^LEGENDE|^GESAMTFL|^\u2022|^Quelle:|^R.ume mit|^R.ume ohne|^R.ume unklar|LV-FL/i)) continue;
                if (colA.match(/^Stand:|^Datum:/i)) continue;
                // Emoji-Legende ueberspringen
                if (colA.match(/^\uD83D\uDFE2|^\u2705|^\u2B1C|^\u2753|Fliesen JA|Fliesen NEIN/)) continue;

                // Bereichs-Header erkennen (nur Spalte A, kein Geschoss in C)
                if (colA && !colC && !colE && colA.length > 10 && !colA.match(/^\w\.\d|^\w+-\d/)) {
                    aktuellerBereich = colA.replace(/^[^a-zA-Z]*/, '').trim();
                    continue;
                }

                // Leere Zeilen
                if (!colA) continue;

                // Fliesen-Erkennung: flexibel (Ja, ✅ JA, ja, JA, etc.)
                var fliesenRaw = colE.toLowerCase().replace(/[^a-z]/g, '');
                var hatFliesen = fliesenRaw === 'ja';
                var istUnklar = colE.match(/unklar|\u2753|\?/i);

                // Nur Zeilen mit Fliesen-Kennzeichnung oder unklar
                if (!hatFliesen && !istUnklar) continue;

                // ═══ RAUM GEFUNDEN ═══
                var raumNrClean = colA.replace(/\s*\/\s*.+$/, '').trim(); // "E.001 / Windfang" -> "E.001"
                var raumBez = colA.replace(/^[\w.]+\s*\/\s*/, '').trim(); // "E.001 / Windfang" -> "Windfang"
                if (colB) raumBez = colB; // Falls Bezeichnung in Spalte B

                var flaeche = 0;
                if (typeof colD === 'number') flaeche = colD;
                else if (colD) flaeche = parseFloat(String(colD).replace(',', '.')) || 0;

                // Umfang aus Bemerkung extrahieren
                var umfang = 0;
                var umfangMatch = colF.match(/Umfang:\s*([\d.,]+)\s*m/i);
                if (umfangMatch) umfang = parseFloat(umfangMatch[1].replace(',', '.')) || 0;

                // Lichte Raumhoehe aus Bemerkung
                var raumhoehe = 0;
                var lrhMatch = colF.match(/LRH:\s*([\d.,]+)\s*m/i);
                if (lrhMatch) raumhoehe = parseFloat(lrhMatch[1].replace(',', '.')) || 0;

                // Positionen aus Bemerkung extrahieren
                var posRefs = [];
                var posMatches = colF.match(/Pos\.\s*[\d.]+/gi);
                if (posMatches) {
                    posMatches.forEach(function(m) {
                        posRefs.push(m.replace(/^Pos\.\s*/i, ''));
                    });
                }
                // Nachtrags-Referenzen
                var nRefMatches = colF.match(/N\d+/g);
                if (nRefMatches) posRefs = posRefs.concat(nRefMatches);

                raeume.push({
                    nr: raumNrClean,
                    bez: raumBez,
                    geschoss: colC.toUpperCase(),
                    flaeche: flaeche,
                    umfang: umfang,
                    raumhoehe: raumhoehe,
                    bemerkung: colF,
                    bereich: aktuellerBereich,
                    positionsReferenzen: posRefs,
                    quelle: 'kunden-daten',
                    // Aufmass-kompatible Felder
                    fliesenhoehe: 0,
                    waende: [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}]
                });
            }

            console.log('Raeume geparst:', raeume.length);
            return raeume;
        },

        // ══════════════════════════════════════════════════
        // KONVERTIERUNG: Parser-Ergebnis -> App-kompatibles Format
        // Erstellt importResult + kundeObj fuer alle Module
        // ══════════════════════════════════════════════════
        ergebnisZuImportResult: function(ergebnis) {
            var stamm = ergebnis.stammdaten || {};

            // Alle Positionen (Original + Nachtraege) zusammenfuehren
            var allePositionen = (ergebnis.positionen || []).concat(ergebnis.nachtraege || []);

            // In App-kompatibles LV-Format konvertieren
            var lvPositionen = allePositionen.map(function(p) {
                return {
                    pos: p.pos,
                    bez: p.bez,
                    einheit: p.einheit,
                    menge: p.menge,
                    einzelpreis: p.einzelpreis,
                    bereich: p.bereich || '',
                    kategorie: p.kategorie || '',
                    tags: p.tags || [],
                    _epPreis: p._epPreis,
                    _gpPreis: p._gpPreis,
                    _istNachtrag: p.istNachtrag || false,
                    _nachtragBlock: p.nachtragBlock || ''
                };
            });

            // Raeume in App-kompatibles Format
            var raeumeFormatted = (ergebnis.raeume || []).map(function(r) {
                return {
                    nr: r.nr,
                    bez: r.bez,
                    geschoss: r.geschoss,
                    flaeche: r.flaeche,
                    umfang: r.umfang,
                    bemerkung: r.bemerkung,
                    bereich: r.bereich,
                    positionsReferenzen: r.positionsReferenzen,
                    quelle: 'kunden-daten',
                    fliesenhoehe: r.fliesenhoehe || 0,
                    raumhoehe: r.raumhoehe || 0,
                    waende: r.waende || [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}]
                };
            });

            // Kundendaten fuer Module aufbereiten
            var bauherr = (stamm.bauherr || {});
            var bauleiter = (stamm.bauleiter || {});
            var architekt = (stamm.architekt || {});
            var objekt = (stamm.objektdaten || {});

            var kundendaten = {
                auftraggeber: bauherr.firma || '',
                auftraggeber_vertreter: bauherr.vertreter || '',
                auftraggeber_referat: bauherr.referat || '',
                auftraggeber_strasse: bauherr.strasse || '',
                auftraggeber_plz: bauherr.plz || '',
                auftraggeber_ort: bauherr.ort || '',
                auftraggeber_ansprechpartner: bauherr.ansprechpartner || '',
                auftraggeber_telefon: bauherr.telefon || '',
                auftraggeber_mobil: bauherr.mobil || '',
                auftraggeber_email: bauherr.email || '',
                bauleitung: bauleiter.name || '',
                bauleitung_firma: bauleiter.firma || '',
                bauleitung_telefon: bauleiter.telefon || '',
                bauleitung_email: bauleiter.email || '',
                architekt: architekt.buero || '',
                architekt_inhaber: architekt.inhaber || '',
                architekt_bearbeiter: architekt.projektbearbeiter || '',
                architekt_strasse: architekt.strasse || '',
                architekt_plzOrt: (architekt.plz ? architekt.plz + ' ' : '') + (architekt.ort || ''),
                architekt_telefon: architekt.telefon || '',
                architekt_email: architekt.emailInhaber || architekt.emailBearbeiter || '',
                adresse: objekt.baustelleStrasse || '',
                plzOrt: objekt.baustellePlzOrt || '',
                baumassnahme: objekt.bauvorhaben || '',
                gewerk: objekt.gewerk || '',
                auftragsdatum: objekt.auftragsdatum || '',
                auftragssummeNetto: objekt.auftragssummeNetto || '',
                auftragssummeBrutto: objekt.auftragssummeBrutto || '',
                projekt: stamm.projekt || ''
            };

            return {
                positionen: lvPositionen,
                raeume: raeumeFormatted,
                nachtraege: ergebnis.nachtraege || [],
                kundendaten: kundendaten,
                stammdaten: stamm,
                meta: ergebnis.meta
            };
        }
    };
