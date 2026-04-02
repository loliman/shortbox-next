"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha } from "@mui/material/styles";
import { useNavigationFeedbackContext } from "../generic/AppContext";

export default function CatalogMainLoadingOverlay() {
  const { chromeLoading } = useNavigationFeedbackContext();

  if (!chromeLoading) return null;

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label="Navigation wird geladen"
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: (theme) =>
          alpha(
            theme.vars?.palette.background.paperChannel
              ? `rgb(${theme.vars.palette.background.paperChannel})`
              : theme.palette.background.paper,
            theme.palette.mode === "dark" ? 0.52 : 0.68
          ),
        backdropFilter: "blur(3px)",
        cursor: "progress",
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1,
          borderRadius: 999,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          color: "text.secondary",
          boxShadow: (theme) => `0 12px 28px ${alpha(theme.palette.common.black, 0.14)}`,
        }}
      >
        <CircularProgress size={16} />
      </Box>
    </Box>
  );
}
