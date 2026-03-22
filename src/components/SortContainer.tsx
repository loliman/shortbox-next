"use client";

import { usePathname, useRouter } from "next/navigation";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { generateUrl } from "../util/hierarchy";
import MenuItem from "@mui/material/MenuItem";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import React from "react";
import Box from "@mui/material/Box";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ViewStreamIcon from "@mui/icons-material/ViewStream";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import type { SelectedRoot } from "../types/domain";
import {
  buildSortNavigationQuery,
  getListingDirection,
  getListingOrder,
  getListingView,
  type ListingQuery,
} from "../util/listingQuery";
import { useResponsive } from "../app/useResponsive";
import { buildRouteHref } from "./generic/routeHref";

const SORT_OPTIONS = ["updatedat", "createdat", "releasedate", "series", "publisher"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];
const SORT_LABEL_ID = "sort-container-label";
const SORT_SELECT_ID = "sort-container-select";

type SortContainerProps = {
  query?: ListingQuery;
  selected?: SelectedRoot;
  us?: boolean;
  compactLayout?: boolean;
  isPhone?: boolean;
  isTablet?: boolean;
  isTabletLandscape?: boolean;
};

export default function SortContainer(ownProps: Readonly<SortContainerProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const responsive = useResponsive();
  const query = ownProps.query;
  const us = Boolean(ownProps.us);
  const selected = ownProps.selected;
  const compactLayout =
    ownProps.compactLayout ??
    responsive.isCompact ??
    Boolean(
      (ownProps.isPhone ?? responsive.isPhone) ||
        ((ownProps.isTablet ?? responsive.isTablet) &&
          !(ownProps.isTabletLandscape ?? responsive.isTabletLandscape))
    );
  const currentOrder = toValidSortOption(getListingOrder(query));
  const currentDirection = toDirection(getListingDirection(query));
  const currentView = getListingView(query);

  const target = selected || { us };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: compactLayout ? "1fr auto auto" : "minmax(220px, 1fr) auto auto",
        alignItems: "center",
        gap: 1,
        width: compactLayout ? "100%" : "auto",
      }}
    >
      <FormControl
        size="small"
        fullWidth={compactLayout}
        sx={{ minWidth: compactLayout ? 0 : 200, width: compactLayout ? "100%" : 240 }}
      >
        <InputLabel id={SORT_LABEL_ID}>{compactLayout ? "Sortierung" : "Sortieren nach"}</InputLabel>
        <Select
          id={SORT_SELECT_ID}
          labelId={SORT_LABEL_ID}
          value={currentOrder}
          label={compactLayout ? "Sortierung" : "Sortieren nach"}
          onChange={(e) =>
            router.push(
              buildRouteHref(
                generateUrl(target, us),
                pathname === generateUrl(target, us) ? query : null,
                buildSortNavigationQuery(query, {
                  order: toValidSortOption(String(e.target.value)),
                })
              )
            )
          }
        >
          <MenuItem value={"updatedat"}>Änderungsdatum</MenuItem>
          <MenuItem value={"createdat"}>Erfassungsdatum</MenuItem>
          <MenuItem value={"releasedate"}>Erscheinungsdatum</MenuItem>
          <MenuItem value={"series"}>Serie</MenuItem>
          <MenuItem value={"publisher"}>Verlag</MenuItem>
        </Select>
      </FormControl>

      <ToggleButtonGroup
        size="small"
        color="primary"
        exclusive
        value={currentDirection}
        aria-label="Sortierreihenfolge"
        onChange={(e, value: "ASC" | "DESC" | null) => {
          if (!value) return;
          router.push(
            buildRouteHref(
              generateUrl(target, us),
              pathname === generateUrl(target, us) ? query : null,
              buildSortNavigationQuery(query, {
                direction: value,
              })
            )
          );
        }}
      >
        <ToggleButton value="ASC" aria-label="Aufsteigend">
          <ArrowUpwardIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton value="DESC" aria-label="Absteigend">
          <ArrowDownwardIcon fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup
        size="small"
        color="primary"
        exclusive
        value={currentView}
        aria-label="Darstellungsmodus"
        onChange={(e, value: "strip" | "gallery" | null) => {
          if (!value) return;
          router.push(
            buildRouteHref(
              generateUrl(target, us),
              pathname === generateUrl(target, us) ? query : null,
              buildSortNavigationQuery(query, {
                view: value,
              })
            )
          );
        }}
      >
        <ToggleButton value="strip" aria-label="Streifenansicht">
          <ViewStreamIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton value="gallery" aria-label="Galerieansicht">
          <ViewModuleIcon fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

function toValidSortOption(value: string): SortOption {
  if ((SORT_OPTIONS as readonly string[]).includes(value)) {
    return value as SortOption;
  }
  return "updatedat";
}

function toDirection(value: string): "ASC" | "DESC" {
  return value === "ASC" ? "ASC" : "DESC";
}
