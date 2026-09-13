-- PR 3: Category B — SeriesGenre normalisation.
-- Creates shortbox.series_genre as a flat join table that replaces the CSV in
-- shortbox.series.genre for filter purposes. shortbox.series.genre stays as the
-- human-readable source; this table is a query accelerator.
--
-- A one-time backfill at the bottom of the script populates the table from the
-- current series.genre CSVs for both de and us series. Subsequent maintenance
-- for de series happens via the extended update-de-series-genres admin task.
-- us series.genre is not mutated by the app, so the rows stay in sync as long
-- as the CSV stays put.
--
-- Idempotent: the script is safe to re-apply. The INSERT skips rows that are
-- already present (matched case-insensitively).
BEGIN;

CREATE TABLE IF NOT EXISTS shortbox.series_genre (
  id        BIGSERIAL PRIMARY KEY,
  fk_series BIGINT NOT NULL REFERENCES shortbox.series (id) ON DELETE CASCADE,
  genre     VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_series_genre_fk_series
  ON shortbox.series_genre (fk_series);

CREATE INDEX IF NOT EXISTS idx_series_genre_genre_lower
  ON shortbox.series_genre (lower(genre));

INSERT INTO shortbox.series_genre (fk_series, genre)
SELECT s.id, TRIM(token) AS genre
FROM shortbox.series s,
     LATERAL unnest(string_to_array(COALESCE(s.genre, ''), ',')) AS token
WHERE TRIM(token) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM shortbox.series_genre sg
    WHERE sg.fk_series = s.id
      AND lower(sg.genre) = lower(TRIM(token))
  );

COMMIT;
