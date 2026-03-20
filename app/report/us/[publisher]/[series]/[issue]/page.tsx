import IssueReport from "@/src/components/report/IssueReport";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function UsIssueReportPage({
  params,
  searchParams,
}: Readonly<{
  params: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  return <IssueReport routeContext={createAppRouteContext({ params, searchParams, us: true })} />;
}
