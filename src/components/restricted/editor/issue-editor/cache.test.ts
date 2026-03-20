import { beforeEach, describe, expect, it, vi } from "vitest";

const addToCache = vi.fn();
const removeFromCache = vi.fn();
const updateInCache = vi.fn();

vi.mock("../Editor", () => ({
  addToCache: (...args: unknown[]) => addToCache(...args),
  removeFromCache: (...args: unknown[]) => removeFromCache(...args),
  updateInCache: (...args: unknown[]) => updateInCache(...args),
}));

vi.mock("../../../../graphql/queriesTyped", () => ({
  issue: { kind: "Document" },
  issues: { kind: "Document" },
}));

import { updateIssueEditorCache } from "./cache";

describe("updateIssueEditorCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates edit flow caches and list cache", () => {
    updateIssueEditorCache(
      {} as any,
      {
        editIssue: {
          title: "Issue 1",
          number: "1",
          format: "Heft",
          variant: "A",
          series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel", us: false } },
        },
      },
      "editIssue",
      true,
      {
        title: "",
        series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel", us: false } },
        number: "1",
        variant: "A",
        cover: "",
        format: "Heft",
        releasedate: "2026-01-01",
        individuals: [],
        addinfo: "",
        stories: [],
      } as any
    );

    expect(updateInCache).toHaveBeenCalledTimes(2);
    expect(removeFromCache).toHaveBeenCalledTimes(1);
    expect(addToCache).toHaveBeenCalledTimes(1);
  });

  it("remains resilient when cache helper calls throw", () => {
    updateInCache.mockImplementationOnce(() => {
      throw new Error("update fail");
    });
    removeFromCache.mockImplementationOnce(() => {
      throw new Error("remove fail");
    });
    addToCache.mockImplementationOnce(() => {
      throw new Error("add fail");
    });

    expect(() =>
      updateIssueEditorCache(
        {} as any,
        {
          createIssue: {
            title: "Issue 2",
            number: "2",
            format: "Heft",
            variant: "",
            series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel" } },
          },
        },
        "createIssue",
        false,
        {
          title: "",
          series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel", us: false } },
          number: "2",
          variant: "",
          cover: "",
          format: "Heft",
          releasedate: "2026-01-01",
          individuals: [],
          addinfo: "",
          stories: [],
        } as any
      )
    ).not.toThrow();
  });

  it("handles missing publisher and edit cache helper failures", () => {
    updateInCache.mockImplementation(() => {
      throw new Error("update fail");
    });
    removeFromCache.mockImplementation(() => {
      throw new Error("remove fail");
    });
    addToCache.mockImplementationOnce(() => {
      throw new Error("add fail");
    });

    expect(() =>
      updateIssueEditorCache(
        {} as any,
        {
          editIssue: {
            title: "Issue 3",
            number: "3",
            format: "Heft",
            variant: "C",
            series: { title: "Spider-Man", volume: 1 },
          },
        },
        "editIssue",
        true,
        {
          title: "",
          series: { title: "Spider-Man", volume: 1 },
          number: "3",
          variant: "",
          cover: "",
          format: "",
          releasedate: "2026-01-01",
          individuals: [],
          addinfo: "",
          stories: [],
        } as any
      )
    ).not.toThrow();

    expect(updateInCache).toHaveBeenCalledTimes(2);
    expect(removeFromCache).toHaveBeenCalledTimes(1);
    expect(addToCache).toHaveBeenCalledTimes(1);
  });
});
