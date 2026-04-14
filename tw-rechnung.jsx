        function RechnungsModul({ kunde, importResult, gesamtliste, aufmassGespeichert, onBack }) {
            // -- Phasen: 'typwahl' -> 'posauswahl' -> 'formular' --
            const [phase, setPhase] = useState('typwahl');
            const [rechnungsTyp, setRechnungsTyp] = useState(null);
            const [positionen, setPositionen] = useState([]);
            const [rechnungsNr, setRechnungsNr] = useState('');
            const [rechnungsDatum, setRechnungsDatum] = useState(new Date().toISOString().split('T')[0]);
            const [leistungszeitraum, setLeistungszeitraum] = useState('');
            const [auftragsnummer, setAuftragsnummer] = useState('');
            const [kostenstelle, setKostenstelle] = useState('');
            const [skontoProzent, setSkontoProzent] = useState(2);
            const [skontoTage, setSkontoTage] = useState(10);
            const [zahlungszielTage, setZahlungszielTage] = useState(30);
            const [sicherheitseinbehalt, setSicherheitseinbehalt] = useState(5);
            const [abschlagNr, setAbschlagNr] = useState(1);
            const [bisherAbgerechnet, setBisherAbgerechnet] = useState(0);
            const [bemerkung, setBemerkung] = useState('');
            const [posAuswahl, setPosAuswahl] = useState({});
            // Neue States fuer Nachtrag + Angebot
            const [nachtragsNr, setNachtragsNr] = useState('');
            const [angebotsNr, setAngebotsNr] = useState('');
            const [gueltigBis, setGueltigBis] = useState('');
            // Kontozahlungen fuer Schlussrechnung
            const [kontozahlungen, setKontozahlungen] = useState([]);
            const [showKontoDialog, setShowKontoDialog] = useState(false);

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

            // Auto Rechnungsnummer / Nachtragsnummer / Angebotsnummer
            useEffect(function() {
                var year = new Date().getFullYear();
                var rand = String(Math.floor(Math.random() * 900) + 100);
                setRechnungsNr('RE-' + year + '-' + rand);
                setNachtragsNr('NT-' + year + '-' + rand);
                setAngebotsNr('AG-' + year + '-' + rand);
            }, []);

            // Positionen initialisieren wenn Phase wechselt
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
                    return { id: i, pos: p.pos || p.posNr || String(i+1), bez: p.bez || p.titel || '', einheit: p.einheit || 'm\u00B2', menge: menge, einzelpreis: ep, aktiv: true };
                }));
            };

            // Aus Aufmass uebernehmen: NUR Positionen mit berechneten Massen > 0
            var uebernahmeAusAufmass = function() {
                var merged = [];
                var seen = {};
                lvPositionen.forEach(function(lv) {
                    var key = lv.pos || lv.posNr;
                    var aufmM = aufmassMassen[key] || 0;
                    if (aufmM <= 0) return; // NUR berechnete Positionen
                    var ep = parseFloat(lv.einzelpreis) || parseFloat(lv.ep) || 0;
                    merged.push({ id: merged.length, pos: key, bez: lv.bez || lv.titel || '', einheit: lv.einheit || 'm\u00B2', menge: aufmM, einzelpreis: ep, aktiv: true });
                    seen[key] = true;
                });
                Object.keys(aufmassMassen).forEach(function(key) {
                    if (!seen[key] && aufmassMassen[key] > 0) {
                        merged.push({ id: merged.length, pos: key, bez: 'Position ' + key, einheit: 'm\u00B2', menge: aufmassMassen[key], einzelpreis: 0, aktiv: true });
                    }
                });
                if (merged.length === 0) {
                    alert('Keine berechneten Aufmass-Positionen gefunden.\nBitte erst im Aufmass-Modul Positionen berechnen.');
                    return;
                }
                setPositionen(merged);
                setPhase('formular');
            };

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
                setPositionen(function(prev) { return prev.concat([{ id: maxId+1, pos: String(prev.length+1), bez: '', einheit: 'm\u00B2', menge: 0, einzelpreis: 0, aktiv: true }]); });
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
            var sicherheitBetrag = bruttoSumme * sicherheitseinbehalt / 100;
            var skontoBetrag = (bruttoSumme - sicherheitBetrag) * skontoProzent / 100;
            var zahlbetragMitSkonto = bruttoSumme - sicherheitBetrag - skontoBetrag;
            var zahlbetragOhneSkonto = bruttoSumme - sicherheitBetrag;

            // Kontozahlungen laden (fuer Schlussrechnung)
            var ladeKontozahlungen = function() {
                try {
                    var abData = JSON.parse(localStorage.getItem('tw_ausgangsbuch') || '[]');
                    var kundeId = kunde._driveFolderId || kunde.id || kunde.name || '';
                    var abschlaege = abData.filter(function(e) {
                        return e.kundeId === kundeId && e.rechnungsTyp === 'abschlag';
                    });
                    setKontozahlungen(abschlaege.map(function(a) {
                        return { id: a.id, nr: a.rechnungsNr, datum: a.datum, betrag: a.bruttoBetrag, aufgefuehrt: true };
                    }));
                } catch(e) { console.warn('Kontozahlungen laden fehlgeschlagen:', e); }
            };
            var kontoSumme = kontozahlungen.filter(function(k) { return k.aufgefuehrt; }).reduce(function(s, k) { return s + (parseFloat(k.betrag) || 0); }, 0);

            // Dokumentnummer je nach Typ
            var getDokumentNr = function() {
                if (rechnungsTyp === 'nachtrag') return nachtragsNr;
                if (rechnungsTyp === 'angebot') return angebotsNr;
                return rechnungsNr;
            };
            var istRechnung = rechnungsTyp === 'abschlag' || rechnungsTyp === 'schluss' || rechnungsTyp === 'einzel';

            // CSS: Pfeiltasten bei number-inputs entfernen
            var noSpinnerCSS = '<style>input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}input[type=number]{-moz-appearance:textfield;}</style>';

            var inputStyle = {width:'100%', padding:'8px 10px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'13px', color:'var(--text-primary)', boxSizing:'border-box'};
            var smallInputStyle = Object.assign({}, inputStyle, {padding:'6px 8px', fontSize:'12px', textAlign:'right'});

            // ============================================================
            // PDF-EXPORT -- Komplett ueberarbeitetes Layout
            // ============================================================
            var generatePDF = function() {
                // --- Ausgangsbuch-Eintrag (nur fuer Rechnungen) ---
                if (istRechnung) {
                    try {
                        var abKey = 'tw_ausgangsbuch';
                        var abData = JSON.parse(localStorage.getItem(abKey) || '[]');
                        var isDuplicate = abData.some(function(e) { return e.rechnungsNr === rechnungsNr && e.datum === rechnungsDatum; });
                        if (!isDuplicate && rechnungsNr) {
                            var typLabel2 = rechnungsTyp === 'abschlag' ? (abschlagNr + '. Abschlagsrechnung')
                                : rechnungsTyp === 'schluss' ? 'Schlussrechnung' : 'Rechnung';
                            var zahlungszielDatum = new Date(rechnungsDatum);
                            zahlungszielDatum.setDate(zahlungszielDatum.getDate() + zahlungszielTage);
                            abData.push({
                                id: 'RE_' + Date.now(),
                                rechnungsNr: rechnungsNr,
                                typ: typLabel2,
                                rechnungsTyp: rechnungsTyp,
                                datum: rechnungsDatum,
                                kunde: kunde.auftraggeber || kunde.name || '',
                                kundeId: kunde._driveFolderId || kunde.id || kunde.name || '',
                                bauvorhaben: kunde.adresse || kunde.baumassnahme || '',
                                nettoBetrag: nettoSumme,
                                mwstBetrag: mwstBetrag,
                                mwstSatz: mwstSatz,
                                bruttoBetrag: bruttoSumme,
                                sicherheitseinbehalt: sicherheitBetrag,
                                skontoProzent: skontoProzent,
                                skontoTage: skontoTage,
                                zahlungszielTage: zahlungszielTage,
                                zahlungszielDatum: zahlungszielDatum.toISOString().split('T')[0],
                                zahlbetrag: zahlbetragOhneSkonto,
                                auftragsnummer: auftragsnummer,
                                kostenstelle: kostenstelle,
                                leistungszeitraum: leistungszeitraum,
                                anzahlPositionen: aktivePosn.length,
                                status: 'offen',
                                zahlungsDatum: null,
                                zahlungsBetrag: null,
                                notiz: '',
                                erstelltAm: new Date().toISOString()
                            });
                            localStorage.setItem(abKey, JSON.stringify(abData));
                            console.log('Rechnung ' + rechnungsNr + ' ins Ausgangsbuch gespeichert');
                        }
                    } catch(abErr) { console.warn('Ausgangsbuch-Speichern fehlgeschlagen:', abErr); }
                }

                // Dokumenttyp-Label
                var typLabel = rechnungsTyp === 'abschlag' ? (abschlagNr + '. Abschlagsrechnung')
                    : rechnungsTyp === 'schluss' ? 'Schlussrechnung'
                    : rechnungsTyp === 'nachtrag' ? ('Nachtrag Nr. ' + nachtragsNr)
                    : rechnungsTyp === 'angebot' ? ('Angebot Nr. ' + angebotsNr)
                    : 'Rechnung';

                // Kundendaten sauber aufbereiten
                var kName = kunde.auftraggeber || kunde.name || '';
                if (kName.indexOf('Datum') === 0 || kName.indexOf('Unterschrift') !== -1) kName = kunde.name || '';
                var af = kunde.ag_adresse || kunde.adresse || '';
                if (af.indexOf('Datum') !== -1 || af.indexOf('Unterschrift') !== -1) af = kunde.adresse || '';

                // Anschrift sauber in Zeilen aufteilen (Strasse, PLZ Ort)
                var aLines = [];
                if (af) {
                    var m = af.match(/^(.*?)[\s,]+(\d{5}\s+.*)$/);
                    if (m) {
                        aLines.push(m[1].trim());
                        aLines.push(m[2].trim());
                    } else {
                        af.split(',').forEach(function(s) {
                            if (s.trim()) aLines.push(s.trim());
                        });
                    }
                }

                // Bauvorhaben
                var bauvorhaben = kunde.adresse || kunde.baumassnahme || kunde.name || '';

                // Positionen-HTML
                var posR = '';
                aktivePosn.forEach(function(p) {
                    var gp = (parseFloat(p.menge)||0)*(parseFloat(p.einzelpreis)||0);
                    posR += '<tr><td style="text-align:center;font-weight:700;width:30px">'+(p.pos||'')+'</td>';
                    posR += '<td style="text-align:right;width:55px">'+fmt(p.menge)+'</td>';
                    posR += '<td style="text-align:center;width:35px">'+(p.einheit||'')+'</td>';
                    posR += '<td style="padding:6px 8px">'+(p.bez||'').replace(/</g,'&lt;')+'</td>';
                    posR += '<td style="text-align:right;width:65px">'+fmt(p.einzelpreis)+'</td>';
                    posR += '<td style="text-align:right;width:75px;font-weight:700">'+fmt(gp)+'</td></tr>';
                });

                // ====== HTML/CSS fuer PDF ======
                var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+getDokumentNr()+'</title>';
                h += '<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,700&display=swap" rel="stylesheet">';
                h += '<style>';
                h += '@page{size:A4;margin:0}';
                h += '*{box-sizing:border-box;margin:0;padding:0}';
                h += 'body{font-family:"Source Sans 3","Segoe UI",sans-serif;font-size:9.5pt;color:#222;line-height:1.4;background:#fff}';
                h += '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
                // A4 container
                h += '.page{width:210mm;min-height:297mm;padding:18mm 18mm 30mm 22mm;margin:0 auto;position:relative;background:#fff}';

                // === LOGO (oben links, gross, mehr Breite) ===
                h += '.logo-block{margin-bottom:4mm}';
                h += '.logo-inner{display:inline-flex;flex-direction:column;align-items:flex-start}';
                h += '.logo-thomas{font-family:"Source Sans 3",serif;font-style:italic;font-weight:700;color:#c41e1e;font-size:16px;margin-bottom:-17px;padding-left:1px;position:relative;z-index:2}';
                h += '.logo-word{display:flex;align-items:baseline;font-family:"Oswald",sans-serif;font-weight:700;color:#111;line-height:1}';
                h += '.logo-word .lw{font-size:58px}';
                h += '.logo-word .li-wrap{position:relative;font-size:58px;display:inline-block}';
                h += '.logo-word .li-char{font-size:58px;color:#111}';
                h += '.logo-word .li-dot{position:absolute;top:5px;left:50%;transform:translateX(-50%);width:9px;height:9px;background:#c41e1e}';
                h += '.logo-word .lLL{font-size:76px;letter-spacing:1px;line-height:0.75}';
                h += '.logo-word .lwa{font-size:58px}';
                h += '.logo-sub{display:flex;justify-content:flex-end;width:100%;margin-top:2px}';
                h += '.logo-sub span{font-family:"Source Sans 3",sans-serif;font-weight:600;color:#c41e1e;font-size:14px;letter-spacing:2.5px}';

                // Trennlinie
                h += '.sep{border:none;border-top:2.5px solid #c41e1e;margin:3mm 0 2mm}';
                // Absenderzeile
                h += '.abs{font-size:7pt;color:#aaa;border-bottom:0.5px solid #ccc;display:inline-block;padding-bottom:1px;margin-bottom:5mm}';

                // Empfaenger + Datum
                h += '.addr-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6mm}';
                h += '.addr-left{}';
                h += '.addr-name{font-weight:700;font-size:12pt;margin-bottom:1mm}';
                h += '.addr-street{font-size:10pt;color:#333;line-height:1.6}';
                h += '.addr-right{text-align:right;min-width:50mm}';

                // Dokumentdaten-Block (rechts)
                h += '.doc-data{font-size:9pt;line-height:2}';
                h += '.doc-data .dd-label{display:inline-block;width:35mm;color:#888;text-align:left}';
                h += '.doc-data .dd-val{font-weight:600;color:#222}';

                // Dokumenttitel
                h += '.doc-title{font-size:17pt;font-weight:700;margin-bottom:2mm;color:#111}';
                // Bauvorhaben gross
                h += '.bauvorhaben{font-size:13pt;font-weight:700;color:#c41e1e;margin-bottom:5mm}';

                // Tabelle
                h += 'table.p{width:100%;border-collapse:collapse;margin-bottom:6mm;font-size:8.5pt}';
                h += 'table.p thead th{background:#2d3436;color:#fff;font-weight:700;padding:7px 6px;font-size:8pt;text-transform:uppercase;letter-spacing:0.3px}';
                h += 'table.p tbody td{padding:6px;border-bottom:1px solid #e0e0e0;vertical-align:top;font-variant-numeric:tabular-nums}';

                // Summen
                h += '.su{margin-left:auto;width:88mm;font-size:9.5pt;margin-bottom:6mm}';
                h += '.su .r{display:flex;justify-content:space-between;padding:2px 0}';
                h += '.su .r .v{font-variant-numeric:tabular-nums;text-align:right;min-width:34mm}';
                h += '.su .r.br{font-weight:700;font-size:12pt;padding:4px 0;border-top:2.5px double #222;margin-top:2px}';
                h += '.su .r.sk{color:#c41e1e;font-weight:700}';
                h += '.su .r.nz{font-weight:700}';
                h += '.su .r.kl{font-size:8.5pt;color:#777}';

                // Bemerkung
                h += '.bm{font-size:8.5pt;color:#555;margin-bottom:8mm;line-height:1.5}';

                // === FUSSZEILE (unten, letzte Seite) ===
                h += '.ft{position:absolute;bottom:12mm;left:22mm;right:18mm;border-top:1.5px solid #c41e1e;padding-top:2mm;font-size:7.5pt;color:#666;line-height:1.7}';
                h += '.ft-row{display:flex;justify-content:space-between;flex-wrap:wrap}';
                h += '.ft-firma{font-weight:700;color:#c41e1e}';
                h += '.ft-addr{color:#444}';
                h += '.ft-bank{color:#555;margin-top:1mm}';

                h += '</style></head><body>';

                // ====== A4 SEITE ======
                h += '<div class="page">';

                // --- LOGO (oben links, gross, OHNE Adresse rechts) ---
                h += '<div class="logo-block"><div class="logo-inner">';
                h += '<div class="logo-thomas">Thomas</div>';
                h += '<div class="logo-word">';
                h += '<span class="lw">w</span>';
                h += '<span class="li-wrap"><span class="li-char">\u0131</span><span class="li-dot"></span></span>';
                h += '<span class="lLL">LL</span>';
                h += '<span class="lwa">wacher</span>';
                h += '</div>';
                h += '<div class="logo-sub"><span>Fliesenlegermeister e.K.</span></div>';
                h += '</div></div>';

                // --- Rote Trennlinie ---
                h += '<hr class="sep">';

                // --- Absenderzeile ---
                h += '<div class="abs">Thomas Willwacher Fliesenlegermeister e.K. \u00B7 Flurweg 14a \u00B7 56472 Nisterau</div>';

                // --- Empfaenger links + Dokumentdaten rechts ---
                h += '<div class="addr-row">';
                // Links: Komplette saubere Anschrift
                h += '<div class="addr-left">';
                h += '<div class="addr-name">'+kName+'</div>';
                h += '<div class="addr-street">'+aLines.join('<br>')+'</div>';
                h += '</div>';
                // Rechts: Dokumentdaten
                h += '<div class="addr-right"><div class="doc-data">';
                h += '<div><span class="dd-label">Datum:</span><span class="dd-val">'+new Date(rechnungsDatum).toLocaleDateString('de-DE')+'</span></div>';
                if (leistungszeitraum) h += '<div><span class="dd-label">Leistungszeitraum:</span><span class="dd-val">'+leistungszeitraum+'</span></div>';
                if (istRechnung) h += '<div><span class="dd-label">Rechnungs-Nr.:</span><span class="dd-val">'+rechnungsNr+'</span></div>';
                if (auftragsnummer) h += '<div><span class="dd-label">Auftragsnummer:</span><span class="dd-val">'+auftragsnummer+'</span></div>';
                if (kostenstelle) h += '<div><span class="dd-label">Kostenstelle:</span><span class="dd-val">'+kostenstelle+'</span></div>';
                h += '<div><span class="dd-label">Steuernummer:</span><span class="dd-val">30/220/1234/5</span></div>';
                h += '</div></div>';
                h += '</div>';

                // --- Dokumenttitel ---
                h += '<div class="doc-title">'+typLabel+'</div>';

                // --- Bauvorhaben (GROSS) ---
                h += '<div class="bauvorhaben">Bauvorhaben: '+bauvorhaben+'</div>';

                // --- Positionstabelle ---
                h += '<table class="p"><thead><tr>';
                h += '<th style="text-align:center;width:30px">Pos.</th>';
                h += '<th style="text-align:right;width:55px">Menge</th>';
                h += '<th style="text-align:center;width:35px">Einh.</th>';
                h += '<th style="text-align:left">Bezeichnung</th>';
                h += '<th style="text-align:right;width:65px">EP (\u20AC)</th>';
                h += '<th style="text-align:right;width:75px">GP (\u20AC)</th>';
                h += '</tr></thead>';
                h += '<tbody>'+posR+'</tbody></table>';

                // --- Summenblock ---
                h += '<div class="su">';
                h += '<div class="r"><span>Nettobetrag:</span><span class="v">'+fmt(nettoSumme)+' \u20AC</span></div>';
                h += '<div class="r kl"><span>zzgl. '+mwstSatz+'% MwSt.:</span><span class="v">'+fmt(mwstBetrag)+' \u20AC</span></div>';
                h += '<div class="r br"><span>Bruttobetrag:</span><span class="v">'+fmt(bruttoSumme)+' \u20AC</span></div>';

                if (istRechnung) {
                    if (sicherheitseinbehalt > 0) h += '<div class="r kl"><span>abzgl. Sicherheitseinbehalt '+sicherheitseinbehalt+'%:</span><span class="v">\u2013 '+fmt(sicherheitBetrag)+' \u20AC</span></div>';
                    // Schlussrechnung: Kontozahlungen abziehen
                    if (rechnungsTyp === 'schluss' && kontoSumme > 0) {
                        h += '<div class="r kl"><span>abzgl. geleistete Kontozahlungen:</span><span class="v">\u2013 '+fmt(kontoSumme)+' \u20AC</span></div>';
                        h += '<div class="r nz"><span>Restforderung:</span><span class="v">'+fmt(bruttoSumme - sicherheitBetrag - kontoSumme)+' \u20AC</span></div>';
                    }
                    h += '<div class="r sk"><span>Zahlbar '+skontoTage+' Tage ('+skontoProzent+'% Skonto):</span><span class="v">'+fmt(zahlbetragMitSkonto)+' \u20AC</span></div>';
                    h += '<div class="r nz"><span>Zahlbar '+zahlungszielTage+' Tage netto:</span><span class="v">'+fmt(zahlbetragOhneSkonto)+' \u20AC</span></div>';
                }
                h += '</div>';

                if (bemerkung) h += '<div class="bm">'+bemerkung.replace(/\n/g,'<br>')+'</div>';

                // === FUSSZEILE (Adresse + Telefon + Mobil + Bank) ===
                h += '<div class="ft">';
                h += '<div class="ft-row">';
                h += '<span class="ft-firma">Thomas Willwacher Fliesenlegermeister e.K.</span>';
                h += '<span class="ft-addr">Flurweg 14a \u00B7 56472 Nisterau</span>';
                h += '</div>';
                h += '<div class="ft-row">';
                h += '<span>Tel. 02661-63101 \u00B7 Mobil 0170-2024161</span>';
                h += '<span>Steuernummer: 30/220/1234/5</span>';
                h += '</div>';
                h += '<div class="ft-bank">Westerwald Bank eG \u00B7 IBAN: DE12 5739 1800 0000 0000 00 \u00B7 BIC: GENODE51WW1</div>';
                h += '</div>';

                h += '</div></body></html>';

                var pw = window.open('', '_blank', 'width=820,height=1160');
                pw.document.write(h);
                pw.document.close();
                setTimeout(function(){ pw.focus(); pw.print(); }, 800);
            };

            // ============================================================
            // E-RECHNUNG: XML-Generator (EN16931 / CII)
            // ============================================================
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
                var lzVon = leistungszeitraum ? rDatum : rDatum;
                var lzBis = rDatum;
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
                xml += '    <ram:IssueDateTime>\n';
                xml += '      <udt:DateTimeString format="102">' + rDatum + '</udt:DateTimeString>\n';
                xml += '    </ram:IssueDateTime>\n';
                if (bemerkung) {
                    xml += '    <ram:IncludedNote>\n';
                    xml += '      <ram:Content>' + escXml(bemerkung) + '</ram:Content>\n';
                    xml += '    </ram:IncludedNote>\n';
                }
                xml += '  </rsm:ExchangedDocument>\n';
                xml += '  <rsm:SupplyChainTradeTransaction>\n';
                aktivePosn.forEach(function(p, idx) {
                    var gp = (parseFloat(p.menge)||0) * (parseFloat(p.einzelpreis)||0);
                    xml += '    <ram:IncludedSupplyChainTradeLineItem>\n';
                    xml += '      <ram:AssociatedDocumentLineDocument>\n';
                    xml += '        <ram:LineID>' + (idx+1) + '</ram:LineID>\n';
                    xml += '      </ram:AssociatedDocumentLineDocument>\n';
                    xml += '      <ram:SpecifiedTradeProduct>\n';
                    xml += '        <ram:Name>' + escXml(p.bez || 'Position ' + p.pos) + '</ram:Name>\n';
                    xml += '      </ram:SpecifiedTradeProduct>\n';
                    xml += '      <ram:SpecifiedLineTradeAgreement>\n';
                    xml += '        <ram:NetPriceProductTradePrice>\n';
                    xml += '          <ram:ChargeAmount>' + fmtXml(p.einzelpreis) + '</ram:ChargeAmount>\n';
                    xml += '        </ram:NetPriceProductTradePrice>\n';
                    xml += '      </ram:SpecifiedLineTradeAgreement>\n';
                    xml += '      <ram:SpecifiedLineTradeDelivery>\n';
                    xml += '        <ram:BilledQuantity unitCode="' + mapEinheit(p.einheit) + '">' + fmtXml(p.menge) + '</ram:BilledQuantity>\n';
                    xml += '      </ram:SpecifiedLineTradeDelivery>\n';
                    xml += '      <ram:SpecifiedLineTradeSettlement>\n';
                    xml += '        <ram:ApplicableTradeTax>\n';
                    xml += '          <ram:TypeCode>VAT</ram:TypeCode>\n';
                    xml += '          <ram:CategoryCode>S</ram:CategoryCode>\n';
                    xml += '          <ram:RateApplicablePercent>' + mwstSatz + '.00</ram:RateApplicablePercent>\n';
                    xml += '        </ram:ApplicableTradeTax>\n';
                    xml += '        <ram:SpecifiedTradeSettlementLineMonetarySummation>\n';
                    xml += '          <ram:LineTotalAmount>' + fmtXml(gp) + '</ram:LineTotalAmount>\n';
                    xml += '        </ram:SpecifiedTradeSettlementLineMonetarySummation>\n';
                    xml += '      </ram:SpecifiedLineTradeSettlement>\n';
                    xml += '    </ram:IncludedSupplyChainTradeLineItem>\n';
                });
                xml += '    <ram:ApplicableHeaderTradeAgreement>\n';
                xml += '      <ram:SellerTradeParty>\n';
                xml += '        <ram:Name>Thomas Willwacher Fliesenlegermeister e.K.</ram:Name>\n';
                xml += '        <ram:PostalTradeAddress>\n';
                xml += '          <ram:LineOne>Flurweg 14a</ram:LineOne>\n';
                xml += '          <ram:PostcodeCode>56472</ram:PostcodeCode>\n';
                xml += '          <ram:CityName>Nisterau</ram:CityName>\n';
                xml += '          <ram:CountryID>DE</ram:CountryID>\n';
                xml += '        </ram:PostalTradeAddress>\n';
                xml += '        <ram:SpecifiedTaxRegistration>\n';
                xml += '          <ram:ID schemeID="FC">30/220/1234/5</ram:ID>\n';
                xml += '        </ram:SpecifiedTaxRegistration>\n';
                xml += '      </ram:SellerTradeParty>\n';
                xml += '      <ram:BuyerTradeParty>\n';
                xml += '        <ram:Name>' + escXml(kName) + '</ram:Name>\n';
                if (kStrasse || kPLZ || kOrt) {
                    xml += '        <ram:PostalTradeAddress>\n';
                    if (kStrasse) xml += '          <ram:LineOne>' + escXml(kStrasse) + '</ram:LineOne>\n';
                    if (kPLZ) xml += '          <ram:PostcodeCode>' + escXml(kPLZ) + '</ram:PostcodeCode>\n';
                    if (kOrt) xml += '          <ram:CityName>' + escXml(kOrt) + '</ram:CityName>\n';
                    xml += '          <ram:CountryID>DE</ram:CountryID>\n';
                    xml += '        </ram:PostalTradeAddress>\n';
                }
                xml += '      </ram:BuyerTradeParty>\n';
                if (auftragsnummer) {
                    xml += '      <ram:BuyerOrderReferencedDocument>\n';
                    xml += '        <ram:IssuerAssignedID>' + escXml(auftragsnummer) + '</ram:IssuerAssignedID>\n';
                    xml += '      </ram:BuyerOrderReferencedDocument>\n';
                }
                xml += '    </ram:ApplicableHeaderTradeAgreement>\n';
                xml += '    <ram:ApplicableHeaderTradeDelivery>\n';
                xml += '      <ram:ActualDeliverySupplyChainEvent>\n';
                xml += '        <ram:OccurrenceDateTime>\n';
                xml += '          <udt:DateTimeString format="102">' + rDatum + '</udt:DateTimeString>\n';
                xml += '        </ram:OccurrenceDateTime>\n';
                xml += '      </ram:ActualDeliverySupplyChainEvent>\n';
                xml += '    </ram:ApplicableHeaderTradeDelivery>\n';
                xml += '    <ram:ApplicableHeaderTradeSettlement>\n';
                xml += '      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>\n';
                xml += '      <ram:SpecifiedTradeSettlementPaymentMeans>\n';
                xml += '        <ram:TypeCode>58</ram:TypeCode>\n';
                xml += '        <ram:PayeePartyCreditorFinancialAccount>\n';
                xml += '          <ram:IBANID>DE12573918000000000000</ram:IBANID>\n';
                xml += '        </ram:PayeePartyCreditorFinancialAccount>\n';
                xml += '        <ram:PayeeSpecifiedCreditorFinancialInstitution>\n';
                xml += '          <ram:BICID>GENODE51WW1</ram:BICID>\n';
                xml += '        </ram:PayeeSpecifiedCreditorFinancialInstitution>\n';
                xml += '      </ram:SpecifiedTradeSettlementPaymentMeans>\n';
                xml += '      <ram:ApplicableTradeTax>\n';
                xml += '        <ram:CalculatedAmount>' + fmtXml(mwstBetrag) + '</ram:CalculatedAmount>\n';
                xml += '        <ram:TypeCode>VAT</ram:TypeCode>\n';
                xml += '        <ram:BasisAmount>' + fmtXml(nettoSumme) + '</ram:BasisAmount>\n';
                xml += '        <ram:CategoryCode>S</ram:CategoryCode>\n';
                xml += '        <ram:RateApplicablePercent>' + mwstSatz + '.00</ram:RateApplicablePercent>\n';
                xml += '      </ram:ApplicableTradeTax>\n';
                xml += '      <ram:SpecifiedTradePaymentTerms>\n';
                xml += '        <ram:Description>Zahlbar innerhalb ' + zahlungszielTage + ' Tagen netto';
                if (skontoProzent > 0) xml += ', innerhalb ' + skontoTage + ' Tagen abzgl. ' + skontoProzent + '% Skonto';
                xml += '</ram:Description>\n';
                var faelligDatum = new Date(rechnungsDatum);
                faelligDatum.setDate(faelligDatum.getDate() + zahlungszielTage);
                xml += '        <ram:DueDateDateTime>\n';
                xml += '          <udt:DateTimeString format="102">' + faelligDatum.toISOString().split('T')[0].replace(/-/g,'') + '</udt:DateTimeString>\n';
                xml += '        </ram:DueDateDateTime>\n';
                xml += '      </ram:SpecifiedTradePaymentTerms>\n';
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

            var escXml = function(s) {
                return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
            };
            var fmtXml = function(v) { return (parseFloat(v) || 0).toFixed(2); };
            var mapEinheit = function(e) {
                var map = { 'm\u00B2':'MTK', 'm':'MTR', 'Stk':'C62', 'psch':'LS', 'lfm':'MTR', 'kg':'KGM', 'l':'LTR', 'Satz':'SET', 'Std':'HUR' };
                return map[e] || 'C62';
            };

            // Download XRechnung
            var downloadXRechnung = function() {
                var xml = generateERechnungXML('xrechnung');
                var blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url; a.download = getDokumentNr() + '_XRechnung.xml';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
                alert('XRechnung XML heruntergeladen: ' + getDokumentNr() + '_XRechnung.xml');
            };

            // Download ZUGFeRD
            var downloadZUGFeRD = function() {
                generatePDF();
                setTimeout(function() {
                    var xml = generateERechnungXML('zugferd');
                    var blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url; a.download = getDokumentNr() + '_factur-x.xml';
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    alert('ZUGFeRD E-Rechnung erstellt!\n\n1. PDF zum Drucken/Speichern\n2. XML-Datei heruntergeladen\n\nBeide Dateien zusammen bilden die ZUGFeRD-konforme E-Rechnung.');
                }, 1500);
            };

            const [showFormatWahl, setShowFormatWahl] = useState(false);

            // E-Mail Versand
            var sendPerEmail = async function() {
                var empfaengerEmail = kunde.ag_email || kunde.bl_email || kunde.arch_email || '';
                var kName = kunde.auftraggeber || kunde.name || 'Auftraggeber';
                if (kName.indexOf('Datum') === 0 || kName.indexOf('Unterschrift') !== -1) kName = kunde.name || 'Auftraggeber';
                var typLabel = rechnungsTyp === 'abschlag' ? (abschlagNr + '. Abschlagsrechnung')
                    : rechnungsTyp === 'schluss' ? 'Schlussrechnung'
                    : rechnungsTyp === 'nachtrag' ? 'Nachtrag Nr. ' + nachtragsNr
                    : rechnungsTyp === 'angebot' ? 'Angebot Nr. ' + angebotsNr
                    : 'Rechnung';
                var bauvorhaben = kunde.adresse || kunde.baumassnahme || kunde.name || '';
                var betreffText = typLabel + ' Nr. ' + getDokumentNr() + ' \u2013 ' + bauvorhaben;
                var mailBody = 'Sehr geehrte Damen und Herren,\n\n'
                    + 'anbei erhalten Sie ' + (rechnungsTyp === 'nachtrag' ? 'unseren ' : rechnungsTyp === 'angebot' ? 'unser ' : 'unsere ') + typLabel + ' Nr. ' + getDokumentNr() + '.\n\n'
                    + 'Bauvorhaben: ' + bauvorhaben + '\n';
                if (leistungszeitraum) mailBody += 'Leistungszeitraum: ' + leistungszeitraum + '\n';
                if (auftragsnummer) mailBody += 'Auftragsnummer: ' + auftragsnummer + '\n';
                if (istRechnung) {
                    mailBody += '\nRechnungsbetrag (brutto): ' + fmt(bruttoSumme) + ' \u20AC\n';
                    if (skontoProzent > 0) mailBody += 'Zahlbar innerhalb ' + skontoTage + ' Tagen abzgl. ' + skontoProzent + '% Skonto: ' + fmt(zahlbetragMitSkonto) + ' \u20AC\n';
                    mailBody += 'Zahlbar innerhalb ' + zahlungszielTage + ' Tagen netto: ' + fmt(zahlbetragOhneSkonto) + ' \u20AC\n';
                    mailBody += '\nBitte ueberweisen Sie den Rechnungsbetrag auf folgendes Konto:\nWesterwald Bank eG\nIBAN: DE12 5739 1800 0000 0000 00\nBIC: GENODE51WW1\nKontoinhaber: Thomas Willwacher Fliesenlegermeister e.K.\n';
                } else {
                    mailBody += '\nGesamtbetrag (brutto): ' + fmt(bruttoSumme) + ' \u20AC\n';
                }
                mailBody += '\nDas Dokument ist diesem Schreiben als PDF beigefuegt.\n\nBei Rueckfragen stehen wir Ihnen gerne zur Verfuegung.\n\nMit freundlichen Gruessen\n\nThomas Willwacher\nFliesenlegermeister e.K.\nFlurweg 14a \u00B7 56472 Nisterau\nTel. 02661-63101 \u00B7 Mobil 0170-2024161';

                generatePDF();
                var service = window.GoogleDriveService;
                if (service && service.accessToken && empfaengerEmail) {
                    try {
                        var rawParts = [
                            'From: ' + GMAIL_CONFIG.ABSENDER_EMAIL,
                            'To: ' + empfaengerEmail,
                            'Subject: =?UTF-8?B?' + btoa(unescape(encodeURIComponent(betreffText))) + '?=',
                            'MIME-Version: 1.0',
                            'Content-Type: text/plain; charset=UTF-8',
                            '', mailBody
                        ];
                        var rawMail = rawParts.join('\r\n');
                        var encoded = btoa(unescape(encodeURIComponent(rawMail))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                        var resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                            method: 'POST',
                            headers: { 'Authorization': 'Bearer ' + service.accessToken, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ raw: encoded })
                        });
                        if (resp.ok) { alert('Rechnung per Gmail an ' + empfaengerEmail + ' gesendet!'); return; }
                    } catch(gmailErr) { console.warn('Gmail-Versand fehlgeschlagen:', gmailErr); }
                }
                setTimeout(function() {
                    window.location.href = 'mailto:' + encodeURIComponent(empfaengerEmail) + '?subject=' + encodeURIComponent(betreffText) + '&body=' + encodeURIComponent(mailBody);
                }, 1200);
            };

            const [showMailDialog, setShowMailDialog] = useState(false);
            const [mailAdresse, setMailAdresse] = useState('');
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

            // ============================================================
            // PHASE 1: Typ-Auswahl (5 Untermodule)
            // ============================================================
            if (phase === 'typwahl') {
                var typen = [
                    { id: 'abschlag',  icon: '\uD83D\uDCCA', name: 'Abschlagsrechnung',  desc: 'Teilrechnung mit kumulierter Aufstellung',       color: '#1E88E5' },
                    { id: 'schluss',   icon: '\uD83D\uDCCB', name: 'Schlussrechnung',     desc: 'Endabrechnung mit Gesamtaufstellung',             color: '#27ae60' },
                    { id: 'einzel',    icon: '\uD83E\uDDFE', name: 'Einzelrechnung',      desc: 'Einfache Rechnung ohne Abschlaege',               color: '#00897b' },
                    { id: 'nachtrag',  icon: '\uD83D\uDCD1', name: 'Nachtrag',            desc: 'Zusaetzliche / geaenderte Leistungen',            color: '#e67e22' },
                    { id: 'angebot',   icon: '\uD83D\uDCDD', name: 'Angebot',             desc: 'Kostenvoranschlag fuer den Auftraggeber',          color: '#8e44ad' },
                ];
                return (
                    <div className="page-container" style={{padding:'16px', minHeight:'100vh'}}>
                        <div dangerouslySetInnerHTML={{__html: noSpinnerCSS}} />
                        <div style={{textAlign:'center', marginBottom:'20px'}}>
                            <FirmenLogo size="small" />
                            <div style={{marginTop:'12px', fontSize:'15px', fontWeight:'700'}}>{kunde ? kunde.name : ''}</div>
                            <div style={{fontSize:'11px', color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase', marginTop:'4px'}}>Dokumenttyp waehlen</div>
                        </div>
                        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                            {typen.map(function(t) {
                                return (
                                    <button key={t.id} onClick={function(){
                                        setRechnungsTyp(t.id);
                                        if (t.id === 'schluss') ladeKontozahlungen();
                                        setPhase('posauswahl');
                                    }}
                                        style={{padding:'14px 16px', borderRadius:'12px', border:'2px solid ' + t.color + '22', background:'var(--bg-secondary)', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', textAlign:'left', boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                                        <span style={{fontSize:'24px'}}>{t.icon}</span>
                                        <div style={{flex:1}}>
                                            <div style={{fontSize:'14px', fontWeight:'700', color: t.color}}>{t.name}</div>
                                            <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>{t.desc}</div>
                                        </div>
                                        <span style={{color:'var(--text-muted)', fontSize:'16px'}}>{'\u203A'}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={onBack} style={{width:'100%', marginTop:'16px', padding:'12px', background:'var(--bg-tertiary)', color:'var(--text-muted)', border:'none', borderRadius:'10px', fontSize:'13px', cursor:'pointer'}}>{'\u2190'} Zurueck zur Modulwahl</button>
                    </div>
                );
            }

            // ============================================================
            // PHASE 2: Positionsauswahl
            // ============================================================
            if (phase === 'posauswahl') {
                var typColor = rechnungsTyp === 'abschlag' ? '#1E88E5' : rechnungsTyp === 'schluss' ? '#27ae60' : rechnungsTyp === 'einzel' ? '#00897b' : rechnungsTyp === 'nachtrag' ? '#e67e22' : '#8e44ad';
                var allePosn = lvPositionen.map(function(p, i) {
                    return { idx: i, pos: p.pos || p.posNr || String(i+1), bez: p.bez || p.titel || '', einheit: p.einheit || 'm\u00B2', menge: p.menge || 0, einzelpreis: p.einzelpreis || p.ep || 0, aufmassMenge: aufmassMassen[p.pos || p.posNr] || 0 };
                });
                var alleAusgewaehlt = allePosn.length > 0 && allePosn.every(function(p) { return posAuswahl[p.idx] !== false; });
                var ausgewaehlteAnzahl = allePosn.filter(function(p) { return posAuswahl[p.idx] !== false; }).length;
                return (
                    <div className="page-container" style={{padding:'16px', minHeight:'100vh', paddingBottom:'90px'}}>
                        <div dangerouslySetInnerHTML={{__html: noSpinnerCSS}} />
                        <div style={{textAlign:'center', marginBottom:'16px'}}>
                            <div style={{fontSize:'11px', color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase'}}>Positionen auswaehlen</div>
                            <div style={{fontSize:'15px', fontWeight:'700', marginTop:'4px'}}>{kunde ? kunde.name : ''}</div>
                        </div>
                        {allePosn.length > 0 ? (
                            <div style={{background:'var(--bg-secondary)', borderRadius:'14px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.1)', marginBottom:'12px'}}>
                                <div style={{padding:'10px 14px', borderBottom:'2px solid var(--border-color)', display:'flex', alignItems:'center', gap:'8px'}}>
                                    <input type="checkbox" checked={alleAusgewaehlt} onChange={function() {
                                        var neu = {};
                                        allePosn.forEach(function(p) { neu[p.idx] = !alleAusgewaehlt; });
                                        setPosAuswahl(neu);
                                    }} />
                                    <span style={{fontSize:'12px', fontWeight:'700', color: typColor}}>Alle Positionen ({allePosn.length})</span>
                                    <span style={{marginLeft:'auto', fontSize:'11px', color:'var(--text-muted)'}}>{ausgewaehlteAnzahl} ausgewaehlt</span>
                                </div>
                                <div style={{maxHeight:'400px', overflow:'auto'}}>
                                    {allePosn.map(function(p) {
                                        var checked = posAuswahl[p.idx] !== false;
                                        return (
                                            <div key={p.idx} style={{padding:'10px 14px', borderBottom:'1px solid var(--border-color)', display:'flex', alignItems:'flex-start', gap:'8px', opacity: checked ? 1 : 0.4}}>
                                                <input type="checkbox" checked={checked} onChange={function() { setPosAuswahl(function(prev) { var n = Object.assign({}, prev); n[p.idx] = !checked; return n; }); }} style={{marginTop:'2px'}} />
                                                <div style={{flex:1}}>
                                                    <div style={{display:'flex', gap:'6px', alignItems:'center'}}>
                                                        <span style={{fontWeight:'700', fontSize:'11px', color: typColor, minWidth:'40px'}}>{p.pos}</span>
                                                        <span style={{fontSize:'12px'}}>{p.bez}</span>
                                                    </div>
                                                    <div style={{display:'flex', gap:'12px', marginTop:'3px', fontSize:'11px', color:'var(--text-muted)'}}>
                                                        <span>LV: {fmt(p.menge)} {p.einheit}</span>
                                                        {p.einzelpreis > 0 && <span>EP: {fmt(p.einzelpreis)} \u20AC</span>}
                                                        {p.aufmassMenge > 0 && <span style={{color:'var(--success)', fontWeight:'600'}}>Aufmass: {fmt(p.aufmassMenge)} {p.einheit}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div style={{textAlign:'center', padding:'30px', color:'var(--text-muted)', fontSize:'13px', background:'var(--bg-secondary)', borderRadius:'14px', marginBottom:'12px'}}>
                                Keine LV-Positionen erkannt.<br/>Verwende "Manuell eingeben" um Positionen anzulegen.
                            </div>
                        )}
                        {hatAufmass && (
                            <button onClick={uebernahmeAusAufmass} style={{
                                width:'100%', padding:'12px', marginBottom:'8px', borderRadius:'10px', border:'2px solid #27ae60',
                                background:'rgba(39,174,96,0.08)', color:'var(--success)', fontSize:'13px', fontWeight:'700', cursor:'pointer',
                                display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
                            }}>
                                Positionen + Massen aus Aufmass uebernehmen ({Object.keys(aufmassMassen).filter(function(k){return aufmassMassen[k]>0;}).length} Pos.)
                            </button>
                        )}
                        {!hatAufmass && (
                            <div style={{padding:'8px 12px', marginBottom:'8px', borderRadius:'8px', background:'rgba(230,126,34,0.08)', fontSize:'11px', color:'var(--accent-orange)', textAlign:'center'}}>
                                Aufmass-Uebernahme nicht verfuegbar -- erstelle zuerst ein Aufmass
                            </div>
                        )}
                        <div style={{position:'fixed', bottom:0, left:0, right:0, padding:'10px 16px', background:'var(--bg-primary)', borderTop:'1px solid var(--border-color)', zIndex:100, display:'flex', gap:'8px'}}>
                            <button onClick={function(){ setPhase('typwahl'); }} style={{flex:1, padding:'12px', background:'var(--bg-tertiary)', color:'var(--text-muted)', border:'none', borderRadius:'10px', fontSize:'12px', cursor:'pointer'}}>{'\u2190'} Zurueck</button>
                            <button onClick={function(){
                                var selected = allePosn.filter(function(p) { return posAuswahl[p.idx] !== false; });
                                initPositionen(selected);
                                setPhase('formular');
                            }} disabled={ausgewaehlteAnzahl === 0 && allePosn.length > 0}
                                style={{flex:2, padding:'12px', background: ausgewaehlteAnzahl > 0 || allePosn.length === 0 ? typColor : 'var(--bg-tertiary)', color:'white', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'700', cursor:'pointer'}}>
                                {ausgewaehlteAnzahl > 0 ? ausgewaehlteAnzahl + ' Positionen uebernehmen \u2192' : 'Weiter \u2192'}
                            </button>
                        </div>
                        <div style={{marginTop:'4px'}}>
                            <button onClick={function(){ setPositionen([]); setPhase('formular'); }}
                                style={{width:'100%', padding:'10px', background:'none', color:'var(--text-muted)', border:'1px dashed var(--border-color)', borderRadius:'10px', fontSize:'12px', cursor:'pointer'}}>
                                Alle Positionen manuell eingeben
                            </button>
                        </div>
                    </div>
                );
            }

            // ============================================================
            // PHASE 3: Rechnungsformular
            // ============================================================
            var typColor = rechnungsTyp === 'abschlag' ? '#1E88E5' : rechnungsTyp === 'schluss' ? '#27ae60' : rechnungsTyp === 'einzel' ? '#00897b' : rechnungsTyp === 'nachtrag' ? '#e67e22' : '#8e44ad';
            var typLabel = rechnungsTyp === 'abschlag' ? abschlagNr + '. Abschlagsrechnung'
                : rechnungsTyp === 'schluss' ? 'Schlussrechnung'
                : rechnungsTyp === 'nachtrag' ? 'Nachtrag Nr. ' + nachtragsNr
                : rechnungsTyp === 'angebot' ? 'Angebot Nr. ' + angebotsNr
                : 'Einzelrechnung';

            return (
                <div className="page-container" style={{padding:'16px', minHeight:'100vh', paddingBottom:'80px'}}>
                    <div dangerouslySetInnerHTML={{__html: noSpinnerCSS}} />

                    {/* Header mit Logo */}
                    <div style={{textAlign:'center', marginBottom:'14px'}}>
                        <FirmenLogo size="small" />
                        <div style={{marginTop:'8px', fontSize:'15px', fontWeight:'700', color: typColor}}>{typLabel}</div>
                        <div style={{fontSize:'11px', color:'var(--text-muted)'}}>{kunde ? kunde.name : ''}</div>
                    </div>

                    {/* Rechnungskopf -- Reihenfolge: Datum, Leistungszeitraum, Rechnungs-Nr, Auftragsnr, Kostenstelle */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'12px', marginBottom:'10px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                        <div style={{fontSize:'11px', fontWeight:'700', color: typColor, marginBottom:'8px'}}>Dokumentdaten</div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px'}}>
                            <div><label style={{fontSize:'10px', color:'var(--text-muted)', display:'block'}}>Datum</label>
                                <input type="date" value={rechnungsDatum} onChange={function(e){setRechnungsDatum(e.target.value);}} style={inputStyle} /></div>
                            {rechnungsTyp === 'abschlag' && <div><label style={{fontSize:'10px', color:'var(--text-muted)', display:'block'}}>Abschlags-Nr.</label>
                                <input type="text" inputMode="numeric" value={abschlagNr} onChange={function(e){setAbschlagNr(parseInt(e.target.value)||1);}} style={inputStyle} /></div>}
                            {rechnungsTyp === 'schluss' && <div><label style={{fontSize:'10px', color:'var(--text-muted)', display:'block'}}>Bisher abgerechnet (netto)</label>
                                <input type="text" inputMode="decimal" value={bisherAbgerechnet} onChange={function(e){setBisherAbgerechnet(e.target.value);}} style={inputStyle} /></div>}
                            {rechnungsTyp === 'angebot' && <div><MicLabel fieldKey="re_glt" label="Gueltig bis" />
                                <div style={{display:'flex', gap:'3px'}}><input type="date" value={gueltigBis} onChange={function(e){setGueltigBis(e.target.value);}} style={Object.assign({}, inputStyle, {flex:1})} /></div></div>}
                            <div style={{gridColumn:'span 2'}}><MicLabel fieldKey="re_lz" label="Leistungszeitraum" />
                                <div style={{display:'flex', gap:'3px'}}><MicInput fieldKey="re_lz" value={leistungszeitraum} onChange={function(e){setLeistungszeitraum(e.target.value);}} placeholder="z.B. 01.01. \u2013 31.03.2026" style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="re_lz" size="small" onResult={function(t){setLeistungszeitraum((leistungszeitraum||'')+' '+t);}} /></div></div>
                            {istRechnung && <div><MicLabel fieldKey="re_nr" label="Rechnungs-Nr." />
                                <div style={{display:'flex', gap:'3px'}}><MicInput fieldKey="re_nr" value={rechnungsNr} onChange={function(e){setRechnungsNr(e.target.value);}} style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="re_nr" size="small" onResult={function(t){setRechnungsNr(rechnungsNr+t);}} /></div></div>}
                            {rechnungsTyp === 'nachtrag' && <div><MicLabel fieldKey="re_ntnr" label="Nachtrags-Nr." />
                                <div style={{display:'flex', gap:'3px'}}><MicInput fieldKey="re_ntnr" value={nachtragsNr} onChange={function(e){setNachtragsNr(e.target.value);}} style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="re_ntnr" size="small" onResult={function(t){setNachtragsNr(nachtragsNr+t);}} /></div></div>}
                            {rechnungsTyp === 'angebot' && <div><MicLabel fieldKey="re_agnr" label="Angebots-Nr." />
                                <div style={{display:'flex', gap:'3px'}}><MicInput fieldKey="re_agnr" value={angebotsNr} onChange={function(e){setAngebotsNr(e.target.value);}} style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="re_agnr" size="small" onResult={function(t){setAngebotsNr(angebotsNr+t);}} /></div></div>}
                            <div><MicLabel fieldKey="re_auftr" label="Auftragsnummer" />
                                <div style={{display:'flex', gap:'3px'}}><MicInput fieldKey="re_auftr" value={auftragsnummer} onChange={function(e){setAuftragsnummer(e.target.value);}} placeholder="z.B. A-2026-001" style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="re_auftr" size="small" onResult={function(t){setAuftragsnummer((auftragsnummer||'')+t);}} /></div></div>
                            <div><MicLabel fieldKey="re_kst" label="Kostenstelle" />
                                <div style={{display:'flex', gap:'3px'}}><MicInput fieldKey="re_kst" value={kostenstelle} onChange={function(e){setKostenstelle(e.target.value);}} placeholder="optional" style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="re_kst" size="small" onResult={function(t){setKostenstelle((kostenstelle||'')+t);}} /></div></div>
                        </div>
                    </div>

                    {/* Schlussrechnung: Kontozahlungen-Button */}
                    {rechnungsTyp === 'schluss' && (
                        <button onClick={function(){ setShowKontoDialog(true); ladeKontozahlungen(); }}
                            style={{width:'100%', padding:'10px', marginBottom:'10px', borderRadius:'10px', border:'2px solid #27ae60',
                                background:'rgba(39,174,96,0.08)', color:'var(--success)', fontSize:'12px', fontWeight:'700', cursor:'pointer'}}>
                            Kontozahlungen anzeigen / bearbeiten ({kontozahlungen.length})
                        </button>
                    )}

                    {/* Kontozahlungen-Dialog */}
                    {showKontoDialog && (
                        <div className="modal-overlay" onClick={function(){ setShowKontoDialog(false); }}>
                            <div className="modal" onClick={function(e){ e.stopPropagation(); }} style={{maxWidth:'420px', maxHeight:'80vh', overflow:'auto'}}>
                                <div className="modal-title">Bisherige Kontozahlungen</div>
                                {kontozahlungen.length === 0 ? (
                                    <div style={{padding:'16px', textAlign:'center', color:'var(--text-muted)', fontSize:'12px'}}>Keine Abschlagszahlungen im Ausgangsbuch gefunden.</div>
                                ) : kontozahlungen.map(function(k, i) {
                                    return (
                                        <div key={k.id} style={{padding:'8px 12px', borderBottom:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:'8px'}}>
                                            <input type="checkbox" checked={k.aufgefuehrt} onChange={function() {
                                                setKontozahlungen(function(prev) { return prev.map(function(kk, ii) { return ii === i ? Object.assign({}, kk, {aufgefuehrt: !kk.aufgefuehrt}) : kk; }); });
                                            }} />
                                            <div style={{flex:1}}>
                                                <div style={{fontSize:'12px', fontWeight:'600'}}>{k.nr} vom {k.datum}</div>
                                            </div>
                                            <div style={{fontWeight:'700', fontSize:'13px', color:'var(--success)'}}>{fmt(k.betrag)} \u20AC</div>
                                        </div>
                                    );
                                })}
                                <div style={{padding:'12px', borderTop:'2px solid var(--border-color)', fontWeight:'700', display:'flex', justifyContent:'space-between'}}>
                                    <span>Summe Kontozahlungen:</span>
                                    <span style={{color:'var(--success)'}}>{fmt(kontoSumme)} \u20AC</span>
                                </div>
                                <button onClick={function(){ setShowKontoDialog(false); }} style={{width:'100%', padding:'10px', marginTop:'8px', background: typColor, color:'white', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'700', cursor:'pointer'}}>Uebernehmen</button>
                            </div>
                        </div>
                    )}

                    {/* Positionen */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'12px', marginBottom:'10px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                                <div style={{fontSize:'11px', fontWeight:'700', color: typColor}}>Positionen ({aktivePosn.length})</div>
                                <button onClick={addPosition} style={{padding:'3px 8px', fontSize:'10px', background: typColor, color:'white', border:'none', borderRadius:'6px', cursor:'pointer'}}>+ Neu</button>
                            </div>
                            <div style={{display:'grid', gridTemplateColumns:'28px 38px 52px 36px 1fr 62px 68px', gap:'2px', padding:'4px 2px', fontSize:'9px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'2px solid var(--border-color)'}}>
                                <span></span><span>Pos.</span><span style={{textAlign:'right'}}>Menge</span><span style={{textAlign:'center'}}>Einh.</span><span>Bezeichnung</span><span style={{textAlign:'right'}}>EP</span><span style={{textAlign:'right'}}>GP</span>
                            </div>
                            {positionen.length === 0 ? (
                                <div style={{textAlign:'center', padding:'16px', color:'var(--text-muted)', fontSize:'12px'}}>Keine Positionen. Klicke "+ Neu" zum Anlegen.</div>
                            ) : (
                                <div>
                                    {positionen.map(function(p) {
                                        var gp = (parseFloat(p.menge)||0) * (parseFloat(p.einzelpreis)||0);
                                        return (
                                            <div key={p.id} style={{display:'grid', gridTemplateColumns:'28px 38px 52px 36px 1fr 62px 68px', gap:'2px', padding:'6px 2px', borderBottom:'1px solid var(--border-color)', alignItems:'start', opacity: p.aktiv ? 1 : 0.3}}>
                                                <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', paddingTop:'2px'}}>
                                                    <input type="checkbox" checked={p.aktiv} onChange={function(){updatePos(p.id,'aktiv',!p.aktiv);}} />
                                                    <button onClick={function(){removePosition(p.id);}} style={{background:'none', border:'none', color:'var(--accent-red-light)', fontSize:'10px', cursor:'pointer', padding:0, lineHeight:1}}>{'\u2715'}</button>
                                                </div>
                                                <input value={p.pos} onChange={function(e){updatePos(p.id,'pos',e.target.value);}}
                                                    style={{padding:'4px 3px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'11px', fontWeight:'700', color: typColor, textAlign:'center', width:'100%', boxSizing:'border-box'}} />
                                                <input type="text" inputMode="decimal" value={p.menge || ''} onChange={function(e){updatePos(p.id,'menge',e.target.value);}} placeholder="0,00"
                                                    onBlur={function(e){ var v = parseFloat(e.target.value); updatePos(p.id, 'menge', isNaN(v) ? 0 : Number(v.toFixed(2))); }}
                                                    style={{padding:'4px 4px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'11px', color:'var(--text-primary)', textAlign:'right', width:'100%', boxSizing:'border-box'}} />
                                                <input value={p.einheit} onChange={function(e){updatePos(p.id,'einheit',e.target.value);}}
                                                    style={{padding:'4px 2px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'10px', color:'var(--text-primary)', textAlign:'center', width:'100%', boxSizing:'border-box'}} />
                                                <div style={{padding:'0'}}>
                                                    <div contentEditable={true} suppressContentEditableWarning={true}
                                                        onBlur={function(e){updatePos(p.id,'bez',e.target.innerText);}}
                                                        style={{padding:'4px 6px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'11px', color:'var(--text-primary)', lineHeight:'1.4', minHeight:'28px', wordBreak:'break-word', outline:'none'}}>
                                                        {p.bez}
                                                    </div>
                                                </div>
                                                <input type="text" inputMode="decimal" value={p.einzelpreis || ''} onChange={function(e){updatePos(p.id,'einzelpreis',e.target.value);}} placeholder="0,00"
                                                    onBlur={function(e){ var v = parseFloat(e.target.value); updatePos(p.id, 'einzelpreis', isNaN(v) ? 0 : Number(v.toFixed(2))); }}
                                                    style={{padding:'4px 4px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'11px', color:'var(--text-primary)', textAlign:'right', width:'100%', boxSizing:'border-box'}} />
                                                <div style={{fontSize:'12px', fontWeight:'700', textAlign:'right', padding:'4px 2px', color: typColor}}>
                                                    {fmt(gp)} \u20AC
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                    </div>

                    {/* Konditionen (nur fuer Rechnungen) */}
                    {istRechnung && (
                    <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'12px', marginBottom:'10px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                        <div style={{fontSize:'11px', fontWeight:'700', color:'var(--text-secondary)', marginBottom:'8px'}}>Konditionen</div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'6px'}}>
                            <div><label style={{fontSize:'9px', color:'var(--text-muted)', display:'block'}}>Skonto %</label>
                                <input type="text" inputMode="decimal" value={skontoProzent} onChange={function(e){setSkontoProzent(parseFloat(e.target.value)||0);}} style={smallInputStyle} /></div>
                            <div><label style={{fontSize:'9px', color:'var(--text-muted)', display:'block'}}>Skonto Tage</label>
                                <input type="text" inputMode="numeric" value={skontoTage} onChange={function(e){setSkontoTage(parseInt(e.target.value)||0);}} style={smallInputStyle} /></div>
                            <div><label style={{fontSize:'9px', color:'var(--text-muted)', display:'block'}}>Zahlungsziel</label>
                                <input type="text" inputMode="numeric" value={zahlungszielTage} onChange={function(e){setZahlungszielTage(parseInt(e.target.value)||0);}} style={smallInputStyle} /></div>
                            <div><label style={{fontSize:'9px', color:'var(--text-muted)', display:'block'}}>Einbehalt %</label>
                                <input type="text" inputMode="decimal" value={sicherheitseinbehalt} onChange={function(e){setSicherheitseinbehalt(parseFloat(e.target.value)||0);}} style={smallInputStyle} /></div>
                        </div>
                    </div>
                    )}

                    {/* Bemerkung */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'12px', marginBottom:'10px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                        <MicLabel fieldKey="re_bem" label="Bemerkung" style={{fontSize:'11px', fontWeight:'700', color:'var(--text-secondary)', marginBottom:'6px'}} />
                        <div style={{display:'flex', gap:'4px', alignItems:'flex-start'}}>
                            <MicInput fieldKey="re_bem" multiline={true} value={bemerkung} onChange={function(e){setBemerkung(e.target.value);}} rows={2} placeholder="Optionaler Zusatztext auf dem Dokument..."
                                style={{flex:1, padding:'8px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'12px', color:'var(--text-primary)', resize:'vertical', boxSizing:'border-box'}} />
                            <MicButton fieldKey="re_bem" size="normal" onResult={function(t){setBemerkung((bemerkung||'')+(bemerkung?' ':'')+t);}} />
                        </div>
                    </div>

                    {/* Summenblock */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'14px', marginBottom:'10px', boxShadow:'0 2px 8px rgba(0,0,0,0.12)'}}>
                        <div style={{fontSize:'11px', fontWeight:'700', color:'var(--text-secondary)', marginBottom:'8px'}}>Berechnung</div>
                        <div style={{fontSize:'13px', lineHeight:'2'}}>
                            <div style={{display:'flex', justifyContent:'space-between'}}><span>Nettobetrag:</span><span style={{fontWeight:'600'}}>{fmt(nettoSumme)} \u20AC</span></div>
                            <div style={{display:'flex', justifyContent:'space-between', color:'var(--text-muted)', fontSize:'12px'}}><span>zzgl. MwSt. {mwstSatz}%:</span><span>{fmt(mwstBetrag)} \u20AC</span></div>
                            <div style={{display:'flex', justifyContent:'space-between', fontWeight:'700', fontSize:'16px', borderTop:'2px solid var(--border-color)', paddingTop:'4px', marginTop:'2px'}}><span>Bruttobetrag:</span><span>{fmt(bruttoSumme)} \u20AC</span></div>
                            {istRechnung && sicherheitseinbehalt > 0 && <div style={{display:'flex', justifyContent:'space-between', color:'var(--text-muted)', fontSize:'11px'}}><span>abzgl. Einbehalt {sicherheitseinbehalt}%:</span><span>{'\u2013'} {fmt(sicherheitBetrag)} \u20AC</span></div>}
                            {rechnungsTyp === 'schluss' && kontoSumme > 0 && <div style={{display:'flex', justifyContent:'space-between', color:'var(--success)', fontSize:'12px', fontWeight:'600'}}><span>abzgl. Kontozahlungen:</span><span>{'\u2013'} {fmt(kontoSumme)} \u20AC</span></div>}
                            {rechnungsTyp === 'schluss' && kontoSumme > 0 && <div style={{display:'flex', justifyContent:'space-between', fontWeight:'700', fontSize:'14px', color: typColor}}><span>Restforderung:</span><span>{fmt(bruttoSumme - sicherheitBetrag - kontoSumme)} \u20AC</span></div>}
                            {istRechnung && (
                                <React.Fragment>
                                    <div style={{display:'flex', justifyContent:'space-between', color: typColor, fontWeight:'700', marginTop:'2px', fontSize:'13px'}}>
                                        <span>Mit Skonto ({skontoProzent}%, {skontoTage} T.):</span><span>{fmt(zahlbetragMitSkonto)} \u20AC</span>
                                    </div>
                                    <div style={{display:'flex', justifyContent:'space-between', fontWeight:'600', fontSize:'13px'}}>
                                        <span>Netto ({zahlungszielTage} Tage):</span><span>{fmt(zahlbetragOhneSkonto)} \u20AC</span>
                                    </div>
                                </React.Fragment>
                            )}
                        </div>
                    </div>

                    {/* E-Mail Dialog */}
                    {showMailDialog && (
                        <div className="modal-overlay" onClick={function(){ setShowMailDialog(false); }}>
                            <div className="modal" onClick={function(e){ e.stopPropagation(); }} style={{maxWidth:'380px'}}>
                                <div className="modal-title">Dokument per E-Mail senden</div>
                                <div style={{marginBottom:'12px'}}>
                                    <div style={{fontSize:'12px', color:'var(--text-muted)', marginBottom:'10px', lineHeight:'1.5'}}>
                                        Das Dokument wird als PDF erstellt und Ihr E-Mail-Programm geoeffnet.
                                    </div>
                                    <label style={{fontSize:'11px', color:'var(--text-muted)', display:'block', marginBottom:'4px'}}>Empfaenger E-Mail-Adresse</label>
                                    <input type="email" value={mailAdresse} onChange={function(e){ setMailAdresse(e.target.value); }}
                                        placeholder="empfaenger@firma.de"
                                        style={{width:'100%', padding:'10px 12px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'14px', color:'var(--text-primary)', boxSizing:'border-box'}}
                                        autoFocus />
                                    {kunde.ag_email && kunde.ag_email !== mailAdresse && (
                                        <button onClick={function(){ setMailAdresse(kunde.ag_email); }}
                                            style={{marginTop:'6px', padding:'4px 8px', fontSize:'10px', background:'rgba(30,136,229,0.1)', color:'var(--accent-blue)', border:'1px solid rgba(30,136,229,0.2)', borderRadius:'6px', cursor:'pointer'}}>
                                            AG: {kunde.ag_email}
                                        </button>
                                    )}
                                    {kunde.bl_email && kunde.bl_email !== mailAdresse && (
                                        <button onClick={function(){ setMailAdresse(kunde.bl_email); }}
                                            style={{marginTop:'6px', marginLeft:'4px', padding:'4px 8px', fontSize:'10px', background:'rgba(39,174,96,0.1)', color:'var(--success)', border:'1px solid rgba(39,174,96,0.2)', borderRadius:'6px', cursor:'pointer'}}>
                                            BL: {kunde.bl_email}
                                        </button>
                                    )}
                                    {kunde.arch_email && kunde.arch_email !== mailAdresse && (
                                        <button onClick={function(){ setMailAdresse(kunde.arch_email); }}
                                            style={{marginTop:'6px', marginLeft:'4px', padding:'4px 8px', fontSize:'10px', background:'rgba(230,126,34,0.1)', color:'var(--accent-orange)', border:'1px solid rgba(230,126,34,0.2)', borderRadius:'6px', cursor:'pointer'}}>
                                            Arch: {kunde.arch_email}
                                        </button>
                                    )}
                                </div>
                                <div style={{display:'flex', gap:'8px', marginTop:'4px'}}>
                                    <button className="modal-btn secondary" onClick={function(){ setShowMailDialog(false); }}
                                        style={{flex:1, padding:'10px', background:'var(--bg-tertiary)', color:'var(--text-muted)', border:'none', borderRadius:'10px', fontSize:'13px', cursor:'pointer'}}>
                                        Abbrechen
                                    </button>
                                    <button onClick={confirmAndSend}
                                        style={{flex:2, padding:'10px', background:'linear-gradient(135deg, #e67e22, #d35400)', color:'white', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'}}>
                                        PDF erstellen + Mail oeffnen
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Fixed Bottom Bar */}
                    <div style={{position:'fixed', bottom:0, left:0, right:0, padding:'10px 16px', background:'var(--bg-primary)', borderTop:'1px solid var(--border-color)', zIndex:100}}>
                        <div style={{display:'flex', gap:'8px', marginBottom: showFormatWahl ? '8px' : '0'}}>
                            <button onClick={function(){ setPhase('posauswahl'); }}
                                onTouchEnd={function(e){ e.preventDefault(); setPhase('posauswahl'); }}
                                style={{padding:'12px 10px', background:'var(--bg-tertiary)', color:'var(--text-muted)', border:'none', borderRadius:'10px', fontSize:'12px', cursor:'pointer', touchAction:'manipulation', minWidth:'44px', minHeight:'44px'}}>{'\u2190'}</button>
                            <button
                                onTouchEnd={function(e){ e.preventDefault(); setShowFormatWahl(!showFormatWahl); }}
                                onClick={function(){ setShowFormatWahl(!showFormatWahl); }}
                                style={{flex:1, padding:'12px', background:'linear-gradient(135deg, ' + typColor + ', ' + typColor + 'cc)', color:'white', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', touchAction:'manipulation', minHeight:'48px'}}>
                                {istRechnung ? 'Rechnung erstellen' : rechnungsTyp === 'nachtrag' ? 'Nachtrag erstellen' : 'Angebot erstellen'} {showFormatWahl ? '\u25BC' : '\u25B2'}
                            </button>
                            <button
                                onTouchEnd={function(e){ e.preventDefault(); openMailDialog(); }}
                                onClick={openMailDialog}
                                style={{padding:'12px 16px', background:'linear-gradient(135deg, #e67e22, #d35400)', color:'white', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', touchAction:'manipulation', minHeight:'48px'}}>
                                \u2709
                            </button>
                        </div>

                        {showFormatWahl && (
                            <div style={{display:'flex', flexDirection:'column', gap:'6px', padding:'8px 0 4px', animation:'fadeIn 0.15s ease'}}>
                                <button
                                    onTouchEnd={function(e){ e.preventDefault(); generatePDF(); setShowFormatWahl(false); }}
                                    onClick={function(){ generatePDF(); setShowFormatWahl(false); }}
                                    style={{width:'100%', padding:'14px 16px', borderRadius:'12px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', textAlign:'left', touchAction:'manipulation', minHeight:'56px'}}>
                                    <span style={{fontSize:'24px'}}>&#128196;</span>
                                    <div style={{flex:1}}>
                                        <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)'}}>PDF-Dokument</div>
                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>Standard-PDF fuer Druck und Versand</div>
                                    </div>
                                </button>
                                {istRechnung && (
                                    <React.Fragment>
                                        <button
                                            onTouchEnd={function(e){ e.preventDefault(); downloadZUGFeRD(); setShowFormatWahl(false); }}
                                            onClick={function(){ downloadZUGFeRD(); setShowFormatWahl(false); }}
                                            style={{width:'100%', padding:'14px 16px', borderRadius:'12px', border:'1px solid rgba(39,174,96,0.3)', background:'rgba(39,174,96,0.05)', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', textAlign:'left', touchAction:'manipulation', minHeight:'56px'}}>
                                            <span style={{fontSize:'24px'}}>&#128203;</span>
                                            <div style={{flex:1}}>
                                                <div style={{fontSize:'14px', fontWeight:'700', color:'var(--success)'}}>ZUGFeRD E-Rechnung</div>
                                                <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>PDF + XML (EN16931) fuer B2B</div>
                                            </div>
                                            <span style={{fontSize:'11px', color:'var(--success)', background:'rgba(39,174,96,0.1)', padding:'3px 8px', borderRadius:'6px', fontWeight:'600'}}>B2B</span>
                                        </button>
                                        <button
                                            onTouchEnd={function(e){ e.preventDefault(); downloadXRechnung(); setShowFormatWahl(false); }}
                                            onClick={function(){ downloadXRechnung(); setShowFormatWahl(false); }}
                                            style={{width:'100%', padding:'14px 16px', borderRadius:'12px', border:'1px solid rgba(30,136,229,0.3)', background:'rgba(30,136,229,0.05)', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', textAlign:'left', touchAction:'manipulation', minHeight:'56px'}}>
                                            <span style={{fontSize:'24px'}}>&#127963;</span>
                                            <div style={{flex:1}}>
                                                <div style={{fontSize:'14px', fontWeight:'700', color:'var(--accent-blue)'}}>XRechnung</div>
                                                <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>Reines XML (CII) fuer Behoerden (B2G)</div>
                                            </div>
                                            <span style={{fontSize:'11px', color:'var(--accent-blue)', background:'rgba(30,136,229,0.1)', padding:'3px 8px', borderRadius:'6px', fontWeight:'600'}}>B2G</span>
                                        </button>
                                    </React.Fragment>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
