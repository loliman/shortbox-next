import { getIssueLabel, getIssueUrl, getSeriesLabel } from "./issue-presentation";

describe("issue-presentation", () => {
  it("should_create_series_labels_with_optional_volume_and_year", () => {
    expect(getSeriesLabel()).toBe("");
    expect(
      getSeriesLabel({
        title: "Spider-Man",
        volume: 4,
        startyear: 2015,
      })
    ).toBe("Spider-Man (Vol. IV) (2015)");
  });

  it("should_create_issue_labels_with_and_without_series_context", () => {
    expect(getIssueLabel(null)).toBe("");
    expect(getIssueLabel({ number: "7" })).toBe("#7");
    expect(
      getIssueLabel({
        number: "7",
        series: { title: "Spider-Man", volume: 1, startyear: 1963 },
      })
    ).toBe("Spider-Man (Vol. I) (1963) #7");
  });

  it("should_build_fallback_issue_urls_when_required_parts_are_missing", () => {
    expect(getIssueUrl(undefined, true)).toBe("/us");
    expect(getIssueUrl({ number: "1" }, false)).toBe("/de");
  });

  it("should_build_issue_urls_with_format_and_variant_handling", () => {
    const baseIssue = {
      number: "1",
      series: {
        title: "Spider-Man",
        volume: 1,
        publisher: { name: "Marvel" },
      },
    };

    expect(getIssueUrl(baseIssue, false)).toBe("/de/marvel/spider-man-vol1/1");

    expect(
      getIssueUrl(
        {
          ...baseIssue,
          format: "HC",
          variant: "",
        },
        false
      )
    ).toBe("/de/marvel/spider-man-vol1/1/hc");

    expect(
      getIssueUrl(
        {
          ...baseIssue,
          format: "HC",
          variant: "B",
        },
        false
      )
    ).toBe("/de/marvel/spider-man-vol1/1/hc/b");
  });

  it("should_escape_percent_characters_safely_in_url_segments", () => {
    const url = getIssueUrl(
      {
        number: "1%",
        series: {
          title: "Spider%Man",
          volume: 2,
          publisher: { name: "Marvel 100%" },
        },
      },
      true
    );

    expect(url).toBe("/us/marvel-100/spiderman-vol2/1%25");
  });
});
