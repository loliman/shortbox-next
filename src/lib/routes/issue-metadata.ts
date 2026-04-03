import "server-only";

import { buildDetailPageUrl, type Locale } from "../url-builder";

type IssueLike = {
  number?: string | number | null;
  format?: string | null;
  variant?: string | null;
  series?: {
    title?: string | null;
    startyear?: string | number | null;
    volume?: string | number | null;
    publisher?: {
      name?: string | null;
    } | null;
  } | null;
};

type IssueMetadataParts = {
  title: string;
  description: string;
  canonical?: string;
};

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}

function toOptionalPositiveNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function buildFormatVariantLabel(issue: IssueLike | null | undefined): string {
  const format = toStringValue(issue?.format);
  const variant = toStringValue(issue?.variant);
  return [format, variant].filter(Boolean).join(" ");
}

function buildCanonicalIssueUrl(issue: IssueLike | null | undefined, locale: Locale): string | undefined {
  const publisherName = toStringValue(issue?.series?.publisher?.name);
  const seriesTitle = toStringValue(issue?.series?.title);
  const issueNumber = toStringValue(issue?.number);
  const seriesYear = toOptionalPositiveNumber(issue?.series?.startyear);
  const seriesVolume = toOptionalPositiveNumber(issue?.series?.volume);
  const format = toStringValue(issue?.format) || undefined;
  const variant = toStringValue(issue?.variant) || undefined;

  if (!publisherName || !seriesTitle || !issueNumber || !seriesVolume) return undefined;

  return buildDetailPageUrl({
    locale,
    publisherName,
    seriesTitle,
    seriesYear,
    seriesVolume,
    issueNumber,
    format,
    variant,
  });
}

export function buildIssueMetadataParts(
  issue: IssueLike | null | undefined,
  locale: Locale
): IssueMetadataParts {
  const seriesTitle = toStringValue(issue?.series?.title);
  const issueNumber = toStringValue(issue?.number);
  const year = toStringValue(issue?.series?.startyear);
  const formatVariant = buildFormatVariantLabel(issue);

  if (!seriesTitle || !issueNumber) {
    return {
      title: "Heftdetails",
      description:
        "Comic-Heftdetails in Shortbox mit Format, Variante, Story-Informationen und weiterfuehrenden Metadaten.",
      canonical: undefined,
    };
  }

  const yearPart = year ? ` (${year})` : "";
  const formatPart = formatVariant ? ` - ${formatVariant}` : "";

  return {
    title: `${seriesTitle}${yearPart} #${issueNumber}${formatPart}`,
    description: `${seriesTitle} #${issueNumber}: Format, Variante, Storys und Publikationsdetails in Shortbox auf einen Blick.`,
    canonical: buildCanonicalIssueUrl(issue, locale),
  };
}
