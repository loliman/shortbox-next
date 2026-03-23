import React from "react";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import IssueEditorActions from "./IssueEditorActions";
import IssueEditorIdentifiersFields from "./IssueEditorIdentifiersFields";
import IssueEditorMetadataFields from "./IssueEditorMetadataFields";
import IssueEditorRelations from "./IssueEditorRelations";
import IssueEditorSeriesFields from "./IssueEditorSeriesFields";
import type { IssueEditorFormContentProps } from "./types";
import TitleLine from "../../../generic/TitleLine";
import FormPageShell from "../../../form-shell/FormPageShell";
import FormSection from "../../../form-shell/FormSection";

function IssueEditorFormContent(props: IssueEditorFormContentProps) {
  const {
    values,
    edit,
    isDesktop,
    id,
    session,
    header,
    submitLabel,
    submitAndCopyLabel,
    isSubmitting,
    setFieldValue,
    resetForm,
    onToggleUs,
    onCancel,
    onSubmitMode,
    notice,
    actions,
    showHints = true,
    lockedFields,
  } = props;

  return (
    <FormPageShell
      title={<TitleLine title={header} id={id} session={session} />}
      headerAction={
        <FormControlLabel
          sx={{ m: 0 }}
          control={
            <Tooltip title={(values.series.publisher.us ? "Deutsche" : "US") + " Ausgabe"}>
              <Switch
                disabled={edit}
                checked={values.series.publisher.us}
                onChange={() => {
                  onToggleUs();
                  resetForm();
                }}
                color="secondary"
              />
            </Tooltip>
          }
          label="US"
        />
      }
      notice={notice}
      contentSx={(theme) => ({
        "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: `var(--border-strong, ${theme.palette.text.secondary})`,
        },
        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: `var(--accent, ${theme.palette.primary.main})`,
        },
        "& .MuiOutlinedInput-root.Mui-focused": {
          boxShadow: "0 0 0 2px rgba(80,120,255,0.25)",
        },
      })}
      actions={
        actions || (
          <IssueEditorActions
            isSubmitting={isSubmitting}
            submitLabel={submitLabel}
            submitAndCopyLabel={submitAndCopyLabel}
            resetForm={resetForm}
            onCancel={onCancel}
            onSubmitMode={onSubmitMode}
          />
        )
      }
    >
      <IssueEditorSection title="Basisdaten">
        <IssueEditorSeriesFields
          values={values}
          isDesktop={isDesktop}
          setFieldValue={setFieldValue}
          showHints={showHints}
          lockedFields={lockedFields}
        />
      </IssueEditorSection>

      <IssueEditorSection title="Metadaten">
        <IssueEditorMetadataFields
          values={values}
          isDesktop={isDesktop}
          setFieldValue={setFieldValue}
          lockedFields={lockedFields}
        />
      </IssueEditorSection>

      <IssueEditorSection title="Kennungen und Beschreibung">
        <IssueEditorIdentifiersFields values={values} isDesktop={isDesktop} />
      </IssueEditorSection>

      <IssueEditorSection title="Geschichten">
        <IssueEditorRelations
          values={values}
          isDesktop={isDesktop}
          setFieldValue={setFieldValue}
          showHints={showHints}
          lockedFields={lockedFields}
        />
      </IssueEditorSection>
    </FormPageShell>
  );
}

interface IssueEditorSectionProps {
  title: string;
  children: React.ReactNode;
}

function IssueEditorSection({ title, children }: Readonly<IssueEditorSectionProps>) {
  return <FormSection title={title}>{children}</FormSection>;
}

export default IssueEditorFormContent;
