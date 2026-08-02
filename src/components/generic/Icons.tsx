"use client";

import React from "react";
import SvgIcon, { type SvgIconProps } from "@mui/material/SvgIcon";

// Material UI original icon imports
import SearchIcon from "@mui/icons-material/Search";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import AppleIcon from "@mui/icons-material/Apple";
import AndroidIcon from "@mui/icons-material/Android";
import ClearIcon from "@mui/icons-material/Clear";

// Custom SF Symbols SVG paths (thin outlines, 1.5px strokes)

const SFSearch = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 10-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

const SFFilter = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      d="M3 6h18M6 12h12M10 18h4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

const SFMenu = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      d="M3 6.25h18M3 12h18M3 17.75h18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
    />
  </SvgIcon>
);

const SFBug = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      d="M12 2v4M12 6a4 4 0 00-4 4v5a4 4 0 008 0v-5a4 4 0 00-4-4zm-4 4H4m4 3H4m4 3H5.5M16 10h4m-4 3h4m-4 3h2.5M9 6c0-1 1-2 3-2s3 1 3 2"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

const SFClock = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <circle
      cx="12"
      cy="12"
      r="9"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    />
    <path
      d="M12 7v5l3 2"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

const SFLogin = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      d="M10 17l5-5-5-5M15 12H3m10-9h5a3 3 0 013 3v12a3 3 0 01-3 3h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

const SFLogout = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      d="M10 7l-5 5 5 5M5 12h12m-4-9h5a3 3 0 013 3v12a3 3 0 01-3 3h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

const SFLight = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <circle
      cx="12"
      cy="12"
      r="4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    />
    <path
      d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </SvgIcon>
);

const SFDark = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

const SFClear = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      d="M18 6L6 18M6 6l12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </SvgIcon>
);

// Unified dynamic icon components that render based on designFlavor

interface DynamicIconProps extends SvgIconProps {
  flavor?: "mac" | "material";
}

export const AppSearchIcon = ({ flavor = "mac", ...props }: DynamicIconProps) => {
  return flavor === "mac" ? <SFSearch {...props} /> : <SearchIcon {...props} />;
};

export const AppFilterIcon = ({ flavor = "mac", active = false, ...props }: DynamicIconProps & { active?: boolean }) => {
  if (flavor === "mac") {
    return <SFFilter {...props} />;
  }
  return active ? <FilterAltIcon {...props} /> : <FilterAltOutlinedIcon {...props} />;
};

export const AppMenuIcon = ({ flavor = "mac", ...props }: DynamicIconProps) => {
  return flavor === "mac" ? <SFMenu {...props} /> : <MenuIcon {...props} />;
};

export const AppBugIcon = ({ flavor = "mac", ...props }: DynamicIconProps) => {
  return flavor === "mac" ? <SFBug {...props} /> : <BugReportOutlinedIcon {...props} />;
};

export const AppClockIcon = ({ flavor = "mac", ...props }: DynamicIconProps) => {
  return flavor === "mac" ? <SFClock {...props} /> : <WatchLaterOutlinedIcon {...props} />;
};

export const AppLoginIcon = ({ flavor = "mac", ...props }: DynamicIconProps) => {
  return flavor === "mac" ? <SFLogin {...props} /> : <LoginIcon {...props} />;
};

export const AppLogoutIcon = ({ flavor = "mac", ...props }: DynamicIconProps) => {
  return flavor === "mac" ? <SFLogout {...props} /> : <LogoutIcon {...props} />;
};

export const AppLightIcon = ({ flavor = "mac", ...props }: DynamicIconProps) => {
  return flavor === "mac" ? <SFLight {...props} /> : <LightModeOutlinedIcon {...props} />;
};

export const AppDarkIcon = ({ flavor = "mac", ...props }: DynamicIconProps) => {
  return flavor === "mac" ? <SFDark {...props} /> : <DarkModeOutlinedIcon {...props} />;
};

export const AppAppleIcon = ({ flavor = "mac", ...props }: DynamicIconProps) => {
  return <AppleIcon {...props} />;
};

export const AppAndroidIcon = ({ flavor = "mac", ...props }: DynamicIconProps) => {
  return <AndroidIcon {...props} />;
};

export const AppClearIcon = ({ flavor = "mac", ...props }: DynamicIconProps) => {
  return flavor === "mac" ? <SFClear {...props} /> : <ClearIcon {...props} />;
};
