import React from "react";
import Layout from "../../Layout";
import { useQuery } from "@apollo/client";
import { editPublisher } from "../../../graphql/mutationsTyped";
import { publisher } from "../../../graphql/queriesTyped";
import { useAppRouteContext } from "../../generic";
import QueryResult from "../../generic/QueryResult";
import PublisherEditor from "../editor/PublisherEditor";
import { EditorPagePlaceholder } from "../../placeholders/EditorPagePlaceholder";

function PublisherEdit() {
  const { selected } = useAppRouteContext();
  const { loading, error, data } = useQuery(publisher, {
    variables: selected as any,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });

  return (
    <Layout>
      {(() => {
        if (loading || error || !data || !data.publisherDetails)
          return (
            <QueryResult
              loading={loading}
              error={error}
              data={data ? data.publisherDetails : null}
              selected={selected}
              placeholder={<EditorPagePlaceholder />}
              placeholderCount={1}
            />
          );

        let defaultValues = structuredClone(data.publisherDetails) as Record<string, unknown>;

        defaultValues.seriesCount = undefined;
        defaultValues.issueCount = undefined;
        defaultValues.active = undefined;
        defaultValues["lastEdited"] = undefined;

        return (
          <PublisherEditor
            edit
            id={data.publisherDetails.id}
            mutation={editPublisher}
            defaultValues={defaultValues}
          />
        );
      })()}
    </Layout>
  );
}
export default PublisherEdit;
