# Smoothify Taskforce

## Goal

Die Next-SSR-App soll sich schneller, ruhiger und reaktiver anfuehlen, ohne die Vorteile von SSR, SEO und serverseitiger Datenlogik aufzugeben.

## Principles

1. Nicht weniger SSR um jeden Preis, sondern weniger blockierende SSR im kritischen Pfad.
2. Die App-Shell bleibt moeglichst stabil, waehrend Content progressiv nachlaedt.
3. Temporaerer UI-State darf nicht staendig durch Navigationen oder Server-Resolves verloren gehen.
4. Wahrgenommene Performance ist genauso wichtig wie rohe Antwortzeit.

## P1: Harte UX-Bremsen

- [~] Navbar-State stabilisieren.
  Expand-State, Scrollposition, Drawer-State und andere rein lokale Navigationszustaende muessen SSR-Navigationen ueberleben.
  Hotspots: `src/components/nav-bar/List.tsx`, `src/components/nav-bar/SeriesBranch.tsx`, `src/components/nav-bar/navStateStorage.ts`.
  Status: Expand-State und Scroll-to-selected deutlich verbessert; Browser-Feinschliff fuer reale Pfade bleibt sinnvoll.

- [x] Segment-spezifische `loading.tsx` einfuehren.
  Statt globalem Umschalten sollen Routen wie `app/de`, `app/us`, Details und Filter eigene Loading-States bekommen.
  Hotspots: `app/layout.tsx`, `app/de`, `app/us`, `app/filter`, Detailrouten unter `app/de/**` und `app/us/**`.

- [~] Full-page Loader durch lokale Skeletons ersetzen.
  Listen, Detailheader, Navigation und Badges sollen einzeln geladen wirken, nicht als kompletter Page-Reset.
  Hotspots: `src/components/generic/loading`, `src/components/Home.tsx`, Detail- und Listing-Komponenten.
  Status: Home, Filter und Sidebar haben bessere Loading-Zustaende; Detail-Skeletons koennen weiter manuell verfeinert werden.

- [~] Navigationen mit Pending-Feedback versehen.
  Sort, Filter, Sidebar-Klicks, Suche und Locale-Wechsel sollen sofort Reaktion zeigen, auch wenn der Server noch arbeitet.
  Hotspots: `src/components/SortContainer.tsx`, `src/components/filter/FilterFormClient.tsx`, `src/components/top-bar/SearchBar.tsx`, `src/components/nav-bar/List.tsx`, `src/components/top-bar/TopBar.tsx`.
  Status: Sort, Filter, Sidebar, Suche und Locale-Wechsel haben jetzt Pending-Feedback; weitere Hotspots koennen noch folgen.

- [~] Scrollverhalten pro Route bewusst steuern.
  Nicht jede Navigation soll die App gefuehlt auf Anfang setzen oder den sichtbaren Kontext verlieren.
  Hotspots: Sidebar-Scroll in `src/components/nav-bar/*`, Listen- und Detailnavigationen.
  Status: Sidebar-Scroll fuer selektierte Publisher, Serien und Issues verbessert; restliche Route-Scrolls noch offen.

## P2: Serverarbeit aus dem kritischen Pfad ziehen

- [x] Navigation-Reads cachen.
  Publisher-, Serien- und Issue-Baeume sollten nicht bei jeder Navigation voll neu aus Prisma kommen.
  Hotspots: `src/lib/read/navigation-read.ts`, `src/lib/routes/app-page.ts`.
  Status: vollstaendige Nav-Reads laufen ueber Cache und werden nach Writes invalidiert.

- [~] Langsame Zusatzdaten entkoppeln.
  Counts, Admin-Zusatzinfos und sekundaere UI-Daten sollen nicht den Hauptinhalt blockieren.
  Hotspots: `src/components/app-shell/CatalogPageShell.tsx`, `src/lib/read/issue-read.ts`.
  Status: Change-Request-Count ist gecacht; weitere Shell-Zusatzdaten koennen noch folgen.

- [~] Server-Reads parallelisieren.
  Session, Navigation, Hauptinhalt und Zusatzinfos sollten moeglichst parallel statt seriell geladen werden.
  Hotspots: `src/lib/routes/app-page.ts`, Page-Dateien unter `app/**/page.tsx`.
  Status: `resolveAppPage`, `CatalogPageShell`, Home-, Publisher-, Series-, Issue-, Admin-, Workspace-, Editor-, Copy- und Report-Pfade parallelisiert; weitere Detail-Splits per Streaming bleiben offen.

- [ ] Detailseiten in Subbereiche streamen.
  Above-the-fold zuerst, schwere Untersektionen spaeter ueber `Suspense`.
  Hotspots: Detailrouten und Komponenten unter `src/components/details/**`.

- [ ] Filter- und Sortierwechsel billiger machen.
  Bei Query-Aenderungen soll nicht mehr neu gerechnet werden als noetig.
  Hotspots: Home/Listing-Seiten, `src/components/HomeFeedClient.tsx`, `src/util/listingQuery.ts`.

## P3: Navigation weicher machen

- [ ] Mehr echte `Link`-Navigation verwenden.
  Wo moeglich soll Prefetching von Next fuer uns arbeiten statt nur imperatives `router.push`.
  Hotspots: `src/components/SortContainer.tsx`, `src/components/nav-bar/ListEntry.tsx`, `src/components/top-bar/SearchBar.tsx`, `src/components/details/**`.

- [ ] Gezieltes Prefetching einfuehren.
  Naheliegende Folgeziele wie Detailseiten oder oft geklickte Navigationseintraege koennen vorab geladen werden.
  Hotspots: Topbar-Suche, Listing-Items, Sidebar-Navigation.

- [ ] Suche und Query-getriebene Navigation entprellen.
  Nicht jede kleine UI-Aenderung sollte sofort eine volle Navigationsrunde ausloesen.
  Hotspots: `src/components/top-bar/SearchBar.tsx`, Filter- und Sortierkomponenten.

- [ ] Mobile Drawer und Overlay-Verhalten beruhigen.
  Der mobile Chrome soll nicht bei SSR-Uebergaengen sichtbar springen oder hektisch reinitialisieren.
  Hotspots: `src/components/top-bar/TopBar.tsx`, `src/components/nav-bar/NavDrawer.tsx`, `src/components/LayoutChromeClient.tsx`.

## P4: Hydration- und Rendering-Ruckler abbauen

- [ ] Hydration-Mismatches identifizieren.
  Theme, Responsive Guessing und Media-Query-Umschaltungen duerfen nach dem ersten Paint nicht unnötig springen.
  Hotspots: `app/layout.tsx`, `src/components/AppProviders.tsx`, `src/components/LayoutChromeClient.tsx`, `src/app/responsiveGuess.ts`.

- [ ] Unnoetige Remounts entfernen.
  Query-Wechsel, `key`-Aenderungen und Layout-Umbauten sollen UI-Bereiche nicht staendig neu aufsetzen.
  Hotspots: Listing-Container, Detailbereiche, Sidebar-Zweige.

- [ ] Teure Client-Effekte pruefen.
  Scroll-Listener, `ResizeObserver`, `useLayoutEffect` und Messlogik koennen die App subjektiv zaeh machen.
  Hotspots: `src/components/nav-bar/IssuesBranch.tsx`, `src/components/HomeFeedClient.tsx`, responsive und scroll-nahe Komponenten.

- [ ] Client-Komponenten enger schneiden.
  Nur interaktive Teile sollten Client Components sein; statische Flaechen koennen auf den Server.
  Hotspots: App-Shell, Detailseiten, Listing-Wrapper.

## P5: Messen statt raten

- [ ] Kritische Navigationspfade messen.
  Wir brauchen reale Zahlen fuer Home, Detail, Filter, Suche und Sidebar-Navigation.

- [ ] Langsame Prisma-Reads und Payloads sichtbar machen.
  Erst messen, dann gezielt cachen, splitten oder vereinfachen.

- [ ] Wahrgenommene Performance vereinheitlichen.
  Die App braucht ein klares Muster fuer `idle`, `pending`, `streaming`, `loaded` und `error`.

## Recommended Order

1. Navbar-State und Scroll-State stabilisieren.
2. Segment-`loading.tsx` und lokale Skeletons einfuehren.
3. Navigation- und Count-Daten cachen.
4. Wichtige `router.push`-Hotspots auf Transition- und Pending-UI umstellen.
5. Metriken einbauen und die schlimmsten Slow-Spots nacheinander entfernen.

## First Tickets

1. Navbar reproduzierbar vermessen und den Reset-Ausloeser eingrenzen.
   Status: teilweise erledigt; echtes Browser-Verhalten sollte noch einmal entlang realer Pfade gegengeprueft werden.
2. `app/de/loading.tsx` und `app/us/loading.tsx` mit passenden Skeletons anlegen.
   Status: erledigt ueber route-spezifische Loader fuer Home, Details, Issue und Filter.
3. `readInitialNavigationData()` cachen und gezielt invalidierbar machen.
   Status: erledigt inkl. Write-Invalidierung.
4. Sort- und Filterwechsel mit `useTransition` und sichtbarem Pending-State ausstatten.
   Status: erledigt; Suche und Locale-Wechsel sind ebenfalls nachgezogen.

## Next Up

1. Verbleibende Detail-Skeletons bewusst manuell an echte Layouts angleichen.
2. Messpunkte fuer Home, Detail, Filter und Sidebar-Navigation einbauen.
3. Mobile Drawer und Overlay-Verhalten bei SSR-Navigationen weiter beruhigen.
4. Gezieltes Prefetching fuer naheliegende Folgeziele evaluieren.
