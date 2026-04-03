import "server-only";

import { prisma } from "../prisma/client";
import { deleteSeriesByLookup } from "./series-write";
import { Result, success, failure } from "@/src/types/result";

type PublisherInput = {
  id?: string | number;
  name?: string;
  us?: boolean;
  addinfo?: string;
  startyear?: number;
  endyear?: number | null;
};

export async function createPublisher(item: PublisherInput): Promise<Result<ReturnType<typeof toPublisherPayload>>> {
  try {
    const now = new Date();
    const created = await prisma.publisher.create({
      data: {
        name: normalizeText(item.name),
        original: Boolean(item.us),
        addInfo: normalizeText(item.addinfo),
        startYear: BigInt(Number(item.startyear ?? 0)),
        endYear: normalizeYear(item.endyear),
        createdAt: now,
        updatedAt: now,
      },
    });

    return success(toPublisherPayload(created));
  } catch (error) {
    return failure(error as Error);
  }
}

export async function editPublisher(oldItem: PublisherInput, item: PublisherInput): Promise<Result<ReturnType<typeof toPublisherPayload>>> {
  try {
    const existing = await prisma.publisher.findFirst({
      where: {
        name: normalizeText(oldItem.name),
        ...(typeof oldItem.us === "boolean" ? { original: oldItem.us } : {}),
      },
    });

    if (!existing) {
      return failure("Publisher not found", 404);
    }

    const updated = await prisma.publisher.update({
      where: {
        id: existing.id,
      },
      data: {
        name: normalizeText(item.name),
        original: Boolean(item.us ?? existing.original),
        addInfo: normalizeText(item.addinfo),
        startYear: BigInt(Number(item.startyear ?? 0)),
        endYear: normalizeYear(item.endyear),
        updatedAt: new Date(),
      },
    });

    return success(toPublisherPayload(updated));
  } catch (error) {
    return failure(error as Error);
  }
}

export async function deletePublisherByLookup(item: PublisherInput): Promise<Result<boolean>> {
  try {
    const existing = await prisma.publisher.findFirst({
      where: {
        name: normalizeText(item.name),
        ...(typeof item.us === "boolean" ? { original: item.us } : {}),
      },
      include: {
        series: {
          orderBy: [{ id: "asc" }],
          include: {
            publisher: true,
          },
        },
      },
    });

    if (!existing) {
      return failure("Publisher not found", 404);
    }

    await prisma.$transaction(async (tx) => {
      for (const series of existing.series) {
        const deleted = await deleteSeriesByLookup(
          {
            title: series.title ?? "",
            volume: Number(series.volume),
            publisher: {
              name: existing.name,
              us: existing.original,
            },
          },
          tx
        );
        if (!deleted.success) throw new Error(deleted.error);
      }

      await tx.publisher.delete({
        where: {
          id: existing.id,
        },
      });
    });

    return success(true);
  } catch (error) {
    return failure(error as Error);
  }
}

function toPublisherPayload(publisher: {
  id: bigint;
  name: string;
  original: boolean;
  addInfo: string;
  startYear: bigint;
  endYear: bigint | null;
}) {
  return {
    id: String(publisher.id),
    name: publisher.name,
    us: publisher.original,
    addinfo: publisher.addInfo,
    startyear: Number(publisher.startYear),
    endyear: publisher.endYear === null ? null : Number(publisher.endYear),
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
