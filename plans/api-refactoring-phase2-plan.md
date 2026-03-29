# Implementation Plan: API Refactoring Phase 2

## Document Metadata

- Feature name: API Refactoring Phase 2
- Plan identifier: api-refactoring-phase2-plan
- Status: Draft
- Related spec: api-refactoring-phase2-spec.md
- Authors: Antigravity AI
- Last updated: 2026-03-26

## 1. Summary

Refactor the remaining legacy API route handlers that still rely on inline casting and ad hoc error handling. The implementation will introduce Yup request validation and align route-to-lib/service interactions with the established `Result` pattern while keeping route handlers thin.

## 2. Scope Check

- In scope: `change-requests`, `admin-task-actions`, and `public-autocomplete` route validation and result handling.
- Out of scope: UI changes, `src/core/` refactors, and deep worker rewrites.
- Assumptions carried from the spec: Existing successful request shapes must remain accepted unless there is an explicit reason to tighten them.

## 3. Proposed File Changes

| Path | Change type | Reason |
|---|---|---|
| `app/api/change-requests/route.ts` | update | Replace inline casts with Yup validation and structured `Result` handling |
| `app/api/admin-task-actions/route.ts` | update | Validate action payloads and align error handling with existing patterns |
| `app/api/public-autocomplete/route.ts` | update | Validate public request inputs explicitly |
| `src/lib/server/change-requests-write.ts` | update | Align write wrappers with `Result` if needed |
| `src/lib/server/admin-task-actions-write.ts` | update | Align task action wrappers with `Result` if needed |

## 4. Layer Placement

- `app/` responsibilities: Parse request data, validate with Yup, evaluate session/auth context, call lib/service helpers, and return `NextResponse`.
- `src/components/` responsibilities: None expected.
- `src/services/` responsibilities: Only if route behavior requires service-level orchestration changes.
- `src/lib/` responsibilities: Route-facing write helpers, autocomplete helpers, and result/error plumbing.
- `src/util/` or `src/types/` responsibilities: Shared validation or `Result` support types if needed.
- Areas intentionally left unchanged: Frontend consumers, worker internals unless wrapper changes are required, and product UI behavior.

## 5. Implementation Steps

1. Inspect the underlying write/task helpers to confirm whether they already return `Result` objects.
2. Refactor `app/api/change-requests/route.ts` with Yup schemas and `Result`-aware response handling.
3. Refactor `app/api/admin-task-actions/route.ts` with explicit action schemas and safe result mapping.
4. Refactor `app/api/public-autocomplete/route.ts` with explicit request validation and consistent failure responses.
5. Run lint and tests to verify boundary compliance and behavior parity.

## 6. Test Plan

- Unit tests: Add or update route-focused validation tests for each refactored endpoint.
- Regression tests: Confirm valid payloads that worked before still pass after refactoring.
- Integration or route coverage, if any: Exercise representative success and invalid-payload failure cases for all three routes.
- Lint command: `npm run lint`
- Jest command: `npm test -- --runInBand`

## 7. Validation and Rollout Order

1. Validate the helper/wrapper layer shape before changing route handlers.
2. Refactor and verify each route individually.
3. Run lint and Jest after the full set is complete.

## 8. Risks and Mitigations

- Risk: Tightening payload validation could reject valid existing frontend requests.
- Why it matters: Product flows may break without any intended user-facing change.
- Mitigation: Mirror the current accepted payload structure in Yup and add regression coverage for valid legacy payloads.

- Risk: `admin-task-actions` interacts with worker/task orchestration.
- Why it matters: Small response-shape changes could break task dispatch or admin tooling.
- Mitigation: Keep worker-facing changes minimal and adapt only the lowest necessary wrapper layer.

## 9. Review Checklist

- [ ] File placement follows `AGENTS.md` and documented module boundaries.
- [ ] Pages and route handlers remain thin.
- [ ] No Prisma access is introduced outside `src/lib/`.
- [ ] No unrelated refactor is included.
- [ ] Tests and verification steps are identified before implementation starts.
