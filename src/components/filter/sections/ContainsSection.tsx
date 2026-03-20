import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import AutocompleteBase from "../../generic/AutocompleteBase";
import { useAutocompleteQuery } from "../../generic/useAutocompleteQuery";
import { FilterValues } from "../types";
import type { FieldItem } from "../../../util/filterFieldHelpers";

const MIN_QUERY_LENGTH = 2;
const REALITY_MIN_QUERY_LENGTH = 0;

interface ContainsSectionProps {
  values: FilterValues;
  us: boolean;
  isDesktop: boolean;
  setFieldValue: (field: string, value: unknown) => void;
}

function ContainsSection({
  values,
  us,
  isDesktop: _isDesktop,
  setFieldValue,
}: ContainsSectionProps) {
  const switchGridSx = {
    display: "grid",
    gap: 1,
    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr", xl: "1fr 1fr 1fr 1fr" },
  } as const;

  const [arcInput, setArcInput] = React.useState("");
  const [appearanceInput, setAppearanceInput] = React.useState("");
  const [realityInput, setRealityInput] = React.useState("");

  const arcQuery = useAutocompleteQuery<{ title?: string; type?: string }>({
    source: "arcs",
    variables: { pattern: arcInput },
    searchText: arcInput,
    minQueryLength: MIN_QUERY_LENGTH,
    debounceMs: 250,
  });

  const appearanceQuery = useAutocompleteQuery<{ name?: string; type?: string }>({
    source: "apps",
    variables: { pattern: appearanceInput },
    searchText: appearanceInput,
    minQueryLength: MIN_QUERY_LENGTH,
    debounceMs: 250,
  });

  const realityQuery = useAutocompleteQuery<{ name?: string }>({
    source: "realities",
    variables: { pattern: realityInput },
    searchText: realityInput,
    minQueryLength: REALITY_MIN_QUERY_LENGTH,
    debounceMs: 250,
  });

  const renderContainsToggle = (
    label: string,
    field: keyof FilterValues,
    negatedField: keyof FilterValues
  ) => {
    const mode: "any" | "include" | "exclude" = values[field]
      ? "include"
      : values[negatedField]
        ? "exclude"
        : "any";

    return (
      <Box
        sx={{
          display: "grid",
          gap: 0.75,
          px: 1.15,
          py: 0.8,
          borderRadius: 1.75,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: (theme) => theme.shadows[1],
        }}
      >
        <Typography
          sx={{
            fontSize: "0.88rem",
            fontWeight: 500,
            color: "text.primary",
            minWidth: 0,
            lineHeight: 1.25,
          }}
        >
          {label}
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={(_, nextMode: "any" | "include" | "exclude" | null) => {
            const targetMode = nextMode || "any";
            setFieldValue(field, targetMode === "include");
            setFieldValue(negatedField, targetMode === "exclude");
          }}
          sx={{
            "& .MuiToggleButton-root": {
              px: 1,
              py: 0.4,
              textTransform: "none",
              backgroundColor: "transparent",
              minWidth: 56,
              borderColor: "rgba(100, 116, 139, 0.35)",
              fontSize: "0.78rem",
              fontWeight: 500,
              lineHeight: 1.2,
            },
            "& .MuiToggleButton-root[value='any']": {
              color: "rgba(161,98,7,1)",
            },
            "& .MuiToggleButton-root[value='include']": {
              color: "rgba(21,128,61,1)",
            },
            "& .MuiToggleButton-root[value='exclude']": {
              color: "rgba(185,28,28,1)",
            },
            "& .MuiToggleButton-root[value='any'].Mui-selected": {
              bgcolor: "rgba(250,204,21,0.2)",
              borderColor: "rgba(202,138,4,0.65)",
              color: "rgba(133,77,14,1)",
            },
            "& .MuiToggleButton-root[value='include'].Mui-selected": {
              bgcolor: "rgba(34,197,94,0.16)",
              borderColor: "rgba(22,163,74,0.65)",
              color: "rgba(21,128,61,1)",
            },
            "& .MuiToggleButton-root[value='exclude'].Mui-selected": {
              bgcolor: "rgba(239,68,68,0.12)",
              borderColor: "rgba(220,38,38,0.55)",
              color: "rgba(185,28,28,1)",
            },
          }}
        >
          <ToggleButton value="any">Egal</ToggleButton>
          <ToggleButton value="include">Ja</ToggleButton>
          <ToggleButton value="exclude">Nein</ToggleButton>
        </ToggleButtonGroup>
      </Box>
    );
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="h6">Inhalt</Typography>

      {!us ? (
        <Box sx={switchGridSx}>
          {renderContainsToggle("Einzige Veröffentlichung", "onlyPrint", "notOnlyPrint")}
          {renderContainsToggle("Erstveröffentlichung", "firstPrint", "notFirstPrint")}
          {renderContainsToggle("Sonst nur in Taschenbuch", "otherOnlyTb", "notOtherOnlyTb")}
          {renderContainsToggle("Exklusiver Inhalt", "exclusive", "notExclusive")}
          {renderContainsToggle("Reiner Nachdruck", "reprint", "notReprint")}
        </Box>
      ) : (
        <Box sx={switchGridSx}>
          {renderContainsToggle("Nur in Taschenbuch", "onlyTb", "notOnlyTb")}
          {renderContainsToggle(
            "Nur einfach auf deutsch erschienen",
            "onlyOnePrint",
            "notOnlyOnePrint"
          )}
          {renderContainsToggle("Nicht auf deutsch erschienen", "noPrint", "notNoPrint")}
        </Box>
      )}

      <Divider sx={{ my: 0.25 }} />

      <AutocompleteBase
        options={arcQuery.options}
        value={values.arcs}
        inputValue={arcInput}
        label="Teil von (Event, Story Arc, Story Line)"
        placeholder="Event oder Arc suchen..."
        multiple
        loading={arcQuery.loading}
        textFieldSx={{ width: "100%" }}
        noOptionsText={
          arcQuery.isBelowMinLength
            ? `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`
            : arcQuery.error
              ? "Daten aktuell nicht verfügbar"
              : "Keine Ergebnisse gefunden"
        }
        onListboxScroll={arcQuery.onListboxScroll}
        getOptionLabel={(option) => formatArcLabel(option)}
        isOptionEqualToValue={(option, value) =>
          normalizeText((option as { title?: unknown }).title) ===
            normalizeText((value as { title?: unknown })?.title) &&
          normalizeText((option as { type?: unknown }).type) ===
            normalizeText((value as { type?: unknown })?.type)
        }
        onInputChange={(_, nextInput, reason) => {
          if (reason !== "input" && reason !== "clear" && reason !== "reset") return;
          setArcInput(nextInput);
        }}
        onChange={(_, nextValue) => {
          setFieldValue("arcs", sanitizeArcList(asOptionArray(nextValue)));
          setArcInput("");
        }}
      />

      <AutocompleteBase
        options={appearanceQuery.options}
        value={values.appearances}
        inputValue={appearanceInput}
        label="Auftritte (Personen, Gegenstände, Orte, ...)"
        placeholder="Auftritt suchen..."
        multiple
        loading={appearanceQuery.loading}
        textFieldSx={{ width: "100%" }}
        noOptionsText={
          appearanceQuery.isBelowMinLength
            ? `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`
            : appearanceQuery.error
              ? "Daten aktuell nicht verfügbar"
              : "Keine Ergebnisse gefunden"
        }
        onListboxScroll={appearanceQuery.onListboxScroll}
        getOptionLabel={(option) => formatAppearanceLabel(option)}
        isOptionEqualToValue={(option, value) =>
          normalizeText((option as { name?: unknown }).name) ===
            normalizeText((value as { name?: unknown })?.name) &&
          normalizeText((option as { type?: unknown }).type) ===
            normalizeText((value as { type?: unknown })?.type)
        }
        onInputChange={(_, nextInput, reason) => {
          if (reason !== "input" && reason !== "clear" && reason !== "reset") return;
          setAppearanceInput(nextInput);
        }}
        onChange={(_, nextValue) => {
          setFieldValue("appearances", sanitizeAppearanceList(asOptionArray(nextValue)));
          setAppearanceInput("");
        }}
      />

      <AutocompleteBase
        options={realityQuery.options}
        value={values.realities}
        inputValue={realityInput}
        label="Realität"
        placeholder="Earth-..."
        multiple
        loading={realityQuery.loading}
        textFieldSx={{ width: "100%" }}
        noOptionsText={
          realityQuery.isBelowMinLength
            ? `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`
            : realityQuery.error
              ? "Daten aktuell nicht verfügbar"
              : "Keine Ergebnisse gefunden"
        }
        onListboxScroll={realityQuery.onListboxScroll}
        getOptionLabel={(option) => String((option as { name?: unknown })?.name || "").trim()}
        isOptionEqualToValue={(option, value) =>
          normalizeText((option as { name?: unknown }).name) ===
          normalizeText((value as { name?: unknown })?.name)
        }
        onInputChange={(_, nextInput, reason) => {
          if (reason !== "input" && reason !== "clear" && reason !== "reset") return;
          setRealityInput(nextInput);
        }}
        onChange={(_, nextValue) => {
          setFieldValue("realities", sanitizeRealityList(asOptionArray(nextValue)));
          setRealityInput("");
        }}
      />
    </Stack>
  );
}

function asOptionArray(value: unknown): FieldItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is FieldItem =>
      Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)
  );
}

function sanitizeArcList(values: FieldItem[]) {
  return values
    .map((entry) => {
      const title = String(entry.title || "").trim();
      const type = String(entry.type || "").trim();
      if (!title) return null;
      return type ? { title, type } : { title };
    })
    .filter((entry): entry is { title: string; type?: string } => Boolean(entry));
}

function sanitizeAppearanceList(values: FieldItem[]) {
  return values
    .map((entry) => {
      const name = String(entry.name || "").trim();
      const type = String(entry.type || "").trim();
      if (!name) return null;
      return type ? { name, type } : { name };
    })
    .filter((entry): entry is { name: string; type?: string } => Boolean(entry));
}

function sanitizeRealityList(values: FieldItem[]) {
  return values
    .map((entry) => {
      const name = String(entry.name || "").trim();
      if (!name) return null;
      return { name };
    })
    .filter((entry): entry is { name: string } => Boolean(entry));
}

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatArcLabel(option: unknown) {
  const entry = option as { title?: unknown; type?: unknown };
  const title = String(entry.title || "").trim();
  const type = String(entry.type || "").trim();
  if (!title) return "";
  return type ? `${title} (${type})` : title;
}

function formatAppearanceLabel(option: unknown) {
  const entry = option as { name?: unknown; type?: unknown };
  const name = String(entry.name || "").trim();
  const type = String(entry.type || "").trim();
  if (!name) return "";
  return type ? `${name} (${type})` : name;
}

export default ContainsSection;
