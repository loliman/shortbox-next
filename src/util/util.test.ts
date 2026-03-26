import { capitalize, decapitalize, romanize, stripItem, today, unwrapItem, wrapItem } from "./util";

describe("util helpers", () => {
  it("wraps publisher, series and issue entities into SelectedRoot", () => {
    expect(
      wrapItem({
        __typename: "Publisher",
        name: "Marvel",
        us: true,
      } as never)
    ).toEqual({
      us: true,
      publisher: {
        __typename: "Publisher",
        name: "Marvel",
        us: true,
      },
    });

    expect(
      wrapItem({
        __typename: "Series",
        title: "Spider-Man",
        publisher: { us: false },
      } as never)
    ).toEqual({
      us: false,
      series: {
        __typename: "Series",
        title: "Spider-Man",
        publisher: { us: false },
      },
    });
  });

  it("unwraps entities based on __typename", () => {
    expect(
      unwrapItem({
        __typename: "Publisher",
        publisher: { name: "Marvel" },
      } as never)
    ).toEqual({ name: "Marvel" });

    expect(
      unwrapItem({
        __typename: "Series",
        series: { title: "Spider-Man" },
      } as never)
    ).toEqual({ title: "Spider-Man" });

    expect(
      unwrapItem({
        issue: { number: "1" },
      } as never)
    ).toEqual({ number: "1" });
  });

  it("strips GraphQL runtime metadata recursively without mutating original", () => {
    const original = {
      __typename: "Issue",
      __resolveType: "Issue",
      series: {
        id: 123,
        __typename: "Series",
        __resolveType: "Series",
        publisher: {
          id: 9,
          __typename: "Publisher",
          __resolveType: "Publisher",
          name: "Marvel",
        },
      },
      publisher: {
        id: 77,
        __typename: "Publisher",
        __resolveType: "Publisher",
        name: "Panini",
      },
    };

    const stripped = stripItem(original);

    expect(stripped.__typename).toBeUndefined();
    expect(stripped.__resolveType).toBeUndefined();
    expect(stripped.series?.id).toBeUndefined();
    expect(stripped.series?.publisher?.__typename).toBeUndefined();
    expect(stripped.publisher?.id).toBeUndefined();

    expect(original.series.id).toBe(123);
    expect(original.publisher?.__typename).toBe("Publisher");
  });

  it("capitalizes and decapitalizes strings", () => {
    expect(capitalize("spider")).toBe("Spider");
    expect(decapitalize("Spider")).toBe("spider");
  });

  it("romanizes numbers and returns NaN for NaN input", () => {
    expect(romanize(4)).toBe("IV");
    expect(romanize(19)).toBe("XIX");
    expect(Number.isNaN(romanize(Number.NaN))).toBe(true);
  });

  it("formats today as dd.mm.yyyy", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-14T12:00:00.000Z"));

    expect(today()).toBe("14.02.2026");

    jest.useRealTimers();
  });
});
