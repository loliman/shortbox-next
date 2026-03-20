import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { FastField } from "formik";
import AutocompleteBase from "../../generic/AutocompleteBase";
import { useAutocompleteQuery } from "../../generic/useAutocompleteQuery";
import { TextField } from "../../generic/FormikTextField";
import FilterSwitch from "../FilterSwitch";
import { FORMAT_OPTIONS } from "../constants";
import { FilterValues } from "../types";
import type { FieldItem } from "../../../util/filterFieldHelpers";
import { getSeriesLabel } from "../../../util/issuePresentation";

const MIN_QUERY_LENGTH = 2;
const GENRE_MIN_QUERY_LENGTH = 0;

interface DetailsSectionProps {
  values: FilterValues;
  us: boolean;
  isDesktop: boolean;
  setFieldValue: (field: string, value: unknown) => void;
  hasSession: boolean;
}

function DetailsSection({
  values,
  us,
  isDesktop: _isDesktop,
  setFieldValue,
  hasSession,
}: DetailsSectionProps) {
  const [activeDatePreset, setActiveDatePreset] = React.useState("");
  const [publisherInput, setPublisherInput] = React.useState("");
  const [seriesInput, setSeriesInput] = React.useState("");
  const [genreInput, setGenreInput] = React.useState("");

  const switchGridSx = {
    display: "grid",
    gap: 1,
    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr", xl: "1fr 1fr 1fr 1fr" },
  } as const;

  const publisherQuery = useAutocompleteQuery<FieldItem>({
    source: "publishers",
    variables: { pattern: publisherInput, us },
    searchText: publisherInput,
    minQueryLength: MIN_QUERY_LENGTH,
    debounceMs: 250,
  });

  const seriesQuery = useAutocompleteQuery<FieldItem>({
    source: "series",
    variables: {
      pattern: seriesInput,
      publisher: { name: "*", us },
    },
    searchText: seriesInput,
    minQueryLength: MIN_QUERY_LENGTH,
    debounceMs: 250,
  });

  const genreQuery = useAutocompleteQuery<string>({
    source: "genres",
    variables: { pattern: genreInput },
    searchText: genreInput,
    minQueryLength: GENRE_MIN_QUERY_LENGTH,
    debounceMs: 250,
  });

  const selectedGenres = React.useMemo(() => sanitizeGenreList(values.genres), [values.genres]);
  const genreOptions = React.useMemo(
    () =>
      sanitizeGenreList([
        ...selectedGenres,
        ...genreQuery.options.map((entry) => ({ name: String(entry || "") })),
      ]),
    [genreQuery.options, selectedGenres]
  );

  React.useEffect(() => {
    if (values.releasedateExact || (!values.releasedateFrom && !values.releasedateTo)) {
      setActiveDatePreset("");
    }
  }, [values.releasedateExact, values.releasedateFrom, values.releasedateTo]);

  return (
    <Stack spacing={1.5}>
      <Typography variant="h6">Allgemein</Typography>

      <AutocompleteBase
        options={FORMAT_OPTIONS}
        value={values.formats}
        label="Format"
        placeholder="Format auswählen"
        multiple
        getOptionLabel={(option) => String((option as { name?: unknown })?.name || "")}
        isOptionEqualToValue={(option, value) =>
          normalizeText(option.name) === normalizeText((value as { name?: unknown })?.name)
        }
        onChange={(_, nextValue) => {
          setFieldValue("formats", asFormatArray(nextValue));
        }}
      />

      <Divider sx={{ my: 0.25 }} />

      <Box
        sx={{
          display: "grid",
          alignItems: "end",
          gap: 1,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, minmax(160px, 1fr))",
          },
        }}
      >
        <ToggleButtonGroup
          exclusive
          value={activeDatePreset}
          onChange={(_, preset: string | null) => {
            if (!preset) {
              setActiveDatePreset("");
              return;
            }

            const range = getPresetDateRange(preset);
            if (!range) return;

            setActiveDatePreset(preset);
            setFieldValue("releasedateExact", "");
            setFieldValue("releasedateFrom", range.from);
            setFieldValue("releasedateTo", range.to);
          }}
          size="small"
          sx={{
            gridColumn: { xs: "1", sm: "1 / span 3" },
            flexWrap: "wrap",
            mb: 1.1,
            "& .MuiToggleButton-root": {
              textTransform: "none",
              px: 1,
              py: 0.35,
              fontSize: "0.75rem",
              backgroundColor: "background.paper",
              color: "text.primary",
              borderColor: "rgba(100, 116, 139, 0.35)",
              "&:hover": {
                backgroundColor: "action.hover",
              },
              "&.Mui-selected": {
                backgroundColor: "action.selected",
                color: "text.primary",
              },
              "&.Mui-selected:hover": {
                backgroundColor: "action.selected",
              },
            },
          }}
        >
          <ToggleButton value="nextYear">Nächstes Jahr</ToggleButton>
          <ToggleButton value="nextMonth">Nächster Monat</ToggleButton>
          <ToggleButton value="nextWeek">Nächste Woche</ToggleButton>
          <ToggleButton value="afterToday">Erscheint noch</ToggleButton>
          <ToggleButton value="untilToday">Bis Heute</ToggleButton>
          <ToggleButton value="thisWeek">Diese Woche</ToggleButton>
          <ToggleButton value="thisMonth">Dieser Monat</ToggleButton>
          <ToggleButton value="thisYear">Dieses Jahr</ToggleButton>
          <ToggleButton value="lastWeek">Letzte Woche</ToggleButton>
          <ToggleButton value="lastMonth">Letzter Monat</ToggleButton>
          <ToggleButton value="lastYear">Letztes Jahr</ToggleButton>
        </ToggleButtonGroup>

        <FastField
          name="releasedateFrom"
          label="Erscheinungsdatum von"
          type="date"
          InputLabelProps={{ shrink: true }}
          component={TextField}
          disabled={Boolean(values.releasedateExact)}
          sx={{
            width: "100%",
            "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "background.paper" },
          }}
        />
        <FastField
          name="releasedateTo"
          label="Erscheinungsdatum bis"
          type="date"
          InputLabelProps={{ shrink: true }}
          component={TextField}
          disabled={Boolean(values.releasedateExact)}
          sx={{
            width: "100%",
            "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "background.paper" },
          }}
        />
        <FastField
          name="releasedateExact"
          label="Exaktes Erscheinungsdatum"
          type="date"
          InputLabelProps={{ shrink: true }}
          component={TextField}
          disabled={Boolean(values.releasedateFrom) || Boolean(values.releasedateTo)}
          sx={{
            width: "100%",
            "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "background.paper" },
          }}
        />
      </Box>

      <Divider sx={{ my: 0.25 }} />

      <AutocompleteBase
        options={publisherQuery.options}
        value={sanitizeNameList(values.publishers)}
        inputValue={publisherInput}
        multiple
        label="Verlag"
        placeholder="Verlag suchen..."
        loading={publisherQuery.loading}
        noOptionsText={
          publisherQuery.isBelowMinLength
            ? `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`
            : publisherQuery.error
              ? "Daten aktuell nicht verfügbar"
              : "Keine Ergebnisse gefunden"
        }
        onListboxScroll={publisherQuery.onListboxScroll}
        getOptionLabel={(option) => String((option as { name?: unknown })?.name || "")}
        isOptionEqualToValue={(option, value) =>
          normalizeText(option.name) === normalizeText((value as { name?: unknown })?.name)
        }
        onInputChange={(_, nextInput, reason) => {
          if (reason !== "input" && reason !== "clear" && reason !== "reset") return;
          setPublisherInput(nextInput);
        }}
        onChange={(_, nextValue) => {
          setFieldValue("publishers", sanitizeNameList(asOptionArray(nextValue)));
          setPublisherInput("");
        }}
      />

      <AutocompleteBase
        options={seriesQuery.options}
        value={sanitizeTitleList(values.series)}
        inputValue={seriesInput}
        multiple
        label="Serie"
        placeholder="Serie suchen..."
        loading={seriesQuery.loading}
        noOptionsText={
          seriesQuery.isBelowMinLength
            ? `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`
            : seriesQuery.error
              ? "Daten aktuell nicht verfügbar"
              : "Keine Ergebnisse gefunden"
        }
        onListboxScroll={seriesQuery.onListboxScroll}
        getOptionLabel={(option) => formatSeriesLabel(option)}
        isOptionEqualToValue={(option, value) =>
          normalizeText(option.title) === normalizeText((value as { title?: unknown })?.title) &&
          normalizeText(String(option.volume || "")) ===
            normalizeText(String((value as { volume?: unknown })?.volume || ""))
        }
        onInputChange={(_, nextInput, reason) => {
          if (reason !== "input" && reason !== "clear" && reason !== "reset") return;
          setSeriesInput(nextInput);
        }}
        onChange={(_, nextValue) => {
          setFieldValue("series", sanitizeTitleList(asOptionArray(nextValue)));
          setSeriesInput("");
        }}
      />

      <AutocompleteBase
        options={genreOptions}
        value={selectedGenres}
        inputValue={genreInput}
        label="Genre"
        placeholder="Genre wählen oder eingeben..."
        multiple
        freeSolo
        loading={genreQuery.loading}
        noOptionsText={
          genreQuery.isBelowMinLength
            ? `Mindestens ${MIN_QUERY_LENGTH} Zeichen eingeben`
            : genreQuery.error
              ? "Daten aktuell nicht verfügbar"
              : "Keine Ergebnisse gefunden"
        }
        onListboxScroll={genreQuery.onListboxScroll}
        getOptionLabel={(option) => getGenreName(option)}
        isOptionEqualToValue={(option, value) =>
          normalizeText(getGenreName(option)) === normalizeText(getGenreName(value))
        }
        onInputChange={(_, nextInput, reason) => {
          if (reason !== "input" && reason !== "clear" && reason !== "reset") return;
          setGenreInput(nextInput);
        }}
        onChange={(_, nextValue) => {
          setFieldValue("genres", sanitizeGenreList(asGenreOptionArray(nextValue)));
          setGenreInput("");
        }}
      />

      <Box
        sx={{
          display: "grid",
          alignItems: "end",
          gap: 1,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(170px, 1fr))",
          },
        }}
      >
        <FastField
          name="numberFrom"
          label="Nummer von"
          component={TextField}
          disabled={Boolean(values.numberExact)}
          sx={{
            width: "100%",
            "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "background.paper" },
          }}
        />
        <FastField
          name="numberTo"
          label="Nummer bis"
          component={TextField}
          disabled={Boolean(values.numberExact)}
          sx={{
            width: "100%",
            "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "background.paper" },
          }}
        />
        <FastField
          name="numberExact"
          label="Exakte Nummer(n)"
          helperText="Mehrere Werte mit Komma trennen, z.B. 1, 1A, Annual 1"
          component={TextField}
          disabled={Boolean(values.numberFrom) || Boolean(values.numberTo)}
          sx={{
            width: "100%",
            "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "background.paper" },
            gridColumn: { xs: "1", sm: "1 / span 2" },
          }}
        />
      </Box>

      {hasSession ? (
        <>
          <Divider sx={{ my: 0.25 }} />
          <Box sx={switchGridSx}>
            <FilterSwitch
              checked={values.withVariants}
              label="Mit Varianten"
              onToggle={() => setFieldValue("withVariants", !values.withVariants)}
            />
            <FilterSwitch
              checked={values.noComicguideId}
              label="Ohne Comicguide ID"
              onToggle={() => setFieldValue("noComicguideId", !values.noComicguideId)}
            />
            <FilterSwitch
              checked={values.noContent}
              label="Ohne Inhalt"
              onToggle={() => setFieldValue("noContent", !values.noContent)}
            />
            <FilterSwitch
              checked={values.onlyCollected}
              label="Nur in Sammlung"
              disabled={values.onlyNotCollected || values.onlyNotCollectedNoOwnedVariants}
              onToggle={() => {
                const next = !values.onlyCollected;
                setFieldValue("onlyCollected", next);
                if (next) {
                  setFieldValue("onlyNotCollected", false);
                  setFieldValue("onlyNotCollectedNoOwnedVariants", false);
                }
              }}
            />
            <FilterSwitch
              checked={values.onlyNotCollected}
              label="Nur nicht in Sammlung"
              disabled={values.onlyCollected || values.onlyNotCollectedNoOwnedVariants}
              onToggle={() => {
                const next = !values.onlyNotCollected;
                setFieldValue("onlyNotCollected", next);
                if (next) {
                  setFieldValue("onlyCollected", false);
                  setFieldValue("onlyNotCollectedNoOwnedVariants", false);
                }
              }}
            />
            <FilterSwitch
              checked={values.onlyNotCollectedNoOwnedVariants}
              label="Nur nicht in Sammlung (ohne Variants)"
              disabled={values.onlyCollected || values.onlyNotCollected}
              onToggle={() => {
                const next = !values.onlyNotCollectedNoOwnedVariants;
                setFieldValue("onlyNotCollectedNoOwnedVariants", next);
                if (next) {
                  setFieldValue("onlyCollected", false);
                  setFieldValue("onlyNotCollected", false);
                }
              }}
            />
          </Box>
        </>
      ) : null}
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

function asGenreOptionArray(value: unknown): Array<string | FieldItem> {
  if (!Array.isArray(value)) {
    if (typeof value === "string") return [value];
    if (value && typeof value === "object" && !Array.isArray(value)) return [value as FieldItem];
    return [];
  }

  return value.filter(
    (entry): entry is string | FieldItem =>
      typeof entry === "string" ||
      (Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
  );
}

function asFormatArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const name = String((entry as { name?: unknown }).name || "").trim();
      if (!name) return null;
      return { name };
    })
    .filter((entry): entry is { name: string } => Boolean(entry));
}

function sanitizeNameList(values: FieldItem[]) {
  return values.filter((entry) => !entry.pattern && normalizeText(entry.name).length > 0);
}

function sanitizeTitleList(values: FieldItem[]) {
  return values.filter(
    (entry) =>
      !entry.pattern &&
      normalizeText(entry.title).length > 0 &&
      Number.isFinite(Number(entry.volume))
  );
}

function sanitizeGenreList(values: Array<string | FieldItem>) {
  const unique = new Map<string, { name: string }>();

  values.forEach((entry) => {
    const name = getGenreName(entry).trim();
    if (!name) return;

    const key = normalizeText(name);
    if (!unique.has(key)) unique.set(key, { name });
  });

  return [...unique.values()];
}

function getGenreName(entry: unknown) {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    return String((entry as { name?: unknown }).name || "");
  }
  return "";
}

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export default DetailsSection;

function formatSeriesLabel(entry: unknown) {
  const option = entry as { title?: unknown; volume?: unknown; startyear?: unknown };
  return getSeriesLabel({
    title: String(option?.title || ""),
    volume: option?.volume as string | number | null | undefined,
    startyear: option?.startyear as string | number | null | undefined,
  });
}

function getPresetDateRange(preset: string): { from: string; to: string } | null {
  const now = new Date();

  if (preset === "thisYear") {
    return {
      from: formatDateInput(new Date(now.getFullYear(), 0, 1)),
      to: formatDateInput(new Date(now.getFullYear(), 11, 31)),
    };
  }

  if (preset === "thisMonth") {
    return {
      from: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }

  if (preset === "thisWeek") {
    const { from, to } = getWeekRange(now);
    return { from: formatDateInput(from), to: formatDateInput(to) };
  }

  if (preset === "lastYear") {
    const year = now.getFullYear() - 1;
    return {
      from: formatDateInput(new Date(year, 0, 1)),
      to: formatDateInput(new Date(year, 11, 31)),
    };
  }

  if (preset === "lastMonth") {
    return {
      from: formatDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }

  if (preset === "lastWeek") {
    const oneWeekEarlier = new Date(now);
    oneWeekEarlier.setDate(oneWeekEarlier.getDate() - 7);
    const { from, to } = getWeekRange(oneWeekEarlier);
    return { from: formatDateInput(from), to: formatDateInput(to) };
  }

  if (preset === "untilToday") {
    return {
      from: "",
      to: formatDateInput(now),
    };
  }

  if (preset === "afterToday") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      from: formatDateInput(tomorrow),
      to: "",
    };
  }

  if (preset === "nextYear") {
    const year = now.getFullYear() + 1;
    return {
      from: formatDateInput(new Date(year, 0, 1)),
      to: formatDateInput(new Date(year, 11, 31)),
    };
  }

  if (preset === "nextMonth") {
    return {
      from: formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
      to: formatDateInput(new Date(now.getFullYear(), now.getMonth() + 2, 0)),
    };
  }

  if (preset === "nextWeek") {
    const oneWeekLater = new Date(now);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    const { from, to } = getWeekRange(oneWeekLater);
    return { from: formatDateInput(from), to: formatDateInput(to) };
  }

  return null;
}

function getWeekRange(date: Date): { from: Date; to: Date } {
  const from = new Date(date);
  const day = from.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  from.setDate(from.getDate() + diffToMonday);
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
