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

const defaultThemeContextValue: ThemeContextValue = {
  themeMode: "light",
  themeReady: false,
  toggleTheme: () => {},
};

export const ThemeModeContext = React.createContext<ThemeContextValue>(defaultThemeContextValue);

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

export default ThemeModeProvider;
