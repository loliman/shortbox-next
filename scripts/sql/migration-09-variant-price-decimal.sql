-- =============================================================================
-- Migration 09: Change Variant.price type to NUMERIC(10, 2)
-- =============================================================================

BEGIN;

ALTER TABLE shortbox.variant 
  ALTER COLUMN price TYPE NUMERIC(10, 2);

COMMIT;
