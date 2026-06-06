-- =============================================================================
-- Script 04: Nicht-kanonische Issues konsolidieren
-- =============================================================================
-- Laufzeit: Abhängig von Datenmenge (typisch < 60 Sekunden)
-- Vorbedingung: Script 03 erfolgreich ausgeführt
-- Rollback: Komplex – deshalb zuerst die Verifikations-Queries ausführen!
--
-- Was passiert:
--   Für Gruppen mit mehreren Issue-Rows (gleiche fk_series + number) gibt es
--   genau einen "kanonischen" Issue (MIN(id) der Gruppe). Alle anderen
--   Issue-Rows sind Duplikate, die nach der Variant-Migration entfernt werden.
--
--   Vorher müssen deren FKs umgehängt werden:
--     - story.fk_issue
--     - issue_arc.fk_issue
--     - issue_individual.fk_issue
--     - changerequests.fk_issue
--
-- WICHTIG: Dieser Script führt DELETEs durch. Bitte vorher die
--          Verifikations-Queries in Abschnitt "Vorprüfung" ausführen!
-- =============================================================================

-- =============================================================================
-- VORPRÜFUNG: Bitte diese Queries zuerst lesen, bevor BEGIN ausgeführt wird
-- =============================================================================

-- V1: Welche nicht-kanonischen Issues haben Stories?
SELECT
  i.id,
  i.number,
  i.format,
  i.variant,
  i.fk_series,
  COUNT(s.id) AS story_count,
  MIN(i2.id) AS canonical_id
FROM shortbox.issue i
JOIN shortbox.story s ON s.fk_issue = i.id
JOIN shortbox.issue i2
  ON i2.fk_series IS NOT DISTINCT FROM i.fk_series
  AND i2.number = i.number
WHERE i.id != (
  SELECT MIN(id) FROM shortbox.issue
  WHERE fk_series IS NOT DISTINCT FROM i.fk_series
    AND number = i.number
)
GROUP BY i.id, i.number, i.format, i.variant, i.fk_series;
-- Erwartetes Ergebnis: 0 Rows (Stories sollten nur an primären Issues hängen)
-- Wenn Rows erscheinen: Stories werden auf kanonische Issues verschoben (s.u.)

-- V2: Wie viele nicht-kanonische Issue-Rows gibt es?
SELECT COUNT(*) AS non_canonical_count
FROM shortbox.issue
WHERE id NOT IN (
  SELECT MIN(id)
  FROM shortbox.issue
  GROUP BY fk_series, number
);

-- V3: Issue-Arc Konflikte beim Reassign prüfen
-- (Falls ein nicht-kanonischer Issue einen Arc hat, den der kanonische auch hat)
SELECT
  ia.fk_issue AS non_canonical_issue_id,
  ia.fk_arc,
  MIN(i2.id) AS canonical_issue_id
FROM shortbox.issue_arc ia
JOIN shortbox.issue i ON i.id = ia.fk_issue
JOIN shortbox.issue i2
  ON i2.fk_series IS NOT DISTINCT FROM i.fk_series
  AND i2.number = i.number
WHERE ia.fk_issue != (
  SELECT MIN(id) FROM shortbox.issue
  WHERE fk_series IS NOT DISTINCT FROM i.fk_series
    AND number = i.number
)
AND EXISTS (
  SELECT 1 FROM shortbox.issue_arc
  WHERE fk_issue = (
    SELECT MIN(id) FROM shortbox.issue
    WHERE fk_series IS NOT DISTINCT FROM i.fk_series
      AND number = i.number
  )
  AND fk_arc = ia.fk_arc
)
GROUP BY ia.fk_issue, ia.fk_arc;
-- Erwartetes Ergebnis: 0 Rows (Konflikte werden mit ON CONFLICT ignoriert)

-- =============================================================================
-- HAUPTMIGRATION (erst nach Vorprüfung ausführen)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------
-- Schritt 4.1: Stories von nicht-kanonischen Issues auf kanonische umhängen
-- -----------------------------------------------------------------------
UPDATE shortbox.story s
SET fk_issue = canonical.canonical_id
FROM (
  SELECT
    i.id AS original_id,
    (
      SELECT MIN(i2.id)
      FROM shortbox.issue i2
      WHERE i2.fk_series IS NOT DISTINCT FROM i.fk_series
        AND i2.number = i.number
    ) AS canonical_id
  FROM shortbox.issue i
  WHERE i.id != (
    SELECT MIN(id) FROM shortbox.issue
    WHERE fk_series IS NOT DISTINCT FROM i.fk_series
      AND number = i.number
  )
) canonical
WHERE s.fk_issue = canonical.original_id
  AND canonical.original_id != canonical.canonical_id;

-- -----------------------------------------------------------------------
-- Schritt 4.2: IssueArcs von nicht-kanonischen Issues umhängen
-- (ON CONFLICT DO NOTHING: Falls kanonischer Issue den Arc schon hat)
-- -----------------------------------------------------------------------
INSERT INTO shortbox.issue_arc (fk_issue, fk_arc, createdat, updatedat)
SELECT
  (
    SELECT MIN(i2.id)
    FROM shortbox.issue i2
    WHERE i2.fk_series IS NOT DISTINCT FROM i.fk_series
      AND i2.number = i.number
  ) AS fk_issue,
  ia.fk_arc,
  ia.createdat,
  ia.updatedat
FROM shortbox.issue_arc ia
JOIN shortbox.issue i ON i.id = ia.fk_issue
WHERE i.id != (
  SELECT MIN(id) FROM shortbox.issue
  WHERE fk_series IS NOT DISTINCT FROM i.fk_series
    AND number = i.number
)
AND NOT EXISTS (
  SELECT 1 FROM shortbox.issue_arc ia2
  WHERE ia2.fk_issue = (
    SELECT MIN(i3.id)
    FROM shortbox.issue i3
    WHERE i3.fk_series IS NOT DISTINCT FROM i.fk_series
      AND i3.number = i.number
  )
  AND ia2.fk_arc = ia.fk_arc
);

-- Dann die alten nicht-kanonischen Arc-Links löschen
DELETE FROM shortbox.issue_arc ia
USING shortbox.issue i
WHERE ia.fk_issue = i.id
  AND i.id != (
    SELECT MIN(id) FROM shortbox.issue
    WHERE fk_series IS NOT DISTINCT FROM i.fk_series
      AND number = i.number
  );

-- -----------------------------------------------------------------------
-- Schritt 4.3: IssueIndividuals von nicht-kanonischen Issues umhängen
-- -----------------------------------------------------------------------
INSERT INTO shortbox.issue_individual (fk_issue, fk_individual, type, createdat, updatedat)
SELECT
  (
    SELECT MIN(i2.id)
    FROM shortbox.issue i2
    WHERE i2.fk_series IS NOT DISTINCT FROM i.fk_series
      AND i2.number = i.number
  ) AS fk_issue,
  ii.fk_individual,
  ii.type,
  ii.createdat,
  ii.updatedat
FROM shortbox.issue_individual ii
JOIN shortbox.issue i ON i.id = ii.fk_issue
WHERE i.id != (
  SELECT MIN(id) FROM shortbox.issue
  WHERE fk_series IS NOT DISTINCT FROM i.fk_series
    AND number = i.number
)
AND NOT EXISTS (
  SELECT 1 FROM shortbox.issue_individual ii2
  WHERE ii2.fk_issue = (
    SELECT MIN(i3.id)
    FROM shortbox.issue i3
    WHERE i3.fk_series IS NOT DISTINCT FROM i.fk_series
      AND i3.number = i.number
  )
  AND ii2.fk_individual = ii.fk_individual
  AND ii2.type = ii.type
);

DELETE FROM shortbox.issue_individual ii
USING shortbox.issue i
WHERE ii.fk_issue = i.id
  AND i.id != (
    SELECT MIN(id) FROM shortbox.issue
    WHERE fk_series IS NOT DISTINCT FROM i.fk_series
      AND number = i.number
  );

-- -----------------------------------------------------------------------
-- Schritt 4.4: ChangeRequests auf kanonische Issues umhängen
-- -----------------------------------------------------------------------
UPDATE shortbox.changerequests cr
SET fk_issue = canonical.canonical_id::INT
FROM (
  SELECT
    i.id::INT AS original_id,
    (
      SELECT MIN(i2.id)
      FROM shortbox.issue i2
      WHERE i2.fk_series IS NOT DISTINCT FROM i.fk_series
        AND i2.number = i.number
    )::INT AS canonical_id
  FROM shortbox.issue i
  WHERE i.id != (
    SELECT MIN(id) FROM shortbox.issue
    WHERE fk_series IS NOT DISTINCT FROM i.fk_series
      AND number = i.number
  )
) canonical
WHERE cr.fk_issue = canonical.original_id
  AND canonical.original_id != canonical.canonical_id;

-- -----------------------------------------------------------------------
-- Schritt 4.5: Nicht-kanonische Issue-Rows löschen
-- -----------------------------------------------------------------------
DELETE FROM shortbox.issue
WHERE id NOT IN (
  SELECT MIN(id)
  FROM shortbox.issue
  GROUP BY fk_series, number
);

COMMIT;

-- =============================================================================
-- Verifikation nach Script 04
-- =============================================================================

-- 1. Alle Stories zeigen auf gültige Issues?
SELECT COUNT(*) AS orphaned_stories
FROM shortbox.story
WHERE fk_issue IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM shortbox.issue WHERE id = fk_issue);
-- Erwartetes Ergebnis: 0

-- 2. Jede Issue-Row ist jetzt kanonisch (min ID in ihrer Gruppe)?
SELECT COUNT(*) AS non_canonical_remaining
FROM shortbox.issue
WHERE id NOT IN (
  SELECT MIN(id) FROM shortbox.issue GROUP BY fk_series, number
);
-- Erwartetes Ergebnis: 0

-- 3. Variant-FK gültig?
SELECT COUNT(*) AS variants_with_invalid_fk_issue
FROM shortbox.variant
WHERE NOT EXISTS (SELECT 1 FROM shortbox.issue WHERE id = variant.fk_issue);
-- Erwartetes Ergebnis: 0

-- 4. Übersicht Issue vs Variant Counts
SELECT
  (SELECT COUNT(*) FROM shortbox.issue)   AS issue_count,
  (SELECT COUNT(*) FROM shortbox.variant) AS variant_count;
