import React from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import { login } from "../graphql/mutationsTyped";
import { useApolloClient, useMutation } from "@apollo/client";
import { Field, Form, Formik } from "formik";
import { TextField } from "./generic/FormikTextField";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { LoginSchema } from "../util/yupSchema";
import { isMockMode } from "../app/mockMode";
import { AppContext } from "./generic/AppContext";
import { useSnackbarBridge } from "./generic/useSnackbarBridge";

interface LoginProps {
  enqueueSnackbar: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
  handleLogin: (user: any) => void;
}

function LoginView(props: Readonly<LoginProps>) {
  const router = useRouter();
  const client = useApolloClient();
  const [runLogin] = useMutation(login, {
    onCompleted: (data) => {
      props.enqueueSnackbar("Willkommen!", { variant: "success" });
      props.handleLogin(data.login);
      client.resetStore();
      router.back();
    },
    onError: (errors) => {
      let message =
        errors.graphQLErrors && errors.graphQLErrors.length > 0
          ? " [" + errors.graphQLErrors[0].message + "]"
          : "";
      props.enqueueSnackbar("Login fehlgeschlagen" + message, { variant: "error" });
    },
  });

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
          props.handleLogin({ loggedIn: true });
          client.resetStore();
          router.back();
          actions.setSubmitting(false);
          return;
        }

        await runLogin({
          variables: {
            credentials: {
              name: values.name,
              password: values.password,
            },
          },
        });

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
  const appContext = React.useContext(AppContext);
  const snackbarBridge = useSnackbarBridge();

  return <LoginView {...appContext} {...snackbarBridge} />;
}
