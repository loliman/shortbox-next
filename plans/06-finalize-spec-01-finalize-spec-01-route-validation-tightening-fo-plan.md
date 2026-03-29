# Implementation Plan — Finalize / Spec 01: Route Validation Tightening for Public and Auth APIs

## Document Control
- **Plan ID:** `finalize-spec-01-route-validation-plan`
- **Related spec:** `finalize-spec-01-route-validation`
- **Status:** Draft
- **Owner:** AI implementation agent
- **Last updated:** 2026-03-29
- **Primary scope:** `app/api/public-autocomplete/route.ts`, `app/api/auth/login/route.ts`, corresponding Jest route tests

## 1) Planning Readiness Decision
This feature is **specific enough to implement without blocking clarification**.

Why it is ready:
- Target files and route boundaries are explicit.
- Required behavior is constrained to validation/cast tightening and parity of valid behavior.
- Acceptance criteria identify both code and test outcomes.
- Architectural constraints are explicit in repository governance (`AGENTS.md`) and referenced docs.

Non-blocking ambiguity retained in plan:
- Login normalization strictness (trim/case) remains parity-only unless maintainer directs otherwise.

## 2) Governance and Context Inputs
Implementation must align with:
- `AGENTS.md` (layering, thin route handlers, no Prisma in `app/`)
- `docs/domain/overview.md` (domain behavior parity)
- `docs/adr/ADR-001*` and `docs/adr/ADR-004*` (boundary/validation design intent)
- `docs/workflows/testing-baseline.md` (Jest conventions)
- `plans/templates/implementation-plan.md` (artifact structure and quality bar)
- Related plan intent: `ai-robustness-plan.md`

## 3) Objectives
1. Remove unsafe or loose post-validation `as` casting in `public-autocomplete` route.
2. Bring `auth/login` request parsing and casting in line with robustness commitments, without changing valid auth semantics.
3. Ensure invalid payload responses are deterministic and consistent with existing API conventions in this repo.
4. Add/adjust Jest coverage for both invalid input and happy-path parity for both routes.

## 4) Out of Scope
- Auth/session business-rule changes.
- Replacing Yup or introducing new validation frameworks.
- Refactors outside target handlers/tests.
- Admin-task or change-request route work.

## 5) Implementation Strategy

### Phase A — Baseline and Conventions Discovery
- Inspect both route handlers and existing sibling route patterns for:
  - Yup schema usage style.
  - Validation error response shape and status-code convention.
  - Typed request-body flow after validation.
- Identify current casts and where type narrowing can replace `as`.
- Locate existing tests for these routes (or analogous route test suites) and shared test helpers.

**Deliverable:** Short implementation notes (in commit context) identifying exact cast-removal points and target response convention.

### Phase B — `public-autocomplete` Route Tightening
- Refactor request body parsing in `app/api/public-autocomplete/route.ts` so validated payload is consumed through inferred/declared validated type (no loose post-validation cast).
- Keep handler thin: parse → validate → delegate → respond.
- Preserve existing success-path behavior and response contract.
- Ensure validation failure path returns repository-conventional explicit error payload and status.

**Deliverable:** Route file with cast-free post-validation flow and unchanged valid semantics.

### Phase C — `auth/login` Route Alignment
- Update request parsing/casting in `app/api/auth/login/route.ts` only as needed to satisfy robustness scope.
- Avoid semantic changes to successful login outcomes.
- Keep normalization behavior parity unless currently already standardized by existing helpers.
- Ensure malformed/invalid payloads fail explicitly via existing route conventions.

**Deliverable:** Login route with tightened typed validation flow and parity-preserving behavior.

### Phase D — Test Coverage (Jest)
- Add or update route tests to assert:
  - Invalid payload path for `public-autocomplete`.
  - Happy path parity for `public-autocomplete`.
  - Invalid payload path for `auth/login`.
  - Happy path parity for `auth/login`.
- Follow repository naming pattern (`*.test.ts`) and descriptive case naming (`should_when_then`).
- Prefer minimal, focused assertions on status and response shape, plus key delegation behavior where existing patterns support it.

**Deliverable:** Passing/updated Jest tests covering acceptance criteria.

### Phase E — Verification and Quality Gates
- Run targeted tests for touched suites first.
- Run broader Jest scope if project workflow expects it for route changes.
- Run lint on touched files or project-standard lint command.
- Confirm no architectural violations (no Prisma in `app/`, no business logic moved into handlers).

**Deliverable:** Validation evidence in final change summary.

## 6) File-Level Change Plan
- `app/api/public-autocomplete/route.ts`
  - Replace unsafe post-validation casts with validated typed value flow.
  - Normalize invalid-input response path to existing conventions.
- `app/api/auth/login/route.ts`
  - Tighten request parsing/casting only within robustness scope.
  - Preserve valid login semantics.
- Route test files under existing test structure (to be discovered in Phase A)
  - Add/update invalid and success cases for both routes.

## 7) Response/Validation Conventions (Planned)
- Reuse existing route-level error contract rather than inventing a new one.
- Validation failures should be explicit, deterministic, and test-asserted.
- If conventions differ between auth and public endpoints today, prefer local consistency within each route family unless spec or existing refactor precedent indicates unification.

## 8) Risk Controls
- **Risk:** Accidental auth behavior change.
  - **Mitigation:** Limit edits to parsing/casting path; lock parity with happy-path tests.
- **Risk:** Over-tight validation breaks legacy callers unexpectedly.
  - **Mitigation:** Restrict validation changes to what existing schemas/conventions already imply; avoid new normalization rules.
- **Risk:** Inconsistent error payload shape.
  - **Mitigation:** Snapshot/assert against nearby route conventions and existing test helpers.

## 9) Acceptance Criteria Mapping
- **AC1:** No loose post-validation casts in `public-autocomplete`.
  - Verified by direct code inspection + tests passing.
- **AC2:** `auth/login` parsing/casting aligned with robustness scope.
  - Verified by focused diff and parity tests.
- **AC3:** Invalid input explicit and convention-consistent.
  - Verified by new invalid-input test assertions.
- **AC4:** Valid behavior backward-compatible.
  - Verified by happy-path tests and unchanged delegation outcomes.
- **AC5:** Jest coverage for invalid/success scenarios on both routes.
  - Verified by test suite additions/updates.

## 10) Execution Checklist
- [ ] Read referenced governance/docs and route/testing conventions.
- [ ] Refactor `public-autocomplete` typed validation flow.
- [ ] Refactor `auth/login` parsing/casting within scope.
- [ ] Add/update Jest tests for both invalid and success paths.
- [ ] Run targeted Jest tests.
- [ ] Run lint checks per repo workflow.
- [ ] Confirm no boundary violations.
- [ ] Prepare concise implementation summary with unchanged areas called out.

## 11) Definition of Done for This Plan
This plan is complete when:
- All acceptance criteria in the feature spec are satisfied.
- Code remains within repository architectural boundaries.
- Tests and lint pass for touched scope.
- No unrelated refactors are included.
- Final change summary explicitly states what was changed and intentionally left unchanged.
