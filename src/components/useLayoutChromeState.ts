"use client";

import React from "react";
import { getNavDrawerWidth } from "./layoutMetrics";
import { clearAllNavState } from "./nav-bar/navStateStorage";

type LayoutChromeStateArgs = {
  drawerOpen?: boolean;
  navWide: boolean;
  temporaryDrawer: boolean;
};

export function getDefaultDrawerOpen(args: Readonly<LayoutChromeStateArgs> | null): boolean {
  if (!args) return false;
  if (typeof args.drawerOpen === "boolean") return args.drawerOpen;
  if (args.temporaryDrawer) return false;
  return args.navWide;
}

export function useLayoutChromeState(args: Readonly<LayoutChromeStateArgs> | null) {
  const navWide = args?.navWide ?? false;
  const temporaryDrawer = args?.temporaryDrawer ?? false;
  const [localDrawerOpen, setLocalDrawerOpen] = React.useState<boolean>(() => getDefaultDrawerOpen(args));
  const previousNavWideRef = React.useRef(navWide);
  const previousTemporaryDrawerRef = React.useRef(temporaryDrawer);
  const drawerOpen = localDrawerOpen;

  React.useEffect(() => {
    if (!args) {
      setLocalDrawerOpen(false);
      previousNavWideRef.current = false;
      previousTemporaryDrawerRef.current = false;
      return;
    }
    if (typeof args.drawerOpen === "boolean") {
      setLocalDrawerOpen(args.drawerOpen);
      previousNavWideRef.current = navWide;
      previousTemporaryDrawerRef.current = temporaryDrawer;
      return;
    }
    if (!previousTemporaryDrawerRef.current && temporaryDrawer) {
      setLocalDrawerOpen(false);
    } else if (!previousNavWideRef.current && navWide && !temporaryDrawer) {
      setLocalDrawerOpen(true);
    }
    previousNavWideRef.current = navWide;
    previousTemporaryDrawerRef.current = temporaryDrawer;
  }, [args, navWide, temporaryDrawer]);

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
      document.documentElement.style.removeProperty("--shortbox-nav-gutter");
      return;
    }

    const nextGutter = !temporaryDrawer && navWide ? `${getNavDrawerWidth(false)}px` : "0px";
    const nextOffset = !temporaryDrawer && drawerOpen ? `${getNavDrawerWidth(false)}px` : "0px";
    document.documentElement.style.setProperty("--shortbox-nav-gutter", nextGutter);
    document.documentElement.style.setProperty("--shortbox-nav-offset", nextOffset);
  }, [args, drawerOpen, navWide, temporaryDrawer]);

  return {
    drawerOpen,
    toggleDrawer,
    resetNavigationState,
  };
}
