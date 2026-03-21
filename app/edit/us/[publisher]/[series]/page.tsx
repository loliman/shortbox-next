import SeriesEdit from "@/src/components/restricted/edit/SeriesEdit";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { getInitialNavigationData } from "@/src/lib/screens/navigation-data";
import { getInitialSeriesEditData } from "@/src/lib/screens/edit-page-data";

export default async function UsSeriesEditPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  const routeContext = createAppRouteContext({ params: await params, searchParams: await searchParams, edit: true, us: true });
  const navigationData = await getInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;

  return (
    <SeriesEdit
      routeContext={routeContext}
      initialSeries={await getInitialSeriesEditData(routeContext)}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
    />
  );
}
