/* =====================================================================
   TW BUSINESS SUITE -- Nav-Dropdowns V2 (Platzoptimierung & Toolbar)
   Stand: 25.04.2026

   ZWECK V2:
   Komplett-Rewrite der NavDropdown / AktionDropdown Komponenten gemaess
   SKILL-platzoptimierung-toolbar.md (Teil C).

   AENDERUNGEN GEGENUEBER V1:
   - Submenues klappen jetzt als AKKORDEON nach unten auf (nicht mehr
     rechts daneben). Damit kein Abschneide-Problem auf dem Handy.
   - Auf Mobile (< 600px Breite) werden Dropdowns zu BOTTOM-SHEETS,
     die von unten ins Bild gleiten. Spuerbar bessere Bedienbarkeit.
   - Robuste Touch-Handler: onPointerDown mit stopPropagation auf dem
     Trigger-Button, kein onMouseDown mehr.
   - Jedes Dropdown hat seinen eigenen useState -- mehrere koennen
     gleichzeitig offen sein (Skill 9.2).
   - touchAction:'manipulation' auf allen interaktiven Elementen.

   API-Kompatibilitaet zu V1: VOLL.
   - NavDropdown(props) mit currentMode, targets, color, style
   - AktionDropdown(props) mit label, actions, align, color, style
   - actions[] unterstuetzt: regulaere Items, type:'divider',
     type:'submenu' mit items[], und subItems[] auf normalen Items.

   Komponenten werden weiterhin als bereits-kompiliertes JS ausgeliefert
   (kein JSX), damit sie vor dem Babel-Bundle geladen werden koennen.
   ===================================================================== */

(function(global) {
    'use strict';

    var React = global.React;
    if (!React) { console.error('[TW-NavDropdowns V2] React nicht geladen'); return; }
    var useState  = React.useState;
    var useEffect = React.useEffect;
    var useRef    = React.useRef;

    // ---- Hilfsfunktion: Mobile-Breakpoint ----
    // Wir lesen die Breite zur Render-Zeit -- bei Drehung des Tablets
    // ist das ausreichend, weil React beim Resize neu rendert (resize-Listener
    // im Hook unten).
    function useIsMobile() {
        var initial = (typeof window !== 'undefined') ? (window.innerWidth < 600) : false;
        var pair = useState(initial);
        var isMobile = pair[0];
        var setIsMobile = pair[1];
        useEffect(function() {
            var handler = function() {
                var nowMobile = window.innerWidth < 600;
                setIsMobile(function(prev) { return prev !== nowMobile ? nowMobile : prev; });
            };
            window.addEventListener('resize', handler);
            window.addEventListener('orientationchange', handler);
            return function() {
                window.removeEventListener('resize', handler);
                window.removeEventListener('orientationchange', handler);
            };
        }, []);
        return isMobile;
    }

    // ---- Click-Outside-Hook (schliesst NUR dieses Dropdown) ----
    function useClickOutside(ref, isOpen, onClose) {
        useEffect(function() {
            if (!isOpen) return undefined;
            var handler = function(e) {
                if (!ref.current) return;
                // Klick im Wrapper -> ignorieren
                if (ref.current.contains(e.target)) return;
                // Klick im Bottom-Sheet-Portal: pruefen ob es zu UNS gehoert
                if (e.target && e.target.closest) {
                    var clickedPanel = e.target.closest('[data-tw-dropdown-id]');
                    if (clickedPanel) {
                        // Eigenes Panel? -> ignorieren (Click hat eigenen Handler)
                        var ownPanelId = ref.current.getAttribute('data-tw-owner-id');
                        var clickedId  = clickedPanel.getAttribute('data-tw-dropdown-id');
                        if (ownPanelId && clickedId && ownPanelId === clickedId) return;
                    }
                }
                onClose();
            };
            var keyHandler = function(e) {
                if (e.key === 'Escape') onClose();
            };
            // pointerdown deckt Maus + Touch ab
            document.addEventListener('pointerdown', handler);
            document.addEventListener('keydown', keyHandler);
            return function() {
                document.removeEventListener('pointerdown', handler);
                document.removeEventListener('keydown', keyHandler);
            };
        }, [isOpen]);
    }

    // ---- BOTTOM-SHEET (Mobile-Variante des Dropdown-Panels) ----
    function BottomSheet(props) {
        var title = props.title;
        var onClose = props.onClose;
        var children = props.children;
        var sheetId = props.sheetId;

        // Body-Scroll-Lock waehrend Sheet offen
        useEffect(function() {
            var prev = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return function() { document.body.style.overflow = prev; };
        }, []);

        return React.createElement(React.Fragment, null,
            // Backdrop
            React.createElement('div', {
                onClick: onClose,
                style: {
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.55)',
                    zIndex: 9998,
                    animation: 'fadeIn 0.18s ease'
                }
            }),
            // Sheet selbst
            React.createElement('div', {
                'data-tw-bottom-sheet': 'true',
                'data-tw-dropdown-id': sheetId,
                style: {
                    position: 'fixed',
                    bottom: 0, left: 0, right: 0,
                    background: 'var(--bg-secondary)',
                    borderTopLeftRadius: 'var(--radius-lg)',
                    borderTopRightRadius: 'var(--radius-lg)',
                    padding: '12px 12px 24px',
                    zIndex: 9999,
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                    animation: 'slideUpSheet 0.25s ease-out',
                    borderTop: '1px solid var(--border-color)'
                }
            },
                // Drag-Indikator
                React.createElement('div', { style: {
                    width: '40px', height: '4px',
                    background: 'var(--text-muted)',
                    borderRadius: '2px',
                    margin: '0 auto 12px', opacity: 0.5
                }}),
                // Titel
                title && React.createElement('div', { style: {
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: '13px', fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: '1px',
                    color: 'var(--text-white)',
                    marginBottom: '12px', padding: '0 4px'
                }}, title),
                // Inhalt
                children
            )
        );
    }

    // ---- DESKTOP-PANEL (klassisches Dropdown) ----
    function DesktopPanel(props) {
        var align = props.align || 'left';
        var children = props.children;
        var panelId = props.panelId;

        var panelStyle = {
            position: 'absolute',
            top: 'calc(100% + 6px)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '6px',
            minWidth: '220px',
            maxWidth: 'calc(100vw - 16px)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            maxHeight: '70vh',
            overflowY: 'auto',
            animation: 'twDropDown 0.16s ease-out'
        };
        if (align === 'right') {
            panelStyle.right = 0;
        } else {
            panelStyle.left = 0;
        }

        return React.createElement('div', {
            'data-tw-dropdown-panel': 'true',
            'data-tw-dropdown-id': panelId,
            className: 'tw-dropdown-panel',
            style: panelStyle,
            role: 'menu'
        }, children);
    }

    // ============================================================
    // === NavDropdown ============================================
    // ============================================================
    // Hauptmenue mit Modus-Liste. KEINE Submenues.
    function NavDropdown(props) {
        var currentMode = props.currentMode || 'Navigation';
        var targets = Array.isArray(props.targets) ? props.targets : [];
        var containerStyle = props.style || {};
        var color = props.color === 'blue' ? 'blue' : 'red';

        var palette = color === 'red' ? {
            mainGrad: 'linear-gradient(135deg, #e63535, #c41e1e)',
            mainShadow: 'rgba(196,30,30,0.30)'
        } : {
            mainGrad: 'linear-gradient(135deg, #1E88E5, #1565C0)',
            mainShadow: 'rgba(30,136,229,0.30)'
        };

        var openPair = useState(false);
        var open = openPair[0];
        var setOpen = openPair[1];
        var wrapperRef = useRef(null);
        var isMobile = useIsMobile();
        var panelIdRef = useRef('nav-' + Math.random().toString(36).slice(2, 9));

        var shownTargets = targets.filter(function(t) { return t && t.label !== currentMode; });

        useClickOutside(wrapperRef, open, function() { setOpen(false); });

        var handleSelect = function(target) {
            if (target.disabled) return;
            setOpen(false);
            if (typeof target.handler === 'function') {
                try { target.handler(); }
                catch(err) { console.error('NavDropdown handler:', err); }
            }
        };

        var mainBtnStyle = {
            padding: '8px 16px',
            minHeight: '36px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            background: palette.mainGrad,
            color: '#fff',
            fontSize: '12px',
            fontWeight: '700',
            fontFamily: 'Oswald, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 8px ' + palette.mainShadow,
            transition: 'all 0.18s ease',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            touchAction: 'manipulation',
            userSelect: 'none'
        };

        var renderItems = function() {
            return shownTargets.map(function(t) {
                return React.createElement('button', {
                    key: t.id || t.label,
                    type: 'button',
                    role: 'menuitem',
                    className: 'tw-nav-dropdown-item',
                    disabled: !!t.disabled,
                    onClick: function() { handleSelect(t); },
                    onPointerDown: function(e) { e.stopPropagation(); },
                    style: {
                        display: 'flex', alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '10px 12px',
                        minHeight: '42px',
                        border: 'none',
                        background: t.disabled ? 'rgba(120,120,120,0.12)' : 'transparent',
                        color: t.disabled ? 'rgba(255,255,255,0.45)' : 'var(--text-primary)',
                        fontFamily: 'Oswald, sans-serif',
                        fontSize: '13px',
                        fontWeight: '600',
                        textAlign: 'left',
                        cursor: t.disabled ? 'not-allowed' : 'pointer',
                        borderRadius: 'var(--radius-sm)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        touchAction: 'manipulation',
                        transition: 'background 0.12s ease',
                        opacity: t.disabled ? 0.5 : 1
                    },
                    onMouseOver: function(e) { if (!t.disabled) e.currentTarget.style.background = 'var(--bg-hover)'; },
                    onMouseOut: function(e) { if (!t.disabled) e.currentTarget.style.background = 'transparent'; }
                }, t.label);
            });
        };

        return React.createElement('div', {
            ref: wrapperRef,
            'data-tw-owner-id': panelIdRef.current,
            style: Object.assign({ position: 'relative', display: 'inline-block' }, containerStyle)
        },
            // Trigger-Button
            React.createElement('button', {
                type: 'button',
                style: mainBtnStyle,
                onPointerDown: function(e) { e.stopPropagation(); },
                onClick: function() { setOpen(function(v) { return !v; }); },
                'aria-haspopup': 'true',
                'aria-expanded': open,
                title: 'Navigation -- aktuell: ' + currentMode
            },
                React.createElement('span', null, currentMode),
                React.createElement('span', {
                    style: {
                        fontSize: '9px', opacity: 0.85,
                        transform: open ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.18s ease'
                    }
                }, '\u25BC')
            ),
            // Panel (Mobile = BottomSheet, Desktop = klassisch)
            open && shownTargets.length > 0 && (
                isMobile
                    ? React.createElement(BottomSheet, {
                        title: currentMode + ' \u2192 wechseln zu',
                        onClose: function() { setOpen(false); },
                        sheetId: panelIdRef.current
                    }, renderItems())
                    : React.createElement(DesktopPanel, {
                        align: 'left',
                        panelId: panelIdRef.current
                    }, renderItems())
            )
        );
    }

    // ============================================================
    // === AktionDropdown =========================================
    // ============================================================
    // Bearbeiten-Dropdown mit Items, Submenues (als Akkordeon!) und Dividern.
    function AktionDropdown(props) {
        var label = props.label || 'Bearbeiten';
        var actions = Array.isArray(props.actions) ? props.actions : [];
        var align = props.align || 'right';
        var containerStyle = props.style || {};
        var color = props.color === 'blue' ? 'blue' : 'red';

        var palette = color === 'red' ? {
            mainGrad: 'linear-gradient(135deg, #e63535, #c41e1e)',
            mainShadow: 'rgba(196,30,30,0.30)'
        } : {
            mainGrad: 'linear-gradient(135deg, #1E88E5, #1565C0)',
            mainShadow: 'rgba(30,136,229,0.30)'
        };

        var openPair = useState(false);
        var open = openPair[0];
        var setOpen = openPair[1];
        // expandedSub speichert die Sub-ID des derzeit ausgeklappten Akkordeon-Eintrags
        var subPair = useState(null);
        var expandedSub = subPair[0];
        var setExpandedSub = subPair[1];
        var wrapperRef = useRef(null);
        var isMobile = useIsMobile();
        var panelIdRef = useRef('akt-' + Math.random().toString(36).slice(2, 9));

        // Beim Schliessen: Akkordeons mit zuruecksetzen
        useEffect(function() {
            if (!open) setExpandedSub(null);
        }, [open]);

        useClickOutside(wrapperRef, open, function() {
            setOpen(false);
            setExpandedSub(null);
        });

        // Action-Format normalisieren
        var normalizeAction = function(a, idx) {
            if (!a) return null;
            if (a.type === 'divider') return { _divider: true, _key: 'div-' + idx };
            if (a.type === 'submenu') {
                return {
                    id: a.id || 'sub-' + idx,
                    label: a.label, icon: a.icon,
                    disabled: !!a.disabled, variant: a.variant,
                    _subItems: Array.isArray(a.items) ? a.items : []
                };
            }
            return {
                id: a.id || 'act-' + idx,
                label: a.label, icon: a.icon,
                disabled: !!a.disabled, destructive: !!a.destructive,
                variant: a.variant,
                handler: a.handler || a.onClick,
                _subItems: Array.isArray(a.subItems) ? a.subItems : []
            };
        };
        var normalized = actions.map(normalizeAction).filter(Boolean);

        var closeAll = function() {
            setOpen(false);
            setExpandedSub(null);
        };

        var triggerHandler = function(item) {
            if (item.disabled) return;
            var fn = item.handler || item.onClick;
            closeAll();
            if (typeof fn === 'function') {
                try { fn(); }
                catch(e) { console.error('AktionDropdown handler:', e); }
            }
        };

        // ---- Item-Renderer ----
        var renderItem = function(a) {
            if (a._divider) {
                return React.createElement('div', {
                    key: a._key,
                    style: {
                        height: '1px', background: 'var(--border-color)',
                        margin: '4px 6px'
                    }
                });
            }

            var hasSub = a._subItems && a._subItems.length > 0;
            var subOpen = hasSub && expandedSub === a.id;

            // Stylevariante
            var bg, fg, fontWeight, textTransform, letterSpacing;
            if (a.disabled) {
                bg = 'rgba(120,120,120,0.12)';
                fg = 'rgba(255,255,255,0.4)';
                fontWeight = '600'; textTransform = 'none'; letterSpacing = '0';
            } else if (a.variant === 'red') {
                bg = 'linear-gradient(135deg, rgba(230,53,53,0.85), rgba(196,30,30,0.85))';
                fg = '#fff';
                fontWeight = '700'; textTransform = 'uppercase'; letterSpacing = '0.4px';
            } else if (a.destructive) {
                bg = 'transparent';
                fg = 'var(--accent-red-light)';
                fontWeight = '600'; textTransform = 'none'; letterSpacing = '0';
            } else {
                bg = 'transparent';
                fg = 'var(--text-primary)';
                fontWeight = '600'; textTransform = 'none'; letterSpacing = '0';
            }

            var btnStyle = {
                padding: '10px 12px',
                minHeight: '42px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: a.disabled ? 'not-allowed' : 'pointer',
                background: bg,
                color: fg,
                fontSize: '13px',
                fontWeight: fontWeight,
                fontFamily: 'Oswald, sans-serif',
                textTransform: textTransform,
                letterSpacing: letterSpacing,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: a.disabled ? 0.55 : 1,
                width: '100%',
                boxSizing: 'border-box',
                transition: 'background 0.12s ease, filter 0.12s ease',
                touchAction: 'manipulation',
                userSelect: 'none'
            };

            var handleClick = function() {
                if (a.disabled) return;
                if (hasSub) {
                    setExpandedSub(subOpen ? null : a.id);
                    return;
                }
                triggerHandler(a);
            };

            var btn = React.createElement('button', {
                key: a.id,
                type: 'button',
                role: 'menuitem',
                className: 'tw-aktion-dropdown-item',
                disabled: a.disabled,
                style: btnStyle,
                onPointerDown: function(e) { e.stopPropagation(); },
                onClick: handleClick,
                onMouseOver: function(e) {
                    if (a.disabled) return;
                    if (a.variant === 'red') e.currentTarget.style.filter = 'brightness(1.15)';
                    else e.currentTarget.style.background = 'var(--bg-hover)';
                },
                onMouseOut: function(e) {
                    if (a.disabled) return;
                    if (a.variant === 'red') e.currentTarget.style.filter = 'none';
                    else e.currentTarget.style.background = bg;
                }
            },
                a.icon && React.createElement('span', { style: { fontSize: '15px', minWidth: '18px' } }, a.icon),
                React.createElement('span', { style: { flex: 1 } }, a.label),
                hasSub && React.createElement('span', {
                    style: {
                        fontSize: '10px',
                        opacity: 0.75,
                        transform: subOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.18s ease'
                    }
                }, '\u25BC')
            );

            // === AKKORDEON-SUB-ITEMS (Skill 9.4) ===
            // Submenue klappt NACH UNTEN auf, im selben Container, mit Einrueckung.
            if (hasSub && subOpen) {
                var subItemsRendered = a._subItems.map(function(si, j) {
                    return React.createElement('button', {
                        key: (si.id || si.label || j),
                        type: 'button',
                        role: 'menuitem',
                        className: 'tw-aktion-dropdown-subitem',
                        disabled: !!si.disabled,
                        onPointerDown: function(e) { e.stopPropagation(); },
                        onClick: function() { triggerHandler(si); },
                        style: {
                            display: 'flex', alignItems: 'center', gap: '10px',
                            width: '100%',
                            padding: '8px 10px',
                            minHeight: '38px',
                            border: 'none',
                            background: si.disabled ? 'rgba(120,120,120,0.10)' : 'transparent',
                            color: si.disabled ? 'rgba(255,255,255,0.4)' : 'var(--text-primary)',
                            fontFamily: 'Source Sans 3, sans-serif',
                            fontSize: '13px', fontWeight: '500',
                            textAlign: 'left',
                            cursor: si.disabled ? 'not-allowed' : 'pointer',
                            borderRadius: 'var(--radius-sm)',
                            opacity: si.disabled ? 0.55 : 1,
                            touchAction: 'manipulation',
                            transition: 'background 0.12s ease'
                        },
                        onMouseOver: function(e) { if (!si.disabled) e.currentTarget.style.background = 'var(--bg-hover)'; },
                        onMouseOut: function(e) { if (!si.disabled) e.currentTarget.style.background = 'transparent'; }
                    },
                        si.icon && React.createElement('span', { style: { fontSize: '14px', minWidth: '18px' } }, si.icon),
                        React.createElement('span', { style: { flex: 1 } }, si.label)
                    );
                });

                var subContainer = React.createElement('div', {
                    key: a.id + '-sub',
                    style: {
                        paddingLeft: '14px',
                        marginLeft: '8px',
                        marginRight: '4px',
                        marginTop: '2px',
                        marginBottom: '4px',
                        borderLeft: '2px solid var(--accent-red)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        animation: 'twAccordionDown 0.18s ease-out'
                    }
                }, subItemsRendered);

                return React.createElement(React.Fragment, { key: a.id }, btn, subContainer);
            }

            return btn;
        };

        var mainBtnStyle = {
            padding: '8px 16px',
            minHeight: '36px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            background: palette.mainGrad,
            color: '#fff',
            fontSize: '12px',
            fontWeight: '700',
            fontFamily: 'Oswald, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 8px ' + palette.mainShadow,
            transition: 'all 0.18s ease',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            touchAction: 'manipulation',
            userSelect: 'none'
        };

        return React.createElement('div', {
            ref: wrapperRef,
            'data-tw-owner-id': panelIdRef.current,
            style: Object.assign({ position: 'relative', display: 'inline-block' }, containerStyle)
        },
            React.createElement('button', {
                type: 'button',
                style: mainBtnStyle,
                onPointerDown: function(e) { e.stopPropagation(); },
                onClick: function() { setOpen(function(v) { return !v; }); },
                'aria-haspopup': 'true',
                'aria-expanded': open,
                title: label
            },
                React.createElement('span', { style: { fontSize: '13px' } }, '\u270E'),
                React.createElement('span', null, label),
                React.createElement('span', {
                    style: {
                        fontSize: '9px', opacity: 0.85,
                        transform: open ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.18s ease'
                    }
                }, '\u25BC')
            ),
            open && normalized.length > 0 && (
                isMobile
                    ? React.createElement(BottomSheet, {
                        title: label,
                        onClose: function() { closeAll(); },
                        sheetId: panelIdRef.current
                    }, normalized.map(renderItem))
                    : React.createElement(DesktopPanel, {
                        align: align,
                        panelId: panelIdRef.current
                    }, normalized.map(renderItem))
            )
        );
    }

    // ---- Globalen Scope befuellen (API-Kompat) ----
    global.NavDropdown    = NavDropdown;
    global.AktionDropdown = AktionDropdown;
    global.TWNavDropdownsV2 = {
        version: '2.0',
        NavDropdown: NavDropdown,
        AktionDropdown: AktionDropdown,
        BottomSheet: BottomSheet,
        DesktopPanel: DesktopPanel
    };

    console.log('%c[TW-NavDropdowns V2] geladen -- Akkordeon-Submenues + Bottom-Sheet-Mobile aktiv',
                'color: #1976D2; font-weight: bold;');

})(window);
