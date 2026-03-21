"use client";

import Toolbar from "@mui/material/Toolbar";
import Switch from "@mui/material/Switch";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { alpha, styled } from "@mui/material/styles";
import type { HierarchyLevelType } from "../../util/hierarchy";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import ButtonBase from "@mui/material/ButtonBase";
import SearchBar from "./SearchBar";
import type { SelectedRoot } from "../../types/domain";
import TopBarFilterMenu from "./TopBarFilterMenu";
import Tooltip from "@mui/material/Tooltip";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import WatchLaterIcon from "@mui/icons-material/WatchLater";
import BugReportIcon from "@mui/icons-material/BugReport";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import type { AppThemeMode } from "../../app/theme";
import { isMockMode } from "../../app/mockMode";
import { buildRouteHref } from "../generic/routeHref";
import { mutationRequest } from "../../lib/client/mutation-request";
import type { AppRouteContextValue } from "../../app/routeContext";

interface TopBarProps {
  routeContext: AppRouteContextValue;
  toggleDrawer?: () => void;
  drawerOpen?: boolean;
  us?: boolean;
  isPhone?: boolean;
  isPhoneLandscape?: boolean;
  isTablet?: boolean;
  isTabletLandscape?: boolean;
  isPhonePortrait?: boolean;
  compactLayout?: boolean;
  level?: HierarchyLevelType;
  session?: { loggedIn?: boolean } | null;
  query?: { filter?: string | null; order?: string | null; direction?: string | null } | null;
  selected?: SelectedRoot;
  resetNavigationState?: () => void;
  themeMode?: AppThemeMode;
  toggleTheme?: () => void;
  enqueueSnackbar?: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
  handleLogout?: () => void;
  initialFilterCount?: number | null;
  changeRequestsCount?: number;
}

const SEARCH_MAX_WIDTH = 520;
const Android12Switch = styled(Switch)(({ theme }) => ({
  padding: 8,
  width: 62,
  height: 34,
  "& .MuiSwitch-track": {
    borderRadius: 22 / 2,
    opacity: 1,
    backgroundColor:
      theme.palette.mode === "dark"
        ? alpha(theme.palette.text.secondary, 0.26)
        : alpha(theme.palette.common.white, 0.24),
    border: `1px solid ${
      theme.palette.mode === "dark"
        ? alpha(theme.palette.text.secondary, 0.45)
        : alpha(theme.palette.common.white, 0.32)
    }`,
    "&::before, &::after": {
      content: '""',
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      width: 16,
      height: 16,
    },
    "&::before": {
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
        theme.palette.getContrastText(theme.palette.primary.main)
      )}" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>')`,
      left: 12,
    },
    "&::after": {
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
        theme.palette.getContrastText(theme.palette.primary.main)
      )}" d="M19,13H5V11H19V13Z" /></svg>')`,
      right: 12,
    },
  },
  "& .MuiSwitch-switchBase": {
    margin: 0,
    padding: 7,
    transitionDuration: "220ms",
    "&.Mui-checked": {
      transform: "translateX(28px)",
      color: theme.palette.common.white,
      "& + .MuiSwitch-track": {
        backgroundColor: theme.palette.success.main,
        borderColor: theme.palette.success.main,
        opacity: 1,
      },
    },
  },
  "& .MuiSwitch-thumb": {
    boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
    backgroundColor:
      theme.palette.mode === "dark" ? theme.palette.common.white : theme.palette.background.paper,
    border: `1px solid ${
      theme.palette.mode === "dark"
        ? alpha(theme.palette.common.black, 0.24)
        : alpha(theme.palette.text.primary, 0.14)
    }`,
    width: 20,
    height: 20,
    margin: 0,
  },
}));

export default function TopBar(ownProps: TopBarProps) {
  const router = useRouter();
  const { routeContext } = ownProps;
  const toggleDrawer = ownProps.toggleDrawer;
  const drawerOpen = ownProps.drawerOpen;
  const us = Boolean(ownProps.us ?? routeContext.us);
  const selected = ownProps.selected || routeContext.selected || { us };
  const query = (ownProps.query ?? routeContext.query ?? null) as
    | { filter?: string | null; order?: string | null; direction?: string | null }
    | null;
  const compactLayout =
    ownProps.compactLayout ?? Boolean(ownProps.isPhone || (ownProps.isTablet && !ownProps.isTabletLandscape));
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const isFilter =
    typeof query?.filter === "string" ? query.filter : query?.filter ? String(query.filter) : null;
  const darkModeEnabled = ownProps.themeMode === "dark";
  const localeSwitchAriaLabel = us ? "Zu Deutsch wechseln" : "Zu US wechseln";
  const changeRequestsCount = ownProps.changeRequestsCount ?? 0;
  const hasChangeRequests = changeRequestsCount > 0;

  const onLogout = async () => {
    if (isMockMode) {
      ownProps.enqueueSnackbar?.("Auf Wiedersehen!", { variant: "success" });
      ownProps.handleLogout?.();
      return;
    }

    try {
      const result = await mutationRequest<{ success?: boolean }>({
        url: "/api/auth/logout",
        method: "POST",
      });

      if (!result.success) {
        ownProps.enqueueSnackbar?.("Logout fehlgeschlagen", { variant: "error" });
        return;
      }

      ownProps.enqueueSnackbar?.("Auf Wiedersehen!", { variant: "success" });
      ownProps.handleLogout?.();
    } catch (error) {
      const message = error instanceof Error && error.message ? ` [${error.message}]` : "";
      ownProps.enqueueSnackbar?.("Logout fehlgeschlagen" + message, { variant: "error" });
    }
  };

  return (
    <AppBar
      position="sticky"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, position: "sticky", overflow: "visible" }}
    >
      <Toolbar
        sx={{
          display: compactLayout ? "flex" : "grid",
          alignItems: "center",
          justifyContent: compactLayout ? "space-between" : undefined,
          width: "100%",
          columnGap: 1,
          gridTemplateColumns: {
            xs: "auto minmax(148px, 1fr) auto",
            sm: "minmax(0, 1fr) minmax(220px, 520px) minmax(0, 1fr)",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minWidth: 0,
            flexShrink: 0,
          }}
        >
          {compactLayout ? null : (
            <IconButton
              color="inherit"
              aria-label="Navigation umschalten"
              onClick={() => toggleDrawer?.()}
              sx={{ mr: 0.5 }}
            >
              <HamburgerIcon open={Boolean(drawerOpen)} />
            </IconButton>
          )}

          <ButtonBase
            component={Link}
            href={us ? "/us" : "/de"}
            aria-label="Zur Startseite"
            onClick={() => {
              ownProps.resetNavigationState?.();
            }}
            sx={{
              display: "inline-flex",
              lineHeight: 0,
              borderRadius: 1,
              px: 0.25,
            }}
          >
            <Box component="img" src="/Shortbox_Logo.png" alt="Shortbox" sx={{ height: 34 }} />
          </ButtonBase>
        </Box>

        {compactLayout ? (
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
            <Tooltip title={darkModeEnabled ? "Zu hellem Modus wechseln" : "Zu dunklem Modus wechseln"}>
              <IconButton
                color="inherit"
                aria-label={darkModeEnabled ? "Hellmodus aktivieren" : "Darkmode aktivieren"}
                onClick={ownProps.toggleTheme}
              >
                {darkModeEnabled ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        ) : null}

        <Box
          data-testid="topbar-search-center"
          sx={{
            minWidth: 0,
            width: "100%",
            maxWidth: SEARCH_MAX_WIDTH + 52,
            justifySelf: "center",
            px: 1,
            display: compactLayout ? "none" : "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          {compactLayout ? null : (
            <>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <SearchBar
                  us={us}
                  compactLayout={compactLayout}
                  isPhone={ownProps.isPhone}
                  isTablet={ownProps.isTablet}
                  isTabletLandscape={ownProps.isTabletLandscape}
                />
              </Box>
              <TopBarFilterMenu
                us={us}
                selected={selected}
                isFilterActive={isFilter}
                query={query}
                session={ownProps.session}
                initialCount={ownProps.initialFilterCount}
              />
            </>
          )}
        </Box>

        {compactLayout ? null : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              minWidth: 0,
              justifySelf: "end",
            }}
          >
            {ownProps.session?.loggedIn ? (
              <Tooltip title="Change Requests">
                <Badge
                  color="secondary"
                  overlap="circular"
                  showZero={false}
                  badgeContent={hasChangeRequests ? changeRequestsCount : undefined}
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
                    onClick={() => router.push("/admin/change-requests")}
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
            {ownProps.session?.loggedIn ? (
              <Tooltip title="Adminpanel">
                <IconButton
                  color="inherit"
                  aria-label="Adminpanel"
                  onClick={() => router.push("/admin/tasks")}
                >
                  <WatchLaterIcon />
                </IconButton>
              </Tooltip>
            ) : null}
            {!ownProps.session?.loggedIn ? (
              <Tooltip title="Login">
                <IconButton
                  color="inherit"
                  aria-label="Login"
                  onClick={() => router.push("/login")}
                >
                  <LoginIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Logout">
                <IconButton color="inherit" aria-label="Logout" onClick={onLogout}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            )}

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
                  us
                    ? theme.palette.mode === "dark"
                      ? "rgba(96, 165, 250, 0.6)"
                      : "rgba(59, 130, 246, 0.28)"
                    : theme.palette.divider,
                backgroundColor: (theme) =>
                  us
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
                  fontWeight: us ? 500 : 700,
                  opacity: us ? 0.65 : 1,
                }}
              >
                DE
              </Typography>
              <Tooltip title={"Wechseln zu " + (us ? "Deutsch" : "US")}>
                <Android12Switch
                  checked={us}
                  color="primary"
                  inputProps={{ "aria-label": localeSwitchAriaLabel }}
                  onChange={() => {
                    ownProps.resetNavigationState?.();
                    router.push(buildRouteHref(us ? "/de" : "/us", query, { filter: null }));
                  }}
                />
              </Tooltip>
              <Typography
                sx={{
                  fontSize: "0.74rem",
                  fontWeight: us ? 700 : 500,
                  opacity: us ? 1 : 0.65,
                }}
              >
                US
              </Typography>
            </Box>
            <Tooltip title={darkModeEnabled ? "Zu hellem Modus wechseln" : "Zu dunklem Modus wechseln"}>
              <IconButton
                color="inherit"
                aria-label={darkModeEnabled ? "Hellmodus aktivieren" : "Darkmode aktivieren"}
                onClick={ownProps.toggleTheme}
              >
                {darkModeEnabled ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Toolbar>

      {compactLayout && mobileSearchOpen ? (
        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            zIndex: (theme) => theme.zIndex.drawer + 3,
            px: 0,
            py: 0.75,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "#0f172a" : theme.palette.primary.main,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ width: "95vw", mx: "auto", position: "relative" }}>
            <Box sx={{ minWidth: 0, pr: 7.5 }}>
              <SearchBar
                us={us}
                autoFocus={true}
                compactLayout={compactLayout}
                isPhone={ownProps.isPhone}
                isTablet={ownProps.isTablet}
                isTabletLandscape={ownProps.isTabletLandscape}
                onFocus={(
                  _event: React.FocusEvent<HTMLElement> | React.MouseEvent<HTMLElement> | null,
                  focus: boolean
                ) => {
                  if (!focus) setMobileSearchOpen(false);
                }}
              />
            </Box>
            <IconButton
              size="small"
              color="inherit"
              aria-label="Suche schließen"
              onClick={() => setMobileSearchOpen(false)}
              sx={{
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: (theme) => theme.zIndex.appBar + 4,
                p: 0.75,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? alpha(theme.palette.common.white, 0.08)
                    : alpha(theme.palette.common.black, 0.12),
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? alpha(theme.palette.common.white, 0.14)
                    : alpha(theme.palette.common.black, 0.12),
                "&:hover": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? alpha(theme.palette.common.white, 0.14)
                      : alpha(theme.palette.common.black, 0.18),
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      ) : null}

      {compactLayout ? (
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
          <IconButton color="inherit" aria-label="Navigation umschalten" onClick={() => toggleDrawer?.()}>
            <HamburgerIcon open={Boolean(drawerOpen)} />
          </IconButton>
          <IconButton color="inherit" aria-label="Suche öffnen" onClick={() => setMobileSearchOpen(true)}>
            <SearchIcon />
          </IconButton>
          <TopBarFilterMenu
            us={us}
            selected={selected}
            isFilterActive={isFilter}
            query={query}
            session={ownProps.session}
            initialCount={ownProps.initialFilterCount}
          />
          {ownProps.session?.loggedIn ? (
            <Tooltip title="Change Requests">
              <Badge
                color="secondary"
                overlap="circular"
                showZero={false}
                badgeContent={hasChangeRequests ? changeRequestsCount : undefined}
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
                  onClick={() => router.push("/admin/change-requests")}
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
          {ownProps.session?.loggedIn ? (
            <Tooltip title="Adminpanel">
              <IconButton
                color="inherit"
                aria-label="Adminpanel"
                onClick={() => router.push("/admin/tasks")}
              >
                <WatchLaterIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          {!ownProps.session?.loggedIn ? (
            <Tooltip title="Login">
              <IconButton
                color="inherit"
                aria-label="Login"
                onClick={() => router.push("/login")}
              >
                <LoginIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Logout">
              <IconButton color="inherit" aria-label="Logout" onClick={onLogout}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          )}
          <Box sx={{ ml: 0.25, display: "inline-flex", alignItems: "center", gap: 0.35 }}>
            <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, opacity: us ? 0.7 : 1 }}>DE</Typography>
            <Tooltip title={"Wechseln zu " + (us ? "Deutsch" : "US")}>
              <Android12Switch
                checked={us}
                color="primary"
                inputProps={{ "aria-label": localeSwitchAriaLabel }}
                onChange={() => {
                  ownProps.resetNavigationState?.();
                  router.push(buildRouteHref(us ? "/de" : "/us", query, { filter: null }));
                }}
              />
            </Tooltip>
            <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, opacity: us ? 1 : 0.7 }}>US</Typography>
          </Box>
        </Box>
      ) : null}

    </AppBar>
  );
}

function HamburgerIcon(props: { open: boolean }) {
  const barSx = {
    position: "absolute" as const,
    left: 0,
    width: "100%",
    height: 2,
    borderRadius: 999,
    backgroundColor: "currentColor",
    transition: "transform 220ms ease, opacity 220ms ease, top 220ms ease",
  };

  return (
    <Box
      component="span"
      sx={{
        position: "relative",
        display: "inline-block",
        width: 18,
        height: 14,
      }}
      aria-hidden
    >
      <Box
        component="span"
        sx={{
          ...barSx,
          top: props.open ? 6 : 0,
          transform: props.open ? "rotate(45deg)" : "none",
        }}
      />
      <Box
        component="span"
        sx={{
          ...barSx,
          top: 6,
          opacity: props.open ? 0 : 1,
          transform: props.open ? "scaleX(0.7)" : "none",
        }}
      />
      <Box
        component="span"
        sx={{
          ...barSx,
          top: props.open ? 6 : 12,
          transform: props.open ? "rotate(-45deg)" : "none",
        }}
      />
    </Box>
  );
}
