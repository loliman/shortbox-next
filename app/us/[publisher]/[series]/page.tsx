import SeriesDetails from "@/src/components/details/SeriesDetails";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { SeriesService } from "@/src/services/SeriesService";
import {
  getNavigationIssues,
  getNavigationPublishers,
  getNavigationSeries,
  getNavigationSeriesKey,
} from "@/src/lib/screens/navigation-data";

export default async function UsSeriesPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const routeContext = createAppRouteContext({ params: resolvedParams, searchParams: resolvedSearchParams, us: true });
  const selectedSeries = routeContext.selected.series;
  const initialData =
    selectedSeries?.publisher?.name && selectedSeries?.title
      ? await new SeriesService().getSeriesDetails({
          us: true,
          publisher: selectedSeries.publisher.name,
          series: selectedSeries.title,
          volume: Number(selectedSeries.volume || 0),
        })
      : null;
  const initialPublisherNodes = await getNavigationPublishers({
    us: true,
    filter: typeof routeContext.query?.filter === "string" ? routeContext.query.filter : null,
  });
  const publisherName = selectedSeries?.publisher?.name || "";
  const seriesTitle = selectedSeries?.title || "";
  const seriesVolume = Number(selectedSeries?.volume || 0);
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
    <SeriesDetails
      routeContext={routeContext}
      initialData={initialData}
      initialPublisherNodes={initialPublisherNodes}
      initialSeriesNodesByPublisher={publisherName ? { [publisherName]: initialSeriesNodes } : undefined}
      initialIssueNodesBySeriesKey={publisherName && seriesTitle ? { [seriesKey]: initialIssueNodes } : undefined}
    />
  );
}
