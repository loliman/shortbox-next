import IssueCreate from "@/src/components/restricted/create/IssueCreate";
import { createAppRouteContext, type NextPageSearchParams } from "@/src/app/routeContext";

export default async function IssueCreatePage({
  searchParams,
}: Readonly<{
  searchParams?: NextPageSearchParams;
}>) {
  return <IssueCreate routeContext={createAppRouteContext({ searchParams: await searchParams, create: true })} />;
}
