"use client";

import React from "react";
import type { IssueNode, PublisherNode, SeriesNode } from "./nav-bar/listTreeUtils";
import type { SessionData } from "../app/session";
import { useResponsive } from "../app/useResponsive";
import type { LayoutRouteData, RouteQuery } from "../types/route-ui";
import TopBar from "./top-bar/TopBar";
import List from "./nav-bar/List";
import { useThemeModeContext } from "./generic/AppContext";
import { useSnackbarBridge } from "./generic/useSnackbarBridge";
import { useLayoutChromeState } from "./useLayoutChromeState";

interface LayoutChromeClientProps {
  selected: LayoutRouteData["selected"];
  us: boolean;
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
  const responsive = useResponsive();
  const session = props.session ?? null;
  const temporaryDrawer = responsive.isCompact;
  const themeContext = useThemeModeContext();
  const snackbarBridge = useSnackbarBridge();
  const chromeState = useLayoutChromeState({
    drawerOpen: props.drawerOpen,
    navWide: responsive.navWide,
    temporaryDrawer,
  });

  return (
    <>
      <TopBar
        toggleDrawer={chromeState.toggleDrawer}
        drawerOpen={chromeState.drawerOpen}
        us={props.us}
        isPhone={responsive.isPhone}
        isPhoneLandscape={responsive.isPhoneLandscape}
        isTablet={responsive.isTablet}
        isTabletLandscape={responsive.isTabletLandscape}
        isPhonePortrait={responsive.isPhonePortrait}
        compactLayout={responsive.isCompact}
        session={session}
        query={props.query}
        selected={props.selected}
        resetNavigationState={chromeState.resetNavigationState}
        themeMode={themeContext.themeMode}
        toggleTheme={themeContext.toggleTheme}
        enqueueSnackbar={snackbarBridge.enqueueSnackbar}
        initialFilterCount={props.initialFilterCount}
        changeRequestsCount={props.changeRequestsCount ?? 0}
      />

      <List
        initialPublisherNodes={props.initialPublisherNodes}
        initialSeriesNodesByPublisher={props.initialSeriesNodesByPublisher}
        initialIssueNodesBySeriesKey={props.initialIssueNodesBySeriesKey}
        drawerOpen={chromeState.drawerOpen}
        toggleDrawer={chromeState.toggleDrawer}
        compactLayout={responsive.isCompact}
        isPhone={responsive.isPhone}
        isPhoneLandscape={responsive.isPhoneLandscape}
        isPhonePortrait={responsive.isPhonePortrait}
        isTablet={responsive.isTablet}
        isTabletLandscape={responsive.isTabletLandscape}
        query={
          props.query as
            | { filter?: string | null; navPublisher?: string | null; navSeries?: string | null }
            | null
        }
        selected={props.selected}
        session={session}
        us={props.us}
      />
    </>
  );
}
