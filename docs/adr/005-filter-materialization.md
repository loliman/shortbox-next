# ADR 005: Filter Materialization

## Status
Accepted

## Context
Following ADR 002, the filter pipeline had two execution paths:

- a direct Prisma `WHERE` path in `src/lib/read/filter-read.ts` (`buildDirectIssueFilterWhere`) for the cheap, indexable filter subset
- a load-all-and-match-in-JS fallback in `src/lib/read/filter-service.ts` for everything else

In practice the fallback was reached by every realistic filter combination: the eight print-flag pairs (`firstPrint`, `onlyPrint`, `onlyTb`, `exclusive`, `reprint`, `otherOnlyTb`, `noPrint`, `onlyOnePrint` and their negations), `genres`, `numbers`, `individuals`, and `onlyNotCollectedNoOwnedVariants` all forced a fallback. The fallback eagerly loaded every issue in scope together with its full story graph (parent, children, parent issue arcs, parent appearances, parent individuals) and then iterated in Node to apply the predicates. Two consequences:

- `COUNT(*)` was approximate; pagination was app-side.
- `onlyNotCollectedNoOwnedVariants` was structurally broken: the post-fetch `reduceOwnedVariantGroups` checked `issue.collected === true` against a set the base WHERE had already filtered to `collected = false`, so the "owned variants" exclusion never triggered.

The system needed exact counts, SQL pagination, and a foundation small enough that a future AI assistant could express filter combinations through a flat tool surface.

## Decision
Materialize the derived facts that drive the print-flag filters as columns on `shortbox.issue`, normalize the `Series.genre` CSV into a join table, and replace the broken `reduceOwnedVariantGroups` with a group-aware Prisma query. Keep `prisma/schema.prisma` as the type source for the Prisma client; deliver the schema changes as hand-written SQL scripts under `scripts/sql/`. There is no Prisma migration tooling in this project.

### Issue aggregate columns
Add eight non-null `boolean DEFAULT false` columns on `shortbox.issue`:

- `has_first_print`, `has_only_print`, `has_only_tb`, `has_exclusive_story`,
  `is_reprint_only`, `has_other_only_tb`, `has_print_story`, `has_only_one_print`

Each maps directly to one positive filter switch. Negation switches map to `column = false`, i.e. **true logical negation**. This is a deliberate semantic change from the previous independent-existence pairs, where a mixed-story issue could match both sides of a pair. See "Consequences" below for the user-visible effect.

`is_reprint_only` is the only column shared by both sides of its pair (`reprint`/`notReprint`), since those were already true negations.

Add `fk_publisher BIGINT` as a denormalized FK on `shortbox.issue` for direct publisher filtering. Indexed with `idx_issue_fk_publisher`.

### Sync model for aggregates
Aggregate values are derived from the per-issue story set. They are written by `updateStoryFilterFlagsForIssue` in `src/lib/server/story-filter-write.ts`, which the existing `update-story-badges` admin task already calls per issue. The task scope is unchanged: it iterates `de` issues only. `us` issues' aggregate columns stay at the default `false`; read paths must not consume aggregates for `us` issues. Drift between editor writes and the next task run is acceptable, matching the existing contract for Story-level flags.

### SeriesGenre join table
Add `shortbox.series_genre (id, fk_series, genre)` with a B-tree index on `fk_series` and an expression index on `lower(genre)`. Rows store the genre token exactly as it appears in `Series.genre`; matching is case-insensitive at query time.

`Series.genre` remains the human-readable source and is mutated only by `update-de-series-genres`. The same task pass writes the `SeriesGenre` rows for each updated series inside one transaction. `us` series have a one-time backfill from the SQL script and stay in sync because nothing mutates their CSV.

### Group-aware uncollected query
`onlyNotCollectedNoOwnedVariants` is handled by `readGroupAwareUncollectedIssueIds` in `src/lib/read/filter-read.ts`, intercepted at the top of `resolveFilterStateCached`. Two Prisma queries: candidates (matching base WHERE + `collected = false`) and owned group keys (any `collected = true` issue in the same `us` context). An in-app `selectGroupRepresentatives` filters owned groups and dedupes to one representative per `(fk_series, number)` group, preferred by format rank (`heft` < `softcover` < `taschenbuch` < `hardcover` < anything else) with `id` as tiebreak. The format rank is a pure function in `filter-read.ts` next to the helper.

A raw `WITH ... DISTINCT ON` query would have been more compact but required mirroring the entire `buildDirectIssueFilterWhere` logic in raw SQL. Pure Prisma with two queries reuses the WHERE builder directly and stays maintainable.

### Numeric range comparisons via generated columns
`numbers` range comparisons (`>`, `>=`, `<`, `<=`) need to operate on the numeric value of `Issue.number` and `Issue.legacy_number`, but those columns are alphanumeric by domain rule (e.g. "Annual", "Special", "0.1"). Two Postgres `GENERATED ALWAYS AS ... STORED` columns are added:

```sql
ALTER TABLE shortbox.issue
  ADD COLUMN number_numeric NUMERIC
  GENERATED ALWAYS AS (
    CASE WHEN number ~ '^[0-9]+(\.[0-9]+)?$' THEN number::numeric ELSE NULL END
  ) STORED;
```

They are pure SQL projections, not denormalized state, and Postgres maintains them automatically on insert/update of the source. `Issue.number` remains the source of truth. The generated columns are declared as nullable `Decimal` fields in the Prisma schema and indexed for the not-null case.

`numbers` filter shapes:
- Exact match: string equality on `number`/`legacy_number`.
- Range with numeric filter value: `numberNumeric op X OR legacyNumberNumeric op X`.
- Range with non-numeric filter value: lexical `number op X OR legacy_number op X` (preserves the existing behavior for filter inputs that themselves are non-numeric).

### `individuals` filter as nested Prisma WhereInput
The individuals matcher expresses "this individual appears (with allowed roles) on at least one story in the issue, accounting for the original-story / reprint inheritance rule" as a nested Prisma `WhereInput`:

```ts
{ stories: { some: { OR: [
  // TRANSLATOR is per-translation, lives on the de story
  { individuals: { some: { individual: { name }, type: { equals: "TRANSLATOR", mode: "insensitive" } } } },
  // Other roles: parent story (the original), or self when no parent (us case)
  { parent: { individuals: { some: { individual: { name }, type: { in: nonTranslatorTypes, mode: "insensitive" } } } } },
  { parent: null, individuals: { some: { individual: { name }, type: { in: nonTranslatorTypes, mode: "insensitive" } } } },
]}}}
```

This preserves the domain rule that individuals are attached to original stories and inherited by reprints/variants, with the TRANSLATOR exception for translation-specific credits.

### JS-predicate fallback eliminated
With `numbers` and `individuals` on the direct path, the JS-predicate fallback in `src/lib/read/filter-service.ts` has no remaining trigger and is deleted. `src/lib/read/filter-service-read.ts` and the dead `readFilteredIssueIds` export go with it.

`resolveFilterStateCached` has two branches: `onlyNotCollectedNoOwnedVariants` is handled by `readGroupAwareUncollectedIssueIds`; everything else goes through `buildDirectIssueFilterWhere`. If the latter returns `null` (the only remaining trigger is an unknown filter key, which should not occur in normalised inputs), the cache returns an empty result rather than silently falling back, since no fallback exists.

## Consequences

### Positive
- The direct Prisma path covers every supported filter combination. Counts and pagination are exact and SQL-side for all catalog queries.
- The full-load-with-story-graph code path is gone. `filter-service.ts` and `filter-service-read.ts` are deleted.
- `onlyNotCollectedNoOwnedVariants` now correctly excludes groups where any sibling issue is owned — fixing a long-standing bug where variants in owned groups leaked into the results.
- `numbers` range comparisons no longer return non-numeric issues like "Annual" for `> 10` (an artefact of the previous lexical fallback). Treating non-numeric values as out-of-range matches user expectation.
- The AI assistant tool surface (future work) can expose the eight aggregate columns as flat booleans and the generated numeric columns as decimals, removing the "any-story" / "every-story" reasoning burden from the LLM and giving it a clean numeric range over issue numbers.

### Negative / intentional changes
- The seven "not" switches for independent existence pairs (`notFirstPrint`, `notOnlyPrint`, `notOnlyTb`, `notExclusive`, `notOtherOnlyTb`, `noPrint`, `notOnlyOnePrint`) are now true logical negations. Mixed-story issues no longer appear on both sides of a pair, and empty-stories issues now match every negation switch (the positive column is vacuously `false`). `reprint`/`notReprint` and `onlyCollected`/`onlyNotCollected` are unaffected.
- `numbers` range comparisons with a numeric filter value no longer match non-numeric issue numbers — previously they did via lexical fallback (ASCII `"A" > "1"`). Filter values that are themselves non-numeric still use lexical comparison.
- Aggregate columns are derived caches with the same write-time/task-time drift contract as the existing Story flags. Editor writes don't trigger immediate aggregate recompute; the operator runs the admin task when consistency is required.
- `us` issues have all aggregate columns at `false` until the task scope is widened. Read paths must not consume them for `us`.
- `prisma/schema.prisma` is the type source for the Prisma client; schema changes ship as hand-written SQL scripts in `scripts/sql/`. No Prisma migration tooling is used in this project.

## See also
- `specs/filter-materialization-spec.md`
- `plans/filter-materialization-plan.md`
- ADR 002: Filter Architecture
