import { slugify } from "../slug-builder";

function normalizeNavigationVolume(value: unknown): string {
  const numericVolume = Number(value ?? 0);
  return Number.isFinite(numericVolume) ? String(numericVolume) : "";
}

function normalizeNavigationStartYear(value: unknown): string {
  const numericStartYear = Number(value ?? 0);
  return Number.isFinite(numericStartYear) && numericStartYear > 0 ? String(numericStartYear) : "";
}

export function getNavigationSeriesKey(input: {
  publisher?: string | null;
  title?: string | null;
  volume?: number | string | null;
  startyear?: number | string | null;
}) {
  const parts = [
    slugify(String(input.publisher || "")),
    slugify(String(input.title || "")),
    normalizeNavigationVolume(input.volume),
  ];
  const startyear = normalizeNavigationStartYear(input.startyear);
  if (startyear) parts.push(startyear);
  return parts.join("|");
}

export function parseNavigationSeriesKey(seriesKey: string) {
  if (typeof seriesKey !== "string") return null;

  const rawParts = seriesKey.split("|");
  if (rawParts.length < 3) return null;

  const publisher = rawParts[0] || "";
  let volume = rawParts[rawParts.length - 1] || "";
  let startyear = "";
  let title = rawParts.slice(1, -1).join("|");

  const maybeVolume = rawParts[rawParts.length - 2] || "";
  const maybeStartYear = rawParts[rawParts.length - 1] || "";
  const hasExplicitStartYear =
    rawParts.length >= 4 &&
    normalizeNavigationVolume(maybeVolume) !== "" &&
    normalizeNavigationStartYear(maybeStartYear) !== "";

  if (hasExplicitStartYear) {
    volume = maybeVolume;
    startyear = maybeStartYear;
    title = rawParts.slice(1, -2).join("|");
  }

  const normalizedVolume = normalizeNavigationVolume(volume);
  if (!publisher || !normalizedVolume) return null;

  return {
    publisher: slugify(publisher),
    title: slugify(title),
    volume: normalizedVolume,
    startyear: normalizeNavigationStartYear(startyear),
  };
}

export function matchesNavigationSeriesKey(
  seriesKey: string,
  candidate: {
    publisher?: string | null;
    title?: string | null;
    volume?: number | string | null;
    startyear?: number | string | null;
  }
) {
  const parsed = parseNavigationSeriesKey(seriesKey);
  if (!parsed) return false;

  const baseMatch = (
    parsed.publisher === slugify(String(candidate.publisher || "")) &&
    parsed.title === slugify(String(candidate.title || "")) &&
    parsed.volume === normalizeNavigationVolume(candidate.volume)
  );

  if (!baseMatch) return false;
  if (!parsed.startyear) return true;

  return parsed.startyear === normalizeNavigationStartYear(candidate.startyear);
}

