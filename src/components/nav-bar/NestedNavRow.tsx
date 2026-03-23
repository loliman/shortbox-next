"use client";

import React from "react";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { getDepthPadding } from "./listTreeUtils";

type NestedRowProps = {
  rowKey: string;
  depth: number;
  label: string;
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
    <ListItemButton
      className="row"
      divider={false}
      data-nav-row-key={props.navRowKey}
      selected={props.selected ?? false}
      disabled={props.disabled}
      onClick={handleClick}
      sx={{
        pl: getDepthPadding(props.depth),
        "&.Mui-selected": { backgroundColor: "transparent" },
        "&.Mui-selected:hover": { backgroundColor: "action.hover" },
      }}
    >
      <ExpandToggle expanded={props.expanded} pending={props.pending} onToggle={handleToggle} />
      <ListItemText
        primary={props.label}
        primaryTypographyProps={{ noWrap: true, sx: { fontWeight: props.selected ? 700 : 400 } }}
      />
    </ListItemButton>
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
      <ListItemIcon sx={{ minWidth: 32 }}>
        <CircularProgress size={16} sx={{ ml: 1 }} />
      </ListItemIcon>
    );
  }

  const Icon = props.expanded ? ExpandMoreIcon : ChevronRightIcon;

  return (
    <ListItemIcon sx={{ minWidth: 32 }}>
      <IconButton
        component="span"
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
}: {
  depth: number;
  message?: string;
}) {
  return (
    <ListItem sx={{ pl: getDepthPadding(depth) }}>
      <ListItemText primary={message} />
    </ListItem>
  );
}

export function NestedLoadingRow({
  depth,
  message = "Wird geladen...",
}: {
  depth: number;
  message?: string;
}) {
  return (
    <ListItem sx={{ pl: getDepthPadding(depth) }}>
      <ListItemIcon sx={{ minWidth: 28 }}>
        <CircularProgress size={14} />
      </ListItemIcon>
      <ListItemText primary={message} />
    </ListItem>
  );
}
