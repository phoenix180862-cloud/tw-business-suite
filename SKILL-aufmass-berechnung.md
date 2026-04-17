---
name: aufmass-berechnung
description: >
  Verbindliche VOB/C DIN 18352 Berechnungslogik und Rechenweg-Darstellung fuer
  das Aufmasz-Modul der TW Business Suite. Dokumentiert die Formeln,
  Abzugsregeln und Uebermessungsregeln pro Positions-Kategorie (Wand, Boden,
  Decke, Verfugung, Estrich, Entkopplung, Sockel, Abdichtung, Silikon,
  Dichtband, Manschette, Fensterbank, Schiene). Gilt fuer den Raumblatt-
  Berechnen-Button, die Positionskarten-Rechenweg-Anzeige und alle
  Ergebnis-Ausgaben im Aufmasz-Modul. Nutze diesen Skill IMMER wenn der
  User fragt nach: Raumblatt berechnen, VOB-Berechnung, Rechenweg,
  Abzugsregeln, Uebermessung, 0,1-m2-Regel, 1m-Regel, Positions-Ergebnis,
  Flaechenberechnung, Laibungen-Berechnung, Tuer hoeher als Fliese,
  Fensterbruestung, Schichten-Regel, Abdichtungshoehe, Silikon-Berechnung,
  Dichtband-Berechnung, Sockel-Berechnung, oder Positions-Kategorien-Formeln.
  NICHT triggern fuer: Grundriss-Erkennung (SKILLRaumblatt1), Foto-Analyse
  (SKILLRaumblatt2), Oeffnungs-Eingabe (SKILLRaumblatt3), reine UI-Fragen
  ohne Berechnungsbezug, PDF-Erzeugung (gehoert ins Rechnungsmodul).
---

# VOB/C DIN 18352 — Berechnungslogik TW Business Suite

## ZWECK

Dieser Skill ist die **einzige verbindliche Referenz** fuer alle Flaechen-,
Laengen- und Stueck-Berechnungen im Aufmasz-Modul. Er dokumentiert die
bestehenden Funktionen `calcPositionResult(pos)` und `buildRechenweg(pos)`
in `tw-aufmass.jsx` und haelt deren Regeln fuer zukuenftige Aenderungen
nachvollziehbar fest.

**HEILIGE REGEL:** Jede Rechenweg-Darstellung in der App (Positionskarten-
Expand, Raumblatt-Berechnen-Modal, Raum-Zusammenfassung) MUSS identische
Ergebnisse liefern. Wer an der Rechenlogik dreht, aendert sie an genau
einer Stelle (`calcPositionResult` + `buildRechenweg`) — niemals in der
UI dupliziert.

**WICHTIG ZUR ARCHITEKTUR:** Die PDF-Erzeugung des Aufmaszes findet NICHT
im Aufmasz-Modul statt, sondern im Rechnungsmodul (Dokumenttyp 'aufmass').
Das Aufmasz-Modul stellt die Rohdaten (gesamtliste mit Positions-Ergebnissen)
bereit — die finale Aufbereitung und der Versand laufen ueber das
Rechnungsmodul wie bei einer normalen Rechnung.

---

## 1. VOB/C DIN 18352 — KERNREGELN

### 1.1 Abrechnungseinheiten (§ 0.5)

| Einheit | Verwendung |
|---------|-----------|
| **m2 (Flaeche)** | Wandfliesen, Bodenfliesen, Deckenfliesen, Vorbehandlung, Ausgleichsschicht, Trennschicht, Daemmschicht, Abdichtung Wand/Boden, Entkopplungsmatten, Estrich, Fensterbank (m2) |
| **m (Laenge)** | Sockel, Kehlen, Stufen, Schwellen, Dichtbaender, Silikonfugen, Profilschienen |
| **Stueck** | Saeulen, Pfeiler, Anarbeiten von Belaegen, Tuerzargen, Gehrungen, Dichtband-Ecken, Bodenablaeufe, Manschetten, Fensterbaenke (Stk) |

### 1.2 Abzugs- und Uebermessungsregeln (§ 5.3)

**Bei Flaechenabrechnung (m2):**
- Aussparungen/Oeffnungen **> 0,1 m2** Einzelgroesse → **abziehen**
- Aussparungen/Oeffnungen **≤ 0,1 m2** Einzelgroesse → **uebermessen** (nicht abziehen)
- Massgeblich sind die **kleinsten Masze** der Oeffnung (Rohbaumasze)

**Bei Laengenabrechnung (m):**
- Unterbrechungen **> 1 m** Einzellaenge → **abziehen**
- Unterbrechungen **≤ 1 m** Einzellaenge → **uebermessen**

### 1.3 Maszermittlung (§ 5.2)

- Flaechen werden bis zu den begrenzenden, **ungeputzten/ungedaemmten/
  unbekleideten Bauteilen** gemessen (Rohbaumasze).
- Wandbekleidungen: Masz ab Oberseite Sockel oder Oberseite Bodenbelag.
- In Flaechen eingesetzte Profilleisten, Zierplatten und Formteile werden
  **uebermessen** (nicht abgezogen).

### 1.4 Schichten-Regel

Wandbekleidungen, bei denen die Bekleidungshoehe **mehr als die halbe,
aber weniger als die volle Raumhoehe** erreicht, duerfen mit voller
Schichthoehe abgerechnet werden.

In der TW-App: Hinweis im Rechenweg wird angezeigt, die Hoehe H bleibt
aber wie eingegeben — der Nutzer entscheidet selbst.

---

## 2. POSITIONS-KATEGORIEN & FORMELN

Die internen Kategorien (pos.kategorie) steuern die Berechnung. Pro
Kategorie gelten die folgenden Formeln.

### 2.1 WAND (Fliesen) — `kategorie: 'wand'`

**Einheit:** m2

**Basis:**
- Rechteck: `Wandflaeche = 2 × (L + B) × H`
- Mehreck (>4 Waende): `Wandflaeche = Umfang × H`

Wobei H = Fliesenhoehe (oder Raumhoehe, wenn "raumhoch" aktiv ist).

**Abzuege:**
- Tueren (b × h) — **Ausnahme:** Wenn Tuerhoehe > Fliesenhoehe, wird statt
  der vollen Tuerflaeche nur `b × H` abgezogen (der tatsaechlich geflieste
  Bereich), die Tuerbreite wird vom Umfang subtrahiert.
- Fenster (b × h) — **Ausnahme:** Wenn Bruestung + Fensterhoehe > Fliesenhoehe,
  gilt `effektive H = h − (Bruestung + h − Fliesenhoehe)`.
- Sonstige Bauteile (mit Vorzeichen 'abzug')
- Uebermessen: Oeffnungen ≤ 0,1 m2 werden nicht abgezogen (Hinweis im Rechenweg)

**Zurechnungen (Laibungen):**
- Tuerlaibung: `2 × H × Tiefe` (bei `leibungWandGefliest`)
- Tuersturz: `b × Tiefe` (bei `sturzGefliest`, nur wenn Tuer NICHT hoeher als Fliese)
- Fensterlaibung seitlich: `2 × H_eff × Tiefe` (bei `leibungWandGefliest`)
- Fensterbank: `b × Tiefe` (bei `fensterbankGefliest`)
- Fenstersturz: `b × Tiefe` (bei `sturzGefliest`, nur wenn Fenster NICHT hoeher als Fliese)
- Sonstige Bauteile (mit Vorzeichen 'zurechnung')

**WICHTIG:** Boden-Laibungen (Tuer `leibungBodenGefliest`) gehen **NICHT**
zur Wand, sondern ausschlieszlich zur Bodenflaeche!

**Rechenbeispiel (Bad 3,45 × 2,10 × 2,50 m, Tuer 0,90×2,10, Fenster 1,20×1,00 bei Br. 1,00):**
```
Wandflaeche:   2 × (3,45 + 2,10) × 2,50 = 27,75 m2
− Tuer:                    0,90 × 2,10 =  − 1,89 m2
− Fenster:                 1,20 × 1,00 =  − 1,20 m2
+ Laibung Fenster (Tiefe 0,20):
    seitlich: 2 × 1,00 × 0,20           =  + 0,40 m2
    Fensterbank: 1,20 × 0,20            =  + 0,24 m2
                                       ────────────
ERGEBNIS                                =   25,30 m2
```

### 2.2 BODEN / DECKE — `kategorie: 'boden'` / `'decke'`

**Einheit:** m2

**Basis:**
- Rechteck: `Bodenflaeche = L × B`
- Mehreck: Muss manuell eingegeben werden (BM = bodenManual)
- Decke: Gleich Bodenflaeche (VOB: gleiche Regeln)

**Plus:** Boden-Laibungen aus Tueren (`b × Tiefe` bei `leibungBodenGefliest`)

**Abzuege/Zurechnungen:** Sonstige Bauteile (positionsspezifisch)

**Ausnahme:** Tueren/Fenster werden NICHT abgezogen — der Boden
liegt ja auch unter der Tueroeffnung!

### 2.3 VERFUGUNG — `kategorie: 'verfugung'`

**Einheit:** m2

Folgt exakt der zugehoerigen Flaeche (Wand oder Boden). Die
VOB-Basis (`getVobBasis(pos)`) entscheidet anhand der Tags
('wand' oder 'boden').

### 2.4 ESTRICH / ENTKOPPLUNG — `kategorie: 'estrich'` / `'entkopplung'`

**Einheit:** m2

Gleiche Regel wie Boden: Bodenflaeche − sonstige Abzuege + sonstige
Zurechnungen. **Keine** Tuer/Fenster-Abzuege.

### 2.5 SOCKEL — `kategorie: 'sockel'`

**Einheit:** m (oder Stk)

**Formel:** `Umfang − Unterbrechungen (Tuerbreiten) × Sockelanzahl`

Wird in der bestehenden App ueber `sockelErgebnis` geliefert.

**VOB-Regel:** Tuerbreiten werden als Unterbrechungen abgezogen
(Unterbrechungen > 1 m werden abgezogen, ≤ 1 m uebermessen — wobei
Tuerbreiten in der Regel < 1 m sind und damit eigentlich uebermessen
werden duerften. Die App zieht sie trotzdem konservativ ab, da das
fachlich korrekter ist: Unter einer Tuer liegt kein Sockel).

### 2.6 ABDICHTUNG WAND — `kategorie: 'abdichtung'` + tag `'wand'`

**Einheit:** m2

**Basis:** `Abdichtungsflaeche = 2 × (L + B) × AH` (bei Mehreck: Umfang × AH)

Wobei **AH = Abdichtungshoehe** (KANN abweichen von Fliesenhoehe!).

**Abzuege:**
- Tueren: Wenn Tuerhoehe > Abdichtungshoehe → `b × AH` (analog zur Wand-Regel,
  nur mit AH statt H)
- Fenster: Wenn Bruestung + Fensterhoehe > Abdichtungshoehe → reduzierte
  effektive Fensterhoehe

**Zurechnungen (separate Schalter pro Oeffnung!):**
- `leibungWandAbgedichtet` → `2 × AH_eff × Tiefe`
- `leibungBodenAbgedichtet` → `b × Tiefe`
- `sturzAbgedichtet` → `b × Tiefe` (nur wenn Oeffnung NICHT hoeher als Abd.)

Die Abdichtungs-Schalter sind **unabhaengig** von den Fliesen-Schaltern —
Abdichtung geht oft hoeher oder tiefer als die Fliese.

### 2.7 ABDICHTUNG BODEN — `kategorie: 'abdichtung'` + tag `'boden'`

**Einheit:** m2

Wie Boden: Bodenflaeche − sonstige Abzuege + sonstige Zurechnungen.

### 2.8 DICHTBAND — `kategorie: 'dichtband'` oder `abdichtung` + tag `'dichtband'`

**Einheiten:** m (Laenge) oder Stk (Ecken)

**Formel (m):**
```
Dichtband = Umfang + Raumecken × AH + Summe(Fensterbreite + 2 × Fenstertiefe)
          + Summe(2 × Tuertiefe)
```

**Formel (Stk, Ecken):**
```
Ecken = Raumecken + 2 × Anzahl_Tueren_mit_Laibung
      + 4 × Anzahl_Fenster_mit_Laibung
```

### 2.9 SILIKON — `kategorie: 'silikon'`

**Einheit:** m

**Formel:**
```
Silikon = Umfang + Raumecken × H
        + Summe(Fensterbreite + 2 × Fenstertiefe + 2 × Fensterhoehe)
        + Summe(2 × Tuerhoehe_eff + 2 × Tuertiefe)  [nur Tueren mit dauerelastisch=true]
```

### 2.10 MANSCHETTE — `kategorie: 'manschette'`

**Einheit:** Stk

In der App: Muss manuell eingegeben werden (calcPositionResult gibt 0
zurueck, dann greift der manuelle Wert).

### 2.11 FENSTERBANK — `kategorie: 'fensterbank'`

**Einheit:** Stk (= Anzahl Fenster) oder m2 (= Summe Breite × Tiefe)

### 2.12 SCHIENE — `kategorie: 'schiene'`

**Einheit:** m

Summe aus Fenster- und Tuerlaibungen, bei denen die entsprechenden
Schalter aktiv sind (`leibungWandGefliest`, `fensterbankGefliest`,
`sturzGefliest`).

---

## 3. PRIORITAETEN-LOGIK IN calcPositionResult

Die Funktion wertet pro Position in dieser Reihenfolge aus:

1. **hasManualRW = true** → `manualErgebnis` wird zurueckgegeben
2. **manualMenge > 0** → direkter Eingabewert
3. **posRechenwegEdits** vorhanden → Summe der bearbeiteten Schritte
4. **Auto-Berechnung** nach Kategorie (siehe oben)

Der Nutzer kann also jederzeit die Auto-Berechnung ueberschreiben:
- Per direkter Eingabe im Feld (manualMenge)
- Per Stift-Modus (posRechenwegEdits)
- Per manuellem Rechenweg-Modal (hasManualRW + manualRechenweg)

---

## 4. RECHENWEG-DARSTELLUNG

`buildRechenweg(pos)` liefert ein Array von Schritten mit folgender Struktur:

```javascript
{
  label: string,        // z.B. "Wandflaeche" oder "− Tuer (0,90×2,10)"
  formel: string,       // z.B. "2 × (3,45 + 2,10) × 2,50" oder "0,90 × 2,10"
  ergebnis: string,     // z.B. "27,75 m2" oder "−1,89 m2"
  type: string          // 'abzug' | 'zurechnung' | 'vob-info' | 'total'
}
```

`enrichRechenweg(steps)` ergaenzt `sign` und `value` fuer das UI-Rendering.

**Drei Darstellungsorte in der App:**

1. **Positionskarten-Expand (Tab 4, Zeile 11388):** Einzelne Position, volle
   Detailansicht mit Stift-Modus.
2. **Raum-Zusammenfassung (Tab 4, Zeile 11652):** Uebersicht aller Positionen
   mit Endergebnissen.
3. **Raumblatt-Berechnen-Modal (NEU):** Vollbild-Modal vor dem Fertigstellen
   des Raums — alle Positionen mit Rechenweg auf einen Blick.

Alle drei nutzen die GLEICHE Rechenbasis (`calcPositionResult` +
`buildRechenweg`). Nie eigene Parallelberechnungen!

---

## 5. RUNDUNG

VOB-konform: 2 Dezimalstellen bei Flaechen und Laengen.

```javascript
const vobRound = (val) => Math.round(val * 100) / 100;
```

Stueck-Angaben bleiben ganzzahlig.

Anzeige im deutschen Format (Komma als Dezimaltrenner) via `fmtDe(val)`.

---

## 6. SPEICHERWEG — WAS WO LIEGT

| Phase | Ort | Persistenz |
|-------|-----|-----------|
| Raumblatt wird bearbeitet | React-State + WIP-IndexedDB | Lokal, session-ueberdauernd |
| Raumblatt berechnet / fertiggestellt | `gesamtliste` im Aufmasz-State (tw-app) | Lokal |
| Aufmasz fertiggestellt | Navigation → Rechnungsmodul mit `vorwahlTyp='aufmass'` | Uebergabe per Props |
| Im Rechnungsmodul (Aufmasz-Edit) | Standard-Rechnungs-State | Wie Rechnung |
| PDF generiert / versendet | Google Drive unter `<Kunde>/Aufmass/` | Persistent auf Drive |

**WICHTIG:** Das Aufmasz-Modul erzeugt SELBST KEINE PDF. Die PDF entsteht
erst im Rechnungsmodul, wenn der Nutzer sie dort aus dem aufbereiteten
Aufmasz generiert. Das stellt sicher, dass ein Aufmasz-PDF nie
"irgendwo zwischendrin" entsteht und verlorengeht.

---

## 7. DER RAUMBLATT-BERECHNEN-BUTTON (neu)

**Position:** Obere rote Nav-Leiste des Raumblatts, rechts neben
"Raumblatt fertig stellen".

**Workflow:**
1. Nutzer klickt "Raumblatt berechnen"
2. Modal oeffnet sich mit:
   - Raumkopf (Name, L/B/H, Wand-/Bodenflaeche)
   - Pro Position: VOB-Rechenweg + Ergebnis (via buildRechenweg)
   - Raum-Summen gruppiert nach Einheit (m2, lfm, Stk)
3. Zwei Buttons im Modal:
   - "Schliessen" → Modal zu, nichts passiert
   - "Raumblatt fertig stellen" → ruft doRaumblattFertigstellen auf
4. Nach Fertigstellen: Zurueck zur Raumerkennung, der Raum steht
   in der Gesamtliste

**Keine PDF-Erzeugung im Aufmasz-Modul!** Die PDF entsteht spaeter im
Rechnungsmodul nach Klick auf "Aufmass fertigstellen".

---

## 8. CHECKLISTE — VOR AENDERUNGEN AN DER RECHENLOGIK

- [ ] Ist die geplante Aenderung VOB-konform? (§ 5.3: 0,1-m2-Regel, 1-m-Regel)
- [ ] Wird sie in `calcPositionResult` UND `buildRechenweg` konsistent gespiegelt?
- [ ] Funktioniert der manuelle Rechenweg (`hasManualRW`) weiterhin als Override?
- [ ] Greift die Prioritaeten-Logik (Manual > posRechenwegEdits > Auto)?
- [ ] Sind die Laibungs-Schalter (Wand/Boden/Sturz/Abdichtung) korrekt getrennt?
- [ ] Wird `vobRound` verwendet (keine nicht gerundeten Zwischenwerte)?
- [ ] Wird der Rechenweg in alle drei Darstellungsorten identisch angezeigt?
- [ ] Sind Umlaute in JSX-Kommentaren vermieden (ae/oe/ue/ss)?

---

## 9. HAEUFIGE FRAGEN

**Q: Warum werden bei Decke keine Oeffnungen abgezogen?**
A: Die Decke ist zusammenhaengend — Tueren und Fenster sitzen in den
Waenden, nicht in der Decke. Nur echte Deckendurchbrueche (z.B. Abluft)
werden ueber "Sonstige Bauteile" manuell abgezogen.

**Q: Warum ist die Tuerlaibung nicht automatisch gefliest?**
A: Das entscheidet der Nutzer pro Tuer. Die Schalter `leibungWandGefliest`,
`leibungBodenGefliest`, `sturzGefliest` geben die tatsaechliche Ausfuehrung
wieder. Nicht jede Tuerlaibung wird gefliest.

**Q: Was ist mit Gehrungen, Kanten, Profilen?**
A: Die sind in VOB/C § 0.5 als Stueck-Positionen vorgesehen und werden
in der App ueber eigene Positionen gefuehrt (kategorie 'manschette' oder
manuelle Stueck-Eingabe).

**Q: Warum gibt es eine separate Abdichtungshoehe (AH)?**
A: Abdichtung reicht oft nur bis 2 m (Spritzwasserbereich), waehrend
Fliesen raumhoch gehen. AH und H sind unabhaengige Groeszen.
