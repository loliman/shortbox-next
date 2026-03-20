import type { Connection, Edge, Filter } from "../types/query-data";
import type { Issue, Publisher } from "../types/domain";
import { prisma } from "../lib/prisma/client";
import { FilterService } from "./FilterService";
import {
  createPublisher as createPublisherWrite,
  deletePublisherByLookup,
  editPublisher as editPublisherWrite,
} from "../lib/server/publishers-write";

type PublisherInput = {
  id?: string | number | null;
  name?: string | null;
  us?: boolean | null;
  addinfo?: string | null;
  startyear?: number | null;
  endyear?: number | null;
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

function normalizePattern(pattern?: string) {
  return String(pattern || "").trim();
}

function serializePublisher(row: {
  id: bigint;
  name: string;
  original: boolean;
  addInfo?: string | null;
  startYear?: bigint | null;
  endYear?: bigint | null;
}): Publisher {
  return {
    id: String(row.id),
    name: row.name,
    us: row.original,
    addinfo: row.addInfo ?? null,
    startyear: row.startYear === null || row.startYear === undefined ? null : Number(row.startYear),
    endyear: row.endYear === null || row.endYear === undefined ? null : Number(row.endYear),
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

export class PublisherService {
  constructor(private requestId?: string) {
    void this.requestId;
  }

  async findPublishers(
    pattern: string | undefined,
    us: boolean,
    first: number | undefined,
    after: string | undefined,
    loggedIn: boolean,
    filter: Filter | undefined
  ) {
    void after;
    void loggedIn;

    const normalizedPattern = normalizePattern(pattern);
    const take = Number.isFinite(first) && first && first > 0 ? Math.floor(first) : undefined;
    const filteredIssueIds = filter ? await new FilterService(this.requestId).getFilteredIssueIds(filter, loggedIn) : null;

    const rows = await prisma.publisher.findMany({
      where: {
        original: us,
        ...(filteredIssueIds
          ? {
              series: {
                some: {
                  issues: {
                    some: {
                      id: {
                        in: filteredIssueIds.map((id) => BigInt(id)),
                      },
                    },
                  },
                },
              },
            }
          : {}),
        ...(normalizedPattern
          ? {
              name: {
                contains: normalizedPattern,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      ...(take ? { take } : {}),
    });

    const nodes = rows.map((row) => serializePublisher(row));
    return buildConnectionFromNodes(nodes);
  }

  async deletePublisher(item: PublisherInput) {
    return deletePublisherByLookup({
      id: item.id ?? undefined,
      name: item.name ?? undefined,
      us: item.us ?? undefined,
      addinfo: item.addinfo ?? undefined,
      startyear: item.startyear ?? undefined,
      endyear: item.endyear ?? undefined,
    });
  }

  async createPublisher(item: PublisherInput) {
    return createPublisherWrite({
      id: item.id ?? undefined,
      name: item.name ?? undefined,
      us: Boolean(item.us),
      addinfo: item.addinfo ?? undefined,
      startyear: item.startyear ?? undefined,
      endyear: item.endyear ?? undefined,
    });
  }

  async editPublisher(oldItem: PublisherInput, item: PublisherInput) {
    return editPublisherWrite(
      {
        id: oldItem.id ?? undefined,
        name: oldItem.name ?? undefined,
        us: oldItem.us ?? undefined,
        addinfo: oldItem.addinfo ?? undefined,
        startyear: oldItem.startyear ?? undefined,
        endyear: oldItem.endyear ?? undefined,
      },
      {
        id: item.id ?? undefined,
        name: item.name ?? undefined,
        us: item.us ?? undefined,
        addinfo: item.addinfo ?? undefined,
        startyear: item.startyear ?? undefined,
        endyear: item.endyear ?? undefined,
      }
    );
  }

  async getPublishersByIds(ids: readonly number[]) {
    if (ids.length === 0) return [];

    const rows = await prisma.publisher.findMany({
      where: {
        id: {
          in: ids.map((id) => BigInt(id)),
        },
      },
    });

    const byId = new Map(rows.map((row) => [Number(row.id), serializePublisher(row)]));
    return ids.map((id) => byId.get(id) ?? null);
  }

  async getPublisherDetails(input: { us: boolean; publisher: string }) {
    const publisher = await prisma.publisher.findFirst({
      where: {
        name: input.publisher,
        original: input.us,
      },
      include: {
        series: true,
      },
    });

    if (!publisher) return null;

    const [issueCount, recentIssues] = await Promise.all([
      prisma.issue.count({
        where: {
          series: {
            publisher: {
              id: publisher.id,
            },
          },
        },
      }),
      prisma.issue.findMany({
        where: {
          series: {
            publisher: {
              id: publisher.id,
            },
          },
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
        id: String(publisher.id),
        name: publisher.name,
        us: publisher.original,
        addinfo: publisher.addInfo || null,
        startyear: Number(publisher.startYear),
        endyear: publisher.endYear === null ? null : Number(publisher.endYear),
        active: publisher.endYear === null || Number(publisher.endYear) === 0,
        seriesCount: publisher.series.length,
        issueCount,
        lastEdited: [],
      },
      issues: recentIssues.map((issue) => serializePreviewIssue(issue)),
    };
  }
}
