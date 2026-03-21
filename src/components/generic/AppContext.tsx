"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { AppThemeMode } from "../../app/theme";
import type { SessionData } from "../../app/session";
import { useResponsive } from "../../app/useResponsive";

type SessionValue = SessionData | null;

interface AppContextState {
  drawerOpen: boolean;
  loadingComponents: string[];
  navResetVersion: number;
}

interface AppContextProps {
  children?: React.ReactNode;
  session?: SessionValue;
  setSession?: React.Dispatch<React.SetStateAction<SessionValue>>;
  themeMode?: AppThemeMode;
  toggleTheme?: () => void;
  changeRequestsCount?: number;
}

export interface SessionContextValue {
  session: SessionValue;
  handleLogin: (user: SessionValue) => void;
  handleLogout: () => void;
}

export interface ResponsiveContextValue {
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  isPhoneLandscape: boolean;
  isTabletLandscape: boolean;
  isPhonePortrait: boolean;
  compactLayout: boolean;
  navWide: boolean;
}

export interface NavigationUiContextValue {
  drawerOpen: boolean;
  toggleDrawer: () => void;
  navResetVersion: number;
  appIsLoading: boolean;
  resetLoadingComponents: () => void;
  registerLoadingComponent: (component: string) => void;
  unregisterLoadingComponent: (component: string) => void;
  isComponentRegistered: (component: string) => string | undefined;
  resetNavigationState: () => void;
}

export interface ThemeContextValue {
  themeMode: AppThemeMode;
  toggleTheme: () => void;
}

export interface AdminMetaContextValue {
  changeRequestsCount: number;
}

const defaultSessionContextValue: SessionContextValue = {
  session: null,
  handleLogin: () => {},
  handleLogout: () => {},
};

const defaultResponsiveContextValue: ResponsiveContextValue = {
  isPhone: false,
  isTablet: false,
  isDesktop: true,
  isLandscape: false,
  isPhoneLandscape: false,
  isTabletLandscape: false,
  isPhonePortrait: false,
  compactLayout: false,
  navWide: true,
};

const defaultNavigationUiContextValue: NavigationUiContextValue = {
  drawerOpen: false,
  toggleDrawer: () => {},
  navResetVersion: 0,
  appIsLoading: false,
  resetLoadingComponents: () => {},
  registerLoadingComponent: () => {},
  unregisterLoadingComponent: () => {},
  isComponentRegistered: () => undefined,
  resetNavigationState: () => {},
};

const defaultThemeContextValue: ThemeContextValue = {
  themeMode: "light",
  toggleTheme: () => {},
};

const defaultAdminMetaContextValue: AdminMetaContextValue = {
  changeRequestsCount: 0,
};

export const SessionContext = React.createContext<SessionContextValue>(defaultSessionContextValue);
export const ResponsiveContext =
  React.createContext<ResponsiveContextValue>(defaultResponsiveContextValue);
export const NavigationUiContext =
  React.createContext<NavigationUiContextValue>(defaultNavigationUiContextValue);
export const ThemeModeContext = React.createContext<ThemeContextValue>(defaultThemeContextValue);
export const AdminMetaContext =
  React.createContext<AdminMetaContextValue>(defaultAdminMetaContextValue);

function AppContextProvider({
  children,
  session,
  setSession,
  themeMode = "light",
  toggleTheme = () => {},
  changeRequestsCount = 0,
}: Readonly<AppContextProps>) {
  const responsive = useResponsive();
  const [state, setState] = useState<AppContextState>(() => {
    return {
      drawerOpen: responsive.navWide,
      loadingComponents: [],
      navResetVersion: 0,
    };
  });

  useEffect(() => {
    setState((prevState) =>
      prevState.drawerOpen === responsive.navWide
        ? prevState
        : {
            ...prevState,
            drawerOpen: responsive.navWide,
          }
    );
  }, [responsive.navWide]);

  const resetLoadingComponents = useCallback(() => {
    setState((prevState) =>
      prevState.loadingComponents.length === 0
        ? prevState
        : {
            ...prevState,
            loadingComponents: [],
          }
    );
  }, []);

  const registerLoadingComponent = useCallback((component: string) => {
    setState((prevState) => {
      if (prevState.loadingComponents.includes(component)) return prevState;
      return {
        ...prevState,
        loadingComponents: [...prevState.loadingComponents, component],
      };
    });
  }, []);

  const unregisterLoadingComponent = useCallback((component: string) => {
    setState((prevState) => {
      if (!prevState.loadingComponents.includes(component)) return prevState;
      return {
        ...prevState,
        loadingComponents: prevState.loadingComponents.filter((c) => c !== component),
      };
    });
  }, []);

  const isComponentRegistered = useCallback(
    (component: string) => state.loadingComponents.find((c) => c === component),
    [state.loadingComponents]
  );

  const handleLogin = useCallback(
    () => {
      setSession?.({ loggedIn: true });
    },
    [setSession]
  );

  const handleLogout = useCallback(() => {
    setSession?.(null);
  }, [setSession]);

  const toggleDrawer = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      drawerOpen: !prevState.drawerOpen,
    }));
  }, []);

  const resetNavigationState = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      navResetVersion: prevState.navResetVersion + 1,
    }));
  }, []);

  const sessionValue = useMemo<SessionContextValue>(
    () => ({
      session: session ?? null,
      handleLogin,
      handleLogout,
    }),
    [handleLogin, handleLogout, session]
  );

  const responsiveValue = useMemo<ResponsiveContextValue>(
    () => ({
      isPhone: responsive.isPhone,
      isTablet: responsive.isTablet,
      isDesktop: responsive.isDesktop,
      isLandscape: responsive.isLandscape,
      isPhoneLandscape: responsive.isPhoneLandscape,
      isTabletLandscape: responsive.isTabletLandscape,
      isPhonePortrait: responsive.isPhonePortrait,
      compactLayout: responsive.isCompact,
      navWide: responsive.navWide,
    }),
    [
      responsive.isCompact,
      responsive.isDesktop,
      responsive.isLandscape,
      responsive.isPhone,
      responsive.isPhoneLandscape,
      responsive.isPhonePortrait,
      responsive.isTablet,
      responsive.isTabletLandscape,
      responsive.navWide,
    ]
  );

  const navigationUiValue = useMemo<NavigationUiContextValue>(
    () => ({
      drawerOpen: state.drawerOpen,
      toggleDrawer,
      navResetVersion: state.navResetVersion,
      appIsLoading: state.loadingComponents.length > 0,
      resetLoadingComponents,
      registerLoadingComponent,
      unregisterLoadingComponent,
      isComponentRegistered,
      resetNavigationState,
    }),
    [
      isComponentRegistered,
      registerLoadingComponent,
      resetLoadingComponents,
      resetNavigationState,
      state.drawerOpen,
      state.loadingComponents.length,
      state.navResetVersion,
      toggleDrawer,
      unregisterLoadingComponent,
    ]
  );

  const themeValue = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      toggleTheme,
    }),
    [themeMode, toggleTheme]
  );

  const adminMetaValue = useMemo<AdminMetaContextValue>(
    () => ({
      changeRequestsCount,
    }),
    [changeRequestsCount]
  );

  return (
    <SessionContext.Provider value={sessionValue}>
      <ResponsiveContext.Provider value={responsiveValue}>
        <NavigationUiContext.Provider value={navigationUiValue}>
          <ThemeModeContext.Provider value={themeValue}>
            <AdminMetaContext.Provider value={adminMetaValue}>
              {children}
            </AdminMetaContext.Provider>
          </ThemeModeContext.Provider>
        </NavigationUiContext.Provider>
      </ResponsiveContext.Provider>
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  return React.useContext(SessionContext);
}

export function useResponsiveContext() {
  return React.useContext(ResponsiveContext);
}

export function useNavigationUiContext() {
  return React.useContext(NavigationUiContext);
}

export function useThemeModeContext() {
  return React.useContext(ThemeModeContext);
}

export function useAdminMetaContext() {
  return React.useContext(AdminMetaContext);
}

export default AppContextProvider;
