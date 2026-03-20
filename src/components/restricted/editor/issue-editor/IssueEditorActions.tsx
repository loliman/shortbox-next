import React from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import type { MouseEvent } from "react";

interface IssueEditorActionsProps {
  isSubmitting: boolean;
  submitLabel: string;
  submitAndCopyLabel: string;
  resetForm: () => void;
  onCancel: (event: MouseEvent<HTMLButtonElement>) => void;
  onSubmitMode: (copyMode: boolean) => void;
}

function IssueEditorActions({
  isSubmitting,
  submitLabel,
  submitAndCopyLabel,
  resetForm,
  onCancel,
  onSubmitMode,
}: IssueEditorActionsProps) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1.5}
      justifyContent="space-between"
      alignItems={{ xs: "stretch", md: "center" }}
    >
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button disabled={isSubmitting} onClick={() => resetForm()} variant="text" color="inherit">
          Zurücksetzen
        </Button>

        <Button disabled={isSubmitting} onClick={onCancel} variant="outlined" color="inherit">
          Abbrechen
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <Button
          disabled={isSubmitting}
          onClick={() => onSubmitMode(false)}
          variant="contained"
          color="primary"
        >
          {submitLabel}
        </Button>

        <Button
          value="createAndCopy"
          disabled={isSubmitting}
          onClick={() => onSubmitMode(true)}
          variant="contained"
          color="secondary"
        >
          {submitAndCopyLabel}
        </Button>
      </Box>
    </Stack>
  );
}

export default IssueEditorActions;
