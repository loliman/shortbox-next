# Feed Original Story Cover Implementation Plan

## Document Metadata

- Feature name: Feed original story cover fallback
- Plan identifier: `feed-original-story-cover`
- Status: In Progress
- Related spec: [specs/feed-original-story-cover-spec.md](/Users/christian/shortbox/shortbox-next/specs/feed-original-story-cover-spec.md)
- Authors: Codex
- Last updated: 2026-04-14

## 1. Summary

The feed preview pipeline will be extended so preview issues expose enough story relationship data to resolve a fallback cover from the first original story. A shared preview helper will choose between actual cover, original-story substitute, and `nocover`, and both feed card variants will render the same visual indicator for substituted covers.

## 2. Scope Check

- In scope:
  - Feed preview data for original-story cover fallback
  - Shared preview cover selection helper changes
  - Gallery and strip/list preview indicator UI
- Out of scope:
  - Detail-page cover behavior outside preview cards
  - Editor and admin interfaces
  - Story-link model changes
- Assumptions carried from the spec:
  - Story order should follow existing feed story ordering expectations
  - Real issue cover wins over any story-based substitute

## 3. Proposed File Changes

| Path | Change type | Reason |
|---|---|---|
| `specs/feed-original-story-cover-spec.md` | add | Pair implementation with a feature spec |
| `plans/feed-original-story-cover-plan.md` | add | Pair implementation with a concrete plan |
| `src/lib/read/issue-feed-read.ts` | update | Load nested story issue cover data needed for feed preview fallback |
| `src/lib/read/issue-read-shared.ts` | update | Serialize preview story references and cover metadata |
| `src/lib/read/issue-read-shared.test.ts` | update | Cover the preview fallback selection helper |
| `src/components/issue-preview/utils/issuePreviewUtils.ts` | update | Centralize cover selection and cover-source metadata |
| `src/components/issue-preview/IssuePreview.tsx` | update | Render substituted-cover indicator in strip/list view |
| `src/components/issue-preview/IssuePreviewSmall.tsx` | update | Render substituted-cover indicator in gallery view |

## 4. Layer Placement

- `app/` responsibilities:
  - No change
- `src/components/` responsibilities:
  - Render the chosen preview image and substituted-cover indicator
- `src/services/` responsibilities:
  - No new service needed for this scoped feature
- `src/lib/` responsibilities:
  - Read and serialize original-story cover references for preview issues
- `src/util/` or `src/types/` responsibilities:
  - No change expected
- Areas intentionally left unchanged:
  - Detail-page cover widgets, nav tooltip cover logic, editor cover handling

## 5. Implementation Steps

1. Extend feed preview read includes and serialization so stories can expose original-issue cover references in a preview-safe shape.
2. Update preview cover utilities to resolve actual cover, original-story substitute, or `nocover` in one shared helper.
3. Update `IssuePreview` and `IssuePreviewSmall` to show the substituted-cover indicator without changing normal actual-cover rendering.
4. Add or update unit tests for the shared preview cover selection rules.
5. Run lint and targeted Jest verification.

## 6. Test Plan

- Unit tests:
  - `src/lib/read/issue-read-shared.test.ts`
- Regression tests:
  - Preview cover selection behavior for issue cover, story substitute, and empty fallback
- Integration or route coverage, if any:
  - None planned
- Lint command: `npm run lint`
- Jest command: `npm test -- --runInBand src/lib/read/issue-read-shared.test.ts`

## 7. Validation and Rollout Order

1. Verify preview helper tests cover each cover-source branch.
2. Run `npm run lint`.
3. Run targeted Jest tests for preview serialization/selection helpers.
4. Sanity-check both gallery and strip/list cards for visible substituted-cover labeling in code review.

## 8. Risks and Mitigations

- Risk: Story ordering could produce an unstable “first original story.”
- Why it matters: Different cards could show different substitute covers for the same issue set.
- Mitigation: Use explicit story ordering in the preview read include.

- Risk: Components could reimplement domain selection differently.
- Why it matters: Gallery and strip/list views would drift.
- Mitigation: Keep the selection logic in shared preview utilities and pass only the result into UI rendering.

## 9. Review Checklist

- [ ] File placement follows `AGENTS.md` and documented module boundaries.
- [ ] Pages and route handlers remain thin.
- [ ] No Prisma access is introduced outside `src/lib/`.
- [ ] No unrelated refactor is included.
- [ ] Tests and verification steps are identified before implementation starts.
