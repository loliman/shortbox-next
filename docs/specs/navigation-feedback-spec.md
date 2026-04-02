# Navigation Feedback Spec

## Goal
Provide immediate, subtle feedback for catalog navigation so route changes no longer feel stuck after removing visible `main` loading placeholders.

## Scope
- add a small global navigation feedback signal for client-driven route changes
- reuse existing navigation helpers where possible
- keep catalog `main` strictly SSR without reintroducing route-level skeletons or overlays
- cover the most common catalog navigation triggers such as header actions, nav tree navigation, filter navigation, and locale switching
- keep deferred catalog chrome visually calm so header and navigation do not look like blocking placeholders on reload

## Non-Goals
- reintroducing `loading.tsx` skeletons inside `main`
- adding a fullscreen loader or blocking overlay
- redesigning the catalog header or navigation

## User-Visible Behavior
- a route change should acknowledge user interaction immediately
- the feedback should be subtle and non-blocking
- the feedback should disappear automatically once navigation commits
- deferred navigation chrome should feel secondary rather than unfinished
- the quick search should keep the same closed visual appearance before and after hydration
- initial deferred navigation chrome should prefer a calm spinner/status treatment over skeleton rows
- the desktop quick search should avoid visible placeholder-to-input swaps during hydration
- the desktop filter trigger should avoid visible placeholder-to-button swaps during hydration
- while initial navigation chrome is still loading, `main` should visibly communicate that it is not yet interactive
- the slim progress indicator under the header should be visible both for client route transitions and for the initial deferred navigation load

## Architectural Placement
- global navigation feedback state belongs in shared UI context under `src/components/generic/`
- route transitions continue to use `usePendingNavigation()` rather than custom router calls spread through the tree
- visual feedback stays in presentation components such as the top bar

## Risks
- if the pending signal is too eager or too long-lived it can feel noisy
- route changes triggered outside the shared navigation helper may not show feedback until explicitly wired in

## Acceptance Criteria
- catalog navigation shows immediate non-blocking progress feedback
- `main` stays SSR-first with no new placeholders or skeletons
- existing navigation flows remain functional
- `npm run build` succeeds
- `npm run test:a11y:pa11y` continues to pass
