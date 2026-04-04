# Testing / CI Big Bang Spec

## Goal

Rebuild the repository testing model in one deliberate pass so that:

- Jest becomes the clear and trustworthy default for repository test coverage
- low-value or mismatched legacy tests are removed instead of being preserved by inertia
- real UI, flow, and integration confidence moves to a proper browser layer
- application code and test code return to one explicit TypeScript validation model
- CI reflects the intended testing ownership model instead of a temporary compromise

This spec intentionally replaces a cautious, incremental migration posture with a repository-wide testing reset.

## Problem Statement

The repository has a workable baseline, but not a clean one.

Today it already has:

- a stable Jest command for many logic and regression tests
- blocking CI jobs for `quality`, `a11y`, and `seo`
- non-blocking `observability`
- DB-backed fixture seeding for route-level `a11y` and `seo`

Today it still suffers from:

- an unclear split between valuable Jest coverage and legacy Jest/UI leftovers
- ignored tests that are neither part of the active baseline nor fully retired
- missing browser smoke coverage for real route and workflow regressions
- no visual regression path
- test files excluded from the dedicated blocking typecheck
- documentation that still reflects an earlier mixed-runner migration posture more than the current repository reality

The target is not to preserve the current testing tree.

The target is to make the repository testing model easy to explain, easy to trust, and easy for future agents to extend.

## Desired End State

After the Big Bang reset, the repository should have this testing model:

### 1. Unit / Regression

Primary tool:

- Jest

Purpose:

- business logic
- normalization and conflict rules
- slug, URL, and metadata-safe helpers
- read/helper regression coverage
- extracted pure UI-adjacent helpers where the real risk is logic, not rendering

Expected quality bar:

- deterministic
- low mock complexity
- clear product or domain value
- minimal runner ambiguity

### 2. Component Unit

Primary tool:

- Jest with `jsdom`

Purpose:

- small, focused component behavior that still fits a unit-test model

Allowed:

- limited DOM interaction
- focused rendering assertions
- small local UI state transitions

Not allowed as steady-state Jest coverage:

- route-level navigation workflows
- search journey confidence
- responsive shell confidence
- heavily mocked Apollo/router flows that simulate end-to-end behavior poorly
- broad editor workflow wiring tests

### 3. Browser Smoke / Integration

Primary tool:

- Playwright

Purpose:

- route-level navigation
- selected-path stability
- search and result navigation
- responsive shell behavior
- critical product flows that only a real browser can validate

Expected first-class scope:

- canonical `de` flows
- canonical `us` flows
- both contexts treated as domain scopes, not i18n locales

This layer should absorb integration and flow confidence that does not belong in Jest anymore.

### 4. Visual Regression

Primary tool:

- Storybook + Chromatic

Purpose:

- high-signal reusable UI states
- appearance-oriented regression protection

This should exist as part of the target model, but it must not distort the more urgent Jest and browser reset.

### 5. Operational Guards

Primary tools:

- `pa11y`
- SEO smoke scripts
- sitemap smoke scripts
- Unlighthouse

Purpose:

- route accessibility
- canonical, robots, and sitemap correctness
- observational performance trend visibility

Expected posture:

- `a11y` stays blocking
- `seo` stays blocking
- `observability` stays non-blocking

## Ownership Model

The repository should converge on this ownership split:

- Jest owns deterministic logic and focused unit-level UI behavior
- Playwright owns browser-only, route-level, and workflow-level risk
- Storybook/Chromatic owns visual and presentation risk
- `pa11y` owns route-level accessibility guardrails
- SEO smoke and sitemap checks own canonical/indexability correctness
- Unlighthouse owns observation, not merge blocking

If a test can fit in more than one place, use the smallest layer that still protects the real risk.

## Big Bang Repository Rules

The reset may be broad, but it still must obey repository architecture rules:

- no business logic in `app/` pages or route handlers
- no Prisma access outside `src/lib/`
- no large domain behavior moved into test-only browser layers
- no new code in `src/core/`
- no implicit architecture rewrites hidden inside testing work

Testing may be reorganized aggressively, but production-layer boundaries must remain clean.

## Existing Test Policy

All current tests are subject to re-evaluation.

### Keep

Keep a test when it:

- protects a real product or domain behavior
- is deterministic
- is not overly coupled to implementation detail
- clearly belongs in Jest

### Rewrite

Rewrite a test when it:

- has real value
- currently has noisy structure or outdated assumptions
- can become a clearer Jest unit/regression test without changing its ownership layer

### Migrate

Migrate a test when it:

- protects a real behavior
- currently lives in the wrong runner or abstraction layer
- would be more trustworthy in Playwright or visual regression

### Delete

Delete a test when it:

- mainly checks implementation detail or callback wiring
- has low signal relative to maintenance cost
- is redundant with better coverage
- would only survive by force-fitting it into a runner that no longer owns that risk

This spec explicitly prefers deletion over sentimental preservation.

## Expected Big Bang Decisions By Current Test Class

### Strong Jest Keep Candidates

- pure tests in `src/services/**`
- pure tests in `src/lib/**`
- pure tests in `src/util/**`
- deterministic parity and regression tests that protect domain semantics

### Likely Jest Rewrite Candidates

- component-adjacent helper tests in `src/components/**` where the real risk is parsing, state normalization, formatting, or small helper logic

### Likely Playwright Migration Candidates

- search interaction flows
- nav-bar selected-path and route interaction flows
- responsive shell behavior
- route transition flows between publisher, series, and issue pages

### Likely Delete Candidates

- heavily mocked editor workflow tests
- tests that mostly verify callback plumbing or mocked mutation wiring
- ignored tests that no longer earn their CI and maintenance cost

## TypeScript Validation Target

The Big Bang target for TypeScript is explicit:

- application code and test code should participate in one repository type-safety model

Preferred end state:

- a unified blocking typecheck that includes test files

Acceptable temporary implementation detail during the reset:

- short-lived intermediate config steps while the test tree is being rewritten

What is not acceptable after the reset:

- permanent blanket exclusion of `*.test.ts` and `*.test.tsx`

## Fixture and Seed Strategy

The existing DB-backed fixture model should be preserved and reused.

Rules:

- keep the checked-in Marvel Horror snapshot as the default seeded domain for route-level checks
- reuse it for `a11y`, `seo`, and initial Playwright flows whenever possible
- add a second fixture domain only if `us` browser coverage cannot be represented credibly by the current snapshot
- keep fixture changes intentional and checked in
- do not regenerate fixtures automatically in CI

The fixture system is infrastructure support. It must not become a place where repository business rules get reimplemented.

## CI Target State

The intended CI shape after the reset is:

### Blocking

- `quality`
  - `npm ci`
  - `npm run lint`
  - `npm run prisma:validate`
  - `npm run typecheck`
  - `npm run test:unit`
- `a11y`
  - DB-backed seeded route audit
- `seo`
  - DB-backed seeded metadata and sitemap checks
- `e2e-smoke`
  - seeded database
  - production build
  - production start
  - Playwright smoke suite for `de` and `us`

### Non-blocking

- `observability`
- `visual-regression`

## Definition Of Done

The Big Bang reset is complete when:

- Jest is the clear default for unit and regression coverage
- no legacy ignored-test gray zone remains without an explicit keep/migrate/delete outcome
- low-value legacy tests have been removed rather than passively preserved
- Playwright exists as the real owner of browser and flow confidence
- `de` and `us` both have browser smoke coverage
- current `a11y` and `seo` guards remain intact
- `observability` remains observational
- test files are back under explicit blocking TypeScript validation
- repository docs explain the testing model without fallback caveats that depend on older compromises

## Recommended Implementation Posture

The repository should execute this reset in one coordinated effort:

1. classify and cut the current Jest/UI tree aggressively
2. clean and stabilize the Jest baseline
3. add Playwright and move real flow confidence there
4. restore unified typecheck coverage for tests
5. align CI and docs to the new testing ownership model

The point of the reset is not gradual comfort. The point is clarity.
