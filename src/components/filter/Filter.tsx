"use client";

import React from "react";
import { AppContext } from "../generic/AppContext";
import FilterPage from "./FilterPage";
import type { AppRouteContextValue } from "../../app/routeContext";

interface FilterProps {
  routeContext: AppRouteContextValue;
}

export default function Filter(props: Readonly<FilterProps>) {
  const appContext = React.useContext(AppContext);

  return <FilterPage {...appContext} {...props.routeContext} routeContext={props.routeContext} />;
}
