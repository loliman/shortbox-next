"use client";

import React, { useEffect, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { alpha } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { usePendingNavigation } from "../generic/usePendingNavigation";
import FilterQueryChips from "./FilterQueryChips";
import FilterPanel from "./FilterPanel";
import {
  parseQueryString,
  filterValuesToQueryString,
  queryStringToFilterValues,
  flattenFilterToChips,
  flattenASTToFlatFilterValues,
  type SerializedFilter,
  type RenderChipToken,
  type ParsedQueryToken,
} from "../../lib/filter-query-syntax";
import { parseFilterValues, createDefaultFilterValues } from "../filter/defaults";
import { serializeFilterValues } from "../filter/serialize";
import type { FilterValues } from "../../types/filter";

type SearchNode = {
  type?: string | null;
  label?: string | null;
  url?: string | null;
};

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

const MIN_QUERY_LENGTH = 2;
const RESULT_ROW_HEIGHT = 44;
const RESULT_PANEL_MAX_HEIGHT = 911;
const RESULT_PANEL_BOTTOM_BUFFER = 12;

interface SearchBarProps {
  us?: boolean;
  autoFocus?: boolean;
  compactLayout?: boolean;
  onFocus?: (event: SearchFocusEvent, focus: boolean) => void;
  /** Current active filter JSON string (from ?filter= query param) */
  filterQuery?: string | null;
  /** Called when filters change – receives new JSON string or null to clear */
  onFilterChange?: (filter: string | null) => void;
  /** Whether the user has an active session (for Collection filters) */
  hasSession?: boolean;
}

type SearchFocusEvent = React.FocusEvent<HTMLElement> | React.MouseEvent<HTMLElement> | null;

function cleanAST(filter: SerializedFilter, us: boolean): unknown {
  if (!filter) return null;
  if ("operator" in filter && Array.isArray(filter.operands)) {
    const operands = filter.operands.map((op) => cleanAST(op, us)).filter(Boolean);
    if (operands.length === 0) return null;
    if (operands.length === 1) return operands[0];
    return { operator: filter.operator, operands };
  }
  return serializeFilterValues(filter as FilterValues, us);
}

export default function SearchBar(ownProps: Readonly<SearchBarProps>) {
  const { navigationPending, push } = usePendingNavigation();
  const [pattern, setPattern] = useState("");
  const [debouncedPattern, setDebouncedPattern] = useState("");
  const [focused, setFocused] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const shortcutHint = React.useMemo(() => {
    if (typeof navigator === "undefined") return "⌘K";
    const platform =
      (navigator as NavigatorWithUserAgentData).userAgentData?.platform ??
      navigator.userAgent ??
      "";
    return /Mac|iPhone|iPad|iPod/i.test(platform) ? "⌘K" : "⌃K";
  }, []);

  const us = Boolean(ownProps.us);
  const compactLayout = Boolean(ownProps.compactLayout);
  const filterQuery = ownProps.filterQuery ?? null;
  const hasSession = Boolean(ownProps.hasSession);

  // ---------------------------------------------------------------------------
  // Filter token parsing from the current filterQuery JSON
  // ---------------------------------------------------------------------------
  const filterTokens = React.useMemo<RenderChipToken[]>(() => {
    if (!filterQuery) return [];
    try {
      const parsed = JSON.parse(filterQuery);
      const filterAST =
        parsed && typeof parsed === "object" && "operator" in parsed && Array.isArray(parsed.operands)
          ? (parsed as SerializedFilter)
          : parseFilterValues(filterQuery);
      return flattenFilterToChips(filterAST);
    } catch {
      return [];
    }
  }, [filterQuery]);

  // ---------------------------------------------------------------------------
  // Live query-syntax parsing as user types
  // ---------------------------------------------------------------------------
  const { tokens: typedTokens, freetext } = React.useMemo(
    () => parseQueryString(pattern),
    [pattern]
  );

  // As soon as the user finishes typing a complete token (ends with space),
  // commit it to the filter immediately.
  useEffect(() => {
    if (!pattern.endsWith(" ") || typedTokens.length === 0) return;
    const lastToken = typedTokens[typedTokens.length - 1];
    if (lastToken.kind === "freetext") return;

    // Parse the existing filter as a potentially nested AST
    let existingAST: SerializedFilter | null = null;
    if (filterQuery) {
      try {
        const parsed = JSON.parse(filterQuery);
        if (parsed && typeof parsed === "object" && "operator" in parsed && Array.isArray(parsed.operands)) {
          existingAST = parsed as SerializedFilter;
        } else {
          existingAST = parseFilterValues(filterQuery);
        }
      } catch {
        existingAST = null;
      }
    }

    const defaultBase = createDefaultFilterValues();
    const baseValues = existingAST ? flattenASTToFlatFilterValues(existingAST, defaultBase) : defaultBase;
    const existingQS = existingAST ? filterValuesToQueryString(existingAST) : "";
    const typedQS = typedTokens.map((t) => t.raw).join(" ");
    const combinedQS = (existingQS ? existingQS + " " : "") + typedQS;

    const { values: updatedValues } = queryStringToFilterValues(combinedQS, baseValues);
    const payload = cleanAST(updatedValues, us);
    ownProps.onFilterChange?.(payload ? JSON.stringify(payload) : null);

    // Reset input to just the freetext remainder
    setPattern(freetext ? freetext + " " : "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern]);

  // ---------------------------------------------------------------------------
  // Debounced search (freetext only)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handle = globalThis.setTimeout(() => {
      setDebouncedPattern(freetext.trim());
    }, 250);
    return () => globalThis.clearTimeout(handle);
  }, [freetext]);

  const queryPattern = debouncedPattern;

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
          (payload.items ?? [])
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

    return () => { cancelled = true; };
  }, [queryPattern, shortQuery, us]);

  const resolvedOptions = shortQuery ? [] : options;
  const resolvedLoading = shortQuery ? false : loading;
  const resolvedError = shortQuery ? null : error;
  const resultRows = Math.max(1, resolvedOptions.length);
  const resultsPanelHeight = Math.min(
    RESULT_PANEL_MAX_HEIGHT,
    resultRows * RESULT_ROW_HEIGHT + RESULT_PANEL_BOTTOM_BUFFER
  );
  const getResultsSurfaceColor = (theme: Theme) =>
    theme.vars?.palette.background.paper ?? theme.palette.background.paper;

  const handleFocus = (e: SearchFocusEvent, focus: boolean) => {
    setFocused(focus);
    ownProps.onFocus?.(e, focus);
  };

  const closeSearch = (e: SearchFocusEvent) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    handleFocus(e, false);
  };

  // ---------------------------------------------------------------------------
  // Token removal
  // ---------------------------------------------------------------------------
  const handleRemoveToken = (idx: number) => {
    if (!ownProps.onFilterChange) return;
    const remaining = filterTokens.filter((_, i) => i !== idx);
    if (remaining.length === 0) {
      ownProps.onFilterChange(null);
      return;
    }
    const qs = remaining.map((t) => t.raw).join(" ");
    const { values } = queryStringToFilterValues(qs, createDefaultFilterValues());
    const payload = cleanAST(values, us);
    ownProps.onFilterChange(payload ? JSON.stringify(payload) : null);
  };

  const handleResetAll = () => {
    ownProps.onFilterChange?.(null);
  };

  const isFilterActive = filterTokens.length > 0 || Boolean(filterQuery);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
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

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, width: "100%" }}>
        {/* Main search + filter chip area */}
        <Box sx={{ flex: 1, minWidth: 0, position: "relative" }}>
          <Autocomplete
            size="small"
            disablePortal
            forcePopupIcon={false}
            open={focused && (resolvedOptions.length > 0 || !shortQuery)}
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
                  boxShadow: (theme) =>
                    `0 18px 44px ${alpha(theme.palette.common.black, 0.42)}`,
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
                  "& li": { backgroundColor: "transparent" },
                  "& .MuiAutocomplete-option": {
                    minHeight: 44,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    backgroundColor: getResultsSurfaceColor,
                    color: "text.primary",
                    "&[aria-selected='true']": {
                      backgroundColor: (theme) =>
                        alpha(
                          theme.palette.primary.main,
                          theme.palette.mode === "dark" ? 0.24 : 0.08
                        ),
                    },
                    "&.Mui-focused": {
                      backgroundColor: (theme) =>
                        alpha(
                          theme.palette.primary.main,
                          theme.palette.mode === "dark" ? 0.18 : 0.06
                        ),
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
              shortQuery && filterTokens.length === 0 ? (
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
                    Tippe, um zu suchen… oder v:Verlag, f:Format, erstdruck
                  </Typography>
                </Box>
              ) : (
                <Typography component="span" noWrap sx={{ fontSize: "1rem", color: "text.primary" }}>
                  {resolvedError ? "Suche aktuell nicht verfügbar" : "Keine Ergebnisse gefunden"}
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
              push(value.url);
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
            sx={(theme) => ({
              "--shortbox-search-bg": "var(--mui-palette-background-paper)",
              width: "100%",
              position: "relative",
              zIndex: theme.zIndex.appBar + 2,
              transform: resolveSearchTransform(focused, compactLayout),
              transformOrigin: "center",
              transition: "transform 220ms ease",
              "& .MuiOutlinedInput-root": {
                backgroundColor: "var(--shortbox-search-bg)",
                borderRadius: 2.5,
                color: theme.palette.mode === "dark" ? theme.palette.common.white : "#111111",
                opacity: 1,
                transition:
                  "box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease",
                // Chip container before the input text
                flexWrap: "nowrap",
                paddingLeft: filterTokens.length > 0 ? "6px !important" : undefined,
                "& input": {
                  color: `${theme.palette.mode === "dark" ? theme.palette.common.white : "#111111"} !important`,
                  WebkitTextFillColor: `${theme.palette.mode === "dark" ? theme.palette.common.white : "#111111"} !important`,
                  opacity: "1 !important",
                  fontWeight: 500,
                  minWidth: "80px",
                },
                "& input::placeholder": {
                  color: `${theme.palette.mode === "dark" ? "rgba(255,255,255,0.72)" : "rgba(17,17,17,0.46)"} !important`,
                  WebkitTextFillColor: `${theme.palette.mode === "dark" ? "rgba(255,255,255,0.72)" : "rgba(17,17,17,0.46)"} !important`,
                  opacity: "1 !important",
                },
                "& fieldset": {
                  borderColor: isFilterActive
                    ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.55 : 0.4)
                    : "rgba(17, 17, 17, 0.18)",
                },
                "&:hover fieldset": {
                  borderColor: isFilterActive
                    ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.75 : 0.6)
                    : "rgba(17, 17, 17, 0.32)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#111111",
                },
                "&.Mui-focused": {
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}, 0 10px 26px ${alpha(
                    theme.palette.common.black,
                    0.35
                  )}`,
                  backgroundColor: "var(--shortbox-search-bg)",
                },
                ...theme.applyStyles("dark", {
                  backgroundColor: "var(--shortbox-search-bg)",
                  color: theme.palette.common.white,
                  "& input": {
                    color: `${theme.palette.common.white} !important`,
                    WebkitTextFillColor: `${theme.palette.common.white} !important`,
                    opacity: "1 !important",
                    fontWeight: 500,
                  },
                  "& input::placeholder": {
                    color: "rgba(255,255,255,0.72) !important",
                    WebkitTextFillColor: "rgba(255,255,255,0.72) !important",
                    opacity: "1 !important",
                  },
                  "& fieldset": {
                    borderColor: isFilterActive
                      ? alpha(theme.palette.primary.main, 0.55)
                      : alpha(theme.palette.common.white, 0.34),
                  },
                  "&:hover fieldset": {
                    borderColor: isFilterActive
                      ? alpha(theme.palette.primary.main, 0.75)
                      : alpha(theme.palette.common.white, 0.54),
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: theme.palette.primary.light,
                  },
                  "&.Mui-focused": {
                    backgroundColor: "var(--mui-palette-background-paper)",
                    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.28)}, 0 10px 26px ${alpha(
                      theme.palette.common.black,
                      0.35
                    )}`,
                  },
                }),
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
            })}
            renderInput={(params) => {
              const { inputProps, InputProps, ...restParams } = params;
              return (
                <TextField
                  {...restParams}
                  variant="outlined"
                  autoFocus={Boolean(ownProps.autoFocus)}
                  sx={(theme) => ({
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "var(--shortbox-search-bg)",
                      color: theme.palette.mode === "dark" ? theme.palette.common.white : "#111111",
                    },
                    "& .MuiOutlinedInput-input": {
                      fontSize: "0.95rem",
                      lineHeight: 1.2,
                      color: `${theme.palette.mode === "dark" ? theme.palette.common.white : "#111111"} !important`,
                      WebkitTextFillColor: `${theme.palette.mode === "dark" ? theme.palette.common.white : "#111111"} !important`,
                      fontWeight: 500,
                      opacity: "1 !important",
                    },
                    ...theme.applyStyles("dark", {
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "var(--mui-palette-background-paper)",
                        color: theme.palette.common.white,
                      },
                      "& .MuiOutlinedInput-input": {
                        color: `${theme.palette.common.white} !important`,
                        WebkitTextFillColor: `${theme.palette.common.white} !important`,
                      },
                    }),
                  })}
                  slotProps={{
                    htmlInput: {
                      ...inputProps,
                      "aria-label": "Shortbox durchsuchen",
                      "data-shortbox-search-input": "true",
                      placeholder:
                        filterTokens.length > 0
                          ? "weiteren Filter eingeben…"
                          : `Suchen · ${shortcutHint} · v:Verlag s:Serie f:Format`,
                    },
                    input: {
                      ...InputProps,
                      startAdornment: filterTokens.length > 0 ? (
                        <FilterQueryChips
                          tokens={filterTokens}
                          onRemoveToken={handleRemoveToken}
                          onResetAll={handleResetAll}
                        />
                      ) : undefined,
                      endAdornment: (
                        <>
                          {loading || navigationPending ? (
                            <CircularProgress color="inherit" size={18} />
                          ) : null}
                          <InputAdornment position="end">
                            <SearchIcon
                              sx={(theme) => ({
                                fontSize: 20,
                                color: "#111111",
                                ...theme.applyStyles("dark", {
                                  color: theme.palette.common.white,
                                }),
                              })}
                            />
                          </InputAdornment>
                          {InputProps.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              );
            }}
          />
        </Box>

        {/* Filter toggle button – only on desktop (compactLayout handled in TopBar) */}
        {!compactLayout && ownProps.onFilterChange && (
          <Tooltip title={isFilterActive ? "Filter bearbeiten" : "Filter öffnen"} describeChild>
            <Box sx={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
              <Badge
                color="secondary"
                overlap="circular"
                showZero={false}
                badgeContent={filterTokens.length || undefined}
                invisible={!isFilterActive}
                slotProps={{
                  badge: {
                    sx: { fontSize: "0.62rem", minWidth: 17, height: 17, px: 0.45 },
                  },
                }}
              >
                <IconButton
                  ref={filterButtonRef}
                  size="small"
                  color={isFilterActive ? "primary" : "inherit"}
                  aria-label="Filter-Panel öffnen"
                  onClick={() => setFilterPanelOpen((prev) => !prev)}
                  sx={(theme) => ({
                    color: isFilterActive
                      ? theme.palette.primary.light
                      : theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(255,255,255,0.85)",
                    "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.1)",
                    },
                  })}
                >
                  {isFilterActive ? (
                    <FilterAltIcon sx={{ fontSize: 20 }} />
                  ) : (
                    <FilterAltOutlinedIcon sx={{ fontSize: 20 }} />
                  )}
                </IconButton>
              </Badge>
            </Box>
          </Tooltip>
        )}
      </Box>

      {/* Filter Panel Popover */}
      <FilterPanel
        anchorEl={filterButtonRef.current}
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        us={us}
        filterQuery={filterQuery}
        hasSession={hasSession}
        onFilterChange={(next) => {
          ownProps.onFilterChange?.(next);
          setFilterPanelOpen(false);
        }}
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
        bgcolor: (theme: Theme) =>
          alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.24 : 0.16),
        color: (theme: Theme) =>
          theme.palette.mode === "dark" ? theme.palette.warning.light : theme.palette.warning.dark,
        border: "1px solid",
        borderColor: (theme: Theme) =>
          alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.46 : 0.35),
      };
    case "series":
      return {
        bgcolor: (theme: Theme) =>
          alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.22 : 0.14),
        color: (theme: Theme) =>
          theme.palette.mode === "dark" ? theme.palette.info.light : theme.palette.info.dark,
        border: "1px solid",
        borderColor: (theme: Theme) =>
          alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.42 : 0.3),
      };
    default:
      return {
        bgcolor: (theme: Theme) =>
          alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.12),
        color: (theme: Theme) =>
          theme.palette.mode === "dark" ? theme.palette.primary.light : theme.palette.primary.dark,
        border: "1px solid",
        borderColor: (theme: Theme) =>
          alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.4 : 0.28),
      };
  }
}

function resolveSearchTransform(focused: boolean, compactLayout: boolean): string {
  if (!focused) return "scale(1)";
  return compactLayout ? "scale(1)" : "scale(1.1)";
}
