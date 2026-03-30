import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { dedupePublisherItems, dedupeSeriesItems } from "./autocomplete-read-shared";

const AUTOCOMPLETE_PAGE_SIZE = 50;
const REALITY_EXTRACT_PATTERN = /\((earth-[^)]+)\)/gi;

export type AutocompleteSource =
  | "publishers"
  | "series"
  | "genres"
  | "arcs"
  | "individuals"
  | "apps"
  | "realities";

type AutocompleteRequest = {
  source: AutocompleteSource;
  variables?: Record<string, unknown>;
  offset?: number;
  limit?: number;
};

export async function readAutocompleteItems(input: AutocompleteRequest) {
  const limit = normalizePositiveInt(input.limit, AUTOCOMPLETE_PAGE_SIZE);
  const offset = normalizePositiveInt(input.offset, 0);

  switch (input.source) {
    case "publishers":
      return getPublisherItems(input.variables, offset, limit);
    case "series":
      return getSeriesItems(input.variables, offset, limit);
    case "genres":
      return getGenreItems(input.variables, offset, limit);
    case "arcs":
      return getArcItems(input.variables, offset, limit);
    case "individuals":
      return getIndividualItems(input.variables, offset, limit);
    case "apps":
      return getAppearanceItems(input.variables, offset, limit);
    case "realities":
      return getRealityItems(input.variables, offset, limit);
    default:
      return { items: [], hasMore: false };
  }
}

async function getPublisherItems(
  variables: Record<string, unknown> | undefined,
  offset: number,
  limit: number
) {
  const pattern = normalizePattern(variables?.pattern);
  const us = typeof variables?.us === "boolean" ? variables.us : undefined;
  const likePattern = toLikePattern(pattern);

  try {
    const rows = await prisma.$queryRaw<Array<{ name: string; original: boolean }>>(
      pattern
        ? Prisma.sql`
            SELECT name, original
            FROM shortbox.publisher
            WHERE ${us === undefined ? Prisma.sql`TRUE` : Prisma.sql`original = ${us}`}
              AND name ILIKE ${likePattern}
            ORDER BY name ASC, id ASC
            OFFSET ${offset}
            LIMIT ${limit + 1}
          `
        : Prisma.sql`
            SELECT name, original
            FROM shortbox.publisher
            WHERE ${us === undefined ? Prisma.sql`TRUE` : Prisma.sql`original = ${us}`}
            ORDER BY name ASC, id ASC
            OFFSET ${offset}
            LIMIT ${limit + 1}
          `
    );

    const items = dedupePublisherItems(
      rows.slice(0, limit).map((entry) => ({
        name: entry.name,
        us: entry.original,
      }))
    );

    return {
      items,
      hasMore: rows.length > limit,
    };
  } catch {
    return { items: [], hasMore: false };
  }
}

async function getSeriesItems(
  variables: Record<string, unknown> | undefined,
  offset: number,
  limit: number
) {
  const pattern = normalizePattern(variables?.pattern);
  const publisher = asRecord(variables?.publisher);
  const publisherName = normalizePattern(publisher?.name);
  const publisherUs = typeof publisher?.us === "boolean" ? publisher.us : undefined;
  const likePattern = toLikePattern(pattern);

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        title: string | null;
        volume: bigint | number;
        startyear: bigint | number;
        endyear: bigint | number | null;
        publisher_name: string | null;
        publisher_original: boolean | null;
      }>
    >(
      Prisma.sql`
        SELECT
          s.title,
          s.volume,
          s.startyear,
          s.endyear,
          p.name AS publisher_name,
          p.original AS publisher_original
        FROM shortbox.series s
        LEFT JOIN shortbox.publisher p
          ON p.id = s.fk_publisher
        WHERE ${pattern ? Prisma.sql`s.title ILIKE ${likePattern}` : Prisma.sql`TRUE`}
          AND ${
            publisherName && publisherName !== "*"
              ? Prisma.sql`p.name = ${publisherName}`
              : Prisma.sql`TRUE`
          }
          AND ${publisherUs === undefined ? Prisma.sql`TRUE` : Prisma.sql`p.original = ${publisherUs}`}
        ORDER BY s.title ASC, s.volume ASC, s.startyear ASC, s.id ASC
        OFFSET ${offset}
        LIMIT ${limit + 1}
      `
    );

    const items = dedupeSeriesItems(
      rows.slice(0, limit).map((entry) => ({
        title: entry.title || "",
        volume: Number(entry.volume),
        startyear: Number(entry.startyear),
        endyear: entry.endyear === null ? null : Number(entry.endyear),
        publisher: entry.publisher_name
          ? {
              name: entry.publisher_name,
              us: Boolean(entry.publisher_original),
            }
          : undefined,
      }))
    );

    return {
      items,
      hasMore: rows.length > limit,
    };
  } catch {
    return { items: [], hasMore: false };
  }
}

async function getGenreItems(
  variables: Record<string, unknown> | undefined,
  offset: number,
  limit: number
) {
  const pattern = normalizePattern(variables?.pattern);
  const likePattern = `%${pattern.replace(/\s/g, "%")}%`;

  try {
    const rows = await prisma.$queryRaw<Array<{ genre: string | null }>>(
      pattern
        ? Prisma.sql`
            SELECT genre
            FROM shortbox.series
            WHERE genre ILIKE ${likePattern}
            ORDER BY genre ASC, id ASC
          `
        : Prisma.sql`
            SELECT genre
            FROM shortbox.series
            ORDER BY genre ASC, id ASC
          `
    );

    const unique = new Map<string, string>();
    rows.forEach((row) => {
      splitGenres(row.genre).forEach((genre) => {
        if (!matchesGenrePattern(genre, pattern)) return;
        const key = genre.toLowerCase();
        if (!unique.has(key)) unique.set(key, genre);
      });
    });

    const sortedGenres = [...unique.values()].sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" })
    );

    return sliceItems(
      sortedGenres.map((name) => ({ name })),
      offset,
      limit
    );
  } catch {
    return { items: [], hasMore: false };
  }
}

async function getArcItems(
  variables: Record<string, unknown> | undefined,
  offset: number,
  limit: number
) {
  const pattern = normalizePattern(variables?.pattern);
  const type = normalizePattern(variables?.type).toUpperCase();
  const likePattern = toLikePattern(pattern);

  try {
    const rows = await prisma.$queryRaw<Array<{ title: string; type: string }>>(
      pattern || type
        ? Prisma.sql`
            SELECT title, type
            FROM shortbox.arc
            WHERE ${type ? Prisma.sql`type = ${type}` : Prisma.sql`TRUE`}
              AND ${pattern ? Prisma.sql`title ILIKE ${likePattern}` : Prisma.sql`TRUE`}
            ORDER BY title ASC, type ASC, id ASC
            OFFSET ${offset}
            LIMIT ${limit + 1}
          `
        : Prisma.sql`
            SELECT title, type
            FROM shortbox.arc
            ORDER BY title ASC, type ASC, id ASC
            OFFSET ${offset}
            LIMIT ${limit + 1}
          `
    );

    return {
      items: rows.slice(0, limit).map((entry) => ({
        title: entry.title,
        type: entry.type,
      })),
      hasMore: rows.length > limit,
    };
  } catch {
    return { items: [], hasMore: false };
  }
}

async function getIndividualItems(
  variables: Record<string, unknown> | undefined,
  offset: number,
  limit: number
) {
  const pattern = normalizePattern(variables?.pattern);
  const likePattern = toLikePattern(pattern);

  try {
    const rows = await prisma.$queryRaw<Array<{ name: string }>>(
      pattern
        ? Prisma.sql`
            SELECT name
            FROM shortbox.individual
            WHERE name ILIKE ${likePattern}
            ORDER BY name ASC, id ASC
            OFFSET ${offset}
            LIMIT ${limit + 1}
          `
        : Prisma.sql`
            SELECT name
            FROM shortbox.individual
            ORDER BY name ASC, id ASC
            OFFSET ${offset}
            LIMIT ${limit + 1}
          `
    );

    return {
      items: rows.slice(0, limit).map((entry) => ({
        name: entry.name,
      })),
      hasMore: rows.length > limit,
    };
  } catch {
    return { items: [], hasMore: false };
  }
}

async function getAppearanceItems(
  variables: Record<string, unknown> | undefined,
  offset: number,
  limit: number
) {
  const pattern = normalizePattern(variables?.pattern);
  const type = normalizePattern(variables?.type).toUpperCase();
  const likePattern = toLikePattern(pattern);

  try {
    const rows = await prisma.$queryRaw<Array<{ name: string; type: string }>>(
      pattern || type
        ? Prisma.sql`
            SELECT name, type
            FROM shortbox.appearance
            WHERE ${type ? Prisma.sql`type ILIKE ${type}` : Prisma.sql`TRUE`}
              AND ${pattern ? Prisma.sql`name ILIKE ${likePattern}` : Prisma.sql`TRUE`}
            ORDER BY name ASC, id ASC
            OFFSET ${offset}
            LIMIT ${limit + 1}
          `
        : Prisma.sql`
            SELECT name, type
            FROM shortbox.appearance
            ORDER BY name ASC, id ASC
            OFFSET ${offset}
            LIMIT ${limit + 1}
          `
    );

    return {
      items: rows.slice(0, limit).map((entry) => ({
        name: entry.name,
        type: entry.type,
      })),
      hasMore: rows.length > limit,
    };
  } catch {
    return { items: [], hasMore: false };
  }
}

async function getRealityItems(
  variables: Record<string, unknown> | undefined,
  offset: number,
  limit: number
) {
  const pattern = normalizePattern(variables?.pattern);

  try {
    const rows = await prisma.appearance.findMany({
      select: {
        name: true,
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 1000,
    });

    const realities = dedupeStrings(rows.flatMap((row) => extractRealitiesFromAppearanceName(row.name)))
      .filter((entry) => (pattern ? entry.toLowerCase().includes(pattern.toLowerCase()) : true))
      .map((name) => ({ name }));

    return sliceItems(realities, offset, limit);
  } catch {
    return { items: [], hasMore: false };
  }
}

function extractRealitiesFromAppearanceName(name: string): string[] {
  const source = typeof name === "string" ? name : "";
  if (!source) return [];

  const matches: string[] = [];
  let match: RegExpExecArray | null = REALITY_EXTRACT_PATTERN.exec(source);
  while (match) {
    const normalized = normalizeRealityName(match[1] || "");
    if (normalized) matches.push(normalized);
    match = REALITY_EXTRACT_PATTERN.exec(source);
  }
  REALITY_EXTRACT_PATTERN.lastIndex = 0;

  return dedupeStrings(matches);
}

function normalizeRealityName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase().startsWith("earth-")) {
    return `Earth-${trimmed.slice(6)}`;
  }
  return trimmed;
}

function dedupeStrings(values: string[]) {
  const unique = new Map<string, string>();
  values.forEach((value) => {
    const normalized = normalizePattern(value);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (!unique.has(key)) unique.set(key, normalized);
  });
  return [...unique.values()];
}

function splitGenres(value: unknown): string[] {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function matchesGenrePattern(genre: string, pattern: string): boolean {
  if (!pattern) return true;

  const parts = pattern
    .toLowerCase()
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (parts.length === 0) return true;

  const normalizedGenre = genre.toLowerCase();
  let index = 0;
  for (const part of parts) {
    const next = normalizedGenre.indexOf(part, index);
    if (next < 0) return false;
    index = next + part.length;
  }
  return true;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function normalizePattern(value: unknown) {
  return String(value || "").trim();
}

function normalizePositiveInt(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value as number));
}

function toLikePattern(pattern: string) {
  return `%${pattern.replace(/\s+/g, "%")}%`;
}

function sliceItems<T>(items: T[], offset: number, limit: number) {
  const sliced = items.slice(offset, offset + limit + 1);
  return {
    items: sliced.slice(0, limit),
    hasMore: sliced.length > limit,
  };
}
