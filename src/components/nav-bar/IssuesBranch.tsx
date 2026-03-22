"use client";

import React from "react";
import Box from "@mui/material/Box";
import MuiList from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import type { Issue, SelectedRoot } from "../../types/domain";
import CoverTooltip from "./CoverTooltip";
import { NestedEmptyRow } from "./NestedNavRow";
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
  type IssueNode,
  normalizeIssueNumber,
  type SeriesNode,
  toIssueSeriesSelected,
} from "./listTreeUtils";

type IssuesBranchProps = {
  us: boolean;
  series: SeriesNode;
  initialIssueNodes?: IssueNode[];
  selectedIssue?: Issue;
  session?: unknown;
  pushSelection: (event: unknown, item: SelectedRoot, closeOnPhone?: boolean) => void;
  navScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  suppressAutoScrollRef: React.MutableRefObject<boolean>;
};

const IssuesBranch = React.memo(function IssuesBranch(props: Readonly<IssuesBranchProps>) {
  const {
    series,
    us,
    initialIssueNodes,
    selectedIssue,
    session,
    pushSelection,
    navScrollContainerRef,
    suppressAutoScrollRef,
  } = props;
  const selectedSeries = doesSeriesNodeMatchIssueSeries(series, selectedIssue?.series);
  const selectedIssueNumber = selectedSeries ? normalizeIssueNumber(selectedIssue?.number) : "";
  const previousIssueNumberRef = React.useRef("");
  const skipSameIssueAutoScrollRef = React.useRef(false);
  const issueListRef = React.useRef<HTMLUListElement | null>(null);
  const issueNodes = React.useMemo(() => initialIssueNodes ?? [], [initialIssueNodes]);

  React.useEffect(() => {
    skipSameIssueAutoScrollRef.current = Boolean(
      previousIssueNumberRef.current &&
        selectedIssueNumber &&
        previousIssueNumberRef.current === selectedIssueNumber
    );
    previousIssueNumberRef.current = selectedIssueNumber;
  }, [selectedIssueNumber]);

  const scrollSelectedIssueIntoView = React.useCallback(() => {
    if (!selectedIssueNumber) return;

    const listElement = issueListRef.current;
    const scrollContainer = navScrollContainerRef.current;
    if (!listElement || !scrollContainer) return;

    const selectedItem = Array.from(
      listElement.querySelectorAll<HTMLElement>("[data-nav-issue-number]")
    ).find((element) => isIssueNumberMatch(element.dataset.navIssueNumber, selectedIssueNumber));
    if (!selectedItem) return;
    if (isElementVisibleInContainer(selectedItem, scrollContainer)) return;

    selectedItem.scrollIntoView({
      block: "center",
      inline: "nearest",
    });
  }, [navScrollContainerRef, selectedIssueNumber]);

  React.useEffect(() => {
    if (!selectedIssueNumber) return;

    if (suppressAutoScrollRef.current) {
      suppressAutoScrollRef.current = false;
      return;
    }

    if (skipSameIssueAutoScrollRef.current) {
      skipSameIssueAutoScrollRef.current = false;
      return;
    }

    scrollSelectedIssueIntoView();

    if (typeof ResizeObserver === "undefined") return;
    const listElement = issueListRef.current;
    if (!listElement) return;

    const observer = new ResizeObserver(() => {
      scrollSelectedIssueIntoView();
    });
    observer.observe(listElement);

    return () => {
      observer.disconnect();
    };
  }, [
    issueNodes,
    selectedIssueNumber,
    suppressAutoScrollRef,
    scrollSelectedIssueIntoView,
  ]);

  if (issueNodes.length === 0) return <NestedEmptyRow depth={2} message="Keine Ausgaben vorhanden" />;

  return (
    <MuiList disablePadding ref={issueListRef}>
      {issueNodes.map((issueNode, idx) => {
        const selected = isSelectedIssue(issueNode, selectedIssue, series);
        const issueNumber = issueNode.number || "";
        const issueSeries = toIssueSeriesSelected(issueNode, series, us);
        const variantCount = getVariantCount(issueNode);
        const hasVariants = variantCount > 0;

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
          >
            <ListItemButton
              className="row"
              divider={false}
              selected={selected}
              data-nav-issue-number={issueNumber}
              sx={{
                pl: getDepthPadding(2) + 1.3,
                py: 0.3,
                "&.Mui-selected": { backgroundColor: "transparent" },
                "&.Mui-selected:hover": { backgroundColor: "action.hover" },
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
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <Typography
                          component="span"
                          noWrap
                          sx={{
                            minWidth: 0,
                            flex: 1,
                            fontSize: "0.9rem",
                            fontWeight: selected ? 700 : 400,
                          }}
                        >
                          <Box
                            component="span"
                            sx={{
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
                        {hasVariants ? (
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.disabled"
                            sx={{ flexShrink: 0, fontSize: "0.68rem" }}
                          >
                            {variantCount} {variantCount === 1 ? "Variante" : "Varianten"}
                          </Typography>
                        ) : null}
                      </Box>
                    }
                    secondary={createIssueSecondary(issueNode, Boolean(session))}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </Box>
              </CoverTooltip>
            </ListItemButton>
          </Box>
        );
      })}
    </MuiList>
  );
});

export default IssuesBranch;
