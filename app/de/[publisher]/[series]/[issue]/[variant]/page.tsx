import IssueDetailsDE from "@/src/components/details/IssueDetailsDE";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { IssueService } from "@/src/services/IssueService";
import {
  getNavigationIssues,
  getNavigationPublishers,
  getNavigationSeries,
  getNavigationSeriesKey,
} from "@/src/lib/screens/navigation-data";

export default async function DeIssueVariantPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const routeContext = createAppRouteContext({ params: resolvedParams, searchParams: resolvedSearchParams, us: false });
  const selectedIssue = routeContext.selected.issue;
  const initialIssue =
    selectedIssue?.series?.publisher?.name && selectedIssue?.series?.title && selectedIssue?.number
      ? await new IssueService().getIssueDetails({
          us: false,
          publisher: selectedIssue.series.publisher.name,
          series: selectedIssue.series.title,
          volume: Number(selectedIssue.series.volume || 0),
          number: selectedIssue.number,
          format: selectedIssue.format || undefined,
          variant: selectedIssue.variant || undefined,
        })
      : null;
  const initialPublisherNodes = await getNavigationPublishers({
    us: false,
    filter: typeof routeContext.query?.filter === "string" ? routeContext.query.filter : null,
  });
  const publisherName = selectedIssue?.series?.publisher?.name || "";
  const seriesTitle = selectedIssue?.series?.title || "";
  const seriesVolume = Number(selectedIssue?.series?.volume || 0);
  const initialSeriesNodes = publisherName
    ? await getNavigationSeries({
        us: false,
        publisher: publisherName,
        filter: typeof routeContext.query?.filter === "string" ? routeContext.query.filter : null,
      })
    : [];
  const initialIssueNodes =
    publisherName && seriesTitle
      ? await getNavigationIssues({
          us: false,
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
    <IssueDetailsDE
      routeContext={routeContext}
      initialIssue={initialIssue}
      initialPublisherNodes={initialPublisherNodes}
      initialSeriesNodesByPublisher={publisherName ? { [publisherName]: initialSeriesNodes } : undefined}
      initialIssueNodesBySeriesKey={publisherName && seriesTitle ? { [seriesKey]: initialIssueNodes } : undefined}
    />
  );
}
