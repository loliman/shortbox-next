"use client";

import React from "react";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";
import CoverTooltip from "../../../nav-bar/CoverTooltip";
import { generateLabel, generateSeoUrl } from "../../../../lib/routes/hierarchy";
import type { SelectedRoot } from "../../../../types/domain";
import { IssueReferenceInline } from "../../../generic/IssueNumberInline";
import { buildRouteHref } from "../../../generic/routeHref";
import { usePendingNavigation } from "../../../generic/usePendingNavigation";

type ContainsIssueLike = {
  number?: string | number;
  legacy_number?: string | null;
  format?: string | null;
  variant?: string | null;
  stories?: Array<unknown> | null;
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
  children?: Array<{ part?: string | null; issue?: { releasedate?: string | null } | null } | null> | null;
  reprintOf?: { issue?: ContainsIssueLike; number?: string | number } | null;
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

const PART_PATTERN = /^(\d+)\s*\/\s*(\d+)$/;

function parseStoryPart(value: string | null | undefined): { current: number; total: number } | null {
  const match = PART_PATTERN.exec(readContainsTitleText(value));
  if (!match) return null;

  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total) || current <= 0 || total <= 0) {
    return null;
  }

  return { current, total };
}

function toReleaseTimestamp(value: string | null | undefined): number {
  const parsed = Date.parse(readContainsTitleText(value));
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function getEarliestFullPublicationTimestamp(
  children: Array<{ part?: string | null; issue?: { releasedate?: string | null } | null } | null>
): number {
  const timestamps = children
    .filter((child) => {
      const parsed = parseStoryPart(child?.part);
      return !parsed || parsed.total <= 1;
    })
    .map((child) => toReleaseTimestamp(child?.issue?.releasedate))
    .filter((timestamp) => Number.isFinite(timestamp));

  return timestamps.length > 0 ? Math.min(...timestamps) : Number.POSITIVE_INFINITY;
}

function getQualifyingMultipartTotals(
  children: Array<{ part?: string | null; issue?: { releasedate?: string | null } | null } | null>
): Set<number> {
  const earliestFullPublicationTimestamp = getEarliestFullPublicationTimestamp(children);
  if (!Number.isFinite(earliestFullPublicationTimestamp)) return new Set<number>();

  const partsByTotal = new Map<number, Array<{ current: number; releasedateTs: number }>>();

  children.forEach((child) => {
    const parsed = parseStoryPart(child?.part);
    if (!parsed || parsed.total <= 1) return;

    const entries = partsByTotal.get(parsed.total) || [];
    entries.push({
      current: parsed.current,
      releasedateTs: toReleaseTimestamp(child?.issue?.releasedate),
    });
    partsByTotal.set(parsed.total, entries);
  });

  const qualifyingTotals = new Set<number>();
  for (const [total, entries] of partsByTotal.entries()) {
    const parts = new Set(entries.map((entry) => entry.current));
    let isComplete = true;
    for (let current = 1; current <= total; current += 1) {
      if (!parts.has(current)) {
        isComplete = false;
        break;
      }
    }
    if (!isComplete) continue;

    const completionTimestamp = Math.max(
      ...entries.map((entry) => entry.releasedateTs).filter((value) => Number.isFinite(value))
    );
    if (completionTimestamp < earliestFullPublicationTimestamp) {
      qualifyingTotals.add(total);
    }
  }

  return qualifyingTotals;
}

function getFirstPublicationLabel(item: ContainsItemLike): string {
  const siblingChildren = item.parent?.children ?? [];
  return getQualifyingMultipartTotals(siblingChildren).size > 0
    ? "Erste vollständige Veröffentlichung"
    : "Erstveröffentlichung";
}

function shouldShowPartialPublicationLabel(item: ContainsItemLike): boolean {
  const parsedPart = parseStoryPart(item.part);
  if (!parsedPart || parsedPart.total <= 1) return false;

  const siblingChildren = item.parent?.children ?? [];
  return getQualifyingMultipartTotals(siblingChildren).has(parsedPart.total);
}

function getContainsTitleLayoutSx(stackActions: boolean) {
  return stackActions
    ? {
        width: "100%",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "start",
        columnGap: 1,
      }
    : {
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 1,
      };
}

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
              filter: null,
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

  const content = props.allowInteractiveActions ? (
    <Link
      component="button"
      type="button"
      variant="body2"
      underline="hover"
      color="text.primary"
      sx={{
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
            filter: null,
          })
        );
      }}
    >
      {props.reprintLabel}
    </Link>
  ) : (
    <Typography
      variant="body2"
      color="text.primary"
      sx={{
        mt: 0.25,
        lineHeight: 1.43,
        fontWeight: 600,
      }}
    >
      {props.reprintLabel}
    </Typography>
  );

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
        {content}
      </CoverTooltip>
    </Box>
  );
}

function ContainsTitleDetailedActionArea(props: Readonly<{
  stackActions: boolean;
  actionChips: React.ReactElement[];
  detailButton: React.ReactNode;
}>) {
  if (props.stackActions) {
    return <Box sx={{ justifySelf: "end", alignSelf: "center" }}>{props.detailButton}</Box>;
  }

  return (
    <Box
      sx={{
        ml: "auto",
        alignSelf: "center",
        display: "flex",
        flexWrap: "wrap",
        gap: 0.6,
        justifyContent: "flex-end",
        alignItems: "center",
      }}
    >
      {props.actionChips}
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

  const stackActions =
    props.compactLayout ??
    Boolean(props.isPhone || (props.isTablet && !props.isTabletLandscape));
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
    <Box data-testid="story-header" sx={getContainsTitleLayoutSx(stackActions)}>
      <Box sx={{ minWidth: 0 }}>
        <ContainsTitleDetailedMainText
          storyTitleLabel={storyTitleLabel}
          storyNumberLabel={storyNumberLabel}
          hasIssueReference={hasIssueReference}
          issue={issue}
          showParentTitle={showParentTitle}
          parentTitle={parentTitle}
          variant={variant}
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

        {stackActions && actionChips.length > 0 ? (
          <Box
            sx={{
              mt: 1,
              display: "flex",
              flexWrap: "wrap",
              gap: 0.6,
              alignItems: "center",
            }}
          >
            {actionChips}
          </Box>
        ) : null}
      </Box>

      <ContainsTitleDetailedActionArea
        stackActions={stackActions}
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
              p: 0,
              textAlign: "right",
              lineHeight: 1.43,
              fontWeight: 600,
            }}
            onClick={() => {
              push(
                buildRouteHref(generateSeoUrl(reprintSelection, true), props.query, {
                  expand: item.parent?.reprintOf?.number,
                  filter: null,
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
                  filter: null,
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
}: {
  item: ContainsItemLike;
  isCover?: boolean;
  exclusive: boolean;
  hasSession: boolean;
}): React.ReactElement[] {
  const chips: React.ReactElement[] = [];

  if (!isCover && item.url && item.number === 0) {
    chips.push(<Chip key="cover" label="Cover" color="default" />);
  }

  if (!isCover && item.onlyapp && item.parent) {
    chips.push(<Chip key="onlyapp" label="Einzige Veröffentlichung" color="secondary" />);
  }

  if (!isCover && !item.onlyapp && item.parent && shouldShowPartialPublicationLabel(item)) {
    chips.push(<Chip key="firstapp-partial" label="Erste teilweise Veröffentlichung" color="primary" />);
  } else if (!isCover && !item.onlyapp && item.firstapp && item.parent) {
    chips.push(<Chip key="firstapp" label={getFirstPublicationLabel(item)} color="primary" />);
  }

  if (!isCover && item.otheronlytb && item.parent) {
    chips.push(
      <Chip key="otheronlytb" variant="outlined" label="Sonst nur in Taschenbuch" color="default" />
    );
  }

  if (exclusive) {
    chips.push(<Chip key="exclusive" label="Exklusiv" color="secondary" />);
  }

  if (item.parent?.collectedmultipletimes && hasSession) {
    chips.push(<Chip key="collectedmultiple" color="success" label="Mehrfach gesammelt" />);
  }

  if (item.parent?.collected !== true || item.parent?.collectedmultipletimes || !hasSession) {
    return chips;
  }

  chips.push(<Chip key="collected" color="success" label="Gesammelt" />);

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
