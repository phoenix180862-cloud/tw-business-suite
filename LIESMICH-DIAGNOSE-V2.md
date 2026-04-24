# DIAGNOSE-BUILD V2 — Screenshot-Diagnose direkt im Crash-Screen

**Stand: 24.04.2026, 12:22**

## Was ist neu?

Der Crash-Screen zeigt jetzt automatisch **alle relevanten Diagnose-Infos** — 
ohne dass irgendeine Browser-Konsole geoeffnet werden muss. Einfach:

1. ZIP entpacken, alle Dateien nach GitHub pushen
2. App auf dem Tablet oeffnen
3. **Crash tritt ein** — diesmal mit detailliertem Info-Fenster
4. **Screenshot machen** und mir schicken

## Was im Screenshot zu sehen sein wird

- **BUILD-VERSION**: Ob du ueberhaupt die neueste Version geladen hast
- **MODULE GELADEN**: Welche Module erfolgreich kompiliert wurden
- **ABGEBROCHEN BEI**: Das Modul, das den Fehler verursacht hat
- **FUNKTIONEN DEFINIERT**: Ob NavDropdown, App, ModulWahl etc. existieren
- **ALLE FEHLER**: Vollstaendige Fehlerliste

## Zusaetzlich eingebaut

- **"Neu laden (Cache umgehen)"-Button** direkt im Crash-Screen
- **Auto-Diagnose** wenn App nach 5s nicht rendert
- Cache-Control Meta-Tags die den Browser-Cache umgehen
- Versionierte Script-Tags (?v=TIMESTAMP) fuer Cache-Bust

## Installation

1. ZIP entpacken
2. Alle 9 Dateien ins Repo-Root kopieren/ueberschreiben
3. Push auf GitHub
4. Am Tablet: **Strg+Shift+R** oder **Browser-Cache leeren**
5. App oeffnen und Screenshot machen

Danach kann ich sofort den genauen Fehler erkennen und gezielt fixen.
