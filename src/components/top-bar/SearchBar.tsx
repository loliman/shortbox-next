"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import { alpha } from "@mui/material/styles";

type SearchNode = {
  type?: string | null;
  label?: string | null;
  url?: string | null;
};
const MIN_QUERY_LENGTH = 2;
const RESULT_ROW_HEIGHT = 44;
const RESULT_PANEL_MAX_HEIGHT = 911;
const RESULT_PANEL_BOTTOM_BUFFER = 12;

interface SearchBarProps {
  us?: boolean;
  autoFocus?: boolean;
  compactLayout?: boolean;
  onFocus?: (
    event: React.FocusEvent<HTMLElement> | React.MouseEvent<HTMLElement> | null,
    focus: boolean
  ) => void;
}

export default function SearchBar(ownProps: Readonly<SearchBarProps>) {
  const router = useRouter();
  const [pattern, setPattern] = useState("");
  const [debouncedPattern, setDebouncedPattern] = useState("");
  const [focused, setFocused] = useState(false);
  const [hintDotCount, setHintDotCount] = useState(0);
  const queryPattern = debouncedPattern;
  const us = Boolean(ownProps.us);
  const compactLayout = Boolean(ownProps.compactLayout);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedPattern(pattern.trim());
    }, 250);

    return () => {
      window.clearTimeout(handle);
    };
  }, [pattern]);

  useEffect(() => {
    const handle = window.setInterval(() => {
      setHintDotCount((prev) => (prev + 1) % 4);
    }, 520);

    return () => {
      window.clearInterval(handle);
    };
  }, []);

  const [options, setOptions] = useState<SearchNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const shortQuery = queryPattern.length < MIN_QUERY_LENGTH;

  useEffect(() => {
    if (shortQuery) return;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });

    const params = new URLSearchParams({
      locale: us ? "us" : "de",
      pattern: queryPattern,
    });

    void fetch(`/api/public-search?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Search request failed: ${response.status}`);
        return (await response.json()) as { items?: SearchNode[] };
      })
      .then((payload) => {
        if (cancelled) return;
        setOptions(
          (payload.items || [])
            .filter((node): node is SearchNode => Boolean(node?.label && node?.url))
            .slice(0, 50)
        );
      })
      .catch((nextError) => {
        if (cancelled) return;
        setOptions([]);
        setError(nextError);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryPattern, shortQuery, us]);
  const resolvedOptions = shortQuery ? [] : options;
  const resolvedLoading = shortQuery ? false : loading;
  const resolvedError = shortQuery ? null : error;
  const resultRows = Math.max(1, resolvedOptions.length);
  const resultsPanelHeight = Math.min(
    RESULT_PANEL_MAX_HEIGHT,
    resultRows * RESULT_ROW_HEIGHT + RESULT_PANEL_BOTTOM_BUFFER
  );
  const getResultsSurfaceColor = (theme: any) =>
    theme.vars?.palette.background.paper ?? theme.palette.background.paper;

  const handleFocus = (
    e: React.FocusEvent<HTMLElement> | React.MouseEvent<HTMLElement> | null,
    focus: boolean
  ) => {
    setFocused(focus);
    ownProps.onFocus?.(e, focus);
  };

  const closeSearch = (e: React.FocusEvent<HTMLElement> | React.MouseEvent<HTMLElement> | null) => {
    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur();
    handleFocus(e, false);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Backdrop
        open={focused}
        onClick={(e) => closeSearch(e as unknown as React.MouseEvent<HTMLElement>)}
        sx={{
          zIndex: (theme) => theme.zIndex.appBar + 1,
          backgroundColor: (theme) =>
            alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.58 : 0.36),
          backdropFilter: "blur(5px)",
        }}
      />
      <Autocomplete
        size="small"
        disablePortal
        forcePopupIcon={false}
        open={focused}
        slotProps={{
          popper: {
            sx: {
              position: "fixed !important",
              top: { xs: "86px !important", sm: "94px !important" },
              left: "50% !important",
              right: "auto !important",
              transform: "translateX(-50%) !important",
              width: compactLayout
                ? "95vw !important"
                : "min(96vw, 770px) !important",
              maxWidth: compactLayout ? "95vw !important" : "96vw !important",
              minWidth: compactLayout ? "95vw !important" : "min(96vw, 770px) !important",
              zIndex: (theme) => theme.zIndex.appBar + 3,
            },
          },
          paper: {
            sx: {
              borderRadius: 2,
              border: "2px solid",
              borderColor: (theme) =>
                alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.3 : 0.22),
              boxShadow: (theme) => `0 18px 44px ${alpha(theme.palette.common.black, 0.42)}`,
              backdropFilter: "blur(10px)",
              backgroundColor: getResultsSurfaceColor,
              backgroundImage: "none",
              width: "100%",
              height: `${resultsPanelHeight}px`,
              minHeight: `${resultsPanelHeight}px`,
              maxHeight: `${RESULT_PANEL_MAX_HEIGHT}px`,
              transform: focused ? "scale(1.02)" : "scale(1)",
              transformOrigin: "top center",
              transition: "transform 220ms ease",
              overflow: "hidden",
              "& .MuiAutocomplete-noOptions": {
                height: `${resultsPanelHeight}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                width: "100%",
                fontSize: "1.35rem",
                py: 0,
                backgroundColor: "transparent",
              },
            },
          },
          listbox: {
            sx: {
              height: `${resultsPanelHeight}px`,
              minHeight: `${resultsPanelHeight}px`,
              maxHeight: `${RESULT_PANEL_MAX_HEIGHT}px`,
              overflowY: "auto",
              py: 0.5,
              backgroundColor: getResultsSurfaceColor,
              backgroundImage: "none",
              "& li": {
                backgroundColor: "transparent",
              },
              "& .MuiAutocomplete-option": {
                minHeight: 44,
                borderBottom: "1px solid",
                borderColor: "divider",
                backgroundColor: getResultsSurfaceColor,
                color: "text.primary",
                "&[aria-selected='true']": {
                  backgroundColor: (theme) =>
                    alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.08),
                },
                "&.Mui-focused": {
                  backgroundColor: (theme) =>
                    alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.06),
                },
              },
              "& .MuiAutocomplete-option:last-of-type": {
                borderBottom: "none",
              },
            },
          },
        }}
        options={resolvedOptions}
        filterOptions={(x) => x}
        loading={resolvedLoading}
        inputValue={pattern}
        noOptionsText={
          shortQuery ? (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                minWidth: 0,
                gap: 0.15,
              }}
            >
              <Typography
                component="span"
                noWrap
                sx={{ minWidth: 0, flexShrink: 0, fontSize: "1rem", color: "text.primary" }}
              >
                Tippen zum Suchen
              </Typography>
              <Typography component="span" noWrap sx={{ minWidth: "1.2em", textAlign: "left" }}>
                {".".repeat(hintDotCount)}
              </Typography>
            </Box>
          ) : resolvedError ? (
            <Typography component="span" noWrap sx={{ fontSize: "1rem", color: "text.primary" }}>
              Suche aktuell nicht verfügbar
            </Typography>
          ) : (
            <Typography component="span" noWrap sx={{ fontSize: "1rem", color: "text.primary" }}>
              Keine Ergebnisse gefunden
            </Typography>
          )
        }
        getOptionLabel={(option) =>
          typeof option === "string" ? option : `${getNodeType(option.type)} ${option.label || ""}`
        }
        isOptionEqualToValue={(a, b) => (a.url || "") === (b.url || "")}
        onInputChange={(_, value, reason) => {
          if (reason === "input" || reason === "clear") setPattern(value);
        }}
        onChange={(_, value) => {
          if (!value || typeof value === "string" || !value.url) return;

          setPattern("");
          closeSearch(null);
          router.push(value.url);
        }}
        onClose={(_, reason) => {
          if (reason === "escape") closeSearch(null);
        }}
        onFocus={(e) => handleFocus(e, true)}
        onBlur={(e) => handleFocus(e, false)}
        renderOption={(optionProps, option) => {
          const { key, ...restOptionProps } = optionProps;

          return (
          <li key={key} {...restOptionProps}>
            <Box
              sx={{ width: "100%", display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}
            >
              <Typography component="span" noWrap sx={{ minWidth: 0, flex: 1 }}>
                {option.label || ""}
              </Typography>
              <Typography
                component="span"
                variant="caption"
                sx={{
                  px: 0.75,
                  py: 0.2,
                  borderRadius: 1,
                  fontWeight: 700,
                  flexShrink: 0,
                  ...getNodeTypeBadgeSx(option.type),
                }}
              >
                {getNodeType(option.type)}
              </Typography>
            </Box>
          </li>
          );
        }}
        sx={{
          width: "100%",
          position: "relative",
          zIndex: (theme) => theme.zIndex.appBar + 2,
          transform: focused ? (compactLayout ? "scale(1)" : "scale(1.1)") : "scale(1)",
          transformOrigin: "center",
          transition: "transform 220ms ease",
          "& .MuiOutlinedInput-root": {
            backgroundColor: "background.paper",
            borderRadius: 2.5,
            transition:
              "box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease",
            "& fieldset": {
              borderColor: "divider",
            },
            "&:hover fieldset": {
              borderColor: "text.secondary",
            },
            "&.Mui-focused fieldset": {
              borderColor: "primary.light",
            },
            "&.Mui-focused": {
              boxShadow: (theme) =>
                `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}, 0 10px 26px ${alpha(
                  theme.palette.common.black,
                  0.35
                )}`,
              backgroundColor: "background.paper",
            },
          },
          "& .MuiAutocomplete-paper": {
            backgroundColor: getResultsSurfaceColor,
            backgroundImage: "none",
          },
          "& .MuiAutocomplete-listbox": {
            backgroundColor: getResultsSurfaceColor,
            backgroundImage: "none",
          },
          "& .MuiAutocomplete-option": {
            backgroundColor: getResultsSurfaceColor,
          },
          "& .MuiInputBase-input::placeholder": {
            color: "text.secondary",
            opacity: 1,
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            autoFocus={Boolean(ownProps.autoFocus)}
            placeholder="Nach Comic suchen..."
            inputProps={{
              ...params.inputProps,
              "aria-label": "Suche",
            }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={18} /> : null}
                  <InputAdornment position="end">
                    <SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                  </InputAdornment>
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </Box>
  );
}

export function getNodeType(type?: string | null) {
  switch (type) {
    case "publisher":
      return "Verlag";
    case "series":
      return "Serie";
    default:
      return "Ausgabe";
  }
}

function getNodeTypeBadgeSx(type?: string | null) {
  switch (type) {
    case "publisher":
      return {
        bgcolor: (theme: any) =>
          alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.24 : 0.16),
        color: (theme: any) =>
          theme.palette.mode === "dark" ? theme.palette.warning.light : theme.palette.warning.dark,
        border: "1px solid",
        borderColor: (theme: any) =>
          alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.46 : 0.35),
      };
    case "series":
      return {
        bgcolor: (theme: any) =>
          alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.22 : 0.14),
        color: (theme: any) =>
          theme.palette.mode === "dark" ? theme.palette.info.light : theme.palette.info.dark,
        border: "1px solid",
        borderColor: (theme: any) =>
          alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.42 : 0.3),
      };
    default:
      return {
        bgcolor: (theme: any) =>
          alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.12),
        color: (theme: any) =>
          theme.palette.mode === "dark" ? theme.palette.primary.light : theme.palette.primary.dark,
        border: "1px solid",
        borderColor: (theme: any) =>
          alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.4 : 0.28),
      };
  }
}
