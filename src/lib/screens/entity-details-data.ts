import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";

export async function getPublisherScreenData(input: { us: boolean; publisher: string }) {
  try {
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

    const recentIssues = await prisma.issue.findMany({
      where: {
        series: {
          publisher: {
            id: publisher.id,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 50,
      include: previewIssueInclude,
    });

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
        issueCount: recentIssues.length,
        lastEdited: [],
      },
      issues: recentIssues.map(toPreviewIssue),
    };
  } catch {
    return null;
  }
}

export async function getSeriesScreenData(input: {
  us: boolean;
  publisher: string;
  series: string;
  volume: number;
}) {
  try {
    const series = await prisma.series.findFirst({
      where: {
        title: input.series,
        volume: input.volume,
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

    const recentIssues = await prisma.issue.findMany({
      where: {
        fkSeries: series.id,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 50,
      include: previewIssueInclude,
    });

    return {
      details: {
        id: String(series.id),
        title: series.title || null,
        startyear: Number(series.startYear),
        endyear: series.endYear === null ? null : Number(series.endYear),
        volume: Number(series.volume),
        genre: series.genre || null,
        addinfo: series.addInfo || null,
        issueCount: recentIssues.length,
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
      issues: recentIssues.map(toPreviewIssue),
    };
  } catch {
    return null;
  }
}

const previewIssueInclude = Prisma.validator<Prisma.IssueInclude>()({
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
});

function toPreviewIssue(issue: any) {
  return {
    id: String(issue.id),
    comicguideid: issue.comicGuideId === null || issue.comicGuideId === undefined ? null : String(issue.comicGuideId),
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
    stories: issue.stories.map((story: any) => ({
      onlyapp: story.onlyApp,
      firstapp: story.firstApp,
      otheronlytb: story.otherOnlyTb,
      exclusive: false,
      onlyoneprint: story.onlyOnePrint,
      onlytb: story.onlyTb,
      reprintOf: story.reprint ? { id: String(story.reprint.id) } : null,
      reprints: story.reprintedBy.map((reprint: any) => ({ id: String(reprint.id) })),
      parent: story.parent
        ? {
            children: story.parent.children.map((child: any) => ({ id: String(child.id) })),
            collectedmultipletimes: story.parent.collectedMultipleTimes,
          }
        : null,
      children: story.children.map((child: any) => ({
        id: String(child.id),
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
          volume: Number(issue.series.volume),
          startyear: Number(issue.series.startYear),
          endyear: issue.series.endYear === null ? null : Number(issue.series.endYear),
          publisher: issue.series.publisher
            ? {
                name: issue.series.publisher.name,
                us: issue.series.publisher.original,
              }
            : null,
        }
      : null,
  };
}
