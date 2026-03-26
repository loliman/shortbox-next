# Testing Baseline

This document records the repository's current test execution model as it exists today.

## Official Command

The current official automated test command is:

```bash
npm test
```

This runs Jest via [`package.json`](/Users/christian.riese/Documents/shortbox/shortbox-next/package.json).

Current Jest baseline:

- runner: Jest
- TypeScript transform: `ts-jest`
- environment: `node`
- discovery scope: `src/**/*.test.ts` and `src/**/*.test.tsx`

The configuration lives in [`jest.config.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/jest.config.ts).

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

There are also tests that appear to expect browser-style or UI test support, for example imports from:

- `@testing-library/react`
- `@testing-library/user-event`
- `@apollo/client/testing`

Those tests are not part of the safe default baseline today because the current Jest config is `node`-based and the repository does not currently provide a complete browser-oriented Jest setup.

Observed repository state on March 26, 2026:

- `npm test -- --listTests` discovers all matching test files under `src/`
- `npm test -- --runInBand` currently reports many passing pure tests
- that same command also fails on mixed-runner and UI-oriented tests that Jest cannot execute under the current baseline
- the same run also exposed an ordinary assertion failure in [`src/util/issues.test.ts`](/Users/christian.riese/Documents/shortbox/shortbox-next/src/util/issues.test.ts)

Today, "discovered by Jest" does not mean "supported by the default test setup".

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
- avoid assuming `jsdom` or browser globals
- avoid adding new React Testing Library coverage unless the task explicitly includes adding the missing support for that style

If you need coverage for UI-heavy behavior right now, prefer one of these incremental options instead of guessing:

- extract and test a pure helper behind the component
- add a pure regression or parity test around the business logic that drives the UI
- document the gap if the behavior genuinely requires a browser-oriented setup that does not exist yet

## Current Categories In Practice

The repository currently has these test categories:

- pure unit tests: widely supported by the default Jest setup
- regression and parity tests: supported when they stay node-friendly
- React/component tests with browser-style helpers: present in the repo, but not reliably runnable via the default setup today
- mixed-runner tests: present in the repo, but not part of the safe baseline while Jest remains the official command

## What This Document Does Not Claim

This document does not define a migration plan.

For the intended future testing direction, see
[ADR 004: Testing Target Model](/Users/christian.riese/Documents/shortbox/shortbox-next/docs/adr/004-testing-target-model.md).

It only records the current baseline so agents can make safe choices now:

- `npm test` is authoritative today
- Jest is the current runner
- node-friendly Jest tests are the safe default
- Vitest-style and browser-oriented tests remain unresolved and should be handled deliberately later, not implicitly during feature work
