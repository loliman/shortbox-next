"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Collapse from "@mui/material/Collapse";
import { generateUrl } from "../../util/hierarchy";
import { buildRouteHref } from "../generic/routeHref";
import type { SelectedRoot } from "../../types/domain";
import {
  getSelectedPublisherName,
  getSelectedSeriesKey,
  isSameEntityName,
  type IssueNode,
  type PublisherNode,
  type SeriesNode,
} from "./listTreeUtils";
import NavDrawer from "./NavDrawer";
import SeriesBranch from "./SeriesBranch";
import { NestedEmptyRow, NestedRow } from "./NestedNavRow";
import {
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
  compactLayout?: boolean;
  isPhone?: boolean;
  isPhoneLandscape?: boolean;
  isPhonePortrait?: boolean;
  isTablet?: boolean;
  isTabletLandscape?: boolean;
  query?: { filter?: string | null; navPublisher?: string | null; navSeries?: string | null } | null;
  selected: SelectedRoot;
  session?: unknown;
  us?: boolean;
  [key: string]: unknown;
}

export default function List(props: Readonly<ListProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const { drawerOpen, toggleDrawer } = props;
  const temporaryDrawer =
    props.compactLayout ?? Boolean(props.isPhone || (props.isTablet && !props.isTabletLandscape));
  const filterQuery = props.query?.filter ?? null;
  const queryExpandedPublisher = props.query?.navPublisher ?? null;
  const queryExpandedSeries = props.query?.navSeries ?? null;
  const us = Boolean(props.us);
  const navStateKey = React.useMemo(() => `${us}|${filterQuery || ""}`, [us, filterQuery]);
  const phonePortrait = props.isPhonePortrait ?? Boolean(props.isPhone && !props.isPhoneLandscape);
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
    () => readNavExpansionState(navStateKey)
  );

  React.useEffect(() => {
    setExpandedPublishers(readNavExpansionState(navStateKey));
  }, [navStateKey]);

  React.useEffect(() => {
    writeNavExpansionState(navStateKey, expandedPublishers);
  }, [expandedPublishers, navStateKey]);

  const publisherNodes = props.initialPublisherNodes || [];
  const visiblePublisherNodes = publisherNodes;

  React.useLayoutEffect(() => {
    const container = navScrollContainerRef.current;
    const targetScrollTop = readNavScrollTop(navStateKey);
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
    if (!selectedPublisherName) return;
    const resolvedPublisherName =
      visiblePublisherNodes.find((publisherNode) =>
        isSameEntityName(publisherNode.name, selectedPublisherName)
      )?.name || selectedPublisherName;

    setExpandedPublishers((prev) =>
      prev[resolvedPublisherName] ? prev : { ...prev, [resolvedPublisherName]: true }
    );
  }, [selectedPublisherName, visiblePublisherNodes]);

  React.useEffect(() => {
    if (!queryExpandedPublisher) return;

    setExpandedPublishers((prev) =>
      prev[queryExpandedPublisher] ? prev : { ...prev, [queryExpandedPublisher]: true }
    );
  }, [queryExpandedPublisher]);

  const updateNavRoute = React.useCallback(
    (nextQuery: { navPublisher?: string | null; navSeries?: string | null }) => {
      storeScrollTop();
      router.push(
        buildRouteHref(currentPath, props.query, {
          filter: filterQuery,
          navPublisher: nextQuery.navPublisher ?? null,
          navSeries: nextQuery.navSeries ?? null,
        })
      );
    },
    [storeScrollTop, router, currentPath, props.query, filterQuery]
  );

  const pushSelection = React.useCallback(
    (_event: unknown, item: SelectedRoot, closeOnPhone = false) => {
      storeScrollTop();
      suppressIssueAutoScrollRef.current = true;
      if (closeOnPhone && phonePortrait) toggleDrawer?.();

      router.push(
        buildRouteHref(generateUrl(item, us), props.query, {
          expand: null,
          filter: filterQuery,
        })
      );
    },
    [storeScrollTop, phonePortrait, toggleDrawer, router, filterQuery, us, props.query]
  );

  const handleTogglePublisher = React.useCallback(
    (publisherName: string) => {
      const isExpanded = Boolean(expandedPublishers[publisherName]);
      const hasServerData = Array.isArray(props.initialSeriesNodesByPublisher?.[publisherName]);

      if (!isExpanded && !hasServerData) {
        updateNavRoute({ navPublisher: publisherName, navSeries: null });
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
    visiblePublisherNodes.length === 0 ? (
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
              selected={selected}
              label={publisherName}
              expanded={expanded}
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
