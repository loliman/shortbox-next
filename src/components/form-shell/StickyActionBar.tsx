import React from "react";
import Paper from "@mui/material/Paper";
import type { SxProps, Theme } from "@mui/material/styles";

interface StickyActionBarProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

export default function StickyActionBar({ children, sx }: Readonly<StickyActionBarProps>) {
  return (
    <Paper
      elevation={0}
      sx={[
        (theme) => ({
          position: "static",
          px: { xs: 1.5, sm: 2 },
          py: 1.5,
          borderRadius: "calc(2 * var(--mui-shape-borderRadius))",
          backgroundColor: theme.vars?.palette.background.paper ?? theme.palette.background.paper,
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 10px 30px rgba(0,0,0,0.42)"
              : theme.shadows[1],
          border: "1px solid",
          borderColor: theme.vars?.palette.divider ?? theme.palette.divider,
          backdropFilter: "blur(12px)",
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Paper>
  );
}
