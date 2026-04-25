# LIESMICH — Storage-Architektur-Erweiterung (alle 7 Punkte)

**Stand:** 25.04.2026
**Auslieferung:** Komplette Umsetzung des 7-Punkte-Plans aus dem Speicher-Architektur-Bericht

---

## Was ist neu in dieser ZIP?

### Neue Dateien (4)

1. **`tw-schema.js`** — Schema-Registry fuer alle 19 IndexedDB-Stores
   - Validator (`TWSchema.validate`)
   - Enrich-Helper (`TWSchema.enrich`)
   - Diagnostics (`TWSchema.getDiagnostics`)

2. **`tw-storage-api.js`** — Zentrale Storage-API als Wrapper
   - `TWStorageAPI.saveDocument(...)` — Universelles Dokumenten-Save
   - `TWStorageAPI.savePhoto(...)` — Einheitlicher Foto-Entry-Point
   - `TWStorageAPI.saveCustomerData(...)` — Validiertes Schema-Save
   - `TWStorageAPI.detectConflict(...)` — Konflikt-Erkennung VOR dem Save
   - `TWStorageAPI.queue` — Drive-Upload-Queue mit Retry (1s/4s/16s)

3. **`tw-nav-dropdowns.js`** — Hotfix fuer Sync-Problem im Repository
   - Enthaelt NavDropdown, AktionDropdown, AktionItem, AktionSubItem
   - Diese Komponenten waren bisher nur im Live-Build, NICHT in den Quellen
   - Wurden mit Klammern-Zaehler aus der alten index.html extrahiert
   - Sollten irgendwann sauber als JSX in tw-shared-components.jsx zurueckgefuehrt werden

4. **(LIESMICH) `Speicher-Architektur-Bericht-25.04.2026.md`** — der vollstaendige Bericht mit Ausbauplan (war bereits in der vorherigen Auslieferung dabei)

### Geaenderte Dateien (5)

1. **`tw-storage.js`** — DB-Version 7 -> 8 mit Migrations-Tabelle
   - Neuer `MIGRATIONS`-Hash am Anfang der Datei
   - Onupgradeneeded laeuft jetzt durch alle Migrations ab oldVersion+1
   - Migration v8: Neuer Index `kontext` auf fotos, `syncStatus` auf appDateien

2. **`tw-shared-components.jsx`** — neue Komponente `StorageHealthDashboard`
   - Modal-Dashboard mit IDB-Belegung, Queue-Status, pro-Kunde-Statistiken
   - Hilfs-Komponente `_HealthCard` fuer einheitliche Karten

3. **`tw-app.jsx`** — Render-Hook und globaler Handler
   - Neue useState `showStorageHealth`
   - Globaler Handler `window._openStorageHealth()` (von ueberall aufrufbar)
   - StorageHealthDashboard im Render-Tree gemountet

4. **`index-template.html`** — laedt neue Skripte in korrekter Reihenfolge
   - Vor dem Bundle: tw-schema.js, tw-storage-api.js, tw-nav-dropdowns.js

5. **`build.bat`** — V3 mit Pre-Flight-Checks
   - Check 1: Doppelte const-Deklarationen (DRIVE_ORDNER, STAGING_CONFIG etc.)
   - Check 2: Umlaute in JSX-Kommentaren (per PowerShell)
   - Check 3: Doppelte Hyphen "--" in JSX-Bloeckenkommentaren
   - Check 4: Pflicht-Module vorhanden
   - Check 5: Storage-API + Schema-Registry-Hinweis
   - Erweiterte Sanity-Checks am Ende (auch fuer ErrorBoundary, App)

### Pflicht-Datei (immer enthalten)

- **`index.html`** — frisch gebaut, bereits Babel-vorkompiliert
  - Enthaelt alle Module + Bundle
  - Bereit fuer GitHub-Pages-Deployment

---

## Was kann ich jetzt damit machen?

### 1. Sofort testen (kein zusaetzliches Setup)

ZIP entpacken, alle Dateien ueberschreiben, App starten. Alle bisherigen Funktionen bleiben unveraendert. Neu hinzu kommt:

- **Storage-Health-Dashboard:** Aufruf per Browser-Konsole mit `window._openStorageHealth()` oder vom Code aus mit demselben Aufruf. Zeigt IDB-Belegung, Queue-Status, pro-Kunde-Sync-Status.
- **DB-Migration:** Beim ersten App-Start nach diesem Update wird IDB von v7 auf v8 migriert. Die neuen Indices werden lautlos im Hintergrund angelegt.
- **Storage-API + Schema:** Stehen ab sofort zur Verfuegung. Bestehender Code laeuft weiter unveraendert (kein Breaking Change). Module koennen schrittweise auf die neue API umgestellt werden.

### 2. Bei Etappe 5 / 11 der Baustellen-App nutzen

Wenn wir mit dem Staging-Upload (Etappe 5) und spaeter dem Foto-Upload aus der Mitarbeiter-App (Etappe 11) starten, koennen wir direkt die `TWStorageAPI` nutzen statt eigene Save-Pfade zu bauen. Damit haben wir automatisch:

- Schema-Validierung
- Drive-Upload-Queue mit Retry bei Funkloch
- Konflikt-Erkennung beim Multi-Geraete-Sync
- Audit-Log

### 3. Schrittweise Migration der bestehenden Module

Module koennen ohne Eile umgestellt werden. Zum Beispiel statt:
```
GoogleDriveService.uploadFile(targetFolder, fileName, mimeType, blob);
```
neu:
```
TWStorageAPI.saveDocument(kundeId, ordnerName, fileName, mimeType, blob, { docType: 'rechnung' });
```

Die neue API speichert lokal in IDB UND queuet den Drive-Upload — auch bei Funkloch landet nichts im Nirwana.

---

## Bekannte Punkte / Risiken

### NavDropdown-Hotfix ist eine Notloesung

Die Datei `tw-nav-dropdowns.js` enthaelt bereits kompiliertes JS, das aus dem alten Live-Build extrahiert wurde. Das ist nicht ideal — bei der naechsten groesseren Etappe sollten die Komponenten als echte JSX-Quellen zurueck in `tw-shared-components.jsx` gefuehrt werden. Bis dahin: die Datei nicht editieren, sondern bei Aenderungen direkt im JSX neu bauen.

### Erste IDB-Migration laeuft beim ersten App-Start

Beim ersten Oeffnen der App nach diesem Update ploppt kurz ein Konsole-Log auf:
```
[TW-Storage] Datenbank-Upgrade von v7 auf v8
[TW-Storage Migration v8] Index "kontext" auf fotos angelegt
[TW-Storage Migration v8] Index "syncStatus" auf appDateien angelegt
```
Das ist normal. Die App ist sofort wieder einsatzbereit.

### Drive-Upload-Queue startet automatisch

Sobald `TWStorageAPI` geladen ist, durchsucht die Queue nach 1 Sekunde die IDB nach pending-`appDateien` und versucht sie hochzuladen. Falls Drive nicht verbunden ist, wird die Queue pausiert und meldet `[TWStorageAPI Queue] Drive nicht verbunden - Queue pausiert`. Sobald Drive verbunden ist, kann man manuell `TWStorageAPI.queue.retry()` aufrufen.

---

## Test-Checkliste (am Tablet ausfuehren)

Nach dem Update:

- [ ] App startet ohne Crash (Strg+Shift+R fuer Cache-Bust)
- [ ] Konsole zeigt: `[TW-Schema] Schema-Registry bereit (19 Stores)`
- [ ] Konsole zeigt: `[TW-StorageAPI] Storage-API bereit`
- [ ] Konsole zeigt: `[TW-NavDropdowns] 4 Komponenten registriert`
- [ ] Konsole zeigt: `[TW-Storage] Datenbank-Upgrade von v7 auf v8` (nur beim ersten Start)
- [ ] Bestehender Aufmass-Workflow funktioniert (Raumblatt-Tabs, Foto-Aufnahme, KI-Analyse)
- [ ] Bestehender Rechnungs-Workflow funktioniert
- [ ] Bestehender Schriftverkehr-Workflow funktioniert
- [ ] `window._openStorageHealth()` in der Konsole oeffnet das Dashboard

---

## Naechste Schritte (Vorschlag fuer Etappenplan)

Mit diesem Update sind alle 7 Punkte aus dem Architektur-Plan abgehakt. Die Baustellen-App (Etappen 1-14 aus dem Konzept-PDF) kann jetzt gebaut werden, ohne in dieselben Fallgruben zu fallen wie frueher.

Empfohlene Reihenfolge:

1. **Etappe 1+2 (Konzept-PDF):** Staging-Infrastruktur + Button-Leiste Buero
2. **Etappe 3+4:** Baustellen-Liste, Ordner-Browser, Aus-Original-nachladen
3. **Etappe 5+6:** Staging-Upload (jetzt sauber ueber `TWStorageAPI.saveDocument`) + Freigabe-Button
4. **Etappe 7-9:** Team-Button, Geraete-Whitelist, Sync-Button
5. **Etappe 10-12:** Mitarbeiter-App (Foto-Upload jetzt sauber ueber `TWStorageAPI.savePhoto`)
6. **Etappe 13-14:** Schluesselverschluesselung, PIN, Fein-Schliff

---

*Dieses Update beendet den 7-Punkte-Plan vom 25.04.2026 vollstaendig.*
*Build-Version: 20260425-vfinal*
