import { searchDeepCatalog } from "./tools/search-deep-catalog";
import { auditPublicationHealth } from "./tools/audit-publication-health";
import { findUpgradeCandidates } from "./tools/upgrade-candidates";
import { analyzeUsRunCoverage } from "./tools/us-run-coverage";

describe("MCP Tools Live Database Integration", () => {
  it("should perform deep search across entities", async () => {
    const res = await searchDeepCatalog({ query: "Venom", limit: 3 });
    expect(res).toBeDefined();
    expect(res.query).toBe("Venom");
    expect(Array.isArray(res.characters)).toBe(true);
    expect(Array.isArray(res.arcs)).toBe(true);
  });

  it("should audit publication health and return valid health scores", async () => {
    const res = await auditPublicationHealth({ publisher_pattern: "BSV", limit: 5 });
    expect(res).toBeDefined();
    expect(res.summary.totalAudited).toBeGreaterThan(0);
    expect(res.issues.length).toBeGreaterThan(0);
    expect(res.issues[0].healthScore).toBeDefined();
  });

  it("should query upgrade candidates cleanly", async () => {
    const res = await findUpgradeCandidates({ limit: 5 });
    expect(res).toBeDefined();
    expect(Array.isArray(res.candidates)).toBe(true);
  });

  it("should analyze US run coverage with proper summary and number blocks", async () => {
    const res = await analyzeUsRunCoverage({
      us_series_title: "The Amazing Spider-Man",
      start_number: 200,
      end_number: 210,
    });
    expect(res).toBeDefined();
    if ("coverageSummary" in res) {
      expect(res.coverageSummary).toBeDefined();
      expect(res.numberBlocks).toBeDefined();
    }
  });
});
