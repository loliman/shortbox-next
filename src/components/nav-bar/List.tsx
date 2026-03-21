import React from "react";
import { usePathname, useRouter } from "next/navigation";
import Drawer from "@mui/material/Drawer";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import MuiList from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { generateUrl } from "../../util/hierarchy";
import { buildRouteHref } from "../generic/routeHref";
import { TypeListEntryPlaceholder } from "./ListPlaceholders";
import type { HierarchyLevelType } from "../../util/hierarchy";
import type { Issue, SelectedRoot, Series } from "../../types/domain";
import {
  createIssueSecondary,
  createSeriesLabel,
  createSidebarIssueLabel,
  doesSeriesNodeMatchIssueSeries,
  getDepthPadding,
  getIssueNodeVariant,
  getSelectedPublisherName,
  getSelectedSeriesKey,
  getSeriesKey,
  getVariantCount,
  isElementVisibleInContainer,
  isIssueNumberMatch,
  isSameEntityName,
  isSelectedIssue,
  isSeriesNodeSelected,
  normalizeIssueNumber,
  PublisherNode,
  SeriesNode,
  IssueNode,
  toIssueSeriesSelected,
  toSeriesSelected,
} from "./listTreeUtils";
import {
  COMPACT_BOTTOM_BAR_CLEARANCE,
  drawerHeaderAdjustedHeight,
  drawerHeaderTopOffset,
  getNavDrawerWidth,
} from "../layoutMetrics";
import CoverTooltip from "./CoverTooltip";

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
  level: HierarchyLevelType;
  selected: SelectedRoot;
  appIsLoading?: boolean;
  navResetVersion?: number;
  session?: unknown;
  us?: boolean;
  [key: string]: unknown;
}

let lastPublisherNodesCache: PublisherNode[] = [];
let expandedPublishersCache: Record<string, Record<string, boolean>> = {};
let expandedSeriesCache: Record<string, Record<string, boolean>> = {};
let navScrollTopCache: Record<string, number> = {};

export default function List(props: Readonly<ListProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const { drawerOpen, toggleDrawer } = props;
  const temporaryDrawer =
    props.compactLayout ?? Boolean(props.isPhone || (props.isTablet && !props.isTabletLandscape));
  const drawerWidth = getNavDrawerWidth(temporaryDrawer);
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
      navScrollTopCache[navStateKey] = container.scrollTop;
      return;
    }

    const listElement = listRef.current;
    if (listElement) {
      navScrollTopCache[navStateKey] = listElement.scrollTop;
    }
  }, [navStateKey]);
  const [expandedPublishers, setExpandedPublishers] = React.useState<Record<string, boolean>>(
    () => expandedPublishersCache[navStateKey] || {}
  );

  React.useEffect(() => {
    setExpandedPublishers(expandedPublishersCache[navStateKey] || {});
  }, [navStateKey]);

  React.useEffect(() => {
    expandedPublishersCache[navStateKey] = expandedPublishers;
  }, [expandedPublishers, navStateKey]);

  React.useEffect(() => {
    if (!props.navResetVersion) return;

    expandedPublishersCache = {};
    expandedSeriesCache = {};
    navScrollTopCache = {};
    lastPublisherNodesCache = [];
    setExpandedPublishers({});

    const container = navScrollContainerRef.current;
    if (container) container.scrollTop = 0;

    const listElement = listRef.current;
    if (listElement) listElement.scrollTop = 0;
  }, [props.navResetVersion]);

  const publisherNodes = props.initialPublisherNodes || [];
  if (publisherNodes.length > 0) {
    lastPublisherNodesCache = publisherNodes;
  }
  const visiblePublisherNodes =
    publisherNodes.length > 0 ? publisherNodes : lastPublisherNodesCache;

  React.useLayoutEffect(() => {
    const container = navScrollContainerRef.current;
    const targetScrollTop = navScrollTopCache[navStateKey] || 0;
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
  const isInitialLoading = Boolean(props.appIsLoading) && visiblePublisherNodes.length === 0;

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

  let content: React.ReactNode;

  if (isInitialLoading) {
    content = Array.from({ length: 25 }).map((_, idx) => <TypeListEntryPlaceholder key={idx} />);
  } else if (visiblePublisherNodes.length === 0) {
    content = <NestedEmptyRow depth={0} message="Keine Einträge vorhanden" />;
  } else {
    content = visiblePublisherNodes.map((publisherNode) => {
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
              filter={filterQuery}
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
              listRef={listRef}
              navScrollContainerRef={navScrollContainerRef}
              suppressAutoScrollRef={suppressIssueAutoScrollRef}
            />
          </Collapse>
        </Box>
      );
    });
  }

  const paperSx = {
    width: drawerWidth,
    maxWidth: "100%",
    top: drawerHeaderTopOffset,
    height: drawerHeaderAdjustedHeight,
    backgroundColor: "background.paper",
  };

  const handleNavScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      navScrollTopCache[navStateKey] = event.currentTarget.scrollTop;
    },
    [navStateKey]
  );

  const drawerContent = (
    <MuiList
      ref={listRef}
      className="data-fade"
      sx={{
        width: "100%",
        p: 0,
        pb: temporaryDrawer ? COMPACT_BOTTOM_BAR_CLEARANCE : 0,
      }}
    >
      {content}
    </MuiList>
  );

  if (temporaryDrawer) {
    return (
      <SwipeableDrawer
        disableDiscovery={true}
        variant="temporary"
        open={Boolean(drawerOpen)}
        onClose={() => toggleDrawer?.()}
        onOpen={() => toggleDrawer?.()}
        PaperProps={{
          sx: paperSx,
          ref: navScrollContainerRef,
          onScroll: handleNavScroll,
        }}
      >
        {drawerContent}
      </SwipeableDrawer>
    );
  }

  return (
    <Drawer
      variant="persistent"
      open={Boolean(drawerOpen)}
      PaperProps={{
        sx: paperSx,
        ref: navScrollContainerRef,
        onScroll: handleNavScroll,
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

type SeriesBranchProps = {
  us: boolean;
  filter?: string | null;
  publisher: PublisherNode;
  initialSeriesNodes?: SeriesNode[];
  initialIssueNodesBySeriesKey?: Record<string, IssueNode[]>;
  navStateKey: string;
  activeSeriesKey: string | null;
  queryExpandedSeriesKey?: string | null;
  selectedIssue?: Issue;
  session?: unknown;
  pushSelection: (event: unknown, item: SelectedRoot, closeOnPhone?: boolean) => void;
  updateNavRoute: (nextQuery: { navPublisher?: string | null; navSeries?: string | null }) => void;
  listRef: React.RefObject<HTMLUListElement | null>;
  navScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  suppressAutoScrollRef: React.MutableRefObject<boolean>;
};

const SeriesBranch = React.memo(function SeriesBranch(props: Readonly<SeriesBranchProps>) {
  const { publisher, us, filter } = props;
  const publisherName = publisher.name || "";
  const seriesStateKey = `${props.navStateKey}|${publisherName}`;
  const initialIssueNodesBySeriesKey = props.initialIssueNodesBySeriesKey;
  const activeSeriesKey = props.activeSeriesKey;
  const queryExpandedSeriesKey = props.queryExpandedSeriesKey;
  const selectedIssue = props.selectedIssue;
  const updateNavRoute = props.updateNavRoute;
  const [expandedSeries, setExpandedSeries] = React.useState<Record<string, boolean>>(
    () => expandedSeriesCache[seriesStateKey] || {}
  );
  void filter;
  void publisher.us;

  React.useEffect(() => {
    setExpandedSeries(expandedSeriesCache[seriesStateKey] || {});
  }, [seriesStateKey]);

  React.useEffect(() => {
    expandedSeriesCache[seriesStateKey] = expandedSeries;
  }, [expandedSeries, seriesStateKey]);

  const seriesNodes = React.useMemo(() => props.initialSeriesNodes || [], [props.initialSeriesNodes]);
  const seriesSelectionByKey = React.useMemo(() => {
    const selection: Record<string, Series> = {};
    for (const seriesNode of seriesNodes) {
      selection[getSeriesKey(seriesNode)] = toSeriesSelected(seriesNode, us);
    }
    return selection;
  }, [seriesNodes, us]);

  React.useEffect(() => {
    if (!activeSeriesKey) return;

    setExpandedSeries((prev) =>
      prev[activeSeriesKey] ? prev : { ...prev, [activeSeriesKey]: true }
    );
  }, [activeSeriesKey]);

  React.useEffect(() => {
    if (!selectedIssue?.series) return;
    const matchingSeriesNode = seriesNodes.find((seriesNode) =>
      doesSeriesNodeMatchIssueSeries(seriesNode, selectedIssue?.series)
    );
    if (!matchingSeriesNode) return;

    const matchingSeriesKey = getSeriesKey(matchingSeriesNode);
    setExpandedSeries((prev) =>
      prev[matchingSeriesKey] ? prev : { ...prev, [matchingSeriesKey]: true }
    );
  }, [selectedIssue, seriesNodes]);

  React.useEffect(() => {
    if (!queryExpandedSeriesKey) return;

    setExpandedSeries((prev) =>
      prev[queryExpandedSeriesKey] ? prev : { ...prev, [queryExpandedSeriesKey]: true }
    );
  }, [queryExpandedSeriesKey]);

  const handleToggleSeries = React.useCallback(
    (seriesKey: string) => {
      const isExpanded = Boolean(expandedSeries[seriesKey]);
      const hasServerData = Array.isArray(initialIssueNodesBySeriesKey?.[seriesKey]);

      if (!isExpanded && !hasServerData) {
        updateNavRoute({ navPublisher: publisherName, navSeries: seriesKey });
        return;
      }

      setExpandedSeries((prev) => ({ ...prev, [seriesKey]: !prev[seriesKey] }));

      if (isExpanded && queryExpandedSeriesKey === seriesKey) {
        updateNavRoute({ navPublisher: publisherName, navSeries: null });
      }
    },
    [
      expandedSeries,
      initialIssueNodesBySeriesKey,
      queryExpandedSeriesKey,
      updateNavRoute,
      publisherName,
    ]
  );
  const pushSelection = props.pushSelection;
  const handleSeriesClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, seriesKey: string) => {
      const selectedSeries = seriesSelectionByKey[seriesKey];
      if (!selectedSeries) return;
      pushSelection(
        event,
        {
          series: selectedSeries,
        },
        true
      );
    },
    [pushSelection, seriesSelectionByKey]
  );

  if (seriesNodes.length === 0) return <NestedEmptyRow depth={1} message="Keine Serien vorhanden" />;

  return (
    <MuiList disablePadding>
      {seriesNodes.map((seriesNode) => {
        const seriesKey = getSeriesKey(seriesNode);
        const selected = isSeriesNodeSelected(
          seriesNode,
          props.activeSeriesKey,
          props.selectedIssue
        );
        const expanded = Boolean(expandedSeries[seriesKey]);

        return (
          <Box key={seriesKey}>
            <NestedRow
              rowKey={seriesKey}
              depth={1}
              label={createSeriesLabel(seriesNode)}
              selected={selected}
              expanded={expanded}
              onToggle={handleToggleSeries}
              onClick={handleSeriesClick}
            />

            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <IssuesBranch
                us={us}
                series={seriesNode}
                initialIssueNodes={initialIssueNodesBySeriesKey?.[seriesKey] || []}
                selectedIssue={selectedIssue}
                session={props.session}
                pushSelection={pushSelection}
                listRef={props.listRef}
                navScrollContainerRef={props.navScrollContainerRef}
                suppressAutoScrollRef={props.suppressAutoScrollRef}
              />
            </Collapse>
          </Box>
        );
      })}
    </MuiList>
  );
});

type IssuesBranchProps = {
  us: boolean;
  series: SeriesNode;
  initialIssueNodes?: IssueNode[];
  selectedIssue?: Issue;
  session?: unknown;
  pushSelection: (event: unknown, item: SelectedRoot, closeOnPhone?: boolean) => void;
  listRef: React.RefObject<HTMLUListElement | null>;
  navScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  suppressAutoScrollRef: React.MutableRefObject<boolean>;
};

const IssuesBranch = React.memo(function IssuesBranch(props: Readonly<IssuesBranchProps>) {
  const { series, us } = props;
  const selectedSeries = doesSeriesNodeMatchIssueSeries(series, props.selectedIssue?.series);
  const selectedIssueNumber = selectedSeries
    ? normalizeIssueNumber(props.selectedIssue?.number)
    : "";
  const previousIssueNumberRef = React.useRef("");
  const skipSameIssueAutoScrollRef = React.useRef(false);
  const issueListRef = React.useRef<HTMLUListElement | null>(null);

  const issueNodes = React.useMemo(() => props.initialIssueNodes || [], [props.initialIssueNodes]);

  React.useEffect(() => {
    skipSameIssueAutoScrollRef.current = Boolean(
      previousIssueNumberRef.current &&
      selectedIssueNumber &&
      previousIssueNumberRef.current === selectedIssueNumber
    );
    previousIssueNumberRef.current = selectedIssueNumber;
  }, [selectedIssueNumber]);

  const scrollSelectedIssueIntoView = React.useCallback(() => {
    if (!selectedIssueNumber) return;

    const listElement = issueListRef.current;
    const scrollContainer = props.navScrollContainerRef.current;
    if (!listElement || !scrollContainer) return;

    const selectedItem = Array.from(
      listElement.querySelectorAll<HTMLElement>("[data-nav-issue-number]")
    ).find((element) => isIssueNumberMatch(element.dataset.navIssueNumber, selectedIssueNumber));
    if (!selectedItem) return;
    if (isElementVisibleInContainer(selectedItem, scrollContainer)) return;

    selectedItem.scrollIntoView({
      block: "center",
      inline: "nearest",
    });
  }, [selectedIssueNumber, props.navScrollContainerRef]);

  React.useEffect(() => {
    if (!selectedIssueNumber) return;

    if (props.suppressAutoScrollRef.current) {
      props.suppressAutoScrollRef.current = false;
      return;
    }

    if (skipSameIssueAutoScrollRef.current) {
      skipSameIssueAutoScrollRef.current = false;
      return;
    }

    scrollSelectedIssueIntoView();

    if (typeof ResizeObserver === "undefined") return;
    const listElement = issueListRef.current;
    if (!listElement) return;

    const observer = new ResizeObserver(() => {
      scrollSelectedIssueIntoView();
    });
    observer.observe(listElement);

    return () => {
      observer.disconnect();
    };
  }, [
    issueNodes,
    selectedIssueNumber,
    props.suppressAutoScrollRef,
    scrollSelectedIssueIntoView,
  ]);

  if (issueNodes.length === 0) return <NestedEmptyRow depth={2} message="Keine Ausgaben vorhanden" />;

  return (
    <MuiList disablePadding ref={issueListRef}>
      {issueNodes.map((issueNode, idx) => {
        const selected = isSelectedIssue(issueNode, props.selectedIssue, series);
        const issueNumber = issueNode.number || "";
        const issueSeries = toIssueSeriesSelected(issueNode, series, us);
        const variantCount = getVariantCount(issueNode);
        const hasVariants = variantCount > 0;

        return (
          <Box
            key={[
              issueSeries.publisher.name,
              issueSeries.title,
              issueSeries.volume,
              issueNumber,
              issueNode.format || "",
              idx,
            ].join("|")}
          >
            <ListItemButton
              className="row"
              divider={false}
              selected={selected}
              data-nav-issue-number={issueNumber}
              sx={{
                pl: getDepthPadding(2) + 1.3,
                py: 0.3,
                "&.Mui-selected": { backgroundColor: "transparent" },
                "&.Mui-selected:hover": { backgroundColor: "action.hover" },
              }}
              onClick={(e) =>
                props.pushSelection(
                  e,
                  {
                    issue: {
                      number: issueNumber,
                      title: issueNode.title,
                      format: issueNode.format,
                      legacy_number: (issueNode as { legacy_number?: string | null }).legacy_number,
                      variant: getIssueNodeVariant(issueNode),
                      series: issueSeries,
                    },
                  },
                  true
                )
              }
            >
              <CoverTooltip issue={issueNode} us={us}>
                <Box sx={{ width: "100%", minWidth: 0 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <Typography
                          component="span"
                          noWrap
                          sx={{
                            minWidth: 0,
                            flex: 1,
                            fontSize: "0.9rem",
                            fontWeight: selected ? 700 : 400,
                          }}
                        >
                          <Box
                            component="span"
                            sx={{
                              display: "block",
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {createSidebarIssueLabel(issueNode, us)}
                          </Box>
                        </Typography>
                        {hasVariants ? (
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.disabled"
                            sx={{ flexShrink: 0, fontSize: "0.68rem" }}
                          >
                            {variantCount} {variantCount === 1 ? "Variante" : "Varianten"}
                          </Typography>
                        ) : null}
                      </Box>
                    }
                    secondary={createIssueSecondary(issueNode, Boolean(props.session))}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </Box>
              </CoverTooltip>
            </ListItemButton>
          </Box>
        );
      })}
    </MuiList>
  );
});

type NestedRowProps = {
  rowKey: string;
  depth: number;
  label: string;
  selected?: boolean;
  expanded: boolean;
  onToggle: (rowKey: string) => void;
  onClick: (event: React.MouseEvent<HTMLElement>, rowKey: string) => void;
};

const NestedRow = React.memo(function NestedRow(props: Readonly<NestedRowProps>) {
  const { onClick, onToggle, rowKey } = props;
  const handleToggle = () => {
    onToggle(rowKey);
  };
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    onClick(event, rowKey);
  };

  return (
    <ListItemButton
      className="row"
      divider={false}
      selected={props.selected ?? false}
      onClick={handleClick}
      sx={{
        pl: getDepthPadding(props.depth),
        "&.Mui-selected": { backgroundColor: "transparent" },
        "&.Mui-selected:hover": { backgroundColor: "action.hover" },
      }}
    >
      <ExpandToggle expanded={props.expanded} onToggle={handleToggle} />
      <ListItemText
        primary={props.label}
        primaryTypographyProps={{ noWrap: true, sx: { fontWeight: props.selected ? 700 : 400 } }}
      />
    </ListItemButton>
  );
});

type ExpandToggleProps = {
  expanded: boolean;
  onToggle: () => void;
};

const ExpandToggle = React.memo(function ExpandToggle(props: Readonly<ExpandToggleProps>) {
  const Icon = props.expanded ? ExpandMoreIcon : ChevronRightIcon;

  return (
    <ListItemIcon sx={{ minWidth: 32 }}>
      <IconButton
        size="small"
        aria-label={props.expanded ? "Einklappen" : "Ausklappen"}
        onClick={(e) => {
          e.stopPropagation();
          props.onToggle();
        }}
      >
        <Icon fontSize="small" />
      </IconButton>
    </ListItemIcon>
  );
});

function NestedEmptyRow({
  depth,
  message = "Keine Einträge vorhanden",
}: {
  depth: number;
  message?: string;
}) {
  return (
    <ListItem sx={{ pl: getDepthPadding(depth) }}>
      <ListItemText primary={message} />
    </ListItem>
  );
}
