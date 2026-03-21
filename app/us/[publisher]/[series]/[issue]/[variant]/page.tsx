import IssueDetailsUS from "@/src/components/details/IssueDetailsUS";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { IssueService } from "@/src/services/IssueService";
import {
  getNavigationIssues,
  getNavigationPublishers,
  getNavigationSeries,
  getNavigationSeriesKey,
} from "@/src/lib/screens/navigation-data";

export default async function UsIssueVariantPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const routeContext = createAppRouteContext({ params: resolvedParams, searchParams: resolvedSearchParams, us: true });
  const selectedIssue = routeContext.selected.issue;
  const initialIssue =
    selectedIssue?.series?.publisher?.name && selectedIssue?.series?.title && selectedIssue?.number
      ? await new IssueService().getIssueDetails({
          us: true,
          publisher: selectedIssue.series.publisher.name,
          series: selectedIssue.series.title,
          volume: Number(selectedIssue.series.volume || 0),
          number: selectedIssue.number,
          format: selectedIssue.format || undefined,
          variant: selectedIssue.variant || undefined,
        })
      : null;
  const initialPublisherNodes = await getNavigationPublishers({
    us: true,
    filter: typeof routeContext.query?.filter === "string" ? routeContext.query.filter : null,
  });
  const publisherName = selectedIssue?.series?.publisher?.name || "";
  const seriesTitle = selectedIssue?.series?.title || "";
  const seriesVolume = Number(selectedIssue?.series?.volume || 0);
  const initialSeriesNodes = publisherName
    ? await getNavigationSeries({
        us: true,
        publisher: publisherName,
        filter: typeof routeContext.query?.filter === "string" ? routeContext.query.filter : null,
      })
    : [];
  const initialIssueNodes =
    publisherName && seriesTitle
      ? await getNavigationIssues({
          us: true,
          publisher: publisherName,
          series: seriesTitle,
          volume: seriesVolume,
          filter: typeof routeContext.query?.filter === "string" ? routeContext.query.filter : null,
        })
      : [];
  const seriesKey = getNavigationSeriesKey({
    publisher: publisherName,
    title: seriesTitle,
    volume: seriesVolume,
  });

  return (
    <IssueDetailsUS
      routeContext={routeContext}
      initialIssue={initialIssue}
      initialPublisherNodes={initialPublisherNodes}
      initialSeriesNodesByPublisher={publisherName ? { [publisherName]: initialSeriesNodes } : undefined}
      initialIssueNodesBySeriesKey={publisherName && seriesTitle ? { [seriesKey]: initialIssueNodes } : undefined}
    />
  );
}
