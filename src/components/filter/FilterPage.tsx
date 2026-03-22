import CardHeader from "@mui/material/CardHeader";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Link from "next/link";
import { parseFilterValues } from "./defaults";
import FilterFormClient from "./FilterFormClient";
import type { FilterPageProps } from "./types";
import { buildRouteHref } from "../generic/routeHref";
import { generateUrl } from "../../util/hierarchy";

const FILTER_TABS = [
  { label: "Erscheinung", value: 0 },
  { label: "Inhalt", value: 1 },
  { label: "Mitwirkende", value: 2 },
] as const;

function normalizeFilterTab(rawTab: string | undefined): number {
  const numericTab = Number(rawTab ?? "0");
  return Number.isInteger(numericTab) && numericTab >= 0 && numericTab <= 2 ? numericTab : 0;
}

export default function FilterPage(props: Readonly<FilterPageProps>) {
  const query = props.query as { filter?: string; from?: string; tab?: string } | null | undefined;
  const initialValues = parseFilterValues(query?.filter);
  const from = typeof query?.from === "string" ? query.from.trim() : "";
  const targetPath = from || generateUrl(props.selected, props.us);
  const activeTab = normalizeFilterTab(typeof query?.tab === "string" ? query.tab : undefined);

  return (
    <Stack spacing={2.25}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: (theme) => theme.shadows[1],
          backgroundColor: "background.paper",
        }}
      >
        <CardHeader title="Filter" />
        <Tabs
          value={activeTab}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ px: { xs: 1.25, sm: 1.75 } }}
        >
          {FILTER_TABS.map((tab) => (
            <Tab
              key={tab.value}
              component={Link}
              href={buildRouteHref(`/${props.us ? "filter/us" : "filter/de"}`, query, {
                tab: String(tab.value),
              })}
              label={tab.label}
              value={tab.value}
            />
          ))}
        </Tabs>
      </Paper>

      <FilterFormClient
        us={props.us}
        query={props.query}
        selected={props.selected}
        hasSession={Boolean(props.hasSession)}
        activeTab={activeTab}
        initialValues={initialValues}
        targetPath={targetPath}
      />
    </Stack>
  );
}
