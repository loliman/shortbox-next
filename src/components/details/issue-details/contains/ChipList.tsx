"use client";

import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { toChipList } from "./toChipList";

type ChipNavigationProps = {
  us?: boolean;
};

type ChipListItem = {
  type?: string;
  role?: string;
  [key: string]: unknown;
};

type ChipListProps = ChipNavigationProps & {
  label?: string;
  hideIfEmpty?: boolean;
  type?: string;
  appRole?: string;
  items?: unknown[] | null;
  individual?: boolean;
};

export function ChipList(props: Readonly<ChipListProps>) {
  const sourceItems = Array.isArray(props.items) ? props.items : [];
  const hasLabel = Boolean(props.label);
  const items = sourceItems
    .map((item) => (item || {}) as ChipListItem)
    .filter((item) => {
      const itemType = normalizeToken(item.type);
      const itemRole = normalizeToken(item.role);
      const wantedType = normalizeToken(props.type);
      const wantedRole = normalizeToken(props.appRole);

      if (props.individual) {
        return (item.type || "").includes(props.type || "");
      }
      return matchesAppearance(itemType, itemRole, wantedType, wantedRole);
    });

  if (items.length === 0 && props.hideIfEmpty) return null;

  return (
    <Box
      sx={
        hasLabel
          ? {
              mb: 2,
              display: "grid",
              gridTemplateColumns: { xs: "96px minmax(0, 1fr)", sm: "120px minmax(0, 1fr)" },
              columnGap: 2,
              rowGap: 0.75,
              alignItems: "start",
            }
          : {
              mb: 2,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              columnGap: 1,
              rowGap: 1,
            }
      }
    >
      {hasLabel ? (
        <Typography
          component="span"
          sx={{ fontWeight: 700, lineHeight: 1.5, minWidth: 0, alignSelf: "center" }}
        >
          {props.label}
        </Typography>
      ) : null}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          columnGap: 1,
          rowGap: 1,
          minWidth: 0,
        }}
      >
        {toChipList(items, props, props.type || "")}
      </Box>
    </Box>
  );
}

function normalizeToken(value: unknown): string {
  if (!value) return "";
  return String(value).trim().toUpperCase();
}

function matchesAppearance(
  itemType: string,
  itemRole: string,
  wantedType: string,
  wantedRole: string
): boolean {
  if (!wantedType) return true;

  if (wantedType !== "CHARACTER" || !wantedRole) {
    return itemType === wantedType;
  }

  const normalizedRole = normalizeCharacterRole(itemRole);
  const normalizedTypeAsRole = normalizeCharacterRole(itemType);

  // Current format: type=CHARACTER, role=FEATURED|ANTAGONIST|SUPPORTING|OTHER
  if (itemType === "CHARACTER" && normalizedRole === wantedRole) return true;
  // Legacy format: role is encoded in type directly (e.g. type=FEATURED)
  if (normalizedTypeAsRole === wantedRole) return true;

  return false;
}

function normalizeCharacterRole(value: string): string {
  switch (value) {
    case "HERO":
    case "PROTAGONIST":
      return "FEATURED";
    case "VILLAIN":
      return "ANTAGONIST";
    default:
      return value;
  }
}
