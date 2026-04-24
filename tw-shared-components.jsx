        const { useState, useEffect, useCallback, useRef } = React;

        /* ═══════════════════════════════════════════
           LEICA DISTO – Bluetooth Tastatur-Modus
           DISTO am Geraet auf "Text" oder "Tabelle" stellen,
           dann per Bluetooth mit Handy/Tablet koppeln.
           Der DISTO tippt Messwerte wie eine Tastatur.
           ═══════════════════════════════════════════ */
        const LaserManager = {
            active: false,
            onStatusChange: null,

            activate() {
                this.active = true;
                if (this.onStatusChange) this.onStatusChange('active');
            },
            deactivate() {
                this.active = false;
                if (this.onStatusChange) this.onStatusChange('inactive');
            },
            isSupported() { return true; }
        };

        /* ═══════════════════════════════════════════
           HELPER: Format mass values to 3 decimals
           ═══════════════════════════════════════════ */
        const formatMass = (val) => {
            if (!val && val !== 0) return '';
            const n = parseFloat(String(val).replace(',','.'));
            if (isNaN(n)) return String(val);
            return n.toFixed(3).replace('.', ',');
        };

        const parseMass = (v) => {
            const n = parseFloat(String(v).replace(',','.'));
            return isNaN(n) ? 0 : n;
        };

        const handleBlurFormat = (setter, field) => (e) => {
            const val = e.target.value;
            if (val && !isNaN(parseFloat(val.replace(',','.')))) {
                if (typeof field === 'string') {
                    setter(prev => ({...prev, [field]: formatMass(val)}));
                } else {
                    setter(formatMass(val));
                }
            }
        };

        // Short German number format: 3.456 → "3,456"
        const fmtDe = (n) => (typeof n === 'number' ? n.toFixed(3) : parseFloat(n).toFixed(3)).replace('.', ',');
        // Formel-Parser: Wertet Rechenausdruecke aus wie "3,45+2,10+3,45+2,10" oder "4*1,95"
        const parseFormel = (str) => {
            if (!str || !str.trim()) return 0;
            try {
                let expr = str.replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/');
                expr = expr.replace(/[^0-9+\-*/.() ]/g, '');
                if (!expr.trim()) return 0;
                const result = new Function('return ' + expr)();
                return (typeof result === 'number' && !isNaN(result)) ? Math.round(result * 10000) / 10000 : 0;
            } catch(e) { return 0; }
        };

        /* ═══════════════════════════════════════════
           DEMO DATA – Baustellen-Ordner
           ═══════════════════════════════════════════ */
        // ═══ Keine Demo-Kunden mehr -- nur echte Baustellen aus Google Drive ═══
        const DEMO_KUNDEN = [];

        // ═══ Lokal gespeicherte Kunden aus localStorage laden ═══
        function getGespeicherteKunden() {
            var kunden = [];
            try {
                var keys = Object.keys(localStorage);
                for (var i = 0; i < keys.length; i++) {
                    if (keys[i].indexOf('aufmass_kunde_') === 0) {
                        try {
                            var data = JSON.parse(localStorage.getItem(keys[i]));
                            if (data && data.name) {
                                kunden.push(data);
                            }
                        } catch(e) {}
                    }
                }
            } catch(e) {}
            return kunden;
        }

        /* ═══════════════════════════════════════════
           LV-POSITIONEN (werden aus KI-Analyse befuellt)
           ═══════════════════════════════════════════ */
        const LV_POSITIONEN = {
            'k001': [
                // === BEREICH EG ===
                { pos: '1.01', bez: 'Bodenfliesen 30×60 liefern u. verlegen', einheit: 'm²', menge: 45.00, bereich: 'EG', kategorie: 'boden', tags: ['boden','fliese','verlegen'] },
                { pos: '1.02', bez: 'Wandfliesen 30×60 liefern u. verlegen', einheit: 'm²', menge: 120.00, bereich: 'EG', kategorie: 'wand', tags: ['wand','fliese','verlegen'] },
                { pos: '1.03', bez: 'Fliesensockel liefern u. verlegen, h=10cm', einheit: 'm', menge: 35.00, bereich: 'EG', kategorie: 'sockel', tags: ['sockel','verlegen'] },
                { pos: '1.04', bez: 'Bodenfliesen 60×60 liefern u. verlegen', einheit: 'm²', menge: 14.00, bereich: 'EG', kategorie: 'boden', tags: ['boden','fliese','verlegen','großformat'] },
                { pos: '1.05', bez: 'Fliesenspiegel 10×10 liefern u. verlegen', einheit: 'm²', menge: 6.00, bereich: 'EG', kategorie: 'wand', tags: ['wand','fliese','spiegel','küche'] },
                { pos: '1.06', bez: 'Verbundabdichtung Boden herstellen', einheit: 'm²', menge: 18.00, bereich: 'EG', kategorie: 'abdichtung', tags: ['abdichtung','boden'] },
                { pos: '1.07', bez: 'Verbundabdichtung Wand herstellen', einheit: 'm²', menge: 30.00, bereich: 'EG', kategorie: 'abdichtung', tags: ['abdichtung','wand'] },
                { pos: '1.08', bez: 'Dichtband in Verbundabdichtung einarbeiten', einheit: 'm', menge: 25.00, bereich: 'EG', kategorie: 'abdichtung', tags: ['abdichtung','dichtband'] },
                { pos: '1.09', bez: 'Dichtmanschette für Wanddurchführung', einheit: 'Stk', menge: 8.00, bereich: 'EG', kategorie: 'abdichtung', tags: ['abdichtung','manschette'] },
                { pos: '1.10', bez: 'Eckschutzschienen Edelstahl liefern u. verlegen', einheit: 'm', menge: 12.00, bereich: 'EG', kategorie: 'schiene', tags: ['schiene','eck','edelstahl'] },
                { pos: '1.11', bez: 'Abschlussprofil Edelstahl liefern u. verlegen', einheit: 'm', menge: 8.00, bereich: 'EG', kategorie: 'schiene', tags: ['schiene','abschluss','edelstahl'] },
                { pos: '1.12', bez: 'Silikonverfugung Sanitär (Anschlussfugen)', einheit: 'm', menge: 40.00, bereich: 'EG', kategorie: 'silikon', tags: ['silikon','fuge','sanitär'] },
                { pos: '1.13', bez: 'Bodengleiche Duschrinne einbauen', einheit: 'Stk', menge: 1.00, bereich: 'EG', kategorie: 'einbau', tags: ['dusche','rinne','einbau'] },
                { pos: '1.14', bez: 'Gefälleestrich für bodengl. Dusche herstellen', einheit: 'm²', menge: 3.00, bereich: 'EG', kategorie: 'estrich', tags: ['estrich','gefälle','dusche'] },
                { pos: '1.15', bez: 'Entkopplungsmatte verlegen', einheit: 'm²', menge: 45.00, bereich: 'EG', kategorie: 'entkopplung', tags: ['entkopplung','boden'] },
                { pos: '1.16', bez: 'Verfugung Boden', einheit: 'm²', menge: 45.00, bereich: 'EG', kategorie: 'verfugung', tags: ['verfugung','boden'] },
                { pos: '1.17', bez: 'Verfugung Wand', einheit: 'm²', menge: 120.00, bereich: 'EG', kategorie: 'verfugung', tags: ['verfugung','wand'] },
                { pos: '1.18', bez: 'Deckenfliesen verlegen', einheit: 'm²', menge: 8.00, bereich: 'EG', kategorie: 'decke', tags: ['decke','fliese'] },
                { pos: '1.19', bez: 'Naturstein-Fensterbank liefern u. verlegen', einheit: 'Stk', menge: 4.00, bereich: 'EG', kategorie: 'fensterbank', tags: ['fensterbank','naturstein'] },
                // === BEREICH OG ===
                { pos: '2.01', bez: 'Bodenfliesen 30×60 liefern u. verlegen', einheit: 'm²', menge: 38.00, bereich: 'OG', kategorie: 'boden', tags: ['boden','fliese','verlegen'] },
                { pos: '2.02', bez: 'Wandfliesen 30×60 liefern u. verlegen', einheit: 'm²', menge: 95.00, bereich: 'OG', kategorie: 'wand', tags: ['wand','fliese','verlegen'] },
                { pos: '2.03', bez: 'Fliesensockel liefern u. verlegen, h=10cm', einheit: 'm', menge: 28.00, bereich: 'OG', kategorie: 'sockel', tags: ['sockel','verlegen'] },
                { pos: '2.04', bez: 'Bodenfliesen 60×60 liefern u. verlegen', einheit: 'm²', menge: 8.00, bereich: 'OG', kategorie: 'boden', tags: ['boden','fliese','verlegen','großformat'] },
                { pos: '2.05', bez: 'Verbundabdichtung Boden herstellen', einheit: 'm²', menge: 14.00, bereich: 'OG', kategorie: 'abdichtung', tags: ['abdichtung','boden'] },
                { pos: '2.06', bez: 'Verbundabdichtung Wand herstellen', einheit: 'm²', menge: 22.00, bereich: 'OG', kategorie: 'abdichtung', tags: ['abdichtung','wand'] },
                { pos: '2.07', bez: 'Dichtband in Verbundabdichtung einarbeiten', einheit: 'm', menge: 20.00, bereich: 'OG', kategorie: 'abdichtung', tags: ['abdichtung','dichtband'] },
                { pos: '2.08', bez: 'Dichtmanschette für Wanddurchführung', einheit: 'Stk', menge: 6.00, bereich: 'OG', kategorie: 'abdichtung', tags: ['abdichtung','manschette'] },
                { pos: '2.09', bez: 'Eckschutzschienen Edelstahl liefern u. verlegen', einheit: 'm', menge: 10.00, bereich: 'OG', kategorie: 'schiene', tags: ['schiene','eck','edelstahl'] },
                { pos: '2.10', bez: 'Abschlussprofil Edelstahl liefern u. verlegen', einheit: 'm', menge: 6.00, bereich: 'OG', kategorie: 'schiene', tags: ['schiene','abschluss','edelstahl'] },
                { pos: '2.11', bez: 'Silikonverfugung Sanitär (Anschlussfugen)', einheit: 'm', menge: 35.00, bereich: 'OG', kategorie: 'silikon', tags: ['silikon','fuge','sanitär'] },
                { pos: '2.12', bez: 'Bodengleiche Duschrinne einbauen', einheit: 'Stk', menge: 2.00, bereich: 'OG', kategorie: 'einbau', tags: ['dusche','rinne','einbau'] },
                { pos: '2.13', bez: 'Gefälleestrich für bodengl. Dusche herstellen', einheit: 'm²', menge: 5.00, bereich: 'OG', kategorie: 'estrich', tags: ['estrich','gefälle','dusche'] },
                // === ALLGEMEIN ===
                { pos: '3.01', bez: 'Baustelleneinrichtung / Gerüst', einheit: 'psch', menge: 1.00, bereich: 'Allgemein', kategorie: 'allgemein', tags: ['baustelle','einrichtung'] },
                { pos: '3.02', bez: 'Untergrund vorbereiten / grundieren', einheit: 'm²', menge: 280.00, bereich: 'Allgemein', kategorie: 'vorbereitung', tags: ['grundierung','vorbereitung','untergrund'] },
                { pos: '3.03', bez: 'Schwellen / Übergänge herstellen', einheit: 'Stk', menge: 8.00, bereich: 'Allgemein', kategorie: 'schwelle', tags: ['schwelle','übergang'] },
            ],
            'k002': [
                { pos: '1.01', bez: 'Schwimmbadfliesen 15×15 R11 Becken Boden', einheit: 'm²', menge: 312.00, bereich: 'Becken', kategorie: 'boden', tags: ['boden','fliese','schwimmbad','rutschfest'] },
                { pos: '1.02', bez: 'Schwimmbadfliesen 15×15 Becken Wand', einheit: 'm²', menge: 180.00, bereich: 'Becken', kategorie: 'wand', tags: ['wand','fliese','schwimmbad'] },
                { pos: '2.01', bez: 'Bodenfliesen 20×20 R11 liefern u. verlegen', einheit: 'm²', menge: 80.00, bereich: 'Umkleiden', kategorie: 'boden', tags: ['boden','fliese','rutschfest'] },
                { pos: '2.02', bez: 'Wandfliesen 20×25 liefern u. verlegen', einheit: 'm²', menge: 190.00, bereich: 'Umkleiden', kategorie: 'wand', tags: ['wand','fliese','verlegen'] },
                { pos: '3.01', bez: 'Bodenfliesen 10×10 R11 liefern u. verlegen', einheit: 'm²', menge: 56.00, bereich: 'Duschen', kategorie: 'boden', tags: ['boden','fliese','rutschfest','dusche'] },
                { pos: '3.02', bez: 'Wandfliesen 10×10 liefern u. verlegen', einheit: 'm²', menge: 168.00, bereich: 'Duschen', kategorie: 'wand', tags: ['wand','fliese','dusche'] },
                { pos: '4.01', bez: 'Rinnenauskleidung Edelstahl / Fliese', einheit: 'm', menge: 60.00, bereich: 'Becken', kategorie: 'rinne', tags: ['rinne','becken','schwimmbad'] },
                { pos: '4.02', bez: 'Verbundabdichtung Becken', einheit: 'm²', menge: 500.00, bereich: 'Becken', kategorie: 'abdichtung', tags: ['abdichtung','schwimmbad'] },
                { pos: '4.03', bez: 'Verbundabdichtung Nassbereich', einheit: 'm²', menge: 120.00, bereich: 'Duschen', kategorie: 'abdichtung', tags: ['abdichtung','dusche'] },
                { pos: '5.01', bez: 'Fliesensockel h=10cm', einheit: 'm', menge: 42.00, bereich: 'Umkleiden', kategorie: 'sockel', tags: ['sockel'] },
                { pos: '5.02', bez: 'Silikonverfugung', einheit: 'm', menge: 80.00, bereich: 'Allgemein', kategorie: 'silikon', tags: ['silikon','fuge'] },
            ],
            'k003': [
                { pos: '1.01', bez: 'Bodenfliesen 30×60 liefern u. verlegen', einheit: 'm²', menge: 12.00, bereich: 'EG', kategorie: 'boden', tags: ['boden','fliese'] },
                { pos: '1.02', bez: 'Wandfliesen 25×40 liefern u. verlegen', einheit: 'm²', menge: 28.00, bereich: 'EG', kategorie: 'wand', tags: ['wand','fliese'] },
                { pos: '1.03', bez: 'Bodenfliesen 20×20 liefern u. verlegen', einheit: 'm²', menge: 2.00, bereich: 'EG', kategorie: 'boden', tags: ['boden','fliese','kleinformat'] },
                { pos: '1.04', bez: 'Wandfliesen 20×25 liefern u. verlegen', einheit: 'm²', menge: 8.00, bereich: 'EG', kategorie: 'wand', tags: ['wand','fliese'] },
                { pos: '2.01', bez: 'Bodenfliesen 60×60 liefern u. verlegen', einheit: 'm²', menge: 9.00, bereich: 'OG', kategorie: 'boden', tags: ['boden','fliese','großformat'] },
                { pos: '2.02', bez: 'Wandfliesen 30×60 liefern u. verlegen', einheit: 'm²', menge: 35.00, bereich: 'OG', kategorie: 'wand', tags: ['wand','fliese'] },
                { pos: '3.01', bez: 'Verbundabdichtung Boden', einheit: 'm²', menge: 22.00, bereich: 'Allgemein', kategorie: 'abdichtung', tags: ['abdichtung','boden'] },
                { pos: '3.02', bez: 'Verbundabdichtung Wand', einheit: 'm²', menge: 40.00, bereich: 'Allgemein', kategorie: 'abdichtung', tags: ['abdichtung','wand'] },
                { pos: '3.03', bez: 'Silikonverfugung Sanitär', einheit: 'm', menge: 25.00, bereich: 'Allgemein', kategorie: 'silikon', tags: ['silikon','fuge'] },
                { pos: '3.04', bez: 'Eckschutzschienen', einheit: 'm', menge: 8.00, bereich: 'Allgemein', kategorie: 'schiene', tags: ['schiene','eck'] },
                { pos: '3.05', bez: 'Fliesensockel h=10cm', einheit: 'm', menge: 15.00, bereich: 'Allgemein', kategorie: 'sockel', tags: ['sockel'] },
            ],
        };

        /* ═══════════════════════════════════════════
           KI-POSITIONSEMPFEHLUNG ENGINE
           Sortiert Positionen nach Relevanz fuer den Raum
           ═══════════════════════════════════════════ */
        // Lerngedaechtnis: speichert User-Zuordnungen {raumTyp → [posKategorien]}
        const positionMemory = {};

        function learnFromSelection(raum, selectedPos) {
            const raumTyp = detectRaumTyp(raum);
            if (!positionMemory[raumTyp]) positionMemory[raumTyp] = {};
            selectedPos.forEach(p => {
                const key = p.kategorie;
                positionMemory[raumTyp][key] = (positionMemory[raumTyp][key] || 0) + 1;
            });
        }

        function detectRaumTyp(raum) {
            const bez = (raum.bez || '').toLowerCase();
            if (bez.includes('bad') || bez.includes('dusch')) return 'nassraum';
            if (bez.includes('wc') || bez.includes('toilette')) return 'wc';
            if (bez.includes('küche') || bez.includes('kueche')) return 'küche';
            if (bez.includes('flur') || bez.includes('diele')) return 'flur';
            if (bez.includes('pool') || bez.includes('schwimm') || bez.includes('becken')) return 'pool';
            if (bez.includes('dampf') || bez.includes('sauna')) return 'dampfbad';
            if (bez.includes('umkleide')) return 'umkleide';
            if (bez.includes('hauswirtschaft') || bez.includes('hwi') || bez.includes('abstell')) return 'nebenraum';
            return 'allgemein';
        }

        function sortPositionenForRaum(allPositionen, raum) {
            const raumTyp = detectRaumTyp(raum);
            const hatWand = raum.fliesenhoehe > 0;
            const hatBoden = true;
            const material = (raum.material || '').toLowerCase();
            const geschoss = (raum.geschoss || '').toUpperCase();
            const hatDusche = material.includes('dusch') || (raum.bez || '').toLowerCase().includes('dusch');
            const istNassraum = ['nassraum','wc','umkleide','dampfbad','pool'].includes(raumTyp);

            const scored = allPositionen.map(pos => {
                let score = 0;

                // Bereichs-Matching (EG↔EG, OG↔OG)
                if (pos.bereich === geschoss) score += 30;
                else if (pos.bereich === 'Allgemein') score += 10;
                else if (geschoss.includes('EG') && pos.bereich === 'EG') score += 30;
                else if (geschoss.includes('OG') && pos.bereich === 'OG') score += 30;

                // Kategorie-Matching
                if (pos.kategorie === 'boden' && hatBoden) score += 20;
                if (pos.kategorie === 'wand' && hatWand) score += 20;
                if (pos.kategorie === 'sockel' && hatBoden) score += 10;
                if (pos.kategorie === 'abdichtung' && istNassraum) score += 18;
                if (pos.kategorie === 'silikon' && istNassraum) score += 15;
                if (pos.kategorie === 'schiene') score += 5;
                if (pos.kategorie === 'einbau' && hatDusche) score += 15;
                if (pos.kategorie === 'estrich' && hatDusche) score += 12;

                // Material-Matching
                if (material.includes('mosaik') && pos.tags.includes('mosaik')) score += 25;
                if (material.includes('schwimmbad') && pos.tags.includes('schwimmbad')) score += 25;
                if (material.includes('10×10') && pos.bez.includes('10×10')) score += 20;
                if (material.includes('30×60') && pos.bez.includes('30×60')) score += 20;
                if (material.includes('60×60') && pos.bez.includes('60×60')) score += 20;
                if (material.includes('20×20') && pos.bez.includes('20×20')) score += 20;
                if (material.includes('r11') && pos.tags.includes('rutschfest')) score += 15;
                if (material.includes('spiegel') && pos.tags.includes('spiegel')) score += 25;

                // Raumtyp-spezifisch
                if (raumTyp === 'küche' && pos.tags.includes('küche')) score += 20;
                if (raumTyp === 'pool' && pos.tags.includes('pool')) score += 25;
                if (raumTyp === 'dampfbad' && pos.tags.includes('dampfbad')) score += 25;
                if (raumTyp === 'flur' && pos.kategorie === 'wand') score -= 10; // Flur selten Wandfliesen
                if (raumTyp === 'flur' && pos.tags.includes('flur')) score += 15;

                // Lerngedaechtnis anwenden
                if (positionMemory[raumTyp] && positionMemory[raumTyp][pos.kategorie]) {
                    score += positionMemory[raumTyp][pos.kategorie] * 5;
                }

                return { ...pos, score, empfohlen: score >= 20 };
            });

            return scored.sort((a, b) => b.score - a.score);
        }

        // Duplikate erkennen: NUR Positionen mit EXAKT gleicher Bezeichnung aber unterschiedlicher Pos-Nr
        function findDuplicatePositions(positionen) {
            const groups = {};
            positionen.forEach(p => {
                const key = p.bez.trim();
                if (!groups[key]) groups[key] = [];
                groups[key].push(p);
            });
            const duplicates = {};
            Object.entries(groups).forEach(([key, items]) => {
                if (items.length > 1) {
                    items.forEach(item => { duplicates[item.pos] = items.filter(i => i.pos !== item.pos); });
                }
            });
            return duplicates;
        }

        /* ═══════════════════════════════════════════
           FIRMENLOGO COMPONENT
           ═══════════════════════════════════════════ */
        function FirmenLogo({ size = 'large' }) {
            const scale = size === 'small' ? 0.55 : 1;
            return (
                <div className="logo-container" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                    {/* Row 1: "Thomas" in rot kursiv */}
                    <div className="logo-thomas-row">
                        <span className="logo-thomas-text">Thomas</span>
                    </div>

                    {/* Row 2: "wiLLwacher" */}
                    <div className="logo-word-row">
                        <span className="logo-w">w</span>
                        <span className="logo-i-wrap">
                            <span className="logo-i-char">{'\u0131'}</span>
                            <span className="logo-i-dot"></span>
                        </span>
                        <span className="logo-LL">LL</span>
                        <span className="logo-wacher">wacher</span>
                    </div>

                    {/* Row 3: "Fliesenlegermeister e.K." rot rechtsbuendig */}
                    <div className="logo-subtitle-row">
                        <span className="logo-subtitle-text">Fliesenlegermeister e.K.</span>
                    </div>
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           BAUTEAM ANIMATION — 3 GRUPPEN, 7 FIGUREN
           Gruppe 1: Ivan, Michal, Iurii
           Gruppe 2: Peter, Luca (AM s.r.o.)
           Gruppe 3: Luca, Silke (BIG BOSS)
           Zyklus 45s total, je 15s pro Gruppe
           ═══════════════════════════════════════════ */

        /* ---- Figur 1: IVAN (blau) ---- */
        function FigurIvan() {
            return (
                <div className="tw-figure" style={{position:'relative', width:'100px', height:'180px'}}>
                    <div className="tw-shadow"></div>
                    <svg viewBox="0 0 100 180" width="100" height="180">
                        <defs>
                            <linearGradient id="jackeIvan" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#3498db"/>
                                <stop offset="1" stopColor="#1a5276"/>
                            </linearGradient>
                            <linearGradient id="hoseIvan" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#34495e"/>
                                <stop offset="1" stopColor="#1a252f"/>
                            </linearGradient>
                            <radialGradient id="helmIvan" cx="0.3" cy="0.3">
                                <stop offset="0" stopColor="#f7dc6f"/>
                                <stop offset="1" stopColor="#b7950b"/>
                            </radialGradient>
                            <radialGradient id="hautIvan" cx="0.4" cy="0.4">
                                <stop offset="0" stopColor="#fdebd0"/>
                                <stop offset="1" stopColor="#dc7633"/>
                            </radialGradient>
                        </defs>
                        <g className="tw-leg-l">
                            <path d="M 42,100 Q 40,130 38,160 L 46,160 Q 48,130 48,100 Z" fill="url(#hoseIvan)"/>
                            <ellipse cx="42" cy="162" rx="8" ry="4" fill="#1a1a1a"/>
                        </g>
                        <g className="tw-leg-r">
                            <path d="M 52,100 Q 54,130 56,160 L 64,160 Q 62,130 58,100 Z" fill="url(#hoseIvan)"/>
                            <ellipse cx="58" cy="162" rx="8" ry="4" fill="#1a1a1a"/>
                        </g>
                        <g>
                            <path d="M 35,55 Q 32,70 33,100 L 67,100 Q 68,70 65,55 Z" fill="url(#jackeIvan)"/>
                            <line x1="50" y1="58" x2="50" y2="95" stroke="#5d4037" strokeWidth="0.8"/>
                            <rect x="33" y="92" width="34" height="5" fill="#5d4037"/>
                            <rect x="48" y="91" width="4" height="7" fill="#c0c0c0"/>
                            <rect x="37" y="78" width="10" height="8" fill="#1a5276" opacity="0.6"/>
                            <rect x="53" y="78" width="10" height="8" fill="#1a5276" opacity="0.6"/>
                            <rect x="38" y="99" width="3" height="10" fill="#2c3e50"/>
                            <rect x="36" y="107" width="7" height="3" fill="#7f8c8d"/>
                            <rect x="36" y="61" width="28" height="9" fill="#ffffff" opacity="0.95" stroke="#1a1a1a" strokeWidth="0.3"/>
                            <text x="50" y="68" textAnchor="middle" fill="#1a1a1a" fontSize="7.5" fontWeight="900" fontFamily="Arial Black, sans-serif">IVAN</text>
                        </g>
                        <g className="tw-arm-l">
                            <path d="M 33,58 Q 28,75 26,95 L 32,96 Q 35,75 38,58 Z" fill="url(#jackeIvan)"/>
                            <circle cx="29" cy="96" r="5" fill="url(#hautIvan)"/>
                        </g>
                        <g className="tw-arm-r">
                            <path d="M 67,58 Q 72,75 74,95 L 68,96 Q 65,75 62,58 Z" fill="url(#jackeIvan)"/>
                            <circle cx="71" cy="96" r="5" fill="url(#hautIvan)"/>
                            <g transform="translate(71,100)">
                                <path d="M -8,0 L -6,14 L 6,14 L 8,0 Z" fill="#e67e22" stroke="#a04000" strokeWidth="0.8"/>
                                <ellipse cx="0" cy="0" rx="8" ry="2" fill="#d35400" stroke="#a04000" strokeWidth="0.5"/>
                                <path d="M -8,0 Q 0,-10 8,0" fill="none" stroke="#2c3e50" strokeWidth="1"/>
                            </g>
                        </g>
                        <g>
                            <rect x="45" y="50" width="10" height="8" fill="url(#hautIvan)"/>
                            <ellipse cx="50" cy="42" rx="12" ry="14" fill="url(#hautIvan)"/>
                            <ellipse cx="50" cy="50" rx="10" ry="3" fill="#8b4513" opacity="0.3"/>
                            <circle cx="46" cy="40" r="1" fill="#1a1a1a"/>
                            <circle cx="54" cy="40" r="1" fill="#1a1a1a"/>
                            <path d="M 44,37 Q 46,36 48,37" stroke="#3e2723" strokeWidth="1" fill="none"/>
                            <path d="M 52,37 Q 54,36 56,37" stroke="#3e2723" strokeWidth="1" fill="none"/>
                            <path d="M 50,42 L 48,46 L 51,46" fill="none" stroke="#a04000" strokeWidth="0.6"/>
                            <path d="M 47,50 Q 50,51 53,50" fill="none" stroke="#6e2c00" strokeWidth="0.8"/>
                            <path d="M 38,34 Q 50,22 62,34 L 62,36 L 38,36 Z" fill="url(#helmIvan)" stroke="#8b6914" strokeWidth="0.5"/>
                            <ellipse cx="50" cy="33" rx="12" ry="3" fill="#f4d03f"/>
                            <path d="M 42,30 Q 45,26 50,25" stroke="#fef9e7" strokeWidth="1.5" fill="none" opacity="0.7"/>
                        </g>
                    </svg>
                </div>
            );
        }

        /* ---- Figur 2: MICHAL (gruen) ---- */
        function FigurMichal() {
            return (
                <div className="tw-figure tw-phase-2" style={{position:'relative', width:'100px', height:'180px'}}>
                    <div className="tw-shadow"></div>
                    <svg viewBox="0 0 100 180" width="100" height="180">
                        <defs>
                            <linearGradient id="jackeMichal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#27ae60"/>
                                <stop offset="1" stopColor="#145a32"/>
                            </linearGradient>
                            <linearGradient id="hoseMichal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#34495e"/>
                                <stop offset="1" stopColor="#1a252f"/>
                            </linearGradient>
                            <radialGradient id="helmMichal" cx="0.3" cy="0.3">
                                <stop offset="0" stopColor="#ff7675"/>
                                <stop offset="1" stopColor="#a93226"/>
                            </radialGradient>
                            <radialGradient id="hautMichal" cx="0.4" cy="0.4">
                                <stop offset="0" stopColor="#fdebd0"/>
                                <stop offset="1" stopColor="#cd853f"/>
                            </radialGradient>
                        </defs>
                        <g className="tw-leg-l">
                            <path d="M 42,100 Q 40,130 38,160 L 46,160 Q 48,130 48,100 Z" fill="url(#hoseMichal)"/>
                            <ellipse cx="42" cy="162" rx="8" ry="4" fill="#1a1a1a"/>
                        </g>
                        <g className="tw-leg-r">
                            <path d="M 52,100 Q 54,130 56,160 L 64,160 Q 62,130 58,100 Z" fill="url(#hoseMichal)"/>
                            <ellipse cx="58" cy="162" rx="8" ry="4" fill="#1a1a1a"/>
                        </g>
                        <g>
                            <path d="M 35,55 Q 32,70 33,100 L 67,100 Q 68,70 65,55 Z" fill="url(#jackeMichal)"/>
                            <line x1="50" y1="58" x2="50" y2="95" stroke="#5d4037" strokeWidth="0.8"/>
                            <rect x="33" y="92" width="34" height="5" fill="#5d4037"/>
                            <rect x="48" y="91" width="4" height="7" fill="#c0c0c0"/>
                            <rect x="37" y="78" width="10" height="8" fill="#145a32" opacity="0.6"/>
                            <rect x="53" y="78" width="10" height="8" fill="#145a32" opacity="0.6"/>
                            <rect x="38" y="99" width="3" height="10" fill="#2c3e50"/>
                            <rect x="36" y="107" width="7" height="3" fill="#7f8c8d"/>
                            <rect x="32" y="61" width="36" height="9" fill="#ffffff" opacity="0.95" stroke="#1a1a1a" strokeWidth="0.3"/>
                            <text x="50" y="68" textAnchor="middle" fill="#1a1a1a" fontSize="7.5" fontWeight="900" fontFamily="Arial Black, sans-serif">MICHAL</text>
                        </g>
                        <g className="tw-arm-l">
                            <path d="M 33,58 Q 28,75 26,95 L 32,96 Q 35,75 38,58 Z" fill="url(#jackeMichal)"/>
                            <circle cx="29" cy="96" r="5" fill="url(#hautMichal)"/>
                        </g>
                        <g className="tw-arm-r">
                            <path d="M 67,58 Q 72,75 74,95 L 68,96 Q 65,75 62,58 Z" fill="url(#jackeMichal)"/>
                            <circle cx="71" cy="96" r="5" fill="url(#hautMichal)"/>
                            <g transform="translate(71,100)">
                                <rect x="-3" y="-1" width="20" height="4" fill="#f1c40f" stroke="#b7950b" strokeWidth="0.5"/>
                                <rect x="4" y="0" width="6" height="2.5" fill="#2c3e50"/>
                                <circle cx="7" cy="1.2" r="0.8" fill="#27ae60"/>
                            </g>
                        </g>
                        <g>
                            <rect x="45" y="50" width="10" height="8" fill="url(#hautMichal)"/>
                            <ellipse cx="50" cy="42" rx="12" ry="14" fill="url(#hautMichal)"/>
                            <ellipse cx="50" cy="50" rx="10" ry="3" fill="#654321" opacity="0.3"/>
                            <circle cx="46" cy="40" r="1" fill="#1a1a1a"/>
                            <circle cx="54" cy="40" r="1" fill="#1a1a1a"/>
                            <path d="M 44,37 Q 46,36 48,37" stroke="#3e2723" strokeWidth="1" fill="none"/>
                            <path d="M 52,37 Q 54,36 56,37" stroke="#3e2723" strokeWidth="1" fill="none"/>
                            <path d="M 50,42 L 48,46 L 51,46" fill="none" stroke="#a04000" strokeWidth="0.6"/>
                            <path d="M 47,50 Q 50,51 53,50" fill="none" stroke="#6e2c00" strokeWidth="0.8"/>
                            <path d="M 38,34 Q 50,22 62,34 L 62,36 L 38,36 Z" fill="url(#helmMichal)" stroke="#7b241c" strokeWidth="0.5"/>
                            <ellipse cx="50" cy="33" rx="12" ry="3" fill="#ec7063"/>
                            <path d="M 42,30 Q 45,26 50,25" stroke="#fadbd8" strokeWidth="1.5" fill="none" opacity="0.7"/>
                        </g>
                    </svg>
                </div>
            );
        }

        /* ---- Figur 3: IURII (signalrot) ---- */
        function FigurIurii() {
            return (
                <div className="tw-figure tw-phase-3" style={{position:'relative', width:'100px', height:'180px'}}>
                    <div className="tw-shadow"></div>
                    <svg viewBox="0 0 100 180" width="100" height="180">
                        <defs>
                            <linearGradient id="jackeIurii" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#e74c3c"/>
                                <stop offset="1" stopColor="#922b21"/>
                            </linearGradient>
                            <linearGradient id="hoseIurii" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#34495e"/>
                                <stop offset="1" stopColor="#1a252f"/>
                            </linearGradient>
                            <radialGradient id="helmIurii" cx="0.3" cy="0.3">
                                <stop offset="0" stopColor="#ffffff"/>
                                <stop offset="1" stopColor="#bdc3c7"/>
                            </radialGradient>
                            <radialGradient id="hautIurii" cx="0.4" cy="0.4">
                                <stop offset="0" stopColor="#fdebd0"/>
                                <stop offset="1" stopColor="#b9770e"/>
                            </radialGradient>
                        </defs>
                        <g className="tw-leg-l">
                            <path d="M 42,100 Q 40,130 38,160 L 46,160 Q 48,130 48,100 Z" fill="url(#hoseIurii)"/>
                            <ellipse cx="42" cy="162" rx="8" ry="4" fill="#1a1a1a"/>
                        </g>
                        <g className="tw-leg-r">
                            <path d="M 52,100 Q 54,130 56,160 L 64,160 Q 62,130 58,100 Z" fill="url(#hoseIurii)"/>
                            <ellipse cx="58" cy="162" rx="8" ry="4" fill="#1a1a1a"/>
                        </g>
                        <g>
                            <path d="M 35,55 Q 32,70 33,100 L 67,100 Q 68,70 65,55 Z" fill="url(#jackeIurii)"/>
                            <line x1="50" y1="58" x2="50" y2="95" stroke="#5d4037" strokeWidth="0.8"/>
                            <rect x="33" y="92" width="34" height="5" fill="#5d4037"/>
                            <rect x="48" y="91" width="4" height="7" fill="#c0c0c0"/>
                            <rect x="37" y="78" width="10" height="8" fill="#922b21" opacity="0.6"/>
                            <rect x="53" y="78" width="10" height="8" fill="#922b21" opacity="0.6"/>
                            <rect x="38" y="99" width="3" height="10" fill="#2c3e50"/>
                            <rect x="36" y="107" width="7" height="3" fill="#7f8c8d"/>
                            <rect x="33" y="85" width="34" height="2" fill="#f1c40f" opacity="0.9"/>
                            <rect x="36" y="61" width="28" height="9" fill="#ffffff" opacity="0.95" stroke="#1a1a1a" strokeWidth="0.3"/>
                            <text x="50" y="68" textAnchor="middle" fill="#1a1a1a" fontSize="7.5" fontWeight="900" fontFamily="Arial Black, sans-serif">IURII</text>
                        </g>
                        <g className="tw-arm-l">
                            <path d="M 33,58 Q 28,75 26,95 L 32,96 Q 35,75 38,58 Z" fill="url(#jackeIurii)"/>
                            <circle cx="29" cy="96" r="5" fill="url(#hautIurii)"/>
                        </g>
                        <g className="tw-arm-r">
                            <path d="M 67,58 Q 72,75 74,95 L 68,96 Q 65,75 62,58 Z" fill="url(#jackeIurii)"/>
                            <circle cx="71" cy="96" r="5" fill="url(#hautIurii)"/>
                            <g transform="translate(71,100)">
                                <rect x="-3" y="-2" width="16" height="8" fill="#2c3e50" stroke="#1a1a1a" strokeWidth="0.5" rx="1"/>
                                <rect x="13" y="0" width="8" height="4" fill="#95a5a6"/>
                                <rect x="21" y="1" width="3" height="2" fill="#7f8c8d"/>
                                <rect x="-3" y="6" width="6" height="4" fill="#1a1a1a"/>
                            </g>
                        </g>
                        <g>
                            <rect x="45" y="50" width="10" height="8" fill="url(#hautIurii)"/>
                            <ellipse cx="50" cy="42" rx="12" ry="14" fill="url(#hautIurii)"/>
                            <ellipse cx="50" cy="50" rx="10" ry="3" fill="#654321" opacity="0.3"/>
                            <circle cx="46" cy="40" r="1" fill="#1a1a1a"/>
                            <circle cx="54" cy="40" r="1" fill="#1a1a1a"/>
                            <path d="M 44,37 Q 46,36 48,37" stroke="#3e2723" strokeWidth="1" fill="none"/>
                            <path d="M 52,37 Q 54,36 56,37" stroke="#3e2723" strokeWidth="1" fill="none"/>
                            <path d="M 50,42 L 48,46 L 51,46" fill="none" stroke="#a04000" strokeWidth="0.6"/>
                            <path d="M 47,50 Q 50,51 53,50" fill="none" stroke="#6e2c00" strokeWidth="0.8"/>
                            <path d="M 38,34 Q 50,22 62,34 L 62,36 L 38,36 Z" fill="url(#helmIurii)" stroke="#7f8c8d" strokeWidth="0.5"/>
                            <ellipse cx="50" cy="33" rx="12" ry="3" fill="#ecf0f1"/>
                            <path d="M 42,30 Q 45,26 50,25" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.9"/>
                        </g>
                    </svg>
                </div>
            );
        }

        /* ---- Figur 4: PETER (anthrazit/orange) ---- */
        function FigurPeter() {
            return (
                <div className="tw-figure" style={{position:'relative', width:'100px', height:'180px'}}>
                    <div className="tw-shadow"></div>
                    <svg viewBox="0 0 100 180" width="100" height="180">
                        <defs>
                            <linearGradient id="jackePeter" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#566573"/>
                                <stop offset="1" stopColor="#212f3c"/>
                            </linearGradient>
                            <linearGradient id="hosePeter" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#34495e"/>
                                <stop offset="1" stopColor="#1a252f"/>
                            </linearGradient>
                            <radialGradient id="helmPeter" cx="0.3" cy="0.3">
                                <stop offset="0" stopColor="#f5b041"/>
                                <stop offset="1" stopColor="#ba4a00"/>
                            </radialGradient>
                            <radialGradient id="hautPeter" cx="0.4" cy="0.4">
                                <stop offset="0" stopColor="#fdebd0"/>
                                <stop offset="1" stopColor="#cd853f"/>
                            </radialGradient>
                        </defs>
                        <g className="tw-leg-l">
                            <path d="M 42,100 Q 40,130 38,160 L 46,160 Q 48,130 48,100 Z" fill="url(#hosePeter)"/>
                            <ellipse cx="42" cy="162" rx="8" ry="4" fill="#1a1a1a"/>
                        </g>
                        <g className="tw-leg-r">
                            <path d="M 52,100 Q 54,130 56,160 L 64,160 Q 62,130 58,100 Z" fill="url(#hosePeter)"/>
                            <ellipse cx="58" cy="162" rx="8" ry="4" fill="#1a1a1a"/>
                        </g>
                        <g>
                            <path d="M 35,55 Q 32,70 33,100 L 67,100 Q 68,70 65,55 Z" fill="url(#jackePeter)"/>
                            <line x1="50" y1="58" x2="50" y2="95" stroke="#5d4037" strokeWidth="0.8"/>
                            <rect x="33" y="92" width="34" height="5" fill="#5d4037"/>
                            <rect x="48" y="91" width="4" height="7" fill="#c0c0c0"/>
                            <rect x="37" y="78" width="10" height="8" fill="#212f3c" opacity="0.6"/>
                            <rect x="53" y="78" width="10" height="8" fill="#212f3c" opacity="0.6"/>
                            <rect x="38" y="99" width="3" height="10" fill="#2c3e50"/>
                            <rect x="36" y="107" width="7" height="3" fill="#7f8c8d"/>
                            <rect x="33" y="75" width="34" height="2" fill="#e67e22" opacity="0.95"/>
                            <rect x="33" y="88" width="34" height="2" fill="#e67e22" opacity="0.95"/>
                            <rect x="36" y="61" width="28" height="9" fill="#ffffff" opacity="0.95" stroke="#1a1a1a" strokeWidth="0.3"/>
                            <text x="50" y="68" textAnchor="middle" fill="#1a1a1a" fontSize="7.5" fontWeight="900" fontFamily="Arial Black, sans-serif">PETER</text>
                        </g>
                        <g className="tw-arm-l">
                            <path d="M 33,58 Q 28,75 26,95 L 32,96 Q 35,75 38,58 Z" fill="url(#jackePeter)"/>
                            <rect x="27" y="78" width="9" height="1.5" fill="#e67e22" transform="rotate(82 31 79)"/>
                            <circle cx="29" cy="96" r="5" fill="url(#hautPeter)"/>
                        </g>
                        <g className="tw-arm-r">
                            <path d="M 67,58 Q 72,75 74,95 L 68,96 Q 65,75 62,58 Z" fill="url(#jackePeter)"/>
                            <rect x="64" y="78" width="9" height="1.5" fill="#e67e22" transform="rotate(-82 69 79)"/>
                            <circle cx="71" cy="96" r="5" fill="url(#hautPeter)"/>
                            <g transform="translate(71,100)">
                                <rect x="-5" y="-2" width="16" height="20" fill="#8b4513" stroke="#5d4037" strokeWidth="0.5"/>
                                <rect x="-4" y="0" width="14" height="17" fill="#ffffff"/>
                                <line x1="-2" y1="4" x2="8" y2="4" stroke="#95a5a6" strokeWidth="0.4"/>
                                <line x1="-2" y1="8" x2="8" y2="8" stroke="#95a5a6" strokeWidth="0.4"/>
                                <line x1="-2" y1="12" x2="8" y2="12" stroke="#95a5a6" strokeWidth="0.4"/>
                                <rect x="0" y="-3" width="6" height="2" fill="#c0c0c0"/>
                            </g>
                        </g>
                        <g>
                            <rect x="45" y="50" width="10" height="8" fill="url(#hautPeter)"/>
                            <ellipse cx="50" cy="42" rx="12" ry="14" fill="url(#hautPeter)"/>
                            <ellipse cx="50" cy="50" rx="10" ry="3" fill="#654321" opacity="0.3"/>
                            <circle cx="46" cy="40" r="1" fill="#1a1a1a"/>
                            <circle cx="54" cy="40" r="1" fill="#1a1a1a"/>
                            <path d="M 44,37 Q 46,36 48,37" stroke="#3e2723" strokeWidth="1" fill="none"/>
                            <path d="M 52,37 Q 54,36 56,37" stroke="#3e2723" strokeWidth="1" fill="none"/>
                            <path d="M 50,42 L 48,46 L 51,46" fill="none" stroke="#a04000" strokeWidth="0.6"/>
                            <path d="M 47,50 Q 50,51 53,50" fill="none" stroke="#6e2c00" strokeWidth="0.8"/>
                            <path d="M 38,34 Q 50,22 62,34 L 62,36 L 38,36 Z" fill="url(#helmPeter)" stroke="#873600" strokeWidth="0.5"/>
                            <ellipse cx="50" cy="33" rx="12" ry="3" fill="#eb984e"/>
                            <path d="M 42,30 Q 45,26 50,25" stroke="#fef5e7" strokeWidth="1.5" fill="none" opacity="0.7"/>
                        </g>
                    </svg>
                </div>
            );
        }

        /* ---- Figur 5: LUCA AM (bordeaux mit AM-Logo) ---- */
        function FigurLucaAM() {
            return (
                <div className="tw-figure tw-phase-2" style={{position:'relative', width:'100px', height:'180px'}}>
                    <div className="tw-shadow"></div>
                    <svg viewBox="0 0 100 180" width="100" height="180">
                        <defs>
                            <linearGradient id="jackeLucaAM" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#922b21"/>
                                <stop offset="1" stopColor="#4a0e0a"/>
                            </linearGradient>
                            <linearGradient id="hoseLucaAM" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#34495e"/>
                                <stop offset="1" stopColor="#1a252f"/>
                            </linearGradient>
                            <radialGradient id="helmLucaAM" cx="0.3" cy="0.3">
                                <stop offset="0" stopColor="#5d6d7e"/>
                                <stop offset="1" stopColor="#17202a"/>
                            </radialGradient>
                            <radialGradient id="hautLucaAM" cx="0.4" cy="0.4">
                                <stop offset="0" stopColor="#fdebd0"/>
                                <stop offset="1" stopColor="#b9770e"/>
                            </radialGradient>
                        </defs>
                        <g className="tw-leg-l">
                            <path d="M 42,100 Q 40,130 38,160 L 46,160 Q 48,130 48,100 Z" fill="url(#hoseLucaAM)"/>
                            <ellipse cx="42" cy="162" rx="8" ry="4" fill="#1a1a1a"/>
                        </g>
                        <g className="tw-leg-r">
                            <path d="M 52,100 Q 54,130 56,160 L 64,160 Q 62,130 58,100 Z" fill="url(#hoseLucaAM)"/>
                            <ellipse cx="58" cy="162" rx="8" ry="4" fill="#1a1a1a"/>
                        </g>
                        <g>
                            <path d="M 35,55 Q 32,70 33,100 L 67,100 Q 68,70 65,55 Z" fill="url(#jackeLucaAM)"/>
                            <line x1="50" y1="58" x2="50" y2="95" stroke="#5d4037" strokeWidth="0.8"/>
                            <rect x="33" y="92" width="34" height="5" fill="#5d4037"/>
                            <rect x="48" y="91" width="4" height="7" fill="#c0c0c0"/>
                            <rect x="37" y="82" width="10" height="7" fill="#4a0e0a" opacity="0.6"/>
                            <rect x="53" y="82" width="10" height="7" fill="#4a0e0a" opacity="0.6"/>
                            <rect x="38" y="99" width="3" height="10" fill="#2c3e50"/>
                            <rect x="36" y="107" width="7" height="3" fill="#7f8c8d"/>
                            <rect x="32" y="58" width="36" height="13" fill="#ffffff" stroke="#1a1a1a" strokeWidth="0.5"/>
                            <text x="50" y="66" textAnchor="middle" fill="#922b21" fontSize="8" fontWeight="900" fontFamily="Arial Black, sans-serif">AM</text>
                            <text x="50" y="70.5" textAnchor="middle" fill="#1a1a1a" fontSize="4" fontWeight="bold" fontFamily="Arial, sans-serif">s.r.o.</text>
                            <rect x="36" y="72" width="28" height="8" fill="#f1c40f" stroke="#1a1a1a" strokeWidth="0.3"/>
                            <text x="50" y="78.5" textAnchor="middle" fill="#1a1a1a" fontSize="6.5" fontWeight="900" fontFamily="Arial Black, sans-serif">LUCA</text>
                        </g>
                        <g className="tw-arm-l">
                            <path d="M 33,58 Q 28,75 26,95 L 32,96 Q 35,75 38,58 Z" fill="url(#jackeLucaAM)"/>
                            <circle cx="29" cy="96" r="5" fill="url(#hautLucaAM)"/>
                        </g>
                        <g className="tw-arm-r">
                            <path d="M 67,58 Q 72,75 74,95 L 68,96 Q 65,75 62,58 Z" fill="url(#jackeLucaAM)"/>
                            <circle cx="71" cy="96" r="5" fill="url(#hautLucaAM)"/>
                            <g transform="translate(71,100)">
                                <rect x="-10" y="-2" width="20" height="14" fill="#bdc3c7" stroke="#7f8c8d" strokeWidth="0.5"/>
                                <rect x="-10" y="-2" width="20" height="3" fill="#ecf0f1"/>
                                <rect x="-9" y="2" width="18" height="1" fill="#85929e"/>
                                <rect x="-9" y="6" width="18" height="1" fill="#85929e"/>
                            </g>
                        </g>
                        <g>
                            <rect x="45" y="50" width="10" height="8" fill="url(#hautLucaAM)"/>
                            <ellipse cx="50" cy="42" rx="12" ry="14" fill="url(#hautLucaAM)"/>
                            <ellipse cx="50" cy="50" rx="10" ry="3" fill="#654321" opacity="0.3"/>
                            <circle cx="46" cy="40" r="1" fill="#1a1a1a"/>
                            <circle cx="54" cy="40" r="1" fill="#1a1a1a"/>
                            <path d="M 44,37 Q 46,36 48,37" stroke="#3e2723" strokeWidth="1" fill="none"/>
                            <path d="M 52,37 Q 54,36 56,37" stroke="#3e2723" strokeWidth="1" fill="none"/>
                            <path d="M 50,42 L 48,46 L 51,46" fill="none" stroke="#a04000" strokeWidth="0.6"/>
                            <path d="M 47,50 Q 50,51 53,50" fill="none" stroke="#6e2c00" strokeWidth="0.8"/>
                            <path d="M 38,34 Q 50,22 62,34 L 62,36 L 38,36 Z" fill="url(#helmLucaAM)" stroke="#0b0b0b" strokeWidth="0.5"/>
                            <ellipse cx="50" cy="33" rx="12" ry="3" fill="#34495e"/>
                            <path d="M 42,30 Q 45,26 50,25" stroke="#95a5a6" strokeWidth="1.5" fill="none" opacity="0.6"/>
                            <text x="50" y="31" textAnchor="middle" fill="#f1c40f" fontSize="4" fontWeight="900" fontFamily="Arial Black, sans-serif">AM</text>
                        </g>
                    </svg>
                </div>
            );
        }

        /* ---- Figur 6: LUCA (oliv-braun) ---- */
        function FigurLuca2() {
            return (
                <div className="tw-figure" style={{position:'relative', width:'100px', height:'180px'}}>
                    <div className="tw-shadow"></div>
                    <svg viewBox="0 0 100 180" width="100" height="180">
                        <defs>
                            <linearGradient id="jackeLuca2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#7d6608"/>
                                <stop offset="1" stopColor="#3d3004"/>
                            </linearGradient>
                            <linearGradient id="hoseLuca2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#34495e"/>
                                <stop offset="1" stopColor="#1a252f"/>
                            </linearGradient>
                            <radialGradient id="helmLuca2" cx="0.3" cy="0.3">
                                <stop offset="0" stopColor="#5dade2"/>
                                <stop offset="1" stopColor="#1b4f72"/>
                            </radialGradient>
                            <radialGradient id="hautLuca2" cx="0.4" cy="0.4">
                                <stop offset="0" stopColor="#fdebd0"/>
                                <stop offset="1" stopColor="#ca6f1e"/>
                            </radialGradient>
                        </defs>
                        <g className="tw-leg-l">
                            <path d="M 42,100 Q 40,130 38,160 L 46,160 Q 48,130 48,100 Z" fill="url(#hoseLuca2)"/>
                            <ellipse cx="42" cy="162" rx="8" ry="4" fill="#1a1a1a"/>
                        </g>
                        <g className="tw-leg-r">
                            <path d="M 52,100 Q 54,130 56,160 L 64,160 Q 62,130 58,100 Z" fill="url(#hoseLuca2)"/>
                            <ellipse cx="58" cy="162" rx="8" ry="4" fill="#1a1a1a"/>
                        </g>
                        <g>
                            <path d="M 35,55 Q 32,70 33,100 L 67,100 Q 68,70 65,55 Z" fill="url(#jackeLuca2)"/>
                            <line x1="50" y1="58" x2="50" y2="95" stroke="#5d4037" strokeWidth="0.8"/>
                            <rect x="33" y="92" width="34" height="5" fill="#5d4037"/>
                            <rect x="48" y="91" width="4" height="7" fill="#c0c0c0"/>
                            <rect x="37" y="78" width="10" height="8" fill="#3d3004" opacity="0.6"/>
                            <rect x="53" y="78" width="10" height="8" fill="#3d3004" opacity="0.6"/>
                            <rect x="38" y="99" width="3" height="10" fill="#2c3e50"/>
                            <rect x="36" y="107" width="7" height="3" fill="#7f8c8d"/>
                            <rect x="36" y="61" width="28" height="9" fill="#ffffff" opacity="0.95" stroke="#1a1a1a" strokeWidth="0.3"/>
                            <text x="50" y="68" textAnchor="middle" fill="#1a1a1a" fontSize="7.5" fontWeight="900" fontFamily="Arial Black, sans-serif">LUCA</text>
                        </g>
                        <g className="tw-arm-l">
                            <path d="M 33,58 Q 28,75 26,95 L 32,96 Q 35,75 38,58 Z" fill="url(#jackeLuca2)"/>
                            <circle cx="29" cy="96" r="5" fill="url(#hautLuca2)"/>
                        </g>
                        <g className="tw-arm-r">
                            <path d="M 67,58 Q 72,75 74,95 L 68,96 Q 65,75 62,58 Z" fill="url(#jackeLuca2)"/>
                            <circle cx="71" cy="96" r="5" fill="url(#hautLuca2)"/>
                            <g transform="translate(71,100)">
                                <path d="M -8,0 L -6,14 L 6,14 L 8,0 Z" fill="#34495e" stroke="#1a1a1a" strokeWidth="0.8"/>
                                <ellipse cx="0" cy="0" rx="8" ry="2" fill="#7f8c8d"/>
                                <ellipse cx="0" cy="0" rx="6.5" ry="1.2" fill="#bdc3c7"/>
                                <path d="M -8,0 Q 0,-10 8,0" fill="none" stroke="#1a1a1a" strokeWidth="1"/>
                            </g>
                        </g>
                        <g>
                            <rect x="45" y="50" width="10" height="8" fill="url(#hautLuca2)"/>
                            <ellipse cx="50" cy="42" rx="12" ry="14" fill="url(#hautLuca2)"/>
                            <ellipse cx="50" cy="50" rx="10" ry="3" fill="#654321" opacity="0.3"/>
                            <circle cx="46" cy="40" r="1" fill="#1a1a1a"/>
                            <circle cx="54" cy="40" r="1" fill="#1a1a1a"/>
                            <path d="M 44,37 Q 46,36 48,37" stroke="#3e2723" strokeWidth="1" fill="none"/>
                            <path d="M 52,37 Q 54,36 56,37" stroke="#3e2723" strokeWidth="1" fill="none"/>
                            <path d="M 50,42 L 48,46 L 51,46" fill="none" stroke="#a04000" strokeWidth="0.6"/>
                            <path d="M 47,50 Q 50,51 53,50" fill="none" stroke="#6e2c00" strokeWidth="0.8"/>
                            <path d="M 38,34 Q 50,22 62,34 L 62,36 L 38,36 Z" fill="url(#helmLuca2)" stroke="#154360" strokeWidth="0.5"/>
                            <ellipse cx="50" cy="33" rx="12" ry="3" fill="#2e86c1"/>
                            <path d="M 42,30 Q 45,26 50,25" stroke="#d6eaf8" strokeWidth="1.5" fill="none" opacity="0.8"/>
                        </g>
                    </svg>
                </div>
            );
        }

        /* ---- Figur 7: SILKE (BIG BOSS, Frau, pink) ---- */
        function FigurSilke() {
            return (
                <div className="tw-figure tw-figure-silke tw-phase-2" style={{position:'relative', width:'90px', height:'170px'}}>
                    <div className="tw-shadow"></div>
                    <svg viewBox="0 0 90 170" width="90" height="170">
                        <defs>
                            <linearGradient id="jackeSilke" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#e91e63"/>
                                <stop offset="1" stopColor="#880e4f"/>
                            </linearGradient>
                            <linearGradient id="hoseSilke" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#34495e"/>
                                <stop offset="1" stopColor="#1a252f"/>
                            </linearGradient>
                            <radialGradient id="helmSilke" cx="0.3" cy="0.3">
                                <stop offset="0" stopColor="#f8bbd0"/>
                                <stop offset="1" stopColor="#c2185b"/>
                            </radialGradient>
                            <radialGradient id="hautSilke" cx="0.4" cy="0.4">
                                <stop offset="0" stopColor="#fff3e0"/>
                                <stop offset="1" stopColor="#e0a971"/>
                            </radialGradient>
                            <linearGradient id="haareSilke" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#d4a017"/>
                                <stop offset="0.5" stopColor="#b7950b"/>
                                <stop offset="1" stopColor="#7d6608"/>
                            </linearGradient>
                            <linearGradient id="schaerpeSilke" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0" stopColor="#f1c40f"/>
                                <stop offset="0.5" stopColor="#f39c12"/>
                                <stop offset="1" stopColor="#b7950b"/>
                            </linearGradient>
                        </defs>
                        <g className="tw-leg-l">
                            <path d="M 39,98 Q 38,130 37,155 L 43,155 Q 44,130 44,98 Z" fill="url(#hoseSilke)"/>
                            <ellipse cx="40" cy="157" rx="6" ry="3.5" fill="#1a1a1a"/>
                        </g>
                        <g className="tw-leg-r">
                            <path d="M 47,98 Q 48,130 49,155 L 55,155 Q 54,130 51,98 Z" fill="url(#hoseSilke)"/>
                            <ellipse cx="51" cy="157" rx="6" ry="3.5" fill="#1a1a1a"/>
                        </g>
                        <g>
                            <path d="M 32,55 Q 30,65 31,78 Q 29,85 31,98 L 59,98 Q 61,85 59,78 Q 60,65 58,55 Z" fill="url(#jackeSilke)"/>
                            <line x1="45" y1="58" x2="45" y2="95" stroke="#5d4037" strokeWidth="0.6"/>
                            <rect x="31" y="92" width="28" height="4" fill="#5d4037"/>
                            <rect x="43" y="91" width="4" height="6" fill="#f1c40f"/>
                            <g>
                                <path d="M 27,56 L 34,55 L 64,95 L 60,100 Z" fill="url(#schaerpeSilke)" stroke="#7d6608" strokeWidth="0.5"/>
                                <path d="M 27,56 L 34,55" stroke="#ffd700" strokeWidth="1"/>
                                <text x="45" y="74" textAnchor="middle" fill="#4a0e0a" fontSize="7" fontWeight="900" fontFamily="Arial Black, sans-serif" transform="rotate(52 45 74)">BIG BOSS</text>
                                <circle cx="60" cy="100" r="2.5" fill="#f1c40f" stroke="#7d6608" strokeWidth="0.3"/>
                                <line x1="60" y1="102" x2="59" y2="106" stroke="#b7950b" strokeWidth="0.5"/>
                                <line x1="61" y1="102" x2="61" y2="106" stroke="#b7950b" strokeWidth="0.5"/>
                                <line x1="62" y1="102" x2="63" y2="106" stroke="#b7950b" strokeWidth="0.5"/>
                            </g>
                            <rect x="30" y="84" width="30" height="8" fill="#ffffff" opacity="0.95" stroke="#1a1a1a" strokeWidth="0.3"/>
                            <text x="45" y="90.5" textAnchor="middle" fill="#1a1a1a" fontSize="6.5" fontWeight="900" fontFamily="Arial Black, sans-serif">SILKE</text>
                        </g>
                        <g className="tw-arm-l">
                            <path d="M 30,58 Q 26,73 24,92 L 29,93 Q 32,73 34,58 Z" fill="url(#jackeSilke)"/>
                            <circle cx="27" cy="93" r="4.5" fill="url(#hautSilke)"/>
                        </g>
                        <g className="tw-arm-r">
                            <path d="M 60,58 Q 64,73 66,92 L 61,93 Q 58,73 56,58 Z" fill="url(#jackeSilke)"/>
                            <circle cx="63" cy="93" r="4.5" fill="url(#hautSilke)"/>
                            <g transform="translate(63,97)">
                                <rect x="-6" y="-3" width="16" height="20" fill="#8b4513" stroke="#5d4037" strokeWidth="0.5"/>
                                <rect x="-5" y="-1" width="14" height="17" fill="#ffffff"/>
                                <line x1="-3" y1="3" x2="7" y2="3" stroke="#95a5a6" strokeWidth="0.4"/>
                                <line x1="-3" y1="7" x2="7" y2="7" stroke="#95a5a6" strokeWidth="0.4"/>
                                <line x1="-3" y1="11" x2="7" y2="11" stroke="#95a5a6" strokeWidth="0.4"/>
                                <rect x="-1" y="-4" width="6" height="2" fill="#c0c0c0"/>
                                <rect x="-3" y="12" width="12" height="4.5" fill="none" stroke="#c0392b" strokeWidth="0.7"/>
                                <text x="3" y="15.5" textAnchor="middle" fill="#c0392b" fontSize="3.5" fontWeight="900" fontFamily="Arial Black, sans-serif">BOSS</text>
                            </g>
                        </g>
                        <g>
                            <path d="M 35,33 Q 22,45 20,62 Q 19,78 22,90 Q 24,95 27,92 Q 25,78 26,62 Q 28,48 38,38 Z" fill="url(#haareSilke)" stroke="#7d6608" strokeWidth="0.3"/>
                            <path d="M 28,45 Q 26,60 27,75" stroke="#f4d03f" strokeWidth="0.8" fill="none" opacity="0.7"/>
                            <path d="M 32,42 Q 30,55 31,70" stroke="#f4d03f" strokeWidth="0.6" fill="none" opacity="0.5"/>
                            <ellipse cx="30" cy="35" rx="3" ry="2" fill="#c2185b"/>
                        </g>
                        <g>
                            <rect x="41" y="48" width="8" height="7" fill="url(#hautSilke)"/>
                            <ellipse cx="45" cy="40" rx="10" ry="12" fill="url(#hautSilke)"/>
                            <path d="M 36,35 Q 34,42 36,50 L 38,50 Q 37,42 38,35 Z" fill="url(#haareSilke)"/>
                            <path d="M 54,35 Q 56,42 54,50 L 52,50 Q 53,42 52,35 Z" fill="url(#haareSilke)"/>
                            <path d="M 37,34 Q 45,30 53,34 L 53,37 L 37,37 Z" fill="url(#haareSilke)"/>
                            <circle cx="38" cy="42" r="2.5" fill="#e91e63" opacity="0.25"/>
                            <circle cx="52" cy="42" r="2.5" fill="#e91e63" opacity="0.25"/>
                            <ellipse cx="41" cy="39" rx="1.2" ry="1.4" fill="#1a1a1a"/>
                            <ellipse cx="49" cy="39" rx="1.2" ry="1.4" fill="#1a1a1a"/>
                            <circle cx="41.3" cy="38.5" r="0.4" fill="#ffffff"/>
                            <circle cx="49.3" cy="38.5" r="0.4" fill="#ffffff"/>
                            <line x1="40" y1="37.8" x2="39" y2="36.5" stroke="#1a1a1a" strokeWidth="0.4"/>
                            <line x1="41" y1="37.5" x2="41" y2="36.2" stroke="#1a1a1a" strokeWidth="0.4"/>
                            <line x1="42" y1="37.8" x2="43" y2="36.5" stroke="#1a1a1a" strokeWidth="0.4"/>
                            <line x1="48" y1="37.8" x2="47" y2="36.5" stroke="#1a1a1a" strokeWidth="0.4"/>
                            <line x1="49" y1="37.5" x2="49" y2="36.2" stroke="#1a1a1a" strokeWidth="0.4"/>
                            <line x1="50" y1="37.8" x2="51" y2="36.5" stroke="#1a1a1a" strokeWidth="0.4"/>
                            <path d="M 39,36 Q 41,35.3 43,36" stroke="#7d6608" strokeWidth="0.8" fill="none"/>
                            <path d="M 47,36 Q 49,35.3 51,36" stroke="#7d6608" strokeWidth="0.8" fill="none"/>
                            <path d="M 45,40 L 44,44 L 46,44" fill="none" stroke="#d4a470" strokeWidth="0.5"/>
                            <path d="M 42,48 Q 45,49.5 48,48 Q 45,50 42,48 Z" fill="#c0392b"/>
                            <path d="M 42,48 Q 45,47 48,48" stroke="#922b21" strokeWidth="0.3" fill="none"/>
                            <path d="M 34,32 Q 45,20 56,32 L 56,34 L 34,34 Z" fill="url(#helmSilke)" stroke="#880e4f" strokeWidth="0.5"/>
                            <ellipse cx="45" cy="31" rx="11" ry="2.5" fill="#ec407a"/>
                            <path d="M 37,28 Q 41,24 45,23" stroke="#fce4ec" strokeWidth="1.5" fill="none" opacity="0.8"/>
                            <circle cx="35.5" cy="43" r="0.8" fill="#f1c40f"/>
                            <circle cx="54.5" cy="43" r="0.8" fill="#f1c40f"/>
                        </g>
                    </svg>
                </div>
            );
        }

        /* ---- HAUPT-KOMPONENTE: BauteamAnimation mit 3 Gruppen ---- */
        function BauteamAnimation() {
            // Gesamtzyklus 45s, je 15s pro Gruppe
            // Jede Gruppe laeuft von links (-400px) nach rechts (100%) in 15s,
            // dann 30s unsichtbar (waehrend andere Gruppen laufen)
            // HOEHE: 210px statt 200px, bottom:20px statt 72px
            //        → Figuren laufen weiter unten, Koepfe liegen frei ueber dem Sync-Button.
            //        CSS-Klassen tw-fig-1..tw-fig-9 geben jeder Figur individuelle
            //        Bewegungs-Geschwindigkeit und Phase (unterschiedliche Schrittlaenge).
            return (
                <div style={{position:'relative', height:'210px', marginTop:'auto', width:'100%', overflow:'hidden', pointerEvents:'none'}}>
                    {/* Fliesenstreifen als Boden */}
                    <div style={{position:'absolute', bottom:'20px', left:0, right:0, height:'2px',
                                 background:'linear-gradient(90deg, transparent 3%, rgba(149,165,166,0.4) 15%, rgba(149,165,166,0.5) 50%, rgba(149,165,166,0.4) 85%, transparent 97%)'}} />

                    {/* Gruppe 1: Ivan, Michal, Iurii */}
                    <div className="tw-group tw-group-1" style={{position:'absolute', bottom:'20px', display:'flex', gap:'22px', alignItems:'flex-end'}}>
                        <div className="tw-fig-wrap tw-fig-1"><FigurIvan /></div>
                        <div className="tw-fig-wrap tw-fig-2"><FigurMichal /></div>
                        <div className="tw-fig-wrap tw-fig-3"><FigurIurii /></div>
                    </div>

                    {/* Gruppe 2: Peter, Luca (AM s.r.o.) */}
                    <div className="tw-group tw-group-2" style={{position:'absolute', bottom:'20px', display:'flex', gap:'22px', alignItems:'flex-end'}}>
                        <div className="tw-fig-wrap tw-fig-4"><FigurPeter /></div>
                        <div className="tw-fig-wrap tw-fig-5"><FigurLucaAM /></div>
                    </div>

                    {/* Gruppe 3: Luca, Silke (BIG BOSS) */}
                    <div className="tw-group tw-group-3" style={{position:'absolute', bottom:'20px', display:'flex', gap:'22px', alignItems:'flex-end'}}>
                        <div className="tw-fig-wrap tw-fig-6"><FigurLuca2 /></div>
                        <div className="tw-fig-wrap tw-fig-7"><FigurSilke /></div>
                    </div>

                    {/* CSS-Animationen fuer Gruppenwechsel und Gehzyklus */}
                    <style dangerouslySetInnerHTML={{__html: `
.tw-figure { animation: twBodyBob 0.5s ease-in-out infinite; }
@keyframes twBodyBob {
    0%, 100% { transform: translateY(0); }
    25% { transform: translateY(-3px); }
    50% { transform: translateY(-1px); }
    75% { transform: translateY(-3px); }
}
.tw-leg-l { animation: twLegLeft 1s ease-in-out infinite; transform-origin: top center; }
.tw-leg-r { animation: twLegRight 1s ease-in-out infinite; transform-origin: top center; }
.tw-arm-l { animation: twArmLeft 1s ease-in-out infinite; transform-origin: top center; }
.tw-arm-r { animation: twArmRight 1s ease-in-out infinite; transform-origin: top center; }
@keyframes twLegLeft {
    0%,100% { transform: rotate(25deg); }
    25%     { transform: rotate(0deg); }
    50%     { transform: rotate(-25deg); }
    75%     { transform: rotate(0deg); }
}
@keyframes twLegRight {
    0%,100% { transform: rotate(-25deg); }
    25%     { transform: rotate(0deg); }
    50%     { transform: rotate(25deg); }
    75%     { transform: rotate(0deg); }
}
@keyframes twArmLeft {
    0%,100% { transform: rotate(-20deg); }
    50%     { transform: rotate(20deg); }
}
@keyframes twArmRight {
    0%,100% { transform: rotate(20deg); }
    50%     { transform: rotate(-20deg); }
}
.tw-phase-2 { animation-delay: -0.25s; }
.tw-phase-3 { animation-delay: -0.5s; }
.tw-phase-2.tw-leg-l, .tw-phase-2 .tw-leg-l, .tw-phase-2 .tw-leg-r, .tw-phase-2 .tw-arm-l, .tw-phase-2 .tw-arm-r { animation-delay: -0.25s; }
.tw-phase-3 .tw-leg-l, .tw-phase-3 .tw-leg-r, .tw-phase-3 .tw-arm-l, .tw-phase-3 .tw-arm-r { animation-delay: -0.5s; }
.tw-shadow {
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 14px;
    background: radial-gradient(ellipse, rgba(0,0,0,0.5), transparent 70%);
    filter: blur(3px);
}

/* ─── Individuelle Geh-Charakteristik pro Figur ───
   Jede Figur bekommt eine andere Geschwindigkeit und Phase,
   sodass sie NICHT im Gleichschritt laufen. Das wird erreicht,
   indem wir die Animationen in den Kind-Elementen der Figur
   auf anderen Speed/Delay-Werten laufen lassen. */
.tw-fig-wrap { display: inline-block; }

/* Ivan — schneller, forsch */
.tw-fig-1 .tw-leg-l, .tw-fig-1 .tw-leg-r,
.tw-fig-1 .tw-arm-l, .tw-fig-1 .tw-arm-r { animation-duration: 0.85s; }
.tw-fig-1 .tw-figure { animation-duration: 0.425s; }

/* Michal — gemaechlich, breitbeinig */
.tw-fig-2 .tw-leg-l, .tw-fig-2 .tw-leg-r,
.tw-fig-2 .tw-arm-l, .tw-fig-2 .tw-arm-r { animation-duration: 1.15s; animation-delay: -0.3s; }
.tw-fig-2 .tw-figure { animation-duration: 0.575s; animation-delay: -0.15s; }

/* Iurii — schlurfender Gang, langsamer Oberkoerper */
.tw-fig-3 .tw-leg-l, .tw-fig-3 .tw-leg-r,
.tw-fig-3 .tw-arm-l, .tw-fig-3 .tw-arm-r { animation-duration: 1.25s; animation-delay: -0.6s; }
.tw-fig-3 .tw-figure { animation-duration: 0.75s; animation-delay: -0.3s; }

/* Peter — zuegig, rhythmisch */
.tw-fig-4 .tw-leg-l, .tw-fig-4 .tw-leg-r,
.tw-fig-4 .tw-arm-l, .tw-fig-4 .tw-arm-r { animation-duration: 0.95s; animation-delay: -0.1s; }
.tw-fig-4 .tw-figure { animation-duration: 0.475s; }

/* Luca (AM) — locker, entspannt */
.tw-fig-5 .tw-leg-l, .tw-fig-5 .tw-leg-r,
.tw-fig-5 .tw-arm-l, .tw-fig-5 .tw-arm-r { animation-duration: 1.05s; animation-delay: -0.4s; }
.tw-fig-5 .tw-figure { animation-duration: 0.525s; animation-delay: -0.2s; }

/* Luca 2 — sehr flott */
.tw-fig-6 .tw-leg-l, .tw-fig-6 .tw-leg-r,
.tw-fig-6 .tw-arm-l, .tw-fig-6 .tw-arm-r { animation-duration: 0.8s; animation-delay: -0.2s; }
.tw-fig-6 .tw-figure { animation-duration: 0.4s; }

/* Silke — elegant, ruhig */
.tw-fig-7 .tw-leg-l, .tw-fig-7 .tw-leg-r,
.tw-fig-7 .tw-arm-l, .tw-fig-7 .tw-arm-r { animation-duration: 1.1s; animation-delay: -0.5s; }
.tw-fig-7 .tw-figure { animation-duration: 0.55s; animation-delay: -0.25s; }

.tw-group {
    left: -400px;
    opacity: 0;
    animation: twGroupWalk 45s linear infinite;
}
.tw-group-1 { animation-delay: 0s; }
.tw-group-2 { animation-delay: 15s; }
.tw-group-3 { animation-delay: 30s; }
@keyframes twGroupWalk {
    0%    { left: -400px; opacity: 1; }
    33.3% { left: 100%; opacity: 1; }
    33.4% { left: 100%; opacity: 0; }
    100%  { left: 100%; opacity: 0; }
}
`}} />
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           NAV HEADER COMPONENT
           ═══════════════════════════════════════════ */
        function NavHeader({ page, onBack, onForward, canBack, canForward }) {
            // FIX: Nur auf Startseite ausblenden - Modulwahl + alle anderen zeigen Buttons
            var hideNavButtons = (page === 'start');

            // Schriftgroessen-Toggle: Liest/Schreibt body-class und localStorage
            var [fontLarge, setFontLarge] = useState(function() {
                return localStorage.getItem('tw_font_scale') === 'large';
            });

            // Beim Mount + bei Aenderung: body-class setzen
            useEffect(function() {
                if (fontLarge) {
                    document.body.classList.add('tw-font-large');
                    localStorage.setItem('tw_font_scale', 'large');
                } else {
                    document.body.classList.remove('tw-font-large');
                    localStorage.setItem('tw_font_scale', 'normal');
                }
            }, [fontLarge]);

            var toggleFont = function() { setFontLarge(function(prev){ return !prev; }); };

            // Roter Stil fuer Vor/Zurueck und Schrift-Toggle
            var redBtnStyle = function(disabled, active) {
                return {
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    background: disabled
                        ? 'rgba(120,120,120,0.18)'
                        : (active ? 'linear-gradient(135deg, #e84040, #ff5252)'
                                  : 'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))'),
                    color: disabled ? 'rgba(255,255,255,0.35)' : '#fff',
                    fontSize: '12px',
                    fontWeight: '700',
                    fontFamily: 'Oswald, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    boxShadow: disabled ? 'none' : '0 3px 10px rgba(196,30,30,0.3)',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                };
            };

            // FIX: Vor-Button IMMER aktiv - ermoeglicht Seitenwechsel auch in leeren Blaettern
            // (wenn keine History da ist, tut onForward nichts, aber der Button fuehlt sich immer klickbar an)
            var forwardHandler = function() {
                if (canForward) {
                    onForward();
                } else if (typeof onForward === 'function') {
                    // Versuche trotzdem - manche Module haben interne Tab-Navigation
                    onForward();
                }
            };

            return (
                <header className="app-header">
                    {!hideNavButtons && (
                        <div className="nav-bar" style={{display:'flex', gap:'6px'}}>
                            <button
                                style={redBtnStyle(false)}
                                onClick={onBack}
                                title="Eine Seite zurueck"
                            >
                                {'\u2190'} Zurueck
                            </button>
                            <button
                                style={redBtnStyle(false)}
                                onClick={forwardHandler}
                                title="Eine Seite vor"
                            >
                                Vor {'\u2192'}
                            </button>
                        </div>
                    )}
                    <span className="header-title" style={{flex: hideNavButtons ? 1 : undefined, textAlign: hideNavButtons ? 'center' : undefined}}>
                        TW Business Suite
                    </span>
                    {/* Schriftgroessen-Toggle (rechts, immer sichtbar) */}
                    <button
                        style={Object.assign(redBtnStyle(false, fontLarge), { padding:'8px 12px' })}
                        onClick={toggleFont}
                        title={fontLarge ? 'Schrift auf normal zurueckstellen' : 'Schrift +50% vergroessern'}
                    >
                        {fontLarge ? 'A\u2193 Klein' : 'A\u2191 Gross'}
                    </button>
                </header>
            );
        }

        /* ═══════════════════════════════════════════
           STATUS BAR COMPONENT
           ═══════════════════════════════════════════ */
        function StatusBar({ driveStatus, activeProject }) {
            const statusText = {
                offline: 'Google Drive: Nicht verbunden',
                connecting: 'Verbinde mit Google Drive...',
                online: 'Google Drive: Verbunden',
            };
            return (
                <footer className="status-bar">
                    <span>
                        <span className={`status-dot ${driveStatus}`}></span>
                        {statusText[driveStatus]}
                    </span>
                    <span>{activeProject ? `📐 ${activeProject}` : 'Kein aktives Aufmaß'}</span>
                </footer>
            );
        }

        /* ═══════════════════════════════════════════
           AUTH MODAL COMPONENT (REAL GOOGLE OAUTH)
           ═══════════════════════════════════════════ */
        function AuthModal({ onAuth, onCancel }) {
            const [step, setStep] = useState(0);
            const [error, setError] = useState(null);
            const isDemoMode = !GDRIVE_CONFIG.CLIENT_ID;

            const startAuth = async () => {
                setStep(1);
                setError(null);

                if (isDemoMode) {
                    setTimeout(() => setStep(2), 800);
                    setTimeout(() => setStep(3), 1600);
                    setTimeout(() => onAuth({ demo: true }), 2400);
                    return;
                }

                try {
                    // Pruefe ob Google APIs geladen sind
                    if (typeof gapi === 'undefined') {
                        throw new Error('Google API (gapi) konnte nicht geladen werden. Prüfe deine Internetverbindung und ob Werbeblocker/Datenschutz-Extensions aktiv sind.');
                    }
                    if (typeof google === 'undefined' || !google.accounts) {
                        throw new Error('Google Identity Services konnte nicht geladen werden. Prüfe ob ein Werbeblocker accounts.google.com blockiert.');
                    }

                    const inited = await window.GoogleDriveService.init();
                    if (!inited) throw new Error('Google API konnte nicht initialisiert werden.\n\nMögliche Ursachen:\n- Werbeblocker aktiv\n- Drittanbieter-Cookies blockiert\n- Browser-Datenschutzeinstellungen zu restriktiv');
                    setStep(2);

                    await window.GoogleDriveService.requestAuth();
                    setStep(3);

                    const root = await window.GoogleDriveService.findRootFolder();
                    setStep(4);

                    setTimeout(() => onAuth({ demo: false, rootFolder: root }), 500);
                } catch (err) {
                    console.error('Auth Fehler:', err);
                    var errMsg = err.message || 'Verbindung fehlgeschlagen';

                    // Spezifische Fehler erkennen
                    if (errMsg.includes('popup_blocked') || errMsg.includes('popup')) {
                        errMsg = 'Popup-Blocker aktiv! Bitte erlaube Popups für diese Seite und versuche es erneut.';
                    } else if (errMsg.includes('origin') || errMsg.includes('redirect') || errMsg.includes('mismatch') || errMsg.includes('Not a valid origin')) {
                        errMsg = 'Google OAuth Fehler: Die URL dieser Seite ist nicht als autorisierte Quelle eingetragen.\n\nBitte in der Google Cloud Console unter\n"APIs & Dienste → Anmeldedaten → OAuth 2.0 Client-ID"\nfolgende URL als "Autorisierte JavaScript-Quellen" eintragen:\n\n' + window.location.origin;
                    } else if (errMsg.includes('access_denied')) {
                        errMsg = 'Zugriff verweigert. Bitte die App in der Google Cloud Console als Testnutzer freigeben.';
                    }

                    setError(errMsg);
                    setStep(0);
                }
            };

            useEffect(() => {
                const handleKey = (e) => {
                    if (e.key === 'Enter' && step === 0) startAuth();
                    if (e.key === 'Escape') onCancel();
                };
                window.addEventListener('keydown', handleKey);
                return () => window.removeEventListener('keydown', handleKey);
            }, [step]);

            return (
                <div className="modal-overlay" onClick={onCancel}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">🔐 Google Drive Verbindung</div>
                        <div className="modal-text">
                            {isDemoMode
                                ? 'Demo-Modus aktiv (keine Client-ID konfiguriert). Verbindung wird simuliert.'
                                : 'Zur Anzeige der Baustellen-Ordner wird eine Verbindung mit deinem Google Drive benötigt.'
                            }
                        </div>
                        {!isDemoMode && step === 0 && (
                            <div style={{padding:'8px 12px', background:'rgba(230,126,34,0.08)', borderRadius:'6px', fontSize:'11px', color:'var(--accent-orange)', marginBottom:'10px', lineHeight:'1.5'}}>
                                <strong>Aktuelle URL:</strong> {window.location.origin}<br/>
                                Diese URL muss in der Google Cloud Console als "Autorisierte JavaScript-Quelle" eingetragen sein.
                            </div>
                        )}
                        {error && (
                            <div style={{padding:'12px 14px', background:'rgba(196,30,30,0.1)', border:'1px solid rgba(196,30,30,0.3)', borderRadius:'8px', color:'var(--accent-red-light)', fontSize:'13px', marginBottom:'12px', whiteSpace:'pre-wrap', lineHeight:'1.5', maxHeight:'200px', overflowY:'auto'}}>
                                ⚠️ {error}
                            </div>
                        )}
                        {step === 0 ? (
                            <div className="modal-btn-group">
                                <button className="modal-btn secondary" onClick={onCancel}>Abbrechen</button>
                                <button className="modal-btn primary" onClick={startAuth}>
                                    {isDemoMode ? 'Demo starten' : 'Verbinden'}
                                </button>
                            </div>
                        ) : (
                            <div className="modal-steps">
                                <div className="modal-step">
                                    <span className={`step-num ${step >= 1 ? (step > 1 ? 'done' : 'active') : ''}`}>
                                        {step > 1 ? '✓' : '1'}
                                    </span>
                                    <span>OAuth 2.0 Authentifizierung...</span>
                                </div>
                                <div className="modal-step">
                                    <span className={`step-num ${step >= 2 ? (step > 2 ? 'done' : 'active') : ''}`}>
                                        {step > 2 ? '✓' : '2'}
                                    </span>
                                    <span>Zugriffstoken erhalten...</span>
                                </div>
                                <div className="modal-step">
                                    <span className={`step-num ${step >= 3 ? (step > 3 ? 'done' : 'active') : ''}`}>
                                        {step > 3 ? '✓' : '3'}
                                    </span>
                                    <span>Ordner "{GDRIVE_CONFIG.ROOT_FOLDER_NAME}" wird geöffnet...</span>
                                </div>
                                {!isDemoMode && (
                                    <div className="modal-step">
                                        <span className={`step-num ${step >= 4 ? 'done' : ''}`}>
                                            {step >= 4 ? '✓' : '4'}
                                        </span>
                                        <span>Kundenordner werden geladen...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           STARTSEITE PAGE
           ═══════════════════════════════════════════ */

        // ═══ ERROR BOUNDARY – Zeigt Fehler statt schwarzem Bildschirm ═══
        class ErrorBoundary extends React.Component {
            constructor(props) {
                super(props);
                this.state = { hasError: false, error: null, errorInfo: null };
            }
            static getDerivedStateFromError(error) {
                return { hasError: true, error: error };
            }
            componentDidCatch(error, errorInfo) {
                this.setState({ errorInfo: errorInfo });
                console.error('React Error Boundary:', error, errorInfo);
            }
            render() {
                if (this.state.hasError) {
                    return React.createElement('div', {
                        style: { padding: '30px', background: '#1a2332', color: '#ff6b6b', minHeight: '100vh', fontFamily: 'monospace', fontSize: '14px' }
                    },
                        React.createElement('h2', { style: { color: '#ff6b6b', marginBottom: '16px' } }, '⚠️ App-Fehler aufgetreten'),
                        React.createElement('p', { style: { color: '#f0f2f5', marginBottom: '12px' } }, 'Die App ist abgestürzt. Bitte Screenshot an den Entwickler senden:'),
                        React.createElement('pre', {
                            style: { background: '#243044', padding: '16px', borderRadius: '8px', overflow: 'auto', maxHeight: '200px', whiteSpace: 'pre-wrap', marginBottom: '12px', border: '1px solid #3a4d66' }
                        }, String(this.state.error)),
                        this.state.errorInfo && React.createElement('pre', {
                            style: { background: '#243044', padding: '16px', borderRadius: '8px', overflow: 'auto', maxHeight: '300px', whiteSpace: 'pre-wrap', fontSize: '11px', border: '1px solid #3a4d66' }
                        }, this.state.errorInfo.componentStack),
                        React.createElement('button', {
                            onClick: function() { window.location.reload(); },
                            style: { marginTop: '16px', padding: '12px 24px', background: '#c41e1e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }
                        }, '🔄 App neu laden')
                    );
                }
                return this.props.children;
            }
        }

        /* ═══════════════════════════════════════════
           GLOBALER SPEECH SERVICE + MIC BUTTON
           Einheitliche Spracheingabe fuer alle Module
           ═══════════════════════════════════════════ */

        // CSS Animationen einmalig injizieren
        (function() {
            if (document.getElementById('tw-mic-pulse-css')) return;
            var s = document.createElement('style');
            s.id = 'tw-mic-pulse-css';
            s.textContent = [
                '@keyframes twMicPulse { 0%,100% { transform:scale(1); box-shadow:0 0 0 0 rgba(231,76,60,0.4); } 50% { transform:scale(1.08); box-shadow:0 0 0 6px rgba(231,76,60,0); } }',
                '@keyframes twMicIdle { 0%,100% { opacity:0.85; } 50% { opacity:1; } }',
                '.tw-mic-btn { display:inline-flex !important; align-items:center !important; justify-content:center !important; cursor:pointer !important; transition:all 0.15s ease !important; -webkit-tap-highlight-color:rgba(30,136,229,0.2) !important; touch-action:manipulation !important; user-select:none !important; -webkit-user-select:none !important; }',
                '.tw-mic-btn:active { transform:scale(0.92) !important; }',
                '.tw-mic-btn-normal { min-width:40px; min-height:40px; width:40px; height:40px; padding:0; border-radius:10px; font-size:18px; }',
                '.tw-mic-btn-small { min-width:30px; min-height:30px; width:30px; height:30px; padding:0; border-radius:6px; font-size:14px; }',
                '.tw-mic-btn-idle { background:rgba(30,136,229,0.08); border:1.5px solid rgba(30,136,229,0.25); color:#1E88E5; }',
                '.tw-mic-btn-active { background:rgba(231,76,60,0.15); border:2px solid #e74c3c; color:#e74c3c; animation:twMicPulse 1.2s ease-in-out infinite; }'
            ].join('\n');
            document.head.appendChild(s);
        })();

        // Globaler State + aktive Recognition-Instanz tracken
        var TW_SPEECH_STATE = { current: null, listeners: [], recognition: null };

        var TWSpeechService = {
            isSupported: function() {
                return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
            },
            stop: function() {
                // Aktive Recognition sauber beenden
                if (TW_SPEECH_STATE.recognition) {
                    try { TW_SPEECH_STATE.recognition.abort(); } catch(e) {}
                    TW_SPEECH_STATE.recognition = null;
                }
                TW_SPEECH_STATE.current = null;
                TW_SPEECH_STATE.listeners.forEach(function(fn) { try { fn(null); } catch(e){} });
            },
            start: function(fieldKey, onResult) {
                if (!this.isSupported()) {
                    alert('Spracheingabe wird von diesem Browser nicht unterstuetzt. Bitte Chrome verwenden.');
                    return;
                }
                // Falls bereits eine Recognition laeuft: erst sauber stoppen
                this.stop();

                var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
                var recognition = new SpeechRec();
                recognition.lang = 'de-DE';
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.maxAlternatives = 1;

                // Referenz speichern
                TW_SPEECH_STATE.recognition = recognition;
                TW_SPEECH_STATE.current = fieldKey;
                TW_SPEECH_STATE.listeners.forEach(function(fn) { try { fn(fieldKey); } catch(e){} });

                var hasResult = false;
                recognition.onresult = function(event) {
                    hasResult = true;
                    var text = '';
                    for (var i = 0; i < event.results.length; i++) {
                        text += event.results[i][0].transcript;
                    }
                    if (onResult && text) onResult(text.trim());
                };
                recognition.onerror = function(event) {
                    console.warn('Spracheingabe Fehler:', event.error);
                    // Bei 'aborted' kein Reset (wird von stop() gehandelt)
                    if (event.error !== 'aborted') {
                        TW_SPEECH_STATE.recognition = null;
                        TW_SPEECH_STATE.current = null;
                        TW_SPEECH_STATE.listeners.forEach(function(fn) { try { fn(null); } catch(e){} });
                    }
                };
                recognition.onend = function() {
                    // Nur zuruecksetzen wenn diese Recognition noch die aktive ist
                    if (TW_SPEECH_STATE.recognition === recognition) {
                        TW_SPEECH_STATE.recognition = null;
                        TW_SPEECH_STATE.current = null;
                        TW_SPEECH_STATE.listeners.forEach(function(fn) { try { fn(null); } catch(e){} });
                    }
                };

                // Kurze Verzoegerung damit vorherige abort() durchkommt
                setTimeout(function() {
                    try {
                        recognition.start();
                    } catch(e) {
                        console.warn('Speech start error:', e);
                        TW_SPEECH_STATE.recognition = null;
                        TW_SPEECH_STATE.current = null;
                        TW_SPEECH_STATE.listeners.forEach(function(fn) { try { fn(null); } catch(ex){} });
                    }
                }, 120);
            },
            subscribe: function(fn) {
                TW_SPEECH_STATE.listeners.push(fn);
                return function() {
                    TW_SPEECH_STATE.listeners = TW_SPEECH_STATE.listeners.filter(function(f) { return f !== fn; });
                };
            },
            getActive: function() { return TW_SPEECH_STATE.current; }
        };

        // React Hook: useSpeech
        function useSpeech() {
            var state = useState(null);
            var activeMic = state[0];
            var setActiveMic = state[1];
            useEffect(function() {
                return TWSpeechService.subscribe(function(key) { setActiveMic(key); });
            }, []);
            return activeMic;
        }

        // MicButton Komponente - deutlich sichtbar, einheitlich ueberall
        function MicButton(props) {
            var fieldKey = props.fieldKey;
            var onResult = props.onResult;
            var size = props.size || 'normal';
            var activeMic = useSpeech();
            var isActive = activeMic === fieldKey;

            var handleTap = function() {
                if (isActive) {
                    // Nochmal drauf = stoppen
                    TWSpeechService.stop();
                } else {
                    TWSpeechService.start(fieldKey, onResult);
                }
            };

            var className = 'tw-mic-btn ' + (size === 'small' ? 'tw-mic-btn-small' : 'tw-mic-btn-normal') + ' ' + (isActive ? 'tw-mic-btn-active' : 'tw-mic-btn-idle');

            return React.createElement('button', {
                className: className,
                onTouchEnd: function(e) { e.preventDefault(); e.stopPropagation(); handleTap(); },
                onClick: function() { handleTap(); }
            }, isActive ? '\uD83D\uDD34' : '\uD83C\uDF99\uFE0F');
        }

        // MicLabel Komponente - Label das "Spricht..." anzeigt
        function MicLabel(props) {
            var fieldKey = props.fieldKey;
            var label = props.label;
            var activeMic = useSpeech();
            var isActive = activeMic === fieldKey;
            var style = props.style || {};
            return React.createElement('label', {
                style: Object.assign({
                    fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '3px',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                    color: isActive ? '#e74c3c' : 'var(--text-muted)',
                    transition: 'color 0.2s'
                }, style)
            }, isActive ? '\uD83D\uDD34 Aufnahme...' : label);
        }

        // MicInput Komponente - Input mit aktivem Rand
        function MicInput(props) {
            var fieldKey = props.fieldKey;
            var activeMic = useSpeech();
            var isActive = activeMic === fieldKey;
            var baseInputStyle = props.style || {};
            var mergedStyle = Object.assign({}, baseInputStyle, {
                borderColor: isActive ? '#e74c3c' : (baseInputStyle.borderColor || 'var(--border-color)'),
                boxShadow: isActive ? '0 0 0 2px rgba(231,76,60,0.2)' : (baseInputStyle.boxShadow || 'none'),
                transition: 'border-color 0.2s, box-shadow 0.2s'
            });
            var inputProps = Object.assign({}, props, { style: mergedStyle });
            delete inputProps.fieldKey;
            delete inputProps.multiline;
            return React.createElement(props.multiline ? 'textarea' : 'input', inputProps);
        }

        // Globale Verfuegbarkeit
        window.TWSpeechService = TWSpeechService;
        window.useSpeech = useSpeech;
        window.MicButton = MicButton;
        window.MicLabel = MicLabel;
        window.MicInput = MicInput;

        /* ═══════════════════════════════════════════
           ORDNER-BROWSER -- Kundenordner durchblaettern
           Dateien oeffnen sich in neuem Tab via Google Drive.
           ═══════════════════════════════════════════ */
        function OrdnerBrowser({ kunde, onBack, onGoToDaten, onGoToModulwahl }) {
            var [folders, setFolders] = useState([]);
            var [files, setFiles] = useState([]);
            var [path, setPath] = useState([]);
            var [loading, setLoading] = useState(false);
            var [error, setError] = useState(null);

            var driveFolderId = kunde ? (kunde._driveFolderId || kunde.id) : null;
            var kundeName = kunde ? (kunde.name || kunde.auftraggeber || 'Kunde') : 'Kunde';

            function loadFolder(folderId) {
                var svc = window.GoogleDriveService;
                if (!svc || !svc.accessToken) { setError('Google Drive nicht verbunden.'); return; }
                setLoading(true);
                setError(null);
                setFolders([]);
                setFiles([]);
                var q = "'" + folderId + "' in parents and trashed=false";
                svc._fetchJSON(
                    'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) +
                    '&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=name&pageSize=300'
                ).then(function(data) {
                    var items = data.files || [];
                    var fo = [], fi = [];
                    for (var i = 0; i < items.length; i++) {
                        var it = items[i];
                        if (it.mimeType === 'application/vnd.google-apps.folder') {
                            fo.push({ id: it.id, name: it.name });
                        } else {
                            fi.push({ id: it.id, name: it.name, mimeType: it.mimeType || '', size: it.size ? (parseFloat(it.size) / 1024 / 1024).toFixed(1) + ' MB' : '-' });
                        }
                    }
                    setFolders(fo);
                    setFiles(fi);
                    setLoading(false);
                }).catch(function(e) { setError('Fehler: ' + e.message); setLoading(false); });
            }

            useEffect(function() {
                if (driveFolderId) loadFolder(driveFolderId);
                else setError('Kein Kundenordner vorhanden.');
            }, [driveFolderId]);

            function goIntoFolder(folder) {
                setPath(function(prev) { return prev.concat([{ id: folder.id, name: folder.name }]); });
                loadFolder(folder.id);
            }

            function goUp() {
                setPath(function(prev) {
                    if (prev.length <= 1) { loadFolder(driveFolderId); return []; }
                    var np = prev.slice(0, -1);
                    loadFolder(np[np.length - 1].id);
                    return np;
                });
            }

            function openFile(fileId) {
                window.open('https://drive.google.com/file/d/' + fileId + '/view', '_blank');
            }

            function getIcon(name, mime) {
                var n = (name || '').toLowerCase();
                if (n.endsWith('.pdf') || mime.indexOf('pdf') >= 0) return '\uD83D\uDCC4';
                if (n.endsWith('.xlsx') || n.endsWith('.xls') || mime.indexOf('spreadsheet') >= 0) return '\uD83D\uDCCA';
                if (n.endsWith('.docx') || n.endsWith('.doc') || mime.indexOf('word') >= 0) return '\uD83D\uDDD2\uFE0F';
                if (mime.indexOf('google-apps.document') >= 0) return '\uD83D\uDCC3';
                if (mime.indexOf('google-apps.spreadsheet') >= 0) return '\uD83D\uDCCA';
                if (mime.indexOf('image') >= 0) return '\uD83D\uDDBC\uFE0F';
                return '\uD83D\uDCC1';
            }

            return (
                <div style={{padding:'16px', minHeight:'100vh', background:'var(--bg-primary)'}}>
                    {/* Header */}
                    <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px', flexWrap:'wrap'}}>
                        <button onClick={onBack} style={{padding:'10px 16px', borderRadius:'var(--radius-md)', border:'none', background:'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))', color:'#fff', cursor:'pointer', fontSize:'12px', fontWeight:'600', boxShadow:'0 4px 15px rgba(196,30,30,0.3)', display:'flex', alignItems:'center', gap:'4px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.8px', transition:'all 0.25s ease'}}>
                            {'\u2190'} Zurueck
                        </button>
                        <div style={{flex:1, minWidth:'120px'}}>
                            <div style={{fontSize:'15px', fontWeight:'700', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                {'\uD83D\uDCC1'} {kundeName.split(' \u2013 ')[0]}
                            </div>
                            <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'2px'}}>
                                {folders.length} Ordner, {files.length} Dateien
                            </div>
                        </div>
                    </div>

                    {/* Breadcrumb */}
                    {path.length > 0 && (
                        <div style={{display:'flex', alignItems:'center', gap:'4px', marginBottom:'12px', flexWrap:'wrap', fontSize:'12px'}}>
                            <span onClick={function() { setPath([]); loadFolder(driveFolderId); }} style={{cursor:'pointer', color:'var(--accent-blue)', fontWeight:'600', touchAction:'manipulation'}}>
                                {'\uD83C\uDFE0'} Root
                            </span>
                            {path.map(function(p, idx) {
                                var isLast = idx === path.length - 1;
                                return (
                                    <React.Fragment key={p.id}>
                                        <span style={{color:'var(--text-muted)'}}>{'\u203A'}</span>
                                        <span onClick={isLast ? undefined : function() { var np = path.slice(0, idx + 1); setPath(np); loadFolder(p.id); }}
                                            style={{cursor: isLast ? 'default' : 'pointer', color: isLast ? 'var(--text-primary)' : 'var(--accent-blue)', fontWeight: isLast ? '700' : '600', maxWidth:'140px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', touchAction:'manipulation'}}>
                                            {p.name}
                                        </span>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}

                    {/* Zurueck */}
                    {path.length > 0 && (
                        <button onClick={goUp} style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', width:'100%', padding:'16px 20px', marginBottom:'12px', borderRadius:'14px', border:'2px solid var(--accent-blue)', background:'rgba(30,136,229,0.08)', cursor:'pointer', color:'var(--accent-blue)', fontSize:'16px', fontWeight:'700', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px', touchAction:'manipulation', boxShadow:'0 2px 10px rgba(30,136,229,0.15)'}}>
                            {'\u2B06\uFE0F'} {'\u00DCbergeordneter Ordner'}
                        </button>
                    )}

                    {/* Loading */}
                    {loading && (<div style={{textAlign:'center', padding:'40px', color:'var(--text-muted)'}}><div style={{fontSize:'14px'}}>Ordner wird geladen...</div></div>)}

                    {/* Error */}
                    {error && !loading && (<div style={{padding:'16px', borderRadius:'12px', background:'rgba(231,76,60,0.1)', border:'1px solid rgba(231,76,60,0.3)', color:'#e74c3c', fontSize:'13px', textAlign:'center', marginBottom:'16px'}}>{error}</div>)}

                    {/* ORDNER */}
                    {!loading && folders.length > 0 && (
                        <div style={{display:'flex', flexDirection:'column', gap:'6px', marginBottom:'16px'}}>
                            {folders.map(function(folder) {
                                return (
                                    <button key={folder.id} onClick={function() { goIntoFolder(folder); }}
                                        style={{display:'flex', alignItems:'center', gap:'12px', width:'100%', padding:'14px', borderRadius:'12px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', cursor:'pointer', textAlign:'left', touchAction:'manipulation'}}>
                                        <span style={{fontSize:'26px'}}>{'\uD83D\uDCC1'}</span>
                                        <div style={{flex:1, minWidth:0}}>
                                            <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{folder.name}</div>
                                        </div>
                                        <span style={{color:'var(--text-muted)', fontSize:'18px'}}>{'\u203A'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* DATEIEN */}
                    {!loading && files.length > 0 && (
                        <div>
                            <div style={{fontSize:'11px', fontWeight:'700', color:'var(--accent-blue)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'8px', paddingLeft:'4px'}}>
                                {files.length} {files.length === 1 ? 'Datei' : 'Dateien'}
                            </div>
                            <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                                {files.map(function(datei) {
                                    return (
                                        <button key={datei.id} onClick={function() { openFile(datei.id); }}
                                            style={{display:'flex', alignItems:'center', gap:'10px', width:'100%', padding:'12px 14px', borderRadius:'10px', border:'1px solid rgba(30,136,229,0.25)', background:'rgba(30,136,229,0.05)', cursor:'pointer', textAlign:'left', touchAction:'manipulation'}}>
                                            <span style={{fontSize:'22px'}}>{getIcon(datei.name, datei.mimeType)}</span>
                                            <div style={{flex:1, minWidth:0}}>
                                                <div style={{fontSize:'13px', fontWeight:'600', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{datei.name}</div>
                                                <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'2px'}}>{datei.size}</div>
                                            </div>
                                            <span style={{fontSize:'12px', padding:'5px 12px', borderRadius:'var(--radius-sm)', background:'var(--accent-blue)', color:'#fff', fontWeight:'600', whiteSpace:'nowrap', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px', transition:'all 0.2s ease'}}>
                                                {'\u00D6ffnen'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Leer */}
                    {!loading && !error && folders.length === 0 && files.length === 0 && (
                        <div style={{textAlign:'center', padding:'40px', color:'var(--text-muted)', fontSize:'13px'}}>Dieser Ordner ist leer.</div>
                    )}
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           LOKALE KUNDEN-LISTE — aus IndexedDB
           Zeigt alle lokal gespeicherten Kunden mit Datum
           und Loeschen-Moeglichkeit. Klick auf Kunde
           oeffnet den LokalenOrdnerBrowser (offline).
           ═══════════════════════════════════════════ */
        function LokaleKundenListe({ onSelectKunde, onBack }) {
            var [kunden, setKunden] = useState([]);
            var [loading, setLoading] = useState(true);
            var [error, setError] = useState(null);
            var [deleteConfirm, setDeleteConfirm] = useState(null); // kunde-id

            function ladeKunden() {
                setLoading(true);
                setError(null);
                if (!window.TWStorage || !window.TWStorage.listKunden) {
                    setError('Lokaler Speicher nicht verfuegbar.');
                    setLoading(false);
                    return;
                }
                window.TWStorage.listKunden().then(function(list) {
                    // Nach updatedAt absteigend sortieren (neueste zuerst)
                    var sorted = (list || []).slice().sort(function(a, b) {
                        var ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                        var tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                        return tb - ta;
                    });
                    setKunden(sorted);
                    setLoading(false);
                }).catch(function(err) {
                    setError('Fehler beim Laden: ' + (err.message || err));
                    setLoading(false);
                });
            }

            useEffect(function() { ladeKunden(); }, []);

            function handleDelete(kundeId) {
                if (!window.TWStorage || !window.TWStorage.deleteKundeData) {
                    alert('Loeschen nicht verfuegbar.');
                    return;
                }
                window.TWStorage.deleteKundeData(kundeId).then(function() {
                    setDeleteConfirm(null);
                    ladeKunden();
                }).catch(function(err) {
                    alert('Fehler beim Loeschen: ' + (err.message || err));
                });
            }

            function formatDatum(iso) {
                if (!iso) return 'ohne Datum';
                try {
                    var d = new Date(iso);
                    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
                    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear()
                        + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
                } catch(e) { return 'ungueltiges Datum'; }
            }

            return (
                <div style={{padding:'16px', minHeight:'100vh', background:'var(--bg-primary)'}}>
                    {/* Header */}
                    <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px', flexWrap:'wrap'}}>
                        <button onClick={onBack}
                            style={{padding:'10px 16px', borderRadius:'var(--radius-md)', border:'none', background:'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))', color:'#fff', cursor:'pointer', fontSize:'12px', fontWeight:'600', boxShadow:'0 4px 15px rgba(196,30,30,0.3)', display:'flex', alignItems:'center', gap:'4px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.8px'}}>
                            {'\u2190'} Zurueck
                        </button>
                        <div style={{flex:1, minWidth:'120px'}}>
                            <div style={{fontSize:'15px', fontWeight:'700', color:'var(--text-primary)'}}>
                                {'\uD83D\uDCBE'} Gespeicherte Kundendaten
                            </div>
                            <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'2px'}}>
                                {kunden.length} {kunden.length === 1 ? 'Kunde' : 'Kunden'} lokal gespeichert
                            </div>
                        </div>
                        <button onClick={ladeKunden}
                            style={{padding:'8px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-muted)', cursor:'pointer', fontSize:'11px', fontWeight:'600'}}
                            title="Liste aktualisieren">
                            {'\uD83D\uDD04'}
                        </button>
                    </div>

                    {/* Loading */}
                    {loading && (<div style={{textAlign:'center', padding:'40px', color:'var(--text-muted)', fontSize:'14px'}}>Kundenliste wird geladen...</div>)}

                    {/* Error */}
                    {error && !loading && (<div style={{padding:'16px', borderRadius:'12px', background:'rgba(231,76,60,0.1)', border:'1px solid rgba(231,76,60,0.3)', color:'#e74c3c', fontSize:'13px', textAlign:'center', marginBottom:'16px'}}>{error}</div>)}

                    {/* Leere Liste */}
                    {!loading && !error && kunden.length === 0 && (
                        <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-muted)', fontSize:'13px', lineHeight:'1.6'}}>
                            <div style={{fontSize:'40px', marginBottom:'12px', opacity:0.4}}>{'\uD83D\uDCE6'}</div>
                            Keine lokal gespeicherten Kundendaten vorhanden.
                            <br />
                            <span style={{fontSize:'11px', opacity:0.7}}>Lade zuerst einen Kunden ueber "Kundendaten laden" von Google Drive.</span>
                        </div>
                    )}

                    {/* Kundenliste */}
                    {!loading && !error && kunden.length > 0 && (
                        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                            {kunden.map(function(kunde) {
                                var isConfirming = deleteConfirm === kunde.id;
                                return (
                                    <div key={kunde.id}
                                        style={{display:'flex', alignItems:'center', gap:'10px', padding:'14px', borderRadius:'12px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', transition:'all 0.2s ease'}}>
                                        {/* Kunden-Info + Klick-Bereich */}
                                        <button onClick={function() { if(onSelectKunde) onSelectKunde(kunde); }}
                                            style={{flex:1, minWidth:0, display:'flex', alignItems:'center', gap:'12px', padding:0, border:'none', background:'transparent', cursor:'pointer', textAlign:'left', touchAction:'manipulation'}}>
                                            <span style={{fontSize:'28px', flexShrink:0}}>{'\uD83D\uDC77'}</span>
                                            <div style={{flex:1, minWidth:0}}>
                                                <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                                    {kunde.name || kunde.auftraggeber || 'Ohne Namen'}
                                                </div>
                                                {kunde.baumassnahme && (
                                                    <div style={{fontSize:'11px', color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:'2px'}}>
                                                        {kunde.baumassnahme}
                                                    </div>
                                                )}
                                                <div style={{fontSize:'10px', color:'var(--accent-blue)', marginTop:'4px', fontFamily:'Oswald, sans-serif', letterSpacing:'0.3px'}}>
                                                    {'\uD83D\uDD52'} Bearbeitet: {formatDatum(kunde.updatedAt)}
                                                </div>
                                            </div>
                                            <span style={{color:'var(--text-muted)', fontSize:'18px', flexShrink:0}}>{'\u203A'}</span>
                                        </button>
                                        {/* Loeschen-Button */}
                                        {!isConfirming ? (
                                            <button onClick={function() { setDeleteConfirm(kunde.id); }}
                                                style={{padding:'8px 10px', borderRadius:'var(--radius-sm)', border:'1px solid rgba(231,76,60,0.3)', background:'rgba(231,76,60,0.08)', color:'#e74c3c', cursor:'pointer', fontSize:'16px', flexShrink:0, touchAction:'manipulation'}}
                                                title="Lokale Daten dieses Kunden loeschen">
                                                {'\uD83D\uDDD1\uFE0F'}
                                            </button>
                                        ) : (
                                            <div style={{display:'flex', gap:'4px', flexShrink:0}}>
                                                <button onClick={function() { handleDelete(kunde.id); }}
                                                    style={{padding:'8px 12px', borderRadius:'var(--radius-sm)', border:'none', background:'#e74c3c', color:'#fff', cursor:'pointer', fontSize:'11px', fontWeight:'700', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', touchAction:'manipulation'}}>
                                                    Loeschen
                                                </button>
                                                <button onClick={function() { setDeleteConfirm(null); }}
                                                    style={{padding:'8px 10px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-muted)', cursor:'pointer', fontSize:'11px', fontWeight:'600', touchAction:'manipulation'}}>
                                                    Abbr.
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Hinweis */}
                    {!loading && !error && kunden.length > 0 && (
                        <div style={{marginTop:'20px', padding:'12px 14px', borderRadius:'10px', background:'rgba(30,136,229,0.06)', border:'1px solid rgba(30,136,229,0.15)', fontSize:'11px', color:'var(--text-muted)', lineHeight:'1.5'}}>
                            {'\u2139\uFE0F'} Antippe einen Kunden, um offline die lokal gespeicherten Ordner und Dokumente zu durchsuchen. Loeschen entfernt NUR die lokalen Daten, der Google-Drive-Ordner bleibt unveraendert.
                        </div>
                    )}
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           LOKALER ORDNER-BROWSER — aus IndexedDB
           Nutzt TWStorage.OfflineBrowser fuer Offline-Anzeige
           gespeicherter Ordner/Dateien. Dateien werden als Blob
           ueber Object-URL geoeffnet (kein Drive noetig).
           ═══════════════════════════════════════════ */
        function LokalerOrdnerBrowser({ kunde, onBack }) {
            var [folders, setFolders] = useState([]);
            var [files, setFiles] = useState([]);
            var [path, setPath] = useState([]); // Array von {id, name}
            var [loading, setLoading] = useState(false);
            var [error, setError] = useState(null);

            var kundeId = kunde ? kunde.id : null;
            var kundeName = kunde ? (kunde.name || kunde.auftraggeber || 'Kunde') : 'Kunde';

            function loadRoot() {
                if (!kundeId || !window.TWStorage || !window.TWStorage.OfflineBrowser) {
                    setError('Offline-Browser nicht verfuegbar.');
                    return;
                }
                setLoading(true);
                setError(null);
                setFolders([]);
                setFiles([]);
                window.TWStorage.OfflineBrowser.getRootFolders(kundeId).then(function(roots) {
                    var fo = (roots || []).map(function(o) { return { id: o.id, name: o.name }; });
                    setFolders(fo);
                    // Auf der Root-Ebene zeigen wir vorerst nur Ordner (normalerweise
                    // liegen im Kunden-Root nur die 10 Unter-Ordner der TW-Struktur).
                    setFiles([]);
                    setLoading(false);
                }).catch(function(e) {
                    setError('Fehler beim Laden: ' + (e.message || e));
                    setLoading(false);
                });
            }

            function loadSubFolder(folderId) {
                if (!window.TWStorage || !window.TWStorage.OfflineBrowser) return;
                setLoading(true);
                setError(null);
                setFolders([]);
                setFiles([]);
                Promise.all([
                    window.TWStorage.OfflineBrowser.getSubFolders(folderId),
                    window.TWStorage.OfflineBrowser.getFiles(folderId)
                ]).then(function(results) {
                    var subs = results[0] || [];
                    var dateien = results[1] || [];
                    setFolders(subs.map(function(o) { return { id: o.id, name: o.name }; }));
                    setFiles(dateien.map(function(d) {
                        return {
                            id: d.id, name: d.name || '?', mimeType: d.mimeType || '',
                            size: d.sizeBytes ? (d.sizeBytes / 1024 / 1024).toFixed(1) + ' MB' : '-'
                        };
                    }));
                    setLoading(false);
                }).catch(function(e) {
                    setError('Fehler beim Laden: ' + (e.message || e));
                    setLoading(false);
                });
            }

            useEffect(function() { loadRoot(); }, [kundeId]);

            function goIntoFolder(folder) {
                setPath(function(prev) { return prev.concat([{ id: folder.id, name: folder.name }]); });
                loadSubFolder(folder.id);
            }

            function goUp() {
                setPath(function(prev) {
                    if (prev.length <= 1) { loadRoot(); return []; }
                    var np = prev.slice(0, -1);
                    loadSubFolder(np[np.length - 1].id);
                    return np;
                });
            }

            function openFile(dateiId) {
                if (!window.TWStorage || !window.TWStorage.OfflineBrowser) return;
                window.TWStorage.OfflineBrowser.openFile(dateiId).then(function(result) {
                    if (!result || !result.url) {
                        alert('Datei nicht lokal verfuegbar.\nBitte Drive-Sync durchfuehren.');
                        return;
                    }
                    // Neuer Tab mit Blob-URL: Browser zeigt PDF, Bilder etc. direkt an.
                    window.open(result.url, '_blank');
                }).catch(function(err) {
                    alert('Datei kann nicht geoeffnet werden: ' + (err.message || err));
                });
            }

            function getIcon(name, mime) {
                var n = (name || '').toLowerCase();
                var m = mime || '';
                if (n.endsWith('.pdf') || m.indexOf('pdf') >= 0) return '\uD83D\uDCC4';
                if (n.endsWith('.xlsx') || n.endsWith('.xls') || m.indexOf('spreadsheet') >= 0) return '\uD83D\uDCCA';
                if (n.endsWith('.docx') || n.endsWith('.doc') || m.indexOf('word') >= 0) return '\uD83D\uDDD2\uFE0F';
                if (m.indexOf('image') >= 0 || n.match(/\.(jpg|jpeg|png|gif|webp|heic|bmp|tif|tiff|svg)$/)) return '\uD83D\uDDBC\uFE0F';
                return '\uD83D\uDCC1';
            }

            return (
                <div style={{padding:'16px', minHeight:'100vh', background:'var(--bg-primary)'}}>
                    {/* Header */}
                    <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px', flexWrap:'wrap'}}>
                        <button onClick={onBack} style={{padding:'10px 16px', borderRadius:'var(--radius-md)', border:'none', background:'linear-gradient(135deg, var(--accent-red-light), var(--accent-red))', color:'#fff', cursor:'pointer', fontSize:'12px', fontWeight:'600', boxShadow:'0 4px 15px rgba(196,30,30,0.3)', display:'flex', alignItems:'center', gap:'4px', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.8px'}}>
                            {'\u2190'} Zurueck
                        </button>
                        <div style={{flex:1, minWidth:'120px'}}>
                            <div style={{fontSize:'15px', fontWeight:'700', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                {'\uD83D\uDCBE'} {kundeName.split(' \u2013 ')[0]}
                            </div>
                            <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'2px'}}>
                                Offline-Ansicht {'\u00B7'} {folders.length} Ordner, {files.length} Dateien
                            </div>
                        </div>
                    </div>

                    {/* Breadcrumb */}
                    {path.length > 0 && (
                        <div style={{display:'flex', alignItems:'center', gap:'4px', marginBottom:'12px', flexWrap:'wrap', fontSize:'12px'}}>
                            <span onClick={function() { setPath([]); loadRoot(); }} style={{cursor:'pointer', color:'var(--accent-blue)', fontWeight:'600', touchAction:'manipulation'}}>
                                {'\uD83C\uDFE0'} Root
                            </span>
                            {path.map(function(p, idx) {
                                var isLast = idx === path.length - 1;
                                return (
                                    <React.Fragment key={p.id}>
                                        <span style={{color:'var(--text-muted)'}}>{'\u203A'}</span>
                                        <span onClick={isLast ? undefined : function() { var np = path.slice(0, idx + 1); setPath(np); loadSubFolder(p.id); }}
                                            style={{cursor: isLast ? 'default' : 'pointer', color: isLast ? 'var(--text-primary)' : 'var(--accent-blue)', fontWeight: isLast ? '700' : '600', maxWidth:'140px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', touchAction:'manipulation'}}>
                                            {p.name}
                                        </span>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}

                    {/* Zurueck */}
                    {path.length > 0 && (
                        <button onClick={goUp} style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', width:'100%', padding:'16px 20px', marginBottom:'12px', borderRadius:'14px', border:'2px solid var(--accent-blue)', background:'rgba(30,136,229,0.08)', cursor:'pointer', color:'var(--accent-blue)', fontSize:'16px', fontWeight:'700', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px', touchAction:'manipulation', boxShadow:'0 2px 10px rgba(30,136,229,0.15)'}}>
                            {'\u2B06\uFE0F'} {'\u00DCbergeordneter Ordner'}
                        </button>
                    )}

                    {/* Loading */}
                    {loading && (<div style={{textAlign:'center', padding:'40px', color:'var(--text-muted)'}}><div style={{fontSize:'14px'}}>Ordner wird geladen...</div></div>)}

                    {/* Error */}
                    {error && !loading && (<div style={{padding:'16px', borderRadius:'12px', background:'rgba(231,76,60,0.1)', border:'1px solid rgba(231,76,60,0.3)', color:'#e74c3c', fontSize:'13px', textAlign:'center', marginBottom:'16px'}}>{error}</div>)}

                    {/* ORDNER */}
                    {!loading && folders.length > 0 && (
                        <div style={{display:'flex', flexDirection:'column', gap:'6px', marginBottom:'16px'}}>
                            {folders.map(function(folder) {
                                return (
                                    <button key={folder.id} onClick={function() { goIntoFolder(folder); }}
                                        style={{display:'flex', alignItems:'center', gap:'12px', width:'100%', padding:'14px', borderRadius:'12px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', cursor:'pointer', textAlign:'left', touchAction:'manipulation'}}>
                                        <span style={{fontSize:'26px'}}>{'\uD83D\uDCC1'}</span>
                                        <div style={{flex:1, minWidth:0}}>
                                            <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{folder.name}</div>
                                        </div>
                                        <span style={{color:'var(--text-muted)', fontSize:'18px'}}>{'\u203A'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* DATEIEN */}
                    {!loading && files.length > 0 && (
                        <div>
                            <div style={{fontSize:'11px', fontWeight:'700', color:'var(--accent-blue)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'8px', paddingLeft:'4px'}}>
                                {files.length} {files.length === 1 ? 'Datei' : 'Dateien'}
                            </div>
                            <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                                {files.map(function(datei) {
                                    return (
                                        <button key={datei.id} onClick={function() { openFile(datei.id); }}
                                            style={{display:'flex', alignItems:'center', gap:'10px', width:'100%', padding:'12px 14px', borderRadius:'10px', border:'1px solid rgba(30,136,229,0.25)', background:'rgba(30,136,229,0.05)', cursor:'pointer', textAlign:'left', touchAction:'manipulation'}}>
                                            <span style={{fontSize:'22px'}}>{getIcon(datei.name, datei.mimeType)}</span>
                                            <div style={{flex:1, minWidth:0}}>
                                                <div style={{fontSize:'13px', fontWeight:'600', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{datei.name}</div>
                                                <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'2px'}}>{datei.size}</div>
                                            </div>
                                            <span style={{fontSize:'12px', padding:'5px 12px', borderRadius:'var(--radius-sm)', background:'var(--accent-blue)', color:'#fff', fontWeight:'600', whiteSpace:'nowrap', fontFamily:'Oswald, sans-serif', textTransform:'uppercase', letterSpacing:'0.5px'}}>
                                                {'\u00D6ffnen'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Leer */}
                    {!loading && !error && folders.length === 0 && files.length === 0 && (
                        <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-muted)', fontSize:'13px', lineHeight:'1.6'}}>
                            <div style={{fontSize:'40px', marginBottom:'12px', opacity:0.4}}>{'\uD83D\uDCC2'}</div>
                            Dieser Ordner ist leer oder noch nicht lokal gespeichert.
                            {path.length === 0 && (
                                <div style={{marginTop:'10px', fontSize:'11px', opacity:0.7}}>
                                    Tipp: Lade den Kunden ueber "Kundendaten laden" komplett von Drive,<br/>um die Ordnerstruktur offline verfuegbar zu machen.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

                /* ═══════════════════════════════════════════
           NAV DROPDOWN -- Top-Navigation
           ═══════════════════════════════════════════ */
        function NavDropdown(props) {
            var currentMode = props.currentMode || 'Navigation';
            var targets = Array.isArray(props.targets) ? props.targets : [];
            var containerStyle = props.style || {};
            var color = props.color === 'blue' ? 'blue' : 'red';

            var palette = color === 'red'
                ? { mainGrad: 'linear-gradient(135deg, #e63535, #c41e1e)', mainShadow: 'rgba(196,30,30,0.30)', itemGrad: 'linear-gradient(135deg, rgba(230,53,53,0.75), rgba(196,30,30,0.75))' }
                : { mainGrad: 'linear-gradient(135deg, #1E88E5, #1565C0)', mainShadow: 'rgba(30,136,229,0.30)', itemGrad: 'linear-gradient(135deg, rgba(30,136,229,0.75), rgba(21,101,192,0.75))' };

            var [open, setOpen] = useState(false);
            var [focusIdx, setFocusIdx] = useState(-1);
            var wrapperRef = useRef(null);

            var shownTargets = targets.filter(function(t) { return t && t.label !== currentMode; });

            useEffect(function() {
                if (!open) return undefined;
                var handler = function(e) {
                    if (wrapperRef.current && !wrapperRef.current.contains(e.target)) { setOpen(false); }
                };
                var keyHandler = function(e) {
                    if (e.key === 'Escape') { setOpen(false); setFocusIdx(-1); }
                    else if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx(function(i) { return Math.min(i + 1, shownTargets.length - 1); }); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx(function(i) { return Math.max(i - 1, 0); }); }
                };
                document.addEventListener('mousedown', handler);
                document.addEventListener('touchstart', handler);
                document.addEventListener('keydown', keyHandler);
                return function() {
                    document.removeEventListener('mousedown', handler);
                    document.removeEventListener('touchstart', handler);
                    document.removeEventListener('keydown', keyHandler);
                };
            }, [open, shownTargets.length]);

            useEffect(function() {
                if (!open || focusIdx < 0 || !wrapperRef.current) return;
                var btns = wrapperRef.current.querySelectorAll('.tw-nav-dropdown-item');
                if (btns && btns[focusIdx]) { try { btns[focusIdx].focus(); } catch(e) {} }
            }, [focusIdx, open]);

            var mainBtnStyle = { padding: '10px 20px', minHeight: '44px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: palette.mainGrad, color: '#fff', fontSize: '13px', fontWeight: '700', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px', boxShadow: '0 3px 10px ' + palette.mainShadow, transition: 'all 0.2s ease', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '8px' };
            var panelStyle = { position: 'absolute', top: 'calc(100% + 6px)', left: '0', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', boxShadow: '0 8px 16px rgba(0,0,0,0.4)', padding: '6px', minWidth: '180px', maxWidth: 'calc(100vw - 16px)', zIndex: 1000, animation: 'tw-nav-drop-in-left 140ms ease-out', display: 'flex', flexDirection: 'column', gap: '4px' };
            var itemStyle = function(disabled) {
                return { padding: '10px 14px', minHeight: '42px', borderRadius: '7px', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? 'rgba(120,120,120,0.18)' : palette.itemGrad, color: disabled ? 'rgba(255,255,255,0.45)' : '#fff', fontSize: '12px', fontWeight: '700', fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left', transition: 'all 0.15s ease', opacity: disabled ? 0.5 : 1 };
            };
            var handleSelect = function(target) {
                if (target.disabled) return;
                setOpen(false); setFocusIdx(-1);
                if (typeof target.handler === 'function') { try { target.handler(); } catch(err) { console.error('NavDropdown handler:', err); } }
            };

            return (
                <div ref={wrapperRef} style={Object.assign({position:'relative', display:'inline-block'}, containerStyle)}>
                    <button type="button" style={mainBtnStyle}
                        onClick={function() { setOpen(function(v) { return !v; }); }}
                        aria-haspopup="true" aria-expanded={open}
                        title={'Navigation -- aktuell: ' + currentMode}>
                        <span>{currentMode}</span>
                        <span style={{fontSize:'10px', opacity:0.85, transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.18s ease'}}>{'\u25BC'}</span>
                    </button>
                    {open && shownTargets.length > 0 && (
                        <div className="tw-dropdown-panel tw-nav-dropdown-panel-center" style={panelStyle} role="menu">
                            {shownTargets.map(function(t) {
                                return (
                                    <button key={t.id || t.label} type="button" role="menuitem"
                                        className="tw-nav-dropdown-item"
                                        disabled={!!t.disabled} style={itemStyle(t.disabled)}
                                        onClick={function() { handleSelect(t); }}>
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           AKTION DROPDOWN -- "Bearbeiten"-Menue
           Unterstuetzt zwei Formate fuer Sub-Menus:
           Altes Format: { id, label, icon, handler, subItems: [{...}] }
           Neues Format: { type:'submenu', label, icon, items: [{label, icon, onClick}] }
           Auch: { type:'divider' } fuer Trennlinien
           Architektur: 3 Komponenten (AktionSubItem, AktionItem, AktionDropdown)
           -> loest React-Closure-Problem in map()-Schleifen
           ═══════════════════════════════════════════ */

        /* Sub-Menue-Eintrag -- eigene Komponente fuer saubere State-Isolation */
        function AktionSubItem(props) {
            var si = props.item;
            var onClose = props.onClose;
            var disabled = !!si.disabled;
            var baseStyle = {
                padding: '10px 12px', minHeight: '42px', borderRadius: '7px', border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                background: 'transparent', color: disabled ? 'rgba(255,255,255,0.4)' : 'var(--text-primary)',
                fontSize: '13px', fontWeight: '600', fontFamily: 'Oswald, sans-serif',
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                opacity: disabled ? 0.55 : 1, width: '100%', boxSizing: 'border-box',
                transition: 'background 0.12s ease',
            };
            var handleClick = function() {
                if (disabled) return;
                onClose();
                var fn = si.onClick || si.handler;
                if (typeof fn === 'function') { try { fn(); } catch(e) { console.error('SubItem:', e); } }
            };
            return (
                <button type="button" role="menuitem" className="tw-aktion-dropdown-item"
                    disabled={disabled} style={baseStyle}
                    onClick={handleClick}
                    onMouseOver={function(e) { if (!disabled) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseOut={function(e) { if (!disabled) e.currentTarget.style.background = 'transparent'; }}>
                    {si.icon && <span style={{fontSize:'14px', minWidth:'18px'}}>{si.icon}</span>}
                    <span style={{flex:1}}>{si.label}</span>
                </button>
            );
        }

        /* Haupt-Eintrag mit optionalem Sub-Panel -- eigene Komponente.
           Sub-Panel wird via React Portal in document.body gerendert, um
           overflow-Clipping des Parent-Panels zu umgehen. */
        function AktionItem(props) {
            var a = props.action;
            var align = props.align || 'right';
            var onCloseAll = props.onCloseAll;
            var myId = props.myId;
            var openSubId = props.openSubId;
            var setOpenSubId = props.setOpenSubId;
            var disabled = !!a.disabled;
            var subItems = a._subItems || [];
            var hasSub = subItems.length > 0;
            var subOpen = hasSub && openSubId === myId;
            var btnRef = useRef(null);
            var [subPos, setSubPos] = useState(null);

            /* Position des Sub-Panels berechnen wenn es oeffnet, + bei Resize/Scroll updaten */
            useEffect(function() {
                if (!subOpen || !btnRef.current) { setSubPos(null); return undefined; }
                var calcPos = function() {
                    if (!btnRef.current) return;
                    var r = btnRef.current.getBoundingClientRect();
                    var vw = window.innerWidth;
                    var vh = window.innerHeight;
                    var panelW = 240; // geschaetzte Breite
                    var gap = 6;
                    var pos = { top: r.top };
                    /* Position: vorzugsweise auf der gegenueberliegenden Seite des Haupt-Panels */
                    if (align === 'right') {
                        /* Haupt-Panel rechts-ausgerichtet -> Sub nach links */
                        var leftSide = r.left - panelW - gap;
                        if (leftSide < 8) {
                            /* Nicht genug Platz links -> rechts oeffnen */
                            pos.left = r.right + gap;
                        } else {
                            pos.left = leftSide;
                        }
                    } else {
                        /* Haupt-Panel links-ausgerichtet -> Sub nach rechts */
                        var rightSide = r.right + gap;
                        if (rightSide + panelW > vw - 8) {
                            /* Nicht genug Platz rechts -> links oeffnen */
                            pos.left = Math.max(8, r.left - panelW - gap);
                        } else {
                            pos.left = rightSide;
                        }
                    }
                    /* Vertikale Begrenzung: nicht unter den Viewport */
                    var maxHeight = vh - pos.top - 16;
                    pos.maxHeight = Math.max(160, maxHeight);
                    setSubPos(pos);
                };
                calcPos();
                window.addEventListener('resize', calcPos);
                window.addEventListener('scroll', calcPos, true);
                return function() {
                    window.removeEventListener('resize', calcPos);
                    window.removeEventListener('scroll', calcPos, true);
                };
            }, [subOpen, align]);

            var getBg = function() {
                if (disabled) return 'rgba(120,120,120,0.15)';
                if (a.destructive) return 'transparent';
                if (a.variant === 'red') return 'linear-gradient(135deg, rgba(230,53,53,0.85), rgba(196,30,30,0.85))';
                return 'transparent';
            };
            var getColor = function() {
                if (disabled) return 'rgba(255,255,255,0.4)';
                if (a.destructive) return 'var(--accent-red-light)';
                if (a.variant === 'red') return '#fff';
                return 'var(--text-primary)';
            };

            var btnStyle = {
                padding: '10px 12px', minHeight: '42px', borderRadius: '7px', border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                background: getBg(), color: getColor(),
                fontSize: '13px', fontWeight: a.variant === 'red' ? '700' : '600',
                fontFamily: 'Oswald, sans-serif',
                textTransform: a.variant === 'red' ? 'uppercase' : 'none',
                letterSpacing: a.variant === 'red' ? '0.4px' : '0',
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                opacity: disabled ? 0.55 : 1, width: '100%', boxSizing: 'border-box',
                transition: 'background 0.12s ease, filter 0.12s ease',
            };

            var subPanelStyle = subPos ? {
                position: 'fixed',
                top: subPos.top + 'px',
                left: subPos.left + 'px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.65)',
                padding: '6px',
                minWidth: '220px',
                maxWidth: 'calc(100vw - 16px)',
                maxHeight: subPos.maxHeight + 'px',
                overflowY: 'auto',
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
            } : null;

            var handleClick = function() {
                if (disabled) return;
                if (hasSub) {
                    setOpenSubId(subOpen ? null : myId);
                    return;
                }
                onCloseAll();
                if (typeof a.handler === 'function') { try { a.handler(); } catch(e) { console.error('AktionItem:', e); } }
            };
            var handleSubClose = function() { setOpenSubId(null); onCloseAll(); };

            return (
                <div style={{position:'relative'}}>
                    <button ref={btnRef}
                        type="button" role="menuitem" className="tw-aktion-dropdown-item"
                        disabled={disabled} style={btnStyle}
                        onClick={handleClick}
                        onMouseOver={function(e) {
                            if (disabled) return;
                            if (a.variant === 'red') { e.currentTarget.style.filter = 'brightness(1.15)'; }
                            else { e.currentTarget.style.background = 'var(--bg-hover)'; }
                        }}
                        onMouseOut={function(e) {
                            if (disabled) return;
                            if (a.variant === 'red') { e.currentTarget.style.filter = 'none'; }
                            else { e.currentTarget.style.background = getBg(); }
                        }}>
                        {a.icon && <span style={{fontSize:'15px', minWidth:'18px'}}>{a.icon}</span>}
                        <span style={{flex:1}}>{a.label}</span>
                        {hasSub && <span style={{fontSize:'11px', opacity:0.75, transform: subOpen ? 'rotate(90deg)' : 'none', transition:'transform 0.15s ease'}}>{'\u25B6'}</span>}
                    </button>
                    {hasSub && subOpen && subPanelStyle && typeof document !== 'undefined' && ReactDOM.createPortal(
                        <div data-tw-aktion-sub="true"
                            className="tw-dropdown-panel tw-aktion-sub-panel"
                            style={subPanelStyle} role="menu">
                            {subItems.map(function(si, i) {
                                return <AktionSubItem key={si.id || si.label || i} item={si} onClose={handleSubClose} />;
                            })}
                        </div>,
                        document.body
                    )}
                </div>
            );
        }

        function AktionDropdown(props) {
            var label = props.label || 'Bearbeiten';
            var actions = Array.isArray(props.actions) ? props.actions : [];
            var align = props.align || 'right';
            var containerStyle = props.style || {};
            var color = props.color === 'blue' ? 'blue' : 'red';
            var palette = color === 'red'
                ? { mainGrad: 'linear-gradient(135deg, #e63535, #c41e1e)', mainShadow: 'rgba(196,30,30,0.30)' }
                : { mainGrad: 'linear-gradient(135deg, #1E88E5, #1565C0)', mainShadow: 'rgba(30,136,229,0.30)' };

            var [open, setOpen] = useState(false);
            var [openSubId, setOpenSubId] = useState(null);
            var wrapperRef = useRef(null);
            var closeAll = function() { setOpen(false); setOpenSubId(null); };

            /* Reset Sub-State wenn Haupt-Dropdown geschlossen wird */
            useEffect(function() { if (!open) setOpenSubId(null); }, [open]);

            useEffect(function() {
                if (!open) return undefined;
                var handler = function(e) {
                    if (!wrapperRef.current) return;
                    /* Klick innerhalb des Haupt-Wrappers -> nix tun */
                    if (wrapperRef.current.contains(e.target)) return;
                    /* Klick im Sub-Panel-Portal -> ebenfalls nix tun */
                    if (e.target && e.target.closest && e.target.closest('[data-tw-aktion-sub]')) return;
                    setOpen(false);
                };
                var keyHandler = function(e) { if (e.key === 'Escape') { setOpen(false); } };
                document.addEventListener('mousedown', handler);
                document.addEventListener('touchstart', handler);
                document.addEventListener('keydown', keyHandler);
                return function() {
                    document.removeEventListener('mousedown', handler);
                    document.removeEventListener('touchstart', handler);
                    document.removeEventListener('keydown', keyHandler);
                };
            }, [open]);

            /* Normalisiert beide Action-Formate */
            var normalizeAction = function(a, idx) {
                if (!a) return null;
                if (a.type === 'divider') return { _divider: true, _key: 'div-' + idx };
                if (a.type === 'submenu') {
                    return { id: a.id || ('sub-' + idx), label: a.label, icon: a.icon,
                             disabled: !!a.disabled, variant: a.variant,
                             _subItems: Array.isArray(a.items) ? a.items : [] };
                }
                return { id: a.id || ('act-' + idx), label: a.label, icon: a.icon,
                         disabled: !!a.disabled, destructive: !!a.destructive,
                         variant: a.variant, handler: a.handler || a.onClick,
                         _subItems: Array.isArray(a.subItems) ? a.subItems : [] };
            };
            var normalized = actions.map(normalizeAction).filter(Boolean);

            var mainBtnStyle = {
                padding: '10px 18px', minHeight: '44px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', background: palette.mainGrad, color: '#fff',
                fontSize: '13px', fontWeight: '700', fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                boxShadow: '0 3px 10px ' + palette.mainShadow,
                transition: 'all 0.2s ease', whiteSpace: 'nowrap',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
            };
            var panelStyle = Object.assign({
                position: 'absolute', top: 'calc(100% + 6px)',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                borderRadius: '10px', boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                padding: '6px', minWidth: '220px', maxWidth: 'calc(100vw - 16px)',
                zIndex: 1000, animation: 'tw-nav-drop-in-left 140ms ease-out',
                display: 'flex', flexDirection: 'column', gap: '3px',
            }, align === 'left' ? { left: 0 } : { right: 0 });

            return (
                <div ref={wrapperRef} style={Object.assign({position:'relative', display:'inline-block'}, containerStyle)}>
                    <button type="button" style={mainBtnStyle}
                        onClick={function() { setOpen(function(v) { return !v; }); }}
                        aria-haspopup="true" aria-expanded={open} title={label}>
                        <span style={{fontSize:'14px'}}>{'\u270E'}</span>
                        <span>{label}</span>
                        <span style={{fontSize:'10px', opacity:0.85, transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.18s ease'}}>{'\u25BC'}</span>
                    </button>
                    {open && normalized.length > 0 && (
                        <div className={'tw-dropdown-panel ' + (align === 'right' ? 'tw-aktion-dropdown-panel-right' : 'tw-aktion-dropdown-panel-left')}
                            style={panelStyle} role="menu">
                            {normalized.map(function(a) {
                                if (a._divider) {
                                    return <div key={a._key} style={{height:'1px', background:'var(--border-color)', margin:'3px 6px'}} />;
                                }
                                return <AktionItem key={a.id} action={a} align={align}
                                    myId={a.id} openSubId={openSubId} setOpenSubId={setOpenSubId}
                                    onCloseAll={closeAll} />;
                            })}
                        </div>
                    )}
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           MODULWAHL -- Dashboard nach Kundenauswahl
           ═══════════════════════════════════════════ */
