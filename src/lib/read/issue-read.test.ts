jest.mock("server-only", () => ({}), { virtual: true });

jest.mock("./issue-details-read", () => ({
  readIssueDetails: jest.fn(async () => null),
}));

import { readIssueDetails } from "./issue-read";
import { readIssueDetails as readIssueDetailsQuery } from "./issue-details-read";

describe("readIssueDetails", () => {
  it("ignores startyear when calling the underlying issue resolver", async () => {
    await readIssueDetails({
      us: false,
      publisher: "Panini DC Vertigo Wildstorm",
      series: "DC/Marvel Klassiker 1979: Superman gegen Spider-Man",
      volume: 1,
      startyear: 2026,
      number: "1",
      format: "Hardcover",
      variant: "",
    });

    expect(readIssueDetailsQuery).toHaveBeenCalledWith({
      us: false,
      publisher: "Panini DC Vertigo Wildstorm",
      series: "DC/Marvel Klassiker 1979: Superman gegen Spider-Man",
      volume: 1,
      number: "1",
      format: "Hardcover",
      variant: undefined,
    });
  });
});
