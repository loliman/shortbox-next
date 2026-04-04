import type { RouteParams, SelectedRoot } from "../../types/domain";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageParams, normalizePageQuery } from "./page-state";

const getSelected = jest.fn();
const getHierarchyLevel = jest.fn();

jest.mock("./hierarchy", () => ({
  getSelected: (params: RouteParams, us: boolean) => getSelected(params, us),
  getHierarchyLevel: (selected: SelectedRoot) => getHierarchyLevel(selected),
}));

describe("page-state", () => {
  beforeEach(() => {
    getSelected.mockReset();
    getHierarchyLevel.mockReset();
  });

  it("normalizes page params by keeping first values and removing nullish entries", () => {
    expect(
      normalizePageParams({
        publisher: ["panini", "ignored"],
        series: "avengers",
        issue: undefined,
      })
    ).toEqual({
      publisher: "panini",
      series: "avengers",
    });
  });

  it("normalizes page query by keeping first values and returning null for empty input", () => {
    expect(
      normalizePageQuery({
        filter: ['{"onlyCollected":true}', "ignored"],
        from: "/de",
        tab: undefined,
      })
    ).toEqual({
      filter: '{"onlyCollected":true}',
      from: "/de",
    });

    expect(normalizePageQuery({})).toBeNull();
    expect(normalizePageQuery(null)).toBeNull();
  });

  it("builds selected roots from normalized params and forwards hierarchy level lookup", () => {
    const selected = { publisher: { name: "Panini" } } as SelectedRoot;
    getSelected.mockReturnValue(selected);
    getHierarchyLevel.mockReturnValue("series");

    expect(
      buildSelectedRoot(
        {
          publisher: ["panini", "ignored"],
          series: "avengers",
        },
        false
      )
    ).toBe(selected);
    expect(getSelected).toHaveBeenCalledWith(
      {
        publisher: "panini",
        series: "avengers",
      },
      false
    );

    expect(buildHierarchyLevel(selected)).toBe("series");
    expect(getHierarchyLevel).toHaveBeenCalledWith(selected);
  });
});
