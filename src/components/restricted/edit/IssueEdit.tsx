"use client";

import React from "react";
import Layout from "../../Layout";
import QueryResult from "../../generic/QueryResult";
import IssueEditor from "../editor/IssueEditor";
import { mapIssueToEditorDefaultValues } from "../editor/issue-editor/defaultValues";
import { EditorPagePlaceholder } from "../../placeholders/EditorPagePlaceholder";
import { useResponsiveContext, useSessionContext } from "../../generic/AppContext";
import { useSnackbarBridge } from "../../generic/useSnackbarBridge";
import type { AppRouteContextValue } from "../../../app/routeContext";

interface IssueEditProps {
  routeContext: AppRouteContextValue;
  initialIssue?: IssueEditRecord | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
}

type IssueEditRecord = Record<string, unknown> & {
  id?: string | number | null;
};

function IssueEdit(props: Readonly<IssueEditProps>) {
  const sessionContext = useSessionContext();
  const responsiveContext = useResponsiveContext();
  const snackbarBridge = useSnackbarBridge();
  const { selected } = props.routeContext;
  const loading = false;
  const error = null;
  const issueDetails = props.initialIssue || null;

  return (
    <Layout
      routeContext={props.routeContext}
      initialPublisherNodes={props.initialPublisherNodes}
      initialSeriesNodesByPublisher={props.initialSeriesNodesByPublisher as Record<string, never[]> | undefined}
      initialIssueNodesBySeriesKey={props.initialIssueNodesBySeriesKey as Record<string, never[]> | undefined}
    >
      {(() => {
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

        return (
          <IssueEditor
            routeContext={props.routeContext}
            id={issueDetails.id ?? undefined}
            edit
            defaultValues={defaultValues}
            session={sessionContext.session}
            isDesktop={responsiveContext.isDesktop}
            selected={selected}
            enqueueSnackbar={snackbarBridge.enqueueSnackbar}
          />
        );
      })()}
    </Layout>
  );
}

export default IssueEdit;
