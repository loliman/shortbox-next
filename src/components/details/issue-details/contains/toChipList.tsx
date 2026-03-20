import React from "react";
import { useRouter } from "next/navigation";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import { buildRouteHref } from "../../../generic/routeHref";

type ChipNavigationProps = {
  us?: boolean;
};

type ChipItem = {
  __typename?: string;
  name?: string;
  title?: string;
  type?: string;
};

export function toChipList(
  items: ChipItem[] | null | undefined,
  props: ChipNavigationProps,
  type: string
) {
  const router = useRouter();
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) {
    return <Chip key={0} variant="outlined" label="Unbekannt" />;
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {safeItems.map((item, idx) => {
        const typename = item.__typename || "Individual";
        const filterType = typename.toLowerCase() + "s";
        const filter: Record<string, unknown> = {
          us: props.us,
          [filterType]: [],
        };
        const label = item.name || item.title || "Unbekannt";

        if (typename === "Appearance") {
          filter[filterType] = [{ name: item.name || "" }];
        } else if (typename === "Arc") {
          filter[filterType] = [{ title: item.title || item.name || "" }];
        } else {
          const typed = { name: item.name || "", type };
          (filter[filterType] as Array<{ name: string; type: string }>).push(typed);
        }

        return (
          <Chip
            key={`${typename}|${label}|${idx}`}
            variant="outlined"
            label={label}
            onClick={() =>
              router.push(
                buildRouteHref(props.us ? "/us" : "/de", null, {
                  filter: JSON.stringify(filter),
                })
              )
            }
          />
        );
      })}
    </Box>
  );
}
