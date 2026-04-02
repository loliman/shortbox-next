# Nav Performance Debug Plan

## Paired Spec

- `docs/specs/nav-performance-debug-spec.md`

## File Changes

- add a debug helper under `src/components/nav-bar/`
- update `src/components/app-shell/PersistentCatalogChromeClient.tsx`
- update `src/components/nav-bar/List.tsx`
- update `src/components/nav-bar/SeriesBranch.tsx`
- update `src/components/nav-bar/IssuesBranch.tsx`

## Implementation Steps

1. Add an opt-in nav debug helper that records marks, measures, and debug events.
2. Instrument the persistent catalog chrome around nav-state fetch and chrome readiness.
3. Instrument selected-path-first initialization in the nav list.
4. Instrument series and issue reveal timing so deep-link behavior can be correlated with the selected-path lifecycle.
5. Capture browser long tasks in debug mode when available.
6. Verify build and accessibility regression checks.

## Test Plan

- `npm run build`
- `npm run test:a11y:pa11y`

## Rollout Notes

- keep instrumentation opt-in and lightweight
- prefer structured timing marks over ad-hoc `console.log`
- use the instrumentation to drive follow-up fixes rather than adding artificial delays
