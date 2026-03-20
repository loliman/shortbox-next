import React from "react";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import IssueEditorActions from "./IssueEditorActions";
import IssueEditorIdentifiersFields from "./IssueEditorIdentifiersFields";
import IssueEditorMetadataFields from "./IssueEditorMetadataFields";
import IssueEditorRelations from "./IssueEditorRelations";
import IssueEditorSeriesFields from "./IssueEditorSeriesFields";
import type { IssueEditorFormContentProps } from "./types";
import { editorSectionSx } from "../editorLayout";
import TitleLine from "../../../generic/TitleLine";

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
    <>
      <CardHeader
        title={<TitleLine title={header} id={id} session={session} />}
        action={
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
      />

      <CardContent
        sx={(theme) => ({
          pt: 1,
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
      >
        <Stack spacing={2.25}>
          {notice ? (
            <Paper elevation={0} sx={editorSectionSx}>
              {notice}
            </Paper>
          ) : null}
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
            />
          </IssueEditorSection>

          <Paper
            elevation={0}
            sx={(theme) => ({
              ...editorSectionSx(theme),
              position: "sticky",
              bottom: 0,
              zIndex: theme.zIndex.appBar - 1,
              p: "12px 16px",
              backgroundColor: `var(--surface-1, ${theme.palette.background.default})`,
              borderTop: `1px solid var(--border-subtle, ${theme.palette.divider})`,
            })}
          >
            {actions || (
              <IssueEditorActions
                isSubmitting={isSubmitting}
                submitLabel={submitLabel}
                submitAndCopyLabel={submitAndCopyLabel}
                resetForm={resetForm}
                onCancel={onCancel}
                onSubmitMode={onSubmitMode}
              />
            )}
          </Paper>
        </Stack>
      </CardContent>
    </>
  );
}

interface IssueEditorSectionProps {
  title: string;
  children: React.ReactNode;
}

function IssueEditorSection({ title, children }: Readonly<IssueEditorSectionProps>) {
  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        ...editorSectionSx(theme),
        mt: 3.5,
        p: "20px",
        borderRadius: "10px",
        backgroundColor: `var(--surface-1, ${theme.palette.background.default})`,
        boxShadow: "none",
      })}
    >
      <Stack spacing={2}>
        <Typography
          sx={{
            fontSize: "14px",
            fontWeight: 600,
            letterSpacing: "0.02em",
            mb: 1.5,
          }}
        >
          {title}
        </Typography>
        {children}
      </Stack>
    </Paper>
  );
}

export default IssueEditorFormContent;
