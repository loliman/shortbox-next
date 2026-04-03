# Incremental Architecture Cleanup Plan

## Purpose

This document records the current cleanup priorities after the main architecture baseline has largely settled.

Use it together with:
- [AGENTS.md](../../AGENTS.md)
- [docs/architecture/module-boundaries.md](module-boundaries.md)
- [docs/architecture/high-risk-hotspots.md](high-risk-hotspots.md)

This is not a rewrite plan. It is a guide for small, boundary-improving follow-up work.

## Current State

Compared with earlier architecture reviews, several cleanup items are already done:

- direct Prisma access is no longer present in `src/services/`
- `src/util/hierarchy.ts` is gone
- routing/page-state helpers now live under `src/lib/routes/`
- the repo has an active Jest baseline that currently passes

That means the remaining cleanup work is mostly about legacy hotspots, documentation drift, and large modules that are still hard to change safely.

## Recommended Near-Term Priorities

### 1. Keep `app/api/` handlers thin

Why it matters:
- route handlers are easy places for business logic and database orchestration to grow back over time
- the documented architecture depends on handlers staying validation-and-delegation focused

Likely files or modules involved:
- [`app/api/admin-task-actions/route.ts`](../../app/api/admin-task-actions/route.ts)
- [`app/api/auth/logout/route.ts`](../../app/api/auth/logout/route.ts)
- helpers in `src/lib/server/`

Expected improvement:
- entry points remain predictable for humans and agents
- orchestration stays below the route layer

Risk level:
- Medium

Recommended change style:
- extract one route concern at a time
- keep request and response shapes stable
- avoid bundling route cleanup with unrelated auth or worker changes

### 2. Reduce hotspot size in `src/lib/server/issues-write.ts`

Why it matters:
- this remains one of the largest and riskiest write paths in the repository
- it mixes normalization, writes, and side effects in a way that raises change cost

Likely files or modules involved:
- [`src/lib/server/issues-write.ts`](../../src/lib/server/issues-write.ts)
- [`src/util/filter-updater.ts`](../../src/util/filter-updater.ts)

Expected improvement:
- clearer separation between write orchestration and downstream updates
- smaller change surfaces for issue creation/editing work

Risk level:
- High

Add tests first:
- Yes

Recommended change style:
- extract one responsibility at a time
- preserve payload shapes and current write behavior
- favor parity/regression tests before moving logic

### 3. Gradually break up oversized active modules

Why it matters:
- some modules are active and correct enough, but still too large to work in comfortably
- these files increase review cost and make unrelated regressions more likely

Likely files or modules involved:
- [`src/components/nav-bar/List.tsx`](../../src/components/nav-bar/List.tsx)
- [`src/lib/server/marvel-crawler.ts`](../../src/lib/server/marvel-crawler.ts)
- [`src/core/cleanup.ts`](../../src/core/cleanup.ts)

Expected improvement:
- smaller responsibilities
- easier local reasoning and safer reviews

Risk level:
- Medium to High, depending on the file

Recommended change style:
- extract helpers without changing behavior
- move only one concern per change
- keep module public APIs stable where possible

## Defer Unless Explicitly Needed

### `src/core/`

Why defer:
- it is documented legacy code, but still in active use through worker tasks
- broad cleanup here is easy to over-scope

Recommended approach:
- only touch it when the feature or bugfix already requires it
- extract behavior downward into `src/services/` or `src/lib/` incrementally

### Broad page cleanup under `app/de/` and `app/us/`

Why defer:
- many pages are somewhat verbose, but still largely follow the intended read-and-render pattern
- readability wins here are usually lower priority than hotspot risk reduction

Recommended approach:
- clean these pages only when the touched route already needs work
- keep page edits thin and route-safe

## Legacy Seams To Treat Carefully

Avoid casual edits here unless the task explicitly requires them and includes regression coverage:

- [`src/util/filter-updater.ts`](../../src/util/filter-updater.ts)
- [`src/lib/server/issues-write.ts`](../../src/lib/server/issues-write.ts)
- older or mixed-responsibility handlers in `app/api/`
- [`src/core/`](../../src/core)

Use the high-risk hotspot guide before changing any of these areas.

## Recommended Execution Order

1. Prevent boundary regressions in new code and keep route handlers thin.
2. Extract small responsibilities from `src/lib/server/issues-write.ts`.
3. Break up oversized but active modules only when there is a concrete reason to touch them.
4. Leave broad legacy cleanup until a feature or bugfix already opens that part of the code.
