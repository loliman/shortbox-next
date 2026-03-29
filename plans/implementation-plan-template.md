# Implementation Plan Template

Use this template after the feature spec is stable and before product code changes begin.

## Document Metadata

- Feature name:
- Plan identifier:
- Status: Draft | In Progress | Completed | Superseded
- Related spec:
- Authors:
- Last updated:

## 1. Summary

Summarize the implementation approach in a few sentences.
Describe the intended change shape, not the full spec again.

## 2. Scope Check

- In scope:
- Out of scope:
- Assumptions carried from the spec:

## 3. Proposed File Changes

List only the files or modules expected to change.
Keep this focused on the most likely edits before implementation starts.

| Path | Change type | Reason |
|---|---|---|
| `app/...` | update | Keep page thin and delegate |
| `src/services/...` | add/update | Business rule placement |

Change types:
- `add`
- `update`
- `delete` only if explicitly approved

## 4. Layer Placement

Explain where each concern will live and why.

- `app/` responsibilities:
- `src/components/` responsibilities:
- `src/services/` responsibilities:
- `src/lib/` responsibilities:
- `src/util/` or `src/types/` responsibilities:
- Areas intentionally left unchanged:

## 5. Implementation Steps

Describe the smallest safe sequence of work.
Prefer incremental steps that can be implemented and verified independently.

1. 
2. 
3. 

## 6. Test Plan

List the tests to add or update and the commands to run.

- Unit tests:
- Regression tests:
- Integration or route coverage, if any:
- Lint command: `npm run lint`
- Jest command: `npm test -- --runInBand`

## 7. Validation and Rollout Order

List the order in which validation should happen before review or merge.

1. 
2. 
3. 

## 8. Risks and Mitigations

- Risk:
- Why it matters:
- Mitigation:

## 9. Review Checklist

- [ ] File placement follows `AGENTS.md` and documented module boundaries.
- [ ] Pages and route handlers remain thin.
- [ ] No Prisma access is introduced outside `src/lib/`.
- [ ] No unrelated refactor is included.
- [ ] Tests and verification steps are identified before implementation starts.
