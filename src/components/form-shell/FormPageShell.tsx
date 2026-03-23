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
  headerContent?: React.ReactNode;
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
  headerContent,
  notice,
  tabs,
  children,
  actions,
  contentSx,
}: Readonly<FormPageShellProps>) {
  return (
    <Stack spacing={2.25}>
      <Paper elevation={0} sx={editorSectionSx}>
        <CardHeader title={title} subheader={subtitle} action={headerAction} />
        {headerContent ? <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>{headerContent}</Box> : null}
        {tabs ? <Box sx={{ px: { xs: 1.25, sm: 1.75 }, pb: 1 }}>{tabs}</Box> : null}
      </Paper>

      {notice ? <Paper elevation={0} sx={editorSectionSx}>{notice}</Paper> : null}

      <Stack spacing={2.25} sx={contentSx}>
        {children}
      </Stack>

      {actions ? <StickyActionBar>{actions}</StickyActionBar> : null}
    </Stack>
  );
}
