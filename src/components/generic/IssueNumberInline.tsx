import React from "react";
import Box from "@mui/material/Box";
import { getLegacyNumberLabel } from "../../lib/routes/issue-presentation";

type IssueNumberInlineProps = {
  number?: string | number | null;
  legacy_number?: string | null;
  prefix?: string;
  suffix?: React.ReactNode;
};

export function IssueNumberInline(props: Readonly<IssueNumberInlineProps>) {
  const number = props.number == null ? "" : String(props.number);
  const legacyLabel = getLegacyNumberLabel({ legacy_number: props.legacy_number });

  if (!number && !legacyLabel) return null;

  return (
    <Box
      component="span"
      sx={{
        display: "inline",
        whiteSpace: "nowrap",
        color: "inherit",
      }}
    >
      {number ? (
        <Box component="span" sx={{ display: "inline", ml: 0.5 }}>
          {`${props.prefix || "#"}${number}`}
        </Box>
      ) : null}
      {props.suffix ? (
        <Box component="span" sx={{ display: "inline", ml: 0.5 }}>
          {props.suffix}
        </Box>
      ) : null}
      {legacyLabel ? (
        <Box
          component="span"
          sx={{
            display: "inline",
            ml: 0.5,
            color: "text.secondary",
            fontSize: "0.85em",
            fontWeight: 400,
          }}
        >
          {legacyLabel}
        </Box>
      ) : null}
    </Box>
  );
}

type IssueReferenceInlineProps = {
  seriesLabel?: string;
  number?: string | number | null;
  legacy_number?: string | null;
  prefix?: string;
  suffix?: React.ReactNode;
};

export function IssueReferenceInline(props: Readonly<IssueReferenceInlineProps>) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline",
        color: "inherit",
      }}
    >
      {props.seriesLabel ? <Box component="span" sx={{ display: "inline" }}>{props.seriesLabel}</Box> : null}
      <IssueNumberInline
        number={props.number}
        legacy_number={props.legacy_number}
        prefix={props.prefix}
        suffix={props.suffix}
      />
    </Box>
  );
}
