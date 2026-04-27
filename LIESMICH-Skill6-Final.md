# LIESMICH — Skill 6 Final-Umsetzung (Speicherwege & Drive-Sync)

**Build:** `20260427-final-skill6`
**Datum:** 27.04.2026
**Skill:** SKILLRaumblatt6.md (speicherwege-sync)

---

## Was wurde geliefert

Nach Vollanalyse der bestehenden Codebasis wurde **bewusst NICHT 1:1 umgesetzt**, sondern nur die echten Lücken geschlossen — ohne Doppelfunktionalitäten zu Auto-Save oder dem Akte-System zu schaffen.

### NEU implementiert

#### 1. `TWStorage.ensureKundenOrdner(kundeId)` in `tw-storage.js`
- Diagnose-Helfer: liefert `{existing, missing, all}` der lokal gespiegelten Drive-Ordner pro Kunde
- Verwendet **ausschließlich `window.DRIVE_ORDNER`** als Single Source of Truth
- Keine eigene Ordner-Liste — kein Drift-Risiko

#### 2. `KundenSyncButton` in `tw-shared-components.jsx`
- Wrapper um die bestehenden APIs `TWStorage.DriveSync.syncKundenOrdner` + `TWStorage.DriveUploadSync.uploadAppDateien`
- Phasen-State (idle / scanning / uploading / downloading / done / error)
- Pending-Badge mit Anzahl ausstehender Uploads
- Letzter Sync-Zeitpunkt mit "vor X Min."-Anzeige
- Inline-Fehler-Anzeige (KEIN alert/confirm-Spam wie der alte handleManualSync)
- Auto-Reset auf "idle" 4 Sekunden nach erfolgreichem Sync
- Hint wenn Drive nicht verbunden oder Kunde keinen Drive-Ordner hat

#### 3. Einbau in `tw-modulwahl.jsx`
- Sync-Button erscheint unter den Modul-Buttons in einem eigenen Container
- Nur sichtbar wenn ein Kunde aktiv ist
- Compact-Variante (12px Schrift)

#### 4. Einbau in `tw-app.jsx` (Akte-Modal)
- Sync-Button oberhalb der WIP-Liste
- `onSyncComplete`-Callback lädt Akte-Inhalt nach Sync neu

---

## Was wurde BEWUSST NICHT umgesetzt (mit Begründung)

### 1. Manueller "Bearbeitungsstand Speichern"-Button in jedem Modul
**Begründung:** Das bestehende `TW.AutoSave`-System (tw-core.js) ist überlegen:
- Speichert automatisch alle 1.5s nach Änderung (Debounce)
- Visibility-Rettungsring (synchroner Flush bei Tab-Close, Mobile-Wegwischen)
- Status-Broadcast für UI (`AutoSaveStatusIndicator` zeigt grau/orange/grün/rot)
- Akte-Modal listet alle Bearbeitungsstände mit Restore-Klick

Ein zusätzlicher manueller Button hätte zu User-Verwirrung geführt: "Speichert das automatisch oder muss ich klicken?"

### 2. `KUNDEN_ORDNER`-Konstante mit 7 Ordnernamen
**Begründung:** Würde mit `window.DRIVE_ORDNER` (11 echte Drive-Ordner-Namen) kollidieren und die "Drive folder inconsistency"-Fixes vom 18.04.2026 wieder kaputtmachen. **Niemals zwei Quellen für Ordner-Namen.**

### 3. Auto-Restore-Banner pro Modul
**Begründung:** Bereits zentral in tw-app.jsx (`autoRestoreToast`, Zeile 2176-2210) gelöst. Beim Kundenwechsel wird automatisch wiederhergestellt — ohne Popup, mit dezentem Toast.

### 4. Sync-Button in einzelnen Modulen (Aufmasz, Rechnung, etc.)
**Begründung:** Skill sagt explizit "NICHT in einzelnen Modulen". Der Sync gilt für den gesamten Kunden, nicht für ein einzelnes Modul.

---

## Bestehender globaler Sync-Button (handleManualSync in tw-aufmass.jsx)

Bleibt vorerst **erhalten**. Er hat einen anderen Use-Case: globaler Sync ALLER pendenden Kunden. Die neue `KundenSyncButton`-Komponente ist explizit pro-Kunde. Beide haben Existenzberechtigung. Spätere Konsolidierung möglich.

---

## Geänderte Dateien (im ZIP enthalten)

| Datei | Änderung |
|---|---|
| `tw-storage.js` | + `ensureKundenOrdner` Funktion + Export |
| `tw-shared-components.jsx` | + `KundenSyncButton` Komponente (~210 Zeilen) |
| `tw-modulwahl.jsx` | + Sync-Button-Container nach Modul-Liste |
| `tw-app.jsx` | + Sync-Button im Akte-Modal |
| `index.html` | **PFLICHT** — frisch gebaut, vorkompiliert |

---

## Build-Info

- **Build-Methode:** Bash-Equivalent zu `build.bat` v3.1
- **Pre-Compile:** Babel mit `@babel/preset-react`
- **Bundle-Größe:** ~1.435 KB
- **Sentinel-Marker:** `window.__twSentinel.completedModules` (alle 9 Module)
- **Pre-Render-Check:** App, ErrorBoundary, ModulWahl, KundenSyncButton (typeof-Test)

---

## Test-Checkliste für Thomas

- [ ] App startet ohne Fehler-Overlay
- [ ] Modulwahl: neue "Datenstand mit Google Drive abgleichen"-Section unter den Modulen sichtbar
- [ ] Sync-Button zeigt aktuell "Drive-Sync (alles aktuell)" oder "Mit Drive synchronisieren"
- [ ] Bei Klick: Phasen-Text wechselt (Analysiere → Upload → Download → Synchron!)
- [ ] Pending-Badge erscheint wenn lokale Änderungen vorhanden
- [ ] "Letzter Sync: vor X Min." wird angezeigt
- [ ] Akte-Modal: Sync-Button oberhalb der Bearbeitungsstände sichtbar
- [ ] Console: `[TW Sentinel] Pre-render check` zeigt `KundenSyncButton: "function"`
- [ ] Console: `window.TWStorage.ensureKundenOrdner('TestKunde')` liefert Promise mit `{existing, missing, all}`

---

## Falls etwas nicht funktioniert

1. **Strg+Shift+R** im Browser für Cache-Refresh
2. DevTools öffnen, Console-Log auf "TW Sentinel" prüfen
3. `window.__twSentinel.completedModules` in der Console eingeben — sollte alle 9 Module zeigen
4. Bei Sync-Fehlern: Inline-Fehler-Anzeige im Sync-Button beachten (nicht mehr alert)

---

*Auslieferung gemäß SKILLBuildAuslieferung.md mit vollständiger index.html.*
