import { romanize } from "./util";

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
  const base = us ? "/us/" : "/de/";
  if (
    !issue?.series?.title ||
    !issue?.series?.publisher?.name ||
    issue.number === undefined ||
    issue.number === null
  ) {
    return us ? "/us" : "/de";
  }

  const publisher = encodeURIComponent(issue.series.publisher.name.replace(/%/g, "%25"));
  const series = encodeURIComponent(
    issue.series.title.replace(/%/g, "%25") + "_Vol_" + (issue.series.volume ?? "")
  );
  const number = encodeURIComponent(String(issue.number).replace(/%/g, "%25"));
  const format = issue.format ? "/" + encodeURIComponent(issue.format) : "";

  if (!issue.variant || issue.variant === "") {
    return `${base}${publisher}/${series}/${number}${format}`;
  }

  return (
    `${base}${publisher}/${series}/${number}/` +
    encodeURIComponent((issue.format || "") + "_" + issue.variant)
  );
}
