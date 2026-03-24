import "server-only";

import { buildDetailPageUrl, type Locale } from "../url-builder";
import { generatePublisherSlug, generateSeriesSlug } from "../slug-builder";

type BreadcrumbEntry = {
  name: string;
  path: string;
};

type IssueLike = {
  number?: string | number | null;
  format?: string | null;
  variant?: string | null;
  series?: {
    title?: string | null;
    startyear?: number | string | null;
    volume?: number | string | null;
    publisher?: {
      name?: string | null;
    } | null;
  } | null;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://shortbox.de";

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toPositiveNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function toAbsoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function buildIssueCanonicalPath(issue: IssueLike, locale: Locale): string | undefined {
  const publisherName = toStringValue(issue.series?.publisher?.name);
  const seriesTitle = toStringValue(issue.series?.title);
  const issueNumber = toStringValue(issue.number);
  const seriesVolume = toPositiveNumber(issue.series?.volume);
  const seriesYear = toPositiveNumber(issue.series?.startyear);
  const format = toStringValue(issue.format) || undefined;
  const variant = toStringValue(issue.variant) || undefined;

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

function buildPublisherCanonicalPath(publisherName: string, locale: Locale): string {
  return `/${locale}/${generatePublisherSlug(publisherName)}`;
}

function buildSeriesCanonicalPath(input: {
  locale: Locale;
  publisherName: string;
  seriesTitle: string;
  seriesYear?: number;
  seriesVolume: number;
}): string {
  const publisherPath = buildPublisherCanonicalPath(input.publisherName, input.locale);
  const seriesSlug = generateSeriesSlug(input.seriesTitle, input.seriesYear, input.seriesVolume);
  return `${publisherPath}/${seriesSlug}`;
}

export function buildBreadcrumbList(entries: BreadcrumbEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: toAbsoluteUrl(entry.path),
    })),
  };
}

export function buildPublisherBreadcrumbStructuredData(input: {
  locale: Locale;
  publisherName: string;
}) {
  return buildBreadcrumbList([
    { name: "Shortbox", path: `/${input.locale}` },
    { name: input.publisherName, path: buildPublisherCanonicalPath(input.publisherName, input.locale) },
  ]);
}

export function buildSeriesBreadcrumbStructuredData(input: {
  locale: Locale;
  publisherName: string;
  seriesTitle: string;
  seriesYear?: number | string | null;
  seriesVolume?: number | string | null;
}) {
  const year = toPositiveNumber(input.seriesYear);
  const volume = toPositiveNumber(input.seriesVolume) || 1;
  const seriesName = `${input.seriesTitle}${year ? ` (${year})` : ""}`;

  return buildBreadcrumbList([
    { name: "Shortbox", path: `/${input.locale}` },
    { name: input.publisherName, path: buildPublisherCanonicalPath(input.publisherName, input.locale) },
    {
      name: seriesName,
      path: buildSeriesCanonicalPath({
        locale: input.locale,
        publisherName: input.publisherName,
        seriesTitle: input.seriesTitle,
        seriesYear: year,
        seriesVolume: volume,
      }),
    },
  ]);
}

export function buildIssueBreadcrumbStructuredData(issue: IssueLike, locale: Locale) {
  const publisherName = toStringValue(issue.series?.publisher?.name);
  const seriesTitle = toStringValue(issue.series?.title);
  const issueNumber = toStringValue(issue.number);
  const seriesVolume = toPositiveNumber(issue.series?.volume) || 1;
  const seriesYear = toPositiveNumber(issue.series?.startyear);
  const currentPath = buildIssueCanonicalPath(issue, locale);

  if (!publisherName || !seriesTitle || !issueNumber || !currentPath) return null;

  const publisherPath = buildPublisherCanonicalPath(publisherName, locale);
  const seriesPath = buildSeriesCanonicalPath({
    locale,
    publisherName,
    seriesTitle,
    seriesYear,
    seriesVolume,
  });
  const issuePath = buildDetailPageUrl({
    locale,
    publisherName,
    seriesTitle,
    seriesYear,
    seriesVolume,
    issueNumber,
  });
  const seriesName = `${seriesTitle}${seriesYear ? ` (${seriesYear})` : ""}`;
  const format = toStringValue(issue.format);
  const variant = toStringValue(issue.variant);
  const variantName = [format, variant].filter(Boolean).join(" – ");

  const entries: BreadcrumbEntry[] = [
    { name: "Shortbox", path: `/${locale}` },
    { name: publisherName, path: publisherPath },
    { name: seriesName, path: seriesPath },
    { name: `Issue #${issueNumber}`, path: issuePath },
  ];

  if (variantName) {
    entries.push({ name: variantName, path: currentPath });
  }

  return buildBreadcrumbList(entries);
}

