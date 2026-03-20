import PublisherDetails from "@/src/components/details/PublisherDetails";
import { createAppRouteContext, type NextPageParams, type NextPageSearchParams } from "@/src/app/routeContext";

export default async function UsPublisherPage({
  params,
  searchParams,
}: Readonly<{
  params: NextPageParams;
  searchParams?: NextPageSearchParams;
}>) {
  return (
    <PublisherDetails routeContext={createAppRouteContext({ params: await params, searchParams: await searchParams, us: true })} />
  );
}
