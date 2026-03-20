import { prisma } from "../prisma/client";

const DEFAULT_HOME_PAGE_SIZE = 50;

type HomeDataOptions = {
  us: boolean;
  offset?: number;
  limit?: number;
  order?: string | null;
  direction?: string | null;
};

export async function getHomePageData(options: HomeDataOptions) {
  const limit = normalizePositiveInt(options.limit, DEFAULT_HOME_PAGE_SIZE);
  const offset = normalizePositiveInt(options.offset, 0);

  try {
    const issues = await prisma.issue.findMany({
      where: {
        series: {
          publisher: {
            original: options.us,
          },
        },
      },
      orderBy: resolveIssueOrder(options.order, options.direction),
      skip: offset,
      take: limit + 1,
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
    });

    const hasMore = issues.length > limit;
    return {
      items: issues.slice(0, limit).map((issue) => ({
        id: serializeId(issue.id),
        comicguideid: serializeNullableId(issue.comicGuideId),
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
          reprintOf: story.reprint ? { id: serializeId(story.reprint.id) } : null,
          reprints: story.reprintedBy.map((reprint) => ({
            id: serializeId(reprint.id),
          })),
          parent: story.parent
            ? {
                children: story.parent.children.map((child) => ({
                  id: serializeId(child.id),
                })),
                collectedmultipletimes: story.parent.collectedMultipleTimes,
              }
            : null,
          children: story.children.map((child) => ({
            id: serializeId(child.id),
            issue: child.issue
              ? {
                  collected: child.issue.collected ?? null,
                }
              : null,
          })),
          collectedmultipletimes: story.collectedMultipleTimes,
        })),
        series: issue.series
          ? {
              title: issue.series.title || null,
              volume: serializeNullableNumber(issue.series.volume),
              startyear: serializeNullableNumber(issue.series.startYear),
              endyear: serializeNullableNumber(issue.series.endYear),
              publisher: issue.series.publisher
                ? {
                    name: issue.series.publisher.name || null,
                    us: issue.series.publisher.original,
                  }
                : null,
            }
          : null,
      })),
      hasMore,
    };
  } catch {
    return {
      items: [],
      hasMore: false,
    };
  }
}

function resolveIssueOrder(order?: string | null, direction?: string | null) {
  const orderKey = String(order || "updatedat").trim().toLowerCase();
  const sortDirection = String(direction || "desc").trim().toLowerCase() === "asc" ? "asc" : "desc";

  switch (orderKey) {
    case "releasedate":
      return [{ releaseDate: sortDirection }, { id: sortDirection }] as const;
    case "createdat":
      return [{ createdAt: sortDirection }, { id: sortDirection }] as const;
    case "number":
      return [{ number: sortDirection }, { id: sortDirection }] as const;
    default:
      return [{ updatedAt: sortDirection }, { id: sortDirection }] as const;
  }
}

function normalizePositiveInt(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value as number));
}

function serializeId(value: bigint | number | string) {
  return String(value);
}

function serializeNullableId(value: bigint | number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function serializeNullableNumber(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}
