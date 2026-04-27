# LIESMICH — Skill 6 HOTFIX (App-Crash behoben)

**Build:** `20260427-skill6-hotfix`
**Datum:** 27.04.2026, 22:00+
**Vorgaenger-Build:** `20260427-final-skill6` (war BROKEN)

---

## ROOT CAUSE des Crashes

```
ReferenceError: ToolbarButton is not defined
    at Raumerkennung (.../tw-business-suite/:548:82)
    at App (...)
    at ErrorBoundary (...)
```

**Warum:** Mein voriger Build basierte auf der **Projekt-Version (2061 Zeilen)** der `tw-shared-components.jsx`. Diese kannte `ToolbarButton`, `ToolbarRow` und `StatusPill` noch nicht. Da die `Raumerkennung` in `tw-aufmass.jsx` aber genau diese Komponenten verwendet, schlug der Render fehl und die ErrorBoundary fing den Crash ab.

**Lehre fuer die Zukunft:** Wenn Thomas eine Datei zwischen Chats hochlaedt, hat sie typischerweise einen NEUEREN Stand als das Projekt-Snapshot in `/mnt/project/`. Diese Version IMMER als Basis nehmen — nicht das Projekt-Snapshot.

---

## Was ist im Bundle

### Bewahrter Bestand (aus deiner 2446-Zeilen-Version)
- `ToolbarButton`, `ToolbarRow`, `StatusPill` — die fehlenden Komponenten, die Raumerkennung benoetigt
- `FigurThomas` mit Auto, "Yallah, Yallah!"-Sprechblase und KALASCHNIKOW-Aufdruck (3-fach in BauteamAnimation)
- Alle bestehenden Figuren (Ivan, Michal, Iurii, Peter, Luca AM, Luca 2, Silke, Thomas)

### Skill-6-Erweiterungen (neu)
- `KundenSyncButton` — Pro-Kunde Drive-Sync mit Phasen, Pending-Badge, Inline-Fehler
- `TWStorage.ensureKundenOrdner(kundeId)` — Diagnose-Helfer gegen `window.DRIVE_ORDNER`
- Sync-Button in `ModulWahl` (unter Modulen)
- Sync-Button im Akte-Modal (oberhalb Bearbeitungsstaende)

---

## Validierungs-Bestand

Im Sentinel-Pre-Render-Check (siehe DevTools Console, `window.__twSentinel.preRenderCheck`):

```javascript
{
    NavDropdown: "function",       // aus tw-nav-dropdowns.js
    AktionDropdown: "function",
    App: "function",
    ErrorBoundary: "function",
    FirmenLogo: "function",
    ModulWahl: "function",
    KundenSyncButton: "function",  // NEU Skill 6
    ToolbarButton: "function",     // CRASH-FIX
    ToolbarRow: "function",        // CRASH-FIX
    StatusPill: "function",        // CRASH-FIX
    FigurThomas: "function"        // Bauteam-Update
}
```

Falls in der Console eines davon `"undefined"` zeigt, ist beim Bundle-Build etwas schiefgegangen.

---

## Geaenderte Dateien (im ZIP)

| Datei | Aenderung |
|---|---|
| `tw-shared-components.jsx` | Basis = deine 2446-Zeilen-Version + KundenSyncButton |
| `tw-storage.js` | + ensureKundenOrdner |
| `tw-modulwahl.jsx` | Sync-Button-Container |
| `tw-app.jsx` | Sync-Button im Akte-Modal |
| `index.html` | **PFLICHT** — frisch gebaut, vorkompiliert, ~1.452 KB |

---

## Test-Reihenfolge nach Upload

1. **Strg+Shift+R** im Browser (Cache-Bust)
2. App startet → kein Fehler-Overlay mehr
3. Kunden auswaehlen → Modulwahl
4. Aufmasz oeffnen → **Raumerkennung darf nicht mehr crashen**
5. Bauteam-Animation auf Startseite → 3x FigurThomas mit Auto/Kalaschnikow sichtbar
6. Modulwahl: Sync-Button-Section unter Modulen
7. Akte-Modal: Sync-Button oberhalb der WIPs

---

## Falls es WEITERHIN crasht

In DevTools Console eingeben:
```javascript
window.__twSentinel.preRenderCheck
window.__twSentinel.completedModules
window.__twSentinel.lastModule
```

`completedModules` zeigt welche Module sauber durchgelaufen sind.
`lastModule` zeigt das LETZTE Modul, das beim Bundle-Aufbau aktiv war (= falls da ein Modul mittendrin abbricht, ist es das letzte registrierte).

Stack-Trace bitte direkt schicken — mit der Sentinel-Info kann ich praezise nachsteuern.
