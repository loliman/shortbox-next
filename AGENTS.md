# AGENTS.md

This document is written for AI coding agents.  
It defines the architecture, rules, and working style for this codebase.  
Follow these rules exactly unless explicitly instructed otherwise.

This repository is **AI-first**: code should be structured so that automated agents can understand, extend, and refactor it safely.

---

# Project Overview

Shortbox is a Next.js App Router application written in TypeScript.

It is a comic publication database with:
- server-rendered detail pages for publishers, series, issues, and variants
- filter-based catalog browsing (query-param and route-based)
- SEO-optimized canonical URLs and structured data
- background worker tasks for data maintenance
- restricted admin and editor interfaces

The application manages two catalog contexts: `de` (German editions) and `us` (US editions).

**Important:**  
`de` and `us` are **domain contexts**, not language locales.  
Do not introduce i18n frameworks. These are content scopes, not translations.

---

# Architectural Layers

The project is organized into logical layers.  
Dependencies should generally point **downwards**.

## Preferred dependency direction

- `app/` → may use `src/components/`, `src/services/`, `src/lib/`
- `src/components/` → may use UI-safe helpers and selected service/lib helpers
- `src/services/` → may use `src/lib/`, `src/util/`, `src/types/`
- `src/lib/` → may use `src/util/`, `src/types/`
- `src/util/` → must not import from `src/services/`, `src/lib/`, `src/components/`, or `app/`
- `src/core/` is legacy. Do not add new code there.

This is a **guideline**, not a rigid compile-time rule, but new code must follow it.

---

# Folder Responsibilities

## `app/` – Entry Layer (Next.js)

Contains:
- pages
- layouts
- route handlers
- sitemap
- robots
- metadata

**Rules:**
- Pages must be thin: parse input → call lib/service → render component.
- No business logic in pages.
- No Prisma access in `app/`.
- Use `notFound()` when required data is missing.
- Always use metadata helpers from `src/lib/routes/metadata.ts`.
- Always `await params` and `await searchParams` to match the current App Router conventions used in this repo.

**Thin page pattern:**
1. Parse params / query
2. Call read helper (`src/lib/read/*`)
3. `notFound()` if data missing
4. Render component

**API routes** are thin controllers:
- validate input
- call service/lib
- return response
- no Prisma and no business logic directly in route handlers

---

## `src/components/` – Presentation Layer

React components and UI logic only.

**Allowed:**
- Rendering
- Form state
- UI state normalization
- Calling services or API routes
- Using URL builders

**Not allowed:**
- Prisma
- Business workflows
- Domain conflict resolution
- Slug generation
- Direct database logic

**Filter UI special rule:**
`src/components/filter/defaults.ts` handles **form state parsing**, but delegates
business conflict resolution to `src/services/filter/`.

---

## `src/services/` – Business Logic Layer

Contains:
- Domain workflows
- Business rules
- Feature coordination
- Conflict resolution
- Domain-level normalization

**If the question is “how does the domain behave?” → it belongs here.**

Services:
- may call `src/lib/`
- may call `src/util/`
- must NOT import from `src/components/` or `app/`
- must NOT contain HTTP or Next.js logic

**Examples:**
- src/services/filter-service.ts
- src/services/story-service.ts
- src/services/user-service.ts
- src/services/marvel-crawler-service.ts
- src/services/filter/*

---

## `src/lib/` – Infrastructure / Technical Layer

Contains:
- Prisma access
- Database queries
- Routing helpers
- Metadata builders
- Slug parsing
- URL builders
- Structured data
- Server-only adapters

**Rules:**
- All Prisma access belongs here.
- Files using Prisma must include `import "server-only";`
- `src/lib/read/` → read operations
- `src/lib/server/` → write/orchestration
- `src/lib/routes/` → metadata, structured data, page-state parsing
- Slug and URL builders live here.

---

## `src/util/` – Small Pure Helpers

Contains small, reusable, pure helper functions.

**Important:**
This folder is intended for **small, dependency-light helpers**.  
Some legacy files are more domain-specific than ideal.  
Do not use this as a precedent for new business logic.

**Rules:**
- No Prisma
- No business workflows
- No imports from services/lib/components/app
- Prefer pure functions

---

## `src/worker/` – Background Jobs

Async tasks and maintenance jobs.

**Rules:**
- Workers call services.
- Do not duplicate business logic in workers.
- Do not access Prisma directly if a service already exists.

---

## `src/types/`

Shared TypeScript types only. No implementation logic.

---

## `src/core/` – Legacy

Legacy code.  
Do not add new files here.  
When touching files in `src/core/`, migrate logic to the correct layer if possible.

---

# Filter Architecture (Reference Example)

The filter system is the reference example for layered architecture.

## Layer 1 – UI State
`src/components/filter/`
- Form state
- UI defaults
- Query serialization
- UI parsing

## Layer 2 – Business Conflict Rules
`src/services/filter/`
- Negation/exclusivity rules
- Collection mode priority
- Legacy normalization

## Layer 3 – Technical Query
`src/lib/read/filter-read.ts`
- Prisma WHERE construction
- Query execution
- Domain filter semantics expressed as Prisma `WhereInput` and (for the group-aware uncollected mode) a dedicated in-app helper backed by materialised Issue-level facts. See ADR 005.

**Never bypass layers.**

---

# URL and Slug Rules

Always use:
- `src/lib/url-builder.ts`
- `src/lib/slug-builder.ts`
- `src/lib/slug-parser.ts`

Never construct URLs manually.  
Never implement slug logic in components.

---

# Metadata and SEO

Always use:
- `createRouteMetadata()`
- `createPageMetadata()`
- `createWorkspaceMetadata()`
- `createHomeMetadata()`

Never manually set canonical or robots in page files.

---

# Refactoring Rules

When modifying existing code:

- Prefer **incremental refactoring**, not large rewrites.
- Prefer **extraction and delegation** over moving many files.
- Preserve public APIs unless explicitly instructed to change them.
- When touching legacy code, improve boundaries locally (“boy scout rule”).
- Add **parity/regression tests** before changing normalization or migration logic.
- Do not move large modules across layers in a single change.

---

# Required Working Style for Agents

For non-trivial tasks, follow this workflow:

1. Identify the architectural layer of the change.
2. Reuse existing utilities and patterns where possible.
3. Prefer the smallest safe implementation.
4. Keep pages and route handlers thin.
5. Place business rules in `src/services/`.
6. Place Prisma access only in `src/lib/`.
7. Add or update tests for pure functions.
8. Do not refactor unrelated areas.
9. Summarize what was changed and what was intentionally left unchanged.

---

# Legacy Hotspots

Be extra careful when modifying these areas:

- `src/core/`
- `src/util/filter-updater.ts`
- `src/lib/server/issues-write.ts`
- older route handlers in `app/api/`
- legacy filter parsing paths

When working in these areas:
- prefer extraction over rewriting
- add regression tests first
- keep behavior stable

---

# Comic Data Curation & Multi-Source Reconciliation

When curating, importing, or migrating comic issue, story, or individual data:
- Always use the `.agents/skills/comic-data-curator/` skill and its reconciliation engine.
- **Universal Per-Issue Curation Loop:** Curation ALWAYS proceeds strictly issue by issue (atomic process): The agent takes a single issue, reconciles it against all external sources (UHBMCC, GCD, etc.), decides autonomously (on normalized consensus) or records non-decisions (on conflict), documents the result, and only then proceeds to the next issue.
  - **Uniformity:** The process is ALWAYS identical for every issue.
  - **Parallelization:** Parallel processing is explicitly allowed (e.g. across issues or series using subagents/workers), but every issue must undergo the complete, isolated 4-step cycle.
  - **Non-Decisions:** Genuine discrepancies between sources (conflicting titles/translators) are non-decisions and must NEVER be guessed or decided autonomously. They must be documented with all raw source values and presented to the user for manual decision.
- **Source Hierarchy & Core Mandate:** $\text{UHBMCC} > \text{GCD} > \text{Jedi-Bibliothek (Star Wars)} > \text{ComicGuide} > \text{Erweiterte glaubwuerdige Quellen (Fallback)}$.
  **DIE DATENBANK IST NIEMALS DIE QUELLE!** Never perform isolated "in-DB hygiene" or blind database-only cosmetic changes. Every single issue, variant, and story must be curated and verified against external primary sources.
  - **Autonome Erschließung neuer Quellen (Fallback):** Wenn die etablierten Primärquellen (UHBMCC, GCD, Jedi-Bibliothek, ComicGuide) zu einem Heft oder einer Serie keine Daten oder Inhalte liefern, ist der Agent verpflichtet und ermächtigt, eigenständig weitere glaubwürdige, belastbare Quellen zu recherchieren, zu erschließen und als Beleg heranzuziehen (z. B. Verlagsarchive wie blue-ocean.de / panini.de, DNB / Katalog der Deutschen Nationalbibliothek, Sammler-/Fanzine-Archive, Comicvine, Bedetheque, Verkaufs- und Auktions-Scans von Inhaltsseiten, Impressen und Beilagen). Jede neu herangezogene Quelle wird transparent dokumentiert und als Beleg hinterlegt.
- **Multi-Source Obligation:** Never stop at the first source. Check **ALL** available sources.
- **Normalization:** Strings are compared case-insensitively, with collapsed whitespace, outer parentheses and brackets stripped, German orthography normalized (`ß` -> `ss`), ampersands normalized (`&` -> `und`), genitive apostrophes normalized (`'s` -> `s`), and numeral/word counter equivalence (`Teil eins` <-> `Teil 1`). Identical values after normalization (`"X "` vs `" x "`, `"Dreißig"` vs `"Dreissig"`, `"(Tot - Teil 2)"` vs `"Tot, Teil 2"`, `"Blitz & Donner"` vs `"Blitz und Donner"`) are considered consensus, not conflict. Known translator typo variants (e.g. `Strittmater` -> `Strittmatter`) map to canonical individuals.
- **Conflict Handling:** Genuine semantic discrepancies between sources (different titles, different translators) must **NEVER** be resolved automatically. They must be escalated to the user for manual review.
- **Issue Disambiguation:** Matching requires Title + Volume/Start Year + Issue Number. If matches are ambiguous (multiple candidates) or 0 candidates are found, escalate to the user for manual review.
- **Strict Invariants:**
  - Never copy US parent titles into German editions.
  - Never use artificial dummy strings (`"Untitled"`, `"(ohne Titel)"`, `"1st story"`, `"Cover"`). If a story has no German title: `title: ""`. If an entry in the primary source or printed issue is an authentic pin-up, the title *„Pin-up“* (as attested in the source) is legitimate and must be retained.
  - Genuine printed counters (*„Teil 1“*, *„Kapitel 2“*) remain in `Story.title`; editorial fraction counters (e.g. `(1/2)`, `1/2`, `3/4`) from catalogers (such as UHBMCC) are strictly forbidden internal markers and must be stripped from titles.
  - Kein Präfix- oder Suffixverbot: Präfixe und Suffixe (wie *„Die unbesiegbare Spinne: ...“*) sind ERLAUBT – wenn eine Story so heißt, dann heißt sie so. Bereinigt werden ausschließlich echte Rohdaten-Artefakte wie angehängte Seitenzahlen (`13 (5-8)`), OCR-Scanfehler (` 7i` -> `!`) und typografische Kontraktionsfehler (Backticks).
  - Story sequence validation: Never assume `Story.number` in the database is in correct printed order. Match stories semantically (US parent issue, title, content) and re-sequence `Story.number` to match primary sources (GCD sequence number, UHBMCC order).
  - Strict Marvel Scope: Shortbox exclusively catalogs German-language Marvel material (anything ever published worldwide by Marvel or later reprinted by Marvel, such as Star Wars from Dark Horse). Non-Marvel stories in mixed anthologies/magazines (e.g. Bastei Gespenster Geschichten) are deliberately excluded and must never be imported.
  - Translators in GCD must be pulled from `gcd_story_credit` with `gcd_creator_name_detail`.
  - Universelles Erb-Verbot für Titel und Übersetzer: Kein Heft darf Titel erben. Kein Heft darf Übersetzer erben. Dies gilt ausnahmslos für ALLE Hefte (kein Sonderfall für Bootlegs oder Fanzines). Alle Hefte müssen gegen alle externen Quellen geprüft werden.
  - Hefte ohne Stories vs. Varianten (Ausnahmslose Prüfpflicht für ALLE Issues): ALLE, AUSNAHMSLOS ALLE Hefte (`Issue`) ohne Stories MÜSSEN intensiv geprüft werden! Es gibt kein einziges Heft, das ignoriert oder pauschal als „leer“ abgetan werden darf. Wenn ein Heft keine Stories besitzt, greift verpflichtend Workstream 2 (Skill `comic-story-discoverer`). Einzige Ausnahme sind Varianten (`Variant`), da Varianten im Datenmodell von Shortbox naturgemäß keine eigenen Stories besitzen, sondern am Issue hängen. Existiert ein Band jedoch NUR als Hardcover und hat kein Softcover, ist dieser HC das eigenständige Heft/Issue selbst und trägt ganz normal die Comic-Stories. Varianten dürfen niemals ignoriert werden und müssen vollständig mit Metadaten (`gcdId`, `comicGuideId`, `pages`, `releaseDate`, `price`, `currency`, Format, Limitierung, ISBN) versorgt werden.
  - US-Ausgaben: Ausnahmslos Marvel Wikia & Wikia-API-Brücke: US-Ausgaben werden IMMER und AUSNAHMSLOS aus der Marvel Wikia (`https://marvel.fandom.com/wiki/`) bezogen. Existieren Ausgaben dort noch nicht, müssen sie automatisiert über die Wikia/MediaWiki API angelegt werden (Informationen vorab aus GCD oder anderen seriösen Quellen extrahieren), bevor sie mit dem Shortbox-Crawler importiert werden. Werden Comic-Stories erst in erweiterten Sekundärquellen gefunden, müssen diese vor einer Übernahme zwingend detailliert dem Nutzer zum Review vorgelegt werden. Verbot von Blind-Defaults: Es darf bei mehreren US-Stories niemals blind auf Story #1 defaulted werden.
  - Absolutes Verbot eigenmächtiger Annahmen: Der Agent darf **NIEMALS** Annahmen treffen. Annahmen trifft ausschließlich der Nutzer und der Agent pflegt sie nur mit dessen ausdrücklicher Zustimmung ein.
  - Every migration must generate a JSON backup and a working rollback script.
  - Deterministic Self-Evolution: After each curation run, the agent must evaluate the process, translate manual heuristics into deterministic rules, close normalization gaps, and expand test suites to ensure autonomous repeatability.

---

# Writing Tests

Test runner: **Jest**

Rules:
- Test pure functions in `src/services/` and `src/util/`
- Test slug and URL builders
- Test filter parsing and serialization
- Use `*.test.ts`
- Use descriptive test names: `should_when_then`

Example:
```ts it("should prioritize onlyCollected when all collection modes are set", () => { ... });```

---

## What Not To Do

Never:

- Put business logic in `app/` pages or route handlers.
- Access Prisma outside `src/lib/`.
- Construct URLs manually.
- Implement slug logic outside `src/lib/slug-builder.ts`.
- Add new code to `src/core/`.
- Put large business logic into `src/util/`.
- Duplicate filter normalization logic.
- Manually set canonical or robots in pages.
- Add non-canonical URLs to the sitemap.
- Introduce i18n frameworks (`de`/`us` are domain contexts, not languages).
- Skip `notFound()` on unresolved entities.

---

## Definition of Done

A task is complete only if:

- [ ] Code is placed in the correct architectural layer
- [ ] No business logic in `app/`, `src/components/`, or `src/util/`
- [ ] No Prisma access outside `src/lib/`
- [ ] URLs generated via URL builder
- [ ] Metadata helpers used
- [ ] Sitemap updated if new canonical pages exist
- [ ] Tests added/updated for pure logic
- [ ] ESLint passes
- [ ] Jest tests pass

---

## Final Note for Agents

This codebase prefers:

- clear boundaries over clever code
- pure functions over large classes
- small modules over large files
- delegation over duplication
- incremental refactoring over rewrites
- explicit rules over implicit conventions

When in doubt, choose the solution that **keeps architectural boundaries clear** and **keeps behavior stable**.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
