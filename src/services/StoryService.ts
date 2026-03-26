import {
  readStoriesByIds,
  readStoriesByParentIds,
  readStoriesByReprintIds,
} from "../lib/read/story-read";

type StoryRow = Awaited<ReturnType<typeof readStoriesByIds>>[number];

export class StoryService {
  constructor(private requestId?: string) {
    void this.requestId;
  }

  async getStoriesByIds(ids: readonly number[]) {
    if (ids.length === 0) return [];

    const rows = await readStoriesByIds(ids);

    const byId = new Map(rows.map((story) => [Number(story.id), story]));
    return ids.map((id) => byId.get(id) ?? null);
  }

  async getChildrenByParentIds(parentIds: readonly number[]) {
    if (parentIds.length === 0) return [];

    const rows = await readStoriesByParentIds(parentIds);

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

    const rows = await readStoriesByReprintIds(storyIds);

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
