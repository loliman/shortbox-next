import { prisma } from "../prisma/client";
import { serializePreviewIssue } from "./issue-read-shared";

export async function readSeriesDetailsQuery(input: {
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
