# Feature Specification Template

Use this template for non-trivial feature work before implementation starts.

## Document Metadata

- Feature name:
- Spec identifier:
- Status: Draft | Approved | Superseded
- Related plan:
- Related ADRs:
- Architecture decision required?: Yes | No
- Authors:
- Last updated:

## 1. Goal

Describe the problem to solve and the intended outcome.
Keep this to 2-4 sentences so the feature intent stays easy to scan.

## 2. Scope

List what is included in this feature.
Prefer concrete behavior and affected surfaces over implementation detail.

## 3. Non-Goals

List what is intentionally out of scope for this change.

## 4. User-Visible Behavior

Describe the expected behavior from the user's perspective.
Focus on observable outcomes, not internal implementation.

- Entry points:
- Expected UI or API changes:
- Empty, loading, error, and not-found states:
- SEO or canonical URL impact:

## 5. Domain and Business Rules

Capture the domain rules that must be preserved or introduced.

- Existing rules that apply:
- New rules introduced by this feature:
- Rules that must remain unchanged:

Reference:
- [AGENTS.md](/Users/christian.riese/Documents/shortbox/shortbox-next/AGENTS.md)
- [docs/domain/overview.md](/Users/christian.riese/Documents/shortbox/shortbox-next/docs/domain/overview.md)
- Relevant ADRs in [docs/adr/](/Users/christian.riese/Documents/shortbox/shortbox-next/docs/adr/)

## 6. Affected Routes and Pages

List all affected entry points, including route context.

| Route or page | Context (`de` / `us` / admin / api / worker) | Change summary |
|---|---|---|
| Example: `/de/publisher/[slug]` | `de` | Add new read-only sidebar section |

## 7. Architectural Placement Expectations

State where the work belongs before implementation begins.

- Entry points to keep thin in `app/`:
- UI or presentation changes expected in `src/components/`:
- Business logic expected in `src/services/`:
- Technical or Prisma work expected in `src/lib/`:
- Pure helpers or shared types, if any:
- Existing modules or patterns to reuse:

## 8. Risks and Edge Cases

Call out the cases most likely to cause regressions or ambiguity.

- Domain edge cases:
- Routing or slug edge cases:
- Legacy hotspots touched:
- Data integrity or migration concerns:
- SEO or canonical risks:

## 9. Acceptance Criteria

Write concrete statements that can be verified during implementation and review.
Use statements that a reviewer or coding agent can check without interpretation.

- [ ] The user-visible behavior matches the goal and scope.
- [ ] Architectural boundaries from `AGENTS.md` are respected.
- [ ] No product behavior outside the defined scope changes.
- [ ] Required routes, metadata, and canonical behavior are handled correctly.
- [ ] Relevant tests are identified.

## 10. Open Questions

Capture unresolved items that must be answered before implementation or review.

- Question:
- Decision needed from:
- Blocking or non-blocking:
