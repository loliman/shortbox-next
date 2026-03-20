import React from "react";
import Layout from "../../Layout";
import PublisherEditor from "../editor/PublisherEditor";
import type { AppRouteContextValue } from "../../../app/routeContext";

function PublisherCreate(props: Readonly<{ routeContext: AppRouteContextValue }>) {
  return (
    <Layout routeContext={props.routeContext}>
      <PublisherEditor />
    </Layout>
  );
}

export default PublisherCreate;
