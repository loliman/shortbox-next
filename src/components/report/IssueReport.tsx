import { useMutation, useQuery } from "@apollo/client";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import React from "react";
import { useRouter } from "next/navigation";
import { Form, Formik } from "formik";
import Layout from "../Layout";
import QueryResult from "../generic/QueryResult";
import { issue } from "../../graphql/queriesTyped";
import { reportError } from "../../graphql/mutationsTyped";
import { generateUrl } from "../../util/hierarchy";
import { mapIssueToEditorDefaultValues } from "../restricted/editor/issue-editor/defaultValues";
import { buildIssueMutationVariables } from "../restricted/editor/issue-editor/payload";
import IssueEditorFormContent from "../restricted/editor/issue-editor/IssueEditorFormContent";
import type { SelectedRoot } from "../../types/domain";
import type { IssueEditorFormValues } from "../restricted/editor/issue-editor/types";
import { EditorPagePlaceholder } from "../placeholders/EditorPagePlaceholder";
import { useAppRouteContext } from "../generic";
import { useSnackbarBridge } from "../generic/useSnackbarBridge";

const REPORT_NOTICE =
  "In diesem Editor können Sie Fehler melden. Beim Absenden wird ein serverseitiger Change Request erstellt und zur Prüfung gespeichert.";

interface IssueReportProps {
  selected: SelectedRoot;
  enqueueSnackbar: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
}

function IssueReportView(props: Readonly<IssueReportProps>) {
  const router = useRouter();
  const { selected, enqueueSnackbar } = props;
  const variables = { ...selected, edit: true };
  const { loading, error, data } = useQuery(issue, {
    variables: variables as any,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });

  const [runReportError] = useMutation(reportError, {
    fetchPolicy: "no-cache",
  });
  const issueDetails = data?.issueDetails;

  return (
    <Layout>
      {(() => {
        if (loading || error || !data || !issueDetails) {
          return (
            <QueryResult
              loading={loading}
              error={error}
              data={data ? data.issueDetails : null}
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

                await runReportError({
                  variables: {
                    issue: { id: String(issueDetails.id || "") },
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
                  id={issueDetails.id ?? undefined}
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

export default function IssueReport() {
  const routeContext = useAppRouteContext();
  const snackbarBridge = useSnackbarBridge();

  return <IssueReportView selected={routeContext.selected} {...snackbarBridge} />;
}
