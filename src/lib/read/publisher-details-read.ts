import "server-only";

import { prisma } from "../prisma/client";
import { serializePreviewIssue } from "./issue-read-shared";
import { matchesPublisherSelectionBySlug } from "./publisher-selection";

export async function readPublisherDetailsQuery(input: { us: boolean; publisher: string }) {
  const publisher = await prisma.publisher.findFirst({
    where: {
      name: {
        equals: input.publisher,
        mode: "insensitive",
      },
      original: input.us,
    },
    include: {
      series: true,
    },
    orderBy: [{ id: "asc" }],
  });

  const slugCandidates = publisher
    ? []
    : await prisma.publisher.findMany({
        where: {
          original: input.us,
        },
        include: {
          series: true,
        },
        orderBy: [{ id: "asc" }],
      });

  const resolvedPublisher =
    publisher ||
    slugCandidates.find((candidate) =>
      matchesPublisherSelectionBySlug(candidate, {
        us: input.us,
        publisher: input.publisher,
      })
    ) ||
    null;

  if (!resolvedPublisher) return null;

  const [issueCount, recentIssues] = await Promise.all([
    prisma.issue.count({
      where: {
        series: {
          publisher: {
            id: resolvedPublisher.id,
          },
        },
      },
    }),
    prisma.issue.findMany({
      where: {
        series: {
          publisher: {
            id: resolvedPublisher.id,
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
      id: String(resolvedPublisher.id),
      name: resolvedPublisher.name,
      us: resolvedPublisher.original,
      addinfo: resolvedPublisher.addInfo || null,
      startyear: Number(resolvedPublisher.startYear),
      endyear: resolvedPublisher.endYear === null ? null : Number(resolvedPublisher.endYear),
      active: resolvedPublisher.endYear === null || Number(resolvedPublisher.endYear) === 0,
      seriesCount: resolvedPublisher.series.length,
      issueCount,
      lastEdited: [],
    },
    issues: recentIssues.map((issue) => serializePreviewIssue(issue)),
  };
}
