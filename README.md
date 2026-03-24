# shortbox-next

Shortbox ist eine Next.js-Anwendung fuer deutsche und US-Marvel-Veroeffentlichungen mit SEO-freundlichen Detail- und Landingpages.

## Entwicklung

```bash
npm install
npm run dev
```

## Wichtige Skripte

```bash
npm run build
npm test
npm run test:seo:smoke
npm run test:seo:sitemap
```

## SEO Smoke Test

Der SEO-Smoke-Test prueft gegen eine laufende Instanz zentrale Routen auf:
- `<title>`
- `<link rel="canonical">`
- `meta[name="robots"]`

Standardmaessig wird gegen `http://localhost:3000` getestet.

```bash
npm run dev
npm run test:seo:smoke
```

Optionale Umgebungsvariablen:

```bash
BASE_URL="https://shortbox.de" npm run test:seo:smoke
SEO_SMOKE_ROUTES_FILE="scripts/seo-smoke-routes.json" npm run test:seo:smoke
```

Die Routenmatrix liegt in `scripts/seo-smoke-routes.json` und kann bei Bedarf erweitert werden.

## Sitemap Monitoring

Das Sitemap-Monitoring laedt die `sitemap.xml` einer laufenden Instanz, prueft die gelisteten URLs auf Erreichbarkeit und vergleicht den Canonical-Pfad mit dem Sitemap-Eintrag.

```bash
npm run dev
npm run test:seo:sitemap
```

Optionale Umgebungsvariablen:

```bash
BASE_URL="https://shortbox.de" npm run test:seo:sitemap
SITEMAP_URL="https://shortbox.de/sitemap.xml" npm run test:seo:sitemap
SITEMAP_LIMIT="25" npm run test:seo:sitemap
```


