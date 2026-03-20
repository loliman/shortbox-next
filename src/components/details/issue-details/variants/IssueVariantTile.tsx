import React from "react";
import Link from "next/link";
import ImageListItemBar from "@mui/material/ImageListItemBar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import ButtonBase from "@mui/material/ButtonBase";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import { getIssueUrl } from "../../../../util/issuePresentation";
import type { VariantIssue } from "./types";

type IssueVariantTileProps = {
  issue: VariantIssue;
  variant: VariantIssue;
  us: boolean;
  selected?: boolean;
  hasStories?: boolean;
  edge?: "single" | "start" | "middle" | "end";
  session?: unknown;
};

export function IssueVariantTile(props: Readonly<IssueVariantTileProps>) {
  const { coverUrl, blurCover } = getVariantCoverSource(props.variant);
  const fallbackUrl = "/nocover_simple.png";
  const [displayUrl, setDisplayUrl] = React.useState(coverUrl);
  const isFallbackCover = displayUrl === fallbackUrl;
  const selected =
    props.selected ??
    (props.issue.format === props.variant.format && props.issue.variant === props.variant.variant);
  const showBookmark = Boolean(props.session) && Boolean(props.hasStories);
  const showCollected = Boolean(props.session) && Boolean(props.variant.collected);
  const showVerified = Boolean(props.variant.verified);
  const variantLabel =
    (props.variant.format || "") +
    " (" +
    (props.variant.variant ? props.variant.variant + " Variant" : "Reguläre Ausgabe") +
    ")";
  const issueUrl = getIssueUrl(props.variant, props.us);

  React.useEffect(() => {
    setDisplayUrl(coverUrl);
  }, [coverUrl]);

  return (
    <Box
      sx={{
        borderRadius:
          props.edge === "single"
            ? "10px"
            : props.edge === "start"
              ? "10px 0 0 10px"
              : props.edge === "end"
                ? "0 10px 10px 0"
                : "0",
        overflow: "hidden",
        position: "relative",
        height: "100%",
        transition: "box-shadow 180ms ease",
        border: (theme) => `1px solid ${theme.palette.divider}`,
        boxShadow: selected ? "inset 0 0 0 2px rgba(255,255,255,0.92)" : 1,
      }}
    >
      {showCollected || showVerified || showBookmark ? (
        <Box
          sx={{
            position: "absolute",
            top: 6,
            right: 6,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 0.5,
            pointerEvents: "none",
          }}
        >
          {showCollected ? (
            <Chip size="small" label="Gesammelt" color="success" />
          ) : null}
          {showVerified ? (
            <Chip size="small" label="Verifiziert" color="info" />
          ) : null}
          {showBookmark ? (
            <Box component="span" sx={statusChipSx} title="Eigene Stories" aria-label="Eigene Stories">
              <BookmarkIcon
                sx={(theme) => ({
                  ...outlinedStatusIconSx,
                  fontSize: 18,
                  color: theme.palette.mode === "dark" ? "common.white" : "text.primary",
                })}
              />
            </Box>
          ) : null}
        </Box>
      ) : null}

      <ButtonBase
        component={Link}
        href={issueUrl}
        aria-label={`Zu ${variantLabel}`}
        sx={{ width: "100%", height: "100%", display: "block", textAlign: "left" }}
      >
        <Box
          component="img"
          src={displayUrl}
          alt={variantLabel}
          onError={() => {
            setDisplayUrl((prev) => (prev === fallbackUrl ? prev : fallbackUrl));
          }}
          sx={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: isFallbackCover ? "center 77%" : "center",
            filter: blurCover ? "blur(2px)" : "none",
          }}
        />

        <ImageListItemBar
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  minWidth: 0,
                  flex: 1,
                  fontWeight: selected ? 500 : 300,
                  color: selected ? "common.white" : "inherit",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {variantLabel}
              </Box>
            </Box>
          }
          sx={{
            background:
              "linear-gradient(to top, rgba(11, 23, 45, 0.88), rgba(11, 23, 45, 0.4) 65%, transparent)",
            "& .MuiImageListItemBar-titleWrap": {
              px: 1,
              py: 0.5,
            },
          }}
        />
      </ButtonBase>
    </Box>
  );
}

const outlinedStatusIconSx = {
  fontSize: 20,
  "& path": {
    stroke: "#000",
    strokeWidth: 1.2,
    paintOrder: "stroke fill",
  },
} as const;

const statusChipSx = (theme: { palette: { mode: string } }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: "50%",
  bgcolor: theme.palette.mode === "dark" ? "rgba(0,0,0,0.58)" : "rgba(255,255,255,0.84)",
  border: `1px solid ${
    theme.palette.mode === "dark" ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.24)"
  }`,
});

function getVariantCoverSource(variant: VariantIssue): { coverUrl: string; blurCover: boolean } {
  const directCover = variant.cover?.url?.trim();
  if (directCover) return { coverUrl: directCover, blurCover: false };

  return { coverUrl: "/nocover_simple.png", blurCover: false };
}
