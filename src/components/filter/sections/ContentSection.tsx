import React from "react";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import AutocompleteBase from "../../generic/AutocompleteBase";
import { useAutocompleteQuery } from "../../generic/useAutocompleteQuery";
import type { FilterValues } from "../types";

interface ContentSectionProps {
  values: FilterValues;
  isDesktop: boolean;
  setFieldValue: (field: string, value: unknown) => void;
}

const MIN_QUERY_LENGTH = 2;

function ContentSection({ values, isDesktop: _isDesktop, setFieldValue }: ContentSectionProps) {
  const [arcInput, setArcInput] = React.useState("");
  const [appearanceInput, setAppearanceInput] = React.useState("");

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

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Inhalt</Typography>

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
              ? "Fehler!"
              : "Keine Ergebnisse gefunden"
        }
        onListboxScroll={arcQuery.onListboxScroll}
        getOptionLabel={(option) => formatArcLabel(option)}
        isOptionEqualToValue={(option, value) =>
          normalizeText(option.title) === normalizeText((value as { title?: unknown })?.title) &&
          normalizeText(option.type) === normalizeText((value as { type?: unknown })?.type)
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
              ? "Fehler!"
              : "Keine Ergebnisse gefunden"
        }
        onListboxScroll={appearanceQuery.onListboxScroll}
        getOptionLabel={(option) => formatAppearanceLabel(option)}
        isOptionEqualToValue={(option, value) =>
          normalizeText(option.name) === normalizeText((value as { name?: unknown })?.name) &&
          normalizeText(option.type) === normalizeText((value as { type?: unknown })?.type)
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
    </Stack>
  );
}

function asOptionArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)
  );
}

function sanitizeArcList(values: Array<Record<string, unknown>>) {
  return values
    .map((entry) => {
      const title = String(entry.title || "").trim();
      const type = String(entry.type || "").trim();
      if (!title) return null;
      return type ? { title, type } : { title };
    })
    .filter((entry): entry is { title: string; type?: string } => Boolean(entry));
}

function sanitizeAppearanceList(values: Array<Record<string, unknown>>) {
  return values
    .map((entry) => {
      const name = String(entry.name || "").trim();
      const type = String(entry.type || "").trim();
      if (!name) return null;
      return type ? { name, type } : { name };
    })
    .filter((entry): entry is { name: string; type?: string } => Boolean(entry));
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

export default ContentSection;
