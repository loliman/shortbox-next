# Testing / CI Big Bang Plan

## Goal

Execute a one-pass testing reset that leaves the repository with:

- a clean Jest default
- usable UI, flow, and integration coverage
- a unified blocking TypeScript model for app and tests
- CI that reflects the intended testing stack directly

This plan is intentionally broad. It does not optimize for minimal surface area. It optimizes for replacing the current compromise state with a cleaner steady state.

## Workstream 1: Audit and Reclassify the Entire Test Tree

### Goal

Make an explicit decision for every meaningful current test class, especially the ignored and UI-heavy portion of the suite.

### Changes

- review the current active Jest suite
- review the currently ignored Jest tests
- group tests into:
  - keep under Jest as-is
  - keep under Jest but rewrite
  - migrate to Playwright
  - migrate to visual regression later
  - delete
- remove outdated assumptions from repository docs

### Areas

- `src/**/*.test.ts`
- `src/**/*.test.tsx`
- `jest.config.ts`
- `docs/workflows/testing-baseline.md`
- `docs/workflows/testing-target-picture.md`
- `docs/adr/004-testing-target-model.md`

### Risks

- deleting useful coverage by overcorrecting
- trying to preserve too much and failing to simplify
- leaving too many “temporary” exceptions in place

### Acceptance Criteria

- the ignored-test gray zone is gone as a concept
- every currently problematic test class has an explicit owner or is removed
- repository docs describe the actual new plan

## Workstream 2: Rebuild the Jest Baseline

### Goal

Make Jest trustworthy again as the default repository runner.

### Changes

- remove low-signal, heavily mocked, or runner-hostile tests
- rewrite valuable but messy Jest tests into clearer unit/regression tests
- reduce unnecessary `jsdom` usage
- keep `jsdom` only for focused component-unit behavior that still belongs in Jest
- simplify or eliminate `testPathIgnorePatterns` where possible

### Areas

- `jest.config.ts`
- `src/components/**`
- `src/services/**`
- `src/lib/**`
- `src/util/**`

### Risks

- short-term test count drops
- rewrites accidentally change coverage semantics
- too many component tests remain in Jest out of convenience

### Acceptance Criteria

- remaining Jest tests have clear signal value
- Jest’s scope is easy to explain
- ignored tests are either re-enabled, migrated, or deleted

## Workstream 3: Introduce Playwright As the Browser Owner

### Goal

Move real route, flow, and integration confidence into a proper browser layer.

### Changes

- add Playwright configuration
- add local and CI commands for browser smokes
- reuse seeded DB-backed fixture setup
- implement an initial smoke suite that covers both `de` and `us`

### Required First Smoke Coverage

1. `de` home shell load
2. `us` home shell load
3. canonical publisher -> series -> issue navigation
4. selected-path visibility and stability
5. search result navigation
6. compact or mobile navigation smoke

The final number of tests may be merged or split, but the product risks above must be covered.

### Areas

- new Playwright config and test files
- `package.json`
- fixture and seed scripts in `scripts/`
- selectors or test hooks in the app only where genuinely necessary

### Risks

- brittle selectors
- CI runtime growth
- pushing too much page semantics into Playwright instead of keeping logic in Jest

### Acceptance Criteria

- Playwright runs against production build/start
- `de` and `us` are both covered
- the browser layer owns critical flow risk that no longer belongs in Jest

## Workstream 4: Align CI With the New Testing Model

### Goal

Make GitHub Actions reflect the new ownership model directly.

### Changes

- keep `quality`, `a11y`, and `seo`
- add blocking `e2e-smoke`
- preserve non-blocking `observability`
- add or prepare non-blocking visual regression workflow if it does not stall the reset
- update local command mapping docs

### Areas

- `.github/workflows/validate.yml`
- `.github/workflows/observability.yml`
- `package.json`
- `docs/workflows/ci-and-dependency-automation.md`

### Risks

- CI duplication between jobs
- unstable startup sequencing for browser runs
- overloading the reset with visual tooling before the core browser layer is stable

### Acceptance Criteria

- PR validation blocks on browser smokes
- the CI docs match the workflow definitions
- observability remains explicitly non-blocking

## Workstream 5: Restore Unified TypeScript Validation

### Goal

Bring tests back under one explicit blocking type model with the application.

### Changes

- remove the long-term dependence on blanket `*.test.ts(x)` exclusion
- update TypeScript config so tests participate in blocking validation
- clean up remaining typing issues in test code
- keep only short-lived transitional exceptions if absolutely required during the reset

### Areas

- `tsconfig.json`
- `tsconfig.typecheck.json`
- any new or updated TypeScript config files
- `package.json`
- CI typecheck steps

### Risks

- a large burst of type failures from legacy tests
- spending too long on noise from tests that should simply be deleted
- mixing test cleanup and runtime typecheck concerns

### Acceptance Criteria

- tests are back under explicit blocking TypeScript validation
- the repository uses a unified typecheck model as the steady state

## Workstream 6: Add Visual Regression If It Fits the Reset Window

### Goal

Establish a visual owner for presentation risk without letting it derail the core reset.

### Changes

- introduce Storybook/Chromatic only if it can be completed cleanly in the same reset window
- focus on high-signal reusable surfaces first
- do not attempt route-wide screenshot coverage

### Suggested Initial Targets

- issue preview states
- sidebar row states
- top bar and search shell
- dark mode or responsive UI states with known visual fragility

### Areas

- reusable components in `src/components/**`
- new Storybook/Chromatic config if introduced

### Risks

- scope explosion
- conflating visual regression with browser integration
- introducing a half-finished visual layer

### Acceptance Criteria

- if included, the visual layer is intentional and limited
- if not included, the docs clearly mark it as the next follow-up after the reset

## Execution Order

Recommended order inside the Big Bang:

1. audit and classify the current test tree
2. cut and rewrite the Jest baseline
3. add Playwright and migrate real flow confidence
4. align CI
5. restore unified typecheck
6. add visual regression only if it does not dilute the main reset

These workstreams are part of one coordinated change, but this order keeps the cleanup logic coherent.

## Success Criteria

The reset is successful when:

- the repository has a coherent Jest suite
- low-value legacy tests are gone
- browser confidence exists in Playwright for `de` and `us`
- CI blocks on the right risks
- tests are no longer outside the unified TypeScript safety model
- the resulting docs match repository reality and intended usage

## Immediate Next Step

Start by classifying and cutting the existing Jest tree, especially:

- currently ignored tests
- UI-heavy `jsdom` tests
- editor workflow tests
- search and nav-bar tests that should move to Playwright

That decision pass determines what the new Jest baseline actually is before the rest of the reset is built on top of it.
