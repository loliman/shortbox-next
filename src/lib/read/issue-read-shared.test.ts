import { compareIssueNumber, compareIssueVariants } from "./issue-read-shared";

describe("compareIssueNumber", () => {
  it("sorts roman numerals before letters and numbers", () => {
    expect(["3", "B", "II", "A", "I", "X"].sort(compareIssueNumber)).toEqual([
      "I",
      "II",
      "X",
      "A",
      "B",
      "3",
    ]);
  });

  it("ignores parentheses while sorting", () => {
    expect(compareIssueNumber("(2)", "2")).toBe(0);
    expect(["3", "(2)", "1"].sort(compareIssueNumber)).toEqual(["1", "(2)", "3"]);
  });

  it("keeps natural numeric ordering for numbers", () => {
    expect(["10", "2", "1/2", "1"].sort(compareIssueNumber)).toEqual(["1/2", "1", "2", "10"]);
  });
});

describe("compareIssueVariants", () => {
  it("prioritizes formats by editorial preference instead of alphabetically", () => {
    const variants = [
      { format: "Hardcover", variant: null, id: 3 },
      { format: "Softcover", variant: null, id: 2 },
      { format: "Heft", variant: null, id: 1 },
      { format: "Taschenbuch", variant: null, id: 4 },
      { format: "Album", variant: null, id: 5 },
      { format: "Prestige", variant: null, id: 6 },
    ];

    expect([...variants].sort(compareIssueVariants).map((entry) => entry.format)).toEqual([
      "Heft",
      "Softcover",
      "Hardcover",
      "Taschenbuch",
      "Album",
      "Prestige",
    ]);
  });

  it("keeps the base issue before alphabetic variants within the same format", () => {
    const variants = [
      { format: "Softcover", variant: "B", id: 3 },
      { format: "Softcover", variant: null, id: 1 },
      { format: "Softcover", variant: "A", id: 2 },
    ];

    expect([...variants].sort(compareIssueVariants).map((entry) => entry.variant ?? "")).toEqual([
      "",
      "A",
      "B",
    ]);
  });
});
