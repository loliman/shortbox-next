import ChangeRequests from "@/src/components/admin/ChangeRequests";
import { createAppRouteContext } from "@/src/app/routeContext";
import { readChangeRequests } from "@/src/lib/read/issue-read";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";

export default async function ChangeRequestsPage() {
  const routeContext = createAppRouteContext({});
  const navigationData = await readInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;
  const initialItems = await readChangeRequests({
    order: "createdAt",
    direction: "asc",
  });

  return (
    <ChangeRequests
      routeContext={routeContext}
      initialItems={initialItems}
      initialPublisherNodes={navigationData.initialPublisherNodes}
    />
  );
}
