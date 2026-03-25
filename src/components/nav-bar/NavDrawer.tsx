"use client";

import React from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import MuiList from "@mui/material/List";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import CompressIcon from "@mui/icons-material/Compress";
import ExpandIcon from "@mui/icons-material/Expand";
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
  contentReady?: boolean;
  navScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  listRef: React.RefObject<HTMLUListElement | null>;
  onScrollToSelected?: () => void;
  onCloseAll?: () => void;
  onShowAll?: () => void;
  showCollapseToggle?: boolean;
  disableScrollToSelected?: boolean;
  disableCloseAll?: boolean;
  disableShowAll?: boolean;
  children: React.ReactNode;
};

export default function NavDrawer(props: Readonly<NavDrawerProps>) {
  const {
    temporary,
    drawerOpen,
    toggleDrawer,
    navStateKey,
    contentReady = true,
    navScrollContainerRef,
    listRef,
    onScrollToSelected,
    onCloseAll,
    onShowAll,
    showCollapseToggle = false,
    disableScrollToSelected = false,
    disableCloseAll = false,
    disableShowAll = false,
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

  const handleExpandToggle = showCollapseToggle ? onCloseAll : onShowAll;
  const expandToggleDisabled = showCollapseToggle ? disableCloseAll : disableShowAll;
  const expandToggleLabel = showCollapseToggle ? "Alles schließen" : "Alles zeigen";
  const ExpandToggleIcon = showCollapseToggle ? CompressIcon : ExpandIcon;

  const drawerContent = (
    <Box sx={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <ToggleButtonGroup
          size="small"
          aria-label="Navigation-Aktionen"
          sx={{
            pointerEvents: "auto",
            backgroundColor: "background.paper",
            "& .MuiToggleButtonGroup-grouped": {
              borderColor: "divider",
            },
          }}
        >
          <Tooltip title={expandToggleLabel}>
            <span>
              <ToggleButton
                value="expandToggle"
                aria-label={expandToggleLabel}
                onClick={handleExpandToggle}
                disabled={expandToggleDisabled}
                sx={{
                  width: 34,
                  height: 34,
                  color: "text.primary",
                  backgroundColor: "background.paper",
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                  "&.Mui-disabled": {
                    backgroundColor: "background.paper",
                    opacity: 0.72,
                  },
                }}
              >
                <ExpandToggleIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
            </span>
          </Tooltip>
          <Tooltip title="Zur Auswahl">
            <span>
              <ToggleButton
                value="scrollToSelected"
                aria-label="Zur Auswahl"
                onClick={onScrollToSelected}
                disabled={disableScrollToSelected}
                sx={{
                  width: 34,
                  height: 34,
                  color: "text.primary",
                  backgroundColor: "background.paper",
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  ml: "-1px",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                  "&.Mui-disabled": {
                    backgroundColor: "background.paper",
                    opacity: 0.72,
                  },
                }}
              >
                <MyLocationIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
            </span>
          </Tooltip>
        </ToggleButtonGroup>
      </Box>
      <Box
        ref={navScrollContainerRef}
        onScroll={handleNavScroll}
        sx={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
      >
        <MuiList
          ref={listRef}
          className={contentReady ? "data-fade" : undefined}
          sx={{
            width: "100%",
            p: 0,
            pt: 0.5,
            pb: temporary ? COMPACT_BOTTOM_BAR_CLEARANCE : 0,
            visibility: contentReady ? "visible" : "hidden",
            opacity: contentReady ? 1 : 0,
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


