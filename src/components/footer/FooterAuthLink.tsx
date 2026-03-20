import Button from "@mui/material/Button";
import Link from "next/link";
import { isMockMode } from "../../app/mockMode";
import { mutationRequest } from "../../lib/client/mutation-request";

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
  return (
    <Button
      type="button"
      variant="text"
      size="small"
      color="inherit"
      sx={authButtonSx}
      onClick={async () => {
        if (isMockMode) {
          props.enqueueSnackbar?.("Auf Wiedersehen!", { variant: "success" });
          props.handleLogout?.();
          return;
        }

        try {
          const result = await mutationRequest<{ success?: boolean }>({
            url: "/api/auth/logout",
            method: "POST",
          });

          if (!result.success) {
            props.enqueueSnackbar?.("Logout fehlgeschlagen", { variant: "error" });
            return;
          }

          props.enqueueSnackbar?.("Auf Wiedersehen!", { variant: "success" });
          props.handleLogout?.();
        } catch (error) {
          const message = error instanceof Error && error.message ? ` [${error.message}]` : "";
          props.enqueueSnackbar?.("Logout fehlgeschlagen" + message, { variant: "error" });
        }
      }}
    >
      Logout
    </Button>
  );
}
