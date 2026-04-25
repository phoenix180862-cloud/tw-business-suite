        /* =====================================================================
           SCHRIFTVERKEHR-MODUL -- Mail & Brief Korrespondenz
           Skill: SKILL-schriftverkehr-briefkopf.md + SKILL-jspdf-briefkopf.md
           Phase: kanalwahl -> startseite (PDF-Vorschau) -> bearbeiten-popup
           PDF: Identisch zum Rechnungsmodul (jsPDF Briefkopf)
           ===================================================================== */
        function SchriftverkehrModul({ kunde, onBack }) {
            var BLAU = 'linear-gradient(135deg, #1E88E5, #1565C0)';
            var BLAU_SHADOW = '0 6px 20px rgba(30,136,229,0.30)';
            var ROT = 'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))';
            var ROT_SHADOW = '0 4px 15px rgba(196,30,30,0.3)';

            const [phase, setPhase] = useState('kanalwahl');
            const [versandKanal, setVersandKanal] = useState(null);
            const [showBearbeitenPopup, setShowBearbeitenPopup] = useState(false);
            const [editMode, setEditMode] = useState(false);
            const [showMailDialog, setShowMailDialog] = useState(false);
            const [mailAdresse, setMailAdresse] = useState('');

            const [empfaenger, setEmpfaenger] = useState(kunde ? (kunde.auftraggeber || kunde.name || '') : '');
            const [empfAdresse, setEmpfAdresse] = useState(function() {
                if (!kunde) return '';
                var str = kunde.auftraggeber_strasse || '';
                var plz = kunde.auftraggeber_plzOrt || '';
                if (str || plz) return (str + (str && plz ? ', ' : '') + plz).trim();
                return kunde.ag_adresse || kunde.adresse || '';
            });
            const [empfEmail, setEmpfEmail] = useState(kunde ? (kunde.ag_email || '') : '');
            const [bauvorhaben, setBauvorhaben] = useState(kunde ? (kunde.adresse || kunde.baumassnahme || kunde.name || '') : '');
            const [unserZeichen, setUnserZeichen] = useState('TW/' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*900)+100));
            const [betreff, setBetreff] = useState('');
            const [anrede, setAnrede] = useState('Sehr geehrte Damen und Herren,');
            const [textBody, setTextBody] = useState('');
            const [grussformel, setGrussformel] = useState('Mit freundlichen Gr\u00FC\u00DFen');
            const [briefDatum, setBriefDatum] = useState(new Date().toISOString().split('T')[0]);
            const [bilder, setBilder] = useState([]);
            const [vorlage, setVorlage] = useState('');
            const [sendStatus, setSendStatus] = useState(null);

            var vorlagen = [
                { id: 'aufmass', name: 'Aufma\u00DFank\u00FCndigung', betreff: 'Aufma\u00DF-Termin -- ' + bauvorhaben, text: 'bezugnehmend auf den oben genannten Bauvertrag m\u00F6chte ich Ihnen mitteilen, dass ich beabsichtige, ein Aufma\u00DF der bisher erbrachten Leistungen durchzuf\u00FChren.\n\nIch bitte Sie, einen Vertreter zu diesem Termin zu entsenden, um das Aufma\u00DF gemeinsam vorzunehmen.\n\nSollte der vorgeschlagene Termin nicht passen, bitte ich um kurzfristige R\u00FCckmeldung, damit wir einen Alternativtermin vereinbaren k\u00F6nnen.' },
                { id: 'bedenken', name: 'Bedenkenanmeldung (VOB/B \u00A74)', betreff: 'Bedenkenanmeldung gem. VOB/B \u00A74 Abs. 3 -- ' + bauvorhaben, text: 'hiermit melde ich gem\u00E4\u00DF VOB/B \u00A74 Abs. 3 Bedenken an gegen:\n\n\u2610 die vorgesehene Art der Ausf\u00FChrung\n\u2610 die G\u00FCte der vom Auftraggeber gelieferten Stoffe oder Bauteile\n\u2610 die Leistung anderer Unternehmer\n\nBegr\u00FCndung:\n[Hier die konkreten Bedenken beschreiben]\n\nIch bitte um schriftliche Stellungnahme bis zum [Datum].' },
                { id: 'behinderung', name: 'Behinderungsanzeige (VOB/B \u00A76)', betreff: 'Behinderungsanzeige gem. VOB/B \u00A76 Abs. 1 -- ' + bauvorhaben, text: 'hiermit zeige ich Ihnen gem\u00E4\u00DF VOB/B \u00A76 Abs. 1 an, dass ich in der Ausf\u00FChrung meiner vertraglichen Leistungen behindert bin.\n\nArt der Behinderung:\n[Hier die Behinderung beschreiben]\n\nBeginn der Behinderung: [Datum]\n\nIch bitte um unverz\u00FCgliche Beseitigung der Behinderung.' },
                { id: 'rechnung', name: 'Rechnung \u00FCbersenden', betreff: 'Rechnung -- ' + bauvorhaben, text: 'anbei \u00FCbersende ich Ihnen meine Rechnung f\u00FCr die erbrachten Leistungen im oben genannten Bauvorhaben.\n\nIch bitte um \u00DCberweisung des Betrages innerhalb der angegebenen Zahlungsfrist auf das in der Rechnung angegebene Konto.' },
                { id: 'nachtrag', name: 'Nachtragsangebot (VOB/B \u00A72)', betreff: 'Nachtragsangebot -- ' + bauvorhaben, text: 'bei der Ausf\u00FChrung der Arbeiten haben sich zus\u00E4tzliche Leistungen ergeben.\n\nGem\u00E4\u00DF VOB/B \u00A72 Abs. 5/6 unterbreite ich Ihnen hiermit folgendes Nachtragsangebot:\n\n[Beschreibung der Zusatzleistungen]\n\nIch bitte um schriftliche Beauftragung vor Ausf\u00FChrung der Arbeiten.' },
                { id: 'maengelruege', name: 'M\u00E4ngelr\u00FCge', betreff: 'M\u00E4ngelr\u00FCge -- ' + bauvorhaben, text: 'bei der Ausf\u00FChrung meiner Arbeiten habe ich festgestellt, dass die Vorleistungen M\u00E4ngel aufweisen.\n\nFestgestellte M\u00E4ngel:\n[Hier die M\u00E4ngel beschreiben]\n\nIch fordere Sie auf, die genannten M\u00E4ngel bis zum [Datum] zu beseitigen.' },
                { id: 'abnahme', name: 'Abnahme anfordern (VOB/B \u00A712)', betreff: 'Fertigstellungsanzeige -- ' + bauvorhaben, text: 'hiermit zeige ich Ihnen an, dass ich meine vertraglichen Leistungen fertiggestellt habe.\n\nGem\u00E4\u00DF VOB/B \u00A712 Abs. 1 fordere ich Sie auf, innerhalb von 12 Werktagen die Abnahme durchzuf\u00FChren.\n\nIch schlage folgenden Termin vor: [Datum]' },
            ];

            var applyVorlage = function(id) { setVorlage(id); if (!id) return; var v = vorlagen.find(function(t){ return t.id === id; }); if (v) { setBetreff(v.betreff); setTextBody(v.text); } };

            var bildInputRef = React.useRef(null);
            var kameraInputRef = React.useRef(null);
            var handleBild = function(e) {
                var file = e.target.files && e.target.files[0];
                if (!file) return;
                var img = new Image();
                var canvas = document.createElement('canvas');
                // BLOCK B / FIX B1 — Blob-URL merken fuer revoke
                var blobUrl = URL.createObjectURL(file);
                img.onload = function() {
                    var w = img.width, h = img.height;
                    var maxW = 1200, maxH = 900;
                    if (w > maxW) { h = h * maxW / w; w = maxW; }
                    if (h > maxH) { w = w * maxH / h; h = maxH; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    setBilder(function(prev) { return prev.concat([{ name: file.name, dataUrl: canvas.toDataURL('image/jpeg', 0.85) }]); });
                    try { URL.revokeObjectURL(blobUrl); } catch(err) {}
                };
                img.onerror = function() {
                    try { URL.revokeObjectURL(blobUrl); } catch(err) {}
                    alert('Bild konnte nicht geladen werden.');
                };
                img.src = blobUrl;
                e.target.value = '';
            };
            var removeBild = function(idx) { setBilder(function(prev) { return prev.filter(function(_, i) { return i !== idx; }); }); };

            // -- Adresse aufsplitten --
            var splitAdresse = function() {
                var af = empfAdresse || '';
                var str = ''; var plzOrt = '';
                if (af) { var m = af.match(/^(.*?)[\s,]+(\d{5}\s+.*)$/); if(m){str=m[1].trim();plzOrt=m[2].trim();}else{var parts=af.split(',');str=(parts[0]||'').trim();plzOrt=(parts[1]||'').trim();} }
                return { strasse: str, plzOrt: plzOrt };
            };

            // ===== jsPDF PDF-ERZEUGUNG (IDENTISCH zum Rechnungsmodul) =====
            var generatePDF = function() {
                var doc = new jspdf.jsPDF('p','mm','a4');
                var PW=210,PH=297,ML=22,MR=18,MT=18,MB=25;
                var CW=PW-ML-MR; var rx=PW-MR;

                var adr = splitAdresse();
                var empfName = empfaenger || '';
                var empfStrasse = adr.strasse;
                var empfPlzOrt = adr.plzOrt;
                var datumFormatiert = new Date(briefDatum).toLocaleDateString('de-DE');

                // === FUSSZEILE (auf jeder Seite) ===
                var drawFooter = function(pn) {
                    doc.setDrawColor(196,30,30);doc.setLineWidth(0.5);
                    doc.line(ML,PH-MB+2,rx,PH-MB+2);
                    doc.setFontSize(7);doc.setFont('helvetica','bold');doc.setTextColor(196,30,30);
                    doc.text('Thomas Willwacher Fliesenlegermeister e.K.',ML,PH-MB+6);
                    doc.setFont('helvetica','normal');doc.setTextColor(102,102,102);
                    doc.text('Steuernummer: 30/220/1234/5',rx,PH-MB+6,{align:'right'});
                    doc.text('Westerwald Bank eG \u00B7 IBAN: DE12 5739 1800 0000 0000 00 \u00B7 BIC: GENODE51WW1',ML,PH-MB+10);
                    doc.text('Seite '+pn,rx,PH-MB+10,{align:'right'});
                };

                var y = MT;

                // === LOGO: exakt wie Rechnungsmodul (SKILL-jspdf-briefkopf.md) ===
                doc.setFont('helvetica','bold');
                doc.setFontSize(38);var wW=doc.getTextWidth('w');var iW=doc.getTextWidth('i');var wacherW=doc.getTextWidth('wacher');
                doc.setFontSize(53);var llW=doc.getTextWidth('LL');
                var lx=ML;
                doc.setFontSize(38);doc.setTextColor(17,17,17);
                doc.text('w',lx,y+20);doc.text('w',lx+0.2,y+20);lx+=wW;
                doc.text('i',lx,y+20);doc.text('i',lx+0.2,y+20);
                var iMid=lx+iW/2;
                doc.setFillColor(255,255,255);doc.rect(lx-1,y+4,iW+2,7,'F');
                doc.setFillColor(196,30,30);doc.rect(iMid-1.1,y+10,2.2,2.2,'F');
                lx+=iW;
                doc.setFont('helvetica','bold');doc.setFontSize(53);doc.setTextColor(17,17,17);
                doc.text('LL',lx,y+20);doc.text('LL',lx+0.2,y+20);lx+=llW;
                doc.setFontSize(38);doc.text('wacher',lx,y+20);doc.text('wacher',lx+0.2,y+20);
                var logoEnd=lx+wacherW;
                doc.setFont('helvetica','bold');doc.setFontSize(10.1);doc.setTextColor(196,30,30);
                doc.text('Thomas',ML,y+9);
                doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(196,30,30);
                doc.text('Fliesenlegermeister e.K.',logoEnd,y+25,{align:'right'});
                doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(51,51,51);
                doc.text('Flurweg 14a',rx,y+8,{align:'right'});
                doc.text('56472 Nisterau',rx,y+12,{align:'right'});
                doc.text('Tel. 02661-63101',rx,y+16,{align:'right'});
                doc.text('Mobil 0170-2024161',rx,y+20,{align:'right'});
                y+=30;

                // --- Rote Trennlinie ---
                doc.setDrawColor(196,30,30);doc.setLineWidth(0.8);doc.line(ML,y,rx,y);y+=4;
                // --- Absenderzeile ---
                doc.setFont('helvetica','normal');doc.setFontSize(6);doc.setTextColor(170,170,170);
                doc.text('Thomas Willwacher Fliesenlegermeister e.K. \u00B7 Flurweg 14a \u00B7 56472 Nisterau',ML,y);y+=6;

                // --- EMPFAENGER links + DATUM rechts ---
                var addrStartY=y;
                doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(17,17,17);
                doc.text(empfName,ML,y);y+=5;
                doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(51,51,51);
                if(empfStrasse){doc.text(empfStrasse,ML,y);y+=5;}
                if(empfPlzOrt){doc.text(empfPlzOrt,ML,y);y+=5;}
                doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(136,136,136);
                doc.text('Datum:',rx-30,addrStartY);
                doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(34,34,34);
                doc.text(datumFormatiert,rx,addrStartY,{align:'right'});
                y=Math.max(y,addrStartY+20);
                y+=20;

                // --- BETREFF (gross) ---
                if (betreff) {
                    doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(17,17,17);
                    doc.text(betreff,ML,y);y+=8;
                }

                // --- BAUVORHABEN ---
                doc.setFontSize(11);
                var bvLabel='Bauvorhaben: ';
                var bvLabelW=doc.getTextWidth(bvLabel);
                doc.setFont('helvetica','bold');doc.text(bvLabel,ML,y);
                var bvTextWidth=CW-bvLabelW;
                var bvLines=doc.splitTextToSize(bauvorhaben||'',bvTextWidth);
                bvLines.forEach(function(line){doc.text(line,ML+bvLabelW,y);y+=5;});
                y+=2;

                // --- UNSER ZEICHEN ---
                doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(136,136,136);
                doc.text('Unser Zeichen:',ML,y);
                doc.setFont('helvetica','bold');doc.setTextColor(34,34,34);
                doc.text(unserZeichen,ML+42,y);y+=8;

                // --- BRIEFTEXT (Anrede + Text + Gruss) ---
                var maxTextY = PH - MB - 5;
                var pageNum = 1;
                drawFooter(pageNum);

                doc.setFont('helvetica','normal');doc.setFontSize(10.5);doc.setTextColor(34,34,34);

                // Anrede
                if (anrede) {
                    var anredeLines = doc.splitTextToSize(anrede, CW);
                    anredeLines.forEach(function(line) {
                        if (y > maxTextY) { doc.addPage(); pageNum++; y = MT; drawFooter(pageNum); }
                        doc.text(line, ML, y); y += 5;
                    });
                    y += 3;
                }

                // Textkoerper
                if (textBody) {
                    var textLines = doc.splitTextToSize(textBody, CW);
                    textLines.forEach(function(line) {
                        if (y > maxTextY) { doc.addPage(); pageNum++; y = MT; drawFooter(pageNum); }
                        doc.text(line, ML, y); y += 5;
                    });
                    y += 5;
                }

                // Bilder einfuegen
                bilder.forEach(function(b) {
                    try {
                        var imgW = 80; var imgH = 60;
                        if (y + imgH > maxTextY) { doc.addPage(); pageNum++; y = MT; drawFooter(pageNum); }
                        doc.addImage(b.dataUrl, 'JPEG', ML, y, imgW, imgH);
                        y += imgH + 5;
                    } catch(e) { console.warn('Bild konnte nicht eingefuegt werden:', e); }
                });

                // Grussformel
                y += 5;
                if (y > maxTextY - 25) { doc.addPage(); pageNum++; y = MT; drawFooter(pageNum); }
                doc.setFont('helvetica','normal');doc.setFontSize(10.5);doc.setTextColor(34,34,34);
                var grussLines = doc.splitTextToSize(grussformel, CW);
                grussLines.forEach(function(line) { doc.text(line, ML, y); y += 5; });
                y += 15;
                doc.text('Thomas Willwacher', ML, y); y += 5;
                doc.text('Fliesenlegermeister e.K.', ML, y);

                // PDF oeffnen — BLOCK B / FIX B1: revoke nach 60s
                var pdfBlob = doc.output('blob');
                var pdfUrl = URL.createObjectURL(pdfBlob);
                window.open(pdfUrl, '_blank');
                setTimeout(function(){ try{ URL.revokeObjectURL(pdfUrl); }catch(e){} }, 60000);
                return pdfBlob;
            };

            // -- Drucken = PDF erzeugen --
            var handleDrucken = function() { generatePDF(); };

            // -- Gmail-API Versand (mit HTML-Mail fuer bessere Darstellung) --
            // ── Helper: PDF speichern (Etappe C, 25.04.2026) ──
            // Nutzt zuerst TWStorageAPI (mit Queue/Retry/Audit), fallback
            // auf direkten Drive-Upload. Damit die MemoryBadge ueber alle
            // Schriftverkehrs-PDFs Bescheid weiss.
            var _uploadPdfViaApi = async function(svc, kundeId, ordnerName, fileName, pdfBlob) {
                if (window.TWStorageAPI && window.TWStorageAPI.saveDocument) {
                    try {
                        await window.TWStorageAPI.saveDocument(
                            kundeId, ordnerName, fileName, 'application/pdf',
                            pdfBlob, { docType: 'schriftverkehr' }
                        );
                        return { ok: true, via: 'api' };
                    } catch(e) {
                        console.warn('[tw-schriftverkehr] TWStorageAPI fehlgeschlagen, Fallback Drive:', e);
                    }
                }
                // Fallback: direkter Drive-Upload mit dem alten Pfad
                if (svc && svc.accessToken && kundeId) {
                    try {
                        var sOId = await svc.findOrCreateFolder(kundeId,
                            (window.DRIVE_ORDNER && window.DRIVE_ORDNER.schriftverkehr) || 'Schriftverkehr-Mail-Protokolle-Bauzeitenplan'
                        );
                        var subF = ordnerName.indexOf('/') >= 0 ? ordnerName.split('/')[1] : ordnerName;
                        var uOId = await svc.findOrCreateFolder(sOId, subF);
                        await svc.uploadFile(uOId, fileName, 'application/pdf', pdfBlob);
                        return { ok: true, via: 'drive-direct' };
                    } catch(e) {
                        console.error('[tw-schriftverkehr] Drive-Upload fehlgeschlagen:', e);
                        return { ok: false, error: e.message || String(e) };
                    }
                }
                return { ok: false, error: 'Drive nicht verbunden' };
            };

            var handleSenden = async function() {
                if (!empfEmail && !mailAdresse) { alert('Bitte eine E-Mail-Adresse eingeben!'); return; }
                var zielEmail = mailAdresse || empfEmail;
                setSendStatus('sending');
                try {
                    var service = window.GoogleDriveService;
                    if (!service || !service.accessToken) { if(service){await service.init(); await service.requestAuth();} }
                    var vollBetreff = betreff || ('Schreiben -- ' + bauvorhaben);
                    var htmlMail = '<html><body style="font-family:Segoe UI,Arial,sans-serif;font-size:10.5pt;color:#222;line-height:1.6;"><p>' + anrede + '</p><p>' + textBody.replace(/\n/g, '<br>') + '</p><p>' + grussformel + '</p><p><strong>Thomas Willwacher</strong><br>Fliesenlegermeister e.K.<br>Flurweg 14a \u00b7 56472 Nisterau<br>Tel. 02661-63101 \u00b7 Mobil 0170-2024161</p></body></html>';
                    var boundary = 'boundary_' + Date.now();
                    var rawParts = ['From: ' + GMAIL_CONFIG.ABSENDER_EMAIL, 'To: ' + zielEmail, 'Subject: =?UTF-8?B?' + btoa(unescape(encodeURIComponent(vollBetreff))) + '?=', 'MIME-Version: 1.0', 'Content-Type: multipart/alternative; boundary="' + boundary + '"', '', '--' + boundary, 'Content-Type: text/plain; charset=UTF-8', '', anrede + '\n\n' + textBody + '\n\n' + grussformel + '\n\nThomas Willwacher\nFliesenlegermeister e.K.', '', '--' + boundary, 'Content-Type: text/html; charset=UTF-8', '', htmlMail, '', '--' + boundary + '--'];
                    var encoded = btoa(unescape(encodeURIComponent(rawParts.join('\r\n')))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    var resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { 'Authorization': 'Bearer ' + service.accessToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: encoded }) });
                    if (resp.ok) { setSendStatus('sent'); try { if (service.isConnected() && kunde && kunde._driveFolderId) { var dF = new Date().toISOString().slice(0,10).replace(/-/g,''); var bK = (betreff||'Schreiben').substring(0,25).replace(/[^a-zA-Z0-9\- ]/g,'').replace(/ /g,'_'); var pdfBlob = generatePDF(); var subOrdner = versandKanal === 'mail' ? 'Mail' : 'Briefe'; var fileName = (versandKanal==='mail'?'Mail':'Brief')+'_'+dF+'_'+bK+'.pdf'; await _uploadPdfViaApi(service, kunde._driveFolderId, subOrdner, fileName, pdfBlob); } } catch(aE){console.warn('Archivierung:',aE);} }
                    else { window.location.href = 'mailto:' + encodeURIComponent(zielEmail) + '?subject=' + encodeURIComponent(vollBetreff) + '&body=' + encodeURIComponent(anrede+'\n\n'+textBody+'\n\n'+grussformel); setSendStatus('sent'); }
                } catch(err) { console.error('Sende-Fehler:', err); window.location.href = 'mailto:' + encodeURIComponent(mailAdresse||empfEmail) + '?subject=' + encodeURIComponent(betreff||'Schreiben') + '&body=' + encodeURIComponent(anrede+'\n\n'+textBody+'\n\n'+grussformel); setSendStatus('sent'); }
                setTimeout(function() { setSendStatus(null); }, 4000);
            };

            var handleDriveSpeichern = async function() {
                try { var service = window.GoogleDriveService; if (service && service.isConnected() && kunde && kunde._driveFolderId) { var dF = new Date().toISOString().slice(0,10).replace(/-/g,''); var bK = (betreff||'Schreiben').substring(0,25).replace(/[^a-zA-Z0-9\- ]/g,'').replace(/ /g,'_'); var fN = (versandKanal==='mail'?'Mail':'Brief')+'_'+dF+'_'+bK+'.pdf'; var pdfBlob = generatePDF(); var subOrdner = versandKanal === 'mail' ? 'Mail' : 'Briefe'; var result = await _uploadPdfViaApi(service, kunde._driveFolderId, subOrdner, fN, pdfBlob); if (result.ok) { alert('\u2705 PDF gespeichert in Schriftverkehr/' + subOrdner + '/' + (result.via === 'api' ? ' (mit Sync-Queue)' : '')); } else { alert('\u26A0\uFE0F Speichern fehlgeschlagen: ' + (result.error||'unbekannt')); } } else {
                    // BLOCK B / FIX B1 — Fallback-Download: Blob-URL nach Click sofort freigeben
                    var pdfBlob2 = generatePDF();
                    var dlUrl = URL.createObjectURL(pdfBlob2);
                    var a = document.createElement('a');
                    a.href = dlUrl;
                    a.download = (versandKanal==='mail'?'Mail':'Brief') + '_' + new Date().toISOString().slice(0,10) + '.pdf';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(function(){ try{ URL.revokeObjectURL(dlUrl); }catch(e){} }, 5000);
                } } catch(err) { console.error('Speichern-Fehler:', err); alert('Fehler: ' + err.message); }
            };

            var openMailDialog = function() { setMailAdresse(kunde?(kunde.ag_email||kunde.bl_email||''):''); setShowMailDialog(true); };
            var confirmAndSend = function() { setShowMailDialog(false); setTimeout(handleSenden, 100); };

            var pdfInput = {padding:'4px 6px',borderRadius:'4px',border:'1px solid #ccc',background:'#fafafa',fontSize:'10px',color:'#222',boxSizing:'border-box',width:'100%',fontFamily:'"Source Sans 3",sans-serif'};
            var popBtn = {width:'100%',padding:'16px',borderRadius:'var(--radius-lg)',border:'1px solid transparent',cursor:'pointer',background:BLAU,color:'#fff',display:'flex',alignItems:'center',gap:'14px',textAlign:'left',boxShadow:BLAU_SHADOW,touchAction:'manipulation'};
            var popLbl = {fontSize:'15px',fontWeight:600,fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'0.5px'};
            var popSub = {fontSize:'11px',opacity:0.85,marginTop:'2px',fontFamily:'Source Sans 3, sans-serif'};
            var icoS = {width:'24px',height:'24px',flexShrink:0};

            // ===== PHASE 1: KANALWAHL =====
            if (phase === 'kanalwahl') {
                return (<div className="page-container" style={{padding:'20px 16px',minHeight:'100vh'}}><div style={{textAlign:'center',marginBottom:'24px'}}><FirmenLogo size="small" /><div style={{marginTop:'12px',fontSize:'17px',fontWeight:700,color:'var(--accent-blue)',fontFamily:'Oswald, sans-serif',letterSpacing:'0.5px'}}>Schriftverkehr</div><div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'4px'}}>{kunde?kunde.name:''}</div><div style={{fontSize:'11px',color:'var(--text-muted)',letterSpacing:'1.5px',textTransform:'uppercase',marginTop:'8px',fontFamily:'Oswald, sans-serif',fontWeight:'500'}}>Kanal waehlen</div></div>
                <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                    <button onClick={function(){setVersandKanal('mail');setPhase('startseite');}} style={{width:'100%',padding:'18px 16px',borderRadius:'var(--radius-lg)',border:'1px solid transparent',cursor:'pointer',background:BLAU,color:'#fff',display:'flex',alignItems:'center',gap:'14px',textAlign:'left',boxShadow:BLAU_SHADOW,transition:'all 0.25s ease',touchAction:'manipulation'}}><svg viewBox="0 0 32 32" fill="none" style={{width:'28px',height:'28px',flexShrink:0}}><rect x="2" y="7" width="28" height="18" rx="3" stroke="white" strokeWidth="2"/><path d="M2 10l14 9 14-9" stroke="white" strokeWidth="2"/></svg><div style={{flex:1}}><div style={{fontSize:'16px',fontWeight:600,marginBottom:'3px',fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'0.5px'}}>E-Mail</div><div style={{fontSize:'12px',opacity:0.85,lineHeight:'1.4',fontFamily:'Source Sans 3, sans-serif'}}>Professionelle E-Mail mit Anhaengen versenden</div></div><span style={{fontSize:'20px',opacity:0.7}}>{'\u2192'}</span></button>
                    <button onClick={function(){setVersandKanal('post');setPhase('startseite');}} style={{width:'100%',padding:'18px 16px',borderRadius:'var(--radius-lg)',border:'1px solid transparent',cursor:'pointer',background:BLAU,color:'#fff',display:'flex',alignItems:'center',gap:'14px',textAlign:'left',boxShadow:BLAU_SHADOW,transition:'all 0.25s ease',touchAction:'manipulation'}}><svg viewBox="0 0 32 32" fill="none" style={{width:'28px',height:'28px',flexShrink:0}}><rect x="4" y="3" width="24" height="26" rx="2" stroke="white" strokeWidth="2"/><line x1="9" y1="10" x2="23" y2="10" stroke="white" strokeWidth="1.5"/><line x1="9" y1="14" x2="23" y2="14" stroke="white" strokeWidth="1.5"/><line x1="9" y1="18" x2="19" y2="18" stroke="white" strokeWidth="1.5"/><line x1="9" y1="22" x2="16" y2="22" stroke="white" strokeWidth="1.5"/></svg><div style={{flex:1}}><div style={{fontSize:'16px',fontWeight:600,marginBottom:'3px',fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'0.5px'}}>Brief / Post</div><div style={{fontSize:'12px',opacity:0.85,lineHeight:'1.4',fontFamily:'Source Sans 3, sans-serif'}}>DIN-5008-konformer Geschaeftsbrief erstellen</div></div><span style={{fontSize:'20px',opacity:0.7}}>{'\u2192'}</span></button>
                </div>
                <button onClick={onBack} style={{width:'100%',marginTop:'16px',padding:'14px 32px',borderRadius:'var(--radius-md)',border:'none',background:ROT,color:'#fff',cursor:'pointer',fontSize:'14px',fontWeight:'600',fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'1px',boxShadow:ROT_SHADOW,touchAction:'manipulation'}}>{'\u2190'} Zurueck zur Modulwahl</button></div>);
            }

            // ===== PHASE 2: PDF-NAHE STARTSEITE =====
            if (phase === 'startseite') {
                var kanalLabel = versandKanal === 'mail' ? 'E-Mail' : 'Geschaeftsbrief';
                var adressZeilen = [];
                if (empfAdresse) { var mA = empfAdresse.match(/^(.*?)[\s,]+(\d{5}\s+.*)$/); if(mA){adressZeilen.push(mA[1].trim());adressZeilen.push(mA[2].trim());}else{empfAdresse.split(',').forEach(function(s){if(s.trim())adressZeilen.push(s.trim());});} }

                return (<div className="page-container" style={{padding:'0',minHeight:'100vh',paddingBottom:'80px'}}>
                <div style={{margin:'8px',background:'#fff',borderRadius:'12px',padding:'22px 20px 16px',color:'#222',boxShadow:'0 4px 24px rgba(0,0,0,0.35)',minHeight:'85vh'}}>
                    {/* BRIEFKOPF: Logo links + Adresse rechts - identisch Rechnungsmodul */}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'3mm'}}>
                        <div style={{display:'inline-flex',flexDirection:'column',alignItems:'flex-start'}}>
                            <div style={{fontFamily:'"Source Sans 3",sans-serif',fontStyle:'normal',fontWeight:700,color:'#c41e1e',fontSize:'14.5px',letterSpacing:'3px',marginBottom:'-18px',paddingLeft:'1px',position:'relative',zIndex:2}}>Thomas</div>
                            <div style={{display:'flex',alignItems:'baseline',fontFamily:'Oswald,sans-serif',fontWeight:700,color:'#111',lineHeight:1,WebkitTextStroke:'0.4px #111'}}>
                                <span style={{fontSize:'73px'}}>w</span>
                                <span style={{position:'relative',fontSize:'73px',display:'inline-block'}}><span style={{fontSize:'73px',color:'#111'}}>{'\u0131'}</span><span style={{position:'absolute',top:'10px',left:'50%',transform:'translateX(-50%)',width:'11px',height:'11px',background:'#c41e1e'}}></span></span>
                                <span style={{fontSize:'95px',letterSpacing:'1px',lineHeight:0.75}}>LL</span>
                                <span style={{fontSize:'73px'}}>wacher</span>
                            </div>
                            <div style={{display:'flex',justifyContent:'flex-end',width:'100%',marginTop:'2px'}}><span style={{fontFamily:'"Source Sans 3",sans-serif',fontWeight:600,color:'#c41e1e',fontSize:'14.5px',letterSpacing:'2.5px'}}>Fliesenlegermeister e.K.</span></div>
                        </div>
                        <div style={{textAlign:'right',fontSize:'8pt',color:'#555',lineHeight:1.5,paddingTop:'5mm'}}>Flurweg 14a<br/>56472 Nisterau<br/>Tel. 02661-63101<br/>Mobil 0170-2024161</div>
                    </div>
                    <hr style={{border:'none',borderTop:'2.5px solid #c41e1e',margin:'3mm 0 2mm'}} />
                    <div style={{fontSize:'7pt',color:'#aaa',borderBottom:'0.5px solid #ccc',display:'inline-block',paddingBottom:'1px',marginBottom:'5mm'}}>Thomas Willwacher Fliesenlegermeister e.K. {'\u00B7'} Flurweg 14a {'\u00B7'} 56472 Nisterau</div>

                    {/* EMPFAENGER links + NUR DATUM rechts */}
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6mm'}}>
                        <div>
                            {editMode?<input value={empfaenger} onChange={function(e){setEmpfaenger(e.target.value);}} style={Object.assign({},pdfInput,{fontWeight:700,fontSize:'11pt'})} />:<div style={{fontWeight:700,fontSize:'11pt'}}>{empfaenger}</div>}
                            {editMode?<input value={empfAdresse} onChange={function(e){setEmpfAdresse(e.target.value);}} style={Object.assign({},pdfInput,{marginTop:'4px'})} />:<div style={{fontSize:'10pt',color:'#333',lineHeight:1.5}}>{adressZeilen.map(function(z,i){return <div key={i}>{z}</div>;})}</div>}
                            {versandKanal==='mail'&&editMode&&<input value={empfEmail} onChange={function(e){setEmpfEmail(e.target.value);}} placeholder="empfaenger@firma.de" style={Object.assign({},pdfInput,{marginTop:'4px',color:'#1E88E5'})} />}
                            {versandKanal==='mail'&&!editMode&&empfEmail&&<div style={{fontSize:'9pt',color:'#1E88E5',marginTop:'2px'}}>{empfEmail}</div>}
                            {versandKanal==='mail'&&editMode&&kunde&&(kunde.ag_email||kunde.bl_email||kunde.arch_email)&&(<div style={{display:'flex',gap:'4px',marginTop:'4px',flexWrap:'wrap'}}>{kunde.ag_email&&<button onClick={function(){setEmpfEmail(kunde.ag_email);}} style={{padding:'3px 7px',fontSize:'9px',background:'rgba(30,136,229,0.1)',color:'#1E88E5',border:'1px solid rgba(30,136,229,0.2)',borderRadius:'5px',cursor:'pointer'}}>AG: {kunde.ag_email}</button>}{kunde.bl_email&&<button onClick={function(){setEmpfEmail(kunde.bl_email);}} style={{padding:'3px 7px',fontSize:'9px',background:'rgba(30,136,229,0.1)',color:'#1E88E5',border:'1px solid rgba(30,136,229,0.2)',borderRadius:'5px',cursor:'pointer'}}>BL: {kunde.bl_email}</button>}{kunde.arch_email&&<button onClick={function(){setEmpfEmail(kunde.arch_email);}} style={{padding:'3px 7px',fontSize:'9px',background:'rgba(30,136,229,0.1)',color:'#1E88E5',border:'1px solid rgba(30,136,229,0.2)',borderRadius:'5px',cursor:'pointer'}}>Arch: {kunde.arch_email}</button>}</div>)}
                        </div>
                        <div style={{textAlign:'right'}}><div style={{fontSize:'7.5pt',color:'#999'}}>Datum</div>{editMode?<input type="text" value={briefDatum} onChange={function(e){setBriefDatum(e.target.value);}} style={Object.assign({},pdfInput,{fontWeight:600,textAlign:'right'})} />:<div style={{fontSize:'10.5pt',fontWeight:600}}>Nisterau, {new Date(briefDatum).toLocaleDateString('de-DE')}</div>}</div>
                    </div>

                    {/* 5cm Abstand - wie im Rechnungsmodul (y+=20 nach Adresse) */}
                    <div style={{height:'20mm'}}></div>

                    {/* BETREFF */}
                    {editMode?<input value={betreff} onChange={function(e){setBetreff(e.target.value);}} placeholder="Betreff" style={Object.assign({},pdfInput,{fontWeight:700,fontSize:'13pt',marginBottom:'4mm'})} />:(betreff&&<div style={{fontSize:'13pt',fontWeight:700,marginBottom:'4mm'}}>{betreff}</div>)}

                    {/* Bauvorhaben + Unser Zeichen LINKS */}
                    <div style={{fontSize:'9pt',color:'#555',marginBottom:'6mm'}}>
                        <div><span style={{display:'inline-block',width:'38mm',color:'#888'}}>Bauvorhaben:</span> {editMode?<input value={bauvorhaben} onChange={function(e){setBauvorhaben(e.target.value);}} style={Object.assign({},pdfInput,{width:'60%',fontWeight:600})} />:<span style={{fontWeight:600,color:'#222'}}>{bauvorhaben}</span>}</div>
                        <div><span style={{display:'inline-block',width:'38mm',color:'#888'}}>Unser Zeichen:</span> {editMode?<input value={unserZeichen} onChange={function(e){setUnserZeichen(e.target.value);}} style={Object.assign({},pdfInput,{width:'40%',fontWeight:600})} />:<span style={{fontWeight:600,color:'#222'}}>{unserZeichen}</span>}</div>
                    </div>

                    {/* Vorlagen (nur Edit-Modus) */}
                    {editMode&&(<div style={{marginBottom:'6mm'}}><select value={vorlage} onChange={function(e){applyVorlage(e.target.value);}} style={{width:'100%',padding:'6px 8px',borderRadius:'6px',border:'1px solid #ccc',background:'#f5f5f5',fontSize:'10px',color:'#222'}}><option value="">-- Freitext (keine Vorlage) --</option>{vorlagen.map(function(v){return <option key={v.id} value={v.id}>{v.name}</option>;})}</select></div>)}

                    {/* ANREDE + TEXT */}
                    {editMode?(<div style={{marginBottom:'4mm'}}><input value={anrede} onChange={function(e){setAnrede(e.target.value);}} style={Object.assign({},pdfInput,{marginBottom:'4px'})} /><textarea value={textBody} onChange={function(e){setTextBody(e.target.value);}} rows={10} placeholder="Brieftext hier eingeben..." style={{width:'100%',padding:'8px',borderRadius:'4px',border:'1px solid #ccc',background:'#fafafa',fontSize:'10.5pt',color:'#222',lineHeight:1.7,resize:'vertical',boxSizing:'border-box',fontFamily:'"Source Sans 3",sans-serif',minHeight:'180px'}} /></div>):(<div style={{fontSize:'10.5pt',lineHeight:1.7,whiteSpace:'pre-wrap',marginBottom:'6mm',color:'#333',minHeight:'120px'}}>{anrede&&<div>{anrede}</div>}{textBody?<div style={{marginTop:'8px'}}>{textBody}</div>:<div style={{color:'#bbb',fontStyle:'italic',marginTop:'8px'}}>Text wird hier angezeigt...</div>}</div>)}

                    {/* Bilder (Edit-Modus) */}
                    {editMode&&bilder.length>0&&(<div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'8px'}}>{bilder.map(function(b,idx){return(<div key={idx} style={{position:'relative',width:'80px',height:'80px',borderRadius:'8px',overflow:'hidden',border:'1px solid #ccc'}}><img src={b.dataUrl} alt={b.name} style={{width:'100%',height:'100%',objectFit:'cover'}} /><button onClick={function(){removeBild(idx);}} style={{position:'absolute',top:'2px',right:'2px',background:'rgba(196,30,30,0.9)',color:'white',border:'none',borderRadius:'50%',width:'20px',height:'20px',fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{'\u2715'}</button></div>);})}</div>)}
                    {editMode&&(<div style={{display:'flex',gap:'6px',marginBottom:'8px'}}><button onClick={function(){kameraInputRef.current&&kameraInputRef.current.click();}} style={{flex:1,padding:'8px',background:'rgba(30,136,229,0.08)',color:'#1E88E5',border:'1px solid rgba(30,136,229,0.2)',borderRadius:'8px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>Foto</button><input ref={kameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleBild} style={{display:'none'}} /><button onClick={function(){bildInputRef.current&&bildInputRef.current.click();}} style={{flex:1,padding:'8px',background:'rgba(30,136,229,0.08)',color:'#1E88E5',border:'1px solid rgba(30,136,229,0.2)',borderRadius:'8px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>Galerie/Dateien</button><input ref={bildInputRef} type="file" accept="image/*" onChange={handleBild} style={{display:'none'}} /></div>)}

                    {/* Grussformel */}
                    {editMode?<input value={grussformel} onChange={function(e){setGrussformel(e.target.value);}} style={Object.assign({},pdfInput,{marginTop:'8mm'})} />:<div style={{fontSize:'10.5pt',color:'#333',marginTop:'8mm'}}>{grussformel}<br/><br/><br/>Thomas Willwacher<br/>Fliesenlegermeister e.K.</div>}

                    {/* FUSSZEILE */}
                    <div style={{borderTop:'1.5px solid #c41e1e',paddingTop:'8px',fontSize:'7.5pt',color:'#c41e1e',fontWeight:600,marginTop:'30px'}}>Thomas Willwacher Fliesenlegermeister e.K.</div>
                </div>

                {/* Versand-Status */}
                {sendStatus==='sending'&&(<div style={{position:'fixed',top:'60px',left:'50%',transform:'translateX(-50%)',padding:'12px 24px',background:BLAU,color:'white',borderRadius:'12px',fontSize:'13px',fontWeight:'700',zIndex:200,boxShadow:'0 4px 16px rgba(0,0,0,0.3)'}}>Wird gesendet...</div>)}
                {sendStatus==='sent'&&(<div style={{position:'fixed',top:'60px',left:'50%',transform:'translateX(-50%)',padding:'12px 24px',background:'linear-gradient(135deg,#27ae60,#1e8449)',color:'white',borderRadius:'12px',fontSize:'13px',fontWeight:'700',zIndex:200,boxShadow:'0 4px 16px rgba(0,0,0,0.3)'}}>Erfolgreich gesendet!</div>)}

                {/* Bottom-Bar */}
                <div style={{position:'fixed',bottom:0,left:0,right:0,padding:'10px 16px',background:'var(--bg-primary)',borderTop:'1px solid var(--border-color)',zIndex:100,display:'flex',gap:'8px'}}>
                    <button onClick={function(){if(editMode){setEditMode(false);}else{setPhase('kanalwahl');}}} style={{padding:'12px 32px',borderRadius:'var(--radius-md)',border:'none',background:ROT,color:'#fff',cursor:'pointer',fontSize:'14px',fontWeight:'600',fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'1px',boxShadow:ROT_SHADOW,touchAction:'manipulation'}}>{'\u2190'} Zurueck</button>
                    <button onClick={function(){setShowBearbeitenPopup(true);}} style={{flex:2,padding:'12px',background:BLAU,color:'white',border:'none',borderRadius:'var(--radius-md)',fontSize:'16px',fontWeight:700,cursor:'pointer',fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'1.5px',boxShadow:BLAU_SHADOW,touchAction:'manipulation'}}>Bearbeiten {'\u2192'}</button>
                </div>

                {/* BEARBEITEN-POPUP */}
                {showBearbeitenPopup&&(<div className="modal-overlay" onClick={function(){setShowBearbeitenPopup(false);}}><div className="modal" onClick={function(e){e.stopPropagation();}} style={{maxWidth:'440px',padding:'24px'}}>
                    <div style={{textAlign:'center',marginBottom:'20px'}}><div style={{fontSize:'18px',fontWeight:700,fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'1px',color:'var(--text-white)'}}>Dokument bearbeiten</div><div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'4px'}}>{kunde?kunde.name:''} {'\u2014'} {kanalLabel}</div></div>
                    <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                        <button onClick={function(){setEditMode(true);setShowBearbeitenPopup(false);}} style={popBtn}><svg viewBox="0 0 28 28" fill="none" style={icoS}><path d="M20 4l4 4-14 14H6v-4L20 4z" stroke="white" strokeWidth="2" strokeLinejoin="round"/><line x1="16" y1="8" x2="20" y2="12" stroke="white" strokeWidth="1.5"/></svg><div style={{flex:1}}><div style={popLbl}>Dokument bearbeiten</div><div style={popSub}>Text, Empfaenger und Anhaenge bearbeiten</div></div></button>
                        <button onClick={function(){handleDrucken();setShowBearbeitenPopup(false);}} style={popBtn}><svg viewBox="0 0 28 28" fill="none" style={icoS}><rect x="4" y="4" width="20" height="20" rx="2" stroke="white" strokeWidth="2"/><line x1="8" y1="10" x2="20" y2="10" stroke="white" strokeWidth="1.5"/><line x1="8" y1="14" x2="20" y2="14" stroke="white" strokeWidth="1.5"/><line x1="8" y1="18" x2="16" y2="18" stroke="white" strokeWidth="1.5"/></svg><div style={{flex:1}}><div style={popLbl}>Ausdrucken</div><div style={popSub}>Dokument als Briefkopf-PDF drucken</div></div></button>
                        <button onClick={function(){handleDrucken();handleDriveSpeichern();setShowBearbeitenPopup(false);}} style={popBtn}><svg viewBox="0 0 28 28" fill="none" style={icoS}><rect x="4" y="4" width="20" height="20" rx="2" stroke="white" strokeWidth="2"/><path d="M10 14l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg><div style={{flex:1}}><div style={popLbl}>Ausdrucken + PDF speichern</div><div style={popSub}>Drucken und in Google Drive ablegen</div></div></button>
                        <button onClick={function(){setShowBearbeitenPopup(false);openMailDialog();}} style={popBtn}><svg viewBox="0 0 28 28" fill="none" style={icoS}><rect x="2" y="6" width="24" height="16" rx="2" stroke="white" strokeWidth="2"/><path d="M2 8l12 8 12-8" stroke="white" strokeWidth="2"/></svg><div style={{flex:1}}><div style={popLbl}>Als Mail versenden</div><div style={popSub}>E-Mail-Adresse waehlen und senden</div></div></button>
                        <button onClick={function(){handleDriveSpeichern();setShowBearbeitenPopup(false);}} style={popBtn}><svg viewBox="0 0 28 28" fill="none" style={icoS}><path d="M4 18l8-14h8l8 14" stroke="white" strokeWidth="2" strokeLinejoin="round"/><path d="M4 18l4 7h12l4-7" stroke="white" strokeWidth="2" strokeLinejoin="round"/><line x1="12" y1="18" x2="20" y2="18" stroke="white" strokeWidth="2"/></svg><div style={{flex:1}}><div style={popLbl}>In Google Drive speichern</div><div style={popSub}>Im Kundenordner/Schriftverkehr ablegen</div></div></button>
                        <button onClick={function(){setShowBearbeitenPopup(false);alert('Bearbeitungsstand wird gespeichert...');}} style={popBtn}><svg viewBox="0 0 28 28" fill="none" style={icoS}><rect x="4" y="4" width="20" height="20" rx="2" stroke="white" strokeWidth="2"/><rect x="8" y="4" width="12" height="8" rx="1" stroke="white" strokeWidth="1.5"/><rect x="8" y="18" width="12" height="6" rx="1" stroke="white" strokeWidth="1.5"/></svg><div style={{flex:1}}><div style={popLbl}>Speichern</div><div style={popSub}>Bearbeitungsstand lokal sichern</div></div></button>
                        <button onClick={function(){setShowBearbeitenPopup(false);alert('Gespeicherte Dokumente werden geladen...');}} style={popBtn}><svg viewBox="0 0 28 28" fill="none" style={icoS}><path d="M4 8V6a2 2 0 012-2h5l2 3h9a2 2 0 012 2v1" stroke="white" strokeWidth="2"/><path d="M2 12a2 2 0 012-2h20a2 2 0 012 2l-2 12a2 2 0 01-2 2H6a2 2 0 01-2-2L2 12z" stroke="white" strokeWidth="2"/></svg><div style={{flex:1}}><div style={popLbl}>Gespeicherte Dokumente</div><div style={popSub}>Angefangene Schreiben weiterbearbeiten</div></div></button>
                    </div>
                    <button onClick={function(){setShowBearbeitenPopup(false);}} style={{width:'100%',marginTop:'12px',padding:'14px 32px',borderRadius:'var(--radius-md)',border:'none',background:ROT,color:'#fff',cursor:'pointer',fontSize:'14px',fontWeight:'600',fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'1px',boxShadow:ROT_SHADOW,touchAction:'manipulation'}}>Abbrechen</button>
                </div></div>)}

                {/* MAIL-DIALOG */}
                {showMailDialog&&(<div className="modal-overlay" onClick={function(){setShowMailDialog(false);}}><div className="modal" onClick={function(e){e.stopPropagation();}} style={{maxWidth:'400px',padding:'24px'}}><div className="modal-title">E-Mail versenden</div><div style={{marginBottom:'12px'}}><label style={{fontSize:'11px',color:'var(--text-muted)',display:'block',marginBottom:'4px'}}>Empfaenger E-Mail</label><input value={mailAdresse} onChange={function(e){setMailAdresse(e.target.value);}} placeholder="empfaenger@firma.de" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid var(--border-color)',background:'var(--bg-tertiary)',fontSize:'14px',color:'var(--text-primary)',boxSizing:'border-box'}} />{kunde&&(kunde.ag_email||kunde.bl_email||kunde.arch_email)&&(<div style={{display:'flex',gap:'4px',marginTop:'6px',flexWrap:'wrap'}}>{kunde.ag_email&&<button onClick={function(){setMailAdresse(kunde.ag_email);}} style={{padding:'4px 8px',fontSize:'10px',background:'rgba(30,136,229,0.1)',color:'#1E88E5',border:'1px solid rgba(30,136,229,0.2)',borderRadius:'6px',cursor:'pointer'}}>AG: {kunde.ag_email}</button>}{kunde.bl_email&&<button onClick={function(){setMailAdresse(kunde.bl_email);}} style={{padding:'4px 8px',fontSize:'10px',background:'rgba(30,136,229,0.1)',color:'#1E88E5',border:'1px solid rgba(30,136,229,0.2)',borderRadius:'6px',cursor:'pointer'}}>BL: {kunde.bl_email}</button>}{kunde.arch_email&&<button onClick={function(){setMailAdresse(kunde.arch_email);}} style={{padding:'4px 8px',fontSize:'10px',background:'rgba(30,136,229,0.1)',color:'#1E88E5',border:'1px solid rgba(30,136,229,0.2)',borderRadius:'6px',cursor:'pointer'}}>Arch: {kunde.arch_email}</button>}</div>)}</div><div style={{display:'flex',gap:'8px'}}><button onClick={function(){setShowMailDialog(false);}} style={{flex:1,padding:'12px',borderRadius:'var(--radius-md)',border:'none',background:ROT,color:'#fff',cursor:'pointer',fontSize:'13px',fontWeight:600,fontFamily:'Oswald, sans-serif',textTransform:'uppercase'}}>Abbrechen</button><button onClick={confirmAndSend} style={{flex:2,padding:'12px',borderRadius:'var(--radius-md)',border:'none',background:BLAU,color:'#fff',cursor:'pointer',fontSize:'13px',fontWeight:700,fontFamily:'Oswald, sans-serif',textTransform:'uppercase',opacity:mailAdresse?1:0.5}}>Senden</button></div></div></div>)}

                </div>);
            }

            return null;
        }
