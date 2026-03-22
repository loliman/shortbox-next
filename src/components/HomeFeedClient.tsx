"use client";

import React from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { useSnackbarBridge } from "./generic/useSnackbarBridge";
import IssuePreview from "./issue-preview/IssuePreview";
import IssuePreviewSmall from "./issue-preview/IssuePreviewSmall";
import LoadingDots from "./generic/LoadingDots";
import type { PreviewIssue } from "./issue-preview/utils/issuePreviewUtils";
import {
  getListingDirection,
  getListingOrder,
  getListingView,
  parseListingFilter,
} from "../util/listingQuery";
import ListingToolbar from "./listing/ListingToolbar";
import type { SessionData } from "../app/session";
import { useResponsive } from "../app/useResponsive";
import type { LayoutRouteData, RouteQuery } from "../types/route-ui";

const GALLERY_GRID_SX = {
  display: "grid",
  columnGap: 3,
  rowGap: 1.5,
} as const;

interface HomeFeedClientProps {
  selected: LayoutRouteData["selected"];
  us: boolean;
  query?: RouteQuery | null;
  session?: SessionData | null;
  initialItems?: PreviewIssue[];
  initialHasMore?: boolean;
  initialNextCursor?: string | null;
}

export default function HomeFeedClient(props: Readonly<HomeFeedClientProps>) {
  const responsive = useResponsive();
  const { enqueueSnackbar } = useSnackbarBridge();
  const query = props.query as
    | { filter?: string; order?: string; direction?: string; view?: string }
    | null
    | undefined;
  const routeUs = Boolean(props.us);
  const filter = parseListingFilter(query, routeUs);
  const compactLayout = responsive.isCompact;
  const listingView = getListingView(query);
  const galleryGridColumns = compactLayout
    ? "repeat(1, minmax(0, 1fr))"
    : {
        xs: "repeat(1, minmax(0, 1fr))",
        sm: "repeat(2, minmax(0, 1fr))",
        md: "repeat(3, minmax(0, 1fr))",
        lg: "repeat(4, minmax(0, 1fr))",
        xl: "repeat(5, minmax(0, 1fr))",
      };
  const galleryGridSx = {
    ...GALLERY_GRID_SX,
    gridTemplateColumns: galleryGridColumns,
  } as const;
  const previewProps = React.useMemo(
    () => ({
      us: routeUs,
      session: props.session,
      selected: props.selected,
      compactLayout,
      isPhone: responsive.isPhone,
      isTablet: responsive.isTablet,
      isTabletLandscape: responsive.isTabletLandscape,
    }),
    [
      compactLayout,
      props.selected,
      props.session,
      responsive.isPhone,
      responsive.isTablet,
      responsive.isTabletLandscape,
      routeUs,
    ]
  );
  const [items, setItems] = React.useState<PreviewIssue[]>(() => props.initialItems || []);
  const [fetchingMore, setFetchingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(Boolean(props.initialHasMore));
  const [nextCursor, setNextCursor] = React.useState<string | null>(props.initialNextCursor || null);
  const requestKey = React.useMemo(
    () =>
      JSON.stringify({
        us: routeUs,
        order: getListingOrder(query),
        direction: getListingDirection(query),
        filter,
      }),
    [routeUs, query, filter]
  );

  const loadPage = React.useCallback(
    async (offset: number, cursor: string | null) => {
      setFetchingMore(true);
      try {
        const params = new URLSearchParams({
          locale: routeUs ? "us" : "de",
          limit: "50",
          order: getListingOrder(query),
          direction: getListingDirection(query),
        });
        if (!cursor) params.set("offset", String(offset));
        if (cursor) params.set("cursor", cursor);
        if (query?.filter) params.set("filter", query.filter);
        const response = await fetch(`/api/public-home?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Home request failed: ${response.status}`);

        const payload = (await response.json()) as {
          items?: PreviewIssue[];
          hasMore?: boolean;
          nextCursor?: string | null;
        };

        setItems((prev) => [...prev, ...((payload.items || []) as PreviewIssue[])]);
        setHasMore(Boolean(payload.hasMore));
        setNextCursor(typeof payload.nextCursor === "string" ? payload.nextCursor : null);
      } catch (nextError) {
        enqueueSnackbar?.(
          nextError instanceof Error && nextError.message
            ? `Weitere Eintraege konnten nicht geladen werden: ${nextError.message}`
            : "Weitere Eintraege konnten nicht geladen werden.",
          { variant: "error" }
        );
      } finally {
        setFetchingMore(false);
      }
    },
    [enqueueSnackbar, query, routeUs]
  );

  React.useEffect(() => {
    setHasMore(Boolean(props.initialHasMore));
    setItems(props.initialItems || []);
    setNextCursor(props.initialNextCursor || null);
  }, [props.initialHasMore, props.initialItems, props.initialNextCursor, requestKey]);

  React.useEffect(() => {
    const onWindowScroll = () => {
      if (fetchingMore || !hasMore) return;

      const element = document.documentElement;
      const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
      const prefetchPx = Math.max(200, Math.floor(element.clientHeight * 0.5));
      if (remaining > prefetchPx) return;

      void loadPage(items.length, nextCursor);
    };

    window.addEventListener("scroll", onWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", onWindowScroll);
  }, [fetchingMore, hasMore, items.length, loadPage, nextCursor]);

  const loadingIndicator = hasMore && fetchingMore ? <LoadingDots /> : null;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0, flexGrow: 1 }} />
        {!compactLayout ? (
          <Box sx={{ display: "flex", justifyContent: "flex-end", flexGrow: 1 }}>
            <ListingToolbar
              query={query}
              previewProps={previewProps as any}
              compactLayout={compactLayout}
              showSort
            />
          </Box>
        ) : null}
      </Box>

      {compactLayout ? (
        <ListingToolbar
          query={query}
          previewProps={previewProps as any}
          compactLayout={compactLayout}
          showSort
        />
      ) : null}

      <Box
        key={listingView}
        sx={{
          animation: "listingViewSwap 220ms ease-in-out",
          "@keyframes listingViewSwap": {
            "0%": { opacity: 0, transform: "translateY(4px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        {listingView === "gallery" ? (
          <Box sx={galleryGridSx}>
            {items.map((item, idx) => (
              <IssuePreviewSmall
                {...previewProps}
                key={buildIssueKey(item, idx)}
                issue={item}
              />
            ))}
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {items.map((item, idx) => (
              <IssuePreview
                {...previewProps}
                key={buildIssueKey(item, idx)}
                issue={item}
              />
            ))}
          </Stack>
        )}
      </Box>

      {loadingIndicator}
    </>
  );
}

function buildIssueKey(
  issue: { id?: string | number | null; number?: string | number | null },
  idx: number
) {
  if (issue.id) return String(issue.id);
  if (issue.number) return "issue|" + issue.number + "|" + idx;
  return "issue|" + idx;
}
