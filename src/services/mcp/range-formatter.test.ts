import { compactNumberRanges } from "./range-formatter";

describe("compactNumberRanges", () => {
  it("should return 'Keine' when list is empty", () => {
    expect(compactNumberRanges([])).toBe("Keine");
  });

  it("should format single numbers and small lists correctly", () => {
    expect(compactNumberRanges(["1"])).toBe("#1");
    expect(compactNumberRanges(["1", "2"])).toBe("#1, #2");
  });

  it("should collapse contiguous integer ranges of 3 or more", () => {
    expect(compactNumberRanges(["1", "2", "3"])).toBe("#1-3");
    expect(compactNumberRanges(["1", "2", "3", "4", "5"])).toBe("#1-5");
  });

  it("should sort unordered input and handle mixed gaps", () => {
    const input = ["10", "1", "3", "2", "5", "8", "9", "7"];
    // sorted: 1, 2, 3, 5, 7, 8, 9, 10
    // ranges: #1-3, #5, #7-10
    expect(compactNumberRanges(input)).toBe("#1-3, #5, #7-10");
  });

  it("should preserve non-integer tokens at the end", () => {
    const input = ["1", "2", "3", "Special 1", "Annual #2"];
    expect(compactNumberRanges(input)).toBe("#1-3, Special 1, Annual #2");
  });
});
