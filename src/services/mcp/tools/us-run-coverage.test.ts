import { compactNumberRanges } from "../range-formatter";

describe("us-run-coverage range compaction", () => {
  it("should correctly group contiguous numbers for coverage display", () => {
    const collected = ["200", "201", "202", "205", "210", "211", "212"];
    expect(compactNumberRanges(collected)).toBe("#200-202, #205, #210-212");
  });

  it("should handle empty or single gaps cleanly", () => {
    expect(compactNumberRanges([])).toBe("Keine");
    expect(compactNumberRanges(["15"])).toBe("#15");
  });
});
