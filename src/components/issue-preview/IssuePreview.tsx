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
import Chip from "@mui/material/Chip";
import { useResolvedImageUrl } from "../generic/useResolvedImageUrl";
import { useNearViewport } from "../generic/useNearViewport";
import { buildRouteHref } from "../generic/routeHref";
import { getIssueUrl, getSeriesLabel } from "../../lib/routes/issue-presentation";
import { IssueReferenceInline } from "../generic/IssueNumberInline";
import {
  getIssuePreviewCover,
  getIssuePreviewFlags,
  getIssueVariantLabel,
  type PreviewIssue,
} from "./utils/issuePreviewUtils";
import { IssuePreviewChips } from "./IssuePreviewChips";
import { usePreviewNavigation } from "./previewNavigation";

interface IssuePreviewProps {
  issue: PreviewIssue;
  us?: boolean;
  session?: unknown;
  query?: Record<string, unknown> | null;
  isPhone?: boolean;
  isTablet?: boolean;
  drawerOpen?: boolean;
}

const NO_COVER_URL = "/nocover_preview.png";

export default function IssuePreview(props: Readonly<IssuePreviewProps>) {
  const us = Boolean(props.us);
  const hasSession = Boolean(props.session);
  const variant = getIssueVariantLabel(props.issue);
  const { coverUrl, source } = getIssuePreviewCover(props.issue);
  const candidateCoverUrl = coverUrl?.trim() ? coverUrl : NO_COVER_URL;
  const { isNearViewport, setElement } = useNearViewport();
  const { resolvedUrl: effectiveCoverUrl, isLoading: isCoverLoading } = useResolvedImageUrl(
    candidateCoverUrl,
    NO_COVER_URL,
    { enabled: isNearViewport }
  );
  const usesFallbackCover = effectiveCoverUrl === NO_COVER_URL;
  const showsOriginalStoryCover = source === "original-story" && !usesFallbackCover;
  const flags = getIssuePreviewFlags(props.issue, us, hasSession);
  const url = buildRouteHref(getIssueUrl(props.issue, us), props.query);
  const { isNavigating, handleClick } = usePreviewNavigation(url);
  let accentKey: "success" | "secondary" | "default" = "default";
  if (flags.collected) {
    accentKey = "success";
  } else if (!us && flags.hasFirstApp) {
    accentKey = "secondary";
  }
  let lightBackgroundImage =
    "linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), linear-gradient(to right, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.62) 40%, rgba(255, 255, 255, 0) 100%), url(" +
    effectiveCoverUrl +
    ")";
  if (isCoverLoading) {
    lightBackgroundImage =
      "linear-gradient(rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.35)), linear-gradient(110deg, rgba(0, 0, 0, 0.04) 25%, rgba(0, 0, 0, 0.14) 50%, rgba(0, 0, 0, 0.04) 75%)";
  } else if (usesFallbackCover) {
    lightBackgroundImage = `linear-gradient(rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.22)), linear-gradient(to right, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.58) 40%, rgba(255, 255, 255, 0.08) 100%), url(${NO_COVER_URL})`;
  } else if (showsOriginalStoryCover) {
    lightBackgroundImage =
      "linear-gradient(rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0.52)), linear-gradient(to right, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0.72) 40%, rgba(255, 255, 255, 0.18) 100%), url(" +
      effectiveCoverUrl +
      ")";
  }
  let borderLeftColorKey = "divider";
  if (accentKey === "success") {
    borderLeftColorKey = "success.main";
  } else if (accentKey === "secondary") {
    borderLeftColorKey = "secondary.main";
  }
  let darkBackgroundImage =
    "linear-gradient(rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0.28)), linear-gradient(to right, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.58) 40%, rgba(0, 0, 0, 0.08) 100%), url(" +
    effectiveCoverUrl +
    ")";
  if (isCoverLoading) {
    darkBackgroundImage =
      "linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), linear-gradient(110deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.04) 75%)";
  } else if (usesFallbackCover) {
    darkBackgroundImage = `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)), linear-gradient(to right, rgba(0, 0, 0, 0.84) 0%, rgba(0, 0, 0, 0.54) 40%, rgba(0, 0, 0, 0.08) 100%), url(${NO_COVER_URL})`;
  } else if (showsOriginalStoryCover) {
    darkBackgroundImage =
      "linear-gradient(rgba(0, 0, 0, 0.46), rgba(0, 0, 0, 0.46)), linear-gradient(to right, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.68) 40%, rgba(0, 0, 0, 0.18) 100%), url(" +
      effectiveCoverUrl +
      ")";
  }

  return (
    <Box data-audit-ignore-pa11y="issue-preview" ref={setElement}>
      <Card
        sx={(theme) => ({
          backgroundColor: "background.paper",
          borderLeft: "4px solid",
          borderLeftColor: theme.palette[borderLeftColorKey as "divider"] ?? theme.palette.divider,
          boxShadow: theme.shadows[2],
          backgroundImage: lightBackgroundImage,
          backgroundRepeat: isCoverLoading ? "no-repeat, no-repeat" : "no-repeat, no-repeat, no-repeat",
          backgroundPosition: isCoverLoading ? "0 0, 200% 0" : "0 0, 0 0, 100% 50%",
          backgroundSize: isCoverLoading ? "100% 100%, 220% 100%" : "100% 100%, 100% 100%, cover",
          animation: isCoverLoading ? "coverShimmer 1.4s ease-in-out infinite" : undefined,
          "@keyframes coverShimmer": {
            "0%": { backgroundPosition: "0 0, 220% 0" },
            "100%": { backgroundPosition: "0 0, -20% 0" },
          },
          overflow: "hidden",
          position: "relative",
          transition: "transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease",
          opacity: isNavigating ? 0.76 : 1,
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: theme.shadows[6],
          },
          ...theme.applyStyles("dark", {
            backgroundImage: darkBackgroundImage,
            "&:hover": {
              boxShadow: theme.shadows[8],
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
            transition: "transform 180ms ease",
            transform: isNavigating ? "scale(0.992)" : "scale(1)",
          }}
        >
          <CardContent sx={{ py: 2 }}>
            <Stack spacing={1.25}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  <IssueReferenceInline
                    seriesLabel={getSeriesLabel(props.issue.series)}
                    number={props.issue.number}
                    legacy_number={props.issue.legacy_number}
                  />
                </Typography>
                {props.issue.title ? (
                  <Typography variant="body2" color="text.secondary">
                    {props.issue.title}
                  </Typography>
                ) : null}
                {variant ? (
                  <Typography variant="caption" color="text.secondary">
                    {variant}
                  </Typography>
                ) : null}
              </Box>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                <IssuePreviewChips issue={props.issue} flags={flags} us={us} />
              </Box>
            </Stack>
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
              background: "rgba(255,255,255,0.28)",
              backdropFilter: "blur(2px)",
              pointerEvents: "none",
            }}
          >
            <CircularProgress size={26} />
          </Box>
        ) : null}
        {showsOriginalStoryCover ? (
          <Chip
            label="Vorläufiges Cover"
            size="small"
            sx={(theme) => ({
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 1,
              height: 22,
              borderRadius: "6px",
              fontWeight: 700,
              backdropFilter: "blur(8px)",
              backgroundColor: "rgba(255,255,255,0.88)",
              color: "text.primary",
              "& .MuiChip-label": {
                px: 1,
              },
              ...theme.applyStyles("dark", {
                backgroundColor: "rgba(17,17,17,0.82)",
                color: "#fff",
              }),
            })}
          />
        ) : null}
      </Card>
    </Box>
  );
}

export function IssuePreviewPlaceholder() {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Box>
            <Skeleton variant="text" width="72%" height={30} />
            <Skeleton variant="text" width="42%" />
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Skeleton variant="rounded" width={96} height={24} />
            <Skeleton variant="rounded" width={104} height={24} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
