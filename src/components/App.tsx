"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import { type ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import AppContextProvider from "./generic/AppContext";
import { createAppTheme, type AppThemeMode } from "../app/theme";
import { type SessionData } from "../app/session";
import { isMockMode } from "../app/mockMode";
import { subscribeSessionInvalid } from "../app/authEvents";
import { AppPageLoader } from "./generic/loading";

const THEME_MODE_STORAGE_KEY = "shortbox_theme_mode";

const readStoredThemeMode = (): AppThemeMode | null => {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
};

type AppProps = {
  children?: ReactNode;
  changeRequestsCount?: number;
};

export default function App(props: Readonly<AppProps>) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [themeMode, setThemeMode] = useState<AppThemeMode>(() => readStoredThemeMode() || "light");

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_MODE_STORAGE_KEY, next);
      }
      return next;
    });
  };

  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    if (isMockMode) {
      setSession({ loggedIn: true });
      return;
    }
    setSession(null);
  }, []);

  useEffect(() => {
    return subscribeSessionInvalid(() => {
      setSession(null);
    });
  }, []);

  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={theme}>
        <SnackbarProvider
          maxSnack={4}
          autoHideDuration={3500}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <AppContextProvider
            session={session}
            setSession={setSession}
            themeMode={themeMode}
            toggleTheme={toggleTheme}
            changeRequestsCount={props.changeRequestsCount}
          >
            <CssBaseline />
            <Suspense fallback={<AppPageLoader />}>{props.children ?? null}</Suspense>
          </AppContextProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
