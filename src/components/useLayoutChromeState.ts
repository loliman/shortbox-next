"use client";

import React from "react";
import { getNavDrawerWidth } from "./layoutMetrics";
import { clearAllNavState } from "./nav-bar/navStateStorage";

type LayoutChromeStateArgs = {
  drawerOpen?: boolean;
  navWide: boolean;
  temporaryDrawer: boolean;
};

export function useLayoutChromeState(args: Readonly<LayoutChromeStateArgs>) {
  const [localDrawerOpen, setLocalDrawerOpen] = React.useState<boolean>(
    args.drawerOpen ?? args.navWide
  );
  const drawerOpen = args.navWide ? true : localDrawerOpen;

  React.useEffect(() => {
    if (typeof args.drawerOpen === "boolean") {
      setLocalDrawerOpen(args.drawerOpen);
      return;
    }
    if (args.navWide) {
      setLocalDrawerOpen(true);
    }
  }, [args.drawerOpen, args.navWide]);

  const toggleDrawer = React.useCallback(() => {
    if (args.navWide) return;
    setLocalDrawerOpen((prev) => !prev);
  }, [args.navWide]);

  const resetNavigationState = React.useCallback(() => {
    clearAllNavState();
  }, []);

  React.useEffect(() => {
    const nextOffset =
      !args.temporaryDrawer && drawerOpen ? `${getNavDrawerWidth(false)}px` : "0px";
    document.documentElement.style.setProperty("--shortbox-nav-offset", nextOffset);
    return () => {
      document.documentElement.style.removeProperty("--shortbox-nav-offset");
    };
  }, [drawerOpen, args.temporaryDrawer]);

  return {
    drawerOpen,
    toggleDrawer,
    resetNavigationState,
  };
}
