import { getNextPublisherSelection, getNextSeriesSelection } from "./seriesSelection";

describe("seriesSelection", () => {
  it("keeps a free-solo publisher value instead of clearing it", () => {
    expect(getNextPublisherSelection("Panini", false)).toEqual({
      title: "",
      volume: "",
      publisher: {
        name: "Panini",
        us: false,
      },
    });
  });

  it("keeps a free-solo series title instead of resetting it", () => {
    expect(
      getNextSeriesSelection(
        "Spider-Man",
        {
          name: "Panini - Marvel & Icon",
          us: false,
        },
        1
      )
    ).toEqual({
      title: "Spider-Man",
      volume: 1,
      publisher: {
        name: "Panini - Marvel & Icon",
        us: false,
      },
    });
  });
});
