# LIESMICH — Komplett-Update mit Pre-Compile (24.04.2026)

## TL;DR

Der "Oh nein!"-Crash am Tablet war **kein Code-Fehler**, sondern Chrome hatte
keinen Speicher mehr, weil die App jedes Mal 2,28 MB JSX live mit Babel
kompilierte. Loesung: **Vorkompilieren beim Build.**

Die ZIP enthaelt:
1. Fertig vorkompilierte `index.html` — direkt deploybar
2. Neue `build.bat` die zukuenftige Builds automatisch vorkompiliert
3. Aktualisierter `SKILLBuildAuslieferung.md` fuer Claude
4. Alle Quelldateien mit Performance-Kur + NavDropdown/AktionDropdown

## Sofort deployen

1. ZIP entpacken ins Repo-Verzeichnis (alle Dateien ueberschreiben)
2. **Auf GitHub pushen**
3. Am Tablet: Browser-Cache leeren oder Inkognito-Tab
4. App oeffnen — sollte jetzt laufen ✓

## Fuer zukuenftige Builds (einmalige Einrichtung)

Damit **du** zukuenftig selbst `build.bat` nutzen kannst (mit Vorkompilierung):

1. Siehe `INSTALL-BUILD-DEPENDENCIES.md` — einmalig Babel installieren
2. Ab dann: `build.bat` doppelklicken → macht alles automatisch

Ohne diese Einrichtung koennen weitere Builds weiterhin von mir gemacht
werden — der aktualisierte `SKILLBuildAuslieferung.md` sorgt dafuer, dass
ich es ab sofort immer richtig mache.

## Inhalt der ZIP

| Datei | Zweck |
|-------|-------|
| `index.html` | Fertig vorkompiliert, sofort deploybar (1,43 MB statt 2,28 MB) |
| `index-template.html` | Template mit Cache-Bust-Platzhaltern und Diagnose-Overlay |
| `build.bat` | **NEU:** Build mit Pre-Compile + Sanity-Checks |
| `package-build.json` | Abhaengigkeiten fuer den Build (Babel-CLI) |
| `SKILLBuildAuslieferung.md` | **NEU:** Aktualisierter Claude-Skill mit Pre-Compile-Pflicht |
| `INSTALL-BUILD-DEPENDENCIES.md` | Einmalige Einrichtungs-Anleitung |
| `tw-app.jsx` | Mit Block D2 StorageIndicator, B1 Blob-URL-Leak-Fix |
| `tw-aufmass.jsx` | Mit Block A (Kompression), C (Cancel/Retry), E (rAF) |
| `tw-core.js` | Mit Block B3 AutoSave-Lock |
| `tw-infrastructure.js` | Mit Block C fetchWithTimeout (Token-Persistenz bleibt) |
| `tw-rechnung.jsx` | Mit Block B1 Blob-URL-Leak-Fix |
| `tw-schriftverkehr.jsx` | Mit 3x Block B1 Blob-URL-Leak-Fixes |
| `tw-shared-components.jsx` | **NEU:** NavDropdown + AktionDropdown integriert |
| `tw-storage.js` | Mit Block A compressFileToDataUrl + D1 Cleanup-Retry |

## Was passiert technisch beim neuen Build-Prozess?

**Alt:**
```
index-template.html + tw-*.jsx (zusammenkopiert, ~2,2 MB JSX)
  ↓ deploy auf GitHub
  ↓ Browser laedt index.html (2,28 MB)
  ↓ Browser laedt zusaetzlich babel.min.js (600 KB)
  ↓ Babel kompiliert JSX live im Browser (~200 MB RAM Peak)
  ↓ Tablet: OUT OF MEMORY
```

**Neu (Pre-Compile):**
```
index-template.html + tw-*.jsx
  ↓ build.bat: Babel-CLI kompiliert JSX zu JavaScript (1,4 MB)
  ↓ Einbetten als type="text/javascript" in index.html
  ↓ deploy auf GitHub (1,43 MB total)
  ↓ Browser laedt und fuehrt direkt aus (kein Kompilieren)
  ↓ Tablet: lueft stabil ✓
```

## Zusaetzliche Sicherungen eingebaut

- **Cache-Bust:** Jeder Build bekommt einen Timestamp, der in Script-URLs
  eingesetzt wird — Browser sieht garantiert neue Dateien
- **Sentinel-Diagnose:** Falls es doch mal knallt, zeigt der Crash-Screen
  direkt im Browser-Fenster welche Module geladen wurden und was fehlt
- **Cache-Control Meta-Tags:** Browser soll index.html nicht lange cachen
- **Sanity-Checks im Build:** build.bat prueft, dass `type="text/babel"`
  NICHT mehr im Output ist und NavDropdown/AktionDropdown definiert sind
