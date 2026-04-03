import "server-only";

import { cache } from "react";
import { Prisma } from "@prisma/client";
import { FilterService } from "./filter-service";
import type { Filter, NumberFilter } from "../../types/query-data";

type RuntimeFilter = Filter & {
  noComicguideId?: boolean;
  noContent?: boolean;
  firstPrint?: boolean;
  notFirstPrint?: boolean;
  onlyPrint?: boolean;
  notOnlyPrint?: boolean;
  onlyTb?: boolean;
  notOnlyTb?: boolean;
  exclusive?: boolean;
  notExclusive?: boolean;
  reprint?: boolean;
  notReprint?: boolean;
  otherOnlyTb?: boolean;
  notOtherOnlyTb?: boolean;
  noPrint?: boolean;
  notNoPrint?: boolean;
  onlyOnePrint?: boolean;
  notOnlyOnePrint?: boolean;
  onlyCollected?: boolean;
  onlyNotCollected?: boolean;
  onlyNotCollectedNoOwnedVariants?: boolean;
  numbers?: Array<(NumberFilter & { variant?: string | null }) | null>;
};

const supportedDirectFilterKeys = new Set([
  "us",
  "formats",
  "releasedates",
  "withVariants",
  "onlyCollected",
  "onlyNotCollected",
  "publishers",
  "series",
  "noComicguideId",
  "noContent",
  "arcs",
  "appearances",
  "realities",
]);

function dedupeTerms(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter((value, index, allValues) => value.length > 0 && allValues.indexOf(value) === index);
}

function splitFilterTerms(value: string | null | undefined): string[] {
  if (!value) return [];
  return dedupeTerms(value.split("||"));
}

function extractArcTerms(filter: RuntimeFilter) {
  return Array.isArray(filter.arcs)
    ? dedupeTerms(
        filter.arcs.map((arc) => readTextValue(arc?.title)).filter((arc) => arc.length > 0)
      )
    : splitFilterTerms(filter.arcs as string | null | undefined);
}

function extractAppearanceTerms(filter: RuntimeFilter) {
  return Array.isArray(filter.appearances)
    ? dedupeTerms(
        filter.appearances
          .map((appearance) => readTextValue(appearance?.name))
          .filter((appearance) => appearance.length > 0)
      )
    : splitFilterTerms(filter.appearances as string | null | undefined);
}

function extractRealityTerms(filter: RuntimeFilter) {
  return Array.isArray(filter.realities)
    ? dedupeTerms(
        filter.realities
          .map((reality) => readTextValue(reality?.name))
          .filter((reality) => reality.length > 0)
      )
    : splitFilterTerms(filter.realities as string | null | undefined);
}

function readDirectFormats(filter: RuntimeFilter) {
  return (filter.formats || [])
    .map((format) => readTextValue(format))
    .filter((format) => format.length > 0);
}

function readDirectPublisherNames(filter: RuntimeFilter) {
  return (filter.publishers || [])
    .map((publisher) => readTextValue(publisher?.name))
    .filter((name) => name.length > 0);
}

function readDirectSeriesConditions(filter: RuntimeFilter) {
  return (filter.series || [])
    .map((series) => {
      const title = readTextValue(series?.title);
      const volume = typeof series?.volume === "number" ? series.volume : null;
      if (!title || volume === null) return null;
      return { title, volume: BigInt(volume) };
    })
    .filter((entry): entry is { title: string; volume: bigint } => Boolean(entry));
}

function buildArcTermIssueWhere(term: string, us: boolean): Prisma.IssueWhereInput {
  if (us) {
    return {
      arcs: {
        some: {
          arc: {
            title: {
              contains: term,
              mode: "insensitive",
            },
          },
        },
      },
    };
  }

  return {
    stories: {
      some: {
        parent: {
          issue: {
            arcs: {
              some: {
                arc: {
                  title: {
                    contains: term,
                    mode: "insensitive",
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function parseFilterDate(raw: string | null | undefined): Date | null {
  const value = readTextValue(raw);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function hasUnsupportedFilterState(filter: RuntimeFilter) {
  if (filter.onlyNotCollectedNoOwnedVariants) return true;
  if (Array.isArray(filter.numbers) && filter.numbers.length > 0) return true;
  if (Array.isArray(filter.genres) && filter.genres.length > 0) return true;
  if (Array.isArray(filter.individuals) && filter.individuals.length > 0) return true;

  return Boolean(
    filter.firstPrint ||
      filter.notFirstPrint ||
      filter.onlyPrint ||
      filter.notOnlyPrint ||
      filter.onlyTb ||
      filter.notOnlyTb ||
      filter.exclusive ||
      filter.notExclusive ||
      filter.reprint ||
      filter.notReprint ||
      filter.otherOnlyTb ||
      filter.notOtherOnlyTb ||
      filter.noPrint ||
      filter.notNoPrint ||
      filter.onlyOnePrint ||
      filter.notOnlyOnePrint
  );
}

export function buildDirectIssueFilterWhere(
  filter: Filter | null | undefined
): Prisma.IssueWhereInput | null {
  if (!filter) return null;

  const runtimeFilter = filter as RuntimeFilter;
  if (hasUnsupportedFilterState(runtimeFilter)) return null;

  const unknownKeys = Object.keys(runtimeFilter).filter(
    (key) => runtimeFilter[key as keyof RuntimeFilter] !== undefined && !supportedDirectFilterKeys.has(key)
  );
  if (unknownKeys.length > 0) return null;

  const and: Prisma.IssueWhereInput[] = [
    {
      series: {
        publisher: {
          original: Boolean(runtimeFilter.us),
        },
      },
    },
  ];

  const formats = readDirectFormats(runtimeFilter);
  if (formats.length > 0) and.push({ format: { in: formats } });

  and.push(...buildReleaseDateWhereClauses(runtimeFilter.releasedates));

  if (runtimeFilter.withVariants && !runtimeFilter.onlyCollected) {
    and.push({
      NOT: {
        OR: [{ variant: null }, { variant: "" }],
      },
    });
  }

  if (runtimeFilter.onlyCollected) and.push({ collected: true });
  if (runtimeFilter.onlyNotCollected) and.push({ collected: false });

  const publisherNames = readDirectPublisherNames(runtimeFilter);
  if (publisherNames.length > 0) {
    and.push({
      series: {
        publisher: {
          name: {
            in: publisherNames,
          },
        },
      },
    });
  }

  const seriesConditions = readDirectSeriesConditions(runtimeFilter);
  if (seriesConditions.length > 0) {
    and.push({
      OR: seriesConditions.map((series) => ({
        series: {
          title: series.title,
          volume: series.volume,
        },
      })),
    });
  }

  if (runtimeFilter.noComicguideId) {
    and.push({
      OR: [{ comicGuideId: null }, { comicGuideId: BigInt(0) }],
    });
  }

  if (runtimeFilter.noContent) {
    and.push({
      stories: {
        none: {},
      },
    });
  }

  const arcTerms = extractArcTerms(runtimeFilter);
  if (arcTerms.length > 0) {
    and.push({
      AND: arcTerms.map((term) => buildArcTermIssueWhere(term, Boolean(runtimeFilter.us))),
    });
  }

  const appearanceTerms = extractAppearanceTerms(runtimeFilter);
  if (appearanceTerms.length > 0) {
    and.push({
      AND: appearanceTerms.map((term) => ({
        OR: [
          {
            stories: {
              some: {
                appearances: {
                  some: {
                    appearance: {
                      name: {
                        contains: term,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              },
            },
          },
          {
            stories: {
              some: {
                children: {
                  some: {
                    appearances: {
                      some: {
                        appearance: {
                          name: {
                            contains: term,
                            mode: "insensitive",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          ...(runtimeFilter.us
            ? []
            : [
                {
                  stories: {
                    some: {
                      parent: {
                        appearances: {
                          some: {
                            appearance: {
                              name: {
                                contains: term,
                                mode: "insensitive",
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                } satisfies Prisma.IssueWhereInput,
              ]),
        ],
      })),
    });
  }

  const realityTerms = extractRealityTerms(runtimeFilter);
  if (realityTerms.length > 0) {
    and.push({
      AND: realityTerms.map((term) => {
        const marker = `(${term})`;
        return {
          OR: [
            {
              stories: {
                some: {
                  appearances: {
                    some: {
                      appearance: {
                        name: {
                          contains: marker,
                          mode: "insensitive",
                        },
                      },
                    },
                  },
                },
              },
            },
            {
              stories: {
                some: {
                  children: {
                    some: {
                      appearances: {
                        some: {
                          appearance: {
                            name: {
                              contains: marker,
                              mode: "insensitive",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            ...(runtimeFilter.us
              ? []
              : [
                  {
                    stories: {
                      some: {
                        parent: {
                          appearances: {
                            some: {
                              appearance: {
                                name: {
                                  contains: marker,
                                  mode: "insensitive",
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  } satisfies Prisma.IssueWhereInput,
                ]),
          ],
        };
      }),
    });
  }

  return and.length === 1 ? and[0] : { AND: and };
}

function buildReleaseDateWhereClauses(
  releasedates: RuntimeFilter["releasedates"]
): Prisma.IssueWhereInput[] {
  const clauses: Prisma.IssueWhereInput[] = [];

  for (const entry of releasedates || []) {
    const parsedDate = parseFilterDate(entry?.date);
    if (!parsedDate) continue;

    const compare = readTextValue(entry?.compare) || "=";
    if (compare === "=") {
      clauses.push({ releaseDate: { gte: startOfDay(parsedDate), lte: endOfDay(parsedDate) } });
    } else if (compare === ">=") {
      clauses.push({ releaseDate: { gte: startOfDay(parsedDate) } });
    } else if (compare === ">") {
      clauses.push({ releaseDate: { gt: endOfDay(parsedDate) } });
    } else if (compare === "<=") {
      clauses.push({ releaseDate: { lte: endOfDay(parsedDate) } });
    } else if (compare === "<") {
      clauses.push({ releaseDate: { lt: startOfDay(parsedDate) } });
    }
  }

  return clauses;
}

export async function readFilteredIssueIds(
  filter: Filter | null | undefined
): Promise<number[] | null> {
  if (!filter) return null;
  return new FilterService().getFilteredIssueIds(filter);
}

type ResolvedFilterState = {
  directIssueWhere: Prisma.IssueWhereInput | null;
  filteredIssueIds: number[] | null;
  filteredIssueIdsBigInt: bigint[] | null;
  initialFilterCount: number | undefined;
};

const resolveFilterStateCached = cache(
  async (serializedFilter: string): Promise<ResolvedFilterState> => {
    const filter = JSON.parse(serializedFilter) as Filter;
    const directIssueWhere = buildDirectIssueFilterWhere(filter);

    if (directIssueWhere) {
      const { prisma } = await import("../prisma/client");
      const initialFilterCount = await prisma.issue.count({ where: directIssueWhere });
      return {
        directIssueWhere,
        filteredIssueIds: null,
        filteredIssueIdsBigInt: null,
        initialFilterCount,
      };
    }

    const filteredIssueIds = await new FilterService().getFilteredIssueIds(filter);
    return {
      directIssueWhere: null,
      filteredIssueIds,
      filteredIssueIdsBigInt: filteredIssueIds ? filteredIssueIds.map(BigInt) : null,
      initialFilterCount: filteredIssueIds ? filteredIssueIds.length : undefined,
    };
  }
);

export async function resolveFilterState(
  filter: Filter | null | undefined
): Promise<ResolvedFilterState> {
  if (!filter) {
    return {
      directIssueWhere: null,
      filteredIssueIds: null,
      filteredIssueIdsBigInt: null,
      initialFilterCount: undefined,
    };
  }

  return resolveFilterStateCached(JSON.stringify(filter));
}

export async function readFilterCount(
  filter: Filter | null | undefined
): Promise<number | undefined> {
  if (!filter) return undefined;

  return (await resolveFilterState(filter)).initialFilterCount;
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}
