import { dedupePublisherItems, dedupeSeriesItems } from "./autocomplete-read-shared";

describe("autocomplete-read-shared", () => {
  it("dedupes identical publisher items", () => {
    expect(
      dedupePublisherItems([
        { name: "Panini Comics", us: true },
        { name: "Panini Comics", us: true },
      ])
    ).toEqual([{ name: "Panini Comics", us: true }]);
  });

  it("dedupes identical series items while keeping same labels from different publishers", () => {
    expect(
      dedupeSeriesItems([
        {
          title: "20 Jahre Panini Comics",
          volume: 1,
          startyear: 2017,
          endyear: null,
          publisher: { name: "Panini Comics", us: true },
        },
        {
          title: "20 Jahre Panini Comics",
          volume: 1,
          startyear: 2017,
          endyear: null,
          publisher: { name: "Panini Comics", us: true },
        },
        {
          title: "20 Jahre Panini Comics",
          volume: 1,
          startyear: 2017,
          endyear: null,
          publisher: { name: "Panini - Marvel & Icon", us: false },
        },
      ])
    ).toHaveLength(2);
  });
});
