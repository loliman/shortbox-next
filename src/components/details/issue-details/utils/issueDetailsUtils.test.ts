import {
  collectIssueArcs,
  compareIssueNumbers,
  getContainsItemKey,
  getTodayLocalDate,
  getVariantKey,
} from "./issueDetailsUtils";

describe("issueDetailsUtils", () => {
  it("returns local date at midnight", () => {
    const date = getTodayLocalDate();
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
    expect(date.getMilliseconds()).toBe(0);
  });

  it("collects US arcs from issue level and filters invalid entries", () => {
    const arcs = collectIssueArcs(
      {
        arcs: [{ title: "Maximum Carnage", type: "STORYARC" }, { title: "", type: "EVENT" }, null],
      } as never,
      true
    );

    expect(arcs).toEqual([{ title: "Maximum Carnage", type: "STORYARC" }]);
  });

  it("collects and deduplicates DE arcs from parent issue stories", () => {
    const arcs = collectIssueArcs(
      {
        stories: [
          {
            parent: {
              issue: {
                arcs: [
                  { title: "Maximum Carnage", type: "EVENT" },
                  { title: "Maximum Carnage", type: "EVENT" },
                ],
              },
            },
          },
          {
            parent: {
              issue: {
                arcs: [{ title: "Clone Saga", type: null }],
              },
            },
          },
        ],
      } as never,
      false
    );

    expect(arcs).toEqual([
      { title: "Maximum Carnage", type: "EVENT" },
      { title: "Clone Saga", type: "STORYARC" },
    ]);
  });

  it("builds stable keys for contains items and variants", () => {
    expect(getContainsItemKey({ __typename: "Story", number: "5" }, 1)).toBe("Story|5|1");
    expect(getContainsItemKey({}, 2)).toBe("item|2|2");

    expect(getVariantKey({ format: "HC", variant: "B", number: "10" }, 0)).toBe("HC|B|10");
    expect(getVariantKey({}, 3)).toBe("||3");
  });

  it("compares issue numbers numerically and naturally", () => {
    expect(compareIssueNumbers("10", "2")).toBe(8);
    expect(compareIssueNumbers("-1", "1")).toBeLessThan(0);
    expect(compareIssueNumbers("1/2", "1")).toBeLessThan(0);
    expect(compareIssueNumbers("½", "1")).toBeLessThan(0);
    expect(compareIssueNumbers("1A", "1B")).toBeLessThan(0);
  });
});
