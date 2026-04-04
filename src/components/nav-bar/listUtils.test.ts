/** @jest-environment jsdom */


jest.mock("../../graphql/queriesTyped", () => ({
  getListQuery: jest.fn(() => ({
    definitions: [
      {
        kind: "OperationDefinition",
        operation: "query",
        name: { kind: "Name", value: "Issues" },
        selectionSet: {
          kind: "SelectionSet",
          selections: [{ kind: "Field", name: { kind: "Name", value: "issueList" } }],
        },
      },
    ],
  })),
}), { virtual: true });

import { HierarchyLevel } from "../../lib/routes/hierarchy";
import {
  getItemKey,
  normalizeListLevelAndSelected,
  parseFilter,
  scrollToSelectedIssue,
  toNodeList,
} from "./listUtils";

describe("listUtils", () => {
  it("parses filter JSON safely", () => {
    expect(parseFilter('{"us":true}')).toEqual({ us: true });
    expect(parseFilter("invalid")).toBeUndefined();
    expect(parseFilter(undefined)).toBeUndefined();
  });

  it("keeps parseFilter legacy normalization behavior", () => {
    expect(parseFilter('{"formats":["HC"]}')).toEqual({ formats: ["HC"] });
    expect(parseFilter('{"arcs":"A || B","appearances":"X || X","realities":"R || S"}')).toEqual({
      arcs: [{ title: "A" }, { title: "B" }],
      appearances: [{ name: "X" }],
      realities: "R || S",
    });
  });

  it("normalizes issue level to series list selection", () => {
    const normalized = normalizeListLevelAndSelected(HierarchyLevel.ISSUE, {
      issue: {
        number: "1",
        series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel" } },
      },
    } as any);

    expect(normalized.level).toBe(HierarchyLevel.SERIES);
    expect(normalized.selected).toEqual({
      series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel" } },
    });

    const noSeries = normalizeListLevelAndSelected(HierarchyLevel.ISSUE, {
      issue: { number: "2" },
    } as any);
    expect(noSeries.level).toBe(HierarchyLevel.SERIES);
    expect(noSeries.selected).toEqual({ number: "2" });

    const unchanged = normalizeListLevelAndSelected(HierarchyLevel.PUBLISHER, {
      publisher: { name: "Marvel" },
    } as any);
    expect(unchanged).toEqual({
      level: HierarchyLevel.PUBLISHER,
      selected: { publisher: { name: "Marvel" } },
    });
  });

  it("normalizes node lists from arrays and connections", () => {
    expect(toNodeList({ issues: [{ number: "1" }] }, "issues")).toEqual([{ number: "1" }]);
    expect(
      toNodeList(
        {
          issues: {
            edges: [{ node: { number: "2" } }, null],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
        "issues"
      )
    ).toEqual([{ number: "2" }]);
    expect(toNodeList({}, "issues")).toBeNull();
    expect(toNodeList({ issues: { foo: "bar" } }, "issues")).toBeNull();
  });

  it("builds stable keys for issue/series/publisher/fallback", () => {
    expect(
      getItemKey(
        {
          number: "1",
          format: "Heft",
          variant: "A",
          series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel" } },
        } as any,
        0
      )
    ).toContain("issue|Marvel|Spider-Man|1|1|Heft|A");
    expect(
      getItemKey({ title: "Spider-Man", volume: 1, publisher: { name: "Marvel" } } as any, 2)
    ).toContain("series|Marvel|Spider-Man|1");
    expect(getItemKey({ name: "Marvel" } as any, 4)).toContain("publisher|Marvel");
    expect(getItemKey({} as any, 9)).toBe("entry|9");
  });

  it("scrolls to selected issue row when found", () => {
    const listElement = document.createElement("ul");
    const item = document.createElement("li");
    item.setAttribute("data-item-index", "1");
    const scrollIntoView = jest.fn();
    Object.defineProperty(item, "scrollIntoView", { value: scrollIntoView });
    listElement.appendChild(item);

    scrollToSelectedIssue(
      { issueList: [{ number: "100" }, { number: "101" }] },
      HierarchyLevel.SERIES,
      { issue: { number: "101" } } as any,
      listElement
    );

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  });
});
