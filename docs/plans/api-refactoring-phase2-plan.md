# Implementation Plan: API Refactoring Phase 2

## Document Metadata

- Feature name: API Refactoring Phase 2
- Plan identifier: api-refactoring-phase2-plan
- Status: Proposed / Needs Approval
- Related spec: api-refactoring-phase2-spec.md
- Authors: Antigravity AI
- Last updated: 2026-03-26

## 1. Summary

This plan outlines the exact changes necessary to refactor the final remaining Next.js route handlers (`change-requests`, `admin-task-actions`, and `public-autocomplete`). The routes currently rely on `as Type` inline casting and naive error throwing. We will introduce `Yup` object schema validations and the established `Result` pattern to ensure structural robustness and align with the existing refactored endpoints (e.g., `issues`).

## User Review Required

> [!IMPORTANT]  
> Please review this plan, specifically the proposed schemas and validation rules mapped out for the API paths, to ensure they match frontend expectations. Once you approve, I will begin the implementation.

## 2. Proposed Changes

### `app/api/change-requests/route.ts`

- **[MODIFY]** `app/api/change-requests/route.ts`
  - **Change**: Introduce `Yup.object` schemas to replace `as { issue?: Record<string, unknown>; item?: Record<string, unknown>; }`.
  - **Change**: Evaluate the methods (`createIssueChangeRequest`, `discardChangeRequestById`, `acceptChangeRequestById`) to use `Result` returns (if they don't already do so) and map `result.success` appropriately.
  - **Reason**: Thin controllers should confidently pass strictly validated structures downwards.

### `app/api/admin-task-actions/route.ts`

- **[MODIFY]** `app/api/admin-task-actions/route.ts`
  - **Change**: Implement `Yup` to replace `as { action?: "run" | "release-locks"; input?: Record<string, unknown>; }`.
  - **Change**: Implement `Result` evaluations for the `queueAdminTaskResult` wrapper.
  - **Reason**: High-risk task invocation demands strict payload boundaries.

### `app/api/public-autocomplete/route.ts`

- **[MODIFY]** `app/api/public-autocomplete/route.ts`
  - **Change**: Introduce a literal schema for `source` mapping (`"publishers" | "series" | ...`) and validate offset/limits strongly as numbers.
  - **Reason**: Security and crash prevention on loose public endpoints.

### `src/lib/server/change-requests-write.ts` / `src/lib/server/admin-task-actions-write.ts` (If necessary)

- **[MODIFY]** (Conditional)
  - **Change**: If those underlying writes strictly throw right now instead of returning `{ success: boolean, data?: T, error?: string }`, rewrite their wrappers to match the `Result` signature implemented elsewhere during Phase 1. 

## 3. Layer Placement

- *UI/App (Next.js)*: Receives input, runs Yup validation, calls library functions. Handles the `result.error` mapping directly via `NextResponse`.
- *Library/Services (src/lib)*: Emits standardized `Result` objects containing either successful data or explicit error strings, avoiding bubbling native Unhandled Promise Rejections.

## 4. Implementation Steps

1. Analyze `src/lib/server/change-requests-write.ts` to ensure the write mechanisms emit `Result` types. Refactor if needed.
2. Inject Yup rules and `Result` handling in `app/api/change-requests/route.ts`.
3. Create strict Yup rules and sanitize `app/api/admin-task-actions/route.ts`.
4. Validate inputs on `app/api/public-autocomplete/route.ts`.
5. Run validations via the `npm run lint` boundary check to ensure no regression and verify all existing tests (`npm test`).

## 5. Verification Plan

### Automated Tests
- command: `npm run lint` - Expect 0 boundary regressions or ESLint errors.
- command: `npm test` - Expect matching node-only Jest test passing baseline.

### Manual Verification
- Manual code review of the returned structures. Wait for the user to request a live frontend run if required.

## 6. Open Questions

- Should we strictly enforce the shapes inside `Record<string, unknown>` for variables, or leave it as `mixed` in Yup? The current structure accepts them blindly, we will leave them essentially untyped inside the generic Record unless strictly required.
