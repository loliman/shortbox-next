"use client";

import React from "react";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { bundleItemDefault, ensureFieldItemClientId } from "./defaults";
import type { IssueEditorFormValues } from "../issue-editor/types";

const MIN_QUERY_LENGTH = 2;

export interface FormBundleItem {
  id?: string | number | null;
  uuid?: string;
  rawTitle?: string;
  addInfo?: string;
  addinfo?: string;
  position: number;
  containedIssue?: {
    series: {
      title: string;
      volume: number | string;
      publisher: {
        name: string;
        us: boolean;
      };
    };
    number: string;
  } | null;
}

interface BundleItemsProps {
  values: IssueEditorFormValues;
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  isDesktop?: boolean;
}

export default function BundleItems({ values, setFieldValue }: Readonly<BundleItemsProps>) {
  const items = Array.isArray(values.bundleItems) ? (values.bundleItems as FormBundleItem[]) : [];

  const handleAdd = () => {
    const nextItem = ensureFieldItemClientId({
      ...bundleItemDefault,
      position: items.length + 1,
    });
    setFieldValue("bundleItems", [...items, nextItem], true);
  };

  const handleDelete = (index: number) => {
    const nextItems = items.filter((_, idx) => idx !== index).map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));
    setFieldValue("bundleItems", nextItems, true);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    if (!moved) return;
    nextItems.splice(index - 1, 0, moved);
    const reordered = nextItems.map((item, idx) => ({ ...item, position: idx + 1 }));
    setFieldValue("bundleItems", reordered, true);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    if (!moved) return;
    nextItems.splice(index + 1, 0, moved);
    const reordered = nextItems.map((item, idx) => ({ ...item, position: idx + 1 }));
    setFieldValue("bundleItems", reordered, true);
  };

  return (
    <Stack spacing={2}>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", py: 1 }}>
          Noch keine enthaltenen Hefte hinzugefügt. Dieses Heft verhält sich momentan wie eine Einzelpublikation.
        </Typography>
      ) : null}

      {items.map((item, index) => (
        <BundleItemRow
          key={item.id || item.uuid || index}
          item={item}
          index={index}
          isFirst={index === 0}
          isLast={index === items.length - 1}
          setFieldValue={setFieldValue}
          onDelete={() => handleDelete(index)}
          onMoveUp={() => handleMoveUp(index)}
          onMoveDown={() => handleMoveDown(index)}
        />
      ))}

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          size="small"
        >
          Heft hinzufügen
        </Button>
      </Box>
    </Stack>
  );
}

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { FastField } from "formik";
import AutocompleteBase from "../../../generic/AutocompleteBase";
import { useAutocompleteQuery } from "../../../generic/useAutocompleteQuery";
import { TextField } from "../../../generic/FormikTextField";
import { getSeriesOptionKey } from "../../../generic/autocompleteOptionKeys";

interface AutocompleteSeries {
  id?: string;
  title?: string;
  volume?: number | string;
  startYear?: number;
  publisher?: {
    id?: string;
    name?: string;
    us?: boolean;
  } | null;
}

function normalizeText(val: unknown): string {
  if (typeof val === "string") return val.trim();
  if (typeof val === "number") return String(val).trim();
  return "";
}

function readTextValue(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  return "";
}

interface BundleItemRowProps {
  item: FormBundleItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function BundleItemRow({
  item,
  index,
  isFirst,
  isLast,
  setFieldValue,
  onDelete,
  onMoveUp,
  onMoveDown,
}: Readonly<BundleItemRowProps>) {
  const isLinked = item.containedIssue !== null;

  const handleToggleLinked = (checked: boolean) => {
    if (checked) {
      setFieldValue(`bundleItems[${index}].containedIssue`, {
        series: {
          title: "",
          volume: 1,
          publisher: {
            name: "",
            us: false,
          },
        },
        number: "",
      });
      setFieldValue(`bundleItems[${index}].rawTitle`, "");
    } else {
      setFieldValue(`bundleItems[${index}].containedIssue`, null);
    }
  };

  const parentSeries = item.containedIssue?.series ?? {};
  const seriesPattern = readTextValue(parentSeries.title);

  const seriesQuery = useAutocompleteQuery<AutocompleteSeries>({
    source: "series",
    variables: {
      pattern: seriesPattern,
      publisher: { name: "*", us: false },
    },
    searchText: seriesPattern,
    minQueryLength: MIN_QUERY_LENGTH,
    debounceMs: 250,
  });

  const currentSeriesValue =
    seriesQuery.options.find(
      (entry) =>
        normalizeText(entry.title) === normalizeText(parentSeries.title) &&
        normalizeText(readTextValue(entry.volume)) === normalizeText(readTextValue(parentSeries.volume))
    ) ??
    (seriesPattern.trim().length > 0
      ? {
          title: parentSeries.title,
          volume: parentSeries.volume,
          publisher: parentSeries.publisher,
        }
      : null);

  const formatSeriesLabel = (opt: AutocompleteSeries | null | undefined): string => {
    if (!opt) return "";
    const pName = opt.publisher?.name || "";
    const volStr = opt.volume ? ` (Vol. ${opt.volume})` : "";
    const yearStr = opt.startYear ? ` [${opt.startYear}]` : "";
    return [pName, opt.title ? `${opt.title}${volStr}${yearStr}` : ""].filter(Boolean).join(" :: ");
  };

  const getSeriesKey = (opt: AutocompleteSeries | null | undefined): string => {
    if (!opt) return "";
    const pName = opt.publisher?.name || "";
    return `${pName}::${opt.title || ""}::${opt.volume || 0}`;
  };


  return (
    <Card variant="outlined" sx={{ position: "relative", bgcolor: "background.paper" }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Heft #{item.position}
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton size="small" onClick={onMoveUp} disabled={isFirst}>
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={onMoveDown} disabled={isLast}>
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={onDelete}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid size={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={isLinked}
                  onChange={(e) => handleToggleLinked(e.target.checked)}
                  size="small"
                />
              }
              label="Aus der Datenbank verknüpfen"
            />
          </Grid>

          {isLinked ? (
            <>
              <Grid size={{ xs: 12, md: 8 }}>
                <AutocompleteBase
                  id={`bundleItems.${index}.containedIssue.series.title`}
                  options={seriesQuery.options}
                  value={currentSeriesValue}
                  inputValue={seriesPattern}
                  label="Deutsche Serie"
                  placeholder="Deutsche Serie suchen..."
                  freeSolo
                  loading={seriesQuery.loading}
                  onInputChange={(_, inputValue, reason) => {
                    if (reason !== "input" && reason !== "clear") return;
                    setFieldValue(`bundleItems[${index}].containedIssue.series.title`, inputValue);
                  }}
                  onChange={(_, option) => {
                    const selectedOption = Array.isArray(option) ? (option[0] ?? null) : option;
                    if (selectedOption && typeof selectedOption === "object") {
                      setFieldValue(`bundleItems[${index}].containedIssue.series`, {
                        title: selectedOption.title || "",
                        volume: selectedOption.volume || 1,
                        publisher: {
                          name: selectedOption.publisher?.name || "",
                          us: false,
                        },
                      });
                    } else {
                      setFieldValue(`bundleItems[${index}].containedIssue.series`, {
                        title: typeof selectedOption === "string" ? selectedOption : "",
                        volume: 1,
                        publisher: {
                          name: "",
                          us: false,
                        },
                      });
                    }
                  }}
                  getOptionLabel={(option) => formatSeriesLabel(option)}
                  getOptionKey={(option) => getSeriesOptionKey(option)}
                  isOptionEqualToValue={(option, value) =>
                    normalizeText(getSeriesKey(option)) ===
                    normalizeText(typeof value === "string" ? value : getSeriesKey(value))
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FastField
                  name={`bundleItems[${index}].containedIssue.number`}
                  label="Heftnummer"
                  component={TextField}
                  fullWidth
                />
              </Grid>
            </>
          ) : (
            <Grid size={12}>
              <FastField
                name={`bundleItems[${index}].rawTitle`}
                label="Heft-Beschreibung / Titel (Freitext)"
                placeholder="z. B. Hit Comics (Die Spinne) #241"
                component={TextField}
                fullWidth
              />
            </Grid>
          )}

          <Grid size={12}>
            <FastField
              name={`bundleItems[${index}].addInfo`}
              label="Zusatzinformationen"
              placeholder="z. B. enthält Seiten 3-24, 45-68"
              component={TextField}
              fullWidth
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
