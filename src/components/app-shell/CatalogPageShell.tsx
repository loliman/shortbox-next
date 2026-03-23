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
import type { IssueNode, PublisherNode, SeriesNode } from "../nav-bar/listTreeUtils";
import type { SessionData } from "../../app/session";
import type { LayoutRouteData, RouteQuery } from "../../types/route-ui";

export interface CatalogPageShellProps {
  selected: LayoutRouteData["selected"];
  level: LayoutRouteData["level"];
  us: boolean;
  showNavigation?: boolean;
  query?: RouteQuery | null;
  initialPublisherNodes?: PublisherNode[];
  initialSeriesNodesByPublisher?: Record<string, SeriesNode[]>;
  initialIssueNodesBySeriesKey?: Record<string, IssueNode[]>;
  drawerOpen?: boolean;
  session?: SessionData | null;
  initialFilterCount?: number | null;
  changeRequestsCount?: number;
  children?: React.ReactNode;
}

export default async function CatalogPageShell(props: Readonly<CatalogPageShellProps>) {
  const showNavigation = props.showNavigation ?? true;
  const resolvedChangeRequestsCount =
    typeof props.changeRequestsCount === "number"
      ? props.changeRequestsCount
      : props.session?.canAdmin
        ? await countChangeRequests().catch(() => 0)
        : 0;
  let initialNavOffset = "0px";

  if (showNavigation) {
    const headerStore = await headers();
    const initialResponsiveGuess = getInitialResponsiveGuess(headerStore.get("user-agent"));
    const initialTablet = !initialResponsiveGuess.isPhone && !initialResponsiveGuess.isDesktop;
    const initialNavWide =
      initialResponsiveGuess.isDesktop || (initialTablet && initialResponsiveGuess.isLandscape);
    initialNavOffset = initialNavWide ? `${getNavDrawerWidth(false)}px` : "0px";
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        height: { xs: "auto", lg: "100dvh" },
        overflow: { xs: "visible", lg: "hidden" },
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
        session={props.session}
        initialFilterCount={props.initialFilterCount}
        changeRequestsCount={resolvedChangeRequestsCount}
      />
      {showNavigation
        ? props.session?.canWrite ? (
            <AddFab
              session={props.session}
              level={props.level}
              selected={props.selected}
              us={props.us}
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
          overflow: { xs: "visible", lg: "hidden" },
          backgroundColor: "background.default",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: { xs: "visible", lg: "hidden" },
            backgroundColor: "background.default",
            px: { xs: 0, sm: 2 },
            pt: { xs: 0, sm: 2 },
            pb: showNavigation
              ? { xs: COMPACT_BOTTOM_BAR_CLEARANCE, sm: COMPACT_BOTTOM_BAR_CLEARANCE, lg: 2 }
              : { xs: 0, sm: 2 },
            ml: showNavigation ? `var(--shortbox-nav-offset, ${initialNavOffset})` : 0,
            transition: showNavigation
              ? "margin-left 225ms cubic-bezier(0.4, 0, 0.6, 1)"
              : undefined,
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
              overflow: { xs: "visible", lg: "hidden" },
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
                  backgroundImage: "url('/background.png')",
                  backgroundPosition: "right bottom",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "contain",
                  opacity: 0.04,
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
                  overflow: { xs: "visible", lg: "hidden" },
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
