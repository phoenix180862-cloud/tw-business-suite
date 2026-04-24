# HOTFIX — NavDropdown + AktionDropdown nachgezogen

**Stand: 24.04.2026, 10:00 — nach Runtime-Crash auf Baustelle**

## Was war kaputt?

Nach Deployment der ersten Merge-ZIP kam auf dem Tablet:
```
ReferenceError: NavDropdown is not defined
   at App (<anonymous>:1434:18)
```

## Ursache

Die Komponenten `NavDropdown` und `AktionDropdown` waren
**nur in der alten `index.html`** definiert (Zeile 2157 bzw.
Zeile 2237 in der alten GitHub-index.html), aber NICHT in
einem `tw-*.jsx` Quellmodul.

Das heisst: Irgendwann wurde direkt in der generierten
`index.html` editiert, aber die Aenderung nicht ins
passende Quellmodul zurueckgeschrieben. Solange niemand
neu baut, merkt's keiner — beim Rebuild (wie in meiner
Merge-ZIP) fehlen die Komponenten und die App kracht.

## Fix

Beide Komponenten wurden aus der alten `index.html`
extrahiert und in `tw-shared-components.jsx` eingefuegt
(vor dem MODULWAHL-Kommentar am Dateiende).

## Was hat sich geaendert gegenueber Merge-ZIP 1?

- `tw-shared-components.jsx`:
  +375 Zeilen (NavDropdown + AktionDropdown)
- `index.html`:
  neu gebaut mit allen Komponenten drin

Die restlichen 8 Dateien aus der Merge-ZIP 1 sind
unveraendert, werden aber trotzdem mitgeliefert
damit du nur EINE ZIP installierst.

## Verifikation

- Scan "used but not defined" in allen Modulen: 0 echte Treffer
- Babel alle JSX: PASS
- Komplettes Bundle (2.27 MB) kompiliert: PASS
- div#root=1, createRoot=1, ErrorBoundary-Wrap=1
- `function NavDropdown`: 1x definiert
- `function AktionDropdown`: 1x definiert

## TIPP fuer die Zukunft

Nach diesem Vorfall ist es eindeutig wichtig: **Aenderungen
IMMER in den Quelldateien `tw-*.jsx` machen**, niemals
direkt in `index.html`. Beim naechsten Build waere sonst
alles wieder weg.

## Installation

1. ZIP entpacken
2. Alle 9 Dateien ins Repo-Root kopieren/ueberschreiben
3. Push, Strg+F5
