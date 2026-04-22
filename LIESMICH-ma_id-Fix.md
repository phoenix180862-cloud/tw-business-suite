# TW Business Suite — Fix: Mitarbeiter-Mapping (ma_id)
## Version 22.04.2026

---

## Worum geht es

Die Baustellen-App auf Handy/Tablet zeigte bisher ewigen Spinner **"Lade Chat..."**.
Ursache: Die Master-App hat bei der Geräte-Freigabe zwar `/mitarbeiter/` und
`/chats/` in Firebase angelegt — aber **nie** das Mapping
`/users/{uid}/ma_id: "{slug}"` geschrieben. Dadurch konnte die MA-App ihren
Chat-Thread nicht finden.

Dieser Release bringt **drei Bausteine** zur vollständigen Behebung:

- **F1** — Migrations-Werkzeug für die 5 bereits existierenden Geräte ohne `ma_id`
- **F2** — Auto-Mapping beim nächsten Geräte-Freigabe-Workflow
- **F3** — Sicherheits-Check, damit der Bug **nie wieder** unbemerkt auftritt

---

## Was wurde geändert

### `tw-infrastructure.js` (Firebase-Service)

- `approveUser(uid, maId)` — erweitert: schreibt jetzt atomar `approved: true`
  **und** `ma_id: "<slug>"`. Ohne `maId` wird ein `ma_id_skipped: true`-Marker
  gesetzt (typisch für Admin-Geräte).
- `setUserMapping(uid, maId)` — **neu**: nachträgliches Setzen des Slugs für
  bereits freigegebene Geräte. Vom Migrations-Werkzeug (F1) verwendet.
- `skipUserMapping(uid)` — **neu**: markiert ein Gerät bewusst ohne Mapping,
  z.B. Admin-Gerät. Der Warn-Banner blendet es dann aus.

### `tw-baustelle.jsx` (UI + Handler)

- **F1 — Unterseite "Geräte-Zuordnung reparieren"** (neue Subpage `'mapping'`):
  Listet alle freigegebenen Geräte ohne `ma_id` auf. Pro Gerät ein lesbares
  Label (Profil-Name, Rolle, Sprache, letzter Login), verkürzte UID zur
  Kontrolle, Dropdown mit allen Mitarbeiter-Slugs aus Grundstock + Firebase.
  Buttons **"Zuordnen"** / **"Nicht zuordnen"**. Sektion "Bereits erledigt"
  zur Nachvollziehbarkeit.
- **F2 — Slug-Dropdown in "Wartende Freigaben"**: Neue Komponente
  `<PendingDeviceRow>` ersetzt die bisherige einfache Freigabe-Zeile.
  Inline-Dropdown mit allen Slugs, intelligenter Vorauswahl via Namens-Matching
  gegen das Einladungs-Profil. Der grüne Haken ist deaktiviert, solange kein
  Mitarbeiter gewählt wurde.
- **F3 — Warn-Banner** oben im Team-Bereich: Wird automatisch eingeblendet,
  sobald freigegebene (Nicht-Admin-)Geräte ohne `ma_id` und ohne Skip-Marker
  existieren. Klick auf den Banner springt direkt zum Migrations-Werkzeug.

---

## Installation

1. ZIP entpacken.
2. Folgende Dateien ins GitHub-Pages-Repo hochladen (direkt über das Web-UI):
   - `index.html` (**Pflicht** — ohne diese Datei startet die App nicht)
   - `tw-baustelle.jsx`
   - `tw-infrastructure.js`
3. Commit auf `main`. GitHub Pages deployt in ca. 30–60 Sekunden.
4. Auf dem PC die Master-App im Browser **hart neu laden** (Strg+F5).

---

## Verifikation — so prüfst du, dass es funktioniert

### 1. Master-App (PC)

1. Kundenakte öffnen → **Baustellen-App** → **Team**.
2. **Erwartung:** Oben erscheint ein **oranger Warn-Banner**:
   _"X Geräte haben keine Mitarbeiter-Zuordnung — Jetzt reparieren →"_
3. Auf den Banner klicken → Unterseite **"Geräte-Zuordnung reparieren"** öffnet sich.
4. Du siehst die 5 Geräte aus der Firebase-Console (die ohne `ma_id`).

### 2. Mapping durchführen

Für jedes Gerät:

1. Im Dropdown den passenden Mitarbeiter wählen:
   - Dein Admin-User (`role: admin`) → Slug **thomas**
   - Die anderen → jeweils passender Slug (ivan, michal, luca, luca_am, iurii, peter, silke)
2. Klick **"Zuordnen"** → Bestätigungsdialog: _"Fertig! Gerät wurde [slug] zugeordnet."_
3. Alternativ **"Nicht zuordnen"** für Alt-Geräte, die keinen Chat brauchen.

Nach Abschluss aller Zuordnungen: Warn-Banner verschwindet; "Bereits erledigt" zeigt
alle zugeordneten Geräte mit Slug-Pfeil (z.B. `→ ivan`).

### 3. Firebase-Kontrolle

In der Firebase-Console unter `/users/{uid}/` steht jetzt pro Gerät ein neues Feld:
- `ma_id: "ivan"` (bzw. der gewählte Slug)
- oder `ma_id_skipped: true` (bei "Nicht zuordnen")

### 4. Tablet-Test

1. Baustellen-App schließen, Cache leeren, neu öffnen, PIN eingeben.
2. Tab **Nachrichten** öffnen.
3. **Erwartung:**
   - Spinner verschwindet
   - Chat erscheint (leer mit "Noch keine Nachrichten" oder mit existierenden Nachrichten)
   - Input-Zeile ist **aktiv** (nicht grau)

### 5. End-to-End-Test

1. Master-App: Testnachricht an einen Mitarbeiter senden.
2. Tablet: Nachricht erscheint live.
3. Tablet: Antwort tippen und senden.
4. Master-App: Antwort erscheint.

### 6. Zukunfts-Test (F2)

Beim nächsten Mal, wenn du eine neue Einladung erstellst und der Mitarbeiter
sein Gerät registriert:

1. In "Wartende Geräte-Freigaben" erscheint jetzt pro Gerät ein **Slug-Dropdown**
   mit Vorauswahl (falls der Profil-Name zu einem Slug passt).
2. Wähle den Slug und klicke ✓ → `ma_id` wird automatisch geschrieben.
3. Kein manueller Nachzug im Migrations-Werkzeug mehr nötig.

---

## Was **nicht** angefasst wurde

- Die Baustellen-App (MA-App) selbst — die ist fertig und bleibt unverändert.
- Die Einladungs-Logik (Slug wird nicht aus `inv.mitarbeiter`-Name abgeleitet;
  stattdessen frägt F2 den Admin beim Freigeben explizit per Dropdown).
- Security Rules.

---

## Dateien im ZIP

- `index.html` — frisch gebaut (~26.300 Zeilen, monolithisch)
- `tw-baustelle.jsx` — mit F1+F2+F3-UI
- `tw-infrastructure.js` — mit erweitertem Firebase-Service
- `LIESMICH-ma_id-Fix.md` — dieses Dokument

---

## Audit-Log

Alle Mapping-Aktionen werden in den bestehenden Audit-Log geschrieben:

- `device_approved` — enthält jetzt zusätzlich `ma_id` im `details`-Feld
- `device_mapped` — **neu**: nachträgliche Zuordnung via Migrations-Werkzeug
- `device_mapping_skipped` — **neu**: Gerät bewusst ohne Mapping markiert

Die bestehende Audit-Anzeige im Team-Bereich loggt diese Events automatisch
(Standardtext "unknown" — bei Bedarf kann die Darstellung in einem späteren
Release um hübsche Icons/Labels für die neuen Event-Typen erweitert werden).
