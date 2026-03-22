"use client";

import React from "react";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import MuiList from "@mui/material/List";
import type { Issue, SelectedRoot, Series } from "../../types/domain";
import IssuesBranch from "./IssuesBranch";
import { NestedEmptyRow, NestedRow } from "./NestedNavRow";
import {
  createSeriesLabel,
  doesSeriesNodeMatchIssueSeries,
  getSeriesKey,
  isSeriesNodeSelected,
  type IssueNode,
  type PublisherNode,
  type SeriesNode,
  toSeriesSelected,
} from "./listTreeUtils";
import { readNavExpansionState, writeNavExpansionState } from "./navStateStorage";

type SeriesBranchProps = {
  us: boolean;
  publisher: PublisherNode;
  initialSeriesNodes?: SeriesNode[];
  initialIssueNodesBySeriesKey?: Record<string, IssueNode[]>;
  navStateKey: string;
  activeSeriesKey: string | null;
  queryExpandedSeriesKey?: string | null;
  selectedIssue?: Issue;
  session?: unknown;
  pushSelection: (event: unknown, item: SelectedRoot, closeOnPhone?: boolean) => void;
  updateNavRoute: (nextQuery: { navPublisher?: string | null; navSeries?: string | null }) => void;
  navScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  suppressAutoScrollRef: React.MutableRefObject<boolean>;
};

const SeriesBranch = React.memo(function SeriesBranch(props: Readonly<SeriesBranchProps>) {
  const { publisher, us } = props;
  const publisherName = publisher.name || "";
  const seriesStateKey = `${props.navStateKey}|${publisherName}`;
  const initialIssueNodesBySeriesKey = props.initialIssueNodesBySeriesKey;
  const activeSeriesKey = props.activeSeriesKey;
  const queryExpandedSeriesKey = props.queryExpandedSeriesKey;
  const selectedIssue = props.selectedIssue;
  const updateNavRoute = props.updateNavRoute;
  const [expandedSeries, setExpandedSeries] = React.useState<Record<string, boolean>>(
    () => readNavExpansionState(seriesStateKey)
  );

  React.useEffect(() => {
    setExpandedSeries(readNavExpansionState(seriesStateKey));
  }, [seriesStateKey]);

  React.useEffect(() => {
    writeNavExpansionState(seriesStateKey, expandedSeries);
  }, [expandedSeries, seriesStateKey]);

  const seriesNodes = React.useMemo(() => props.initialSeriesNodes || [], [props.initialSeriesNodes]);
  const seriesSelectionByKey = React.useMemo(() => {
    const selection: Record<string, Series> = {};
    for (const seriesNode of seriesNodes) {
      selection[getSeriesKey(seriesNode)] = toSeriesSelected(seriesNode, us);
    }
    return selection;
  }, [seriesNodes, us]);

  React.useEffect(() => {
    if (!activeSeriesKey) return;

    setExpandedSeries((prev) =>
      prev[activeSeriesKey] ? prev : { ...prev, [activeSeriesKey]: true }
    );
  }, [activeSeriesKey]);

  React.useEffect(() => {
    if (!selectedIssue?.series) return;
    const matchingSeriesNode = seriesNodes.find((seriesNode) =>
      doesSeriesNodeMatchIssueSeries(seriesNode, selectedIssue?.series)
    );
    if (!matchingSeriesNode) return;

    const matchingSeriesKey = getSeriesKey(matchingSeriesNode);
    setExpandedSeries((prev) =>
      prev[matchingSeriesKey] ? prev : { ...prev, [matchingSeriesKey]: true }
    );
  }, [selectedIssue, seriesNodes]);

  React.useEffect(() => {
    if (!queryExpandedSeriesKey) return;

    setExpandedSeries((prev) =>
      prev[queryExpandedSeriesKey] ? prev : { ...prev, [queryExpandedSeriesKey]: true }
    );
  }, [queryExpandedSeriesKey]);

  const handleToggleSeries = React.useCallback(
    (seriesKey: string) => {
      const isExpanded = Boolean(expandedSeries[seriesKey]);
      const hasServerData = Array.isArray(initialIssueNodesBySeriesKey?.[seriesKey]);

      if (!isExpanded && !hasServerData) {
        updateNavRoute({ navPublisher: publisherName, navSeries: seriesKey });
        return;
      }

      setExpandedSeries((prev) => ({ ...prev, [seriesKey]: !prev[seriesKey] }));

      if (isExpanded && queryExpandedSeriesKey === seriesKey) {
        updateNavRoute({ navPublisher: publisherName, navSeries: null });
      }
    },
    [
      expandedSeries,
      initialIssueNodesBySeriesKey,
      queryExpandedSeriesKey,
      updateNavRoute,
      publisherName,
    ]
  );
  const pushSelection = props.pushSelection;
  const handleSeriesClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>, seriesKey: string) => {
      const selectedSeries = seriesSelectionByKey[seriesKey];
      if (!selectedSeries) return;
      pushSelection(
        event,
        {
          series: selectedSeries,
        },
        true
      );
    },
    [pushSelection, seriesSelectionByKey]
  );

  if (seriesNodes.length === 0) return <NestedEmptyRow depth={1} message="Keine Serien vorhanden" />;

  return (
    <MuiList disablePadding>
      {seriesNodes.map((seriesNode) => {
        const seriesKey = getSeriesKey(seriesNode);
        const selected = isSeriesNodeSelected(seriesNode, props.activeSeriesKey, props.selectedIssue);
        const expanded = Boolean(expandedSeries[seriesKey]);

        return (
          <Box key={seriesKey}>
            <NestedRow
              rowKey={seriesKey}
              depth={1}
              label={createSeriesLabel(seriesNode)}
              selected={selected}
              expanded={expanded}
              onToggle={handleToggleSeries}
              onClick={handleSeriesClick}
            />

            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <IssuesBranch
                us={us}
                series={seriesNode}
                initialIssueNodes={initialIssueNodesBySeriesKey?.[seriesKey] || []}
                selectedIssue={selectedIssue}
                session={props.session}
                pushSelection={pushSelection}
                navScrollContainerRef={props.navScrollContainerRef}
                suppressAutoScrollRef={props.suppressAutoScrollRef}
              />
            </Collapse>
          </Box>
        );
      })}
    </MuiList>
  );
});

export default SeriesBranch;
