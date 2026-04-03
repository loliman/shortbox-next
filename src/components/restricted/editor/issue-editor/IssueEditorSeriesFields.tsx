import React from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { FastField, getIn, useFormikContext } from "formik";
import { TextField } from "../../../generic/FormikTextField";
import AutocompleteBase from "../../../generic/AutocompleteBase";
import { useAutocompleteQuery } from "../../../generic/useAutocompleteQuery";
import type { IssueEditorFormValues } from "./types";
import { getSeriesLabel } from "../../../../lib/routes/issue-presentation";
import { getNextPublisherSelection, getNextSeriesSelection } from "./seriesSelection";
import {
  getPublisherOptionKey,
  getSeriesOptionKey,
} from "../../../generic/autocompleteOptionKeys";

interface IssueEditorSeriesFieldsProps {
  values: IssueEditorFormValues;
  isDesktop?: boolean;
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  showHints?: boolean;
  lockedFields?: {
    title?: boolean;
    publisher?: boolean;
    series?: boolean;
    number?: boolean;
  };
}

interface PublisherOption {
  name?: string;
  us?: boolean;
  [key: string]: unknown;
}

interface SeriesOption {
  title?: string;
  volume?: number | string;
  startyear?: number | string;
  publisher?: { name?: string; us?: boolean };
  [key: string]: unknown;
}

const MIN_QUERY_LENGTH = 2;
const TITLE_HINT = "Hinweis: Titel wird vererbt. Für Variants leer lassen.";

function IssueEditorSeriesFields({
  values,
  setFieldValue,
  showHints = true,
  lockedFields,
}: IssueEditorSeriesFieldsProps) {
  const formik = useFormikContext<IssueEditorFormValues>();
  const publisherPattern = values.series.publisher.name ?? "";
  const seriesPattern = values.series.title ?? "";
  const publisherUs = Boolean(values.series.publisher.us);
  const isSeriesDisabled = publisherPattern.trim().length === 0;
  const titleLocked = Boolean(lockedFields?.title);
  const publisherLocked = Boolean(lockedFields?.publisher);
  const seriesLocked = Boolean(lockedFields?.series);
  const numberLocked = Boolean(lockedFields?.number);

  const publisherQuery = useAutocompleteQuery<PublisherOption>({
    source: "publishers",
    variables: {
      pattern: publisherPattern,
      us: publisherUs,
    },
    searchText: publisherPattern,
    minQueryLength: MIN_QUERY_LENGTH,
    debounceMs: 250,
  });

  const seriesQuery = useAutocompleteQuery<SeriesOption>({
    source: "series",
    variables: {
      pattern: seriesPattern,
      publisher: { name: publisherPattern, us: publisherUs },
    },
    enabled: !isSeriesDisabled,
    searchText: seriesPattern,
    minQueryLength: MIN_QUERY_LENGTH,
    debounceMs: 250,
  });

  const publisherValue =
    publisherQuery.options.find(
      (entry) => normalizeText(entry.name) === normalizeText(values.series.publisher.name)
    ) || (publisherPattern.trim().length > 0 ? { name: publisherPattern } : null);

  const seriesValue =
    seriesQuery.options.find(
      (entry) =>
        normalizeText(entry.title) === normalizeText(values.series.title) &&
        normalizeText(entry.publisher?.name) === normalizeText(values.series.publisher.name)
    ) || (seriesPattern.trim().length > 0 ? seriesPattern : null);

  let publisherNoOptionsText = "Keine Ergebnisse gefunden";
  if (publisherQuery.isBelowMinLength) {
    publisherNoOptionsText = `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`;
  } else if (publisherQuery.error) {
    publisherNoOptionsText = "Daten aktuell nicht verfügbar";
  }

  let seriesNoOptionsText = "Keine Ergebnisse gefunden";
  if (isSeriesDisabled) {
    seriesNoOptionsText = "Bitte zuerst Verlag wählen";
  } else if (seriesQuery.isBelowMinLength) {
    seriesNoOptionsText = `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`;
  } else if (seriesQuery.error) {
    seriesNoOptionsText = "Daten aktuell nicht verfügbar";
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 8 }}>
        <FastField disabled={titleLocked} name="title" label="Titel" component={TextField} fullWidth />
      </Grid>

      <Grid size={12}>
        {showHints ? (
          <Typography variant="body2" color="text.secondary">
            {titleLocked
              ? "Hinweis: Titel wird von der Story-Owner-Ausgabe geerbt und kann nur dort bearbeitet werden."
              : TITLE_HINT}
          </Typography>
        ) : null}
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <AutocompleteBase
          id="series.publisher.name"
          disabled={publisherLocked}
          options={publisherQuery.options}
          value={publisherValue}
          inputValue={publisherPattern}
          label="Verlag"
          placeholder="Verlag suchen..."
          loading={publisherQuery.loading}
          freeSolo
          noOptionsText={publisherNoOptionsText}
          onListboxScroll={publisherQuery.onListboxScroll}
          getOptionLabel={(option) =>
            typeof option === "string" ? option : formatPublisherLabel(option as PublisherOption)
          }
          getOptionKey={(option) => getPublisherOptionKey(option as PublisherOption | string)}
          error={showFieldError(formik, "series.publisher.name")}
          helperText={readFieldError(formik, "series.publisher.name")}
          isOptionEqualToValue={(option, value) =>
            normalizeText(option.name) ===
            normalizeText(typeof value === "string" ? value : value?.name)
          }
          onInputChange={(_, value, reason) => {
            if (reason !== "input" && reason !== "clear") return;
            setFieldValue("series.publisher.name", value);
          }}
          onChange={(_, option) => {
            const selectedOption = Array.isArray(option) ? option[0] || null : option;

            setFieldValue(
              "series",
              getNextPublisherSelection(selectedOption as PublisherOption | string | null, values.series.publisher.us)
            );
          }}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <AutocompleteBase
          id="series.title"
          disabled={publisherLocked || seriesLocked || isSeriesDisabled}
          options={seriesQuery.options}
          value={seriesValue}
          inputValue={seriesPattern}
          label="Serie"
          placeholder="Serie suchen..."
          loading={seriesQuery.loading}
          freeSolo
          noOptionsText={seriesNoOptionsText}
          onListboxScroll={seriesQuery.onListboxScroll}
          getOptionLabel={(option) =>
            typeof option === "string" ? option : formatSeriesLabel(option as SeriesOption)
          }
          getOptionKey={(option) => getSeriesOptionKey(option as SeriesOption | string)}
          error={showFieldError(formik, "series.title")}
          helperText={readFieldError(formik, "series.title")}
          isOptionEqualToValue={(option, value) =>
            normalizeText(getSeriesKey(option)) ===
            normalizeText(typeof value === "string" ? value : getSeriesKey(value))
          }
          onInputChange={(_, value, reason) => {
            if (reason !== "input" && reason !== "clear") return;
            setFieldValue("series.title", value);
          }}
          onChange={(_, option) => {
            const selectedOption = Array.isArray(option) ? option[0] || null : option;

            setFieldValue(
              "series",
              getNextSeriesSelection(
                selectedOption as SeriesOption | string | null,
                {
                  name: values.series.publisher.name,
                  us: values.series.publisher.us,
                },
                values.series.volume
              )
            );
          }}
        />
      </Grid>

      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <FastField
          disabled={publisherLocked || seriesLocked || isSeriesDisabled}
          name="series.volume"
          label="Volume"
          type="number"
          component={TextField}
          fullWidth
        />
      </Grid>

      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <FastField
          disabled={numberLocked}
          name="number"
          label="Nummer"
          component={TextField}
          fullWidth
        />
      </Grid>
    </Grid>
  );
}

function normalizeText(value: unknown) {
  return readTextValue(value).toLowerCase();
}

function formatPublisherLabel(option: PublisherOption) {
  return readTextValue(option.name);
}

function formatSeriesLabel(option: SeriesOption) {
  return getSeriesLabel(option);
}

function getSeriesKey(value: SeriesOption | Record<string, unknown> | null | undefined) {
  if (!value) return "";
  return `${readTextValue((value as SeriesOption).title)}::${readTextValue((value as SeriesOption).volume)}`;
}

function readTextValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}

function showFieldError(formik: ReturnType<typeof useFormikContext<IssueEditorFormValues>>, path: string) {
  return Boolean((getIn(formik.touched, path) || formik.submitCount > 0) && getIn(formik.errors, path));
}

function readFieldError(formik: ReturnType<typeof useFormikContext<IssueEditorFormValues>>, path: string) {
  return showFieldError(formik, path) ? readTextValue(getIn(formik.errors, path)) : undefined;
}

export default IssueEditorSeriesFields;
