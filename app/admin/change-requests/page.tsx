import ChangeRequests from "@/src/components/admin/ChangeRequests";
import { createAppRouteContext } from "@/src/app/routeContext";
import { getInitialNavigationData } from "@/src/lib/screens/navigation-data";
import { IssueService } from "@/src/services/IssueService";

export default async function ChangeRequestsPage() {
  const routeContext = createAppRouteContext({});
  const navigationData = await getInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;
  const initialItems = await new IssueService().listChangeRequests({
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
