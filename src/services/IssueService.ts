import { Prisma } from "@prisma/client";
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

type IssueSelectionInput = {
  us: boolean;
  publisher: string;
  series: string;
  volume: number;
  number: string;
  format?: string | null;
  variant?: string | null;
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

  async listChangeRequests(options?: { order?: string; direction?: string }) {
    const direction = String(options?.direction || "asc").toLowerCase() === "desc" ? "desc" : "asc";
    const rows = await prisma.changeRequest.findMany({
      orderBy:
        String(options?.order || "createdAt") === "createdAt"
          ? [{ createdAt: direction }, { id: direction }]
          : [{ createdAt: direction }, { id: direction }],
    });

    if (rows.length === 0) return [];

    const loadedIssuesByChangeRequestId = new Map<number, Record<string, unknown> | null>();
    await Promise.all(
      rows.map(async (entry) => {
        const loadedIssue = await this.loadIssueForChangeRequest(entry.fkIssue);
        loadedIssuesByChangeRequestId.set(entry.id, loadedIssue);
      })
    );

    return rows.map((entry) => {
      const loadedIssue = loadedIssuesByChangeRequestId.get(entry.id) || null;
      return {
        id: String(entry.id),
        issueId: String(entry.fkIssue),
        createdAt: entry.createdAt.toISOString(),
        type: entry.type,
        changeRequest: normalizeChangeRequestPayload(entry.changeRequest, loadedIssue),
      };
    });
  }

  async countChangeRequests() {
    return prisma.changeRequest.count();
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

  async getIssueDetails(selection: IssueSelectionInput) {
    const current = await prisma.issue.findFirst({
      where: {
        number: selection.number,
        format: normalizeIssueOptionalString(selection.format) ?? undefined,
        variant: normalizeIssueOptionalString(selection.variant) ?? undefined,
        series: {
          title: selection.series,
          volume: BigInt(selection.volume),
          publisher: {
            name: selection.publisher,
            original: selection.us,
          },
        },
      },
      include: createIssueDetailsInclude(),
      orderBy: [{ id: "asc" }],
    });

    const fallback =
      current ||
      (await prisma.issue.findFirst({
        where: {
          number: selection.number,
          series: {
            title: selection.series,
            volume: BigInt(selection.volume),
            publisher: {
              name: selection.publisher,
              original: selection.us,
            },
          },
        },
        include: createIssueDetailsInclude(),
        orderBy: [{ format: "asc" }, { variant: "asc" }, { id: "asc" }],
      }));

    if (!fallback) return null;

    const variants = await prisma.issue.findMany({
      where: {
        number: fallback.number,
        fkSeries: fallback.fkSeries ?? undefined,
      },
      include: {
        covers: {
          orderBy: [{ number: "asc" }, { id: "asc" }],
          take: 1,
          include: {
            individuals: {
              include: {
                individual: true,
              },
            },
          },
        },
      },
      orderBy: [{ format: "asc" }, { variant: "asc" }, { id: "asc" }],
    });

    return toIssueDetailsShape(fallback, variants);
  }

  private async loadIssueForChangeRequest(issueId: number): Promise<Record<string, unknown> | null> {
    const row = await prisma.issue.findFirst({
      where: {
        id: BigInt(issueId),
      },
      include: {
        series: {
          include: {
            publisher: true,
          },
        },
        stories: {
          orderBy: [{ number: "asc" }, { id: "asc" }],
          include: {
            individuals: {
              include: {
                individual: true,
              },
            },
            appearances: {
              include: {
                appearance: true,
              },
            },
            parent: {
              include: {
                issue: {
                  include: {
                    series: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!row) return null;

    return {
      id: Number(row.id),
      title: normalizeRecordString(row.title),
      number: normalizeRecordString(row.number),
      format: normalizeRecordString(row.format),
      variant: normalizeRecordString(row.variant),
      releasedate: normalizeIssueReleaseDate(row.releaseDate),
      pages: Number(row.pages || 0),
      price: Number(row.price || 0),
      currency: normalizeRecordString(row.currency),
      isbn: normalizeRecordString(row.isbn),
      limitation: normalizeRecordString(row.limitation),
      comicguideid: Number(row.comicGuideId || 0),
      addinfo: normalizeRecordString(row.addInfo),
      series: {
        title: normalizeRecordString(row.series?.title),
        volume: Number(row.series?.volume || 0),
        startyear: Number(row.series?.startYear || 0),
        publisher: {
          name: normalizeRecordString(row.series?.publisher?.name),
          us: Boolean(row.series?.publisher?.original),
        },
      },
      stories: row.stories.map((story) => {
        const parent = story.parent;
        const parentIssue = parent?.issue;
        const parentSeries = parentIssue?.series;
        const mapped: Record<string, unknown> = {
          title: normalizeRecordString(story.title),
          addinfo: normalizeRecordString(story.addInfo),
          part: normalizeRecordString(story.part),
          number: Number(story.number || 0),
          exclusive: !parent,
          individuals: story.individuals.map((entry) => ({
            name: normalizeRecordString(entry.individual?.name),
            type: normalizeRecordString(entry.type) ? [normalizeRecordString(entry.type)] : [],
          })),
          appearances: story.appearances.map((entry) => ({
            name: normalizeRecordString(entry.appearance?.name),
            type: normalizeRecordString(entry.appearance?.type),
            role: normalizeRecordString(entry.role),
          })),
        };

        if (parent) {
          mapped.parent = {
            title: normalizeRecordString(parent.title),
            number: Number(parent.number || 0),
            issue: parentIssue
              ? {
                  number: normalizeRecordString(parentIssue.number),
                  series: parentSeries
                    ? {
                        title: normalizeRecordString(parentSeries.title),
                        volume: Number(parentSeries.volume || 0),
                      }
                    : undefined,
                }
              : undefined,
          };
        }

        return mapped;
      }),
    };
  }
}

const issueDetailsStoryInclude = Prisma.validator<Prisma.StoryInclude>()({
  issue: {
    include: {
      series: {
        include: {
          publisher: true,
        },
      },
    },
  },
  parent: {
    include: {
      issue: {
        include: {
          series: {
            include: {
              publisher: true,
            },
          },
        },
      },
      children: {
        orderBy: [{ number: "asc" }, { id: "asc" }],
        include: {
          issue: {
            include: {
              series: {
                include: {
                  publisher: true,
                },
              },
            },
          },
          parent: {
            include: {
              issue: {
                include: {
                  series: {
                    include: {
                      publisher: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      reprint: {
        include: {
          issue: {
            include: {
              series: {
                include: {
                  publisher: true,
                },
              },
            },
          },
        },
      },
      reprintedBy: {
        include: {
          issue: {
            include: {
              series: {
                include: {
                  publisher: true,
                },
              },
            },
          },
          parent: {
            include: {
              issue: {
                include: {
                  series: {
                    include: {
                      publisher: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      individuals: {
        include: {
          individual: true,
        },
      },
      appearances: {
        include: {
          appearance: true,
        },
      },
    },
  },
  reprint: {
    include: {
      issue: {
        include: {
          series: {
            include: {
              publisher: true,
            },
          },
        },
      },
    },
  },
  reprintedBy: {
    include: {
      issue: {
        include: {
          series: {
            include: {
              publisher: true,
            },
          },
        },
      },
      parent: {
        include: {
          issue: {
            include: {
              series: {
                include: {
                  publisher: true,
                },
              },
            },
          },
        },
      },
    },
  },
  children: {
    orderBy: [{ number: "asc" }, { id: "asc" }],
    include: {
      issue: {
        include: {
          series: {
            include: {
              publisher: true,
            },
          },
        },
      },
      parent: {
        include: {
          issue: {
            include: {
              series: {
                include: {
                  publisher: true,
                },
              },
            },
          },
        },
      },
    },
  },
  individuals: {
    include: {
      individual: true,
    },
  },
  appearances: {
    include: {
      appearance: true,
    },
  },
});

function createIssueDetailsInclude() {
  return Prisma.validator<Prisma.IssueInclude>()({
    series: {
      include: {
        publisher: true,
      },
    },
    stories: {
      orderBy: [{ number: "asc" }, { id: "asc" }],
      include: issueDetailsStoryInclude,
    },
    arcs: {
      include: {
        arc: true,
      },
    },
    individuals: {
      include: {
        individual: true,
      },
    },
    covers: {
      orderBy: [{ number: "asc" }, { id: "asc" }],
      include: {
        individuals: {
          include: {
            individual: true,
          },
        },
      },
    },
  });
}

function toIssueDetailsShape(issue: any, variants: any[]) {
  const mappedVariants = variants.map((variant) => ({
    id: serializeIssueId(variant.id),
    title: variant.title || null,
    number: variant.number,
    legacy_number: variant.legacyNumber || null,
    format: variant.format || null,
    variant: variant.variant || null,
    releasedate: serializeIssueDate(variant.releaseDate),
    verified: variant.verified,
    collected: variant.collected ?? null,
    comicguideid: serializeNullableIssueId(variant.comicGuideId),
    cover: variant.covers[0] ? toIssueCoverShape(variant.covers[0]) : null,
  }));

  return {
    id: serializeIssueId(issue.id),
    title: issue.title || null,
    number: issue.number,
    legacy_number: issue.legacyNumber || null,
    format: issue.format || null,
    variant: issue.variant || null,
    releasedate: serializeIssueDate(issue.releaseDate),
    pages: serializeNullableIssueNumber(issue.pages),
    price: issue.price ?? null,
    currency: issue.currency || null,
    isbn: issue.isbn || null,
    limitation: issue.limitation === null || issue.limitation === undefined ? null : String(issue.limitation),
    addinfo: issue.addInfo || null,
    verified: issue.verified,
    collected: issue.collected ?? null,
    comicguideid: serializeNullableIssueId(issue.comicGuideId),
    createdat: serializeIssueDate(issue.createdAt),
    updatedat: serializeIssueDate(issue.updatedAt),
    series: toIssueSeriesShape(issue.series),
    stories: issue.stories.map((story: any) => toIssueStoryShape(story, true)),
    cover: issue.covers[0] ? toIssueCoverShape(issue.covers[0]) : null,
    individuals: issue.individuals.map(toIssueIndividualEntryShape),
    arcs: issue.arcs.map((entry: any) => ({
      id: serializeIssueId(entry.arc.id),
      title: entry.arc.title || null,
      type: entry.arc.type || null,
    })),
    variants: mappedVariants,
    storyOwner: null,
    inheritsStories: false,
    tags: [],
  };
}

function toIssueSeriesShape(series: any) {
  if (!series) return null;

  return {
    id: serializeIssueId(series.id),
    title: series.title || null,
    startyear: serializeNullableIssueNumber(series.startYear),
    endyear: serializeNullableIssueNumber(series.endYear),
    volume: serializeNullableIssueNumber(series.volume),
    genre: null,
    addinfo: series.addInfo || null,
    publisher: series.publisher
      ? {
          id: serializeIssueId(series.publisher.id),
          name: series.publisher.name || null,
          us: series.publisher.original,
          addinfo: series.publisher.addInfo || null,
          startyear: serializeNullableIssueNumber(series.publisher.startYear),
          endyear: serializeNullableIssueNumber(series.publisher.endYear),
        }
      : null,
  };
}

function toIssueReferenceShape(issue: any) {
  if (!issue) return null;

  return {
    id: serializeIssueId(issue.id),
    title: issue.title || null,
    number: issue.number,
    legacy_number: issue.legacyNumber || null,
    format: issue.format || null,
    variant: issue.variant || null,
    releasedate: serializeIssueDate(issue.releaseDate),
    collected: issue.collected ?? null,
    series: toIssueSeriesShape(issue.series),
  };
}

function toIssueCoverShape(cover: any) {
  return {
    id: serializeIssueId(cover.id),
    url: cover.url || null,
    number: serializeNullableIssueNumber(cover.number),
    addinfo: cover.addInfo || null,
    individuals: Array.isArray(cover.individuals)
      ? cover.individuals.map((entry: any) => ({
          id: serializeIssueId(entry.individual.id),
          name: entry.individual.name || null,
          type: entry.type || "",
        }))
      : [],
  };
}

function toIssueIndividualEntryShape(entry: any) {
  return {
    id: serializeIssueId(entry.individual.id),
    name: entry.individual.name || null,
    type: entry.type || "",
  };
}

function toIssueStoryShape(story: any, includeParent: boolean) {
  return {
    id: serializeIssueId(story.id),
    number: serializeNullableIssueNumber(story.number),
    title: story.title || null,
    addinfo: story.addInfo || null,
    part: story.part || null,
    exclusive: false,
    onlyapp: story.onlyApp,
    firstapp: story.firstApp,
    onlytb: story.onlyTb,
    otheronlytb: story.otherOnlyTb,
    onlyoneprint: story.onlyOnePrint,
    collected: story.collected,
    collectedmultipletimes: story.collectedMultipleTimes,
    issue: toIssueReferenceShape(story.issue),
    parent: includeParent ? toIssueParentStoryShape(story.parent) : null,
    reprintOf: story.reprint ? toIssueStoryReferenceShape(story.reprint) : null,
    reprints: Array.isArray(story.reprintedBy) ? story.reprintedBy.map(toIssueStoryReferenceShape) : [],
    children: Array.isArray(story.children) ? story.children.map(toIssueStoryReferenceShape) : [],
    individuals: Array.isArray(story.individuals)
      ? story.individuals.map((entry: any) => ({
          id: serializeIssueId(entry.individual.id),
          name: entry.individual.name || null,
          type: entry.type || "",
        }))
      : [],
    appearances: Array.isArray(story.appearances)
      ? story.appearances.map((entry: any) => ({
          id: serializeIssueId(entry.appearance.id),
          name: entry.appearance.name || null,
          type: entry.appearance.type || "",
          role: entry.role || "",
        }))
      : [],
  };
}

function toIssueParentStoryShape(story: any) {
  if (!story) return null;

  return {
    id: serializeIssueId(story.id),
    number: serializeNullableIssueNumber(story.number),
    title: story.title || null,
    addinfo: story.addInfo || null,
    part: story.part || null,
    collectedmultipletimes: story.collectedMultipleTimes,
    issue: toIssueReferenceShape(story.issue),
    reprintOf: story.reprint ? toIssueStoryReferenceShape(story.reprint) : null,
    reprints: Array.isArray(story.reprintedBy) ? story.reprintedBy.map(toIssueStoryReferenceShape) : [],
    children: Array.isArray(story.children) ? story.children.map(toIssueStoryReferenceShape) : [],
    individuals: Array.isArray(story.individuals)
      ? story.individuals.map((entry: any) => ({
          id: serializeIssueId(entry.individual.id),
          name: entry.individual.name || null,
          type: entry.type || "",
        }))
      : [],
    appearances: Array.isArray(story.appearances)
      ? story.appearances.map((entry: any) => ({
          id: serializeIssueId(entry.appearance.id),
          name: entry.appearance.name || null,
          type: entry.appearance.type || "",
          role: entry.role || "",
        }))
      : [],
  };
}

function toIssueStoryReferenceShape(story: any) {
  return {
    id: serializeIssueId(story.id),
    number: serializeNullableIssueNumber(story.number),
    title: story.title || null,
    addinfo: story.addInfo || null,
    part: story.part || null,
    issue: toIssueReferenceShape(story.issue),
    parent: story.parent
      ? {
          issue: toIssueReferenceShape(story.parent.issue),
          number: serializeNullableIssueNumber(story.parent.number),
        }
      : null,
  };
}

function normalizeIssueOptionalString(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized === "" ? null : normalized;
}

function serializeIssueDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function serializeIssueId(value: bigint | number | string) {
  return String(value);
}

function serializeNullableIssueId(value: bigint | number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function serializeNullableIssueNumber(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function normalizeRecordString(value: unknown) {
  return String(value || "").trim();
}

function normalizeIssueReleaseDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeForDiff(value: unknown): unknown {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForDiff(entry));
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) {
      normalized[key] = normalizeForDiff(input[key]);
    }
    return normalized;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function extractChangeRequestItem(value: unknown): Record<string, unknown> | null {
  const payload = asRecord(value);
  if (!payload) return null;

  const wrappedItem = asRecord(payload.item);
  if (wrappedItem) return wrappedItem;

  if (hasOwn(payload, "item")) return null;
  return payload;
}

function mergeRecords(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, patchValue] of Object.entries(patch)) {
    const baseValue = merged[key];

    if (Array.isArray(patchValue)) {
      merged[key] = patchValue;
      continue;
    }

    if (isPlainObject(baseValue) && isPlainObject(patchValue)) {
      merged[key] = mergeRecords(baseValue, patchValue);
      continue;
    }

    merged[key] = patchValue;
  }

  return merged;
}

function resolveChangeRequestItem(
  value: unknown,
  issue: Record<string, unknown> | null
): Record<string, unknown> | null {
  const changeItem = extractChangeRequestItem(value);
  if (!changeItem && !issue) return null;
  if (!changeItem) return issue ? (normalizeForDiff(issue) as Record<string, unknown>) : null;
  if (!issue) return normalizeForDiff(changeItem) as Record<string, unknown>;

  return normalizeForDiff(mergeRecords(issue, changeItem)) as Record<string, unknown>;
}

function normalizeChangeRequestPayload(
  value: unknown,
  issue: Record<string, unknown> | null
): Record<string, unknown> {
  const payload = asRecord(value) || {};
  const normalizedItem = resolveChangeRequestItem(payload, issue) || {};

  const nextPayload: Record<string, unknown> = {
    ...payload,
    item: normalizedItem,
  };

  if (issue) nextPayload.issue = issue;
  return nextPayload;
}
