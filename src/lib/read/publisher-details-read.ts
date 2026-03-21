import { prisma } from "../prisma/client";
import { serializePreviewIssue } from "./issue-read-shared";

export async function readPublisherDetailsQuery(input: { us: boolean; publisher: string }) {
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
