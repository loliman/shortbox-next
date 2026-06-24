import { cookies, headers } from "next/headers";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import FooterLinks from "../footer/FooterLinks";
import LayoutChromeClient from "../LayoutChromeClient";
import AddFab from "../fab/AddFab";
import ErrorFab from "../fab/ErrorFab";
import { COMPACT_BOTTOM_BAR_CLEARANCE, getNavDrawerWidth } from "../layoutMetrics";
import { getInitialResponsiveGuess, RESPONSIVE_GUESS_COOKIE_NAME } from "../../app/responsiveGuess";
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
  const cookieStore = await cookies();
  const initialResponsiveGuess = getInitialResponsiveGuess({
    userAgent: headerStore.get("user-agent"),
    secChUaMobile: headerStore.get("sec-ch-ua-mobile"),
    storedGuess: cookieStore.get(RESPONSIVE_GUESS_COOKIE_NAME)?.value,
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
    pl: 0,
    pr: 0,
    pt: 0,
    pb: 0,
    ml: {
      xs: showNavigation ? `var(--shortbox-nav-offset, ${initialNavOffset})` : 0,
      lg: showNavigation
        ? `var(--shortbox-nav-offset, ${initialNavOffset})`
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
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        '[data-theme="dark"] &': {
          background: "linear-gradient(135deg, #090b0f 0%, #1a1f29 100%)",
        },
        position: "relative",
        isolation: "isolate",
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
          backgroundColor: "transparent",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: shellOverflow,
            backgroundColor: "transparent",
            ...shellPadding,
          }}
        >
          <Card
            className="shortbox-layout-card"
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              minWidth: 0,
              minHeight: 0,
              overflow: shellOverflow,
              backgroundColor: "rgba(255, 255, 255, 0.65)",
              backdropFilter: "blur(20px)",
              backgroundImage: "none",
              border: "none",
              borderLeft: "1px solid",
              borderColor: "rgba(0, 0, 0, 0.06)",
              boxShadow: "none",
              borderRadius: "0px !important",
              mt: "3px",
              '[data-theme="dark"] &': {
                backgroundColor: "var(--mui-palette-background-default)",
                borderColor: "rgba(255, 255, 255, 0.08)",
                boxShadow: "none",
              },
            }}
          >
            <Box
              sx={{
                flexGrow: 1,
                p: { xs: 2, sm: 3 },
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

              <Box
                data-shortbox-watermark
                sx={{
                  position: "absolute",
                  right: "0px",
                  bottom: "0px",
                  width: 220,
                  height: 220,
                  backgroundImage: 'url("/background.png")',
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right bottom",
                  backgroundSize: "contain",
                  opacity: 0.12,
                  zIndex: 10,
                  pointerEvents: "none",
                  '[data-theme="dark"] &': {
                    filter: "invert(1)",
                    opacity: 0.12,
                  },
                }}
              />
            </Box>

            <Box
              sx={{
                mt: "auto",
                px: { xs: 0, sm: 2 },
                pt: 1.25,
                pb: { xs: 0, sm: 1.25 },
                borderTop: 1,
                borderColor: "divider",
                backgroundColor: "transparent",
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
