# Debug-Switches zur Memory-Leak-Isolation

**Stand: 24.04.2026, 16:45**

## Was zeigen die Memory-Zahlen?

```
 0s:    0 MB
 5s:  220 MB    ← +220 MB in 5s (massiver Ansturm)
10s:  454 MB    ← +234 MB
30s: 1104 MB
60s: 1793 MB
85s: 2037 MB    ← Chrome kills Tab bei ~2 GB
```

Das ist SOFORT beim App-Start, nicht nach User-Aktionen.
Irgendwas laedt also **gigantisch viel** in den Speicher.

## Strategie

Ich habe drei Hauptverdaechtige mit URL-Parametern abschaltbar gemacht:

| URL-Parameter | Was wird ausgeschaltet |
|---|---|
| `?noAlarm=1`  | Firebase-Alarm-Listener (zieht ALLE Chat-Nachrichten) |
| `?noSync=1`   | Foto-Sync Intervalle (Drive Up-/Download) |
| `?noClock=1`  | 1-Sekunden-Timer (vermutlich harmlos) |
| `?minimal=1`  | **Alle drei gleichzeitig** aus |

## So finden wir den Schuldigen

### Test 1: Minimalmodus

Oeffne die App mit `?minimal=1` am Ende der URL:
```
https://phoenix180862-cloud.github.io/tw-business-suite/?minimal=1
```

Dann **normal testen**:
- Laeuft die App jetzt stabil?
- Memory-Badge im Auge behalten — wo pendelt er sich ein?

**Falls Memory normal bleibt (< 500 MB):** Der Schuldige ist einer
der drei Dienste. Weiter mit Test 2.

**Falls Memory weiter explodiert:** Der Schuldige ist anderswo
(z.B. Foto-Store-Laden). Sag mir den neuen Verlauf, dann suche
ich an anderer Stelle.

### Test 2: Einzeln pruefen (nur falls Test 1 erfolgreich)

Jeweils nur einen Dienst einschalten (die anderen aus):

```
?noAlarm=1&noClock=1        ← nur Foto-Sync aktiv
?noSync=1&noClock=1         ← nur Alarm-Listener aktiv
?noAlarm=1&noSync=1         ← nur Uhr aktiv
```

Der Parameter, bei dem Memory explodiert, ist der Schuldige.
Dann fixe ich den gezielt.

## Installation

1. ZIP entpacken, alle 9 Dateien auf GitHub pushen
2. **Tablet Cache leeren!**
3. App oeffnen mit `?minimal=1` in der URL
4. Normal nutzen, Memory-Badge beobachten
5. Screenshots vom Badge-Dialog machen und mir schicken

## Anmerkung

Die Debug-Flags sind KEIN Fix, nur Diagnose. Wenn wir den Schuldigen
haben, baue ich einen echten Fix (Memory sparsam laden, lazy load,
usw.). Das Testen jetzt dient nur dazu, Naehe zu schlagen.
