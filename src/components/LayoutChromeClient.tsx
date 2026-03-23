"use client";

import React from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { IssueNode, PublisherNode, SeriesNode } from "./nav-bar/listTreeUtils";
import type { SessionData } from "../app/session";
import { useInitialResponsiveGuess } from "../app/responsiveGuessContext";
import type { LayoutRouteData, RouteQuery } from "../types/route-ui";
import TopBar from "./top-bar/TopBar";
import List from "./nav-bar/List";
import { useThemeModeContext } from "./generic/AppContext";
import { useSnackbarBridge } from "./generic/useSnackbarBridge";
import { useLayoutChromeState } from "./useLayoutChromeState";

interface LayoutChromeClientProps {
  selected: LayoutRouteData["selected"];
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
}

export default function LayoutChromeClient(props: Readonly<LayoutChromeClientProps>) {
  const showNavigation = props.showNavigation ?? true;
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
  const isTabletLandscape = isTablet && isLandscape;
  const isPhonePortrait = isPhone && !isLandscape;
  const isCompact = isPhone || (isTablet && !isLandscape);
  const navWide = isDesktop || isTabletLandscape;
  const session = props.session ?? null;
  const temporaryDrawer = isCompact;
  const themeContext = useThemeModeContext();
  const snackbarBridge = useSnackbarBridge();
  const chromeState = useLayoutChromeState(
    showNavigation
      ? {
          drawerOpen: props.drawerOpen,
          navWide,
          temporaryDrawer,
        }
      : null
  );

  return (
    <>
      <TopBar
        toggleDrawer={chromeState.toggleDrawer}
        drawerOpen={chromeState.drawerOpen}
        us={props.us}
        showNavigation={showNavigation}
        compactLayout={isCompact}
        session={session}
        query={props.query}
        selected={props.selected}
        resetNavigationState={chromeState.resetNavigationState}
        toggleTheme={themeContext.toggleTheme}
        enqueueSnackbar={snackbarBridge.enqueueSnackbar}
        initialFilterCount={props.initialFilterCount}
        changeRequestsCount={props.changeRequestsCount ?? 0}
      />

      {showNavigation ? (
        <List
          initialPublisherNodes={props.initialPublisherNodes}
          initialSeriesNodesByPublisher={props.initialSeriesNodesByPublisher}
          initialIssueNodesBySeriesKey={props.initialIssueNodesBySeriesKey}
          drawerOpen={chromeState.drawerOpen}
          toggleDrawer={chromeState.toggleDrawer}
          temporaryDrawer={temporaryDrawer}
          phonePortrait={isPhonePortrait}
          query={
            props.query as
              | { filter?: string | null; navPublisher?: string | null; navSeries?: string | null }
              | null
          }
          selected={props.selected}
          session={session}
          us={props.us}
        />
      ) : null}
    </>
  );
}
