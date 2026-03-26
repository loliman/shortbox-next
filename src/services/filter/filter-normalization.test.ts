import {
  normalizeLegacyFilterPayload,
  parseAndNormalizeLegacyFilter,
} from "./filter-normalization";

describe("filter-normalization", () => {
  it("parses safely and returns undefined for invalid payloads", () => {
    expect(parseAndNormalizeLegacyFilter(undefined)).toBeUndefined();
    expect(parseAndNormalizeLegacyFilter("{invalid")).toBeUndefined();
    expect(parseAndNormalizeLegacyFilter('"hello"')).toBeUndefined();
  });

  it("normalizes shared legacy flags and cleanup keys", () => {
    const normalized = normalizeLegacyFilterPayload({
      noCover: true,
      onlyCollected: true,
      onlyNotCollected: true,
      sellable: true,
      and: true,
    });

    expect(normalized).toEqual({
      noComicguideId: true,
      onlyCollected: true,
      onlyNotCollected: false,
    });
  });

  it("supports string-only mode used by nav-bar parseFilter", () => {
    const normalized = normalizeLegacyFilterPayload(
      {
        arcs: "A || B || A",
        appearances: "X || Y",
        realities: "R || S",
      },
      { mode: "string-only", includeRealities: false }
    );

    expect(normalized).toEqual({
      arcs: [{ title: "A" }, { title: "B" }],
      appearances: [{ name: "X" }, { name: "Y" }],
      realities: "R || S",
    });
  });

  it("supports non-array mode used by listingQuery parseListingFilter", () => {
    const normalized = normalizeLegacyFilterPayload(
      {
        formats: ["HC"],
      },
      { mode: "non-array", includeRealities: true }
    );

    expect(normalized).toEqual({
      formats: ["HC"],
      arcs: [],
      appearances: [],
      realities: [],
    });
  });
});
