import { parseStoryReferences } from "./story-reference-parser";

describe("story reference parser", () => {
  it("parses ranges and context segments with default volume 1", () => {
    const parsed = parseStoryReferences(
      "Strange Tales 110-111, 114-116, Amazing Spider-Man Annual 2"
    );

    expect(parsed.error).toBeUndefined();
    expect(parsed.references).toEqual([
      { seriesTitle: "Strange Tales", volume: 1, issueNumber: "110" },
      { seriesTitle: "Strange Tales", volume: 1, issueNumber: "111" },
      { seriesTitle: "Strange Tales", volume: 1, issueNumber: "114" },
      { seriesTitle: "Strange Tales", volume: 1, issueNumber: "115" },
      { seriesTitle: "Strange Tales", volume: 1, issueNumber: "116" },
      { seriesTitle: "Amazing Spider-Man", volume: 1, issueNumber: "Annual 2" },
    ]);
  });

  it("parses explicit volume markers", () => {
    const parsed = parseStoryReferences("Amazing Spider-Man Vol. 2 1-3");

    expect(parsed.error).toBeUndefined();
    expect(parsed.references).toEqual([
      { seriesTitle: "Amazing Spider-Man", volume: 2, issueNumber: "1" },
      { seriesTitle: "Amazing Spider-Man", volume: 2, issueNumber: "2" },
      { seriesTitle: "Amazing Spider-Man", volume: 2, issueNumber: "3" },
    ]);
  });

  it("supports annual ranges", () => {
    const parsed = parseStoryReferences("Amazing Spider-Man Annual 2-3");

    expect(parsed.error).toBeUndefined();
    expect(parsed.references).toEqual([
      { seriesTitle: "Amazing Spider-Man", volume: 1, issueNumber: "Annual 2" },
      { seriesTitle: "Amazing Spider-Man", volume: 1, issueNumber: "Annual 3" },
    ]);
  });

  it("returns an error when a continuation segment has no prior series", () => {
    const parsed = parseStoryReferences("114-146");

    expect(parsed.references).toEqual([]);
    expect(parsed.error).toContain('Segment 1');
  });
});
