"use client";

import React from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { InitialResponsiveGuess } from "./responsiveGuess";

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

const ResponsiveGuessContext = React.createContext<InitialResponsiveGuess | null>(null);

type ResponsiveGuessProviderProps = {
  children?: React.ReactNode;
  initialGuess: InitialResponsiveGuess;
};

export function ResponsiveGuessProvider(props: Readonly<ResponsiveGuessProviderProps>) {
  return React.createElement(
    ResponsiveGuessContext.Provider,
    { value: props.initialGuess },
    props.children ?? null
  );
}

export function useResponsive(): ResponsiveState {
  const theme = useTheme();
  const initialGuess = React.useContext(ResponsiveGuessContext);
  const isLandscape = useMediaQuery("(orientation: landscape)", {
    defaultMatches: initialGuess?.isLandscape ?? true,
  });
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"), {
    defaultMatches: initialGuess?.isPhone ?? false,
  });
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"), {
    defaultMatches: initialGuess?.isDesktop ?? true,
  });

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
