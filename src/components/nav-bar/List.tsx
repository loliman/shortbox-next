"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Collapse from "@mui/material/Collapse";
import { generateUrl } from "../../util/hierarchy";
import { buildRouteHref } from "../generic/routeHref";
import type { SelectedRoot } from "../../types/domain";
import {
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

interface ListProps {
  initialPublisherNodes?: PublisherNode[];
  initialSeriesNodesByPublisher?: Record<string, SeriesNode[]>;
  initialIssueNodesBySeriesKey?: Record<string, IssueNode[]>;
  drawerOpen?: boolean;
  toggleDrawer?: () => void;
  temporaryDrawer: boolean;
  phonePortrait: boolean;
  query?: { filter?: string | null; navPublisher?: string | null; navSeries?: string | null } | null;
  selected: SelectedRoot;
  session?: unknown;
  us?: boolean;
  loading?: boolean;
  [key: string]: unknown;
}

export default function List(props: Readonly<ListProps>) {
  const pathname = usePathname();
  const { isPending, push } = usePendingNavigation();
  const { drawerOpen, toggleDrawer } = props;
  const temporaryDrawer = props.temporaryDrawer;
  const filterQuery = props.query?.filter ?? null;
  const queryExpandedPublisher = props.query?.navPublisher ?? null;
  const queryExpandedSeries = props.query?.navSeries ?? null;
  const us = Boolean(props.us);
  const loading = Boolean(props.loading);
  const navStateKey = React.useMemo(() => `${us}|${filterQuery || ""}`, [us, filterQuery]);
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
  const [expandedPublishers, setExpandedPublishers] = React.useState<Record<string, boolean>>(
    {}
  );
  const [hasStoredPublisherExpansion, setHasStoredPublisherExpansion] = React.useState(false);
  const [pendingPublisherKey, setPendingPublisherKey] = React.useState<string | null>(null);
  const [pendingNavigationKey, setPendingNavigationKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    setHasStoredPublisherExpansion(hasNavExpansionState(navStateKey));
    setExpandedPublishers(readNavExpansionState(navStateKey));
  }, [navStateKey]);

  React.useEffect(() => {
    writeNavExpansionState(navStateKey, expandedPublishers);
  }, [expandedPublishers, navStateKey]);

  React.useEffect(() => {
    if (isPending) return;
    setPendingPublisherKey(null);
    setPendingNavigationKey(null);
  }, [isPending]);

  const publisherNodes = props.initialPublisherNodes || [];
  const visiblePublisherNodes = publisherNodes;

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

  const selectedPublisherName = getSelectedPublisherName(props.selected);
  const selectedSeriesKey = getSelectedSeriesKey(props.selected);
  const selectedIssue = props.selected?.issue;
  const currentPath = pathname || generateUrl(props.selected, us);

  React.useEffect(() => {
    if (selectedIssue?.number) return;
    suppressIssueAutoScrollRef.current = false;
  }, [selectedIssue?.number]);

  React.useEffect(() => {
    if (hasStoredPublisherExpansion) return;
    if (!selectedPublisherName) return;
    const resolvedPublisherName =
      visiblePublisherNodes.find((publisherNode) =>
        isSameEntityName(publisherNode.name, selectedPublisherName)
      )?.name || selectedPublisherName;

    setExpandedPublishers((prev) =>
      prev[resolvedPublisherName] ? prev : { ...prev, [resolvedPublisherName]: true }
    );
  }, [hasStoredPublisherExpansion, selectedPublisherName, visiblePublisherNodes]);

  React.useEffect(() => {
    if (!queryExpandedPublisher) return;

    setExpandedPublishers((prev) =>
      prev[queryExpandedPublisher] ? prev : { ...prev, [queryExpandedPublisher]: true }
    );
  }, [queryExpandedPublisher]);

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

  const updateNavRoute = React.useCallback(
    (
      nextQuery: { navPublisher?: string | null; navSeries?: string | null },
      pendingKey?: string | null
    ) => {
      storeScrollTop();
      setPendingPublisherKey(pendingKey ?? null);
      push(
        buildRouteHref(currentPath, props.query, {
          filter: filterQuery,
          navPublisher: nextQuery.navPublisher ?? null,
          navSeries: nextQuery.navSeries ?? null,
        })
      );
    },
    [storeScrollTop, push, currentPath, props.query, filterQuery]
  );

  const pushSelection = React.useCallback(
    (_event: unknown, item: SelectedRoot, closeOnPhone = false) => {
      storeScrollTop();
      if (closeOnPhone && phonePortrait) toggleDrawer?.();

      setPendingNavigationKey(buildPendingNavigationKey(item));
      push(
        buildRouteHref(generateUrl(item, us), props.query, {
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
      const hasServerData = Array.isArray(props.initialSeriesNodesByPublisher?.[publisherName]);

      if (!isExpanded && !hasServerData) {
        updateNavRoute({ navPublisher: publisherName, navSeries: null }, `publisher:${publisherName}`);
        return;
      }

      setExpandedPublishers((prev) => ({ ...prev, [publisherName]: !prev[publisherName] }));

      if (isExpanded && queryExpandedPublisher === publisherName) {
        updateNavRoute({ navPublisher: null, navSeries: null });
      }
    },
    [
      expandedPublishers,
      props.initialSeriesNodesByPublisher,
      queryExpandedPublisher,
      updateNavRoute,
    ]
  );

  const handlePublisherClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, publisherName: string) => {
      pushSelection(event, {
        publisher: {
          name: publisherName,
          us,
        },
      });
    },
    [pushSelection, us]
  );

  const content =
    loading ? (
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
                initialSeriesNodes={props.initialSeriesNodesByPublisher?.[publisherName] || []}
                initialIssueNodesBySeriesKey={props.initialIssueNodesBySeriesKey}
                navStateKey={navStateKey}
                activeSeriesKey={selected ? selectedSeriesKey : null}
                queryExpandedSeriesKey={queryExpandedSeries}
                selectedIssue={selectedIssue}
                session={props.session}
                pushSelection={pushSelection}
                updateNavRoute={updateNavRoute}
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
      navScrollContainerRef={navScrollContainerRef}
      listRef={listRef}
    >
      {content}
    </NavDrawer>
  );
}

function buildPendingNavigationKey(item: SelectedRoot) {
  if (item.issue) {
    return [
      item.issue.series.publisher.name,
      item.issue.series.title,
      item.issue.series.volume,
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
    ].join("|");
  }

  if (item.publisher) {
    return item.publisher.name || "";
  }

  return "";
}
