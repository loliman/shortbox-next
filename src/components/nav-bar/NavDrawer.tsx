"use client";

import React from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
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
                      fontSize: "1.1rem",
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
              backgroundColor: "transparent",
              borderRadius: "20px",
              px: 1,
              transition: "background-color 0.15s ease, box-shadow 0.15s ease",
              "& fieldset": {
                border: "none",
              },
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.025)",
                '[data-theme="dark"] &': {
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                },
              },
              "&.Mui-focused": {
                backgroundColor: "rgba(0, 0, 0, 0.045)",
                boxShadow: (theme) => `0 0 0 1px ${theme.palette.divider}`,
                "& .MuiInputAdornment-positionStart .MuiSvgIcon-root": {
                  opacity: 0.8,
                  color: "primary.main",
                  '[data-theme="dark"] &': {
                    color: "primary.light",
                  },
                },
                '[data-theme="dark"] &': {
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  boxShadow: (theme) => `0 0 0 1px ${theme.palette.divider}`,
                },
              },
              "& .MuiOutlinedInput-input": {
                padding: "4px 4px 4px 0",
                fontSize: "0.85rem",
              },
              "& .MuiInputBase-input::placeholder": {
                fontSize: "0.85rem",
                opacity: 0.5,
              },
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
                width: 32,
                height: 32,
                color: "text.secondary",
                borderRadius: "50%",
                backgroundColor: "transparent",
                opacity: 0.6,
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
              <MyLocationIcon sx={{ fontSize: 18 }} />
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
