import PublisherCreate from "@/src/components/restricted/create/PublisherCreate";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function PublisherCreatePage() {
  return <PublisherCreate routeContext={createAppRouteContext({ create: true })} />;
}
