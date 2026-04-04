# Strict Main SSR Plan

Spec: [`specs/strict-main-ssr-spec.md`](/Users/christian/shortbox/shortbox-next/specs/strict-main-ssr-spec.md)

## Files
- inspect and likely replace the client-rooted catalog layouts:
  - `app/de/layout.tsx`
  - `app/us/layout.tsx`
  - `src/components/app-shell/PersistentCatalogShellClient.tsx`
- reuse or extend the existing server shell:
  - `src/components/app-shell/CatalogPageShell.tsx`
- inspect route pages and detail/listing components that still stream placeholders into `main`
- remove route-level loading fallbacks that still inject detail skeletons into `main`:
  - `app/de/loading.tsx`
  - `app/de/[publisher]/loading.tsx`
  - `app/de/[publisher]/[series]/loading.tsx`
  - `app/de/[publisher]/[series]/[issue]/loading.tsx`
  - `app/de/[publisher]/[series]/[issue]/[format]/loading.tsx`
  - `app/us/loading.tsx`
  - `app/us/[publisher]/loading.tsx`
  - `app/us/[publisher]/[series]/loading.tsx`
  - `app/us/[publisher]/[series]/[issue]/loading.tsx`
  - `app/us/[publisher]/[series]/[issue]/[format]/loading.tsx`

## Steps
1. Inventory every path by which catalog `main` content can arrive after the initial HTML response.
2. Move catalog route shell ownership for `de` and `us` back to a server component path so `main` is not rooted in a client layout.
3. Keep header/footer/navigation chrome interactive, but decouple their client state from whether route content is present in `main`.
4. Remove or reduce `Suspense`/fallback usage inside `main` where the route already has the needed server data.
5. Remove route `loading.tsx` fallbacks across canonical catalog segments so direct navigations no longer show inherited skeleton placeholders in `main`.
6. Verify initial HTML and direct navigation behavior on representative home, listing, and issue detail routes.
7. Run build and regression verification.

## Verification
- `npm run build`
- `npm run test:a11y:pa11y`
- inspect initial HTML for `/de`, a listing route, and an issue detail route
- confirm direct issue-route navigations do not show route-level skeletons in `main`

## Risk Mitigation
- keep navigation state loading client-side if needed, but do not let it gate `main`
- prefer server-shell reuse over introducing a new parallel layout system
- preserve existing metadata, route params, and read helpers while changing rendering orchestration
