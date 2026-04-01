"use client";

import React from "react";
import Collapse from "@mui/material/Collapse";
import Box from "@mui/material/Box";
import MuiList from "@mui/material/List";
import type { Issue, SelectedRoot, Series } from "../../types/domain";
import IssuesBranch from "./IssuesBranch";
import { NestedEmptyRow, NestedLoadingRow, NestedRow } from "./NestedNavRow";
import {
  createSeriesLabel,
  doesSeriesNodeMatchIssueSeries,
  getSeriesKey,
  isElementVisibleInContainer,
  type NavListAction,
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
  navAction?: NavListAction | null;
  selectedRowKey?: string | null;
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
    navAction,
    pushSelection,
    selectedRowKey,
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

    // On issue-level selections, keep the explicit issue-row scroll target in control.
    if (selectedIssue?.number && selectedRowKey && selectedRowKey !== activeSeriesKey) return;

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
  }, [
    activeSeriesKey,
    expandedSeries,
    navScrollContainerRef,
    selectedIssue?.number,
    selectedRowKey,
    seriesNodes.length,
  ]);

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

  const scrollSeriesRowIntoView = React.useCallback(
    (seriesKey: string, force = false) => {
      const scrollContainer = navScrollContainerRef.current;
      if (!scrollContainer) return;

      const selectedRow = scrollContainer.querySelector<HTMLElement>(
        `[data-nav-row-key="${CSS.escape(seriesKey)}"]`
      );
      if (!selectedRow) return;
      if (!force && isElementVisibleInContainer(selectedRow, scrollContainer)) return;

      selectedRow.scrollIntoView({
        block: "center",
        inline: "nearest",
      });
    },
    [navScrollContainerRef]
  );

  React.useEffect(() => {
    if (!navAction) return;

    if (navAction.type === "closeAll") {
      setExpandedSeries({});
      return;
    }

    if (navAction.publisherName !== publisherName) return;

    if (navAction.type === "showAll") {
      if (navAction.scope === "publisher") {
        setExpandedSeries(
          Object.fromEntries(seriesNodes.map((seriesNode) => [getSeriesKey(seriesNode), true]))
        );
        void Promise.all(seriesNodes.map((seriesNode) => ensureIssueNodesLoaded(seriesNode)));
        return;
      }

      if (navAction.scope === "series" && navAction.seriesKey) {
        const seriesNode = seriesNodes.find((entry) => getSeriesKey(entry) === navAction.seriesKey);
        if (!seriesNode) return;
        setExpandedSeries((prev) => ({ ...prev, [navAction.seriesKey!]: true }));
        void ensureIssueNodesLoaded(seriesNode);
      }
      return;
    }

    if (navAction.type === "scrollToSelected") {
      if (navAction.seriesKey) {
        const seriesNode = seriesNodes.find((entry) => getSeriesKey(entry) === navAction.seriesKey);
        if (!seriesNode) return;
        setExpandedSeries((prev) => ({ ...prev, [navAction.seriesKey!]: true }));
        void ensureIssueNodesLoaded(seriesNode);
        requestAnimationFrame(() => {
          if (selectedRowKey === navAction.seriesKey) {
            scrollSeriesRowIntoView(navAction.seriesKey!, true);
          }
        });
        return;
      }

      if (navAction.rowKey) {
        scrollSeriesRowIntoView(navAction.rowKey, true);
      }
    }
  }, [
    ensureIssueNodesLoaded,
    navAction,
    publisherName,
    scrollSeriesRowIntoView,
    selectedRowKey,
    seriesNodes,
  ]);

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
          <Box key={seriesKey} component="li" sx={{ listStyle: "none", m: 0, p: 0 }}>
            <NestedRow
              rowKey={seriesKey}
              depth={1}
              navRowKey={seriesKey}
              label={createSeriesLabel(seriesNode)}
              selected={selected}
              expanded={expanded}
              pending={
                pendingPublisherKey === `series:${publisherName}:${seriesKey}` ||
                pendingNavigationKey ===
                  [publisherName, seriesNode.title, seriesNode.volume, seriesNode.startyear || ""].join("|")
              }
              disabled={navigationPending}
              onToggle={handleToggleSeries}
              onClick={handleSeriesClick}
            />

            <Collapse
              in={expanded}
              timeout="auto"
              unmountOnExit
              component="div"
            >
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
                scrollRequestId={navAction?.type === "scrollToSelected" ? navAction.token : 0}
                selectedRowKey={selectedRowKey}
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
