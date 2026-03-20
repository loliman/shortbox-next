import Filter from "@/src/components/filter/Filter";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function DeFilterPage({
  searchParams,
}: Readonly<{
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  return <Filter routeContext={createAppRouteContext({ searchParams, us: false })} />;
}
