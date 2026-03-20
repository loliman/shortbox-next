import { prisma } from "../prisma/client";

const NAV_PAGE_SIZE = 250;

type NavigationScope = {
  us: boolean;
  filter?: string | null;
};

export async function getNavigationPublishers(scope: NavigationScope) {
  void scope.filter;

  try {
    const publishers = await prisma.publisher.findMany({
      where: {
        original: scope.us,
      },
      orderBy: [{ name: "asc" }],
      take: NAV_PAGE_SIZE,
    });

    return publishers.map((publisher) => ({
      id: String(publisher.id),
      name: publisher.name,
      us: publisher.original,
    }));
  } catch {
    return [];
  }
}

export async function getNavigationSeries(scope: NavigationScope & { publisher: string }) {
  void scope.filter;

  try {
    const series = await prisma.series.findMany({
      where: {
        publisher: {
          name: scope.publisher,
          original: scope.us,
        },
      },
      orderBy: [{ title: "asc" }, { volume: "asc" }, { startYear: "asc" }, { id: "asc" }],
      take: NAV_PAGE_SIZE,
      include: {
        publisher: true,
      },
    });

    return series.map((entry) => ({
      id: String(entry.id),
      title: entry.title || "",
      volume: Number(entry.volume),
      startyear: Number(entry.startYear),
      endyear: entry.endYear === null ? null : Number(entry.endYear),
      publisher: entry.publisher
        ? {
            name: entry.publisher.name,
            us: entry.publisher.original,
          }
        : null,
    }));
  } catch {
    return [];
  }
}

export async function getNavigationIssues(
  scope: NavigationScope & {
    publisher: string;
    series: string;
    volume: number;
  }
) {
  void scope.filter;

  try {
    const issues = await prisma.issue.findMany({
      where: {
        series: {
          title: scope.series,
          volume: scope.volume,
          publisher: {
            name: scope.publisher,
            original: scope.us,
          },
        },
      },
      orderBy: [{ number: "asc" }, { format: "asc" }, { variant: "asc" }, { id: "asc" }],
      take: NAV_PAGE_SIZE,
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
    });

    const grouped = new Map<string, typeof issues>();
    for (const issue of issues) {
      const key = issue.number;
      const current = grouped.get(key) || [];
      current.push(issue);
      grouped.set(key, current);
    }

    return Array.from(grouped.values()).map((group) => {
      const primary = group[0];
      const variants = group.map((variant) => ({
        id: String(variant.id),
        collected: variant.collected ?? null,
        format: variant.format || null,
        variant: variant.variant || null,
      }));

      return {
        id: String(primary.id),
        number: primary.number,
        legacy_number: primary.legacyNumber || null,
        title: primary.title || null,
        format: primary.format || null,
        variant: primary.variant || null,
        collected: primary.collected ?? null,
        cover: primary.covers[0]
          ? {
              url: primary.covers[0].url || null,
            }
          : null,
        variants,
        series: primary.series
          ? {
              title: primary.series.title || "",
              volume: Number(primary.series.volume),
              publisher: primary.series.publisher
                ? {
                    name: primary.series.publisher.name,
                    us: primary.series.publisher.original,
                  }
                : null,
            }
          : null,
      };
    });
  } catch {
    return [];
  }
}
