-- =============================================================================
-- Script 07: Uniqueness constraint/index on issue (fk_series, number)
-- =============================================================================

BEGIN;

-- 1. Drop the old non-unique index
DROP INDEX IF EXISTS shortbox.idx_issue_series_number;

-- 2. Create a unique index that treats NULL series as equivalent (PostgreSQL 15+)
CREATE UNIQUE INDEX uq_issue_series_number
  ON shortbox.issue (fk_series, number)
  NULLS NOT DISTINCT;

COMMIT;
