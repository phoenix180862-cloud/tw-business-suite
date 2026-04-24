# HOTFIX — wandMasse TDZ-Fehler

**Stand: 24.04.2026, 13:38**

## Was war

Die App startete, aber dann:
```
ReferenceError: Cannot access 'wandMasse' before initialization
at Raumblatt (...:593:78)
```

## Ursache

Im Raumblatt wurde ein `useEffect` mit `wandMasse` in der Dependency-Liste
deklariert, BEVOR die `const [wandMasse, ...]`-Deklaration kam (Zeile 5680
vs Zeile 5686 im tw-aufmass.jsx). Das war schon im Original so — hat aber
nicht gestoert, solange Babel im Browser kompiliert hat.

Mit Babel-CLI-Vorkompilierung sind Temporal-Dead-Zone-Checks strenger, und
das fehlerhafte Pattern fliegt jetzt direkt auf.

## Fix

Der `useEffect` wurde ans Ende der State-Deklarationen verschoben
(nach Zeile 6125 in tw-aufmass.jsx, direkt vor dem LASER-DISTO-Block).

Alle anderen Module/useEffects auf TDZ-Probleme gescannt: keine weiteren
gefunden.

## Installation

1. ZIP entpacken, alle Dateien auf GitHub pushen
2. Tablet: Cache leeren oder Strg+Shift+R
3. App oeffnen

Die Sentinel-Diagnose bleibt drin — falls doch noch was knallt, seht ihr
sofort wo.
