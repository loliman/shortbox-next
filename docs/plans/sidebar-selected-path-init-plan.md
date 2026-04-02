# Sidebar Selected Path Init Plan

## Paired Spec

- `docs/specs/sidebar-initial-viewport-spec.md`

## File Changes

- update `app/api/public-navigation-state/route.ts`
- update `src/lib/read/navigation-read.ts`
- update `src/components/nav-bar/List.tsx`
- update `src/components/nav-bar/SeriesBranch.tsx`
- update `src/components/nav-bar/IssuesBranch.tsx`
- update `src/components/nav-bar/branchWindowing.ts`
- update `src/components/nav-bar/listTreeUtils.ts`
- update `src/components/nav-bar/useBranchWindowing.ts`
- add or update focused Jest coverage for new pure windowing behavior

## Implementation Steps

1. Ensure `public-navigation-state` returns the active selected publisher/series/issue data on the first response so the client does not have to discover the selected path after mount.
2. Keep the selected-path readiness gate in `List.tsx`, but never force an active selected route through an explicit `scrollTop = 0` reset.
3. Ensure large series and issue branches initialize from a selected-centered range (`windowStart` / `windowEnd`) with top and bottom spacers instead of a visible build-up row.
4. Open the selected publisher/series path on the first render instead of waiting for post-mount expansion effects.
5. Stop progressive branch expansion on the selected path during initial load when the selected-centered window is already sufficient for the first viewport.
6. Compute the initial nav viewport from selected-path indices and window ranges, and apply that viewport before paint instead of discovering it by reveal scroll.
7. Keep stored expansion restoration for unrelated branches behind selected-path readiness and compensate any added height above the selected anchor so it cannot shove the first viewport away after mount.
8. Keep post-paint reveal logic only for real misses or explicit user actions.
9. Prevent issue routes from falling back to a series-only initial viewport while selected issue data is still pending on client-side route returns.
10. Avoid animated `Collapse` height changes on the active selected path during initial viewport application so the first scroll target is computed against final branch geometry.
11. Rebase the persistent client sidebar on relevant catalog route changes so its state machine remounts from the new selected path instead of mutating the previous path in place.
12. Mount the nav tree only once the route-scoped navigation payload for the current route is ready, so client transitions use the same fresh initialization path as reloads.
13. Verify build and accessibility regression checks.

## Test Plan

- `npm run build`
- `npm run test:a11y:pa11y`
- focused Jest coverage for `src/components/nav-bar/branchWindowing.ts`

## Rollout Notes

- preserve stored expansion state and cached branch data
- prefer initial selected-centered rendering over post-render correction
- keep the nav CSR-only while `main` remains SSR-first
