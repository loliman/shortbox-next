import React from "react";
import Chip from "@mui/material/Chip";
import type { SxProps, Theme } from "@mui/material/styles";
import type { PreviewIssue, IssuePreviewFlags } from "./utils/issuePreviewUtils";

interface IssuePreviewChipsProps {
  issue: PreviewIssue;
  flags: IssuePreviewFlags;
  us: boolean;
  chipSx?: SxProps<Theme>;
}

export function IssuePreviewChips(props: Readonly<IssuePreviewChipsProps>) {
  const { flags, us, chipSx } = props;

  const chips: React.ReactElement[] = [];

  if (flags.collected) {
    chips.push(<Chip key="collected" size="small" label="Gesammelt" color="success" sx={chipSx} />);
  }

  if (flags.collectedMultipleTimes) {
    chips.push(
      <Chip
        key="collected-multiple"
        size="small"
        label="Mehrfach gesammelt"
        color="success"
        variant="outlined"
        sx={chipSx}
      />
    );
  }

  if (!us && flags.hasOnlyApp) {
    chips.push(
      <Chip
        key="only-app"
        size="small"
        label="Einzige Veröffentlichung"
        color="secondary"
        sx={chipSx}
      />
    );
  }

  if (!us && !flags.hasOnlyApp && flags.hasFirstApp) {
    chips.push(
      <Chip
        key="first-app"
        size="small"
        label="Erstveröffentlichung"
        color="secondary"
        variant="outlined"
        sx={chipSx}
      />
    );
  }

  if (!us && flags.hasExclusive) {
    chips.push(
      <Chip
        key="exclusive"
        size="small"
        label="Exklusiver Inhalt"
        color="secondary"
        sx={chipSx}
      />
    );
  }

  if (!us && flags.hasOtherOnlyTb) {
    chips.push(
      <Chip
        key="other-only-tb"
        size="small"
        label="Sonst nur in Taschenbuch"
        variant="outlined"
        sx={chipSx}
      />
    );
  }

  if (!us && flags.isPureReprintDe) {
    chips.push(
      <Chip
        key="reprint"
        size="small"
        label="Nachdruck"
        variant="outlined"
        sx={chipSx}
      />
    );
  }

  return <>{chips}</>;
}
