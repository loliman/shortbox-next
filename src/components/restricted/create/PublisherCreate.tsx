"use client";

import React from "react";
import Layout from "../../Layout";
import PublisherEditor from "../editor/PublisherEditor";
import { useResponsiveContext, useSessionContext } from "../../generic/AppContext";
import { useSnackbarBridge } from "../../generic/useSnackbarBridge";
import type { AppRouteContextValue } from "../../../app/routeContext";

function PublisherCreate(props: Readonly<{ routeContext: AppRouteContextValue }>) {
  const sessionContext = useSessionContext();
  const responsiveContext = useResponsiveContext();
  const snackbarBridge = useSnackbarBridge();
  return (
    <Layout routeContext={props.routeContext}>
      <PublisherEditor
        session={sessionContext.session}
        isDesktop={responsiveContext.isDesktop}
        enqueueSnackbar={snackbarBridge.enqueueSnackbar}
      />
    </Layout>
  );
}

export default PublisherCreate;
