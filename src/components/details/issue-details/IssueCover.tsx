import React from "react";
import CardMedia from "@mui/material/CardMedia";
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import type { PreviewIssue } from "../../issue-preview/utils/issuePreviewUtils";
import { getIssueLabel } from "../../../util/issuePresentation";

type IssueCoverProps = {
  issue: PreviewIssue;
  us: boolean;
};

export function IssueCover(props: Readonly<IssueCoverProps>) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { coverUrl, blurCover } = getIssueCoverSource(props.issue, props.us);
  const [displayUrl, setDisplayUrl] = React.useState(coverUrl);
  const issueLabel = getIssueLabel(props.issue);
  const fallbackUrl = "/nocover.png";

  React.useEffect(() => {
    setDisplayUrl(coverUrl);
  }, [coverUrl]);

  return (
    <React.Fragment>
      <ButtonBase
        onClick={() => setIsOpen(true)}
        aria-label={`${issueLabel} Cover vergrößern`}
        sx={{
          width: "100%",
          height: "100%",
          borderRadius: (theme) => `${Number(theme.shape.borderRadius) || 12}px`,
          overflow: "hidden",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#000000" : theme.palette.grey[300]),
          border: (theme) => `1px solid ${theme.palette.divider}`,
          boxShadow: 1,
          cursor: "zoom-in",
          display: "block",
        }}
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
          backdrop: {
            sx: {
              backgroundColor: "rgba(0, 0, 0, 0.88)",
            },
          },
        }}
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
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "#000000" : theme.palette.grey[200]),
          }}
        />
      </Dialog>
    </React.Fragment>
  );
}

function getIssueCoverSource(
  issue: PreviewIssue,
  _us: boolean
): { coverUrl: string; blurCover: boolean } {
  const directCover = issue.cover?.url?.trim();
  if (directCover) return { coverUrl: directCover, blurCover: false };

  return { coverUrl: "/nocover.png", blurCover: false };
}
