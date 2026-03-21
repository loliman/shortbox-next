import IssueReport from "@/src/components/report/IssueReport";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { getInitialNavigationData } from "@/src/lib/screens/navigation-data";
import { getInitialIssueFromRouteContext } from "@/src/lib/screens/issue-page-data";

export default async function UsIssueReportPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  const routeContext = createAppRouteContext({ params: await params, searchParams: await searchParams, us: true });
  const navigationData = await getInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;

  return (
    <IssueReport
      routeContext={routeContext}
      initialIssue={await getInitialIssueFromRouteContext(routeContext)}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
    />
  );
}
