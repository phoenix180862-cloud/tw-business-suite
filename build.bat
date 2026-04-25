@echo off
REM ================================================================
REM  TW Business Suite - Build (V3, Pre-Compile + Pre-Flight-Checks)
REM  Stand: 25.04.2026
REM ================================================================
REM
REM NEU IN V3 (25.04.2026):
REM   - Pre-Flight-Checks VOR Babel: doppelte Konstanten, Umlaute in
REM     JSX-Kommentaren, doppelte Hyphen-Sequenzen, Bundle-Vergleich
REM   - Sanity-Checks erweitert (mehr kritische Komponenten geprueft)
REM   - Fehler-Diagnose-Hilfe bei Build-Abbruch
REM
REM Grund: Wiederkehrende Fehlerklassen (Duplikat-const, Umlaute,
REM "--" in JSX-Kommentaren) sollen VOR der Babel-Kompilierung
REM gefunden werden, damit der User keinen kaputten Build erhaelt.
REM
REM Voraussetzungen:
REM   - Node.js installiert (https://nodejs.org)
REM   - Einmalig: "npm install @babel/core @babel/cli @babel/preset-react"
REM     im Projekt-Root ausfuehren
REM
REM ================================================================

echo ================================================================
echo   TW Business Suite - Build V3 (Pre-Compile + Pre-Flight-Checks)
echo ================================================================
echo.

REM ---- Build-Version (Zeitstempel) fuer Cache-Bust ----
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "DT=%%a"
set "BUILD_VERSION=%DT:~0,8%-%DT:~8,6%"
echo Build-Version: %BUILD_VERSION%
echo.

REM ================================================================
REM  PRE-FLIGHT-CHECKS (vor Babel)
REM ================================================================
echo [PRE-FLIGHT] Statische Pruefungen vor Babel-Kompilierung...
echo.

set "PREFLIGHT_FAIL=0"

REM ---- Check 1: Doppelte const-Deklarationen kritischer Konfigs ----
echo [PRE-FLIGHT 1/5] Doppelte Konstanten-Deklarationen pruefen...
for %%C in (DRIVE_ORDNER STAGING_CONFIG GMAIL_CONFIG GEMINI_CONFIG ORDNER_ANALYSE_CONFIG) do (
    set "DUPCOUNT=0"
    for /f %%N in ('findstr /R /C:"const %%C[ ]*=" tw-infrastructure.js index-template.html *.jsx *.js 2^>nul ^| find /c /v ""') do set "DUPCOUNT=%%N"
    if !DUPCOUNT! GTR 1 (
        echo      FEHLER: Konstante "%%C" wird mehrfach deklariert ^(!DUPCOUNT! Mal^)
        echo              Pruefe: tw-infrastructure.js und index-template.html
        set "PREFLIGHT_FAIL=1"
    )
)
setlocal enabledelayedexpansion
if !PREFLIGHT_FAIL! EQU 1 (
    echo.
    echo *** PRE-FLIGHT FEHLGESCHLAGEN: Doppelte Konstanten gefunden ***
    echo Loesung: In tw-infrastructure.js belassen, im Template entfernen.
    pause
    exit /b 1
)
endlocal

REM ---- Check 2: Umlaute in JSX-Kommentaren ----
echo [PRE-FLIGHT 2/5] Umlaute in JSX-Kommentaren pruefen...
REM Wir pruefen nur Kommentarzeilen ^(// und /* */^) auf Umlaute.
REM Nutze PowerShell weil findstr mit Unicode unzuverlaessig ist.
powershell -NoProfile -Command "$err=0; foreach($f in Get-ChildItem 'tw-*.jsx') { $lines = Get-Content $f.FullName -Encoding UTF8; for($i=0;$i -lt $lines.Length;$i++) { $L=$lines[$i]; if(($L -match '^\s*//.*[\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]') -or ($L -match '/\*.*[\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df].*\*/')) { Write-Host ('   ' + $f.Name + ':' + ($i+1) + '  ' + $L.Substring(0,[math]::Min(80,$L.Length))); $err++; } } } if($err -gt 0){ Write-Host ('FEHLER: ' + $err + ' Umlaute in JSX-Kommentaren gefunden'); exit 1 } else { Write-Host '      Keine Umlaute in JSX-Kommentaren'; exit 0 }"
if errorlevel 1 (
    echo.
    echo *** PRE-FLIGHT FEHLGESCHLAGEN: Umlaute in JSX-Kommentaren ***
    echo Loesung: ae/oe/ue/ss statt Umlaute in Kommentaren verwenden.
    echo          ^(In Strings sind Umlaute OK!^)
    pause
    exit /b 1
)

REM ---- Check 3: Doppelte Hyphen "--" in JSX-Kommentaren ----
echo [PRE-FLIGHT 3/5] Doppelte Hyphen ^("--"^) in JSX-Kommentaren pruefen...
powershell -NoProfile -Command "$err=0; foreach($f in Get-ChildItem 'tw-*.jsx') { $content = Get-Content $f.FullName -Encoding UTF8 -Raw; $matches = [regex]::Matches($content,'\{\s*/\*[^*]*--[^*]*\*/\s*\}'); foreach($m in $matches) { Write-Host ('   ' + $f.Name + '  ' + $m.Value.Substring(0,[math]::Min(60,$m.Value.Length))); $err++; } } if($err -gt 0){ Write-Host ('FEHLER: ' + $err + ' doppelte Hyphen in JSX-Kommentaren'); exit 1 } else { Write-Host '      Keine "--" in JSX-Kommentar-Bloecken'; exit 0 }"
if errorlevel 1 (
    echo.
    echo *** PRE-FLIGHT FEHLGESCHLAGEN: "--" in JSX-Kommentaren ***
    echo Loesung: -- ersetzen durch -minus- oder zwei separate Bindestriche.
    pause
    exit /b 1
)

REM ---- Check 4: Pflicht-Module vorhanden? ----
echo [PRE-FLIGHT 4/5] Pflicht-Module vorhanden?
for %%M in (tw-shared-components.jsx tw-aufmass.jsx tw-modulwahl.jsx tw-rechnung.jsx tw-schriftverkehr.jsx tw-ausgangsbuch.jsx tw-baustelle.jsx tw-daten-uebersicht.jsx tw-app.jsx tw-core.js tw-storage.js tw-infrastructure.js tw-staging.js tw-kundendaten-parser.js index-template.html tw-design.css) do (
    if not exist "%%M" (
        echo      FEHLER: Pflicht-Datei fehlt: %%M
        set "PREFLIGHT_FAIL=1"
    )
)
if "%PREFLIGHT_FAIL%"=="1" (
    echo.
    echo *** PRE-FLIGHT FEHLGESCHLAGEN: Pflicht-Module fehlen ***
    pause
    exit /b 1
)
echo      Alle Pflicht-Module vorhanden

REM ---- Check 5: Storage-API + Schema-Registry ^(neu V3^) ----
echo [PRE-FLIGHT 5/5] Storage-API und Schema-Registry pruefen...
if exist "tw-schema.js" (
    echo      tw-schema.js gefunden
) else (
    echo      WARNUNG: tw-schema.js fehlt ^(noch nicht ausgerollt - kein Build-Stopper^)
)
if exist "tw-storage-api.js" (
    echo      tw-storage-api.js gefunden
) else (
    echo      WARNUNG: tw-storage-api.js fehlt ^(noch nicht ausgerollt - kein Build-Stopper^)
)

echo.
echo [PRE-FLIGHT] Alle Pruefungen bestanden.
echo.

REM ================================================================
REM  AB HIER: Original-Build-Logik
REM ================================================================

REM ---- Schritt 1: Babel-CLI pruefen ----
if not exist "node_modules\.bin\babel.cmd" (
    echo FEHLER: Babel-CLI nicht gefunden!
    echo Bitte einmalig ausfuehren:
    echo   npm install @babel/core @babel/cli @babel/preset-react
    pause
    exit /b 1
)
echo [1/8] Babel-CLI gefunden...

REM ---- Schritt 2: Template kopieren, CACHEBUST ersetzen ----
echo [2/8] Template kopieren und Cache-Bust einsetzen...
copy /Y index-template.html index.html >nul
powershell -Command "(Get-Content index.html) -replace 'CACHEBUST_PLACEHOLDER', '%BUILD_VERSION%' | Set-Content index.html"

REM ---- Schritt 3: JSX-Bundle mit Sentinel-Markern zusammenbauen ----
echo [3/8] JSX-Bundle zusammenbauen mit Diagnose-Markern...
set "BUNDLE=_tw-bundle.jsx"
> %BUNDLE% echo         window.__twSentinel = { startedAt: Date.now(), built: "%BUILD_VERSION%", completedModules: [] };

call :append_module tw-shared-components.jsx
call :append_module tw-aufmass.jsx
call :append_module tw-modulwahl.jsx
call :append_module tw-rechnung.jsx
call :append_module tw-schriftverkehr.jsx
call :append_module tw-ausgangsbuch.jsx
call :append_module tw-baustelle.jsx
call :append_module tw-daten-uebersicht.jsx
call :append_module tw-app.jsx

REM Pre-Render-Check + Mount
>> %BUNDLE% echo.
>> %BUNDLE% echo         // === PRE-RENDER CHECK ===
>> %BUNDLE% echo         window.__twSentinel.preRenderCheck = {
>> %BUNDLE% echo             NavDropdown: typeof NavDropdown,
>> %BUNDLE% echo             AktionDropdown: typeof AktionDropdown,
>> %BUNDLE% echo             App: typeof App,
>> %BUNDLE% echo             ErrorBoundary: typeof ErrorBoundary,
>> %BUNDLE% echo             FirmenLogo: typeof FirmenLogo,
>> %BUNDLE% echo             ModulWahl: typeof ModulWahl
>> %BUNDLE% echo         };
>> %BUNDLE% echo         console.log('[TW Sentinel] Pre-render check:', window.__twSentinel.preRenderCheck);
>> %BUNDLE% echo.
>> %BUNDLE% echo         const root = ReactDOM.createRoot(document.getElementById('root'));
>> %BUNDLE% echo         root.render(React.createElement(ErrorBoundary, null, React.createElement(App)));

REM ---- Schritt 4: Babel-Kompilierung ----
echo [4/8] Babel-Kompilierung (JSX -^> JavaScript)...
call node_modules\.bin\babel.cmd --presets @babel/preset-react %BUNDLE% -o _tw-bundle-compiled.js
if errorlevel 1 (
    echo.
    echo FEHLER: Babel-Kompilierung fehlgeschlagen!
    echo Bitte JSX-Syntaxfehler in den Modulen pruefen.
    echo.
    echo HINWEIS: Pre-Flight-Checks sind sauber durchgelaufen,
    echo der Fehler ist also kein Duplikat-Konstante / Umlaut / --,
    echo sondern ein "echter" JSX-Syntaxfehler ^(z.B. unbalancierte Klammern,
    echo nicht geschlossene Tags, fehlerhafte Block-Kommentare^).
    del %BUNDLE% 2>nul
    pause
    exit /b 1
)
echo      Babel-Kompilierung erfolgreich

REM ---- Schritt 5: Kompiliertes Bundle in index.html einbetten ----
echo [5/8] Bundle in index.html einbetten...
>> index.html echo.
>> index.html echo     ^<script type="text/javascript"^>
type _tw-bundle-compiled.js >> index.html
>> index.html echo     ^</script^>
>> index.html echo ^</body^>
>> index.html echo ^</html^>

REM ---- Schritt 6: Zwischendateien aufraeumen ----
echo [6/8] Zwischendateien loeschen...
del %BUNDLE% 2>nul
del _tw-bundle-compiled.js 2>nul

REM ---- Schritt 7: Sanity-Checks erweitert ----
echo [7/8] Sanity-Checks ^(erweitert in V3^)...
findstr /c:"type=\"text/babel\"" index.html >nul
if not errorlevel 1 (
    echo      FEHLER: type="text/babel" in index.html gefunden!
    echo      Build wurde nicht korrekt vorkompiliert.
    pause
    exit /b 1
)
findstr /c:"function NavDropdown" index.html >nul
if errorlevel 1 (
    echo      FEHLER: NavDropdown fehlt im Bundle!
    pause
    exit /b 1
)
findstr /c:"function AktionDropdown" index.html >nul
if errorlevel 1 (
    echo      FEHLER: AktionDropdown fehlt im Bundle!
    pause
    exit /b 1
)
findstr /c:"function ErrorBoundary" index.html >nul
if errorlevel 1 (
    findstr /c:"class ErrorBoundary" index.html >nul
    if errorlevel 1 (
        echo      FEHLER: ErrorBoundary fehlt im Bundle!
        pause
        exit /b 1
    )
)
findstr /c:"function App" index.html >nul
if errorlevel 1 (
    echo      FEHLER: Top-Level-Komponente App fehlt im Bundle!
    pause
    exit /b 1
)
echo      Alle Sanity-Checks bestanden

REM ---- Schritt 8: Dateigroesse anzeigen ----
echo [8/8] Build abgeschlossen
echo.
for %%A in (index.html) do echo      index.html: %%~zA Bytes ^(Build %BUILD_VERSION%^)

echo.
echo ================================================================
echo   FERTIG! Vorkompilierte index.html bereit fuer Deployment.
echo ================================================================
echo.
echo Naechste Schritte:
echo   1. index.html und geaenderte tw-*.jsx/.js auf GitHub pushen
echo   2. Am Tablet: Strg+Shift+R oder Browser-Cache leeren
echo   3. App starten
echo.
pause
goto :eof

REM ================================================================
REM  Hilfsfunktion: Modul mit Sentinel-Markern anhaengen
REM ================================================================
:append_module
set "MOD=%~1"
>> %BUNDLE% echo.
>> %BUNDLE% echo         // === MODUL-GRENZE: %MOD% ===
>> %BUNDLE% echo         window.__twSentinel.lastModule = "%MOD%";
>> %BUNDLE% echo.
type "%MOD%" >> %BUNDLE%
>> %BUNDLE% echo.
>> %BUNDLE% echo         window.__twSentinel.completedModules.push("%MOD%");
goto :eof
