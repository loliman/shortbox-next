import AdminTasks from "@/src/components/admin/AdminTasks";
import { createAppRouteContext } from "@/src/app/routeContext";

export default function AdminTasksPage() {
  return <AdminTasks routeContext={createAppRouteContext({})} />;
}
