import "server-only";

import { cache } from "react";
import { Prisma } from "@prisma/client";
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
  individuals?: Array<{
    name?: string | null;
    type?: Array<string | null> | string | null;
  } | null>;
};

const TRANSLATOR_INDIVIDUAL_TYPE = "TRANSLATOR";
const NUMERIC_PATTERN = /^[0-9]+(\.[0-9]+)?$/;
const COMPARE_OPERATORS = new Set(["=", ">", ">=", "<", "<="]);

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
  "genres",
  "firstPrint",
  "notFirstPrint",
  "onlyPrint",
  "notOnlyPrint",
  "onlyTb",
  "notOnlyTb",
  "exclusive",
  "notExclusive",
  "reprint",
  "notReprint",
  "otherOnlyTb",
  "notOtherOnlyTb",
  "noPrint",
  "notNoPrint",
  "onlyOnePrint",
  "notOnlyOnePrint",
  "numbers",
  "individuals",
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

function buildAppearanceTermIssueWhere(term: string, us: boolean): Prisma.IssueWhereInput {
  return {
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
      ...(us
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
  };
}

function buildRealityTermIssueWhere(term: string, us: boolean): Prisma.IssueWhereInput {
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
      ...(us
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
}

function applyFormatsFilter(and: Prisma.IssueWhereInput[], filter: RuntimeFilter) {
  const formats = readDirectFormats(filter);
  if (formats.length > 0) and.push({ format: { in: formats } });
}

function applyVariantFilter(and: Prisma.IssueWhereInput[], filter: RuntimeFilter) {
  if (!filter.withVariants || filter.onlyCollected) return;
  and.push({
    NOT: {
      OR: [{ variant: null }, { variant: "" }],
    },
  });
}

function applyCollectedFilters(and: Prisma.IssueWhereInput[], filter: RuntimeFilter) {
  if (filter.onlyCollected) and.push({ collected: true });
  if (filter.onlyNotCollected) and.push({ collected: false });
}

function applyPublisherFilter(and: Prisma.IssueWhereInput[], filter: RuntimeFilter) {
  const publisherNames = readDirectPublisherNames(filter);
  if (publisherNames.length === 0) return;
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

function applySeriesFilter(and: Prisma.IssueWhereInput[], filter: RuntimeFilter) {
  const seriesConditions = readDirectSeriesConditions(filter);
  if (seriesConditions.length === 0) return;
  and.push({
    OR: seriesConditions.map((series) => ({
      series: {
        title: series.title,
        volume: series.volume,
      },
    })),
  });
}

function applyDirectTermFilters(and: Prisma.IssueWhereInput[], filter: RuntimeFilter) {
  const us = Boolean(filter.us);
  const arcTerms = extractArcTerms(filter);
  if (arcTerms.length > 0) {
    and.push({ AND: arcTerms.map((term) => buildArcTermIssueWhere(term, us)) });
  }

  const appearanceTerms = extractAppearanceTerms(filter);
  if (appearanceTerms.length > 0) {
    and.push({ AND: appearanceTerms.map((term) => buildAppearanceTermIssueWhere(term, us)) });
  }

  const realityTerms = extractRealityTerms(filter);
  if (realityTerms.length > 0) {
    and.push({ AND: realityTerms.map((term) => buildRealityTermIssueWhere(term, us)) });
  }
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
  return false;
}

function normalizeCompareOperator(value: unknown): "=" | ">" | ">=" | "<" | "<=" {
  const compare = readTextValue(value);
  if (COMPARE_OPERATORS.has(compare)) {
    return compare as "=" | ">" | ">=" | "<" | "<=";
  }
  return "=";
}

function buildLexicalNumberRange(
  raw: string,
  compare: "=" | ">" | ">=" | "<" | "<="
): Prisma.IssueWhereInput {
  if (compare === "=") {
    return { OR: [{ number: raw }, { legacyNumber: raw }] };
  }

  const condition = (op: Exclude<typeof compare, "=">) => {
    switch (op) {
      case ">":
        return { gt: raw };
      case ">=":
        return { gte: raw };
      case "<":
        return { lt: raw };
      case "<=":
        return { lte: raw };
    }
  };

  return {
    OR: [
      { number: condition(compare) },
      { legacyNumber: condition(compare) },
    ],
  };
}

function buildNumericNumberRange(
  numericValue: string,
  compare: "=" | ">" | ">=" | "<" | "<="
): Prisma.IssueWhereInput {
  const decimal = new Prisma.Decimal(numericValue);
  if (compare === "=") {
    return { OR: [{ numberNumeric: decimal }, { legacyNumberNumeric: decimal }] };
  }

  const condition = (op: Exclude<typeof compare, "=">) => {
    switch (op) {
      case ">":
        return { gt: decimal };
      case ">=":
        return { gte: decimal };
      case "<":
        return { lt: decimal };
      case "<=":
        return { lte: decimal };
    }
  };

  return {
    OR: [
      { numberNumeric: condition(compare) },
      { legacyNumberNumeric: condition(compare) },
    ],
  };
}

function buildNumbersClause(
  entry: NonNullable<RuntimeFilter["numbers"]>[number]
): Prisma.IssueWhereInput | null {
  const raw = readTextValue(entry?.number);
  if (!raw) return null;

  const compare = normalizeCompareOperator(entry?.compare);
  const variant =
    entry && typeof entry === "object" && "variant" in entry
      ? readTextValue((entry as { variant?: unknown }).variant)
      : "";

  const isNumericValue = NUMERIC_PATTERN.test(raw);
  const numberPart =
    compare === "="
      ? buildLexicalNumberRange(raw, compare)
      : isNumericValue
        ? buildNumericNumberRange(raw, compare)
        : buildLexicalNumberRange(raw, compare);

  if (variant.length === 0) return numberPart;
  return { AND: [numberPart, { variant }] };
}

function applyNumbersFilter(and: Prisma.IssueWhereInput[], filter: RuntimeFilter) {
  if (!Array.isArray(filter.numbers) || filter.numbers.length === 0) return;
  for (const entry of filter.numbers) {
    const clause = buildNumbersClause(entry);
    if (clause) and.push(clause);
  }
}

function normalizeIndividualTypes(rawType: unknown): string[] {
  const collected: unknown[] = Array.isArray(rawType) ? rawType : rawType != null ? [rawType] : [];
  return dedupeTerms(
    collected
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim().toUpperCase())
      .filter((entry) => entry.length > 0)
  );
}

function buildIndividualBranches(name: string, types: string[]): Prisma.StoryWhereInput[] {
  const branches: Prisma.StoryWhereInput[] = [];

  if (types.length === 0) {
    branches.push({ individuals: { some: { individual: { name } } } });
    branches.push({ parent: { individuals: { some: { individual: { name } } } } });
    return branches;
  }

  const includesTranslator = types.includes(TRANSLATOR_INDIVIDUAL_TYPE);
  const nonTranslatorTypes = types.filter((type) => type !== TRANSLATOR_INDIVIDUAL_TYPE);

  if (includesTranslator) {
    branches.push({
      individuals: {
        some: {
          individual: { name },
          type: { equals: TRANSLATOR_INDIVIDUAL_TYPE, mode: "insensitive" },
        },
      },
    });
  }

  if (nonTranslatorTypes.length > 0) {
    const linkClause = {
      individual: { name },
      type: { in: nonTranslatorTypes, mode: "insensitive" as const },
    };
    branches.push({ parent: { individuals: { some: linkClause } } });
    branches.push({ parent: null, individuals: { some: linkClause } });
  }

  return branches;
}

function applyIndividualsFilter(and: Prisma.IssueWhereInput[], filter: RuntimeFilter) {
  if (!Array.isArray(filter.individuals) || filter.individuals.length === 0) return;

  for (const entry of filter.individuals) {
    const name = readTextValue(entry?.name);
    if (!name) continue;

    const types = normalizeIndividualTypes(entry?.type);
    const branches = buildIndividualBranches(name, types);
    if (branches.length === 0) continue;

    and.push({ stories: { some: { OR: branches } } });
  }
}

function readGenreTerms(filter: RuntimeFilter): string[] {
  if (!Array.isArray(filter.genres)) return [];
  return dedupeTerms(
    filter.genres
      .map((genre) => (typeof genre === "string" ? genre : ""))
      .filter((genre) => genre.trim().length > 0)
  );
}

function applyGenresFilter(and: Prisma.IssueWhereInput[], filter: RuntimeFilter) {
  const terms = readGenreTerms(filter);
  if (terms.length === 0) return;
  and.push({
    AND: terms.map((term) => ({
      series: {
        genres: {
          some: {
            genre: { contains: term, mode: "insensitive" },
          },
        },
      },
    })),
  });
}

function applyStoryFlagFilters(and: Prisma.IssueWhereInput[], filter: RuntimeFilter) {
  if (filter.firstPrint) and.push({ hasFirstPrint: true });
  if (filter.notFirstPrint) and.push({ hasFirstPrint: false });
  if (filter.onlyPrint) and.push({ hasOnlyPrint: true });
  if (filter.notOnlyPrint) and.push({ hasOnlyPrint: false });
  if (filter.onlyTb) and.push({ hasOnlyTb: true });
  if (filter.notOnlyTb) and.push({ hasOnlyTb: false });
  if (filter.exclusive) and.push({ hasExclusiveStory: true });
  if (filter.notExclusive) and.push({ hasExclusiveStory: false });
  if (filter.reprint) and.push({ isReprintOnly: true });
  if (filter.notReprint) and.push({ isReprintOnly: false });
  if (filter.otherOnlyTb) and.push({ hasOtherOnlyTb: true });
  if (filter.notOtherOnlyTb) and.push({ hasOtherOnlyTb: false });
  if (filter.noPrint) and.push({ hasPrintStory: false });
  if (filter.notNoPrint) and.push({ hasPrintStory: true });
  if (filter.onlyOnePrint) and.push({ hasOnlyOnePrint: true });
  if (filter.notOnlyOnePrint) and.push({ hasOnlyOnePrint: false });
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

  applyFormatsFilter(and, runtimeFilter);
  and.push(...buildReleaseDateWhereClauses(runtimeFilter.releasedates));
  applyVariantFilter(and, runtimeFilter);
  applyCollectedFilters(and, runtimeFilter);
  applyPublisherFilter(and, runtimeFilter);
  applySeriesFilter(and, runtimeFilter);
  applyGenresFilter(and, runtimeFilter);
  applyStoryFlagFilters(and, runtimeFilter);
  applyNumbersFilter(and, runtimeFilter);
  applyIndividualsFilter(and, runtimeFilter);

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

  applyDirectTermFilters(and, runtimeFilter);

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

const FORMAT_RANK_FALLBACK = 5;

const FORMAT_RANK_BY_NAME: Record<string, number> = {
  heft: 1,
  softcover: 2,
  taschenbuch: 3,
  hardcover: 4,
};

function formatRank(format: string | null | undefined): number {
  const normalized = (format || "").trim().toLocaleLowerCase("de-DE");
  return FORMAT_RANK_BY_NAME[normalized] ?? FORMAT_RANK_FALLBACK;
}

function groupKey(fkSeries: bigint | null, number: string): string {
  return `${fkSeries ?? "x"}::${number}`;
}

type GroupAwareCandidate = {
  id: bigint;
  fkSeries: bigint | null;
  number: string;
  format: string;
};

export function selectGroupRepresentatives(
  candidates: ReadonlyArray<GroupAwareCandidate>,
  ownedGroupKeys: ReadonlySet<string>
): GroupAwareCandidate[] {
  const byKey = new Map<string, GroupAwareCandidate>();
  for (const candidate of candidates) {
    const key = groupKey(candidate.fkSeries, candidate.number);
    if (ownedGroupKeys.has(key)) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, candidate);
      continue;
    }
    const candidateRank = formatRank(candidate.format);
    const existingRank = formatRank(existing.format);
    if (candidateRank < existingRank) {
      byKey.set(key, candidate);
    } else if (candidateRank === existingRank && Number(candidate.id) < Number(existing.id)) {
      byKey.set(key, candidate);
    }
  }
  return [...byKey.values()];
}

async function readGroupAwareUncollectedIssueIds(filter: Filter): Promise<number[]> {
  const { prisma } = await import("../prisma/client");

  const baseFilter = { ...filter } as RuntimeFilter;
  delete baseFilter.onlyNotCollectedNoOwnedVariants;
  delete baseFilter.onlyCollected;
  delete baseFilter.onlyNotCollected;

  const baseWhere = buildDirectIssueFilterWhere(baseFilter);
  if (!baseWhere) return [];

  const candidates = (await prisma.issue.findMany({
    where: { AND: [baseWhere, { collected: false }] },
    select: { id: true, fkSeries: true, number: true, format: true },
  })) as GroupAwareCandidate[];

  const ownedRows = await prisma.issue.findMany({
    where: {
      collected: true,
      series: { publisher: { original: Boolean(filter.us) } },
    },
    select: { fkSeries: true, number: true },
  });

  const ownedGroupKeys = new Set<string>();
  for (const row of ownedRows) {
    ownedGroupKeys.add(groupKey(row.fkSeries, row.number));
  }

  return selectGroupRepresentatives(candidates, ownedGroupKeys).map((candidate) =>
    Number(candidate.id)
  );
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

    if ((filter as RuntimeFilter).onlyNotCollectedNoOwnedVariants) {
      const filteredIssueIds = await readGroupAwareUncollectedIssueIds(filter);
      return {
        directIssueWhere: null,
        filteredIssueIds,
        filteredIssueIdsBigInt: filteredIssueIds.map(BigInt),
        initialFilterCount: filteredIssueIds.length,
      };
    }

    const directIssueWhere = buildDirectIssueFilterWhere(filter);
    if (!directIssueWhere) {
      return {
        directIssueWhere: null,
        filteredIssueIds: [],
        filteredIssueIdsBigInt: [],
        initialFilterCount: 0,
      };
    }

    const { prisma } = await import("../prisma/client");
    const initialFilterCount = await prisma.issue.count({ where: directIssueWhere });
    return {
      directIssueWhere,
      filteredIssueIds: null,
      filteredIssueIdsBigInt: null,
      initialFilterCount,
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
