"use client";

import Card from "@mui/material/Card";
import React from "react";
import TopBar from "./top-bar/TopBar";
import List from "./nav-bar/List";
import {
  useAdminMetaContext,
  useNavigationUiContext,
  useResponsiveContext,
  useSessionContext,
  useThemeModeContext,
} from "./generic/AppContext";
import { useSnackbarBridge } from "./generic/useSnackbarBridge";
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
  initialFilterCount?: number | null;
}

export default function Layout(ownProps: Readonly<LayoutProps>) {
  const sessionContext = useSessionContext();
  const responsiveContext = useResponsiveContext();
  const navigationUiContext = useNavigationUiContext();
  const themeContext = useThemeModeContext();
  const adminMetaContext = useAdminMetaContext();
  const snackbarBridge = useSnackbarBridge();
  const routeContext = ownProps.routeContext;
  const children = ownProps.children;
  const us = Boolean(routeContext.us ?? ownProps.us);
  const session = ownProps.session ?? sessionContext.session;
  const drawerOpen = ownProps.drawerOpen ?? navigationUiContext.drawerOpen;
  const handleScroll = ownProps.handleScroll;
  const compactLayout = ownProps.compactLayout ?? responsiveContext.compactLayout;
  const isPhone = ownProps.isPhone ?? responsiveContext.isPhone;
  const isTablet = ownProps.isTablet ?? responsiveContext.isTablet;
  const isTabletLandscape = ownProps.isTabletLandscape ?? responsiveContext.isTabletLandscape;
  const isPhoneLandscape = ownProps.isPhoneLandscape ?? responsiveContext.isPhoneLandscape;
  const isPhonePortrait = ownProps.isPhonePortrait ?? responsiveContext.isPhonePortrait;
  const temporaryDrawer =
    compactLayout ?? Boolean(isPhone || (isTablet && !isTabletLandscape));
  const drawerWidth = getNavDrawerWidth(temporaryDrawer);
  const contentOffset = !temporaryDrawer && drawerOpen ? `${drawerWidth}px` : 0;
  const topBarProps = React.useMemo(
    () => ({
      routeContext,
      toggleDrawer: navigationUiContext.toggleDrawer,
      drawerOpen,
      us,
      isPhone,
      isPhoneLandscape,
      isTablet,
      isTabletLandscape,
      isPhonePortrait,
      compactLayout,
      level: routeContext.level,
      session,
      query: routeContext.query as { filter?: string | null; order?: string | null; direction?: string | null } | null,
      selected: routeContext.selected,
      resetNavigationState: navigationUiContext.resetNavigationState,
      themeMode: themeContext.themeMode,
      toggleTheme: themeContext.toggleTheme,
      enqueueSnackbar: ownProps.enqueueSnackbar ?? snackbarBridge.enqueueSnackbar,
      handleLogout: ownProps.handleLogout ?? sessionContext.handleLogout,
      initialFilterCount: ownProps.initialFilterCount ?? routeContext.initialFilterCount,
      changeRequestsCount: adminMetaContext.changeRequestsCount,
    }),
    [
      adminMetaContext.changeRequestsCount,
      compactLayout,
      drawerOpen,
      isPhone,
      isPhoneLandscape,
      isPhonePortrait,
      isTablet,
      isTabletLandscape,
      navigationUiContext.resetNavigationState,
      navigationUiContext.toggleDrawer,
      ownProps.enqueueSnackbar,
      ownProps.handleLogout,
      ownProps.initialFilterCount,
      routeContext,
      sessionContext.handleLogout,
      snackbarBridge.enqueueSnackbar,
      session,
      themeContext.themeMode,
      themeContext.toggleTheme,
      us,
    ]
  );
  const listProps = React.useMemo(
    () => ({
      initialPublisherNodes: ownProps.initialPublisherNodes,
      initialSeriesNodesByPublisher: ownProps.initialSeriesNodesByPublisher,
      initialIssueNodesBySeriesKey: ownProps.initialIssueNodesBySeriesKey,
      drawerOpen,
      toggleDrawer: navigationUiContext.toggleDrawer,
      compactLayout,
      isPhone,
      isPhoneLandscape,
      isPhonePortrait,
      isTablet,
      isTabletLandscape,
      query: routeContext.query as { filter?: string | null; navPublisher?: string | null; navSeries?: string | null } | null,
      level: routeContext.level,
      selected: routeContext.selected,
      appIsLoading: navigationUiContext.appIsLoading,
      navResetVersion: navigationUiContext.navResetVersion,
      session,
      us,
    }),
    [
      compactLayout,
      drawerOpen,
      isPhone,
      isPhoneLandscape,
      isPhonePortrait,
      isTablet,
      isTabletLandscape,
      navigationUiContext.appIsLoading,
      navigationUiContext.navResetVersion,
      navigationUiContext.toggleDrawer,
      ownProps.initialIssueNodesBySeriesKey,
      ownProps.initialPublisherNodes,
      ownProps.initialSeriesNodesByPublisher,
      routeContext.level,
      routeContext.query,
      routeContext.selected,
      session,
      us,
    ]
  );
  const fabProps = React.useMemo(
    () => ({
      session,
      level: routeContext.level,
      selected: routeContext.selected,
      us,
    }),
    [routeContext.level, routeContext.selected, session, us]
  );

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
      <TopBar {...topBarProps} />

      <Box component="main" sx={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
        <List {...listProps} />

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
          onScroll={(e) => (handleScroll ? handleScroll(e) : false)}
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
                isPhonePortrait={isPhonePortrait}
              />
            </Box>
          </Card>
        </Box>

      {session ? <AddFab {...fabProps} /> : us ? null : <ErrorFab {...fabProps} />}
      </Box>
    </Box>
  );
}
