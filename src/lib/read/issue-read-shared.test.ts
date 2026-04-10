import { pickIssuePreviewStorySource } from "./issue-read-shared";

describe("pickIssuePreviewStorySource", () => {
  it("should_prefer_story_bearing_sibling_when_variant_has_no_stories", () => {
    const mainIssue = {
      id: 1,
      format: "Heft",
      variant: null,
      stories: [{ id: 101 }],
    };
    const formatVariant = {
      id: 2,
      format: "Hardcover",
      variant: null,
      stories: [],
    };

    const result = pickIssuePreviewStorySource([mainIssue, formatVariant], formatVariant);

    expect(result).toBe(mainIssue);
  });

  it("should_keep_current_issue_when_it_already_has_stories", () => {
    const mainIssue = {
      id: 1,
      format: "Heft",
      variant: null,
      stories: [{ id: 101 }],
    };
    const formatVariant = {
      id: 2,
      format: "Hardcover",
      variant: null,
      stories: [{ id: 202 }],
    };

    const result = pickIssuePreviewStorySource([mainIssue, formatVariant], formatVariant);

    expect(result).toBe(formatVariant);
  });
});
