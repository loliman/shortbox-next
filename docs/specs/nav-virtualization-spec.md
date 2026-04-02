# Nav Virtualization Spec

## Goal

Keep the catalog navigation usable for large publishers and large issue branches by adaptively windowing oversized branch lists while preserving selection reveal and navigation state.

## Scope

- add adaptive windowing/occlusion for large navigation branch lists
- preserve current expand/collapse behavior and selected-row reveal semantics
- target large publisher-to-series and series-to-issues branches first
- keep small lists on the existing simple render path

## Non-Goals

- redesigning the navigation tree
- changing route semantics, navigation APIs, or metadata behavior
- replacing the navigation drawer or the overall catalog shell structure

## User-Visible Behavior

- very large publishers such as Marvel should expand much faster
- deep links should still reveal the selected series or issue
- small publishers and short issue lists should behave as before
- deep-link reveal should not make the large-list environment around the selected row look half empty while rows are still painting

## Architectural Placement

- branch windowing remains UI infrastructure inside `src/components/nav-bar/`
- any threshold or row-shaping helpers should stay presentation-focused and pure
- no business logic moves into the nav layer

## Risks

- scroll-to-selected can regress if selected rows are not rendered early enough
- progressive branch rendering can make deep selections appear a little later if not prioritized
- aggressive occlusion can make deep-link reveal look visually incomplete if rows near the selection are still skipped
- overusing windowing on small lists can add complexity without benefit

## Acceptance Criteria

- large series branches render noticeably less DOM work on expand
- selected row reveal still works for deep links and explicit “jump to selection”
- small lists keep the non-virtualized path
- `npm run build` succeeds
- `npm run test:a11y:pa11y` continues to pass
