        function RechnungsModul({ kunde, importResult, gesamtliste, aufmassGespeichert, onBack }) {
            // ── Phasen: 'typwahl' → 'posauswahl' → 'formular' ──
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
            const [stundenlohnEintraege, setStundenlohnEintraege] = useState([
                { datum: new Date().toISOString().split('T')[0], stunden: '', beschreibung: '', stundensatz: '55.00' }
            ]);
            const [bemerkung, setBemerkung] = useState('');
            // Positionsauswahl-State
            const [posAuswahl, setPosAuswahl] = useState({});

            // LV-Positionen holen -- aus ALLEN verfügbaren Quellen
            var lvPositionen = [];
            if (importResult && importResult.positionen && importResult.positionen.length > 0) {
                lvPositionen = importResult.positionen;
            } else if (kunde && kunde._lvPositionen && kunde._lvPositionen.length > 0) {
                // Direkt aus dem Kunden-Objekt (bei "Kunde ANALYSIERT" aus localStorage)
                lvPositionen = kunde._lvPositionen;
            } else if (typeof LV_POSITIONEN !== 'undefined') {
                // Aus dem globalen LV_POSITIONEN Objekt (verschiedene Keys probieren)
                var keys = [kunde._lvPositionenKey, kunde._driveFolderId, kunde.id, kunde.name].filter(Boolean);
                for (var ki = 0; ki < keys.length; ki++) {
                    if (LV_POSITIONEN[keys[ki]] && LV_POSITIONEN[keys[ki]].length > 0) {
                        lvPositionen = LV_POSITIONEN[keys[ki]];
                        break;
                    }
                }
            }
            // Sicherheits-Injection: LV-Positionen auch global verfügbar machen
            if (lvPositionen.length > 0 && kunde) {
                var injKey = kunde._driveFolderId || kunde.id || kunde.name;
                if (injKey && typeof LV_POSITIONEN !== 'undefined') {
                    LV_POSITIONEN[injKey] = lvPositionen;
                }
            }

            // Aufmaß-Daten: Massen pro Position aus gesamtliste extrahieren
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

            // Auto Rechnungsnummer
            useEffect(function() {
                var year = new Date().getFullYear();
                var rand = String(Math.floor(Math.random() * 900) + 100);
                setRechnungsNr('RE-' + year + '-' + rand);
            }, []);

            // Positionen initialisieren wenn Phase wechselt
            var initPositionen = function(selected) {
                setPositionen(selected.map(function(p, i) {
                    var ep = parseFloat(p.einzelpreis) || parseFloat(p.ep) || 0;
                    var menge = parseFloat(p.menge) || 0;
                    // EP aus LV wenn vorhanden (auch wenn ep bereits gesetzt, LV hat Vorrang)
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
                    // Aufmaß-Menge übernehmen wenn vorhanden
                    var aufmassMenge = aufmassMassen[p.pos || p.posNr] || 0;
                    if (aufmassMenge > 0) menge = aufmassMenge;

                    return { id: i, pos: p.pos || p.posNr || String(i+1), bez: p.bez || p.titel || '', einheit: p.einheit || 'm²', menge: menge, einzelpreis: ep, aktiv: true };
                }));
            };

            // Aus Aufmaß übernehmen: Positionen + Massen + EP aus LV
            var uebernahmeAusAufmass = function() {
                var merged = [];
                var seen = {};
                // Erst alle LV-Positionen nehmen
                lvPositionen.forEach(function(lv) {
                    var key = lv.pos || lv.posNr;
                    var menge = aufmassMassen[key] || parseFloat(lv.menge) || 0;
                    var ep = parseFloat(lv.einzelpreis) || parseFloat(lv.ep) || 0;
                    merged.push({ id: merged.length, pos: key, bez: lv.bez || lv.titel || '', einheit: lv.einheit || 'm²', menge: menge, einzelpreis: ep, aktiv: menge > 0 });
                    seen[key] = true;
                });
                // Aufmaß-Positionen die nicht im LV sind
                Object.keys(aufmassMassen).forEach(function(key) {
                    if (!seen[key] && aufmassMassen[key] > 0) {
                        merged.push({ id: merged.length, pos: key, bez: 'Position ' + key, einheit: 'm²', menge: aufmassMassen[key], einzelpreis: 0, aktiv: true });
                    }
                });
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
                setPositionen(function(prev) { return prev.concat([{ id: maxId+1, pos: String(prev.length+1), bez: '', einheit: 'm²', menge: 0, einzelpreis: 0, aktiv: true }]); });
            };
            var removePosition = function(id) {
                setPositionen(function(prev) { return prev.filter(function(p) { return p.id !== id; }); });
            };
            var addStundenlohnZeile = function() {
                setStundenlohnEintraege(function(prev) { return prev.concat([{ datum: new Date().toISOString().split('T')[0], stunden: '', beschreibung: '', stundensatz: '55.00' }]); });
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

            // CSS: Pfeiltasten bei number-inputs entfernen
            var noSpinnerCSS = '<style>input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}input[type=number]{-moz-appearance:textfield;}</style>';

            // Input-Style (wiederverwendbar)
            var inputStyle = {width:'100%', padding:'8px 10px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'13px', color:'var(--text-primary)', boxSizing:'border-box'};
            var smallInputStyle = Object.assign({}, inputStyle, {padding:'6px 8px', fontSize:'12px', textAlign:'right'});

            // ── PDF-Export (§14 UStG konform, schönes Layout) ──
            var generatePDF = function() {
                // ═══ AUTO-SAVE: Rechnung ins Ausgangsbuch speichern ═══
                try {
                    var abKey = 'tw_ausgangsbuch';
                    var abData = JSON.parse(localStorage.getItem(abKey) || '[]');
                    // Duplikat-Check (gleiche Rechnungsnummer + gleiches Datum)
                    var isDuplicate = abData.some(function(e) { return e.rechnungsNr === rechnungsNr && e.datum === rechnungsDatum; });
                    if (!isDuplicate && rechnungsNr) {
                        var typLabel2 = rechnungsTyp === 'abschlag' ? (abschlagNr + '. Abschlagsrechnung')
                            : rechnungsTyp === 'schluss' ? 'Schlussrechnung'
                            : rechnungsTyp === 'nachtrag' ? 'Nachtragsrechnung'
                            : rechnungsTyp === 'stundenlohn' ? 'Stundenlohnrechnung' : 'Rechnung';
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
                            leistungszeitraum: leistungszeitraum,
                            anzahlPositionen: aktivePosn.length,
                            status: 'offen', // 'offen' | 'bezahlt' | 'gemahnt' | 'storniert'
                            zahlungsDatum: null,
                            zahlungsBetrag: null,
                            notiz: '',
                            erstelltAm: new Date().toISOString()
                        });
                        localStorage.setItem(abKey, JSON.stringify(abData));
                        console.log('✅ Rechnung ' + rechnungsNr + ' ins Ausgangsbuch gespeichert');
                    }
                } catch(abErr) { console.warn('Ausgangsbuch-Speichern fehlgeschlagen:', abErr); }

                var typLabel = rechnungsTyp === 'abschlag' ? (abschlagNr + '. Abschlagsrechnung')
                    : rechnungsTyp === 'schluss' ? 'Schlussrechnung'
                    : rechnungsTyp === 'nachtrag' ? 'Nachtragsrechnung'
                    : rechnungsTyp === 'stundenlohn' ? 'Stundenlohnrechnung' : 'Rechnung';
                var kName = kunde.auftraggeber || kunde.name || '';
                if (kName.indexOf('Datum') === 0 || kName.indexOf('Unterschrift') !== -1) kName = kunde.name || '';
                var af = kunde.ag_adresse || kunde.adresse || '';
                if (af.indexOf('Datum') !== -1 || af.indexOf('Unterschrift') !== -1) af = kunde.adresse || '';
                var aLines = [];
                if (af) { var m = af.match(/^(.*?)[\s,]+(\d{5}\s+.*)$/); if(m){aLines.push(m[1].trim());aLines.push(m[2].trim());}else{af.split(',').forEach(function(s){if(s.trim())aLines.push(s.trim());});} }

                var posR = '';
                aktivePosn.forEach(function(p) {
                    var gp = (parseFloat(p.menge)||0)*(parseFloat(p.einzelpreis)||0);
                    posR += '<tr><td style="text-align:center;font-weight:700;width:30px">'+(p.pos||'')+'</td><td style="text-align:right;width:55px">'+fmt(p.menge)+'</td><td style="text-align:center;width:35px">'+(p.einheit||'')+'</td><td style="padding:6px 8px">'+(p.bez||'').replace(/</g,'&lt;')+'</td><td style="text-align:right;width:65px">'+fmt(p.einzelpreis)+'</td><td style="text-align:right;width:75px;font-weight:700">'+fmt(gp)+'</td></tr>';
                });

                var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+rechnungsNr+'</title>';
                h += '<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,700&display=swap" rel="stylesheet">';
                h += '<style>';
                h += '@page{size:A4;margin:0}';
                h += '*{box-sizing:border-box;margin:0;padding:0}';
                h += 'body{font-family:"Source Sans 3","Segoe UI",sans-serif;font-size:9.5pt;color:#222;line-height:1.4;background:#fff}';
                h += '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
                // A4 container
                h += '.page{width:210mm;min-height:297mm;padding:20mm 18mm 30mm 22mm;margin:0 auto;position:relative;background:#fff}';
                // Logo -- oben links, volle Breite, wie App-Startseite
                h += '.lh{display:flex;align-items:flex-start;margin-bottom:2mm}';
                h += '.lc{display:inline-flex;flex-direction:column;align-items:flex-start}';
                h += '.lt{font-family:"Source Sans 3",serif;font-style:italic;font-weight:700;color:#c41e1e;font-size:16px;margin-bottom:-18px;padding-left:1px;position:relative;z-index:2}';
                h += '.lw{display:flex;align-items:baseline;font-family:"Oswald",sans-serif;font-weight:700;color:#111;line-height:1}';
                h += '.lw .w{font-size:62px}';
                h += '.lw .iw{position:relative;font-size:62px;display:inline-block}';
                h += '.lw .iw .ic{font-size:62px;color:#111}';
                h += '.lw .iw .id{position:absolute;top:6px;left:50%;transform:translateX(-50%);width:10px;height:10px;background:#c41e1e}';
                h += '.lw .ll{font-size:84px;letter-spacing:1px;line-height:0.75}';
                h += '.lw .wa{font-size:62px}';
                h += '.ls{display:flex;justify-content:flex-end;width:100%;margin-top:1px}';
                h += '.ls span{font-family:"Source Sans 3",sans-serif;font-weight:600;color:#c41e1e;font-size:15px;letter-spacing:2.5px}';
                // Trennlinie
                h += '.sep{border:none;border-top:2.5px solid #c41e1e;margin:3mm 0 2mm}';
                // Absender
                h += '.abs{font-size:7pt;color:#aaa;border-bottom:0.5px solid #ccc;display:inline-block;padding-bottom:1px;margin-bottom:5mm}';
                // Empfaenger + Dokumentdaten
                h += '.eb{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6mm}';
                h += '.el{flex:1}';
                h += '.en{font-weight:700;font-size:11.5pt;margin-bottom:1mm}';
                h += '.ea{font-size:10pt;color:#333;line-height:1.6}';
                // Dokumentdaten rechts
                h += '.dd{min-width:52mm;text-align:right}';
                h += '.dd-row{margin-bottom:2mm}';
                h += '.dd-label{font-size:7pt;color:#999;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:0.3mm}';
                h += '.dd-val{font-size:10pt;font-weight:600;color:#222}';
                // Titel
                h += '.rt{font-size:17pt;font-weight:700;margin-bottom:2mm;letter-spacing:0.3px}';
                // Bauvorhaben gross
                h += '.bv{font-size:13pt;font-weight:700;color:#333;margin-bottom:2mm;line-height:1.3}';
                h += '.bv-label{font-size:8pt;color:#888;font-weight:400;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:0.5mm}';
                // Steuernummer
                h += '.stn{font-size:8pt;color:#888;margin-bottom:5mm}';
                h += '.stn .l{display:inline-block;width:28mm;color:#888}';
                h += '.stn .v{font-weight:600;color:#555}';
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
                // Fusszeile -- mit Adresse, Telefon, Bank
                h += '.ft{position:absolute;bottom:12mm;left:22mm;right:18mm;border-top:2px solid #c41e1e;padding-top:2.5mm;font-size:7.5pt;color:#666;line-height:1.7}';
                h += '.ft-row{display:flex;justify-content:space-between;align-items:baseline}';
                h += '.ft .ti{font-style:italic;color:#c41e1e;font-weight:700}';
                h += '.ft .tn{color:#333;font-weight:700}';
                h += '.ft .tf{color:#c41e1e}';
                h += '.ft .ft-contact{color:#555}';
                h += '.ft .ft-bank{color:#777;font-size:7pt}';
                h += '</style></head><body>';

                // === A4 SEITE ===
                h += '<div class="page">';

                // Logo -- oben links, volle Breite, wie App-Startseite
                h += '<div class="lh"><div class="lc">';
                h += '<div class="lt">Thomas</div>';
                h += '<div class="lw"><span class="w">w</span><span class="iw"><span class="ic">\u0131</span><span class="id"></span></span><span class="ll">LL</span><span class="wa">wacher</span></div>';
                h += '<div class="ls"><span>Fliesenlegermeister e.K.</span></div>';
                h += '</div></div>';

                h += '<hr class="sep">';
                h += '<div class="abs">Thomas Willwacher Fliesenlegermeister e.K. \u00b7 Flurweg 14a \u00b7 56472 Nisterau</div>';

                // Empfaenger links + Dokumentdaten rechts
                h += '<div class="eb">';
                // Empfaenger -- sauber und komplett
                h += '<div class="el">';
                h += '<div class="en">'+kName+'</div>';
                h += '<div class="ea">'+aLines.join('<br>')+'</div>';
                h += '</div>';
                // Dokumentdaten rechts -- Reihenfolge: Datum, Leistungszeitraum, Rechnungs-Nr, Auftragsnummer, Kostenstelle
                h += '<div class="dd">';
                h += '<div class="dd-row"><span class="dd-label">Datum</span><span class="dd-val">'+new Date(rechnungsDatum).toLocaleDateString('de-DE')+'</span></div>';
                if(leistungszeitraum) h += '<div class="dd-row"><span class="dd-label">Leistungszeitraum</span><span class="dd-val">'+leistungszeitraum+'</span></div>';
                h += '<div class="dd-row"><span class="dd-label">Rechnungs-Nr.</span><span class="dd-val">'+rechnungsNr+'</span></div>';
                if(auftragsnummer) h += '<div class="dd-row"><span class="dd-label">Auftragsnummer</span><span class="dd-val">'+auftragsnummer+'</span></div>';
                if(kostenstelle) h += '<div class="dd-row"><span class="dd-label">Kostenstelle</span><span class="dd-val">'+kostenstelle+'</span></div>';
                h += '</div>';
                h += '</div>';

                // Dokumenttitel
                h += '<div class="rt">'+typLabel+'</div>';

                // Bauvorhaben -- gross und prominent
                h += '<div class="bv"><span class="bv-label">Bauvorhaben</span>'+(kunde.adresse||kunde.name||'')+'</div>';

                // Steuernummer
                h += '<div class="stn"><span class="l">Steuernummer:</span> <span class="v">30/220/1234/5</span></div>';

                // Tabelle -- immer gleiches Format
                h += '<table class="p"><thead><tr><th style="text-align:center;width:30px">Pos.</th><th style="text-align:right;width:55px">Menge</th><th style="text-align:center;width:35px">Einh.</th><th style="text-align:left">Bezeichnung</th><th style="text-align:right;width:65px">EP (\u20ac)</th><th style="text-align:right;width:75px">GP (\u20ac)</th></tr></thead>';
                h += '<tbody>'+posR+'</tbody></table>';

                // Summen
                h += '<div class="su">';
                h += '<div class="r"><span>Nettobetrag:</span><span class="v">'+fmt(nettoSumme)+' \u20ac</span></div>';
                h += '<div class="r kl"><span>zzgl. '+mwstSatz+'% MwSt.:</span><span class="v">'+fmt(mwstBetrag)+' \u20ac</span></div>';
                h += '<div class="r br"><span>Bruttobetrag:</span><span class="v">'+fmt(bruttoSumme)+' \u20ac</span></div>';
                if(sicherheitseinbehalt>0) h += '<div class="r kl"><span>abzgl. Sicherheitseinbehalt '+sicherheitseinbehalt+'%:</span><span class="v">\u2013 '+fmt(sicherheitBetrag)+' \u20ac</span></div>';
                h += '<div class="r sk"><span>Zahlbar '+skontoTage+' Tage ('+skontoProzent+'% Skonto):</span><span class="v">'+fmt(zahlbetragMitSkonto)+' \u20ac</span></div>';
                h += '<div class="r nz"><span>Zahlbar '+zahlungszielTage+' Tage netto:</span><span class="v">'+fmt(zahlbetragOhneSkonto)+' \u20ac</span></div>';
                h += '</div>';

                if(bemerkung) h += '<div class="bm">'+bemerkung.replace(/\n/g,'<br>')+'</div>';

                // Fusszeile -- Adresse, Telefon, Mobil, Bankverbindung
                h += '<div class="ft">';
                h += '<div class="ft-row"><div><span class="ti">Thomas </span><span class="tn">wiLLwacher</span> <span class="tf">Fliesenlegermeister e.K.</span></div></div>';
                h += '<div class="ft-row"><span class="ft-contact">Flurweg 14a \u00b7 56472 Nisterau \u00b7 Tel. 02661-63101 \u00b7 Mobil 0170-2024161</span></div>';
                h += '<div class="ft-row"><span class="ft-bank">Steuernummer: 30/220/1234/5 \u00b7 Westerwald Bank eG \u00b7 IBAN: DE12 5739 1800 0000 0000 00 \u00b7 BIC: GENODE51WW1</span></div>';
                h += '</div>';

                h += '</div></body></html>';

                var pw = window.open('', '_blank', 'width=820,height=1160');
                pw.document.write(h);
                pw.document.close();
                setTimeout(function(){ pw.focus(); pw.print(); }, 800);
            };

            // ═══════════════════════════════════════════
            // E-RECHNUNG: XML-Generator (EN16931 / CII)
            // ═══════════════════════════════════════════
            var generateERechnungXML = function(profil) {
                // profil: 'xrechnung' | 'zugferd'
                var isXR = profil === 'xrechnung';
                var kName = kunde.auftraggeber || kunde.name || 'Unbekannt';
                if (kName.indexOf('Datum') === 0 || kName.indexOf('Unterschrift') !== -1) kName = kunde.name || 'Unbekannt';
                var kStrasse = kunde.ag_adresse || kunde.adresse || '';
                var kOrt = '';
                var kPLZ = '';
                // Adresse aufteilen
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

                // ExchangedDocumentContext
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

                // ExchangedDocument
                xml += '  <rsm:ExchangedDocument>\n';
                xml += '    <ram:ID>' + escXml(rechnungsNr) + '</ram:ID>\n';
                xml += '    <ram:TypeCode>380</ram:TypeCode>\n'; // 380 = Rechnung
                xml += '    <ram:IssueDateTime>\n';
                xml += '      <udt:DateTimeString format="102">' + rDatum + '</udt:DateTimeString>\n';
                xml += '    </ram:IssueDateTime>\n';
                if (bemerkung) {
                    xml += '    <ram:IncludedNote>\n';
                    xml += '      <ram:Content>' + escXml(bemerkung) + '</ram:Content>\n';
                    xml += '    </ram:IncludedNote>\n';
                }
                xml += '  </rsm:ExchangedDocument>\n';

                // SupplyChainTradeTransaction
                xml += '  <rsm:SupplyChainTradeTransaction>\n';

                // Positionen
                aktivePosn.forEach(function(p, idx) {
                    var gp = (parseFloat(p.menge)||0) * (parseFloat(p.einzelpreis)||0);
                    xml += '    <ram:IncludedSupplyChainTradeLineItem>\n';
                    xml += '      <ram:AssociatedDocumentLineDocument>\n';
                    xml += '        <ram:LineID>' + (p.pos || String(idx+1)) + '</ram:LineID>\n';
                    xml += '      </ram:AssociatedDocumentLineDocument>\n';
                    xml += '      <ram:SpecifiedTradeProduct>\n';
                    xml += '        <ram:Name>' + escXml(p.bez || 'Position ' + (idx+1)) + '</ram:Name>\n';
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

                // ApplicableHeaderTradeAgreement (Verkäufer + Käufer)
                xml += '    <ram:ApplicableHeaderTradeAgreement>\n';
                if (isXR && auftragsnummer) {
                    xml += '      <ram:BuyerReference>' + escXml(auftragsnummer) + '</ram:BuyerReference>\n';
                } else if (isXR) {
                    xml += '      <ram:BuyerReference>' + escXml(rechnungsNr) + '</ram:BuyerReference>\n';
                }
                // Verkäufer
                xml += '      <ram:SellerTradeParty>\n';
                xml += '        <ram:Name>Thomas Willwacher Fliesenlegermeister e.K.</ram:Name>\n';
                xml += '        <ram:SpecifiedLegalOrganization>\n';
                xml += '          <ram:TradingBusinessName>Thomas Willwacher Fliesenlegermeister e.K.</ram:TradingBusinessName>\n';
                xml += '        </ram:SpecifiedLegalOrganization>\n';
                xml += '        <ram:PostalTradeAddress>\n';
                xml += '          <ram:PostcodeCode>56472</ram:PostcodeCode>\n';
                xml += '          <ram:LineOne>Flurweg 14a</ram:LineOne>\n';
                xml += '          <ram:CityName>Nisterau</ram:CityName>\n';
                xml += '          <ram:CountryID>DE</ram:CountryID>\n';
                xml += '        </ram:PostalTradeAddress>\n';
                xml += '        <ram:URIUniversalCommunication>\n';
                xml += '          <ram:URIID schemeID="EM">' + (localStorage.getItem('gmail_absender') || 'phoenix180862@gmail.com') + '</ram:URIID>\n';
                xml += '        </ram:URIUniversalCommunication>\n';
                xml += '        <ram:SpecifiedTaxRegistration>\n';
                xml += '          <ram:ID schemeID="FC">30/220/1234/5</ram:ID>\n';
                xml += '        </ram:SpecifiedTaxRegistration>\n';
                xml += '      </ram:SellerTradeParty>\n';
                // Käufer
                xml += '      <ram:BuyerTradeParty>\n';
                xml += '        <ram:Name>' + escXml(kName) + '</ram:Name>\n';
                if (kStrasse || kPLZ || kOrt) {
                    xml += '        <ram:PostalTradeAddress>\n';
                    if (kPLZ) xml += '          <ram:PostcodeCode>' + escXml(kPLZ) + '</ram:PostcodeCode>\n';
                    if (kStrasse) xml += '          <ram:LineOne>' + escXml(kStrasse) + '</ram:LineOne>\n';
                    if (kOrt) xml += '          <ram:CityName>' + escXml(kOrt) + '</ram:CityName>\n';
                    xml += '          <ram:CountryID>DE</ram:CountryID>\n';
                    xml += '        </ram:PostalTradeAddress>\n';
                }
                if (kunde.ag_email) {
                    xml += '        <ram:URIUniversalCommunication>\n';
                    xml += '          <ram:URIID schemeID="EM">' + escXml(kunde.ag_email) + '</ram:URIID>\n';
                    xml += '        </ram:URIUniversalCommunication>\n';
                }
                xml += '      </ram:BuyerTradeParty>\n';
                xml += '    </ram:ApplicableHeaderTradeAgreement>\n';

                // ApplicableHeaderTradeDelivery
                xml += '    <ram:ApplicableHeaderTradeDelivery>\n';
                xml += '      <ram:ActualDeliverySupplyChainEvent>\n';
                xml += '        <ram:OccurrenceDateTime>\n';
                xml += '          <udt:DateTimeString format="102">' + rDatum + '</udt:DateTimeString>\n';
                xml += '        </ram:OccurrenceDateTime>\n';
                xml += '      </ram:ActualDeliverySupplyChainEvent>\n';
                xml += '    </ram:ApplicableHeaderTradeDelivery>\n';

                // ApplicableHeaderTradeSettlement
                xml += '    <ram:ApplicableHeaderTradeSettlement>\n';
                xml += '      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>\n';
                // Bankverbindung
                xml += '      <ram:SpecifiedTradeSettlementPaymentMeans>\n';
                xml += '        <ram:TypeCode>58</ram:TypeCode>\n'; // SEPA Überweisung
                xml += '        <ram:PayeePartyCreditorFinancialAccount>\n';
                xml += '          <ram:IBANID>DE12573918000000000000</ram:IBANID>\n';
                xml += '          <ram:AccountName>Thomas Willwacher Fliesenlegermeister e.K.</ram:AccountName>\n';
                xml += '        </ram:PayeePartyCreditorFinancialAccount>\n';
                xml += '        <ram:PayeeSpecifiedCreditorFinancialInstitution>\n';
                xml += '          <ram:BICID>GENODE51WW1</ram:BICID>\n';
                xml += '        </ram:PayeeSpecifiedCreditorFinancialInstitution>\n';
                xml += '      </ram:SpecifiedTradeSettlementPaymentMeans>\n';
                // Steuern
                xml += '      <ram:ApplicableTradeTax>\n';
                xml += '        <ram:CalculatedAmount>' + fmtXml(mwstBetrag) + '</ram:CalculatedAmount>\n';
                xml += '        <ram:TypeCode>VAT</ram:TypeCode>\n';
                xml += '        <ram:BasisAmount>' + fmtXml(nettoSumme) + '</ram:BasisAmount>\n';
                xml += '        <ram:CategoryCode>S</ram:CategoryCode>\n';
                xml += '        <ram:RateApplicablePercent>' + mwstSatz + '.00</ram:RateApplicablePercent>\n';
                xml += '      </ram:ApplicableTradeTax>\n';
                // Zahlungsbedingungen
                xml += '      <ram:SpecifiedTradePaymentTerms>\n';
                xml += '        <ram:Description>Zahlbar innerhalb ' + zahlungszielTage + ' Tagen netto';
                if (skontoProzent > 0) xml += ', innerhalb ' + skontoTage + ' Tagen abzgl. ' + skontoProzent + '% Skonto';
                xml += '</ram:Description>\n';
                var faelligDatum = new Date(rechnungsDatum);
                faelligDatum.setDate(faelligDatum.getDate() + zahlungszielTage);
                var faelligStr = faelligDatum.toISOString().split('T')[0].replace(/-/g,'');
                xml += '        <ram:DueDateDateTime>\n';
                xml += '          <udt:DateTimeString format="102">' + faelligStr + '</udt:DateTimeString>\n';
                xml += '        </ram:DueDateDateTime>\n';
                xml += '      </ram:SpecifiedTradePaymentTerms>\n';
                // Summen
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

            // Hilfsfunktionen für XML
            var escXml = function(s) {
                return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
            };
            var fmtXml = function(v) {
                return (parseFloat(v) || 0).toFixed(2);
            };
            var mapEinheit = function(e) {
                var map = { 'm²':'MTK', 'm':'MTR', 'Stk':'C62', 'psch':'LS', 'lfm':'MTR', 'kg':'KGM', 'l':'LTR', 'Satz':'SET', 'Std':'HUR' };
                return map[e] || 'C62';
            };

            // ═══ DOWNLOAD: XRechnung (reines XML) ═══
            var downloadXRechnung = function() {
                var xml = generateERechnungXML('xrechnung');
                var blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = rechnungsNr + '_XRechnung.xml';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                alert('✅ XRechnung XML heruntergeladen:\n' + rechnungsNr + '_XRechnung.xml\n\nDieses Format ist für Behörden (B2G) und automatische Verarbeitung geeignet.');
            };

            // ═══ DOWNLOAD: ZUGFeRD (PDF + XML) ═══
            var downloadZUGFeRD = function() {
                // Erst PDF erzeugen (Print-Dialog)
                generatePDF();
                // Dann XML als separate Datei
                setTimeout(function() {
                    var xml = generateERechnungXML('zugferd');
                    var blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = rechnungsNr + '_factur-x.xml';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    alert('✅ ZUGFeRD E-Rechnung erstellt!\n\n1️⃣ PDF wurde zum Drucken/Speichern geöffnet\n2️⃣ XML-Datei (' + rechnungsNr + '_factur-x.xml) heruntergeladen\n\n📎 Beide Dateien zusammen bilden die ZUGFeRD-konforme E-Rechnung (EN16931).\n\nFür B2B-Versand: Beide Dateien als Anhang versenden.');
                }, 1500);
            };

            // ═══ FORMAT-AUSWAHL STATE ═══
            const [showFormatWahl, setShowFormatWahl] = useState(false);

            // ── E-Mail Versand ──
            var sendPerEmail = async function() {
                // Empfänger-E-Mail ermitteln (Auftraggeber bevorzugt)
                var empfaengerEmail = kunde.ag_email || kunde.bl_email || kunde.arch_email || '';
                var kName = kunde.auftraggeber || kunde.name || 'Auftraggeber';
                if (kName.indexOf('Datum') === 0 || kName.indexOf('Unterschrift') !== -1) kName = kunde.name || 'Auftraggeber';

                var typLabel = rechnungsTyp === 'abschlag' ? (abschlagNr + '. Abschlagsrechnung')
                    : rechnungsTyp === 'schluss' ? 'Schlussrechnung'
                    : rechnungsTyp === 'nachtrag' ? 'Nachtragsrechnung'
                    : rechnungsTyp === 'stundenlohn' ? 'Stundenlohnrechnung' : 'Rechnung';

                var bauvorhaben = kunde.adresse || kunde.baumassnahme || kunde.name || '';
                var betreffText = typLabel + ' Nr. ' + rechnungsNr + ' – ' + bauvorhaben;

                var mailBody = 'Sehr geehrte Damen und Herren,\n\n'
                    + 'anbei erhalten Sie unsere ' + typLabel + ' Nr. ' + rechnungsNr + '.\n\n'
                    + 'Bauvorhaben: ' + bauvorhaben + '\n';

                if (leistungszeitraum) {
                    mailBody += 'Leistungszeitraum: ' + leistungszeitraum + '\n';
                }
                if (auftragsnummer) {
                    mailBody += 'Auftragsnummer: ' + auftragsnummer + '\n';
                }

                mailBody += '\nRechnungsbetrag (brutto): ' + fmt(bruttoSumme) + ' €\n';

                if (skontoProzent > 0) {
                    mailBody += 'Zahlbar innerhalb ' + skontoTage + ' Tagen abzgl. ' + skontoProzent + '% Skonto: ' + fmt(zahlbetragMitSkonto) + ' €\n';
                }
                mailBody += 'Zahlbar innerhalb ' + zahlungszielTage + ' Tagen netto: ' + fmt(zahlbetragOhneSkonto) + ' €\n';

                mailBody += '\nBitte überweisen Sie den Rechnungsbetrag auf folgendes Konto:\n'
                    + 'Westerwald Bank eG\n'
                    + 'IBAN: DE12 5739 1800 0000 0000 00\n'
                    + 'BIC: GENODE51WW1\n'
                    + 'Kontoinhaber: Thomas Willwacher Fliesenlegermeister e.K.\n\n'
                    + 'Die Rechnung ist diesem Schreiben als PDF beigefügt.\n\n'
                    + 'Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.\n\n'
                    + 'Mit freundlichen Grüßen\n\n'
                    + 'Thomas Willwacher\n'
                    + 'Fliesenlegermeister e.K.\n'
                    + 'Flurweg 14a · 56472 Nisterau\n'
                    + 'Tel. 02661-63101 · Mobil 0170-2024161';

                // Zuerst PDF erzeugen
                generatePDF();

                // Versuche Gmail-API-Versand, Fallback auf mailto
                var service = window.GoogleDriveService;
                if (service && service.accessToken && empfaengerEmail) {
                    try {
                        var boundary = 'boundary_' + Date.now();
                        var rawParts = [
                            'From: ' + GMAIL_CONFIG.ABSENDER_EMAIL,
                            'To: ' + empfaengerEmail,
                            'Subject: =?UTF-8?B?' + btoa(unescape(encodeURIComponent(betreffText))) + '?=',
                            'MIME-Version: 1.0',
                            'Content-Type: text/plain; charset=UTF-8',
                            '',
                            mailBody
                        ];
                        var rawMail = rawParts.join('\r\n');
                        var encoded = btoa(unescape(encodeURIComponent(rawMail))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

                        var resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                            method: 'POST',
                            headers: { 'Authorization': 'Bearer ' + service.accessToken, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ raw: encoded })
                        });
                        if (resp.ok) {
                            alert('✅ Rechnung per Gmail an ' + empfaengerEmail + ' gesendet!');
                            return;
                        }
                    } catch(gmailErr) {
                        console.warn('Gmail-Versand fehlgeschlagen, Fallback auf mailto:', gmailErr);
                    }
                }

                // Fallback: mailto-Link
                setTimeout(function() {
                    var mailtoLink = 'mailto:' + encodeURIComponent(empfaengerEmail)
                        + '?subject=' + encodeURIComponent(betreffText)
                        + '&body=' + encodeURIComponent(mailBody);
                    window.location.href = mailtoLink;
                }, 1200);
            };

            // ── E-Mail-Adresse bearbeiten (Inline-Dialog) ──
            const [showMailDialog, setShowMailDialog] = useState(false);
            const [mailAdresse, setMailAdresse] = useState('');

            var openMailDialog = function() {
                var email = kunde.ag_email || kunde.bl_email || kunde.arch_email || '';
                setMailAdresse(email);
                setShowMailDialog(true);
            };

            var confirmAndSend = function() {
                // Temporär E-Mail übernehmen
                var origEmail = kunde.ag_email;
                if (mailAdresse) kunde.ag_email = mailAdresse;
                setShowMailDialog(false);
                sendPerEmail();
                // Original wiederherstellen falls es ein Ref-Objekt ist
                if (!mailAdresse) kunde.ag_email = origEmail;
            };


            // ═══════════════════════════════════════════
            // PHASE 1: Typ-Auswahl
            // ═══════════════════════════════════════════
            if (phase === 'typwahl') {
                var typen = [
                    { id: 'abschlag', icon: '📊', name: 'Abschlagsrechnung', desc: 'Teilrechnung mit kumulierter Aufstellung', color: '#1E88E5' },
                    { id: 'schluss', icon: '📋', name: 'Schlussrechnung', desc: 'Endabrechnung mit Gesamtaufstellung', color: '#27ae60' },
                    { id: 'nachtrag', icon: '📑', name: 'Nachtragsrechnung', desc: 'Zusätzliche / geänderte Leistungen', color: '#e67e22' },
                    { id: 'stundenlohn', icon: '⏱️', name: 'Stundenlohnrechnung', desc: 'Regiearbeiten auf Stundenbasis', color: '#8e44ad' },
                    { id: 'einzel', icon: '🧾', name: 'Einzelrechnung', desc: 'Einfache Rechnung ohne Abschläge', color: '#00897b' },
                ];
                return (
                    <div className="page-container" style={{padding:'16px', minHeight:'100vh'}}>
                        <div dangerouslySetInnerHTML={{__html: noSpinnerCSS}} />
                        <div style={{textAlign:'center', marginBottom:'20px'}}>
                            <FirmenLogo size="small" />
                            <div style={{marginTop:'12px', fontSize:'15px', fontWeight:'700'}}>{kunde ? kunde.name : ''}</div>
                            <div style={{fontSize:'11px', color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase', marginTop:'4px'}}>Rechnungstyp wählen</div>
                        </div>
                        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                            {typen.map(function(t) {
                                return (
                                    <button key={t.id} onClick={function(){ setRechnungsTyp(t.id); setPhase('posauswahl'); }}
                                        style={{padding:'14px 16px', borderRadius:'12px', border:'2px solid ' + t.color + '22', background:'var(--bg-secondary)', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', textAlign:'left', boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                                        <span style={{fontSize:'24px'}}>{t.icon}</span>
                                        <div style={{flex:1}}>
                                            <div style={{fontSize:'14px', fontWeight:'700', color: t.color}}>{t.name}</div>
                                            <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>{t.desc}</div>
                                        </div>
                                        <span style={{color:'var(--text-muted)', fontSize:'16px'}}>›</span>
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={onBack} style={{width:'100%', marginTop:'16px', padding:'12px', background:'var(--bg-tertiary)', color:'var(--text-muted)', border:'none', borderRadius:'10px', fontSize:'13px', cursor:'pointer'}}>← Zurück zur Modulwahl</button>
                    </div>
                );
            }

            // ═══════════════════════════════════════════
            // PHASE 2: Positionsauswahl
            // ═══════════════════════════════════════════
            if (phase === 'posauswahl') {
                var allePosn = lvPositionen.map(function(p, i) {
                    return { idx: i, pos: p.pos || p.posNr || String(i+1), bez: p.bez || p.titel || '', einheit: p.einheit || 'm²', menge: p.menge || 0, einzelpreis: p.einzelpreis || p.ep || 0, aufmassMenge: aufmassMassen[p.pos || p.posNr] || 0 };
                });
                var alleAusgewaehlt = allePosn.length > 0 && allePosn.every(function(p) { return posAuswahl[p.idx] !== false; });
                var ausgewaehlteAnzahl = allePosn.filter(function(p) { return posAuswahl[p.idx] !== false; }).length;

                return (
                    <div className="page-container" style={{padding:'16px', minHeight:'100vh', paddingBottom:'90px'}}>
                        <div dangerouslySetInnerHTML={{__html: noSpinnerCSS}} />
                        <div style={{textAlign:'center', marginBottom:'16px'}}>
                            <div style={{fontSize:'11px', color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase'}}>Positionen auswählen</div>
                            <div style={{fontSize:'15px', fontWeight:'700', marginTop:'4px'}}>{kunde ? kunde.name : ''}</div>
                        </div>

                        {allePosn.length > 0 ? (
                            <div style={{background:'var(--bg-secondary)', borderRadius:'14px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.1)', marginBottom:'12px'}}>
                                {/* Alle auswählen */}
                                <div style={{padding:'10px 14px', borderBottom:'2px solid var(--border-color)', display:'flex', alignItems:'center', gap:'8px'}}>
                                    <input type="checkbox" checked={alleAusgewaehlt} onChange={function() {
                                        var neu = {};
                                        allePosn.forEach(function(p) { neu[p.idx] = !alleAusgewaehlt; });
                                        setPosAuswahl(neu);
                                    }} />
                                    <span style={{fontSize:'12px', fontWeight:'700', color:'var(--accent-blue)'}}>Alle Positionen ({allePosn.length})</span>
                                    <span style={{marginLeft:'auto', fontSize:'11px', color:'var(--text-muted)'}}>{ausgewaehlteAnzahl} ausgewählt</span>
                                </div>
                                <div style={{maxHeight:'400px', overflow:'auto'}}>
                                    {allePosn.map(function(p) {
                                        var checked = posAuswahl[p.idx] !== false;
                                        return (
                                            <div key={p.idx} style={{padding:'10px 14px', borderBottom:'1px solid var(--border-color)', display:'flex', alignItems:'flex-start', gap:'8px', opacity: checked ? 1 : 0.4}}>
                                                <input type="checkbox" checked={checked} onChange={function() { setPosAuswahl(function(prev) { var n = Object.assign({}, prev); n[p.idx] = !checked; return n; }); }} style={{marginTop:'2px'}} />
                                                <div style={{flex:1}}>
                                                    <div style={{display:'flex', gap:'6px', alignItems:'center'}}>
                                                        <span style={{fontWeight:'700', fontSize:'11px', color:'var(--accent-blue)', minWidth:'40px'}}>{p.pos}</span>
                                                        <span style={{fontSize:'12px'}}>{p.bez}</span>
                                                    </div>
                                                    <div style={{display:'flex', gap:'12px', marginTop:'3px', fontSize:'11px', color:'var(--text-muted)'}}>
                                                        <span>LV: {fmt(p.menge)} {p.einheit}</span>
                                                        {p.einzelpreis > 0 && <span>EP: {fmt(p.einzelpreis)} €</span>}
                                                        {p.aufmassMenge > 0 && <span style={{color:'var(--success)', fontWeight:'600'}}>Aufmaß: {fmt(p.aufmassMenge)} {p.einheit}</span>}
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

                        {/* Aufmaß-Übernahme Button */}
                        {hatAufmass && (
                            <button onClick={uebernahmeAusAufmass} style={{
                                width:'100%', padding:'12px', marginBottom:'8px', borderRadius:'10px', border:'2px solid #27ae60',
                                background:'rgba(39,174,96,0.08)', color:'var(--success)', fontSize:'13px', fontWeight:'700', cursor:'pointer',
                                display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
                            }}>
                                📐 Positionen + Massen aus Aufmaß übernehmen
                            </button>
                        )}
                        {!hatAufmass && (
                            <div style={{padding:'8px 12px', marginBottom:'8px', borderRadius:'8px', background:'rgba(230,126,34,0.08)', fontSize:'11px', color:'var(--accent-orange)', textAlign:'center'}}>
                                📐 Aufmaß-Übernahme nicht verfügbar -- erstelle zuerst ein Aufmaß
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{position:'fixed', bottom:0, left:0, right:0, padding:'10px 16px', background:'var(--bg-primary)', borderTop:'1px solid var(--border-color)', zIndex:100, display:'flex', gap:'8px'}}>
                            <button onClick={function(){ setPhase('typwahl'); }} style={{flex:1, padding:'12px', background:'var(--bg-tertiary)', color:'var(--text-muted)', border:'none', borderRadius:'10px', fontSize:'12px', cursor:'pointer'}}>← Zurück</button>
                            <button onClick={function(){
                                // Ausgewählte übernehmen
                                var selected = allePosn.filter(function(p) { return posAuswahl[p.idx] !== false; });
                                initPositionen(selected);
                                setPhase('formular');
                            }} disabled={ausgewaehlteAnzahl === 0 && allePosn.length > 0}
                                style={{flex:2, padding:'12px', background: ausgewaehlteAnzahl > 0 || allePosn.length === 0 ? 'var(--accent-blue)' : 'var(--bg-tertiary)', color:'white', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'700', cursor:'pointer'}}>
                                {ausgewaehlteAnzahl > 0 ? ausgewaehlteAnzahl + ' Positionen übernehmen →' : 'Weiter →'}
                            </button>
                        </div>
                        <div style={{marginTop:'4px'}}>
                            <button onClick={function(){ setPositionen([]); setPhase('formular'); }}
                                style={{width:'100%', padding:'10px', background:'none', color:'var(--text-muted)', border:'1px dashed var(--border-color)', borderRadius:'10px', fontSize:'12px', cursor:'pointer'}}>
                                ✏️ Alle Positionen manuell eingeben
                            </button>
                        </div>
                    </div>
                );
            }

            // ═══════════════════════════════════════════
            // PHASE 3: Rechnungsformular
            // ═══════════════════════════════════════════
            var typColor = rechnungsTyp === 'abschlag' ? '#1E88E5' : rechnungsTyp === 'schluss' ? '#27ae60' : rechnungsTyp === 'nachtrag' ? '#e67e22' : rechnungsTyp === 'stundenlohn' ? '#8e44ad' : '#00897b';
            var typLabel = rechnungsTyp === 'abschlag' ? abschlagNr + '. Abschlagsrechnung'
                : rechnungsTyp === 'schluss' ? 'Schlussrechnung'
                : rechnungsTyp === 'nachtrag' ? 'Nachtragsrechnung'
                : rechnungsTyp === 'stundenlohn' ? 'Stundenlohnrechnung'
                : 'Einzelrechnung';

            return (
                <div className="page-container" style={{padding:'16px', minHeight:'100vh', paddingBottom:'80px'}}>
                    <div dangerouslySetInnerHTML={{__html: noSpinnerCSS}} />

                    {/* === PDF-VORSCHAU BRIEFKOPF === */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'14px', padding:'16px', marginBottom:'10px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                        {/* Logo oben links -- wie Startseite */}
                        <div style={{marginBottom:'6px'}}>
                            <FirmenLogo size="small" />
                        </div>
                        {/* Rote Trennlinie */}
                        <div style={{borderTop:'2.5px solid var(--accent-red)', margin:'6px 0 4px'}}></div>
                        {/* Absenderzeile */}
                        <div style={{fontSize:'8px', color:'var(--text-muted)', borderBottom:'0.5px solid var(--border-color)', display:'inline-block', paddingBottom:'1px', marginBottom:'10px', letterSpacing:'0.2px'}}>
                            Thomas Willwacher Fliesenlegermeister e.K. · Flurweg 14a · 56472 Nisterau
                        </div>

                        {/* Empfaenger links + Dokumentdaten rechts */}
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px'}}>
                            {/* Empfaenger */}
                            <div style={{flex:1}}>
                                <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)', marginBottom:'2px'}}>
                                    {kunde ? (kunde.auftraggeber || kunde.name || '') : ''}
                                </div>
                                <div style={{fontSize:'12px', color:'var(--text-secondary)', lineHeight:'1.5'}}>
                                    {kunde ? (kunde.ag_adresse || kunde.adresse || '').split(/[,]+/).map(function(line, i) {
                                        return React.createElement('div', {key: i}, line.trim());
                                    }) : ''}
                                </div>
                            </div>
                            {/* Dokumentdaten rechts */}
                            <div style={{minWidth:'120px', textAlign:'right'}}>
                                <div style={{marginBottom:'4px'}}>
                                    <div style={{fontSize:'7px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px'}}>Datum</div>
                                    <div style={{fontSize:'12px', fontWeight:'600'}}>{new Date(rechnungsDatum).toLocaleDateString('de-DE')}</div>
                                </div>
                                {leistungszeitraum && <div style={{marginBottom:'4px'}}>
                                    <div style={{fontSize:'7px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px'}}>Leistungszeitraum</div>
                                    <div style={{fontSize:'11px', fontWeight:'600'}}>{leistungszeitraum}</div>
                                </div>}
                                <div style={{marginBottom:'4px'}}>
                                    <div style={{fontSize:'7px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px'}}>Rechnungs-Nr.</div>
                                    <div style={{fontSize:'11px', fontWeight:'600', color: typColor}}>{rechnungsNr}</div>
                                </div>
                                {auftragsnummer && <div style={{marginBottom:'4px'}}>
                                    <div style={{fontSize:'7px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px'}}>Auftragsnummer</div>
                                    <div style={{fontSize:'11px', fontWeight:'600'}}>{auftragsnummer}</div>
                                </div>}
                                {kostenstelle && <div style={{marginBottom:'4px'}}>
                                    <div style={{fontSize:'7px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px'}}>Kostenstelle</div>
                                    <div style={{fontSize:'11px', fontWeight:'600'}}>{kostenstelle}</div>
                                </div>}
                            </div>
                        </div>

                        {/* Dokumenttitel */}
                        <div style={{fontSize:'18px', fontWeight:'700', color: typColor, marginBottom:'4px', letterSpacing:'0.3px'}}>{typLabel}</div>
                        {/* Bauvorhaben gross */}
                        <div style={{marginBottom:'4px'}}>
                            <div style={{fontSize:'8px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'1px'}}>Bauvorhaben</div>
                            <div style={{fontSize:'15px', fontWeight:'700', color:'var(--text-primary)', lineHeight:'1.3'}}>{kunde ? (kunde.adresse || kunde.name || '') : ''}</div>
                        </div>
                    </div>

                    {/* === RECHNUNGSDATEN EINGABE === */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'12px', marginBottom:'10px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                        <div style={{fontSize:'11px', fontWeight:'700', color: typColor, marginBottom:'8px'}}>Rechnungsdaten bearbeiten</div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px'}}>
                            <div><label style={{fontSize:'10px', color:'var(--text-muted)', display:'block'}}>Datum</label>
                                <input type="date" value={rechnungsDatum} onChange={function(e){setRechnungsDatum(e.target.value);}} style={inputStyle} /></div>
                            <div style={{gridColumn:'span 2'}}><MicLabel fieldKey="re_lz" label="Leistungszeitraum" />
                                <div style={{display:'flex', gap:'3px'}}><MicInput fieldKey="re_lz" value={leistungszeitraum} onChange={function(e){setLeistungszeitraum(e.target.value);}} placeholder="z.B. 01.01. \u2013 31.03.2026" style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="re_lz" size="small" onResult={function(t){setLeistungszeitraum((leistungszeitraum||'')+' '+t);}} /></div></div>
                            <div><MicLabel fieldKey="re_nr" label="Rechnungs-Nr." />
                                <div style={{display:'flex', gap:'3px'}}><MicInput fieldKey="re_nr" value={rechnungsNr} onChange={function(e){setRechnungsNr(e.target.value);}} style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="re_nr" size="small" onResult={function(t){setRechnungsNr(rechnungsNr+t);}} /></div></div>
                            <div><MicLabel fieldKey="re_auftr" label="Auftragsnummer" />
                                <div style={{display:'flex', gap:'3px'}}><MicInput fieldKey="re_auftr" value={auftragsnummer} onChange={function(e){setAuftragsnummer(e.target.value);}} placeholder="z.B. A-2026-001" style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="re_auftr" size="small" onResult={function(t){setAuftragsnummer((auftragsnummer||'')+t);}} /></div></div>
                            <div><MicLabel fieldKey="re_kst" label="Kostenstelle" />
                                <div style={{display:'flex', gap:'3px'}}><MicInput fieldKey="re_kst" value={kostenstelle} onChange={function(e){setKostenstelle(e.target.value);}} placeholder="optional" style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="re_kst" size="small" onResult={function(t){setKostenstelle((kostenstelle||'')+t);}} /></div></div>
                            {rechnungsTyp === 'abschlag' && <div><label style={{fontSize:'10px', color:'var(--text-muted)', display:'block'}}>Abschlags-Nr.</label>
                                <input type="text" inputMode="numeric" value={abschlagNr} onChange={function(e){setAbschlagNr(parseInt(e.target.value)||1);}} style={inputStyle} /></div>}
                            {rechnungsTyp === 'schluss' && <div><label style={{fontSize:'10px', color:'var(--text-muted)', display:'block'}}>Bisher abgerechnet (netto \u20ac)</label>
                                <input type="text" inputMode="decimal" value={bisherAbgerechnet} onChange={function(e){setBisherAbgerechnet(e.target.value);}} style={inputStyle} /></div>}
                        </div>
                    </div>

                    {/* Positionen -- gleiches Format für alle Rechnungstypen */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'12px', marginBottom:'10px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                                <div style={{fontSize:'11px', fontWeight:'700', color: typColor}}>📋 Positionen ({aktivePosn.length})</div>
                                <button onClick={addPosition} style={{padding:'3px 8px', fontSize:'10px', background: typColor, color:'white', border:'none', borderRadius:'6px', cursor:'pointer'}}>+ Neu</button>
                            </div>

                            {/* Tabellenkopf */}
                            <div style={{display:'grid', gridTemplateColumns:'28px 38px 52px 36px 1fr 62px 68px', gap:'2px', padding:'4px 2px', fontSize:'9px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'2px solid var(--border-color)'}}>
                                <span></span>
                                <span>Pos.</span>
                                <span style={{textAlign:'right'}}>Menge</span>
                                <span style={{textAlign:'center'}}>Einh.</span>
                                <span>Bezeichnung</span>
                                <span style={{textAlign:'right'}}>EP (€)</span>
                                <span style={{textAlign:'right'}}>GP (€)</span>
                            </div>

                            {positionen.length === 0 ? (
                                <div style={{textAlign:'center', padding:'16px', color:'var(--text-muted)', fontSize:'12px'}}>Keine Positionen. Klicke "+ Neu" zum Anlegen.</div>
                            ) : (
                                <div>
                                    {positionen.map(function(p) {
                                        var gp = (parseFloat(p.menge)||0) * (parseFloat(p.einzelpreis)||0);
                                        return (
                                            <div key={p.id} style={{display:'grid', gridTemplateColumns:'28px 38px 52px 36px 1fr 62px 68px', gap:'2px', padding:'6px 2px', borderBottom:'1px solid var(--border-color)', alignItems:'start', opacity: p.aktiv ? 1 : 0.3}}>
                                                {/* Checkbox + Löschen */}
                                                <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', paddingTop:'2px'}}>
                                                    <input type="checkbox" checked={p.aktiv} onChange={function(){updatePos(p.id,'aktiv',!p.aktiv);}} />
                                                    <button onClick={function(){removePosition(p.id);}} style={{background:'none', border:'none', color:'var(--accent-red-light)', fontSize:'10px', cursor:'pointer', padding:0, lineHeight:1}}>✕</button>
                                                </div>
                                                {/* Pos-Nr */}
                                                <input value={p.pos} onChange={function(e){updatePos(p.id,'pos',e.target.value);}}
                                                    style={{padding:'4px 3px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'11px', fontWeight:'700', color: typColor, textAlign:'center', width:'100%', boxSizing:'border-box'}} />
                                                {/* Menge */}
                                                <input type="number" step="0.001" value={p.menge || ''} onChange={function(e){updatePos(p.id,'menge',e.target.value);}} placeholder="0,00"
                                                    onBlur={function(e){ var v = parseFloat(e.target.value); updatePos(p.id, 'menge', isNaN(v) ? 0 : Number(v.toFixed(2))); }}
                                                    onKeyDown={function(e){ if(e.key==='Enter'){e.target.blur();} }}
                                                    style={{padding:'4px 4px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'11px', color:'var(--text-primary)', textAlign:'right', width:'100%', boxSizing:'border-box'}} />
                                                {/* Einheit */}
                                                <input value={p.einheit} onChange={function(e){updatePos(p.id,'einheit',e.target.value);}}
                                                    style={{padding:'4px 2px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'10px', color:'var(--text-primary)', textAlign:'center', width:'100%', boxSizing:'border-box'}} />
                                                {/* Bezeichnung */}
                                                <div style={{padding:'0'}}>
                                                    <div contentEditable={true} suppressContentEditableWarning={true}
                                                        onBlur={function(e){updatePos(p.id,'bez',e.target.innerText);}}
                                                        style={{padding:'4px 6px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'11px', color:'var(--text-primary)', lineHeight:'1.4', minHeight:'28px', wordBreak:'break-word', outline:'none'}}>
                                                        {p.bez}
                                                    </div>
                                                </div>
                                                {/* EP */}
                                                <input type="number" step="0.01" value={p.einzelpreis || ''} onChange={function(e){updatePos(p.id,'einzelpreis',e.target.value);}} placeholder="0,00"
                                                    onBlur={function(e){ var v = parseFloat(e.target.value); updatePos(p.id, 'einzelpreis', isNaN(v) ? 0 : Number(v.toFixed(2))); }}
                                                    onKeyDown={function(e){ if(e.key==='Enter'){e.target.blur();} }}
                                                    style={{padding:'4px 4px', borderRadius:'4px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'11px', color:'var(--text-primary)', textAlign:'right', width:'100%', boxSizing:'border-box'}} />
                                                {/* GP (berechnet) */}
                                                <div style={{fontSize:'12px', fontWeight:'700', textAlign:'right', padding:'4px 2px', color: typColor}}>
                                                    {fmt(gp)} €
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                    </div>

                    {/* Konditionen */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'12px', marginBottom:'10px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                        <div style={{fontSize:'11px', fontWeight:'700', color:'var(--text-secondary)', marginBottom:'8px'}}>⚙️ Konditionen</div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'6px'}}>
                            <div><label style={{fontSize:'9px', color:'var(--text-muted)', display:'block'}}>Skonto %</label>
                                <input type="number" step="0.5" value={skontoProzent} onChange={function(e){setSkontoProzent(parseFloat(e.target.value)||0);}} style={smallInputStyle} /></div>
                            <div><label style={{fontSize:'9px', color:'var(--text-muted)', display:'block'}}>Skonto Tage</label>
                                <input type="number" value={skontoTage} onChange={function(e){setSkontoTage(parseInt(e.target.value)||0);}} style={smallInputStyle} /></div>
                            <div><label style={{fontSize:'9px', color:'var(--text-muted)', display:'block'}}>Zahlungsziel</label>
                                <input type="number" value={zahlungszielTage} onChange={function(e){setZahlungszielTage(parseInt(e.target.value)||0);}} style={smallInputStyle} /></div>
                            <div><label style={{fontSize:'9px', color:'var(--text-muted)', display:'block'}}>Einbehalt %</label>
                                <input type="number" step="0.5" value={sicherheitseinbehalt} onChange={function(e){setSicherheitseinbehalt(parseFloat(e.target.value)||0);}} style={smallInputStyle} /></div>
                        </div>
                    </div>

                    {/* Bemerkung */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'12px', marginBottom:'10px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                        <MicLabel fieldKey="re_bem" label="Bemerkung" style={{fontSize:'11px', fontWeight:'700', color:'var(--text-secondary)', marginBottom:'6px'}} />
                        <div style={{display:'flex', gap:'4px', alignItems:'flex-start'}}>
                            <MicInput fieldKey="re_bem" multiline={true} value={bemerkung} onChange={function(e){setBemerkung(e.target.value);}} rows={2} placeholder="Optionaler Zusatztext auf der Rechnung..."
                                style={{flex:1, padding:'8px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'12px', color:'var(--text-primary)', resize:'vertical', boxSizing:'border-box'}} />
                            <MicButton fieldKey="re_bem" size="normal" onResult={function(t){setBemerkung((bemerkung||'')+(bemerkung?' ':'')+t);}} />
                        </div>
                    </div>

                    {/* Summenblock */}
                    <div style={{background:'var(--bg-secondary)', borderRadius:'12px', padding:'14px', marginBottom:'10px', boxShadow:'0 2px 8px rgba(0,0,0,0.12)'}}>
                        <div style={{fontSize:'11px', fontWeight:'700', color:'var(--text-secondary)', marginBottom:'8px'}}>💰 Berechnung</div>
                        <div style={{fontSize:'13px', lineHeight:'2'}}>
                            <div style={{display:'flex', justifyContent:'space-between'}}><span>Nettobetrag:</span><span style={{fontWeight:'600'}}>{fmt(nettoSumme)} €</span></div>
                            <div style={{display:'flex', justifyContent:'space-between', color:'var(--text-muted)', fontSize:'12px'}}><span>zzgl. MwSt. {mwstSatz}%:</span><span>{fmt(mwstBetrag)} €</span></div>
                            <div style={{display:'flex', justifyContent:'space-between', fontWeight:'700', fontSize:'16px', borderTop:'2px solid var(--border-color)', paddingTop:'4px', marginTop:'2px'}}><span>Bruttobetrag:</span><span>{fmt(bruttoSumme)} €</span></div>
                            {sicherheitseinbehalt > 0 && <div style={{display:'flex', justifyContent:'space-between', color:'var(--text-muted)', fontSize:'11px'}}><span>abzgl. Einbehalt {sicherheitseinbehalt}%:</span><span>– {fmt(sicherheitBetrag)} €</span></div>}
                            <div style={{display:'flex', justifyContent:'space-between', color: typColor, fontWeight:'700', marginTop:'2px', fontSize:'13px'}}>
                                <span>Mit Skonto ({skontoProzent}%, {skontoTage} T.):</span><span>{fmt(zahlbetragMitSkonto)} €</span>
                            </div>
                            <div style={{display:'flex', justifyContent:'space-between', fontWeight:'600', fontSize:'13px'}}>
                                <span>Netto ({zahlungszielTage} Tage):</span><span>{fmt(zahlbetragOhneSkonto)} €</span>
                            </div>
                        </div>
                    </div>

                    {/* E-Mail Dialog */}
                    {showMailDialog && (
                        <div className="modal-overlay" onClick={function(){ setShowMailDialog(false); }}>
                            <div className="modal" onClick={function(e){ e.stopPropagation(); }} style={{maxWidth:'380px'}}>
                                <div className="modal-title">✉️ Rechnung per E-Mail senden</div>
                                <div style={{marginBottom:'12px'}}>
                                    <div style={{fontSize:'12px', color:'var(--text-muted)', marginBottom:'10px', lineHeight:'1.5'}}>
                                        Die Rechnung wird als PDF erstellt und Ihr E-Mail-Programm geöffnet. Bitte fügen Sie die PDF-Datei manuell als Anhang hinzu.
                                    </div>
                                    <label style={{fontSize:'11px', color:'var(--text-muted)', display:'block', marginBottom:'4px'}}>Empfänger E-Mail-Adresse</label>
                                    <input
                                        type="email"
                                        value={mailAdresse}
                                        onChange={function(e){ setMailAdresse(e.target.value); }}
                                        placeholder="empfaenger@firma.de"
                                        style={{width:'100%', padding:'10px 12px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'14px', color:'var(--text-primary)', boxSizing:'border-box'}}
                                        autoFocus
                                    />
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
                                        ✉️ PDF erstellen & Mail öffnen
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
                                style={{padding:'12px 10px', background:'var(--bg-tertiary)', color:'var(--text-muted)', border:'none', borderRadius:'10px', fontSize:'12px', cursor:'pointer', touchAction:'manipulation', minWidth:'44px', minHeight:'44px'}}>←</button>
                            <button
                                onTouchEnd={function(e){ e.preventDefault(); setShowFormatWahl(!showFormatWahl); }}
                                onClick={function(){ setShowFormatWahl(!showFormatWahl); }}
                                style={{flex:1, padding:'12px', background:'linear-gradient(135deg, ' + typColor + ', ' + typColor + 'cc)', color:'white', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', touchAction:'manipulation', minHeight:'48px'}}>
                                📄 Rechnung erstellen {showFormatWahl ? '▼' : '▲'}
                            </button>
                            <button
                                onTouchEnd={function(e){ e.preventDefault(); openMailDialog(); }}
                                onClick={openMailDialog}
                                style={{padding:'12px 16px', background:'linear-gradient(135deg, #e67e22, #d35400)', color:'white', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', touchAction:'manipulation', minHeight:'48px'}}>
                                ✉️
                            </button>
                        </div>

                        {/* Format-Auswahl Panel */}
                        {showFormatWahl && (
                            <div style={{display:'flex', flexDirection:'column', gap:'6px', padding:'8px 0 4px', animation:'fadeIn 0.15s ease'}}>
                                {/* PDF Standard */}
                                <button
                                    onTouchEnd={function(e){ e.preventDefault(); generatePDF(); setShowFormatWahl(false); }}
                                    onClick={function(){ generatePDF(); setShowFormatWahl(false); }}
                                    style={{width:'100%', padding:'14px 16px', borderRadius:'12px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', textAlign:'left', touchAction:'manipulation', minHeight:'56px', WebkitTapHighlightColor:'rgba(30,136,229,0.2)'}}>
                                    <span style={{fontSize:'24px'}}>📄</span>
                                    <div style={{flex:1}}>
                                        <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)'}}>PDF-Rechnung</div>
                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>Standard-PDF · Für Privatkunden (B2C) & Druck</div>
                                    </div>
                                    <span style={{fontSize:'11px', color:'var(--text-muted)', background:'var(--bg-tertiary)', padding:'3px 8px', borderRadius:'6px', fontWeight:'600'}}>B2C</span>
                                </button>

                                {/* ZUGFeRD */}
                                <button
                                    onTouchEnd={function(e){ e.preventDefault(); downloadZUGFeRD(); setShowFormatWahl(false); }}
                                    onClick={function(){ downloadZUGFeRD(); setShowFormatWahl(false); }}
                                    style={{width:'100%', padding:'14px 16px', borderRadius:'12px', border:'1px solid rgba(39,174,96,0.3)', background:'rgba(39,174,96,0.05)', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', textAlign:'left', touchAction:'manipulation', minHeight:'56px', WebkitTapHighlightColor:'rgba(39,174,96,0.2)'}}>
                                    <span style={{fontSize:'24px'}}>📋</span>
                                    <div style={{flex:1}}>
                                        <div style={{fontSize:'14px', fontWeight:'700', color:'var(--success)'}}>ZUGFeRD E-Rechnung</div>
                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>PDF + XML (EN16931) · Hybrid für Geschäftskunden</div>
                                    </div>
                                    <span style={{fontSize:'11px', color:'var(--success)', background:'rgba(39,174,96,0.1)', padding:'3px 8px', borderRadius:'6px', fontWeight:'600'}}>B2B</span>
                                </button>

                                {/* XRechnung */}
                                <button
                                    onTouchEnd={function(e){ e.preventDefault(); downloadXRechnung(); setShowFormatWahl(false); }}
                                    onClick={function(){ downloadXRechnung(); setShowFormatWahl(false); }}
                                    style={{width:'100%', padding:'14px 16px', borderRadius:'12px', border:'1px solid rgba(30,136,229,0.3)', background:'rgba(30,136,229,0.05)', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', textAlign:'left', touchAction:'manipulation', minHeight:'56px', WebkitTapHighlightColor:'rgba(30,136,229,0.2)'}}>
                                    <span style={{fontSize:'24px'}}>🏛️</span>
                                    <div style={{flex:1}}>
                                        <div style={{fontSize:'14px', fontWeight:'700', color:'var(--accent-blue)'}}>XRechnung</div>
                                        <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'1px'}}>Reines XML (CII) · Für Behörden & öffentl. Auftraggeber</div>
                                    </div>
                                    <span style={{fontSize:'11px', color:'var(--accent-blue)', background:'rgba(30,136,229,0.1)', padding:'3px 8px', borderRadius:'6px', fontWeight:'600'}}>B2G</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           SCHRIFTVERKEHR-MODUL -- Mail & Post Korrespondenz
           ═══════════════════════════════════════════ */
