# Ehrliches Update: Memory-Problem weiter offen

**Stand: 24.04.2026, 19:21**

## Was ich gesehen habe

Auf deinen Bildern steht ganz oben im Screen ein Kommentar-Text,
der eigentlich im HTML-Kommentar sein sollte. Das ist ein Bauteil-
Fehler im Template — ich habe ihn gefixt. Aber er hat nichts mit
dem Memory-Problem zu tun.

## Was ich jetzt weiss

- Die App startet bei ~150 MB
- Nach Raumblatt-Oeffnen: 243 MB -> 729 MB -> 1443 MB -> 1924 MB -> Crash
- Auch mit `?minimal=1` (kein Alarm, kein Sync, keine Uhr) passiert das.

Das heisst: Es ist weder der Alarm-Listener, noch Foto-Sync, noch Uhr.
Mein erster Verdacht (doppelte Foto-Rehydrierung) war auch nicht die
Quelle -- der Code war schon auf Blob-URLs umgestellt.

## Was ich vermute

Irgendwo im Raumblatt wird kontinuierlich Speicher allokiert, nicht
einmalig. Der GC raeumt regelmaessig auf (wir sahen das: Sprung
von 1826 auf 973 MB bei 85s), aber danach wird wieder allokiert,
schneller als der GC aufraeumen kann.

Typische Kandidaten:
- Canvas-Operation bei jedem Render (Skizze? Grundriss-Zeichnung?)
- Grosze Objekte in useMemo-Listen ohne Memoization
- Re-Render-Endlos-Schleife

Da ich weiter raten wuerde, braeuchte ich eigentlich einen Debugger-Zugriff.

## Was in dieser ZIP drin ist

- Fix fuer den sichtbaren Template-Kommentar (der oben am Screen hing)
- Alle bisherigen Fixes zusammen

Wahrscheinlich crasht es trotzdem noch. Wenn ja, bitte einen anderen
Test: **Baustelle waehlen, aber KEIN Raumblatt oeffnen**. Wenn der
Memory dann stabil bleibt, ist es 100% im Raumblatt. Dann suche
ich gezielt dort.

## Was ich noch probieren kann

1. **Skizzen-Canvas abschalten** -- vielleicht wird der permanent neu gemalt
2. **Schritt-Rechenweg-Refresh abschalten** -- koennte bei jedem Input-Keystroke neu rechnen
3. **Harten Diagnose-Modus** mit `?heapDump=1`, der alle 10s ins Console schreibt was in window steht
