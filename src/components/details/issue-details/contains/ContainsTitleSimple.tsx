"use client";

import React from "react";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import { generateLabel } from "../../../../util/hierarchy";
import { IssueReferenceInline } from "../../../generic/IssueNumberInline";
import type { SelectedRoot } from "../../../../types/domain";

type ContainsTitleSimpleItem = {
  addinfo?: string | null;
  number?: string | number | null;
  legacy_number?: string | null;
  series?: {
    title?: string;
    volume?: number;
    startyear?: number;
    publisher?: { name?: string };
  } | null;
  title?: string | null;
  onlyoneprint?: boolean;
  onlytb?: boolean;
  parent?: unknown;
  children?: unknown[] | null;
  reprintOf?: unknown;
  reprints?: unknown[] | null;
  collectedmultipletimes?: boolean;
  collected?: boolean;
};

type ContainsTitleSimpleProps = {
  item: ContainsTitleSimpleItem;
  us?: boolean;
  simple?: boolean;
  compactLayout?: boolean;
  isPhone?: boolean;
  isTablet?: boolean;
  isTabletLandscape?: boolean;
  drawerOpen?: boolean;
  session?: unknown;
};

export function ContainsTitleSimple(props: Readonly<ContainsTitleSimpleProps>) {
  const item = props.item;
  const stackActions =
    props.compactLayout ??
    Boolean(props.isPhone || (props.isTablet && !props.isTabletLandscape));
  const children = Array.isArray(item.children) ? item.children : [];
  const reprints = Array.isArray(item.reprints) ? item.reprints : [];
  const hasIssueReference = Boolean(item.series);
  const storyTitle = String(item.title || "").trim();
  const publicationFallback = buildPublicationFallback({
    childrenCount: children.length,
    us: Boolean(props.us),
  });
  const subtitleText = props.us ? publicationFallback : item.addinfo || "";
  const actionChips = buildSimpleActionChips({
    item,
    reprintsCount: reprints.length,
    hasSession: Boolean(props.session),
  });

  return (
    <Box
      data-testid="story-header"
      sx={
        stackActions
          ? {
              width: "100%",
              display: "block",
            }
          : {
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 1,
            }
      }
    >
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: "grid", rowGap: 0.3 }}>
          <Typography
            variant="overline"
            sx={{
              fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
              fontWeight: 500,
              fontSize: "0.7rem",
              lineHeight: 1.5,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "text.primary",
              opacity: 1,
            }}
          >
            {storyTitle === "" ? "Story" : storyTitle}
          </Typography>
          <Typography
            variant="subtitle1"
            component="div"
            sx={{
              fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
              fontSize: "1rem",
              lineHeight: 1.75,
              fontWeight: 700,
              color: "text.primary",
              letterSpacing: "0.01em",
              opacity: 1,
            }}
          >
            {hasIssueReference ? (
              <IssueReferenceInline
                seriesLabel={
                  item.series
                    ? generateLabel({ series: item.series as SelectedRoot["series"] })
                    : undefined
                }
                number={item.number}
                legacy_number={item.legacy_number}
              />
            ) : null}
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
              fontSize: "1rem",
              lineHeight: 1.75,
              fontWeight: 700,
              color: "text.primary",
              letterSpacing: "0.01em",
              opacity: 1,
            }}
          >
            {subtitleText || null}
          </Typography>
        </Box>

        {stackActions && actionChips.length > 0 ? (
          <Box
            sx={{
              mt: 1,
              pt: 0.75,
              display: "flex",
              flexWrap: "wrap",
              gap: 0.6,
              alignItems: "center",
            }}
          >
            {actionChips}
          </Box>
        ) : null}
      </Box>

      {!stackActions ? (
        <Box
          sx={{
            ml: "auto",
            alignSelf: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: 0.6,
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          {actionChips}
        </Box>
      ) : null}
    </Box>
  );
}

function buildPublicationFallback({
  childrenCount,
  us,
}: {
  childrenCount: number;
  us: boolean;
}): string {
  if (!us) return "Story";
  if (childrenCount <= 0) return "Nicht auf deutsch erschienen";
  if (childrenCount === 1) return "Einfach auf deutsch erschienen";

  return "Mehrfach auf deutsch erschienen";
}

function buildSimpleActionChips({
  item,
  reprintsCount,
  hasSession,
}: {
  item: ContainsTitleSimpleItem;
  reprintsCount: number;
  hasSession: boolean;
}): React.ReactElement[] {
  const chips: React.ReactElement[] = [];

  if (item.onlytb && !item.parent) {
    chips.push(<Chip key="onlytb" label="Nur in Taschenbuch" color="primary" />);
  }

  /*if (us && childrenCount === 0) {
    chips.push(<Chip key="notpublished" label="Nicht auf deutsch erschienen" color="default" />);
  }*/

  if (item.reprintOf) {
    chips.push(<Chip key="reprintof" label="Nachdruck" color="default" />);
  }

  if (reprintsCount > 0) {
    chips.push(<Chip key="reprints" label="Nachgedruckt" color="default" />);
  }

  if (item.collectedmultipletimes && hasSession) {
    chips.push(
      <Chip key="collectedmultiple" color="success" label="Mehrfach auf deutsch gesammelt" />
    );
  }

  if (!item.collectedmultipletimes && item.collected && hasSession) {
    chips.push(<Chip key="collected" color="success" label="Auf deutsch gesammelt" />);
  }

  return chips;
}
