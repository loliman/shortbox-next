"use client";

import React from "react";
import CardHeader from "@mui/material/CardHeader";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import { editorSectionSx } from "../restricted/editor/editorLayout";
import StickyActionBar from "./StickyActionBar";
import { useNavigationFeedbackContext } from "../generic/AppContext";

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
  busy?: boolean;
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
  busy = false,
}: Readonly<FormPageShellProps>) {
  const navigationFeedback = useNavigationFeedbackContext();

  React.useEffect(() => {
    navigationFeedback.setNavigationUiLoading(busy);

    return () => {
      navigationFeedback.setNavigationUiLoading(false);
    };
  }, [busy, navigationFeedback]);

  return (
    <Stack
      spacing={2.25}
      sx={{
        minHeight: "100%",
        flex: 1,
      }}
      aria-busy={busy}
    >
      <Paper
        elevation={0}
        sx={{
          ...editorSectionSx,
          pointerEvents: busy ? "none" : "auto",
        }}
      >
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

      {notice ? (
        <Paper
          elevation={0}
          sx={{
            ...editorSectionSx,
            pointerEvents: busy ? "none" : "auto",
          }}
        >
          {notice}
        </Paper>
      ) : null}

      <Box sx={{ position: "relative", flexGrow: 1 }}>
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

        {busy ? (
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 1199,
              backgroundColor: "rgba(255,255,255,0.02)",
              cursor: "progress",
            }}
          />
        ) : null}
      </Box>

      {actions ? (
        <Box
          sx={{
            position: "sticky",
            bottom: { xs: 72, sm: 88 },
            zIndex: 1200,
            pointerEvents: busy ? "none" : "auto",
            opacity: busy ? 0.88 : 1,
          }}
        >
          <StickyActionBar>{actions}</StickyActionBar>
        </Box>
      ) : null}
    </Stack>
  );
}
