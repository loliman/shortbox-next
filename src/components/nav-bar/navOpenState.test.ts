import {
  collapsePublisher,
  collapseSeries,
  expandPublisher,
  expandSeries,
  parseNavOpenState,
  readNavOpenStateFromQuery,
  serializeNavOpenState,
} from "./navOpenState";

describe("navOpenState", () => {
  it("merges legacy query params into navOpen state", () => {
    const navOpenState = readNavOpenStateFromQuery({
      navOpen: JSON.stringify({ publishers: ["Panini"], series: [] }),
      navPublisher: "Marvel",
      navSeries: "Marvel|Spider-Man|1",
    });

    expect(navOpenState.publishers).toEqual(["Panini", "Marvel"]);
    expect(navOpenState.series).toEqual(["Marvel|Spider-Man|1"]);
  });

  it("removes child series when a publisher collapses", () => {
    const expanded = expandSeries(
      expandSeries({ publishers: [], series: [] }, "Panini", "Panini|Star Wars|2"),
      "Marvel",
      "Marvel|Spider-Man|1"
    );

    expect(collapsePublisher(expanded, "Panini")).toEqual({
      publishers: ["Marvel"],
      series: ["Marvel|Spider-Man|1"],
    });
  });

  it("round-trips serialized state", () => {
    const serialized = serializeNavOpenState(
      expandSeries(expandPublisher({ publishers: [], series: [] }, "Panini"), "Panini", "Panini|Star Wars|2")
    );

    expect(parseNavOpenState(serialized)).toEqual({
      publishers: ["Panini"],
      series: ["Panini|Star Wars|2"],
    });
    expect(collapseSeries(parseNavOpenState(serialized), "Panini|Star Wars|2")).toEqual({
      publishers: ["Panini"],
      series: [],
    });
  });
});
