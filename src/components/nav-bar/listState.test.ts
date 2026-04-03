import type { SelectedRoot } from "../../types/domain";
import {
  buildExpandedPublishers,
  buildNavStateKey,
  buildPendingNavigationKey,
  getInitialViewportSelection,
  getInitialViewportSelectionSignature,
  getSelectedContext,
  getSelectedIssueIndex,
  getSelectedSeriesIndex,
  resolveCanonicalPublisherName,
} from "./listState";

describe("listState", () => {
  it("should_build_nav_state_key_from_filter_context", () => {
    expect(
      buildNavStateKey({
        us: false,
        filterQuery: "x",
        routeFilterKind: "genre",
        routeFilterSlug: "marvel",
      })
    ).toBe("false|x|genre|marvel");
  });

  it("should_build_expanded_publishers_lookup", () => {
    expect(buildExpandedPublishers(["Marvel", "DC"])).toEqual({
      Marvel: true,
      DC: true,
    });
  });

  it("should_build_pending_navigation_keys_for_selected_entities", () => {
    const issueSelected: SelectedRoot = {
      issue: {
        number: "7",
        format: "HC",
        variant: "B",
        series: {
          title: "Spider-Man",
          volume: 1,
          startyear: 1963,
          publisher: { name: "Marvel" },
        },
      },
    };

    expect(buildPendingNavigationKey(issueSelected)).toBe("Marvel|Spider-Man|1|1963|7|HC|B");
    expect(buildPendingNavigationKey({ publisher: { name: "Panini" } })).toBe("Panini");
  });

  it("should_resolve_canonical_publisher_name_from_visible_nodes", () => {
    expect(
      resolveCanonicalPublisherName([{ name: "DC Comics" }, { name: "Marvel" }], "dc comics")
    ).toBe("DC Comics");
    expect(resolveCanonicalPublisherName([], "Panini")).toBe("Panini");
    expect(resolveCanonicalPublisherName([], null)).toBeNull();
  });

  it("should_compute_series_and_issue_indexes", () => {
    const selectedSeriesKey = "marvel|spider-man|1|1963";
    const seriesNodes = [
      { title: "X-Men", volume: 1, startyear: 1963, publisher: { name: "Marvel" } },
      { title: "Spider-Man", volume: 1, startyear: 1963, publisher: { name: "Marvel" } },
    ];
    const issueNodes = [
      {
        number: "6",
        series: { title: "Spider-Man", volume: 1, startyear: 1963, publisher: { name: "Marvel" } },
      },
      {
        number: "7",
        format: "HC",
        variant: "B",
        series: { title: "Spider-Man", volume: 1, startyear: 1963, publisher: { name: "Marvel" } },
      },
    ];
    const selectedIssue: SelectedRoot["issue"] = {
      number: "7",
      format: "HC",
      variant: "B",
      series: { title: "Spider-Man", volume: 1, startyear: 1963, publisher: { name: "Marvel" } },
    };

    expect(getSelectedSeriesIndex(selectedSeriesKey, seriesNodes)).toBe(1);
    expect(
      getSelectedIssueIndex({
        selectedIssue,
        selectedSeriesKey,
        selectedIssueNodes: issueNodes,
      })
    ).toBe(1);
  });

  it("should_build_initial_viewport_selection_and_signature", () => {
    const selection = getInitialViewportSelection({
      selectedPublisherIndex: 2,
      selectedIssue: {
        number: "7",
        series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel" } },
      },
      selectedSeriesNodes: [{ title: "Spider-Man", volume: 1, publisher: { name: "Marvel" } }],
      selectedSeriesIndex: 0,
      selectedSeriesKey: "marvel|spider-man|1|",
      selectedIssueNodes: [
        { number: "7", series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel" } } },
      ],
      selectedIssueIndex: 0,
    });

    expect(selection).toEqual({
      publisherIndex: 2,
      series: {
        totalCount: 1,
        selectedIndex: 0,
      },
      issue: {
        totalCount: 1,
        selectedIndex: 0,
      },
    });
    expect(getInitialViewportSelectionSignature(selection!)).toBe("issue:2:0:1:0:1");
  });

  it("should_build_selected_context_for_root_publisher_and_series_scopes", () => {
    expect(getSelectedContext({}, "", null)).toEqual({
      scope: "root",
      publisherName: null,
      seriesKey: null,
    });

    expect(getSelectedContext({ publisher: { name: "Marvel" } }, "Marvel", null)).toEqual({
      scope: "publisher",
      publisherName: "Marvel",
      seriesKey: null,
    });

    expect(
      getSelectedContext(
        { issue: { number: "1", series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel" } } } },
        "Marvel",
        "marvel|spider-man|1|"
      )
    ).toEqual({
      scope: "series",
      publisherName: "Marvel",
      seriesKey: "marvel|spider-man|1|",
    });
  });
});
