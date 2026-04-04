# Async Catalog Navigation Plan

## Paired Spec

- `specs/async-catalog-navigation-spec.md`

## File Changes

- update `src/lib/read/navigation-read.ts` to support configurable preload depth
- update `app/api/public-navigation-state/route.ts` to request minimal preload
- add or update Jest coverage for preload behavior in `src/lib/read/navigation-read.test.ts`

## Implementation Steps

1. Add optional preload flags to `readInitialNavigationData()`.
2. Keep publisher preload, but skip initial series/issue branch preload for the persistent shell API.
3. Verify that existing client-side nav state logic remains the source of truth for expanded branches.
4. Add regression tests for minimal preload mode.

## Test Plan

- `npm test -- --runInBand src/lib/read/navigation-read.test.ts src/lib/read/issue-read.test.ts src/lib/read/issue-details-read.test.ts src/lib/read/issue-selection.test.ts`

## Rollout Notes

- preserve current defaults so existing server-rendered callers outside the persistent shell keep current behavior
- only opt the persistent shell API into reduced preload mode first
