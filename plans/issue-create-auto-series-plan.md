# Issue Create Auto Series Plan

Spec: [specs/issue-create-auto-series-spec.md](/Users/christian/shortbox/shortbox-next/specs/issue-create-auto-series-spec.md)

## Files
- update `src/lib/server/issues-write.ts`
- update `app/api/issues/route.ts`
- update `src/components/restricted/editor/IssueEditor.tsx`
- add a small editor-side message helper and test

## Steps
1. Extend the issue write path so series lookup returns both the resolved series and whether it had to be created.
2. Preserve the existing auto-create behavior, but expose explicit response metadata for create, copy-batch, and edit saves.
3. Keep the API route thin and forward the returned metadata in the POST and PATCH responses.
4. Add a small presentation helper that builds the success snackbar text from the saved issue result and optional auto-series metadata.
5. Update the issue editor to use that helper for single-save and batch-save confirmation.
6. Run lint and targeted Jest checks for the new pure helper.

## Verification
- `npm run lint`
- `npm test -- src/components/restricted/editor/issue-editor/saveFeedback.test.ts`

## Risk Mitigation
- do not move write logic out of `src/lib/server/`
- do not infer created-series state from editor inputs
- keep the response contract additive by using optional `meta`
