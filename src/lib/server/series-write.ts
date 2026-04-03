import type { PrismaClient, Prisma } from "@prisma/client";
import "server-only";

import { prisma } from "../prisma/client";
import { deleteIssueByLookup } from "./issues-write";
import { Result, success, failure } from "@/src/types/result";

type PrismaExecutor = Prisma.TransactionClient | PrismaClient;

type PublisherRef = {
  name?: string;
  us?: boolean;
};

type SeriesInput = {
  title?: string;
  startyear?: number;
  endyear?: number | null;
  volume?: number;
  genre?: string;
  addinfo?: string;
  publisher?: PublisherRef;
};

export async function createSeries(item: SeriesInput): Promise<Result<ReturnType<typeof toSeriesPayload>>> {
  try {
    const publisher = await findPublisher(item.publisher, prisma);
    if (!publisher) return failure("Publisher not found", 404);

    const now = new Date();
    const created = await prisma.series.create({
      data: {
        title: normalizeText(item.title),
        startYear: BigInt(Number(item.startyear ?? 0)),
        endYear: normalizeYear(item.endyear),
        volume: BigInt(Number(item.volume ?? 0)),
        genre: normalizeText(item.genre),
        addInfo: normalizeText(item.addinfo),
        fkPublisher: publisher.id,
        createdAt: now,
        updatedAt: now,
      },
      include: {
        publisher: true,
      },
    });

    return success(toSeriesPayload(created));
  } catch (error) {
    return failure(error as Error);
  }
}

export async function editSeries(oldItem: SeriesInput, item: SeriesInput): Promise<Result<ReturnType<typeof toSeriesPayload>>> {
  try {
    const oldPublisher = await findPublisher(oldItem.publisher, prisma);
    if (!oldPublisher) return failure("Publisher not found", 404);

    const existing = await prisma.series.findFirst({
      where: {
        title: normalizeText(oldItem.title),
        volume: BigInt(Number(oldItem.volume ?? 0)),
        fkPublisher: oldPublisher.id,
      },
    });

    if (!existing) return failure("Series not found", 404);

    const newPublisher = await findPublisher(item.publisher, prisma);
    if (!newPublisher) return failure("Publisher not found", 404);

    const updated = await prisma.series.update({
      where: {
        id: existing.id,
      },
      data: {
        title: normalizeText(item.title),
        volume: BigInt(Number(item.volume ?? 0)),
        startYear: BigInt(Number(item.startyear ?? 0)),
        endYear: normalizeYear(item.endyear),
        genre: normalizeText(item.genre),
        addInfo: normalizeText(item.addinfo),
        fkPublisher: newPublisher.id,
        updatedAt: new Date(),
      },
      include: {
        publisher: true,
      },
    });

    return success(toSeriesPayload(updated));
  } catch (error) {
    return failure(error as Error);
  }
}

export async function deleteSeriesByLookup(item: SeriesInput, executor: PrismaExecutor = prisma): Promise<Result<boolean>> {
  try {
    const publisher = await findPublisher(item.publisher, executor);
    if (!publisher) return failure("Publisher not found", 404);

    const series = await executor.series.findFirst({
      where: {
        title: normalizeText(item.title),
        volume: BigInt(Number(item.volume ?? 0)),
        fkPublisher: publisher.id,
      },
      include: {
        publisher: true,
        issues: {
          orderBy: [{ id: "asc" }],
        },
      },
    });

    if (!series) return failure("Series not found", 404);

    for (const issue of series.issues) {
      const deleted = await deleteIssueByLookup(
        {
          number: issue.number,
          format: issue.format,
          variant: issue.variant || "",
          series: {
            title: series.title || "",
            volume: Number(series.volume),
            publisher: {
              name: publisher.name,
              us: publisher.original,
            },
          },
        },
        executor
      );
      if (typeof deleted === "object" && deleted !== null && "success" in deleted && !deleted.success) {
        throw new Error(deleted.error);
      }
    }

    await executor.series.delete({
      where: {
        id: series.id,
      },
    });

    return success(true);
  } catch (error) {
    return failure(error as Error);
  }
}

async function findPublisher(publisher: PublisherRef | undefined, executor: PrismaExecutor) {
  return executor.publisher.findFirst({
    where: {
      name: normalizeText(publisher?.name),
      ...(typeof publisher?.us === "boolean" ? { original: publisher.us } : {}),
    },
  });
}

function toSeriesPayload(series: {
  id: bigint;
  title: string | null;
  startYear: bigint;
  endYear: bigint | null;
  volume: bigint;
  genre: string;
  addInfo: string;
  publisher: { id: bigint; name: string; original: boolean } | null;
}) {
  return {
    id: String(series.id),
    title: series.title || "",
    startyear: Number(series.startYear),
    endyear: series.endYear === null ? null : Number(series.endYear),
    volume: Number(series.volume),
    genre: series.genre,
    addinfo: series.addInfo,
    publisher: series.publisher
      ? {
          id: String(series.publisher.id),
          name: series.publisher.name,
          us: series.publisher.original,
        }
      : undefined,
  };
}

function normalizeText(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}

function normalizeYear(value: unknown) {
  if (value === null || value === undefined || value === "") return BigInt(0);
  return BigInt(Number(value ?? 0));
}
