"use client";

import React from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import QueryResult from "../../generic/QueryResult";
import SeriesEditor from "../editor/SeriesEditor";
import { EditorPagePlaceholder } from "../../placeholders/EditorPagePlaceholder";
import { useSnackbarBridge } from "../../generic/useSnackbarBridge";
import type { SessionData } from "../../../app/session";
import { useInitialResponsiveGuess } from "../../../app/responsiveGuessContext";
import type { LayoutRouteData, RouteQuery } from "../../../types/route-ui";
import type { SelectedRoot } from "../../../types/domain";

interface SeriesEditProps {
  selected: SelectedRoot;
  level: LayoutRouteData["level"];
  us: boolean;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
  initialSeries?: SeriesEditRecord | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
  session?: SessionData | null;
}

type SeriesEditRecord = Record<string, unknown> & {
  id?: string | number;
};

type SeriesEditorDefaultValues = NonNullable<
  React.ComponentProps<typeof SeriesEditor>["defaultValues"]
>;

function SeriesEdit(props: Readonly<SeriesEditProps>) {
  const theme = useTheme();
  const initialGuess = useInitialResponsiveGuess();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"), {
    defaultMatches: initialGuess?.isDesktop ?? true,
  });
  const snackbarBridge = useSnackbarBridge();
  const selected = props.selected;
  const loading = false;
  const error = null;
  const seriesDetails = props.initialSeries || null;

  return (
    (() => {
      if (loading || error || !seriesDetails)
        return (
          <QueryResult
            loading={loading}
            error={error}
            data={seriesDetails}
            selected={selected}
            placeholder={<EditorPagePlaceholder />}
            placeholderCount={1}
          />
        );

      const defaultValues = structuredClone(seriesDetails) as SeriesEditorDefaultValues &
        Record<string, unknown>;

      defaultValues.issueCount = undefined;
      defaultValues.active = undefined;
      defaultValues["lastEdited"] = undefined;

      return (
        <SeriesEditor
          edit
          id={seriesDetails.id}
          defaultValues={defaultValues}
          session={props.session}
          isDesktop={isDesktop}
          enqueueSnackbar={snackbarBridge.enqueueSnackbar}
        />
      );
    })()
  );
}

export default SeriesEdit;
