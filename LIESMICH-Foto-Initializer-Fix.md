# Foto-Initializer-Fix (25.04.2026, Crash-Diagnose Schritt 2)

## Was hat sich geaendert

**Eine einzige Aenderung in `tw-aufmass.jsx`:** Der `noFotos`-Diagnose-Flag
wirkt jetzt auch in den `useState`-Initializern fuer `phasenFotos` und
`objektFotos`.

## Warum ist das kritisch

Letzter Test hat gezeigt: Auch mit `noFotos=1` AN crasht die App bei 2030 MB
beim Oeffnen des Aufmass-Moduls.

Ursache: Der `useState`-Initializer (Zeile 5206 / 5229 in tw-aufmass.jsx) laeuft
**synchron beim Komponenten-Mount** und nimmt die Daten direkt aus `reEdit`:

```jsx
useState(() => {
    if (reEdit && reEdit.phasenFotos) return reEdit.phasenFotos;  // ← FEUER
    ...
});
```

Wenn `reEdit.phasenFotos` ein Objekt mit alten Base64-DataURLs enthaelt
(Legacy-Speicherformat aus aelteren Saves), dann landen alle Foto-Strings
**direkt im JS-Heap, bevor noFotos ueberhaupt eine Chance hatte**, irgendwas
abzufangen. Bei 3-5 MB pro Foto und mehreren hundert Fotos im Payload sind
das schnell die 2 GB, die V8 erlaubt.

Der `noFotos`-Check der bisher in Zeile 7696 stand greift erst bei der
*Rehydrierung* — also viel zu spaet.

## Was der Fix macht

```jsx
useState(() => {
    if (window.__twNoFotos) {
        // Leeres Initial-Objekt zurueckgeben — KEIN Zugriff auf reEdit.phasenFotos
        const initial = {};
        FOTO_PHASEN.forEach(phase => { initial[phase.key] = {}; });
        return initial;
    }
    if (reEdit && reEdit.phasenFotos) return reEdit.phasenFotos;
    ...
});
```

Selbe Logik fuer `objektFotos` (Zeile 5229).

## Was bleibt gleich

- `kiErgebnisse` (Zeile 5217) wurde **nicht** angefasst — das Objekt ist klein
  (Zahlen + kurze Strings), kein Heap-Risiko.
- Der Render-Code der Foto-Tabs ist unveraendert.
- Der Rehydrierungs-Block ab Zeile 7696 ist unveraendert.

## Nach Installation: Test-Plan Schritt 1 wiederholen

1. ZIP entpacken, drei Dateien ins Repo, push, Strg+F5
2. Debug-Panel oeffnen, "Keine Fotos laden" auf **AN**
3. Aufmass-Modul oeffnen, Memory-Badge beobachten

**Wenn jetzt gruen bleibt** → Hypothese 100% bestaetigt. Naechster Schritt
wird sein, das Legacy-Save-Format am Speicherpunkt zu konvertieren, sodass
`reEdit.phasenFotos` IMMER schlanke Stubs (mit `hasImage: true` statt
DataURL) enthaelt — egal ob der Save alt oder neu ist. Damit crasht die App
auch ohne Diagnose-Flag nicht mehr.

**Wenn auch jetzt rot wird** → es gibt eine dritte Quelle die wir noch
nicht kennen. Memory-Badge-Wert + Stelle wo's hochspringt schicken.

## Geaenderte Dateien

1. `index.html` — frisch gebaut (Build 25.04.2026 ~06:50)
2. `tw-aufmass.jsx` — Quelle: Foto-useState-Initializer mit Diagnose-Schutz
