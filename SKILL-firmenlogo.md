---
name: firmenlogo
description: >
  Verbindliche pixelgenaue Spezifikation des Firmenlogos "Thomas Willwacher Fliesenlegermeister e.K."
  fuer die TW Business Suite. Definiert das 3-zeilige Logo (Zeile 1 "Thomas" rot/kursiv klein,
  Zeile 2 "willwacher" gross mit doppeltem LL, Zeile 3 "Fliesenlegermeister" rot), alle genauen
  Abstaende, Schriftgroessen, Farben, den roten Punkt auf dem i, und alle Skalierungen (large vs small).
  Diese Referenz gilt fuer ALLE Ausgaben: React-FirmenLogo-Komponente auf Startseiten und Modulwahl,
  HTML-Logo in Rechnungen/Angeboten/Nachtraegen, jsPDF-Logo im Rechnungs- und Schriftverkehrsmodul,
  und die Baustellen-App. Nutze diesen Skill IMMER wenn der User nach Firmenlogo, Briefkopf-Logo,
  Willwacher-Logo, "Thomas"-Zeile, "wacher"-Zeile, Fliesenlegermeister-Schriftzug, rotem Punkt auf i,
  Logo-Skalierung, Logo-Positionierung, Logo-Farben, oder Logo-Schriftarten fragt. Auch triggern bei:
  "Logo ist falsch", "Logo zu klein", "Logo im PDF anders", "neues Logo entwerfen",
  "Briefkopf-Logo aendern", "Logo auf Startseite". Das Logo darf NIEMALS veraendert, verkleinert,
  ersetzt oder weggelassen werden — nur die beiden erlaubten Groessen (large/small).
---

# SKILL: Firmenlogo Thomas Willwacher — Verbindliche Referenz

## ZWECK
Dieser Skill definiert das Firmenlogo der Firma **Thomas Willwacher Fliesenlegermeister e.K.**
pixelgenau und verbindlich. JEDE Darstellung des Logos — ob in der App (React-Komponente),
in PDF-Dokumenten (HTML-String), in Rechnungen, Briefköpfen, Schriftverkehr oder der
Baustellen-App — MUSS sich exakt an diese Spezifikation halten.

**HEILIGE REGEL:** Das Logo darf NIEMALS verkleinert, verändert, durch Alternativen ersetzt
oder weggelassen werden. Die einzige erlaubte Skalierung erfolgt über den `size`-Parameter
(`large` vs `small`).

---

## 1. LOGO-AUFBAU (3 Zeilen)

Das Logo besteht aus exakt **3 Zeilen**, linksbündig angeordnet:

```
Zeile 1:  Thomas                          ← rot, kursiv, klein
Zeile 2:  w·LLwacher                      ← schwarz/weiß, Oswald bold, groß
Zeile 3:        Fliesenlegermeister e.K.  ← rot, rechtsbündig zur Zeile 2
```

### Zeile 1: "Thomas"
- **Schrift:** `Source Sans 3`, serif-Fallback
- **Stil:** italic (kursiv), font-weight 700
- **Farbe:** ROT `#c41e1e` (CSS-Variable: `var(--accent-red)`)
- **Größe:** 14.5px (App large), 13px (PDF)
- **Position:** Links oben, leicht links bündig mit dem "w" von Zeile 2
- **margin-bottom:** -18px (überlappt leicht in Zeile 2 hinein)
- **padding-left:** 1px
- **z-index:** 2 (liegt ÜBER Zeile 2)

### Zeile 2: "wiLLwacher" — DAS KERNSTÜCK
Die Zeile besteht aus **4 separaten Elementen** auf einer Baseline:

#### Element 2a: "w" (kleines w)
- **Schrift:** Oswald, bold (700)
- **Farbe (App, dunkler Hintergrund):** `var(--text-white)` → `#f0f2f5`
- **Farbe (Druck/PDF, weißer Hintergrund):** `#111111` (schwarz)
- **Größe:** 62px (App large), 52px (PDF)

#### Element 2b: "ı" (türkisches dotless-i) + roter Punkt
Dieses Element ist ein **Wrapper** mit zwei Kindern:
1. **Das "ı"** (Unicode `\u0131`, türkisches kleines i ohne Punkt)
   - Schrift: Oswald, bold (700)
   - Farbe: gleich wie "w" (weiß in App, schwarz in PDF)
   - Größe: 62px (App large), 52px (PDF)
2. **Der rote Quadrat-Punkt** (KEIN Kreis, KEIN Emoji!)
   - **Form:** Quadrat (gleiche Breite und Höhe)
   - **Farbe:** ROT `#c41e1e` (`var(--accent-red)`)
   - **Größe:** 10×10px (App large), 8×8px (PDF)
   - **Position:** absolute, `top: 6px` (App) / `top: 5px` (PDF)
   - **Zentrierung:** `left: 50%; transform: translateX(-50%)` — exakt mittig über dem "ı"
   - **WICHTIG:** Dies ist ein `<span>` oder `<div>` mit `background: #c41e1e`, NICHT:
     - ❌ Kein CSS border-radius (es ist ein QUADRAT, kein Kreis)
     - ❌ Kein Emoji-Punkt
     - ❌ Kein `content: '.'` Pseudo-Element
     - ❌ Kein SVG

#### Element 2c: "LL" (zwei große L)
- **Schrift:** Oswald, bold (700)
- **Farbe:** gleich wie "w" und "ı"
- **Größe:** 84px (App large), 68px (PDF) — **deutlich größer als die restlichen Buchstaben!**
- **letter-spacing:** 1px
- **line-height:** 0.75 (damit das LL nicht zu viel vertikalen Platz einnimmt)
- **KRITISCH:** Das LL MUSS sichtbar größer sein als w, ı und wacher. Verhältnis ca. 1.35:1

#### Element 2d: "wacher"
- **Schrift:** Oswald, bold (700)
- **Farbe:** gleich wie "w" und "ı"
- **Größe:** 62px (App large), 52px (PDF)

**Gesamtzeile 2 Container:**
- `display: flex`
- `align-items: baseline` (NICHT center! Baseline ist entscheidend für das LL)
- `font-family: 'Oswald', sans-serif`
- `font-weight: 700`
- `line-height: 1`

### Zeile 3: "Fliesenlegermeister e.K."
- **Schrift:** `Source Sans 3`, sans-serif
- **Stil:** normal (NICHT kursiv), font-weight 600
- **Farbe:** ROT `#c41e1e` (`var(--accent-red)`)
- **Größe:** 14.5px (App large), 13px (PDF)
- **letter-spacing:** 2.5px (App), 2px (PDF)
- **Ausrichtung:** RECHTSBÜNDIG innerhalb der Logo-Breite
  - Container: `display: flex; justify-content: flex-end; width: 100%`
- **margin-top:** 1px

---

## 2. FARB-REGELN (ZWEI KONTEXTE)

### Kontext A: App (dunkler Hintergrund)
| Element | Farbe | Wert |
|---------|-------|------|
| "Thomas" | Rot | `var(--accent-red)` = `#c41e1e` |
| "wiLLwacher" | Weiß/Hell | `var(--text-white)` = `#f0f2f5` |
| Roter Punkt | Rot | `var(--accent-red)` = `#c41e1e` |
| "Fliesenlegermeister e.K." | Rot | `var(--accent-red)` = `#c41e1e` |
| Adresszeile | Gedämpft | `var(--text-muted)` = `#8a9ab4` |
| "Business Suite" | Blau | `var(--accent-blue)` = `#4da6ff` |

### Kontext B: Druck/PDF (weißer Hintergrund)
| Element | Farbe | Wert |
|---------|-------|------|
| "Thomas" | Rot | `#c41e1e` |
| "wiLLwacher" | **SCHWARZ** | `#111111` |
| Roter Punkt | Rot | `#c41e1e` |
| "Fliesenlegermeister e.K." | Rot | `#c41e1e` |
| Adresszeile | Grau | `#555555` |

**KERNREGEL:** Alles was in der App **weiß/hell** ist (`#f0f2f5`), wird im Druck/PDF **schwarz** (`#111`).
Die roten Elemente bleiben in BEIDEN Kontexten identisch rot (`#c41e1e`).

---

## 3. GRÖßEN-VARIANTEN

### 3.1 App — `size="large"` (Startseiten)
```
"Thomas":              14.5px, Source Sans 3, italic, bold
"w", "ı", "wacher":   62px, Oswald, bold
"LL":                  84px, Oswald, bold
Roter Punkt:           10×10px
"Fliesenlegermeister": 14.5px, Source Sans 3, semibold
```

### 3.2 App — `size="small"` (Modulwahl, Unterseiten)
Identisch, aber der gesamte Container wird mit `transform: scale(0.55)` skaliert.
- `transformOrigin: 'center'`
- Keine einzelnen Werte ändern — nur skalieren!

### 3.3 PDF-Dokumente (Rechnungen, Briefe, Angebote)
```
"Thomas":              13px, Source Sans 3, italic, bold
"w", "ı", "wacher":   52px, Oswald, bold  (Farbe: #111!)
"LL":                  68px, Oswald, bold  (Farbe: #111!)
Roter Punkt:           8×8px
"Fliesenlegermeister": 13px, Source Sans 3, semibold
```

### 3.4 Desktop / große Bildschirme (min-width: 768px)
```
"Thomas":              17px
"w", "ı", "wacher":   76px
"LL":                  102px
Roter Punkt:           12×12px
"Fliesenlegermeister": 18px, letter-spacing: 3px
```

---

## 4. REACT-KOMPONENTE (App-Version)

Die kanonische React-Komponente in `tw-shared-components.jsx`:

```jsx
function FirmenLogo({ size = 'large' }) {
    const scale = size === 'small' ? 0.55 : 1;
    return (
        <div className="logo-container" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
            {/* Zeile 1: "Thomas" rot kursiv */}
            <div className="logo-thomas-row">
                <span className="logo-thomas-text">Thomas</span>
            </div>

            {/* Zeile 2: "wiLLwacher" */}
            <div className="logo-word-row">
                <span className="logo-w">w</span>
                <span className="logo-i-wrap">
                    <span className="logo-i-char">{'\u0131'}</span>
                    <span className="logo-i-dot"></span>
                </span>
                <span className="logo-LL">LL</span>
                <span className="logo-wacher">wacher</span>
            </div>

            {/* Zeile 3: "Fliesenlegermeister e.K." rot rechtsbündig */}
            <div className="logo-subtitle-row">
                <span className="logo-subtitle-text">Fliesenlegermeister e.K.</span>
            </div>
        </div>
    );
}
```

**Zugehörige CSS-Klassen** (in `tw-design.css`):

```css
.logo-container {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    user-select: none;
}

.logo-thomas-row {
    display: flex;
    align-items: baseline;
    margin-bottom: -18px;
    padding-left: 1px;
    align-self: flex-start;
    position: relative;
    z-index: 2;
}

.logo-thomas-text {
    font-family: 'Source Sans 3', serif;
    font-style: italic;
    font-weight: 700;
    color: var(--accent-red);       /* #c41e1e */
    font-size: 14.5px;
    letter-spacing: 0.3px;
}

.logo-word-row {
    display: flex;
    align-items: baseline;
    font-family: 'Oswald', sans-serif;
    font-weight: 700;
    color: var(--text-white);       /* #f0f2f5 — wird im PDF zu #111 */
    line-height: 1;
}

.logo-w { font-size: 62px; }

.logo-i-wrap {
    position: relative;
    font-size: 62px;
    display: inline-block;
}

.logo-i-wrap .logo-i-char { font-size: 62px; }

.logo-i-dot {
    position: absolute;
    top: 6px;
    left: 50%;
    transform: translateX(-50%);
    width: 10px;
    height: 10px;
    background: var(--accent-red);  /* #c41e1e */
    /* KEIN border-radius! Es ist ein QUADRAT */
}

.logo-LL {
    font-size: 84px;
    letter-spacing: 1px;
    line-height: 0.75;
}

.logo-wacher { font-size: 62px; }

.logo-subtitle-row {
    display: flex;
    justify-content: flex-end;
    width: 100%;
    margin-top: 1px;
}

.logo-subtitle-text {
    font-family: 'Source Sans 3', sans-serif;
    font-weight: 600;
    color: var(--accent-red);       /* #c41e1e */
    font-size: 14.5px;
    letter-spacing: 2.5px;
}

/* Desktop Breakpoint */
@media (min-width: 768px) {
    .logo-thomas-text { font-size: 17px; }
    .logo-w, .logo-i-wrap, .logo-i-wrap .logo-i-char, .logo-wacher { font-size: 76px; }
    .logo-LL { font-size: 102px; }
    .logo-i-dot { width: 12px; height: 12px; top: 7px; }
    .logo-subtitle-text { font-size: 18px; letter-spacing: 3px; }
}
```

---

## 5. PDF/DRUCK-VERSION (HTML-String)

Für Rechnungen, Briefe, Angebote und alle gedruckten Dokumente wird das Logo
als HTML-String in den `<style>`- und `<body>`-Bereich eingefügt:

### CSS-Klassen (kompakt für PDF):
```javascript
// Logo-Styles für PDF (weißer Hintergrund → schwarz statt weiß!)
h += '.lc{display:inline-flex;flex-direction:column;align-items:flex-start}';
h += '.lt{font-family:"Source Sans 3",serif;font-style:italic;font-weight:700;color:#c41e1e;font-size:13px;margin-bottom:-14px;padding-left:1px;position:relative;z-index:2}';
h += '.lw{display:flex;align-items:baseline;font-family:"Oswald",sans-serif;font-weight:700;color:#111;line-height:1}';
h += '.lw .w{font-size:52px}';
h += '.lw .iw{position:relative;font-size:52px;display:inline-block}';
h += '.lw .iw .ic{font-size:52px;color:#111}';
h += '.lw .iw .id{position:absolute;top:5px;left:50%;transform:translateX(-50%);width:8px;height:8px;background:#c41e1e}';
h += '.lw .ll{font-size:68px;letter-spacing:1px;line-height:0.75}';
h += '.lw .wa{font-size:52px}';
h += '.ls{display:flex;justify-content:flex-end;width:100%;margin-top:1px}';
h += '.ls span{font-family:"Source Sans 3",sans-serif;font-weight:600;color:#c41e1e;font-size:13px;letter-spacing:2px}';
```

### HTML-Struktur (Logo-Block):
```javascript
h += '<div class="lh"><div class="lc">';
h += '<div class="lt">Thomas</div>';
h += '<div class="lw">';
h += '<span class="w">w</span>';
h += '<span class="iw"><span class="ic">\u0131</span><span class="id"></span></span>';
h += '<span class="ll">LL</span>';
h += '<span class="wa">wacher</span>';
h += '</div>';
h += '<div class="ls"><span>Fliesenlegermeister e.K.</span></div>';
h += '</div>';
h += '<div class="lr">Flurweg 14a<br>56472 Nisterau<br>Tel. 02661-63101<br>Mobil 0170-2024161</div>';
h += '</div>';
```

### PDF-Header-Layout:
```
.lh = Logo-Header: display:flex, justify-content:space-between, align-items:flex-start
.lc = Logo-Container (links): inline-flex, column
.lt = "Thomas" (rot kursiv)
.lw = "wiLLwacher" Zeile (schwarz, Oswald)
  .w  = "w"
  .iw = "ı" Wrapper
    .ic = "ı" Zeichen
    .id = roter Quadrat-Punkt
  .ll = "LL"
  .wa = "wacher"
.ls = "Fliesenlegermeister e.K." (rot, rechts)
.lr = Kontaktdaten (rechts, grau): Flurweg 14a / 56472 Nisterau / Tel / Mobil
```

---

## 6. ZUSÄTZLICHE ELEMENTE UNTER DEM LOGO

### Adresszeile (nur auf Startseiten)
```
Flurweg 14a · 56472 Nisterau · Tel. 02661-63101
```
- Klasse: `.logo-address`
- Schrift: Source Sans 3, normal (400)
- Farbe: `var(--text-muted)` / `#8a9ab4`
- Größe: 12px
- letter-spacing: 0.5px
- margin-top: 10px
- Zentriert (`text-align: center; width: 100%`)

### "Business Suite" Badge (nur Hauptstartseite)
```
BUSINESS SUITE
```
- Farbe: `var(--accent-blue)` / `#4da6ff`
- Größe: 13px
- font-weight: 700
- letter-spacing: 2px
- text-transform: uppercase
- margin-top: 8px

---

## 7. GOOGLE FONTS — PFLICHT-IMPORTS

Diese beiden Schriften MÜSSEN in JEDEM Dokument geladen sein:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap" rel="stylesheet">
```

**Für PDF-Erzeugung (html2pdf.js o.ä.):** Schriften müssen VORHER geladen sein,
sonst fällt das Logo auf System-Fonts zurück. Prüfung:
```javascript
await document.fonts.ready; // Warten bis Oswald + Source Sans 3 geladen
```

---

## 8. CHECKLISTE FÜR CLAUDE — VOR JEDER AUSLIEFERUNG

Bevor ein Modul oder Dokument mit Logo ausgeliefert wird, diese Punkte prüfen:

- [ ] **"Thomas"** ist kursiv, rot (#c41e1e), Source Sans 3
- [ ] **"ı"** ist Unicode `\u0131` (dotless i), NICHT normales "i"
- [ ] **Roter Punkt** ist ein QUADRAT (kein Kreis!), 10×10px (App) oder 8×8px (PDF)
- [ ] **"LL"** ist deutlich größer als die restlichen Buchstaben (84px vs 62px App, 68px vs 52px PDF)
- [ ] **"Fliesenlegermeister e.K."** ist RECHTSBÜNDIG zum Logo-Text
- [ ] **Farbe auf weißem Hintergrund (PDF):** wiLLwacher = `#111` (schwarz), NICHT weiß
- [ ] **Farbe auf dunklem Hintergrund (App):** wiLLwacher = `var(--text-white)` / `#f0f2f5`
- [ ] **Rote Elemente** sind in BEIDEN Kontexten identisch: `#c41e1e`
- [ ] **Oswald** und **Source Sans 3** Fonts sind geladen
- [ ] Logo wurde NICHT verkleinert (nur `size="small"` mit scale 0.55 ist erlaubt)
- [ ] Logo wurde NICHT durch ein Bild, SVG-Export oder Screenshot ersetzt
- [ ] Kein `type="number"` Input irgendwo auf der Seite (generelle TW-Regel)

---

## 9. BEKANNTE FEHLERQUELLEN

1. **Babel/UTF-8:** Das Unicode-Zeichen `\u0131` MUSS als Escape-Sequenz geschrieben werden,
   NICHT als rohes Zeichen `ı` im JSX. Sonst Babel-Kompilierungsfehler bei `fetch()`.

2. **PDF-Font-Loading:** Wenn Oswald nicht geladen ist, zeigt der Browser eine
   Fallback-Schrift und das Logo sieht komplett anders aus. Immer `await document.fonts.ready`.

3. **Scale vs. Font-Size:** Bei `size="small"` werden NICHT die Font-Sizes geändert,
   sondern der Container per `transform: scale(0.55)` verkleinert. Das erhält alle Proportionen.

4. **Punkt-Position:** Der rote Punkt sitzt bei `top: 6px` (App) / `top: 5px` (PDF).
   Bei falscher Position wandert der Punkt in den "Thomas"-Text oder verschwindet unter der Baseline.

5. **baseline-Alignment:** Die logo-word-row MUSS `align-items: baseline` haben.
   Bei `center` oder `flex-end` stimmen die Proportionen zwischen LL und den kleineren
   Buchstaben nicht mehr.

---

## 10. FIRMENDATEN (für Briefköpfe und Fußzeilen)

```
Thomas Willwacher Fliesenlegermeister e.K.
Flurweg 14a
56472 Nisterau
Tel. 02661-63101
Mobil 0170-2024161
```

**Absenderzeile (einzeilig für Briefe):**
```
Thomas Willwacher Fliesenlegermeister e.K. · Flurweg 14a · 56472 Nisterau
```

**Trennlinie nach dem Header:**
- `border-top: 2px solid #c41e1e` (rote Linie, passend zum Logo)
- `margin: 3mm 0`
