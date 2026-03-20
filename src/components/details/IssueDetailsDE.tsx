"use client";

import React from "react";
import { AppContext } from "../generic/AppContext";
import IssueDetails from "./IssueDetails";
import { IssueDetailsDEBottom } from "./issue-details/de/IssueDetailsDEBottom";
import { IssueDetailsDEDetails } from "./issue-details/de/IssueDetailsDEDetails";
import type { AppRouteContextValue } from "../../app/routeContext";

interface IssueDetailsDEProps {
  routeContext: AppRouteContextValue;
}

function IssueDetailsDE(props: Readonly<IssueDetailsDEProps>) {
  const appContext = React.useContext(AppContext);
  const contextProps = { ...appContext, ...props.routeContext };

  return (
    <IssueDetails
      routeContext={props.routeContext}
      {...contextProps}
      bottom={<IssueDetailsDEBottom {...contextProps} />}
      details={<IssueDetailsDEDetails />}
      subheader
    />
  );
}

export default IssueDetailsDE;
