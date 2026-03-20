import IssueReport from "@/src/components/report/IssueReport";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function DeIssueReportVariantPage({
  params,
  searchParams,
}: Readonly<{
  params: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  return <IssueReport routeContext={createAppRouteContext({ params, searchParams, us: false })} />;
}
