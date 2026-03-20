"use client";

import React from "react";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Layout from "../Layout";
import QueryResult from "../generic/QueryResult";
import { generateLabel } from "../../util/hierarchy";
import EditButton from "../restricted/EditButton";
import { AppContext } from "../generic/AppContext";
import { useAppRouteContext } from "../generic";
import TitleLine from "../generic/TitleLine";
import { IssueHistoryList } from "./DetailsListingSections";
import { DetailsPagePlaceholder } from "../placeholders/DetailsPagePlaceholder";
import { DetailsAddInfo } from "./DetailsAddInfo";
import { useDualLoadingRegistration } from "./useDualLoadingRegistration";
import type { SelectedRoot } from "../../types/domain";
import SortContainer from "../SortContainer";

interface PublisherDetailsProps {
  selected: SelectedRoot & {
    publisher: {
      name: string;
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

function PublisherDetailsContent(props: Readonly<PublisherDetailsProps>) {
  const selected = props.selected;
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
    detailsKey: "PublisherDetails_details",
    historyKey: "PublisherDetails_history",
  });
  const [details, setDetails] = React.useState<Record<string, unknown> | null>(null);
  const [issues, setIssues] = React.useState<unknown[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [detailsError, setDetailsError] = React.useState<unknown>(null);
  const endYearLabel =
    details && (details.active || details.endyear === 0) ? "heute" : details?.endyear;

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetailsError(null);

    const params = new URLSearchParams({
      locale: us ? "us" : "de",
      publisher: props.selected.publisher.name,
    });

    void fetch(`/api/public-publisher?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Publisher request failed: ${response.status}`);
        return (await response.json()) as {
          item?: { details?: Record<string, unknown>; issues?: unknown[] } | null;
        };
      })
      .then((payload) => {
        if (cancelled) return;
        setDetails(payload.item?.details || null);
        setIssues(payload.item?.issues || []);
      })
      .catch((nextError) => {
        if (cancelled) return;
        setDetails(null);
        setIssues([]);
        setDetailsError(nextError);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [props.selected.publisher.name, us]);

  React.useEffect(() => {
    if (details || detailsError) {
      markDetailsLoaded();
      markHistoryLoaded();
    }
  }, [details, detailsError, markDetailsLoaded, markHistoryLoaded]);

  return (
    <Layout>
      {detailsError || !details ? (
        <QueryResult
          error={detailsError}
          data={details || null}
          loading={loading}
          selected={selected}
          placeholder={
            <DetailsPagePlaceholder
              query={props.query}
              compactLayout={compactLayout}
              titleWidth="48%"
              subheaderWidth="26%"
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
                title={generateLabel({ publisher: details as any, us })}
                id={(details.id as string | undefined) ?? undefined}
                session={props.session}
              />
            }
            subheader={String(details.startyear || "") + " - " + String(endYearLabel || "")}
            action={
              <Stack direction="row" spacing={1} alignItems="center">
                {!compactLayout ? <SortContainer {...pageProps} /> : null}
                <EditButton item={details} />
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

export default function PublisherDetails(props: Readonly<Record<string, unknown>>) {
  const appContext = React.useContext(AppContext);
  const routeContext = useAppRouteContext();

  return (
    <PublisherDetailsView
      {...(appContext as unknown as PublisherDetailsProps)}
      {...(routeContext as unknown as PublisherDetailsProps)}
      {...(props as unknown as PublisherDetailsProps)}
    />
  );
}

function PublisherDetailsView(props: Readonly<PublisherDetailsProps>) {
  return <PublisherDetailsContent {...props} />;
}
