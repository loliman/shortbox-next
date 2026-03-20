import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { deleteIssueByLookup } from "./issues-write";

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

export async function createSeries(item: SeriesInput) {
  const publisher = await findPublisher(item.publisher, prisma);
  if (!publisher) throw new Error("Publisher not found");

  const now = new Date();
  const created = await prisma.series.create({
    data: {
      title: normalizeText(item.title),
      startYear: BigInt(Number(item.startyear ?? 0)),
      endYear: normalizeYear(item.endyear),
      volume: BigInt(Number(item.volume ?? 0)),
      genre: normalizeGenre(item.genre),
      addInfo: String(item.addinfo || ""),
      fkPublisher: publisher.id,
      createdAt: now,
      updatedAt: now,
    },
    include: {
      publisher: true,
    },
  });

  return toSeriesPayload(created);
}

export async function editSeries(oldItem: SeriesInput, item: SeriesInput) {
  const oldPublisher = await findPublisher(oldItem.publisher, prisma);
  if (!oldPublisher) throw new Error("Publisher not found");

  const existing = await prisma.series.findFirst({
    where: {
      title: normalizeText(oldItem.title),
      volume: BigInt(Number(oldItem.volume ?? 0)),
      fkPublisher: oldPublisher.id,
    },
  });

  if (!existing) throw new Error("Series not found");

  const newPublisher = await findPublisher(item.publisher, prisma);
  if (!newPublisher) throw new Error("Publisher not found");

  const updated = await prisma.series.update({
    where: {
      id: existing.id,
    },
    data: {
      title: normalizeText(item.title),
      volume: BigInt(Number(item.volume ?? 0)),
      startYear: BigInt(Number(item.startyear ?? 0)),
      endYear: normalizeYear(item.endyear),
      genre: normalizeGenre(item.genre),
      addInfo: String(item.addinfo || ""),
      fkPublisher: newPublisher.id,
      updatedAt: new Date(),
    },
    include: {
      publisher: true,
    },
  });

  return toSeriesPayload(updated);
}

export async function deleteSeriesByLookup(item: SeriesInput, executor: PrismaExecutor = prisma) {
  const publisher = await findPublisher(item.publisher, executor);
  if (!publisher) throw new Error("Publisher not found");

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

  if (!series) throw new Error("Series not found");

  for (const issue of series.issues) {
    await deleteIssueByLookup(
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
  }

  await executor.series.delete({
    where: {
      id: series.id,
    },
  });

  return true;
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
  genre: string | null;
  addInfo: string;
  publisher: { id: bigint; name: string; original: boolean } | null;
}) {
  return {
    id: String(series.id),
    title: series.title || "",
    startyear: Number(series.startYear),
    endyear: series.endYear === null ? null : Number(series.endYear),
    volume: Number(series.volume),
    genre: series.genre || "",
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
  return String(value || "").trim();
}

function normalizeGenre(value: unknown) {
  const text = String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(", ");
  return text || "";
}

function normalizeYear(value: unknown) {
  if (value === null || value === undefined || value === "") return BigInt(0);
  return BigInt(Number(value || 0));
}
