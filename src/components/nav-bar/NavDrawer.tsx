"use client";

import React from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import MuiList from "@mui/material/List";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import MyLocationIcon from "@mui/icons-material/MyLocation";
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
    children,
  } = props;
  const drawerWidth = getNavDrawerWidth(temporary);
  const paperSx = {
    width: drawerWidth,
    maxWidth: "100%",
    top: drawerHeaderTopOffset,
    height: drawerHeaderAdjustedHeight,
    backgroundColor: "background.paper",
    overflow: "hidden",
  };

  const handleNavScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      writeNavScrollTop(navStateKey, event.currentTarget.scrollTop);
    },
    [navStateKey]
  );

  const drawerContent = (
    <Box sx={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          position: "absolute",
          bottom: temporary ? `calc(${COMPACT_BOTTOM_BAR_CLEARANCE}px + 14px)` : 14,
          right: 14,
          zIndex: 2,
          pointerEvents: "auto",
        }}
      >
        <Tooltip describeChild title="Zur Auswahl springen">
          <span>
            <IconButton
              aria-label="Zur Auswahl"
              onClick={onScrollToSelected}
              disabled={disableScrollToSelected}
              size="small"
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1px solid",
                borderColor: "rgba(255,255,255,0.22)",
                backgroundColor: "primary.main",
                boxShadow: 4,
                "&:hover": {
                  backgroundColor: "primary.dark",
                },
                "&.Mui-disabled": {
                  color: "text.disabled",
                  borderColor: "divider",
                  backgroundColor: "action.disabledBackground",
                  boxShadow: 0,
                },
              }}
            >
              <MyLocationIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Box
        ref={navScrollContainerRef}
        onScroll={handleNavScroll}
        sx={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
      >
        <MuiList
          ref={listRef}
          className="data-fade"
          sx={{
            width: "100%",
            p: 0,
            pt: 0.5,
            pb: temporary ? COMPACT_BOTTOM_BAR_CLEARANCE : 0,
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
    >
      {drawerContent}
    </Drawer>
  );
}
