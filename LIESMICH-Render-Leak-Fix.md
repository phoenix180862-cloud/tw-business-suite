# Render-Leak in Raumerkennung-Komponente gefixt (25.04.2026)

## Was du nach dem Test gemessen hast

| Stelle                | Memory                        |
|-----------------------|-------------------------------|
| Startseite, Alle Module ausser Aufmass | konstant 17 MB (gruen) ✓ |
| Aufmass (= Raumerkennung) | sofort 300+, waechst weiter |
| Foto-Tab im Raumblatt     | nach 30 s 1988 MB           |

Klare Aussage: Quelle sitzt im **Aufmass-Pfad selbst**, kein anderes
Modul ist betroffen. Und es waechst pro Sekunde — ein Leck, kein
einmaliger Spike.

## Gefundene Ursache

In `tw-aufmass.jsx` Zeile 3540 (Funktion `Raumerkennung`) gab es einen
`useEffect`, der **kein Dependency-Array** hatte:

```jsx
useEffect(() => {
    const handleEnter = (e) => { ... };
    window.addEventListener('keydown', handleEnter);
    return () => window.removeEventListener('keydown', handleEnter);
});  // ← KEIN Array — laeuft bei JEDEM Re-Render
```

Der Effekt lief bei JEDEM Re-Render der Komponente. Bei jedem Lauf:
- Eine neue Closure `handleEnter` wurde erzeugt
- Diese Closure hielt alle State- und Prop-Variablen fest
  (inklusive `gesamtliste` und `lastRaumData` — die sind potenziell gross)
- Listener wurde abgemeldet und wieder neu angemeldet

Wenn was anderes Re-Renders ausloest (Uhr-Tick im NavHeader, Drive-Status-
Update, irgendein State-Change), erzeugt das Sekunde fuer Sekunde neue,
schwere Closures. GC kommt nicht hinterher → Heap waechst.

## Fix

`useRef`-Pattern: Der Effekt laeuft nur einmal beim Mount. Der Handler
liest aktuelle State-Werte ueber eine stabile Ref (`enterStateRef`),
die bei jedem Render synchronisiert wird — aber ohne neue Closure zu erzeugen.

```jsx
const enterStateRef = useRef({});
useEffect(() => {
    const handleEnter = (e) => {
        const s = enterStateRef.current;
        if (s.showPosModal && ...) { ... }
    };
    window.addEventListener('keydown', handleEnter);
    return () => window.removeEventListener('keydown', handleEnter);
}, []);  // ← jetzt mit leerem Dep-Array, einmal beim Mount

// vor dem return: Ref mit aktuellen Werten fuettern
enterStateRef.current = { showPosModal, activeRaum, selectedPositions, ... };
```

## Bonus: Memory-Badge zeigt jetzt die Allokationsrate

Der Badge oben rechts zeigt jetzt **MB-Verbrauch + Rate (MB/s)**:

- `45 MB` — alles ruhig
- `120 MB ↑3.2` — Memory waechst um 3.2 MB pro Sekunde (Warnsignal)
- Tooltip beim Drueberfahren zeigt komplette Werte

Neue Frueh-Warn-Regel: Wenn die Allokationsrate >5 MB/s ist, geht das Badge
sofort auf orange — auch wenn der absolute Wert noch klein ist. So siehst
du Lecks sofort, ohne 30 Sekunden warten zu muessen.

## Test-Plan nach Installation

1. ZIP entpacken, Push, Strg+F5
2. **Test 1 — Mit `noFotos=1` AN:** Aufmass oeffnen, 30 Sekunden warten,
   MB-Wert + Rate ablesen
3. **Test 2 — Mit `noFotos` AUS:** Selber Test, Aufmass oeffnen, 30 Sek,
   abgelesen, dann Foto-Tab fuer 30 Sek

**Erwartung:**
- Test 1 sollte deutlich besser sein (idealerweise gruene Rate, < 1 MB/s)
- Test 2 wird zeigen ob der Foto-Tab noch eine eigene Quelle hat

Wenn Test 1 immer noch dramatisch hoch geht (>5 MB/s konstant), gibt es
weitere Leaks die wir suchen muessen — dann brauche ich nur die
Allokationsrate vom Badge, dann grabe ich gezielt weiter.

## Geaenderte Dateien

1. `index.html` — frisch gebaut
2. `tw-aufmass.jsx` — Quelle: Render-Leak-Fix in `Raumerkennung`
3. `index-template.html` — Quelle: Memory-Badge mit Allokationsraten-Anzeige
