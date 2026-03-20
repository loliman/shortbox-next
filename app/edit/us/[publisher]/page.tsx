import PublisherEdit from "@/src/components/restricted/edit/PublisherEdit";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";

export default async function UsPublisherEditPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  return <PublisherEdit routeContext={createAppRouteContext({ params: await params, searchParams: await searchParams, edit: true, us: true })} />;
}
