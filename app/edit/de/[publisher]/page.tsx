import PublisherEdit from "@/src/components/restricted/edit/PublisherEdit";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { getInitialNavigationData } from "@/src/lib/screens/navigation-data";
import { getInitialPublisherEditData } from "@/src/lib/screens/edit-page-data";

export default async function DePublisherEditPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  const routeContext = createAppRouteContext({ params: await params, searchParams: await searchParams, edit: true, us: false });
  const navigationData = await getInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;

  return (
    <PublisherEdit
      routeContext={routeContext}
      initialPublisher={await getInitialPublisherEditData(routeContext)}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
    />
  );
}
