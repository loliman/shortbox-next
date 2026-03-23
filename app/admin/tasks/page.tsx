import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import AdminTasks from "@/src/components/admin/AdminTasks";
import { countChangeRequests } from "@/src/lib/read/issue-read";
import { readAdminTasks } from "@/src/lib/read/admin-read";
import { resolveWorkspacePage } from "@/src/lib/routes/app-page";
import { requirePageAdminSession } from "@/src/lib/server/guards";

export default async function AdminTasksPage() {
  const session = await requirePageAdminSession();
  const page = await resolveWorkspacePage({ us: false, session: "admin" });
  const initialItems = await readAdminTasks(10);
  const changeRequestsCount = await countChangeRequests().catch(() => 0);

  return (
    <WorkspacePageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      query={page.query}
      session={session}
      changeRequestsCount={changeRequestsCount}
    >
      <AdminTasks
        selected={page.selected}
        level={page.level}
        us={page.us}
        session={session}
        query={page.query}
        initialItems={initialItems}
        changeRequestsCount={changeRequestsCount}
      />
    </WorkspacePageShell>
  );
}
