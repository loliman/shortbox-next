"use client";

import React from "react";
import Box from "@mui/material/Box";
import MuiList from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import type { Issue, SelectedRoot } from "../../types/domain";
import CoverTooltip from "./CoverTooltip";
import { NestedEmptyRow, NestedLoadingRow } from "./NestedNavRow";
import {
  createIssueSecondary,
  createSidebarIssueLabel,
  doesSeriesNodeMatchIssueSeries,
  getDepthPadding,
  getIssueNodeVariant,
  getVariantCount,
  isElementVisibleInContainer,
  isIssueNumberMatch,
  isSelectedIssue,
  scrollNavElementIntoView,
  type IssueNode,
  normalizeIssueNumber,
  type SeriesNode,
  toIssueSeriesSelected,
} from "./listTreeUtils";
import { useBranchWindowing } from "./useBranchWindowing";
import { markNavPerf, measureNavPerf } from "./navPerfDebug";

type IssuesBranchProps = {
  us: boolean;
  series: SeriesNode;
  initialIssueNodes?: IssueNode[];
  selectedIssue?: Issue;
  session?: unknown;
  pushSelection: (event: unknown, item: SelectedRoot, closeOnPhone?: boolean) => void;
  navScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  navigationPending?: boolean;
  pendingNavigationKey?: string | null;
  loading?: boolean;
  scrollRequestId?: number;
  selectedRowKey?: string | null;
  deferProgressiveWindowing?: boolean;
  allowAutoRevealFallback?: boolean;
  onPriorityPathReady?: () => void;
};

const IssuesBranch = React.memo(function IssuesBranch(props: Readonly<IssuesBranchProps>) {
  const ISSUE_ROW_HEIGHT = 36;
  const ISSUE_AUTO_REVEAL_MAX_ATTEMPTS = 8;
  const {
    series,
    us,
    initialIssueNodes,
    selectedIssue,
    session,
    pushSelection,
    selectedRowKey,
    navScrollContainerRef,
    scrollRequestId,
    deferProgressiveWindowing,
    allowAutoRevealFallback,
    onPriorityPathReady,
  } = props;
  const selectedSeries = doesSeriesNodeMatchIssueSeries(series, selectedIssue?.series);
  const selectedIssueNumber = selectedSeries ? normalizeIssueNumber(selectedIssue?.number) : "";
  const previousIssueNumberRef = React.useRef("");
  const skipSameIssueAutoScrollRef = React.useRef(false);
  const autoRevealKeyRef = React.useRef<string | null>(null);
  const issueListRef = React.useRef<HTMLUListElement | null>(null);
  const issueNodes = React.useMemo(() => initialIssueNodes ?? [], [initialIssueNodes]);
  const prioritizedIssueIndex = React.useMemo(() => {
    if (!selectedIssueNumber) return null;
    const index = issueNodes.findIndex((issueNode) => isIssueNumberMatch(issueNode.number, selectedIssueNumber));
    return index >= 0 ? index : null;
  }, [issueNodes, selectedIssueNumber]);
  const { visibleCount, windowEnd, windowStart, windowingEnabled } = useBranchWindowing(
    issueNodes.length,
    prioritizedIssueIndex,
    Boolean(deferProgressiveWindowing),
    {
      rowHeight: ISSUE_ROW_HEIGHT,
      navScrollContainerRef,
      branchListRef: issueListRef,
    }
  );
  const visibleIssueNodes = React.useMemo(
    () => (windowingEnabled ? issueNodes.slice(windowStart, windowEnd) : issueNodes),
    [issueNodes, windowEnd, windowStart, windowingEnabled]
  );

  React.useEffect(() => {
    skipSameIssueAutoScrollRef.current = Boolean(
      previousIssueNumberRef.current &&
        selectedIssueNumber &&
        previousIssueNumberRef.current === selectedIssueNumber
    );
    previousIssueNumberRef.current = selectedIssueNumber;
  }, [selectedIssueNumber]);

  const scrollSelectedIssueIntoView = React.useCallback((force = false) => {
    if (!selectedIssueNumber) return;

    const listElement = issueListRef.current;
    const scrollContainer = navScrollContainerRef.current;
    if (!listElement || !scrollContainer) return false;

    let selectedItem = selectedRowKey
      ? listElement.querySelector<HTMLElement>(`[data-nav-row-key="${CSS.escape(selectedRowKey)}"]`)
      : null;

    selectedItem ??=
      Array.from(listElement.querySelectorAll<HTMLElement>("[data-nav-issue-number]")).find(
        (element) => isIssueNumberMatch(element.dataset.navIssueNumber, selectedIssueNumber)
      ) ?? null;

    if (!selectedItem) return false;
    if (!force && isElementVisibleInContainer(selectedItem, scrollContainer)) return true;

    scrollNavElementIntoView(selectedItem, scrollContainer, {
      behavior: force ? "smooth" : "auto",
    });
    return true;
  }, [navScrollContainerRef, selectedIssueNumber, selectedRowKey]);

  const scheduleIssueAutoReveal = React.useCallback(
    (autoRevealKey: string, force = false) => {
      let frameId = 0;
      let cancelled = false;
      let attempts = 0;
      markNavPerf("issue:reveal:start", {
        seriesKey: `${series.publisher?.name || ""}|${series.title || ""}|${series.volume || ""}`,
        selectedIssueNumber,
        selectedRowKey,
        visibleCount,
        windowStart,
        windowEnd,
        totalCount: issueNodes.length,
        force,
      });

      const run = () => {
        if (cancelled) return;
        const resolved = scrollSelectedIssueIntoView(force);
        if (resolved) {
          autoRevealKeyRef.current = autoRevealKey;
          markNavPerf("issue:reveal:end", {
            selectedIssueNumber,
            selectedRowKey,
            attempts,
          });
          measureNavPerf("issue:reveal", "issue:reveal:start", "issue:reveal:end");
          onPriorityPathReady?.();
          return;
        }
        if (attempts >= ISSUE_AUTO_REVEAL_MAX_ATTEMPTS) {
          autoRevealKeyRef.current = null;
          return;
        }
        attempts += 1;
        frameId = globalThis.requestAnimationFrame(run);
      };

      frameId = globalThis.requestAnimationFrame(run);

      return () => {
        cancelled = true;
        if (frameId) globalThis.cancelAnimationFrame(frameId);
      };
    },
    [
      issueNodes.length,
      onPriorityPathReady,
      scrollSelectedIssueIntoView,
      selectedIssueNumber,
      selectedRowKey,
      series.publisher?.name,
      series.title,
      series.volume,
      visibleCount,
      windowEnd,
      windowStart,
    ]
  );

  const tryResolveInitialIssueViewport = React.useCallback(() => {
    if (allowAutoRevealFallback === false) return;
    if (!selectedIssueNumber) return;

    if (skipSameIssueAutoScrollRef.current) {
      skipSameIssueAutoScrollRef.current = false;
      return;
    }

    const autoRevealKey = `${selectedIssueNumber}|${selectedRowKey || ""}|${issueNodes.length}`;
    if (autoRevealKeyRef.current === autoRevealKey) return;

    const resolvedImmediately = scrollSelectedIssueIntoView(false);
    if (resolvedImmediately) {
      autoRevealKeyRef.current = autoRevealKey;
      onPriorityPathReady?.();
    }
  }, [
    allowAutoRevealFallback,
    issueNodes.length,
    onPriorityPathReady,
    scrollSelectedIssueIntoView,
    selectedIssueNumber,
    selectedRowKey,
  ]);

  React.useLayoutEffect(() => {
    tryResolveInitialIssueViewport();
  }, [tryResolveInitialIssueViewport]);

  React.useEffect(() => {
    if (allowAutoRevealFallback === false) return;
    if (!selectedIssueNumber) return;

    const autoRevealKey = `${selectedIssueNumber}|${selectedRowKey || ""}|${issueNodes.length}`;
    if (autoRevealKeyRef.current === autoRevealKey) return;

    return scheduleIssueAutoReveal(autoRevealKey, false);
  }, [
    allowAutoRevealFallback,
    issueNodes.length,
    selectedIssueNumber,
    selectedRowKey,
    scheduleIssueAutoReveal,
  ]);

  React.useEffect(() => {
    if (!scrollRequestId) return;
    return scheduleIssueAutoReveal(`force|${scrollRequestId}|${selectedRowKey || ""}`, true);
  }, [scheduleIssueAutoReveal, scrollRequestId, selectedRowKey]);

  if (props.loading) {
    return <NestedLoadingRow depth={2} />;
  }

  if (issueNodes.length === 0) return <NestedEmptyRow depth={2} message="Keine Ausgaben vorhanden" />;

  return (
    <MuiList disablePadding ref={issueListRef}>
      {windowingEnabled && windowStart > 0 ? (
        <Box
          component="li"
          aria-hidden
          sx={{
            listStyle: "none",
            m: 0,
            p: 0,
            height: `${windowStart * ISSUE_ROW_HEIGHT}px`,
          }}
        />
      ) : null}
      {visibleIssueNodes.map((issueNode, idx) => {
        const selected = isSelectedIssue(issueNode, selectedIssue, series);
        const issueNumber = issueNode.number || "";
        const issueSeries = toIssueSeriesSelected(issueNode, series, us);
        const variantCount = getVariantCount(issueNode);
        const hasVariants = variantCount > 0;
        const issueNavigationKey = [
          issueSeries.publisher.name,
          issueSeries.title,
          issueSeries.volume,
          issueSeries.startyear || "",
          issueNumber,
          issueNode.format || "",
          getIssueNodeVariant(issueNode) || "",
        ].join("|");
        const issueIsPending = props.pendingNavigationKey === issueNavigationKey;

        return (
          <Box
            key={[
              issueSeries.publisher.name,
              issueSeries.title,
              issueSeries.volume,
              issueNumber,
              issueNode.format || "",
              idx,
            ].join("|")}
            component="li"
            sx={{
              listStyle: "none",
              m: 0,
              p: 0,
            }}
          >
            <ListItemButton
              className="row"
              divider={false}
              selected={selected}
              disabled={props.navigationPending}
              data-nav-row-key={issueNavigationKey}
              data-nav-issue-number={issueNumber}
              sx={{
                pl: getDepthPadding(2) + 1.3,
                py: 0.3,
                backgroundColor: "var(--mui-palette-background-paper)",
                color: "var(--mui-palette-text-primary)",
                "&:hover": { backgroundColor: "action.hover" },
                "&.Mui-selected": { backgroundColor: "var(--mui-palette-background-paper)" },
                "&.Mui-selected:hover": { backgroundColor: "action.hover" },
                "& .MuiListItemText-primary": {
                  color: "var(--mui-palette-text-primary) !important",
                  WebkitTextFillColor: "var(--mui-palette-text-primary) !important",
                  opacity: "1 !important",
                },
              }}
              onClick={(e) =>
                pushSelection(
                  e,
                  {
                    issue: {
                      number: issueNumber,
                      title: issueNode.title,
                      format: issueNode.format,
                      legacy_number: (issueNode as { legacy_number?: string | null }).legacy_number,
                      variant: getIssueNodeVariant(issueNode),
                      series: issueSeries,
                    },
                  },
                  true
                )
              }
            >
              <CoverTooltip issue={issueNode} us={us}>
                <Box sx={{ width: "100%", minWidth: 0 }}>
                  <ListItemText
                    sx={{
                      "& .MuiListItemText-primary": {
                        color: "var(--mui-palette-text-primary) !important",
                        WebkitTextFillColor: "var(--mui-palette-text-primary) !important",
                        opacity: "1 !important",
                      },
                    }}
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <Typography
                          component="span"
                          noWrap
                          sx={(theme) => ({
                            minWidth: 0,
                            flex: 1,
                            fontSize: "0.9rem",
                            fontWeight: selected ? 700 : 400,
                            color: "var(--mui-palette-text-primary) !important",
                            WebkitTextFillColor: "var(--mui-palette-text-primary) !important",
                            opacity: 1,
                          })}
                        >
                          <Box
                            component="span"
                            sx={{
                              color: "inherit",
                              display: "block",
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {createSidebarIssueLabel(issueNode, us)}
                          </Box>
                        </Typography>
                        {issueIsPending ? (
                          <Box
                            aria-hidden="true"
                            role="presentation"
                            sx={{
                              flexShrink: 0,
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: "action.active",
                              opacity: 0.72,
                              animation: "shortboxIssuePendingPulse 920ms ease-in-out infinite",
                              "@keyframes shortboxIssuePendingPulse": {
                                "0%": { opacity: 0.36, transform: "scale(0.92)" },
                                "50%": { opacity: 0.82, transform: "scale(1)" },
                                "100%": { opacity: 0.36, transform: "scale(0.92)" },
                              },
                            }}
                          />
                        ) : null}
                        {hasVariants ? (
                          <Typography
                            component="span"
                            variant="caption"
                            data-audit-ignore-pa11y="nav-variant-count"
                            sx={(theme) => ({
                              display: "inline-flex",
                              alignItems: "center",
                              flexShrink: 0,
                              fontSize: "0.68rem",
                              color: "#111111",
                              fontWeight: 600,
                              px: 0.5,
                              py: 0.125,
                              borderRadius: 1,
                              backgroundColor: "#ffffff",
                              opacity: 1,
                              ...theme.applyStyles("dark", {
                                color: theme.palette.common.white,
                                backgroundColor: "#1e1e1e",
                              }),
                            })}
                          >
                            {variantCount} {variantCount === 1 ? "Variante" : "Varianten"}
                          </Typography>
                        ) : null}
                      </Box>
                    }
                    secondary={createIssueSecondary(issueNode, Boolean(session))}
                    slotProps={{
                      secondary: {
                        noWrap: true,
                        sx: {
                          color: "text.secondary",
                        },
                      },
                    }}
                  />
                </Box>
              </CoverTooltip>
            </ListItemButton>
          </Box>
        );
      })}
      {windowingEnabled && windowEnd < issueNodes.length ? (
        <Box
          component="li"
          aria-hidden
          sx={{
            listStyle: "none",
            m: 0,
            p: 0,
            height: `${Math.max(0, issueNodes.length - windowEnd) * ISSUE_ROW_HEIGHT}px`,
          }}
        />
      ) : null}
    </MuiList>
  );
});

export default IssuesBranch;
