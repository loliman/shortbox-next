"use client";

import React from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Collapse from "@mui/material/Collapse";
import { generateSeoUrl } from "../../util/hierarchy";
import { buildRouteHref } from "../generic/routeHref";
import type { SelectedRoot } from "../../types/domain";
import {
  getSeriesKey,
  getSelectedPublisherName,
  getSelectedSeriesKey,
  isElementVisibleInContainer,
  isSameEntityName,
  type IssueNode,
  type PublisherNode,
  type SeriesNode,
} from "./listTreeUtils";
import NavDrawer from "./NavDrawer";
import SeriesBranch from "./SeriesBranch";
import { NestedEmptyRow, NestedRow } from "./NestedNavRow";
import { TypeListEntryPlaceholder } from "./ListPlaceholders";
import { usePendingNavigation } from "../generic/usePendingNavigation";
import {
  hasNavExpansionState,
  readNavExpansionState,
  readNavScrollTop,
  writeNavExpansionState,
  writeNavScrollTop,
} from "./navStateStorage";
import { readCachedIssues, readCachedSeries, writeCachedIssues, writeCachedSeries } from "./navDataCache";

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

export default function List(props: Readonly<ListProps>) {
  const { isPending, push } = usePendingNavigation();
  const { drawerOpen, toggleDrawer } = props;
  const temporaryDrawer = props.temporaryDrawer;
  const filterQuery = props.query?.filter ?? null;
  const routeFilterKind = props.query?.routeFilterKind ?? null;
  const routeFilterSlug = props.query?.routeFilterSlug ?? null;
  const us = Boolean(props.us);
  const loading = Boolean(props.loading);
  const navStateKey = React.useMemo(
    () => `${us}|${filterQuery || ""}|${routeFilterKind || ""}|${routeFilterSlug || ""}`,
    [us, filterQuery, routeFilterKind, routeFilterSlug]
  );
  const phonePortrait = props.phonePortrait;
  const listRef = React.useRef<HTMLUListElement | null>(null);
  const navScrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const suppressIssueAutoScrollRef = React.useRef(false);
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
  const selectedIssue = props.selected?.issue;
  const publisherNodes = props.initialPublisherNodes || [];
  const visiblePublisherNodes = publisherNodes;
  const [expandedPublishers, setExpandedPublishers] = React.useState<Record<string, boolean>>({});
  const [publisherExpansionReady, setPublisherExpansionReady] = React.useState(false);
  const [pendingPublisherKey, setPendingPublisherKey] = React.useState<string | null>(null);
  const [pendingNavigationKey, setPendingNavigationKey] = React.useState<string | null>(null);
  const contentReady = true;
  const [seriesNodesByPublisher, setSeriesNodesByPublisher] = React.useState<Record<string, SeriesNode[]>>(
    () => {
      const nextState: Record<string, SeriesNode[]> = { ...(props.initialSeriesNodesByPublisher || {}) };
      for (const publisherName of Object.keys(nextState)) {
        writeCachedSeries(navStateKey, publisherName, nextState[publisherName] || []);
      }
      return nextState;
    }
  );
  const [issueNodesBySeriesKey, setIssueNodesBySeriesKey] = React.useState<Record<string, IssueNode[]>>(
    () => {
      const nextState: Record<string, IssueNode[]> = { ...(props.initialIssueNodesBySeriesKey || {}) };
      for (const seriesKey of Object.keys(nextState)) {
        writeCachedIssues(navStateKey, seriesKey, nextState[seriesKey] || []);
      }
      return nextState;
    }
  );

  React.useEffect(() => {
    const storedExpansion = readNavExpansionState(navStateKey);
    const hasStoredExpansion = hasNavExpansionState(navStateKey);
    const requiredExpansion = buildExpandedPublishers(
      selectedPublisherName ? [selectedPublisherName] : []
    );
    setExpandedPublishers(
      hasStoredExpansion
        ? { ...storedExpansion, ...requiredExpansion }
        : requiredExpansion
    );
    setPublisherExpansionReady(true);
  }, [navStateKey, selectedPublisherName]);

  React.useEffect(() => {
    if (!publisherExpansionReady) return;
    writeNavExpansionState(navStateKey, expandedPublishers);
  }, [expandedPublishers, navStateKey, publisherExpansionReady]);

  React.useEffect(() => {
    setSeriesNodesByPublisher((prev) => {
      const nextState = { ...prev };
      for (const [publisherName, seriesNodes] of Object.entries(props.initialSeriesNodesByPublisher || {})) {
        nextState[publisherName] = seriesNodes;
        writeCachedSeries(navStateKey, publisherName, seriesNodes);
      }
      return nextState;
    });
  }, [props.initialSeriesNodesByPublisher, navStateKey]);

  React.useEffect(() => {
    setIssueNodesBySeriesKey((prev) => {
      const nextState = { ...prev };
      for (const [seriesKey, issueNodes] of Object.entries(props.initialIssueNodesBySeriesKey || {})) {
        nextState[seriesKey] = issueNodes;
        writeCachedIssues(navStateKey, seriesKey, issueNodes);
      }
      return nextState;
    });
  }, [props.initialIssueNodesBySeriesKey, navStateKey]);

  React.useEffect(() => {
    if (isPending) return;
    setPendingPublisherKey(null);
    setPendingNavigationKey(null);
  }, [isPending]);

  React.useLayoutEffect(() => {
    const targetScrollTop = readNavScrollTop(navStateKey);
    const container = navScrollContainerRef.current;
    if (container) container.scrollTop = targetScrollTop;

    const listElement = listRef.current;
    if (listElement) listElement.scrollTop = targetScrollTop;
  }, [navStateKey, visiblePublisherNodes.length]);

  React.useEffect(() => {
    return () => {
      storeScrollTop();
    };
  }, [storeScrollTop]);

  React.useEffect(() => {
    if (selectedIssue?.number) return;
    suppressIssueAutoScrollRef.current = false;
  }, [selectedIssue?.number]);

  React.useEffect(() => {
    if (!selectedPublisherName) return;

    const container = navScrollContainerRef.current;
    const listElement = listRef.current;
    if (!container || !listElement) return;

    const selectedRow = Array.from(
      listElement.querySelectorAll<HTMLElement>("[data-nav-row-key]")
    ).find((element) => isSameEntityName(element.dataset.navRowKey, selectedPublisherName));
    if (!selectedRow) return;
    if (isElementVisibleInContainer(selectedRow, container)) return;

    selectedRow.scrollIntoView({
      block: "center",
      inline: "nearest",
    });
  }, [selectedPublisherName, expandedPublishers, visiblePublisherNodes.length]);

  const updateNavOpenState = React.useCallback(
    async (publisherName: string) => {
      if (seriesNodesByPublisher[publisherName]) return true;
      const cached = readCachedSeries(navStateKey, publisherName);
      if (cached) {
        setSeriesNodesByPublisher((prev) => (prev[publisherName] ? prev : { ...prev, [publisherName]: cached }));
        return true;
      }

      setPendingPublisherKey(`publisher:${publisherName}`);
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
        setIssueNodesBySeriesKey((prev) => (prev[seriesKey] ? prev : { ...prev, [seriesKey]: cached }));
        return true;
      }

      setPendingPublisherKey(`series:${publisherName}:${seriesKey}`);
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
    for (const publisherName of Object.keys(expandedPublishers)) {
      if (!expandedPublishers[publisherName]) continue;
      void updateNavOpenState(publisherName);
    }
  }, [expandedPublishers, updateNavOpenState]);

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

  const content =
    loading && visiblePublisherNodes.length === 0 ? (
      <>
        {Array.from({ length: 20 }, (_unused, idx) => (
          <TypeListEntryPlaceholder key={`nav-loading-placeholder-${idx}`} />
        ))}
      </>
    ) : visiblePublisherNodes.length === 0 ? (
      <NestedEmptyRow depth={0} message="Keine Einträge vorhanden" />
    ) : (
      visiblePublisherNodes.map((publisherNode) => {
        const publisherName = publisherNode.name || "";
        const expanded = Boolean(expandedPublishers[publisherName]);
        const selected = isSameEntityName(selectedPublisherName, publisherName);

        return (
          <Box key={publisherName || "publisher-empty"}>
            <Divider
              sx={{
                mx: "5%",
                width: "90%",
                borderColor: (theme) => theme.palette.grey[300],
                borderBottomWidth: 1,
                opacity: 0.95,
              }}
            />

            <NestedRow
              rowKey={publisherName}
              depth={0}
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

            <Collapse in={expanded} timeout="auto" unmountOnExit>
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
                suppressAutoScrollRef={suppressIssueAutoScrollRef}
                navigationPending={isPending}
                pendingNavigationKey={pendingNavigationKey}
                pendingPublisherKey={pendingPublisherKey}
              />
            </Collapse>
          </Box>
        );
      })
    );

  return (
    <NavDrawer
      temporary={temporaryDrawer}
      drawerOpen={drawerOpen}
      toggleDrawer={toggleDrawer}
      navStateKey={navStateKey}
      contentReady={contentReady}
      navScrollContainerRef={navScrollContainerRef}
      listRef={listRef}
    >
      {content}
    </NavDrawer>
  );
}

function buildExpandedPublishers(openPublisherNames: string[]) {
  const nextExpandedPublishers: Record<string, boolean> = {};
  for (const publisherName of openPublisherNames) {
    nextExpandedPublishers[publisherName] = true;
  }
  return nextExpandedPublishers;
}

function buildPendingNavigationKey(item: SelectedRoot) {
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
