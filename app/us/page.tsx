import Home from "@/src/components/Home";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function UsHomePage({
  searchParams,
}: Readonly<{
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  return <Home routeContext={createAppRouteContext({ searchParams, us: true })} />;
}
