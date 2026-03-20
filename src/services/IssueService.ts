import type { Connection, Edge, Filter } from "../types/query-data";
import type { Issue } from "../types/domain";
import { prisma } from "../lib/prisma/client";
import { deleteIssueByLookup } from "../lib/server/issues-write";
import { FilterService } from "./FilterService";

type PublisherRef = {
  name?: string | null;
  us?: boolean | null;
};

type SeriesInput = {
  title?: string | null;
  volume?: number | null;
  publisher?: PublisherRef | null;
};

type IssueInput = {
  number?: string | null;
  title?: string | null;
  format?: string | null;
  variant?: string | null;
  releasedate?: string | null;
  pages?: number | null;
  price?: number | null;
  currency?: string | null;
  comicguideid?: string | number | null;
  legacy_number?: string | null;
  isbn?: string | null;
  limitation?: string | null;
  addinfo?: string | null;
  series?: SeriesInput | null;
};

type SortDirection = "asc" | "desc";

const ALLOWED_LAST_EDITED_SORT_FIELDS = new Set([
  "updatedat",
  "createdat",
  "number",
  "format",
  "variant",
  "title",
  "id",
  "releasedate",
]);

const ROMAN_NUMBER_PATTERN = /^(M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3}))$/i;
const FRACTION_NUMBER_PATTERN = /^(-?\d+)\s*\/\s*(\d+)$/;
const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:[.,]\d+)?$/;
const UNICODE_FRACTION_VALUES: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
};

function buildConnectionFromNodes<T>(nodes: T[]): Connection<T> {
  const edges: Array<Edge<T>> = nodes.map((node, index) => ({
    cursor: String(index),
    node,
  }));

  return {
    edges,
    pageInfo: {
      endCursor: edges.length > 0 ? edges[edges.length - 1]?.cursor ?? null : null,
      hasNextPage: false,
    },
  };
}

function normalizeSortField(field?: string | null) {
  const normalized = String(field || "").trim().toLowerCase();
  return ALLOWED_LAST_EDITED_SORT_FIELDS.has(normalized) ? normalized : "updatedat";
}

function normalizeSortDirection(direction?: string | null): SortDirection {
  return String(direction || "").trim().toLowerCase() === "asc" ? "asc" : "desc";
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function toOptionalText(value: unknown) {
  const normalized = normalizeText(value);
  return normalized === "" ? null : normalized;
}

function parseSortableIssueNumber(value: string): number | null {
  const trimmed = value.trim();
  const unicodeFractionMatch = trimmed.match(/^(-?\d+)?\s*([¼½¾])$/);
  if (unicodeFractionMatch) {
    const whole = Number(unicodeFractionMatch[1] || 0);
    const fraction = UNICODE_FRACTION_VALUES[unicodeFractionMatch[2]];
    if (Number.isFinite(whole) && fraction != null) return whole + fraction;
  }

  const fractionMatch = trimmed.match(FRACTION_NUMBER_PATTERN);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
      return numerator / denominator;
    }
    return null;
  }

  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function fromRoman(value: string): number {
  const romans: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };
  const text = value.toUpperCase();
  let total = 0;
  for (let index = 0; index < text.length; index += 1) {
    const current = romans[text[index]] ?? 0;
    const next = romans[text[index + 1]] ?? 0;
    total += current < next ? -current : current;
  }
  return total;
}

function naturalCompare(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function compareIssueNumber(leftRaw: unknown, rightRaw: unknown): number {
  const left = String(leftRaw ?? "").trim();
  const right = String(rightRaw ?? "").trim();
  const leftIsRoman = left !== "" && ROMAN_NUMBER_PATTERN.test(left);
  const rightIsRoman = right !== "" && ROMAN_NUMBER_PATTERN.test(right);

  if (leftIsRoman && rightIsRoman) return fromRoman(left) - fromRoman(right);
  if (leftIsRoman) return -1;
  if (rightIsRoman) return 1;

  const leftSortable = parseSortableIssueNumber(left);
  const rightSortable = parseSortableIssueNumber(right);
  if (leftSortable != null && rightSortable != null && leftSortable !== rightSortable) {
    return leftSortable - rightSortable;
  }

  return naturalCompare(left, right);
}

function compareIssueVariants(
  left: { format?: string | null; variant?: string | null; id?: bigint | number | string | null },
  right: { format?: string | null; variant?: string | null; id?: bigint | number | string | null }
) {
  const leftFormat = normalizeText(left.format);
  const rightFormat = normalizeText(right.format);
  const leftVariant = normalizeText(left.variant);
  const rightVariant = normalizeText(right.variant);

  if (leftFormat === "" && rightFormat !== "") return -1;
  if (leftFormat !== "" && rightFormat === "") return 1;
  if (leftVariant === "" && rightVariant !== "") return -1;
  if (leftVariant !== "" && rightVariant === "") return 1;

  const formatCompare = naturalCompare(leftFormat, rightFormat);
  if (formatCompare !== 0) return formatCompare;

  const variantCompare = naturalCompare(leftVariant, rightVariant);
  if (variantCompare !== 0) return variantCompare;

  return Number(left.id ?? 0) - Number(right.id ?? 0);
}

function pickPreferredIssueVariant<T extends { format?: string | null; variant?: string | null; id?: bigint | number | string | null }>(
  groupedIssues: T[]
) {
  return [...groupedIssues].sort(compareIssueVariants)[0];
}

function serializePreviewIssue(issue: {
  id: bigint;
  comicGuideId: bigint | null;
  number: string;
  legacyNumber: string | null;
  title: string | null;
  verified: boolean;
  collected: boolean | null;
  format: string | null;
  variant: string | null;
  covers: Array<{ url: string | null }>;
  stories: Array<{
    onlyApp: boolean;
    firstApp: boolean;
    otherOnlyTb: boolean;
    onlyOnePrint: boolean;
    onlyTb: boolean;
    collectedMultipleTimes: boolean;
    reprint: { id: bigint } | null;
    reprintedBy: Array<{ id: bigint }>;
    parent: {
      children: Array<{ id: bigint }>;
      collectedMultipleTimes: boolean;
    } | null;
    children: Array<{
      id: bigint;
      issue: { collected: boolean | null } | null;
    }>;
  }>;
  series: {
    title: string | null;
    volume: bigint;
    startYear: bigint;
    endYear: bigint | null;
    publisher: {
      name: string;
      original: boolean;
    } | null;
  } | null;
}): Issue {
  return {
    id: String(issue.id),
    comicguideid: issue.comicGuideId === null ? null : String(issue.comicGuideId),
    number: issue.number,
    legacy_number: issue.legacyNumber || null,
    title: issue.title || null,
    verified: issue.verified,
    collected: issue.collected ?? null,
    format: issue.format || null,
    variant: issue.variant || null,
    cover: issue.covers[0]
      ? {
          url: issue.covers[0].url || null,
        }
      : null,
    stories: issue.stories.map((story) => ({
      onlyapp: story.onlyApp,
      firstapp: story.firstApp,
      otheronlytb: story.otherOnlyTb,
      exclusive: false,
      onlyoneprint: story.onlyOnePrint,
      onlytb: story.onlyTb,
      reprintOf: story.reprint ? { id: String(story.reprint.id) } : null,
      reprints: story.reprintedBy.map((entry) => ({ id: String(entry.id) })),
      parent: story.parent
        ? {
            children: story.parent.children.map((entry) => ({ id: String(entry.id) })),
            collectedmultipletimes: story.parent.collectedMultipleTimes,
          }
        : null,
      children: story.children.map((entry) => ({
        id: String(entry.id),
        issue: entry.issue
          ? {
              collected: entry.issue.collected ?? null,
            }
          : null,
      })),
      collectedmultipletimes: story.collectedMultipleTimes,
    })) as any,
    series: issue.series
      ? {
          title: issue.series.title || null,
          volume: Number(issue.series.volume),
          startyear: Number(issue.series.startYear),
          endyear: issue.series.endYear === null ? null : Number(issue.series.endYear),
          publisher: issue.series.publisher
            ? {
                name: issue.series.publisher.name,
                us: issue.series.publisher.original,
              }
            : {
                name: null,
                us: null,
              },
        }
      : {
          title: null,
          volume: null,
          startyear: null,
          endyear: null,
          publisher: {
            name: null,
            us: null,
          },
        },
  };
}

function serializeNavbarIssue(issue: {
  id: bigint;
  number: string;
  legacyNumber: string | null;
  title: string | null;
  format: string | null;
  variant: string | null;
  collected: boolean | null;
  series: {
    title: string | null;
    volume: bigint;
    publisher: {
      name: string;
      original: boolean;
    } | null;
  } | null;
  covers: Array<{ url: string | null }>;
}): Issue {
  return {
    id: String(issue.id),
    number: issue.number,
    legacy_number: issue.legacyNumber || null,
    title: issue.title || null,
    format: issue.format || null,
    variant: issue.variant || null,
    collected: issue.collected ?? null,
    cover: issue.covers[0]
      ? {
          url: issue.covers[0].url || null,
        }
      : null,
    series: issue.series
      ? {
          title: issue.series.title || null,
          volume: Number(issue.series.volume),
          publisher: issue.series.publisher
            ? {
                name: issue.series.publisher.name,
                us: issue.series.publisher.original,
              }
            : {
                name: null,
                us: null,
              },
        }
      : {
          title: null,
          volume: null,
          publisher: {
            name: null,
            us: null,
          },
        },
  };
}

function sortLastEditedRows<
  T extends {
    id: bigint;
    fkSeries: bigint | null;
    number: string;
    title: string | null;
    format: string | null;
    variant: string | null;
    releaseDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    series: { title: string | null; volume: bigint; publisher: { name: string } | null } | null;
  }
>(
  rows: T[],
  field: string,
  direction: SortDirection
) {
  const factor = direction === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    const compareValue = (() => {
      switch (field) {
        case "createdat":
          return (left.createdAt.getTime() - right.createdAt.getTime()) * factor;
        case "releasedate":
          return ((left.releaseDate?.getTime() ?? 0) - (right.releaseDate?.getTime() ?? 0)) * factor;
        case "number":
          return compareIssueNumber(left.number, right.number) * factor;
        case "format":
          return naturalCompare(normalizeText(left.format), normalizeText(right.format)) * factor;
        case "variant":
          return naturalCompare(normalizeText(left.variant), normalizeText(right.variant)) * factor;
        case "title":
          return naturalCompare(normalizeText(left.title), normalizeText(right.title)) * factor;
        case "id":
          return (Number(left.id) - Number(right.id)) * factor;
        default:
          return (left.updatedAt.getTime() - right.updatedAt.getTime()) * factor;
      }
    })();

    if (compareValue !== 0) return compareValue;

    if (field === "publisher") {
      const publisherCompare =
        naturalCompare(
          normalizeText(left.series?.publisher?.name),
          normalizeText(right.series?.publisher?.name)
        ) * factor;
      if (publisherCompare !== 0) return publisherCompare;
    }

    if (field === "series" || field === "publisher") {
      const seriesCompare =
        naturalCompare(normalizeText(left.series?.title), normalizeText(right.series?.title)) * factor;
      if (seriesCompare !== 0) return seriesCompare;
      const volumeCompare = (Number(left.series?.volume ?? 0) - Number(right.series?.volume ?? 0)) * factor;
      if (volumeCompare !== 0) return volumeCompare;
    }

    return (Number(left.id) - Number(right.id)) * factor;
  });
}

export class IssueService {
  constructor(private requestId?: string) {
    void this.requestId;
  }

  async findIssues(
    pattern: string | undefined,
    series: SeriesInput,
    first: number | undefined,
    after: string | undefined,
    loggedIn: boolean,
    filter: Filter | undefined
  ) {
    void after;
    void loggedIn;

    const normalizedPattern = normalizeText(pattern);
    const take = Number.isFinite(first) && first && first > 0 ? Math.floor(first) : undefined;
    const filteredIssueIds = filter ? await new FilterService().getFilteredIssueIds(filter, loggedIn) : null;
    const rows = await prisma.issue.findMany({
      where: {
        ...(filteredIssueIds
          ? {
              id: {
                in: filteredIssueIds.map((id) => BigInt(id)),
              },
            }
          : {}),
        series: {
          title: normalizeText(series.title),
          volume: BigInt(Number(series.volume ?? 0)),
          publisher: {
            name: normalizeText(series.publisher?.name),
            ...(typeof series.publisher?.us === "boolean" ? { original: series.publisher.us } : {}),
          },
        },
        ...(normalizedPattern
          ? {
              OR: [
                { number: { startsWith: normalizedPattern, mode: "insensitive" } },
                { title: { contains: normalizedPattern, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        series: {
          include: {
            publisher: true,
          },
        },
        covers: {
          orderBy: [{ number: "asc" }, { id: "asc" }],
          take: 1,
        },
      },
      ...(take ? { take: take * 5 } : {}),
    });

    const sortedRows = [...rows].sort((left, right) => {
      const numberSort = compareIssueNumber(left.number, right.number);
      if (numberSort !== 0) return numberSort;
      return compareIssueVariants(left, right);
    });

    const grouped = new Map<string, typeof sortedRows>();
    for (const issue of sortedRows) {
      const key = `${issue.fkSeries}::${issue.number}`;
      const current = grouped.get(key) || [];
      current.push(issue);
      grouped.set(key, current);
    }

    const nodes = Array.from(grouped.values()).map((group) => {
      const primary = pickPreferredIssueVariant(group);
      const serialized = serializeNavbarIssue(primary);
      serialized.variant = "";
      serialized.variants = group
        .slice()
        .sort(compareIssueVariants)
        .map((variant) => ({
          id: String(variant.id),
          collected: variant.collected ?? null,
          format: toOptionalText(variant.format),
          variant: toOptionalText(variant.variant),
        })) as any;
      return serialized;
    });

    return buildConnectionFromNodes(nodes);
  }

  async getLastEdited(
    filter: Filter | undefined,
    first: number | undefined,
    after: string | undefined,
    order: string | undefined,
    direction: string | undefined,
    loggedIn: boolean
  ) {
    void after;
    void loggedIn;

    const limit = Number.isFinite(first) && first && first > 0 ? Math.floor(first) : 25;
    const filteredIssueIds = filter ? await new FilterService().getFilteredIssueIds(filter, loggedIn) : null;
    const rows = await prisma.issue.findMany({
      where: {
        fkSeries: {
          not: null,
        },
        ...(filteredIssueIds
          ? {
              id: {
                in: filteredIssueIds.map((id) => BigInt(id)),
              },
            }
          : {}),
      },
      include: {
        series: {
          include: {
            publisher: true,
          },
        },
        stories: {
          include: {
            parent: {
              select: {
                id: true,
                collectedMultipleTimes: true,
                children: {
                  select: {
                    id: true,
                  },
                },
              },
            },
            children: {
              select: {
                id: true,
                issue: {
                  select: {
                    collected: true,
                  },
                },
              },
            },
            reprint: {
              select: {
                id: true,
              },
            },
            reprintedBy: {
              select: {
                id: true,
              },
            },
          },
        },
        covers: {
          orderBy: [{ number: "asc" }, { id: "asc" }],
          take: 1,
        },
      },
      take: Math.min((limit + 1) * 5, 250),
    });

    const sortedRows = sortLastEditedRows(
      rows,
      normalizeSortField(order),
      normalizeSortDirection(direction)
    );

    const grouped = new Map<string, typeof sortedRows>();
    for (const issue of sortedRows) {
      const key = `${issue.fkSeries}::${issue.number}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(issue);
    }

    const deduped = Array.from(grouped.values()).map((group) => pickPreferredIssueVariant(group));
    const pageRows = deduped.slice(0, limit + 1);
    const hasNextPage = pageRows.length > limit;
    const nodes = pageRows.slice(0, limit).map((row) => serializePreviewIssue(row));
    const connection = buildConnectionFromNodes(nodes);
    connection.pageInfo.hasNextPage = hasNextPage;
    return connection;
  }

  async deleteIssue(item: IssueInput) {
    return deleteIssueByLookup({
      number: item.number ?? undefined,
      format: item.format ?? undefined,
      variant: item.variant ?? undefined,
      series: item.series
        ? {
            title: item.series.title ?? undefined,
            volume: item.series.volume ?? undefined,
            publisher: item.series.publisher
              ? {
                  name: item.series.publisher.name ?? undefined,
                  us: item.series.publisher.us ?? undefined,
                }
              : undefined,
          }
        : undefined,
    });
  }

  async createIssue(item: IssueInput) {
    void item;
    throw new Error("IssueService.createIssue is not wired yet");
  }

  async editIssue(oldItem: IssueInput, item: IssueInput) {
    void oldItem;
    void item;
    throw new Error("IssueService.editIssue is not wired yet");
  }

  async getIssuesByIds(ids: readonly number[]) {
    if (ids.length === 0) return [];

    const rows = await prisma.issue.findMany({
      where: {
        id: {
          in: ids.map((id) => BigInt(id)),
        },
      },
      include: {
        series: {
          include: {
            publisher: true,
          },
        },
        covers: {
          orderBy: [{ number: "asc" }, { id: "asc" }],
          take: 1,
        },
        stories: {
          include: {
            parent: {
              select: {
                id: true,
                collectedMultipleTimes: true,
                children: {
                  select: {
                    id: true,
                  },
                },
              },
            },
            children: {
              select: {
                id: true,
                issue: {
                  select: {
                    collected: true,
                  },
                },
              },
            },
            reprint: {
              select: {
                id: true,
              },
            },
            reprintedBy: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const byId = new Map(rows.map((row) => [Number(row.id), serializePreviewIssue(row)]));
    return ids.map((id) => byId.get(id) ?? null);
  }
}
