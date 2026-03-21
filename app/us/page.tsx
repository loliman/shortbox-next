import Home from "@/src/components/Home";
import { createAppRouteContext, type NextPageSearchParams } from "@/src/app/routeContext";
import { getHomePageData } from "@/src/lib/screens/home-data";
import { getNavigationPublishers } from "@/src/lib/screens/navigation-data";
import { parseFilter } from "@/src/components/nav-bar/listUtils";
import type { PreviewIssue } from "@/src/components/issue-preview/utils/issuePreviewUtils";

export default async function UsHomePage({
  searchParams,
}: Readonly<{
  searchParams?: NextPageSearchParams;
}>) {
  const resolvedSearchParams = await searchParams;
  const routeContext = createAppRouteContext({ searchParams: resolvedSearchParams, us: true });
  const filterQuery = typeof routeContext.query?.filter === "string" ? routeContext.query.filter : null;
  const initialHomeData = await getHomePageData({
    us: true,
    offset: 0,
    limit: 50,
    order: typeof routeContext.query?.order === "string" ? routeContext.query.order : null,
    direction: typeof routeContext.query?.direction === "string" ? routeContext.query.direction : null,
    filter: parseFilter(filterQuery),
  });
  const initialPublisherNodes = await getNavigationPublishers({ us: true, filter: filterQuery });

  return (
    <Home
      routeContext={routeContext}
      initialItems={initialHomeData.items.filter(Boolean) as PreviewIssue[]}
      initialHasMore={initialHomeData.hasMore}
      initialPublisherNodes={initialPublisherNodes}
    />
  );
}
