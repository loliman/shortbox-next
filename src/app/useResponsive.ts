"use client";

import React from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

export type ResponsiveState = {
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  isPhoneLandscape: boolean;
  isTabletLandscape: boolean;
  isPhonePortrait: boolean;
  isCompact: boolean;
  navWide: boolean;
};

export function useResponsive(): ResponsiveState {
  const theme = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const mediaQueryOptions = { noSsr: true } as const;
  const isLandscape = useMediaQuery("(orientation: landscape)", mediaQueryOptions);
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"), mediaQueryOptions);
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"), mediaQueryOptions);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return {
      isPhone: false,
      isTablet: false,
      isDesktop: true,
      isLandscape: false,
      isPhoneLandscape: false,
      isTabletLandscape: false,
      isPhonePortrait: false,
      isCompact: false,
      navWide: true,
    };
  }

  const isTablet = !isPhone && !isDesktop;
  const isPhoneLandscape = isPhone && isLandscape;
  const isTabletLandscape = isTablet && isLandscape;
  const isPhonePortrait = isPhone && !isLandscape;
  const isCompact = isPhone || (isTablet && !isLandscape);
  const navWide = isDesktop || isTabletLandscape;

  return {
    isPhone,
    isTablet,
    isDesktop,
    isLandscape,
    isPhoneLandscape,
    isTabletLandscape,
    isPhonePortrait,
    isCompact,
    navWide,
  };
}
