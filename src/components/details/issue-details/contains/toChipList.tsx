"use client";

import React from "react";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import {
  buildAppearanceFilterUrl,
  buildArcFilterUrl,
  buildGenreFilterUrl,
  buildPersonFilterUrl,
} from "@/src/lib/url-builder";

type ChipNavigationProps = {
  us?: boolean;
  navigate?: (url: string) => void;
};

type ChipItem = {
  __typename?: string;
  name?: string;
  title?: string;
  type?: string;
};

const APPEARANCE_TYPES = new Set([
  "CHARACTER",
  "GROUP",
  "RACE",
  "ANIMAL",
  "ITEM",
  "VEHICLE",
  "LOCATION",
]);

export function toChipList(
  items: ChipItem[] | null | undefined,
  props: ChipNavigationProps,
  type: string
) {
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) {
    return <Chip key={0} variant="outlined" label="Unbekannt" />;
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {safeItems.map((item, idx) => {
        const itemType = normalizeToken(item.type);
        const wantedType = normalizeToken(type);
        const isAppearanceFallback =
          !item.__typename && (APPEARANCE_TYPES.has(itemType) || APPEARANCE_TYPES.has(wantedType));
        const typename = item.__typename ?? (isAppearanceFallback ? "Appearance" : "Individual");
        const label = item.name ?? item.title ?? "Unbekannt";
        const locale = props.us ? "us" : "de";
        let targetHref: string;
        if (typename === "Appearance") {
          targetHref = buildAppearanceFilterUrl(locale, item.name ?? "");
        } else if (typename === "Arc") {
          targetHref = buildArcFilterUrl(locale, item.title ?? item.name ?? "");
        } else if (typename === "Genre") {
          targetHref = buildGenreFilterUrl(locale, item.name ?? item.title ?? "");
        } else {
          targetHref = buildPersonFilterUrl(locale, item.name ?? "");
        }

        return (
          <Chip
            key={`${typename}|${label}|${idx}`}
            variant="outlined"
            label={label}
            onClick={() => {
              if (props.navigate) {
                props.navigate(targetHref);
                return;
              }
              if (globalThis.window !== undefined) {
                globalThis.location.href = targetHref;
              }
            }}
          />
        );
      })}
    </Box>
  );
}

function normalizeToken(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim().toUpperCase();
  return "";
}
