import React from "react";
import Layout from "../../Layout";
import { createPublisher } from "../../../graphql/mutationsTyped";
import PublisherEditor from "../editor/PublisherEditor";

function PublisherCreate() {
  return (
    <Layout>
      <PublisherEditor mutation={createPublisher} />
    </Layout>
  );
}

export default PublisherCreate;
