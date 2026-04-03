import { romanize } from "../../util/util";
import { buildDetailPageUrl } from "../url-builder";

type PublisherLike = {
  name?: string | null;
};

type SeriesLike = {
  title?: string | null;
  volume?: number | string | null;
  startyear?: number | string | null;
  publisher?: PublisherLike | null;
};

type IssueLike = {
  number?: string | number | null;
  legacy_number?: string | null;
  format?: string | null;
  variant?: string | null;
  series?: SeriesLike | null;
};

interface SeriesLabelOptions {
  fallbackYear?: string;
}

function readIssueNumber(value: IssueLike["number"]): string {
  return value == null ? "" : String(value);
}

export function getSeriesLabel(series?: SeriesLike | null, options?: SeriesLabelOptions): string {
  if (!series?.title) return "";

  const volume = series.volume == null ? "" : ` (Vol. ${romanize(series.volume)})`;
  const startyear = series.startyear ?? options?.fallbackYear;
  const year = startyear ? ` (${startyear})` : "";

  return `${series.title}${volume}${year}`;
}

export function getIssueLabel(issue?: IssueLike | null): string {
  if (!issue) return "";

  const seriesLabel = getSeriesLabel(issue.series);
  const number = readIssueNumber(issue.number);
  const legacyLabel = getLegacyNumberLabel(issue);
  const numberWithLegacy = legacyLabel ? `#${number} ${legacyLabel}` : `#${number}`;

  if (!seriesLabel) return number ? numberWithLegacy : legacyLabel;
  return number ? `${seriesLabel} ${numberWithLegacy}` : seriesLabel;
}

export function getLegacyNumberLabel(issue?: Pick<IssueLike, "legacy_number"> | null): string {
  const legacy = issue?.legacy_number?.trim() ?? "";
  return legacy ? `LGY #${legacy}` : "";
}

export function getIssueUrl(issue: IssueLike | undefined, us: boolean): string {
  if (
    !issue?.series?.title ||
    !issue?.series?.publisher?.name ||
    issue.number == null
  ) {
    return us ? "/us" : "/de";
  }

  const rawYear = Number(issue.series.startyear);
  const seriesYear = Number.isFinite(rawYear) && rawYear > 0 ? rawYear : undefined;
  const rawVolume = Number(issue.series.volume ?? 1);
  const seriesVolume = Number.isFinite(rawVolume) && rawVolume > 0 ? rawVolume : 1;

  return buildDetailPageUrl({
    locale: us ? "us" : "de",
    publisherName: issue.series.publisher.name,
    seriesTitle: issue.series.title,
    seriesYear,
    seriesVolume,
    issueNumber: readIssueNumber(issue.number),
    format: issue.format || undefined,
    variant: issue.variant || undefined,
  });
}
