import { useMutation } from "@apollo/client";
import { useRouter } from "next/navigation";
import { IssueSchema } from "../../../util/yupSchema";
import { Form, Formik } from "formik";
import React from "react";
import { generateLabel, generateUrl } from "../../../util/hierarchy";
import { decapitalize } from "../../../util/util";
import { createEmptyIssueValues } from "./issue-editor/constants";
import { buildIssueMutationVariables } from "./issue-editor/payload";
import { updateIssueEditorCache } from "./issue-editor/cache";
import { buildIssueEditorState } from "./issue-editor/state";
import IssueEditorFormContent from "./issue-editor/IssueEditorFormContent";
import type { IssueEditorFormValues, IssueEditorProps } from "./issue-editor/types";
import { AppContext } from "../../generic/AppContext";
import { useAppRouteContext } from "../../generic";
import { useSnackbarBridge } from "../../generic/useSnackbarBridge";

type IssueMutationResult = Record<string, unknown>;

function IssueEditorView(props: Readonly<IssueEditorProps>) {
  const router = useRouter();
  const { enqueueSnackbar, edit, mutation, selected } = props;

  const [defaultValues, setDefaultValues] = React.useState<IssueEditorFormValues>(() => {
    return props.defaultValues || createEmptyIssueValues();
  });
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

  const mutationDefinition = mutation.definitions[0] as { name?: { value?: string } };
  const mutationName = decapitalize(mutationDefinition.name?.value || "");

  const [runMutation] = useMutation(mutation, {
    update: (cache, result) => {
      updateIssueEditorCache(
        cache,
        (result.data as Record<string, Record<string, unknown>> | undefined) || {},
        mutationName,
        edit,
        defaultValues
      );
    },
    onCompleted: (data) => {
      const result = (data as Record<string, IssueMutationResult | undefined>)[mutationName];
      if (!result) return;

      enqueueSnackbar(generateLabel(result) + successMessage, {
        variant: "success",
      });

      if (!copyModeRef.current) {
        router.push(generateUrl(result, Boolean((result.series as any)?.publisher?.us)));
        return;
      }

      const copiedSelection = structuredClone(result) as Record<string, unknown>;
      copiedSelection.format = undefined;
      copiedSelection.variant = undefined;
      router.push(
        "/copy/issue" +
          generateUrl(copiedSelection, Boolean((copiedSelection.series as any)?.publisher?.us))
      );
    },
    onError: (errors) => {
      const message =
        errors.graphQLErrors && errors.graphQLErrors.length > 0
          ? " [" + errors.graphQLErrors[0].message + "]"
          : "";

      enqueueSnackbar(errorMessage + message, { variant: "error" });
    },
  });

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
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (copyModeRef.current && selected) {
        router.push(generateUrl(selected, Boolean(selected.us)));
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
          const variables = buildIssueMutationVariables(values, defaultValues, edit);
          await runMutation({ variables });
        } finally {
          actions.setSubmitting(false);
        }
      }}
    >
      {({ values, resetForm, submitForm, isSubmitting, setFieldValue }) => (
        <Form>
          <IssueEditorFormContent
            values={values}
            edit={edit}
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
              submitForm();
            }}
          />
        </Form>
      )}
    </Formik>
  );
}

export { currencies, formats } from "./issue-editor/constants";
export { getPattern, updateField } from "./IssueEditorSections";
export default function IssueEditor(props: Readonly<Partial<IssueEditorProps>>) {
  const appContext = React.useContext(AppContext);
  const routeContext = useAppRouteContext();
  const snackbarBridge = useSnackbarBridge();

  return <IssueEditorView {...appContext} {...routeContext} {...snackbarBridge} {...props} />;
}
