# Frontend Migration TODO

## Goal

Port the frontend to Next.js step by step so the application runs stably without a backend at first.

## Tasks

1. Routing auf Next umstellen.
   `react-router-dom`, `withContext`, Link-Helfer, Back-Navigation und Query-Handling muessen auf `next/navigation` und Next-Links umgebaut werden.

2. Komponenten in Client- und Server-Komponenten aufteilen.
   Viele Bausteine greifen auf `window`, `document`, `localStorage`, `ResizeObserver` oder Event-Listener zu und brauchen deshalb klare `"use client"`-Grenzen.

3. App-Shell in Next neu aufbauen.
   Das alte `App.tsx`-/`Layout.tsx`-Denken muss auf `app/`-Router, globale Provider und ein sauberes Next-Layout gemappt werden.

4. MUI sauber in Next integrieren.
   Theme, `CssBaseline`, SSR/Hydration und ggf. Emotion-Setup muessen korrekt verdrahtet werden, damit die UI stabil rendert.

5. Apollo komplett entfernen oder durch Mock-Daten-Adapter ersetzen.
   Da erstmal kein Backend existiert, brauchen wir eine frontend-seitige Datenquelle mit statischen Fixtures oder In-Memory-Mocks statt `useQuery`/`useMutation`.

6. GraphQL-Dokumente und Datenzugriff entkoppeln.
   Komponenten sollten nicht direkt von `graphql/queriesTyped`, `mutationsTyped` und Apollo-Cache-Logik abhaengen, sondern ueber eine eigene UI-Daten-Schicht lesen.

7. Fehlende `util`, `types` und `app`-Abhaengigkeiten portieren oder ersetzen.
   Ein grosser Teil der Komponenten referenziert Hilfsfunktionen, Domain-Typen, Theme-, Session- und Responsive-Logik, die in `shortbox-next` aktuell fehlen.

8. Lade-, Fehler- und Empty-States ohne Backend definieren.
   Statt echter API-Errors brauchen wir kontrollierte UI-Zustaende, damit Seiten trotzdem stabil und glaubwuerdig funktionieren.

9. Infinite Scroll/Pagination auf frontend-lokale Daten umbauen.
   Das ist aktuell eng an Apollo `fetchMore` gekoppelt und muss auf lokale Arrays bzw. Mock-Pagination umgestellt werden.

10. Formulare ohne Backend stabil machen.
    Formik/Yup-Formulare sollen weiterhin rendern, validieren und submitten koennen, auch wenn Submit erstmal nur lokal oder als Mock passiert.

11. Tests und Altlasten bereinigen.
    Einige Tests und Helper haengen noch direkt an Router/Apollo und werden nach dem Umbau angepasst oder voruebergehend isoliert werden muessen.

12. Schrittweise erste echte Seiten in Next verdrahten.
    Nicht nur Komponenten kopieren, sondern z. B. Home, Detailseiten, Filter und Editoren nacheinander in echte Next-Routen einhaengen.

## Recommended order

1. App-Shell + MUI + Provider-Grundgeruest in Next
2. Routing und `withContext`-Ersatz
3. Mock-Daten-Schicht statt Apollo
4. Fehlende `util`-, `types`- und `app`-Bausteine portieren
5. Erste echte Seiten anschliessen
