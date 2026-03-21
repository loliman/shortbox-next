import PublisherDetails from "@/src/components/details/PublisherDetails";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { PublisherService } from "@/src/services/PublisherService";
import { getNavigationPublishers, getNavigationSeries } from "@/src/lib/screens/navigation-data";

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
    ? await new PublisherService().getPublisherDetails({ us: false, publisher: publisherName })
    : null;
  const initialPublisherNodes = await getNavigationPublishers({
    us: false,
    filter: typeof routeContext.query?.filter === "string" ? routeContext.query.filter : null,
  });
  const initialSeriesNodes = publisherName
    ? await getNavigationSeries({
        us: false,
        publisher: publisherName,
        filter: typeof routeContext.query?.filter === "string" ? routeContext.query.filter : null,
      })
    : [];

  return (
    <PublisherDetails
      routeContext={routeContext}
      initialData={initialData}
      initialPublisherNodes={initialPublisherNodes}
      initialSeriesNodesByPublisher={publisherName ? { [publisherName]: initialSeriesNodes } : undefined}
    />
  );
}
