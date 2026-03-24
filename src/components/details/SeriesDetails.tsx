import React from "react";
import { notFound } from "next/navigation";
import NextLink from "next/link";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { generateLabel } from "../../util/hierarchy";
import EditButton from "../restricted/EditButton";
import TitleLine from "../generic/TitleLine";
import { IssueHistoryList } from "./DetailsListingSections";
import { DetailsAddInfo } from "./DetailsAddInfo";
import type { SelectedRoot } from "../../types/domain";
import type { LayoutRouteData, RouteQuery } from "../../types/route-ui";
import type { SessionData } from "../../app/session";
import SortContainer from "../SortContainer";
import Box from "@mui/material/Box";
import { buildGenreFilterUrl } from "../../lib/url-builder";
import type { PreviewIssue } from "../issue-preview/utils/issuePreviewUtils";

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
  initialData?: { details?: SeriesDetailsData | null; issues?: PreviewIssue[] } | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
  selected: SelectedRoot & {
    series: {
      title: string;
      volume: number;
      publisher: {
        name: string;
      };
    };
  };
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

function buildGenreLinks(genreLabel: string): string[] {
  if (!genreLabel) return [];

  return genreLabel
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
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
    <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="flex-end">
      {props.session ? (
        <Box
          component="span"
          sx={{
            flexShrink: 0,
            color: "text.secondary",
            fontSize: "0.75rem",
            fontWeight: 500,
            opacity: 0.8,
            whiteSpace: "nowrap",
            lineHeight: 1,
          }}
        >
          #{props.details.id ?? ""}
        </Box>
      ) : null}
      <SortContainer query={props.query as any} selected={props.selected} us={props.us} />
      <EditButton
        session={props.session}
        item={props.details}
        level={props.level}
        us={props.us}
      />
    </Stack>
  );
}

function GenreLinksBlock(props: Readonly<{ genreLinks: string[]; us: boolean }>) {
  if (props.genreLinks.length === 0) return null;

  return (
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Genres: {props.genreLinks.map((genre, index) => (
        <React.Fragment key={`genre-link-${genre}`}>
          {index > 0 ? ", " : null}
          <Link
            component={NextLink}
            href={buildGenreFilterUrl(props.us ? "us" : "de", genre)}
            underline="hover"
            color="inherit"
          >
            {genre}
          </Link>
        </React.Fragment>
      ))}
    </Typography>
  );
}

export default function SeriesDetails(props: Readonly<SeriesDetailsProps>) {
  const us = Boolean(props.us);
  const details = props.initialData?.details || null;
  const issues = props.initialData?.issues || [];
  if (!details) notFound();
  const endYearLabel = readEndYearLabel(details);
  const genreLabel = readTextValue(details.genre);
  const genreLinks = buildGenreLinks(genreLabel);
  const yearLabel = buildYearLabel(details.startyear, endYearLabel);
  const subheaderLabel = buildSubheaderLabel(yearLabel, genreLabel);
  const previewProps = {
    us,
    session: props.session,
    selected: props.selected,
    query: props.query,
  };

  return (
    <>
      <CardHeader
        sx={{
          "& .MuiCardHeader-action": {
            m: 0,
            alignSelf: "center",
          },
        }}
        title={
          <TitleLine
            title={generateLabel({ series: details as any, us })}
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
        <GenreLinksBlock genreLinks={genreLinks} us={us} />

        <IssueHistoryList
          query={props.query}
          compactLayout={false}
          issues={issues}
          loadingMore={false}
          previewProps={previewProps}
          showSort={false}
        />
      </CardContent>
    </>
  );
}
