import React from "react";
import Grid from "@mui/material/Grid";
import { FastField, getIn, useFormikContext } from "formik";
import AutocompleteBase from "../../../generic/AutocompleteBase";
import { useAutocompleteQuery } from "../../../generic/useAutocompleteQuery";
import { TextField } from "../../../generic/FormikTextField";
import type { ContainsProps, FieldItem } from "./types";
import TypedRoleAutocomplete from "./TypedRoleAutocomplete";
import { getSeriesLabel } from "../../../../lib/routes/issue-presentation";
import { getNextStoryParentSeriesSelection } from "./storySeriesSelection";
import { getSeriesOptionKey } from "../../../generic/autocompleteOptionKeys";

const MIN_QUERY_LENGTH = 2;

interface StoryFieldsNonExclusiveProps extends ContainsProps {
  index?: number;
  values?: Record<string, unknown> & { stories?: FieldItem[] };
}

function StoryFieldsNonExclusive(props: Readonly<StoryFieldsNonExclusiveProps>) {
  const formik = useFormikContext<Record<string, unknown>>();
  const index = Number.isInteger(props.index) ? (props.index as number) : 0;
  const values = props.values ?? {};
  const setFieldValue = props.setFieldValue ?? (() => undefined);
  const stories = values.stories ?? [];
  const item = stories[index] ?? {};
  const parent = (item.parent ?? {}) as {
    issue?: { series?: { title?: string; volume?: number; startyear?: number } };
  };
  const parentIssue = parent.issue ?? {};
  const parentSeries = parentIssue.series ?? {};
  const seriesPattern = readInputValue(parentSeries.title);

  const seriesQuery = useAutocompleteQuery<FieldItem>({
    source: "series",
    variables: {
      pattern: seriesPattern,
      publisher: { name: "*", us: true },
    },
    searchText: seriesPattern,
    minQueryLength: MIN_QUERY_LENGTH,
    debounceMs: 250,
  });

  const currentSeriesValue =
    seriesQuery.options.find(
      (entry) =>
        normalizeText(entry.title) === normalizeText(parentSeries.title) &&
        normalizeText(readTextValue(entry.volume)) ===
          normalizeText(readTextValue(parentSeries.volume))
        ) ??
    (seriesPattern.trim().length > 0
      ? {
          title: parentSeries.title,
          volume: parentSeries.volume,
          startyear: parentSeries.startyear,
        }
      : null);

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <AutocompleteBase
          id={`stories.${index}.parent.issue.series.title`}
          options={seriesQuery.options}
          value={currentSeriesValue}
          inputValue={seriesPattern}
          label="Serie"
          placeholder="US-Serie suchen..."
          freeSolo
          loading={seriesQuery.loading}
          noOptionsText={
            getNoOptionsText(seriesQuery.isBelowMinLength, seriesQuery.error)
          }
          onListboxScroll={seriesQuery.onListboxScroll}
          getOptionLabel={(option) => formatSeriesLabel(option)}
          getOptionKey={(option) => getSeriesOptionKey(option)}
          error={showFieldError(formik, `stories[${index}].parent.issue.series.title`)}
          helperText={readFieldError(formik, `stories[${index}].parent.issue.series.title`)}
          isOptionEqualToValue={(option, value) =>
            normalizeText(getSeriesKey(option)) ===
            normalizeText(typeof value === "string" ? value : getSeriesKey(value))
          }
          onInputChange={(_, inputValue, reason) => {
            if (reason !== "input" && reason !== "clear") return;
            setFieldValue(`stories[${index}].parent.issue.series.title`, inputValue);
          }}
          onChange={(_, option) => {
            const selectedOption = Array.isArray(option) ? (option[0] ?? null) : option;
            let selected;
            if (isOptionLike(selectedOption)) {
              selected = { ...selectedOption, volume: selectedOption.volume ?? 0 };
            } else {
              selected = getNextStoryParentSeriesSelection(
                typeof selectedOption === "string" ? selectedOption : null,
                Number(parentSeries.volume ?? 1)
              );
            }

            setFieldValue(`stories[${index}].parent.issue.series`, selected);
          }}
        />
      </Grid>

      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <FastField
          name={`stories[${index}].parent.issue.series.volume`}
          label="Volume"
          type="number"
          component={TextField}
          fullWidth
        />
      </Grid>

      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <FastField
          name={`stories[${index}].parent.issue.number`}
          label="Nummer"
          component={TextField}
          fullWidth
        />
      </Grid>

      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <FastField
          name={`stories[${index}].parent.number`}
          label="#"
          type="number"
          component={TextField}
          fullWidth
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TypedRoleAutocomplete
          source="individuals"
          field={`stories[${index}].individuals`}
          label="Übersetzer"
          type="TRANSLATOR"
          values={(item.individuals as FieldItem[]) || []}
          setFieldValue={setFieldValue}
          disabled={props.disabled}
        />
      </Grid>
    </Grid>
  );
}

function isOptionLike(value: unknown): value is FieldItem {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatSeriesLabel(entry: unknown) {
  const option = entry as { title?: unknown; volume?: unknown; startyear?: unknown };
  return getSeriesLabel({
    title: readTextValue(option?.title),
    volume: option?.volume as string | number | null | undefined,
    startyear: option?.startyear as string | number | null | undefined,
  });
}

function getSeriesKey(value: unknown) {
  const option = value as { title?: unknown; volume?: unknown };
  return `${readTextValue(option?.title)}::${readTextValue(option?.volume)}`;
}

function readTextValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}

function readInputValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function normalizeText(value: unknown) {
  return readTextValue(value).toLowerCase();
}

function showFieldError(
  formik: ReturnType<typeof useFormikContext<Record<string, unknown>>>,
  path: string
) {
  return Boolean((getIn(formik.touched, path) || formik.submitCount > 0) && getIn(formik.errors, path));
}

function readFieldError(
  formik: ReturnType<typeof useFormikContext<Record<string, unknown>>>,
  path: string
) {
  return showFieldError(formik, path) ? readTextValue(getIn(formik.errors, path)) : undefined;
}

function getNoOptionsText(isBelowMinLength: boolean, error: unknown) {
  if (isBelowMinLength) return `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`;
  if (error) return "Daten aktuell nicht verfügbar";
  return "Keine Ergebnisse gefunden";
}

export default StoryFieldsNonExclusive;
