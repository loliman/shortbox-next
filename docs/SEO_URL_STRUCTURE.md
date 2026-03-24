# SEO-freundliche URL-Struktur für Shortbox

## Überblick

Diese Dokumentation beschreibt die neue SEO-freundliche URL-Struktur für das Shortbox-Projekt, die parallel zu den bestehenden Legacy-URLs funktioniert.

## URL-Struktur

### Neue SEO-freundliche URLs (Empfohlen)

Die neue URL-Struktur ist selbstbeschreibend und SEO-optimiert:

```
/[locale]/[publisherSlug]/[seriesSlug]/[issueNumber]/[formatSlug]/[variantSlug]
```

**Locale:**
- `de` - Deutsche Ausgaben
- `us` - US-Ausgaben

**Slug-Formate:**
- `publisherSlug`: Slugified Publisher Name (z.B. "marvel", "dc-comics")
- `seriesSlug`: Format `title-year-volN` (z.B. "amazing-spider-man-1963-vol1")
- `issueNumber`: URL-kodierte Ausgabennummer
- `formatSlug`: Slugified Format (optional, z.B. "heft", "comic")
- `variantSlug`: Slugified Variant (optional, z.B. "standard", "variant-a")

**Beispiele:**

```
/de/marvel/amazing-spider-man-1963-vol1/1
/de/marvel/amazing-spider-man-1963-vol1/1/heft
/de/marvel/amazing-spider-man-1963-vol1/1/heft/kiosk-ausgabe
/us/marvel/amazing-spider-man-1963-vol1/1/comic/variant-a
```

### Legacy-URLs (veraltet, aber funktionsfähig)

Die alten URLs werden weiterhin unterstützt:

```
/[locale]/[publisher]/[series]_Vol_[volume]/[issue]/[format]_[variant]
```

**Beispiele:**

```
/de/Marvel/Amazing%20Spider-Man_Vol_1/1
/de/Marvel/Amazing%20Spider-Man_Vol_1/1/Heft
```

## Implementierung

### Route-Handler

#### Deutsche Lokale
- **Route**: `/app/de/[publisherSlug]/[seriesSlug]/[issueNumber]/[[...slug]]/page.tsx`
- **Komponente**: `IssueDetailsDE`

#### US-Lokale
- **Route**: `/app/us/[publisherSlug]/[seriesSlug]/[issueNumber]/[[...slug]]/page.tsx`
- **Komponente**: `IssueDetailsUS`

### Utilities

#### Slug-Builder (`src/lib/slug-builder.ts`)

Funktionen zur Generierung von SEO-freundlichen Slugs:

```typescript
// Einzelne Slug-Funktionen
generatePublisherSlug(name: string): string
generateSeriesSlug(title: string, startYear?: number, volume?: number): string
generateFormatSlug(format: string): string
generateVariantSlug(variant: string): string

// URL-Builder
buildIssueUrlPath(segments: IssueUrlSegments): string
buildIssueUrlSegments(locale, publisher, series, year, volume, issue, format?, variant?): IssueUrlSegments
```

**Beispiel:**

```typescript
import { buildIssueUrlSegments, buildIssueUrlPath } from '@/src/lib/slug-builder';

const segments = buildIssueUrlSegments(
  'de',
  'Marvel',
  'Amazing Spider-Man',
  1963,
  1,
  '1',
  'Heft',
  'Standard'
);

const path = buildIssueUrlPath(segments);
// Result: /de/marvel/amazing-spider-man-1963-vol1/1/heft/standard
```

#### Slug-Parser (`src/lib/slug-parser.ts`)

Funktionen zum Parsen von SEO-URLs zurück in strukturierte Daten:

```typescript
// Slug-Parsing
parseSeriesSlug(slug: string): ParsedSeriesSlug | null
parseFormatSlug(slug: string): string | undefined
parseVariantSlug(slug: string): string | undefined

// URL-Parsing
parseIssueUrl(publisherSlug, seriesSlug, issueNumber, formatSlug?, variantSlug?): ParsedIssueUrl | null
```

**Beispiel:**

```typescript
import { parseIssueUrl } from '@/src/lib/slug-parser';

const parsed = parseIssueUrl(
  'marvel',
  'amazing-spider-man-1963-vol1',
  '1',
  'heft',
  'standard'
);

// Result: {
//   publisherName: 'Marvel',
//   seriesTitle: 'Amazing Spider-Man',
//   seriesYear: 1963,
//   seriesVolume: 1,
//   issueNumber: '1',
//   format: 'Heft',
//   variant: 'Standard'
// }
```

#### URL-Generierung (`src/util/hierarchy.ts`)

Die Funktion `generateSeoUrl()` generiert neue SEO-URLs aus strukturierten Daten:

```typescript
import { generateSeoUrl } from '@/src/util/hierarchy';
import type { SelectedRoot } from '@/src/types/domain';

const selected: SelectedRoot = {
  us: false,
  issue: {
    number: '1',
    format: 'Heft',
    variant: 'Standard',
    series: {
      title: 'Amazing Spider-Man',
      volume: 1,
      startyear: 1963,
      publisher: { name: 'Marvel' }
    }
  }
};

const url = generateSeoUrl(selected, false);
// Result: /de/marvel/amazing-spider-man-1963-vol1/1/heft/standard
```

### Canonical-Metadata

Alle Detail-Pages setzen automatisch Canonical-Links, um Suchmaschinen auf die neue SEO-URL hinzuweisen:

```typescript
import { createPageMetadata } from '@/src/lib/routes/metadata';

export async function generateMetadata({ params }): Promise<Metadata> {
  const selected = buildSelectedRoot(params, false);
  const canonicalUrl = generateSeoUrl(selected, false);
  
  return createPageMetadata({
    title: 'Series #Issue',
    description: 'Description',
    canonical: canonicalUrl  // Canonical Link wird hinzugefügt
  });
}
```

## Migration und Rollout

### Phase 1: Implementierung (✅ Abgeschlossen)
- ✅ Slug-Builder und Parser erstellt
- ✅ Neue Route-Handler für /de/ und /us/ implementiert
- ✅ Canonical-Metadata unterstützt
- ✅ Legacy-URL-Support erhalten

### Phase 2: Interne Link-Generierung (Nächste Schritte)

Die Anwendung sollte schrittweise updated werden, um die neue `generateSeoUrl()` zu verwenden:

```typescript
// ALT (Legacy):
const url = generateUrl(selected, us);

// NEU (SEO):
const url = generateSeoUrl(selected, us);
```

Priorität:
1. Navigation-Links in Komponenten
2. Search-Index URLs
3. Interne Verweise

### Phase 3: Legacy-Redirect (Optional)

Wenn Sie Legacy-URLs zu Redirects machen möchten:

```typescript
// In legacy route handler
export async function GET(request: NextRequest) {
  const seoUrl = generateSeoUrl(parsedData, us);
  return permanentRedirect(seoUrl);  // 308 Redirect
}
```

## Testing

Alle Utilities haben umfassende Unit-Tests:

```bash
npm test -- src/lib/slug-builder.test.ts
npm test -- src/lib/slug-parser.test.ts
npm test -- src/util/hierarchy.seo.test.ts
```

**Test-Beispiele sind in den Test-Dateien enthalten:**
- `src/lib/slug-builder.test.ts`
- `src/lib/slug-parser.test.ts`
- `src/util/hierarchy.seo.test.ts`

## Best Practices

### 1. Konsistente Slug-Generierung

Immer die `buildIssueUrlSegments()` oder `buildIssueUrlPath()` Funktionen verwenden für konsistente URLs:

```typescript
// ✅ RICHTIG
const path = buildIssueUrlPath(buildIssueUrlSegments(
  'de', publisher, series, year, volume, issue, format, variant
));

// ❌ FALSCH
const path = `/de/${slugify(publisher)}/${slugify(series)}...`;
```

### 2. URL-Parsing mit Fehlerbehandlung

Immer `parseIssueUrl()` mit Null-Check verwenden:

```typescript
const parsed = parseIssueUrl(...);
if (!parsed) {
  notFound();  // oder handle error
  return;
}
```

### 3. Canonical-Links setzen

Immer Canonical-Links in Metadata setzen:

```typescript
canonical: initialData ? generateSeoUrl(selected, us) : undefined
```

## Tipps zur Optimierung

### SEO-Verbesserungen durch neue URLs

1. **Bessere Lesbarkeit**: URLs sind sprechend und beschreibend
2. **Keyword-Optimierung**: Series-Namen und Publisher sind direkt in der URL
3. **Strukturierte Daten**: Hierarchie ist sofort erkennbar
4. **Crawlbar**: Flache Tiefe, bessere Indexierung

### Performance-Tipps

1. **Slug-Caching**: Slugs sind deterministisch - können gecacht werden
2. **URL-Validierung**: `parseIssueUrl()` validiert alle Komponenten
3. **Fehlerbehandlung**: Notfound-Seiten für ungültige Slugs

## Troubleshooting

### Problem: URL wird nicht gefunden

**Lösung**: Prüfen Sie, ob der Series-Slug korrekt generiert wurde. Der Series-Slug muss das Format `title-year-volN` folgen:

```typescript
// Debugging:
console.log(generateSeriesSlug('Amazing Spider-Man', 1963, 1));
// Output: amazing-spider-man-1963-vol1
```

### Problem: Canonical-Link wird nicht gesetzt

**Lösung**: Stellen Sie sicher, dass `NEXT_PUBLIC_SITE_URL` in `.env` definiert ist:

```env
NEXT_PUBLIC_SITE_URL=https://shortbox.de
```

### Problem: Legacy-URLs funktionieren nicht mehr

**Lösung**: Die alten `/de/[publisher]/[series]/[issue]` Routes werden weiterhin unterstützt. Überprüfen Sie, dass die `getSelected()` Funktion beide Formate korrekt parsed:

```typescript
// Debugging:
const routeParams = { publisher: 'Marvel', series: 'Spider-Man_Vol_1', issue: '1' };
const selected = getSelected(routeParams, false);
console.log(selected);
```

## Häufig gestellte Fragen

**F: Werden Legacy-URLs entfernt?**
A: Nein. Legacy-URLs werden weiterhin unterstützt und funktionieren. Sie werden nur nicht mehr empfohlen.

**F: Können wir beide URL-Formate gleichzeitig verwenden?**
A: Ja, das Projekt unterstützt beide parallel. Sie können schrittweise migrieren.

**F: Wie lange sollte die Migration dauern?**
A: Das hängt von Ihren Anforderungen ab. Canonical-Links können sofort live gehen. Interne Links können schrittweise migriert werden.

**F: Müssen wir die Datenbank ändern?**
A: Nein. Slugs werden zur Runtime generiert und benötigen keine DB-Änderungen.

**F: Welche Auswirkungen hat das auf Backlinks?**
A: Mit Canonical-Links werden alte Backlinks automatisch zu neuen URLs konsolidiert (SEO-Best-Practice).

