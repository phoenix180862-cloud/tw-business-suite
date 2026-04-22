# LIESMICH · Baustein 10 · Stunden-Review-Gate + FreigabenHub-Tabs

**Datum:** 22.04.2026
**Teil des Master-App-Nachzugs (neues Feature jenseits des Nachzugs)**
**Voraussetzung:** Bausteine 1 (+Hotfix), 2, 3, 4, 5, 6, 7, 8, 9 sind deployed
**Status:** Ausgeliefert, deploybar

---

## 1. Was dieser Baustein liefert

Der `FreigabenHub` bekommt ein **Tab-System**. Oben sitzen jetzt zwei Tabs — `📸 Fotos` (aus B9) und `⏱ Stunden` (neu) — beide mit eigenem Live-Badge-Counter. Jeder Tab ist eine eigenständige Review-Queue.

Der Stunden-Tab funktioniert **analog zu B9**, mit drei Besonderheiten:
- Statt Thumbnail zeigt jede Karte ein PDF-Icon (Drive liefert keine brauchbaren Thumbnails für PDFs auf mobile-taugliche Weise)
- Zusatzfelder in Karte: Stunden-Summe, Monat, Zeitraum, Material-Liste (alle optional)
- **Freigabe kopiert in ZWEI Ziele**: Kunden-Stundennachweis-Ordner UND Lohnbuchhaltungs-Monatsordner
- Thomas kann beim Freigeben eine **Anmerkung** dranheften (z.B. „15.04. manuell korrigiert von 8h auf 7,5h"), die dauerhaft in Firebase sichtbar bleibt

### 1.1 Komponenten-Landschaft

| Komponente | Neu / Geändert | Zweck |
|---|---|---|
| `FreigabenHub` | **geändert** (Tab-Container) | Enthält nur noch Seiten-Header + Tab-Auswahl + conditional render. Keine Queue-Logik mehr direkt. |
| `FotoFreigabenTab` | **neu** (ausgelagert) | Der bisherige B9-Hub-Inhalt, jetzt ohne UnterseitenHeader. Logik 1:1 wie in B9. |
| `StundenFreigabenTab` | **neu** | PDF-Queue für Stundenzettel mit Status- und Zusatz-Filtern (Baustelle + MA) |
| `StundenReviewKarte` | **neu** | Einzelner Stundenzettel mit Meta-Feldern + Aktions |
| `StundenFreigebenDialog` | **neu** | Overlay beim Freigeben mit optionaler Anmerkung und Info-Tabelle |
| `AblehnDialog` | **wiederverwendet** | Derselbe Dialog wie bei Fotos. Chat-Nachricht ist status-aware formuliert. |

### 1.2 Status-Filter + Zusatz-Filter (Stunden-Tab)

- Status-Filter wie bei Fotos: `🕐 Wartend (N)` / `✓ Freigegeben (N)` / `✗ Abgelehnt (N)` / `Alle (N)`
- **Zusätzlich zwei Dropdowns** (nebeneinander, nur wenn mehr als eine Option existiert): Baustellen-Filter + Mitarbeiter-Filter. Damit kann Thomas schnell z.B. „alle Ivans Stundenzettel dieses Monat" filtern.

### 1.3 Freigebe-Flow (duale Kopie)

Klick `✓ Freigeben` öffnet den `StundenFreigebenDialog`:
- Info-Tabelle mit MA, Baustelle, Monat, Stunden-Summe, Dateiname
- Anmerkung-Textarea (optional)
- Buttons: `Abbrechen` · `✓ Freigeben & kopieren`

Bei Bestätigung passiert sequentiell:
1. `TWStaging.findeKundenStundenOrdner(baustelle_id)` — findet `Baustellen neu/{kunde}/Stundennachweis/`
2. `TWStaging.ensureLohnMonatsOrdner(monat)` — findet oder **legt an** `Lohnbuchhaltung/{YYYY-MM}/` im Drive-Root
3. `kopierePdfInOrdner(staging_id, kundenOrdner.id, dateiname)` — Kopie 1 (originaler Dateiname)
4. `kopierePdfInOrdner(staging_id, lohnOrdner.id, "{maId}_{baustelle}_{monat}.pdf")` — Kopie 2 mit eindeutigem Lohnbuchhaltungs-Namen
5. `FirebaseService.markiereStundenFreigegeben(pdfId, kundenId, lohnId, 'Thomas', anmerkung)` — Status + beide Drive-IDs + Anmerkung persistieren

**Lohn-Ordner-Struktur auf Drive:**
```
(Root)
└── Lohnbuchhaltung/          ← wird automatisch angelegt falls nicht vorhanden
    ├── 2026-03/              ← Monats-Unterordner
    ├── 2026-04/              ← dito
    │   ├── ivan_meyer-bad_2026-04.pdf
    │   ├── michal_meyer-bad_2026-04.pdf
    │   └── ivan_schulze-haus_2026-04.pdf
    └── ...
```

### 1.4 Ablehn-Flow

- Wiederverwendet `AblehnDialog` aus B9 (Textarea + 4 Schnell-Vorschläge, ESC schließt)
- Firebase-Status auf `abgelehnt` setzen
- Automatische Chat-Nachricht an MA: **„⏱ Stundenzettel abgelehnt (\"dateiname.pdf\"): {grund} — Bitte korrigierten Stundenzettel hochladen."**

---

## 2. Neue APIs

### 2.1 Firebase (`FirebaseService`)

| Methode | Zweck |
|---|---|
| `subscribeStundenFreigaben(cb)` | Live-Listener auf `/freigaben/stunden/`. Callback liefert `{pdfId: eintrag}` |
| `schreibeStundenFreigabe(pdfId, daten)` | Neuen Eintrag anlegen (wird von MA-App beim PDF-Upload gerufen; hier für Test-Anlagen) |
| `markiereStundenFreigegeben(pdfId, kundenFileId, lohnFileId, von, anmerkungBuero)` | Status + beide Drive-IDs + optionale Anmerkung |
| `markiereStundenAbgelehnt(pdfId, grund, von)` | Status `abgelehnt` + Metadaten |

### 2.2 Drive (`TWStaging`)

| Methode | Zweck |
|---|---|
| `listeStagingStunden(baustelleName)` | Listet alle Dateien im Staging-Stunden-Ordner einer Baustelle |
| `findeKundenStundenOrdner(kundenName)` | `Baustellen neu/{kunde}/Stundennachweis` — tolerant per Teilstring |
| `ensureLohnMonatsOrdner(monat)` | Holt oder **legt neu an** `Lohnbuchhaltung/{YYYY-MM}`. `monat` muss `YYYY-MM`-Format haben |
| `kopierePdfInOrdner(stagingFileId, zielOrdnerId, neuerName)` | Generische `files.copy` (PDFs) in beliebigen Ziel-Ordner |

---

## 3. Firebase-Schema `/freigaben/stunden/{pdf-id}/`

```
baustelle_id:      "meyer-bad"             // string, zwar empfohlen aber nicht pflicht
                                             // (falls MA Stunden ohne Baustellen-Bezug hochlaedt)
ma_id:             "ivan"                  // Pflicht
staging_file_id:   "1AbC2DeF..."           // Drive-File-ID im Staging
dateiname:         "Stunden_Ivan_2026-04.pdf"
status:            "wartend"               // "wartend" | "freigegeben" | "abgelehnt"
hochgeladen_am:    1745400000000

// Optional (je nachdem was MA-App beim Upload setzt):
monat:             "2026-04"               // "YYYY-MM"
stunden_summe:     168.5                   // number
zeitraum_von:      "2026-04-01"
zeitraum_bis:      "2026-04-30"
material_liste:    "10kg Fugenmasse, 2x Silikon weiss"

// Nach Freigabe:
freigegeben_am:    1745401000000
freigegeben_von:   "Thomas"
kunden_file_id:    "1XyZ..."               // Drive-File-ID im Kunden-Ordner
lohn_file_id:      "1PqR..."               // Drive-File-ID im Lohn-Monatsordner
anmerkung_buero:   "15.04. auf 7,5h korrigiert"

// Nach Ablehnung:
abgelehnt_am:      1745402000000
abgelehnt_von:     "Thomas"
abgelehnt_grund:   "Stundenzettel unvollstaendig"
```

**Security-Rule-Empfehlung** analog zu Fotos:
```
"/freigaben/stunden": {
  ".read": "auth != null",
  ".write": "auth != null && (
    (!data.exists() && newData.child('status').val() === 'wartend')
    ||
    root.child('users').child(auth.uid).child('rolle').val() === 'admin'
  )"
}
```

---

## 4. Ende-zu-Ende-Workflow

**Aus MA-Sicht** (wird im späteren MA-App-Baustein implementiert):
1. MA füllt in der Baustellen-App seinen Stundenzettel für den Monat aus
2. App exportiert PDF, lädt es nach `/Baustellen-App-Staging/{baustelle}/Stunden/` hoch
3. App schreibt `/freigaben/stunden/{id}/` mit allen Metadaten

**Aus Büro-Sicht (= B10)**:
4. Startseite → `✅ Freigaben` Badge zeigt Gesamtzahl (Fotos + Stunden wartend)
5. Klick → FreigabenHub öffnet sich auf Tab `📸 Fotos`. Tab `⏱ Stunden` zeigt eigenen Badge
6. Klick auf Stunden-Tab → Queue mit PDF-Karten
7. Filter setzen (z.B. „nur Ivan") → relevante Karten
8. Klick `✓ Freigeben` → Dialog mit Info-Tabelle + Anmerkung-Feld
9. Anmerkung eintragen (optional), `✓ Freigeben & kopieren`
10. Hintergrund: 2 Drive-Copies parallel → Status-Update → Karte wird grün

**Nach Freigabe:**
- PDF liegt in `Baustellen neu/meyer-bad/Stundennachweis/` (Kunden-Archiv)
- PDF liegt in `Lohnbuchhaltung/2026-04/ivan_meyer-bad_2026-04.pdf` (Lohn-Archiv)
- Staging-Original bleibt (bis zum nächsten Cleanup)
- Alle drei Drive-IDs in Firebase vermerkt

---

## 5. Geänderte Dateien

| Datei | Geändert? | Zweck |
|---|---|---|
| `tw-baustelle.jsx` | ✅ JA | FreigabenHub refactored, FotoFreigabenTab ausgelagert, 4 neue Komponenten |
| `tw-infrastructure.js` | ✅ JA | 4 neue FirebaseService-Methoden |
| `tw-staging.js` | ✅ JA | 4 neue Drive-Helfer |
| `index.html` | ✅ JA | Neu gebaut, 30.304 Zeilen |
| alle anderen | — | unverändert |

**Upload-Liste:** Vier Dateien.

---

## 6. Validierung

| Check | Ergebnis |
|---|---|
| Babel-Kompilierung `tw-baustelle.jsx` | ✅ Exit 0 |
| Node-Syntax-Check `tw-staging.js` | ✅ Exit 0 |
| Node-Syntax-Check `tw-infrastructure.js` | ✅ Exit 0 |
| Je 1× FreigabenHub / FotoFreigabenTab / StundenFreigabenTab / StundenReviewKarte / StundenFreigebenDialog | ✅ |
| Block-Comment-Balance | ✅ 173 / 173 |
| `div#root` | ✅ 1 |
| B9-Komponenten FotoReviewKarte + AblehnDialog erhalten | ✅ |
| B8-`umbenennenOrdner` erhalten | ✅ |
| B7-HauptkalenderView erhalten | ✅ |
| B6-MaChatThread erhalten | ✅ |
| B5-MaKalenderJahresAnsicht erhalten | ✅ |
| B4-NachrichtenBereich erhalten | ✅ |
| B3-Seed-Hook erhalten | ✅ |
| B2-„Baustellendaten" erhalten | ✅ |
| B1-Hotfix erhalten | ✅ |

---

## 7. Deployment

**Upload:** 4 Dateien ins `tw-business-suite`-Repo:
1. `index.html`
2. `tw-baustelle.jsx`
3. `tw-infrastructure.js`
4. `tw-staging.js`

Commit + Push, 30–60 Sek warten.

### Sichtprüfung

1. **Startseite → ✅ Freigaben:** FreigabenHub öffnet sich mit **zwei Tab-Buttons** oben (`📸 Fotos` und `⏱ Stunden`), Fotos-Tab ist aktiv
2. **Klick auf Stunden-Tab:** Leerer Stunden-Bereich mit Empty-State „Keine wartenden Stundenzettel"
3. **Test-Eintrag anlegen** (Browser-Konsole):
   ```js
   await window.FirebaseService.schreibeStundenFreigabe('test-stunden-001', {
     ma_id: 'ivan',
     baustelle_id: 'meyer-bad',
     staging_file_id: '<echte-drive-id-eines-PDFs>',
     dateiname: 'Stunden_Ivan_2026-04.pdf',
     monat: '2026-04',
     stunden_summe: 168.5,
     material_liste: '10kg Fugenmasse'
   });
   ```
4. **Karte erscheint:** Mit PDF-Icon, MA-Name, Monat, Stunden-Summe, Baustelle, Upload-Zeit. Stunden-Tab-Badge zeigt „1"
5. **Klick `✓ Freigeben`:** Dialog öffnet mit Info-Tabelle und Anmerkungsfeld
6. **Anmerkung eintippen** (optional) → `✓ Freigeben & kopieren`
7. **Nach ~2-3 Sekunden** (zwei sequentielle Drive-Copies): Karte wird grün, Footer zeigt „Freigegeben am ... · in Kunden + Lohn kopiert"
8. **Drive-Check:**
   - `Baustellen neu/meyer-bad/Stundennachweis/Stunden_Ivan_2026-04.pdf` — Kunden-Kopie
   - `Lohnbuchhaltung/2026-04/ivan_meyer-bad_2026-04.pdf` — Lohn-Kopie (wurde automatisch angelegt beim ersten Aufruf)
9. **Ablehn-Test:** Anderen Eintrag anlegen → `✗ Ablehnen` → Grund „Datum fehlt" → MA bekommt Chat „⏱ Stundenzettel abgelehnt..."

---

## 8. Wichtige Anmerkungen

### 8.1 Lohnbuchhaltungs-Ordner wird automatisch angelegt

Beim ersten Freigeben im Monat legt `ensureLohnMonatsOrdner('2026-04')` den Ordner `Lohnbuchhaltung` im Drive-Root an (falls nicht vorhanden) und darin `2026-04/` (falls nicht vorhanden). Bei späteren Freigaben im gleichen Monat werden beide Ordner wiederverwendet.

**Falls du den Lohn-Ordner anderswo haben willst:** In `tw-infrastructure.js` gibt es `DRIVE_ORDNER` — dort kannst du `LOHN_WURZEL` als neuen Eintrag hinzufügen (Default `Lohnbuchhaltung`). Die Struktur bleibt immer `{LOHN_WURZEL}/{YYYY-MM}/`.

### 8.2 Lohn-Dateinamen haben ein anderes Format

Im Kunden-Ordner bleibt der Original-Dateiname (`Stunden_Ivan_2026-04.pdf`). Im Lohn-Monatsordner wird er umbenannt auf `{maId}_{baustelle}_{monat}.pdf` (z.B. `ivan_meyer-bad_2026-04.pdf`). Das ist nötig, weil im Monatsordner Stundenzettel aller MAs und aller Baustellen zusammenliegen — ohne eindeutige Namen wäre das chaotisch und würde zu Namens-Kollisionen führen.

### 8.3 Monat wird automatisch abgeleitet

Wenn das MA-App-PDF beim Upload keinen `monat`-Eintrag setzt, wird der Upload-Zeitpunkt als Fallback genommen. Das ist robust, aber nicht perfekt: Ein Stundenzettel für März, der erst am 3. April hochgeladen wird, landet dann im Lohn-Ordner `2026-04` statt `2026-03`. Falls das regelmässig passiert, solltest du die MA-App-Seite (später) so bauen, dass der Monat immer explizit mitgeschickt wird.

### 8.4 Staging-PDF bleibt erhalten

Wie bei Fotos in B9 ist auch hier `drive.files.copy` verwendet, nicht `move`. Das Staging-PDF bleibt, bis ein späterer Cleanup-Baustein es aufräumt. Vorteil: Die MA-App-Sync bleibt konsistent.

### 8.5 Zweistufiger Rollback

Falls die Freigabe in der Mitte schiefgeht (z.B. Kunden-Kopie klappt, Lohn-Kopie nicht wegen Rechte-Problem), bleibt der Firebase-Status auf `wartend` — der Eintrag wird **nicht** als freigegeben markiert. Du siehst in Drive die erste Kopie (Kunden-Ordner), aber die Queue zeigt das PDF noch als wartend. Beim erneuten Klick auf `✓ Freigeben` würde dann in beiden Zielen eine Datei mit demselben Namen landen — Drive erlaubt das technisch, aber es ist ein Datenchaos.

**Wenn das passiert:** Die Kunden-Kopie manuell aus Drive löschen, dann nochmal freigeben. Alternativ den Eintrag per Ablehnung markieren und vom MA korrigieren lassen.

Für den ersten Produktiv-Einsatz ist das akzeptabel. Später kann man einen Rollback-Flow einbauen, der bei Fehler die bereits angelegte Kopie 1 wieder löscht.

### 8.6 Tab-State-Persistierung

Wenn du zwischen Fotos und Stunden hin und her wechselst, bleibt der interne State jedes Tabs **nicht** erhalten — beim Wechsel wird die jeweils andere Komponente neu gemountet und der Live-Listener neu eingerichtet. Das ist OK für den normalen Gebrauch, aber wenn du z.B. gerade einen Ablehn-Dialog offen hast und versehentlich den Tab wechselst, verlierst du den Dialog-State. Falls das in der Praxis stört, können wir das mit einem geteilten Parent-State fixen.

---

## 9. Was als Nächstes kommt

| # | Baustein | Status |
|---|---|---|
| 1–10 | B1 + Hotfix + B2–B10 | ✅ fertig |
| 11 | Cloud Functions (Übersetzung + FCM-Push) | ⏳ **letzter** |

**Baustein 11** ist der letzte — und anders als alle vorigen: Es ist **kein** Code-Update im `tw-business-suite`-Repo, sondern ein separates **Firebase-Functions-Repo**. Zwei Cloud Functions werden deployed:
1. **onCreate Chat-Nachricht**: Liest `text_original` + `sprache_original`, ruft Gemini Flash für die Übersetzung in die anderen 8 Sprachen (de/en/ru/tr/cs/es/pl/ro/uk), schreibt `text_uebersetzt/{lang}/` zurück. Dauert ~2-3s pro Nachricht.
2. **onCreate Dringend-Nachricht**: Wenn `dringend === true && von === 'buero'`, liest alle registrierten `fcm_token`s des MA, sendet Notification mit Payload (MA-ID, Nachricht-ID). Das MA-Handy zeigt Push, auch wenn die App zu ist.

Nach B11 ist der Master-App-Nachzug + die drei neuen Features (B8 Migration, B9 Foto-Review, B10 Stunden-Review) komplett. Die MA-App-Etappen 1–5 haben ihre Büro-Gegenstücke. Das Gesamtsystem ist produktiv.

**Mini-Bilanz:** Mit B1–B10 sind jetzt **17 neue React-Komponenten** in der Master-App. Firebase-Schemas für Kalender, Chat, Planungen, Foto-Freigaben und Stunden-Freigaben sind definiert und produktiv. Drive-APIs umfassen Staging-Management, Migration, Alias-Auflösung, Copy-in-Ziel und Auto-Ordner-Anlage für Lohn.

---

**ENDE LIESMICH Baustein 10 · 22.04.2026**
