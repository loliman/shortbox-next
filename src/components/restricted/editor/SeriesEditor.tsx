"use client";

import { useRouter } from "next/navigation";
import { SeriesSchema } from "../../../util/yupSchema";
import { FastField, Form, Formik } from "formik";
import { TextField } from "../../generic/FormikTextField";
import React from "react";
import { generateLabel, generateSeoUrl } from "../../../lib/routes/hierarchy";
import Button from "@mui/material/Button";
import { stripItem } from "../../../util/util";
import AutocompleteBase from "../../generic/AutocompleteBase";
import { useAutocompleteQuery } from "../../generic/useAutocompleteQuery";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import FormControlLabel from "@mui/material/FormControlLabel";
import { ContrastSwitch } from "../../generic/ContrastSwitch";
import TitleLine from "../../generic/TitleLine";
import Stack from "@mui/material/Stack";
import type { FieldItem } from "../../../util/filterFieldHelpers";
import type { SxProps, Theme } from "@mui/material/styles";
import { mutationRequest } from "../../../lib/client/mutation-request";
import FormPageShell from "../../form-shell/FormPageShell";
import FormSection from "../../form-shell/FormSection";
import type { SelectedRoot } from "../../../types/domain";

const MIN_QUERY_LENGTH = 2;
const editorFieldSx = { width: "100%", maxWidth: { xs: "100%", md: 420 } } as const;
const editorTextAreaSx = { width: "100%", maxWidth: { xs: "100%", md: 640 } } as const;

interface SeriesFormValues {
  title: string;
  genre: string;
  publisher: {
    name: string;
    us: boolean;
  };
  volume: number;
  startyear: number;
  endyear: number;
  addinfo: string;
}

interface SeriesEditorProps {
  defaultValues?: SeriesFormValues;
  edit?: boolean;
  id?: string | number;
  session?: unknown;
  isDesktop?: boolean;
  enqueueSnackbar: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
  us?: boolean;
  [key: string]: unknown;
}

type SeriesMutationResult = {
  publisher?: { us?: boolean };
  [key: string]: unknown;
};

function createInitialSeriesValues(defaultValues?: SeriesFormValues): SeriesFormValues {
  return {
    title: readTextValue(defaultValues?.title),
    genre: readTextValue(defaultValues?.genre),
    publisher: {
      name: readTextValue(defaultValues?.publisher?.name),
      us: Boolean(defaultValues?.publisher?.us),
    },
    volume: Number(defaultValues?.volume ?? 1),
    startyear: Number(defaultValues?.startyear ?? 1900),
    endyear: Number(defaultValues?.endyear ?? 1900),
    addinfo: readTextValue(defaultValues?.addinfo),
  };
}

function SeriesEditorView(props: Readonly<SeriesEditorProps>) {
  const router = useRouter();
  const { enqueueSnackbar, edit = false } = props;

  const [defaultValues, setDefaultValues] = React.useState<SeriesFormValues>(() =>
    createInitialSeriesValues(props.defaultValues)
  );

  const seriesLabel = generateLabel({
    series: defaultValues as unknown as SelectedRoot["series"],
    us: defaultValues.publisher.us,
  });
  const header = edit ? seriesLabel + " bearbeiten" : "Serie erstellen";
  const submitLabel = edit ? "Speichern" : "Erstellen";
  const successMessage = edit ? " erfolgreich gespeichert" : " erfolgreich erstellt";
  const errorMessage = edit
    ? seriesLabel + " konnte nicht gespeichert werden"
    : "Serie konnte nicht erstellt werden";

  const toggleUs = React.useCallback(() => {
    setDefaultValues((prevState) => ({
      ...prevState,
      publisher: {
        ...prevState.publisher,
        us: !prevState.publisher.us,
      },
    }));
  }, []);

  return (
    <Formik
      initialValues={defaultValues}
      enableReinitialize
      validationSchema={SeriesSchema}
      onSubmit={async (values, actions) => {
        actions.setSubmitting(true);

        try {
          const variables: Record<string, unknown> = {};
          variables.item = normalizeSeriesPayload(values);
          if (edit) variables.old = normalizeSeriesPayload(defaultValues);

          const result = await mutationRequest<{ item?: SeriesMutationResult }>({
            url: "/api/series",
            method: edit ? "PATCH" : "POST",
            body: variables,
          });

          const nextItem = result.item;
          if (!nextItem) throw new Error("Serie konnte nicht gespeichert werden");

          const nextUs = Boolean(nextItem.publisher?.us);
          const nextSelection: SelectedRoot = {
            series: nextItem as unknown as SelectedRoot["series"],
            us: nextUs,
          };
          enqueueSnackbar(generateLabel(nextSelection) + successMessage, {
            variant: "success",
          });
          router.push(
            generateSeoUrl(
              nextSelection,
              nextUs
            )
          );
        } catch (error) {
          const message = error instanceof Error && error.message ? ` [${error.message}]` : "";
          enqueueSnackbar(errorMessage + message, { variant: "error" });
        } finally {
          actions.setSubmitting(false);
        }
      }}
    >
      {({ values, resetForm, submitForm, isSubmitting, setFieldValue }) => {
        return (
          <Form style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
            <FormPageShell
              title={<TitleLine title={header} id={props.id} session={props.session} />}
              headerAction={
                <FormControlLabel
                  sx={{ m: 0 }}
                  control={
                    <Tooltip title={(values.publisher.us ? "Deutscher" : "US") + " Serie"}>
                      <ContrastSwitch
                        disabled={edit}
                        checked={values.publisher.us}
                        onChange={() => {
                          toggleUs();
                          resetForm();
                        }}
                        color="secondary"
                      />
                    </Tooltip>
                  }
                  label="US"
                />
              }
              actions={
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", md: "center" }}
                >
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button
                      disabled={isSubmitting}
                      onClick={() => resetForm()}
                      variant="text"
                      color="inherit"
                    >
                      Zurücksetzen
                    </Button>

                    <Button
                      disabled={isSubmitting}
                      onClick={() => router.back()}
                      variant="outlined"
                      color="inherit"
                    >
                      Abbrechen
                    </Button>
                  </Box>

                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Button
                      disabled={isSubmitting}
                      onClick={submitForm}
                      variant="contained"
                      color="primary"
                    >
                      {submitLabel}
                    </Button>
                  </Box>
                </Stack>
              }
            >
              <FormSection title="Basisdaten">
                <Stack spacing={2}>
                  <FastField
                    name="title"
                    label="Titel"
                    component={TextField}
                    sx={editorFieldSx}
                  />

                  <SeriesPublisherAutocomplete
                    publisherName={values.publisher.name}
                    publisherUs={Boolean(values.publisher.us)}
                    setFieldValue={setFieldValue}
                    textFieldSx={editorFieldSx}
                  />

                  <FastField
                    name="volume"
                    label="Volume"
                    type="number"
                    component={TextField}
                    sx={editorFieldSx}
                  />

                  <FastField
                    name="startyear"
                    label="Startjahr"
                    type="number"
                    component={TextField}
                    sx={editorFieldSx}
                  />

                  <FastField
                    name="endyear"
                    label="Endjahr"
                    type="number"
                    component={TextField}
                    sx={editorFieldSx}
                  />

                  <SeriesGenreAutocomplete
                    genre={values.genre}
                    setFieldValue={setFieldValue}
                    textFieldSx={editorFieldSx}
                  />
                </Stack>
              </FormSection>

              <FormSection title="Beschreibung">
                <FastField
                  name="addinfo"
                  label="Weitere Informationen"
                  multiline
                  rows={10}
                  component={TextField}
                  sx={editorTextAreaSx}
                />
              </FormSection>
            </FormPageShell>
          </Form>
        );
      }}
    </Formik>
  );
}

interface SeriesPublisherAutocompleteProps {
  publisherName: string;
  publisherUs: boolean;
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  textFieldSx?: SxProps<Theme>;
}

interface SeriesGenreAutocompleteProps {
  genre: string;
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  textFieldSx?: SxProps<Theme>;
}

function SeriesPublisherAutocomplete({
  publisherName,
  publisherUs,
  setFieldValue,
  textFieldSx,
}: Readonly<SeriesPublisherAutocompleteProps>) {
  const query = useAutocompleteQuery<FieldItem>({
    source: "publishers",
    variables: {
      pattern: publisherName,
      us: publisherUs,
    },
    searchText: publisherName,
    minQueryLength: MIN_QUERY_LENGTH,
    debounceMs: 250,
  });

  const currentValue =
    query.options.find((entry) => normalizeText(entry.name) === normalizeText(publisherName)) ||
    (normalizeText(publisherName).length > 0 ? { name: publisherName } : null);

  return (
    <AutocompleteBase
      options={query.options}
      value={currentValue}
      inputValue={publisherName}
      label="Verlag"
      placeholder="Verlag suchen..."
      freeSolo
      textFieldSx={textFieldSx}
      loading={query.loading}
      noOptionsText={getNoOptionsText(query.isBelowMinLength, query.error)}
      onListboxScroll={query.onListboxScroll}
      getOptionLabel={(option) => readTextValue((option as { name?: unknown })?.name)}
      isOptionEqualToValue={(option, value) =>
        normalizeText(option.name) === normalizeText((value as { name?: unknown })?.name)
      }
      onInputChange={(_, inputValue, reason) => {
        if (reason !== "input" && reason !== "clear") return;
        setFieldValue("publisher.name", inputValue);
      }}
      onChange={(_, option) => {
        const selectedOption = Array.isArray(option) ? option[0] || null : option;
        let selectedName = "";
        if (isOptionLike(selectedOption)) {
          selectedName = readTextValue(selectedOption.name);
        } else if (typeof selectedOption === "string") {
          selectedName = selectedOption;
        }
        setFieldValue("publisher", {
          name: selectedName,
          us: publisherUs,
        });
      }}
    />
  );
}

function SeriesGenreAutocomplete({
  genre,
  setFieldValue,
  textFieldSx,
}: Readonly<SeriesGenreAutocompleteProps>) {
  const [pattern, setPattern] = React.useState("");
  const selectedGenreNames = React.useMemo(() => parseGenreString(genre), [genre]);

  const query = useAutocompleteQuery<FieldItem>({
    source: "genres",
    variables: {
      pattern,
    },
    searchText: pattern,
    minQueryLength: 0,
    debounceMs: 250,
  });

  const genreOptions = React.useMemo(
    () =>
      normalizeGenreNames([
        ...selectedGenreNames,
        ...query.options.map((entry) => readTextValue(entry?.name)),
      ])
        .map((name) => ({ name })),
    [query.options, selectedGenreNames]
  );

  return (
    <AutocompleteBase
      options={genreOptions}
      value={selectedGenreNames.map((name) => ({ name }))}
      inputValue={pattern}
      label="Genre"
      placeholder="Genre wählen oder eingeben..."
      multiple
      freeSolo
      textFieldSx={textFieldSx}
      loading={query.loading}
      noOptionsText={getNoOptionsText(query.isBelowMinLength, query.error)}
      onListboxScroll={query.onListboxScroll}
      getOptionLabel={(option) => getGenreOptionName(option)}
      isOptionEqualToValue={(option, value) =>
        normalizeText(option.name) === normalizeText(getGenreOptionName(value))
      }
      onInputChange={(_, inputValue, reason) => {
        if (reason !== "input" && reason !== "clear") return;
        setPattern(inputValue);
      }}
      onChange={(_, value) => {
        setFieldValue("genre", serializeGenres(toGenreNameList(value)));
        setPattern("");
      }}
    />
  );
}

function getGenreOptionName(option: unknown): string {
  if (typeof option === "string") return option;
  if (option && typeof option === "object" && !Array.isArray(option)) {
    return readTextValue((option as { name?: unknown }).name);
  }
  return "";
}

function normalizeGenreNames(values: string[]): string[] {
  const unique = new Map<string, string>();

  values.forEach((value) => {
    const name = readTextValue(value);
    if (!name) return;

    const key = normalizeText(name);
    if (!unique.has(key)) unique.set(key, name);
  });

  return [...unique.values()];
}

function parseGenreString(value: string): string[] {
  return normalizeGenreNames(readTextValue(value).split(","));
}

function toGenreNameList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return normalizeGenreNames(value.map((entry) => getGenreOptionName(entry)));
  }
  return normalizeGenreNames([getGenreOptionName(value)]);
}

function serializeGenres(values: string[]): string {
  return normalizeGenreNames(values).join(", ");
}

function isOptionLike(value: unknown): value is FieldItem {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown) {
  return readTextValue(value).toLowerCase();
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}

function getNoOptionsText(isBelowMinLength: boolean, error: unknown) {
  if (isBelowMinLength) return `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`;
  if (error) return "Daten aktuell nicht verfügbar";
  return "Keine Ergebnisse gefunden";
}

export default function SeriesEditor(props: Readonly<SeriesEditorProps>) {
  return <SeriesEditorView {...props} />;
}

function normalizeSeriesPayload(values: SeriesFormValues) {
  const stripped = stripItem(values) as SeriesFormValues & Record<string, unknown>;
  const publisherName = readTextValue(values.publisher?.name);
  const publisherUs = Boolean(values.publisher?.us);
  const genre = serializeGenres(parseGenreString(values.genre));

  return {
    ...stripped,
    genre,
    publisher: {
      name: publisherName,
      us: publisherUs,
    },
  };
}
