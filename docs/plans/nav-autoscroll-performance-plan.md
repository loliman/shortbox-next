# Nav Autoscroll Performance Plan

## Paired Spec

- `docs/specs/nav-autoscroll-performance-spec.md`

## File Changes

- update `src/components/nav-bar/List.tsx`
- update `src/components/nav-bar/SeriesBranch.tsx`
- update `src/components/nav-bar/IssuesBranch.tsx`

## Implementation Steps

1. Limit publisher- and series-level auto-reveal effects so they only run once per relevant selected target instead of rerunning on every expansion change.
2. Replace the issue-branch `ResizeObserver` auto-scroll loop with a small number of post-paint retries.
3. Keep explicit “scroll to selected” behavior intact while avoiding duplicate forced reveal work.
4. Route all reveal scrolls through one shared helper so publisher, series, and issue branches animate consistently while respecting reduced-motion preferences.

## Test Plan

- `npm run build`
- `npm run test:a11y:pa11y`

## Rollout Notes

- preserve current nav state storage and branch caching behavior
- prefer reducing repeated DOM measurement over changing navigation data flow
