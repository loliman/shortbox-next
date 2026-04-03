import { notFound } from "next/navigation";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import QueryResult from "../generic/QueryResult";
import { generateLabel } from "../../lib/routes/hierarchy";
import TitleLine from "../generic/TitleLine";
import { IssueHistoryList } from "./DetailsListingSections";
import { DetailsPagePlaceholder } from "../placeholders/DetailsPagePlaceholder";
import { DetailsAddInfo } from "./DetailsAddInfo";
import DetailsHeaderActionBar from "./DetailsHeaderActionBar";
import type { PreviewIssue } from "../issue-preview/utils/issuePreviewUtils";
import type { Publisher, SelectedRoot } from "../../types/domain";
import type { LayoutRouteData, RouteQuery } from "../../types/route-ui";
import type { SessionData } from "../../types/session";

interface PublisherDetailsData extends Publisher {
  active?: boolean | null;
  endyear?: number | null;
  startyear?: number | null;
  addinfo?: string | null;
}

interface PublisherDetailsProps {
  initialData?: { details?: PublisherDetailsData | null; issues?: unknown[] } | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  selected: SelectedRoot;
  level: LayoutRouteData["level"];
  us: boolean;
  query?: RouteQuery | null;
  initialFilterCount?: number | null;
  session?: SessionData | null;
}

export default function PublisherDetails(props: Readonly<PublisherDetailsProps>) {
  const selected = props.selected;
  const us = Boolean(props.us);
  const details = props.initialData?.details || null;
  const issues = (props.initialData?.issues || []) as PreviewIssue[];
  const detailsError = null;
  if (!details) notFound();
  const startYearLabel =
    typeof details.startyear === "number" || typeof details.startyear === "string"
      ? String(details.startyear)
      : "";
  const endYearLabel =
    details.active || details.endyear === 0
      ? "heute"
      : typeof details.endyear === "number" || typeof details.endyear === "string"
        ? String(details.endyear)
        : "";
  const previewProps = {
    us,
    session: props.session,
    selected,
    query: props.query,
  };

  return (
    detailsError || !details ? (
      <QueryResult
        error={detailsError}
        data={details || null}
        loading={false}
        selected={selected}
        placeholder={
          <DetailsPagePlaceholder
            query={props.query}
            compactLayout={false}
            titleWidth="48%"
            subheaderWidth="26%"
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
              title={generateLabel({ publisher: details, us })}
            />
          }
          subheader={`${startYearLabel} - ${endYearLabel}`}
          action={
            <DetailsHeaderActionBar
              id={(details.id as string | number | undefined) ?? undefined}
              item={details}
              query={props.query}
              selected={selected}
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
      </>
    )
  );
}
