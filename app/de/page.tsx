import Home from "@/src/components/Home";
import { createAppRouteContext, type NextPageSearchParams } from "@/src/app/routeContext";
import { getHomePageData } from "@/src/lib/screens/home-data";
import { getInitialNavigationData } from "@/src/lib/screens/navigation-data";
import { parseFilter } from "@/src/components/nav-bar/listUtils";
import type { PreviewIssue } from "@/src/components/issue-preview/utils/issuePreviewUtils";

export default async function DeHomePage({
  searchParams,
}: Readonly<{
  searchParams?: NextPageSearchParams;
}>) {
  const resolvedSearchParams = await searchParams;
  const routeContext = createAppRouteContext({ searchParams: resolvedSearchParams, us: false });
  const filterQuery = typeof routeContext.query?.filter === "string" ? routeContext.query.filter : null;
  const initialHomeData = await getHomePageData({
    us: false,
    offset: 0,
    limit: 50,
    order: typeof routeContext.query?.order === "string" ? routeContext.query.order : null,
    direction: typeof routeContext.query?.direction === "string" ? routeContext.query.direction : null,
    filter: parseFilter(filterQuery),
  });
  const navigationData = await getInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;

  return (
    <Home
      routeContext={routeContext}
      initialItems={initialHomeData.items.filter(Boolean) as PreviewIssue[]}
      initialHasMore={initialHomeData.hasMore}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
    />
  );
}
