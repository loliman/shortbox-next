import Filter from "@/src/components/filter/Filter";
import { createAppRouteContext, type NextPageSearchParams } from "@/src/app/routeContext";
import { getInitialNavigationData } from "@/src/lib/screens/navigation-data";

export default async function UsFilterPage({
  searchParams,
}: Readonly<{
  searchParams?: NextPageSearchParams;
}>) {
  const routeContext = createAppRouteContext({ searchParams: await searchParams, us: true });
  const navigationData = await getInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;

  return <Filter routeContext={routeContext} initialPublisherNodes={navigationData.initialPublisherNodes} />;
}
