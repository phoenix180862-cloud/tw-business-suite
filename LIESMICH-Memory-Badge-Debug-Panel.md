# Memory-Badge + Debug-Panel + NavDropdown-Hotfix (25.04.2026)

## Was ist drin

### 1. Memory-Badge (oben rechts, immer sichtbar)
- Zeigt aktuellen JS-Heap-Verbrauch in MB
- Update alle 2 Sekunden ueber `performance.memory.usedJSHeapSize`
- Farbcode:
  - **Gruen** unter 150 MB
  - **Orange** 150-250 MB
  - **Rot** ueber 250 MB
- Klick auf das Badge oeffnet das Debug-Panel
- Funktioniert ausserhalb von React — auch wenn die App crasht ist das Badge da
- Faellt sauber auf "n/a" zurueck wenn der Browser keine Memory-API hat (Firefox, Safari)

### 2. Flag-Status-Indicator (oben links, nur wenn Flag aktiv)
- Zeigt orange "⚠ Debug noFotos" oder aehnlich wenn ein Flag aktiv ist
- Damit ist sofort sichtbar ob die Diagnose-Modi greifen
- Klick darauf oeffnet ebenfalls das Debug-Panel

### 3. Debug-Toggle-Panel (oeffnet via Klick auf Memory-Badge)
- Vier Toggle-Buttons fuer:
  - **noFotos** — Foto-Seite + Rehydrierung abschalten
  - **noAlarm** — Firebase-Alarm-Listener abschalten
  - **noSync**  — Auto-Sync abschalten
  - **noClock** — Uhrzeit-Update abschalten
- Jeder Button schaltet den Flag in localStorage und triggert Reload
- "Alle Flags loeschen + Reload"-Button entfernt alle Diagnose-Modi
- Build-Version unten im Panel zur schnellen Identifikation

### 4. Bugfix: Flag-System konsistent gemacht
**Vorher:** Das Template setzte `window.__twNoFotos` direkt, aber `tw-app.jsx`
las `window.__twDebugFlags.noAlarm`. Konsequenz: noAlarm und noSync waren
nie wirksam, egal ob `?noAlarm=1` in der URL stand oder nicht.

**Jetzt:** Beide Schemas werden gesetzt (Backwards-Compat) und beide werden
aus localStorage hydriert. URL-Parameter ueberschreiben einmalig und werden
zurueck in localStorage geschrieben — heisst: Beim naechsten Reload sind die
Flags weiter aktiv, auch ohne URL-Parameter.

### 5. Bugfix: NavDropdown-Hotfix in Quelldatei zurueckgeschrieben
Die Komponenten `NavDropdown`, `AktionDropdown`, `AktionItem`, `AktionSubItem`
waren nur in der gebauten `index.html` definiert, nicht in einer JSX-Quelldatei.
Jeder Rebuild hat sie verloren. Sie sind jetzt im **`tw-shared-components.jsx`
am Dateiende** drin (vor dem MODULWAHL-Trennstrich), als bereits kompilierter
React.createElement-Code, den Babel unveraendert durchlaesst.

---

## URL-Parameter (alle persistent in localStorage)

| Parameter        | Wirkung                                           |
|------------------|---------------------------------------------------|
| `?noFotos=1`     | Foto-Seite + Rehydrierung deaktivieren            |
| `?noAlarm=1`     | Firebase-Alarm-Listener deaktivieren              |
| `?noSync=1`      | Auto-Sync zu Drive deaktivieren                   |
| `?noClock=1`     | Uhrzeit-Update auf Startseite deaktivieren        |
| `?minimal=1`     | Setzt noAlarm + noSync + noClock gleichzeitig     |
| `?debug=1`       | Debug-Panel beim Start automatisch oeffnen        |
| `?clearDebug=1`  | Alle gespeicherten Flags loeschen + reload        |

Achtung: Flags bleiben jetzt **persistent** auch ohne URL-Parameter (in
localStorage gespeichert). Wer einen Flag wieder loswerden will, klickt
im Debug-Panel den jeweiligen Button auf "aus" oder "Alle Flags loeschen".

---

## Geaenderte Dateien

1. **`index.html`** — frisch gebaut, alle Aenderungen drin
2. **`index-template.html`** — Quelldatei: Memory-Badge, Debug-Panel,
   erweitertes Flag-System mit localStorage-Persistenz
3. **`tw-shared-components.jsx`** — NavDropdown-Hotfix dauerhaft drin
   (vorher fehlte er in den Quellen)

## Installation

1. Diese drei Dateien ins Repo-Root kopieren / ueberschreiben
2. Push auf GitHub
3. Am Tablet: Strg+F5 (oder per Debug-Panel "Alle Flags loeschen + Reload")

## Naechste Schritte

Memory-Badge ist jetzt live — bitte beim naechsten Foto-Crash beobachten:

- Bei welchem MB-Wert kippt der Browser?
- Steigt die Anzeige langsam (Leak) oder springt sie schlagartig (Allocation-Spike)?
- Welche Flags sind aktiv (steht oben links)?

Mit `?noFotos=1` (oder Toggle-Button) testen ob die App OHNE Foto-Modul
stabil laeuft — wenn ja, ist klar dass das Leck im Foto-Pfad sitzt.
