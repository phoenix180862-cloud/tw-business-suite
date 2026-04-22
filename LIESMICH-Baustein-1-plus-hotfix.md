# LIESMICH · Baustein 1 + Hotfix · 2-Ordner-Modell + Zeitbegrenzung + Raumerkennungs-Crashfix

**Datum:** 22.04.2026
**Teil des Master-App-Nachzugs** (Arbeitsanweisung `ARBEITSANWEISUNG-Master-App-Nachzug.md`)
**Status:** Ausgeliefert, deploybar, Folge-Bausteine 2–11 kommen einzeln

---

## 1. Was diese ZIP liefert

### 1.1 Baustein 1 · Fundament: 2-Ordner-Modell pro Baustelle (Etappe 4.1 Abschnitt 4.2)

Die Detail-Ansicht einer Baustelle (`StagingDetail` in `tw-baustelle.jsx`) wurde von **4 kleinen Kacheln** (Zeichnungen, Baustellen-App, Bilder, Stunden) auf **2 grosse Haupt-Kacheln** umgestellt:

- **📂 BAUSTELLEN-DATEN** (blauer Gradient) — hier sitzen gemeinsame Dateien pro Kunde
- **💬 NACHRICHTEN** (grüner Gradient) — hier kommen in Baustein 4–6 Kalender & Chat pro Mitarbeiter rein

Die bisherigen 4 Sub-Kacheln sind **nicht weg** — sie liegen jetzt **eine Ebene tiefer** unter BAUSTELLEN-DATEN. Ein Tap auf die große BAUSTELLEN-DATEN-Kachel zeigt sie unverändert weiter, sodass Zeichnungen, Bilder, Stunden und der Baustellen-App-Ordner genauso erreichbar sind wie vorher. Die Migration auf die finale 5-Ordner-Struktur (Zeichnungen · Anweisungen · Baustellendaten · Fotos · Stunden) folgt in **Baustein 2**.

Ein Tap auf NACHRICHTEN zeigt aktuell einen Platzhalter mit dem Hinweis, dass Kalender & Chat in Baustein 4–6 kommen.

### 1.2 Baustein 1 · Zeitbegrenzung der Geräte-Freigabe (Bonus-Fix)

Im `NeueEinladungDialog` (Button „Neue Einladung" auf der TEAM-Seite) wurde die Gültigkeitsdauer der PIN/Einladung von 5 auf **7 Optionen** erweitert:

| vorher | `1` · `3` · `7` · `14` · `30` |
| --- | --- |
| **jetzt** | `1` · `3` · `7` · `14` · `30` · **`6M`** · **`12M`** |

- `6M` = 180 Tage
- `12M` = 365 Tage

Im Backend werden weiterhin **Tage** gespeichert (`180` bzw. `365`) — das bestehende Format für `gueltigBis` (ISO-String) bleibt unverändert. Dieser Fix war in einer früheren Iteration schon mal drin, ist aber irgendwo auf der Strecke geblieben.

### 1.3 Hotfix · Raumerkennungs-Crash beim „Aufmaß beginnen"

**Symptom:** Beim Klick auf „Aufmaß beginnen" in der Business App zeigt die App einen Fullscreen-Fehler:

```
TypeError: Cannot read properties of undefined (reading 'length')
  at Raumerkennung
  at App
  at ErrorBoundary
```

**Ursache:** In `tw-aufmass.jsx` Zeile 4049 wurde beim Rendern der Raum-Liste ohne Null-Check auf `raum.waende.length` zugegriffen. Wenn ein Raum in `kunde.raeume` keine `waende`-Property hat (z.B. nach einem alten KI-Import oder einem manuell ohne Wände angelegten Raum), knallte genau dieser Render.

**Fix:** Defensive Absicherung mit Fallback auf leeres Array:

```jsx
// vorher
<span className="raum-list-tag">📐 {raum.waende.length} Wände</span>
// nachher
<span className="raum-list-tag">📐 {(raum.waende || []).length} Wände</span>
```

Alle anderen `raum.waende.length`-Zugriffe in der Datei sind bereits mit `raum.waende && ...` oder über eine `hasData`-Dependency abgesichert — nur diese eine Stelle war der Ausreißer. Der Bug war nicht durch Baustein 1 verursacht (`tw-aufmass.jsx` ist in B1 unverändert), sondern latent vorhanden; wurde heute zum ersten Mal getroffen, weil bei diesem Kunden offenbar ein Raum-Datensatz ohne `waende` existiert.

---

## 2. Was sich am Navigations-Fluss ändert

**Vorher (Etappe 4):**
```
Liste → Baustelle wählen → 4 Kacheln → Ordner-Browser
```

**Jetzt (Etappe 4.1 · B1):**
```
Liste → Baustelle wählen → 2 Haupt-Kacheln
                                │
                                ├── BAUSTELLEN-DATEN
                                │     ↓
                                │   4 Sub-Kacheln (wie vorher) → Ordner-Browser
                                │
                                └── NACHRICHTEN (Platzhalter bis B4)
```

**Zurück-Button-Verhalten:** Der Zurück-Pfeil im Header navigiert **schrittweise rückwärts** — erst aus einer Sub-View (4-Kachel-Gitter oder Nachrichten-Platzhalter) zurück zu den 2 Haupt-Kacheln, dann erst zurück zur Baustellen-Liste.

---

## 3. Geänderte Dateien

| Datei | Geändert? | Zweck |
|---|---|---|
| `tw-baustelle.jsx` | ✅ JA | 2-Kachel-Modell, subView-State, Zeitbegrenzung 6M/12M |
| `tw-aufmass.jsx` | ✅ JA | **Hotfix:** `raum.waende.length` null-safe |
| `index.html` | ✅ JA | Frisch gebaut — enthält beide Änderungen |
| Alle anderen JSX/JS | — | unverändert |

---

## 4. Validierung (bereits durchgeführt)

| Check | Ergebnis |
|---|---|
| Babel-Kompilierung `tw-baustelle.jsx` | ✅ Exit 0 |
| Babel-Kompilierung `tw-aufmass.jsx` | ✅ Exit 0 |
| Cross-Modul-Funktionsname-Konflikte | ✅ keine |
| Block-Comment-Balance in `tw-baustelle.jsx` | ✅ 101 / 101 |
| `div#root` im fertigen `index.html` | ✅ genau 1 |
| `<script type="text/babel">` | ✅ genau 1 |
| Duplicate `const`-Check (GDRIVE_CONFIG etc.) | ✅ nur in `tw-infrastructure.js` |
| Hotfix im Bundle präsent | ✅ `(raum.waende \|\| []).length` genau 1× |

---

## 5. Deployment

1. ZIP entpacken; **drei** Dateien hochladen (`index.html` + `tw-baustelle.jsx` + `tw-aufmass.jsx`) in dein `tw-business-suite`-Repo über GitHub-Web-UI, überschreiben
2. Commit + Push (oder direkt über „Upload files" auf GitHub)
3. GitHub-Pages deployt automatisch — nach ca. 30–60 Sek auf `https://phoenix180862-cloud.github.io/tw-business-suite/` testen

**Erwartete Sichtprüfung nach Deploy:**

- **Aufmaß-Modul:** „Aufmaß beginnen" → Raumerkennung öffnet sich **ohne Crash**, auch bei Kunden mit unvollständigen Raum-Datensätzen. Räume ohne `waende` zeigen „📐 0 Wände" statt Fullscreen-Error
- **Baustellen-Modul:** Baustelle auswählen → **2 grosse Kacheln** (statt 4 kleiner) BAUSTELLEN-DATEN + NACHRICHTEN
- BAUSTELLEN-DATEN antippen → alte 4 Kacheln erscheinen, Zurück-Pfeil geht schrittweise zurück
- NACHRICHTEN antippen → freundlicher Baustellen-Platzhalter 🚧
- **TEAM → Neue Einladung:** **7 Buttons** in der Gültigkeitsdauer-Reihe, die letzten zwei heißen `6M` und `12M`

**Startseite BAUSTELLEN / TEAM / SYNC bleibt unverändert** — der 4. Button (HAUPTKALENDER) kommt erst in **Baustein 7**.

---

## 6. Was als Nächstes kommt

Die Reihenfolge der Bausteine laut Arbeitsanweisung:

| # | Baustein | Status |
|---|---|---|
| **1** | Fundament: 2-Ordner pro Baustelle + Zeitbegrenzung | ✅ **fertig (diese ZIP)** |
| **H** | Hotfix Raumerkennung | ✅ **fertig (diese ZIP)** |
| 2 | 5 Sub-Ordner unter BAUSTELLEN-DATEN + Alias-System | ⏳ nächster |
| 3 | Firebase-Schema: `/mitarbeiter/`, `/kalender/`, `/chats/`, `/baustellen_planung/` | ⏳ |
| 4 | Nachrichten-Modul UI (Mitarbeiter-Liste + Detail-Dispatcher) | ⏳ |
| 5 | Kalender-UI (Jahres-Ansicht + Tages-Modal) | ⏳ |
| 6 | Chat-UI Büro-Seite | ⏳ |
| 7 | Hauptkalender (4. Button) + Baustellen-Planung | ⏳ |
| 8 | Drive-Migration-Skript | ⏳ |
| 9 | Foto-Review-Gate (NEU) | ⏳ |
| 10 | Stunden-Review-Gate (NEU) | ⏳ |
| 11 | Cloud Functions (separates Repo) | ⏳ |

---

**ENDE LIESMICH Baustein 1 + Hotfix · 22.04.2026**
