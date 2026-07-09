"use client";

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import React from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ViewStreamIcon from "@mui/icons-material/ViewStream";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import type { SelectedRoot } from "../types/domain";
import { generateSeoUrl } from "../lib/routes/hierarchy";
import {
  buildSortNavigationQuery,
  getListingDirection,
  getListingOrder,
  getListingView,
  type ListingQuery,
} from "../util/listingQuery";
import { buildRouteHref } from "./generic/routeHref";
import { usePendingNavigation } from "./generic/usePendingNavigation";

const SORT_OPTIONS = ["updatedat", "createdat", "releasedate"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

const SORT_OPTION_LABELS: Record<SortOption, string> = {
  updatedat: "Änderung",
  createdat: "Erfassung",
  releasedate: "Erscheinung",
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
  const query = ownProps.query;
  const us = Boolean(ownProps.us);
  const selected = ownProps.selected;
  const showPendingIndicator = ownProps.showPendingIndicator ?? true;

  const currentOrder = toValidSortOption(getListingOrder(query));
  const currentDirection = toDirection(getListingDirection(query));
  const currentView = getListingView(query);

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

  const sortChips = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 0.5, sm: 0.75 },
        overflowX: "auto",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
        whiteSpace: "nowrap",
        flex: 1,
        py: 0.5,
        pr: { xs: 2.5, sm: 0 },
      }}
    >
      {SORT_OPTIONS.map((option) => {
        const isActive = option === currentOrder;
        const label = SORT_OPTION_LABELS[option];
        const defaultDir: "ASC" | "DESC" = "DESC";

        return (
          <Box
            key={option}
            onClick={() => {
              if (isPending) return;
              const nextDir = isActive
                ? (currentDirection === "ASC" ? "DESC" : "ASC")
                : defaultDir;
              push(
                buildRouteHref(
                  generateSeoUrl(target, us),
                  query,
                  buildSortNavigationQuery(query, {
                    order: option,
                    direction: nextDir,
                  })
                )
              );
            }}
            sx={(theme) => ({
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: { xs: 1, sm: 1.5 },
              py: { xs: 0.4, sm: 0.6 },
              borderRadius: "16px",
              fontSize: { xs: "0.68rem", sm: "0.75rem" },
              fontWeight: 600,
              cursor: isPending ? "default" : "pointer",
              userSelect: "none",
              transition: "all 180ms ease-in-out",
              border: "1px solid",
              opacity: isPending ? 0.6 : 1,
              // Light mode defaults
              ...(isActive
                ? {
                    backgroundColor: "#111827",
                    color: "#ffffff",
                    borderColor: "#111827",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                  }
                : {
                    backgroundColor: "rgba(0, 0, 0, 0.03)",
                    color: theme.palette.text.secondary,
                    borderColor: "rgba(0, 0, 0, 0.12)",
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.06)",
                      color: theme.palette.text.primary,
                      borderColor: "rgba(0, 0, 0, 0.22)",
                    },
                  }),
              // Dark mode overrides
              ...theme.applyStyles("dark", isActive
                ? {
                    backgroundColor: "#ffffff",
                    color: "#141413",
                    borderColor: "#ffffff",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                  }
                : {
                    backgroundColor: "rgba(255, 255, 255, 0.06)",
                    color: "#c7c4bc",
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.12)",
                      color: "#f9f8f6",
                      borderColor: "rgba(255, 255, 255, 0.35)",
                    },
                  }),
            })}
          >
            <span>{label}</span>
            {isActive && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  animation: "scaleIn 180ms ease-out",
                  "@keyframes scaleIn": {
                    from: { opacity: 0, transform: "scale(0.8)" },
                    to: { opacity: 1, transform: "scale(1)" },
                  },
                }}
              >
                {currentDirection === "ASC" ? (
                  <ArrowUpwardIcon sx={{ fontSize: { xs: 11, sm: 13 }, fontWeight: "bold" }} />
                ) : (
                  <ArrowDownwardIcon sx={{ fontSize: { xs: 11, sm: 13 }, fontWeight: "bold" }} />
                )}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );

  const viewToggle = (
    <ToggleButtonGroup
      size="small"
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
      sx={{
        "& .MuiToggleButton-root": {
          px: { xs: 0.75, sm: 1.25 },
          py: { xs: 0.25, sm: 0.5 },
          minWidth: { xs: 28, sm: 36 },
          height: { xs: 26, sm: 32 },
          "& .MuiSvgIcon-root": {
            fontSize: { xs: "0.95rem", sm: "1.15rem" },
          },
        },
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

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: { xs: 0.5, sm: 1.5 },
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flex: 1,
          minWidth: 0,
        }}
      >
        {pendingIndicator}
        {sortChips}
      </Box>
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
