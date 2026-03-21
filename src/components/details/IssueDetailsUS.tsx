"use client";

import React from "react";
import { useNavigationUiContext, useResponsiveContext, useSessionContext } from "../generic/AppContext";
import IssueDetails from "./IssueDetails";
import { IssueDetailsUSBottom } from "./issue-details/us/IssueDetailsUSBottom";
import { IssueDetailsUSDetails } from "./issue-details/us/IssueDetailsUSDetails";
import type { AppRouteContextValue } from "../../app/routeContext";

interface IssueDetailsUSProps {
  routeContext: AppRouteContextValue;
  initialIssue?: unknown;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
}

function IssueDetailsUS(props: Readonly<IssueDetailsUSProps>) {
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
      bottom={<IssueDetailsUSBottom {...contextProps} />}
      details={<IssueDetailsUSDetails />}
      subheader
    />
  );
}

export default IssueDetailsUS;
