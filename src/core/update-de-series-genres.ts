import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma/client";

const MAX_SAMPLE_CHANGES = 50;

type DeSeriesRow = {
  id: number;
  genre: string;
};

type DeStoryRow = {
  fk_parent: number | null;
  fk_series: number | null;
};

type UsParentStoryRow = {
  id: number;
  genre: string | null;
};

export type UpdateDeSeriesGenresOptions = {
  dryRun?: boolean;
};

export type UpdateDeSeriesGenresChange = {
  seriesId: number;
  from: string;
  to: string;
};

export type UpdateDeSeriesGenresReport = {
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  totalDeSeries: number;
  processedDeStories: number;
  resolvedUsParentStories: number;
  mappedDeSeries: number;
  updatedSeries: number;
  unchangedSeries: number;
  clearedSeries: number;
  sampleChanges: UpdateDeSeriesGenresChange[];
};

const splitGenreTokens = (value: unknown): string[] =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const toUniqueSortedTokens = (values: string[]): string[] => {
  const unique = new Map<string, string>();

  values.forEach((value) => {
    const normalized = value.trim();
    if (!normalized) return;

    const key = normalized.toLowerCase();
    if (!unique.has(key)) unique.set(key, normalized);
  });

  return [...unique.values()].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" })
  );
};

const serializeGenreTokens = (values: string[]): string => toUniqueSortedTokens(values).join(", ");

const normalizeGenreString = (value: unknown): string =>
  serializeGenreTokens(splitGenreTokens(value));

export async function runUpdateDeSeriesGenres(
  options?: UpdateDeSeriesGenresOptions
): Promise<UpdateDeSeriesGenresReport | null> {
  const dryRun = Boolean(options?.dryRun);
  const startedAt = new Date().toISOString();

  try {
    const deSeries = await prisma.$queryRaw<DeSeriesRow[]>(Prisma.sql`
      SELECT s.id, COALESCE(s.genre, '') AS genre
      FROM shortbox.series s
      JOIN shortbox.publisher p ON p.id = s.fk_publisher
      WHERE p.original = false
      ORDER BY s.id ASC
    `);

    const deStories = await prisma.$queryRaw<DeStoryRow[]>(Prisma.sql`
      SELECT st.fk_parent, i.fk_series
      FROM shortbox.story st
      JOIN shortbox.issue i ON i.id = st.fk_issue
      JOIN shortbox.series s ON s.id = i.fk_series
      JOIN shortbox.publisher p ON p.id = s.fk_publisher
      WHERE st.fk_parent IS NOT NULL
        AND p.original = false
    `);

    const parentStoryIds = [...new Set(deStories.map((row) => Number(row.fk_parent || 0)))]
      .filter((id) => id > 0)
      .sort((left, right) => left - right);

    const usParentStories =
      parentStoryIds.length === 0
        ? []
        : await prisma.$queryRaw<UsParentStoryRow[]>(Prisma.sql`
            SELECT st.id, s.genre
            FROM shortbox.story st
            JOIN shortbox.issue i ON i.id = st.fk_issue
            JOIN shortbox.series s ON s.id = i.fk_series
            JOIN shortbox.publisher p ON p.id = s.fk_publisher
            WHERE st.id IN (${Prisma.join(parentStoryIds)})
              AND p.original = true
          `);

    const usGenreByParentStoryId = new Map<number, string>();
    usParentStories.forEach((row) => {
      const storyId = Number(row.id || 0);
      if (storyId <= 0) return;
      usGenreByParentStoryId.set(storyId, String(row.genre || ""));
    });

    const genresByDeSeriesId = new Map<number, string[]>();
    deStories.forEach((deStory) => {
      const deSeriesId = Number(deStory.fk_series || 0);
      if (deSeriesId <= 0) return;

      const parentStoryId = Number(deStory.fk_parent || 0);
      if (parentStoryId <= 0) return;

      const usGenre = usGenreByParentStoryId.get(parentStoryId);
      if (typeof usGenre !== "string" || usGenre.trim().length === 0) return;

      const current = genresByDeSeriesId.get(deSeriesId) || [];
      genresByDeSeriesId.set(deSeriesId, [...current, ...splitGenreTokens(usGenre)]);
    });

    let mappedDeSeries = 0;
    let updatedSeries = 0;
    let unchangedSeries = 0;
    let clearedSeries = 0;
    const sampleChanges: UpdateDeSeriesGenresChange[] = [];

    for (const deSeriesRow of deSeries) {
      const seriesId = Number(deSeriesRow.id || 0);
      if (seriesId <= 0) continue;

      const currentGenre = normalizeGenreString(deSeriesRow.genre);
      const nextGenre = serializeGenreTokens(genresByDeSeriesId.get(seriesId) || []);

      if (nextGenre.length > 0) mappedDeSeries += 1;

      if (nextGenre === currentGenre) {
        unchangedSeries += 1;
        continue;
      }

      updatedSeries += 1;
      if (nextGenre.length === 0) clearedSeries += 1;

      if (sampleChanges.length < MAX_SAMPLE_CHANGES) {
        sampleChanges.push({ seriesId, from: currentGenre, to: nextGenre });
      }

      if (!dryRun) {
        await prisma.$executeRaw(Prisma.sql`
          UPDATE shortbox.series
          SET genre = ${nextGenre}
          WHERE id = ${seriesId}
        `);
      }
    }

    return {
      dryRun,
      startedAt,
      finishedAt: new Date().toISOString(),
      totalDeSeries: deSeries.length,
      processedDeStories: deStories.length,
      resolvedUsParentStories: usParentStories.length,
      mappedDeSeries,
      updatedSeries,
      unchangedSeries,
      clearedSeries,
      sampleChanges,
    };
  } catch {
    return null;
  }
}

