import IssueCopy from "@/src/components/restricted/copy/IssueCopy";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { getInitialNavigationData } from "@/src/lib/screens/navigation-data";
import { getInitialIssueFromRouteContext } from "@/src/lib/screens/issue-page-data";

export default async function DeIssueCopyPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  const routeContext = createAppRouteContext({ params: await params, searchParams: await searchParams, us: false });
  const navigationData = await getInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;

  return (
    <IssueCopy
      routeContext={routeContext}
      initialIssue={await getInitialIssueFromRouteContext(routeContext)}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
    />
  );
}
