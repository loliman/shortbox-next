import { generateLabel } from "../../../../lib/routes/hierarchy";
import type { SelectedRoot } from "../../../../types/domain";
import type { IssueEditorProps, IssueEditorState, IssueEditorFormValues } from "./types";

export function buildIssueEditorState(
  props: Pick<IssueEditorProps, "edit" | "copy">,
  defaultValues: IssueEditorFormValues
): IssueEditorState {
  const issueLabel = generateLabel({
    issue: defaultValues as unknown as SelectedRoot["issue"],
    us: defaultValues.series.publisher.us,
  });
  let header = "Ausgabe erstellen";
  if (props.edit) {
    header = issueLabel + " bearbeiten";
  } else if (props.copy) {
    header = issueLabel + " kopieren";
  }
  let successMessage = " erfolgreich erstellt";
  if (props.edit) {
    successMessage = " erfolgreich gespeichert";
  } else if (props.copy) {
    successMessage = " erfolgreich kopiert";
  }
  let errorMessage = "Ausgabe konnte nicht erstellt werden";
  if (props.edit) {
    errorMessage = issueLabel + " konnte nicht gespeichert werden";
  } else if (props.copy) {
    errorMessage = " konnte nicht kopiert werden";
  }

  return {
    defaultValues,
    header,
    submitLabel: "Fertig",
    submitAndCopyLabel: "Fertig und kopieren",
    successMessage,
    errorMessage,
    copy: Boolean(props.copy),
  };
}
