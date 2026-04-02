import React from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type {
  AutocompleteChangeReason,
  AutocompleteInputChangeReason,
} from "@mui/material/Autocomplete";
import { FastField } from "formik";
import AutocompleteBase from "../../../generic/AutocompleteBase";
import { TextField } from "../../../generic/FormikTextField";
import { useAutocompleteQuery } from "../../../generic/useAutocompleteQuery";
import { currencies, formats } from "./constants";
import type { IssueEditorFormValues } from "./types";
import type { AutocompleteSource } from "../../../../lib/read/autocomplete-read";
import { buildVariantBatchLabels } from "@/src/util/issue-copy";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

type MetadataField = "individuals" | "arcs";
type EntryKey = "name" | "title";

interface MetadataEntry {
  pattern?: boolean;
  name?: string;
  title?: string;
  type?: string[] | string;
  role?: string[] | string;
  [key: string]: unknown;
}

interface IssueEditorMetadataFieldsProps {
  values: IssueEditorFormValues;
  copy?: boolean;
  batchEnabled?: boolean;
  isDesktop?: boolean;
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  lockedFields?: {
    format?: boolean;
    variant?: boolean;
  };
}

interface TypedMetadataAutocompleteProps {
  source: AutocompleteSource;
  field: MetadataField;
  label: string;
  type: string;
  entryKey: EntryKey;
  values: MetadataEntry[];
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  variables?: Record<string, unknown>;
}

function IssueEditorMetadataFields({
  values,
  copy,
  batchEnabled,
  setFieldValue,
  lockedFields,
}: IssueEditorMetadataFieldsProps) {
  const us = values.series.publisher.us;
  const formatLocked = Boolean(lockedFields?.format);
  const variantLocked = Boolean(lockedFields?.variant);
  const previewLabels = copy && batchEnabled ? buildVariantBatchLabels(values.copyBatch) : [];

  return (
    <Grid container spacing={2}>
      {copy ? (
        <Grid size={{ xs: 12 }}>
          <Accordion
            disableGutters
            elevation={0}
            expanded={Boolean(batchEnabled)}
            onChange={(_event, expanded) => {
              setFieldValue("copyBatch.enabled", expanded);
              if (!expanded) {
                setFieldValue("copyBatch.count", 1, false);
                setFieldValue("copyBatch.prefix", "", false);
              }
            }}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.5,
              backgroundColor: "transparent",
              boxShadow: "none",
              "&::before": { display: "none" },
              "& .MuiAccordionSummary-root": {
                minHeight: 44,
                px: 1.5,
              },
              "& .MuiAccordionSummary-content": {
                my: 0,
              },
              "& .MuiAccordionSummary-content.Mui-expanded": {
                my: 0,
              },
              "& .MuiAccordionDetails-root": {
                px: 1.5,
                pt: 0.5,
                pb: 1.5,
              },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">Varianten automatisch erzeugen</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 8, md: 6 }}>
                  <FastField
                    name="copyBatch.prefix"
                    label="Praefix"
                    component={TextField}
                    helperText='Z. B. "Panini Exclusive"'
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                  <FastField
                    name="copyBatch.count"
                    label="Anzahl"
                    type="number"
                    component={TextField}
                    inputProps={{ min: 1, max: 26 }}
                    helperText="1-26, immer A-Z"
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">
                    Vorschau: {previewLabels.join(", ")}
                  </Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      ) : null}

      {!us ? (
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <FastField
            disabled={formatLocked}
            type="text"
            name="format"
            label="Format"
            select
            component={TextField}
            InputLabelProps={{ shrink: true }}
            fullWidth
          >
            {formats.map((formatValue) => (
              <MenuItem key={formatValue} value={formatValue}>
                {formatValue}
              </MenuItem>
            ))}
          </FastField>
        </Grid>
      ) : null}

      {!(copy && batchEnabled) ? (
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <FastField
            disabled={variantLocked}
            name="variant"
            label="Variante"
            component={TextField}
            helperText={copy ? "Nur fuer einzelne Kopie." : undefined}
            fullWidth
          />
        </Grid>
      ) : null}

      {!us ? (
        <React.Fragment>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FastField
              name="limitation"
              label="Limitierung"
              type="text"
              component={TextField}
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FastField name="pages" label="Seiten" type="number" component={TextField} fullWidth />
          </Grid>

          <Grid size={{ xs: 8, sm: 4, md: 3 }}>
            <FastField name="price" label="Preis" component={TextField} fullWidth />
          </Grid>

          <Grid size={{ xs: 4, sm: 2, md: 2 }}>
            <FastField
              type="text"
              name="currency"
              label="Währung"
              select
              component={TextField}
              InputLabelProps={{ shrink: true }}
              fullWidth
            >
              {currencies.map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </FastField>
          </Grid>
        </React.Fragment>
      ) : null}

      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <FastField
          name="releasedate"
          label="Erscheinungsdatum"
          type="date"
          InputLabelProps={{ shrink: true }}
          component={TextField}
          fullWidth
        />
      </Grid>

      {us ? (
        <React.Fragment>
          <Grid size={{ xs: 12, md: 6 }}>
            <TypedMetadataAutocomplete
              source="individuals"
              field="individuals"
              type="EDITOR"
              entryKey="name"
              label="Verleger"
              values={asEntryList(values.individuals)}
              setFieldValue={setFieldValue}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TypedMetadataAutocomplete
              source="arcs"
              field="arcs"
              type="EVENT"
              entryKey="title"
              label="Event"
              values={asEntryList(values.arcs)}
              setFieldValue={setFieldValue}
              variables={{ type: "EVENT" }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TypedMetadataAutocomplete
              source="arcs"
              field="arcs"
              type="STORYARC"
              entryKey="title"
              label="Arc"
              values={asEntryList(values.arcs)}
              setFieldValue={setFieldValue}
              variables={{ type: "STORYARC" }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TypedMetadataAutocomplete
              source="arcs"
              field="arcs"
              type="STORYLINE"
              entryKey="title"
              label="Storyline"
              values={asEntryList(values.arcs)}
              setFieldValue={setFieldValue}
              variables={{ type: "STORYLINE" }}
            />
          </Grid>
        </React.Fragment>
      ) : null}
    </Grid>
  );
}

function TypedMetadataAutocomplete({
  source,
  field,
  label,
  type,
  entryKey,
  values,
  setFieldValue,
  variables = {},
}: TypedMetadataAutocompleteProps) {
  const pattern = getPattern(values, entryKey);

  const queryResult = useAutocompleteQuery<MetadataEntry>({
    source,
    variables: {
      ...variables,
      pattern,
    },
    searchText: pattern,
    minQueryLength: MIN_QUERY_LENGTH,
    debounceMs: DEBOUNCE_MS,
  });

  const selectedValues = values.filter((entry) => !entry.pattern && hasType(entry, type));
  const noOptionsText = queryResult.isBelowMinLength
    ? `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`
    : queryResult.error
      ? "Daten aktuell nicht verfügbar"
      : "Keine Ergebnisse gefunden";

  return (
    <AutocompleteBase
      options={queryResult.options}
      value={selectedValues}
      inputValue={pattern}
      label={label}
      placeholder={`${label} suchen...`}
      multiple
      freeSolo
      loading={queryResult.loading}
      noOptionsText={noOptionsText}
      onListboxScroll={queryResult.onListboxScroll}
      getOptionLabel={(option) => getEntryValue(option, entryKey)}
      isOptionEqualToValue={(option, value) =>
        normalizeText(getEntryValue(option, entryKey)) ===
        normalizeText(typeof value === "string" ? value : getEntryValue(value, entryKey))
      }
      onInputChange={(_, nextInput, reason) => {
        if (!isTypingReason(reason)) return;

        if (!nextInput.trim()) {
          setFieldValue(field, removePattern(values));
          return;
        }

        setFieldValue(field, writePattern(values, entryKey, nextInput));
      }}
      onChange={(_, nextValue, reason, details) => {
        const action = mapReasonToAction(reason);
        if (!action) return;

        const options = queryResult.options;
        const arrayValue = toArray(nextValue);

        const selectedOption =
          action === "remove"
            ? toEntry(details?.option || null, options, entryKey, type)
            : toEntry(
                details?.option || arrayValue[arrayValue.length - 1] || null,
                options,
                entryKey,
                type
              );

        const nextEntries = applyTypedChange(values, {
          action,
          type,
          entryKey,
          option: action === "remove" ? undefined : selectedOption,
          removedValue: action === "remove" ? selectedOption : undefined,
        });

        setFieldValue(field, nextEntries);
      }}
    />
  );
}

interface TypedChangeParams {
  action: "select" | "create" | "remove" | "clear";
  type: string;
  entryKey: EntryKey;
  option?: MetadataEntry | null;
  removedValue?: MetadataEntry | null;
}

function applyTypedChange(values: MetadataEntry[], params: TypedChangeParams) {
  const selected = structuredClone(values || []) as MetadataEntry[];

  switch (params.action) {
    case "select":
    case "create": {
      const optionValue = normalizeText(getEntryValue(params.option, params.entryKey));
      if (!optionValue) return sanitizeTypedEntries(selected, params.entryKey);

      const previous = selected.find(
        (entry) => normalizeText(getEntryValue(entry, params.entryKey)) === optionValue
      );

      if (previous) {
        appendType(previous, params.type);
      } else {
        const nextEntry = { ...(params.option || {}) };
        nextEntry[params.entryKey] = getEntryValue(params.option, params.entryKey).trim();
        nextEntry.type = [params.type];
        nextEntry.role = [params.type];
        selected.push(nextEntry);
      }
      break;
    }

    case "remove": {
      const removedValue = normalizeText(getEntryValue(params.removedValue, params.entryKey));
      if (!removedValue) return sanitizeTypedEntries(selected, params.entryKey);

      const previous = selected.find(
        (entry) => normalizeText(getEntryValue(entry, params.entryKey)) === removedValue
      );

      if (previous) removeType(previous, params.type);
      break;
    }

    case "clear":
      selected.forEach((entry) => removeType(entry, params.type));
      break;

    default:
      break;
  }

  return sanitizeTypedEntries(selected, params.entryKey);
}

function appendType(entry: MetadataEntry, type: string) {
  const nextTypes = normalizeStringList(entry.type);
  const nextRoles = normalizeStringList(entry.role);

  if (!nextTypes.includes(type)) {
    nextTypes.push(type);
    if (nextRoles.length > 0) nextRoles.push(type);
  }

  entry.type = nextTypes;
  if (nextRoles.length > 0) entry.role = nextRoles;
}

function removeType(entry: MetadataEntry, type: string) {
  const nextTypes: string[] = [];
  const nextRoles: string[] = [];
  const currentTypes = normalizeStringList(entry.type);
  const currentRoles = normalizeStringList(entry.role);

  currentTypes.forEach((currentType, index) => {
    if (currentType === type) return;
    nextTypes.push(currentType);
    if (currentRoles[index]) nextRoles.push(currentRoles[index]);
  });

  entry.type = nextTypes;
  if (currentRoles.length > 0) entry.role = nextRoles;
}

function hasType(entry: MetadataEntry, type: string) {
  return (
    normalizeStringList(entry.type).includes(type) || normalizeStringList(entry.role).includes(type)
  );
}

function sanitizeTypedEntries(values: MetadataEntry[], entryKey: EntryKey) {
  return values
    .filter((entry) => !entry.pattern)
    .filter((entry) => normalizeText(getEntryValue(entry, entryKey)).length > 0)
    .map((entry) => ({
      ...entry,
      type: normalizeStringList(entry.type),
      role: normalizeStringList(entry.role),
    }))
    .filter((entry) => entry.type.length > 0);
}

function mapReasonToAction(reason: AutocompleteChangeReason): TypedChangeParams["action"] | null {
  if (reason === "selectOption") return "select";
  if (reason === "createOption") return "create";
  if (reason === "removeOption") return "remove";
  if (reason === "clear") return "clear";
  return null;
}

function isTypingReason(reason: AutocompleteInputChangeReason) {
  return reason === "input" || reason === "clear";
}

function removePattern(values: MetadataEntry[]) {
  return values.filter((entry) => !entry.pattern);
}

function writePattern(values: MetadataEntry[], entryKey: EntryKey, value: string) {
  const nextValues = structuredClone(values || []) as MetadataEntry[];

  if (nextValues.length === 0 || !nextValues[nextValues.length - 1].pattern) {
    const patternEntry: MetadataEntry = { pattern: true };
    patternEntry[entryKey] = value;
    nextValues.push(patternEntry);
    return nextValues;
  }

  const nextPattern = { ...nextValues[nextValues.length - 1], [entryKey]: value };
  nextValues[nextValues.length - 1] = nextPattern;
  return nextValues;
}

function toEntry(
  value: unknown,
  options: MetadataEntry[],
  entryKey: EntryKey,
  type: string
): MetadataEntry | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const existing = options.find(
      (entry) => normalizeText(getEntryValue(entry, entryKey)) === normalizeText(trimmed)
    );
    if (existing) return existing;

    return {
      [entryKey]: trimmed,
      type: [type],
      role: [type],
    };
  }

  if (typeof value === "object" && !Array.isArray(value)) return value as MetadataEntry;
  return null;
}

function toArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function getPattern(values: MetadataEntry[], entryKey: EntryKey) {
  if (values.length === 0) return "";
  const lastEntry = values[values.length - 1];
  if (!lastEntry.pattern) return "";
  return getEntryValue(lastEntry, entryKey);
}

function getEntryValue(value: unknown, entryKey: EntryKey) {
  if (typeof value === "string") return value;
  return String((value as MetadataEntry | null | undefined)?.[entryKey] || "");
}

function normalizeStringList(value: string[] | string | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [value];
}

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function asEntryList(values: Array<Record<string, unknown>> | undefined) {
  if (!Array.isArray(values)) return [];
  return values.filter(
    (entry): entry is MetadataEntry =>
      Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)
  );
}

export default IssueEditorMetadataFields;
