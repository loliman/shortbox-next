"use client";

import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Layout from "./Layout";
import QueryResult from "./generic/QueryResult";
import { AppContext } from "./generic/AppContext";
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
import { HomeListingPlaceholder } from "./placeholders/HomeListingPlaceholder";
import ListingToolbar from "./listing/ListingToolbar";
import type { AppRouteContextValue } from "../app/routeContext";

const HOME_SEO_SUMMARY =
  "Shortbox listet alle deutschen Marvel Veröffentlichungen detailliert auf und ordnet diese den entsprechenden US Geschichten zu.";
const GALLERY_GRID_SX = {
  display: "grid",
  columnGap: 3,
  rowGap: 1.5,
} as const;

interface HomeProps {
  routeContext: AppRouteContextValue;
  registerLoadingComponent?: (component: string) => void;
  unregisterLoadingComponent?: (component: string) => void;
  query?: { filter?: string; order?: string; direction?: string; view?: string } | null;
  us?: boolean;
  appIsLoading?: boolean;
  compactLayout?: boolean;
  isPhone?: boolean;
  isTablet?: boolean;
  isTabletLandscape?: boolean;
  [key: string]: unknown;
}

export default function Home(routeProps: Readonly<HomeProps>) {
  const appContext = React.useContext(AppContext);
  const props = React.useMemo(
    () => ({ ...appContext, ...routeProps.routeContext }),
    [appContext, routeProps.routeContext]
  );
  const homeLoadingRegisteredRef = React.useRef(false);

  const unregisterHomeLoading = React.useCallback(() => {
    if (!homeLoadingRegisteredRef.current) return;
    homeLoadingRegisteredRef.current = false;
    props.unregisterLoadingComponent?.("Home");
  }, [props]);

  React.useEffect(() => {
    props.registerLoadingComponent?.("Home");
    homeLoadingRegisteredRef.current = true;

    return () => {
      unregisterHomeLoading();
    };
  }, [props, unregisterHomeLoading]);

  const filter = parseListingFilter(props.query, Boolean(props.us));
  const compactLayout =
    props.compactLayout ??
    Boolean(props.isPhone || (props.isTablet && !props.isTabletLandscape));
  const listingView = getListingView(props.query);
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
  const [items, setItems] = React.useState<PreviewIssue[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchingMore, setFetchingMore] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const requestKey = React.useMemo(
    () =>
      JSON.stringify({
        us: Boolean(props.us),
        order: getListingOrder(props.query),
        direction: getListingDirection(props.query),
        filter,
      }),
    [props.us, props.query, filter]
  );

  const loadPage = React.useCallback(
    async (offset: number, append: boolean) => {
      if (append) setFetchingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({
          locale: props.us ? "us" : "de",
          offset: String(offset),
          limit: "50",
          order: getListingOrder(props.query),
          direction: getListingDirection(props.query),
        });
        const response = await fetch(`/api/public-home?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Home request failed: ${response.status}`);

        const payload = (await response.json()) as {
          items?: PreviewIssue[];
          hasMore?: boolean;
        };

        setItems((prev) => (append ? [...prev, ...((payload.items || []) as PreviewIssue[])] : ((payload.items || []) as PreviewIssue[])));
        setHasMore(Boolean(payload.hasMore));
        setError(null);
      } catch (nextError) {
        setError(nextError);
        if (!append) setItems([]);
        setHasMore(false);
      } finally {
        if (append) setFetchingMore(false);
        else {
          setLoading(false);
          unregisterHomeLoading();
        }
      }
    },
    [props.us, props.query, unregisterHomeLoading]
  );

  React.useEffect(() => {
    setItems([]);
    setHasMore(false);
    setError(null);
    void loadPage(0, false);
  }, [requestKey, loadPage]);

  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      if (loading || fetchingMore || !hasMore) return;

      const element = event.target as HTMLElement | null;
      if (!element) return;

      const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
      const prefetchPx = Math.max(200, Math.floor(element.clientHeight * 0.5));
      if (remaining > prefetchPx) return;

      void loadPage(items.length, true);
    },
    [loading, fetchingMore, hasMore, loadPage, items.length]
  );

  const loadingIndicator = hasMore && fetchingMore ? <LoadingDots /> : null;

  return (
    <Layout routeContext={routeProps.routeContext} handleScroll={handleScroll}>
      {props.appIsLoading || error || loading ? (
        <QueryResult
          error={error}
          loading={loading}
          placeholder={
            <HomeListingPlaceholder query={props.query} compactLayout={compactLayout} />
          }
          placeholderCount={1}
        />
      ) : (
        <React.Fragment>
          <Stack spacing={3} sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Box>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 1.5,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h5">All-New, All-Different Shortbox</Typography>
                  <Typography color="text.secondary">
                    Das deutsche Archiv für Marvel Comics
                  </Typography>
                </Box>
                {!compactLayout ? (
                  <Box sx={{ display: "flex", justifyContent: "flex-end", flexGrow: 1 }}>
                    <ListingToolbar
                      query={props.query}
                      previewProps={props as any}
                      compactLayout={compactLayout}
                      showSort
                    />
                  </Box>
                ) : null}
              </Box>
              <Typography
                component="p"
                sx={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  p: 0,
                  m: -1,
                  overflow: "hidden",
                  clip: "rect(0 0 0 0)",
                  whiteSpace: "nowrap",
                  border: 0,
                }}
              >
                {HOME_SEO_SUMMARY}
              </Typography>
            </Box>

            {compactLayout ? (
              <ListingToolbar
                query={props.query}
                previewProps={props as any}
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
                      {...props}
                      key={buildIssueKey(item, idx)}
                      issue={item}
                    />
                  ))}
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {items.map((item, idx) => (
                    <IssuePreview
                      {...props}
                      key={buildIssueKey(item, idx)}
                      issue={item}
                    />
                  ))}
                </Stack>
              )}
            </Box>

            {loadingIndicator}
          </Stack>
        </React.Fragment>
      )}
    </Layout>
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
