# Strict Main SSR Spec

## Goal
Ensure that all user-visible content inside the catalog `main` element is fully server-rendered in the initial HTML response before the page becomes visible, while allowing header, footer, and navigation chrome to remain client-driven where appropriate.

## Scope
- audit the current rendering path for `app/de/*` and `app/us/*`
- identify all places where `main` content currently depends on client-only layout state, streaming fallbacks, or post-render data fetches
- refactor the catalog route shell so `main` content is emitted as complete server HTML on first response
- preserve existing route structure, canonical URLs, metadata, and domain behavior

## Non-Goals
- redesigning the header, footer, or navigation UI
- removing client interactivity from the navigation chrome
- broad performance rewrites unrelated to strict `main` SSR
- changing business rules, filtering semantics, or routing semantics

## User-Visible Behavior
- the page should not reveal loading placeholders inside `main` for initial route loads where data is already available server-side
- issue details, issue stories, listing feeds, and other catalog content inside `main` should be present in the initial HTML response
- header and navigation may still hydrate and become interactive client-side after the initial HTML is delivered

## Affected Routes/Pages
- `app/de/*`
- `app/us/*`
- shared catalog shells under `src/components/app-shell/`
- catalog detail and listing components that currently rely on `Suspense` fallbacks or client-side continuation

## Business Rules
- `de` and `us` remain domain scopes, not locales
- SEO-relevant canonical routing and structured data must remain stable
- issue and variant presentation rules remain unchanged
- navigation behavior may stay client-driven as long as `main` content does not depend on it for initial render completeness

## Architectural Placement
- route-level orchestration belongs in `app/`
- server data reads stay in `src/lib/read/`
- presentation remains in `src/components/`
- any rendering-mode coordination logic should be introduced in the smallest possible shell layer rather than scattered through feature components

## Risks
- moving catalog layouts away from client-rooted shells can affect responsive layout behavior and navigation state continuity
- removing or reducing streaming can increase TTFB if the server shell is not kept lean
- detail pages with nested async slots may regress if fallbacks are removed without preserving data availability

## Acceptance Criteria
- initial HTML for catalog routes contains the full intended `main` content for the route, not just placeholders or shells
- no route-critical content inside `main` depends on client-side fetches for first render
- header/footer/nav remain functional after hydration
- `npm run build` succeeds
- `npm run test:a11y:pa11y` continues to pass
- remaining client-only islands inside `main`, if any, are documented and justified
