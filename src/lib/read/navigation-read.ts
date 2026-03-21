import type { AppRouteContextValue } from "../../app/routeContext";
import { prisma } from "../prisma/client";
import { FilterService } from "../../services/FilterService";

const NAV_PAGE_SIZE = 250;

type NavigationScope = {
  us: boolean;
  filter?: string | null;
};

export async function readNavigationPublishers(scope: NavigationScope) {
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

export function getNavigationSeriesKey(input: {
  publisher?: string | null;
  title?: string | null;
  volume?: number | string | null;
}) {
  const numericVolume = Number(input.volume ?? 0);
  return [input.publisher || "", input.title || "", Number.isFinite(numericVolume) ? String(numericVolume) : ""].join(
    "|"
  );
}

export async function readNavigationSeries(scope: NavigationScope & { publisher: string }) {
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

export async function readNavigationIssues(
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

export type InitialNavigationData = {
  initialPublisherNodes: Awaited<ReturnType<typeof readNavigationPublishers>>;
  initialSeriesNodesByPublisher?: Record<string, Awaited<ReturnType<typeof readNavigationSeries>>>;
  initialIssueNodesBySeriesKey?: Record<string, Awaited<ReturnType<typeof readNavigationIssues>>>;
  initialFilterCount?: number;
};

export async function readInitialNavigationData(
  routeContext: AppRouteContextValue
): Promise<InitialNavigationData> {
  const filter = typeof routeContext.query?.filter === "string" ? routeContext.query.filter : null;
  const selectedPublisherName =
    routeContext.selected.publisher?.name ||
    routeContext.selected.series?.publisher?.name ||
    routeContext.selected.issue?.series?.publisher?.name ||
    "";
  const selectedSeries = routeContext.selected.series || routeContext.selected.issue?.series || null;
  const queryExpandedPublisher =
    typeof routeContext.query?.navPublisher === "string" ? routeContext.query.navPublisher : "";
  const queryExpandedSeriesKey = typeof routeContext.query?.navSeries === "string" ? routeContext.query.navSeries : "";

  const publishers = await readNavigationPublishers({
    us: routeContext.us,
    filter,
  });

  const publishersToExpand = new Set<string>();
  if (selectedPublisherName) publishersToExpand.add(selectedPublisherName);
  if (queryExpandedPublisher) publishersToExpand.add(queryExpandedPublisher);

  const initialSeriesNodesByPublisher: Record<string, Awaited<ReturnType<typeof readNavigationSeries>>> = {};

  for (const publisherName of publishersToExpand) {
    initialSeriesNodesByPublisher[publisherName] = await readNavigationSeries({
      us: routeContext.us,
      filter,
      publisher: publisherName,
    });
  }

  const seriesToExpand = new Map<
    string,
    {
      publisher: string;
      series: string;
      volume: number;
    }
  >();

  if (selectedSeries?.publisher?.name && selectedSeries.title) {
    seriesToExpand.set(
      getNavigationSeriesKey({
        publisher: selectedSeries.publisher.name,
        title: selectedSeries.title,
        volume: Number(selectedSeries.volume || 0),
      }),
      {
        publisher: selectedSeries.publisher.name,
        series: selectedSeries.title,
        volume: Number(selectedSeries.volume || 0),
      }
    );
  }

  if (queryExpandedSeriesKey) {
    const [publisher = "", ...rest] = queryExpandedSeriesKey.split("|");
    const volumeText = rest.pop() || "0";
    const title = rest.join("|");
    const volume = Number(volumeText || "0");

    if (publisher && title) {
      publishersToExpand.add(publisher);
      if (!initialSeriesNodesByPublisher[publisher]) {
        initialSeriesNodesByPublisher[publisher] = await readNavigationSeries({
          us: routeContext.us,
          filter,
          publisher,
        });
      }
      seriesToExpand.set(queryExpandedSeriesKey, {
        publisher,
        series: title,
        volume,
      });
    }
  }

  const initialIssueNodesBySeriesKey: Record<
    string,
    Awaited<ReturnType<typeof readNavigationIssues>>
  > = {};

  for (const [seriesKey, seriesInput] of seriesToExpand.entries()) {
    initialIssueNodesBySeriesKey[seriesKey] = await readNavigationIssues({
      us: routeContext.us,
      filter,
      publisher: seriesInput.publisher,
      series: seriesInput.series,
      volume: seriesInput.volume,
    });
  }

  let initialFilterCount: number | undefined;
  if (filter) {
    try {
      const parsedFilter = JSON.parse(filter) as Record<string, unknown>;
      initialFilterCount = await new FilterService().count(
        { us: routeContext.us, ...(parsedFilter || {}) } as never,
        false
      );
    } catch {
      initialFilterCount = undefined;
    }
  }

  return {
    initialPublisherNodes: publishers,
    initialSeriesNodesByPublisher:
      Object.keys(initialSeriesNodesByPublisher).length > 0 ? initialSeriesNodesByPublisher : undefined,
    initialIssueNodesBySeriesKey:
      Object.keys(initialIssueNodesBySeriesKey).length > 0 ? initialIssueNodesBySeriesKey : undefined,
    initialFilterCount,
  };
}
