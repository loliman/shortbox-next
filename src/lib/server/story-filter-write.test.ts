import { deriveIssueAggregatesFromStories, parsePart } from "./story-filter-write";

type StoryShape = Parameters<typeof deriveIssueAggregatesFromStories>[0][number];

function story(overrides: Partial<StoryShape> = {}): StoryShape {
  return {
    firstApp: false,
    onlyApp: false,
    onlyTb: false,
    otherOnlyTb: false,
    onlyOnePrint: false,
    fkParent: 1n,
    ...overrides,
  };
}

describe("deriveIssueAggregatesFromStories", () => {
  it("should_return_all_false_when_story_list_is_empty", () => {
    const result = deriveIssueAggregatesFromStories([]);

    expect(result).toEqual({
      hasFirstPrint: false,
      hasOnlyPrint: false,
      hasOnlyTb: false,
      hasExclusiveStory: false,
      isReprintOnly: false,
      hasOtherOnlyTb: false,
      hasPrintStory: false,
      hasOnlyOnePrint: false,
    });
  });

  it("should_set_hasFirstPrint_when_any_story_has_firstApp_true", () => {
    const result = deriveIssueAggregatesFromStories([story({ firstApp: true }), story()]);

    expect(result.hasFirstPrint).toBe(true);
  });

  it("should_set_hasPrintStory_when_any_story_has_firstApp_or_onlyApp", () => {
    expect(deriveIssueAggregatesFromStories([story({ onlyApp: true })]).hasPrintStory).toBe(true);
    expect(deriveIssueAggregatesFromStories([story({ firstApp: true })]).hasPrintStory).toBe(true);
    expect(deriveIssueAggregatesFromStories([story()]).hasPrintStory).toBe(false);
  });

  it("should_set_hasExclusiveStory_when_any_story_has_null_fkParent", () => {
    expect(
      deriveIssueAggregatesFromStories([story({ fkParent: null }), story({ fkParent: 7n })])
        .hasExclusiveStory
    ).toBe(true);

    expect(
      deriveIssueAggregatesFromStories([story({ fkParent: 7n }), story({ fkParent: 8n })])
        .hasExclusiveStory
    ).toBe(false);
  });

  it("should_set_isReprintOnly_only_when_every_story_has_firstApp_false_and_list_not_empty", () => {
    expect(
      deriveIssueAggregatesFromStories([story({ firstApp: false }), story({ firstApp: false })])
        .isReprintOnly
    ).toBe(true);

    expect(
      deriveIssueAggregatesFromStories([story({ firstApp: true }), story({ firstApp: false })])
        .isReprintOnly
    ).toBe(false);

    expect(deriveIssueAggregatesFromStories([]).isReprintOnly).toBe(false);
  });

  it("should_set_hasOnlyTb_hasOtherOnlyTb_hasOnlyOnePrint_independently_per_story", () => {
    const result = deriveIssueAggregatesFromStories([
      story({ onlyTb: true }),
      story({ otherOnlyTb: true }),
      story({ onlyOnePrint: true }),
    ]);

    expect(result.hasOnlyTb).toBe(true);
    expect(result.hasOtherOnlyTb).toBe(true);
    expect(result.hasOnlyOnePrint).toBe(true);
  });

  it("should_combine_mixed_story_flags_into_consistent_aggregates", () => {
    const result = deriveIssueAggregatesFromStories([
      story({ firstApp: true, onlyTb: true, fkParent: null }),
      story({ onlyApp: true, otherOnlyTb: true, fkParent: 5n }),
      story({ onlyOnePrint: true, fkParent: 6n }),
    ]);

    expect(result).toEqual({
      hasFirstPrint: true,
      hasOnlyPrint: true,
      hasOnlyTb: true,
      hasExclusiveStory: true,
      isReprintOnly: false,
      hasOtherOnlyTb: true,
      hasPrintStory: true,
      hasOnlyOnePrint: true,
    });
  });
});

describe("parsePart", () => {
  it("should_return_null_for_empty_or_whitespace_values", () => {
    expect(parsePart(null)).toEqual({ partNumber: null, partTotal: null });
    expect(parsePart("")).toEqual({ partNumber: null, partTotal: null });
    expect(parsePart("   ")).toEqual({ partNumber: null, partTotal: null });
  });

  it("should_parse_valid_number_total_parts", () => {
    expect(parsePart("1/2")).toEqual({ partNumber: 1, partTotal: 2 });
    expect(parsePart("3/4")).toEqual({ partNumber: 3, partTotal: 4 });
    expect(parsePart(" 2 / 5 ")).toEqual({ partNumber: 2, partTotal: 5 });
  });

  it("should_parse_valid_x_total_parts", () => {
    expect(parsePart("1/x")).toEqual({ partNumber: 1, partTotal: null });
    expect(parsePart("2/X")).toEqual({ partNumber: 2, partTotal: null });
    expect(parsePart(" 3 / x ")).toEqual({ partNumber: 3, partTotal: null });
  });

  it("should_return_null_for_invalid_formats", () => {
    expect(parsePart("a/b")).toEqual({ partNumber: null, partTotal: null });
    expect(parsePart("1/")).toEqual({ partNumber: null, partTotal: null });
    expect(parsePart("/2")).toEqual({ partNumber: null, partTotal: null });
    expect(parsePart("1/2/3")).toEqual({ partNumber: null, partTotal: null });
  });
});
