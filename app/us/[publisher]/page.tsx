import PublisherDetails from "@/src/components/details/PublisherDetails";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function UsPublisherPage({
  params,
  searchParams,
}: Readonly<{
  params: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  return (
    <PublisherDetails routeContext={createAppRouteContext({ params, searchParams, us: true })} />
  );
}
