# Testing Baseline

This document records the repository's current test execution model as it exists today.

For the GitHub Actions job layout, blocking rules, and dependency automation policy, see
[CI and dependency automation](./ci-and-dependency-automation.md).
For the intended end-state across unit, browser, visual, accessibility, and SEO checks, see
[Testing target picture](./testing-target-picture.md).

## Official Command

The current official automated test command is:

```bash
npm test
```

This runs Jest via [`package.json`](../../package.json).

Current Jest baseline:

- runner: Jest
- TypeScript transform: `ts-jest`
- environment: `node`
- discovery scope: `src/**/*.test.ts` and `src/**/*.test.tsx`

The configuration lives in [`jest.config.ts`](../../jest.config.ts).

## What Runs Reliably Today

The safest tests to add and run under the default setup are Jest-compatible, node-friendly tests such as:

- pure unit tests in `src/services/`
- pure unit tests in `src/lib/`
- pure unit tests in `src/util/`
- regression and parity tests for normalization, slug, URL, selection, and helper logic
- component-adjacent helper tests that do not require DOM APIs, browser state, or React Testing Library

Examples of the current baseline in practice include:

- filter normalization and conflict tests in `src/services/filter/`
- slug and URL tests in `src/lib/`
- pure helper tests in `src/util/`

## Current Mismatches And Limits

The repository no longer treats mixed-runner tests as an active baseline.

Current reality:

- `npm test` uses Jest
- browser and route-level confidence is owned by Playwright via `npm run test:e2e:smoke`
- low-signal, heavily mocked UI workflow tests have been removed instead of being carried as ignored debt

There are still Jest tests that use browser-style helpers such as:

- `@testing-library/react`
- `@testing-library/user-event`

Those tests are only kept when they remain small, focused, and stable enough to still fit a unit-test model.

Observed repository state on April 4, 2026:

- `npm test -- --runInBand` passes for the current repository test suite
- the suite includes pure logic tests and selected `jsdom`-based component tests
- Jest remains the official runner and source of truth for automated local validation

- route-level `a11y` and `seo` CI checks now run against a disposable Postgres database
- that database is seeded from a checked-in fixture snapshot instead of ad hoc synthetic rows
- the current reference fixture is [`Marvel Horror Classic Collection 1`](../../scripts/fixtures/marvel-horror-classic-collection-1.json)
- the seed entry point is [`scripts/seed-ci-fixtures.mjs`](../../scripts/seed-ci-fixtures.mjs)
- Playwright smoke coverage exists for seeded `de` and `us` browser flows
- the dedicated blocking typecheck includes test files again

Today, the main constraint is not test discovery but keeping new tests aligned with the current Jest-based setup.

## How Agents Should Add Tests Right Now

When adding new tests, prefer the smallest Jest-compatible option.

Use the current default baseline when the code under test is:

- pure business logic
- pure parsing or normalization logic
- slug, URL, and metadata-safe helper logic
- regression or parity behavior that can run without a browser environment

For new tests under the current baseline:

- use Jest as the runner
- add `jsdom` only when the test truly needs browser APIs
- keep new UI-heavy tests deliberate and scoped so the default Jest run stays reliable
- move route and workflow confidence to Playwright instead of recreating it with mocks in Jest

If you need coverage for behavior that crosses route, navigation, search, or responsive-shell boundaries:

- extract and test a pure helper behind the component
- add a pure regression or parity test around the business logic that drives the UI
- add or extend Playwright smoke coverage if the real risk is browser behavior

## Current Categories In Practice

The repository currently has these test categories:

- pure unit tests: widely supported by the default Jest setup
- regression and parity tests: supported when they stay node-friendly
- React/component tests with browser-style helpers: supported when configured for Jest and `jsdom`
- DB-backed route smoke checks in CI: currently used by `a11y` and `seo`
- Playwright browser smokes: used for real `de` and `us` route/workflow confidence

## What This Document Does Not Claim

This document does not define a migration plan.

For the intended future testing direction, see
[ADR 004: Testing Target Model](../adr/004-testing-target-model.md) and
[Testing target picture](./testing-target-picture.md).

It only records the current baseline so agents can make safe choices now:

- `npm test` is authoritative today
- Jest is the current runner
- node-friendly Jest tests are the safe default
- browser-oriented route and workflow tests should be handled in Playwright, not recreated in Jest
