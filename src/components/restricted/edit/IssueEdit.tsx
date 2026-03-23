"use client";

import React from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import QueryResult from "../../generic/QueryResult";
import IssueEditor from "../editor/IssueEditor";
import { mapIssueToEditorDefaultValues } from "../editor/issue-editor/defaultValues";
import { EditorPagePlaceholder } from "../../placeholders/EditorPagePlaceholder";
import { useSnackbarBridge } from "../../generic/useSnackbarBridge";
import type { SessionData } from "../../../app/session";
import { useInitialResponsiveGuess } from "../../../app/responsiveGuessContext";
import type { LayoutRouteData, RouteQuery } from "../../../types/route-ui";
import type { SelectedRoot } from "../../../types/domain";

interface IssueEditProps {
  selected: SelectedRoot;
  level: LayoutRouteData["level"];
  us: boolean;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
  initialIssue?: IssueEditRecord | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
  session?: SessionData | null;
}

type IssueEditRecord = Record<string, unknown> & {
  id?: string | number | null;
};

function IssueEdit(props: Readonly<IssueEditProps>) {
  const theme = useTheme();
  const initialGuess = useInitialResponsiveGuess();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"), {
    defaultMatches: initialGuess?.isDesktop ?? true,
  });
  const snackbarBridge = useSnackbarBridge();
  const selected = props.selected;
  const loading = false;
  const error = null;
  const issueDetails = props.initialIssue || null;

  return (
    (() => {
      if (loading || error || !issueDetails)
        return (
          <QueryResult
            loading={loading}
            error={error}
            data={issueDetails}
            selected={selected}
            placeholder={<EditorPagePlaceholder />}
            placeholderCount={1}
          />
        );

      const defaultValues = mapIssueToEditorDefaultValues(issueDetails as any, false);
      const lockedFields = issueDetails.inheritsStories
        ? {
            title: true,
            stories: true,
          }
        : undefined;

      return (
        <IssueEditor
          id={issueDetails.id ?? undefined}
          edit
          defaultValues={defaultValues}
          lockedFields={lockedFields}
          session={props.session}
          isDesktop={isDesktop}
          selected={selected}
          enqueueSnackbar={snackbarBridge.enqueueSnackbar}
        />
      );
    })()
  );
}

export default IssueEdit;
