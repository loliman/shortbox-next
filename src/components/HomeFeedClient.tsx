"use client";

import React from "react";
import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useSnackbarBridge } from "./generic/useSnackbarBridge";
import IssuePreview from "./issue-preview/IssuePreview";
import IssuePreviewSmall from "./issue-preview/IssuePreviewSmall";
import LoadingDots from "./generic/LoadingDots";
import type { PreviewIssue } from "./issue-preview/utils/issuePreviewUtils";
import { buildRouteHref } from "./generic/routeHref";
import { usePendingNavigation } from "./generic/usePendingNavigation";
import {
  getListingDirection,
  getListingOrder,
  getListingView,
  parseListingFilter,
} from "../util/listingQuery";
import type { SessionData } from "../types/session";
import { useInitialResponsiveGuess } from "../app/responsiveGuessContext";
import type { LayoutRouteData, RouteQuery } from "../types/route-ui";

const DeferredListingToolbar = dynamic(() => import("./listing/ListingToolbar"), {
  loading: () => null,
});

type HomePreviewProps = {
  us: boolean;
  session?: SessionData | null;
  selected: LayoutRouteData["selected"];
  query?: RouteQuery | null;
};

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
  const theme = useTheme();
  const initialGuess = useInitialResponsiveGuess();
  const isLandscape = useMediaQuery("(orientation: landscape)", {
    defaultMatches: initialGuess?.isLandscape ?? true,
  });
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"), {
    defaultMatches: initialGuess?.isPhone ?? false,
  });
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"), {
    defaultMatches: initialGuess?.isDesktop ?? true,
  });
  const isTablet = !isPhone && !isDesktop;
  const { enqueueSnackbar } = useSnackbarBridge();
  const { isPending, push } = usePendingNavigation();
  const query = props.query as
    | { filter?: string; order?: string; direction?: string; view?: string }
    | null
    | undefined;
  const routeUs = Boolean(props.us);
  const filter = parseListingFilter(query, routeUs);
  const compactLayout = isPhone || (isTablet && !isLandscape);

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

  const [items, setItems] = React.useState<PreviewIssue[]>(() => props.initialItems ?? []);
  const [fetchingMore, setFetchingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(Boolean(props.initialHasMore));
  const [nextCursor, setNextCursor] = React.useState<string | null>(props.initialNextCursor ?? null);

  const cacheKey = React.useMemo(() => `shortbox_home_cache_${requestKey}`, [requestKey]);
  const scrollKey = React.useMemo(() => `shortbox_home_scroll_${requestKey}`, [requestKey]);

  // Clean cache on fresh navigations (i.e. not back/forward)
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.performance) return;
    try {
      const navs = window.performance.getEntriesByType("navigation");
      const navType = navs[0] ? (navs[0] as any).type : "";
      if (navType && navType !== "back_forward") {
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(scrollKey);
      }
    } catch (e) {}
  }, [cacheKey, scrollKey]);

  // Restore state from sessionStorage on popstate / back-navigation
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { items: cachedItems, nextCursor: cachedCursor, hasMore: cachedHasMore } = JSON.parse(cached);
        setItems(cachedItems);
        setNextCursor(cachedCursor);
        setHasMore(cachedHasMore);

        const savedScroll = sessionStorage.getItem(scrollKey);
        if (savedScroll) {
          globalThis.setTimeout(() => {
            window.scrollTo(0, parseInt(savedScroll, 10));
          }, 100);
        }
      }
    } catch (e) {}
  }, [cacheKey, scrollKey]);

  // Save state on items/hasMore/nextCursor change
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (items.length > (props.initialItems?.length ?? 0)) {
      try {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            items,
            nextCursor,
            hasMore,
          })
        );
      } catch (e) {}
    }
  }, [items, nextCursor, hasMore, cacheKey, props.initialItems]);

  // Save scroll position on scroll
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saveScroll = () => {
      try {
        sessionStorage.setItem(scrollKey, String(window.scrollY));
      } catch (e) {}
    };
    window.addEventListener("scroll", saveScroll, { passive: true });
    return () => window.removeEventListener("scroll", saveScroll);
  }, [scrollKey]);

  const handleResetAll = React.useCallback(() => {
    push(buildRouteHref(window.location.pathname, null, { filter: null }));
  }, [push]);
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
  const previewProps = React.useMemo<HomePreviewProps>(
    () => ({
      us: routeUs,
      session: props.session,
      selected: props.selected,
      query: props.query,
    }),
    [
      props.query,
      props.selected,
      props.session,
      routeUs,
    ]
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
        const nextItems = Array.isArray(payload.items) ? payload.items : [];

        setItems((prev) => [...prev, ...nextItems]);
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
    setItems(props.initialItems ?? []);
    setNextCursor(props.initialNextCursor ?? null);
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

    globalThis.addEventListener("scroll", onWindowScroll, { passive: true });
    return () => globalThis.removeEventListener("scroll", onWindowScroll);
  }, [fetchingMore, hasMore, items.length, loadPage, nextCursor]);

  const loadingIndicator = hasMore && fetchingMore ? <LoadingDots /> : null;

  return (
    <>
      {!compactLayout && query?.filter ? (
        <DeferredListingToolbar
          query={query}
          previewProps={previewProps}
          compactLayout={compactLayout}
          showSort={false}
        />
      ) : null}

      {compactLayout ? (
        <DeferredListingToolbar
          query={query}
          previewProps={previewProps}
          compactLayout={compactLayout}
          showSort
        />
      ) : null}

      {items.length === 0 ? (
        <Card
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            p: { xs: 4, sm: 6 },
            gap: 2,
            border: "1px dashed",
            borderColor: "divider",
            backgroundColor: "background.paper",
            borderRadius: 3,
            boxShadow: "none",
            mt: 2,
          }}
        >
          <SearchOffIcon sx={{ fontSize: 48, color: "text.secondary", opacity: 0.7 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Keine passenden Ausgaben gefunden
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Passe deine Filter oder deinen Suchbegriff an, um andere Ergebnisse zu sehen.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={handleResetAll}
            startIcon={<RestartAltIcon />}
            sx={{ mt: 1 }}
          >
            Filter zurücksetzen
          </Button>
        </Card>
      ) : (
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
      )}

      {loadingIndicator}
    </>
  );
}

function buildIssueKey(
  issue: { id?: string | number | null; number?: string | number | null },
  idx: number
) {
  if (issue.id) return "issue-id|" + issue.id + "|" + idx;
  if (issue.number) return "issue-number|" + issue.number + "|" + idx;
  return "issue|" + idx;
}
