# Incremental Architecture Cleanup Plan

## Purpose

This plan translates the current architecture gap review into a small, practical cleanup sequence before the first
real feature.

Use it together with:
- [AGENTS.md](/Users/christian.riese/Documents/shortbox/shortbox-next/AGENTS.md)
- [docs/architecture/module-boundaries.md](/Users/christian.riese/Documents/shortbox/shortbox-next/docs/architecture/module-boundaries.md)
- [docs/architecture/high-risk-hotspots.md](/Users/christian.riese/Documents/shortbox/shortbox-next/docs/architecture/high-risk-hotspots.md)

This is not a rewrite plan. It is a priority guide for small, boundary-improving changes.

## Before The First Real Feature

### 1. Remove direct Prisma access from `src/services/`

Why it matters:
- This is the clearest current violation of the documented layer rules.
- It makes the service layer harder to reason about and weakens the separation between business logic and technical data
  access.

Likely files or modules involved:
- [src/services/UserService.ts](/Users/christian.riese/Documents/shortbox/shortbox-next/src/services/UserService.ts)
- [src/services/StoryService.ts](/Users/christian.riese/Documents/shortbox/shortbox-next/src/services/StoryService.ts)
- [src/services/FilterService.ts](/Users/christian.riese/Documents/shortbox/shortbox-next/src/services/FilterService.ts)
- new or extracted helpers in `src/lib/read/` and `src/lib/server/`

Expected boundary improvement:
- Prisma access returns to `src/lib/`
- `src/services/` becomes easier to treat as business logic and coordination only

Risk level:
- Medium

Add tests first:
- Yes for `FilterService`, because filter behavior is already covered by regression and parity tests
- Recommended for `StoryService` and `UserService` if extraction changes data-shaping behavior

Recommended change style:
- Extract the Prisma read or write operation first
- Preserve service APIs where possible
- Keep each service cleanup separate

### 2. Restore thin API route handlers where database work still happens directly

Why it matters:
- The documented entry-layer rule is that route handlers validate, delegate, and return a response.
- Direct DB work in route handlers makes agent behavior inconsistent and encourages copy-paste exceptions.

Likely files or modules involved:
- [app/api/admin-task-actions/route.ts](/Users/christian.riese/Documents/shortbox/shortbox-next/app/api/admin-task-actions/route.ts)
- [app/api/auth/logout/route.ts](/Users/christian.riese/Documents/shortbox/shortbox-next/app/api/auth/logout/route.ts)
- supporting helpers in `src/lib/server/`

Expected boundary improvement:
- `app/api/` returns to thin-controller behavior
- technical DB access and orchestration move downward into `src/lib/`

Risk level:
- Medium

Add tests first:
- Yes, or at least add narrow regression coverage around the affected controller behavior before moving logic

Recommended change style:
- Extract one route at a time
- Keep request and response shapes stable
- Do not combine route cleanup with unrelated auth or worker refactors

### 3. Start moving routing and page-state authority out of `src/util/hierarchy.ts`

Why it matters:
- `src/util/` is not supposed to depend on `src/lib/`, but this file does
- URL generation and page-state parsing are already documented as `src/lib/routes/*` and URL-builder responsibilities
- This file is still actively used, so its overlap is not dormant legacy

Likely files or modules involved:
- [src/util/hierarchy.ts](/Users/christian.riese/Documents/shortbox/shortbox-next/src/util/hierarchy.ts)
- [src/lib/routes/page-state.ts](/Users/christian.riese/Documents/shortbox/shortbox-next/src/lib/routes/page-state.ts)
- [src/lib/url-builder.ts](/Users/christian.riese/Documents/shortbox/shortbox-next/src/lib/url-builder.ts)
- route entry points that still depend on hierarchy helpers

Expected boundary improvement:
- Routing and page-state behavior gains a single canonical home
- `src/util/` moves back toward small pure helpers instead of route authority

Risk level:
- High

Add tests first:
- Yes
- Add or preserve regression coverage for existing route parsing and URL generation behavior before extraction

Recommended change style:
- Do not rewrite `src/util/hierarchy.ts` in one pass
- First stop new code from depending on it
- Then extract one responsibility at a time, starting with helpers already documented as `src/lib` concerns

## Defer Until After The First Real Feature

### 4. Deeper cleanup inside `src/lib/server/issues-write.ts`

Why defer:
- It is a real hotspot, but it mixes write orchestration with side effects and legacy behavior
- It is not the safest first cleanup move before the repository has a cleaner baseline elsewhere

Likely files or modules involved:
- [src/lib/server/issues-write.ts](/Users/christian.riese/Documents/shortbox/shortbox-next/src/lib/server/issues-write.ts)
- [src/util/filter-updater.ts](/Users/christian.riese/Documents/shortbox/shortbox-next/src/util/filter-updater.ts)

Boundary improvement:
- Clearer separation between technical write orchestration and downstream business updates

Risk level:
- High

Add tests first:
- Yes, definitely

### 5. Broader cleanup of verbose but mostly-thin pages

Why defer:
- Many pages are somewhat verbose, but still follow the intended read-and-render pattern well enough
- They are not the biggest current boundary risk

Likely files or modules involved:
- detail pages under `app/de/` and `app/us/`

Boundary improvement:
- Mostly readability and consistency, not major architecture correction

Risk level:
- Low to medium

Add tests first:
- Only when the touched page also changes route parsing, metadata, or canonical behavior

### 6. General legacy cleanup in `src/core/`

Why defer:
- `src/core/` is already documented as legacy
- It should be improved only when work in that area is explicitly needed

Likely files or modules involved:
- `src/core/*`

Boundary improvement:
- Long-term architecture health, but not the best pre-feature investment

Risk level:
- High

Add tests first:
- Yes, when touching any behavior that is still used

## Legacy Seams To Avoid Unless Explicitly Targeted

Avoid casual edits here unless the task is specifically about them and includes regression coverage:

- [src/util/filter-updater.ts](/Users/christian.riese/Documents/shortbox/shortbox-next/src/util/filter-updater.ts)
- [src/lib/server/issues-write.ts](/Users/christian.riese/Documents/shortbox/shortbox-next/src/lib/server/issues-write.ts)
- [src/util/hierarchy.ts](/Users/christian.riese/Documents/shortbox/shortbox-next/src/util/hierarchy.ts)
- older or mixed-responsibility handlers in `app/api/`
- `src/core/`

Use the high-risk hotspot guide before changing any of these areas.

## Recommended Execution Order

1. Extract Prisma usage out of one service at a time, starting with the smallest and clearest case.
2. Move direct DB work out of `app/api/auth/logout/route.ts`, then `app/api/admin-task-actions/route.ts`.
3. Add a no-new-usage rule for `src/util/hierarchy.ts` and begin extracting one routing responsibility at a time into
   `src/lib/routes/*` or `src/lib/url-builder.ts`.
4. Leave deeper write-path and broad legacy cleanup until after the first real feature unless that feature directly
   depends on those seams.
