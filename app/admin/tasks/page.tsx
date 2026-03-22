import AppPageShell from "@/src/components/app-shell/AppPageShell";
import AdminTasks from "@/src/components/admin/AdminTasks";
import { countChangeRequests } from "@/src/lib/read/issue-read";
import { readAdminTasks } from "@/src/lib/read/admin-read";
import { resolveAppPage } from "@/src/lib/routes/app-page";

export default async function AdminTasksPage() {
  const page = await resolveAppPage({ us: false, session: "admin" });
  const initialItems = await readAdminTasks(10);
  const changeRequestsCount = await countChangeRequests().catch(() => 0);

  return (
    <AppPageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      query={page.query}
      session={page.session}
      initialFilterCount={page.navigationData?.initialFilterCount}
      initialPublisherNodes={page.navigationData?.initialPublisherNodes}
      changeRequestsCount={changeRequestsCount}
    >
      <AdminTasks
        selected={page.selected}
        level={page.level}
        us={page.us}
        session={page.session}
        query={page.query}
        initialFilterCount={page.navigationData?.initialFilterCount}
        initialItems={initialItems}
        initialPublisherNodes={page.navigationData?.initialPublisherNodes}
        changeRequestsCount={changeRequestsCount}
      />
    </AppPageShell>
  );
}
