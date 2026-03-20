import Box from "@mui/material/Box";
import React from "react";
import { AppContext } from "../generic/AppContext";
import Dropdown from "./Dropdown";

interface EditButtonProps {
  session?: unknown;
  item?: unknown;
}

function EditButton(props: Readonly<EditButtonProps>) {
  const appContext = React.useContext(AppContext);
  const session = props.session ?? appContext.session;

  if (!session) return null;

  return (
    <Box sx={{ display: "inline-flex" }}>
      <Dropdown item={props.item} />
    </Box>
  );
}

export default EditButton;
