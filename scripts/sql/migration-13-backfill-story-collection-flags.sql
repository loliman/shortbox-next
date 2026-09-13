WITH story_collected_counts AS (
  SELECT 
    COALESCE(s.fk_parent, s.id) AS parent_id,
    COUNT(v.id) AS collected_count
  FROM shortbox.story s
  JOIN shortbox.variant v ON v.fk_issue = s.fk_issue
  WHERE v.collected = true
  GROUP BY COALESCE(s.fk_parent, s.id)
)
UPDATE shortbox.story s
SET 
  collected = s_data.collected_count > 0,
  collectedmultipletimes = s_data.collected_count >= 2
FROM (
  SELECT 
    s_inner.id,
    COALESCE(scc_inner.collected_count, 0) AS collected_count
  FROM shortbox.story s_inner
  LEFT JOIN story_collected_counts scc_inner ON scc_inner.parent_id = COALESCE(s_inner.fk_parent, s_inner.id)
) s_data
WHERE s.id = s_data.id;
