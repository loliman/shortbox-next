import React from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import type { ContainsProps, FieldItem } from "./types";
import TypedRoleAutocomplete from "./TypedRoleAutocomplete";

interface StoryFieldsExclusiveProps extends ContainsProps {
  index?: number;
  values?: Record<string, unknown> & { stories?: FieldItem[] };
}

interface TypedField {
  type: string;
  label: string;
  queryType?: string;
}

const individualFields: TypedField[] = [
  { type: "WRITER", label: "Autor" },
  { type: "PENCILER", label: "Zeichner" },
  { type: "INKER", label: "Inker" },
  { type: "COLORIST", label: "Kolorist" },
  { type: "LETTERER", label: "Letterer" },
  { type: "EDITOR", label: "Verleger" },
];

const appearanceFields: TypedField[] = [
  { type: "FEATURED", label: "Hauptcharaktere", queryType: "CHARACTER" },
  { type: "ANTAGONIST", label: "Antagonisten", queryType: "CHARACTER" },
  { type: "SUPPORTING", label: "Unterstützende Charaktere", queryType: "CHARACTER" },
  { type: "OTHER", label: "Andere Charaktere", queryType: "CHARACTER" },
  { type: "GROUP", label: "Teams", queryType: "GROUP" },
  { type: "RACE", label: "Rassen", queryType: "RACE" },
  { type: "ANIMAL", label: "Tiere", queryType: "ANIMAL" },
  { type: "ITEM", label: "Gegenstände", queryType: "ITEM" },
  { type: "VEHICLE", label: "Fahrzeuge", queryType: "VEHICLE" },
  { type: "LOCATION", label: "Orte", queryType: "LOCATION" },
];

function StoryFieldsExclusive(props: Readonly<StoryFieldsExclusiveProps>) {
  const index = Number.isInteger(props.index) ? (props.index as number) : 0;
  const values = props.values ?? {};
  const setFieldValue = props.setFieldValue ?? (() => undefined);
  const stories = values.stories ?? [];
  const item = stories[index] ?? {};
  const storyIndividuals = (item.individuals as FieldItem[]) ?? [];
  const storyAppearances = (item.appearances as FieldItem[]) ?? [];

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Typography variant="subtitle2" color="text.secondary">
          Kreative
        </Typography>
      </Grid>
      {individualFields.map((field) => (
        <Grid size={{ xs: 12, md: 6 }} key={field.type}>
          <TypedRoleAutocomplete
            source="individuals"
            field={`stories[${index}].individuals`}
            label={field.label}
            type={field.type}
            values={storyIndividuals}
            setFieldValue={setFieldValue}
            disabled={props.disabled}
          />
        </Grid>
      ))}

      <Grid size={12} sx={{ pt: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Auftritte
        </Typography>
      </Grid>
      {appearanceFields.map((field) => (
        <Grid size={{ xs: 12, md: 6 }} key={field.type}>
          <TypedRoleAutocomplete
            source="apps"
            field={`stories[${index}].appearances`}
            label={field.label}
            type={field.type}
            values={storyAppearances}
            setFieldValue={setFieldValue}
            disabled={props.disabled}
            variables={{
              type: field.queryType ?? field.type,
            }}
          />
        </Grid>
      ))}
    </Grid>
  );
}

export default StoryFieldsExclusive;
