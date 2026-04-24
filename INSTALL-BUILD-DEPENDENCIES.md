# Einmalige Installation der Build-Abhaengigkeiten

**Fuer den neuen build.bat V2 brauchst du Babel-CLI einmalig installiert.**

## Voraussetzungen

- **Node.js** installiert auf deinem PC: https://nodejs.org/de (LTS-Version)
  Test: `node --version` im Terminal — sollte eine Versionsnummer zeigen.

## Installation (einmalig)

1. Kommandozeile im Projekt-Root oeffnen
   (Rechtsklick im Explorer → "In Terminal oeffnen" — im Ordner wo die
   tw-*.jsx Dateien und build.bat liegen)

2. Diesen Befehl eingeben und Enter:
   ```
   npm install --save-dev @babel/cli @babel/core @babel/preset-react
   ```

3. Warten (dauert ca. 30 Sekunden). Am Ende sollte ein Ordner `node_modules/`
   entstanden sein und eine `package-lock.json`-Datei.

4. **Fertig.** Ab jetzt funktioniert `build.bat` V2 ohne weitere Einrichtung.

## Konflikt mit cloud-functions

Wenn in deinem Root bereits eine `package.json` von Cloud Functions liegt
(Firebase), musst du Babel zu DIESER package.json hinzufuegen. Einfach
den `devDependencies`-Block um diese drei Zeilen erweitern:

```json
"devDependencies": {
    "firebase-functions-test": "^3.3.0",
    "@babel/cli": "^7.23.0",
    "@babel/core": "^7.23.0",
    "@babel/preset-react": "^7.23.0"
}
```

Dann `npm install` ausfuehren. Alternativ das `package-build.json` aus
dieser ZIP nutzen:
```
copy package-build.json package.json
npm install
```
(Dann aber die cloud-functions-package.json extra sichern!)

## Test

Nach der Installation sollte `node_modules\.bin\babel.cmd` existieren.
Test:
```
node_modules\.bin\babel.cmd --version
```
Sollte eine Versionsnummer ausgeben.

**Wenn das klappt, ist alles bereit.** Ab sofort jedes Mal wenn du
Aenderungen deployed willst, einfach `build.bat` doppelklicken — der
Rest passiert automatisch inkl. Vorkompilierung.
