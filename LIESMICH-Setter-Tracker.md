# Setter-Tracker — Welcher Setter dreht die Schleife? (25.04.2026)

## Was du gemessen hast

Foto-Direktklick mit beiden Flags AN: **App: 14.797/s** Render-Frequenz, 1100 MB nach 10 Sekunden.

Das ist eine harte React-Render-Schleife: Ein Setter setzt einen State,
ein useEffect reagiert, ruft wieder einen Setter auf, der den useEffect
re-triggert. Closures pro Render erklaeren die 80 MB/s.

## Code-Lesen reicht nicht

Die App-Komponente hat 30+ Setter und 7 useEffects mit Setter-Calls drin.
Welcher davon in der Schleife haengt — das lese ich nicht aus dem Code,
ohne den Loop live zu beobachten.

Deshalb: **Setter-Tracker.** Ich wrappe die haeufigsten 7 App-Setter mit
einem Counter:
- setPage
- setSelectedKunde
- setSelectedRaum
- setSelectedPositions
- setFertigeRaeume
- setGesamtliste
- setAufmassGespeichert

Bei jedem Aufruf zaehlt ein globaler Counter pro Setter.

## Was sich am Memory-Badge geaendert hat

Untere Zeile zeigt jetzt zwei Werte:
- Komponenten-Renders/s (wie bisher): `App:14k Raum:0`
- Setter-Calls/s als zweite Zeile gelb: `→ setPage:13k`

Die zweite Zeile ist der entscheidende Wert. Sie sagt direkt:
**„Der Setter X feuert pro Sekunde Y mal."**

Update-Frequenz auf 1 Sekunde verkuerzt damit du bei den schnellen Loops
nicht 2 Sekunden warten musst.

## Test-Plan

Push, Strg+F5, Debug-Panel → noFotos AN, noSync AN. Dann auf Foto-Modul.
**5 Sekunden warten** und folgende Werte ablesen:

1. Obere Zeile (MB + Pfeil)
2. Mittlere Zeile (Komponenten-Renders, weiss)
3. **Untere Zeile (Setter-Calls, gelb)** ← der wichtigste Wert

Foto bzw. Tooltip schicken.

## Was die Werte bedeuten

| Untere Zeile zeigt          | Bedeutung                                              |
|-----------------------------|--------------------------------------------------------|
| `→ setPage:13k`             | navigateTo wird in einer Schleife aufgerufen           |
| `→ setSelectedKunde:13k`    | Kundenwechsel-Loop, Auto-Restore koennte schuld sein   |
| `→ setSelectedRaum:13k`     | Raum-Setter-Loop, vermutlich Foto-Direktzugriff        |
| `→ setGesamtliste:13k`      | Gesamtliste wird ueberschrieben → AutoSave-Trigger     |
| `(leer)` aber App:14k       | Loop ist in einem Setter den ich noch nicht trackte    |

In den ersten vier Faellen weiss ich exakt wo der naechste Schnitt sitzt.
Bei „leer + App:14k" muss ich mehr Setter trackieren — dann gerade nochmal
eine Lieferung mit weiteren Wraps.

## Geaenderte Dateien

1. `index.html` — frisch gebaut
2. `tw-app.jsx` — 7 Setter mit Counter umwrappt
3. `index-template.html` — Memory-Badge zeigt Setter-Calls/s
