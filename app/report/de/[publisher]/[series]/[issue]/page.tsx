import IssueReport from "@/src/components/report/IssueReport";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";

export default async function DeIssueReportPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  return <IssueReport routeContext={createAppRouteContext({ params: await params, searchParams: await searchParams, us: false })} />;
}
