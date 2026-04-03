import React from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Stories } from "../IssueEditorSections";
import type { IssueEditorFormValues } from "./types";
import type { SessionData } from "../../../../types/session";

interface IssueEditorRelationsProps {
  values: IssueEditorFormValues;
  isDesktop?: boolean;
  session?: SessionData | null;
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  showHints?: boolean;
  lockedFields?: {
    stories?: boolean;
  };
}

const STORIES_HINT = "Hinweis: Geschichten werden vererbt. Für Variants leer lassen.";

function IssueEditorRelations({
  values,
  isDesktop,
  session,
  setFieldValue,
  showHints = true,
  lockedFields,
}: Readonly<IssueEditorRelationsProps>) {
  const storiesLocked = Boolean(lockedFields?.stories);
  const canUseStoryImport = Boolean(session?.loggedIn && session?.canAdmin);

  return (
    <Stack spacing={2}>
      {showHints ? (
        <Typography variant="body2" color="text.secondary">
          {storiesLocked
            ? "Hinweis: Geschichten werden von der Story-Owner-Ausgabe geerbt und können nur dort bearbeitet werden."
            : STORIES_HINT}
        </Typography>
      ) : null}

      <Stories
        setFieldValue={setFieldValue}
        items={values.stories}
        isDesktop={isDesktop}
        values={values}
        us={values.series.publisher.us}
        disabled={storiesLocked}
        canUseStoryImport={canUseStoryImport}
      />
    </Stack>
  );
}

export default IssueEditorRelations;
