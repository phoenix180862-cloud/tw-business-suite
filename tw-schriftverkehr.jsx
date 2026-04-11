        function SchriftverkehrModul({ kunde, onBack }) {
            // ── Phasen: 'kanalwahl' → 'formular' ──
            const [phase, setPhase] = useState('kanalwahl');
            const [versandKanal, setVersandKanal] = useState(null); // 'mail' | 'post'

            // Formular-State
            const [empfaenger, setEmpfaenger] = useState(kunde ? (kunde.auftraggeber || kunde.name || '') : '');
            const [empfAdresse, setEmpfAdresse] = useState(kunde ? (kunde.ag_adresse || kunde.adresse || '') : '');
            const [empfEmail, setEmpfEmail] = useState(kunde ? (kunde.ag_email || '') : '');
            const [bauvorhaben, setBauvorhaben] = useState(kunde ? (kunde.adresse || kunde.baumassnahme || kunde.name || '') : '');
            const [ihrZeichen, setIhrZeichen] = useState('');
            const [unserZeichen, setUnserZeichen] = useState('TW/' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*900)+100));
            const [betreff, setBetreff] = useState('');
            const [anrede, setAnrede] = useState('Sehr geehrte Damen und Herren,');
            const [textBody, setTextBody] = useState('');
            const [grussformel, setGrussformel] = useState('Mit freundlichen Grüßen');
            const [briefDatum, setBriefDatum] = useState(new Date().toLocaleDateString('de-DE'));
            const [bilder, setBilder] = useState([]);
            const [vorlage, setVorlage] = useState('');
            const [sendStatus, setSendStatus] = useState(null); // null | 'sending' | 'sent' | 'error'
            const [showEmpfWahl, setShowEmpfWahl] = useState(false);

            // ── Vorlagen ──
            var vorlagen = [
                { id: 'aufmass', name: 'Aufmaßankündigung', betreff: 'Aufmaß-Termin -- ' + bauvorhaben,
                  text: 'bezugnehmend auf den oben genannten Bauvertrag möchte ich Ihnen mitteilen, dass ich beabsichtige, ein Aufmaß der bisher erbrachten Leistungen durchzuführen.\n\nIch bitte Sie, einen Vertreter zu diesem Termin zu entsenden, um das Aufmaß gemeinsam vorzunehmen.\n\nSollte der vorgeschlagene Termin nicht passen, bitte ich um kurzfristige Rückmeldung, damit wir einen Alternativtermin vereinbaren können.' },
                { id: 'bedenken', name: 'Bedenkenanmeldung (VOB/B §4)', betreff: 'Bedenkenanmeldung gemäß VOB/B §4 Abs. 3 -- ' + bauvorhaben,
                  text: 'hiermit melde ich gemäß VOB/B §4 Abs. 3 Bedenken an gegen:\n\n☐ die vorgesehene Art der Ausführung\n☐ die Güte der vom Auftraggeber gelieferten Stoffe oder Bauteile\n☐ die Leistung anderer Unternehmer\n\nBegründung:\n[Hier die konkreten Bedenken beschreiben]\n\nIch weise darauf hin, dass ich bei Ausführung der Arbeiten trotz der angemeldeten Bedenken keine Gewähr für die betroffenen Leistungsteile übernehmen kann, sofern die Bedenken nicht ausgeräumt werden.\n\nIch bitte um schriftliche Stellungnahme bis zum [Datum].' },
                { id: 'behinderung', name: 'Behinderungsanzeige (VOB/B §6)', betreff: 'Behinderungsanzeige gemäß VOB/B §6 Abs. 1 -- ' + bauvorhaben,
                  text: 'hiermit zeige ich Ihnen gemäß VOB/B §6 Abs. 1 an, dass ich in der Ausführung meiner vertraglichen Leistungen behindert bin.\n\nArt der Behinderung:\n[Hier die Behinderung beschreiben]\n\nBeginn der Behinderung: [Datum]\n\nIch bitte um unverzügliche Beseitigung der Behinderung. Gleichzeitig weise ich darauf hin, dass sich die Ausführungsfristen gemäß VOB/B §6 Abs. 2 um die Dauer der Behinderung verlängern.\n\nEtwaige Mehrkosten, die durch die Behinderung entstehen, werde ich gesondert geltend machen.' },
                { id: 'rechnung', name: 'Rechnung übersenden', betreff: 'Rechnung -- ' + bauvorhaben,
                  text: 'anbei übersende ich Ihnen meine Rechnung für die erbrachten Leistungen im oben genannten Bauvorhaben.\n\nIch bitte um Überweisung des Betrages innerhalb der angegebenen Zahlungsfrist auf das in der Rechnung angegebene Konto.\n\nBei Rückfragen stehe ich Ihnen gerne zur Verfügung.' },
                { id: 'nachtrag', name: 'Nachtragsangebot (VOB/B §2)', betreff: 'Nachtragsangebot -- ' + bauvorhaben,
                  text: 'bei der Ausführung der Arbeiten im oben genannten Bauvorhaben haben sich zusätzliche/geänderte Leistungen ergeben, die nicht im ursprünglichen Leistungsverzeichnis enthalten sind.\n\nGemäß VOB/B §2 Abs. 5/6 unterbreite ich Ihnen hiermit folgendes Nachtragsangebot:\n\n[Beschreibung der Zusatzleistungen]\n\nIch bitte um schriftliche Beauftragung vor Ausführung der Arbeiten.' },
                { id: 'maengelruege', name: 'Mängelrüge', betreff: 'Mängelrüge -- ' + bauvorhaben,
                  text: 'bei der Ausführung meiner Arbeiten habe ich festgestellt, dass die Vorleistungen Mängel aufweisen, die eine ordnungsgemäße Ausführung meiner Arbeiten beeinträchtigen.\n\nFestgestellte Mängel:\n[Hier die Mängel beschreiben]\n\nIch fordere Sie auf, die genannten Mängel bis zum [Datum] zu beseitigen. Bis zur Beseitigung der Mängel sehe ich mich nicht in der Lage, meine Arbeiten fortzuführen.' },
                { id: 'abnahme', name: 'Abnahme anfordern (VOB/B §12)', betreff: 'Fertigstellungsanzeige und Abnahmeverlangen -- ' + bauvorhaben,
                  text: 'hiermit zeige ich Ihnen an, dass ich meine vertraglichen Leistungen im oben genannten Bauvorhaben fertiggestellt habe.\n\nGemäß VOB/B §12 Abs. 1 fordere ich Sie auf, innerhalb von 12 Werktagen nach Zugang dieses Schreibens die Abnahme durchzuführen.\n\nIch schlage folgenden Termin für die Abnahme vor: [Datum]\n\nSollte dieser Termin nicht passen, bitte ich um zeitnahe Mitteilung eines Alternativtermins.' },
            ];

            var applyVorlage = function(id) {
                setVorlage(id);
                if (!id) return;
                var v = vorlagen.find(function(t) { return t.id === id; });
                if (v) {
                    setBetreff(v.betreff);
                    setTextBody(v.text);
                }
            };

            // ── Bild-Handling ──
            var bildInputRef = React.useRef(null);
            var kameraInputRef = React.useRef(null);

            var handleBild = function(e) {
                var file = e.target.files && e.target.files[0];
                if (!file) return;
                // Komprimieren
                var img = new Image();
                var canvas = document.createElement('canvas');
                img.onload = function() {
                    var w = img.width, h = img.height;
                    var maxW = 1200, maxH = 900;
                    if (w > maxW) { h = h * maxW / w; w = maxW; }
                    if (h > maxH) { w = w * maxH / h; h = maxH; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    setBilder(function(prev) { return prev.concat([{ name: file.name, dataUrl: dataUrl }]); });
                };
                img.src = URL.createObjectURL(file);
                e.target.value = '';
            };

            var removeBild = function(idx) {
                setBilder(function(prev) { return prev.filter(function(_, i) { return i !== idx; }); });
            };

            // ── Briefkopf-HTML (identisch zum Rechnungsmodul) ──
            var buildBriefHTML = function() {
                var kName = empfaenger || '';
                var af = empfAdresse || '';
                var aLines = [];
                if (af) { var m = af.match(/^(.*?)[\s,]+(\d{5}\s+.*)$/); if(m){aLines.push(m[1].trim());aLines.push(m[2].trim());}else{af.split(',').forEach(function(s){if(s.trim())aLines.push(s.trim());});} }

                var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + betreff + '</title>';
                h += '<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,700&display=swap" rel="stylesheet">';
                h += '<style>';
                h += '@page{size:A4;margin:0}';
                h += '*{box-sizing:border-box;margin:0;padding:0}';
                h += 'body{font-family:"Source Sans 3","Segoe UI",sans-serif;font-size:10.5pt;color:#222;line-height:1.6;background:#fff}';
                h += '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
                h += '.page{width:210mm;min-height:297mm;padding:20mm 18mm 25mm 22mm;margin:0 auto;position:relative;background:#fff}';
                // Logo-Styles identisch zum Rechnungsmodul
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
                h += '.bz{font-size:9pt;color:#555;margin-bottom:6mm}';
                h += '.bz .l{display:inline-block;width:38mm;color:#888}.bz .v{font-weight:600;color:#222}';
                h += '.bt{font-size:13pt;font-weight:700;margin-bottom:4mm}';
                h += '.tx{font-size:10.5pt;line-height:1.7;margin-bottom:6mm;white-space:pre-wrap}';
                h += '.tx img{max-width:100%;height:auto;margin:4mm 0;border-radius:2px}';
                h += '.gr{font-size:10.5pt;margin-top:8mm}';
                h += '.ft{position:absolute;bottom:18mm;left:22mm;right:18mm;border-top:1.5px solid #c41e1e;padding-top:2mm;font-size:7pt;color:#999;line-height:1.6}';
                h += '.ft .ti{font-style:italic;color:#c41e1e;font-weight:700}.ft .tn{color:#333;font-weight:700}.ft .tf{color:#c41e1e}';
                h += '</style></head><body>';

                h += '<div class="page">';
                // Logo -- identisch zum Rechnungsmodul
                h += '<div class="lh"><div class="lc">';
                h += '<div class="lt">Thomas</div>';
                h += '<div class="lw"><span class="w">w</span><span class="iw"><span class="ic">\u0131</span><span class="id"></span></span><span class="ll">LL</span><span class="wa">wacher</span></div>';
                h += '<div class="ls"><span>Fliesenlegermeister e.K.</span></div>';
                h += '</div><div class="lr">Flurweg 14a<br>56472 Nisterau<br>Tel. 02661-63101<br>Mobil 0170-2024161</div></div>';

                h += '<hr class="sep">';
                h += '<div class="abs">Thomas Willwacher Fliesenlegermeister e.K. \u00b7 Flurweg 14a \u00b7 56472 Nisterau</div>';

                // Empfänger + Datum
                h += '<div class="eb"><div><div class="en">' + kName + '</div>';
                h += '<div class="ea">' + aLines.join('<br>') + '</div></div>';
                h += '<div class="db"><div class="dl">Datum</div><div class="dv">Nisterau, ' + briefDatum + '</div></div></div>';

                // Bezugszeile
                h += '<div class="bz">';
                h += '<div><span class="l">Bauvorhaben:</span> <span class="v">' + bauvorhaben + '</span></div>';
                if (ihrZeichen) h += '<div><span class="l">Ihr Zeichen:</span> <span class="v">' + ihrZeichen + '</span></div>';
                h += '<div><span class="l">Unser Zeichen:</span> <span class="v">' + unserZeichen + '</span></div>';
                h += '</div>';

                // Betreff
                if (betreff) h += '<div class="bt">' + betreff + '</div>';

                // Anrede + Text
                h += '<div class="tx">' + anrede + '\n\n' + textBody.replace(/</g, '&lt;').replace(/\n/g, '<br>');

                // Bilder einfügen
                bilder.forEach(function(b) {
                    h += '<br><img src="' + b.dataUrl + '" alt="' + b.name + '">';
                });
                h += '</div>';

                // Grußformel
                h += '<div class="gr">' + grussformel + '<br><br><br>Thomas Willwacher<br>Fliesenlegermeister e.K.</div>';

                // Fußzeile
                h += '<div class="ft"><div><span class="ti">Thomas </span><span class="tn">wiLLwacher</span> <span class="tf">Fliesenlegermeister e.K.</span></div>';
                h += '<div>Flurweg 14a \u00b7 56472 Nisterau \u00b7 Tel. 02661-63101 \u00b7 Mobil 0170-2024161</div>';
                h += '<div>Steuernummer: 30/220/1234/5 \u00b7 Westerwald Bank eG \u00b7 IBAN: DE12 5739 1800 0000 0000 00 \u00b7 BIC: GENODE51WW1</div></div>';

                h += '</div></body></html>';
                return h;
            };

            // ── PDF / Drucken ──
            var handleDrucken = function() {
                var h = buildBriefHTML();
                var pw = window.open('', '_blank', 'width=820,height=1160');
                pw.document.write(h);
                pw.document.close();
                setTimeout(function() { pw.focus(); pw.print(); }, 800);
            };

            // ── Gmail-API Versand (direkt!) ──
            var handleSenden = async function() {
                if (!empfEmail) {
                    alert('Bitte eine Empfänger-E-Mail-Adresse eingeben!');
                    return;
                }
                setSendStatus('sending');
                try {
                    var service = window.GoogleDriveService;
                    if (!service.accessToken) {
                        // Noch nicht verbunden → Auth anfordern
                        await service.init();
                        await service.requestAuth();
                    }

                    // HTML-Mail bauen
                    var vollBetreff = betreff || ('Schreiben -- ' + bauvorhaben);
                    var htmlMail = '<html><body style="font-family:\'Segoe UI\',Arial,sans-serif;font-size:10.5pt;color:#222;line-height:1.6;">';
                    htmlMail += '<p>' + anrede + '</p>';
                    htmlMail += '<p>' + textBody.replace(/\n/g, '<br>') + '</p>';
                    bilder.forEach(function(b) {
                        htmlMail += '<p><img src="' + b.dataUrl + '" style="max-width:600px;height:auto;border-radius:4px;" alt="' + b.name + '"></p>';
                    });
                    htmlMail += '<p>' + grussformel + '</p>';
                    htmlMail += '<p><strong>Thomas Willwacher</strong><br>Fliesenlegermeister e.K.<br>Flurweg 14a \u00b7 56472 Nisterau<br>Tel. 02661-63101 \u00b7 Mobil 0170-2024161</p>';
                    htmlMail += '</body></html>';

                    // MIME-Mail aufbauen
                    var boundary = 'boundary_' + Date.now();
                    var rawParts = [
                        'From: ' + GMAIL_CONFIG.ABSENDER_EMAIL,
                        'To: ' + empfEmail,
                        'Subject: =?UTF-8?B?' + btoa(unescape(encodeURIComponent(vollBetreff))) + '?=',
                        'MIME-Version: 1.0',
                        'Content-Type: multipart/alternative; boundary="' + boundary + '"',
                        '',
                        '--' + boundary,
                        'Content-Type: text/plain; charset=UTF-8',
                        '',
                        anrede + '\n\n' + textBody + '\n\n' + grussformel + '\n\nThomas Willwacher\nFliesenlegermeister e.K.',
                        '',
                        '--' + boundary,
                        'Content-Type: text/html; charset=UTF-8',
                        '',
                        htmlMail,
                        '',
                        '--' + boundary + '--'
                    ];

                    var rawMail = rawParts.join('\r\n');
                    var encoded = btoa(unescape(encodeURIComponent(rawMail))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

                    var resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + service.accessToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ raw: encoded })
                    });

                    if (resp.ok) {
                        setSendStatus('sent');
                        // Archivierung in Google Drive
                        try {
                            if (service.isConnected() && kunde && kunde._driveFolderId) {
                                var schriftOrdnerId = await service.findOrCreateFolder(kunde._driveFolderId, '04_Schriftverkehr');
                                var mailOrdnerId = await service.findOrCreateFolder(schriftOrdnerId, versandKanal === 'mail' ? 'Mail' : 'Briefe');
                                var datumFile = new Date().toISOString().slice(0,10).replace(/-/g,'');
                                var betreffKurz = (betreff || 'Schreiben').substring(0,25).replace(/[^a-zA-Z0-9äöüÄÖÜß\- ]/g, '').replace(/ /g, '_');
                                var prefix = versandKanal === 'mail' ? 'Mail' : 'Brief';
                                var fileName = prefix + '_' + datumFile + '_' + betreffKurz + '.html';
                                var briefHTML = buildBriefHTML();
                                await service.uploadFile(mailOrdnerId, fileName, 'text/html', new Blob([briefHTML], {type:'text/html'}));
                            }
                        } catch(archErr) { console.warn('Archivierung:', archErr); }

                        setTimeout(function() { setSendStatus(null); }, 4000);
                    } else {
                        var errData = await resp.json().catch(function(){ return {}; });
                        console.error('Gmail Fehler:', errData);
                        // Fallback: mailto
                        var mailtoLink = 'mailto:' + encodeURIComponent(empfEmail)
                            + '?subject=' + encodeURIComponent(vollBetreff)
                            + '&body=' + encodeURIComponent(anrede + '\n\n' + textBody + '\n\n' + grussformel + '\n\nThomas Willwacher\nFliesenlegermeister e.K.');
                        window.location.href = mailtoLink;
                        setSendStatus('sent');
                        setTimeout(function() { setSendStatus(null); }, 3000);
                    }
                } catch(err) {
                    console.error('Sende-Fehler:', err);
                    // Fallback: mailto
                    var vollBetreff2 = betreff || ('Schreiben -- ' + bauvorhaben);
                    var mailtoLink2 = 'mailto:' + encodeURIComponent(empfEmail)
                        + '?subject=' + encodeURIComponent(vollBetreff2)
                        + '&body=' + encodeURIComponent(anrede + '\n\n' + textBody + '\n\n' + grussformel + '\n\nThomas Willwacher\nFliesenlegermeister e.K.');
                    window.location.href = mailtoLink2;
                    setSendStatus('sent');
                    setTimeout(function() { setSendStatus(null); }, 3000);
                }
            };

            // ── Speichern in Drive ──
            var handleSpeichern = async function() {
                try {
                    var service = window.GoogleDriveService;
                    if (service.isConnected() && kunde && kunde._driveFolderId) {
                        var schriftOrdnerId = await service.findOrCreateFolder(kunde._driveFolderId, '04_Schriftverkehr');
                        var unterOrdnerId = await service.findOrCreateFolder(schriftOrdnerId, versandKanal === 'mail' ? 'Mail' : 'Briefe');
                        var datumFile = new Date().toISOString().slice(0,10).replace(/-/g,'');
                        var betreffKurz = (betreff || 'Schreiben').substring(0,25).replace(/[^a-zA-Z0-9äöüÄÖÜß\- ]/g, '').replace(/ /g, '_');
                        var prefix = versandKanal === 'mail' ? 'Mail' : 'Brief';
                        var fileName = prefix + '_' + datumFile + '_' + betreffKurz + '.html';
                        await service.uploadFile(unterOrdnerId, fileName, 'text/html', new Blob([buildBriefHTML()], {type:'text/html'}));
                        alert('✅ ' + prefix + ' gespeichert in 04_Schriftverkehr/' + (versandKanal === 'mail' ? 'Mail' : 'Briefe') + '/');
                    } else {
                        // Fallback: Lokaler Download
                        var blob = new Blob([buildBriefHTML()], { type: 'text/html' });
                        var url = URL.createObjectURL(blob);
                        var a = document.createElement('a');
                        a.href = url;
                        a.download = (versandKanal === 'mail' ? 'Mail' : 'Brief') + '_' + new Date().toISOString().slice(0,10) + '.html';
                        a.click();
                        URL.revokeObjectURL(url);
                    }
                } catch(err) {
                    console.error('Speichern-Fehler:', err);
                    alert('Fehler beim Speichern: ' + err.message);
                }
            };

            var inputStyle = {width:'100%', padding:'8px 10px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'13px', color:'var(--text-primary)', boxSizing:'border-box'};
            var lila = 'var(--accent-lila)';

            // ═══ PHASE 1: Kanal-Auswahl ═══
            if (phase === 'kanalwahl') {
                return (
                    <div className="page-container sv-page">
                        <div className="sv-header">
                            <FirmenLogo size="small" />
                            <div className="sv-header-title">Schriftverkehr</div>
                            <div className="sv-header-subtitle">{kunde ? kunde.name : ''}</div>
                            <div className="sv-header-prompt">Wie m{'\u00F6'}chten Sie korrespondieren?</div>
                        </div>

                        <div className="sv-channel-row">
                            <button onClick={function(){ setVersandKanal('mail'); setPhase('formular'); }} className="sv-channel-btn">
                                <span className="sv-channel-icon">{'\u2709\uFE0F'}</span>
                                <span className="sv-channel-label">E-MAIL</span>
                                <span className="sv-channel-desc">E-Mail direkt<br/>via Gmail senden</span>
                            </button>
                            <button onClick={function(){ setVersandKanal('post'); setPhase('formular'); }} className="sv-channel-btn">
                                <span className="sv-channel-icon">{'\uD83D\uDCC4'}</span>
                                <span className="sv-channel-label">POST</span>
                                <span className="sv-channel-desc">Gesch{'\u00E4'}ftsbrief<br/>drucken & senden</span>
                            </button>
                        </div>

                        <button onClick={onBack} className="sv-back-btn">{'\u2190'} Zur{'\u00FC'}ck zur Modulwahl</button>
                    </div>
                );
            }

            // ═══ PHASE 2: Formular ═══
            var kanalColor = versandKanal === 'mail' ? 'var(--accent-lila)' : '#2c3e50';
            var kanalLabel = versandKanal === 'mail' ? '✉️ E-Mail' : '📄 Geschäftsbrief';

            return (
                <div className="page-container sv-page formular">

                    {/* Header */}
                    <div className="sv-header formular">
                        <FirmenLogo size="small" />
                        <div className="sv-formular-title" style={{color: kanalColor}}>{kanalLabel}</div>
                        <div className="sv-formular-subtitle">{kunde ? kunde.name : 'Freies Schreiben'}</div>
                    </div>

                    {/* Empfaenger + Bauvorhaben */}
                    <div className="sv-card">
                        <div className="sv-card-label" style={{color: kanalColor}}>{'\uD83D\uDCEC'} Empf{'\u00E4'}nger</div>
                        <div className="sv-card-grid">
                            <div><MicLabel fieldKey="sv_empf" label="Empf\u00E4nger (Firma/Person)" />
                                <div className="sv-input-row"><MicInput fieldKey="sv_empf" value={empfaenger} onChange={function(e){setEmpfaenger(e.target.value);}} placeholder="Firma oder Name" style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="sv_empf" size="small" onResult={function(t){setEmpfaenger((empfaenger||'')+' '+t);}} /></div></div>
                            <div><MicLabel fieldKey="sv_adr" label="Adresse" />
                                <div className="sv-input-row"><MicInput fieldKey="sv_adr" value={empfAdresse} onChange={function(e){setEmpfAdresse(e.target.value);}} placeholder="Stra\u00DFe Nr, PLZ Ort" style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="sv_adr" size="small" onResult={function(t){setEmpfAdresse((empfAdresse||'')+' '+t);}} /></div></div>
                            {versandKanal === 'mail' && (
                                <div>
                                    <label className="sv-mini-label">E-Mail-Adresse</label>
                                    <input type="email" value={empfEmail} onChange={function(e){setEmpfEmail(e.target.value);}} placeholder="empfaenger@firma.de" style={inputStyle} />
                                    {/* Schnell-Buttons fuer bekannte E-Mails */}
                                    {kunde && (kunde.ag_email || kunde.bl_email || kunde.arch_email) && (
                                        <div className="sv-email-btns">
                                            {kunde.ag_email && <button onClick={function(){setEmpfEmail(kunde.ag_email);}} className="sv-email-btn ag">AG: {kunde.ag_email}</button>}
                                            {kunde.bl_email && <button onClick={function(){setEmpfEmail(kunde.bl_email);}} className="sv-email-btn bl">BL: {kunde.bl_email}</button>}
                                            {kunde.arch_email && <button onClick={function(){setEmpfEmail(kunde.arch_email);}} className="sv-email-btn arch">Arch: {kunde.arch_email}</button>}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="sv-two-col">
                                <div><MicLabel fieldKey="sv_bv" label="Bauvorhaben" />
                                    <div className="sv-input-row"><MicInput fieldKey="sv_bv" value={bauvorhaben} onChange={function(e){setBauvorhaben(e.target.value);}} style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="sv_bv" size="small" onResult={function(t){setBauvorhaben((bauvorhaben||'')+' '+t);}} /></div></div>
                                <div><label className="sv-mini-label">Datum</label>
                                    <input value={briefDatum} onChange={function(e){setBriefDatum(e.target.value);}} style={inputStyle} /></div>
                            </div>
                            <div className="sv-two-col">
                                <div><label className="sv-mini-label">Ihr Zeichen</label>
                                    <input value={ihrZeichen} onChange={function(e){setIhrZeichen(e.target.value);}} placeholder="optional" style={inputStyle} /></div>
                                <div><label className="sv-mini-label">Unser Zeichen</label>
                                    <input value={unserZeichen} onChange={function(e){setUnserZeichen(e.target.value);}} style={inputStyle} /></div>
                            </div>
                        </div>
                    </div>

                    {/* Vorlagen-Auswahl */}
                    <div className="sv-card">
                        <div className="sv-card-label vorlage" style={{color: kanalColor}}>{'\uD83D\uDCCB'} Vorlage (optional)</div>
                        <select value={vorlage} onChange={function(e){ applyVorlage(e.target.value); }}
                            style={{width:'100%', padding:'8px 10px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'12px', color:'var(--text-primary)', boxSizing:'border-box'}}>
                            <option value="">-- Freitext (keine Vorlage) --</option>
                            {vorlagen.map(function(v) { return <option key={v.id} value={v.id}>{v.name}</option>; })}
                        </select>
                    </div>

                    {/* Textbereich */}
                    <div className="sv-card">
                        <div className="sv-card-label" style={{color: kanalColor}}>{'\u270F\uFE0F'} Schreiben</div>

                        <div><MicLabel fieldKey="sv_betr" label="Betreff" />
                            <div className="sv-input-row mb"><MicInput fieldKey="sv_betr" value={betreff} onChange={function(e){setBetreff(e.target.value);}} placeholder="Betreff des Schreibens" style={Object.assign({}, inputStyle, {flex:1, fontWeight:'700'})} /><MicButton fieldKey="sv_betr" size="small" onResult={function(t){setBetreff((betreff||'')+' '+t);}} /></div></div>

                        <div><MicLabel fieldKey="sv_anr" label="Anrede" />
                            <div className="sv-input-row mb"><MicInput fieldKey="sv_anr" value={anrede} onChange={function(e){setAnrede(e.target.value);}} style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="sv_anr" size="small" onResult={function(t){setAnrede((anrede||'')+' '+t);}} /></div></div>

                        <div><MicLabel fieldKey="sv_text" label="Textinhalt" />
                            <div className="sv-input-row text">
                                <MicInput fieldKey="sv_text" multiline={true} value={textBody} onChange={function(e){setTextBody(e.target.value);}} rows={8} placeholder="Hier den Brieftext eingeben..."
                                    style={{flex:1, padding:'10px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'var(--bg-tertiary)', fontSize:'13px', color:'var(--text-primary)', resize:'vertical', boxSizing:'border-box', lineHeight:'1.6', minHeight:'160px'}} />
                                <MicButton fieldKey="sv_text" size="normal" onResult={function(t){setTextBody((textBody||'')+(textBody?' ':'')+t);}} />
                            </div></div>

                        {/* Bilder */}
                        {bilder.length > 0 && (
                            <div className="sv-bilder-row">
                                {bilder.map(function(b, idx) {
                                    return (
                                        <div key={idx} className="sv-bild-wrap">
                                            <img src={b.dataUrl} alt={b.name} className="sv-bild-img" />
                                            <button onClick={function(){ removeBild(idx); }} className="sv-bild-remove">{'\u2715'}</button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Bild-Buttons */}
                        <div className="sv-bild-btns">
                            <button onClick={function(){ kameraInputRef.current && kameraInputRef.current.click(); }} className="sv-bild-btn">
                                {'\uD83D\uDCF7'} Foto
                            </button>
                            <input ref={kameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleBild} style={{display:'none'}} />
                            <button onClick={function(){ bildInputRef.current && bildInputRef.current.click(); }} className="sv-bild-btn">
                                {'\uD83D\uDDBC'} Galerie/Dateien
                            </button>
                            <input ref={bildInputRef} type="file" accept="image/*" onChange={handleBild} style={{display:'none'}} />
                        </div>

                        <div style={{marginTop:'8px'}}><MicLabel fieldKey="sv_gruss" label="Gru\u00DFformel" />
                            <div className="sv-input-row"><MicInput fieldKey="sv_gruss" value={grussformel} onChange={function(e){setGrussformel(e.target.value);}} style={Object.assign({}, inputStyle, {flex:1})} /><MicButton fieldKey="sv_gruss" size="small" onResult={function(t){setGrussformel((grussformel||'')+' '+t);}} /></div></div>
                    </div>

                    {/* Versand-Status Toast */}
                    {sendStatus === 'sending' && (
                        <div className="sv-toast sending">
                            <span style={{animation:'spin 1s linear infinite', display:'inline-block'}}>{'\u23F3'}</span> Wird gesendet...
                        </div>
                    )}
                    {sendStatus === 'sent' && (
                        <div className="sv-toast sent">
                            {'\u2705'} Erfolgreich gesendet!
                        </div>
                    )}

                    {/* Fixed Bottom Bar */}
                    <div className="sv-bottom-bar">
                        <button onClick={function(){ setPhase('kanalwahl'); }} className="sv-bar-back">{'\u2190'}</button>
                        <button onClick={handleSenden} className="sv-bar-btn senden" style={{opacity: sendStatus === 'sending' ? 0.6 : 1}}>
                            {'\u2709\uFE0F'} Senden
                        </button>
                        <button onClick={handleDrucken} className="sv-bar-btn drucken">
                            {'\uD83D\uDDA8'} Drucken
                        </button>
                        <button onClick={handleSpeichern} className="sv-bar-save">
                            {'\uD83D\uDCBE'}
                        </button>
                    </div>
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           RECHNUNGSAUSGANGSBUCH -- Alle Rechnungen auf einen Blick
           Auto-Save · Alarm bei Zahlungsziel · Umsatzanalyse · Editierbar
           ═══════════════════════════════════════════ */
