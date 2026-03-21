import PublisherDetails from "@/src/components/details/PublisherDetails";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { PublisherService } from "@/src/services/PublisherService";
import { getInitialNavigationData } from "@/src/lib/screens/navigation-data";

export default async function UsPublisherPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const routeContext = createAppRouteContext({ params: resolvedParams, searchParams: resolvedSearchParams, us: true });
  const publisherName = routeContext.selected.publisher?.name || "";
  const initialData = publisherName
    ? await new PublisherService().getPublisherDetails({ us: true, publisher: publisherName })
    : null;
  const navigationData = await getInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;

  return (
    <PublisherDetails
      routeContext={routeContext}
      initialData={initialData}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
    />
  );
}
