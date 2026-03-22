"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import { Field, Form, Formik } from "formik";
import { TextField } from "./generic/FormikTextField";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { LoginSchema } from "../util/yupSchema";
import { isMockMode } from "../app/mockMode";
import { useSnackbarBridge } from "./generic/useSnackbarBridge";
import { mutationRequest } from "../lib/client/mutation-request";

interface LoginProps {
  enqueueSnackbar: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
}

function LoginView(props: Readonly<LoginProps>) {
  const router = useRouter();

  return (
    <Formik
      initialValues={{
        name: "",
        password: "",
      }}
      validationSchema={isMockMode ? undefined : LoginSchema}
      onSubmit={async (values, actions) => {
        if (isMockMode) {
          props.enqueueSnackbar("Willkommen!", { variant: "success" });
          router.refresh();
          router.back();
          actions.setSubmitting(false);
          return;
        }

        try {
          await mutationRequest<{ user?: { id?: string; loggedIn?: boolean } }>({
            url: "/api/auth/login",
            method: "POST",
            body: {
              credentials: {
                name: values.name,
                password: values.password,
              },
            },
          });

          props.enqueueSnackbar("Willkommen!", { variant: "success" });
          router.refresh();
          router.back();
        } catch (error) {
          const message = error instanceof Error && error.message ? ` [${error.message}]` : "";
          props.enqueueSnackbar("Login fehlgeschlagen" + message, { variant: "error" });
        }

        actions.setSubmitting(false);
      }}
    >
      {({ submitForm, isSubmitting }) => (
        <Box
          sx={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
          }}
        >
          <Form id="loginForm" style={{ width: "100%", maxWidth: 520 }}>
            <Card>
              <CardHeader title="Login" subheader="Bitte Benutzername und Passwort eingeben" />

              <CardContent sx={{ pt: 1 }}>
                <Stack spacing={2}>
                  <Field name="name" label="Name" component={TextField} fullWidth />
                  <Field
                    name="password"
                    type="password"
                    label="Passwort"
                    component={TextField}
                    fullWidth
                  />
                </Stack>

                <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 1 }}>
                  <Button
                    disabled={isSubmitting}
                    onClick={() => router.back()}
                    variant="outlined"
                    color="inherit"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    disabled={isSubmitting}
                    onClick={submitForm}
                    variant="contained"
                    color="primary"
                  >
                    Login
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Form>
        </Box>
      )}
    </Formik>
  );
}

export default function Login() {
  const snackbarBridge = useSnackbarBridge();

  return (
    <LoginView
      enqueueSnackbar={snackbarBridge.enqueueSnackbar}
    />
  );
}
