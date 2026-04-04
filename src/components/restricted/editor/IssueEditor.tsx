"use client";

import { useRouter } from "next/navigation";
import { IssueSchema } from "../../../util/yupSchema";
import { Form, Formik } from "formik";
import React from "react";
import { generateLabel, generateSeoUrl } from "../../../lib/routes/hierarchy";
import { createEmptyIssueValues } from "./issue-editor/constants";
import { buildIssueMutationVariables } from "./issue-editor/payload";
import { buildIssueEditorState } from "./issue-editor/state";
import IssueEditorFormContent from "./issue-editor/IssueEditorFormContent";
import type { IssueEditorFormValues, IssueEditorProps } from "./issue-editor/types";
import { mutationRequest } from "../../../lib/client/mutation-request";
import type { SelectedRoot } from "../../../types/domain";
import { buildTouchedFromErrors, findFirstErrorPath, focusEditorErrorField } from "./issue-editor/validationFeedback";
import { buildIssueSaveSuccessMessage } from "./issue-editor/saveFeedback";

type IssueMutationResult = Record<string, unknown>;
type IssueMutationMeta = {
  createdSeries?: {
    title?: string;
    volume?: number;
  };
};

function readIssueUs(item: IssueMutationResult): boolean {
  const series = item.series as { publisher?: { us?: unknown } } | undefined;
  return Boolean(series?.publisher?.us);
}

function toIssueSelection(item: IssueMutationResult, us: boolean): SelectedRoot {
  return { issue: item as unknown as SelectedRoot["issue"], us };
}

function normalizeIssueEditorValues(
  value: IssueEditorFormValues | undefined
): IssueEditorFormValues {
  const defaults = createEmptyIssueValues();
  const source = value || defaults;

  return {
    ...defaults,
    ...source,
    title: readTextValue(source.title),
    number: readTextValue(source.number),
    variant: readTextValue(source.variant),
    format: readTextValue(source.format) || defaults.format,
    limitation: readTextValue(source.limitation),
    releasedate: readTextValue(source.releasedate),
    price: source.price == null ? "" : String(source.price),
    currency: readTextValue(source.currency),
    addinfo: readTextValue(source.addinfo),
    isbn: readTextValue(source.isbn),
    copyBatch: {
      enabled: Boolean(source.copyBatch?.enabled),
      count: source.copyBatch?.count ?? defaults.copyBatch.count,
      prefix: readTextValue(source.copyBatch?.prefix),
    },
    series: {
      ...defaults.series,
      ...source.series,
      title: readTextValue(source.series?.title),
      volume: source.series?.volume ?? defaults.series.volume,
      publisher: {
        ...defaults.series.publisher,
        ...source.series?.publisher,
        name: readTextValue(source.series?.publisher?.name),
        us: Boolean(source.series?.publisher?.us),
      },
    },
    individuals: Array.isArray(source.individuals) ? source.individuals : [],
    arcs: Array.isArray(source.arcs) ? source.arcs : [],
    stories: Array.isArray(source.stories) ? source.stories : [],
  };
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function IssueEditorView(props: Readonly<IssueEditorProps>) {
  const router = useRouter();
  const { enqueueSnackbar, edit, selected } = props;

  const [defaultValues, setDefaultValues] = React.useState<IssueEditorFormValues>(() => {
    return normalizeIssueEditorValues(props.defaultValues);
  });

  React.useEffect(() => {
    setDefaultValues(normalizeIssueEditorValues(props.defaultValues));
  }, [props.defaultValues]);
  const [copyMode, setCopyMode] = React.useState(Boolean(props.copy));
  const copyModeRef = React.useRef(copyMode);

  React.useEffect(() => {
    copyModeRef.current = copyMode;
  }, [copyMode]);

  const { header, submitLabel, submitAndCopyLabel, successMessage, errorMessage } = React.useMemo(
    () =>
      buildIssueEditorState(
        {
          edit,
          copy: props.copy,
        },
        defaultValues
      ),
    [defaultValues, edit, props.copy]
  );

  const toggleUs = React.useCallback(() => {
    setDefaultValues((prevState) => ({
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

  const onCancel = React.useCallback(
    () => {
      if (copyModeRef.current && selected) {
        router.push(generateSeoUrl(selected, Boolean(selected.us)));
        return;
      }

      router.back();
    },
    [router, selected]
  );

  return (
    <Formik
      initialValues={defaultValues}
      enableReinitialize
      validationSchema={IssueSchema}
      onSubmit={async (values, actions) => {
        actions.setSubmitting(true);
        try {
          const variables = buildIssueMutationVariables(values, edit, props.id);
          const result = await mutationRequest<{
            item?: IssueMutationResult;
            items?: IssueMutationResult[];
            meta?: IssueMutationMeta;
          }>({
            url: "/api/issues",
            method: edit ? "PATCH" : "POST",
            body: variables as unknown as Record<string, unknown>,
          });
          const createdItems = Array.isArray(result.items)
            ? result.items.filter(
                (entry): entry is IssueMutationResult => Boolean(entry) && typeof entry === "object"
              )
            : [];
          const nextItem = createdItems.at(-1) ?? result.item;
          if (!nextItem) throw new Error("Ausgabe konnte nicht gespeichert werden");

          const nextUs = readIssueUs(nextItem);
          enqueueSnackbar(
            buildIssueSaveSuccessMessage({
              createdCount: createdItems.length > 0 ? createdItems.length : 1,
              issueLabel: generateLabel(toIssueSelection(nextItem, nextUs)),
              successMessage,
              createdSeries: result.meta?.createdSeries,
            }),
            {
              variant: "success",
            }
          );

          if (!copyModeRef.current) {
            router.push(
              generateSeoUrl(
                toIssueSelection(nextItem, nextUs),
                nextUs
              )
            );
            return;
          }

          const copiedSelection = structuredClone(nextItem) as Record<string, unknown>;
          copiedSelection.format = undefined;
          copiedSelection.variant = undefined;
          router.push(
            "/copy/issue" +
              generateSeoUrl(
                toIssueSelection(copiedSelection, readIssueUs(copiedSelection)),
                readIssueUs(copiedSelection)
              )
          );
        } catch (error) {
          const message = error instanceof Error && error.message ? ` [${error.message}]` : "";
          enqueueSnackbar(errorMessage + message, { variant: "error" });
        } finally {
          actions.setSubmitting(false);
        }
      }}
    >
      {({ values, resetForm, submitForm, isSubmitting, setFieldValue, validateForm, setTouched }) => (
        <Form style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
          <IssueEditorFormContent
            values={values}
            edit={edit}
            copy={props.copy}
            showBatchCreate={!edit}
            isDesktop={props.isDesktop}
            id={props.id}
            session={props.session}
            header={header}
            submitLabel={submitLabel}
            submitAndCopyLabel={submitAndCopyLabel}
            isSubmitting={isSubmitting}
            setFieldValue={setFieldValue}
            resetForm={() => resetForm()}
            onToggleUs={toggleUs}
            onCancel={onCancel}
            onSubmitMode={(nextCopyMode) => {
              setCopyMode(nextCopyMode);
              void validateForm().then((errors) => {
                const firstErrorPath = findFirstErrorPath(errors);
                if (firstErrorPath) {
                  setTouched(buildTouchedFromErrors(errors), true);
                  enqueueSnackbar("Bitte die markierten Pflichtfelder prüfen.", {
                    variant: "error",
                  });
                  focusEditorErrorField(firstErrorPath);
                  return;
                }

                submitForm();
              });
            }}
            lockedFields={props.lockedFields}
          />
        </Form>
      )}
    </Formik>
  );
}

export { currencies, formats } from "./issue-editor/constants";
export { getPattern, updateField } from "./IssueEditorSections";
export default function IssueEditor(props: Readonly<IssueEditorProps>) {
  return <IssueEditorView {...props} />;
}
