# ADR 006: Issue/Variant Separation

## Status
Accepted

## Context
Initially, the application modeled all publication editions as rows in the `Issue` table. Physical variants (different formats, cover variants, or limitations) were represented as separate `Issue` rows, each containing a duplicate set of stories, creators, and event (arc) references. 

This led to several architectural issues:
- **Data Redundancy**: Editorial metadata (stories, creators, arcs) had to be duplicated across all variant rows of the same publication.
- **Sync Complexity**: Updating stories or creators required traversing and writing to all "sibling" variant rows to keep them in sync.
- **Read-Layer Fragility**: The UI had to resolve a "preferred sibling" to determine the canonical story list or title representation at runtime, leading to complex and slow queries.

## Decision
We refactored the database schema and application layers to separate the abstract publication concept from its concrete physical editions:

1. **`Issue` (The Abstract Work)**: Represents the unique publication index `(fkSeries, number)`. It owns editorial metadata:
   - `number`, `title`, `legacyNumber`, `numberNumeric`
   - Relations: `stories`, `arcs`, `individuals` (creators/editors)
   - Materialized story flags (e.g. `hasFirstPrint`, `hasOnlyPrint`)
2. **`Variant` (The Physical Edition)**: Represents a concrete print edition of an issue. It contains:
   - `format`, `variantLabel` (unique per issue format combination)
   - `releaseDate`, `price`, `currency`, `pages`, `limitation`, `isbn`, `comicGuideId`, `verified`, `collected`
   - Relations: `covers`
3. **Backward-Compatible UI Types**: The read layer (`toIssueDetailsShape` and search/feed serializers) continues to expose the legacy `Issue` properties (`format`, `variant`, `releasedate`, etc.) by fallback-mapping them from the selected/preferred variant. This prevents breaking downstream UI components and routing.
4. **Write Separation**: The write layer (`issues-write.ts`) isolates edits to the appropriate table:
   - Editorial changes update the `Issue` record.
   - Physical changes update the corresponding `Variant` record.
   - Deleting a variant deletes only that variant. If it was the last variant of that issue, the parent `Issue` (along with its stories, arcs, etc.) is cleaned up.

## Consequences

### Positive
- **Data Integrity**: Stories, event arcs, and editorial creators are now defined exactly once per publication, eliminating duplication and desync issues.
- **Clean Schema Boundaries**: Covers belong exclusively to variants, while stories belong to issues.
- **Performance**: Read operations no longer need to execute complex SQL partitions or parent-sibling resolution routines.
- **Improved Maintainability**: The editing flow targets individual physical rows by `variantId` while cleanly updating publication-wide metadata.

### Negative
- **Write Path Multiplicity**: Creating or modifying an issue now involves writing to both `issue` and `variant` tables in a transaction.
- **Migration Effort**: Required executing a multi-step SQL migration script on existing databases to split issue rows, re-parent covers, and clean obsolete columns.
