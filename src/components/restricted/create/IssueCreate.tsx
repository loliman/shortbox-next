import React from "react";
import Layout from "../../Layout";
import { useAppRouteContext } from "../../generic";
import IssueEditor from "../editor/IssueEditor";
import { buildIssueCreateDefaultValues } from "../editor/issue-editor/defaultValues";
function IssueCreate() {
  const { selected, level } = useAppRouteContext();
  const defaultValues = buildIssueCreateDefaultValues(selected as any, level);

  return (
    <Layout>
      <IssueEditor defaultValues={defaultValues} />
    </Layout>
  );
}

export default IssueCreate;
