import React from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import SortContainer from "../SortContainer";
import FilterSummaryBar from "../filter/FilterSummaryBar";
import type { ListingQuery } from "../../util/listingQuery";

interface ListingToolbarProps {
  query?: ListingQuery;
  previewProps?: Record<string, unknown>;
  compactLayout?: boolean;
  showSort?: boolean;
}

export default function ListingToolbar(props: Readonly<ListingToolbarProps>) {
  const showSort = props.showSort ?? true;
  const compactLayout = Boolean(props.compactLayout);
  const previewProps = (props.previewProps || {}) as Record<string, unknown>;

  return (
    <Stack spacing={1.5} sx={{ width: "100%" }}>
      {showSort ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: compactLayout ? "stretch" : "flex-end",
            width: "100%",
          }}
        >
          <SortContainer {...previewProps} query={props.query} />
        </Box>
      ) : null}

      {props.query?.filter ? (
        <FilterSummaryBar
          query={props.query}
          us={previewProps.us as boolean | undefined}
          selected={previewProps.selected as any}
          compactLayout={compactLayout}
        />
      ) : null}
    </Stack>
  );
}
