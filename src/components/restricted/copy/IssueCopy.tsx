"use client";

import React from "react";
import QueryResult from "../../generic/QueryResult";
import IssueEditor from "../editor/IssueEditor";
import { mapIssueToEditorDefaultValues } from "../editor/issue-editor/defaultValues";
import { EditorPagePlaceholder } from "../../placeholders/EditorPagePlaceholder";
import { useSnackbarBridge } from "../../generic/useSnackbarBridge";
import type { SessionData } from "../../../app/session";
import { useResponsive } from "../../../app/useResponsive";
import type { LayoutRouteData, RouteQuery } from "../../../types/route-ui";
import type { SelectedRoot } from "../../../types/domain";

interface IssueCopyProps {
  selected: SelectedRoot;
  level: LayoutRouteData["level"];
  us: boolean;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
  initialIssue?: Record<string, unknown> | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
  session?: SessionData | null;
}

function IssueCopy(props: Readonly<IssueCopyProps>) {
  const responsive = useResponsive();
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

      const defaultValues = mapIssueToEditorDefaultValues(issueDetails as any, true);

      return (
        <IssueEditor
          copy
          defaultValues={defaultValues}
          session={props.session}
          isDesktop={responsive.isDesktop}
          selected={selected}
          enqueueSnackbar={snackbarBridge.enqueueSnackbar}
        />
      );
    })()
  );
}

export default IssueCopy;
