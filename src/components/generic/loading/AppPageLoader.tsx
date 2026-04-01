import React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

interface AppPageLoaderProps {
  label?: string;
}

export function AppPageLoader(props: Readonly<AppPageLoaderProps>) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        p: 2,
        backgroundColor: "background.default",
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 560,
          p: { xs: 3, sm: 4 },
          position: "relative",
          overflow: "hidden",
          borderRadius: 4,
          border: 1,
          borderColor: "divider",
          boxShadow: 6,
          backgroundColor: "background.paper",
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            right: -20,
            bottom: -20,
            width: "60%",
            height: "55%",
            background:
              "radial-gradient(circle at 100% 100%, rgba(17,17,17,0.08), rgba(17,17,17,0) 58%)",
            opacity: 1,
            pointerEvents: "none",
          }}
        />

        <Box sx={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <CircularProgress size={24} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {props.label || "Shortbox wird durchsucht..."}
            </Typography>
          </Box>

          <Typography color="text.secondary">
            Die Seite wird vorbereitet. Das kann je nach Comic einen kurzen Moment dauern.
          </Typography>
        </Box>
      </Card>
    </Box>
  );
}

export default AppPageLoader;
