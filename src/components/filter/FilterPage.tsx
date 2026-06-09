"use client";

import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Link from "next/link";
import { parseFilterValues } from "./defaults";
import FilterFormClient from "./FilterFormClient";
import type { FilterPageProps } from "./types";
import { buildRouteHref } from "../generic/routeHref";
import { generateSeoUrl } from "../../lib/routes/hierarchy";
import FormPageShell from "../form-shell/FormPageShell";

const FILTER_TABS = [
  { label: "Erscheinung", value: 0 },
  { label: "Inhalt", value: 1 },
  { label: "Mitwirkende", value: 2 },
  { label: "Sammlung", value: 3, requireSession: true },
] as const;

function normalizeFilterTab(rawTab: string | undefined, hasSession: boolean): number {
  const numericTab = Number(rawTab ?? "0");
  const maxTab = hasSession ? 3 : 2;
  return Number.isInteger(numericTab) && numericTab >= 0 && numericTab <= maxTab ? numericTab : 0;
}

export default function FilterPage(props: Readonly<FilterPageProps>) {
  const query = props.query as { filter?: string; from?: string; tab?: string } | null | undefined;
  const initialValues = parseFilterValues(query?.filter);
  const from = typeof query?.from === "string" ? query.from.trim() : "";
  const targetPath = from || generateSeoUrl(props.selected, props.us);
  const hasSession = Boolean(props.hasSession);
  const activeTab = normalizeFilterTab(typeof query?.tab === "string" ? query.tab : undefined, hasSession);
  const visibleTabs = FILTER_TABS.filter((tab) => !("requireSession" in tab) || hasSession);

  return (
    <FormPageShell
      title="Filter"
      headerCenter={
        <Tabs value={activeTab} variant="fullWidth">
          {visibleTabs.map((tab) => (
            <Tab
              key={tab.value}
              component={Link}
              href={buildRouteHref(`/${props.us ? "filter/us" : "filter/de"}`, query, {
                from: from || null,
                tab: String(tab.value),
              })}
              label={tab.label}
              value={tab.value}
            />
          ))}
        </Tabs>
      }
    >
      <FilterFormClient
        us={props.us}
        query={props.query}
        selected={props.selected}
        hasSession={Boolean(props.hasSession)}
        activeTab={activeTab}
        initialValues={initialValues}
        targetPath={targetPath}
      />
    </FormPageShell>
  );
}
