# Feature Specification: Centralized Runtime Environment Access Completion

## Document Metadata

- Feature name: Centralized Runtime Environment Access Completion
- Spec identifier: finalize-spec-03-env-centralization
- Status: Draft
- Related plan: ai-robustness-plan.md
- Related ADRs: ADR 001, ADR 004
- Architecture decision required?: No
- Authors: OpenAI Codex
- Last updated: 2026-03-29

## 1. Goal

Complete planned runtime environment cleanup by removing remaining direct `process.env` usage in application runtime paths and routing access through `src/lib/env.ts` (or established wrappers), while preserving current behavior.

## 2. Scope

- Identify remaining direct `process.env` reads in runtime application code within plan scope.
- Replace in-scope direct reads with centralized env access via `src/lib/env.ts` patterns.
- Keep script/tooling-only env usage untouched unless explicitly in plan scope.
- Add/update Jest tests for env helper behavior where missing and practical.

## 3. Non-Goals

- Refactoring every repository script to env wrapper usage.
- Changing deployment environment variable names or contract.
- Reworking Prisma/toolchain config unless explicitly required by agreed scope.
- Introducing new runtime configuration systems.

## 4. User-Visible Behavior

- Entry points:
  Runtime env consumers in app/lib/services currently using direct `process.env` in plan scope.
- Expected UI or API changes:
  No intended product behavior change; failures become more centralized/predictable when env values are absent or malformed.
- Empty, loading, error, and not-found states:
  Unchanged except clearer runtime error surfacing through centralized checks.
- SEO or canonical URL impact:
  Must remain unchanged; metadata/sitemap base URL behavior must be preserved.

## 5. Domain and Business Rules

- Existing rules that apply:
  Keep layers clear; runtime technical access belongs in `src/lib/`; no business logic moved into util/components/app.
- New rules introduced by this feature:
  In-scope runtime env access should be centralized, not read ad hoc from route/component code.
- Rules that must remain unchanged:
  Domain behavior, route semantics, and worker behavior for valid configuration.

Reference:
- `AGENTS.md`
- `docs/domain/overview.md`
- `docs/adr/` (ADR 001, ADR 004)
- `docs/workflows/testing-baseline.md`

## 6. Affected Routes and Pages

| Route or page | Context (`de` / `us` / admin / api / worker) | Change summary |
|---|---|---|
| `src/lib/env.ts` and in-scope consumers | `api` | Centralize remaining runtime env reads through shared helper |
| Any touched app/lib/service consumer files | `api` | Replace direct `process.env` with wrapper access while preserving behavior |
| Jest tests for env access behavior | `admin` | Add/update coverage for missing/invalid env handling where feasible |

## 7. Architectural Placement Expectations

- Entry points to keep thin in `app/`:
  Route/page entry points consume already-resolved env helpers rather than direct env reads.
- UI or presentation changes expected in `src/components/`:
  None.
- Business logic expected in `src/services/`:
  No new business rules; only dependency cleanup if services currently read env directly.
- Technical or Prisma work expected in `src/lib/`:
  `src/lib/env.ts` is primary location for runtime env normalization and access.
- Pure helpers or shared types, if any:
  Optional env type refinements for safer typed consumption.
- Existing modules or patterns to reuse:
  Existing env helper conventions and error handling patterns in repo.

## 8. Risks and Edge Cases

- Domain edge cases:
  Missing optional env defaults may currently be implicitly tolerated and could need explicit parity handling.
- Routing or slug edge cases:
  None expected.
- Legacy hotspots touched:
  Env consumers tied to metadata, sitemap, auth, or integrations.
- Data integrity or migration concerns:
  None; configuration-only.
- SEO or canonical risks:
  Incorrect env centralization could alter canonical URL generation if base URL resolution changes.

## 9. Acceptance Criteria

- [ ] Remaining in-scope runtime `process.env` direct reads are replaced with centralized env helper access.
- [ ] Behavior for valid environment configuration is unchanged.
- [ ] Missing/malformed env handling is explicit and consistent with current runtime error strategy.
- [ ] SEO/canonical-related env consumers preserve prior output semantics.
- [ ] Jest coverage exists for key env helper behavior touched by the change.

## 10. Open Questions

- Question: Does final scope include only runtime app code, excluding scripts and Prisma config by default?
- Decision needed from: Maintainer
- Blocking or non-blocking: Blocking for full-repo cleanup, non-blocking for runtime-only completion
