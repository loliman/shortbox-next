import AdminTasks from "@/src/components/admin/AdminTasks";
import { createAppRouteContext } from "@/src/app/routeContext";
import { readAdminTasks } from "@/src/lib/read/admin-read";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";

export default async function AdminTasksPage() {
  const routeContext = createAppRouteContext({});
  const navigationData = await readInitialNavigationData(routeContext);
  routeContext.initialFilterCount = navigationData.initialFilterCount;
  const initialItems = await readAdminTasks(10);

  return (
    <AdminTasks
      routeContext={routeContext}
      initialItems={initialItems}
      initialPublisherNodes={navigationData.initialPublisherNodes}
    />
  );
}
