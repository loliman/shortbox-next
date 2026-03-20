import React from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Stories } from "../IssueEditorSections";
import type { IssueEditorFormValues } from "./types";

interface IssueEditorRelationsProps {
  values: IssueEditorFormValues;
  isDesktop?: boolean;
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  showHints?: boolean;
}

const STORIES_HINT = "Hinweis: Geschichten werden vererbt. Für Variants leer lassen.";

function IssueEditorRelations({
  values,
  isDesktop,
  setFieldValue,
  showHints = true,
}: IssueEditorRelationsProps) {
  return (
    <Stack spacing={2}>
      {showHints ? (
        <Typography variant="body2" color="text.secondary">
          {STORIES_HINT}
        </Typography>
      ) : null}

      <Stories
        setFieldValue={setFieldValue}
        items={values.stories}
        isDesktop={isDesktop}
        values={values}
        us={values.series.publisher.us}
      />
    </Stack>
  );
}

export default IssueEditorRelations;
