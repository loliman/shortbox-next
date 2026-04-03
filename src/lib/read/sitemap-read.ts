import "server-only";

import { prisma } from "../prisma/client";
import {
  buildAppearanceFilterUrl,
  buildArcFilterUrl,
  buildDetailPageUrl,
  buildGenreFilterUrl,
  buildPersonFilterUrl,
  type Locale,
} from "../url-builder";
import {
  generateAppearanceSlug,
  generateArcSlug,
  generateGenreSlug,
  generatePersonSlug,
  generatePublisherSlug,
  generateSeriesSlug,
} from "../slug-builder";

export interface SitemapEntry {
  path: string;
  lastModified?: Date;
}

const BATCH_SIZE = 2000;

function toSafeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}

function toPositiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function mergeEntry(
  map: Map<string, SitemapEntry>,
  path: string,
  lastModified?: Date | null
) {
  if (!path) return;
  const prev = map.get(path);
  if (!prev) {
    map.set(path, {
      path,
      lastModified: lastModified || undefined,
    });
    return;
  }

  if (!prev.lastModified || (lastModified && lastModified > prev.lastModified)) {
    prev.lastModified = lastModified || prev.lastModified;
    map.set(path, prev);
  }
}

function localeFromOriginal(original: boolean | null | undefined): Locale {
  return original ? "us" : "de";
}

function buildPublisherPath(locale: Locale, publisherName: string): string {
  return `/${locale}/${generatePublisherSlug(publisherName)}`;
}

function buildSeriesPath(input: {
  locale: Locale;
  publisherName: string;
  seriesTitle: string;
  startYear: unknown;
  volume: unknown;
}) {
  const yearNumber = Number(input.startYear);
  const seriesYear = Number.isFinite(yearNumber) && yearNumber > 0 ? yearNumber : undefined;
  const seriesVolume = toPositiveNumber(input.volume, 1);
  return `${buildPublisherPath(input.locale, input.publisherName)}/${generateSeriesSlug(
    input.seriesTitle,
    seriesYear,
    seriesVolume
  )}`;
}

export function readHomeSitemapEntries(): SitemapEntry[] {
  return [{ path: "/de" }, { path: "/us" }];
}

export async function readPublisherSitemapEntries(): Promise<SitemapEntry[]> {
  const entries = new Map<string, SitemapEntry>();
  let cursor: bigint | undefined;

  while (true) {
    const rows = await prisma.publisher.findMany({
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, name: true, original: true, updatedAt: true },
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const row of rows) {
      const publisherName = toSafeString(row.name);
      if (!publisherName || !generatePublisherSlug(publisherName)) continue;

      mergeEntry(entries, buildPublisherPath(localeFromOriginal(row.original), publisherName), row.updatedAt);
    }
  }

  return [...entries.values()];
}

export async function readSeriesSitemapEntries(): Promise<SitemapEntry[]> {
  const entries = new Map<string, SitemapEntry>();
  let cursor: bigint | undefined;

  while (true) {
    const rows = await prisma.series.findMany({
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        startYear: true,
        volume: true,
        updatedAt: true,
        publisher: {
          select: {
            name: true,
            original: true,
          },
        },
      },
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const row of rows) {
      const publisherName = toSafeString(row.publisher?.name);
      const seriesTitle = toSafeString(row.title);
      const locale = localeFromOriginal(row.publisher?.original);

      if (!publisherName || !seriesTitle || !generatePublisherSlug(publisherName)) continue;

      const path = buildSeriesPath({
        locale,
        publisherName,
        seriesTitle,
        startYear: row.startYear,
        volume: row.volume,
      });
      if (!path.endsWith("/")) {
        mergeEntry(entries, path, row.updatedAt);
      }
    }
  }

  return [...entries.values()];
}

export async function readCanonicalIssueSitemapEntries(): Promise<SitemapEntry[]> {
  const entries = new Map<string, SitemapEntry>();
  let cursor: bigint | undefined;

  while (true) {
    const rows = await prisma.issue.findMany({
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        number: true,
        format: true,
        variant: true,
        updatedAt: true,
        series: {
          select: {
            title: true,
            startYear: true,
            volume: true,
            publisher: {
              select: {
                name: true,
                original: true,
              },
            },
          },
        },
      },
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const row of rows) {
      const number = toSafeString(row.number);
      const publisherName = toSafeString(row.series?.publisher?.name);
      const seriesTitle = toSafeString(row.series?.title);
      const locale = localeFromOriginal(row.series?.publisher?.original);

      if (!number || !publisherName || !seriesTitle) continue;

      const seriesVolume = toPositiveNumber(row.series?.volume, 1);
      const seriesYearNumber = Number(row.series?.startYear);
      const seriesYear = Number.isFinite(seriesYearNumber) && seriesYearNumber > 0
        ? seriesYearNumber
        : undefined;
      const format = toSafeString(row.format) || undefined;
      const variant = toSafeString(row.variant) || undefined;

      const path = buildDetailPageUrl({
        locale,
        publisherName,
        seriesTitle,
        seriesYear,
        seriesVolume,
        issueNumber: number,
        format,
        variant,
      });

      mergeEntry(entries, path, row.updatedAt);
    }
  }

  return [...entries.values()];
}

export async function readPersonLandingSitemapEntries(): Promise<SitemapEntry[]> {
  const entries = new Map<string, SitemapEntry>();
  let cursor: bigint | undefined;

  while (true) {
    const rows = await prisma.individual.findMany({
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, name: true, updatedAt: true },
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const row of rows) {
      const name = toSafeString(row.name);
      if (!name || !generatePersonSlug(name)) continue;

      mergeEntry(entries, buildPersonFilterUrl("de", name), row.updatedAt);
      mergeEntry(entries, buildPersonFilterUrl("us", name), row.updatedAt);
    }
  }

  return [...entries.values()];
}

export async function readArcLandingSitemapEntries(): Promise<SitemapEntry[]> {
  const entries = new Map<string, SitemapEntry>();
  let cursor: bigint | undefined;

  while (true) {
    const rows = await prisma.arc.findMany({
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, title: true, updatedAt: true },
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const row of rows) {
      const title = toSafeString(row.title);
      if (!title || !generateArcSlug(title)) continue;

      mergeEntry(entries, buildArcFilterUrl("de", title), row.updatedAt);
      mergeEntry(entries, buildArcFilterUrl("us", title), row.updatedAt);
    }
  }

  return [...entries.values()];
}

export async function readAppearanceLandingSitemapEntries(): Promise<SitemapEntry[]> {
  const entries = new Map<string, SitemapEntry>();
  let cursor: bigint | undefined;

  while (true) {
    const rows = await prisma.appearance.findMany({
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, name: true, updatedAt: true },
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const row of rows) {
      const name = toSafeString(row.name);
      if (!name || !generateAppearanceSlug(name)) continue;

      mergeEntry(entries, buildAppearanceFilterUrl("de", name), row.updatedAt);
      mergeEntry(entries, buildAppearanceFilterUrl("us", name), row.updatedAt);
    }
  }

  return [...entries.values()];
}

export async function readGenreLandingSitemapEntries(): Promise<SitemapEntry[]> {
  const entries = new Map<string, SitemapEntry>();
  let cursor: bigint | undefined;

  try {
    while (true) {
      const rows = await prisma.series.findMany({
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, genre: true, updatedAt: true },
      });

      if (rows.length === 0) break;
      cursor = rows[rows.length - 1].id;

      for (const row of rows) {
        const parts = toSafeString(row.genre)
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);

        for (const genre of parts) {
          if (!generateGenreSlug(genre)) continue;

          mergeEntry(entries, buildGenreFilterUrl("de", genre), row.updatedAt);
          mergeEntry(entries, buildGenreFilterUrl("us", genre), row.updatedAt);
        }
      }
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2022"
    ) {
      return [];
    }
    throw error;
  }

  return [...entries.values()];
}
