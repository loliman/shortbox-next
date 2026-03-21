import IssueReport from "@/src/components/report/IssueReport";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { readIssueDetailsFromRouteContext } from "@/src/lib/read/issue-read";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";

export default async function UsIssueReportPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  const routeContext = createAppRouteContext({ params: await params, searchParams: await searchParams, us: true });
  const navigationData = await readInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;

  return (
    <IssueReport
      routeContext={routeContext}
      initialIssue={await readIssueDetailsFromRouteContext(routeContext)}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
    />
  );
}
