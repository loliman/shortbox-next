"use client";

import React from "react";
import Collapse from "@mui/material/Collapse";
import Box from "@mui/material/Box";
import { generateSeoUrl } from "../../lib/routes/hierarchy";
import { buildRouteHref } from "../generic/routeHref";
import type { SelectedRoot } from "../../types/domain";
import {
  getSeriesKey,
  type NavListAction,
  getSelectedPublisherName,
  getSelectedSeriesKey,
  isElementVisibleInContainer,
  isSameEntityName,
  scrollNavElementIntoView,
  type IssueNode,
  type PublisherNode,
  type SeriesNode,
} from "./listTreeUtils";
import {
  getInitialViewportScrollTop,
  type InitialViewportSelection,
} from "./branchWindowing";
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
import { markNavPerf, measureNavPerf, printNavPerfSummary } from "./navPerfDebug";
import NavDrawer from "./NavDrawer";
import SeriesBranch from "./SeriesBranch";
import { NestedEmptyRow, NestedRow } from "./NestedNavRow";
import { usePendingNavigation } from "../generic/usePendingNavigation";
import { useNavigationFeedbackContext } from "../generic/AppContext";
import {
  hasNavExpansionState,
  readNavExpansionState,
  readNavScrollTop,
  writeNavExpansionState,
  writeNavScrollTop,
} from "./navStateStorage";
import { readCachedIssues, readCachedSeries, writeCachedIssues, writeCachedSeries } from "./navDataCache";
import NavLoadingPlaceholder from "./NavLoadingPlaceholder";

interface ListProps {
  initialPublisherNodes?: PublisherNode[];
  initialSeriesNodesByPublisher?: Record<string, SeriesNode[]>;
  initialIssueNodesBySeriesKey?: Record<string, IssueNode[]>;
  drawerOpen?: boolean;
  toggleDrawer?: () => void;
  temporaryDrawer: boolean;
  phonePortrait: boolean;
  query?: {
    filter?: string | null;
    routeFilterKind?: string | null;
    routeFilterSlug?: string | null;
    navOpen?: string | null;
    navPublisher?: string | null;
    navSeries?: string | null;
  } | null;
  selected: SelectedRoot;
  session?: unknown;
  us?: boolean;
  loading?: boolean;
  [key: string]: unknown;
}

function applyInitialViewportSelection(input: {
  container: HTMLDivElement | null;
  canUseInitialViewportModel: boolean;
  initialViewportSelection: InitialViewportSelection | null;
  navStateKey: string;
  selectedRowKey: string | null;
  initialViewportAppliedKeyRef: React.MutableRefObject<string | null>;
  scrollRowIntoView: (rowKey: string, force?: boolean, behavior?: ScrollBehavior) => boolean;
}) {
  if (!input.canUseInitialViewportModel) return false;
  if (!input.container || !input.initialViewportSelection) return true;

  const initialViewportKey = `${input.navStateKey}|${input.selectedRowKey || ""}|${getInitialViewportSelectionSignature(input.initialViewportSelection)}`;
  if (input.initialViewportAppliedKeyRef.current === initialViewportKey) return true;

  const resolvedByExactRow = input.selectedRowKey
    ? input.scrollRowIntoView(input.selectedRowKey, true, "auto")
    : false;

  if (!resolvedByExactRow) {
    input.container.scrollTop = getInitialViewportScrollTop(
      input.initialViewportSelection,
      input.container.clientHeight
    );
  }

  input.initialViewportAppliedKeyRef.current = initialViewportKey;
  return true;
}

export default function List(props: Readonly<ListProps>) {
  const { isPending, push } = usePendingNavigation();
  const navigationFeedback = useNavigationFeedbackContext();
  const { drawerOpen, toggleDrawer } = props;
  const temporaryDrawer = props.temporaryDrawer;
  const filterQuery = props.query?.filter ?? null;
  const routeFilterKind = props.query?.routeFilterKind ?? null;
  const routeFilterSlug = props.query?.routeFilterSlug ?? null;
  const us = Boolean(props.us);
  const loading = Boolean(props.loading);
  const navStateKey = React.useMemo(
    () => buildNavStateKey({ us, filterQuery, routeFilterKind, routeFilterSlug }),
    [us, filterQuery, routeFilterKind, routeFilterSlug]
  );
  const phonePortrait = props.phonePortrait;
  const listRef = React.useRef<HTMLUListElement | null>(null);
  const navScrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const storeScrollTop = React.useCallback(() => {
    const container = navScrollContainerRef.current;
    if (container) {
      writeNavScrollTop(navStateKey, container.scrollTop);
      return;
    }

    const listElement = listRef.current;
    if (listElement) {
      writeNavScrollTop(navStateKey, listElement.scrollTop);
    }
  }, [navStateKey]);
  const selectedPublisherName = getSelectedPublisherName(props.selected);
  const selectedSeriesKey = getSelectedSeriesKey(props.selected);
  const selectedRowKey = React.useMemo(() => buildPendingNavigationKey(props.selected) || null, [props.selected]);
  const selectedIssue = props.selected?.issue;
  const visiblePublisherNodes = React.useMemo(
    () => props.initialPublisherNodes || [],
    [props.initialPublisherNodes]
  );
  const [expandedPublishers, setExpandedPublishers] = React.useState<Record<string, boolean>>(() => {
    if (!selectedPublisherName) return {};
    const canonicalPublisherName =
      (props.initialPublisherNodes || []).find((node) => isSameEntityName(node.name, selectedPublisherName))
        ?.name || selectedPublisherName;
    return buildExpandedPublishers(canonicalPublisherName ? [canonicalPublisherName] : []);
  });
  const [publisherExpansionReady, setPublisherExpansionReady] = React.useState(false);
  const [pendingPublisherKey, setPendingPublisherKey] = React.useState<string | null>(null);
  const [pendingNavigationKey, setPendingNavigationKey] = React.useState<string | null>(null);
  const [navAction, setNavAction] = React.useState<NavListAction | null>(null);
  const [selectedPathReady, setSelectedPathReady] = React.useState(() => !selectedPublisherName);
  const navActionTokenRef = React.useRef(0);
  const publisherAutoRevealKeyRef = React.useRef<string | null>(null);
  const selectedPathInitKeyRef = React.useRef<string | null>(null);
  const deferredExpandedPublishersRef = React.useRef<Record<string, boolean> | null>(null);
  const deferredPublisherRestoreCompensationRef = React.useRef<{
    anchorTop: number;
    publisherName: string;
  } | null>(null);
  const initialViewportAppliedKeyRef = React.useRef<string | null>(null);
  const [seriesNodesByPublisher, setSeriesNodesByPublisher] = React.useState<Record<string, SeriesNode[]>>(
    () => {
      const nextState: Record<string, SeriesNode[]> = props.initialSeriesNodesByPublisher
        ? { ...props.initialSeriesNodesByPublisher }
        : {};
      if (selectedPublisherName && !nextState[selectedPublisherName]) {
        const cachedSelectedSeries = readCachedSeries(navStateKey, selectedPublisherName);
        if (cachedSelectedSeries) {
          nextState[selectedPublisherName] = cachedSelectedSeries;
        }
      }
      for (const publisherName of Object.keys(nextState)) {
        writeCachedSeries(navStateKey, publisherName, nextState[publisherName] || []);
      }
      return nextState;
    }
  );
  const [issueNodesBySeriesKey, setIssueNodesBySeriesKey] = React.useState<Record<string, IssueNode[]>>(
    () => {
      const nextState: Record<string, IssueNode[]> = props.initialIssueNodesBySeriesKey
        ? { ...props.initialIssueNodesBySeriesKey }
        : {};
      if (selectedSeriesKey && !nextState[selectedSeriesKey]) {
        const cachedSelectedIssues = readCachedIssues(navStateKey, selectedSeriesKey);
        if (cachedSelectedIssues) {
          nextState[selectedSeriesKey] = cachedSelectedIssues;
        }
      }
      for (const seriesKey of Object.keys(nextState)) {
        writeCachedIssues(navStateKey, seriesKey, nextState[seriesKey] || []);
      }
      return nextState;
    }
  );
  const canonicalSelectedPublisherName = React.useMemo(
    () => resolveCanonicalPublisherName(visiblePublisherNodes, selectedPublisherName),
    [selectedPublisherName, visiblePublisherNodes]
  );
  const selectedPublisherIndex = React.useMemo(() => {
    if (!canonicalSelectedPublisherName) return -1;
    return visiblePublisherNodes.findIndex((node) =>
      isSameEntityName(node.name, canonicalSelectedPublisherName)
    );
  }, [canonicalSelectedPublisherName, visiblePublisherNodes]);
  const selectedSeriesNodes = React.useMemo(() => {
    if (!canonicalSelectedPublisherName) return null;
    return seriesNodesByPublisher[canonicalSelectedPublisherName] || null;
  }, [canonicalSelectedPublisherName, seriesNodesByPublisher]);
  const selectedSeriesIndex = React.useMemo(
    () => getSelectedSeriesIndex(selectedSeriesKey, selectedSeriesNodes),
    [selectedSeriesKey, selectedSeriesNodes]
  );
  const selectedIssueNodes = React.useMemo(() => {
    if (!selectedSeriesKey) return null;
    return issueNodesBySeriesKey[selectedSeriesKey] ?? null;
  }, [issueNodesBySeriesKey, selectedSeriesKey]);
  const selectedIssueIndex = React.useMemo(
    () => getSelectedIssueIndex({ selectedIssue, selectedSeriesKey, selectedIssueNodes }),
    [selectedIssue, selectedIssueNodes, selectedSeriesKey]
  );
  const isAwaitingIssueViewport = Boolean(
    selectedIssue &&
      selectedSeriesKey &&
      selectedSeriesIndex >= 0 &&
      selectedIssueNodes == null
  );
  const isIssueViewportMiss = Boolean(
    selectedIssue &&
      selectedSeriesKey &&
      selectedSeriesIndex >= 0 &&
      selectedIssueNodes &&
      selectedIssueIndex < 0
  );
  const initialViewportSelection = React.useMemo<InitialViewportSelection | null>(
    () =>
      getInitialViewportSelection({
        selectedPublisherIndex,
        selectedIssue,
        selectedSeriesNodes,
        selectedSeriesIndex,
        selectedSeriesKey,
        selectedIssueNodes,
        selectedIssueIndex,
      }),
    [
      selectedIssue,
      selectedIssueIndex,
      selectedIssueNodes,
      selectedPublisherIndex,
      selectedSeriesIndex,
      selectedSeriesKey,
      selectedSeriesNodes,
    ]
  );
  const canUseInitialViewportModel = Boolean(selectedRowKey && initialViewportSelection);
  const allowAutoRevealFallback =
    !canUseInitialViewportModel && !isAwaitingIssueViewport
      ? true
      : isIssueViewportMiss;
  const navigationUiLoading = loading;

  React.useEffect(() => {
    setSelectedPathReady(!selectedPublisherName);
    const selectedPathInitKey = [
      navStateKey,
      selectedPublisherName || "",
      selectedSeriesKey || "",
      selectedRowKey || "",
    ].join("|");
    selectedPathInitKeyRef.current = selectedPathInitKey;
    if (selectedPublisherName) {
      markNavPerf("selected-path:init:start", {
        publisher: selectedPublisherName,
        seriesKey: selectedSeriesKey,
        rowKey: selectedRowKey,
      });
    }
  }, [navStateKey, selectedPublisherName, selectedSeriesKey, selectedRowKey]);

  React.useEffect(() => {
    if (!selectedPathReady || !selectedPublisherName) return;
    if (!selectedPathInitKeyRef.current) return;

    markNavPerf("selected-path:init:ready", {
      publisher: canonicalSelectedPublisherName || selectedPublisherName,
      seriesKey: selectedSeriesKey,
      rowKey: selectedRowKey,
    });
    measureNavPerf(
      "selected-path:init",
      "selected-path:init:start",
      "selected-path:init:ready"
    );
    printNavPerfSummary("selected-path-ready");
  }, [
    canonicalSelectedPublisherName,
    selectedPathReady,
    selectedPublisherName,
    selectedRowKey,
    selectedSeriesKey,
  ]);

  React.useLayoutEffect(() => {
    const storedExpansion = readNavExpansionState(navStateKey);
    const hasStoredExpansion = hasNavExpansionState(navStateKey);

    // Resolve canonical publisher name from actual nodes to fix URL-slug casing mismatches
    // (e.g. parsePublisherSlug("dc-comics") → "Dc Comics", but DB stores "DC Comics")
    const canonicalPublisherName = selectedPublisherName
      ? (visiblePublisherNodes.find((n) => isSameEntityName(n.name, selectedPublisherName))?.name
          ?? selectedPublisherName)
      : "";

    const requiredExpansion = buildExpandedPublishers(
      canonicalPublisherName ? [canonicalPublisherName] : []
    );

    // Normalize any stale stored keys against actual publisher nodes
    let normalizedStored = storedExpansion;
    if (hasStoredExpansion && visiblePublisherNodes.length > 0) {
      normalizedStored = Object.fromEntries(
        Object.entries(storedExpansion).map(([key, value]) => {
          const canonical = visiblePublisherNodes.find((n) => isSameEntityName(n.name, key));
          return [canonical?.name ?? key, value] as const;
        })
      );
    }
    deferredExpandedPublishersRef.current = normalizedStored;

    let nextExpandedPublishers = requiredExpansion;
    if (!selectedPublisherName && hasStoredExpansion) {
      nextExpandedPublishers = { ...normalizedStored, ...requiredExpansion };
    }
    setExpandedPublishers(nextExpandedPublishers);
    setPublisherExpansionReady(true);
  }, [navStateKey, selectedPublisherName, visiblePublisherNodes]);

  React.useLayoutEffect(() => {
    if (!selectedPathReady) return;
    const deferredExpandedPublishers = deferredExpandedPublishersRef.current;
    if (!deferredExpandedPublishers) return;

    const container = navScrollContainerRef.current;
    const selectedPublisherRow = canonicalSelectedPublisherName
      ? container?.querySelector<HTMLElement>(
          `[data-nav-row-key="${CSS.escape(canonicalSelectedPublisherName)}"]`
        ) || null
      : null;

    deferredPublisherRestoreCompensationRef.current =
      container && selectedPublisherRow && canonicalSelectedPublisherName
        ? {
            publisherName: canonicalSelectedPublisherName,
            anchorTop:
              selectedPublisherRow.getBoundingClientRect().top - container.getBoundingClientRect().top,
          }
        : null;

    setExpandedPublishers((prev) => ({ ...deferredExpandedPublishers, ...prev }));
    deferredExpandedPublishersRef.current = null;
  }, [canonicalSelectedPublisherName, selectedPathReady]);

  React.useLayoutEffect(() => {
    const pendingCompensation = deferredPublisherRestoreCompensationRef.current;
    if (!pendingCompensation) return;

    const container = navScrollContainerRef.current;
    if (!container) {
      deferredPublisherRestoreCompensationRef.current = null;
      return;
    }

    const selectedPublisherRow = container.querySelector<HTMLElement>(
      `[data-nav-row-key="${CSS.escape(pendingCompensation.publisherName)}"]`
    );
    if (!selectedPublisherRow) {
      deferredPublisherRestoreCompensationRef.current = null;
      return;
    }

    const nextAnchorTop =
      selectedPublisherRow.getBoundingClientRect().top - container.getBoundingClientRect().top;
    const delta = nextAnchorTop - pendingCompensation.anchorTop;
    if (delta !== 0) {
      container.scrollTop += delta;
    }
    deferredPublisherRestoreCompensationRef.current = null;
  }, [expandedPublishers]);

  React.useEffect(() => {
    if (!publisherExpansionReady) return;
    writeNavExpansionState(navStateKey, expandedPublishers);
  }, [expandedPublishers, navStateKey, publisherExpansionReady]);

  React.useLayoutEffect(() => {
    setSeriesNodesByPublisher((prev) => {
      const nextState = { ...prev };
      for (const [publisherName, seriesNodes] of Object.entries(props.initialSeriesNodesByPublisher || {})) {
        nextState[publisherName] = seriesNodes;
        writeCachedSeries(navStateKey, publisherName, seriesNodes);
      }
      return nextState;
    });
  }, [props.initialSeriesNodesByPublisher, navStateKey]);

  React.useLayoutEffect(() => {
    if (!selectedPublisherName) return;
    if (seriesNodesByPublisher[selectedPublisherName]) return;

    const cachedSelectedSeries = readCachedSeries(navStateKey, selectedPublisherName);
    if (!cachedSelectedSeries) return;

    setSeriesNodesByPublisher((prev) =>
      prev[selectedPublisherName] ? prev : { ...prev, [selectedPublisherName]: cachedSelectedSeries }
    );
  }, [navStateKey, selectedPublisherName, seriesNodesByPublisher]);

  React.useLayoutEffect(() => {
    setIssueNodesBySeriesKey((prev) => {
      const nextState = { ...prev };
      for (const [seriesKey, issueNodes] of Object.entries(props.initialIssueNodesBySeriesKey || {})) {
        nextState[seriesKey] = issueNodes;
        writeCachedIssues(navStateKey, seriesKey, issueNodes);
      }
      return nextState;
    });
  }, [props.initialIssueNodesBySeriesKey, navStateKey]);

  React.useLayoutEffect(() => {
    if (!selectedSeriesKey) return;
    if (issueNodesBySeriesKey[selectedSeriesKey]) return;

    const cachedSelectedIssues = readCachedIssues(navStateKey, selectedSeriesKey);
    if (!cachedSelectedIssues) return;

    setIssueNodesBySeriesKey((prev) =>
      prev[selectedSeriesKey] ? prev : { ...prev, [selectedSeriesKey]: cachedSelectedIssues }
    );
  }, [issueNodesBySeriesKey, navStateKey, selectedSeriesKey]);

  React.useEffect(() => {
    if (isPending) return;
    setPendingPublisherKey(null);
    setPendingNavigationKey(null);
  }, [isPending]);

  React.useEffect(() => {
    navigationFeedback.setNavigationUiLoading(navigationUiLoading);
    return () => {
      navigationFeedback.setNavigationUiLoading(false);
    };
  }, [navigationFeedback, navigationUiLoading]);

  const scrollRowIntoView = React.useCallback(
    (rowKey: string, force = false, behavior?: ScrollBehavior) => {
      const container = navScrollContainerRef.current;
      if (!container) return false;

      const row = container.querySelector<HTMLElement>(`[data-nav-row-key="${CSS.escape(rowKey)}"]`);
      if (!row) return false;
      if (!force && isElementVisibleInContainer(row, container)) return true;

      scrollNavElementIntoView(row, container, { behavior });
      return true;
    },
    []
  );

  React.useLayoutEffect(() => {
    const initialViewportApplied = applyInitialViewportSelection({
      container: navScrollContainerRef.current,
      canUseInitialViewportModel,
      initialViewportSelection,
      navStateKey,
      selectedRowKey,
      initialViewportAppliedKeyRef,
      scrollRowIntoView,
    });

    if (initialViewportApplied) {
      if (!selectedPathReady) {
        setSelectedPathReady(true);
      }
      return;
    }

    if (selectedRowKey) return;

    const targetScrollTop = readNavScrollTop(navStateKey);
    const container = navScrollContainerRef.current;
    if (container) container.scrollTop = targetScrollTop;

    const listElement = listRef.current;
    if (listElement) listElement.scrollTop = targetScrollTop;
  }, [
    canUseInitialViewportModel,
    initialViewportSelection,
    navStateKey,
    scrollRowIntoView,
    selectedPathReady,
    selectedRowKey,
    visiblePublisherNodes.length,
  ]);

  React.useEffect(() => {
    return () => {
      storeScrollTop();
    };
  }, [storeScrollTop]);

  const tryResolveInitialPublisherViewport = React.useCallback(() => {
    if (isAwaitingIssueViewport) return;
    if (canUseInitialViewportModel) return;
    if (!selectedPublisherName) return;

    // Keep deeper explicit targets (series/issue row keys) in control.
    if (selectedRowKey && !isSameEntityName(selectedRowKey, selectedPublisherName)) return;

    const autoRevealKey = `${navStateKey}|publisher|${selectedPublisherName}|${selectedRowKey || ""}`;
    if (publisherAutoRevealKeyRef.current === autoRevealKey) return;

    const container = navScrollContainerRef.current;
    const listElement = listRef.current;
    if (!container || !listElement) return;

    const selectedRow = Array.from(
      listElement.querySelectorAll<HTMLElement>("[data-nav-row-key]")
    ).find((element) => isSameEntityName(element.dataset.navRowKey, selectedPublisherName));
    if (!selectedRow) return;
    if (isElementVisibleInContainer(selectedRow, container)) {
      publisherAutoRevealKeyRef.current = autoRevealKey;
      if (!selectedSeriesKey) {
        setSelectedPathReady(true);
      }
      return;
    }

    scrollNavElementIntoView(selectedRow, container, { behavior: "auto" });
    publisherAutoRevealKeyRef.current = autoRevealKey;
    if (!selectedSeriesKey) {
      setSelectedPathReady(true);
    }
  }, [
    canUseInitialViewportModel,
    isAwaitingIssueViewport,
    navStateKey,
    selectedPublisherName,
    selectedRowKey,
    selectedSeriesKey,
  ]);

  React.useLayoutEffect(() => {
    tryResolveInitialPublisherViewport();
  }, [tryResolveInitialPublisherViewport, visiblePublisherNodes.length]);

  const handleSelectedPathReady = React.useCallback(() => {
    markNavPerf("selected-path:priority-ready", {
      publisher: canonicalSelectedPublisherName || selectedPublisherName,
      seriesKey: selectedSeriesKey,
      rowKey: selectedRowKey,
    });
    measureNavPerf(
      "selected-path:priority",
      "selected-path:init:start",
      "selected-path:priority-ready"
    );
    setSelectedPathReady(true);
  }, [canonicalSelectedPublisherName, selectedPublisherName, selectedRowKey, selectedSeriesKey]);

  const updateNavOpenState = React.useCallback(
    async (publisherName: string) => {
      if (seriesNodesByPublisher[publisherName]) return true;
      const cached = readCachedSeries(navStateKey, publisherName);
      if (cached) {
        markNavPerf("publisher-series:cache-hit", { publisher: publisherName, count: cached.length });
        setSeriesNodesByPublisher((prev) => (prev[publisherName] ? prev : { ...prev, [publisherName]: cached }));
        return true;
      }

      setPendingPublisherKey(`publisher:${publisherName}`);
      markNavPerf("publisher-series:fetch:start", { publisher: publisherName });
      try {
        const params = new URLSearchParams({
          scope: "series",
          publisher: publisherName,
          us: String(us),
        });
        if (filterQuery) params.set("filter", filterQuery);
        if (routeFilterKind) params.set("routeFilterKind", routeFilterKind);
        if (routeFilterSlug) params.set("routeFilterSlug", routeFilterSlug);
        const response = await fetch(`/api/public-navigation?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) return false;
        const payload = (await response.json()) as { items?: SeriesNode[] };
        const seriesNodes = payload.items || [];
        markNavPerf("publisher-series:fetch:end", {
          publisher: publisherName,
          count: seriesNodes.length,
        });
        measureNavPerf(
          "publisher-series:fetch",
          "publisher-series:fetch:start",
          "publisher-series:fetch:end",
          { publisher: publisherName }
        );
        writeCachedSeries(navStateKey, publisherName, seriesNodes);
        setSeriesNodesByPublisher((prev) => ({ ...prev, [publisherName]: seriesNodes }));
        return true;
      } finally {
        setPendingPublisherKey((prev) =>
          prev === `publisher:${publisherName}` ? null : prev
        );
      }
    },
    [seriesNodesByPublisher, navStateKey, us, filterQuery, routeFilterKind, routeFilterSlug]
  );

  const ensureIssueNodesLoaded = React.useCallback(
    async (seriesNode: SeriesNode) => {
      const publisherName = seriesNode.publisher?.name || "";
      const seriesTitle = seriesNode.title || "";
      const seriesKey = getSeriesKey(seriesNode);
      if (issueNodesBySeriesKey[seriesKey]) return true;
      const cached = readCachedIssues(navStateKey, seriesKey);
      if (cached) {
        markNavPerf("series-issues:cache-hit", {
          publisher: publisherName,
          seriesKey,
          count: cached.length,
        });
        setIssueNodesBySeriesKey((prev) => (prev[seriesKey] ? prev : { ...prev, [seriesKey]: cached }));
        return true;
      }

      setPendingPublisherKey(`series:${publisherName}:${seriesKey}`);
      markNavPerf("series-issues:fetch:start", { publisher: publisherName, seriesKey });
      try {
        const params = new URLSearchParams({
          scope: "issues",
          publisher: publisherName,
          series: seriesTitle,
          volume: String(seriesNode.volume ?? 0),
          us: String(us),
        });
        if (Number(seriesNode.startyear || 0) > 0) {
          params.set("startyear", String(seriesNode.startyear));
        }
        if (filterQuery) params.set("filter", filterQuery);
        if (routeFilterKind) params.set("routeFilterKind", routeFilterKind);
        if (routeFilterSlug) params.set("routeFilterSlug", routeFilterSlug);
        const response = await fetch(`/api/public-navigation?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) return false;
        const payload = (await response.json()) as { items?: IssueNode[] };
        const issueNodes = payload.items || [];
        markNavPerf("series-issues:fetch:end", {
          publisher: publisherName,
          seriesKey,
          count: issueNodes.length,
        });
        measureNavPerf(
          "series-issues:fetch",
          "series-issues:fetch:start",
          "series-issues:fetch:end",
          { publisher: publisherName, seriesKey }
        );
        writeCachedIssues(navStateKey, seriesKey, issueNodes);
        setIssueNodesBySeriesKey((prev) => ({ ...prev, [seriesKey]: issueNodes }));
        return true;
      } finally {
        setPendingPublisherKey((prev) =>
          prev === `series:${publisherName}:${seriesKey}` ? null : prev
        );
      }
    },
    [issueNodesBySeriesKey, navStateKey, us, filterQuery, routeFilterKind, routeFilterSlug]
  );

  React.useEffect(() => {
    const expandedPublisherNames = Object.keys(expandedPublishers).filter(
      (publisherName) => expandedPublishers[publisherName]
    );
    const publishersToLoad =
      !canonicalSelectedPublisherName || selectedPathReady
        ? expandedPublisherNames
        : expandedPublisherNames.filter((publisherName) =>
            isSameEntityName(publisherName, canonicalSelectedPublisherName)
          );

    for (const publisherName of publishersToLoad) {
      void updateNavOpenState(publisherName);
    }
  }, [canonicalSelectedPublisherName, expandedPublishers, selectedPathReady, updateNavOpenState]);

  const pushSelection = React.useCallback(
    (_event: unknown, item: SelectedRoot, closeOnPhone = false) => {
      storeScrollTop();
      if (closeOnPhone && phonePortrait) toggleDrawer?.();

      setPendingNavigationKey(buildPendingNavigationKey(item));
      push(
        buildRouteHref(generateSeoUrl(item, us), props.query, {
          expand: null,
          filter: filterQuery,
        })
      );
    },
    [storeScrollTop, phonePortrait, toggleDrawer, push, filterQuery, us, props.query]
  );

  const handleTogglePublisher = React.useCallback(
    (publisherName: string) => {
      const isExpanded = Boolean(expandedPublishers[publisherName]);
      if (isExpanded) {
        setExpandedPublishers((prev) =>
          Object.fromEntries(Object.entries(prev).filter(([key]) => key !== publisherName))
        );
        return;
      }

      void updateNavOpenState(publisherName).then((loaded) => {
        if (!loaded) return;
        setExpandedPublishers((prev) => ({ ...prev, [publisherName]: true }));
      });
    },
    [expandedPublishers, updateNavOpenState]
  );

  const handlePublisherClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, publisherName: string) => {
      void updateNavOpenState(publisherName).then((loaded) => {
        if (!loaded) return;
        setExpandedPublishers((prev) => ({ ...prev, [publisherName]: true }));
      });
      pushSelection(event, {
        publisher: {
          name: publisherName,
          us,
        },
      });
    },
    [pushSelection, us, updateNavOpenState]
  );

  const selectedContext = React.useMemo(
    () => getSelectedContext(props.selected, selectedPublisherName, selectedSeriesKey),
    [props.selected, selectedPublisherName, selectedSeriesKey]
  );
  const publisherRouteSelected = Boolean(
    props.selected.publisher && !props.selected.series && !props.selected.issue
  );

  const getNextNavActionToken = React.useCallback(() => {
    navActionTokenRef.current += 1;
    return navActionTokenRef.current;
  }, []);

  const handleScrollToSelected = React.useCallback(async () => {
    if (!selectedRowKey) return;

    if (!canonicalSelectedPublisherName) {
      scrollRowIntoView(selectedRowKey, true);
      return;
    }

    const publisherLoaded = await updateNavOpenState(canonicalSelectedPublisherName);
    if (!publisherLoaded) return;

    setExpandedPublishers((prev) => ({ ...prev, [canonicalSelectedPublisherName]: true }));

    if (!selectedContext.seriesKey) {
      requestAnimationFrame(() => {
        scrollRowIntoView(selectedRowKey, true);
      });
      return;
    }

    setNavAction({
      type: "scrollToSelected",
      token: getNextNavActionToken(),
      publisherName: canonicalSelectedPublisherName,
      seriesKey: selectedContext.seriesKey,
      rowKey: selectedRowKey,
    });
  }, [
    canonicalSelectedPublisherName,
    getNextNavActionToken,
    scrollRowIntoView,
    selectedContext,
    selectedRowKey,
    updateNavOpenState,
  ]);

  let content: React.ReactNode;
  if (loading && visiblePublisherNodes.length === 0) {
    content = <NavLoadingPlaceholder />;
  } else if (visiblePublisherNodes.length === 0) {
    content = <NestedEmptyRow depth={0} message="Keine Einträge vorhanden" />;
  } else {
    content = visiblePublisherNodes.map((publisherNode) => {
      const publisherName = publisherNode.name || "";
      const expanded = Boolean(expandedPublishers[publisherName]);
      const selected = isSameEntityName(selectedPublisherName, publisherName);
      const isCanonicalSelectedPublisher = isSameEntityName(
        publisherName,
        canonicalSelectedPublisherName
      );
      const bypassSeriesCollapse =
        expanded && selected && !selectedPathReady && isCanonicalSelectedPublisher;
      const seriesBranch = (
        <SeriesBranch
          us={us}
          publisher={publisherNode}
          initialSeriesNodes={seriesNodesByPublisher[publisherName]}
          initialIssueNodesBySeriesKey={issueNodesBySeriesKey}
          navStateKey={navStateKey}
          activeSeriesKey={selected ? selectedSeriesKey : null}
          selectedIssue={selectedIssue}
          session={props.session}
          pushSelection={pushSelection}
          ensureIssueNodesLoaded={ensureIssueNodesLoaded}
          navScrollContainerRef={navScrollContainerRef}
          navigationPending={isPending}
          pendingNavigationKey={pendingNavigationKey}
          pendingPublisherKey={pendingPublisherKey}
          navAction={navAction}
          selectedRowKey={selectedRowKey}
          deferNonPriorityInitialization={!selectedPathReady}
          deferProgressiveWindowing={!selectedPathReady && isCanonicalSelectedPublisher}
          restoreStoredExpansion={selectedPathReady || !isCanonicalSelectedPublisher}
          collapseStoredExpansion={selected && publisherRouteSelected}
          allowAutoRevealFallback={allowAutoRevealFallback}
          bypassInitialIssueCollapseAnimation={bypassSeriesCollapse}
          onPriorityPathReady={isCanonicalSelectedPublisher ? handleSelectedPathReady : undefined}
        />
      );

      let renderedSeriesBranch: React.ReactNode = (
        <Collapse
          in={expanded}
          timeout="auto"
          unmountOnExit
          component="div"
        >
          {seriesBranch}
        </Collapse>
      );
      if (bypassSeriesCollapse) {
        renderedSeriesBranch = <Box component="div">{seriesBranch}</Box>;
      }

      return (
        <Box
          key={publisherName || "publisher-empty"}
          component="li"
          sx={{ listStyle: "none", m: 0, p: 0 }}
        >
          <NestedRow
            rowKey={publisherName}
            depth={0}
            showDivider={true}
            navRowKey={publisherName}
            selected={selected}
            label={publisherName}
            expanded={expanded}
            pending={
              pendingPublisherKey === `publisher:${publisherName}` ||
              pendingNavigationKey === publisherName
            }
            disabled={isPending}
            onToggle={handleTogglePublisher}
            onClick={handlePublisherClick}
          />
          {renderedSeriesBranch}
        </Box>
      );
    });
  }

  return (
    <NavDrawer
      temporary={temporaryDrawer}
      drawerOpen={drawerOpen}
      toggleDrawer={toggleDrawer}
      navStateKey={navStateKey}
      navScrollContainerRef={navScrollContainerRef}
      listRef={listRef}
      onScrollToSelected={handleScrollToSelected}
      disableScrollToSelected={!selectedRowKey}
    >
      {content}
    </NavDrawer>
  );
}
