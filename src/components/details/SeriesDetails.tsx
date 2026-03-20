import React from "react";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import { generateLabel } from "../../util/hierarchy";
import Layout from "../Layout";
import { useQuery } from "@apollo/client";
import QueryResult from "../generic/QueryResult";
import { lastEdited, seriesd } from "../../graphql/queriesTyped";
import EditButton from "../restricted/EditButton";
import { AppContext } from "../generic/AppContext";
import { useAppRouteContext } from "../generic";
import PaginatedQuery from "../generic/PaginatedQuery";
import TitleLine from "../generic/TitleLine";
import { IssueHistoryList } from "./DetailsListingSections";
import { getListingDirection, getListingOrder, parseListingFilter } from "../../util/listingQuery";
import { DetailsPagePlaceholder } from "../placeholders/DetailsPagePlaceholder";
import { DetailsAddInfo } from "./DetailsAddInfo";
import { useDualLoadingRegistration } from "./useDualLoadingRegistration";
import type { SelectedRoot } from "../../types/domain";
import SortContainer from "../SortContainer";

interface SeriesDetailsProps {
  selected: SelectedRoot & {
    series: {
      title: string;
      volume: number;
      publisher: {
        name: string;
      };
    };
  };
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
  const filter = React.useMemo(() => {
    const parsed = parseListingFilter(props.query, us);
    return {
      ...parsed,
      series: [
        {
          title: props.selected.series.title,
          volume: props.selected.series.volume,
          publisher: { us },
        },
      ],
      publishers: [{ name: props.selected.series.publisher.name, us }],
    };
  }, [
    props.query,
    props.selected.series.publisher.name,
    props.selected.series.title,
    props.selected.series.volume,
    us,
  ]);

  const {
    error: detailsError,
    data: detailsData,
    previousData: previousDetailsData,
    loading,
  } = useQuery(seriesd, {
    variables: props.selected,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });
  const details =
    detailsData?.seriesDetails ?? (loading ? previousDetailsData?.seriesDetails : null);
  const endYearLabel =
    details && (details.active || details.endyear === 0) ? "heute" : details?.endyear;
  const genreLabel = details?.genre?.trim();
  const subheaderLabel = details
    ? `${details.startyear}-${endYearLabel}${genreLabel ? ` | ${genreLabel}` : ""}`
    : undefined;

  React.useEffect(() => {
    if (details || detailsError) {
      markDetailsLoaded();
    }
  }, [details, detailsError, markDetailsLoaded]);

  return (
    <PaginatedQuery
      query={lastEdited}
      variables={{
        filter,
        order: getListingOrder(props.query),
        direction: getListingDirection(props.query),
      }}
      onCompleted={markHistoryLoaded}
    >
      {({ error, data, fetchMore, hasMore, fetching }) => {
        const issues = data ? data.lastEdited : [];
        const combinedError = detailsError || error;

        return (
          <Layout handleScroll={fetchMore}>
            {combinedError || !details ? (
              <QueryResult
                error={combinedError}
                data={details || null}
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
                      id={details.id ?? undefined}
                      session={props.session}
                    />
                  }
                  subheader={subheaderLabel}
                  action={
                    <Stack direction="row" spacing={1} alignItems="center">
                      {!compactLayout ? <SortContainer {...pageProps} /> : null}
                      <EditButton item={details} />
                    </Stack>
                  }
                />

                <CardContent sx={{ pt: 1 }}>
                  <DetailsAddInfo addinfo={details.addinfo} />

                  <IssueHistoryList
                    query={props.query}
                    compactLayout={compactLayout}
                    issues={issues}
                    loadingMore={Boolean(hasMore && fetching)}
                    previewProps={pageProps}
                    showSort={compactLayout}
                  />
                </CardContent>
              </React.Fragment>
            )}
          </Layout>
        );
      }}
    </PaginatedQuery>
  );
}

export default function SeriesDetails(props: Readonly<Record<string, unknown>>) {
  const appContext = React.useContext(AppContext);
  const routeContext = useAppRouteContext();

  return <SeriesDetailsView {...appContext} {...routeContext} {...props} />;
}

function SeriesDetailsView(props: Readonly<SeriesDetailsProps>) {
  return <SeriesDetailsContent {...props} />;
}
