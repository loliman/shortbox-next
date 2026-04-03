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

type OptionalNumberish = number | string | null | undefined;
type OptionalText = string | null | undefined;

function buildSeriesName(seriesTitle: string, year: OptionalNumberish): string {
  const normalizedYear = toPositiveNumber(year);
  return normalizedYear ? `${seriesTitle} (${normalizedYear})` : seriesTitle;
}

function buildIssueVariantSuffix(format: OptionalText, variant: OptionalText): string {
  const parts = [format, variant].map(toStringValue).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return `[${parts[0]}]`;
  return `[${parts[0]}] – ${parts[1]}`;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://shortbox.de";

export function buildWebsiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Shortbox",
    url: SITE_URL,
    inLanguage: "de",
    description: "Shortbox listet deutsche und US-Marvel-Veroeffentlichungen serverseitig und detailreich auf.",
  };
}

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}

function toPositiveNumber(value: OptionalNumberish): number | undefined {
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
  const seriesName = buildSeriesName(input.seriesTitle, year);

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

function filterKindToSchemaType(kind: string): string {
  if (kind === "person") return "Person";
  if (kind === "arc") return "CreativeWorkSeries";
  return "Thing";
}

export function buildFilterLandingCollectionPageStructuredData(input: {
  kind: string;
  entityLabel: string;
  canonicalPath: string;
  description?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${input.entityLabel}: Hefte und Ausgaben`,
    url: toAbsoluteUrl(input.canonicalPath),
    description: input.description ?? `${input.entityLabel}: Hefte und Ausgaben in Shortbox.`,
    inLanguage: "de",
    isPartOf: {
      "@type": "WebSite",
      name: "Shortbox",
      url: SITE_URL,
    },
    about: {
      "@type": filterKindToSchemaType(input.kind),
      name: input.entityLabel,
    },
  };
}

export function buildIssueComicStructuredData(issue: IssueLike, locale: Locale) {
  const publisherName = toStringValue(issue.series?.publisher?.name);
  const seriesTitle = toStringValue(issue.series?.title);
  const issueNumber = toStringValue(issue.number);
  const seriesVolume = toPositiveNumber(issue.series?.volume) || 1;
  const seriesYear = toPositiveNumber(issue.series?.startyear);
  const format = toStringValue(issue.format) || undefined;
  const variant = toStringValue(issue.variant) || undefined;

  if (!publisherName || !seriesTitle || !issueNumber) return null;

  const canonicalPath = buildIssueCanonicalPath(issue, locale);
  const seriesName = buildSeriesName(seriesTitle, seriesYear);
  const variantSuffix = buildIssueVariantSuffix(format, variant);
  const issueName = variantSuffix
    ? `${seriesTitle} #${issueNumber} ${variantSuffix}`
    : `${seriesTitle} #${issueNumber}`;

  const isPartOf: Record<string, unknown> = {
    "@type": "ComicSeries",
    name: seriesName,
    volumeNumber: String(seriesVolume),
    publisher: { "@type": "Organization", name: publisherName },
  };
  if (seriesYear) isPartOf["dateCreated"] = String(seriesYear);

  const result: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ComicIssue",
    name: issueName,
    issueNumber,
    inLanguage: "de",
    publisher: { "@type": "Organization", name: publisherName },
    isPartOf,
  };
  if (canonicalPath) result["url"] = toAbsoluteUrl(canonicalPath);

  return result;
}

export function buildPublisherCollectionPageStructuredData(input: {
  locale: Locale;
  publisherName: string;
  description?: string;
}) {
  const canonicalPath = buildPublisherCanonicalPath(input.publisherName, input.locale);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${input.publisherName}: Serien und Ausgaben`,
    url: toAbsoluteUrl(canonicalPath),
    description:
      input.description ?? `${input.publisherName}: Serien, Ausgaben und Aktualisierungen in Shortbox.`,
    inLanguage: "de",
    isPartOf: {
      "@type": "WebSite",
      name: "Shortbox",
      url: SITE_URL,
    },
    about: {
      "@type": "Organization",
      name: input.publisherName,
    },
  };
}

export function buildSeriesCollectionPageStructuredData(input: {
  locale: Locale;
  publisherName: string;
  seriesTitle: string;
  seriesYear?: number | string | null;
  seriesVolume?: number | string | null;
  description?: string;
}) {
  const year = toPositiveNumber(input.seriesYear);
  const volume = toPositiveNumber(input.seriesVolume) || 1;
  const seriesName = buildSeriesName(input.seriesTitle, year);
  const canonicalPath = buildSeriesCanonicalPath({
    locale: input.locale,
    publisherName: input.publisherName,
    seriesTitle: input.seriesTitle,
    seriesYear: year,
    seriesVolume: volume,
  });

  const about: Record<string, unknown> = {
    "@type": "CreativeWorkSeries",
    name: seriesName,
    publisher: {
      "@type": "Organization",
      name: input.publisherName,
    },
  };
  if (year) {
    about["dateCreated"] = String(year);
  }

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${input.seriesTitle} Band ${volume}: Ausgaben und Varianten`,
    url: toAbsoluteUrl(canonicalPath),
    description:
      input.description ??
      `${input.seriesTitle} Band ${volume}: Ausgaben, Varianten und Seriendetails in Shortbox.`,
    inLanguage: "de",
    isPartOf: {
      "@type": "WebSite",
      name: "Shortbox",
      url: SITE_URL,
    },
    about,
  };
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
  const seriesName = buildSeriesName(seriesTitle, seriesYear);
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
