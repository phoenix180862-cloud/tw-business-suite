# TW Business Suite — Aufmasz-Code-System (FINALE Auslieferung)

**Version:** 1.0
**Datum:** 27.04.2026
**Build:** 20260427-183154
**Status:** Saubere Auslieferung — Source ist selbsttragend, keine Workarounds.

> Diese Auslieferung ersetzt das vorherige `tw-aufmasscode-HOTFIX.zip`.
> Der Inline-Hotfix wurde entfernt, da das Source-Drift-Problem jetzt
> dauerhaft im JSX behoben ist.

---

## Aenderungen gegenueber dem letzten produktiven Stand

### 1. Aufmasz-Code-System (Hauptarbeit)

Das `aufmasscode`-Feld in der Daten-Uebersicht wird jetzt im Aufmasz-Modul
ausgewertet. 9 Codes (`W`, `B`, `M`, `St`, `MU`, `AW`, `AB`, `S`, `AS`)
mit prioritaer-Auswertung vor `pos.kategorie`. Backwards-Compatibility
fuer alle bestehenden Positionen ohne Code ist garantiert.

Details siehe `SKILL-aufmasscode-system.md`.

### 2. Source-Drift-Reparatur (zusaetzlich)

`StatusPill`, `ToolbarButton`, `ToolbarRow` waren in der Live-`index.html`
als pre-kompiliertes JS vorhanden, fehlten aber in der JSX-Source. Beim
Re-Build hat das einen `ReferenceError` ausgeloest. Reparatur: alle drei
Komponenten sind jetzt als sauberes JSX in `tw-shared-components.jsx`
implementiert. **Die Source ist damit wieder selbsttragend.**

Drift-Check (Stand 27.04.2026): Keine weiteren fehlenden Komponenten.

---

## Was ist im ZIP?

| Datei | Status |
|-------|--------|
| `index.html` | **Frisch gebaut**, Pre-kompiliert mit Babel-CLI, Build 20260427-183154 |
| `tw-aufmass.jsx` | Aufmasscode-System + Quick-Edit + Foto-Persistenz + Warnschild + WIP-Resume |
| `tw-shared-components.jsx` | + StatusPill, ToolbarButton, ToolbarRow als JSX (Source-Drift-Fix) |
| `README-AUFMASSCODE.md` | Diese Datei |

---

## Installation

1. ZIP entpacken
2. `index.html`, `tw-aufmass.jsx`, `tw-shared-components.jsx` ins GitHub-Repo pushen
3. GitHub Pages deployt automatisch
4. Tablet/PC: **Strg+Shift+R**
5. Console-Check: `[TW Build] Version: 20260427-183154`

---

## Verifikation in der Browser-Console

Nach dem Laden:

```javascript
window.__twSentinel.preRenderCheck
// Erwartet:
// {
//   NavDropdown: "function",
//   AktionDropdown: "function",
//   App: "function",
//   ErrorBoundary: "function",
//   FirmenLogo: "function",
//   ModulWahl: "function",
//   ToolbarButton: "function",   // ← neu validiert
//   StatusPill: "function",      // ← neu validiert
//   ToolbarRow: "function"       // ← neu validiert
// }

window.__twSentinel.completedModules
// Erwartet: alle 9 Module
```

---

## Die 9 Aufmasz-Codes

| Code | Bedeutung           | Was rechnet es?                                          |
|------|---------------------|----------------------------------------------------------|
| `W`  | Wandflaeche         | Umfang × H, Oeffnungen abgezogen, Laibungen + Sonstige   |
| `B`  | Bodenflaeche        | L × B (oder Polygon-Boden), mit Sonstigen                |
| `M`  | Meter manuell       | Vor-Ort-Eingabe                                          |
| `St` | Stueck              | Vor-Ort-Eingabe (Stueckzaehler)                          |
| `MU` | Meter Umfang        | Grundriss-Umfang                                         |
| `AW` | Abdichtung Wand     | Umfang × AH, mit speziellen Hoehen-Regeln                |
| `AB` | Abdichtung Boden    | L × B (Tueren NICHT abgezogen)                           |
| `S`  | Sockel              | Sockel-Strecke (bestehende Logik)                        |
| `AS` | Abdichtung Sockel   | bei `m`/`lfm`: Sockel-Strecke; bei `m²`: × Sockelhoehe   |

**Default-Sockelhoehe** falls `sockelHoehe`-State leer: 0,10 m (10 cm).

**Backwards-Compatibility:** Wenn `aufmasscode` einer Position leer ist,
greift weiterhin die bisherige `pos.kategorie`-Logik. **Keine Bestandsdaten
werden veraendert.**

---

## Test-Anleitung

### Aufmasscode-Smoke-Test
1. Daten-Uebersicht oeffnen
2. Eine Position waehlen, in Spalte **Code** `W` eintragen
3. Aufmasz oeffnen, Raum anlegen mit Wandmassen + Tueren
4. Tab 3 (Positionen) → Position aufklappen → Wandflaeche erscheint mit
   VOB-Abzuegen wie vorher
5. Wert in Daten-Uebersicht aendern auf `MU` → Ergebnis = Umfang
6. Wert leer machen + alte Kategorie behalten → bestehendes Verhalten
   (Backwards-Compatibility)

### Quick-Edit-Bearbeitungsleiste (Tab 3)
1. Im Raumblatt auf Tab 3 (Positionen)
2. Unterhalb der Positions-Karten erscheint die neue Section
   "✏️ Positions-Quick-Edit · [Code-System]"
3. Pro Position: Code-Badge + Pos. Nummer + Bezeichnung + berechneter Wert + "Bearbeiten"-Button
4. Bearbeiten oeffnet Eingabefeld → Wert eingeben (ueberschreibt automatisches Ergebnis)
5. Unten: "✓ OK — in Rechnung uebernehmen" → ruft bestehende Speicher-Logik auf

### Foto-Persistenz (Tab 1)
1. Tab 1 (Fotos), nach den drei Phasen-Bloecken
2. Roter Button "💾 Fotos endgueltig speichern und Felder leeren"
3. Bestaetigungsdialog → `FotoSync.syncKunde()` → Aufnahme-Slots geleert
4. Bereits in IndexedDB gespeicherte Fotos bleiben erhalten

### Warnschild
1. Quick-Edit oeffnen, einen Wert eingeben → oben rechts erscheint
   "⚠ Ungespeicherte Aenderungen — jetzt sichern"
2. Klick auf das Schild → Raumblatt wird gespeichert → Schild verschwindet

### Toolbar-Komponenten (Source-Drift-Fix)
1. App startet ohne ReferenceError ✓
2. Raumerkennung oeffnet sich ohne Crash ✓
3. ToolbarButton-Buttons sehen korrekt aus (Gradient-Background, ~32px Hoehe)
4. StatusPill-Anzeigen sehen korrekt aus (Pille mit gefaerbtem Background)

---

## Architektur-Hinweise

### Warum `codeToVirtualPos`?

Statt die VOB-Berechnungs-Logik (480+ Zeilen `buildRechenweg`) zu duplizieren,
mappt der Code-Resolver `W`/`B`/`AW`/`AB`/`S` auf einen virtuellen `pos`
mit ueberschriebener `kategorie`/`tags`. Die bestehende Logik laeuft dann
unveraendert durch. **Eine Quelle der Wahrheit, kein Code-Duplikat.**

### Drive-Sync-Audit

Alle vier Pfade (`tw-daten-uebersicht.jsx`, `tw-app.jsx` an Zeilen 816+907,
`tw-storage.js`, Drive-Shadow-Sync) tragen `aufmasscode` bereits ohne
zusaetzliche Aenderungen. Keine Schema-Migration noetig.

### Pre-Render-Check

Im Sentinel-Hook werden jetzt auch `ToolbarButton`, `StatusPill`, `ToolbarRow`
geprueft. Falls irgendwann wieder ein Source-Drift entsteht, faellt das
sofort beim Browser-Start auf.

---

## Future Work (nicht Teil dieser Auslieferung)

Aus `SKILL-aufmasscode-system.md` Abschnitt 14:

- KI-Auto-Vorbelegung des `aufmasscode` aus dem LV-Text beim CSV-Import
- Code-Validator-Badge in der Daten-Uebersicht (roter Punkt bei fehlendem Code)
- Bulk-Edit fuer aufmasscode (alle Wandfliesen mit einem Klick auf `W`)
- Code-Histogram im KI-Akte-Modal

---

**Sauberer Stand. Keine Leichen im Keller.**
