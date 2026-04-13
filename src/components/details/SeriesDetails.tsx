import React from "react";
import { notFound } from "next/navigation";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import { generateLabel } from "../../lib/routes/hierarchy";
import TitleLine from "../generic/TitleLine";
import { IssueHistoryList } from "./DetailsListingSections";
import { DetailsAddInfo } from "./DetailsAddInfo";
import DetailsHeaderActionBar from "./DetailsHeaderActionBar";
import type { SelectedRoot } from "../../types/domain";
import type { LayoutRouteData, RouteQuery } from "../../types/route-ui";
import type { SessionData } from "../../types/session";
import type { PreviewIssue } from "../issue-preview/utils/issuePreviewUtils";
import Box from "@mui/material/Box";
import { detailsBackgroundSx } from "./detailsBackgroundSx";

interface SeriesDetailsData {
  id?: string | number | null;
  title?: string | null;
  startyear?: number | null;
  endyear?: number | null;
  volume?: number | null;
  genre?: string | null;
  addinfo?: string | null;
  active?: boolean | null;
  publisher?: {
    name?: string | null;
  } | null;
}

interface SeriesDetailsProps {
  initialData?: { details?: SeriesDetailsData | null; issues?: unknown[] } | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
  selected: SelectedRoot;
  level: LayoutRouteData["level"];
  us: boolean;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
  session?: SessionData | null;
}

function readTextValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readYearValue(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return readTextValue(value);
}

function readEndYearLabel(details: SeriesDetailsData): string {
  if (details.active || details.endyear === 0) return "heute";
  return readYearValue(details.endyear);
}

function buildYearLabel(startYear: unknown, endYear: unknown): string {
  const startYearLabel = readYearValue(startYear);
  const endYearLabel = readYearValue(endYear);

  if (startYearLabel && endYearLabel && startYearLabel === endYearLabel) return startYearLabel;
  if (startYearLabel && endYearLabel) return `${startYearLabel}-${endYearLabel}`;
  return startYearLabel || endYearLabel;
}

function buildSubheaderLabel(yearLabel: string, genreLabel: string): string | undefined {
  if (yearLabel && genreLabel) return `${yearLabel} | ${genreLabel}`;
  if (yearLabel) return yearLabel;
  if (genreLabel) return genreLabel;
  return undefined;
}

function SeriesHeaderAction(
  props: Readonly<{
    details: SeriesDetailsData;
    query?: RouteQuery | null;
    selected: SeriesDetailsProps["selected"];
    session?: SessionData | null;
    level: LayoutRouteData["level"];
    us: boolean;
  }>
) {
  return (
    <DetailsHeaderActionBar
      id={props.details.id}
      item={props.details}
      query={props.query}
      selected={props.selected}
      session={props.session}
      level={props.level}
      us={props.us}
    />
  );
}

export default function SeriesDetails(props: Readonly<SeriesDetailsProps>) {
  const us = Boolean(props.us);
  const details = props.initialData?.details || null;
  const issues = (props.initialData?.issues || []) as PreviewIssue[];
  if (!details) notFound();
  const seriesSelection: SelectedRoot = {
    series: {
      title: details.title || "",
      volume: details.volume ?? 0,
      startyear: details.startyear ?? null,
      endyear: details.endyear ?? null,
      publisher: {
        name: details.publisher?.name || "",
        us,
      },
    },
  };
  const endYearLabel = readEndYearLabel(details);
  const genreLabel = readTextValue(details.genre);
  const yearLabel = buildYearLabel(details.startyear, endYearLabel);
  const subheaderLabel = buildSubheaderLabel(yearLabel, genreLabel);
  const previewProps = {
    us,
    session: props.session,
    selected: props.selected,
    query: props.query,
  };

  return (
    <Box sx={detailsBackgroundSx}>
      <CardHeader
        sx={{
          "& .MuiCardHeader-action": {
            m: 0,
            alignSelf: "center",
          },
        }}
        title={
          <TitleLine
            title={generateLabel(seriesSelection)}
          />
        }
        subheader={subheaderLabel}
        action={
          <SeriesHeaderAction
            details={details}
            query={props.query}
            selected={props.selected}
            session={props.session}
            level={props.level}
            us={props.us}
          />
        }
      />

      <CardContent sx={{ pt: 1 }}>
        <DetailsAddInfo addinfo={details.addinfo ?? undefined} />

        <IssueHistoryList
          query={props.query}
          compactLayout={false}
          issues={issues}
          loadingMore={false}
          previewProps={previewProps}
          showSort={false}
        />
      </CardContent>
    </Box>
  );
}
