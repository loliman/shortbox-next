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
  scrollNavElementIntoView,
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
import { LARGE_BRANCH_OCCLUSION_THRESHOLD } from "./branchWindowing";
import { useBranchWindowing } from "./useBranchWindowing";
import { markNavPerf, measureNavPerf } from "./navPerfDebug";

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
  deferNonPriorityInitialization?: boolean;
  deferProgressiveWindowing?: boolean;
  restoreStoredExpansion?: boolean;
  allowAutoRevealFallback?: boolean;
  bypassInitialIssueCollapseAnimation?: boolean;
  onPriorityPathReady?: () => void;
};

const SeriesBranch = React.memo(function SeriesBranch(props: Readonly<SeriesBranchProps>) {
  const SERIES_ROW_HEIGHT = 44;
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
    deferNonPriorityInitialization,
    deferProgressiveWindowing,
    restoreStoredExpansion,
    allowAutoRevealFallback,
    bypassInitialIssueCollapseAnimation,
    onPriorityPathReady,
  } = props;
  const publisherName = publisher.name || "";
  const seriesStateKey = `${props.navStateKey}|${publisherName}`;
  const seriesNodes = React.useMemo(() => initialSeriesNodes || [], [initialSeriesNodes]);
  const [expandedSeries, setExpandedSeries] = React.useState<Record<string, boolean>>(() =>
    buildExpandedSeries(initialSeriesNodes || [], activeSeriesKey, selectedIssue)
  );
  const [seriesExpansionReady, setSeriesExpansionReady] = React.useState(false);
  const deferredExpandedSeriesRef = React.useRef<Record<string, boolean> | null>(null);
  const deferredSeriesRestoreCompensationRef = React.useRef<{
    anchorTop: number;
    seriesKey: string;
  } | null>(null);
  const seriesAutoRevealKeyRef = React.useRef<string | null>(null);
  const seriesSelectionByKey = React.useMemo(() => {
    const selection: Record<string, Series> = {};
    for (const seriesNode of seriesNodes) {
      selection[getSeriesKey(seriesNode)] = toSeriesSelected(seriesNode, us);
    }
    return selection;
  }, [seriesNodes, us]);

  React.useLayoutEffect(() => {
    const storedExpansion = readNavExpansionState(seriesStateKey);
    const hasStoredExpansion = hasNavExpansionState(seriesStateKey);
    const requiredExpansion = buildExpandedSeries(seriesNodes, activeSeriesKey, selectedIssue);
    deferredExpandedSeriesRef.current = storedExpansion;
    if (hasStoredExpansion) {
      setExpandedSeries(
        activeSeriesKey ? requiredExpansion : { ...storedExpansion, ...requiredExpansion }
      );
      setSeriesExpansionReady(true);
      return;
    }

    setExpandedSeries(requiredExpansion);
    setSeriesExpansionReady(true);
  }, [seriesStateKey, seriesNodes, activeSeriesKey, selectedIssue]);

  React.useLayoutEffect(() => {
    if (!restoreStoredExpansion) return;
    const deferredExpandedSeries = deferredExpandedSeriesRef.current;
    if (!deferredExpandedSeries) return;

    const scrollContainer = navScrollContainerRef.current;
    const selectedSeriesRow =
      activeSeriesKey && scrollContainer
        ? scrollContainer.querySelector<HTMLElement>(
            `[data-nav-row-key="${CSS.escape(activeSeriesKey)}"]`
          )
        : null;

    deferredSeriesRestoreCompensationRef.current =
      scrollContainer && selectedSeriesRow && activeSeriesKey
        ? {
            seriesKey: activeSeriesKey,
            anchorTop:
              selectedSeriesRow.getBoundingClientRect().top
              - scrollContainer.getBoundingClientRect().top,
          }
        : null;

    setExpandedSeries((prev) => ({ ...deferredExpandedSeries, ...prev }));
    deferredExpandedSeriesRef.current = null;
  }, [activeSeriesKey, navScrollContainerRef, restoreStoredExpansion]);

  React.useLayoutEffect(() => {
    const pendingCompensation = deferredSeriesRestoreCompensationRef.current;
    if (!pendingCompensation) return;

    const scrollContainer = navScrollContainerRef.current;
    if (!scrollContainer) {
      deferredSeriesRestoreCompensationRef.current = null;
      return;
    }

    const selectedSeriesRow = scrollContainer.querySelector<HTMLElement>(
      `[data-nav-row-key="${CSS.escape(pendingCompensation.seriesKey)}"]`
    );
    if (!selectedSeriesRow) {
      deferredSeriesRestoreCompensationRef.current = null;
      return;
    }

    const nextAnchorTop =
      selectedSeriesRow.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top;
    const delta = nextAnchorTop - pendingCompensation.anchorTop;
    if (delta !== 0) {
      scrollContainer.scrollTop += delta;
    }
    deferredSeriesRestoreCompensationRef.current = null;
  }, [expandedSeries, navScrollContainerRef]);

  const prioritizedSeriesIndex = React.useMemo(() => {
    if (!activeSeriesKey) return null;
    const index = seriesNodes.findIndex((seriesNode) => getSeriesKey(seriesNode) === activeSeriesKey);
    return index >= 0 ? index : null;
  }, [activeSeriesKey, seriesNodes]);
  const { visibleCount, windowEnd, windowStart, windowingEnabled } = useBranchWindowing(
    seriesNodes.length,
    prioritizedSeriesIndex,
    Boolean(deferProgressiveWindowing)
  );
  const enableSeriesOcclusion =
    seriesNodes.length > LARGE_BRANCH_OCCLUSION_THRESHOLD && prioritizedSeriesIndex == null;
  const visibleSeriesNodes = React.useMemo(
    () => (windowingEnabled ? seriesNodes.slice(windowStart, windowEnd) : seriesNodes),
    [seriesNodes, windowEnd, windowStart, windowingEnabled]
  );

  React.useEffect(() => {
    if (!seriesExpansionReady) return;
    writeNavExpansionState(seriesStateKey, expandedSeries);
  }, [expandedSeries, seriesStateKey, seriesExpansionReady]);

  React.useEffect(() => {
    const expandedSeriesNodes = seriesNodes.filter((seriesNode) =>
      Boolean(expandedSeries[getSeriesKey(seriesNode)])
    );
    const seriesNodesToLoad = deferNonPriorityInitialization
      ? expandedSeriesNodes.filter((seriesNode) => getSeriesKey(seriesNode) === activeSeriesKey)
      : expandedSeriesNodes;

    for (const seriesNode of seriesNodesToLoad) {
      void ensureIssueNodesLoaded(seriesNode);
    }
  }, [activeSeriesKey, deferNonPriorityInitialization, ensureIssueNodesLoaded, expandedSeries, seriesNodes]);

  const tryResolveInitialSeriesViewport = React.useCallback(() => {
    if (allowAutoRevealFallback === false) return;
    if (!activeSeriesKey) return;
    markNavPerf("series:reveal:start", {
      publisher: publisherName,
      activeSeriesKey,
      selectedRowKey,
      visibleCount,
      windowStart,
      windowEnd,
      totalCount: seriesNodes.length,
    });

    // On issue-level selections, keep the explicit issue-row scroll target in control.
    if (selectedIssue?.number && selectedRowKey && selectedRowKey !== activeSeriesKey) return;

    const autoRevealKey = `${seriesStateKey}|series|${activeSeriesKey}|${selectedRowKey || ""}`;
    if (seriesAutoRevealKeyRef.current === autoRevealKey) return;

    const scrollContainer = navScrollContainerRef.current;
    if (!scrollContainer) return;

    const selectedRow = scrollContainer.querySelector<HTMLElement>(
      `[data-nav-row-key="${CSS.escape(activeSeriesKey)}"]`
    );
    if (!selectedRow) return;
    if (isElementVisibleInContainer(selectedRow, scrollContainer)) {
      seriesAutoRevealKeyRef.current = autoRevealKey;
      markNavPerf("series:reveal:end", {
        publisher: publisherName,
        activeSeriesKey,
        reason: "already-visible",
      });
      measureNavPerf("series:reveal", "series:reveal:start", "series:reveal:end");
      if (!selectedIssue?.number) {
        onPriorityPathReady?.();
      }
      return;
    }

    scrollNavElementIntoView(selectedRow, scrollContainer, { behavior: "auto" });
    seriesAutoRevealKeyRef.current = autoRevealKey;
    markNavPerf("series:reveal:end", {
      publisher: publisherName,
      activeSeriesKey,
      reason: "scrolled",
    });
    measureNavPerf("series:reveal", "series:reveal:start", "series:reveal:end");
    if (!selectedIssue?.number) {
      onPriorityPathReady?.();
    }
  }, [
    activeSeriesKey,
    allowAutoRevealFallback,
    navScrollContainerRef,
    onPriorityPathReady,
    publisherName,
    seriesStateKey,
    selectedIssue?.number,
    selectedRowKey,
    seriesNodes.length,
    visibleCount,
    windowEnd,
    windowStart,
  ]);

  React.useLayoutEffect(() => {
    tryResolveInitialSeriesViewport();
  }, [tryResolveInitialSeriesViewport]);

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

      scrollNavElementIntoView(selectedRow, scrollContainer);
    },
    [navScrollContainerRef]
  );

  React.useEffect(() => {
    if (!navAction) return;

    if (navAction.publisherName !== publisherName) return;

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
      {windowingEnabled && windowStart > 0 ? (
        <Box
          component="li"
          aria-hidden
          sx={{
            listStyle: "none",
            m: 0,
            p: 0,
            height: `${windowStart * SERIES_ROW_HEIGHT}px`,
          }}
        />
      ) : null}
      {visibleSeriesNodes.map((seriesNode) => {
        const seriesKey = getSeriesKey(seriesNode);
        const selected = isSeriesNodeSelected(seriesNode, activeSeriesKey, selectedIssue);
        const expanded = Boolean(expandedSeries[seriesKey]);
        const bypassIssueCollapse =
          expanded &&
          Boolean(bypassInitialIssueCollapseAnimation) &&
          seriesKey === activeSeriesKey;
        const issueBranch = (
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
            deferProgressiveWindowing={
              Boolean(deferProgressiveWindowing) && seriesKey === activeSeriesKey
            }
            allowAutoRevealFallback={allowAutoRevealFallback}
            onPriorityPathReady={
              seriesKey === activeSeriesKey ? onPriorityPathReady : undefined
            }
          />
        );

        return (
          <Box
            key={seriesKey}
            component="li"
            sx={{
              listStyle: "none",
              m: 0,
              p: 0,
              contentVisibility: enableSeriesOcclusion ? "auto" : undefined,
              containIntrinsicSize: enableSeriesOcclusion ? "44px" : undefined,
            }}
          >
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

            {bypassIssueCollapse ? (
              <Box component="div">
                {issueBranch}
              </Box>
            ) : (
              <Collapse
                in={expanded}
                timeout="auto"
                unmountOnExit
                component="div"
              >
                {issueBranch}
              </Collapse>
            )}
          </Box>
        );
      })}
      {windowingEnabled && windowEnd < seriesNodes.length ? (
        <Box
          component="li"
          aria-hidden
          sx={{
            listStyle: "none",
            m: 0,
            p: 0,
            height: `${Math.max(0, seriesNodes.length - windowEnd) * SERIES_ROW_HEIGHT}px`,
          }}
        />
      ) : null}
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
