import "server-only";

import { prisma } from "../prisma/client";

export async function readStoriesByIds(ids: readonly number[]) {
  return prisma.story.findMany({
    where: {
      id: {
        in: ids.map(BigInt),
      },
    },
    orderBy: [{ id: "asc" }],
  });
}

export async function readStoriesByParentIds(parentIds: readonly number[]) {
  return prisma.story.findMany({
    where: {
      fkParent: {
        in: parentIds.map(BigInt),
      },
    },
    orderBy: [{ id: "asc" }],
  });
}

export async function readStoriesByReprintIds(storyIds: readonly number[]) {
  return prisma.story.findMany({
    where: {
      fkReprint: {
        in: storyIds.map(BigInt),
      },
    },
    orderBy: [{ id: "asc" }],
  });
}
