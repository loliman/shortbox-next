import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";

type PrismaExecutor = Prisma.TransactionClient | PrismaClient;

type IssueInput = {
  number?: string;
  format?: string;
  variant?: string;
  series?: {
    title?: string;
    volume?: number;
    publisher?: {
      name?: string;
      us?: boolean;
    };
  };
};

export async function deleteIssueByLookup(item: IssueInput, executor: PrismaExecutor = prisma) {
  const runDelete = async (tx: PrismaExecutor) => {
    const publisher = await tx.publisher.findFirst({
      where: {
        name: normalizeText(item.series?.publisher?.name),
        ...(typeof item.series?.publisher?.us === "boolean"
          ? { original: item.series.publisher.us }
          : {}),
      },
    });
    if (!publisher) throw new Error("Publisher not found");

    const series = await tx.series.findFirst({
      where: {
        title: normalizeText(item.series?.title),
        volume: BigInt(Number(item.series?.volume ?? 0)),
        fkPublisher: publisher.id,
      },
    });
    if (!series) throw new Error("Series not found");

    const issue = await tx.issue.findFirst({
      where: {
        fkSeries: series.id,
        number: normalizeText(item.number),
        ...(normalizeText(item.format) ? { format: normalizeText(item.format) } : {}),
        variant: normalizeText(item.variant),
      },
    });
    if (!issue) throw new Error("Issue not found");

    const storyRows = await tx.story.findMany({
      where: {
        fkIssue: issue.id,
      },
      select: {
        id: true,
      },
    });
    const storyIds = storyRows.map((entry) => entry.id);

    const coverRows = await tx.cover.findMany({
      where: {
        fkIssue: issue.id,
      },
      select: {
        id: true,
      },
    });
    const coverIds = coverRows.map((entry) => entry.id);

    if (storyIds.length > 0) {
      await tx.story.updateMany({
        where: {
          fkParent: {
            in: storyIds,
          },
        },
        data: {
          fkParent: null,
        },
      });

      await tx.story.updateMany({
        where: {
          fkReprint: {
            in: storyIds,
          },
        },
        data: {
          fkReprint: null,
        },
      });

      await tx.storyAppearance.deleteMany({
        where: {
          fkStory: {
            in: storyIds,
          },
        },
      });

      await tx.storyIndividual.deleteMany({
        where: {
          fkStory: {
            in: storyIds,
          },
        },
      });

      await tx.story.deleteMany({
        where: {
          id: {
            in: storyIds,
          },
        },
      });
    }

    if (coverIds.length > 0) {
      await tx.cover.updateMany({
        where: {
          fkParent: {
            in: coverIds,
          },
        },
        data: {
          fkParent: null,
        },
      });

      await tx.coverIndividual.deleteMany({
        where: {
          fkCover: {
            in: coverIds,
          },
        },
      });

      await tx.cover.deleteMany({
        where: {
          id: {
            in: coverIds,
          },
        },
      });
    }

    await tx.issueArc.deleteMany({
      where: {
        fkIssue: issue.id,
      },
    });

    await tx.issueIndividual.deleteMany({
      where: {
        fkIssue: issue.id,
      },
    });

    await tx.changeRequest.deleteMany({
      where: {
        fkIssue: Number(issue.id),
      },
    });

    await tx.issue.delete({
      where: {
        id: issue.id,
      },
    });
  };

  if (executor === prisma) {
    await prisma.$transaction(async (tx) => {
      await runDelete(tx);
    });
  } else {
    await runDelete(executor);
  }

  return true;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}
