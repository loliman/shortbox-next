import React from "react";
import Box from "@mui/material/Box";
import { getLegacyNumberLabel } from "../../util/issuePresentation";

type IssueNumberInlineProps = {
  number?: string | number | null;
  legacy_number?: string | null;
  prefix?: string;
};

export function IssueNumberInline(props: Readonly<IssueNumberInlineProps>) {
  const number = props.number !== undefined && props.number !== null ? String(props.number) : "";
  const legacyLabel = getLegacyNumberLabel({ legacy_number: props.legacy_number });

  if (!number && !legacyLabel) return null;

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 0.75,
        minWidth: 0,
        flexWrap: "wrap",
      }}
    >
      {number ? <Box component="span">{`${props.prefix || "#"}${number}`}</Box> : null}
      {legacyLabel ? (
        <Box
          component="span"
          sx={{
            color: "text.secondary",
            opacity: 0.72,
            fontSize: "0.85em",
            fontWeight: 400,
            whiteSpace: "nowrap",
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
};

export function IssueReferenceInline(props: Readonly<IssueReferenceInlineProps>) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 0.75,
        minWidth: 0,
        flexWrap: "wrap",
      }}
    >
      {props.seriesLabel ? <Box component="span">{props.seriesLabel}</Box> : null}
      <IssueNumberInline
        number={props.number}
        legacy_number={props.legacy_number}
        prefix={props.prefix}
      />
    </Box>
  );
}
