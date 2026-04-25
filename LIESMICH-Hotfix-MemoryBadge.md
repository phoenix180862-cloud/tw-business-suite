# LIESMICH — HOTFIX Phase 1: ReferenceError MemoryBadge

**Stand:** 25.04.2026 nachmittags  
**Anlass:** Bei der Auslieferung von Phase 1 stuerzte die App mit  
`ReferenceError: MemoryBadge is not defined` ab.

---

## Was war passiert

Mein Linux-Build hat die strengen Sanity-Checks aus `build.bat` Schritt 7 nicht in voller Schaerfe durchgefuehrt. Genauer: ich habe mit `grep -c "MemoryBadge"` gezaehlt -- das findet aber auch die *Verwendung* in `tw-app.jsx` (`<MemoryBadge />`) und einen Kommentar. Es findet nicht, ob die *Definition* (`function MemoryBadge`) tatsaechlich im Bundle landet.

Tatsaechlich existieren vier Komponenten **gar nicht in den JSX-Quellen**, sondern nur im alten Live-Build der GitHub-Pages-Site. Sie wurden frueher mal direkt in den kompilierten Bundle eingefuegt, aber nie zurueck nach `tw-shared-components.jsx` migriert. Genau dieser Fall ist in deiner Memory dokumentiert: *"Pflicht-Check fuer StorageHealthDashboard und MemoryBadge (verhindert, dass Komponenten nur im Build, nicht in Quellen existieren -- das war 25.04.2026 ein Live-Bombe-Szenario)"*.

Beim Re-Build aus den Quellen verschwanden sie -- und die App startete nicht mehr.

Betroffene Komponenten:

- `StorageHealthDashboard` (Storage-Health-Modal)
- `MemoryBadge` (oben rechts neben den Status-Anzeigen)
- `KonfliktDialog` (Drive-Sync-Konflikt-Dialog)
- `KonfliktDialogHost` (stateful Wrapper, registriert `window._showKonfliktDialog`)

## Was ist gefixt

1. Die vier Komponenten plus die `_HealthCard`-Hilfskomponente wurden aus dem alten Live-Bundle extrahiert und in eine neue Datei `tw-storage-components.js` gepackt -- exakt nach dem Muster der bereits bewaehrten `tw-nav-dropdowns.js` (IIFE-Wrapper, globale Exports via `window.X = X`).

2. `index-template.html` laedt diese Datei jetzt direkt nach `tw-nav-dropdowns.js` und vor dem JSX-Bundle. Damit sind die Komponenten als bare Identifier im globalen Scope verfuegbar, wenn `tw-app.jsx` sie referenziert.

3. Der Linux-Build verwendet nun den verschaerften Sanity-Check, der **alle** kritischen Komponenten als `function X`-Definition pruefen:

   ```
   App, ErrorBoundary, FirmenLogo, ModulWahl,
   NavDropdown, AktionDropdown,
   ToolbarRow, ToolbarButton, StatusPill,
   StorageHealthDashboard, MemoryBadge,
   KonfliktDialog, KonfliktDialogHost
   ```

   Der Check sucht in `index.html` UND in den externen JS-Dateien (`tw-nav-dropdowns.js`, `tw-storage-components.js`). Keine Komponente kann mehr unter den Tisch fallen.

4. Der `__twSentinel.preRenderCheck` im Bundle wurde entsprechend erweitert -- in der Browser-Konsole erscheint nun beim Start:

   ```
   [TW Sentinel] Pre-render check: {
     ...,
     StorageHealthDashboard: "function",
     MemoryBadge: "function",
     KonfliktDialog: "function",
     KonfliktDialogHost: "function"
   }
   ```

   Wenn dort statt `"function"` ein `"undefined"` steht, ist die externe JS-Datei nicht geladen worden -- dann sofort den Cache leeren oder pruefen, ob `tw-storage-components.js` mit auf dem Server liegt.

---

## Was musst du tun

1. **Phase-1-ZIP von vorhin nicht verwenden.** Auch das Phase-2-Sprint-A-ZIP kurz danach hat denselben Bug.
2. Dieses ZIP entpacken und ALLE Dateien hochladen:
   - `index.html` (frisch gebaut)
   - `index-template.html` (neue Skript-Tag-Zeile fuer tw-storage-components.js)
   - `tw-storage-components.js` (NEU)
   - `tw-nav-dropdowns.js` (Phase-1-Version mit Akkordeon)
   - `tw-shared-components.jsx` (Phase-1 + Phase-2-Sprint-A)
   - `tw-aufmass.jsx` (Phase-2-Sprint-A: Raumerkennung + Pos-Modal)
   - `tw-design.css` (Phase-1-Animationen)
3. Tablet: Strg+Shift+R fuer Cache-Bust.
4. Konsole pruefen -- `[TW-StorageComponents] 4 Komponenten registriert` muss erscheinen.
5. App sollte starten und das `MemoryBadge` rechts oben sichtbar sein.

---

## Inhalt dieses ZIPs

Alle Aenderungen aus Phase 1 + Phase 2 Sprint A + Hotfix in einem Paket:

| Datei | Quelle | Aenderung |
|---|---|---|
| `index.html` | Hotfix-Build | Frisch gebaut, alle Komponenten-Definitionen vorhanden |
| `index-template.html` | Hotfix | NEU: `<script src="tw-storage-components.js?v=...">` |
| `tw-storage-components.js` | Hotfix (NEU) | 4 Komponenten extrahiert + IIFE-Wrapper |
| `tw-nav-dropdowns.js` | Phase 1 | V2 mit Akkordeon-Submenues + Bottom-Sheet |
| `tw-shared-components.jsx` | Phase 1 + 2A | + ToolbarRow, ToolbarButton, StatusPill, BottomSheetJSX, sticky-Prop |
| `tw-aufmass.jsx` | Phase 2A | Raumerkennung + Pos-Modal-Querbalken durch Toolbars ersetzt |
| `tw-design.css` | Phase 1 | + slideUpSheet, twAccordionDown, twDropDown Animationen |
| `LIESMICH-Hotfix-MemoryBadge.md` | Hotfix | Diese Datei |

---

## Lessons Learned (fuer die Memory)

- Sanity-Check niemals mit `grep -c "Wort"` machen, sondern mit `grep "function Wort"` -- nur so wird die Definition gepruefte und nicht nur die Referenz.
- Externe JS-Dateien (`tw-nav-dropdowns.js`, `tw-storage-components.js`) sind ein bewaehrtes Muster fuer Komponenten, die nicht in JSX-Quellen vorliegen. Beim Sanity-Check muss in **allen geladenen Dateien** gesucht werden, nicht nur in `index.html`.
- Pre-Render-Sentinel mit `typeof X` ist die letzte Verteidigungslinie -- wenn `"undefined"` drin steht, weiss man genau wo's hakt, ohne in die Browser-DevTools zu muessen.

---

**Thomas Willwacher Fliesenlegermeister e.K. -- TW Business Suite -- Hotfix MemoryBadge**
