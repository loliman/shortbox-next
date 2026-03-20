import IssueDetailsDE from "@/src/components/details/IssueDetailsDE";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";

export default async function DeIssueVariantPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  return (
    <IssueDetailsDE routeContext={createAppRouteContext({ params: await params, searchParams: await searchParams, us: false })} />
  );
}
