# Build Audit Tooling Plan

Spec: [`docs/specs/build-audit-tooling-spec.md`](/Users/christian/shortbox/shortbox-next/docs/specs/build-audit-tooling-spec.md)

## Files
- update `package.json`
- add `scripts/audit-routes.json`
- add `scripts/audit-shared.mjs`
- add `scripts/run-pa11y-audit.mjs`
- add `scripts/run-unlighthouse-audit.mjs`

## Steps
1. Install `pa11y` and `unlighthouse` as dev dependencies.
2. Add a shared audit route sample.
3. Add a shared helper that starts `next start`, waits for readiness, and shuts the server down.
4. Add a `pa11y` audit runner script.
5. Add an `unlighthouse` audit runner script.
6. Add package scripts for desktop and mobile Lighthouse-style runs.
7. Verify the scripts against the current build output.

## Verification
- `npm run build`
- `npm run test:a11y:pa11y`
- `npm run test:seo:unlighthouse`

## Risk Mitigation
- keep the route sample intentionally small
- default pa11y to `error` level only
- allow audit limits and budget overrides via environment variables
