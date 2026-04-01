import Switch from "@mui/material/Switch";
import { alpha, styled } from "@mui/material/styles";

export const ContrastSwitch = styled(Switch)(({ theme }) => ({
  padding: 8,
  width: 62,
  height: 34,
  "& .MuiSwitch-track": {
    borderRadius: 22 / 2,
    opacity: 1,
    backgroundColor: alpha(theme.palette.text.primary, 0.18),
    border: `1px solid ${alpha(theme.palette.text.primary, 0.28)}`,
    ...theme.applyStyles("dark", {
      backgroundColor: alpha(theme.palette.text.secondary, 0.26),
      border: `1px solid ${alpha(theme.palette.text.secondary, 0.45)}`,
    }),
    "&::before, &::after": {
      content: '""',
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      width: 16,
      height: 16,
    },
    "&::before": {
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
        theme.palette.getContrastText(theme.palette.primary.main)
      )}" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>')`,
      left: 12,
    },
    "&::after": {
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
        theme.palette.getContrastText(theme.palette.primary.main)
      )}" d="M19,13H5V11H19V13Z" /></svg>')`,
      right: 12,
    },
  },
  "& .MuiSwitch-switchBase": {
    margin: 0,
    padding: 7,
    transitionDuration: "220ms",
    "&.Mui-checked": {
      transform: "translateX(28px)",
      color: theme.palette.common.white,
      "& + .MuiSwitch-track": {
        backgroundColor: theme.palette.success.main,
        borderColor: theme.palette.success.main,
        opacity: 1,
      },
    },
  },
  "& .MuiSwitch-thumb": {
    boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
    backgroundColor: theme.palette.common.white,
    border: `1px solid ${alpha(theme.palette.text.primary, 0.24)}`,
    ...theme.applyStyles("dark", {
      backgroundColor: theme.palette.common.white,
      border: `1px solid ${alpha(theme.palette.common.black, 0.24)}`,
    }),
    width: 20,
    height: 20,
    margin: 0,
  },
}));
