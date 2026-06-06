-- =============================================================================
-- Script 06: Gesamtverifikation (Read-Only)
-- =============================================================================
-- Laufzeit: < 5 Sekunden
-- Vorbedingung: Scripts 01–05 erfolgreich ausgeführt
-- Rollback: Nicht nötig, nur lesend
--
-- Diesen Script NACH der gesamten Migration ausführen, um die Datenintegrität
-- zu prüfen. Alle Queries sollten die erwarteten Ergebnisse liefern.
-- =============================================================================

-- =============================================================================
-- 1. TABELLENSTRUKTUR
-- =============================================================================

-- 1.1 issue-Spalten (sollte KEINE Variant-Spalten enthalten)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'shortbox' AND table_name = 'issue'
ORDER BY ordinal_position;

-- 1.2 variant-Spalten
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'shortbox' AND table_name = 'variant'
ORDER BY ordinal_position;

-- 1.3 cover-Spalten (fk_issue sollte fehlen, fk_variant vorhanden)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'shortbox'
  AND table_name = 'cover'
  AND column_name IN ('fk_issue', 'fk_variant');

-- =============================================================================
-- 2. DATENINTEGRITÄT
-- =============================================================================

-- 2.1 Keine verwaisten Variants (fk_issue zeigt auf nicht-existentes Issue)
SELECT COUNT(*) AS orphaned_variants
FROM shortbox.variant v
WHERE NOT EXISTS (SELECT 1 FROM shortbox.issue i WHERE i.id = v.fk_issue);
-- Erwartetes Ergebnis: 0

-- 2.2 Keine verwaisten Stories
SELECT COUNT(*) AS orphaned_stories
FROM shortbox.story s
WHERE fk_issue IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM shortbox.issue i WHERE i.id = s.fk_issue);
-- Erwartetes Ergebnis: 0

-- 2.3 Keine verwaisten Covers (fk_variant zeigt auf nicht-existentes Variant)
SELECT COUNT(*) AS orphaned_covers
FROM shortbox.cover c
WHERE fk_variant IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM shortbox.variant v WHERE v.id = c.fk_variant);
-- Erwartetes Ergebnis: 0

-- 2.4 Covers ohne fk_variant UND ohne fk_parent (echte Waisen?)
SELECT COUNT(*) AS covers_without_any_parent
FROM shortbox.cover
WHERE fk_variant IS NULL AND fk_parent IS NULL;
-- Diese Covers existierten vorher auch schon ohne Issue-Zuordnung.
-- Nur informativ, kein Fehlerindikator.

-- 2.5 Keine doppelten IssueArcs auf kanonischen Issues
SELECT fk_issue, fk_arc, COUNT(*) AS cnt
FROM shortbox.issue_arc
GROUP BY fk_issue, fk_arc
HAVING COUNT(*) > 1;
-- Erwartetes Ergebnis: 0 Rows

-- =============================================================================
-- 3. DATENVOLLSTÄNDIGKEIT
-- =============================================================================

-- 3.1 Anzahl Issues, Variants, Stories, Covers
SELECT
  (SELECT COUNT(*) FROM shortbox.issue)          AS issues,
  (SELECT COUNT(*) FROM shortbox.variant)        AS variants,
  (SELECT COUNT(*) FROM shortbox.story)          AS stories,
  (SELECT COUNT(*) FROM shortbox.cover)          AS covers,
  (SELECT COUNT(*) FROM shortbox.issue_arc)      AS issue_arcs,
  (SELECT COUNT(*) FROM shortbox.issue_individual) AS issue_individuals;

-- 3.2 Issues nach Variant-Anzahl
SELECT
  variant_count,
  COUNT(*) AS issue_count
FROM (
  SELECT fk_issue, COUNT(*) AS variant_count
  FROM shortbox.variant
  GROUP BY fk_issue
) sub
GROUP BY variant_count
ORDER BY variant_count;

-- 3.3 Varianten mit mehr als einer Variante (Format-Überblick)
SELECT
  i.number,
  i.title,
  s.title AS series,
  COUNT(v.id) AS variant_count,
  STRING_AGG(
    CONCAT(v.format, COALESCE(' / ' || v.variant_label, '')),
    ', '
    ORDER BY v.format, v.variant_label
  ) AS variants
FROM shortbox.variant v
JOIN shortbox.issue i ON i.id = v.fk_issue
JOIN shortbox.series s ON s.id = i.fk_series
GROUP BY i.id, i.number, i.title, s.title
HAVING COUNT(v.id) > 1
ORDER BY variant_count DESC
LIMIT 10;

-- 3.4 Variants mit Covers
SELECT
  COUNT(*) FILTER (WHERE cover_count = 0) AS variants_without_cover,
  COUNT(*) FILTER (WHERE cover_count > 0) AS variants_with_cover,
  MAX(cover_count) AS max_covers_per_variant
FROM (
  SELECT v.id, COUNT(c.id) AS cover_count
  FROM shortbox.variant v
  LEFT JOIN shortbox.cover c ON c.fk_variant = v.id
  GROUP BY v.id
) sub;

-- =============================================================================
-- 4. STICHPROBEN
-- =============================================================================

-- 4.1 Beispiel-Issue mit Variants und Stories
SELECT
  i.id AS issue_id,
  i.number,
  i.title,
  s.title AS series,
  (SELECT COUNT(*) FROM shortbox.story WHERE fk_issue = i.id) AS story_count,
  (SELECT COUNT(*) FROM shortbox.variant WHERE fk_issue = i.id) AS variant_count
FROM shortbox.issue i
JOIN shortbox.series s ON s.id = i.fk_series
WHERE EXISTS (
  SELECT 1 FROM shortbox.variant WHERE fk_issue = i.id
)
AND EXISTS (
  SELECT 1 FROM shortbox.story WHERE fk_issue = i.id
)
LIMIT 5;

-- 4.2 Alle Variants des ersten Issues aus der Stichprobe
SELECT
  v.id,
  v.fk_issue,
  v.format,
  v.variant_label,
  v.price,
  v.releasedate,
  v.collected,
  (SELECT COUNT(*) FROM shortbox.cover WHERE fk_variant = v.id) AS cover_count
FROM shortbox.variant v
WHERE v.fk_issue = (
  SELECT i.id FROM shortbox.issue i
  WHERE EXISTS (SELECT 1 FROM shortbox.variant WHERE fk_issue = i.id)
    AND EXISTS (SELECT 1 FROM shortbox.story WHERE fk_issue = i.id)
  LIMIT 1
)
ORDER BY v.format, v.variant_label;
