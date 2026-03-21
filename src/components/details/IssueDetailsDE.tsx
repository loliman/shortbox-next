"use client";

import React from "react";
import { AppContext } from "../generic/AppContext";
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
      bottom={<IssueDetailsDEBottom {...contextProps} />}
      details={<IssueDetailsDEDetails />}
      subheader
    />
  );
}

export default IssueDetailsDE;
