# LIESMICH — Platzoptimierung & Toolbar (Phase 1)

**Stand:** 25.04.2026  
**Skill-Basis:** `SKILL-platzoptimierung-toolbar.md`  
**Build-Version dieses Pakets:** siehe Konsole nach App-Start (`[TW Build] Version: ...`)

---

## Was ist drin (Phase 1)

Diese Lieferung enthaelt die Infrastruktur fuer die App-weite Platzoptimierung. Sie wirkt schon ohne weitere Anpassungen sichtbar — und sie stellt die Werkzeuge bereit, mit denen die seitenweise Migration in Phase 2 sauber laufen kann.

### Sofortige Verbesserungen ohne Code-Aenderung in den Modulen

1. **Bearbeiten-Dropdown auf jeder Bearbeitungsseite:**
   - Submenues klappen jetzt als **Akkordeon nach unten** auf, nicht mehr als Sub-Panel rechts daneben. Das fixt das Bild-5-Problem vom 25.04. komplett — am Handy ist nichts mehr abgeschnitten.
   - Touch-Klicks sind robust (`onPointerDown` mit `stopPropagation`, `touchAction:'manipulation'`).
   - **Mehrere Dropdowns koennen parallel offen sein**, weil jede Instanz einen eigenen `useState` hat.

2. **Bearbeiten-Dropdown auf dem Handy:**
   - Auf Bildschirmen unter 600 px Breite oeffnet sich das Dropdown automatisch als **Bottom-Sheet** von unten ins Bild — mit Backdrop, Drag-Indikator und ESC-Schliessung.
   - Body-Scroll wird wahrend des Sheets gesperrt, damit der Hintergrund nicht weglaeuft.

3. **Navigation-Dropdown (`Aufmass`, `Rechnung`, `Schriftverkehr` etc.):**
   - Gleiche Verbesserungen wie oben — Mobile = Bottom-Sheet, Desktop = klassisches Dropdown nach unten.

### Werkzeuge fuer Phase 2 (im Code, noch nicht eingesetzt)

Drei neue React-Komponenten in `tw-shared-components.jsx`, die im seitenweisen Sprint verwendet werden:

| Komponente | Zweck | Skill-Kapitel |
|---|---|---|
| `ToolbarRow` | Sticky horizontale Toolbar-Zeile mit linker und rechter Gruppe | Kap. 5 |
| `ToolbarButton` | Kompakter Action-Button (Icon + 1-2 Worte, Hoehe 32 px) | Kap. 4.2 + 6 |
| `StatusPill` | Anzeige-Pille (nicht klickbar) fuer Zaehler und Stati | Kap. 4.3 + 7 + 19 |
| `BottomSheetJSX` | Standalone-Bottom-Sheet fuer freie Verwendung in Modulen | Kap. 11 |

Plus drei neue CSS-Animationen in `tw-design.css`:

- `@keyframes slideUpSheet` — Bottom-Sheet glaesst von unten hoch
- `@keyframes twAccordionDown` — Akkordeon-Submenue klappt nach unten auf
- `@keyframes twDropDown` — Desktop-Dropdown sanft eingleiten

Plus die Helfer-Klasse `.tw-toolbar-row` mit Touch-Scroll und schmalem Scrollbalken.

---

## Was ist NICHT drin (kommt in Phase 2)

Die seitenweise Migration der einzelnen Module — also das tatsaechliche Ersetzen der Querbalken-Buttons und Banner durch die neuen Toolbar-Komponenten. Das Skill-Kapitel 18 schreibt diese Reihenfolge bewusst seitenweise vor, damit jede Aenderung getrennt getestet werden kann.

**Migrations-Reihenfolge (vom meistgenutzten Modul abwaerts):**

| # | Seite | Datei | Konkrete Aenderung |
|---|---|---|---|
| 1 | Aufmass — Raumblatt (4 Tabs) | `tw-aufmass.jsx` | Bearbeiten-Dropdown ist schon korrekt; Logo nicht verdecken; Querbalken-Buttons in `ToolbarRow` packen |
| 2 | Aufmass — Positionsauswahl | `tw-aufmass.jsx` | "LISTE SPEICHERN/LADEN" als `ToolbarButton`, Bottom-Buttons schrumpfen |
| 3 | Aufmass — Raumerkennung | `tw-aufmass.jsx` | "X RAEUME"-Banner durch `StatusPill`, "AUFMASS DIREKT STARTEN" als blauer `ToolbarButton` |
| 4 | Rechnungsmodul | `tw-rechnung.jsx` | Toolbar einbauen |
| 5 | Schriftverkehr | `tw-schriftverkehr.jsx` | Toolbar einbauen |
| 6 | Ausgangsbuch | `tw-ausgangsbuch.jsx` | Toolbar einbauen |
| 7 | Baustelle / Geraeteverwaltung | `tw-baustelle.jsx` | Toolbar einbauen |
| 8 | Kundenauswahl | `tw-modulwahl.jsx` | "10 PROJEKTE"-Zeile als `StatusPill` |
| 9 | KundenModusWahl | `tw-modulwahl.jsx` | nur Toolbar-Check |
| 10 | Modulauswahl | `tw-modulwahl.jsx` | nur Toolbar-Check |
| 11 | Startseite | `tw-app.jsx`/`tw-aufmass.jsx` | Logo bleibt unangetastet (im Code bereits korrekt) |

Pro Sprint ein Modul, ein neues ZIP, separater Test.

---

## Wie verwende ich die neuen Komponenten?

### Beispiel 1: Eine Seite mit Aktionen + Status

```jsx
<ToolbarRow
    left={<>
        <ToolbarButton icon="\u{1F4BE}" label="Speichern" onClick={handleSave} />
        <ToolbarButton icon="\u{1F4C2}" label="Laden"     onClick={handleLoad} color="blue" />
    </>}
    right={<>
        <StatusPill text="7 RAEUME" color="success" />
        <StatusPill text="12%"      color="info" />
    </>}
/>
```

Ergebnis: Eine 44 px hohe sticky Zeile direkt unter dem App-Header. Auf Mobile horizontal scrollbar, kein Zeilenumbruch.

### Beispiel 2: `stickyTop` anpassen

Wenn die Toolbar unter einer anderen sticky Bar liegt (z.B. dem 60 px App-Header plus einer 40 px Subtoolbar), `stickyTop` setzen:

```jsx
<ToolbarRow stickyTop={100} left={...} right={...} />
```

### Beispiel 3: Standalone-Bottom-Sheet

```jsx
{showSheet && (
    <BottomSheetJSX title="OPTIONEN WAEHLEN" onClose={() => setShowSheet(false)}>
        ... beliebiger Inhalt ...
    </BottomSheetJSX>
)}
```

---

## Wie teste ich die Akkordeon-Verbesserung?

1. App starten, Kunden waehlen, in ein beliebiges Modul gehen (z.B. Aufmass-Raumblatt).
2. Oben rechts auf **"Bearbeiten"** klicken.
3. Falls Untermenues existieren (Aufmass-Vorlage etc.) — sie klappen jetzt als Akkordeon mit rotem linken Balken **nach unten** auf, nicht mehr als Sub-Panel rechts daneben.
4. Auf dem Handy oeffnet sich das ganze Bearbeiten-Menue von unten als Bottom-Sheet.

---

## Pro-Seite-Checkliste fuer Phase 2

Vor jedem Phase-2-Commit/ZIP einer ueberarbeiteten Seite:

- [ ] Maximal 2 horizontale Zeilen zwischen App-Header und erstem Inhaltselement
- [ ] Keine Action-Buttons als Querbalken ueber die volle Breite
- [ ] Status-Anzeigen sind `StatusPill`, keine Banner-Zeilen
- [ ] `ToolbarRow` bricht nicht auf 2 Zeilen — bei zu vielen Buttons horizontal scrollen
- [ ] Touch-Targets mindestens 32 px hoch (44 px bevorzugt)
- [ ] Logo wird nicht verdeckt
- [ ] Visueller Test auf 360 px Breite (kleinstes Handy)
- [ ] Visueller Test auf 1024 px Breite (Tablet quer / PC)

---

## Geaenderte Dateien

| Datei | Aenderung |
|---|---|
| `tw-nav-dropdowns.js` | **Komplett neu geschrieben** (V2). API-kompatibel zu V1. Akkordeon-Submenues + Bottom-Sheet. |
| `tw-shared-components.jsx` | **Erweitert** um `ToolbarRow`, `ToolbarButton`, `StatusPill`, `BottomSheetJSX`. |
| `tw-design.css` | **Erweitert** um `@keyframes slideUpSheet`, `twAccordionDown`, `twDropDown`, `.tw-toolbar-row`. |
| `index.html` | **Frisch gebaut** (sonst startet die App nicht — kritische Regel aus `SKILLBuildAuslieferung.md`). |

---

**Thomas Willwacher Fliesenlegermeister e.K. — TW Business Suite — Phase 1 Platzoptimierung**
