"use client";

import React from "react";
import { AppContext } from "../generic/AppContext";
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
  const appContext = React.useContext(AppContext);
  const contextProps = { ...appContext, ...props.routeContext };

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
