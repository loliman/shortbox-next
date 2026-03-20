import React from "react";
import Layout from "../../Layout";
import { useQuery } from "@apollo/client";
import { createIssue } from "../../../graphql/mutationsTyped";
import { issue } from "../../../graphql/queriesTyped";
import { useAppRouteContext } from "../../generic";
import QueryResult from "../../generic/QueryResult";
import IssueEditor from "../editor/IssueEditor";
import { mapIssueToEditorDefaultValues } from "../editor/issue-editor/defaultValues";
import { EditorPagePlaceholder } from "../../placeholders/EditorPagePlaceholder";

function IssueCopy() {
  const { selected } = useAppRouteContext();
  const variables = { ...selected, edit: true };
  const { loading, error, data } = useQuery(issue, { variables: variables as any });

  return (
    <Layout>
      {(() => {
        if (loading || error || !data || !data.issueDetails)
          return (
            <QueryResult
              loading={loading}
              error={error}
              data={data ? data.issueDetails : null}
              selected={selected}
              placeholder={<EditorPagePlaceholder />}
              placeholderCount={1}
            />
          );

        const defaultValues = mapIssueToEditorDefaultValues(data.issueDetails, true);

        return <IssueEditor copy mutation={createIssue} defaultValues={defaultValues} />;
      })()}
    </Layout>
  );
}

export default IssueCopy;
