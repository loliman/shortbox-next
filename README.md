# shortbox-next

Shortbox is a Next.js App Router application for Marvel publication data across two domain contexts: `de` (German editions) and `us` (US editions). It serves SEO-focused catalog and detail pages for publishers, series, issues, and variants, and includes restricted editorial workflows plus background worker tasks.

`de` and `us` are domain contexts, not language locales. Do not introduce i18n assumptions or frameworks for them.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## AI-First Onboarding

This repository is designed for both human contributors and coding agents. For anything beyond a small, obvious fix, the intended workflow is:

`spec -> plan -> implement -> test -> review`

Start here:

- [AGENTS.md](AGENTS.md) for repository-wide architecture, layering rules, and agent working style
- [AI feature workflow](docs/workflows/ai-feature-development.md) for the expected delivery sequence for non-trivial changes
- Existing specs in `specs/` as examples for scope, business rules, risks, and acceptance criteria
- Existing plans in `plans/` as examples for file changes, layer placement, and verification

For non-trivial work:

1. Create or update a spec in `specs/`.
2. Create or update the paired plan in `plans/`.
3. Implement in small steps that respect the documented layers.
4. Run the planned validation locally.
5. Review against the spec, plan, and architecture rules.

Keep the README as the entry point and use the linked docs as the source of truth.

## Main Rules and Docs

- [AGENTS.md](AGENTS.md) for repository-wide architecture, layering rules, and agent working style
- [Architecture overview](docs/architecture/overview.md)
- [Module boundaries](docs/architecture/module-boundaries.md)
- [Domain overview](docs/domain/overview.md)
- [Domain entities](docs/domain/entities.md)
- [ADR: layered architecture](docs/adr/001-layered-architecture.md)
- [ADR: filter architecture](docs/adr/002-filter-architecture.md)
- [ADR: URL and slug system](docs/adr/003-url-and-slug-system.md)

In practice:

- keep `app/` pages and route handlers thin
- place business logic in `src/services/`
- place Prisma and database access in `src/lib/`
- use URL, slug, and metadata helpers instead of ad hoc implementations

## Local Validation

Common development and validation commands:

```bash
npm run dev
npm run build
npm run lint
npm test
```

For the current automated test baseline and its limitations, see [Testing baseline](docs/workflows/testing-baseline.md).
For the intended end-state across Jest, Playwright, visual regression, accessibility, and SEO coverage, see [Testing target picture](docs/workflows/testing-target-picture.md).
For CI job structure, blocking rules, and Dependabot policy, see [CI and dependency automation](docs/workflows/ci-and-dependency-automation.md).

SEO-specific checks against a running app:

```bash
npm run test:seo:smoke
npm run test:seo:sitemap
```

The SEO scripts default to `http://localhost:3000` and support overrides such as `BASE_URL`, `SEO_SMOKE_ROUTES_FILE`, `SITEMAP_URL`, and `SITEMAP_LIMIT`.

## Scope of This README

This README is intentionally lightweight. It points to the authoritative architecture, domain, and workflow docs instead of restating them. If you are starting feature work, read the workflow doc and the closest paired spec/plan examples before changing product code.
