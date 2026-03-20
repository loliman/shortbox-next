import React from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

interface AppPageLoaderProps {
  label?: string;
}

export function AppPageLoader(props: Readonly<AppPageLoaderProps>) {
  return (
    <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.25 }}>
      <CircularProgress />
      <Typography>{props.label || "Lade..."}</Typography>
    </Box>
  );
}

export default AppPageLoader;
