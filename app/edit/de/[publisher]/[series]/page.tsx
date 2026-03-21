import SeriesEdit from "@/src/components/restricted/edit/SeriesEdit";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { readSeriesEditData } from "@/src/lib/read/series-read";

export default async function DeSeriesEditPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  const routeContext = createAppRouteContext({ params: await params, searchParams: await searchParams, edit: true, us: false });
  const navigationData = await readInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;

  return (
    <SeriesEdit
      routeContext={routeContext}
      initialSeries={await readSeriesEditData(routeContext)}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
    />
  );
}
