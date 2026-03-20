"use client";

import React from "react";
import Layout from "../../Layout";
import IssueEditor from "../editor/IssueEditor";
import { buildIssueCreateDefaultValues } from "../editor/issue-editor/defaultValues";
import type { AppRouteContextValue } from "../../../app/routeContext";

interface IssueCreateProps {
  routeContext: AppRouteContextValue;
}

function IssueCreate(props: Readonly<IssueCreateProps>) {
  const defaultValues = buildIssueCreateDefaultValues(
    props.routeContext.selected as any,
    props.routeContext.level
  );

  return (
    <Layout routeContext={props.routeContext}>
      <IssueEditor routeContext={props.routeContext} defaultValues={defaultValues} />
    </Layout>
  );
}

export default IssueCreate;
