#!/bin/bash
# Build index.html aus Template + kompiliertem JS
set -e
cd /home/claude/work

# Cache-Bust Timestamp
CACHEBUST=$(date +%Y%m%d-%H%M%S)
echo "Cache-Bust: $CACHEBUST"

# Template nehmen und Placeholder ersetzen
sed "s/CACHEBUST_PLACEHOLDER/$CACHEBUST/g" index-template.html > index.html

# Script-Block-Start
cat >> index.html << 'EOF'

    <script type="text/javascript">
EOF

# _extends helper (von Babel als runtime benoetigt)
cat >> index.html << 'EOF'
function _extends(){return _extends=Object.assign?Object.assign.bind():function(n){for(var e=1;e<arguments.length;e++){var t=arguments[e];for(var r in t)({}).hasOwnProperty.call(t,r)&&(n[r]=t[r]);}return n;},_extends.apply(null,arguments);}
EOF

# Sentinel initialisieren
echo "window.__twSentinel={startedAt:Date.now(),built:\"$CACHEBUST\",completedModules:[]};" >> index.html

# React-Hooks werden aus tw-shared-components.jsx extrahiert (NICHT hier dupliziert!)

# Alle Module in korrekter Reihenfolge einfuegen mit Sentinel-Markers
for m in tw-shared-components tw-aufmass tw-modulwahl tw-rechnung tw-schriftverkehr tw-ausgangsbuch tw-baustelle tw-daten-uebersicht tw-app; do
    echo "window.__twSentinel.lastModule=\"$m.jsx\";" >> index.html
    cat "compiled/$m.js" >> index.html
    echo "" >> index.html
    echo "window.__twSentinel.completedModules.push(\"$m.jsx\");" >> index.html
done

# Pre-Render-Check und Mount
cat >> index.html << 'EOF'
window.__twSentinel.preRenderCheck={NavDropdown:typeof NavDropdown,App:typeof App};
const root=ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(ErrorBoundary,null,React.createElement(App)));
    </script>
</body>
</html>
EOF

echo "index.html gebaut: $(wc -c < index.html) bytes"
echo "Zeilen: $(wc -l < index.html)"
