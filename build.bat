@echo off
REM ================================================================
REM  TW Business Suite - Build (V2, Pre-Compile, 24.04.2026)
REM ================================================================
REM
REM WICHTIG (Update 24.04.2026): Dieser Build kompiliert JSX ZUERST
REM mit Babel-CLI zu reinem JavaScript und bettet das Ergebnis in
REM index.html ein. Der Browser muss nichts mehr live kompilieren.
REM
REM Grund: Babel-in-Browser (alte Methode mit type="text/babel") hat
REM am Tablet den Tab-Speicher gesprengt ("Oh nein!"-Fehler in Chrome).
REM Vorkompilieren spart ~40% RAM und macht den Start schneller.
REM
REM Voraussetzungen:
REM   - Node.js installiert (https://nodejs.org)
REM   - Einmalig: "npm install @babel/core @babel/cli @babel/preset-react"
REM     im Projekt-Root ausfuehren
REM
REM ================================================================

echo ================================================================
echo   TW Business Suite - Build V2 (Pre-Compile)
echo ================================================================
echo.

REM ---- Build-Version (Zeitstempel) fuer Cache-Bust ----
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "DT=%%a"
set "BUILD_VERSION=%DT:~0,8%-%DT:~8,6%"
echo Build-Version: %BUILD_VERSION%
echo.

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
REM PowerShell fuer sed-aehnliches Ersetzen
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

REM ---- Schritt 7: Sanity-Checks ----
echo [7/8] Sanity-Checks...
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
echo      Alle Sanity-Checks bestanden

REM ---- Schritt 8: Dateigroesse anzeigen ----
echo [8/8] Build abgeschlossen
echo.
for %%A in (index.html) do echo      index.html: %%~zA Bytes (Build %BUILD_VERSION%)

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
