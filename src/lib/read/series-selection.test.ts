import { describe, expect, it } from "@jest/globals";
import { matchesSeriesSelectionBySlug, type SeriesSelectionInput } from "./series-selection";

describe("series-selection", () => {
  it("matches SEO series slug without startyear against hyphenated DB title", () => {
    const selection: SeriesSelectionInput = {
      us: false,
      publisher: "Hachette",
      series: "Die Marvel Superhelden Sammlung",
      volume: 1,
    };

    const candidate = {
      title: "Die Marvel-Superhelden-Sammlung",
      startYear: 0,
      volume: 1,
      publisher: {
        name: "Hachette",
        original: false,
      },
    };

    expect(matchesSeriesSelectionBySlug(candidate, selection)).toBe(true);
  });

  it("requires exact startyear when URL contains a year", () => {
    const selection: SeriesSelectionInput = {
      us: false,
      publisher: "Panini",
      series: "Spider Man",
      volume: 2,
      startyear: 2004,
    };

    const candidate = {
      title: "Spider-Man",
      startYear: 2005,
      volume: 2,
      publisher: {
        name: "Panini",
        original: false,
      },
    };

    expect(matchesSeriesSelectionBySlug(candidate, selection)).toBe(false);
  });
});

