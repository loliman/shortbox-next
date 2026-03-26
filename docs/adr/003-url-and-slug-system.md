# ADR 003: URL and Slug System

## Status
Accepted

## Context
The application depends heavily on stable canonical URLs for:
- SEO
- sitemap generation
- internal navigation
- filter landing pages
- detail pages

Manual URL construction risks inconsistencies.

## Decision
All slug generation and parsing is centralized in:
- `src/lib/slug-builder.ts`
- `src/lib/slug-parser.ts`

All public URL generation is centralized in:
- `src/lib/url-builder.ts`

Components and routes must not manually construct canonical URLs.

## Consequences
### Positive
- consistent canonical URLs
- safer refactoring
- easier AI-assisted development
- centralized SEO behavior

### Negative
- some legacy helpers may still overlap and must be reduced over time