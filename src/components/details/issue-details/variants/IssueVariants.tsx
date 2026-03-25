"use client";

import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import LastPageIcon from "@mui/icons-material/LastPage";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import { buildIssueVariantKey, getVariantKey } from "../utils/issueDetailsUtils";
import { IssueVariantTile } from "./IssueVariantTile";
import { useResolvedImageUrl } from "../../../generic/useResolvedImageUrl";
import { getPreferredCoverUrl } from "../../../generic/coverUrl";
import type { VariantIssue } from "./types";

type IssueVariantsProps = {
  issue: VariantIssue;
  activeFormat?: string;
  activeVariant?: string;
  us?: boolean;
  session?: unknown;
};

const NO_COVER_URL = "/nocover.png";
const JUMP_BUTTON_HIDE_DELAY_MS = 140;
const FORMAT_SORT_RANKS: Array<{ rank: number; aliases: string[] }> = [
  { rank: 0, aliases: ["heft"] },
  { rank: 1, aliases: ["sc", "softcover"] },
  { rank: 2, aliases: ["hc", "hardcover"] },
  { rank: 3, aliases: ["tb", "taschenbuch"] },
];
const outlinedStatusIconSx = {
  fontSize: 20,
  "& path": {
    stroke: "#000",
    strokeWidth: 1.2,
    paintOrder: "stroke fill",
  },
} as const;
const statusChipSx = (theme: Theme) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: "50%",
  bgcolor: "rgba(255,255,255,0.84)",
  border: "1px solid rgba(0,0,0,0.24)",
  ...theme.applyStyles("dark", {
    bgcolor: "rgba(0,0,0,0.58)",
    border: "1px solid rgba(255,255,255,0.28)",
  }),
});

export function IssueVariants(props: Readonly<IssueVariantsProps>) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const jumpStartHideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpEndHideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [canJumpEdges, setCanJumpEdges] = React.useState(false);
  const [isHoverCapable, setIsHoverCapable] = React.useState(true);
  const [showJumpStart, setShowJumpStart] = React.useState(false);
  const [showJumpEnd, setShowJumpEnd] = React.useState(false);
  const variantsRaw = (props.issue.variants || []).filter((variant): variant is VariantIssue =>
    Boolean(variant)
  );
  const variants = [...variantsRaw].sort(compareVariants);
  const activeKey = buildIssueVariantKey({
    format: props.activeFormat ?? props.issue.format,
    variant: props.activeVariant ?? props.issue.variant,
  });
  const activeVariant =
    variants.find((variant) => buildIssueVariantKey(variant) === activeKey) || variants[0];
  const activeVariantHasOwnStories =
    Boolean(props.session) && hasOwnStoriesForBadge(activeVariant, props.issue.storyOwner);
  const candidateActiveCoverUrl = getVariantCoverUrl(activeVariant, Boolean(props.us));
  const { resolvedUrl: activeCoverUrl, isLoading: isActiveCoverLoading } = useResolvedImageUrl(
    candidateActiveCoverUrl,
    NO_COVER_URL
  );
  const updateScrollControls = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      setCanJumpEdges(false);
      return;
    }
    const epsilon = 2;
    setCanScrollLeft(el.scrollLeft > epsilon);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - epsilon);
    const step = Math.max(220, Math.round(el.clientWidth * 0.82));
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanJumpEdges(maxScroll > step + epsilon);
  }, []);

  const scrollByAmount = React.useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(220, Math.round(el.clientWidth * 0.82));
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  const scrollToEdge = React.useCallback((edge: "start" | "end") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      left: edge === "start" ? 0 : el.scrollWidth,
      behavior: "smooth",
    });
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => updateScrollControls();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const raf = window.requestAnimationFrame(onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.cancelAnimationFrame(raf);
    };
  }, [updateScrollControls, variants.length]);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setIsHoverCapable(media.matches);
    apply();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
    media.onchange = apply;
    return () => {
      media.onchange = null;
    };
  }, []);

  React.useEffect(() => {
    return () => {
      if (jumpStartHideTimerRef.current) clearTimeout(jumpStartHideTimerRef.current);
      if (jumpEndHideTimerRef.current) clearTimeout(jumpEndHideTimerRef.current);
    };
  }, []);

  const showJumpStartButton = React.useCallback(() => {
    if (jumpStartHideTimerRef.current) clearTimeout(jumpStartHideTimerRef.current);
    setShowJumpStart(true);
  }, []);

  const hideJumpStartButton = React.useCallback(() => {
    if (jumpStartHideTimerRef.current) clearTimeout(jumpStartHideTimerRef.current);
    jumpStartHideTimerRef.current = setTimeout(() => {
      setShowJumpStart(false);
    }, JUMP_BUTTON_HIDE_DELAY_MS);
  }, []);

  const showJumpEndButton = React.useCallback(() => {
    if (jumpEndHideTimerRef.current) clearTimeout(jumpEndHideTimerRef.current);
    setShowJumpEnd(true);
  }, []);

  const hideJumpEndButton = React.useCallback(() => {
    if (jumpEndHideTimerRef.current) clearTimeout(jumpEndHideTimerRef.current);
    jumpEndHideTimerRef.current = setTimeout(() => {
      setShowJumpEnd(false);
    }, JUMP_BUTTON_HIDE_DELAY_MS);
  }, []);

  const showJumpStartButtonEffective = !isHoverCapable || showJumpStart;
  const showJumpEndButtonEffective = !isHoverCapable || showJumpEnd;

  return (
    <Accordion
      disableGutters
      disabled={variants.length === 1}
      elevation={1}
      defaultExpanded={false}
      slotProps={{
        transition: {
          collapsedSize: "0px",
        },
      }}
      sx={(theme) => ({
        position: "relative",
        backgroundColor: "rgba(255,255,255,0.52)",
        border: `1px solid ${theme.vars?.palette.divider ?? theme.palette.divider}`,
        borderRadius: 1.5,
        overflow: "hidden",
        boxShadow: theme.shadows[2],
        ...theme.applyStyles("dark", {
          backgroundColor: "rgba(9,11,15,0.6)",
        }),
        "&::after": isActiveCoverLoading
          ? {
              content: '""',
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.35)), linear-gradient(110deg, rgba(0, 0, 0, 0.04) 25%, rgba(0, 0, 0, 0.14) 50%, rgba(0, 0, 0, 0.04) 75%)",
              backgroundSize: "100% 100%, 220% 100%",
              backgroundPosition: "0 0, 200% 0",
              backgroundRepeat: "no-repeat, no-repeat",
              opacity: 0.7,
              transform: "scale(1.03)",
              zIndex: 0,
              animation: "variantCoverShimmer 1.4s ease-in-out infinite",
              ...theme.applyStyles("dark", {
                backgroundImage:
                  "linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), linear-gradient(110deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.04) 75%)",
              }),
            }
          : activeCoverUrl
            ? {
              content: '""',
              position: "absolute",
              inset: 0,
              backgroundImage:
                `linear-gradient(to right, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.62) 40%, rgba(255, 255, 255, 0) 100%), url("${activeCoverUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              opacity: 0.7,
              transform: "scale(1.03)",
              zIndex: 0,
              ...theme.applyStyles("dark", {
                backgroundImage:
                  `linear-gradient(to right, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.58) 40%, rgba(0, 0, 0, 0.08) 100%), url("${activeCoverUrl}")`,
              }),
            }
            : undefined,
        "@keyframes variantCoverShimmer": {
          "0%": { backgroundPosition: "0 0, 220% 0" },
          "100%": { backgroundPosition: "0 0, -20% 0" },
        },
        "&::before": { display: "none" },
      })}
    >
      <AccordionSummary
        expandIcon={variants.length === 1 ? null : <ExpandMoreIcon sx={{ fontSize: 24 }} />}
        aria-label="Varianten anzeigen"
        sx={{
          position: "relative",
          zIndex: 1,
          minHeight: 48,
          px: 1.5,
          py: 0,
          backgroundColor: "transparent",
          "& .MuiAccordionSummary-content": { my: 0, alignItems: "center" },
          "& .MuiAccordionSummary-expandIconWrapper": {
            alignSelf: "center",
            mr: 0.25,
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", minWidth: 0 }}>
          <Typography component="p" variant="body2" sx={{ fontWeight: 700 }}>
            {variants.length === 1 ? "" : "Erhältlich in " + variants.length + " Varianten"}
          </Typography>

          <Box sx={{ ml: "auto", mr: 1.25, display: "inline-flex", alignItems: "center", gap: 0.5 }}>
            {props.issue.collected && props.session ? (
              <Chip size="small" label="Gesammelt" color="success" />
            ) : null}
            {activeVariantHasOwnStories ? (
              <Box component="span" sx={statusChipSx}>
                <BookmarkIcon
                  aria-label="Eigene Stories"
                  sx={(theme) => ({
                    ...outlinedStatusIconSx,
                    fontSize: 18,
                    color: "text.primary",
                    ...theme.applyStyles("dark", {
                      color: "common.white",
                    }),
                  })}
                />
              </Box>
            ) : null}
          </Box>
        </Box>
      </AccordionSummary>

      <AccordionDetails
        sx={{
          position: "relative",
          zIndex: 1,
          px: 1.25,
          pb: 1.25,
          pt: 0.5,
          backgroundColor: "transparent",
        }}
      >
        <Box
          sx={{
            position: "relative",
          }}
        >
          {variants.length > 1 ? (
            <IconButton
              aria-label="Zu erster Variante"
              onClick={() => scrollToEdge("start")}
              onMouseEnter={showJumpStartButton}
              onMouseLeave={hideJumpStartButton}
              disabled={!canScrollLeft}
              sx={variantArrowSx("left", 38, canJumpEdges && showJumpStartButtonEffective, true)}
            >
              <FirstPageIcon sx={{ fontSize: 18 }} />
            </IconButton>
          ) : null}
          {variants.length > 1 ? (
            <IconButton
              aria-label="Vorherige Varianten"
              onClick={() => scrollByAmount("left")}
              onMouseEnter={showJumpStartButton}
              onMouseLeave={hideJumpStartButton}
              disabled={!canScrollLeft}
              sx={variantArrowSx("left", 6, true, false)}
            >
              <ChevronLeftIcon />
            </IconButton>
          ) : null}
          {variants.length > 1 ? (
            <IconButton
              aria-label="Nächste Varianten"
              onClick={() => scrollByAmount("right")}
              onMouseEnter={showJumpEndButton}
              onMouseLeave={hideJumpEndButton}
              disabled={!canScrollRight}
              sx={variantArrowSx("right", 6, true, false)}
            >
              <ChevronRightIcon />
            </IconButton>
          ) : null}
          {variants.length > 1 ? (
            <IconButton
              aria-label="Zu letzter Variante"
              onClick={() => scrollToEdge("end")}
              onMouseEnter={showJumpEndButton}
              onMouseLeave={hideJumpEndButton}
              disabled={!canScrollRight}
              sx={variantArrowSx("right", 38, canJumpEdges && showJumpEndButtonEffective, true)}
            >
              <LastPageIcon sx={{ fontSize: 18 }} />
            </IconButton>
          ) : null}
          <Box
            ref={scrollRef}
            sx={{
              overflowX: "auto",
              overflowY: "hidden",
              WebkitOverflowScrolling: "touch",
              pb: 1,
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
          <Stack
            component="ul"
            direction="row"
            spacing={0}
            sx={{
              alignItems: "center",
              m: 0,
              p: 0,
              listStyle: "none",
              width: "max-content",
            }}
          >
            {variants.map((variant, idx) => {
              const selected = buildIssueVariantKey(variant) === activeKey;
              const hasStories = hasOwnStoriesForBadge(variant, props.issue.storyOwner);

              return (
                <Box
                  component="li"
                  data-selected={selected ? "true" : "false"}
                  key={getVariantKey(variant, idx)}
                  sx={{
                    p: 0,
                    m: 0,
                    width: selected
                      ? { xs: "332px", sm: "378px", md: "432px" }
                      : { xs: "302px", sm: "344px", md: "392px" },
                    height: selected
                      ? { xs: "132.8px", sm: "145.1px", md: "156.9px" }
                      : { xs: "120.8px", sm: "132.1px", md: "142.2px" },
                    flex: "0 0 auto",
                    ml: idx === 0 ? 0 : "-1px",
                    transition: "width 180ms ease, height 180ms ease",
                  }}
                >
                  <IssueVariantTile
                    issue={props.issue}
                    variant={variant}
                    edge={
                      variants.length === 1
                        ? "single"
                        : idx === 0
                          ? "start"
                          : idx === variants.length - 1
                            ? "end"
                            : "middle"
                    }
                    selected={selected}
                    hasStories={hasStories}
                    session={props.session}
                    us={Boolean(props.us)}
                  />
                </Box>
              );
            })}
          </Stack>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

function hasOwnStoriesForBadge(
  variant: VariantIssue,
  storyOwner: VariantIssue["storyOwner"]
): boolean {
  if (!storyOwner) return false;

  return getIssueIdentityKey(variant) === getIssueIdentityKey(storyOwner);
}

function getIssueIdentityKey(
  issue: Pick<VariantIssue, "number" | "legacy_number" | "format" | "variant">
): string {
  return [
    String(issue.number || "").trim(),
    String(issue.legacy_number || "").trim(),
    String(issue.format || "").trim(),
    String(issue.variant || "").trim(),
  ].join("|");
}


function compareVariants(left: VariantIssue, right: VariantIssue): number {
  const formatCompare = getFormatSortRank(left.format) - getFormatSortRank(right.format);
  if (formatCompare !== 0) return formatCompare;

  const variantCompare = normalizeSortText(left.variant).localeCompare(normalizeSortText(right.variant), undefined, {
    sensitivity: "base",
    numeric: true,
  });
  if (variantCompare !== 0) return variantCompare;

  return normalizeSortText(left.format).localeCompare(normalizeSortText(right.format), undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

function getFormatSortRank(format: string | null | undefined): number {
  const normalized = normalizeFormatAlias(format);
  const matched = FORMAT_SORT_RANKS.find((entry) => entry.aliases.includes(normalized));
  return matched?.rank ?? 99;
}

function normalizeFormatAlias(value: string | null | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeSortText(value: string | null | undefined): string {
  return String(value || "").trim();
}

function getVariantCoverUrl(variant: VariantIssue | null | undefined, us: boolean): string {
  void us;
  const coverUrl = variant ? getPreferredCoverUrl(variant) : "";
  if (coverUrl) return coverUrl;
  return NO_COVER_URL;
}

function variantArrowSx(
  side: "left" | "right",
  offset: number,
  visible: boolean,
  secondary: boolean
) {
  return {
    display: visible ? "inline-flex" : "none",
    position: "absolute",
    top: "50%",
    [side]: offset,
    transform: "translateY(-50%)",
    zIndex: secondary ? 2 : 3,
    color: "common.white",
    bgcolor: "rgba(0,0,0,0.44)",
    border: "1px solid rgba(255,255,255,0.35)",
    width: secondary ? 26 : 30,
    height: secondary ? 26 : 30,
    opacity: secondary ? 0.78 : 1,
    "&:hover": {
      bgcolor: "rgba(0,0,0,0.6)",
    },
    "&.Mui-disabled": {
      opacity: secondary ? 0.2 : 0.28,
      color: "common.white",
      borderColor: "rgba(255,255,255,0.28)",
    },
  };
}
