import "server-only";

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
    .replace(/\s+/g, " ");
}

export async function readDeSeriesByTitle(title: string) {
  const normalizedTitle = normalizeSeriesTitleKey(title);
  if (!normalizedTitle) return [];

  const candidates = await prisma.series.findMany({
    where: {
      publisher: {
        original: false,
      },
    },
    select: {
      title: true,
      volume: true,
      publisher: {
        select: {
          name: true,
        },
      },
    },
  });

  return candidates
    .filter((entry) => normalizeSeriesTitleKey(String(entry.title ?? "")) === normalizedTitle)
    .map((entry) => ({
      title: String(entry.title ?? ""),
      volume: Number(entry.volume ?? 0),
      publisherName: String(entry.publisher?.name ?? ""),
    }))
    .filter((entry) => entry.title && entry.volume > 0 && entry.publisherName);
}
