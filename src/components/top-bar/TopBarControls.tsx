"use client";

import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import type { ReactNode } from "react";
import BugReportIcon from "@mui/icons-material/BugReport";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import WatchLaterIcon from "@mui/icons-material/WatchLater";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import SearchIcon from "@mui/icons-material/Search";
import type { AppThemeMode } from "../../app/theme";
import { buildRouteHref } from "../generic/routeHref";

type LocaleSwitchProps = {
  us: boolean;
  query?: { filter?: string | null; order?: string | null; direction?: string | null } | null;
  localeSwitchAriaLabel: string;
  resetNavigationState?: () => void;
  onNavigate: (href: string) => void;
  SwitchComponent: React.ComponentType<{
    checked: boolean;
    color?: "primary";
    inputProps?: Record<string, string>;
    onChange: () => void;
  }>;
};

export function LocaleSwitch(props: Readonly<LocaleSwitchProps>) {
  return (
    <Box
      sx={{
        ml: 0.75,
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1,
        py: 0.5,
        borderRadius: 999,
        border: "1px solid",
        borderColor: (theme) =>
          props.us
            ? theme.palette.mode === "dark"
              ? "rgba(96, 165, 250, 0.6)"
              : "rgba(59, 130, 246, 0.28)"
            : theme.palette.divider,
        backgroundColor: (theme) =>
          props.us
            ? theme.palette.mode === "dark"
              ? "rgba(30, 64, 175, 0.25)"
              : "rgba(191, 219, 254, 0.2)"
            : theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.02)",
      }}
    >
      <Typography
        sx={{
          fontSize: "0.74rem",
          fontWeight: props.us ? 500 : 700,
          opacity: props.us ? 0.65 : 1,
        }}
      >
        DE
      </Typography>
      <Tooltip title={"Wechseln zu " + (props.us ? "Deutsch" : "US")}>
        <props.SwitchComponent
          checked={props.us}
          color="primary"
          inputProps={{ "aria-label": props.localeSwitchAriaLabel }}
          onChange={() => {
            props.resetNavigationState?.();
            props.onNavigate(buildRouteHref(props.us ? "/de" : "/us", props.query, { filter: null }));
          }}
        />
      </Tooltip>
      <Typography
        sx={{
          fontSize: "0.74rem",
          fontWeight: props.us ? 700 : 500,
          opacity: props.us ? 1 : 0.65,
        }}
      >
        US
      </Typography>
    </Box>
  );
}

type AuthActionGroupProps = {
  loggedIn: boolean;
  canAdmin: boolean;
  changeRequestsCount: number;
  onNavigate: (href: string) => void;
  onLogout: () => void;
};

export function AuthActionGroup(props: Readonly<AuthActionGroupProps>) {
  const hasChangeRequests = props.changeRequestsCount > 0;

  return (
    <React.Fragment>
      {props.loggedIn && props.canAdmin ? (
        <Tooltip title="Change Requests">
          <Badge
            color="secondary"
            overlap="circular"
            showZero={false}
            badgeContent={hasChangeRequests ? props.changeRequestsCount : undefined}
            invisible={!hasChangeRequests}
            slotProps={{
              badge: {
                sx: {
                  fontSize: "0.62rem",
                  minWidth: 17,
                  height: 17,
                  px: 0.45,
                },
              },
            }}
          >
            <IconButton
              color={hasChangeRequests ? "secondary" : "inherit"}
              aria-label="Change Requests"
              onClick={() => props.onNavigate("/admin/change-requests")}
            >
              {hasChangeRequests ? (
                <BugReportIcon sx={{ color: "common.white" }} />
              ) : (
                <BugReportOutlinedIcon />
              )}
            </IconButton>
          </Badge>
        </Tooltip>
      ) : null}
      {props.loggedIn && props.canAdmin ? (
        <Tooltip title="Adminpanel">
          <IconButton
            color="inherit"
            aria-label="Adminpanel"
            onClick={() => props.onNavigate("/admin/tasks")}
          >
            <WatchLaterIcon />
          </IconButton>
        </Tooltip>
      ) : null}
      {!props.loggedIn ? (
        <Tooltip title="Login">
          <IconButton color="inherit" aria-label="Login" onClick={() => props.onNavigate("/login")}>
            <LoginIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Logout">
          <IconButton color="inherit" aria-label="Logout" onClick={props.onLogout}>
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      )}
    </React.Fragment>
  );
}

type MobileBottomBarProps = {
  us: boolean;
  session?: { loggedIn?: boolean; canAdmin?: boolean } | null;
  query?: { filter?: string | null; order?: string | null; direction?: string | null } | null;
  isFilterActive?: boolean | string | null;
  selected: unknown;
  initialFilterCount?: number | null;
  localeSwitchAriaLabel: string;
  changeRequestsCount: number;
  onOpenSearch: () => void;
  onToggleDrawer?: () => void;
  onNavigate: (href: string) => void;
  onLogout: () => void;
  resetNavigationState?: () => void;
  SwitchComponent: LocaleSwitchProps["SwitchComponent"];
  HamburgerIconComponent: React.ComponentType<{ open: boolean }>;
  drawerOpen?: boolean;
  FilterButton: React.ComponentType<{
    us: boolean;
    selected: unknown;
    isFilterActive?: boolean | string | null;
    query?: { filter?: string | null } | null;
    session?: { loggedIn?: boolean } | null;
  }>;
};

export function MobileBottomBar(props: Readonly<MobileBottomBarProps>) {
  return (
    <Box
      data-testid="mobile-bottom-bar"
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (theme) => theme.zIndex.drawer + 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        gap: 0.25,
        px: 0.75,
        pt: 0.5,
        pb: "calc(0.5rem + env(safe-area-inset-bottom))",
        bgcolor: "common.black",
        color: "common.white",
        borderTop: "1px solid rgba(255,255,255,0.2)",
        boxShadow: "0 -6px 18px rgba(0,0,0,0.12)",
      }}
    >
      <IconButton color="inherit" aria-label="Navigation umschalten" onClick={props.onToggleDrawer}>
        <props.HamburgerIconComponent open={Boolean(props.drawerOpen)} />
      </IconButton>
      <IconButton color="inherit" aria-label="Suche öffnen" onClick={props.onOpenSearch}>
        <SearchIcon />
      </IconButton>
      <props.FilterButton
        us={props.us}
        selected={props.selected}
        isFilterActive={props.isFilterActive}
        query={props.query as { filter?: string | null } | null}
        session={props.session}
      />
      <AuthActionGroup
        loggedIn={Boolean(props.session?.loggedIn)}
        canAdmin={Boolean(props.session?.canAdmin)}
        changeRequestsCount={props.changeRequestsCount}
        onNavigate={props.onNavigate}
        onLogout={props.onLogout}
      />
      <Box sx={{ ml: 0.25, display: "inline-flex", alignItems: "center", gap: 0.35 }}>
        <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, opacity: props.us ? 0.7 : 1 }}>
          DE
        </Typography>
        <Tooltip title={"Wechseln zu " + (props.us ? "Deutsch" : "US")}>
          <props.SwitchComponent
            checked={props.us}
            color="primary"
            inputProps={{ "aria-label": props.localeSwitchAriaLabel }}
            onChange={() => {
              props.resetNavigationState?.();
              props.onNavigate(buildRouteHref(props.us ? "/de" : "/us", props.query, { filter: null }));
            }}
          />
        </Tooltip>
        <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, opacity: props.us ? 1 : 0.7 }}>
          US
        </Typography>
      </Box>
    </Box>
  );
}

type DesktopActionsProps = {
  us: boolean;
  session?: { loggedIn?: boolean; canAdmin?: boolean } | null;
  query?: { filter?: string | null; order?: string | null; direction?: string | null } | null;
  localeSwitchAriaLabel: string;
  changeRequestsCount: number;
  darkModeEnabled: boolean;
  themeMode?: AppThemeMode;
  toggleTheme?: () => void;
  onNavigate: (href: string) => void;
  onLogout: () => void;
  resetNavigationState?: () => void;
  SwitchComponent: LocaleSwitchProps["SwitchComponent"];
  darkModeIcon: ReactNode;
};

export function DesktopActions(props: Readonly<DesktopActionsProps>) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        minWidth: 0,
        justifySelf: "end",
      }}
    >
      <AuthActionGroup
        loggedIn={Boolean(props.session?.loggedIn)}
        canAdmin={Boolean(props.session?.canAdmin)}
        changeRequestsCount={props.changeRequestsCount}
        onNavigate={props.onNavigate}
        onLogout={props.onLogout}
      />
      <LocaleSwitch
        us={props.us}
        query={props.query}
        localeSwitchAriaLabel={props.localeSwitchAriaLabel}
        resetNavigationState={props.resetNavigationState}
        onNavigate={props.onNavigate}
        SwitchComponent={props.SwitchComponent}
      />
      <Tooltip title={props.darkModeEnabled ? "Zu hellem Modus wechseln" : "Zu dunklem Modus wechseln"}>
        <IconButton
          color="inherit"
          aria-label={props.darkModeEnabled ? "Hellmodus aktivieren" : "Darkmode aktivieren"}
          onClick={props.toggleTheme}
        >
          {props.darkModeIcon}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
