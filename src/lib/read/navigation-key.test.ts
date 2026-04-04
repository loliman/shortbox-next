import {
  getNavigationSeriesKey,
  matchesNavigationSeriesKey,
  parseNavigationSeriesKey,
} from "./navigation-key";

describe("navigation-key", () => {
  it("builds normalized navigation keys with optional startyear", () => {
    expect(
      getNavigationSeriesKey({
        publisher: "Panini Marvel & Icon",
        title: "Marvel Klassiker Avengers",
        volume: 1,
      })
    ).toBe("panini-marvel-icon|marvel-klassiker-avengers|1");

    expect(
      getNavigationSeriesKey({
        publisher: "Panini",
        title: "X-Men",
        volume: "2",
        startyear: 1991,
      })
    ).toBe("panini|x-men|2|1991");
  });

  it("parses navigation keys with or without explicit startyear and rejects incomplete keys", () => {
    expect(parseNavigationSeriesKey("panini|x-men|2|1991")).toEqual({
      publisher: "panini",
      title: "x-men",
      volume: "2",
      startyear: "1991",
    });

    expect(parseNavigationSeriesKey("panini|marvel-klassiker-avengers|1")).toEqual({
      publisher: "panini",
      title: "marvel-klassiker-avengers",
      volume: "1",
      startyear: "",
    });

    expect(parseNavigationSeriesKey("panini|missing-volume")).toBeNull();
    expect(parseNavigationSeriesKey("")).toBeNull();
    expect(parseNavigationSeriesKey(null as never)).toBeNull();
  });

  it("matches keys by normalized publisher/title/volume and only enforces startyear when present in the key", () => {
    expect(
      matchesNavigationSeriesKey("panini-marvel-icon|marvel-klassiker-avengers|1", {
        publisher: "Panini Marvel & Icon",
        title: "Marvel Klassiker Avengers",
        volume: 1,
        startyear: 2015,
      })
    ).toBe(true);

    expect(
      matchesNavigationSeriesKey("panini|x-men|2|1991", {
        publisher: "Panini",
        title: "X-Men",
        volume: 2,
        startyear: 1991,
      })
    ).toBe(true);

    expect(
      matchesNavigationSeriesKey("panini|x-men|2|1991", {
        publisher: "Panini",
        title: "X-Men",
        volume: 2,
        startyear: 1992,
      })
    ).toBe(false);
  });
});
