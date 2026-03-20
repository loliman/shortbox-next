import Filter from "@/src/components/filter/Filter";
import { createAppRouteContext, type NextPageSearchParams } from "@/src/app/routeContext";

export default async function DeFilterPage({
  searchParams,
}: Readonly<{
  searchParams?: NextPageSearchParams;
}>) {
  return <Filter routeContext={createAppRouteContext({ searchParams: await searchParams, us: false })} />;
}
