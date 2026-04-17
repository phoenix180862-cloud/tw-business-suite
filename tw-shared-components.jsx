        const { useState, useEffect, useCallback, useRef } = React;

        /* ═══════════════════════════════════════════
           LEICA DISTO – Bluetooth Tastatur-Modus
           DISTO am Gerät auf "Text" oder "Tabelle" stellen,
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
        // Formel-Parser: Wertet Rechenausdrücke aus wie "3,45+2,10+3,45+2,10" oder "4*1,95"
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
           LV-POSITIONEN (werden aus KI-Analyse befüllt)
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
           Sortiert Positionen nach Relevanz für den Raum
           ═══════════════════════════════════════════ */
        // Lerngedächtnis: speichert User-Zuordnungen {raumTyp → [posKategorien]}
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

                // Lerngedächtnis anwenden
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

                    {/* Row 3: "Fliesenlegermeister e.K." rot rechtsbündig */}
                    <div className="logo-subtitle-row">
                        <span className="logo-subtitle-text">Fliesenlegermeister e.K.</span>
                    </div>
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           BAUTEAM ANIMATION - IVAN & MICHAL
           Wiederverwendbare animierte Figur fuer alle Startseiten
           ═══════════════════════════════════════════ */
        function BauarbeiterFigur({ name, jacke, hose, helm, schuh, mirror }) {
            // Realistischer Gehzyklus: 0.6s pro Schritt
            // Beine pendeln gegenphasig (-22 / +22)
            // Arme pendeln entgegengesetzt zum gleichseitigen Bein
            // Koerper wippt leicht (Bounce alle 0.3s)
            var dur = '0.6s';
            var bounceDur = '0.3s';
            var skin = '#fad7a0';
            var skinShadow = '#e8c292';
            var jackeDunkel = jacke === '#27ae60' ? '#1e8449' :
                              jacke === '#d35400' ? '#a04000' : '#1a5276';
            var sx = mirror ? -1 : 1;
            return (
                <svg width="90" height="125" viewBox="0 0 90 125" xmlns="http://www.w3.org/2000/svg"
                     style={{overflow:'visible', filter:'drop-shadow(2px 4px 6px rgba(0,0,0,0.45))', transform:'scaleX(' + sx + ')'}}>
                    {/* === GANZER KOERPER WIPPT === */}
                    <g>
                        <animateTransform attributeName="transform" type="translate" values="0,0;0,-2.5;0,0" dur={bounceDur} repeatCount="indefinite" />

                        {/* === HELM === */}
                        <ellipse cx="45" cy="14" rx="16" ry="10" fill={helm} />
                        <ellipse cx="45" cy="11" rx="13" ry="6" fill={helm} opacity="0.6" />
                        <rect x="29" y="13" width="32" height="3.5" rx="1.75" fill={helm} opacity="0.4" />
                        {/* Helm-Schild vorn */}
                        <ellipse cx="45" cy="20" rx="13" ry="2.5" fill={helm} opacity="0.7" />
                        {/* Helm-Glanz */}
                        <ellipse cx="40" cy="9" rx="4" ry="2" fill="#ffffff" opacity="0.5" />

                        {/* === KOPF === */}
                        <ellipse cx="45" cy="28" rx="9" ry="10" fill={skin} />
                        {/* Ohren */}
                        <ellipse cx="36" cy="29" rx="1.5" ry="2.5" fill={skinShadow} />
                        <ellipse cx="54" cy="29" rx="1.5" ry="2.5" fill={skinShadow} />
                        {/* Augen */}
                        <ellipse cx="41" cy="27" rx="1.4" ry="1.8" fill="#2c3e50" />
                        <ellipse cx="49" cy="27" rx="1.4" ry="1.8" fill="#2c3e50" />
                        <circle cx="41.4" cy="26.4" r="0.5" fill="#ffffff" />
                        <circle cx="49.4" cy="26.4" r="0.5" fill="#ffffff" />
                        {/* Augenbrauen */}
                        <path d="M38 24 Q41 23 44 24" stroke="#5d4037" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                        <path d="M46 24 Q49 23 52 24" stroke="#5d4037" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                        {/* Nase */}
                        <path d="M45 28 Q44 31 45.5 32 Q47 31 45 28" fill={skinShadow} opacity="0.7" />
                        {/* Mund - freundliches Laecheln */}
                        <path d="M41 34 Q45 37 49 34" stroke="#a93226" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                        {/* Wangen */}
                        <ellipse cx="38" cy="32" rx="2" ry="1.2" fill="#f1948a" opacity="0.4" />
                        <ellipse cx="52" cy="32" rx="2" ry="1.2" fill="#f1948a" opacity="0.4" />

                        {/* === HALS === */}
                        <rect x="42" y="36" width="6" height="4" fill={skinShadow} />

                        {/* === KOERPER / WARNJACKE === */}
                        {/* Hauptjacke */}
                        <path d="M28 40 L62 40 L64 70 L26 70 Z" fill={jacke} />
                        {/* Schulterhighlights */}
                        <path d="M28 40 L34 40 L33 50 L27 50 Z" fill={jackeDunkel} opacity="0.3" />
                        <path d="M56 40 L62 40 L63 50 L57 50 Z" fill={jackeDunkel} opacity="0.3" />
                        {/* Warnstreifen oben */}
                        <rect x="27" y="44" width="36" height="3.5" fill="#f39c12" opacity="0.85" />
                        {/* Warnstreifen unten */}
                        <rect x="26" y="61" width="38" height="3.5" fill="#f39c12" opacity="0.85" />
                        {/* Reissverschluss */}
                        <line x1="45" y1="40" x2="45" y2="70" stroke={jackeDunkel} strokeWidth="0.7" />
                        {/* Namensschild auf der Brust - weisses Feld */}
                        <rect x="33" y="50" width="24" height="9" rx="1.5" fill="#ffffff" stroke={jackeDunkel} strokeWidth="0.5" />
                        <text x="45" y="56.5" textAnchor="middle" fill="#1a2332" fontSize="6.2"
                              fontWeight="700" fontFamily="Oswald, Arial, sans-serif"
                              transform={mirror ? 'scale(-1,1) translate(-90,0)' : ''}
                              style={{letterSpacing:'0.5px'}}>
                            {name}
                        </text>

                        {/* === LINKER ARM (mit Pendel) === */}
                        <g>
                            <animateTransform attributeName="transform" type="rotate"
                                values="22,32,42;-22,32,42;22,32,42" dur={dur} repeatCount="indefinite" />
                            {/* Oberarm in Jackenfarbe */}
                            <rect x="22" y="40" width="11" height="18" rx="4" fill={jacke} />
                            {/* Warnstreifen am Aermel */}
                            <rect x="22" y="55" width="11" height="2" fill="#f39c12" opacity="0.85" />
                            {/* Unterarm - Hautfarbe */}
                            <rect x="23" y="56" width="9" height="11" rx="3.5" fill={skin} />
                            {/* Hand */}
                            <circle cx="27.5" cy="68" r="3.2" fill={skinShadow} />
                        </g>

                        {/* === RECHTER ARM (mit Pendel, gegenphasig) === */}
                        <g>
                            <animateTransform attributeName="transform" type="rotate"
                                values="-22,58,42;22,58,42;-22,58,42" dur={dur} repeatCount="indefinite" />
                            {/* Oberarm */}
                            <rect x="57" y="40" width="11" height="18" rx="4" fill={jacke} />
                            {/* Warnstreifen */}
                            <rect x="57" y="55" width="11" height="2" fill="#f39c12" opacity="0.85" />
                            {/* Unterarm */}
                            <rect x="58" y="56" width="9" height="11" rx="3.5" fill={skin} />
                            {/* Hand */}
                            <circle cx="62.5" cy="68" r="3.2" fill={skinShadow} />
                        </g>

                        {/* === LINKES BEIN (gegenphasig zum linken Arm) === */}
                        <g>
                            <animateTransform attributeName="transform" type="rotate"
                                values="-22,40,70;22,40,70;-22,40,70" dur={dur} repeatCount="indefinite" />
                            {/* Hose Oberschenkel */}
                            <rect x="34" y="69" width="10" height="20" rx="3" fill={hose} />
                            {/* Hose Unterschenkel */}
                            <rect x="34" y="87" width="10" height="20" rx="3" fill={hose} />
                            {/* Knie-Highlight */}
                            <ellipse cx="39" cy="89" rx="4" ry="2" fill="#000000" opacity="0.15" />
                            {/* Schuh */}
                            <ellipse cx="39" cy="111" rx="8" ry="4" fill={schuh} />
                            <ellipse cx="39" cy="113" rx="8.5" ry="2" fill="#1a1a1a" />
                            {/* Schuh-Highlight */}
                            <ellipse cx="37" cy="109" rx="3" ry="1.5" fill="#ffffff" opacity="0.2" />
                        </g>

                        {/* === RECHTES BEIN === */}
                        <g>
                            <animateTransform attributeName="transform" type="rotate"
                                values="22,50,70;-22,50,70;22,50,70" dur={dur} repeatCount="indefinite" />
                            <rect x="46" y="69" width="10" height="20" rx="3" fill={hose} />
                            <rect x="46" y="87" width="10" height="20" rx="3" fill={hose} />
                            <ellipse cx="51" cy="89" rx="4" ry="2" fill="#000000" opacity="0.15" />
                            <ellipse cx="51" cy="111" rx="8" ry="4" fill={schuh} />
                            <ellipse cx="51" cy="113" rx="8.5" ry="2" fill="#1a1a1a" />
                            <ellipse cx="49" cy="109" rx="3" ry="1.5" fill="#ffffff" opacity="0.2" />
                        </g>
                    </g>
                </svg>
            );
        }

        function BauteamAnimation() {
            // Container fuer beide Figuren - laufen gemeinsam ueber den Bildschirm
            // Container 200px hoch - genug Platz fuer Figur (125px) + 72px Abstand vom unteren Rand
            // Figuren und Boden sitzen auf gleicher Basislinie
            return (
                <div style={{position:'relative', height:'200px', marginTop:'auto', width:'100%', overflow:'hidden', pointerEvents:'none'}}>
                    {/* Fliesenstreifen als Boden */}
                    <div style={{position:'absolute', bottom:'72px', left:0, right:0, height:'2px',
                                 background:'linear-gradient(90deg, transparent 3%, rgba(149,165,166,0.4) 15%, rgba(149,165,166,0.5) 50%, rgba(149,165,166,0.4) 85%, transparent 97%)'}} />

                    {/* Bauteam laeuft */}
                    <div className="tw-bauteam-walker" style={{position:'absolute', bottom:'72px', display:'flex', gap:'14px', alignItems:'flex-end'}}>
                        {/* Ivan - blaue Jacke */}
                        <BauarbeiterFigur
                            name="IVAN"
                            jacke="#2471a3"
                            hose="#2c3e50"
                            helm="#f1c40f"
                            schuh="#5d4037"
                            mirror={false}
                        />
                        {/* Michal - gruene Jacke */}
                        <BauarbeiterFigur
                            name="MICHAL"
                            jacke="#27ae60"
                            hose="#34495e"
                            helm="#e67e22"
                            schuh="#5d4037"
                            mirror={false}
                        />
                    </div>

                    {/* Frisch verlegte Fliesen hinter dem Team */}
                    <div className="tw-bauteam-tiles" style={{position:'absolute', bottom:'72px', display:'flex', gap:'2px', alignItems:'flex-end'}}>
                        <span style={{display:'inline-block', width:'14px', height:'14px', background:'rgba(77,166,255,0.45)', border:'1px solid rgba(77,166,255,0.3)', borderRadius:'2px'}} />
                        <span style={{display:'inline-block', width:'14px', height:'14px', background:'rgba(77,166,255,0.38)', border:'1px solid rgba(77,166,255,0.25)', borderRadius:'2px'}} />
                        <span style={{display:'inline-block', width:'14px', height:'14px', background:'rgba(77,166,255,0.30)', border:'1px solid rgba(77,166,255,0.20)', borderRadius:'2px'}} />
                        <span style={{display:'inline-block', width:'14px', height:'14px', background:'rgba(77,166,255,0.22)', border:'1px solid rgba(77,166,255,0.15)', borderRadius:'2px'}} />
                        <span style={{display:'inline-block', width:'14px', height:'14px', background:'rgba(77,166,255,0.15)', border:'1px solid rgba(77,166,255,0.10)', borderRadius:'2px'}} />
                        <span style={{display:'inline-block', width:'14px', height:'14px', background:'rgba(77,166,255,0.08)', border:'1px solid rgba(77,166,255,0.05)', borderRadius:'2px'}} />
                    </div>

                    <style dangerouslySetInnerHTML={{__html: '\n.tw-bauteam-walker { animation: twTeamWalk 18s linear infinite; }\n@keyframes twTeamWalk { 0% { left: -220px; } 100% { left: calc(100% + 30px); } }\n.tw-bauteam-tiles { animation: twTeamTiles 18s linear infinite; }\n@keyframes twTeamTiles { 0% { left: -310px; } 100% { left: calc(100% - 60px); } }\n'}} />
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           NAV HEADER COMPONENT
           ═══════════════════════════════════════════ */
        function NavHeader({ page, onBack, onForward, canBack, canForward }) {
            return (
                <header className="app-header">
                    <div className="nav-bar">
                        <button className="nav-btn" disabled={!canBack} onClick={onBack}>
                            ◀
                        </button>
                        <button className="nav-btn" disabled={!canForward} onClick={onForward}>
                            ▶
                        </button>
                    </div>
                    <span className="header-title">TW Business Suite</span>
                    <span className="header-version">v1.0</span>
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
                    // Prüfe ob Google APIs geladen sind
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
           MODULWAHL -- Dashboard nach Kundenauswahl
           ═══════════════════════════════════════════ */
