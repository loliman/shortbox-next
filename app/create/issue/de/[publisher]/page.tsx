import IssueCreate from "@/src/components/restricted/create/IssueCreate";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";

export default async function DeIssueCreatePublisherPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  return <IssueCreate routeContext={createAppRouteContext({ params: await params, searchParams: await searchParams, create: true, us: false })} />;
}
