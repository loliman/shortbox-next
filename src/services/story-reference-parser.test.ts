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

  it("should_expand_ranges_starting_at_zero", () => {
    const parsed = parseStoryReferences("Civil War II (2016) 0-3");
    expect(parsed.error).toBeUndefined();
    expect(parsed.references).toEqual([
      { seriesTitle: "Civil War II (2016)", volume: 1, issueNumber: "0" },
      { seriesTitle: "Civil War II (2016)", volume: 1, issueNumber: "1" },
      { seriesTitle: "Civil War II (2016)", volume: 1, issueNumber: "2" },
      { seriesTitle: "Civil War II (2016)", volume: 1, issueNumber: "3" },
    ]);
  });

  it("should_parse_multipart_stories_in_single_issue", () => {
    const parsed = parseStoryReferences("Avengers 34 (I+II)");
    expect(parsed.error).toBeUndefined();
    expect(parsed.references).toEqual([
      { seriesTitle: "Avengers", volume: 1, issueNumber: "34" },
      { seriesTitle: "Avengers", volume: 1, issueNumber: "34" },
    ]);
  });

  it("should_parse_single_part_annotation", () => {
    const parsed = parseStoryReferences("War of the Realms: War Scrolls (2019) 3 (II)");
    expect(parsed.error).toBeUndefined();
    expect(parsed.references).toEqual([
      { seriesTitle: "War of the Realms: War Scrolls (2019)", volume: 1, issueNumber: "3" },
    ]);
  });

  it("should_handle_ampersand_connecting_issues_and_series", () => {
    const parsed = parseStoryReferences("Fantastic Four 5 & #258, FF Annual 2");
    expect(parsed.error).toBeUndefined();
    expect(parsed.references).toEqual([
      { seriesTitle: "Fantastic Four", volume: 1, issueNumber: "5" },
      { seriesTitle: "Fantastic Four", volume: 1, issueNumber: "258" },
      { seriesTitle: "FF", volume: 1, issueNumber: "Annual 2" },
    ]);
  });

  it("should_expand_ranges_with_spaces_around_dash", () => {
    const parsed = parseStoryReferences("Star Wars: Out of the Darkness 6 – 8");
    expect(parsed.error).toBeUndefined();
    expect(parsed.references).toEqual([
      { seriesTitle: "Star Wars: Out of the Darkness", volume: 1, issueNumber: "6" },
      { seriesTitle: "Star Wars: Out of the Darkness", volume: 1, issueNumber: "7" },
      { seriesTitle: "Star Wars: Out of the Darkness", volume: 1, issueNumber: "8" },
    ]);
  });
});
