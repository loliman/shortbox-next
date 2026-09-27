"use client";

import React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import { Form, Formik } from "formik";
import { IssueSchema } from "../../util/yupSchema";
import IssueEditorFormContent from "../restricted/editor/issue-editor/IssueEditorFormContent";
import { normalizeIssueEditorValues } from "../restricted/editor/issue-editor/defaultValues";
import { createEmptyIssueValues } from "../restricted/editor/issue-editor/constants";
import {
  buildTouchedFromErrors,
  findFirstErrorPath,
  focusEditorErrorField,
} from "../restricted/editor/issue-editor/validationFeedback";
import type { StagedPreviewDraft } from "../../types/preview-import";
import type { IssueEditorFormValues } from "../restricted/editor/issue-editor/types";
import type { SessionData } from "../../types/session";

interface DraftEditDialogProps {
  open: boolean;
  draft: StagedPreviewDraft | null;
  session?: SessionData | null;
  onClose: () => void;
  onSave: (draftId: string, updatedValues: Partial<IssueEditorFormValues>) => Promise<void>;
}

function buildInitialDraftValues(draft: StagedPreviewDraft | null): IssueEditorFormValues {
  if (!draft) return createEmptyIssueValues();

  const defaults = createEmptyIssueValues();
  const rawValues = draft.rawDraft?.values || {};

  const merged: IssueEditorFormValues = {
    ...defaults,
    ...rawValues,
    title: rawValues.title ?? draft.issue.title ?? "",
    number: String(rawValues.number ?? draft.issue.number ?? ""),
    variant: rawValues.variant ?? draft.issue.variant ?? "",
    format: rawValues.format ?? draft.issue.format ?? defaults.format,
    releasedate: rawValues.releasedate ?? draft.issue.releasedate ?? defaults.releasedate,
    price:
      rawValues.price != null && rawValues.price !== ""
        ? String(rawValues.price)
        : draft.issue.price != null
        ? String(draft.issue.price)
        : defaults.price,
    currency: rawValues.currency ?? draft.issue.currency ?? defaults.currency,
    pages:
      rawValues.pages != null ? rawValues.pages : draft.issue.pages != null ? draft.issue.pages : defaults.pages,
    limitation: rawValues.limitation ?? draft.issue.limitation ?? defaults.limitation,
    addinfo: rawValues.addinfo ?? draft.issue.addinfo ?? defaults.addinfo,
    isbn: rawValues.isbn ?? "",
    series: {
      ...defaults.series,
      ...rawValues.series,
      title: rawValues.series?.title || draft.series.title || "",
      volume: rawValues.series?.volume || draft.series.volume || 1,
      publisher: {
        ...defaults.series.publisher,
        ...rawValues.series?.publisher,
        name: rawValues.series?.publisher?.name || draft.series.publisherName || "Panini Comics",
        us: Boolean(rawValues.series?.publisher?.us),
      },
    },
    stories: Array.isArray(rawValues.stories) ? rawValues.stories : [],
  };

  return normalizeIssueEditorValues(merged);
}

export function DraftEditDialog({
  open,
  draft,
  session,
  onClose,
  onSave,
}: Readonly<DraftEditDialogProps>) {
  const [formValues, setFormValues] = React.useState<IssueEditorFormValues>(() =>
    buildInitialDraftValues(draft)
  );
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFormValues(buildInitialDraftValues(draft));
    setValidationMessage(null);
  }, [draft]);

  const toggleUs = React.useCallback(() => {
    setFormValues((prevState) => ({
      ...prevState,
      series: {
        ...prevState.series,
        publisher: {
          ...prevState.series.publisher,
          us: !prevState.series.publisher.us,
        },
      },
    }));
  }, []);

  const dialogTitle = draft?.sourceTitle
    ? `Entwurf bearbeiten: ${draft.sourceTitle}`
    : "Entwurf bearbeiten";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          maxHeight: "92vh",
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1.5,
          px: 3,
        }}
      >
        <Box>
          <Typography variant="h6" component="div">
            {dialogTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {draft?.issueCode ? `Bestellcode: ${draft.issueCode} • ` : ""}
            {draft?.series.title} #{draft?.issue.number}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Schließen">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          p: { xs: 2, sm: 3 },
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "background.default" : "grey.50",
        }}
      >
        <Formik
          initialValues={formValues}
          enableReinitialize
          validationSchema={IssueSchema}
          onSubmit={async (values, actions) => {
            if (!draft) return;
            actions.setSubmitting(true);
            setValidationMessage(null);
            try {
              await onSave(draft.id, values);
              onClose();
            } catch (err) {
              setValidationMessage(
                err instanceof Error ? err.message : "Speichern fehlgeschlagen"
              );
            } finally {
              actions.setSubmitting(false);
            }
          }}
        >
          {({
            values,
            setFieldValue,
            resetForm,
            isSubmitting,
            validateForm,
            setTouched,
            submitForm,
          }) => (
            <Form style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
              <IssueEditorFormContent
                values={values}
                edit={false}
                showBatchCreate={false}
                isDesktop={true}
                id={draft?.issueCode}
                session={session}
                header={dialogTitle}
                submitLabel="Entwurf speichern"
                isSubmitting={isSubmitting}
                setFieldValue={setFieldValue}
                resetForm={() => resetForm()}
                onToggleUs={toggleUs}
                onCancel={onClose}
                actions={
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 1.5,
                      width: "100%",
                    }}
                  >
                    <Button onClick={onClose} disabled={isSubmitting} color="inherit">
                      Abbrechen
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={isSubmitting}
                      onClick={() => {
                        void validateForm().then((errors) => {
                          const firstErrorPath = findFirstErrorPath(errors);
                          if (firstErrorPath) {
                            setTouched(buildTouchedFromErrors(errors), true);
                            setValidationMessage("Bitte die markierten Pflichtfelder prüfen.");
                            focusEditorErrorField(firstErrorPath);
                            return;
                          }
                          setValidationMessage(null);
                          submitForm();
                        });
                      }}
                    >
                      {isSubmitting ? "Wird gespeichert..." : "Entwurf speichern"}
                    </Button>
                  </Box>
                }
                actionNotice={
                  validationMessage ? <Alert severity="error">{validationMessage}</Alert> : null
                }
              />
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
