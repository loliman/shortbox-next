import "server-only";

import type { Filter } from "../../types/query-data";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import type { LayoutRouteData } from "../../types/route-ui";
import { resolveFilterState } from "./filter-read";
import { compareIssueNumber, compareIssueVariants } from "./issue-read-shared";

const NAV_PAGE_SIZE = 250;

type NavigationScope = {
  us: boolean;
  filteredIssueIds?: bigint[] | null;
  directIssueWhere?: Prisma.IssueWhereInput | null;
};

export async function readNavigationPublishers(scope: NavigationScope) {
  const publishers = await prisma.publisher.findMany({
    where: {
      original: scope.us,
      ...(scope.directIssueWhere
        ? {
            series: {
              some: {
                issues: {
                  some: scope.directIssueWhere,
                },
              },
            },
          }
        : scope.filteredIssueIds
        ? {
            series: {
              some: {
                issues: {
                  some: {
                    id: {
                      in: scope.filteredIssueIds,
                    },
                  },
                },
              },
            },
          }
        : {}),
    },
    orderBy: [{ name: "asc" }],
    take: NAV_PAGE_SIZE,
  });

  return publishers.map((publisher) => ({
    id: String(publisher.id),
    name: publisher.name,
    us: publisher.original,
  }));
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
  const series = await prisma.series.findMany({
    where: {
      publisher: {
        name: scope.publisher,
        original: scope.us,
      },
      ...(scope.directIssueWhere
        ? {
            issues: {
              some: scope.directIssueWhere,
            },
          }
        : scope.filteredIssueIds
        ? {
            issues: {
              some: {
                id: {
                  in: scope.filteredIssueIds,
                },
              },
            },
          }
        : {}),
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
}

export async function readNavigationIssues(
  scope: NavigationScope & {
    publisher: string;
    series: string;
    volume: number;
  }
) {
  const issues = await prisma.issue.findMany({
    where: {
      ...(scope.directIssueWhere || {}),
      ...(scope.filteredIssueIds
        ? {
            id: {
              in: scope.filteredIssueIds,
            },
          }
        : {}),
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

  return Array.from(grouped.entries())
    .sort(([leftNumber], [rightNumber]) => compareIssueNumber(leftNumber, rightNumber))
    .map(([, rawGroup]) => {
    const group = [...rawGroup].sort(compareIssueVariants);
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
}

export type InitialNavigationData = {
  initialPublisherNodes: Awaited<ReturnType<typeof readNavigationPublishers>>;
  initialSeriesNodesByPublisher?: Record<string, Awaited<ReturnType<typeof readNavigationSeries>>>;
  initialIssueNodesBySeriesKey?: Record<string, Awaited<ReturnType<typeof readNavigationIssues>>>;
  initialFilterCount?: number;
};

async function readNavigationFilterState(rawFilter: string | null | undefined, loggedIn = false) {
  const normalizedFilter = typeof rawFilter === "string" ? rawFilter.trim() : "";
  if (!normalizedFilter) {
    return {
      filteredIssueIds: null as bigint[] | null,
      directIssueWhere: null as Prisma.IssueWhereInput | null,
      initialFilterCount: undefined as number | undefined,
    };
  }

  try {
    const parsedFilter = JSON.parse(normalizedFilter) as Filter;
    const resolved = await resolveFilterState(parsedFilter, loggedIn);

    return {
      directIssueWhere: resolved.directIssueWhere,
      filteredIssueIds: resolved.filteredIssueIdsBigInt,
      initialFilterCount: resolved.initialFilterCount,
    };
  } catch {
    return {
      filteredIssueIds: [] as bigint[],
      directIssueWhere: null as Prisma.IssueWhereInput | null,
      initialFilterCount: 0,
    };
  }
}

export async function readInitialNavigationData(
  input: Pick<LayoutRouteData, "query" | "selected" | "us"> & { loggedIn?: boolean }
): Promise<InitialNavigationData> {
  const navigationFilterState = await readNavigationFilterState(
    typeof input.query?.filter === "string" ? input.query.filter : null,
    Boolean(input.loggedIn)
  );
  const selectedPublisherName =
    input.selected.publisher?.name ||
    input.selected.series?.publisher?.name ||
    input.selected.issue?.series?.publisher?.name ||
    "";
  const selectedSeries = input.selected.series || input.selected.issue?.series || null;
  const queryExpandedPublisher =
    typeof input.query?.navPublisher === "string" ? input.query.navPublisher : "";
  const queryExpandedSeriesKey = typeof input.query?.navSeries === "string" ? input.query.navSeries : "";

  const publishers = await readNavigationPublishers({
    us: input.us,
    directIssueWhere: navigationFilterState.directIssueWhere,
    filteredIssueIds: navigationFilterState.filteredIssueIds,
  });

  const publishersToExpand = new Set<string>();
  if (selectedPublisherName) publishersToExpand.add(selectedPublisherName);
  if (queryExpandedPublisher) publishersToExpand.add(queryExpandedPublisher);

  const initialSeriesNodesByPublisher: Record<string, Awaited<ReturnType<typeof readNavigationSeries>>> = {};

  const initialSeriesEntries = await Promise.all(
    Array.from(publishersToExpand).map(async (publisherName) => [
      publisherName,
      await readNavigationSeries({
        us: input.us,
        directIssueWhere: navigationFilterState.directIssueWhere,
        filteredIssueIds: navigationFilterState.filteredIssueIds,
        publisher: publisherName,
      }),
    ] as const)
  );
  for (const [publisherName, seriesNodes] of initialSeriesEntries) {
    initialSeriesNodesByPublisher[publisherName] = seriesNodes;
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
          us: input.us,
          directIssueWhere: navigationFilterState.directIssueWhere,
          filteredIssueIds: navigationFilterState.filteredIssueIds,
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

  const initialIssueEntries = await Promise.all(
    Array.from(seriesToExpand.entries()).map(async ([seriesKey, seriesInput]) => [
      seriesKey,
      await readNavigationIssues({
        us: input.us,
        directIssueWhere: navigationFilterState.directIssueWhere,
        filteredIssueIds: navigationFilterState.filteredIssueIds,
        publisher: seriesInput.publisher,
        series: seriesInput.series,
        volume: seriesInput.volume,
      }),
    ] as const)
  );
  for (const [seriesKey, issueNodes] of initialIssueEntries) {
    initialIssueNodesBySeriesKey[seriesKey] = issueNodes;
  }

  return {
    initialPublisherNodes: publishers,
    initialSeriesNodesByPublisher:
      Object.keys(initialSeriesNodesByPublisher).length > 0 ? initialSeriesNodesByPublisher : undefined,
    initialIssueNodesBySeriesKey:
      Object.keys(initialIssueNodesBySeriesKey).length > 0 ? initialIssueNodesBySeriesKey : undefined,
    initialFilterCount: navigationFilterState.initialFilterCount,
  };
}
