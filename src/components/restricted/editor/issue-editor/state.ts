import { generateLabel } from "../../../../util/hierarchy";
import type { SelectedRoot } from "../../../../types/domain";
import type { IssueEditorProps, IssueEditorState, IssueEditorFormValues } from "./types";

export function buildIssueEditorState(
  props: Pick<IssueEditorProps, "edit" | "copy">,
  defaultValues: IssueEditorFormValues
): IssueEditorState {
  return {
    defaultValues,
    header: props.edit
      ? generateLabel(defaultValues as unknown as SelectedRoot) + " bearbeiten"
      : props.copy
        ? generateLabel(defaultValues as unknown as SelectedRoot) + " kopieren"
        : "Ausgabe erstellen",
    submitLabel: "Fertig",
    submitAndCopyLabel: "Fertig und kopieren",
    successMessage: props.edit
      ? " erfolgreich gespeichert"
      : props.copy
        ? " erfolgreich kopiert"
        : " erfolgreich erstellt",
    errorMessage: props.edit
      ? generateLabel(defaultValues as unknown as SelectedRoot) + " konnte nicht gespeichert werden"
      : props.copy
        ? " konnte nicht kopiert werden"
        : "Ausgabe konnte nicht erstellt werden",
    copy: Boolean(props.copy),
  };
}
