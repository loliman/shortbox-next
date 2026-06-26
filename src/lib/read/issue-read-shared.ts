import type { Connection, Edge } from "../../types/query-data";
import type { Issue } from "../../types/domain";

type SortDirection = "asc" | "desc";

type CoverReference = {
  cover?: { url?: string | null } | null;
  comicguideid?: string | number | null;
};

const ALLOWED_LAST_EDITED_SORT_FIELDS = new Set([
  "updatedat",
  "createdat",
  "number",
  "format",
  "variant",
  "title",
  "id",
  "releasedate",
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
  const unicodeFractionMatch = /^(-?\d+)?\s*([¼½¾])$/.exec(trimmed);
  if (unicodeFractionMatch) {
    const whole = Number(unicodeFractionMatch[1] || 0);
    const fraction = UNICODE_FRACTION_VALUES[unicodeFractionMatch[2]];
    if (Number.isFinite(whole) && fraction != null) return whole + fraction;
  }

  const fractionMatch = FRACTION_NUMBER_PATTERN.exec(trimmed);
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

/**
 * Comparable shape for Variant rows.
 * Accepts both `variantLabel` (Prisma model) and `variant` (UI/legacy shapes).
 */
type IssueVariantComparable = {
  format?: string | null;
  /** Prisma model field name */
  variantLabel?: string | null;
  /** Legacy UI shape field name – used as fallback if variantLabel is absent */
  variant?: string | null;
  id?: bigint | number | string | null;
};

function resolveVariantLabel(v: IssueVariantComparable): string {
  // Prefer variantLabel (Prisma field), fall back to variant (UI shape)
  if (v.variantLabel !== undefined) return normalizeText(v.variantLabel);
  return normalizeText(v.variant);
}

export function compareIssueVariants(
  left: IssueVariantComparable,
  right: IssueVariantComparable
) {
  const leftFormat = normalizeText(left.format);
  const rightFormat = normalizeText(right.format);
  const leftVariant = resolveVariantLabel(left);
  const rightVariant = resolveVariantLabel(right);

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
  T extends { format?: string | null; variantLabel?: string | null; variant?: string | null; id?: bigint | number | string | null },
>(groupedVariants: T[]) {
  return [...groupedVariants].sort(compareIssueVariants)[0];
}

/**
 * @deprecated Stories are always on Issue now. Use issue.stories directly.
 * Kept for call sites not yet migrated.
 */
export function pickIssuePreviewStorySource<
  T extends {
    stories?: Array<unknown> | null;
    format?: string | null;
    variantLabel?: string | null;
    variant?: string | null;
    id?: bigint | number | string | null;
  },
>(groupedIssues: T[], currentIssue?: T | null): T | null {
  if (currentIssue && Array.isArray(currentIssue.stories) && currentIssue.stories.length > 0) {
    return currentIssue;
  }
  const storyBearingVariant = [...groupedIssues]
    .sort(compareIssueVariants)
    .find((issue) => Array.isArray(issue.stories) && issue.stories.length > 0);

  return storyBearingVariant ?? currentIssue ?? groupedIssues[0] ?? null;
}

function serializeCoverReference(variant: {
  comicGuideId?: bigint | number | string | null;
  covers?: Array<{ url?: string | null }> | null;
} | null | undefined): CoverReference | null {
  if (!variant) return null;

  const comicGuideId = variant.comicGuideId == null ? null : String(variant.comicGuideId);
  const coverUrl = variant.covers?.[0]?.url || null;
  if (!coverUrl && !comicGuideId) return null;

  return {
    comicguideid: comicGuideId,
    cover: coverUrl ? { url: coverUrl } : null,
  };
}

export function pickFirstOriginalStoryCoverReference(stories: Array<{
  parent?: {
    issue?: {
      preferredCoverUrl?: string | null;
      preferredVariantId?: bigint | null;
      variants?: Array<{
        format?: string | null;
        variantLabel?: string | null;
        comicGuideId?: bigint | number | string | null;
        covers?: Array<{ url?: string | null }> | null;
      }> | null;
    } | null;
  } | null;
  reprint?: {
    issue?: {
      preferredCoverUrl?: string | null;
      preferredVariantId?: bigint | null;
      variants?: Array<{
        format?: string | null;
        variantLabel?: string | null;
        comicGuideId?: bigint | number | string | null;
        covers?: Array<{ url?: string | null }> | null;
      }> | null;
    } | null;
  } | null;
} | null> | null | undefined): CoverReference | null {
  for (const story of stories || []) {
    const parentIssue = story?.parent?.issue ?? story?.reprint?.issue ?? null;
    if (!parentIssue) continue;

    if (parentIssue.preferredCoverUrl !== undefined && parentIssue.preferredCoverUrl !== null) {
      return {
        comicguideid: null,
        cover: { url: parentIssue.preferredCoverUrl }
      };
    }

    const preferredVariant = parentIssue.variants
      ? [...parentIssue.variants].sort(compareIssueVariants)[0]
      : null;
    const originalReference = serializeCoverReference(preferredVariant);
    const coverUrl = normalizeText(originalReference?.cover?.url);
    const comicGuideId = normalizeText(originalReference?.comicguideid);
    if (coverUrl || comicGuideId) return originalReference;
  }

  return null;
}

/**
 * Serializes an Issue + its preferred Variant into the legacy Issue UI shape.
 * The preferred variant is the first after sorting by compareIssueVariants.
 */
export function serializePreviewIssue(issue: {
  id: bigint;
  number: string;
  legacyNumber: string | null;
  title: string | null;
  preferredVariantId?: bigint | null;
  preferredCoverUrl?: string | null;
  preferredFormat?: string | null;
  preferredVariantLabel?: string | null;
  notOwnedUsMaterial?: boolean;
  variants: Array<{
    id: bigint;
    format: string;
    variantLabel: string | null;
    comicGuideId: bigint | null;
    verified: boolean;
    collected: boolean | null;
    covers?: Array<{ url: string | null }>;
  }>;
  stories: Array<{
    onlyApp: boolean;
    firstApp: boolean;
    firstCompleteApp: boolean;
    firstPartialApp: boolean;
    otherOnlyTb: boolean;
    onlyOnePrint: boolean;
    onlyTb: boolean;
    collectedMultipleTimes: boolean;
    reprint: {
      id: bigint;
      issue?: {
        id: bigint;
        preferredCoverUrl?: string | null;
        preferredVariantId?: bigint | null;
        variants?: Array<{ comicGuideId: bigint | null; covers: Array<{ url: string | null }> }> | null;
      } | null;
    } | null;
    reprintedBy: Array<{ id: bigint }>;
    parent: {
      issue?: {
        id: bigint;
        preferredCoverUrl?: string | null;
        preferredVariantId?: bigint | null;
        variants?: Array<{ comicGuideId: bigint | null; covers: Array<{ url: string | null }> }> | null;
      } | null;
      children: Array<{ id: bigint }>;
      collectedMultipleTimes: boolean;
    } | null;
    children: Array<{
      id: bigint;
      issue: { variants?: Array<{ collected: boolean | null }> | null } | null;
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
  const preferredVariant = pickPreferredIssueVariant(issue.variants) ?? null;
  const stories = Array.isArray(issue.stories) ? issue.stories : [];
  const originalStoryCover = pickFirstOriginalStoryCoverReference(stories);

  const format = issue.preferredFormat !== undefined && issue.preferredFormat !== null ? issue.preferredFormat : (preferredVariant?.format || null);
  const variant = issue.preferredVariantLabel !== undefined && issue.preferredVariantLabel !== null ? issue.preferredVariantLabel : (preferredVariant?.variantLabel || null);
  const coverUrl = issue.preferredCoverUrl !== undefined && issue.preferredCoverUrl !== null ? issue.preferredCoverUrl : (preferredVariant?.covers?.[0]?.url || null);

  return {
    id: String(issue.id),
    comicguideid: preferredVariant?.comicGuideId == null ? null : String(preferredVariant.comicGuideId),
    number: issue.number,
    legacy_number: issue.legacyNumber || null,
    title: issue.title || null,
    verified: preferredVariant?.verified ?? false,
    collected: preferredVariant?.collected ?? null,
    notOwnedUsMaterial: issue.notOwnedUsMaterial ?? false,
    format,
    variant,
    cover: coverUrl
      ? {
          url: coverUrl,
        }
      : null,
    originalStoryCover,
    stories: stories.map((story) => ({
      onlyapp: story.onlyApp,
      firstapp: story.firstApp,
      firstCompleteApp: story.firstCompleteApp,
      firstPartialApp: story.firstPartialApp,
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
              collected: entry.issue.variants?.[0]?.collected ?? null,
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
  variants: Array<{
    id: bigint;
    format: string;
    variantLabel: string | null;
    collected: boolean | null;
    covers: Array<{ url: string | null }>;
  }>;
  series: {
    title: string | null;
    volume: bigint;
    publisher: {
      name: string;
      original: boolean;
    } | null;
  } | null;
}): Issue {
  const preferredVariant = pickPreferredIssueVariant(issue.variants) ?? null;

  return {
    id: String(issue.id),
    number: issue.number,
    legacy_number: issue.legacyNumber || null,
    title: issue.title || null,
    format: preferredVariant?.format || null,
    variant: preferredVariant?.variantLabel || null,
    collected: preferredVariant?.collected ?? null,
    cover: preferredVariant?.covers[0]
      ? {
          url: preferredVariant.covers[0].url || null,
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
    createdAt: Date;
    updatedAt: Date;
    series: { title: string | null; volume: bigint; publisher: { name: string } | null } | null;
    variants: Array<{
      format: string;
      variantLabel: string | null;
      releaseDate: Date | null;
    }>;
  },
>(rows: T[], field: string, direction: SortDirection) {
  const factor = direction === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    const leftVariant = pickPreferredIssueVariant(left.variants);
    const rightVariant = pickPreferredIssueVariant(right.variants);

    const compareValue = (() => {
      switch (field) {
        case "createdat":
          return (left.createdAt.getTime() - right.createdAt.getTime()) * factor;
        case "releasedate": {
          const leftDate = leftVariant?.releaseDate?.getTime() ?? 0;
          const rightDate = rightVariant?.releaseDate?.getTime() ?? 0;
          return (leftDate - rightDate) * factor;
        }
        case "number":
          return compareIssueNumber(left.number, right.number) * factor;
        case "format":
          return naturalCompare(normalizeText(leftVariant?.format), normalizeText(rightVariant?.format)) * factor;
        case "variant":
          return naturalCompare(normalizeText(leftVariant?.variantLabel), normalizeText(rightVariant?.variantLabel)) * factor;
        case "title":
          return naturalCompare(normalizeText(left.title), normalizeText(right.title)) * factor;
        case "id":
          return (Number(left.id) - Number(right.id)) * factor;
        default:
          return (left.updatedAt.getTime() - right.updatedAt.getTime()) * factor;
      }
    })();

    if (compareValue !== 0) return compareValue;

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

export const serializeIssueId: (value: bigint | number | string) => string = String;

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
