"use client";

import React from "react";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import { generateLabel } from "../../util/hierarchy";
import Layout from "../Layout";
import QueryResult from "../generic/QueryResult";
import EditButton from "../restricted/EditButton";
import { AppContext } from "../generic/AppContext";
import TitleLine from "../generic/TitleLine";
import { IssueHistoryList } from "./DetailsListingSections";
import { DetailsPagePlaceholder } from "../placeholders/DetailsPagePlaceholder";
import { DetailsAddInfo } from "./DetailsAddInfo";
import { useDualLoadingRegistration } from "./useDualLoadingRegistration";
import type { SelectedRoot } from "../../types/domain";
import SortContainer from "../SortContainer";
import type { AppRouteContextValue } from "../../app/routeContext";

interface SeriesDetailsProps {
  routeContext: AppRouteContextValue;
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
  level?: string;
  us?: boolean;
  query?: Record<string, unknown> | null;
  session?: unknown;
  appIsLoading?: boolean;
  compactLayout?: boolean;
  isPhone?: boolean;
  isTablet?: boolean;
  isTabletLandscape?: boolean;
  registerLoadingComponent?: (component: string) => void;
  unregisterLoadingComponent?: (component: string) => void;
  [key: string]: unknown;
}

function SeriesDetailsContent(props: Readonly<SeriesDetailsProps>) {
  const us = Boolean(props.us);
  const registerLoadingComponent = props.registerLoadingComponent || (() => {});
  const unregisterLoadingComponent = props.unregisterLoadingComponent || (() => {});
  const pageProps = props as Record<string, unknown>;
  const compactLayout =
    props.compactLayout ??
    Boolean(props.isPhone || (props.isTablet && !props.isTabletLandscape));
  const { markDetailsLoaded, markHistoryLoaded } = useDualLoadingRegistration({
    registerLoadingComponent,
    unregisterLoadingComponent,
    detailsKey: "SeriesDetails_details",
    historyKey: "SeriesDetails_history",
  });
  const details = props.initialData?.details || null;
  const issues = props.initialData?.issues || [];
  const loading = false;
  const detailsError = null;
  const endYearLabel =
    details && (details.active || details.endyear === 0) ? "heute" : details?.endyear;
  const genreLabel = String(details?.genre || "").trim();
  const subheaderLabel = details
    ? `${details.startyear}-${endYearLabel}${genreLabel ? ` | ${genreLabel}` : ""}`
    : undefined;

  React.useEffect(() => {
    if (details || detailsError) {
      markDetailsLoaded();
      markHistoryLoaded();
    }
  }, [details, markDetailsLoaded, markHistoryLoaded]);

  return (
    <Layout
      routeContext={props.routeContext}
      initialPublisherNodes={props.initialPublisherNodes}
      initialSeriesNodesByPublisher={props.initialSeriesNodesByPublisher as Record<string, never[]> | undefined}
      initialIssueNodesBySeriesKey={props.initialIssueNodesBySeriesKey as Record<string, never[]> | undefined}
    >
      {detailsError || !details ? (
        <QueryResult
          error={detailsError}
          data={details || null}
          loading={loading}
          selected={props.selected}
          placeholder={
            <DetailsPagePlaceholder
              query={props.query}
              compactLayout={compactLayout}
              titleWidth="45%"
              subheaderWidth="30%"
            />
          }
          placeholderCount={1}
        />
      ) : (
        <React.Fragment>
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
                {!compactLayout ? <SortContainer {...pageProps} /> : null}
                <EditButton
                  item={details}
                  level={props.level}
                  us={props.us}
                  routeContext={props.routeContext}
                />
              </Stack>
            }
          />

          <CardContent sx={{ pt: 1 }}>
            <DetailsAddInfo addinfo={(details.addinfo as string | null | undefined) ?? undefined} />

            <IssueHistoryList
              query={props.query}
              compactLayout={compactLayout}
              issues={issues as any}
              loadingMore={false}
              previewProps={pageProps}
              showSort={compactLayout}
            />
          </CardContent>
        </React.Fragment>
      )}
    </Layout>
  );
}

export default function SeriesDetails(
  props: Readonly<{
    routeContext: AppRouteContextValue;
    initialData?: { details?: Record<string, unknown> | null; issues?: unknown[] } | null;
    initialPublisherNodes?: Array<{ id?: string | null; name?: string | null; us?: boolean | null }>;
    initialSeriesNodesByPublisher?: Record<string, unknown[]>;
    initialIssueNodesBySeriesKey?: Record<string, unknown[]>;
  }>
) {
  const appContext = React.useContext(AppContext);

  return (
    <SeriesDetailsView
      {...(appContext as unknown as SeriesDetailsProps)}
      {...(props.routeContext as unknown as SeriesDetailsProps)}
      {...(props as unknown as SeriesDetailsProps)}
    />
  );
}

function SeriesDetailsView(props: Readonly<SeriesDetailsProps>) {
  return <SeriesDetailsContent {...props} />;
}
