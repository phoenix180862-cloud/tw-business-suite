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
           ORDNER-BROWSER -- Offline-Dateien sichten
           Zeigt die von Google Drive heruntergeladene
           Ordnerstruktur mit allen Dokumenten
           ═══════════════════════════════════════════ */
        function OrdnerBrowser({ kunde, onBack, onGoToDaten }) {
            var [tree, setTree] = useState(null);
            var [loading, setLoading] = useState(true);
            var [currentFolder, setCurrentFolder] = useState(null);
            var [breadcrumb, setBreadcrumb] = useState([]);
            var [openFileUrl, setOpenFileUrl] = useState(null);
            var [openFileName, setOpenFileName] = useState('');
            var [error, setError] = useState(null);
            var [appOrdner, setAppOrdner] = useState({});
            var [syncProgress, setSyncProgress] = useState(null);
            var [liveMode, setLiveMode] = useState(false);
            var [liveFolders, setLiveFolders] = useState([]);
            var [liveFiles, setLiveFiles] = useState([]);
            var [storageInfo, setStorageInfo] = useState(null);

            var kundeId = kunde ? (kunde._driveFolderId || kunde.id || kunde.name) : null;
            var driveFolderId = kunde ? (kunde._driveFolderId || kunde.id) : null;
            var kundeName = kunde ? (kunde.name || kunde.auftraggeber || 'Kunde') : 'Kunde';

            // Daten laden: Erst IndexedDB, dann Live-Drive-Fallback
            useEffect(function() {
                if (!kundeId) { setLoading(false); setError('Kein Kunde.'); return; }
                var cancelled = false;

                async function load() {
                    setLoading(true); setError(null);

                    // 1. Versuche IndexedDB
                    var offlineTree = [];
                    var appFiles = {};
                    if (window.TWStorage && window.TWStorage.isReady()) {
                        try {
                            offlineTree = await TWStorage.OfflineBrowser.getFullTree(kundeId) || [];
                            appFiles = await TWStorage.getAppDateienByOrdner(kundeId) || {};
                            var sInfo = await TWStorage.getKundeStorageSize(kundeId);
                            if (!cancelled) setStorageInfo(sInfo);
                        } catch(e) { console.warn('[OrdnerBrowser] DB-Fehler:', e); }
                    }
                    if (cancelled) return;
                    setAppOrdner(appFiles);

                    if (offlineTree.length > 0) {
                        setTree(offlineTree);
                        setLiveMode(false);
                        setLoading(false);
                        console.log('[OrdnerBrowser] Offline:', offlineTree.length, 'Ordner');
                        return;
                    }

                    // 2. Fallback: LIVE von Drive laden (sofort sichtbar)
                    var service = window.GoogleDriveService;
                    if (driveFolderId && service && service.accessToken) {
                        try {
                            console.log('[OrdnerBrowser] Kein Cache, lade LIVE von Drive...');
                            var contents = await service.listFolderContents(driveFolderId);
                            if (cancelled) return;
                            setLiveMode(true);
                            setLiveFolders(contents.folders || []);
                            setLiveFiles(contents.files || []);
                            setLoading(false);

                            // Hintergrund-Sync starten
                            if (window.TWStorage && window.TWStorage.DriveSync) {
                                setSyncProgress('Speichere fuer Offline-Zugriff...');
                                TWStorage.DriveSync.syncKundenOrdner(kundeId, driveFolderId, function(info) {
                                    if (!cancelled) setSyncProgress(info.message);
                                }).then(function(res) {
                                    if (cancelled) return;
                                    setSyncProgress(null);
                                    // Baum aus DB nachladen
                                    return TWStorage.OfflineBrowser.getFullTree(kundeId);
                                }).then(function(ft) {
                                    if (cancelled || !ft || ft.length === 0) return;
                                    setTree(ft);
                                    setLiveMode(false);
                                }).catch(function(e) {
                                    if (!cancelled) setSyncProgress(null);
                                    console.warn('[OrdnerBrowser] Hintergrund-Sync:', e.message);
                                });
                            }
                        } catch(e) {
                            if (!cancelled) { setError('Drive-Fehler: ' + e.message); setLoading(false); }
                        }
                    } else {
                        setLoading(false);
                        setError('Keine Offline-Daten und kein Drive-Zugang.');
                    }
                }

                load();
                return function() { cancelled = true; };
            }, [kundeId]);

            // Datei oeffnen
            var handleOpenFile = function(dateiId, fileName, isAppFile, liveDriveFileId) {
                if (liveDriveFileId) {
                    var svc = window.GoogleDriveService;
                    if (!svc || !svc.accessToken) { alert('Google Drive nicht verbunden.'); return; }

                    // Zuerst Metadaten laden um mimeType zu kennen
                    svc._fetchJSON('https://www.googleapis.com/drive/v3/files/' + liveDriveFileId + '?fields=id,name,mimeType')
                        .then(function(meta) {
                            var mime = meta.mimeType || '';
                            // Google-native Docs: Export als PDF/XLSX
                            if (mime === 'application/vnd.google-apps.document') {
                                return svc._fetch('https://www.googleapis.com/drive/v3/files/' + liveDriveFileId + '/export?mimeType=application/pdf').then(function(r){return r.blob();});
                            }
                            if (mime === 'application/vnd.google-apps.spreadsheet') {
                                return svc._fetch('https://www.googleapis.com/drive/v3/files/' + liveDriveFileId + '/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').then(function(r){return r.blob();});
                            }
                            if (mime === 'application/vnd.google-apps.presentation') {
                                return svc._fetch('https://www.googleapis.com/drive/v3/files/' + liveDriveFileId + '/export?mimeType=application/pdf').then(function(r){return r.blob();});
                            }
                            // Normale Datei: direkter Download
                            return svc.downloadFile(liveDriveFileId);
                        })
                        .then(function(blob) {
                            if (blob && blob.size > 0) {
                                setOpenFileUrl(URL.createObjectURL(blob));
                                setOpenFileName(fileName);
                            } else {
                                alert('Datei konnte nicht geladen werden: ' + fileName);
                            }
                        })
                        .catch(function(e) {
                            alert('Fehler beim Laden von "' + fileName + '":\n' + e.message);
                        });
                    return;
                }
                // Offline / App-Datei
                if (isAppFile) {
                    if (!window.TWStorage) { alert('Speicher nicht bereit.'); return; }
                    TWStorage.openAppDatei(dateiId).then(function(r) {
                        if (r && r.url) { setOpenFileUrl(r.url); setOpenFileName(fileName); }
                        else { alert('App-Datei nicht gefunden.'); }
                    }).catch(function(e) { alert('Fehler: ' + e.message); });
                } else {
                    if (!window.TWStorage) { alert('Speicher nicht bereit.'); return; }
                    TWStorage.OfflineBrowser.openFile(dateiId).then(function(r) {
                        if (r && r.url) { setOpenFileUrl(r.url); setOpenFileName(fileName); }
                        else { alert('Offline-Datei nicht gefunden.'); }
                    }).catch(function(e) { alert('Fehler: ' + e.message); });
                }
            };

            // Ordner-Navigation
            var navigateToFolder = function(folder) {
                setBreadcrumb(function(prev) { return prev.concat([{ id: folder.id, name: folder.name }]); });
                setCurrentFolder(folder);
                
                if (liveMode && folder.id && !folder._isAppOrdner) {
                    // Dateien aus dem Ordner-Objekt sofort anzeigen
                    if (folder.files && folder.files.length > 0) {
                        setLiveFiles(folder.files);
                        setLiveFolders([]);
                    } else {
                        setLiveFiles([]);
                        setLiveFolders([]);
                    }
                    // Unterordner-Inhalt von Drive nachladen (OHNE loading-Blocker)
                    var svc = window.GoogleDriveService;
                    if (svc && svc.accessToken) {
                        svc.listFolderContents(folder.id).then(function(c) {
                            setLiveFolders(c.folders || []);
                            // Dateien nur aktualisieren wenn das Nachladen mehr liefert
                            if (c.files && c.files.length > 0) {
                                setLiveFiles(c.files);
                            }
                        }).catch(function(e) { console.warn('Ordner nachladen:', e); });
                    }
                }
            };
            var navigateUp = function() {
                setBreadcrumb(function(prev) {
                    if (prev.length <= 1) {
                        setCurrentFolder(null);
                        if (liveMode && driveFolderId) {
                            var svc = window.GoogleDriveService;
                            if (svc && svc.accessToken) {
                                setLoading(true);
                                svc.listFolderContents(driveFolderId).then(function(c) {
                                    setLiveFolders(c.folders || []); setLiveFiles(c.files || []); setLoading(false);
                                }).catch(function() { setLoading(false); });
                            }
                        }
                        return [];
                    }
                    var nc = prev.slice(0, -1);
                    if (!liveMode) { var t = findFolderInTree(tree, nc[nc.length-1].id); setCurrentFolder(t); }
                    return nc;
                });
            };
            var navigateRoot = function() { setCurrentFolder(null); setBreadcrumb([]); };

            function findFolderInTree(nodes, fid) {
                if (!nodes) return null;
                for (var i = 0; i < nodes.length; i++) {
                    if (nodes[i].id === fid) return nodes[i];
                    var f = findFolderInTree(nodes[i].subfolders, fid);
                    if (f) return f;
                }
                return null;
            }

            var fileIcon = function(t) {
                return t === 'pdf' ? '\uD83D\uDCC4' : t === 'xlsx' || t === 'xls' ? '\uD83D\uDCCA'
                    : t === 'doc' || t === 'docx' ? '\uD83D\uDDD2' : t === 'gdoc' ? '\uD83D\uDCC3'
                    : t === 'gsheet' ? '\uD83D\uDCCA' : t === 'img' ? '\uD83D\uDDBC' : '\uD83D\uDCC1';
            };
            var formatBytes = function(b) {
                if (!b || b === 0) return '-';
                return b < 1024 ? b+' B' : b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';
            };

            // Angezeigte Daten bestimmen
            var displayFolders, displayFiles;
            if (liveMode) {
                if (currentFolder) {
                    // Im Ordner: liveFolders = Unterordner, Dateien aus currentFolder.files ODER liveFiles
                    displayFolders = liveFolders || [];
                    // Prioritaet: liveFiles (wenn frisch geladen), sonst currentFolder.files
                    displayFiles = (liveFiles && liveFiles.length > 0) ? liveFiles : (currentFolder.files || []);
                } else {
                    // Root: Ordner aus liveFolders, Root-Dateien aus liveFiles
                    displayFolders = liveFolders || [];
                    displayFiles = liveFiles || [];
                }
            } else {
                displayFolders = currentFolder ? (currentFolder.subfolders || []) : (tree || []);
                displayFiles = currentFolder ? (currentFolder.files || []) : [];
            }

            var appOrdnerNames = Object.keys(appOrdner);
            var isInAppOrdner = currentFolder && currentFolder._isAppOrdner;
            var currentAppFiles = isInAppOrdner ? (appOrdner[currentFolder.name] || []) : [];
            var appVirtualFolders = [];
            if (!currentFolder) {
                appOrdnerNames.forEach(function(n) {
                    if (!displayFolders.some(function(f) { return f.name === n; })) {
                        appVirtualFolders.push({ id: 'app_'+n, name: n, _isAppOrdner: true, files: appOrdner[n]||[], subfolders: [] });
                    }
                });
            }
            if (currentFolder && !isInAppOrdner && appOrdner[currentFolder.name]) {
                displayFiles = displayFiles.concat(appOrdner[currentFolder.name]);
            }

            var touchBtnStyle = touchBtn;

            return (
                <div style={{padding:'16px', minHeight:'100vh', background:'var(--bg-primary)'}}>
                    {/* Header */}
                    <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px'}}>
                        <button onClick={onBack} style={{...touchBtn, padding:'8px 14px', borderRadius:'10px', border:'1px solid var(--border-color)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:'14px', fontWeight:'600'}}>
                            {'\u2190'}
                        </button>
                        <div style={{flex:1}}>
                            <div style={{fontSize:'18px', fontWeight:'700', color:'var(--text-primary)', display:'flex', alignItems:'center', gap:'8px'}}>
                                {'\uD83D\uDCC1'} Ordner: {kundeName.split(' \u2013 ')[0]}
                                <span style={{fontSize:'10px', padding:'2px 8px', borderRadius:'6px', background: liveMode ? 'rgba(230,126,34,0.15)' : 'rgba(39,174,96,0.15)', color: liveMode ? '#e67e22' : '#27ae60', fontWeight:'700'}}>
                                    {liveMode ? '\u26A1 LIVE' : '\u2705 OFFLINE'}
                                </span>
                            </div>
                            <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'2px'}}>
                                {storageInfo ? (storageInfo.fileCount + ' Dateien \u00B7 ' + storageInfo.totalMB + ' MB gespeichert') : (liveMode ? 'Daten werden direkt von Google Drive geladen' : '')}
                            </div>
                        </div>
                    </div>

                    {/* Wechsel-Buttons: Ordner / Kundendaten */}
                    <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
                        <button style={{...touchBtn, flex:1, padding:'10px', borderRadius:'10px', border:'none', background:'linear-gradient(135deg, #2980b9 0%, #1a5276 100%)', color:'#fff', fontSize:'13px', fontWeight:'700', cursor:'pointer', boxShadow:'0 3px 10px rgba(41,128,185,0.3)'}}>
                            {'D83DDCC1'} Ordner-Ansicht
                        </button>
                        <button onClick={onGoToDaten} style={{...touchBtn, flex:1, padding:'10px', borderRadius:'10px', border:'1px solid var(--border-color)', background:'var(--bg-secondary)', color:'var(--text-secondary)', fontSize:'13px', fontWeight:'700', cursor:'pointer'}}>
                            {'D83DDCCB'} Kundendaten
                        </button>
                    </div>

                    {/* Breadcrumb */}
                    {breadcrumb.length > 0 && (
                        <div style={{display:'flex', alignItems:'center', gap:'4px', marginBottom:'12px', flexWrap:'wrap'}}>
                            <span onClick={navigateRoot} style={{...touchBtn, cursor:'pointer', fontSize:'12px', color:'var(--accent-blue)', fontWeight:'600'}}>\uD83C\uDFE0 Root</span>
                            {breadcrumb.map(function(crumb, idx) {
                                var isLast = idx === breadcrumb.length - 1;
                                return (
                                    <React.Fragment key={crumb.id}>
                                        <span style={{color:'var(--text-muted)', fontSize:'11px'}}>{'203A'}</span>
                                        <span
                                            onClick={isLast ? undefined : function() {
                                                var target = findFolderInTree(tree, crumb.id);
                                                setCurrentFolder(target);
                                                setBreadcrumb(function(prev) { return prev.slice(0, idx + 1); });
                                            }}
                                            style={{...touchBtn, cursor: isLast ? 'default' : 'pointer', fontSize:'12px', color: isLast ? 'var(--text-primary)' : 'var(--accent-blue)', fontWeight: isLast ? '700' : '600', maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}
                                        >
                                            {crumb.name}
                                        </span>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}

                    {/* Zurueck-Button im Ordner */}
                    {currentFolder && (
                        <button onClick={navigateUp} style={{...touchBtn, display:'flex', alignItems:'center', gap:'8px', width:'100%', padding:'12px', marginBottom:'8px', borderRadius:'10px', border:'1px dashed var(--border-color)', background:'transparent', cursor:'pointer', color:'var(--text-muted)', fontSize:'13px', fontWeight:'600'}}>
                            <span style={{fontSize:'18px'}}>{'\u2B06\uFE0F'}</span>
                            {'\u00DCbergeordneter Ordner'}
                        </button>
                    )}

                    {/* Loading / Sync-Fortschritt (nur wenn noch keine Daten sichtbar) */}
                    {loading && displayFolders.length === 0 && displayFiles.length === 0 && appVirtualFolders.length === 0 && (
                        <div style={{textAlign:'center', padding:'40px', color:'var(--text-muted)'}}>
                            <div style={{fontSize:'36px', marginBottom:'12px'}}>&#x1F504;</div>
                            <div style={{fontSize:'14px', fontWeight:'600', marginBottom:'8px'}}>
                                Ordner werden geladen...
                            </div>
                        </div>
                    )}

                    {/* Sync-Fortschritt als dezente Info-Leiste (wenn Daten schon sichtbar) */}
                    {syncProgress && !loading && (
                        <div style={{fontSize:'11px', color:'var(--accent-blue)', padding:'8px 12px', borderRadius:'8px', background:'rgba(30,136,229,0.08)', marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px'}}>
                            <span style={{animation:'spin 1s linear infinite', display:'inline-block'}}>&#x1F504;</span>
                            {syncProgress}
                        </div>
                    )}

                    {/* Error */}
                    {error && !loading && (
                        <div style={{padding:'20px', borderRadius:'12px', background:'rgba(231,76,60,0.1)', border:'1px solid rgba(231,76,60,0.3)', color:'#e74c3c', fontSize:'13px', textAlign:'center', marginBottom:'16px'}}>
                            {error}
                        </div>
                    )}

                    {/* Ordner-Liste (Drive + App-Ordner) */}
                    {!loading && (displayFolders.length > 0 || appVirtualFolders.length > 0) && (
                        <div style={{display:'flex', flexDirection:'column', gap:'6px', marginBottom:'12px'}}>
                            {displayFolders.concat(appVirtualFolders).map(function(folder) {
                                var isApp = folder._isAppOrdner;
                                var fCount = folder.files ? folder.files.length : 0;
                                return (
                                    <button key={folder.id || folder.name} onClick={function() { navigateToFolder(folder); }}
                                        style={{...touchBtn, display:'flex', alignItems:'center', gap:'12px', width:'100%', padding:'14px', borderRadius:'12px', border: isApp ? '1px solid rgba(39,174,96,0.3)' : '1px solid var(--border-color)', background: isApp ? 'rgba(39,174,96,0.08)' : 'var(--bg-secondary)', cursor:'pointer', textAlign:'left'}}>
                                        <span style={{fontSize:'28px'}}>{isApp ? '\uD83D\uDCDD' : '\uD83D\uDCC1'}</span>
                                        <div style={{flex:1, minWidth:0}}>
                                            <div style={{fontSize:'14px', fontWeight:'700', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                                {folder.name}
                                                {isApp && <span style={{fontSize:'10px', fontWeight:'600', color:'#27ae60', marginLeft:'8px', verticalAlign:'middle'}}>APP</span>}
                                            </div>
                                            <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'2px'}}>
                                                {fCount > 0 ? (fCount + ' Dateien') : 'Ordner'}
                                                {folder.subfolders && folder.subfolders.length > 0 && (' \u00B7 ' + folder.subfolders.length + ' Unterordner')}
                                            </div>
                                        </div>
                                        <span style={{color:'var(--text-muted)', fontSize:'18px'}}>{'\u203A'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* App-Dateien im aktuellen App-Ordner */}
                    {!loading && isInAppOrdner && currentAppFiles.length > 0 && (
                        <div style={{marginTop:'8px'}}>
                            <div style={{fontSize:'11px', fontWeight:'700', color:'#27ae60', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'8px', paddingLeft:'4px'}}>
                                In der App erstellt ({currentAppFiles.length})
                            </div>
                            <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                                {currentAppFiles.map(function(datei) {
                                    return (
                                        <button key={datei.id} onClick={function() { handleOpenFile(datei.id, datei.name, true); }}
                                            style={{...touchBtn, display:'flex', alignItems:'center', gap:'10px', width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid rgba(39,174,96,0.25)', background:'rgba(39,174,96,0.06)', cursor:'pointer', textAlign:'left'}}>
                                            <span style={{fontSize:'22px'}}>{fileIcon(datei.fileType)}</span>
                                            <div style={{flex:1, minWidth:0}}>
                                                <div style={{fontSize:'13px', fontWeight:'600', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{datei.name}</div>
                                                <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'2px'}}>
                                                    {formatBytes(datei.sizeBytes)}
                                                    {datei.syncStatus === 'pending' && ' · ⏳ Nicht synchronisiert'}
                                                    {datei.syncStatus === 'synced' && ' · ✅ Synchronisiert'}
                                                </div>
                                            </div>
                                            <span style={{fontSize:'11px', padding:'3px 8px', borderRadius:'6px', background:'rgba(39,174,96,0.15)', color:'#27ae60', fontWeight:'700'}}>
                                                Öffnen
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Dateien-Liste (Drive-Dateien + gemischte App-Dateien) */}
                    {!isInAppOrdner && displayFiles.length > 0 && (
                        <div style={{marginTop:'8px'}}>
                            <div style={{fontSize:'11px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'8px', paddingLeft:'4px'}}>
                                Dateien ({displayFiles.length})
                            </div>
                            <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                                {displayFiles.map(function(datei) {
                                    var isApp = datei.isAppCreated;
                                    var liveId = liveMode ? (datei.id || datei.driveId) : null;
                                    var fType = datei.fileType || datei.type || 'sonstige';
                                    var fSize = datei.sizeBytes ? formatBytes(datei.sizeBytes) : (datei.size || '-');
                                    return (
                                        <button key={datei.id || datei.name} onClick={function() { handleOpenFile(datei.id, datei.name, isApp, liveId); }}
                                            style={{...touchBtn, display:'flex', alignItems:'center', gap:'10px', width:'100%', padding:'12px', borderRadius:'10px', border: isApp ? '1px solid rgba(39,174,96,0.25)' : '1px solid var(--border-color)', background: isApp ? 'rgba(39,174,96,0.06)' : 'var(--bg-tertiary)', cursor:'pointer', textAlign:'left'}}>
                                            <span style={{fontSize:'22px'}}>{fileIcon(fType)}</span>
                                            <div style={{flex:1, minWidth:0}}>
                                                <div style={{fontSize:'13px', fontWeight:'600', color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                                    {datei.name}
                                                    {isApp && <span style={{fontSize:'9px', fontWeight:'700', color:'#27ae60', marginLeft:'6px', verticalAlign:'middle'}}>APP</span>}
                                                </div>
                                                <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'2px'}}>
                                                    {fSize}
                                                    {datei.syncedAt && (' \u00B7 ' + new Date(datei.syncedAt).toLocaleDateString('de-DE'))}
                                                    {isApp && datei.syncStatus === 'pending' && ' \u00B7 \u23F3 Sync ausstehend'}
                                                </div>
                                            </div>
                                            <span style={{fontSize:'11px', padding:'3px 8px', borderRadius:'6px', background: isApp ? 'rgba(39,174,96,0.15)' : 'rgba(30,136,229,0.15)', color: isApp ? '#27ae60' : 'var(--accent-blue)', fontWeight:'700'}}>
                                                \u00D6ffnen
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Keine Dateien */}
                    {!loading && !error && currentFolder && displayFiles.length === 0 && displayFolders.length === 0 && (
                        <div style={{textAlign:'center', padding:'30px', color:'var(--text-muted)', fontSize:'13px'}}>
                            Dieser Ordner ist leer.
                        </div>
                    )}

                    {/* Datei-Viewer Overlay */}
                    {openFileUrl && (
                        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:9000, background:'rgba(0,0,0,0.9)', display:'flex', flexDirection:'column'}}>
                            <div style={{display:'flex', alignItems:'center', gap:'10px', padding:'12px 16px', background:'#1a2332', borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                                <button onClick={function() { URL.revokeObjectURL(openFileUrl); setOpenFileUrl(null); setOpenFileName(''); }}
                                    style={{...touchBtn, padding:'8px 16px', borderRadius:'8px', border:'none', background:'#e74c3c', color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:'700'}}>
                                    ✕ Schließen
                                </button>
                                <div style={{flex:1, fontSize:'13px', color:'rgba(255,255,255,0.8)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                    {openFileName}
                                </div>
                                <a href={openFileUrl} download={openFileName}
                                    style={{...touchBtn, padding:'8px 16px', borderRadius:'8px', border:'none', background:'#27ae60', color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:'700', textDecoration:'none'}}>
                                    ⬇ Download
                                </a>
                            </div>
                            <iframe src={openFileUrl} style={{flex:1, border:'none', width:'100%'}} title={openFileName} />
                        </div>
                    )}
                </div>
            );
        }

        /* ═══════════════════════════════════════════
           MODULWAHL -- Dashboard nach Kundenauswahl
           ═══════════════════════════════════════════ */
