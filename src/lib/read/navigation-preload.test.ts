import { resolveNavigationPreloadOptions } from "./navigation-preload";

describe("resolveNavigationPreloadOptions", () => {
  it("should_default_to_preloading_series_and_issue_nodes", () => {
    expect(resolveNavigationPreloadOptions()).toEqual({
      seriesNodes: true,
      issueNodes: true,
    });
  });

  it("should_preserve_explicitly_disabled_preloads", () => {
    expect(
      resolveNavigationPreloadOptions({
        seriesNodes: false,
        issueNodes: false,
      })
    ).toEqual({
      seriesNodes: false,
      issueNodes: false,
    });
  });
});
