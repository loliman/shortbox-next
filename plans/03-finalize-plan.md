# Implementation Plan: Plan Follow-up Completion

## Document Control
- **Plan title:** Plan Follow-up Completion
- **Spec reference:** `plan-followup-spec`
- **Plan status:** Proposed
- **Owner:** AI implementation agent
- **Created:** 2026-03-29
- **Last updated:** 2026-03-29
- **Related plans:** `plans/ai-robustness-plan.md`, `plans/api-refactoring-phase2-plan.md`
- **Related ADRs:** `docs/adr/adr-001*`, `docs/adr/adr-004*` (exact filenames verified during execution)

## 1) Summary
Finalize the in-progress plan commitments by closing route-validation/result-pattern gaps, centralizing remaining in-scope runtime env access through `src/lib/env.ts`, stabilizing lint configuration and boundary checks, and ensuring the active Jest baseline passes via targeted test migration/adjustment only where required.

This plan is intentionally scoped to avoid product-level feature changes and broad unrelated refactors.

## 2) Scope and Guardrails
### In scope
- Remaining open items from:
  - `plans/ai-robustness-plan.md`
  - `plans/api-refactoring-phase2-plan.md`
- Targeted API routes:
  - `app/api/change-requests/route.ts`
  - `app/api/admin-task-actions/route.ts`
  - `app/api/public-autocomplete/route.ts`
  - Conditional: `app/api/auth/login/route.ts` (only if audit finds unresolved in-scope item)
- Runtime application env centralization for in-scope consumers (replace direct `process.env` with `src/lib/env.ts` accessors where expected by plans)
- `eslint.config.mjs` resolver/ignore corrections to restore intended lint signal
- Jest-baseline reliability work (`npm test -- --runInBand`) with minimal, active-baseline-only test migration

### Out of scope
- New product features or behavior redesign
- Repo-wide `process.env` migration (tooling/build/script contexts remain out unless baseline-blocking)
- Repo-wide non-Jest migration
- Broad route refactoring beyond plan-driven targets
- Large cross-layer architecture moves

## 3) Repository Governance Alignment
- Keep `app/api/*` handlers thin: parse/validate input → delegate to service/lib → shape HTTP response.
- Keep business rules in `src/services/`, infra/data/env access in `src/lib/`, pure helpers in `src/util/`.
- No Prisma usage in route handlers.
- Preserve endpoint semantics for valid requests.
- Use incremental refactoring and parity-first behavior stability.

## 4) Preconditions and Discovery Checklist
Before implementation, execute a short discovery pass and capture findings in the PR description:
1. Read and reconcile:
   - `AGENTS.md`
   - `docs/domain/overview.md`
   - ADR 001 and ADR 004 under `docs/adr/`
   - `plans/ai-robustness-plan.md`
   - `plans/api-refactoring-phase2-plan.md`
   - `docs/workflows/testing-baseline.md` (if present)
2. Build a checklist of unresolved items mapped to concrete files/functions.
3. Confirm active lint/test commands and current failures:
   - `npm run lint`
   - `npm test -- --runInBand`
4. Identify all runtime (not tooling) direct `process.env` consumers remaining in scope.

## 5) Work Breakdown Structure

### Phase A — Gap Audit and Task Mapping
1. Enumerate unchecked/incomplete tasks from both related plans.
2. Map each open task to a concrete code location and expected end state.
3. Classify each item as one of:
   - Route validation/result cleanup
   - Env centralization
   - Lint config repair
   - Jest baseline repair
4. Decide whether `app/api/auth/login/route.ts` requires action (binary decision with evidence).

**Deliverable:** Traceable audit matrix (plan item → file → action).

### Phase B — Route Validation and Result-Pattern Completion
Apply targeted updates to planned routes only.

#### B1. `app/api/change-requests/route.ts`
- Remove loose casts that bypass validated types.
- Ensure Yup validation output is the typed source-of-truth.
- Normalize invalid payload response behavior to explicit, consistent status/body pattern used by neighboring refactored routes.

#### B2. `app/api/admin-task-actions/route.ts`
- Finish thin-controller alignment:
  - Parse request
  - Validate schema
  - Delegate domain action
  - Return mapped `Result`/error response
- Remove remaining inline result/exception handling inconsistencies.

#### B3. `app/api/public-autocomplete/route.ts`
- Remove remaining unsafe casts after validation.
- Make invalid query/body handling explicit and deterministic.

#### B4. `app/api/auth/login/route.ts` (conditional)
- If audit confirms unresolved robustness follow-up: apply minimal parity-safe cleanup only.
- If no unresolved in-scope gap: leave unchanged and document explicit rationale.

**Deliverable:** Route handlers conform to thin-controller + validated-input + consistent result/error handling patterns.

### Phase C — Runtime Env Access Centralization
1. Identify in-scope runtime consumers still reading `process.env` directly.
2. Replace with `src/lib/env.ts` accessors (or extend `env.ts` minimally when needed).
3. Keep tooling/build/script env usage untouched unless needed to unblock lint/test baseline.
4. Re-verify metadata/canonical/sitemap/robots semantics remain unchanged.

**Deliverable:** In-scope runtime env reads centralized; no unintended SEO/runtime behavior drift.

### Phase D — Lint Stability (`eslint.config.mjs`)
1. Fix resolver configuration so path aliases/modules resolve consistently.
2. Fix ignore patterns to avoid false positives/negatives that obscure architectural checks.
3. Ensure intended boundary rules are active and passing.

**Deliverable:** `npm run lint` passes with boundary intent preserved.

### Phase E — Jest Baseline Reliability
1. Run `npm test -- --runInBand` and catalog failures.
2. For failures caused by non-Jest artifacts in active baseline path:
   - Migrate/adjust only required tests/utilities.
3. Avoid broad test-framework conversions outside baseline-critical scope.
4. Re-run Jest until baseline is green and deterministic.

**Deliverable:** `npm test -- --runInBand` fully passes.

### Phase F — Regression Safety and Documentation
1. Add/update focused tests for changed pure logic (service/util helpers) where behavior-critical.
2. Update related plan checkboxes/status notes in `plans/` artifacts.
3. Add concise change notes: what changed, what was intentionally left unchanged, and why.

**Deliverable:** Traceable closure of planned follow-ups and explicit non-changes.

## 6) File-Level Change Plan (Expected)
- `app/api/change-requests/route.ts` — validation typing/result cleanup
- `app/api/admin-task-actions/route.ts` — thin-controller/result handling cleanup
- `app/api/public-autocomplete/route.ts` — cast removal + explicit invalid-input handling
- `app/api/auth/login/route.ts` — conditional minimal cleanup only if audit requires
- `src/lib/env.ts` — accessor additions/refinement for remaining in-scope runtime needs
- Runtime consumers identified in audit — swap direct `process.env` for env helpers
- `eslint.config.mjs` — resolver/ignore stabilization
- Jest baseline-related test files/helpers only as required
- Plan status docs under `plans/` — completion tracking updates

## 7) Validation Strategy
Execute in this order after each phase where relevant:
1. Targeted tests for changed modules (if present)
2. `npm run lint`
3. `npm test -- --runInBand`

Acceptance gate is reached only when both lint and Jest commands pass from a clean working tree state.

## 8) Acceptance Criteria Mapping
- **Route cleanup complete:** targeted routes no longer rely on loose casts after validation and follow explicit invalid-input handling.
- **Result pattern consistency:** route handlers return delegated/mapped result flows without ad-hoc inconsistencies.
- **Env centralization complete (in scope):** no remaining direct runtime `process.env` usage in the agreed plan scope.
- **Conditional auth route decision:** `app/api/auth/login/route.ts` either minimally fixed with evidence or explicitly no-op with evidence.
- **Lint stable:** `npm run lint` passes with intended boundary enforcement.
- **Jest stable:** `npm test -- --runInBand` passes reliably.
- **Behavior parity:** no intentional product behavior changes outside explicit validation/error consistency improvements.

## 9) Risks and Mitigations
- **Risk:** Validation tightening rejects legacy malformed payloads.
  - **Mitigation:** Preserve valid-request semantics; standardize only invalid-input responses.
- **Risk:** Env centralization alters runtime metadata behavior.
  - **Mitigation:** Restrict to accessor substitution and verify metadata/canonical outputs unchanged.
- **Risk:** Lint fix accidentally weakens rule coverage.
  - **Mitigation:** Prefer minimal resolver/ignore corrections; confirm boundary rules still execute.
- **Risk:** Jest migration scope creep.
  - **Mitigation:** Migrate only baseline-blocking tests and document exclusions.

## 10) Execution Sequence
1. Discovery + unresolved-item matrix
2. Route updates (change-requests, admin-task-actions, public-autocomplete)
3. Conditional auth/login decision and action/no-action record
4. Runtime env centralization (in-scope only)
5. ESLint config stabilization
6. Jest baseline fixes
7. Full lint + Jest verification
8. Plan artifact status updates and finalize notes

## 11) Definition of Done Checklist
- [ ] Open items from both related plans are resolved or explicitly deferred with rationale.
- [ ] Target route handlers are thin and validation/result cleanup is complete.
- [ ] `app/api/auth/login/route.ts` has an evidence-backed action/no-action outcome.
- [ ] In-scope runtime direct `process.env` usage is removed.
- [ ] `npm run lint` passes.
- [ ] `npm test -- --runInBand` passes.
- [ ] Architecture boundaries in `AGENTS.md` remain respected.
- [ ] Plan/status docs in `plans/` updated to reflect completion.

## 12) Proposed Plan Artifact Path
`plans/plan-followup-completion-implementation-plan.md`

If naming conventions differ in the repository, keep this content and adjust filename only to match existing `plans/` patterns.
