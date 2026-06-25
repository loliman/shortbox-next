"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import Fade from "@mui/material/Fade";
import Collapse from "@mui/material/Collapse";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import TerminalIcon from "@mui/icons-material/Terminal";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import { alpha } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import { usePendingNavigation } from "../generic/usePendingNavigation";
import FilterQueryChips from "./FilterQueryChips";
import FilterPanel from "./FilterPanel";
import {
  parseQueryString,
  filterValuesToQueryString,
  queryStringToFilterValues,
  flattenFilterToChips,
  flattenASTToFlatFilterValues,
  validateQuery,
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

interface CommandGroup {
  category: string;
  items: Array<[string, string, string]>;
}

const COMMAND_GROUPS: CommandGroup[] = [
  {
    category: "Allgemein & Nummer",
    items: [
      ["v:", "Verlag", "v:Panini"],
      ["s:", "Serie", "s:Spider-Man"],
      ["f:", "Format", "f:Heft"],
      ["j:", "Jahr", "j:2020"],
      ["n:", "Nummer", "n:5"],
      ["mit-varianten", "Mit Varianten", "mit-varianten"],
      ["g:", "Genre", "g:Action"],
      ["p:", "Person / Creator", "p:Kirby"],
    ],
  },
  {
    category: "Logik & Wildcards",
    items: [
      ["AND", "Logisches UND", "v:Panini AND f:Heft"],
      ["OR", "Logisches ODER", "v:Panini OR v:Condor"],
      ["*", "Wildcard / UND-Suche", "p:*Panini*"],
    ],
  },
  {
    category: "Mitwirkende",
    items: [
      ["w:", "Autor / Writer", "w:Lee"],
      ["pe:", "Zeichner / Penciler", "pe:Kirby"],
      ["i:", "Inker", "i:Thibert"],
      ["co:", "Kolorist / Colorist", "co:Martin"],
      ["le:", "Letterer", "le:Rosen"],
      ["ed:", "Editor", "ed:Thomas"],
      ["t:", "Übersetzer / Translator", "t:Szatmary"],
    ],
  },
  {
    category: "Inhalt",
    items: [
      ["a:", "Event / Story Arc", "a:Spider-Verse"],
      ["ap:", "Auftritt / Appearance", "ap:Spider-Man"],
      ["r:", "Realität / Reality", "r:Earth-616"],
      ["erstdruck", "Erstveröffentlichung", "erstdruck"],
      ["nachdruck", "Reiner Nachdruck", "nachdruck"],
      ["exklusiv", "Exklusiver Inhalt", "exklusiv"],
      ["einzeln-erschienen", "Einzige Veröffentlichung", "einzeln-erschienen"],
      ["sonst-nur-tb", "Sonst nur in Taschenbuch", "sonst-nur-tb"],
      ["nur-taschenbuch", "Nur in Taschenbuch", "nur-taschenbuch"],
      ["nur-einmal-deutsch", "Nur 1x dt. erschienen", "nur-einmal-deutsch"],
      ["nicht-deutsch", "Nicht dt. erschienen", "nicht-deutsch"],
      ["inhalt-und", "Inhalts-Verknüpfung: UND", "inhalt-und"],
    ],
  },
  {
    category: "Sammlung & Admin",
    items: [
      ["gesammelt", "Gesammelt", "gesammelt"],
      ["nicht-gesammelt", "Nicht gesammelt", "nicht-gesammelt"],
      ["nicht-gesammelt-ohne-varianten", "Ungesammelt (ohne Variants)", "nicht-gesammelt-ohne-varianten"],
      ["benötigt", "Benötigte Ausgaben", "benötigt"],
      ["mehrfach-gesammelt", "Mehrfach gesammelt", "mehrfach-gesammelt"],
      ["unvollständige-serien", "Unvollständige Serien", "unvollständige-serien"],
      ["fehlende-erstausgaben", "Fehlende Erstausgaben", "fehlende-erstausgaben"],
      ["fehlende-verlagserstausgaben", "Fehlende Verlagserstausgaben", "fehlende-verlagserstausgaben"],
      ["ungesammeltes-us-material", "Ungesammeltes US-Material", "ungesammeltes-us-material"],
      ["mehrfach-vorhanden", "Doppelt/Dreifach gesammelt", "mehrfach-vorhanden"],
      ["mehrfach-vorhanden-verlag", "Verlagsintern doppelt", "mehrfach-vorhanden-verlag"],
      ["us-material-neu", "US-Material ab 2025", "us-material-neu"],
      ["verkaufsliste", "Verkaufsliste", "verkaufsliste"],
      ["ohne-comicguide", "Ohne Comicguide ID", "ohne-comicguide"],
      ["ohne-stories", "Ohne Stories", "ohne-stories"],
      ["erstes-des-monats", "Am 01. des Monats", "erstes-des-monats"],
    ],
  },
  {
    category: "Cross-Scope",
    items: [
      ["xv:", "Cross-Verlag", "xv:Marvel"],
      ["xs:", "Cross-Serie", "xs:Avengers"],
      ["xn:", "Cross-Nummer", "xn:10"],
      ["xvol:", "Cross-Volume", "xvol:1"],
      ["xyear:", "Cross-Startjahr", "xyear:1963"],
      ["xend:", "Cross-Endjahr", "xend:1996"],
      ["xexklusiv", "Cross-Scope exklusiv", "xexklusiv"],
    ],
  },
];

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
  initialFilterCount?: number | null;
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

function rawQueryToPayload(rawQuery: string, us: boolean): string | null {
  if (!rawQuery.trim()) return null;
  try {
    const { values } = queryStringToFilterValues(rawQuery, createDefaultFilterValues());
    const payload = cleanAST(values, us);
    return payload ? JSON.stringify(payload) : null;
  } catch (e) {
    console.error("[SearchBar] rawQueryToPayload error:", e);
    return null;
  }
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
  // Expert mode and filter query state
  // ---------------------------------------------------------------------------
  const [expertValue, setExpertValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [activeCategory, setActiveCategory] = useState("Allgemein & Nummer");
  const expertDismissedRef = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [caretPos, setCaretPos] = useState(0);
  const unmountTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (unmountTimeoutRef.current) {
        clearTimeout(unmountTimeoutRef.current);
      }
    };
  }, []);

  const ALL_COMMANDS = React.useMemo(() => {
    const cmds = new Set<string>();
    for (const group of COMMAND_GROUPS) {
      for (const [cmd] of group.items) {
        if (cmd !== "*") {
          cmds.add(cmd);
        }
      }
    }
    return Array.from(cmds);
  }, []);

  const autocompleteData = React.useMemo(() => {
    if (!focused || !expertValue) {
      return { prefix: "", typedPart: "", suffixPart: "", bestMatch: "", textAfterCaret: "" };
    }

    const textUpToCaret = expertValue.slice(0, caretPos);
    const textAfterCaret = expertValue.slice(caretPos);

    const lastSpaceIdx = textUpToCaret.lastIndexOf(" ");
    const prefix = lastSpaceIdx === -1 ? "" : textUpToCaret.slice(0, lastSpaceIdx + 1);
    const currentWord = lastSpaceIdx === -1 ? textUpToCaret : textUpToCaret.slice(lastSpaceIdx + 1);

    const shouldSuggest =
      currentWord.length > 0 &&
      !currentWord.includes(":") &&
      !currentWord.includes('"');

    if (!shouldSuggest) {
      return { prefix, typedPart: currentWord, suffixPart: "", bestMatch: "", textAfterCaret };
    }

    const matches = ALL_COMMANDS.filter((cmd) =>
      cmd.toLowerCase().startsWith(currentWord.toLowerCase())
    );

    if (matches.length === 0) {
      return { prefix, typedPart: currentWord, suffixPart: "", bestMatch: "", textAfterCaret };
    }

    matches.sort((a, b) => a.length - b.length);
    const bestMatch = matches[0];
    const suffixPart = bestMatch.slice(currentWord.length);

    return {
      prefix,
      typedPart: currentWord,
      suffixPart,
      bestMatch,
      textAfterCaret,
    };
  }, [focused, expertValue, caretPos, ALL_COMMANDS]);

  // Filter token parsing from the current filterQuery JSON
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

  const [expertModeActive, setExpertModeActive] = useState(() => filterTokens.length > 0);
  const [prevFilterTokens, setPrevFilterTokens] = useState(filterTokens);
  if (filterTokens !== prevFilterTokens) {
    setPrevFilterTokens(filterTokens);
    setExpertModeActive(filterTokens.length > 0);
  }

  const filterQueryString = React.useMemo(() => {
    if (!filterQuery) return "";
    try {
      const parsed = JSON.parse(filterQuery);
      return filterValuesToQueryString(parsed);
    } catch {
      return "";
    }
  }, [filterQuery]);

  // Sync expertValue with filterQueryString when not focused or when filterQueryString changes
  useEffect(() => {
    if (!focused) {
      setExpertValue(filterQueryString);
      setCaretPos(filterQueryString.length);
    }
  }, [focused, filterQueryString]);

  // Reset dismissed flag when filter changes from outside
  useEffect(() => {
    expertDismissedRef.current = false;
  }, [filterTokens]);

  const isFilterActive = filterTokens.length > 0 || Boolean(filterQuery);

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

  const handleNormalFocus = useCallback(
    (e: SearchFocusEvent, isFocused: boolean) => {
      setFocused(isFocused);
      ownProps.onFocus?.(e, isFocused);
    },
    [ownProps]
  );

  const closeNormalSearch = useCallback(
    (e: SearchFocusEvent) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      handleNormalFocus(e, false);
      setPattern("");
    },
    [handleNormalFocus]
  );

  const activateExpertMode = useCallback(
    (sourceTokens: RenderChipToken[]) => {
      if (unmountTimeoutRef.current) {
        clearTimeout(unmountTimeoutRef.current);
        unmountTimeoutRef.current = null;
      }
      setExpertModeActive(true);
      setFocused(true);
      expertDismissedRef.current = false;
      setExpertValue(filterQueryString);
      setTimeout(() => {
        const inputEl = document.querySelector(
          "input[data-expert-input='true']"
        ) as HTMLInputElement;
        if (inputEl) {
          inputEl.focus();
          inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
        }
      }, 50);
    },
    [filterQueryString]
  );

  const exitExpertMode = useCallback(
    (keepActive?: boolean, skipReset?: boolean) => {
      setFocused((wasFocused) => {
        if (!wasFocused) return false;

        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        if (!skipReset) {
          setResetKey((prev) => prev + 1);
        }

        if (unmountTimeoutRef.current) {
          clearTimeout(unmountTimeoutRef.current);
          unmountTimeoutRef.current = null;
        }

        const nextActive = keepActive ?? (filterTokens.length > 0);
        if (!nextActive) {
          unmountTimeoutRef.current = setTimeout(() => {
            setExpertModeActive(false);
            unmountTimeoutRef.current = null;
          }, 250);
        } else {
          setExpertModeActive(true);
        }

        expertDismissedRef.current = true;
        return false;
      });
    },
    [filterTokens]
  );

  const handleExpertCommit = useCallback(
    (rawQuery: string) => {
      const validation = validateQuery(rawQuery);
      if (!validation.valid) {
        setValidationError(validation.error);
        return;
      }
      setValidationError(null);
      const payload = rawQueryToPayload(rawQuery, us);
      ownProps.onFilterChange?.(payload);
      const hasContent = rawQuery.trim().length > 0;
      exitExpertMode(hasContent, true);
    },
    [us, ownProps, exitExpertMode]
  );

  const handleExpertAbort = useCallback(() => {
    setValidationError(null);
    setExpertValue(filterQueryString);
    exitExpertMode();
  }, [filterQueryString, exitExpertMode]);

  // Global event listener for Escape key to close the expert search panel
  useEffect(() => {
    if (!focused) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleExpertAbort();
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [focused, handleExpertAbort]);

  const handleBackdropClick = useCallback(() => {
    if (expertModeActive) {
      handleExpertAbort();
    } else {
      closeNormalSearch(null);
    }
  }, [expertModeActive, handleExpertAbort, closeNormalSearch]);

  const handleRemoveToken = useCallback(
    (idx: number) => {
      const remaining = filterTokens.filter((_, i) => i !== idx);
      const raw = remaining.map((t) => t.raw).join(" ");
      const validation = validateQuery(raw);
      if (validation.valid) {
        const payload = rawQueryToPayload(raw, us);
        ownProps.onFilterChange?.(payload);
        setValidationError(null);
      } else {
        // Fallback: focus and edit, highlight error
        setExpertValue(raw);
        setCaretPos(raw.length);
        setFocused(true);
        setValidationError(validation.error);
        setTimeout(() => {
          const inputEl = document.querySelector(
            "input[data-expert-input='true']"
          ) as HTMLInputElement;
          inputEl?.focus();
        }, 50);
      }
    },
    [filterTokens, us, ownProps]
  );

  const handleClickToken = useCallback(
    (idx: number) => {
      const token = filterTokens[idx];
      if (!token) return;

      const rawQuery = filterQueryString;
      setExpertValue(rawQuery);
      setCaretPos(rawQuery.length);
      setFocused(true);

      const pos = rawQuery.indexOf(token.raw);
      if (pos !== -1) {
        setTimeout(() => {
          const inputEl = document.querySelector(
            "input[data-expert-input='true']"
          ) as HTMLInputElement;
          if (inputEl) {
            inputEl.focus();
            inputEl.setSelectionRange(pos, pos + token.raw.length);
            setCaretPos(pos + token.raw.length);
          }
        }, 50);
      }
    },
    [filterTokens, filterQueryString]
  );

  const handleEditorBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      ownProps.onFocus?.(e, false);
      setTimeout(() => {
        if (!editorContainerRef.current) return;
        if (!editorContainerRef.current.contains(document.activeElement)) {
          handleExpertAbort();
        }
      }, 100);
    },
    [ownProps, handleExpertAbort]
  );

  const handleEditorFocus = useCallback(() => {
    setFocused(true);
    ownProps.onFocus?.(null, true);
  }, [ownProps]);

  const handleResetAll = useCallback(() => {
    ownProps.onFilterChange?.(null);
    setValidationError(null);
    setExpertValue("");
    setCaretPos(0);
    exitExpertMode(false);
  }, [ownProps, exitExpertMode]);

  const expertBoxSx = useMemo<SxProps<Theme>>(
    () => (theme: Theme) => ({
      position: compactLayout ? "relative" : ("absolute" as const),
      top: 0,
      left: 0,
      right: 0,
      borderRadius: 2.5,
      border: focused || validationError ? "2px solid" : "1px solid",
      borderColor: validationError
        ? theme.palette.error.main
        : focused
        ? theme.palette.secondary.main
        : isFilterActive
        ? alpha(theme.palette.primary.main, 0.4)
        : "rgba(0,0,0,0.18)",
      bgcolor: theme.vars?.palette.background.paper ?? theme.palette.background.paper,
      color: "var(--shortbox-search-color)",
      px: 1.25,
      pt: focused ? "7px" : "6px",
      pb: focused ? "6px" : "6px",
      display: "flex",
      flexDirection: "column" as const,
      gap: 0.75,
      boxShadow: validationError
        ? `0 0 0 3px ${alpha(theme.palette.error.main, 0.22)}, 0 8px 28px ${alpha(theme.palette.common.black, 0.32)}`
        : focused
        ? `0 0 0 3px ${alpha(theme.palette.secondary.main, 0.22)}, 0 8px 28px ${alpha(theme.palette.common.black, 0.32)}`
        : "none",
      transition: "box-shadow 200ms, border-color 180ms ease, transform 220ms ease",
      cursor: "text",
      transform: focused ? (compactLayout ? "scale(1)" : "scale(1.1)") : "scale(1)",
      transformOrigin: "top center",
      "& input::placeholder": {
        color: "var(--shortbox-search-placeholder)",
        opacity: 1,
      },
      "&:hover": {
        borderColor: validationError
          ? theme.palette.error.main
          : focused
          ? theme.palette.secondary.main
          : isFilterActive
          ? alpha(theme.palette.primary.main, 0.6)
          : "rgba(0,0,0,0.32)",
      },
      ...theme.applyStyles("dark", {
        borderColor: validationError
          ? theme.palette.error.main
          : focused
          ? theme.palette.secondary.main
          : isFilterActive
          ? alpha("#e5e7eb", 0.55)
          : alpha(theme.palette.common.white, 0.34),
        "&:hover": {
          borderColor: validationError
            ? theme.palette.error.main
            : focused
            ? theme.palette.secondary.main
            : isFilterActive
            ? alpha("#e5e7eb", 0.75)
            : alpha(theme.palette.common.white, 0.55),
        },
      }),
    }),
    [compactLayout, focused, validationError, isFilterActive]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Box sx={{ width: "100%" }}>
      <Backdrop
        open={focused}
        onClick={handleBackdropClick}
        sx={(theme) => ({
          zIndex: theme.zIndex.appBar + 1,
          backgroundColor: alpha(theme.palette.common.black, 0.36),
          backdropFilter: "blur(5px)",
          ...theme.applyStyles("dark", {
            backgroundColor: alpha(theme.palette.common.black, 0.58),
          }),
        })}
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, width: "100%" }}>
        {/* Main search + filter chip area */}
        <Box
          sx={(theme) => ({
            flex: 1,
            minWidth: 0,
            position: "relative",
            height: compactLayout ? "auto" : "40px",
            zIndex: (t) => t.zIndex.appBar + 2,
            // Light mode defaults (on dark AppBar)
            "--shortbox-search-bg": "#ffffff",
            "--shortbox-search-color": "#111111",
            "--shortbox-search-placeholder": "rgba(0, 0, 0, 0.45)",
            // Dark mode overrides
            ...theme.applyStyles("dark", {
              "--shortbox-search-bg": "rgba(255, 255, 255, 0.08)",
              "--shortbox-search-color": "#ffffff",
              "--shortbox-search-placeholder": "rgba(255, 255, 255, 0.6)",
            }),
          })}
        >
          {expertModeActive ? (
            <Box sx={expertBoxSx} ref={editorContainerRef}>
              {/* Row 1: Token editor + icons */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box
                  sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}
                  onMouseDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest("input, button, [role='button']")) {
                      e.preventDefault();
                      setFocused(true);
                      setTimeout(() => {
                        const input = editorContainerRef.current?.querySelector<HTMLInputElement>(
                          "input[data-expert-input='true']"
                        );
                        if (input) {
                          input.focus();
                          input.setSelectionRange(input.value.length, input.value.length);
                        }
                      }, 50);
                    }
                  }}
                >
                  {focused ? (
                    <Box sx={{ position: "relative", flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
                      {/* Autocomplete Suggestion Suffix Layer */}
                      {autocompleteData.suffixPart && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            pointerEvents: "none",
                            fontSize: "0.93rem",
                            fontWeight: 500,
                            fontFamily: "inherit",
                            lineHeight: 1.5,
                            whiteSpace: "pre",
                            overflow: "hidden",
                            color: "transparent",
                            padding: 0,
                            margin: 0,
                          }}
                        >
                          {autocompleteData.prefix + autocompleteData.typedPart}
                          <span
                            style={{
                              color: "rgba(128, 128, 128, 0.65)",
                            }}
                          >
                            {autocompleteData.suffixPart}
                          </span>
                        </Box>
                      )}
                      <input
                        ref={inputRef}
                        data-expert-input="true"
                        value={expertValue}
                        onChange={(e) => {
                          setExpertValue(e.target.value);
                          setValidationError(null);
                          setCaretPos(e.target.selectionStart ?? e.target.value.length);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleExpertCommit(expertValue);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            handleExpertAbort();
                          } else if (e.key === "Tab" || e.key === "ArrowRight") {
                            if (autocompleteData.suffixPart) {
                              e.preventDefault();
                              const newValue =
                                autocompleteData.prefix +
                                autocompleteData.bestMatch +
                                autocompleteData.textAfterCaret;
                              setExpertValue(newValue);
                              const newCaretPos =
                                autocompleteData.prefix.length +
                                autocompleteData.bestMatch.length;
                              setCaretPos(newCaretPos);
                              setTimeout(() => {
                                if (inputRef.current) {
                                  inputRef.current.focus();
                                  inputRef.current.setSelectionRange(newCaretPos, newCaretPos);
                                }
                              }, 0);
                            }
                          }
                        }}
                        onSelect={(e) => {
                          const target = e.target as HTMLInputElement;
                          setCaretPos(target.selectionStart ?? target.value.length);
                        }}
                        onFocus={handleEditorFocus}
                        onBlur={handleEditorBlur}
                        placeholder="Suchen"
                        style={{
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          fontSize: "0.93rem",
                          fontWeight: 500,
                          fontFamily: "inherit",
                          color: "var(--shortbox-search-color)",
                          width: "100%",
                          padding: 0,
                          margin: 0,
                          lineHeight: 1.5,
                          cursor: "text",
                          position: "relative",
                          zIndex: 2,
                        }}
                      />
                    </Box>
                  ) : (
                    <FilterQueryChips
                      tokens={filterTokens}
                      onRemoveToken={handleRemoveToken}
                      onClickToken={handleClickToken}
                      onResetAll={handleResetAll}
                      maxVisible={compactLayout ? 1 : 2}
                    />
                  )}
                </Box>

                {/* Right-side icons */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.25,
                    flexShrink: 0,
                  }}
                >
                  {(expertValue.trim().length > 0 || filterTokens.length > 0) && (
                    <IconButton
                      size="small"
                      aria-label="Filter zurücksetzen"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleResetAll}
                      sx={{
                        color: "error.main",
                        p: 0.3,
                        opacity: 0.75,
                        "&:hover": { opacity: 1 },
                      }}
                    >
                      <ClearIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  )}
                  <Tooltip title="Expert-Modus · ESC zum Beenden" describeChild>
                    <Box
                      sx={{
                        color: focused ? "secondary.main" : "primary.main",
                        display: "flex",
                        alignItems: "center",
                        px: 0.4,
                        opacity: 0.9,
                      }}
                    >
                      <TerminalIcon sx={{ fontSize: 18 }} />
                    </Box>
                  </Tooltip>
                </Box>
              </Box>

              {/* Collapsible Helper Panel: Keyboard shortcuts, Validation error, and Command hints */}
              <Collapse in={focused} timeout={280} unmountOnExit>
                <Fade in={focused} timeout={280}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.75,
                    }}
                  >
                    {/* Row 2: Keyboard shortcuts strip */}
                    <Box
                      sx={(theme) => ({
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        pt: 0.5,
                        borderTop: "1px solid",
                        borderColor: alpha(theme.palette.divider, 0.55),
                      })}
                    >
                      {(
                        [
                          ["Enter", "Suchen"],
                          ["Esc", "Beenden"],
                        ] as [string, string][]
                      ).map(([key, label]) => (
                        <Typography
                          key={key}
                          variant="caption"
                          sx={{
                            color: "text.disabled",
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Box
                            component="kbd"
                            sx={(theme) => ({
                              px: "4px",
                              py: "1px",
                              borderRadius: "4px",
                              border: "1px solid",
                              borderColor: alpha(theme.palette.text.secondary, 0.28),
                              fontFamily: "monospace",
                              fontSize: "0.63rem",
                              fontWeight: 700,
                              color: "text.secondary",
                              bgcolor: alpha(theme.palette.text.primary, 0.04),
                              lineHeight: 1.6,
                              userSelect: "none",
                            })}
                          >
                            {key}
                          </Box>
                          {label}
                        </Typography>
                      ))}
                    </Box>

                    {/* Row 2.5: Validation error message */}
                    {validationError && (
                      <Box
                        sx={(theme) => ({
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          pt: 0.5,
                          borderTop: "1px solid",
                          borderColor: alpha(theme.palette.divider, 0.55),
                          color: "error.main",
                        })}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            fontWeight: 600,
                          }}
                        >
                          ⚠️ {validationError}
                        </Typography>
                      </Box>
                    )}

                    {/* Row 3: Command hints */}
                    <Box
                      sx={(theme) => ({
                        borderTop: "1px solid",
                        borderColor: alpha(theme.palette.divider, 0.55),
                        pt: 1,
                      })}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mb: 1.25,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.09em",
                          fontSize: "0.6rem",
                          color: "text.disabled",
                        }}
                      >
                        Verfügbare Befehle
                      </Typography>

                      {/* Category Tabs */}
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 0.75,
                          mb: 1.5,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          pb: 1.25,
                        }}
                      >
                        {COMMAND_GROUPS.map((g) => (
                          <Button
                            key={g.category}
                            size="small"
                            variant={activeCategory === g.category ? "contained" : "outlined"}
                            onClick={() => setActiveCategory(g.category)}
                            sx={{
                              textTransform: "none",
                              fontSize: "0.72rem",
                              py: 0.25,
                              px: 1,
                              borderRadius: 1.5,
                              fontWeight: activeCategory === g.category ? 700 : 500,
                            }}
                          >
                            {g.category}
                          </Button>
                        ))}
                      </Box>

                      {/* Active Group Items */}
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                          gap: "6px 20px",
                          minHeight: 120,
                        }}
                      >
                        {COMMAND_GROUPS.find((g) => g.category === activeCategory)
                          ?.items.map(([cmd, desc, ex]) => (
                            <Box
                              key={cmd}
                              sx={{
                                display: "flex",
                                gap: 1.5,
                                py: 0.6,
                                alignItems: "baseline",
                                borderBottom: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Typography
                                component="code"
                                sx={{
                                  fontFamily: "monospace",
                                  fontWeight: 700,
                                  fontSize: "0.76rem",
                                  color: "secondary.main",
                                  minWidth: 40,
                                  flexShrink: 0,
                                }}
                              >
                                {cmd}
                              </Typography>
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{ display: "block", fontWeight: 600, lineHeight: 1.3 }}
                                >
                                  {desc}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "text.disabled",
                                    fontFamily: "monospace",
                                    fontSize: "0.63rem",
                                    display: "block",
                                    mt: 0.25,
                                  }}
                                >
                                  {ex}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                      </Box>
                    </Box>
                  </Box>
                </Fade>
              </Collapse>
            </Box>
          ) : (
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
                    height: "auto",
                    minHeight: "auto",
                    maxHeight: "none",
                    transform: focused ? "scale(1.02)" : "scale(1)",
                    transformOrigin: "top center",
                    transition: "transform 220ms ease",
                    overflow: "hidden",
                    "& .MuiAutocomplete-listbox": {
                      maxHeight: "min(70dvh, 520px)",
                      p: 0,
                    },
                    "& .MuiAutocomplete-noOptions": {
                      height: 120,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      width: "100%",
                      fontSize: "1rem",
                      fontWeight: 600,
                      p: 2,
                    },
                    "& .MuiAutocomplete-loading": {
                      height: 120,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      p: 2,
                    },
                  },
                },
              }}
              options={resolvedOptions}
              filterOptions={(options) => options}
              loading={resolvedLoading}
              inputValue={pattern}
              noOptionsText={
                shortQuery ? (
                  <Typography component="span" noWrap sx={{ fontSize: "1rem", color: "text.primary" }}>
                    Tippe, um zu suchen… oder v:Verlag, f:Format, erstdruck
                  </Typography>
                ) : (
                  <Typography component="span" noWrap sx={{ fontSize: "1rem", color: "text.primary" }}>
                    {resolvedError ? "Suche aktuell nicht verfügbar" : "Keine Ergebnisse gefunden"}
                  </Typography>
                )
              }
              getOptionLabel={(option) =>
                typeof option === "string" ? option : `${getNodeType(option.type)} ${option.label || ""}`
              }
              isOptionEqualToValue={(option, val) => (option.url || "") === (val.url || "")}
              onInputChange={(_, value, reason) => {
                if (reason !== "input" && reason !== "clear") return;
                // "/" at the start activates expert mode
                if (value.startsWith("/")) {
                  activateExpertMode(filterTokens);
                  return;
                }
                setPattern(value);
              }}
              onChange={(_, value) => {
                if (!value || typeof value === "string" || !value.url) return;
                setPattern("");
                closeNormalSearch(null);
                push(value.url);
              }}
              onClose={(_, reason) => {
                if (reason === "escape") closeNormalSearch(null);
              }}
              onFocus={(e) => {
                // If filter is active and user didn't explicitly dismiss expert mode, activate it
                if (filterTokens.length > 0 && !expertDismissedRef.current) {
                  activateExpertMode(filterTokens);
                  return;
                }
                handleNormalFocus(e, true);
              }}
              onBlur={(e) => handleNormalFocus(e, false)}
              renderOption={(optionProps, option) => {
                const { key, ...rest } = optionProps;
                return (
                  <li key={key} {...rest}>
                    <Box
                      sx={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        minWidth: 0,
                      }}
                    >
                      <Typography component="span" noWrap sx={{ flex: 1 }}>
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
                width: "100%",
                transform: resolveSearchTransform(focused, compactLayout),
                transformOrigin: "top center",
                transition: "transform 220ms ease",
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "var(--shortbox-search-bg)",
                  borderRadius: 2.5,
                  transition: "box-shadow 180ms ease, border-color 180ms ease",
                  "& input": {
                    color: "var(--shortbox-search-color) !important",
                    WebkitTextFillColor: "var(--shortbox-search-color) !important",
                    fontWeight: 500,
                    opacity: "1 !important",
                  },
                  "& input::placeholder": {
                    color: "var(--shortbox-search-placeholder) !important",
                    WebkitTextFillColor: "var(--shortbox-search-placeholder) !important",
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
                    borderColor: theme.palette.mode === "dark" ? theme.palette.primary.light : "#111111",
                  },
                  "&.Mui-focused": {
                    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}, 0 10px 26px ${alpha(
                      theme.palette.common.black,
                      0.35
                    )}`,
                    backgroundColor: "var(--shortbox-search-bg)",
                  },
                  ...theme.applyStyles("dark", {
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
                        color: "var(--shortbox-search-color)",
                      },
                      "& .MuiOutlinedInput-input": {
                        fontSize: "0.95rem",
                        lineHeight: 1.2,
                        color: "var(--shortbox-search-color) !important",
                        WebkitTextFillColor: "var(--shortbox-search-color) !important",
                        fontWeight: 500,
                        opacity: "1 !important",
                      },
                    })}
                    slotProps={{
                      htmlInput: {
                        ...inputProps,
                        "aria-label": "Shortbox durchsuchen",
                        "data-shortbox-search-input": "true",
                        placeholder:
                          filterTokens.length > 0
                            ? "weiteren Filter eingeben…"
                            : `Suchen · ${shortcutHint}`,
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
                                sx={{
                                  fontSize: 20,
                                  color: "var(--shortbox-search-color)",
                                }}
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
          )}
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
                      ? theme.palette.secondary.light
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
