"use client";

import React from "react";
import Link from "next/link";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import { useResolvedImageUrl } from "../generic/useResolvedImageUrl";
import { useNearViewport } from "../generic/useNearViewport";
import { buildRouteHref } from "../generic/routeHref";
import { getIssueLabel, getIssueUrl } from "../../lib/routes/issue-presentation";
import {
  getIssuePreviewCover,
  getIssuePreviewFlags,
  getIssueVariantLabel,
  type PreviewIssue,
} from "./utils/issuePreviewUtils";
import { IssuePreviewChips } from "./IssuePreviewChips";
import { usePreviewNavigation } from "./previewNavigation";

interface IssuePreviewSmallProps {
  issue: PreviewIssue;
  us?: boolean;
  session?: unknown;
  query?: Record<string, unknown> | null;
  idx?: number;
  isLast?: boolean;
}

const NO_COVER_URL = "/nocover_preview.png";

export default function IssuePreviewSmall(props: Readonly<IssuePreviewSmallProps>) {
  const us = Boolean(props.us);
  const hasSession = Boolean(props.session);
  const variant = getIssueVariantLabel(props.issue);
  const { coverUrl } = getIssuePreviewCover(props.issue);
  const candidateCoverUrl = coverUrl?.trim() ? coverUrl : NO_COVER_URL;
  const { isNearViewport, setElement } = useNearViewport();
  const { resolvedUrl: effectiveCoverUrl, isLoading: isCoverLoading } = useResolvedImageUrl(
    candidateCoverUrl,
    NO_COVER_URL,
    { enabled: isNearViewport }
  );
  const usesFallbackCover = effectiveCoverUrl === NO_COVER_URL;
  const flags = getIssuePreviewFlags(props.issue, us, hasSession);
  const url = buildRouteHref(getIssueUrl(props.issue, us), props.query);
  const issueLabel = getIssueLabel(props.issue);
  const { isNavigating, handleClick } = usePreviewNavigation(url);
  let backgroundImage = `url(${effectiveCoverUrl})`;
  if (isCoverLoading) {
    backgroundImage =
      "linear-gradient(110deg, rgba(0, 0, 0, 0.04) 25%, rgba(0, 0, 0, 0.14) 50%, rgba(0, 0, 0, 0.04) 75%)";
  } else if (usesFallbackCover) {
    backgroundImage = `linear-gradient(rgba(255,255,255,0.08), rgba(255,255,255,0.08)), url(${NO_COVER_URL})`;
  }
  let darkBackgroundImage = `url(${effectiveCoverUrl})`;
  if (isCoverLoading) {
    darkBackgroundImage =
      "linear-gradient(110deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.04) 75%)";
  } else if (usesFallbackCover) {
    darkBackgroundImage = `linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.08)), url(${NO_COVER_URL})`;
  }
  const coverOverlay =
    effectiveCoverUrl === NO_COVER_URL
      ? {
          content: '""',
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(0,0,0,0.06), rgba(0,0,0,0) 45%)",
        }
      : undefined;
  const darkCoverOverlay =
    effectiveCoverUrl === NO_COVER_URL
      ? {
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 45%)",
        }
      : undefined;

  return (
    <Card
      ref={setElement}
      sx={(theme) => ({
        backgroundColor: "background.paper",
        overflow: "hidden",
        position: "relative",
        border: "1px solid",
        borderColor: "rgba(0,0,0,0.08)",
        transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, opacity 180ms ease",
        opacity: isNavigating ? 0.76 : 1,
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: theme.shadows[6],
          borderColor: "rgba(0,0,0,0.18)",
        },
        ...theme.applyStyles("dark", {
          backgroundColor: "rgba(16, 16, 16, 0.96)",
          borderColor: "rgba(255,255,255,0.08)",
          "&:hover": {
            borderColor: "rgba(255,255,255,0.18)",
          },
        }),
      })}
    >
      <CardActionArea
        component={Link}
        href={url}
        aria-busy={isNavigating}
        onClick={handleClick}
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "stretch",
          transform: isNavigating ? "scale(0.992)" : "scale(1)",
          transition: "transform 180ms ease",
        }}
      >
        <CardContent sx={{ display: "flex", flexDirection: "column", flex: 1, p: 0, minWidth: 0 }}>
          <Box
            sx={(theme) => ({
              position: "relative",
              aspectRatio: "1 / 1.5",
              width: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.04)",
              backgroundImage,
              backgroundRepeat: "no-repeat",
              backgroundPosition: isCoverLoading ? "200% 0" : "center",
              backgroundSize: isCoverLoading ? "220% 100%" : "cover",
              animation: isCoverLoading ? "coverShimmer 1.4s ease-in-out infinite" : undefined,
              "@keyframes coverShimmer": {
                "0%": { backgroundPosition: "220% 0" },
                "100%": { backgroundPosition: "-20% 0" },
              },
              "&::after": coverOverlay,
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 12% 14%, rgba(255,255,255,0.18), rgba(255,255,255,0) 38%)",
                mixBlendMode: "multiply",
                opacity: 0.45,
                pointerEvents: "none",
              },
              ...theme.applyStyles("dark", {
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                backgroundImage: darkBackgroundImage,
                "&::after": darkCoverOverlay,
                "&::before": {
                  mixBlendMode: "screen",
                },
              }),
            })}
          >
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                p: 1.25,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(5,7,10,0.92) 100%)",
              }}
            >
              <Stack spacing={0.4} sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  noWrap
                  sx={{
                    fontSize: "clamp(0.78rem, 0.7rem + 0.35vw, 1.05rem)",
                    display: "block",
                    minWidth: 0,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontWeight: 700,
                    color: "#ffffff",
                    textShadow: "0 1px 2px rgba(0,0,0,0.7)",
                  }}
                >
                  {issueLabel}
                </Typography>

                {variant ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{
                      fontSize: "clamp(0.6rem, 0.56rem + 0.18vw, 0.78rem)",
                      color: "rgba(255,255,255,0.78)",
                    }}
                  >
                    {variant}
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          </Box>

          <Box
            sx={(theme) => ({
              display: "flex",
              flexWrap: "nowrap",
              gap: 0.75,
              minHeight: 56,
              alignItems: "center",
              marginTop: "auto",
              px: 1.5,
              py: 1.25,
              overflow: "hidden",
              backgroundColor: "rgba(228, 228, 228, 0.58)",
              ...theme.applyStyles("dark", {
                backgroundColor: "rgba(24, 24, 24, 0.84)",
              }),
            })}
          >
            <IssuePreviewChips issue={props.issue} flags={flags} us={us} chipSx={SINGLE_LINE_CHIP_SX} />
          </Box>
        </CardContent>
      </CardActionArea>
      {isNavigating ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.18)",
            backdropFilter: "blur(2px)",
            pointerEvents: "none",
          }}
        >
          <CircularProgress size={26} sx={{ color: "#ffffff" }} />
        </Box>
      ) : null}
    </Card>
  );
}

export function IssuePreviewPlaceholderSmall(props: Readonly<{ idx?: number; isLast?: boolean }>) {
  const widths = ["84%", "72%", "68%", "78%", "62%"] as const;
  const width = widths[(props.idx ?? 0) % widths.length];

  return (
    <Card
      sx={(theme) => ({
        overflow: "hidden",
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "rgba(0,0,0,0.08)",
        ...theme.applyStyles("dark", {
          backgroundColor: "rgba(16, 16, 16, 0.96)",
          borderColor: "rgba(255,255,255,0.08)",
        }),
      })}
    >
      <CardActionArea
        component="div"
        sx={{ height: "100%", display: "flex", alignItems: "stretch" }}
      >
        <CardContent sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, p: 0 }}>
          <Box
            sx={(theme) => ({
              position: "relative",
              aspectRatio: "1 / 1.5",
              width: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.04)",
              backgroundImage:
                "linear-gradient(120deg, rgba(0,0,0,0.06), rgba(0,0,0,0.02))",
              ...theme.applyStyles("dark", {
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                backgroundImage:
                  "linear-gradient(120deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
              }),
            })}
          >
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                p: 1.25,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(5,7,10,0.92) 100%)",
              }}
            >
              <Skeleton
                variant="text"
                width={width}
                height={26}
                sx={(theme) => ({
                  bgcolor: "rgba(0,0,0,0.18)",
                  ...theme.applyStyles("dark", {
                    bgcolor: "rgba(255,255,255,0.2)",
                  }),
                })}
              />
              <Skeleton
                variant="text"
                width="42%"
                height={18}
                sx={(theme) => ({
                  bgcolor: "rgba(0,0,0,0.14)",
                  ...theme.applyStyles("dark", {
                    bgcolor: "rgba(255,255,255,0.16)",
                  }),
                })}
              />
            </Box>
          </Box>
          <Box
            sx={(theme) => ({
              display: "flex",
              flexWrap: "nowrap",
              gap: 0.75,
              minHeight: 56,
              alignItems: "center",
              marginTop: "auto",
              px: 1.5,
              py: 1.25,
              overflow: "hidden",
              backgroundColor: "rgba(228, 228, 228, 0.58)",
              ...theme.applyStyles("dark", {
                backgroundColor: "rgba(24, 24, 24, 0.84)",
              }),
            })}
          >
            <Skeleton variant="rounded" width={96} height={24} />
            <Skeleton variant="rounded" width={104} height={24} />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

const SINGLE_LINE_CHIP_SX = {
  minWidth: 0,
  maxWidth: "100%",
  flexShrink: 1,
  "& .MuiChip-label": {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontSize: "clamp(0.54rem, 0.5rem + 0.15vw, 0.72rem)",
  },
} as const;
