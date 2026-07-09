"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import { Field, Form, Formik } from "formik";
import { TextField } from "./generic/FormikTextField";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
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
            minHeight: { xs: "auto", sm: "80vh" },
            py: { xs: 4, sm: 0 },
            px: { xs: 1.5, sm: 3 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Form id="loginForm" style={{ width: "100%", maxWidth: 520 }}>
            <Paper
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 6,
                padding: { xs: 2.25, sm: 5 },
                backgroundColor: "background.paper",
                boxShadow: (theme) =>
                  theme.palette.mode === "dark"
                    ? "0 18px 50px rgba(0,0,0,0.36)"
                    : "0 18px 50px rgba(0,0,0,0.06)",
              }}
            >
              {/* Logo */}
              <Box sx={{ mb: 4, display: "flex", justifyContent: "flex-start" }}>
                <Box
                  component="img"
                  src="/Shortbox_Logo.png"
                  alt="Shortbox"
                  sx={{
                    height: 36,
                  }}
                />
              </Box>

              <Typography
                variant="overline"
                component="p"
                sx={{
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "secondary.main",
                  mb: 1,
                  display: "block",
                }}
              >
                Anmeldung / Shortbox
              </Typography>
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontFamily: "var(--font-outfit), sans-serif",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  mb: 1,
                  fontSize: { xs: "2rem", sm: "2.5rem" },
                }}
              >
                Login
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mb: 4,
                }}
              >
                Bitte Benutzername und Passwort eingeben.
              </Typography>

              <Stack spacing={2.5}>
                <Field name="name" label="Benutzername" component={TextField} fullWidth />
                <Field
                  name="password"
                  type="password"
                  label="Passwort"
                  component={TextField}
                  fullWidth
                />
              </Stack>

              <Box
                sx={{
                  mt: 4,
                  display: "flex",
                  flexDirection: { xs: "column-reverse", sm: "row" },
                  justifyContent: "flex-end",
                  gap: 1.5,
                }}
              >
                <Button
                  disabled={isSubmitting}
                  onClick={() => router.back()}
                  variant="outlined"
                  color="primary"
                  sx={{
                    px: 3.5,
                    py: 1.25,
                    textTransform: "none",
                    fontWeight: 600,
                    borderColor: "divider",
                    color: "text.primary",
                    width: { xs: "100%", sm: "auto" },
                    "&:hover": {
                      borderColor: "text.primary",
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  Abbrechen
                </Button>
                <Button
                  disabled={isSubmitting}
                  onClick={submitForm}
                  variant="contained"
                  color="primary"
                  sx={{
                    px: 3.5,
                    py: 1.25,
                    textTransform: "none",
                    fontWeight: 600,
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  Login
                </Button>
              </Box>
            </Paper>
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
