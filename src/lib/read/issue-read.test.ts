jest.mock("server-only", () => ({}), { virtual: true });

jest.mock("./issue-details-read", () => ({
  readIssueDetails: jest.fn(async () => null),
}));

jest.mock("./issue-metadata-read", () => ({
  readIssueMetadataQuery: jest.fn(async () => null),
}));

import { readIssueDetails, readIssueMetadata } from "./issue-read";
import { readIssueDetails as readIssueDetailsQuery } from "./issue-details-read";
import { readIssueMetadataQuery } from "./issue-metadata-read";

describe("readIssueDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should_forward_startyear_when_calling_the_underlying_issue_resolver", async () => {
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
      startyear: 2026,
      number: "1",
      format: "Hardcover",
      variant: undefined,
    });
  });

  it("should_forward_startyear_when_calling_the_issue_metadata_resolver", async () => {
    await readIssueMetadata({
      us: true,
      publisher: "Marvel Comics",
      series: "What If",
      volume: 1,
      startyear: 1977,
      number: "1",
      format: "Heft",
      variant: "",
    });

    expect(readIssueMetadataQuery).toHaveBeenCalledWith({
      us: true,
      publisher: "Marvel Comics",
      series: "What If",
      volume: 1,
      startyear: 1977,
      number: "1",
      format: "Heft",
      variant: undefined,
    });
  });
});
