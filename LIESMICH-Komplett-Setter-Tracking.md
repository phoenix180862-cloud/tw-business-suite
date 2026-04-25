# Komplett-Setter-Tracking — alle App-Setter (25.04.2026)

## Was deine zwei Bilder gezeigt haben

**Bild 1 (Foto-Direktklick):**
- 1037 MB ↓48.8 (sinkt — GC kommt teilweise hinterher)
- App: 15k, Raum: 15k (beide identisch!)
- **Keine gelbe Setter-Zeile**

**Bild 2 (Aufmass-Pfad):**
- 1985 MB ↑12.1
- App: 776, Raum: 776 (auch identisch)
- **Keine gelbe Setter-Zeile**

## Was das gezeigt hat

Drei wichtige Erkenntnisse:

1. **App und Raumblatt rendern beide gleich oft.** Heisst: Loop-Quelle ist
   in der App-Komponente, nicht in einem Kind. Bei jedem App-Render rendert
   Raumblatt mit (kein React.memo).

2. **Keine gelbe Zeile.** Heisst: Keiner der 7 von mir gewrappten Top-Setter
   feuert in der Schleife. Der Loop dreht einen Setter den ich noch
   nicht gewrappt hatte.

3. **15k/s vs. 776/s.** Foto-Direktklick triggert eine viel aggressivere
   Schleife als der normale Aufmass-Pfad. Beides sind Loops, aber
   unterschiedlich getriggert.

## Was diese Lieferung anders macht

Statt nur 7 Setter sind jetzt **alle 36 App-Setter getrackt**. Per
Skript automatisiert, jeder einzelne. Die untere gelbe Zeile am
Memory-Badge zeigt jetzt definitiv den schuldigen Setter — egal welcher
es ist.

Alle Top-Setter umgewrappt:
- setPage, setSelectedKunde, setSelectedRaum, setSelectedPositions,
  setFertigeRaeume, setGesamtliste, setAufmassGespeichert (schon vorher)
- setDriveStatus, setShowAuth, setLoading, setLastRaumData,
  setShowGesamtliste, setRechnungsVorwahl, setHistory, setHistoryIdx,
  setDriveKunden, setIsDriveMode, setLoadProgress, setImportResult,
  setKundeMode, setAnalyseConfig, setStartConnections,
  setOrdnerAnalyseMeta, setOrdnerAnalyseProgress, setIsOrdnerAnalyseRunning,
  setSelectedOrdnerNr, setShowAkteModal, setAkteData, setAkteSaveToast,
  setVorlageBusy, setVorlageToast, setVorlageList, setKundeOpenDialog,
  setFotoSyncStatus, setAutoRestoreToast, setModuleActions

29 weitere ergänzt.

## Test-Plan

Push, Strg+F5, Debug-Panel → noFotos AN, noSync AN. **Direkt aufs Foto-Modul.**
Nach 3-5 Sekunden Foto vom Memory-Badge.

**Diesmal MUSS eine gelbe Zeile erscheinen.** Wenn nicht, ist der Loop in
einer Komponente AUSSERHALB von App, und ich muss noch einen Schritt
weiter graben (z.B. AutoSaveStatusIndicator, FotoSyncIndicator).

Der Setter-Name plus Frequenz in der gelben Zeile sagt mir genau, wo der
naechste Schnitt sitzt.

## Geaenderte Dateien

1. `index.html` — frisch gebaut
2. `tw-app.jsx` — ALLE 36 App-Setter getrackt
