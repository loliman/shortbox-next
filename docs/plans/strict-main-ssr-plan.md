# Strict Main SSR Plan

Spec: [`docs/specs/strict-main-ssr-spec.md`](/Users/christian/shortbox/shortbox-next/docs/specs/strict-main-ssr-spec.md)

## Files
- inspect and likely replace the client-rooted catalog layouts:
  - `app/de/layout.tsx`
  - `app/us/layout.tsx`
  - `src/components/app-shell/PersistentCatalogShellClient.tsx`
- reuse or extend the existing server shell:
  - `src/components/app-shell/CatalogPageShell.tsx`
- inspect route pages and detail/listing components that still stream placeholders into `main`

## Steps
1. Inventory every path by which catalog `main` content can arrive after the initial HTML response.
2. Move catalog route shell ownership for `de` and `us` back to a server component path so `main` is not rooted in a client layout.
3. Keep header/footer/navigation chrome interactive, but decouple their client state from whether route content is present in `main`.
4. Remove or reduce `Suspense`/fallback usage inside `main` where the route already has the needed server data.
5. Verify initial HTML on representative home, listing, and issue detail routes.
6. Run build and regression verification.

## Verification
- `npm run build`
- `npm run test:a11y:pa11y`
- inspect initial HTML for `/de`, a listing route, and an issue detail route

## Risk Mitigation
- keep navigation state loading client-side if needed, but do not let it gate `main`
- prefer server-shell reuse over introducing a new parallel layout system
- preserve existing metadata, route params, and read helpers while changing rendering orchestration
