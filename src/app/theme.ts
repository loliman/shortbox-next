import { alpha, createTheme, type Shadows } from "@mui/material/styles";

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

function getThemeTokens(mode: AppThemeMode, flavor: "mac" | "material"): ThemeTokens {
  if (flavor === "mac") {
    if (mode === "dark") {
      return {
        bg: "#000000",
        paperBg: "#1c1c1e",
        text: "#ffffff",
        textSecondary: "#8e8e93",
        border: "#2c2c2e",
        rowHover: "#2c2c2e",
        link: "#0a84ff",
      };
    }
    return {
      bg: "#f2f2f7",
      paperBg: "#ffffff",
      text: "#000000",
      textSecondary: "#8e8e93",
      border: "#e5e5ea",
      rowHover: "#f2f2f7",
      link: "#007aff",
    };
  }

  // Material MD3
  if (mode === "dark") {
    return {
      bg: "#141218",
      paperBg: "#211f26",
      text: "#e6e1e5",
      textSecondary: "#cac4d0",
      border: "#49454f",
      rowHover: "#2b2930",
      link: "#d0bcff",
    };
  }

  return {
    bg: "#fef7ff",
    paperBg: "#f3edf7",
    text: "#1d1b20",
    textSecondary: "#49454f",
    border: "#cac4d0",
    rowHover: "#e8def8",
    link: "#6750a4",
  };
}

function createPalette(mode: AppThemeMode, flavor: "mac" | "material") {
  const tokens = getThemeTokens(mode, flavor);

  return {
    mode,
    primary: flavor === "mac" ? {
      main: mode === "dark" ? "#ffffff" : "#1c1c1e",
      light: mode === "dark" ? "#f2f2f7" : "#2c2c2e",
      dark: mode === "dark" ? "#d1d1d6" : "#000000",
      contrastText: mode === "dark" ? "#111111" : "#ffffff",
    } : {
      main: mode === "dark" ? "#d0bcff" : "#6750a4",
      light: mode === "dark" ? "#eaddff" : "#825ee4",
      dark: mode === "dark" ? "#381e72" : "#4f378b",
    },
    secondary: flavor === "mac" ? {
      main: mode === "dark" ? "#ff375f" : "#ff2d55",
      light: "#ff6680",
      dark: "#c2002f",
    } : {
      main: mode === "dark" ? "#ccc2dc" : "#625b71",
      light: "#e8def8",
      dark: "#4a4458",
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
      defaultBg: flavor === "mac" ? "transparent" : (mode === "dark" ? "#211f26" : "#6750a4"),
      darkBg: flavor === "mac" ? "transparent" : "#211f26",
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

const customShadows = Array(25).fill("none") as unknown as Shadows;
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

const defaultTheme = createTheme();

export function getAppTheme(flavor: "mac" | "material" = "mac") {
  return createTheme({
    cssVariables: {
      colorSchemeSelector: '[data-theme="%s"]',
    },
    shadows: flavor === "mac" ? customShadows : defaultTheme.shadows,
    colorSchemes: {
      light: {
        palette: createPalette("light", flavor),
      },
      dark: {
        palette: createPalette("dark", flavor),
      },
    },
    shape: {
      borderRadius: flavor === "mac" ? 16 : 16,
    },
    typography: {
      fontFamily: flavor === "mac"
        ? '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro", "Segoe UI", Helvetica, Arial, sans-serif'
        : 'var(--font-outfit), Roboto, "Helvetica Neue", Arial, sans-serif',
      h5: {
        fontFamily: flavor === "mac"
          ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro", sans-serif'
          : 'var(--font-outfit), Roboto, sans-serif',
        fontWeight: 700,
      },
      h6: {
        fontFamily: flavor === "mac"
          ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro", sans-serif'
          : 'var(--font-outfit), Roboto, sans-serif',
        fontWeight: 700,
      },
      subtitle1: {
        fontFamily: flavor === "mac"
          ? '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", sans-serif'
          : 'var(--font-outfit), Roboto, sans-serif',
        fontWeight: 600,
      },
      button: {
        fontFamily: flavor === "mac"
          ? '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", sans-serif'
          : 'var(--font-outfit), Roboto, sans-serif',
        textTransform: "none",
        fontWeight: flavor === "mac" ? 500 : 600,
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
            "--shortbox-glass-blur": flavor === "mac" ? "blur(24px)" : "none",
            "--shortbox-glass-blur-sm": flavor === "mac" ? "blur(4px)" : "none",
            "--shortbox-glass-blur-md": flavor === "mac" ? "blur(12px)" : "none",
            "--shortbox-glass-bg": flavor === "mac"
              ? "rgba(255, 255, 255, 0.45)"
              : "var(--mui-palette-background-paper)",
            "--shortbox-glass-bg-drawer": flavor === "mac"
              ? "rgba(242, 242, 247, 0.8)"
              : "var(--mui-palette-background-paper)",
            "--shortbox-body-bg": flavor === "mac"
              ? "linear-gradient(135deg, #f2f2f7 0%, #e5e5ea 100%)"
              : "var(--mui-palette-background-default)",
            "--shortbox-header-bg": 'linear-gradient(rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.82)), url("/header-bg.jpg")',
            "--shortbox-header-bg-color": "rgba(255, 255, 255, 0.82)",
            ...theme.applyStyles("dark", {
              "--shortbox-glass-bg": flavor === "mac"
                ? "rgba(28, 28, 30, 0.5)"
                : "var(--mui-palette-background-paper)",
              "--shortbox-glass-bg-drawer": flavor === "mac"
                ? "rgba(28, 28, 30, 0.85)"
                : "var(--mui-palette-background-paper)",
              "--shortbox-body-bg": flavor === "mac"
                ? "linear-gradient(135deg, #000000 0%, #1c1c1e 100%)"
                : "var(--mui-palette-background-default)",
              "--shortbox-header-bg": 'linear-gradient(rgba(18, 20, 27, 0.86), rgba(18, 20, 27, 0.86)), url("/header-bg.jpg")',
              "--shortbox-header-bg-color": "rgba(18, 20, 27, 0.86)",
            }),
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
        root: ({ theme }) => ({
          transition: "background-color 250ms ease, color 250ms ease, border-color 250ms ease, box-shadow 250ms ease",
          border: flavor === "mac" ? "1px solid" : "none",
          borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
          boxShadow: flavor === "mac"
            ? (theme.palette.mode === "dark" ? "0 4px 20px rgba(0, 0, 0, 0.36)" : "0 4px 20px rgba(0, 0, 0, 0.04)")
            : theme.shadows[1],
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          transition: "background-color 250ms ease, color 250ms ease, border-color 250ms ease, box-shadow 250ms ease",
          "&:not(.shortbox-layout-card):not(.issue-preview-card)": flavor === "mac" ? {
            backgroundColor: "transparent !important",
            boxShadow: "none !important",
            border: "none !important",
            borderRadius: "0 !important",
          } : {
            border: "none",
            boxShadow: theme.shadows[1],
            borderRadius: 12,
            backgroundColor: theme.palette.background.paper,
          },
          "&.shortbox-layout-card": flavor === "mac" ? {
            border: "none",
            boxShadow: theme.palette.mode === "dark" ? "0 8px 32px rgba(0, 0, 0, 0.36)" : "0 8px 32px rgba(0, 0, 0, 0.06)",
            borderRadius: 16,
          } : {
            border: "none",
            boxShadow: theme.shadows[3],
            borderRadius: 24,
            backgroundColor: theme.palette.background.paper,
          },
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: flavor === "mac"
            ? (theme.palette.mode === "dark" ? "rgba(28, 28, 30, 0.75) !important" : "rgba(255, 255, 255, 0.75) !important")
            : theme.palette.background.paper,
          backdropFilter: flavor === "mac" ? "blur(20px)" : "none",
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: flavor === "mac"
            ? "transparent !important"
            : (theme.palette.mode === "dark" ? "#211f26 !important" : "#6750a4 !important"),
          backgroundImage: flavor === "mac" ? "none !important" : "none",
          boxShadow: flavor === "mac"
            ? "none !important"
            : "0 2px 6px rgba(0, 0, 0, 0.15) !important",
          borderBottom: flavor === "mac" ? "none !important" : undefined,
          transition: "background-color 250ms ease, color 250ms ease, border-color 250ms ease, box-shadow 250ms ease",
          "& .MuiSvgIcon-root": flavor === "mac" ? {
            stroke: "currentColor",
            strokeWidth: "0.6px !important",
            filter: "drop-shadow(0px 1px 1px var(--mui-palette-background-paper)) !important",
            color: "var(--mui-palette-text-primary) !important",
            opacity: "1 !important",
            transition: "transform 150ms ease !important",
            "&:hover": {
              transform: "scale(1.1) !important",
            },
          } : undefined,
          "& .MuiButton-root:not(.locale-switch-btn)": flavor === "mac" ? {
            fontWeight: "800 !important",
            color: "var(--mui-palette-text-primary) !important",
            transition: "transform 150ms ease !important",
            "&:hover": {
              transform: "scale(1.05) !important",
            },
          } : undefined,
        }),
        colorPrimary: ({ theme }) => ({
          backgroundColor: flavor === "mac"
            ? "transparent !important"
            : (theme.palette.mode === "dark" ? "#211f26 !important" : "#6750a4 !important"),
          backgroundImage: flavor === "mac" ? "none !important" : "none",
        }),
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: flavor === "mac",
      },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: flavor === "mac" ? "8px !important" : "999px !important",
          textTransform: "none",
          fontWeight: flavor === "mac" ? 500 : 600,
        }),
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: flavor === "mac"
            ? (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.05)")
            : "transparent",
          padding: flavor === "mac" ? 2 : 0,
          borderRadius: flavor === "mac" ? "8px !important" : "999px !important",
          border: flavor === "mac" ? "none" : `1px solid ${theme.palette.divider}`,
          gap: flavor === "mac" ? 2 : 0,
        }),
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: flavor === "mac" ? "none !important" : undefined,
          borderRadius: flavor === "mac" ? "8px !important" : "999px !important",
          textTransform: "none",
          fontWeight: flavor === "mac" ? 500 : 600,
          padding: flavor === "mac" ? "6px 16px" : undefined,
          color: theme.palette.text.secondary,
          transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
          "&.Mui-selected, &.Mui-selected.MuiToggleButton-standard, &.Mui-selected.MuiToggleButton-primary": flavor === "mac" ? {
            backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1) !important" : "#ffffff !important",
            color: `${theme.palette.text.primary} !important`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
          } : {
            backgroundColor: theme.palette.mode === "dark" ? "#eaddff" : "#6750a4",
            color: theme.palette.mode === "dark" ? "#21005d" : "#ffffff",
            borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.22)",
            "&:hover": {
              backgroundColor: theme.palette.mode === "dark" ? "#d0bcff" : "#4f378b",
              color: theme.palette.mode === "dark" ? "#21005d" : "#ffffff",
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
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          margin: flavor === "mac" ? "2px 8px" : "0px",
          padding: flavor === "mac" ? "6px 12px" : "8px 16px",
          borderRadius: flavor === "mac" ? "8px" : "0px",
          transition: "all 150ms ease",
          "&.Mui-selected": flavor === "mac" ? {
            backgroundColor: `${theme.palette.primary.main} !important`,
            color: `${theme.palette.primary.contrastText} !important`,
            "& .MuiListItemIcon-root": {
              color: `${theme.palette.primary.contrastText} !important`,
            },
            "& .MuiListItemText-primary": {
              color: `${theme.palette.primary.contrastText} !important`,
              fontWeight: "600 !important",
            },
            "& .MuiListItemText-secondary": {
              color: `${theme.palette.primary.contrastText} !important`,
              opacity: "0.7 !important",
            },
          } : {
            backgroundColor: `${alpha(theme.palette.primary.main, 0.08)} !important`,
            borderLeft: `4px solid ${theme.palette.primary.main}`,
            "& .MuiListItemIcon-root": {
              color: `${theme.palette.primary.main} !important`,
            },
            "& .MuiListItemText-primary": {
              color: `${theme.palette.primary.main} !important`,
              fontWeight: "600 !important",
            },
          },
          "&:hover": flavor === "mac" ? {
            backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
          } : undefined,
        }),
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: `${flavor === "mac" ? 10 : 12}px !important`,
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: `${flavor === "mac" ? 10 : 12}px !important`,
          backgroundColor: flavor === "mac"
            ? (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)")
            : "transparent",
          transition: "all 150ms ease",
          "& .MuiOutlinedInput-notchedOutline": flavor === "mac" ? {
            border: "none",
          } : undefined,
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": flavor === "mac" ? {
            border: `1.5px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.2)"}`,
          } : undefined,
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
          color: getThemeTokens(theme.palette.mode as AppThemeMode, flavor).link,
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
}

export const appTheme = getAppTheme("mac");
