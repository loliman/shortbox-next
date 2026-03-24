import { romanize } from "./util";
import { buildDetailPageUrl } from "../lib/url-builder";

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

export function getSeriesLabel(series?: SeriesLike | null, options?: SeriesLabelOptions): string {
  if (!series?.title) return "";

  const volume =
    series.volume !== undefined && series.volume !== null
      ? ` (Vol. ${romanize(series.volume)})`
      : "";
  const startyear = series.startyear ?? options?.fallbackYear;
  const year = startyear ? ` (${startyear})` : "";

  return `${series.title}${volume}${year}`;
}

export function getIssueLabel(issue?: IssueLike | null): string {
  if (!issue) return "";

  const seriesLabel = getSeriesLabel(issue.series);
  const number = issue.number !== undefined && issue.number !== null ? String(issue.number) : "";
  const legacyLabel = getLegacyNumberLabel(issue);

  if (!seriesLabel) return number ? `#${number}${legacyLabel ? ` ${legacyLabel}` : ""}` : legacyLabel;
  return number ? `${seriesLabel} #${number}${legacyLabel ? ` ${legacyLabel}` : ""}` : seriesLabel;
}

export function getLegacyNumberLabel(issue?: Pick<IssueLike, "legacy_number"> | null): string {
  const legacy = String(issue?.legacy_number || "").trim();
  return legacy ? `LGY #${legacy}` : "";
}

export function getIssueUrl(issue: IssueLike | undefined, us: boolean): string {
  if (
    !issue?.series?.title ||
    !issue?.series?.publisher?.name ||
    issue.number === undefined ||
    issue.number === null
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
    issueNumber: String(issue.number),
    format: issue.format || undefined,
    variant: issue.variant || undefined,
  });
}
