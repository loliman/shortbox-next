"use client";

import React from "react";
import Layout from "../../Layout";
import QueryResult from "../../generic/QueryResult";
import IssueEditor from "../editor/IssueEditor";
import { mapIssueToEditorDefaultValues } from "../editor/issue-editor/defaultValues";
import { EditorPagePlaceholder } from "../../placeholders/EditorPagePlaceholder";
import type { AppRouteContextValue } from "../../../app/routeContext";

interface IssueCopyProps {
  routeContext: AppRouteContextValue;
  initialIssue?: Record<string, unknown> | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
}

function IssueCopy(props: Readonly<IssueCopyProps>) {
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

        const defaultValues = mapIssueToEditorDefaultValues(issueDetails as any, true);

        return <IssueEditor routeContext={props.routeContext} copy defaultValues={defaultValues} />;
      })()}
    </Layout>
  );
}

export default IssueCopy;
