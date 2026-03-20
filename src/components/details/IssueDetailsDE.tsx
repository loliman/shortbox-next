import React from "react";
import { AppContext } from "../generic/AppContext";
import { useAppRouteContext } from "../generic";
import IssueDetails from "./IssueDetails";
import { IssueDetailsDEBottom } from "./issue-details/de/IssueDetailsDEBottom";
import { IssueDetailsDEDetails } from "./issue-details/de/IssueDetailsDEDetails";

function IssueDetailsDE() {
  const appContext = React.useContext(AppContext);
  const routeContext = useAppRouteContext();
  const contextProps = { ...appContext, ...routeContext };

  return (
    <IssueDetails
      {...contextProps}
      bottom={<IssueDetailsDEBottom {...contextProps} />}
      details={<IssueDetailsDEDetails />}
      subheader
    />
  );
}

export default IssueDetailsDE;
