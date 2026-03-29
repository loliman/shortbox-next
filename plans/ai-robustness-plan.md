# Implementation Plan

Use this template after the feature spec is stable and before product code changes begin.

## Document Metadata

- Feature name: AI Robustness Architectures
- Plan identifier: ai-robustness-plan
- Status: Approved
- Related spec: ai-robustness-spec.md
- Authors: Antigravity AI
- Last updated: 2026-03-26

## 1. Summary

Unify and strictly enforce codebase rules to limit AI/LLM hallucination capabilities. This incorporates ESLint automation, strict Yup typing on Request payloads, Jest execution alignment, and the Result pattern for safe Error catching.

## 2. Scope Check

- **In scope**: Route error wrapping (`Result`), Test runner migration (Vitest -> Jest), Layer boundary linter (`eslint-plugin-boundaries`), `process.env` wrapper (`env.ts`), API Route parameters validation (`Yup`).
- **Out of scope**: Product capability expansion.
- **Assumptions carried from the spec**: Next.js route handlers will receive structural rewrites mapping `try/catch` throws to `Result<T>` handlers.

## 3. Proposed File Changes

| Path | Change type | Reason |
|---|---|---|
| `app/api/...` | update | Yup schema validation and Result container parsing. |
| `src/types/result.ts` | add | Container type definition |
| `src/lib/env.ts` | add | Process wrapper |
| `package.json` | update | Adding `eslint-plugin-boundaries` |
| `eslint.config.mjs` | update | Setting rules according to `AGENTS.md` |
| `src/**/*.test.ts` | update | Consolidate Test models exclusively to Jest |

## 4. Layer Placement

- `app/` responsibilities: Receives `request`, parses cleanly with `Yup`, handles API errors via explicit boundary `Result`.
- `src/services/` responsibilities: N/A focus for this change.
- `src/lib/env.ts` responsibilities: Central `process.env` configuration location for App and Worker nodes.

## 5. Implementation Steps

1. Build `src/lib/env.ts` and refactor `process.env` accessors natively.
2. Insert `eslint-plugin-boundaries` to formalize layer strictness.
3. Establish `Result` framework and refactor API Routes step-wise.
4. Finalize the test suite alignment against `testing-baseline.md`.

## 6. Test Plan

- **Jest command**: `npm run test` (must pass 100%)
- **Lint command**: `npm run lint` (must enforce boundaries successfully without cross-layer import errors).

## 7. Validation and Rollout Order

1. Review compilation behavior post `Result` pattern injection.
2. Execute node-level Jest passes.
3. Verify ESLint checks out correctly.

## 8. Risks and Mitigations

- **Risk**: Rewriting `app/api/` payloads misaligns existing frontend shapes.
- **Mitigation**: Base the Yup schemas directly on what is mapped currently with `as Type`.
- **Risk**: Test suite mocking failure through runner misalignment.
- **Mitigation**: Use `ts-jest` specifics strictly, convert `vi.mock` -> `jest.mock`.

## 9. Review Checklist

- [x] File placement follows `AGENTS.md` and documented module boundaries.
- [x] Pages and route handlers remain thin.
- [x] Tests and verification steps are identified before implementation starts.
