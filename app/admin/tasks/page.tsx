import AdminTasks from "@/src/components/admin/AdminTasks";
import { createAppRouteContext } from "@/src/app/routeContext";
import { getAdminTasks } from "@/src/lib/screens/admin-data";
import { getInitialNavigationData } from "@/src/lib/screens/navigation-data";

export default async function AdminTasksPage() {
  const routeContext = createAppRouteContext({});
  const navigationData = await getInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;
  const initialItems = await getAdminTasks(10);

  return (
    <AdminTasks
      routeContext={routeContext}
      initialItems={initialItems}
      initialPublisherNodes={navigationData.initialPublisherNodes}
    />
  );
}
