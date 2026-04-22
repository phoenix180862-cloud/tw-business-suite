# LIESMICH · Baustein 11 · Cloud Functions (Übersetzung + FCM-Push)

**Datum:** 22.04.2026
**Teil des Master-App-Nachzugs (letzter Baustein!)**
**Voraussetzung:** Bausteine 1 (+Hotfix), 2–10 sind deployed
**Status:** Ausgeliefert, deploybar

> **Hinweis:** Dieser Baustein enthält **keinen Code für die Master-App**. Die ZIP ist ein eigenständiges Firebase-Functions-Projekt, das in einem separaten Verzeichnis (nicht im `tw-business-suite`-Repo) ausgerollt wird. Die Master-App merkt nichts davon — die Übersetzungen erscheinen einfach als neue Felder in Firebase, und die B6-Chat-UI schaltet den Übersetzungs-Toggle automatisch scharf.

---

## 1. Was dieser Baustein liefert

Zwei **server-seitige Cloud Functions**, beide getriggert bei jeder neuen Chat-Nachricht unter `/chats/{maId}/{nachrichtId}/`:

### 1.1 `chatTranslate` — Übersetzt in 8 Sprachen via Gemini Flash

Jede Chat-Nachricht hat ein Feld `sprache_original` (z.B. `'de'` oder `'ru'`). Diese Funktion:
1. Liest `text_original` + `sprache_original`
2. Ruft **einmal** Gemini Flash mit einem strukturierten JSON-Prompt
3. Bekommt alle 8 Zielsprachen in einer Antwort zurück
4. Schreibt für jede Sprache `text_uebersetzt/{lang}: "..."` zurück

**Sprachen**: `de, en, ru, tr, cs, es, pl, ro, uk` — 9 insgesamt. Immer werden alle außer `sprache_original` übersetzt (also 8 Ziele).

**Idempotenz:** Wenn `text_uebersetzt` bereits Einträge hat, skippt die Funktion. Damit ist ein doppeltes Auslösen (Firebase kann das gelegentlich bei Ausfällen) safe.

**Dauer**: ~1,5–3 Sekunden pro Nachricht (ein Gemini-Call für alle 8 Sprachen zusammen). Die B6-Chat-Bubble erscheint trotzdem sofort; der Übersetzungs-Toggle wird nur bei fremdsprachigen Nachrichten relevant und lädt dann live nach.

### 1.2 `chatPush` — FCM-Push bei Dringend-Büro-Nachrichten

Wenn die neue Nachricht `dringend === true` UND `von === 'buero'` ist:
1. Liest `/mitarbeiter/{maId}/geraete_uuids/` — welche Geräte hat der MA registriert
2. Liest parallel für jede UUID den `fcm_token` aus `/geraete/{uuid}/fcm_token`
3. Sendet **eine** Multicast-Notification an alle Tokens
4. **Bonus:** Tote Tokens (Gerät deinstalliert, Token abgelaufen) werden automatisch aus `/geraete/` entfernt

Das MA-Handy zeigt die Push mit:
- **Titel:** `🔔 Thomas (dringend)` (oder wie der Absender heißt)
- **Body:** Die ersten 180 Zeichen der Nachricht
- **Data-Payload:** `maId`, `nachrichtId`, `dringend: 'true'`, `von: 'buero'`, `absender`
- **Android:** High-Priority-Kanal `tw_dringend` mit Standard-Sound, Tag für Gruppierung
- **iOS:** Priority 10, Badge-Inkrement, Sound

---

## 2. Architektur-Entscheidungen

### 2.1 Region: `europe-west1` (Frankfurt)

- DSGVO-konform (innerhalb EU)
- Niedrigste Latenz zu Deutschland (<50ms zu den meisten Baustellen)
- Gleiche Region wie die Realtime-Database deines Projekts (sollte auch europe-west1 sein — wenn nicht, siehe Anmerkungen unten)

### 2.2 Runtime: Node 20

Firebase Functions v2 (neue Generation, besser skalierbar als v1). Node 20 ist LTS bis 2026.

### 2.3 Ein Gemini-Call statt acht

Naive Implementation: Für jede Zielsprache ein separater Gemini-Call (8× `translate(text, 'en')`, `translate(text, 'ru')`, …). Das wären 8× Latenz, 8× Prompt-Overhead, 8× Cost.

**Diese Implementation** macht stattdessen einen einzigen Call mit strukturiertem JSON-Output:
```
"en": "(translation)",
"ru": "(translation)",
...
```

Gemini liefert alle 8 Übersetzungen auf einmal zurück. Parse → Schreiben. ~1.5–3s total statt 8×3s = 24s. Das ist der mit Abstand größte Performance-Gewinn.

### 2.4 Secret-Management

Der Gemini API-Key wird **nicht** im Code oder in einer `.env` gespeichert. Stattdessen über `firebase functions:secrets:set GEMINI_API_KEY` im Google Secret Manager. Firebase hängt ihn bei jedem Deploy automatisch an die Function an. Vorteil: Der Key ist nie in Git, nie in Logs, nie in Backups des Source-Repos.

### 2.5 Tote Tokens aufräumen

FCM-Multicast gibt pro Token einen Status zurück. Wenn `invalid-registration-token` oder `registration-token-not-registered` kommt, ist das Gerät weg (App deinstalliert oder Token abgelaufen). Die Function räumt dann den `fcm_token` aus `/geraete/{uuid}/` weg.

Vorteil: Die Geräte-Liste bleibt sauber, ohne dass du manuell aufräumen musst. Bei der nächsten Dringend-Nachricht geht der Aufwand nicht mehr an tote Tokens. Der Geräte-Eintrag selbst bleibt (für Audit) — nur das Token-Feld ist dann `null`.

### 2.6 Separate Functions statt eine Mega-Function

`chatTranslate` und `chatPush` sind zwei eigenständige Functions mit demselben Trigger-Path. Vorteile:
- **Isolation:** Wenn die Übersetzung abstürzt (Gemini down), funktioniert Push trotzdem. Und umgekehrt.
- **Skalierung:** Max-Instances pro Function unabhängig (beide aktuell auf 10)
- **Logs:** Sauberer separiert (`firebase functions:log --only chatTranslate`)
- **Deploy:** Einzeln updateable

Nachteil: Zwei Trigger-Registrierungen kosten minimal mehr im Overhead. Vernachlässigbar.

---

## 3. Firebase-Schema-Ergänzungen

### 3.1 Was die MA-App registrieren muss (neu, falls noch nicht geschehen)

Beim Login/Start der MA-App:
```
/mitarbeiter/{maId}/geraete_uuids/{uuid}: true
/geraete/{uuid}/fcm_token: "(aktuelles Token des Geräts)"
/geraete/{uuid}/ma_id: "(redundant, zur Zuordnung)"
/geraete/{uuid}/modell: "(optional)"
/geraete/{uuid}/letzter_start: (unix-ms)
```

Die UUID ist eine lokal erzeugte Kennung des Geräts (z.B. `crypto.randomUUID()` beim ersten Start, im localStorage/secure-storage gespeichert, bleibt über Sessions hinweg gleich). Wenn der FCM-Token sich ändert (was selten passiert, aber vorkommt), überschreibt die MA-App `fcm_token`.

### 3.2 Was die Functions in Firebase schreiben

Nach `chatTranslate`:
```
/chats/{maId}/{nachrichtId}/text_uebersetzt/de: "..."
/chats/{maId}/{nachrichtId}/text_uebersetzt/en: "..."
/chats/{maId}/{nachrichtId}/text_uebersetzt/ru: "..."
... (für alle 8 Zielsprachen außer sprache_original)
```

Nach `chatPush`: nichts wird in Firebase geschrieben (außer bei toten Tokens: `/geraete/{uuid}/fcm_token: null`). Der FCM-Versand ist stateless.

### 3.3 Security-Rules

Die bestehenden Rules erlauben der MA-App bereits das Schreiben in `/chats/`. Die Functions laufen mit Admin-Privilegien und sind davon nicht betroffen. Einzige Empfehlung: **Functions dürfen text_uebersetzt überschreiben**, aber Clients nicht. Schon dadurch ist die Übersetzung unverfälscht.

Beispiel-Rule:
```
"chats": {
  "$maId": {
    "$nachrichtId": {
      ".write": "auth != null",
      "text_uebersetzt": {
        ".write": false   // nur die Function (Admin) darf das
      }
    }
  }
}
```

Die Function umgeht die Rule automatisch (Admin-SDK). Clients scheitern beim Versuch, `text_uebersetzt` zu setzen, was genau das gewünschte Verhalten ist.

---

## 4. Was du ausrollen musst (Kurzversion)

Siehe `INSTALL.md` für Details. Die Kurzform:

```bash
# 1. Node 20 + Firebase CLI (einmalig)
npm install -g firebase-tools
firebase login

# 2. ZIP entpacken nach ~/tw-cloud-functions/
# 3. .firebaserc öffnen, Projekt-ID eintragen
# 4. Dependencies installieren
cd ~/tw-cloud-functions/functions
npm install

# 5. Gemini-Key als Secret
cd ..
firebase functions:secrets:set GEMINI_API_KEY
# (Key eingeben bei Aufforderung)

# 6. Deploy
firebase deploy --only functions
```

Nach ~3 Minuten sind die Functions live. Die Master-App und MA-App müssen nicht angefasst werden — sie merken einfach, dass jetzt `text_uebersetzt`-Einträge auftauchen.

---

## 5. Live-Test

### 5.1 Übersetzung sofort testbar

Schreib in der Master-App (über Baustein 6) eine Nachricht an einen MA. Nach 2–3 Sekunden sollten unter `/chats/{maId}/{neueId}/text_uebersetzt/` alle 8 Sprachen stehen.

Oder ein russischsprachiger MA-Testeintrag direkt in Firebase-Konsole:
```
/chats/ivan/manual-test/:
  von: "ma"
  absender_name: "Ivan"
  text_original: "Добрый день! Приеду в 10:00"
  sprache_original: "ru"
  timestamp: 1745400000000
  gelesen: false
```

Nach 2–3 Sekunden erscheint `text_uebersetzt/de: "Guten Tag! Komme um 10:00"` und 7 weitere. In der B6-Bubble steht dann die deutsche Version standardmäßig, mit „Original (RU)"-Toggle.

### 5.2 Push testbar (sobald MA-App FCM registriert)

- Master-App Chat öffnen → 🔕 Dringend-Toggle klicken → wird 🔔 rot → Nachricht senden
- Auf dem MA-Handy: System-Notification erscheint, auch wenn App zu

Logs in Echtzeit beobachten:
```bash
firebase functions:log --only chatPush --follow
```

---

## 6. Geänderte Dateien

Diese ZIP enthält NUR das Cloud-Functions-Projekt, **keine Master-App-Updates**. Die ZIP geht NICHT ins `tw-business-suite`-Repo.

Inhalt:
| Datei | Zweck |
|---|---|
| `firebase.json` | Konfiguriert Firebase-CLI für Functions-Deploy |
| `.firebaserc` | Projekt-ID-Mapping (muss vom User ergänzt werden) |
| `functions/package.json` | Dependencies: firebase-admin, firebase-functions, @google/generative-ai |
| `functions/index.js` | Beide Functions (chatTranslate + chatPush) |
| `INSTALL.md` | Schritt-für-Schritt Deploy-Anleitung |
| `LIESMICH-Baustein-11.md` | Diese Datei |

---

## 7. Wichtige Anmerkungen

### 7.1 Gemini-Modell: `gemini-flash-latest`

Das Modell-Alias `gemini-flash-latest` zeigt immer auf die aktuellste Flash-Version. Aktuell (04/2026) ist das `gemini-2.5-flash`. Wenn Google ein neues Flash veröffentlicht, aktualisiert sich das automatisch ohne Code-Änderung. Falls du die Version **festpinnen** willst (z.B. bei unerwartetem Qualitäts-Regression): Im Code `model: 'gemini-2.5-flash'` explizit setzen und neu deployen.

### 7.2 Kosten-Abschätzung

Bei 200 Chat-Nachrichten/Tag:
- Gemini: 200 Requests, je ~500 Input-Tokens + ~800 Output-Tokens = **gratis** (unter der Free-Tier-Grenze)
- Functions-Invocations: 200 × 2 Functions = 400/Tag = 12.000/Monat = **gratis** (2 Mio. frei)
- FCM: komplett gratis

**Typische Monatskosten: 0 €.**

Falls die Nutzung auf 10.000 Nachrichten/Tag steigt:
- Gemini Flash Paid-Tier: ca. 0,10 $/1M Input-Tokens + 0,40 $/1M Output-Tokens
- Das sind ca. 5$/Monat bei 10.000 Nachrichten/Tag. Weiter noch extrem günstig.

### 7.3 Database-Region

Falls deine Realtime-Database NICHT in `europe-west1` (oder `europe-west-central1` = gleiche Region) liegt, musst du im Code die Function-Region anpassen. Prüfe in der Firebase-Konsole → Realtime Database → URL:
- `https://....europe-west1.firebasedatabase.app` → passt
- `https://....firebaseio.com` → das ist `us-central1`, dann in `index.js` ändern: `region: 'us-central1'`

### 7.4 Was wenn Gemini-Übersetzung mal komisch ist

Das passiert selten, aber kann: Slang, Baustellen-Abkürzungen, seltene Fachbegriffe. Der MA sieht in der Bubble trotzdem die Übersetzung UND kann mit einem Klick auf „Original (XX)" auf den Originaltext wechseln. Also: kein Daten-Verlust, nur ggf. eine Umschalt-Aktion.

Qualitativ kritisch wird es nur, wenn jemand z.B. schreibt „das Bad", und die Übersetzung das als „bad" (schlecht) interpretiert. Gemini ist aber ziemlich robust mit Kontext; im Prompt steht explizit „tile-laying business", das reicht erfahrungsgemäß.

### 7.5 Was wenn ein MA seinen Kanal auf DE will

Aktuell steuert `/mitarbeiter/{maId}/sprache` die Anzeige-Sprache in der MA-App und den Standard-Toggle in der B6-Bubble. Die Übersetzung in alle Sprachen passiert immer — die Auswahl „welche zeige ich" ist Client-Entscheidung. Das heißt: Wenn ein MA plötzlich sagt „ich kann auch Deutsch", ändert sich einfach sein Sprach-Feld; die bereits gespeicherten alten Nachrichten behalten ihre Übersetzungen, neue werden genauso verarbeitet, es zeigt nur eine andere Default-Sprache an.

### 7.6 Notfall-Plan wenn eine Function Amok läuft

Firebase rechnet dir **jede** Function-Invocation an, auch Fehler-Invocations. Wenn ein Trigger plötzlich 1 Mio-mal pro Stunde feuert (z.B. weil ein Client in einer Endlos-Schleife Nachrichten schreibt), kann das teuer werden.

Schutzmaßnahmen sind im Code drin:
- `maxInstances: 10` pro Function — mehr als 10 parallele Instanzen werden nie gestartet (Throughput-Limit)
- Kein automatisches Retry bei Fehler — Function wirft nicht, sondern loggt und kehrt `null` zurück

Falls dennoch was entgleist:
1. Firebase-Konsole → Functions → betreffende Function → „Deaktivieren"
2. Dann Ursache analysieren, fixen, wieder aktivieren

---

## 8. Was jetzt alles live ist

**Mit Baustein 11 ist der komplette Master-App-Nachzug + die neuen Features FERTIG.** Hier die Gesamtschau:

| Baustein | Titel | Status |
|---|---|---|
| B1 + Hotfix | Fundament (2-Ordner-Modell, Zeitbegrenzung, Raumerkennung-Fix) | ✅ |
| B2 | 5 Sub-Ordner + Alias-System | ✅ |
| B3 | Firebase-Schema + API-Schicht | ✅ |
| B4 | Nachrichten-Modul UI (MA-Liste + Detail) | ✅ |
| B5 | Kalender-UI (Monatsansicht + Tages-Modal) | ✅ |
| B6 | Chat-UI Büro-Seite (WhatsApp-Style) | ✅ |
| B7 | Hauptkalender (4. Button) + Baustellen-Planung | ✅ |
| B8 | Drive-Migration (Legacy-Ordnernamen) | ✅ |
| B9 | Foto-Review-Gate | ✅ |
| B10 | Stunden-Review-Gate + FreigabenHub-Tabs | ✅ |
| **B11** | **Cloud Functions (Übersetzung + FCM-Push)** | ✅ **dieser** |

**Zahlen**:
- **17 neue React-Komponenten** in der Master-App
- **~20 Firebase-API-Methoden** (Kalender, Chat, Mitarbeiter, Freigaben, Planungen)
- **~15 Drive-Helfer** (Staging, Migration, Review, Copy)
- **2 Cloud Functions** (Translate + Push)
- **9 Sprachen** (Echtzeit-Übersetzung)
- **1 einziges Team** das das alles jetzt benutzt

---

## 9. Was könnte als Nächstes kommen (über diesen Scope hinaus)

- **Cleanup-Job**: Staging-Fotos/Stunden nach Freigabe nach 30 Tagen löschen
- **Foto-Tagging**: Automatische Raum-Zuordnung via Gemini Vision beim Upload
- **Sprach-Auto-Detect**: Wenn MA beim Upload keine Sprache angibt, von Gemini erkennen lassen
- **Hauptkalender-Direktedit**: Zellen im Hauptkalender klickbar machen, damit man dort schnell Anwesenheiten setzen kann
- **Baustellen-Archivierung**: Abgeschlossene Baustellen aus dem Staging rausbekommen
- **Web-Push für Büro**: Wenn der MA dringend schreibt, Push direkt im Master-App-Browser
- **Rollen-granulierte Rechte**: Silke sieht Foto-Review, aber keine Stunden-Review. Aktuell sieht „Büro" alles.

Aber das alles kann in Ruhe kommen. Jetzt ist **der Core** durch.

---

**ENDE LIESMICH Baustein 11 · 22.04.2026**

**ENDE MASTER-APP-NACHZUG 🎉**
