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

// ── Health Audit ─────────────────────────────────────────────────────────────

export type McpHealthFinding = {
  rule: string;
  severity: "ERROR" | "WARNING" | "INFO";
  message: string;
  storyId?: number;
  storyNumber?: number;
  storyTitle?: string;
};

export type McpIssueHealthReport = {
  issueId: number;
  series: string;
  seriesId: number;
  number: string;
  title: string | null;
  publisher: string;
  isUs: boolean;
  healthScore: number;
  storiesCount: number;
  variantsCount: number;
  findings: McpHealthFinding[];
};

export type McpAuditPublicationHealthResult = {
  summary: {
    totalAudited: number;
    issuesWithErrors: number;
    issuesWithWarnings: number;
    cleanIssues: number;
    averageHealthScore: number;
  };
  issues: McpIssueHealthReport[];
};

export async function mcpAuditPublicationHealth(params: {
  issue_id?: number;
  series_id?: number;
  publisher_pattern?: string;
  limit?: number;
}): Promise<McpAuditPublicationHealthResult> {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);

  const where: Prisma.IssueWhereInput = {
    ...(params.issue_id ? { id: BigInt(params.issue_id) } : {}),
    ...(params.series_id ? { fkSeries: BigInt(params.series_id) } : {}),
    ...(params.publisher_pattern
      ? {
          publisher: {
            name: { contains: params.publisher_pattern, mode: "insensitive" },
          },
        }
      : {}),
  };

  const issues = await prisma.issue.findMany({
    where,
    take: limit,
    include: {
      series: {
        include: { publisher: true },
      },
      publisher: true,
      variants: true,
      stories: {
        orderBy: { number: "asc" },
        include: {
          parent: {
            include: {
              issue: {
                include: { series: true },
              },
            },
          },
          individuals: {
            include: { individual: true },
          },
        },
      },
    },
    orderBy: [{ fkSeries: "asc" }, { numberNumeric: "asc" }, { id: "asc" }],
  });

  const dummyPattern = /^(untitled|\(ohne titel\)?|ohne titel|\[ohne titel\]|\?|-|n\/a|\[n\.g\.\])$/i;
  const plenksPattern = /\s+[!?:;,]/;
  const pageRangePattern = /\s+\(?\d+-\d+\)?$/;
  const fractionPattern = /\b\d+\/\d+\b/;
  const scanTyposPattern = /(\s+7i\b|`[a-zA-Z])/;

  const auditedIssues: McpIssueHealthReport[] = [];
  let issuesWithErrors = 0;
  let issuesWithWarnings = 0;
  let totalScore = 0;

  for (const iss of issues) {
    const isUs = iss.publisher?.original ?? iss.series?.publisher?.original ?? false;
    const findings: McpHealthFinding[] = [];
    let score = 100;

    // Check: 0 stories on issue
    if (iss.stories.length === 0) {
      findings.push({
        rule: "ZERO_STORIES_ON_ISSUE",
        severity: "WARNING",
        message: "Heft hat 0 eingetragene Comic-Stories (Textband, Sekundärliteratur oder fehlender Import?).",
      });
      score -= 10;
    }

    // Check: Variant metadata & external IDs
    if (iss.variants.length === 0) {
      findings.push({
        rule: "NO_VARIANTS_RECORDED",
        severity: "ERROR",
        message: "Heft hat keine physische Variante (Variant-Eintrag fehlt).",
      });
      score -= 25;
    } else {
      for (const v of iss.variants) {
        if (!v.format) {
          findings.push({
            rule: "MISSING_VARIANT_FORMAT",
            severity: "ERROR",
            message: `Variante #${v.id} hat kein Format definiert.`,
          });
          score -= 20;
        }
        if (v.gcdId == null && v.comicGuideId == null) {
          findings.push({
            rule: "MISSING_EXTERNAL_IDS",
            severity: "WARNING",
            message: `Variante #${v.id} (${v.format || "Unbekannt"}) hat weder gcdId noch comicGuideId.`,
          });
          score -= 8;
        }
      }
    }

    // Check story sequence continuity
    const seenNumbers = new Set<number>();
    iss.stories.forEach((st, idx) => {
      const num = Number(st.number);
      if (seenNumbers.has(num)) {
        findings.push({
          rule: "DUPLICATE_STORY_NUMBER",
          severity: "ERROR",
          message: `Doppelte Story.number ${num} auf Heft #${iss.id}.`,
          storyId: Number(st.id),
          storyNumber: num,
          storyTitle: st.title,
        });
        score -= 20;
      }
      seenNumbers.add(num);

      if (idx > 0) {
        const prevNum = Number(iss.stories[idx - 1].number);
        if (num !== prevNum + 1) {
          findings.push({
            rule: "STORY_SEQUENCE_GAP",
            severity: "INFO",
            message: `Nummerierungslücke zwischen Story ${prevNum} und ${num}.`,
            storyId: Number(st.id),
            storyNumber: num,
          });
          score -= 2;
        }
      }

      // Title inspections
      const rawTitle = st.title;
      if (rawTitle) {
        if (dummyPattern.test(rawTitle)) {
          findings.push({
            rule: "NO_DUMMY_TITLE",
            severity: "ERROR",
            message: `Verbotener Dummy-Titel "${rawTitle}" (muss leere Zeichenkette "" sein).`,
            storyId: Number(st.id),
            storyNumber: num,
            storyTitle: rawTitle,
          });
          score -= 25;
        }

        if (plenksPattern.test(rawTitle)) {
          findings.push({
            rule: "NO_PLENKS",
            severity: "ERROR",
            message: `Plenk (Leerzeichen vor Satzzeichen) in Story-Titel: "${rawTitle}".`,
            storyId: Number(st.id),
            storyNumber: num,
            storyTitle: rawTitle,
          });
          score -= 20;
        }

        if (scanTyposPattern.test(rawTitle)) {
          findings.push({
            rule: "SCAN_OR_TYPO_ARTIFACT",
            severity: "ERROR",
            message: `Scan-Fehler oder Typo-Artefakt in Story-Titel: "${rawTitle}".`,
            storyId: Number(st.id),
            storyNumber: num,
            storyTitle: rawTitle,
          });
          score -= 20;
        }

        if (pageRangePattern.test(rawTitle)) {
          findings.push({
            rule: "ATTACHED_PAGE_RANGE",
            severity: "WARNING",
            message: `Angehängter Seitenbereich im Story-Titel: "${rawTitle}".`,
            storyId: Number(st.id),
            storyNumber: num,
            storyTitle: rawTitle,
          });
          score -= 8;
        }

        if (fractionPattern.test(rawTitle)) {
          findings.push({
            rule: "EDITORIAL_FRACTION",
            severity: "WARNING",
            message: `Redaktioneller Zählbruch (z.B. 1/2) im Story-Titel: "${rawTitle}".`,
            storyId: Number(st.id),
            storyNumber: num,
            storyTitle: rawTitle,
          });
          score -= 8;
        }
      }

      // German editions specific checks
      if (!isUs) {
        if (!st.fkParent) {
          findings.push({
            rule: "MISSING_US_PARENT",
            severity: "WARNING",
            message: `Deutsche Story #${num} (${st.title || "ohne Titel"}) hat keine verlinkte US-Originalstory.`,
            storyId: Number(st.id),
            storyNumber: num,
            storyTitle: st.title,
          });
          score -= 10;
        } else if (st.parent?.title && st.title && st.title.trim().toLowerCase() === st.parent.title.trim().toLowerCase()) {
          findings.push({
            rule: "SUSPICIOUS_US_TITLE_COPY",
            severity: "INFO",
            message: `Deutscher Story-Titel identisch mit englischem US-Titel ("${st.title}"). Prüfen ob offizieller Titel oder versehentlich kopiert.`,
            storyId: Number(st.id),
            storyNumber: num,
            storyTitle: st.title,
          });
          score -= 2;
        }

        // Translator check on first print
        const translators = st.individuals.filter((i) => i.type.toUpperCase() === "TRANSLATOR");
        if (iss.hasFirstPrint && translators.length === 0) {
          findings.push({
            rule: "MISSING_TRANSLATOR",
            severity: "WARNING",
            message: `Erstveröffentlichung von Story #${num}, aber kein Übersetzer zugeordnet.`,
            storyId: Number(st.id),
            storyNumber: num,
            storyTitle: st.title,
          });
          score -= 8;
        }
      }
    });

    const finalScore = Math.max(0, Math.min(100, score));
    totalScore += finalScore;

    const hasError = findings.some((f) => f.severity === "ERROR");
    const hasWarning = findings.some((f) => f.severity === "WARNING");
    if (hasError) issuesWithErrors++;
    else if (hasWarning) issuesWithWarnings++;

    auditedIssues.push({
      issueId: Number(iss.id),
      series: iss.series?.title ?? "",
      seriesId: Number(iss.series?.id ?? 0),
      number: iss.number,
      title: iss.title || null,
      publisher: iss.publisher?.name ?? iss.series?.publisher?.name ?? "",
      isUs,
      healthScore: finalScore,
      storiesCount: iss.stories.length,
      variantsCount: iss.variants.length,
      findings,
    });
  }

  const cleanIssues = issues.length - issuesWithErrors - issuesWithWarnings;
  const averageHealthScore = issues.length > 0 ? Math.round(totalScore / issues.length) : 100;

  return {
    summary: {
      totalAudited: issues.length,
      issuesWithErrors,
      issuesWithWarnings,
      cleanIssues,
      averageHealthScore,
    },
    issues: auditedIssues,
  };
}

// ── Deep Search Catalog ──────────────────────────────────────────────────────

export type McpDeepSearchResult = {
  query: string;
  totalMatches: number;
  characters: Array<{ id: number; name: string; type: string; storyCount: number }>;
  arcs: Array<{ id: number; title: string; issueCount: number }>;
  creators: Array<{ id: number; name: string; types: string[]; issueCount: number }>;
  stories: Array<{ id: number; title: string; issueId: number; seriesTitle: string; issueNumber: string; isUs: boolean }>;
  publications: McpSearchResult[];
};

export async function mcpSearchDeepCatalog(params: {
  query: string;
  types?: Array<"all" | "series" | "issue" | "character" | "arc" | "creator" | "story">;
  us?: boolean;
  limit?: number;
}): Promise<McpDeepSearchResult> {
  const query = params.query.trim();
  if (!query) {
    return {
      query: "",
      totalMatches: 0,
      characters: [],
      arcs: [],
      creators: [],
      stories: [],
      publications: [],
    };
  }

  const searchTypes = params.types && params.types.length > 0 ? params.types : ["all"];
  const isAll = searchTypes.includes("all");
  const limit = Math.min(Math.max(params.limit ?? 10, 1), 30);

  const [characters, arcs, creators, stories, publications] = await Promise.all([
    // 1. Characters / Appearances
    isAll || searchTypes.includes("character")
      ? prisma.appearance.findMany({
          where: { name: { contains: query, mode: "insensitive" } },
          take: limit,
          select: {
            id: true,
            name: true,
            type: true,
            _count: { select: { storyLinks: true } },
          },
          orderBy: { storyLinks: { _count: "desc" } },
        })
      : Promise.resolve([]),

    // 2. Arcs / Events
    isAll || searchTypes.includes("arc")
      ? prisma.arc.findMany({
          where: { title: { contains: query, mode: "insensitive" } },
          take: limit,
          select: {
            id: true,
            title: true,
            _count: { select: { issues: true } },
          },
          orderBy: { issues: { _count: "desc" } },
        })
      : Promise.resolve([]),

    // 3. Creators / Individuals
    isAll || searchTypes.includes("creator")
      ? prisma.individual.findMany({
          where: { name: { contains: query, mode: "insensitive" } },
          take: limit,
          select: {
            id: true,
            name: true,
            storyLinks: { select: { type: true }, take: 10 },
            _count: { select: { storyLinks: true } },
          },
          orderBy: { storyLinks: { _count: "desc" } },
        })
      : Promise.resolve([]),

    // 4. Story titles
    isAll || searchTypes.includes("story")
      ? prisma.story.findMany({
          where: {
            title: { contains: query, mode: "insensitive" },
            NOT: { title: "" },
          },
          take: limit,
          select: {
            id: true,
            title: true,
            issue: {
              select: {
                id: true,
                number: true,
                series: {
                  select: {
                    title: true,
                    publisher: { select: { original: true } },
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),

    // 5. Publications (Series & Issues via search index)
    isAll || searchTypes.includes("series") || searchTypes.includes("issue")
      ? mcpSearchCatalog({ query, us: params.us, limit })
      : Promise.resolve([]),
  ]);

  const formattedCharacters = characters.map((c) => ({
    id: Number(c.id),
    name: c.name,
    type: c.type,
    storyCount: c._count.storyLinks,
  }));

  const formattedArcs = arcs.map((a) => ({
    id: Number(a.id),
    title: a.title,
    issueCount: a._count.issues,
  }));

  const formattedCreators = creators.map((cr) => ({
    id: Number(cr.id),
    name: cr.name,
    types: Array.from(new Set(cr.storyLinks.map((sl) => sl.type).filter(Boolean))),
    issueCount: cr._count.storyLinks,
  }));

  const formattedStories = stories.map((s) => ({
    id: Number(s.id),
    title: s.title,
    issueId: Number(s.issue?.id ?? 0),
    seriesTitle: s.issue?.series?.title ?? "",
    issueNumber: s.issue?.number ?? "",
    isUs: s.issue?.series?.publisher?.original ?? false,
  }));

  const totalMatches =
    formattedCharacters.length +
    formattedArcs.length +
    formattedCreators.length +
    formattedStories.length +
    publications.length;

  return {
    query,
    totalMatches,
    characters: formattedCharacters,
    arcs: formattedArcs,
    creators: formattedCreators,
    stories: formattedStories,
    publications,
  };
}

// ── Storyline Chronology ─────────────────────────────────────────────────────

export type McpStorylineChronologyResult = {
  arc: { id: number; title: string; type: string };
  totalIssues: number;
  collectedIssues: number;
  completionPercent: number;
  issues: Array<{
    usIssue: {
      id: number;
      series: string;
      number: string;
      title: string | null;
      releaseDate: string | null;
    };
    isCollected: boolean;
    germanEditions: Array<{
      id: number;
      series: string;
      number: string;
      publisher: string;
      format: string;
      collected: boolean;
      storyTitle: string;
    }>;
  }>;
};

export async function mcpGetStorylineChronology(params: {
  arc_id?: number;
  title?: string;
}): Promise<McpStorylineChronologyResult | null> {
  const arc = await prisma.arc.findFirst({
    where: {
      ...(params.arc_id ? { id: BigInt(params.arc_id) } : {}),
      ...(params.title ? { title: { contains: params.title, mode: "insensitive" } } : {}),
    },
    include: {
      issues: {
        include: {
          issue: {
            include: {
              series: { include: { publisher: true } },
              variants: { select: { collected: true, releaseDate: true } },
              stories: {
                include: {
                  children: {
                    include: {
                      issue: {
                        include: {
                          series: { include: { publisher: true } },
                          variants: { select: { format: true, collected: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!arc) return null;

  const rawIssues = arc.issues.map((l) => l.issue);
  // Sort chronologically by numberNumeric or series
  rawIssues.sort((a, b) => {
    const aNum = Number(a.numberNumeric ?? 0);
    const bNum = Number(b.numberNumeric ?? 0);
    if (a.series?.title === b.series?.title) return aNum - bNum;
    return (a.series?.title ?? "").localeCompare(b.series?.title ?? "");
  });

  let collectedCount = 0;

  const issueChronology = rawIssues.map((iss) => {
    const isDirectlyCollected = iss.variants.some((v) => v.collected === true);

    const deMap = new Map<number, {
      id: number;
      series: string;
      number: string;
      publisher: string;
      format: string;
      collected: boolean;
      storyTitle: string;
    }>();

    for (const story of iss.stories) {
      for (const child of story.children) {
        if (!child.issue) continue;
        const deIss = child.issue;
        const deId = Number(deIss.id);
        const isDeCollected = deIss.variants.some((v) => v.collected === true);
        const format = deIss.variants.map((v) => v.format).filter(Boolean)[0] || "Heft";

        if (!deMap.has(deId)) {
          deMap.set(deId, {
            id: deId,
            series: deIss.series?.title ?? "",
            number: deIss.number,
            publisher: deIss.series?.publisher?.name ?? "",
            format,
            collected: isDeCollected,
            storyTitle: child.title || "Comic Story",
          });
        }
      }
    }

    const germanEditions = Array.from(deMap.values());
    const isCollectedViaGerman = germanEditions.some((g) => g.collected);
    const isCollected = isDirectlyCollected || isCollectedViaGerman;
    if (isCollected) collectedCount++;

    const firstRelDate = iss.variants.find((v) => v.releaseDate)?.releaseDate ?? null;

    return {
      usIssue: {
        id: Number(iss.id),
        series: iss.series?.title ?? "",
        number: iss.number,
        title: iss.title || null,
        releaseDate: formatDate(firstRelDate),
      },
      isCollected,
      germanEditions,
    };
  });

  const total = issueChronology.length;
  const completionPercent = total > 0 ? Math.round((collectedCount / total) * 100) : 0;

  return {
    arc: {
      id: Number(arc.id),
      title: arc.title,
      type: "STORYARC",
    },
    totalIssues: total,
    collectedIssues: collectedCount,
    completionPercent,
    issues: issueChronology,
  };
}

// ── US Run Coverage ──────────────────────────────────────────────────────────

export type McpUsRunCoverageRaw = {
  usSeries: { id: number; title: string; publisher: string };
  runRange: { start: string; end: string; totalRequested: number };
  collectedNumbers: string[];
  availableUncollectedNumbers: string[];
  neverTranslatedNumbers: string[];
  details: Array<{
    usNumber: string;
    status: "COLLECTED" | "AVAILABLE_UNCOLLECTED" | "NEVER_TRANSLATED";
    germanPublications: Array<{
      issueId: number;
      series: string;
      number: string;
      publisher: string;
      format: string;
      collected: boolean;
    }>;
  }>;
};

export async function mcpAnalyzeUsRunCoverage(params: {
  us_series_id?: number;
  us_series_title?: string;
  start_number?: number;
  end_number?: number;
}): Promise<McpUsRunCoverageRaw | null> {
  const series = await prisma.series.findFirst({
    where: {
      ...(params.us_series_id ? { id: BigInt(params.us_series_id) } : {}),
      ...(params.us_series_title
        ? { title: { contains: params.us_series_title, mode: "insensitive" } }
        : {}),
      publisher: { original: true },
    },
    include: { publisher: true },
  });

  if (!series) return null;

  const issues = await prisma.issue.findMany({
    where: {
      fkSeries: series.id,
      ...(params.start_number != null
        ? { numberNumeric: { gte: params.start_number } }
        : {}),
      ...(params.end_number != null
        ? { numberNumeric: { lte: params.end_number } }
        : {}),
    },
    orderBy: { numberNumeric: "asc" },
    include: {
      variants: { select: { collected: true } },
      stories: {
        include: {
          children: {
            include: {
              issue: {
                include: {
                  series: { include: { publisher: true } },
                  variants: { select: { format: true, collected: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const collectedNumbers: string[] = [];
  const availableUncollectedNumbers: string[] = [];
  const neverTranslatedNumbers: string[] = [];

  const details = issues.map((iss) => {
    const isDirectlyCollected = iss.variants.some((v) => v.collected === true);

    const deMap = new Map<number, {
      issueId: number;
      series: string;
      number: string;
      publisher: string;
      format: string;
      collected: boolean;
    }>();

    for (const story of iss.stories) {
      for (const child of story.children) {
        if (!child.issue) continue;
        const deIss = child.issue;
        const deId = Number(deIss.id);
        const isDeCollected = deIss.variants.some((v) => v.collected === true);
        const format = deIss.variants.map((v) => v.format).filter(Boolean)[0] || "Heft";

        if (!deMap.has(deId)) {
          deMap.set(deId, {
            issueId: deId,
            series: deIss.series?.title ?? "",
            number: deIss.number,
            publisher: deIss.series?.publisher?.name ?? "",
            format,
            collected: isDeCollected,
          });
        }
      }
    }

    const germanPublications = Array.from(deMap.values());
    const hasGermanPublication = germanPublications.length > 0;
    const isGermanCollected = germanPublications.some((g) => g.collected);

    let status: "COLLECTED" | "AVAILABLE_UNCOLLECTED" | "NEVER_TRANSLATED";
    if (isDirectlyCollected || isGermanCollected) {
      status = "COLLECTED";
      collectedNumbers.push(iss.number);
    } else if (hasGermanPublication) {
      status = "AVAILABLE_UNCOLLECTED";
      availableUncollectedNumbers.push(iss.number);
    } else {
      status = "NEVER_TRANSLATED";
      neverTranslatedNumbers.push(iss.number);
    }

    return {
      usNumber: iss.number,
      status,
      germanPublications,
    };
  });

  return {
    usSeries: {
      id: Number(series.id),
      title: series.title ?? "",
      publisher: series.publisher?.name ?? "",
    },
    runRange: {
      start: String(params.start_number ?? (issues[0]?.number ?? "")),
      end: String(params.end_number ?? (issues[issues.length - 1]?.number ?? "")),
      totalRequested: issues.length,
    },
    collectedNumbers,
    availableUncollectedNumbers,
    neverTranslatedNumbers,
    details,
  };
}

// ── Upgrade Candidates ───────────────────────────────────────────────────────

export type McpUpgradeCandidate = {
  issueId: number;
  series: string;
  seriesId: number;
  number: string;
  publisher: string;
  ownedVariant: {
    id: number;
    format: string;
    variantLabel: string | null;
    price: string | null;
  };
  upgradeVariant: {
    id: number;
    format: string;
    variantLabel: string | null;
    price: string | null;
    limitation: number | null;
    isbn: string | null;
  };
};

export async function mcpFindUpgradeCandidates(params: {
  publisher_pattern?: string;
  limit?: number;
}): Promise<McpUpgradeCandidate[]> {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);

  const issues = await prisma.issue.findMany({
    where: {
      ...(params.publisher_pattern
        ? {
            publisher: {
              name: { contains: params.publisher_pattern, mode: "insensitive" },
            },
          }
        : {}),
      variants: {
        some: {
          collected: true,
          format: { in: ["Softcover", "Heft", "Taschenbuch", "Prestige"] },
        },
      },
    },
    take: limit * 2,
    include: {
      series: { include: { publisher: true } },
      variants: true,
    },
  });

  const candidates: McpUpgradeCandidate[] = [];

  for (const iss of issues) {
    const owned = iss.variants.find(
      (v) => v.collected === true && ["Softcover", "Heft", "Taschenbuch", "Prestige"].includes(v.format)
    );
    if (!owned) continue;

    const upgrade = iss.variants.find(
      (v) =>
        v.collected !== true &&
        (v.format === "Hardcover" || (v.variantLabel && v.variantLabel.toLowerCase().includes("hardcover")))
    );

    if (upgrade) {
      candidates.push({
        issueId: Number(iss.id),
        series: iss.series?.title ?? "",
        seriesId: Number(iss.series?.id ?? 0),
        number: iss.number,
        publisher: iss.series?.publisher?.name ?? "",
        ownedVariant: {
          id: Number(owned.id),
          format: owned.format,
          variantLabel: owned.variantLabel,
          price: formatPrice(owned.price, owned.currency),
        },
        upgradeVariant: {
          id: Number(upgrade.id),
          format: upgrade.format,
          variantLabel: upgrade.variantLabel,
          price: formatPrice(upgrade.price, upgrade.currency),
          limitation: upgrade.limitation != null ? Number(upgrade.limitation) : null,
          isbn: upgrade.isbn,
        },
      });

      if (candidates.length >= limit) break;
    }
  }

  return candidates;
}

// ── Curation Issue Data ──────────────────────────────────────────────────────

export async function mcpGetIssueCurationData(params: {
  issue_id?: number;
  series_title?: string;
  issue_number?: string;
}) {
  const where: Prisma.IssueWhereInput = {
    ...(params.issue_id ? { id: BigInt(params.issue_id) } : {}),
    ...(params.series_title && params.issue_number
      ? {
          series: { title: { contains: params.series_title, mode: "insensitive" } },
          number: params.issue_number.trim(),
        }
      : {}),
  };

  const issue = await prisma.issue.findFirst({
    where,
    include: {
      series: { include: { publisher: true } },
      publisher: true,
      variants: true,
      stories: {
        orderBy: { number: "asc" },
        include: {
          parent: {
            include: {
              issue: { include: { series: true } },
            },
          },
          individuals: {
            include: { individual: true },
          },
        },
      },
    },
  });

  if (!issue) return null;

  const isUs = issue.publisher?.original ?? issue.series?.publisher?.original ?? false;

  return {
    id: Number(issue.id),
    number: issue.number,
    title: issue.title || null,
    series: issue.series?.title ?? "",
    publisher: issue.publisher?.name ?? issue.series?.publisher?.name ?? "",
    isUs,
    variants: issue.variants.map((v) => ({
      id: Number(v.id),
      format: v.format,
      variantLabel: v.variantLabel,
      gcdId: v.gcdId != null ? Number(v.gcdId) : null,
      comicGuideId: v.comicGuideId != null ? Number(v.comicGuideId) : null,
      isbn: v.isbn,
      pages: v.pages != null ? Number(v.pages) : null,
      price: formatPrice(v.price, v.currency),
      collected: v.collected,
    })),
    stories: issue.stories.map((s) => ({
      id: Number(s.id),
      number: Number(s.number),
      title: s.title,
      parentUs: s.parent
        ? `${s.parent.issue?.series?.title ?? "US"} #${s.parent.issue?.number ?? "?"} - "${s.parent.title}"`
        : null,
      translators: s.individuals
        .filter((i) => i.type.toUpperCase() === "TRANSLATOR")
        .map((i) => i.individual.name),
    })),
  };
}

