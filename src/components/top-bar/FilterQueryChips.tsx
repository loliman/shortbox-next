"use client";

import React from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import type { RenderChipToken } from "../../lib/filter-query-syntax";

interface FilterQueryChipsProps {
  /** Flattened query tokens to display as chips */
  tokens: RenderChipToken[];
  /** Called when a token chip's delete button is clicked */
  onRemoveToken: (index: number) => void;
  /** Called when the "× Alle Filter" reset chip is clicked */
  onResetAll: () => void;
  /** Maximum number of individual token chips to show before collapsing */
  maxVisible?: number;
}

const CHIP_SX = {
  height: 22,
  fontSize: "0.72rem",
  fontWeight: 600,
  letterSpacing: "0.01em",
  borderRadius: "6px",
  "& .MuiChip-label": { px: 0.75 },
  "& .MuiChip-deleteIcon": { fontSize: 13, ml: 0.25 },
  flexShrink: 0,
} as const;

export default function FilterQueryChips({
  tokens,
  onRemoveToken,
  onResetAll,
  maxVisible = 8,
}: Readonly<FilterQueryChipsProps>) {
  if (tokens.length === 0) return null;

  const visible = tokens.slice(0, maxVisible);
  const hiddenCount = Math.max(0, tokens.length - visible.length);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.4,
        flexShrink: 0,
        flexWrap: "nowrap",
        overflow: "hidden",
        maxWidth: "75%",
        pr: 0.5,
      }}
    >
      {visible.map((token, idx) => {
        if (token.type === "parenthesis") {
          return (
            <Chip
              key={`paren-${idx}`}
              label={token.value}
              size="small"
              onDelete={() => onRemoveToken(idx)}
              sx={(theme) => ({
                ...CHIP_SX,
                minWidth: 16,
                px: 0,
                fontWeight: 800,
                bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                color: "text.secondary",
                border: "1px solid",
                borderColor: "divider",
                "& .MuiChip-label": { px: 0.35 },
                "& .MuiChip-deleteIcon": { display: "none" },
              })}
            />
          );
        }

        if (token.type === "operator") {
          return (
            <Chip
              key={`op-${idx}`}
              label={token.value}
              size="small"
              onDelete={() => onRemoveToken(idx)}
              sx={(theme) => ({
                ...CHIP_SX,
                fontWeight: 800,
                bgcolor: theme.palette.mode === "dark"
                  ? alpha(theme.palette.secondary.main, 0.22)
                  : alpha(theme.palette.secondary.main, 0.12),
                color: theme.palette.mode === "dark" ? theme.palette.secondary.light : theme.palette.secondary.dark,
                border: "1px solid",
                borderColor: theme.palette.mode === "dark"
                  ? alpha(theme.palette.secondary.main, 0.44)
                  : alpha(theme.palette.secondary.main, 0.3),
                "& .MuiChip-deleteIcon": { display: "none" },
              })}
            />
          );
        }

        // Standard filter chip
        return (
          <Chip
            key={`filter-${idx}`}
            label={token.value}
            size="small"
            onDelete={() => onRemoveToken(idx)}
            sx={(theme) => ({
              ...CHIP_SX,
              bgcolor: theme.palette.mode === "dark"
                ? alpha(theme.palette.primary.main, 0.22)
                : alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.mode === "dark" ? theme.palette.primary.light : theme.palette.primary.dark,
              border: "1px solid",
              borderColor: theme.palette.mode === "dark"
                ? alpha(theme.palette.primary.main, 0.42)
                : alpha(theme.palette.primary.main, 0.28),
              "& .MuiChip-deleteIcon": {
                ...CHIP_SX["& .MuiChip-deleteIcon"],
                color: theme.palette.mode === "dark"
                  ? alpha(theme.palette.primary.light, 0.7)
                  : alpha(theme.palette.primary.dark, 0.6),
                "&:hover": {
                  color: theme.palette.mode === "dark" ? theme.palette.primary.light : theme.palette.primary.dark,
                },
              },
            })}
          />
        );
      })}

      {hiddenCount > 0 && (
        <Chip
          label={`+${hiddenCount}`}
          size="small"
          sx={(theme) => ({
            ...CHIP_SX,
            bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            color: "text.secondary",
            border: "1px solid",
            borderColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)",
          })}
        />
      )}

      {/* Reset-All chip – always at the end */}
      <Chip
        label="× Alle Filter"
        size="small"
        onClick={onResetAll}
        sx={(theme) => ({
          ...CHIP_SX,
          cursor: "pointer",
          bgcolor: theme.palette.mode === "dark"
            ? alpha(theme.palette.error.main, 0.16)
            : alpha(theme.palette.error.main, 0.08),
          color: theme.palette.mode === "dark" ? theme.palette.error.light : theme.palette.error.dark,
          border: "1px solid",
          borderColor: theme.palette.mode === "dark"
            ? alpha(theme.palette.error.main, 0.38)
            : alpha(theme.palette.error.main, 0.24),
          "&:hover": {
            bgcolor: theme.palette.mode === "dark"
              ? alpha(theme.palette.error.main, 0.26)
              : alpha(theme.palette.error.main, 0.14),
          },
        })}
      />
    </Box>
  );
}
