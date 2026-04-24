        /* =====================================================================
           RECHNUNGSMODUL -- 6 Untermodule, PDF-nahe Startseite
           Skill: SKILL-rechnungsmodul-umbau.md + Thomas 5 Aenderungen
           Phase: typwahl -> startseite (PDF-Vorschau) -> posauswahl -> formular
           Buttons: Alle 6 in einheitlichem Blau
           6. Button: Aufmass (laedt Gesamtliste, druckt/versendet als PDF)
           ===================================================================== */
        function RechnungsModul({ kunde, importResult, gesamtliste, aufmassGespeichert, vorwahlTyp, onVorwahlUsed, onBack }) {
            const [phase, setPhase] = useState(vorwahlTyp ? 'startseite' : 'typwahl');
            const [rechnungsTyp, setRechnungsTyp] = useState(vorwahlTyp || null);
            const [positionen, setPositionen] = useState([]);
            const [positionenGeladen, setPositionenGeladen] = useState(false);
            const [showDatenLaden, setShowDatenLaden] = useState(false);
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
            const [nachtragsNr, setNachtragsNr] = useState('');
            const [angebotsNr, setAngebotsNr] = useState('');
            const [aufmassNr, setAufmassNr] = useState('');
            const [gueltigBis, setGueltigBis] = useState('');
            const [kontozahlungen, setKontozahlungen] = useState([]);
            const [showKontoDialog, setShowKontoDialog] = useState(false);
            const [showFormatWahl, setShowFormatWahl] = useState(false);
            const [showMailDialog, setShowMailDialog] = useState(false);
            const [showBearbeitenPopup, setShowBearbeitenPopup] = useState(false);
            const [editMode, setEditMode] = useState(false);
            const [mailAdresse, setMailAdresse] = useState('');
            // Editierbare Adress-States (werden aus Kundendaten initialisiert)
            const [empfName, setEmpfName] = useState('');
            const [empfZusatz, setEmpfZusatz] = useState('');
            const [empfStrasse, setEmpfStrasse] = useState('');
            const [empfPlzOrt, setEmpfPlzOrt] = useState('');
            const [bauvorhabenText, setBauvorhabenText] = useState('');
            // Adresse aus Kundendaten initialisieren wenn Kunde wechselt
            useEffect(function() {
                if (!kunde) return;
                var n = kunde.auftraggeber || kunde.name || '';
                if (n.indexOf('Datum') === 0 || n.indexOf('Unterschrift') !== -1) n = kunde.name || '';
                setEmpfName(n);
                // Datenquellen: importResult.kundendaten, importResult.stammdaten.bauherr, kunde._stammFelder, kunde direkt
                var kd = (importResult && importResult.kundendaten) || {};
                var bh = (importResult && importResult.stammdaten && importResult.stammdaten.bauherr) || {};
                var sf = kunde._stammFelder || {};
                // Ansprechpartner
                var ap = kd.auftraggeber_ansprechpartner || bh.ansprechpartner || sf.bauherr_ansprechpartner || kunde.auftraggeber_ansprechpartner || '';
                if (ap) setEmpfZusatz('z.Hd. ' + ap);
                // Strasse: separate Felder haben Vorrang
                var strasse = kd.auftraggeber_strasse || bh.strasse || sf.bauherr_strasse || kunde.auftraggeber_strasse || '';
                // PLZ/Ort
                var plzOrt = kd.auftraggeber_plzOrt || sf.bauherr_plzOrt || kunde.auftraggeber_plzOrt || '';
                if (!plzOrt && bh.plz) plzOrt = (bh.plz + ' ' + (bh.ort || '')).trim();
                // Fallback: kombinierte ag_adresse parsen
                if (!strasse && !plzOrt) {
                    var ad = kunde.ag_adresse || kunde.adresse || '';
                    if (ad.indexOf('Datum') !== -1) ad = kunde.adresse || '';
                    if (ad) {
                        var m = ad.match(/^(.*?)[\s,]+(\d{5}\s+.*)$/);
                        if (m) { strasse = m[1].trim(); plzOrt = m[2].trim(); }
                        else { var parts = []; ad.split(',').forEach(function(s) { if (s.trim()) parts.push(s.trim()); }); strasse = parts[0] || ''; plzOrt = parts[1] || ''; }
                    }
                }
                setEmpfStrasse(strasse);
                setEmpfPlzOrt(plzOrt);
                setBauvorhabenText(kunde.adresse || kunde.baumassnahme || kunde.name || '');
            }, [kunde]);
            // --- Vorwahl: Wenn vom Aufmass-Modul direkt hierher navigiert ---
            useEffect(function() {
                if (vorwahlTyp === 'aufmass' && gesamtliste && gesamtliste.length > 0) {
                    var amPos = [];
                    var seen = {};
                    gesamtliste.forEach(function(room) {
                        (room.positionen || []).forEach(function(p) {
                            var key = p.pos || p.posNr;
                            if (!seen[key]) {
                                seen[key] = { pos: key, bez: p.bez || '', einheit: p.einheit || 'm\u00B2', menge: 0, einzelpreis: 0 };
                            }
                            seen[key].menge += (parseFloat(p.ergebnis) || 0);
                        });
                    });
                    Object.keys(seen).forEach(function(k) { amPos.push(seen[k]); });
                    setPositionen(amPos);
                    setPositionenGeladen(true);
                    if (onVorwahlUsed) onVorwahlUsed();
                }
            }, [vorwahlTyp]);
            var lvPositionen = [];
            if (importResult && importResult.positionen && importResult.positionen.length > 0) { lvPositionen = importResult.positionen; }
            else if (kunde && kunde._lvPositionen && kunde._lvPositionen.length > 0) { lvPositionen = kunde._lvPositionen; }
            else if (typeof LV_POSITIONEN !== 'undefined') { var ks = [kunde._lvPositionenKey, kunde._driveFolderId, kunde.id, kunde.name].filter(Boolean); for (var ki=0;ki<ks.length;ki++) { if (LV_POSITIONEN[ks[ki]] && LV_POSITIONEN[ks[ki]].length>0) { lvPositionen=LV_POSITIONEN[ks[ki]]; break; } } }
            if (lvPositionen.length>0 && kunde) { var ik=kunde._driveFolderId||kunde.id||kunde.name; if(ik&&typeof LV_POSITIONEN!=='undefined') LV_POSITIONEN[ik]=lvPositionen; }
            var aufmassMassen = {};
            if (gesamtliste && gesamtliste.length>0) { gesamtliste.forEach(function(room) { (room.positionen||[]).forEach(function(p) { var key=p.pos||p.posNr; if(key){if(!aufmassMassen[key])aufmassMassen[key]=0; aufmassMassen[key]+=parseFloat(p.ergebnis)||0;} }); }); }
            var hatAufmass = aufmassGespeichert && gesamtliste && gesamtliste.length>0;
            useEffect(function() { if(!rechnungsTyp)return; var y=new Date().getFullYear(); var r=String(Math.floor(Math.random()*900)+100); if(rechnungsTyp==='nachtrag'){setNachtragsNr('NT-'+y+'-'+r);} else if(rechnungsTyp==='angebot'){setAngebotsNr('AG-'+y+'-'+r);} else if(rechnungsTyp==='aufmass'){setAufmassNr('AM-'+y+'-'+r);} else{setRechnungsNr('RE-'+y+'-'+r);} }, [rechnungsTyp]);
            var istRechnung = rechnungsTyp==='abschlag'||rechnungsTyp==='schluss'||rechnungsTyp==='einzel';
            var getDokumentNr = function() { return rechnungsTyp==='nachtrag'?nachtragsNr:rechnungsTyp==='angebot'?angebotsNr:rechnungsTyp==='aufmass'?aufmassNr:rechnungsNr; };
            var typFarben = {abschlag:'#1E88E5',schluss:'#27ae60',einzel:'#00897b',nachtrag:'#e67e22',angebot:'#8e44ad'};
            var typColor = typFarben[rechnungsTyp]||'#1E88E5';
            var kName = kunde?(kunde.auftraggeber||kunde.name||''):'';
            if(kName.indexOf('Datum')===0||kName.indexOf('Unterschrift')!==-1) kName=kunde.name||'';
            var kAddr = kunde?(kunde.ag_adresse||kunde.adresse||''):'';
            if(kAddr.indexOf('Datum')!==-1) kAddr=kunde.adresse||'';
            var bauvorhaben = kunde?(kunde.adresse||kunde.baumassnahme||kunde.name||''):'';
            var aLines=[]; if(kAddr){var adM=kAddr.match(/^(.*?)[\s,]+(\d{5}\s+.*)$/); if(adM){aLines.push(adM[1].trim());aLines.push(adM[2].trim());}else{kAddr.split(',').forEach(function(s){if(s.trim())aLines.push(s.trim());});}}
            var updatePos = function(id,f,v){setPositionen(function(prev){return prev.map(function(p){if(p.id!==id)return p; var u=Object.assign({},p);u[f]=v;return u;});});};
            var addPosition = function(){var mx=positionen.reduce(function(m,p){return Math.max(m,p.id);},-1); setPositionen(function(prev){return prev.concat([{id:mx+1,pos:String(prev.length+1),bez:'',einheit:'m\u00B2',menge:0,einzelpreis:0,aktiv:true}]);});};
            var removePosition = function(id){setPositionen(function(prev){return prev.filter(function(p){return p.id!==id;});});};
            var ladenAusAufmass = function(){var mg=[],seen={}; lvPositionen.forEach(function(lv){var key=lv.pos||lv.posNr;var am=aufmassMassen[key]||0;if(am<=0)return;var ep=parseFloat(lv.einzelpreis)||parseFloat(lv.ep)||0;mg.push({id:mg.length,pos:key,bez:lv.bez||lv.titel||'',einheit:lv.einheit||'m\u00B2',menge:am,einzelpreis:ep,aktiv:true});seen[key]=true;}); Object.keys(aufmassMassen).forEach(function(key){if(!seen[key]&&aufmassMassen[key]>0){mg.push({id:mg.length,pos:key,bez:'Position '+key,einheit:'m\u00B2',menge:aufmassMassen[key],einzelpreis:0,aktiv:true});}});if(mg.length===0){alert('Keine berechneten Aufmass-Positionen.');return;} setPositionen(mg);setPositionenGeladen(true);setShowDatenLaden(false);};
            var ladenAusKundenpositionen = function(){setShowDatenLaden(false);setPhase('posauswahl');};
            var ladenAusDatei = function(){var inp=document.createElement('input');inp.type='file';inp.accept='.pdf,.xlsx,.csv,.json';inp.onchange=function(e){var f=e.target.files[0];if(!f)return;alert('Datei "'+f.name+'" - Import wird in spaeteren Versionen unterstuetzt.');};inp.click();setShowDatenLaden(false);};
            var initPositionen = function(sel){setPositionen(sel.map(function(p,i){var ep=parseFloat(p.einzelpreis)||parseFloat(p.ep)||0;var me=parseFloat(p.menge)||0;var lm=lvPositionen.find(function(lv){return(lv.pos||lv.posNr)===(p.pos||p.posNr);});if(lm){var le=parseFloat(lm.einzelpreis)||parseFloat(lm.ep)||0;if(le>0)ep=le;if(me===0)me=parseFloat(lm.menge)||0;}var am=aufmassMassen[p.pos||p.posNr]||0;if(am>0)me=am;return{id:i,pos:p.pos||p.posNr||String(i+1),bez:p.bez||p.titel||'',einheit:p.einheit||'m\u00B2',menge:me,einzelpreis:ep,aktiv:true};}));setPositionenGeladen(true);};
            var fmt = function(n){return Number(n||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});};
            var aktivePosn = positionen.filter(function(p){return p.aktiv;});
            var nettoSumme = aktivePosn.reduce(function(s,p){return s+(parseFloat(p.menge)||0)*(parseFloat(p.einzelpreis)||0);},0);
            var mwstSatz=19; var mwstBetrag=nettoSumme*mwstSatz/100; var bruttoSumme=nettoSumme+mwstBetrag;
            var sicherheitBetrag=istRechnung?(bruttoSumme*sicherheitseinbehalt/100):0;
            var skontoBetrag=istRechnung?((bruttoSumme-sicherheitBetrag)*skontoProzent/100):0;
            var zahlbetragMitSkonto=bruttoSumme-sicherheitBetrag-skontoBetrag;
            var zahlbetragOhneSkonto=bruttoSumme-sicherheitBetrag;
            var ladeKontozahlungen=function(){try{var d=JSON.parse(localStorage.getItem('tw_ausgangsbuch')||'[]');var kid=kunde._driveFolderId||kunde.id||kunde.name||'';var ab=d.filter(function(e){return e.kundeId===kid&&e.rechnungsTyp==='abschlag';});setKontozahlungen(ab.map(function(a){return{id:a.id,nr:a.rechnungsNr||a.dokumentNr,datum:a.datum,betrag:a.bruttoBetrag,aufgefuehrt:true};}));}catch(e){}};
            var kontoSumme=kontozahlungen.filter(function(k){return k.aufgefuehrt;}).reduce(function(s,k){return s+(parseFloat(k.betrag)||0);},0);
            var addNachtragsPositionen=function(){if(rechnungsTyp!=='nachtrag'||aktivePosn.length===0)return;var kid=kunde._driveFolderId||kunde.id||kunde.name;var key='lv_positionen_'+kid;var best=[];try{best=JSON.parse(localStorage.getItem(key)||'[]');}catch(e){}aktivePosn.forEach(function(np){best.push({pos:np.pos,posNr:np.pos,bez:'[NT] '+(np.bez||''),einheit:np.einheit,menge:np.menge,einzelpreis:np.einzelpreis,ep:np.einzelpreis,quelle:'nachtrag',nachtragsNr:nachtragsNr,erstelltAm:new Date().toISOString()});});localStorage.setItem(key,JSON.stringify(best));if(typeof LV_POSITIONEN!=='undefined')LV_POSITIONEN[kid]=best;};
            var getDateiname=function(){var pf=rechnungsTyp==='abschlag'?'Abschlagsrechnung':rechnungsTyp==='schluss'?'Schlussrechnung':rechnungsTyp==='einzel'?'Rechnung':rechnungsTyp==='nachtrag'?'Nachtrag':rechnungsTyp==='aufmass'?'Aufmass':'Angebot';return pf+'_'+getDokumentNr()+'_'+(kunde.name||'Kunde').replace(/[^a-zA-Z0-9_-]/g,'_')+'_'+rechnungsDatum.replace(/-/g,'')+'.pdf';};
            var saveToGoogleDrive=async function(){var svc=window.GoogleDriveService;if(!svc||!svc.accessToken||!kunde._driveFolderId)return;var zo=istRechnung?'Rechnung-A.Kontozahlung':rechnungsTyp==='aufmass'?'Aufmass':'Angebote-Nachtraege-Leistungsverzeichnis';try{var c=await svc.listFolderContents(kunde._driveFolderId);var tf=(c.folders||[]).find(function(f){return f.name===zo;});if(tf)console.log('PDF fuer Drive: '+zo+'/'+getDateiname());}catch(e){}};
            var noSpinnerCSS='<style>input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}input[type=number]{-moz-appearance:textfield;}</style>';
            var inputStyle={width:'100%',padding:'8px 10px',borderRadius:'8px',border:'1px solid var(--border-color)',background:'var(--bg-tertiary)',fontSize:'13px',color:'var(--text-primary)',boxSizing:'border-box'};
            var smallInputStyle=Object.assign({},inputStyle,{padding:'6px 8px',fontSize:'12px',textAlign:'right'});
            // ===== PDF-ERZEUGUNG (jspdf-autotable -- sauberer A4-Seitenumbruch) =====
            var generatePDF=function(){
                if(istRechnung){try{var abK='tw_ausgangsbuch';var abD=JSON.parse(localStorage.getItem(abK)||'[]');var isDup=abD.some(function(e){return(e.rechnungsNr===rechnungsNr||e.dokumentNr===rechnungsNr)&&e.datum===rechnungsDatum;});if(!isDup&&rechnungsNr){var tL=rechnungsTyp==='abschlag'?(abschlagNr+'. Abschlagsrechnung'):rechnungsTyp==='schluss'?'Schlussrechnung':'Rechnung';var zD=new Date(rechnungsDatum);zD.setDate(zD.getDate()+zahlungszielTage);var sF=new Date(rechnungsDatum);sF.setDate(sF.getDate()+skontoTage);abD.push({id:'RE_'+Date.now(),lfdNr:abD.length+1,dokumentNr:rechnungsNr,rechnungsNr:rechnungsNr,dokumentTyp:rechnungsTyp,dokumentLabel:tL,typ:tL,rechnungsTyp:rechnungsTyp,datum:rechnungsDatum,leistungszeitraum:leistungszeitraum,kundeId:kunde._driveFolderId||kunde.id||kunde.name||'',kundeName:kName,kunde:kName,kundeAdresse:kAddr,kundeTyp:'b2b',bauvorhaben:bauvorhaben,auftragsnummer:auftragsnummer,kostenstelle:kostenstelle,nettoBetrag:nettoSumme,mwstSatz:mwstSatz,mwstBetrag:mwstBetrag,bruttoBetrag:bruttoSumme,sicherheitseinbehaltProzent:sicherheitseinbehalt,sicherheitseinbehaltBetrag:sicherheitBetrag,zahlungszielTage:zahlungszielTage,faelligkeitsDatum:zD.toISOString().split('T')[0],zahlungszielDatum:zD.toISOString().split('T')[0],skontoProzent:skontoProzent,skontoTage:skontoTage,skontoBetrag:skontoBetrag,skontoFrist:sF.toISOString().split('T')[0],forderungBrutto:zahlbetragOhneSkonto,forderungMitSkonto:zahlbetragMitSkonto,zahlbetrag:zahlbetragOhneSkonto,anzahlPositionen:aktivePosn.length,abschlagNr:rechnungsTyp==='abschlag'?abschlagNr:null,pdfDateiname:getDateiname(),driveOrdner:'Rechnung-A.Kontozahlung',status:'offen',zahlungen:[],zahlungsSumme:0,restbetrag:zahlbetragOhneSkonto,mahnStufe:0,mahnungen:[],notiz:'',erstelltAm:new Date().toISOString(),geaendertAm:new Date().toISOString()});localStorage.setItem(abK,JSON.stringify(abD));}}catch(e){}}
                if(rechnungsTyp==='nachtrag')addNachtragsPositionen();
                var typLabel2=rechnungsTyp==='abschlag'?(abschlagNr+'. Abschlagsrechnung'):rechnungsTyp==='schluss'?'Schlussrechnung':rechnungsTyp==='nachtrag'?('Nachtrag Nr. '+nachtragsNr):rechnungsTyp==='angebot'?('Angebot Nr. '+angebotsNr):rechnungsTyp==='aufmass'?('Aufmass Nr. '+aufmassNr):'Rechnung';
                var f2=function(n){return Number(n||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});};
                var doc=new jspdf.jsPDF('p','mm','a4');
                var PW=210,PH=297,ML=22,MR=18,MT=18,MB=25;
                var CW=PW-ML-MR;var rx=PW-MR;
                // === FUSSZEILE (auf jeder Seite) ===
                var drawFooter=function(pn){
                    doc.setDrawColor(196,30,30);doc.setLineWidth(0.5);
                    doc.line(ML,PH-MB+2,rx,PH-MB+2);
                    doc.setFontSize(7);doc.setFont('helvetica','bold');doc.setTextColor(196,30,30);
                    doc.text('Thomas Willwacher Fliesenlegermeister e.K.',ML,PH-MB+6);
                    doc.setFont('helvetica','normal');doc.setTextColor(102,102,102);
                    doc.text('Steuernummer: 30/220/1234/5',rx,PH-MB+6,{align:'right'});
                    doc.text('Westerwald Bank eG \u00B7 IBAN: DE12 5739 1800 0000 0000 00 \u00B7 BIC: GENODE51WW1',ML,PH-MB+10);
                    doc.text('Seite '+pn,rx,PH-MB+10,{align:'right'});
                };
                // === SEITE 1: BRIEFKOPF (mit genuegend Platz fuer alle Angaben) ===
                var y=MT;
                // --- LOGO: Breiten vorberechnen, dann zeichnen ---
                doc.setFont('helvetica','bold');
                doc.setFontSize(38);var wW=doc.getTextWidth('w');var iW=doc.getTextWidth('i');var wacherW=doc.getTextWidth('wacher');
                doc.setFontSize(53);var llW=doc.getTextWidth('LL');
                // Zeichnen
                var lx=ML;
                // "w" (38pt, doppelt)
                doc.setFontSize(38);doc.setTextColor(17,17,17);
                doc.text('w',lx,y+20);doc.text('w',lx+0.2,y+20);
                lx+=wW;
                // "i" Strich: nur den Strich zeichnen (l statt i), dann weiss ueberdecken wo noetig
                // Zuerst i zeichnen
                doc.text('i',lx,y+20);doc.text('i',lx+0.2,y+20);
                var iMid=lx+iW/2;
                // Schwarzen i-Punkt KOMPLETT weiss ueberdecken (grosses Rechteck)
                doc.setFillColor(255,255,255);doc.rect(lx-1,y+4,iW+2,7,'F');
                // Roter Punkt bei y+9.7
                doc.setFillColor(196,30,30);doc.rect(iMid-1.1,y+10,2.2,2.2,'F');
                lx+=iW;
                // "LL" (53pt = 10% groesser, doppelt)
                doc.setFont('helvetica','bold');doc.setFontSize(53);doc.setTextColor(17,17,17);
                doc.text('LL',lx,y+20);doc.text('LL',lx+0.2,y+20);
                lx+=llW;
                // "wacher" (38pt, doppelt)
                doc.setFontSize(38);
                doc.text('wacher',lx,y+20);doc.text('wacher',lx+0.2,y+20);
                var logoEnd=lx+wacherW;
                // "Thomas": gerade (bold), kleiner, von w-Kante, Unterkante knapp ueber Punkt
                var dotRight=iMid+1.1;
                doc.setFont('helvetica','bold');doc.setFontSize(10.1);doc.setTextColor(196,30,30);
                doc.text('Thomas',ML,y+9);
                // "Fliesenlegermeister e.K."
                doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(196,30,30);
                doc.text('Fliesenlegermeister e.K.',logoEnd,y+25,{align:'right'});
                // Kontaktdaten rechts neben Logo
                doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(51,51,51);
                doc.text('Flurweg 14a',rx,y+8,{align:'right'});
                doc.text('56472 Nisterau',rx,y+12,{align:'right'});
                doc.text('Tel. 02661-63101',rx,y+16,{align:'right'});
                doc.text('Mobil 0170-2024161',rx,y+20,{align:'right'});
                y+=30;
                // --- Rote Trennlinie ---
                doc.setDrawColor(196,30,30);doc.setLineWidth(0.8);doc.line(ML,y,rx,y);y+=4;
                // --- Absenderzeile (klein, grau) ---
                doc.setFont('helvetica','normal');doc.setFontSize(6);doc.setTextColor(170,170,170);
                doc.text('Thomas Willwacher Fliesenlegermeister e.K. \u00B7 Flurweg 14a \u00B7 56472 Nisterau',ML,y);y+=6;
                // --- EMPFAENGER-BLOCK (links) + DATUM (rechts, auf gleicher Hoehe) ---
                var addrStartY=y;
                doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(17,17,17);
                doc.text(empfName||'',ML,y);y+=5;
                doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(51,51,51);
                if(empfZusatz){doc.text(empfZusatz,ML,y);y+=5;}
                if(empfStrasse){doc.text(empfStrasse,ML,y);y+=5;}
                if(empfPlzOrt){doc.text(empfPlzOrt,ML,y);y+=5;}
                // Datum rechts, auf Hoehe vom Empfaenger-Start
                doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(136,136,136);
                doc.text('Datum:',rx-30,addrStartY);
                doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(34,34,34);
                doc.text(new Date(rechnungsDatum).toLocaleDateString('de-DE'),rx,addrStartY,{align:'right'});
                // Sicherstellen dass y mindestens 20mm nach Adress-Start ist
                y=Math.max(y, addrStartY+20);
                y+=20;
                // --- TITEL (gross) ---
                doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(17,17,17);
                doc.text(typLabel2,ML,y);y+=8;
                // --- BAUVORHABEN (Label links, Text rechts mit Umbruch auf gleicher Einrueckung) ---
                doc.setFontSize(11);
                var bvLabel='Bauvorhaben: ';
                var bvLabelW=doc.getTextWidth(bvLabel);
                doc.setFont('helvetica','bold');
                doc.text(bvLabel,ML,y);
                var bvTextWidth=CW-bvLabelW;
                var bvLines=doc.splitTextToSize(bauvorhabenText||'',bvTextWidth);
                bvLines.forEach(function(line,idx){
                    doc.text(line,ML+bvLabelW,y);
                    y+=5;
                });
                y+=3;
                // --- META-FELDER links unter Bauvorhaben ---
                doc.setFontSize(9);
                var mf=[];
                if(leistungszeitraum)mf.push(['Leistungszeitraum:',leistungszeitraum]);
                if(istRechnung&&rechnungsNr)mf.push(['Rechnungs-Nr.:',rechnungsNr]);
                if(rechnungsTyp==='nachtrag')mf.push(['Nachtrags-Nr.:',nachtragsNr]);
                if(rechnungsTyp==='angebot')mf.push(['Angebots-Nr.:',angebotsNr]);
                if(rechnungsTyp==='aufmass')mf.push(['Aufmass-Nr.:',aufmassNr]);
                if(auftragsnummer)mf.push(['Auftragsnummer:',auftragsnummer]);
                if(kostenstelle)mf.push(['Kostenstelle:',kostenstelle]);
                mf.push(['Steuernummer:','30/220/1234/5']);
                if(rechnungsTyp==='abschlag')mf.push(['Abschlags-Nr.:',String(abschlagNr)]);
                mf.forEach(function(f){
                    doc.setFont('helvetica','normal');doc.setTextColor(136,136,136);doc.text(f[0],ML,y);
                    doc.setFont('helvetica','bold');doc.setTextColor(34,34,34);doc.text(f[1],ML+42,y);
                    y+=5;
                });
                y+=12;
                // === POSITIONSTABELLE MIT AUTOTABLE ===
                if(rechnungsTyp==='aufmass'){
                // --- AUFMASS-TABELLE: 4 Spalten (Pos, Menge, Einh, Bezeichnung) ---
                var amTableBody=aktivePosn.map(function(p){
                    return[String(p.pos||''),f2(p.menge),String(p.einheit||''),String(p.bez||'')];
                });
                var pageRowMap={};
                var footerDrawn={};
                doc.autoTable({
                    startY:y,
                    margin:{left:ML,right:MR,top:MT+8,bottom:MB+12},
                    head:[['Pos.','Menge','Einheit','Bezeichnung']],
                    body:amTableBody,
                    showHead:'everyPage',
                    theme:'grid',
                    tableLineColor:[224,224,224],
                    tableLineWidth:0.2,
                    styles:{
                        fontSize:8.5,
                        font:'helvetica',
                        textColor:[34,34,34],
                        cellPadding:{top:2.5,right:2,bottom:2.5,left:2},
                        overflow:'linebreak',
                        valign:'top',
                        lineColor:[224,224,224],
                        lineWidth:0.15
                    },
                    headStyles:{
                        fillColor:[45,52,54],
                        textColor:[255,255,255],
                        fontStyle:'bold',
                        fontSize:8,
                        cellPadding:{top:2.5,right:2,bottom:2.5,left:2},
                        lineWidth:0,
                        halign:'center'
                    },
                    columnStyles:{
                        0:{cellWidth:20,halign:'center',fontStyle:'bold'},
                        1:{cellWidth:28,halign:'right',fontStyle:'bold'},
                        2:{cellWidth:18,halign:'center'},
                        3:{cellWidth:'auto',halign:'left'}
                    },
                    didDrawPage:function(data){
                        var pn=doc.internal.getCurrentPageInfo().pageNumber;
                        if(!footerDrawn[pn]){drawFooter(pn);footerDrawn[pn]=true;}
                    },
                    didDrawCell:function(data){
                        if(data.section==='body'){
                            var pn=doc.internal.getCurrentPageInfo().pageNumber;
                            pageRowMap[pn]=data.row.index;
                        }
                    }
                });
                var lastPage=doc.internal.getCurrentPageInfo().pageNumber;
                doc.setPage(lastPage);
                y=doc.lastAutoTable.finalY+8;
                var pn=lastPage;
                // --- RAUMAUFSCHLUESSELUNG (wenn Gesamtliste vorhanden) ---
                if(gesamtliste&&gesamtliste.length>0){
                    if(y+15>PH-MB){doc.addPage();pn++;y=MT;drawFooter(pn);}
                    doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(17,17,17);
                    doc.text('Raumaufschluesselung',ML,y);y+=6;
                    doc.setDrawColor(196,30,30);doc.setLineWidth(0.4);doc.line(ML,y,ML+50,y);y+=5;
                    gesamtliste.forEach(function(room){
                        var roomPosn=(room.positionen||[]).filter(function(p){return(parseFloat(p.ergebnis)||0)>0;});
                        if(roomPosn.length===0)return;
                        if(y+12>PH-MB){doc.addPage();pn++;y=MT;drawFooter(pn);}
                        doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(34,34,34);
                        doc.text(room.raumName||'Raum',ML,y);y+=4;
                        roomPosn.forEach(function(p){
                            if(y+4>PH-MB){doc.addPage();pn++;y=MT;drawFooter(pn);}
                            doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(85,85,85);
                            doc.text('Pos. '+(p.pos||p.posNr||''),ML+4,y);
                            doc.text(f2(p.ergebnis)+' '+(p.einheit||'m\u00B2'),ML+30,y);
                            var bezTxt=p.bez||'';
                            if(bezTxt.length>60)bezTxt=bezTxt.substring(0,57)+'...';
                            doc.text(bezTxt,ML+55,y);
                            y+=3.5;
                        });
                        y+=3;
                    });
                }
                // --- Aufmass-Zusammenfassung ---
                y+=4;
                if(y+15>PH-MB){doc.addPage();pn++;y=MT;drawFooter(pn);}
                doc.setDrawColor(34,34,34);doc.setLineWidth(0.5);doc.line(ML+CW-88,y,ML+CW,y);y+=5;
                doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(17,17,17);
                doc.text('Positionen gesamt: '+aktivePosn.length,ML+CW-88,y);
                if(gesamtliste&&gesamtliste.length>0){
                    doc.text('Raeume: '+gesamtliste.length,ML+CW,y,{align:'right'});
                }
                y+=7;
                } else {
                // --- STANDARD-RECHNUNGSTABELLE: 6 Spalten ---
                // Laufende Zwischensumme berechnen
                var laufendeSummen=[];var ls=0;
                aktivePosn.forEach(function(p){
                    ls+=(parseFloat(p.menge)||0)*(parseFloat(p.einzelpreis)||0);
                    laufendeSummen.push(ls);
                });
                var tableBody=aktivePosn.map(function(p,idx){
                    var gp=(parseFloat(p.menge)||0)*(parseFloat(p.einzelpreis)||0);
                    return[String(p.pos||''),f2(p.menge),String(p.einheit||''),String(p.bez||''),f2(p.einzelpreis),f2(gp)];
                });
                // Seiten-Tracking fuer Uebertraege
                var pageRowMap={};
                var footerDrawn={};
                doc.autoTable({
                    startY:y,
                    margin:{left:ML,right:MR,top:MT+8,bottom:MB+12},
                    head:[['Pos.','Menge','Einh.','Bezeichnung','EP (\u20AC)','GP (\u20AC)']],
                    body:tableBody,
                    showHead:'everyPage',
                    theme:'grid',
                    tableLineColor:[224,224,224],
                    tableLineWidth:0.2,
                    styles:{
                        fontSize:8,
                        font:'helvetica',
                        textColor:[34,34,34],
                        cellPadding:{top:2,right:2,bottom:2,left:2},
                        overflow:'linebreak',
                        valign:'top',
                        lineColor:[224,224,224],
                        lineWidth:0.15
                    },
                    headStyles:{
                        fillColor:[45,52,54],
                        textColor:[255,255,255],
                        fontStyle:'bold',
                        fontSize:7.5,
                        cellPadding:{top:2.5,right:2,bottom:2.5,left:2},
                        lineWidth:0,
                        halign:'center'
                    },
                    columnStyles:{
                        0:{cellWidth:18,halign:'center',fontStyle:'bold'},
                        1:{cellWidth:20,halign:'right'},
                        2:{cellWidth:14,halign:'center'},
                        3:{cellWidth:'auto',halign:'left',fontSize:7.5},
                        4:{cellWidth:22,halign:'right'},
                        5:{cellWidth:24,halign:'right',fontStyle:'bold'}
                    },
                    didDrawPage:function(data){
                        var pn=doc.internal.getCurrentPageInfo().pageNumber;
                        if(!footerDrawn[pn]){drawFooter(pn);footerDrawn[pn]=true;}
                        // Uebertrag am Seitenanfang (ab Seite 2)
                        if(pn>1&&pageRowMap[pn-1]!==undefined){
                            var prevSum=laufendeSummen[pageRowMap[pn-1]]||0;
                            var uy=data.settings.margin.top-4;
                            doc.setFont('helvetica','italic');doc.setFontSize(7.5);doc.setTextColor(85,85,85);
                            doc.text('\u00DCbertrag von Seite '+(pn-1)+':',ML+CW-26,uy,{align:'right'});
                            doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(34,34,34);
                            doc.text(f2(prevSum)+' \u20AC',ML+CW,uy,{align:'right'});
                        }
                    },
                    didDrawCell:function(data){
                        if(data.section==='body'){
                            var pn=doc.internal.getCurrentPageInfo().pageNumber;
                            pageRowMap[pn]=data.row.index;
                        }
                    }
                });
                // Uebertrag am Ende jeder Seite (ausser der letzten)
                var lastPage=doc.internal.getCurrentPageInfo().pageNumber;
                for(var pg=1;pg<lastPage;pg++){
                    if(pageRowMap[pg]!==undefined){
                        var uSum=laufendeSummen[pageRowMap[pg]]||0;
                        doc.setPage(pg);
                        var uy2=PH-MB-2;
                        doc.setDrawColor(34,34,34);doc.setLineWidth(0.3);
                        doc.line(ML,uy2-4,ML+CW,uy2-4);
                        doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(85,85,85);
                        doc.text('\u00DCbertrag auf Seite '+(pg+1)+':',ML+CW-26,uy2,{align:'right'});
                        doc.setTextColor(34,34,34);
                        doc.text(f2(uSum)+' \u20AC',ML+CW,uy2,{align:'right'});
                    }
                }
                // Zurueck auf letzte Seite
                doc.setPage(lastPage);
                // === SUMMENBLOCK ===
                y=doc.lastAutoTable.finalY+8;
                var pn=lastPage;
                if(y+50>PH-MB){doc.addPage();pn++;y=MT;drawFooter(pn);}
                var sx=ML+CW-88,sr=ML+CW;
                doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(34,34,34);
                doc.text('Nettobetrag:',sx,y);doc.setFont('helvetica','bold');doc.text(f2(nettoSumme)+' \u20AC',sr,y,{align:'right'});y+=5;
                doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(119,119,119);
                doc.text('zzgl. '+mwstSatz+'% MwSt.:',sx,y);doc.text(f2(mwstBetrag)+' \u20AC',sr,y,{align:'right'});y+=4;
                doc.setDrawColor(34,34,34);doc.setLineWidth(0.7);doc.line(sx,y,sr,y);y+=0.8;doc.setLineWidth(0.2);doc.line(sx,y,sr,y);y+=5;
                doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(17,17,17);
                doc.text('Bruttobetrag:',sx,y);doc.text(f2(bruttoSumme)+' \u20AC',sr,y,{align:'right'});y+=7;
                if(istRechnung){
                    if(sicherheitseinbehalt>0){doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(119,119,119);doc.text('abzgl. Sicherheitseinbehalt '+sicherheitseinbehalt+'%:',sx,y);doc.text('\u2013 '+f2(sicherheitBetrag)+' \u20AC',sr,y,{align:'right'});y+=5;}
                    if(rechnungsTyp==='schluss'&&kontoSumme>0){doc.text('abzgl. Kontozahlungen:',sx,y);doc.text('\u2013 '+f2(kontoSumme)+' \u20AC',sr,y,{align:'right'});y+=5;doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(34,34,34);doc.text('Restforderung:',sx,y);doc.text(f2(bruttoSumme-sicherheitBetrag-kontoSumme)+' \u20AC',sr,y,{align:'right'});y+=6;}
                    doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(196,30,30);
                    doc.text('Zahlbar '+skontoTage+' Tage ('+skontoProzent+'% Skonto):',sx,y);doc.text(f2(zahlbetragMitSkonto)+' \u20AC',sr,y,{align:'right'});y+=5;
                    doc.setTextColor(17,17,17);doc.text('Zahlbar '+zahlungszielTage+' Tage netto:',sx,y);doc.text(f2(zahlbetragOhneSkonto)+' \u20AC',sr,y,{align:'right'});y+=7;
                }
                if(rechnungsTyp==='angebot'&&gueltigBis){doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(119,119,119);doc.text('Gueltig bis:',sx,y);doc.text(new Date(gueltigBis).toLocaleDateString('de-DE'),sr,y,{align:'right'});y+=5;}
                } // Ende else (Standard-Rechnungstabelle)
                if(bemerkung){y+=3;doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(85,85,85);var bL=doc.splitTextToSize(bemerkung,CW);bL.forEach(function(l){if(y+4>PH-MB){doc.addPage();pn++;y=MT;drawFooter(pn);}doc.text(l,ML,y);y+=3.8;});}
                if(!footerDrawn[pn]){drawFooter(pn);}
                // PDF oeffnen — BLOCK B / FIX B1: Blob-URL wird nach
                // 60s automatisch freigegeben, sonst akkumuliert sich
                // bei jeder Vorschau ein MB-grosser Leak.
                var blob=doc.output('blob');var url=URL.createObjectURL(blob);
                var pdfWin=window.open(url,'_blank');
                setTimeout(function(){ try{ URL.revokeObjectURL(url); }catch(e){} }, 60000);
                saveToGoogleDrive();
            };
            var escXml=function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
            var fmtXml=function(v){return(parseFloat(v)||0).toFixed(2);};
            var mapEinheit=function(e){var m={'m\u00B2':'MTK','m':'MTR','Stk':'C62','psch':'LS','lfm':'MTR','kg':'KGM','l':'LTR','Satz':'SET','Std':'HUR'};return m[e]||'C62';};
            var generateERechnungXML=function(profil){var isXR=profil==='xrechnung';var kS=kAddr,kO='',kP='';var am=kS.match(/^(.*?)[\s,]+(\d{5})\s+(.*)$/);if(am){kS=am[1].trim();kP=am[2];kO=am[3].trim();}var rD=rechnungsDatum.replace(/-/g,'');var xml='<?xml version="1.0" encoding="UTF-8"?>\n<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">\n<rsm:ExchangedDocumentContext>\n';if(isXR){xml+='<ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</ram:ID></ram:BusinessProcessSpecifiedDocumentContextParameter>\n<ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>\n';}else{xml+='<ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>\n';}xml+='</rsm:ExchangedDocumentContext>\n<rsm:ExchangedDocument><ram:ID>'+escXml(getDokumentNr())+'</ram:ID><ram:TypeCode>380</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">'+rD+'</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument>\n<rsm:SupplyChainTradeTransaction>\n';aktivePosn.forEach(function(p,idx){var gp=(parseFloat(p.menge)||0)*(parseFloat(p.einzelpreis)||0);xml+='<ram:IncludedSupplyChainTradeLineItem><ram:AssociatedDocumentLineDocument><ram:LineID>'+(idx+1)+'</ram:LineID></ram:AssociatedDocumentLineDocument><ram:SpecifiedTradeProduct><ram:Name>'+escXml(p.bez||'Pos '+p.pos)+'</ram:Name></ram:SpecifiedTradeProduct><ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>'+fmtXml(p.einzelpreis)+'</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement><ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="'+mapEinheit(p.einheit)+'">'+fmtXml(p.menge)+'</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery><ram:SpecifiedLineTradeSettlement><ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>'+mwstSatz+'.00</ram:RateApplicablePercent></ram:ApplicableTradeTax><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>'+fmtXml(gp)+'</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement></ram:IncludedSupplyChainTradeLineItem>\n';});xml+='<ram:ApplicableHeaderTradeAgreement><ram:SellerTradeParty><ram:Name>Thomas Willwacher Fliesenlegermeister e.K.</ram:Name><ram:PostalTradeAddress><ram:LineOne>Flurweg 14a</ram:LineOne><ram:PostcodeCode>56472</ram:PostcodeCode><ram:CityName>Nisterau</ram:CityName><ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress><ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">30/220/1234/5</ram:ID></ram:SpecifiedTaxRegistration></ram:SellerTradeParty><ram:BuyerTradeParty><ram:Name>'+escXml(kName)+'</ram:Name>';if(kS||kP||kO){xml+='<ram:PostalTradeAddress>';if(kS)xml+='<ram:LineOne>'+escXml(kS)+'</ram:LineOne>';if(kP)xml+='<ram:PostcodeCode>'+escXml(kP)+'</ram:PostcodeCode>';if(kO)xml+='<ram:CityName>'+escXml(kO)+'</ram:CityName>';xml+='<ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress>';}xml+='</ram:BuyerTradeParty>';if(auftragsnummer)xml+='<ram:BuyerOrderReferencedDocument><ram:IssuerAssignedID>'+escXml(auftragsnummer)+'</ram:IssuerAssignedID></ram:BuyerOrderReferencedDocument>';xml+='</ram:ApplicableHeaderTradeAgreement>\n<ram:ApplicableHeaderTradeDelivery><ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">'+rD+'</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent></ram:ApplicableHeaderTradeDelivery>\n<ram:ApplicableHeaderTradeSettlement><ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode><ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>58</ram:TypeCode><ram:PayeePartyCreditorFinancialAccount><ram:IBANID>DE12573918000000000000</ram:IBANID></ram:PayeePartyCreditorFinancialAccount></ram:SpecifiedTradeSettlementPaymentMeans><ram:ApplicableTradeTax><ram:CalculatedAmount>'+fmtXml(mwstBetrag)+'</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode><ram:BasisAmount>'+fmtXml(nettoSumme)+'</ram:BasisAmount><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>'+mwstSatz+'.00</ram:RateApplicablePercent></ram:ApplicableTradeTax>';var fD=new Date(rechnungsDatum);fD.setDate(fD.getDate()+zahlungszielTage);xml+='<ram:SpecifiedTradePaymentTerms><ram:Description>Zahlbar innerhalb '+zahlungszielTage+' Tagen netto</ram:Description><ram:DueDateDateTime><udt:DateTimeString format="102">'+fD.toISOString().split('T')[0].replace(/-/g,'')+'</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms><ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>'+fmtXml(nettoSumme)+'</ram:LineTotalAmount><ram:TaxBasisTotalAmount>'+fmtXml(nettoSumme)+'</ram:TaxBasisTotalAmount><ram:TaxTotalAmount currencyID="EUR">'+fmtXml(mwstBetrag)+'</ram:TaxTotalAmount><ram:GrandTotalAmount>'+fmtXml(bruttoSumme)+'</ram:GrandTotalAmount><ram:DuePayableAmount>'+fmtXml(zahlbetragOhneSkonto)+'</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation></ram:ApplicableHeaderTradeSettlement>\n</rsm:SupplyChainTradeTransaction>\n</rsm:CrossIndustryInvoice>';return xml;};
            var downloadXRechnung=function(){var x=generateERechnungXML('xrechnung');var b=new Blob([x],{type:'application/xml;charset=utf-8'});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download=getDokumentNr()+'_XRechnung.xml';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);};
            var downloadZUGFeRD=function(){generatePDF();setTimeout(function(){var x=generateERechnungXML('zugferd');var b=new Blob([x],{type:'application/xml;charset=utf-8'});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download=getDokumentNr()+'_factur-x.xml';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);},1500);};
            var sendPerEmail=async function(){var email=kunde.ag_email||kunde.bl_email||kunde.arch_email||'';var tL=rechnungsTyp==='abschlag'?(abschlagNr+'. Abschlagsrechnung'):rechnungsTyp==='schluss'?'Schlussrechnung':rechnungsTyp==='nachtrag'?'Nachtrag':rechnungsTyp==='aufmass'?'Aufmass':'Rechnung';var betr=tL+' Nr. '+getDokumentNr()+' \u2013 '+bauvorhaben;var body='Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie '+(rechnungsTyp==='aufmass'?'unser '+tL:'unsere '+tL)+' Nr. '+getDokumentNr()+'.\n\nBauvorhaben: '+bauvorhaben+'\n';if(istRechnung){body+='\nBruttobetrag: '+fmt(bruttoSumme)+' \u20AC\nZahlbar '+zahlungszielTage+' Tage netto: '+fmt(zahlbetragOhneSkonto)+' \u20AC\n\nBankverbindung:\nWesterwald Bank eG\nIBAN: DE12 5739 1800 0000 0000 00\nBIC: GENODE51WW1\n';}body+='\nMit freundlichen Gruessen\nThomas Willwacher\nFliesenlegermeister e.K.';generatePDF();var svc=window.GoogleDriveService;if(svc&&svc.accessToken&&email){try{var raw=['From: '+GMAIL_CONFIG.ABSENDER_EMAIL,'To: '+email,'Subject: =?UTF-8?B?'+btoa(unescape(encodeURIComponent(betr)))+'?=','MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','',body].join('\r\n');var enc=btoa(unescape(encodeURIComponent(raw))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');var r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{'Authorization':'Bearer '+svc.accessToken,'Content-Type':'application/json'},body:JSON.stringify({raw:enc})});if(r.ok){alert('Gesendet an '+email);return;}}catch(e){}}setTimeout(function(){window.location.href='mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(betr)+'&body='+encodeURIComponent(body);},1200);};
            var openMailDialog=function(){setMailAdresse(kunde.ag_email||kunde.bl_email||'');setShowMailDialog(true);};
            var confirmAndSend=function(){var o=kunde.ag_email;if(mailAdresse)kunde.ag_email=mailAdresse;setShowMailDialog(false);sendPerEmail();if(!mailAdresse)kunde.ag_email=o;};
            // ===== PHASE 1: TYPWAHL (Design-System Modus-Karten) =====
            var renderTypIcon = function(id) {
                var s = {width:'28px',height:'28px',flexShrink:0};
                if (id === 'abschlag') return React.createElement('svg',Object.assign({viewBox:'0 0 32 32',fill:'none'},s),
                    React.createElement('rect',{x:'6',y:'3',width:'20',height:'26',rx:'2',stroke:'white',strokeWidth:'2'}),
                    React.createElement('line',{x1:'10',y1:'11',x2:'22',y2:'11',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('line',{x1:'10',y1:'15',x2:'22',y2:'15',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('line',{x1:'10',y1:'19',x2:'18',y2:'19',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('path',{d:'M18 7h4v4',stroke:'rgba(255,255,255,0.7)',strokeWidth:'1.5'})
                );
                if (id === 'schluss') return React.createElement('svg',Object.assign({viewBox:'0 0 32 32',fill:'none'},s),
                    React.createElement('rect',{x:'6',y:'3',width:'20',height:'26',rx:'2',stroke:'white',strokeWidth:'2'}),
                    React.createElement('line',{x1:'10',y1:'10',x2:'22',y2:'10',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('line',{x1:'10',y1:'14',x2:'22',y2:'14',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('line',{x1:'10',y1:'18',x2:'22',y2:'18',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('path',{d:'M12 23L15 26L22 20',stroke:'white',strokeWidth:'2',strokeLinecap:'round',strokeLinejoin:'round'})
                );
                if (id === 'einzel') return React.createElement('svg',Object.assign({viewBox:'0 0 32 32',fill:'none'},s),
                    React.createElement('rect',{x:'6',y:'3',width:'20',height:'26',rx:'2',stroke:'white',strokeWidth:'2'}),
                    React.createElement('line',{x1:'10',y1:'11',x2:'22',y2:'11',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('line',{x1:'10',y1:'15',x2:'22',y2:'15',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('line',{x1:'10',y1:'19',x2:'17',y2:'19',stroke:'white',strokeWidth:'1.5'})
                );
                if (id === 'nachtrag') return React.createElement('svg',Object.assign({viewBox:'0 0 32 32',fill:'none'},s),
                    React.createElement('rect',{x:'6',y:'3',width:'20',height:'26',rx:'2',stroke:'white',strokeWidth:'2'}),
                    React.createElement('line',{x1:'10',y1:'10',x2:'22',y2:'10',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('line',{x1:'10',y1:'14',x2:'22',y2:'14',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('path',{d:'M16 20v6M13 23h6',stroke:'white',strokeWidth:'2',strokeLinecap:'round'})
                );
                if (id === 'angebot') return React.createElement('svg',Object.assign({viewBox:'0 0 32 32',fill:'none'},s),
                    React.createElement('rect',{x:'6',y:'3',width:'20',height:'26',rx:'2',stroke:'white',strokeWidth:'2'}),
                    React.createElement('line',{x1:'10',y1:'10',x2:'22',y2:'10',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('line',{x1:'10',y1:'14',x2:'18',y2:'14',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('path',{d:'M20 18L24 22L20 26',stroke:'rgba(255,255,255,0.7)',strokeWidth:'1.5',strokeLinecap:'round',strokeLinejoin:'round'}),
                    React.createElement('path',{d:'M24 22H17',stroke:'rgba(255,255,255,0.7)',strokeWidth:'1.5',strokeLinecap:'round'})
                );
                if (id === 'aufmass') return React.createElement('svg',Object.assign({viewBox:'0 0 32 32',fill:'none'},s),
                    React.createElement('rect',{x:'4',y:'8',width:'24',height:'16',rx:'2',stroke:'white',strokeWidth:'2'}),
                    React.createElement('line',{x1:'8',y1:'8',x2:'8',y2:'16',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('line',{x1:'12',y1:'8',x2:'12',y2:'14',stroke:'white',strokeWidth:'1'}),
                    React.createElement('line',{x1:'16',y1:'8',x2:'16',y2:'16',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('line',{x1:'20',y1:'8',x2:'20',y2:'14',stroke:'white',strokeWidth:'1'}),
                    React.createElement('line',{x1:'24',y1:'8',x2:'24',y2:'16',stroke:'white',strokeWidth:'1.5'}),
                    React.createElement('path',{d:'M10 20h12',stroke:'rgba(255,255,255,0.7)',strokeWidth:'1',strokeLinecap:'round'}),
                    React.createElement('path',{d:'M10 19v2M22 19v2',stroke:'rgba(255,255,255,0.7)',strokeWidth:'1',strokeLinecap:'round'})
                );
                return null;
            };
            if(phase==='typwahl'){var typen=[{id:'abschlag',name:'Abschlagsrechnung',desc:'Teilrechnung mit kumulierter Aufstellung',gradient:'linear-gradient(135deg, #1E88E5, #1565C0)',shadow:'rgba(30,136,229,0.30)'},{id:'schluss',name:'Schlussrechnung',desc:'Endabrechnung mit Gesamtaufstellung',gradient:'linear-gradient(135deg, #1E88E5, #1565C0)',shadow:'rgba(30,136,229,0.30)'},{id:'einzel',name:'Einzelrechnung',desc:'Einfache Rechnung ohne Abschlaege',gradient:'linear-gradient(135deg, #1E88E5, #1565C0)',shadow:'rgba(30,136,229,0.30)'},{id:'nachtrag',name:'Nachtrag',desc:'Zusaetzliche / geaenderte Leistungen',gradient:'linear-gradient(135deg, #1E88E5, #1565C0)',shadow:'rgba(30,136,229,0.30)'},{id:'angebot',name:'Angebot',desc:'Kostenvoranschlag fuer den Auftraggeber',gradient:'linear-gradient(135deg, #1E88E5, #1565C0)',shadow:'rgba(30,136,229,0.30)'},{id:'aufmass',name:'Aufmass',desc:'Aufmass als Rechnungsanlage drucken / versenden',gradient:'linear-gradient(135deg, #1E88E5, #1565C0)',shadow:'rgba(30,136,229,0.30)'}];return(<div className="page-container" style={{padding:'20px 16px',minHeight:'100vh'}}><div dangerouslySetInnerHTML={{__html:noSpinnerCSS}} /><div style={{textAlign:'center',marginBottom:'24px'}}><FirmenLogo size="small" /><div style={{marginTop:'12px',fontSize:'17px',fontWeight:700,color:'var(--text-white)',fontFamily:'Oswald, sans-serif',letterSpacing:'0.5px'}}>{kunde?kunde.name:''}</div><div style={{fontSize:'11px',color:'var(--text-muted)',letterSpacing:'2px',textTransform:'uppercase',marginTop:'4px',fontFamily:'Oswald, sans-serif',fontWeight:'500'}}>Dokumenttyp waehlen</div></div><div style={{display:'flex',flexDirection:'column',gap:'10px'}}>{typen.map(function(t){return(<button key={t.id} onClick={function(){setRechnungsTyp(t.id);if(t.id==='schluss')ladeKontozahlungen();if(t.id==='aufmass'&&gesamtliste&&gesamtliste.length>0){var amPos=[];var seen={};gesamtliste.forEach(function(room){(room.positionen||[]).forEach(function(p){var key=p.pos||p.posNr;if(!seen[key]){seen[key]={pos:key,bez:p.bez||'',einheit:p.einheit||'m\u00B2',menge:0,einzelpreis:0};} seen[key].menge+=(parseFloat(p.ergebnis)||0);});});Object.keys(seen).forEach(function(k){amPos.push(seen[k]);});setPositionen(amPos);setPositionenGeladen(true);}setPhase('startseite');}} style={{width:'100%',padding:'18px 16px',borderRadius:'var(--radius-lg)',border:'1px solid transparent',cursor:'pointer',background:t.gradient,color:'#fff',display:'flex',alignItems:'center',gap:'14px',textAlign:'left',boxShadow:'0 6px 20px '+t.shadow,transition:'all 0.25s ease',position:'relative',overflow:'hidden',touchAction:'manipulation'}}>{renderTypIcon(t.id)}<div style={{flex:1}}><div style={{fontSize:'16px',fontWeight:600,marginBottom:'3px',fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'0.5px'}}>{t.name}</div><div style={{fontSize:'12px',opacity:0.85,lineHeight:'1.4',fontFamily:'Source Sans 3, sans-serif'}}>{t.desc}</div></div><span style={{fontSize:'20px',opacity:0.7}}>{'\u2192'}</span></button>);})}</div><button onClick={onBack} style={{width:'100%',marginTop:'16px',padding:'14px 32px',borderRadius:'var(--radius-md)',border:'none',background:'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))',color:'#fff',cursor:'pointer',fontSize:'14px',fontWeight:'600',fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'1px',boxShadow:'0 4px 15px rgba(196,30,30,0.3)',transition:'all 0.25s ease',touchAction:'manipulation'}}>{'\u2190'} Zurueck zur Modulwahl</button></div>);}
            // ===== PHASE 2: PDF-NAHE STARTSEITE (Alles IN der PDF-Seite editierbar) =====
            if(phase==='startseite'){var tpLabel=rechnungsTyp==='abschlag'?abschlagNr+'. Abschlagsrechnung':rechnungsTyp==='schluss'?'Schlussrechnung':rechnungsTyp==='nachtrag'?'Nachtrag Nr. '+nachtragsNr:rechnungsTyp==='angebot'?'Angebot Nr. '+angebotsNr:rechnungsTyp==='aufmass'?'Aufmass Nr. '+aufmassNr:'Einzelrechnung';
            // Editierbare Input-Styles fuer weissen Hintergrund
            var pdfInput={padding:'4px 6px',borderRadius:'4px',border:'1px solid #ccc',background:'#fafafa',fontSize:'10px',color:'#222',boxSizing:'border-box',width:'100%',fontFamily:'"Source Sans 3",sans-serif'};
            var pdfInputSm=Object.assign({},pdfInput,{fontSize:'9px',padding:'3px 5px'});
            return(<div className="page-container" style={{padding:'0',minHeight:'100vh',paddingBottom:'80px'}}><div dangerouslySetInnerHTML={{__html:noSpinnerCSS}} />
            {/* === EINE weisse A4-Seite === */}
            <div style={{margin:'8px',background:'#fff',borderRadius:'12px',padding:'22px 20px 16px',color:'#222',boxShadow:'0 4px 24px rgba(0,0,0,0.35)',minHeight:'85vh'}}>

                {/* BRIEFKOPF: Logo links + Adresse rechts (40% groesser, Thomas=FLM Staerke) */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'3mm'}}>
                    <div style={{display:'inline-flex',flexDirection:'column',alignItems:'flex-start'}}>
                        <div style={{fontFamily:'"Source Sans 3",serif',fontStyle:'italic',fontWeight:600,color:'#c41e1e',fontSize:'14px',marginBottom:'-16px',paddingLeft:'0px',position:'relative',zIndex:2}}>Thomas</div>
                        <div style={{display:'flex',alignItems:'baseline',fontFamily:'Oswald,sans-serif',fontWeight:700,color:'#111',lineHeight:1,WebkitTextStroke:'0.4px #111'}}>
                            <span style={{fontSize:'73px'}}>w</span>
                            <span style={{position:'relative',fontSize:'73px',display:'inline-block'}}><span style={{fontSize:'73px',color:'#111'}}>{'\u0131'}</span><span style={{position:'absolute',top:'6px',left:'50%',transform:'translateX(-50%)',width:'11px',height:'11px',background:'#c41e1e'}}></span></span>
                            <span style={{fontSize:'95px',letterSpacing:'1px',lineHeight:0.75}}>LL</span>
                            <span style={{fontSize:'73px'}}>wacher</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'flex-end',width:'100%',marginTop:'2px'}}><span style={{fontFamily:'"Source Sans 3",sans-serif',fontWeight:600,color:'#c41e1e',fontSize:'18px',letterSpacing:'2.5px'}}>Fliesenlegermeister e.K.</span></div>
                    </div>
                    <div style={{textAlign:'right',fontSize:'9.5pt',color:'#333',lineHeight:1.7,paddingTop:'5mm'}}>Flurweg 14a<br/>56472 Nisterau<br/>Tel. 02661-63101<br/>Mobil 0170-2024161</div>
                </div>

                {/* Rote Trennlinie */}
                <hr style={{border:'none',borderTop:'2.5px solid #c41e1e',margin:'3mm 0 2mm'}} />
                <div style={{fontSize:'7pt',color:'#aaa',borderBottom:'0.5px solid #ccc',display:'inline-block',paddingBottom:'1px',marginBottom:'5mm'}}>Thomas Willwacher Fliesenlegermeister e.K. {'\u00B7'} Flurweg 14a {'\u00B7'} 56472 Nisterau</div>

                {/* EMPFAENGER (komplett editierbar) + DATUM rechts */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6mm'}}>
                    <div style={{flex:1,maxWidth:'55%'}}>
                        <input type="text" value={empfName} onChange={function(e){setEmpfName(e.target.value);}} placeholder="Firma / Name des Kunden" style={Object.assign({},pdfInput,{fontWeight:700,fontSize:'12px',marginBottom:'3px'})} />
                        <input type="text" value={empfZusatz} onChange={function(e){setEmpfZusatz(e.target.value);}} placeholder="z.Hd. Ansprechpartner (optional)" style={Object.assign({},pdfInput,{marginBottom:'3px',fontStyle:empfZusatz?'normal':'italic'})} />
                        <input type="text" value={empfStrasse} onChange={function(e){setEmpfStrasse(e.target.value);}} placeholder="Strasse + Hausnummer" style={Object.assign({},pdfInput,{marginBottom:'3px'})} />
                        <input type="text" value={empfPlzOrt} onChange={function(e){setEmpfPlzOrt(e.target.value);}} placeholder="PLZ Ort" style={pdfInput} />
                    </div>
                    <div style={{textAlign:'right',minWidth:'35%'}}>
                        <div style={{fontSize:'7.5pt',color:'#999',marginBottom:'1px'}}>Datum</div>
                        <input type="date" value={rechnungsDatum} onChange={function(e){setRechnungsDatum(e.target.value);}} style={Object.assign({},pdfInput,{fontSize:'10.5pt',fontWeight:600,textAlign:'right',width:'auto',minWidth:'130px'})} />
                    </div>
                </div>

                {/* DOKUMENTTITEL (gross) */}
                <div style={{fontSize:'17pt',fontWeight:700,color:'#111',marginBottom:'4mm'}}>{tpLabel}</div>

                {/* META-FELDER links untereinander (alle editierbar) */}
                <div style={{marginBottom:'5mm',fontSize:'9pt',lineHeight:2.2}}>
                    <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <span style={{display:'inline-block',width:'38mm',color:'#888',flexShrink:0}}>Leistungszeitraum:</span>
                        <input type="text" value={leistungszeitraum} onChange={function(e){setLeistungszeitraum(e.target.value);}} placeholder="z.B. 01.03. - 31.03.2026" style={Object.assign({},pdfInputSm,{flex:1,fontWeight:600})} />
                    </div>
                    {istRechnung && <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <span style={{display:'inline-block',width:'38mm',color:'#888',flexShrink:0}}>Rechnungs-Nr.:</span>
                        <input type="text" value={rechnungsNr} onChange={function(e){setRechnungsNr(e.target.value);}} style={Object.assign({},pdfInputSm,{flex:1,fontWeight:600})} />
                    </div>}
                    {rechnungsTyp==='nachtrag' && <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <span style={{display:'inline-block',width:'38mm',color:'#888',flexShrink:0}}>Nachtrags-Nr.:</span>
                        <input type="text" value={nachtragsNr} onChange={function(e){setNachtragsNr(e.target.value);}} style={Object.assign({},pdfInputSm,{flex:1,fontWeight:600})} />
                    </div>}
                    {rechnungsTyp==='angebot' && <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <span style={{display:'inline-block',width:'38mm',color:'#888',flexShrink:0}}>Angebots-Nr.:</span>
                        <input type="text" value={angebotsNr} onChange={function(e){setAngebotsNr(e.target.value);}} style={Object.assign({},pdfInputSm,{flex:1,fontWeight:600})} />
                    </div>}
                    {rechnungsTyp==='aufmass' && <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <span style={{display:'inline-block',width:'38mm',color:'#888',flexShrink:0}}>Aufmass-Nr.:</span>
                        <input type="text" value={aufmassNr} onChange={function(e){setAufmassNr(e.target.value);}} style={Object.assign({},pdfInputSm,{flex:1,fontWeight:600})} />
                    </div>}
                    <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <span style={{display:'inline-block',width:'38mm',color:'#888',flexShrink:0}}>Auftragsnummer:</span>
                        <input type="text" value={auftragsnummer} onChange={function(e){setAuftragsnummer(e.target.value);}} placeholder="z.B. A-2026-001" style={Object.assign({},pdfInputSm,{flex:1,fontWeight:600})} />
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <span style={{display:'inline-block',width:'38mm',color:'#888',flexShrink:0}}>Kostenstelle:</span>
                        <input type="text" value={kostenstelle} onChange={function(e){setKostenstelle(e.target.value);}} placeholder="optional" style={Object.assign({},pdfInputSm,{flex:1,fontWeight:600})} />
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <span style={{display:'inline-block',width:'38mm',color:'#888',flexShrink:0}}>Bauvorhaben:</span>
                        <input type="text" value={bauvorhabenText} onChange={function(e){setBauvorhabenText(e.target.value);}} style={Object.assign({},pdfInputSm,{flex:1,fontWeight:700,color:'#222',fontSize:'11px'})} />
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <span style={{display:'inline-block',width:'38mm',color:'#888',flexShrink:0}}>Steuernummer:</span>
                        <span style={{fontWeight:600,fontSize:'9px'}}>30/220/1234/5</span>
                    </div>
                    {rechnungsTyp==='abschlag' && <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <span style={{display:'inline-block',width:'38mm',color:'#888',flexShrink:0}}>Abschlags-Nr.:</span>
                        <input type="text" inputMode="numeric" value={abschlagNr} onChange={function(e){setAbschlagNr(parseInt(e.target.value)||1);}} style={Object.assign({},pdfInputSm,{flex:1,fontWeight:600,maxWidth:'60px'})} />
                    </div>}
                    {rechnungsTyp==='angebot' && gueltigBis && <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <span style={{display:'inline-block',width:'38mm',color:'#888',flexShrink:0}}>Gueltig bis:</span>
                        <input type="date" value={gueltigBis} onChange={function(e){setGueltigBis(e.target.value);}} style={Object.assign({},pdfInputSm,{flex:1,fontWeight:600})} />
                    </div>}
                </div>

                {/* POSITIONEN-BEREICH: Mehrseitige A4-Darstellung */}
                {!positionenGeladen ? (
                    <div style={{border:'2px dashed #ccc',borderRadius:'8px',padding:'28px 16px',textAlign:'center',marginBottom:'12px'}}>
                        <div style={{color:'#999',fontSize:'11px',marginBottom:'12px'}}>Positionen werden nach "Daten laden" hier angezeigt.</div>
                        <button onClick={function(){setShowDatenLaden(true);}} style={{padding:'14px 28px',background:'linear-gradient(135deg, #1E88E5, #1565C0)',color:'white',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:700,cursor:'pointer',boxShadow:'0 4px 12px rgba(30,136,229,0.3)'}}>{'\uD83D\uDCE5'} Daten laden</button>
                    </div>
                ) : (function(){
                    // Positionen auf Seiten aufteilen
                    var ROWS_PAGE1 = 10;
                    var ROWS_NEXT = 16;
                    var pages = [];
                    var pos = positionen.slice();
                    // Seite 1: weniger Platz wegen Header
                    pages.push(pos.splice(0, ROWS_PAGE1));
                    // Folgeseiten
                    while (pos.length > 0) { pages.push(pos.splice(0, ROWS_NEXT)); }
                    var lastPageIdx = pages.length - 1;
                    var zwischensumme = 0;
                    // Grid-Spalten: breitere Spalten fuer bessere Lesbarkeit
                    var gridCols = '90px 100px 50px 1fr 90px 100px';
                    // Tabellenkopf-Komponente
                    var tHead = React.createElement('div', {style:{display:'grid',gridTemplateColumns:editMode?('24px '+gridCols):gridCols,gap:'0',fontSize:'8pt',fontWeight:700,color:'#fff',background:'#2d3436',padding:'6px 6px',textTransform:'uppercase',letterSpacing:'0.3px'}},
                        editMode && React.createElement('span',null,''),
                        React.createElement('span',{style:{textAlign:'center'}},'Pos.'),
                        React.createElement('span',{style:{textAlign:'right',paddingRight:'6px'}},'Menge'),
                        React.createElement('span',{style:{textAlign:'center'}},'Einh.'),
                        React.createElement('span',{style:{paddingLeft:'8px'}},'Bezeichnung'),
                        React.createElement('span',{style:{textAlign:'right',paddingRight:'4px'}},  'EP (\u20AC)'),
                        React.createElement('span',{style:{textAlign:'right',paddingRight:'4px'}},'GP (\u20AC)')
                    );
                    // Fusszeile-Komponente
                    var tFoot = React.createElement('div', {style:{borderTop:'1.5px solid #c41e1e',paddingTop:'2mm',fontSize:'7.5pt',color:'#666',lineHeight:1.7,marginTop:'auto',paddingBottom:'4px'}},
                        React.createElement('div',{style:{display:'flex',justifyContent:'space-between'}},
                            React.createElement('span',{style:{fontWeight:700,color:'#c41e1e'}},'Thomas Willwacher Fliesenlegermeister e.K.'),
                            React.createElement('span',null,'Steuernummer: 30/220/1234/5')
                        ),
                        React.createElement('div',{style:{color:'#555',marginTop:'1mm'}},'Westerwald Bank eG \u00B7 IBAN: DE12 5739 1800 0000 0000 00 \u00B7 BIC: GENODE51WW1')
                    );
                    // Positionszeile rendern
                    var renderRow = function(p) {
                        var gp = (parseFloat(p.menge)||0)*(parseFloat(p.einzelpreis)||0);
                        zwischensumme += p.aktiv ? gp : 0;
                        if (!editMode) {
                            return React.createElement('div', {key:p.id, style:{display:'grid',gridTemplateColumns:gridCols,gap:'0',padding:'5px 6px',borderBottom:'1px solid #e0e0e0',alignItems:'start',fontSize:'9pt'}},
                                React.createElement('span',{style:{fontWeight:700,textAlign:'center',padding:'3px 4px'}},p.pos),
                                React.createElement('span',{style:{textAlign:'right',padding:'3px 6px'}},fmt(p.menge)),
                                React.createElement('span',{style:{textAlign:'center',padding:'3px 4px',fontSize:'8.5pt'}},p.einheit),
                                React.createElement('div',{style:{padding:'3px 8px',fontSize:'8.5pt',lineHeight:'1.4',whiteSpace:'pre-wrap',wordBreak:'break-word'}},p.bez),
                                React.createElement('span',{style:{textAlign:'right',padding:'3px 6px'}},fmt(p.einzelpreis)),
                                React.createElement('span',{style:{fontWeight:700,textAlign:'right',padding:'3px 4px'}},fmt(gp)+' \u20AC')
                            );
                        }
                        return React.createElement('div', {key:p.id, style:{display:'grid',gridTemplateColumns:'24px '+gridCols,gap:'0',padding:'5px 6px',borderBottom:'1px solid #e0e0e0',alignItems:'start',fontSize:'9pt',opacity:p.aktiv?1:0.3}},
                            React.createElement('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',paddingTop:'2px'}},
                                React.createElement('input',{type:'checkbox',checked:p.aktiv,onChange:function(){updatePos(p.id,'aktiv',!p.aktiv);},style:{cursor:'pointer'}}),
                                React.createElement('button',{onClick:function(){removePosition(p.id);},style:{background:'none',border:'none',color:'#c41e1e',fontSize:'10px',cursor:'pointer',padding:0}},'\u2715')
                            ),
                            React.createElement('input',{type:'text',value:p.pos,onChange:function(e){updatePos(p.id,'pos',e.target.value);},style:{padding:'3px 4px',border:'1px solid #ddd',borderRadius:'3px',fontSize:'9pt',fontWeight:700,textAlign:'center',width:'100%',boxSizing:'border-box',background:'#fafafa'}}),
                            React.createElement('input',{type:'text',inputMode:'decimal',value:p.menge===0?'0,00':(typeof p.menge==='number'?p.menge.toFixed(2).replace('.',','):p.menge),onChange:function(e){updatePos(p.id,'menge',e.target.value.replace(',','.'));},onBlur:function(e){var v=parseFloat(e.target.value.replace(',','.'));updatePos(p.id,'menge',isNaN(v)?0:Number(v.toFixed(2)));},style:{padding:'3px 6px',border:'1px solid #ddd',borderRadius:'3px',fontSize:'9pt',textAlign:'right',width:'100%',boxSizing:'border-box',background:'#fafafa'}}),
                            React.createElement('input',{type:'text',value:p.einheit,onChange:function(e){updatePos(p.id,'einheit',e.target.value);},style:{padding:'3px 4px',border:'1px solid #ddd',borderRadius:'3px',fontSize:'8.5pt',textAlign:'center',width:'100%',boxSizing:'border-box',background:'#fafafa'}}),
                            React.createElement('textarea',{value:p.bez,onChange:function(e){updatePos(p.id,'bez',e.target.value);},rows:Math.max(2, Math.ceil(((p.bez||'').length + ((p.bez||'').split('\n').length - 1) * 45) / 45)),style:{padding:'3px 8px',border:'1px solid #ddd',borderRadius:'3px',fontSize:'8.5pt',width:'100%',boxSizing:'border-box',background:'#fafafa',resize:'vertical',lineHeight:'1.4',fontFamily:'"Source Sans 3",sans-serif',minHeight:'36px'}}),
                            React.createElement('input',{type:'text',inputMode:'decimal',value:p.einzelpreis===0?'0,00':(typeof p.einzelpreis==='number'?p.einzelpreis.toFixed(2).replace('.',','):p.einzelpreis),onChange:function(e){updatePos(p.id,'einzelpreis',e.target.value.replace(',','.'));},onBlur:function(e){var v=parseFloat(e.target.value.replace(',','.'));updatePos(p.id,'einzelpreis',isNaN(v)?0:Number(v.toFixed(2)));},style:{padding:'3px 6px',border:'1px solid #ddd',borderRadius:'3px',fontSize:'9pt',textAlign:'right',width:'100%',boxSizing:'border-box',background:'#fafafa'}}),
                            React.createElement('div',{style:{fontWeight:700,textAlign:'right',padding:'4px 4px',fontSize:'9pt'}},fmt(gp)+' \u20AC')
                        );
                    };
                    return React.createElement('div', {style:{marginBottom:'12px'}},
                        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}},
                            React.createElement('div',{style:{fontSize:'9px',fontWeight:700,color:'#555',textTransform:'uppercase',letterSpacing:'0.5px'}},'Positionen ('+positionen.length+')'),
                            editMode && React.createElement('button',{onClick:addPosition,style:{padding:'4px 12px',fontSize:'9px',background:'#2d3436',color:'white',border:'none',borderRadius:'4px',cursor:'pointer',fontWeight:600}},  '+ Position')
                        ),
                        // Alle Seiten rendern
                        pages.map(function(pagePositionen, pageIdx) {
                            var isLast = pageIdx === lastPageIdx;
                            var pageZwischensummeStart = zwischensumme;
                            return React.createElement('div', {key:'page_'+pageIdx, style:{background:'#fff',borderRadius:pageIdx===0?'0':'8px',padding:pageIdx===0?'0':'20px 20px 16px',marginTop:pageIdx===0?'0':'16px',boxShadow:pageIdx===0?'none':'0 2px 12px rgba(0,0,0,0.15)',border:pageIdx===0?'none':'1px solid #ddd',minHeight:pageIdx===0?'auto':'400px',display:'flex',flexDirection:'column',position:'relative'}},
                                // Seitenheader (nur ab Seite 2)
                                pageIdx > 0 && React.createElement('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:'8px',paddingBottom:'6px',borderBottom:'1px solid #eee',fontSize:'8pt',color:'#888'}},
                                    React.createElement('span',null,'Seite '+(pageIdx+1)),
                                    React.createElement('span',{style:{fontStyle:'italic'}},'Uebertrag von Seite '+pageIdx+': '+fmt(pageZwischensummeStart)+' \u20AC')
                                ),
                                // Tabellenkopf
                                tHead,
                                // Positionszeilen
                                pagePositionen.map(renderRow),
                                // Uebertrag am Seitenende (wenn nicht letzte Seite)
                                !isLast && React.createElement('div',{style:{display:'grid',gridTemplateColumns:editMode?('24px '+gridCols):gridCols,gap:'0',padding:'6px 6px',borderTop:'1.5px solid #222',marginTop:'4px',fontSize:'9pt',fontWeight:700,color:'#555'}},
                                    editMode && React.createElement('span',null,''),
                                    React.createElement('span',{style:{gridColumn: editMode?'2 / 7':'1 / 6',textAlign:'right',paddingRight:'8px'}},'Uebertrag auf Seite '+(pageIdx+2)+':'),
                                    React.createElement('span',{style:{textAlign:'right',paddingRight:'4px'}},fmt(zwischensumme)+' \u20AC')
                                ),
                                // Auf letzter Seite: Summenblock mit viel Platz
                                isLast && React.createElement('div',{style:{marginTop:'20px',paddingTop:'16px'}},
                                    React.createElement('div',{style:{marginLeft:'auto',width:'55%',fontSize:'10pt'}},
                                        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',padding:'3px 0'}},React.createElement('span',null,'Nettobetrag:'),React.createElement('span',{style:{fontWeight:600}},fmt(nettoSumme)+' \u20AC')),
                                        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:'9pt',color:'#777'}},React.createElement('span',null,'zzgl. '+mwstSatz+'% MwSt.:'),React.createElement('span',null,fmt(mwstBetrag)+' \u20AC')),
                                        React.createElement('div',{style:{display:'flex',justifyContent:'space-between',padding:'6px 0',fontWeight:700,fontSize:'13pt',borderTop:'2.5px double #222',marginTop:'4px'}},React.createElement('span',null,'Bruttobetrag:'),React.createElement('span',null,fmt(bruttoSumme)+' \u20AC')),
                                        istRechnung && sicherheitseinbehalt>0 && React.createElement('div',{style:{display:'flex',justifyContent:'space-between',fontSize:'9pt',color:'#777',padding:'3px 0'}},React.createElement('span',null,'abzgl. Sicherheitseinbehalt '+sicherheitseinbehalt+'%:'),React.createElement('span',null,'\u2013 '+fmt(sicherheitBetrag)+' \u20AC')),
                                        rechnungsTyp==='schluss' && kontoSumme>0 && React.createElement('div',{style:{display:'flex',justifyContent:'space-between',fontSize:'9pt',color:'#27ae60',fontWeight:600,padding:'3px 0'}},React.createElement('span',null,'abzgl. Kontozahlungen:'),React.createElement('span',null,'\u2013 '+fmt(kontoSumme)+' \u20AC')),
                                        istRechnung && React.createElement(React.Fragment,null,
                                            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',fontWeight:700,color:'#c41e1e',padding:'4px 0',marginTop:'4px',fontSize:'10pt'}},React.createElement('span',null,'Zahlbar innerh. '+skontoTage+' Tage ('+skontoProzent+'% Skonto):'),React.createElement('span',null,fmt(zahlbetragMitSkonto)+' \u20AC')),
                                            React.createElement('div',{style:{display:'flex',justifyContent:'space-between',fontWeight:700,padding:'4px 0',fontSize:'10pt'}},React.createElement('span',null,'Zahlbar innerh. '+zahlungszielTage+' Tage netto:'),React.createElement('span',null,fmt(zahlbetragOhneSkonto)+' \u20AC'))
                                        )
                                    )
                                ),
                                // Fusszeile auf jeder Seite (mit Abstand)
                                React.createElement('div',{style:{flexGrow:1,minHeight:isLast?'40px':'20px'}}),
                                pageIdx > 0 && tFoot
                            );
                        })
                    );
                })()}

                {/* Schlussrechnung: Kontozahlungen */}
                {rechnungsTyp==='schluss'&&(<button onClick={function(){setShowKontoDialog(true);ladeKontozahlungen();}} style={{width:'100%',padding:'8px',marginBottom:'8px',borderRadius:'8px',border:'1px solid #27ae60',background:'rgba(39,174,96,0.06)',color:'#27ae60',fontSize:'10px',fontWeight:700,cursor:'pointer'}}>Kontozahlungen anzeigen ({kontozahlungen.length})</button>)}

                {/* FUSSZEILE (Vorschau) */}
                <div style={{borderTop:'1.5px solid #c41e1e',paddingTop:'2mm',fontSize:'7.5pt',color:'#666',lineHeight:1.7,marginTop:'auto'}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontWeight:700,color:'#c41e1e'}}>Thomas Willwacher Fliesenlegermeister e.K.</span><span>Steuernummer: 30/220/1234/5</span></div>
                    <div style={{color:'#555',marginTop:'1mm'}}>Westerwald Bank eG {'\u00B7'} IBAN: DE12 5739 1800 0000 0000 00 {'\u00B7'} BIC: GENODE51WW1</div>
                </div>
            </div>

            {/* Modals (Daten laden + Kontozahlungen) */}
            {showDatenLaden&&(<div className="modal-overlay" onClick={function(){setShowDatenLaden(false);}}><div className="modal" onClick={function(e){e.stopPropagation();}} style={{maxWidth:'400px'}}><div className="modal-title">{'\uD83D\uDCE5'} Daten laden</div><div style={{display:'flex',flexDirection:'column',gap:'8px'}}>{hatAufmass&&(<button onClick={ladenAusAufmass} style={{padding:'14px',borderRadius:'10px',border:'2px solid #27ae60',background:'rgba(39,174,96,0.06)',cursor:'pointer',textAlign:'left'}}><div style={{fontWeight:700,fontSize:'13px',color:'var(--success)'}}>Aus Aufmass laden</div><div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>{Object.keys(aufmassMassen).filter(function(k){return aufmassMassen[k]>0;}).length} berechnete Positionen</div></button>)}{!hatAufmass&&(<div style={{padding:'10px',borderRadius:'10px',background:'rgba(230,126,34,0.08)',fontSize:'11px',color:'var(--accent-orange)',textAlign:'center'}}>Aufmass nicht verfuegbar</div>)}<button onClick={ladenAusKundenpositionen} style={{padding:'14px',borderRadius:'10px',border:'2px solid var(--accent-blue)',background:'rgba(30,136,229,0.06)',cursor:'pointer',textAlign:'left'}}><div style={{fontWeight:700,fontSize:'13px',color:'var(--accent-blue)'}}>Kundenpositionen</div><div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>{lvPositionen.length} LV-Positionen</div></button><button onClick={ladenAusDatei} style={{padding:'14px',borderRadius:'10px',border:'1px dashed var(--border-color)',background:'var(--bg-secondary)',cursor:'pointer',textAlign:'left'}}><div style={{fontWeight:700,fontSize:'13px',color:'var(--text-secondary)'}}>Datei hochladen</div><div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>PDF, XLSX, CSV, JSON</div></button></div><button onClick={function(){setShowDatenLaden(false);}} style={{width:'100%',marginTop:'12px',padding:'10px',background:'var(--bg-tertiary)',color:'var(--text-muted)',border:'none',borderRadius:'10px',fontSize:'12px',cursor:'pointer'}}>Abbrechen</button></div></div>)}
            {showKontoDialog&&(<div className="modal-overlay" onClick={function(){setShowKontoDialog(false);}}><div className="modal" onClick={function(e){e.stopPropagation();}} style={{maxWidth:'420px',maxHeight:'80vh',overflow:'auto'}}><div className="modal-title">Kontozahlungen</div>{kontozahlungen.length===0?<div style={{padding:'16px',textAlign:'center',color:'var(--text-muted)',fontSize:'12px'}}>Keine Abschlagszahlungen gefunden.</div>:kontozahlungen.map(function(k,i){return<div key={k.id} style={{padding:'8px 12px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'center',gap:'8px'}}><input type="checkbox" checked={k.aufgefuehrt} onChange={function(){setKontozahlungen(function(prev){return prev.map(function(kk,ii){return ii===i?Object.assign({},kk,{aufgefuehrt:!kk.aufgefuehrt}):kk;});});}} /><div style={{flex:1,fontSize:'12px',fontWeight:600}}>{k.nr} vom {k.datum}</div><div style={{fontWeight:700,color:'var(--success)'}}>{fmt(k.betrag)} {'\u20AC'}</div></div>;})}<div style={{padding:'12px',borderTop:'2px solid var(--border-color)',fontWeight:700,display:'flex',justifyContent:'space-between'}}><span>Summe:</span><span style={{color:'var(--success)'}}>{fmt(kontoSumme)} {'\u20AC'}</span></div><button onClick={function(){setShowKontoDialog(false);}} style={{width:'100%',padding:'10px',marginTop:'8px',background:typColor,color:'white',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>Uebernehmen</button></div></div>)}
            {/* Bottom-Bar */}
            <div style={{position:'fixed',bottom:0,left:0,right:0,padding:'10px 16px',background:'var(--bg-primary)',borderTop:'1px solid var(--border-color)',zIndex:100,display:'flex',gap:'8px'}}><button onClick={function(){setPhase('typwahl');setPositionenGeladen(false);setPositionen([]);setEditMode(false);}} style={{padding:'12px 32px',borderRadius:'var(--radius-md)',border:'none',background:'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))',color:'#fff',cursor:'pointer',fontSize:'14px',fontWeight:'600',fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'1px',boxShadow:'0 4px 15px rgba(196,30,30,0.3)',transition:'all 0.25s ease',touchAction:'manipulation'}}>{'\u2190'} Zurueck</button>{positionenGeladen&&<button onClick={function(){setShowBearbeitenPopup(true);}} style={{flex:2,padding:'12px',background:'linear-gradient(135deg, var(--accent-orange), var(--accent-orange-light))',color:'white',border:'none',borderRadius:'var(--radius-md)',fontSize:'16px',fontWeight:700,cursor:'pointer',fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'1.5px',boxShadow:'0 4px 15px rgba(230,126,34,0.3)',touchAction:'manipulation'}}>Bearbeiten {'\u2192'}</button>}</div>
            {/* Bearbeiten-Popup mit 6 Optionen */}
            {showBearbeitenPopup&&(<div className="modal-overlay" onClick={function(){setShowBearbeitenPopup(false);}}><div className="modal" onClick={function(e){e.stopPropagation();}} style={{maxWidth:'440px',padding:'24px'}}><div style={{textAlign:'center',marginBottom:'20px'}}><div style={{fontSize:'18px',fontWeight:700,fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'1px',color:'var(--text-white)'}}>Dokument bearbeiten</div><div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'4px'}}>{kunde?kunde.name:''}</div></div><div style={{display:'flex',flexDirection:'column',gap:'8px'}}><button onClick={function(){setEditMode(true);setShowBearbeitenPopup(false);}} style={{width:'100%',padding:'16px',borderRadius:'var(--radius-lg)',border:'1px solid transparent',cursor:'pointer',background:'linear-gradient(135deg, #1E88E5, #1565C0)',color:'#fff',display:'flex',alignItems:'center',gap:'14px',textAlign:'left',boxShadow:'0 6px 20px rgba(30,136,229,0.30)',touchAction:'manipulation'}}><svg viewBox="0 0 28 28" fill="none" style={{width:'24px',height:'24px',flexShrink:0}}><path d="M20 4l4 4-14 14H6v-4L20 4z" stroke="white" strokeWidth="2" strokeLinejoin="round"/><line x1="16" y1="8" x2="20" y2="12" stroke="white" strokeWidth="1.5"/></svg><div style={{flex:1}}><div style={{fontSize:'15px',fontWeight:600,fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'0.5px'}}>Dokument bearbeiten</div><div style={{fontSize:'11px',opacity:0.85,marginTop:'2px',fontFamily:'Source Sans 3, sans-serif'}}>Positionen bearbeiten, hinzufuegen oder entfernen</div></div></button><button onClick={function(){generatePDF();setShowBearbeitenPopup(false);}} style={{width:'100%',padding:'16px',borderRadius:'var(--radius-lg)',border:'1px solid transparent',cursor:'pointer',background:'linear-gradient(135deg, #27ae60, #1e8449)',color:'#fff',display:'flex',alignItems:'center',gap:'14px',textAlign:'left',boxShadow:'0 6px 20px rgba(39,174,96,0.30)',touchAction:'manipulation'}}><svg viewBox="0 0 28 28" fill="none" style={{width:'24px',height:'24px',flexShrink:0}}><rect x="4" y="4" width="20" height="20" rx="2" stroke="white" strokeWidth="2"/><line x1="8" y1="10" x2="20" y2="10" stroke="white" strokeWidth="1.5"/><line x1="8" y1="14" x2="20" y2="14" stroke="white" strokeWidth="1.5"/><line x1="8" y1="18" x2="16" y2="18" stroke="white" strokeWidth="1.5"/></svg><div style={{flex:1}}><div style={{fontSize:'15px',fontWeight:600,fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'0.5px'}}>Ausdrucken</div><div style={{fontSize:'11px',opacity:0.85,marginTop:'2px',fontFamily:'Source Sans 3, sans-serif'}}>Dokument wird ausgedruckt</div></div></button><button onClick={function(){generatePDF();saveToGoogleDrive();setShowBearbeitenPopup(false);}} style={{width:'100%',padding:'16px',borderRadius:'var(--radius-lg)',border:'1px solid transparent',cursor:'pointer',background:'linear-gradient(135deg, #00897b, #00695c)',color:'#fff',display:'flex',alignItems:'center',gap:'14px',textAlign:'left',boxShadow:'0 6px 20px rgba(0,137,123,0.30)',touchAction:'manipulation'}}><svg viewBox="0 0 28 28" fill="none" style={{width:'24px',height:'24px',flexShrink:0}}><rect x="4" y="4" width="20" height="20" rx="2" stroke="white" strokeWidth="2"/><path d="M10 14l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg><div style={{flex:1}}><div style={{fontSize:'15px',fontWeight:600,fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'0.5px'}}>Ausdrucken + PDF speichern</div><div style={{fontSize:'11px',opacity:0.85,marginTop:'2px',fontFamily:'Source Sans 3, sans-serif'}}>Dokument ausdrucken und als PDF ablegen</div></div></button><button onClick={function(){setShowBearbeitenPopup(false);openMailDialog();}} style={{width:'100%',padding:'16px',borderRadius:'var(--radius-lg)',border:'1px solid transparent',cursor:'pointer',background:'linear-gradient(135deg, #e67e22, #d35400)',color:'#fff',display:'flex',alignItems:'center',gap:'14px',textAlign:'left',boxShadow:'0 6px 20px rgba(230,126,34,0.30)',touchAction:'manipulation'}}><svg viewBox="0 0 28 28" fill="none" style={{width:'24px',height:'24px',flexShrink:0}}><rect x="2" y="6" width="24" height="16" rx="2" stroke="white" strokeWidth="2"/><path d="M2 8l12 8 12-8" stroke="white" strokeWidth="2"/></svg><div style={{flex:1}}><div style={{fontSize:'15px',fontWeight:600,fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'0.5px'}}>Als Mail versenden</div><div style={{fontSize:'11px',opacity:0.85,marginTop:'2px',fontFamily:'Source Sans 3, sans-serif'}}>E-Mail-Adresse waehlen und Dokument senden</div></div></button>{istRechnung&&<React.Fragment><button onClick={function(){downloadXRechnung();setShowBearbeitenPopup(false);}} style={{width:'100%',padding:'16px',borderRadius:'var(--radius-lg)',border:'1px solid transparent',cursor:'pointer',background:'linear-gradient(135deg, #4da6ff, #1E88E5)',color:'#fff',display:'flex',alignItems:'center',gap:'14px',textAlign:'left',boxShadow:'0 6px 20px rgba(77,166,255,0.30)',touchAction:'manipulation'}}><svg viewBox="0 0 28 28" fill="none" style={{width:'24px',height:'24px',flexShrink:0}}><rect x="4" y="2" width="20" height="24" rx="2" stroke="white" strokeWidth="2"/><text x="14" y="17" fill="white" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="Oswald, sans-serif">XML</text></svg><div style={{flex:1}}><div style={{fontSize:'15px',fontWeight:600,fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'0.5px'}}>XRechnung erstellen</div><div style={{fontSize:'11px',opacity:0.85,marginTop:'2px',fontFamily:'Source Sans 3, sans-serif'}}>XML-Format fuer Behoerden</div></div></button><button onClick={function(){downloadZUGFeRD();setShowBearbeitenPopup(false);}} style={{width:'100%',padding:'16px',borderRadius:'var(--radius-lg)',border:'1px solid transparent',cursor:'pointer',background:'linear-gradient(135deg, #8e44ad, #6c3483)',color:'#fff',display:'flex',alignItems:'center',gap:'14px',textAlign:'left',boxShadow:'0 6px 20px rgba(142,68,173,0.30)',touchAction:'manipulation'}}><svg viewBox="0 0 28 28" fill="none" style={{width:'24px',height:'24px',flexShrink:0}}><rect x="4" y="2" width="20" height="24" rx="2" stroke="white" strokeWidth="2"/><text x="14" y="17" fill="white" fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="Oswald, sans-serif">ZUG</text></svg><div style={{flex:1}}><div style={{fontSize:'15px',fontWeight:600,fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'0.5px'}}>ZUGFeRD / E-Rechnung</div><div style={{fontSize:'11px',opacity:0.85,marginTop:'2px',fontFamily:'Source Sans 3, sans-serif'}}>PDF + XML fuer B2B (EN 16931)</div></div></button></React.Fragment>}</div><button onClick={function(){setShowBearbeitenPopup(false);}} style={{width:'100%',marginTop:'12px',padding:'14px 32px',borderRadius:'var(--radius-md)',border:'none',background:'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))',color:'#fff',cursor:'pointer',fontSize:'14px',fontWeight:'600',fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'1px',boxShadow:'0 4px 15px rgba(196,30,30,0.3)',touchAction:'manipulation'}}>Abbrechen</button></div></div>)}
            </div>);}
            // ===== PHASE 2b: POSITIONSAUSWAHL =====
            if(phase==='posauswahl'){var aP=lvPositionen.map(function(p,i){return{idx:i,pos:p.pos||p.posNr||String(i+1),bez:p.bez||p.titel||'',einheit:p.einheit||'m\u00B2',menge:p.menge||0,einzelpreis:p.einzelpreis||p.ep||0,aufmassMenge:aufmassMassen[p.pos||p.posNr]||0};});var aA=aP.length>0&&aP.every(function(p){return posAuswahl[p.idx]!==false;});var nA=aP.filter(function(p){return posAuswahl[p.idx]!==false;}).length;return(<div className="page-container" style={{padding:'16px',minHeight:'100vh',paddingBottom:'90px'}}><div style={{textAlign:'center',marginBottom:'16px'}}><div style={{fontSize:'11px',color:'var(--text-muted)',letterSpacing:'1.5px',textTransform:'uppercase'}}>Positionen auswaehlen</div><div style={{fontSize:'15px',fontWeight:700,marginTop:'4px'}}>{kunde?kunde.name:''}</div></div>{aP.length>0?(<div style={{background:'var(--bg-secondary)',borderRadius:'14px',overflow:'hidden',marginBottom:'12px'}}><div style={{padding:'10px 14px',borderBottom:'2px solid var(--border-color)',display:'flex',alignItems:'center',gap:'8px'}}><input type="checkbox" checked={aA} onChange={function(){var n={};aP.forEach(function(p){n[p.idx]=!aA;});setPosAuswahl(n);}} /><span style={{fontSize:'12px',fontWeight:700,color:typColor}}>Alle ({aP.length})</span><span style={{marginLeft:'auto',fontSize:'11px',color:'var(--text-muted)'}}>{nA} ausgewaehlt</span></div><div style={{maxHeight:'400px',overflow:'auto'}}>{aP.map(function(p){var chk=posAuswahl[p.idx]!==false;return(<div key={p.idx} style={{padding:'10px 14px',borderBottom:'1px solid var(--border-color)',display:'flex',alignItems:'flex-start',gap:'8px',opacity:chk?1:0.4}}><input type="checkbox" checked={chk} onChange={function(){setPosAuswahl(function(prev){var n=Object.assign({},prev);n[p.idx]=!chk;return n;});}} style={{marginTop:'2px'}} /><div style={{flex:1}}><div style={{display:'flex',gap:'6px',alignItems:'center'}}><span style={{fontWeight:700,fontSize:'11px',color:typColor,minWidth:'40px'}}>{p.pos}</span><span style={{fontSize:'12px'}}>{p.bez}</span></div><div style={{display:'flex',gap:'12px',marginTop:'3px',fontSize:'11px',color:'var(--text-muted)'}}><span>LV: {fmt(p.menge)} {p.einheit}</span>{p.einzelpreis>0&&<span>EP: {fmt(p.einzelpreis)} {'\u20AC'}</span>}{p.aufmassMenge>0&&<span style={{color:'var(--success)',fontWeight:600}}>Aufmass: {fmt(p.aufmassMenge)} {p.einheit}</span>}</div></div></div>);})}</div></div>):(<div style={{textAlign:'center',padding:'30px',color:'var(--text-muted)',fontSize:'13px',background:'var(--bg-secondary)',borderRadius:'14px',marginBottom:'12px'}}>Keine LV-Positionen.</div>)}<div style={{position:'fixed',bottom:0,left:0,right:0,padding:'10px 16px',background:'var(--bg-primary)',borderTop:'1px solid var(--border-color)',zIndex:100,display:'flex',gap:'8px'}}><button onClick={function(){setPhase('startseite');}} style={{flex:1,padding:'12px',background:'var(--bg-tertiary)',color:'var(--text-muted)',border:'none',borderRadius:'10px',fontSize:'12px',cursor:'pointer'}}>{'\u2190'} Zurueck</button><button onClick={function(){var sel=aP.filter(function(p){return posAuswahl[p.idx]!==false;});initPositionen(sel);setPhase('startseite');}} style={{flex:2,padding:'12px',background:nA>0?typColor:'var(--bg-tertiary)',color:'white',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>{nA>0?nA+' uebernehmen':'Weiter'}</button></div></div>);}
            // ===== PHASE 3: FORMULAR (entfernt — Bearbeitung ist jetzt im PDF-Layout) =====
            // Falls jemand noch auf phase 'formular' kommt, zurueck zur startseite
            if(phase==='formular'){setPhase('startseite');setEditMode(true);}
            return null;
        }
