import type { PrismaClient, Prisma } from "@prisma/client";
import {
  normalizeText,
  normalizeTypeList,
} from "./issues-write-shared";

type PrismaExecutor = Prisma.TransactionClient | PrismaClient;

type StoryIndividualInput = {
  name?: string | null;
  type?: string | string[] | null;
};

type StoryAppearanceInput = {
  name?: string | null;
  type?: string | null;
  role?: string | null;
};

type CrawledNamedType = {
  name?: string;
  type?: string | string[];
};

type CrawledArcLike = {
  title?: string;
  type?: string;
};

async function findOrCreateIndividual(name: string, executor: PrismaExecutor) {
  let individual = await executor.individual.findFirst({ where: { name } });
  individual ??= await executor.individual.create({
    data: {
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return individual;
}

export async function linkStoryIndividuals(
  storyId: number,
  individuals: StoryIndividualInput[],
  executor: PrismaExecutor
) {
  for (const entry of individuals) {
    const name = normalizeText(entry?.name);
    if (!name) continue;

    const individual = await findOrCreateIndividual(name, executor);

    for (const type of normalizeTypeList(entry?.type)) {
      await executor.storyIndividual.create({
        data: {
          fkStory: BigInt(storyId),
          fkIndividual: individual.id,
          type,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }
}

export async function linkStoryAppearances(
  storyId: number,
  appearances: StoryAppearanceInput[],
  executor: PrismaExecutor
) {
  for (const entry of appearances) {
    const name = normalizeText(entry?.name);
    const type = normalizeText(entry?.type);
    const role = normalizeText(entry?.role);
    if (!name || !type) continue;

    let appearance = await executor.appearance.findFirst({
      where: {
        name,
        type,
      },
    });
    appearance ??= await executor.appearance.create({
      data: {
        name,
        type,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await executor.storyAppearance.create({
      data: {
        fkStory: BigInt(storyId),
        fkAppearance: appearance.id,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}

export async function linkIssueIndividuals(
  issueId: bigint,
  individuals: CrawledNamedType[],
  executor: PrismaExecutor
) {
  for (const entry of individuals) {
    const name = normalizeText(entry?.name);
    if (!name) continue;

    const individual = await findOrCreateIndividual(name, executor);

    for (const type of normalizeTypeList(entry?.type)) {
      const existingLink = await executor.issueIndividual.findFirst({
        where: {
          fkIssue: issueId,
          fkIndividual: individual.id,
          type,
        },
      });

      if (existingLink) {
        await executor.issueIndividual.updateMany({
          where: {
            fkIssue: issueId,
            fkIndividual: individual.id,
            type,
          },
          data: {
            updatedAt: new Date(),
          },
        });
        continue;
      }

      await executor.issueIndividual.create({
        data: {
          fkIssue: issueId,
          fkIndividual: individual.id,
          type,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }
}

export async function linkCoverIndividuals(
  coverId: bigint,
  individuals: CrawledNamedType[],
  executor: PrismaExecutor
) {
  for (const entry of individuals) {
    const name = normalizeText(entry?.name);
    if (!name) continue;

    const individual = await findOrCreateIndividual(name, executor);

    for (const type of normalizeTypeList(entry?.type)) {
      const existingLink = await executor.coverIndividual.findFirst({
        where: {
          fkCover: coverId,
          fkIndividual: individual.id,
          type,
        },
      });

      if (existingLink) {
        await executor.coverIndividual.updateMany({
          where: {
            fkCover: coverId,
            fkIndividual: individual.id,
            type,
          },
          data: {
            updatedAt: new Date(),
          },
        });
        continue;
      }

      await executor.coverIndividual.create({
        data: {
          fkCover: coverId,
          fkIndividual: individual.id,
          type,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }
}

export async function linkIssueArcs(
  issueId: bigint,
  arcs: CrawledArcLike[],
  executor: PrismaExecutor
) {
  for (const rawArc of arcs) {
    const title = normalizeText(rawArc?.title);
    const type = normalizeText(rawArc?.type);
    if (!title || !type) continue;

    let arc = await executor.arc.findFirst({
      where: {
        title,
        type,
      },
    });

    arc ??= await executor.arc.create({
      data: {
        title,
        type,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const existingLink = await executor.issueArc.findFirst({
      where: {
        fkIssue: issueId,
        fkArc: arc.id,
      },
    });

    if (existingLink) {
      await executor.issueArc.updateMany({
        where: {
          fkIssue: issueId,
          fkArc: arc.id,
        },
        data: {
          updatedAt: new Date(),
        },
      });
      continue;
    }

    await executor.issueArc.create({
      data: {
        fkIssue: issueId,
        fkArc: arc.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
