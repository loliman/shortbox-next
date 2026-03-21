import Box from "@mui/material/Box";
import React from "react";
import { useSnackbarBridge } from "../generic/useSnackbarBridge";
import Dropdown, { type DropdownItem } from "./Dropdown";
import type { AppRouteContextValue } from "../../app/routeContext";

interface EditButtonProps {
  session?: unknown;
  item?: unknown;
  routeContext: AppRouteContextValue;
  level?: string;
  us?: boolean;
  enqueueSnackbar?: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
}

function EditButton(props: Readonly<EditButtonProps>) {
  const snackbarBridge = useSnackbarBridge();
  const session = props.session;

  if (!session) return null;

  return (
    <Box sx={{ display: "inline-flex" }}>
      <Dropdown
        item={props.item as DropdownItem | null | undefined}
        level={props.level}
        us={props.us}
        session={session}
        enqueueSnackbar={props.enqueueSnackbar ?? snackbarBridge.enqueueSnackbar}
        routeContext={props.routeContext}
      />
    </Box>
  );
}

export default EditButton;
