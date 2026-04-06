@echo off
chcp 65001 >nul
echo ================================================
echo   TW Business Suite - Build (Module zusammenfuegen)
echo ================================================
echo.

REM Erstelle die kombinierte index.html aus den einzelnen Modulen
REM Die Quelldateien bleiben unveraendert!

echo Erstelle index.html aus Modulen...

REM Kopiere den Template-Head (Head, Libraries, Infrastructure, CSS-Link, div#root)
copy /Y index-template.html index.html >nul

REM Fuege den Babel-Script-Anfang hinzu
echo. >> index.html
echo     ^<script type="text/babel"^> >> index.html

REM Fuege alle Module zusammen (OHNE modules/-Unterordner!)
echo. >> index.html
echo // === MODUL: tw-shared-components.jsx === >> index.html
type tw-shared-components.jsx >> index.html

echo. >> index.html
echo // === MODUL: tw-aufmass.jsx === >> index.html
type tw-aufmass.jsx >> index.html

echo. >> index.html
echo // === MODUL: tw-modulwahl.jsx === >> index.html
type tw-modulwahl.jsx >> index.html

echo. >> index.html
echo // === MODUL: tw-rechnung.jsx === >> index.html
type tw-rechnung.jsx >> index.html

echo. >> index.html
echo // === MODUL: tw-schriftverkehr.jsx === >> index.html
type tw-schriftverkehr.jsx >> index.html

echo. >> index.html
echo // === MODUL: tw-ausgangsbuch.jsx === >> index.html
type tw-ausgangsbuch.jsx >> index.html

echo. >> index.html
echo // === MODUL: tw-baustelle.jsx === >> index.html
type tw-baustelle.jsx >> index.html

echo. >> index.html
echo // === MODUL: tw-app.jsx === >> index.html
type tw-app.jsx >> index.html

REM Mount-Code und Schluss-Tags
echo. >> index.html
echo // === MOUNT === >> index.html
echo         const root = ReactDOM.createRoot(document.getElementById('root'^)^); >> index.html
echo         root.render(^<ErrorBoundary^>^<App /^>^</ErrorBoundary^>^); >> index.html
echo     ^</script^> >> index.html
echo ^</body^> >> index.html
echo ^</html^> >> index.html

echo.
echo ================================================
echo   FERTIG! index.html wurde neu erstellt.
echo   Oeffne jetzt http://localhost:8080 im Browser.
echo   (Falls noetig: start-server.bat starten)
echo ================================================
pause
