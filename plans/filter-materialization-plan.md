# Filter Materialization Implementation Plan

## Document Metadata

- Feature name: Filter materialization and group-aware uncollected query
- Plan identifier: `plan-filter-materialization-v1`
- Status: Draft
- Related spec: [`specs/filter-materialization-spec.md`](/Users/christian.riese/Documents/shortbox/shortbox-next/specs/filter-materialization-spec.md)
- Authors: Claude, Christian
- Last updated: 2026-06-02

## 1. Summary

The implementation should materialize eight Issue-level aggregate booleans plus a denormalized `fk_publisher` on `Issue`, replace the CSV-only `Series.genre` with a `SeriesGenre` join table for filtering, and replace `onlyNotCollectedNoOwnedVariants` with a single Postgres query that combines a group-aware anti-join with a `DISTINCT ON` representative selection. The work is split into five small, independently shippable PRs that progressively move catalog filtering off the JS-predicate fallback path and onto SQL. Each PR keeps the user-visible behavior unchanged and is verifiable in isolation; the final PR removes the legacy fallback for everything except `numbers`-range, which intentionally stays JS.

## 2. Scope Check

- In scope:
  - Prisma schema additions for `Issue` aggregate columns, `Issue.fk_publisher`, and the new `SeriesGenre` model
  - Extension of `updateStoryFilterFlagsForIssue` so the existing per-issue recompute pass also writes the new Issue-level fields
  - Extension of the `update-de-series-genres` admin task so the same pass that updates `Series.genre` rewrites `SeriesGenre` rows
  - Switching `src/lib/read/filter-read.ts` to consume the new columns and table for the eight print-flag pairs, `publishers`, and `genres`
  - Adding a `$queryRaw` helper for the group-aware uncollected query and replacing `reduceOwnedVariantGroups`
  - Reducing `src/lib/read/filter-service.ts` to the `numbers`-range case
  - Operational backfill via two one-off task runs after the relevant migrations
- Out of scope:
  - Any UI change (filter form, badges, catalog pages)
  - Real-time write-side sync from `issues-write.ts` (drift behavior remains task-driven, matching today)
  - Changes to Story-level flags or `story-filter-write.ts` parent-group analysis
  - Changes for `us` issues (aggregate computation stays `de`-only as today)
  - Range comparisons over `Issue.number` (stays alphanumeric, stays JS)
  - Renames of the existing admin tasks
- Assumptions carried from the spec:
  - `Series.genre` is only mutated by `update-de-series-genres`
  - The four `format_rank` values (`heft`, `softcover`, `taschenbuch`, `hardcover`, fallback 5) are stable and worth duplicating into SQL
  - Aggregate semantics on issues with zero stories follow the spec exactly (`is_reprint_only` false; `noPrint`/`notReprint` semantics derived from `has_print_story` and `is_reprint_only` accordingly in the read layer)
  - Backfill latency is acceptable: catalog filtering may temporarily yield empty/inconsistent results between migration and the first task run on a given environment; this is mitigated by ordering the read switch into a separate PR after the backfill

## 3. Proposed File Changes

| Path | Change type | Reason |
|---|---|---|
| `prisma/schema.prisma` | update | Add 8 boolean aggregate columns + `fkPublisher` on `Issue`; add `SeriesGenre` model with `fkSeries` + `genre`; add indexes |
| `scripts/sql/<category>-schema.sql` | add | Two hand-written SQL scripts (one per schema-changing PR) with the `ALTER TABLE`, `CREATE TABLE`, `CREATE INDEX`, and any necessary `UPDATE` statements. No Prisma migration tooling is used in this project. Final path to confirm with maintainer. |
| `src/lib/server/story-filter-write.ts` | update | Extend `updateStoryFilterFlagsForIssue` to also compute and write the new Issue aggregates and `fk_publisher` |
| `src/lib/server/story-filter-write.ts` | update | Add a small pure helper that derives the 8 aggregates from a story list, so it is unit-testable in isolation |
| `src/core/update-story-filters.ts` | update (minimal) | No behavior change beyond what `updateStoryFilterFlagsForIssue` now does; possibly extend report fields |
| `src/worker/tasks/update-story-filters-all.ts` | update (minimal) | Pass through any new report fields to `persistTaskResult` summary |
| `src/worker/tasks/update-de-series-genres.ts` and its core helper | update | After computing the CSV, rewrite the matching `SeriesGenre` rows in the same pass |
| `src/lib/read/filter-read.ts` | update | Consume new columns in the direct WHERE; add `notPublishers` consideration deferred; switch genre filter to `SeriesGenre`; add `$queryRaw` for group-aware uncollected mode |
| `src/lib/read/filter-service.ts` | update | Drop JS predicates that move to SQL; remove `reduceOwnedVariantGroups`; reduce to `numbers`-range only |
| `src/lib/read/filter-service-read.ts` | update | Narrow the include shape since most filters no longer require the deep story graph |
| `src/lib/read/filter-read.ts` (tests) | add | Unit tests for each aggregate filter in isolation, the publisher filter via `fk_publisher`, the genre filter via `SeriesGenre`, the group-aware uncollected query |
| `src/lib/server/story-filter-write.test.ts` | add | Unit tests for the aggregate-derivation helper across edge cases (zero stories, all reprints, mixed, etc.) |
| `src/lib/read/filter-service.test.ts` | update | Trim assertions that targeted JS-only paths now removed; keep `numbers`-range coverage |
| `src/lib/read/filter-parity.test.ts` | add | Fixture-based parity tests: identical id sets for a representative spread of filter combinations, pre and post change, asserted via shared fixtures |
| `docs/adr/004-filter-materialization.md` | add | Short ADR describing the move from JS-predicate fallback to materialized aggregates, the `de`-only scoping, and the single remaining JS predicate (`numbers`-range) |

## 4. Layer Placement

- `app/` responsibilities: None. No new pages, no new route handlers, no changes to existing handlers.
- `src/components/` responsibilities: None.
- `src/services/` responsibilities: None. Filter business semantics live in `src/services/filter/` and are unaffected; this work is purely technical.
- `src/lib/` responsibilities:
  - `src/lib/read/filter-read.ts` learns the new columns and grows the group-aware `$queryRaw` helper.
  - `src/lib/read/filter-service.ts` shrinks to the `numbers`-range case.
  - `src/lib/read/filter-service-read.ts` exposes a narrower include shape.
  - `src/lib/server/story-filter-write.ts` extends per-issue recompute with the aggregate derivation.
- `src/util/` or `src/types/` responsibilities: A small pure derivation helper for the 8 aggregates may live next to the recompute logic in `src/lib/server/` rather than `src/util/`, since it is server-only and operates on Prisma types.
- Areas intentionally left unchanged:
  - `src/components/filter/*` UI and form
  - `src/services/filter/*` conflict resolution
  - `src/lib/server/issues-write.ts` and the editor write path
  - Story-level flag computation in `story-filter-write.ts`
  - `Series.genre` as the human-facing source of truth

## 5. Implementation Steps

The work splits into five PRs. Each PR is self-contained, leaves the catalog filter behavior unchanged for end users, and can be reverted without affecting later PRs.

### PR 1 — Category A schema and sync (no read switch)

1. Add to `prisma/schema.prisma`:
   - Eight non-null boolean columns on `Issue` with default `false`: `hasFirstPrint`, `hasOnlyPrint`, `hasOnlyTb`, `hasExclusiveStory`, `isReprintOnly`, `hasOtherOnlyTb`, `hasPrintStory`, `hasOnlyOnePrint`.
   - Nullable `fkPublisher` on `Issue` with FK to `Publisher.id` and an index.
   - Composite index that covers the highest-leverage filter combinations (proposal: `@@index([fkPublisher, isReprintOnly, hasFirstPrint])`; refine after looking at production usage).
2. Write a SQL script (`scripts/sql/filter-aggregates-schema.sql` or equivalent) with:
   - `ALTER TABLE shortbox.issue ADD COLUMN ...` for each of the 8 booleans (`NOT NULL DEFAULT false`).
   - `ALTER TABLE shortbox.issue ADD COLUMN fk_publisher BIGINT REFERENCES shortbox.publisher(id);` plus the index.
   - `CREATE INDEX` for the chosen aggregate composite.
   This is a hand-applied script, not a Prisma migration. `prisma/schema.prisma` is updated in lockstep so the generated client knows about the columns; `prisma generate` is still run, but `prisma migrate` is not.
3. Add a pure helper `deriveIssueAggregatesFromStories(stories)` in `src/lib/server/story-filter-write.ts`, returning the eight booleans from a list of Story rows with the required flags.
4. Extend `updateStoryFilterFlagsForIssue(issueId)` so that after the existing Story-flag recompute, it queries the issue's stories with the necessary flags, calls the derivation helper, also reads the issue's `series.publisher` (or computes it from the just-loaded relation) for `fk_publisher`, and writes both into the issue row.
5. Add unit tests for the derivation helper covering: zero stories, single story `firstApp`, single story `firstApp=false`, multiple stories mixed, all stories non-`firstApp` (reprint), all stories `onlyApp`, etc.
6. The read path is not yet using the new columns, so the catalog continues to behave exactly as today.
7. Operational backfill (deploy-time): run the `update-story-badges` admin task once after deploy to fill the new columns on all `de` issues.

### PR 2 — Category A read switch

1. Update `buildDirectIssueFilterWhere` in `src/lib/read/filter-read.ts`:
   - Add the eight print-flag pairs as direct WHERE clauses against the new Issue columns. Negations are simple `= false`.
   - Switch the `publishers` filter to use `fk_publisher IN (...)` instead of the `series.publisher` join.
   - Drop the corresponding entries from `hasUnsupportedFilterState` so these filters no longer fall back.
2. Update `src/lib/read/filter-service.ts`:
   - Delete `matchesStorySwitches`, `collectStorySwitchConditions`, and `hasStorySwitchTerms` from the include calculation.
   - Remove the eight print-flag branches from `hasUnsupportedFilterState` and the related Runtime types where they are now dead.
3. Update `src/lib/read/filter-service-read.ts` to narrow the include shape: parent/children traversals are still needed for arcs/appearances/individuals filters but not for story-switch filters.
4. Add fixture-based parity tests in `src/lib/read/filter-parity.test.ts`: for a curated set of issues spanning the relevant story configurations, run each of the 16 print-flag inputs and confirm the SQL-path id set matches the previous JS-path id set.
5. Backfill ordering: this PR must not deploy until the PR 1 backfill has completed on the target environment, otherwise the WHERE clauses read defaults of `false` for not-yet-touched issues.

### PR 3 — Category B (genres)

1. Add to `prisma/schema.prisma`:
   - `SeriesGenre` model: `id` (autoincrement), `fkSeries` (FK to `Series.id` with cascade delete), `genre` (varchar, exactly as it appears in `Series.genre`), index `@@index([fkSeries])`. The expression index `lower(genre)` lives only in the SQL script since Prisma cannot model it natively.
2. Write a SQL script (`scripts/sql/series-genre-schema.sql` or equivalent) with:
   - `CREATE TABLE shortbox.series_genre (...)` matching the Prisma model.
   - `CREATE INDEX series_genre_fk_series_idx ON shortbox.series_genre (fk_series);`
   - `CREATE INDEX series_genre_genre_lower_idx ON shortbox.series_genre (lower(genre));`
   Hand-applied, not via Prisma. `prisma generate` is run after editing `schema.prisma`.
3. Extend `src/worker/tasks/update-de-series-genres.ts` (and its core helper) so that for every series whose `Series.genre` was just computed, the corresponding `SeriesGenre` rows are rewritten: delete existing rows for the series, insert one row per unique non-empty token. Run inside the same transaction as the CSV write if practical.
4. Switch the `genres` branch of `FilterService.buildBaseWhere` (or move it into `buildDirectIssueFilterWhere` if it can join cleanly through `series`) to query `SeriesGenre` with case-insensitive matching (`mode: "insensitive"` on Prisma, or `$queryRaw` if join shape requires).
5. Remove `matchesGenrePattern` and the post-fetch genre matcher in `filter-service.ts`; drop genres from `hasUnsupportedFilterState`.
6. Operational backfill (deploy-time): run the `update-de-series-genres` admin task once after deploy.
7. Add unit tests: genre token normalization, CSV split correctness, case-insensitive matching, multi-token series, empty/whitespace CSV.
8. Parity tests in `filter-parity.test.ts` extended with genre cases.

### PR 4 — Category C (group-aware uncollected)

1. Add a `$queryRaw` helper in `src/lib/read/filter-read.ts` (or a small sibling file) that executes the WITH/`DISTINCT ON` query from the spec, parameterized by the same base WHERE used elsewhere.
2. Route `onlyNotCollectedNoOwnedVariants` through this helper, returning issue ids that the rest of the read pipeline can consume.
3. Remove `reduceOwnedVariantGroups` from `filter-service.ts` and drop `onlyNotCollectedNoOwnedVariants` from `hasUnsupportedFilterState`.
4. Add tests covering the four interesting variant/ownership/story-attachment permutations explicitly described in the spec discussion.
5. Encode the format-rank `CASE` expression alongside the existing `formatRank` helper in `filter-service.ts` (or wherever it ends up), with a comment annotating the SQL twin.

### PR 5 — Cleanup checkpoint and ADR 005

1. Confirm `getFilteredIssues` in `filter-service.ts` is reached only for the **two** remaining cases: `numbers` (alphanumeric range comparisons) and `individuals` (parent-or-story matching with TRANSLATOR special case). Both are scheduled for migration in PR 6, after which the file disappears.
2. Add ADR 005 documenting the architectural shift so far, the `de`-only scoping, the deliberate negation-semantics change for the seven non-reprint pairs, and the planned removal of the JS-predicate fallback.
3. Add an inline comment at the top of `filter-service.ts` explaining when the fallback path runs post-PR-4.

### PR 6 — Eliminate the JS-predicate fallback entirely

1. Add `number_numeric` and `legacy_number_numeric` to `prisma/schema.prisma` as nullable `Decimal` fields mapped to `number_numeric` / `legacy_number_numeric`. They are populated by a Postgres generated column declared in a SQL script.
2. Write `scripts/sql/number-generated-columns.sql` with:
   - `ALTER TABLE shortbox.issue ADD COLUMN number_numeric NUMERIC GENERATED ALWAYS AS (CASE WHEN number ~ '^[0-9]+(\.[0-9]+)?$' THEN number::numeric ELSE NULL END) STORED;`
   - Same for `legacy_number_numeric`.
   - `CREATE INDEX IF NOT EXISTS` on each.
   Hand-applied. No backfill needed — Postgres fills the columns on `ADD COLUMN`.
3. Add `applyNumbersFilter` to `filter-read.ts`. Per number entry:
   - Exact match (`=`): `WHERE number = X OR legacy_number = X` (string equality), plus optional variant equality.
   - Range with numeric filter value: `WHERE number_numeric op X OR legacy_number_numeric op X`.
   - Range with non-numeric filter value: lexical `WHERE number op X OR legacy_number op X` (preserves existing string-compare behavior for non-numeric filter inputs).
   Multiple entries combined with AND. Add `"numbers"` to `supportedDirectFilterKeys`; drop from `hasUnsupportedFilterState`.
4. Add `applyIndividualsFilter` to `filter-read.ts`. Per individual entry, emit `{ stories: { some: { OR: [...] } } }` with branches for: TRANSLATOR-on-story; non-translator-on-parent or non-translator-on-self-when-no-parent; the no-types wildcard. Case-insensitive `type` matching via `{ in: types, mode: "insensitive" }`. Add `"individuals"` to `supportedDirectFilterKeys`; drop from `hasUnsupportedFilterState`.
5. Remove `FilterService` import and the fallback branch from `resolveFilterStateCached`. Same for the fallback branch inside `readGroupAwareUncollectedIssueIds`. If `buildDirectIssueFilterWhere` returns `null` (only possible via unknown keys or `onlyNotCollectedNoOwnedVariants` defense), treat it as a programmer error rather than silently falling back.
6. Delete `src/lib/read/filter-service.ts`, `src/lib/read/filter-service-read.ts`, and the dead `readFilteredIssueIds` export. Confirm no external importers remain.
7. Add tests in `filter-read.test.ts` for the new direct WHERE shapes: numbers exact/range/variant/lexical cases, individuals with no-types/TRANSLATOR/non-translator/mixed/multiple entries.
8. Update ADR 005: remove the "two remaining JS predicates" qualifier, document the generated columns, document the "Annual > 10" behavioral fix.
9. Fix the AGENTS.md Layer 4 section, which references a non-existent `src/services/filter-service.ts` and is now obsolete since the technical layer handles all filter semantics.

## 6. Test Plan

- Unit tests:
  - `deriveIssueAggregatesFromStories` covering all interesting story-set shapes (PR 1).
  - Genre token derivation from a CSV (PR 3).
  - Format-rank SQL parity with the JS helper (PR 4).
- Regression tests:
  - Existing tests in `src/lib/read/issue-read-shared.test.ts` and related must continue to pass without modification at every PR boundary.
  - `story-reference-parser.test.ts` and other unrelated tests must remain untouched.
- Integration or route coverage:
  - `filter-parity.test.ts` (new): fixture-based parity for a representative spread of filter combinations across each PR's scope.
  - Admin task results: assert the `update-story-badges` and `update-de-series-genres` summaries report the new fields.
- Lint command: `npm run lint`
- Jest command: `npm test -- --runInBand`

## 7. Validation and Rollout Order

For each PR:

1. Run `npm run lint` and `npm test -- --runInBand` locally before pushing.
2. For PRs that change the DB schema (PR 1, PR 3), apply the hand-written SQL script on a copy of production-shape data and verify it runs cleanly and idempotently where applicable. `prisma generate` must produce a client matching the new shape.
3. For PR 1 and PR 3, immediately after deploy, run the corresponding admin task to backfill before any read-side PR is deployed.
4. For PR 2, gate deploy on confirmation that the PR 1 backfill is complete on the target environment.
5. For PR 4, validate the group-aware query against a known fixture set on a copy of production data before enabling the new path.
6. After PR 5, run the full Jest suite and a spot-check of representative catalog filter URLs in both `de` and `us` contexts to confirm visible parity.

Across all PRs, the rollout order is strict: PR 1 → backfill → PR 2; PR 3 (with its internal backfill); PR 4 standalone; PR 5 last.

## 8. Risks and Mitigations

- Risk: Aggregate values out of sync with story facts after editor writes, between admin task runs.
  - Why it matters: A filter that depends on the aggregate could return outdated results until the next sweep.
  - Mitigation: This drift behavior already exists for Story-level flags and is documented in the spec. The admin task is operator-runnable on demand. If real-time accuracy becomes important later, add an inline call to `updateStoryFilterFlagsForIssue` at the relevant write site in `issues-write.ts`; this is explicitly out of scope here but is a known follow-up.

- Risk: PR 2 deployed before PR 1 backfill completes leads to "everything is false" filter results.
  - Why it matters: Catalog pages would return empty or wrong results for users.
  - Mitigation: Rollout order is strict and documented. PR 2 must wait. Deploy gating noted in §7.

- Risk: `formatRank` SQL and JS drift apart over time.
  - Why it matters: The group-aware uncollected query would pick a different representative than tests assume.
  - Mitigation: Add a parity test that asserts the SQL `CASE` and the JS helper agree for every format the test fixtures use, plus a comment in both spots cross-referencing the other.

- Risk: `update-de-series-genres` task runs partially and leaves `SeriesGenre` out of sync with `Series.genre`.
  - Why it matters: Genre filter results temporarily diverge from the CSV.
  - Mitigation: Rewrite genre rows per series transactionally with the CSV update. If a series's CSV write fails, its `SeriesGenre` rows are not changed.

- Risk: The `$queryRaw` helper for the group-aware mode is harder to maintain than Prisma queries.
  - Why it matters: Future contributors might miss it or fail to compose it with other filters.
  - Mitigation: Place the raw query in a single, well-named helper with the full base WHERE construction reused from `buildDirectIssueFilterWhere`. Add a focused unit test and an ADR section that explains why this single filter mode is raw SQL.

- Risk: `Issue.fk_publisher` populated but a publisher reassignment on `Series` is not propagated until the next task run.
  - Why it matters: Publisher filter results temporarily diverge.
  - Mitigation: Acceptable under the same drift contract as the boolean aggregates. If publisher reassignment becomes a frequent operation, add a small targeted recompute hook in series write paths.

## 9. Review Checklist

- [ ] File placement follows `AGENTS.md` and documented module boundaries.
- [ ] Pages and route handlers remain thin.
- [ ] No Prisma access is introduced outside `src/lib/`.
- [ ] No unrelated refactor is included.
- [ ] Tests and verification steps are identified before implementation starts.
- [ ] Each PR is independently deployable and reversible.
- [ ] Backfill ordering is enforced between PR 1 and PR 2, and noted in PR 3.
- [ ] `formatRank` SQL/JS parity is asserted by an explicit test.
- [ ] Spec acceptance criteria are mapped to concrete tests or operational steps.
- [ ] No change to user-visible filter behavior (parity is the contract).
