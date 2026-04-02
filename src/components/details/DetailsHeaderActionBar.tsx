"use client";

import React from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import EditButton from "../restricted/EditButton";
import SortContainer from "../SortContainer";
import { usePendingNavigation } from "../generic/usePendingNavigation";
import type { SelectedRoot } from "../../types/domain";
import type { LayoutRouteData, RouteQuery } from "../../types/route-ui";
import type { SessionData } from "../../types/session";
import type { ListingQuery } from "../../util/listingQuery";

type DetailsHeaderActionBarProps = {
  id?: string | number | null;
  item: unknown;
  query?: RouteQuery | null;
  selected: SelectedRoot;
  session?: SessionData | null;
  level: LayoutRouteData["level"];
  us: boolean;
  showSort?: boolean;
};

export default function DetailsHeaderActionBar(props: Readonly<DetailsHeaderActionBarProps>) {
  const pendingNavigation = usePendingNavigation();
  const showSort = props.showSort ?? true;

  return (
    <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="flex-end">
      <Box
        aria-live="polite"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 24,
          visibility: pendingNavigation.isPending ? "visible" : "hidden",
        }}
      >
        <CircularProgress size={18} />
      </Box>

      {props.session ? (
        <Box
          component="span"
          sx={{
            flexShrink: 0,
            color: "text.secondary",
            fontSize: "0.75rem",
            fontWeight: 500,
            opacity: 0.8,
            whiteSpace: "nowrap",
            lineHeight: 1,
          }}
        >
          #{props.id ?? ""}
        </Box>
      ) : null}

      {showSort ? (
        <SortContainer
          query={props.query as ListingQuery}
          selected={props.selected}
          us={props.us}
          showPendingIndicator={false}
          pendingNavigation={pendingNavigation}
        />
      ) : null}

      <EditButton
        session={props.session}
        item={props.item}
        level={props.level}
        us={props.us}
      />
    </Stack>
  );
}


