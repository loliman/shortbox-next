# ADR 002: Filter Architecture

## Status
Accepted

## Context
Filter logic had grown across multiple layers:
- UI parsing
- legacy normalization
- conflict resolution
- technical query construction
- business matching

This created duplication and unclear ownership.

## Decision
Filter logic is split into layers:

- `src/components/filter/`
    - form state
    - UI defaults
    - serialization / deserialization
- `src/services/filter/`
    - conflict resolution
    - legacy normalization
    - business-oriented filter rules
- `src/lib/read/filter-read.ts`
    - technical query construction
    - Prisma where generation
- `src/lib/read/filter-service.ts`
    - business filter semantics and matching

## Consequences
### Positive
- duplicate normalization logic can be centralized
- UI stays focused on form state
- technical and business responsibilities are easier to distinguish

### Negative
- some existing files still mix responsibilities and will need gradual cleanup

## See also
- ADR 005: Filter Materialization — materializes the derived facts that drive the print-flag, genre, and group-aware uncollected filters, moving the corresponding logic from `filter-service.ts` (JS predicates) into `filter-read.ts` (Prisma WHERE).
