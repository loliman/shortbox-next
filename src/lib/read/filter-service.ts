import { Prisma } from "@prisma/client";
import { readFilterIssues } from "./filter-service-read";
import type { Filter, NumberFilter } from "../../types/query-data";

const TRANSLATOR_STORY_INDIVIDUAL_TYPE = "TRANSLATOR";

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
  individuals?: Array<{ name?: string | null; type?: Array<string | null> | string | null } | null>;
  appearances?: Array<{ name?: string | null } | null> | string | null;
  realities?: Array<{ name?: string | null } | null> | string | null;
  arcs?: Array<{ title?: string | null } | null> | string | null;
  numbers?: Array<(NumberFilter & { variant?: string | null }) | null>;
};

type FilterIssueRecord = Prisma.IssueGetPayload<{
  include: Prisma.IssueInclude;
}>;

// Narrow shapes for the runtime-populated Prisma relations used in filter functions.
type AppearanceLinkShape = { appearance: { name: string } };
type IndividualLinkShape = { individual: { name: string }; type?: string | null };
type ArcLinkShape = { arc: { title: string } };
type IssueArcLinkShape = { arc: { title: string } };

type ChildStoryShape = {
  appearances?: AppearanceLinkShape[] | null;
};

type ParentIssueShape = {
  arcs?: ArcLinkShape[] | null;
};

type ParentStoryShape = {
  appearances?: AppearanceLinkShape[] | null;
  individuals?: IndividualLinkShape[] | null;
  issue?: ParentIssueShape | null;
};

type FilterStoryShape = {
  firstApp?: boolean | null;
  onlyApp?: boolean | null;
  onlyTb?: boolean | null;
  otherOnlyTb?: boolean | null;
  onlyOnePrint?: boolean | null;
  parent?: ParentStoryShape | null;
  appearances?: AppearanceLinkShape[] | null;
  individuals?: IndividualLinkShape[] | null;
  children?: ChildStoryShape[] | null;
};

function dedupeTerms(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter((value, index, allValues) => value.length > 0 && allValues.indexOf(value) === index);
}

function splitGenres(value: string | null | undefined): string[] {
  return readTextValue(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function matchesGenrePattern(genre: string, pattern: string): boolean {
  if (!pattern) return true;

  const parts = pattern
    .toLowerCase()
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (parts.length === 0) return true;

  const normalizedGenre = genre.toLowerCase();
  let index = 0;
  for (const part of parts) {
    const next = normalizedGenre.indexOf(part, index);
    if (next < 0) return false;
    index = next + part.length;
  }
  return true;
}

function splitFilterTerms(value: string | null | undefined): string[] {
  if (!value) return [];
  return dedupeTerms(value.split("||"));
}

function collectNamedTerms<T extends { name?: string | null }>(
  values: Array<T | null> | string | null | undefined
): string[] {
  if (Array.isArray(values)) {
    return dedupeTerms(
      values
        .map((value) => readTextValue(value?.name))
        .filter((value) => value.length > 0)
    );
  }

  return splitFilterTerms(values);
}

function collectTitleTerms<T extends { title?: string | null }>(
  values: Array<T | null> | string | null | undefined
): string[] {
  if (Array.isArray(values)) {
    return dedupeTerms(
      values
        .map((value) => readTextValue(value?.title))
        .filter((value) => value.length > 0)
    );
  }

  return splitFilterTerms(values);
}

function buildReleaseDateCondition(compare: string, parsedDate: Date): Prisma.IssueWhereInput {
  if (compare === ">=") {
    return {
      releaseDate: {
        gte: startOfDay(parsedDate),
      },
    };
  }

  if (compare === ">") {
    return {
      releaseDate: {
        gt: endOfDay(parsedDate),
      },
    };
  }

  if (compare === "<=") {
    return {
      releaseDate: {
        lte: endOfDay(parsedDate),
      },
    };
  }

  if (compare === "<") {
    return {
      releaseDate: {
        lt: startOfDay(parsedDate),
      },
    };
  }

  return {
    releaseDate: {
      gte: startOfDay(parsedDate),
      lte: endOfDay(parsedDate),
    },
  };
}

function containsInsensitive(haystack: string | null | undefined, needle: string): boolean {
  return readTextValue(haystack).toLocaleLowerCase("de-DE").includes(needle.toLocaleLowerCase("de-DE"));
}

function isNumericFilterValue(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim());
}

function parseFilterDate(raw: string | null | undefined): Date | null {
  const value = readTextValue(raw);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDayKey(date: Date | null | undefined): string | null {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function compareValues(left: string | number, right: string | number, compare: string): boolean {
  switch (compare) {
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    default:
      return left === right;
  }
}

function formatRank(format: string | null | undefined): number {
  switch ((format || "").trim().toLocaleLowerCase("de-DE")) {
    case "heft":
      return 1;
    case "softcover":
      return 2;
    case "taschenbuch":
      return 3;
    case "hardcover":
      return 4;
    default:
      return 5;
  }
}

function getStoryAppearanceNames(issue: FilterIssueRecord, us: boolean): string[] {
  const values = new Set<string>();
  for (const story of (issue.stories || []) as FilterStoryShape[]) {
    for (const link of story.appearances || []) values.add(link.appearance.name);
    for (const child of story.children || []) {
      for (const link of child.appearances || []) values.add(link.appearance.name);
    }
    if (!us && story.parent) {
      for (const link of story.parent.appearances || []) values.add(link.appearance.name);
    }
  }
  return [...values];
}

function getArcTitles(issue: FilterIssueRecord, us: boolean): string[] {
  const values = new Set<string>();
  if (us) {
    for (const link of (issue.arcs || []) as unknown as IssueArcLinkShape[]) values.add(link.arc.title);
    return [...values];
  }

  for (const story of (issue.stories || []) as FilterStoryShape[]) {
    if (!story.parent?.issue) continue;
    for (const link of story.parent.issue.arcs || []) values.add(link.arc.title);
  }
  return [...values];
}

function hasArcTerms(filter: RuntimeFilter): boolean {
  const arcTerms = Array.isArray(filter.arcs)
    ? filter.arcs
    : splitFilterTerms(filter.arcs as string | null | undefined);
  return Array.isArray(arcTerms) ? arcTerms.length > 0 : false;
}

function hasAppearanceTerms(filter: RuntimeFilter): boolean {
  const appearanceTerms = Array.isArray(filter.appearances)
    ? filter.appearances
    : splitFilterTerms(filter.appearances as string | null | undefined);
  return Array.isArray(appearanceTerms) ? appearanceTerms.length > 0 : false;
}

function hasRealityTerms(filter: RuntimeFilter): boolean {
  const realityTerms = collectNamedTerms(filter.realities);
  return realityTerms.length > 0;
}

function hasIndividualTerms(filter: RuntimeFilter): boolean {
  return Array.isArray(filter.individuals) && filter.individuals.length > 0;
}

function hasStorySwitchTerms(filter: RuntimeFilter): boolean {
  return !!(
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

function buildIssueIncludeForFilter(filter: RuntimeFilter): Prisma.IssueInclude {
  const include: Prisma.IssueInclude = {
    series: {
      include: {
        publisher: true,
      },
    },
  };
  const isUs = filter.us === true;
  const hasArcFilters = hasArcTerms(filter);
  const hasAppearanceFilters = hasAppearanceTerms(filter);
  const hasRealityFilters = hasRealityTerms(filter);
  const hasIndividualFilters = hasIndividualTerms(filter);
  const hasStorySwitchFilters = hasStorySwitchTerms(filter);

  const needsStoryGraph =
    hasStorySwitchFilters ||
    hasAppearanceFilters ||
    hasRealityFilters ||
    hasIndividualFilters ||
    (!isUs && hasArcFilters);

  if (isUs && hasArcFilters) {
    include.arcs = { include: { arc: true } };
  }

  if (needsStoryGraph) {
    include.stories = buildStoryInclude({
      isUs,
      hasArcFilters,
      hasAppearanceFilters,
      hasRealityFilters,
      hasIndividualFilters,
      hasStorySwitchFilters,
    });
  }

  return include;
}

function buildStoryInclude(input: {
  isUs: boolean;
  hasArcFilters: boolean;
  hasAppearanceFilters: boolean;
  hasRealityFilters: boolean;
  hasIndividualFilters: boolean;
  hasStorySwitchFilters: boolean;
}): Prisma.IssueInclude["stories"] {
  const includeAppearances = input.hasAppearanceFilters || input.hasRealityFilters;
  const includeParent = !input.isUs || input.hasStorySwitchFilters || input.hasIndividualFilters;
  const includeParentIssueArcs = !input.isUs && input.hasArcFilters;
  const includeParentAppearances = !input.isUs && includeAppearances;
  const includeParentIndividuals = !input.isUs && input.hasIndividualFilters;

  return {
    include: {
      appearances: includeAppearances ? { include: { appearance: true } } : false,
      individuals: input.hasIndividualFilters ? { include: { individual: true } } : false,
      parent: includeParent
        ? {
            include: {
              issue: includeParentIssueArcs ? { include: { arcs: { include: { arc: true } } } } : false,
              appearances: includeParentAppearances ? { include: { appearance: true } } : false,
              individuals: includeParentIndividuals ? { include: { individual: true } } : false,
            },
          }
        : false,
      children: includeAppearances
        ? { include: { appearances: { include: { appearance: true } } } }
        : false,
    },
  };
}

function matchesReleasedates(issue: FilterIssueRecord, releasedates: RuntimeFilter["releasedates"]): boolean {
  if (!releasedates || releasedates.length === 0) return true;
  const issueDay = toDayKey(issue.releaseDate);
  if (!issueDay) return false;

  return releasedates.every((entry) => {
    const filterDate = parseFilterDate(entry?.date);
    const filterDay = toDayKey(filterDate);
    if (!filterDay) return true;
    return compareValues(issueDay, filterDay, readTextValue(entry?.compare) || "=");
  });
}

function matchesNumbers(issue: FilterIssueRecord, numbers: RuntimeFilter["numbers"]): boolean {
  if (!numbers || numbers.length === 0) return true;

  return numbers.every((entry) => {
    const rawNumber = readTextValue(entry?.number);
    if (!rawNumber) return true;

    const compare = readTextValue(entry?.compare) || "=";
    const variant =
      entry && typeof entry === "object" && "variant" in entry
        ? readTextValue(entry.variant)
        : "";
    const hasVariant = variant.length > 0;

    const candidates = [issue.number, issue.legacyNumber || ""].filter((value) => value.trim().length > 0);
    const numeric = isNumericFilterValue(rawNumber);
    const matched = candidates.some((candidate) => {
      if (numeric && isNumericFilterValue(candidate)) {
        return compareValues(Number(candidate), Number(rawNumber), compare);
      }
      return compareValues(candidate, rawNumber, compare);
    });

    return matched && (!hasVariant || readTextValue(issue.variant) === variant);
  });
}

function matchesIndividualLinks(
  links: readonly IndividualLinkShape[],
  name: string,
  types: readonly string[]
) {
  return links.some(
    (link) =>
      link.individual.name === name &&
      (types.length === 0 || types.includes(readTextValue(link.type).toUpperCase()))
  );
}

function matchesIndividuals(issue: FilterIssueRecord, individuals: RuntimeFilter["individuals"]): boolean {
  if (!individuals || individuals.length === 0) return true;

  return individuals.every((entry) => {
    const name = readTextValue(entry?.name);
    if (!name) return true;

    let rawTypes: unknown[] = [];
    if (Array.isArray(entry?.type)) {
      rawTypes = entry.type;
    } else if (entry?.type) {
      rawTypes = [entry.type];
    }
    const normalizedTypes = dedupeTerms(
      rawTypes
        .filter((type): type is string => typeof type === "string")
        .map((type) => type.trim().toUpperCase())
        .filter((type) => type.length > 0)
    );
    const nonTranslatorTypes = normalizedTypes.filter((type) => type !== TRANSLATOR_STORY_INDIVIDUAL_TYPE);
    const includesTranslator = normalizedTypes.includes(TRANSLATOR_STORY_INDIVIDUAL_TYPE);

    return ((issue.stories || []) as FilterStoryShape[]).some((story) => {
      const storyIndividuals = story.individuals || [];
      const parentIndividuals = story.parent?.individuals || [];
      const matchesStory = (types: string[]) => matchesIndividualLinks(storyIndividuals, name, types);
      const matchesParent = (types: string[]) => matchesIndividualLinks(parentIndividuals, name, types);

      if (normalizedTypes.length === 0) return matchesStory([]) || matchesParent([]);
      if (includesTranslator && matchesStory([TRANSLATOR_STORY_INDIVIDUAL_TYPE])) return true;

      if (nonTranslatorTypes.length === 0) return false;
      if (matchesParent(nonTranslatorTypes)) return true;
      if (!story.parent && matchesStory(nonTranslatorTypes)) return true;
      return false;
    });
  });
}

function collectStorySwitchConditions(stories: FilterStoryShape[], filter: RuntimeFilter): boolean[] {
  const conditions: boolean[] = [];
  if (filter.firstPrint) conditions.push(stories.some((story) => story.firstApp));
  if (filter.notFirstPrint) conditions.push(stories.some((story) => !story.firstApp));
  if (filter.onlyPrint) conditions.push(stories.some((story) => story.onlyApp));
  if (filter.notOnlyPrint) conditions.push(stories.some((story) => !story.onlyApp));
  if (filter.onlyTb) conditions.push(stories.some((story) => story.onlyTb));
  if (filter.notOnlyTb) conditions.push(stories.some((story) => !story.onlyTb));
  if (filter.exclusive) conditions.push(stories.some((story) => !story.parent));
  if (filter.notExclusive) conditions.push(stories.some((story) => story.parent != null));
  if (filter.reprint) conditions.push(stories.length > 0 && stories.every((story) => !story.firstApp));
  if (filter.notReprint)
    conditions.push(stories.length === 0 || stories.some((story) => story.firstApp));
  if (filter.otherOnlyTb) conditions.push(stories.some((story) => story.otherOnlyTb));
  if (filter.notOtherOnlyTb) conditions.push(stories.some((story) => !story.otherOnlyTb));
  if (filter.noPrint)
    conditions.push(stories.length === 0 || stories.some((story) => !story.firstApp && !story.onlyApp));
  if (filter.notNoPrint)
    conditions.push(stories.some((story) => story.firstApp || story.onlyApp));
  if (filter.onlyOnePrint) conditions.push(stories.some((story) => story.onlyOnePrint));
  if (filter.notOnlyOnePrint) conditions.push(stories.some((story) => !story.onlyOnePrint));
  return conditions;
}

function matchesStorySwitches(issue: FilterIssueRecord, filter: RuntimeFilter): boolean {
  const stories = (issue.stories || []) as FilterStoryShape[];

  if (!stories.length) {
    if (filter.reprint) return false;
    if (filter.notReprint) return true;
    if (filter.noPrint) return true;
    if (filter.notNoPrint) return false;
  }

  const storyConditions = collectStorySwitchConditions(stories, filter);
  return storyConditions.length === 0 || storyConditions.some(Boolean);
}

function reduceOwnedVariantGroups(issues: FilterIssueRecord[]): FilterIssueRecord[] {
  const groups = new Map<string, FilterIssueRecord[]>();
  for (const issue of issues) {
    const key = `${issue.fkSeries ?? "x"}::${issue.number}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(issue);
    else groups.set(key, [issue]);
  }

  const reduced: FilterIssueRecord[] = [];
  for (const group of groups.values()) {
    if (group.some((issue) => issue.collected === true)) continue;
    const preferred = [...group].sort((left, right) => {
      const formatCompare = formatRank(left.format) - formatRank(right.format);
      if (formatCompare !== 0) return formatCompare;
      return Number(left.id) - Number(right.id);
    })[0];
    if (preferred) reduced.push(preferred);
  }
  return reduced;
}

export class FilterService {
  public async count(filter: Filter): Promise<number> {
    const issues = await this.getFilteredIssues(filter);
    return issues.length;
  }

  public async getFilteredIssueIds(filter: Filter): Promise<number[]> {
    const issues = await this.getFilteredIssues(filter);
    return issues.map((issue) => Number(issue.id));
  }

  private async getFilteredIssues(filter: Filter): Promise<FilterIssueRecord[]> {
    const runtimeFilter = filter as RuntimeFilter;
    const where = this.buildBaseWhere(runtimeFilter);
    const include = buildIssueIncludeForFilter(runtimeFilter);

    const issues = await readFilterIssues(where, include);

    const filtered = issues.filter((issue) => this.matchesIssue(issue, runtimeFilter));
    if (runtimeFilter.onlyNotCollectedNoOwnedVariants) {
      return reduceOwnedVariantGroups(filtered);
    }
    return filtered;
  }

  private buildBaseWhere(filter: RuntimeFilter): Prisma.IssueWhereInput {
    const and: Prisma.IssueWhereInput[] = [
      {
        series: {
          publisher: {
            original: filter.us === true,
          },
        },
      },
    ];

    const formats = (filter.formats || [])
      .map((format) => readTextValue(format))
      .filter((format) => format.length > 0);
    if (formats.length > 0) and.push({ format: { in: formats } });

    const releasedateConditions: Prisma.IssueWhereInput[] = [];
    for (const entry of filter.releasedates || []) {
      const parsedDate = parseFilterDate(entry?.date);
      if (!parsedDate) continue;
      const compare = readTextValue(entry?.compare) || "=";
      releasedateConditions.push(buildReleaseDateCondition(compare, parsedDate));
    }
    and.push(...releasedateConditions);

    if (filter.withVariants && !filter.onlyCollected) {
      and.push({
        NOT: {
          OR: [{ variant: null }, { variant: "" }],
        },
      });
    }

    if (filter.onlyCollected) and.push({ collected: true });
    if (filter.onlyNotCollected || filter.onlyNotCollectedNoOwnedVariants) and.push({ collected: false });

    const publisherNames = (filter.publishers || [])
      .map((publisher) => readTextValue(publisher?.name))
      .filter((name) => name.length > 0);
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

    const seriesConditions = (filter.series || [])
      .map((series) => {
        const title = readTextValue(series?.title);
        const volume = typeof series?.volume === "number" ? series.volume : null;
        if (!title || volume === null) return null;
        return {
          title,
          volume: BigInt(volume),
        };
      })
      .filter((entry): entry is { title: string; volume: bigint } => entry !== null);
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

    const genreTerms = Array.isArray(filter.genres)
      ? dedupeTerms(
          filter.genres
            .map((genre) => (typeof genre === "string" ? genre.trim() : ""))
            .filter((genre) => genre.length > 0)
        )
      : [];
    if (genreTerms.length > 0) {
      and.push({
        OR: genreTerms.map((genre) => ({
          series: {
            genre: {
              contains: genre,
              mode: "insensitive",
            },
          },
        })),
      });
    }

    if (filter.noComicguideId) {
      and.push({
        OR: [{ comicGuideId: null }, { comicGuideId: BigInt(0) }],
      });
    }

    if (filter.noContent) {
      and.push({
        stories: {
          none: {},
        },
      });
    }

    return and.length === 1 ? and[0] : { AND: and };
  }

  private matchesIssue(issue: FilterIssueRecord, filter: RuntimeFilter): boolean {
    if (!matchesReleasedates(issue, filter.releasedates)) return false;
    if (!matchesNumbers(issue, filter.numbers)) return false;
    if (!matchesIndividuals(issue, filter.individuals)) return false;
    if (!matchesStorySwitches(issue, filter)) return false;
    if (!matchesArcTerms(issue, filter)) return false;
    if (!matchesAppearanceAndRealityTerms(issue, filter)) return false;
    return matchesGenreTerms(issue, filter);
  }

}

function matchesArcTerms(issue: FilterIssueRecord, filter: RuntimeFilter) {
  const arcTerms = collectTitleTerms(filter.arcs);
  if (arcTerms.length === 0) return true;
  const arcTitles = getArcTitles(issue, filter.us === true);
  return arcTerms.every((term) => arcTitles.some((title) => containsInsensitive(title, term)));
}

function matchesAppearanceAndRealityTerms(issue: FilterIssueRecord, filter: RuntimeFilter) {
  const appearanceTerms = collectNamedTerms(filter.appearances);
  const realityTerms = collectNamedTerms(filter.realities);
  if (appearanceTerms.length === 0 && realityTerms.length === 0) return true;

  const appearanceNames = getStoryAppearanceNames(issue, filter.us === true);
  if (
    appearanceTerms.some(
      (term) => !appearanceNames.some((appearanceName) => containsInsensitive(appearanceName, term))
    )
  ) {
    return false;
  }

  return realityTerms.every((term) => {
    const marker = `(${term})`;
    return appearanceNames.some((appearanceName) => containsInsensitive(appearanceName, marker));
  });
}

function matchesGenreTerms(issue: FilterIssueRecord, filter: RuntimeFilter) {
  const genreTerms = Array.isArray(filter.genres)
    ? dedupeTerms(
        filter.genres
          .map((genre) => (typeof genre === "string" ? genre.trim() : ""))
          .filter((genre) => genre.length > 0)
      )
    : [];
  if (genreTerms.length === 0) return true;

  const issueGenres = splitGenres(issue.series?.genre);
  return genreTerms.every((term) =>
    issueGenres.some((genre) => matchesGenrePattern(genre, term))
  );
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}
