You are a senior Next.js App Router engineer working on a comic database application.

Goal:
Introduce a new SEO-friendly URL structure in parallel to the existing legacy URLs, without breaking existing functionality.

Requirements:
1. Keep all current URLs working exactly as they do now.
2. Add new canonical URLs for detail pages using this structure:

   /[locale]/[publisherSlug]/[seriesSlug]-[year]-vol[volume]/[issueNumber]/[formatSlug]/[variantSlug]

   Examples:
   /de/marvel/amazing-spider-man-1963-vol1/1/heft/standard
   /us/marvel/amazing-spider-man-1963-vol1/1/comic/variant-a

3. The new URL must resolve to the exact same detail page content as the old URL.
4. Internally, the app should prefer generating and linking to the new URL structure.
5. Legacy URLs must still resolve successfully and should not be removed.
6. Add canonical metadata so search engines prefer the new URLs.
7. If a legacy URL is opened, do not break functionality. You may optionally redirect to the canonical new URL only if this can be done safely without changing current behavior unexpectedly.
8. Use server-side rendering for detail pages.
9. Do not change application features or user-visible logic beyond URL and SEO improvements.

Implementation notes:
- Add route parsing for locale, publisher, series, year, volume, issue, format, variant.
- Use stable slug generation and parsing.
- Keep old route handlers/pages intact while introducing the new route handlers.
- Add utilities to build canonical URLs consistently from entities.

Deliverables:
- New App Router route implementation
- Shared URL builder utilities
- Canonical metadata support
- Backward-compatible legacy route handling

---

You are refactoring a Next.js + TypeScript application for robust SEO-friendly slugs.

Goal:
Implement a stable slug system for publisher, series, person, arc, appearance, genre, format, and variant.

Requirements:
1. Create a reusable slugify utility with these rules:
    - lowercase
    - replace ä→ae, ö→oe, ü→ue, ß→ss
    - normalize accented latin characters
    - replace spaces and separators with hyphens
    - remove unsafe special characters
    - collapse repeated hyphens
    - trim hyphens at both ends

2. Add parsing utilities for all new route segments.
3. Ensure slug generation is deterministic and stable.
4. Add URL builder helpers for:
    - detail page URLs
    - person filter URLs
    - arc filter URLs
    - appearance filter URLs
    - genre filter URLs

5. Make sure ambiguous or missing slug parts fail gracefully with 404 handling.
6. Do not change existing application behavior besides adding stable SEO URL support.

Deliverables:
- slugify utility
- parse helpers
- URL builder helpers
- tests for slug generation and parsing

---

You are optimizing a Next.js App Router comic database for SEO.

Goal:
Make the new detail page URLs the canonical URLs across the application.

Canonical detail page format:
/[locale]/[publisherSlug]/[seriesSlug]-[year]-vol[volume]/[issueNumber]/[formatSlug]/[variantSlug]

Requirements:
1. Add generateMetadata() for detail pages.
2. Set canonical URLs to the new SEO-friendly detail URL.
3. Generate title/description/OpenGraph/Twitter metadata from the issue detail data.
4. Ensure the detail page content is server-rendered and included in the initial HTML.
5. Preserve all current functionality.
6. Do not remove old URLs; only make the new ones canonical.

Suggested metadata style:
- Title: "[Series Title] ([Year]) #[Issue] – [Format] [Variant] | Shortbox"
- Description: "Details for [Series Title] issue [Issue], including publication format, variant, story information, and related metadata."

Deliverables:
- generateMetadata() implementation
- canonical URL support
- stable metadata generation from issue data

---

You are adding SEO-friendly filter landing pages to a Next.js App Router comic database.

Goal:
Expose existing filter functionality through indexable, server-rendered URLs without changing filter logic itself.

New routes:
- /[locale]/person/[personSlug]
- /[locale]/arc/[arcSlug]
- /[locale]/appearance/[appearanceSlug]
- /[locale]/genre/[genreSlug]

Requirements:
1. Each route must activate the existing internal filter for exactly that entity.
2. Reuse the existing filter/query infrastructure instead of duplicating filtering logic.
3. Render the filtered result page server-side.
4. The resulting HTML must contain real filtered content, not only loading placeholders.
5. Keep the current queryparam-based filters working.
6. Add canonical metadata for each new filter landing page.
7. Do not change the filter feature itself; only add route-based access to it.

Implementation notes:
- Route → map to existing filter state → render the normal filtered view
- Preserve current sorting/pagination behavior
- Keep the existing query-param filter implementation intact

Deliverables:
- New route handlers/pages
- Mapping from route params to existing filter state
- Canonical metadata for filter pages

---

You are refactoring navigation behavior in a Next.js comic database.

Goal:
When users click filter badges in the UI, navigate to the new route-based filter URLs instead of queryparam-only URLs.

New targets:
- person badge → /[locale]/person/[personSlug]
- arc badge → /[locale]/arc/[arcSlug]
- appearance badge → /[locale]/appearance/[appearanceSlug]
- genre badge → /[locale]/genre/[genreSlug]

Requirements:
1. Keep the underlying filter logic unchanged.
2. Only change navigation targets and internal link generation.
3. Preserve user-visible behavior: clicking a badge should still show the correctly filtered result.
4. Use centralized URL builder utilities.
5. Keep old queryparam URLs functional for backward compatibility.

Deliverables:
- Replace badge link targets
- Centralized route builders
- No feature regressions

---

You are improving SEO and SSR behavior in a Next.js App Router application.

Goal:
Ensure that all SEO-relevant detail pages and route-based filter pages render their main content on the server.

Scope:
- canonical detail pages
- /person/[slug]
- /arc/[slug]
- /appearance/[slug]
- /genre/[slug]

Requirements:
1. Render the main result content in Server Components.
2. Avoid client-side fetch for the primary indexable content.
3. Keep interactive enhancements client-side only where necessary.
4. Ensure "View Page Source" includes actual content for these pages.
5. Do not change filtering behavior; only move SEO-relevant content rendering server-side where possible.

Deliverables:
- Server-side rendered main content
- Reduced dependence on client-only API fetch for indexable pages
- No behavior regressions

---

You are implementing SEO metadata for route-based filter landing pages in a comic database.

Routes:
- /[locale]/person/[personSlug]
- /[locale]/arc/[arcSlug]
- /[locale]/appearance/[appearanceSlug]
- /[locale]/genre/[genreSlug]

Goal:
Generate useful metadata for search engines without adding content bloat.

Requirements:
1. Use generateMetadata() for all filter landing pages.
2. Set canonical URLs to the new route-based filter URLs.
3. Generate concise and specific titles and descriptions.

Suggested style:
- Person: "[Person Name] – Comics, Stories and Appearances | Shortbox"
- Arc: "[Arc Name] – Story arc issues and publications | Shortbox"
- Appearance: "[Appearance Name] – Comic appearances and publications | Shortbox"
- Genre: "[Genre Name] – Comics and stories by genre | Shortbox"

4. Add OpenGraph and Twitter metadata.
5. Do not invent editorial content; metadata should reflect actual filtered data.

Deliverables:
- generateMetadata() for all route-based filter pages
- canonical support
- consistent title/description strategy

---

You are extending sitemap support for a Next.js App Router application.

Goal:
Include the new canonical detail page URLs and the new route-based filter landing pages in the sitemap strategy.

Include:
- canonical detail pages
- person landing pages
- arc landing pages
- appearance landing pages
- genre landing pages

Requirements:
1. Keep the sitemap efficient and scalable.
2. Only include pages that should actually be indexed.
3. Use canonical URLs only.
4. Include lastModified where possible.
5. Do not include duplicate legacy URLs in the sitemap.

Deliverables:
- Updated sitemap implementation
- Canonical URL-only sitemap entries

---

You are hardening SEO behavior in a Next.js application with both legacy and new URLs.

Goal:
Prevent duplicate content issues while keeping legacy URLs functional.

Requirements:
1. New SEO-friendly URLs must be canonical.
2. Legacy URLs must remain accessible.
3. Add canonical tags on legacy-rendered pages pointing to the new canonical URLs.
4. Ensure sitemap only contains canonical URLs.
5. Review whether route-based filter pages should be indexable, while queryparam-based equivalents should not be canonical.
6. Preserve current application functionality.

Deliverables:
- canonical strategy across old and new URLs
- duplicate content mitigation
- no breaking changes for legacy navigation

---

You are adding structured data (JSON-LD) to a Next.js App Router application for SEO.

The application is a comic database. We only want structured data where it is accurate and useful.
Do NOT add SEO text or content bloat.

## Hierarchy
The site hierarchy for a detail page is:

Publisher → Series → Issue → Variant (Format/Variant)

Example URL:
/de/marvel/amazing-spider-man-1963-vol1/1/heft/standard

## Goal
Add Breadcrumb structured data (JSON-LD) to the DETAIL PAGE only, based on this hierarchy.

## Requirements

1. Implement JSON-LD BreadcrumbList on the detail page.
2. The breadcrumb must represent the hierarchy:

   Shortbox → Publisher → Series → Issue → Variant

3. Each breadcrumb item must link to the correct URL:
    - Shortbox → homepage
    - Publisher → publisher page
    - Series → series page
    - Issue → issue page
    - Variant → current detail page

4. Use generateMetadata() or a server component to inject JSON-LD.
5. Render JSON-LD server-side.
6. Do NOT add visible breadcrumb navigation unless it already exists.
   This task is about structured data only.

## Example JSON-LD structure

{
"@context": "https://schema.org",
"@type": "BreadcrumbList",
"itemListElement": [
{
"@type": "ListItem",
"position": 1,
"name": "Shortbox",
"item": "https://next.shortbox.de/de"
},
{
"@type": "ListItem",
"position": 2,
"name": "Marvel",
"item": "https://next.shortbox.de/de/marvel"
},
{
"@type": "ListItem",
"position": 3,
"name": "Amazing Spider-Man (1963)",
"item": "https://next.shortbox.de/de/marvel/amazing-spider-man-1963-vol1"
},
{
"@type": "ListItem",
"position": 4,
"name": "Issue #1",
"item": "https://next.shortbox.de/de/marvel/amazing-spider-man-1963-vol1/1"
},
{
"@type": "ListItem",
"position": 5,
"name": "Heft – Standard",
"item": "https://next.shortbox.de/de/marvel/amazing-spider-man-1963-vol1/1/heft/standard"
}
]
}

## Important
- Use real database values for names.
- Use canonical URLs.
- Only implement this for detail pages.
- Do not modify application behavior.

Deliverables:
- JSON-LD BreadcrumbList implementation
- Server-side rendering
- Correct canonical URLs in breadcrumb items