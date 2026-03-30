import { generatePublisherSlug, slugify } from "../slug-builder";
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

export type IssueSelectionCandidate = {
  number?: unknown;
  format?: unknown;
  variant?: unknown;
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

export function matchesIssueSelectionBySlug(
  candidate: IssueSelectionCandidate,
  selection: IssueSelectionInput
): boolean {
  if (normalizeText(candidate.number) !== normalizeText(selection.number)) return false;

  const expectedFormat = normalizeIssueOptionalString(selection.format);
  if (!areEquivalentBySlug(candidate.format, expectedFormat)) return false;

  const expectedVariant = normalizeIssueOptionalString(selection.variant);
  if (!areEquivalentBySlug(candidate.variant, expectedVariant)) return false;

  const candidateVolume = toPositiveInteger(candidate.series?.volume);
  if (candidateVolume !== toPositiveInteger(selection.volume)) return false;

  if (Boolean(candidate.series?.publisher?.original) !== Boolean(selection.us)) return false;

  const candidatePublisherSlug = generatePublisherSlug(String(candidate.series?.publisher?.name || ""));
  const expectedPublisherSlug = generatePublisherSlug(selection.publisher);
  if (candidatePublisherSlug !== expectedPublisherSlug) return false;

  return slugify(String(candidate.series?.title || "")) === slugify(selection.series);
}
