import { mcpGetStorylineChronology } from "../../../lib/read/mcp-read";

export async function getStorylineChronology(params: {
  arc_id?: number;
  title?: string;
}) {
  const result = await mcpGetStorylineChronology(params);
  if (!result) {
    return {
      message: `Keine Storyline/Event gefunden für ${JSON.stringify(params)}.`,
    };
  }

  const missingIssues = result.issues.filter((i) => !i.isCollected);

  return {
    arc: result.arc,
    collectionStatus: {
      totalIssues: result.totalIssues,
      collectedIssues: result.collectedIssues,
      missingIssuesCount: missingIssues.length,
      completionRate: `${result.completionPercent}%`,
    },
    readingOrder: result.issues.map((iss, idx) => ({
      step: idx + 1,
      usIssue: iss.usIssue,
      isCollected: iss.isCollected,
      availableGermanEditions: iss.germanEditions.map((de) => ({
        series: de.series,
        number: de.number,
        publisher: de.publisher,
        format: de.format,
        collected: de.collected,
        storyTitle: de.storyTitle,
      })),
    })),
  };
}
