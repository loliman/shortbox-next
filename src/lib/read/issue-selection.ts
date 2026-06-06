import { generatePublisherSlug, generateSeriesSlug, slugify } from "../slug-builder";
import { normalizeIssueOptionalString, normalizeText } from "./issue-read-shared";

export type IssueSelectionInput = {
  us: boolean;
  publisher: string;
  series: string;
  volume: number;
  startyear?: number | null;
  number: string;
  format?: string | null;
  variant?: string | null;
};

/**
 * Candidate shape for Issue-level matching (series, number, publisher, volume).
 * Variants (format + variantLabel) are on the nested variants array.
 */
export type IssueSelectionCandidate = {
  number?: unknown;
  variants?: Array<{
    format?: unknown;
    variantLabel?: unknown;
  }> | null;
  series?: {
    title?: unknown;
    volume?: unknown;
    startYear?: unknown;
    publisher?: {
      name?: unknown;
      original?: unknown;
    } | null;
  } | null;
};

function toPositiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function areEquivalentBySlug(left: unknown, right: unknown): boolean {
  const leftText = normalizeText(left);
  const rightText = normalizeText(right);
  if (leftText === "" && rightText === "") return true;
  return slugify(leftText) === slugify(rightText);
}

export function hasExplicitIssueVariantSelection(selection: IssueSelectionInput): boolean {
  return (
    normalizeText(normalizeIssueOptionalString(selection.format)) !== "" ||
    normalizeText(normalizeIssueOptionalString(selection.variant)) !== ""
  );
}

/**
 * Checks whether an Issue candidate matches the selection's series/number/publisher context.
 * Format + variant matching is done against issue.variants (see matchesVariantBySlug).
 */
export function matchesIssueSelectionBySlug(
  candidate: IssueSelectionCandidate,
  selection: IssueSelectionInput
): boolean {
  if (normalizeText(candidate.number) !== normalizeText(selection.number)) return false;

  const candidateVolume = toPositiveInteger(candidate.series?.volume);
  if (candidateVolume !== toPositiveInteger(selection.volume)) return false;

  if (Boolean(candidate.series?.publisher?.original) !== Boolean(selection.us)) return false;

  const candidatePublisherSlug = generatePublisherSlug(readTextValue(candidate.series?.publisher?.name));
  const expectedPublisherSlug = generatePublisherSlug(selection.publisher);
  if (candidatePublisherSlug !== expectedPublisherSlug) return false;

  const expectedStartYear = toPositiveInteger(selection.startyear);
  const candidateStartYear = toPositiveInteger(candidate.series?.startYear);

  if (expectedStartYear !== null) {
    const candidateSeriesSlug = generateSeriesSlug(
      readTextValue(candidate.series?.title),
      candidateStartYear,
      candidateVolume
    );
    const expectedSeriesSlug = generateSeriesSlug(
      selection.series,
      expectedStartYear,
      selection.volume
    );
    return candidateSeriesSlug === expectedSeriesSlug;
  }

  return slugify(readTextValue(candidate.series?.title)) === slugify(selection.series);
}

/**
 * Checks whether any variant in the candidate matches the format + variantLabel
 * from the URL selection. Returns the matched variant or null.
 */
export function matchVariantBySlug(
  candidate: IssueSelectionCandidate,
  selection: IssueSelectionInput
): { format?: unknown; variantLabel?: unknown } | null {
  if (!hasExplicitIssueVariantSelection(selection)) {
    // No explicit variant in URL – return the first variant as default
    return candidate.variants?.[0] ?? null;
  }

  const expectedFormat = normalizeIssueOptionalString(selection.format);
  const expectedVariant = normalizeIssueOptionalString(selection.variant);

  return (
    candidate.variants?.find(
      (v) =>
        areEquivalentBySlug(v.format, expectedFormat) &&
        areEquivalentBySlug(v.variantLabel, expectedVariant)
    ) ?? null
  );
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}
