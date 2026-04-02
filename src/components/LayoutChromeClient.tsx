"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { IssueNode, PublisherNode, SeriesNode } from "./nav-bar/listTreeUtils";
import type { SessionData } from "../types/session";
import { useInitialResponsiveGuess } from "../app/responsiveGuessContext";
import type { LayoutRouteData, RouteQuery } from "../types/route-ui";
import TopBar from "./top-bar/TopBar";
import NavDrawer from "./nav-bar/NavDrawer";
import NavLoadingPlaceholder from "./nav-bar/NavLoadingPlaceholder";
import { useThemeModeContext } from "./generic/AppContext";
import { useSnackbarBridge } from "./generic/useSnackbarBridge";
import { useLayoutChromeState } from "./useLayoutChromeState";

const DeferredNavList = dynamic(() => import("./nav-bar/List"), {
  ssr: false,
  loading: () => <NavListLoadingFallback />,
});

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
  previewImportActive?: boolean;
  navigationLoading?: boolean;
}

export default function LayoutChromeClient(props: Readonly<LayoutChromeClientProps>) {
  const showNavigation = props.showNavigation ?? true;
  const navigationInstanceKey = [
    props.us,
    String(props.query?.filter || ""),
    String(props.query?.routeFilterKind || ""),
    String(props.query?.routeFilterSlug || ""),
    getSelectedPathKey(props.selected),
  ].join("|");
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
  const navPayloadReady = !props.navigationLoading && Boolean(props.initialPublisherNodes);

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
        previewImportActive={props.previewImportActive ?? false}
      />

      {showNavigation ? (
        navPayloadReady ? (
          <DeferredNavList
            key={navigationInstanceKey}
            initialPublisherNodes={props.initialPublisherNodes}
            initialSeriesNodesByPublisher={props.initialSeriesNodesByPublisher}
            initialIssueNodesBySeriesKey={props.initialIssueNodesBySeriesKey}
            drawerOpen={chromeState.drawerOpen}
            toggleDrawer={chromeState.toggleDrawer}
            temporaryDrawer={temporaryDrawer}
            phonePortrait={isPhonePortrait}
            query={
              props.query as
                | {
                    filter?: string | null;
                    routeFilterKind?: string | null;
                    routeFilterSlug?: string | null;
                    navOpen?: string | null;
                    navPublisher?: string | null;
                    navSeries?: string | null;
                  }
                | null
            }
            selected={props.selected}
            session={session}
            us={props.us}
            loading={props.navigationLoading}
          />
        ) : (
          <NavListLoadingFallback />
        )
      ) : null}
    </>
  );
}

function getSelectedPathKey(selected: LayoutRouteData["selected"]) {
  if (selected.issue) {
    return [
      "issue",
      selected.issue.series.publisher.name || "",
      selected.issue.series.title || "",
      selected.issue.series.volume || "",
      selected.issue.series.startyear || "",
      selected.issue.number || "",
      selected.issue.format || "",
      selected.issue.variant || "",
    ].join("|");
  }

  if (selected.series) {
    return [
      "series",
      selected.series.publisher.name || "",
      selected.series.title || "",
      selected.series.volume || "",
      selected.series.startyear || "",
    ].join("|");
  }

  if (selected.publisher) {
    return ["publisher", selected.publisher.name || ""].join("|");
  }

  return "root";
}

function NavListLoadingFallback() {
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
  const temporaryDrawer = isPhone || (isTablet && !isLandscape);
  const listRef = React.useRef<HTMLUListElement | null>(null);
  const navScrollContainerRef = React.useRef<HTMLDivElement | null>(null);

  if (temporaryDrawer) return null;

  return (
    <NavDrawer
      temporary={temporaryDrawer}
      drawerOpen={!temporaryDrawer}
      navStateKey="nav-loading"
      navScrollContainerRef={navScrollContainerRef}
      listRef={listRef}
      disableScrollToSelected={true}
    >
      <NavLoadingPlaceholder compact />
    </NavDrawer>
  );
}
