import React from "react";
import Grid from "@mui/material/Grid";
import { FastField } from "formik";
import { TextField } from "../../../generic/FormikTextField";
import ExclusiveToggle from "./ExclusiveToggle";
import StoryFieldsExclusive from "./StoryFieldsExclusive";
import StoryFieldsNonExclusive from "./StoryFieldsNonExclusive";
import type { ContainsProps, FieldItem } from "./types";

interface StoryFieldsProps extends ContainsProps {
  index?: number;
  values?: Record<string, unknown> & { stories?: FieldItem[] };
  items?: FieldItem[];
}

function StoryFields(props: Readonly<StoryFieldsProps>) {
  const index = Number.isInteger(props.index) ? Number(props.index) : 0;
  const stories = props.items || [];
  const item = stories[index] || {};
  const isExclusive = Boolean(item.exclusive) || Boolean(props.us);
  const canToggleExclusive = props.us !== true;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 3, md: 2 }}>
        <FastField
          name={`stories[${index}].number`}
          disabled={props.disabled}
          label="#"
          type="number"
          component={TextField}
          fullWidth
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 9, md: 4 }}>
        <FastField
          name={`stories[${index}].title`}
          disabled={props.disabled}
          label="Titel"
          component={TextField}
          fullWidth
        />
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <FastField
          name={`stories[${index}].addinfo`}
          disabled={props.disabled}
          label="Weitere Informationen"
          component={TextField}
          fullWidth
        />
      </Grid>

      <Grid size={{ xs: 6, sm: 3, md: 2 }}>
        <FastField
          name={`stories[${index}].part`}
          disabled={props.disabled}
          label="Teil"
          component={TextField}
          fullWidth
        />
      </Grid>

      {canToggleExclusive ? (
        <Grid size={12}>
          <ExclusiveToggle {...props} type="stories" index={index} />
        </Grid>
      ) : null}

      <Grid size={12}>
        {isExclusive ? (
          <StoryFieldsExclusive {...props} index={index} />
        ) : (
          <StoryFieldsNonExclusive {...props} index={index} />
        )}
      </Grid>
    </Grid>
  );
}

export default StoryFields;
