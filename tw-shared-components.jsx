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
            if (!positionen || !Array.isArray(positionen)) return {};
            const groups = {};
            positionen.forEach(p => {
                if (!p) return;
                const key = (p.bez || '').trim();
                if (!key) return;
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
           MODULWAHL -- Dashboard nach Kundenauswahl
           ═══════════════════════════════════════════ */