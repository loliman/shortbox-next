import React from "react";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { editorSectionSx } from "../restricted/editor/editorLayout";

interface FormSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

export default function FormSection({
  title,
  description,
  children,
  sx,
}: Readonly<FormSectionProps>) {
  return (
    <Paper
      elevation={0}
      sx={[
        (theme) => ({
          ...editorSectionSx(theme),
          p: { xs: 2, sm: 2.5 },
          boxShadow: "none",
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Stack spacing={2}>
        {title || description ? (
          <Stack spacing={description ? 0.5 : 0}>
            {title ? (
              <Typography
                sx={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                }}
              >
                {title}
              </Typography>
            ) : null}
            {description ? (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            ) : null}
          </Stack>
        ) : null}
        {children}
      </Stack>
    </Paper>
  );
}
