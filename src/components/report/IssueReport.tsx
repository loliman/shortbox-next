"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { Form, Formik } from "formik";
import QueryResult from "../generic/QueryResult";
import { generateSeoUrl } from "../../lib/routes/hierarchy";
import { mapIssueToEditorDefaultValues } from "../restricted/editor/issue-editor/defaultValues";
import { buildIssueMutationVariables } from "../restricted/editor/issue-editor/payload";
import IssueEditorFormContent from "../restricted/editor/issue-editor/IssueEditorFormContent";
import type { SelectedRoot } from "../../types/domain";
import type { IssueEditorFormValues } from "../restricted/editor/issue-editor/types";
import { EditorPagePlaceholder } from "../placeholders/EditorPagePlaceholder";
import { useSnackbarBridge } from "../generic/useSnackbarBridge";
import { mutationRequest } from "../../lib/client/mutation-request";
import type { SessionData } from "../../types/session";
import type { LayoutRouteData, RouteQuery } from "../../types/route-ui";

const REPORT_NOTICE =
  "In diesem Editor können Sie Fehler melden. Beim Absenden wird ein serverseitiger Change Request erstellt und zur Prüfung gespeichert.";

interface IssueReportProps {
  selected: SelectedRoot;
  level: LayoutRouteData["level"];
  us: boolean;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
  initialIssue?: Record<string, unknown> | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
  session?: SessionData | null;
  enqueueSnackbar: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
}

function IssueReportView(props: Readonly<IssueReportProps>) {
  const router = useRouter();
  const { selected, enqueueSnackbar } = props;
  const loading = false;
  const error = null;
  const issueDetails = props.initialIssue ?? null;

  return (
    (() => {
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
      const fallbackUrl = generateSeoUrl(selected, Boolean(selected.us));

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
                  issue: {
                    ...(payload.old ? payload.old : {}),
                    id: readTextValue(issueDetails.id),
                  },
                  item: payload.item,
                },
              });

              enqueueSnackbar("Change Request wurde gespeichert.", { variant: "success" });
              router.push(fallbackUrl);
            } catch (submitError: unknown) {
              const message =
                submitError && typeof submitError === "object" && "message" in submitError
                  ? readTextValue((submitError as { message?: string }).message)
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
            <Form style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
              <IssueEditorFormContent
                values={values}
                edit
                showBatchCreate={false}
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
    })()
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
}: Readonly<IssueReportActionsProps>) {
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
  const original = issueDetails;

  if (original.releasedate == null && next.releasedate === "1900-01-01") {
    next.releasedate = "";
  }

  if (original.price == null && readTextValue(next.price) === "0") {
    next.price = "";
  }

  if (original.currency == null && readTextValue(next.currency) === "EUR") {
    next.currency = "";
  }

  if (original.pages == null && Number(next.pages) === 0) {
    next.pages = undefined;
  }

  if (original.comicguideid == null && Number(next.comicguideid) === 0) {
    next.comicguideid = undefined;
  }

  if (original.limitation == null && readTextValue(next.limitation) === "0") {
    next.limitation = "";
  }

  return next;
}

export default function IssueReport(props: Readonly<{
  selected: SelectedRoot;
  level: LayoutRouteData["level"];
  us: boolean;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
  initialIssue?: Record<string, unknown> | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
  session?: SessionData | null;
}>) {
  const snackbarBridge = useSnackbarBridge();

  return (
    <IssueReportView
      {...snackbarBridge}
      selected={props.selected}
      level={props.level}
      us={props.us}
      query={props.query}
      initialFilterCount={props.initialFilterCount}
      initialIssue={props.initialIssue}
      initialPublisherNodes={props.initialPublisherNodes}
      initialSeriesNodesByPublisher={props.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={props.initialIssueNodesBySeriesKey}
      session={props.session}
    />
  );
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}
