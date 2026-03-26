# Testing Inventory And Migration Map

This document classifies the current test suite against the repository's chosen target testing stack:

- Jest for unit testing based on composed Storybook stories
- Chromatic + Storybook for visual snapshot regression testing
- Playwright for end-to-end testing

Vitest is not part of the future default.

Use this document to plan migration work incrementally. It is not a full file-by-file checklist.

## Current Test Landscape

The current test tree under `src/` falls into four practical groups:

1. Stable pure logic tests that already fit a Jest-first unit baseline
2. Pure or helper-oriented tests that use Vitest APIs but should migrate cleanly to Jest
3. UI/component tests that currently mix Vitest, React Testing Library, Apollo mocks, and ad hoc DOM assumptions
4. A small number of tests whose current value or long-term home is unclear until the new testing stack is in place

Repository notes:

- The repo currently contains no visible Storybook stories or Storybook/Chromatic setup.
- The repo currently contains no visible Playwright setup.
- Migration therefore has two dimensions:
  - runner and API cleanup for existing tests
  - introducing the missing target-stack foundations

## Migration Buckets

### 1. Keep Or Adapt To The Jest Unit Baseline

These tests already match the intended near-term baseline well:

- pure `src/lib/` tests such as [`src/lib/slug-builder.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/lib/slug-builder.test.ts), [`src/lib/slug-parser.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/lib/slug-parser.test.ts), and [`src/lib/url-builder.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/lib/url-builder.test.ts)
- `src/lib/read/` selection and navigation tests such as [`src/lib/read/issue-selection.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/lib/read/issue-selection.test.ts) and [`src/lib/read/navigation-read.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/lib/read/navigation-read.test.ts)
- `src/services/filter/` regression and normalization tests
- most `src/util/` pure helper tests
- non-DOM component-adjacent helpers such as [`src/components/details/issue-details/utils/issueMetaFormatters.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/details/issue-details/utils/issueMetaFormatters.test.ts) and [`src/components/issue-preview/utils/issuePreviewUtils.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/issue-preview/utils/issuePreviewUtils.test.ts)

Why this bucket matters:

- These tests already protect domain logic, routing helpers, and normalization behavior.
- They are the safest place to build the first reliable test baseline before broader UI coverage is introduced.

Migration guidance:

- keep them under Jest
- normalize imports toward one Jest style
- fix only ordinary failing assertions or environment mismatches, not the underlying test strategy

### 2. Migrate From Vitest To Jest

These tests are mostly unit/helper tests that currently use `vitest` APIs but do not appear to need full browser-driven coverage:

- [`src/components/filter/defaults.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/filter/defaults.test.ts)
- [`src/components/nav-bar/navOpenState.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/nav-bar/navOpenState.test.ts)
- [`src/components/restricted/editor/Editor.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/restricted/editor/Editor.test.ts)
- [`src/components/restricted/editor/issue-editor/defaultValues.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/restricted/editor/issue-editor/defaultValues.test.ts)
- [`src/components/restricted/editor/issue-editor/payload.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/restricted/editor/issue-editor/payload.test.ts)
- [`src/components/restricted/editor/issue-sections/helpers.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/restricted/editor/issue-sections/helpers.test.ts)
- [`src/util/sanitizeHtml.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/util/sanitizeHtml.test.ts)
- [`src/util/util.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/util/util.test.ts)

Common patterns:

- `describe` / `it` / `expect` imported from `vitest`
- `vi.fn()`, `vi.useFakeTimers()`, or `vi.stubGlobal()`
- little or no React rendering

Why this bucket matters:

- These tests are close to the target unit baseline already.
- They offer the best return on early migration effort because they reduce mixed-runner ambiguity without waiting for Storybook or Playwright setup.

Migration guidance:

- migrate API usage from `vitest` to Jest equivalents
- keep test intent and scope unchanged
- avoid turning them into component or integration tests while migrating

### 3. Candidate For Storybook/Jest Unit Coverage

These tests exercise component behavior at a UI level but still look like good candidates for story-driven component-unit coverage once Storybook exists:

- [`src/components/filter/FormActions.test.tsx`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/filter/FormActions.test.tsx)
- [`src/components/filter/FilterSwitch.test.tsx`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/filter/FilterSwitch.test.tsx)
- [`src/components/footer/FooterLinks.test.tsx`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/footer/FooterLinks.test.tsx)
- [`src/components/top-bar/TopBar.test.tsx`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/top-bar/TopBar.test.tsx)
- [`src/components/details/issue-details/contains/toChipList.test.tsx`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/details/issue-details/contains/toChipList.test.tsx)

Common patterns:

- React Testing Library rendering
- user interactions on isolated components
- callback assertions rather than broad app journeys

Why this bucket matters:

- These tests describe local component states and interactions well.
- Under the target model, their long-term home is likely:
  - Storybook stories for the states
  - Jest tests based on composed stories for interaction or logic assertions
  - Chromatic for visual regression on the same stories

Migration guidance:

- do not migrate these directly into ad hoc Jest DOM tests before Storybook conventions exist
- first decide which states should become stories
- then keep only the behavior assertions that still add value beyond visual coverage

### 4. Candidate For Playwright Coverage Instead Of Complex Component Tests

These tests currently simulate richer UI flows, integration wiring, or editor interactions that are likely more maintainable as user journeys:

- [`src/components/top-bar/SearchBar.test.tsx`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/top-bar/SearchBar.test.tsx)
- [`src/components/nav-bar/List.test.tsx`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/nav-bar/List.test.tsx)
- [`src/components/generic/PaginatedQuery.test.tsx`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/generic/PaginatedQuery.test.tsx)
- [`src/components/restricted/editor/IssueEditor.test.tsx`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/restricted/editor/IssueEditor.test.tsx)
- [`src/components/restricted/editor/PublisherEditor.test.tsx`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/restricted/editor/PublisherEditor.test.tsx)
- [`src/components/restricted/editor/SeriesEditor.test.tsx`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/restricted/editor/SeriesEditor.test.tsx)

Common patterns:

- Apollo testing helpers
- navigation and mutation mocking
- multi-step interaction flows
- tests that lean toward “does this workflow hold together?” rather than pure unit behavior

Why this bucket matters:

- These tests are the most brittle under the current mixed setup.
- They are often better expressed as real page- or workflow-level checks once Playwright is available.

Migration guidance:

- do not blindly port these one-to-one into Jest
- split out any pure helper logic into Jest-covered units
- convert only the truly local component-state parts into Storybook/Jest coverage
- move workflow confidence to Playwright when the app-level path is available

### 5. Remove Or Revisit Later

These are not necessarily bad tests, but they should be revisited after the new stack foundations exist:

- heavily mocked UI tests whose long-term value overlaps with future Storybook stories and Playwright journeys
- tests that currently exist mainly because there is no supported Storybook or Playwright layer yet
- any test that mixes runner migration, DOM setup, Apollo mocking, and navigation mocking in one file

Examples to revisit rather than migrate immediately:

- [`src/components/restricted/editor/IssueEditorHints.test.tsx`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/restricted/editor/issue-editor/IssueEditorHints.test.tsx)
- [`src/components/generic/AppContext.test.tsx`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/components/generic/AppContext.test.tsx)

Why this bucket matters:

- Some tests will become much simpler or obviously redundant once the target stack is established.
- It is better to defer those calls than to preserve complex test shapes that no longer fit the intended model.

## Recommended Migration Order

1. Stabilize the Jest unit baseline around `src/lib/`, `src/services/filter/`, `src/util/`, and non-DOM helper tests.
2. Convert the Vitest-only pure/helper tests that fit the same unit baseline.
3. Introduce Storybook conventions and identify which current component tests should become story-driven Jest + Chromatic coverage.
4. Introduce Playwright and move high-interaction workflow confidence there instead of preserving complex mocked component flows.
5. Revisit or remove tests whose value disappears once Storybook/Chromatic and Playwright cover the intended behavior more cleanly.

## Immediate Planning Implications

Before the first real feature, the highest-value test work is:

- keep the pure Jest-friendly baseline healthy
- stop adding new Vitest tests
- migrate low-risk Vitest helper tests first
- defer large UI test rewrites until Storybook and Playwright foundations exist

This keeps the repository safer without forcing a full testing-stack migration in one change.
