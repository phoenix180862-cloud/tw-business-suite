# LIESMICH — Hotfix Pos-Modal: ALLES in der globalen App-Toolbar

**Stand:** 25.04.2026, ca. 17:10 Uhr  
**Mandat:** "Es waere sicher moeglich, aus allem eine einzige Leiste zu machen, dass Du diesen Bereich auf das Dropdown Fenster mit Aufmass und Bearbeiten ebenfalls mit in diese Leiste integrierst. Sodass gar keine zweite Ebene mehr erforderlich ist."

---

## Was sich geaendert hat — Architektur

Die Pos-Modal-Aktionen leben jetzt **nicht mehr** als eigene Toolbar im Modal, sondern werden von tw-aufmass.jsx ueber einen window-globalen Setter in die globale App-Toolbar (in tw-app.jsx) eingespeist. Das heisst:

- **Eine einzige Toolbar oben** mit ALLEN Aktionen (NavDropdown, Bearbeiten-Dropdown, Speichern, Laden, Beginn, Direkt, Pillen, Abbrechen).
- **Keine zweite Ebene mehr.**
- **Dropdowns AUFMASS/BEARBEITEN klappen frei nach unten auf** — kein Modal-Overlay verdeckt sie.

### Layout der App-Toolbar im Pos-Modal-Modus

```
+--------------------------------------------------------------------------------------------------+
| [App-Header: Datum + TW BUSINESS SUITE + Status-Pille rechts]                                    |
+--------------------------------------------------------------------------------------------------+
| [AUFMASS ▼] [BEARBEITEN ▼]  [💾 Speichern] [📂 Laden] [🏗️ Beginn des Aufmasses] [📐 Direktes Aufmass] [Zugang Aufzug (0.04)] [6 POS.] [✕ Abbrechen]  [AutoSave] [FotoSync] [Storage] [Memory]
+--------------------------------------------------------------------------------------------------+
| [Pos-Liste -- VOLLER PLATZ]                                                                      |
| Pos. 1.1 ...                                                                                     |
| Pos. 2.1.1 ...                                                                                   |
| ...                                                                                              |
```

Wenn das Pos-Modal NICHT offen ist, bleibt die App-Toolbar wie immer (nur NavDropdown + Bearbeiten + Status-Indikatoren).

---

## Wie das technisch funktioniert (Kurz-Erklaerung)

1. In `tw-app.jsx` wurde ein State `posModalToolbar` und ein global verfuegbarer Setter `window.__twSetPosModalToolbar` eingebaut. Die App-Toolbar rendert -- wenn der State nicht null ist -- den Inhalt zwischen ihrer linken und rechten Gruppe.

2. In `tw-aufmass.jsx` haengt ein useEffect an `showPosModal && activeRaum`: bei Open ruft er `window.__twSetPosModalToolbar(<JSX-Buttons>)` auf, bei Close ruft er `setter(null)` auf. Beim Unmount der Aufmass-Komponente macht der useEffect-Cleanup das gleiche -- damit bleibt die App-Toolbar sauber, falls man mitten im Modal die Seite wechselt.

3. Das Pos-Modal-Overlay enthaelt nur noch den dunklen Hintergrund + die Positionsliste. Keine eigene Toolbar mehr.

---

## Was du jetzt sehen wirst

1. **Aufmass-Modul oeffnen, Raum waehlen** -> Pos-Modal poppt auf.
2. **Oben in der App-Toolbar** siehst du jetzt ZUSAETZLICH zu AUFMASS/BEARBEITEN-Dropdown auch die fuenf Modal-Buttons mit den ausfuehrlichen Labels:
   - `🏗️ Beginn des Aufmasses` (orange) -- bei Folgeraeumen wird der Text zu `📋 Positionen Raumblatt`
   - `📐 Direktes Aufmass` (blau)
   - `✕ Abbrechen` (rot)
   plus Speichern/Laden vorne und die zwei Status-Pillen (Raum-Bezeichnung + Pos-Anzahl).
3. **AUFMASS-Dropdown und BEARBEITEN-Dropdown** in der gleichen Toolbar tippen -> klappen sauber nach unten in die Positionsliste hinein. Kein Modal-Overlay mehr im Weg.
4. **Positionsliste** beginnt direkt unter der Toolbar -- kein Footer-Block, keine zweite Toolbar, maximaler Platz.

### Wenn die Toolbar zu eng wird

Auf einem Mobile-Geraet im Hochformat passen die vielen Buttons nicht mehr in eine Zeile. Die App-Toolbar hat `flexWrap:wrap`, also bricht sie automatisch um. Auf einem Tablet im Querformat sollte alles in einer Zeile bleiben.

---

## Geaenderte Dateien

| Datei | Aenderung |
|---|---|
| `tw-app.jsx` | State `posModalToolbar` + global Setter `window.__twSetPosModalToolbar` + Render-Slot in der App-Toolbar (zwischen linker und rechter Gruppe) |
| `tw-aufmass.jsx` | Pos-Modal-Toolbar (ToolbarRow im Modal) komplett entfernt; stattdessen useEffect der bei Modal-Open die Buttons als JSX in die App-Toolbar einspeist |
| `index.html` | Frisch gebaut |

`tw-design.css` ist seit dem ersten Hotfix (top:160px fuer pos-modal-overlay) unveraendert -- das polstert weiterhin gegen ueberlange App-Toolbars.

---

## Wichtig fuer's Hochladen

Du brauchst diese drei Dateien:
- `index.html` (frisch gebaut)
- `tw-aufmass.jsx`
- `tw-app.jsx` (NEU dabei -- in den vorigen ZIPs nicht enthalten!)

`tw-design.css` ist weiterhin gueltig vom ersten Hotfix. Wenn du das nicht hochgeladen hast, lade es jetzt mit hoch.

---

**Thomas Willwacher Fliesenlegermeister e.K. -- TW Business Suite -- Hotfix 25.04.2026**
