import type { Connection, Edge, Filter } from "../types/query-data";
import type { Issue, Publisher, Series } from "../types/domain";
import { prisma } from "../lib/prisma/client";
import { FilterService } from "./FilterService";
import {
  createSeries as createSeriesWrite,
  deleteSeriesByLookup,
  editSeries as editSeriesWrite,
} from "../lib/server/series-write";

type PublisherInput = {
  id?: string | number | null;
  name?: string | null;
  us?: boolean | null;
};

type SeriesInput = {
  id?: string | number | null;
  title?: string | null;
  startyear?: number | null;
  endyear?: number | null;
  volume?: number | null;
  genre?: string | null;
  addinfo?: string | null;
  publisher?: PublisherInput | null;
};

const LEADING_ARTICLE_REGEX = /^(der|die|das|the)\s+/i;
const SPECIAL_SORT_CHARACTERS_REGEX = /[^\p{L}\p{N}\s]/gu;

const normalizeGermanSortLetters = (value: string): string =>
  value
    .replace(/ä/gi, "a")
    .replace(/ö/gi, "o")
    .replace(/ü/gi, "u")
    .replace(/ß/g, "ss")
    .replace(/ẞ/g, "ss");

const normalizeSeriesTitleForSort = (value: string | null | undefined): string =>
  normalizeGermanSortLetters(
    String(value || "")
      .trim()
      .replace(LEADING_ARTICLE_REGEX, "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(SPECIAL_SORT_CHARACTERS_REGEX, " ")
      .replace(/\s+/g, " ")
  )
    .trim()
    .toLocaleLowerCase("de-DE");

const normalizeSeriesTitleForTieBreak = (value: string | null | undefined): string =>
  normalizeSeriesTitleForSort(value);

const compareSeriesTitles = (
  left: { title?: string | null; volume?: number | null; id?: number | null },
  right: { title?: string | null; volume?: number | null; id?: number | null }
): number =>
  normalizeSeriesTitleForSort(left.title).localeCompare(
    normalizeSeriesTitleForSort(right.title),
    "de-DE",
    {
      sensitivity: "base",
    }
  ) ||
  normalizeSeriesTitleForTieBreak(left.title).localeCompare(
    normalizeSeriesTitleForTieBreak(right.title),
    "de-DE",
    {
      sensitivity: "base",
    }
  ) ||
  Number(left.volume || 0) - Number(right.volume || 0) ||
  Number(left.id || 0) - Number(right.id || 0);

const compareSerializedSeries = (left: Series, right: Series): number =>
  compareSeriesTitles(
    {
      title: left.title,
      volume: left.volume,
      id:
        typeof left.id === "number"
          ? left.id
          : left.id === null || left.id === undefined
            ? null
            : Number(left.id),
    },
    {
      title: right.title,
      volume: right.volume,
      id:
        typeof right.id === "number"
          ? right.id
          : right.id === null || right.id === undefined
            ? null
            : Number(right.id),
    }
  );

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

function serializePublisher(row: {
  id: bigint;
  name: string;
  original: boolean;
} | null): Publisher | undefined {
  if (!row) return undefined;
  return {
    id: String(row.id),
    name: row.name,
    us: row.original,
  };
}

function serializeSeries(row: {
  id: bigint;
  title: string | null;
  volume: bigint;
  startYear: bigint;
  endYear: bigint | null;
  addInfo: string;
  publisher: {
    id: bigint;
    name: string;
    original: boolean;
  } | null;
}): Series {
  return {
    id: String(row.id),
    title: row.title || "",
    volume: Number(row.volume),
    startyear: Number(row.startYear),
    endyear: row.endYear === null ? null : Number(row.endYear),
    genre: "",
    addinfo: row.addInfo,
    publisher: serializePublisher(row.publisher) || { name: "", us: false },
  };
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

export class SeriesService {
  constructor(private requestId?: string) {
    void this.requestId;
  }

  async findSeries(
    pattern: string | undefined,
    publisher: PublisherInput,
    first: number | undefined,
    after: string | undefined,
    loggedIn: boolean,
    filter: Filter | undefined
  ) {
    void after;
    void loggedIn;

    const publisherName = typeof publisher?.name === "string" ? publisher.name.trim() : "";
    const shouldFilterPublisherName = publisherName !== "" && publisherName !== "*";
    const shouldFilterPublisherUs = typeof publisher?.us === "boolean";
    const normalizedPattern = String(pattern || "").trim();
    const take = Number.isFinite(first) && first && first > 0 ? Math.floor(first) : undefined;
    const filteredIssueIds = filter ? await new FilterService(this.requestId).getFilteredIssueIds(filter, loggedIn) : null;

    const rows = await prisma.series.findMany({
      where: {
        ...(filteredIssueIds
          ? {
              issues: {
                some: {
                  id: {
                    in: filteredIssueIds.map((id) => BigInt(id)),
                  },
                },
              },
            }
          : {}),
        ...(shouldFilterPublisherName || shouldFilterPublisherUs
          ? {
              publisher: {
                ...(shouldFilterPublisherName ? { name: publisherName } : {}),
                ...(shouldFilterPublisherUs ? { original: Boolean(publisher.us) } : {}),
              },
            }
          : {}),
        ...(normalizedPattern
          ? {
              title: {
                contains: normalizedPattern,
                mode: "insensitive",
              },
            }
          : {}),
      },
      include: {
        publisher: true,
      },
      ...(take ? { take } : {}),
    });

    const nodes = rows
      .map((row) => serializeSeries(row))
      .sort(compareSerializedSeries);

    return buildConnectionFromNodes(nodes);
  }

  async deleteSeries(item: SeriesInput) {
    return deleteSeriesByLookup({
      title: item.title ?? undefined,
      startyear: item.startyear ?? undefined,
      endyear: item.endyear ?? undefined,
      volume: item.volume ?? undefined,
      genre: item.genre ?? undefined,
      addinfo: item.addinfo ?? undefined,
      publisher: item.publisher
        ? {
            name: item.publisher.name ?? undefined,
            us: item.publisher.us ?? undefined,
          }
        : undefined,
    });
  }

  async createSeries(item: SeriesInput) {
    return createSeriesWrite({
      title: item.title ?? undefined,
      startyear: item.startyear ?? undefined,
      endyear: item.endyear ?? undefined,
      volume: item.volume ?? undefined,
      genre: item.genre ?? undefined,
      addinfo: item.addinfo ?? undefined,
      publisher: item.publisher
        ? {
            name: item.publisher.name ?? undefined,
            us: item.publisher.us ?? undefined,
          }
        : undefined,
    });
  }

  async editSeries(oldItem: SeriesInput, item: SeriesInput) {
    return editSeriesWrite(
      {
        title: oldItem.title ?? undefined,
        startyear: oldItem.startyear ?? undefined,
        endyear: oldItem.endyear ?? undefined,
        volume: oldItem.volume ?? undefined,
        genre: oldItem.genre ?? undefined,
        addinfo: oldItem.addinfo ?? undefined,
        publisher: oldItem.publisher
          ? {
              name: oldItem.publisher.name ?? undefined,
              us: oldItem.publisher.us ?? undefined,
            }
          : undefined,
      },
      {
        title: item.title ?? undefined,
        startyear: item.startyear ?? undefined,
        endyear: item.endyear ?? undefined,
        volume: item.volume ?? undefined,
        genre: item.genre ?? undefined,
        addinfo: item.addinfo ?? undefined,
        publisher: item.publisher
          ? {
              name: item.publisher.name ?? undefined,
              us: item.publisher.us ?? undefined,
            }
          : undefined,
      }
    );
  }

  async getSeriesByIds(ids: readonly number[]) {
    if (ids.length === 0) return [];

    const rows = await prisma.series.findMany({
      where: {
        id: {
          in: ids.map((id) => BigInt(id)),
        },
      },
      include: {
        publisher: true,
      },
    });

    const byId = new Map(rows.map((row) => [Number(row.id), serializeSeries(row)]));
    return ids.map((id) => byId.get(id) ?? null);
  }

  async getSeriesDetails(input: {
    us: boolean;
    publisher: string;
    series: string;
    volume: number;
  }) {
    const series = await prisma.series.findFirst({
      where: {
        title: input.series,
        volume: BigInt(input.volume),
        publisher: {
          name: input.publisher,
          original: input.us,
        },
      },
      include: {
        publisher: true,
      },
    });

    if (!series) return null;

    const [issueCount, recentIssues] = await Promise.all([
      prisma.issue.count({
        where: {
          fkSeries: series.id,
        },
      }),
      prisma.issue.findMany({
        where: {
          fkSeries: series.id,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 50,
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
      }),
    ]);

    return {
      details: {
        id: String(series.id),
        title: series.title || null,
        startyear: Number(series.startYear),
        endyear: series.endYear === null ? null : Number(series.endYear),
        volume: Number(series.volume),
        genre: series.genre || null,
        addinfo: series.addInfo || null,
        issueCount,
        active: series.endYear === null || Number(series.endYear) === 0,
        lastEdited: [],
        publisher: series.publisher
          ? {
              id: String(series.publisher.id),
              name: series.publisher.name,
              us: series.publisher.original,
            }
          : null,
      },
      issues: recentIssues.map((issue) => serializePreviewIssue(issue)),
    };
  }
}
