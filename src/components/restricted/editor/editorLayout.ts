import { type Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

export const editorSurfaceSx = (theme: Theme) => ({
  backgroundColor:
    theme.palette.mode === "dark"
      ? alpha(theme.palette.common.black, 0.28)
      : (theme.vars?.palette.background.paper ?? theme.palette.background.paper),
  border: "1px solid",
  borderColor:
    theme.palette.mode === "dark"
      ? alpha(theme.palette.common.white, 0.12)
      : (theme.vars?.palette.divider ?? theme.palette.divider),
  boxShadow:
    theme.palette.mode === "dark" ? "0 8px 24px rgba(0,0,0,0.32)" : theme.shadows[1],
});

export const editorSectionSx = (theme: Theme) => ({
  px: { xs: 1.25, sm: 1.75 },
  py: { xs: 1.25, sm: 1.5 },
  borderRadius: 2,
  ...editorSurfaceSx(theme),
});
