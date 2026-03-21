import SeriesDetails from "@/src/components/details/SeriesDetails";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { readSeriesDetails } from "@/src/lib/read/series-read";

export default async function DeSeriesPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const routeContext = createAppRouteContext({ params: resolvedParams, searchParams: resolvedSearchParams, us: false });
  const selectedSeries = routeContext.selected.series;
  const initialData =
    selectedSeries?.publisher?.name && selectedSeries?.title
      ? await readSeriesDetails({
          us: false,
          publisher: selectedSeries.publisher.name,
          series: selectedSeries.title,
          volume: Number(selectedSeries.volume || 0),
        })
      : null;
  const navigationData = await readInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;

  return (
    <SeriesDetails
      routeContext={routeContext}
      initialData={initialData}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
    />
  );
}
