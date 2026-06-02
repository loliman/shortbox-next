-- PR 6: Generated numeric projections of shortbox.issue.number and
-- shortbox.issue.legacy_number for the `numbers` filter range comparisons.
--
-- The source columns stay alphanumeric (domain rule). The generated columns
-- hold the numeric value when the source matches a plain decimal pattern, and
-- NULL otherwise. Postgres maintains them automatically on insert/update of
-- the source columns; no application sync is required.
--
-- Safe to apply on production-shape data and idempotent via IF NOT EXISTS.

BEGIN;

ALTER TABLE shortbox.issue
  ADD COLUMN IF NOT EXISTS number_numeric NUMERIC
    GENERATED ALWAYS AS (
      CASE
        WHEN number ~ '^[0-9]+(\.[0-9]+)?$' THEN number::numeric
        ELSE NULL
      END
    ) STORED;

ALTER TABLE shortbox.issue
  ADD COLUMN IF NOT EXISTS legacy_number_numeric NUMERIC
    GENERATED ALWAYS AS (
      CASE
        WHEN legacy_number ~ '^[0-9]+(\.[0-9]+)?$' THEN legacy_number::numeric
        ELSE NULL
      END
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_issue_number_numeric
  ON shortbox.issue (number_numeric)
  WHERE number_numeric IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_issue_legacy_number_numeric
  ON shortbox.issue (legacy_number_numeric)
  WHERE legacy_number_numeric IS NOT NULL;

COMMIT;
