import { StoryService } from "./story-service";

const readStoriesByIds = jest.fn();
const readStoriesByParentIds = jest.fn();
const readStoriesByReprintIds = jest.fn();

jest.mock("../lib/read/story-read", () => ({
  readStoriesByIds: (ids: readonly number[]) => readStoriesByIds(ids),
  readStoriesByParentIds: (ids: readonly number[]) => readStoriesByParentIds(ids),
  readStoriesByReprintIds: (ids: readonly number[]) => readStoriesByReprintIds(ids),
}));

describe("StoryService", () => {
  beforeEach(() => {
    readStoriesByIds.mockReset();
    readStoriesByParentIds.mockReset();
    readStoriesByReprintIds.mockReset();
  });

  it("returns stories in the requested id order and keeps null slots for missing ids", async () => {
    const first = { id: 2n, title: "Second Story" };
    const second = { id: 1n, title: "First Story" };
    readStoriesByIds.mockResolvedValue([first, second]);

    await expect(new StoryService().getStoriesByIds([1, 3, 2])).resolves.toEqual([
      second,
      null,
      first,
    ]);
    expect(readStoriesByIds).toHaveBeenCalledWith([1, 3, 2]);
  });

  it("groups children by parent id and preserves requested parent ordering", async () => {
    const a = { id: 10n, fkParent: 5n, title: "Child A" };
    const b = { id: 11n, fkParent: 7n, title: "Child B" };
    const c = { id: 12n, fkParent: 5n, title: "Child C" };
    readStoriesByParentIds.mockResolvedValue([a, b, c]);

    await expect(new StoryService().getChildrenByParentIds([7, 5, 9])).resolves.toEqual([
      [b],
      [a, c],
      [],
    ]);
    expect(readStoriesByParentIds).toHaveBeenCalledWith([7, 5, 9]);
  });

  it("groups reprints by original story id and short-circuits empty requests", async () => {
    const reprintA = { id: 20n, fkReprint: 2n, title: "Reprint A" };
    const reprintB = { id: 21n, fkReprint: 4n, title: "Reprint B" };
    readStoriesByReprintIds.mockResolvedValue([reprintA, reprintB]);

    await expect(new StoryService().getReprintsByStoryIds([4, 2, 8])).resolves.toEqual([
      [reprintB],
      [reprintA],
      [],
    ]);

    await expect(new StoryService().getStoriesByIds([])).resolves.toEqual([]);
    await expect(new StoryService().getChildrenByParentIds([])).resolves.toEqual([]);
    await expect(new StoryService().getReprintsByStoryIds([])).resolves.toEqual([]);

    expect(readStoriesByIds).not.toHaveBeenCalled();
  });
});
