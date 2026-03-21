"use client";

import React from "react";
import Layout from "../../Layout";
import QueryResult from "../../generic/QueryResult";
import PublisherEditor from "../editor/PublisherEditor";
import { EditorPagePlaceholder } from "../../placeholders/EditorPagePlaceholder";
import { useResponsiveContext, useSessionContext } from "../../generic/AppContext";
import { useSnackbarBridge } from "../../generic/useSnackbarBridge";
import type { AppRouteContextValue } from "../../../app/routeContext";

interface PublisherEditProps {
  routeContext: AppRouteContextValue;
  initialPublisher?: PublisherEditRecord | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
}

type PublisherEditRecord = Record<string, unknown> & {
  id?: string | number;
};

type PublisherEditorDefaultValues = NonNullable<
  React.ComponentProps<typeof PublisherEditor>["defaultValues"]
>;

function PublisherEdit(props: Readonly<PublisherEditProps>) {
  const sessionContext = useSessionContext();
  const responsiveContext = useResponsiveContext();
  const snackbarBridge = useSnackbarBridge();
  const { selected } = props.routeContext;
  const loading = false;
  const error = null;
  const publisherDetails = props.initialPublisher || null;

  return (
    <Layout
      routeContext={props.routeContext}
      initialPublisherNodes={props.initialPublisherNodes}
      initialSeriesNodesByPublisher={props.initialSeriesNodesByPublisher as Record<string, never[]> | undefined}
    >
      {(() => {
        if (loading || error || !publisherDetails)
          return (
            <QueryResult
              loading={loading}
              error={error}
              data={publisherDetails}
              selected={selected}
              placeholder={<EditorPagePlaceholder />}
              placeholderCount={1}
            />
          );

        const defaultValues = structuredClone(publisherDetails) as PublisherEditorDefaultValues &
          Record<string, unknown>;

        defaultValues.seriesCount = undefined;
        defaultValues.issueCount = undefined;
        defaultValues.active = undefined;
        defaultValues["lastEdited"] = undefined;

        return (
          <PublisherEditor
            edit
            id={publisherDetails.id}
            defaultValues={defaultValues}
            session={sessionContext.session}
            isDesktop={responsiveContext.isDesktop}
            enqueueSnackbar={snackbarBridge.enqueueSnackbar}
          />
        );
      })()}
    </Layout>
  );
}
export default PublisherEdit;
