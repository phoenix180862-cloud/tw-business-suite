# Memory-Diagnose-Build

**Stand: 24.04.2026, 13:57**

## Was ist neu

Die App laeuft jetzt — stuerzt aber nach 2-3 Minuten Nutzung ab
(Chrome "Oh nein!" = Out-of-Memory). Das heisst: Irgendwo frisst
die App permanent Speicher, ohne ihn wieder freizugeben.

Diese ZIP enthaelt einen **Memory-Watcher**: Oben rechts auf dem
Screen siehst du eine kleine monospace-Anzeige in der Form:
```
  45MB (max 62)
```
Links: aktueller Heap-Verbrauch. Rechts: hoechster bisher gemessener.

Die Anzeige faerbt sich ein:
- **Blau** = unter 200 MB (alles gut)
- **Gelb** = 200-500 MB (achten)
- **Orange** = 500-1000 MB (kritisch)
- **Rot** = 1+ GB (Crash droht bald)

## So diagnostizierst du

1. ZIP entpacken, alle Dateien auf GitHub
2. Tablet: Browser-Cache leeren oder Inkognito-Tab
3. App oeffnen, Memory-Badge oben rechts beobachten
4. **Normal benutzen** wie gestern bei dem Crash
5. Sobald Badge rot wird oder App abstuerzt: **Auf den Badge TIPPEN**
   -> Dialog mit letzten 20 Messpunkten erscheint
6. Screenshot davon machen und mir schicken

Mit dem Memory-Verlauf kann ich **genau sehen**:
- Wann der Speicherverbrauch steigt
- Ob er sprunghaft steigt (bei bestimmter Aktion) oder gleichmaessig (Interval-Leak)
- Wie schnell das passiert

Und dann kann ich den Schuldigen punktgenau finden und fixen.

## Installation

1. ZIP entpacken
2. Alle 9 Dateien auf GitHub pushen
3. Tablet: Cache leeren (WICHTIG!)
4. Normal benutzen, Memory-Badge im Auge behalten
5. Screenshot vom Verlauf schicken wenn Problem auftritt
