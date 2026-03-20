import IssueDetailsUS from "@/src/components/details/IssueDetailsUS";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";

export default async function UsIssuePage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  return (
    <IssueDetailsUS routeContext={createAppRouteContext({ params: await params, searchParams: await searchParams, us: true })} />
  );
}
