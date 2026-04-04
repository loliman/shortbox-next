# Nav Virtualization Plan

## Paired Spec

- `specs/nav-virtualization-spec.md`

## File Changes

- add pure nav windowing helpers under `src/components/nav-bar/`
- update `src/components/nav-bar/SeriesBranch.tsx`
- update `src/components/nav-bar/IssuesBranch.tsx`
- add or update focused tests for helper logic

## Implementation Steps

1. Add small pure helpers for adaptive thresholds and progressive branch windowing.
2. Window oversized series and issue branch lists while leaving small lists on the current path.
3. Prioritize selected rows so deep links still reveal reliably.
4. Use browser-native occlusion styles for large rendered row sets to reduce offscreen cost.
5. Disable occlusion around prioritized deep-link paths so selected-row reveal does not show a visually half-empty branch.
6. Verify build and accessibility checks.

## Test Plan

- `npm run build`
- `npm run test:a11y:pa11y`
- focused Jest coverage for any new pure helper

## Rollout Notes

- prefer adaptive thresholds so normal branches do not pay extra complexity
- keep existing navigation storage and query behavior stable
