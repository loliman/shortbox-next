import Button from "@mui/material/Button";
import Link from "next/link";
import { useApolloClient, useMutation } from "@apollo/client";
import { logout } from "../../graphql/mutationsTyped";
import { isMockMode } from "../../app/mockMode";

type FooterAuthLinkProps = {
  loggedIn?: boolean;
  enqueueSnackbar?: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
  handleLogout?: () => void;
};

const authButtonSx = { px: 0.75, color: "text.secondary", minWidth: 0 };

export default function FooterAuthLink(props: Readonly<FooterAuthLinkProps>) {
  if (!props.loggedIn) {
    return (
      <Button
        component={Link}
        variant="text"
        size="small"
        color="inherit"
        sx={authButtonSx}
        href="/login"
      >
        Login
      </Button>
    );
  }

  return <LogoutLink {...props} />;
}

function LogoutLink(props: Readonly<FooterAuthLinkProps>) {
  const client = useApolloClient();
  const [runLogout] = useMutation(logout, {
    onCompleted: (data) => {
      if (!data.logout) {
        props.enqueueSnackbar?.("Logout fehlgeschlagen", { variant: "error" });
      } else {
        props.enqueueSnackbar?.("Auf Wiedersehen!", { variant: "success" });
        client.resetStore();
        props.handleLogout?.();
      }
    },
    onError: (errors) => {
      const message =
        errors.graphQLErrors && errors.graphQLErrors.length > 0
          ? " [" + errors.graphQLErrors[0].message + "]"
          : "";
      props.enqueueSnackbar?.("Logout fehlgeschlagen" + message, { variant: "error" });
    },
  });

  return (
    <Button
      type="button"
      variant="text"
      size="small"
      color="inherit"
      sx={authButtonSx}
      onClick={() => {
        if (isMockMode) {
          props.enqueueSnackbar?.("Auf Wiedersehen!", { variant: "success" });
          client.resetStore();
          props.handleLogout?.();
          return;
        }

        runLogout();
      }}
    >
      Logout
    </Button>
  );
}
