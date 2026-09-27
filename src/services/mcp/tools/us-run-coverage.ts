import { mcpAnalyzeUsRunCoverage } from "../../../lib/read/mcp-read";
import { compactNumberRanges } from "../range-formatter";

export async function analyzeUsRunCoverage(params: {
  us_series_id?: number;
  us_series_title?: string;
  start_number?: number;
  end_number?: number;
}) {
  const result = await mcpAnalyzeUsRunCoverage(params);
  if (!result) {
    return {
      message: `Keine US-Serie gefunden für ${JSON.stringify(params)}.`,
    };
  }

  const total = result.runRange.totalRequested;
  const collectedCount = result.collectedNumbers.length;
  const uncollectedCount = result.availableUncollectedNumbers.length;
  const untranslatedCount = result.neverTranslatedNumbers.length;

  const collectedPercent = total > 0 ? Math.round((collectedCount / total) * 100) : 0;
  const uncollectedPercent = total > 0 ? Math.round((uncollectedCount / total) * 100) : 0;
  const untranslatedPercent = total > 0 ? Math.round((untranslatedCount / total) * 100) : 0;

  return {
    usSeries: result.usSeries,
    requestedRange: {
      from: result.runRange.start,
      to: result.runRange.end,
      totalIssuesInRange: total,
    },
    coverageSummary: {
      collectedInCollection: `${collectedCount} (${collectedPercent}%)`,
      availableInGermanButMissing: `${uncollectedCount} (${uncollectedPercent}%)`,
      neverTranslatedToGerman: `${untranslatedCount} (${untranslatedPercent}%)`,
    },
    numberBlocks: {
      collectedNumbers: compactNumberRanges(result.collectedNumbers),
      missingAvailableNumbers: compactNumberRanges(result.availableUncollectedNumbers),
      neverTranslatedNumbers: compactNumberRanges(result.neverTranslatedNumbers),
    },
    gapShoppingList: result.details
      .filter((d) => d.status === "AVAILABLE_UNCOLLECTED")
      .map((d) => ({
        usNumber: d.usNumber,
        germanOptions: d.germanPublications.map((g) => ({
          series: g.series,
          number: g.number,
          publisher: g.publisher,
          format: g.format,
        })),
      })),
  };
}
