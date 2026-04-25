# LIESMICH — Phase 2, Sprint G: Modulwahl + Kundenwahl

**Stand:** 25.04.2026 nachmittags  
**Skill-Basis:** `SKILL-platzoptimierung-toolbar.md` (Inventur-Punkt 16)  
**Bedeutung:** Letzter Sprint -- Phase 2 ist nach diesem Sprint app-weit abgeschlossen.

---

## Was ist umgebaut

App-weite Konsistenz fuer Modus-Karten. Sprint D (Schriftverkehr-Kanalwahl) hat das kompakte Karten-Format gesetzt; Sprint G zieht die zwei verbleibenden Karten-Stellen nach, damit Modus-Karten **app-weit identisch** aussehen.

### Stelle 1: ModulWahl (`tw-modulwahl.jsx`)

Die 5 Modul-Karten (Aufmass / Rechnung / Ausgangsbuch / Schriftverkehr / Baustelle) waren mit `padding:'18px 16px'`, Icon `32x32`, Title `16px` etwas wuchtig. Jetzt:

| Eigenschaft | Vorher | Nachher |
|---|---|---|
| Karten-Padding | 18px 16px | 12px 14px |
| Icon-Groesse (SVG) | 32x32 | 26x26 |
| Karten-Gap | 14px | 10px |
| Title-Schrift | 16px | 14px |
| Beschreibungs-Schrift | 12px | 11px |
| Pfeil-Schrift | 20px | 16px |

Touch-Target ca. 49 px Hoehe -- Skill 5 Pflicht (>= 32 px) klar eingehalten.

### Stelle 2: KundenModusWahl (`tw-aufmass.jsx`, Zeile 582+)

Die 3 Modus-Karten ("Kundendaten laden" / "Gespeicherte Kundendaten aufrufen" / "Manuell anlegen") waren mit `padding:'20px'` und Icon-Emoji 32px sogar groesser als ModulWahl. Jetzt:

| Eigenschaft | Vorher | Nachher |
|---|---|---|
| Karten-Padding | 20px | 12px 14px |
| Icon-Emoji-Groesse | 32px | 26px |
| Karten-Gap | 16px | 10px |
| Title-Schrift | 16px | 14px |
| Beschreibungs-Schrift | 12px | 11px |
| Pfeil-Schrift | 20px | 16px |
| Pfeil-marginTop | 4px | 2px |
| Title-marginBottom | 4px | 2px |

Plus Zurueck-Button konsistent zu Sprint D verkleinert: `padding:'12px 32px'` -> `'10px 24px'`, `fontSize:'14px'` -> `13px`.

### Was wurde NICHT angefasst

- **Header-Bereiche** beider Komponenten: Logo + Kundenname + "Modul waehlen" / Bauhelm-Emoji + "Kundenauswahl" -- bewusst groessere Einleitungs-Bereiche, Skill-konform
- **Badges** ("EMPFOHLEN", "OFFLINE") in den KundenModusWahl-Karten
- **Disabled-Hint-Pille** wenn Drive nicht verbunden ist
- Geschaeftslogik der Module-Auswahl und Modus-Auswahl

---

## Konsistenz-Check: Modus-Karten app-weit

Nach Sprint G haben die Modus-Karten in **drei Bereichen** der App das gleiche kompakte Format:

| Bereich | Datei | Anzahl Karten |
|---|---|---|
| Schriftverkehr-Kanalwahl (E-Mail / Brief) | `tw-schriftverkehr.jsx` | 2 |
| Modulwahl (5 Hauptmodule) | `tw-modulwahl.jsx` | 5 |
| Kundenmoduswahl (3 Kunden-Quellen) | `tw-aufmass.jsx` | 3 |

Identisch: padding, gap, Icon-Groesse, Title-Schrift, Sub-Schrift, Pfeil. **Vorhersagbare User-Experience.**

---

## Wie testen

1. ZIP entpacken (4 Dateien), Strg+Shift+R.
2. Kunde auswaehlen oder neu anlegen.
3. **Kundenmoduswahl-Seite (Bauhelm-Icon):**
   - 3 Karten "Kundendaten laden" / "Gespeicherte Kundendaten aufrufen" / "Manuell anlegen" sind kompakter
   - Mehr passt auf den Bildschirm ohne Scrollen
   - Badges ("EMPFOHLEN", "OFFLINE") sind weiterhin sichtbar
   - Zurueck-Button ist auch kompakter
4. Einen Modus auswaehlen -> die Karten leiten korrekt weiter (Drive-Lade / Lokal / Manuell)
5. **Modulwahl-Seite (Logo + Kundenname):**
   - 5 Modul-Karten (Aufmass / Rechnung / ...) sind kompakter
   - Alle 5 Karten passen auf einen Blick auf den Bildschirm
   - Anklicken wechselt korrekt ins jeweilige Modul
6. **Vergleichstest:** Im Schriftverkehr-Modul auf "Kanal waehlen" gehen. Die 2 Karten dort (E-Mail / Brief) haben **exakt dasselbe Format** wie die Karten in den vorigen Punkten -- Konsistenz erreicht.

---

## Geaenderte Dateien

| Datei | Aenderung |
|---|---|
| `tw-modulwahl.jsx` | ModulWahl-Karten: padding/font/icon kompakter, Icon-Funktion auf 26x26 reduziert |
| `tw-aufmass.jsx` | KundenModusWahl: Karten-Padding/Icon/Schrift kompakter, Zurueck-Button kompakter |
| `index.html` | Frisch gebaut |

---

# Phase 2 Abschluss-Bilanz

| # | Bereich | Status | Was geaendert |
|---|---|---|---|
| 1 | Aufmass-Raumerkennung | Sprint A | "Direkt-Start"-Querbalken -> ToolbarRow + StatusPill |
| 2 | Aufmass-Pos-Modal | Sprint A | "Liste speichern/laden"-Querbalken -> ToolbarRow |
| 3 | Aufmass-Raumblatt | Sprint B | Material-Banner -> StatusPill, Geist-Wrapper-Box entfernt |
| 4 | Rechnungsmodul | Skip | Per Mandat unangetastet ("Finger weg") |
| 5 | Schriftverkehr | Sprint D | Alle Buttons kompakter (7 Stellen) |
| 6 | Ausgangsbuch | Sprint E | Alarm-Banner -> roter Quick-Filter im Header |
| 7 | Baustellen-App-Startseite | Sprint F | Info-Panel "Bereich waehlen" entfernt |
| 8 | Modulwahl + Kundenmoduswahl | Sprint G | Karten-Format konsistent kompakt |

**Plus Phase 1 Infrastruktur (vorab):**
- Akkordeon-Submenues in NavDropdown statt rechts ausklappend
- Bottom-Sheet auf Mobile (<600px) fuer Dropdowns
- ToolbarRow / ToolbarButton / StatusPill als wiederverwendbare Komponenten
- Memory-Badge / Storage-Health-Komponenten extern in tw-storage-components.js

**Plus Hotfix MemoryBadge:** Vier Komponenten aus index.html in tw-storage-components.js extrahiert, damit der Bundle-Build sie wieder findet.

---

## Was noch denkbar ist (optional, kein Skill-Verstoss mehr)

Wenn beim Tablet-Test noch Stellen auffallen, die zu wuchtig wirken, koennen wir gezielt nachbessern:
- **TeamVerwaltung-Dialoge** in tw-baustelle.jsx (ich habe bewusst Finger gelassen wegen Hybrid-Mitarbeiter-System)
- **Synchronisations-Bereich** in tw-baustelle.jsx
- **Tab-Sub-Navigation** im Aufmass-Raumblatt (Modus-Toggle in Tab 0, Filter in Tab 3 -- ist Skill 3.7 erlaubt, aber koennte noch kompakter)

Aber das sind Optionen, keine Pflicht. **Die App ist nach Phase 2 Skill-konform.**

---

**Thomas Willwacher Fliesenlegermeister e.K. -- TW Business Suite -- Phase 2 ABGESCHLOSSEN**
