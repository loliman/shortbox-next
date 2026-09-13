import { mcpResolveStoryPublications } from "../../../lib/read/mcp-read";

export async function resolveStoryPublications(params: {
  issue_id: number;
}) {
  const result = await mcpResolveStoryPublications(params);
  if (!result) {
    return {
      error: `Kein Heft mit ID ${params.issue_id} gefunden.`,
    };
  }

  const { sourceIssue, publications } = result;
  const collectedCount = publications.filter((p) => p.collected).length;

  return {
    sourceIssue: {
      id: sourceIssue.id,
      number: sourceIssue.number,
      title: sourceIssue.title,
      series: sourceIssue.series,
      volume: sourceIssue.volume,
      publisher: sourceIssue.publisher,
      edition: sourceIssue.isUs ? "US-Originalausgabe" : "Deutsche Ausgabe",
      storiesCount: sourceIssue.storiesCount,
    },
    publicationsSummary: sourceIssue.isUs
      ? `Erschienen in ${publications.length} deutschen Veröffentlichungen (${collectedCount} davon in deiner Sammlung).`
      : `Verwandte US-Originale und deutsche Nachdrucke: ${publications.length} (${collectedCount} davon in deiner Sammlung).`,
    publications: publications.map((p) => ({
      issueId: p.issueId,
      series: p.series,
      volume: p.volume,
      publisher: p.publisher,
      number: p.number,
      title: p.title,
      edition: p.isUs ? "US" : "DE",
      collected: p.collected,
      status: p.collected ? "IN DER SAMMLUNG" : "FEHLT",
      formats: p.formats,
      matchingStories: p.matchingStories,
    })),
  };
}
