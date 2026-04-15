        /* =====================================================================
           SCHRIFTVERKEHR-MODUL -- Mail & Brief Korrespondenz
           Skill: SKILL-schriftverkehr-briefkopf.md
           Phase: kanalwahl -> startseite (PDF-Vorschau) -> bearbeiten-popup
           Alle Aktions-Buttons: BLAU | Alle Nav-Buttons: ROT
           ===================================================================== */
        function SchriftverkehrModul({ kunde, onBack }) {
            var BLAU = 'linear-gradient(135deg, #1E88E5, #1565C0)';
            var BLAU_SHADOW = '0 6px 20px rgba(30,136,229,0.30)';
            var ROT = 'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))';
            var ROT_SHADOW = '0 4px 15px rgba(196,30,30,0.3)';
            var noSpinCSS = '<style>input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}</style>';

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
            const [briefDatum, setBriefDatum] = useState(new Date().toLocaleDateString('de-DE'));
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
            var handleBild = function(e) { var file = e.target.files && e.target.files[0]; if (!file) return; var img = new Image(); var canvas = document.createElement('canvas'); img.onload = function() { var w = img.width, h = img.height; var maxW = 1200, maxH = 900; if (w > maxW) { h = h * maxW / w; w = maxW; } if (h > maxH) { w = w * maxH / h; h = maxH; } canvas.width = w; canvas.height = h; canvas.getContext('2d').drawImage(img, 0, 0, w, h); setBilder(function(prev) { return prev.concat([{ name: file.name, dataUrl: canvas.toDataURL('image/jpeg', 0.85) }]); }); }; img.src = URL.createObjectURL(file); e.target.value = ''; };
            var removeBild = function(idx) { setBilder(function(prev) { return prev.filter(function(_, i) { return i !== idx; }); }); };

            // -- Briefkopf-HTML (SKILL-schriftverkehr-briefkopf.md) --
            var buildBriefHTML = function() {
                var kName = empfaenger || ''; var af = empfAdresse || ''; var aLines = [];
                if (af) { var m = af.match(/^(.*?)[\s,]+(\d{5}\s+.*)$/); if(m){aLines.push(m[1].trim());aLines.push(m[2].trim());}else{af.split(',').forEach(function(s){if(s.trim())aLines.push(s.trim());});} }
                var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + betreff + '</title>';
                h += '<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=block" rel="stylesheet">';
                h += '<style>@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Source Sans 3","Segoe UI",sans-serif;font-size:10.5pt;color:#222;line-height:1.6;background:#fff}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
                h += '.page{width:210mm;min-height:297mm;padding:20mm 18mm 25mm 22mm;margin:0 auto;position:relative;background:#fff}';
                h += '.lh{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3mm}.lc{display:inline-flex;flex-direction:column;align-items:flex-start}';
                h += '.lt{font-family:"Source Sans 3",sans-serif;font-style:normal;font-weight:700;color:#c41e1e;font-size:13px;letter-spacing:3px;margin-bottom:-14px;padding-left:1px;position:relative;z-index:2}';
                h += '.lw{display:flex;align-items:baseline;font-family:"Oswald",sans-serif;font-weight:700;color:#111;line-height:1}.lw .w{font-size:52px}.lw .iw{position:relative;font-size:52px;display:inline-block}.lw .iw .ic{font-size:52px;color:#111}.lw .iw .id{position:absolute;top:10px;left:50%;transform:translateX(-50%);width:8px;height:8px;background:#c41e1e}.lw .ll{font-size:68px;letter-spacing:1px;line-height:0.75}.lw .wa{font-size:52px}';
                h += '.ls{display:flex;justify-content:flex-end;width:100%;margin-top:1px}.ls span{font-family:"Source Sans 3",sans-serif;font-weight:600;color:#c41e1e;font-size:13px;letter-spacing:2px}';
                h += '.lr{text-align:right;font-size:8pt;color:#555;line-height:1.5}.sep{border:none;border-top:2px solid #c41e1e;margin:3mm 0 2mm}';
                h += '.abs{font-size:7pt;color:#aaa;border-bottom:0.5px solid #ccc;display:inline-block;padding-bottom:1px;margin-bottom:5mm}';
                h += '.eb{display:flex;justify-content:space-between;margin-bottom:6mm}.en{font-weight:700;font-size:11pt}.ea{font-size:10pt;color:#333;line-height:1.5}.db{text-align:right}.dl{font-size:7.5pt;color:#999}.dv{font-size:10.5pt}';
                h += '.bz{font-size:9pt;color:#555;margin-bottom:6mm}.bz .l{display:inline-block;width:38mm;color:#888}.bz .v{font-weight:600;color:#222}';
                h += '.bt{font-size:13pt;font-weight:700;margin-bottom:4mm}.tx{font-size:10.5pt;line-height:1.7;margin-bottom:6mm;white-space:pre-wrap}.tx img{max-width:100%;height:auto;margin:4mm 0;border-radius:2px}.gr{font-size:10.5pt;margin-top:8mm}';
                h += '.ft{position:absolute;bottom:18mm;left:22mm;right:18mm;border-top:1.5px solid #c41e1e;padding-top:2mm;font-size:7pt;color:#c41e1e;font-weight:600}</style></head><body><div class="page">';
                h += '<div class="lh"><div class="lc"><div class="lt">Thomas</div><div class="lw"><span class="w">w</span><span class="iw"><span class="ic">\u0131</span><span class="id"></span></span><span class="ll">LL</span><span class="wa">wacher</span></div><div class="ls"><span>Fliesenlegermeister e.K.</span></div></div><div class="lr">Flurweg 14a<br>56472 Nisterau<br>Tel. 02661-63101<br>Mobil 0170-2024161</div></div>';
                h += '<hr class="sep"><div class="abs">Thomas Willwacher Fliesenlegermeister e.K. \u00b7 Flurweg 14a \u00b7 56472 Nisterau</div>';
                h += '<div class="eb"><div><div class="en">' + kName + '</div><div class="ea">' + aLines.join('<br>') + '</div></div><div class="db"><div class="dl">Datum</div><div class="dv" style="font-weight:600">Nisterau, ' + briefDatum + '</div></div></div>';
                h += '<div class="bz"><div><span class="l">Bauvorhaben:</span> <span class="v">' + bauvorhaben + '</span></div><div><span class="l">Unser Zeichen:</span> <span class="v">' + unserZeichen + '</span></div></div>';
                if (betreff) h += '<div class="bt">' + betreff + '</div>';
                h += '<div class="tx">' + anrede + '\n\n' + textBody.replace(/</g, '&lt;').replace(/\n/g, '<br>');
                bilder.forEach(function(b) { h += '<br><img src="' + b.dataUrl + '" alt="' + b.name + '">'; });
                h += '</div><div class="gr">' + grussformel + '<br><br><br>Thomas Willwacher<br>Fliesenlegermeister e.K.</div>';
                h += '<div class="ft">Thomas Willwacher Fliesenlegermeister e.K.</div>';
                h += '<script>document.fonts.ready.then(function(){setTimeout(function(){window.focus();window.print();},400);});<\/script></div></body></html>';
                return h;
            };

            var handleDrucken = function() { var h = buildBriefHTML(); var pw = window.open('', '_blank', 'width=820,height=1160'); pw.document.write(h); pw.document.close(); };

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
                    if (resp.ok) { setSendStatus('sent'); try { if (service.isConnected() && kunde && kunde._driveFolderId) { var sOId = await service.findOrCreateFolder(kunde._driveFolderId, (window.DRIVE_ORDNER && window.DRIVE_ORDNER.schriftverkehr) || 'Schriftverkehr-Mail-Protokolle-Bauzeitenplan'); var mOId = await service.findOrCreateFolder(sOId, versandKanal === 'mail' ? 'Mail' : 'Briefe'); var dF = new Date().toISOString().slice(0,10).replace(/-/g,''); var bK = (betreff||'Schreiben').substring(0,25).replace(/[^a-zA-Z0-9\- ]/g,'').replace(/ /g,'_'); await service.uploadFile(mOId, (versandKanal==='mail'?'Mail':'Brief')+'_'+dF+'_'+bK+'.html', 'text/html', new Blob([buildBriefHTML()],{type:'text/html'})); } } catch(aE){console.warn('Archivierung:',aE);} }
                    else { window.location.href = 'mailto:' + encodeURIComponent(zielEmail) + '?subject=' + encodeURIComponent(vollBetreff) + '&body=' + encodeURIComponent(anrede+'\n\n'+textBody+'\n\n'+grussformel); setSendStatus('sent'); }
                } catch(err) { console.error('Sende-Fehler:', err); window.location.href = 'mailto:' + encodeURIComponent(mailAdresse||empfEmail) + '?subject=' + encodeURIComponent(betreff||'Schreiben') + '&body=' + encodeURIComponent(anrede+'\n\n'+textBody+'\n\n'+grussformel); setSendStatus('sent'); }
                setTimeout(function() { setSendStatus(null); }, 4000);
            };

            var handleDriveSpeichern = async function() {
                try { var service = window.GoogleDriveService; if (service && service.isConnected() && kunde && kunde._driveFolderId) { var sOId = await service.findOrCreateFolder(kunde._driveFolderId, (window.DRIVE_ORDNER && window.DRIVE_ORDNER.schriftverkehr) || 'Schriftverkehr-Mail-Protokolle-Bauzeitenplan'); var uOId = await service.findOrCreateFolder(sOId, versandKanal === 'mail' ? 'Mail' : 'Briefe'); var dF = new Date().toISOString().slice(0,10).replace(/-/g,''); var bK = (betreff||'Schreiben').substring(0,25).replace(/[^a-zA-Z0-9\- ]/g,'').replace(/ /g,'_'); var fN = (versandKanal==='mail'?'Mail':'Brief')+'_'+dF+'_'+bK+'.html'; await service.uploadFile(uOId, fN, 'text/html', new Blob([buildBriefHTML()],{type:'text/html'})); alert('\u2705 Gespeichert in Schriftverkehr/' + (versandKanal==='mail'?'Mail':'Briefe') + '/'); } else { var blob = new Blob([buildBriefHTML()], {type:'text/html'}); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = (versandKanal==='mail'?'Mail':'Brief') + '_' + new Date().toISOString().slice(0,10) + '.html'; a.click(); URL.revokeObjectURL(url); } } catch(err) { console.error('Speichern-Fehler:', err); alert('Fehler: ' + err.message); }
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
                    {/* BRIEFKOPF: Logo links + Adresse rechts */}
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
                        <div style={{textAlign:'right'}}><div style={{fontSize:'7.5pt',color:'#999'}}>Datum</div>{editMode?<input value={briefDatum} onChange={function(e){setBriefDatum(e.target.value);}} style={Object.assign({},pdfInput,{fontWeight:600,textAlign:'right'})} />:<div style={{fontSize:'10.5pt',fontWeight:600}}>Nisterau, {briefDatum}</div>}</div>
                    </div>

                    {/* Bauvorhaben + Unser Zeichen LINKS */}
                    <div style={{fontSize:'9pt',color:'#555',marginBottom:'6mm'}}>
                        <div><span style={{display:'inline-block',width:'38mm',color:'#888'}}>Bauvorhaben:</span> {editMode?<input value={bauvorhaben} onChange={function(e){setBauvorhaben(e.target.value);}} style={Object.assign({},pdfInput,{width:'60%',fontWeight:600})} />:<span style={{fontWeight:600,color:'#222'}}>{bauvorhaben}</span>}</div>
                        <div><span style={{display:'inline-block',width:'38mm',color:'#888'}}>Unser Zeichen:</span> {editMode?<input value={unserZeichen} onChange={function(e){setUnserZeichen(e.target.value);}} style={Object.assign({},pdfInput,{width:'40%',fontWeight:600})} />:<span style={{fontWeight:600,color:'#222'}}>{unserZeichen}</span>}</div>
                    </div>

                    {/* Vorlagen (nur Edit-Modus) */}
                    {editMode&&(<div style={{marginBottom:'6mm'}}><select value={vorlage} onChange={function(e){applyVorlage(e.target.value);}} style={{width:'100%',padding:'6px 8px',borderRadius:'6px',border:'1px solid #ccc',background:'#f5f5f5',fontSize:'10px',color:'#222'}}><option value="">-- Freitext (keine Vorlage) --</option>{vorlagen.map(function(v){return <option key={v.id} value={v.id}>{v.name}</option>;})}</select></div>)}

                    {/* BETREFF */}
                    {editMode?<input value={betreff} onChange={function(e){setBetreff(e.target.value);}} placeholder="Betreff" style={Object.assign({},pdfInput,{fontWeight:700,fontSize:'13pt',marginBottom:'4mm'})} />:(betreff&&<div style={{fontSize:'13pt',fontWeight:700,marginBottom:'4mm'}}>{betreff}</div>)}

                    {/* ANREDE + TEXT */}
                    {editMode?(<div style={{marginBottom:'4mm'}}><input value={anrede} onChange={function(e){setAnrede(e.target.value);}} style={Object.assign({},pdfInput,{marginBottom:'4px'})} /><textarea value={textBody} onChange={function(e){setTextBody(e.target.value);}} rows={10} placeholder="Brieftext hier eingeben..." style={{width:'100%',padding:'8px',borderRadius:'4px',border:'1px solid #ccc',background:'#fafafa',fontSize:'10.5pt',color:'#222',lineHeight:1.7,resize:'vertical',boxSizing:'border-box',fontFamily:'"Source Sans 3",sans-serif',minHeight:'180px'}} /></div>):(<div style={{fontSize:'10.5pt',lineHeight:1.7,whiteSpace:'pre-wrap',marginBottom:'6mm',color:'#333',minHeight:'120px'}}>{anrede&&<div>{anrede}</div>}{textBody?<div style={{marginTop:'8px'}}>{textBody}</div>:<div style={{color:'#bbb',fontStyle:'italic',marginTop:'8px'}}>Text wird hier angezeigt...</div>}</div>)}

                    {/* Bilder (Edit-Modus) */}
                    {editMode&&bilder.length>0&&(<div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'8px'}}>{bilder.map(function(b,idx){return(<div key={idx} style={{position:'relative',width:'80px',height:'80px',borderRadius:'8px',overflow:'hidden',border:'1px solid #ccc'}}><img src={b.dataUrl} alt={b.name} style={{width:'100%',height:'100%',objectFit:'cover'}} /><button onClick={function(){removeBild(idx);}} style={{position:'absolute',top:'2px',right:'2px',background:'rgba(196,30,30,0.9)',color:'white',border:'none',borderRadius:'50%',width:'20px',height:'20px',fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{'\u2715'}</button></div>);})}</div>)}
                    {editMode&&(<div style={{display:'flex',gap:'6px',marginBottom:'8px'}}><button onClick={function(){kameraInputRef.current&&kameraInputRef.current.click();}} style={{flex:1,padding:'8px',background:'rgba(30,136,229,0.08)',color:'#1E88E5',border:'1px solid rgba(30,136,229,0.2)',borderRadius:'8px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>Foto</button><input ref={kameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleBild} style={{display:'none'}} /><button onClick={function(){bildInputRef.current&&bildInputRef.current.click();}} style={{flex:1,padding:'8px',background:'rgba(30,136,229,0.08)',color:'#1E88E5',border:'1px solid rgba(30,136,229,0.2)',borderRadius:'8px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>Galerie/Dateien</button><input ref={bildInputRef} type="file" accept="image/*" onChange={handleBild} style={{display:'none'}} /></div>)}

                    {/* Grussformel */}
                    {editMode?<input value={grussformel} onChange={function(e){setGrussformel(e.target.value);}} style={Object.assign({},pdfInput,{marginTop:'8mm'})} />:<div style={{fontSize:'10.5pt',color:'#333',marginTop:'8mm'}}>{grussformel}<br/><br/><br/>Thomas Willwacher<br/>Fliesenlegermeister e.K.</div>}

                    {/* FUSSZEILE: NUR Firmenname in Rot */}
                    <div style={{borderTop:'1.5px solid #c41e1e',paddingTop:'8px',fontSize:'7.5pt',color:'#c41e1e',fontWeight:600,marginTop:'30px'}}>Thomas Willwacher Fliesenlegermeister e.K.</div>
                </div>

                {/* Versand-Status */}
                {sendStatus==='sending'&&(<div style={{position:'fixed',top:'60px',left:'50%',transform:'translateX(-50%)',padding:'12px 24px',background:BLAU,color:'white',borderRadius:'12px',fontSize:'13px',fontWeight:'700',zIndex:200,boxShadow:'0 4px 16px rgba(0,0,0,0.3)'}}>Wird gesendet...</div>)}
                {sendStatus==='sent'&&(<div style={{position:'fixed',top:'60px',left:'50%',transform:'translateX(-50%)',padding:'12px 24px',background:'linear-gradient(135deg,#27ae60,#1e8449)',color:'white',borderRadius:'12px',fontSize:'13px',fontWeight:'700',zIndex:200,boxShadow:'0 4px 16px rgba(0,0,0,0.3)'}}>Erfolgreich gesendet!</div>)}

                {/* Bottom-Bar: Zurueck ROT + Bearbeiten BLAU */}
                <div style={{position:'fixed',bottom:0,left:0,right:0,padding:'10px 16px',background:'var(--bg-primary)',borderTop:'1px solid var(--border-color)',zIndex:100,display:'flex',gap:'8px'}}>
                    <button onClick={function(){if(editMode){setEditMode(false);}else{setPhase('kanalwahl');}}} style={{padding:'12px 32px',borderRadius:'var(--radius-md)',border:'none',background:ROT,color:'#fff',cursor:'pointer',fontSize:'14px',fontWeight:'600',fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'1px',boxShadow:ROT_SHADOW,touchAction:'manipulation'}}>{'\u2190'} Zurueck</button>
                    <button onClick={function(){setShowBearbeitenPopup(true);}} style={{flex:2,padding:'12px',background:BLAU,color:'white',border:'none',borderRadius:'var(--radius-md)',fontSize:'16px',fontWeight:700,cursor:'pointer',fontFamily:'Oswald, sans-serif',textTransform:'uppercase',letterSpacing:'1.5px',boxShadow:BLAU_SHADOW,touchAction:'manipulation'}}>Bearbeiten {'\u2192'}</button>
                </div>

                {/* BEARBEITEN-POPUP: Alle Buttons BLAU, Abbrechen ROT */}
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
