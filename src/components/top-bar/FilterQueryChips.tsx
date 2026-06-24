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
  /** Called when a token chip itself is clicked (for click-to-edit) */
  onClickToken?: (index: number) => void;
  /** Called when the reset-all is triggered (kept for API compat) */
  onResetAll: () => void;
  /** When false (collapsed), chips are single-line with a fade. When true (expanded), all chips wrap. */
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
  onClickToken,
  maxVisible = 999,
}: Readonly<FilterQueryChipsProps>) {
  if (tokens.length === 0) return null;

  const collapsed = maxVisible <= 2;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.4,
        flexShrink: 1,
        flexWrap: collapsed ? "nowrap" : "wrap",
        overflow: collapsed ? "hidden" : "visible",
        maxWidth: "100%",
        pr: 0.5,
        py: collapsed ? 0 : 0.5,
      }}
    >
      {tokens.map((token, idx) => {
        if (token.type === "parenthesis") {
          return (
            <Chip
              key={`paren-${idx}`}
              label={token.value}
              size="small"
              onDelete={() => onRemoveToken(idx)}
              sx={(theme) => ({
                ...CHIP_SX,
                minWidth: 18,
                px: 0,
                fontWeight: 800,
                bgcolor: "rgba(0, 0, 0, 0.08)",
                color: "text.primary",
                border: "1px solid",
                borderColor: "rgba(0, 0, 0, 0.16)",
                "& .MuiChip-label": { px: 0.5 },
                "& .MuiChip-deleteIcon": { display: "none" },
                ...theme.applyStyles("dark", {
                  bgcolor: "rgba(255, 255, 255, 0.12)",
                  color: "common.white",
                  borderColor: "rgba(255, 255, 255, 0.22)",
                }),
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
                bgcolor: alpha(theme.palette.secondary.main, 0.12),
                color: theme.palette.secondary.dark,
                border: "1px solid",
                borderColor: alpha(theme.palette.secondary.main, 0.3),
                "& .MuiChip-deleteIcon": { display: "none" },
                ...theme.applyStyles("dark", {
                  bgcolor: alpha("#b12c4a", 0.22),
                  color: "#d45571",
                  borderColor: alpha("#b12c4a", 0.44),
                }),
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
            onClick={() => onClickToken?.(idx)}
            onDelete={() => onRemoveToken(idx)}
            sx={(theme) => ({
              ...CHIP_SX,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.dark,
              border: "1px solid",
              borderColor: alpha(theme.palette.primary.main, 0.28),
              "& .MuiChip-deleteIcon": {
                ...CHIP_SX["& .MuiChip-deleteIcon"],
                color: alpha(theme.palette.primary.dark, 0.6),
                "&:hover": {
                  color: theme.palette.primary.dark,
                },
              },
              ...theme.applyStyles("dark", {
                bgcolor: alpha("#e5e7eb", 0.22),
                color: "#f8fafc",
                borderColor: alpha("#e5e7eb", 0.42),
                "& .MuiChip-deleteIcon": {
                  color: alpha("#f8fafc", 0.7),
                  "&:hover": {
                    color: "#f8fafc",
                  },
                },
              }),
            })}
          />
        );
      })}
    </Box>
  );
}
