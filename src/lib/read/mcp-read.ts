import "server-only";

import { prisma } from "../prisma/client";
import { Prisma } from "@prisma/client";

// ── Types ────────────────────────────────────────────────────────────────────

export type McpPublisher = {
  id: number;
  name: string;
  original: boolean;
  startYear: number;
  endYear: number | null;
  totalIssues: number;
  collectedIssues: number;
};

export type McpSeriesRow = {
  id: number;
  title: string;
  volume: number;
  publisher: string;
  startYear: number;
  endYear: number | null;
  total: number;
  collected: number;
  missing: number;
  completionPercent: number;
  isComplete: boolean;
};

export type McpIssueRow = {
  id: number;
  series: string;
  seriesId: number;
  volume: number;
  publisher: string;
  number: string;
  title: string | null;
  format: string;
  variant: string | null;
  releaseDate: string | null;
  collected: boolean;
  price: string | null;
  flags: {
    isReprintOnly: boolean;
    hasFirstPrint: boolean;
    hasOnlyPrint: boolean;
    hasExclusiveStory: boolean;
    hasOtherOnlyTb: boolean;
  };
};

export type McpSeriesDetails = McpSeriesRow & {
  issues: McpIssueRow[];
};

export type McpIssueDetails = McpIssueRow & {
  pages: number | null;
  isbn: string | null;
  stories: {
    id: number;
    title: string;
    part: string;
    isFirstApp: boolean;
    isOnlyApp: boolean;
    isReprint: boolean;
  }[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number | Prisma.Decimal | null, currency: string | null | undefined): string | null {
  if (price == null) return null;
  const num = typeof price === "number" ? price : Number(price);
  return `${num.toFixed(2)} ${currency ?? "EUR"}`;
}

function formatDate(date: Date | null | undefined): string | null {
  return date?.toISOString().slice(0, 10) ?? null;
}

function buildPublisherWhere(pattern: string | undefined, original: boolean | undefined) {
  return {
    ...(original != null ? { original } : {}),
    ...(pattern
      ? { name: { contains: pattern, mode: "insensitive" as const } }
      : {}),
  };
}

/** Preferred variant select (first by format ASC, variantLabel ASC). */
const preferredVariantSelect = {
  orderBy: [{ format: "asc" as const }, { variantLabel: "asc" as const }, { id: "asc" as const }],
  select: {
    id: true,
    format: true,
    variantLabel: true,
    releaseDate: true,
    collected: true,
    price: true,
    currency: true,
    pages: true,
    isbn: true,
  },
};

// ── list_publishers ──────────────────────────────────────────────────────────

export async function mcpListPublishers(params: {
  name_pattern?: string;
  original?: boolean;
}): Promise<McpPublisher[]> {
  // Count issues and collected via series → issues → variants
  const publishers = await prisma.publisher.findMany({
    where: buildPublisherWhere(params.name_pattern, params.original),
    select: {
      id: true,
      name: true,
      original: true,
      startYear: true,
      endYear: true,
      series: {
        select: {
          issues: {
            select: {
              variants: {
                select: { collected: true },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return publishers.map((p) => {
    const allIssues = p.series.flatMap((s) => s.issues);
    const totalIssues = allIssues.length;
    const collectedIssues = allIssues.filter((i) => i.variants.some((v) => v.collected === true)).length;
    return {
      id: Number(p.id),
      name: p.name,
      original: p.original,
      startYear: Number(p.startYear),
      endYear: p.endYear != null ? Number(p.endYear) : null,
      totalIssues,
      collectedIssues,
    };
  });
}

// ── list_series ──────────────────────────────────────────────────────────────

export async function mcpListSeries(params: {
  publisher_pattern?: string;
  title_pattern?: string;
  start_year_from?: number;
  start_year_to?: number;
  is_complete?: boolean;
  min_collected?: number;
  sort_by?: "completion" | "missing" | "name" | "start_year";
  limit?: number;
}): Promise<McpSeriesRow[]> {
  const rows = await prisma.series.findMany({
    where: {
      publisher: buildPublisherWhere(params.publisher_pattern, undefined),
      ...(params.title_pattern
        ? { title: { contains: params.title_pattern, mode: "insensitive" } }
        : {}),
      ...(params.start_year_from != null
        ? { startYear: { gte: BigInt(params.start_year_from) } }
        : {}),
      ...(params.start_year_to != null
        ? { startYear: { lte: BigInt(params.start_year_to) } }
        : {}),
    },
    select: {
      id: true,
      title: true,
      volume: true,
      startYear: true,
      endYear: true,
      publisher: { select: { name: true } },
      issues: {
        select: {
          variants: {
            select: { collected: true },
          },
        },
      },
    },
  });

  let results: McpSeriesRow[] = rows
    .map((s) => {
      const total = s.issues.length;
      const collected = s.issues.filter((i) => i.variants.some((v) => v.collected === true)).length;
      const missing = total - collected;
      const completionPercent = total > 0 ? Math.round((collected / total) * 100) : 0;
      const isComplete = total > 0 && missing === 0;
      return {
        id: Number(s.id),
        title: s.title ?? "",
        volume: Number(s.volume),
        publisher: s.publisher?.name ?? "",
        startYear: Number(s.startYear),
        endYear: s.endYear != null ? Number(s.endYear) : null,
        total,
        collected,
        missing,
        completionPercent,
        isComplete,
      };
    })
    .filter((r) => r.collected >= (params.min_collected ?? 0));

  if (params.is_complete != null) {
    results = results.filter((r) => r.isComplete === params.is_complete);
  }

  const sortBy = params.sort_by ?? "name";
  results.sort((a, b) => {
    if (sortBy === "missing") return b.missing - a.missing;
    if (sortBy === "completion") return b.completionPercent - a.completionPercent;
    if (sortBy === "start_year") return a.startYear - b.startYear;
    return a.title.localeCompare(b.title);
  });

  return results.slice(0, params.limit ?? 50);
}

// ── list_issues ──────────────────────────────────────────────────────────────

export async function mcpListIssues(params: {
  publisher_pattern?: string;
  series_title?: string;
  series_start_year_from?: number;
  series_start_year_to?: number;
  number?: string;
  collected?: boolean;
  formats?: string[];
  exclude_formats?: string[];
  is_reprint_only?: boolean;
  has_first_print?: boolean;
  has_only_print?: boolean;
  series_is_complete?: boolean;
  original?: boolean;
  /** Filter German issues so that ALL stories have a parent from a US series starting >= this year */
  us_series_start_year_from?: number;
  /** Filter German issues so that ALL stories have a parent from a US series starting <= this year */
  us_series_start_year_to?: number;
  limit?: number;
}): Promise<McpIssueRow[]> {
  // Step 1: Optionally resolve series_is_complete filter
  let seriesIdFilter: bigint[] | undefined;
  if (params.series_is_complete != null) {
    const allSeries = await prisma.series.findMany({
      where: { publisher: buildPublisherWhere(params.publisher_pattern, params.original) },
      select: {
        id: true,
        issues: {
          select: {
            variants: {
              select: { collected: true },
            },
          },
        },
      },
    });
    const completeSeries = allSeries.filter(
      (s) => s.issues.length > 0 && s.issues.every((i) => i.variants.some((v) => v.collected === true))
    );
    if (params.series_is_complete === true) {
      seriesIdFilter = completeSeries.map((s) => s.id);
    } else {
      const completeIds = new Set(completeSeries.map((s) => String(s.id)));
      seriesIdFilter = allSeries
        .filter((s) => !completeIds.has(String(s.id)))
        .map((s) => s.id);
    }
    if (seriesIdFilter.length === 0) return [];
  }

  // Build US-series-year filter
  const hasUsYearFilter =
    params.us_series_start_year_from != null || params.us_series_start_year_to != null;

  const failingStoryConditions: object[] = [{ fkParent: null }];
  if (hasUsYearFilter) {
    const outsideRange: object[] = [];
    if (params.us_series_start_year_from != null) {
      outsideRange.push({ startYear: { lt: BigInt(params.us_series_start_year_from) } });
    }
    if (params.us_series_start_year_to != null) {
      outsideRange.push({ startYear: { gt: BigInt(params.us_series_start_year_to) } });
    }
    failingStoryConditions.push({
      parent: { issue: { series: { OR: outsideRange } } },
    });
  }

  // Build variant-level filter conditions for collected/format
  const variantWhere: object[] = [];
  if (params.collected != null) {
    if (params.collected) {
      variantWhere.push({ variants: { some: { collected: true } } });
    } else {
      variantWhere.push({ variants: { none: { collected: true } } });
    }
  }
  if (params.formats?.length) {
    variantWhere.push({ variants: { some: { format: { in: params.formats } } } });
  }
  if (params.exclude_formats?.length) {
    variantWhere.push({ NOT: { variants: { every: { format: { in: params.exclude_formats } } } } });
  }

  const issues = await prisma.issue.findMany({
    where: {
      AND: [
        {
          series: {
            publisher: buildPublisherWhere(params.publisher_pattern, params.original),
            ...(params.series_title
              ? { title: { contains: params.series_title, mode: "insensitive" } }
              : {}),
            ...(params.series_start_year_from != null
              ? { startYear: { gte: BigInt(params.series_start_year_from) } }
              : {}),
            ...(params.series_start_year_to != null
              ? { startYear: { lte: BigInt(params.series_start_year_to) } }
              : {}),
          },
        },
        ...(params.number ? [{ number: params.number }] : []),
        ...(params.is_reprint_only != null ? [{ isReprintOnly: params.is_reprint_only }] : []),
        ...(params.has_first_print != null ? [{ hasFirstPrint: params.has_first_print }] : []),
        ...(params.has_only_print != null ? [{ hasOnlyPrint: params.has_only_print }] : []),
        ...(seriesIdFilter ? [{ fkSeries: { in: seriesIdFilter } }] : []),
        ...variantWhere,
        // US series year filter
        ...(hasUsYearFilter
          ? [
              { stories: { some: {} } },
              { NOT: { stories: { some: { OR: failingStoryConditions } } } },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      number: true,
      title: true,
      fkSeries: true,
      isReprintOnly: true,
      hasFirstPrint: true,
      hasOnlyPrint: true,
      hasExclusiveStory: true,
      hasOtherOnlyTb: true,
      series: {
        select: {
          title: true,
          volume: true,
          publisher: { select: { name: true } },
        },
      },
      variants: preferredVariantSelect,
    },
    orderBy: [
      { series: { publisher: { name: "asc" } } },
      { series: { title: "asc" } },
      { numberNumeric: "asc" },
      { number: "asc" },
    ],
    take: Math.min(params.limit ?? 50, 200),
  });

  return issues.map((i) => {
    const v = i.variants[0] ?? null;
    return {
      id: Number(i.id),
      series: i.series?.title ?? "",
      seriesId: Number(i.fkSeries ?? 0),
      volume: Number(i.series?.volume ?? 0),
      publisher: i.series?.publisher?.name ?? "",
      number: i.number,
      title: i.title || null,
      format: v?.format ?? "",
      variant: v?.variantLabel || null,
      releaseDate: formatDate(v?.releaseDate),
      collected: i.variants.some((v) => v.collected === true),
      price: formatPrice(v?.price ?? null, v?.currency),
      flags: {
        isReprintOnly: i.isReprintOnly,
        hasFirstPrint: i.hasFirstPrint,
        hasOnlyPrint: i.hasOnlyPrint,
        hasExclusiveStory: i.hasExclusiveStory,
        hasOtherOnlyTb: i.hasOtherOnlyTb,
      },
    };
  });
}

// ── get_series_details ───────────────────────────────────────────────────────

export async function mcpGetSeriesDetails(params: {
  series_id?: number;
  title?: string;
  publisher_pattern?: string;
  volume?: number;
}): Promise<McpSeriesDetails | null> {
  const series = await prisma.series.findFirst({
    where: {
      ...(params.series_id ? { id: BigInt(params.series_id) } : {}),
      ...(params.title
        ? { title: { contains: params.title, mode: "insensitive" } }
        : {}),
      ...(params.volume != null ? { volume: BigInt(params.volume) } : {}),
      publisher: buildPublisherWhere(params.publisher_pattern, undefined),
    },
    select: {
      id: true,
      title: true,
      volume: true,
      startYear: true,
      endYear: true,
      publisher: { select: { name: true } },
      issues: {
        select: {
          id: true,
          number: true,
          title: true,
          fkSeries: true,
          isReprintOnly: true,
          hasFirstPrint: true,
          hasOnlyPrint: true,
          hasExclusiveStory: true,
          hasOtherOnlyTb: true,
          variants: preferredVariantSelect,
        },
        orderBy: [{ numberNumeric: "asc" }, { number: "asc" }],
      },
    },
  });

  if (!series) return null;

  const total = series.issues.length;
  const collectedCount = series.issues.filter((i) => i.variants.some((v) => v.collected === true)).length;
  const missing = total - collectedCount;
  const pub = series.publisher?.name ?? "";

  const issueRows: McpIssueRow[] = series.issues.map((i) => {
    const v = i.variants[0] ?? null;
    return {
      id: Number(i.id),
      series: series.title ?? "",
      seriesId: Number(series.id),
      volume: Number(series.volume),
      publisher: pub,
      number: i.number,
      title: i.title || null,
      format: v?.format ?? "",
      variant: v?.variantLabel || null,
      releaseDate: formatDate(v?.releaseDate),
      collected: i.variants.some((v) => v.collected === true),
      price: formatPrice(v?.price ?? null, v?.currency),
      flags: {
        isReprintOnly: i.isReprintOnly,
        hasFirstPrint: i.hasFirstPrint,
        hasOnlyPrint: i.hasOnlyPrint,
        hasExclusiveStory: i.hasExclusiveStory,
        hasOtherOnlyTb: i.hasOtherOnlyTb,
      },
    };
  });

  return {
    id: Number(series.id),
    title: series.title ?? "",
    volume: Number(series.volume),
    publisher: pub,
    startYear: Number(series.startYear),
    endYear: series.endYear != null ? Number(series.endYear) : null,
    total,
    collected: collectedCount,
    missing,
    completionPercent: total > 0 ? Math.round((collectedCount / total) * 100) : 0,
    isComplete: total > 0 && missing === 0,
    issues: issueRows,
  };
}

// ── get_issue_details ────────────────────────────────────────────────────────

export async function mcpGetIssueDetails(issueId: number): Promise<McpIssueDetails | null> {
  const issue = await prisma.issue.findFirst({
    where: { id: BigInt(issueId) },
    select: {
      id: true,
      number: true,
      title: true,
      fkSeries: true,
      isReprintOnly: true,
      hasFirstPrint: true,
      hasOnlyPrint: true,
      hasExclusiveStory: true,
      hasOtherOnlyTb: true,
      series: {
        select: {
          title: true,
          volume: true,
          publisher: { select: { name: true } },
        },
      },
      variants: {
        ...preferredVariantSelect,
        select: {
          ...preferredVariantSelect.select,
          pages: true,
          isbn: true,
        },
      },
      stories: {
        select: {
          id: true,
          title: true,
          part: true,
          firstApp: true,
          onlyApp: true,
          fkParent: true,
        },
        orderBy: { number: "asc" },
      },
    },
  });

  if (!issue) return null;

  const v = issue.variants[0] ?? null;

  return {
    id: Number(issue.id),
    series: issue.series?.title ?? "",
    seriesId: Number(issue.fkSeries ?? 0),
    volume: Number(issue.series?.volume ?? 0),
    publisher: issue.series?.publisher?.name ?? "",
    number: issue.number,
    title: issue.title || null,
    format: v?.format ?? "",
    variant: v?.variantLabel || null,
    releaseDate: formatDate(v?.releaseDate),
    collected: issue.variants.some((v) => v.collected === true),
    price: formatPrice(v?.price ?? null, v?.currency),
    pages: v?.pages != null ? Number(v.pages) : null,
    isbn: v?.isbn || null,
    flags: {
      isReprintOnly: issue.isReprintOnly,
      hasFirstPrint: issue.hasFirstPrint,
      hasOnlyPrint: issue.hasOnlyPrint,
      hasExclusiveStory: issue.hasExclusiveStory,
      hasOtherOnlyTb: issue.hasOtherOnlyTb,
    },
    stories: issue.stories.map((s) => ({
      id: Number(s.id),
      title: s.title,
      part: s.part,
      isFirstApp: s.firstApp,
      isOnlyApp: s.onlyApp,
      isReprint: s.fkParent != null,
    })),
  };
}

// ── get_collection_stats ──────────────────────────────────────────────────────

export async function mcpGetCollectionStats() {
  const [totalIssues, collectedIssues, publisherStats] = await Promise.all([
    prisma.issue.count({
      where: { series: { publisher: { original: false } } },
    }),
    prisma.issue.count({
      where: {
        variants: {
          some: { collected: true },
        },
        series: { publisher: { original: false } },
      },
    }),
    prisma.publisher.findMany({
      where: { original: false },
      select: {
        name: true,
        issues: {
          select: {
            variants: {
              select: {
                collected: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const byPublisher = publisherStats
    .map((pub) => {
      const issueStates = pub.issues.map((issue) =>
        issue.variants.some((v) => v.collected === true)
      );
      const total = issueStates.length;
      const collected = issueStates.filter((c) => c).length;

      return {
        publisher: pub.name,
        total,
        collected,
        missing: total - collected,
      };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.collected - a.collected);

  return {
    summary: {
      totalIssues,
      collectedIssues,
      missingIssues: totalIssues - collectedIssues,
      completionPercent:
        totalIssues > 0 ? Math.round((collectedIssues / totalIssues) * 100) : 0,
    },
    byPublisher,
  };
}

// ── find_duplicate_variants ───────────────────────────────────────────────────

interface FindDuplicateVariantsParams {
  publisher_pattern?: string;
}

export async function mcpFindDuplicateVariants(params: FindDuplicateVariantsParams) {
  const collectedIssues = await prisma.issue.findMany({
    where: {
      variants: {
        some: {
          collected: true,
        },
      },
      series: {
        publisher: {
          original: false,
          ...(params.publisher_pattern
            ? { name: { contains: params.publisher_pattern, mode: "insensitive" } }
            : {}),
        },
      },
    },
    select: {
      id: true,
      number: true,
      title: true,
      fkSeries: true,
      series: {
        select: {
          title: true,
          volume: true,
          publisher: { select: { name: true } },
        },
      },
      variants: {
        where: {
          collected: true,
        },
        select: {
          id: true,
          format: true,
          variantLabel: true,
          releaseDate: true,
          price: true,
          currency: true,
        },
        orderBy: [
          { format: "asc" },
          { variantLabel: "asc" },
        ],
      },
    },
    orderBy: [
      { series: { publisher: { name: "asc" } } },
      { series: { title: "asc" } },
      { numberNumeric: "asc" },
    ],
  });

  const duplicateGroups = collectedIssues
    .filter((issue) => issue.variants.length > 1)
    .map((issue) => ({
      series: issue.series?.title ?? "",
      volume: Number(issue.series?.volume ?? 0),
      publisher: issue.series?.publisher?.name ?? "",
      number: issue.number,
      collectedEditions: issue.variants.map((v) => ({
        id: Number(v.id),
        format: v.format,
        variant: v.variantLabel || null,
        title: issue.title || null,
        releaseDate: v.releaseDate?.toISOString().slice(0, 10) ?? null,
        price: formatPrice(v.price, v.currency),
      })),
    }));

  return {
    totalGroups: duplicateGroups.length,
    totalSellableEditions: duplicateGroups.reduce((sum, g) => sum + g.collectedEditions.length - 1, 0),
    note: "Pro Gruppe kannst du mindestens eine Ausgabe verkaufen.",
    groups: duplicateGroups,
  };
}

// ── find_sellable_reprints ─────────────────────────────────────────────────────

interface FindSellableReprintsParams {
  publisher_pattern?: string;
  exclude_formats?: string[];
  exclude_complete_series?: boolean;
  limit?: number;
}

export async function mcpFindSellableReprints(params: FindSellableReprintsParams) {
  const limit = Math.min(params.limit ?? 100, 200);

  // Optionally find complete series to exclude
  let excludeSeriesIds: Set<string> | undefined;
  if (params.exclude_complete_series) {
    const allSeries = await prisma.series.findMany({
      where: {
        publisher: {
          original: false,
          ...(params.publisher_pattern
            ? { name: { contains: params.publisher_pattern, mode: "insensitive" } }
            : {}),
        },
      },
      select: {
        id: true,
        issues: {
          select: {
            variants: {
              select: {
                collected: true,
              },
            },
          },
        },
      },
    });
    excludeSeriesIds = new Set(
      allSeries
        .filter((s) => s.issues.length > 0 && s.issues.every((i) => i.variants.some((v) => v.collected === true)))
        .map((s) => String(s.id))
    );
  }

  const issues = await prisma.issue.findMany({
    where: {
      isReprintOnly: true,
      hasFirstPrint: false,
      series: {
        publisher: {
          original: false,
          ...(params.publisher_pattern
            ? { name: { contains: params.publisher_pattern, mode: "insensitive" } }
            : {}),
        },
      },
      variants: {
        some: {
          collected: true,
          ...(params.exclude_formats?.length
            ? { NOT: { format: { in: params.exclude_formats } } }
            : {}),
        },
      },
    },
    select: {
      id: true,
      number: true,
      title: true,
      fkSeries: true,
      series: {
        select: {
          title: true,
          volume: true,
          publisher: { select: { name: true } },
        },
      },
      variants: {
        where: {
          collected: true,
          ...(params.exclude_formats?.length
            ? { NOT: { format: { in: params.exclude_formats } } }
            : {}),
        },
        select: {
          id: true,
          format: true,
          variantLabel: true,
          releaseDate: true,
          price: true,
          currency: true,
        },
      },
    },
    orderBy: [
      { series: { publisher: { name: "asc" } } },
      { series: { title: "asc" } },
      { numberNumeric: "asc" },
    ],
    take: limit,
  });

  const filteredIssues = excludeSeriesIds
    ? issues.filter((i) => !excludeSeriesIds!.has(String(i.fkSeries)))
    : issues;

  interface FlattenedItem {
    id: number;
    series: string;
    volume: number;
    publisher: string;
    number: string;
    title: string | null;
    format: string;
    variant: string | null;
    releaseDate: string | null;
    price: string | null;
  }

  const items: FlattenedItem[] = [];

  for (const issue of filteredIssues) {
    const pub = issue.series?.publisher?.name ?? "Unbekannt";
    const seriesTitle = issue.series?.title ?? "";
    const seriesVolume = Number(issue.series?.volume ?? 0);

    for (const v of issue.variants) {
      items.push({
        id: Number(v.id),
        series: seriesTitle,
        volume: seriesVolume,
        publisher: pub,
        number: issue.number,
        title: issue.title || null,
        format: v.format,
        variant: v.variantLabel || null,
        releaseDate: v.releaseDate?.toISOString().slice(0, 10) ?? null,
        price: formatPrice(v.price, v.currency),
      });
    }
  }

  const byPublisher = new Map<string, FlattenedItem[]>();
  for (const item of items) {
    const pub = item.publisher;
    if (!byPublisher.has(pub)) byPublisher.set(pub, []);
    byPublisher.get(pub)!.push(item);
  }

  const grouped = Array.from(byPublisher.entries()).map(([publisher, publisherItems]) => ({
    publisher,
    count: publisherItems.length,
    issues: publisherItems,
  }));

  return {
    totalSellable: items.length,
    note: "Alle gelisteten Hefte sind vollständige Nachdrucke ohne Erstveröffentlichungen. Hardcover wurden ggf. ausgeschlossen. Vollständig gesammelte Serien wurden ggf. ausgeschlossen.",
    byPublisher: grouped,
  };
}

// ── mcpSearchCatalog ────────────────────────────────────────────────────────

export type McpSearchResult = {
  id: number;
  type: "issue" | "series" | "publisher";
  label: string;
  publisher: string | null;
  seriesTitle: string | null;
  volume: number | null;
  startYear: number | null;
  issueNumber: string | null;
  format: string | null;
  variant: string | null;
  us: boolean;
  url: string;
};

export async function mcpSearchCatalog(params: {
  query: string;
  scope?: "all" | "series" | "issue" | "publisher";
  us?: boolean;
  limit?: number;
}): Promise<McpSearchResult[]> {
  const rawQuery = params.query.trim();
  if (!rawQuery) return [];

  const limit = Math.min(Math.max(params.limit ?? 10, 1), 50);

  // Normalize punctuation and hyphens so "Spider-Man" matches "spider man" in search_index
  const normalized = rawQuery.replace(/[^a-zA-Z0-9äöüÄÖÜß]+/g, " ").trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const plainTsQuery = tokens.join(" ");
  const likePattern = `%${tokens.join("%")}%`;

  const nodeTypeFilter =
    params.scope && params.scope !== "all"
      ? Prisma.sql`AND si.node_type = ${params.scope}::shortbox."SearchIndexNodeType"`
      : Prisma.empty;

  const usFilter =
    params.us !== undefined
      ? Prisma.sql`AND si.us = ${params.us}`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{
    source_id: bigint;
    node_type: "publisher" | "series" | "issue";
    label: string;
    url: string;
    publisher_name: string | null;
    series_title: string | null;
    series_volume: number | null;
    series_startyear: number | null;
    issue_number: string | null;
    issue_format: string | null;
    issue_variant: string | null;
    us: boolean;
  }>>(Prisma.sql`
    SELECT
      si.source_id,
      si.node_type,
      si.label,
      si.url,
      si.publisher_name,
      si.series_title,
      si.series_volume,
      si.series_startyear,
      si.issue_number,
      si.issue_format,
      si.issue_variant,
      si.us
    FROM shortbox.search_index si
    WHERE (
      si.search_tsv @@ plainto_tsquery('simple', unaccent(CAST(${plainTsQuery} AS text)))
      OR si.search_text ILIKE CAST(${likePattern} AS text)
    )
    ${nodeTypeFilter}
    ${usFilter}
    ORDER BY
      ts_rank_cd(si.search_tsv, plainto_tsquery('simple', unaccent(CAST(${plainTsQuery} AS text)))) DESC,
      similarity(si.search_text, unaccent(CAST(${plainTsQuery} AS text))) DESC,
      si.label ASC
    LIMIT CAST(${limit} AS integer)
  `);

  return rows.map((r) => ({
    id: Number(r.source_id),
    type: r.node_type,
    label: r.label,
    publisher: r.publisher_name,
    seriesTitle: r.series_title,
    volume: r.series_volume,
    startYear: r.series_startyear,
    issueNumber: r.issue_number,
    format: r.issue_format,
    variant: r.issue_variant,
    us: r.us,
    url: r.url,
  }));
}

// ── mcpCheckCollectionStatus ────────────────────────────────────────────────

export type McpIssueCollectionStatus = {
  type: "issue";
  id: number;
  number: string;
  title: string | null;
  series: string;
  seriesId: number;
  volume: number;
  publisher: string;
  isUs: boolean;
  collected: boolean;
  collectedVariants: Array<{
    id: number;
    format: string;
    variantLabel: string | null;
    price: string | null;
    releaseDate: string | null;
  }>;
  allVariantsCount: number;
  flags: {
    isReprintOnly: boolean;
    hasFirstPrint: boolean;
    hasOnlyPrint: boolean;
  };
};

export type McpSeriesCollectionStatus = {
  type: "series";
  id: number;
  title: string;
  volume: number;
  startYear: number;
  endYear: number | null;
  publisher: string;
  isUs: boolean;
  totalIssues: number;
  collectedCount: number;
  missingCount: number;
  completionPercent: number;
  isComplete: boolean;
  missingNumbers: string[];
  collectedNumbers: string[];
};

export async function mcpCheckCollectionStatus(params: {
  issue_id?: number;
  series_id?: number;
}): Promise<McpIssueCollectionStatus | McpSeriesCollectionStatus | null> {
  if (params.issue_id != null) {
    const issue = await prisma.issue.findFirst({
      where: { id: BigInt(params.issue_id) },
      select: {
        id: true,
        number: true,
        title: true,
        isReprintOnly: true,
        hasFirstPrint: true,
        hasOnlyPrint: true,
        series: {
          select: {
            id: true,
            title: true,
            volume: true,
            startYear: true,
            publisher: { select: { name: true, original: true } },
          },
        },
        variants: {
          select: {
            id: true,
            format: true,
            variantLabel: true,
            releaseDate: true,
            price: true,
            currency: true,
            collected: true,
          },
          orderBy: [{ format: "asc" }, { variantLabel: "asc" }],
        },
      },
    });

    if (!issue) return null;

    const collectedVariants = issue.variants.filter((v) => v.collected === true);
    return {
      type: "issue",
      id: Number(issue.id),
      number: issue.number,
      title: issue.title || null,
      series: issue.series?.title ?? "",
      seriesId: Number(issue.series?.id ?? 0),
      volume: Number(issue.series?.volume ?? 0),
      publisher: issue.series?.publisher?.name ?? "",
      isUs: issue.series?.publisher?.original ?? false,
      collected: collectedVariants.length > 0,
      collectedVariants: collectedVariants.map((v) => ({
        id: Number(v.id),
        format: v.format,
        variantLabel: v.variantLabel || null,
        price: formatPrice(v.price, v.currency),
        releaseDate: formatDate(v.releaseDate),
      })),
      allVariantsCount: issue.variants.length,
      flags: {
        isReprintOnly: issue.isReprintOnly,
        hasFirstPrint: issue.hasFirstPrint,
        hasOnlyPrint: issue.hasOnlyPrint,
      },
    };
  }

  if (params.series_id != null) {
    const series = await prisma.series.findFirst({
      where: { id: BigInt(params.series_id) },
      select: {
        id: true,
        title: true,
        volume: true,
        startYear: true,
        endYear: true,
        publisher: { select: { name: true, original: true } },
        issues: {
          select: {
            id: true,
            number: true,
            variants: {
              select: { collected: true },
            },
          },
          orderBy: [{ numberNumeric: "asc" }, { number: "asc" }],
        },
      },
    });

    if (!series) return null;

    const total = series.issues.length;
    const collectedIssues = series.issues.filter((i) => i.variants.some((v) => v.collected === true));
    const missingIssues = series.issues.filter((i) => !i.variants.some((v) => v.collected === true));
    const collectedCount = collectedIssues.length;
    const missingCount = missingIssues.length;
    const completionPercent = total > 0 ? Math.round((collectedCount / total) * 1000) / 10 : 0;

    return {
      type: "series",
      id: Number(series.id),
      title: series.title ?? "",
      volume: Number(series.volume),
      startYear: Number(series.startYear),
      endYear: series.endYear != null ? Number(series.endYear) : null,
      publisher: series.publisher?.name ?? "",
      isUs: series.publisher?.original ?? false,
      totalIssues: total,
      collectedCount,
      missingCount,
      completionPercent,
      isComplete: total > 0 && missingCount === 0,
      missingNumbers: missingIssues.map((i) => i.number),
      collectedNumbers: collectedIssues.map((i) => i.number),
    };
  }

  return null;
}

// ── mcpResolveStoryPublications ─────────────────────────────────────────────

export type McpStoryPublicationMatch = {
  issueId: number;
  series: string;
  seriesId: number;
  volume: number;
  publisher: string;
  number: string;
  title: string | null;
  isUs: boolean;
  collected: boolean;
  matchingStories: string[];
  formats: string[];
};

export type McpStoryPublicationResult = {
  sourceIssue: {
    id: number;
    number: string;
    title: string | null;
    series: string;
    volume: number;
    publisher: string;
    isUs: boolean;
    storiesCount: number;
  };
  publications: McpStoryPublicationMatch[];
};

export async function mcpResolveStoryPublications(params: {
  issue_id: number;
}): Promise<McpStoryPublicationResult | null> {
  const issue = await prisma.issue.findFirst({
    where: { id: BigInt(params.issue_id) },
    select: {
      id: true,
      number: true,
      title: true,
      series: {
        select: {
          id: true,
          title: true,
          volume: true,
          publisher: { select: { name: true, original: true } },
        },
      },
      stories: {
        select: {
          id: true,
          title: true,
          number: true,
          part: true,
          parent: {
            select: {
              id: true,
              title: true,
              issue: {
                select: {
                  id: true,
                  number: true,
                  title: true,
                  series: {
                    select: {
                      id: true,
                      title: true,
                      volume: true,
                      publisher: { select: { name: true, original: true } },
                    },
                  },
                  variants: { select: { collected: true, format: true } },
                },
              },
            },
          },
          children: {
            select: {
              id: true,
              title: true,
              issue: {
                select: {
                  id: true,
                  number: true,
                  title: true,
                  series: {
                    select: {
                      id: true,
                      title: true,
                      volume: true,
                      publisher: { select: { name: true, original: true } },
                    },
                  },
                  variants: { select: { collected: true, format: true } },
                },
              },
            },
          },
          reprintedBy: {
            select: {
              id: true,
              title: true,
              issue: {
                select: {
                  id: true,
                  number: true,
                  title: true,
                  series: {
                    select: {
                      id: true,
                      title: true,
                      volume: true,
                      publisher: { select: { name: true, original: true } },
                    },
                  },
                  variants: { select: { collected: true, format: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!issue) return null;

  const isUs = issue.series?.publisher?.original ?? false;
  const sourceId = Number(issue.id);
  const matchMap = new Map<number, McpStoryPublicationMatch>();

  function registerMatch(
    targetIssue: {
      id: bigint;
      number: string;
      title: string | null;
      series: {
        id: bigint;
        title: string | null;
        volume: bigint;
        publisher: { name: string; original: boolean } | null;
      } | null;
      variants: Array<{ collected: boolean | null; format: string }>;
    },
    storyTitle: string
  ) {
    const targetId = Number(targetIssue.id);
    if (targetId === sourceId) return; // Don't link issue to itself

    const existing = matchMap.get(targetId);
    const storyDesc = storyTitle.trim() || "Hauptgeschichte";

    if (existing) {
      if (!existing.matchingStories.includes(storyDesc)) {
        existing.matchingStories.push(storyDesc);
      }
    } else {
      const collected = targetIssue.variants.some((v) => v.collected === true);
      const uniqueFormats = Array.from(new Set(targetIssue.variants.map((v) => v.format).filter(Boolean)));

      matchMap.set(targetId, {
        issueId: targetId,
        series: targetIssue.series?.title ?? "",
        seriesId: Number(targetIssue.series?.id ?? 0),
        volume: Number(targetIssue.series?.volume ?? 0),
        publisher: targetIssue.series?.publisher?.name ?? "",
        number: targetIssue.number,
        title: targetIssue.title || null,
        isUs: targetIssue.series?.publisher?.original ?? false,
        collected,
        matchingStories: [storyDesc],
        formats: uniqueFormats,
      });
    }
  }

  for (const story of issue.stories) {
    const storyLabel = story.title || (story.part ? `Teil ${story.part}` : `Story #${story.number}`);

    if (isUs) {
      // US issue: look for German reprints in children & reprintedBy
      for (const child of story.children) {
        if (child.issue) registerMatch(child.issue, storyLabel);
      }
      for (const reprint of story.reprintedBy) {
        if (reprint.issue) registerMatch(reprint.issue, storyLabel);
      }
    } else {
      // German issue: look for US parent originals and other German reprints
      if (story.parent?.issue) {
        registerMatch(story.parent.issue, storyLabel);
      }
      for (const reprint of story.reprintedBy) {
        if (reprint.issue) registerMatch(reprint.issue, storyLabel);
      }
    }
  }

  const publications = Array.from(matchMap.values());
  // Sort: collected first, then publisher, then series
  publications.sort((a, b) => {
    if (a.collected !== b.collected) return a.collected ? -1 : 1;
    if (a.publisher !== b.publisher) return a.publisher.localeCompare(b.publisher);
    return a.series.localeCompare(b.series);
  });

  return {
    sourceIssue: {
      id: Number(issue.id),
      number: issue.number,
      title: issue.title || null,
      series: issue.series?.title ?? "",
      volume: Number(issue.series?.volume ?? 0),
      publisher: issue.series?.publisher?.name ?? "",
      isUs,
      storiesCount: issue.stories.length,
    },
    publications,
  };
}

