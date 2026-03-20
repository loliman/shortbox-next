import { useMutation } from "@apollo/client";
import { useRouter } from "next/navigation";
import { SeriesSchema } from "../../../util/yupSchema";
import { FastField, Form, Formik } from "formik";
import { TextField } from "../../generic/FormikTextField";
import React from "react";
import { generateLabel, generateUrl } from "../../../util/hierarchy";
import Button from "@mui/material/Button";
import { genres, publishers, series, seriesd } from "../../../graphql/queriesTyped";
import { decapitalize, stripItem, wrapItem } from "../../../util/util";
import AutocompleteBase from "../../generic/AutocompleteBase";
import { useAutocompleteQuery } from "../../generic/useAutocompleteQuery";
import { addToCache, removeFromCache, updateInCache } from "./Editor";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import TitleLine from "../../generic/TitleLine";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import type { DocumentNode } from "graphql";
import type { FieldItem } from "../../../util/filterFieldHelpers";
import type { SxProps, Theme } from "@mui/material/styles";
import { editorSectionSx } from "./editorLayout";
import { AppContext } from "../../generic/AppContext";
import { useSnackbarBridge } from "../../generic/useSnackbarBridge";

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
  mutation: DocumentNode;
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
    title: String(defaultValues?.title || ""),
    genre: String(defaultValues?.genre || ""),
    publisher: {
      name: String(defaultValues?.publisher?.name || ""),
      us: Boolean(defaultValues?.publisher?.us),
    },
    volume: Number(defaultValues?.volume ?? 1),
    startyear: Number(defaultValues?.startyear ?? 1900),
    endyear: Number(defaultValues?.endyear ?? 1900),
    addinfo: String(defaultValues?.addinfo || ""),
  };
}

function SeriesEditorView(props: Readonly<SeriesEditorProps>) {
  const router = useRouter();
  const { enqueueSnackbar, edit = false, mutation } = props;

  const [defaultValues, setDefaultValues] = React.useState<SeriesFormValues>(() =>
    createInitialSeriesValues(props.defaultValues)
  );

  const mutationDefinition = mutation.definitions[0] as { name?: { value?: string } };
  const mutationName = decapitalize(mutationDefinition.name?.value || "");

  const header = edit ? generateLabel(defaultValues) + " bearbeiten" : "Serie erstellen";
  const submitLabel = edit ? "Speichern" : "Erstellen";
  const successMessage = edit ? " erfolgreich gespeichert" : " erfolgreich erstellt";
  const errorMessage = edit
    ? generateLabel(defaultValues) + " konnte nicht gespeichert werden"
    : "Serie konnte nicht erstellt werden";

  const [runMutation] = useMutation(mutation, {
    update: (cache, result) => {
      const payload = result.data as Record<string, unknown> | null | undefined;
      const res = payload?.[mutationName] as SeriesMutationResult | undefined;
      if (!res) return;

      const newSeries = structuredClone(res);

      try {
        const publisher = structuredClone(res.publisher || {});
        publisher.us = undefined;
        addToCache(cache, series, stripItem(wrapItem(publisher)), newSeries);
      } catch {
        // ignore cache exception
      }

      if (!edit) return;

      const publisherRef = {
        name: defaultValues.publisher.name,
      };

      try {
        const seriesRef = {
          title: defaultValues.title,
          volume: defaultValues.volume,
          publisher: publisherRef,
        };

        updateInCache(cache, seriesd, { series: seriesRef }, defaultValues, {
          seriesd: newSeries,
        });
      } catch {
        // ignore cache exception
      }

      try {
        removeFromCache(cache, series, { publisher: publisherRef }, defaultValues);
      } catch {
        // ignore cache exception
      }
    },
    onCompleted: (data) => {
      const result = (data as Record<string, unknown>)[mutationName] as SeriesMutationResult;
      enqueueSnackbar(generateLabel(result) + successMessage, {
        variant: "success",
      });
      router.push(generateUrl(result, Boolean(result.publisher?.us)));
    },
    onError: (errors) => {
      const message =
        errors.graphQLErrors && errors.graphQLErrors.length > 0
          ? " [" + errors.graphQLErrors[0].message + "]"
          : "";
      enqueueSnackbar(errorMessage + message, { variant: "error" });
    },
  });

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

          await runMutation({ variables });
        } finally {
          actions.setSubmitting(false);
        }
      }}
    >
      {({ values, resetForm, submitForm, isSubmitting, setFieldValue }) => {
        return (
          <Form>
            <CardHeader
              title={<TitleLine title={header} id={props.id} session={props.session} />}
              action={
                <FormControlLabel
                  sx={{ m: 0 }}
                  control={
                    <Tooltip title={(values.publisher.us ? "Deutscher" : "US") + " Serie"}>
                      <Switch
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
            />

            <CardContent sx={{ pt: 1 }}>
              <Stack spacing={2.25}>
                <Paper elevation={0} sx={editorSectionSx}>
                  <Stack spacing={2}>
                    <Typography variant="subtitle1">Basisdaten</Typography>

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
                </Paper>

                <Paper elevation={0} sx={editorSectionSx}>
                  <Stack spacing={2}>
                    <Typography variant="subtitle1">Beschreibung</Typography>

                    <FastField
                      name="addinfo"
                      label="Weitere Informationen"
                      multiline
                      rows={10}
                      component={TextField}
                      sx={editorTextAreaSx}
                    />
                  </Stack>
                </Paper>

                <Paper elevation={0} sx={editorSectionSx}>
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

                    <Box
                      sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}
                    >
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
                </Paper>
              </Stack>
            </CardContent>
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

interface SeriesGenreOption {
  name: string;
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
    query: publishers,
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
    (normalizeText(publisherName).length > 0 ? publisherName : null);

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
      noOptionsText={
        query.isBelowMinLength
          ? `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`
          : query.error
            ? "Fehler!"
            : "Keine Ergebnisse gefunden"
      }
      onListboxScroll={query.onListboxScroll}
      getOptionLabel={(option) => String((option as { name?: unknown })?.name || "")}
      isOptionEqualToValue={(option, value) =>
        normalizeText(option.name) === normalizeText((value as { name?: unknown })?.name)
      }
      onInputChange={(_, inputValue, reason) => {
        if (reason !== "input" && reason !== "clear") return;
        setFieldValue("publisher.name", inputValue);
      }}
      onChange={(_, option) => {
        const selectedOption = Array.isArray(option) ? option[0] || null : option;
        const selectedName = isOptionLike(selectedOption)
          ? String(selectedOption.name || "")
          : typeof selectedOption === "string"
            ? selectedOption
            : "";
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

  const query = useAutocompleteQuery<string>({
    query: genres,
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
        ...query.options.map((entry) => String(entry || "")),
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
      noOptionsText={
        query.isBelowMinLength
          ? `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`
          : query.error
            ? "Fehler!"
            : "Keine Ergebnisse gefunden"
      }
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
    return String((option as { name?: unknown }).name || "");
  }
  return "";
}

function normalizeGenreNames(values: string[]): string[] {
  const unique = new Map<string, string>();

  values.forEach((value) => {
    const name = String(value || "").trim();
    if (!name) return;

    const key = normalizeText(name);
    if (!unique.has(key)) unique.set(key, name);
  });

  return [...unique.values()];
}

function parseGenreString(value: string): string[] {
  return normalizeGenreNames(String(value || "").split(","));
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
  return String(value || "")
    .trim()
    .toLowerCase();
}

export default function SeriesEditor(props: Readonly<Partial<SeriesEditorProps>>) {
  const appContext = React.useContext(AppContext);
  const snackbarBridge = useSnackbarBridge();

  return <SeriesEditorView {...appContext} {...snackbarBridge} {...props} />;
}

function normalizeSeriesPayload(values: SeriesFormValues) {
  const stripped = stripItem(values) as SeriesFormValues & Record<string, unknown>;
  const publisherName = String(values.publisher?.name || "").trim();
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
