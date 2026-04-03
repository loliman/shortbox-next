"use client";

import React from "react";
import CardHeader from "@mui/material/CardHeader";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import { editorSectionSx } from "../restricted/editor/editorLayout";
import StickyActionBar from "./StickyActionBar";

interface FormPageShellProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  headerCenter?: React.ReactNode;
  headerContent?: React.ReactNode;
  headerSx?: SxProps<Theme>;
  notice?: React.ReactNode;
  tabs?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  contentSx?: SxProps<Theme>;
}

export default function FormPageShell({
  title,
  subtitle,
  headerAction,
  headerCenter,
  headerContent,
  headerSx,
  notice,
  tabs,
  children,
  actions,
  contentSx,
}: Readonly<FormPageShellProps>) {
  return (
    <Stack
      spacing={2.25}
      sx={{
        minHeight: "100%",
        flex: 1,
      }}
    >
      <Paper elevation={0} sx={editorSectionSx}>
        <Box sx={{ position: "relative" }}>
          <CardHeader title={title} subheader={subtitle} action={headerAction} sx={headerSx} />
          {headerCenter ? (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: { xs: 8, sm: 10 },
                pointerEvents: "none",
              }}
            >
              <Box sx={{ width: "100%", maxWidth: 720, pointerEvents: "auto" }}>{headerCenter}</Box>
            </Box>
          ) : null}
        </Box>
        {headerContent ? <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>{headerContent}</Box> : null}
        {tabs ? <Box sx={{ px: { xs: 1.25, sm: 1.75 }, pb: 1 }}>{tabs}</Box> : null}
      </Paper>

      {notice ? <Paper elevation={0} sx={editorSectionSx}>{notice}</Paper> : null}

      <Stack
        spacing={2.25}
        sx={{
          flexGrow: 1,
          pb: actions ? { xs: 18, sm: 19 } : 0,
          ...contentSx,
        }}
      >
        {children}
      </Stack>

      {actions ? (
        <Box
          sx={{
            position: "sticky",
            bottom: { xs: 72, sm: 88 },
            zIndex: 1200,
          }}
        >
          <StickyActionBar>{actions}</StickyActionBar>
        </Box>
      ) : null}
    </Stack>
  );
}
