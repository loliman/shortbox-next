import React from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import SortContainer from "../SortContainer";
import FilterSummaryBar from "../filter/FilterSummaryBar";
import type { ListingQuery } from "../../util/listingQuery";
import type { SessionData } from "../../app/session";
import type { SelectedRoot } from "../../types/domain";
import type { RouteQuery } from "../../types/route-ui";

type ListingPreviewProps = {
  us?: boolean;
  session?: SessionData | null;
  selected?: SelectedRoot;
  query?: RouteQuery | null;
};

interface ListingToolbarProps {
  query?: ListingQuery;
  previewProps?: ListingPreviewProps;
  compactLayout?: boolean;
  showSort?: boolean;
}

export default function ListingToolbar(props: Readonly<ListingToolbarProps>) {
  const showSort = props.showSort ?? true;
  const compactLayout = Boolean(props.compactLayout);
  const previewProps = props.previewProps || {};

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
          us={previewProps.us}
          selected={previewProps.selected}
          compactLayout={compactLayout}
        />
      ) : null}
    </Stack>
  );
}
