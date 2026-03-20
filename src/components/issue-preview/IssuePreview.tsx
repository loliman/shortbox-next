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
import { getIssueLabel, getIssueUrl, getSeriesLabel } from "../../util/issuePresentation";
import { IssueReferenceInline } from "../generic/IssueNumberInline";
import {
  getIssuePreviewCover,
  getIssuePreviewFlags,
  getIssueVariantLabel,
  type PreviewIssue,
} from "./utils/issuePreviewUtils";
import { IssuePreviewChips } from "./IssuePreviewChips";

interface IssuePreviewProps {
  issue: PreviewIssue;
  us?: boolean;
  session?: unknown;
  isPhone?: boolean;
  isTablet?: boolean;
  drawerOpen?: boolean;
}

const NO_COVER_URL = "/nocover.png";

export default function IssuePreview(props: Readonly<IssuePreviewProps>) {
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
  const accentKey = flags.collected
    ? "success"
    : props.issue.verified
      ? "info"
      : !us && flags.hasFirstApp
        ? "secondary"
        : "default";

  return (
    <Card
      sx={(theme) => ({
        backgroundColor: "background.paper",
        borderLeft: "4px solid",
        borderLeftColor:
          accentKey === "success"
            ? theme.palette.success.main
            : accentKey === "info"
              ? theme.palette.info.main
              : accentKey === "secondary"
                ? theme.palette.secondary.main
                : theme.palette.divider,
        boxShadow: theme.shadows[2],
        backgroundImage:
          isCoverLoading
            ? theme.palette.mode === "dark"
              ? "linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), linear-gradient(110deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.04) 75%)"
              : "linear-gradient(rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.35)), linear-gradient(110deg, rgba(0, 0, 0, 0.04) 25%, rgba(0, 0, 0, 0.14) 50%, rgba(0, 0, 0, 0.04) 75%)"
            : theme.palette.mode === "dark"
              ? `linear-gradient(rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0.28)), linear-gradient(to right, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.58) 40%, rgba(0, 0, 0, 0.08) 100%), url(${effectiveCoverUrl})`
              : `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), linear-gradient(to right, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.62) 40%, rgba(255, 255, 255, 0) 100%), url(${effectiveCoverUrl})`,
        backgroundRepeat: isCoverLoading ? "no-repeat, no-repeat" : "no-repeat, no-repeat, no-repeat",
        backgroundPosition: isCoverLoading ? "0 0, 200% 0" : "0 0, 0 0, 100% 50%",
        backgroundSize: isCoverLoading ? "100% 100%, 220% 100%" : "100% 100%, 100% 100%, cover",
        animation: isCoverLoading ? "coverShimmer 1.4s ease-in-out infinite" : undefined,
        "@keyframes coverShimmer": {
          "0%": { backgroundPosition: "0 0, 220% 0" },
          "100%": { backgroundPosition: "0 0, -20% 0" },
        },
        overflow: "hidden",
      })}
    >
      <CardActionArea
        component={Link}
        href={url}
        aria-label={`Zu ${getIssueLabel(props.issue)}`}
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
    </Card>
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
