"use client";

import React from "react";
import IssueEditor from "../editor/IssueEditor";
import { buildIssueCreateDefaultValues } from "../editor/issue-editor/defaultValues";
import { useSnackbarBridge } from "../../generic/useSnackbarBridge";
import type { SessionData } from "../../../app/session";
import { useResponsive } from "../../../app/useResponsive";
import type { LayoutRouteData, RouteQuery } from "../../../types/route-ui";
import type { SelectedRoot } from "../../../types/domain";

interface IssueCreateProps {
  selected: SelectedRoot;
  level: LayoutRouteData["level"];
  us: boolean;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
  session?: SessionData | null;
}

function IssueCreate(props: Readonly<IssueCreateProps>) {
  const responsive = useResponsive();
  const snackbarBridge = useSnackbarBridge();
  const defaultValues = buildIssueCreateDefaultValues(
    props.selected as any,
    props.level
  );

  return (
    <IssueEditor
      defaultValues={defaultValues}
      session={props.session}
      isDesktop={responsive.isDesktop}
      selected={props.selected}
      enqueueSnackbar={snackbarBridge.enqueueSnackbar}
    />
  );
}

export default IssueCreate;
