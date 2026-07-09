import { alpha, createTheme } from "@mui/material/styles";

export type AppThemeMode = "light" | "dark";

type ThemeTokens = {
  bg: string;
  paperBg: string;
  text: string;
  textSecondary: string;
  border: string;
  rowHover: string;
  link: string;
};

function getThemeTokens(mode: AppThemeMode): ThemeTokens {
  if (mode === "dark") {
    return {
      bg: "#141413",
      paperBg: "#1b1b1a",
      text: "#f3f2ef",
      textSecondary: "#9d9a94",
      border: "#201f1d",
      rowHover: "#1b1b1a",
      link: "#d4a373",
    };
  }

  return {
    bg: "#f9fafb",
    paperBg: "#ffffff",
    text: "#111827",
    textSecondary: "#4b5563",
    border: "#e5e7eb",
    rowHover: "#f3f4f6",
    link: "#2563eb",
  };
}

function createPalette(mode: AppThemeMode) {
  const tokens = getThemeTokens(mode);

  return {
    mode,
    primary: {
      main: mode === "dark" ? "#eae6df" : "#000000",
      light: mode === "dark" ? "#f9f8f6" : "#2b2b2b",
      dark: mode === "dark" ? "#d1c9bd" : "#000000",
    },
    secondary: {
      main: "#b12c4a",
      light: "#d45571",
      dark: "#7b2035",
    },
    background: {
      default: tokens.bg,
      paper: tokens.paperBg,
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
      bgTop: "rgba(212, 163, 115, 0.25)",
      bgBottom: "rgba(212, 163, 115, 0.15)",
      border: "rgba(226, 180, 140, 0.35)",
      text: "#f0d5be",
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

const customShadows = Array(25).fill("none") as any;
customShadows[0] = "none";
customShadows[1] = "0 1px 2px rgba(0, 0, 0, 0.04)";
customShadows[2] = "0 4px 12px rgba(0, 0, 0, 0.05)";
customShadows[3] = "0 8px 20px rgba(0, 0, 0, 0.06)";
customShadows[4] = "0 10px 24px rgba(0, 0, 0, 0.07)";
customShadows[6] = "0 12px 28px rgba(0, 0, 0, 0.08)";
customShadows[8] = "0 16px 36px rgba(0, 0, 0, 0.09)";
customShadows[12] = "0 20px 48px rgba(0, 0, 0, 0.1)";
customShadows[16] = "0 24px 60px rgba(0, 0, 0, 0.12)";
customShadows[24] = "0 32px 72px rgba(0, 0, 0, 0.15)";
for (let i = 1; i < 25; i++) {
  if (customShadows[i] === "none") {
    customShadows[i] = `0 ${i * 2}px ${i * 4}px rgba(0,0,0,0.05)`;
  }
}

export const appTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: '[data-theme="%s"]',
  },
  shadows: customShadows,
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
    fontFamily: 'var(--font-inter), Roboto, "Helvetica Neue", Arial, sans-serif',
    h5: {
      fontFamily: 'var(--font-outfit), var(--font-inter), sans-serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: 'var(--font-outfit), var(--font-inter), sans-serif',
      fontWeight: 700,
    },
    subtitle1: {
      fontFamily: 'var(--font-inter), sans-serif',
      fontWeight: 600,
    },
    button: {
      fontFamily: 'var(--font-outfit), var(--font-inter), sans-serif',
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        html: {
          scrollbarWidth: "thin",
          scrollbarColor:
            theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.12) transparent"
              : "rgba(0, 0, 0, 0.12) transparent",
        },
        body: {
          transition: "background-color 250ms ease, color 250ms ease, border-color 250ms ease",
        },
        // Premium slim scrollbars
        "*::-webkit-scrollbar": {
          width: "8px",
          height: "8px",
        },
        "*::-webkit-scrollbar-track": {
          background: "transparent",
        },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: "rgba(0, 0, 0, 0.12)",
          borderRadius: "8px",
          transition: "background-color 150ms ease",
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.22)",
          },
        },
        ...theme.applyStyles("dark", {
          "*::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.22)",
            },
          },
        }),
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
      }),
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          transition: "background-color 250ms ease, color 250ms ease, border-color 250ms ease, box-shadow 250ms ease",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition: "background-color 250ms ease, color 250ms ease, border-color 250ms ease, box-shadow 250ms ease",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: "#000000",
          backdropFilter: "none",
          color: theme.palette.common.white,
          backgroundImage: "none",
          borderBottomWidth: 1,
          borderBottomStyle: "solid",
          borderBottomColor:
            theme.palette.mode === "dark"
              ? (theme.vars?.palette.divider ?? theme.palette.divider)
              : "rgba(255, 255, 255, 0.08)",
          transition: "background-color 250ms ease, color 250ms ease, border-color 250ms ease",
        }),
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: (Number(theme.shape.borderRadius) || 12) - 4,
        }),
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.mode === "dark" ? "#c7c4bc" : "rgba(0, 0, 0, 0.54)",
          borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.12)",
          "&:hover": {
            backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
            color: theme.palette.mode === "dark" ? "#f9f8f6" : "rgba(0, 0, 0, 0.87)",
          },
          "&.Mui-selected, &.Mui-selected.MuiToggleButton-standard, &.Mui-selected.MuiToggleButton-primary": {
            backgroundColor: theme.palette.mode === "dark" ? "#ffffff" : "#111827",
            color: theme.palette.mode === "dark" ? "#141413" : "#ffffff",
            borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.22)",
            "&:hover": {
              backgroundColor: theme.palette.mode === "dark" ? "#f3f4f6" : "#1f2937",
              color: theme.palette.mode === "dark" ? "#141413" : "#ffffff",
            },
          },
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
          transition: "background-color 250ms ease, border-color 250ms ease",
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
