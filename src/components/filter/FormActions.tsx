import React from "react";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

interface FormActionsProps {
  isSubmitting: boolean;
  onReset: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

function FormActions({ isSubmitting, onReset, onCancel, onSubmit }: Readonly<FormActionsProps>) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1.5}
      justifyContent="space-between"
      alignItems={{ xs: "stretch", md: "center" }}
    >
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button disabled={isSubmitting} onClick={onReset} variant="text" color="inherit">
          Zurücksetzen
        </Button>

        <Button disabled={isSubmitting} onClick={onCancel} variant="outlined" color="inherit">
          Abbrechen
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <Button disabled={isSubmitting} onClick={onSubmit} variant="contained" color="primary">
          Filtern
        </Button>
      </Box>
    </Stack>
  );
}

export default FormActions;
