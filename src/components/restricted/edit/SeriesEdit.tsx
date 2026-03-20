import React from "react";
import Layout from "../../Layout";
import { useQuery } from "@apollo/client";
import { editSeries } from "../../../graphql/mutationsTyped";
import { seriesd } from "../../../graphql/queriesTyped";
import { useAppRouteContext } from "../../generic";
import QueryResult from "../../generic/QueryResult";
import SeriesEditor from "../editor/SeriesEditor";
import { EditorPagePlaceholder } from "../../placeholders/EditorPagePlaceholder";

function SeriesEdit() {
  const { selected } = useAppRouteContext();
  const { loading, error, data } = useQuery(seriesd, {
    variables: selected as any,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });

  return (
    <Layout>
      {(() => {
        if (loading || error || !data || !data.seriesDetails)
          return (
            <QueryResult
              loading={loading}
              error={error}
              data={data ? data.seriesDetails : null}
              selected={selected}
              placeholder={<EditorPagePlaceholder />}
              placeholderCount={1}
            />
          );

        let defaultValues = structuredClone(data.seriesDetails) as Record<string, unknown>;

        defaultValues.issueCount = undefined;
        defaultValues.active = undefined;
        defaultValues["lastEdited"] = undefined;

        return (
          <SeriesEditor
            edit
            id={data.seriesDetails.id}
            mutation={editSeries}
            defaultValues={defaultValues}
          />
        );
      })()}
    </Layout>
  );
}

export default SeriesEdit;
