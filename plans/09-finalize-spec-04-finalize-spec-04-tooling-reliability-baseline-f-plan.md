# Implementation Plan: Finalize / Spec 04: Tooling Reliability Baseline for ESLint and Jest

## Document Control
- **Plan ID:** `finalize-plan-04-tooling-baseline`
- **Spec ID:** `finalize-spec-04-tooling-baseline`
- **Status:** Draft
- **Owner:** Codex implementation agent
- **Created:** 2026-03-29
- **Last Updated:** 2026-03-29
- **Related Plans:** `plans/ai-robustness-plan.md`, `plans/api-refactoring-phase2-plan.md`
- **Related ADRs:** `docs/adr/adr-001*.md`, `docs/adr/adr-004*.md`
- **Governance Sources:** `AGENTS.md`, `docs/domain/overview.md`, `docs/workflows/testing-baseline.md`

---

## 1) Readiness Decision

The feature is **specific enough to plan**.

Rationale:
- Goal and acceptance criteria are explicit and measurable (`npm run lint`, `npm test -- --runInBand`).
- Scope boundaries and non-goals are clearly defined.
- Affected surfaces are concrete (`eslint.config.mjs`, Jest config/setup, targeted test files).
- Open question is non-blocking and can be resolved with a conservative default plus documented follow-up.

---

## 2) Objectives

1. Restore reliable lint execution with architectural boundary intent preserved.
2. Restore reliable Jest-only test execution in-band.
3. Remove or neutralize non-Jest test artifacts that pollute baseline status.
4. Add/fix minimal tooling/route tests required by existing plan commitments.
5. Deliver zero runtime product behavior changes.

---

## 3) In Scope

- Update `eslint.config.mjs` resolver and ignore behavior causing false failures or crash-level lint unreliability.
- Apply minimal ESLint boundary alignment to match `AGENTS.md` layering guidance.
- Convert/remove stray test artifacts incompatible with Jest.
- Update Jest config/setup/test helpers for deterministic in-band execution.
- Add/fix targeted route/tooling tests referenced by active plans.
- Validate with:
  - `npm run lint`
  - `npm test -- --runInBand`

## 4) Out of Scope

- New broad lint policy programs unrelated to current breakages.
- Test-runner migration or dual-runner support.
- Unrelated cleanup/refactors not required for baseline pass.
- Product feature changes.

---

## 5) Constraints and Architectural Guardrails

- Keep changes tooling/test-scoped unless a minimal typing/support extraction is required.
- Do not add business logic to `app/` or `src/components/`.
- Do not introduce Prisma access outside `src/lib/`.
- Preserve existing route/API semantics.
- Prefer incremental, low-blast-radius edits.
- Keep legacy-hotspot edits minimal and regression-guarded.

---

## 6) Implementation Strategy

### Phase A — Baseline Discovery and Failure Inventory
1. Run baseline commands to capture current failure set:
   - `npm run lint`
   - `npm test -- --runInBand`
2. Classify failures into buckets:
   - ESLint config/resolver/ignore failures
   - Boundary-rule violations
   - Non-Jest artifacts
   - Jest setup/environment/typing issues
   - Route/tooling test gaps required by related plans
3. Produce a short mapping table (`issue -> file -> fix type -> risk`).

### Phase B — ESLint Reliability Fixes
1. Repair resolver configuration in `eslint.config.mjs` so TypeScript/alias resolution is deterministic.
2. Adjust ignore patterns only where needed to avoid generated/irrelevant noise.
3. Ensure boundary checks remain aligned with `AGENTS.md` (preserve intended strictness, avoid broad expansion).
4. Re-run lint iteratively until clean.
5. If open-question tradeoff appears (ignore vs fix-in-place), choose conservative strictness-preserving approach and document a follow-up item.

### Phase C — Jest-Only Surface Normalization
1. Identify stray non-Jest artifacts in active test surface (naming, runner API usage, setup assumptions).
2. For each artifact, choose one:
   - Convert to Jest-compatible form, or
   - Remove/exclude if obsolete and not plan-required.
3. Normalize shared test setup for in-band stability (mocks, globals, environment consistency).
4. Keep changes minimal and localized to test/tooling configuration.

### Phase D — Required Route/Tooling Coverage
1. Cross-check plan commitments in related plans for specific route/tooling tests expected.
2. Add or repair minimal tests needed for those commitments.
3. Follow existing repository test patterns and naming (`should_when_then`).
4. Ensure tests assert current intended behavior without expanding product scope.

### Phase E — Final Verification and Documentation
1. Execute full validation:
   - `npm run lint`
   - `npm test -- --runInBand`
2. Confirm no runtime-facing files were altered unnecessarily.
3. Summarize decisions, especially:
   - ignore-vs-fix rationale
   - removed/converted artifact list
   - any deferred non-blocking cleanup
4. Record final outcomes in plan status and handoff notes.

---

## 7) Work Breakdown (Task List)

1. **Inventory failures** from lint and Jest in-band runs.
2. **Patch ESLint config** (`eslint.config.mjs`) for resolver reliability.
3. **Tighten ignores minimally** to eliminate non-source noise only.
4. **Reconcile boundary rules** to `AGENTS.md` architecture expectations.
5. **Locate non-Jest artifacts** in active test discovery paths.
6. **Convert/remove artifacts** based on relevance to current baseline.
7. **Fix Jest setup wiring** (environment/mocks/types) for deterministic runs.
8. **Add/repair targeted tests** required by related plan commitments.
9. **Run final lint and test gates** and capture pass evidence.
10. **Prepare completion summary** with explicit unchanged areas.

---

## 8) Deliverables

- Updated `eslint.config.mjs` with reliable resolver/ignore behavior.
- Jest-compatible test surface (no blocking non-Jest artifacts in active scope).
- Added/updated route/tooling Jest tests required by linked plans.
- Passing baseline commands:
  - `npm run lint`
  - `npm test -- --runInBand`
- Short implementation summary noting decisions and deferred non-blocking items.

---

## 9) Verification Plan

### Commands
- `npm run lint`
- `npm test -- --runInBand`

### Pass Criteria
- Lint exits successfully with boundary checks active as intended.
- Jest completes successfully in-band with no runner-mismatch failures.
- No unrelated runtime regressions introduced by tooling-only change set.

### Evidence to Capture
- Final command exit status and concise output summary.
- List of files changed by category:
  - lint config
  - test config/setup
  - converted/removed tests
  - added/updated targeted tests

---

## 10) Risks and Mitigations

1. **Risk:** Over-broad ignore patterns hide real issues.
   - **Mitigation:** Restrict ignores to generated/irrelevant paths only; document each ignore rationale.

2. **Risk:** Boundary-rule loosening reduces architecture enforcement.
   - **Mitigation:** Preserve existing intent; make only failure-driven corrections.

3. **Risk:** Converting old tests changes asserted behavior unintentionally.
   - **Mitigation:** Maintain parity assertions and update only runner syntax/setup.

4. **Risk:** In-band Jest exposes order dependencies/flaky globals.
   - **Mitigation:** Normalize setup teardown and isolate shared mocks.

5. **Risk:** Scope creep into unrelated failures.
   - **Mitigation:** Enforce strict issue-to-spec traceability; defer unrelated fixes.

---

## 11) Rollback / Fallback

- Keep commits logically separable by phase (lint config, Jest normalization, tests).
- If needed, revert specific phase changes while preserving validated phases.
- If a strictness decision blocks baseline, apply minimal temporary containment with explicit follow-up issue and rationale.

---

## 12) Definition of Done Mapping

- [ ] Code remains in correct architectural layers.
- [ ] No business logic introduced in `app/`, `src/components/`, or `src/util/`.
- [ ] No Prisma access added outside `src/lib/`.
- [ ] `npm run lint` passes.
- [ ] `npm test -- --runInBand` passes.
- [ ] Non-Jest artifacts no longer block baseline.
- [ ] Required route/tooling tests are added/updated per plan commitments.
- [ ] No unrelated product behavior changes.

---

## 13) Deferred Follow-Ups (Non-Blocking)

1. Decide long-term policy for legacy/generated directories (fix-in-place vs curated ignore list) if not fully resolved during this spec.
2. Optional: add CI annotation/reporting for clearer lint/test baseline diagnostics.
3. Optional: schedule cleanup ticket for any intentionally deferred unrelated failures found during inventory.

---

## 14) Execution Notes for Implementer

- Start with reproducible baseline outputs before modifying files.
- Apply smallest-change-first strategy; re-run gates frequently.
- Prefer conversion over deletion when artifact intent is still valid.
- Document every config-level relaxation with reason and scope.
- Keep final change set auditable and tightly coupled to this spec.
