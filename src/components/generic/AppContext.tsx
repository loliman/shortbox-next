"use client";

import React, { useMemo } from "react";
import type { AppThemeMode } from "../../app/theme";

interface ThemeModeProviderProps {
  children?: React.ReactNode;
  themeMode?: AppThemeMode;
  themeReady?: boolean;
  toggleTheme?: () => void;
}

export interface ThemeContextValue {
  themeMode: AppThemeMode;
  themeReady: boolean;
  toggleTheme: () => void;
}

export interface NavigationFeedbackContextValue {
  navigationPending: boolean;
  chromeLoading: boolean;
  navigationPayloadLoading: boolean;
  navigationUiLoading: boolean;
  beginNavigation: () => void;
  setNavigationPayloadLoading: (loading: boolean) => void;
  setNavigationUiLoading: (loading: boolean) => void;
}

const defaultThemeContextValue: ThemeContextValue = {
  themeMode: "light",
  themeReady: false,
  toggleTheme: () => {},
};

const defaultNavigationFeedbackContextValue: NavigationFeedbackContextValue = {
  navigationPending: false,
  chromeLoading: false,
  navigationPayloadLoading: false,
  navigationUiLoading: false,
  beginNavigation: () => {},
  setNavigationPayloadLoading: () => {},
  setNavigationUiLoading: () => {},
};

export const ThemeModeContext = React.createContext<ThemeContextValue>(defaultThemeContextValue);
export const NavigationFeedbackContext = React.createContext<NavigationFeedbackContextValue>(
  defaultNavigationFeedbackContextValue
);

export function ThemeModeProvider({
  children,
  themeMode = "light",
  themeReady = false,
  toggleTheme = () => {},
}: Readonly<ThemeModeProviderProps>) {
  const themeValue = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      themeReady,
      toggleTheme,
    }),
    [themeMode, themeReady, toggleTheme]
  );

  return (
    <ThemeModeContext.Provider value={themeValue}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeModeContext() {
  return React.useContext(ThemeModeContext);
}

export function useNavigationFeedbackContext() {
  return React.useContext(NavigationFeedbackContext);
}

export default ThemeModeProvider;
