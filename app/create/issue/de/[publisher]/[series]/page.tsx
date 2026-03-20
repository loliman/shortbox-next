import IssueCreate from "@/src/components/restricted/create/IssueCreate";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function DeIssueCreateSeriesPage({
  params,
  searchParams,
}: Readonly<{
  params: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  return <IssueCreate routeContext={createAppRouteContext({ params, searchParams, create: true, us: false })} />;
}
