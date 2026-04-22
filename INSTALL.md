# INSTALL · TW Cloud Functions · Baustein 11

**Dauer:** ca. 20–30 Minuten beim ersten Mal, ca. 3 Minuten für spätere Updates.

Diese Anleitung erklärt, wie du die zwei Cloud Functions (Übersetzung + FCM-Push) für dein bestehendes Firebase-Projekt deployst. Das ist einmalig — danach läuft das Ding autonom.

---

## 1. Voraussetzungen

| Check | Kommando (falls nicht vorhanden) |
|---|---|
| Node.js Version 20 installiert | https://nodejs.org (Download LTS) |
| Firebase CLI installiert | `npm install -g firebase-tools` |
| Firebase-Account eingeloggt | `firebase login` |
| Gemini API-Key verfügbar | https://aistudio.google.com/app/apikey |

Prüfe die Versionen mit:
```bash
node --version     # sollte v20.x.x zeigen
firebase --version # sollte 13.x.x oder höher sein
```

---

## 2. Erstmalige Einrichtung

### 2.1 ZIP entpacken

Lade die ZIP `baustein-11-cloud-functions.zip` in einen Ordner deiner Wahl, z.B. `~/tw-cloud-functions/`. Entpacke sie.

Struktur danach:
```
tw-cloud-functions/
├── firebase.json
├── .firebaserc              (← Projekt-ID muss angepasst werden)
├── INSTALL.md               (diese Datei)
├── LIESMICH-Baustein-11.md
└── functions/
    ├── package.json
    └── index.js
```

### 2.2 Projekt-ID eintragen

Öffne `.firebaserc` im Text-Editor und ersetze `DEIN-FIREBASE-PROJEKT-ID` durch deine echte Firebase-Projekt-ID (gleiche ID wie in der MA-App und in der Master-App `fbConfig`). Sie steht in der Firebase-Konsole oben im Breadcrumb und sieht typischerweise so aus: `tw-business-suite-12345`.

Die Datei sollte danach so aussehen:
```json
{
  "projects": {
    "default": "tw-business-suite-12345"
  }
}
```

### 2.3 Dependencies installieren

Im Terminal, wechsle ins `functions/`-Unterverzeichnis und installiere:
```bash
cd ~/tw-cloud-functions/functions
npm install
```

Das dauert ca. 1–2 Minuten. Keine Fehler erwartet. Danach gibt es einen `node_modules/`-Ordner (ca. 100 MB groß, wird nicht deployed).

### 2.4 Gemini API-Key als Firebase-Secret speichern

Das ist der einmalige Krampf. Von der Projekt-Wurzel (`~/tw-cloud-functions/`) aus:
```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Das Command fragt nach dem Key. Du fügst ihn ein (kein Quote drumrum nötig) und drückst Enter. Firebase speichert ihn verschlüsselt im Google Secret Manager. Die Function liest ihn zur Laufzeit automatisch.

**Wichtig:** Der Gemini-Key ist nirgendwo im Code zu sehen. Das ist Absicht, damit er nicht aus Versehen in Git landet. Beim Deploy wird er automatisch angehängt.

### 2.5 Deploy

Zurück in die Projekt-Wurzel:
```bash
cd ~/tw-cloud-functions
firebase deploy --only functions
```

Das dauert 2–5 Minuten. Firebase baut die Functions, lädt sie hoch, setzt die Trigger auf die Realtime-Database. Am Ende siehst du eine Zusammenfassung mit zwei Functions:
- `chatTranslate` — triggered on `/chats/{maId}/{nachrichtId}`
- `chatPush` — triggered on `/chats/{maId}/{nachrichtId}`

Beide in Region `europe-west1`.

---

## 3. Erstes Live-Test

### 3.1 Übersetzung testen

Schreib in der Master-App eine Chat-Nachricht an einen MA. Im besten Fall einen, dessen `sprache` in `/mitarbeiter/{id}/sprache` NICHT `de` ist (z.B. Ivan mit `ru`).

Nach ca. 2–3 Sekunden:
1. Firebase-Konsole → Realtime Database → `chats/ivan/{neue-id}/`
2. Unter `text_uebersetzt/` sollten 8 neue Einträge auftauchen (alle Sprachen außer `de`)
3. Klick auf die russische (`ru`) — dort steht die Übersetzung

In der Master-App selbst: Öffne den Chat-Tab des MAs, bei dem der Test gelaufen ist. Wenn du dem MA ein fremdsprachiges Foto schickst und er auf Russisch antwortet, siehst du die Bubble mit deutscher Übersetzung + „Original (RU)"-Toggle. Siehe Baustein 6 für die UI-Details.

### 3.2 Logs anschauen

In der Firebase-Konsole → Functions → Logs. Du siehst:
```
[chatTranslate] OK { maId: 'ivan', uebersetzungen: 8, dauerMs: 1840 }
```

Oder via CLI:
```bash
firebase functions:log --only chatTranslate
```

### 3.3 Push testen

Erst wenn die MA-App ihre FCM-Tokens registriert. Das passiert, wenn der MA in seiner App eingeloggt ist und die Push-Berechtigung erteilt hat. Der Token landet automatisch in `/geraete/{uuid}/fcm_token`.

Sobald mindestens ein Token da ist:
1. Master-App: Chat öffnen → Dringend-Toggle klicken (🔔)
2. Nachricht schreiben + senden
3. Auf dem MA-Handy: Push-Notification erscheint, auch wenn App zu ist

Logs:
```
[chatPush] OK { maId: 'ivan', tokensGesamt: 1, erfolgreich: 1 }
```

---

## 4. Updates deployen (später)

Wenn du an der `index.js` etwas änderst:
```bash
cd ~/tw-cloud-functions
firebase deploy --only functions
```

Geht ca. 2 Minuten. Die laufende Function wird atomar ausgetauscht, keine Down-Time.

---

## 5. Häufige Fehler

### 5.1 „Error: HTTP Error: 400, Invalid resource field value in the request."

Meist weil die Projekt-ID in `.firebaserc` falsch ist. Prüfe in der Firebase-Konsole → Projekteinstellungen → „Projekt-ID" und trage die exakte ID ein.

### 5.2 „functions: cannot execute deployed function — missing secret GEMINI_API_KEY"

Das Secret wurde noch nicht gesetzt. Wiederhole Schritt 2.4.

### 5.3 „FetchError: request to https://generativelanguage.googleapis.com/... failed"

Dein Gemini-API-Key ist ungültig oder das Kontingent ist aufgebraucht. Check in https://aistudio.google.com/app/apikey. Falls der Key OK ist und trotzdem Fehler kommen, prüfe in https://console.cloud.google.com → dein Projekt → Billing (manche Features brauchen eine Billing-Account-Verknüpfung, auch wenn sie innerhalb des Free-Tiers liegen).

### 5.4 „[chatPush] Keine registrierten Geraete"

Heißt schlicht: Die MA-App hat noch keinen FCM-Token gespeichert. Entweder der MA ist nicht eingeloggt oder die Push-Berechtigung wurde verweigert. Das ist kein Fehler der Function — einfach auf die MA-App-Seite schauen.

### 5.5 „HTTP-Error 403: Cloud Functions API is not enabled"

Beim allerersten Deploy kann die API erst aktiviert werden müssen:
1. https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com
2. Projekt oben auswählen
3. „Aktivieren" klicken

---

## 6. Kosten im Überblick

**Firebase Functions** (Free Tier + Blaze-Plan):
- 2 Mio. Invocations/Monat gratis
- Bei 200 Chat-Nachrichten/Tag = 6.000/Monat = 0,3% der Free-Tier-Quota

**Gemini Flash** (Free Tier):
- 15 Requests/Minute, 1.500/Tag gratis (Stand 04/2026)
- 1 Request pro Chat-Nachricht (nicht pro Sprache, weil alle 8 in einem Call kommen)
- Bei 200 Nachrichten/Tag: deutlich unter der Grenze

**FCM-Push** komplett gratis, unbegrenzt.

**Typische Monatskosten** bei normalem Betrieb: **0 €**. Das Free-Tier reicht locker.

---

## 7. Was tun bei Problemen mit Cloud Functions?

Falls mal eine Function abstürzt oder Nachrichten nicht übersetzt werden:
1. `firebase functions:log` — zeigt die letzten Logs mit Stack-Traces
2. Firebase-Konsole → Functions → Dashboards — zeigt Invocation-Counter und Fehlerraten grafisch
3. Im Zweifel: Function neu deployen: `firebase deploy --only functions:chatTranslate`
4. Im Extremfall: Function temporär deaktivieren: Firebase-Konsole → Functions → chatTranslate → ⋮ → „Deaktivieren". Der Chat funktioniert weiter, nur ohne Übersetzung. Später wieder aktivieren.

---

**ENDE INSTALL · Baustein 11 · 22.04.2026**
