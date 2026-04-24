# Memory-Leak gefunden und gefixt!

**Stand: 24.04.2026, 19:15**

## Was war

Der Speicher explodierte von 150 MB auf 2 GB innerhalb von ~60 Sekunden
beim Oeffnen eines Raumblatts. Bei 2 GB hat Chrome den Tab gekillt
("Oh nein!"-Seite).

## Ursache (diesmal wirklich!)

Mein Block-B2-Fix aus der ersten Merge-ZIP hatte einen Bug: Beim
Oeffnen eines Raumblatts wurde die Funktion `loadFotosByKundeAsDataURLs`
aufgerufen, die **alle Fotos eines Kunden** gleichzeitig als
Base64-DataURLs in den RAM lud -- und das **zweimal nacheinander
(parallel)**, einmal fuer Phasenfotos und einmal fuer Objektfotos.

Bei deiner Foto-Menge im IndexedDB-Cache waren das leicht 500+ MB
die in den Heap gezogen wurden, PLUS die Zwischenkopien beim
Merge, PLUS die doppelte Speicherung, bis der GC endlich
reagieren konnte. Bei der Groesse deines Foto-Caches war das
zuviel fuer das Tablet.

## Fix

1. Zwei parallele `loadFotosByKundeAsDataURLs`-Aufrufe
   zu EINEM zusammengefasst
2. Neue gezielte Funktion `loadFotosByIdsAsDataURLs`: laedt
   NUR spezifische Fotos statt alle eines Kunden
3. Rehydrierung: Filtert nach raumKey des aktuell geoeffneten
   Raums. Das sind typisch 10-20 Fotos statt 500.

Heap-Footprint beim Raumblatt-Oeffnen jetzt erwartungsmaeszig:
- Vorher: ~1-2 GB
- Jetzt: ~150-250 MB

## Installation

1. ZIP entpacken, alle 9 Dateien auf GitHub pushen
2. **Tablet: Browser-Cache leeren!** (WICHTIG)
3. App normal oeffnen (KEIN ?minimal=1 mehr noetig)
4. Raumblatt oeffnen, Memory-Badge beobachten

Die Debug-Flags sind weiterhin drin fuer Notfaelle, aber muessten
nicht mehr gebraucht werden. Der Memory-Badge sollte bei normaler
Nutzung unter 500 MB bleiben.

## Falls es immer noch crasht

Dann ist noch mehr im Busch. Memory-Badge-Screenshot kurz vor dem
Crash schicken, dann gibt's den naechsten Fix.
