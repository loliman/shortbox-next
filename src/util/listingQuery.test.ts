import {
  buildSortNavigationQuery,
  DEFAULT_DIRECTION,
  DEFAULT_ORDER,
  getListingDirection,
  getListingOrder,
  parseListingFilter,
} from "./listingQuery";

describe("listingQuery util", () => {
  it("falls back to { us } when filter is missing or invalid", () => {
    expect(parseListingFilter(null, true)).toEqual({ us: true });
    expect(parseListingFilter({ filter: "{invalid" }, false)).toEqual({ us: false });
    expect(parseListingFilter({ filter: '"hello"' }, true)).toEqual({ us: true });
  });

  it("parses JSON filter and always enforces current us flag", () => {
    const result = parseListingFilter(
      {
        filter: JSON.stringify({ formats: ["HC"], us: false }),
      },
      true
    );

    expect(result).toEqual({
      formats: ["HC"],
      arcs: [],
      appearances: [],
      realities: [],
      us: true,
    });
  });

  it("returns configured order/direction or defaults", () => {
    expect(getListingOrder(undefined)).toBe(DEFAULT_ORDER);
    expect(getListingDirection(undefined)).toBe(DEFAULT_DIRECTION);

    expect(getListingOrder({ order: "number" })).toBe("number");
    expect(getListingDirection({ direction: "ASC" })).toBe("ASC");
  });

  it("builds sort navigation query by patching only provided keys", () => {
    const query = {
      filter: '{"foo":"bar"}',
      order: "updatedat",
      direction: "DESC",
    };

    expect(buildSortNavigationQuery(query, { order: "number" })).toEqual({
      filter: '{"foo":"bar"}',
      order: "number",
      direction: "DESC",
    });

    expect(buildSortNavigationQuery(query, { direction: "ASC" })).toEqual({
      filter: '{"foo":"bar"}',
      order: "updatedat",
      direction: "ASC",
    });
  });
});
