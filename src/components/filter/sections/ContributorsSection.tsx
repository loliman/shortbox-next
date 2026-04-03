"use client";

import React from "react";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import type {
  AutocompleteChangeDetails,
  AutocompleteChangeReason,
} from "@mui/material/Autocomplete";
import AutocompleteBase from "../../generic/AutocompleteBase";
import { useAutocompleteQuery } from "../../generic/useAutocompleteQuery";
import { CONTRIBUTOR_FIELDS, TRANSLATOR_FIELD } from "../constants";
import { FilterValues } from "../types";
import { updateField, type ChangePayload, type FieldItem } from "../../../util/filterFieldHelpers";

const MIN_QUERY_LENGTH = 2;

interface ContributorsSectionProps {
  values: FilterValues;
  us: boolean;
  setFieldValue: (field: string, value: unknown) => void;
}

function ContributorsSection({ values, us, setFieldValue }: ContributorsSectionProps) {
  return (
    <Stack spacing={2}>
      <Typography variant="h6">Mitwirkende</Typography>

      <Stack spacing={1}>
        {CONTRIBUTOR_FIELDS.map((field) => (
          <ContributorAutocomplete
            key={field.type}
            label={field.label}
            contributorType={field.type}
            values={values.individuals}
            setFieldValue={setFieldValue}
          />
        ))}
      </Stack>

      {!us ? (
        <Stack spacing={1}>
          <ContributorAutocomplete
            label={TRANSLATOR_FIELD.label}
            contributorType={TRANSLATOR_FIELD.type}
            values={values.individuals}
            setFieldValue={setFieldValue}
          />
        </Stack>
      ) : null}
    </Stack>
  );
}

interface ContributorAutocompleteProps {
  label: string;
  contributorType: string;
  values: FieldItem[];
  setFieldValue: (field: string, value: unknown) => void;
}

function ContributorAutocomplete({
  label,
  contributorType,
  values,
  setFieldValue,
}: Readonly<ContributorAutocompleteProps>) {
  const [inputValue, setInputValue] = React.useState("");
  const query = useAutocompleteQuery<FieldItem>({
    source: "individuals",
    variables: { pattern: inputValue },
    searchText: inputValue,
    minQueryLength: MIN_QUERY_LENGTH,
    debounceMs: 250,
  });

  const selectedValues = React.useMemo(
    () => values.filter((entry) => !entry.pattern && matchesType(entry, contributorType)),
    [values, contributorType]
  );

  return (
    <AutocompleteBase
      options={query.options}
      value={selectedValues}
      inputValue={inputValue}
      label={label}
      placeholder={`${label} suchen...`}
      multiple
      loading={query.loading}
      noOptionsText={
        getNoOptionsText(query.isBelowMinLength, query.error)
      }
      onListboxScroll={query.onListboxScroll}
      getOptionLabel={(option) => readTextValue((option as { name?: unknown })?.name)}
      isOptionEqualToValue={(option, value) =>
        normalizeText(option.name) === normalizeText((value as { name?: unknown })?.name)
      }
      onInputChange={(_, nextInput, reason) => {
        if (reason !== "input" && reason !== "clear" && reason !== "reset") return;
        setInputValue(nextInput);
      }}
      onChange={(_, nextValue, reason, details) => {
        const payload = buildPayload(
          contributorType,
          reason,
          normalizeOption(asSingleValue(nextValue, details))
        );
        if (!payload) return;

        updateField(payload, false, values, setFieldValue, "individuals", "name");
        setInputValue("");
      }}
    />
  );
}

function buildPayload(
  contributorType: string,
  reason: AutocompleteChangeReason,
  option: FieldItem | null
): ChangePayload | null {
  const action = mapReasonToAction(reason);
  if (!action) return null;

  const payload: ChangePayload = {
    action,
    name: "individuals",
    type: contributorType,
    role: contributorType,
  };

  if (action === "select-option" || action === "create-option")
    payload.option = option || undefined;
  if (action === "remove-value") payload.removedValue = option || undefined;

  return payload;
}

function asSingleValue(
  value: FieldItem | string | Array<FieldItem | string> | null,
  details?: AutocompleteChangeDetails<Record<string, unknown>>
) {
  if (details?.option) return details.option;
  if (Array.isArray(value)) return value[value.length - 1] || null;
  return value;
}

function normalizeOption(value: unknown): FieldItem | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return { name: trimmed };
  }
  if (typeof value === "object" && !Array.isArray(value)) return value as FieldItem;
  return null;
}

function mapReasonToAction(reason: AutocompleteChangeReason): ChangePayload["action"] {
  if (reason === "selectOption") return "select-option";
  if (reason === "removeOption") return "remove-value";
  if (reason === "clear") return "clear";
  if (reason === "createOption") return "create-option";
  return undefined;
}

function matchesType(entry: FieldItem, contributorType: string) {
  if (Array.isArray(entry.type)) {
    return (
      entry.type.includes(contributorType) ||
      (Array.isArray(entry.role) && entry.role.includes(contributorType))
    );
  }
  return entry.type === contributorType || entry.role === contributorType;
}

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function readTextValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}

function getNoOptionsText(isBelowMinLength: boolean, error: unknown) {
  if (isBelowMinLength) return `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`;
  if (error) return "Daten aktuell nicht verfügbar";
  return "Keine Ergebnisse gefunden";
}

export default ContributorsSection;
