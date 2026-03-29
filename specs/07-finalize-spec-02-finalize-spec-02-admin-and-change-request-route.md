# Feature Specification: Admin and Change-Request Route Result-Pattern Completion

## Document Metadata

- Feature name: Admin and Change-Request Route Result-Pattern Completion
- Spec identifier: finalize-spec-02-admin-change-result
- Status: Draft
- Related plan: api-refactoring-phase2-plan.md
- Related ADRs: ADR 001, ADR 004
- Architecture decision required?: No
- Authors: OpenAI Codex
- Last updated: 2026-03-29

## 1. Goal

Finish the remaining phase-2 API refactor items for `admin-task-actions` and `change-requests` by completing thin-controller alignment, explicit validation flow, and `Result`-pattern cleanup while preserving endpoint behavior for valid requests.

## 2. Scope

- Refine `app/api/admin-task-actions/route.ts` to complete thin-controller structure and remove remaining inline result/cast inconsistencies.
- Refine `app/api/change-requests/route.ts` to remove loose post-Yup casts and finalize result handling conventions.
- Ensure both handlers consistently map service/lib `Result` outcomes to API responses.
- Add/update Jest coverage for failure/success paths and regression-prone payload edge cases.

## 3. Non-Goals

- Rewriting worker orchestration or task domain workflows.
- Broad refactor of all `app/api/*` routes.
- Changing permissions/business policy semantics.
- Moving large modules across layers.

## 4. User-Visible Behavior

- Entry points:
  `app/api/admin-task-actions/route.ts`, `app/api/change-requests/route.ts`
- Expected UI or API changes:
  More predictable error handling and validation failures; valid responses remain behaviorally equivalent.
- Empty, loading, error, and not-found states:
  Existing UI remains unchanged; API error responses become structurally consistent.
- SEO or canonical URL impact:
  None.

## 5. Domain and Business Rules

- Existing rules that apply:
  Route handlers are thin controllers; business logic stays in services/lib; Prisma remains outside `app/`.
- New rules introduced by this feature:
  Target routes must complete `Result`-pattern usage and avoid ad-hoc cast-driven branching after validation.
- Rules that must remain unchanged:
  Existing admin task action effects and change-request semantics for valid calls.

Reference:
- `AGENTS.md`
- `docs/domain/overview.md`
- `docs/adr/` (ADR 001, ADR 004)
- `docs/workflows/testing-baseline.md`

## 6. Affected Routes and Pages

| Route or page | Context (`de` / `us` / admin / api / worker) | Change summary |
|---|---|---|
| `app/api/admin-task-actions/route.ts` | `api` | Complete thin-controller and result handling cleanup |
| `app/api/change-requests/route.ts` | `api` | Remove loose casts after Yup validation and align result mapping |
| Jest tests for above handlers | `admin` | Add parity/regression route tests for success/error branches |

## 7. Architectural Placement Expectations

- Entry points to keep thin in `app/`:
  Validate request, call service/lib helper, map `Result` to response.
- UI or presentation changes expected in `src/components/`:
  None.
- Business logic expected in `src/services/`:
  Existing workflows reused; only minimal extraction if route logic currently violates boundaries.
- Technical or Prisma work expected in `src/lib/`:
  `Result` utility usage and route-support helpers may be tightened; no Prisma access added in `app/`.
- Pure helpers or shared types, if any:
  Result typing and request helper types may be refined.
- Existing modules or patterns to reuse:
  Current refactored CRUD route conventions and `src/types/result.ts`.

## 8. Risks and Edge Cases

- Domain edge cases:
  Legacy payload shapes for admin task actions may surface stricter validation failures.
- Routing or slug edge cases:
  None expected.
- Legacy hotspots touched:
  `admin-task-actions` and `change-requests` route handlers with existing mixed patterns.
- Data integrity or migration concerns:
  Must preserve task lifecycle compatibility and change-request state transitions.
- SEO or canonical risks:
  None.

## 9. Acceptance Criteria

- [ ] `admin-task-actions` route follows thin-controller flow with consistent `Result` response mapping.
- [ ] `change-requests` route has no loose post-validation casts.
- [ ] Error responses for validation/domain failures are explicit and consistent with route conventions.
- [ ] Valid behavior remains backward-compatible.
- [ ] Jest coverage includes both routes’ success and failure branches.

## 10. Open Questions

- Question: Should error envelope normalization be applied only to these two routes, or fully standardized across all admin APIs in a future phase?
- Decision needed from: Maintainer
- Blocking or non-blocking: Non-blocking
