import { pickFirstOriginalStoryCoverReference, pickIssuePreviewStorySource } from "./issue-read-shared";

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

describe("pickFirstOriginalStoryCoverReference", () => {
  it("should_prefer_parent_issue_cover_for_first_story_with_original_reference", () => {
    const stories = [
      {
        parent: {
          issue: {
            comicGuideId: null,
            covers: [{ url: "https://example.com/original-parent.jpg" }],
          },
        },
      },
    ];

    expect(pickFirstOriginalStoryCoverReference(stories)).toEqual({
      cover: { url: "https://example.com/original-parent.jpg" },
      comicguideid: null,
    });
  });

  it("should_fall_back_to_reprint_source_when_parent_is_missing", () => {
    const stories = [
      {
        reprint: {
          issue: {
            comicGuideId: "1234",
            covers: [],
          },
        },
      },
    ];

    expect(pickFirstOriginalStoryCoverReference(stories)).toEqual({
      cover: null,
      comicguideid: "1234",
    });
  });

  it("should_skip_stories_without_original_cover_reference", () => {
    const stories = [
      {
        parent: {
          issue: {
            comicGuideId: null,
            covers: [],
          },
        },
      },
      {
        reprint: {
          issue: {
            comicGuideId: null,
            covers: [{ url: "https://example.com/original-reprint.jpg" }],
          },
        },
      },
    ];

    expect(pickFirstOriginalStoryCoverReference(stories)).toEqual({
      cover: { url: "https://example.com/original-reprint.jpg" },
      comicguideid: null,
    });
  });

  it("should_return_null_when_no_original_story_cover_reference_exists", () => {
    expect(pickFirstOriginalStoryCoverReference([])).toBeNull();
  });
});
