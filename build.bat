@echo off
echo ================================================
echo   TW Business Suite - Build (Module zusammenfuegen)
echo ================================================
echo.

REM Erstelle die kombinierte index.html aus den einzelnen Modulen
REM Die Quelldateien bleiben unveraendert!
REM
REM HINWEIS (Update 18.04.2026): index-template.html enthaelt jetzt bereits
REM das ^<div id="root"^>^</div^>. Der Build fuegt NUR noch den Babel-Block an.
REM (Vorher wurde div#root doppelt eingefuegt — Bug gefixt.)

echo Erstelle index.html aus Modulen...

REM Kopiere index-template.html als Basis (enthaelt Head + externe Scripts + div#root)
copy /Y index-template.html index.html >nul

REM Fuege den Babel-Script-Anfang hinzu (KEIN div#root mehr — ist schon im Template!)
echo. >> index.html
echo     ^<script type="text/babel"^> >> index.html

REM Fuege alle Module zusammen (REIHENFOLGE WICHTIG!)
echo. >> index.html
type tw-shared-components.jsx >> index.html
echo. >> index.html
type tw-aufmass.jsx >> index.html
echo. >> index.html
type tw-modulwahl.jsx >> index.html
echo. >> index.html
type tw-rechnung.jsx >> index.html
echo. >> index.html
type tw-schriftverkehr.jsx >> index.html
echo. >> index.html
type tw-ausgangsbuch.jsx >> index.html
echo. >> index.html
type tw-baustelle.jsx >> index.html
echo. >> index.html
type tw-daten-uebersicht.jsx >> index.html
echo. >> index.html
type tw-app.jsx >> index.html

REM Mount-Code und Schluss-Tags
echo. >> index.html
echo         const root = ReactDOM.createRoot(document.getElementById('root'^)^); >> index.html
echo         root.render(^<ErrorBoundary^>^<App /^>^</ErrorBoundary^>^); >> index.html
echo     ^</script^> >> index.html
echo ^</body^> >> index.html
echo ^</html^> >> index.html

echo.
echo ================================================
echo   FERTIG! index.html wurde neu erstellt.
echo   Starte jetzt start-server.bat
echo ================================================
pause
