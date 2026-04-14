# Feed Original Story Cover Specification

## Document Metadata

- Feature name: Feed original story cover fallback
- Spec identifier: `feed-original-story-cover`
- Status: Draft
- Related plan: [plans/feed-original-story-cover-plan.md](/Users/christian/shortbox/shortbox-next/plans/feed-original-story-cover-plan.md)
- Related ADRs: `docs/adr/001-layered-architecture.md`, `docs/adr/002-filter-architecture.md`
- Architecture decision required?: No
- Authors: Codex
- Last updated: 2026-04-14

## 1. Goal

The home and listing feeds currently fall back to `nocover` artwork when an issue has no own cover. Instead, feed cards should use the cover of the first original story when that relationship is available, while clearly marking that the displayed image is not the actual issue cover. If no stories or no original-story cover can be resolved, the existing `nocover` fallback remains in place.

## 2. Scope

- Replace the feed fallback cover selection for both strip/list and gallery preview cards.
- Resolve the first original-story cover from existing story relationships in both `de` and `us` contexts.
- Add a visible feed-only indicator that the image is a substituted original-story cover.
- Preserve existing `nocover` behavior when no suitable story cover exists.

## 3. Non-Goals

- Changing detail pages, navigation tooltips, editor views, or variant tiles.
- Introducing new database fields or changing story linkage rules.
- Reworking feed layout, feed loading, or general image loading behavior.

## 4. User-Visible Behavior

- Entry points: home feed and listing sections that render `IssuePreview` and `IssuePreviewSmall`
- Expected UI or API changes:
  - Feed cards show the issue’s own cover when available.
  - If the issue has no own cover but the first original story points to an issue with a cover, the feed shows that original issue cover.
  - Cards with a substituted original-story cover show a clear visual marker that it is not the actual issue cover.
  - If no story-based replacement can be resolved, the existing `nocover` image is still shown.
- Empty, loading, error, and not-found states:
  - Existing loading placeholders and fetch behavior stay unchanged.
  - No new empty or error state is introduced.
- SEO or canonical URL impact:
  - None.

## 5. Domain and Business Rules

- Existing rules that apply:
  - `de` and `us` are domain scopes, not locales.
  - Cross-scope publication relationships are modeled through stories.
  - Variant story inheritance remains a read-layer concern.
- New rules introduced by this feature:
  - Feed previews may display the cover of the first original story’s issue when the rendered issue has no own cover.
  - Substituted original-story covers must be visually distinguished from actual issue covers.
- Rules that must remain unchanged:
  - Real issue covers always take precedence.
  - `nocover` remains the final fallback when no story-based cover can be resolved.
  - No business rules move into `app/` or component-only parsing helpers.

Reference:
- [AGENTS.md](/Users/christian/shortbox/shortbox-next/AGENTS.md)
- [docs/domain/overview.md](/Users/christian/shortbox/shortbox-next/docs/domain/overview.md)
- [docs/domain/entities.md](/Users/christian/shortbox/shortbox-next/docs/domain/entities.md)

## 6. Affected Routes and Pages

| Route or page | Context (`de` / `us` / admin / api / worker) | Change summary |
|---|---|---|
| `/de` listing feeds | `de` | Use first original-story cover as preview fallback |
| `/us` listing feeds | `us` | Use first original-story cover as preview fallback |
| Detail-page listing sections using preview cards | `de` / `us` | Reuse the same preview fallback behavior |

## 7. Architectural Placement Expectations

- Entry points to keep thin in `app/`: none
- UI or presentation changes expected in `src/components/`:
  - Render the indicator for substituted original-story covers in both preview variants
- Business logic expected in `src/services/`: none expected for this scoped change
- Technical or Prisma work expected in `src/lib/`:
  - Extend feed preview reads/serialization so preview data carries enough original-story cover context
- Pure helpers or shared types, if any:
  - Centralize preview cover decision logic in preview utilities
- Existing modules or patterns to reuse:
  - `src/lib/read/issue-feed-read.ts`
  - `src/lib/read/issue-read-shared.ts`
  - `src/components/issue-preview/utils/issuePreviewUtils.ts`

## 8. Risks and Edge Cases

- Domain edge cases:
  - `de` issues can mix exclusive stories and parent-linked stories.
  - `us` issues can have reprint links instead of cross-scope parent links.
  - Variants may inherit stories from another grouped issue row.
- Routing or slug edge cases:
  - None.
- Legacy hotspots touched:
  - None of the listed high-risk write hotspots.
- Data integrity or migration concerns:
  - The feed must tolerate missing nested story issue or cover data.
- SEO or canonical risks:
  - None.

## 9. Acceptance Criteria

- [ ] Feed preview cards prefer the issue’s own cover when present.
- [ ] Feed preview cards use the first original-story cover when the issue has no own cover and a story relationship provides one.
- [ ] Both gallery and strip/list feed views visibly indicate substituted original-story covers.
- [ ] `nocover` remains the fallback when no story-based cover can be resolved.
- [ ] Architectural boundaries from `AGENTS.md` are respected.
- [ ] Relevant tests cover the preview cover selection rule.

## 10. Open Questions

- Question: Which exact label text is best for the substituted-cover indicator?
- Decision needed from: implementation
- Blocking or non-blocking: non-blocking
