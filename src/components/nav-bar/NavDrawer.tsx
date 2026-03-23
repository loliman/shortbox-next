"use client";

import React from "react";
import Drawer from "@mui/material/Drawer";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import MuiList from "@mui/material/List";
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
    children,
  } = props;
  const drawerWidth = getNavDrawerWidth(temporary);
  const paperSx = {
    width: drawerWidth,
    maxWidth: "100%",
    top: drawerHeaderTopOffset,
    height: drawerHeaderAdjustedHeight,
    backgroundColor: "background.paper",
  };

  const handleNavScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      writeNavScrollTop(navStateKey, event.currentTarget.scrollTop);
    },
    [navStateKey]
  );

  const drawerContent = (
    <MuiList
      ref={listRef}
      className={contentReady ? "data-fade" : undefined}
      sx={{
        width: "100%",
        p: 0,
        pb: temporary ? COMPACT_BOTTOM_BAR_CLEARANCE : 0,
        visibility: contentReady ? "visible" : "hidden",
        opacity: contentReady ? 1 : 0,
      }}
    >
      {children}
    </MuiList>
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
          ref: navScrollContainerRef,
          onScroll: handleNavScroll,
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
        ref: navScrollContainerRef,
        onScroll: handleNavScroll,
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
