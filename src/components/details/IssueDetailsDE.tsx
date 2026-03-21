"use client";

import React from "react";
import { useNavigationUiContext, useResponsiveContext, useSessionContext } from "../generic/AppContext";
import IssueDetails from "./IssueDetails";
import { IssueDetailsDEBottom } from "./issue-details/de/IssueDetailsDEBottom";
import { IssueDetailsDEDetails } from "./issue-details/de/IssueDetailsDEDetails";
import type { AppRouteContextValue } from "../../app/routeContext";

interface IssueDetailsDEProps {
  routeContext: AppRouteContextValue;
  initialIssue?: unknown;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
}

function IssueDetailsDE(props: Readonly<IssueDetailsDEProps>) {
  const sessionContext = useSessionContext();
  const responsiveContext = useResponsiveContext();
  const navigationUiContext = useNavigationUiContext();
  const contextProps = {
    session: sessionContext.session,
    compactLayout: responsiveContext.compactLayout,
    isPhone: responsiveContext.isPhone,
    isTablet: responsiveContext.isTablet,
    isTabletLandscape: responsiveContext.isTabletLandscape,
    isPhonePortrait: responsiveContext.isPhonePortrait,
    drawerOpen: navigationUiContext.drawerOpen,
    query: props.routeContext.query,
    selected: props.routeContext.selected,
    level: props.routeContext.level,
    us: props.routeContext.us,
  };

  return (
    <IssueDetails
      routeContext={props.routeContext}
      initialIssue={props.initialIssue as any}
      initialPublisherNodes={props.initialPublisherNodes}
      initialSeriesNodesByPublisher={props.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={props.initialIssueNodesBySeriesKey}
      {...contextProps}
      bottom={<IssueDetailsDEBottom {...contextProps} />}
      details={<IssueDetailsDEDetails />}
      subheader
    />
  );
}

export default IssueDetailsDE;
