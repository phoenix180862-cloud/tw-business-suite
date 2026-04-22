/**
 * ═══════════════════════════════════════════════════════════════════
 * TW BUSINESS SUITE — CLOUD FUNCTIONS (BAUSTEIN 11)
 * ═══════════════════════════════════════════════════════════════════
 *
 * Zwei Functions, beide reagieren auf neue Chat-Nachrichten unter
 * /chats/{maId}/{nachrichtId}/ in der Realtime-Database:
 *
 *   1) chatTranslate — uebersetzt text_original in 8 andere Sprachen
 *      (alle 9 ausser der Ausgangssprache) via Gemini Flash und
 *      schreibt die Ergebnisse unter text_uebersetzt/{lang}/ zurueck.
 *
 *   2) chatPush — wenn die Nachricht dringend=true & von='buero' ist,
 *      sendet FCM-Push an alle registrierten MA-Geraete, sodass der
 *      MA sie auch sieht, wenn die App geschlossen ist.
 *
 * Region: europe-west1 (Frankfurt) — DSGVO + niedrige Latenz zu DE
 * Runtime: Node 20
 * Trigger: Realtime Database v2 (onValueCreated)
 *
 * Secrets:
 *   GEMINI_API_KEY — muss via `firebase functions:secrets:set GEMINI_API_KEY`
 *   gesetzt werden (siehe INSTALL.md)
 * ═══════════════════════════════════════════════════════════════════
 */

const {onValueCreated} = require('firebase-functions/v2/database');
const {defineSecret} = require('firebase-functions/params');
const {logger} = require('firebase-functions/v2');
const admin = require('firebase-admin');
const {GoogleGenerativeAI} = require('@google/generative-ai');

admin.initializeApp();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// Alle 9 unterstuetzten Sprachen
const ALLE_SPRACHEN = ['de', 'en', 'ru', 'tr', 'cs', 'es', 'pl', 'ro', 'uk'];

// Lesbare Sprachnamen fuer den Gemini-Prompt
const SPRACH_NAMEN = {
    de: 'German (Deutsch)',
    en: 'English',
    ru: 'Russian (Русский)',
    tr: 'Turkish (Türkçe)',
    cs: 'Czech (Čeština)',
    es: 'Spanish (Español)',
    pl: 'Polish (Polski)',
    ro: 'Romanian (Română)',
    uk: 'Ukrainian (Українська)'
};


// ═══════════════════════════════════════════════════════════════════
// FUNCTION 1: chatTranslate
// ═══════════════════════════════════════════════════════════════════
// Triggered: onCreate auf /chats/{maId}/{nachrichtId}/
// Aktion:
//   - Liest text_original + sprache_original
//   - Ruft Gemini Flash fuer ALLE_SPRACHEN minus sprache_original
//   - Schreibt text_uebersetzt/{lang}/ fuer jede Zielsprache zurueck
// Idempotent: Wenn text_uebersetzt bereits Eintraege hat, skippt die Funktion.
// ═══════════════════════════════════════════════════════════════════

exports.chatTranslate = onValueCreated({
    ref: '/chats/{maId}/{nachrichtId}',
    region: 'europe-west1',
    secrets: [GEMINI_API_KEY],
    memory: '256MiB',
    timeoutSeconds: 60,
    maxInstances: 10
}, async (event) => {
    const maId = event.params.maId;
    const nachrichtId = event.params.nachrichtId;
    const nachricht = event.data.val();

    if (!nachricht || typeof nachricht !== 'object') {
        logger.warn('[chatTranslate] Kein Nachrichten-Objekt', {maId, nachrichtId});
        return null;
    }

    const textOriginal = nachricht.text_original;
    const spracheOriginal = (nachricht.sprache_original || 'de').toLowerCase();

    // Idempotenz-Check: Wenn bereits uebersetzt, skip
    if (nachricht.text_uebersetzt && Object.keys(nachricht.text_uebersetzt).length > 0) {
        logger.info('[chatTranslate] Bereits uebersetzt, skip', {maId, nachrichtId});
        return null;
    }

    if (!textOriginal || typeof textOriginal !== 'string' || textOriginal.trim() === '') {
        logger.warn('[chatTranslate] Kein text_original, skip', {maId, nachrichtId});
        return null;
    }

    // Zielsprachen bestimmen
    const zielSprachen = ALLE_SPRACHEN.filter(s => s !== spracheOriginal);
    if (zielSprachen.length === 0) {
        logger.warn('[chatTranslate] Keine Zielsprachen', {maId, nachrichtId, spracheOriginal});
        return null;
    }

    const startMs = Date.now();

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2
            }
        });

        // Prompt: einfach und strukturiert. JSON-Output mit Sprachcode-Keys.
        const quellSprachName = SPRACH_NAMEN[spracheOriginal] || spracheOriginal;
        const zielBeschreibung = zielSprachen.map(s => {
            return `  "${s}": "(translation in ${SPRACH_NAMEN[s] || s})"`;
        }).join(',\n');

        const prompt = [
            'You are a professional translator for a German tile-laying business.',
            'Context: short informal chat messages between office and construction workers.',
            '',
            `Source language: ${quellSprachName}`,
            `Source text: """${textOriginal}"""`,
            '',
            'Translate the source text into each target language.',
            'Preserve emojis, punctuation, line breaks and informal tone.',
            'Keep brand names, proper names and specific products as-is.',
            'If the source contains only emojis or symbols, copy them verbatim into all targets.',
            '',
            'Return a single JSON object. No extra text, no markdown.',
            'Schema:',
            '{',
            zielBeschreibung,
            '}'
        ].join('\n');

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        let parsed;
        try {
            parsed = JSON.parse(responseText);
        } catch (parseErr) {
            logger.error('[chatTranslate] JSON-Parse fehlgeschlagen', {
                maId, nachrichtId,
                responseText: responseText.substring(0, 500),
                parseErr: parseErr.message
            });
            return null;
        }

        // Validieren und schreiben
        const updates = {};
        let valideAnzahl = 0;
        for (const lang of zielSprachen) {
            const text = parsed[lang];
            if (typeof text === 'string' && text.trim() !== '') {
                updates['text_uebersetzt/' + lang] = text;
                valideAnzahl++;
            } else {
                logger.warn('[chatTranslate] Keine Uebersetzung fuer Sprache', {
                    maId, nachrichtId, lang
                });
            }
        }

        if (valideAnzahl === 0) {
            logger.error('[chatTranslate] Keine validen Uebersetzungen', {maId, nachrichtId});
            return null;
        }

        // Atomar in Firebase schreiben
        await event.data.ref.update(updates);

        const dauerMs = Date.now() - startMs;
        logger.info('[chatTranslate] OK', {
            maId,
            nachrichtId,
            sourceLang: spracheOriginal,
            uebersetzungen: valideAnzahl,
            dauerMs,
            originalLaenge: textOriginal.length
        });

        return null;
    } catch (err) {
        logger.error('[chatTranslate] Gemini-Fehler', {
            maId, nachrichtId,
            fehler: err.message || String(err),
            dauerMs: Date.now() - startMs
        });
        // Nicht werfen — Nachricht bleibt ohne Uebersetzung verfuegbar.
        return null;
    }
});


// ═══════════════════════════════════════════════════════════════════
// FUNCTION 2: chatPush
// ═══════════════════════════════════════════════════════════════════
// Triggered: onCreate auf /chats/{maId}/{nachrichtId}/
// Aktion:
//   - Nur wenn dringend === true && von === 'buero'
//   - Liest alle registrierten Geraete des MA
//   - Sendet FCM-Notification an alle Tokens
// Geraete-Registrierung-Pfad:
//   /mitarbeiter/{maId}/geraete_uuids/{uuid}: true
//   /geraete/{uuid}/fcm_token: "..."
// ═══════════════════════════════════════════════════════════════════

exports.chatPush = onValueCreated({
    ref: '/chats/{maId}/{nachrichtId}',
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 10
}, async (event) => {
    const maId = event.params.maId;
    const nachrichtId = event.params.nachrichtId;
    const nachricht = event.data.val();

    if (!nachricht || typeof nachricht !== 'object') {
        return null;
    }

    // Nur Buero-Nachrichten mit Dringend-Flag pushen
    if (nachricht.dringend !== true || nachricht.von !== 'buero') {
        return null;
    }

    try {
        const db = admin.database();

        // MA-Geraete lesen
        const geraeteSnap = await db.ref('mitarbeiter/' + maId + '/geraete_uuids').once('value');
        const uuidsObj = geraeteSnap.val();

        if (!uuidsObj || typeof uuidsObj !== 'object') {
            logger.info('[chatPush] Keine registrierten Geraete', {maId, nachrichtId});
            return null;
        }

        const uuids = Object.keys(uuidsObj).filter(u => uuidsObj[u]);
        if (uuids.length === 0) {
            logger.info('[chatPush] Geraete-Liste leer', {maId, nachrichtId});
            return null;
        }

        // Fuer jede UUID den FCM-Token holen (parallel)
        const tokenPromises = uuids.map(async (uuid) => {
            const tokenSnap = await db.ref('geraete/' + uuid + '/fcm_token').once('value');
            const token = tokenSnap.val();
            return {uuid, token};
        });
        const tokenResults = await Promise.all(tokenPromises);

        const validTokens = tokenResults
            .filter(r => typeof r.token === 'string' && r.token.length > 0)
            .map(r => r.token);

        if (validTokens.length === 0) {
            logger.info('[chatPush] Keine validen Tokens', {maId, nachrichtId, uuidsGefunden: uuids.length});
            return null;
        }

        // Nachrichten-Body: kurzen Auszug fuer die Notification
        const absender = nachricht.absender_name || 'Buero';
        const textFuerBody = (nachricht.text_original || '').substring(0, 180);

        const multicastMessage = {
            tokens: validTokens,
            notification: {
                title: '🔔 ' + absender + ' (dringend)',
                body: textFuerBody
            },
            data: {
                maId: String(maId),
                nachrichtId: String(nachrichtId),
                dringend: 'true',
                von: 'buero',
                absender: String(absender)
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    priority: 'high',
                    channelId: 'tw_dringend',
                    tag: 'tw_chat_' + nachrichtId
                }
            },
            apns: {
                headers: {
                    'apns-priority': '10'
                },
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                        'content-available': 1
                    }
                }
            }
        };

        const response = await admin.messaging().sendEachForMulticast(multicastMessage);

        // Kaputte Tokens identifizieren und entfernen
        const badTokens = [];
        response.responses.forEach((res, idx) => {
            if (!res.success) {
                const errCode = res.error && res.error.code;
                if (errCode === 'messaging/invalid-registration-token' ||
                    errCode === 'messaging/registration-token-not-registered') {
                    badTokens.push(validTokens[idx]);
                }
            }
        });

        // Bad tokens aus /geraete/ entfernen (best effort)
        if (badTokens.length > 0) {
            logger.info('[chatPush] Entferne tote Tokens', {maId, count: badTokens.length});
            const alleGeraete = await db.ref('geraete').once('value');
            const alleObj = alleGeraete.val() || {};
            const cleanupUpdates = {};
            for (const uuid of Object.keys(alleObj)) {
                if (alleObj[uuid] && badTokens.includes(alleObj[uuid].fcm_token)) {
                    cleanupUpdates['geraete/' + uuid + '/fcm_token'] = null;
                }
            }
            if (Object.keys(cleanupUpdates).length > 0) {
                await db.ref().update(cleanupUpdates);
            }
        }

        logger.info('[chatPush] OK', {
            maId,
            nachrichtId,
            tokensGesamt: validTokens.length,
            erfolgreich: response.successCount,
            fehlgeschlagen: response.failureCount,
            toteEntfernt: badTokens.length
        });

        return null;
    } catch (err) {
        logger.error('[chatPush] Fehler', {
            maId, nachrichtId,
            fehler: err.message || String(err)
        });
        return null;
    }
});
