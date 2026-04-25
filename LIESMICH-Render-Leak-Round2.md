# Render-Leak Round 2 — App-Ebene Closures (25.04.2026)

## Was gemessen wurde

Nach dem ersten Render-Leak-Fix in der Raumerkennung-Komponente:
- 420 MB nach 20 Sekunden, +25,2 MB/s

Heisst: Der erste Fix war einer von mehreren. Es lief noch was weiter pro
Sekunde grosse Closures in den Heap.

## Zwei weitere Stellen ohne Dep-Array gefunden — beide in `tw-app.jsx`

### Stelle 1: Globaler Enter-Handler (Zeile 380-451)
```jsx
useEffect(function() {
    var handleGlobalEnter = function(e) { ...page... showAuth... handleKundeNeu... };
    window.addEventListener('keydown', handleGlobalEnter);
    return function() { window.removeEventListener('keydown', handleGlobalEnter); };
});  // ← KEIN Dep-Array
```

Diese Closure hielt `page`, `loading`, `showAuth`, `handleKundeNeu`,
`handleStartAufmass`, `handleLoadAkte`, `navigateTo`. Pro App-Render: neue
Closure, alte Cleanup, neue Registration.

### Stelle 2: AutoSave-Funktion-Registrierung (Zeile 2040-2048)
```jsx
useEffect(function() {
    if (window.TW && window.TW.AutoSave) {
        window.TW.AutoSave.setSaveFunction(function() {
            return _collectAndSaveWip();  // ← capturet ALLE App-States
        });
    }
});  // ← KEIN Dep-Array
```

Das war der **groesste Brocken**: `_collectAndSaveWip` capturet `gesamtliste`,
`importResult`, `fertigeRaeume`, `selectedPositions`, `selectedKunde` und
mehr. Im Aufmass koennen die Listen mit Foto-Stubs, Raumdaten, Positionen
schnell mehrere MB gross sein.

Pro App-Render: Eine neue Closure mit der ganzen Datenbasis im Bauch wurde
in den AutoSaveManager geschrieben. Selbst wenn die alte ueberschrieben wird,
gibt es kurzzeitige Doppelhaltung — bei vielen Renders pro Sekunde
spuert das der GC nicht hinterher.

## Beide Stellen mit useRef-Pattern gefixt

```jsx
const globalEnterStateRef = useRef({});
useEffect(function() {
    var handleGlobalEnter = function(e) {
        var s = globalEnterStateRef.current;
        // liest s.page, s.handleKundeNeu, etc.
    };
    window.addEventListener('keydown', handleGlobalEnter);
    return function() { window.removeEventListener('keydown', handleGlobalEnter); };
}, []);  // einmal beim Mount

// vor return: Ref synchronisieren (KEINE neue Closure-Erzeugung)
globalEnterStateRef.current = { page, handleKundeNeu, ... };
```

Dasselbe Schema fuer setSaveFunction:
```jsx
const collectSaveRef = useRef();
collectSaveRef.current = _collectAndSaveWip;  // pro Render aktualisiert
useEffect(function() {
    window.TW.AutoSave.setSaveFunction(function() {
        var fn = collectSaveRef.current;
        return fn ? fn() : Promise.resolve(null);
    });
}, []);  // einmal beim Mount
```

## Neues Diagnose-Werkzeug: Render-Counter

Das Memory-Badge zeigt jetzt unter dem MB-Wert eine zweite Zeile mit
**App-Renders pro Sekunde** — z.B. `0.5 renders/s`. Ein gesunder Wert
liegt bei <1/s. Ueber 5/s = Re-Render-Schleife, Indikator dass der
Heap-Druck durch Closure-Erzeugung kommt.

Tooltip beim Drueberfahren zeigt jetzt:
- JS-Heap aktuell + Limit
- Allokationsrate MB/s
- Render-Frequenz + Gesamt-Anzahl

## Test-Plan

Push, Strg+F5, Aufmass oeffnen, **20 Sekunden warten ohne klicken**.
Dann ablesen vom Badge:
1. MB-Wert + Pfeil-Rate
2. Render-Frequenz (untere Zeile)

**Erwartung:**
- Wenn die Renders/s jetzt unter 1 liegen → die zwei App-Effekte waren
  Hauptverursacher, das Leck sollte deutlich gebremst sein
- Wenn die Renders/s weiter hoch sind (>3) → es gibt eine Re-Render-Schleife
  in der Raumerkennung, dann muessen wir gucken welcher State-Setter pro
  Sekunde feuert (vermutlich `reloadListenStatus` mit Drive-Polling)

Wenn die Allokationsrate unter 1 MB/s ist und Renders/s normal → Problem geloest.

## Geaenderte Dateien

1. `index.html` — frisch gebaut
2. `tw-app.jsx` — zwei Closure-Lecks gefixt + Render-Counter
3. `tw-aufmass.jsx` — Vor-Fix aus letzter ZIP (Raumerkennung-Enter-Handler)
4. `index-template.html` — Memory-Badge mit Renders/s-Anzeige
