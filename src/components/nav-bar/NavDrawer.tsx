"use client";

import React from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import { alpha } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import MuiList from "@mui/material/List";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import {
  COMPACT_BOTTOM_BAR_CLEARANCE,
  drawerHeaderAdjustedHeight,
  drawerHeaderTopOffset,
  getNavDrawerWidth,
} from "../layoutMetrics";
import { writeNavScrollTop } from "./navStateStorage";

type NavDrawerProps = {
  temporary: boolean;
  drawerOpen?: boolean;
  toggleDrawer?: () => void;
  navStateKey: string;
  navScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  listRef: React.RefObject<HTMLUListElement | null>;
  onScrollToSelected?: () => void;
  disableScrollToSelected?: boolean;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  onFilterFocus?: () => void;
  children: React.ReactNode;
};

export default function NavDrawer(props: Readonly<NavDrawerProps>) {
  const {
    temporary,
    drawerOpen,
    toggleDrawer,
    navStateKey,
    navScrollContainerRef,
    listRef,
    onScrollToSelected,
    disableScrollToSelected = false,
    filterValue = "",
    onFilterChange = () => {},
    onFilterFocus,
    children,
  } = props;
  const drawerWidth = getNavDrawerWidth(temporary);
  const navListBottomPadding = temporary ? `calc(${COMPACT_BOTTOM_BAR_CLEARANCE} + 56px)` : "56px";
  const paperSx: SxProps<Theme> = {
    width: drawerWidth,
    maxWidth: "100%",
    top: drawerHeaderTopOffset,
    height: drawerHeaderAdjustedHeight,
    backgroundColor: "rgba(255, 255, 255, 0.65) !important",
    backdropFilter: "blur(20px)",
    borderRight: "1px solid",
    borderRightColor: "rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
    '[data-theme="dark"] &': {
      backgroundColor: "var(--mui-palette-background-default) !important",
      borderRightColor: "rgba(255, 255, 255, 0.08)",
    },
  };

  const handleNavScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      writeNavScrollTop(navStateKey, event.currentTarget.scrollTop);
    },
    [navStateKey]
  );

  const drawerContent = (
    <Box
      sx={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Box
        sx={{
          height: 40,
          px: 1.5,
          boxSizing: "border-box",
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <TextField
          size="small"
          fullWidth
          placeholder="Filtern..."
          value={filterValue}
          onChange={(e) => onFilterChange(e.target.value)}
          onFocus={onFilterFocus}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{
                      color: "text.secondary",
                      opacity: 0.5,
                      fontSize: "1.0rem",
                      transition: "color 0.15s ease, opacity 0.15s ease",
                    }}
                  />
                </InputAdornment>
              ),
              endAdornment: filterValue ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => onFilterChange("")}
                    aria-label="Filter leeren"
                    sx={{ p: 0.25 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              height: 28,
              backgroundColor: "rgba(0, 0, 0, 0.035)",
              borderRadius: "14px",
              px: 1,
              transition: "background-color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
              "& fieldset": {
                border: "1px solid",
                borderColor: "rgba(0, 0, 0, 0.06)",
              },
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.055)",
                "& fieldset": {
                  borderColor: "rgba(0, 0, 0, 0.12)",
                },
              },
              "&.Mui-focused": {
                backgroundColor: "#ffffff",
                boxShadow: (theme) => `0 0 0 2.5px ${alpha(theme.palette.primary.main, 0.12)}`,
                "& fieldset": {
                  borderColor: "primary.main",
                },
                "& .MuiInputAdornment-positionStart .MuiSvgIcon-root": {
                  opacity: 0.8,
                  color: "primary.main",
                  '[data-theme="dark"] &': {
                    color: "primary.light",
                  },
                },
              },
              '[data-theme="dark"] &': {
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                "& fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.06)",
                },
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.09)",
                  "& fieldset": {
                    borderColor: "rgba(255, 255, 255, 0.12)",
                  },
                },
                "&.Mui-focused": {
                  backgroundColor: "var(--mui-palette-background-paper)",
                  boxShadow: (theme) => `0 0 0 2.5px ${alpha(theme.palette.primary.light, 0.18)}`,
                  "& fieldset": {
                    borderColor: "primary.light",
                  },
                },
              },
            },
            "& .MuiOutlinedInput-input": {
              padding: "0 4px",
              fontSize: "0.82rem",
            },
            "& .MuiInputBase-input::placeholder": {
              fontSize: "0.82rem",
              opacity: 0.5,
            },
          }}
        />
        <Tooltip describeChild title="Zur Auswahl springen">
          <Box component="span" sx={{ display: "inline-flex" }}>
            <IconButton
              aria-label="Zur Auswahl"
              onClick={onScrollToSelected}
              disabled={disableScrollToSelected}
              size="small"
              sx={{
                width: 28,
                height: 28,
                color: "text.secondary",
                borderRadius: "50%",
                backgroundColor: "transparent",
                opacity: 0.7,
                transition: "all 0.15s ease",
                "&:hover": {
                  backgroundColor: "action.hover",
                  color: "primary.main",
                  opacity: 1,
                },
                "&.Mui-disabled": {
                  color: "text.disabled",
                  backgroundColor: "transparent",
                  opacity: 0.35,
                },
              }}
            >
              <MyLocationIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Tooltip>
      </Box>
      <Box
        ref={navScrollContainerRef}
        onScroll={handleNavScroll}
        sx={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
      >
        <MuiList
          ref={listRef}
          sx={{
            width: "100%",
            p: 0,
            pt: 0,
            pb: navListBottomPadding,
          }}
        >
          {children}
        </MuiList>
      </Box>
    </Box>
  );

  if (temporary) {
    return (
      <SwipeableDrawer
        disableDiscovery={true}
        variant="temporary"
        open={Boolean(drawerOpen)}
        onClose={() => toggleDrawer?.()}
        onOpen={() => toggleDrawer?.()}
        ModalProps={{
          keepMounted: false,
        }}
        PaperProps={{
          sx: paperSx,
        }}
        slotProps={{
          paper: {
            sx: paperSx,
          },
        }}
      >
        {drawerContent}
      </SwipeableDrawer>
    );
  }

  return (
    <Drawer
      variant="persistent"
      open={Boolean(drawerOpen)}
      PaperProps={{
        sx: paperSx,
      }}
      slotProps={{
        paper: {
          sx: paperSx,
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
