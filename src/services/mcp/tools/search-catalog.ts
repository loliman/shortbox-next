import { mcpSearchCatalog } from "../../../lib/read/mcp-read";

export async function searchCatalog(params: {
  query: string;
  scope?: "all" | "series" | "issue" | "publisher";
  us?: boolean;
  limit?: number;
}) {
  const results = await mcpSearchCatalog(params);
  if (results.length === 0) {
    return {
      message: `Keine Treffer im Shortbox-Katalog für "${params.query}".`,
      results: [],
    };
  }

  return {
    total: results.length,
    results: results.map((r) => ({
      id: r.id,
      type: r.type,
      label: r.label,
      publisher: r.publisher,
      series: r.seriesTitle,
      volume: r.volume,
      startYear: r.startYear,
      issueNumber: r.issueNumber,
      format: r.format,
      variant: r.variant,
      isUsEdition: r.us,
    })),
  };
}
