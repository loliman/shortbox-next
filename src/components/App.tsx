"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { type ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import { useApolloClient } from "@apollo/client";
import AppContextProvider from "./generic/AppContext";
import { createAppTheme, type AppThemeMode } from "../app/theme";
import { type SessionData } from "../app/session";
import { isMockMode } from "../app/mockMode";
import { subscribeSessionInvalid } from "../app/authEvents";
import { me } from "../graphql/queriesTyped";
import { AppPageLoader } from "./generic/loading";

const THEME_MODE_STORAGE_KEY = "shortbox_theme_mode";

const readStoredThemeMode = (): AppThemeMode | null => {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
};

type AppProps = {
  children?: ReactNode;
};

export default function App(props: Readonly<AppProps>) {
  const client = useApolloClient();
  const [session, setSession] = useState<SessionData | null>(null);
  const loggedIn = Boolean(session?.loggedIn);
  const [themeMode, setThemeMode] = useState<AppThemeMode>(() => readStoredThemeMode() || "light");
  const [themeLockedByUser, setThemeLockedByUser] = useState<boolean>(true);

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_MODE_STORAGE_KEY, next);
      }
      return next;
    });
    setThemeLockedByUser(true);
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

    let mounted = true;

    client
      .query({
        query: me,
        fetchPolicy: "network-only",
      })
      .then(({ data }) => {
        if (!mounted) return;

        if (data?.me) {
          if (!loggedIn) setSession({ loggedIn: true });
        } else {
          setSession(null);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
      });

    return () => {
      mounted = false;
    };
  }, [client, loggedIn]);

  useEffect(() => {
    return subscribeSessionInvalid(() => {
      setSession(null);
      client.clearStore();
    });
  }, [client]);

  return (
    <ThemeProvider theme={theme}>
      <AppContextProvider
        session={session}
        setSession={setSession}
        themeMode={themeMode}
        toggleTheme={toggleTheme}
      >
        <CssBaseline />
        <Suspense fallback={<AppPageLoader />}>{props.children ?? null}</Suspense>
      </AppContextProvider>
    </ThemeProvider>
  );
}
