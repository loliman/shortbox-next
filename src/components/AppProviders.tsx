"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, useColorScheme } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import { type ReactNode, useCallback, useEffect } from "react";
import { ResponsiveGuessProvider } from "../app/useResponsive";
import ThemeModeProvider from "./generic/AppContext";
import { appTheme, type AppThemeMode } from "../app/theme";
import type { InitialResponsiveGuess } from "../app/responsiveGuess";

const THEME_MODE_STORAGE_KEY = "shortbox_theme_mode";
const THEME_COLOR_SCHEME_STORAGE_KEY = "shortbox_color_scheme";

type AppProvidersProps = {
  initialResponsiveGuess: InitialResponsiveGuess;
  children?: ReactNode;
};

function ThemeModeBridge(props: Readonly<AppProvidersProps>) {
  const { mode, setMode } = useColorScheme();
  const themeMode: AppThemeMode = mode === "dark" ? "dark" : "light";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.theme = themeMode;
  }, [themeMode]);

  const toggleTheme = useCallback(() => {
    setMode(themeMode === "dark" ? "light" : "dark");
  }, [setMode, themeMode]);

  return (
    <SnackbarProvider
      maxSnack={4}
      autoHideDuration={3500}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <ThemeModeProvider themeMode={themeMode} toggleTheme={toggleTheme}>
        <ResponsiveGuessProvider initialGuess={props.initialResponsiveGuess}>
          <CssBaseline />
          {props.children ?? null}
        </ResponsiveGuessProvider>
      </ThemeModeProvider>
    </SnackbarProvider>
  );
}

export default function AppProviders(props: Readonly<AppProvidersProps>) {
  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider
        theme={appTheme}
        defaultMode="light"
        modeStorageKey={THEME_MODE_STORAGE_KEY}
        colorSchemeStorageKey={THEME_COLOR_SCHEME_STORAGE_KEY}
        disableTransitionOnChange
      >
        <ThemeModeBridge initialResponsiveGuess={props.initialResponsiveGuess}>
          {props.children}
        </ThemeModeBridge>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
