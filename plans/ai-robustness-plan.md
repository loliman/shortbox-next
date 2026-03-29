# Implementation Plan: AI Robustness Architectures

## Document Metadata

- Feature name: AI Robustness Architectures
- Plan identifier: ai-robustness-plan
- Status: Completed
- Related spec: ai-robustness-spec.md
- Authors: Antigravity AI
- Last updated: 2026-03-26

## 1. Summary

Unify and enforce codebase rules to reduce AI and human boundary violations. The implementation focuses on stronger request validation, explicit error/result handling, stricter architectural linting, centralized environment access, and a consistent Jest-based test model.

## 2. Scope Check

- In scope: Route error wrapping with `Result`, test runner migration to Jest, `eslint-plugin-boundaries`, centralized `process.env` access, and Yup validation for API route payloads.
- Out of scope: Product capability expansion and unrelated UI work.
- Assumptions carried from the spec: Route handlers can be refactored incrementally while preserving external behavior.

## 3. Proposed File Changes

| Path | Change type | Reason |
|---|---|---|
| `app/api/...` | update | Validate input with Yup and map `Result` objects cleanly |
| `src/types/result.ts` | add | Define a shared `Result` container |
| `src/lib/env.ts` | add | Centralize environment parsing and validation |
| `package.json` | update | Add and align tooling dependencies |
| `eslint.config.mjs` | update | Enforce architectural boundaries from `AGENTS.md` |
| `src/**/*.test.ts` | update | Consolidate the test runner model around Jest |

## 4. Layer Placement

- `app/` responsibilities: Receive requests, validate payloads, call lib/service helpers, and convert results into responses.
- `src/components/` responsibilities: None expected for this change.
- `src/services/` responsibilities: Minimal; only where business coordination is required for `Result` adoption.
- `src/lib/` responsibilities: Environment access, route-facing technical helpers, and server-side orchestration helpers.
- `src/util/` or `src/types/` responsibilities: Shared `Result` typing and pure helper support.
- Areas intentionally left unchanged: Product UI behavior and most domain workflows.

## 5. Implementation Steps

1. Introduce `src/lib/env.ts` and refactor direct `process.env` access toward it.
2. Add `eslint-plugin-boundaries` and configure layer rules according to `AGENTS.md`.
3. Establish the `Result` pattern and refactor target API routes incrementally.
4. Align the test suite and runner usage around Jest.

## 6. Test Plan

- Unit tests: Update runner-specific tests and add validation-focused coverage where route behavior changes.
- Regression tests: Confirm route payload handling remains backward-compatible for valid requests.
- Integration or route coverage, if any: Validate representative API routes using the new Yup and `Result` flow.
- Lint command: `npm run lint`
- Jest command: `npm test -- --runInBand`

## 7. Validation and Rollout Order

1. Verify compilation and route behavior after `Result` and validation changes.
2. Run Jest and confirm converted tests pass.
3. Run lint and confirm architectural boundary rules behave as expected.

## 8. Risks and Mitigations

- Risk: Rewriting `app/api/` payload handling could misalign existing frontend request shapes.
- Why it matters: Valid client requests could start failing unexpectedly.
- Mitigation: Base Yup schemas on the currently accepted payload structure and preserve behavior for valid requests.

- Risk: Test suite mocking behavior could regress during the Vitest-to-Jest migration.
- Why it matters: Tooling confidence drops if test semantics change unexpectedly.
- Mitigation: Translate mocks deliberately and validate critical suites after conversion.

## 9. Review Checklist

- [x] File placement follows `AGENTS.md` and documented module boundaries.
- [x] Pages and route handlers remain thin.
- [x] No Prisma access is introduced outside `src/lib/`.
- [x] No unrelated refactor is included.
- [x] Tests and verification steps are identified before implementation starts.
