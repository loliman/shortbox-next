import { type Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

export const editorSurfaceSx = (theme: Theme) => ({
  backgroundColor: theme.vars?.palette.background.paper ?? theme.palette.background.paper,
  border: "1px solid",
  borderColor: theme.vars?.palette.divider ?? theme.palette.divider,
  boxShadow: theme.shadows[1],
  ...theme.applyStyles("dark", {
    backgroundColor: alpha(theme.palette.common.black, 0.28),
    borderColor: alpha(theme.palette.common.white, 0.12),
    boxShadow: "0 8px 24px rgba(0,0,0,0.32)",
  }),
});

export const editorSectionSx = (theme: Theme) => ({
  px: { xs: 1.25, sm: 1.75 },
  py: { xs: 1.25, sm: 1.5 },
  borderRadius: 2,
  ...editorSurfaceSx(theme),
});
