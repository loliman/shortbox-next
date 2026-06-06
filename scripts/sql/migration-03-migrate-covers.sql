-- =============================================================================
-- Script 03: Covers von Issue auf Variant umhängen
-- =============================================================================
-- Laufzeit: Abhängig von Cover-Anzahl (typisch < 10 Sekunden)
-- Vorbedingung: Script 02 erfolgreich ausgeführt
-- Rollback: ALTER TABLE shortbox.cover DROP COLUMN fk_variant;
--
-- Was passiert:
--   cover.fk_issue → cover.fk_variant
--   Jedes Cover zeigt danach auf das Variant, das dem ursprünglichen Issue
--   entspricht (via _migration_source_issue_id).
-- =============================================================================

BEGIN;

-- Schritt 3.1: fk_variant-Spalte zu cover hinzufügen
ALTER TABLE shortbox.cover
  ADD COLUMN fk_variant BIGINT;

-- Schritt 3.2: fk_variant befüllen via _migration_source_issue_id
UPDATE shortbox.cover c
SET fk_variant = v.id
FROM shortbox.variant v
WHERE v._migration_source_issue_id = c.fk_issue;

COMMIT;

-- =============================================================================
-- Verifikation nach Script 03
-- =============================================================================

-- 1. Wie viele Covers haben kein fk_variant gesetzt?
SELECT COUNT(*) AS covers_without_variant
FROM shortbox.cover
WHERE fk_variant IS NULL AND fk_issue IS NOT NULL;
-- Erwartetes Ergebnis: 0 (alle Covers die ein fk_issue hatten bekommen fk_variant)

-- 2. Wie viele Covers haben kein fk_issue (Parent-Covers ohne Issue-Zuordnung)?
SELECT COUNT(*) AS covers_without_issue
FROM shortbox.cover
WHERE fk_issue IS NULL;
-- Diese Covers hatten schon vorher kein Issue – fk_variant bleibt NULL, das ist OK.

-- 3. Stichprobe
SELECT
  c.id,
  c.fk_issue,
  c.fk_variant,
  c.url,
  v.format,
  v.variant_label
FROM shortbox.cover c
LEFT JOIN shortbox.variant v ON v.id = c.fk_variant
ORDER BY c.id
LIMIT 20;
