import { generateLabel } from "../../../../util/hierarchy";
import type { IssueEditorProps, IssueEditorState, IssueEditorFormValues } from "./types";

export function buildIssueEditorState(
  props: Pick<IssueEditorProps, "edit" | "copy">,
  defaultValues: IssueEditorFormValues
): IssueEditorState {
  const issueLabel = generateLabel({ issue: defaultValues, us: defaultValues.series.publisher.us } as any);

  return {
    defaultValues,
    header: props.edit
      ? issueLabel + " bearbeiten"
      : props.copy
        ? issueLabel + " kopieren"
        : "Ausgabe erstellen",
    submitLabel: "Fertig",
    submitAndCopyLabel: "Fertig und kopieren",
    successMessage: props.edit
      ? " erfolgreich gespeichert"
      : props.copy
        ? " erfolgreich kopiert"
        : " erfolgreich erstellt",
    errorMessage: props.edit
      ? issueLabel + " konnte nicht gespeichert werden"
      : props.copy
        ? " konnte nicht kopiert werden"
        : "Ausgabe konnte nicht erstellt werden",
    copy: Boolean(props.copy),
  };
}
