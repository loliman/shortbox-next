# Navigation Feedback Plan

Spec: [`specs/navigation-feedback-spec.md`](/Users/christian/shortbox/shortbox-next/specs/navigation-feedback-spec.md)

## Files
- add shared navigation feedback state in `src/components/generic/`
- update `src/components/generic/usePendingNavigation.ts`
- surface the visual signal in `src/components/top-bar/TopBar.tsx`
- tune deferred chrome fallbacks in `src/components/LayoutChromeClient.tsx`

## Steps
1. Add a shared navigation feedback context with a small pending lifecycle that clears on committed route changes.
2. Wire `usePendingNavigation()` into that shared feedback state so existing navigation callers participate automatically.
3. Show a subtle global pending indicator in the top bar and hook the logo click into the shared navigation flow.
4. Make deferred navigation and header fallbacks visually quiet so they do not read like blocking skeleton states, preferring spinner/status feedback over nav skeleton rows.
5. Keep the quick search on a stable render path so hydration does not visibly swap the closed control.
6. Keep the filter trigger on a stable render path so hydration does not visibly swap the closed control.
7. Surface the initial navigation-chrome loading state in `main` so blocked content reads as intentionally busy instead of mysteriously inert.
8. Keep the top progress indicator visible for both navigation transitions and initial chrome loading.
9. Verify build and accessibility regression checks.

## Verification
- `npm run build`
- `npm run test:a11y:pa11y`

## Risk Mitigation
- keep the indicator decorative and non-blocking
- avoid changing route semantics or navigation targets
- preserve modified-click/new-tab behavior for link-like controls
