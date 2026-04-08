import { parseStoryReferences } from "./story-reference-parser";

describe("parseStoryReferences", () => {
  it("should_expand_contextual_issue_lists_for_the_same_series", () => {
    const parsed = parseStoryReferences("Amazing Spider-Man 2, 50, 100-102, 300, 500");

    expect(parsed.error).toBeUndefined();
    expect(parsed.references).toEqual([
      { seriesTitle: "Amazing Spider-Man", volume: 1, issueNumber: "2" },
      { seriesTitle: "Amazing Spider-Man", volume: 1, issueNumber: "50" },
      { seriesTitle: "Amazing Spider-Man", volume: 1, issueNumber: "100" },
      { seriesTitle: "Amazing Spider-Man", volume: 1, issueNumber: "101" },
      { seriesTitle: "Amazing Spider-Man", volume: 1, issueNumber: "102" },
      { seriesTitle: "Amazing Spider-Man", volume: 1, issueNumber: "300" },
      { seriesTitle: "Amazing Spider-Man", volume: 1, issueNumber: "500" },
    ]);
  });

  it("should_parse_mixed_reference_lists_in_issue_editor_format", () => {
    const parsed = parseStoryReferences(
      "Action Comics 252, Superboy 80, Action Comics 291, Supergirl (1972) 1, Supergirl: Rebirth 1"
    );

    expect(parsed.error).toBeUndefined();
    expect(parsed.references).toEqual([
      { seriesTitle: "Action Comics", volume: 1, issueNumber: "252" },
      { seriesTitle: "Superboy", volume: 1, issueNumber: "80" },
      { seriesTitle: "Action Comics", volume: 1, issueNumber: "291" },
      { seriesTitle: "Supergirl (1972)", volume: 1, issueNumber: "1" },
      { seriesTitle: "Supergirl: Rebirth", volume: 1, issueNumber: "1" },
    ]);
  });
});
