"use client";

import { useRouter } from "next/navigation";
import { PublisherSchema } from "../../../util/yupSchema";
import { FastField, Form, Formik } from "formik";
import { TextField } from "../../generic/FormikTextField";
import React from "react";
import { generateLabel, generateSeoUrl } from "../../../util/hierarchy";
import Button from "@mui/material/Button";
import { stripItem } from "../../../util/util";
import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Tooltip from "@mui/material/Tooltip";
import TitleLine from "../../generic/TitleLine";
import Stack from "@mui/material/Stack";
import { mutationRequest } from "../../../lib/client/mutation-request";
import FormPageShell from "../../form-shell/FormPageShell";
import FormSection from "../../form-shell/FormSection";

const editorFieldSx = { width: "100%", maxWidth: { xs: "100%", md: 420 } } as const;
const editorTextAreaSx = { width: "100%", maxWidth: { xs: "100%", md: 640 } } as const;

interface PublisherFormValues {
  name: string;
  startyear: number;
  endyear: number;
  addinfo: string;
  us: boolean;
}

interface PublisherEditorProps {
  defaultValues?: PublisherFormValues;
  edit?: boolean;
  id?: string | number;
  session?: unknown;
  isDesktop?: boolean;
  enqueueSnackbar: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
  [key: string]: unknown;
}

type PublisherMutationResult = {
  us?: boolean;
  [key: string]: unknown;
};

function createInitialPublisherValues(defaultValues?: PublisherFormValues): PublisherFormValues {
  return {
    name: String(defaultValues?.name || ""),
    startyear: Number(defaultValues?.startyear ?? 1900),
    endyear: Number(defaultValues?.endyear ?? 1900),
    addinfo: String(defaultValues?.addinfo || ""),
    us: Boolean(defaultValues?.us),
  };
}

function PublisherEditorView(props: Readonly<PublisherEditorProps>) {
  const router = useRouter();
  const { enqueueSnackbar, edit = false } = props;

  const [defaultValues, setDefaultValues] = React.useState<PublisherFormValues>(() =>
    createInitialPublisherValues(props.defaultValues)
  );

  const publisherLabel = generateLabel({ publisher: defaultValues, us: defaultValues.us } as any);
  const header = edit ? publisherLabel + " bearbeiten" : "Verlag erstellen";
  const submitLabel = edit ? "Speichern" : "Erstellen";
  const successMessage = edit ? " erfolgreich gespeichert" : " erfolgreich erstellt";
  const errorMessage = edit
    ? publisherLabel + " konnte nicht gespeichert werden"
    : "Verlag konnte nicht erstellt werden";

  const toggleUs = React.useCallback(() => {
    setDefaultValues((prevState) => ({
      ...prevState,
      us: !prevState.us,
    }));
  }, []);

  return (
    <Formik
      initialValues={defaultValues}
      enableReinitialize
      validationSchema={PublisherSchema}
      onSubmit={async (values, actions) => {
        actions.setSubmitting(true);

        try {
          const variables: Record<string, unknown> = {};
          variables.item = stripItem(values);
          if (edit) variables.old = stripItem(defaultValues);

          const result = await mutationRequest<{ item?: PublisherMutationResult }>({
            url: "/api/publishers",
            method: edit ? "PATCH" : "POST",
            body: variables,
          });

          const nextItem = result.item;
          if (!nextItem) throw new Error("Publisher konnte nicht gespeichert werden");

          enqueueSnackbar(generateLabel({ publisher: nextItem, us: Boolean(nextItem.us) } as any) + successMessage, {
            variant: "success",
          });
          router.push(
            generateSeoUrl({ publisher: nextItem, us: Boolean(nextItem.us) } as any, Boolean(nextItem.us))
          );
        } catch (error) {
          const message = error instanceof Error && error.message ? ` [${error.message}]` : "";
          enqueueSnackbar(errorMessage + message, { variant: "error" });
        } finally {
          actions.setSubmitting(false);
        }
      }}
    >
      {({ values, resetForm, submitForm, isSubmitting }) => (
        <Form style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
          <FormPageShell
            title={<TitleLine title={header} id={props.id} session={props.session} />}
            headerAction={
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Tooltip title={(values.us ? "Deutscher" : "US") + " Verlag"}>
                    <Switch
                      disabled={edit}
                      checked={values.us}
                      onChange={() => {
                        toggleUs();
                        resetForm();
                      }}
                      color="secondary"
                    />
                  </Tooltip>
                }
                label="US"
              />
            }
            actions={
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", md: "center" }}
              >
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    disabled={isSubmitting}
                    onClick={() => resetForm()}
                    variant="text"
                    color="inherit"
                  >
                    Zurücksetzen
                  </Button>

                  <Button
                    disabled={isSubmitting}
                    onClick={() => router.back()}
                    variant="outlined"
                    color="inherit"
                  >
                    Abbrechen
                  </Button>
                </Box>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Button
                    disabled={isSubmitting}
                    onClick={submitForm}
                    variant="contained"
                    color="primary"
                  >
                    {submitLabel}
                  </Button>
                </Box>
              </Stack>
            }
          >
            <FormSection title="Basisdaten">
              <Stack spacing={2}>
                <FastField name="name" label="Name" component={TextField} sx={editorFieldSx} />

                <FastField
                  name="startyear"
                  label="Startjahr"
                  type="number"
                  component={TextField}
                  sx={editorFieldSx}
                />

                <FastField
                  name="endyear"
                  label="Endjahr"
                  type="number"
                  component={TextField}
                  sx={editorFieldSx}
                />
              </Stack>
            </FormSection>

            <FormSection title="Beschreibung">
              <FastField
                name="addinfo"
                label="Weitere Informationen"
                multiline
                rows={10}
                component={TextField}
                sx={editorTextAreaSx}
              />
            </FormSection>
          </FormPageShell>
        </Form>
      )}
    </Formik>
  );
}

export default function PublisherEditor(props: Readonly<PublisherEditorProps>) {
  return <PublisherEditorView {...props} />;
}
