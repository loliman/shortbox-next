import {
  collapsePublisher,
  collapseSeries,
  emptyNavOpenState,
  expandPublisher,
  expandSeries,
  isPublisherExpanded,
  isSeriesExpanded,
  parseNavOpenState,
  readNavOpenStateFromQuery,
  serializeNavOpenState,
} from "./nav-open-state";

describe("nav-open-state", () => {
  it("parses serialized state, trims entries, and removes duplicates and invalid values", () => {
    expect(
      parseNavOpenState(
        JSON.stringify({
          publishers: [" Panini ", "Panini", "", 42],
          series: ["panini|avengers|1", "panini|avengers|1", "  ", null],
        })
      )
    ).toEqual({
      publishers: ["Panini"],
      series: ["panini|avengers|1"],
    });
  });

  it("falls back to the empty state for missing or invalid payloads", () => {
    expect(parseNavOpenState("")).toEqual(emptyNavOpenState());
    expect(parseNavOpenState("{broken-json")).toEqual(emptyNavOpenState());
    expect(parseNavOpenState(null)).toEqual(emptyNavOpenState());
  });

  it("merges legacy navPublisher and navSeries query hints into the parsed state", () => {
    expect(
      readNavOpenStateFromQuery({
        navOpen: JSON.stringify({
          publishers: ["Panini"],
          series: ["panini|avengers|1"],
        }),
        navPublisher: " Marvel ",
        navSeries: "marvel|x-men|2",
      })
    ).toEqual({
      publishers: ["Panini", "Marvel", "marvel"],
      series: ["panini|avengers|1", "marvel|x-men|2"],
    });
  });

  it("serializes only meaningful entries and returns null for an empty state", () => {
    expect(
      serializeNavOpenState({
        publishers: ["Panini", " Panini "],
        series: ["panini|avengers|1", ""],
      })
    ).toBe('{"publishers":["Panini"],"series":["panini|avengers|1"]}');
    expect(serializeNavOpenState(emptyNavOpenState())).toBeNull();
  });

  it("expands and collapses publisher and series state consistently", () => {
    const initial = emptyNavOpenState();
    const withPublisher = expandPublisher(initial, "Panini");
    const withSeries = expandSeries(withPublisher, "Panini", "Panini|Avengers|1");

    expect(isPublisherExpanded(withSeries, "Panini")).toBe(true);
    expect(isSeriesExpanded(withSeries, "Panini|Avengers|1")).toBe(true);

    expect(collapseSeries(withSeries, "Panini|Avengers|1")).toEqual({
      publishers: ["Panini"],
      series: [],
    });

    expect(
      collapsePublisher(
        {
          publishers: ["Panini", "Marvel"],
          series: ["Panini|Avengers|1", "Marvel|X-Men|2"],
        },
        "Panini"
      )
    ).toEqual({
      publishers: ["Marvel"],
      series: ["Marvel|X-Men|2"],
    });
  });
});
