# SEO URL Struktur - Implementierungs-Checkliste

## ✅ Phase 1: Foundation & Utilities (Abgeschlossen)

### Slug-Builder und Parser
- [x] `src/lib/slug-builder.ts` erstellt mit:
  - [x] `slugify()` - Basis-Slug-Generierung
  - [x] `generatePublisherSlug()` - Publisher-Slugs
  - [x] `generateSeriesSlug()` - Series-Slugs mit Jahr und Volume
  - [x] `generateFormatSlug()` - Format-Slugs
  - [x] `generateVariantSlug()` - Variant-Slugs
  - [x] `buildIssueUrlPath()` - Komplette URL-Generierung
  - [x] `buildIssueUrlSegments()` - URL-Komponenten-Builder
  - [x] Unit-Tests in `src/lib/slug-builder.test.ts`

- [x] `src/lib/slug-parser.ts` erstellt mit:
  - [x] `parseSeriesSlug()` - Series-Slug Parsing
  - [x] `parseFormatSlug()` - Format-Slug Parsing
  - [x] `parseVariantSlug()` - Variant-Slug Parsing
  - [x] `parseIssueNumber()` - Issue-Nummer Parsing
  - [x] `parseIssueUrl()` - Komplettes URL-Parsing
  - [x] Unit-Tests in `src/lib/slug-parser.test.ts`

### Type-Definitionen
- [x] `src/types/domain.ts` aktualisiert:
  - [x] `RouteParams` um neue SEO-Parameter erweitert
  - [x] Backward-Kompatibilität mit Legacy-Parametern erhalten

### URL-Generierung
- [x] `src/util/hierarchy.ts` aktualisiert:
  - [x] `generateSeoUrl()` Funktion hinzugefügt
  - [x] `getSelected()` um SEO-URL-Parsing erweitert
  - [x] Slug-Builder Imports hinzugefügt
  - [x] Slug-Parser Integration
  - [x] Unit-Tests in `src/util/hierarchy.seo.test.ts`

### Metadata & Canonical Links
- [x] `src/lib/routes/metadata.ts` aktualisiert:
  - [x] `createPageMetadata()` um Canonical-Support erweitert
  - [x] `NEXT_PUBLIC_SITE_URL` Umgebungsvariable Support
  - [x] Alternates/Canonical-Struktur implementiert

## ✅ Phase 2: Route-Handler (Abgeschlossen)

### Deutsche Lokale
- [x] Neue Route erstellt: `/app/de/[publisherSlug]/[seriesSlug]/[issueNumber]/[[...slug]]/page.tsx`
  - [x] `generateMetadata()` mit Canonical-Links
  - [x] Parameter-Parsing mit Catch-All für Format/Variant
  - [x] IssueDetailsDE-Komponente integriert
  - [x] Navigation-Daten laden
  - [x] 404-Handling für ungültige Daten

- [x] Layout-Datei: `/app/de/[publisherSlug]/layout.tsx`
  - [x] `force-dynamic` Setting für Always-Fresh-Content

### US-Lokale
- [x] Neue Route erstellt: `/app/us/[publisherSlug]/[seriesSlug]/[issueNumber]/[[...slug]]/page.tsx`
  - [x] `generateMetadata()` mit Canonical-Links
  - [x] Parameter-Parsing mit Catch-All für Format/Variant
  - [x] IssueDetailsUS-Komponente integriert
  - [x] Navigation-Daten laden
  - [x] 404-Handling für ungültige Daten

- [x] Layout-Datei: `/app/us/[publisherSlug]/layout.tsx`
  - [x] `force-dynamic` Setting für Always-Fresh-Content

## 📋 Phase 3: Interne Link-Generierung (Nächste Schritte)

### Navigation-Komponenten aktualisieren
- [ ] Komponenten identifizieren, die Links generieren
- [ ] `generateUrl()` durch `generateSeoUrl()` ersetzen (oder beide parallel verwenden)
- [ ] Feature-Flag für graduellen Rollout (optional)

### Prioritäten:
1. **HIGH**: Hauptnavigation und Breadcrumbs
2. **HIGH**: Search-Ergebnisse Links
3. **MEDIUM**: Interne Verweise (Serien, Publisher)
4. **LOW**: Archiv-Links

### Beispiel-Update:
```typescript
// ALT:
const href = generateUrl(item, us);

// NEU:
const href = generateSeoUrl(item, us);
```

## 📋 Phase 4: Search-Index Integration (Nächste Schritte)

### SearchIndex-Datenbank
- [ ] Überprüfen, ob neue SEO-URLs in `SearchIndex.url` gespeichert werden sollen
- [ ] Migration für bestehende Einträge (falls nötig)
- [ ] Search-API-Endpoints aktualisieren

### Rebuild-Script
- [ ] `src/core/rebuild-search-index.ts` überprüfen
- [ ] URLs mit `generateSeoUrl()` generieren
- [ ] Test mit echten Daten durchführen

## 📋 Phase 5: Testing & QA (Nächste Schritte)

### Automatisierte Tests
- [ ] Alle Unit-Tests ausführen
- [ ] Test-Coverage überprüfen
- [ ] Integration-Tests für Route-Handler

### Manuelle Tests
- [ ] Deutsche URLs testen: `/de/marvel/amazing-spider-man-1963-vol1/1`
- [ ] US URLs testen: `/us/marvel/amazing-spider-man-1963-vol1/1`
- [ ] Mit Format: `/de/marvel/amazing-spider-man-1963-vol1/1/heft`
- [ ] Mit Format + Variant: `/de/marvel/amazing-spider-man-1963-vol1/1/heft/standard`
- [ ] Legacy-URLs noch funktionieren: `/de/Marvel/Spider-Man_Vol_1/1`
- [ ] Canonical-Links im HTML vorhanden
- [ ] 404 für ungültige Slugs

### SEO-Validierung
- [ ] Google Search Console: URLs testen
- [ ] Robots.txt überprüfen
- [ ] XML-Sitemaps (falls vorhanden) überprüfen
- [ ] Canonical-Links validieren

## 📋 Phase 6: Deployment & Monitoring (Nächste Schritte)

### Vorbereitung
- [ ] `.env` mit `NEXT_PUBLIC_SITE_URL` konfigurieren
- [ ] Build testen: `npm run build`
- [ ] Lokal testen: `npm run dev`

### Deployment
- [ ] Code auf Staging deployen
- [ ] QA auf Staging durchführen
- [ ] Performance-Tests durchführen
- [ ] Code auf Production deployen

### Post-Deployment
- [ ] Monitoring für 404-Fehler überprüfen
- [ ] Analytics auf neue URL-Struktur überprüfen
- [ ] Google Search Console Index-Statistiken überprüfen
- [ ] Canonical-Link Konsolidierung im GSC-Bericht überprüfen

## 📋 Phase 7: Dokumentation & Handover (Nächste Schritte)

### Dokumentation aktualisieren
- [x] SEO URL Structure Guide erstellt
- [ ] README aktualisieren mit neuer URL-Struktur
- [ ] API-Dokumentation aktualisieren
- [ ] Developer-Guide aktualisieren

### Wissenstransfer
- [ ] Team-Meeting mit neuer Struktur
- [ ] Best-Practices dokumentieren
- [ ] Common Pitfalls dokumentieren
- [ ] Troubleshooting-Guide erstellen

## 📋 Optional: Legacy-URL-Redirect (Abhängig von Anforderungen)

### Redirect-Implementierung
- [ ] Entscheiden: Alle Legacy-URLs zu SEO-URLs redirecten?
- [ ] Falls ja: Redirect-Handler in alten Routes implementieren
- [ ] 308 Permanent Redirect verwenden (SEO-best-practice)
- [ ] Redirect-Testing durchführen

### Beispiel (falls benötigt):
```typescript
// In /app/de/[publisher]/[series]/[issue]/page.tsx
import { permanentRedirect } from 'next/navigation';

export default async function LegacyIssuePage({ params }) {
  const selected = buildSelectedRoot(params, false);
  const seoUrl = generateSeoUrl(selected, false);
  permanentRedirect(seoUrl);
}
```

## 🔍 Aktueller Status

**Abgeschlossen:** Phase 1 & 2 ✅
**In Arbeit:** Phase 3+
**Nächste Schritte:**
1. Navigation-Komponenten identifizieren und aktualisieren
2. Testing durchführen
3. Search-Index Integration
4. Deployment vorbereiten

## 📊 Zusammenfassung der Änderungen

### Neue Dateien
- `src/lib/slug-builder.ts` - Slug-Generierung
- `src/lib/slug-builder.test.ts` - Tests
- `src/lib/slug-parser.ts` - Slug-Parsing
- `src/lib/slug-parser.test.ts` - Tests
- `src/util/hierarchy.seo.test.ts` - SEO-URL Tests
- `app/de/[publisherSlug]/[seriesSlug]/[issueNumber]/[[...slug]]/page.tsx` - DE-Route
- `app/us/[publisherSlug]/[seriesSlug]/[issueNumber]/[[...slug]]/page.tsx` - US-Route
- `app/de/[publisherSlug]/layout.tsx` - DE-Layout
- `app/us/[publisherSlug]/layout.tsx` - US-Layout
- `docs/SEO_URL_STRUCTURE.md` - Dokumentation

### Modifizierte Dateien
- `src/types/domain.ts` - RouteParams erweitert
- `src/util/hierarchy.ts` - generateSeoUrl() + getSelected() aktualisiert
- `src/lib/routes/metadata.ts` - Canonical-Support hinzugefügt

### Backward-Kompatibilität
- ✅ Legacy-URLs weiterhin funktionsfähig
- ✅ Alte Route-Handler bleiben bestehen
- ✅ Keine Breaking Changes
- ✅ Graduelle Migration möglich

## Umgebungsvariablen

Zur Aktivierung von Canonical-Links, bitte in `.env.local` oder `.env` hinzufügen:

```env
NEXT_PUBLIC_SITE_URL=https://shortbox.de
```

Falls nicht gesetzt, wird `https://shortbox.de` als Default verwendet.

