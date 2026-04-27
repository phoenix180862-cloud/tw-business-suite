# LIESMICH — Skill Tab3-Positionseditor (Skill v1.0 vom 27.04.2026)

**Build:** `20260427-tab3-positionseditor`
**Datum:** 27.04.2026
**Skill:** SKILL-raumblatt-tab3-positionseditor.md (Version 1.0)
**Vorgaenger-Builds:**
- `20260427-final-skill6` — Skill 6 (Sync) — eingebaut, lief aber crash
- `20260427-skill6-hotfix` — ToolbarButton-Crash-Fix mit FigurThomas

---

## Was dieser Build neu liefert (Skill Tab3-Positionseditor)

### BLOCK A — Quick-Edit auf Tab 3 (Oeffnungen) verschoben

Direkt unterhalb der "Sonstige Bauteile"-Section auf Tab 3 (rbTab===4) erscheint
jetzt eine neue Section **"Positionen bearbeiten"**:

- Aufklappbarer Header mit Toggle-Pfeil (eingeklappt-Zustand merkt sich)
- Pro Position eine Karte mit Code, Pos-Nr, Bezeichnung, aktuellem Total-Wert
- **Modus 1 (Multi-Line-Editor)** fuer Wand/Boden/Abdichtung/Sockel-Positionen:
  - Read-Mode: Rechenweg formatiert in `<pre>` (Monospace, mit Vorschau)
  - Edit-Mode: `<textarea>` mit ~180px Hoehe, Monospace-Schrift
  - Format: `[+|-] beschreibung = wert einheit`
  - Buttons: `Bearbeiten` / `Speichern` / `Abbrechen` / `Auf Auto zurueck`
- **Modus 2 (Stueck/Meter)** fuer Code `St` und `M`:
  - Schmales `<input type="text" inputMode="numeric">` (120px breit)
  - Einheit als Label rechts daneben
  - Optional: "Auf Null"-Button

### BLOCK B — Multi-Line-Rechenweg-Parser

Neue Helper in `tw-aufmass.jsx`:

- `parseEditorText(text)` → `{ steps, total }`
  - Vorzeichen aus 1. Zeichen: `-` = Abzug (sign=-1), `+`/leer = Zurechnung
  - Trennung an `=`: links Beschreibung, rechts Wert + optionale Einheit
  - Ohne `=`: ganze Zeile wird via `parseRWZeile` als Formel ausgewertet
  - Trennlinien (`─`, `===`, `Total`, `Summe`, `Ergebnis`) werden ignoriert
- `serializeRechenweg(steps, einheit)` → string
  - Inverse Operation, fuer Default-Inhalt beim Editor-Oeffnen
  - Erste Zeile bekommt kein Vorzeichen (positiv ist implizit)

Bestehende `calcPositionResult`-Logik wird **nicht** geaendert — die Prio-1
fuer `hasManualRW && manualErgebnis > 0` greift weiterhin und nutzt
automatisch die Editor-Werte.

### BLOCK C — Tab 4 (Positionen) reduziert

Auf Tab 4 (rbTab===3) wurde geaendert:

- **Alte Quick-Edit-Section entfernt** (war auf ~80 Zeilen; mit input-Feld + Bearbeiten-Toggle)
- **Hinweis-Banner oben** (vor Raum-Zusammenfassung):
  > i Positionen werden jetzt auf Tab Oeffnungen bearbeitet (unter "Sonstige Bauteile").
  >   Hier ist nur noch die Freigabe-Uebersicht.

  Mit One-Tap-Button "Zu Oeffnungen" der direkt `setRbTab(4)` aufruft.
- **OK-Freigabe-Button gerettet:** wandert nach unten ans Ende der Raum-Zusammenfassung.
  Funktion `onPositionenInRechnungUebernehmen` bleibt unveraendert.

### Polish (Etappe 4)

- Editor-Section ist einklappbar (`posEditorCollapsed` State, Default: aufgeklappt)
- Read-Mode generiert den Rechenweg-Default jedes Render frisch via
  `buildRechenweg + enrichRechenweg` — d.h. wenn der User auf Tab 3 eine Tuer
  hinzufuegt, sieht er den neuen Tuer-Abzug sofort im Read-Mode
- Manuelle Werte (`hasManualRW=true`) bleiben erhalten und werden bevorzugt
  angezeigt (User behaelt seine Korrekturen)

---

## Was BEIBEHALTEN wurde (von vorigen Builds)

### Aus Skill 6 (Sync)
- `TWStorage.ensureKundenOrdner()` in tw-storage.js
- `KundenSyncButton`-Komponente in tw-shared-components.jsx
- Sync-Button-Einbau in Modulwahl + Akte-Modal

### Aus dem ToolbarButton-Hotfix
- `ToolbarButton`, `ToolbarRow`, `StatusPill` (= Crash-Fix)
- `FigurThomas` mit Auto, Yallah-Yallah-Sprechblase und KALASCHNIKOW-Aufdruck

---

## Test-Plan

1. **Strg+Shift+R** im Browser
2. App startet ohne Fehler-Overlay → Sentinel-Console sollte alle "function" zeigen
3. **Bauteam-Animation auf Startseite** → 3x FigurThomas mit Auto/Kalaschnikow
4. **Modulwahl** → Sync-Button-Section unter Modulen
5. **Aufmasz oeffnen** → Raumerkennung laedt (kein Crash mehr!)
6. **Raum oeffnen → Tab 3 (Oeffnungen)**
7. Nach unten scrollen — unter "Sonstige Bauteile" erscheint die neue Section **"Positionen bearbeiten"**
8. **Test Multi-Line-Editor:**
   - Eine Wand-Position auswaehlen → "Bearbeiten" → Textarea oeffnet sich mit Default-Inhalt
   - Eine Zeile aendern (z.B. "+ Heizkoerper-Verlaengerung 0,30 \u00D7 0,40 = 0,12") → Speichern
   - Total-Wert oben rechts in der Karte sollte stimmen
   - "Auf Auto zuruecksetzen" → manualRW weg, Wert berechnet sich frisch
9. **Test Stueck-Eingabe:**
   - Eine `St`-Position (z.B. Duschrinne) → kleines Zahlen-Input → "3" eingeben
   - Total: 3 Stk
10. **Test Tab 4 (Positionen):**
    - Hinweis-Banner oben sichtbar
    - One-Tap-Button "Zu Oeffnungen" funktioniert
    - Raum-Zusammenfassung unten sichtbar
    - Unten: gruener "OK in Rechnung uebernehmen"-Button
11. **Bei Fehler:** DevTools Console pruefen, `window.__twSentinel.preRenderCheck`

---

## Geaenderte Dateien (im ZIP)

| Datei | Aenderung |
|---|---|
| `tw-aufmass.jsx` | + parseEditorText, + serializeRechenweg, + 4 neue States, + 4 neue Helpers (saveEditorText/resetToAutoEditor/openEditor/setPosManualMengeDirekt), + Editor-Section JSX (~180 Zeilen), - alte Quick-Edit-Section auf Tab 4, + Hinweis-Banner, + OK-Button neu positioniert |
| `tw-shared-components.jsx` | (unveraendert seit Hotfix-Build mit FigurThomas + KundenSyncButton) |
| `tw-storage.js` | (unveraendert seit Skill 6 mit ensureKundenOrdner) |
| `tw-modulwahl.jsx` | (unveraendert) |
| `tw-app.jsx` | (unveraendert) |
| `index.html` | **PFLICHT** — frisch gebaut, vorkompiliert, ~1.464 KB |

---

## Nicht-Ziele dieses Skills (Future-Work)

Folgende Punkte sind explizit NICHT Teil dieser Lieferung (siehe Skill Punkt 13):

- Auto-Resize der Textarea beim Tippen
- Syntax-Highlighting im Editor (Vorzeichen farbig, `=` markiert)
- Undo/Redo (Strg+Z) im Editor
- Drag&Drop von Zeilen
- Vorlagen-System ("Standard-Tuer-Abzug einfuegen")
- Spracheingabe im Editor

---

## Sicherheits-Checks (alle bestanden)

- [x] Babel-Kompilierung aller geaenderten JSX-Dateien fehlerfrei
- [x] Keine Umlaute in JSX-Kommentaren der neuen Section
- [x] Kein `--` in JSX-Kommentaren
- [x] `index.html` enthaelt `div#root` genau einmal
- [x] Sentinel-Pre-Render-Check inkl. neuer Komponenten
- [x] Bundle vorkompiliert (kein `text/babel` mehr)
