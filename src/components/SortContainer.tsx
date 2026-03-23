"use client";

import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { generateUrl } from "../util/hierarchy";
import MenuItem from "@mui/material/MenuItem";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import React from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
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
import { useInitialResponsiveGuess } from "../app/responsiveGuessContext";
import { buildRouteHref } from "./generic/routeHref";
import { usePendingNavigation } from "./generic/usePendingNavigation";

const SORT_OPTIONS = ["updatedat", "createdat", "releasedate", "series", "publisher"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];
const SORT_LABEL_ID = "sort-container-label";
const SORT_SELECT_ID = "sort-container-select";

type SortContainerProps = {
  query?: ListingQuery;
  selected?: SelectedRoot;
  us?: boolean;
  compactLayout?: boolean;
};

export default function SortContainer(ownProps: Readonly<SortContainerProps>) {
  const { isPending, push } = usePendingNavigation();
  const theme = useTheme();
  const initialGuess = useInitialResponsiveGuess();
  const isLandscape = useMediaQuery("(orientation: landscape)", {
    defaultMatches: initialGuess?.isLandscape ?? true,
  });
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"), {
    defaultMatches: initialGuess?.isPhone ?? false,
  });
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"), {
    defaultMatches: initialGuess?.isDesktop ?? true,
  });
  const isTablet = !isPhone && !isDesktop;
  const query = ownProps.query;
  const us = Boolean(ownProps.us);
  const selected = ownProps.selected;
  const compactLayout =
    ownProps.compactLayout ??
    Boolean(isPhone || (isTablet && !isLandscape));
  const currentOrder = toValidSortOption(getListingOrder(query));
  const currentDirection = toDirection(getListingDirection(query));
  const currentView = getListingView(query);

  const target = selected || { us };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: compactLayout ? "1fr auto auto auto" : "minmax(220px, 1fr) auto auto auto",
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
          disabled={isPending}
          onChange={(e) =>
            push(
              buildRouteHref(
                generateUrl(target, us),
                query,
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
        disabled={isPending}
        aria-label="Sortierreihenfolge"
        onChange={(e, value: "ASC" | "DESC" | null) => {
          if (!value) return;
          push(
            buildRouteHref(
              generateUrl(target, us),
              query,
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
        disabled={isPending}
        aria-label="Darstellungsmodus"
        onChange={(e, value: "strip" | "gallery" | null) => {
          if (!value) return;
          push(
            buildRouteHref(
              generateUrl(target, us),
              query,
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

      {isPending ? (
        <Box
          aria-live="polite"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 24,
          }}
        >
          <CircularProgress size={18} />
        </Box>
      ) : null}
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
