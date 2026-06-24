import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import { ContrastSwitch } from "../generic/ContrastSwitch";

interface FilterSwitchProps {
  checked: boolean;
  label: string;
  onToggle: () => void;
  disabled?: boolean;
  sx?: SxProps<Theme>;
}

function FilterSwitch({ checked, label, onToggle, disabled = false, sx }: Readonly<FilterSwitchProps>) {
  return (
    <Box sx={sx}>
      <Box
        sx={(theme) => ({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.25,
          px: 0.9,
          py: 0.45,
          minHeight: 44,
          borderRadius: 1.75,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "var(--mui-palette-background-paper)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
          opacity: disabled ? 0.6 : 1,
          "&:hover": {
            borderColor: alpha(theme.palette.success.main, 0.55),
            boxShadow: `0 2px 9px ${alpha(theme.palette.success.main, 0.16)}`,
            transform: "translateY(-1px)",
          },
          ...theme.applyStyles("dark", {
            bgcolor: "rgba(0, 0, 0, 0.28)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.42)",
            "&:hover": {
              borderColor: alpha(theme.palette.success.main, 0.72),
              boxShadow: `0 2px 9px ${alpha(theme.palette.success.main, 0.28)}`,
            },
          }),
        })}
      >
        <Typography
          sx={{
            fontSize: "0.84rem",
            fontWeight: 500,
            color: "text.primary",
            minWidth: 0,
            lineHeight: 1.25,
          }}
        >
          {label}
        </Typography>
        <ContrastSwitch
          checked={checked}
          onChange={onToggle}
          color="primary"
          disabled={disabled}
          slotProps={{ input: { "aria-label": label } }}
        />
      </Box>
    </Box>
  );
}

export default FilterSwitch;
