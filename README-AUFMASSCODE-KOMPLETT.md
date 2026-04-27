# TW Business Suite — Aufmasz-Code-System (KOMPLETT)

**Build:** 20260427-185450
**Datum:** 27.04.2026
**Status:** Skill `SKILL-aufmasscode-system.md` v1.0 ist zu 100% implementiert
inkl. Block E (Verlassen-Schutz + Auto-Resume) und Future Work \u00a714.

---

## Was ist neu seit der letzten Auslieferung?

### Block E (\u00a78) \u2014 jetzt vollst\u00e4ndig

**Vorher:** Warnschild war drin, aber Wiederaufnahme-Dialog hat nicht
auto-getriggert und das Verlassen-Modal beim Modul-Wechsel fehlte.

**Jetzt:**
- **Auto-Trigger Wiederaufnahme-Dialog** (\u00a78.3): Beim Mounten des Raumblatts
  wird via `TWStorage.loadWip` gepr\u00fcft, ob ein WIP existiert. 1.5 s
  Verz\u00f6gerung l\u00e4sst dem globalen Akte-Modal-System Vorrang \u2014 kein
  Doppel-Modal-Konflikt.
- **Verlassen-Schutz beim Modul-Wechsel** (\u00a78.5): `navigateTo` in `tw-app.jsx`
  pr\u00fcft `window.__aufmassDirty` (gesetzt vom Raumblatt). Wenn man aus
  Aufmasz rausnavigiert UND Daten ungespeichert sind, kommt ein
  Confirm-Dialog. Funktioniert f\u00fcr Start/Modulwahl/Akte/Rechnung etc.
  \u2014 alle Ziele.
- **Dirty-Doublette entfernt:** `aufmassDirty` als separater State ist weg.
  Der bestehende `hasUnsavedChanges`-useEffect erfasst eh schon alle
  relevanten States (masse, wandMasse, tueren, fenster, abzuege, posCards,
  posRechenwegEdits, phasenFotos, objektFotos) \u2014 das ist die fl\u00e4chendeckende
  Dirty-Erkennung. Eine Quelle der Wahrheit, keine Doppelpflege.

### Future Work \u00a714 \u2014 alle vier Punkte gel\u00f6st

**1. Code-Validator-Badge in der Daten-Uebersicht**
- Read-Mode der Code-Spalte: Bei leerem Code erscheint ein roter Punkt
  (\u00b7) statt des bisherigen Em-Dash. Sofort erkennbar, welche Positionen
  noch keinen Code haben.

**2. Bulk-Edit + Heuristik-Auto-Zuweisung**
- Toolbar oben in der Positionen-Tab mit zwei Buttons:
  - \u270B **Heuristik**: Lokal, schnell. Schl\u00e4gt Codes basierend auf
    Bezeichnung+Einheit vor (z.B. "Wandfliesen" + m\u00b2 \u2192 W).
  - \u270B **KI-Codes**: Schickt offene Positionen an Gemini Pro, der
    pro Position einen Code vorschl\u00e4gt.
- Beide Buttons \u00f6ffnen ein **Vorschlag-Modal**: Tabelle mit Pos-Nr,
  vorgeschlagener Code, Bezeichnung, Einheit. Einzelne Vorschl\u00e4ge per
  X-Button rauswerfen, dann mit einem Klick alle uebrigen uebernehmen.
- Bestehende Codes werden nie ueberschrieben \u2014 nur leere Felder
  werden ausgef\u00fcllt.

**3. KI-Auto-Vorbelegung** (Punkt 2 oben \u2014 siehe KI-Button)
- Nutzt `window.callGeminiAPI(messages, maxTokens, options)` mit
  `options.model = 'pro'`.
- Robuste JSON-Extraktion (Gemini liefert manchmal Markdown-Backticks).
- Validiert die Codes gegen die 9-Code-Liste.

**4. Code-Histogram**
- Mini-Histogram in der Toolbar oben in der Daten-Uebersicht.
- Anzeige: "X/Y gesetzt" + "Z offen" + Aufschl\u00fcsselung pro Code
  ("W: 3, B: 2, AS: 1, ...").
- Pragmatischer Ort als das KI-Akte-Modal: Hier sieht der User es im
  t\u00e4glichen Workflow direkt vor Augen.

### Source-Drift-Reparatur (vom letzten Build)

`StatusPill`, `ToolbarButton`, `ToolbarRow` sind weiterhin als sauberes
JSX in `tw-shared-components.jsx`. Die Source ist selbsttragend.

---

## Was ist im ZIP?

| Datei | Aenderungen |
|-------|-------------|
| `index.html` | **Frisch gebaut** \u2014 Build 20260427-185450 |
| `tw-aufmass.jsx` | Aufmasscode-System + Quick-Edit + Foto-Persistenz + Warnschild + **Auto-Resume** + **window.__aufmassDirty Setter** |
| `tw-app.jsx` | + **Verlassen-Schutz in navigateTo** |
| `tw-daten-uebersicht.jsx` | + **Validator-Punkt** + **Heuristik** + **KI-Vorbelegung** + **Bulk-Modal** + **Histogram-Toolbar** |
| `tw-shared-components.jsx` | StatusPill/ToolbarButton/ToolbarRow als sauberes JSX (Source-Drift-Fix bleibt drin) |
| `README-AUFMASSCODE-KOMPLETT.md` | Diese Datei |

---

## Verifikation in der Browser-Console

```javascript
// 1) Pre-Render-Check sollte alle Komponenten als 'function' zeigen
window.__twSentinel.preRenderCheck

// 2) Aufmasz-Dirty-Setter ist verfuegbar (nur wenn man im Raumblatt ist)
typeof window.__aufmassDirty  // → 'function' im Raumblatt, sonst 'undefined'

// 3) Aufmasz-Code-Resolver ist im Bundle
typeof resolveAufmassCode  // → 'undefined' (lokal in Raumblatt-Component)

// 4) Build-Stempel
console.log('Build sollte zeigen:', '20260427-185450');
```

---

## Test-Plan

### Block E
1. Im Raumblatt eine Eingabe machen (z.B. Wandmass eintragen) \u2192
   Warnschild oben rechts erscheint.
2. Auf "Modulwahl" oder "Start" klicken \u2192 **Confirm-Dialog** muss kommen.
3. Browser-Reload, dann zur\u00fcck zu dem Kunden \u2192 in Aufmasz nach 1.5 s
   sollte **Wiederaufnahme-Dialog** kommen (wenn ein WIP gespeichert war).

### Future Work
1. In der Daten-Uebersicht, Tab "Positionen": Toolbar oben sieht
   Statistik ("X/Y gesetzt") und zwei Buttons.
2. Im Read-Mode bei einer Position ohne Code: kleiner roter Punkt
   in der Code-Spalte.
3. Klick auf **Heuristik** \u2192 Modal \u00f6ffnet sich mit Vorschl\u00e4gen.
4. Klick auf **KI-Codes** \u2192 Gemini analysiert (braucht ~5-10 s),
   Modal mit Vorschl\u00e4gen.
5. Im Modal: einzelne Vorschl\u00e4ge entfernen mit X, dann
   "X Code(s) uebernehmen" \u2192 Codes sind in der Position-Tabelle.

---

## Architektur-Hinweise

### Verlassen-Schutz: Warum `window.__aufmassDirty` als globale Funktion?

Alternative w\u00e4re ein React-Context oder ein TW.EventBus-Listener gewesen.
Beide bringen Komplexit\u00e4t. Der globale Function-Setter ist:
- Selbsterkl\u00e4rend in 5 Zeilen Code
- Kein zus\u00e4tzlicher React-Context-Provider n\u00f6tig
- Beim Unmount automatisch aufger\u00e4umt
- Funktioniert mit der bestehenden funktionalen `navigateTo`-Architektur

### Heuristik-Regeln in Stichworten

```
Stueck/Stck/St                 → St
Sockel + Abdichtung            → AS
Sockel                         → S
Verbundabdichtung + Wand       → AW
Verbundabdichtung + Boden      → AB
Wandflies* / Wand+Flies + m\u00b2  → W
Bodenflies* / Boden+Flies + m\u00b2 → B
m/lfm + Schiene/Profil/Eck     → M
m/lfm + Umfang                 → MU
generic Wand + m\u00b2             → W
generic Boden + m\u00b2            → B
sonst                          → '' (kein Vorschlag)
```

Die Heuristik ist intentional konservativ: lieber kein Vorschlag als
ein falscher. F\u00fcr unsichere F\u00e4lle ist die KI-Variante da.

### KI-Prompt-Design

Der Prompt schickt ALLE 9 Codes als Tabelle mit Beschreibung an Gemini.
Erwartete Antwort: striktes JSON `{vorschlaege: [{idx, code}, ...]}`.
Bei unsicheren F\u00e4llen soll die KI die Position weglassen \u2014 das
verhindert "creative" falsche Codes.

---

## Bekannte Einschr\u00e4nkungen / Out-of-Scope

- Der Auto-Trigger des Wiederaufnahme-Dialogs greift nur, wenn der State
  beim Mounten "leer" wirkt (keine posCards, keine wandMasse, keine
  Raum-Masse). Falls jemand mit einem reEdit-State direkt einsteigt und
  parallel ein WIP existiert, wird der Dialog nicht gezeigt \u2014 was
  korrekt ist (reEdit-State ist autoritativer).
- Die Heuristik kennt keine projekt-spezifischen Begriffe (z.B. firmen-
  interne Bezeichnungen). Daf\u00fcr ist die KI-Variante da.
- Das Code-Histogram zeigt absolute Zahlen, kein relatives Balken-Chart.
  Falls das gew\u00fcnscht wird, kann man `codeStatistik.perCode` zu
  einem `<svg>`-Diagramm ausbauen.

---

**Skill `SKILL-aufmasscode-system.md` v1.0 ist hiermit zu 100 % geliefert.**
