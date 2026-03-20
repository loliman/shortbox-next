import PublisherEdit from "@/src/components/restricted/edit/PublisherEdit";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function DePublisherEditPage({
  params,
  searchParams,
}: Readonly<{
  params: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
}>) {
  return <PublisherEdit routeContext={createAppRouteContext({ params, searchParams, edit: true, us: false })} />;
}
