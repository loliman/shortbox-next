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

## Layer 4 – Business Matching
`src/services/filter-service.ts`
- Domain filter semantics
- Matching logic

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
