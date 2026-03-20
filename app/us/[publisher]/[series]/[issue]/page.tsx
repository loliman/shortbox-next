import IssueDetailsUS from "@/src/components/details/IssueDetailsUS";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function UsIssuePage({
  params,
  searchParams,
}: Readonly<{
  params: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  return (
    <IssueDetailsUS routeContext={createAppRouteContext({ params, searchParams, us: true })} />
  );
}
