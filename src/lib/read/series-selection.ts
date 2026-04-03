import { generatePublisherSlug, generateSeriesSlug, slugify } from "../slug-builder";

export type SeriesSelectionInput = {
  us: boolean;
  publisher: string;
  series: string;
  volume: number;
  startyear?: number | null;
};

type SeriesSelectionCandidate = {
  title?: unknown;
  volume?: unknown;
  startYear?: unknown;
  startyear?: unknown;
  publisher?: {
    name?: unknown;
    original?: unknown;
    us?: unknown;
  } | null;
};

function toPositiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function matchesSeriesSelectionBySlug(
  candidate: SeriesSelectionCandidate,
  selection: SeriesSelectionInput
): boolean {
  const candidateVolume = toPositiveInteger(candidate.volume);
  if (candidateVolume !== toPositiveInteger(selection.volume)) return false;
  const candidatePublisherUs =
    candidate.publisher?.original ?? candidate.publisher?.us ?? null;
  if (Boolean(candidatePublisherUs) !== Boolean(selection.us)) return false;

  const candidatePublisherSlug = generatePublisherSlug(String(candidate.publisher?.name ?? ""));
  const expectedPublisherSlug = generatePublisherSlug(selection.publisher);
  if (candidatePublisherSlug !== expectedPublisherSlug) return false;

  const expectedStartYear = toPositiveInteger(selection.startyear);
  const candidateStartYear = toPositiveInteger(candidate.startYear ?? candidate.startyear);

  if (expectedStartYear !== null) {
    const candidateSeriesSlug = generateSeriesSlug(
      String(candidate.title ?? ""),
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

  return slugify(String(candidate.title ?? "")) === slugify(selection.series);
}
