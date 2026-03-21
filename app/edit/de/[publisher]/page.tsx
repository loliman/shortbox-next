import PublisherEdit from "@/src/components/restricted/edit/PublisherEdit";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { readPublisherEditData } from "@/src/lib/read/publisher-read";

export default async function DePublisherEditPage({
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
    <PublisherEdit
      routeContext={routeContext}
      initialPublisher={await readPublisherEditData(routeContext)}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
    />
  );
}
