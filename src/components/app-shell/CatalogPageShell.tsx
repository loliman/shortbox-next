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
import type { SessionData } from "../../types/session";
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

type InitialNavLayout = {
  offset: string;
  gutter: string;
};

async function readInitialNavLayout(showNavigation: boolean): Promise<InitialNavLayout> {
  if (!showNavigation) return { offset: "0px", gutter: "0px" };

  const headerStore = await headers();
  const initialResponsiveGuess = getInitialResponsiveGuess({
    userAgent: headerStore.get("user-agent"),
    secChUaMobile: headerStore.get("sec-ch-ua-mobile"),
  });
  const initialTablet = !initialResponsiveGuess.isPhone && !initialResponsiveGuess.isDesktop;
  const initialNavWide =
    initialResponsiveGuess.isDesktop || (initialTablet && initialResponsiveGuess.isLandscape);
  const navWidth = `${getNavDrawerWidth(false)}px`;

  return {
    offset: initialNavWide ? navWidth : "0px",
    gutter: initialResponsiveGuess.isDesktop ? navWidth : "0px",
  };
}

async function readResolvedSession(
  session: SessionData | null | undefined
): Promise<SessionData | null> {
  if (session !== undefined) return session;
  return readServerSession();
}

async function readResolvedChangeRequestsCount(
  sessionPromise: Promise<SessionData | null>,
  changeRequestsCount: number | undefined
): Promise<number> {
  if (typeof changeRequestsCount === "number") return changeRequestsCount;
  const session = await sessionPromise;
  if (!session?.canAdmin) return 0;
  return countChangeRequests().catch(() => 0);
}

async function readResolvedPreviewImportActive(
  sessionPromise: Promise<SessionData | null>,
  previewImportActive: boolean | undefined
): Promise<boolean> {
  if (typeof previewImportActive === "boolean") return previewImportActive;
  const session = await sessionPromise;
  if (!session?.canAdmin) return false;
  return readHasActivePreviewImportQueue().catch(() => false);
}

function getShellOverflow(lockViewportHeight: boolean) {
  return lockViewportHeight ? { xs: "visible", lg: "hidden" } : "visible";
}

function getShellPadding(
  showNavigation: boolean,
  initialNavGutter: string,
  initialNavOffset: string,
  staticDesktopSidePadding: string
) {
  return {
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
  };
}

export default async function CatalogPageShell(props: Readonly<CatalogPageShellProps>) {
  const showNavigation = props.showNavigation ?? true;
  const lockViewportHeight = props.lockViewportHeight ?? true;
  const sessionPromise = readResolvedSession(props.session);

  const [resolvedSession, resolvedChangeRequestsCount, resolvedPreviewImportActive, initialNavLayout] = await Promise.all([
    sessionPromise,
    readResolvedChangeRequestsCount(sessionPromise, props.changeRequestsCount),
    readResolvedPreviewImportActive(sessionPromise, props.previewImportActive),
    readInitialNavLayout(showNavigation),
  ]);
  const initialNavOffset = initialNavLayout.offset;
  const initialNavGutter = initialNavLayout.gutter;
  const staticDesktopSidePadding = `${getNavDrawerWidth(false) / 2 + 8}px`;
  const shellOverflow = getShellOverflow(lockViewportHeight);
  const shellPadding = getShellPadding(
    showNavigation,
    initialNavGutter,
    initialNavOffset,
    staticDesktopSidePadding
  );

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        height: lockViewportHeight ? { xs: "auto", lg: "100dvh" } : "auto",
        overflow: shellOverflow,
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
      {showNavigation && resolvedSession?.canWrite ? (
        <AddFab
          session={resolvedSession}
          level={props.level}
          selected={props.selected}
          us={props.us}
          previewImportActive={resolvedPreviewImportActive}
        />
      ) : null}
      {showNavigation && !resolvedSession?.canWrite && !props.us ? (
        <ErrorFab level={props.level} selected={props.selected} us={props.us} />
      ) : null}

      <Box
        component="main"
        sx={{
          display: "flex",
          flexGrow: 1,
          minHeight: 0,
          overflow: shellOverflow,
          backgroundColor: "background.default",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: shellOverflow,
            backgroundColor: "background.default",
            ...shellPadding,
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
              overflow: shellOverflow,
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
                className="main-content"
                sx={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minHeight: 0,
                  overflow: shellOverflow,
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
