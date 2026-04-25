# Pro-Komponenten-Render-Counter (25.04.2026, Diagnose)

## Was du gemessen hast

| Test                    | Allokationsrate          |
|-------------------------|--------------------------|
| Aufmass (Raumerkennung) | wuchs auf 25 MB/s        |
| Foto-Direkt-Klick       | bis zu 90 MB/s           |
| Foto + noFotos + noSync | **trotzdem 80 MB/s**     |

Der dritte Wert ist der wichtige: Mit beiden Diagnose-Flags AN — also Foto-State
leer, kein Sync, kein Foto-Tab-Rendering — laeuft das Leck weiter. Heisst:
Quelle ist nicht im Foto-Pfad und nicht im Sync-Pfad. Sie sitzt in einer
Komponente, die beim direkten Foto-Klick gemountet wird, aber von keinem der
beiden Flags abgefangen wird.

## Warum dieser Build kein Fix-Build ist, sondern Diagnose

Bisher zeigt das Memory-Badge nur App-Renders. Eine App rendert vielleicht
nur 1x — aber wenn die Raumblatt-Komponente innerhalb davon 60x pro Sekunde
neu rendert, war das bisher unsichtbar.

Dieser Build erweitert das Werkzeug: **pro Komponente ein eigener Render-Counter.**

## Was sich am Memory-Badge geaendert hat

Die untere Zeile zeigt jetzt die Top-Renderer pro Sekunde, kompakt:
- `App:1 Raum:0` — alles ruhig
- `Raum:47 App:1` — Raumerkennung in einer Schleife, klare Diagnose
- `⚠ Raumblatt: 65/s` — Spitzenwert in Rot, falls eine Komponente >5/s rendert

Tooltip beim Drueberfahren zeigt komplette Liste mit allen Komponenten.

## Was ich von dir brauche

**Test mit beiden Flags weiter AN**, direkt aufs Foto-Modul. Diesmal aber
nicht nur die obere Zahl ablesen, sondern **die UNTERE Zeile** vom Badge.

Schick mir den Wert nach 5–10 Sekunden, bevor's crasht. Idealerweise einen
Screenshot oder den vollen Tooltip-Inhalt (Maus drueberhalten ohne klicken).

**Mit dieser Information weiss ich exakt:**

- Wenn `Raumblatt: 60/s` → Render-Schleife in Raumblatt, eine setState-im-Render-
  Body oder fehlerhafte Dependency. Sehr gut lokalisierbar, schneller Fix.
- Wenn `App: 60/s` und `Raumblatt: 60/s` → ganze App rendert mit, ein State-Setter
  ganz oben triggert die Kette.
- Wenn alle Renders niedrig (alle <5/s) bei 80 MB/s → es ist KEIN Render-Leck,
  sondern ein Daten-Leck im Hintergrund. Dann grabe ich in die WIP-Restore und
  Drive-Cache-Pfade.

Ohne diese Zahl rate ich. Mit dieser Zahl trifft der naechste Fix.

## Geaenderte Dateien

1. `index.html` — frisch gebaut
2. `tw-app.jsx` — App-Render-Counter erweitert
3. `tw-aufmass.jsx` — Raumerkennung + Raumblatt mit Render-Counter
4. `index-template.html` — Memory-Badge zeigt Top-Renderer
