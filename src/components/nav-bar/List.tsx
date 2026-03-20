import React from "react";
import { useRouter } from "next/navigation";
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
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { generateUrl } from "../../util/hierarchy";
import { AppContext } from "../generic/AppContext";
import { buildRouteHref } from "../generic/routeHref";
import { NoEntries, TypeListEntryPlaceholder } from "./ListPlaceholders";
import type { HierarchyLevelType } from "../../util/hierarchy";
import type { Issue, SelectedRoot, Series } from "../../types/domain";
import {
  COMPACT_BOTTOM_BAR_CLEARANCE,
  drawerHeaderAdjustedHeight,
  drawerHeaderTopOffset,
  getNavDrawerWidth,
} from "../layoutMetrics";
import { getLegacyNumberLabel, getSeriesLabel } from "../../util/issuePresentation";
import CoverTooltip from "./CoverTooltip";

interface ListProps {
  drawerOpen?: boolean;
  toggleDrawer?: () => void;
  compactLayout?: boolean;
  isPhone?: boolean;
  isPhoneLandscape?: boolean;
  isPhonePortrait?: boolean;
  isTablet?: boolean;
  isTabletLandscape?: boolean;
  query?: { filter?: string | null } | null;
  level: HierarchyLevelType;
  selected: SelectedRoot;
  appIsLoading?: boolean;
  navResetVersion?: number;
  session?: unknown;
  us?: boolean;
  [key: string]: unknown;
}

type PublisherNode = {
  id?: string | null;
  name?: string | null;
  us?: boolean | null;
};

type SeriesNode = {
  id?: string | null;
  title?: string | null;
  volume?: number | null;
  startyear?: number | null;
  endyear?: number | null;
  publisher?: PublisherNode | null;
};

type IssueNode = {
  id?: string | null;
  number?: string | null;
  legacy_number?: string | null;
  title?: string | null;
  format?: string | null;
  variant?: string | null;
  collected?: boolean | null;
  cover?: { url?: string | null } | null;
  variants?: Array<{ collected?: boolean | null; format?: string | null; variant?: string | null } | null> | null;
  series?: {
    title?: string | null;
    volume?: number | null;
    publisher?: PublisherNode | null;
  } | null;
};

let lastPublisherNodesCache: PublisherNode[] = [];
let expandedPublishersCache: Record<string, Record<string, boolean>> = {};
let expandedSeriesCache: Record<string, Record<string, boolean>> = {};
let navScrollTopCache: Record<string, number> = {};

export default function List(ownProps: Readonly<Partial<ListProps>>) {
  const router = useRouter();
  const appContext = React.useContext(AppContext);
  const props = React.useMemo(
    () => ({ ...appContext, ...ownProps }) as ListProps,
    [appContext, ownProps]
  );
  const { drawerOpen, toggleDrawer } = props;
  const temporaryDrawer =
    props.compactLayout ?? Boolean(props.isPhone || (props.isTablet && !props.isTabletLandscape));
  const drawerWidth = getNavDrawerWidth(temporaryDrawer);
  const filterQuery = props.query?.filter ?? null;
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

  const [publisherNodes, setPublisherNodes] = React.useState<PublisherNode[]>([]);
  const [publisherError, setPublisherError] = React.useState<unknown>(null);
  const [publisherLoading, setPublisherLoading] = React.useState(true);
  if (publisherNodes.length > 0) {
    lastPublisherNodesCache = publisherNodes;
  }
  const visiblePublisherNodes =
    publisherNodes.length > 0 ? publisherNodes : lastPublisherNodesCache;

  React.useEffect(() => {
    let cancelled = false;
    setPublisherLoading(true);
    setPublisherError(null);

    const params = new URLSearchParams({
      locale: us ? "us" : "de",
    });
    if (filterQuery) params.set("filter", filterQuery);

    void fetch(`/api/public-nav/publishers?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Publisher request failed: ${response.status}`);
        return (await response.json()) as { items?: PublisherNode[] };
      })
      .then((payload) => {
        if (cancelled) return;
        setPublisherNodes((payload.items || []).filter((node) => Boolean(node?.name)));
      })
      .catch((nextError) => {
        if (cancelled) return;
        setPublisherNodes([]);
        setPublisherError(nextError);
      })
      .finally(() => {
        if (cancelled) return;
        setPublisherLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [us, filterQuery]);

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
  // Keep nav loading isolated from content-area loading to avoid full-nav skeleton flashes
  // when switching detail routes from the list.
  const isInitialLoading = publisherLoading && visiblePublisherNodes.length === 0;

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
  const handleTogglePublisher = React.useCallback((publisherName: string) => {
    setExpandedPublishers((prev) => ({ ...prev, [publisherName]: !prev[publisherName] }));
  }, []);
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
  } else if (publisherError) {
    content = <NestedErrorRow depth={0} message="Fehler beim Laden der Navigation" />;
  } else if (visiblePublisherNodes.length === 0) {
    content = <NoEntries />;
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
              navStateKey={navStateKey}
              activeSeriesKey={selected ? selectedSeriesKey : null}
              selectedIssue={selectedIssue}
              session={props.session}
              pushSelection={pushSelection}
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
    backgroundColor: (theme: { palette: { mode: string } }) => "background.paper",
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
  navStateKey: string;
  activeSeriesKey: string | null;
  selectedIssue?: Issue;
  session?: unknown;
  pushSelection: (event: unknown, item: SelectedRoot, closeOnPhone?: boolean) => void;
  listRef: React.RefObject<HTMLUListElement | null>;
  navScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  suppressAutoScrollRef: React.MutableRefObject<boolean>;
};

const SeriesBranch = React.memo(function SeriesBranch(props: Readonly<SeriesBranchProps>) {
  const { publisher, us, filter } = props;
  const publisherName = publisher.name || "";
  const seriesStateKey = `${props.navStateKey}|${publisherName}`;
  const [expandedSeries, setExpandedSeries] = React.useState<Record<string, boolean>>(
    () => expandedSeriesCache[seriesStateKey] || {}
  );
  const publisherUs = publisher.us ?? us;

  React.useEffect(() => {
    setExpandedSeries(expandedSeriesCache[seriesStateKey] || {});
  }, [seriesStateKey]);

  React.useEffect(() => {
    expandedSeriesCache[seriesStateKey] = expandedSeries;
  }, [expandedSeries, seriesStateKey]);

  const [seriesNodes, setSeriesNodes] = React.useState<SeriesNode[]>([]);
  const [seriesError, setSeriesError] = React.useState<unknown>(null);
  const [seriesLoading, setSeriesLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setSeriesLoading(true);
    setSeriesError(null);

    const params = new URLSearchParams({
      locale: publisherUs ? "us" : "de",
      publisher: publisherName,
    });
    if (filter) params.set("filter", filter);

    void fetch(`/api/public-nav/series?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Series request failed: ${response.status}`);
        return (await response.json()) as { items?: SeriesNode[] };
      })
      .then((payload) => {
        if (cancelled) return;
        setSeriesNodes((payload.items || []).filter((node) => Boolean(node?.title && node?.publisher?.name)));
      })
      .catch((nextError) => {
        if (cancelled) return;
        setSeriesNodes([]);
        setSeriesError(nextError);
      })
      .finally(() => {
        if (cancelled) return;
        setSeriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [publisherName, publisherUs, filter]);
  const seriesSelectionByKey = React.useMemo(() => {
    const selection: Record<string, Series> = {};
    for (const seriesNode of seriesNodes) {
      selection[getSeriesKey(seriesNode)] = toSeriesSelected(seriesNode, us);
    }
    return selection;
  }, [seriesNodes, us]);

  React.useEffect(() => {
    if (!props.activeSeriesKey) return;
    const activeSeriesKey = props.activeSeriesKey;

    setExpandedSeries((prev) =>
      prev[activeSeriesKey] ? prev : { ...prev, [activeSeriesKey]: true }
    );
  }, [props.activeSeriesKey]);

  React.useEffect(() => {
    if (!props.selectedIssue?.series) return;
    const matchingSeriesNode = seriesNodes.find((seriesNode) =>
      doesSeriesNodeMatchIssueSeries(seriesNode, props.selectedIssue?.series)
    );
    if (!matchingSeriesNode) return;

    const matchingSeriesKey = getSeriesKey(matchingSeriesNode);
    setExpandedSeries((prev) =>
      prev[matchingSeriesKey] ? prev : { ...prev, [matchingSeriesKey]: true }
    );
  }, [props.selectedIssue, seriesNodes]);

  const handleToggleSeries = React.useCallback((seriesKey: string) => {
    setExpandedSeries((prev) => ({ ...prev, [seriesKey]: !prev[seriesKey] }));
  }, []);
  const handleSeriesClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, seriesKey: string) => {
      const selectedSeries = seriesSelectionByKey[seriesKey];
      if (!selectedSeries) return;
      props.pushSelection(
        event,
        {
          series: selectedSeries,
        },
        true
      );
    },
    [props.pushSelection, seriesSelectionByKey]
  );

  if (seriesLoading && seriesNodes.length === 0) return <NestedLoadingRow depth={1} />;
  if (seriesError) return <NestedErrorRow depth={1} />;
  if (seriesNodes.length === 0) return <NestedEmptyRow depth={1} />;

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
                filter={filter}
                series={seriesNode}
                selectedIssue={props.selectedIssue}
                session={props.session}
                pushSelection={props.pushSelection}
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
  filter?: string | null;
  series: SeriesNode;
  selectedIssue?: Issue;
  session?: unknown;
  pushSelection: (event: unknown, item: SelectedRoot, closeOnPhone?: boolean) => void;
  listRef: React.RefObject<HTMLUListElement | null>;
  navScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  suppressAutoScrollRef: React.MutableRefObject<boolean>;
};

const IssuesBranch = React.memo(function IssuesBranch(props: Readonly<IssuesBranchProps>) {
  const { series, us, filter } = props;
  const seriesInput = toSeriesInput(series, us);
  const selectedSeries = doesSeriesNodeMatchIssueSeries(series, props.selectedIssue?.series);
  const selectedIssueNumber = selectedSeries
    ? normalizeIssueNumber(props.selectedIssue?.number)
    : "";
  const previousIssueNumberRef = React.useRef("");
  const skipSameIssueAutoScrollRef = React.useRef(false);
  const issueListRef = React.useRef<HTMLUListElement | null>(null);

  const [issueNodes, setIssueNodes] = React.useState<IssueNode[]>([]);
  const [issuesError, setIssuesError] = React.useState<unknown>(null);
  const [issuesLoading, setIssuesLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setIssuesLoading(true);
    setIssuesError(null);

    const params = new URLSearchParams({
      locale: us ? "us" : "de",
      publisher: seriesInput.publisher.name || "",
      series: seriesInput.title || "",
      volume: String(seriesInput.volume || 1),
    });
    if (filter) params.set("filter", filter);

    void fetch(`/api/public-nav/issues?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Issue request failed: ${response.status}`);
        return (await response.json()) as { items?: IssueNode[] };
      })
      .then((payload) => {
        if (cancelled) return;
        setIssueNodes((payload.items || []).filter((node) => Boolean(node?.number && node?.series?.title)));
      })
      .catch((nextError) => {
        if (cancelled) return;
        setIssueNodes([]);
        setIssuesError(nextError);
      })
      .finally(() => {
        if (cancelled) return;
        setIssuesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [us, filter, seriesInput.publisher.name, seriesInput.title, seriesInput.volume]);

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

  if (issuesLoading && issueNodes.length === 0) return <NestedLoadingRow depth={2} />;
  if (issuesError) return <NestedErrorRow depth={2} />;
  if (issueNodes.length === 0) return <NestedEmptyRow depth={2} />;

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
  const handleToggle = React.useCallback(() => {
    props.onToggle(props.rowKey);
  }, [props.onToggle, props.rowKey]);
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      props.onClick(event, props.rowKey);
    },
    [props.onClick, props.rowKey]
  );

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

function NestedLoadingRow({ depth }: { depth: number }) {
  return (
    <ListItem sx={{ pl: getDepthPadding(depth) }}>
      <ListItemIcon sx={{ minWidth: 32 }}>
        <CircularProgress size={16} />
      </ListItemIcon>
      <ListItemText primary="Lade..." />
    </ListItem>
  );
}

function NestedErrorRow({
  depth,
  message = "Fehler beim Laden",
}: {
  depth: number;
  message?: string;
}) {
  return (
    <ListItem sx={{ pl: getDepthPadding(depth) }}>
      <ListItemIcon sx={{ minWidth: 32 }}>
        <ErrorOutlineIcon fontSize="small" color="error" />
      </ListItemIcon>
      <ListItemText primary={message} />
    </ListItem>
  );
}

function NestedEmptyRow({ depth }: { depth: number }) {
  return (
    <ListItem sx={{ pl: getDepthPadding(depth) }}>
      <ListItemText primary="Keine Eintraege" />
    </ListItem>
  );
}

function getDepthPadding(depth: number) {
  return 2 + depth * 2;
}

function createIssueSecondary(issueNode: IssueNode, showCollected: boolean): string | undefined {
  const parts: string[] = [];

  if (
    showCollected &&
    (issueNode.collected || issueNode.variants?.some((entry) => entry?.collected))
  ) {
    parts.push("Gesammelt");
  }

  return parts.length > 0 ? parts.join(" • ") : undefined;
}

function getVariantCount(issueNode: IssueNode): number {
  const total = issueNode.variants?.length || 0;
  return total > 1 ? total - 1 : 0;
}

function createSeriesLabel(seriesNode: SeriesNode): string {
  return getSeriesLabel(seriesNode, { fallbackYear: "?" });
}

function createIssueSeriesLabel(issueNode: IssueNode, us: boolean): string {
  const seriesTitle = issueNode.series?.title || "";
  const variant = getIssueNodeVariant(issueNode);
  const variantLabel = variant ? ` [${variant}]` : "";
  if (us) return seriesTitle;
  if (issueNode.title && issueNode.title !== "") return `${issueNode.title}${variantLabel}`;
  return `${seriesTitle}${variantLabel}`;
}

function createSidebarIssueLabel(issueNode: IssueNode, us: boolean): string {
  const number = issueNode.number ? `#${issueNode.number}` : "";
  const legacyLabel = getLegacyNumberLabel(issueNode);
  const seriesLabel = createIssueSeriesLabel(issueNode, us);

  return [number, legacyLabel, seriesLabel].filter(Boolean).join(" ");
}

function getSelectedPublisherName(selected: SelectedRoot): string {
  return (
    selected?.publisher?.name ||
    selected?.series?.publisher?.name ||
    selected?.issue?.series?.publisher?.name ||
    ""
  );
}

function getSeriesKey(seriesNode: SeriesNode): string {
  return [
    seriesNode.publisher?.name || "",
    seriesNode.title || "",
    normalizeSeriesVolume(seriesNode.volume),
  ].join("|");
}

function getSelectedSeriesKey(selected: SelectedRoot): string | null {
  const seriesNode = selected?.series || selected?.issue?.series;
  if (!seriesNode?.title) return null;
  return [
    seriesNode.publisher?.name || "",
    seriesNode.title,
    normalizeSeriesVolume(seriesNode.volume),
  ].join("|");
}

function toSeriesSelected(seriesNode: SeriesNode, us: boolean): Series {
  return {
    title: seriesNode.title || "",
    volume: seriesNode.volume ?? 1,
    publisher: {
      name: seriesNode.publisher?.name || "",
      us: seriesNode.publisher?.us ?? us,
    },
  };
}

function toSeriesInput(seriesNode: SeriesNode, us: boolean) {
  return {
    title: seriesNode.title || "",
    volume: seriesNode.volume ?? 1,
    publisher: {
      name: seriesNode.publisher?.name || "",
      us: seriesNode.publisher?.us ?? us,
    },
  };
}

function toIssueSeriesSelected(
  issueNode: IssueNode,
  fallbackSeries: SeriesNode,
  us: boolean
): Series {
  return {
    title: issueNode.series?.title || fallbackSeries.title || "",
    volume: issueNode.series?.volume ?? fallbackSeries.volume ?? 1,
    publisher: {
      name: issueNode.series?.publisher?.name || fallbackSeries.publisher?.name || "",
      us: issueNode.series?.publisher?.us ?? fallbackSeries.publisher?.us ?? us,
    },
  };
}

function isSelectedIssue(
  issueNode: IssueNode,
  selectedIssue: Issue | undefined,
  seriesNode: SeriesNode
): boolean {
  const selectedNumber = normalizeIssueNumber(selectedIssue?.number);
  if (selectedNumber === "") return false;
  if (!isIssueNumberMatch(issueNode.number, selectedNumber)) return false;
  return doesSeriesNodeMatchIssueSeries(seriesNode, selectedIssue?.series);
}

function normalizeIssuePart(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeIssueNumber(value: unknown): string {
  return normalizeIssuePart(value).replace(/\s+/g, "").toUpperCase();
}

function getIssueNumberPrefix(number: string): string {
  const match = number.match(/^\d+/);
  return match ? match[0] : "";
}

function isIssueNumberMatch(nodeNumberRaw: unknown, selectedNumberRaw: unknown): boolean {
  const nodeNumber = normalizeIssueNumber(nodeNumberRaw);
  const selectedNumber = normalizeIssueNumber(selectedNumberRaw);
  if (!nodeNumber || !selectedNumber) return false;
  if (nodeNumber === selectedNumber) return true;

  const nodePrefix = getIssueNumberPrefix(nodeNumber);
  const selectedPrefix = getIssueNumberPrefix(selectedNumber);
  if (nodePrefix && selectedPrefix && nodePrefix === selectedPrefix) return true;

  return false;
}

function normalizeSeriesVolume(value: unknown): string {
  if (value === null || value === undefined) return "";
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? String(numericValue) : "";
}

function doesSeriesNodeMatchIssueSeries(
  seriesNode: { title?: unknown; volume?: unknown; publisher?: { name?: unknown } | null },
  selectedSeries?: Issue["series"]
): boolean {
  if (!selectedSeries) return false;

  const nodePublisher = normalizeMatchText(seriesNode.publisher?.name);
  const selectedPublisher = normalizeMatchText(selectedSeries.publisher?.name);
  if (!nodePublisher || !selectedPublisher || nodePublisher !== selectedPublisher) return false;

  const nodeTitle = normalizeMatchText(seriesNode.title);
  const selectedTitle = normalizeMatchText(selectedSeries.title);
  if (!nodeTitle || !selectedTitle || nodeTitle !== selectedTitle) return false;

  const nodeVolume = normalizeSeriesVolume(seriesNode.volume);
  const selectedVolume = normalizeSeriesVolume(selectedSeries.volume);
  if (nodeVolume && selectedVolume && nodeVolume !== selectedVolume) return false;

  return true;
}

function normalizeMatchText(value: unknown): string {
  return normalizeIssuePart(value).replace(/\s+/g, " ").toLowerCase();
}

function isSameEntityName(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizeMatchText(left);
  const normalizedRight = normalizeMatchText(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft === normalizedRight;
}

function isSeriesNodeSelected(
  seriesNode: SeriesNode,
  activeSeriesKey: string | null,
  selectedIssue?: Issue
): boolean {
  const seriesKey = getSeriesKey(seriesNode);
  if (activeSeriesKey && activeSeriesKey === seriesKey) return true;
  return doesSeriesNodeMatchIssueSeries(seriesNode, selectedIssue?.series);
}

function isElementVisibleInContainer(element: HTMLElement, container: HTMLElement): boolean {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return elementRect.bottom > containerRect.top && elementRect.top < containerRect.bottom;
}

function getIssueNodeVariant(issueNode: IssueNode): string | undefined {
  const rawVariant = (issueNode as unknown as { variant?: unknown }).variant;
  if (rawVariant === null || rawVariant === undefined) return undefined;
  const value = String(rawVariant).trim();
  return value === "" ? undefined : value;
}
