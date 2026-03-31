# Build Audit Tooling Spec

## Goal
Add build-time accessibility and Lighthouse-style audits that run against the built Next.js app.

## Scope
- add `pa11y`-based accessibility auditing
- add `unlighthouse`-based Lighthouse auditing
- provide a fixed route sample for repeatable checks
- make the audits runnable from `package.json`

## Non-Goals
- full SEO validation coverage
- crawl-scale auditing of every route
- production monitoring

## User-Visible Behavior
- developers can run repeatable accessibility audits locally
- developers can run repeatable Lighthouse-style audits locally
- audits run against `next start`, not `next dev`

## Affected Areas
- `package.json`
- `scripts/`
- `docs/specs/`
- `docs/plans/`

## Architectural Placement
- orchestration scripts belong in `scripts/`
- no Prisma or route business logic changes
- no page-level SEO behavior changes

## Risks
- audit tools may be slow on large route samples
- accessibility tooling can be noisy if thresholds are too strict
- audit dependencies add install weight

## Acceptance Criteria
- `pa11y` is installed and wired to a runnable script
- `unlighthouse` is installed and wired to a runnable script
- both audits run against a production server started from the built app
- a stable route sample is committed in the repo
