"use client";

import React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { Form, Formik } from "formik";
import { mutationRequest } from "../../lib/client/mutation-request";
import { useSnackbarBridge } from "../generic/useSnackbarBridge";
import type { ActivePreviewImportQueue } from "../../types/preview-import";
import type { SessionData } from "../../app/session";
import IssueEditorFormContent from "../restricted/editor/issue-editor/IssueEditorFormContent";
import { buildIssueMutationVariables } from "../restricted/editor/issue-editor/payload";
import type { IssueEditorFormValues } from "../restricted/editor/issue-editor/types";

interface PreviewImportProps {
  initialQueue: ActivePreviewImportQueue | null;
  session?: SessionData | null;
}

export default function PreviewImport(props: Readonly<PreviewImportProps>) {
  const router = useRouter();
  const snackbar = useSnackbarBridge();
  const [uploading, setUploading] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);

  const activeQueue = props.initialQueue;

  const onDiscard = async () => {
    await mutationRequest<{ success?: boolean }>({
      url: "/api/admin-preview-import",
      method: "DELETE",
    });
    snackbar.enqueueSnackbar("Import-Queue verworfen.", { variant: "success" });
    router.refresh();
  };

  if (activeQueue?.currentDraft) {
    return (
      <PreviewImportQueueEditor
        queue={activeQueue}
        session={props.session}
        onDiscard={onDiscard}
      />
    );
  }

  return (
    <Stack spacing={2.5}>
      <Alert severity="info">
        Panini-Vorschau als PDF hochladen. Es wird nur maschinenlesbarer Text unterstützt, keine OCR.
      </Alert>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
        <Button component="label" variant="outlined" disabled={uploading}>
          PDF wählen
          <input
            hidden
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null;
              setFile(nextFile);
            }}
          />
        </Button>

        <Typography color="text.secondary">
          {file ? file.name : "Noch keine Datei ausgewählt"}
        </Typography>

        <Box sx={{ flex: 1 }} />

        <Button
          variant="contained"
          disabled={!file || uploading}
          onClick={async () => {
            if (!file) return;
            setUploading(true);
            try {
              const formData = new FormData();
              formData.set("file", file);
              const response = await fetch("/api/admin-preview-import", {
                method: "POST",
                body: formData,
              });

              const contentType = response.headers.get("content-type") || "";
              let payload: { error?: string } = {};

              if (contentType.includes("application/json")) {
                payload = (await response.json()) as { error?: string };
              } else {
                const text = await response.text().catch(() => "");

                if (!response.ok) {
                  if (response.status === 413) {
                    throw new Error(
                      "Die PDF ist für den Server-Upload zu groß. Wahrscheinlich blockiert ein Proxy- oder Webserver-Limit vor der App."
                    );
                  }

                  if (/<html/i.test(text)) {
                    throw new Error(
                      `Der Server hat statt JSON eine HTML-Fehlerseite zurückgegeben (${response.status}). Das ist meist ein vorgeschalteter Proxy- oder Webserver-Fehler.`
                    );
                  }
                }
              }

              if (!response.ok) {
                throw new Error(payload.error || "PDF konnte nicht importiert werden");
              }
              snackbar.enqueueSnackbar("Import-Queue erstellt.", { variant: "success" });
              router.refresh();
            } catch (error) {
              snackbar.enqueueSnackbar(
                error instanceof Error ? error.message : "PDF konnte nicht importiert werden",
                { variant: "error" }
              );
            } finally {
              setUploading(false);
            }
          }}
        >
          PDF importieren
        </Button>
      </Stack>
    </Stack>
  );
}

function PreviewImportQueueEditor(props: Readonly<{
  queue: ActivePreviewImportQueue;
  session?: SessionData | null;
  onDiscard: () => Promise<void>;
}>) {
  const router = useRouter();
  const snackbar = useSnackbarBridge();
  const draft = props.queue.currentDraft;
  const values = React.useMemo(() => structuredClone(draft.values), [draft.values]);

  return (
    <Formik
      initialValues={values}
      enableReinitialize
      onSubmit={async (formValues, actions) => {
        actions.setSubmitting(true);
        try {
          const variables = buildIssueMutationVariables(formValues, values, false);
          const result = await mutationRequest<{ item?: { id?: string | number } }>({
            url: "/api/issues",
            method: "POST",
            body: variables.item as Record<string, unknown>,
          });

          await mutationRequest({
            url: "/api/admin-preview-import",
            method: "PATCH",
            body: {
              action: "complete",
              draftId: draft.id,
              createdIssueId: String(result.item?.id || ""),
            },
          });

          snackbar.enqueueSnackbar("Ausgabe erstellt. Nächster Draft geöffnet.", { variant: "success" });
          router.refresh();
        } catch (error) {
          snackbar.enqueueSnackbar(
            error instanceof Error ? error.message : "Ausgabe konnte nicht erstellt werden",
            { variant: "error" }
          );
        } finally {
          actions.setSubmitting(false);
        }
      }}
    >
      {({ resetForm, submitForm, isSubmitting, setFieldValue, values: formValues }) => (
        <Form style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
          <IssueEditorFormContent
            values={formValues as IssueEditorFormValues}
            isDesktop
            session={props.session}
            header={`Import ${props.queue.currentDraftIndex + 1} von ${props.queue.totalDraftCount}`}
            submitLabel="Erstellen und weiter"
            submitAndCopyLabel="Erstellen und weiter"
            isSubmitting={isSubmitting}
            setFieldValue={setFieldValue}
            resetForm={() => resetForm()}
            onToggleUs={() => {}}
            onCancel={() => {
              void props.onDiscard().then(() => router.refresh());
            }}
            onSubmitMode={() => submitForm()}
            notice={
              <Stack spacing={1}>
                <Alert severity="info">
                  Quelle: {draft.sourceTitle}
                  {draft.issueCode ? ` (${draft.issueCode})` : ""}
                </Alert>
                {draft.warnings.length > 0 ? (
                  <Alert severity="warning">{draft.warnings.join(" | ")}</Alert>
                ) : null}
              </Stack>
            }
            actions={
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between">
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    disabled={isSubmitting || !props.queue.canGoBack}
                    variant="text"
                    color="inherit"
                    onClick={async () => {
                      try {
                        await mutationRequest({
                          url: "/api/admin-preview-import",
                          method: "PATCH",
                          body: {
                            action: "back",
                          },
                        });
                        snackbar.enqueueSnackbar("Zum letzten übersprungenen Draft zurückgekehrt.", {
                          variant: "success",
                        });
                        router.refresh();
                      } catch (error) {
                        snackbar.enqueueSnackbar(
                          error instanceof Error ? error.message : "Der vorherige Draft konnte nicht geöffnet werden",
                          { variant: "error" }
                        );
                      }
                    }}
                  >
                    Zurück
                  </Button>
                  <Button disabled={isSubmitting} variant="text" color="inherit" onClick={() => resetForm()}>
                    Zurücksetzen
                  </Button>
                  <Button
                    disabled={isSubmitting}
                    variant="outlined"
                    color="inherit"
                    onClick={() => {
                      void props.onDiscard().then(() => router.refresh());
                    }}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    disabled={isSubmitting}
                    variant="outlined"
                    onClick={async () => {
                      try {
                        await mutationRequest({
                          url: "/api/admin-preview-import",
                          method: "PATCH",
                          body: {
                            action: "skip",
                            draftId: draft.id,
                          },
                        });
                        snackbar.enqueueSnackbar("Draft übersprungen.", { variant: "success" });
                        router.refresh();
                      } catch (error) {
                        snackbar.enqueueSnackbar(
                          error instanceof Error ? error.message : "Draft konnte nicht übersprungen werden",
                          { variant: "error" }
                        );
                      }
                    }}
                  >
                    Überspringen
                  </Button>
                </Box>

                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                  <Button disabled={isSubmitting} variant="contained" onClick={() => submitForm()}>
                    Erstellen und weiter
                  </Button>
                </Box>
              </Stack>
            }
            showHints
          />
        </Form>
      )}
    </Formik>
  );
}
