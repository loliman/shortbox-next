"use client";

import React from "react";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useRouter } from "next/navigation";
import { IssueCover } from "./IssueCover";
import { getIssueUrl } from "../../../util/issuePresentation";
import { buildRouteHref } from "../../generic/routeHref";
import type { PreviewIssue } from "../../issue-preview/utils/issuePreviewUtils";

interface IssueCoverGalleryClientProps {
  us: boolean;
  issues: PreviewIssue[];
  activeFormat?: string;
  activeVariant?: string;
  query?: Record<string, unknown> | null;
}

export function IssueCoverGalleryClient(props: Readonly<IssueCoverGalleryClientProps>) {
  const router = useRouter();
  const [coverExpanded, setCoverExpanded] = React.useState(true);
  const maxIndex = Math.max(0, props.issues.length - 1);
  const activeIssueKey = getIssueVariantKey({
    format: props.activeFormat ?? null,
    variant: props.activeVariant ?? null,
  });
  const activeIndex = React.useMemo(() => {
    const idx = props.issues.findIndex((item) => getIssueVariantKey(item) === activeIssueKey);
    return idx >= 0 ? idx : 0;
  }, [activeIssueKey, props.issues]);
  const activeIssue = props.issues[activeIndex] || props.issues[0];

  if (!activeIssue) return null;

  const navigateToIssue = (index: number) => {
    const issue = props.issues[index];
    if (!issue) return;
    router.push(buildRouteHref(getIssueUrl(issue, props.us), props.query));
  };

  return (
    <>
      <Box sx={{ display: { xs: "none", lg: "block" }, width: "100%" }}>
        <IssueCoverGalleryFrame
          us={props.us}
          activeIssue={activeIssue}
          activeIndex={activeIndex}
          maxIndex={maxIndex}
          issues={props.issues}
          onNavigate={navigateToIssue}
        />
      </Box>

      <Box sx={{ display: { xs: "block", lg: "none" }, width: "100%" }}>
        <Box sx={{ width: "100%", maxWidth: "min(100%, 480px)", mx: "auto", position: "relative" }}>
          <IconButton
            size="small"
            aria-label={coverExpanded ? "Cover einklappen" : "Cover ausklappen"}
            onClick={(event) => {
              event.stopPropagation();
              setCoverExpanded((prev) => !prev);
            }}
            sx={{
              position: "absolute",
              top: 1,
              right: 2,
              zIndex: 2,
              color: "common.white",
              p: 0.25,
              "&:hover": { bgcolor: "transparent" },
              transform: coverExpanded ? "rotate(45deg)" : "rotate(0deg)",
              transition: "transform 180ms ease",
            }}
          >
            <AddIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Collapse
            in={coverExpanded}
            collapsedSize="25px"
            sx={{
              borderRadius: (theme) => `${Number(theme.shape.borderRadius) || 12}px`,
              overflow: "hidden",
            }}
          >
            <IssueCoverGalleryFrame
              us={props.us}
              activeIssue={activeIssue}
              activeIndex={activeIndex}
              maxIndex={maxIndex}
              issues={props.issues}
              onNavigate={navigateToIssue}
            />
          </Collapse>
        </Box>
      </Box>
    </>
  );
}

function IssueCoverGalleryFrame(props: {
  us: boolean;
  activeIssue: PreviewIssue;
  activeIndex: number;
  maxIndex: number;
  issues: PreviewIssue[];
  onNavigate: (index: number) => void;
}) {
  return (
    <Box sx={{ position: "relative", width: "100%", paddingTop: "150%" }}>
      <Box sx={{ position: "absolute", inset: 0 }}>
        <IssueCover us={props.us} issue={props.activeIssue} />
      </Box>

      {props.issues.length > 1 ? (
        <>
          {props.activeIndex > 0 ? (
            <IconButton
              aria-label="Vorheriges Cover"
              onClick={(event) => {
                event.stopPropagation();
                props.onNavigate(Math.max(0, props.activeIndex - 1));
              }}
              sx={coverGalleryArrowSx("left")}
            >
              <ChevronLeftIcon />
            </IconButton>
          ) : null}

          {props.activeIndex < props.maxIndex ? (
            <IconButton
              aria-label="Nächstes Cover"
              onClick={(event) => {
                event.stopPropagation();
                props.onNavigate(Math.min(props.maxIndex, props.activeIndex + 1));
              }}
              sx={coverGalleryArrowSx("right")}
            >
              <ChevronRightIcon />
            </IconButton>
          ) : null}
        </>
      ) : null}
    </Box>
  );
}

function coverGalleryArrowSx(side: "left" | "right") {
  return {
    position: "absolute",
    top: "50%",
    [side]: 8,
    transform: "translateY(-50%)",
    zIndex: 2,
    color: "common.white",
    bgcolor: "rgba(0,0,0,0.44)",
    border: "1px solid rgba(255,255,255,0.35)",
    width: 34,
    height: 34,
    "&:hover": {
      bgcolor: "rgba(0,0,0,0.6)",
    },
  };
}

function getIssueVariantKey(issue: { format?: string | null; variant?: string | null }): string {
  return [String(issue.format || "").trim(), String(issue.variant || "").trim()].join("|");
}
