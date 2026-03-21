"use client";

import Card from "@mui/material/Card";
import React from "react";
import TopBar from "./top-bar/TopBar";
import List from "./nav-bar/List";
import { AppContext } from "./generic/AppContext";
import AddFab from "./fab/AddFab";
import ErrorFab from "./fab/ErrorFab";
import Box from "@mui/material/Box";
import FooterLinks from "./footer/FooterLinks";
import { COMPACT_BOTTOM_BAR_CLEARANCE, getNavDrawerWidth } from "./layoutMetrics";
import type { AppRouteContextValue } from "../app/routeContext";

interface SessionData {
  loggedIn: boolean;
}

interface LayoutProps {
  routeContext: AppRouteContextValue;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<
    string,
    Array<{
      id?: string | null;
      title?: string | null;
      volume?: number | null;
      startyear?: number | null;
      endyear?: number | null;
      publisher?: { id?: string | null; name?: string | null; us?: boolean | null } | null;
    }>
  >;
  initialIssueNodesBySeriesKey?: Record<
    string,
    Array<{
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
        publisher?: { id?: string | null; name?: string | null; us?: boolean | null } | null;
      } | null;
    }>
  >;
  us?: boolean;
  children?: React.ReactNode;
  drawerOpen?: boolean;
  session?: SessionData;
  handleScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  isPhone?: boolean;
  isPhoneLandscape?: boolean;
  isTablet?: boolean;
  isTabletLandscape?: boolean;
  compactLayout?: boolean;
  isPhonePortrait?: boolean;
  enqueueSnackbar?: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
  handleLogout?: () => void;
}

export default function Layout(ownProps: Readonly<LayoutProps>) {
  const appContext = React.useContext(AppContext);
  const routeContext = ownProps.routeContext;
  const props = React.useMemo(
    () => ({ ...appContext, ...routeContext, ...ownProps }),
    [appContext, routeContext, ownProps]
  );
  const { us, children, session, drawerOpen } = props;
  const handleScroll = props.handleScroll;
  const temporaryDrawer =
    props.compactLayout ?? Boolean(props.isPhone || (props.isTablet && !props.isTabletLandscape));
  const drawerWidth = getNavDrawerWidth(temporaryDrawer);
  const contentOffset = !temporaryDrawer && drawerOpen ? `${drawerWidth}px` : 0;

  React.useEffect(() => {
    if (!handleScroll) return;

    const onWindowScroll = () => {
      handleScroll({
        target: document.documentElement,
      } as unknown as React.UIEvent<HTMLDivElement>);
    };

    window.addEventListener("scroll", onWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", onWindowScroll);
  }, [handleScroll]);

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TopBar {...props} />

      <Box component="main" sx={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
        <List {...props} />

        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            minWidth: 0,
            px: { xs: 0, sm: 2 },
            pt: { xs: 0, sm: 2 },
            pb: temporaryDrawer ? COMPACT_BOTTOM_BAR_CLEARANCE : 2,
            ml: contentOffset,
            transition: (theme) =>
              theme.transitions.create("margin-left", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          }}
          onScroll={(e) => (props.handleScroll ? props.handleScroll(e) : false)}
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
                {children}
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
              <FooterLinks
                isPhonePortrait={props.isPhonePortrait}
              />
            </Box>
          </Card>
        </Box>

      {session ? <AddFab {...props} /> : us ? null : <ErrorFab {...props} />}
      </Box>
    </Box>
  );
}
