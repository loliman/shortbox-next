# Implementation Plan: Finalize / Spec 03: Centralized Runtime Environment Access Completion

## Document Control
- **Plan ID:** `finalize-spec-03-env-centralization-plan`
- **Spec Reference:** `finalize-spec-03-env-centralization`
- **Status:** Draft
- **Owner:** AI implementation agent
- **Last Updated:** 2026-03-29
- **Related Artifacts:**
  - `AGENTS.md`
  - `docs/domain/overview.md`
  - `docs/adr/001*` and `docs/adr/004*`
  - `docs/workflows/testing-baseline.md`
  - `plans/ai-robustness-plan.md`
  - `plans/templates/implementation-plan.md`

## 1) Readiness Decision
This feature is **specific enough to plan**.

Rationale:
- Goal and non-goals are explicit (runtime-path env centralization only).
- Primary technical target is clearly identified (`src/lib/env.ts` + in-scope runtime consumers).
- Constraints and acceptance criteria define expected parity and testing needs.
- One scope ambiguity remains (scripts/Prisma/tooling), but spec already frames runtime-only completion as non-blocking and maintainable.

## 2) Scope Definition for Execution
### In Scope
- Runtime application code that executes in app/server/API/worker paths and currently reads `process.env` directly.
- Centralization through `src/lib/env.ts` (or established wrappers that delegate to it).
- Jest tests for changed env helper behaviors and key failure modes.

### Out of Scope
- Scripts, one-off tooling, CI scripts, Prisma config, and build-only files unless a discovered runtime dependency requires touch.
- Env variable contract changes (names, requiredness, semantics).
- Feature-level business logic changes.

### Scope Gate (to resolve open question without blocking)
Adopt this operational boundary for implementation:
- **Default:** runtime-only cleanup.
- **If a file is ambiguous:** include only when imported by runtime code paths (`app/`, `src/lib/`, `src/services/`, `src/worker/`).
- **If not runtime-imported:** document and defer.

## 3) Architecture and Governance Constraints
- Keep route/page handlers thin; no new business logic in `app/`.
- Keep env normalization/access in `src/lib/`.
- Do not move env access into `src/components/` or `src/util/`.
- Preserve metadata/canonical behavior (especially any base URL resolution).
- Make changes incrementally; avoid unrelated refactors.

## 4) Implementation Strategy
### Phase A — Repository Discovery and Baseline
1. Read governance and reference docs listed above.
2. Inventory direct `process.env` usage with categorized output:
   - runtime in-scope
   - tooling/script out-of-scope
   - ambiguous (needs import-chain verification)
3. Snapshot current behavior-sensitive env consumers (metadata, sitemap, auth, integrations, worker entrypoints).

Deliverable:
- A tracked checklist of candidate files and disposition (`in-scope`, `defer`, `ambiguous->resolved`).

### Phase B — Define Central Access Contract in `src/lib/env.ts`
1. Review existing env helper API and patterns (required vs optional, coercion, defaults, error style).
2. Add/extend helper exports only as needed for uncovered env keys.
3. Preserve existing semantics:
   - same fallback/default behavior
   - same “required” enforcement timing where practical
   - no URL/SEO semantic drift

Design rules:
- Prefer small, composable getters over broad config object rewrites.
- Keep throw messages deterministic and testable.
- Avoid side effects at import-time unless already established pattern.

Deliverable:
- Updated `src/lib/env.ts` (and minimal adjacent types/helpers if needed).

### Phase C — Migrate In-Scope Runtime Consumers
1. Replace direct `process.env.*` reads in each in-scope runtime file with env helper calls.
2. For files with mixed runtime/tooling behavior, isolate runtime access path and leave tooling path untouched.
3. Preserve behavior for valid envs and existing optional handling.

Migration pattern per file:
- before: ad hoc `process.env.X`
- after: `getX()` / established env wrapper
- keep module boundaries unchanged

Deliverable:
- Runtime consumers no longer read env directly (for in-scope files).

### Phase D — Test Coverage and Regression Safety
1. Add/update Jest tests for env helper behaviors touched:
   - required var missing -> explicit failure
   - malformed value handling (if parsing/coercion exists)
   - optional/default parity
2. Add targeted parity tests for critical consumers where env affects output semantics (metadata/canonical base URL paths).
3. Do not broaden into unrelated integration test rewrites.

Deliverable:
- Passing targeted Jest coverage for touched env logic.

### Phase E — Validation and Documentation
1. Run lint and Jest according to repository testing baseline.
2. Re-check inventory to confirm no remaining in-scope direct `process.env`.
3. Document deferred out-of-scope usages and rationale in plan notes or PR summary.

Deliverable:
- Verified acceptance criteria mapping and completion summary.

## 5) Concrete Work Breakdown (Task List)
1. Governance/doc scan and pattern extraction.
2. Build `process.env` inventory with scope tags.
3. Update/extend `src/lib/env.ts` helpers minimally.
4. Migrate in-scope runtime consumers file-by-file.
5. Add/update Jest tests for env helper + critical SEO-path parity.
6. Run lint and Jest; fix only feature-related failures.
7. Produce final change log with deferred items.

## 6) File-Level Change Expectations
### Primary
- `src/lib/env.ts` (required)

### Likely (based on discovery)
- Runtime consumers under:
  - `app/**` (route handlers/pages using env directly)
  - `src/lib/**` (metadata, sitemap, adapters)
  - `src/services/**` (if direct env reads exist)
  - `src/worker/**` (runtime worker entrypoints)

### Tests
- Existing Jest files adjacent to env helper or affected modules
- New `*.test.ts` only where meaningful parity coverage is missing

### Explicitly Avoid (unless proven runtime-coupled)
- `scripts/**`
- Prisma config/toolchain config
- CI/dev tooling files

## 7) Acceptance Criteria Traceability
1. **Replace in-scope direct reads**
   - Verified by inventory diff: all runtime in-scope `process.env` entries resolved or delegated.
2. **Valid-config behavior unchanged**
   - Verified by targeted parity tests and unchanged canonical/metadata output snapshots/assertions.
3. **Missing/malformed handling explicit/consistent**
   - Verified by env helper unit tests.
4. **SEO/canonical semantics preserved**
   - Verified by tests on metadata/canonical base URL consumers.
5. **Jest coverage for touched helper behavior**
   - Verified by new/updated tests and passing run.

## 8) Risk Management
- **Risk:** Silent behavior drift from default/fallback changes.
  - **Mitigation:** Preserve existing defaults; add parity assertions before/after migration where possible.
- **Risk:** Import-time throws change runtime startup behavior.
  - **Mitigation:** Follow existing helper invocation timing; avoid new eager reads unless already established.
- **Risk:** Ambiguous files accidentally included/excluded.
  - **Mitigation:** Use runtime import-chain check and record decisions.

## 9) Validation Plan
- Run targeted test subset first (env helper and touched modules).
- Run full Jest suite (or repository-prescribed subset) per `docs/workflows/testing-baseline.md`.
- Run ESLint.
- Re-run scoped search to confirm no unresolved in-scope direct `process.env` usage.

## 10) Rollout and Backout
### Rollout
- Single incremental PR is acceptable if diff remains focused.
- If inventory is large, split into:
  1) helper/test groundwork
  2) consumer migrations by domain area

### Backout
- Revert consumer migrations while retaining non-breaking tests/helpers if needed.
- No data migration implications.

## 11) Definition of Done Checklist
- [ ] All in-scope runtime direct `process.env` reads replaced or wrapped.
- [ ] `src/lib/env.ts` is the clear central access point for touched keys.
- [ ] No new business logic added outside proper layers.
- [ ] Canonical/metadata behavior remains unchanged.
- [ ] Jest tests updated/added for touched env behavior.
- [ ] ESLint passes.
- [ ] Deferred out-of-scope env usages documented.

## 12) Notes for Implementer
- Keep changes surgical and reversible.
- Prefer extraction/delegation over broad rewrites.
- If uncertain about a borderline file, default to runtime-only interpretation and document deferment.
- Preserve public interfaces unless a direct replacement is already an established project pattern.
