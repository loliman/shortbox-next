# Async Catalog Navigation Spec

## Goal

Make catalog navigation load asynchronously without blocking catalog page transitions, especially on issue detail routes.

## Scope

- reduce server-side initial navigation preload for the persistent `/de` and `/us` catalog shell
- preserve current issue, series, and publisher detail SSR behavior
- preserve client-side expanded navigation state and cached navigation nodes across route changes

## Non-Goals

- changing issue detail metadata, canonical URLs, or structured data
- changing route semantics or slug parsing
- redesigning the navigation UI

## User-Visible Behavior

- navigating between issue pages should feel faster
- the navigation drawer should not collapse and rebuild on every route change
- previously expanded publisher and series nodes should remain expanded after navigation
- navigation data may load in the background when needed

## Affected Routes

- `app/de/layout.tsx`
- `app/us/layout.tsx`
- `app/api/public-navigation-state/route.ts`

## Architectural Placement

- route handlers remain thin in `app/`
- navigation preload behavior belongs in `src/lib/read/navigation-read.ts`
- persistent navigation behavior remains in `src/components/app-shell/` and `src/components/nav-bar/`

## Risks

- direct deep links must still reveal the selected publisher/series path once async loading completes
- filter-scoped navigation must not reuse stale branch data across filter changes
- the navigation must not regress into clearing client-held expanded state on route changes

## Acceptance Criteria

- issue detail SSR and metadata remain unchanged
- persistent navigation state survives issue-to-issue navigation
- `public-navigation-state` no longer preloads full branch data by default
- node-friendly Jest coverage is added for the new preload behavior
