import type { Connection, Edge } from "../../types/query-data";
import type { Issue } from "../../types/domain";

type SortDirection = "asc" | "desc";

const ALLOWED_LAST_EDITED_SORT_FIELDS = new Set([
  "updatedat",
  "createdat",
  "number",
  "format",
  "variant",
  "title",
  "id",
  "releasedate",
  "series",
  "publisher",
]);

const ROMAN_NUMBER_PATTERN = /^(M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3}))$/i;
const FRACTION_NUMBER_PATTERN = /^(-?\d+)\s*\/\s*(\d+)$/;
const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:[.,]\d+)?$/;
const UNICODE_FRACTION_VALUES: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
};

const PARENS_PATTERN = /[()]/g;
const ALPHA_ONLY_PATTERN = /^[A-Z]+$/;

export function buildConnectionFromNodes<T>(nodes: T[]): Connection<T> {
  const edges: Array<Edge<T>> = nodes.map((node, index) => ({
    cursor: String(index),
    node,
  }));

  return {
    edges,
    pageInfo: {
      endCursor: edges.length > 0 ? edges.at(-1)?.cursor ?? null : null,
      hasNextPage: false,
    },
  };
}

export function normalizeSortField(field?: string | null) {
  const normalized = normalizeText(field).toLowerCase();
  return ALLOWED_LAST_EDITED_SORT_FIELDS.has(normalized) ? normalized : "updatedat";
}

export function normalizeSortDirection(direction?: string | null): SortDirection {
  return normalizeText(direction).toLowerCase() === "asc" ? "asc" : "desc";
}

export function normalizeText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}

function normalizeIssueNumberForSort(value: unknown) {
  return normalizeText(value)
    .replaceAll(PARENS_PATTERN, "")
    .replaceAll(/\s+/g, " ")
    .toUpperCase();
}

export function toOptionalText(value: unknown) {
  const normalized = normalizeText(value);
  return normalized === "" ? null : normalized;
}

function parseSortableIssueNumber(value: string): number | null {
  const trimmed = normalizeIssueNumberForSort(value);
  const unicodeFractionMatch = trimmed.match(/^(-?\d+)?\s*([¼½¾])$/);
  if (unicodeFractionMatch) {
    const whole = Number(unicodeFractionMatch[1] || 0);
    const fraction = UNICODE_FRACTION_VALUES[unicodeFractionMatch[2]];
    if (Number.isFinite(whole) && fraction != null) return whole + fraction;
  }

  const fractionMatch = trimmed.match(FRACTION_NUMBER_PATTERN);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
      return numerator / denominator;
    }
    return null;
  }

  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function fromRoman(value: string): number {
  const romans: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };
  const text = value.toUpperCase();
  let total = 0;
  for (let index = 0; index < text.length; index += 1) {
    const current = romans[text[index]] ?? 0;
    const next = romans[text[index + 1]] ?? 0;
    total += current < next ? -current : current;
  }
  return total;
}

function naturalCompare(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function getIssueFormatPriority(value: unknown): number {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "heft" || normalized === "mini heft") return 0;
  if (normalized === "softcover" || normalized === "sc") return 1;
  if (normalized === "hardcover" || normalized === "hc") return 2;
  if (normalized === "taschenbuch" || normalized === "tb") return 3;
  if (normalized === "album" || normalized === "album hardcover") return 4;
  if (normalized === "") return 6;
  return 5;
}

function getIssueNumberSortBucket(value: string): 0 | 1 | 2 | 3 {
  if (value !== "" && ROMAN_NUMBER_PATTERN.test(value)) return 0;
  if (value !== "" && ALPHA_ONLY_PATTERN.test(value)) return 1;
  if (parseSortableIssueNumber(value) != null) return 2;
  return 3;
}

export function pickCanonicalIssueTitle(
  issues: Array<{ title?: unknown }>,
  fallbackTitle: unknown
): string {
  const titles = issues
    .map((issue) => normalizeText(issue?.title))
    .filter((title) => title.length > 0);

  if (titles.length === 0) return normalizeText(fallbackTitle);

  return [...new Set(titles)].sort((left, right) =>
    left.localeCompare(right, "de-DE", { sensitivity: "base", numeric: true })
  )[0];
}

export function compareIssueNumber(leftRaw: unknown, rightRaw: unknown): number {
  const left = normalizeIssueNumberForSort(leftRaw);
  const right = normalizeIssueNumberForSort(rightRaw);
  const leftBucket = getIssueNumberSortBucket(left);
  const rightBucket = getIssueNumberSortBucket(right);

  if (leftBucket !== rightBucket) return leftBucket - rightBucket;

  const leftIsRoman = left !== "" && ROMAN_NUMBER_PATTERN.test(left);
  const rightIsRoman = right !== "" && ROMAN_NUMBER_PATTERN.test(right);

  if (leftIsRoman && rightIsRoman) return fromRoman(left) - fromRoman(right);

  const leftSortable = parseSortableIssueNumber(left);
  const rightSortable = parseSortableIssueNumber(right);
  if (leftSortable != null && rightSortable != null && leftSortable !== rightSortable) {
    return leftSortable - rightSortable;
  }

  return naturalCompare(left, right);
}

export function compareIssueVariants(
  left: { format?: string | null; variant?: string | null; id?: bigint | number | string | null },
  right: { format?: string | null; variant?: string | null; id?: bigint | number | string | null }
) {
  const leftFormat = normalizeText(left.format);
  const rightFormat = normalizeText(right.format);
  const leftVariant = normalizeText(left.variant);
  const rightVariant = normalizeText(right.variant);

  const formatPriorityCompare = getIssueFormatPriority(leftFormat) - getIssueFormatPriority(rightFormat);
  if (formatPriorityCompare !== 0) return formatPriorityCompare;

  const formatCompare = naturalCompare(leftFormat, rightFormat);
  if (formatCompare !== 0) return formatCompare;

  if (leftVariant === "" && rightVariant !== "") return -1;
  if (leftVariant !== "" && rightVariant === "") return 1;

  const variantCompare = naturalCompare(leftVariant, rightVariant);
  if (variantCompare !== 0) return variantCompare;

  return Number(left.id ?? 0) - Number(right.id ?? 0);
}

export function pickPreferredIssueVariant<
  T extends { format?: string | null; variant?: string | null; id?: bigint | number | string | null },
>(groupedIssues: T[]) {
  return [...groupedIssues].sort(compareIssueVariants)[0];
}

export function serializePreviewIssue(issue: {
  id: bigint;
  comicGuideId: bigint | null;
  number: string;
  legacyNumber: string | null;
  title: string | null;
  verified: boolean;
  collected: boolean | null;
  format: string | null;
  variant: string | null;
  covers: Array<{ url: string | null }>;
  stories: Array<{
    onlyApp: boolean;
    firstApp: boolean;
    otherOnlyTb: boolean;
    onlyOnePrint: boolean;
    onlyTb: boolean;
    collectedMultipleTimes: boolean;
    reprint: { id: bigint } | null;
    reprintedBy: Array<{ id: bigint }>;
    parent: {
      children: Array<{ id: bigint }>;
      collectedMultipleTimes: boolean;
    } | null;
    children: Array<{
      id: bigint;
      issue: { collected: boolean | null } | null;
    }>;
  }>;
  series: {
    title: string | null;
    volume: bigint;
    startYear: bigint;
    endYear: bigint | null;
    publisher: {
      name: string;
      original: boolean;
    } | null;
  } | null;
}): Issue {
  return {
    id: String(issue.id),
    comicguideid: issue.comicGuideId === null ? null : String(issue.comicGuideId),
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
    stories: issue.stories.map((story) => ({
      onlyapp: story.onlyApp,
      firstapp: story.firstApp,
      otheronlytb: story.otherOnlyTb,
      exclusive: !story.parent,
      onlyoneprint: story.onlyOnePrint,
      onlytb: story.onlyTb,
      reprintOf: story.reprint ? { id: String(story.reprint.id) } : null,
      reprints: story.reprintedBy.map((entry) => ({ id: String(entry.id) })),
      parent: story.parent
        ? {
            children: story.parent.children.map((entry) => ({ id: String(entry.id) })),
            collectedmultipletimes: story.parent.collectedMultipleTimes,
          }
        : null,
      children: story.children.map((entry) => ({
        id: String(entry.id),
        issue: entry.issue
          ? {
              number: "",
              collected: entry.issue.collected ?? null,
              series: {
                publisher: {},
              },
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
            : {
                name: null,
                us: null,
              },
        }
      : {
          title: null,
          volume: null,
          startyear: null,
          endyear: null,
          publisher: {
            name: null,
            us: null,
          },
        },
  };
}

export function serializeNavbarIssue(issue: {
  id: bigint;
  number: string;
  legacyNumber: string | null;
  title: string | null;
  format: string | null;
  variant: string | null;
  collected: boolean | null;
  series: {
    title: string | null;
    volume: bigint;
    publisher: {
      name: string;
      original: boolean;
    } | null;
  } | null;
  covers: Array<{ url: string | null }>;
}): Issue {
  return {
    id: String(issue.id),
    number: issue.number,
    legacy_number: issue.legacyNumber || null,
    title: issue.title || null,
    format: issue.format || null,
    variant: issue.variant || null,
    collected: issue.collected ?? null,
    cover: issue.covers[0]
      ? {
          url: issue.covers[0].url || null,
        }
      : null,
    series: issue.series
      ? {
          title: issue.series.title || null,
          volume: Number(issue.series.volume),
          publisher: issue.series.publisher
            ? {
                name: issue.series.publisher.name,
                us: issue.series.publisher.original,
              }
            : {
                name: null,
                us: null,
              },
        }
      : {
          title: null,
          volume: null,
          publisher: {
            name: null,
            us: null,
          },
        },
  };
}

export function sortLastEditedRows<
  T extends {
    id: bigint;
    fkSeries: bigint | null;
    number: string;
    title: string | null;
    format: string | null;
    variant: string | null;
    releaseDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    series: { title: string | null; volume: bigint; publisher: { name: string } | null } | null;
  },
>(rows: T[], field: string, direction: SortDirection) {
  const factor = direction === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    const compareValue = (() => {
      switch (field) {
        case "createdat":
          return (left.createdAt.getTime() - right.createdAt.getTime()) * factor;
        case "releasedate":
          return ((left.releaseDate?.getTime() ?? 0) - (right.releaseDate?.getTime() ?? 0)) * factor;
        case "number":
          return compareIssueNumber(left.number, right.number) * factor;
        case "format":
          return naturalCompare(normalizeText(left.format), normalizeText(right.format)) * factor;
        case "variant":
          return naturalCompare(normalizeText(left.variant), normalizeText(right.variant)) * factor;
        case "title":
          return naturalCompare(normalizeText(left.title), normalizeText(right.title)) * factor;
        case "id":
          return (Number(left.id) - Number(right.id)) * factor;
        default:
          return (left.updatedAt.getTime() - right.updatedAt.getTime()) * factor;
      }
    })();

    if (compareValue !== 0) return compareValue;

    if (field === "publisher") {
      const publisherCompare =
        naturalCompare(normalizeText(left.series?.publisher?.name), normalizeText(right.series?.publisher?.name)) *
        factor;
      if (publisherCompare !== 0) return publisherCompare;
    }

    if (field === "series" || field === "publisher") {
      const seriesCompare =
        naturalCompare(normalizeText(left.series?.title), normalizeText(right.series?.title)) * factor;
      if (seriesCompare !== 0) return seriesCompare;
      const volumeCompare = (Number(left.series?.volume ?? 0) - Number(right.series?.volume ?? 0)) * factor;
      if (volumeCompare !== 0) return volumeCompare;
    }

    return (Number(left.id) - Number(right.id)) * factor;
  });
}

export function normalizeIssueOptionalString(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return normalized === "" ? null : normalized;
}

export function serializeIssueDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function serializeIssueId(value: bigint | number | string) {
  return String(value);
}

export function serializeNullableIssueId(value: bigint | number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  return String(value);
}

export function serializeNullableIssueNumber(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

export function normalizeRecordString(value: unknown) {
  return normalizeText(value);
}

export function normalizeIssueReleaseDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}
