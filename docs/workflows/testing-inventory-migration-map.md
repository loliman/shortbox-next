# Testing Inventory And Migration Map

This document classifies the current test suite against the repository's long-term target testing stack:

- Jest for unit testing
- Chromatic + Storybook for visual snapshot regression testing
- Playwright for end-to-end testing

Vitest is not part of the intended default going forward.

Use this document to plan migration work incrementally. It is not a full file-by-file checklist.

## Current Test Landscape

The current repository has a working Jest baseline, including pure logic tests and selected `jsdom`-based component tests.

The practical migration groups are:

1. Stable Jest-first logic tests that already fit the current baseline
2. Low-risk tests that still need runner/API cleanup away from older patterns
3. UI/component tests that may later fit Storybook-driven coverage better
4. Workflow-heavy tests that may eventually belong in Playwright instead

Repository notes:

- the repo currently has no visible Storybook setup
- the repo currently has no visible Playwright setup
- migration therefore still has two dimensions:
  - keeping the current Jest suite healthy
  - introducing future testing foundations deliberately rather than implicitly

## Migration Buckets

### 1. Keep In The Jest Baseline

These tests already fit the current repository baseline well:

- pure `src/lib/` tests such as `src/lib/slug-builder.test.ts`, `src/lib/slug-parser.test.ts`, and `src/lib/url-builder.test.ts`
- `src/lib/read/` selection and navigation tests such as `src/lib/read/issue-selection.test.ts` and `src/lib/read/navigation-read.test.ts`
- `src/services/filter/` regression and normalization tests
- most pure helper tests in `src/util/`
- non-DOM component-adjacent helper tests

Why this bucket matters:

- these tests protect routing helpers, normalization rules, and domain logic
- they are the safest part of the current suite to keep extending

Migration guidance:

- keep them under Jest
- prefer plain Jest APIs and node-friendly setup
- fix ordinary failures without changing the overall test strategy

### 2. Continue Normalizing Older Helper Tests

These tests are good candidates for incremental cleanup when touched:

- helper-oriented tests that still reflect older runner assumptions
- pure or mostly pure tests that can stay under Jest without needing a browser
- tests whose main problem is API/style drift rather than scope

Typical examples include helper-heavy tests in:

- `src/components/filter/`
- `src/components/nav-bar/`
- `src/components/restricted/editor/issue-editor/`
- `src/components/restricted/editor/issue-sections/`
- `src/util/`

Migration guidance:

- move them toward one Jest style
- keep intent and coverage stable
- avoid turning them into broader component or integration tests while migrating

### 3. Candidate For Future Storybook-Driven Coverage

Some current UI-level tests likely describe states and interactions that would fit Storybook plus Jest/Chromatic better once that setup exists.

Typical examples include isolated component tests in:

- `src/components/filter/`
- `src/components/footer/`
- `src/components/top-bar/`
- `src/components/details/issue-details/`

Migration guidance:

- do not force a Storybook migration before Storybook exists in the repo
- when those areas are revisited, identify which states should become stories
- keep behavior assertions only where they add value beyond visual coverage

### 4. Candidate For Future Playwright Coverage

Some tests currently exercise richer flows, editor interactions, or integration wiring that may be more maintainable as real user journeys.

Typical examples include tests around:

- search and navigation flows
- paginated data loading
- editor workflows
- multi-step interactions with mocked routing or mutation behavior

Migration guidance:

- do not blindly port these into more complex Jest tests
- extract pure helpers into Jest-covered units where useful
- move true workflow confidence to Playwright once app-level coverage exists

## Recommended Migration Order

1. Keep the current Jest baseline healthy and green.
2. Normalize low-risk helper tests when they are touched anyway.
3. Introduce Storybook conventions before reworking visual/component-state coverage.
4. Introduce Playwright before trying to preserve complex mocked workflow tests indefinitely.
5. Revisit or remove tests whose value becomes redundant once better layers exist.

## Immediate Planning Implications

Before the next substantial feature wave, the highest-value testing work is:

- keep adding Jest-friendly tests for pure logic and normalization
- avoid introducing new Vitest-style patterns
- use `jsdom` only when the test genuinely needs browser APIs
- defer large test-strategy rewrites until Storybook or Playwright is intentionally added

This keeps the repository safe now without forcing a full testing-stack migration in one change.
