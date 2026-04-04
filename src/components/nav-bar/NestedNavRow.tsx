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
import { getDepthPadding } from "./listTreeUtils";

type NestedRowProps = {
  rowKey: string;
  depth: number;
  label: string;
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

  return (
    <ListItem
      component="div"
      disablePadding
      data-nav-row-key={props.navRowKey}
      sx={{
        pl: getDepthPadding(props.depth),
        borderTop: props.showDivider ? 1 : 0,
        borderColor: "divider",
      }}
    >
      <ExpandToggle expanded={props.expanded} pending={props.pending} onToggle={handleToggle} />
      <ListItemButton
        className="row"
        divider={false}
        selected={props.selected ?? false}
        disabled={props.disabled}
        onClick={handleClick}
        sx={(theme) => ({
          minWidth: 0,
          pr: 1,
          backgroundColor: "var(--mui-palette-background-paper)",
          color: "var(--mui-palette-text-primary)",
          "&:hover": { backgroundColor: "action.hover" },
          "&.Mui-selected": {
            backgroundColor: alpha(theme.palette.primary.main, 0.14),
            boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}`,
            ...theme.applyStyles("dark", {
              backgroundColor: alpha(theme.palette.primary.light, 0.2),
              boxShadow: `inset 3px 0 0 ${theme.palette.primary.light}`,
            }),
          },
          "&.Mui-selected:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
            ...theme.applyStyles("dark", {
              backgroundColor: alpha(theme.palette.primary.light, 0.28),
            }),
          },
          "& .MuiListItemText-primary": {
            color: "var(--mui-palette-text-primary) !important",
            WebkitTextFillColor: "var(--mui-palette-text-primary) !important",
            opacity: "1 !important",
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
            },
          }}
          slotProps={{
            primary: {
              noWrap: true,
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

  const Icon = props.expanded ? ExpandMoreIcon : ChevronRightIcon;

  return (
    <ListItemIcon sx={{ minWidth: 32, justifyContent: "center" }}>
      <IconButton
        size="small"
        aria-label={props.expanded ? "Einklappen" : "Ausklappen"}
        onClick={(e) => {
          e.stopPropagation();
          props.onToggle();
        }}
      >
        <Icon fontSize="small" />
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
