import { useRouter } from "next/navigation";
import { PublisherSchema } from "../../../util/yupSchema";
import { FastField, Form, Formik } from "formik";
import { TextField } from "../../generic/FormikTextField";
import React from "react";
import { generateLabel, generateUrl } from "../../../util/hierarchy";
import Button from "@mui/material/Button";
import { stripItem } from "../../../util/util";
import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Tooltip from "@mui/material/Tooltip";
import TitleLine from "../../generic/TitleLine";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import { editorSectionSx } from "./editorLayout";
import { AppContext } from "../../generic/AppContext";
import { useSnackbarBridge } from "../../generic/useSnackbarBridge";
import { mutationRequest } from "../../../lib/client/mutation-request";

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
  if (defaultValues) return defaultValues;

  return {
    name: "",
    startyear: 1900,
    endyear: 1900,
    addinfo: "",
    us: false,
  };
}

function PublisherEditorView(props: Readonly<PublisherEditorProps>) {
  const router = useRouter();
  const { enqueueSnackbar, edit = false } = props;

  const [defaultValues, setDefaultValues] = React.useState<PublisherFormValues>(() =>
    createInitialPublisherValues(props.defaultValues)
  );

  const header = edit ? generateLabel(defaultValues) + " bearbeiten" : "Verlag erstellen";
  const submitLabel = edit ? "Speichern" : "Erstellen";
  const successMessage = edit ? " erfolgreich gespeichert" : " erfolgreich erstellt";
  const errorMessage = edit
    ? generateLabel(defaultValues) + " konnte nicht gespeichert werden"
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

          enqueueSnackbar(generateLabel(nextItem) + successMessage, {
            variant: "success",
          });
          router.push(generateUrl(nextItem, Boolean(nextItem.us)));
        } catch (error) {
          const message = error instanceof Error && error.message ? ` [${error.message}]` : "";
          enqueueSnackbar(errorMessage + message, { variant: "error" });
        } finally {
          actions.setSubmitting(false);
        }
      }}
    >
      {({ values, resetForm, submitForm, isSubmitting }) => (
        <Form>
          <CardHeader
            title={<TitleLine title={header} id={props.id} session={props.session} />}
            action={
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
          />

          <CardContent sx={{ pt: 1 }}>
            <Stack spacing={2.25}>
              <Paper elevation={0} sx={editorSectionSx}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1">Basisdaten</Typography>

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
              </Paper>

              <Paper elevation={0} sx={editorSectionSx}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1">Beschreibung</Typography>

                  <FastField
                    name="addinfo"
                    label="Weitere Informationen"
                    multiline
                    rows={10}
                    component={TextField}
                    sx={editorTextAreaSx}
                  />
                </Stack>
              </Paper>

              <Paper elevation={0} sx={editorSectionSx}>
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

                  <Box
                    sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}
                  >
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
              </Paper>
            </Stack>
          </CardContent>
        </Form>
      )}
    </Formik>
  );
}

export default function PublisherEditor(props: Readonly<Partial<PublisherEditorProps>>) {
  const appContext = React.useContext(AppContext);
  const snackbarBridge = useSnackbarBridge();

  return <PublisherEditorView {...appContext} {...snackbarBridge} {...props} />;
}
