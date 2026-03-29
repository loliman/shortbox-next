# Feature Specification: API Refactoring Phase 2

## Document Metadata

- Feature name: API Refactoring Phase 2
- Spec identifier: api-refactoring-phase2-spec
- Status: Draft
- Related plan: api-refactoring-phase2-plan.md
- Related ADRs: ADR 001
- Architecture decision required?: No
- Authors: Antigravity AI
- Last updated: 2026-03-26

## 1. Goal

Continue the AI Robustness Architecture effort by migrating the remaining legacy API routes away from insecure inline casting and ad hoc error handling. The target outcome is that the remaining endpoints validate payloads explicitly with Yup and use the established `Result` pattern consistently.

## 2. Scope

- Refactor `app/api/change-requests/route.ts` to use explicit Yup validation for POST, PATCH, and DELETE bodies.
- Refactor `app/api/admin-task-actions/route.ts` to validate `action` payloads via Yup and align worker-facing calls with the `Result` pattern where needed.
- Refactor `app/api/public-autocomplete/route.ts` to validate request inputs explicitly and return consistent errors on invalid input.

## 3. Non-Goals

- Refactoring UI components that call these routes.
- Changing `src/core/` logic.
- Rewriting the underlying worker mechanisms for `admin-task-actions`.

## 4. User-Visible Behavior

- Entry points: `app/api/change-requests/route.ts`, `app/api/admin-task-actions/route.ts`, and `app/api/public-autocomplete/route.ts`.
- Expected UI or API changes: No intended product-feature changes. Invalid payloads should produce structured 400-style failures more consistently.
- Empty, loading, error, and not-found states: Endpoint consumers should continue to receive the same successful behavior; invalid payloads should fail earlier and more predictably.
- SEO or canonical URL impact: None.

## 5. Domain and Business Rules

- Existing rules that apply: No Prisma access in `app/`; route handlers stay thin; business logic belongs in `src/services/` or `src/lib/`.
- New rules introduced by this feature: The covered endpoints must validate `.json()` payloads explicitly and avoid loose `as Type` casts.
- Rules that must remain unchanged: Existing endpoint semantics, worker behavior, and frontend request contracts must remain backward-compatible unless explicitly approved.

Reference:
- [AGENTS.md](/Users/christian/shortbox/shortbox-next/AGENTS.md)
- [overview.md](/Users/christian/shortbox/shortbox-next/docs/domain/overview.md)
- Relevant ADRs in [docs/adr/](/Users/christian/shortbox/shortbox-next/docs/adr/)

## 6. Affected Routes and Pages

| Route or page | Context (`de` / `us` / admin / api / worker) | Change summary |
|---|---|---|
| `app/api/change-requests/route.ts` | `api` | Replace inline casts with Yup validation and `Result` handling |
| `app/api/admin-task-actions/route.ts` | `api` | Validate action payloads explicitly and align error handling |
| `app/api/public-autocomplete/route.ts` | `api` | Validate public request inputs and return structured failures |

## 7. Architectural Placement Expectations

- Entry points to keep thin in `app/`: Parse request input, validate with Yup, call lib/service helpers, and map results to `NextResponse`.
- UI or presentation changes expected in `src/components/`: None.
- Business logic expected in `src/services/`: Only if route behavior depends on service-level result wrapping or orchestration.
- Technical or Prisma work expected in `src/lib/`: Request-support helpers, write/read wrappers, and route-facing technical plumbing.
- Pure helpers or shared types, if any: Validation helper types or `Result` support types if needed.
- Existing modules or patterns to reuse: Existing refactored route handlers and current `Result`-pattern wrappers from Phase 1.

## 8. Risks and Edge Cases

- Domain edge cases: Stricter validation could unintentionally reject payloads that existing callers rely on.
- Routing or slug edge cases: None expected.
- Legacy hotspots touched: Legacy API handlers and worker-triggering endpoints.
- Data integrity or migration concerns: `admin-task-actions` may require careful handling so worker jobs still receive compatible inputs.
- SEO or canonical risks: None.

## 9. Acceptance Criteria

- [ ] The user-visible behavior matches the goal and scope.
- [ ] Architectural boundaries from `AGENTS.md` are respected.
- [ ] No product behavior outside the defined scope changes.
- [ ] Required routes, metadata, and canonical behavior are handled correctly.
- [ ] Relevant tests are identified.

## 10. Open Questions

- Question: Should the generic `Record<string, unknown>` payload fragments remain loosely typed inside Yup, or should this phase narrow them further?
- Decision needed from: Maintainer
- Blocking or non-blocking: Non-blocking
