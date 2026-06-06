import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  mcpListPublishers,
  mcpListSeries,
  mcpListIssues,
  mcpGetSeriesDetails,
  mcpGetIssueDetails,
} from "../../lib/read/mcp-read";
import { getCollectionStats } from "./tools/collection-stats";
import { findSellableReprints } from "./tools/sellable-reprints";
import { findDuplicateVariants } from "./tools/duplicate-variants";

/**
 * Creates and configures the Shortbox MCP server with all tools.
 * Must be called server-side only (Next.js API route context).
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "shortbox",
    version: "2.0.0",
  });

  // ── API-style tools ──────────────────────────────────────────────────────

  server.tool(
    "list_publishers",
    "Listet alle Verlage auf (deutsch oder US) mit Statistik. Unterstützt LIKE-Suche, z.B. 'Panini' findet alle Panini-Imprints.",
    {
      name_pattern: z.string().optional().describe("LIKE-Suche im Verlagsnamen, z.B. 'Panini'"),
      original: z.boolean().optional().describe("true = US-Verlage, false = deutsche Verlage"),
    },
    async (params) => {
      const result = await mcpListPublishers(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "list_series",
    "Listet Serien auf mit Vollständigkeitsstatistik. Unterstützt LIKE-Suche für Verlage (z.B. 'Panini' = alle Imprints) und Filterung nach Startjahr und Vollständigkeit.",
    {
      publisher_pattern: z.string().optional().describe("LIKE-Suche, z.B. 'Panini' für alle Panini-Imprints"),
      title_pattern: z.string().optional().describe("Serientitel (Teilstring)"),
      start_year_from: z.number().int().optional().describe("Serien, die dieses Jahr oder später starteten"),
      start_year_to: z.number().int().optional().describe("Serien, die dieses Jahr oder früher starteten"),
      is_complete: z.boolean().optional().describe("true = nur vollständig gesammelte Serien, false = nur unvollständige"),
      min_collected: z.number().int().min(0).optional().describe("Mindestanzahl gesammelter Hefte (Standard: 0)"),
      sort_by: z.enum(["completion", "missing", "name", "start_year"]).optional().describe("Sortierung"),
      limit: z.number().int().min(1).max(200).optional().describe("Max. Ergebnisse (Standard: 50)"),
    },
    async (params) => {
      const result = await mcpListSeries(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "list_issues",
    [
      "Sucht Hefte mit umfangreichen Filtern. Kernfeatures:",
      "- publisher_pattern: LIKE-Suche, 'Panini' matcht alle Panini-Imprints als einen Verlag",
      "- series_start_year_from/to: Serien-Startjahr (z.B. ab 2025 = neue Serien)",
      "- exclude_formats: Formate ausschließen (z.B. ['Hardcover'])",
      "- series_is_complete: false = nur Hefte aus unvollständigen Serien (Reihen nicht auseinanderreißen)",
      "- is_reprint_only: nur Hefte, bei denen alle Stories bereits anderswo auf Deutsch erschienen",
      "- has_first_print: false = keine Hefte mit Erstveröffentlichungen",
    ].join(" "),
    {
      publisher_pattern: z.string().optional().describe("LIKE-Suche, z.B. 'Panini'"),
      series_title: z.string().optional().describe("Serientitel (Teilstring)"),
      series_start_year_from: z.number().int().optional().describe("Startjahr der deutschen Serie ab (z.B. 2025)"),
      series_start_year_to: z.number().int().optional().describe("Startjahr der deutschen Serie bis (z.B. 2024)"),
      us_series_start_year_from: z.number().int().optional().describe(
        "Filtert deutsche Hefte: ALLE enthaltenen Stories müssen aus US-Serien stammen, deren startYear >= diesem Wert ist. Stories ohne US-Parent schließen das Heft aus."
      ),
      us_series_start_year_to: z.number().int().optional().describe(
        "Filtert deutsche Hefte: ALLE enthaltenen Stories müssen aus US-Serien stammen, deren startYear <= diesem Wert ist."
      ),
      number: z.string().optional().describe("Genaue Heftnummer"),
      collected: z.boolean().optional().describe("true = gesammelt, false = nicht gesammelt"),
      formats: z.array(z.string()).optional().describe("Nur diese Formate (Whitelist)"),
      exclude_formats: z.array(z.string()).optional().describe("Diese Formate ausschließen, z.B. ['Hardcover']"),
      is_reprint_only: z.boolean().optional().describe("Nur vollständige Nachdrucke"),
      has_first_print: z.boolean().optional().describe("Hat Erstveröffentlichung"),
      has_only_print: z.boolean().optional().describe("Hat einzige Veröffentlichung"),
      series_is_complete: z.boolean().optional().describe("true = nur aus vollständig gesammelten Serien, false = nur aus unvollständigen (verhindert Reihen auseinanderreißen)"),
      original: z.boolean().optional().describe("true = US-Comics, false = deutsche Ausgaben"),
      limit: z.number().int().min(1).max(200).optional().describe("Max. Ergebnisse (Standard: 50)"),
    },
    async (params) => {
      const result = await mcpListIssues(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "get_series_details",
    "Gibt eine Serie vollständig zurück: alle Hefte mit Sammlungsstatus und Flags. Nützlich um zu prüfen ob eine Serie vollständig ist.",
    {
      series_id: z.number().int().optional().describe("Serien-ID"),
      title: z.string().optional().describe("Serientitel (Teilstring)"),
      publisher_pattern: z.string().optional().describe("Verlag (LIKE)"),
      volume: z.number().int().optional().describe("Volume-Nummer"),
    },
    async (params) => {
      const result = await mcpGetSeriesDetails(params);
      if (!result) {
        return { content: [{ type: "text", text: "Keine Serie gefunden." }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "get_issue_details",
    "Gibt ein Heft vollständig zurück: Format, Variante, Flags und alle enthaltenen Stories mit Erst-/Nachdruckstatus.",
    {
      issue_id: z.number().int().describe("Heft-ID"),
    },
    async ({ issue_id }) => {
      const result = await mcpGetIssueDetails(issue_id);
      if (!result) {
        return { content: [{ type: "text", text: "Kein Heft gefunden." }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── Convenience tools ────────────────────────────────────────────────────

  server.tool(
    "get_collection_stats",
    "Schnellübersicht: Gesamtanzahl Hefte, gesammelt/fehlend, aufgeteilt nach Verlag.",
    {},
    async () => {
      const result = await getCollectionStats();
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "find_sellable_reprints",
    "Findet gesammelte Hefte, bei denen alle Stories bereits früher in anderen deutschen Ausgaben erschienen sind (is_reprint_only=true). Diese können verkauft werden ohne Inhalt zu verlieren.",
    {
      publisher_pattern: z.string().optional().describe("LIKE-Suche, z.B. 'Panini'"),
      exclude_formats: z.array(z.string()).optional().describe("Formate ausschließen, z.B. ['Hardcover']"),
      exclude_complete_series: z.boolean().optional().describe("true = Hefte aus vollständig gesammelten Serien ausschließen (Reihen nicht auseinanderreißen)"),
      limit: z.number().int().min(1).max(200).optional(),
    },
    async (params) => {
      const result = await findSellableReprints(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "find_duplicate_variants",
    "Findet gesammelte Gruppen, bei denen mehrere Ausgaben (Varianten/Formate) derselben Heftnummer vorhanden sind.",
    {
      publisher_pattern: z.string().optional().describe("LIKE-Suche, z.B. 'Panini'"),
    },
    async (params) => {
      const result = await findDuplicateVariants(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  return server;
}
