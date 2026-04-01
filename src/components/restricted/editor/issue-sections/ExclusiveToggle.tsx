import React from "react";
import FormControlLabel from "@mui/material/FormControlLabel";
import { ContrastSwitch } from "../../../generic/ContrastSwitch";
import type { ContainsProps } from "./types";

interface ExclusiveToggleProps extends ContainsProps {
  type: "stories";
  index?: number;
}

function ExclusiveToggle(props: ExclusiveToggleProps) {
  const index = Number.isInteger(props.index) ? (props.index as number) : 0;
  const item = (props.items || [])[index] || {};

  return (
    <FormControlLabel
      sx={{ m: 0 }}
      control={
        <ContrastSwitch
          checked={Boolean(item.exclusive)}
          onChange={() => {
            if (!props.setFieldValue) return;

            const nextItem = structuredClone(item);

            if (item.exclusive) {
              nextItem.individuals = undefined;
              if (props.type === "stories") nextItem.appearances = undefined;
              nextItem.parent = { issue: { series: { title: "" } } };
              nextItem.exclusive = false;
            } else {
              nextItem.individuals = [];
              if (props.type === "stories") nextItem.appearances = [];
              nextItem.parent = undefined;
              nextItem.exclusive = true;
            }

            props.setFieldValue(`${props.type}[${index}]`, nextItem);
          }}
          value="exclusive"
        />
      }
      label="exklusiv"
    />
  );
}

export default ExclusiveToggle;
