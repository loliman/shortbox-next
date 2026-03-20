import React from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

interface AppInlineLoaderProps {
  label?: string;
  size?: number;
  centered?: boolean;
}

export function AppInlineLoader(props: Readonly<AppInlineLoaderProps>) {
  const { label, size = 20, centered = true } = props;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: centered ? "center" : "flex-start",
        alignItems: "center",
        gap: label ? 1 : 0,
        py: 2,
      }}
    >
      <CircularProgress size={size} />
      {label ? <Typography color="text.secondary">{label}</Typography> : null}
    </Box>
  );
}

export default AppInlineLoader;
