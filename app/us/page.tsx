import Home from "@/src/components/Home";
import { createAppRouteContext, type NextPageSearchParams } from "@/src/app/routeContext";

export default async function UsHomePage({
  searchParams,
}: Readonly<{
  searchParams?: NextPageSearchParams;
}>) {
  return <Home routeContext={createAppRouteContext({ searchParams: await searchParams, us: true })} />;
}
