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

All workflows currently use Node `25`.

## Blocking Workflow: Validate

`Validate` is the merge-gating workflow for pull requests and pushes to `main`.

It is intentionally split into four blocking jobs:

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
- `npx prisma db push`
- `node scripts/seed-ci-fixtures.mjs`
- `npm run build`
- `AUDIT_LIMIT=5 PA11Y_WAIT_MS=3000 npm run test:a11y:pa11y`

Why it blocks:

- accessibility regressions on the core route set are worth catching before merge
- `pa11y` is much less noisy than Lighthouse for PR blocking

Database model:

- this job runs against a disposable Postgres service in GitHub Actions
- the database is seeded from an exported fixture snapshot, not from live production access
- the current reference fixture is [`Marvel Horror Classic Collection 1`](../../scripts/fixtures/marvel-horror-classic-collection-1.json)
- that snapshot intentionally includes the full related issue/story/parent/appearance/individual graph needed for realistic route rendering

### `seo`

Purpose:

- protect canonical metadata and sitemap behavior

Runs:

- `npm ci`
- `npx prisma db push`
- `node scripts/seed-ci-fixtures.mjs`
- `npm run build`
- `npm run start`
- `npm run test:seo:smoke`
- `npm run test:seo:sitemap`

Why it blocks:

- this application depends heavily on correct canonical routing and indexability
- SEO breakage here is usually a real product regression, not a cosmetic warning

Database model:

- this job also runs against a disposable Postgres service in GitHub Actions
- it uses the same checked-in Marvel Horror snapshot as the `a11y` job
- this keeps sitemap and metadata checks closer to real route behavior than a no-data fallback build

### `e2e-smoke`

Purpose:

- protect real browser navigation and seeded route workflows

Runs:

- `npm ci`
- `npx prisma db push`
- `node scripts/seed-ci-fixtures.mjs`
- `npm run build`
- `npx playwright install --with-deps chromium`
- `npm run test:e2e:smoke`

Why it blocks:

- this is the browser owner for `de` and `us` route/workflow confidence
- these regressions are not represented well by mocked Jest tests

Database model:

- this job also runs against a disposable Postgres service in GitHub Actions
- it uses the same checked-in Marvel Horror snapshot as `a11y` and `seo`
- the initial smoke suite covers seeded canonical flows in both `de` and `us`

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

## SonarCloud And Coverage

SonarCloud is currently a separate workflow and should be treated as a quality visibility layer, not as the source of truth for what tests run.

For Jest component testing to matter in SonarCloud, coverage must be exported and consumed explicitly.

Target expectation:

- Jest produces LCOV coverage output
- the SonarCloud workflow generates that coverage before scanning
- [`sonar-project.properties`](../../sonar-project.properties) points SonarCloud at the generated LCOV file

Without that wiring, SonarCloud can scan sources and tests but still miss actual Jest coverage results.

This is especially important for the repository's component-testing strategy because the goal is not only to have good behavior-first tests, but also to make that coverage visible enough that Sonar signals stay useful.

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
npx prisma db push
node scripts/seed-ci-fixtures.mjs
npm run build
AUDIT_LIMIT=5 PA11Y_WAIT_MS=3000 npm run test:a11y:pa11y
```

### SEO

```bash
npm ci
npx prisma db push
node scripts/seed-ci-fixtures.mjs
npm run build
npm run start
npm run test:seo:smoke
SITEMAP_LIMIT=25 npm run test:seo:sitemap
```

### E2E Smoke

```bash
npx prisma db push
node scripts/seed-ci-fixtures.mjs
npm run build
npx playwright install chromium
npm run test:e2e:smoke
```

Notes:

- the SEO scripts default to `http://127.0.0.1:3000` or `http://localhost:3000`
- in CI, the workflow explicitly waits for the app before running the SEO smoke scripts
- the seeded ephemeral Postgres model used in GitHub Actions is the source of truth for `a11y`, `seo`, and `e2e-smoke`
- if these checks are reproduced locally, they should be reproduced against the same model:
  - start an ephemeral Postgres instance
  - run `npx prisma db push`
  - run `node scripts/seed-ci-fixtures.mjs`
  - then run the build/start/test commands
- these checks are not intended to depend on a long-lived local developer database

## CI Fixture Strategy

The repository currently uses a checked-in database snapshot for CI route realism:

- [`scripts/fixtures/marvel-horror-classic-collection-1.json`](../../scripts/fixtures/marvel-horror-classic-collection-1.json)

This snapshot is seeded by:

- [`scripts/seed-ci-fixtures.mjs`](../../scripts/seed-ci-fixtures.mjs)

The snapshot is intentionally based on a real reference issue:

- `Panini - Marvel & Icon`
- `Marvel Horror Classic Collection`
- issue `1`

Why this approach exists:

- `a11y` and `seo` are more trustworthy when they exercise real data shapes
- the Marvel Horror issue has a rich relationship graph
- a checked-in snapshot is deterministic in CI and does not require live migration database access

Important maintenance rule:

- the snapshot is manually curated and intentionally checked in
- CI does not regenerate it automatically
- if the reference fixture needs to change, update the JSON intentionally and keep the seed script aligned

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

This configuration now includes test files again.

Why:

- the repository no longer treats test exclusion as an acceptable steady state
- the Jest tree has been cleaned up enough to participate in blocking validation
- the blocking `typecheck` step now reflects the intended repository quality bar for both runtime code and tests

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
