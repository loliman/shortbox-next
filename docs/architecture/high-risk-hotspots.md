# High-Risk Hotspots

This document lists areas that deserve extra caution during incremental AI-assisted changes.

Use it together with [AGENTS.md](../../AGENTS.md) and the workflow docs when a change touches legacy, normalization, or write-path code.

## Hotspots

| Area | Why it is risky | Prefer this change style | Before merging, check |
|---|---|---|---|
| `src/core/` | Legacy code with older assumptions and mixed responsibilities | Extract and delegate, then migrate only the touched responsibility | Keep the change narrow and add regression coverage for the affected path |
| `src/util/filter-updater.ts` | Legacy filter maintenance logic that can affect story flags and catalog behavior | Preserve behavior, add parity tests first, and avoid broad rewrites | Verify the resulting filter flags against existing regression tests |
| `src/lib/server/issues-write.ts` | Central write path with Prisma mutations, normalization, and side effects | Make the smallest possible write-path change and reuse existing helpers | Run regression tests around issue creation/editing and confirm no unrelated fields changed |
| `app/api/` route handlers | Thin controllers that are easy to accidentally turn into business logic | Keep handlers validation-only and push domain logic downward | Ensure the route still delegates and does not grow Prisma or workflow logic |
| Legacy filter parsing paths | Normalization changes can silently alter catalog results and URLs | Prefer extraction, small normalization steps, and explicit tests for old inputs | Add or update parity/regression tests for old query shapes and route params |

## General Rules

- Prefer extraction over rewriting when touching a hotspot.
- Add or update regression tests before changing behavior that affects writes, normalization, or route parsing.
- Keep the diff focused on one responsibility at a time.
- If a hotspot change also affects SEO, canonical URLs, or filters, verify the relevant helper or route tests as part of the same change.

## When To Pause

Stop and document the change first if the edit would:

- mix business logic into a route handler
- move data access outside `src/lib/`
- change legacy normalization without a test
- touch more than one hotspot family in a single small task
