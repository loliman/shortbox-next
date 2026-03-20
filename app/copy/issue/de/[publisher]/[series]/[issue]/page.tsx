import IssueCopy from "@/src/components/restricted/copy/IssueCopy";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";

export default async function DeIssueCopyPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  return <IssueCopy routeContext={createAppRouteContext({ params: await params, searchParams: await searchParams, us: false })} />;
}
