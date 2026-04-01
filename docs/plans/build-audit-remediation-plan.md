# Build Audit Remediation Plan

Spec: [`docs/specs/build-audit-remediation-spec.md`](/Users/christian/shortbox/shortbox-next/docs/specs/build-audit-remediation-spec.md)

## Files
- inspect existing audit scripts in `scripts/`
- update the smallest relevant presentation components under `src/components/`
- add or update narrow tests only if a safe node-friendly regression test is available

## Steps
1. Reproduce the current `pa11y` and `unlighthouse` findings with the existing package scripts.
2. Trace the highest-signal findings back to concrete rendered components and confirm whether they are true positives.
3. Prioritize fixes by accessibility impact, patch size, regression risk, and SEO safety.
4. Implement the smallest safe markup and labeling fixes in the affected components.
5. If Lighthouse still fails, defer only non-critical client chrome that is explicitly allowed to remain CSR.
6. Run `npm run lint`, `npm run test:a11y:pa11y`, and `npm run test:seo:unlighthouse` to verify the result.
7. Document remaining findings that require larger or riskier changes.

## Verification
- `npm run lint`
- `npm run test:a11y:pa11y`
- `npm run test:seo:unlighthouse`

## Risk Mitigation
- prefer fixes that preserve existing SSR content and visible text
- avoid changing route structure, metadata, or content hierarchy unless required for valid semantics
- treat catalog navigation and floating actions as eligible for client deferral, but keep header and `main` content stable
- stop at documentation when a remaining finding would require a broader layout or performance refactor
