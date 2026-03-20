"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { Form, Formik } from "formik";
import Layout from "../Layout";
import QueryResult from "../generic/QueryResult";
import { generateUrl } from "../../util/hierarchy";
import { mapIssueToEditorDefaultValues } from "../restricted/editor/issue-editor/defaultValues";
import { buildIssueMutationVariables } from "../restricted/editor/issue-editor/payload";
import IssueEditorFormContent from "../restricted/editor/issue-editor/IssueEditorFormContent";
import type { SelectedRoot } from "../../types/domain";
import type { IssueEditorFormValues } from "../restricted/editor/issue-editor/types";
import { EditorPagePlaceholder } from "../placeholders/EditorPagePlaceholder";
import { useSnackbarBridge } from "../generic/useSnackbarBridge";
import { mutationRequest } from "../../lib/client/mutation-request";
import type { AppRouteContextValue } from "../../app/routeContext";

const REPORT_NOTICE =
  "In diesem Editor können Sie Fehler melden. Beim Absenden wird ein serverseitiger Change Request erstellt und zur Prüfung gespeichert.";

interface IssueReportProps {
  routeContext: AppRouteContextValue;
  selected: SelectedRoot;
  enqueueSnackbar: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
}

function IssueReportView(props: Readonly<IssueReportProps>) {
  const router = useRouter();
  const { selected, enqueueSnackbar } = props;
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const [issueDetails, setIssueDetails] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    if (!selected.issue?.series?.publisher?.name || !selected.issue?.series?.title || !selected.issue.number) {
      setIssueDetails(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      locale: selected.us ? "us" : "de",
      publisher: selected.issue.series.publisher.name,
      series: selected.issue.series.title,
      volume: String(selected.issue.series.volume || 1),
      number: selected.issue.number,
    });
    if (selected.issue.format) params.set("format", selected.issue.format);
    if (selected.issue.variant) params.set("variant", selected.issue.variant);

    void fetch(`/api/public-issue?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Issue request failed: ${response.status}`);
        return (await response.json()) as { item?: Record<string, unknown> | null };
      })
      .then((payload) => {
        if (cancelled) return;
        setIssueDetails(payload.item || null);
      })
      .catch((nextError) => {
        if (cancelled) return;
        setIssueDetails(null);
        setError(nextError);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  return (
    <Layout routeContext={props.routeContext}>
      {(() => {
        if (loading || error || !issueDetails) {
          return (
            <QueryResult
              loading={loading}
              error={error}
              data={issueDetails}
              selected={selected}
              placeholder={<EditorPagePlaceholder />}
              placeholderCount={1}
            />
          );
        }

        const defaultValues = sanitizeReportValues(
          mapIssueToEditorDefaultValues(issueDetails, false),
          issueDetails
        );
        const fallbackUrl = generateUrl(selected, Boolean(selected.us));

        return (
          <Formik
            initialValues={defaultValues}
            enableReinitialize
            onSubmit={async (values, actions) => {
              actions.setSubmitting(true);
              try {
                const sanitizedValues = sanitizeReportValues(values, issueDetails);
                const payload = buildIssueMutationVariables(
                  sanitizedValues,
                  defaultValues,
                  true
                );

                await mutationRequest({
                  url: "/api/change-requests",
                  method: "POST",
                  body: {
                    issue: payload.old || { id: String(issueDetails.id || "") },
                    item: payload.item,
                  },
                });

                enqueueSnackbar("Change Request wurde gespeichert.", { variant: "success" });
                router.push(fallbackUrl);
              } catch (submitError: unknown) {
                const message =
                  submitError && typeof submitError === "object" && "message" in submitError
                    ? String((submitError as { message?: string }).message || "")
                    : "";

                enqueueSnackbar(
                  message ? `Fehler beim Melden: ${message}` : "Fehler beim Melden.",
                  {
                    variant: "error",
                  }
                );
              } finally {
                actions.setSubmitting(false);
              }
            }}
          >
            {({ values, resetForm, submitForm, isSubmitting, setFieldValue }) => (
              <Form>
                <IssueEditorFormContent
                  values={values}
                  edit
                  id={
                    typeof issueDetails.id === "string" || typeof issueDetails.id === "number"
                      ? issueDetails.id
                      : undefined
                  }
                  header="Fehler melden"
                  submitLabel="Fehler melden"
                  submitAndCopyLabel="Fehler melden"
                  isSubmitting={isSubmitting}
                  setFieldValue={setFieldValue}
                  resetForm={() => resetForm()}
                  onToggleUs={() => {}}
                  showHints={false}
                  lockedFields={{
                    format: true,
                    variant: true,
                    publisher: true,
                    series: true,
                    number: true,
                  }}
                  onCancel={() => router.back()}
                  onSubmitMode={() => submitForm()}
                  notice={<Alert severity="info">{REPORT_NOTICE}</Alert>}
                  actions={
                    <IssueReportActions
                      isSubmitting={isSubmitting}
                      resetForm={resetForm}
                      onCancel={() => router.back()}
                      onSubmit={() => submitForm()}
                    />
                  }
                />
              </Form>
            )}
          </Formik>
        );
      })()}
    </Layout>
  );
}

interface IssueReportActionsProps {
  isSubmitting: boolean;
  resetForm: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

function IssueReportActions({
  isSubmitting,
  resetForm,
  onCancel,
  onSubmit,
}: IssueReportActionsProps) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1.5}
      justifyContent="space-between"
      alignItems={{ xs: "stretch", md: "center" }}
    >
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button disabled={isSubmitting} onClick={() => resetForm()} variant="text" color="inherit">
          Zurücksetzen
        </Button>

        <Button disabled={isSubmitting} onClick={onCancel} variant="outlined" color="inherit">
          Abbrechen
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <Button
          disabled={isSubmitting}
          onClick={onSubmit}
          variant="contained"
          color="primary"
        >
          Fehler melden
        </Button>
      </Box>
    </Stack>
  );
}

function sanitizeReportValues(
  values: IssueEditorFormValues,
  issueDetails: Record<string, unknown>
): IssueEditorFormValues {
  const next = { ...values } as IssueEditorFormValues;
  const original = issueDetails || {};

  if (original.releasedate == null && next.releasedate === "1900-01-01") {
    next.releasedate = "";
  }

  if (original.price == null && String(next.price || "") === "0") {
    next.price = "";
  }

  if (original.currency == null && String(next.currency || "") === "EUR") {
    next.currency = "";
  }

  if (original.pages == null && Number(next.pages) === 0) {
    next.pages = undefined;
  }

  if (original.comicguideid == null && Number(next.comicguideid) === 0) {
    next.comicguideid = undefined;
  }

  if (original.limitation == null && String(next.limitation || "") === "0") {
    next.limitation = "";
  }

  return next;
}

export default function IssueReport(props: Readonly<{ routeContext: AppRouteContextValue }>) {
  const snackbarBridge = useSnackbarBridge();

  return (
    <IssueReportView
      routeContext={props.routeContext}
      selected={props.routeContext.selected}
      {...snackbarBridge}
    />
  );
}
