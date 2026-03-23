"use client";

import React from "react";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import MuiList from "@mui/material/List";
import type { Issue, SelectedRoot, Series } from "../../types/domain";
import IssuesBranch from "./IssuesBranch";
import { NestedEmptyRow, NestedLoadingRow, NestedRow } from "./NestedNavRow";
import {
  createSeriesLabel,
  doesSeriesNodeMatchIssueSeries,
  getSeriesKey,
  isElementVisibleInContainer,
  isSeriesNodeSelected,
  type IssueNode,
  type PublisherNode,
  type SeriesNode,
  toSeriesSelected,
} from "./listTreeUtils";
import {
  hasNavExpansionState,
  readNavExpansionState,
  writeNavExpansionState,
} from "./navStateStorage";

type SeriesBranchProps = {
  us: boolean;
  publisher: PublisherNode;
  initialSeriesNodes?: SeriesNode[];
  initialIssueNodesBySeriesKey?: Record<string, IssueNode[]>;
  navStateKey: string;
  activeSeriesKey: string | null;
  selectedIssue?: Issue;
  session?: unknown;
  pushSelection: (event: unknown, item: SelectedRoot, closeOnPhone?: boolean) => void;
  ensureIssueNodesLoaded: (seriesNode: SeriesNode) => Promise<boolean>;
  navScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  suppressAutoScrollRef: React.MutableRefObject<boolean>;
  navigationPending?: boolean;
  pendingNavigationKey?: string | null;
  pendingPublisherKey?: string | null;
};

const SeriesBranch = React.memo(function SeriesBranch(props: Readonly<SeriesBranchProps>) {
  const {
    activeSeriesKey,
    ensureIssueNodesLoaded,
    initialIssueNodesBySeriesKey,
    initialSeriesNodes,
    navScrollContainerRef,
    navigationPending,
    pendingNavigationKey,
    pendingPublisherKey,
    publisher,
    pushSelection,
    selectedIssue,
    session,
    suppressAutoScrollRef,
    us,
  } = props;
  const publisherName = publisher.name || "";
  const seriesStateKey = `${props.navStateKey}|${publisherName}`;
  const seriesNodes = React.useMemo(() => initialSeriesNodes || [], [initialSeriesNodes]);
  const [expandedSeries, setExpandedSeries] = React.useState<Record<string, boolean>>({});
  const [seriesExpansionReady, setSeriesExpansionReady] = React.useState(false);
  const seriesSelectionByKey = React.useMemo(() => {
    const selection: Record<string, Series> = {};
    for (const seriesNode of seriesNodes) {
      selection[getSeriesKey(seriesNode)] = toSeriesSelected(seriesNode, us);
    }
    return selection;
  }, [seriesNodes, us]);

  React.useEffect(() => {
    const storedExpansion = readNavExpansionState(seriesStateKey);
    const hasStoredExpansion = hasNavExpansionState(seriesStateKey);
    const requiredExpansion = buildExpandedSeries(seriesNodes, activeSeriesKey, selectedIssue);
    if (hasStoredExpansion) {
      setExpandedSeries({ ...storedExpansion, ...requiredExpansion });
      setSeriesExpansionReady(true);
      return;
    }

    setExpandedSeries(requiredExpansion);
    setSeriesExpansionReady(true);
  }, [seriesStateKey, seriesNodes, activeSeriesKey, selectedIssue]);

  React.useEffect(() => {
    if (!seriesExpansionReady) return;
    writeNavExpansionState(seriesStateKey, expandedSeries);
  }, [expandedSeries, seriesStateKey, seriesExpansionReady]);

  React.useEffect(() => {
    for (const seriesNode of seriesNodes) {
      const seriesKey = getSeriesKey(seriesNode);
      if (!expandedSeries[seriesKey]) continue;
      void ensureIssueNodesLoaded(seriesNode);
    }
  }, [expandedSeries, seriesNodes, ensureIssueNodesLoaded]);

  React.useEffect(() => {
    if (!activeSeriesKey) return;

    const scrollContainer = navScrollContainerRef.current;
    if (!scrollContainer) return;

    const selectedRow = scrollContainer.querySelector<HTMLElement>(
      `[data-nav-row-key="${CSS.escape(activeSeriesKey)}"]`
    );
    if (!selectedRow) return;
    if (isElementVisibleInContainer(selectedRow, scrollContainer)) return;

    selectedRow.scrollIntoView({
      block: "center",
      inline: "nearest",
    });
  }, [activeSeriesKey, expandedSeries, navScrollContainerRef, seriesNodes.length]);

  const handleToggleSeries = React.useCallback(
    (seriesKey: string) => {
      const isExpanded = Boolean(expandedSeries[seriesKey]);
      if (isExpanded) {
        setExpandedSeries((prev) =>
          Object.fromEntries(Object.entries(prev).filter(([key]) => key !== seriesKey))
        );
        return;
      }

      const seriesNode = seriesNodes.find((entry) => getSeriesKey(entry) === seriesKey);
      if (!seriesNode) return;
      void ensureIssueNodesLoaded(seriesNode).then((loaded) => {
        if (!loaded) return;
        setExpandedSeries((prev) => ({ ...prev, [seriesKey]: true }));
      });
    },
    [expandedSeries, seriesNodes, ensureIssueNodesLoaded]
  );
  const handleSeriesClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, seriesKey: string) => {
      const selectedSeries = seriesSelectionByKey[seriesKey];
      if (!selectedSeries) return;
      const seriesNode = seriesNodes.find((entry) => getSeriesKey(entry) === seriesKey);
      if (seriesNode) {
        void ensureIssueNodesLoaded(seriesNode).then((loaded) => {
          if (!loaded) return;
          setExpandedSeries((prev) => ({ ...prev, [seriesKey]: true }));
        });
      }
      pushSelection(event, { series: selectedSeries }, true);
    },
    [pushSelection, seriesSelectionByKey, seriesNodes, ensureIssueNodesLoaded]
  );

  if (pendingPublisherKey === `publisher:${publisherName}`) {
    return <NestedLoadingRow depth={1} message="Serien werden geladen..." />;
  }

  if (seriesNodes.length === 0) return <NestedEmptyRow depth={1} message="Keine Serien vorhanden" />;

  return (
    <MuiList disablePadding>
      {seriesNodes.map((seriesNode) => {
        const seriesKey = getSeriesKey(seriesNode);
        const selected = isSeriesNodeSelected(seriesNode, activeSeriesKey, selectedIssue);
        const expanded = Boolean(expandedSeries[seriesKey]);

        return (
          <Box key={seriesKey}>
            <NestedRow
              rowKey={seriesKey}
              depth={1}
              navRowKey={seriesKey}
              label={createSeriesLabel(seriesNode)}
              selected={selected}
              expanded={expanded}
              pending={
                pendingPublisherKey === `series:${publisherName}:${seriesKey}` ||
                pendingNavigationKey === [publisherName, seriesNode.title, seriesNode.volume].join("|")
              }
              disabled={navigationPending}
              onToggle={handleToggleSeries}
              onClick={handleSeriesClick}
            />

            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <IssuesBranch
                us={us}
                series={seriesNode}
                initialIssueNodes={initialIssueNodesBySeriesKey?.[seriesKey]}
                selectedIssue={selectedIssue}
                session={session}
                pushSelection={pushSelection}
                navScrollContainerRef={navScrollContainerRef}
                suppressAutoScrollRef={suppressAutoScrollRef}
                navigationPending={navigationPending}
                pendingNavigationKey={pendingNavigationKey}
                loading={pendingPublisherKey === `series:${publisherName}:${seriesKey}`}
              />
            </Collapse>
          </Box>
        );
      })}
    </MuiList>
  );
});

export default SeriesBranch;

function buildExpandedSeries(
  seriesNodes: SeriesNode[],
  activeSeriesKey: string | null,
  selectedIssue?: Issue
) {
  const nextExpandedSeries: Record<string, boolean> = {};
  for (const seriesNode of seriesNodes) {
    const seriesKey = getSeriesKey(seriesNode);
    if (activeSeriesKey && activeSeriesKey === seriesKey) {
      nextExpandedSeries[seriesKey] = true;
    }
    if (selectedIssue?.series && doesSeriesNodeMatchIssueSeries(seriesNode, selectedIssue.series)) {
      nextExpandedSeries[seriesKey] = true;
    }
  }
  return nextExpandedSeries;
}
