"use client";

import React from "react";
import { parseFilterValues } from "./defaults";
import FilterFormClient from "./FilterFormClient";
import type { FilterPageProps } from "./types";
import { generateSeoUrl } from "../../lib/routes/hierarchy";
import FormPageShell from "../form-shell/FormPageShell";

export default function FilterPage(props: Readonly<FilterPageProps>) {
  const query = props.query as { filter?: string; from?: string } | null | undefined;
  const initialValues = parseFilterValues(query?.filter);
  const from = typeof query?.from === "string" ? query.from.trim() : "";
  const targetPath = from || generateSeoUrl(props.selected, props.us);
  const hasSession = Boolean(props.hasSession);

  return (
    <FormPageShell title="Filter">
      <FilterFormClient
        us={props.us}
        query={props.query}
        selected={props.selected}
        hasSession={hasSession}
        initialValues={initialValues}
        targetPath={targetPath}
      />
    </FormPageShell>
  );
}
