import { alpha, createTheme } from "@mui/material/styles";

export type AppThemeMode = "light" | "dark";

type ThemeTokens = {
  bg: string;
  text: string;
  textSecondary: string;
  border: string;
  rowHover: string;
  link: string;
};

function getThemeTokens(mode: AppThemeMode): ThemeTokens {
  if (mode === "dark") {
    return {
      bg: "#1e1e1e",
      text: "#e6e6e6",
      textSecondary: "#b3b3b3",
      border: "#303030",
      rowHover: "#2a2a2a",
      link: "#6ea8ff",
    };
  }

  return {
    bg: "#ffffff",
    text: "#111111",
    textSecondary: "#555555",
    border: "#e6e6e6",
    rowHover: "#f5f7fa",
    link: "#2f6feb",
  };
}

function createPalette(mode: AppThemeMode) {
  const tokens = getThemeTokens(mode);

  return {
    mode,
    primary: {
      main: mode === "dark" ? "#e5e7eb" : "#000000",
      light: mode === "dark" ? "#f8fafc" : "#2b2b2b",
      dark: mode === "dark" ? "#cbd5e1" : "#000000",
    },
    secondary: {
      main: "#b12c4a",
      light: "#d45571",
      dark: "#7b2035",
    },
    background: {
      default: tokens.bg,
      paper: tokens.bg,
    },
    text: {
      primary: tokens.text,
      secondary: tokens.textSecondary,
    },
    divider: tokens.border,
    AppBar: {
      defaultBg: "#000000",
      darkBg: "#000000",
      darkColor: tokens.text,
    },
  };
}

function chipAccentStyles(
  themeMode: AppThemeMode,
  color: string | undefined,
  variant: string | undefined
) {
  if (themeMode !== "dark" || variant === "outlined") return {};

  const accents: Record<string, { bgTop: string; bgBottom: string; border: string; text: string }> = {
    primary: {
      bgTop: "rgba(96, 165, 250, 0.25)",
      bgBottom: "rgba(96, 165, 250, 0.15)",
      border: "rgba(147, 197, 253, 0.35)",
      text: "#bfe0ff",
    },
    secondary: {
      bgTop: "rgba(255, 70, 100, 0.25)",
      bgBottom: "rgba(255, 70, 100, 0.15)",
      border: "rgba(255, 120, 140, 0.35)",
      text: "#ff9fb1",
    },
    success: {
      bgTop: "rgba(74, 222, 128, 0.22)",
      bgBottom: "rgba(74, 222, 128, 0.14)",
      border: "rgba(134, 239, 172, 0.35)",
      text: "#b6f5c8",
    },
    info: {
      bgTop: "rgba(56, 189, 248, 0.22)",
      bgBottom: "rgba(56, 189, 248, 0.14)",
      border: "rgba(125, 211, 252, 0.35)",
      text: "#b7ebff",
    },
    warning: {
      bgTop: "rgba(251, 191, 36, 0.22)",
      bgBottom: "rgba(251, 191, 36, 0.14)",
      border: "rgba(253, 224, 71, 0.35)",
      text: "#ffe6a6",
    },
    default: {
      bgTop: "rgba(148, 163, 184, 0.2)",
      bgBottom: "rgba(148, 163, 184, 0.12)",
      border: "rgba(203, 213, 225, 0.28)",
      text: "#d5deea",
    },
  };

  const accent = accents[color || "default"] || accents.default;
  return {
    background: `linear-gradient(180deg, ${accent.bgTop}, ${accent.bgBottom})`,
    border: `1px solid ${accent.border}`,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
    color: accent.text,
  };
}

export const appTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: '[data-theme="%s"]',
  },
  colorSchemes: {
    light: {
      palette: createPalette("light"),
    },
    dark: {
      palette: createPalette("dark"),
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
    subtitle1: {
      fontWeight: 600,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ".data-fade": {
          animation: "dataFadeIn 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "opacity, transform",
        },
        "@keyframes dataFadeIn": {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "@media (prefers-reduced-motion: reduce)": {
          ".data-fade": {
            animationDuration: "1ms",
            animationTimingFunction: "linear",
            transform: "none",
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: "rgb(0, 0, 0)",
          color:
            theme.palette.mode === "dark"
              ? theme.palette.common.white
              : theme.palette.getContrastText(theme.palette.primary.main),
          backgroundImage: "none",
          borderBottomWidth: 1,
          borderBottomStyle: "solid",
          borderBottomColor: theme.vars?.palette.divider ?? theme.palette.divider,
        }),
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: (Number(theme.shape.borderRadius) || 12) - 2,
        }),
      },
    },
    MuiSwitch: {
      styleOverrides: {
        track: ({ theme }) => ({
          backgroundColor: alpha(
            theme.palette.text.secondary,
            theme.palette.mode === "dark" ? 0.35 : 0.42
          ),
          border: `1px solid ${alpha(
            theme.palette.text.secondary,
            theme.palette.mode === "dark" ? 0.55 : 0.28
          )}`,
          opacity: 1,
        }),
        thumb: ({ theme }) => ({
          backgroundColor:
            theme.palette.mode === "dark" ? theme.palette.common.white : theme.palette.background.paper,
        }),
        switchBase: ({ theme }) => ({
          "&.Mui-checked + .MuiSwitch-track": {
            backgroundColor: theme.palette.success.main,
            borderColor: theme.palette.success.dark,
            opacity: 1,
          },
        }),
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down("sm")]: {
            paddingLeft: theme.spacing(1),
            paddingRight: theme.spacing(1),
          },
        }),
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down("sm")]: {
            paddingLeft: theme.spacing(1),
            paddingRight: theme.spacing(1),
          },
          "&:last-child": {
            [theme.breakpoints.down("sm")]: {
              paddingBottom: theme.spacing(2),
            },
          },
        }),
      },
    },
    MuiAccordion: {
      defaultProps: {
        disableGutters: true,
      },
      styleOverrides: {
        root: {
          margin: 0,
          "&.Mui-expanded": {
            margin: 0,
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down("sm")]: {
            paddingLeft: theme.spacing(1.25),
            paddingRight: theme.spacing(1.25),
            minHeight: 44,
            "&.Mui-expanded": {
              minHeight: 44,
            },
          },
        }),
        content: ({ theme }) => ({
          [theme.breakpoints.down("sm")]: {
            marginTop: theme.spacing(0.75),
            marginBottom: theme.spacing(0.75),
            "&.Mui-expanded": {
              marginTop: theme.spacing(0.75),
              marginBottom: theme.spacing(0.75),
            },
          },
        }),
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down("sm")]: {
            paddingLeft: theme.spacing(1.25),
            paddingRight: theme.spacing(1.25),
          },
        }),
      },
    },
    MuiChip: {
      defaultProps: {
        size: "small",
      },
      styleOverrides: {
        root: ({ ownerState, theme }) => ({
          fontWeight: 600,
          ...chipAccentStyles(theme.palette.mode as AppThemeMode, ownerState.color, ownerState.variant),
        }),
      },
    },
    MuiLink: {
      defaultProps: {
        underline: "always",
        color: "inherit",
      },
      styleOverrides: {
        root: ({ theme }) => ({
          color: getThemeTokens(theme.palette.mode as AppThemeMode).link,
          textDecoration: "underline",
          textUnderlineOffset: "2px",
        }),
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: (Number(theme.shape.borderRadius) || 12) - 2,
        }),
      },
    },
    MuiSkeleton: {
      defaultProps: {
        animation: "wave",
      },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: (Number(theme.shape.borderRadius) || 12) - 4,
          backgroundColor: alpha(theme.palette.text.primary, 0.08),
          "&::after": {
            background: `linear-gradient(90deg, transparent, ${alpha(
              theme.palette.common.white,
              theme.palette.mode === "dark" ? 0.16 : 0.42
            )}, transparent)`,
          },
        }),
      },
    },
    MuiCircularProgress: {
      defaultProps: {
        size: 20,
        thickness: 4,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.primary.light,
        }),
      },
    },
  },
});
