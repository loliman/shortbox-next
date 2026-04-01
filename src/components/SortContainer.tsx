"use client";

import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { generateSeoUrl } from "../util/hierarchy";
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
const SORT_OPTION_LABELS: Record<SortOption, string> = {
  updatedat: "Änderungsdatum",
  createdat: "Erfassungsdatum",
  releasedate: "Erscheinungsdatum",
  series: "Serie",
  publisher: "Verlag",
};

type SortContainerProps = {
  query?: ListingQuery;
  selected?: SelectedRoot;
  us?: boolean;
  compactLayout?: boolean;
  showPendingIndicator?: boolean;
  pendingNavigation?: {
    isPending: boolean;
    push: (href: string) => void;
  };
};

export default function SortContainer(ownProps: Readonly<SortContainerProps>) {
  const localPendingNavigation = usePendingNavigation();
  const { isPending, push } = ownProps.pendingNavigation ?? localPendingNavigation;
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
  const showPendingIndicator = ownProps.showPendingIndicator ?? true;
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
        gridTemplateColumns: compactLayout
          ? showPendingIndicator
            ? "auto 1fr auto auto"
            : "1fr auto auto"
          : showPendingIndicator
            ? "auto minmax(220px, 1fr) auto auto"
            : "minmax(220px, 1fr) auto auto",
        alignItems: "center",
        gap: 1,
        width: compactLayout ? "100%" : "auto",
      }}
    >
      {showPendingIndicator ? (
        <Box
          aria-live="polite"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 24,
            visibility: isPending ? "visible" : "hidden",
          }}
        >
          <CircularProgress size={18} />
        </Box>
      ) : null}

      <FormControl
        size="small"
        fullWidth={compactLayout}
        sx={{ minWidth: compactLayout ? 0 : 200, width: compactLayout ? "100%" : 240 }}
      >
        <InputLabel
          id={SORT_LABEL_ID}
          sx={(theme) => ({
            color: theme.palette.text.primary,
            fontWeight: 400,
            "&.Mui-focused": {
              color: theme.palette.text.primary,
            },
          })}
        >
          {compactLayout ? "Sortierung" : "Sortieren nach"}
        </InputLabel>
        <Select
          id={SORT_SELECT_ID}
          labelId={SORT_LABEL_ID}
          value={currentOrder}
          label={compactLayout ? "Sortierung" : "Sortieren nach"}
          sx={{
            backgroundColor: (theme) => theme.vars?.palette.background.paper ?? theme.palette.background.paper,
            "& .MuiSelect-select": {
              color: "text.primary",
              fontWeight: 400,
              opacity: 1,
            },
            "& .MuiSelect-icon": {
              color: "text.primary",
            },
            "& fieldset": {
              borderColor: "rgba(17, 17, 17, 0.18)",
            },
            "&:hover fieldset": {
              borderColor: "rgba(17, 17, 17, 0.32)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#111111",
            },
          }}
          disabled={isPending}
          onChange={(e) =>
            push(
              buildRouteHref(
                generateSeoUrl(target, us),
                query,
                buildSortNavigationQuery(query, {
                  order: toValidSortOption(String(e.target.value)),
                })
              )
            )
          }
        >
          <MenuItem value={"updatedat"}>{SORT_OPTION_LABELS.updatedat}</MenuItem>
          <MenuItem value={"createdat"}>{SORT_OPTION_LABELS.createdat}</MenuItem>
          <MenuItem value={"releasedate"}>{SORT_OPTION_LABELS.releasedate}</MenuItem>
          <MenuItem value={"series"}>{SORT_OPTION_LABELS.series}</MenuItem>
          <MenuItem value={"publisher"}>{SORT_OPTION_LABELS.publisher}</MenuItem>
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
              generateSeoUrl(target, us),
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
              generateSeoUrl(target, us),
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
