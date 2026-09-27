import { mcpSearchDeepCatalog } from "../../../lib/read/mcp-read";

export async function searchDeepCatalog(params: {
  query: string;
  types?: Array<"all" | "series" | "issue" | "character" | "arc" | "creator" | "story">;
  us?: boolean;
  limit?: number;
}) {
  const result = await mcpSearchDeepCatalog(params);

  if (result.totalMatches === 0) {
    return {
      message: `Keine Treffer im gesamten Shortbox-Katalog für "${params.query}".`,
      totalMatches: 0,
      characters: [],
      arcs: [],
      creators: [],
      stories: [],
      publications: [],
    };
  }

  return {
    query: result.query,
    totalMatches: result.totalMatches,
    summary: [
      result.characters.length > 0 ? `${result.characters.length} Charaktere` : null,
      result.arcs.length > 0 ? `${result.arcs.length} Storylines/Events` : null,
      result.creators.length > 0 ? `${result.creators.length} Kreative/Künstler` : null,
      result.stories.length > 0 ? `${result.stories.length} Story-Titel` : null,
      result.publications.length > 0 ? `${result.publications.length} Serien/Hefte` : null,
    ]
      .filter(Boolean)
      .join(", "),
    characters: result.characters,
    arcs: result.arcs,
    creators: result.creators,
    stories: result.stories,
    publications: result.publications,
  };
}
