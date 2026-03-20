import React from "react";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import Tooltip from "@mui/material/Tooltip";
import type { ContainsProps } from "./types";

interface RemoveContainsButtonProps extends ContainsProps {
  type: "stories";
  index: number;
}

function RemoveContainsButton(props: RemoveContainsButtonProps) {
  return (
    <Tooltip title="Geschichte entfernen">
      <span>
        <IconButton
          disabled={props.disabled}
          aria-label="Entfernen"
          color="inherit"
          size="small"
          sx={{ color: "text.secondary" }}
          onClick={() => {
            if (!props.setFieldValue || !props.items) return;

            props.setFieldValue(
              props.type,
              props.items.filter((_, itemIndex) => itemIndex !== props.index),
              true
            );
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default RemoveContainsButton;
