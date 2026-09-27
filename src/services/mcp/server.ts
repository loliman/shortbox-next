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
import { searchCatalog } from "./tools/search-catalog";
import { checkCollectionStatus } from "./tools/collection-status";
import { resolveStoryPublications } from "./tools/story-publications";
import { searchDeepCatalog } from "./tools/search-deep-catalog";
import { getStorylineChronology } from "./tools/storyline-chronology";
import { analyzeUsRunCoverage } from "./tools/us-run-coverage";
import { findUpgradeCandidates } from "./tools/upgrade-candidates";
import { auditPublicationHealth } from "./tools/audit-publication-health";
import { getCurationDossier } from "./tools/curation-dossier";

export const SHORTBOX_MCP_INSTRUCTIONS = `
Du bist der Shortbox Comic-Bibliothekar. Du hast Zugriff auf die gesamte Shortbox-Comic-Datenbank und die persönliche Comic-Sammlung des Nutzers.

## Domänenmodell & Konzepte
- **Issue**: Das Werk bzw. die Veröffentlichungseinheit (Serie, Nummer, Titel, enthaltene Stories).
- **Variant**: Die konkrete physische Ausgabe mit Format (Heft, Hardcover, Paperback), Variant-Cover, Preis und dem Sammlungsstatus 'collected'.
- **DE vs. US**: US-Comics sind in der Regel Originalausgaben. Deutsche Ausgaben (Panini, Ehapa, Williams, Condor, Dino, Splitter etc.) drucken überwiegend US-Stories nach.
- **Stories & Reprints**: Stories in deutschen Heften verlinken über 'fkParent' auf die US-Originalstory und über 'reprintedBy' auf weitere deutsche Nachdrucke.
- **Flags**: 'isReprintOnly' bedeutet, dass alle enthaltenen Stories bereits früher auf Deutsch erschienen sind.

## Verhaltensregeln für den Agenten nach Nutzergruppe

### 1. Für allgemeine Leser & Suche (Discovery)
- **Deep Search**: Bei Fragen nach Figuren (z.B. "Venom", "Punisher"), Events/Arcs (z.B. "Civil War", "Infinity"), Künstlern/Kreativen (z.B. "McFarlane", "Frank Miller", "Christian Heiss") oder Story-Titeln nutze 'search_deep_catalog'.
- **Lesereihenfolgen & Events**: Wenn der Nutzer wissen will, wie ein Story-Arc zu lesen ist und welche deutschen Bände existieren, nutze 'get_storyline_chronology'.
- **Nachdrucke & Originale**: Wenn der Nutzer wissen will, wo ein bestimmtes US-Heft auf Deutsch erschienen ist oder welche US-Hefte in einem deutschen Band stecken, nutze 'resolve_story_publications'.

### 2. Für Sammler & Bestandsanalyse (Collection Intelligence)
- **US-Run-Abdeckung**: Wenn ein Sammler wissen will, welche Hefte eines US-Laufs (z.B. Amazing Spider-Man #200-300) er über seine gesamte deutsche Sammlung besitzt und was noch fehlt, nutze 'analyze_us_run_coverage'.
- **Serienstatus**: Verwende 'check_collection_status', um Vollständigkeit (%) und Lücken als kompakte Nummernblöcke ("#1-5, #8") zu nennen.
- **Format-Upgrades**: Nutze 'find_upgrade_candidates', um zu sehen, welche Softcovers/Hefte der Sammler besitzt, für die es auch ein Hardcover im Katalog gibt.
- **Verkauf & Doubletten**: Nutze 'find_sellable_reprints' oder 'find_duplicate_variants', wenn der Nutzer wissen will, welche Hefte er verkaufen kann, ohne Stories zu verlieren.

### 3. Für Kuratoren & Datenhygiene (Curation & Data Quality)
- **Health-Audit**: Nutze 'audit_publication_health', um Hefte oder Serien auf Datenqualitätsmängel (Dummy-Titel, Scan-Artefakte, Plenks, fehlende US-Parents, fehlende Übersetzer, Zählbrüche) zu prüfen.
- **Quellen-Dossier**: Nutze 'get_curation_dossier', um für ein bestimmtes Heft die Shortbox-Daten im Live-Abgleich mit den gecachten GCD- und UHBMCC-Daten gegenüberzustellen.
`.trim();

/**
 * Creates and configures the Shortbox MCP server with all tools and resources.
 * Must be called server-side only (Next.js API route or Stdio CLI context).
 */
export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "shortbox",
      version: "2.1.0",
    },
    {
      instructions: SHORTBOX_MCP_INSTRUCTIONS,
    }
  );

  // ── Discovery & Deep Search Tools (For Readers & General Search) ────────

  server.tool(
    "search_catalog",
    [
      "Sucht im Shortbox-Katalog nach Heften, Serien oder Verlagen.",
      "IMMER ALS ERSTES AUFRUFEN, wenn der Nutzer einen Titel, eine Figur oder ein Heft nennt, um die eindeutige issue_id oder series_id zu ermitteln.",
    ].join(" "),
    {
      query: z.string().describe("Suchbegriff, z.B. 'Spider-Man 2019', 'Amazing Fantasy 15', 'Panini'"),
      scope: z.enum(["all", "series", "issue", "publisher"]).optional().describe("Filter auf Entitätstyp (Standard: all)"),
      us: z.boolean().optional().describe("true = nur US-Comics, false = nur deutsche Ausgaben, undefined = alle"),
      limit: z.number().int().min(1).max(50).optional().describe("Max. Ergebnisse (Standard: 10)"),
    },
    async (params) => {
      const result = await searchCatalog(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "search_deep_catalog",
    [
      "Universelle semantische Tiefensuche über den gesamten Katalog.",
      "Findet Charaktere (Auftritte), Storylines/Arcs (Events), Kreative (Zeichner, Autoren, Übersetzer), Story-Titel und Serien/Hefte.",
      "Gibt strukturierte IDs und Treffer zurück, die direkt in Folge-Tools verwendet werden können.",
    ].join(" "),
    {
      query: z.string().describe("Suchbegriff (z.B. 'Venom', 'Civil War', 'McFarlane', 'Gwen Stacy')"),
      types: z
        .array(z.enum(["all", "series", "issue", "character", "arc", "creator", "story"]))
        .optional()
        .describe("Optionale Einschränkung auf Entitätstypen (Standard: all)"),
      us: z.boolean().optional().describe("true = nur US-Comics, false = nur deutsche Ausgaben"),
      limit: z.number().int().min(1).max(30).optional().describe("Max. Ergebnisse je Kategorie (Standard: 10)"),
    },
    async (params) => {
      const result = await searchDeepCatalog(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "get_storyline_chronology",
    [
      "Gibt die chronologische Lesereihenfolge für eine Storyline oder ein Event (z.B. 'Civil War', 'Infinity Gauntlet', 'Kraven's Last Hunt') aus.",
      "Mapped jedes US-Heft auf alle existierenden deutschen Ausgaben und zeigt an, ob der Nutzer die Ausgabe besitzt.",
    ].join(" "),
    {
      arc_id: z.number().int().optional().describe("Arc-ID (aus search_deep_catalog)"),
      title: z.string().optional().describe("Titel des Arcs/Events (z.B. 'Civil War')"),
    },
    async (params) => {
      const result = await getStorylineChronology(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "resolve_story_publications",
    [
      "Löst den US <-> Deutschland Nachdruck-Graph für ein Heft auf.",
      "Für US-Hefte: Findet alle deutschen Veröffentlichungen der enthaltenen Stories und zeigt, ob der Nutzer sie besitzt.",
      "Für deutsche Hefte: Findet die enthaltenen US-Originalausgaben und andere deutsche Nachdrucke.",
    ].join(" "),
    {
      issue_id: z.number().int().describe("Heft-ID des zu untersuchenden US- oder deutschen Hefts"),
    },
    async (params) => {
      const result = await resolveStoryPublications(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── Collector Intelligence Tools (For Collection Analysis & Strategy) ──

  server.tool(
    "check_collection_status",
    [
      "Prüft den Sammlungsstatus für ein bestimmtes Heft oder eine Serie.",
      "Für Hefte: gibt an ob gesammelt, welches Format/Variante vorliegt und wann erschienen.",
      "Für Serien: gibt Gesamthefte, Sammlungsquote in % und eine kompakte Liste fehlender Nummern zurück.",
    ].join(" "),
    {
      issue_id: z.number().int().optional().describe("Eindeutige Heft-ID (vorher über search_catalog ermitteln)"),
      series_id: z.number().int().optional().describe("Eindeutige Serien-ID (vorher über search_catalog ermitteln)"),
    },
    async (params) => {
      const result = await checkCollectionStatus(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "analyze_us_run_coverage",
    [
      "Analysiert die Abdeckung eines US-Serienabschnitts (z.B. Amazing Spider-Man #200-300) über die gesamte deutsche Sammlung.",
      "Prüft für jede US-Nummer: Im Besitz (egal in welchem deutschen Band)? Auf Deutsch verfügbar aber fehlt? Noch nie auf Deutsch erschienen?",
      "Liefert prozentuale Quoten, kompakte Lücken-Nummernblöcke und eine Einkaufsliste.",
    ].join(" "),
    {
      us_series_id: z.number().int().optional().describe("ID der US-Serie (aus search_catalog)"),
      us_series_title: z.string().optional().describe("Titel der US-Serie (z.B. 'The Amazing Spider-Man')"),
      start_number: z.number().int().optional().describe("Start-Heftnummer des Runs (z.B. 200)"),
      end_number: z.number().int().optional().describe("End-Heftnummer des Runs (z.B. 300)"),
    },
    async (params) => {
      const result = await analyzeUsRunCoverage(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "find_upgrade_candidates",
    [
      "Findet gesammelte Hefte/Bände, die der Sammler als Softcover oder normales Heft besitzt,",
      "bei denen aber eine höherwertige Hardcover- oder limitierte Vorzugsausgabe im Katalog existiert, die noch nicht gesammelt ist.",
    ].join(" "),
    {
      publisher_pattern: z.string().optional().describe("Verlag einschränken (z.B. 'Panini')"),
      limit: z.number().int().min(1).max(200).optional().describe("Max. Treffer (Standard: 50)"),
    },
    async (params) => {
      const result = await findUpgradeCandidates(params);
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

  // ── Curatorial & Data Quality Tools (For Curation & Hygiene Audits) ──────

  server.tool(
    "audit_publication_health",
    [
      "Führt einen tiefen Datenhygiene-Check für Hefte oder Serien gemäß den verbindlichen AGENTS.md-Regeln durch.",
      "Prüft auf: Verbotene Dummys, Plenks, Scan-Artefakte, redaktionelle Zählbrüche, fehlende US-Parents,",
      "fehlende Übersetzer bei Erstausgaben, Lücken in Story.number und fehlende Varianten-/GCD-Metadaten.",
      "Berechnet einen Health-Score (0-100%) und listet konkrete Handlungsempfehlungen.",
    ].join(" "),
    {
      issue_id: z.number().int().optional().describe("Einzelnes Heft prüfen"),
      series_id: z.number().int().optional().describe("Ganze Serie prüfen"),
      publisher_pattern: z.string().optional().describe("Alle Hefte eines Verlags prüfen (z.B. 'Panini', 'BSV')"),
      limit: z.number().int().min(1).max(200).optional().describe("Max. zu prüfende Hefte (Standard: 50)"),
    },
    async (params) => {
      const result = await auditPublicationHealth(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "get_curation_dossier",
    [
      "Erstellt ein 360-Grad-Kurations-Dossier für ein Heft mit Live-Abgleich zwischen Shortbox, GCD und UHBMCC.",
      "Zentrales Werkzeug für den atomaren Heft-Kurations-Loop: Klassifiziert die Befunde strikt in autonome Entscheidungen",
      "(Konsenswerte, Bereinigungen) und Nicht-Entscheidungen (Konflikte, die dem Nutzer vorgelegt werden müssen).",
    ].join(" "),
    {
      issue_id: z.number().int().optional().describe("Heft-ID in Shortbox"),
      series_title: z.string().optional().describe("Serientitel"),
      issue_number: z.string().optional().describe("Heftnummer"),
    },
    async (params) => {
      const result = await getCurationDossier(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "get_collection_stats",
    "Schnellübersicht: Gesamtanzahl Hefte, gesammelt/fehlend, aufgeteilt nach Verlag.",
    {},
    async () => {
      const result = await getCollectionStats();
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── Granular API-style Tools ─────────────────────────────────────────────

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

  // ── MCP Resources ────────────────────────────────────────────────────────

  server.resource(
    "collection-summary",
    "shortbox://collection-summary",
    async (uri) => {
      const stats = await getCollectionStats();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(stats, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    }
  );

  server.resource(
    "domain-guide",
    "shortbox://domain-guide",
    async (uri) => {
      return {
        contents: [
          {
            uri: uri.href,
            text: SHORTBOX_MCP_INSTRUCTIONS,
            mimeType: "text/markdown",
          },
        ],
      };
    }
  );

  return server;
}
