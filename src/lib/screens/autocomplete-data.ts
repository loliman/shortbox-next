import { prisma } from "../prisma/client";

const AUTOCOMPLETE_PAGE_SIZE = 50;

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

export async function getAutocompleteItems(input: AutocompleteRequest) {
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

  try {
    const rows = await prisma.publisher.findMany({
      where: {
        ...(us === undefined ? {} : { original: us }),
        ...(pattern
          ? {
              name: {
                contains: pattern,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: offset,
      take: limit + 1,
    });

    return {
      items: rows.slice(0, limit).map((entry) => ({
        name: entry.name,
        us: entry.original,
      })),
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

  try {
    const rows = await prisma.series.findMany({
      where: {
        ...(pattern
          ? {
              title: {
                contains: pattern,
                mode: "insensitive",
              },
            }
          : {}),
        publisher: {
          ...(publisherName && publisherName !== "*" ? { name: publisherName } : {}),
          ...(publisherUs === undefined ? {} : { original: publisherUs }),
        },
      },
      include: {
        publisher: true,
      },
      orderBy: [
        { title: "asc" },
        { volume: "asc" },
        { startYear: "asc" },
        { id: "asc" },
      ],
      skip: offset,
      take: limit + 1,
    });

    return {
      items: rows.slice(0, limit).map((entry) => ({
        title: entry.title || "",
        volume: Number(entry.volume),
        startyear: Number(entry.startYear),
        endyear: entry.endYear === null ? null : Number(entry.endYear),
        publisher: entry.publisher
          ? {
              name: entry.publisher.name,
              us: entry.publisher.original,
            }
          : undefined,
      })),
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

  try {
    const rows = await prisma.series.findMany({
      where: {
        genre: {
          not: null,
          ...(pattern
            ? {
                contains: pattern,
                mode: "insensitive",
              }
            : {}),
        },
      },
      select: {
        genre: true,
      },
      orderBy: [{ genre: "asc" }, { id: "asc" }],
      take: 500,
    });

    const genres = dedupeStrings(
      rows.flatMap((row) => String(row.genre || "").split(",")).map((entry) => entry.trim())
    );

    return sliceItems(genres, offset, limit);
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
  const type = normalizePattern(variables?.type);

  try {
    const rows = await prisma.arc.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(pattern
          ? {
              title: {
                contains: pattern,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: [{ title: "asc" }, { type: "asc" }, { id: "asc" }],
      skip: offset,
      take: limit + 1,
    });

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

  try {
    const rows = await prisma.individual.findMany({
      where: {
        ...(pattern
          ? {
              name: {
                contains: pattern,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: offset,
      take: limit + 1,
    });

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
  const type = normalizePattern(variables?.type);

  try {
    const rows = await prisma.appearance.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(pattern
          ? {
              name: {
                contains: pattern,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: [{ name: "asc" }, { type: "asc" }, { id: "asc" }],
      skip: offset,
      take: limit + 1,
    });

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
      where: {
        name: {
          contains: "Earth-",
          mode: "insensitive",
        },
      },
      select: {
        name: true,
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 1000,
    });

    const realities = dedupeStrings(
      rows.flatMap((row) => extractRealitiesFromAppearanceName(row.name))
    )
      .filter((entry) =>
        pattern ? entry.toLowerCase().includes(pattern.toLowerCase()) : true
      )
      .map((name) => ({ name }));

    return sliceItems(realities, offset, limit);
  } catch {
    return { items: [], hasMore: false };
  }
}

function extractRealitiesFromAppearanceName(name: string): string[] {
  const matches = name.match(/Earth-\d+[A-Za-z-]*/gi);
  if (!matches) return [];
  return dedupeStrings(matches.map((entry) => entry.trim()));
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

function sliceItems<T>(items: T[], offset: number, limit: number) {
  const page = items.slice(offset, offset + limit + 1);
  return {
    items: page.slice(0, limit),
    hasMore: page.length > limit,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizePattern(value: unknown) {
  const text = String(value || "").trim();
  return text.length > 0 ? text : "";
}

function normalizePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}
