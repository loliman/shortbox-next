# Sidebar Selected Path Init Spec

## Goal

Make the client-side catalog sidebar initialize in a calmer order so deep links and large branches prioritize the currently selected path before restoring the rest of the expanded navigation state.

## Scope

- keep the catalog navigation client-side
- prioritize the selected publisher, series, and issue path during sidebar initialization
- delay restoration work for non-selected expanded branches until the selected path is stably rendered and revealed
- keep changes inside `src/components/nav-bar/` and adjacent presentation shells

## Non-Goals

- changing route semantics, slug behavior, or navigation APIs
- reintroducing `main` loading skeletons or route-level fallbacks
- redesigning the navigation UI
- moving navigation behavior into `src/services/` or `src/lib/`

## User-Visible Behavior

- deep links should expand and reveal the selected path first
- large publisher and issue branches should feel less busy during initial sidebar setup
- auto-scroll should wait until the relevant selected row is actually rendered
- previously expanded non-selected branches may fill back in shortly after the selected path settles

## Architectural Placement

- selected-path-first orchestration remains UI logic in `src/components/nav-bar/`
- branch windowing helpers remain pure presentation helpers under `src/components/nav-bar/`
- no Prisma, route, or business-logic changes are required

## Risks

- if the selected-path ready signal fires too early, deferred work can overlap with reveal again
- if it fires too late, previously expanded branches can appear sluggish to restore
- deep-link reveal can regress if prioritized rows are not rendered early enough

## Acceptance Criteria

- selected publisher, series, and issue rows are prioritized before non-selected expanded branches resume
- auto-scroll runs only after the relevant selected row exists in the DOM
- large branches avoid progressive fill-in while the selected path is still stabilizing
- `npm run build` succeeds
- `npm run test:a11y:pa11y` continues to pass
