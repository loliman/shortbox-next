import {
  isSeoFilterKind,
  parseSeoFilterRouteParts,
  parseSeoFilterRoutePathname,
} from "./seo-filter-route";

describe("seo-filter-route", () => {
  it("accepts only supported seo filter kinds", () => {
    expect(isSeoFilterKind("person")).toBe(true);
    expect(isSeoFilterKind("arc")).toBe(true);
    expect(isSeoFilterKind("appearance")).toBe(true);
    expect(isSeoFilterKind("genre")).toBe(true);
    expect(isSeoFilterKind("publisher")).toBe(false);
    expect(isSeoFilterKind(null)).toBe(false);
  });

  it("parses route parts and pathnames into kind/slug pairs", () => {
    expect(parseSeoFilterRouteParts(["de", "person", "stan-lee"])).toEqual({
      kind: "person",
      slug: "stan-lee",
    });
    expect(parseSeoFilterRoutePathname("/us/appearance/spider-man")).toEqual({
      kind: "appearance",
      slug: "spider-man",
    });
  });

  it("rejects incomplete or unsupported route shapes", () => {
    expect(parseSeoFilterRouteParts(["de", "publisher", "panini"])).toBeNull();
    expect(parseSeoFilterRouteParts(["de", "person"])).toBeNull();
    expect(parseSeoFilterRoutePathname("")).toBeNull();
    expect(parseSeoFilterRoutePathname(null)).toBeNull();
  });
});
