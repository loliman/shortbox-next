# CI And Dependency Automation

This document describes the repository's current GitHub automation model:

- which jobs block merges
- which jobs are observational only
- which local commands map to CI
- how Dependabot is configured and why

It is the source of truth for CI and dependency update expectations.

For the broader repository testing end-state, including the planned browser and visual layers that are not fully in place yet, see
[Testing target picture](./testing-target-picture.md).

## Current CI Structure

The repository currently uses two main GitHub Actions workflows for validation behavior:

- [`Validate`](../../.github/workflows/validate.yml)
- [`Observability`](../../.github/workflows/observability.yml)

There is also a separate SonarCloud workflow:

- [`SonarCloud`](../../.github/workflows/sonarcloud.yml)

All workflows currently use Node `24`.

## Blocking Workflow: Validate

`Validate` is the merge-gating workflow for pull requests and pushes to `main`.

It is intentionally split into three jobs:

### `quality`

Purpose:

- fast, deterministic quality gates

Runs:

- `npm ci`
- `npm run lint`
- `npm run prisma:validate`
- `npm run typecheck`
- `npm run test:unit`

Why it blocks:

- these checks are the cheapest and most deterministic signals
- failures here almost always indicate a real repository problem

### `a11y`

Purpose:

- enforce a small accessibility guardrail on stable, canonical routes

Runs:

- `npm ci`
- `npm run build`
- `AUDIT_LIMIT=5 PA11Y_WAIT_MS=3000 npm run test:a11y:pa11y`

Why it blocks:

- accessibility regressions on the core route set are worth catching before merge
- `pa11y` is much less noisy than Lighthouse for PR blocking

### `seo`

Purpose:

- protect canonical metadata and sitemap behavior

Runs:

- `npm ci`
- `npm run build`
- `npm run start`
- `npm run test:seo:smoke`
- `npm run test:seo:sitemap`

Why it blocks:

- this application depends heavily on correct canonical routing and indexability
- SEO breakage here is usually a real product regression, not a cosmetic warning

## Non-Blocking Workflow: Observability

`Observability` runs on:

- pushes to `main`
- a weekly schedule
- manual dispatch

It currently runs Unlighthouse for:

- desktop
- mobile

This workflow is intentionally `continue-on-error`.

### Why Lighthouse Is Not Merge-Blocking

Lighthouse and Unlighthouse are useful trend tools, but they are not ideal hard PR gates for this repository because they are more sensitive to:

- CI runner variance
- timing variance
- server startup timing
- environmental noise
- third-party and platform-level fluctuations

For this repository, Lighthouse is used as an observational signal, not as a strict correctness gate.

That means:

- treat Lighthouse score changes as investigation triggers
- do not treat them as automatic merge blockers

## Local Command Mapping

These are the local commands that correspond to the blocking CI jobs.

### Quality

```bash
npm ci
npm run lint
npm run prisma:validate
npm run typecheck
npm run test:unit
```

### Accessibility

```bash
npm ci
npm run build
AUDIT_LIMIT=5 PA11Y_WAIT_MS=3000 npm run test:a11y:pa11y
```

### SEO

```bash
npm ci
npm run build
npm run start
npm run test:seo:smoke
SITEMAP_LIMIT=25 npm run test:seo:sitemap
```

Notes:

- the SEO scripts default to `http://127.0.0.1:3000` or `http://localhost:3000`
- in CI, the workflow explicitly waits for the app before running the SEO smoke scripts

## Build Cache Strategy

The workflows restore `.next/cache` using GitHub Actions cache.

This does not make builds fully free, but it helps avoid the repeated "no build cache found" cold-start path on every CI run.

The cache keys intentionally include:

- `package-lock.json`
- `tsconfig*.json`
- `next.config.*`
- application and script source files

This keeps the cache relevant to actual build inputs instead of reusing stale output too aggressively.

## Typecheck Scope

The repository now uses a dedicated TypeScript config for CI type checking:

- [`tsconfig.typecheck.json`](../../tsconfig.typecheck.json)

This configuration excludes `*.test.ts` and `*.test.tsx` from the main application typecheck.

Why:

- the test suite is already validated through Jest
- mixing legacy and modern test styles inside the main app typecheck produced CI noise
- the blocking `typecheck` step should focus on application/runtime code, not test-runner mismatches

This is a pragmatic repository boundary, not a claim that test types never matter.

## Dependabot Policy

Dependabot configuration lives in:

- [`.github/dependabot.yml`](../../.github/dependabot.yml)

It currently updates:

- npm dependencies weekly
- GitHub Actions weekly
- Docker weekly

### Grouping Strategy

npm updates are grouped to reduce PR noise:

- `next-react`
- `mui`
- `prisma`
- `testing-and-types`
- `tooling`

This is intentional. For this repository, a smaller number of coherent upgrade PRs is easier to review than many tiny single-package PRs.

### Major Update Policy

Some major updates are intentionally ignored by Dependabot:

- `typescript`
- `next`
- `react`
- `react-dom`
- `eslint`

Why:

- these packages often have wider ecosystem compatibility implications
- they are better handled as deliberate upgrade work instead of background automation

Routine minor and patch updates are still allowed.

## What To Improve Later

This setup is intentionally practical, not final.

Likely future improvements:

- add a small browser-based E2E smoke layer for navigation, routing, and search
- reduce repeated install/build cost further if CI time becomes a problem
- document a stronger release-specific dependency upgrade process for large framework jumps
- expand visual regression coverage if the UI becomes more animation- or layout-sensitive

## Summary

Current policy in one sentence:

- correctness and accessibility regressions should block PRs
- performance trends should be visible, but not noisy merge blockers
- dependency automation should reduce manual drift without creating uncontrolled upgrade churn
