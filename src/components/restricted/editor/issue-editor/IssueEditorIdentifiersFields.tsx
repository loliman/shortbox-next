import React from "react";
import Grid from "@mui/material/Grid";
import { FastField } from "formik";
import { TextField } from "../../../generic/FormikTextField";
import type { IssueEditorFormValues } from "./types";

interface IssueEditorIdentifiersFieldsProps {
  values: IssueEditorFormValues;
  isDesktop?: boolean;
}

function IssueEditorIdentifiersFields({
  values,
}: IssueEditorIdentifiersFieldsProps) {
  return (
    <Grid container spacing={2}>
      {!values.series.publisher.us ? (
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <FastField
            name="comicguideid"
            label="Comicguide ID"
            type="number"
            component={TextField}
            fullWidth
          />
        </Grid>
      ) : null}

      {!values.series.publisher.us ? (
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <FastField name="isbn" label="ISBN" type="string" component={TextField} fullWidth />
        </Grid>
      ) : null}

      <Grid size={12}>
        <FastField
          name="addinfo"
          label="Weitere Informationen"
          multiline
          rows={8}
          component={TextField}
          fullWidth
        />
      </Grid>
    </Grid>
  );
}

export default IssueEditorIdentifiersFields;
