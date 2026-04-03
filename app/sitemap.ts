import type { MetadataRoute } from "next";
import {
  readAppearanceLandingSitemapEntries,
  readArcLandingSitemapEntries,
  readCanonicalIssueSitemapEntries,
  readGenreLandingSitemapEntries,
  readHomeSitemapEntries,
  readPersonLandingSitemapEntries,
  readPublisherSitemapEntries,
  readSeriesSitemapEntries,
  type SitemapEntry,
} from "@/src/lib/read/sitemap-read";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://shortbox.de";

function toAbsoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function isDatabaseUnavailable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "P1001") return true;
  if ("message" in error && typeof error.message === "string") {
    return error.message.includes("Can't reach database server");
  }
  return false;
}

function mergeEntries(list: SitemapEntry[]): MetadataRoute.Sitemap {
  const byUrl = new Map<string, { url: string; lastModified?: Date }>();

  for (const entry of list) {
    const url = toAbsoluteUrl(entry.path);
    const prev = byUrl.get(url);
    if (!prev) {
      byUrl.set(url, { url, lastModified: entry.lastModified });
      continue;
    }

    if (!prev.lastModified || (entry.lastModified && entry.lastModified > prev.lastModified)) {
      prev.lastModified = entry.lastModified;
      byUrl.set(url, prev);
    }
  }

  return [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let publisherEntries: SitemapEntry[];
  let seriesEntries: SitemapEntry[];
  let issueEntries: SitemapEntry[];
  let personEntries: SitemapEntry[];
  let arcEntries: SitemapEntry[];
  let appearanceEntries: SitemapEntry[];
  let genreEntries: SitemapEntry[];

  try {
    [
      publisherEntries,
      seriesEntries,
      issueEntries,
      personEntries,
      arcEntries,
      appearanceEntries,
      genreEntries,
    ] = await Promise.all([
      readPublisherSitemapEntries(),
      readSeriesSitemapEntries(),
      readCanonicalIssueSitemapEntries(),
      readPersonLandingSitemapEntries(),
      readArcLandingSitemapEntries(),
      readAppearanceLandingSitemapEntries(),
      readGenreLandingSitemapEntries(),
    ]);
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    console.warn("sitemap build fallback: database unavailable, returning home entries only");
    return mergeEntries(readHomeSitemapEntries());
  }

  return mergeEntries([
    ...readHomeSitemapEntries(),
    ...publisherEntries,
    ...seriesEntries,
    ...issueEntries,
    ...personEntries,
    ...arcEntries,
    ...appearanceEntries,
    ...genreEntries,
  ]);
}
