---
name: tw-build-auslieferung
description: >
  KRITISCHER Build- und Auslieferungs-Skill fuer die TW Business Suite. Dieser Skill MUSS
  IMMER getriggert werden, wenn Code-Aenderungen an der TW Business Suite ausgeliefert
  werden — also bei JEDER ZIP-Erstellung, JEDEM Datei-Export, JEDER Fertigstellung von
  Aenderungen an JSX-Modulen, CSS, oder sonstigen Projektdateien. Auch triggern wenn der
  User sagt: "mach fertig", "ZIP erstellen", "Dateien liefern", "build", "ausliefern",
  "pack zusammen", "zum Download", "fertig machen", "kannst du das zippen", "Ergebnis
  liefern", oder aehnliches. AUCH triggern wenn ein anderer Skill (z.B. raumblatt-umbau,
  ki-analyse, etc.) am Ende seiner Arbeit Dateien ausliefern will. Dieser Skill hat
  HOECHSTE PRIORITAET bei der Auslieferung — ohne ihn funktioniert NICHTS beim User,
  weil die index.html fehlt oder zu grosz ist. NIEMALS nur einzelne JSX/CSS-Dateien
  ohne index.html ausliefern! NIEMALS eine index.html mit type="text/babel" ausliefern —
  der Babel-Kompilier-Vorgang im Browser sprengt den Tab-Speicher am Tablet.
---

# TW Business Suite — Build & Auslieferung (V2, 24.04.2026)

## KRITISCHE REGELN

**Die TW Business Suite laeuft NICHT mit einzelnen JSX-Dateien!**

Der User deployt ueber GitHub Pages. Die `index.html` enthaelt das komplette
kompilierte JavaScript-Bundle (KEIN Babel-in-Browser mehr!).
Ohne eine neu gebaute `index.html` sind Code-Aenderungen an JSX/CSS wirkungslos.

**JEDE Auslieferung MUSS:**
1. Eine frisch gebaute `index.html` enthalten
2. Das Bundle darin VORKOMPILIERT sein (kein `type="text/babel"` mehr!)
3. Die Sentinel-Diagnose-Bloecke behalten (fuer Crash-Debugging)
4. Cache-Bust-Parameter (Build-Timestamp) injiziert haben

---

## Warum vorkompilieren? (Hintergrund 24.04.2026)

Die alte Methode mit `<script type="text/babel">` und `babel.min.js`
im Browser hat am 24.04.2026 zu einem Tablet-Crash gefuehrt
(Chrome: "Oh nein! Fehler beim Anzeigen dieser Webseite" = Out-of-Memory).

Das Bundle ist ~2,2 MB JSX-Code. Babel-in-Browser versucht, das live zu
kompilieren — das kostet ~200 MB RAM im Tab, was das Tablet nicht
verkraftet. Loesung: **Pre-Compile beim Build**, dann ist es nur noch
JavaScript (~40% weniger Speicherverbrauch).

---

## Build-Prozess (Linux-Aequivalent zu build.bat)

### Schritt 1: Quelldateien bereitstellen

Geaenderte Dateien liegen in `/home/claude/`.
Unveraenderte Dateien werden aus `/mnt/project/` gelesen.

### Schritt 2: Babel-CLI einmalig installieren

```bash
cd /home/claude
# Nur nötig wenn node_modules/.bin/babel nicht existiert
if [ ! -f node_modules/.bin/babel ]; then
    npm install --silent @babel/core @babel/cli @babel/preset-react
fi
```

### Schritt 3: Build-Version erzeugen

```bash
BUILD_VERSION=$(date +%Y%m%d-%H%M%S)
echo "Build: $BUILD_VERSION"
```

Diese Version wird in Script-URLs (`?v=...`) und in den Build-Indikator
injiziert — damit der Browser bei jedem neuen Build garantiert neu laedt.

### Schritt 4: Template mit Cache-Bust vorbereiten

```bash
cp /mnt/project/index-template.html /home/claude/index.html
# WICHTIG: Wenn lokal ein geaendertes Template existiert, das nehmen
if [ -f /home/claude/index-template.html ]; then
    cp /home/claude/index-template.html /home/claude/index.html
fi
# CACHEBUST_PLACEHOLDER durch echten Timestamp ersetzen
sed -i "s/CACHEBUST_PLACEHOLDER/$BUILD_VERSION/g" /home/claude/index.html
```

Das `index-template.html` enthaelt Cache-Control-Meta-Tags und
Platzhalter `?v=CACHEBUST_PLACEHOLDER` in Script-Tags. Die werden
beim Build mit dem Timestamp befuellt.

### Schritt 5: JSX-Bundle zusammenbauen (mit Sentinel-Markern)

```bash
BUNDLE=/tmp/tw-bundle.jsx

# Sentinel-Start: Diagnose-Objekt im Browser-Window
echo '        window.__twSentinel = { startedAt: Date.now(), built: "'$BUILD_VERSION'", completedModules: [] };' > $BUNDLE

# Fuer JEDES Modul: Sentinel-Marker davor, Code danach, Sentinel-Push danach
for module in tw-shared-components.jsx \
              tw-aufmass.jsx \
              tw-modulwahl.jsx \
              tw-rechnung.jsx \
              tw-schriftverkehr.jsx \
              tw-ausgangsbuch.jsx \
              tw-baustelle.jsx \
              tw-daten-uebersicht.jsx \
              tw-app.jsx; do
    echo "" >> $BUNDLE
    echo "        // === MODUL-GRENZE: $module ===" >> $BUNDLE
    echo '        window.__twSentinel.lastModule = "'$module'";' >> $BUNDLE
    echo "" >> $BUNDLE

    # Lokale Version bevorzugen, sonst Projekt-Version
    if [ -f "/home/claude/$module" ]; then
        cat "/home/claude/$module" >> $BUNDLE
    else
        cat "/mnt/project/$module" >> $BUNDLE
    fi

    echo "" >> $BUNDLE
    echo '        window.__twSentinel.completedModules.push("'$module'");' >> $BUNDLE
done

# Pre-Render-Check (zeigt an, welche Hauptkomponenten bekannt sind)
cat >> $BUNDLE << 'PREEOF'

        // === PRE-RENDER CHECK ===
        window.__twSentinel.preRenderCheck = {
            NavDropdown: typeof NavDropdown,
            AktionDropdown: typeof AktionDropdown,
            App: typeof App,
            ErrorBoundary: typeof ErrorBoundary,
            FirmenLogo: typeof FirmenLogo,
            ModulWahl: typeof ModulWahl
        };
        console.log('[TW Sentinel] Pre-render check:', window.__twSentinel.preRenderCheck);

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(ErrorBoundary, null, React.createElement(App)));
PREEOF
```

### Schritt 6: Babel-Kompilierung (PFLICHT!)

```bash
cd /home/claude
./node_modules/.bin/babel --presets @babel/preset-react /tmp/tw-bundle.jsx -o /tmp/tw-bundle-compiled.js 2>&1 | tail -2
if [ $? -ne 0 ]; then
    echo "❌ BABEL-FEHLER — NICHT AUSLIEFERN!"
    exit 1
fi
echo "✓ Babel-Kompilierung erfolgreich"
```

### Schritt 7: Kompiliertes Bundle in index.html einbetten

```bash
# WICHTIG: type="text/javascript" — NICHT mehr "text/babel"!
echo "" >> /home/claude/index.html
echo '    <script type="text/javascript">' >> /home/claude/index.html
cat /tmp/tw-bundle-compiled.js >> /home/claude/index.html
echo '    </script>' >> /home/claude/index.html
echo '</body>' >> /home/claude/index.html
echo '</html>' >> /home/claude/index.html
```

### Schritt 8: Sanity-Checks (PFLICHT!)

```bash
cd /home/claude
echo "=== Sanity Checks ==="
echo "div#root:                 $(grep -c 'id=\"root\"' index.html)   (muss 1 sein)"
echo "createRoot:               $(grep -c 'createRoot' index.html)   (muss 1 sein)"
echo "babel-standalone geladen: $(grep -cE 'src=.*babel' index.html)   (muss 0 sein!)"
echo "type=\"text/babel\":        $(grep -c 'type=\"text/babel\"' index.html)   (muss 0 sein!)"
echo "type=\"text/javascript\":   $(grep -c 'type=\"text/javascript\"' index.html)   (muss >= 1 sein)"
echo "NavDropdown def:          $(grep -c 'function NavDropdown' index.html)   (muss 1 sein)"
echo "AktionDropdown def:       $(grep -c 'function AktionDropdown' index.html)   (muss 1 sein)"
echo "Build-Version:            $(grep -c $BUILD_VERSION index.html)   (muss mehrfach sein)"
```

**Wenn einer dieser Checks FEHLSCHLAEGT, NICHT ausliefern!**

### Schritt 9: Cross-Module Funktionsnamen-Konflikt-Scan (PFLICHT!)

```bash
cd /home/claude
python3 << 'PYEOF'
import os, re
defined_in = {}
for f in os.listdir("."):
    if not (f.endswith(".jsx") and f.startswith("tw-")): continue
    with open(f, encoding="utf-8") as fh: c = fh.read()
    for m in re.finditer(r'^\s+(?:function|const)\s+([A-Z][A-Za-z0-9_]+)', c, re.MULTILINE):
        name = m.group(1)
        defined_in.setdefault(name, []).append(f)
conflicts = {n: fs for n, fs in defined_in.items() if len(fs) > 1}
if conflicts:
    print("❌ KOMPONENTEN-NAMENSKONFLIKTE — NICHT AUSLIEFERN!")
    for n, fs in conflicts.items():
        print(f"   {n}: {fs}")
else:
    print("✓ Keine Komponenten-Konflikte")
PYEOF
```

### Schritt 10: ZIP erstellen und ausliefern

```bash
mkdir -p /home/claude/auslieferung
cp /home/claude/index.html /home/claude/auslieferung/
# Alle geaenderten Dateien zusaetzlich mitliefern
for f in tw-*.jsx tw-*.js tw-design.css; do
    if [ -f "/home/claude/$f" ]; then
        cp "/home/claude/$f" /home/claude/auslieferung/
    fi
done

cd /home/claude/auslieferung
zip -q /mnt/user-data/outputs/tw-update-$BUILD_VERSION.zip *
ls -la /mnt/user-data/outputs/tw-update-$BUILD_VERSION.zip
```

### Schritt 11: Mit present_files ausliefern

```bash
present_files /mnt/user-data/outputs/tw-update-$BUILD_VERSION.zip
```

---

## Modul-Reihenfolge (NICHT aendern!)

1. `tw-shared-components.jsx` — ErrorBoundary, MicButton, NavDropdown, AktionDropdown, gemeinsame Komponenten
2. `tw-aufmass.jsx` — Aufmasz-Modul (Raumerkennung, Raumblatt, Gesamtliste)
3. `tw-modulwahl.jsx` — Modulwahl-Seite
4. `tw-rechnung.jsx` — Rechnungsmodul
5. `tw-schriftverkehr.jsx` — Schriftverkehr-Modul
6. `tw-ausgangsbuch.jsx` — Ausgangsbuch-Modul
7. `tw-baustelle.jsx` — Baustellen-Modul
8. `tw-daten-uebersicht.jsx` — Daten-Uebersicht
9. `tw-app.jsx` — Haupt-App (IMMER als letztes!)

---

## Checkliste vor Auslieferung

- [ ] Alle Code-Aenderungen in den lokalen Dateien (/home/claude/) gespeichert
- [ ] Babel-CLI installiert (`node_modules/.bin/babel` existiert)
- [ ] Build-Version (Timestamp) erzeugt
- [ ] Cache-Bust in index-template.html ersetzt (`CACHEBUST_PLACEHOLDER` → Timestamp)
- [ ] JSX-Bundle mit Sentinel-Markern zusammengebaut
- [ ] Babel-Kompilierung PASS (Exit-Code 0)
- [ ] Sanity-Checks alle gruen (`div#root`=1, `type="text/babel"`=0, `babel-standalone`=0, `NavDropdown`=1)
- [ ] Keine Komponenten-Namenskonflikte zwischen Modulen
- [ ] Keine deutschen Umlaute (ae oe ue ss) in JSX-KOMMENTAREN (in Strings OK)
- [ ] index.html enthaelt vorkompiliertes JavaScript, NICHT JSX
- [ ] ZIP enthaelt index.html UND alle geaenderten Dateien
- [ ] present_files aufgerufen

---

## Haeufige Fehler (VERMEIDEN!)

### Fehler 1: Babel nicht vorkompiliert
**Symptom:** Am Tablet: "Oh nein! Fehler beim Anzeigen dieser Webseite"
(Chrome Out-of-Memory). Am PC: sehr langsamer App-Start.
**Ursache:** `<script type="text/babel">` + `babel.min.js` im Browser.
**Loesung:** IMMER Babel-CLI beim Build aufrufen (Schritt 6), dann als
`type="text/javascript"` einbinden (Schritt 7).

### Fehler 2: ZIP ohne index.html
**Symptom:** App startet nicht
**Ursache:** Nur JSX/CSS-Dateien im ZIP, keine index.html
**Loesung:** IMMER den Build-Prozess durchfuehren!

### Fehler 3: NavDropdown/AktionDropdown/andere Komponenten fehlen
**Symptom:** `ReferenceError: NavDropdown is not defined`
**Ursache:** Komponente nur in alter index.html, nicht in tw-shared-components.jsx
**Loesung:** Vor jedem Build pruefen, ob NavDropdown UND AktionDropdown in
`tw-shared-components.jsx` definiert sind. Falls nein: aus der alten
index.html extrahieren und in tw-shared-components.jsx uebernehmen.

### Fehler 4: Falsche Modul-Reihenfolge
**Symptom:** ReferenceError, Komponente nicht gefunden
**Ursache:** tw-app.jsx vor anderen Modulen eingefuegt
**Loesung:** Reihenfolge exakt wie oben einhalten

### Fehler 5: Umlaute in JSX-Kommentaren
**Symptom:** fetch() Fehler, UTF-8 Encoding-Probleme
**Ursache:** Deutsche Umlaute (ae, oe, ue, ss) in JSX-Kommentaren
**Loesung:** In Kommentaren ae/oe/ue/ss statt Umlaute verwenden

### Fehler 6: Komponenten-Namenskonflikte zwischen Modulen
**Symptom:** "Identifier has already been declared" beim Babel-Compile
**Ursache:** Zwei Module definieren die gleiche Funktion/Komponente
**Loesung:** Cross-Module Konflikt-Scan (Schritt 9) durchfuehren

### Fehler 7: Nachtraegliche Edits direkt in index.html
**Symptom:** Komponenten verschwinden beim naechsten Build
**Ursache:** Komponenten direkt in index.html editiert statt in tw-*.jsx
**Loesung:** Aenderungen IMMER im passenden tw-*.jsx-Modul machen,
nicht in der generierten index.html.

---

## Datei-Pfad-Disziplin

- Alle Projektdateien liegen FLACH im Root-Verzeichnis — KEIN `modules/` Unterordner!
- Arbeitskopien: `/home/claude/`
- Projekt-Originale (read-only): `/mnt/project/`
- Finale Ausgabe: `/mnt/user-data/outputs/`
- Babel-Zwischenstaende: `/tmp/`
