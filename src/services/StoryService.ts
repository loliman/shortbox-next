import { prisma } from "../lib/prisma/client";

type StoryRow = Awaited<ReturnType<typeof prisma.story.findFirst>>;

export class StoryService {
  constructor(private requestId?: string) {
    void this.requestId;
  }

  async getStoriesByIds(ids: readonly number[]) {
    if (ids.length === 0) return [];

    const rows = await prisma.story.findMany({
      where: {
        id: {
          in: ids.map((id) => BigInt(id)),
        },
      },
      orderBy: [{ id: "asc" }],
    });

    const byId = new Map(rows.map((story) => [Number(story.id), story]));
    return ids.map((id) => byId.get(id) ?? null);
  }

  async getChildrenByParentIds(parentIds: readonly number[]) {
    if (parentIds.length === 0) return [];

    const rows = await prisma.story.findMany({
      where: {
        fkParent: {
          in: parentIds.map((id) => BigInt(id)),
        },
      },
      orderBy: [{ id: "asc" }],
    });

    const grouped = new Map<number, StoryRow[]>();
    for (const story of rows) {
      const parentId = Number(story.fkParent);
      const current = grouped.get(parentId) || [];
      current.push(story);
      grouped.set(parentId, current);
    }

    return parentIds.map((parentId) => grouped.get(parentId) ?? []);
  }

  async getReprintsByStoryIds(storyIds: readonly number[]) {
    if (storyIds.length === 0) return [];

    const rows = await prisma.story.findMany({
      where: {
        fkReprint: {
          in: storyIds.map((id) => BigInt(id)),
        },
      },
      orderBy: [{ id: "asc" }],
    });

    const grouped = new Map<number, StoryRow[]>();
    for (const story of rows) {
      const reprintId = Number(story.fkReprint);
      const current = grouped.get(reprintId) || [];
      current.push(story);
      grouped.set(reprintId, current);
    }

    return storyIds.map((storyId) => grouped.get(storyId) ?? []);
  }
}
