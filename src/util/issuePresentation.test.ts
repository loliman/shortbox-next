import { getIssueLabel, getIssueUrl, getSeriesLabel } from "./issuePresentation";

describe("issuePresentation util", () => {
  it("creates series labels with optional volume and year", () => {
    expect(getSeriesLabel()).toBe("");
    expect(
      getSeriesLabel({
        title: "Spider-Man",
        volume: 4,
        startyear: 2015,
      })
    ).toBe("Spider-Man (Vol. IV) (2015)");
  });

  it("creates issue labels with and without series context", () => {
    expect(getIssueLabel(null)).toBe("");
    expect(getIssueLabel({ number: "7" })).toBe("#7");
    expect(
      getIssueLabel({
        number: "7",
        series: { title: "Spider-Man", volume: 1, startyear: 1963 },
      })
    ).toBe("Spider-Man (Vol. I) (1963) #7");
  });

  it("builds fallback issue URLs when required parts are missing", () => {
    expect(getIssueUrl(undefined, true)).toBe("/us");
    expect(getIssueUrl({ number: "1" }, false)).toBe("/de");
  });

  it("builds issue URLs with format and variant handling", () => {
    const baseIssue = {
      number: "1",
      series: {
        title: "Spider-Man",
        volume: 1,
        publisher: { name: "Marvel" },
      },
    };

    expect(getIssueUrl(baseIssue, false)).toBe("/de/Marvel/Spider-Man_Vol_1/1");

    expect(
      getIssueUrl(
        {
          ...baseIssue,
          format: "HC",
          variant: "",
        },
        false
      )
    ).toBe("/de/Marvel/Spider-Man_Vol_1/1/HC");

    expect(
      getIssueUrl(
        {
          ...baseIssue,
          format: "HC",
          variant: "B",
        },
        false
      )
    ).toBe("/de/Marvel/Spider-Man_Vol_1/1/HC_B");
  });

  it("escapes percent characters safely in URL segments", () => {
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

    expect(url).toBe("/us/Marvel%20100%2525/Spider%2525Man_Vol_2/1%2525");
  });
});
