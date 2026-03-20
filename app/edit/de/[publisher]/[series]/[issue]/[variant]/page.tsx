import IssueEdit from "@/src/components/restricted/edit/IssueEdit";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";

export default async function DeIssueVariantEditPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  return <IssueEdit routeContext={createAppRouteContext({ params: await params, searchParams: await searchParams, edit: true, us: false })} />;
}
