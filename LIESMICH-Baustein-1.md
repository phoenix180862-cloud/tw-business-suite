# LIESMICH · Baustein 1 · 2-Ordner-Modell pro Baustelle + Zeitbegrenzung-Fix

**Datum:** 22.04.2026
**Teil des Master-App-Nachzugs** (Arbeitsanweisung `ARBEITSANWEISUNG-Master-App-Nachzug.md`)
**Status:** Ausgeliefert, deploybar, Folge-Bausteine 2–11 kommen einzeln

---

## 1. Was dieser Baustein liefert

### 1.1 Fundament: 2-Ordner-Modell pro Baustelle (Etappe 4.1 Abschnitt 4.2)

Die Detail-Ansicht einer Baustelle (`StagingDetail` in `tw-baustelle.jsx`) wurde von **4 kleinen Kacheln** (Zeichnungen, Baustellen-App, Bilder, Stunden) auf **2 grosse Haupt-Kacheln** umgestellt:

- **📂 BAUSTELLEN-DATEN** (blauer Gradient) — hier sitzen gemeinsame Dateien pro Kunde
- **💬 NACHRICHTEN** (grüner Gradient) — hier kommen in Baustein 4–6 Kalender & Chat pro Mitarbeiter rein

Die bisherigen 4 Sub-Kacheln sind **nicht weg** — sie liegen jetzt **eine Ebene tiefer** unter BAUSTELLEN-DATEN. Ein Tap auf die große BAUSTELLEN-DATEN-Kachel zeigt sie unverändert weiter, sodass Zeichnungen, Bilder, Stunden und der Baustellen-App-Ordner genauso erreichbar sind wie vorher. Die Migration auf die finale 5-Ordner-Struktur (Zeichnungen · Anweisungen · Baustellendaten · Fotos · Stunden) folgt in **Baustein 2**.

Ein Tap auf NACHRICHTEN zeigt aktuell einen Platzhalter mit dem Hinweis, dass Kalender & Chat in Baustein 4–6 kommen.

### 1.2 Zeitbegrenzung der Geräte-Freigabe (Bonus-Fix)

Im `NeueEinladungDialog` (Button „Neue Einladung" auf der TEAM-Seite) wurde die Gültigkeitsdauer der PIN/Einladung von 5 auf **7 Optionen** erweitert:

| vorher | `1` · `3` · `7` · `14` · `30` |
| --- | --- |
| **jetzt** | `1` · `3` · `7` · `14` · `30` · **`6M`** · **`12M`** |

- `6M` = 180 Tage
- `12M` = 365 Tage

Im Backend werden weiterhin **Tage** gespeichert (`180` bzw. `365`) — das bestehende Format für `gueltigBis` (ISO-String) bleibt unverändert. Nur die UI-Labels und das Options-Array wurden angepasst. Label der Überschrift: „Gueltig fuer (Tage / Monate)".

Dieser Fix war in einer früheren Iteration schon mal drin, ist aber irgendwo auf der Strecke geblieben. Wurde nach deiner Anweisung vom 22.04.2026 wieder eingebaut.

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

**Zurück-Button-Verhalten:** Der Zurück-Pfeil im Header navigiert **schrittweise rückwärts** — erst aus einer Sub-View (4-Kachel-Gitter oder Nachrichten-Platzhalter) zurück zu den 2 Haupt-Kacheln, dann erst zurück zur Baustellen-Liste. Kein überraschendes „zwei Ebenen auf einmal".

---

## 3. Geänderte Dateien

| Datei | Geändert? | Zweck |
|---|---|---|
| `tw-baustelle.jsx` | ✅ JA | 2-Kachel-Modell, subView-State, Zeitbegrenzung 6M/12M |
| `index.html` | ✅ JA | Frisch gebaut — enthält alle aktuellen Module inkl. der geänderten `tw-baustelle.jsx` |
| Alle anderen JSX/JS | — | unverändert |

**Zeilenzahlen-Delta `tw-baustelle.jsx`:** ~4.736 → ~4.895 Zeilen (+159, für neue Kacheln + Platzhalter + subView-Handling)

---

## 4. Validierung (bereits durchgeführt)

| Check | Ergebnis |
|---|---|
| Babel-Kompilierung `tw-baustelle.jsx` | ✅ Exit 0 |
| Cross-Modul-Funktionsname-Konflikte | ✅ keine |
| Block-Comment-Balance (`/*` vs `*/`) | ✅ 101 / 101 |
| `div#root` im fertigen `index.html` | ✅ genau 1 |
| `<script type="text/babel">` | ✅ genau 1 |
| Duplicate `const`-Check (GDRIVE_CONFIG etc.) | ✅ nur in `tw-infrastructure.js` |

---

## 5. Deployment

1. ZIP entpacken und beide Dateien (`index.html` + `tw-baustelle.jsx`) in dein `tw-business-suite`-Repo über GitHub-Web-UI hochladen und damit überschreiben
2. Commit + Push (oder direkt über „Upload files" auf GitHub)
3. GitHub-Pages deployt automatisch — nach ca. 30–60 Sek auf `https://phoenix180862-cloud.github.io/tw-business-suite/` testen

**Erwartete Sichtprüfung:**
- Baustellen-Modul öffnen → Baustelle auswählen → **2 grosse Kacheln** (statt 4 kleiner)
- BAUSTELLEN-DATEN antippen → alte 4 Kacheln erscheinen
- Zurück-Pfeil → zurück zu den 2 Haupt-Kacheln (NICHT gleich zur Liste)
- TEAM → Neue Einladung → **7 Buttons** in der Gültigkeitsdauer-Reihe, die letzten zwei heißen `6M` und `12M`

**Startseite BAUSTELLEN / TEAM / SYNC bleibt unverändert** — der 4. Button (HAUPTKALENDER) kommt erst in **Baustein 7**.

---

## 6. Was als Nächstes kommt

Die Reihenfolge der Bausteine laut Arbeitsanweisung:

| # | Baustein | Status |
|---|---|---|
| **1** | Fundament: 2-Ordner pro Baustelle + Zeitbegrenzung | ✅ **fertig (dieser)** |
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

Wenn B1 bei dir im Browser läuft wie oben beschrieben, schick mir bitte kurz ein „weiter" — dann setze ich Baustein 2 auf (5 Sub-Ordner + Alias-System für die alten Ordnernamen `Bilder` → `Fotos` etc., damit bestehende Baustellen kompatibel bleiben).

---

**ENDE LIESMICH Baustein 1 · 22.04.2026**
