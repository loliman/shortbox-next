import { notFound } from "next/navigation";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import QueryResult from "../generic/QueryResult";
import { generateLabel } from "../../util/hierarchy";
import EditButton from "../restricted/EditButton";
import TitleLine from "../generic/TitleLine";
import { IssueHistoryList } from "./DetailsListingSections";
import { DetailsPagePlaceholder } from "../placeholders/DetailsPagePlaceholder";
import { DetailsAddInfo } from "./DetailsAddInfo";
import type { SelectedRoot } from "../../types/domain";
import type { LayoutRouteData, RouteQuery } from "../../types/route-ui";
import type { SessionData } from "../../app/session";
import SortContainer from "../SortContainer";
import Box from "@mui/material/Box";

interface PublisherDetailsProps {
  initialData?: { details?: Record<string, unknown> | null; issues?: unknown[] } | null;
  initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
  initialSeriesNodesByPublisher?: Record<string, unknown[]>;
  selected: SelectedRoot & {
    publisher: {
      name: string;
    };
  };
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
  const issues = props.initialData?.issues || [];
  const detailsError = null;
  if (!details) notFound();
  const endYearLabel =
    details && (details.active || details.endyear === 0) ? "heute" : details?.endyear;
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
              title={generateLabel({ publisher: details as any, us })}
            />
          }
          subheader={String(details.startyear || "") + " - " + String(endYearLabel || "")}
          action={
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
                  #{(details.id as string | number | undefined) ?? ""}
                </Box>
              ) : null}
              <SortContainer query={props.query as any} selected={selected} us={us} />
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
            showSort={false}
          />
        </CardContent>
      </>
    )
  );
}
