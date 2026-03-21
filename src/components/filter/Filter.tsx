"use client";

import React from "react";
import { useResponsiveContext, useSessionContext } from "../generic/AppContext";
import FilterPage from "./FilterPage";
import type { AppRouteContextValue } from "../../app/routeContext";

interface FilterProps {
  routeContext: AppRouteContextValue;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
}

export default function Filter(props: Readonly<FilterProps>) {
  const sessionContext = useSessionContext();
  const responsiveContext = useResponsiveContext();
  const us = Boolean(props.routeContext.us);
  const query = props.routeContext.query as { filter?: string } | null;
  const session = sessionContext.session;
  const isDesktop = responsiveContext.isDesktop;

  return (
    <FilterPage
      routeContext={props.routeContext}
      us={us}
      query={query}
      session={session}
      isDesktop={isDesktop}
      initialPublisherNodes={props.initialPublisherNodes}
    />
  );
}
