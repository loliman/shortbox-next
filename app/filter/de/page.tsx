import Filter from "@/src/components/filter/Filter";
import { createAppRouteContext, type NextPageSearchParams } from "@/src/app/routeContext";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";

export default async function DeFilterPage({
  searchParams,
}: Readonly<{
  searchParams?: NextPageSearchParams;
}>) {
  const routeContext = createAppRouteContext({ searchParams: await searchParams, us: false });
  const navigationData = await readInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;

  return <Filter routeContext={routeContext} initialPublisherNodes={navigationData.initialPublisherNodes} />;
}
