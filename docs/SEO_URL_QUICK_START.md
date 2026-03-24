# SEO URL Struktur - Quick Start Guide

Willkommen zur SEO-optimierten URL-Struktur für Shortbox! Dieses Guide hilft Ihnen, die neuen Funktionen zu verstehen und zu nutzen.

## 🚀 Schneller Überblick

Das Projekt unterstützt jetzt **SEO-freundliche URLs** parallel zu Legacy-URLs:

```
# Legacy (funktioniert noch) ✅
/de/Marvel/Spider-Man_Vol_1/1

# SEO-freundlich (Neu & empfohlen) ✨
/de/marvel/spider-man-1963-vol1/1
```

Beide Formate funktionieren! Legacy-URLs werden automatisch erkannt und verarbeitet.

---

## 📖 Dokumentation

### Ausführliche Guides
- **[SEO URL Structure Guide](./docs/SEO_URL_STRUCTURE.md)** - Umfassende Dokumentation
- **[Implementation Checklist](./docs/SEO_URL_IMPLEMENTATION_CHECKLIST.md)** - Schritt-für-Schritt Plan
- **[Implementation Summary](./docs/SEO_URL_IMPLEMENTATION_SUMMARY.md)** - Was wurde implementiert

### Quick Reference
- [Slug-Builder Utilities](./src/lib/slug-builder.ts) - URL-Generierung
- [Slug-Parser Utilities](./src/lib/slug-parser.ts) - URL-Parsing
- [Hierarchy Utils](./src/util/hierarchy.ts) - `generateSeoUrl()` Funktion

---

## 🔧 Verwendung

### 1. URL aus Daten generieren

```typescript
import { generateSeoUrl } from '@/src/util/hierarchy';

const selected = {
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

### 2. URL mit Segments bauen

```typescript
import { buildIssueUrlSegments, buildIssueUrlPath } from '@/src/lib/slug-builder';

const segments = buildIssueUrlSegments(
  'de',                  // locale
  'Marvel',              // publisher
  'Amazing Spider-Man',  // series title
  1963,                  // start year
  1,                     // volume
  '1',                   // issue number
  'Heft',               // format (optional)
  'Standard'            // variant (optional)
);

const path = buildIssueUrlPath(segments);
// Result: /de/marvel/amazing-spider-man-1963-vol1/1/heft/standard
```

### 3. URL parsen

```typescript
import { parseIssueUrl } from '@/src/lib/slug-parser';

const parsed = parseIssueUrl(
  'marvel',
  'amazing-spider-man-1963-vol1',
  '1',
  'heft',
  'standard'
);

console.log(parsed);
// {
//   publisherName: 'Marvel',
//   seriesTitle: 'Amazing Spider-Man',
//   seriesYear: 1963,
//   seriesVolume: 1,
//   issueNumber: '1',
//   format: 'Heft',
//   variant: 'Standard'
// }
```

### 4. Canonical Links in Pages

```typescript
import { createPageMetadata } from '@/src/lib/routes/metadata';
import { generateSeoUrl } from '@/src/util/hierarchy';

export async function generateMetadata({ params }) {
  const selected = buildSelectedRoot(params, false);
  const canonicalUrl = generateSeoUrl(selected, false);
  
  return createPageMetadata({
    title: 'Series #Issue',
    description: 'Issue description',
    canonical: canonicalUrl  // ✨ SEO Canonical Link!
  });
}
```

---

## 📚 URL-Format Dokumentation

### Serie Slug Format
```
title-year-volN

Beispiele:
- amazing-spider-man-1963-vol1
- the-x-men-1963-vol2
- deadpool-2008-vol1
```

**Parsing:**
- `title`: Mehrere Wörter möglich (mit Bindestrichen)
- `year`: 4-stellige Jahreszahl (optional)
- `volN`: Erforderlich, Format: `vol` + Zahlen

### Publisher Slug
```
Einfach slugified Publisher-Name

Beispiele:
- marvel
- dc-comics
- panini-comics
```

### Format & Variant Slugs
```
Slugified Format/Variant Namen

Beispiele:
- heft
- comic
- comic-book
- variant-a
- kiosk-ausgabe
```

---

## 🧪 Testing

```bash
# Run all SEO URL tests
npm test -- src/lib/slug-builder.test.ts
npm test -- src/lib/slug-parser.test.ts
npm test -- src/util/hierarchy.seo.test.ts

# Run with coverage
npm test -- --coverage
```

---

## 🔄 Migration der Legacy-URLs

**Aktueller Status:** ✅ Beide Formate werden unterstützt

Die `getSelected()` Funktion in `src/util/hierarchy.ts` erkennt automatisch:
- **Legacy Format:** `/de/[publisher]/[series]/[issue]/[variant]`
- **SEO Format:** `/de/[publisherSlug]/[seriesSlug]/[issueNumber]/[formatSlug]/[variantSlug]`

Keine Migration notwendig - es funktioniert alles parallel!

---

## 🌐 Umgebungsvariablen

### Optional
```env
# Für Canonical-Links (Default: https://shortbox.de)
NEXT_PUBLIC_SITE_URL=https://shortbox.de
```

---

## 📊 Beispiele

### Deutsche Serien
```
Publisher: Marvel (slug: marvel)
Series: Amazing Spider-Man (1963, Vol. 1)
Issue: 1

URL: /de/marvel/amazing-spider-man-1963-vol1/1
Mit Format: /de/marvel/amazing-spider-man-1963-vol1/1/heft
Mit Format + Variant: /de/marvel/amazing-spider-man-1963-vol1/1/heft/kiosk-ausgabe
```

### US Comic
```
Publisher: DC Comics (slug: dc-comics)
Series: Batman (1963, Vol. 1)
Issue: 50

URL: /us/dc-comics/batman-1963-vol1/50
Mit Format: /us/dc-comics/batman-1963-vol1/50/comic
Mit Format + Variant: /us/dc-comics/batman-1963-vol1/50/comic/variant-a
```

---

## 🐛 Troubleshooting

### Problem: URL wird nicht erkannt
**Lösung:** Prüfen Sie, dass der Series-Slug das Format `title-year-volN` folgt.

```typescript
// Debugging:
console.log(generateSeriesSlug('Amazing Spider-Man', 1963, 1));
// Output: amazing-spider-man-1963-vol1
```

### Problem: Canonical Link wird nicht gesetzt
**Lösung:** Stellen Sie sicher, dass `NEXT_PUBLIC_SITE_URL` definiert ist (oder nutzen Sie den Default).

```typescript
// createPageMetadata() setzt automatisch canonicalUrl
createPageMetadata({
  canonical: 'https://shortbox.de/de/marvel/...'
})
```

### Problem: Alte URLs funktionieren nicht
**Das sollte nicht vorkommen!** Die Legacy-Unterstützung ist in `getSelected()` integriert.
Bitte öffnen Sie ein Issue mit Details.

---

## 📖 Weitere Informationen

- [SEO Best Practices für URLs](https://developers.google.com/search/docs/beginner/url-structure)
- [Canonical Links erklärt](https://yoast.com/rel-canonical/)
- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)

---

## 💡 Tipps

1. **Immer `generateSeoUrl()` verwenden** - für neue Features und Links
2. **Slugs sind deterministisch** - gleiche Input = gleiche Output (kann gecacht werden)
3. **URL-Encoding ist automatisch** - keine manuellen `encodeURIComponent()` nötig
4. **Tests schreiben** - für URL-Generierung und Parsing
5. **Canonical Links überall** - für bessere SEO-Wertung

---

## 📞 Support

Fragen oder Probleme? Schau dir an:
- [Full Documentation](./docs/SEO_URL_STRUCTURE.md)
- [Implementation Checklist](./docs/SEO_URL_IMPLEMENTATION_CHECKLIST.md)
- Test-Dateien für Code-Beispiele

---

**Version:** 1.0  
**Status:** ✅ Production Ready  
**Last Updated:** March 24, 2026

