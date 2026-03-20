import { expanded } from "./expanded";

describe("expanded helper", () => {
  const baseStoryItem = {
    __typename: "Story",
    number: "10",
    onlyapp: true,
    firstapp: true,
    otheronlytb: true,
    onlytb: true,
    onlyoneprint: true,
    exclusive: true,
    children: [],
    issue: {
      number: "10",
      series: {
        title: "Spider-Man",
        volume: 1,
        publisher: { name: "Marvel" },
      },
      arcs: [{ title: "Maximum Carnage" }],
    },
    individuals: [{ name: "Peter Parker", type: "WRITER" }],
    appearances: [{ name: "Spider-Man" }],
  };

  it("expands directly via query.expand number match", () => {
    expect(expanded(baseStoryItem, { expand: "10" })).toBe(true);
  });

  it("returns false without valid filter JSON", () => {
    expect(expanded(baseStoryItem, null)).toBe(false);
    expect(expanded(baseStoryItem, { filter: "{invalid" })).toBe(false);
  });

  it("expands for flag-based filters and number comparisons", () => {
    const filter = {
      onlyPrint: true,
      firstPrint: true,
      otherOnlyTb: true,
      onlyTb: true,
      onlyOnePrint: true,
      exclusive: true,
      noPrint: true,
      numbers: [
        { compare: "=", number: "10" },
        { compare: ">", number: "9" },
        { compare: "<", number: "11" },
        { compare: ">=", number: "10" },
        { compare: "<=", number: "10" },
      ],
    };

    expect(expanded(baseStoryItem, { filter: JSON.stringify(filter) })).toBe(true);
  });

  it("expands for series, publishers and direct publisher matches", () => {
    const filter = {
      series: [{ title: "Spider-Man", volume: 1, publisher: { name: "Marvel" } }],
      publishers: [{ name: "Marvel" }],
      publisher: { name: "Marvel" },
    };

    expect(expanded(baseStoryItem, { filter: JSON.stringify(filter) })).toBe(true);
  });

  it("expands story items for arcs, individuals and appearances", () => {
    const filter = {
      arcs: [{ title: "Maximum Carnage" }],
      individuals: [{ name: "Peter Parker", type: "WRITER" }],
      appearances: [{ name: "Spider-Man" }],
    };

    expect(expanded(baseStoryItem, { filter: JSON.stringify(filter) })).toBe(true);
  });

  it("expands cover items based on matching individuals", () => {
    const filter = {
      individuals: [{ name: "Peter Parker", type: "WRITER" }],
    };

    const cover = {
      __typename: "Cover",
      individuals: [{ name: "Peter Parker", type: "WRITER" }],
    };

    expect(expanded(cover, { filter: JSON.stringify(filter) })).toBe(true);
  });

  it("uses parent issue data as compare context when present", () => {
    const itemWithParent = {
      __typename: "Story",
      number: "1",
      parent: {
        issue: {
          number: "7",
          series: {
            title: "X-Men",
            volume: 3,
            publisher: { name: "Panini" },
          },
        },
      },
    };

    const filter = {
      publisher: { name: "Panini" },
      numbers: [{ compare: "=", number: "7" }],
    };

    expect(expanded(itemWithParent, { filter: JSON.stringify(filter) })).toBe(true);
  });

  it("returns false when none of the conditions match", () => {
    const filter = {
      individuals: [{ name: "Tony Stark", type: "WRITER" }],
      arcs: [{ title: "Civil War" }],
      numbers: [{ compare: ">", number: "99" }],
    };

    expect(expanded(baseStoryItem, { filter: JSON.stringify(filter) })).toBe(false);
  });

  it("expands when individual filter type is provided as an array", () => {
    const filter = {
      individuals: [{ name: "Peter Parker", type: ["WRITER", "PENCILER"] }],
    };

    expect(expanded(baseStoryItem, { filter: JSON.stringify(filter) })).toBe(true);
  });
});
