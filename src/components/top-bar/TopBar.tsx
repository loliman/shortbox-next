"use client";

import Toolbar from "@mui/material/Toolbar";
import Switch from "@mui/material/Switch";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import React from "react";
import Link from "next/link";
import { alpha, styled } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import ButtonBase from "@mui/material/ButtonBase";
import SearchBar from "./SearchBar";
import type { SelectedRoot } from "../../types/domain";
import TopBarFilterMenu from "./TopBarFilterMenu";
import {
  DesktopActions,
  MobileBottomBar,
  ThemeToggleButton,
} from "./TopBarControls";
import CloseIcon from "@mui/icons-material/Close";
import { isMockMode } from "../../app/mockMode";
import { mutationRequest } from "../../lib/client/mutation-request";
import type { RouteQuery } from "../../types/route-ui";
import { buildRouteHref } from "../generic/routeHref";
import { usePendingNavigation } from "../generic/usePendingNavigation";

interface TopBarProps {
  toggleDrawer?: () => void;
  drawerOpen?: boolean;
  us: boolean;
  showNavigation?: boolean;
  compactLayout?: boolean;
  session?: { loggedIn?: boolean } | null;
  query?: RouteQuery | null;
  selected: SelectedRoot;
  resetNavigationState?: () => void;
  toggleTheme?: () => void;
  enqueueSnackbar?: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
  initialFilterCount?: number | null;
  changeRequestsCount?: number;
  previewImportActive?: boolean;
}

const SEARCH_MAX_WIDTH = 520;
const Android12Switch = styled(Switch)(({ theme }) => ({
  padding: 8,
  width: 62,
  height: 34,
  "& .MuiSwitch-track": {
    borderRadius: 22 / 2,
    opacity: 1,
    backgroundColor: alpha(theme.palette.common.white, 0.24),
    border: `1px solid ${alpha(theme.palette.common.white, 0.32)}`,
    ...theme.applyStyles("dark", {
      backgroundColor: alpha(theme.palette.text.secondary, 0.26),
      border: `1px solid ${alpha(theme.palette.text.secondary, 0.45)}`,
    }),
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
    backgroundColor: theme.vars?.palette.background.paper ?? theme.palette.background.paper,
    border: `1px solid ${alpha(theme.palette.text.primary, 0.14)}`,
    ...theme.applyStyles("dark", {
      backgroundColor: theme.palette.common.white,
      border: `1px solid ${alpha(theme.palette.common.black, 0.24)}`,
    }),
    width: 20,
    height: 20,
    margin: 0,
  },
}));

export default function TopBar(ownProps: TopBarProps) {
  const {
    isPending: navigationPending,
    push: pushNavigation,
    refresh: refreshNavigation,
  } = usePendingNavigation();
  const toggleDrawer = ownProps.toggleDrawer;
  const drawerOpen = ownProps.drawerOpen;
  const us = Boolean(ownProps.us);
  const selected = ownProps.selected || { us };
  const query = ownProps.query as
    | { filter?: string | null; order?: string | null; direction?: string | null }
    | null
    | undefined;
  const showNavigation = ownProps.showNavigation ?? true;
  const compactLayout = Boolean(ownProps.compactLayout);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const isFilter =
    typeof query?.filter === "string" ? query.filter : query?.filter ? String(query.filter) : null;
  const localeSwitchAriaLabel = us ? "Zu Deutsch wechseln" : "Zu US wechseln";
  const changeRequestsCount = ownProps.changeRequestsCount ?? 0;
  const previewImportActive = Boolean(ownProps.previewImportActive);

  const onLogout = async () => {
    if (isMockMode) {
      ownProps.enqueueSnackbar?.("Auf Wiedersehen!", { variant: "success" });
      refreshNavigation();
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
      refreshNavigation();
    } catch (error) {
      const message = error instanceof Error && error.message ? ` [${error.message}]` : "";
      ownProps.enqueueSnackbar?.("Logout fehlgeschlagen" + message, { variant: "error" });
    }
  };

  const navigate = React.useCallback((href: string) => pushNavigation(href), [pushNavigation]);

  return (
    <AppBar
      position="sticky"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        position: "sticky",
        overflow: "visible",
        backgroundColor: "rgb(0, 0, 0)",
        backgroundImage: "none",
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        borderBottomColor: (theme) => theme.vars?.palette.divider ?? theme.palette.divider,
      }}
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
        <TopBarStart
          compactLayout={compactLayout}
          showNavigation={showNavigation}
          drawerOpen={drawerOpen}
          toggleDrawer={toggleDrawer}
          us={us}
          query={query}
          resetNavigationState={ownProps.resetNavigationState}
        />

        <TopBarCompactActions
          compactLayout={compactLayout}
          toggleTheme={ownProps.toggleTheme}
        />

        <TopBarSearchCenter
          compactLayout={compactLayout}
          us={us}
          selected={selected}
          isFilterActive={isFilter}
          initialFilterCount={ownProps.initialFilterCount}
          query={query}
          session={ownProps.session}
          navigationPending={navigationPending}
        />

        {compactLayout ? null : (
          <DesktopActions
            us={us}
            session={ownProps.session}
            query={query}
            localeSwitchAriaLabel={localeSwitchAriaLabel}
            changeRequestsCount={changeRequestsCount}
            previewImportActive={previewImportActive}
            toggleTheme={ownProps.toggleTheme}
            onNavigate={navigate}
            navigationPending={navigationPending}
            onLogout={onLogout}
            resetNavigationState={ownProps.resetNavigationState}
            SwitchComponent={Android12Switch}
          />
        )}
      </Toolbar>

      {compactLayout && mobileSearchOpen ? (
        <MobileSearchOverlay
          us={us}
          compactLayout={compactLayout}
          onClose={() => setMobileSearchOpen(false)}
        />
      ) : null}

      {compactLayout ? (
        <MobileBottomBar
          us={us}
          session={ownProps.session}
          query={query}
          selected={selected}
          isFilterActive={isFilter}
          initialFilterCount={ownProps.initialFilterCount}
          localeSwitchAriaLabel={localeSwitchAriaLabel}
          changeRequestsCount={changeRequestsCount}
          previewImportActive={previewImportActive}
          onOpenSearch={() => setMobileSearchOpen(true)}
          onToggleDrawer={showNavigation ? () => toggleDrawer?.() : undefined}
          onNavigate={navigate}
          navigationPending={navigationPending}
          onLogout={onLogout}
          resetNavigationState={ownProps.resetNavigationState}
          SwitchComponent={Android12Switch}
          HamburgerIconComponent={HamburgerIcon}
          drawerOpen={drawerOpen}
          showNavigation={showNavigation}
          FilterButton={TopBarFilterMenu}
        />
      ) : null}

    </AppBar>
  );
}

function TopBarStart(props: {
  compactLayout: boolean;
  showNavigation: boolean;
  drawerOpen?: boolean;
  toggleDrawer?: () => void;
  us: boolean;
  query?: RouteQuery | null;
  resetNavigationState?: () => void;
}) {
  const homeHref = buildRouteHref(props.us ? "/us" : "/de", props.query);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        minWidth: 0,
        flexShrink: 0,
      }}
    >
      {!props.showNavigation || props.compactLayout ? null : (
        <IconButton
          color="inherit"
          aria-label="Navigation umschalten"
          onClick={() => props.toggleDrawer?.()}
          sx={{ mr: 0.5 }}
        >
          <HamburgerIcon open={Boolean(props.drawerOpen)} />
        </IconButton>
      )}

      <ButtonBase
        component={Link}
        href={homeHref}
        aria-label="Zur Startseite"
        onClick={() => {
          props.resetNavigationState?.();
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
  );
}

function TopBarCompactActions(props: {
  compactLayout: boolean;
  toggleTheme?: () => void;
}) {
  if (!props.compactLayout) return null;

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
      <ThemeToggleButton onClick={props.toggleTheme} />
    </Box>
  );
}

function TopBarSearchCenter(props: {
  compactLayout: boolean;
  us: boolean;
  selected: SelectedRoot;
  isFilterActive?: string | null;
  initialFilterCount?: number | null;
  query?: { filter?: string | null; order?: string | null; direction?: string | null } | null;
  session?: { loggedIn?: boolean } | null;
  navigationPending?: boolean;
}) {
  return (
    <Box
      sx={{
        minWidth: 0,
        width: "100%",
        maxWidth: SEARCH_MAX_WIDTH + 52,
        justifySelf: "center",
        px: 1,
        display: props.compactLayout ? "none" : "flex",
        alignItems: "center",
        gap: 0.5,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1, position: "relative" }}>
        <SearchBar
          us={props.us}
          compactLayout={false}
        />
        {props.navigationPending ? (
          <CircularProgress
            size={16}
            sx={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 1,
            }}
          />
        ) : null}
      </Box>
      <TopBarFilterMenu
        us={props.us}
        selected={props.selected}
        isFilterActive={props.isFilterActive}
        initialFilterCount={props.initialFilterCount}
        query={props.query}
        session={props.session}
      />
    </Box>
  );
}

function MobileSearchOverlay(props: {
  us: boolean;
  compactLayout: boolean;
  onClose: () => void;
}) {
  return (
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
            us={props.us}
            autoFocus={true}
            compactLayout={true}
            onFocus={(
              _event: React.FocusEvent<HTMLElement> | React.MouseEvent<HTMLElement> | null,
              focus: boolean
            ) => {
              if (!focus) props.onClose();
            }}
          />
        </Box>
        <IconButton
          size="small"
          color="inherit"
          aria-label="Suche schließen"
          onClick={props.onClose}
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
