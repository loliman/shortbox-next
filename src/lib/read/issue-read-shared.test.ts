import { pickFirstOriginalStoryCoverReference, pickIssuePreviewStorySource, sortLastEditedRows } from "./issue-read-shared";

describe("pickIssuePreviewStorySource", () => {
  it("should_prefer_story_bearing_sibling_when_variant_has_no_stories", () => {
    const mainIssue = {
      id: 1,
      format: "Heft",
      variantLabel: null,
      stories: [{ id: 101 }],
    };
    const formatVariant = {
      id: 2,
      format: "Hardcover",
      variantLabel: null,
      stories: [],
    };

    const result = pickIssuePreviewStorySource([mainIssue, formatVariant], formatVariant);

    expect(result).toBe(mainIssue);
  });

  it("should_keep_current_issue_when_it_already_has_stories", () => {
    const mainIssue = {
      id: 1,
      format: "Heft",
      variantLabel: null,
      stories: [{ id: 101 }],
    };
    const formatVariant = {
      id: 2,
      format: "Hardcover",
      variantLabel: null,
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
            variants: [{ comicGuideId: null, covers: [{ url: "https://example.com/original-parent.jpg" }] }],
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
            variants: [{ comicGuideId: "1234", covers: [] }],
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
            variants: [{ comicGuideId: null, covers: [] }],
          },
        },
      },
      {
        reprint: {
          issue: {
            variants: [{ comicGuideId: null, covers: [{ url: "https://example.com/original-reprint.jpg" }] }],
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

describe("sortLastEditedRows", () => {
  const issue1 = {
    id: 1n,
    fkSeries: 10n,
    number: "1",
    title: "Issue A",
    createdAt: new Date("2026-01-01T12:00:00Z"),
    updatedAt: new Date("2026-01-02T12:00:00Z"),
    series: { title: "Series A", volume: 1n, publisher: { name: "Publisher A" } },
    variants: [{ format: "Heft", variantLabel: "A", releaseDate: new Date("2026-01-03T12:00:00Z") }],
  };

  const issue2 = {
    id: 2n,
    fkSeries: 10n,
    number: "2",
    title: "Issue B",
    createdAt: new Date("2026-01-02T12:00:00Z"),
    updatedAt: new Date("2026-01-01T12:00:00Z"),
    series: { title: "Series A", volume: 1n, publisher: { name: "Publisher A" } },
    variants: [{ format: "Heft", variantLabel: "A", releaseDate: new Date("2026-01-02T12:00:00Z") }],
  };

  it("should_sort_by_updatedat_desc_by_default", () => {
    const sorted = sortLastEditedRows([issue2, issue1], "updatedat", "desc");
    expect(sorted[0].id).toBe(1n); // issue1 has later updatedAt
    expect(sorted[1].id).toBe(2n);
  });

  it("should_sort_by_createdat_asc", () => {
    const sorted = sortLastEditedRows([issue2, issue1], "createdat", "asc");
    expect(sorted[0].id).toBe(1n); // issue1 has earlier createdAt
    expect(sorted[1].id).toBe(2n);
  });

  it("should_sort_by_releasedate_desc", () => {
    const sorted = sortLastEditedRows([issue2, issue1], "releasedate", "desc");
    expect(sorted[0].id).toBe(1n); // issue1 has later releaseDate
    expect(sorted[1].id).toBe(2n);
  });
});
