# LIESMICH — Hotfix Pos-Modal: ALLES in einer Reihe

**Stand:** 25.04.2026 nachmittags  
**Mandat:** "Bitte alles in eine Reihe. Sodass ich moeglichst viele Positionen zum Bearbeiten auf der Seite sehen kann."

---

## Was war das Problem

Auch nach dem ersten Hotfix waren die Aktions-Buttons noch ueber mehrere Zonen verteilt:

```
Vorher (Zwischenstand):
+---------------------------------------------------+
| [App-Toolbar -- Zurueck/Vor/Aufmass/Bearbeiten]   |
+---------------------------------------------------+
| [Speichern] [Laden]   [Raum-Pille] [Pos-Pille]    |  <- Toolbar
+---------------------------------------------------+
| [Pos-Liste -- WENIG PLATZ]                        |
| ...                                               |
| ...                                               |
+---------------------------------------------------+
| [🏗️ BEGINN DES AUFMASSES]                          |  <- Footer-Block
| 6 Positionen -- Raumblatt oeffnen                 |     dicke Querbalken
| [📐 AUFMASS DIREKT STARTEN]                        |     ~180 px hoch!
| Raum X uebernehmen, ohne Positionsauswahl         |
| [ABBRECHEN]                                       |
+---------------------------------------------------+
```

Der ganze Footer-Block ass ~180 px vertikalen Platz weg. Die Positionsliste musste man scrollen, obwohl alles auf einer Tablet-Seite haetten passen koennen.

---

## Was jetzt anders ist

ALLE 5 Buttons + 2 Statuspillen in einer einzigen Toolbar-Zeile oben:

```
Nachher:
+---------------------------------------------------+
| [App-Toolbar -- Zurueck/Vor/Aufmass/Bearbeiten]   |
+---------------------------------------------------+
| [💾 Speichern] [📂 Laden] [🏗️ Beginn] [📐 Direkt]   [Zugang Aufzug (0.04)] [6 POS.] [✕ Abbrechen]
+---------------------------------------------------+
| [Pos-Liste -- VIEL PLATZ]                         |
| Pos. 1.1 ...                                      |
| Pos. 2.1.1 ...                                    |
| Pos. 2.1.2 ...                                    |
| Pos. 2.1.3 ...                                    |
| Pos. 2.1.4 ...                                    |
| Pos. 2.1.5 ...                                    |
| Pos. 2.1.6 ...                                    |
| ...                                               |
+---------------------------------------------------+
```

**Eingespart:** ~230 px vertikal gegenueber dem urspruenglichen Stand. Auf einem Tablet im Querformat siehst du jetzt rund **doppelt so viele Positionen ohne Scrollen**.

### Detail: Die einzelnen Buttons

| Button | Farbe | Wann disabled | Tooltip |
|---|---|---|---|
| 💾 Speichern | rot | Wenn keine Positionen ausgewaehlt | "Aktuelle Auswahl als wiederverwendbare Liste speichern" |
| 📂 Laden | rot | nie | "Gespeicherte Positionsliste laden" |
| 🏗️ Beginn (oder 📋 Raumblatt bei Folgeraum) | **orange** | Wenn keine Positionen ausgewaehlt | "X Position(en), Raumblatt oeffnen (Einstellungen vom Vorraum uebernommen)" bei Folgeraeumen |
| 📐 Direkt | **blau** | nie | "Raum uebernehmen, ohne Positionsauswahl" |
| ✕ Abbrechen | rot | nie | "Modal schliessen, ohne Aenderungen zu uebernehmen" |

Beginn-Button hat ZWEI Varianten:
- **Erster Raum:** Icon 🏗️, Label "Beginn"
- **Folgeraum:** Icon 📋, Label "Raumblatt" (Tooltip enthaelt: "Einstellungen vom Vorraum uebernommen")

Die Subtexte ("X Pos. -- Raumblatt oeffnen", "Einstellungen vom Vorraum uebernommen", "Ohne Raumauswahl und Positionsauswahl") sind nicht verloren -- sie sind als Tooltips beim langen Druecken / Hovern auf den Buttons.

---

## Wie testen

1. ZIP entpacken (3 Dateien), Strg+Shift+R.
2. Aufmass-Modul -> Raum waehlen -> Pos-Modal poppt auf.
3. **Pruefen oben:** Alle 5 Buttons + 2 Pillen in einer Zeile, kein Footer mehr unten.
4. **Pruefen unten:** Direkt unter der Positionsliste endet das Modal -- viel mehr Positionen sichtbar als vorher.
5. **Funktionscheck:**
   - Bei leerer Auswahl: Speichern und Beginn/Raumblatt-Button sind ausgegraut (disabled).
   - Pos auswaehlen: Speichern wird aktiv, Beginn-Button wird aktiv (orange).
   - Beginn klicken -> oeffnet das Raumblatt mit gewaehlten Positionen.
   - Direkt klicken -> oeffnet das Raumblatt ohne Positionen, mit aktivem Raum.
   - Abbrechen klicken -> Modal schliesst, keine Aenderungen.
   - Speichern: oeffnet "Liste-Speichern"-Sub-Modal wie zuvor.
   - Laden: oeffnet "Liste-Laden"-Sub-Modal wie zuvor.
   - AUFMASS und BEARBEITEN-Dropdowns oben in der App-Toolbar sind frei klickbar.

---

## Was bleibt, wenn die Toolbar zu eng wird?

`ToolbarRow` hat `flexWrap` als Sicherheitsnetz: Wenn auf einem schmalen Hochkant-Phone (360 px) nicht alle Buttons in eine Zeile passen, brechen sie automatisch um. Auf einem Tablet im Querformat ist das praktisch nie der Fall.

---

## Geaenderte Dateien

| Datei | Aenderung |
|---|---|
| `tw-aufmass.jsx` | Pos-Modal-Footer-Block (Zeilen 4910-4992 alt) komplett entfernt; alle drei Buttons (Beginn / Direkt / Abbrechen) in die bestehende ToolbarRow oben integriert; die ToolbarRow ist jetzt eine einzige Reihe mit allen Aktionen |
| `tw-design.css` | (unveraendert seit dem ersten Hotfix; pos-modal-overlay top:160px) |
| `index.html` | Frisch gebaut |

---

**Thomas Willwacher Fliesenlegermeister e.K. -- TW Business Suite -- Hotfix 25.04.2026**
