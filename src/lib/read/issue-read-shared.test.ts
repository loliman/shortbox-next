import { compareIssueNumber } from "./issue-read-shared";

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
