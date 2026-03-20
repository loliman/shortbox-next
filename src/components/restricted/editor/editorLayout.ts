import { type Theme } from "@mui/material/styles";

export const editorSectionSx = (theme: Theme) => ({
  px: { xs: 1.25, sm: 1.75 },
  py: { xs: 1.25, sm: 1.5 },
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
  boxShadow: theme.shadows[1],
  backgroundColor: theme.palette.background.paper,
});
