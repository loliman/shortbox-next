import {
  coerceReleaseDateForDb,
  normalizeBigInt,
  normalizeDbIds,
  normalizeFloat,
  normalizeOptionalText,
  normalizeStoryTitleKey,
  normalizeText,
  normalizeTypeList,
} from "./issues-write-shared";

describe("issues-write-shared", () => {
  it("should_normalize_text_values", () => {
    expect(normalizeText("  Spider-Man  ")).toBe("Spider-Man");
    expect(normalizeText(null)).toBe("");
  });

  it("should_normalize_optional_text_values", () => {
    expect(normalizeOptionalText("  HC ")).toBe("HC");
    expect(normalizeOptionalText("   ")).toBeNull();
  });

  it("should_normalize_bigint_values", () => {
    expect(normalizeBigInt("12")).toBe(BigInt(12));
    expect(normalizeBigInt(12.9)).toBe(BigInt(12));
    expect(normalizeBigInt("abc")).toBeNull();
  });

  it("should_normalize_float_values", () => {
    expect(normalizeFloat("12,5")).toBe(12.5);
    expect(normalizeFloat(4.25)).toBe(4.25);
    expect(normalizeFloat("abc")).toBeNull();
  });

  it("should_normalize_type_lists", () => {
    expect(normalizeTypeList([" Writer ", "", "Editor"])).toEqual(["Writer", "Editor"]);
    expect(normalizeTypeList("Artist")).toEqual(["Artist"]);
    expect(normalizeTypeList(null)).toEqual([]);
  });

  it("should_normalize_db_ids", () => {
    expect(normalizeDbIds([1, 2, 2, 0, -1, 3.8])).toEqual([1, 2, 3]);
  });

  it("should_normalize_story_title_keys", () => {
    expect(normalizeStoryTitleKey(" Spider-Man: Blue! ")).toBe("spider man blue");
  });

  it("should_coerce_release_dates_for_db", () => {
    expect(coerceReleaseDateForDb("2026-04-03")?.toISOString()).toBe("2026-04-03T00:00:00.000Z");
    expect(coerceReleaseDateForDb("invalid")).toBeNull();
  });
});
