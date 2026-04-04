# Testing Target Picture

This document describes the intended end-state for automated testing in this repository.

It is written as a practical hand-off document for future implementation work, not just as a high-level principle statement.

Use it together with:

- [Testing baseline](./testing-baseline.md) for what runs reliably today
- [Jest component testing policy](./testing-jest-component-policy.md) for behavior-first component coverage rules
- [CI and dependency automation](./ci-and-dependency-automation.md) for the current GitHub Actions model
- [ADR 004: Testing Target Model](../adr/004-testing-target-model.md) for the architectural decision behind the target stack

## Purpose

The repository already has:

- a stable Jest-based unit and regression baseline
- blocking CI for quality, accessibility, and SEO
- non-blocking performance observability
- a checked-in DB snapshot fixture for realistic route-level `a11y` and `seo` checks

What is still intentionally incomplete is the visual side of the target picture:

- visual presentation regressions in complex UI surfaces

This document defines that target shape so future work can be deliberate and incremental instead of re-deciding the testing model during feature work.

It also assumes that the current test inventory is not automatically correct just because it exists.

Part of the target-state work is to evaluate whether existing tests are still useful, trustworthy, and placed in the right layer.

It also assumes that test code should eventually meet the same basic TypeScript quality bar as application code.

The repository now includes test files in the blocking dedicated typecheck again.

## Target Testing Layers

The intended testing model has five layers.

### 1. Unit And Regression Tests

Primary tool:

- Jest

Purpose:

- pure business logic
- normalization and conflict rules
- slug and URL behavior
- metadata-safe helper behavior
- regression and parity coverage for extracted logic

Typical placement:

- `src/services/**/*.test.ts`
- `src/lib/**/*.test.ts`
- `src/util/**/*.test.ts`

This is the lowest-cost and most deterministic testing layer. It should remain the default for new pure logic coverage.

### 2. Browser Smoke Tests

Primary tool:

- Playwright

Purpose:

- route-level navigation
- selected-path visibility and stability
- search and navigation interactions
- responsive shell behavior
- regressions that only appear in a real browser

This layer should stay intentionally small and robust.

It is not meant to become a giant exhaustive UI suite. Its job is to protect critical user flows that Jest, pa11y, and SEO smokes cannot meaningfully cover.

### 3. Visual Regression Tests

Primary tool:

- Storybook + Chromatic

Purpose:

- card and preview presentation
- sidebar row rendering states
- dark mode and responsive presentation snapshots
- visual regressions in reusable UI surfaces

This layer is for appearance-oriented risk, not full browser workflow behavior.

When the main risk is "does this still look right?", visual regression is the preferred target over forcing that concern into Playwright or large component assertions.

### 4. Operational Guardrails

Primary tools:

- `pa11y`
- SEO smoke scripts
- sitemap validation
- Unlighthouse

Purpose:

- accessibility on canonical routes
- indexability and canonical correctness
- sitemap correctness
- trend-level performance visibility

These checks are already partially in place and should remain part of the long-term testing picture.

Current fixture model for this layer:

- `a11y` and `seo` now run against a disposable CI Postgres database
- that database is populated from a checked-in snapshot, not from ad hoc synthetic rows
- the current reference snapshot is `Marvel Horror Classic Collection 1`
- this issue was chosen because it has a rich graph of stories, parents, related source issues, individuals, and appearances
- the same seeded ephemeral database model should be treated as the source of truth for browser smoke coverage as well

## What Each Layer Should Own

The repository should converge on this responsibility split:

- Jest owns pure logic, regression, parity, and extracted domain helpers
- Jest component tests own small, behavior-first component contracts
- Playwright owns end-to-end and browser-only interaction risk
- Storybook/Chromatic owns appearance and snapshot-style visual regression
- `pa11y` owns route-level accessibility guardrails
- SEO smoke tests own canonical, robots, and sitemap correctness
- Unlighthouse owns performance observation, not merge blocking

This split matters because the main failure mode in mixed test suites is trying to force one tool to cover every kind of risk.

## Current Implemented State

The repository currently has the following target-picture pieces materially in place:

- Jest as the default unit/regression runner
- a smaller, cleaner Jest tree after removing low-signal mocked workflow tests
- Playwright smoke coverage for seeded `de` and `us` browser flows
- blocking `quality`, `a11y`, `seo`, and `e2e-smoke`
- non-blocking `observability`
- test files back under blocking TypeScript validation

The main major piece still intentionally outstanding is visual regression tooling.

The repository also still needs explicit coverage-to-Sonar wiring so that the quality of Jest coverage is visible in SonarCloud, not just locally.

## Quality Of The Existing Test Suite

The current repository already contains useful tests, but the suite should not be treated as untouchable or uniformly high-value.

Future work should explicitly question the quality of existing tests, including whether they:

- still protect a real product risk
- assert meaningful behavior instead of implementation detail
- belong in the current runner and layer
- are stable enough to deserve continued CI cost
- duplicate better coverage that now exists elsewhere

This means some existing tests may be:

- worth keeping as-is
- worth rewriting into a clearer Jest regression
- better moved to Playwright or visual regression coverage
- no longer worth keeping at all

The target is not "preserve every current test".

The target is:

- preserve high-signal coverage
- remove noisy, misleading, or redundant tests
- make the suite easier to trust and easier to extend

When in doubt, prefer fewer tests with clear product value over a larger suite that creates maintenance cost without meaningful protection.

## Recommended CI End-State

The intended CI shape is:

### Blocking On Pull Requests

- `quality`
  - `npm ci`
  - `npm run lint`
  - `npm run prisma:validate`
  - `npm run typecheck`
  - `npm run test:unit`
- `a11y`
  - `npm ci`
  - `npx prisma db push`
  - `node scripts/seed-ci-fixtures.mjs`
  - `npm run build`
  - `npm run test:a11y:pa11y`
- `seo`
  - `npm ci`
  - `npx prisma db push`
  - `node scripts/seed-ci-fixtures.mjs`
  - `npm run build`
  - `npm run start`
  - `npm run test:seo:smoke`
  - `npm run test:seo:sitemap`
- `e2e-smoke`
  - `npm ci`
  - `npx prisma db push`
  - `node scripts/seed-ci-fixtures.mjs`
  - `npm run build`
  - `npx playwright install --with-deps chromium`
  - `npm run test:e2e:smoke`

### Non-Blocking Or Scheduled

- `observability`
  - Unlighthouse desktop
  - Unlighthouse mobile
- `visual-regression`
  - Storybook build and Chromatic, or equivalent visual pipeline

The intended principle is:

- correctness, accessibility, SEO, and core browser flows should block merges
- performance trends and broader visual observation should stay visible without creating noisy PR failures

### Target Typecheck Expectation

The intended end-state is:

- application code and test code both participate in TypeScript validation
- test files should not stay permanently outside the repository's type-safety model
- runner and environment mismatches should be solved with clearer boundaries, not with blanket test exclusion forever

The repository now follows the preferred unified direction:

- one blocking typecheck includes `*.test.ts` and `*.test.tsx`

What is explicitly not the target:

- treating test exclusion as the permanent steady state
- using `*.test.ts(x)` exclusion as a substitute for cleaning up mixed-runner or badly placed tests

## Remaining Follow-Up Order

The repository has already completed the core Jest/browser/typecheck reset. The next remaining follow-up order is:

### 1. Keep The New Baseline Clean

First goal:

- preserve the current ownership split

Ongoing rules:

- keep Jest focused on unit/regression and small component-unit behavior
- keep browser flows in Playwright
- do not reintroduce mocked workflow tests as ignored debt

### 2. Introduce Visual Regression Deliberately

First goal:

- snapshot only the highest-value reusable surfaces

Recommended initial Storybook/Chromatic coverage:

- issue preview large and small
- sidebar rows in collapsed, expanded, selected, and long-title states
- top bar and search shell
- dark mode variants where the same UI frequently regresses visually

Success criteria:

- stories are intentionally authored for regression coverage
- visual checks focus on reusable UI states, not entire pages first
- the visual pipeline does not try to replace Playwright

## E2E Scope Guidance For Future Work

When adding Playwright, keep the scope narrow and product-driven.

Good first targets for this application:

- sidebar navigation and selected-path behavior
- search workflow
- route transitions between publisher, series, and issue detail pages
- responsive shell behavior on compact layouts
- one or two representative SEO-safe canonical paths in `de`
- later, one or two representative `us` flows if they meaningfully differ

Recommended seed baseline for those first flows:

- reuse the existing Marvel Horror snapshot whenever possible before inventing new fixture domains
- only add further seeded cases when a browser flow cannot be represented well by the current snapshot

Avoid at first:

- full catalog combinatorics
- exhaustive filter matrix coverage in the browser
- editor/admin flows unless there is a concrete product risk that justifies them
- giant screenshot-on-everything browser suites

Those areas are more expensive and should only be added after the small smoke layer proves stable.

## Visual Regression Scope Guidance For Future Work

When visual regression work starts, prefer reusable components and high-signal states.

Good first targets:

- issue preview fallback and real-cover states
- sidebar expanded and selected row states
- dark mode preview and chrome states
- layout-sensitive shells that have regressed before

Avoid at first:

- snapshotting every route
- large, data-heavy pages with unstable content
- mixing visual approval with complex browser workflows in one suite

## How To Choose The Right Test Type

Use this rule of thumb:

- if the behavior is pure logic or normalization, use Jest
- if the behavior is route-level or depends on a real browser, use Playwright
- if the main risk is how a UI state looks, use Storybook/Chromatic
- if the concern is canonical metadata, robots, or sitemap behavior, use the SEO smoke layer
- if the concern is route accessibility, use `pa11y`

If more than one seems possible, choose the smallest layer that covers the real product risk.

## Constraints For Future Agents

Future testing work should respect these repository-specific constraints:

- keep pages and route handlers thin
- do not move business logic into browser tests if it can be extracted and unit-tested
- prefer canonical routes over ad hoc test-only paths
- do not introduce new test runners casually
- do not use Playwright as a replacement for missing unit coverage
- do not use visual regression as a replacement for browser interaction coverage
- do not keep legacy tests purely because they already exist
- do not migrate brittle or low-value tests mechanically without first asking whether they should survive at all

The testing stack should become clearer over time, not more mixed.

## Definition Of Done For The Testing Target

The testing target should be considered materially in place when:

- Jest remains the default unit and regression runner
- a small Playwright smoke layer exists and blocks PRs
- a visual regression path exists for reusable UI surfaces
- current accessibility and SEO guards remain in place
- Unlighthouse remains observational rather than merge-blocking
- the repository docs explain which tool to use for which kind of risk
- test files are back under explicit TypeScript validation, either through the main typecheck or a dedicated blocking test-typecheck step

## Suggested First Follow-Up Task

If another agent is picking this up, the best next implementation task is:

1. add Playwright with a minimal production-build smoke setup
2. implement 3 to 5 stable canonical-flow tests
3. add a blocking `e2e-smoke` job to `Validate`
4. document local commands and route fixtures once the first suite is real

That is the highest-value missing step in the current testing model.
