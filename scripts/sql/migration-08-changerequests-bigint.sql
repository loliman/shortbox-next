-- =============================================================================
-- Migration 08: Change ChangeRequest.fkIssue type to BIGINT
-- =============================================================================

BEGIN;

ALTER TABLE shortbox.changerequests 
  ALTER COLUMN fk_issue TYPE BIGINT;

COMMIT;
