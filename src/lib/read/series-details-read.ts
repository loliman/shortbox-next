import "server-only";

import { prisma } from "../prisma/client";
import { serializePreviewIssue } from "./issue-read-shared";
import { matchesSeriesSelectionBySlug, type SeriesSelectionInput } from "./series-selection";

export async function readSeriesDetailsQuery(input: SeriesSelectionInput) {
  const normalizedStartYear =
    Number.isFinite(Number(input.startyear)) && Number(input.startyear) > 0
      ? BigInt(Number(input.startyear))
      : undefined;
  const series = await prisma.series.findFirst({
    where: {
      title: input.series,
      volume: BigInt(input.volume),
      ...(normalizedStartYear ? { startYear: normalizedStartYear } : {}),
      publisher: {
        name: input.publisher,
        original: input.us,
      },
    },
    include: {
      publisher: true,
    },
    orderBy: [{ id: "asc" }],
  });

  const slugCandidates = series
    ? []
    : await prisma.series.findMany({
        where: {
          volume: BigInt(input.volume),
          ...(normalizedStartYear ? { startYear: normalizedStartYear } : {}),
          publisher: {
            original: input.us,
          },
        },
        include: {
          publisher: true,
        },
        orderBy: [{ id: "asc" }],
      });

  const resolvedSeries =
    series || slugCandidates.find((candidate) => matchesSeriesSelectionBySlug(candidate, input)) || null;

  if (!resolvedSeries) return null;

  const [issueCount, recentIssues] = await Promise.all([
    prisma.issue.count({
      where: {
        fkSeries: resolvedSeries.id,
      },
    }),
    prisma.issue.findMany({
      where: {
        fkSeries: resolvedSeries.id,
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
      id: String(resolvedSeries.id),
      title: resolvedSeries.title || null,
      startyear: Number(resolvedSeries.startYear),
      endyear: resolvedSeries.endYear === null ? null : Number(resolvedSeries.endYear),
      volume: Number(resolvedSeries.volume),
      genre: resolvedSeries.genre || null,
      addinfo: resolvedSeries.addInfo || null,
      issueCount,
      active: resolvedSeries.endYear === null || Number(resolvedSeries.endYear) === 0,
      lastEdited: [],
      publisher: resolvedSeries.publisher
        ? {
            id: String(resolvedSeries.publisher.id),
            name: resolvedSeries.publisher.name,
            us: resolvedSeries.publisher.original,
          }
        : null,
    },
    issues: recentIssues.map((issue) => serializePreviewIssue(issue)),
  };
}
