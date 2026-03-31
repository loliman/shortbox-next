import { describe, expect, it } from "@jest/globals";
import {
  hasExplicitIssueVariantSelection,
  matchesIssueSelectionBySlug,
  type IssueSelectionInput,
} from "./issue-selection";

describe("issue-selection", () => {
  it("matches format-only SEO selections against hyphenated series titles", () => {
    const selection: IssueSelectionInput = {
      us: false,
      publisher: "Panini Marvel Icon",
      series: "Spider Man",
      startyear: 2004,
      volume: 2,
      number: "100",
      format: "Heft",
    };

    const candidate = {
      number: "100",
      format: "Heft",
      variant: null,
      series: {
        title: "Spider-Man",
        startYear: 2004,
        volume: 2,
        publisher: {
          name: "Panini Marvel Icon",
          original: false,
        },
      },
    };

    expect(matchesIssueSelectionBySlug(candidate, selection)).toBe(true);
  });

  it("matches a format-bearing issue when the route does not explicitly select a format", () => {
    const selection: IssueSelectionInput = {
      us: false,
      publisher: "Panini DC Vertigo Wildstorm",
      series: "DC Marvel Klassiker 1979 Superman Gegen Spider Man",
      startyear: 2026,
      volume: 1,
      number: "1",
    };

    const candidate = {
      number: "1",
      format: "Heft",
      variant: null,
      series: {
        title: "DC/Marvel-Klassiker 1979: Superman gegen Spider-Man",
        startYear: 2026,
        volume: 1,
        publisher: {
          name: "Panini DC Vertigo Wildstorm",
          original: false,
        },
      },
    };

    expect(matchesIssueSelectionBySlug(candidate, selection)).toBe(true);
  });

  it("does not match a base issue when a format-specific route is requested", () => {
    const selection: IssueSelectionInput = {
      us: false,
      publisher: "Panini Marvel Icon",
      series: "Spider Man",
      startyear: 2004,
      volume: 2,
      number: "100",
      format: "Heft",
    };

    const candidate = {
      number: "100",
      format: "",
      variant: null,
      series: {
        title: "Spider-Man",
        startYear: 2004,
        volume: 2,
        publisher: {
          name: "Panini Marvel Icon",
          original: false,
        },
      },
    };

    expect(matchesIssueSelectionBySlug(candidate, selection)).toBe(false);
  });

  it("ignores startyear when matching a route to a series", () => {
    const selection: IssueSelectionInput = {
      us: false,
      publisher: "Panini Marvel Icon",
      series: "Spider Man",
      startyear: 2004,
      volume: 2,
      number: "100",
      format: "Heft",
    };

    const candidate = {
      number: "100",
      format: "Heft",
      variant: null,
      series: {
        title: "Spider-Man",
        startYear: 2005,
        volume: 2,
        publisher: {
          name: "Panini Marvel Icon",
          original: false,
        },
      },
    };

    expect(matchesIssueSelectionBySlug(candidate, selection)).toBe(true);
  });

  it("matches variant values by slug equivalence (case/umlaut tolerant)", () => {
    const selection: IssueSelectionInput = {
      us: false,
      publisher: "Panini Marvel Icon",
      series: "Spider Man",
      startyear: 2004,
      volume: 2,
      number: "100",
      format: "Heft",
      variant: "Analph Comics Zuerich",
    };

    const candidate = {
      number: "100",
      format: "HEFT",
      variant: "Analph Comics Zürich",
      series: {
        title: "Spider-Man",
        startYear: 2004,
        volume: 2,
        publisher: {
          name: "Panini Marvel Icon",
          original: false,
        },
      },
    };

    expect(matchesIssueSelectionBySlug(candidate, selection)).toBe(true);
  });

  it("treats format or variant as an explicit variant selection", () => {
    expect(
      hasExplicitIssueVariantSelection({
        us: false,
        publisher: "Marvel",
        series: "Spider Man",
        volume: 1,
        number: "1",
        variant: "B",
      })
    ).toBe(true);

    expect(
      hasExplicitIssueVariantSelection({
        us: false,
        publisher: "Marvel",
        series: "Spider Man",
        volume: 1,
        number: "1",
        format: "Heft",
      })
    ).toBe(true);

    expect(
      hasExplicitIssueVariantSelection({
        us: false,
        publisher: "Marvel",
        series: "Spider Man",
        volume: 1,
        number: "1",
      })
    ).toBe(false);
  });
});
