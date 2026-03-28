"use client";

import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import React from "react";
import { getPreferredCoverUrl } from "../generic/coverUrl";

type CoverTooltipIssue = {
  cover?: { url?: string | null } | null;
  comicguideid?: string | number | null;
  series?: { publisher?: { us?: boolean | null; name?: string | null } | null } | null;
};

type CoverTooltipProps = {
  issue: CoverTooltipIssue;
  children: React.ReactElement;
  us?: boolean;
  number?: string | number;
};

function getCoverSource(issue: CoverTooltipIssue): { coverUrl: string; blurCover: boolean } {
  const coverUrl = getPreferredCoverUrl(issue);
  if (coverUrl) return { coverUrl, blurCover: false };

  return { coverUrl: "/nocover.png", blurCover: false };
}

function CoverTooltip(props: Readonly<CoverTooltipProps>) {
  const { coverUrl, blurCover } = getCoverSource(props.issue);
  const fallbackUrl = "/nocover.png";
  const [displayUrl, setDisplayUrl] = React.useState(coverUrl);

  React.useEffect(() => {
    setDisplayUrl(coverUrl);
  }, [coverUrl]);

  return (
    <Tooltip
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: "transparent",
            p: 0,
            boxShadow: "none",
            m: 0.5,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            overflow: "hidden",
          },
        },
      }}
      title={
        <Box
          component="img"
          src={displayUrl}
          onError={() => {
            setDisplayUrl((prev) => (prev === fallbackUrl ? prev : fallbackUrl));
          }}
          sx={{
            width: 65,
            display: "block",
            filter: blurCover ? "blur(2px)" : "none",
            boxShadow: 2,
            backgroundColor: "background.paper",
          }}
          alt="Zur Ausgabe"
        />
      }
    >
      {props.children}
    </Tooltip>
  );
}

export default CoverTooltip;
