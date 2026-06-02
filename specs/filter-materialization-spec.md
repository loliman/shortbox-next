# Filter Materialization Specification

## Document Metadata

- Feature name: Filter materialization and group-aware uncollected query
- Spec identifier: `spec-filter-materialization-v1`
- Status: Draft
- Related plan: `plans/filter-materialization-plan.md` (to be authored)
- Related ADRs: ADR 002 (filter architecture) is the closest relative; this spec proposes changes to the technical layer described there. A short follow-up ADR may be warranted.
- Architecture decision required?: Yes
- Authors: Claude, Christian
- Last updated: 2026-06-02

## 1. Goal

The catalog filter has two execution paths: a fast Prisma `WHERE` path and a fallback that loads every matching issue with its full story graph and applies JavaScript predicates in memory. Any non-trivial filter combination (every print-flag pair, `numbers`, `genres`, `individuals`, `onlyNotCollectedNoOwnedVariants`) drops into the fallback, which makes counts approximate, pagination effectively app-side, and response time unbounded for large result sets. This feature materializes the small set of denormalized facts needed to keep all but one filter on the SQL path, normalizes the genre CSV that blocks indexed genre queries, and replaces the post-fetch ownership-deduplication with a single anti-join query so the fallback path becomes dead code.

## 2. Scope

- Add eight aggregate boolean columns to `Issue` that mirror the eight print-flag predicate pairs the JS filter currently evaluates over each issue's story graph.
- Denormalize the publisher reference onto `Issue` as `fk_publisher` so publisher filters skip the `issue → series → publisher` join.
- Introduce a `SeriesGenre` join table that replaces the CSV-in-string `Series.genre` semantics for filtering purposes, while leaving `Series.genre` in place as the human-edited source.
- Replace `onlyNotCollectedNoOwnedVariants` with a single Postgres query that combines an anti-join on `(fk_series, number)` ownership with a `DISTINCT ON` representative selection by format rank.
- Extend the existing `update-story-badges` admin task (worker name and registry entry to be reviewed for naming consistency) so the same per-issue recomputation pass also writes the new Issue-level aggregates and `fk_publisher`.
- Extend the existing `update-de-series-genres` admin task so the same pass that updates `Series.genre` rewrites the corresponding `SeriesGenre` rows.
- Update `src/lib/read/filter-read.ts` to route the filters covered above through the direct Prisma path, including the new aggregate columns.
- Add `number_numeric` and `legacy_number_numeric` as Postgres `GENERATED ALWAYS AS ... STORED` columns on `shortbox.issue` so the `numbers` filter can do numeric range comparisons in SQL without owning a second source of truth.
- Migrate the `numbers` and `individuals` filters onto the direct Prisma path (via the generated columns and nested `WhereInput` respectively), eliminating the last two remaining JS-predicate paths.
- Delete `src/lib/read/filter-service.ts` and `src/lib/read/filter-service-read.ts` once nothing routes through the JS-predicate fallback.
- Provide a one-time backfill story: running each extended admin task once after migration fills the new columns and the new table. The generated columns require no backfill.

## 3. Non-Goals

- No change to user-visible filter UI form fields or query-parameter syntax. All currently exposed filter switches keep their names and semantics.
- No change to the underlying Story-level flags (`firstApp`, `onlyApp`, `otherOnlyTb`, `onlyOnePrint`) or to how they are computed in `story-filter-write.ts`. They remain the source of truth from which Issue-level aggregates derive.
- No change to the domain rule that arcs, appearances, individuals, and similar relations live on the original story and are inherited by reprints and variants through the story graph. Those filters are not materialized.
- The `Issue.number` column itself remains alphanumeric (domain rule). Two Postgres `GENERATED ALWAYS AS ... STORED` columns (`number_numeric`, `legacy_number_numeric`) are added as SQL-side projections that hold the numeric value when the source parses cleanly as a number and `NULL` otherwise. These are derived views, not authoritative storage, and unblock numeric range comparisons in SQL while preserving the alphanumeric source-of-truth.
- No new admin task, no new worker entrypoint. All maintenance reuses the existing two tasks named above.
- No change to the AI assistant feature surface. That work is downstream and is the consumer of the simpler filter shape this spec produces.
- No change to the editor write paths in `src/lib/server/issues-write.ts`. Sync remains task-driven, consistent with current practice.

## 4. User-Visible Behavior

- Entry points:
  - Public catalog filter pages and the filter form, in both `de` and `us` contexts. No new entry points.
  - Admin task launcher, where the two existing admin tasks gain additional work behind their existing labels.
- Expected UI or API changes:
  - None for catalog users. The same filter combinations return the same issues. Counts, pagination, and result ordering visible to the user must remain unchanged.
  - The two extended admin tasks return additional fields in their result summary so an operator can see how many issues and how many genre rows were updated. Their public names in the admin UI do not change.
- Empty, loading, error, and not-found states:
  - Unchanged for all catalog pages.
  - Admin tasks continue to use the existing `persistTaskResult` reporting; failures stay structurally identical to today.
- SEO or canonical URL impact:
  - None expected. Filter URLs, sitemap, and metadata are unaffected. Behavior parity is an explicit acceptance criterion below.

## 5. Domain and Business Rules

- Existing rules that apply:
  - `de` and `us` are domain contexts, not locales.
  - Story-level facts (arcs, appearances, individuals, story-flag booleans) live on the original story and are inherited by reprints and variants through the story graph.
  - `Issue.collected` is a per-issue attribute; ownership of *material* is a property of the `(fkSeries, number)` group.
  - All Prisma access stays inside `src/lib/`. Read paths sit under `src/lib/read/`, write paths under `src/lib/server/`. No business logic moves into `app/` or `src/components/`.
  - The filter pipeline remains the single source of truth for catalog filter semantics. The materialized columns are derived caches, not authoritative new state.
- New rules introduced by this feature:
  - Issue-level aggregate columns (`has_first_print`, `has_only_print`, `has_only_tb`, `has_exclusive_story`, `is_reprint_only`, `has_other_only_tb`, `has_print_story`, `has_only_one_print`) and the denormalized `fk_publisher` are derived facts. They must agree with the underlying story graph and series-publisher relationship after every successful admin task run.
  - Aggregate semantics for the eight pairs:
    - `has_first_print` is true when at least one story in the issue has `firstApp = true`.
    - `has_only_print` is true when at least one story has `onlyApp = true`.
    - `has_only_tb` is true when at least one story has `onlyTb = true`.
    - `has_exclusive_story` is true when at least one story has no parent.
    - `is_reprint_only` is true when the issue has at least one story and every story has `firstApp = false`.
    - `has_other_only_tb` is true when at least one story has `otherOnlyTb = true`.
    - `has_print_story` is true when at least one story has `firstApp = true` or `onlyApp = true`.
    - `has_only_one_print` is true when at least one story has `onlyOnePrint = true`.
  - Filter switches map to these columns by exact-match equality. The positive switch (`firstPrint`, `onlyPrint`, `onlyTb`, `exclusive`, `reprint`, `otherOnlyTb`, `notNoPrint`, `onlyOnePrint`) matches issues where the corresponding column is `true`. The negation switch (`notFirstPrint`, `notOnlyPrint`, `notOnlyTb`, `notExclusive`, `notReprint`, `notOtherOnlyTb`, `noPrint`, `notOnlyOnePrint`) matches issues where the column is `false`. This is the true logical negation; see the user-visible behavior change below.
  - `SeriesGenre` rows are derived from `Series.genre` by splitting on the existing CSV separator and trimming whitespace. Each row stores the genre token exactly as it appears in `Series.genre`. Case-insensitive matching is performed at query time (`ILIKE` or equivalent). `Series.genre` remains the human-readable source; the table is a query accelerator.
  - `Series.genre` is written only by the `update-de-series-genres` admin task. No other write path mutates it, so `SeriesGenre` does not need inline write-time sync; the same task pass that rewrites the CSV also rewrites the `SeriesGenre` rows.
  - The `onlyNotCollectedNoOwnedVariants` query mode is now expressed as: select all issues with `collected = false` that have no sibling in the same `(fk_series, number)` group with `collected = true`, then return one representative per group, chosen by format rank (`heft` < `softcover` < `taschenbuch` < `hardcover` < anything else) with ties broken by ascending `id`. This is the explicit version of the existing behavior in `reduceOwnedVariantGroups`.
  - Sync model: derivation runs as part of the existing admin tasks. Drift between catalog writes and the next task run is acceptable, matching today's behavior for `firstApp` and related Story flags.
  - `number_numeric` and `legacy_number_numeric` are SQL-side projections (`GENERATED ALWAYS AS ... STORED`) of `Issue.number` and `Issue.legacy_number`. They hold the numeric value when the source matches `^[0-9]+(\.[0-9]+)?$` and `NULL` otherwise. There is no application-side sync: the database maintains the values automatically on insert/update of the source column.
  - The `numbers` filter uses the generated columns for range comparisons when the filter value parses as numeric, falls back to lexical string comparison on the source columns otherwise, and uses string equality for the exact-match operator regardless. The variant equality check is unchanged.
  - The `individuals` filter is expressed as nested Prisma `WhereInput` with per-individual EXISTS over the story relation: `TRANSLATOR` matches at the story level, all other types match at the parent-story level (or at the story level when the story has no parent), and the no-type wildcard matches at either level. Type comparison stays case-insensitive.
- Rules that must remain unchanged:
  - Filter result parity for filters not listed under "intentional changes" below. The set of returned issue ids must match today's set exactly for `formats`, `releasedates`, `withVariants`, `publishers`, `series`, `genres` (after the SeriesGenre switch), `numbers`, `arcs`, `appearances`, `realities`, `individuals`, `onlyCollected`, `onlyNotCollected`, `noComicguideId`, `noContent`, plus the positive print-flag switches (`firstPrint`, `onlyPrint`, `onlyTb`, `exclusive`, `reprint`, `otherOnlyTb`, `notNoPrint`, `onlyOnePrint`).
  - Domain authority of Story-level facts. The new columns derive from them and must never be edited directly.
  - Public route behavior, canonical URLs, sitemap, and metadata are unchanged.
- Intentional user-visible behavior changes:
  - The seven "not" switches for the independent existence pairs (`notFirstPrint`, `notOnlyPrint`, `notOnlyTb`, `notExclusive`, `notOtherOnlyTb`, `noPrint`, `notOnlyOnePrint`) become **true logical negations** of their positive counterpart. Previously each negation was a separate "at least one story has the inverse property" predicate, so a mixed issue (containing both a firstApp and a non-firstApp story) matched both `firstPrint` and `notFirstPrint` simultaneously, and an empty-stories issue matched neither side of most pairs. Going forward, an issue matches exactly one side of each pair, and an empty-stories issue matches the negation side because the positive column is vacuously `false`. `reprint`/`notReprint` is unaffected (already a true negation pair today). `onlyCollected`/`onlyNotCollected` is unaffected (operates on `Issue.collected`).
  - Result-set differences are bounded to: mixed-story issues no longer appear under both switches of a pair, and empty-stories issues now match every negation switch instead of the historical mixture of vacuous matches.
  - `numbers` range comparisons (`>`, `>=`, `<`, `<=`) with a numeric filter value no longer match issues whose `number` or `legacy_number` is non-numeric (e.g. "Annual", "Special"). Previously the JS predicate fell back to lexical string comparison, so "Annual" matched `> 10` because ASCII `"A" > "1"`. The new behavior treats those as non-numeric (no match for numeric ranges), which is what users expect. Lexical comparison still applies when the filter value itself is non-numeric.

Reference:
- [AGENTS.md](/Users/christian.riese/Documents/shortbox/shortbox-next/AGENTS.md)
- [docs/domain/overview.md](/Users/christian.riese/Documents/shortbox/shortbox-next/docs/domain/overview.md)
- [docs/adr/002-filter-architecture.md](/Users/christian.riese/Documents/shortbox/shortbox-next/docs/adr/002-filter-architecture.md)

## 6. Affected Routes and Pages

| Route or page | Context (`de` / `us` / admin / api / worker) | Change summary |
|---|---|---|
| All catalog filter pages | `de`, `us` | Internal query path changes only; visible output and counts unchanged |
| Admin task launcher entry for `update-story-badges` | `admin` | Existing entry now also writes the new Issue aggregates and `fk_publisher` |
| Admin task launcher entry for `update-de-series-genres` | `admin` | Existing entry now also writes `SeriesGenre` rows |
| `src/lib/read/filter-read.ts` | `lib` | New aggregate columns and `fk_publisher` enter the direct WHERE; `numbers` and `individuals` join the direct path via the generated columns and nested `WhereInput`; group-aware uncollected handled by a dedicated helper; fallback branch removed |
| `src/lib/read/filter-service.ts`, `src/lib/read/filter-service-read.ts` | `lib` | Deleted entirely once nothing routes through the JS-predicate fallback |
| `src/lib/server/story-filter-write.ts` | `lib` | Per-issue recompute extended to also write the new Issue aggregates and `fk_publisher` |
| `src/worker/tasks/update-de-series-genres.ts` and its core helper | `worker` | After computing the CSV, write the matching `SeriesGenre` rows in the same transaction or pass |
| `prisma/schema.prisma` | `lib` | Add columns on `Issue`, add `SeriesGenre` model, add indexes |
| Prisma migration | `lib` | Schema migration script; one-time backfill instructions documented |

## 7. Architectural Placement Expectations

- Entry points to keep thin in `app/`: No change. No new pages or API routes.
- UI or presentation changes expected in `src/components/`: None.
- Business logic expected in `src/services/`: None. Filter business rules already live in `src/services/filter/`; the changes here are purely in the technical query layer and the existing recompute layer.
- Technical or Prisma work expected in `src/lib/`:
  - `src/lib/read/filter-read.ts` learns to read the new columns and grows a `$queryRaw` for the group-aware mode.
  - `src/lib/read/filter-service.ts` loses the JS-predicate body for everything that moves to SQL.
  - `src/lib/server/story-filter-write.ts` extends `updateStoryFilterFlagsForIssue` to compute and write the new Issue aggregates and `fk_publisher`.
  - A new small helper (under `src/lib/server/` or `src/lib/read/`) that lists genres from a `Series.genre` CSV; consumed by both the `update-de-series-genres` task and any future write paths that touch `Series.genre`.
- Pure helpers or shared types, if any:
  - A `formatRank` helper that already exists in `filter-service.ts:225` is duplicated as a small SQL `CASE` expression. The duplication is intentional and the helper is annotated to point at its SQL twin.
- Existing modules or patterns to reuse:
  - `updateStoryFilterFlagsForIssue` per-issue recompute pattern, called from the existing `update-story-badges` task loop.
  - `persistTaskResult` reporting in worker tasks.
  - The `cache(...)` wrapping pattern around `resolveFilterStateCached` in `filter-read.ts` continues to apply.

## 8. Risks and Edge Cases

- Domain edge cases:
  - Issues with zero stories: today's predicates handle this explicitly (`reprint` is false, `notReprint` is true, `noPrint` is true). The new aggregates must reflect the same convention. Specifically `is_reprint_only` must be false for an issue with no stories.
  - Issues whose stories are attached to a sibling variant rather than to themselves: the aggregates derive from the issue's *own* stories, so an issue that legitimately has no stories has all eight aggregates false. The group-aware uncollected query is what compensates for this case; no other filter is affected.
  - Series with empty or whitespace-only genre CSVs produce zero `SeriesGenre` rows. Series whose CSV contains duplicate tokens produce one row per unique normalized key.
  - The `formatRank` SQL expression must agree exactly with the JS version, including the fallback rank for unknown formats.
- Routing or slug edge cases:
  - None. The slug system is untouched.
- Legacy hotspots touched:
  - `filter-service.ts` is a legacy hotspot per `AGENTS.md`; the change here is reductive (less code, narrower scope) but warrants careful regression tests.
  - `story-filter-write.ts` already contains nontrivial recursion through related parents; extending it must not change the existing Story-flag computation.
- Data integrity or migration concerns:
  - Newly added columns must have a deterministic default (`false`) and a non-null constraint so that pre-backfill reads of unmigrated rows do not return ambiguous nulls.
  - `Issue.fk_publisher` must be added with a foreign key constraint and an index; backfill must complete before any read path consumes the column. The plan must document the rollout sequence.
  - Backfill is potentially long for the full Issue set; the existing batching in `runUpdateStoryFilters` covers this and should be reused without behavioral change.
  - Drift between writes and admin task runs already exists today for Story flags; the new aggregates inherit that same characteristic. The plan must explicitly document this so that future readers do not assume real-time consistency.
  - The `update-story-badges` task only iterates `de` issues (publisher `original = false`). The new Issue aggregates inherit this scoping and are explicitly out of scope for `us` issues. Read paths must therefore treat the aggregate columns on `us` issues as undefined and not rely on them; the `us` catalog continues to use the existing filter shape, which does not surface print-flag aggregates today.
- SEO or canonical risks:
  - None. Filter result identity is a hard parity criterion.

## 9. Acceptance Criteria

- [ ] For every combination of currently supported filter inputs, the set of returned issue ids matches the pre-change behavior exactly, with the documented intentional exceptions: (a) the seven "not" switches for independent existence pairs are now true logical negations and therefore differ for mixed-story and empty-stories issues; (b) `onlyNotCollectedNoOwnedVariants` now correctly excludes groups where any sibling issue is owned; (c) `numbers` range comparisons with a numeric filter value no longer match issues whose `number`/`legacy_number` is non-numeric. All three are described in §5 under "Intentional user-visible behavior changes".
- [ ] `src/lib/read/filter-service.ts` and `src/lib/read/filter-service-read.ts` no longer exist. `resolveFilterStateCached` has no fallback branch.
- [ ] `shortbox.issue.number_numeric` and `shortbox.issue.legacy_number_numeric` exist as Postgres `GENERATED ALWAYS AS ... STORED` columns and are referenced as nullable `Decimal` fields in the Prisma schema. No application code writes to them.
- [ ] The Prisma `WHERE` path in `buildDirectIssueFilterWhere` covers all eight print-flag pairs and their negations, the `publishers` filter (via `fk_publisher`), and the `genres` filter (via `SeriesGenre`).
- [ ] `getFilteredIssues` in `filter-service.ts` is reached only for the `numbers`-range case. All other code paths that previously triggered it are gone or rerouted.
- [ ] `reduceOwnedVariantGroups` is removed.
- [ ] `Issue` carries the eight aggregate boolean columns and `fk_publisher`, with appropriate non-null defaults, indexes, and the foreign-key constraint on `fk_publisher`.
- [ ] `SeriesGenre` exists as a Prisma model with a foreign key to `Series`, a single `genre` column storing the token exactly as it appears in `Series.genre`, and an index suitable for case-insensitive lookups (`WHERE genre ILIKE ANY (...)` or an expression index on `lower(genre)`).
- [ ] Running `update-story-badges` once on a freshly migrated database results in all `Issue` rows in scope having correct aggregate values and `fk_publisher`. The task's summary string reports the number of issues touched and the number that changed.
- [ ] Running `update-de-series-genres` once on a freshly migrated database results in `SeriesGenre` rows that exactly cover the unique normalized tokens of each `Series.genre` CSV. The task's summary reports how many genre rows were inserted, updated, and deleted.
- [ ] Jest tests in `src/lib/read/` cover at minimum: each of the eight aggregate filters in isolation, the publisher filter using `fk_publisher`, the genre filter via `SeriesGenre`, and the group-aware uncollected query for the four interesting variant/ownership/story-attachment permutations.
- [ ] Jest tests cover the parity criterion: a fixture set of issues with stories and a representative spread of filter combinations produces identical id sets before and after the change.
- [ ] Architectural boundaries from `AGENTS.md` are respected. No Prisma escapes `src/lib/`. No new business rules appear in `app/` or `src/components/`.
- [ ] ESLint and the existing typecheck pass.

## 10. Open Questions

All open questions from earlier drafts have been resolved by the maintainer (2026-06-02):

- Scope of the new Issue aggregates: `de` only, mirroring the existing `update-story-badges` task scoping. Codified in §5 and §8.
- Other writers of `Series.genre`: none. Sync via the `update-de-series-genres` task pass alone is sufficient. Codified in §5.
- Task name: `update-story-badges` stays as is; no rename in this change.
- `SeriesGenre` shape: a single column storing the genre token as it appears in `Series.genre`. Case-insensitive matching happens at query time. Codified in §5 and §9.

No outstanding questions remain. Ready for plan authoring.
