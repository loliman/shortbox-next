# Testing Baseline

This document records the repository's current test execution model as it exists today.

For the GitHub Actions job layout, blocking rules, and dependency automation policy, see
[CI and dependency automation](./ci-and-dependency-automation.md).

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

The repository currently contains mixed test styles.

Most important mismatch:

- `npm test` uses Jest
- multiple existing tests import `vitest` or use `vi`
- Jest still discovers those files because they match `*.test.ts` or `*.test.tsx`

There are also tests that use browser-style or UI test support, for example imports from:

- `@testing-library/react`
- `@testing-library/user-event`
- `@apollo/client/testing`

Those tests are part of the repository's current Jest suite when they either stay node-friendly or opt into `jsdom` explicitly.

Observed repository state on April 3, 2026:

- `npm test -- --runInBand` passes for the current repository test suite
- the suite includes pure logic tests and selected `jsdom`-based component tests
- Jest remains the official runner and source of truth for automated local validation

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
- do not import from `vitest`
- do not use `vi`
- add `jsdom` only when the test truly needs browser APIs
- keep new UI-heavy tests deliberate and scoped so the default Jest run stays reliable

If you need coverage for UI-heavy behavior right now, prefer one of these incremental options instead of guessing:

- extract and test a pure helper behind the component
- add a pure regression or parity test around the business logic that drives the UI
- document the gap if the behavior genuinely requires a browser-oriented setup that does not exist yet

## Current Categories In Practice

The repository currently has these test categories:

- pure unit tests: widely supported by the default Jest setup
- regression and parity tests: supported when they stay node-friendly
- React/component tests with browser-style helpers: supported when configured for Jest and `jsdom`
- mixed-runner tests: avoid reintroducing them while Jest remains the official command

## What This Document Does Not Claim

This document does not define a migration plan.

For the intended future testing direction, see
[ADR 004: Testing Target Model](../adr/004-testing-target-model.md).

It only records the current baseline so agents can make safe choices now:

- `npm test` is authoritative today
- Jest is the current runner
- node-friendly Jest tests are the safe default
- Vitest-style and browser-oriented tests remain unresolved and should be handled deliberately later, not implicitly during feature work
