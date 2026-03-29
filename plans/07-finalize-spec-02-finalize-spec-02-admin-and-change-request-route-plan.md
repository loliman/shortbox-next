# Implementation Plan — Finalize / Spec 02: Admin and Change-Request Route Result-Pattern Completion

## Document Control
- **Plan ID:** `finalize-spec-02-admin-change-result-plan`
- **Spec:** `finalize-spec-02-admin-change-result`
- **Status:** Draft
- **Owner:** Codex implementation agent
- **Last Updated:** 2026-03-29
- **Related Artifacts:**
  - `plans/api-refactoring-phase2-plan.md`
  - `AGENTS.md`
  - `docs/domain/overview.md`
  - `docs/adr/adr-001*.md` (result/route conventions as applicable)
  - `docs/adr/adr-004*.md` (layering/controller boundary expectations)
  - `docs/workflows/testing-baseline.md`

## 1) Summary
Complete phase-2 cleanup for `app/api/admin-task-actions/route.ts` and `app/api/change-requests/route.ts` so both routes follow thin-controller structure, explicit validation flow, and consistent `Result`-to-HTTP response mapping. Preserve successful-request behavior and add focused Jest regression coverage for success/failure and payload edge paths.

## 2) Scope and Boundaries
### In Scope
- Refactor only:
  - `app/api/admin-task-actions/route.ts`
  - `app/api/change-requests/route.ts`
- Introduce minimal shared route-local/helper logic only if required for consistency.
- Update/add Jest tests for both routes’ success and failure paths.

### Out of Scope
- Broad admin API standardization beyond these two routes.
- Business-policy changes, permission rewrites, or workflow redesign.
- Prisma/data-layer changes in `app/`.
- Large file moves or cross-layer restructuring.

## 3) Architecture and Governance Alignment
- Keep `app/api/*` handlers as thin controllers:
  1. Parse request
  2. Validate input (explicit)
  3. Call service/lib
  4. Map `Result` to HTTP response
- No Prisma access in `app/`.
- Business behavior remains in existing service/lib modules.
- Reuse `src/types/result.ts` and existing route conventions in already-refactored CRUD/admin APIs.
- Avoid post-Yup `as` casts and ad-hoc branch logic based on casted shapes.

## 4) Implementation Steps

### Step 1 — Baseline Discovery and Pattern Capture
- Inspect current implementations of:
  - `app/api/admin-task-actions/route.ts`
  - `app/api/change-requests/route.ts`
- Identify:
  - Existing validation schemas and gaps
  - Loose casts after validation
  - Inconsistent `Result` handling branches
  - Current response envelopes/status code behavior
- Capture comparator patterns from already-compliant API routes in repository.

**Deliverable:** short internal mapping of “current vs target pattern” per route.

### Step 2 — `admin-task-actions` Thin-Controller Completion
- Refactor handler flow to explicit stages: parse → validate → delegate → map response.
- Remove inline result/cast inconsistencies and unreachable/ambiguous branches.
- Ensure `Result` variants map consistently to existing route conventions (success, validation error, domain/not-found/conflict/unauthorized as already defined by project pattern).
- Preserve existing successful payload and status behavior.

**Deliverable:** updated `app/api/admin-task-actions/route.ts` with stable behavior and consistent `Result` mapping.

### Step 3 — `change-requests` Validation and Result Cleanup
- Remove loose post-Yup casts.
- Ensure validated payload type is derived from schema-safe parsing path.
- Align `Result` handling and HTTP mapping with same conventions used in Step 2 and existing compliant routes.
- Keep route thin; do not move business rules into handler.

**Deliverable:** updated `app/api/change-requests/route.ts` with cast-free validated flow and consistent result mapping.

### Step 4 — Shared Mapping/Helper Tightening (Only if Needed)
- If both routes duplicate mapping logic, extract minimal helper in existing appropriate location (route-support utility), without introducing new business logic.
- Keep extraction incremental and local; avoid broad abstraction.

**Deliverable:** optional minimal helper changes, only if they reduce inconsistency without widening scope.

### Step 5 — Jest Regression and Parity Tests
- Add/update tests for each route covering:
  - Success path (valid payload)
  - Validation failure path (schema error / malformed payload)
  - Representative domain/service failure mapping path(s)
  - Regression-prone edge payloads noted in current handlers/spec
- Assert both status code and response body structure.
- Ensure tests are deterministic and aligned with existing route test style.

**Deliverable:** updated `*.test.ts` coverage for both route handlers.

### Step 6 — Verification and Quality Gates
- Run focused tests first (new/updated route tests).
- Run broader Jest target per project testing baseline.
- Run ESLint for touched files/scope (or repo-standard lint command if required by baseline).
- Confirm no architectural boundary violations introduced.

**Deliverable:** green validation for lint/tests relevant to DoD.

## 5) File-Level Change Plan (Expected)
- **Primary edits**
  - `app/api/admin-task-actions/route.ts`
  - `app/api/change-requests/route.ts`
- **Tests (expected locations based on repo conventions)**
  - Existing route test files adjacent or in configured API test folders (to be discovered in Step 1)
- **Optional minimal helper touch (if justified)**
  - Existing route result/response helper module already used by peer routes

## 6) Test Strategy
- **Unit/route-level Jest tests:**
  - Validation failure returns explicit, consistent error structure.
  - Service/lib `Result` failure variants map to expected HTTP statuses.
  - Success response remains backward-compatible.
- **Regression emphasis:**
  - Legacy payload shape edge cases for `admin-task-actions`.
  - Cast-sensitive payload scenarios in `change-requests`.
- **Quality checks:**
  - `jest` (targeted then broader)
  - `eslint` (project standard command)

## 7) Acceptance Criteria Mapping
- `admin-task-actions` thin-controller and consistent `Result` mapping → Steps 2, 6
- `change-requests` no loose post-validation casts → Step 3
- Explicit/consistent error responses → Steps 2, 3, 5
- Backward-compatible valid behavior → Steps 2, 3, 5
- Jest success/failure branch coverage for both routes → Step 5

## 8) Risks and Mitigations
- **Risk:** hidden reliance on permissive casts for legacy payloads.
  - **Mitigation:** codify expected legacy-accepted shapes in validation/tests before tightening branches.
- **Risk:** accidental response-envelope drift.
  - **Mitigation:** assert body structure in regression tests against current conventions.
- **Risk:** over-abstraction while trying to unify result mapping.
  - **Mitigation:** extract only if duplication is concrete and local; otherwise keep per-route explicit mapping.

## 9) Rollout and Fallback
- Deliver as a single focused PR-sized change set.
- If incompatibility appears, fallback is to keep thin-controller flow and restore prior accepted payload branch while adding explicit TODO for phase-wide normalization.

## 10) Definition of Done Checklist
- [ ] Changes limited to planned scope/routes/tests.
- [ ] Route handlers are thin controllers.
- [ ] No Prisma access outside `src/lib/`.
- [ ] No loose post-Yup casts in `change-requests` route.
- [ ] `Result` handling is consistent and explicit in both routes.
- [ ] Success behavior remains compatible.
- [ ] Jest tests added/updated for success and failure paths.
- [ ] ESLint passes for project-required scope.
- [ ] Plan/spec artifact references updated as needed in PR notes.
