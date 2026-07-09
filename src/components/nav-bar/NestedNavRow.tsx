"use client";

import React from "react";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Tooltip from "@mui/material/Tooltip";
import { getDepthPadding } from "./listTreeUtils";

type NestedRowProps = {
  rowKey: string;
  depth: number;
  label: React.ReactNode;
  title?: string;
  showDivider?: boolean;
  navRowKey?: string;
  selected?: boolean;
  expanded: boolean;
  pending?: boolean;
  disabled?: boolean;
  onToggle: (rowKey: string) => void;
  onClick: (event: React.MouseEvent<HTMLElement>, rowKey: string) => void;
};

export const NestedRow = React.memo(function NestedRow(props: Readonly<NestedRowProps>) {
  const { onClick, onToggle, rowKey } = props;
  const handleToggle = () => {
    onToggle(rowKey);
  };
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    onClick(event, rowKey);
  };

  const button = (
    <ListItemButton
      className="row"
      divider={false}
      selected={props.selected ?? false}
      disabled={props.disabled}
      onClick={handleClick}
      sx={(theme) => ({
        minWidth: 0,
        pr: 1,
        py: props.depth === 0 ? "4px" : props.depth === 1 ? "2px" : "1px",
        backgroundColor: "transparent",
        color: "var(--mui-palette-text-primary)",
        "&:hover": {
          backgroundColor: props.selected ? "transparent" : "action.hover",
        },
        "&.Mui-selected": {
          backgroundColor: "transparent",
          boxShadow: "none",
          color: "var(--mui-palette-text-primary)",
          ...theme.applyStyles("dark", {
            backgroundColor: "transparent",
            color: "var(--mui-palette-text-primary)",
          }),
        },
        "&.Mui-selected:hover": {
          backgroundColor: "transparent",
          ...theme.applyStyles("dark", {
            backgroundColor: "transparent",
          }),
        },
        "& .MuiListItemText-primary": {
          color: "var(--mui-palette-text-primary) !important",
          WebkitTextFillColor: "var(--mui-palette-text-primary) !important",
          opacity: "1 !important",
          fontSize: props.depth === 0 ? "0.92rem" : props.depth === 1 ? "0.85rem" : "0.8rem",
        },
      })}
    >
      <ListItemText
        primary={props.label}
        sx={{
          "& .MuiListItemText-primary": {
            color: "var(--mui-palette-text-primary) !important",
            WebkitTextFillColor: "var(--mui-palette-text-primary) !important",
            opacity: "1 !important",
            fontSize: props.depth === 0 ? "0.92rem" : props.depth === 1 ? "0.85rem" : "0.8rem",
          },
        }}
        slotProps={{
          primary: {
            noWrap: typeof props.label === "string",
            sx: {
              fontWeight: props.selected ? 700 : 400,
              color: "var(--mui-palette-text-primary) !important",
              WebkitTextFillColor: "var(--mui-palette-text-primary) !important",
              opacity: 1,
            },
          },
        }}
      />
    </ListItemButton>
  );

  const tooltipTitle = props.title ?? (typeof props.label === "string" ? props.label : undefined);

  return (
    <ListItem
      component="div"
      disablePadding
      data-nav-row-key={props.navRowKey}
      sx={(theme) => ({
        pl: getDepthPadding(props.depth),
        borderTop: 0,
        borderRadius: "6px",
        mb: "4px",
        width: "auto",
        borderLeft: props.selected
          ? `3px solid ${
              theme.palette.mode === "dark" ? theme.palette.primary.light : theme.palette.primary.main
            }`
          : "3px solid transparent",
        transition: "background-color 0.18s ease, border-left-color 0.18s ease",
        backgroundColor:
          props.selected
            ? alpha(
                theme.palette.mode === "dark" ? theme.palette.primary.light : theme.palette.primary.main,
                theme.palette.mode === "dark" ? 0.15 : 0.08
              )
            : "transparent",
        color: "var(--mui-palette-text-primary)",
        "&:hover": {
          backgroundColor: props.selected
            ? alpha(
                theme.palette.mode === "dark" ? theme.palette.primary.light : theme.palette.primary.main,
                theme.palette.mode === "dark" ? 0.22 : 0.12
              )
            : theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.04)"
              : "rgba(0, 0, 0, 0.04)",
        },
      })}
    >
      <ExpandToggle expanded={props.expanded} pending={props.pending} onToggle={handleToggle} />
      {tooltipTitle ? (
        <Tooltip title={tooltipTitle} enterDelay={600} enterNextDelay={600} arrow placement="right">
          {button}
        </Tooltip>
      ) : (
        button
      )}
    </ListItem>
  );
});

type ExpandToggleProps = {
  expanded: boolean;
  pending?: boolean;
  onToggle: () => void;
};

const ExpandToggle = React.memo(function ExpandToggle(props: Readonly<ExpandToggleProps>) {
  if (props.pending) {
    return (
      <ListItemIcon sx={{ minWidth: 32, justifyContent: "center" }}>
        <Box
          aria-hidden="true"
          role="presentation"
          sx={{
            ml: 1,
            width: 12,
            height: 12,
            borderRadius: "50%",
            bgcolor: "action.active",
            opacity: 0.72,
            animation: "shortboxSidebarPendingPulse 920ms ease-in-out infinite",
            "@keyframes shortboxSidebarPendingPulse": {
              "0%": { opacity: 0.36, transform: "scale(0.92)" },
              "50%": { opacity: 0.82, transform: "scale(1)" },
              "100%": { opacity: 0.36, transform: "scale(0.92)" },
            },
          }}
        />
      </ListItemIcon>
    );
  }

  const Icon = ChevronRightIcon;

  return (
      <ListItemIcon sx={{ minWidth: 32, justifyContent: "center" }}>
        <IconButton
          size="small"
          aria-label={props.expanded ? "Einklappen" : "Ausklappen"}
          onClick={(e) => {
            e.stopPropagation();
            props.onToggle();
          }}
          sx={{
            color: "var(--mui-palette-text-primary)",
            transition: "transform 0.2s ease",
            transform: props.expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <Icon fontSize="small" sx={{ fontSize: "1.1rem" }} />
        </IconButton>
      </ListItemIcon>
  );
});

export function NestedEmptyRow({
  depth,
  message = "Keine Einträge vorhanden",
}: Readonly<{
  depth: number;
  message?: string;
}>) {
  return (
    <ListItem component="div" sx={{ pl: getDepthPadding(depth) }}>
      <ListItemText primary={message} />
    </ListItem>
  );
}

export function NestedLoadingRow({
  depth,
  message,
}: Readonly<{
  depth: number;
  message?: string;
}>) {
  return (
    <ListItem component="div" sx={{ pl: getDepthPadding(depth) }}>
      <ListItemIcon sx={{ minWidth: 28 }}>
        <Box
          aria-hidden="true"
          role="presentation"
          sx={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            bgcolor: "action.active",
            opacity: 0.72,
            animation: "shortboxSidebarPendingPulse 920ms ease-in-out infinite",
          }}
        />
      </ListItemIcon>
      {message ? <ListItemText primary={message} /> : null}
    </ListItem>
  );
}
