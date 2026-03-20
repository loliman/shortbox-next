import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Layout from "./Layout";
import { lastEdited } from "../graphql/queriesTyped";
import QueryResult from "./generic/QueryResult";
import { AppContext } from "./generic/AppContext";
import { useAppRouteContext } from "./generic";
import IssuePreview from "./issue-preview/IssuePreview";
import IssuePreviewSmall from "./issue-preview/IssuePreviewSmall";
import PaginatedQuery from "./generic/PaginatedQuery";
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

const HOME_SEO_SUMMARY =
  "Shortbox listet alle deutschen Marvel Veröffentlichungen detailliert auf und ordnet diese den entsprechenden US Geschichten zu.";
const GALLERY_GRID_SX = {
  display: "grid",
  columnGap: 3,
  rowGap: 1.5,
} as const;

interface HomeProps {
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

export default function Home() {
  const appContext = React.useContext(AppContext);
  const routeContext = useAppRouteContext();
  const props = React.useMemo(() => ({ ...appContext, ...routeContext }), [appContext, routeContext]);
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

  return (
    <PaginatedQuery
      query={lastEdited}
      variables={{
        filter,
        order: getListingOrder(props.query),
        direction: getListingDirection(props.query),
      }}
      onCompleted={unregisterHomeLoading}
    >
      {({ error, data, fetchMore, fetching, hasMore, networkStatus }) => {
        const loading = hasMore && fetching ? <LoadingDots /> : null;

        return (
          <Layout handleScroll={fetchMore}>
            {props.appIsLoading || error || !data.lastEdited || networkStatus === 2 ? (
              <QueryResult
                error={error}
                loading={networkStatus === 2}
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
                        {data.lastEdited
                          ? data.lastEdited.map((i: Record<string, unknown>, idx: number) => (
                              <IssuePreviewSmall
                                {...props}
                                key={buildIssueKey(i as PreviewIssue, idx)}
                                issue={i as PreviewIssue}
                              />
                            ))
                          : null}
                      </Box>
                    ) : (
                      <Stack spacing={1.5}>
                        {data.lastEdited
                          ? data.lastEdited.map((i: Record<string, unknown>, idx: number) => (
                              <IssuePreview
                                {...props}
                                key={buildIssueKey(i as PreviewIssue, idx)}
                                issue={i as PreviewIssue}
                              />
                            ))
                          : null}
                      </Stack>
                    )}
                  </Box>

                  {loading}
                </Stack>
              </React.Fragment>
            )}
          </Layout>
        );
      }}
    </PaginatedQuery>
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
