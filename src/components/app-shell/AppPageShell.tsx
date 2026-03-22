import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import FooterLinks from "../footer/FooterLinks";
import LayoutChromeClient from "../LayoutChromeClient";
import AddFab from "../fab/AddFab";
import ErrorFab from "../fab/ErrorFab";
import { COMPACT_BOTTOM_BAR_CLEARANCE } from "../layoutMetrics";
import type { IssueNode, PublisherNode, SeriesNode } from "../nav-bar/listTreeUtils";
import type { SessionData } from "../../app/session";
import type { LayoutRouteData, RouteQuery } from "../../types/route-ui";

interface AppPageShellProps {
  selected: LayoutRouteData["selected"];
  level: LayoutRouteData["level"];
  us: boolean;
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

export default function AppPageShell(props: Readonly<AppPageShellProps>) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <LayoutChromeClient
        selected={props.selected}
        us={props.us}
        query={props.query}
        initialPublisherNodes={props.initialPublisherNodes}
        initialSeriesNodesByPublisher={props.initialSeriesNodesByPublisher}
        initialIssueNodesBySeriesKey={props.initialIssueNodesBySeriesKey}
        drawerOpen={props.drawerOpen}
        session={props.session}
        initialFilterCount={props.initialFilterCount}
        changeRequestsCount={props.changeRequestsCount}
      />
      {props.session?.canWrite ? (
        <AddFab session={props.session} level={props.level} selected={props.selected} us={props.us} />
      ) : props.us ? null : (
        <ErrorFab level={props.level} selected={props.selected} us={props.us} />
      )}

      <Box component="main" sx={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            minWidth: 0,
            px: { xs: 0, sm: 2 },
            pt: { xs: 0, sm: 2 },
            pb: { xs: COMPACT_BOTTOM_BAR_CLEARANCE, sm: COMPACT_BOTTOM_BAR_CLEARANCE, lg: 2 },
            ml: "var(--shortbox-nav-offset, 0px)",
            transition: "margin-left 225ms cubic-bezier(0.4, 0, 0.6, 1)",
          }}
        >
          <Card
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              overflow: "visible",
            }}
          >
            <Box sx={{ flexGrow: 1, p: { xs: 0, sm: 2 }, minHeight: 0, position: "relative" }}>
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
              <Box className="main-content data-fade" sx={{ position: "relative", zIndex: 1 }}>
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
