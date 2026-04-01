import { headers } from "next/headers";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import FooterLinks from "../footer/FooterLinks";
import LayoutChromeClient from "../LayoutChromeClient";
import AddFab from "../fab/AddFab";
import ErrorFab from "../fab/ErrorFab";
import { COMPACT_BOTTOM_BAR_CLEARANCE, getNavDrawerWidth } from "../layoutMetrics";
import { getInitialResponsiveGuess } from "../../app/responsiveGuess";
import { countChangeRequests } from "../../lib/read/issue-read";
import { readHasActivePreviewImportQueue } from "../../lib/read/preview-import-read";
import { readServerSession } from "../../lib/server/session";
import type { IssueNode, PublisherNode, SeriesNode } from "../nav-bar/listTreeUtils";
import type { SessionData } from "../../app/session";
import type { LayoutRouteData, RouteQuery } from "../../types/route-ui";

export interface CatalogPageShellProps {
  selected: LayoutRouteData["selected"];
  level: LayoutRouteData["level"];
  us: boolean;
  showNavigation?: boolean;
  lockViewportHeight?: boolean;
  query?: RouteQuery | null;
  initialPublisherNodes?: PublisherNode[];
  initialSeriesNodesByPublisher?: Record<string, SeriesNode[]>;
  initialIssueNodesBySeriesKey?: Record<string, IssueNode[]>;
  drawerOpen?: boolean;
  session?: SessionData | null;
  initialFilterCount?: number | null;
  changeRequestsCount?: number;
  previewImportActive?: boolean;
  navigationLoading?: boolean;
  children?: React.ReactNode;
}

export default async function CatalogPageShell(props: Readonly<CatalogPageShellProps>) {
  const showNavigation = props.showNavigation ?? true;
  const lockViewportHeight = props.lockViewportHeight ?? true;
  const sessionPromise =
    props.session === undefined ? readServerSession() : Promise.resolve(props.session);

  const [resolvedSession, resolvedChangeRequestsCount, resolvedPreviewImportActive, initialNavLayout] = await Promise.all([
    sessionPromise,
    typeof props.changeRequestsCount === "number"
      ? Promise.resolve(props.changeRequestsCount)
      : sessionPromise.then((session) => (session?.canAdmin ? countChangeRequests().catch(() => 0) : 0)),
    typeof props.previewImportActive === "boolean"
      ? Promise.resolve(props.previewImportActive)
      : sessionPromise.then((session) => (session?.canAdmin ? readHasActivePreviewImportQueue().catch(() => false) : false)),
    (async () => {
      if (!showNavigation) return { offset: "0px", gutter: "0px" };

      const headerStore = await headers();
      const initialResponsiveGuess = getInitialResponsiveGuess(headerStore.get("user-agent"));
      const initialTablet = !initialResponsiveGuess.isPhone && !initialResponsiveGuess.isDesktop;
      const initialNavWide =
        initialResponsiveGuess.isDesktop || (initialTablet && initialResponsiveGuess.isLandscape);
      const navWidth = `${getNavDrawerWidth(false)}px`;
      return {
        offset: initialNavWide ? navWidth : "0px",
        gutter: initialResponsiveGuess.isDesktop ? navWidth : "0px",
      };
    })(),
  ]);
  const initialNavOffset = initialNavLayout.offset;
  const initialNavGutter = initialNavLayout.gutter;
  const staticDesktopSidePadding = `${getNavDrawerWidth(false) / 2 + 8}px`;

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        height: lockViewportHeight ? { xs: "auto", lg: "100dvh" } : "auto",
        overflow: lockViewportHeight ? { xs: "visible", lg: "hidden" } : "visible",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "background.default",
      }}
    >
      <LayoutChromeClient
        selected={props.selected}
        us={props.us}
        showNavigation={showNavigation}
        query={props.query}
        initialPublisherNodes={props.initialPublisherNodes}
        initialSeriesNodesByPublisher={props.initialSeriesNodesByPublisher}
        initialIssueNodesBySeriesKey={props.initialIssueNodesBySeriesKey}
        drawerOpen={props.drawerOpen}
        session={resolvedSession}
        initialFilterCount={props.initialFilterCount}
        changeRequestsCount={resolvedChangeRequestsCount}
        previewImportActive={resolvedPreviewImportActive}
        navigationLoading={props.navigationLoading}
      />
      {showNavigation
        ? resolvedSession?.canWrite ? (
            <AddFab
              session={resolvedSession}
              level={props.level}
              selected={props.selected}
              us={props.us}
              previewImportActive={resolvedPreviewImportActive}
            />
          ) : props.us ? null : (
            <ErrorFab level={props.level} selected={props.selected} us={props.us} />
          )
        : null}

      <Box
        component="main"
        sx={{
          display: "flex",
          flexGrow: 1,
          minHeight: 0,
          overflow: lockViewportHeight ? { xs: "visible", lg: "hidden" } : "visible",
          backgroundColor: "background.default",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: lockViewportHeight ? { xs: "visible", lg: "hidden" } : "visible",
            backgroundColor: "background.default",
            pl: {
              xs: 0,
              sm: 2,
              md: showNavigation ? 2 : staticDesktopSidePadding,
              lg: showNavigation
                ? `calc((var(--shortbox-nav-gutter, ${initialNavGutter}) / 2) + 8px)`
                : staticDesktopSidePadding,
            },
            pr: {
              xs: 0,
              sm: 2,
              md: showNavigation ? 2 : staticDesktopSidePadding,
              lg: showNavigation
                ? `max(16px, calc((var(--shortbox-nav-gutter, ${initialNavGutter}) / 2) + 8px - (var(--shortbox-nav-offset, ${initialNavOffset}) / 2)))`
                : staticDesktopSidePadding,
            },
            pt: { xs: 0, sm: 2 },
            pb: showNavigation
              ? { xs: COMPACT_BOTTOM_BAR_CLEARANCE, sm: COMPACT_BOTTOM_BAR_CLEARANCE, lg: 2 }
              : { xs: 0, sm: 2 },
            ml: {
              xs: showNavigation ? `var(--shortbox-nav-offset, ${initialNavOffset})` : 0,
              lg: showNavigation
                ? `calc(var(--shortbox-nav-offset, ${initialNavOffset}) / 2)`
                : 0,
            },
          }}
        >
          <Card
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              minWidth: 0,
              minHeight: 0,
              overflow: lockViewportHeight ? { xs: "visible", lg: "hidden" } : "visible",
              backgroundColor: "background.paper",
            }}
          >
            <Box
              sx={{
                flexGrow: 1,
                px: { xs: 0, sm: 2 },
                pt: { xs: 0, sm: 2 },
                pb: 0,
                minHeight: 0,
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  right: { xs: -12, sm: -16 },
                  bottom: { xs: -12, sm: -16 },
                  width: "min(100%, 70vw)",
                  height: "45%",
                  background:
                    "radial-gradient(circle at 100% 100%, rgba(17,17,17,0.08), rgba(17,17,17,0) 58%)",
                  opacity: 1,
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
              <Box
                className="main-content"
                sx={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minHeight: 0,
                  overflow: lockViewportHeight ? { xs: "visible", lg: "hidden" } : "visible",
                }}
              >
                {props.children}
              </Box>
            </Box>

            <Box
              sx={{
                mt: "auto",
                px: { xs: 0, sm: 2 },
                pt: 1.25,
                pb: { xs: 0, sm: 1.25 },
                borderTop: 1,
                borderColor: "divider",
                backgroundColor: "background.paper",
                position: "sticky",
                bottom: 0,
                zIndex: 1,
                display: "flex",
                justifyContent: { xs: "center", sm: "flex-end" },
              }}
            >
              <FooterLinks />
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
