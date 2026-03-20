import { isSameIssue, toChildAddinfo, toIssueRowKey } from "./storyIssueUtils";

describe("storyIssueUtils", () => {
  it("builds child addinfo text from part and addinfo fields", () => {
    expect(toChildAddinfo({ part: "1/3", addinfo: "Director's Cut" })).toBe(
      "Teil 1 von 3, Director's Cut"
    );
    expect(toChildAddinfo({ part: "1/x", addinfo: "Bonus" })).toBe("Bonus");
    expect(toChildAddinfo({})).toBe("");
  });

  it("compares issues by number and series identity", () => {
    expect(
      isSameIssue(
        { number: "1", series: { title: "Spider-Man", volume: 1 } },
        { number: 1, series: { title: "Spider-Man", volume: 1 } }
      )
    ).toBe(true);

    expect(
      isSameIssue(
        { number: "1", series: { title: "Spider-Man", volume: 1 } },
        { number: "2", series: { title: "Spider-Man", volume: 1 } }
      )
    ).toBe(false);
  });

  it("creates stable issue row keys with fallbacks", () => {
    expect(
      toIssueRowKey(
        {
          number: "7",
          issue: {
            number: "1",
            series: { title: "Spider-Man", publisher: { name: "Marvel" } },
          },
        },
        3
      )
    ).toBe("Marvel|Spider-Man|1|7");

    expect(toIssueRowKey({}, 3)).toBe("publisher|series|3|3");
  });
});
