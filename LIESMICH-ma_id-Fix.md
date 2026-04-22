# LIESMICH · Fix: Mitarbeiter-Mapping (ma_id)
**Datum:** 22.04.2026
**Aufbauend auf:** Baustein 10 (Stunden-Review-Gate + FreigabenHub-Tabs)
**Status:** Additiv, rückwärts-kompatibel, chirurgischer Patch (kein Neubau)

---

## Was dieser Fix liefert

Schließt den Chat-Mapping-Bug: Die Baustellen-App auf Handy/Tablet konnte keinen
Chat aufbauen, weil die Master-App bei der Geräte-Freigabe das Feld
`/users/{uid}/ma_id` nie geschrieben hat. Dadurch hing die MA-App im
Spinner **"Lade Chat..."**.

Drei Bausteine:

- **F1** — Migrations-Werkzeug für die 5 bereits existierenden Geräte ohne `ma_id`
- **F2** — Auto-Mapping beim nächsten Geräte-Freigabe-Workflow (Slug-Dropdown)
- **F3** — Warn-Banner im Team-Bereich, falls der Fall je wieder auftritt

---

## Geänderte Dateien

| Datei | Art der Änderung |
|---|---|
| `index.html` | **chirurgisch gepatcht** — B10-Stand zu 100% erhalten, nur +405 Zeilen für den Fix |
| `tw-baustelle.jsx` | +405 Zeilen (spiegelgleich zum index.html-Patch) |
| `tw-infrastructure.js` | `approveUser` um `maId`-Parameter erweitert; `skipUserMapping` neu |

**Nicht angefasst:** `tw-staging.js`, alle anderen JSX-Module, `tw-design.css`,
die 9 vorhandenen B10-Komponenten (`FreigabenHub`, `FotoFreigabenTab`,
`StundenFreigabenTab`, `StundenReviewKarte`, `StundenFreigebenDialog`,
`AblehnDialog`, `FotoReviewKarte`, `HauptkalenderView`, `MaChatThread`, etc.)

---

## Technische Details

### `tw-infrastructure.js`

**`approveUser(uid, maId)`** — erweitert:
- Setzt `approved: true` wie gehabt
- Ruft zusätzlich `setUserMaId(uid, maId)` auf (existierte bereits aus B8),
  was `ma_id` schreibt **und** `mitarbeiter/{maId}/geraete_uuids/{uid}: true` spiegelt
- Ohne `maId` wird `ma_id_skipped: true` gesetzt (Skip-Marker für Admin-Geräte)

**`skipUserMapping(uid)`** — neu:
- Setzt ausschließlich `ma_id_skipped: true` (für nachträgliches Markieren)

### `tw-baustelle.jsx` / `index.html` (Babel-Block)

**Handler:**
- `handleApprove(uid, name, maId)` — nimmt den Slug als 3. Parameter entgegen
- `handleSetMapping(uid, maId, name)` — nachträgliches Mapping via F1
- `handleSkipMapping(uid, name)` — Skip-Markierung via F1

**Subpage `'mapping'`** — neu im Routing, öffnet `<GeraeteMapping>`.

**TeamVerwaltung** — neuer Prop `onOpenMapping`, Live-Liste der Mitarbeiter
(Grundstock + Firebase), Berechnung `unmappedDevices`.

**Neue Komponenten:**
- `<PendingDeviceRow>` — Zeile in "Wartende Freigaben" mit Slug-Dropdown und
  automatischer Vorauswahl via Namens-Matching. ✓-Button ist deaktiviert, bis
  ein Slug gewählt wurde.
- `<GeraeteMapping>` — Unterseite "Geräte-Zuordnung reparieren" mit zwei
  Sektionen: "Zu reparieren" (Dropdown + Zuordnen/Nicht-Zuordnen-Buttons) und
  "Bereits erledigt" (Statusübersicht).

**F3-Warn-Banner** — oranger Banner oben in TeamVerwaltung, nur sichtbar wenn
`unmappedDevices.length > 0`. Klick → springt zur Unterseite `mapping`.

---

## Deployment

Upload in `tw-business-suite`-Repo (direkt über GitHub-Web-UI):

1. `index.html`
2. `tw-baustelle.jsx`
3. `tw-infrastructure.js`

Commit → GitHub Pages deployt in 30–60 Sek → Master-App hart neu laden (Strg+F5).

---

## Validierung

| Check | Ergebnis |
|---|---|
| Babel-Kompilierung `tw-baustelle.jsx` | ✅ Exit 0 |
| Node-Syntax-Check `tw-infrastructure.js` | ✅ Exit 0 |
| Babel-Kompilierung `index.html` Babel-Block (30.709 Zeilen) | ✅ Exit 0 |
| `div#root` in index.html | ✅ genau 1× |
| Komponenten-Namens-Kollision | ✅ keine (`PendingDeviceRow` + `GeraeteMapping` sind neu) |
| Zeilen-Diff `tw-baustelle.jsx` ↔ `index.html` | ✅ identisch (+405) |
| Kommentar-Balance `/*` vs `*/` | ✅ konsistent |
| Alle B10-Komponenten erhalten | ✅ 11/11 (FreigabenHub, FotoFreigabenTab, StundenFreigabenTab, StundenReviewKarte, StundenFreigebenDialog, AblehnDialog, FotoReviewKarte, HauptkalenderView, MaChatThread, MaKalenderJahresAnsicht, NachrichtenBereich) |

---

## Verifikation (nach Deploy)

### 1. Master-App (PC)
- Kundenakte → **Baustellen-App** → **Team**
- **Erwartung:** oben oranger Banner:
  _"5 Geräte haben keine Mitarbeiter-Zuordnung — Jetzt reparieren →"_
- Klick auf Banner → Unterseite **"Geräte-Zuordnung reparieren"** öffnet sich

### 2. Mapping durchführen
Für jedes der 5 Geräte:
- Admin-User → **thomas**
- Andere → jeweils passender Slug (ivan, michal, iurii, peter, luca, luca_am, silke)
- Klick **"Zuordnen"** → Bestätigungsdialog
- Alt-Geräte ohne Bedarf → **"Nicht zuordnen"** (Skip-Marker)

### 3. Firebase-Kontrolle
`/users/{uid}/` sollte jetzt haben:
- `ma_id: "ivan"` (bzw. gewählter Slug), oder
- `ma_id_skipped: true` bei Nicht-Zuordnung

Zusätzlich unter `/mitarbeiter/{slug}/geraete_uuids/{uid}: true`.

### 4. Tablet
- App schließen, Cache leeren, neu öffnen, PIN eingeben
- Tab **Nachrichten**: Spinner verschwindet, Chat lädt, Input aktiv

### 5. End-to-End
- Master-App sendet Testnachricht an MA → erscheint auf Tablet
- Tablet antwortet → Antwort erscheint in Master-App

### 6. Zukunfts-Test (F2)
- Nächste neue Einladung erstellen, MA registriert sich
- In "Wartende Freigaben" erscheint pro Gerät ein **Slug-Dropdown**
  mit Vorauswahl (Namens-Match)
- Slug wählen, ✓ klicken → `ma_id` wird automatisch geschrieben
- Kein manueller Nachzug im Migrations-Werkzeug mehr nötig

---

## Audit-Log

Drei Event-Typen werden geschrieben:
- `device_approved` — enthält jetzt zusätzlich `ma_id` im `details`-Feld
- `device_mapped` — neu: nachträgliches Mapping via F1
- `device_mapping_skipped` — neu: bewusst ohne Mapping markiert

---

**ENDE LIESMICH · 22.04.2026**
