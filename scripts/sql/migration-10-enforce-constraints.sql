-- =============================================================================
-- Script 10: Datenbereinigung & Primär-/Fremdschlüssel-Constraints setzen
-- =============================================================================
-- Was passiert:
--   - Test-Publisher und Test-Series (Generiert aus Jest-Integrationstests) werden gelöscht
--   - Verwaiste Einträge in Beziehungstabellen (StoryAppearance, StoryIndividual) werden gelöscht
--   - Verwaiste Fremdschlüssel-Felder (z.B. story.fk_parent) werden auf NULL gesetzt
--   - Primärschlüssel-Constraints (PRIMARY KEY) werden für alle Basistabellen erstellt
--   - Fremdschlüssel-Constraints (FOREIGN KEY) werden erstellt zur Sicherung der referentiellen Integrität
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Schritt 10.1: Testdaten löschen
-- -----------------------------------------------------------------------------
DELETE FROM shortbox.publisher WHERE name LIKE 'Test Pub%';
DELETE FROM shortbox.series WHERE title LIKE 'Test Series%';

-- -----------------------------------------------------------------------------
-- Schritt 10.2: Verwaiste Zeilen in Assoziationstabellen löschen
-- -----------------------------------------------------------------------------
DELETE FROM shortbox.story_appearance 
WHERE fk_story NOT IN (SELECT id FROM shortbox.story)
   OR fk_appearance NOT IN (SELECT id FROM shortbox.appearance);

DELETE FROM shortbox.story_individual 
WHERE fk_story NOT IN (SELECT id FROM shortbox.story)
   OR fk_individual NOT IN (SELECT id FROM shortbox.individual);

DELETE FROM shortbox.issue_arc 
WHERE fk_issue NOT IN (SELECT id FROM shortbox.issue)
   OR fk_arc NOT IN (SELECT id FROM shortbox.arc);

DELETE FROM shortbox.issue_individual 
WHERE fk_issue NOT IN (SELECT id FROM shortbox.issue)
   OR fk_individual NOT IN (SELECT id FROM shortbox.individual);

DELETE FROM shortbox.cover_individual 
WHERE fk_cover NOT IN (SELECT id FROM shortbox.cover)
   OR fk_individual NOT IN (SELECT id FROM shortbox.individual);

-- -----------------------------------------------------------------------------
-- Schritt 10.3: Verwaiste Fremdschlüssel-Referenzen auf NULL setzen
-- -----------------------------------------------------------------------------
UPDATE shortbox.story SET fk_parent = NULL WHERE fk_parent NOT IN (SELECT id FROM shortbox.story);
UPDATE shortbox.story SET fk_reprint = NULL WHERE fk_reprint NOT IN (SELECT id FROM shortbox.story);
UPDATE shortbox.story SET fk_issue = NULL WHERE fk_issue NOT IN (SELECT id FROM shortbox.issue);

UPDATE shortbox.series SET fk_publisher = NULL WHERE fk_publisher NOT IN (SELECT id FROM shortbox.publisher);

UPDATE shortbox.issue SET fk_series = NULL WHERE fk_series NOT IN (SELECT id FROM shortbox.series);
UPDATE shortbox.issue SET fk_publisher = NULL WHERE fk_publisher NOT IN (SELECT id FROM shortbox.publisher);

UPDATE shortbox.cover SET fk_parent = NULL WHERE fk_parent NOT IN (SELECT id FROM shortbox.cover);
UPDATE shortbox.cover SET fk_variant = NULL WHERE fk_variant NOT IN (SELECT id FROM shortbox.variant);

-- -----------------------------------------------------------------------------
-- Schritt 10.4: Primärschlüssel (Primary Keys) auf Basistabellen setzen
-- -----------------------------------------------------------------------------
ALTER TABLE shortbox.publisher ADD PRIMARY KEY (id);
ALTER TABLE shortbox.series ADD PRIMARY KEY (id);
ALTER TABLE shortbox.user ADD PRIMARY KEY (id);
ALTER TABLE shortbox.appearance ADD PRIMARY KEY (id);
ALTER TABLE shortbox.arc ADD PRIMARY KEY (id);
ALTER TABLE shortbox.cover ADD PRIMARY KEY (id);
ALTER TABLE shortbox.individual ADD PRIMARY KEY (id);

-- -----------------------------------------------------------------------------
-- Schritt 10.5: Primärschlüssel (Primary Keys) auf Beziehungs- / Join-Tabellen setzen
-- -----------------------------------------------------------------------------
ALTER TABLE shortbox.story_appearance ADD PRIMARY KEY (fk_appearance, fk_story, role);
ALTER TABLE shortbox.story_individual ADD PRIMARY KEY (fk_story, fk_individual, type);
ALTER TABLE shortbox.issue_arc ADD PRIMARY KEY (fk_issue, fk_arc);
ALTER TABLE shortbox.issue_individual ADD PRIMARY KEY (fk_issue, fk_individual, type);
ALTER TABLE shortbox.cover_individual ADD PRIMARY KEY (fk_cover, fk_individual, type);

-- -----------------------------------------------------------------------------
-- Schritt 10.6: Fremdschlüssel-Constraints (Foreign Keys) setzen
-- -----------------------------------------------------------------------------

-- series -> publisher
ALTER TABLE shortbox.series 
  ADD CONSTRAINT fk_series_publisher 
  FOREIGN KEY (fk_publisher) REFERENCES shortbox.publisher(id) ON DELETE NO ACTION;

-- series_genre -> series
ALTER TABLE shortbox.series_genre
  ADD CONSTRAINT fk_series_genre_series
  FOREIGN KEY (fk_series) REFERENCES shortbox.series(id) ON DELETE CASCADE;

-- issue -> series
ALTER TABLE shortbox.issue 
  ADD CONSTRAINT fk_issue_series 
  FOREIGN KEY (fk_series) REFERENCES shortbox.series(id) ON DELETE NO ACTION;

-- issue -> publisher
ALTER TABLE shortbox.issue 
  ADD CONSTRAINT fk_issue_publisher 
  FOREIGN KEY (fk_publisher) REFERENCES shortbox.publisher(id) ON DELETE NO ACTION;

-- story -> issue
ALTER TABLE shortbox.story 
  ADD CONSTRAINT fk_story_issue 
  FOREIGN KEY (fk_issue) REFERENCES shortbox.issue(id) ON DELETE NO ACTION;

-- story -> parent story
ALTER TABLE shortbox.story 
  ADD CONSTRAINT fk_story_parent 
  FOREIGN KEY (fk_parent) REFERENCES shortbox.story(id) ON DELETE NO ACTION;

-- story -> reprint story
ALTER TABLE shortbox.story 
  ADD CONSTRAINT fk_story_reprint 
  FOREIGN KEY (fk_reprint) REFERENCES shortbox.story(id) ON DELETE NO ACTION;

-- story_appearance -> appearance
ALTER TABLE shortbox.story_appearance 
  ADD CONSTRAINT fk_story_appearance_appearance 
  FOREIGN KEY (fk_appearance) REFERENCES shortbox.appearance(id) ON DELETE NO ACTION;

-- story_appearance -> story
ALTER TABLE shortbox.story_appearance 
  ADD CONSTRAINT fk_story_appearance_story 
  FOREIGN KEY (fk_story) REFERENCES shortbox.story(id) ON DELETE NO ACTION;

-- story_individual -> story
ALTER TABLE shortbox.story_individual 
  ADD CONSTRAINT fk_story_individual_story 
  FOREIGN KEY (fk_story) REFERENCES shortbox.story(id) ON DELETE NO ACTION;

-- story_individual -> individual
ALTER TABLE shortbox.story_individual 
  ADD CONSTRAINT fk_story_individual_individual 
  FOREIGN KEY (fk_individual) REFERENCES shortbox.individual(id) ON DELETE NO ACTION;

-- issue_arc -> issue
ALTER TABLE shortbox.issue_arc 
  ADD CONSTRAINT fk_issue_arc_issue 
  FOREIGN KEY (fk_issue) REFERENCES shortbox.issue(id) ON DELETE NO ACTION;

-- issue_arc -> arc
ALTER TABLE shortbox.issue_arc 
  ADD CONSTRAINT fk_issue_arc_arc 
  FOREIGN KEY (fk_arc) REFERENCES shortbox.arc(id) ON DELETE NO ACTION;

-- issue_individual -> issue
ALTER TABLE shortbox.issue_individual 
  ADD CONSTRAINT fk_issue_individual_issue 
  FOREIGN KEY (fk_issue) REFERENCES shortbox.issue(id) ON DELETE NO ACTION;

-- issue_individual -> individual
ALTER TABLE shortbox.issue_individual 
  ADD CONSTRAINT fk_issue_individual_individual 
  FOREIGN KEY (fk_individual) REFERENCES shortbox.individual(id) ON DELETE NO ACTION;

-- cover -> parent cover
ALTER TABLE shortbox.cover 
  ADD CONSTRAINT fk_cover_parent 
  FOREIGN KEY (fk_parent) REFERENCES shortbox.cover(id) ON DELETE NO ACTION;

-- cover_individual -> cover
ALTER TABLE shortbox.cover_individual 
  ADD CONSTRAINT fk_cover_individual_cover 
  FOREIGN KEY (fk_cover) REFERENCES shortbox.cover(id) ON DELETE NO ACTION;

-- cover_individual -> individual
ALTER TABLE shortbox.cover_individual 
  ADD CONSTRAINT fk_cover_individual_individual 
  FOREIGN KEY (fk_individual) REFERENCES shortbox.individual(id) ON DELETE NO ACTION;

COMMIT;
