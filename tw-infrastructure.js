    // ═══════════════════════════════════════════════════════
    // GOOGLE DRIVE SERVICE – Konfiguration & API-Funktionen
    // ═══════════════════════════════════════════════════════
    // WICHTIG: Eigene Google Cloud Client-ID hier eintragen!
    // Erstelle unter https://console.cloud.google.com ein Projekt,
    // aktiviere Google Drive API, erstelle OAuth 2.0 Client-ID
    // (Webanwendung), und trage die ID hier ein.
    const GDRIVE_CONFIG = {
        CLIENT_ID: '76287040810-vsm8abbur2m4hjgm845mbdlps47b1qp4.apps.googleusercontent.com', // Thomas Willwacher OAuth Client-ID
        API_KEY: '',   // ← Optional: API Key für unauth. Requests
        SCOPES: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/gmail.send',
        ROOT_FOLDER_NAME: 'Baustellen neu',
        ROOT_FOLDER_ID: '14sYXItHIv09j3S9F8iPmhVS4qawbLqVe', // Direkte Ordner-ID als Fallback
        DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    };

    // ── Google Drive Ordnernamen (echte Kundenordner-Struktur) ──
    // WICHTIG: Diese Namen muessen EXAKT mit den Ordnern auf Google Drive uebereinstimmen!
    // Quelle: Screenshots Thomas, 13.04.2026
    const DRIVE_ORDNER = {
        kundenDaten:      'Kunden-Daten',
        baustellenausw:   'Baustellenauswertung',
        angeboteNachtr:   'Angebote-Nachtraege-Leistungsverzeichnis',
        zeichnungen:      'Zeichnungen',
        stundennachweis:  'Stundennachweis',
        schriftverkehr:   'Schriftverkehr-Mail-Protokolle-Bauzeitenplan',
        rechnung:         'Rechnung-A.Kontozahlung',
        lieferanten:      'Lieferanten',
        aufmass:          'Aufma\u00df',
        bilder:           'Bilder',
        baustellenApp:    'Baustellen-App'
    };
    window.DRIVE_ORDNER = DRIVE_ORDNER;

    // ═══════════════════════════════════════════════════════
    // BAUSTELLEN-APP STAGING-KONFIGURATION
    // ═══════════════════════════════════════════════════════
    // Das Staging-Prinzip (Ein-Tuer-Prinzip):
    // Mitarbeiter-Handys kommen NIEMALS direkt an Original-Kundenordner.
    // Stattdessen gibt es einen separaten Root-Ordner "Baustellen-App-Staging",
    // in den Thomas manuell Dateien aus den Originalen hineinkopiert.
    // Nur dieser Staging-Bereich ist fuer Mitarbeiter sichtbar.
    //
    // Pro Baustelle werden im Staging 4 Unterordner angelegt:
    //  - Zeichnungen    (read-only fuer Mitarbeiter)
    //  - Baustellen-App (read-only fuer Mitarbeiter)
    //  - Bilder         (Mitarbeiter duerfen hochladen)
    //  - Stunden        (Mitarbeiter duerfen hochladen)
    //
    // Der SERVICE_ACCOUNT_EMAIL wird von Thomas nach Einrichtung
    // (siehe PDF-Anleitung "Service-Account-Einrichtung.pdf") eingetragen
    // und sorgt dafuer, dass das Mitarbeiter-Geraet NUR den Staging-Ordner
    // sehen kann — ohne Zugriff auf die Original-Kundenakten.
    const STAGING_CONFIG = {
        ROOT_FOLDER_NAME: 'Baustellen-App-Staging',
        ROOT_FOLDER_ID: localStorage.getItem('staging_root_folder_id') || '',
        SUBFOLDERS: ['Zeichnungen', 'Baustellen-App', 'Bilder', 'Stunden'],
        SUBFOLDER_PERMISSIONS: {
            'Zeichnungen':    'readonly',
            'Baustellen-App': 'readonly',
            'Bilder':         'upload',
            'Stunden':        'upload'
        },
        SERVICE_ACCOUNT_EMAIL: localStorage.getItem('staging_service_account_email') || '',
        WARN_COPY_SIZE_MB: 50
    };
    window.STAGING_CONFIG = STAGING_CONFIG;

    // ── Gmail-Konfiguration ──
    const GMAIL_CONFIG = {
        ABSENDER_EMAIL: localStorage.getItem('gmail_absender') || 'phoenix180862@gmail.com',
        ABSENDER_NAME: 'Thomas Willwacher Fliesenlegermeister e.K.',
    };

    // ═══════════════════════════════════════════════════════
    // GOOGLE GEMINI KI-API Konfiguration
    // ═══════════════════════════════════════════════════════
    // API-Key holen: https://aistudio.google.com/apikey
    // → "Create API Key" klicken → Key kopieren → hier eintragen
    //
    // MODELL-STRATEGIE (Stand April 2026, verifiziert gegen offizielle Google-Doku):
    // - 'flash' → gemini-2.5-flash: schneller Workhorse, STABLE, keine Abkuendigungsgefahr
    // - 'pro'   → gemini-2.5-pro:   Premium-Modell fuer Dokumentanalyse & Vision, STABLE
    // - 'pro31' → gemini-3.1-pro-preview: State-of-the-Art Frontier-Modell, PREVIEW
    //           (kann jederzeit abgekuendigt werden; zum Ausprobieren)
    // Gemini-3-Stable existiert AKTUELL NICHT (gemini-3-pro-preview wurde am 9.3.2026 eingestellt).
    const GEMINI_CONFIG = {
        API_KEY: localStorage.getItem('gemini_api_key') || '',
        MODEL: localStorage.getItem('gemini_model') || 'gemini-2.5-pro',
        MODEL_PRO: 'gemini-2.5-pro',
        MODEL_PRO_31: 'gemini-3.1-pro-preview',
        MODELS: {
            'flash': { id: 'gemini-2.5-flash',       name: 'Gemini 2.5 Flash',       icon: '⚡',  desc: 'Schnell & günstig (stable)',           color: '#1E88E5' },
            'pro':   { id: 'gemini-2.5-pro',         name: 'Gemini 2.5 Pro',         icon: '🧠', desc: 'Präzise Analyse (stable, empfohlen)',  color: '#8e44ad' },
            'pro31': { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', icon: '🚀', desc: 'Frontier-Modell (Preview, instabil)', color: '#e74c3c' }
        },
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
        MAX_RETRIES: 3,
    };

    // ═══════════════════════════════════════════════════════
    // KI-ORDNERANALYSE – Konfiguration
    // ═══════════════════════════════════════════════════════
    const ORDNER_ANALYSE_CONFIG = {
        ORDNER: {
            '01': { name: 'Vertrag / Baustellenauswertung', icon: '📋', color: '#3498db', keywords: ['vertrag', 'baustellenauswertung', 'notebooklm', 'zusammenfassung', 'projekt', 'allgemein', 'übersicht', 'uebersicht', 'auftrag', 'beauftragung', 'auftragsvergabe', 'vergabe', 'contract'] },
            '02': { name: 'LV / Angebote / Nachträge', icon: '📑', color: '#e74c3c', kritisch: true, keywords: ['lv', 'leistungsverzeichnis', 'angebot', 'nachtrag', 'nachträge', 'nachtraege', 'verträge', 'vertrae', 'position', 'vob', 'leistung', 'massiv', 'titel', 'gewerk', 'los'] },
            '03': { name: 'Pläne / Zeichnungen', icon: '📐', color: '#2ecc71', keywords: ['plan', 'plaene', 'pläne', 'zeichnung', 'grundriss', 'schnitt', 'raumbuch', 'skizze', 'cad', 'dwg', 'entwurf', 'detail', 'ansicht'] },
            '04': { name: 'Nachträge / Stundennachweis', icon: '⏱️', color: '#f39c12', keywords: ['stunden', 'stundennachweis', 'stundenzettel', 'rapportzettel', 'rapport', 'arbeitszeit', 'regiebericht', 'regie', 'tagelohn', 'regiearbeiten'] },
            '05': { name: 'Schriftverkehr', icon: '✉️', color: '#9b59b6', keywords: ['schriftverkehr', 'mail', 'protokoll', 'bauzeitenplan', 'brief', 'korrespondenz', 'e-mail', 'email', 'kommunikation', 'besprechung', 'begehung', 'abnahme'] },
            '06': { name: 'Aufmaß / Abrechnung', icon: '📏', color: '#34495e', keywords: ['aufmaß', 'aufmass', 'aufmasse', 'abrechnung', 'mengenermittlung', 'masse', 'messung', 'ermittlung', 'aufmaesse'] },
            '07': { name: 'Rechnungen / Kontozahlung', icon: '💰', color: '#1abc9c', keywords: ['rechnung', 'kontozahlung', 'abschlag', 'schlussrechnung', 'ausgangsbuch', 'zahlung', 'invoice', 'gutschrift', 'mahnung', 'konto'] },
            '08': { name: 'Lieferanten / Material', icon: '🏗️', color: '#e67e22', keywords: ['lieferant', 'material', 'fliese', 'fliesen', 'keramik', 'belag', 'mosaik', 'naturstein', 'zubehoer', 'zubehör', 'bestellung'] },
            '99': { name: 'Sonstiger Ordner', icon: '📂', color: '#7f8c8d', keywords: [] }
        },
        THRESHOLDS: {
            '01': { pages: 30, docs: 5 },
            '02': { pages: 50, docs: 10 },
            '03': { pages: 20, docs: 8 },
            '04': { pages: 15, docs: 20 },
            '05': { pages: 30, docs: 15 },
            '06': { pages: 30, docs: 10 },
            '07': { pages: 20, docs: 10 },
            '08': { pages: 15, docs: 10 },
            '99': { pages: 30, docs: 10 }
        },
        QUALITY_THRESHOLD: 70,
        MAX_PARALLEL: 3,
        TIMEOUT_PER_DOC: 90000,
    };

    // ── Gemini API-Aufruf (universell — Text + Bild + PDF) ──
    try { window.callGeminiAPI = async function(messages, maxTokens, options) {
        options = options || {};
        if (window._kiDisabled) return null;

        var apiKey = GEMINI_CONFIG.API_KEY || localStorage.getItem('gemini_api_key') || '';
        if (!apiKey) {
            console.warn('Kein Gemini API-Key konfiguriert');
            return null;
        }

        // Modell: Option > Präferenz > Config
        var modelPref = localStorage.getItem('gemini_model_pref') || 'pro';
        var modelInfo = GEMINI_CONFIG.MODELS[modelPref] || GEMINI_CONFIG.MODELS['pro'];
        var modelId = options.model || modelInfo.id;

        try {
            // Nachrichten in Gemini-Format konvertieren
            var parts = [];

            // Dateien (PDF, Bilder) als inline_data
            if (options.files && options.files.length > 0) {
                for (var fi = 0; fi < options.files.length; fi++) {
                    parts.push({
                        inline_data: {
                            mime_type: options.files[fi].mimeType,
                            data: options.files[fi].base64Data
                        }
                    });
                }
            }

            // Anthropic-Messages UND Gemini-Messages → Gemini-Parts konvertieren
            if (messages && messages.length > 0) {
                for (var mi = 0; mi < messages.length; mi++) {
                    var msg = messages[mi];

                    // ── FORMAT 1: Gemini-native (msg.parts) — von OrdnerAnalyseEngine ──
                    if (msg.parts && Array.isArray(msg.parts)) {
                        for (var pi = 0; pi < msg.parts.length; pi++) {
                            parts.push(msg.parts[pi]);
                        }
                    }
                    // ── FORMAT 2: Anthropic string (msg.content = string) ──
                    else if (typeof msg.content === 'string') {
                        parts.push({ text: msg.content });
                    }
                    // ── FORMAT 3: Anthropic multimodal (msg.content = array) ──
                    else if (Array.isArray(msg.content)) {
                        for (var ci = 0; ci < msg.content.length; ci++) {
                            var block = msg.content[ci];
                            if (block.type === 'text') {
                                parts.push({ text: block.text });
                            } else if (block.type === 'image' || block.type === 'document') {
                                // Sowohl Bilder als auch PDFs/Dokumente → inline_data für Gemini
                                parts.push({
                                    inline_data: {
                                        mime_type: block.source.media_type,
                                        data: block.source.data
                                    }
                                });
                            }
                        }
                    }
                }
            }

            if (parts.length === 0) return null;

            var body = {
                contents: [{ role: 'user', parts: parts }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: maxTokens || 8000
                }
            };

            // Wenn JSON-Output gewünscht (für Analyse-Calls)
            if (options.jsonMode) {
                body.generationConfig.responseMimeType = 'application/json';
            }

            var lastError;
            for (var attempt = 0; attempt < GEMINI_CONFIG.MAX_RETRIES; attempt++) {
                try {
                    var response = await fetch(
                        GEMINI_CONFIG.BASE_URL + '/models/' + modelId + ':generateContent?key=' + apiKey,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body)
                        }
                    );

                    var data = await response.json();

                    if (!response.ok) {
                        var errMsg = data.error ? data.error.message : ('HTTP ' + response.status);
                        console.warn('Gemini-Fehler:', errMsg);
                        if (response.status === 401 || response.status === 403) {
                            window._kiDisabled = true;
                            return null;
                        }
                        throw new Error(errMsg);
                    }

                    var textContent = '';
                    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                        textContent = data.candidates[0].content.parts
                            .filter(function(p) { return p.text; })
                            .map(function(p) { return p.text; })
                            .join('');
                    }
                    return textContent;
                } catch (retryErr) {
                    lastError = retryErr;
                    if (attempt < GEMINI_CONFIG.MAX_RETRIES - 1) {
                        await new Promise(function(r) { setTimeout(r, 1000 * (attempt + 1)); });
                    }
                }
            }
            console.warn('Gemini nach ' + GEMINI_CONFIG.MAX_RETRIES + ' Versuchen fehlgeschlagen:', lastError);
            return null;
        } catch (fetchErr) {
            console.warn('KI-Netzwerkfehler:', fetchErr.message);
            return null;
        }
    };

    // ── Kompatibilitäts-Wrapper: callAnthropicAPI → callGeminiAPI ──
    // Alle bestehenden Aufrufe funktionieren weiterhin!
    window.callAnthropicAPI = window.callGeminiAPI;

    // ── Bildanalyse (Gemini Vision) ──
    window.callGeminiVision = async function(imageBase64, mimeType, prompt, systemPrompt) {
        var apiKey = GEMINI_CONFIG.API_KEY || localStorage.getItem('gemini_api_key') || '';
        if (!apiKey) return null;

        var parts = [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: (systemPrompt ? systemPrompt + '\n\n' : '') + prompt }
        ];

        try {
            var response = await fetch(
                GEMINI_CONFIG.BASE_URL + '/models/' + GEMINI_CONFIG.MODEL + ':generateContent?key=' + apiKey,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: parts }],
                        generationConfig: {
                            responseMimeType: 'application/json',
                            temperature: 0.1,
                            maxOutputTokens: 8192
                        }
                    })
                }
            );

            var data = await response.json();
            if (!response.ok) return null;

            var text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
                ? data.candidates[0].content.parts.map(function(p) { return p.text || ''; }).join('')
                : '';
            try { return JSON.parse(text); } catch(e) { return text; }
        } catch(e) {
            console.warn('Gemini Vision Fehler:', e);
            return null;
        }
    };

    } catch(apiSetupErr) {
        console.warn('Gemini API setup:', apiSetupErr);
        window.callGeminiAPI = async function() { return null; };
        window.callAnthropicAPI = async function() { return null; };
        window.callGeminiVision = async function() { return null; };
    }

    window.GoogleDriveService = {
        tokenClient: null,
        accessToken: null,
        rootFolderId: null,
        _gapiInited: false,
        _gisInited: false,

        // ── Initialisierung ──
        async init() {
            if (!GDRIVE_CONFIG.CLIENT_ID) {
                console.warn('Google Drive: Keine Client-ID konfiguriert – Demo-Modus aktiv');
                return false;
            }
            try {
                await new Promise((resolve) => {
                    gapi.load('client', resolve);
                });
                await gapi.client.init({
                    apiKey: GDRIVE_CONFIG.API_KEY || undefined,
                    discoveryDocs: [GDRIVE_CONFIG.DISCOVERY_DOC],
                });
                this._gapiInited = true;
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: GDRIVE_CONFIG.CLIENT_ID,
                    scope: GDRIVE_CONFIG.SCOPES,
                    callback: () => {}, // wird bei requestAuth gesetzt
                });
                this._gisInited = true;
                return true;
            } catch (err) {
                console.error('GDrive Init Fehler:', err);
                return false;
            }
        },

        // ── OAuth 2.0 Authentifizierung ──
        requestAuth() {
            return new Promise((resolve, reject) => {
                if (!this.tokenClient) { reject(new Error('Nicht initialisiert')); return; }
                this.tokenClient.callback = (response) => {
                    if (response.error) { reject(new Error(response.error)); return; }
                    this.accessToken = response.access_token;
                    resolve(response.access_token);
                };
                if (this.accessToken) {
                    this.tokenClient.requestAccessToken({ prompt: '' });
                } else {
                    this.tokenClient.requestAccessToken({ prompt: 'consent' });
                }
            });
        },

        isConnected() {
            return !!this.accessToken;
        },

        // ── API-Helfer ──
        async _fetch(url, options) {
            if (!this.accessToken) throw new Error('Nicht authentifiziert');
            const resp = await fetch(url, {
                ...options,
                headers: {
                    'Authorization': 'Bearer ' + this.accessToken,
                    ...((options && options.headers) || {}),
                },
            });
            if (!resp.ok) {
                const err = await resp.text();
                throw new Error('Drive API Fehler: ' + resp.status + ' ' + err);
            }
            return resp;
        },

        async _fetchJSON(url, options) {
            const resp = await this._fetch(url, options);
            return resp.json();
        },

        // ── Ordner "Baustellen neu" finden ──
        async findRootFolder() {
            // Methode 1: Direkte Ordner-ID (schnellste und sicherste Methode)
            if (GDRIVE_CONFIG.ROOT_FOLDER_ID) {
                try {
                    const data = await this._fetchJSON(
                        'https://www.googleapis.com/drive/v3/files/' + GDRIVE_CONFIG.ROOT_FOLDER_ID + '?fields=id,name'
                    );
                    if (data && data.id) {
                        this.rootFolderId = data.id;
                        return data;
                    }
                } catch (e) {
                    console.warn('Direkte Ordner-ID fehlgeschlagen, suche per Name...', e);
                }
            }
            // Methode 2: Suche per Name (mit und ohne Leerzeichen)
            var searchNames = [GDRIVE_CONFIG.ROOT_FOLDER_NAME, GDRIVE_CONFIG.ROOT_FOLDER_NAME + ' '];
            for (var si = 0; si < searchNames.length; si++) {
                var sName = searchNames[si];
                var query = "name='" + sName + "' and mimeType='application/vnd.google-apps.folder' and trashed=false";
                var data = await this._fetchJSON(
                    'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) + '&fields=files(id,name)&pageSize=10'
                );
                if (data.files && data.files.length > 0) {
                    this.rootFolderId = data.files[0].id;
                    return data.files[0];
                }
            }
            // Methode 3: Breitere Suche mit "contains"
            var query3 = "name contains 'Baustellen' and mimeType='application/vnd.google-apps.folder' and trashed=false";
            var data3 = await this._fetchJSON(
                'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query3) + '&fields=files(id,name)&pageSize=10'
            );
            if (data3.files && data3.files.length > 0) {
                // Besten Treffer finden
                var best = data3.files.find(function(f) { return f.name.trim().toLowerCase() === 'baustellen neu'; }) || data3.files[0];
                this.rootFolderId = best.id;
                return best;
            }
            throw new Error('Ordner "' + GDRIVE_CONFIG.ROOT_FOLDER_NAME + '" nicht gefunden');
        },

        // ── Kundenordner auflisten ──
        async listKundenOrdner() {
            if (!this.rootFolderId) await this.findRootFolder();
            const query = `'${this.rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
            const data = await this._fetchJSON(
                'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) + '&fields=files(id,name,modifiedTime)&orderBy=name&pageSize=100'
            );
            return (data.files || []).map(f => ({
                id: f.id,
                name: f.name,
                letzteAenderung: new Date(f.modifiedTime).toLocaleDateString('de-DE'),
            }));
        },

        // ── Dateien in einem Ordner auflisten (rekursiv 1 Ebene) ──
        async listFolderContents(folderId) {
            const query = `'${folderId}' in parents and trashed=false`;
            const data = await this._fetchJSON(
                'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) +
                '&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=name&pageSize=200'
            );
            const files = data.files || [];
            const result = { folders: [], files: [] };
            for (const f of files) {
                if (f.mimeType === 'application/vnd.google-apps.folder') {
                    // Unterordner-Dateien laden
                    const subQuery = `'${f.id}' in parents and trashed=false`;
                    const subData = await this._fetchJSON(
                        'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(subQuery) +
                        '&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=name&pageSize=100'
                    );
                    result.folders.push({
                        name: f.name,
                        id: f.id,
                        files: (subData.files || []).map(sf => ({
                            id: sf.id,
                            name: sf.name,
                            type: this._getFileType(sf.mimeType, sf.name),
                            size: sf.size ? (parseFloat(sf.size) / 1024 / 1024).toFixed(1) + ' MB' : '—',
                        })),
                    });
                } else {
                    result.files.push({
                        id: f.id,
                        name: f.name,
                        type: this._getFileType(f.mimeType, f.name),
                        size: f.size ? (parseFloat(f.size) / 1024 / 1024).toFixed(1) + ' MB' : '—',
                    });
                }
            }
            return result;
        },

        _getFileType(mimeType, name) {
            if (mimeType === 'application/pdf' || (name && name.endsWith('.pdf'))) return 'pdf';
            if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || (name && (name.endsWith('.xlsx') || name.endsWith('.xls')))) return 'xlsx';
            if (mimeType.includes('image')) return 'img';
            // Google Docs (cloud-native) → eigener Typ, braucht Export statt Download
            if (mimeType === 'application/vnd.google-apps.document') return 'gdoc';
            if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'gsheet';
            if (mimeType.includes('word') || (name && (name.endsWith('.docx') || name.endsWith('.doc')))) return 'doc';
            return 'sonstige';
        },

        // ── Ordner erstellen oder finden ──
        async findOrCreateFolder(parentId, folderName) {
            const query = `'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
            const data = await this._fetchJSON(
                'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) + '&fields=files(id,name)&pageSize=5'
            );
            if (data.files && data.files.length > 0) return data.files[0].id;
            // Erstellen
            const resp = await this._fetchJSON('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentId],
                }),
            });
            return resp.id;
        },

        // ── Ordner suchen (read-only, legt nichts neu an) ──
        // Rueckgabe: folderId als String, oder null wenn nicht gefunden.
        async findFolder(parentId, folderName) {
            const query = `'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
            const data = await this._fetchJSON(
                'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) + '&fields=files(id,name)&pageSize=5'
            );
            if (data.files && data.files.length > 0) return data.files[0].id;
            return null;
        },

        // ── Dateien in einem Ordner listen ──
        // mimeType optional; wenn angegeben, wird nach diesem MIME-Typ gefiltert.
        // Rueckgabe: Array von { id, name, modifiedTime, size } (kann leer sein).
        async listFiles(folderId, mimeType) {
            let query = `'${folderId}' in parents and trashed=false`;
            if (mimeType) {
                query += ` and mimeType='${mimeType}'`;
            }
            const data = await this._fetchJSON(
                'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) +
                '&fields=files(id,name,modifiedTime,size,mimeType)&orderBy=modifiedTime desc&pageSize=200'
            );
            return data.files || [];
        },

        // ── Datei hochladen (Multipart) ──
        async uploadFile(folderId, fileName, mimeType, blob) {
            const metadata = {
                name: fileName,
                mimeType: mimeType,
                parents: [folderId],
            };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);
            const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + this.accessToken },
                body: form,
            });
            if (!resp.ok) throw new Error('Upload fehlgeschlagen: ' + resp.status);
            return resp.json();
        },

        // ── Aufmaß exportieren (PDF + Excel → Google Drive) ──
        async exportToCustomerFolder(kundeFolderId, pdfBlob, excelBlob, kundenName) {
            const datumFile = new Date().toISOString().split('T')[0];
            const safeName = kundenName.replace(/[^a-zA-Z0-9äöüÄÖÜß ]/g, '').replace(/ +/g, '_').substring(0, 30);

            // Aufmaß-Unterordner erstellen/finden
            const aufmassFolderId = await this.findOrCreateFolder(kundeFolderId, DRIVE_ORDNER.aufmass);

            const results = [];
            if (pdfBlob) {
                const pdfResult = await this.uploadFile(
                    aufmassFolderId,
                    'Aufmass_' + datumFile + '_' + safeName + '.pdf',
                    'application/pdf',
                    pdfBlob
                );
                results.push({ type: 'pdf', ...pdfResult });
            }
            if (excelBlob) {
                const xlResult = await this.uploadFile(
                    aufmassFolderId,
                    'Aufmass_' + datumFile + '_' + safeName + '.xlsx',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    excelBlob
                );
                results.push({ type: 'excel', ...xlResult });
            }
            return results;
        },

        // ── Datei herunterladen (als Blob) ──
        async downloadFile(fileId) {
            const resp = await this._fetch(
                'https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media'
            );
            return resp.blob();
        },

        // ── Google Docs/Sheets als Text exportieren ──
        async exportAsText(fileId) {
            const resp = await this._fetch(
                'https://www.googleapis.com/drive/v3/files/' + fileId + '/export?mimeType=text/plain'
            );
            return resp.text();
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // FILE PROCESSOR SERVICE – Daten-Import-Pipeline
    // Hybrid: Regex (Offline) + KI (Online) für optimale Ergebnisse
    // ═══════════════════════════════════════════════════════════════
    window.FileProcessor = {
        // ── Konnektivitätsprüfung ──
        isOnline() {
            // Wenn KI explizit deaktiviert ist (z.B. "Nur Daten laden"), Offline vortäuschen
            if (window._kiDisabled) return false;
            return navigator.onLine;
        },

        // ── PDF Text-Extraktion (pdf.js) ──
        async extractPdfText(blob) {
            try {
                if (typeof pdfjsLib === 'undefined') {
                    console.warn('pdf.js nicht geladen – PDF-Extraktion nicht möglich');
                    return '';
                }
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                var arrayBuffer = await blob.arrayBuffer();
                var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                var fullText = '';
                for (var i = 1; i <= pdf.numPages; i++) {
                    var page = await pdf.getPage(i);
                    var content = await page.getTextContent();
                    var pageText = content.items.map(function(item) { return item.str; }).join(' ');
                    fullText += pageText + '\n--- SEITENUMBRUCH ---\n';
                }
                return fullText;
            } catch (err) {
                console.error('PDF Extraktion Fehler:', err);
                return '';
            }
        },

        // ── PDF als Base64 für KI-Analyse ──
        async pdfToBase64(blob) {
            return new Promise(function(resolve, reject) {
                var reader = new FileReader();
                reader.onload = function() { resolve(reader.result.split(',')[1]); };
                reader.onerror = function() { reject(new Error('PDF Base64 Fehler')); };
                reader.readAsDataURL(blob);
            });
        },

        // ══════════════════════════════════════════════
        // REGEX LV-PARSER (Offline-fähig, läuft IMMER)
        // ══════════════════════════════════════════════

        // ══════════════════════════════════════════════
        // KUNDENDATEN-ERKENNUNG AUS PDF-TEXT (Offline)
        // Briefköpfe, Angebote, Anschreiben, LVs
        // ══════════════════════════════════════════════
        parseKundendatenRegex(text) {
            if (!text || text.length < 30) return {};
            var result = {};
            var lines = text.split('\n');
            var fullText = text;

            // ── Baumaßnahme / Bauvorhaben ──
            var bmMatch = fullText.match(/Bauma(?:ß|ss)nahme\s*[:\-]?\s*(.{5,120})/i)
                || fullText.match(/Bauvorhaben\s*[:\-]?\s*(.{5,120})/i)
                || fullText.match(/Objekt\s*[:\-]?\s*(.{5,120})/i)
                || fullText.match(/Projekt\s*[:\-]?\s*(.{5,120})/i);
            if (bmMatch) {
                var bm = bmMatch[1].trim().replace(/\s+/g, ' ');
                // Adresse aus Baumaßnahme extrahieren
                result.baumassnahme = bm;
                var addrMatch = bm.match(/(\d{5})\s+([A-ZÄÖÜ][a-zäöüß]+)/);
                if (addrMatch) result.adresse = bm;
            }

            // ── Auftraggeber / Bauherr ──
            var agMatch = fullText.match(/Auftraggeber\s*[:\-]?\s*(.{3,100})/i)
                || fullText.match(/Bauherr(?:in)?\s*[:\-]?\s*(.{3,100})/i)
                || fullText.match(/AG\s*[:\-]?\s*([A-ZÄÖÜ].{3,100})/);
            if (agMatch) result.auftraggeber = agMatch[1].trim().split('\n')[0].replace(/\s+/g, ' ');

            // ── Bauleitung ──
            var blMatch = fullText.match(/Bauleitung\s*[:\-]?\s*(.{3,100})/i)
                || fullText.match(/Bauleiter(?:in)?\s*[:\-]?\s*(.{3,100})/i);
            if (blMatch) result.bauleitung = blMatch[1].trim().split('\n')[0].replace(/\s+/g, ' ');

            // ── Architekt / Planer ──
            var archMatch = fullText.match(/Architekt(?:in)?\s*[:\-]?\s*(.{3,100})/i)
                || fullText.match(/Planer(?:in)?\s*[:\-]?\s*(.{3,100})/i)
                || fullText.match(/Planungsb(?:ü|ue)ro\s*[:\-]?\s*(.{3,100})/i)
                || fullText.match(/Ingenieurb(?:ü|ue)ro\s*[:\-]?\s*(.{3,100})/i);
            if (archMatch) result.architekt = archMatch[1].trim().split('\n')[0].replace(/\s+/g, ' ');

            // ── Adresse aus Briefkopf (Empfänger, typisch oben links) ──
            // Muster: Name\nStraße Nr\nPLZ Ort
            for (var i = 0; i < Math.min(lines.length, 30); i++) {
                var line = lines[i].trim();
                // PLZ + Ort erkennen
                var plzMatch = line.match(/^(\d{5})\s+([A-ZÄÖÜ][a-zäöüß]{2,})/);
                if (plzMatch && !result.ag_adresse) {
                    // Vorherige Zeilen = Name + Straße
                    var name = '';
                    var strasse = '';
                    if (i >= 2) {
                        name = lines[i-2].trim();
                        strasse = lines[i-1].trim();
                    } else if (i >= 1) {
                        strasse = lines[i-1].trim();
                    }
                    if (!result.auftraggeber && name && name.length > 3 && !name.match(/Thomas Willwacher|Fliesenleger|Flurweg/i)) {
                        result.auftraggeber = name;
                    }
                    if (strasse && strasse.match(/str|weg|platz|gasse|allee|ring/i)) {
                        result.ag_adresse = strasse + ', ' + line;
                    }
                }
            }

            // ── E-Mail-Adressen sammeln ──
            var emails = fullText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
            // Eigene E-Mail ausfiltern
            emails = emails.filter(function(e) { return !e.match(/willwacher|thomas-willwacher|phoenix1808/i); });
            if (emails.length > 0 && !result.ag_email) result.ag_email = emails[0];
            if (emails.length > 1 && !result.bl_email) result.bl_email = emails[1];
            if (emails.length > 2 && !result.arch_email) result.arch_email = emails[2];

            // ── Telefonnummern sammeln ──
            var telefone = fullText.match(/(?:Tel\.?|Telefon|Fon|Mobil|Handy)\s*[:\-]?\s*([\d\s\/\-\+\(\)]{6,20})/gi) || [];
            var eigeneTel = /02661|0170.*2024161/;
            telefone = telefone.filter(function(t) { return !t.match(eigeneTel); });
            // Nummern extrahieren
            telefone = telefone.map(function(t) {
                var m = t.match(/([\d\s\/\-\+\(\)]{6,20})/);
                return m ? m[1].trim() : '';
            }).filter(function(t) { return t.length > 5; });
            if (telefone.length > 0 && !result.ag_telefon) result.ag_telefon = telefone[0];
            if (telefone.length > 1 && !result.bl_telefon) result.bl_telefon = telefone[1];

            // ── Datum ──
            var datumMatch = fullText.match(/Datum\s*[:\-]?\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/i);
            if (datumMatch) result.datum = datumMatch[1];

            return result;
        },

        parseLvRegex(text) {
            if (!text || text.trim().length < 20) return [];
            var positionen = [];
            var lines = text.split('\n');
            var seen = {};

            // ── Normalisierungsfunktionen ──
            var normalizePos = function(p) {
                // "01.02.003" → "1.2.3", "1,02" → "1.02"
                return p.replace(/,/g, '.').split('.').map(function(n) { return String(parseInt(n, 10) || n); }).join('.');
            };
            var normalizeMenge = function(m) {
                if (!m) return 0;
                // "1.234,56" → 1234.56 | "45,00" → 45.0 | "45.00" → 45.0
                var s = m.trim();
                if (s.indexOf(',') > -1 && s.indexOf('.') > -1) {
                    // Tausenderformat: "1.234,56"
                    s = s.replace(/\./g, '').replace(',', '.');
                } else if (s.indexOf(',') > -1) {
                    s = s.replace(',', '.');
                }
                return parseFloat(s) || 0;
            };
            var normalizeEinheit = function(e) {
                if (!e) return '?';
                var el = e.toLowerCase().trim();
                if (el === 'm2' || el === 'm²' || el === 'qm') return 'm²';
                if (el === 'stk' || el === 'stück' || el === 'stck' || el === 'st' || el === 'st.') return 'Stk';
                if (el === 'psch' || el === 'pauschal' || el === 'pau' || el === 'pa') return 'psch';
                if (el === 'lfm' || el === 'lm' || el === 'lfdm' || el === 'lfd.m') return 'lfm';
                if (el === 'kg' || el === 'l' || el === 't') return e.trim();
                if (el === 'm' || el === 'mtr') return 'm';
                return e.trim();
            };
            var isEinheit = function(s) {
                if (!s) return false;
                return !!s.match(/^(m[²2]?|qm|lfm|lm|lfdm|lfd\.m|Stk|Stück|Stck|St\.?|psch|pauschal|pau|pa|kg|l|t|mtr)$/i);
            };
            var isPosNr = function(s) {
                if (!s) return false;
                return !!s.match(/^\d{1,3}[\.\,]\d{1,3}([\.\,]\d{1,4})?$/);
            };
            // Preise erkennen (nicht als Menge verwechseln)
            var isPrice = function(s) {
                if (!s) return false;
                // "1.234,56 €" oder "€ 45,00" oder einfach Zahlen mit genau 2 Nachkommastellen und > 1000
                return !!s.match(/€/) || (normalizeMenge(s) > 500 && s.indexOf(',') > -1);
            };

            // ══════════════════════════════════════════
            // PASS 1: Zeilen vorverarbeiten – SEITENUMBRÜCHE und Kopfzeilen entfernen
            // ══════════════════════════════════════════
            var cleanLines = [];
            var headerPatterns = /^(Pos\.?|Position|Menge|Art|Einheit|Leistung|E[\.\-]?\s*Preis|G[\.\-]?\s*Preis|EP|GP|Seite|page|Summe|Gesamt|Netto|Brutto|MwSt|---)/i;
            for (var h = 0; h < lines.length; h++) {
                var cl = lines[h].trim();
                if (!cl) continue;
                if (cl.match(/^-{3,}|SEITENUMBRUCH/)) continue;
                if (cl.match(headerPatterns) && cl.length < 60) continue;
                cleanLines.push(cl);
            }

            // ══════════════════════════════════════════
            // PASS 2: Positionen erkennen mit mehreren Strategien
            // ══════════════════════════════════════════

            for (var i = 0; i < cleanLines.length; i++) {
                var line = cleanLines[i];
                if (line.length < 5) continue;

                // ── Pos-Nummer am Zeilenanfang finden ──
                var posMatch = line.match(/^[\s]*(\d{1,3}[\.\,]\d{1,3}(?:[\.\,]\d{1,4})?)\b/);
                // Auch mit "Pos." Prefix
                if (!posMatch) {
                    posMatch = line.match(/Pos\.?\s*[\-:]?\s*(\d{1,3}[\.\,]\d{1,3}(?:[\.\,]\d{1,4})?)\b/i);
                }
                if (!posMatch) continue;

                var posNr = normalizePos(posMatch[1]);
                if (seen[posNr]) continue;

                // Rest der Zeile nach Pos-Nr
                var afterPos = line.substring(line.indexOf(posMatch[1]) + posMatch[1].length).trim();

                // ── FORMAT A: "Pos Menge Art Leistung" (wie im Willwacher-Angebot) ──
                // z.B. "1.01  45,00  m²  Bodenfliesen 30×60 liefern u. verlegen"
                var fmtA = afterPos.match(/^([\d\.,]+)\s+(m[²2]|qm|m|lfm|lm|Stk|Stück|Stck|St\.?|psch|pauschal|pau|kg|l|t)\s+(.{5,})/i);
                if (fmtA && !isPrice(fmtA[1])) {
                    var bez = fmtA[3].trim();
                    // Preise am Ende abschneiden (E.-Preis, G.-Preis)
                    bez = bez.replace(/[\d\.,]+\s*€?\s*[\d\.,]*\s*€?\s*$/, '').trim();
                    bez = bez.replace(/\s+/g, ' ');
                    if (bez.length >= 3) {
                        seen[posNr] = true;
                        positionen.push({
                            pos: posNr, menge: normalizeMenge(fmtA[1]),
                            einheit: normalizeEinheit(fmtA[2]), bez: bez,
                            quelle: 'regex-A'
                        });
                        continue;
                    }
                }

                // ── FORMAT B: "Pos Leistung ... Menge Einheit" ──
                // z.B. "1.01  Bodenfliesen 30×60 liefern u. verlegen  45,00 m²"
                var fmtB = afterPos.match(/^(.{5,?}?)\s+([\d\.,]+)\s+(m[²2]|qm|m|lfm|lm|Stk|Stück|Stck|St\.?|psch|pauschal|pau|kg|l|t)\s*$/i);
                if (fmtB && !isPrice(fmtB[2])) {
                    var bezB = fmtB[1].replace(/\s+/g, ' ').trim();
                    bezB = bezB.replace(/[\d\.,]+\s*€?\s*[\d\.,]*\s*€?\s*$/, '').trim();
                    if (bezB.length >= 3) {
                        seen[posNr] = true;
                        positionen.push({
                            pos: posNr, menge: normalizeMenge(fmtB[2]),
                            einheit: normalizeEinheit(fmtB[3]), bez: bezB,
                            quelle: 'regex-B'
                        });
                        continue;
                    }
                }

                // ── FORMAT C: Nur Beschreibung in Zeile, Menge auf Folgezeile(n) ──
                var beschreibung = afterPos.replace(/\s+/g, ' ').trim();
                // Preise entfernen
                beschreibung = beschreibung.replace(/[\d\.,]+\s*€/g, '').trim();
                var foundMenge = false;

                for (var j = 1; j <= 5 && (i + j) < cleanLines.length; j++) {
                    var nextLine = cleanLines[i + j].trim();
                    if (!nextLine) continue;

                    // Nächste Zeile ist eine neue Position? → abbrechen
                    if (nextLine.match(/^\d{1,3}[\.\,]\d{1,3}/) || nextLine.match(/^Pos\.?\s*\d/i)) break;

                    // Menge + Einheit finden
                    var mengeMatch = nextLine.match(/([\d\.,]+)\s+(m[²2]|qm|m|lfm|lm|Stk|Stück|Stck|St\.?|psch|pauschal|pau|kg|l|t)/i);
                    if (mengeMatch && !isPrice(mengeMatch[1])) {
                        seen[posNr] = true;
                        positionen.push({
                            pos: posNr, menge: normalizeMenge(mengeMatch[1]),
                            einheit: normalizeEinheit(mengeMatch[2]),
                            bez: beschreibung.substring(0, 200),
                            quelle: 'regex-C'
                        });
                        foundMenge = true;
                        break;
                    }

                    // Beschreibung weiter sammeln (max 200 chars)
                    if (beschreibung.length < 200 && nextLine.length > 3) {
                        beschreibung += ' ' + nextLine.replace(/\s+/g, ' ').trim();
                    }
                }

                // ── FORMAT D: Fallback – Pos mit Beschreibung, ohne Menge ──
                if (!foundMenge && !seen[posNr] && beschreibung.length >= 3) {
                    // Einheit aus dem Text raten
                    var guessEinheit = '?';
                    if (beschreibung.match(/verl|fliese|abdicht|grundier|estrich|entkopplung|verfug/i)) guessEinheit = 'm²';
                    if (beschreibung.match(/sockel|profil|schiene|silikon|dichtband|fuge/i)) guessEinheit = 'm';
                    if (beschreibung.match(/einbau|rinne|manschette|haltegriff|fensterbank/i)) guessEinheit = 'Stk';
                    if (beschreibung.match(/baustelle|pauschal|einricht/i)) guessEinheit = 'psch';

                    seen[posNr] = true;
                    positionen.push({
                        pos: posNr, menge: 0, einheit: guessEinheit,
                        bez: beschreibung.replace(/[\d\.,]+\s*€/g, '').trim().substring(0, 200),
                        quelle: 'regex-D'
                    });
                }
            }

            // ── Kategorisierung (automatisch aus Beschreibung) ──
            positionen.forEach(function(p) {
                var b = p.bez.toLowerCase();
                if (b.match(/boden.*fliese|fliese.*boden|boden.*verl/)) p.kategorie = 'boden';
                else if (b.match(/wand.*fliese|fliese.*wand|wand.*verl|fliesenspiegel/)) p.kategorie = 'wand';
                else if (b.match(/sockel/)) p.kategorie = 'sockel';
                else if (b.match(/abdicht|verbundabdicht/)) p.kategorie = 'abdichtung';
                else if (b.match(/silikon|dauerelast|anschlussfug/)) p.kategorie = 'silikon';
                else if (b.match(/schiene|profil|eck.*schutz|abschluss/)) p.kategorie = 'schiene';
                else if (b.match(/rinne|dusch.*einbau|haltegriff|manschette/)) p.kategorie = 'einbau';
                else if (b.match(/verfug/)) p.kategorie = 'verfugung';
                else if (b.match(/grundier|vorbereite|untergrund|spachtel/)) p.kategorie = 'vorbereitung';
                else if (b.match(/estrich|gefälle/)) p.kategorie = 'estrich';
                else if (b.match(/entkopplung|entkoppl/)) p.kategorie = 'entkopplung';
                else if (b.match(/decke/)) p.kategorie = 'decke';
                else if (b.match(/fensterbank|naturstein.*bank/)) p.kategorie = 'fensterbank';
                else if (b.match(/schwelle|übergang/)) p.kategorie = 'schwelle';
                else if (b.match(/dichtband/)) p.kategorie = 'abdichtung';
                else p.kategorie = 'allgemein';

                // Tags generieren
                p.tags = (p.kategorie + ' ' + b).match(/\b[a-zäöüß]{3,}\b/gi) || [];
            });

            // ── Sortieren nach Pos-Nr ──
            positionen.sort(function(a, b) {
                var pa = a.pos.split('.').map(Number);
                var pb = b.pos.split('.').map(Number);
                for (var k = 0; k < Math.max(pa.length, pb.length); k++) {
                    if ((pa[k] || 0) !== (pb[k] || 0)) return (pa[k] || 0) - (pb[k] || 0);
                }
                return 0;
            });

            return positionen;
        },

        // ══════════════════════════════════════════════
        // KI LV-PARSER (Online, Claude API)
        // ══════════════════════════════════════════════
        async parseLvAI(text, existingRegexResult) {
            if (!this.isOnline()) return null;
            try {
                var regexHint = '';
                if (existingRegexResult && existingRegexResult.length > 0) {
                    regexHint = '\n\nEin Regex-Parser hat bereits ' + existingRegexResult.length + ' Positionen gefunden. Bitte alle Positionen vollstaendig extrahieren.';
                }
                var apiText = await window.callAnthropicAPI([{
                            role: 'user',
                            content: 'Du bist ein VOB-Experte fuer Fliesenlegerarbeiten (DIN 18352).\n\n═══ DEINE EINZIGE AUFGABE: ALLE LV-POSITIONEN EXTRAHIEREN ═══\n\nDieser Text stammt aus einem Leistungsverzeichnis (LV). Es kann 50 bis 200+ Positionen enthalten!\n\nEine LV-Position hat IMMER:\n- Positionsnummer (01.001, 1.01, Pos 3, etc.)\n- Leistungsbeschreibung\n- Menge + Einheit (m2, m, Stk, psch, lfm)\n- Optional: EP und GP\n\n⚠️ KRITISCH: Zeilen mit Raumnamen (Bad EG, Kueche) die eine Positionsnummer und Menge haben = POSITIONEN! Der Raumname gehoert ins "bereich"-Feld.\n\nGehe den GESAMTEN Text durch. Ueberspringe KEINE Position! Auch Zulagepositionen, Eventualpositionen, Bedarfspositionen muessen rein.\n\nAntworte NUR mit JSON-Array (kein Markdown, keine Backticks):\n[{"pos":"01.001","bez":"VOLLSTAENDIGE Bezeichnung","einheit":"m2","menge":45.00,"einzelpreis":32.50,"bereich":"Bad EG","kategorie":"boden","tags":["boden","fliese"]}]\n\nRegeln:\n- pos: EXAKT wie im Dokument\n- bez: VOLLSTAENDIG — NICHT abkuerzen!\n- einzelpreis: EP als Zahl — IMMER extrahieren wenn vorhanden\n- Es duerfen 200+ Positionen sein — das ist normal!\n- KEINE Position auslassen — JEDE EINZELNE zaehlt!' + regexHint + '\n\nTEXT:\n' + text.substring(0, 30000)
                        }], 32000);
                if (!apiText) return null;
                var cleaned = apiText.replace(/```json|```/g, '').trim();
                var parsed = JSON.parse(cleaned);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map(function(p) {
                        return { pos: String(p.pos||''), bez: String(p.bez||''), einheit: String(p.einheit||'?'),
                            menge: Number(p.menge)||0, einzelpreis: Number(p.einzelpreis)||0,
                            bereich: String(p.bereich||'Allgemein'),
                            kategorie: String(p.kategorie||'allgemein'), tags: Array.isArray(p.tags)?p.tags:[], quelle: 'ki' };
                    });
                }
                return null;
            } catch (err) {
                console.error('KI LV-Parser Fehler:', err);
                return null;
            }
        },

        // ── KI-Analyse direkt vom PDF (base64) – höchste Genauigkeit ──
        async parseLvAIFromPdf(blob, existingRegexResult) {
            if (!this.isOnline()) return null;

            try {
                var base64 = await this.pdfToBase64(blob);

                var apiText = await window.callAnthropicAPI([{
                            role: 'user',
                            content: [
                                {
                                    type: 'image',
                                    source: { type: 'base64', media_type: 'application/pdf', data: base64 }
                                },
                                {
                                    type: 'text',
                                    text: 'Du bist ein VOB-Experte fuer Fliesenlegerarbeiten (DIN 18352).\n\n══ DEINE HAUPTAUFGABE: ALLE LV-POSITIONEN EXTRAHIEREN ══\n\nDieses Dokument ist sehr wahrscheinlich ein Leistungsverzeichnis (LV), Angebot oder Vertrag. Es kann 50 bis 200 Positionen enthalten!\n\nEine LV-Position erkennt man an:\n- Positionsnummer (01.001, 1.01, Pos 3, etc.)\n- Leistungsbeschreibung\n- Menge + Einheit (m2, m, Stk, psch, lfm)\n- Optional: EP (Einzelpreis) und GP (Gesamtpreis)\n\n⚠️ KRITISCH: Zeilen die Raumnamen enthalten (Bad EG, Kueche, Flur OG) aber eine Positionsnummer und Menge haben, sind POSITIONEN! Der Raumname gehoert ins Feld "bereich". Trage solche Zeilen NICHT als Raum ein, sondern als Position!\n\nGehe JEDE SEITE durch. Lies JEDE Tabelle. Ueberspringe KEINE Position!\nAuch Zulagepositionen, Eventualpositionen, Bedarfspositionen, Grundpositionen und Alternativpositionen muessen erfasst werden.\n\n══ NEBENAUFGABE: KONTAKTDATEN ══\nSuche in Briefkoepfen, Fusszeilen, Deckblaettern nach Auftraggeber, Bauleitung, Architekt mit Adresse, Telefon, E-Mail.\n\n══ RAEUME: NUR aus separaten Raumlisten ══\nTrage Raeume NUR ein wenn eine EIGENE Raumliste/Raumbuch im Dokument existiert. Positionsbezeichnungen mit Raumnamen (z.B. "Fliesen Bad EG verlegen") zaehlen NICHT als Raum!\n\nAntworte NUR mit JSON (KEIN Markdown, KEINE Backticks):\n{"positionen":[{"pos":"01.001","bez":"VOLLSTAENDIGE Positionsbezeichnung hier","einheit":"m2","menge":45.00,"einzelpreis":32.50,"bereich":"Bad EG","kategorie":"boden","tags":["boden","fliese"]}],"kundendaten":{"auftraggeber":"","ag_adresse":"","ag_telefon":"","ag_fax":"","ag_email":"","adresse":"","baumassnahme":"","bauleitung":"","bl_adresse":"","bl_telefon":"","bl_email":"","architekt":"","arch_adresse":"","arch_telefon":"","arch_email":""},"raeume":[],"vertrag":{"auftragsnummer":"","vergabeaktenzeichen":"","vertragsdatum":"","auftragssumme":0,"skonto_prozent":0,"skonto_tage":0,"zahlungsziel_tage":30,"sicherheitseinbehalt_prozent":0}}\n\nREGELN:\n- JEDE Position MUSS in die Liste — es duerfen 200+ sein!\n- Positionsnummern EXAKT wie im Dokument\n- VOLLSTAENDIGE Bezeichnung — NICHT abkuerzen!\n- EP und GP als Zahl extrahieren wenn vorhanden\n- Raeume-Array bleibt LEER ausser es gibt eine echte separate Raumliste\n- Kontaktdaten aus dem GESAMTEN Dokument sammeln'
                                }
                            ]
                        }], 32000);
                if (!apiText) {
                    console.error('KI: Keine Antwort erhalten');
                    return null;
                }
                var cleaned = apiText.replace(/```json|```/g, '').trim();
                try {
                    var parsed = JSON.parse(cleaned);
                    console.log('KI PDF-Ergebnis:', (parsed.positionen||[]).length, 'Positionen,', Object.keys(parsed.kundendaten||{}).length, 'Kundendaten-Felder,', (parsed.raeume||[]).length, 'Räume');
                    return parsed;
                } catch (jsonErr) {
                    console.error('KI JSON-Parse Fehler. Antwort:', cleaned.substring(0, 500));
                    return null;
                }
            } catch (err) {
                console.error('KI PDF-Parser Fehler:', err);
                return null;
            }
        },

        // ══════════════════════════════════════════════
        // EXCEL PARSER (Kundenstammdaten, SheetJS)
        // ══════════════════════════════════════════════
        parseExcelKundendaten(blob) {
            return new Promise(function(resolve) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        var data = new Uint8Array(e.target.result);
                        var workbook = XLSX.read(data, { type: 'array' });
                        var result = {};

                        // Alle Sheets durchsuchen
                        workbook.SheetNames.forEach(function(name) {
                            var sheet = workbook.Sheets[name];
                            var json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

                            // Schlüssel-Wert-Paare suchen
                            json.forEach(function(row) {
                                if (!row || row.length < 2) return;
                                var key = String(row[0] || '').toLowerCase().trim();
                                var val = String(row[1] || '').trim();
                                if (!val) return;

                                if (key.match(/auftraggeber|bauherr|ag /)) result.auftraggeber = val;
                                if (key.match(/baustelle|bauvorhaben|objekt|baumaßnahme|baumassnahme/)) {
                                    result.adresse = result.adresse ? result.adresse + ', ' + val : val;
                                }
                                if (key.match(/baumass|baumaß/)) result.baumassnahme = val;
                                if (key.match(/bauleitung|bauleiter/)) result.bauleitung = val;
                                if (key.match(/architekt|planer|planungsbüro/)) result.architekt = val;
                                if (key.match(/strasse|straße|adresse|anschrift/) && !result.adresse) result.adresse = val;
                                if (key.match(/plz|ort|stadt/)) {
                                    result.adresse = (result.adresse || '') + (result.adresse ? ', ' : '') + val;
                                }
                                if (key.match(/telefon|tel\.?|fon/) && key.match(/bau/)) result.bl_telefon = val;
                                if (key.match(/email|e-mail|mail/) && key.match(/bau/)) result.bl_email = val;
                                if (key.match(/telefon|tel\.?|fon/) && key.match(/arch|plan/)) result.arch_telefon = val;
                                if (key.match(/email|e-mail|mail/) && key.match(/arch|plan/)) result.arch_email = val;
                            });
                        });
                        resolve(result);
                    } catch (err) {
                        console.error('Excel Parse Fehler:', err);
                        resolve({});
                    }
                };
                reader.onerror = function() { resolve({}); };
                reader.readAsArrayBuffer(blob);
            });
        },

        // ══════════════════════════════════════════════
        // HYBRID LV-PARSER: Regex → KI-Verfeinerung
        // ══════════════════════════════════════════════
        async parseLV(pdfBlob, onProgress) {
            var result = {
                positionen: [],
                kundendaten: {},
                raeume: [],
                quelle: 'none',
                aiVerfuegbar: false
            };

            // ══════════════════════════════════════════════
            // BEWÄHRTE STRATEGIE: KI ZUERST → Regex als Fallback
            // ══════════════════════════════════════════════

            if (this.isOnline()) {
                // ═══ ONLINE: KI macht die Hauptarbeit (PDF direkt an Gemini) ═══
                result.aiVerfuegbar = true;
                if (onProgress) onProgress('KI-Analyse läuft (optimale Erkennung)...');

                try {
                    var aiResult = await this.parseLvAIFromPdf(pdfBlob);

                    if (aiResult && aiResult.positionen && aiResult.positionen.length > 0) {
                        result.positionen = aiResult.positionen.map(function(p) {
                            return {
                                pos: String(p.pos || ''),
                                bez: String(p.bez || ''),
                                einheit: String(p.einheit || '?'),
                                menge: Number(p.menge) || 0,
                                einzelpreis: Number(p.einzelpreis) || 0,
                                bereich: String(p.bereich || 'Allgemein'),
                                kategorie: String(p.kategorie || 'allgemein'),
                                tags: Array.isArray(p.tags) ? p.tags : [],
                                quelle: 'ki'
                            };
                        });
                        result.quelle = 'ki';
                        if (aiResult.kundendaten) result.kundendaten = aiResult.kundendaten;
                        if (aiResult.raeume && aiResult.raeume.length > 0) result.raeume = aiResult.raeume;
                        if (aiResult.vertrag) result.vertrag = aiResult.vertrag;

                        if (onProgress) onProgress('KI: ' + result.positionen.length + ' Positionen erkannt ✓');
                        return result;
                    }
                } catch (err) {
                    console.warn('KI PDF-Analyse fehlgeschlagen:', err.message);
                }

                // KI-PDF hat nichts geliefert → Text + KI versuchen
                if (onProgress) onProgress('KI-Textanalyse als Fallback...');
                try {
                    var text = await this.extractPdfText(pdfBlob);
                    if (text && text.trim().length > 50) {
                        var aiTextResult = await this.parseLvAI(text, []);
                        if (aiTextResult && aiTextResult.length > 0) {
                            result.positionen = aiTextResult;
                            result.quelle = 'ki-text';
                            if (onProgress) onProgress('KI-Text: ' + result.positionen.length + ' Positionen erkannt ✓');
                            return result;
                        }
                    }
                } catch (err2) {
                    console.warn('KI Text-Analyse fehlgeschlagen:', err2.message);
                }

                // KI komplett fehlgeschlagen → Regex als Fallback
                if (onProgress) onProgress('Regex-Analyse...');
            } else {
                if (onProgress) onProgress('Offline-Modus: Regex-Analyse...');
            }

            // ═══ REGEX FALLBACK ═══
            var offlineText = await this.extractPdfText(pdfBlob);

            var regexResult = this.parseLvRegex(offlineText);
            if (regexResult.length > 0) {
                result.positionen = regexResult;
                result.quelle = 'regex';
            }

            result.kundendaten = this.parseKundendatenRegex(offlineText);
            result.raeume = this.parseRaeumeRegex(offlineText);

            var bereiche = {};
            regexResult.forEach(function(p) {
                if (p.bereich && p.bereich !== 'Allgemein') bereiche[p.bereich] = true;
            });
            Object.keys(bereiche).forEach(function(b) {
                var exists = result.raeume.some(function(r) { return r.bez.toLowerCase() === b.toLowerCase(); });
                if (!exists) {
                    result.raeume.push({ nr: '', bez: b, geschoss: '', quelle: 'lv-bereich', fliesenhoehe: 0, raumhoehe: 0, waende: [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}] });
                }
            });

            if (onProgress) onProgress('Ergebnis: ' + result.positionen.length + ' Positionen, ' + result.raeume.length + ' Räume');
            return result;
        },

        // ══════════════════════════════════════════════
        // RAUM-ERKENNUNG AUS PDF-TEXT (Offline Regex)
        // ══════════════════════════════════════════════
        parseRaeumeRegex(text) {
            if (!text || text.length < 20) return [];
            var raeume = [];
            var seen = {};
            var lines = text.split('\n');

            // Geschoss-Keywords
            var geschossRe = /\b(KG|UG|EG|OG|1\.?\s*OG|2\.?\s*OG|3\.?\s*OG|DG|Keller|Erdgeschoss|Obergeschoss|Dachgeschoss|Souterrain|Untergeschoss)\b/i;

            // Raum-Typen (deutsch, Bauwesen)
            var raumTypen = 'Bad|Badezimmer|Gäste-?WC|Gäste-?Bad|WC|Toilette|Duschbad|Dusche|Küche|Küchenzeile|Flur|Diele|Eingang|Treppenhaus|Wohnzimmer|Schlafzimmer|Kinderzimmer|Arbeitszimmer|Büro|Abstellraum|Abstellkammer|Hauswirtschaft|HWR|Hauswirtschaftsraum|Waschküche|Technikraum|Heizungsraum|Kellerraum|Keller|Garage|Carport|Balkon|Terrasse|Loggia|Wintergarten|Umkleide|Umkleiden|Sanitär|Sanitärraum|Duschraum|Nassraum|Nassbereich|Becken|Schwimmbad|Pool|Dampfbad|Sauna|Wellness|Station|Zimmer|Raum|Wohnung|Apartment|Einheit|Bereich|Foyer|Empfang|Personalraum|Gemeinschaftsraum|Hobbyraum';

            // ── Pattern 1: "Raumnummer + Bezeichnung" z.B. "0.01 Bad" oder "R 1.02 Küche" ──
            var p1 = new RegExp('(?:Raum|R\\.?|Nr\\.?)\\s*(\\d{1,3}[\\.\\,]\\d{1,3})\\s*[:\\-–]?\\s*(' + raumTypen + ')(?:\\s+(' + geschossRe.source + '))?', 'gi');

            // ── Pattern 2: "Bezeichnung + Geschoss" z.B. "Bad EG", "Küche 1.OG" ──
            var p2 = new RegExp('\\b(' + raumTypen + ')\\s+(' + geschossRe.source + ')', 'gi');

            // ── Pattern 3: "Nummer.Nummer Bezeichnung" z.B. "0.01 Bad groß" ──
            var p3 = new RegExp('^\\s*(\\d{1,2}[\\.\\,]\\d{1,3})\\s+(' + raumTypen + ')\\b(.{0,30})', 'gim');

            // ── Pattern 4: Raumblatt-Header z.B. "Raumblatt: Bad EG" oder "RAUMBLATT 3: Küche" ──
            var p4 = /Raumblatt\s*[:\-–#]?\s*(\d*)\s*[:\-–]?\s*(.{3,40})/gi;

            // ── Pattern 5: Grundriss-Labels z.B. "Bad 8,5 m²" oder "Flur 12,3m²" ──
            var p5 = new RegExp('\\b(' + raumTypen + ')\\s*(?:ca\\.?\\s*)?([\\d\\.,]+)\\s*m[²2]', 'gi');

            // ── Pattern 6: "Bereich:" Headers im LV ──
            var p6 = new RegExp('(?:Bereich|Abschnitt|Titel|Los)\\s*[:\\-–]?\\s*(.{3,50})', 'gi');

            var addRaum = function(bez, nr, geschoss, quelle, extra) {
                bez = (bez || '').trim().replace(/\s+/g, ' ');
                if (!bez || bez.length < 2) return;
                // Duplikat-Check
                var key = bez.toLowerCase().replace(/\s+/g, '');
                if (seen[key]) return;
                seen[key] = true;

                // Geschoss erkennen wenn nicht angegeben
                if (!geschoss) {
                    var gm = bez.match(geschossRe);
                    if (gm) geschoss = gm[1].toUpperCase().replace(/\s/g, '');
                }

                raeume.push({
                    nr: nr || String(raeume.length + 1),
                    bez: bez,
                    geschoss: (geschoss || '').toUpperCase().replace(/\s/g, ''),
                    quelle: quelle || 'regex',
                    fliesenhoehe: 0,
                    raumhoehe: 0,
                    waende: [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}],
                    flaeche: extra && extra.flaeche ? extra.flaeche : 0,
                });
            };

            // Patterns auf den ganzen Text anwenden
            var m;

            // Pattern 1: "Raum 0.01 Bad"
            while ((m = p1.exec(text)) !== null) {
                addRaum(m[2] + (m[3] ? ' ' + m[3] : ''), m[1], m[3], 'regex-raumnr');
            }

            // Pattern 2: "Bad EG"
            while ((m = p2.exec(text)) !== null) {
                addRaum(m[1] + ' ' + m[2], '', m[2], 'regex-typ-geschoss');
            }

            // Pattern 3: "0.01 Bad groß"
            while ((m = p3.exec(text)) !== null) {
                var extra3 = (m[3] || '').trim().replace(/[\d\.,]+\s*m[²2]?.*$/, '').trim();
                addRaum(m[2] + (extra3 ? ' ' + extra3 : ''), m[1], '', 'regex-nr-typ');
            }

            // Pattern 4: Raumblatt-Header
            while ((m = p4.exec(text)) !== null) {
                addRaum(m[2].trim(), m[1] || '', '', 'regex-raumblatt');
            }

            // Pattern 5: "Bad 8,5 m²"
            while ((m = p5.exec(text)) !== null) {
                var fl = parseFloat((m[2] || '').replace(',', '.')) || 0;
                addRaum(m[1], '', '', 'regex-flaeche', { flaeche: fl });
            }

            // Pattern 6: Bereiche
            while ((m = p6.exec(text)) !== null) {
                var bereich = m[1].trim();
                // Nur wenn es nach einem Raum klingt
                if (bereich.match(new RegExp(raumTypen, 'i')) || bereich.match(geschossRe)) {
                    addRaum(bereich, '', '', 'regex-bereich');
                }
            }

            // ── Zeilenweises Scannen für einfache Patterns ──
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (!line || line.length < 3 || line.length > 80) continue;

                // "Raum: Bad", "Raum 3: Küche EG"
                var rmatch = line.match(/^Raum\s*(?:\d+\s*)?[:\-–]\s*(.{3,40})$/i);
                if (rmatch) {
                    addRaum(rmatch[1].trim(), '', '', 'regex-zeile');
                }

                // Zeile besteht NUR aus Raumtyp + optional Geschoss (= Überschrift)
                var headMatch = line.match(new RegExp('^(' + raumTypen + ')(?:\\s+(' + geschossRe.source + '))?\\s*$', 'i'));
                if (headMatch && line.length < 40) {
                    addRaum(headMatch[1] + (headMatch[2] ? ' ' + headMatch[2] : ''), '', headMatch[2] || '', 'regex-header');
                }
            }

            return raeume;
        },

        // ══════════════════════════════════════════════
        // KI-ZEICHNUNGSANALYSE (Grundrisse → Räume)
        // ══════════════════════════════════════════════
        async analyzeDrawingForRooms(imgBlob, fileName) {
            if (!this.isOnline()) return [];
            try {
                var base64 = await new Promise(function(resolve, reject) {
                    var reader = new FileReader();
                    reader.onload = function() { resolve(reader.result.split(',')[1]); };
                    reader.onerror = function() { reject(new Error('Bild lesen fehlgeschlagen')); };
                    reader.readAsDataURL(imgBlob);
                });
                var mediaType = fileName.toLowerCase().match(/\.png$/) ? 'image/png' : 'image/jpeg';

                var apiText = await window.callAnthropicAPI([{
                            role: 'user',
                            content: [
                                { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                                { type: 'text', text: 'Du bist ein Bau-Experte. Analysiere diese Zeichnung/Grundriss/Wandansicht.\n\nExtrahiere ALLE erkennbaren Raeume mit deren Informationen.\n\nAntworte NUR mit einem JSON-Array (kein Markdown, keine Backticks):\n[{"bez":"Bad EG","nr":"0.01","geschoss":"EG","waende":[{"id":"A","l":"3.45"},{"id":"B","l":"2.10"},{"id":"C","l":"3.45"},{"id":"D","l":"2.10"}],"hoehe":0,"flaeche":7.2,"abzuege":[{"typ":"tuer","bez":"Tuer","b":0.885,"h":2.10},{"typ":"fenster","bez":"Fenster","b":1.20,"h":0.60,"tiefe":0.18}],"material":""}]\n\nRegeln:\n- bez: Raumbezeichnung wie auf der Zeichnung\n- nr: Raumnummer falls vorhanden (sonst leer)\n- geschoss: EG, OG, KG, DG etc.\n- waende: Alle Wandabschnitte mit ID (A,B,C,...) und Laenge in Metern\n- hoehe: Raumhoehe oder Fliesenhoehe falls angegeben (sonst 0)\n- flaeche: Grundflaeche in m² falls angegeben (sonst 0)\n- abzuege: Erkannte Tueren und Fenster mit Massen\n- material: Erkannte Materialangaben\n\nWenn keine Raeume erkennbar: leeres Array []\nLies ALLE Masse direkt von der Zeichnung ab!' }
                            ]
                        }], 4000);
                if (!apiText) return [];
                var cleaned = apiText.replace(/```json|```/g, '').trim();
                var parsed = JSON.parse(cleaned);
                if (Array.isArray(parsed)) {
                    return parsed.map(function(r) {
                        return {
                            nr: String(r.nr || ''),
                            bez: String(r.bez || 'Raum'),
                            geschoss: String(r.geschoss || '').toUpperCase(),
                            quelle: 'ki-zeichnung',
                            fliesenhoehe: Number(r.hoehe) || 0,
                            raumhoehe: Number(r.hoehe) || 0,
                            flaeche: Number(r.flaeche) || 0,
                            waende: Array.isArray(r.waende) ? r.waende.map(function(w) {
                                return { id: String(w.id || ''), l: String(w.l || '') };
                            }) : [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}],
                            abzuege: Array.isArray(r.abzuege) ? r.abzuege : [],
                            material: String(r.material || ''),
                            zeichnung: fileName
                        };
                    });
                }
                return [];
            } catch (err) {
                console.error('KI-Zeichnungsanalyse Fehler:', err);
                return [];
            }
        },

        // ══════════════════════════════════════════════
        // KI-RAUMBLATT-PDF-ANALYSE (Raumblätter → Räume)
        // ══════════════════════════════════════════════
        async analyzeRaumblattPdf(pdfBlob, fileName) {
            if (!this.isOnline()) return [];
            try {
                var base64 = await this.pdfToBase64(pdfBlob);
                var apiText = await window.callAnthropicAPI([{
                            role: 'user',
                            content: [
                                { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
                                { type: 'text', text: 'Du bist ein Bau-Experte fuer Fliesenarbeiten. Analysiere dieses PDF-Dokument (Raumblatt, Grundriss, Aufmass oder Zeichnung).\n\nExtrahiere ALLE erkennbaren Raeume mit deren Informationen.\n\nAntworte NUR mit JSON (kein Markdown, keine Backticks):\n{"raeume":[{"bez":"Bad EG","nr":"0.01","geschoss":"EG","waende":[{"id":"A","l":"3.45"},{"id":"B","l":"2.10"},{"id":"C","l":"3.45"},{"id":"D","l":"2.10"}],"hoehe":0,"raumhoehe":0,"flaeche":7.2,"abzuege":[{"typ":"tuer","bez":"Tuer","b":0.885,"h":2.10},{"typ":"fenster","bez":"Fenster","b":1.20,"h":0.60,"tiefe":0.18}],"material":"Bodenfliese 30x60"}]}\n\nRegeln:\n- Erkenne Raumbezeichnungen, Raumnummern, Geschosse\n- Lese alle Wandmasse ab (Laengen in Metern)\n- Erkenne Tueren und Fenster mit Massen\n- Erkenne Fliesenhoehen, Raumhoehen\n- Erkenne Materialangaben\n- Bei verwinklung Raeumen (5+ Ecken): ALLE Wandabschnitte auflisten\n- Wenn keine Raeume erkennbar: {"raeume":[]}\n- Nutze die EXAKTEN Masse aus dem Dokument!' }
                            ]
                        }], 8000);
                if (!apiText) return [];
                var cleaned = apiText.replace(/```json|```/g, '').trim();
                var parsed = JSON.parse(cleaned);
                if (parsed && parsed.raeume && Array.isArray(parsed.raeume)) {
                    return parsed.raeume.map(function(r) {
                        return {
                            nr: String(r.nr || ''),
                            bez: String(r.bez || 'Raum'),
                            geschoss: String(r.geschoss || '').toUpperCase(),
                            quelle: 'ki-raumblatt-pdf',
                            fliesenhoehe: Number(r.hoehe) || 0,
                            raumhoehe: Number(r.raumhoehe || r.hoehe) || 0,
                            flaeche: Number(r.flaeche) || 0,
                            waende: Array.isArray(r.waende) ? r.waende.map(function(w) {
                                return { id: String(w.id || ''), l: String(w.l || '') };
                            }) : [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}],
                            abzuege: Array.isArray(r.abzuege) ? r.abzuege : [],
                            material: String(r.material || ''),
                            zeichnung: fileName
                        };
                    });
                }
                return [];
            } catch (err) {
                console.error('KI-Raumblatt Fehler:', err);
                return [];
            }
        },
        async processKundenAkte(kunde, onProgress, analyseConfig) {
            var processResult = {
                positionen: [],
                kundendaten: {},
                raeume: [],
                zeichnungen: [],
                quellenInfo: [],
                fehler: [],
                vertrag: {}
            };

            // analyseConfig: { mode: 'komplett' | 'ordner', selectedFolders: ['Leistungsverzeichnis', ...], includeRootFiles: true }
            var config = analyseConfig || { mode: 'komplett', selectedFolders: null, includeRootFiles: true };

            // Alle Dateien sammeln (gefiltert nach Ordner-Auswahl)
            var allFiles = [];
            if (kunde.files && config.includeRootFiles !== false) {
                kunde.files.forEach(function(f) { allFiles.push(f); });
            }
            if (kunde.folders) {
                kunde.folders.forEach(function(folder) {
                    // Ordner-Filter: nur ausgewählte Ordner verarbeiten
                    if (config.mode === 'ordner' && config.selectedFolders) {
                        if (config.selectedFolders.indexOf(folder.name) === -1) return; // Skip
                    }
                    if (folder.files) {
                        folder.files.forEach(function(f) {
                            allFiles.push(Object.assign({}, f, { folderName: folder.name }));
                        });
                    }
                });
            }

            if (onProgress) onProgress('Dateien werden verarbeitet: 0/' + allFiles.length);

            var pdfCount = 0;
            var xlsxCount = 0;
            var imgCount = 0;

            for (var i = 0; i < allFiles.length; i++) {
                // ── ABBRUCH-PRÜFUNG ──
                if (window._analyseAbbrechen) {
                    console.log('⛔ Analyse abgebrochen bei Datei ' + (i + 1) + '/' + allFiles.length);
                    if (onProgress) onProgress('⛔ Analyse abgebrochen — ' + i + ' von ' + allFiles.length + ' Dateien verarbeitet');
                    processResult.quelle = processResult.positionen.length > 0 ? (processResult.quelle || 'teilweise') : 'abgebrochen';
                    window._analyseAbbrechen = false;
                    break;
                }
                var file = allFiles[i];
                if (onProgress) onProgress('Verarbeite ' + (i + 1) + '/' + allFiles.length + ': ' + file.name);

                try {
                    // ── PDF-Dateien: LV-Positionen + Räume extrahieren ──
                    if (file.type === 'pdf' && file.id) {
                        var pdfBlob = await window.GoogleDriveService.downloadFile(file.id);

                        // ── LV-Positionen extrahieren ──
                        var lvResult = await this.parseLV(pdfBlob, function(msg) {
                            if (onProgress) onProgress(file.name + ': ' + msg);
                        });

                        if (lvResult.positionen.length > 0) {
                            if (processResult.positionen.length === 0) {
                                processResult.positionen = lvResult.positionen;
                            } else {
                                var existingPos = {};
                                processResult.positionen.forEach(function(p) { existingPos[p.pos] = true; });
                                lvResult.positionen.forEach(function(p) {
                                    if (!existingPos[p.pos]) {
                                        processResult.positionen.push(p);
                                    }
                                });
                            }
                            processResult.quellenInfo.push({
                                datei: file.name,
                                typ: 'lv',
                                positionen: lvResult.positionen.length,
                                quelle: lvResult.quelle
                            });
                        }

                        // Kundendaten von KI übernehmen
                        if (lvResult.kundendaten) {
                            Object.keys(lvResult.kundendaten).forEach(function(key) {
                                if (lvResult.kundendaten[key] && !processResult.kundendaten[key]) {
                                    processResult.kundendaten[key] = lvResult.kundendaten[key];
                                }
                            });
                        }

                        // ── RÄUME aus PDF: KI zuerst, Regex nur offline ──
                        var existingRaumKeys = {};
                        processResult.raeume.forEach(function(r) {
                            existingRaumKeys[r.bez.toLowerCase().replace(/\s+/g, '')] = true;
                        });

                        var mergeRaeume = function(newRaeume) {
                            newRaeume.forEach(function(r) {
                                var key = r.bez.toLowerCase().replace(/\s+/g, '');
                                if (!existingRaumKeys[key]) {
                                    existingRaumKeys[key] = true;
                                    processResult.raeume.push(r);
                                } else {
                                    var existing = processResult.raeume.find(function(er) {
                                        return er.bez.toLowerCase().replace(/\s+/g, '') === key;
                                    });
                                    if (existing) {
                                        if (r.waende && r.waende.some(function(w) { return w.l && w.l !== ''; })) existing.waende = r.waende;
                                        if (r.fliesenhoehe) existing.fliesenhoehe = r.fliesenhoehe;
                                        if (r.raumhoehe) existing.raumhoehe = r.raumhoehe;
                                        if (r.abzuege && r.abzuege.length > 0) existing.abzuege = r.abzuege;
                                        if (r.material) existing.material = r.material;
                                        existing.quelle = (existing.quelle || '') + ' + ' + (r.quelle || '');
                                    }
                                }
                            });
                        };

                        // ═══ RÄUME + KUNDENDATEN: IMMER Regex, KI als Bonus ═══
                        if (onProgress) onProgress(file.name + ': Räume + Kontakte werden erkannt...');
                        var pdfText = await this.extractPdfText(pdfBlob);

                        // Regex-Extraktion IMMER ausführen (Basis)
                        var regexRaeume = this.parseRaeumeRegex(pdfText);
                        if (regexRaeume.length > 0) {
                            mergeRaeume(regexRaeume);
                        }

                        // Kundendaten per Regex IMMER extrahieren
                        var regexKunden = this.parseKundendatenRegex(pdfText);
                        if (regexKunden) {
                            Object.keys(regexKunden).forEach(function(key) {
                                if (regexKunden[key] && !processResult.kundendaten[key]) {
                                    processResult.kundendaten[key] = regexKunden[key];
                                }
                            });
                        }

                        // KI-Raumanalyse als Bonus wenn online
                        if (this.isOnline()) {
                            try {
                                if (onProgress) onProgress(file.name + ': KI analysiert Räume...');
                                var kiRaeume = await this.analyzeRaumblattPdf(pdfBlob, file.name);
                                if (kiRaeume && kiRaeume.length > 0) {
                                    mergeRaeume(kiRaeume);
                                    processResult.quellenInfo.push({ datei: file.name, typ: 'raumblatt-ki', raeume: kiRaeume.length });
                                }
                            } catch (kiErr) {
                                console.warn('KI-Raumanalyse fehlgeschlagen (Regex wird verwendet):', kiErr.message);
                            }
                        }

                        // Räume aus LV-Bereichen übernehmen (Fallback, immer)
                        if (lvResult.raeume && lvResult.raeume.length > 0) {
                            lvResult.raeume.forEach(function(r) {
                                var rName = typeof r === 'string' ? r : (r.bez || '');
                                if (!rName) return;
                                var key = rName.toLowerCase().replace(/\s+/g, '');
                                if (!existingRaumKeys[key]) {
                                    existingRaumKeys[key] = true;
                                    processResult.raeume.push(typeof r === 'string' ? {
                                        nr: '', bez: r, geschoss: '', quelle: 'lv-bereich',
                                        fliesenhoehe: 0, raumhoehe: 0,
                                        waende: [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}]
                                    } : r);
                                }
                            });
                        }

                        pdfCount++;
                    }

                    // ── Excel-Dateien: Kundenstammdaten ──
                    if (file.type === 'xlsx' && file.id) {
                        var xlBlob = await window.GoogleDriveService.downloadFile(file.id);
                        var xlData = await this.parseExcelKundendaten(xlBlob);
                        Object.keys(xlData).forEach(function(key) {
                            if (xlData[key] && !processResult.kundendaten[key]) {
                                processResult.kundendaten[key] = xlData[key];
                            }
                        });
                        processResult.quellenInfo.push({ datei: file.name, typ: 'excel' });
                        xlsxCount++;
                    }

                    // ── Bilddateien: Zeichnungen/Grundrisse → Raum-Erkennung ──
                    if (file.type === 'img' && file.id) {
                        var imgBlob = await window.GoogleDriveService.downloadFile(file.id);
                        var imgUrl = URL.createObjectURL(imgBlob);
                        processResult.zeichnungen.push({
                            name: file.name,
                            url: imgUrl,
                            blob: imgBlob,
                            folderName: file.folderName || ''
                        });

                        // KI-Zeichnungsanalyse wenn online
                        if (this.isOnline()) {
                            if (onProgress) onProgress(file.name + ': KI erkennt Räume aus Zeichnung...');
                            try {
                                var imgRaeume = await this.analyzeDrawingForRooms(imgBlob, file.name);
                                if (imgRaeume && imgRaeume.length > 0) {
                                    var existingKeys = {};
                                    processResult.raeume.forEach(function(r) { existingKeys[r.bez.toLowerCase().replace(/\s+/g, '')] = true; });
                                    imgRaeume.forEach(function(r) {
                                        var key = r.bez.toLowerCase().replace(/\s+/g, '');
                                        if (!existingKeys[key]) { existingKeys[key] = true; processResult.raeume.push(r); }
                                    });
                                    processResult.quellenInfo.push({ datei: file.name, typ: 'zeichnung-analyse', raeume: imgRaeume.length });
                                }
                            } catch (imgErr) { console.warn('Zeichnungsanalyse fehlgeschlagen:', file.name, imgErr.message); }
                        }

                        processResult.quellenInfo.push({ datei: file.name, typ: 'zeichnung' });
                        imgCount++;
                    }

                    // Word- und sonstige Dateien: KI entfernt — OrdnerAnalyseEngine analysiert diese zentral
                    if (file.type === 'doc' && file.id) {
                        processResult.quellenInfo.push({ datei: file.name, typ: 'word-skipped' });
                    }

                } catch (err) {
                    console.error('Fehler bei Datei ' + file.name + ':', err);
                    processResult.fehler.push({ datei: file.name, fehler: err.message });
                }
            }

            if (onProgress) {
                var summary = 'Fertig! ' + pdfCount + ' PDFs, ' + xlsxCount + ' Excel, ' + imgCount + ' Bilder verarbeitet';
                if (processResult.positionen.length > 0) {
                    summary += ' → ' + processResult.positionen.length + ' LV-Positionen erkannt';
                }
                onProgress(summary);
            }

            return processResult;
        }
    };

    // ═══════════════════════════════════════════════════════
    // KI-ORDNERANALYSE — IndexedDB Persistenz
    // ═══════════════════════════════════════════════════════
    window.OrdnerAnalyseDB = {
        DB_NAME: 'TWBusinessSuite_OrdnerAnalysen',
        DB_VERSION: 1,
        STORE_ANALYSEN: 'ordnerAnalysen',
        STORE_META: 'analyseMeta',
        STORE_CROSSREF: 'crossReferencing',

        _openDB: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                var req = indexedDB.open(self.DB_NAME, self.DB_VERSION);
                req.onupgradeneeded = function(e) {
                    var db = e.target.result;
                    if (!db.objectStoreNames.contains(self.STORE_ANALYSEN)) {
                        db.createObjectStore(self.STORE_ANALYSEN, { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains(self.STORE_META)) {
                        db.createObjectStore(self.STORE_META, { keyPath: 'kundenId' });
                    }
                    if (!db.objectStoreNames.contains(self.STORE_CROSSREF)) {
                        db.createObjectStore(self.STORE_CROSSREF, { keyPath: 'kundenId' });
                    }
                };
                req.onsuccess = function(e) { resolve(e.target.result); };
                req.onerror = function(e) { reject(e.target.error); };
            });
        },

        saveOrdnerAnalyse: async function(kundenId, ordnerNr, data) {
            var db = await this._openDB();
            return new Promise(function(resolve, reject) {
                var tx = db.transaction('ordnerAnalysen', 'readwrite');
                var store = tx.objectStore('ordnerAnalysen');
                var record = Object.assign({}, data, { id: kundenId + '_' + ordnerNr, kundenId: kundenId, ordnerNr: ordnerNr });
                store.put(record);
                tx.oncomplete = function() { resolve(record); };
                tx.onerror = function(e) { reject(e.target.error); };
            });
        },

        getOrdnerAnalyse: async function(kundenId, ordnerNr) {
            var db = await this._openDB();
            return new Promise(function(resolve, reject) {
                var tx = db.transaction('ordnerAnalysen', 'readonly');
                var store = tx.objectStore('ordnerAnalysen');
                var req = store.get(kundenId + '_' + ordnerNr);
                req.onsuccess = function() { resolve(req.result || null); };
                req.onerror = function(e) { reject(e.target.error); };
            });
        },

        getAllOrdnerAnalysen: async function(kundenId) {
            var db = await this._openDB();
            return new Promise(function(resolve, reject) {
                var tx = db.transaction('ordnerAnalysen', 'readonly');
                var store = tx.objectStore('ordnerAnalysen');
                var req = store.getAll();
                req.onsuccess = function() {
                    var all = req.result || [];
                    resolve(kundenId ? all.filter(function(a) { return a.kundenId === kundenId; }) : all);
                };
                req.onerror = function(e) { reject(e.target.error); };
            });
        },

        saveMeta: async function(kundenId, meta) {
            var db = await this._openDB();
            return new Promise(function(resolve, reject) {
                var tx = db.transaction('analyseMeta', 'readwrite');
                var store = tx.objectStore('analyseMeta');
                store.put(Object.assign({}, meta, { kundenId: kundenId }));
                tx.oncomplete = function() { resolve(); };
                tx.onerror = function(e) { reject(e.target.error); };
            });
        },

        getMeta: async function(kundenId) {
            var db = await this._openDB();
            return new Promise(function(resolve, reject) {
                var tx = db.transaction('analyseMeta', 'readonly');
                var req = tx.objectStore('analyseMeta').get(kundenId);
                req.onsuccess = function() { resolve(req.result || null); };
                req.onerror = function(e) { reject(e.target.error); };
            });
        },

        saveCrossRef: async function(kundenId, data) {
            var db = await this._openDB();
            return new Promise(function(resolve, reject) {
                var tx = db.transaction('crossReferencing', 'readwrite');
                tx.objectStore('crossReferencing').put(Object.assign({}, data, { kundenId: kundenId }));
                tx.oncomplete = function() { resolve(); };
                tx.onerror = function(e) { reject(e.target.error); };
            });
        },

        getCrossRef: async function(kundenId) {
            var db = await this._openDB();
            return new Promise(function(resolve, reject) {
                var tx = db.transaction('crossReferencing', 'readonly');
                var req = tx.objectStore('crossReferencing').get(kundenId);
                req.onsuccess = function() { resolve(req.result || null); };
                req.onerror = function(e) { reject(e.target.error); };
            });
        },

        getAllKundenMeta: async function() {
            var db = await this._openDB();
            return new Promise(function(resolve, reject) {
                var tx = db.transaction('analyseMeta', 'readonly');
                var req = tx.objectStore('analyseMeta').getAll();
                req.onsuccess = function() { resolve(req.result || []); };
                req.onerror = function(e) { reject(e.target.error); };
            });
        },

        deleteKundenAnalysen: async function(kundenId) {
            var db = await this._openDB();
            var analysen = await this.getAllOrdnerAnalysen(kundenId);
            var tx = db.transaction(['ordnerAnalysen', 'analyseMeta', 'crossReferencing'], 'readwrite');
            analysen.forEach(function(a) { tx.objectStore('ordnerAnalysen').delete(a.id); });
            tx.objectStore('analyseMeta').delete(kundenId);
            tx.objectStore('crossReferencing').delete(kundenId);
            return new Promise(function(resolve, reject) {
                tx.oncomplete = function() { resolve(); };
                tx.onerror = function(e) { reject(e.target.error); };
            });
        }
    };

    // ═══════════════════════════════════════════════════════
    // KI-ORDNERANALYSE — Ordner-spezifische Prompts (Gemini)
    // ═══════════════════════════════════════════════════════
    var ORDNER_PROMPTS = {
        '01': 'Du bist ein VOB-Experte für Fliesenlegerarbeiten (DIN 18352).\nAnalysiere den folgenden Text aus einer Baustellenauswertung.\n\nANTWORTE NUR ALS JSON (kein Markdown, keine Backticks).\n\nJSON-STRUKTUR:\n{\n  "ordner": "Baustellenauswertung",\n  "personen": {\n    "bauherr": { "name":"", "anschrift":"", "telefon":null, "email":null },\n    "bauherrVertreter": { "name":"", "funktion":"", "telefon":null, "email":null },\n    "architekt": { "name":"", "buero":"", "telefon":null, "email":null },\n    "bauleitung": { "name":"", "firma":"", "telefon":null, "email":null },\n    "sonstigePersonen": []\n  },\n  "lvPositionen": [{ "posNr":"", "menge":0, "einheit":"", "leistung":"", "epPreis":null, "gesamtPreis":null, "herkunft":"Baustellenauswertung" }],\n  "nachtraege": [{ "nachtragNr":"", "bezeichnung":"", "positionen":[], "summNetto":null, "status":"offen" }],\n  "projektDaten": { "bauvorhaben":"", "baustelleAdresse":"", "auftragssumme":null },\n  "warnhinweise": [],\n  "vollstaendigkeit": { "personenKomplett":true, "lvKomplett":true, "fehlendeDaten":[] }\n}\n\nWICHTIG: Jede LV-Position MUSS erfasst werden! EP-Preis rechnerisch prüfen!',

        '02': 'Du bist ein VOB-Experte für Fliesenlegerarbeiten (DIN 18352).\nAnalysiere alle Dokumente aus dem Ordner "Angebote, Nachträge, LV, Verträge".\n\n⚠ DIESER ORDNER ERFORDERT HÖCHSTE SORGFALT! ⚠\n\nANTWORTE NUR ALS JSON (kein Markdown, keine Backticks).\n\nJSON-STRUKTUR:\n{\n  "ordner": "Angebote-Nachtraege-Leistungsverzeichnis",\n  "lvPositionen": [{ "posNr":"", "menge":0, "einheit":"", "leistung":"", "kurztext":"", "epPreis":null, "gesamtPreis":null, "rechnerischGeprueft":true, "herkunft":"Angebote-Nachtraege-Leistungsverzeichnis" }],\n  "nachtraege": [{ "nachtragNr":"", "bezeichnung":"", "positionen":[], "summNetto":null, "status":"offen", "bezugHauptLV":"" }],\n  "vertrag": { "auftraggeber":"", "vertragsart":"", "auftragssumme_netto":null, "mwstSatz":19, "zahlungsbedingungen":"", "gewaehrleistung":{} },\n  "gesamtPositionsListe": { "anzahlLV":0, "anzahlNachtraege":0, "summeLVNetto":0, "gesamtSummeNetto":0 },\n  "warnhinweise": [],\n  "vollstaendigkeit": { "lvKomplett":true, "fehlendeDaten":[] }\n}\n\nKRITISCH: JEDE Position MUSS erfasst werden! Positionsnummer EXAKT übernehmen!',

        '03': 'Du bist ein Experte für Bauzeichnungen mit Fokus auf Fliesenlegerarbeiten.\nAnalysiere die Zeichnungen/Pläne und extrahiere alle Raum-Informationen.\n\nBEVORZUGT: Räume, in denen Fliesen verlegt werden sollen!\n\nANTWORTE NUR ALS JSON (kein Markdown, keine Backticks).\n\nJSON-STRUKTUR:\n{\n  "ordner": "Zeichnungen",\n  "geschosse": [{ "geschoss":"EG", "raeume": [{ "raumNr":"", "raumBezeichnung":"", "fliesenRelevant":true, "masse": { "laenge_m":0, "breite_m":0, "bodenflaeche_m2":0, "wandflaeche_m2":0 }, "fliesenArbeiten": { "boden":{}, "wand":{}, "sockel":{} } }] }],\n  "zusammenfassung": { "gesamtRaeume":0, "fliesenRaeume":0, "gesamtBodenflaeche_m2":0, "gesamtWandflaeche_m2":0 },\n  "warnhinweise": [],\n  "vollstaendigkeit": { "alleRaeumeErfasst":true, "fehlendeDaten":[] }\n}\n\nAlle Maße in METERN (m) und QUADRATMETERN (m²)!',

        '04': 'Du bist ein Experte für Baustellenabrechnung.\nAnalysiere alle Stundennachweise und fasse zusammen.\n\nANTWORTE NUR ALS JSON (kein Markdown, keine Backticks).\n\nJSON-STRUKTUR:\n{\n  "ordner": "Stundennachweis",\n  "stundenZusammenfassung": { "gesamtStunden":0, "nachMitarbeiter":[], "nachWoche":[] },\n  "materialVerbrauch": { "gesamt":[] },\n  "rechnungsVorbereitung": { "stundenSumme":0, "materialListe":[] },\n  "warnhinweise": [],\n  "vollstaendigkeit": { "lueckenloseDokumentation":true, "fehlendeDaten":[] }\n}',

        '05': 'Du bist ein Experte für Baustellendokumentation.\nAnalysiere Schriftverkehr, Mails, Protokolle und Bauzeitenplan.\n\nANTWORTE NUR ALS JSON (kein Markdown, keine Backticks).\n\nJSON-STRUKTUR:\n{\n  "ordner": "Schriftverkehr-Mail-Protokolle-Bauzeitenplan",\n  "kontaktdaten": { "neuGefunden":[], "ergaenzungenZuBekannten":[] },\n  "protokolle": [{ "datum":"", "typ":"", "relevantePunkte":[] }],\n  "bauzeitenplan": { "vorhanden":false, "twRelevant":[] },\n  "vereinbarungen": [],\n  "warnhinweise": [],\n  "vollstaendigkeit": { "kontaktdatenKomplett":true, "fehlendeDaten":[] }\n}',

        '06': 'Du bist ein Experte für VOB-konforme Bauabrechnung.\nAnalysiere alle Rechnungen und Abschlagszahlungen.\n\nANTWORTE NUR ALS JSON (kein Markdown, keine Backticks).\n\nJSON-STRUKTUR:\n{\n  "ordner": "Rechnung-A.Kontozahlung",\n  "rechnungen": [{ "rechnungsNr":"", "rechnungsTyp":"", "datum":"", "nettoBetrag":0, "bruttoBetrag":0, "positionen":[], "zahlungsStatus":"offen" }],\n  "zusammenfassung": { "anzahlRechnungen":0, "gesamtNetto":0, "gesamtBrutto":0, "gesamtBezahlt":0, "gesamtOffen":0 },\n  "warnhinweise": [],\n  "vollstaendigkeit": { "abgleichKomplett":true, "fehlendeDaten":[] }\n}',

        '07': 'Du bist ein Experte für Fliesen-Materialwirtschaft.\nAnalysiere alle Lieferantenangebote und -rechnungen.\n\nANTWORTE NUR ALS JSON (kein Markdown, keine Backticks).\n\nJSON-STRUKTUR:\n{\n  "ordner": "Lieferanten",\n  "lieferanten": [{ "firmenname":"", "ansprechpartner":"", "telefon":"", "email":"" }],\n  "fliesen": [{ "bezeichnung":"", "format":"", "menge":0, "einheit":"m²", "epPreis":0, "gesamtPreis":0 }],\n  "zubehoer": [{ "bezeichnung":"", "kategorie":"", "menge":0, "einheit":"", "epPreis":0, "gesamtPreis":0 }],\n  "kalkulationsVorbereitung": { "materialKostenGesamt":0, "nachLVPosition":[] },\n  "warnhinweise": [],\n  "vollstaendigkeit": { "alleAngebotsPositionen":true, "fehlendeDaten":[] }\n}',

        '08': 'Du bist ein VOB-Experte für Aufmaß nach DIN 18352.\nAnalysiere alle Aufmaß-Dokumente.\n\nANTWORTE NUR ALS JSON (kein Markdown, keine Backticks).\n\nJSON-STRUKTUR:\n{\n  "ordner": "Aufma\u00df",\n  "aufmassPositionen": [{ "posNr":"", "leistung":"", "einheit":"", "aufmassZeilen":[{ "raumNr":"", "berechnung":"", "ergebnis":0 }], "mengeGesamt":0, "lvMenge":null, "differenzZuLV":null }],\n  "zusammenfassung": { "anzahlPositionen":0, "gesamtBodenflaeche_m2":0, "gesamtWandflaeche_m2":0, "abweichungenZuLV":[] },\n  "warnhinweise": [],\n  "vollstaendigkeit": { "alleLVPositionenAbgerechnet":true, "fehlendeLVPositionen":[], "fehlendeDaten":[] }\n}',

        '99': 'Du bist ein VOB-Experte für Fliesenlegerarbeiten (DIN 18352).\nAnalysiere ALLE Dokumente in diesem Ordner vollständig.\nExtrahiere ALLES was du findest — es darf NICHTS verloren gehen!\n\nANTWORTE NUR ALS JSON (kein Markdown, keine Backticks).\n\nJSON-STRUKTUR:\n{\n  "ordner": "Sonstiger_Ordner",\n  "lvPositionen": [{ "posNr":"", "menge":0, "einheit":"", "leistung":"", "epPreis":null, "gesamtPreis":null }],\n  "personen": {\n    "bauherr": { "name":"", "anschrift":"", "telefon":"", "email":"" },\n    "bauleitung": { "name":"", "firma":"", "telefon":"", "email":"" },\n    "architekt": { "name":"", "buero":"", "telefon":"", "email":"" }\n  },\n  "nachtraege": [{ "nachtragNr":"", "bezeichnung":"", "summNetto":null, "status":"offen" }],\n  "projektDaten": { "bauvorhaben":"", "baustelleAdresse":"", "auftragssumme":null },\n  "vertrag": { "auftraggeber":"", "vertragsart":"", "auftragssumme_netto":null, "zahlungsbedingungen":"" },\n  "raeume": [{ "raumNr":"", "raumBezeichnung":"", "geschoss":"" }],\n  "rechnungen": [{ "rechnungsNr":"", "nettoBetrag":0, "datum":"" }],\n  "sonstigeDaten": "Freitext mit allen weiteren relevanten Informationen",\n  "warnhinweise": [],\n  "dokumentTyp": "LV|Vertrag|Nachtrag|Plan|Schriftverkehr|Aufmass|Rechnung|Sonstiges"\n}\n\nKRITISCH: Extrahiere ALLE Positionen, ALLE Kontaktdaten, ALLE Beträge!'
    };

    // ═══════════════════════════════════════════════════════
    // KI-ORDNERANALYSE — Analyse-Engine
    // ═══════════════════════════════════════════════════════
    window.OrdnerAnalyseEngine = {
        // ── Ordner-Mapping: Google Drive Folder → Ordner-Typ ──
        mapDriveFolderToOrdner: function(folderName) {
            if (!folderName) return null;
            var name = folderName.toLowerCase().trim();
            var cfg = ORDNER_ANALYSE_CONFIG.ORDNER;

            // 1. Exakte Nummer am Anfang prüfen (z.B. "01 Baustellenauswertung", "1 - Angebote")
            var numMatch = name.match(/^0?(\d)\b/);
            if (numMatch) {
                var num = numMatch[1].padStart(2, '0');
                if (cfg[num]) {
                    console.log('  📁 Ordner "' + folderName + '" → Typ ' + num + ' (via Nummer)');
                    return num;
                }
            }

            // 2. Keyword-basierte Zuordnung
            for (var nr in cfg) {
                var keywords = cfg[nr].keywords || [];
                for (var i = 0; i < keywords.length; i++) {
                    if (name.indexOf(keywords[i]) >= 0) {
                        console.log('  📁 Ordner "' + folderName + '" → Typ ' + nr + ' (via Keyword "' + keywords[i] + '")');
                        return nr;
                    }
                }
            }

            // 3. Zusätzliche flexible Patterns
            var flexMap = {
                '01': ['baustellenausw', 'baustelle', 'notebooklm', 'auswertung', 'zusammenfass', 'projekt', 'übersicht', 'uebersicht', 'allgemein', 'dokument'],
                '02': ['angebot', 'leistungs', 'lv', 'vertrag', 'nachtrag', 'vertrae', 'nachtra', 'auftrag', 'vergabe', 'vob', 'position', 'bestellung'],
                '03': ['zeichnung', 'plan', 'grundriss', 'schnitt', 'raumbuch', 'plae', 'cad', 'dwg', 'skizze', 'entwurf'],
                '04': ['stunden', 'rapportzettel', 'stundenzettel', 'arbeitszeit', 'rapport', 'zeit', 'nachweis'],
                '05': ['schrift', 'mail', 'protokoll', 'bauzeit', 'brief', 'korrespondenz', 'email', 'e-mail', 'kommunikation'],
                '06': ['rechnung', 'konto', 'zahlung', 'abschlag', 'schlussrechnung', 'invoice', 'gutschrift', 'mahnung'],
                '07': ['lieferant', 'material', 'fliese', 'zubehoer', 'zubehör', 'belag', 'keramik', 'mosaik', 'naturstein'],
                '08': ['aufma', 'abrechnung', 'mengenermittlung', 'masse', 'messung', 'ermittlung']
            };
            for (var flexNr in flexMap) {
                var flexKw = flexMap[flexNr];
                for (var fi = 0; fi < flexKw.length; fi++) {
                    if (name.indexOf(flexKw[fi]) >= 0) {
                        console.log('  📁 Ordner "' + folderName + '" → Typ ' + flexNr + ' (via Flex-Keyword "' + flexKw[fi] + '")');
                        return flexNr;
                    }
                }
            }

            console.log('  ⚠️ Ordner "' + folderName + '" → KEIN TYP ZUGEORDNET');
            return null;
        },

        // ── Hilfsfunktionen ──
        normalizeEinheit: function(einheit) {
            if (!einheit) return '';
            var map = { 'm2':'m²', 'qm':'m²', 'm²':'m²', 'm3':'m³', 'cbm':'m³', 'm³':'m³', 'stk':'Stück', 'stück':'Stück', 'st':'Stück', 'lfm':'m', 'lm':'m', 'psch':'pauschal', 'pa':'pauschal' };
            return map[einheit.toLowerCase()] || einheit;
        },

        calculateSimilarity: function(str1, str2) {
            if (!str1 || !str2) return 0;
            var words1 = new Set(str1.toLowerCase().split(/\s+/));
            var words2 = new Set(str2.toLowerCase().split(/\s+/));
            var intersection = 0;
            words1.forEach(function(w) { if (words2.has(w)) intersection++; });
            var union = new Set([...words1, ...words2]).size;
            return union === 0 ? 0 : intersection / union;
        },

        // ── Einzelnen Ordner analysieren ──
        analyzeOrdner: async function(kundenId, ordnerNr, dokumente, onProgress) {
            var prompt = ORDNER_PROMPTS[ordnerNr] || ORDNER_PROMPTS['99'];
            if (!prompt) return { status: 'error', fehler: ['Kein Prompt für Ordner ' + ordnerNr] };

            var startTime = Date.now();
            var ordnerCfg = ORDNER_ANALYSE_CONFIG.ORDNER[ordnerNr] || ORDNER_ANALYSE_CONFIG.ORDNER['99'] || { name: 'Ordner ' + ordnerNr };
            var ordnerName = ordnerCfg.name;
            console.log('📂 analyzeOrdner', ordnerNr, ordnerName, '— Dokumente:', dokumente.length, dokumente.map(function(d){return d.name + '(' + d.type + ')';}).join(', '));
            if (onProgress) onProgress('Analysiere ' + ordnerName + ' (' + dokumente.length + ' Dokumente)...');

            try {
                // Dokument-Texte sammeln
                var allTexts = [];
                var pdfBase64List = []; // Für gescannte PDFs → Vision-Fallback
                for (var i = 0; i < dokumente.length; i++) {
                    var doc = dokumente[i];
                    try {
                        // PDF-Dateien: Herunterladen + Text extrahieren
                        var isPdf = doc.type === 'pdf' || (doc.name && doc.name.toLowerCase().endsWith('.pdf'));
                        var isDoc = doc.type === 'doc' || (doc.name && (doc.name.toLowerCase().endsWith('.docx') || doc.name.toLowerCase().endsWith('.doc')));
                        var isGDoc = doc.type === 'gdoc';
                        var isGSheet = doc.type === 'gsheet';
                        var isXlsx = doc.type === 'xlsx';

                        if (isPdf && doc.id) {
                            // ── PDF: Herunterladen + Text-Extraktion, bei Fehlen → Vision-Fallback ──
                            console.log('  📄 Lade PDF:', doc.name);
                            if (onProgress) onProgress(ordnerName + ': Lade ' + doc.name + '...');
                            var blob = await window.GoogleDriveService.downloadFile(doc.id);
                            var text = '';
                            try { text = await window.FileProcessor.extractPdfText(blob); } catch(e) { text = ''; }
                            if (text && text.trim().length > 100) {
                                allTexts.push('--- Datei: ' + doc.name + ' ---\n' + text.substring(0, 15000));
                                console.log('  ✅', doc.name, '→', text.length, 'Zeichen (Text-PDF)');
                            } else {
                                // Vision-Fallback: PDF als Base64 für Gemini
                                console.log('  🔍', doc.name, '→ Kein Text (' + (text||'').length + ' Z.), nutze Vision');
                                try {
                                    var base64 = await window.FileProcessor.pdfToBase64(blob);
                                    if (base64 && base64.length > 100) {
                                        if (!pdfBase64List) pdfBase64List = [];
                                        if (pdfBase64List.length < 4) {
                                            pdfBase64List.push({ name: doc.name, base64: base64 });
                                            console.log('  📸', doc.name, '→ Vision-Fallback (' + Math.round(base64.length/1024) + ' KB)');
                                        }
                                    }
                                } catch(b64Err) { console.warn('  ❌ Base64:', doc.name, b64Err.message); }
                            }
                        } else if (isGDoc && doc.id) {
                            // ── Google Doc: Als Text exportieren ──
                            console.log('  📝 Exportiere Google Doc:', doc.name);
                            if (onProgress) onProgress(ordnerName + ': Exportiere ' + doc.name + '...');
                            try {
                                var gdocText = await window.GoogleDriveService.exportAsText(doc.id);
                                if (gdocText && gdocText.trim().length > 50) {
                                    allTexts.push('--- Datei: ' + doc.name + ' ---\n' + gdocText.substring(0, 15000));
                                    console.log('  ✅', doc.name, '→', gdocText.length, 'Zeichen exportiert');
                                }
                            } catch(gdocErr) {
                                console.warn('  ⚠️ Google Doc Export fehlgeschlagen:', doc.name, gdocErr.message);
                            }
                        } else if (isGSheet && doc.id) {
                            // ── Google Sheet: Als Text exportieren ──
                            console.log('  📊 Exportiere Google Sheet:', doc.name);
                            try {
                                var gsheetText = await window.GoogleDriveService.exportAsText(doc.id);
                                if (gsheetText && gsheetText.trim().length > 20) {
                                    allTexts.push('--- Datei: ' + doc.name + ' (Tabelle) ---\n' + gsheetText.substring(0, 15000));
                                    console.log('  ✅', doc.name, '→', gsheetText.length, 'Zeichen exportiert');
                                }
                            } catch(gsErr) { console.warn('  ⚠️ Sheet Export:', doc.name, gsErr.message); }
                        } else if (isXlsx && doc.id) {
                            // ── Excel: Herunterladen + SheetJS Text-Extraktion ──
                            console.log('  📊 Lade Excel:', doc.name);
                            try {
                                var xlBlob = await window.GoogleDriveService.downloadFile(doc.id);
                                var xlArray = await xlBlob.arrayBuffer();
                                var xlData = new Uint8Array(xlArray);
                                if (typeof XLSX !== 'undefined') {
                                    var wb = XLSX.read(xlData, { type: 'array' });
                                    var xlTexts = [];
                                    wb.SheetNames.forEach(function(sn) {
                                        var csv = XLSX.utils.sheet_to_csv(wb.Sheets[sn]);
                                        if (csv && csv.trim().length > 20) xlTexts.push('Sheet "' + sn + '":\n' + csv);
                                    });
                                    if (xlTexts.length > 0) {
                                        allTexts.push('--- Datei: ' + doc.name + ' ---\n' + xlTexts.join('\n\n').substring(0, 10000));
                                        console.log('  ✅', doc.name, '→ Excel mit', wb.SheetNames.length, 'Sheets extrahiert');
                                    }
                                }
                            } catch(xlErr) { console.warn('  ⚠️ Excel-Extraktion:', doc.name, xlErr.message); }
                        } else if (isDoc && doc.id) {
                            // ── Word: Herunterladen + an Gemini als Dokument senden (native docx-Erkennung) ──
                            console.log('  📝 Lade Word:', doc.name);
                            if (onProgress) onProgress(ordnerName + ': Lade ' + doc.name + '...');
                            try {
                                var wordBlob = await window.GoogleDriveService.downloadFile(doc.id);
                                // Methode 1: Versuche Google Drive Export als Text (funktioniert bei Google Docs)
                                var wordTextOk = false;
                                try {
                                    var wordExport = await window.GoogleDriveService.exportAsText(doc.id);
                                    if (wordExport && wordExport.trim().length > 50) {
                                        allTexts.push('--- Datei: ' + doc.name + ' ---\n' + wordExport.substring(0, 15000));
                                        console.log('  ✅', doc.name, '→', wordExport.length, 'Zeichen (Drive Export)');
                                        wordTextOk = true;
                                    }
                                } catch(expErr) { console.log('  ℹ️ Drive Export nicht möglich für', doc.name, '(normaler Upload, kein Google Doc)'); }

                                if (!wordTextOk) {
                                    // Methode 2: Einfache Text-Extraktion aus docx-ZIP
                                    var wordArray = await wordBlob.arrayBuffer();
                                    var wordView = new Uint8Array(wordArray);
                                    if (wordView[0] === 0x50 && wordView[1] === 0x4B) {
                                        var rawText = new TextDecoder('utf-8', { fatal: false }).decode(wordView);
                                        // Suche nach document.xml Inhalt (w:t Tags = Word Text)
                                        var wtMatches = rawText.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
                                        if (wtMatches && wtMatches.length > 5) {
                                            var extractedWords = wtMatches.map(function(m) { return m.replace(/<[^>]+>/g, ''); }).join(' ');
                                            if (extractedWords.length > 50) {
                                                allTexts.push('--- Datei: ' + doc.name + ' ---\n' + extractedWords.substring(0, 15000));
                                                console.log('  ✅', doc.name, '→', extractedWords.length, 'Zeichen (w:t Extraktion)');
                                                wordTextOk = true;
                                            }
                                        }
                                    }
                                }

                                if (!wordTextOk) {
                                    // Methode 3: Fallback — Word als Base64 an Gemini senden (Gemini kann docx nativ lesen)
                                    console.log('  🔍', doc.name, '→ Text-Extraktion fehlgeschlagen, nutze Gemini-Vision für Word');
                                    try {
                                        var wordBase64 = await new Promise(function(resolve, reject) {
                                            var reader = new FileReader();
                                            reader.onload = function() { resolve(reader.result.split(',')[1]); };
                                            reader.onerror = function() { reject(new Error('FileReader Fehler')); };
                                            reader.readAsDataURL(wordBlob);
                                        });
                                        if (wordBase64 && wordBase64.length > 100 && pdfBase64List.length < 6) {
                                            pdfBase64List.push({ name: doc.name, base64: wordBase64, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                                            console.log('  📸', doc.name, '→ Gemini-Inline (' + Math.round(wordBase64.length/1024) + ' KB)');
                                        }
                                    } catch(b64Err) { console.warn('  ❌ Word Base64:', doc.name, b64Err.message); }
                                }
                            } catch(wordErr) { console.warn('  ⚠️ Word-Extraktion:', doc.name, wordErr.message); }
                        } else if (doc.text) {
                            allTexts.push('--- Datei: ' + (doc.name || 'Unbekannt') + ' ---\n' + doc.text.substring(0, 10000));
                        }
                    } catch(docErr) {
                        console.warn('  ❌ Ordner ' + ordnerNr + ': Fehler bei ' + doc.name + ':', docErr.message);
                    }
                }

                console.log('📂 Ordner', ordnerNr, ':', allTexts.length, 'Texte +', pdfBase64List.length, 'Vision-PDFs von', dokumente.length, 'Dokumenten');

                if (allTexts.length === 0 && pdfBase64List.length === 0) {
                    return {
                        status: 'completed', ordnerNr: ordnerNr, ordnerName: ordnerName,
                        ergebnis: {}, dokumenteAnalysiert: 0, analyseDauer: (Date.now() - startTime) / 1000,
                        warnhinweise: ['Keine analysierbaren Dokumente im Ordner gefunden. (' + dokumente.length + ' Dateien vorhanden)']
                    };
                }

                if (onProgress) onProgress(ordnerName + ': KI analysiert ' + (allTexts.length + pdfBase64List.length) + ' Quellen...');
                var apiResult;

                if (pdfBase64List.length > 0) {
                    // ═══ VISION-MODUS: PDFs + Word-Dokumente als inline_data an Gemini ═══
                    console.log('🤖 Vision-Modus:', pdfBase64List.length, 'Dokumente +', allTexts.length, 'Texte');
                    var visionParts = [];
                    for (var pbi = 0; pbi < pdfBase64List.length; pbi++) {
                        var docMime = pdfBase64List[pbi].mimeType || 'application/pdf';
                        visionParts.push({ inline_data: { mime_type: docMime, data: pdfBase64List[pbi].base64 } });
                    }
                    var visionPrompt = prompt;
                    if (allTexts.length > 0) {
                        visionPrompt += '\n\n--- ZUSÄTZLICH EXTRAHIERTE TEXTE ---\n\n' + allTexts.join('\n\n');
                    }
                    visionPrompt += '\n\nAnalysiere die ' + pdfBase64List.length + ' Dokumente VOLLSTÄNDIG!';
                    visionParts.push({ text: visionPrompt });
                    apiResult = await window.callGeminiAPI([{ role: 'user', parts: visionParts }], 8000);
                } else {
                    // ═══ TEXT-MODUS: Nur extrahierten Text senden ═══
                    var fullText = allTexts.join('\n\n');
                    console.log('🤖 Text-Modus:', allTexts.length, 'Texte,', fullText.length, 'Zeichen');
                    apiResult = await window.callGeminiAPI([
                        { role: 'user', parts: [{ text: prompt + '\n\n--- DOKUMENTE ---\n\n' + fullText }] }
                    ], 8000);
                }

                if (!apiResult) throw new Error('Keine KI-Antwort — API Key gesetzt?');

                var cleaned = apiResult.replace(/```json|```/g, '').trim();
                var parsed;
                try { parsed = JSON.parse(cleaned); } catch(parseErr) {
                    console.warn('⚠️ JSON-Parse fehlgeschlagen, versuche Extraktion...', cleaned.substring(0, 200));
                    var jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
                    else throw new Error('KI-Antwort konnte nicht als JSON geparst werden');
                }
                console.log('✅ Ordner', ordnerNr, 'analysiert:', JSON.stringify(parsed).substring(0, 200) + '...');

                var result = {
                    status: 'completed',
                    ordnerNr: ordnerNr,
                    ordnerName: ordnerName,
                    analyseZeitpunkt: new Date().toISOString(),
                    analyseDauer: (Date.now() - startTime) / 1000,
                    dokumenteAnalysiert: allTexts.length,
                    ergebnis: parsed,
                    fehler: []
                };

                await window.OrdnerAnalyseDB.saveOrdnerAnalyse(kundenId, ordnerNr, result);
                return result;

            } catch(err) {
                console.error('❌ OrdnerAnalyse ' + ordnerNr + ' Fehler:', err);
                var errorResult = {
                    status: 'error',
                    ordnerNr: ordnerNr,
                    ordnerName: ordnerName,
                    analyseDauer: (Date.now() - startTime) / 1000,
                    dokumenteAnalysiert: 0,
                    ergebnis: {},
                    fehler: [err.message]
                };
                await window.OrdnerAnalyseDB.saveOrdnerAnalyse(kundenId, ordnerNr, errorResult);
                return errorResult;
            }
        },

        // ── Cross-Referencing: Ordnerübergreifender Vergleich ──
        runCrossReferencing: async function(kundenId) {
            var self = this;
            var analysen = {};
            for (var i = 1; i <= 8; i++) {
                var nr = String(i).padStart(2, '0');
                analysen[nr] = await window.OrdnerAnalyseDB.getOrdnerAnalyse(kundenId, nr);
            }

            var ergebnis = {
                zeitpunkt: new Date().toISOString(),
                status: 'completed',
                positionsVergleich: [],
                mengenVergleich: [],
                preisVergleich: [],
                adressVergleich: [],
                warnungen: [],
                zusammenfassung: {}
            };

            // 1. LV-Positionsvergleich (01 ↔ 02)
            var pos01 = (analysen['01'] && analysen['01'].ergebnis && analysen['01'].ergebnis.lvPositionen) || [];
            var pos02 = (analysen['02'] && analysen['02'].ergebnis && analysen['02'].ergebnis.lvPositionen) || [];

            for (var j = 0; j < pos02.length; j++) {
                var p02 = pos02[j];
                var match = pos01.find(function(p) { return p.posNr === p02.posNr; });
                if (match) {
                    var abw = [];
                    if (match.menge !== p02.menge) abw.push({ feld: 'menge', wert01: match.menge, wert02: p02.menge });
                    if (self.normalizeEinheit(match.einheit) !== self.normalizeEinheit(p02.einheit)) abw.push({ feld: 'einheit', wert01: match.einheit, wert02: p02.einheit });
                    ergebnis.positionsVergleich.push({ posNr: p02.posNr, status: abw.length > 0 ? 'abweichung' : 'match', abweichungen: abw });
                } else {
                    // Semantischer Match?
                    var semMatch = pos01.find(function(p) { return p.menge === p02.menge && self.normalizeEinheit(p.einheit) === self.normalizeEinheit(p02.einheit) && self.calculateSimilarity(p.leistung, p02.leistung) > 0.7; });
                    if (semMatch) {
                        ergebnis.positionsVergleich.push({ posNr02: p02.posNr, posNr01: semMatch.posNr, status: 'posNr_abweichung' });
                    } else {
                        ergebnis.positionsVergleich.push({ posNr: p02.posNr, status: 'nur_in_ordner02' });
                    }
                }
            }
            // Positionen nur in 01
            for (var k = 0; k < pos01.length; k++) {
                if (!pos02.find(function(p) { return p.posNr === pos01[k].posNr; })) {
                    var alreadyMatched = ergebnis.positionsVergleich.find(function(v) { return v.posNr01 === pos01[k].posNr; });
                    if (!alreadyMatched) ergebnis.positionsVergleich.push({ posNr: pos01[k].posNr, status: 'nur_in_ordner01' });
                }
            }

            // 2. Aufmaß ↔ LV (08 ↔ 02)
            var pos08 = (analysen['08'] && analysen['08'].ergebnis && analysen['08'].ergebnis.aufmassPositionen) || [];
            for (var m = 0; m < pos08.length; m++) {
                var pA = pos08[m];
                var pLV = pos02.find(function(p) { return p.posNr === pA.posNr; });
                if (pLV && pA.mengeGesamt != null && pLV.menge != null) {
                    var diff = pA.mengeGesamt - pLV.menge;
                    var pct = pLV.menge !== 0 ? (diff / pLV.menge) * 100 : 0;
                    ergebnis.mengenVergleich.push({ posNr: pA.posNr, lvMenge: pLV.menge, aufmassMenge: pA.mengeGesamt, differenz: diff, differenzProzent: pct, bewertung: Math.abs(pct) < 5 ? 'im_rahmen' : Math.abs(pct) < 15 ? 'auffaellig' : 'kritisch' });
                }
            }

            // 3. Zusammenfassung
            ergebnis.zusammenfassung = {
                positionenGeprueft: ergebnis.positionsVergleich.length,
                exaktGleich: ergebnis.positionsVergleich.filter(function(v) { return v.status === 'match'; }).length,
                abweichungen: ergebnis.positionsVergleich.filter(function(v) { return v.status === 'abweichung'; }).length,
                nurPosNrAnders: ergebnis.positionsVergleich.filter(function(v) { return v.status === 'posNr_abweichung'; }).length,
                nurInOrdner01: ergebnis.positionsVergleich.filter(function(v) { return v.status === 'nur_in_ordner01'; }).length,
                nurInOrdner02: ergebnis.positionsVergleich.filter(function(v) { return v.status === 'nur_in_ordner02'; }).length,
                mengenAbweichungenKritisch: ergebnis.mengenVergleich.filter(function(v) { return v.bewertung === 'kritisch'; }).length,
                preisAbweichungen: ergebnis.preisVergleich.length
            };
            ergebnis.zusammenfassung.gesamtFehler = ergebnis.zusammenfassung.abweichungen + ergebnis.zusammenfassung.nurInOrdner01 + ergebnis.zusammenfassung.nurInOrdner02 + ergebnis.zusammenfassung.mengenAbweichungenKritisch;

            await window.OrdnerAnalyseDB.saveCrossRef(kundenId, ergebnis);
            return ergebnis;
        },

        // ── Hauptfunktion: Alle 8 Ordner analysieren ──
        analyzeKunde: async function(kundenId, kundeName, driveFolderId, onProgress) {
            var self = this;
            var startTime = Date.now();
            console.log('═══════════════════════════════════════');
            console.log('🤖 ORDNERANALYSE GESTARTET');
            console.log('  Kunde:', kundeName);
            console.log('  Drive-Folder-ID:', driveFolderId);
            console.log('  Gemini API Key:', (localStorage.getItem('gemini_api_key') || '').substring(0, 8) + '...');
            console.log('═══════════════════════════════════════');
            if (onProgress) onProgress({ phase: 'start', message: 'Ordnerstruktur wird geladen...' });

            try {
                // 1. Ordnerinhalt laden
                var contents = await window.GoogleDriveService.listFolderContents(driveFolderId);
                var folders = contents.folders || [];
                console.log('📁 ' + folders.length + ' Unterordner gefunden:', folders.map(function(f) { return '"' + f.name + '" (' + (f.files||[]).length + ' Dateien)'; }).join(', '));
                if (contents.files && contents.files.length > 0) {
                    console.log('📄 ' + contents.files.length + ' Root-Dateien:', contents.files.map(function(f) { return f.name; }).join(', '));
                }

                // 2. Ordner → Typ zuordnen — ALLE Ordner werden analysiert!
                var ordnerMap = {};
                var unmappedCounter = 0;
                console.log('\n🔍 Ordner-Zuordnung:');
                folders.forEach(function(folder) {
                    var typ = self.mapDriveFolderToOrdner(folder.name);
                    if (typ) {
                        ordnerMap[typ] = { folder: folder, files: folder.files || [] };
                    } else {
                        // ═══ NEU: Nicht-zugeordnete Ordner als '99_X' analysieren (NICHTS ignorieren!) ═══
                        unmappedCounter++;
                        var unmappedKey = '99_' + unmappedCounter;
                        ordnerMap[unmappedKey] = { folder: folder, files: folder.files || [], customName: folder.name };
                        console.log('  📂 Ordner "' + folder.name + '" → GENERISCH (' + unmappedKey + ') — wird trotzdem analysiert!');
                    }
                });

                // ═══ NEU: Root-Dateien auch analysieren ═══
                if (contents.files && contents.files.length > 0) {
                    ordnerMap['00_root'] = { folder: { name: 'Root-Dateien' }, files: contents.files, customName: 'Dateien im Hauptordner' };
                    console.log('  📄 ' + contents.files.length + ' Root-Dateien werden auch analysiert');
                }

                var mappedCount = Object.keys(ordnerMap).length;
                console.log('\n📊 Ergebnis: ' + mappedCount + ' Ordner werden analysiert (davon ' + unmappedCounter + ' ohne Typ-Zuordnung)');
                if (mappedCount === 0) {
                    console.warn('⚠️ KEINE ORDNER UND KEINE DATEIEN GEFUNDEN!');
                    if (onProgress) onProgress({ phase: 'done', message: '⚠️ Keine Ordner und keine Dateien im Google Drive Kundenordner gefunden.' });
                    // Trotzdem Meta speichern
                    await window.OrdnerAnalyseDB.saveMeta(kundenId, {
                        kundeName: kundeName, driveFolderId: driveFolderId, status: 'completed',
                        ordnerGefunden: 0, ordnerAnalysiert: 0, gesamtDokumente: 0,
                        startZeitpunkt: new Date().toISOString(), abschlussZeitpunkt: new Date().toISOString(),
                        hinweis: 'Keine Ordner konnten zugeordnet werden. Benennung prüfen.'
                    });
                    return { analyseErgebnisse: {}, crossRef: { zusammenfassung: {} }, meta: await window.OrdnerAnalyseDB.getMeta(kundenId) };
                }

                // 3. Meta speichern
                var totalDocs = Object.values(ordnerMap).reduce(function(s, o) { return s + o.files.length; }, 0);
                await window.OrdnerAnalyseDB.saveMeta(kundenId, {
                    kundeName: kundeName,
                    driveFolderId: driveFolderId,
                    status: 'running',
                    startZeitpunkt: new Date().toISOString(),
                    ordnerGefunden: Object.keys(ordnerMap).length,
                    gesamtDokumente: totalDocs
                });

                // 4. Ordner analysieren (sequentiell, um Rate-Limits zu schonen)
                var analyseErgebnisse = {};
                var ordnerNummern = Object.keys(ordnerMap).sort();
                for (var idx = 0; idx < ordnerNummern.length; idx++) {
                    var nr = ordnerNummern[idx];
                    var ordnerInfo = ordnerMap[nr];
                    // Ordnername bestimmen: Konfiguriert oder Custom-Name
                    var baseNr = nr.split('_')[0]; // '99_1' → '99', '02' → '02', '00_root' → '00'
                    var displayName = ordnerInfo.customName || (ORDNER_ANALYSE_CONFIG.ORDNER[nr] ? ORDNER_ANALYSE_CONFIG.ORDNER[nr].name : (ORDNER_ANALYSE_CONFIG.ORDNER[baseNr] ? ORDNER_ANALYSE_CONFIG.ORDNER[baseNr].name : ordnerInfo.folder.name));
                    if (onProgress) onProgress({
                        phase: 'analyse',
                        message: displayName + ' (' + (idx + 1) + '/' + ordnerNummern.length + ')',
                        current: idx + 1,
                        total: ordnerNummern.length
                    });
                    // Prompt-Auswahl: spezifisch oder generisch ('99')
                    var promptNr = ORDNER_PROMPTS[nr] ? nr : (ORDNER_PROMPTS[baseNr] ? baseNr : '99');
                    analyseErgebnisse[nr] = await self.analyzeOrdner(kundenId, promptNr, ordnerInfo.files, function(msg) {
                        if (onProgress) onProgress({ phase: 'analyse', message: msg, current: idx + 1, total: ordnerNummern.length });
                    });
                    // Ordner-Info im Ergebnis anreichern
                    if (analyseErgebnisse[nr]) {
                        analyseErgebnisse[nr].ordnerNr = nr;
                        analyseErgebnisse[nr].ordnerName = displayName;
                    }
                }

                // 5. Cross-Referencing
                if (onProgress) onProgress({ phase: 'crossref', message: 'Cross-Referencing läuft...' });
                var crossRef = await self.runCrossReferencing(kundenId);

                // 6. Meta aktualisieren
                var completedCount = Object.values(analyseErgebnisse).filter(function(a) { return a.status === 'completed'; }).length;
                await window.OrdnerAnalyseDB.saveMeta(kundenId, {
                    kundeName: kundeName,
                    driveFolderId: driveFolderId,
                    status: 'completed',
                    startZeitpunkt: new Date().toISOString(),
                    abschlussZeitpunkt: new Date().toISOString(),
                    analyseDauerGesamt: (Date.now() - startTime) / 1000,
                    ordnerGefunden: Object.keys(ordnerMap).length,
                    ordnerAnalysiert: completedCount,
                    gesamtDokumente: totalDocs,
                    crossRefStatus: crossRef.status,
                    gesamtFehler: crossRef.zusammenfassung.gesamtFehler || 0
                });

                if (onProgress) onProgress({ phase: 'done', message: 'Analyse abgeschlossen! ' + completedCount + '/' + ordnerNummern.length + ' Ordner.' });
                return { analyseErgebnisse: analyseErgebnisse, crossRef: crossRef, meta: await window.OrdnerAnalyseDB.getMeta(kundenId) };

            } catch(err) {
                console.error('OrdnerAnalyse Kunde Fehler:', err);
                await window.OrdnerAnalyseDB.saveMeta(kundenId, {
                    kundeName: kundeName, driveFolderId: driveFolderId, status: 'error', fehler: err.message
                });
                throw err;
            }
        },

        // ── Ordner-Ergebnisse ins App-Format konvertieren ──
        // Gibt { positionen, kundendaten, raeume, zeichnungen, vertrag, quellenInfo, ordnerAnalysen } zurück
        consolidateResults: function(analyseErgebnisse) {
            var positionen = [];
            var kundendaten = {};
            var raeume = [];
            var zeichnungen = [];
            var vertrag = {};
            var quellenInfo = [];
            var nachtraege = [];

            for (var nr in analyseErgebnisse) {
                var a = analyseErgebnisse[nr];
                if (!a || a.status !== 'completed' || !a.ergebnis) continue;
                var e = a.ergebnis;
                quellenInfo.push({ ordner: nr, name: a.ordnerName, dokumente: a.dokumenteAnalysiert });

                // 01 + 02: LV-Positionen sammeln
                if (e.lvPositionen && e.lvPositionen.length > 0) {
                    e.lvPositionen.forEach(function(p) {
                        positionen.push({
                            pos: p.posNr || '', bez: p.leistung || p.kurztext || '',
                            einheit: p.einheit || '', menge: p.menge || 0,
                            einzelpreis: p.epPreis || 0, kategorie: '',
                            bereich: '', tags: [], quelle: 'ordner_' + nr
                        });
                    });
                }

                // 01: Personen → Kundendaten
                if (e.personen) {
                    var p = e.personen;
                    if (p.bauherr && p.bauherr.name) {
                        kundendaten.auftraggeber = kundendaten.auftraggeber || p.bauherr.name;
                        kundendaten.ag_adresse = kundendaten.ag_adresse || p.bauherr.anschrift || '';
                        kundendaten.ag_telefon = kundendaten.ag_telefon || p.bauherr.telefon || '';
                        kundendaten.ag_email = kundendaten.ag_email || p.bauherr.email || '';
                    }
                    if (p.bauleitung && p.bauleitung.name) {
                        kundendaten.bauleitung = kundendaten.bauleitung || p.bauleitung.name;
                        kundendaten.bl_telefon = kundendaten.bl_telefon || p.bauleitung.telefon || '';
                        kundendaten.bl_email = kundendaten.bl_email || p.bauleitung.email || '';
                    }
                    if (p.architekt && p.architekt.name) {
                        kundendaten.architekt = kundendaten.architekt || p.architekt.name;
                        kundendaten.arch_telefon = kundendaten.arch_telefon || p.architekt.telefon || '';
                        kundendaten.arch_email = kundendaten.arch_email || p.architekt.email || '';
                    }
                }

                // 01: Projektdaten
                if (e.projektDaten) {
                    kundendaten.baumassnahme = kundendaten.baumassnahme || e.projektDaten.bauvorhaben || '';
                    kundendaten.adresse = kundendaten.adresse || e.projektDaten.baustelleAdresse || '';
                }

                // 02: Vertrag
                if (e.vertrag) vertrag = e.vertrag;

                // 01 + 02: Nachträge
                if (e.nachtraege) nachtraege = nachtraege.concat(e.nachtraege);

                // 03: Räume aus Zeichnungen
                if (e.geschosse) {
                    (e.geschosse || []).forEach(function(g) {
                        (g.raeume || []).forEach(function(r) {
                            if (r.fliesenRelevant !== false) {
                                raeume.push({
                                    nr: r.raumNr || '', bez: r.raumBezeichnung || '',
                                    geschoss: g.geschoss || r.geschoss || '',
                                    raumhoehe: r.masse ? r.masse.hoehe_m || 0 : 0,
                                    fliesenhoehe: r.masse ? r.masse.hoehe_m || 0 : 0,
                                    waende: r.masse ? [
                                        {id:'A', l: r.masse.laenge_m || ''},
                                        {id:'B', l: r.masse.breite_m || ''},
                                        {id:'C', l: r.masse.laenge_m || ''},
                                        {id:'D', l: r.masse.breite_m || ''}
                                    ] : [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}]
                                });
                            }
                        });
                    });
                }

                // 05: Kontaktdaten ergänzen
                if (e.kontaktdaten && e.kontaktdaten.neuGefunden) {
                    e.kontaktdaten.neuGefunden.forEach(function(k) {
                        if (k.rolle === 'Bauherr' && k.email) kundendaten.ag_email = kundendaten.ag_email || k.email;
                        if (k.rolle === 'Bauleitung' && k.email) kundendaten.bl_email = kundendaten.bl_email || k.email;
                        if (k.rolle === 'Architekt' && k.email) kundendaten.arch_email = kundendaten.arch_email || k.email;
                    });
                }

                // ═══ GENERISCH (99): Räume als flaches Array ═══
                if (e.raeume && Array.isArray(e.raeume) && e.raeume.length > 0) {
                    e.raeume.forEach(function(r) {
                        if (typeof r === 'string') {
                            raeume.push({ nr: '', bez: r, geschoss: '', raumhoehe: 0, fliesenhoehe: 0, waende: [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}] });
                        } else if (r.raumBezeichnung || r.raumNr) {
                            raeume.push({ nr: r.raumNr || '', bez: r.raumBezeichnung || '', geschoss: r.geschoss || '', raumhoehe: 0, fliesenhoehe: 0, waende: [{id:'A',l:''},{id:'B',l:''},{id:'C',l:''},{id:'D',l:''}] });
                        }
                    });
                }

                // ═══ GENERISCH: Rechnungen sammeln ═══
                if (e.rechnungen && e.rechnungen.length > 0) {
                    if (!quellenInfo._rechnungen) quellenInfo._rechnungen = [];
                    quellenInfo._rechnungen = quellenInfo._rechnungen.concat(e.rechnungen);
                }

                // ═══ GENERISCH: Aufmaß-Positionen als LV-Positionen ═══
                if (e.aufmassPositionen && e.aufmassPositionen.length > 0) {
                    e.aufmassPositionen.forEach(function(p) {
                        positionen.push({
                            pos: p.posNr || '', bez: p.leistung || '',
                            einheit: p.einheit || '', menge: p.mengeGesamt || 0,
                            einzelpreis: 0, kategorie: '',
                            bereich: '', tags: [], quelle: 'aufmass_' + nr
                        });
                    });
                }

                // ═══ GENERISCH: Stunden-Zusammenfassung ═══
                if (e.stundenZusammenfassung) {
                    kundendaten._stundenGesamt = (kundendaten._stundenGesamt || 0) + (e.stundenZusammenfassung.gesamtStunden || 0);
                }
            }

            // Duplikate bei Positionen entfernen (gleiche posNr)
            var seenPos = {};
            positionen = positionen.filter(function(p) {
                if (!p.pos || seenPos[p.pos]) return false;
                seenPos[p.pos] = true;
                return true;
            });

            return {
                positionen: positionen,
                kundendaten: kundendaten,
                raeume: raeume,
                zeichnungen: zeichnungen,
                vertrag: vertrag,
                nachtraege: nachtraege,
                quellenInfo: quellenInfo,
                _ordnerAnalysen: analyseErgebnisse
            };
        },

        // ── Haupt-Wrapper: Analyse + Konsolidierung für die App ──
        analyzeKundeForApp: async function(kunde, onProgress) {
            var kundenId = kunde._driveFolderId || kunde.id || kunde.name;
            var kundeName = kunde.name || kunde.auftraggeber || 'Unbekannt';
            var driveFolderId = kunde._driveFolderId;

            if (!driveFolderId) throw new Error('Kein Google Drive Ordner verknüpft');

            var analyseResult = await this.analyzeKunde(kundenId, kundeName, driveFolderId, onProgress);
            var consolidated = this.consolidateResults(analyseResult.analyseErgebnisse);
            consolidated.crossRef = analyseResult.crossRef;
            consolidated.meta = analyseResult.meta;
            return consolidated;
        }
    };

    // ═══════════════════════════════════════════════════════
    // FIREBASE SERVICE
    // ═══════════════════════════════════════════════════════
    window.FirebaseService = {
        app:null, db:null, auth:null, storage:null, initialized:false, configKey:'tw_firebase_config',
        getStoredConfig() { try { var c=localStorage.getItem(this.configKey); return c?JSON.parse(c):null; } catch(e){return null;} },
        saveConfig(c) { localStorage.setItem(this.configKey,JSON.stringify(c)); },
        init(config) {
            try {
                if (this.initialized && this.app) return true;
                if (!config) config=this.getStoredConfig();
                if (!config||!config.apiKey||!config.projectId) return false;
                this.app=firebase.initializeApp({
                    apiKey:config.apiKey, authDomain:config.authDomain||config.projectId+'.firebaseapp.com',
                    databaseURL:config.databaseURL||'https://'+config.projectId+'-default-rtdb.europe-west1.firebasedatabase.app',
                    projectId:config.projectId, storageBucket:config.storageBucket||config.projectId+'.appspot.com',
                    messagingSenderId:config.messagingSenderId||'', appId:config.appId||''
                });
                this.db=firebase.database(); this.auth=firebase.auth(); this.storage=firebase.storage();
                this.initialized=true; this.saveConfig(config); return true;
            } catch(e){ console.error('Firebase:',e); return false; }
        },
        async signInAdmin() {
            var r=await this.auth.signInAnonymously(); var uid=r.user.uid;
            await this.db.ref('users/'+uid+'/role').set('admin');
            await this.db.ref('users/'+uid+'/approved').set(true);
            await this.db.ref('users/'+uid+'/profile').set({name:'Thomas Willwacher (Admin)',role:'admin'});
            return r.user;
        },
        onUsersChange(cb) {
            if(!this.db) return function(){};
            var ref=this.db.ref('users');
            var h=ref.on('value',function(snap){ var pend=[],appr=[];
                snap.forEach(function(c){ var d=c.val(); if(d&&d.profile){ var u={uid:c.key,...d}; if(d.approved) appr.push(u); else pend.push(u); }});
                cb({pending:pend,approved:appr});
            }); return function(){ref.off('value',h);};
        },
        async approveUser(uid) { await this.db.ref('users/'+uid+'/approved').set(true); },
        async rejectUser(uid) { await this.db.ref('users/'+uid).remove(); },
        async publishProject(id,data) {
            await this.db.ref('projects/'+id+'/meta').set({
                bauherr:data.bauherr||data.auftraggeber||'', baustelle:data.baustelle||data.name||'',
                adresse:data.adresse||'', planer:data.planer||'', bauleitung:data.bauleitung||'',
                status:'aktiv', publishedAt:firebase.database.ServerValue.TIMESTAMP
            });
        },
        async getProjects() {
            if(!this.db) return [];
            var s=await this.db.ref('projects').once('value'); var p=[];
            s.forEach(function(c){p.push({id:c.key,...c.val()});}); return p;
        },
        async unpublishProject(id) { await this.db.ref('projects/'+id).remove(); },
        async getSyncStatus() {
            if(!this.db) return {projects:0,users:0};
            var p=await this.db.ref('projects').once('value');
            var u=await this.db.ref('users').once('value');
            return {projects:p.numChildren(),users:u.numChildren(),lastSync:new Date().toISOString()};
        },
        async getTimesheets(pid) {
            if(!this.db) return [];
            var s=await this.db.ref('projects/'+pid+'/timesheets').once('value'); var t=[];
            s.forEach(function(c){t.push({id:c.key,...c.val()});}); return t;
        },
        async getPhotos(pid) {
            if(!this.db) return [];
            var s=await this.db.ref('projects/'+pid+'/photos').once('value'); var t=[];
            s.forEach(function(c){t.push({id:c.key,...c.val()});}); return t;
        }
    };
