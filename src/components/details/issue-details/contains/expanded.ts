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

export function expanded(item: ItemLike, query?: QueryParams): boolean {
  if (hasExpandNumberMatch(item, query)) {
    return true;
  }

  const filter = query?.filter;
  if (!filter) return false;

  let currentFilter: ExpandedFilter | null = null;
  try {
    const parsed = JSON.parse(filter) as ExpandedFilter;
    currentFilter = parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return false;
  }
  if (!currentFilter) return false;

  const compare = item?.parent ? item.parent : item;
  const compareIssue = resolveIssue(compare);
  const compareIndividuals = toArray<PersonLike>(compare?.individuals);
  const compareAppearances = toArray<AppearanceLike>(compare?.appearances);
  const compareArcs = toArray<{ title?: string | null }>(compareIssue?.arcs);
  const itemIndividuals = toArray<PersonLike>(item?.individuals);
  const filterIndividuals = toArray<PersonLike>(currentFilter.individuals);

  let isExpanded = false;
  isExpanded = (currentFilter.onlyPrint && Boolean(item?.onlyapp)) || isExpanded;
  isExpanded = (currentFilter.firstPrint && Boolean(item?.firstapp)) || isExpanded;
  isExpanded = (currentFilter.otherOnlyTb && Boolean(item?.otheronlytb)) || isExpanded;
  isExpanded = (currentFilter.onlyTb && Boolean(item?.onlytb)) || isExpanded;
  isExpanded = (currentFilter.onlyOnePrint && Boolean(item?.onlyoneprint)) || isExpanded;
  isExpanded = (currentFilter.exclusive && Boolean(item?.exclusive)) || isExpanded;
  isExpanded = (currentFilter.noPrint && toArray(item?.children).length === 0) || isExpanded;

  if (compareIssue?.series) {
    const filterSeries = toArray<SeriesLike>(currentFilter.series);
    if (
      filterSeries.some((series) => {
        return (
          compareIssue.series?.title === series.title &&
          String(compareIssue.series?.volume) === String(series.volume) &&
          compareIssue.series?.publisher?.name === series.publisher?.name
        );
      })
    ) {
      isExpanded = true;
    }

    const filterPublishers = toArray<{ name?: string }>(currentFilter.publishers);
    if (
      filterPublishers.some((publisher) => compareIssue.series?.publisher?.name === publisher?.name)
    ) {
      isExpanded = true;
    }

    if (
      currentFilter.publisher?.name &&
      compareIssue.series?.publisher?.name === currentFilter.publisher.name
    ) {
      isExpanded = true;
    }
  }

  if (compareIssue?.number !== undefined) {
    const filterNumbers = toArray(currentFilter.numbers);
    for (const number of filterNumbers) {
      if (!number || number.number === undefined || !number.compare) continue;

      const comparison = compareIssueNumbers(String(compareIssue.number), String(number.number));

      if (
        (number.compare === "=" && comparison === 0) ||
        (number.compare === ">" && comparison > 0) ||
        (number.compare === "<" && comparison < 0) ||
        (number.compare === ">=" && comparison >= 0) ||
        (number.compare === "<=" && comparison <= 0)
      ) {
        isExpanded = true;
      }
    }
  }

  if (item?.__typename === "Story") {
    const selectedArcs = readTitles((currentFilter as { arcs?: unknown }).arcs);
    if (
      selectedArcs.length > 0 &&
      compareArcs.some((arc) => selectedArcs.includes(readTextValue(arc?.title)))
    ) {
      isExpanded = true;
    }

    if (hasMatchingIndividual(filterIndividuals, compareIndividuals)) {
      isExpanded = true;
    }

    const selectedAppearances = readNames((currentFilter as { appearances?: unknown }).appearances);
    if (
      selectedAppearances.length > 0 &&
      compareAppearances.some((appearance) =>
        selectedAppearances.includes(readTextValue(appearance?.name))
      )
    ) {
      isExpanded = true;
    }
  } else if (item?.__typename === "Cover") {
    if (hasMatchingIndividual(filterIndividuals, itemIndividuals)) {
      isExpanded = true;
    }
  }

  return isExpanded;
}

export function hasExpandNumberMatch(item: ItemLike, query?: QueryParams): boolean {
  const expandValue = readExpandedText(query?.expand);
  if (!expandValue) return false;

  const itemNumber = readExpandedText(item?.number);
  if (itemNumber) {
    return itemNumber === expandValue;
  }

  const parentNumber = readExpandedText(item?.parent?.number);
  return parentNumber !== "" && parentNumber === expandValue;
}

function readExpandedText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
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
