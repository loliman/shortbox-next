import "server-only";

import { unstable_cache } from "next/cache";
import type { Filter } from "../../types/query-data";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import type { LayoutRouteData } from "../../types/route-ui";
import { NAVIGATION_CACHE_TAG } from "../cache-tags";
import { resolveFilterState } from "./filter-read";
import { compareIssueNumber, compareIssueVariants } from "./issue-read-shared";
import { readNavOpenStateFromQuery } from "../routes/nav-open-state";
import { matchesSeriesSelectionBySlug } from "./series-selection";
import { slugify } from "../slug-builder";
import {
  getNavigationSeriesKey,
  matchesNavigationSeriesKey,
  parseNavigationSeriesKey,
} from "./navigation-key";
import {
  pickNavigationIssuePreviewSource,
  serializeNavigationComicGuideId,
} from "./navigation-issue-preview";
import {
  resolveNavigationPreloadOptions,
  type NavigationPreloadOptions,
} from "./navigation-preload";

type NavigationScope = {
  us: boolean;
  filteredIssueIds?: bigint[] | null;
  directIssueWhere?: Prisma.IssueWhereInput | null;
};

export type NavigationIssuesScope = NavigationScope & {
  publisher: string;
  series: string;
  volume: number;
  startyear?: number | null;
};

function toJsonOrNull(value: unknown) {
  if (value === null || value === undefined) return null;

  return JSON.stringify(value, (_, currentValue) =>
    typeof currentValue === "bigint" ? currentValue.toString() : currentValue
  );
}

function parseFilteredIssueIds(filteredIssueIdsJson: string | null) {
  if (!filteredIssueIdsJson) return null;
  return (JSON.parse(filteredIssueIdsJson) as Array<string | number>).map(BigInt);
}

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
  });

  return publishers.map((publisher) => ({
    id: String(publisher.id),
    name: publisher.name,
    us: publisher.original,
  }));
}

const readNavigationPublishersCached = unstable_cache(
  async (
    us: boolean,
    directIssueWhereJson: string | null,
    filteredIssueIdsJson: string | null
  ) => {
    return readNavigationPublishers({
      us,
      directIssueWhere: directIssueWhereJson
        ? (JSON.parse(directIssueWhereJson) as Prisma.IssueWhereInput)
        : null,
      filteredIssueIds: parseFilteredIssueIds(filteredIssueIdsJson),
    });
  },
  ["navigation-publishers"],
  { revalidate: 300, tags: [NAVIGATION_CACHE_TAG] }
);

function resolveSeriesNode(
  seriesNodes: Awaited<ReturnType<typeof readNavigationSeries>>,
  selection: {
    publisher?: string | null;
    series?: string | null;
    volume?: number | null;
    startyear?: number | null;
    us: boolean;
  }
) {
  return seriesNodes.find((seriesNode) =>
    matchesSeriesSelectionBySlug(seriesNode, {
      us: selection.us,
      publisher: selection.publisher ?? "",
      series: selection.series ?? "",
      volume: Number(selection.volume || 0),
      startyear: Number(selection.startyear || 0) || undefined,
    })
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

const readNavigationSeriesCached = unstable_cache(
  async (
    us: boolean,
    publisher: string,
    directIssueWhereJson: string | null,
    filteredIssueIdsJson: string | null
  ) => {
    return readNavigationSeries({
      us,
      publisher,
      directIssueWhere: directIssueWhereJson
        ? (JSON.parse(directIssueWhereJson) as Prisma.IssueWhereInput)
        : null,
      filteredIssueIds: parseFilteredIssueIds(filteredIssueIdsJson),
    });
  },
  ["navigation-series"],
  { revalidate: 300, tags: [NAVIGATION_CACHE_TAG] }
);

export async function readNavigationIssues(scope: NavigationIssuesScope) {
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
        ...(Number(scope.startyear || 0) > 0 ? { startYear: BigInt(Number(scope.startyear)) } : {}),
        publisher: {
          name: scope.publisher,
          original: scope.us,
        },
      },
    },
    orderBy: [{ number: "asc" }, { format: "asc" }, { variant: "asc" }, { id: "asc" }],
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
    const previewSource = pickNavigationIssuePreviewSource(group) || primary;
    const variants = group.map((variant) => ({
      id: String(variant.id),
      collected: variant.collected ?? null,
      format: variant.format || null,
      variant: variant.variant || null,
    }));

    return {
      id: String(primary.id),
      comicguideid: serializeNavigationComicGuideId(previewSource?.comicGuideId),
      number: primary.number,
      legacy_number: primary.legacyNumber || null,
      title: primary.title || null,
      format: primary.format || null,
      variant: primary.variant || null,
      collected: primary.collected ?? null,
      cover: previewSource?.covers?.[0]
        ? {
            url: previewSource.covers[0].url || null,
          }
        : null,
      variants,
      series: primary.series
        ? {
            title: primary.series.title || "",
            volume: Number(primary.series.volume),
            startyear: Number(primary.series.startYear),
            endyear: primary.series.endYear === null ? null : Number(primary.series.endYear),
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

const readNavigationIssuesCached = unstable_cache(
  async (
    us: boolean,
    publisher: string,
    series: string,
    volume: number,
    startyear: number | null,
    directIssueWhereJson: string | null,
    filteredIssueIdsJson: string | null
  ) => {
    return readNavigationIssues({
      us,
      publisher,
      series,
      volume,
      startyear,
      directIssueWhere: directIssueWhereJson
        ? (JSON.parse(directIssueWhereJson) as Prisma.IssueWhereInput)
        : null,
      filteredIssueIds: parseFilteredIssueIds(filteredIssueIdsJson),
    });
  },
  ["navigation-issues"],
  { revalidate: 300, tags: [NAVIGATION_CACHE_TAG] }
);

export type InitialNavigationData = {
  initialPublisherNodes: Awaited<ReturnType<typeof readNavigationPublishers>>;
  initialSeriesNodesByPublisher?: Record<string, Awaited<ReturnType<typeof readNavigationSeries>>>;
  initialIssueNodesBySeriesKey?: Record<string, Awaited<ReturnType<typeof readNavigationIssues>>>;
  initialFilterCount?: number;
};

export async function readNavigationFilterState(rawFilter: string | null | undefined, loggedIn = false) {
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
  input: Pick<LayoutRouteData, "query" | "selected" | "us"> & {
    loggedIn?: boolean;
    preload?: NavigationPreloadOptions;
  }
): Promise<InitialNavigationData> {
  const preloadOptions = resolveNavigationPreloadOptions(input.preload);
  const preloadSeriesNodes = preloadOptions.seriesNodes;
  const preloadIssueNodes = preloadOptions.issueNodes;
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
  const navOpenState = readNavOpenStateFromQuery(input.query);

  const directIssueWhereJson = toJsonOrNull(navigationFilterState.directIssueWhere);
  const filteredIssueIdsJson = toJsonOrNull(navigationFilterState.filteredIssueIds);
  const publishers = await readNavigationPublishersCached(
    input.us,
    directIssueWhereJson,
    filteredIssueIdsJson
  );
  const resolvedSelectedPublisherName = selectedPublisherName
    ? publishers.find((publisherNode) => slugify(String(publisherNode.name || "")) === slugify(selectedPublisherName))
        ?.name || selectedPublisherName
    : "";

  const publishersToExpand = new Set<string>();
  if (resolvedSelectedPublisherName) publishersToExpand.add(resolvedSelectedPublisherName);
  for (const publisherName of navOpenState.publishers) {
    publishersToExpand.add(publisherName);
  }

  const initialSeriesNodesByPublisher: Record<string, Awaited<ReturnType<typeof readNavigationSeries>>> = {};

  if (preloadSeriesNodes) {
    const initialSeriesEntries = await Promise.all(
      Array.from(publishersToExpand).map(async (publisherName) => [
        publisherName,
        await readNavigationSeriesCached(
          input.us,
          publisherName,
          directIssueWhereJson,
          filteredIssueIdsJson
        ),
      ] as const)
    );
    for (const [publisherName, seriesNodes] of initialSeriesEntries) {
      initialSeriesNodesByPublisher[publisherName] = seriesNodes;
    }
  }

  const seriesToExpand = new Map<
    string,
    {
      publisher: string;
      series: string;
      volume: number;
      startyear?: number | null;
    }
  >();

  if (
    preloadSeriesNodes &&
    (resolvedSelectedPublisherName || selectedSeries?.publisher?.name) &&
    selectedSeries?.title
  ) {
    const matchingSelectedSeriesNode = resolveSeriesNode(
      initialSeriesNodesByPublisher[resolvedSelectedPublisherName || selectedSeries?.publisher?.name || ""] || [],
      {
        publisher: resolvedSelectedPublisherName || selectedSeries?.publisher?.name,
        series: selectedSeries.title,
        volume: Number(selectedSeries.volume || 0),
        startyear: Number(selectedSeries.startyear || 0) || undefined,
        us: input.us,
      }
    );
    const effectiveSelectedSeries = matchingSelectedSeriesNode
      ? {
          publisher:
            matchingSelectedSeriesNode.publisher?.name ||
            resolvedSelectedPublisherName ||
            selectedSeries?.publisher?.name ||
            "",
          series: matchingSelectedSeriesNode.title || selectedSeries.title,
          volume: Number(matchingSelectedSeriesNode.volume || selectedSeries.volume || 0),
          startyear:
            Number(matchingSelectedSeriesNode.startyear || selectedSeries.startyear || 0) || undefined,
        }
      : {
          publisher: resolvedSelectedPublisherName || selectedSeries?.publisher?.name || "",
          series: selectedSeries.title,
          volume: Number(selectedSeries.volume || 0),
          startyear: Number(selectedSeries.startyear || 0) || undefined,
        };
    seriesToExpand.set(
      getNavigationSeriesKey({
        publisher: effectiveSelectedSeries.publisher,
        title: effectiveSelectedSeries.series,
        volume: effectiveSelectedSeries.volume,
        startyear: effectiveSelectedSeries.startyear,
      }),
      effectiveSelectedSeries
    );
  }

  for (const openSeriesKey of preloadSeriesNodes ? navOpenState.series : []) {
    const parsedSeriesKey = parseNavigationSeriesKey(openSeriesKey);
    const volume = Number(parsedSeriesKey?.volume || "0");
    const publisherSlug = parsedSeriesKey?.publisher || "";

    if (publisherSlug && volume > 0) {
      const matchingPublisher = publishers.find(
        (publisherNode) => slugify(String(publisherNode.name || "")) === publisherSlug
      );
      const publisherName = matchingPublisher?.name || "";
      if (!publisherName) continue;

      publishersToExpand.add(publisherName);
      if (!initialSeriesNodesByPublisher[publisherName]) {
        initialSeriesNodesByPublisher[publisherName] = await readNavigationSeriesCached(
          input.us,
          publisherName,
          directIssueWhereJson,
          filteredIssueIdsJson
        );
      }
      const matchingSeriesNode = (initialSeriesNodesByPublisher[publisherName] || []).find(
        (seriesNode) =>
          matchesNavigationSeriesKey(openSeriesKey, {
            publisher: seriesNode.publisher?.name,
            title: seriesNode.title,
            volume: seriesNode.volume,
            startyear: seriesNode.startyear,
          })
      );
      if (!matchingSeriesNode?.title) continue;

      const resolvedSeriesKey = getNavigationSeriesKey({
        publisher: matchingSeriesNode.publisher?.name,
        title: matchingSeriesNode.title,
        volume: matchingSeriesNode.volume,
        startyear: matchingSeriesNode.startyear,
      });

      seriesToExpand.set(resolvedSeriesKey, {
        publisher: publisherName,
        series: matchingSeriesNode.title,
        volume: Number(matchingSeriesNode.volume || volume),
        startyear: Number(matchingSeriesNode.startyear || 0) || undefined,
      });
    }
  }

  const initialIssueNodesBySeriesKey: Record<
    string,
    Awaited<ReturnType<typeof readNavigationIssues>>
  > = {};

  if (preloadSeriesNodes && preloadIssueNodes) {
    const initialIssueEntries = await Promise.all(
      Array.from(seriesToExpand.entries()).map(async ([seriesKey, seriesInput]) => [
        seriesKey,
        await readNavigationIssuesCached(
          input.us,
          seriesInput.publisher,
          seriesInput.series,
          seriesInput.volume,
          seriesInput.startyear ?? null,
          directIssueWhereJson,
          filteredIssueIdsJson
        ),
      ] as const)
    );
    for (const [seriesKey, issueNodes] of initialIssueEntries) {
      initialIssueNodesBySeriesKey[seriesKey] = issueNodes;
    }
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
