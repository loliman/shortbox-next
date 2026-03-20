"use client";

import React from "react";
import Layout from "../../Layout";
import SeriesEditor from "../editor/SeriesEditor";
import type { AppRouteContextValue } from "../../../app/routeContext";

function SeriesCreate(props: Readonly<{ routeContext: AppRouteContextValue }>) {
  return (
    <Layout routeContext={props.routeContext}>
      <SeriesEditor />
    </Layout>
  );
}

export default SeriesCreate;
