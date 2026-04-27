# TW Business Suite — Aufmasz-Code-System (Auslieferung)

**Version:** 1.0
**Datum:** 27.04.2026
**Skill:** `SKILL-aufmasscode-system.md` v1.0
**Build:** Pre-kompilierte `index.html` mit allen 9 Modulen + Sentinel-Markern

---

## Was ist neu?

Dieses Update verdrahtet das **Aufmasz-Code-System** komplett — von der Daten-Uebersicht
bis zur Berechnung im Raumblatt. Ab sofort kannst du in der Daten-Uebersicht in der
Spalte **Code** einen der 9 Codes pro LV-Position eintragen, und das System rechnet
in jedem Raum automatisch den richtigen Wert aus.

### Die 9 Codes

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

### Backwards-Compatibility

Wenn der `aufmasscode` einer Position **leer** ist, greift weiterhin die bisherige
`pos.kategorie`-Logik. **Keine Bestandsdaten werden veraendert.**

---

## Was ist enthalten?

| Datei                       | Aenderung                                         |
|-----------------------------|---------------------------------------------------|
| `index.html`                | **Frisch gebaut** — Pre-kompiliert mit Babel-CLI  |
| `tw-aufmass.jsx`            | Code-Resolver + Code-Switch + Quick-Edit + Foto-Endgueltig + Warnschild + WIP-Resume-Dialog |
| `README-aufmasscode-system.md` | Diese Datei                                    |

**NICHT enthalten** (sind unveraendert):
- `tw-daten-uebersicht.jsx` — UI fuer die Code-Spalte ist seit 27.04.2026 schon live
- `tw-app.jsx` — `aufmasscode`-Persistenz lief schon mit (Zeilen 816 + 907)
- `tw-storage.js`, `tw-infrastructure.js` — generisch, keine Aenderung noetig

---

## Installation

1. ZIP entpacken
2. `index.html` und `tw-aufmass.jsx` ins GitHub-Repo `tw-business-suite` ueberschreiben
3. Push -> GitHub Pages deployt automatisch
4. Tablet/PC: **Strg+Shift+R** oder Browser-Cache leeren
5. Console: `[TW Build] Version: 20260427-...` muss erscheinen

---

## Test-Anleitung (6 Etappen)

### Etappe 1 — Code-Resolver (read-only Etappe)

Die neuen Helper-Funktionen `VALID_AUFMASS_CODES`, `resolveAufmassCode` und
`codeToVirtualPos` sind in `tw-aufmass.jsx` direkt vor `buildRechenweg`
eingefuegt. Kein sichtbares Verhalten — Voraussetzung fuer Etappe 2/3.

**Test:** App startet ohne Fehler, Aufmasz-Modul oeffnet sich. ✓

### Etappe 2 — Code-Switch in `calcPositionResult`

In der Daten-Uebersicht eine Position auswaehlen, in der Spalte **Code** einen
Wert eintragen (z.B. `W` fuer eine Wandfliesen-Position).

**Tests:**
- `W` setzen, Raum oeffnen mit Tueren/Fenstern -> Wandflaeche erscheint mit
  Abzuegen wie vorher.
- `B` setzen -> Bodenflaeche.
- `MU` setzen -> Umfang in Metern.
- `M` setzen + manuell `12,5` eingeben -> 12,5 als Ergebnis.
- `St` setzen + manuell `3` eingeben -> 3 Stueck.
- `AS` mit Einheit `m` -> Sockel-Strecke; mit Einheit `m²` -> Strecke × 0,10 m
  (Default-Sockelhoehe, aenderbar via `sockelHoehe`-State).
- Code leer lassen + alte `kategorie` ist gesetzt -> verhaelt sich wie vorher
  (Backwards-Compatibility).

### Etappe 3 — Code-Switch in `buildRechenweg`

Im Raumblatt auf eine Position klicken (Tab 3 = Positionen), den Rechenweg
aufklappen.

**Tests:**
- `MU`-Position: Eigener Step "Meter Umfang" mit `2 × (L + B)` als Formel.
- `M`-/`St`-Position: Step "Meter manuell" oder "Stueck".
- `AS`-Position bei `m²`: Drei Steps (Sockel-Strecke, Sockelhoehe, Flaeche).
- `W`/`B`/`AW`/`AB`/`S`-Position: Bestehender Rechenweg unveraendert
  (laeuft via `codeToVirtualPos` durch die alten Step-Bloecke).

### Etappe 4 — Drive-Sync-Audit

Code in der Daten-Uebersicht setzen, Browser zumachen, neu oeffnen, anderes
Geraet -> Code muss erhalten bleiben.

**Audit-Ergebnis:** Alle 4 Sync-Pfade clean — `aufmasscode` lief in
`tw-app.jsx` an Zeilen 816 + 907 schon mit. Keine Code-Aenderung noetig.

### Etappe 5 — Quick-Edit-Bearbeitungsleiste (Tab 3)

Im Raumblatt auf Tab 3 (Positionen). Direkt unter den Positions-Karten und
**vor** der Raum-Zusammenfassung erscheint die neue Section:

> ✏️ Positions-Quick-Edit · [Code-System]

Pro Position:
- Code-Badge (z.B. `[ W ]` oder `[ — ]` falls leer)
- Pos. Nummer + Bezeichnung
- Berechneter Wert (gruen wenn > 0, orange wenn 0)
- "Bearbeiten"-Button: klappt ein Eingabefeld auf
- Eingabe ueberschreibt automatischen Wert (= setzt `manualMenge`)

Unten: **"✓ OK — in Rechnung uebernehmen"**-Button -> ruft
`doRaumblattFertigstellen` auf (= bestehender Speicher-Pfad).

**Test:** Wert eingeben, OK klicken, Raum wird gespeichert, Sprung zurueck
zur Raumerkennung.

### Etappe 6 — Foto-Persistenz + Warnschild + WIP-Resume

#### 6a Foto-Persistenz

Tab 1 (Fotos), nach den drei Phasen-Bloecken:

> 💾 Fotos endgueltig speichern und Felder leeren

- Bestaetigungsdialog
- `FotoSync.syncKunde(kunde.id)` synchronisiert nach Drive
- Aufnahme-Slots werden geleert (= leere Foto-Strukturen)
- Bereits in IndexedDB gespeicherte Fotos bleiben erhalten

**Test:** Fotos aufnehmen, Button druecken, Felder sind leer. Raumblatt neu
oeffnen — Fotos im IndexedDB-Set sind weiterhin da.

#### 6b Warnschild

Oben rechts erscheint ein rotes Schild:

> ⚠ Ungespeicherte Aenderungen — jetzt sichern

Wird gesetzt, sobald `setAufmassDirty(true)` aufgerufen wird. Aktuell
getriggert durch `updatePosManualMenge` (Quick-Edit). Beim Klick: ruft
`doRaumblattFertigstellen` auf. Bei erfolgreicher Speicherung wird die
Warnung wieder ausgeblendet.

> *Hinweis: Der Dirty-Flag wird in dieser Auslieferung gezielt durch das
> Quick-Edit-System gesetzt. Weitere Trigger an Eingabe-Stellen koennen
> in einer Folge-Iteration ergaenzt werden.*

#### 6c WIP-Wiederaufnahme-Dialog

Der State `wipResumeDialog` und das Render-JSX sind eingebaut. Der
**globale Akte-Modal-WIP-Resume-Mechanismus** ist die primaere Loesung
(siehe `SKILL-akte-resume-system.md` und Memory).

Der Aufmasz-spezifische Dialog ist als zukuenftiger Backup-Pfad
vorbereitet, wird aber nicht automatisch beim Mounten getriggert,
um Konflikte mit dem globalen System zu vermeiden.

---

## Was wurde NICHT geaendert?

- `tw-daten-uebersicht.jsx`: UI fuer Code-Spalte ist seit 27.04.2026 schon live
- `tw-app.jsx`: `aufmasscode` ist seit dem 27.04.2026 in beiden Mapping-Stellen
  vorhanden (Zeilen 816 + 907)
- `tw-storage.js`: Generisches Schema, keine Aenderung noetig
- Bestehende `kategorie`-Logik bleibt **unveraendert** — Code-System ist additiv

---

## Architektur-Hinweise

### Warum `codeToVirtualPos`?

Statt die VOB-Berechnungs-Logik (480+ Zeilen `buildRechenweg`) zu duplizieren,
mappt der Code-Resolver `W`/`B`/`AW`/`AB`/`S` auf einen virtuellen `pos`
mit ueberschriebener `kategorie`/`tags`. Die bestehende Logik laeuft dann
unveraendert durch. **Eine Quelle der Wahrheit, kein Code-Duplikat.**

### Warum `_aCode` mit Underscore?

Vermeidet Naming-Konflikte mit potenziell vorhandenen `code`-Variablen
in den verschachtelten `case`-Bloecken.

### Warum keine Schema-Migration?

`tw-storage.js` speichert Positionen als generische Objekte mit `keyPath: 'id'`
und Indizes auf `kundeId`/`updatedAt`. JSON.stringify nimmt alle Felder per
Default — kein hartes Mapping. Beim Laden eines Kunden ohne `aufmasscode`-Feld
wird per `p.aufmasscode || ''` automatisch ein Leerstring gesetzt.

---

## Bekannte Einschraenkungen / Future Work

Aus dem Skill `SKILL-aufmasscode-system.md` Abschnitt 14:

- **Auto-Vorbelegung von `aufmasscode` durch KI** beim CSV-Import — *nicht
  Teil dieser Auslieferung*
- **Code-Validator-Badge** in der Daten-Uebersicht (roter Punkt neben Positionen
  ohne Code) — *nicht Teil dieser Auslieferung*
- **Bulk-Edit** fuer aufmasscode (alle Wandfliesen-Positionen mit einem Klick
  auf `W` setzen) — *nicht Teil dieser Auslieferung*
- **Code-Histogram** im KI-Akte-Modal — *nicht Teil dieser Auslieferung*

---

## Babel-Validierung

```
[BABEL] tw-aufmass.jsx        OK (deoptimised styling, normal bei > 500 KB)
[BABEL] tw-daten-uebersicht.jsx  OK
[BABEL] tw-app.jsx            OK
[BABEL] _tw-bundle.jsx (~32k Zeilen)  OK
```

Alle Sanity-Checks aus `SKILLBuildAuslieferung.md` bestanden.

---

## Bei Fragen / Problemen

1. Browser-Console oeffnen: gibt es einen Roten Eintrag?
2. `window.__twSentinel.completedModules` in der Console eingeben — sollte
   alle 9 Module enthalten.
3. `window.__twSentinel.preRenderCheck` zeigt, welche Top-Level-Komponenten
   gefunden wurden.
4. Wenn `[TW Build] Version: 20260427-...` in der Console fehlt, ist der
   Browser-Cache nicht geleert.

---

**Ende.**
