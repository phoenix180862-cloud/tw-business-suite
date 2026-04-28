#!/usr/bin/env python3
"""
TW Business Suite — Pre-Build-Validator

Prüft VOR dem Build, ob alle in JSX-Dateien VERWENDETEN React-Komponenten
auch DEFINIERT sind — entweder in einer der zu kompilierenden JSX-Dateien
oder in einer der externen JS-Dateien, die per <script>-Tag in index-template.html
geladen werden.

Verhindert die Klasse von Fehlern, bei denen eine Quelldatei eine Komponente
verloren hat, die alte index.html sie aber noch enthält und trotzdem das System
"funktioniert" wirkt — bis ein neuer Build die alte index.html ersetzt.

Wenn fehlende Komponenten gefunden -> EXIT-Code 1 -> Build stoppt.
"""

import re
import sys
from pathlib import Path

# JSX-Module, die ueber Babel kompiliert werden (genau wie build.sh)
MODULE_FILES_JSX = [
    'tw-shared-components.jsx',
    'tw-aufmass.jsx',
    'tw-modulwahl.jsx',
    'tw-rechnung.jsx',
    'tw-schriftverkehr.jsx',
    'tw-ausgangsbuch.jsx',
    'tw-baustelle.jsx',
    'tw-daten-uebersicht.jsx',
    'tw-app.jsx',
]

# Externe JS-Dateien, die per <script>-Tag in index-template.html
# geladen werden — sie liefern Definitionen zur Laufzeit, ohne dass
# wir sie kompilieren muessen. Komponenten/Helper aus diesen Dateien
# duerfen aus den JSX-Modulen referenziert werden.
EXTERNAL_JS_FILES = [
    'tw-core.js',
    'tw-storage.js',
    'tw-schema.js',
    'tw-storage-api.js',
    'tw-kundendaten-parser.js',
    'tw-infrastructure.js',
    'tw-staging.js',
    'tw-nav-dropdowns.js',
    'tw-storage-components.js',
]

# Globale Komponenten/Helper, die NICHT in unseren Dateien definiert
# sein muessen, weil sie aus React, Browser-Globals oder externen
# CDN-Skripten stammen.
KNOWN_GLOBALS = {
    # React selbst
    'React', 'ReactDOM', 'Fragment',
    # Browser/Web
    'window', 'document', 'console', 'navigator', 'location',
    'Math', 'Object', 'Array', 'String', 'Number', 'Boolean',
    'Date', 'JSON', 'Promise', 'Map', 'Set', 'Symbol',
    'Error', 'TypeError', 'RangeError', 'AbortController',
    'FileReader', 'FormData', 'URL', 'URLSearchParams',
    'Image', 'Audio', 'Blob', 'File',
    # Externe Libs aus CDN-Script-Tags
    'gapi', 'firebase', 'jspdf', 'jsPDF', 'XLSX', 'pdfjsLib', 'PDFJS',
    'QRCode',
    # Service-Globals (aus externen JS, aber als Sicherheitsnetz auch hier)
    'TWStorage', 'TWStaging', 'GoogleDriveService', 'FirebaseService',
    'OrdnerAnalyseEngine', 'OrdnerAnalyseDB',
    # JSX-Pragmas
    '_jsx', '_jsxs', '_extends',
    # Service-Globals
    'TW',
}

def find_jsx_components_used(content):
    """Findet alle <Komponente ...> Verwendungen (JSX-Tags mit Grossbuchstabe-Anfang)."""
    pattern = re.compile(r'<([A-Z][A-Za-z0-9_]*)\b')
    return set(pattern.findall(content))

def find_createElement_used(content):
    """Findet React.createElement(Komponente, ...) Aufrufe."""
    pattern = re.compile(r'(?:React\.createElement|_jsx[s]?)\s*\(\s*([A-Z][A-Za-z0-9_]*)\b')
    return set(pattern.findall(content))

def find_definitions(content):
    """Findet alle Top-Level-Komponenten/Helper-Definitionen."""
    found = set()
    # function Foo(...)
    for m in re.finditer(r'(?<!\.)function\s+([A-Z][A-Za-z0-9_]*)\s*\(', content):
        found.add(m.group(1))
    # const Foo = (... oder = function...
    for m in re.finditer(r'(?:const|var|let)\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\(|function|React\.|class)', content):
        found.add(m.group(1))
    # class Foo extends ...
    for m in re.finditer(r'class\s+([A-Z][A-Za-z0-9_]*)', content):
        found.add(m.group(1))
    # window.Foo = ... (externe JS-Module exponieren so)
    for m in re.finditer(r'window\.([A-Z][A-Za-z0-9_]*)\s*=', content):
        found.add(m.group(1))
    return found

def main(workdir, project_dir='/mnt/project'):
    workdir = Path(workdir)
    project_dir = Path(project_dir)

    # 1. Alle JSX-Dateien einlesen (die werden kompiliert + auch Quelle fuer Definitionen)
    jsx_content = ''
    file_contents = {}
    for fname in MODULE_FILES_JSX:
        p = workdir / fname
        if not p.exists():
            print(f"  [WARN] {fname} fehlt im Workdir", file=sys.stderr)
            continue
        c = p.read_text(encoding='utf-8')
        file_contents[fname] = c
        jsx_content += '\n' + c

    # 2. Externe JS-Dateien einlesen (NUR fuer Definitionen — sie werden zur Laufzeit
    #    per <script>-Tag geladen, also nicht in den Babel-Build, aber sie liefern
    #    Komponenten-Definitionen, die JSX-Module nutzen duerfen).
    external_defs = set()
    for fname in EXTERNAL_JS_FILES:
        p = project_dir / fname
        if not p.exists():
            p = workdir / fname  # Fallback Workdir
        if not p.exists():
            continue
        c = p.read_text(encoding='utf-8')
        external_defs |= find_definitions(c)

    # 3. Alle Definitionen kombinieren
    jsx_defs = find_definitions(jsx_content)
    all_defined = jsx_defs | external_defs | KNOWN_GLOBALS

    # 4. Pro JSX-Datei: was wird verwendet, was davon ist NICHT definiert?
    fehlende_pro_datei = {}
    for fname, content in file_contents.items():
        verwendet = find_jsx_components_used(content) | find_createElement_used(content)
        fehlend = verwendet - all_defined
        if fehlend:
            fehlende_pro_datei[fname] = sorted(fehlend)

    print("=" * 60)
    print("TW Business Suite — Pre-Build-Validator")
    print("=" * 60)
    print(f"  JSX-Module: {len(file_contents)}")
    print(f"  Externe JS-Dateien als Quelle: {len(EXTERNAL_JS_FILES)}")
    print(f"  Definitionen JSX:    {len(jsx_defs)}")
    print(f"  Definitionen extern: {len(external_defs)}")
    print(f"  Globals:             {len(KNOWN_GLOBALS)}")
    print(f"  Definitionen total:  {len(all_defined)}")
    print()

    if not fehlende_pro_datei:
        print("  STATUS: ALLE Komponenten-Referenzen aufloesbar")
        print("  Build darf weiterlaufen.")
        return 0

    print("  STATUS: ##### FEHLENDE DEFINITIONEN GEFUNDEN #####")
    print()
    for fname, fehlend in fehlende_pro_datei.items():
        print(f"  In {fname}:")
        for k in fehlend:
            print(f"    - {k}")
    print()
    print("  >> Build wird ABGEBROCHEN, um Crash beim Mount zu verhindern.")
    print("  >> Diese Komponenten muessen entweder")
    print("     (a) in einer JSX-Quelldatei (wird kompiliert)")
    print("     (b) in einer externen JS-Datei (wird per <script> geladen)")
    print("     definiert sein, BEVOR ein neuer Build erzeugt wird.")
    return 1

if __name__ == '__main__':
    workdir = sys.argv[1] if len(sys.argv) > 1 else '.'
    project_dir = sys.argv[2] if len(sys.argv) > 2 else '/mnt/project'
    sys.exit(main(workdir, project_dir))
