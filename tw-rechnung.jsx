        function RechnungsModul({ kunde, importResult, gesamtliste, aufmassGespeichert, onBack }) {
            // === Phasen: 'typwahl' -> 'startseite' -> 'formular' ===
            const [phase, setPhase] = useState('typwahl');
            const [rechnungsTyp, setRechnungsTyp] = useState(null);
            const [positionen, setPositionen] = useState([]);
            const [rechnungsNr, setRechnungsNr] = useState('');
            const [nachtragsNr, setNachtragsNr] = useState('');
            const [angebotsNr, setAngebotsNr] = useState('');
            const [rechnungsDatum, setRechnungsDatum] = useState(new Date().toISOString().split('T')[0]);
            const [leistungszeitraum, setLeistungszeitraum] = useState('');
            const [auftragsnummer, setAuftragsnummer] = useState('');
            const [kostenstelle, setKostenstelle] = useState('');
            const [skontoProzent, setSkontoProzent] = useState(2);
            const [skontoTage, setSkontoTage] = useState(10);
            const [zahlungszielTage, setZahlungszielTage] = useState(30);
            const [sicherheitseinbehalt, setSicherheitseinbehalt] = useState(5);
            const [abschlagNr, setAbschlagNr] = useState(1);
            const [gueltigBis, setGueltigBis] = useState('');
            const [bemerkung, setBemerkung] = useState('');
            const [positionenGeladen, setPositionenGeladen] = useState(false);
            const [showDatenLaden, setShowDatenLaden] = useState(false);
            const [showFormatWahl, setShowFormatWahl] = useState(false);
            const [showMailDialog, setShowMailDialog] = useState(false);
            const [mailAdresse, setMailAdresse] = useState('');
            const [showKontoDialog, setShowKontoDialog] = useState(false);
            const [kontozahlungen, setKontozahlungen] = useState([]);
            // Positionsauswahl (fuer Daten-laden Option 2)
            const [showPosAuswahl, setShowPosAuswahl] = useState(false);
            const [posAuswahl, setPosAuswahl] = useState({});

            // LV-Positionen holen -- aus ALLEN verfuegbaren Quellen
            var lvPositionen = [];
            if (importResult && importResult.positionen && importResult.positionen.length > 0) {
                lvPositionen = importResult.positionen;
            } else if (kunde && kunde._lvPositionen && kunde._lvPositionen.length > 0) {
                lvPositionen = kunde._lvPositionen;
            } else if (typeof LV_POSITIONEN !== 'undefined') {
                var keys = [kunde._lvPositionenKey, kunde._driveFolderId, kunde.id, kunde.name].filter(Boolean);
                for (var ki = 0; ki < keys.length; ki++) {
                    if (LV_POSITIONEN[keys[ki]] && LV_POSITIONEN[keys[ki]].length > 0) {
                        lvPositionen = LV_POSITIONEN[keys[ki]];
                        break;
                    }
                }
            }
            if (lvPositionen.length > 0 && kunde) {
                var injKey = kunde._driveFolderId || kunde.id || kunde.name;
                if (injKey && typeof LV_POSITIONEN !== 'undefined') {
                    LV_POSITIONEN[injKey] = lvPositionen;
                }
            }

            // Aufmass-Daten: Massen pro Position aus gesamtliste extrahieren
            var aufmassMassen = {};
            if (gesamtliste && gesamtliste.length > 0) {
                gesamtliste.forEach(function(room) {
                    (room.positionen || []).forEach(function(p) {
                        var key = p.pos || p.posNr;
                        if (key) {
                            if (!aufmassMassen[key]) aufmassMassen[key] = 0;
                            aufmassMassen[key] += parseFloat(p.ergebnis) || 0;
                        }
                    });
                });
            }
            var hatAufmass = aufmassGespeichert && gesamtliste && gesamtliste.length > 0;

            // Auto-Nummern-Generierung
            useEffect(function() {
                var year = new Date().getFullYear();
                var rand = String(Math.floor(Math.random() * 900) + 100);
                if (rechnungsTyp === 'nachtrag') {
                    setNachtragsNr('NT-' + year + '-' + rand);
                } else if (rechnungsTyp === 'angebot') {
                    setAngebotsNr('AG-' + year + '-' + rand);
                    // Gueltigkeit 30 Tage
                    var bis = new Date();
                    bis.setDate(bis.getDate() + 30);
                    setGueltigBis(bis.toISOString().split('T')[0]);
                } else {
                    setRechnungsNr('RE-' + year + '-' + rand);
                }
            }, [rechnungsTyp]);

            // Kontozahlungen laden (fuer Schlussrechnung)
            var ladeKontozahlungen = function() {
                try {
                    var abKey = 'tw_ausgangsbuch';
                    var abData = JSON.parse(localStorage.getItem(abKey) || '[]');
                    var kundeId = kunde._driveFolderId || kunde.id || kunde.name;
                    var abschlaege = abData.filter(function(e) {
                        return e.kundeId === kundeId && (e.rechnungsTyp === 'abschlag' || e.dokumentTyp === 'abschlag');
                    });
                    setKontozahlungen(abschlaege.map(function(a) {
                        return {
                            id: a.id,
                            nr: a.rechnungsNr || a.dokumentNr || '',
                            datum: a.datum,
                            betrag: a.bruttoBetrag || 0,
                            aufgefuehrt: true
                        };
                    }));
                    setShowKontoDialog(true);
                } catch(e) { console.warn('Kontozahlungen laden fehlgeschlagen:', e); }
            };

            var kontoSumme = kontozahlungen
                .filter(function(k) { return k.aufgefuehrt; })
                .reduce(function(s, k) { return s + (parseFloat(k.betrag) || 0); }, 0);

            // Positionen-Funktionen
            var updatePos = function(id, field, value) {
                setPositionen(function(prev) {
                    return prev.map(function(p) {
                        if (p.id !== id) return p;
                        var u = Object.assign({}, p);
                        u[field] = value;
                        return u;
                    });
                });
            };
            var addPosition = function() {
                var maxId = positionen.reduce(function(m, p) { return Math.max(m, p.id); }, -1);
                setPositionen(function(prev) { return prev.concat([{ id: maxId+1, pos: String(prev.length+1), bez: '', einheit: 'm\u00b2', menge: 0, einzelpreis: 0, aktiv: true }]); });
            };
            var removePosition = function(id) {
                setPositionen(function(prev) { return prev.filter(function(p) { return p.id !== id; }); });
            };

            var fmt = function(n) { return Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

            // Berechnungen
            var aktivePosn = positionen.filter(function(p) { return p.aktiv; });
            var nettoSumme = aktivePosn.reduce(function(s, p) { return s + (parseFloat(p.menge)||0) * (parseFloat(p.einzelpreis)||0); }, 0);
            var mwstSatz = 19;
            var mwstBetrag = nettoSumme * mwstSatz / 100;
            var bruttoSumme = nettoSumme + mwstBetrag;
            var istRechnung = (rechnungsTyp === 'abschlag' || rechnungsTyp === 'schluss' || rechnungsTyp === 'einzel');
            var sicherheitBetrag = istRechnung ? bruttoSumme * sicherheitseinbehalt / 100 : 0;
            var skontoBetrag = istRechnung ? (bruttoSumme - sicherheitBetrag) * skontoProzent / 100 : 0;
            var zahlbetragMitSkonto = bruttoSumme - sicherheitBetrag - skontoBetrag;
            var zahlbetragOhneSkonto = bruttoSumme - sicherheitBetrag;
            // Schlussrechnung: Restforderung
            var restforderung = (rechnungsTyp === 'schluss') ? bruttoSumme - kontoSumme : bruttoSumme;

            // Dokumentnummer je Typ
            var getDokumentNr = function() {
                if (rechnungsTyp === 'nachtrag') return nachtragsNr;
                if (rechnungsTyp === 'angebot') return angebotsNr;
                return rechnungsNr;
            };

            // Typ-Konfiguration
            var getTypConfig = function() {
                switch(rechnungsTyp) {
                    case 'abschlag': return { label: abschlagNr + '. Abschlagsrechnung', color: '#1E88E5', driveOrdner: 'Rechnung-A.Kontozahlung' };
                    case 'schluss': return { label: 'Schlussrechnung', color: '#27ae60', driveOrdner: 'Rechnung-A.Kontozahlung' };
                    case 'einzel': return { label: 'Rechnung', color: '#00897b', driveOrdner: 'Rechnung-A.Kontozahlung' };
                    case 'nachtrag': return { label: 'Nachtrag Nr. ' + nachtragsNr, color: '#e67e22', driveOrdner: 'Angebote-Nachtraege-Leistungsverzeichnis' };
                    case 'angebot': return { label: 'Angebot Nr. ' + angebotsNr, color: '#8e44ad', driveOrdner: 'Angebote-Nachtraege-Leistungsverzeichnis' };
                    default: return { label: 'Dokument', color: '#666', driveOrdner: '' };
                }
            };
            var typCfg = getTypConfig();

            // Input-Styles (Design-System konform)
            var inputStyle = {width:'100%', padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'15px', color:'var(--text-white)', boxSizing:'border-box', fontFamily:'Source Sans 3, sans-serif', transition:'border-color 0.2s'};
            var smallInputStyle = Object.assign({}, inputStyle, {padding:'8px 10px', fontSize:'13px', textAlign:'right'});
            var labelStyle = {fontSize:'11px', color:'var(--text-muted)', display:'block', marginBottom:'3px', fontFamily:'Source Sans 3, sans-serif'};

            // === DATEN LADEN Logik ===
            var initPositionen = function(selected) {
                setPositionen(selected.map(function(p, i) {
                    var ep = parseFloat(p.einzelpreis) || parseFloat(p.ep) || 0;
                    var menge = parseFloat(p.menge) || 0;
                    var lvMatch = lvPositionen.find(function(lv) {
                        var lvPos = lv.pos || lv.posNr || '';
                        var pPos = p.pos || p.posNr || '';
                        return lvPos === pPos || lvPos.replace(/^0+/, '') === pPos.replace(/^0+/, '');
                    });
                    if (lvMatch) {
                        var lvEP = parseFloat(lvMatch.einzelpreis) || parseFloat(lvMatch.ep) || 0;
                        if (lvEP > 0) ep = lvEP;
                        if (menge === 0) menge = parseFloat(lvMatch.menge) || 0;
                    }
                    var aufmassMenge = aufmassMassen[p.pos || p.posNr] || 0;
                    if (aufmassMenge > 0) menge = aufmassMenge;
                    return { id: i, pos: p.pos || p.posNr || String(i+1), bez: p.bez || p.titel || '', einheit: p.einheit || 'm\u00b2', menge: menge, einzelpreis: ep, aktiv: true };
                }));
                setPositionenGeladen(true);
                setShowDatenLaden(false);
                setShowPosAuswahl(false);
            };

            // Option 1: Aus Aufmass
            var uebernahmeAusAufmass = function() {
                var merged = [];
                var seen = {};
                lvPositionen.forEach(function(lv) {
                    var key = lv.pos || lv.posNr;
                    var menge = aufmassMassen[key] || parseFloat(lv.menge) || 0;
                    var ep = parseFloat(lv.einzelpreis) || parseFloat(lv.ep) || 0;
                    merged.push({ id: merged.length, pos: key, bez: lv.bez || lv.titel || '', einheit: lv.einheit || 'm\u00b2', menge: menge, einzelpreis: ep, aktiv: menge > 0 });
                    seen[key] = true;
                });
                Object.keys(aufmassMassen).forEach(function(key) {
                    if (!seen[key] && aufmassMassen[key] > 0) {
                        merged.push({ id: merged.length, pos: key, bez: 'Position ' + key, einheit: 'm\u00b2', menge: aufmassMassen[key], einzelpreis: 0, aktiv: true });
                    }
                });
                setPositionen(merged);
                setPositionenGeladen(true);
                setShowDatenLaden(false);
            };

            // Option 2: Kundenpositionen
            var ladeKundenpositionen = function() {
                setShowPosAuswahl(true);
            };

            // Option 3: Datei hochladen
            var handleFileUpload = function() {
                var input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.xlsx,.csv,.json';
                input.onchange = function(e) {
                    var file = e.target.files[0];
                    if (!file) return;
                    // JSON-Dateien direkt laden
                    if (file.name.endsWith('.json')) {
                        var reader = new FileReader();
                        reader.onload = function(ev) {
                            try {
                                var data = JSON.parse(ev.target.result);
                                if (Array.isArray(data)) {
                                    initPositionen(data);
                                } else if (data.positionen) {
                                    initPositionen(data.positionen);
                                }
                            } catch(err) { alert('JSON konnte nicht gelesen werden: ' + err.message); }
                        };
                        reader.readAsText(file);
                    } else {
                        alert('Datei "' + file.name + '" wird importiert...\nCSV/XLSX/PDF-Import kommt in der naechsten Version.');
                    }
                    setShowDatenLaden(false);
                };
                input.click();
            };

            // Nachtrag: Positionen zu Kundenpositionen hinzufuegen
            var addNachtragsPositionenZuKunde = function() {
                try {
                    var kundeId = kunde._driveFolderId || kunde.id || kunde.name;
                    var key = 'lv_positionen_' + kundeId;
                    var bestehende = JSON.parse(localStorage.getItem(key) || '[]');
                    aktivePosn.forEach(function(np) {
                        bestehende.push({
                            pos: np.pos, posNr: np.pos,
                            bez: '[NT] ' + (np.bez || ''),
                            einheit: np.einheit, menge: np.menge,
                            einzelpreis: np.einzelpreis, ep: np.einzelpreis,
                            quelle: 'nachtrag', nachtragsNr: nachtragsNr,
                            erstelltAm: new Date().toISOString()
                        });
                    });
                    localStorage.setItem(key, JSON.stringify(bestehende));
                    if (typeof LV_POSITIONEN !== 'undefined') LV_POSITIONEN[kundeId] = bestehende;
                } catch(e) { console.warn('Nachtragspositionen speichern fehlgeschlagen:', e); }
            };

            // === PDF-Erzeugung (mehrseitig mit Uebertrag) ===
            var generatePDF = function() {
                // Auto-Save: Rechnung ins Ausgangsbuch (nur fuer Rechnungen)
                if (istRechnung) {
                    try {
                        var abKey = 'tw_ausgangsbuch';
                        var abData = JSON.parse(localStorage.getItem(abKey) || '[]');
                        var isDuplicate = abData.some(function(e) { return e.dokumentNr === getDokumentNr() && e.datum === rechnungsDatum; });
                        if (!isDuplicate && getDokumentNr()) {
                            var zahlungszielDatum = new Date(rechnungsDatum);
                            zahlungszielDatum.setDate(zahlungszielDatum.getDate() + zahlungszielTage);
                            var skontoFrist = new Date(rechnungsDatum);
                            skontoFrist.setDate(skontoFrist.getDate() + skontoTage);
                            abData.push({
                                id: 'RE_' + Date.now(),
                                lfdNr: abData.length + 1,
                                dokumentNr: getDokumentNr(),
                                dokumentTyp: rechnungsTyp,
                                dokumentLabel: typCfg.label,
                                datum: rechnungsDatum,
                                leistungszeitraum: leistungszeitraum,
                                kundeId: kunde._driveFolderId || kunde.id || kunde.name || '',
                                kundeName: kunde.auftraggeber || kunde.name || '',
                                kundeAdresse: kunde.ag_adresse || kunde.adresse || '',
                                kundeTyp: 'b2b',
                                bauvorhaben: kunde.adresse || kunde.baumassnahme || '',
                                auftragsnummer: auftragsnummer,
                                kostenstelle: kostenstelle,
                                nettoBetrag: nettoSumme,
                                mwstSatz: mwstSatz,
                                mwstBetrag: mwstBetrag,
                                bruttoBetrag: bruttoSumme,
                                sicherheitseinbehaltProzent: sicherheitseinbehalt,
                                sicherheitseinbehaltBetrag: sicherheitBetrag,
                                zahlungsbedingungId: 'standard_handwerk',
                                zahlungszielTage: zahlungszielTage,
                                faelligkeitsDatum: zahlungszielDatum.toISOString().split('T')[0],
                                skontoProzent: skontoProzent,
                                skontoTage: skontoTage,
                                skontoBetrag: skontoBetrag,
                                skontoFrist: skontoFrist.toISOString().split('T')[0],
                                forderungBrutto: zahlbetragOhneSkonto,
                                forderungMitSkonto: zahlbetragMitSkonto,
                                zahlungen: [],
                                zahlungsSumme: 0,
                                restbetrag: zahlbetragOhneSkonto,
                                status: 'offen',
                                mahnStufe: 0,
                                mahnungen: [],
                                abschlagNr: rechnungsTyp === 'abschlag' ? abschlagNr : null,
                                pdfDateiname: getDateiname(),
                                driveOrdner: typCfg.driveOrdner,
                                anzahlPositionen: aktivePosn.length,
                                notiz: '',
                                erstelltAm: new Date().toISOString(),
                                geaendertAm: new Date().toISOString()
                            });
                            localStorage.setItem(abKey, JSON.stringify(abData));
                            console.log('Rechnung ' + getDokumentNr() + ' ins Ausgangsbuch gespeichert');
                        }
                    } catch(abErr) { console.warn('Ausgangsbuch-Speichern fehlgeschlagen:', abErr); }
                }

                // Nachtrag: Positionen zu Kundenpositionen hinzufuegen
                if (rechnungsTyp === 'nachtrag') {
                    addNachtragsPositionenZuKunde();
                }

                // PDF-HTML erzeugen
                var kName = kunde.auftraggeber || kunde.name || '';
                if (kName.indexOf('Datum') === 0 || kName.indexOf('Unterschrift') !== -1) kName = kunde.name || '';
                var af = kunde.ag_adresse || kunde.adresse || '';
                if (af.indexOf('Datum') !== -1 || af.indexOf('Unterschrift') !== -1) af = kunde.adresse || '';
                var aLines = [];
                if (af) { var m = af.match(/^(.*?)[\s,]+(\d{5}\s+.*)$/); if(m){aLines.push(m[1].trim());aLines.push(m[2].trim());}else{af.split(',').forEach(function(s){if(s.trim())aLines.push(s.trim());});} }

                // Positionszeilen HTML
                var posR = '';
                aktivePosn.forEach(function(p) {
                    var gp = (parseFloat(p.menge)||0)*(parseFloat(p.einzelpreis)||0);
                    posR += '<tr><td style="text-align:center;font-weight:700;width:30px">'+(p.pos||'')+'</td><td style="text-align:right;width:55px">'+fmt(p.menge)+'</td><td style="text-align:center;width:35px">'+(p.einheit||'')+'</td><td style="padding:6px 8px">'+(p.bez||'').replace(/</g,'&lt;')+'</td><td style="text-align:right;width:65px">'+fmt(p.einzelpreis)+'</td><td style="text-align:right;width:75px;font-weight:700">'+fmt(gp)+'</td></tr>';
                });

                var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+getDokumentNr()+'</title>';
                h += '<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,700&display=swap" rel="stylesheet">';
                h += '<style>';
                h += '@page{size:A4;margin:0}';
                h += '*{box-sizing:border-box;margin:0;padding:0}';
                h += 'body{font-family:"Source Sans 3","Segoe UI",sans-serif;font-size:9.5pt;color:#222;line-height:1.4;background:#fff}';
                h += '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
                h += '.page{width:210mm;min-height:297mm;padding:20mm 18mm 25mm 22mm;margin:0 auto;position:relative;background:#fff;page-break-after:always;overflow:hidden}';
                h += '.page:last-child{page-break-after:auto}';
                h += '.lh{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3mm}';
                h += '.lc{display:inline-flex;flex-direction:column;align-items:flex-start}';
                h += '.lt{font-family:"Source Sans 3",serif;font-style:italic;font-weight:700;color:#c41e1e;font-size:13px;margin-bottom:-14px;padding-left:1px;position:relative;z-index:2}';
                h += '.lw{display:flex;align-items:baseline;font-family:"Oswald",sans-serif;font-weight:700;color:#111;line-height:1}';
                h += '.lw .w{font-size:52px}.lw .iw{position:relative;font-size:52px;display:inline-block}';
                h += '.lw .iw .ic{font-size:52px;color:#111}.lw .iw .id{position:absolute;top:5px;left:50%;transform:translateX(-50%);width:8px;height:8px;background:#c41e1e}';
                h += '.lw .ll{font-size:68px;letter-spacing:1px;line-height:0.75}.lw .wa{font-size:52px}';
                h += '.ls{display:flex;justify-content:flex-end;width:100%;margin-top:1px}';
                h += '.ls span{font-family:"Source Sans 3",sans-serif;font-weight:600;color:#c41e1e;font-size:13px;letter-spacing:2px}';
                h += '.lr{text-align:right;font-size:9pt;color:#555;line-height:1.6;padding-top:3mm}';
                h += '.sep{border:none;border-top:2px solid #c41e1e;margin:3mm 0 2mm}';
                h += '.abs{font-size:7pt;color:#aaa;border-bottom:0.5px solid #ccc;display:inline-block;padding-bottom:1px;margin-bottom:5mm}';
                h += '.eb{display:flex;justify-content:space-between;margin-bottom:6mm}';
                h += '.en{font-weight:700;font-size:11pt}.ea{font-size:10pt;color:#333;line-height:1.5}';
                h += '.db{text-align:right}.dl{font-size:7.5pt;color:#999}.dv{font-size:10.5pt}';
                h += '.rt{font-size:16pt;font-weight:700;margin-bottom:4mm;color:' + typCfg.color + '}';
                h += '.rm{font-size:9pt;color:#555;margin-bottom:5mm}';
                h += '.rm .l{display:inline-block;width:38mm;color:#888}.rm .v{font-weight:600;color:#222}';
                h += 'table.p{width:100%;border-collapse:collapse;margin-bottom:6mm;font-size:8.5pt}';
                h += 'table.p thead th{background:#2d3436;color:#fff;font-weight:700;padding:7px 6px;font-size:8pt;text-transform:uppercase;letter-spacing:0.3px}';
                h += 'table.p tbody td{padding:6px;border-bottom:1px solid #e0e0e0;vertical-align:top;font-variant-numeric:tabular-nums}';
                h += 'table.p tr{page-break-inside:avoid}';
                h += '.su{margin-left:auto;width:88mm;font-size:9.5pt;margin-bottom:6mm}';
                h += '.su .r{display:flex;justify-content:space-between;padding:2px 0}';
                h += '.su .r .v{font-variant-numeric:tabular-nums;text-align:right;min-width:34mm}';
                h += '.su .r.br{font-weight:700;font-size:12pt;padding:4px 0;border-top:2.5px double #222;margin-top:2px}';
                h += '.su .r.sk{color:#c41e1e;font-weight:700}';
                h += '.su .r.nz{font-weight:700}';
                h += '.su .r.kl{font-size:8.5pt;color:#777}';
                h += '.su .r.rest{font-weight:700;font-size:13pt;color:' + typCfg.color + ';padding:4px 0;border-top:2px solid ' + typCfg.color + ';margin-top:4px}';
                h += '.bm{font-size:8.5pt;color:#555;margin-bottom:8mm;line-height:1.5}';
                h += '.ft{position:absolute;bottom:18mm;left:22mm;right:18mm;border-top:1.5px solid #c41e1e;padding-top:2mm;font-size:7pt;color:#999;line-height:1.6}';
                h += '.ft .ti{font-style:italic;color:#c41e1e;font-weight:700}';
                h += '.ft .tn{color:#333;font-weight:700}.ft .tf{color:#c41e1e}';
                h += '.konto-table{width:100%;border-collapse:collapse;font-size:8.5pt;margin-bottom:4mm}';
                h += '.konto-table td{padding:4px 6px;border-bottom:1px solid #e0e0e0}';
                h += '</style></head><body>';

                // === A4 Seite 1 ===
                h += '<div class="page">';
                // Briefkopf
                h += '<div class="lh"><div class="lc">';
                h += '<div class="lt">Thomas</div>';
                h += '<div class="lw"><span class="w">w</span><span class="iw"><span class="ic">\u0131</span><span class="id"></span></span><span class="ll">LL</span><span class="wa">wacher</span></div>';
                h += '<div class="ls"><span>Fliesenlegermeister e.K.</span></div>';
                h += '</div><div class="lr">Flurweg 14a<br>56472 Nisterau<br>Tel. 02661-63101<br>Mobil 0170-2024161</div></div>';
                h += '<hr class="sep">';
                h += '<div class="abs">Thomas Willwacher Fliesenlegermeister e.K. \u00b7 Flurweg 14a \u00b7 56472 Nisterau</div>';
                // Empfaenger + Dokumentdaten
                h += '<div class="eb"><div><div class="en">'+kName+'</div>';
                h += '<div class="ea">'+aLines.join('<br>')+'</div></div>';
                h += '<div class="db">';
                h += '<div class="dl">Datum</div><div class="dv">'+new Date(rechnungsDatum).toLocaleDateString('de-DE')+'</div>';
                h += '<div style="margin-top:3mm"><div class="dl">'+(istRechnung ? 'Rechnungs-Nr.' : rechnungsTyp === 'nachtrag' ? 'Nachtrags-Nr.' : 'Angebots-Nr.')+'</div><div class="dv">'+getDokumentNr()+'</div></div>';
                if (auftragsnummer) h += '<div style="margin-top:2mm"><div class="dl">Auftrags-Nr.</div><div class="dv">'+auftragsnummer+'</div></div>';
                if (kostenstelle) h += '<div style="margin-top:2mm"><div class="dl">Kostenstelle</div><div class="dv">'+kostenstelle+'</div></div>';
                h += '</div></div>';
                // Dokumenttitel
                h += '<div class="rt">'+typCfg.label+'</div>';
                // Meta-Zeilen
                h += '<div class="rm">';
                h += '<div><span class="l">Bauvorhaben:</span> <span class="v">'+(kunde.adresse||kunde.name||'')+'</span></div>';
                if(leistungszeitraum) h += '<div><span class="l">Leistungszeitraum:</span> <span class="v">'+leistungszeitraum+'</span></div>';
                h += '<div><span class="l">Steuernummer:</span> <span class="v">30/220/1234/5</span></div>';
                if(rechnungsTyp === 'angebot' && gueltigBis) h += '<div><span class="l">Gueltig bis:</span> <span class="v">'+new Date(gueltigBis).toLocaleDateString('de-DE')+'</span></div>';
                h += '</div>';
                // Positionstabelle
                h += '<table class="p"><thead><tr><th style="text-align:center;width:30px">Pos.</th><th style="text-align:right;width:55px">Menge</th><th style="text-align:center;width:35px">Einh.</th><th style="text-align:left">Bezeichnung</th><th style="text-align:right;width:65px">EP (\u20ac)</th><th style="text-align:right;width:75px">GP (\u20ac)</th></tr></thead>';
                h += '<tbody>'+posR+'</tbody></table>';
                // Summenblock
                h += '<div class="su">';
                h += '<div class="r"><span>Nettobetrag:</span><span class="v">'+fmt(nettoSumme)+' \u20ac</span></div>';
                h += '<div class="r kl"><span>zzgl. '+mwstSatz+'% MwSt.:</span><span class="v">'+fmt(mwstBetrag)+' \u20ac</span></div>';
                h += '<div class="r br"><span>Bruttobetrag:</span><span class="v">'+fmt(bruttoSumme)+' \u20ac</span></div>';
                // Rechnungs-spezifische Zeilen
                if (istRechnung) {
                    if(sicherheitseinbehalt>0) h += '<div class="r kl"><span>abzgl. Sicherheitseinbehalt '+sicherheitseinbehalt+'%:</span><span class="v">\u2013 '+fmt(sicherheitBetrag)+' \u20ac</span></div>';
                    h += '<div class="r sk"><span>Zahlbar '+skontoTage+' Tage ('+skontoProzent+'% Skonto):</span><span class="v">'+fmt(zahlbetragMitSkonto)+' \u20ac</span></div>';
                    h += '<div class="r nz"><span>Zahlbar '+zahlungszielTage+' Tage netto:</span><span class="v">'+fmt(zahlbetragOhneSkonto)+' \u20ac</span></div>';
                }
                // Schlussrechnung: Kontozahlungen abziehen
                if (rechnungsTyp === 'schluss' && kontozahlungen.length > 0) {
                    var aufgef = kontozahlungen.filter(function(k){ return k.aufgefuehrt; });
                    if (aufgef.length > 0) {
                        h += '</div>'; // su schliessen
                        h += '<div style="margin-bottom:4mm"><div style="font-size:9pt;font-weight:700;margin-bottom:2mm;color:#555">Geleistete A-Kontozahlungen:</div>';
                        h += '<table class="konto-table">';
                        aufgef.forEach(function(k) {
                            h += '<tr><td>'+k.nr+'</td><td>'+k.datum+'</td><td style="text-align:right;font-weight:600">\u2013 '+fmt(k.betrag)+' \u20ac</td></tr>';
                        });
                        h += '<tr style="font-weight:700;border-top:2px solid #222"><td colspan="2">Summe Kontozahlungen:</td><td style="text-align:right">\u2013 '+fmt(kontoSumme)+' \u20ac</td></tr>';
                        h += '</table>';
                        h += '<div class="su"><div class="r rest"><span>Restforderung:</span><span class="v">'+fmt(restforderung)+' \u20ac</span></div>';
                    }
                }
                h += '</div>';

                if(bemerkung) h += '<div class="bm">'+bemerkung.replace(/\n/g,'<br>')+'</div>';
                // Fusszeile
                h += '<div class="ft"><div><span class="ti">Thomas </span><span class="tn">wiLLwacher</span> <span class="tf">Fliesenlegermeister e.K.</span></div>';
                h += '<div>Flurweg 14a \u00b7 56472 Nisterau \u00b7 Tel. 02661-63101 \u00b7 Mobil 0170-2024161</div>';
                h += '<div>Steuernummer: 30/220/1234/5 \u00b7 Westerwald Bank eG \u00b7 IBAN: DE12 5739 1800 0000 0000 00 \u00b7 BIC: GENODE51WW1</div></div>';
                h += '</div></body></html>';

                var pw = window.open('', '_blank', 'width=820,height=1160');
                pw.document.write(h);
                pw.document.close();
                setTimeout(function(){ pw.focus(); pw.print(); }, 800);
            };

            // Dateiname
            var getDateiname = function() {
                var prefix = '';
                var nr = '';
                switch(rechnungsTyp) {
                    case 'abschlag': prefix = 'Abschlagsrechnung'; nr = rechnungsNr; break;
                    case 'schluss': prefix = 'Schlussrechnung'; nr = rechnungsNr; break;
                    case 'einzel': prefix = 'Rechnung'; nr = rechnungsNr; break;
                    case 'nachtrag': prefix = 'Nachtrag'; nr = nachtragsNr; break;
                    case 'angebot': prefix = 'Angebot'; nr = angebotsNr; break;
                }
                var kundeName = (kunde.name || 'Kunde').replace(/[^a-zA-Z0-9\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df\-_]/g, '_');
                var datum = rechnungsDatum.replace(/-/g, '');
                return prefix + '_' + nr + '_' + kundeName + '_' + datum + '.pdf';
            };

            // === E-Rechnung XML (EN16931/CII) ===
            var generateERechnungXML = function(profil) {
                var isXR = profil === 'xrechnung';
                var kName = kunde.auftraggeber || kunde.name || 'Unbekannt';
                if (kName.indexOf('Datum') === 0 || kName.indexOf('Unterschrift') !== -1) kName = kunde.name || 'Unbekannt';
                var kStrasse = kunde.ag_adresse || kunde.adresse || '';
                var kOrt = '';
                var kPLZ = '';
                var addrMatch = kStrasse.match(/^(.*?)[\s,]+(\d{5})\s+(.*)$/);
                if (addrMatch) { kStrasse = addrMatch[1].trim(); kPLZ = addrMatch[2]; kOrt = addrMatch[3].trim(); }
                else {
                    var kommaTeile = kStrasse.split(',').map(function(s){return s.trim();});
                    if (kommaTeile.length >= 2) { kStrasse = kommaTeile[0]; var plzM = kommaTeile[1].match(/(\d{5})\s*(.*)/); if(plzM){ kPLZ=plzM[1]; kOrt=plzM[2]; } else { kOrt = kommaTeile[1]; } }
                }
                var rDatum = rechnungsDatum.replace(/-/g,'');
                var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
                xml += '<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">\n';
                xml += '  <rsm:ExchangedDocumentContext>\n';
                if (isXR) {
                    xml += '    <ram:BusinessProcessSpecifiedDocumentContextParameter>\n';
                    xml += '      <ram:ID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</ram:ID>\n';
                    xml += '    </ram:BusinessProcessSpecifiedDocumentContextParameter>\n';
                    xml += '    <ram:GuidelineSpecifiedDocumentContextParameter>\n';
                    xml += '      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID>\n';
                    xml += '    </ram:GuidelineSpecifiedDocumentContextParameter>\n';
                } else {
                    xml += '    <ram:GuidelineSpecifiedDocumentContextParameter>\n';
                    xml += '      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>\n';
                    xml += '    </ram:GuidelineSpecifiedDocumentContextParameter>\n';
                }
                xml += '  </rsm:ExchangedDocumentContext>\n';
                xml += '  <rsm:ExchangedDocument>\n';
                xml += '    <ram:ID>' + escXml(getDokumentNr()) + '</ram:ID>\n';
                xml += '    <ram:TypeCode>380</ram:TypeCode>\n';
                xml += '    <ram:IssueDateTime><udt:DateTimeString format="102">' + rDatum + '</udt:DateTimeString></ram:IssueDateTime>\n';
                if (bemerkung) xml += '    <ram:IncludedNote><ram:Content>' + escXml(bemerkung) + '</ram:Content></ram:IncludedNote>\n';
                xml += '  </rsm:ExchangedDocument>\n';
                xml += '  <rsm:SupplyChainTradeTransaction>\n';
                aktivePosn.forEach(function(p, idx) {
                    var gp = (parseFloat(p.menge)||0) * (parseFloat(p.einzelpreis)||0);
                    xml += '    <ram:IncludedSupplyChainTradeLineItem>\n';
                    xml += '      <ram:AssociatedDocumentLineDocument><ram:LineID>' + (p.pos || String(idx+1)) + '</ram:LineID></ram:AssociatedDocumentLineDocument>\n';
                    xml += '      <ram:SpecifiedTradeProduct><ram:Name>' + escXml(p.bez || 'Position ' + (idx+1)) + '</ram:Name></ram:SpecifiedTradeProduct>\n';
                    xml += '      <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>' + fmtXml(p.einzelpreis) + '</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>\n';
                    xml += '      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="' + mapEinheit(p.einheit) + '">' + fmtXml(p.menge) + '</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>\n';
                    xml += '      <ram:SpecifiedLineTradeSettlement>\n';
                    xml += '        <ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>19.00</ram:RateApplicablePercent></ram:ApplicableTradeTax>\n';
                    xml += '        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>' + fmtXml(gp) + '</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>\n';
                    xml += '      </ram:SpecifiedLineTradeSettlement>\n';
                    xml += '    </ram:IncludedSupplyChainTradeLineItem>\n';
                });
                // Seller
                xml += '    <ram:ApplicableHeaderTradeAgreement>\n';
                xml += '      <ram:SellerTradeParty>\n';
                xml += '        <ram:Name>Thomas Willwacher Fliesenlegermeister e.K.</ram:Name>\n';
                xml += '        <ram:PostalTradeAddress><ram:LineOne>Flurweg 14a</ram:LineOne><ram:PostcodeCode>56472</ram:PostcodeCode><ram:CityName>Nisterau</ram:CityName><ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress>\n';
                xml += '        <ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">30/220/1234/5</ram:ID></ram:SpecifiedTaxRegistration>\n';
                xml += '      </ram:SellerTradeParty>\n';
                xml += '      <ram:BuyerTradeParty>\n';
                xml += '        <ram:Name>' + escXml(kName) + '</ram:Name>\n';
                xml += '        <ram:PostalTradeAddress><ram:LineOne>' + escXml(kStrasse) + '</ram:LineOne><ram:PostcodeCode>' + escXml(kPLZ) + '</ram:PostcodeCode><ram:CityName>' + escXml(kOrt) + '</ram:CityName><ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress>\n';
                xml += '      </ram:BuyerTradeParty>\n';
                xml += '    </ram:ApplicableHeaderTradeAgreement>\n';
                xml += '    <ram:ApplicableHeaderTradeDelivery/>\n';
                xml += '    <ram:ApplicableHeaderTradeSettlement>\n';
                xml += '      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>\n';
                xml += '      <ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>58</ram:TypeCode><ram:PayeePartyCreditorFinancialAccount><ram:IBANID>DE12573918000000000000</ram:IBANID><ram:AccountName>Thomas Willwacher Fliesenlegermeister e.K.</ram:AccountName></ram:PayeePartyCreditorFinancialAccount><ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>GENODE51WW1</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution></ram:SpecifiedTradeSettlementPaymentMeans>\n';
                xml += '      <ram:ApplicableTradeTax><ram:CalculatedAmount>' + fmtXml(mwstBetrag) + '</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode><ram:BasisAmount>' + fmtXml(nettoSumme) + '</ram:BasisAmount><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>19.00</ram:RateApplicablePercent></ram:ApplicableTradeTax>\n';
                xml += '      <ram:SpecifiedTradePaymentTerms><ram:Description>Zahlbar innerhalb ' + zahlungszielTage + ' Tagen netto';
                if (skontoProzent > 0) xml += ', innerhalb ' + skontoTage + ' Tagen abzgl. ' + skontoProzent + '% Skonto';
                xml += '</ram:Description>';
                var faelligDatum = new Date(rechnungsDatum);
                faelligDatum.setDate(faelligDatum.getDate() + zahlungszielTage);
                xml += '<ram:DueDateDateTime><udt:DateTimeString format="102">' + faelligDatum.toISOString().split('T')[0].replace(/-/g,'') + '</udt:DateTimeString></ram:DueDateDateTime>';
                xml += '</ram:SpecifiedTradePaymentTerms>\n';
                xml += '      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n';
                xml += '        <ram:LineTotalAmount>' + fmtXml(nettoSumme) + '</ram:LineTotalAmount>\n';
                xml += '        <ram:TaxBasisTotalAmount>' + fmtXml(nettoSumme) + '</ram:TaxBasisTotalAmount>\n';
                xml += '        <ram:TaxTotalAmount currencyID="EUR">' + fmtXml(mwstBetrag) + '</ram:TaxTotalAmount>\n';
                xml += '        <ram:GrandTotalAmount>' + fmtXml(bruttoSumme) + '</ram:GrandTotalAmount>\n';
                xml += '        <ram:DuePayableAmount>' + fmtXml(zahlbetragOhneSkonto) + '</ram:DuePayableAmount>\n';
                xml += '      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n';
                xml += '    </ram:ApplicableHeaderTradeSettlement>\n';
                xml += '  </rsm:SupplyChainTradeTransaction>\n';
                xml += '</rsm:CrossIndustryInvoice>';
                return xml;
            };

            var escXml = function(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;'); };
            var fmtXml = function(v) { return (parseFloat(v) || 0).toFixed(2); };
            var mapEinheit = function(e) { var map = { 'm\u00b2':'MTK', 'm':'MTR', 'Stk':'C62', 'psch':'LS', 'lfm':'MTR', 'kg':'KGM', 'l':'LTR', 'Satz':'SET', 'Std':'HUR' }; return map[e] || 'C62'; };

            var downloadXRechnung = function() {
                var xml = generateERechnungXML('xrechnung');
                var blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a'); a.href = url; a.download = getDokumentNr() + '_XRechnung.xml';
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                alert('XRechnung XML heruntergeladen:\n' + getDokumentNr() + '_XRechnung.xml');
            };

            var downloadZUGFeRD = function() {
                generatePDF();
                setTimeout(function() {
                    var xml = generateERechnungXML('zugferd');
                    var blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a'); a.href = url; a.download = getDokumentNr() + '_factur-x.xml';
                    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                    alert('ZUGFeRD E-Rechnung erstellt!\n\n1. PDF zum Drucken/Speichern geoeffnet\n2. XML-Datei heruntergeladen\n\nBeide Dateien zusammen = ZUGFeRD-konforme E-Rechnung.');
                }, 1500);
            };

            // === E-Mail Versand ===
            var sendPerEmail = async function() {
                var empfaengerEmail = kunde.ag_email || kunde.bl_email || kunde.arch_email || '';
                var kName = kunde.auftraggeber || kunde.name || 'Auftraggeber';
                if (kName.indexOf('Datum') === 0 || kName.indexOf('Unterschrift') !== -1) kName = kunde.name || 'Auftraggeber';
                var typText = rechnungsTyp === 'nachtrag' ? 'unseren Nachtrag Nr. ' + nachtragsNr
                    : rechnungsTyp === 'angebot' ? 'unser Angebot Nr. ' + angebotsNr
                    : 'unsere ' + typCfg.label + ' Nr. ' + rechnungsNr;
                var bauvorhaben = kunde.adresse || kunde.baumassnahme || kunde.name || '';
                var betreffText = typCfg.label + ' - ' + bauvorhaben;
                var mailBody = 'Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie ' + typText + '.\n\n'
                    + 'Bauvorhaben: ' + bauvorhaben + '\n';
                if (leistungszeitraum) mailBody += 'Leistungszeitraum: ' + leistungszeitraum + '\n';
                if (auftragsnummer) mailBody += 'Auftragsnummer: ' + auftragsnummer + '\n';
                if (istRechnung) {
                    mailBody += '\nRechnungsbetrag (brutto): ' + fmt(bruttoSumme) + ' EUR\n';
                    if (skontoProzent > 0) mailBody += 'Zahlbar innerhalb ' + skontoTage + ' Tagen abzgl. ' + skontoProzent + '% Skonto: ' + fmt(zahlbetragMitSkonto) + ' EUR\n';
                    mailBody += 'Zahlbar innerhalb ' + zahlungszielTage + ' Tagen netto: ' + fmt(zahlbetragOhneSkonto) + ' EUR\n';
                    mailBody += '\nBitte ueberweisen Sie den Rechnungsbetrag auf folgendes Konto:\n'
                        + 'Westerwald Bank eG\nIBAN: DE12 5739 1800 0000 0000 00\nBIC: GENODE51WW1\n'
                        + 'Kontoinhaber: Thomas Willwacher Fliesenlegermeister e.K.\n';
                } else {
                    mailBody += '\nGesamtbetrag (brutto): ' + fmt(bruttoSumme) + ' EUR\n';
                }
                mailBody += '\nDas Dokument ist diesem Schreiben als PDF beigefuegt.\n\n'
                    + 'Bei Rueckfragen stehen wir Ihnen gerne zur Verfuegung.\n\n'
                    + 'Mit freundlichen Gruessen\n\nThomas Willwacher\nFliesenlegermeister e.K.\nFlurweg 14a, 56472 Nisterau\nTel. 02661-63101, Mobil 0170-2024161';
                generatePDF();
                var service = window.GoogleDriveService;
                if (service && service.accessToken && empfaengerEmail) {
                    try {
                        var rawParts = ['From: ' + (typeof GMAIL_CONFIG !== 'undefined' ? GMAIL_CONFIG.ABSENDER_EMAIL : ''), 'To: ' + empfaengerEmail, 'Subject: =?UTF-8?B?' + btoa(unescape(encodeURIComponent(betreffText))) + '?=', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', '', mailBody];
                        var rawMail = rawParts.join('\r\n');
                        var encoded = btoa(unescape(encodeURIComponent(rawMail))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                        var resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                            method: 'POST', headers: { 'Authorization': 'Bearer ' + service.accessToken, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ raw: encoded })
                        });
                        if (resp.ok) { alert('Dokument per Gmail an ' + empfaengerEmail + ' gesendet!'); return; }
                    } catch(gmailErr) { console.warn('Gmail-Versand fehlgeschlagen:', gmailErr); }
                }
                setTimeout(function() {
                    window.location.href = 'mailto:' + encodeURIComponent(empfaengerEmail) + '?subject=' + encodeURIComponent(betreffText) + '&body=' + encodeURIComponent(mailBody);
                }, 1200);
            };

            var openMailDialog = function() {
                setMailAdresse(kunde.ag_email || kunde.bl_email || kunde.arch_email || '');
                setShowMailDialog(true);
            };
            var confirmAndSend = function() {
                var origEmail = kunde.ag_email;
                if (mailAdresse) kunde.ag_email = mailAdresse;
                setShowMailDialog(false);
                sendPerEmail();
                if (!mailAdresse) kunde.ag_email = origEmail;
            };

            // =================================================================
            // PHASE 1: Typwahl (5 Untermodule - Modus-Karten Design)
            // =================================================================
            if (phase === 'typwahl') {
                var typen = [
                    { id: 'abschlag',  icon: '\ud83d\udcca', name: 'Abschlagsrechnung',  desc: 'Teilrechnung mit kumulierter Aufstellung',       color: '#1E88E5', shadow: 'rgba(30,136,229,0.30)' },
                    { id: 'schluss',   icon: '\ud83d\udccb', name: 'Schlussrechnung',     desc: 'Endabrechnung mit Gesamtaufstellung',             color: '#27ae60', shadow: 'rgba(39,174,96,0.30)' },
                    { id: 'einzel',    icon: '\ud83e\uddfe', name: 'Einzelrechnung',      desc: 'Einfache Rechnung ohne Abschlaege',               color: '#00897b', shadow: 'rgba(0,137,123,0.30)' },
                    { id: 'nachtrag',  icon: '\ud83d\udcd1', name: 'Nachtrag',            desc: 'Zusaetzliche / geaenderte Leistungen',            color: '#e67e22', shadow: 'rgba(230,126,34,0.30)' },
                    { id: 'angebot',   icon: '\ud83d\udcdd', name: 'Angebot',             desc: 'Kostenvoranschlag fuer den Auftraggeber',          color: '#8e44ad', shadow: 'rgba(142,68,173,0.30)' },
                ];
                return (
                    <div className="page-container" style={{padding:'16px', minHeight:'100vh'}}>
                        <div style={{textAlign:'center', marginBottom:'20px'}}>
                            <FirmenLogo size="small" />
                            <div style={{marginTop:'12px', fontSize:'15px', fontWeight:'700', fontFamily:'Oswald, sans-serif', color:'var(--text-white)'}}>{kunde ? kunde.name : ''}</div>
                            <div style={{fontSize:'11px', color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase', marginTop:'4px', fontFamily:'Oswald, sans-serif'}}>Dokumenttyp waehlen</div>
                        </div>
                        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                            {typen.map(function(t) {
                                return (
                                    <button key={t.id} onClick={function(){ setRechnungsTyp(t.id); setPhase('startseite'); }}
                                        style={{width:'100%', padding:'20px', borderRadius:'var(--radius-lg)', border:'1px solid transparent', cursor:'pointer',
                                            background:'linear-gradient(135deg, ' + t.color + ', ' + t.color + 'cc)', color:'#fff',
                                            display:'flex', alignItems:'flex-start', gap:'16px', textAlign:'left',
                                            boxShadow:'0 6px 20px ' + t.shadow, transition:'all 0.25s ease',
                                            position:'relative', overflow:'hidden', touchAction:'manipulation'}}>
                                        <span style={{fontSize:'32px', marginTop:'2px'}}>{t.icon}</span>
                                        <div style={{flex:1}}>
                                            <div style={{fontSize:'16px', fontWeight:'600', marginBottom:'4px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>{t.name}</div>
                                            <div style={{fontSize:'12px', opacity:0.9, lineHeight:'1.5', fontFamily:'Source Sans 3, sans-serif'}}>{t.desc}</div>
                                        </div>
                                        <span style={{fontSize:'20px', opacity:0.7, marginTop:'4px'}}>{'\u2192'}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={onBack} style={{width:'100%', marginTop:'16px', padding:'12px 32px', borderRadius:'var(--radius-md)', border:'none',
                            background:'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))', color:'#fff', cursor:'pointer',
                            fontSize:'14px', fontWeight:'600', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'1px',
                            boxShadow:'0 4px 15px rgba(196, 30, 30, 0.3)', transition:'all 0.25s ease', touchAction:'manipulation'}}>
                            {'\u2190'} Zurueck zur Modulwahl
                        </button>
                    </div>
                );
            }

            // =================================================================
            // PHASE 2: Startseite (PDF-Vorschau mit Briefkopf)
            // =================================================================
            if (phase === 'startseite') {
                var kundenName = kunde.auftraggeber || kunde.name || '';
                var kundenAdresse = kunde.ag_adresse || kunde.adresse || '';
                var bauvorh = kunde.adresse || kunde.baumassnahme || '';

                return (
                    <div className="page-container" style={{padding:'16px', minHeight:'100vh', paddingBottom:'80px'}}>
                        {/* PDF-Vorschau-Container */}
                        <div style={{background:'#ffffff', borderRadius:'12px', padding:'24px 20px', marginBottom:'16px', boxShadow:'var(--shadow-lg)', color:'#222', position:'relative'}}>
                            {/* Briefkopf */}
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px'}}>
                                <div style={{display:'flex', flexDirection:'column'}}>
                                    <span style={{fontFamily:'Source Sans 3, serif', fontStyle:'italic', fontWeight:'700', color:'#c41e1e', fontSize:'11px', marginBottom:'-10px', paddingLeft:'1px', position:'relative', zIndex:2}}>Thomas</span>
                                    <span style={{fontFamily:'Oswald, sans-serif', fontWeight:'700', color:'#111', fontSize:'28px', lineHeight:1}}>wiLLwacher</span>
                                    <span style={{fontFamily:'Source Sans 3, sans-serif', fontWeight:'600', color:'#c41e1e', fontSize:'9px', letterSpacing:'1.5px', textAlign:'right'}}>Fliesenlegermeister e.K.</span>
                                </div>
                                <div style={{textAlign:'right', fontSize:'8px', color:'#555', lineHeight:'1.6'}}>
                                    Flurweg 14a<br/>56472 Nisterau<br/>Tel. 02661-63101<br/>Mobil 0170-2024161
                                </div>
                            </div>
                            <hr style={{border:'none', borderTop:'2px solid #c41e1e', margin:'8px 0 6px'}} />
                            <div style={{fontSize:'6px', color:'#aaa', borderBottom:'0.5px solid #ccc', display:'inline-block', paddingBottom:'1px', marginBottom:'12px'}}>
                                Thomas Willwacher Fliesenlegermeister e.K. {'\u00b7'} Flurweg 14a {'\u00b7'} 56472 Nisterau
                            </div>

                            {/* Empfaenger + Dokumentdaten */}
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'14px'}}>
                                <div>
                                    <div style={{fontWeight:'700', fontSize:'13px'}}>{kundenName || 'Kunde waehlen...'}</div>
                                    <div style={{fontSize:'11px', color:'#333', lineHeight:'1.5'}}>{kundenAdresse}</div>
                                </div>
                                <div style={{textAlign:'right'}}>
                                    <div style={{marginBottom:'6px'}}>
                                        <label style={{fontSize:'7px', color:'#999', display:'block'}}>Datum</label>
                                        <input type="date" value={rechnungsDatum} onChange={function(e){setRechnungsDatum(e.target.value);}}
                                            style={{padding:'4px 6px', border:'1px solid #ddd', borderRadius:'4px', fontSize:'11px', color:'#222', background:'#f9f9f9'}} />
                                    </div>
                                    <div style={{marginBottom:'4px'}}>
                                        <label style={{fontSize:'7px', color:'#999', display:'block'}}>{istRechnung ? 'Rechnungs-Nr.' : rechnungsTyp === 'nachtrag' ? 'Nachtrags-Nr.' : 'Angebots-Nr.'}</label>
                                        <input type="text" value={getDokumentNr()} onChange={function(e){
                                            if(rechnungsTyp === 'nachtrag') setNachtragsNr(e.target.value);
                                            else if(rechnungsTyp === 'angebot') setAngebotsNr(e.target.value);
                                            else setRechnungsNr(e.target.value);
                                        }} style={{padding:'4px 6px', border:'1px solid #ddd', borderRadius:'4px', fontSize:'11px', color:'#222', textAlign:'right', width:'110px', background:'#f9f9f9'}} />
                                    </div>
                                    <div>
                                        <label style={{fontSize:'7px', color:'#999', display:'block'}}>Auftrags-Nr.</label>
                                        <input type="text" value={auftragsnummer} onChange={function(e){setAuftragsnummer(e.target.value);}} placeholder="z.B. A-2026-001"
                                            style={{padding:'4px 6px', border:'1px solid #ddd', borderRadius:'4px', fontSize:'11px', color:'#222', textAlign:'right', width:'110px', background:'#f9f9f9'}} />
                                    </div>
                                </div>
                            </div>

                            {/* Dokumenttitel */}
                            <div style={{fontSize:'18px', fontWeight:'700', color:typCfg.color, marginBottom:'10px', fontFamily:'Oswald, sans-serif'}}>{typCfg.label}</div>

                            {/* Meta-Zeilen */}
                            <div style={{fontSize:'10px', color:'#555', marginBottom:'14px', lineHeight:'2'}}>
                                <div><span style={{display:'inline-block', width:'100px', color:'#888'}}>Bauvorhaben:</span> <span style={{fontWeight:'600', color:'#222'}}>{bauvorh}</span></div>
                                <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                                    <span style={{display:'inline-block', width:'100px', color:'#888'}}>Leistungszeitr.:</span>
                                    <input type="text" value={leistungszeitraum} onChange={function(e){setLeistungszeitraum(e.target.value);}} placeholder="z.B. 01.01. - 31.03.2026"
                                        style={{padding:'3px 6px', border:'1px solid #ddd', borderRadius:'4px', fontSize:'10px', color:'#222', flex:1, background:'#f9f9f9'}} />
                                </div>
                                <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                                    <span style={{display:'inline-block', width:'100px', color:'#888'}}>Kostenstelle:</span>
                                    <input type="text" value={kostenstelle} onChange={function(e){setKostenstelle(e.target.value);}} placeholder="optional"
                                        style={{padding:'3px 6px', border:'1px solid #ddd', borderRadius:'4px', fontSize:'10px', color:'#222', flex:1, background:'#f9f9f9'}} />
                                </div>
                                {rechnungsTyp === 'abschlag' && (
                                    <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                                        <span style={{display:'inline-block', width:'100px', color:'#888'}}>Abschlags-Nr.:</span>
                                        <input type="text" inputMode="numeric" value={abschlagNr} onChange={function(e){setAbschlagNr(parseInt(e.target.value)||1);}}
                                            style={{padding:'3px 6px', border:'1px solid #ddd', borderRadius:'4px', fontSize:'10px', color:'#222', width:'50px', textAlign:'center', background:'#f9f9f9'}} />
                                    </div>
                                )}
                                {rechnungsTyp === 'angebot' && (
                                    <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                                        <span style={{display:'inline-block', width:'100px', color:'#888'}}>Gueltig bis:</span>
                                        <input type="date" value={gueltigBis} onChange={function(e){setGueltigBis(e.target.value);}}
                                            style={{padding:'3px 6px', border:'1px solid #ddd', borderRadius:'4px', fontSize:'10px', color:'#222', background:'#f9f9f9'}} />
                                    </div>
                                )}
                            </div>

                            {/* Positions-Platzhalter */}
                            {!positionenGeladen ? (
                                <div style={{padding:'20px', border:'2px dashed #ccc', borderRadius:'8px', textAlign:'center', color:'#999', fontSize:'12px', marginBottom:'14px'}}>
                                    Positionen werden nach "Daten laden" hier angezeigt.
                                </div>
                            ) : (
                                <div style={{marginBottom:'14px'}}>
                                    <div style={{fontSize:'9px', fontWeight:'700', color:'#555', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px'}}>Positionen ({aktivePosn.length})</div>
                                    {aktivePosn.slice(0, 5).map(function(p) {
                                        var gp = (parseFloat(p.menge)||0)*(parseFloat(p.einzelpreis)||0);
                                        return (
                                            <div key={p.id} style={{display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:'1px solid #eee', fontSize:'10px'}}>
                                                <span style={{fontWeight:'700', color:typCfg.color, minWidth:'30px'}}>{p.pos}</span>
                                                <span style={{flex:1, padding:'0 6px', color:'#333'}}>{p.bez}</span>
                                                <span style={{fontWeight:'700', minWidth:'60px', textAlign:'right'}}>{fmt(gp)} {'\u20ac'}</span>
                                            </div>
                                        );
                                    })}
                                    {aktivePosn.length > 5 && <div style={{fontSize:'9px', color:'#999', textAlign:'center', padding:'4px'}}>... und {aktivePosn.length - 5} weitere</div>}
                                    <div style={{display:'flex', justifyContent:'space-between', padding:'6px 0', fontWeight:'700', fontSize:'11px', borderTop:'2px solid #222', marginTop:'4px'}}>
                                        <span>Brutto:</span><span>{fmt(bruttoSumme)} {'\u20ac'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Fusszeile */}
                            <div style={{borderTop:'1.5px solid #c41e1e', paddingTop:'6px', fontSize:'6px', color:'#999', lineHeight:'1.6'}}>
                                <div><span style={{fontStyle:'italic', color:'#c41e1e', fontWeight:'700'}}>Thomas </span><span style={{color:'#333', fontWeight:'700'}}>wiLLwacher</span> <span style={{color:'#c41e1e'}}>Fliesenlegermeister e.K.</span></div>
                                <div>Steuernummer: 30/220/1234/5 {'\u00b7'} Westerwald Bank eG {'\u00b7'} IBAN: DE12 5739 1800 0000 0000 00</div>
                            </div>
                        </div>

                        {/* Schlussrechnung: Kontozahlungen-Button */}
                        {rechnungsTyp === 'schluss' && (
                            <button onClick={ladeKontozahlungen} style={{
                                width:'100%', padding:'14px', marginBottom:'10px', borderRadius:'var(--radius-md)',
                                border:'2px solid #27ae60', background:'rgba(39,174,96,0.08)', color:'var(--success)',
                                fontSize:'14px', fontWeight:'700', fontFamily:'Oswald, sans-serif', textTransform:'uppercase',
                                letterSpacing:'0.8px', cursor:'pointer', touchAction:'manipulation',
                                display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
                                {'\ud83d\udcb3'} Kontozahlungen ({kontozahlungen.length}) {kontoSumme > 0 ? '- ' + fmt(kontoSumme) + ' \u20ac' : ''}
                            </button>
                        )}

                        {/* DATEN LADEN Button */}
                        <button onClick={function(){ setShowDatenLaden(true); }} style={{
                            width:'100%', padding:'16px', background:'linear-gradient(135deg, #1E88E5, #1565C0)',
                            color:'white', border:'none', borderRadius:'var(--radius-md)', fontSize:'15px', fontWeight:'700',
                            cursor:'pointer', boxShadow:'0 4px 12px rgba(30,136,229,0.3)',
                            display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                            fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'1px',
                            touchAction:'manipulation', transition:'all 0.25s ease', marginBottom:'10px'}}>
                            {'\ud83d\udce5'} Daten laden
                        </button>

                        {/* Weiter zum Formular (nur wenn Positionen geladen) */}
                        {positionenGeladen && (
                            <button onClick={function(){ setPhase('formular'); }} style={{
                                width:'100%', padding:'16px', borderRadius:'var(--radius-md)', border:'none',
                                background:'linear-gradient(135deg, var(--accent-orange) 0%, var(--accent-orange-light) 100%)',
                                color:'#fff', fontFamily:'Oswald, sans-serif', fontSize:'18px', fontWeight:'600',
                                letterSpacing:'2px', textTransform:'uppercase', cursor:'pointer',
                                transition:'all 0.3s', boxShadow:'var(--shadow-md)', touchAction:'manipulation', marginBottom:'10px'}}>
                                Weiter zur Bearbeitung {'\u2192'}
                            </button>
                        )}

                        {/* Zurueck */}
                        <button onClick={function(){ setPhase('typwahl'); setRechnungsTyp(null); setPositionenGeladen(false); setPositionen([]); }}
                            style={{width:'100%', padding:'12px 32px', borderRadius:'var(--radius-md)', border:'none',
                                background:'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))', color:'#fff', cursor:'pointer',
                                fontSize:'14px', fontWeight:'600', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'1px',
                                boxShadow:'0 4px 15px rgba(196, 30, 30, 0.3)', touchAction:'manipulation'}}>
                            {'\u2190'} Zurueck
                        </button>

                        {/* === DATEN LADEN MODAL === */}
                        {showDatenLaden && (
                            <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}
                                onClick={function(){ setShowDatenLaden(false); setShowPosAuswahl(false); }}>
                                <div onClick={function(e){e.stopPropagation();}} style={{background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:'28px 24px', maxWidth:'380px', width:'100%', boxShadow:'var(--shadow-lg)', animation:'scaleIn 0.3s ease-out'}}>
                                    {!showPosAuswahl ? (
                                        <div>
                                            <div style={{fontSize:'20px', fontWeight:'600', color:'var(--text-white)', marginBottom:'16px', fontFamily:'Oswald, sans-serif'}}>{'\ud83d\udce5'} Daten laden</div>
                                            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                                                {/* Option 1: Aufmass */}
                                                <button onClick={hatAufmass ? uebernahmeAusAufmass : undefined}
                                                    disabled={!hatAufmass}
                                                    style={{padding:'14px 16px', borderRadius:'var(--radius-md)', border:'1px solid ' + (hatAufmass ? 'rgba(39,174,96,0.3)' : 'var(--border-color)'),
                                                        background:hatAufmass ? 'rgba(39,174,96,0.08)' : 'var(--bg-tertiary)', cursor:hatAufmass ? 'pointer' : 'not-allowed',
                                                        display:'flex', alignItems:'center', gap:'12px', textAlign:'left', opacity:hatAufmass ? 1 : 0.4, touchAction:'manipulation'}}>
                                                    <span style={{fontSize:'24px'}}>{'\ud83d\udcd0'}</span>
                                                    <div>
                                                        <div style={{fontSize:'14px', fontWeight:'700', color:hatAufmass ? 'var(--success)' : 'var(--text-muted)'}}>Neu erstelltes Aufmass</div>
                                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>Positionen + Massen aus Aufmass uebernehmen</div>
                                                    </div>
                                                </button>
                                                {/* Option 2: Kundenpositionen */}
                                                <button onClick={ladeKundenpositionen}
                                                    style={{padding:'14px 16px', borderRadius:'var(--radius-md)', border:'1px solid rgba(30,136,229,0.3)',
                                                        background:'rgba(30,136,229,0.08)', cursor:'pointer',
                                                        display:'flex', alignItems:'center', gap:'12px', textAlign:'left', touchAction:'manipulation'}}>
                                                    <span style={{fontSize:'24px'}}>{'\ud83d\udccb'}</span>
                                                    <div>
                                                        <div style={{fontSize:'14px', fontWeight:'700', color:'var(--accent-blue)'}}>Kundenpositionen</div>
                                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>LV-Positionen auswaehlen ({lvPositionen.length} verfuegbar)</div>
                                                    </div>
                                                </button>
                                                {/* Option 3: Datei hochladen */}
                                                <button onClick={handleFileUpload}
                                                    style={{padding:'14px 16px', borderRadius:'var(--radius-md)', border:'1px solid rgba(230,126,34,0.3)',
                                                        background:'rgba(230,126,34,0.08)', cursor:'pointer',
                                                        display:'flex', alignItems:'center', gap:'12px', textAlign:'left', touchAction:'manipulation'}}>
                                                    <span style={{fontSize:'24px'}}>{'\ud83d\udcc2'}</span>
                                                    <div>
                                                        <div style={{fontSize:'14px', fontWeight:'700', color:'var(--accent-orange)'}}>Datei hochladen</div>
                                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>PDF, XLSX, CSV oder JSON importieren</div>
                                                    </div>
                                                </button>
                                            </div>
                                            <button onClick={function(){ setShowDatenLaden(false); }}
                                                style={{width:'100%', marginTop:'14px', padding:'10px', background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', color:'var(--text-muted)', fontSize:'13px', cursor:'pointer', touchAction:'manipulation'}}>
                                                Abbrechen
                                            </button>
                                        </div>
                                    ) : (
                                        /* Positionsauswahl-Ansicht (Option 2) */
                                        <div>
                                            <div style={{fontSize:'16px', fontWeight:'600', color:'var(--text-white)', marginBottom:'12px', fontFamily:'Oswald, sans-serif'}}>Positionen auswaehlen</div>
                                            <div style={{maxHeight:'300px', overflow:'auto', marginBottom:'12px'}}>
                                                {lvPositionen.map(function(p, i) {
                                                    var checked = posAuswahl[i] !== false;
                                                    return (
                                                        <div key={i} style={{padding:'8px 10px', borderBottom:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:'8px', opacity:checked ? 1 : 0.4}}>
                                                            <input type="checkbox" checked={checked} onChange={function(){ setPosAuswahl(function(prev){ var n = Object.assign({}, prev); n[i] = !checked; return n; }); }} />
                                                            <div style={{flex:1}}>
                                                                <span style={{fontWeight:'700', fontSize:'11px', color:'var(--accent-blue)'}}>{p.pos || p.posNr}</span>
                                                                <span style={{fontSize:'11px', marginLeft:'6px'}}>{p.bez || p.titel}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {lvPositionen.length === 0 && <div style={{textAlign:'center', padding:'20px', color:'var(--text-muted)', fontSize:'12px'}}>Keine LV-Positionen verfuegbar.</div>}
                                            </div>
                                            <div style={{display:'flex', gap:'8px'}}>
                                                <button onClick={function(){ setShowPosAuswahl(false); }} style={{flex:1, padding:'10px', background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', color:'var(--text-muted)', fontSize:'13px', cursor:'pointer'}}>{'\u2190'} Zurueck</button>
                                                <button onClick={function(){
                                                    var selected = lvPositionen.filter(function(p, i){ return posAuswahl[i] !== false; });
                                                    if (selected.length > 0) initPositionen(selected);
                                                    else { setPositionen([]); setPositionenGeladen(true); setShowDatenLaden(false); setShowPosAuswahl(false); }
                                                }} style={{flex:2, padding:'10px', background:'var(--accent-blue)', color:'white', border:'none', borderRadius:'var(--radius-md)', fontSize:'13px', fontWeight:'700', cursor:'pointer'}}>
                                                    Uebernehmen
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* === KONTOZAHLUNGEN MODAL === */}
                        {showKontoDialog && (
                            <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}
                                onClick={function(){ setShowKontoDialog(false); }}>
                                <div onClick={function(e){e.stopPropagation();}} style={{background:'var(--bg-secondary)', borderRadius:'var(--radius-lg)', padding:'28px 24px', maxWidth:'420px', width:'100%', boxShadow:'var(--shadow-lg)', maxHeight:'80vh', overflow:'auto'}}>
                                    <div style={{fontSize:'18px', fontWeight:'600', color:'var(--text-white)', marginBottom:'14px', fontFamily:'Oswald, sans-serif'}}>{'\ud83d\udcb3'} Geleistete A-Kontozahlungen</div>
                                    {kontozahlungen.length === 0 ? (
                                        <div style={{textAlign:'center', padding:'20px', color:'var(--text-muted)', fontSize:'13px'}}>Keine Abschlagsrechnungen im Ausgangsbuch fuer diesen Kunden.</div>
                                    ) : (
                                        <div style={{display:'flex', flexDirection:'column', gap:'6px', marginBottom:'14px'}}>
                                            {kontozahlungen.map(function(k, idx) {
                                                return (
                                                    <div key={k.id || idx} style={{padding:'10px 12px', background:'var(--bg-card)', borderRadius:'8px', display:'flex', alignItems:'center', gap:'10px'}}>
                                                        <input type="checkbox" checked={k.aufgefuehrt} onChange={function(){
                                                            setKontozahlungen(function(prev){ return prev.map(function(kk, ki){ return ki === idx ? Object.assign({}, kk, { aufgefuehrt: !kk.aufgefuehrt }) : kk; }); });
                                                        }} />
                                                        <div style={{flex:1}}>
                                                            <div style={{fontSize:'12px', fontWeight:'700', color:'var(--accent-blue)'}}>{k.nr}</div>
                                                            <div style={{fontSize:'10px', color:'var(--text-muted)'}}>{k.datum}</div>
                                                        </div>
                                                        <div style={{fontSize:'13px', fontWeight:'700'}}>{fmt(k.betrag)} {'\u20ac'}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', fontWeight:'700', borderTop:'2px solid var(--border-color)', marginBottom:'12px'}}>
                                        <span>Summe:</span><span style={{color:'var(--success)'}}>{fmt(kontoSumme)} {'\u20ac'}</span>
                                    </div>
                                    <button onClick={function(){ setShowKontoDialog(false); }}
                                        style={{width:'100%', padding:'12px', background:'var(--success)', color:'white', border:'none', borderRadius:'var(--radius-md)', fontSize:'14px', fontWeight:'700', fontFamily:'Oswald, sans-serif', cursor:'pointer', touchAction:'manipulation'}}>
                                        Uebernehmen
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            }

            // =================================================================
            // PHASE 3: Rechnungsformular (Bearbeitungsansicht)
            // =================================================================
            return (
                <div className="page-container" style={{padding:'16px', minHeight:'100vh', paddingBottom:'80px'}}>
                    {/* Header */}
                    <div style={{textAlign:'center', marginBottom:'14px'}}>
                        <FirmenLogo size="small" />
                        <div style={{marginTop:'8px', fontSize:'15px', fontWeight:'700', color:typCfg.color, fontFamily:'Oswald, sans-serif'}}>{typCfg.label}</div>
                        <div style={{fontSize:'11px', color:'var(--text-muted)'}}>{kunde ? kunde.name : ''}</div>
                    </div>

                    {/* Rechnungskopf */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'14px', marginBottom:'10px', border:'1px solid var(--border-color)'}}>
                        <div style={{fontSize:'12px', fontWeight:'700', color:typCfg.color, marginBottom:'10px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Dokumentdaten</div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
                            <div>
                                <label style={labelStyle}>{istRechnung ? 'Rechnungs-Nr.' : rechnungsTyp === 'nachtrag' ? 'Nachtrags-Nr.' : 'Angebots-Nr.'}</label>
                                <div style={{display:'flex', gap:'3px'}}>
                                    <input type="text" value={getDokumentNr()} onChange={function(e){
                                        if(rechnungsTyp === 'nachtrag') setNachtragsNr(e.target.value);
                                        else if(rechnungsTyp === 'angebot') setAngebotsNr(e.target.value);
                                        else setRechnungsNr(e.target.value);
                                    }} style={Object.assign({}, inputStyle, {flex:1})} />
                                    {typeof MicButton !== 'undefined' && <MicButton fieldKey="re_nr" size="small" onResult={function(t){
                                        if(rechnungsTyp === 'nachtrag') setNachtragsNr(nachtragsNr+t);
                                        else if(rechnungsTyp === 'angebot') setAngebotsNr(angebotsNr+t);
                                        else setRechnungsNr(rechnungsNr+t);
                                    }} />}
                                </div>
                            </div>
                            <div><label style={labelStyle}>Datum</label>
                                <input type="date" value={rechnungsDatum} onChange={function(e){setRechnungsDatum(e.target.value);}} style={inputStyle} /></div>
                            <div style={{gridColumn:'span 2'}}>
                                <label style={labelStyle}>Leistungszeitraum</label>
                                <div style={{display:'flex', gap:'3px'}}>
                                    <input type="text" value={leistungszeitraum} onChange={function(e){setLeistungszeitraum(e.target.value);}} placeholder="z.B. 01.01. - 31.03.2026" style={Object.assign({}, inputStyle, {flex:1})} />
                                    {typeof MicButton !== 'undefined' && <MicButton fieldKey="re_lz" size="small" onResult={function(t){setLeistungszeitraum((leistungszeitraum||'')+' '+t);}} />}
                                </div>
                            </div>
                            {rechnungsTyp === 'abschlag' && <div><label style={labelStyle}>Abschlags-Nr.</label>
                                <input type="text" inputMode="numeric" value={abschlagNr} onChange={function(e){setAbschlagNr(parseInt(e.target.value)||1);}} style={inputStyle} /></div>}
                            <div><label style={labelStyle}>Auftragsnummer</label>
                                <input type="text" value={auftragsnummer} onChange={function(e){setAuftragsnummer(e.target.value);}} placeholder="z.B. A-2026-001" style={inputStyle} /></div>
                            <div><label style={labelStyle}>Kostenstelle</label>
                                <input type="text" value={kostenstelle} onChange={function(e){setKostenstelle(e.target.value);}} placeholder="optional" style={inputStyle} /></div>
                            {rechnungsTyp === 'angebot' && <div><label style={labelStyle}>Gueltig bis</label>
                                <input type="date" value={gueltigBis} onChange={function(e){setGueltigBis(e.target.value);}} style={inputStyle} /></div>}
                        </div>
                    </div>

                    {/* Positionen */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'14px', marginBottom:'10px', border:'1px solid var(--border-color)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                            <div style={{fontSize:'12px', fontWeight:'700', color:typCfg.color, fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Positionen ({aktivePosn.length})</div>
                            <button onClick={addPosition} style={{padding:'5px 12px', fontSize:'11px', background:typCfg.color, color:'white', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontFamily:'Oswald, sans-serif', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px', touchAction:'manipulation'}}>+ Neu</button>
                        </div>
                        <div style={{display:'grid', gridTemplateColumns:'28px 38px 52px 36px 1fr 62px 68px', gap:'2px', padding:'4px 2px', fontSize:'9px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'2px solid var(--border-color)', fontFamily:'Oswald, sans-serif'}}>
                            <span></span><span>Pos.</span><span style={{textAlign:'right'}}>Menge</span><span style={{textAlign:'center'}}>Einh.</span><span>Bezeichnung</span><span style={{textAlign:'right'}}>EP</span><span style={{textAlign:'right'}}>GP</span>
                        </div>
                        {positionen.length === 0 ? (
                            <div style={{textAlign:'center', padding:'20px', color:'var(--text-muted)', fontSize:'12px'}}>Keine Positionen. Klicke "+ Neu" oder lade Daten.</div>
                        ) : (
                            <div>{positionen.map(function(p) {
                                var gp = (parseFloat(p.menge)||0) * (parseFloat(p.einzelpreis)||0);
                                return (
                                    <div key={p.id} style={{display:'grid', gridTemplateColumns:'28px 38px 52px 36px 1fr 62px 68px', gap:'2px', padding:'6px 2px', borderBottom:'1px solid var(--border-color)', alignItems:'start', opacity:p.aktiv ? 1 : 0.3}}>
                                        <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', paddingTop:'2px'}}>
                                            <input type="checkbox" checked={p.aktiv} onChange={function(){updatePos(p.id,'aktiv',!p.aktiv);}} />
                                            <button onClick={function(){removePosition(p.id);}} style={{background:'none', border:'none', color:'var(--accent-red-light)', fontSize:'10px', cursor:'pointer', padding:0, lineHeight:1}}>{'\u2715'}</button>
                                        </div>
                                        <input type="text" value={p.pos} onChange={function(e){updatePos(p.id,'pos',e.target.value);}}
                                            style={{padding:'4px 3px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'11px', fontWeight:'700', color:typCfg.color, textAlign:'center', width:'100%', boxSizing:'border-box'}} />
                                        <input type="text" inputMode="decimal" value={p.menge || ''} onChange={function(e){updatePos(p.id,'menge',e.target.value);}} placeholder="0,00"
                                            onBlur={function(e){ var v = parseFloat(e.target.value); updatePos(p.id, 'menge', isNaN(v) ? 0 : Number(v.toFixed(3))); }}
                                            style={{padding:'4px 4px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'11px', color:'var(--text-primary)', textAlign:'right', width:'100%', boxSizing:'border-box'}} />
                                        <input type="text" value={p.einheit} onChange={function(e){updatePos(p.id,'einheit',e.target.value);}}
                                            style={{padding:'4px 2px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'10px', color:'var(--text-primary)', textAlign:'center', width:'100%', boxSizing:'border-box'}} />
                                        <div style={{padding:0}}>
                                            <div contentEditable={true} suppressContentEditableWarning={true}
                                                onBlur={function(e){updatePos(p.id,'bez',e.target.innerText);}}
                                                style={{padding:'4px 6px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'11px', color:'var(--text-primary)', lineHeight:'1.4', minHeight:'28px', wordBreak:'break-word', outline:'none'}}>
                                                {p.bez}
                                            </div>
                                        </div>
                                        <input type="text" inputMode="decimal" value={p.einzelpreis || ''} onChange={function(e){updatePos(p.id,'einzelpreis',e.target.value);}} placeholder="0,00"
                                            onBlur={function(e){ var v = parseFloat(e.target.value); updatePos(p.id, 'einzelpreis', isNaN(v) ? 0 : Number(v.toFixed(2))); }}
                                            style={{padding:'4px 4px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'11px', color:'var(--text-primary)', textAlign:'right', width:'100%', boxSizing:'border-box'}} />
                                        <div style={{fontSize:'12px', fontWeight:'700', textAlign:'right', padding:'4px 2px', color:typCfg.color}}>{fmt(gp)} {'\u20ac'}</div>
                                    </div>
                                );
                            })}</div>
                        )}
                    </div>

                    {/* Konditionen (nur fuer Rechnungen) */}
                    {istRechnung && (
                        <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'14px', marginBottom:'10px', border:'1px solid var(--border-color)'}}>
                            <div style={{fontSize:'12px', fontWeight:'700', color:'var(--text-secondary)', marginBottom:'8px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Konditionen</div>
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'6px'}}>
                                <div><label style={labelStyle}>Skonto %</label>
                                    <input type="text" inputMode="decimal" value={skontoProzent} onChange={function(e){setSkontoProzent(parseFloat(e.target.value)||0);}} style={smallInputStyle} /></div>
                                <div><label style={labelStyle}>Skonto Tage</label>
                                    <input type="text" inputMode="numeric" value={skontoTage} onChange={function(e){setSkontoTage(parseInt(e.target.value)||0);}} style={smallInputStyle} /></div>
                                <div><label style={labelStyle}>Zahlungsziel</label>
                                    <input type="text" inputMode="numeric" value={zahlungszielTage} onChange={function(e){setZahlungszielTage(parseInt(e.target.value)||0);}} style={smallInputStyle} /></div>
                                <div><label style={labelStyle}>Einbehalt %</label>
                                    <input type="text" inputMode="decimal" value={sicherheitseinbehalt} onChange={function(e){setSicherheitseinbehalt(parseFloat(e.target.value)||0);}} style={smallInputStyle} /></div>
                            </div>
                        </div>
                    )}

                    {/* Bemerkung */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'14px', marginBottom:'10px', border:'1px solid var(--border-color)'}}>
                        <label style={Object.assign({}, labelStyle, {fontWeight:'700', color:'var(--text-secondary)', marginBottom:'6px'})}>Bemerkung</label>
                        <textarea value={bemerkung} onChange={function(e){setBemerkung(e.target.value);}} rows={2} placeholder="Optionaler Zusatztext auf dem Dokument..."
                            style={{width:'100%', padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'13px', color:'var(--text-primary)', resize:'vertical', boxSizing:'border-box', fontFamily:'Source Sans 3, sans-serif'}} />
                    </div>

                    {/* Summenblock */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'14px', marginBottom:'10px', border:'1px solid var(--border-color)', boxShadow:'0 2px 8px rgba(0,0,0,0.12)'}}>
                        <div style={{fontSize:'12px', fontWeight:'700', color:'var(--text-secondary)', marginBottom:'8px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>Berechnung</div>
                        <div style={{fontSize:'13px', lineHeight:'2'}}>
                            <div style={{display:'flex', justifyContent:'space-between'}}><span>Nettobetrag:</span><span style={{fontWeight:'600'}}>{fmt(nettoSumme)} {'\u20ac'}</span></div>
                            <div style={{display:'flex', justifyContent:'space-between', color:'var(--text-muted)', fontSize:'12px'}}><span>zzgl. MwSt. {mwstSatz}%:</span><span>{fmt(mwstBetrag)} {'\u20ac'}</span></div>
                            <div style={{display:'flex', justifyContent:'space-between', fontWeight:'700', fontSize:'16px', borderTop:'2px solid var(--border-color)', paddingTop:'4px', marginTop:'2px'}}><span>Bruttobetrag:</span><span>{fmt(bruttoSumme)} {'\u20ac'}</span></div>
                            {istRechnung && sicherheitseinbehalt > 0 && <div style={{display:'flex', justifyContent:'space-between', color:'var(--text-muted)', fontSize:'11px'}}><span>abzgl. Einbehalt {sicherheitseinbehalt}%:</span><span>{'\u2013'} {fmt(sicherheitBetrag)} {'\u20ac'}</span></div>}
                            {istRechnung && (
                                <div>
                                    <div style={{display:'flex', justifyContent:'space-between', color:typCfg.color, fontWeight:'700', marginTop:'2px', fontSize:'13px'}}>
                                        <span>Mit Skonto ({skontoProzent}%, {skontoTage} T.):</span><span>{fmt(zahlbetragMitSkonto)} {'\u20ac'}</span>
                                    </div>
                                    <div style={{display:'flex', justifyContent:'space-between', fontWeight:'600', fontSize:'13px'}}>
                                        <span>Netto ({zahlungszielTage} Tage):</span><span>{fmt(zahlbetragOhneSkonto)} {'\u20ac'}</span>
                                    </div>
                                </div>
                            )}
                            {rechnungsTyp === 'schluss' && kontoSumme > 0 && (
                                <div>
                                    <div style={{display:'flex', justifyContent:'space-between', color:'var(--text-muted)', fontSize:'12px', marginTop:'4px'}}><span>abzgl. Kontozahlungen:</span><span>{'\u2013'} {fmt(kontoSumme)} {'\u20ac'}</span></div>
                                    <div style={{display:'flex', justifyContent:'space-between', fontWeight:'700', fontSize:'16px', color:typCfg.color, borderTop:'2px solid ' + typCfg.color, paddingTop:'4px', marginTop:'4px'}}>
                                        <span>Restforderung:</span><span>{fmt(restforderung)} {'\u20ac'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* E-Mail Dialog */}
                    {showMailDialog && (
                        <div className="modal-overlay" onClick={function(){ setShowMailDialog(false); }}>
                            <div className="modal" onClick={function(e){ e.stopPropagation(); }} style={{maxWidth:'380px'}}>
                                <div style={{fontSize:'18px', fontWeight:'600', color:'var(--text-white)', marginBottom:'12px', fontFamily:'Oswald, sans-serif'}}>Dokument per E-Mail senden</div>
                                <div style={{marginBottom:'12px'}}>
                                    <div style={{fontSize:'12px', color:'var(--text-muted)', marginBottom:'10px', lineHeight:'1.5'}}>
                                        Das Dokument wird als PDF erstellt und Ihr E-Mail-Programm geoeffnet.
                                    </div>
                                    <label style={labelStyle}>Empfaenger E-Mail-Adresse</label>
                                    <input type="email" value={mailAdresse} onChange={function(e){ setMailAdresse(e.target.value); }} placeholder="empfaenger@firma.de"
                                        style={Object.assign({}, inputStyle, {fontSize:'14px'})} autoFocus />
                                    <div style={{display:'flex', gap:'4px', marginTop:'6px', flexWrap:'wrap'}}>
                                        {kunde.ag_email && kunde.ag_email !== mailAdresse && (
                                            <button onClick={function(){ setMailAdresse(kunde.ag_email); }} style={{padding:'4px 8px', fontSize:'10px', background:'rgba(30,136,229,0.1)', color:'var(--accent-blue)', border:'1px solid rgba(30,136,229,0.2)', borderRadius:'6px', cursor:'pointer'}}>AG: {kunde.ag_email}</button>
                                        )}
                                        {kunde.bl_email && kunde.bl_email !== mailAdresse && (
                                            <button onClick={function(){ setMailAdresse(kunde.bl_email); }} style={{padding:'4px 8px', fontSize:'10px', background:'rgba(39,174,96,0.1)', color:'var(--success)', border:'1px solid rgba(39,174,96,0.2)', borderRadius:'6px', cursor:'pointer'}}>BL: {kunde.bl_email}</button>
                                        )}
                                    </div>
                                </div>
                                <div style={{display:'flex', gap:'8px'}}>
                                    <button onClick={function(){ setShowMailDialog(false); }} style={{flex:1, padding:'10px', background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', color:'var(--text-muted)', fontSize:'13px', cursor:'pointer'}}>Abbrechen</button>
                                    <button onClick={confirmAndSend} style={{flex:2, padding:'10px', background:'linear-gradient(135deg, #e67e22, #d35400)', color:'white', border:'none', borderRadius:'var(--radius-md)', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'Oswald, sans-serif'}}>PDF erstellen + Mail</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Fixed Bottom Bar */}
                    <div style={{position:'fixed', bottom:0, left:0, right:0, padding:'10px 16px', background:'var(--bg-primary)', borderTop:'1px solid var(--border-color)', zIndex:100}}>
                        <div style={{display:'flex', gap:'8px', marginBottom:showFormatWahl ? '8px' : '0'}}>
                            <button onClick={function(){ setPhase('startseite'); }} style={{padding:'12px 10px', background:'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))', color:'white', border:'none', borderRadius:'var(--radius-md)', fontSize:'12px', cursor:'pointer', touchAction:'manipulation', minWidth:'44px', minHeight:'44px', fontFamily:'Oswald, sans-serif', fontWeight:'600'}}>{'\u2190'}</button>
                            <button onClick={function(){ setShowFormatWahl(!showFormatWahl); }}
                                style={{flex:1, padding:'12px', background:'linear-gradient(135deg, ' + typCfg.color + ', ' + typCfg.color + 'cc)', color:'white', border:'none', borderRadius:'var(--radius-md)', fontSize:'14px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', touchAction:'manipulation', minHeight:'48px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.8px'}}>
                                Dokument erstellen {showFormatWahl ? '\u25bc' : '\u25b2'}
                            </button>
                            <button onClick={openMailDialog}
                                style={{padding:'12px 16px', background:'linear-gradient(135deg, #e67e22, #d35400)', color:'white', border:'none', borderRadius:'var(--radius-md)', fontSize:'13px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.2)', touchAction:'manipulation', minHeight:'48px'}}>{'\u2709\ufe0f'}</button>
                        </div>

                        {/* Format-Auswahl Panel */}
                        {showFormatWahl && (
                            <div style={{display:'flex', flexDirection:'column', gap:'6px', padding:'8px 0 4px', animation:'fadeIn 0.15s ease'}}>
                                <button onClick={function(){ generatePDF(); setShowFormatWahl(false); }}
                                    style={{width:'100%', padding:'14px 16px', borderRadius:'12px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', textAlign:'left', touchAction:'manipulation', minHeight:'56px'}}>
                                    <span style={{fontSize:'24px'}}>{'\ud83d\udcc4'}</span>
                                    <div style={{flex:1}}>
                                        <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)'}}>PDF-{istRechnung ? 'Rechnung' : 'Dokument'}</div>
                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>Standard-PDF fuer Druck und Versand</div>
                                    </div>
                                </button>
                                {istRechnung && (
                                    <div>
                                        <button onClick={function(){ downloadZUGFeRD(); setShowFormatWahl(false); }}
                                            style={{width:'100%', padding:'14px 16px', borderRadius:'12px', border:'1px solid rgba(39,174,96,0.3)', background:'rgba(39,174,96,0.05)', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', textAlign:'left', touchAction:'manipulation', minHeight:'56px', marginBottom:'6px'}}>
                                            <span style={{fontSize:'24px'}}>{'\ud83d\udccb'}</span>
                                            <div style={{flex:1}}>
                                                <div style={{fontSize:'14px', fontWeight:'700', color:'var(--success)'}}>ZUGFeRD E-Rechnung</div>
                                                <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>PDF + XML (EN16931) fuer B2B</div>
                                            </div>
                                            <span style={{fontSize:'11px', color:'var(--success)', background:'rgba(39,174,96,0.1)', padding:'3px 8px', borderRadius:'6px', fontWeight:'600'}}>B2B</span>
                                        </button>
                                        <button onClick={function(){ downloadXRechnung(); setShowFormatWahl(false); }}
                                            style={{width:'100%', padding:'14px 16px', borderRadius:'12px', border:'1px solid rgba(30,136,229,0.3)', background:'rgba(30,136,229,0.05)', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', textAlign:'left', touchAction:'manipulation', minHeight:'56px'}}>
                                            <span style={{fontSize:'24px'}}>{'\ud83c\udfdb\ufe0f'}</span>
                                            <div style={{flex:1}}>
                                                <div style={{fontSize:'14px', fontWeight:'700', color:'var(--accent-blue)'}}>XRechnung</div>
                                                <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>Reines XML (CII) fuer Behoerden</div>
                                            </div>
                                            <span style={{fontSize:'11px', color:'var(--accent-blue)', background:'rgba(30,136,229,0.1)', padding:'3px 8px', borderRadius:'6px', fontWeight:'600'}}>B2G</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
