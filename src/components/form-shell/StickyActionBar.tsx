import React from "react";
import Paper from "@mui/material/Paper";
import type { SxProps, Theme } from "@mui/material/styles";
import { editorSectionSx } from "../restricted/editor/editorLayout";

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
          ...editorSectionSx(theme),
          position: "sticky",
          bottom: 0,
          zIndex: theme.zIndex.appBar - 1,
          px: { xs: 1.5, sm: 2 },
          py: 1.5,
          borderTop: `1px solid var(--border-subtle, ${theme.palette.divider})`,
          backdropFilter: "blur(12px)",
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Paper>
  );
}
