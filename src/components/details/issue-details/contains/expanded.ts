import { compareIssueNumbers } from "../utils/issueDetailsUtils";

export type QueryParams = {
  expand?: string;
  filter?: string;
} | null;

type SeriesLike = {
  title?: string;
  volume?: string | number;
  publisher?: { name?: string };
};

type IssueLike = {
  number?: string | number;
  series?: SeriesLike;
  arcs?: Array<{ title?: string | null }> | null;
};

type PersonLike = { name?: string; type?: string | string[] };
type AppearanceLike = { name?: string };

export type ItemLike = {
  __typename?: string;
  number?: string | number;
  onlyapp?: boolean;
  firstapp?: boolean;
  otheronlytb?: boolean;
  onlytb?: boolean;
  onlyoneprint?: boolean;
  exclusive?: boolean;
  children?: unknown[] | null;
  parent?: ItemLike | null;
  issue?: IssueLike | null;
  individuals?: PersonLike[] | null;
  appearances?: AppearanceLike[] | null;
};

type ExpandedFilter = {
  onlyPrint?: boolean;
  firstPrint?: boolean;
  otherOnlyTb?: boolean;
  onlyTb?: boolean;
  onlyOnePrint?: boolean;
  exclusive?: boolean;
  noPrint?: boolean;
  series?: SeriesLike[];
  publishers?: Array<{ name?: string }>;
  publisher?: { name?: string };
  numbers?: Array<{ compare?: "=" | ">" | "<" | ">=" | "<="; number?: string | number }>;
  arcs?: Array<{ title?: string }>;
  individuals?: PersonLike[];
  appearances?: Array<{ name?: string }>;
};

function readTitles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => readTextValue((entry as { title?: unknown })?.title))
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function readNames(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => readTextValue((entry as { name?: unknown })?.name))
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function parseExpandedFilter(filter: string): ExpandedFilter | null {
  try {
    const parsed = JSON.parse(filter) as ExpandedFilter;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function resolveExpandedComparisonItem(item: ItemLike): ItemLike {
  return item.parent ?? item;
}

function matchesFlagFilters(item: ItemLike, filter: ExpandedFilter): boolean {
  return Boolean(
    (filter.onlyPrint && item.onlyapp) ||
      (filter.firstPrint && item.firstapp) ||
      (filter.otherOnlyTb && item.otheronlytb) ||
      (filter.onlyTb && item.onlytb) ||
      (filter.onlyOnePrint && item.onlyoneprint) ||
      (filter.exclusive && item.exclusive) ||
      (filter.noPrint && toArray(item.children).length === 0)
  );
}

function matchesSeriesFilters(compareIssue: IssueLike, filter: ExpandedFilter): boolean {
  if (!compareIssue.series) return false;

  const filterSeries = toArray<SeriesLike>(filter.series);
  if (
    filterSeries.some((series) => {
      return (
        compareIssue.series?.title === series.title &&
        String(compareIssue.series?.volume) === String(series.volume) &&
        compareIssue.series?.publisher?.name === series.publisher?.name
      );
    })
  ) {
    return true;
  }

  const filterPublishers = toArray<{ name?: string }>(filter.publishers);
  if (filterPublishers.some((publisher) => compareIssue.series?.publisher?.name === publisher?.name)) {
    return true;
  }

  return Boolean(
    filter.publisher?.name && compareIssue.series?.publisher?.name === filter.publisher.name
  );
}

function matchesNumberFilters(compareIssue: IssueLike, filter: ExpandedFilter): boolean {
  if (compareIssue.number === undefined) return false;

  const filterNumbers = toArray(filter.numbers);
  return filterNumbers.some((number) => {
    if (!number || number.number === undefined || !number.compare) return false;

    const comparison = compareIssueNumbers(String(compareIssue.number), String(number.number));
    return (
      (number.compare === "=" && comparison === 0) ||
      (number.compare === ">" && comparison > 0) ||
      (number.compare === "<" && comparison < 0) ||
      (number.compare === ">=" && comparison >= 0) ||
      (number.compare === "<=" && comparison <= 0)
    );
  });
}

function matchesStoryFilters(
  item: ItemLike,
  filter: ExpandedFilter,
  compareIndividuals: PersonLike[],
  compareAppearances: AppearanceLike[],
  compareArcs: Array<{ title?: string | null }>
): boolean {
  if (item.__typename !== "Story") return false;

  const selectedArcs = readTitles(filter.arcs);
  if (
    selectedArcs.length > 0 &&
    compareArcs.some((arc) => selectedArcs.includes(readTextValue(arc?.title)))
  ) {
    return true;
  }

  const filterIndividuals = toArray<PersonLike>(filter.individuals);
  if (hasMatchingIndividual(filterIndividuals, compareIndividuals)) {
    return true;
  }

  const selectedAppearances = readNames(filter.appearances);
  return (
    selectedAppearances.length > 0 &&
    compareAppearances.some((appearance) =>
      selectedAppearances.includes(readTextValue(appearance?.name))
    )
  );
}

function matchesCoverFilters(item: ItemLike, filter: ExpandedFilter): boolean {
  if (item.__typename !== "Cover") return false;

  const itemIndividuals = toArray<PersonLike>(item.individuals);
  const filterIndividuals = toArray<PersonLike>(filter.individuals);
  return hasMatchingIndividual(filterIndividuals, itemIndividuals);
}

export function expanded(item: ItemLike, query?: QueryParams): boolean {
  if (hasExpandNumberMatch(item, query)) {
    return true;
  }

  const filter = query?.filter;
  if (!filter) return false;

  const currentFilter = parseExpandedFilter(filter);
  if (!currentFilter) return false;

  const compare = resolveExpandedComparisonItem(item);
  const compareIssue = resolveIssue(compare);
  const compareIndividuals = toArray<PersonLike>(compare?.individuals);
  const compareAppearances = toArray<AppearanceLike>(compare?.appearances);
  const compareArcs = toArray<{ title?: string | null }>(compareIssue?.arcs);

  return (
    matchesFlagFilters(item, currentFilter) ||
    (compareIssue ? matchesSeriesFilters(compareIssue, currentFilter) : false) ||
    (compareIssue ? matchesNumberFilters(compareIssue, currentFilter) : false) ||
    matchesStoryFilters(item, currentFilter, compareIndividuals, compareAppearances, compareArcs) ||
    matchesCoverFilters(item, currentFilter)
  );
}

export function hasExpandNumberMatch(item: ItemLike, query?: QueryParams): boolean {
  const expandValue = readTextValue(query?.expand);
  if (!expandValue) return false;

  const itemNumber = readTextValue(item?.number);
  if (itemNumber) {
    return itemNumber === expandValue;
  }

  const parentNumber = readTextValue(item?.parent?.number);
  return parentNumber !== "" && parentNumber === expandValue;
}

function resolveIssue(item: ItemLike | null | undefined): IssueLike | null {
  if (!item) return null;
  if (item.issue) return item.issue;

  const asIssue = item as IssueLike;
  if (asIssue.series && asIssue.number !== undefined) return asIssue;

  return null;
}

function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function hasMatchingIndividual(selected: PersonLike[], available: PersonLike[]): boolean {
  return selected.some((individual) => {
    const selectedName = normalizeText(individual?.name);
    if (!selectedName) return false;
    const selectedTypes = normalizeTypes(individual?.type);

    return available.some((candidate) => {
      if (normalizeText(candidate?.name) !== selectedName) return false;

      const candidateTypes = normalizeTypes(candidate?.type);
      if (selectedTypes.size === 0 || candidateTypes.size === 0) return true;

      for (const type of selectedTypes) {
        if (candidateTypes.has(type)) return true;
      }
      return false;
    });
  });
}

function normalizeText(value: unknown): string {
  return readTextValue(value).toLowerCase();
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}

function normalizeTypes(value: unknown): Set<string> {
  if (Array.isArray(value)) {
    return new Set(value.map((entry) => normalizeText(entry)).filter((entry) => entry.length > 0));
  }
  const single = normalizeText(value);
  return single ? new Set([single]) : new Set();
}
