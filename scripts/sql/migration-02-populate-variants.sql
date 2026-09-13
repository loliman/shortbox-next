-- =============================================================================
-- Script 02: Variant-Daten aus Issue befüllen
-- =============================================================================
-- Laufzeit: Abhängig von Datenmenge (typisch < 30 Sekunden)
-- Vorbedingung: Script 01 erfolgreich ausgeführt
-- Rollback: TRUNCATE shortbox.variant;
--
-- Was passiert:
--   Jeder bestehende Issue-Row wird zu einem Variant.
--   fk_issue zeigt auf das "kanonische Issue" der Gruppe (niedrigste ID
--   in der (fk_series, number)-Gruppe). Dieses Issue behält seine ID.
--
-- Nach diesem Script:
--   - variant-Tabelle enthält für jeden alten Issue-Row einen Eintrag
--   - _migration_source_issue_id zeigt auf die alte Issue-ID
--   - fk_issue zeigt auf das kanonische Issue der Gruppe
-- =============================================================================

BEGIN;

INSERT INTO shortbox.variant (
  fk_issue,
  format,
  variant_label,
  releasedate,
  pages,
  price,
  currency,
  addinfo,
  verified,
  collected,
  isbn,
  limitation,
  comicguideid,
  createdat,
  updatedat,
  _migration_source_issue_id
)
SELECT
  -- fk_issue: kanonisches Issue der Gruppe (niedrigste ID)
  (
    SELECT MIN(i2.id)
    FROM shortbox.issue i2
    WHERE i2.fk_series IS NOT DISTINCT FROM i.fk_series
      AND i2.number = i.number
  )                                         AS fk_issue,

  COALESCE(TRIM(i.format), '')              AS format,
  NULLIF(TRIM(COALESCE(i.variant, '')), '') AS variant_label,
  i.releasedate,
  i.pages,
  i.price,
  NULLIF(TRIM(COALESCE(i.currency, '')), '') AS currency,
  NULLIF(TRIM(COALESCE(i.addinfo, '')), '')  AS addinfo,
  i.verified,
  i.collected,
  NULLIF(TRIM(COALESCE(i.isbn, '')), '')     AS isbn,
  i.limitation,
  CASE WHEN i.comicguideid = 0 THEN NULL ELSE i.comicguideid END AS comicguideid,
  i.createdat,
  i.updatedat,
  i.id                                      AS _migration_source_issue_id

FROM shortbox.issue i
ORDER BY i.id;  -- Reihenfolge für Reproduzierbarkeit

COMMIT;

-- =============================================================================
-- Verifikation nach Script 02
-- =============================================================================

-- 1. Gleiche Anzahl Variants wie Issues?
SELECT
  (SELECT COUNT(*) FROM shortbox.issue)   AS issue_count,
  (SELECT COUNT(*) FROM shortbox.variant) AS variant_count;

-- 2. Alle Variants haben ein gültiges fk_issue?
SELECT COUNT(*)
FROM shortbox.variant v
WHERE NOT EXISTS (SELECT 1 FROM shortbox.issue i WHERE i.id = v.fk_issue);
-- Erwartetes Ergebnis: 0

-- 3. Wie viele Issues haben mehr als eine Variant?
SELECT fk_issue, COUNT(*) AS variant_count
FROM shortbox.variant
GROUP BY fk_issue
HAVING COUNT(*) > 1
ORDER BY variant_count DESC
LIMIT 20;

-- 4. Stichprobe: Einige Variant-Rows prüfen
SELECT
  v.id,
  v.fk_issue,
  v._migration_source_issue_id,
  v.format,
  v.variant_label,
  i.number,
  i.title
FROM shortbox.variant v
JOIN shortbox.issue i ON i.id = v.fk_issue
ORDER BY v.fk_issue, v.format, v.variant_label
LIMIT 30;
