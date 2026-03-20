import Box from "@mui/material/Box";
import React from "react";
import { AppContext } from "../generic/AppContext";
import Dropdown from "./Dropdown";
import type { AppRouteContextValue } from "../../app/routeContext";

interface EditButtonProps {
  session?: unknown;
  item?: unknown;
  routeContext?: AppRouteContextValue;
  level?: string;
  us?: boolean;
}

function EditButton(props: Readonly<EditButtonProps>) {
  const appContext = React.useContext(AppContext);
  const session = props.session ?? appContext.session;

  if (!session) return null;

  return (
    <Box sx={{ display: "inline-flex" }}>
      <Dropdown
        item={props.item}
        level={props.level}
        us={props.us}
        routeContext={props.routeContext}
      />
    </Box>
  );
}

export default EditButton;
