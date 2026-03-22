"use client";

import React, { useMemo } from "react";
import type { AppThemeMode } from "../../app/theme";

interface ThemeModeProviderProps {
  children?: React.ReactNode;
  themeMode?: AppThemeMode;
  toggleTheme?: () => void;
}

export interface ThemeContextValue {
  themeMode: AppThemeMode;
  toggleTheme: () => void;
}

const defaultThemeContextValue: ThemeContextValue = {
  themeMode: "light",
  toggleTheme: () => {},
};

export const ThemeModeContext = React.createContext<ThemeContextValue>(defaultThemeContextValue);

export function ThemeModeProvider({
  children,
  themeMode = "light",
  toggleTheme = () => {},
}: Readonly<ThemeModeProviderProps>) {
  const themeValue = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      toggleTheme,
    }),
    [themeMode, toggleTheme]
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
