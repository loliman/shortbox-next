-- =============================================================================
-- Script 05: Issue-Tabelle bereinigen & Constraints setzen
-- =============================================================================
-- Laufzeit: < 5 Sekunden (DDL + leichte DML)
-- Vorbedingung: Script 04 erfolgreich ausgeführt und verifiziert
-- Rollback: Komplex (Spalten-Wiederherstellung) – erst nach Script 07 ausführen!
--
-- Was passiert:
--   - Variant-spezifische Spalten werden von issue entfernt
--   - Neuer Index für issue (fk_series, number) ohne format/variant
--   - Alter Index idx_issue_series_number_format_variant wird entfernt
--   - FK-Constraint auf variant.fk_issue wird gesetzt
--   - FK-Constraint auf cover.fk_variant wird gesetzt
--   - fk_issue wird von cover entfernt
--   - Unique-Constraint auf variant (fk_issue, format, variant_label)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------
-- Schritt 5.1: Variant-spezifische Spalten von issue entfernen
-- -----------------------------------------------------------------------
ALTER TABLE shortbox.issue
  DROP COLUMN IF EXISTS format,
  DROP COLUMN IF EXISTS variant,
  DROP COLUMN IF EXISTS releasedate,
  DROP COLUMN IF EXISTS pages,
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS addinfo,
  DROP COLUMN IF EXISTS verified,
  DROP COLUMN IF EXISTS collected,
  DROP COLUMN IF EXISTS isbn,
  DROP COLUMN IF EXISTS limitation,
  DROP COLUMN IF EXISTS comicguideid;

-- -----------------------------------------------------------------------
-- Schritt 5.2: Alten kombinierenden Index entfernen, neuen setzen
-- -----------------------------------------------------------------------
DROP INDEX IF EXISTS shortbox.idx_issue_series_number_format_variant;

CREATE INDEX idx_issue_series_number
  ON shortbox.issue (fk_series, number);

-- -----------------------------------------------------------------------
-- Schritt 5.2.5: Primary Key auf issue setzen
-- -----------------------------------------------------------------------
ALTER TABLE shortbox.issue
  ADD PRIMARY KEY (id);

-- -----------------------------------------------------------------------
-- Schritt 5.3: FK-Constraint auf variant.fk_issue setzen
-- -----------------------------------------------------------------------
ALTER TABLE shortbox.variant
  ADD CONSTRAINT fk_variant_issue
  FOREIGN KEY (fk_issue)
  REFERENCES shortbox.issue(id)
  ON DELETE CASCADE;

-- -----------------------------------------------------------------------
-- Schritt 5.4: Unique-Constraint auf variant
-- NULL variant_label wird als eindeutig behandelt (Standard-Edition)
-- -----------------------------------------------------------------------
CREATE UNIQUE INDEX uq_variant_issue_format_label
  ON shortbox.variant (fk_issue, format, variant_label)
  NULLS NOT DISTINCT;  -- NULL = NULL für Uniqueness (PostgreSQL 15+)

-- Für PostgreSQL < 15 alternativ:
-- CREATE UNIQUE INDEX uq_variant_issue_format_label
--   ON shortbox.variant (fk_issue, format, COALESCE(variant_label, ''));

-- -----------------------------------------------------------------------
-- Schritt 5.5: FK-Constraint auf cover.fk_variant setzen
-- -----------------------------------------------------------------------
ALTER TABLE shortbox.cover
  ADD CONSTRAINT fk_cover_variant
  FOREIGN KEY (fk_variant)
  REFERENCES shortbox.variant(id)
  ON DELETE SET NULL;

CREATE INDEX idx_cover_fk_variant_number
  ON shortbox.cover (fk_variant, number);

-- -----------------------------------------------------------------------
-- Schritt 5.6: cover.fk_issue entfernen
-- (Erst nach Constraint-Prüfung, daher als letztes)
-- -----------------------------------------------------------------------
DROP INDEX IF EXISTS shortbox.idx_cover_fk_issue_number;
ALTER TABLE shortbox.cover DROP COLUMN IF EXISTS fk_issue;

-- -----------------------------------------------------------------------
-- Schritt 5.7: Temporäre Migrationsspalte auf variant entfernen
-- -----------------------------------------------------------------------
ALTER TABLE shortbox.variant DROP COLUMN IF EXISTS _migration_source_issue_id;

COMMIT;

-- =============================================================================
-- Verifikation nach Script 05
-- =============================================================================

-- 1. issue-Tabelle hat keine Variant-Spalten mehr?
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'shortbox'
  AND table_name = 'issue'
  AND column_name IN (
    'format', 'variant', 'releasedate', 'pages', 'price',
    'currency', 'addinfo', 'verified', 'collected', 'isbn',
    'limitation', 'comicguideid'
  );
-- Erwartetes Ergebnis: 0 Rows

-- 2. variant-Tabelle hat alle erwarteten Spalten?
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'shortbox' AND table_name = 'variant'
ORDER BY ordinal_position;

-- 3. cover-Tabelle hat fk_variant und kein fk_issue mehr?
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'shortbox'
  AND table_name = 'cover'
  AND column_name IN ('fk_issue', 'fk_variant');
-- Erwartetes Ergebnis: nur 'fk_variant'

-- 4. Alle Constraints gesetzt?
SELECT conname, contype
FROM pg_constraint
WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'shortbox')
  AND conname IN ('fk_variant_issue', 'fk_cover_variant', 'uq_variant_issue_format_label');
-- Erwartetes Ergebnis: 3 Rows

-- 5. Finale Übersicht
SELECT
  (SELECT COUNT(*) FROM shortbox.issue)   AS issue_count,
  (SELECT COUNT(*) FROM shortbox.variant) AS variant_count,
  (SELECT COUNT(*) FROM shortbox.cover)   AS cover_count,
  (SELECT COUNT(*) FROM shortbox.story)   AS story_count;
