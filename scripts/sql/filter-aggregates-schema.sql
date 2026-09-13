-- PR 1: Category A — Issue-level filter aggregates and denormalised publisher FK.
-- Adds eight non-null boolean aggregate columns on shortbox.issue plus a
-- nullable fk_publisher with a foreign key to shortbox.publisher and an index.
--
-- Read paths are not yet consuming these columns. After applying this script,
-- run the `update-story-badges` admin task once to backfill values for the
-- existing de issue set. us issues remain at the default values (false / null),
-- which matches the de-only scoping documented in the spec.
--
-- Safe to apply on production-shape data. All ADDs use IF NOT EXISTS so the
-- script can be retried.

BEGIN;

ALTER TABLE shortbox.issue
  ADD COLUMN IF NOT EXISTS has_first_print     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_only_print      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_only_tb         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_exclusive_story BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_reprint_only     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_other_only_tb   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_print_story     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_only_one_print  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fk_publisher        BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'issue_fk_publisher_fkey'
  ) THEN
    ALTER TABLE shortbox.issue
      ADD CONSTRAINT issue_fk_publisher_fkey
      FOREIGN KEY (fk_publisher) REFERENCES shortbox.publisher (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_issue_fk_publisher
  ON shortbox.issue (fk_publisher);

COMMIT;
