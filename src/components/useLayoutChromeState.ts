"use client";

import React from "react";
import { getNavDrawerWidth } from "./layoutMetrics";
import { clearAllNavState } from "./nav-bar/navStateStorage";

type LayoutChromeStateArgs = {
  drawerOpen?: boolean;
  navWide: boolean;
  temporaryDrawer: boolean;
};

export function useLayoutChromeState(args: Readonly<LayoutChromeStateArgs> | null) {
  const navWide = args?.navWide ?? false;
  const temporaryDrawer = args?.temporaryDrawer ?? false;
  const [localDrawerOpen, setLocalDrawerOpen] = React.useState<boolean>(
    args?.drawerOpen ?? navWide
  );
  const previousNavWideRef = React.useRef(navWide);
  const drawerOpen = localDrawerOpen;

  React.useEffect(() => {
    if (!args) {
      setLocalDrawerOpen(false);
      previousNavWideRef.current = false;
      return;
    }
    if (typeof args.drawerOpen === "boolean") {
      setLocalDrawerOpen(args.drawerOpen);
      previousNavWideRef.current = navWide;
      return;
    }
    if (!previousNavWideRef.current && navWide) {
      setLocalDrawerOpen(true);
    }
    previousNavWideRef.current = navWide;
  }, [args, navWide]);

  const toggleDrawer = React.useCallback(() => {
    if (!args) return;
    setLocalDrawerOpen((prev) => !prev);
  }, [args]);

  const resetNavigationState = React.useCallback(() => {
    clearAllNavState();
  }, []);

  React.useLayoutEffect(() => {
    if (!args) {
      document.documentElement.style.removeProperty("--shortbox-nav-offset");
      return;
    }
    const nextOffset = !temporaryDrawer && drawerOpen ? `${getNavDrawerWidth(false)}px` : "0px";
    document.documentElement.style.setProperty("--shortbox-nav-offset", nextOffset);
    return () => {
      document.documentElement.style.removeProperty("--shortbox-nav-offset");
    };
  }, [args, drawerOpen, temporaryDrawer]);

  return {
    drawerOpen,
    toggleDrawer,
    resetNavigationState,
  };
}
