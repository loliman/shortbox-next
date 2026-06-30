"use client";

import React from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";
import CoverTooltip from "../../../nav-bar/CoverTooltip";
import { generateLabel, generateSeoUrl } from "../../../../lib/routes/hierarchy";
import type { SelectedRoot } from "../../../../types/domain";
import { romanize } from "../../../../util/util";
import { IssueReferenceInline } from "../../../generic/IssueNumberInline";
import { buildRouteHref } from "../../../generic/routeHref";
import { usePendingNavigation } from "../../../generic/usePendingNavigation";

type ContainsIssueLike = {
  number?: string | number;
  legacy_number?: string | null;
  format?: string | null;
  variant?: string | null;
  collected?: boolean | null;
  stories?: Array<unknown> | null;
  storiesCount?: number | null;
  series?: {
    title?: string;
    volume?: number;
    publisher?: { name?: string; us?: boolean };
  };
  issue?: {
    number?: string | number;
    series?: {
      title?: string;
      volume?: number;
      publisher?: { name?: string; us?: boolean };
    };
  };
};

type ContainsParentLike = {
  title?: string | null;
  collectedmultipletimes?: boolean;
  collected?: boolean;
  children?: Array<{ part?: string | null; issue?: ContainsIssueLike | null } | null> | null;
  reprintOf?: { issue?: ContainsIssueLike; number?: string | number } | null;
  reprints?: Array<{ issue?: ContainsIssueLike | null } | null> | null;
  issue?: ContainsIssueLike;
  number?: string | number;
};

type ContainsItemLike = {
  number?: string | number;
  title?: string | null;
  part?: string | null;
  addinfo?: string | null;
  url?: string | null;
  exclusive?: boolean;
  firstapp?: boolean;
  firstCompleteApp?: boolean;
  firstPartialApp?: boolean;
  onlyapp?: boolean;
  onlytb?: boolean;
  otheronlytb?: boolean;
  onlyoneprint?: boolean;
  collectedmultipletimes?: boolean;
  collected?: boolean;
  parent?: ContainsParentLike | null;
  issue?: ContainsIssueLike;
};

type ContainsTitleDetailedProps = {
  item: ContainsItemLike;
  us?: boolean;
  simple?: boolean;
  isCover?: boolean;
  session?: unknown;
  allowInteractiveActions?: boolean;
  compactLayout?: boolean;
  isPhone?: boolean;
  isTablet?: boolean;
  isTabletLandscape?: boolean;
  drawerOpen?: boolean;
  isPhonePortrait?: boolean;
  query?: Record<string, unknown> | null;
};

type ContainsTitleDetailedNavigationProps = {
  item: ContainsItemLike;
  us?: boolean;
  query?: Record<string, unknown> | null;
};



function getContainsSeriesLabel(issue: ContainsIssueLike | undefined, hasIssueReference: boolean) {
  if (hasIssueReference !== true || issue?.series == null) return undefined;
  return generateLabel({ series: issue.series as SelectedRoot["series"] });
}

function buildDetailButton({
  allowInteractiveActions,
  exclusive,
  issue,
  issueSelection,
  us,
  query,
  storyExpandNumber,
  push,
}: {
  allowInteractiveActions: boolean;
  exclusive: boolean;
  issue: ContainsIssueLike | undefined;
  issueSelection: SelectedRoot | null;
  us: boolean | undefined;
  query: Record<string, unknown> | null | undefined;
  storyExpandNumber: string;
  push: (href: string) => void;
}): React.ReactNode {
  if (!allowInteractiveActions || exclusive || !issue || !issueSelection) return null;

  return (
    <CoverTooltip issue={issue} us={us}>
      <IconButton
        component="span"
        onClick={(e) => {
          e.stopPropagation();
          push(
            buildRouteHref(generateSeoUrl(issueSelection, !us), query, {
              expand: storyExpandNumber || undefined,
            })
          );
        }}
        aria-label="Details"
      >
        <SearchIcon fontSize="small" />
      </IconButton>
    </CoverTooltip>
  );
}

function ContainsTitleDetailedMainText(props: Readonly<{
  storyTitleLabel: string;
  storyNumberLabel: string;
  hasIssueReference: boolean;
  issue: ContainsIssueLike | undefined;
  showParentTitle: boolean;
  parentTitle: string | undefined;
  variant: string;
  romanStoryNumber?: string;
}>) {
  const seriesLabel = getContainsSeriesLabel(props.issue, props.hasIssueReference);

  return (
    <Box
      sx={{
        display: "grid",
        rowGap: 0.3,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
        <Typography
          variant="overline"
          sx={{
            fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
            fontWeight: 500,
            fontSize: "0.7rem",
            lineHeight: 1.5,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "text.primary",
            opacity: 1,
          }}
        >
          {props.storyTitleLabel}
        </Typography>
        {props.storyNumberLabel ? (
          <Chip
            size="small"
            label={`Story ${props.storyNumberLabel}`}
            sx={{ fontWeight: 600, height: 20 }}
          />
        ) : null}
      </Box>
      <Typography
        variant="subtitle1"
        component="div"
        sx={{
          fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: "1rem",
          lineHeight: 1.75,
          fontWeight: 700,
          color: "text.primary",
          letterSpacing: "0.01em",
          opacity: 1,
        }}
      >
        <IssueReferenceInline
          seriesLabel={seriesLabel}
          number={props.hasIssueReference ? props.issue?.number : undefined}
          legacy_number={props.issue?.legacy_number}
          suffix={props.romanStoryNumber || undefined}
        />
      </Typography>
      {props.showParentTitle ? (
        <Typography
          sx={{
            fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: "0.9rem",
            lineHeight: 1.55,
            fontWeight: 500,
            color: "text.primary",
            opacity: 1,
          }}
        >
          {props.parentTitle}
        </Typography>
      ) : null}
      {props.variant ? (
        <Typography
          sx={{
            fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: "0.85rem",
            lineHeight: 1.5,
            fontWeight: 500,
            color: "text.primary",
            opacity: 1,
          }}
        >
          {props.variant} Variant
        </Typography>
      ) : null}
    </Box>
  );
}

function ContainsTitleDetailedReprintBlock(props: Readonly<{
  reprintIssue: ContainsIssueLike | undefined;
  reprintNumber: string | number | undefined;
  reprintSelection: SelectedRoot | null;
  reprintLabel: string;
  allowInteractiveActions: boolean;
  us: boolean | undefined;
  query: Record<string, unknown> | null | undefined;
  push: (href: string) => void;
}>) {
  if (!props.reprintIssue) return null;

  const showLink = props.allowInteractiveActions;

  return (
    <Box
      sx={{
        mt: 1,
        p: 1.25,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: "0.08em" }}>
        US-Original
      </Typography>
      <CoverTooltip issue={props.reprintIssue} us={props.us} number={props.reprintNumber}>
        <Box sx={{ width: "100%" }}>
          <Link
            component="button"
            type="button"
            variant="body2"
            underline="hover"
            color="text.primary"
            sx={{
              display: showLink ? "block" : { xs: "block", sm: "none" },
              mt: 0.25,
              p: 0,
              textAlign: "left",
              lineHeight: 1.43,
              fontWeight: 600,
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!props.reprintSelection) return;
              props.push(
                buildRouteHref(generateSeoUrl(props.reprintSelection, true), props.query, {
                  expand: props.reprintNumber,
                })
              );
            }}
          >
            {props.reprintLabel}
          </Link>
          {!showLink && (
            <Typography
              variant="body2"
              color="text.primary"
              sx={{
                display: { xs: "none", sm: "block" },
                mt: 0.25,
                lineHeight: 1.43,
                fontWeight: 600,
              }}
            >
              {props.reprintLabel}
            </Typography>
          )}
        </Box>
      </CoverTooltip>
    </Box>
  );
}

function ContainsTitleDetailedActionArea(props: Readonly<{
  actionChips: React.ReactElement[];
  detailButton: React.ReactNode;
}>) {
  if (!props.detailButton && props.actionChips.length === 0) return null;

  return (
    <Box
      sx={{
        ml: { xs: 0, md: "auto" },
        alignSelf: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: { xs: "flex-start", md: "flex-end" },
        gap: 0.6,
      }}
    >
      {props.actionChips.length > 0 && (
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            flexWrap: "wrap",
            gap: 0.6,
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          {props.actionChips}
        </Box>
      )}
      {props.detailButton}
    </Box>
  );
}

export function ContainsTitleDetailed(props: Readonly<ContainsTitleDetailedProps>) {
  const { push } = usePendingNavigation();
  const item = props.item;
  const allowInteractiveActions = props.allowInteractiveActions ?? true;
  const issue = resolveIssueForDetails(item);
  const issueSelection = issue ? toIssueSelection(issue) : null;
  const storyExpandNumber = readContainsTitleText(item.parent?.number ?? item.number);
  const storyNumberLabel = "";

  const rawStoryNumber = item.parent?.number ?? item.number;
  const parsedStoryNumber = typeof rawStoryNumber === "number" ? rawStoryNumber : parseInt(String(rawStoryNumber), 10);
  const storiesCount = item.parent?.issue?.storiesCount ?? 1;
  const romanStoryNumber = Number.isInteger(parsedStoryNumber) && parsedStoryNumber > 0 && storiesCount > 1
    ? ` [${romanize(parsedStoryNumber)}]`
    : "";

  const exclusive = Boolean(item.exclusive && !props.us);
  const variant = !props.us && issue?.variant ? " " + issue.variant : "";
  const itemTitle = normalizeDisplayStoryTitle(item.title);
  const parentTitle =
    itemTitle || !item.parent?.title ? undefined : normalizeDisplayStoryTitle(item.parent.title);
  const storyTitle = itemTitle || parentTitle || "";
  const storyTitleLabel = storyTitle || "Story";
  const showParentTitle = Boolean(parentTitle && itemTitle && parentTitle !== itemTitle);
  const addinfoText = buildAddinfoText(item);
  const reprintIssue = item.parent?.reprintOf?.issue;
  const reprintNumber = item.parent?.reprintOf?.number;
  const reprintSelection = reprintIssue ? toIssueSelection(reprintIssue) : null;
  const reprintLabel = reprintSelection ? generateLabel(reprintSelection) : "";
  const hasIssueReference = Boolean(issue?.series);
  const actionChips = buildDetailedActionChips({
    item,
    isCover: props.isCover,
    exclusive,
    hasSession: Boolean(props.session),
    us: props.us,
  });
  const detailButton = buildDetailButton({
    allowInteractiveActions,
    exclusive,
    issue,
    issueSelection,
    us: props.us,
    query: props.query,
    storyExpandNumber,
    push,
  });

  return (
    <Box
      data-testid="story-header"
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        justifyContent: "space-between",
        alignItems: { xs: "stretch", md: "flex-start" },
        gap: 1,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <ContainsTitleDetailedMainText
          storyTitleLabel={storyTitleLabel}
          storyNumberLabel={storyNumberLabel}
          hasIssueReference={hasIssueReference}
          issue={issue}
          showParentTitle={showParentTitle}
          parentTitle={parentTitle}
          variant={variant}
          romanStoryNumber={romanStoryNumber}
        />

        <ContainsTitleDetailedReprintBlock
          reprintIssue={reprintIssue}
          reprintNumber={reprintNumber}
          reprintSelection={reprintSelection}
          reprintLabel={reprintLabel}
          allowInteractiveActions={allowInteractiveActions}
          us={props.us}
          query={props.query}
          push={push}
        />

        <Typography
          sx={{
            fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: "0.8rem",
            lineHeight: 1.75,
            fontWeight: 500,
            color: "text.secondary",
            letterSpacing: "0.01em",
            opacity: 0.9,
          }}
        >
          {addinfoText === "" ? null : addinfoText}
        </Typography>

        {actionChips.length > 0 && (
          <Box
            sx={{
              mt: 1,
              display: { xs: "flex", md: "none" },
              flexWrap: "wrap",
              gap: 0.6,
              alignItems: "center",
            }}
          >
            {actionChips}
          </Box>
        )}
      </Box>

      <ContainsTitleDetailedActionArea
        actionChips={actionChips}
        detailButton={detailButton}
      />
    </Box>
  );
}

export function ContainsTitleDetailedNavigation(
  props: Readonly<ContainsTitleDetailedNavigationProps>
) {
  const { push } = usePendingNavigation();
  const item = props.item;
  const issue = resolveIssueForDetails(item);
  const issueSelection = issue ? toIssueSelection(issue) : null;
  const storyExpandNumber = readContainsTitleText(item.parent?.number ?? item.number);
  const reprintSelection = item.parent?.reprintOf?.issue
    ? toIssueSelection(item.parent.reprintOf.issue)
    : null;
  const exclusive = Boolean(item.exclusive && !props.us);

  if (!issueSelection && !reprintSelection) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        justifyContent: "flex-end",
        alignItems: "center",
        width: "100%",
        pointerEvents: "auto",
      }}
    >
      {reprintSelection && item.parent?.reprintOf?.issue ? (
        <CoverTooltip
          issue={item.parent.reprintOf.issue}
          us={props.us}
          number={item.parent.reprintOf.number}
        >
          <Link
            component="button"
            type="button"
            variant="body2"
            underline="hover"
            color="text.primary"
            sx={{
              display: { xs: "none", sm: "inline-block" },
              p: 0,
              textAlign: "right",
              lineHeight: 1.43,
              fontWeight: 600,
            }}
            onClick={() => {
              push(
                buildRouteHref(generateSeoUrl(reprintSelection, true), props.query, {
                  expand: item.parent?.reprintOf?.number,
                })
              );
            }}
          >
            US-Original ansehen
          </Link>
        </CoverTooltip>
      ) : null}

      {!exclusive && issue && issueSelection ? (
        <CoverTooltip issue={issue} us={props.us}>
          <IconButton
            onClick={() => {
              push(
                buildRouteHref(generateSeoUrl(issueSelection, !props.us), props.query, {
                  expand: storyExpandNumber || undefined,
                })
              );
            }}
            aria-label="Details"
          >
            <SearchIcon fontSize="small" />
          </IconButton>
        </CoverTooltip>
      ) : null}
    </Box>
  );
}

function buildAddinfoText(item: ContainsItemLike): string {
  let addinfoText = "";
  if (item.part?.includes("/x") === false) {
    addinfoText += "Teil " + item.part.replace("/", " von ");
  }
  if (addinfoText !== "" && item.addinfo) {
    addinfoText += ", ";
  }
  if (item.addinfo) {
    addinfoText += item.addinfo;
  }
  return addinfoText;
}

function resolveIssueForDetails(item: ContainsItemLike): ContainsIssueLike | undefined {
  const baseIssue = item.parent?.issue ?? item;
  if (baseIssue?.issue) {
    return {
      ...baseIssue,
      number: baseIssue.issue.number,
      legacy_number: (baseIssue.issue as { legacy_number?: string | null }).legacy_number,
      series: baseIssue.issue.series,
    };
  }
  return baseIssue;
}

function toIssueSelection(issue: ContainsIssueLike): SelectedRoot {
  return { issue: issue as SelectedRoot["issue"] };
}

function buildDetailedActionChips({
  item,
  isCover,
  exclusive,
  hasSession,
  us,
}: {
  item: ContainsItemLike;
  isCover?: boolean;
  exclusive: boolean;
  hasSession: boolean;
  us?: boolean;
}): React.ReactElement[] {
  const chips: React.ReactElement[] = [];

  if (!isCover && item.url && item.number === 0) {
    chips.push(<Chip key="cover" label="Cover" color="default" />);
  }

  if (!isCover && item.onlyapp && item.parent) {
    chips.push(<Chip key="onlyapp" label="Einzige Veröffentlichung" color="secondary" />);
  }

  if (!isCover && !item.onlyapp && item.parent) {
    if (item.firstPartialApp) {
      chips.push(<Chip key="firstapp-partial" label="Erste teilweise Veröffentlichung" color="primary" />);
    } else if (item.firstCompleteApp) {
      chips.push(<Chip key="firstapp-complete" label="Erste vollständige Veröffentlichung" color="primary" />);
    } else if (item.firstapp) {
      chips.push(<Chip key="firstapp" label="Erstveröffentlichung" color="primary" />);
    }
  }

  if (!isCover && item.otheronlytb && item.parent) {
    chips.push(
      <Chip key="otheronlytb" variant="outlined" label="Sonst nur in Taschenbuch" color="default" />
    );
  }

  if (exclusive) {
    chips.push(<Chip key="exclusive" label="Exklusiv" color="secondary" />);
  }

  if (!isCover && !exclusive && !us && hasSession && item.parent) {
    if (!item.collected) {
      chips.push(<Chip key="notownedus" color="error" label="Ungesammeltes US-Material" />);
    }
  }

  if ((item.collectedmultipletimes || item.parent?.collectedmultipletimes) && hasSession) {
    chips.push(<Chip key="collectedmultiple" color="warning" label="Mehrfach gesammelt" />);
  }

  return chips;
}

function normalizeDisplayStoryTitle(value: string | null | undefined): string {
  const normalized = readContainsTitleText(value);
  return normalized === "Untitled" ? "" : normalized;
}

function readContainsTitleText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}
