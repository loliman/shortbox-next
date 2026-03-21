import IssueDetailsUS from "@/src/components/details/IssueDetailsUS";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";
import { readIssueDetails } from "@/src/lib/read/issue-read";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";

export default async function UsIssuePage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const routeContext = createAppRouteContext({ params: resolvedParams, searchParams: resolvedSearchParams, us: true });
  const selectedIssue = routeContext.selected.issue;
  const initialIssue =
    selectedIssue?.series?.publisher?.name && selectedIssue?.series?.title && selectedIssue?.number
      ? await readIssueDetails({
          us: true,
          publisher: selectedIssue.series.publisher.name,
          series: selectedIssue.series.title,
          volume: Number(selectedIssue.series.volume || 0),
          number: selectedIssue.number,
          format: selectedIssue.format || undefined,
          variant: selectedIssue.variant || undefined,
        })
      : null;
  const navigationData = await readInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;

  return (
    <IssueDetailsUS
      routeContext={routeContext}
      initialIssue={initialIssue}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
    />
  );
}
