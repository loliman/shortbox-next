import type { SelectedRoot } from "../../types/domain";
import type { InitialViewportSelection } from "./branchWindowing";
import {
  doesIssueNodeMatchSelectedIssueRoute,
  getSeriesKey,
  isSameEntityName,
  type IssueNode,
  type PublisherNode,
  type SeriesNode,
} from "./listTreeUtils";

export type SelectedNavContext =
  | {
      scope: "root";
      publisherName: null;
      seriesKey: null;
    }
  | {
      scope: "publisher" | "series";
      publisherName: string;
      seriesKey: string | null;
    };

export function buildNavStateKey(options: {
  us: boolean;
  filterQuery?: string | null;
  routeFilterKind?: string | null;
  routeFilterSlug?: string | null;
}) {
  return [
    String(options.us),
    options.filterQuery || "",
    options.routeFilterKind || "",
    options.routeFilterSlug || "",
  ].join("|");
}

export function buildExpandedPublishers(openPublisherNames: string[]) {
  const nextExpandedPublishers: Record<string, boolean> = {};
  for (const publisherName of openPublisherNames) {
    nextExpandedPublishers[publisherName] = true;
  }
  return nextExpandedPublishers;
}

export function buildPendingNavigationKey(item: SelectedRoot) {
  if (item.issue) {
    return [
      item.issue.series.publisher.name,
      item.issue.series.title,
      item.issue.series.volume,
      item.issue.series.startyear || "",
      item.issue.number,
      item.issue.format || "",
      item.issue.variant || "",
    ].join("|");
  }

  if (item.series) {
    return [
      item.series.publisher.name,
      item.series.title,
      item.series.volume,
      item.series.startyear || "",
    ].join("|");
  }

  if (item.publisher) {
    return item.publisher.name || "";
  }

  return "";
}

export function resolveCanonicalPublisherName(
  visiblePublisherNodes: PublisherNode[],
  selectedPublisherName: string | null | undefined
) {
  if (!selectedPublisherName) return null;
  return (
    visiblePublisherNodes.find((node) => isSameEntityName(node.name, selectedPublisherName))?.name
      || selectedPublisherName
  );
}

export function getSelectedSeriesIndex(
  selectedSeriesKey: string | null,
  selectedSeriesNodes: SeriesNode[] | null
) {
  if (!selectedSeriesKey || !selectedSeriesNodes) return -1;
  return selectedSeriesNodes.findIndex((seriesNode) => getSeriesKey(seriesNode) === selectedSeriesKey);
}

export function getSelectedIssueIndex(options: {
  selectedIssue: SelectedRoot["issue"];
  selectedSeriesKey: string | null;
  selectedIssueNodes: IssueNode[] | null;
}) {
  const { selectedIssue, selectedSeriesKey, selectedIssueNodes } = options;
  if (!selectedIssue || !selectedSeriesKey) return -1;
  const issueNodes = selectedIssueNodes || [];
  return issueNodes.findIndex((issueNode) =>
    doesIssueNodeMatchSelectedIssueRoute(issueNode, selectedIssue)
  );
}

export function getInitialViewportSelection(options: {
  selectedPublisherIndex: number;
  selectedIssue: SelectedRoot["issue"];
  selectedSeriesNodes: SeriesNode[] | null;
  selectedSeriesIndex: number;
  selectedSeriesKey: string | null;
  selectedIssueNodes: IssueNode[] | null;
  selectedIssueIndex: number;
}): InitialViewportSelection | null {
  const {
    selectedPublisherIndex,
    selectedIssue,
    selectedSeriesNodes,
    selectedSeriesIndex,
    selectedSeriesKey,
    selectedIssueNodes,
    selectedIssueIndex,
  } = options;

  if (selectedPublisherIndex < 0) return null;

  if (selectedIssue && selectedSeriesNodes && selectedSeriesIndex >= 0 && selectedSeriesKey) {
    const issueNodes = selectedIssueNodes;
    if (!issueNodes) return null;
    if (selectedIssueIndex >= 0) {
      return {
        publisherIndex: selectedPublisherIndex,
        series: {
          totalCount: selectedSeriesNodes.length,
          selectedIndex: selectedSeriesIndex,
        },
        issue: {
          totalCount: issueNodes.length,
          selectedIndex: selectedIssueIndex,
        },
      };
    }
  }

  if (selectedSeriesNodes && selectedSeriesIndex >= 0) {
    return {
      publisherIndex: selectedPublisherIndex,
      series: {
        totalCount: selectedSeriesNodes.length,
        selectedIndex: selectedSeriesIndex,
      },
    };
  }

  return {
    publisherIndex: selectedPublisherIndex,
  };
}

export function getInitialViewportSelectionSignature(selection: InitialViewportSelection) {
  if (!("series" in selection)) {
    return `publisher:${selection.publisherIndex}`;
  }

  if (!("issue" in selection)) {
    return `series:${selection.publisherIndex}:${selection.series.selectedIndex}:${selection.series.totalCount}`;
  }

  return [
    "issue",
    selection.publisherIndex,
    selection.series.selectedIndex,
    selection.series.totalCount,
    selection.issue.selectedIndex,
    selection.issue.totalCount,
  ].join(":");
}

export function getSelectedContext(
  selected: SelectedRoot,
  selectedPublisherName: string,
  selectedSeriesKey: string | null
): SelectedNavContext {
  if (selected.issue && selectedPublisherName && selectedSeriesKey) {
    return {
      scope: "series",
      publisherName: selectedPublisherName,
      seriesKey: selectedSeriesKey,
    };
  }

  if (selected.series && selectedPublisherName) {
    return {
      scope: "publisher",
      publisherName: selectedPublisherName,
      seriesKey: selectedSeriesKey,
    };
  }

  if (selected.publisher) {
    return {
      scope: "publisher",
      publisherName: selectedPublisherName,
      seriesKey: null,
    };
  }

  return {
    scope: "root",
    publisherName: null,
    seriesKey: null,
  };
}
