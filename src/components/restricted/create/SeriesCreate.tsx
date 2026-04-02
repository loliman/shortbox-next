"use client";

import React from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import SeriesEditor from "../editor/SeriesEditor";
import { useSnackbarBridge } from "../../generic/useSnackbarBridge";
import type { SessionData } from "../../../types/session";
import { useInitialResponsiveGuess } from "../../../app/responsiveGuessContext";
import type { LayoutRouteData, RouteQuery } from "../../../types/route-ui";
import type { SelectedRoot } from "../../../types/domain";

function SeriesCreate(props: Readonly<{
  selected: SelectedRoot;
  level: LayoutRouteData["level"];
  us: boolean;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
  session?: SessionData | null;
}>) {
  const theme = useTheme();
  const initialGuess = useInitialResponsiveGuess();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"), {
    defaultMatches: initialGuess?.isDesktop ?? true,
  });
  const snackbarBridge = useSnackbarBridge();
  return (
    <SeriesEditor
      session={props.session}
      isDesktop={isDesktop}
      enqueueSnackbar={snackbarBridge.enqueueSnackbar}
    />
  );
}

export default SeriesCreate;
