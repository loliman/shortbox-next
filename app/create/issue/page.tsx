import IssueCreate from "@/src/components/restricted/create/IssueCreate";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function IssueCreatePage({
  searchParams,
}: Readonly<{
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  return <IssueCreate routeContext={createAppRouteContext({ searchParams, create: true })} />;
}
