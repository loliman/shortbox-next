import PublisherDetails from "@/src/components/details/PublisherDetails";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { readPublisherDetails } from "@/src/lib/read/publisher-read";

export default async function DePublisherPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const routeContext = createAppRouteContext({ params: resolvedParams, searchParams: resolvedSearchParams, us: false });
  const publisherName = routeContext.selected.publisher?.name || "";
  const initialData = publisherName
    ? await readPublisherDetails({ us: false, publisher: publisherName })
    : null;
  const navigationData = await readInitialNavigationData(routeContext);
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
