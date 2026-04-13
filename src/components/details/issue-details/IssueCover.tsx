"use client";

import React from "react";
import CardMedia from "@mui/material/CardMedia";
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import type { PreviewIssue } from "../../issue-preview/utils/issuePreviewUtils";
import { getIssueLabel } from "../../../lib/routes/issue-presentation";
import { getPreferredCoverUrl } from "../../generic/coverUrl";

type IssueCoverProps = {
  issue: PreviewIssue;
  us: boolean;
  embedded?: boolean;
};

export function IssueCover(props: Readonly<IssueCoverProps>) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { coverUrl, blurCover } = getIssueCoverSource(props.issue);
  const [displayUrl, setDisplayUrl] = React.useState(coverUrl);
  const issueLabel = getIssueLabel(props.issue);
  const fallbackUrl = "/nocover.png";
  const embedded = Boolean(props.embedded);

  React.useEffect(() => {
    setDisplayUrl(coverUrl);
  }, [coverUrl]);

  return (
    <React.Fragment>
      <ButtonBase
        onClick={() => setIsOpen(true)}
        aria-label={`${issueLabel} Cover vergrößern`}
        sx={(theme) => ({
          width: "100%",
          height: "100%",
          borderRadius: embedded ? 0 : `${Number(theme.shape.borderRadius) || 12}px`,
          overflow: "hidden",
          backgroundColor: theme.vars?.palette.background.paper ?? theme.palette.background.paper,
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(244,246,248,0.9) 100%)",
          border: embedded ? "none" : `1px solid ${theme.vars?.palette.divider ?? theme.palette.divider}`,
          boxShadow: embedded ? "none" : theme.shadows[2],
          cursor: "zoom-in",
          display: "block",
          transition:
            "background-color 180ms ease, background-image 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
          ...theme.applyStyles("dark", {
            backgroundColor: "#0b0b0c",
            backgroundImage:
              "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)",
            boxShadow: "0 10px 28px rgba(0,0,0,0.42)",
          }),
        })}
      >
        <CardMedia
          component="img"
          image={displayUrl}
          alt={issueLabel}
          title={issueLabel}
          onError={() => {
            setDisplayUrl((prev) => (prev === fallbackUrl ? prev : fallbackUrl));
          }}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center",
            filter: blurCover ? "blur(2px)" : "none",
          }}
        />
      </ButtonBase>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="md"
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "transparent",
              backgroundImage: "none",
              boxShadow: "none",
            },
          },
          backdrop: {
            sx: {
              backgroundColor: "rgba(0, 0, 0, 0.88)",
            },
          },
        }}
      >
        <Box
          sx={(theme) => ({
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 1,
            borderRadius: (Number(theme.shape.borderRadius) || 12) + 2,
            backgroundColor: theme.vars?.palette.background.paper ?? theme.palette.background.paper,
            backgroundImage:
              "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(244,246,248,0.92) 100%)",
            border: `1px solid ${theme.vars?.palette.divider ?? theme.palette.divider}`,
            ...theme.applyStyles("dark", {
              backgroundColor: "#0b0b0c",
              backgroundImage:
                "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
            }),
          })}
        >
          <Box
            component="img"
            src={displayUrl}
            alt={issueLabel}
            onError={() => {
              setDisplayUrl((prev) => (prev === fallbackUrl ? prev : fallbackUrl));
            }}
            sx={{
              display: "block",
              maxWidth: "min(90vw, 960px)",
              maxHeight: "85vh",
              width: "auto",
              height: "auto",
              objectFit: "contain",
            }}
          />
        </Box>
      </Dialog>
    </React.Fragment>
  );
}

function getIssueCoverSource(issue: PreviewIssue): { coverUrl: string; blurCover: boolean } {
  const coverUrl = getPreferredCoverUrl(issue);
  if (coverUrl) return { coverUrl, blurCover: false };

  return { coverUrl: "/nocover.png", blurCover: false };
}
