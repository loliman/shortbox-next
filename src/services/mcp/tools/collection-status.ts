import { mcpCheckCollectionStatus } from "../../../lib/read/mcp-read";
import { compactNumberRanges } from "../range-formatter";

export async function checkCollectionStatus(params: {
  issue_id?: number;
  series_id?: number;
}) {
  const status = await mcpCheckCollectionStatus(params);
  if (!status) {
    return {
      error: "Entität nicht gefunden. Bitte prüfe die übergebene ID.",
    };
  }

  if (status.type === "issue") {
    return {
      type: "issue",
      id: status.id,
      series: status.series,
      seriesId: status.seriesId,
      volume: status.volume,
      publisher: status.publisher,
      number: status.number,
      title: status.title,
      isUsEdition: status.isUs,
      collected: status.collected,
      statusSummary: status.collected
        ? `In der Sammlung (${status.collectedVariants.map((v) => v.format + (v.variantLabel ? ` [${v.variantLabel}]` : "")).join(", ")})`
        : "Nicht in der Sammlung",
      ownedVariants: status.collectedVariants,
      totalVariantsAvailable: status.allVariantsCount,
      flags: status.flags,
    };
  }

  // Series
  return {
    type: "series",
    id: status.id,
    title: status.title,
    volume: status.volume,
    publisher: status.publisher,
    startYear: status.startYear,
    isUsEdition: status.isUs,
    totalIssues: status.totalIssues,
    collectedCount: status.collectedCount,
    missingCount: status.missingCount,
    completionPercent: `${status.completionPercent}%`,
    isComplete: status.isComplete,
    missingIssuesSummary: compactNumberRanges(status.missingNumbers),
    ownedIssuesSummary: compactNumberRanges(status.collectedNumbers),
  };
}
