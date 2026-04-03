# Testing Target Picture

This document describes the intended end-state for automated testing in this repository.

It is written as a practical hand-off document for future implementation work, not just as a high-level principle statement.

Use it together with:

- [Testing baseline](./testing-baseline.md) for what runs reliably today
- [CI and dependency automation](./ci-and-dependency-automation.md) for the current GitHub Actions model
- [ADR 004: Testing Target Model](../adr/004-testing-target-model.md) for the architectural decision behind the target stack

## Purpose

The repository already has:

- a stable Jest-based unit and regression baseline
- blocking CI for quality, accessibility, and SEO
- non-blocking performance observability

What is still missing is a complete testing shape that covers:

- multi-step browser behavior
- route-level regressions
- selected-path and navigation stability
- visual presentation regressions in complex UI surfaces

This document defines that target shape so future work can be deliberate and incremental instead of re-deciding the testing model during feature work.

It also assumes that the current test inventory is not automatically correct just because it exists.

Part of the target-state work is to evaluate whether existing tests are still useful, trustworthy, and placed in the right layer.

## Target Testing Layers

The intended testing model has four layers.

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

## What Each Layer Should Own

The repository should converge on this responsibility split:

- Jest owns pure logic, regression, parity, and extracted domain helpers
- Playwright owns end-to-end and browser-only interaction risk
- Storybook/Chromatic owns appearance and snapshot-style visual regression
- `pa11y` owns route-level accessibility guardrails
- SEO smoke tests own canonical, robots, and sitemap correctness
- Unlighthouse owns performance observation, not merge blocking

This split matters because the main failure mode in mixed test suites is trying to force one tool to cover every kind of risk.

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
  - `npm run build`
  - `npm run test:a11y:pa11y`
- `seo`
  - `npm ci`
  - `npm run build`
  - `npm run start`
  - `npm run test:seo:smoke`
  - `npm run test:seo:sitemap`
- `e2e-smoke`
  - `npm ci`
  - `npm run build`
  - `npm run start`
  - small Playwright smoke suite

### Non-Blocking Or Scheduled

- `observability`
  - Unlighthouse desktop
  - Unlighthouse mobile
- `visual-regression`
  - Storybook build and Chromatic, or equivalent visual pipeline

The intended principle is:

- correctness, accessibility, SEO, and core browser flows should block merges
- performance trends and broader visual observation should stay visible without creating noisy PR failures

## Recommended Rollout Order

The repository should not attempt a big-bang testing migration.

Use this order instead.

### Phase 1: Keep The Current Baseline Stable

Already largely in place:

- Jest as the default runner
- typecheck focused on application code
- blocking quality, accessibility, and SEO workflows

Success criteria:

- no new `vitest` usage
- no new mixed-runner tests
- new pure logic tests default to Jest

### Phase 2: Add A Minimal Playwright Smoke Layer

First goal:

- 3 to 5 robust tests only

Recommended first smoke scenarios for this repository:

1. home page loads and key navigation shell is present
2. publisher -> series -> issue navigation works from a canonical path
3. selected navigation path is visible and stable after initial load
4. search opens and a result navigation succeeds
5. mobile drawer or compact-layout navigation smoke works on a narrow viewport

Success criteria:

- tests run against a production build
- tests avoid brittle timing assertions
- tests target stable canonical routes and selectors
- the suite is fast enough to become a PR gate

### Phase 3: Introduce Visual Regression Deliberately

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

### Phase 4: Migrate Or Retire Legacy Test Mismatches

Focus:

- remaining `vitest` usage
- tests that fight the current Jest baseline
- tests that should really be Playwright or Storybook/Chromatic coverage instead
- tests whose value is questionable and should be retired rather than migrated

Success criteria:

- repository defaults are easy to explain
- test placement matches test purpose
- future agents do not need to guess which runner to use
- low-signal or redundant tests have been removed instead of being preserved by default

## E2E Scope Guidance For Future Work

When adding Playwright, keep the scope narrow and product-driven.

Good first targets for this application:

- sidebar navigation and selected-path behavior
- search workflow
- route transitions between publisher, series, and issue detail pages
- responsive shell behavior on compact layouts
- one or two representative SEO-safe canonical paths in `de`
- later, one or two representative `us` flows if they meaningfully differ

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
- no new `vitest` coverage is being added
- a small Playwright smoke layer exists and blocks PRs
- a visual regression path exists for reusable UI surfaces
- current accessibility and SEO guards remain in place
- Unlighthouse remains observational rather than merge-blocking
- the repository docs explain which tool to use for which kind of risk

## Suggested First Follow-Up Task

If another agent is picking this up, the best next implementation task is:

1. add Playwright with a minimal production-build smoke setup
2. implement 3 to 5 stable canonical-flow tests
3. add a blocking `e2e-smoke` job to `Validate`
4. document local commands and route fixtures once the first suite is real

That is the highest-value missing step in the current testing model.
