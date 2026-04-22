# LIESMICH · Baustein 2 · 5 Sub-Ordner unter BAUSTELLEN-DATEN + Alias-System

**Datum:** 22.04.2026
**Teil des Master-App-Nachzugs** (Arbeitsanweisung `ARBEITSANWEISUNG-Master-App-Nachzug.md`)
**Voraussetzung:** Baustein 1 (+ Hotfix) muss deployed sein
**Status:** Ausgeliefert, deploybar, Folge-Bausteine 3–11 kommen einzeln

---

## 1. Was dieser Baustein liefert

### 1.1 Neue Ordner-Struktur pro Baustelle (Etappe 4.1 Abschnitt 4.2)

Die Unterordner-Struktur unter `BAUSTELLEN-DATEN` wurde von **4** auf **5** erweitert und umbenannt:

| Alt (bis B1) | Neu (ab B2) | Zweck | Mitarbeiter-Zugriff |
|---|---|---|---|
| Zeichnungen | **Zeichnungen** | Pläne, Grundrisse | nur lesen |
| Baustellen-App | **Anweisungen** | Arbeitsanweisungen, Protokolle, Sicherheits-Docs | nur lesen |
| — (gab es nicht) | **Baustellendaten** | Kundendaten, Bauleiter-Kontakte, Adressen | nur lesen |
| Bilder | **Fotos** | Baustellen-Fotos vor/während/nach Ausführung | **darf hochladen** |
| Stunden | **Stunden** | Stundenzettel als PDF | **darf hochladen** |

Auf der Baustelle-Detailseite (nach Klick auf die grosse Kachel BAUSTELLEN-DATEN aus Baustein 1) siehst du jetzt **5 Sub-Kacheln** statt 4 — jeweils mit eigenem Icon (📐 Zeichnungen, 📋 Anweisungen, 📊 Baustellendaten, 📸 Fotos, ⏱️ Stunden) und passender Farbe.

### 1.2 Alias-System für bestehende Baustellen (kritisch!)

**Das Problem:** Alle deine bisherigen Baustellen haben auf Google Drive noch die **alten Ordnernamen** `Bilder` und `Baustellen-App`. Wenn wir die App jetzt hart auf die neuen Namen umstellen würden, würden sie in der App als „leer" / „Ordner fehlt" angezeigt — obwohl die Daten in Wirklichkeit da sind.

**Die Lösung:** Ein **Alias-System** in `tw-infrastructure.js` (`SUBFOLDER_ALIASES`-Map) und in `tw-staging.js` (Such-Logik). Die App behandelt die alten Ordner so, als lägen sie unter den neuen Namen:

```
SUBFOLDER_ALIASES = {
    'Bilder':         'Fotos',       ← alte Baustellen zeigen "Bilder" als "Fotos"
    'Baustellen-App': 'Anweisungen'  ← und "Baustellen-App" als "Anweisungen"
}
```

**Wie es sich auswirkt:**
- **Bestehende Baustelle öffnen:** Alles sieht aus wie erwartet, nur mit neuen Namen. Die Daten aus `/Bilder/` erscheinen unter `📸 Fotos`, die aus `/Baustellen-App/` unter `📋 Anweisungen`.
- **Unter den betroffenen Kacheln** erscheint ein kleines oranges Warn-Badge `⚠ Drive: "Bilder"` bzw. `⚠ Drive: "Baustellen-App"` — damit du auf einen Blick siehst, welche Baustellen noch migriert werden müssen. Das Badge verschwindet automatisch, sobald Drive den neuen Namen trägt.
- **Nur „Baustellendaten" wird als fehlend markiert** — weil dieser Ordner neu ist und keinen Legacy-Alias hat. Mit Klick auf den `Vervollstaendigen`-Button legt die App nur den fehlenden Baustellendaten-Ordner an, ohne bestehende Legacy-Ordner zu duplizieren.
- **Neue Baustellen** (ab sofort per „Staging anlegen" angelegt) bekommen direkt die neuen 5 Namen — keine Aliases mehr.

### 1.3 Duplikat-Schutz in `createStagingBaustelle`

Ein wichtiger Detail-Fix: Wenn du auf einer bestehenden Baustelle „Vervollstaendigen" drückst, würde die alte Logik einfach `findOrCreateFolder('Fotos', ...)` aufrufen und einen **parallelen** leeren Ordner „Fotos" neben „Bilder" anlegen — Dublette auf Drive. Unschön.

Der neue Code prüft zuerst, ob ein Legacy-Alias-Ordner schon existiert, und verwendet dann dessen Drive-ID für den neuen Namen statt ein Duplikat zu bauen. Ergebnis: sauberes Drive bleibt sauber.

---

## 2. Wie es zusammenhängt mit B1

Erinnerung zur Navigation aus Baustein 1:

```
Liste → Baustelle wählen → 2 Haupt-Kacheln
                                │
                                ├── BAUSTELLEN-DATEN   ← Klick auf diese Kachel
                                │     ↓                 zeigt nun 5 Sub-Kacheln
                                │   5 Sub-Kacheln      (statt 4 in B1)
                                │     ↓
                                │   Ordner-Browser
                                │
                                └── NACHRICHTEN (Platzhalter bis B4)
```

---

## 3. Geänderte Dateien

| Datei | Geändert? | Zweck |
|---|---|---|
| `tw-infrastructure.js` | ✅ JA | `STAGING_CONFIG` auf 5 Unterordner + `SUBFOLDER_ALIASES`-Map |
| `tw-staging.js` | ✅ JA | Alias-Logik in `getStagingInfo`, `isStagingBereitgestellt`, `createStagingBaustelle` |
| `tw-baustelle.jsx` | ✅ JA | Icons/Farben für 5 neue Unterordner, Legacy-Badge in Kacheln, UI-Text fuenf statt vier |
| `index.html` | ✅ JA | Neu gebaut — enthält die JSX-Änderungen |

**Wichtig beim Upload:** `tw-infrastructure.js` und `tw-staging.js` werden als **externe Scripts** geladen (nicht in index.html einkompiliert). Du musst also alle **vier** Code-Dateien hochladen.

---

## 4. Validierung (bereits durchgeführt)

| Check | Ergebnis |
|---|---|
| Babel-Kompilierung `tw-baustelle.jsx` | ✅ Exit 0 |
| Node-Syntax-Check `tw-staging.js` | ✅ Exit 0 |
| Node-Syntax-Check `tw-infrastructure.js` | ✅ Exit 0 |
| Cross-Modul-Funktionsname-Konflikte | ✅ keine |
| Block-Comment-Balance in `tw-baustelle.jsx` | ✅ 102 / 102 |
| `div#root` im fertigen `index.html` | ✅ genau 1 |
| `<script type="text/babel">` | ✅ genau 1 |
| Duplicate `const`-Check | ✅ nur in `tw-infrastructure.js` |
| Hotfix aus B1 im Bundle erhalten | ✅ ja |
| „Baustellendaten" im Bundle | ✅ 5× präsent |

---

## 5. Deployment

**Upload-Liste:** Alle **vier** Dateien in dein `tw-business-suite`-Repo hochladen:

1. `index.html` (neu gebaut, enthält die JSX-Updates)
2. `tw-baustelle.jsx` (Quellreferenz)
3. `tw-infrastructure.js` (**wichtig**, externes Script)
4. `tw-staging.js` (**wichtig**, externes Script)

Alle überschreiben, Commit + Push. GitHub-Pages deployt automatisch. Nach ca. 30–60 Sek testen.

### Erwartete Sichtprüfung

1. **Bestehende Baustelle öffnen:**
   - `BAUSTELLEN-DATEN` antippen → du siehst jetzt **5 Kacheln** statt 4
   - Unter `📸 Fotos` steht ein oranges Badge `⚠ Drive: "Bilder"` (weil Daten noch unter altem Namen liegen)
   - Unter `📋 Anweisungen` steht `⚠ Drive: "Baustellen-App"`
   - Die Dateianzahl/-größe in `Fotos` und `Anweisungen` passt — die Daten sind da, nur unter Legacy-Namen
   - Die neue Kachel `📊 Baustellendaten` zeigt „0 Dateien" und ist ausgegraut (der Ordner existiert noch nicht)

2. **„Vervollstaendigen" tippen** (orangener Hinweis-Balken oben):
   - Nur der fehlende Ordner `Baustellendaten` wird angelegt
   - Keine Duplikat-Ordner `Fotos` oder `Anweisungen` neben den Legacy-Ordnern
   - Warn-Badges bleiben unverändert, weil Legacy-Namen noch nicht umbenannt

3. **Neue Baustelle per „Staging anlegen":**
   - Direkt alle 5 neuen Namen, keine Aliases, keine Warn-Badges

---

## 6. Was als Nächstes kommt

| # | Baustein | Status |
|---|---|---|
| **1** | Fundament: 2-Ordner pro Baustelle + Zeitbegrenzung | ✅ fertig |
| **H** | Hotfix Raumerkennung | ✅ fertig |
| **2** | 5 Sub-Ordner + Alias-System | ✅ **fertig (dieser)** |
| 3 | Firebase-Schema: `/mitarbeiter/`, `/kalender/`, `/chats/`, `/baustellen_planung/` | ⏳ **nächster** |
| 4 | Nachrichten-Modul UI (Mitarbeiter-Liste + Detail-Dispatcher) | ⏳ |
| 5 | Kalender-UI (Jahres-Ansicht + Tages-Modal) | ⏳ |
| 6 | Chat-UI Büro-Seite | ⏳ |
| 7 | Hauptkalender (4. Button) + Baustellen-Planung | ⏳ |
| 8 | Drive-Migration-Skript (räumt die Legacy-Namen endgültig auf) | ⏳ |
| 9 | Foto-Review-Gate (NEU) | ⏳ |
| 10 | Stunden-Review-Gate (NEU) | ⏳ |
| 11 | Cloud Functions (separates Repo) | ⏳ |

**Baustein 3 ist reine Infrastruktur** (API-Schicht in `FirebaseService` für Mitarbeiter-Stammdaten, Kalender-Einträge, Chats, Baustellen-Planung). Sichtbar in der UI wird davon erst ab Baustein 4 etwas — aber B3 ist die Voraussetzung, damit B4–B7 überhaupt Daten haben, mit denen sie arbeiten können.

---

**ENDE LIESMICH Baustein 2 · 22.04.2026**
