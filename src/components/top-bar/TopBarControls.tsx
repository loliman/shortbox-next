"use client";

import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import CircularProgress from "@mui/material/CircularProgress";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import {
  AppSearchIcon,
  AppBugIcon,
  AppClockIcon,
  AppLoginIcon,
  AppLogoutIcon,
  AppLightIcon,
  AppDarkIcon,
  AppAppleIcon,
  AppAndroidIcon,
} from "../generic/Icons";
import { useThemeModeContext } from "../generic/AppContext";
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
    slotProps?: {
      input?: Record<string, string>;
    };
    onChange: () => void;
    disabled?: boolean;
  }>;
  pending?: boolean;
};

export function LocaleSwitch(props: Readonly<LocaleSwitchProps>) {
  const themeContext = useThemeModeContext();
  const flavor = themeContext?.designFlavor ?? "mac";

  const handleSwitch = (targetUs: boolean) => {
    if (targetUs === props.us || props.pending) return;
    props.resetNavigationState?.();
    props.onNavigate(buildRouteHref(targetUs ? "/us" : "/de", props.query, { filter: null }));
  };

  if (flavor === "mac") {
    return (
      <Box
        sx={{
          ml: 0.75,
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          "--switch-bg": "rgba(0, 0, 0, 0.40)",
          "--switch-border": "rgba(255, 255, 255, 0.16)",
          "--switch-card-bg": "rgba(255, 255, 255, 0.18)",
          backgroundColor: "var(--switch-bg) !important",
          border: "1px solid",
          borderColor: "var(--switch-border) !important",
          borderRadius: "8px",
          padding: "2px",
          height: 28,
          userSelect: "none",
          cursor: props.pending ? "default" : "pointer",
          opacity: props.pending ? 0.7 : 1,
          transition: "opacity 150ms ease",
        }}
      >
        {/* Sliding Active Card */}
        <Box
          sx={{
            position: "absolute",
            top: 2,
            left: props.us ? "calc(50% + 1px)" : 2,
            width: "calc(50% - 3px)",
            height: "calc(100% - 4px)",
            backgroundColor: "var(--switch-card-bg)",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)",
            borderRadius: "6px",
            transition: "left 200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            zIndex: 1,
          }}
        />

        <Box
          onClick={() => handleSwitch(false)}
          sx={{
            position: "relative",
            zIndex: 2,
            width: 38,
            textAlign: "center",
            fontSize: "0.8rem",
            fontWeight: props.us ? 600 : 800,
            color: props.us ? "rgba(255, 255, 255, 0.55) !important" : "#ffffff !important",
            transition: "color 200ms ease",
          }}
        >
          DE
        </Box>
        <Box
          onClick={() => handleSwitch(true)}
          sx={{
            position: "relative",
            zIndex: 2,
            width: 38,
            textAlign: "center",
            fontSize: "0.8rem",
            fontWeight: props.us ? 800 : 600,
            color: props.us ? "#ffffff !important" : "rgba(255, 255, 255, 0.55) !important",
            transition: "color 200ms ease",
          }}
        >
          US
        </Box>

        {props.pending && (
          <CircularProgress
            size={12}
            sx={{
              position: "absolute",
              right: 4,
              top: "50%",
              marginTop: "-6px",
              color: "primary.main",
            }}
          />
        )}
      </Box>
    );
  }

  // Material Design 3 Toggle/Switch Mode
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
        backgroundColor: props.us ? theme.palette.primary.main : theme.palette.background.paper,
        borderColor: props.us ? theme.palette.primary.main : theme.palette.divider,
      })}
    >
      <Typography
        onClick={() => handleSwitch(false)}
        sx={{
          fontSize: "0.8rem",
          fontWeight: props.us ? 600 : 700,
          color: props.us ? "text.secondary" : "primary.contrastText",
          cursor: "pointer",
        }}
      >
        DE
      </Typography>
      <Tooltip describeChild title={"Wechseln zu " + (props.us ? "Deutsch" : "US")}>
        <Box
          component="label"
          sx={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }}
        >
          <props.SwitchComponent
            checked={props.us}
            color="primary"
            disabled={props.pending}
            onChange={() => handleSwitch(!props.us)}
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
        onClick={() => handleSwitch(true)}
        sx={{
          fontSize: "0.8rem",
          fontWeight: props.us ? 700 : 600,
          color: props.us ? "primary.contrastText" : "text.secondary",
          cursor: "pointer",
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

export function AuthActionGroup(props: Readonly<AuthActionGroupProps & { flavor?: "mac" | "material" }>) {
  const hasChangeRequests = props.changeRequestsCount > 0;
  const flavor = props.flavor ?? "mac";

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
                <AppBugIcon flavor={flavor} sx={{ color: "common.white" }} />
              ) : (
                <AppBugIcon flavor={flavor} />
              )}
            </IconButton>
          </Badge>
        </Tooltip>
      ) : null}
      {props.loggedIn && props.canAdmin && props.previewImportActive ? (
        <Tooltip title="Neue Panini Vorschau zum Review bereit">
          <IconButton
            color="primary"
            aria-label="Panini Vorschau Review"
            onClick={() => props.onNavigate("/admin/preview-import")}
          >
            <Badge color="primary" variant="dot">
              <AutoStoriesOutlinedIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      ) : null}
      {props.loggedIn && props.canAdmin ? (
        <Tooltip title="Adminpanel">
          <IconButton
            color="inherit"
            aria-label="Adminpanel"
            onClick={() => props.onNavigate("/admin/tasks")}
          >
            <AppClockIcon flavor={flavor} />
          </IconButton>
        </Tooltip>
      ) : null}
      {props.loggedIn ? (
        <Tooltip title="Logout">
          <IconButton color="inherit" aria-label="Logout" onClick={props.onLogout}>
            <AppLogoutIcon flavor={flavor} />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Login">
          <IconButton color="inherit" aria-label="Login" onClick={() => props.onNavigate("/login")}>
            <AppLoginIcon flavor={flavor} />
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
  const themeContext = useThemeModeContext();
  const flavor = themeContext?.designFlavor ?? "mac";

  return (
    <Box
      data-testid="mobile-bottom-bar"
      sx={(theme) => ({
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
        backgroundColor: flavor === "mac"
          ? "var(--shortbox-glass-bg-drawer) !important"
          : (theme.palette.mode === "dark" ? "#211f26 !important" : "#f3edf7 !important"),
        color: "text.primary",
        backdropFilter: flavor === "mac" ? "var(--shortbox-glass-blur)" : "none",
        borderTop: "1px solid",
        borderColor: flavor === "mac"
          ? (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)")
          : "divider",
        boxShadow: flavor === "mac" ? "none" : theme.shadows[4],
        transition: "background-color 250ms ease, color 250ms ease, border-color 250ms ease, box-shadow 250ms ease",
      })}
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
        <AppSearchIcon flavor={flavor} />
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
        flavor={flavor}
      />
      <Box sx={{ ml: 0.25, display: "inline-flex", alignItems: "center", gap: 0.35 }}>
        <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, opacity: props.us ? 0.6 : 1, color: "text.primary" }}>
          DE
        </Typography>
        <Tooltip describeChild title={"Wechseln zu " + (props.us ? "Deutsch" : "US")}>
          <Box sx={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <props.SwitchComponent
              checked={props.us}
              color="primary"
              disabled={props.navigationPending}
              inputProps={{ "aria-label": props.localeSwitchAriaLabel }}
              slotProps={{ input: { "aria-label": props.localeSwitchAriaLabel } }}
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
        <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, opacity: props.us ? 1 : 0.6, color: "text.primary" }}>
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
  navigationPending?: boolean;
  onLogout: () => void;
  resetNavigationState?: () => void;
  SwitchComponent: LocaleSwitchProps["SwitchComponent"];
};

export function DesktopActions(props: Readonly<DesktopActionsProps>) {
  const themeContext = useThemeModeContext();
  const flavor = themeContext?.designFlavor ?? "mac";

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
        flavor={flavor}
      />
      <ThemeToggleButton onClick={props.toggleTheme} />
      <LocaleSwitch
        us={props.us}
        query={props.query}
        localeSwitchAriaLabel={props.localeSwitchAriaLabel}
        onNavigate={props.onNavigate}
        resetNavigationState={props.resetNavigationState}
        SwitchComponent={props.SwitchComponent}
        pending={props.navigationPending}
      />
    </Box>
  );
}

export function ThemeToggleButton(props: Readonly<{ onClick?: () => void }>) {
  const themeContext = useThemeModeContext();
  const flavor = themeContext?.designFlavor ?? "mac";

  return (
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
        <AppDarkIcon flavor={flavor} className="theme-icon theme-icon-dark" />
        <AppLightIcon flavor={flavor} className="theme-icon theme-icon-light" />
      </Box>
    </IconButton>
  );
}
