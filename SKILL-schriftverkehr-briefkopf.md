# SKILL: Schriftverkehr-Briefkopf — Verbindliche Referenz

## ZWECK

Dieser Skill definiert das exakte Layout der **Startseite fuer Mail und Brief/Post**
im Schriftverkehr-Modul (`tw-schriftverkehr.jsx`). Diese Seite ist die **PDF-nahe
Vorschau** (weisse A4-Seite) und wird identisch fuer beide Kanaele (E-Mail und
Brief/Post) verwendet.

**GILT FUER:** Schriftverkehr-Modul Startseite, Brief-PDF-Generierung,
Mail-Vorschau, alle gedruckten Korrespondenz-Dokumente.

**DESIGN-GRUNDSATZ:** Einheitliches Erscheinungsbild mit dem Rechnungsmodul,
aber mit den hier dokumentierten Abweichungen beim Logo und Layout.

---

## 1. LOGO — ABWEICHUNGEN VOM FIRMENLOGO-SKILL

Das Logo basiert auf dem Firmenlogo-Skill (SKILL-firmenlogo.md), hat aber
folgende **verbindliche Aenderungen** fuer den Schriftverkehr:

### 1.1 "Thomas" — NICHT kursiv, gespreizter

| Eigenschaft | Firmenlogo-Skill (alt) | Schriftverkehr (neu) |
|---|---|---|
| font-style | italic | **normal** (gerade) |
| font-weight | 700 | 700 (unveraendert) |
| letter-spacing | 0.3px | **3px** (Vollansicht) / **1px** (A4-Ansicht) |
| font-size | 14.5px | 14.5px (Vollansicht) / 5.7px (A4-Ansicht) |
| margin-bottom | -18px | **-18px** (Vollansicht) / **-4px** (A4-Ansicht) |

### 1.2 "Fliesenlegermeister e.K." — Gleiche Groesse wie Thomas

| Eigenschaft | Wert |
|---|---|
| font-size | **Identisch zu Thomas** (14.5px Vollansicht / 6px A4) |
| font-style | normal (gerade) — unveraendert |
| font-weight | 600 |
| letter-spacing | 2.5px (Vollansicht) / 1.2px (A4) |
| color | #c41e1e |
| Ausrichtung | rechtsbuendig zur Logo-Breite |

### 1.3 Roter Punkt

| Eigenschaft | Vollansicht | A4-Ansicht |
|---|---|---|
| top | **10px** | **2px** |
| width/height | 11x11px | 4x4px |
| Form | Quadrat (KEIN Kreis) | Quadrat |

### 1.4 "wiLLwacher" — Unveraendert dominant

| Element | Vollansicht | A4-Ansicht |
|---|---|---|
| w / i / wacher | 73px | 28px |
| LL | 95px | 36px |
| Farbe (PDF/weiss) | #111 | #111 |
| -webkit-text-stroke | 0.4px #111 | 0.2px #111 |

---

## 2. SEITENLAYOUT — DIN A4 Briefkopf

### 2.1 Seitenaufbau (von oben nach unten)

```
+-------------------------------------------+
|  LOGO (links)          ADRESSE (rechts)   |
|  Thomas                Flurweg 14a        |
|  wiLLwacher            56472 Nisterau     |
|  Fliesenlegermeister   Tel. 02661-63101   |
|                        Mobil 0170-2024161 |
|                                           |
|  ══════ rote Trennlinie ═══════════════   |
|                                           |
|  Absenderzeile (klein, grau, mit Strich)  |
|                                           |
|  EMPFAENGER (links)    DATUM (rechts)     |
|  Firma/Name            Nisterau, TT.MM.JJ |
|  Strasse                                  |
|  PLZ Ort                                  |
|                                           |
|  Bauvorhaben: [Adresse]                   |
|  Unser Zeichen: [TW/JJJJ-NNN]            |
|                                           |
|  BETREFF (fett, gross)                    |
|                                           |
|  Anrede                                   |
|  Textinhalt...                            |
|  ...                                      |
|                                           |
|  Grussformel                              |
|                                           |
|  Thomas Willwacher                        |
|  Fliesenlegermeister e.K.                 |
|                                           |
|  ══════ rote Trennlinie ═══════════════   |
|  Thomas Willwacher Fliesenlegermeister    |
|  e.K. (rot)                               |
+-------------------------------------------+
```

### 2.2 Kopfbereich: Logo + Adresse

```css
/* Header-Container */
.lh {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1mm;
}

/* Adresse rechts — KLEIN */
.lr {
    text-align: right;
    font-size: 5.5pt;  /* A4-Ansicht */
    color: #555;
    line-height: 1.5;
}
```

### 2.3 Rote Trennlinie

```css
.sep {
    border: none;
    border-top: 1.5px solid #c41e1e;  /* A4 */
    /* Vollansicht: 2.5px solid #c41e1e */
    margin: 1.5mm 0;
}
```

### 2.4 Absenderzeile

```css
.abs-l {
    font-size: 5pt;  /* A4 */
    color: #aaa;
    border-bottom: 0.5px solid #ccc;
    display: inline-block;
    padding-bottom: 1px;
    margin-bottom: 3mm;
}
```

**Inhalt:** `Thomas Willwacher Fliesenlegermeister e.K. · Flurweg 14a · 56472 Nisterau`

### 2.5 Empfaenger + Datum

**WICHTIG:** Rechts steht **NUR das Datum**. Kein "Unser Zeichen", kein "Ihr Zeichen".

```css
.eb {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4mm;
}

/* Empfaenger links */
.en { font-weight: 700; font-size: 9pt; }  /* Name */
.ea { font-size: 8pt; color: #333; line-height: 1.4; }  /* Adresse */

/* Datum rechts */
.dl { font-size: 6pt; color: #999; }  /* Label "Datum" */
.dv { font-size: 8pt; font-weight: 600; }  /* Wert */
```

### 2.6 Bezugszeilen (unterhalb Empfaenger)

**Bauvorhaben** und **Unser Zeichen** stehen LINKS, untereinander:

```css
.bz {
    font-size: 7.5pt;
    color: #555;
    margin-bottom: 3mm;
}
.bz .l {
    display: inline-block;
    width: 28mm;
    color: #888;
}
.bz .v {
    font-weight: 600;
    color: #222;
}
```

```html
<div class="bz">
    <div><span class="l">Bauvorhaben:</span> <span class="v">{bauvorhaben}</span></div>
    <div><span class="l">Unser Zeichen:</span> <span class="v">{unserZeichen}</span></div>
</div>
```

### 2.7 Betreff

```css
.bt {
    font-size: 10pt;
    font-weight: 700;
    margin-bottom: 2mm;
    color: #222;
}
```

### 2.8 Textbereich

```css
.tx {
    font-size: 8.5pt;
    line-height: 1.7;
    color: #333;
    white-space: pre-wrap;
}
```

### 2.9 Grussformel

```css
.gr {
    font-size: 8.5pt;
    color: #333;
    margin-top: 5mm;
}
```

**Inhalt:**
```
Mit freundlichen Gruessen


[4 Leerzeilen fuer Unterschrift]

Thomas Willwacher
Fliesenlegermeister e.K.
```

---

## 3. FUSSZEILE

### 3.1 Aufbau — NUR EINE ZEILE

Die Fusszeile besteht aus:
1. Rote Trennlinie (1.5px solid #c41e1e)
2. **Eine einzige Zeile:** "Thomas Willwacher Fliesenlegermeister e.K." in ROT

**KEINE** Adresse, **KEINE** Telefonnummer, **KEINE** Bankdaten,
**KEINE** Steuernummer in der Fusszeile.

```css
.ft {
    border-top: 1.5px solid #c41e1e;
    padding-top: 2mm;
    font-size: 6pt;
    color: #c41e1e;
    font-weight: 600;
    margin-top: auto;  /* drueckt Fusszeile ans Seitenende */
}
```

```html
<div class="ft">Thomas Willwacher Fliesenlegermeister e.K.</div>
```

---

## 4. MEHRSEITIGE DOKUMENTE

Bei langen Texten werden automatisch Folgeseiten erzeugt:

### 4.1 Folgeseiten-Layout

- **KEIN Logo** auf Folgeseiten
- **KEIN Briefkopf** auf Folgeseiten
- Oben: Seitennummer ("Seite 2 von 3") + Datum + Unser Zeichen
- Text setzt nahtlos fort
- **Fusszeile identisch** auf jeder Seite (rote Linie + Firmenname rot)

### 4.2 Seitenumbruch-Logik

```javascript
// Verfuegbare Texthoehe pro Seite (A4, DIN 5008)
var SEITE_1_TEXTHOEHE = 180; // mm (abzueglich Kopf + Fuss)
var FOLGE_TEXTHOEHE = 240;   // mm (nur Kopfzeile + Fuss)

// Seitenumbruch bei Absaetzen, nicht mitten im Satz
```

---

## 5. VERWENDUNG IN BEIDEN KANAELEN

### 5.1 E-Mail-Kanal

Die Startseite zeigt die PDF-Vorschau als Briefkopf.
Zusaetzliche Felder gegenueber Brief/Post:
- E-Mail-Adresse des Empfaengers
- CC/BCC (aufklappbar)
- Empfaenger-Schnellwahl (AG/BL/Arch E-Mails)

### 5.2 Brief/Post-Kanal

Identische Startseite. Zusaetzliche Felder:
- Versandart (Normal / Einschreiben / Einschreiben Rueckschein / Fax)
- Bilder einfuegen (Foto/Galerie)

### 5.3 Gemeinsam

- Vorlagen-System (VOB-Textbausteine)
- Bauvorhaben + Unser Zeichen
- Betreff + Anrede + Textkoerper + Grussformel
- MicButton fuer Spracheingabe auf allen Textfeldern

---

## 6. CSS-GROESSEN-REFERENZ (Zwei Kontexte)

### Vollansicht (In-App-Bearbeitung, breite Darstellung)

| Element | Groesse |
|---|---|
| Thomas | 14.5px, letter-spacing: 3px, margin-bottom: -18px |
| w / i / wacher | 73px |
| LL | 95px |
| Roter Punkt | 11x11px, top: 10px |
| Fliesenlegermeister | 14.5px, letter-spacing: 2.5px |
| Adresse rechts | 9.5pt |
| Trennlinie | 2.5px |

### A4-Ansicht (Druckvorschau, DIN A4 Proportionen)

| Element | Groesse |
|---|---|
| Thomas | 5.7px, letter-spacing: 1px, margin-bottom: -4px |
| w / i / wacher | 28px |
| LL | 36px |
| Roter Punkt | 4x4px, top: 2px |
| Fliesenlegermeister | 6px, letter-spacing: 1.2px |
| Adresse rechts | 5.5pt |
| Trennlinie | 1.5px |

---

## 7. CHECKLISTE VOR AUSLIEFERUNG

- [ ] Thomas ist NICHT kursiv (font-style: normal)
- [ ] Thomas und Fliesenlegermeister haben gleiche Schriftgroesse
- [ ] Thomas letter-spacing ist gespreizter als Standard
- [ ] Roter Punkt ist Quadrat bei korrekter top-Position
- [ ] LL ist deutlich groesser als w/i/wacher (Verhaeltnis ~1.3:1)
- [ ] Rechts neben Empfaenger steht NUR Datum
- [ ] Bauvorhaben + Unser Zeichen stehen LINKS unter Empfaenger
- [ ] Fusszeile hat NUR "Thomas Willwacher Fliesenlegermeister e.K." in Rot
- [ ] Keine Bankdaten / Adresse / Steuernummer in Fusszeile
- [ ] Absenderzeile (schmal, grau) unter roter Trennlinie vorhanden
- [ ] Mehrseitige Dokumente: Folgeseiten ohne Logo, mit Seitennummer
- [ ] Oswald + Source Sans 3 Fonts geladen
