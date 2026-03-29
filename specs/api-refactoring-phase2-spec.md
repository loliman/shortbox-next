# Feature Specification: API Refactoring Phase 2

## Document Metadata

- Feature name: API Refactoring Phase 2
- Spec identifier: api-refactoring-phase2-spec
- Status: Draft
- Related plan: api-refactoring-phase2-plan.md
- Related ADRs: ADR 001
- Authors: Antigravity AI
- Last updated: 2026-03-26

## 1. Goal

Continue and complete the AI Robustness Architecture initiative by migrating the remaining legacy API routes (`change-requests`, `admin-task-actions`, and `public-autocomplete`) away from insecure type casting and plain `try/catch` statements. The routes must be refactored to use explicit `Yup` schema validations and the `Result` pattern container for error handling as defined in the target architecture.

## 2. Scope

- Refactor `app/api/change-requests/route.ts` to use explicit `Yup` validation for POST, PATCH, and DELETE bodies. Update service level calls to return a `Result` if not already returning one, and handle them accordingly.
- Refactor `app/api/admin-task-actions/route.ts` to strictly validate `action` payloads via `Yup`, and use `Result` wrappers for service/worker interactions where applicable.
- Refactor `app/api/public-autocomplete/route.ts` to introduce strict input validation with `Yup` and return consistent errors upon failures.

## 3. Non-Goals

- Refactoring any UI components pointing to these API routes.
- Changing `src/core/` logic.
- Rewriting underlying worker mechanisms for `admin-task-actions`.

## 4. User-Visible Behavior

No functional changes will be visible to the users. The structural integrity of JSON requests will simply be better enforced. An invalid payload sent by a client will result in a structured 400 Bad Request response containing the `Yup.ValidationError` details or a formatted `result.error`.

## 5. Domain and Business Rules

- Maintain rule: "No Prisma access in `app/`". All business logic must reside within `src/services/` and database logic within `src/lib/`. The API thin controllers parse input -> execute service/library action -> handle results.

## 6. Affected Routes and Pages

| Route | Context | Change summary |
|---|---|---|
| `app/api/change-requests/route.ts` | api | Update to Yup body parsing and structured result handling. |
| `app/api/admin-task-actions/route.ts` | api | Introduce explicit valid schemas instead of fallback casting. |
| `app/api/public-autocomplete/route.ts`| api | Secure the open endpoint with boundary validations. |

## 7. Architectural Placement Expectations

- `app/api/*`: Pure validation logic (via Yup), session evaluation, calling domain helpers/write handlers, returning JSON NextResponses. No direct database access or business logic inside the handler.

## 8. Risks and Edge Cases

- **Payload Signature Breaches**: Changing how parameters map might accidentally block correctly formatted frontend queries. Mitigation: Write backwards-compatible Yup schemas mapping precisely the properties previously cast via Typescript inline `as { ... }`.
- **Worker Interactions**: `admin-task-actions` kicks off background jobs. Wrapping them in Result might require modifying the `queueAdminTaskResult` wrapper. Mitigation: Adapt the lowest necessary level carefully and preserve `getWorkerUtils` behavior.

## 9. Acceptance Criteria

- [ ] All designated routes (`change-requests`, `admin-task-actions`, `public-autocomplete`) use `Yup` for `.json()` payload validation.
- [ ] No `as Type` casting is present in the refactored endpoints.
- [ ] All `lint` boundary rules pass correctly without cross-layer logic violations (`npm run lint`).
- [ ] The full `npm test` suite runs entirely without assertion regressions.

## 10. Open Questions

None.
