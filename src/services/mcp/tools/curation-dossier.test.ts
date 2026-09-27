import {
  normalizeCurationString,
  sanitizeComparisonTitle,
} from "../../../lib/read/mcp-curation-sources-read";

describe("mcp-curation-sources-read normalization", () => {
  it("should normalize strings case-insensitively and collapse whitespace", () => {
    expect(normalizeCurationString("  Spider - Man  ")).toBe("spider - man");
    expect(normalizeCurationString("DIE   SPINNE")).toBe("die spinne");
    expect(normalizeCurationString(null)).toBe("");
  });

  it("should sanitize comparison titles by stripping quotes and outer noise", () => {
    expect(sanitizeComparisonTitle('"Der Tag der Abrechnung"')).toBe("der tag der abrechnung");
    expect(sanitizeComparisonTitle('„Im Netz der Spinne“')).toBe("im netz der spinne");
    expect(sanitizeComparisonTitle("'Kraven greift an'")).toBe("kraven greift an");
  });

  it("should consider identical titles after normalization as consensus", () => {
    const t1 = sanitizeComparisonTitle("Der Goblin kehrt zurück!");
    const t2 = sanitizeComparisonTitle('  "der goblin kehrt zurück!"  ');
    expect(t1).toBe(t2);
  });
});
