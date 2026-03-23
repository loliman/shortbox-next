import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import ChangeRequests from "@/src/components/admin/ChangeRequests";
import { countChangeRequests, readChangeRequests } from "@/src/lib/read/issue-read";
import { resolveWorkspacePage } from "@/src/lib/routes/app-page";
import { requirePageAdminSession } from "@/src/lib/server/guards";

export default async function ChangeRequestsPage() {
  const [session, page, initialItems, changeRequestsCount] = await Promise.all([
    requirePageAdminSession(),
    resolveWorkspacePage({ us: false, session: "admin" }),
    readChangeRequests({
      order: "createdAt",
      direction: "asc",
    }),
    countChangeRequests().catch(() => 0),
  ]);

  return (
    <WorkspacePageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      query={page.query}
      session={session}
      changeRequestsCount={changeRequestsCount}
    >
      <ChangeRequests
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
