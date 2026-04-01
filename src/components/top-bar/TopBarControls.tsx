"use client";

import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import CircularProgress from "@mui/material/CircularProgress";
import BugReportIcon from "@mui/icons-material/BugReport";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import WatchLaterIcon from "@mui/icons-material/WatchLater";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import SearchIcon from "@mui/icons-material/Search";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
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
    disabled?: boolean;
  }>;
  pending?: boolean;
};

export function LocaleSwitch(props: Readonly<LocaleSwitchProps>) {
  const switchLabelId = React.useId();

  return (
    <Box
      sx={(theme) => ({
        ml: 0.75,
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1,
        py: 0.5,
        borderRadius: 999,
        border: "1px solid",
        borderColor: props.us ? "#93c5fd" : "rgba(255,255,255,0.28)",
        backgroundColor: props.us ? "#1d4ed8" : "#1f2937",
        ...(props.us
          ? theme.applyStyles("dark", {
              borderColor: "#bfdbfe",
              backgroundColor: "#1d4ed8",
            })
          : theme.applyStyles("dark", {
              backgroundColor: "#1f2937",
            })),
      })}
    >
      <Typography
        sx={{
          fontSize: "0.8rem",
          fontWeight: props.us ? 600 : 700,
          color: "common.white",
        }}
      >
        DE
      </Typography>
      <Tooltip describeChild title={"Wechseln zu " + (props.us ? "Deutsch" : "US")}>
        <Box
          component="label"
          sx={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }}
        >
          <Box
            component="span"
            id={switchLabelId}
            sx={{
              position: "absolute",
              width: 1,
              height: 1,
              p: 0,
              m: -1,
              overflow: "hidden",
              clip: "rect(0 0 0 0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          >
            {props.localeSwitchAriaLabel}
          </Box>
          <props.SwitchComponent
            checked={props.us}
            color="primary"
            disabled={props.pending}
            inputProps={{
              "aria-label": props.localeSwitchAriaLabel,
              "aria-labelledby": switchLabelId,
            }}
            onChange={() => {
              props.resetNavigationState?.();
              props.onNavigate(buildRouteHref(props.us ? "/de" : "/us", props.query, { filter: null }));
            }}
          />
          {props.pending ? (
            <CircularProgress
              size={16}
              sx={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
              }}
            />
          ) : null}
        </Box>
      </Tooltip>
      <Typography
        sx={{
          fontSize: "0.8rem",
          fontWeight: props.us ? 700 : 600,
          color: "common.white",
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
  previewImportActive: boolean;
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
  previewImportActive: boolean;
  onOpenSearch: () => void;
  onToggleDrawer?: () => void;
  onNavigate: (href: string) => void;
  onLogout: () => void;
  resetNavigationState?: () => void;
  SwitchComponent: LocaleSwitchProps["SwitchComponent"];
  HamburgerIconComponent: React.ComponentType<{ open: boolean }>;
  drawerOpen?: boolean;
  showNavigation?: boolean;
  navigationPending?: boolean;
  FilterButton: React.ComponentType<{
    us: boolean;
    selected: unknown;
    isFilterActive?: boolean | string | null;
    initialFilterCount?: number | null;
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
      {props.showNavigation ? (
        <IconButton
          color="inherit"
          aria-label="Navigation umschalten"
          onClick={props.onToggleDrawer}
        >
          <props.HamburgerIconComponent open={Boolean(props.drawerOpen)} />
        </IconButton>
      ) : null}
      <IconButton color="inherit" aria-label="Suche öffnen" onClick={props.onOpenSearch}>
        <SearchIcon />
      </IconButton>
      <props.FilterButton
        us={props.us}
        selected={props.selected}
        isFilterActive={props.isFilterActive}
        initialFilterCount={props.initialFilterCount}
        query={props.query as { filter?: string | null } | null}
        session={props.session}
      />
      <AuthActionGroup
        loggedIn={Boolean(props.session?.loggedIn)}
        canAdmin={Boolean(props.session?.canAdmin)}
        changeRequestsCount={props.changeRequestsCount}
        previewImportActive={props.previewImportActive}
        onNavigate={props.onNavigate}
        onLogout={props.onLogout}
      />
      <Box sx={{ ml: 0.25, display: "inline-flex", alignItems: "center", gap: 0.35 }}>
        <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, opacity: props.us ? 0.92 : 1, color: "common.white" }}>
          DE
        </Typography>
        <Tooltip describeChild title={"Wechseln zu " + (props.us ? "Deutsch" : "US")}>
          <Box sx={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <props.SwitchComponent
              checked={props.us}
              color="primary"
              disabled={props.navigationPending}
              inputProps={{ "aria-label": props.localeSwitchAriaLabel }}
              onChange={() => {
                props.resetNavigationState?.();
                props.onNavigate(buildRouteHref(props.us ? "/de" : "/us", props.query, { filter: null }));
              }}
            />
            {props.navigationPending ? (
              <CircularProgress
                size={16}
                sx={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                }}
              />
            ) : null}
          </Box>
        </Tooltip>
        <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, opacity: props.us ? 1 : 0.92, color: "common.white" }}>
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
  previewImportActive: boolean;
  toggleTheme?: () => void;
  onNavigate: (href: string) => void;
  onLogout: () => void;
  resetNavigationState?: () => void;
  SwitchComponent: LocaleSwitchProps["SwitchComponent"];
  navigationPending?: boolean;
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
        previewImportActive={props.previewImportActive}
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
        pending={props.navigationPending}
      />
      <ThemeToggleButton onClick={props.toggleTheme} />
    </Box>
  );
}

export function ThemeToggleButton(props: Readonly<{ onClick?: () => void }>) {
  return (
    <Tooltip title="Theme umschalten">
      <IconButton color="inherit" aria-label="Theme umschalten" onClick={props.onClick}>
        <Box
          sx={(theme) => ({
            position: "relative",
            width: 24,
            height: 24,
            "& .theme-icon": {
              position: "absolute",
              inset: 0,
              transition: "opacity 180ms ease",
            },
            "& .theme-icon-light": {
              opacity: 0,
            },
            ...theme.applyStyles("dark", {
              "& .theme-icon-dark": {
                opacity: 0,
              },
              "& .theme-icon-light": {
                opacity: 1,
              },
            }),
          })}
        >
          <DarkModeIcon className="theme-icon theme-icon-dark" />
          <LightModeIcon className="theme-icon theme-icon-light" />
        </Box>
      </IconButton>
    </Tooltip>
  );
}
