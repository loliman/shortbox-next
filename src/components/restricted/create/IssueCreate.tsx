"use client";

import React from "react";
import Layout from "../../Layout";
import IssueEditor from "../editor/IssueEditor";
import { buildIssueCreateDefaultValues } from "../editor/issue-editor/defaultValues";
import { useResponsiveContext, useSessionContext } from "../../generic/AppContext";
import { useSnackbarBridge } from "../../generic/useSnackbarBridge";
import type { AppRouteContextValue } from "../../../app/routeContext";

interface IssueCreateProps {
  routeContext: AppRouteContextValue;
}

function IssueCreate(props: Readonly<IssueCreateProps>) {
  const sessionContext = useSessionContext();
  const responsiveContext = useResponsiveContext();
  const snackbarBridge = useSnackbarBridge();
  const defaultValues = buildIssueCreateDefaultValues(
    props.routeContext.selected as any,
    props.routeContext.level
  );

  return (
    <Layout routeContext={props.routeContext}>
      <IssueEditor
        routeContext={props.routeContext}
        defaultValues={defaultValues}
        session={sessionContext.session}
        isDesktop={responsiveContext.isDesktop}
        selected={props.routeContext.selected}
        enqueueSnackbar={snackbarBridge.enqueueSnackbar}
      />
    </Layout>
  );
}

export default IssueCreate;
