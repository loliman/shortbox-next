import { getIssuePreviewFlags } from "./issuePreviewUtils";

describe("getIssuePreviewFlags", () => {
  it("should return notOwnedUsMaterial true when de, hasSession and issue.notOwnedUsMaterial is true", () => {
    const issue = {
      notOwnedUsMaterial: true,
      stories: [],
    };
    const flags = getIssuePreviewFlags(issue, false, true);
    expect(flags.notOwnedUsMaterial).toBe(true);
  });

  it("should return notOwnedUsMaterial false when us context is true", () => {
    const issue = {
      notOwnedUsMaterial: true,
      stories: [],
    };
    const flags = getIssuePreviewFlags(issue, true, true);
    expect(flags.notOwnedUsMaterial).toBe(false);
  });

  it("should return notOwnedUsMaterial false when hasSession is false", () => {
    const issue = {
      notOwnedUsMaterial: true,
      stories: [],
    };
    const flags = getIssuePreviewFlags(issue, false, false);
    expect(flags.notOwnedUsMaterial).toBe(false);
  });
});
