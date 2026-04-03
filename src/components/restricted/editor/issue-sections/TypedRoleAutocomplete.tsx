import React from "react";
import type {
  AutocompleteChangeReason,
  AutocompleteInputChangeReason,
} from "@mui/material/Autocomplete";
import AutocompleteBase from "../../../generic/AutocompleteBase";
import { useAutocompleteQuery } from "../../../generic/useAutocompleteQuery";
import { getPattern, updateField } from "./helpers";
import type { ChangePayload, FieldItem } from "./types";
import type { AutocompleteSource } from "../../../../lib/read/autocomplete-read";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

interface TypedRoleAutocompleteProps {
  source: AutocompleteSource;
  label: string;
  field: string;
  type: string;
  values: FieldItem[] | undefined;
  setFieldValue: (field: string, value: unknown) => void;
  variables?: Record<string, unknown>;
  disabled?: boolean;
}

function TypedRoleAutocomplete({
  source,
  label,
  field,
  type,
  values,
  setFieldValue,
  variables = {},
  disabled,
}: TypedRoleAutocompleteProps) {
  const selectedValues = sanitizeEntries(values);
  const pattern = readTextValue(getPattern(selectedValues, "name", type));

  const queryResult = useAutocompleteQuery<FieldItem>({
    source,
    variables: {
      ...variables,
      pattern,
    },
    enabled: !disabled,
    searchText: pattern,
    minQueryLength: MIN_QUERY_LENGTH,
    debounceMs: DEBOUNCE_MS,
  });

  const visibleValues = selectedValues.filter(
    (entry) => !entry.pattern && hasTypedRole(entry, type)
  );
  let noOptionsText = "Keine Ergebnisse gefunden";
  if (queryResult.isBelowMinLength) {
    noOptionsText = `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`;
  } else if (queryResult.error) {
    noOptionsText = "Daten aktuell nicht verfügbar";
  }

  return (
    <AutocompleteBase
      disabled={disabled}
      options={queryResult.options}
      value={visibleValues}
      inputValue={pattern}
      label={label}
      placeholder={`${label} suchen...`}
      multiple
      freeSolo
      loading={queryResult.loading}
      noOptionsText={noOptionsText}
      onListboxScroll={queryResult.onListboxScroll}
      getOptionLabel={(option) => getName(option)}
      isOptionEqualToValue={(option, value) =>
        normalizeText(option.name) === normalizeText(typeof value === "string" ? value : value.name)
      }
      onInputChange={(_, value, reason) => {
        if (!isTextInputReason(reason)) return;
        updateField(value, true, selectedValues, setFieldValue, field, "name", type);
      }}
      onChange={(_, value, reason, details) => {
        const action = toTypedAction(reason);
        if (!action) return;

        let nextValues: typeof visibleValues = [];
        if (Array.isArray(value)) {
          nextValues = value;
        } else if (value) {
          nextValues = [value];
        }
        const payload: ChangePayload = {
          action,
          name: field,
          type,
          role: type,
        };

        if (action === "select-option" || action === "create-option") {
          const lastValue = nextValues.at(-1) ?? null;
          payload.option =
            toOption(details?.option ?? lastValue, queryResult.options, type) || undefined;
        }

        if (action === "remove-value") {
          payload.removedValue =
            toOption(details?.option || null, queryResult.options, type) || undefined;
        }

        updateField(payload, false, selectedValues, setFieldValue, field, "name");
      }}
    />
  );
}

function isTextInputReason(reason: AutocompleteInputChangeReason) {
  return reason === "input" || reason === "clear";
}

function toTypedAction(reason: AutocompleteChangeReason): ChangePayload["action"] {
  if (reason === "selectOption") return "select-option";
  if (reason === "removeOption") return "remove-value";
  if (reason === "clear") return "clear";
  if (reason === "createOption") return "create-option";
  return undefined;
}

function sanitizeEntries(values: FieldItem[] | undefined) {
  return (values || []).filter(
    (entry): entry is FieldItem =>
      Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)
  );
}

function hasTypedRole(entry: FieldItem, type: string) {
  if (entry.pattern) return false;
  if (Array.isArray(entry.type) && entry.type.includes(type)) return true;
  if (Array.isArray(entry.role) && entry.role.includes(type)) return true;
  return entry.type === type || entry.role === type;
}

function getName(option: unknown) {
  if (typeof option === "string") return option;
  return readTextValue((option as { name?: unknown })?.name);
}

function toOption(value: unknown, options: FieldItem[], type: string): FieldItem | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const existing = options.find((entry) => normalizeText(entry.name) === normalizeText(trimmed));
    if (existing) return existing;

    return {
      name: trimmed,
      type: [type],
      role: [type],
    };
  }

  if (typeof value === "object" && !Array.isArray(value)) return value as FieldItem;
  return null;
}

function normalizeText(value: unknown) {
  return readTextValue(value).toLowerCase();
}

function readTextValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}

export default TypedRoleAutocomplete;
