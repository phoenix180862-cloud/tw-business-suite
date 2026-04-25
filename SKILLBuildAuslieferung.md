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
  weil die index.html fehlt und die App nicht startet. NIEMALS nur einzelne JSX/CSS-Dateien
  ohne index.html ausliefern!
---

# TW Business Suite — Build & Auslieferung

## KRITISCHE REGEL

**Die TW Business Suite laeuft NICHT mit einzelnen JSX-Dateien!**

Der User startet die App ueber `start-server.bat` → Python SimpleHTTPServer → `index.html`.
Die `index.html` enthaelt ALLE Module zusammengefuegt in einem einzigen `<script type="text/babel">` Block.
Ohne eine neu gebaute `index.html` sind Code-Aenderungen an JSX/CSS-Dateien WIRKUNGSLOS.

**JEDE Auslieferung MUSS eine frisch gebaute `index.html` enthalten.**

---

## Build-Prozess (Linux-Aequivalent zu build.bat)

### Schritt 1: Alle Quelldateien bereitstellen

Geaenderte Dateien liegen in `/home/claude/`.
Unveraenderte Dateien werden aus `/mnt/project/` gelesen.

### Schritt 2: index.html zusammenbauen

```bash
cd /home/claude

# 1. Template als Basis kopieren
cp /mnt/project/index-template.html index.html

# 2. Root-DIV und Babel-Script-Start anfuegen
echo "" >> index.html
echo '    <div id="root"></div>' >> index.html
echo "" >> index.html
echo '    <script type="text/babel">' >> index.html

# 3. Alle Module in EXAKTER Reihenfolge einfuegen
#    WICHTIG: Geaenderte Dateien aus /home/claude/ nehmen,
#    unveraenderte aus /mnt/project/
echo "" >> index.html

# Fuer JEDES Modul: Pruefen ob lokale Version existiert, sonst Projekt-Version
for module in tw-shared-components.jsx \
              tw-aufmass.jsx \
              tw-modulwahl.jsx \
              tw-rechnung.jsx \
              tw-schriftverkehr.jsx \
              tw-ausgangsbuch.jsx \
              tw-baustelle.jsx \
              tw-daten-uebersicht.jsx \
              tw-app.jsx; do
    if [ -f "/home/claude/$module" ]; then
        cat "/home/claude/$module" >> index.html
    else
        cat "/mnt/project/$module" >> index.html
    fi
    echo "" >> index.html
done

# 4. Mount-Code und Schluss-Tags
echo '        const root = ReactDOM.createRoot(document.getElementById("root"));' >> index.html
echo '        root.render(<ErrorBoundary><App /></ErrorBoundary>);' >> index.html
echo '    </script>' >> index.html
echo '</body>' >> index.html
echo '</html>' >> index.html
```

### Modul-Reihenfolge (NICHT aendern!)

1. `tw-shared-components.jsx` — ErrorBoundary, MicButton, gemeinsame Komponenten
2. `tw-aufmass.jsx` — Aufmasz-Modul (Raumerkennung, Raumblatt, Gesamtliste)
3. `tw-modulwahl.jsx` — Modulwahl-Seite
4. `tw-rechnung.jsx` — Rechnungsmodul
5. `tw-schriftverkehr.jsx` — Schriftverkehr-Modul
6. `tw-ausgangsbuch.jsx` — Ausgangsbuch-Modul
7. `tw-baustelle.jsx` — Baustellen-Modul
8. `tw-daten-uebersicht.jsx` — Daten-Uebersicht
9. `tw-app.jsx` — Haupt-App (IMMER als letztes!)

### Schritt 3: Babel-Kompilierung pruefen

```bash
cd /home/claude
npm install --save-dev @babel/core @babel/cli @babel/preset-react 2>/dev/null
./node_modules/.bin/babel --presets @babel/preset-react tw-aufmass.jsx -o /tmp/babel-test.js 2>&1
```

Erfolgreich = nur Warnungen (z.B. "deoptimised styling" bei grossen Dateien).
Fehlgeschlagen = `SyntaxError` → JSX-Fehler finden und fixen!

### Schritt 4: ZIP erstellen und ausliefern

```bash
# ZIP mit ALLEN relevanten Dateien erstellen
zip -j /mnt/user-data/outputs/tw-update.zip \
    /home/claude/index.html \
    /home/claude/tw-aufmass.jsx \
    /home/claude/tw-design.css
# ... weitere geaenderte Dateien hinzufuegen
```

**IMMER enthalten:**
- `index.html` (frisch gebaut!)
- Alle geaenderten `.jsx` Module
- `tw-design.css` (wenn CSS geaendert)

**NIEMALS vergessen:**
- `index.html` — OHNE DIESE DATEI STARTET DIE APP NICHT!

### Schritt 5: Mit present_files ausliefern

```bash
present_files /mnt/user-data/outputs/tw-update.zip
```

---

## Checkliste vor Auslieferung

- [ ] Alle Code-Aenderungen in den lokalen Dateien (/home/claude/) gespeichert
- [ ] Babel-Kompilierung ALLER geaenderten JSX-Dateien erfolgreich
- [ ] Keine deutschen Umlaute (ae oe ue ss) in JSX-KOMMENTAREN (in Strings OK)
- [ ] index.html frisch gebaut mit ALLEN Modulen
- [ ] ZIP enthaelt index.html UND alle geaenderten Dateien
- [ ] present_files aufgerufen damit User die ZIP herunterladen kann

---

## Haeufige Fehler (VERMEIDEN!)

### Fehler 1: ZIP ohne index.html
**Symptom:** App startet nicht, weisser/schwarzer Bildschirm, Endlos-Laden
**Ursache:** Nur JSX/CSS-Dateien im ZIP, keine index.html
**Loesung:** IMMER den Build-Prozess durchfuehren!

### Fehler 2: Falsche Modul-Reihenfolge
**Symptom:** ReferenceError, Komponente nicht gefunden
**Ursache:** tw-app.jsx vor anderen Modulen eingefuegt
**Loesung:** Reihenfolge exakt wie oben einhalten

### Fehler 3: Babel-Fehler nicht geprueft
**Symptom:** App zeigt Fehler-Overlay mit Zeilennummer
**Ursache:** Syntaxfehler im JSX (z.B. nicht geschlossene Tags, fehlende Klammern)
**Loesung:** IMMER Babel-Check vor Auslieferung!

### Fehler 4: Umlaute in Kommentaren
**Symptom:** fetch() Fehler beim Laden der Module, UTF-8 Encoding-Probleme
**Ursache:** Deutsche Umlaute (ae, oe, ue, ss) in JSX-Kommentaren
**Loesung:** In Kommentaren ae/oe/ue/ss statt Umlaute verwenden

### Fehler 5: Alte index-template.html vergessen
**Symptom:** Fehlende Styles, Icons, Scripts
**Ursache:** index.html manuell erstellt statt aus Template
**Loesung:** IMMER `/mnt/project/index-template.html` als Basis verwenden!

---

## Datei-Pfad-Disziplin

- Alle Projektdateien liegen FLACH im Root-Verzeichnis — KEIN `modules/` Unterordner!
- Arbeitskopien: `/home/claude/`
- Projekt-Originale (read-only): `/mnt/project/`
- Finale Ausgabe: `/mnt/user-data/outputs/`

---

## KRITISCHE LESSONS LEARNED — Etappe A vom 25.04.2026

### ABSOLUTES VERBOT: Komponenten direkt im Live-Build editieren

Niemals direkt in der kompilierten `index.html` neue Komponenten einfuegen oder bestehende
veraendern. Das hat sich am 25.04.2026 als wiederkehrendes Problem entpuppt:

- `NavDropdown` und `AktionDropdown` waren urspruenglich nur im Live-Build → Hotfix `tw-nav-dropdowns.js`
- `StorageHealthDashboard` wurde am 25.04.2026 wieder nur im Build hinzugefuegt → musste aus
  der minified `index.html` zurueck nach `tw-shared-components.jsx` portiert werden

**Regel:** Jede neue React-Komponente MUSS zuerst in einer der `tw-*.jsx`-Quelldateien definiert
werden. Das Bundle wird DANACH durch `build.bat` neu erzeugt. Wer direkt in der `index.html`
schreibt, schiesst sich beim naechsten Build selbst ins Knie — die Komponente ist weg.

### Pflicht-Komponenten (Build-Sanity-Checks)

Folgende Komponenten MUESSEN in der `index.html` (Bundle) vorhanden sein, sonst schlaegt
der Build fehl:

| Komponente              | Quelle                          | Sanity-Check (build.bat V3.1) |
|-------------------------|---------------------------------|--------------------------------|
| `App`                   | `tw-app.jsx`                    | ✓ vorhanden                    |
| `ErrorBoundary`         | `tw-shared-components.jsx`      | ✓ vorhanden                    |
| `NavDropdown`           | `tw-nav-dropdowns.js` *)        | ✓ V3.1: prueft auch externe JS |
| `AktionDropdown`        | `tw-nav-dropdowns.js` *)        | ✓ V3.1: prueft auch externe JS |
| `StorageHealthDashboard`| `tw-shared-components.jsx`      | ✓ V3.1: NEU                    |
| `MemoryBadge`           | `tw-shared-components.jsx`      | ✓ V3.1: NEU                    |

*) `tw-nav-dropdowns.js` wird als separates Skript VOR dem Bundle geladen, nicht im Bundle einkompiliert.

### Pflicht-Skripte in `index-template.html` (Lade-Reihenfolge)

Vor dem Babel-Bundle (`<script type="text/javascript">`) MUESSEN diese Skripte per `<script src="...">`
geladen werden, sonst startet die App nicht:

```
tw-core.js              -> tw-storage.js          -> tw-schema.js
-> tw-storage-api.js    -> tw-kundendaten-parser.js -> tw-infrastructure.js
-> tw-staging.js        -> tw-nav-dropdowns.js
```

Reihenfolge ist KRITISCH — z.B. braucht `tw-storage-api.js` sowohl `tw-storage.js` als auch
`tw-schema.js` BEREITS geladen, sonst wirft die Initialisierung einen Fehler.

### Pflicht-Skripte aus dem Storage-Architektur-Plan (25.04.2026, alle 7 Punkte)

| Datei                  | Zweck                                                |
|------------------------|------------------------------------------------------|
| `tw-schema.js`         | Schema-Registry fuer alle 19 IDB-Stores              |
| `tw-storage-api.js`    | Zentrale Storage-API (Wrapper), Drive-Upload-Queue, Konflikt-Pruefung |
| `tw-nav-dropdowns.js`  | NavDropdown/AktionDropdown (vorruebergehender Hotfix)|

`tw-storage.js` muss DB_VERSION = 8 oder hoeher haben, mit MIGRATIONS-Tabelle.

