"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, useColorScheme } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ThemeModeProvider, { NavigationFeedbackContext } from "./generic/AppContext";
import { appTheme, type AppThemeMode } from "../app/theme";
import type { InitialResponsiveGuess } from "../app/responsiveGuess";
import { ResponsiveGuessProvider } from "../app/responsiveGuessContext";

export const THEME_MODE_STORAGE_KEY = "shortbox_theme_mode";
const THEME_COLOR_SCHEME_STORAGE_KEY = "shortbox_color_scheme";
const MIN_NAVIGATION_FEEDBACK_MS = 240;
const MAX_NAVIGATION_FEEDBACK_MS = 8000;

type AppProvidersProps = {
  initialResponsiveGuess: InitialResponsiveGuess;
  children?: ReactNode;
};

function ThemeModeBridge(props: Readonly<AppProvidersProps>) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [navigationPending, setNavigationPending] = useState(false);
  const [navigationPayloadLoading, setNavigationPayloadLoadingState] = useState(false);
  const [navigationUiLoading, setNavigationUiLoadingState] = useState(false);
  const navigationStartedAtRef = useRef<number | null>(null);
  const themeMode: AppThemeMode = colorScheme === "dark" ? "dark" : "light";
  const themeReady = mounted && (colorScheme === "light" || colorScheme === "dark");
  const routeKey = useMemo(
    () => `${pathname || ""}?${searchParams?.toString() || ""}`,
    [pathname, searchParams]
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.theme = themeMode;
  }, [themeMode]);

  const toggleTheme = useCallback(() => {
    const nextMode = themeMode === "dark" ? "light" : "dark";
    setColorScheme(nextMode);
  }, [setColorScheme, themeMode]);

  const beginNavigation = useCallback(() => {
    navigationStartedAtRef.current =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    setNavigationPending(true);
  }, []);

  const setNavigationPayloadLoading = useCallback((loading: boolean) => {
    setNavigationPayloadLoadingState(loading);
  }, []);

  const setNavigationUiLoading = useCallback((loading: boolean) => {
    setNavigationUiLoadingState(loading);
  }, []);

  const chromeLoading = navigationPayloadLoading || navigationUiLoading;

  useEffect(() => {
    if (!navigationPending) return;

    const startedAt = navigationStartedAtRef.current;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const elapsed = startedAt == null ? 0 : now - startedAt;
    const remaining = Math.max(0, MIN_NAVIGATION_FEEDBACK_MS - elapsed);

    const timeout = window.setTimeout(() => {
      navigationStartedAtRef.current = null;
      setNavigationPending(false);
    }, remaining);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [navigationPending, routeKey]);

  useEffect(() => {
    if (!navigationPending) return;

    const timeout = window.setTimeout(() => {
      navigationStartedAtRef.current = null;
      setNavigationPending(false);
    }, MAX_NAVIGATION_FEEDBACK_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [navigationPending]);

  const navigationFeedbackValue = useMemo(
    () => ({
      navigationPending,
      chromeLoading,
      navigationPayloadLoading,
      navigationUiLoading,
      beginNavigation,
      setNavigationPayloadLoading,
      setNavigationUiLoading,
    }),
    [
      beginNavigation,
      chromeLoading,
      navigationPayloadLoading,
      navigationPending,
      navigationUiLoading,
      setNavigationPayloadLoading,
      setNavigationUiLoading,
    ]
  );

  return (
    <SnackbarProvider
      maxSnack={4}
      autoHideDuration={3500}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <ThemeModeProvider themeMode={themeMode} themeReady={themeReady} toggleTheme={toggleTheme}>
        <NavigationFeedbackContext.Provider value={navigationFeedbackValue}>
          <ResponsiveGuessProvider initialGuess={props.initialResponsiveGuess}>
            <CssBaseline />
            {props.children ?? null}
          </ResponsiveGuessProvider>
        </NavigationFeedbackContext.Provider>
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
        <ThemeModeBridge
          initialResponsiveGuess={props.initialResponsiveGuess}
        >
          {props.children}
        </ThemeModeBridge>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
