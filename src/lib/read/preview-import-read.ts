import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import {
  hasActivePreviewImportQueue,
  readActivePreviewImportQueue,
  readStagedPreviewImport,
} from "../server/preview-import-session";

export async function readPreviewImportQueue() {
  return readActivePreviewImportQueue();
}

export async function readHasActivePreviewImportQueue() {
  const staged = await readStagedPreviewImport();
  if (staged && staged.status !== "DISCARDED") {
    return true;
  }
  return hasActivePreviewImportQueue();
}

export async function readActiveStagedPreviewImport() {
  return readStagedPreviewImport();
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

export async function findDeSeriesForBatchImport(title: string): Promise<{
  id: string | number;
  title: string;
  volume: number;
  publisherName: string;
} | null> {
  const matches = await readDeSeriesByTitle(title);
  if (matches.length === 0) return null;

  const match = matches[0];
  const series = await prisma.series.findFirst({
    where: {
      title: match.title,
      volume: BigInt(match.volume),
      publisher: { original: false },
    },
    select: {
      id: true,
      title: true,
      volume: true,
      publisher: { select: { name: true } },
    },
  });

  if (!series || !series.title) return null;
  return {
    id: String(series.id),
    title: series.title,
    volume: Number(series.volume),
    publisherName: series.publisher?.name || match.publisherName,
  };
}

export async function checkDeIssueExists(
  seriesId: string | number,
  number: string,
  format?: string,
  variant?: string
): Promise<boolean> {
  const normNumber = String(number).trim();
  const normFormat = (format || "").trim();
  const normVariant = (variant || "").trim();

  if (normFormat) {
    const count = await prisma.variant.count({
      where: {
        issue: {
          fkSeries: BigInt(seriesId),
          number: normNumber,
        },
        format: { equals: normFormat, mode: "insensitive" },
        ...(normVariant
          ? { variantLabel: { equals: normVariant, mode: "insensitive" } }
          : { OR: [{ variantLabel: null }, { variantLabel: "" }] }),
      },
    });
    return count > 0;
  }

  const count = await prisma.issue.count({
    where: {
      fkSeries: BigInt(seriesId),
      number: normNumber,
    },
  });
  return count > 0;
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}
