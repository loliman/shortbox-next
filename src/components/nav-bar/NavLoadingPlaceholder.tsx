"use client";

import React from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

type NavLoadingPlaceholderProps = {
  compact?: boolean;
};

export default function NavLoadingPlaceholder(
  props: Readonly<NavLoadingPlaceholderProps>
) {
  const compact = props.compact ?? false;

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label="Navigation wird geladen"
      sx={{
        listStyle: "none",
        m: 0,
        px: 1,
        py: compact ? 1.25 : 1.75,
        minHeight: compact ? 120 : 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CircularProgress size={20} thickness={4.6} />
    </Box>
  );
}
