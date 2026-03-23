import { notFound } from "next/navigation";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import { generateLabel } from "../../util/hierarchy";
import QueryResult from "../generic/QueryResult";
import EditButton from "../restricted/EditButton";
import TitleLine from "../generic/TitleLine";
import { IssueHistoryList } from "./DetailsListingSections";
import { DetailsPagePlaceholder } from "../placeholders/DetailsPagePlaceholder";
import { DetailsAddInfo } from "./DetailsAddInfo";
import type { SelectedRoot } from "../../types/domain";
import type { LayoutRouteData, RouteQuery } from "../../types/route-ui";
import type { SessionData } from "../../app/session";

interface SeriesDetailsProps {
  initialData?: { details?: Record<string, unknown> | null; issues?: unknown[] } | null;
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

export default function SeriesDetails(props: Readonly<SeriesDetailsProps>) {
  const us = Boolean(props.us);
  const details = props.initialData?.details || null;
  const issues = props.initialData?.issues || [];
  const detailsError = null;
  if (!details) notFound();
  const endYearLabel =
    details && (details.active || details.endyear === 0) ? "heute" : details?.endyear;
  const genreLabel = String(details?.genre || "").trim();
  const startYearLabel = details?.startyear;
  const yearLabel =
    startYearLabel && endYearLabel && String(startYearLabel) === String(endYearLabel)
      ? String(startYearLabel)
      : startYearLabel && endYearLabel
        ? `${startYearLabel}-${endYearLabel}`
        : String(startYearLabel || endYearLabel || "");
  const subheaderLabel = details
    ? `${yearLabel}${genreLabel ? ` | ${genreLabel}` : ""}`
    : undefined;
  const previewProps = {
    us,
    session: props.session,
    selected: props.selected,
  };

  return (
    detailsError || !details ? (
      <QueryResult
        error={detailsError}
        data={details || null}
        loading={false}
        selected={props.selected}
        placeholder={
          <DetailsPagePlaceholder
            query={props.query}
            compactLayout={false}
            titleWidth="45%"
            subheaderWidth="30%"
          />
        }
        placeholderCount={1}
      />
    ) : (
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
              id={(details.id as string | undefined) ?? undefined}
              session={props.session}
            />
          }
          subheader={subheaderLabel}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <EditButton
                session={props.session}
                item={details}
                level={props.level}
                us={props.us}
              />
            </Stack>
          }
        />

        <CardContent sx={{ pt: 1 }}>
          <DetailsAddInfo addinfo={(details.addinfo as string | null | undefined) ?? undefined} />

          <IssueHistoryList
            query={props.query}
            compactLayout={false}
            issues={issues as any}
            loadingMore={false}
            previewProps={previewProps}
            showSort
          />
        </CardContent>
      </>
    )
  );
}
