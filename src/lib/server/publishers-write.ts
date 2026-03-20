import { prisma } from "../prisma/client";
import { deleteSeriesByLookup } from "./series-write";

type PublisherInput = {
  id?: string | number;
  name?: string;
  us?: boolean;
  addinfo?: string;
  startyear?: number;
  endyear?: number | null;
};

export async function createPublisher(item: PublisherInput) {
  const now = new Date();
  const created = await prisma.publisher.create({
    data: {
      name: normalizeText(item.name),
      original: Boolean(item.us),
      addInfo: String(item.addinfo || ""),
      startYear: BigInt(Number(item.startyear ?? 0)),
      endYear: normalizeYear(item.endyear),
      createdAt: now,
      updatedAt: now,
    },
  });

  return toPublisherPayload(created);
}

export async function editPublisher(oldItem: PublisherInput, item: PublisherInput) {
  const existing = await prisma.publisher.findFirst({
    where: {
      name: normalizeText(oldItem.name),
      ...(typeof oldItem.us === "boolean" ? { original: oldItem.us } : {}),
    },
  });

  if (!existing) {
    throw new Error("Publisher not found");
  }

  const updated = await prisma.publisher.update({
    where: {
      id: existing.id,
    },
    data: {
      name: normalizeText(item.name),
      original: Boolean(item.us ?? existing.original),
      addInfo: String(item.addinfo || ""),
      startYear: BigInt(Number(item.startyear ?? 0)),
      endYear: normalizeYear(item.endyear),
      updatedAt: new Date(),
    },
  });

  return toPublisherPayload(updated);
}

export async function deletePublisherByLookup(item: PublisherInput) {
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
    throw new Error("Publisher not found");
  }

  await prisma.$transaction(async (tx) => {
    for (const series of existing.series) {
      await deleteSeriesByLookup(
        {
          title: series.title || "",
          volume: Number(series.volume),
          publisher: {
            name: existing.name,
            us: existing.original,
          },
        },
        tx
      );
    }

    await tx.publisher.delete({
      where: {
        id: existing.id,
      },
    });
  });

  return true;
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
  return String(value || "").trim();
}

function normalizeYear(value: unknown) {
  if (value === null || value === undefined || value === "") return BigInt(0);
  return BigInt(Number(value || 0));
}
