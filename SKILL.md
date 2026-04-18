---
name: tw-delivery
description: >
  KRITISCHER Auslieferungs- und Architektur-Skill fuer die TW Business Suite.
  Dieser Skill MUSS bei JEDER Programmierarbeit, Code-Aenderung, Bug-Fix oder
  Feature-Entwicklung an der TW Business Suite getriggert werden. Er stellt sicher,
  dass Aenderungen korrekt ausgeliefert werden (index.html Build-Prozess),
  die Dateistruktur eingehalten wird, und keine Auslieferungsfehler entstehen.
  Trigger bei: jeder Code-Aenderung, "Fix", "Bug beheben", "Feature einbauen",
  "Funktion aendern", "Modul erweitern", "Update", "Aenderung", "programmieren",
  "implementieren", "einbauen", "umbauen", "Fehler beheben", "korrigieren",
  "neue Seite", "neues Modul", "ZIP erstellen", "Dateien liefern", "ausliefern",
  "build", "zusammenbauen", "index.html", "deploy", "testen".
  Auch triggern wenn der User ueber Architektur, Dateistruktur, Module, 
  Build-Prozess, oder Projektstruktur spricht.
  IMMER diesen Skill ZUERST lesen bevor Code geschrieben wird!
  Wenn Architektur-Aenderungen vorgenommen werden (neue Module, neue Dateien,
  geaenderte Ladereihenfolge, neue Abhaengigkeiten), MUSS dieser Skill
  aktualisiert werden — siehe Abschnitt "Selbst-Update-Pflicht".
---

# TW Business Suite: Delivery & Architecture Skill

## ZWECK

Dieser Skill ist die **zentrale Wahrheitsquelle** fuer die Architektur, den
Build-Prozess und die Auslieferung der TW Business Suite. Er verhindert
Auslieferungsfehler, die entstehen wenn Aenderungen zwar in einzelnen
Quelldateien gemacht aber nicht korrekt in die laufende App uebertragen werden.

**Kernregel:** Die App laeuft AUS der `index.html`. Einzelne JSX/JS-Dateien
werden NIEMALS direkt vom Browser geladen (ausser tw-core.js, tw-storage.js
und tw-design.css die per script/link-Tag eingebunden sind).

---

## ARCHITEKTUR-UEBERSICHT

### Dateistruktur (Flat Directory — KEINE Unterordner!)

```
tw-business-suite/
├── index.html                  ← LAUFENDE APP (vom Browser geladen)
├── index-template.html         ← HTML-Grundgeruest (Head, CSS, externe Libs)
├── build.bat                   ← Windows Build-Script
├── start-server.bat            ← Python SimpleHTTPServer (Port 8080)
│
├── tw-design.css               ← Styles (per <link> in Template)
├── tw-core.js                  ← Core-Logik (per <script src> in Template)
├── tw-storage.js               ← IndexedDB/DriveSync (per <script src> in Template)
├── tw-infrastructure.js        ← Google Drive/Gemini Services (INLINE in Template)
├── tw-kundendaten-parser.js    ← Excel-Parser (INLINE in Template)
│
├── tw-shared-components.jsx    ← Shared UI-Komponenten (ErrorBoundary, StatusBar...)
├── tw-aufmass.jsx              ← Aufmass-Modul (KundenModusWahl, ManuelleEingabe, Raumblatt...)
├── tw-modulwahl.jsx            ← Modulwahl-Seite
├── tw-rechnung.jsx             ← Rechnungs-Modul
├── tw-schriftverkehr.jsx       ← Schriftverkehr-Modul
├── tw-ausgangsbuch.jsx         ← Ausgangsbuch-Modul
├── tw-baustelle.jsx            ← Baustellen-App Admin
├── tw-daten-uebersicht.jsx     ← Daten-Uebersicht (3 Listen Ansicht)
└── tw-app.jsx                  ← Haupt-App (Router, State, alle Handler)
```

### Wie Module geladen werden

Die `index.html` wird aus `index-template.html` + allen Modulen zusammengebaut:

```
index-template.html          ← HTML bis </head>, externe Libs, <body>-Start
  ├── <link href="tw-design.css">
  ├── <script src="tw-core.js">
  ├── <script src="tw-storage.js">
  ├── tw-infrastructure.js     (inline im Template)
  └── tw-kundendaten-parser.js (inline im Template)

<div id="root"></div>
<script type="text/babel">
  ├── tw-shared-components.jsx   (1. — Basis-Komponenten)
  ├── tw-aufmass.jsx             (2. — groesstes Modul)
  ├── tw-modulwahl.jsx           (3.)
  ├── tw-rechnung.jsx            (4.)
  ├── tw-schriftverkehr.jsx      (5.)
  ├── tw-ausgangsbuch.jsx        (6.)
  ├── tw-baustelle.jsx           (7.)
  ├── tw-daten-uebersicht.jsx    (8. — MUSS vor tw-app.jsx!)
  └── tw-app.jsx                 (9. — IMMER LETZTES JSX-Modul!)

  root.render(<ErrorBoundary><App /></ErrorBoundary>);
</script>
</body></html>
```

**REIHENFOLGE IST KRITISCH!** tw-app.jsx muss IMMER das letzte JSX-Modul sein,
weil es alle anderen Komponenten referenziert.

---

## AUSLIEFERUNGS-CHECKLISTE

Bei JEDER Code-Aenderung muessen diese Schritte befolgt werden:

### Schritt 1: Dateien identifizieren
- Welche Dateien werden geaendert?
- Nur JSX-Dateien? → index.html muss neu gebaut werden
- JS-Dateien (tw-storage.js, tw-core.js)? → Einzeldatei reicht, ABER pruefen
  ob sie per <script src> oder inline geladen werden
- CSS (tw-design.css)? → Einzeldatei reicht

### Schritt 2: Aenderungen implementieren
- Dateien aus /mnt/project/ nach /home/claude/ kopieren
- Aenderungen mit str_replace durchfuehren
- KEINE deutschen Umlaute in JSX-Kommentaren verwenden (UTF-8 Encoding-Fehler!)
- Umlaute nur in String-Literalen und UI-Texten verwenden

### Schritt 3: Babel-Syntax pruefen
```bash
npx babel --presets @babel/preset-react <datei>.jsx -o /dev/null 2>&1
```
- Warnung "code generator has deoptimised" ist OK (Datei > 100KB)
- Vorbestehende Fehler dokumentieren, NICHT als eigenen Bug melden

### Schritt 4: index.html zusammenbauen (PFLICHT bei JSX-Aenderungen!)
```bash
cd /home/claude

# 1. Template kopieren (enthaelt bereits <div id="root">!)
cp /mnt/project/index-template.html index.html

# 2. Babel-Script-Block oeffnen
#    WICHTIG: Seit 18.04.2026 enthaelt das Template bereits das <div id="root">.
#    Frueher wurde das hier nochmal eingefuegt (doppelter Bug) — jetzt NICHT mehr!
printf '\n    <script type="text/babel">\n' >> index.html

# 3. Module in EXAKTER Reihenfolge einfuegen
printf '\n' >> index.html
cat tw-shared-components.jsx >> index.html     # oder /mnt/project/ wenn unveraendert
printf '\n' >> index.html
cat tw-aufmass.jsx >> index.html
printf '\n' >> index.html
cat tw-modulwahl.jsx >> index.html
printf '\n' >> index.html
cat tw-rechnung.jsx >> index.html
printf '\n' >> index.html
cat tw-schriftverkehr.jsx >> index.html
printf '\n' >> index.html
cat tw-ausgangsbuch.jsx >> index.html
printf '\n' >> index.html
cat tw-baustelle.jsx >> index.html
printf '\n' >> index.html
cat tw-daten-uebersicht.jsx >> index.html
printf '\n' >> index.html
cat tw-app.jsx >> index.html

# 4. Mount-Code + Schluss-Tags
printf '\n' >> index.html
echo "        const root = ReactDOM.createRoot(document.getElementById('root'));" >> index.html
echo '        root.render(<ErrorBoundary><App /></ErrorBoundary>);' >> index.html
echo '    </script>' >> index.html
echo '</body>' >> index.html
echo '</html>' >> index.html
```

**WICHTIG:** Fuer jedes Modul gilt:
- Wenn die Datei GEAENDERT wurde → aus /home/claude/ nehmen
- Wenn die Datei UNVERAENDERT ist → aus /mnt/project/ nehmen

### Schritt 5: Verifizierung
```bash
# Pruefen ob alle Kernfunktionen vorhanden sind
grep -c "function App()" index.html                    # muss 1 sein
grep -c "function DatenUebersicht" index.html          # muss 1 sein
grep -c "function KundenModusWahl" index.html          # muss 1 sein
grep -c "function ManuelleEingabe" index.html          # muss 1 sein
grep -c "function Startseite" index.html               # muss 1 sein
grep -c "function ModulWahl" index.html                # muss 1 sein
grep -c "root.render" index.html                       # muss 1 sein

# Pruefen ob eigene Aenderungen drin sind (spezifische Marker)
# → Hier projektspezifische Grep-Checks einfuegen
```

### Schritt 6: ZIP erstellen und ausliefern
```bash
# ZIP mit ALLEN relevanten Dateien
zip -j /mnt/user-data/outputs/tw-update.zip \
    index.html \
    <geaenderte-jsx-dateien> \
    <geaenderte-js-dateien> \
    build.bat   # nur wenn build.bat aktualisiert wurde
```

Das ZIP muss IMMER enthalten:
1. **index.html** — die fertig zusammengebaute App (PFLICHT!)
2. Alle geaenderten Einzeldateien (fuer zukuenftige Builds)
3. build.bat — falls die Modulreihenfolge sich geaendert hat

### Schritt 7: present_files aufrufen
```bash
present_files(["/mnt/user-data/outputs/tw-update.zip"])
```

---

## HAEUFIGE FEHLERQUELLEN

### Fehler 1: Nur JSX-Dateien ausliefern (OHNE index.html)
**Problem:** Die App liest die JSX-Dateien nicht direkt!
**Loesung:** IMMER index.html mitbauen und ausliefern.

### Fehler 2: tw-daten-uebersicht.jsx vergessen
**Problem:** Die alte build.bat enthielt dieses Modul nicht.
**Loesung:** Die aktuelle Modulliste (siehe oben) verwenden.

### Fehler 3: Falsche Reihenfolge der Module
**Problem:** tw-app.jsx vor anderen Modulen → Komponenten nicht definiert.
**Loesung:** tw-app.jsx ist IMMER das LETZTE JSX-Modul.

### Fehler 4: Deutsche Umlaute in JSX-Kommentaren
**Problem:** fetch() + UTF-8 Encoding-Fehler im Browser.
**Loesung:** In Kommentaren ae/oe/ue statt Umlaute verwenden.

### Fehler 5: Subdirectories annehmen
**Problem:** Alle Dateien liegen FLACH im Root-Verzeichnis.
**Loesung:** NIEMALS modules/, src/, oder andere Unterordner verwenden.

### Fehler 6: React-State Timing bei Navigation
**Problem:** setImportResult() + navigateTo() im selben Tick →
DatenUebersicht mounted bevor importResult committed ist.
**Loesung:** setTimeout(50ms) zwischen State-Update und Navigation.

---

## SELBST-UPDATE-PFLICHT

### Wann muss dieser Skill aktualisiert werden?

Dieser Skill MUSS aktualisiert werden wenn:

1. **Neue Module** hinzugefuegt werden (neue .jsx oder .js Dateien)
2. **Module umbenannt** oder **entfernt** werden
3. **Ladereihenfolge** sich aendert
4. **Neue externe Abhaengigkeiten** hinzukommen (CDN-Links, Libraries)
5. **Build-Prozess** sich aendert (z.B. von Babel zu Vite)
6. **Neue Auslieferungsregeln** erkannt werden (neue Fehlerquellen)
7. **Architektur-Aenderungen** vorgenommen werden (z.B. Modular → Bundled)

### Wie wird der Skill aktualisiert?

Bei jeder Architektur-Aenderung:

1. Claude erkennt automatisch, dass die Aenderung skill-relevant ist
2. Claude informiert Thomas: "Diese Aenderung betrifft die Projektarchitektur.
   Ich aktualisiere den Delivery-Skill."
3. Claude liest den aktuellen Skill aus /mnt/skills/user/tw-delivery/SKILL.md
4. Claude erstellt eine aktualisierte Version mit den neuen Informationen
5. Claude liefert den aktualisierten SKILL.md als Teil des ZIPs mit aus
6. Thomas ersetzt die Datei im Skill-Ordner

### Was zaehlt als Architektur-Aenderung?

- Neue Datei erstellt (z.B. tw-kalkulation.jsx)
- Datei umbenannt (z.B. tw-aufmass.jsx → tw-aufmass-v2.jsx)
- Neue <script src> oder <link> Tags in index-template.html
- Aenderung an der Lade-Strategie (z.B. Module per fetch() statt inline)
- Neues globales Objekt (z.B. window.KalkulationsEngine)
- Aenderung am State-Management (neue State-Variablen in App())
- Neue Seiten im Router (neue case-Eintraege in renderPage)

### Template fuer Skill-Update-Nachricht an Thomas:

```
"Thomas, ich habe eine Architektur-Aenderung vorgenommen:
[Beschreibung der Aenderung]

Der Delivery-Skill wurde entsprechend aktualisiert:
[Was sich im Skill geaendert hat]

Die aktualisierte SKILL.md Datei ist im ZIP enthalten.
Bitte ersetze die Datei unter: [Skill-Pfad]"
```

---

## AKTUELLE APP-STATE-VARIABLEN (tw-app.jsx)

Wichtige State-Variablen die bei Aenderungen beruecksichtigt werden muessen:

```
page                    — Aktuelle Seite im Router
selectedKunde           — Ausgewaehlter Kunde (Objekt mit allen Daten)
importResult            — Geparste Kundendaten (Positionen, Raeume, Stammdaten)
kundeMode               — Modus: 'gespeichert' | 'gespeichertKomplett' | 'manuell' | 'ki' | 'analysiert'
isDriveMode             — Google Drive verbunden?
driveKunden             — Liste der Kundenordner aus Drive
loading / loadProgress  — Ladefortschritt
startConnections        — Drive/Gemini Verbindungsstatus
ordnerAnalyseMeta       — KI-Analyse Metadaten
LV_POSITIONEN           — Globales Objekt fuer LV-Positionen (Key = kundeId)
```

### Router-Seiten (renderPage switch):
```
start → kundenModus → auswahl → akte → analyseConfig → datenUebersicht → modulwahl
                    → manuellEingabe
geladen → raumerkennung → raumblatt
rechnung | ausgangsbuch | schriftverkehr | baustelle
ordnerAnalyse → ordnerAnalyseDetail
ordnerBrowser
```

---

## EXTERNE ABHAENGIGKEITEN (in index-template.html)

- React 18 + ReactDOM (CDN)
- Babel Standalone (CDN) — Client-Side JSX-Transpilation
- SheetJS/XLSX (CDN) — Excel-Parsing
- jsPDF + jsPDF-AutoTable (CDN) — PDF-Erzeugung
- Google APIs (gapi, GSI) — Drive + Auth
- tw-design.css (lokal)
- tw-core.js (lokal)
- tw-storage.js (lokal)

---

## QUICK-REFERENCE: Minimaler Auslieferungs-Befehl

```bash
# Aenderungen in tw-app.jsx gemacht? Dann:
cd /home/claude
cp /mnt/project/index-template.html index.html
# div#root ist bereits im Template — nur noch Babel-Block anhaengen!
printf '\n    <script type="text/babel">\n' >> index.html
for f in tw-shared-components tw-aufmass tw-modulwahl tw-rechnung tw-schriftverkehr tw-ausgangsbuch tw-baustelle tw-daten-uebersicht tw-app; do
    printf '\n' >> index.html
    if [ -f /home/claude/${f}.jsx ]; then
        cat /home/claude/${f}.jsx >> index.html
    else
        cat /mnt/project/${f}.jsx >> index.html
    fi
done
printf '\n' >> index.html
echo "        const root = ReactDOM.createRoot(document.getElementById('root'));" >> index.html
echo '        root.render(<ErrorBoundary><App /></ErrorBoundary>);' >> index.html
printf '    </script>\n</body>\n</html>\n' >> index.html

# Verifizierung
grep -c "function App()" index.html
grep -c "function DatenUebersicht" index.html
grep -c "root.render" index.html

# ZIP
zip -j /mnt/user-data/outputs/tw-update.zip index.html tw-app.jsx build.bat
```
