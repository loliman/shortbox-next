"use client";

import React from "react";
import Layout from "../../Layout";
import QueryResult from "../../generic/QueryResult";
import SeriesEditor from "../editor/SeriesEditor";
import { EditorPagePlaceholder } from "../../placeholders/EditorPagePlaceholder";
import type { AppRouteContextValue } from "../../../app/routeContext";

interface SeriesEditProps {
  routeContext: AppRouteContextValue;
  initialSeries?: SeriesEditRecord | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
}

type SeriesEditRecord = Record<string, unknown> & {
  id?: string | number;
};

type SeriesEditorDefaultValues = NonNullable<
  React.ComponentProps<typeof SeriesEditor>["defaultValues"]
>;

function SeriesEdit(props: Readonly<SeriesEditProps>) {
  const { selected } = props.routeContext;
  const loading = false;
  const error = null;
  const seriesDetails = props.initialSeries || null;

  return (
    <Layout
      routeContext={props.routeContext}
      initialPublisherNodes={props.initialPublisherNodes}
      initialSeriesNodesByPublisher={props.initialSeriesNodesByPublisher as Record<string, never[]> | undefined}
      initialIssueNodesBySeriesKey={props.initialIssueNodesBySeriesKey as Record<string, never[]> | undefined}
    >
      {(() => {
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
          />
        );
      })()}
    </Layout>
  );
}

export default SeriesEdit;
