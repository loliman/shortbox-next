# Nav Autoscroll Performance Spec

## Goal

Keep the catalog navigation auto-reveal behavior for deep links and selected entries while reducing the mount-time main-thread work that makes route transitions feel stuck.

## Scope

- preserve automatic reveal of the selected publisher, series, or issue in the navigation
- reduce repeated visibility checks and repeated `scrollIntoView()` calls during navigation mount
- keep the navigation client-side and stateful
- limit changes to navigation presentation logic under `src/components/nav-bar/`

## Non-Goals

- removing selected-item auto-scroll behavior
- redesigning the navigation tree UI
- changing route semantics, slug behavior, or navigation API responses

## User-Visible Behavior

- deep links should still reveal the selected navigation path
- navigation should feel less like it blocks the app during route changes
- explicit “jump to selection” behavior should remain available
- selected-row reveal should move smoothly instead of snapping abruptly when the target is resolved

## Architectural Placement

- this is UI behavior and belongs in `src/components/nav-bar/`
- no business logic should move into the nav components
- no API, route, or Prisma changes are needed

## Risks

- if reveal attempts are reduced too aggressively, some deep links may stop centering the selected row
- delayed reveal logic can introduce small visual lag if retries are too conservative

## Acceptance Criteria

- selected publisher, series, and issue rows still reveal reliably for deep links
- repeated mount-time reveal loops are reduced
- `npm run build` succeeds
- `npm run test:a11y:pa11y` continues to pass
