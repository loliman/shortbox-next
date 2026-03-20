import React from "react";
import Link from "next/link";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { useResolvedImageUrl } from "../generic/useResolvedImageUrl";
import { getIssueLabel, getIssueUrl } from "../../util/issuePresentation";
import {
  getIssuePreviewCover,
  getIssuePreviewFlags,
  getIssueVariantLabel,
  type PreviewIssue,
} from "./utils/issuePreviewUtils";
import { IssuePreviewChips } from "./IssuePreviewChips";

interface IssuePreviewSmallProps {
  issue: PreviewIssue;
  us?: boolean;
  session?: unknown;
  idx?: number;
  isLast?: boolean;
}

const NO_COVER_URL = `${import.meta.env.BASE_URL}nocover.png`;

export default function IssuePreviewSmall(props: Readonly<IssuePreviewSmallProps>) {
  const us = Boolean(props.us);
  const hasSession = Boolean(props.session);
  const variant = getIssueVariantLabel(props.issue);
  const { coverUrl } = getIssuePreviewCover(props.issue, us);
  const candidateCoverUrl = coverUrl?.trim() ? coverUrl : NO_COVER_URL;
  const { resolvedUrl: effectiveCoverUrl, isLoading: isCoverLoading } = useResolvedImageUrl(
    candidateCoverUrl,
    NO_COVER_URL
  );
  const flags = getIssuePreviewFlags(props.issue, us, hasSession);
  const url = getIssueUrl(props.issue, us);
  const issueLabel = getIssueLabel(props.issue);

  return (
    <Card
      sx={(theme) => ({
        backgroundColor:
          theme.palette.mode === "dark" ? "rgba(16, 16, 16, 0.96)" : "background.paper",
        overflow: "hidden",
        border: "1px solid",
        borderColor:
          theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: theme.shadows[6],
          borderColor:
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)",
        },
      })}
    >
      <CardActionArea
        component={Link}
        href={url}
        aria-label={`Zu ${issueLabel}`}
        sx={{ height: "100%", display: "flex", alignItems: "stretch" }}
      >
        <CardContent sx={{ display: "flex", flexDirection: "column", flex: 1, p: 0, minWidth: 0 }}>
          <Box
            sx={(theme) => ({
              position: "relative",
              aspectRatio: "1 / 1.5",
              width: "100%",
              backgroundColor:
                theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.04)",
              backgroundImage: isCoverLoading
                ? theme.palette.mode === "dark"
                  ? "linear-gradient(110deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.04) 75%)"
                  : "linear-gradient(110deg, rgba(0, 0, 0, 0.04) 25%, rgba(0, 0, 0, 0.14) 50%, rgba(0, 0, 0, 0.04) 75%)"
                : `url(${effectiveCoverUrl})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: isCoverLoading ? "200% 0" : "center",
              backgroundSize: isCoverLoading ? "220% 100%" : "cover",
              animation: isCoverLoading ? "coverShimmer 1.4s ease-in-out infinite" : undefined,
              "@keyframes coverShimmer": {
                "0%": { backgroundPosition: "220% 0" },
                "100%": { backgroundPosition: "-20% 0" },
              },
              "&::after":
                effectiveCoverUrl === NO_COVER_URL
                  ? {
                      content: '""',
                      position: "absolute",
                      inset: 0,
                      background:
                        theme.palette.mode === "dark"
                          ? "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 45%)"
                          : "linear-gradient(135deg, rgba(0,0,0,0.06), rgba(0,0,0,0) 45%)",
                    }
                  : undefined,
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 12% 14%, rgba(255,255,255,0.18), rgba(255,255,255,0) 38%)",
                mixBlendMode: theme.palette.mode === "dark" ? "screen" : "multiply",
                opacity: 0.45,
                pointerEvents: "none",
              },
            })}
          >
            <Box
              sx={(theme) => ({
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                p: 1.25,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(5,7,10,0.92) 100%)",
              })}
            >
              <Stack spacing={0.4} sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  noWrap
                  sx={(theme) => ({
                    fontSize: "clamp(0.78rem, 0.7rem + 0.35vw, 1.05rem)",
                    display: "block",
                    minWidth: 0,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontWeight: 700,
                    color: theme.palette.common.white,
                    textShadow: "0 1px 2px rgba(0,0,0,0.7)",
                  })}
                >
                  {issueLabel}
                </Typography>

                {variant ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={(theme) => ({
                      fontSize: "clamp(0.6rem, 0.56rem + 0.18vw, 0.78rem)",
                      color: "rgba(255,255,255,0.78)",
                    })}
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
              backgroundColor:
                theme.palette.mode === "dark" ? "rgba(24, 24, 24, 0.84)" : "rgba(228, 228, 228, 0.58)",
            })}
          >
            <IssuePreviewChips issue={props.issue} flags={flags} us={us} chipSx={SINGLE_LINE_CHIP_SX} />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function IssuePreviewPlaceholderSmall(props: { idx?: number; isLast?: boolean }) {
  const widths = ["84%", "72%", "68%", "78%", "62%"] as const;
  const width = widths[(props.idx ?? 0) % widths.length];

  return (
    <Card
      sx={(theme) => ({
        overflow: "hidden",
        backgroundColor:
          theme.palette.mode === "dark" ? "rgba(16, 16, 16, 0.96)" : "background.paper",
        border: "1px solid",
        borderColor:
          theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
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
              backgroundColor:
                theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.04)",
              backgroundImage:
                theme.palette.mode === "dark"
                  ? "linear-gradient(120deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))"
                  : "linear-gradient(120deg, rgba(0,0,0,0.06), rgba(0,0,0,0.02))",
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
                  bgcolor:
                    theme.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)",
                })}
              />
              <Skeleton
                variant="text"
                width="42%"
                height={18}
                sx={(theme) => ({
                  bgcolor:
                    theme.palette.mode === "dark" ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)",
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
              backgroundColor:
                theme.palette.mode === "dark" ? "rgba(24, 24, 24, 0.84)" : "rgba(228, 228, 228, 0.58)",
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
