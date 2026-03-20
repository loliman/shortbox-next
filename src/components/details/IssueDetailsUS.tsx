"use client";

import React from "react";
import { AppContext } from "../generic/AppContext";
import { useAppRouteContext } from "../generic";
import IssueDetails from "./IssueDetails";
import { IssueDetailsUSBottom } from "./issue-details/us/IssueDetailsUSBottom";
import { IssueDetailsUSDetails } from "./issue-details/us/IssueDetailsUSDetails";

function IssueDetailsUS() {
  const appContext = React.useContext(AppContext);
  const routeContext = useAppRouteContext();
  const contextProps = { ...appContext, ...routeContext };

  return (
    <IssueDetails
      {...contextProps}
      bottom={<IssueDetailsUSBottom {...contextProps} />}
      details={<IssueDetailsUSDetails />}
      subheader
    />
  );
}

export default IssueDetailsUS;
