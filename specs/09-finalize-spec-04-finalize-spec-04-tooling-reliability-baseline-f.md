# Feature Specification: Tooling Reliability Baseline for ESLint and Jest

## Document Metadata

- Feature name: Tooling Reliability Baseline for ESLint and Jest
- Spec identifier: finalize-spec-04-tooling-baseline
- Status: Draft
- Related plan: ai-robustness-plan.md; api-refactoring-phase2-plan.md
- Related ADRs: ADR 001, ADR 004
- Architecture decision required?: No
- Authors: OpenAI Codex
- Last updated: 2026-03-29

## 1. Goal

Restore a reliable repository verification baseline by making `npm run lint` and `npm test -- --runInBand` pass under intended boundary rules and Jest-only testing expectations.

## 2. Scope

- Fix `eslint.config.mjs` resolver/ignore configuration issues that currently prevent reliable lint execution.
- Align lint checks with architectural boundaries defined in `AGENTS.md` (without broad unrelated policy expansion).
- Convert or remove stray non-Jest test artifacts blocking Jest-only baseline.
- Add/fix minimal Jest route/tooling coverage required by plan commitments.
- Ensure `npm run lint` and `npm test -- --runInBand` both pass in repository baseline.

## 3. Non-Goals

- Introducing new lint rule regimes unrelated to current failures.
- Migrating to a different test runner.
- Refactoring unrelated failing tests outside plan-driven scope.
- Large-scale style cleanup unrelated to baseline pass criteria.

## 4. User-Visible Behavior

- Entry points:
  `eslint.config.mjs`, Jest test files, route/tooling test setup.
- Expected UI or API changes:
  None intended; change is developer-facing reliability.
- Empty, loading, error, and not-found states:
  Not applicable.
- SEO or canonical URL impact:
  None.

## 5. Domain and Business Rules

- Existing rules that apply:
  Architectural layer boundaries remain authoritative; `app/` stays thin; Prisma access remains in `src/lib/`.
- New rules introduced by this feature:
  Baseline lint/test commands must be trustworthy indicators of repository health for current plan scope.
- Rules that must remain unchanged:
  Product runtime behavior and API semantics for valid requests.

Reference:
- `AGENTS.md`
- `docs/domain/overview.md`
- `docs/adr/` (ADR 001, ADR 004)
- `docs/workflows/testing-baseline.md`

## 6. Affected Routes and Pages

| Route or page | Context (`de` / `us` / admin / api / worker) | Change summary |
|---|---|---|
| `eslint.config.mjs` | `admin` | Correct resolver/ignore settings for intended boundary linting |
| Jest config/setup and affected test files | `admin` | Ensure Jest-only test compatibility and baseline stability |
| Targeted route/tooling tests | `admin` | Add/fix coverage needed to support refactor and validation work |

## 7. Architectural Placement Expectations

- Entry points to keep thin in `app/`:
  No runtime route logic expansion in this spec; only test/lint reliability updates.
- UI or presentation changes expected in `src/components/`:
  None, except potential test harness adjustments.
- Business logic expected in `src/services/`:
  None, unless required to fix test type wiring for existing behavior.
- Technical or Prisma work expected in `src/lib/`:
  None expected beyond test support utilities if needed.
- Pure helpers or shared types, if any:
  Test helper typing cleanup as needed for Jest compatibility.
- Existing modules or patterns to reuse:
  Existing Jest conventions and route test patterns in repository.

## 8. Risks and Edge Cases

- Domain edge cases:
  None directly.
- Routing or slug edge cases:
  None directly.
- Legacy hotspots touched:
  Lint config and older test artifacts with mixed runner assumptions.
- Data integrity or migration concerns:
  None.
- SEO or canonical risks:
  None.

## 9. Acceptance Criteria

- [ ] `npm run lint` succeeds with intended boundary checks enabled.
- [ ] `npm test -- --runInBand` passes fully under Jest.
- [ ] Stray non-Jest test artifacts are converted/removed from active test surface.
- [ ] Added/updated tests cover the route/tooling cases required by the plans.
- [ ] No unrelated product behavior changes are introduced.

## 10. Open Questions

- Question: Should lint baseline explicitly ignore generated/legacy directories now, or should those be fixed in place to preserve strictness?
- Decision needed from: Maintainer
- Blocking or non-blocking: Non-blocking
