"use client";

import React from "react";
import { AppContext } from "../generic/AppContext";
import { useAppRouteContext } from "../generic";
import FilterPage from "./FilterPage";

export default function Filter() {
  const appContext = React.useContext(AppContext);
  const routeContext = useAppRouteContext();

  return <FilterPage {...appContext} {...routeContext} />;
}
