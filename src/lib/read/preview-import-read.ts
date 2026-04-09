import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { hasActivePreviewImportQueue, readActivePreviewImportQueue } from "../server/preview-import-session";

export async function readPreviewImportQueue() {
  return readActivePreviewImportQueue();
}

export async function readHasActivePreviewImportQueue() {
  return hasActivePreviewImportQueue();
}

function normalizeSeriesTitleKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^the\s+/i, "")
    .replaceAll(/\s+/g, " ");
}

export async function readDeSeriesByTitle(title: string) {
  return readSeriesByTitle(title, false);
}

export async function readUsSeriesByTitle(title: string) {
  return readSeriesByTitle(title, true);
}

async function readSeriesByTitle(title: string, us: boolean) {
  const normalizedTitle = normalizeSeriesTitleKey(title);
  if (!normalizedTitle) return [];

  const candidates = await prisma.$queryRaw<
    Array<{
      title: string | null;
      volume: bigint | number;
      publisher_name: string | null;
    }>
  >(
    Prisma.sql`
      SELECT
        s.title,
        s.volume,
        p.name AS publisher_name
      FROM shortbox.series s
      LEFT JOIN shortbox.publisher p
        ON p.id = s.fk_publisher
      WHERE p.original = ${us}
        AND LOWER(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              TRIM(COALESCE(s.title, '')),
              '^the\\s+',
              '',
              'i'
            ),
            '\\s+',
            ' ',
            'g'
          )
        ) = ${normalizedTitle}
      ORDER BY s.volume DESC, s.id DESC
    `
  );

  return candidates
    .map((entry) => ({
      title: readTextValue(entry.title),
      volume: Number(entry.volume ?? 0),
      publisherName: readTextValue(entry.publisher_name),
    }))
    .filter((entry) => entry.title && entry.volume > 0 && entry.publisherName);
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}
