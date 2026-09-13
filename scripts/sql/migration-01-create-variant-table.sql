-- =============================================================================
-- Script 01: Variant-Tabelle erstellen
-- =============================================================================
-- Laufzeit: < 1 Sekunde (DDL only)
-- Vorbedingung: Backup erstellt, App gestoppt oder Read-only
-- Rollback: DROP TABLE shortbox.variant;
-- =============================================================================

BEGIN;

CREATE TABLE shortbox.variant (
  id            BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fk_issue      BIGINT      NOT NULL,
  format        VARCHAR(255) NOT NULL DEFAULT '',
  variant_label VARCHAR(255),
  releasedate   TIMESTAMPTZ,
  pages         BIGINT      DEFAULT 0,
  price         DOUBLE PRECISION,
  currency      VARCHAR(255),
  addinfo       VARCHAR(1000),
  verified      BOOLEAN     NOT NULL DEFAULT false,
  collected     BOOLEAN,
  isbn          VARCHAR(255),
  limitation    BIGINT      DEFAULT 0,
  comicguideid  BIGINT,
  createdat     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedat     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Temporäre Spalte für Migration: Original-Issue-ID vor der Konsolidierung
  -- Wird in Script 06 entfernt.
  _migration_source_issue_id BIGINT
);

-- Index auf fk_issue für spätere Queries
CREATE INDEX idx_variant_fk_issue ON shortbox.variant (fk_issue);

COMMIT;

-- Verifikation:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'shortbox' AND table_name = 'variant'
ORDER BY ordinal_position;
