import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma/client";
import {
  createNodeIssueLabel,
  createNodeSeriesLabel,
  createNodeUrl,
} from "../util/dbFunctions";

type SearchIndexInsertRow = {
  node_type: "publisher" | "series" | "issue";
  source_id: number;
  us: boolean;
  publisher_name: string | null;
  series_title: string | null;
  series_volume: number | null;
  series_startyear: number | null;
  series_endyear: number | null;
  series_key: string | null;
  issue_number: string | null;
  issue_format: string | null;
  issue_variant: string | null;
  issue_title: string | null;
  label: string;
  url: string;
  search_text: string;
};

export type RebuildSearchIndexOptions = {
  dryRun?: boolean;
};

export type RebuildSearchIndexReport = {
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  totalRows: number;
  publisherRows: number;
  seriesRows: number;
  issueRows: number;
};

const INSERT_BATCH_SIZE = 2000;

export async function runRebuildSearchIndex(
  options?: RebuildSearchIndexOptions
): Promise<RebuildSearchIndexReport> {
  const dryRun = Boolean(options?.dryRun);
  const startedAt = new Date().toISOString();

  const [publishers, series, issues] = await Promise.all([
    prisma.publisher.findMany({
      orderBy: [{ id: "asc" }],
    }),
    prisma.series.findMany({
      include: {
        publisher: true,
      },
      orderBy: [{ id: "asc" }],
    }),
    prisma.issue.findMany({
      include: {
        series: {
          include: {
            publisher: true,
          },
        },
      },
      orderBy: [{ id: "asc" }],
    }),
  ]);

  const rows: SearchIndexInsertRow[] = [];
  let publisherRows = 0;
  let seriesRows = 0;
  let issueRows = 0;

  for (const publisher of publishers) {
    const us = Boolean(publisher.original);
    rows.push({
      node_type: "publisher",
      source_id: Number(publisher.id),
      us,
      publisher_name: publisher.name,
      series_title: null,
      series_volume: null,
      series_startyear: null,
      series_endyear: null,
      series_key: null,
      issue_number: null,
      issue_format: null,
      issue_variant: null,
      issue_title: null,
      label: publisher.name,
      url: createNodeUrl("publisher", us, publisher.name, "", 0, "", "", ""),
      search_text: normalizeSearchText(publisher.name),
    });
    publisherRows += 1;
  }

  for (const seriesItem of series) {
    const publisherName = seriesItem.publisher?.name ?? "";
    const us = Boolean(seriesItem.publisher?.original);
    const seriesTitle = seriesItem.title ?? "";
    const seriesVolume = Number(seriesItem.volume);
    const seriesStartyear = Number(seriesItem.startYear);
    const seriesEndyear = seriesItem.endYear == null ? 0 : Number(seriesItem.endYear);
    const seriesKey = buildSeriesKey(
      publisherName,
      seriesTitle,
      seriesVolume,
      seriesStartyear
    );
    const label = createNodeSeriesLabel(
      seriesTitle,
      publisherName,
      seriesVolume,
      seriesStartyear,
      seriesEndyear
    );

    rows.push({
      node_type: "series",
      source_id: Number(seriesItem.id),
      us,
      publisher_name: publisherName,
      series_title: seriesTitle,
      series_volume: seriesVolume,
      series_startyear: seriesStartyear,
      series_endyear: seriesEndyear,
      series_key: seriesKey,
      issue_number: null,
      issue_format: null,
      issue_variant: null,
      issue_title: null,
      label,
      url: createNodeUrl("series", us, publisherName, seriesTitle, seriesVolume, "", "", ""),
      search_text: normalizeSearchText(
        `${publisherName} ${seriesTitle} vol ${seriesVolume} ${seriesStartyear} ${seriesEndyear || ""}`
      ),
    });
    seriesRows += 1;
  }

  for (const issueItem of issues) {
    const seriesItem = issueItem.series;
    const publisherName = seriesItem?.publisher?.name || "";
    const us = Boolean(seriesItem?.publisher?.original);
    const seriesTitle = seriesItem?.title || "";
    const seriesVolume = Number(seriesItem?.volume || 0);
    const seriesStartyear = Number(seriesItem?.startYear || 0);
    const seriesEndyear = Number(seriesItem?.endYear || 0);
    const issueNumber = (issueItem.number || "").trim();
    const issueLegacyNumber = (issueItem.legacyNumber || "").trim();
    const issueFormat = (issueItem.format || "").trim();
    const issueVariant = (issueItem.variant || "").trim();
    const issueTitle = (issueItem.title || "").trim();
    const seriesLabel = createNodeSeriesLabel(
      seriesTitle,
      publisherName,
      seriesVolume,
      seriesStartyear,
      seriesEndyear
    );
    const label = createNodeIssueLabel(
      seriesLabel,
      issueNumber,
      issueLegacyNumber,
      issueFormat,
      issueVariant,
      issueTitle
    );

    rows.push({
      node_type: "issue",
      source_id: Number(issueItem.id),
      us,
      publisher_name: publisherName,
      series_title: seriesTitle,
      series_volume: seriesVolume,
      series_startyear: seriesStartyear,
      series_endyear: seriesEndyear,
      series_key: buildSeriesKey(publisherName, seriesTitle, seriesVolume, seriesStartyear),
      issue_number: issueNumber,
      issue_format: issueFormat,
      issue_variant: issueVariant,
      issue_title: issueTitle,
      label,
      url: createNodeUrl(
        "issue",
        us,
        publisherName,
        seriesTitle,
        seriesVolume,
        issueNumber,
        issueFormat,
        issueVariant
      ),
      search_text: normalizeSearchText(
        `${publisherName} ${seriesTitle} vol ${seriesVolume} ${seriesStartyear} ${seriesEndyear} ${issueNumber} ${issueLegacyNumber} ${issueFormat} ${issueVariant} ${issueTitle}`
      ),
    });
    issueRows += 1;
  }

  if (!dryRun) {
    await prisma.$executeRawUnsafe("TRUNCATE TABLE shortbox.search_index RESTART IDENTITY");

    for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
      const chunk = rows.slice(i, i + INSERT_BATCH_SIZE);
      const values = Prisma.join(
        chunk.map((row) => Prisma.sql`(
            ${row.node_type},
            ${row.source_id},
            ${row.us},
            ${row.publisher_name},
            ${row.series_title},
            ${row.series_volume},
            ${row.series_startyear},
            ${row.series_endyear},
            ${row.series_key},
            ${row.issue_number},
            ${row.issue_format},
            ${row.issue_variant},
            ${row.issue_title},
            ${row.label},
            ${row.url},
            ${row.search_text}
          )`)
      );

      await prisma.$executeRaw(Prisma.sql`
          INSERT INTO shortbox.search_index (
            node_type,
            source_id,
            us,
            publisher_name,
            series_title,
            series_volume,
            series_startyear,
            series_endyear,
            series_key,
            issue_number,
            issue_format,
            issue_variant,
            issue_title,
            label,
            url,
            search_text
          )
          VALUES ${values}
        `);
    }
  }

  return {
    dryRun,
    startedAt,
    finishedAt: new Date().toISOString(),
    totalRows: rows.length,
    publisherRows,
    seriesRows,
    issueRows,
  };
}

function buildSeriesKey(
  publisherName: string,
  seriesTitle: string,
  seriesVolume: number,
  seriesStartyear: number
) {
  return [publisherName, seriesTitle, String(seriesVolume), String(seriesStartyear)].join("::");
}

function normalizeSearchText(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^0-9a-z]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
