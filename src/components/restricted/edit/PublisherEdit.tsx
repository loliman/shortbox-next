"use client";

import React from "react";
import QueryResult from "../../generic/QueryResult";
import PublisherEditor from "../editor/PublisherEditor";
import { EditorPagePlaceholder } from "../../placeholders/EditorPagePlaceholder";
import { useSnackbarBridge } from "../../generic/useSnackbarBridge";
import type { SessionData } from "../../../app/session";
import { useResponsive } from "../../../app/useResponsive";
import type { LayoutRouteData, RouteQuery } from "../../../types/route-ui";
import type { SelectedRoot } from "../../../types/domain";

interface PublisherEditProps {
  selected: SelectedRoot;
  level: LayoutRouteData["level"];
  us: boolean;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
  initialPublisher?: PublisherEditRecord | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  session?: SessionData | null;
}

type PublisherEditRecord = Record<string, unknown> & {
  id?: string | number;
};

type PublisherEditorDefaultValues = NonNullable<
  React.ComponentProps<typeof PublisherEditor>["defaultValues"]
>;

function PublisherEdit(props: Readonly<PublisherEditProps>) {
  const responsive = useResponsive();
  const snackbarBridge = useSnackbarBridge();
  const selected = props.selected;
  const loading = false;
  const error = null;
  const publisherDetails = props.initialPublisher || null;

  return (
    (() => {
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
          session={props.session}
          isDesktop={responsive.isDesktop}
          enqueueSnackbar={snackbarBridge.enqueueSnackbar}
        />
      );
    })()
  );
}
export default PublisherEdit;
