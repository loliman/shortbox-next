# Feature Specification: Plan Follow-up Completion

## Document Metadata

- Feature name: Plan Follow-up Completion
- Spec identifier: plan-followup-spec
- Status: Draft
- Related plan:
- Related ADRs: ADR 001, ADR 004
- Architecture decision required?: No
- Authors: OpenAI Codex
- Last updated: 2026-03-29

## 1. Goal

Close the remaining gaps between the documented plans and the current repository state. This work should bring the codebase in line with the completed and in-progress plan commitments around validation, result handling, environment access, lint stability, and Jest-based verification.

## 2. Scope

- Finish the remaining open items from `ai-robustness-plan.md`.
- Finish the remaining open items from `api-refactoring-phase2-plan.md`.
- Make `npm run lint` pass reliably with the intended architectural boundary rules.
- Make `npm test -- --runInBand` pass fully under Jest.
- Remove remaining direct `process.env` usage from runtime application code where the plans expect centralized environment access.
- Complete the remaining route validation and `Result`-pattern cleanup in the targeted API routes.
- Audit `app/api/auth/login/route.ts` and include concrete refactoring work only if an unresolved robustness-plan follow-up is still present there after repository inspection.
- Convert or migrate only those non-Jest tests that are part of the active baseline/CI path or are required to make the Jest baseline pass reliably.

## 3. Non-Goals

- Introducing new product features.
- Rewriting unrelated domain workflows.
- Performing large architectural moves across layers in one step.
- Replacing the spec or plan templates.
- Refactoring all API routes beyond the plan-driven scope unless required for parity with the documented architecture.
- Repository-wide cleanup of build, tooling, or standalone script `process.env` usage outside the runtime application scope.
- Repository-wide migration of every remaining non-Jest test regardless of whether it affects the current Jest baseline.
- Forcing `app/api/auth/login/route.ts` changes if the repository audit shows that route is already aligned with the documented plan scope.

## 4. User-Visible Behavior

- Entry points:
  `app/api/change-requests/route.ts`, `app/api/admin-task-actions/route.ts`, `app/api/public-autocomplete/route.ts`, conditional follow-up in `app/api/auth/login/route.ts`, selected runtime env consumers, repo linting, and Jest test execution.
- Expected UI or API changes:
  No intentional product feature changes. Invalid API payloads should fail in a more explicit and consistent way, and repository tooling should become reliable again.
- Empty, loading, error, and not-found states:
  Existing UI behavior should remain unchanged. API error responses should be more predictable where validation is tightened.
- SEO or canonical URL impact:
  None expected, but runtime env centralization must preserve current metadata, canonical, sitemap, and robots output semantics.

## 5. Domain and Business Rules

- Existing rules that apply:
  `app/` stays thin, Prisma access remains in `src/lib/`, business workflows stay out of route handlers and components, and `de`/`us` remain domain contexts rather than locale translations.
- New rules introduced by this feature:
  The planned validation, environment, and testing boundaries should be enforced consistently enough that the documented workflow is true in practice.
- Rules that must remain unchanged:
  Endpoint semantics for valid requests, catalog behavior, routing behavior, and worker task behavior must remain backward-compatible unless explicitly approved otherwise.

Reference:
- [AGENTS.md](/Users/christian/shortbox/shortbox-next/AGENTS.md)
- [overview.md](/Users/christian/shortbox/shortbox-next/docs/domain/overview.md)
- Relevant ADRs in [docs/adr/](/Users/christian/shortbox/shortbox-next/docs/adr/)

## 6. Affected Routes and Pages

| Route or page | Context (`de` / `us` / admin / api / worker) | Change summary |
|---|---|---|
| `app/api/change-requests/route.ts` | `api` | Remove remaining loose casts after Yup validation |
| `app/api/admin-task-actions/route.ts` | `api` | Finish thin-controller alignment and result handling cleanup |
| `app/api/public-autocomplete/route.ts` | `api` | Remove remaining casts and make invalid input handling explicit |
| `app/api/auth/login/route.ts` | `api` | Audit and refactor only if unresolved robustness-plan follow-up remains |
| Runtime `src/lib/env.ts` consumers | `api` | Replace remaining direct `process.env` access where planned |
| `eslint.config.mjs` | `admin` | Fix resolver and ignore configuration so lint reflects intended boundaries |
| Active Jest baseline test files | `admin` | Convert or adjust only the tests required for a reliable Jest baseline |

## 7. Architectural Placement Expectations

- Entry points to keep thin in `app/`:
  Route handlers should parse request input, validate with Yup, call lib/service helpers, and return responses without inline business logic.
- UI or presentation changes expected in `src/components/`:
  None expected, except test adjustments where existing component tests currently violate the Jest-only target model and are part of the active baseline.
- Business logic expected in `src/services/`:
  Only minimal follow-up changes if environment access or workflow coordination still lives in the wrong place.
- Technical or Prisma work expected in `src/lib/`:
  `Result` wrappers, environment access, route-support helpers, worker utility integration, and lint-supporting boundary cleanup.
- Pure helpers or shared types, if any:
  Shared request helper typing, `Result` support types, and test helper cleanup.
- Existing modules or patterns to reuse:
  `src/types/result.ts`, existing refactored CRUD routes, `src/lib/env.ts`, `docs/workflows/testing-baseline.md`, and the layer guidance in `AGENTS.md`.

## 8. Risks and Edge Cases

- Domain edge cases:
  Tightening validation may reject payloads that legacy callers still send.
- Routing or slug edge cases:
  None expected if the work stays within API and runtime/tooling baseline scope.
- Legacy hotspots touched:
  Lint configuration, route handlers, auth input handling, worker task orchestration, runtime environment consumers, and active Jest baseline tests.
- Data integrity or migration concerns:
  `admin-task-actions` and worker-related code paths must remain compatible with current task payloads and job lifecycle handling.
- SEO or canonical risks:
  Runtime env refactors must not break metadata or sitemap base URL resolution.
- Test baseline risks:
  Narrowing work to active baseline paths must still leave `npm test -- --runInBand` as a truthful repository health signal for the agreed scope.

## 9. Acceptance Criteria

- [ ] The user-visible behavior matches the goal and scope.
- [ ] Architectural boundaries from `AGENTS.md` are respected.
- [ ] No product behavior outside the defined scope changes.
- [ ] Runtime application `process.env` cleanup is completed for the agreed plan scope without pulling in unrelated script/tooling work.
- [ ] `app/api/auth/login/route.ts` is either refactored because audit confirmed a remaining gap, or explicitly left unchanged because no remaining in-scope gap exists.
- [ ] Only the non-Jest tests required for the active Jest baseline are migrated or adjusted, and `npm test -- --runInBand` passes reliably.
- [ ] `npm run lint` passes with the intended architectural boundary checks enabled.
- [ ] Required routes, metadata, and canonical behavior are handled correctly.

## 10. Clarified Planning Decisions

- `process.env` cleanup is limited to runtime application code covered by the plans. Build/tooling/script contexts such as `next.config.*`, Prisma config, and standalone scripts are out of scope unless required to unblock the agreed runtime baseline.
- `app/api/auth/login/route.ts` should only receive concrete follow-up work if repository audit confirms an unresolved robustness-plan item still exists there.
- Non-Jest test migration is limited to files that are part of the active baseline/CI path or are necessary to make the Jest baseline pass reliably. Full repository-wide migration is out of scope for this finalize pass.
