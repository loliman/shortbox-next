# Feature Specification: Route Validation Tightening for Public and Auth APIs

## Document Metadata

- Feature name: Route Validation Tightening for Public and Auth APIs
- Spec identifier: finalize-spec-01-route-validation
- Status: Draft
- Related plan: ai-robustness-plan.md
- Related ADRs: ADR 001, ADR 004
- Architecture decision required?: No
- Authors: OpenAI Codex
- Last updated: 2026-03-29

## 1. Goal

Complete the remaining input-validation and unsafe-cast cleanup in targeted public/auth API handlers so invalid payloads are rejected explicitly and handler logic stays thin and typed.

## 2. Scope

- Update `app/api/public-autocomplete/route.ts` to remove loose request casts after validation.
- Update `app/api/auth/login/route.ts` request parsing/casting only where required by robustness-plan commitments.
- Ensure validation failures return predictable API responses aligned with existing route conventions.
- Add or update Jest route tests covering invalid payload and happy-path parity for these endpoints.

## 3. Non-Goals

- Changing endpoint business semantics for valid payloads.
- Refactoring unrelated auth/session internals.
- Broad API framework migration or replacing Yup.
- Touching admin-task or change-request routes (handled in separate specs).

## 4. User-Visible Behavior

- Entry points:
  `app/api/public-autocomplete/route.ts`, `app/api/auth/login/route.ts`
- Expected UI or API changes:
  Invalid or malformed payloads fail consistently and explicitly; successful requests behave as before.
- Empty, loading, error, and not-found states:
  Existing client behavior remains unchanged; only validation error consistency improves.
- SEO or canonical URL impact:
  None.

## 5. Domain and Business Rules

- Existing rules that apply:
  Route handlers stay thin; business logic remains in service/lib layers; Prisma is not accessed in `app/`.
- New rules introduced by this feature:
  Request payloads must be validated before typed consumption, and post-validation code avoids `as`-based loose casting in targeted handlers.
- Rules that must remain unchanged:
  Auth outcomes, autocomplete domain matching behavior, and response semantics for valid input.

Reference:
- `AGENTS.md`
- `docs/domain/overview.md`
- `docs/adr/` (ADR 001, ADR 004)
- `docs/workflows/testing-baseline.md`

## 6. Affected Routes and Pages

| Route or page | Context (`de` / `us` / admin / api / worker) | Change summary |
|---|---|---|
| `app/api/public-autocomplete/route.ts` | `api` | Replace remaining loose casts with validated typed payload flow |
| `app/api/auth/login/route.ts` | `api` | Align request parsing/validation with robustness-plan expectations |
| Jest route tests for above handlers | `admin` | Add invalid-input and success-path coverage under Jest |

## 7. Architectural Placement Expectations

- Entry points to keep thin in `app/`:
  Parse request body/query, validate with Yup, delegate to existing helpers/services, return response.
- UI or presentation changes expected in `src/components/`:
  None.
- Business logic expected in `src/services/`:
  Reuse existing services only; no new workflow logic unless strictly required for parity.
- Technical or Prisma work expected in `src/lib/`:
  Optional extraction of request/validation helpers if needed; no new Prisma access in route handlers.
- Pure helpers or shared types, if any:
  Request DTO/result typing refinements to avoid unsafe casts.
- Existing modules or patterns to reuse:
  Existing refactored API route patterns using Yup + `Result` style responses.

## 8. Risks and Edge Cases

- Domain edge cases:
  Legacy callers sending loosely shaped payloads may now receive deterministic validation errors.
- Routing or slug edge cases:
  None expected.
- Legacy hotspots touched:
  Auth route input handling and public autocomplete input parsing.
- Data integrity or migration concerns:
  None.
- SEO or canonical risks:
  None.

## 9. Acceptance Criteria

- [ ] `public-autocomplete` route has no remaining loose post-validation casts.
- [ ] `auth/login` route parsing/casting is aligned with robustness-plan scope.
- [ ] Invalid input responses are explicit and consistent with existing API conventions.
- [ ] Valid-request behavior remains backward-compatible.
- [ ] Jest tests cover invalid and success scenarios for the touched routes.

## 10. Open Questions

- Question: Should login route validation include stricter normalization (trim/case rules) now, or remain parity-only?
- Decision needed from: Maintainer
- Blocking or non-blocking: Non-blocking
