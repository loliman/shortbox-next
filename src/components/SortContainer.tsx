"use client";

import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { generateSeoUrl } from "../lib/routes/hierarchy";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import React from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha, useTheme } from "@mui/material/styles";
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
  const instanceId = React.useId();
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
  const sortLabelId = `${instanceId}-sort-container-label`;
  const sortSelectId = `${instanceId}-sort-container-select`;
  let gridTemplateColumns = "minmax(220px, 1fr) auto auto";
  if (!compactLayout && showPendingIndicator) {
    gridTemplateColumns = "auto minmax(220px, 1fr) auto auto";
  }

  const target = selected || { us };

  const pendingIndicator = showPendingIndicator ? (
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
  ) : null;

  const sortSelect = (
    <FormControl
      size="small"
      fullWidth={compactLayout}
      sx={(theme) => ({
        minWidth: compactLayout ? 0 : 200,
        width: compactLayout ? "100%" : 240,
        "& .MuiInputLabel-root": {
          ...theme.applyStyles("dark", {
            color: `${theme.palette.common.white} !important`,
          }),
        },
        "& .MuiInputLabel-root.Mui-focused": {
          ...theme.applyStyles("dark", {
            color: `${theme.palette.common.white} !important`,
          }),
        },
      })}
    >
      <InputLabel
        id={sortLabelId}
        sx={(theme) => ({
          color: "#111111",
          fontWeight: 600,
          "&.Mui-focused": {
            color: "#111111",
          },
          ...theme.applyStyles("dark", {
            color: theme.palette.common.white,
            "&.Mui-focused": {
              color: theme.palette.common.white,
            },
          }),
        })}
      >
        {compactLayout ? "Sortierung" : "Sortieren nach"}
      </InputLabel>
      <Select
        id={sortSelectId}
        labelId={sortLabelId}
        value={currentOrder}
        label={compactLayout ? "Sortierung" : "Sortieren nach"}
        sx={(theme) => ({
          backgroundColor: "#ffffff",
          color: "#111111 !important",
          fontWeight: 500,
          "&.MuiInputBase-root": {
            backgroundColor: "#ffffff",
            color: "#111111 !important",
          },
          "& .MuiSelect-select": {
            color: "#111111 !important",
            WebkitTextFillColor: "#111111 !important",
            fontWeight: 500,
            opacity: "1 !important",
          },
          "& .MuiSelect-icon": {
            color: "#111111 !important",
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
          ...theme.applyStyles("dark", {
            backgroundColor: "#2a2f36",
            color: `${theme.palette.common.white} !important`,
            "&.MuiInputBase-root": {
              backgroundColor: "#2a2f36",
              color: `${theme.palette.common.white} !important`,
            },
            "& .MuiSelect-select": {
              color: `${theme.palette.common.white} !important`,
              WebkitTextFillColor: `${theme.palette.common.white} !important`,
              fontWeight: 500,
            },
            "& .MuiSelect-icon": {
              color: `${theme.palette.common.white} !important`,
            },
            "& fieldset": {
              borderColor: alpha(theme.palette.common.white, 0.34),
            },
            "&:hover fieldset": {
              borderColor: alpha(theme.palette.common.white, 0.54),
            },
            "&.Mui-focused fieldset": {
              borderColor: theme.palette.primary.light,
            },
          }),
        })}
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
  );

  const directionToggle = (
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
  );

  const viewToggle = (
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
  );

  if (compactLayout) {
    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto auto",
          alignItems: "center",
          gap: 1,
          width: "100%",
        }}
      >
        <Box sx={{ minWidth: 0, position: "relative" }}>
          {showPendingIndicator ? (
            <Box
              aria-live="polite"
              sx={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                visibility: isPending ? "visible" : "hidden",
                zIndex: 1,
                pointerEvents: "none",
              }}
            >
              <CircularProgress size={18} />
            </Box>
          ) : null}
          <Box
            sx={{
            }}
          >
            {sortSelect}
          </Box>
        </Box>
        {directionToggle}
        {viewToggle}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns,
        alignItems: "center",
        gap: 1,
        width: "auto",
      }}
    >
      {pendingIndicator}
      {sortSelect}
      {directionToggle}
      {viewToggle}
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
