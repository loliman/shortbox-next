"use client";

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
  const isLandscape = useMediaQuery("(orientation: landscape)");
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
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
