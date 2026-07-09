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
        gap: 1.5,
        py: 2.5,
        transition: "all 200ms ease",
      }}
    >
      <CircularProgress size={size} thickness={4.5} />
      {label ? (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontSize: "0.88rem",
            fontWeight: 500,
          }}
        >
          {label}
        </Typography>
      ) : null}
    </Box>
  );
}

export default AppInlineLoader;
