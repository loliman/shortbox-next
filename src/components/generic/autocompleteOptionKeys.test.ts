import { getPublisherOptionKey, getSeriesOptionKey } from "./autocompleteOptionKeys";

describe("autocompleteOptionKeys", () => {
  it("builds stable publisher keys", () => {
    expect(getPublisherOptionKey({ name: "Panini Comics", us: true })).toBe(
      "Panini Comics::true"
    );
  });

  it("builds distinct series keys for equal labels from different publishers", () => {
    const first = getSeriesOptionKey({
      title: "20 Jahre Panini Comics",
      volume: 1,
      startyear: 2017,
      publisher: {
        name: "Panini Comics",
        us: true,
      },
    });
    const second = getSeriesOptionKey({
      title: "20 Jahre Panini Comics",
      volume: 1,
      startyear: 2017,
      publisher: {
        name: "Panini - Marvel & Icon",
        us: false,
      },
    });

    expect(first).not.toBe(second);
  });
});
