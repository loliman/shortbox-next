"use client";

import React from "react";
import PublisherEditor from "../editor/PublisherEditor";
import { useSnackbarBridge } from "../../generic/useSnackbarBridge";
import type { SessionData } from "../../../app/session";
import { useResponsive } from "../../../app/useResponsive";
import type { LayoutRouteData, RouteQuery } from "../../../types/route-ui";
import type { SelectedRoot } from "../../../types/domain";

function PublisherCreate(props: Readonly<{
  selected: SelectedRoot;
  level: LayoutRouteData["level"];
  us: boolean;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
  session?: SessionData | null;
}>) {
  const responsive = useResponsive();
  const snackbarBridge = useSnackbarBridge();
  return (
    <PublisherEditor
      session={props.session}
      isDesktop={responsive.isDesktop}
      enqueueSnackbar={snackbarBridge.enqueueSnackbar}
    />
  );
}

export default PublisherCreate;
